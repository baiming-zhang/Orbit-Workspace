const {enableMicrophone}=require('./media-permissions.cjs');
const {normalizeWebUrl,isWebsiteAddress}=require('../dist/url-utils.js');
const {WebContentsView,ipcMain,dialog,Menu,clipboard}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {nativeImage}=require('electron');
const {selectedContent,imageBytes}=require('./favorites.cjs');
const {prepareChatSelection}=require('./selection-chat.cjs');
const {prepareImageSearch}=require('./image-search.cjs');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {createPdfStyle}=require('./pdf-style.cjs');
const {createPdfChatUpload}=require('./pdf-chat-upload.cjs');
const OrbitI18n=require('../dist/i18n.js');
function downloadLink(url){try{return /\.(?:exe|msi|msix|msixbundle|appx|dmg|pkg|deb|rpm|zip|7z|rar|tar|gz|bz2|xz|iso|epub|docx?|xlsx?|pptx?|csv)(?:$)/i.test(decodeURIComponent(new URL(url).pathname));}catch{return false;}}
const localExtensions=new Set(['.pdf','.html','.htm','.xhtml','.mhtml','.mht','.shtml']);
function webUrl(value){try{if(typeof value!=='string'||value.length>16384)return null;const u=new URL(value);return ['http:','https:'].includes(u.protocol)&&u.hostname&&!u.username&&!u.password?u.href:null;}catch{return null;}}
function launchTargets(argv,cwd=process.env.ORBIT_LAUNCH_CWD||process.cwd()){return argv.filter(v=>typeof v==='string'&&!v.startsWith('--')&&(/^https?:\/\//i.test(v)||localExtensions.has(path.extname(v).toLowerCase()))).map(v=>/^https?:\/\//i.test(v)?v:path.resolve(cwd,v));}
function targetUrl(value){
 if(typeof value!=='string'||value.length>16384)throw Error('Invalid address.');
 value=value.trim();
 if(/^https?:\/\//i.test(value)){const u=webUrl(value);if(!u)throw Error('Use an address without a password.');return u;}
 if(/^[a-z][a-z\d+.-]*:/i.test(value)&&!value.startsWith('file:')&&!path.isAbsolute(value)&&!/^(localhost|[\w-]+(?:\.[\w-]+)+):\d+(?:[/?#]|$)/i.test(value))throw Error('Unsupported address scheme.');
 const local=value.startsWith('file:')?fileURLToPath(value):value;
 if(path.isAbsolute(local)&&localExtensions.has(path.extname(local).toLowerCase())){try{if(fs.statSync(local).isFile())return pathToFileURL(local).href;}catch{}throw Error('File not found. Check its address.');}
 if(!value.trim())return 'https://www.google.com/';
 if(!/\s/.test(value)&&isWebsiteAddress(value))return normalizeWebUrl(value);
 return 'https://www.google.com/search?q='+encodeURIComponent(value);
}
function tabTitle(url,local){if(url.startsWith('file:'))return path.basename(fileURLToPath(url));if(/\.pdf(?:[?#]|$)/i.test(url)){const value=new URL(url).pathname.split('/').pop();try{return decodeURIComponent(value);}catch{return value;}}return local('New tab','新标签页');}
function createTabbedBrowser({getWindow,sessions,workspaceItems=[],onPage=()=>{},getLanguage=()=> 'en',onState=()=>{},onPin=()=>{},favorites=null,onNotice=()=>{}}){
 const pdfStyle=createPdfStyle({getWindow,getLanguage,linkItems:(wc,params)=>linkItems(wc,params),selectionItems:(wc,params)=>selectionItems(wc,params)});
 const pdfChatUpload=createPdfChatUpload({publish:()=>publish()});
 const specs=new Map(),views=new Map(),tabs=[],attached=new Set(),lastActive=new Map(),downloadSessions=new Map();
 const pageEdit=fs.existsSync(path.join(__dirname,'page-edit.cjs'))?require('./page-edit.cjs'):null;
 let disposed=false,activeId=null,toolbar=null,toolbarReady=false,splitter=null,splitterReady=false;
 let drag=null,addressEditing=false,bounds=null,shown=false,counter=0,workspace='browser';
 const toolbarUrl='orbit://app/browser.html',splitterUrl='orbit://app/splitter.html',blankUrl='https://www.google.com/';
 const local=(en,zh)=>getLanguage()==='en'?en:zh;
 const current=()=>tabs.find(t=>t.id===activeId&&t.workspace===workspace);
 const spec=id=>specs.get(id);
 const title=id=>OrbitI18n.text(spec(id)?.name||id,getLanguage());
 function configure(items){
  specs.set('browser',{id:'browser',name:'浏览器',url:blankUrl,internal:false});
  specs.set('pdf',{id:'pdf',name:'PDF 阅读',internal:true,pdfWorkspace:true,url:'orbit://app/index.html#pdf'});
  for(const item of items){if(['browser','pdf'].includes(item.id)){specs.get(item.id).name=item.name;continue;}const url=item.internal?'orbit://app/index.html#'+item.id:webUrl(item.url);if(!url)continue;const previous=specs.get(item.id);specs.set(item.id,{id:item.id,name:item.name,url,internal:!!item.internal});if(previous&&previous.url!==url&&!item.internal){const home=tabs.find(t=>t.id===item.id);if(home?.view){home.url=url;home.view.webContents.loadURL(url).catch(()=>{});}}}
  publish();return {ok:true};
 }
 configure(workspaceItems);
 function detach(){const win=getWindow();if(win&&!win.isDestroyed())for(const v of attached)win.contentView.removeChildView(v);attached.clear();}
 function mount(v){const win=getWindow();if(!v||!win||win.isDestroyed())return;if(!attached.has(v)){win.contentView.addChildView(v);attached.add(v);}}
 function snapshot(){
  const t=current(),wc=t?.view?.webContents,live=wc&&!wc.isDestroyed();
  return {workspace,visible:shown,language:getLanguage(),internalActive:!!t?.internal,internalChatWidth:t?.internal&&t.chatVisible&&bounds?bounds.width-Math.round((bounds.width-8)*t.ratio):0,address:t?.url?.startsWith('file:')?fileURLToPath(t.url):t?.url||spec(workspace)?.url||'',addressEditing,
   tabs:tabs.filter(t=>t.workspace===workspace&&!t.provisional).map(t=>({id:t.id,title:t.internal?title(t.workspace):t.title,url:t.url,pdf:t.pdf,internal:!!t.internal,chat:!!t.chatVisible,upload:t.upload||null,loading:!!t.loading,pdfOpening:!!t.pdf&&!!t.loading&&!t.pdfUiReady&&!t.error})),activeId,ratio:t?.ratio||.62,
   canBack:!!(live&&wc.navigationHistory.canGoBack()),canForward:!!(live&&wc.navigationHistory.canGoForward()),error:t?.error||''};
 }
 function publish(){if(disposed)return;const state=snapshot(),wc=toolbar?.webContents;if(toolbarReady&&wc&&!wc.isDestroyed())wc.send('orbit:tabs-state',state);onState(state);}
 function layout(){
  if(disposed||!shown||!bounds||!toolbar)return;
  const r=bounds,t=current(),split=!!(t?.chatVisible&&t.chat),barHeight=48,opening=!!t?.pdf&&!!t.loading&&!t.pdfUiReady&&!t.error;if(split)initSplitter();
  if(!split||drag&&drag.id!==t?.id)drag=null;
  const wanted=new Set([toolbar,...(t?.view&&!addressEditing?[t.view]:[]),...(split&&!addressEditing?[t.chat,splitter]:[])]),win=getWindow();
  if(split&&!addressEditing&&attached.has(splitter)&&(!attached.has(t.view)||!attached.has(t.chat))){win?.contentView.removeChildView(splitter);attached.delete(splitter);}
  for(const v of attached)if(!wanted.has(v)){win?.contentView.removeChildView(v);attached.delete(v);}
  mount(toolbar);toolbar.setBounds({x:r.x,y:r.y,width:r.width,height:addressEditing||opening||(!t?.view&&spec(workspace)?.pdfWorkspace)?r.height:barHeight});
  if((!t?.view&&!split)||addressEditing)return;
  if(t.view)mount(t.view);const h=Math.max(1,r.height-barHeight),w=split?Math.round((r.width-8)*t.ratio):r.width;
  t.view?.setBounds({x:r.x,y:r.y+barHeight,width:Math.max(1,w),height:h});
  if(opening&&attached.has(toolbar)){win?.contentView.removeChildView(toolbar);attached.delete(toolbar);mount(toolbar);}
  if(split){mount(t.chat);t.chat.setBounds({x:r.x+w+8,y:r.y+barHeight,width:Math.max(1,r.width-w-8),height:h});mount(splitter);splitter.setBounds({x:r.x+(drag?0:w),y:r.y+barHeight,width:drag?r.width:8,height:h});if(splitterReady)splitter.webContents.send('orbit:split-state',{dragging:!!drag,x:drag?w:0,ratio:t.ratio});}
 }
 function focusCurrent(preferChat=false){const win=getWindow(),t=current();if(!shown||addressEditing||!win||win.isDestroyed()||!win.isFocused())return;const target=t?.chatVisible&&(preferChat||t.focusedPane==='chat')?t.chat?.webContents:t?.view?.webContents;if(target&&!target.isDestroyed()&&attached.has(target===t.chat?.webContents?t.chat:t.view))target.focus();else if(t?.internal)win.webContents.focus();}
 function activate(id,notify=true){const t=tabs.find(t=>t.id===id);if(!t||t.provisional)return;drag=null;addressEditing=false;workspace=t.workspace;activeId=id;lastActive.set(workspace,id);shown=true;if(notify)onPage({id:workspace,title:title(workspace),navigation:{canGoBack:false,canGoForward:false}});layout();focusCurrent();publish();}
 function initToolbar(){
  if(toolbar)return;
  toolbar=new WebContentsView({webPreferences:{preload:path.join(__dirname,'tabs-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  toolbar.webContents.setWindowOpenHandler(()=>({action:'deny'}));toolbar.webContents.on('will-navigate',e=>e.preventDefault());toolbar.webContents.once('did-finish-load',()=>{toolbarReady=true;publish();});toolbar.webContents.loadURL(toolbarUrl).catch(()=>{});
 }
 function initSplitter(){
  if(splitter)return;
  splitter=new WebContentsView({webPreferences:{preload:path.join(__dirname,'splitter-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  splitter.setBackgroundColor('#00000000');splitter.webContents.setWindowOpenHandler(()=>({action:'deny'}));splitter.webContents.on('will-navigate',e=>e.preventDefault());splitter.webContents.once('did-finish-load',()=>{splitterReady=true;layout();});splitter.webContents.loadURL(splitterUrl).catch(()=>{});
 }
 function partitionFor(mode,url){
  let host='';try{host=new URL(url).hostname;}catch{}
  if(mode==='chatgpt'||host==='chatgpt.com')return 'persist:chatgpt';
  if(['gmail','calendar','analytics','search'].includes(mode)||host==='google.com'||host.endsWith('.google.com'))return 'persist:google-services';
  return 'persist:personal-websites';
 }
 function addInternal(mode){const t={id:'home-'+mode,url:spec(mode).url,workspace:mode,title:title(mode),internal:true,pdf:false,view:null,chat:null,chatVisible:false,ratio:.62,error:''};tabs.push(t);return t;}
 function ensureHome(mode){const config=spec(mode);if(!config)throw Error('Unknown workspace.');if(config.internal){if(mode==='pdf'){const document=tabs.find(t=>t.workspace===mode&&!t.internal&&!t.provisional);if(document)return document;}if(!tabs.some(t=>t.workspace===mode&&t.internal))return addInternal(mode);}else if(!tabs.some(t=>t.workspace===mode&&!t.provisional))return add(config.url,{workspace:mode,primary:true,loadUrl:sessions?.startUrl(mode,config.url)||config.url,activate:false});return tabs.find(t=>t.workspace===mode&&!t.provisional);}
 function linkItems(wc,params){
  const url=webUrl(params.linkURL);if(!url)return [];
  const owner=tabs.find(t=>t.view?.webContents===wc||t.chat?.webContents===wc),mode=owner?.workspace||workspace;
  return [
   {id:'link-new',label:local('Open link in new tab','在新标签页打开链接'),click:()=>openLink(wc,url,{workspace:mode})},
   {id:'link-current',label:local('Open link in current tab','在当前标签页打开链接'),click:()=>{if(owner){activate(owner.id);if(owner.view?.webContents===wc)loadTab(owner,url);else wc.loadURL(url).catch(error=>{owner.error=error.message;publish();});}else {if(workspace!==mode)show(bounds,mode);performAction('navigate',url);}}},
   {id:'link-copy',label:local('Copy link address','复制链接地址'),click:()=>clipboard.writeText(url)},
   {type:'separator'},
   {id:'link-pin',label:local('Pin link to sidebar','将链接固定到左侧栏'),click:()=>Promise.resolve().then(()=>onPin({url,name:Array.from(String(params.linkText||params.titleText||new URL(url).hostname).trim()||new URL(url).hostname).slice(0,40).join('')})).catch(error=>{if(current())current().error=error.message;publish();})}
  ];
 }
 function ownerFor(wc){return tabs.find(t=>t.view?.webContents===wc||t.chat?.webContents===wc)||(wc===getWindow()?.webContents&&current()?.internal?current():null);}
 async function selectionAction(wc,params,action){
  const content=selectedContent(wc,params);if(!content)return {ok:false};const owner=ownerFor(wc),mode=owner?.workspace||workspace;
  if(action==='copy'){if(content.kind==='image')await clipboard.writeImage(nativeImage.createFromBuffer(await imageBytes(wc,params)));else await clipboard.writeText(content.text);return {ok:true};}
  if(action==='google'){if(content.kind==='text')return open('https://www.google.com/search?q='+encodeURIComponent(content.text),{workspace:mode});const bytes=await imageBytes(wc,params),target=add('https://www.google.com/imghp?hl='+(getLanguage()==='zh'?'zh-CN':'en'),{workspace:mode,parentId:owner?.id});return prepareImageSearch(target.view.webContents,bytes,{getLanguage,onStatus:onNotice});}
  if(action==='favorite'){if(!favorites)return {ok:false};const result=await favorites.add(wc,params);onNotice(local('Added to favorites','已加入收藏'));return result;}
  if(!owner)throw Error(local('Open a workspace first.','请先打开一个工作台。'));
  const selected=content.kind==='image'?{...content,bytes:await imageBytes(wc,params)}:content;
  let chat,dependency=null;
  if(action==='chat-sidebar'){activate(owner.id);if(!owner.chatVisible)toggleChat();chat=owner.chat.webContents;dependency=owner.uploadTask;}
  else if(action==='chat-tab'){const target=add('https://chatgpt.com/',{workspace:mode,parentId:owner.id});chat=target.view.webContents;if(owner.pdf)dependency=pdfChatUpload.attach({...owner,chat:{webContents:chat},chatVisible:true,uploadTask:null,uploaded:null});}
  else return {ok:false};
  if(chat.getURL()&&!isChatAddress(chat.getURL()))await chat.loadURL('https://chatgpt.com/');
  return prepareChatSelection(chat,selected,{getLanguage,onStatus:onNotice,beforeImage:dependency});
 }
 function isChatAddress(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chatgpt.com';}catch{return false;}}
 function selectionItems(wc,params){
  if(params.formControlType==='input-password'||!selectedContent(wc,params))return [];
  const run=action=>()=>selectionAction(wc,params,action).catch(error=>{onNotice(OrbitI18n.text(error.message,getLanguage()));return {ok:false,error:error.message};});
  return [{id:'selection-copy',label:local('Copy','复制'),click:run('copy')},{id:'selection-google',label:local('Search with Google','在 Google 中查询'),click:run('google')},{id:'selection-chat-sidebar',label:local('Ask ChatGPT in sidebar','在侧栏询问 ChatGPT'),click:run('chat-sidebar')},{id:'selection-chat-tab',label:local('Ask ChatGPT in new tab','在新标签页询问 ChatGPT'),click:run('chat-tab')},{id:'selection-favorite',label:local('Add to favorites','加入收藏'),enabled:!!favorites,click:run('favorite')},...(params.isEditable?[{type:'separator'},{label:local('Cut','剪切'),role:'cut'},{label:local('Paste','粘贴'),role:'paste'},{label:local('Select all','全选'),role:'selectAll'}]:[])];
 }
 function showLinkMenu(wc,params,event){const selection=selectionItems(wc,params),links=linkItems(wc,params);const entries=[...selection,...(selection.length&&links.length?[{type:'separator'}]:[]),...links];if(!entries.length)return false;event?.preventDefault();Menu.buildFromTemplate(entries).popup({window:getWindow()});return true;}
 function promote(t){
  if(!t.provisional||t.downloading||disposed)return;
  const foreground=t.foreground&&workspace===t.workspace&&activeId===t.parentId;t.provisional=false;
  if(t.workspace==='pdf'&&t.pdf){const home=tabs.find(p=>p.workspace==='pdf'&&p.internal);if(home)removeTab(home,true);}
  if(foreground)activate(t.id);else publish();
 }
 function failedNavigation(t){if(!t.provisional){publish();return;}clearTimeout(t.failureTimer);t.failureTimer=setTimeout(()=>{if(!disposed&&tabs.includes(t)&&!t.downloading){promote(t);publish();}},200);}
 function openLink(wc,url,options={}){
  const owner=tabs.find(t=>t.view?.webContents===wc||t.chat?.webContents===wc);
  if(!owner||!webUrl(url))return {ok:false};
  if(options.download===true||downloadLink(url)){
   Promise.resolve(owner.ready).then(()=>{if(!disposed&&!wc.isDestroyed())wc.downloadURL(url);}).catch(error=>{owner.error=error.message;publish();});
   return {ok:true,download:true};
  }
  return open(url,{workspace:owner.workspace,session:wc.session,ready:owner.ready,parentId:owner.id,provisional:true,foreground:true,activate:false});
 }
 function setup(wc,t){
  wc.on('context-menu',(event,params)=>{if(!wc.mainFrame.framesInSubtree.some(frame=>frame.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/')))showLinkMenu(wc,params,event);});
  wc.setUserAgent(wc.getUserAgent().replace(/\sElectron\/[^\s]+/g,'').replace(/\sOrbit(?:%20| )?Workspace\/[^\s]+/gi,''));
  enableMicrophone(wc.session);
  if(!downloadSessions.has(wc.session)){
   const handler=(_event,item,source)=>{
    const pending=tabs.find(tab=>tab.provisional&&tab.view?.webContents===source);if(!pending)return;
    pending.downloading=true;
    // Keep the hidden source alive until transfer finishes; no download tab is shown.
    item.once('done',()=>{if(!disposed)removeTab(pending);});
   };wc.session.on('will-download',handler);downloadSessions.set(wc.session,handler);
  }
  wc.on('focus',()=>{if(current()===t)t.focusedPane=wc===t.chat?.webContents?'chat':'page';});
  wc.on('before-mouse-event',(_event,mouse)=>{if(mouse.type==='mouseDown'&&shown&&!addressEditing&&current()===t&&attached.has(wc===t.chat?.webContents?t.chat:t.view)&&!wc.isFocused())wc.focus();});
  wc.setWindowOpenHandler(details=>{
   if(downloadLink(details.url)){openLink(wc,details.url,{download:true});return {action:'deny'};}
   if(!webUrl(details.url)&&details.url!=='about:blank')return {action:'deny'};
   return {action:'allow',createWindow:options=>{
    const child=add(details.url,{workspace:t.workspace,session:wc.session,webContents:options.webContents,ready:t.ready,load:false,parentId:t.id,provisional:true,foreground:details.disposition!=='background-tab',activate:false});
    if(details.disposition==='background-tab')child.view.webContents.loadURL(details.url).catch(()=>{});
    return child.view.webContents;
   }};
  });
  wc.on('will-navigate',(e,url)=>{if(!webUrl(url)&&!url.startsWith('file:')&&!url.startsWith('chrome-extension:')&&url!=='about:blank')e.preventDefault();});
  wc.on('did-fail-load',(_e,code,message,_url,main)=>{if(main&&code!==-3){t.error=local('Load failed: ','加载失败：')+message;failedNavigation(t);}});
  wc.on('dom-ready',()=>{if(wc.getURL().startsWith('https://chatgpt.com/')){wc.insertCSS('html,body,body *,body *::before,body *::after{-webkit-app-region:no-drag!important;app-region:no-drag!important}').catch(()=>{});wc.executeJavaScript(fs.readFileSync(path.join(__dirname,'chatgpt-sidebar.js'),'utf8')).catch(()=>{});}});
 }
 function add(url,options={}){
  initToolbar();const mode=options.workspace||workspace,partition=partitionFor(mode,url),id=options.primary&&!tabs.some(t=>t.id===mode)?mode:'tab-'+(++counter);
  const view=new WebContentsView({...(options.webContents?{webContents:options.webContents}:{}),webPreferences:{...(options.session?{session:options.session}:{partition}),plugins:true,preload:path.join(__dirname,'website-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}}),wc=view.webContents;
  const t={id,homeUrl:url,url:options.loadUrl||url,workspace:mode,title:tabTitle(url,local),view,pdf:/\.pdf(?:[?#]|$)/i.test(url),chat:null,chatVisible:false,ratio:.62,error:'',loading:options.load!==false,partition,parentId:options.parentId||null,provisional:!!options.provisional,foreground:!!options.foreground};
  view.orbitWorkspace=mode;view.orbitUrl=t.url;tabs.push(t);views.set(id,view);setup(wc,t);
  t.ready=options.ready||(sessions?.prepare(partition,wc.session)||Promise.resolve());
  function commit(url){t.url=url;view.orbitUrl=url;t.pdf=/\.pdf(?:[?#]|$)/i.test(url);t.error='';if(url!=='about:blank')promote(t);if(!t.provisional&&spec(mode)?.url)sessions?.remember(mode,spec(mode).url,url);publish();}
  wc.on('did-navigate',(_e,url)=>commit(url));wc.on('did-navigate-in-page',(_e,url,main)=>{if(main)commit(url);});wc.on('page-title-updated',(_e,value)=>{t.title=value||t.title;publish();});
  wc.once('destroyed',()=>{if(!disposed&&tabs.includes(t))removeTab(t,true);});
  pdfStyle.attach(wc,view);
  wc.on('did-finish-load',()=>{wc.executeJavaScript("!!document.querySelector('embed[type=\"application/pdf\"]')").then(pdf=>{if(pdf)t.pdf=true;publish();if(t.pdf&&t.chatVisible)pdfChatUpload.attach(t);}).catch(()=>{});});
  wc.on('before-input-event',(e,input)=>{if(!input.control)return;const key=input.key.toLowerCase();if(['t','w','l'].includes(key)){e.preventDefault();if(key==='t'){activate(t.id);performAction('new');}if(key==='w')close(t.id);if(key==='l')focusAddress();}});
  wc.on('did-frame-finish-load',()=>{if(!t.pdf||t.pdfUiReady||wc.isDestroyed())return;const frame=wc.mainFrame.framesInSubtree.find(frame=>frame.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'));if(frame)frame.executeJavaScript("!!document.querySelector('pdf-viewer')").then(ready=>{if(ready&&!wc.isDestroyed()){t.pdfUiReady=true;layout();publish();}}).catch(()=>{});});
  wc.on('did-start-loading',()=>{t.loading=true;t.pdfUiReady=false;layout();publish();});wc.on('did-stop-loading',()=>{t.loading=false;layout();publish();});
  if(options.load!==false)loadTab(t,t.url);
  if(mode==='pdf'&&t.pdf&&!t.provisional){const placeholder=tabs.find(tab=>tab.workspace===mode&&tab.internal);if(placeholder)removeTab(placeholder,true);}
  if(options.activate!==false)activate(id);return t;
 }
 function loadTab(t,url){const wc=t.view.webContents,sequence=t.loadSequence=(t.loadSequence||0)+1;t.loading=true;t.pdfUiReady=false;t.error='';layout();publish();const ready=url.startsWith('file:')?Promise.resolve():t.ready;return ready.then(()=>{if(sequence===t.loadSequence&&!disposed&&!wc.isDestroyed())return wc.loadURL(url);}).catch(error=>{if(sequence===t.loadSequence&&!disposed&&!wc.isDestroyed()&&error.code!=='ERR_ABORTED'){t.loading=false;t.error=error.message;failedNavigation(t);}});}
 function internalTarget(value){if(typeof value!=='string'||!value.startsWith('orbit:'))return null;let u;try{u=new URL(value);}catch{throw Error('Invalid Orbit address.');}const mode=u.hash.slice(1);if(u.protocol!=='orbit:'||u.hostname!=='app'||u.username||u.password||u.port||u.pathname!=='/index.html'||u.search||!spec(mode)?.internal)throw Error('Unknown Orbit page.');return mode;}
 function open(value,options={}){
  const internal=internalTarget(value);if(internal){const t=ensureHome(internal);activate(t.id);return {ok:true,id:internal,tabId:t.id,title:title(internal)};}
  const url=targetUrl(value),mode=options.workspace||(tabs.length?workspace:(/\.pdf(?:[?#]|$)/i.test(url)?'pdf':'browser'));
  if(!spec(mode))throw Error('Unknown workspace.');if(!(mode==='pdf'&&/\.pdf(?:[?#]|$)/i.test(url)))ensureHomeIfInternal(mode);if(options.reveal!==false)getWindow()?.show();
  const t=add(url,{...options,workspace:mode});return {ok:true,id:mode,tabId:t.id,title:title(mode)};
 }
 function ensureHomeIfInternal(mode){if(spec(mode)?.internal)ensureHome(mode);}
 function removeTab(t,destroyed=false){
  const index=tabs.indexOf(t);if(index<0)return;clearTimeout(t.failureTimer);tabs.splice(index,1);views.delete(t.id);views.delete(t.id+'-chat');
  for(const v of [t.view,t.chat]){if(attached.has(v)){getWindow()?.contentView.removeChildView(v);attached.delete(v);}if(!destroyed||v===t.chat){if(v?.webContents&&!v.webContents.isDestroyed())v.webContents.close();}}
  if(lastActive.get(t.workspace)===t.id)lastActive.delete(t.workspace);
  if(activeId===t.id){const parent=tabs.find(p=>p.id===t.parentId),next=parent||tabs.filter(p=>p.workspace===t.workspace&&!p.provisional).at(-1)||(t.workspace==='browser'?add(blankUrl,{workspace:'browser',primary:true,activate:false,loadUrl:blankUrl}):ensureHome(t.workspace));activeId=next?.id||null;if(next)lastActive.set(t.workspace,next.id);}
  layout();focusCurrent();publish();
 }
 function close(id){const t=tabs.find(t=>t.id===id);if(t&&!t.internal)removeTab(t);}
 function toggleChat(){
  const t=current();if(!t)return;t.chatVisible=!t.chatVisible;
  if(t.chatVisible&&!t.chat){t.chat=new WebContentsView({webPreferences:{partition:'persist:chatgpt',preload:path.join(__dirname,'website-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});views.set(t.id+'-chat',t.chat);const wc=t.chat.webContents;setup(wc,t);(sessions?.prepare('persist:chatgpt',wc.session)||Promise.resolve()).then(()=>wc.loadURL(t.pdf?'https://chatgpt.com/':sessions?.startUrl('chatgpt','https://chatgpt.com/')||'https://chatgpt.com/')).catch(()=>{});wc.on('did-navigate',(_e,url)=>sessions?.remember('chatgpt','https://chatgpt.com/',url));wc.on('did-finish-load',()=>{if(t.pdf&&t.chatVisible)pdfChatUpload.attach(t);});}
  if(!t.chatVisible)t.focusedPane='page';layout();focusCurrent(t.chatVisible);publish();if(t.chatVisible&&t.pdf)pdfChatUpload.attach(t);
 }
 function focusAddress(){const win=getWindow();if(win&&!win.isDestroyed()){win.webContents.focus();win.webContents.send('orbit:workspace-focus');}}
 function openAddress(t){if(!t?.pdf)return;activate(t.id);addressEditing=true;drag=null;layout();publish();toolbar.webContents.send('orbit:pdf-address',{id:t.id,title:t.title,address:t.url.startsWith('file:')?fileURLToPath(t.url):t.url});}
 function tabMenu(id){const t=tabs.find(t=>t.id===id);if(!t)return;Menu.buildFromTemplate([
  {label:local('Open another tab','多开一个标签页'),click:()=>open(t.internal?blankUrl:t.url,{workspace:t.workspace})},
  ...(t.pdf?[{label:local('View / edit file address…','查看 / 修改文件地址…'),click:()=>openAddress(t)}]:[]),
  {label:local('Copy address','复制地址'),click:()=>clipboard.writeText(t.url.startsWith('file:')?fileURLToPath(t.url):t.url)},
  {type:'separator'},{label:local('Reload','刷新'),enabled:!!t.view,click:()=>t.view?.webContents.reload()},
  {label:local('Close tab','关闭标签页'),enabled:!t.internal,click:()=>close(id)}
 ]).popup({window:getWindow()});}
 async function pick(mode=workspace){const pdf=spec(mode)?.pdfWorkspace,result=await dialog.showOpenDialog(getWindow(),{title:local('Open a PDF or webpage file','打开 PDF 或网页文件'),properties:['openFile','multiSelections'],filters:[{name:local('PDF and webpages','PDF 与网页'),extensions:pdf?['pdf']:[...localExtensions].map(x=>x.slice(1))}]});for(const file of result.filePaths||[])open(file,{workspace:mode});return {ok:true};}
 async function performAction(action,value){try{
  const t=current(),wc=t?.view?.webContents;
  if(action==='focus-address')focusAddress();
  else if(action==='new'){if(spec(workspace)?.pdfWorkspace)await pick(workspace);else open(value||(spec(workspace)?.internal?blankUrl:spec(workspace)?.url)||blankUrl,{workspace});}
  else if(action==='select')activate(value);
  else if(action==='close')close(value);
  else if(action==='tab-menu'||action==='pdf-file-menu')tabMenu(value);
  else if(action==='pdf-address-open')openAddress(tabs.find(tab=>tab.id===value));
  else if(action==='pdf-address-close'){addressEditing=false;layout();}
  else if(action==='pdf-address-save'){const selected=tabs.find(tab=>tab.id===value?.id&&tab.pdf);if(!selected)throw Error('This file is closed.');const url=targetUrl(value.address);selected.url=url;selected.error='';loadTab(selected,url);addressEditing=false;layout();}
  else if(action==='open-file')await pick(workspace);
  else if(action==='navigate'){const internal=internalTarget(value);if(internal)open(value);else {const url=targetUrl(value);if(wc){t.url=url;t.error='';loadTab(t,url);}else open(url,{workspace});}}
  else if(action==='chat')toggleChat();
  else if(action==='pdf-chat-retry'&&t?.pdf){t.chatVisible=true;layout();pdfChatUpload.attach(t,{force:true});}
  else if(action==='ratio'&&t&&Number.isFinite(value)){t.ratio=Math.max(.3,Math.min(.75,value));layout();}
  else if(action==='chat-reload'&&t?.chat)t.chat.webContents.reload();
  else if(action==='back'&&wc?.navigationHistory.canGoBack())wc.navigationHistory.goBack();
  else if(action==='forward'&&wc?.navigationHistory.canGoForward())wc.navigationHistory.goForward();
  else if(action==='reload'){if(wc)wc.reload();else getWindow()?.webContents.reload();}
  else if(action==='home'){if(spec(workspace).internal){const home=ensureHome(workspace);activate(home.id);}else if(t&&wc)loadTab(t,spec(workspace).url);}
  publish();return {ok:true,workspaceState:snapshot()};
 }catch(error){if(current())current().error=error.message;publish();return {ok:false,error:error.message};}}
 function navigate(mode,action,value){if(disposed||!shown||mode!==workspace||!spec(mode))return {ok:false,error:'Workspace is not active.'};if(!['back','forward','reload','home','navigate','open-file','new','select','close'].includes(action))return {ok:false,error:'Unsupported navigation action.'};return performAction(action,value);}
 function trustedToolbar(e){return toolbar&&e.sender===toolbar.webContents&&e.senderFrame===e.sender.mainFrame&&e.senderFrame.url===toolbarUrl;}
 ipcMain.handle('orbit:tabs-action',(e,a,v)=>trustedToolbar(e)?performAction(a,v):{ok:false});
 ipcMain.handle('orbit:link-open',(e,url,options)=>{const t=tabs.find(tab=>tab.view?.webContents===e.sender||tab.chat?.webContents===e.sender);if(!t||e.senderFrame!==e.sender.mainFrame||!webUrl(url))return {ok:false};try{return openLink(e.sender,url,{download:options?.download===true});}catch(error){return {ok:false,error:error.message};}});
 ipcMain.handle('orbit:split-drag',(e,action,value)=>{if(!splitter||e.sender!==splitter.webContents||e.senderFrame!==e.sender.mainFrame||e.senderFrame.url!==splitterUrl)return {ok:false};const t=current();if(!shown||!bounds||!t?.chatVisible)return {ok:false};const valid=Number.isFinite(value)&&Math.abs(value)<100000;if(action==='start'&&valid)drag={id:t.id,screenX:value,ratio:t.ratio};else if(action==='move'&&valid&&drag?.id===t.id)t.ratio=Math.max(.3,Math.min(.75,drag.ratio+(value-drag.screenX)/Math.max(1,bounds.width-8)));else if(action==='end')drag=null;else if(action==='reset'){drag=null;t.ratio=.62;}else if(action==='step'&&valid&&Math.abs(value)<=.1)t.ratio=Math.max(.3,Math.min(.75,t.ratio+value));else return {ok:false};layout();publish();return {ok:true,ratio:t.ratio};});
 function pages(){return tabs.filter(t=>!t.provisional&&t.view&&!t.view.webContents.isDestroyed()).map(t=>({id:t.id,workspace:t.workspace,title:t.title,url:t.view.webContents.getURL()||t.url,active:shown&&t.id===activeId}));}
 async function pageText(id){const wc=views.get(id)?.webContents;if(!wc||wc.isDestroyed())throw Object.assign(Error('Please open this page in Orbit first.'),{code:'PAGE_NOT_FOUND',statusCode:404});const data=await wc.executeJavaScript(`(()=>{const parts=[document.body?.innerText||''];for(const frame of document.querySelectorAll('iframe'))try{if(frame.contentDocument?.body?.innerText)parts.push(frame.contentDocument.body.innerText);}catch{}const raw=parts.join('\\n');return {title:document.title,url:location.href,text:raw.slice(0,1000000),truncated:raw.length>1000000};})()`);return {id,...data,source:'untrusted-webpage-text',readAt:Date.now()};}
 const pageActions=Object.fromEntries(['readPageEditor','writePageEditor','uploadPageFiles','clickPageElement','describePageDom'].map(method=>[method,(id,input)=>{if(!pageEdit)throw Error('Page editing is unavailable in this build.');return pageEdit[method](views.get(id)?.webContents,id,input);} ]));
 function show(next,mode='browser'){if(!spec(mode))return {ok:false,error:'Unknown workspace.'};if(!next||!['x','y','width','height'].every(k=>Number.isFinite(next[k])))return {ok:false,error:'Invalid workspace bounds.'};const changing=!shown||workspace!==mode;initToolbar();bounds=next;shown=true;workspace=mode;ensureHome(mode);activeId=tabs.find(t=>t.id===lastActive.get(mode)&&t.workspace===mode&&!t.provisional)?.id||tabs.find(t=>t.workspace===mode&&!t.provisional)?.id||null;layout();if(changing)focusCurrent();publish();const state=snapshot();return {ok:true,workspaceState:state,navigation:{canGoBack:state.canBack,canGoForward:state.canForward}};}
 function remove(mode){for(const t of [...tabs].filter(t=>t.workspace===mode)){tabs.splice(tabs.indexOf(t),1);views.delete(t.id);views.delete(t.id+'-chat');for(const v of [t.view,t.chat]){if(attached.has(v)){getWindow()?.contentView.removeChildView(v);attached.delete(v);}if(v?.webContents&&!v.webContents.isDestroyed())v.webContents.close();}}specs.delete(mode);lastActive.delete(mode);if(workspace===mode){shown=false;activeId=null;detach();}publish();}
 function dispose(){if(disposed)return;disposed=true;for(const [session,handler] of downloadSessions)session.removeListener('will-download',handler);downloadSessions.clear();drag=null;shown=false;detach();const all=[...views.values(),toolbar,splitter];views.clear();tabs.length=0;activeId=null;toolbar=null;splitter=null;for(const v of all){const wc=v?.webContents;if(wc&&!wc.isDestroyed())wc.close();}for(const channel of ['orbit:tabs-action','orbit:split-drag','orbit:link-open'])ipcMain.removeHandler(channel);}
 return {warmUp:initToolbar,open,openLink,selectionItems,selectionAction,pick,views,tabs,current,linkItems,showLinkMenu,snapshot,navigate,show,configure,remove,toggleChat,pages,pageText,...pageActions,refresh:publish,hide(){drag=null;addressEditing=false;shown=false;detach();publish();},dispose};
}
module.exports={createTabbedBrowser,targetUrl,launchTargets,webUrl};

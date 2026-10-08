const {WebContentsView,ipcMain,dialog,Menu,clipboard}=require('electron');
const path=require('node:path'),fs=require('node:fs');
const {pathToFileURL,fileURLToPath}=require('node:url');
const {createPdfStyle}=require('./pdf-style.cjs');
const {createPdfChatUpload}=require('./pdf-chat-upload.cjs');
const localExtensions=new Set(['.pdf','.html','.htm','.xhtml','.mhtml','.mht','.shtml']);
function launchTargets(argv,cwd=process.cwd()){return argv.filter(v=>typeof v==='string'&&!v.startsWith('--')&&(/^https?:\/\//i.test(v)||localExtensions.has(path.extname(v).toLowerCase()))).map(v=>/^https?:\/\//i.test(v)?v:path.resolve(cwd,v));}
function targetUrl(value){
 if(typeof value!=='string'||value.length>16384)throw Error('Invalid address.');
 if(/^https?:\/\//i.test(value)){const u=new URL(value);if(u.username||u.password)throw Error('Use an address without a password.');return u.href;}
 const local=value.startsWith('file:')?fileURLToPath(value):value;
 if(path.isAbsolute(local)&&localExtensions.has(path.extname(local).toLowerCase())){try{if(fs.statSync(local).isFile())return pathToFileURL(local).href;}catch{}throw Error('File not found. Check its address.');}
 if(!value.trim())return 'https://www.google.com/';
 if(!/\s/.test(value)&&/^(localhost(?::\d+)?|[\w-]+(?:\.[\w-]+)+)(?:[:/].*)?$/.test(value))return 'https://'+value;
 return 'https://www.google.com/search?q='+encodeURIComponent(value);
}
function createTabbedBrowser({getWindow,sessions,onPage,getLanguage=()=> 'en',onState=()=>{}}){
 const pdfStyle=createPdfStyle({getWindow,getLanguage});
 const pdfChatUpload=createPdfChatUpload({publish:()=>publish()});
 let disposed=false;
 const views=new Map(),tabs=[];let activeId=null,toolbar=null,toolbarReady=false,splitter=null,splitterReady=false,drag=null,addressEditing=false,bounds=null,shown=false,counter=0,workspace='browser';const lastActive={browser:null,pdf:null};
 const toolbarUrl='orbit://app/browser.html';
 const splitterUrl='orbit://app/splitter.html';
 const current=()=>tabs.find(t=>t.id===activeId&&t.workspace===workspace);
 const attached=new Set();
 function detach(){const win=getWindow();if(win&&!win.isDestroyed())for(const v of attached)win.contentView.removeChildView(v);attached.clear();}
 function mount(v){const win=getWindow();if(!v||!win||win.isDestroyed())return;if(!attached.has(v)){win.contentView.addChildView(v);attached.add(v);}}
 function snapshot(){const wc=current()?.view?.webContents,live=wc&&!wc.isDestroyed();const t=current(),address=t?.url?.startsWith('file:')?fileURLToPath(t.url):t?.url||'';return {workspace,visible:shown,address,addressEditing,tabs:tabs.filter(t=>t.workspace===workspace).map(t=>({id:t.id,title:t.title,url:t.url,pdf:t.pdf,chat:!!t.chatVisible,upload:t.upload||null})),activeId,ratio:current()?.ratio||.62,canBack:!!(live&&wc.navigationHistory.canGoBack()),canForward:!!(live&&wc.navigationHistory.canGoForward()),error:current()?.error||''};}
 function publish(){if(disposed)return;const state=snapshot(),wc=toolbar?.webContents;if(toolbarReady&&wc&&!wc.isDestroyed())wc.send('orbit:tabs-state',state);onState(state);}
 function layout(){
  if(disposed||!shown||!bounds)return;
  const r=bounds,t=current(),split=!!(t?.chatVisible&&t.chat),barHeight=48;
  if(!split||drag&&drag.id!==t.id)drag=null;
  const wanted=new Set([toolbar,...(t&&!addressEditing?[t.view]:[]),...(split&&!addressEditing?[t.chat,splitter]:[])]),win=getWindow();
  if(split&&!addressEditing&&attached.has(splitter)&&(!attached.has(t.view)||!attached.has(t.chat))){win?.contentView.removeChildView(splitter);attached.delete(splitter);}
  for(const v of attached)if(!wanted.has(v)){win?.contentView.removeChildView(v);attached.delete(v);}
  mount(toolbar);toolbar.setBounds({x:r.x,y:r.y,width:r.width,height:t&&!addressEditing?barHeight:r.height});
  if(!t||addressEditing)return;
  mount(t.view);const h=Math.max(1,r.height-barHeight),w=split?Math.round((r.width-8)*t.ratio):r.width;
  t.view.setBounds({x:r.x,y:r.y+barHeight,width:Math.max(1,w),height:h});
  if(split){
   mount(t.chat);t.chat.setBounds({x:r.x+w+8,y:r.y+barHeight,width:Math.max(1,r.width-w-8),height:h});
   mount(splitter);splitter.setBounds({x:r.x+(drag?0:w),y:r.y+barHeight,width:drag?r.width:8,height:h});
   if(splitterReady)splitter.webContents.send('orbit:split-state',{dragging:!!drag,x:drag?w:0,ratio:t.ratio});
  }
 }
 function openAddress(t){if(!t||t.workspace!=='pdf')return;activate(t.id);addressEditing=true;drag=null;layout();publish();toolbar.webContents.send('orbit:pdf-address',{id:t.id,title:t.title,address:t.url.startsWith('file:')?fileURLToPath(t.url):t.url});}
 function fileMenu(id){const t=tabs.find(t=>t.id===id&&t.workspace==='pdf');if(!t)return;Menu.buildFromTemplate([
  {id:'pdf-file-address',label:'View / edit file address…',click:()=>openAddress(t)},
  {id:'pdf-file-copy',label:'Copy file address',click:()=>clipboard.writeText(t.url.startsWith('file:')?fileURLToPath(t.url):t.url)},
  {type:'separator'},{label:'Reload',click:()=>t.view.webContents.reload()},{label:'Close file',click:()=>close(t.id)}
 ]).popup({window:getWindow()});}
 function activate(id,notify=true){const t=tabs.find(t=>t.id===id);if(!t)return;drag=null;addressEditing=false;workspace=t.workspace;activeId=id;lastActive[workspace]=id;shown=true;if(notify)onPage({id:workspace,title:workspace==='pdf'?'PDF Reader':'Browser',navigation:{canGoBack:false,canGoForward:false}});layout();publish();}
 function initToolbar(){if(toolbar)return;toolbar=new WebContentsView({webPreferences:{preload:path.join(__dirname,'tabs-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});toolbar.webContents.setWindowOpenHandler(()=>({action:'deny'}));toolbar.webContents.on('will-navigate',e=>e.preventDefault());toolbar.webContents.once('did-finish-load',()=>{toolbarReady=true;publish();});toolbar.webContents.loadURL(toolbarUrl).catch(()=>{});splitter=new WebContentsView({webPreferences:{preload:path.join(__dirname,'splitter-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});splitter.setBackgroundColor('#00000000');splitter.webContents.setWindowOpenHandler(()=>({action:'deny'}));splitter.webContents.on('will-navigate',e=>e.preventDefault());splitter.webContents.once('did-finish-load',()=>{splitterReady=true;layout();});splitter.webContents.loadURL(splitterUrl).catch(()=>{});}
 function setup(wc,id){
  wc.setUserAgent(wc.getUserAgent().replace(/\sElectron\/[^\s]+/g,'').replace(/\sOrbit(?:%20| )?Workspace\/[^\s]+/gi,''));
  wc.setWindowOpenHandler(({url})=>{if(/^https?:\/\//i.test(url))open(url);return {action:'deny'};});
  wc.on('will-navigate',(e,url)=>{if(!/^https?:\/\//i.test(url)&&!url.startsWith('file:')&&!url.startsWith('chrome-extension:'))e.preventDefault();});
  wc.on('did-fail-load',(_e,code,message,_url,main)=>{const t=tabs.find(t=>t.id===id);if(t&&main&&code!==-3){t.error='Load failed: '+message;publish();}});
 }
 function add(url){initToolbar();const id='tab-'+(++counter),partition=url.startsWith('https://chatgpt.com/')?'persist:chatgpt':'persist:personal-websites';const view=new WebContentsView({webPreferences:{partition,plugins:true,preload:path.join(__dirname,'website-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});const wc=view.webContents;
  const t={id,url,workspace:/\.pdf(?:[?#]|$)/i.test(url)?'pdf':'browser',title:url.startsWith('file:')?path.basename(fileURLToPath(url)):'New tab',view,pdf:/\.pdf(?:[?#]|$)/i.test(url),chat:null,chatVisible:false,ratio:.62,error:''};tabs.push(t);views.set(id,view);setup(wc,id);
  wc.on('did-navigate',(_e,url)=>{t.url=url;t.pdf=/\.pdf(?:[?#]|$)/i.test(url);if(t.pdf&&t.workspace!=='pdf'){t.workspace='pdf';if(t.id===activeId)activate(t.id);}t.error='';publish();});
  wc.on('did-navigate-in-page',(_e,url,main)=>{if(main){t.url=url;publish();}});
  wc.on('page-title-updated',(_e,title)=>{t.title=title||t.title;publish();});
  pdfStyle.attach(wc,view);
  wc.on('did-finish-load',()=>{wc.executeJavaScript("!!document.querySelector('embed[type=\"application/pdf\"]')").then(pdf=>{if(pdf){t.pdf=true;if(t.workspace!=='pdf'){t.workspace='pdf';if(t.id===activeId)activate(t.id);}publish();}}).catch(()=>{});});
  wc.on('before-input-event',(e,input)=>{if(input.control&&input.key.toLowerCase()==='t'){e.preventDefault();if(t.workspace==='pdf')pick('pdf');else open('https://www.google.com/');}if(input.control&&input.key.toLowerCase()==='w'){e.preventDefault();close(id);}if(input.control&&input.key.toLowerCase()==='l'){e.preventDefault();focusAddress();}});
  (sessions?.prepare(partition,wc.session)||Promise.resolve()).then(()=>wc.loadURL(url)).catch(e=>{t.error=e.message;publish();});activate(id);return t;
 }
 function open(value){const url=targetUrl(value);getWindow()?.show();const t=add(url);return {ok:true,id:t.workspace,tabId:t.id,title:t.workspace==='pdf'?'PDF Reader':'Browser'};}
 function close(id){const index=tabs.findIndex(t=>t.id===id);if(index<0)return;const t=tabs[index];detach();tabs.splice(index,1);for(const [key,v] of [[id,t.view],[id+'-chat',t.chat]]){views.delete(key);if(v?.webContents&&!v.webContents.isDestroyed())v.webContents.close();}if(activeId===id){activeId=tabs.filter(t=>t.workspace===workspace).at(-1)?.id||null;lastActive[workspace]=activeId;}if(!tabs.some(t=>t.workspace===workspace)&&workspace==='browser')add('https://www.google.com/');layout();publish();}
 function toggleChat(){const t=current();if(!t)return;t.chatVisible=!t.chatVisible;if(t.chatVisible&&!t.chat){t.chat=new WebContentsView({webPreferences:{partition:'persist:chatgpt',preload:path.join(__dirname,'website-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});views.set(t.id+'-chat',t.chat);const wc=t.chat.webContents;setup(wc,t.id);(sessions?.prepare('persist:chatgpt',wc.session)||Promise.resolve()).then(()=>wc.loadURL(t.workspace==='pdf'?'https://chatgpt.com/':sessions?.startUrl('chatgpt','https://chatgpt.com/')||'https://chatgpt.com/')).catch(()=>{});wc.on('did-navigate',(_e,url)=>sessions?.remember('chatgpt','https://chatgpt.com/',url));wc.on('dom-ready',()=>wc.insertCSS('html,body,body *{-webkit-app-region:no-drag!important}').catch(()=>{}));}layout();publish();if(t.chatVisible&&t.workspace==='pdf')pdfChatUpload.attach(t);}
 async function pick(mode=workspace){const result=await dialog.showOpenDialog(getWindow(),{title:'Open a PDF or webpage file',properties:['openFile','multiSelections'],filters:[{name:'PDF and webpages',extensions:mode==='pdf'?['pdf']:[...localExtensions].map(x=>x.slice(1))}]});for(const f of result.filePaths||[])open(f);return {ok:true};}
 function focusAddress(){const win=getWindow();if(win&&!win.isDestroyed()){win.webContents.focus();win.webContents.send('orbit:workspace-focus');}}
 async function performAction(action,value){try{const t=current();if(action==='focus-address'){focusAddress();}else if(action==='new'){if(workspace==='pdf')await pick('pdf');else open(value||'https://www.google.com/');}else if(action==='pdf-file-menu')fileMenu(value);else if(action==='pdf-address-open')openAddress(tabs.find(tab=>tab.id===value));else if(action==='pdf-address-close'){addressEditing=false;layout();}else if(action==='pdf-address-save'){const selected=tabs.find(tab=>tab.id===value?.id&&tab.workspace==='pdf');if(!selected)throw Error('This file is closed.');const url=targetUrl(value.address);selected.url=url;selected.error='';selected.view.webContents.loadURL(url).catch(error=>{selected.error=error.message;publish();});addressEditing=false;layout();}else if(action==='select')activate(value);else if(action==='close')close(value);else if(action==='open-file')await pick();else if(action==='navigate'){const url=targetUrl(value);if(t){t.url=url;t.error='';t.view.webContents.loadURL(url).catch(()=>{});publish();}else open(url);}else if(action==='chat')toggleChat();else if(action==='pdf-chat-retry'&&t?.workspace==='pdf'){t.chatVisible=true;layout();pdfChatUpload.attach(t,{force:true});}else if(action==='ratio'&&t&&Number.isFinite(value)){t.ratio=Math.max(.3,Math.min(.75,value));layout();publish();}else if(action==='chat-reload'&&t?.chat)t.chat.webContents.reload();else if(action==='back'&&t?.view.webContents.navigationHistory.canGoBack())t.view.webContents.navigationHistory.goBack();else if(action==='forward'&&t?.view.webContents.navigationHistory.canGoForward())t.view.webContents.navigationHistory.goForward();else if(action==='reload'&&t)t.view.webContents.reload();publish();return {ok:true,workspaceState:snapshot()};}catch(e){if(current())current().error=e.message;publish();return {ok:false,error:e.message};}}
 ipcMain.handle('orbit:tabs-action',(e,action,value)=>{if(!toolbar||e.sender!==toolbar.webContents||e.senderFrame!==e.sender.mainFrame||e.senderFrame.url!==toolbarUrl)return {ok:false};return performAction(action,value);});
 function navigate(mode,action,value){if(disposed||!shown||mode!==workspace||!['browser','pdf'].includes(mode))return {ok:false,error:'Workspace is not active.'};if(!['back','forward','reload','navigate','open-file'].includes(action))return {ok:false,error:'Unsupported navigation action.'};return performAction(action,value);}
 ipcMain.handle('orbit:split-drag',(e,action,value)=>{if(!splitter||e.sender!==splitter.webContents||e.senderFrame!==e.sender.mainFrame||e.senderFrame.url!==splitterUrl)return {ok:false};const t=current();if(!shown||!bounds||!t?.chatVisible)return {ok:false};const valid=Number.isFinite(value)&&Math.abs(value)<100000;if(action==='start'&&valid)drag={id:t.id,screenX:value,ratio:t.ratio};else if(action==='move'&&valid&&drag?.id===t.id)t.ratio=Math.max(.3,Math.min(.75,drag.ratio+(value-drag.screenX)/Math.max(1,bounds.width-8)));else if(action==='end')drag=null;else if(action==='reset'){drag=null;t.ratio=.62;}else if(action==='step'&&valid&&Math.abs(value)<=.1)t.ratio=Math.max(.3,Math.min(.75,t.ratio+value));else return {ok:false};layout();publish();return {ok:true,ratio:t.ratio};});
 return {open,pick,views,tabs,current,toggleChat,snapshot,navigate,show(next,mode='browser'){initToolbar();bounds=next;shown=true;workspace=mode==='pdf'?'pdf':'browser';activeId=(tabs.some(t=>t.id===lastActive[workspace])?lastActive[workspace]:null)||tabs.find(t=>t.workspace===workspace)?.id||null;if(!tabs.some(t=>t.workspace===workspace)&&workspace==='browser')add('https://www.google.com/');layout();publish();const state=snapshot();return {ok:true,workspaceState:state,navigation:{canGoBack:state.canBack,canGoForward:state.canForward}};},hide(){drag=null;addressEditing=false;shown=false;detach();publish();},dispose(){if(disposed)return;disposed=true;drag=null;shown=false;for(const t of tabs)t.chatVisible=false;detach();const all=[...views.values(),toolbar,splitter];views.clear();tabs.length=0;activeId=null;toolbar=null;splitter=null;for(const v of all){const wc=v?.webContents;if(wc&&!wc.isDestroyed())wc.close();}ipcMain.removeHandler('orbit:tabs-action');ipcMain.removeHandler('orbit:split-drag');}};
}
module.exports={createTabbedBrowser,targetUrl,launchTargets};


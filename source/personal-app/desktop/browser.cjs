const {enableMicrophone}=require('./media-permissions.cjs');
const path=require('node:path');
const {WebContentsView}=require('electron');
const pageEdit=require('./page-edit.cjs');
function webUrl(value){
 if(typeof value!=='string'||value.length>16384)return null;
 try{const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||!u.hostname)return null;return u.href;}catch{return null;}
}
function createBrowser({getWindow,views=new Map(),serviceUrls,portals,onPage,sessions,getLanguage=()=>'zh'}){
 let disposed=false;let active=null,bounds=null,counter=0,history=[],position=-1;
 const workspaces=new Map();
 function viewFor(id){return workspaces.get(id)||views.get(id);}
 function physicalId(view){return [...views].find(([,v])=>v===view)?.[0];}
 function load(view,url){const request=(view.orbitLoadRequest||0)+1;view.orbitLoadRequest=request;return view.orbitReady.then(()=>{if(!view.webContents.isDestroyed()&&view.orbitLoadRequest===request)return view.webContents.loadURL(url);}).catch(()=>{});}
 function navigation(){return {canGoBack:position>0,canGoForward:position>=0&&position<history.length-1};}
 function record(view,id,url){
  if(!webUrl(url))return;
  const wc=view.webContents;const index=wc.getURL()===url?wc.navigationHistory.getActiveIndex():null;
  const entry={id,url,index},current=history[position];
  if(current?.id===id&&(current.index===null||current.index===index)){history[position]=entry;return;}
  history=history.slice(0,position+1);history.push(entry);position=history.length-1;
 }
 function commit(view,id,url){
  if(disposed)return;
  if(!webUrl(url))return;view.orbitUrl=url;
  const owner=view.orbitParent?.orbitWorkspace;
  if(owner&&serviceUrls[owner]&&new URL(serviceUrls[owner]).origin===new URL(url).origin&&(owner!=='gmail'||new URL(url).pathname.startsWith('/mail/'))){view.orbitWorkspace=owner;workspaces.set(owner,view);}
  if(view.orbitWorkspace)sessions?.remember(view.orbitWorkspace,serviceUrls[view.orbitWorkspace],url);
  if(active!==view)return;
  if(view.orbitReplay){history[position]={id,url,index:view.webContents.navigationHistory.getActiveIndex()};view.orbitReplay=false;}else record(view,id,url);
  onPage(describe(id,url));
 }
 const names={gmail:'Gmail',calendar:'日历',analytics:'Analytics',search:'Google 搜索',chatgpt:'ChatGPT',...Object.fromEntries(portals.map(p=>[p.id,p.name]))};
 function serviceId(url){const u=new URL(url);return Object.keys(serviceUrls).find(id=>new URL(serviceUrls[id]).hostname===u.hostname)||null;}
 function describe(id,url){id=views.get(id)?.orbitWorkspace||id;let host='网页';try{host=new URL(url).hostname||'网页';}catch{}return {id,title:names[id]||host,serviceId:serviceId(webUrl(url)||'https://invalid.test/'),navigation:navigation()};}
 function place(view,track=true){if(disposed)return;const changed=active!==view;const win=getWindow();if(!win||win.isDestroyed())return;if(active&&active!==view){win.contentView.removeChildView(active);}active=view;if(track&&changed){const id=[...views].find(([,v])=>v===view)?.[0];if(id)record(view,id,view.webContents.getURL()||view.orbitUrl);}if(!win.contentView.children.includes(view))win.contentView.addChildView(view);if(bounds){const [width,height]=win.getContentSize();const x=Math.max(0,Math.min(width,bounds.x)),y=Math.max(48,Math.min(height,bounds.y));view.setBounds({x,y,width:Math.max(1,Math.min(width-x,bounds.width)),height:Math.max(1,Math.min(height-y,bounds.height))});}}
 function makeView(id,{session,webContents,url,ready}={}){
  const portal=portals.some(p=>p.id===id);
  const partition=id==='chatgpt'?'persist:chatgpt':(portal||id.startsWith('nav-'))?'persist:personal-websites':'persist:google-services';
  const view=new WebContentsView({...(webContents?{webContents}:{}),webPreferences:{...(session?{session}:{partition}),preload:path.join(__dirname,'website-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  views.set(id,view);view.orbitUrl=url||serviceUrls[id];
  const wc=view.webContents;
  wc.setUserAgent(wc.getUserAgent().replace(/\sElectron\/[^\s]+/g,'').replace(/\sOrbit(?:%20| )?Workspace\/[^\s]+/gi,''));
  view.orbitReady=session?(ready||Promise.resolve()):(sessions?.prepare(partition,wc.session)||Promise.resolve());
  if(serviceUrls[id]){view.orbitWorkspace=id;workspaces.set(id,view);}
  enableMicrophone(wc.session);
  wc.on('before-mouse-event',(_event,mouse)=>{if(mouse.type==='mouseDown'&&active===view&&getWindow()?.contentView.children.includes(view)&&!wc.isFocused())wc.focus();});
  wc.setWindowOpenHandler(details=>{
   if(!webUrl(details.url)&&details.url!=='about:blank')return {action:'deny'};
   return {action:'allow',createWindow:options=>{
    const childId='web-'+(++counter);
    const child=makeView(childId,{session:wc.session,webContents:options.webContents,url:details.url,ready:view.orbitReady});
    child.orbitParent=view;
    place(child);onPage(describe(childId,details.url==='about:blank'?wc.getURL():details.url));
    if(details.disposition==='background-tab')child.webContents.loadURL(details.url).catch(()=>{});
    return child.webContents;
   }};
  });
  wc.on('will-navigate',(event,url)=>{if(!webUrl(url))event.preventDefault();});
  wc.on('destroyed',()=>{views.delete(id);if(workspaces.get(view.orbitWorkspace)===view)workspaces.delete(view.orbitWorkspace);const current=history[position],priorCount=history.slice(0,position).filter(e=>e.id!==id).length;history=history.filter(e=>e.id!==id);position=current?.id===id?priorCount-1:history.indexOf(current);const win=getWindow();if(active===view){if(win&&!win.isDestroyed())win.contentView.removeChildView(view);active=null;const parent=view.orbitParent;if(parent&&!parent.webContents.isDestroyed()){if(view.orbitWorkspace){workspaces.set(view.orbitWorkspace,parent);if(webUrl(view.orbitUrl)&&new URL(parent.webContents.getURL()||serviceUrls[view.orbitWorkspace]).origin!==new URL(view.orbitUrl).origin)load(parent,view.orbitUrl);}place(parent);const parentId=[...views].find(([,v])=>v===parent)?.[0];if(parentId)onPage(describe(parentId,parent.webContents.getURL()));}}});
  wc.on('did-navigate',(_event,url)=>commit(view,id,url));
  wc.on('did-navigate-in-page',(_event,url,isMainFrame)=>{if(isMainFrame)commit(view,id,url);});
  // Embedded websites must never turn their header into a native Orbit drag region.
  wc.on('dom-ready',()=>{if(new URL(wc.getURL()).hostname==='chatgpt.com'){wc.insertCSS('html,body,body *,body *::before,body *::after{-webkit-app-region:no-drag!important;app-region:no-drag!important}').catch(()=>{});wc.executeJavaScript(require('node:fs').readFileSync(path.join(__dirname,'chatgpt-sidebar.js'),'utf8')).catch(()=>{});}});
  wc.on('did-stop-loading',()=>{view.orbitReplay=false;});
  wc.on('did-fail-load',(_event,code,_description,_url,isMainFrame)=>{if(isMainFrame&&code!==-3&&!wc.isDestroyed())wc.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<body style="font-family:system-ui;background:#f8fafd;color:#5f6368;padding:70px"><h2>'+(getLanguage()==='en'?'Unable to load this page.':'暂时无法加载此网页。')+'</h2><p>'+(getLanguage()==='en'?'Check your connection, then use Reload in the title bar.':'请检查网络连接后点击顶栏刷新。')+'</p></body>')).catch(()=>{});});
  return view;
 }
 function show(id,nextBounds){
  const win=getWindow();if(!win||win.isDestroyed())return {ok:false};
  if(id===null){if(active)win.contentView.removeChildView(active);active=null;return {ok:true};}
  if(!nextBounds||!['x','y','width','height'].every(k=>Number.isFinite(nextBounds[k])))throw Error('无效的网页尺寸。');
  bounds=Object.fromEntries(Object.entries(nextBounds).map(([k,v])=>[k,Math.round(v)]));
  let view=viewFor(id);if(!view){if(!serviceUrls[id])throw Error('未知网页。');view=makeView(id,{url:serviceUrls[id]});load(view,sessions?.startUrl(id,serviceUrls[id])||serviceUrls[id]);}
  place(view);return {ok:true,navigation:navigation()};
 }
 function open(value){
  const url=webUrl(value);if(!url)throw Error('不支持此网页链接。');const id=serviceId(url)||'web-'+(++counter);
  let view=viewFor(id);const launch=url===serviceUrls[id]||(id==='gmail'&&['https://mail.google.com/','https://mail.google.com/mail/u/0/'].includes(url));
  if(view&&launch){place(view);const result=describe(physicalId(view),view.webContents.getURL()||view.orbitUrl);onPage(result);return {ok:true,...result};}
  if(!view)view=makeView(id,{url});const base=serviceUrls[id]||url,target=launch?(sessions?.startUrl(id,base)||base):url;view.orbitUrl=target;load(view,target);place(view,false);record(view,physicalId(view),target);const result=describe(physicalId(view),target);onPage(result);return {ok:true,...result};
 }
 function navigate(id,action){
  const view=viewFor(id);if(!view||active!==view)return {ok:false};
  const wc=view.webContents;
  if(action==='back'||action==='forward'){
   const next=position+(action==='back'?-1:1);if(next<0||next>=history.length)return {ok:true,navigation:navigation()};
   const entry=history[next],target=views.get(entry.id);if(!target||target.webContents.isDestroyed())return {ok:false};
   position=next;if(target.orbitWorkspace)workspaces.set(target.orbitWorkspace,target);place(target,false);const targetWc=target.webContents;
   const nativeEntry=entry.index===null?null:targetWc.navigationHistory.getEntryAtIndex(entry.index);
   if(nativeEntry?.url===entry.url){if(targetWc.navigationHistory.getActiveIndex()!==entry.index){target.orbitReplay=true;targetWc.navigationHistory.goToIndex(entry.index);}}
   else if(targetWc.getURL()!==entry.url){target.orbitReplay=true;targetWc.loadURL(entry.url).catch(()=>{});}
   target.orbitUrl=entry.url;onPage(describe(entry.id,entry.url));
  }else if(action==='reload'){if(wc.getURL().startsWith('data:'))wc.loadURL(view.orbitUrl||serviceUrls[id]).catch(()=>{});else wc.reload();}
  return {ok:true,navigation:navigation()};
 }
 function pages(){return [...views].filter(([,v])=>!v.webContents.isDestroyed()&&(!v.orbitWorkspace||workspaces.get(v.orbitWorkspace)===v)).map(([id,v])=>({id:v.orbitWorkspace||id,title:v.webContents.getTitle()||describe(id,v.webContents.getURL()).title,url:v.webContents.getURL(),active:active===v}));}
 async function pageText(id){const view=viewFor(id);if(!view||view.webContents.isDestroyed())throw Error('请先在工作台打开该网页。');const data=await view.webContents.executeJavaScript(`(()=>{const parts=[document.body?.innerText||''];for(const f of document.querySelectorAll('iframe')){try{const text=f.contentDocument?.body?.innerText;if(text)parts.push(text);}catch{}}const raw=parts.join('\\n');return {title:document.title,url:location.href,text:raw.slice(0,1000000),truncated:raw.length>1000000};})()`);return {id,...data,source:'untrusted-webpage-text',readAt:Date.now()};}
 const readPageEditor=(id,input)=>pageEdit.readPageEditor(viewFor(id)?.webContents,id,input);
 const writePageEditor=(id,input)=>pageEdit.writePageEditor(viewFor(id)?.webContents,id,input);
 const uploadPageFiles=(id,input)=>pageEdit.uploadPageFiles(viewFor(id)?.webContents,id,input);
 const clickPageElement=(id,input)=>pageEdit.clickPageElement(viewFor(id)?.webContents,id,input);
 const describePageDom=(id,input)=>pageEdit.describePageDom(viewFor(id)?.webContents,id,input);
 function configure(items){for(const item of items){names[item.id]=item.name;if(!item.url)continue;const changed=serviceUrls[item.id]!==item.url;serviceUrls[item.id]=item.url;const view=viewFor(item.id);if(changed&&view&&!view.webContents.isDestroyed()){view.orbitUrl=item.url;load(view,item.url);}}}
 function remove(id){for(const [key,view] of views){if((key===id||view.orbitWorkspace===id)&&!view.webContents.isDestroyed())view.webContents.close();}workspaces.delete(id);if(id.startsWith('nav-')){delete serviceUrls[id];delete names[id];}}
 return {views,show,open,navigate,pages,pageText,readPageEditor,writePageEditor,uploadPageFiles,clickPageElement,describePageDom,configure,remove,dispose:()=>{if(disposed)return;disposed=true;const all=[...views.values()];views.clear();workspaces.clear();active=null;for(const view of all){const wc=view.webContents;if(wc&&!wc.isDestroyed())wc.close();}}};
}
module.exports={webUrl,createBrowser};

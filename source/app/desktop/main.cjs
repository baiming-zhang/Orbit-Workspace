const {app,BrowserWindow,WebContentsView,protocol,net,shell,ipcMain,Menu,safeStorage,clipboard,dialog,nativeImage,nativeTheme}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {externalUrl,parseMeetingLink,zoomAppUrl}=require('./links.cjs');
const {createGoogle}=require('./google.cjs');
const {createTabbedBrowser,launchTargets}=require('./tabbed-browser.cjs');
let tabbedBrowser;
const {createSettings}=require('./settings.cjs');
const {createEvents}=require('./events.cjs');
const {createNavigation,chooseNavigationIcon}=require('./navigation.cjs');
const {createLocalApi}=require('./local-api.cjs');
const {createBackground}=require('./background.cjs');
const {createBrowser}=require('./browser.cjs');
const {createBrowserSessions}=require('./browser-sessions.cjs');
const {configureBranding,brandWindow,registerShortcut}=require('./windows-branding.cjs');
const OrbitI18n=require('../dist/i18n.js');
const {createDownloads}=require('./downloads.cjs');
let downloads;
const portals=require('../dist/shortcuts.js');
const {createCredentials,portalForUrl}=require('./credentials.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'orbit',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
configureBranding();
const verify=false;
if(verify){app.disableHardwareAcceleration();app.setPath('userData',path.join(app.getPath('temp'),'orbit-build-verification-'+Date.now()));}
if(!app.requestSingleInstanceLock()){app.quit();return;}
let mainWindow;
downloads=createDownloads({app,shell,onChange:data=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:downloads-changed',data);}});
let google;
let settings;
let localEvents;
let localApi;
let background;
let credentials;
let quitting=false;
let browser;
let browserSessions;
let quitFlushed=false,quitSaving=false;
let navigation;
function navigationContextMenu(id){const entries=[{id:"edit",label:OrbitI18n.text("编辑",settings?.get().language),click:()=>mainWindow.webContents.send("orbit:navigation-action",{action:"edit",id})}];entries.push({id:"delete",label:OrbitI18n.text("删除",settings?.get().language),click:()=>mainWindow.webContents.send("orbit:navigation-action",{action:"delete",id})});return Menu.buildFromTemplate(entries);}
const serviceViews=new Map();
const serviceUrls={...Object.fromEntries(portals.map(p=>[p.id,p.url])),gmail:'https://mail.google.com/mail/u/0/',calendar:'https://calendar.google.com/',analytics:'https://analytics.google.com/',search:'https://www.google.com/',chatgpt:'https://chatgpt.com/'};
function trusted(event){return mainWindow&&!mainWindow.isDestroyed()&&event.sender===mainWindow.webContents&&event.senderFrame?.url.startsWith('orbit://app/');}
async function openSafe(url){const safe=externalUrl(url);if(!safe)throw new Error('不支持此链接。');return tabbedBrowser.open(safe);}
function createWindow(){
  mainWindow=new BrowserWindow({width:1440,height:1000,minWidth:1080,minHeight:720,backgroundColor:'#f6f7f4',title:'Orbit Workspace',icon:path.join(__dirname,'assets/icon.png'),autoHideMenuBar:true,titleBarStyle:'hidden',titleBarOverlay:{color:'#fafbf8',symbolColor:'#617055',height:48},show:!verify,webPreferences:{backgroundThrottling:!verify,preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  brandWindow(mainWindow);if(!verify)registerShortcut();
  mainWindow.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
  mainWindow.webContents.session.setPermissionCheckHandler(()=>false);
  mainWindow.webContents.setWindowOpenHandler(({url})=>{openSafe(url).catch(()=>{});return {action:'deny'};});
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('orbit://app/')){event.preventDefault();openSafe(url).catch(()=>{});}});
  mainWindow.loadURL('orbit://app/index.html');
  mainWindow.on('close',event=>{if(!quitting&&background){event.preventDefault();background.closeToTray();}});
  mainWindow.on('closed',()=>{mainWindow=null;});
}

app.whenReady().then(()=>{
  nativeTheme.themeSource='light';
  Menu.setApplicationMenu(null);
  settings=createSettings(app);
  navigation=createNavigation({app});
  google=createGoogle({app,safeStorage,shell,getTimeZone:()=>settings.get().timeZone});
  credentials=createCredentials({app,safeStorage});
  const loginTracker=require('./login-tracker.cjs').createLoginTracker(credentials);
  browserSessions=createBrowserSessions({app,safeStorage});
  browser=createBrowser({sessions:browserSessions,getWindow:()=>mainWindow,views:serviceViews,serviceUrls,portals,getLanguage:()=>settings.get().language,onPage:page=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:open-page',page);}});
  browser.configure(navigation.get().items);
  localEvents=createEvents({app,safeStorage,getTimeZone:()=>settings.get().timeZone,onChange:events=>{background?.syncLocal(events);if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:events-changed',events);}});
  localApi=createLocalApi({app,safeStorage,google,events:localEvents,browser,getSettings:()=>settings.get(),onCalendarChange:()=>{background?.refreshRemote();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:data-changed');}});
  const root=path.resolve(__dirname,'../dist');
  protocol.handle('orbit',request=>{
    let parsed;try{parsed=new URL(request.url);}catch{return new Response('Bad request',{status:400});}
    if(parsed.hostname!=='app')return new Response('Not found',{status:404});
    let pathname;try{pathname=decodeURIComponent(parsed.pathname);}catch{return new Response('Bad request',{status:400});}
    const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
    if(!file.startsWith(root+path.sep))return new Response('Forbidden',{status:403});
    return net.fetch(pathToFileURL(file).href);
  });
  ipcMain.handle('orbit:open-website',async(event,url)=>{if(!trusted(event))return {ok:false,error:'未经授权的窗口。'};try{return tabbedBrowser.open(url);}catch{return {ok:false,error:'无法打开此网页。'};}});
  ipcMain.handle('orbit:join-zoom',async(event,value,mode)=>{
    if(!trusted(event))return {ok:false,error:'未经授权的窗口。'};
    const meeting=parseMeetingLink(value);if(!meeting)return {ok:false,error:'请输入有效的 Zoom 会议链接。'};
    try{
      if(mode==='app'){const deep=zoomAppUrl(meeting);if(!deep)return {ok:false,error:'此个人会议链接请使用浏览器加入。'};await shell.openExternal(deep);return {ok:true};}
      return await openSafe(meeting);
    }catch{return {ok:false,error:mode==='app'?'未能打开 Zoom 客户端，请使用浏览器加入。':'未能打开会议链接。'};}
  });
  const guard=(handler)=>async(event,...args)=>{if(!trusted(event))return {ok:false,error:'未经授权的窗口。'};try{return await handler(...args);}catch(error){return {ok:false,error:error.message||'操作未完成，请重试。'};}};
  ipcMain.handle('orbit:downloads-get',guard(()=>downloads.list()));
  ipcMain.handle('orbit:downloads-action',guard((id,action)=>downloads.action(id,action)));
  ipcMain.handle('orbit:navigation-get',guard(()=>navigation.get()));
  ipcMain.handle('orbit:navigation-save',guard(input=>{const result=navigation.save(input);browser.configure(result.items);return result;}));
  ipcMain.handle('orbit:navigation-delete',guard(id=>{const result=navigation.remove(id);browser.remove(id);return result;}));
  ipcMain.handle('orbit:navigation-reorder',guard(ids=>navigation.reorder(ids)));
  ipcMain.handle('orbit:navigation-icon',guard(()=>chooseNavigationIcon({app,dialog,nativeImage,window:mainWindow,language:settings.get().language})));
  ipcMain.handle('orbit:navigation-menu',guard(id=>{if(!navigation.get().items.some(item=>item.id===id))throw Error('导航项不存在。');navigationContextMenu(id).popup({window:mainWindow});return {ok:true};}));
  ipcMain.handle('orbit:login-settings',guard(()=>credentials.status()));
  ipcMain.handle('orbit:login-config',guard(input=>credentials.configure(input)));
  ipcMain.handle('orbit:login-forget',guard(id=>credentials.forget(id)));
  function websiteSender(event){
    for(const [id,view] of [...serviceViews,...(tabbedBrowser?.views||[])]){const portal=portalForUrl(event.senderFrame?.url);if(view.webContents===event.sender&&portal&&event.senderFrame===event.sender.mainFrame)return {id,view,portal,url:event.senderFrame.url};}
    return null;
  }
  ipcMain.handle('orbit:website-read',(event,username)=>{const source=websiteSender(event);return source?loginTracker.read(event.sender,source.url,username):null;});
  ipcMain.handle('orbit:website-username',(event,username)=>{const source=websiteSender(event);return source?loginTracker.username(event.sender,source.url,username):{ok:false};});
  ipcMain.handle('orbit:website-stage',(event,input)=>{const source=websiteSender(event);return source?loginTracker.stage(event.sender,source.url,input):{ok:false};});
  ipcMain.handle('orbit:website-save',(event,input)=>{const source=websiteSender(event);if(!source)return {ok:false};try{return credentials.remember(source.url,input);}catch(error){return {ok:false,error:error.message};}});
  ipcMain.handle('orbit:website-attempt',event=>{const source=websiteSender(event);if(!source||source.view.orbitLoginAttempted||!credentials.read(source.url)?.autoLogin)return {ok:false};source.view.orbitLoginAttempted=true;return {ok:true};});
  ipcMain.handle('orbit:language-save',guard(language=>{const result=settings.saveLanguage(language);background?.updatePresentation();return result;}));
  ipcMain.handle('orbit:reminder-settings',event=>background?.trustedPopup(event)?settings.get():null);
  ipcMain.handle('orbit:time-zone',guard(()=>settings.get()));
  ipcMain.handle('orbit:save-time-zone',guard(zone=>{const result=settings.save(zone);background?.refreshRemote();return {ok:true,...result};}));
  ipcMain.handle('orbit:google-connection',guard(()=>google.connection()));
  ipcMain.handle('orbit:google-config',guard(input=>google.saveConnection(input)));
  ipcMain.handle('orbit:google-connect',guard(async(options)=>{const result=await google.connect({calendarWrite:options?.calendarWrite===true});background?.refreshRemote();return result;}));
  ipcMain.handle('orbit:google-disconnect',guard(async()=>{const result=await google.disconnect();background?.clearRemote();return result;}));
  ipcMain.handle('orbit:google-meetings',guard(()=>google.getMeetings()));
  ipcMain.handle('orbit:google-summary',guard(()=>google.getSummary()));
  ipcMain.handle('orbit:local-events',guard(()=>localEvents.get()));
  ipcMain.handle('orbit:sync-meetings',guard(events=>localEvents.replace(events)));
  ipcMain.handle('orbit:api-status',guard(()=>localApi.status()));
  ipcMain.handle('orbit:api-config',guard(input=>localApi.configure(input)));
  ipcMain.handle('orbit:api-copy',guard(kind=>{if(!localApi.status().enabled)throw Error('请先开启本机 API。');const portable=process.env.PORTABLE_EXECUTABLE_FILE;const bridge=app.isPackaged?path.join(path.dirname(portable||app.getPath('exe')),'orbit-api-bridge.cjs'):path.join(__dirname,'mcp-bridge.cjs');const value=kind==='mcp'?{mcpServers:{orbit:{command:'node',args:[bridge],env:localApi.mcpEnv()}}}:localApi.clientConfig();clipboard.writeText(JSON.stringify(value,null,2));return {ok:true};}));
  ipcMain.handle('orbit:reminder-data',event=>background?.trustedPopup(event)?background.items():[]);
  ipcMain.handle('orbit:reminder-action',(event,action,id)=>background?.action(event,action,id));
  ipcMain.handle('orbit:show-service',guard((id,bounds)=>{if(id==='browser'||id==='pdf'){browser.show(null);return tabbedBrowser.show(bounds,id);}tabbedBrowser?.hide();return browser.show(id,bounds);}));
  ipcMain.handle('orbit:reload-service',guard(id=>['browser','pdf'].includes(id)?tabbedBrowser.navigate(id,'reload'):browser.navigate(id,'reload')));
  ipcMain.handle('orbit:navigate-website',guard((id,action)=>['browser','pdf'].includes(id)?tabbedBrowser.navigate(id,action):browser.navigate(id,action)));
  ipcMain.handle('orbit:workspace-action',guard((mode,action,value)=>tabbedBrowser.navigate(mode,action,value)));
  createWindow();
  tabbedBrowser=createTabbedBrowser({getWindow:()=>mainWindow,sessions:browserSessions,onState:state=>{if(!quitting&&mainWindow&&!mainWindow.isDestroyed()&&!mainWindow.webContents.isDestroyed())mainWindow.webContents.send('orbit:workspace-state',state);},onPage:page=>{if(!quitting&&mainWindow&&!mainWindow.isDestroyed()&&mainWindow.webContents&&!mainWindow.webContents.isDestroyed())mainWindow.webContents.send('orbit:open-page',page);}});
  mainWindow.webContents.once('did-finish-load',()=>{for(const target of launchTargets(process.argv))tabbedBrowser.open(target);});
  ipcMain.handle('orbit:pdf-open',guard(()=>tabbedBrowser.pick('pdf')));
  mainWindow.webContents.on('before-input-event',(event,input)=>{if(input.control&&input.key.toLowerCase()==='o'){event.preventDefault();tabbedBrowser.pick();}});
  background=createBackground({app,safeStorage,shell,google,getWindow:()=>mainWindow,getTimeZone:()=>settings.get().timeZone,getLanguage:()=>settings.get().language,openWebsite:async url=>{if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();return browser.open(url);},verify});background.start();
  if(localEvents.get().initialized)background.syncLocal(localEvents.get().events);
  localApi.start();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
app.on('second-instance',(_event,argv,cwd)=>{const targets=launchTargets(argv,cwd);if(targets.length&&tabbedBrowser){for(const target of targets)tabbedBrowser.open(target);if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();return;}if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
app.on('before-quit',event=>{
  quitting=true;
  if(quitFlushed)return;
  event.preventDefault();
  if(quitSaving)return;
  quitSaving=true;
  const shutdownError=error=>{try{fs.appendFileSync(path.join(app.getPath('userData'),'orbit-shutdown.log'),new Date().toISOString()+' '+(error?.stack||error)+'\n');}catch{}};
  // before-quit fires again after saving the sessions. Destroy each view once.
  for(const cleanup of [()=>tabbedBrowser?.dispose(),()=>background?.dispose(),()=>google?.dispose(),()=>localApi?.stop()])try{cleanup();}catch(error){shutdownError(error);}
  Promise.resolve().then(()=>browserSessions?.flush()).catch(shutdownError).finally(()=>{
    try{browserSessions?.dispose();browser?.dispose();}catch(error){shutdownError(error);}
    quitFlushed=true;app.quit();
  });
});
app.on('window-all-closed',()=>{if(quitting)app.quit();});

const {enableMicrophone}=require('./media-permissions.cjs');
const {app,BrowserWindow,WebContentsView,protocol,net,shell,ipcMain,Menu,safeStorage,clipboard,dialog,nativeImage,nativeTheme}=require('electron');
const path=require('node:path');
const fs=require('node:fs');
const {pathToFileURL}=require('node:url');
const {externalUrl,parseMeetingLink,zoomAppUrl}=require('./links.cjs');
const {createGoogle}=require('./google.cjs');
const {createTabbedBrowser,launchTargets,webUrl}=require('./tabbed-browser.cjs');
let tabbedBrowser,launchBridge;const pendingLaunches=[];
const {createLaunchBridge,acceptLaunchRequest}=require('./launch-bridge.cjs');
const {createSettings}=require('./settings.cjs');
const {createUpdater}=require('./updater.cjs');
const {createEvents}=require('./events.cjs');
const {createNavigation,chooseNavigationIcon}=require('./navigation.cjs');
const {createLocalApi}=require('./local-api.cjs');
const {createBackground}=require('./background.cjs');
const {createBrowser}=require('./browser.cjs');
const {createBrowserSessions}=require('./browser-sessions.cjs');
const {configureBranding,brandWindow,registerShortcut}=require('./windows-branding.cjs');
const OrbitI18n=require('../dist/i18n.js');
const {createDownloads}=require('./downloads.cjs');
const {createDownloadsFlyout}=require('./downloads-flyout.cjs');
const {createFavorites}=require('./favorites.cjs');
const {createFavoritesFlyout}=require('./favorites-flyout.cjs');
let downloads,downloadsFlyout,favorites,favoritesFlyout;
const portals=require('../dist/shortcuts.js');
const {createCredentials,portalForUrl}=require('./credentials.cjs');
protocol.registerSchemesAsPrivileged([{scheme:'orbit',privileges:{standard:true,secure:true,supportFetchAPI:true,corsEnabled:true}}]);
configureBranding();
// Chromium-owned PDF controls use English; Orbit language labels are handled separately.
app.commandLine.appendSwitch('lang','en-US');
const verify=false;
if(verify){app.disableHardwareAcceleration();app.setPath('userData',path.join(app.getPath('temp'),'orbit-build-verification-'+Date.now()));}
if(!app.requestSingleInstanceLock()){app.quit();return;}acceptLaunchRequest(process.argv);
let mainWindow;
downloads=createDownloads({app,shell,dialog,Menu,getWindow:()=>mainWindow,getLanguage:()=>settings?.get().language||'en',onChange:data=>{downloadsFlyout?.update();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:downloads-changed',data);}});
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
async function openSafe(url){const safe=webUrl(url);if(!safe)throw new Error('不支持此链接。');return tabbedBrowser.open(safe);}
function createWindow(){
  mainWindow=new BrowserWindow({width:1440,height:1000,minWidth:1080,minHeight:720,backgroundColor:'#f6f7f4',title:'Orbit Workspace',icon:path.join(__dirname,'assets/icon.png'),autoHideMenuBar:true,titleBarStyle:'hidden',titleBarOverlay:{color:'#fafbf8',symbolColor:'#617055',height:48},show:!verify,webPreferences:{backgroundThrottling:!verify,preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  brandWindow(mainWindow);if(!verify)registerShortcut();
  enableMicrophone(mainWindow.webContents.session);
  mainWindow.webContents.setWindowOpenHandler(({url})=>{openSafe(url).catch(()=>{});return {action:'deny'};});
  mainWindow.webContents.on('context-menu',(event,params)=>tabbedBrowser?.showLinkMenu(mainWindow.webContents,params,event));
  mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('orbit://app/')){event.preventDefault();openSafe(url).catch(()=>{});}});
  const startupTargets=launchTargets(process.argv);mainWindow.loadURL('orbit://app/index.html'+(startupTargets.length?(/\.pdf(?:[?#]|$)/i.test(startupTargets[0])?'#pdf':'#browser'):''));
  mainWindow.on('close',event=>{if(!quitting&&background){event.preventDefault();background.closeToTray();}});
  mainWindow.on('closed',()=>{mainWindow=null;});
}

app.whenReady().then(()=>{
  // Use the persisted appearance after loading settings.
  Menu.setApplicationMenu(null);
  settings=createSettings(app);nativeTheme.themeSource=settings.get().theme;
  const updater=createUpdater({app,net,getLanguage:()=>settings.get().language,onStatus:data=>mainWindow?.webContents.send('orbit:update-status',data)});
  downloadsFlyout=createDownloadsFlyout({getWindow:()=>mainWindow,getData:()=>downloads.list(),getLanguage:()=>settings.get().language,onVisibility:visible=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:downloads-visibility',visible);}});
  favorites=createFavorites({app,getLanguage:()=>settings.get().language,onChange:()=>favoritesFlyout?.update()});
  favoritesFlyout=createFavoritesFlyout({getWindow:()=>mainWindow,getData:()=>({...favorites.list(),timeZone:settings.get().timeZone}),getLanguage:()=>settings.get().language,onVisibility:visible=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:favorites-visibility',visible);}});
  navigation=createNavigation({app});
  google=createGoogle({app,safeStorage,shell,getLanguage:()=>settings.get().language,getTimeZone:()=>settings.get().timeZone});
  credentials=createCredentials({app,safeStorage});
  const loginTracker=require('./login-tracker.cjs').createLoginTracker(credentials);
  browserSessions=createBrowserSessions({app,safeStorage});
  browser=createBrowser({sessions:browserSessions,getWindow:()=>mainWindow,views:serviceViews,serviceUrls,portals,getLanguage:()=>settings.get().language,onPage:page=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:open-page',page);}});
  browser.configure(navigation.get().items);
  localEvents=createEvents({app,safeStorage,getTimeZone:()=>settings.get().timeZone,onChange:events=>{background?.syncLocal(events);if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:events-changed',events);}});
  localApi=createLocalApi({app,safeStorage,google,events:localEvents,browser:{pages:()=>tabbedBrowser?.pages()||[],pageText:id=>tabbedBrowser.pageText(id)},getSettings:()=>settings.get(),onCalendarChange:()=>{background?.refreshRemote();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:data-changed');}});
  const root=path.resolve(__dirname,'../dist');
  protocol.handle('orbit',request=>{
    let parsed;try{parsed=new URL(request.url);}catch{return new Response('Bad request',{status:400});}
    if(parsed.hostname==='favorites'){const id=parsed.pathname.match(/^\/([\da-f-]{36})\.png$/)?.[1],file=id&&favorites.imagePath(id);return file&&fs.existsSync(file)?net.fetch(pathToFileURL(file).href):new Response('Not found',{status:404});}
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
  const guard=(handler)=>async(event,...args)=>{if(!trusted(event))return {ok:false,error:'未经授权的窗口。'};try{return await handler(...args);}catch(error){return {ok:false,error:OrbitI18n.text(error.message||'操作未完成，请重试。',settings.get().language)};}};
  const downloadGuard=handler=>async(event,...args)=>{if(!trusted(event)&&!downloadsFlyout.trusted(event))return {ok:false,error:'Unauthorized download window.'};try{return await handler(...args);}catch(error){return {ok:false,error:OrbitI18n.text(error.message,settings.get().language)};}};
  ipcMain.handle('orbit:downloads-get',downloadGuard(()=>({...downloads.list(),language:settings.get().language})));
  ipcMain.handle('orbit:downloads-action',downloadGuard((id,action,value)=>downloads.action(id,action,value)));
  ipcMain.handle('orbit:downloads-show',guard(bounds=>{favoritesFlyout.close();return downloadsFlyout.show(bounds);}));
  ipcMain.handle('orbit:downloads-menu',downloadGuard(()=>downloads.menu()));
  ipcMain.handle('orbit:downloads-close',downloadGuard(()=>downloadsFlyout.close()));
  const favoriteGuard=handler=>async(event,...args)=>{if(!trusted(event)&&!favoritesFlyout.trusted(event))return {ok:false,error:'Unauthorized window.'};try{return await handler(...args);}catch(error){return {ok:false,error:OrbitI18n.text(error.message,settings.get().language)};}};
  ipcMain.handle('orbit:favorites-get',favoriteGuard(()=>({...favorites.list(),timeZone:settings.get().timeZone})));
  ipcMain.handle('orbit:favorites-action',favoriteGuard((id,action)=>{const item=favorites.list().items.find(item=>item.id===id);if(!item)throw Error(settings.get().language==='zh'?'未找到收藏。':'Favorite not found.');if(action==='remove')return favorites.remove(id);if(action==='open'){favoritesFlyout.close();return tabbedBrowser.open(item.sourceUrl);}throw Error(settings.get().language==='zh'?'不支持此收藏操作。':'Unsupported favorite action.');}));
  ipcMain.handle('orbit:favorites-show',guard(bounds=>{downloadsFlyout.close();return favoritesFlyout.show(bounds);}));
  ipcMain.handle('orbit:favorites-close',favoriteGuard(()=>favoritesFlyout.close()));
  ipcMain.handle('orbit:navigation-get',guard(()=>navigation.get()));
  ipcMain.handle('orbit:navigation-save',guard(input=>{const result=navigation.save(input);browser.configure(result.items);tabbedBrowser?.configure(result.items);return result;}));
  ipcMain.handle('orbit:navigation-delete',guard(id=>{const result=navigation.remove(id);browser.remove(id);tabbedBrowser?.remove(id);return result;}));
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
  ipcMain.handle('orbit:website-read',(event,username)=>{const source=websiteSender(event);if(!source)return null;const entry=loginTracker.read(event.sender,source.url,username);return entry?{...entry,language:settings.get().language}:null;});
  ipcMain.handle('orbit:website-username',(event,username)=>{const source=websiteSender(event);return source?loginTracker.username(event.sender,source.url,username):{ok:false};});
  ipcMain.handle('orbit:website-stage',(event,input)=>{const source=websiteSender(event);return source?loginTracker.stage(event.sender,source.url,input):{ok:false};});
  ipcMain.handle('orbit:website-save',(event,input)=>{const source=websiteSender(event);if(!source)return {ok:false};try{return credentials.remember(source.url,input);}catch(error){return {ok:false,error:error.message};}});
  ipcMain.handle('orbit:website-attempt',event=>{const source=websiteSender(event);if(!source||source.view.orbitLoginAttempted||!credentials.read(source.url)?.autoLogin)return {ok:false};source.view.orbitLoginAttempted=true;return {ok:true};});
  ipcMain.handle('orbit:language-save',guard(language=>{const result=settings.saveLanguage(language);background?.updatePresentation();downloadsFlyout.update();favoritesFlyout.update();tabbedBrowser?.refresh();for(const view of [...serviceViews.values(),...(tabbedBrowser?.views.values()||[])]){if(!view.webContents.isDestroyed())view.webContents.send('orbit:language-changed',language);}return result;}));
  ipcMain.handle('orbit:reminder-settings',event=>background?.trustedPopup(event)?settings.get():null);
  function presentation(){return {theme:nativeTheme.shouldUseDarkColors?'dark':'light',preference:settings.get().theme};}
  function refreshPresentation(){const data=presentation();if(mainWindow&&!mainWindow.isDestroyed())mainWindow.setTitleBarOverlay({color:data.theme==='dark'?'#202938':'#fafbf8',symbolColor:data.theme==='dark'?'#d4dfeb':'#617055',height:48});for(const wc of require('electron').webContents.getAllWebContents()){if(!wc.isDestroyed()&&wc.getURL().startsWith('orbit://app/'))wc.send('orbit:theme-changed',data);}}
  nativeTheme.on('updated',refreshPresentation);
  ipcMain.handle('orbit:theme-get',event=>event.senderFrame===event.sender.mainFrame&&event.senderFrame.url.startsWith('orbit://app/')?presentation():null);
  ipcMain.handle('orbit:preferences-save',guard(input=>{const result=settings.savePreferences(input);nativeTheme.themeSource=result.theme;background?.updatePresentation();background?.refreshRemote();downloadsFlyout.update();favoritesFlyout.update();tabbedBrowser?.refresh();for(const wc of require('electron').webContents.getAllWebContents())if(!wc.isDestroyed())wc.send('orbit:language-changed',result.language);refreshPresentation();return result;}));
  ipcMain.handle('orbit:profile-save',guard(input=>settings.saveProfile(input)));
  ipcMain.handle('orbit:avatar-pick',guard(async()=>{const result=await dialog.showOpenDialog(mainWindow,{title:settings.get().language==='en'?'Choose your avatar':'选择头像',properties:['openFile'],filters:[{name:settings.get().language==='en'?'Images':'图片',extensions:['png','jpg','jpeg','webp','bmp','gif']}]});if(result.canceled)return {ok:true,canceled:true};if(fs.statSync(result.filePaths[0]).size>20*1024*1024)throw Error(settings.get().language==='en'?'Choose an image smaller than 20 MB.':'请选择小于 20 MB 的图片。');let image=nativeImage.createFromPath(result.filePaths[0]);if(image.isEmpty())throw Error(settings.get().language==='en'?'Unable to read this image.':'无法读取此图片。');const size=image.getSize(),edge=Math.min(size.width,size.height);image=image.crop({x:Math.floor((size.width-edge)/2),y:Math.floor((size.height-edge)/2),width:edge,height:edge}).resize({width:256,height:256,quality:'best'});return {ok:true,avatar:image.toDataURL()};}));
  ipcMain.handle('orbit:update-check',guard(()=>updater.check()));
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
  ipcMain.handle('orbit:show-service',guard((id,bounds)=>{browser.show(null);if(id===null){tabbedBrowser.hide();return {ok:true};}return tabbedBrowser.show(bounds,id);}));
  ipcMain.handle('orbit:reload-service',guard(id=>tabbedBrowser.navigate(id,'reload')));
  ipcMain.handle('orbit:navigate-website',guard((id,action)=>tabbedBrowser.navigate(id,action)));
  ipcMain.handle('orbit:workspace-action',guard((mode,action,value)=>tabbedBrowser.navigate(mode,action,value)));
  createWindow();refreshPresentation();
  tabbedBrowser=createTabbedBrowser({favorites,onNotice:message=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.webContents.send('orbit:notice',message);},onPin:input=>{const existing=navigation.get().items.find(item=>item.url===input.url);const result=existing?{...navigation.get(),item:existing}:navigation.save(input);browser.configure(result.items);tabbedBrowser.configure(result.items);mainWindow.webContents.send('orbit:navigation-action',{action:'saved',result});return result;},workspaceItems:navigation.get().items,getLanguage:()=>settings.get().language,getWindow:()=>mainWindow,sessions:browserSessions,onState:state=>{downloadsFlyout.raise();favoritesFlyout.raise();if(!quitting&&mainWindow&&!mainWindow.isDestroyed()&&!mainWindow.webContents.isDestroyed())mainWindow.webContents.send('orbit:workspace-state',state);},onPage:page=>{if(!quitting&&mainWindow&&!mainWindow.isDestroyed()&&mainWindow.webContents&&!mainWindow.webContents.isDestroyed())mainWindow.webContents.send('orbit:open-page',page);}});
  const initialTargets=launchTargets(process.argv);
  let initialSelection;for(const target of initialTargets)initialSelection=tabbedBrowser.open(target,{reveal:!verify});
  if(initialSelection){const {width,height}=mainWindow.getContentBounds();tabbedBrowser.show({x:0,y:48,width,height:Math.max(1,height-48)},initialSelection.id);}
  mainWindow.webContents.once('did-finish-load',()=>{const id=initialSelection?.id||tabbedBrowser.current()?.workspace;if(id)mainWindow.webContents.send('orbit:open-page',{id});tabbedBrowser.warmUp();});
  for(const request of pendingLaunches.splice(0))receiveLaunch(request.argv,request.cwd);
  launchBridge=createLaunchBridge({app,onOpen:receiveLaunch});
  ipcMain.handle('orbit:pdf-open',guard(()=>tabbedBrowser.pick('pdf')));
  mainWindow.webContents.on('before-input-event',(event,input)=>{if(input.control&&input.key.toLowerCase()==='o'){event.preventDefault();tabbedBrowser.pick();}});
  background=createBackground({app,safeStorage,shell,google,getWindow:()=>mainWindow,getTimeZone:()=>settings.get().timeZone,getLanguage:()=>settings.get().language,openWebsite:async url=>{if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();return tabbedBrowser.open(url);},verify});background.start();
  if(localEvents.get().initialized)background.syncLocal(localEvents.get().events);
  localApi.start();
  app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow();});
});
function receiveLaunch(argv,cwd){if(!tabbedBrowser){if(pendingLaunches.length<64)pendingLaunches.push({argv,cwd});return;}if(!acceptLaunchRequest(argv))return;const targets=launchTargets(argv,cwd);for(const target of targets){try{tabbedBrowser.open(target);}catch(error){mainWindow?.webContents.send('orbit:notice',OrbitI18n.text(error.message,settings?.get().language));}}if(mainWindow&&!mainWindow.isDestroyed()){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}}
app.on('second-instance',(_event,argv,cwd)=>receiveLaunch(argv,cwd));
app.on('will-quit',()=>launchBridge?.dispose());
app.on('before-quit',event=>{
  quitting=true;
  if(quitFlushed)return;
  event.preventDefault();
  if(quitSaving)return;
  quitSaving=true;
  const shutdownError=error=>{try{fs.appendFileSync(path.join(app.getPath('userData'),'orbit-shutdown.log'),new Date().toISOString()+' '+(error?.stack||error)+'\n');}catch{}};
  // before-quit fires again after saving the sessions. Destroy each view once.
  for(const cleanup of [()=>favoritesFlyout?.dispose(),()=>downloadsFlyout?.dispose(),()=>tabbedBrowser?.dispose(),()=>background?.dispose(),()=>google?.dispose(),()=>localApi?.stop()])try{cleanup();}catch(error){shutdownError(error);}
  Promise.resolve().then(()=>browserSessions?.flush()).catch(shutdownError).finally(()=>{
    try{browserSessions?.dispose();browser?.dispose();}catch(error){shutdownError(error);}
    quitFlushed=true;app.quit();
  });
});
app.on('window-all-closed',()=>{if(quitting)app.quit();});

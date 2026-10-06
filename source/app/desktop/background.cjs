const {Tray,Menu,BrowserWindow,screen,powerMonitor}=require('electron');
const fs=require('node:fs');
const path=require('node:path');
const {ReminderEngine}=require('./reminders.cjs');
const {parseMeetingLink,zoomAppUrl}=require('./links.cjs');
const OrbitTime=require('../dist/timezone.js');
const OrbitI18n=require('../dist/i18n.js');
function createBackground({app,safeStorage,shell,google,getWindow,openWebsite,getTimeZone=()=> 'Asia/Shanghai',getLanguage=()=> 'zh',verify=false}){
 const t=value=>OrbitI18n.text(value,getLanguage());
 const filename=path.join(app.getPath('userData'),'reminder-state.enc');let state={};
 try{if(fs.existsSync(filename)&&safeStorage.isEncryptionAvailable())state=JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)));}catch{}
 function save(value){if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 日程存储加密不可用。');fs.mkdirSync(path.dirname(filename),{recursive:true});const temp=filename+'.tmp';fs.writeFileSync(temp,safeStorage.encryptString(JSON.stringify(value)));fs.renameSync(temp,filename);}
 let tray,reminderWindow,queue=[],timer,remoteTimer,refreshing=false,firstHide=true,disposed=false;
 let verificationReminderCount=0;
 function localDisplay(event){return event?{...event,date:OrbitTime.dateKey(event.startAt,getTimeZone()),time:OrbitTime.clock(event.startAt,getTimeZone())}:null;}
 const engine=new ReminderEngine({state,save,onReminder:async event=>{if(verify){verificationReminderCount++;return;}showReminder(event);}});
 function openWorkspace(){const window=getWindow();if(window&&!window.isDestroyed()){if(window.isMinimized())window.restore();window.show();window.focus();}}
 function updateTray(){if(!tray||tray.isDestroyed())return;const next=localDisplay(engine.next());tray.setToolTip((getLanguage()==='en'?'Orbit Workspace · Background reminders enabled':'Orbit Workspace · 后台日程提醒已开启')+(next?'\n下一项：'+next.title.slice(0,50)+' '+next.time:''));tray.setContextMenu(Menu.buildFromTemplate([{label:t('打开工作台'),click:openWorkspace},{type:'separator'},{label:t('日程开始前 5 分钟提醒'),enabled:false},...(next?[{label:(getLanguage()==='en'?'Next: ':'下一项：')+next.title.slice(0,35)+' · '+next.time,enabled:false}]:[]),{type:'separator'},{label:t('退出程序'),click:()=>app.quit()}]));}
 function showReminder(event){
  if(disposed)return;
  queue.push(localDisplay(event));
  if(reminderWindow&&!reminderWindow.isDestroyed()){reminderWindow.webContents.send('orbit:reminder-update');reminderWindow.showInactive();return;}
  const display=screen.getDisplayNearestPoint(screen.getCursorScreenPoint());const area=display.workArea;const width=Math.min(420,area.width-24),height=Math.min(340,area.height-24);
  reminderWindow=new BrowserWindow({width,height,x:area.x+area.width-width-16,y:area.y+area.height-height-16,frame:false,resizable:false,minimizable:false,maximizable:false,alwaysOnTop:true,skipTaskbar:true,show:false,backgroundColor:'#fff',webPreferences:{autoplayPolicy:'no-user-gesture-required',preload:path.join(__dirname,'reminder-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  reminderWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));reminderWindow.webContents.on('will-navigate',e=>e.preventDefault());
  reminderWindow.once('ready-to-show',()=>{if(reminderWindow&&!reminderWindow.isDestroyed())reminderWindow.showInactive();});
  reminderWindow.on('closed',()=>{reminderWindow=null;queue=[];});
  reminderWindow.loadURL('orbit://app/reminder.html');
 }
 async function tick(){try{await engine.tick();updateTray();}catch{} }
 async function refreshRemote(){if(refreshing||disposed)return;refreshing=true;try{const events=await google.getReminderEvents();if(!disposed){engine.updateRemote(events);await tick();}}catch{}finally{refreshing=false;}}
 function resume(){refreshRemote();tick();}
 function start(){tray=new Tray(path.join(__dirname,'assets/icon.ico'));tray.on('click',openWorkspace);tray.on('double-click',openWorkspace);updateTray();if(!verify){timer=setInterval(tick,15000);remoteTimer=setInterval(refreshRemote,300000);powerMonitor.on('resume',resume);refreshRemote();tick();}}
 function closeToTray(){getWindow()?.hide();}
 function syncLocal(events){if(disposed)return {ok:false};engine.updateLocal(events);tick();return {ok:true};}
 function trustedPopup(event){return reminderWindow&&!reminderWindow.isDestroyed()&&event.sender===reminderWindow.webContents&&event.senderFrame?.url==='orbit://app/reminder.html';}
 async function action(event,action,id){if(!trustedPopup(event))return {ok:false,error:'未经授权的窗口。'};if(action==='dismiss'){reminderWindow.close();return {ok:true};}if(action==='workspace'){openWorkspace();reminderWindow.close();return {ok:true};}const item=queue.find(e=>e.id===id);if(!item)return {ok:false,error:'未找到日程。'};if(action!=='zoom'&&action!=='zoom-browser')return {ok:false,error:'未知操作。'};const link=parseMeetingLink(item.zoomLink);if(!link)return {ok:false,error:'会议链接无效。'};const target=action==='zoom'?zoomAppUrl(link):link;if(!target)return {ok:false,error:'此链接请通过应用内加入。'};try{if(action==='zoom-browser'){openWorkspace();await openWebsite(target);reminderWindow?.close();}else await shell.openExternal(target);return {ok:true};}catch{return {ok:false,error:'未能打开 Zoom，请尝试浏览器加入。'};}}
 function dispose(){if(disposed)return;disposed=true;clearInterval(timer);clearInterval(remoteTimer);powerMonitor.removeListener('resume',resume);if(reminderWindow&&!reminderWindow.isDestroyed())reminderWindow.destroy();if(tray&&!tray.isDestroyed())tray.destroy();}
 return {updatePresentation:()=>{updateTray();if(reminderWindow&&!reminderWindow.isDestroyed())reminderWindow.webContents.send('orbit:reminder-update');},start,closeToTray,syncLocal,refreshRemote,clearRemote:()=>engine.updateRemote([]),dispose,action,trustedPopup,items:()=>queue,engine,verificationCount:()=>verificationReminderCount};
}
module.exports={createBackground};

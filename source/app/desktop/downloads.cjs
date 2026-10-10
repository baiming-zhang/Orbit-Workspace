'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function createDownloads({app,shell,dialog,Menu,getWindow=()=>undefined,getLanguage=()=> 'en',onChange=()=>{}}){
 const file=path.join(app.getPath('userData'),'downloads.json'),preferencesFile=path.join(app.getPath('userData'),'download-settings.json');
 let history=[],prefs={folder:app.getPath('downloads'),askBeforeDownload:false};const hooked=new WeakSet(),active=new Map(),locks=new Set();
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 try{history=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(history))history=[];history=history.slice(0,200).map(x=>({...x,fileBusy:false,state:['progressing','paused','awaiting-confirmation'].includes(x.state)?'interrupted':x.state}));}catch{}
 try{const value=JSON.parse(fs.readFileSync(preferencesFile,'utf8'));if(typeof value.folder==='string'&&path.isAbsolute(value.folder))prefs.folder=value.folder;prefs.askBeforeDownload=value.askBeforeDownload===true;}catch{}
 const list=()=>({ok:true,...prefs,items:history.map(x=>({...x})),active:active.size});
 function publish(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(history.slice(0,200),null,2));onChange(list());}
 function savePreferences(){fs.mkdirSync(path.dirname(preferencesFile),{recursive:true});fs.writeFileSync(preferencesFile,JSON.stringify(prefs,null,2));publish();}
 function uniquePath(folder,name){const ext=path.extname(name),stem=path.basename(name,ext);let dest=path.join(folder,name),i=1;while(fs.existsSync(dest)||history.some(row=>row.path===dest&&active.has(row.id)))dest=path.join(folder,stem+' ('+(i++)+')'+ext);return dest;}
 function validName(value){if(typeof value!=='string'||!value.trim()||value.length>255||value!==value.trim()||/[<>:"/\\|?*\u0000-\u001f]/.test(value)||/[. ]$/.test(value)||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value))throw Error(tr('Use a valid Windows filename.','请输入有效的 Windows 文件名。'));return value;}
 function attach(session){if(hooked.has(session))return;hooked.add(session);session.on('will-download',(event,item)=>{
  let name=path.basename(item.getFilename()).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').replace(/[. ]+$/,'')||'download';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name))name='_'+name;
  const row={id:crypto.randomUUID(),name,path:uniquePath(prefs.folder,name),source:item.getURL(),received:0,total:item.getTotalBytes(),state:prefs.askBeforeDownload?'awaiting-confirmation':'progressing',createdAt:new Date().toISOString()};row.name=path.basename(row.path);
  try{fs.mkdirSync(prefs.folder,{recursive:true});item.setSavePath(row.path);}catch(error){event.preventDefault();row.state='interrupted';row.error='folder-unavailable';history.unshift(row);publish();return;}
  history.unshift(row);history=history.slice(0,200);active.set(row.id,item);let last=0;
  item.on('updated',(_event,state)=>{row.received=item.getReceivedBytes();row.total=item.getTotalBytes();if(row.state!=='awaiting-confirmation')row.state=state==='interrupted'?'interrupted':item.isPaused()?'paused':'progressing';if(Date.now()-last>350){last=Date.now();publish();}});
  item.once('done',(_event,state)=>{row.state=state;row.received=item.getReceivedBytes();row.total=item.getTotalBytes();active.delete(row.id);publish();});
  if(prefs.askBeforeDownload)item.pause();publish();
 });}
 app.on('web-contents-created',(_event,wc)=>attach(wc.session));
 async function chooseFolder(){const result=await dialog.showOpenDialog(getWindow(),{title:tr('Choose default download folder','选择默认下载目录'),defaultPath:prefs.folder,properties:['openDirectory','createDirectory']});if(!result.canceled&&result.filePaths[0]){prefs.folder=result.filePaths[0];savePreferences();}return {ok:true,canceled:result.canceled};}
 function completeFile(row){if(row.state!=='completed'||!fs.existsSync(row.path))throw Error(tr('Download is not available.','下载文件不可用。'));if(!fs.lstatSync(row.path).isFile())throw Error(tr('This download is not a regular file.','此下载不是普通文件。'));}
 async function moveFile(row,dest){
  if(path.resolve(row.path)===path.resolve(dest))return;
  if(process.platform==='win32'&&path.resolve(row.path).toLowerCase()===path.resolve(dest).toLowerCase()){await fs.promises.rename(row.path,dest);row.path=dest;row.name=path.basename(dest);return;}
  if(fs.existsSync(dest))throw Error(tr('A file with this name already exists.','已存在同名文件。'));
  try{await fs.promises.rename(row.path,dest);}catch(error){if(error.code!=='EXDEV')throw error;await fs.promises.copyFile(row.path,dest,fs.constants.COPYFILE_EXCL);try{await fs.promises.unlink(row.path);}catch(error){await fs.promises.unlink(dest).catch(()=>{});throw error;}}
  row.path=dest;row.name=path.basename(dest);
 }
 async function action(id,action,value){
  if(action==='folder'){const error=await shell.openPath(prefs.folder);if(error)throw Error(error);return {ok:true};}
  if(action==='choose-folder')return chooseFolder();
  if(action==='toggle-confirmation'){prefs.askBeforeDownload=!prefs.askBeforeDownload;savePreferences();return {ok:true,askBeforeDownload:prefs.askBeforeDownload};}
  const row=history.find(x=>x.id===id);if(!row)throw Error(tr('Download not found.','找不到此下载。'));
  if(action==='show'){if(!fs.existsSync(row.path))throw Error(tr('File no longer exists.','文件已不存在。'));shell.showItemInFolder(row.path);return {ok:true};}
  if(action==='open'){completeFile(row);const error=await shell.openPath(row.path);if(error)throw Error(error);return {ok:true};}
  if(action==='cancel'){active.get(id)?.cancel();return {ok:true};}
  if(action==='keep'){const item=active.get(id);if(row.state!=='awaiting-confirmation'||!item)throw Error(tr('Download is no longer awaiting confirmation.','此下载已不再等待确认。'));row.state='progressing';item.resume();publish();return {ok:true};}
  if(!['rename','move'].includes(action))throw Error(tr('Unsupported download action.','不支持此下载操作。'));
  completeFile(row);if(locks.has(id))throw Error(tr('A file operation is already in progress.','此文件正在处理，请稍候。'));locks.add(id);row.fileBusy=true;publish();
  try{if(action==='rename')await moveFile(row,path.join(path.dirname(row.path),validName(value)));else {const result=await dialog.showOpenDialog(getWindow(),{title:tr('Move download to another folder','将下载文件移动到新目录'),defaultPath:path.dirname(row.path),properties:['openDirectory','createDirectory']});if(result.canceled||!result.filePaths[0])return {ok:true,canceled:true};await moveFile(row,path.join(result.filePaths[0],row.name));}return {ok:true,path:row.path,name:row.name};}finally{locks.delete(id);row.fileBusy=false;publish();}
 }
 function menu(){Menu.buildFromTemplate([{label:tr('Ask before downloading','下载前确认'),type:'checkbox',checked:prefs.askBeforeDownload,click:()=>action(null,'toggle-confirmation')},{label:tr('Change default download folder…','更改默认下载目录…'),click:()=>chooseFolder().catch(()=>{})}]).popup({window:getWindow()});return {ok:true};}
 return {list,action,menu};
}
module.exports={createDownloads};

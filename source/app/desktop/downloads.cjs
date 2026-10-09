'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function createDownloads({app,shell,onChange=()=>{}}){
 const file=path.join(app.getPath('userData'),'downloads.json');let history=[];const hooked=new WeakSet(),active=new Map();
 try{history=JSON.parse(fs.readFileSync(file,'utf8'));if(!Array.isArray(history))history=[];history=history.slice(0,200).map(x=>({...x,state:['progressing','paused'].includes(x.state)?'interrupted':x.state}));}catch{}
 const folder=app.getPath('downloads');
 const list=()=>({ok:true,folder,items:history.map(x=>({...x})),active:active.size});
 function publish(){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(history.slice(0,200),null,2));onChange(list());}
 function attach(session){if(hooked.has(session))return;hooked.add(session);session.on('will-download',(_event,item)=>{
  const name=path.basename(item.getFilename()).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_')||'download';const ext=path.extname(name),stem=path.basename(name,ext);let dest=path.join(folder,name),i=1;
  while(fs.existsSync(dest)||history.some(x=>x.path===dest&&x.state==='progressing'))dest=path.join(folder,stem+' ('+(i++)+')'+ext);
  item.setSavePath(dest);const row={id:crypto.randomUUID(),name,path:dest,received:0,total:item.getTotalBytes(),state:'progressing',createdAt:new Date().toISOString()};history.unshift(row);history=history.slice(0,200);active.set(row.id,item);publish();let last=0;
  item.on('updated',(_event,state)=>{row.received=item.getReceivedBytes();row.total=item.getTotalBytes();row.state=state==='interrupted'?'interrupted':item.isPaused()?'paused':'progressing';if(Date.now()-last>350){last=Date.now();publish();}});
  item.once('done',(_event,state)=>{row.state=state;row.received=item.getReceivedBytes();row.total=item.getTotalBytes();active.delete(row.id);publish();});
 });}
 app.on('web-contents-created',(_event,wc)=>attach(wc.session));
 async function action(id,action){if(action==='folder'){await shell.openPath(folder);return {ok:true};}const row=history.find(x=>x.id===id);if(!row)throw Error('Download not found.');if(action==='show'){if(!fs.existsSync(row.path))throw Error('File no longer exists.');shell.showItemInFolder(row.path);return {ok:true};}if(action==='open'){if(row.state!=='completed'||!fs.existsSync(row.path))throw Error('Download is not available.');const error=await shell.openPath(row.path);if(error)throw Error(error);return {ok:true};}if(action==='cancel'){active.get(id)?.cancel();return {ok:true};}throw Error('Unsupported download action.');}
 return {list,action};
}
module.exports={createDownloads};

const fs=require('node:fs');
const path=require('node:path');
function createBrowserSessions({app,safeStorage}){
 const filename=path.join(app.getPath('userData'),'browser-sessions.enc');
 let data={version:1,partitions:{},pages:{}},loadFailed=false,disposed=false,queue=Promise.resolve();
 const managed=new Map();
 try{if(fs.existsSync(filename))data=JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)));if(data.version!==1||!data.partitions||!data.pages)throw Error('Invalid browser session');}catch{loadFailed=fs.existsSync(filename);data={version:1,partitions:{},pages:{}};}
 function save(){if(loadFailed||!safeStorage.isEncryptionAvailable())return;fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',safeStorage.encryptString(JSON.stringify(data)));fs.renameSync(filename+'.tmp',filename);}
 function serialize(fn){queue=queue.then(fn).catch(()=>{});return queue;}
 function key(cookie){return [cookie.domain,cookie.path,cookie.name].join('\n');}
 function cookieDetails(cookie){const host=cookie.domain.replace(/^\./,'');return {url:(cookie.secure?'https://':'http://')+host+(cookie.path||'/'),name:cookie.name,value:cookie.value,path:cookie.path||'/',...(!cookie.hostOnly?{domain:cookie.domain}:{}),secure:cookie.secure,httpOnly:cookie.httpOnly,sameSite:cookie.sameSite};}
 function prepare(partition,session){
  if(managed.has(partition))return managed.get(partition).ready;
  const entry={session,timer:null,restoring:true};managed.set(partition,entry);
  entry.ready=(async()=>{
   const present=new Set((await session.cookies.get({})).map(key));
   for(const cookie of data.partitions[partition]||[]){if(!present.has(key(cookie)))try{await session.cookies.set(cookieDetails(cookie));}catch{}}
   entry.restoring=false;
  })().catch(()=>{entry.restoring=false;});
  entry.changed=()=>{if(disposed||entry.restoring)return;clearTimeout(entry.timer);entry.timer=setTimeout(()=>capture(partition,entry),500);entry.timer.unref?.();};
  session.cookies.on('changed',entry.changed);
  return entry.ready;
 }
 function capture(partition,entry){return serialize(async()=>{await entry.ready;data.partitions[partition]=await entry.session.cookies.get({session:true});entry.session.flushStorageData();await entry.session.cookies.flushStore();save();});}
 function remember(id,launchUrl,url){try{const base=new URL(launchUrl),page=new URL(url);if(base.origin!==page.origin||!['http:','https:'].includes(page.protocol)||page.username||page.password||/(?:^|\/)(?:login|signin|logout|signout|oauth|auth)(?:\/|$)/i.test(page.pathname)||[...page.searchParams.keys()].some(k=>/^(?:code|state|token|access_token|id_token|password)$/i.test(k)))return;if(id==='gmail'&&!page.pathname.startsWith('/mail/'))return;const previous=data.pages[id];if(previous?.url===page.href&&previous.launchUrl===base.href)return;data.pages[id]={launchUrl:base.href,url:page.href};serialize(save);}catch{}}
 function startUrl(id,launchUrl){const saved=data.pages[id];if(saved?.launchUrl===launchUrl)return saved.url;return launchUrl;}
 async function flush(){for(const [partition,entry] of managed){clearTimeout(entry.timer);await capture(partition,entry);}await queue;}
 function dispose(){disposed=true;for(const entry of managed.values()){clearTimeout(entry.timer);entry.session.cookies.removeListener('changed',entry.changed);}}
 return {prepare,remember,startUrl,flush,dispose};
}
module.exports={createBrowserSessions};

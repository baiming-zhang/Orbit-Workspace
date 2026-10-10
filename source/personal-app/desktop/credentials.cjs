const fs=require('node:fs');
const path=require('node:path');
const portals=require('../dist/shortcuts.js');
function portalForUrl(value){
 let url;try{url=new URL(value);}catch{return null;}
 if(url.protocol!=='https:'||url.username||url.password)return null;
 const portal=portals.find(p=>p.origin===url.origin);
 if(!portal)return {id:'site:'+url.origin,name:url.hostname,origin:url.origin};
 if(portal.id==='editorial'&&!/^\/submit2ijms\//i.test(url.pathname))return null;
 if(portal.id==='zju'&&!url.pathname.startsWith('/coremail/'))return null;
 return portal;
}
function createCredentials({app,safeStorage}){
 const filename=path.join(app.getPath('userData'),'website-credentials.enc');
 let state={remember:true,autoLogin:true,entries:{}};
 let loadFailed=false;
 if(fs.existsSync(filename)){try{
  if(!safeStorage.isEncryptionAvailable())throw Error('Encryption unavailable');
  const data=JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)));
  state={remember:data.remember!==false,autoLogin:data.autoLogin!==false,entries:data.entries||{},scopeVersion:Number(data.scopeVersion)||1};
 }catch{loadFailed=true;}}
 function save(){
  if(loadFailed)throw new Error('已保存的登录信息暂时无法解密，请先在登录记忆设置中清除后重新保存。');
  if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 加密不可用，本次密码未保存。');
  fs.mkdirSync(path.dirname(filename),{recursive:true});const tmp=filename+'.tmp';
  fs.writeFileSync(tmp,safeStorage.encryptString(JSON.stringify(state)));fs.renameSync(tmp,filename);
 }
 function read(url,username){
  const portal=portalForUrl(url);if(!portal||!state.remember||loadFailed||!safeStorage.isEncryptionAvailable())return null;
  const entry=state.entries[portal.id];if(!entry)return null;
  const accounts=entry.accounts||[{username:entry.username,password:entry.password}];
  const selected=username?accounts.find(a=>a.username.toLowerCase()===String(username).trim().toLowerCase()):accounts.find(a=>a.username===entry.username)||accounts[0];
  return selected?{username:selected.username,password:selected.password,autoLogin:state.autoLogin,accounts:accounts.map(a=>a.username)}:null;
 }
 function remember(url,input){
  const portal=portalForUrl(url);if(!portal||!state.remember)return {ok:false};
  if(typeof input?.username!=='string'||typeof input?.password!=='string'||!input.username.trim()||!input.password||input.username.length>1024||input.password.length>4096)return {ok:false};
  const previous=state.entries[portal.id],accounts=(previous?.accounts||(previous?[{username:previous.username,password:previous.password}]:[])).filter(a=>a.username.toLowerCase()!==input.username.trim().toLowerCase());
  accounts.push({username:input.username.trim(),password:input.password});
  const entry={username:input.username.trim(),password:input.password,origin:portal.origin,name:portal.name,accounts:accounts.slice(-20)};
  if(state.entries[portal.id]?.username===entry.username&&state.entries[portal.id]?.password===entry.password)return {ok:true};
  state.entries[portal.id]=entry;
  try{save();return {ok:true};}catch(error){if(previous)state.entries[portal.id]=previous;else delete state.entries[portal.id];throw error;}
 }
 function status(){const custom=Object.entries(state.entries).filter(([id])=>id.startsWith('site:')).map(([id,e])=>({id,name:e.name||id.slice(5),saved:true,username:e.username||''}));return {remember:state.remember,autoLogin:state.autoLogin,encryptionAvailable:safeStorage.isEncryptionAvailable(),loadFailed,sites:[...portals.map(p=>({id:p.id,name:p.name,saved:!!state.entries[p.id],username:state.entries[p.id]?.username||''})),...custom]};}
 function configure(input){const previous={remember:state.remember,autoLogin:state.autoLogin};state.remember=input?.remember!==false;state.autoLogin=input?.autoLogin!==false;try{save();}catch(error){Object.assign(state,previous);throw error;}return {ok:true};}
 function forget(id){if(id==='all'){state.entries={};loadFailed=false;}else if(portals.some(p=>p.id===id)||Object.hasOwn(state.entries,id))delete state.entries[id];else throw new Error('未知网站。');save();return {ok:true};}
 // Enable the user's expanded login-memory request once; later preferences remain editable.
 if(!loadFailed&&state.scopeVersion!==2&&safeStorage.isEncryptionAvailable()){state.remember=true;state.autoLogin=true;state.scopeVersion=2;try{save();}catch{}}
 return {read,remember,status,configure,forget};
}
module.exports={portalForUrl,createCredentials};

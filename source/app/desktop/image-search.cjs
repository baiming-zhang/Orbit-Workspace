const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const googlePage=wc=>{try{const u=new URL(wc.getURL());return u.protocol==='https:'&&(u.hostname==='google.com'||u.hostname.endsWith('.google.com'));}catch{return false;}};
async function prepareImageSearch(wc,bytes,{getLanguage=()=> 'en',onStatus=()=>{},timeout=20000}={}){
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en,deadline=Date.now()+timeout;let file,ownDebugger=false;
 try{
  onStatus(tr('Preparing Google image search…','正在准备 Google 图片搜索…'));let ready=false;
  while(!wc.isDestroyed()&&Date.now()<deadline){if(googlePage(wc)){ready=await wc.executeJavaScript(`(()=>{const input=[...document.querySelectorAll('input[type="file"]')].find(e=>!e.disabled&&/image/i.test(e.accept));if(input){input.setAttribute('data-orbit-image-search','true');return true;}const button=[...document.querySelectorAll('button,[role="button"]')].find(e=>e.getClientRects().length&&/search by image|google lens|按图片搜索|以图搜图|使用图片搜索/i.test((e.getAttribute('aria-label')||'')+' '+(e.title||'')+' '+e.textContent));button?.click();return false;})()`,true).catch(()=>false);if(ready)break;}await wait(200);}
  if(!ready||wc.isDestroyed()||!googlePage(wc))throw Error(tr('Google image search is unavailable. Try again.','Google 图片搜索暂不可用，请重试。'));
  const directory=path.join(app.getPath('userData'),'selection-search-cache');fs.mkdirSync(directory,{recursive:true});file=path.join(directory,'Orbit-image-'+crypto.randomUUID()+'.png');fs.writeFileSync(file,bytes);
  if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');ownDebugger=true;}const {root}=await wc.debugger.sendCommand('DOM.getDocument'),{nodeId}=await wc.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'input[data-orbit-image-search="true"]'});if(!nodeId)throw Error(tr('Google image search changed. Try again.','Google 图片搜索界面已变化，请重试。'));await wc.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[file]});await wait(500);return {ok:true};
 }catch(error){onStatus(error.message);return {ok:false,error:error.message};}finally{if(ownDebugger&&!wc.isDestroyed()&&wc.debugger.isAttached())wc.debugger.detach();if(file)fs.rmSync(file,{force:true});}
}
module.exports={prepareImageSearch};

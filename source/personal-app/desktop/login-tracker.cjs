function createLoginTracker(credentials){
 const pending=new Map(),users=new Map(),tracked=new WeakSet();
 function track(wc){if(tracked.has(wc))return;tracked.add(wc);const id=wc.id;
  wc.on('did-finish-load',()=>confirm(wc));
  wc.on('did-navigate-in-page',()=>confirm(wc));
  wc.on('destroyed',()=>{pending.delete(id);users.delete(id);});
 }
 function username(wc,url,value){track(wc);if(typeof value==='string'&&value.trim()&&value.length<=1024)users.set(wc.id,{origin:new URL(url).origin,value:value.trim()});return {ok:true};}
 function read(wc,url,value){const saved=users.get(wc.id);return credentials.read(url,value||(saved?.origin===new URL(url).origin?saved.value:undefined));}
 function stage(wc,url,input){track(wc);if(typeof input?.username!=='string'||typeof input?.password!=='string'||!input.username.trim()||!input.password||input.username.length>1024||input.password.length>4096)return {ok:false};pending.set(wc.id,{url,input:{username:input.username.trim(),password:input.password},at:Date.now()});setTimeout(()=>confirm(wc),1800).unref?.();return {ok:true};}
 async function confirm(wc){if(wc.isDestroyed())return;const p=pending.get(wc.id);if(!p)return;if(Date.now()-p.at>120000){pending.delete(wc.id);return;}let now;try{now=new URL(wc.getURL());if(now.origin!==new URL(p.url).origin)return;const result=await wc.executeJavaScript(`(()=>{const visible=x=>x.getClientRects().length>0&&getComputedStyle(x).visibility!=='hidden';const passwords=[...document.querySelectorAll('input[type=password]')].some(visible);const error=[...document.querySelectorAll('[role=alert],.error,.alert-danger,#warnOrErrDiv')].some(x=>visible(x)&&x.textContent.trim());const signedIn=[...document.querySelectorAll('a,button')].some(x=>visible(x)&&/^(logout|log out|sign out|退出|退出登录)$/i.test(x.textContent.trim()));return {passwords,error,signedIn};})()`);
   const changed=now.href!==p.url&&!/(?:login|signin|sign-in|auth|error|register|reset|password)/i.test(now.pathname);
   if(!result.error&&!result.passwords&&(result.signedIn||changed)&&pending.get(wc.id)===p){credentials.remember(p.url,p.input);pending.delete(wc.id);}
  }catch{}
 }
 return {username,read,stage,confirm};
}
module.exports={createLoginTracker};

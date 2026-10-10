const {ipcRenderer}=require('electron');
// Ordinary web links open another tab in their originating Orbit workspace.
function openWorkspaceLink(event){
 if(!event.isTrusted||event.defaultPrevented||event.type==='click'&&event.button!==0||event.type==='auxclick'&&event.button!==1)return;
 const anchor=event.composedPath().find(node=>node?.matches?.('a[href]'))||event.target.closest?.('a[href]');if(!anchor)return;
 const raw=anchor.getAttribute('href')?.trim();if(!raw||raw.startsWith('#'))return;
 let url;try{url=new URL(anchor.href,location.href);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)return;const here=new URL(location.href);if(url.origin===here.origin&&url.pathname===here.pathname&&url.search===here.search)return;}catch{return;}
 event.preventDefault();ipcRenderer.invoke('orbit:link-open',url.href,{download:anchor.hasAttribute('download')}).catch(()=>{});
}
document.addEventListener('click',openWorkspaceLink,true);
document.addEventListener('auxclick',openWorkspaceLink,true);

// This bridge stays in the isolated world and accepts only same-origin forms.
if(location.protocol==='https:'){
 const watched=new WeakSet(),filled=new WeakMap();let busy=false,lastUser='',attempted=false,entryCache=null,lastRead=0,manualPassword=false;
 const visible=el=>el&&!el.disabled&&el.getClientRects().length>0&&el.ownerDocument.defaultView.getComputedStyle(el).visibility!=='hidden';
 function documents(){const docs=[document];for(let i=0;i<docs.length&&i<12;i++)for(const f of docs[i].querySelectorAll('iframe,frame'))try{if(f.contentDocument&&f.contentDocument.location.origin===location.origin)docs.push(f.contentDocument);}catch{}return docs;}
 function fields(doc){
  const passwords=[...doc.querySelectorAll('input[type=password]')].filter(visible);
  if(passwords.length>1||passwords.some(p=>p.autocomplete==='new-password'))return null;
  const password=passwords[0],root=password?.form||doc;
  const names=[...root.querySelectorAll('input')].filter(x=>visible(x)&&['text','email','tel'].includes(x.type)&&!/(captcha|verify|verification|otp|code|search|验证码|动态码)/i.test([x.name,x.id,x.placeholder,x.autocomplete].join(' ')));
  const username=names.find(x=>x.autocomplete==='username')||names.find(x=>/(user|email|account|login|uid|用户名|邮箱|账号)/i.test([x.name,x.id,x.placeholder].join(' ')))||(password?names[0]:null);
  const form=password?.form||username?.form;
  if(form?.action&&new URL(form.action,doc.location.href).origin!==location.origin)return null;
  const buttons=[...root.querySelectorAll('button,input[type=submit],input[type=button],a')];
  const button=buttons.find(x=>visible(x)&&/^(?:log\s*in|sign\s*in|登录|登\s*录|author login|login as author|continue|next|下一步|继续)$/i.test((x.innerText||x.value||'').trim()))||buttons.find(x=>visible(x)&&x.type==='submit');
  if(!password&&!username)return null;return {username,password,form,button,doc};
 }
 function value(el,value){if(!el)return;const win=el.ownerDocument.defaultView;Object.getOwnPropertyDescriptor(win.HTMLInputElement.prototype,'value')?.set?.call(el,value);el.dispatchEvent(new win.Event('input',{bubbles:true}));el.dispatchEvent(new win.Event('change',{bubbles:true}));}
 function challenge(f){const doc=f.doc;return [...doc.querySelectorAll('input')].some(x=>visible(x)&&/(captcha|verify|otp|one-time-code|验证码|动态码)/i.test([x.name,x.id,x.placeholder,x.autocomplete].join(' ')))||[...doc.querySelectorAll('iframe')].some(x=>visible(x)&&/recaptcha|hcaptcha|challenge/i.test(x.src))||[...doc.querySelectorAll('[role=alert],.error,.alert-danger,#warnOrErrDiv')].some(x=>visible(x)&&x.textContent.trim());}
 function capture(doc){const f=fields(doc);if(!f)return;const username=f.username?.value.trim()||lastUser;if(username){lastUser=username;ipcRenderer.invoke('orbit:website-username',username).catch(()=>{});}if(f.password?.value&&username&&!challenge(f))ipcRenderer.invoke('orbit:website-stage',{username,password:f.password.value}).catch(()=>{});}
 function watch(doc){if(watched.has(doc))return;watched.add(doc);doc.addEventListener('input',e=>{if(!e.isTrusted)return;if(e.target.type==='password')manualPassword=true;else if(/user|email|account/i.test([e.target.name,e.target.id,e.target.autocomplete].join(' '))){lastUser=e.target.value.trim();entryCache=null;lastRead=0;manualPassword=false;}},true);doc.addEventListener('submit',()=>capture(doc),true);doc.addEventListener('click',e=>{const f=fields(doc);if(f?.button&&(e.target===f.button||f.button.contains(e.target)))capture(doc);},true);doc.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches?.('input'))capture(doc);},true);}
 async function read(username){if(!entryCache||Date.now()-lastRead>10000||username&&entryCache.username.toLowerCase()!==username.toLowerCase()){entryCache=await ipcRenderer.invoke('orbit:website-read',username||undefined);lastRead=Date.now();}return entryCache;}
 function choices(f,entry){if(!f.username||entry.accounts?.length<2||f.doc.querySelector('#orbit-saved-accounts'))return;const select=f.doc.createElement('select');select.id='orbit-saved-accounts';select.setAttribute('aria-label','Orbit 已保存账号');select.style.cssText='font:12px system-ui;max-width:100%;margin:6px 0;padding:5px;border:1px solid #cbd5e1;border-radius:5px;color:#334155;background:white';const first=f.doc.createElement('option');first.textContent='Orbit：选择已保存账号';first.value='';select.append(first);for(const username of entry.accounts){const o=f.doc.createElement('option');o.value=username;o.textContent=username;select.append(o);}select.onchange=async()=>{if(!select.value)return;const chosen=await read(select.value);if(chosen){lastUser=chosen.username;value(f.username,chosen.username);value(f.password,chosen.password);if(f.password)filled.set(f.password,chosen.username);manualPassword=false;}};f.username.insertAdjacentElement('afterend',select);}
 async function tick(){if(busy||!document.documentElement)return;busy=true;try{for(const doc of documents()){
  watch(doc);const f=fields(doc);if(!f)continue;const username=f.username?.value.trim()||lastUser,entry=await read(username);if(!entry)continue;choices(f,entry);
  if(f.username&&!f.username.value){value(f.username,entry.username);lastUser=entry.username;}
  if(!f.password||manualPassword)continue;
  const wanted=f.username?.value.trim()||lastUser||entry.username;if(wanted.toLowerCase()!==entry.username.toLowerCase())continue;
  if(f.password.value&&filled.get(f.password)!==wanted)continue;
  if(filled.get(f.password)===wanted)continue;value(f.password,entry.password);filled.set(f.password,wanted);
  if(entry.autoLogin&&!attempted&&f.button&&!challenge(f))setTimeout(async()=>{if(attempted||manualPassword||!visible(f.password)||challenge(f))return;const permission=await ipcRenderer.invoke('orbit:website-attempt');if(permission.ok){attempted=true;capture(doc);f.button.click();}},800);
 }}catch{}finally{busy=false;}}
 window.addEventListener('DOMContentLoaded',()=>{tick();let queued=false;new MutationObserver(()=>{if(!queued){queued=true;setTimeout(()=>{queued=false;tick();},250);}}).observe(document.documentElement,{childList:true,subtree:true});});window.addEventListener('load',tick);setInterval(tick,1500);
}

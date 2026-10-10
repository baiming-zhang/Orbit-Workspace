'use strict';
const {app}=require('electron'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {isChatGpt,revealFileInput}=require('./pdf-chat-upload.cjs');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),queues=new WeakMap();
function prepareChatSelection(wc,content,{getLanguage=()=> 'en',onStatus=()=>{},timeout=45000,beforeImage}={}){
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 const task=(queues.get(wc)||Promise.resolve()).catch(()=>{}).then(async()=>{
  const alive=()=>!wc.isDestroyed(),deadline=Date.now()+timeout;let editor=false;
  onStatus(tr('Preparing ChatGPT…','正在准备 ChatGPT…'));
  while(alive()&&Date.now()<deadline){
   if(isChatGpt(wc.getURL())){const state=await wc.executeJavaScript(`(()=>{const e=document.querySelector('#prompt-textarea,[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]');const visible=e&&e.getClientRects().length>0;return {editor:!!visible,login:!visible&&[...document.querySelectorAll('a,button')].some(b=>b.getClientRects().length&&/^(log in|sign in|登录|登入)$/i.test(b.innerText.trim()))};})()`).catch(()=>null);if(state?.login)throw Error(tr('Sign in to ChatGPT, then choose Ask again.','请登录 ChatGPT，然后再次选择询问。'));if(state?.editor){editor=true;break;}}
   await wait(250);
  }
  if(!alive())return {ok:false};if(!editor)throw Error(tr('ChatGPT input is not ready. Sign in and try again.','ChatGPT 输入框尚未就绪，请登录后重试。'));
  let file=null,attachedHere=false,intercepting=false;
  try{
   if(content.kind==='image'){
    if(beforeImage)await beforeImage;if(!alive()||!isChatGpt(wc.getURL()))return {ok:false};
    const directory=path.join(app.getPath('userData'),'selection-chat-cache');fs.mkdirSync(directory,{recursive:true});file=path.join(directory,'Orbit-selection-'+crypto.randomUUID()+'.png');fs.writeFileSync(file,content.bytes);
    const probe=()=>wc.executeJavaScript(`(()=>{const e=document.querySelector('#prompt-textarea,[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]');const scope=e?.closest('form')||e?.parentElement?.parentElement;const inputs=[...document.querySelectorAll('input[type="file"]')].filter(e=>!e.disabled&&(!e.accept||(/image|png/i.test(e.accept)||e.accept.includes('*'))));const input=inputs.find(e=>scope?.contains(e))||inputs[0];if(input)input.setAttribute('data-orbit-selection-upload','true');return {input:!!input,text:scope?.innerText||'',busy:!!scope?.querySelector('[role="progressbar"],[aria-busy="true"]')};})()`);
    if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');attachedHere=true;}
    const uploadDeadline=Date.now()+15000;let found=await probe();
    while(!found.input&&alive()&&Date.now()<uploadDeadline){if(!intercepting){await wc.debugger.sendCommand('Page.setInterceptFileChooserDialog',{enabled:true});intercepting=true;}await revealFileInput(wc);await wait(300);found=await probe();}
    if(!found.input)throw Error(tr('ChatGPT image attachment control is unavailable. Try again.','ChatGPT 图片附件控件不可用，请重试。'));
    const {root}=await wc.debugger.sendCommand('DOM.getDocument');const {nodeId}=await wc.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'input[data-orbit-selection-upload="true"]'});if(!nodeId)throw Error(tr('ChatGPT attachment control changed. Try again.','ChatGPT 附件控件已改变，请重试。'));
    await wc.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[file]});const acknowledgedUntil=Date.now()+30000;let acknowledged=false;
    while(alive()&&Date.now()<acknowledgedUntil){const state=await probe();if(state.text.includes(path.basename(file))&&!state.busy){acknowledged=true;break;}await wait(250);}
    if(!acknowledged)throw Error(tr('Image attachment is not yet confirmed. Check ChatGPT and retry.','图片附件尚未确认，请检查 ChatGPT 后重试。'));
   }
   const prompt=content.kind==='text'?tr('Please help me understand the following selected text:\n\n','请帮我理解以下选中的文字：\n\n')+content.text:tr('Please help me understand the attached image.','请帮我理解附上的图片。');
   const source=content.sourceUrl?'\n\n'+tr('Source: ','来源：')+content.sourceUrl:'';
   if(!alive()||!isChatGpt(wc.getURL()))return {ok:false};
   const result=await wc.executeJavaScript(`(()=>{const e=document.querySelector('#prompt-textarea,[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]');if(!e)return false;const existing=(e.value??e.innerText??'');const insert=(existing.trim()?'\\n\\n':'')+${JSON.stringify(prompt+source)};e.focus();if(e.matches('textarea,input')){const setter=Object.getOwnPropertyDescriptor(e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set;setter.call(e,existing+insert);e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:insert}));}else{const range=document.createRange();range.selectNodeContents(e);range.collapse(false);const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);if(!document.execCommand('insertText',false,insert)){range.insertNode(document.createTextNode(insert));e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:insert}));}}const clean=s=>s.replace(/\\s/g,'');return clean(e.value??e.innerText??'').includes(clean(${JSON.stringify(prompt)}));})()`,true);
   if(!result)throw Error(tr('Unable to fill the ChatGPT draft. Try again.','无法填入 ChatGPT 草稿，请重试。'));
   onStatus(tr('Selection added to ChatGPT. Review and send when ready.','所选内容已加入 ChatGPT，请确认后发送。'));return {ok:true};
  }finally{
   if(alive()&&intercepting)await wc.debugger.sendCommand('Page.setInterceptFileChooserDialog',{enabled:false}).catch(()=>{});
   if(alive()&&attachedHere&&wc.debugger.isAttached())wc.debugger.detach();
   if(file)fs.rmSync(file,{force:true});
  }
 }).catch(error=>{onStatus(error.message);return {ok:false,error:error.message};});queues.set(wc,task);return task;
}
module.exports={prepareChatSelection};

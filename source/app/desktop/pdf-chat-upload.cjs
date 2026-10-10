const {app}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fileURLToPath}=require('node:url');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function isChatGpt(url){try{const u=new URL(url);return u.protocol==='https:'&&u.hostname==='chatgpt.com';}catch{return false;}}
const inspectScript=String.raw`(()=>{
 const visible=e=>!!e&&e.getClientRects().length>0;
 const editor=document.querySelector('#prompt-textarea,[data-testid="composer-text-input"],[contenteditable="true"][role="textbox"]');
 const scope=editor?.closest('form')||editor?.closest('[data-type="unified-composer"]')||editor?.parentElement?.parentElement?.parentElement;
 const inputs=[...document.querySelectorAll('input[type="file"]')].filter(e=>!e.disabled&&(!e.accept||/pdf|application\/|\*/i.test(e.accept)));
 const input=inputs.find(e=>scope?.contains(e))||inputs.find(e=>!e.accept||/pdf|application\/|\*/i.test(e.accept))||inputs[0];
 if(input)input.setAttribute('data-orbit-pdf-upload','true');
 const errors=[...document.querySelectorAll('[role="alert"],[data-sonner-toast]')].filter(visible).map(e=>e.innerText).filter(t=>/upload|file|上传|文件|quota|limit|限制|上限|failed|失败/i.test(t));
 return {editor:visible(editor),input:!!input,href:location.href,text:scope?.innerText||'',errors,login:!visible(editor)&&[...document.querySelectorAll('button,a')].some(e=>visible(e)&&/^(log in|sign in|登录|登入)$/i.test(e.innerText.trim())),busy:!!scope?.querySelector('[role="progressbar"],[aria-busy="true"]')};
})()`;
async function revealFileInput(wc){
 // Use the site's file picker UI; never manufacture an unbound input element.
 return wc.executeJavaScript(`(()=>{
  const visible=e=>e.getClientRects().length>0;
  const menu=[...document.querySelectorAll('[role="menuitem"],button')].find(e=>visible(e)&&/^(add photos (?:and|&) files|upload (?:a )?file(?:s)?|添加照片和文件|添加照片与文件|上传文件|添加文件)$/i.test(e.innerText.trim()));
  if(menu){menu.click();return 'file-menu';}
  const plus=document.querySelector('#composer-plus-btn,[data-testid="composer-plus-btn"]')||[...document.querySelectorAll('button')].find(e=>visible(e)&&/^(add files and more|add attachments|attach files|添加文件和更多内容|添加文件及更多|添加附件)$/i.test(e.getAttribute('aria-label')||''));
  if(plus){plus.click();return 'plus';}return null;
 })()`,true);
}
async function localPdf(t){
 let filename;
 if(t.url.startsWith('file:'))filename=fileURLToPath(t.url);
 else{
  const u=new URL(t.url);if(!['https:','http:'].includes(u.protocol))throw Error('This PDF address cannot be uploaded.');
  const directory=path.join(app.getPath('userData'),'pdf-upload-cache',crypto.createHash('sha256').update(t.url).digest('hex').slice(0,16));fs.mkdirSync(directory,{recursive:true});
  const name=path.basename(decodeURIComponent(u.pathname))||'document.pdf';
  filename=path.join(directory,name.toLowerCase().endsWith('.pdf')?name:'document.pdf');
  const response=await t.view.webContents.session.fetch(t.url);
  if(!response.ok)throw Error('Unable to read this PDF. Download and open it locally.');
  const data=Buffer.from(await response.arrayBuffer());
  if(data.subarray(0,1024).indexOf('%PDF-')<0)throw Error('This URL did not return a PDF.');
  fs.writeFileSync(filename,data);
 }
 const stat=fs.statSync(filename);if(!stat.isFile()||!stat.size)throw Error('The PDF file was not found.');
 return {filename,name:path.basename(filename),key:[t.url,stat.size,stat.mtimeMs].join('|')};
}
function createPdfChatUpload({publish,timeout=45000}){
 async function attach(t,{force=false}={}){
  if(!t.pdf||!t.chatVisible||!t.chat||t.chat.webContents.isDestroyed())return;
  if(t.uploadTask)return t.uploadTask;
  const wc=t.chat.webContents,requestedUrl=t.url;
  const active=()=>!wc.isDestroyed()&&t.url===requestedUrl&&t.chatVisible;
  const status=(state,text)=>{t.upload={state,text};publish();};
  t.uploadTask=(async()=>{
   let attachedHere=false,intercepting=false;
   try{
    status('loading','Attaching PDF…');
    const pdf=await localPdf(t);if(!active())return;
    const deadline=Date.now()+timeout;let probe;
    while(Date.now()<deadline&&active()){
     if(!isChatGpt(wc.getURL())){await wait(300);continue;}
     probe=await wc.executeJavaScript(inspectScript).catch(()=>null);
     if(probe?.login)throw Error('Sign in to ChatGPT on the right, then retry.');
     if(probe?.editor){
      if(!force&&t.uploaded?.key===pdf.key&&t.uploaded.href===probe.href&&probe.text.includes(pdf.name)&&!probe.busy){status('attached','PDF attached');return;}
      if(probe.input)break;
      if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');attachedHere=true;}
      if(!intercepting){await wc.debugger.sendCommand('Page.setInterceptFileChooserDialog',{enabled:true});intercepting=true;}
      await revealFileInput(wc);
     }
     await wait(450);
    }
    if(!active())return;
    if(!probe?.input||!probe.editor)throw Error('ChatGPT attachment control not found. Retry.');
    if(!isChatGpt(wc.getURL()))throw Error('Return to ChatGPT and retry.');
    if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');attachedHere=true;}
    const {root}=await wc.debugger.sendCommand('DOM.getDocument');
    const {nodeId}=await wc.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'input[data-orbit-pdf-upload="true"]'});
    if(!nodeId)throw Error('The attachment control changed. Retry.');
    if(!active()||!isChatGpt(wc.getURL()))return;
    if(force)await wc.executeJavaScript(`document.querySelector('input[data-orbit-pdf-upload="true"]').value=''`);
    await wc.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:[pdf.filename]});
    // The native change event starts the ordinary ChatGPT upload. Wait until its
    // composer actually acknowledges the file, rather than reporting CDP success.
    const acknowledgeUntil=Date.now()+30000;
    while(Date.now()<acknowledgeUntil&&active()){
     const check=await wc.executeJavaScript(inspectScript);
     if(check.errors.length)throw Error(check.errors[0].slice(0,180));
     if(check.text.includes(pdf.name)&&!check.busy){t.uploaded={key:pdf.key,href:check.href};status('attached','PDF attached');return;}
     await wait(350);
    }
    if(active())throw Error('PDF attachment not yet confirmed. Check the attachment or retry.');
   }catch(error){if(active())status('error',error.message||'Unable to attach the PDF. Retry.');}
   finally{
    if(!wc.isDestroyed()&&intercepting)await wc.debugger.sendCommand('Page.setInterceptFileChooserDialog',{enabled:false}).catch(()=>{});
    if(!wc.isDestroyed()&&attachedHere&&wc.debugger.isAttached())wc.debugger.detach();
   }
  })().finally(()=>{t.uploadTask=null;if(!active()&&t.upload?.state==='loading'){t.upload=null;publish();}if(t.url!==requestedUrl&&t.pdf&&t.chatVisible&&t.view&&!t.view.webContents.isDestroyed())queueMicrotask(()=>attach(t));});
  return t.uploadTask;
 }
 return {attach};
}
module.exports={createPdfChatUpload,isChatGpt,localPdf,revealFileInput};

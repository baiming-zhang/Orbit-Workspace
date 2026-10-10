const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

// This module offers fixed operations, never caller-supplied JavaScript.
const limits={textBytes:200*1024,fileCount:10,fileBytes:25*1024*1024,totalFileBytes:100*1024*1024};
const queues=new WeakMap();
function fault(code,message,statusCode=422){return Object.assign(new Error(message),{code,statusCode});}
function hash(text){return crypto.createHash('sha256').update(text,'utf8').digest('hex');}
function canonicalUrl(value){try{const url=new URL(value);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw Error();return url.href;}catch{throw fault('INVALID_URL','需要完整的 HTTP 或 HTTPS 网页地址。',400);}}
function target(wc,input){if(!wc||wc.isDestroyed())throw fault('PAGE_NOT_FOUND','网页已关闭。',404);const expected=canonicalUrl(input?.expectedUrl);if(wc.getURL()!==expected)throw fault('PAGE_CHANGED','网页地址已变化，请重新读取后操作。',409);return expected;}
function selector(input,required=false){const value=input?.selector;if(value===undefined&&!required)return null;if(typeof value!=='string'||!value.trim()||value.length>1024)throw fault('INVALID_SELECTOR','请选择唯一的网页控件。',400);return value;}
async function serial(wc,work){const prior=queues.get(wc)||Promise.resolve();const pending=prior.catch(()=>{}).then(work);queues.set(wc,pending);try{return await pending;}finally{if(queues.get(wc)===pending)queues.delete(wc);}}

// CodeMirror renders only the viewport. Read its complete document and use its
// transaction API; replacing .cm-content would silently lose offscreen lines.
function editorOperation(request){
 const fail=(code,message)=>({ok:false,code,error:message});
 if(location.href!==request.expectedUrl)return fail('PAGE_CHANGED','网页地址已变化。');
 const visible=element=>!!element?.isConnected&&element.getClientRects().length>0&&element.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})!==false;
 function adapter(element){
  const cmRoot=element.matches('.cm-editor')?element:element.closest('.cm-editor');
  if(cmRoot){
   const content=cmRoot.querySelector('.cm-content');
   const bound=content?.cmView?.rootView?.view;
   const view=bound?.constructor?.findFromDOM?.(cmRoot)||bound;
   if(!view||view.dom!==cmRoot||typeof view.dispatch!=='function'||!view.state?.doc)return null;
   return {element:cmRoot,type:'codemirror6',label:content?.getAttribute('aria-label')||cmRoot.getAttribute('aria-label')||'',read:()=>view.state.doc.toString(),editable:()=>!view.state.readOnly&&content?.getAttribute('contenteditable')!=='false',write:text=>view.dispatch({changes:{from:0,to:view.state.doc.length,insert:text},userEvent:'input.orbit'})};
  }
  const cm5Root=element.matches('.CodeMirror')?element:element.closest('.CodeMirror');
  if(cm5Root){const view=cm5Root.CodeMirror;if(!view||typeof view.getValue!=='function'||typeof view.setValue!=='function')return null;return {element:cm5Root,type:'codemirror5',label:cm5Root.getAttribute('aria-label')||'',read:()=>view.getValue(),editable:()=>!view.getOption('readOnly'),write:text=>view.setValue(text)};}
  const monacoRoot=element.matches('.monaco-editor')?element:element.closest('.monaco-editor');
  if(monacoRoot){
   const editors=window.monaco?.editor?.getEditors?.()||[];
   const view=editors.find(item=>item.getDomNode()===monacoRoot),model=view?.getModel();
   if(!model||typeof view.executeEdits!=='function')return null;
   return {element:monacoRoot,type:'monaco',label:monacoRoot.getAttribute('aria-label')||'',read:()=>model.getValue(),editable:()=>monacoRoot.querySelector('textarea')?.getAttribute('readonly')===null,write:text=>{view.pushUndoStop();if(!view.executeEdits('orbit',[{range:model.getFullModelRange(),text,forceMoveMarkers:true}]))throw Error('编辑器拒绝写入。');view.pushUndoStop();}};
  }
  const textInput=element.tagName==='INPUT'&&['text','search','url','email','tel'].includes(element.type);
  if(element.tagName==='TEXTAREA'||textInput){
   const prototype=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;
   const set=Object.getOwnPropertyDescriptor(prototype,'value')?.set;
   return {element,type:textInput?'input':'textarea',label:element.getAttribute('aria-label')||element.name||element.id||'',read:()=>element.value,editable:()=>!element.disabled&&!element.readOnly,write:text=>{set.call(element,text);element.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:text}));element.dispatchEvent(new Event('change',{bubbles:true}));}};
  }
  if(element.isContentEditable){return {element,type:'contenteditable',label:element.getAttribute('aria-label')||'',read:()=>element.innerText,editable:()=>element.getAttribute('contenteditable')!=='false'&&element.getAttribute('aria-readonly')!=='true',write:text=>{element.innerText=text;element.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:text}));}};}
  return null;
 }
 let nodes;
 try{nodes=[...document.querySelectorAll(request.selector||'.cm-editor,.CodeMirror,.monaco-editor,textarea,[contenteditable="true"]')].filter(visible);}catch{return fail('INVALID_SELECTOR','控件选择器无效。');}
 const adapters=[];
 for(const node of nodes){const item=adapter(node);if(item&&!adapters.some(existing=>existing.element===item.element))adapters.push(item);}
 if(!adapters.length)return fail('EDITOR_NOT_FOUND','未找到可读取的编辑器，请打开源代码编辑模式。');
 if(adapters.length!==1)return fail('EDITOR_AMBIGUOUS','匹配到多个编辑器，请指定唯一控件。');
 const item=adapters[0],before=item.read();
 if(request.expectedEditorName!==undefined&&request.expectedEditorName!==item.label)return fail('EDITOR_CHANGED','编辑器名称已变化。');
 if(request.operation==='write'){
  // A second compare-and-swap inside the same renderer task closes the gap
  // between the main-process digest check and this dispatch.
  if(before!==request.expectedText)return fail('EDITOR_CHANGED','内容已被其他操作修改，请重新读取后编辑。');
  if(!item.editable())return fail('EDITOR_READ_ONLY','当前编辑器为只读。');
  try{item.write(request.text);}catch(error){return fail('EDITOR_WRITE_FAILED',error.message||'编辑器拒绝写入。');}
 }
 const text=item.read();
 return {ok:true,url:location.href,title:document.title,text,editorType:item.type,editorName:item.label,sourceEditorIdentified:true,editable:item.editable(),verified:request.operation==='write'?text===request.text:true};
}
function script(operation,input){return '('+operation.toString()+')('+JSON.stringify(input)+')';}
async function invoke(wc,operation,input){const result=await wc.executeJavaScript(script(operation,input),false);if(!result?.ok){const conflict=['PAGE_CHANGED','EDITOR_CHANGED'].includes(result?.code);throw fault(result?.code||'PAGE_OPERATION_FAILED',result?.error||'网页操作失败。',conflict?409:422);}return result;}
function editorInput(input,operation,expectedUrl){const selected=selector(input);if(input.expectedEditorName!==undefined&&(typeof input.expectedEditorName!=='string'||input.expectedEditorName.length>512))throw fault('INVALID_EDITOR_NAME','编辑器名称无效。',400);return {operation,expectedUrl,selector:selected,expectedEditorName:input.expectedEditorName};}
async function readPageEditor(wc,id,input){return serial(wc,async()=>{const expectedUrl=target(wc,input);const result=await invoke(wc,editorOperation,editorInput(input,'read',expectedUrl));target(wc,input);if(Buffer.byteLength(result.text,'utf8')>limits.textBytes)throw fault('EDITOR_TOO_LARGE','编辑器内容超出读取范围。',413);return {id,...result,sha256:hash(result.text),source:'untrusted-webpage-editor',readAt:Date.now()};});}
async function writePageEditor(wc,id,input){return serial(wc,async()=>{
 const expectedUrl=target(wc,input);
 if(typeof input.text!=='string'||Buffer.byteLength(input.text,'utf8')>limits.textBytes)throw fault('INVALID_TEXT','文本必须在 200 KiB 范围内。',400);
 if(typeof input.expectedHash!=='string'||!/^[0-9a-f]{64}$/i.test(input.expectedHash))throw fault('INVALID_VERSION','请先读取编辑器，再带上当前版本进行写入。',400);
 const request=editorInput(input,'read',expectedUrl),before=await invoke(wc,editorOperation,request);
 if(hash(before.text)!==input.expectedHash.toLowerCase())throw fault('EDITOR_CHANGED','内容已被其他操作修改，请重新读取后编辑。',409);
 target(wc,input);
 const result=await invoke(wc,editorOperation,{...request,operation:'write',expectedText:before.text,text:input.text});
 target(wc,input);
 if(!result.verified)throw fault('EDITOR_VERIFY_FAILED','写入后的完整文本未通过核对。',409);
 // Re-read through the editor's own model after the transaction completed.
 const after=await invoke(wc,editorOperation,request);target(wc,input);
 if(after.text!==input.text)throw fault('EDITOR_VERIFY_FAILED','写入后内容发生变化，请重新读取。',409);
 return {id,...after,sha256:hash(after.text),verified:true,savedToServer:false,source:'untrusted-webpage-editor',writtenAt:Date.now()};
});}

function within(root,filename){const relative=path.relative(root,filename);return relative!==''&&!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);}
function validateFiles(input){
 if(!Array.isArray(input.roots)||!input.roots.length)throw fault('UPLOAD_DISABLED','没有配置允许上传的文件夹。',403);
 const roots=input.roots.map(root=>{if(typeof root!=='string'||!path.isAbsolute(root))throw fault('INVALID_UPLOAD_ROOT','上传目录配置无效。',400);try{const real=fs.realpathSync(root);if(!fs.statSync(real).isDirectory())throw Error();return real;}catch{throw fault('INVALID_UPLOAD_ROOT','上传目录不存在。',400);}});
 if(!Array.isArray(input.paths)||!input.paths.length||input.paths.length>limits.fileCount)throw fault('INVALID_FILES','一次请选择 1 至 10 个文件。',400);
 let total=0;const files=input.paths.map(filename=>{
  if(typeof filename!=='string'||!path.isAbsolute(filename))throw fault('INVALID_FILE_PATH','上传文件必须使用绝对路径。',400);
  let real,stat;try{if(!fs.lstatSync(filename).isFile())throw Error();real=fs.realpathSync(filename);stat=fs.statSync(real);}catch{throw fault('FILE_NOT_FOUND','上传文件不存在或不是普通文件。',404);}
  if(!roots.some(root=>within(root,real)))throw fault('FILE_OUTSIDE_UPLOAD_ROOT','文件不在允许上传的文件夹中。',403);
  if(stat.size>limits.fileBytes)throw fault('FILE_TOO_LARGE','单个上传文件不能超过 25 MiB。',413);
  total+=stat.size;return {path:real,name:path.basename(real),size:stat.size,mtimeMs:stat.mtimeMs,ino:stat.ino,dev:stat.dev};
 });
 if(total>limits.totalFileBytes)throw fault('FILES_TOO_LARGE','上传文件总大小不能超过 100 MiB。',413);
 if(new Set(files.map(file=>file.path.toLowerCase())).size!==files.length)throw fault('DUPLICATE_FILE','请勿重复选择同一个文件。',400);
 return files;
}
function fileInputOperation(request){
 const fail=(code,message)=>({ok:false,code,error:message});
 if(location.href!==request.expectedUrl)return fail('PAGE_CHANGED','网页地址已变化。');
 const key='__orbit_upload_'+request.token;
 if(request.operation==='cleanup'){const receipt=window[key];if(receipt){document.removeEventListener('input',receipt.listener,true);document.removeEventListener('change',receipt.listener,true);if(receipt.element.getAttribute('data-orbit-upload-id')===request.token)receipt.element.removeAttribute('data-orbit-upload-id');delete window[key];}return {ok:true};}
 if(request.operation==='receipt'){const receipt=window[key];return {ok:true,url:location.href,files:receipt?.files||[],event:receipt?.event||null,receivedByInput:!!receipt?.event};}
 let elements;try{elements=[...document.querySelectorAll(request.selector)];}catch{return fail('INVALID_SELECTOR','上传控件选择器无效。');}
 if(elements.length!==1)return fail(elements.length?'FILE_INPUT_AMBIGUOUS':'FILE_INPUT_NOT_FOUND',elements.length?'匹配到多个上传控件。':'未找到网页的上传控件。');
 const element=elements[0];
 if(element.tagName!=='INPUT'||element.type!=='file')return fail('NOT_FILE_INPUT','指定控件不是文件上传入口。');
 if(element.disabled)return fail('FILE_INPUT_DISABLED','上传控件被禁用。');
 if(request.files.length>1&&!element.multiple)return fail('FILE_INPUT_SINGLE','这个上传入口一次只接收一个文件。');
 element.setAttribute('data-orbit-upload-id',request.token);
 const receipt={element,files:[],event:null};
 receipt.listener=event=>{if(event.target!==element)return;const files=[...(element.files||[])].map(file=>({name:file.name,size:file.size}));if(files.length){receipt.files=files;receipt.event=event.type;}};
 window[key]=receipt;document.addEventListener('input',receipt.listener,true);document.addEventListener('change',receipt.listener,true);
 return {ok:true,url:location.href,accept:element.accept,multiple:element.multiple,inputIdentified:true};
}
async function uploadPageFiles(wc,id,input){return serial(wc,async()=>{
 const expectedUrl=target(wc,input),selected=selector(input,true),files=validateFiles(input),token=crypto.randomUUID();
 const request={expectedUrl,selector:selected,files:files.map(({name,size})=>({name,size})),token};
 let attachedHere=false,marked=false;
 try{
  const probe=await invoke(wc,fileInputOperation,{...request,operation:'prepare'});marked=true;target(wc,input);
  if(!wc.debugger.isAttached()){wc.debugger.attach('1.3');attachedHere=true;}
  const {root}=await wc.debugger.sendCommand('DOM.getDocument');
  const {nodeId}=await wc.debugger.sendCommand('DOM.querySelector',{nodeId:root.nodeId,selector:'input[data-orbit-upload-id="'+token+'"]'});
  if(!nodeId)throw fault('FILE_INPUT_CHANGED','上传控件已变化，请重新打开上传窗口。',409);
  for(const file of files){const stat=fs.statSync(file.path);if(!stat.isFile()||stat.size!==file.size||stat.mtimeMs!==file.mtimeMs||stat.ino!==file.ino||stat.dev!==file.dev)throw fault('FILE_CHANGED','文件在上传前发生变化，请重试。',409);}
  target(wc,input);
  await wc.debugger.sendCommand('DOM.setFileInputFiles',{nodeId,files:files.map(file=>file.path)});
  target(wc,input);
  const receipt=await invoke(wc,fileInputOperation,{...request,operation:'receipt'});
  const matched=receipt.receivedByInput&&receipt.files.length===files.length&&receipt.files.every((file,index)=>file.name===files[index].name&&file.size===files[index].size);
  if(!matched)throw fault('UPLOAD_VERIFY_FAILED','网页的上传控件未确认收到所选文件。',409);
  return {id,url:expectedUrl,inputIdentified:probe.inputIdentified,files:receipt.files,receivedByInput:true,verified:true,uploadedToServer:false,verification:'file-input-event',selectedAt:Date.now()};
 }finally{
  if(marked&&!wc.isDestroyed())await wc.executeJavaScript(script(fileInputOperation,{...request,operation:'cleanup'}),false).catch(()=>{});
  if(attachedHere&&!wc.isDestroyed()&&wc.debugger.isAttached())wc.debugger.detach();
 }
});}
function describeDomOperation(request){
 if(location.href!==request.expectedUrl)return {ok:false,code:'PAGE_CHANGED',error:'网页地址已变化。'};
 const cssPath=element=>{if(element.id){const byId='#'+CSS.escape(element.id);if(document.querySelectorAll(byId).length===1)return byId;}const parts=[];for(let node=element;node?.nodeType===1&&parts.length<12;node=node.parentElement){let part=node.tagName.toLowerCase();if(node.parentElement){const siblings=[...node.parentElement.children].filter(child=>child.tagName===node.tagName);if(siblings.length>1)part+=':nth-of-type('+(siblings.indexOf(node)+1)+')';}parts.unshift(part);const value=parts.join(' > ');if(document.querySelectorAll(value).length===1)return value;}return null;};
 const nodes=[...document.querySelectorAll('button,a,input,textarea,[role="button"],[role="tab"],[role="treeitem"],[role="menuitem"],[contenteditable="true"],.cm-editor,.CodeMirror,.monaco-editor')].filter(element=>(element.type!=='password')&&(element.type!=='hidden')&&(element.type==='file'||element.getClientRects().length>0&&element.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})!==false)).slice(0,800);
 return {ok:true,url:location.href,title:document.title,elements:nodes.map(element=>({selector:cssPath(element),tag:element.tagName.toLowerCase(),role:element.getAttribute('role')||null,type:element.tagName==='INPUT'?element.type:null,label:element.getAttribute('aria-label')||'',text:element.tagName==='INPUT'||element.tagName==='TEXTAREA'?'':(element.innerText||'').trim().slice(0,240),disabled:!!element.disabled||element.getAttribute('aria-disabled')==='true'})),source:'untrusted-webpage-dom'};
}
async function describePageDom(wc,id,input){return serial(wc,async()=>{const expectedUrl=target(wc,input),result=await invoke(wc,describeDomOperation,{expectedUrl});target(wc,input);return {id,...result};});}
function clickOperation(request){
 const fail=(code,error)=>({ok:false,code,error});
 if(location.href!==request.expectedUrl)return fail('PAGE_CHANGED','网页地址已变化。');
 let nodes;try{nodes=[...document.querySelectorAll(request.selector)];}catch{return fail('INVALID_SELECTOR','控件选择器无效。');}
 if(nodes.length!==1)return fail(nodes.length?'ELEMENT_AMBIGUOUS':'ELEMENT_NOT_FOUND',nodes.length?'匹配到多个控件。':'未找到指定控件。');
 const element=nodes[0];
 if(!element.isConnected||!element.getClientRects().length||element.checkVisibility?.({checkOpacity:true,checkVisibilityCSS:true})===false)return fail('ELEMENT_NOT_VISIBLE','指定控件当前不可见。');
 if(element.disabled||element.getAttribute('aria-disabled')==='true')return fail('ELEMENT_DISABLED','指定控件当前不可用。');
 if(element.tagName==='INPUT'&&['password','hidden'].includes(element.type))return fail('ELEMENT_UNSUPPORTED','无法操作这个控件。');
 if(typeof element.click!=='function')return fail('ELEMENT_UNSUPPORTED','指定控件不支持点击。');
 const label=element.getAttribute('aria-label')||(element.innerText||'').trim().slice(0,240);
 element.click();return {ok:true,url:location.href,title:document.title,clicked:true,label};
}
async function clickPageElement(wc,id,input){return serial(wc,async()=>{const expectedUrl=target(wc,input),selected=selector(input,true),result=await invoke(wc,clickOperation,{expectedUrl,selector:selected});target(wc,input);return {id,...result};});}
module.exports={readPageEditor,writePageEditor,uploadPageFiles,clickPageElement,describePageDom,limits};

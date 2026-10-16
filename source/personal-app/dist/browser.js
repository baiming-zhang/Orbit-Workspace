const $=s=>document.querySelector(s);let current=null,addressId=null;
const tr=(en,zh)=>current?.language==='zh'?zh:en;
function fitTabs(){const root=$('#tabs'),count=root.children.length,width=root.clientWidth/Math.max(1,count),bar=document.querySelector('.tabbar');root.style.setProperty('--tab-gap',count>40?'0px':count>12?'2px':'5px');bar.classList.toggle('compact-tabs',width<85);bar.classList.toggle('tiny-tabs',width<42);}
new ResizeObserver(fitTabs).observe($('#tabs'));
function labels(){
 document.documentElement.lang=current?.language==='zh'?'zh-CN':'en';
 for(const id of ['strip-new','new-label']){const b=$('#'+id);b.title=tr('New tab (Ctrl+T)','新增标签页（Ctrl+T）');b.setAttribute('aria-label',tr('New tab','新增标签页'));}$('#new-label').textContent=tr('New tab','新增标签页');
 $('#chat-reload').title=tr('Reload ChatGPT','刷新 ChatGPT');
 $('#empty h1').textContent=tr('PDF Reader','PDF 阅读');$('#empty p').textContent=tr('Click + above to open a PDF.','点击上方 + 打开 PDF。');$('#empty p:last-child').textContent=tr('Open ChatGPT to ask questions while reading.','打开 ChatGPT，边阅读边提问。');
 $('#file-address-dialog h2').textContent=tr('File address','文件地址');$('#file-address-dialog label').textContent=tr('View or edit the PDF path / URL','查看或修改 PDF 路径 / 网址');$('#file-address-cancel').textContent=tr('Cancel','取消');$('#file-address-save').textContent=tr('Open','打开');
}
function renderTabState(s){
 current=s;if(!s.addressEditing&&$('#file-address-dialog').open){$('#file-address-dialog').close();addressId=null;}document.body.dataset.workspace=s.workspace;
 const active=s.tabs.find(t=>t.id===s.activeId);$('#empty').hidden=s.workspace!=='pdf'||!active?.internal;labels();$('#chat').disabled=!active;$('#chat-controls').hidden=!!active?.internal&&!active.chat;
 const root=$('#tabs');root.replaceChildren();
 for(const [index,t] of s.tabs.entries()){
  const box=document.createElement('div');box.dataset.id=t.id;box.dataset.tone=String(index%4);box.className='tab'+(t.id===s.activeId?' active':'');
  const select=document.createElement('button');const label=document.createElement('span');label.className='tab-label';label.textContent=t.title||tr('New tab','新标签页');if(t.favicon){const icon=document.createElement('img');icon.className='tab-favicon';icon.alt='';icon.src=t.favicon;box.classList.add('has-favicon');icon.onerror=()=>{icon.remove();box.classList.remove('has-favicon');};select.append(icon);}select.append(label);select.title=(t.title||tr('New tab','新标签页'))+'\n'+t.url;select.role='tab';select.setAttribute('aria-selected',t.id===s.activeId);select.onclick=()=>window.orbitTabs.action('select',t.id);
  box.oncontextmenu=event=>{event.preventDefault();window.orbitTabs.action('tab-menu',t.id);};
  const close=document.createElement('button');close.className='tab-close';close.textContent='×';close.title=tr('Close tab','关闭标签页');close.setAttribute('aria-label',close.title);close.onclick=()=>window.orbitTabs.action('close',t.id);
  box.append(select,close);root.append(box);
 }
 $('#pdf-opening').hidden=!active?.pdfOpening;$('#pdf-opening h1').textContent=tr('Opening PDF…','正在打开 PDF…');$('#pdf-opening p').textContent=active?.title||'';
 fitTabs();const loading=$('#pdf-load-status');loading.hidden=!active?.pdf||!active?.loading;loading.textContent=tr('Opening PDF…','正在打开 PDF…');
 $('#chat').title=active?.pdf?tr('Open ChatGPT and attach the current PDF','打开 ChatGPT 并附上当前 PDF'):tr('Open ChatGPT','打开 ChatGPT');
 const upload=$('#pdf-upload-status');upload.hidden=!active?.pdf||!active?.chat||!active?.upload;upload.textContent=active?.upload?.state==='error'?tr('Attachment failed · Retry','附件发送失败 · 重试'):OrbitI18n.text(active?.upload?.text||'',current.language);upload.title=OrbitI18n.text(active?.upload?.text||'',current.language);upload.dataset.state=active?.upload?.state||'';upload.disabled=active?.upload?.state!=='error';
 $('#chat').setAttribute('aria-pressed',!!active?.chat);$('#chat-reload').hidden=!active?.chat;$('#error').textContent=OrbitI18n.text(s.error,current.language);
}
function acceptTabState(s){if(tabGesture&&s.workspace===tabGesture.workspace){pendingTabState=s;return;}if(tabGesture)finishTabGesture();renderTabState(s);}window.orbitTabs.onState(acceptTabState);
for(const id of ['strip-new','new-label'])$('#'+id).onclick=()=>window.orbitTabs.action('new');
for(const action of ['chat','chat-reload'])$('#'+action).onclick=()=>window.orbitTabs.action(action);
$('#pdf-upload-status').onclick=()=>window.orbitTabs.action('pdf-chat-retry');
function cancelAddress(){if($('#file-address-dialog').open)$('#file-address-dialog').close();addressId=null;window.orbitTabs.action('pdf-address-close');}
window.orbitTabs.onPdfAddress(value=>{addressId=value.id;$('#file-address-title').textContent=value.title;$('#file-address').value=value.address;$('#file-address-error').textContent='';if(!$('#file-address-dialog').open)$('#file-address-dialog').showModal();$('#file-address').focus();$('#file-address').select();});
$('#file-address-cancel').onclick=cancelAddress;$('#file-address-dialog').oncancel=event=>{event.preventDefault();cancelAddress();};
$('#file-address-form').onsubmit=async event=>{event.preventDefault();const result=await window.orbitTabs.action('pdf-address-save',{id:addressId,address:$('#file-address').value});if(result.ok){$('#file-address-dialog').close();addressId=null;}else $('#file-address-error').textContent=OrbitI18n.text(result.error,current.language)||tr('Unable to open this address.','无法打开此地址。');};
function focusAddress(){window.orbitTabs.action('focus-address');}
window.orbitTabs.onFocus(focusAddress);
addEventListener('keydown',event=>{if($('#file-address-dialog').open)return;if(event.ctrlKey&&event.key.toLowerCase()==='t'){event.preventDefault();window.orbitTabs.action('new');}if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();focusAddress();}if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();window.orbitTabs.action('close',current?.activeId);}});

// One pointer gesture owns the tab strip; page/icon updates wait until it ends.
let tabGesture=null,pendingTabState=null,suppressTabClickUntil=0;
const tabRoot=$('#tabs');
function finishTabGesture(commit=false){
 const gesture=tabGesture;if(!gesture)return;tabGesture=null;clearTimeout(gesture.timer);
 const order=[...tabRoot.children].map(box=>box.dataset.id);
 tabRoot.classList.remove('tab-dragging');tabRoot.querySelector('.dragging-tab')?.classList.remove('dragging-tab');
 if(tabRoot.hasPointerCapture(gesture.pointerId))tabRoot.releasePointerCapture(gesture.pointerId);
 const prior=current,latest=pendingTabState||current;pendingTabState=null;
 if(gesture.dragging)suppressTabClickUntil=performance.now()+300;
 if(commit&&gesture.dragging&&order.join('|')!==gesture.order.join('|')){
  window.orbitTabs.action('reorder',{workspace:gesture.workspace,ids:order}).then(result=>{
   if(current?.workspace!==gesture.workspace)return;
   if(result.workspaceState)acceptTabState(result.workspaceState);else if(current)acceptTabState(current);
  }).catch(()=>{if(current?.workspace===gesture.workspace)acceptTabState(current||latest);});
 }else if(latest){if(gesture.dragging)renderTabState(latest);else setTimeout(()=>{if(!tabGesture)renderTabState(current!==prior?current:latest);},0);}
}
function beginTabDrag(){
 const gesture=tabGesture;if(!gesture||gesture.dragging)return;
 const box=tabRoot.querySelector('[data-id="'+CSS.escape(gesture.id)+'"]');if(!box){finishTabGesture();return;}
 gesture.dragging=true;tabRoot.setPointerCapture(gesture.pointerId);tabRoot.classList.add('tab-dragging');box.classList.add('dragging-tab');
}
tabRoot.addEventListener('pointerdown',event=>{
 suppressTabClickUntil=0;
 const box=event.target.closest('.tab');if(event.button!==0||event.isPrimary===false||!box||event.target.closest('.tab-close'))return;
 finishTabGesture();tabGesture={id:box.dataset.id,workspace:current.workspace,pointerId:event.pointerId,x:event.clientX,y:event.clientY,dragging:false,order:[...tabRoot.children].map(item=>item.dataset.id)};
 tabGesture.timer=setTimeout(beginTabDrag,220);
});
tabRoot.addEventListener('pointermove',event=>{
 const gesture=tabGesture;if(!gesture||event.pointerId!==gesture.pointerId)return;
 if(!gesture.dragging&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)>=6)beginTabDrag();
 if(!gesture.dragging)return;event.preventDefault();
 const box=tabRoot.querySelector('[data-id="'+CSS.escape(gesture.id)+'"]');if(!box)return;
 const next=[...tabRoot.children].filter(item=>item!==box).find(item=>{const rect=item.getBoundingClientRect();return event.clientX<rect.left+rect.width/2;});
 tabRoot.insertBefore(box,next||null);fitTabs();
});
document.addEventListener('pointerup',event=>{if(tabGesture?.pointerId===event.pointerId)finishTabGesture(true);});
tabRoot.addEventListener('pointerleave',()=>{if(tabGesture&&!tabGesture.dragging)finishTabGesture();});
tabRoot.addEventListener('pointercancel',()=>finishTabGesture());
tabRoot.addEventListener('lostpointercapture',()=>finishTabGesture());
tabRoot.addEventListener('click',event=>{if(performance.now()<suppressTabClickUntil){suppressTabClickUntil=0;event.preventDefault();event.stopImmediatePropagation();}},true);
addEventListener('blur',()=>finishTabGesture());
addEventListener('keydown',event=>{if(event.key==='Escape'&&tabGesture){event.preventDefault();finishTabGesture();}});

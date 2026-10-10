const $=s=>document.querySelector(s);let current=null,addressId=null;
const tr=(en,zh)=>current?.language==='zh'?zh:en;
function fitTabs(){const root=$('#tabs'),count=root.children.length,width=root.clientWidth/Math.max(1,count),bar=document.querySelector('.tabbar');root.style.setProperty('--tab-gap',count>40?'0px':count>12?'2px':'5px');bar.classList.toggle('compact-tabs',width<85);bar.classList.toggle('tiny-tabs',width<42);}
new ResizeObserver(fitTabs).observe($('#tabs'));
function labels(){
 document.documentElement.lang=current?.language==='zh'?'zh-CN':'en';
 $('#new').title=current?.workspace==='pdf'?tr('Open another PDF','打开另一个 PDF'):tr('Open another browser tab (Ctrl+T)','多开一个浏览标签页（Ctrl+T）');$('#new').setAttribute('aria-label',$('#new').title);
 $('#chat-reload').title=tr('Reload ChatGPT','刷新 ChatGPT');
 $('#empty h1').textContent=tr('PDF Reader','PDF 阅读');$('#empty p').textContent=tr('Click + above to open a PDF.','点击上方 + 打开 PDF。');$('#empty p:last-child').textContent=tr('Open ChatGPT to ask questions while reading.','打开 ChatGPT，边阅读边提问。');
 $('#file-address-dialog h2').textContent=tr('File address','文件地址');$('#file-address-dialog label').textContent=tr('View or edit the PDF path / URL','查看或修改 PDF 路径 / 网址');$('#file-address-cancel').textContent=tr('Cancel','取消');$('#file-address-save').textContent=tr('Open','打开');
}
window.orbitTabs.onState(s=>{
 current=s;if(!s.addressEditing&&$('#file-address-dialog').open){$('#file-address-dialog').close();addressId=null;}document.body.dataset.workspace=s.workspace;
 const active=s.tabs.find(t=>t.id===s.activeId);$('#empty').hidden=s.workspace!=='pdf'||!active?.internal;labels();$('#chat').disabled=!active;$('#chat-controls').hidden=!!active?.internal&&!active.chat;
 const root=$('#tabs');root.replaceChildren();
 for(const [index,t] of s.tabs.entries()){
  const box=document.createElement('div');box.dataset.tone=String(index%4);box.className='tab'+(t.id===s.activeId?' active':'');
  const select=document.createElement('button');select.textContent=t.title||tr('New tab','新标签页');select.title=(t.title||tr('New tab','新标签页'))+'\n'+t.url;select.role='tab';select.setAttribute('aria-selected',t.id===s.activeId);select.onclick=()=>window.orbitTabs.action('select',t.id);
  box.oncontextmenu=event=>{event.preventDefault();window.orbitTabs.action('tab-menu',t.id);};
  const close=document.createElement('button');close.textContent='×';close.title=tr('Close tab','关闭标签页');close.setAttribute('aria-label',close.title);close.onclick=()=>window.orbitTabs.action('close',t.id);close.hidden=!!t.internal;
  box.append(select,close);root.append(box);
 }
 fitTabs();const loading=$('#pdf-load-status');loading.hidden=!active?.pdf||!active?.loading;loading.textContent=tr('Opening PDF…','正在打开 PDF…');
 $('#chat').title=active?.pdf?tr('Open ChatGPT and attach the current PDF','打开 ChatGPT 并附上当前 PDF'):tr('Open ChatGPT','打开 ChatGPT');
 const upload=$('#pdf-upload-status');upload.hidden=!active?.pdf||!active?.chat||!active?.upload;upload.textContent=active?.upload?.state==='error'?tr('Attachment failed · Retry','附件发送失败 · 重试'):OrbitI18n.text(active?.upload?.text||'',current.language);upload.title=OrbitI18n.text(active?.upload?.text||'',current.language);upload.dataset.state=active?.upload?.state||'';upload.disabled=active?.upload?.state!=='error';
 $('#chat').setAttribute('aria-pressed',!!active?.chat);$('#chat-reload').hidden=!active?.chat;$('#error').textContent=OrbitI18n.text(s.error,current.language);
});
for(const action of ['new','chat','chat-reload'])$('#'+action).onclick=()=>window.orbitTabs.action(action);
$('#pdf-upload-status').onclick=()=>window.orbitTabs.action('pdf-chat-retry');
function cancelAddress(){if($('#file-address-dialog').open)$('#file-address-dialog').close();addressId=null;window.orbitTabs.action('pdf-address-close');}
window.orbitTabs.onPdfAddress(value=>{addressId=value.id;$('#file-address-title').textContent=value.title;$('#file-address').value=value.address;$('#file-address-error').textContent='';if(!$('#file-address-dialog').open)$('#file-address-dialog').showModal();$('#file-address').focus();$('#file-address').select();});
$('#file-address-cancel').onclick=cancelAddress;$('#file-address-dialog').oncancel=event=>{event.preventDefault();cancelAddress();};
$('#file-address-form').onsubmit=async event=>{event.preventDefault();const result=await window.orbitTabs.action('pdf-address-save',{id:addressId,address:$('#file-address').value});if(result.ok){$('#file-address-dialog').close();addressId=null;}else $('#file-address-error').textContent=OrbitI18n.text(result.error,current.language)||tr('Unable to open this address.','无法打开此地址。');};
function focusAddress(){window.orbitTabs.action('focus-address');}
window.orbitTabs.onFocus(focusAddress);
addEventListener('keydown',event=>{if($('#file-address-dialog').open)return;if(event.ctrlKey&&event.key.toLowerCase()==='t'){event.preventDefault();window.orbitTabs.action('new');}if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();focusAddress();}if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();window.orbitTabs.action('close',current?.activeId);}});

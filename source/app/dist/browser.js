const $=s=>document.querySelector(s);let current=null,addressId=null;
window.orbitTabs.onState(s=>{
 current=s;if(!s.addressEditing&&$('#file-address-dialog').open){$('#file-address-dialog').close();addressId=null;}document.body.dataset.workspace=s.workspace;$('#empty').hidden=s.tabs.length>0;
 $('#new').title=s.workspace==='pdf'?'Open another PDF':'New tab (Ctrl+T)';$('#open-file').textContent=s.workspace==='pdf'?'Open PDF':'Open file';$('#chat').disabled=!s.tabs.length;
 const root=$('#tabs');root.replaceChildren();
 for(const [index,t] of s.tabs.entries()){
  const box=document.createElement('div');box.dataset.tone=String(index%4);box.className='tab'+(t.id===s.activeId?' active':'');
  const select=document.createElement('button');select.textContent=t.title||'New tab';select.title=s.workspace==='pdf'?'Right-click to view or edit the file address':t.url;select.role='tab';select.setAttribute('aria-selected',t.id===s.activeId);select.onclick=()=>window.orbitTabs.action('select',t.id);
  if(s.workspace==='pdf')box.oncontextmenu=event=>{event.preventDefault();window.orbitTabs.action('pdf-file-menu',t.id);};
  const close=document.createElement('button');close.textContent='×';close.title='Close tab';close.onclick=()=>window.orbitTabs.action('close',t.id);
  box.append(select,close);root.append(box);
 }
 const active=s.tabs.find(t=>t.id===s.activeId);if(document.activeElement!==$('#address'))$('#address').value=active?.url||'';
 $('#chat').title=s.workspace==='pdf'?'Open ChatGPT and attach the current PDF':'Open ChatGPT';
 const upload=$('#pdf-upload-status');upload.hidden=s.workspace!=='pdf'||!active?.chat||!active?.upload;upload.textContent=active?.upload?.state==='error'?'Attachment failed · Retry':active?.upload?.text||'';upload.title=active?.upload?.text||'';upload.dataset.state=active?.upload?.state||'';upload.disabled=active?.upload?.state!=='error';
 $('#back').disabled=!s.canBack;$('#forward').disabled=!s.canForward;$('#chat').setAttribute('aria-pressed',!!active?.chat);$('#chat-reload').hidden=!active?.chat;$('#error').textContent=s.error;
});
for(const action of ['new','back','forward','reload','open-file','chat','chat-reload'])$('#'+action).onclick=()=>window.orbitTabs.action(action);
$('#pdf-upload-status').onclick=()=>window.orbitTabs.action('pdf-chat-retry');
$('#address-form').onsubmit=event=>{event.preventDefault();window.orbitTabs.action('navigate',$('#address').value);$('#address').blur();};
function cancelAddress(){if($('#file-address-dialog').open)$('#file-address-dialog').close();addressId=null;window.orbitTabs.action('pdf-address-close');}
window.orbitTabs.onPdfAddress(value=>{addressId=value.id;$('#file-address-title').textContent=value.title;$('#file-address').value=value.address;$('#file-address-error').textContent='';if(!$('#file-address-dialog').open)$('#file-address-dialog').showModal();$('#file-address').focus();$('#file-address').select();});
$('#file-address-cancel').onclick=cancelAddress;$('#file-address-dialog').oncancel=event=>{event.preventDefault();cancelAddress();};
$('#file-address-form').onsubmit=async event=>{event.preventDefault();const result=await window.orbitTabs.action('pdf-address-save',{id:addressId,address:$('#file-address').value});if(result.ok){$('#file-address-dialog').close();addressId=null;}else $('#file-address-error').textContent=result.error||'Unable to open this address.';};
function focusAddress(){if(current?.workspace==='pdf')window.orbitTabs.action('pdf-address-open',current.activeId);else{$('#address').focus();$('#address').select();}}
window.orbitTabs.onFocus(focusAddress);
addEventListener('keydown',event=>{if($('#file-address-dialog').open)return;if(event.ctrlKey&&event.key.toLowerCase()==='t'){event.preventDefault();window.orbitTabs.action('new');}if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();focusAddress();}if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();window.orbitTabs.action('close',current?.activeId);}});

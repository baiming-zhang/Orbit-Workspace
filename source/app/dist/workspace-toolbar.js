(()=>{
 const snapshots=new Map();let selectedKey='';
 const form=document.getElementById('workspace-address-form'),input=document.getElementById('workspace-address'),file=document.getElementById('workspace-open-file');
 const tabbed=page=>!!navigationItem(page)||!!browserPages[page]||snapshots.has(page);
 const current=()=>snapshots.get(state.page);
 function syncInput(force=false){
  const snapshot=current(),key=state.page+':'+(snapshot?.activeId||'');
  if(force||key!==selectedKey||document.activeElement!==input){input.value=snapshot?.address||navigationItem(state.page)?.url||'orbit://app/index.html#'+state.page;input.removeAttribute('aria-invalid');}
  selectedKey=key;
 }
 function update(page,navigation){
  const visible=tabbed(page)&&!!window.orbitDesktop;
  form.hidden=!visible;document.body.classList.toggle('workspace-navigation',visible);
  if(!visible){selectedKey='';document.body.classList.remove('internal-web-tab');return navigation;}document.body.classList.toggle('internal-web-tab',!isNativePage()&&!!current()&&!current().internalActive);
  const english=prefs.language==='en',pdf=page==='pdf';
  input.placeholder=pdf?(english?'PDF file path or URL':'PDF 文件路径或网址'):(english?'Enter a URL or search':'输入网址或搜索关键词');
  input.setAttribute('aria-label',pdf?(english?'PDF file path or URL':'PDF 文件路径或网址'):(english?'Website address or search':'网址或搜索关键词'));
  file.title=pdf?(english?'Open PDF':'打开 PDF'):(english?'Open file':'打开文件');file.setAttribute('aria-label',file.title);
  syncInput();
  const snapshot=current();return {canGoBack:!!snapshot?.canBack,canGoForward:!!snapshot?.canForward};
 }
 function accept(snapshot){
  if(!snapshot||!tabbed(snapshot.workspace))return;
  snapshots.set(snapshot.workspace,snapshot);
  if(state.page===snapshot.workspace){document.body.classList.toggle('internal-web-tab',!isNativePage()&&!snapshot.internalActive);updatePageActions();}
 }
 function focus(){if(form.hidden)return;input.focus();input.select();}
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(form.hidden)return;
  const page=state.page,result=await window.orbitDesktop.workspaceAction(page,'navigate',input.value);
  if(page!==state.page)return;
  if(!result.ok){input.setAttribute('aria-invalid','true');toast(result.error);return;}
  if(result.workspaceState)accept(result.workspaceState);input.blur();syncInput(true);
 });
 file.addEventListener('click',async()=>{const result=await window.orbitDesktop.workspaceAction(state.page,'open-file');if(!result.ok)toast(result.error);});
 input.addEventListener('input',()=>input.removeAttribute('aria-invalid'));
 input.addEventListener('blur',()=>syncInput(true));
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();syncInput(true);input.blur();}});
 document.addEventListener('keydown',event=>{
  if(form.hidden||document.getElementById('modal').open)return;
  if(event.ctrlKey&&event.key.toLowerCase()==='l'){event.preventDefault();focus();}if(event.ctrlKey&&event.key.toLowerCase()==='t'){event.preventDefault();window.orbitDesktop.workspaceAction(state.page,'new');}if(event.ctrlKey&&event.key.toLowerCase()==='w'){event.preventDefault();window.orbitDesktop.workspaceAction(state.page,'close',current()?.activeId);}
 });
 window.orbitDesktop?.onWorkspaceState(accept);
 window.orbitDesktop?.onWorkspaceFocus(focus);
 window.OrbitWorkspaceToolbar=Object.freeze({update,accept});
})();

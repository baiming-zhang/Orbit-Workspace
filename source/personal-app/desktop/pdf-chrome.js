(()=>{
 if(location.origin!=='chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai')return false;
 const viewer=document.querySelector('pdf-viewer'),root=viewer?.shadowRoot,toolbar=root?.querySelector('viewer-toolbar'),tools=toolbar?.shadowRoot,more=tools?.querySelector('#more');
 if(!more||!root)return false;
 if(window.__orbitPdfSetBackground&&tools.querySelector('#orbit-pdf-collapse')&&root.querySelector('#orbit-pdf-expand'))return window.__orbitPdfSetBackground(window.__orbitPdfBackground);
 const style=(target,id,css)=>{if(target.querySelector('#'+id))return;const s=document.createElement('style');s.id=id;s.textContent=css;target.append(s);};
 style(tools,'orbit-pdf-toolbar-style',`
  :host{--cr-icon-button-fill-color:#5c8bbc;--cr-icon-button-ripple-opacity:.08;color:#4b5563;--pdf-toolbar-text-color:#5c8bbc}
  #toolbar{background:#fff!important;color:#4b5563!important;--pdf-toolbar-text-color:#5c8bbc!important;border-bottom:1px solid #edf0f3;box-shadow:none!important;box-sizing:border-box}
  #start,#center,#end,#title,viewer-page-selector{color:#4b5563!important}#title{font-weight:500}
  cr-icon-button{--cr-icon-button-fill-color:#5c8bbc!important;color:#5c8bbc;border-radius:8px}
  #sidenavToggle,#more,#fit{--cr-icon-button-fill-color:#5c8bbc!important}#rotate,#print{--cr-icon-button-fill-color:#b88d45!important}#annotate{--cr-icon-button-fill-color:#60947c!important}#save{--cr-icon-button-fill-color:#bb7973!important}
  input{background:#f6f8fb!important;color:#475467!important;border:1px solid #e9edf3!important;border-radius:5px!important}
  .vertical-separator,#vertical-separator{background:#e9edf3!important}
  cr-action-menu{--cr-menu-background-color:#fff!important;--cr-primary-text-color:#475467!important;--cr-menu-background-focus-color:#f3f6fa!important;--cr-separator-line:1px solid #edf0f3!important;--cr-menu-shadow:0 4px 20px #24364b14!important}
  #orbit-pdf-collapse{display:inline-grid;place-items:center;width:32px;height:32px;margin-left:4px;border:0;border-radius:8px;background:#fff;color:#5c8bbc;cursor:pointer;flex-shrink:0;padding:7px}
  #orbit-pdf-collapse:hover{background:#edf3fb}#orbit-pdf-collapse:focus-visible{outline:2px solid #9ab8de}
 `);
 const page=tools.querySelector('viewer-page-selector')?.shadowRoot;
 if(page)style(page,'orbit-pdf-page-style',`:host{color:#475467!important}input,#pageSelector{background:#f6f8fb!important;color:#475467!important;border:1px solid #e9edf3!important;border-radius:5px!important}#content{color:#475467!important}`);
 style(root,'orbit-pdf-viewer-style',`
  :host{--viewer-side-background-color:var(--orbit-pdf-background);--viewer-pdf-toolbar-background-color:#fff;--pdf-toolbar-text-color:#5c8bbc;--viewer-border-color:#dbe3ed;--viewer-icon-focus-outline-color:#9cb9de;--viewer-icon-ink-fill-color:#5c8bbc;--viewer-text-input-selection-color:#d7e5f6;--viewer-icon-ink-selected-fill-color:#5c8bbc;--viewer-icon-ink-selected-background-color:#e4edf9;color:#475467}
  #container,#main,#scroller,#sidenav-container{background:var(--orbit-pdf-background)!important}
  :host(.orbit-immersive){--viewer-pdf-toolbar-height:0px}
  :host(.orbit-immersive) #toolbar{display:none!important}
  :host(.orbit-immersive) #container{height:100%!important}
  #orbit-pdf-expand{display:none;position:fixed;right:12px;top:8px;width:30px;height:26px;border:1px solid #d6e4f5;border-radius:8px;background:#ffffffed;color:#5c8bbc;z-index:100;cursor:pointer;padding:5px;box-shadow:0 2px 8px #24364b0a}
  :host(.orbit-immersive) #orbit-pdf-expand{display:inline-grid;place-items:center}
  #orbit-pdf-expand:hover{background:#edf3fb}#orbit-pdf-expand:focus-visible{outline:2px solid #9ab8de}
 `);
 const sidebar=root.querySelector('viewer-pdf-sidenav')?.shadowRoot;
 if(sidebar)style(sidebar,'orbit-pdf-sidebar-style',`:host{background:var(--orbit-pdf-background)!important;color:#475467!important;--cr-icon-button-fill-color:#5c8bbc!important;--cr-vertical-tab-selected-color:#8caed7;--cr-primary-text-color:#475467;--cr-secondary-text-color:#697586}#icons,#content{background:var(--orbit-pdf-background)!important;color:#475467!important}cr-icon-button{--cr-icon-button-fill-color:#5c8bbc!important}cr-icon{--iron-icon-fill-color:#5c8bbc!important;color:#5c8bbc!important}`);
 function lightNested(target){for(const el of target.querySelectorAll('*'))if(el.shadowRoot){
  if(['VIEWER-THUMBNAIL-BAR','VIEWER-THUMBNAIL','VIEWER-BOOKMARK','VIEWER-ATTACHMENTS-BAR','VIEWER-ATTACHMENT'].includes(el.tagName))style(el.shadowRoot,'orbit-pdf-light-item',`:host{background:transparent!important;color:#697586!important;--cr-primary-text-color:#475467;--cr-menu-background-focus-color:#e6eef8}#pageNumber{color:#697586!important}#thumbnail{border-radius:3px}`);
  if(el.tagName==='CR-ACTION-MENU')style(el.shadowRoot,'orbit-pdf-light-menu',`:host{--cr-menu-background-color:#fff!important;--cr-primary-text-color:#475467!important;--cr-menu-background-focus-color:#eef4fc!important;--cr-action-menu-disabled-item-color:#8b99a9!important;--cr-separator-line:1px solid #edf0f3!important;--cr-menu-shadow:0 4px 20px #24364b14!important}dialog{background:#fff!important;color:#475467!important}::slotted(.dropdown-item){color:#475467!important}::slotted(.dropdown-item:hover){background:#eef4fc!important}`);
  if(['VIEWER-DOWNLOAD-CONTROLS','VIEWER-TOGGLE-BUTTON','VIEWER-INK-ANNOTATION-MODE-SELECTOR'].includes(el.tagName))style(el.shadowRoot,'orbit-pdf-control-style',`:host{--pdf-toolbar-text-color:#5c8bbc!important}cr-icon-button{--cr-icon-button-fill-color:#5c8bbc!important}#save{--cr-icon-button-fill-color:#bb7973!important}#button{--cr-icon-button-fill-color:#60947c!important}`);
  lightNested(el.shadowRoot);
 }}
 lightNested(root);
 window.__orbitPdfSetBackground=value=>{
  const color=/^#[0-9a-f]{6}$/i.test(value||'')?value:'#f1f6fc',argb=(0xff000000|parseInt(color.slice(1),16))>>>0;
  const changed=viewer.dataset.orbitBackground!==color;
  viewer.style.setProperty('--orbit-pdf-background',color);document.documentElement.style.backgroundColor=color;document.body.style.backgroundColor=color;
  viewer.getBackgroundColor=()=>argb;
  const plugin=root.querySelector('#plugin');plugin?.setAttribute('background-color',String(argb));try{viewer.pluginController_?.setBackgroundColor(argb);}catch{}
  viewer.dataset.orbitBackground=color;lightNested(root);return changed;
 };
 const backgroundChanged=window.__orbitPdfSetBackground(window.__orbitPdfBackground);
 const svg=down=>`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${down?'m6 9 6 6 6-6':'m6 15 6-6 6 6'}"/></svg>`;
 const collapse=document.createElement('button');collapse.id='orbit-pdf-collapse';collapse.type='button';collapse.title='Collapse PDF toolbar';collapse.setAttribute('aria-label',collapse.title);collapse.innerHTML=svg(false);more.insertAdjacentElement('afterend',collapse);
 const expand=document.createElement('button');expand.id='orbit-pdf-expand';expand.type='button';expand.title='Expand PDF toolbar';expand.setAttribute('aria-label',expand.title);expand.innerHTML=svg(true);root.append(expand);
 function immersive(value){viewer.classList.toggle('orbit-immersive',value);collapse.setAttribute('aria-expanded',!value);requestAnimationFrame(()=>{window.dispatchEvent(new Event('resize'));(value?expand:collapse).focus({preventScroll:true});});}
 collapse.onclick=()=>immersive(true);expand.onclick=()=>immersive(false);
 return backgroundChanged;
})()

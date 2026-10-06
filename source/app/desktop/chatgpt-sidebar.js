(()=>{
 if(window.__orbitChatgptSidebar||location.hostname!=='chatgpt.com')return;
 window.__orbitChatgptSidebar=true;
 let expanded=null;
 const close=()=>{if(expanded){expanded.removeAttribute('data-orbit-home-expanded');expanded=null;}};
 document.addEventListener('click',event=>{
  if(!event.isTrusted)return;
  const button=event.target.closest?.('button');
  const home=button?.closest('nav')&&(button.dataset.sidebarDestination==='builtin:home'||button.dataset.slateSidebarPeekArea==='home');
  if(home){
   if(expanded){close();return;}
   setTimeout(()=>{
    const panel=document.getElementById('app-shell-sidebar')?.closest('aside');
    if(!panel||panel.getBoundingClientRect().width>100)return;
    if(!document.getElementById('orbit-chatgpt-home-style')){
     const style=document.createElement('style');style.id='orbit-chatgpt-home-style';
     style.textContent='aside[data-orbit-home-expanded]{width:340px!important;min-width:340px!important;--app-shell-left-panel-width:340px!important;}';
     document.head.append(style);
    }
    panel.setAttribute('data-orbit-home-expanded','');expanded=panel;
   },180);
  }else if(expanded&&(!expanded.contains(event.target)||event.target.closest('[aria-controls="app-shell-sidebar"]'))){close();}
 },true);
 document.addEventListener('keydown',event=>{if(event.isTrusted&&event.key==='Escape')close();},true);
})();

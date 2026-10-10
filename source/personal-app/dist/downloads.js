(()=>{
 let visible=false;const seen=new Set();
 const trigger=()=>document.querySelector('[data-action="downloads"]');
 function update(data,automatic=false){
  const badge=document.querySelector('.download-badge');if(badge){badge.hidden=!data.active;badge.textContent=data.active;}
  const incoming=(data.items||[]).some(item=>!seen.has(item.id));for(const item of data.items||[])seen.add(item.id);
  if(automatic&&incoming&&!document.getElementById('modal').open)open();
 }
 async function open(){const button=trigger();if(!button||!window.orbitDesktop?.showDownloads)return;const rect=button.getBoundingClientRect();const result=await window.orbitDesktop.showDownloads({right:rect.right,bottom:rect.bottom});if(result?.ok===false)toast(result.error);}
 function close(){return window.orbitDesktop?.closeDownloads();}
 document.addEventListener('contextmenu',event=>{if(event.target.closest('[data-action="downloads"]')){event.preventDefault();window.orbitDesktop?.downloadMenu();}});
 document.addEventListener('click',event=>{if(event.target.closest('[data-action="downloads"]')){if(visible)close();else open();}});
 document.addEventListener('pointerdown',event=>{if(visible&&!event.target.closest('[data-action="downloads"]'))close();});
 document.addEventListener('keydown',event=>{if(visible&&event.key==='Escape'){event.preventDefault();close();}});
 window.addEventListener('resize',()=>{if(visible)open();});
 window.addEventListener('DOMContentLoaded',()=>{
  window.orbitDesktop?.onDownloadsVisibility(value=>{visible=value;trigger()?.setAttribute('aria-expanded',String(value));});
  trigger()?.setAttribute('aria-haspopup','dialog');trigger()?.setAttribute('aria-expanded','false');
  window.orbitDesktop?.onDownloadsChanged(data=>update(data,true));window.orbitDesktop?.getDownloads().then(data=>update(data)).catch(()=>{});
 });
 window.OrbitDownloads=Object.freeze({open,close,update});
})();

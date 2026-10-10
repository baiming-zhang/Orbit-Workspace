(()=>{
 let width=Number(localStorage.getItem('orbit:application-directory-width'))||340;
 function init(){for(const dashboard of document.querySelectorAll('.dashboard')){if(dashboard.querySelector('.application-column-handle'))continue;
  const handle=document.createElement('div');handle.className='application-column-handle';handle.setAttribute('role','separator');handle.setAttribute('aria-label','调整申请目录与详情宽度');handle.setAttribute('aria-orientation','vertical');handle.tabIndex=0;dashboard.append(handle);
  function set(next,save=false){width=Math.round(Math.min(Math.max(230,next),Math.max(230,dashboard.clientWidth-380)));dashboard.style.setProperty('--directory-width',width+'px');handle.setAttribute('aria-valuenow',width);if(save)localStorage.setItem('orbit:application-directory-width',width);}
  set(width);let start=0,origin=0,dragging=false;
  handle.onpointerdown=e=>{if(e.button!==0)return;dragging=true;start=width;origin=e.clientX;handle.classList.add('dragging');handle.setPointerCapture(e.pointerId);e.preventDefault();};
  handle.onpointermove=e=>{if(dragging)set(start+e.clientX-origin);};
  function end(){if(!dragging)return;dragging=false;handle.classList.remove('dragging');set(width,true);}
  handle.onpointerup=end;handle.onpointercancel=end;handle.onlostpointercapture=end;
  handle.ondblclick=()=>set(340,true);handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();set(width+(e.key==='ArrowRight'?10:-10),true);}};
  window.addEventListener('resize',()=>{if(document.contains(dashboard))set(width);},{passive:true});
 }}
 window.addEventListener('DOMContentLoaded',init);new MutationObserver(init).observe(document.documentElement,{subtree:true,childList:true});
})();

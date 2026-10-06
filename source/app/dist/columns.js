(()=>{
 const handle=document.createElement('div');handle.className='sidebar-column-handle';handle.setAttribute('role','separator');handle.setAttribute('aria-label','调整 Orbit 导航栏宽度');handle.setAttribute('aria-orientation','vertical');handle.tabIndex=0;document.body.append(handle);
 function set(width,save=false){const value=Math.round(Math.min(Math.max(180,width),Math.min(500,innerWidth-560)));document.documentElement.style.setProperty('--sidebar',value+'px');prefs.sidebarWidth=value;handle.setAttribute('aria-valuenow',value);if(save)saveUiPreferences();}
 set(Number(prefs.sidebarWidth)||224);
 let dragging=false,origin=0,start=0;
 handle.onpointerdown=e=>{if(e.button!==0)return;dragging=true;origin=e.clientX;start=prefs.sidebarWidth;handle.classList.add('dragging');handle.setPointerCapture(e.pointerId);if(isNativePage())window.orbitDesktop?.showService(null);e.preventDefault();};
 handle.onpointermove=e=>{if(dragging)set(start+e.clientX-origin);};
 function end(){if(!dragging)return;dragging=false;handle.classList.remove('dragging');set(prefs.sidebarWidth,true);syncNativeView();}
 handle.onpointerup=end;handle.onpointercancel=end;handle.onlostpointercapture=end;
 handle.ondblclick=()=>{set(224,true);syncNativeView();};
 handle.onkeydown=e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();set(prefs.sidebarWidth+(e.key==='ArrowRight'?10:-10),true);syncNativeView();}};
 window.addEventListener('resize',()=>{set(prefs.sidebarWidth);syncNativeView();});
})();

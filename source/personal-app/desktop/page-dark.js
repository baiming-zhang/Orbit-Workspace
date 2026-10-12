(function orbitPageDarkBoot(){
 if(!['http:','https:','file:'].includes(location.protocol))return;
 if(!document.documentElement){const observer=new MutationObserver(()=>{if(document.documentElement){observer.disconnect();orbitPageDarkBoot();}});observer.observe(document,{childList:true});return;}
 if(window.__orbitApplyPageDark){window.__orbitApplyPageDark(window.__orbitPageDark);return;}
 let enabled=false,queued=false;const marked=new Set(),roots=new Set();
 const css=`html[data-orbit-dark]{color-scheme:dark!important;scrollbar-color:#54585f #18191b}html[data-orbit-dark] body{background-color:#151618!important;color:#e8eaed!important}html[data-orbit-dark] .orbit-host-dark-surface{background-color:#202124!important;background-image:none!important;border-color:#3b3e44!important}html[data-orbit-dark] .orbit-host-dark-ink{color:#e8eaed!important}html[data-orbit-dark] .orbit-host-dark-border{border-color:#3b3e44!important}html[data-orbit-dark] .orbit-host-dark-canvas{filter:invert(.9) hue-rotate(180deg)!important}html[data-orbit-dark] :is(input,textarea,select){color-scheme:dark!important;accent-color:#b4bac4}html[data-orbit-dark] ::selection{background:#454b55!important;color:#f1f3f5!important}`;
 try{const sheet=new CSSStyleSheet();sheet.replaceSync(css);document.adoptedStyleSheets=[...document.adoptedStyleSheets,sheet];}catch{const style=document.createElement('style');style.textContent=css;(document.head||document.documentElement).append(style);}
 const rgba=value=>{const m=/rgba?\(([^)]+)\)/.exec(value||'');return m?m[1].split(',').map(Number):null;};
 const luma=c=>c?(c[0]*.2126+c[1]*.7152+c[2]*.0722)/255:0;
 function mark(el,name){if(!el.classList.contains(name)){el.classList.add(name);marked.add(el);}}
 function canvases(){if(!enabled||document.visibilityState!=='visible')return;for(const canvas of document.querySelectorAll('canvas')){
  if(canvas.width<250||canvas.height<180)continue;
  try{const sample=new OffscreenCanvas(32,32),ctx=sample.getContext('2d',{willReadFrequently:true});ctx.drawImage(canvas,0,0,32,32);const data=ctx.getImageData(0,0,32,32).data;let white=0,ink=0,colored=0;
   for(let i=0;i<data.length;i+=4){if(data[i+3]<200)continue;const lo=Math.min(data[i],data[i+1],data[i+2]),hi=Math.max(data[i],data[i+1],data[i+2]);if(lo>235)white++;if(hi<130)ink++;if(hi-lo>40)colored++;}
   if(white>550&&(ink>0||white>970)&&colored<180)mark(canvas,'orbit-host-dark-canvas');else canvas.classList.remove('orbit-host-dark-canvas');
  }catch{}
 }}
 function scan(){queued=false;if(!enabled)return;const batches=[...roots];roots.clear();for(const root of batches){const elements=root.nodeType===1?[root,...root.querySelectorAll('*')]:[];for(const el of elements){
  if(['IMG','VIDEO','CANVAS','SVG','PATH','STYLE','SCRIPT','LINK','IFRAME','EMBED','PICTURE'].includes(el.tagName)||el.closest('svg'))continue;
  const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')continue;const bg=rgba(style.backgroundColor),fg=rgba(style.color),border=rgba(style.borderTopColor);
  if(bg&&(bg[3]===undefined||bg[3]>.85)&&luma(bg)>.63)mark(el,'orbit-host-dark-surface');
  if(fg&&luma(fg)<.24)mark(el,'orbit-host-dark-ink');
  if(border&&luma(border)>.67&&parseFloat(style.borderTopWidth)>0)mark(el,'orbit-host-dark-border');
 }}canvases();}
 function schedule(root){if(root?.nodeType===1)roots.add(root);if(!queued&&enabled){queued=true;setTimeout(scan,100);}}
 const start=()=>{new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)schedule(n);}).observe(document.body,{subtree:true,childList:true});schedule(document.body);};
 window.__orbitApplyPageDark=value=>{enabled=!!value;document.documentElement.toggleAttribute('data-orbit-dark',enabled);if(enabled)schedule(document.body);else{for(const el of marked)el.classList.remove('orbit-host-dark-surface','orbit-host-dark-ink','orbit-host-dark-border','orbit-host-dark-canvas');marked.clear();roots.clear();}};
 if(document.body)start();else document.addEventListener('DOMContentLoaded',start,{once:true});
 setInterval(canvases,1800);window.__orbitApplyPageDark(window.__orbitPageDark);
})();

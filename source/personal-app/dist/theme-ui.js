(()=>{
 let dark=matchMedia('(prefers-color-scheme: dark)').matches,queued=false;const marked=new Set();
 document.documentElement.dataset.theme=dark?'dark':'light';
 const rgba=value=>{const match=/rgba?\(([^)]+)\)/.exec(value||'');return match?match[1].split(',').map(Number):null;};
 const brightness=c=>c?(c[0]*.2126+c[1]*.7152+c[2]*.0722)/255:0;
 function repair(){queued=false;if(!dark||!document.body)return;
  for(const el of document.body.querySelectorAll('*')){
   if(['IMG','VIDEO','CANVAS','SVG','PATH','STYLE','SCRIPT','LINK','SOURCE','PICTURE','IFRAME','EMBED'].includes(el.tagName)||el.closest('svg'))continue;
   const style=getComputedStyle(el);if(style.display==='none'||style.visibility==='hidden')continue;
   const bg=rgba(style.backgroundColor),ink=rgba(style.color),border=rgba(style.borderTopColor);
   const lightGradient=/gradient\(/.test(style.backgroundImage)&&(/(?:#fff\b|#ffffff|rgb\(2[4-5]\d,\s*2[4-5]\d,\s*2[4-5]\d\))/.test(style.backgroundImage));
   if(bg&&(bg[3]===undefined||bg[3]>.8)&&brightness(bg)>.57||lightGradient){el.classList.add('orbit-theme-surface');marked.add(el);}
   if(ink&&brightness(ink)<.25){el.classList.add('orbit-theme-ink');marked.add(el);}
   if(border&&brightness(border)>.67&&parseFloat(style.borderTopWidth)>0){el.classList.add('orbit-theme-border');marked.add(el);}
  }
 }
 function schedule(){if(!queued&&dark){queued=true;setTimeout(repair,80);}}
 function apply(data){if(!data)return;dark=data.theme==='dark';document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light';
  if(!dark){for(const el of marked)el.classList.remove('orbit-theme-surface','orbit-theme-ink','orbit-theme-border');marked.clear();}else schedule();
  for(const frame of document.querySelectorAll('iframe'))try{if(frame.contentWindow.location.origin===location.origin)frame.contentWindow.postMessage({type:'orbit-presentation',value:data},location.origin);}catch{}
 }
 const watch=()=>{new MutationObserver(schedule).observe(document.body,{subtree:true,childList:true});schedule();};
 if(document.body)watch();else document.addEventListener('DOMContentLoaded',watch,{once:true});
 window.orbitTheme?.onChanged(apply);window.orbitTheme?.get().then(apply).catch(()=>{});
 // Application documents embedded within Orbit inherit the same presentation.
 window.addEventListener('message',event=>{if(event.origin===location.origin&&event.data?.type==='orbit-presentation')apply(event.data.value);});
})();

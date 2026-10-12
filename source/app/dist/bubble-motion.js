(()=>{
 const bubbles=[...document.querySelectorAll('.loading-symbol .bubble')],hues=[208,224,344,281,171,38];
 const vary=(bubble,index,initial)=>{const hue=hues[(index+Math.floor(Math.random()*3))%hues.length]+Math.random()*10-5;bubble.style.setProperty('--bubble-hue',hue.toFixed(1));bubble.style.setProperty('--drift',(Math.random()*28-14).toFixed(1)+'px');if(initial){const size=18+Math.random()*14,duration=3.5+Math.random()*2.4,phase=.18+(index+Math.random()*.65)/Math.max(1,bubbles.length)*.58;bubble.style.width=size.toFixed(1)+'px';bubble.style.height=size.toFixed(1)+'px';bubble.style.left=(14+Math.random()*(112-size)).toFixed(1)+'px';bubble.style.animationDuration=duration.toFixed(2)+'s';bubble.style.animationDelay=(-phase*duration).toFixed(2)+'s';}};
 bubbles.forEach((bubble,index)=>{vary(bubble,index,true);bubble.addEventListener('animationiteration',()=>vary(bubble,index,false));});
})();

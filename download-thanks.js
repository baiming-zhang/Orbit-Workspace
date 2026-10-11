(() => {
 let timer,card,closeTimer,highlightTimer;
 const reducedMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 function revealNotice(){
  const notice=document.getElementById('windows-security');if(!notice)return;
  const prompt=notice.querySelector('.security-download-prompt');if(prompt)prompt.hidden=false;
  clearTimeout(highlightTimer);notice.classList.remove('security-highlight');void notice.offsetWidth;notice.classList.add('security-highlight');
  notice.scrollIntoView({behavior:reducedMotion()?'instant':'smooth',block:'start'});
  highlightTimer=setTimeout(()=>notice.classList.remove('security-highlight'),5200);
 }
 function close(animated=false){
  clearTimeout(timer);clearTimeout(closeTimer);const current=card;if(!current)return;
  if(!animated){current.remove();card=null;return;}
  current.classList.add('thanks-leaving');
  closeTimer=setTimeout(()=>{if(card!==current)return;current.remove();card=null;},reducedMotion()?0:240);
 }
 function show(){
  close();card=document.createElement('aside');card.className='download-thanks';card.setAttribute('role','status');card.setAttribute('aria-live','polite');
  card.innerHTML='<div class="thanks-card"><button class="thanks-close" type="button" aria-label="Close" data-i18n-aria-label="thanksClose">×</button><div class="thanks-mascot" aria-hidden="true"><svg viewBox="0 0 80 80"><circle cx="40" cy="40" r="24" fill="#e8f0fe" stroke="#3c83e9" stroke-width="3"/><ellipse cx="40" cy="40" rx="36" ry="12" transform="rotate(-25 40 40)" fill="none" stroke="#dc667e" stroke-width="3"/><circle cx="34" cy="35" r="2.3" fill="#34526f"/><circle cx="47" cy="35" r="2.3" fill="#34526f"/><path d="M35 44Q40 50 46 44" fill="none" stroke="#34526f" stroke-width="2.5" stroke-linecap="round"/><circle cx="28" cy="41" r="3.5" fill="#f8bbc7"/><circle cx="52" cy="41" r="3.5" fill="#f8bbc7"/></svg><span>✦</span></div><h2 data-i18n="thanksTitle">You found a little treasure!</h2><p data-i18n="thanksBody">Thanks for choosing Orbit. May your day be full of bright ideas ✨</p></div>';
  for(let i=0;i<16;i++){const p=document.createElement('span');p.className='thanks-particle';p.setAttribute('aria-hidden','true');p.textContent=['✦','♥','•'][i%3];p.style.setProperty('--dx',(Math.random()*360-180)+'px');p.style.setProperty('--dy',(Math.random()*240-180)+'px');p.style.setProperty('--turn',(Math.random()*140-70)+'deg');p.style.setProperty('--delay',(Math.random()*150)+'ms');p.style.color=['#3c83e9','#dc667e','#e9b52d'][i%3];card.append(p);}
  document.body.append(card);card.querySelector('.thanks-close').addEventListener('click',()=>close(true));window.OrbitI18n.apply();revealNotice();timer=setTimeout(()=>close(true),3800);
 }
 document.querySelectorAll('a.download').forEach(link=>link.addEventListener('click',show));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')close(true);});
})();

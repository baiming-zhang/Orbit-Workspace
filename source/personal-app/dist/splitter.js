const handle=document.querySelector('#handle');let pointer=null;
const send=(action,value)=>window.orbitSplit.drag(action,value).catch(()=>{});
window.orbitSplit.onState(state=>{document.body.classList.toggle('dragging',state.dragging);handle.style.left=state.x+'px';handle.setAttribute('aria-valuenow',Math.round(state.ratio*100));});
handle.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();pointer=event.pointerId;handle.setPointerCapture(pointer);send('start',event.screenX);};
addEventListener('pointermove',event=>{if(pointer===event.pointerId)send('move',event.screenX);});
function end(event){if(pointer===null||event&&event.pointerId!==pointer)return;const previous=pointer;pointer=null;if(handle.hasPointerCapture(previous))handle.releasePointerCapture(previous);send('end');}
addEventListener('pointerup',end);addEventListener('pointercancel',end);handle.addEventListener('lostpointercapture',end);addEventListener('blur',()=>end());
handle.ondblclick=()=>send('reset');handle.onkeydown=event=>{if(['ArrowLeft','ArrowRight','Home'].includes(event.key)){event.preventDefault();send(event.key==='Home'?'reset':'step',event.key==='ArrowLeft'?-.02:.02);}};

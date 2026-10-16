(function(root){
 'use strict';
 const types=new Set(['pen','text','rect','ellipse','line','arrow','triangle','diamond','highlight','underline']);
 function clean(input){if(!input||!types.has(input.type)||!Number.isInteger(input.page)||input.page<0||input.page>100000)throw Error('Invalid annotation');
  const point=p=>{if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('Invalid annotation position');return [...p];};
  if(!Array.isArray(input.points)||input.points.length<1||input.points.length>2000)throw Error('Invalid annotation path');
  const color=/^#[0-9a-f]{6}$/i.test(input.color||'')?input.color:'#d1495b',width=Math.max(.5,Math.min(30,Number(input.width)||2)),size=Math.max(6,Math.min(96,Number(input.size)||16));
  return {id:String(input.id||'').slice(0,100),type:input.type,page:input.page,points:input.points.map(point),color,width,size,text:String(input.text||'').slice(0,4000)};
 }
 function arrow(a,b,width=2){const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);if(length<.01)return [a,b];const ux=dx/length,uy=dy/length,nx=-uy,ny=ux,head=Math.min(length*.42,Math.max(length*.22,14,width*6)),headWidth=Math.min(length*.55,Math.max(length*.24,14,width*7)),shaft=Math.min(headWidth*.42,Math.max(3,width*2.4)),neck=[b[0]-ux*head,b[1]-uy*head];return [a,[neck[0]-nx*shaft/2,neck[1]-ny*shaft/2],[neck[0]-nx*headWidth/2,neck[1]-ny*headWidth/2],b,[neck[0]+nx*headWidth/2,neck[1]+ny*headWidth/2],[neck[0]+nx*shaft/2,neck[1]+ny*shaft/2]];}
 function polygon(type,a,b,width=2){const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),w=Math.abs(b[0]-a[0]),h=Math.abs(b[1]-a[1]);if(type==='arrow')return arrow(a,b,width);if(type==='triangle')return [[x+w/2,y],[x+w,y+h],[x,y+h]];if(type==='diamond')return [[x+w/2,y],[x+w,y+h/2],[x+w/2,y+h],[x,y+h/2]];return [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];}
 function rotate(p,r){r=((r%4)+4)%4;return r===1?[1-p[1],p[0]]:r===2?[1-p[0],1-p[1]]:r===3?[p[1],1-p[0]]:[...p];}
 const api={clean,arrow,polygon,rotate};if(typeof module!=='undefined')module.exports=api;else root.OrbitPdfMarkup=api;
})(globalThis);

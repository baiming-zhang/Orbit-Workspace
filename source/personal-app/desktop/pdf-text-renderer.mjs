import * as pdfjs from './vendor/pdfjs/pdf.mjs';
import * as worker from './vendor/pdfjs/pdf.worker.mjs';
globalThis.pdfjsWorker=worker;
const documents=new Map();
window.orbitPdfTextPage=async(key,base64,index)=>{
 let pdf=documents.get(key);
 if(!pdf){
  const data=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  pdf=await pdfjs.getDocument({data,isEvalSupported:false,enableXfa:false,useSystemFonts:true,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href}).promise;
  documents.set(key,pdf);if(documents.size>2){const first=documents.keys().next().value;await documents.get(first).destroy();documents.delete(first);}
 }
 const page=await pdf.getPage(index+1),viewport=page.getViewport({scale:1}),content=await page.getTextContent(),result=[];
 for(const item of content.items){
  if(!item.str?.trim())continue;const style=content.styles[item.fontName]||{},t=pdfjs.Util.transform(viewport.transform,item.transform),height=Math.hypot(t[2],t[3]),angle=Math.atan2(t[1],t[0])+(style.vertical?Math.PI/2:0),ascent=height*(style.ascent??.8);
  result.push({text:item.str,x:(t[4]+ascent*Math.sin(angle))/viewport.width,y:(t[5]-ascent*Math.cos(angle))/viewport.height,width:(style.vertical?item.height:item.width)/viewport.width,height:height/viewport.height,angle:angle*180/Math.PI,font:style.fontFamily||'sans-serif'});
 }
 return result;
};
window.orbitPdfTextReady=true;

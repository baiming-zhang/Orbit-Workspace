'use strict';
const fs=require('node:fs'),path=require('node:path');
const {PDFDocument,PDFName,PDFHexString,PDFString,PDFArray,rgb,degrees,LineCapStyle}=require('./vendor/pdf-lib.cjs');
const fontkit=require('./vendor/pdf-fontkit.cjs');
const model=require('./pdf-markup-model.js');
let fontBytes;
async function exportMarkup(bytes,input){
 if(!Array.isArray(input)||input.length>10000)throw Error('Too many annotations');
 const annotations=input.map(model.clean),pdf=await PDFDocument.load(bytes);pdf.registerFontkit({create:bytes=>{const f=fontkit.create(bytes);return f.getVariation?f.getVariation({wght:400}):f;}});
 let font;if(annotations.some(a=>a.type==='text')){fontBytes ||= fs.readFileSync(path.join(__dirname,'assets/NotoSansSC.ttf'));font=await pdf.embedFont(fontBytes,{subset:true});}
 for(const a of annotations){const target=pdf.getPage(a.page),crop=target.getCropBox(),page=pdf.addPage([target.getWidth(),target.getHeight()]);page.setRotation(target.getRotation());const rotation=((target.getRotation().angle%360)+360)%360/90,viewWidth=rotation%2?crop.height:crop.width,viewHeight=rotation%2?crop.width:crop.height;
  const base=p=>[p[0]*viewWidth,p[1]*viewHeight],project=p=>{const q=model.rotate([p[0]/viewWidth,p[1]/viewHeight],4-rotation);return {x:crop.x+q[0]*crop.width,y:crop.y+(1-q[1])*crop.height};},color=rgb(...[1,3,5].map(i=>parseInt(a.color.slice(i,i+2),16)/255));
  const pts=a.points.map(base),first=pts[0],last=pts[pts.length-1]||first;
  const line=(points,width=a.width)=>{for(let i=1;i<points.length;i++)page.drawLine({start:project(points[i-1]),end:project(points[i]),thickness:width,color,lineCap:LineCapStyle.Round});};
  const shape=(points,fill=false,opacity=1)=>{const projected=points.map(project),p=projected[0],svg='M '+p.x+' '+(-p.y)+' '+projected.slice(1).map(q=>'L '+q.x+' '+(-q.y)).join(' ')+' Z';page.drawSvgPath(svg,{x:0,y:0,...(fill?{color,opacity}:{borderColor:color,borderWidth:a.width})});};
  if(a.type==='text'){const lines=a.text.split('\n');for(let i=0;i<lines.length;i++){const p=project([first[0],first[1]+(i+1)*a.size*1.25]);page.drawText(lines[i],{...p,font,size:a.size,color,rotate:degrees(page.getRotation().angle)});}}
  else if(a.type==='pen')line(pts);
  else if(a.type==='line'||a.type==='underline')line([first,last]);
  else if(a.type==='ellipse'){const cx=(first[0]+last[0])/2,cy=(first[1]+last[1])/2,rx=Math.abs(last[0]-first[0])/2,ry=Math.abs(last[1]-first[1])/2;line(Array.from({length:65},(_,i)=>[cx+rx*Math.cos(i*Math.PI/32),cy+ry*Math.sin(i*Math.PI/32)]));}
  else shape(model.polygon(a.type,first,last,a.width,a),a.type==='arrow'||a.type==='highlight',a.opacity);
  // Each markup is a separate PDF annotation, with its own vector appearance and editable data.
  let boundary=pts;if(a.type==='text'){const lines=a.text.split('\n'),w=Math.max(...lines.map(text=>font.widthOfTextAtSize(text,a.size)),a.size),h=(lines.length*1.25+.3)*a.size;boundary=[[first[0],first[1]],[first[0]+w,first[1]],[first[0]+w,first[1]+h],[first[0],first[1]+h]];}else if(['arrow','rect','triangle','diamond','highlight'].includes(a.type))boundary=model.polygon(a.type,first,last,a.width,a);else if(a.type==='ellipse')boundary=[[Math.min(first[0],last[0]),Math.min(first[1],last[1])],[Math.max(first[0],last[0]),Math.max(first[1],last[1])]];
  const projected=boundary.map(project),pad=a.width+2,bbox=[Math.min(...projected.map(p=>p.x))-pad,Math.min(...projected.map(p=>p.y))-pad,Math.max(...projected.map(p=>p.x))+pad,Math.max(...projected.map(p=>p.y))+pad],appearance=pdf.context.register(pdf.context.flateStream(page.getContentStream().getUnencodedContents(),{Type:'XObject',Subtype:'Form',FormType:1,BBox:bbox,Resources:page.node.Resources()}));
  const annotation=pdf.context.register(pdf.context.obj({Type:'Annot',Subtype:a.type==='text'?'FreeText':'Stamp',Rect:bbox,F:4,NM:PDFString.of('OrbitMarkup:'+a.id),T:PDFString.of('Orbit'),Contents:PDFHexString.fromText(a.text||a.type),AP:{N:appearance},OrbitMarkup:PDFHexString.fromText(JSON.stringify(a)),...(a.type==='text'?{DA:PDFString.of('/Helv '+a.size+' Tf 0 g')}:{} )}));
  let annots=target.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(!annots){annots=pdf.context.obj([]);target.node.set(PDFName.of('Annots'),annots);}annots.push(annotation);pdf.removePage(pdf.getPageCount()-1);
 }
 pdf.catalog.set(PDFName.of('OrbitMarkup'),PDFHexString.fromText(JSON.stringify({version:1,items:annotations})));
 return Buffer.from(await pdf.save({useObjectStreams:false}));
}
async function extractMarkup(bytes){if(!Buffer.from(bytes).includes(Buffer.from('/OrbitMarkup')))return null;const pdf=await PDFDocument.load(bytes),stored=pdf.catalog.get(PDFName.of('OrbitMarkup'));if(!stored)return null;let payload;try{payload=JSON.parse(stored.decodeText());}catch{return null;}if(payload.version!==1||!Array.isArray(payload.items))return null;const items=payload.items.map(model.clean);for(const page of pdf.getPages()){const annots=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(!annots)continue;for(let i=annots.size()-1;i>=0;i--){const annotation=pdf.context.lookup(annots.get(i));if(annotation?.has?.(PDFName.of('OrbitMarkup')))annots.remove(i);}}pdf.catalog.delete(PDFName.of('OrbitMarkup'));return {items,bytes:Buffer.from(await pdf.save())};}
async function clearDocumentAnnotations(bytes){const pdf=await PDFDocument.load(bytes);let removed=0;for(const page of pdf.getPages()){const annots=page.node.lookupMaybe(PDFName.of('Annots'),PDFArray);if(!annots)continue;for(let i=annots.size()-1;i>=0;i--){const a=pdf.context.lookup(annots.get(i)),type=a?.get?.(PDFName.of('Subtype'))?.toString();if(type&&type!=='/Widget'&&type!=='/Link'){annots.remove(i);removed++;}}}pdf.catalog.delete(PDFName.of('OrbitMarkup'));return {bytes:Buffer.from(await pdf.save()),removed};}
module.exports={exportMarkup,extractMarkup,clearDocumentAnnotations};

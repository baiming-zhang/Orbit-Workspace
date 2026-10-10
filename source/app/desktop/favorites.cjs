'use strict';
const {nativeImage}=require('electron');
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const maxBytes=20*1024*1024;
async function imageBytes(wc,params){
 const src=String(params.srcURL||'');
 // Reading the rendered image also handles data/blob images without changing the clipboard.
 const frame=params.frame||wc.mainFrame;
 try{
  const data=await frame.executeJavaScript(`(()=>{const source=${JSON.stringify(src)};const image=[...document.images].find(e=>e.currentSrc===source||e.src===source);const node=image||document.elementFromPoint(${Number(params.x)||0},${Number(params.y)||0});if(!node||!['IMG','CANVAS'].includes(node.tagName))return null;const w=node.naturalWidth||node.width,h=node.naturalHeight||node.height;if(!w||!h||w*h>40000000)throw Error('Image too large');const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;canvas.getContext('2d').drawImage(node,0,0);return canvas.toDataURL('image/png');})()`);
  if(data?.startsWith('data:image/png;base64,')){const bytes=Buffer.from(data.split(',')[1],'base64');if(bytes.length>maxBytes)throw Error('Image too large');return bytes;}
 }catch{}
 let bytes;
 if(src.startsWith('data:image/')){bytes=Buffer.from(src.slice(0,src.indexOf(',')).endsWith(';base64')?src.slice(src.indexOf(',')+1):decodeURIComponent(src.slice(src.indexOf(',')+1)),src.slice(0,src.indexOf(',')).endsWith(';base64')?'base64':'utf8');}
 else{
  const url=new URL(src);if(url.username||url.password||!['http:','https:','file:','orbit:'].includes(url.protocol))throw Error('Unable to read this image.');
  const response=await wc.session.fetch(src,{credentials:'include',signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Unable to read this image.');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes)throw Error('Image is too large to save.');chunks.push(Buffer.from(value));}}finally{await reader.cancel().catch(()=>{});}
  bytes=Buffer.concat(chunks);
 }
 if(bytes.length>maxBytes)throw Error('Image is too large to save.');const image=nativeImage.createFromBuffer(bytes);if(image.isEmpty())throw Error('Unable to read this image.');const {width,height}=image.getSize();if(width*height>40000000)throw Error('Image is too large to save.');return image.toPNG();
}
function selectedContent(wc,params){
 const image=['image','canvas'].includes(params.mediaType)&&(params.hasImageContents||params.srcURL||params.mediaType==='canvas');
 const text=String(params.selectionText||'');if(!image&&!text.trim())return null;
 return {kind:image?'image':'text',text:image?String(params.altText||params.titleText||''):text,sourceUrl:params.pageURL||wc.getURL(),title:wc.getTitle()||params.pageURL||wc.getURL(),imageUrl:image?String(params.srcURL||''):null};
}
function createFavorites({app,getLanguage=()=> 'en',onChange=()=>{}}){
 const directory=path.join(app.getPath('userData'),'favorite-assets'),file=path.join(app.getPath('userData'),'favorites.json');let items=[];
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en;
 try{const data=JSON.parse(fs.readFileSync(file,'utf8'));items=(Array.isArray(data)?data:data.items||[]).filter(item=>typeof item.id==='string'&&/^[\da-f-]{36}$/.test(item.id)&&['text','image'].includes(item.kind));}catch{}
 const list=()=>({ok:true,items:items.map(item=>({...item,image:item.kind==='image'?'orbit://favorites/'+item.id+'.png':null})),language:getLanguage()});
 function save(next){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify({version:1,items:next},null,2));fs.renameSync(file+'.tmp',file);items=next;onChange(list());}
 async function add(wc,params){
  const content=selectedContent(wc,params);if(!content)throw Error(tr('Select text or an image first.','请先选择文字或图片。'));if(content.text.length>100000)throw Error(tr('This selection is too long to save.','所选文字过长，无法收藏。'));
  if(items.length>=2000)throw Error(tr('Favorites is full. Remove an item first.','收藏已满，请先删除一项。'));
  const item={id:crypto.randomUUID(),...content,createdAt:new Date().toISOString()};
  if(item.kind==='image'){const bytes=await imageBytes(wc,params);fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(path.join(directory,item.id+'.png'),bytes);}
  try{save([item,...items]);}catch(error){if(item.kind==='image')fs.rmSync(path.join(directory,item.id+'.png'),{force:true});throw error;}
  return {ok:true,item:list().items[0]};
 }
 function imagePath(id){if(!/^[\da-f-]{36}$/.test(id)||!items.some(item=>item.id===id&&item.kind==='image'))return null;return path.join(directory,id+'.png');}
 function remove(id){const item=items.find(item=>item.id===id);if(!item)throw Error(tr('Favorite not found.','未找到收藏。'));save(items.filter(item=>item.id!==id));if(item.kind==='image')fs.rmSync(path.join(directory,id+'.png'),{force:true});return list();}
 return {add,list,remove,imagePath};
}
module.exports={createFavorites,imageBytes,selectedContent};

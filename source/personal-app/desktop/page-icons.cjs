const {nativeImage}=require('electron');
const MAX_BYTES=2*1024*1024;
function embeddedPng(bytes){
 if(bytes.length<6||bytes.readUInt16LE(0)!==0||bytes.readUInt16LE(2)!==1)return null;
 const count=bytes.readUInt16LE(4);if(!count||count>256||6+count*16>bytes.length)return null;
 const entries=[];for(let i=0;i<count;i++){const n=6+i*16,size=bytes.readUInt32LE(n+8),offset=bytes.readUInt32LE(n+12),width=bytes[n]||256;if(size<8||offset<6+count*16||offset+size>bytes.length)continue;const data=bytes.subarray(offset,offset+size);if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))entries.push({data,width});}
 entries.sort((a,b)=>Math.abs(Math.log2(a.width/32))-Math.abs(Math.log2(b.width/32)));return entries[0]?.data||null;
}
function createPageIcons({render}){
 const caches=new WeakMap();
 async function load(wc,url){
  if(typeof url!=='string'||url.length>MAX_BYTES*2||!(/^(https?:\/\/|data:image\/)/i.test(url)))return '';
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);
  try{
   const response=await wc.session.fetch(url,{signal:controller.signal,credentials:'include',headers:{'User-Agent':wc.getUserAgent()}});
   if(!response.ok||Number(response.headers.get('content-length'))>MAX_BYTES)return '';
   const reader=response.body.getReader(),chunks=[];let length=0;
   for(;;){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();return '';}chunks.push(Buffer.from(value));}
   const bytes=Buffer.concat(chunks);if(!bytes.length)return '';
   let image=nativeImage.createFromBuffer(embeddedPng(bytes)||bytes);
   if(image.isEmpty()){
    const mime=(response.headers.get('content-type')||'').split(';')[0].trim();
    const type=/^image\/[a-z0-9.+-]+$/i.test(mime)?mime:/\.svg(?:[?#]|$)/i.test(url)?'image/svg+xml':'image/x-icon';
    const png=await render('data:'+type+';base64,'+bytes.toString('base64'));
    image=nativeImage.createFromDataURL(png||'');
   }
   if(image.isEmpty())return '';
   const {width,height}=image.getSize();if(!width||!height||Math.max(width,height)>4096)return '';
   const scale=32/Math.max(width,height);
   return image.resize({width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))}).toDataURL();
  }catch{return '';}finally{clearTimeout(timer);}
 }
 function get(wc,url){let cache=caches.get(wc.session);if(!cache){cache=new Map();caches.set(wc.session,cache);}if(cache.has(url))return cache.get(url);if(cache.size>=100)cache.delete(cache.keys().next().value);const pending=load(wc,url);cache.set(url,pending);pending.then(value=>{if(!value)cache.delete(url);});return pending;}
 async function read(wc,urls){const candidates=[...new Set(Array.isArray(urls)?urls:[])].slice(0,8);if(!candidates.length)return '';try{return await Promise.any(candidates.map(async url=>{const icon=await get(wc,url);if(!icon)throw Error('No icon');return icon;}));}catch{return '';}}
 return {read};
}
module.exports={createPageIcons};

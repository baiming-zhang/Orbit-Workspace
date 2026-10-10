const {nativeImage}=require('electron');
function createGoogleProfile({api,connected,generation,fetchImage=globalThis.fetch}){
 let cache=null;const allowed=url=>{try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&/(^|\.)(googleusercontent\.com|google\.com|ggpht\.com)$/.test(u.hostname);}catch{return false;}};
 async function get(){if(!connected())return null;const stamp=generation();if(cache?.stamp===stamp&&cache.expires>Date.now())return cache.profile;let profile;
  try{const value=await api('https://openidconnect.googleapis.com/v1/userinfo');profile={name:String(value.name||value.given_name||'').trim().slice(0,100),picture:'',status:'success',needsPermission:false};
   if(value.picture&&allowed(value.picture)){try{const response=await fetchImage(value.picture,{signal:AbortSignal.timeout(7000)});if(!response.ok||(response.url&&!allowed(response.url)))throw Error();const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>2*1024*1024)throw Error();chunks.push(Buffer.from(chunk));}let image=nativeImage.createFromBuffer(Buffer.concat(chunks));if(!image.isEmpty()){const {width,height}=image.getSize(),edge=Math.min(width,height);image=image.crop({x:Math.floor((width-edge)/2),y:Math.floor((height-edge)/2),width:edge,height:edge}).resize({width:256,height:256,quality:'best'});profile.picture=image.toDataURL();}}catch{}}
  }catch(error){profile={name:'',picture:'',status:'unavailable',needsPermission:error.status===403};}
  if(stamp!==generation())return null;cache={stamp,profile,expires:Date.now()+(profile.status==='success'?300000:60000)};return profile;
 }
 return {get};
}
module.exports={createGoogleProfile};

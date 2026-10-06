const portals=require('../dist/shortcuts.js');
const serviceHosts=new Set([...portals.map(p=>new URL(p.url).hostname),'mail.google.com','calendar.google.com','analytics.google.com','www.google.com','artsandculture.google.com','zoom.us','zoom.com']);
function zoomHost(host){return host==='zoom.us'||host.endsWith('.zoom.us')||host==='zoom.com'||host.endsWith('.zoom.com');}
function parseMeetingLink(value){
  if(typeof value!=='string'||value.length>2048)return null;
  let url;try{url=new URL(value.trim());}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port||!zoomHost(url.hostname))return null;
  if(!/^\/(?:j|my|wc\/join)\/[^/]+\/?$/.test(url.pathname))return null;
  return url.href;
}
function externalUrl(value){
  if(typeof value!=='string'||value.length>4096)return null;
  let url;try{url=new URL(value);}catch{return null;}
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  if(!serviceHosts.has(url.hostname)&&!zoomHost(url.hostname))return null;
  return url.href;
}
function zoomAppUrl(value){
  const parsed=parseMeetingLink(value);if(!parsed)return null;
  const url=new URL(parsed);
  const id=url.pathname.match(/^\/(?:j|wc\/join)\/(\d{9,11})\/?$/)?.[1];
  if(!id)return null;
  const deep=new URL('zoommtg://zoom.us/join');
  deep.searchParams.set('action','join');deep.searchParams.set('confno',id);
  const pwd=url.searchParams.get('pwd');if(pwd)deep.searchParams.set('pwd',pwd);
  return deep.href;
}
module.exports={parseMeetingLink,externalUrl,zoomAppUrl};

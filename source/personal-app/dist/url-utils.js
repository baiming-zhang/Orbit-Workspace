(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OrbitUrl=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
 function normalizeWebUrl(value){
  if(typeof value!=='string')throw Error('Invalid address.');
  let raw=value.trim();if(!raw||raw.length>16384||/\s/.test(raw))throw Error('Invalid address.');
  if(raw.startsWith('//'))raw='https:'+raw;
  else if(!/^[a-z][a-z\d+.-]*:/i.test(raw)||/^(?:localhost|[^/?#:\s]+\.[^/?#:\s]+):\d+(?:[/?#]|$)/i.test(raw)||raw.startsWith('['))raw='https://'+raw;
  const url=new URL(raw);if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password||url.href.length>16384)throw Error('Invalid address.');return url.href;
 }
 function isWebsiteAddress(value){return /^(?:\/\/|localhost(?::\d+)?(?:[/?#]|$)|\[[0-9a-f:]+\](?::\d+)?(?:[/?#]|$)|[^/?#:\s]+\.[^/?#:\s]+(?::\d+)?(?:[/?#]|$))/i.test(value);}
 return {normalizeWebUrl,isWebsiteAddress};
});

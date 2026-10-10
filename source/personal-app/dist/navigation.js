(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./shortcuts.js'):(typeof shortcuts==='undefined'?[]:shortcuts));if(typeof module==='object'&&module.exports)module.exports=api;else root.OrbitNavigation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(portals){
 const defaults=[
  {id:'pdf',name:'PDF 阅读',internal:true,iconKey:'archive'},
  {id:'browser',name:'浏览器',internal:true,iconKey:'search'},
  {id:'overview',name:'概览',internal:true,iconKey:'grid'},
  {id:'gmail',name:'Gmail',url:'https://mail.google.com/mail/u/0/',iconKey:'mail'},
  {id:'calendar',name:'日历',url:'https://calendar.google.com/',iconKey:'calendar'},
  {id:'analytics',name:'Analytics',url:'https://analytics.google.com/',iconKey:'chart'},
  {id:'search',name:'Google 搜索',url:'https://www.google.com/',iconKey:'search'},
  {id:'zoom',name:'Zoom 会议',internal:true,iconKey:'video'},
  {id:'applications',name:'PhD&MS',internal:true,iconKey:'calendar'},
  {id:'chatgpt',name:'ChatGPT',url:'https://chatgpt.com/',iconSrc:'assets/chatgpt-logo.svg'},
  {id:'orbit-project',name:'Orbit Workspace',url:'https://baiming-zhang.github.io/Orbit-Workspace/',iconSrc:'assets/orbit-logo.png'},
  ...(portals||[]).map(p=>({id:p.id,name:p.name,url:p.url,iconSrc:p.logo,shortcut:true}))
 ];
 function initial(name){const text=String(name||'').trim();if(!text)return '?';const first=typeof Intl.Segmenter==='function'?[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)][0].segment:Array.from(text)[0];return first.toLocaleUpperCase();}
 function restoreRequired(items){const restored=items.map(item=>({...item}));for(const item of defaults.filter(d=>['calendar','analytics'].includes(d.id))){if(restored.some(d=>d.id===item.id))continue;const preceding=defaults.slice(0,defaults.findIndex(d=>d.id===item.id)).reverse().find(d=>restored.some(r=>r.id===d.id));const at=preceding?restored.findIndex(d=>d.id===preceding.id)+1:0;restored.splice(at,0,{...item,iconData:'',custom:false});}return restored;}
 return {defaults,initial,restoreRequired};
});

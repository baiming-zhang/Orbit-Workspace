const {app,Menu,clipboard}=require('electron');
const OrbitI18n=require('../dist/i18n.js');
const fs=require('node:fs'),path=require('node:path');
const tones={white:{label:'白色',color:'#ffffff'},blue:{label:'浅蓝',color:'#f1f6fc'},green:{label:'浅绿',color:'#f2f8f3'},yellow:{label:'浅黄',color:'#fcf9ef'},red:{label:'浅红',color:'#fcf2f1'}};
const viewerOrigin='chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/';
function createPdfStyle({getWindow,getLanguage=()=> 'en'}){
 const t=value=>OrbitI18n.text(value,getLanguage());
 const preference=path.join(app.getPath('userData'),'pdf-preferences.json'),script=fs.readFileSync(path.join(__dirname,'pdf-chrome.js'),'utf8'),contents=new Map();let tone='blue';
 try{const saved=JSON.parse(fs.readFileSync(preference,'utf8'));if(tones[saved.background])tone=saved.background;}catch{}
 function repaint(wc){if(wc.isDestroyed())return;const color=(0xff000000|parseInt(tones[tone].color.slice(1),16))>>>0;for(const frame of wc.mainFrame.framesInSubtree){if(!frame.parent?.url.startsWith(viewerOrigin))continue;
  // The inner PDF renderer caches the colors of its gutters. Update its actual
  // plugin and briefly resize it so Chromium recalculates those background parts.
  frame.executeJavaScript(`(()=>{const plugin=document.querySelector('embed[type="application/x-google-chrome-pdf"]');if(typeof plugin?.postMessage!=='function')return false;plugin.postMessage({type:'setBackgroundColor',color:${color}});const previous=plugin.style.width;plugin.style.width=Math.max(1,plugin.getBoundingClientRect().width-2)+'px';setTimeout(()=>{if(plugin.isConnected)plugin.style.width=previous;},120);return true;})()`).catch(()=>{});
 }}
 function apply(wc){if(wc.isDestroyed())return;for(const frame of wc.mainFrame.framesInSubtree){if(frame.url.startsWith(viewerOrigin))frame.executeJavaScript('window.__orbitPdfBackground='+JSON.stringify(tones[tone].color)+';'+script).then(changed=>{if(changed)repaint(wc);}).catch(()=>{});}}
 function choose(value){if(!tones[value])return;tone=value;fs.mkdirSync(path.dirname(preference),{recursive:true});fs.writeFileSync(preference+'.tmp',JSON.stringify({background:tone}));fs.renameSync(preference+'.tmp',preference);for(const wc of contents.keys())apply(wc);}
 function attach(wc,view){
  contents.set(wc,view);wc.once('destroyed',()=>contents.delete(wc));
  wc.on('did-frame-finish-load',()=>{for(const delay of [0,150,700,1800])setTimeout(()=>apply(wc),delay).unref?.();});
  wc.on('context-menu',(event,params)=>{
   if(!wc.mainFrame.framesInSubtree.some(frame=>frame.url.startsWith(viewerOrigin)))return;
   const items=[];if(params.selectionText)items.push({label:t('复制'),role:'copy'},{type:'separator'});if(params.linkURL)items.push({label:t('复制链接地址'),click:()=>clipboard.writeText(params.linkURL)},{type:'separator'});
   event.preventDefault();Menu.buildFromTemplate([...items,{label:t('阅读背景'),enabled:false},{type:'separator'},...Object.entries(tones).map(([id,item])=>({id:'pdf-background-'+id,label:t(item.label),type:'radio',checked:tone===id,click:()=>choose(id)}))]).popup({window:getWindow()});
  });
 }
 return {attach,apply,choose,get:()=>tone};
}
module.exports={createPdfStyle,tones};

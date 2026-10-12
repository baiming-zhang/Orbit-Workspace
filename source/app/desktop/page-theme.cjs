'use strict';
const fs=require('node:fs'),path=require('node:path'),palette=require('../dist/theme-palette.js');
function installPageTheme({app,nativeTheme}){
 const script=fs.readFileSync(path.join(__dirname,'page-dark.js'),'utf8'),entries=new Map();
 const isPdf=wc=>/\.pdf(?:[?#]|$)/i.test(wc.getURL())||wc.mainFrame.framesInSubtree.some(f=>f.url.startsWith('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/'));
 async function prepare(entry,address){const wc=entry.wc;if(wc.isDestroyed())return;const dark=nativeTheme.shouldUseDarkColors;
  try{if(!wc.debugger.isAttached()&&!wc.isDevToolsOpened())wc.debugger.attach('1.3');if(wc.debugger.isAttached()){await wc.debugger.sendCommand('Page.enable');
   await wc.debugger.sendCommand('Emulation.setAutoDarkModeOverride',{enabled:dark&&/^(https?:|file:)/.test(address)&&!(/\.pdf(?:[?#]|$)/i.test(address)||isPdf(wc)&&address===wc.getURL())});
   if(!entry.scriptId||entry.dark!==dark){if(entry.scriptId)await wc.debugger.sendCommand('Page.removeScriptToEvaluateOnNewDocument',{identifier:entry.scriptId}).catch(()=>{});entry.scriptId=(await wc.debugger.sendCommand('Page.addScriptToEvaluateOnNewDocument',{source:'window.__orbitPageDark='+dark+';'+script})).identifier;entry.dark=dark;}
  }}catch{}
 }
 async function paint(entry){const wc=entry.wc;if(wc.isDestroyed())return;const address=wc.getURL();await prepare(entry,address);if(wc.isDestroyed()||wc.getURL()!==address||isPdf(wc)||!/^(https?:|file:)/.test(address))return;const dark=nativeTheme.shouldUseDarkColors;for(const frame of wc.mainFrame.framesInSubtree)if(/^(https?:|file:)/.test(frame.url))frame.executeJavaScript('window.__orbitPageDark='+dark+';'+script).catch(()=>{});}
 function apply(entry){entry.queue=(entry.queue||Promise.resolve()).catch(()=>{}).then(()=>paint(entry));}
 function attach(_event,wc){const entry={wc,queue:null,scriptId:null};entries.set(wc,entry);
  // Register the initial document style before the first navigation can paint.
  const loadURL=wc.loadURL.bind(wc);wc.loadURL=(address,options)=>{if(!/^https?:/.test(address))return loadURL(address,options);const ready=(entry.queue||Promise.resolve()).catch(()=>{}).then(async()=>{if(!wc.getURL())await loadURL('about:blank');await prepare(entry,address);});entry.queue=ready;return ready.then(()=>loadURL(address,options));};
  wc.on('dom-ready',()=>{if(wc.getURL()!=='about:blank')apply(entry);});wc.on('did-frame-finish-load',()=>{if(wc.getURL()!=='about:blank')apply(entry);});wc.on('devtools-closed',()=>apply(entry));wc.debugger.on('detach',()=>{entry.scriptId=null;});wc.once('destroyed',()=>entries.delete(wc));
 }
 app.on('web-contents-created',attach);
 const background=win=>{if(!win.isDestroyed())win.setBackgroundColor(palette[nativeTheme.shouldUseDarkColors?'dark':'light'].bg);};
 const newWindow=(_event,win)=>background(win);app.on('browser-window-created',newWindow);
 const refresh=()=>{for(const entry of entries.values())apply(entry);for(const win of require('electron').BrowserWindow.getAllWindows())background(win);};nativeTheme.on('updated',refresh);
 return {refresh,dispose(){app.removeListener('web-contents-created',attach);app.removeListener('browser-window-created',newWindow);nativeTheme.removeListener('updated',refresh);entries.clear();}};
}
module.exports={installPageTheme};

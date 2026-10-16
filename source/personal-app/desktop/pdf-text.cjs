'use strict';
const {BrowserWindow}=require('electron'),path=require('node:path'),crypto=require('node:crypto');
function createPdfTextReader(){
 let win=null,opening=null;const known=new Set();
 async function ready(){if(win&&!win.isDestroyed()&&await win.webContents.executeJavaScript('!!window.orbitPdfTextReady'))return;if(opening)return opening;opening=(async()=>{win=new BrowserWindow({show:false,width:640,height:480,webPreferences:{sandbox:true,contextIsolation:true,nodeIntegration:false,backgroundThrottling:false}});win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());await win.loadFile(path.join(__dirname,'pdf-text.html'));for(let i=0;i<100;i++){if(await win.webContents.executeJavaScript('!!window.orbitPdfTextReady'))return;await new Promise(r=>setTimeout(r,30));}throw Error('PDF text reader did not load.');})();try{await opening;}finally{opening=null;}}
 return {async page(bytes,index){await ready();const key=crypto.createHash('sha256').update(bytes).digest('hex'),base64=bytes.toString('base64'),result=await win.webContents.executeJavaScript('window.orbitPdfTextPage('+JSON.stringify(key)+','+JSON.stringify(base64)+','+index+')');known.add(key);return result;},dispose(){known.clear();if(win&&!win.isDestroyed())win.destroy();win=null;}};
}
module.exports={createPdfTextReader};

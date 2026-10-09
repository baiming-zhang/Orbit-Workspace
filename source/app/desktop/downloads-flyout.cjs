'use strict';
const {WebContentsView}=require('electron');
const path=require('node:path');
function createDownloadsFlyout({getWindow,getData,getLanguage,onVisibility=()=>{}}){
 let view=null,ready=false,visible=false,anchor=null,owner=null;
 const state=()=>({...getData(),language:getLanguage()});
 function update(){if(ready&&!view.webContents.isDestroyed())view.webContents.send('orbit:downloads-changed',state());}
 function close(){if(!visible)return {ok:true};visible=false;const win=getWindow(),focused=view.webContents.isFocused();if(win&&!win.isDestroyed()){win.contentView.removeChildView(view);if(focused&&!win.webContents.isDestroyed())win.webContents.focus();}onVisibility(false);return {ok:true};}
 function position(){const win=getWindow();if(!visible||!win||win.isDestroyed())return;const [w,h]=win.getContentSize(),width=Math.min(432,w-16),y=Math.min(Math.max(48,Math.round(anchor.bottom+4)),h-120);view.setBounds({x:Math.max(8,Math.min(w-width-8,Math.round(anchor.right-width+8))),y,width,height:Math.min(528,h-y-8)});}
 function raise(){const win=getWindow();if(visible&&win&&!win.isDestroyed()&&win.contentView.children.at(-1)!==view)win.contentView.addChildView(view);}
 function ensure(){
  if(view)return;
  view=new WebContentsView({webPreferences:{preload:path.join(__dirname,'downloads-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true}});
  view.setBackgroundColor('#00000000');const wc=view.webContents;
  wc.setWindowOpenHandler(()=>({action:'deny'}));wc.on('will-navigate',event=>event.preventDefault());
  wc.on('blur',()=>{if(!getWindow()?.webContents.isFocused())close();});
  wc.once('did-finish-load',()=>{ready=true;update();if(visible)wc.focus();});wc.loadURL('orbit://app/downloads.html').catch(()=>close());
 }
 function show(value){
  if(!value||!Number.isFinite(value.right)||!Number.isFinite(value.bottom))throw Error('Invalid download-panel position.');
  const win=getWindow();if(!win||win.isDestroyed())return {ok:false};anchor={right:value.right,bottom:value.bottom};ensure();
  if(owner!==win){owner=win;win.on('resize',position);win.on('blur',close);win.on('closed',()=>{close();owner=null;});}
  if(!visible){visible=true;win.contentView.addChildView(view);onVisibility(true);}position();raise();update();if(ready)view.webContents.focus();return {ok:true};
 }
 function trusted(event){return !!view&&!view.webContents.isDestroyed()&&event.sender===view.webContents&&event.senderFrame===view.webContents.mainFrame&&event.senderFrame.url==='orbit://app/downloads.html';}
 function dispose(){close();if(view&&!view.webContents.isDestroyed())view.webContents.close();view=null;ready=false;}
 return {show,close,update,raise,trusted,dispose,isVisible:()=>visible,getView:()=>view};
}
module.exports={createDownloadsFlyout};

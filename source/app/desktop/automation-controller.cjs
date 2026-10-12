'use strict';
const fs=require('node:fs'),path=require('node:path'),{BrowserWindow}=require('electron');
const queues=new WeakMap();
function serial(wc,work){const prior=queues.get(wc)||Promise.resolve();const next=prior.catch(()=>{}).then(work);queues.set(wc,next);return next.finally(()=>{if(queues.get(wc)===next)queues.delete(wc);});}
const fault=(code,message,statusCode=400)=>Object.assign(Error(message),{code,statusCode});
function createAutomation({app,getBrowser,getWindow,downloads,favorites,navigation,settings,google,onNavigation=()=>{}}){
 const deadline=promise=>{let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(fault('OPERATION_TIMEOUT','Operation did not finish. Check its state before retrying.',503)),20000);timer.unref();})]).finally(()=>clearTimeout(timer));};
 function window(){const win=getWindow();if(!win||win.isDestroyed())throw fault('WINDOW_UNAVAILABLE','Orbit is not ready.',503);return win;}
 function content(id,expected){const browser=getBrowser();const wc=browser?.views.get(id)?.webContents;if(!wc||wc.isDestroyed())throw fault('PAGE_NOT_FOUND','Open this page in Orbit first.',404);if(typeof expected!=='string'||wc.getURL()!==expected)throw fault('PAGE_CHANGED','Read the current page URL before changing it.',409);return wc;}
 function rootCode(expression){return deadline(window().webContents.mainFrame.executeJavaScript(expression));}
 async function evaluate(wc,input){if(typeof input.expression!=='string'||input.expression.length>4*1024*1024)throw fault('INVALID_SCRIPT','Provide a JavaScript expression of at most 4 MiB.');let frame=wc.mainFrame;if(input.frameId){frame=wc.mainFrame.framesInSubtree.find(f=>f.processId+':'+f.routingId===input.frameId);if(!frame||frame.url!==input.expectedFrameUrl)throw fault('FRAME_CHANGED','Read the current frame URL before editing it.',409);}return {ok:true,value:await deadline(frame.executeJavaScript(input.expression,true)),source:'untrusted-page-result'};}
 async function input(wc,value){
  const owned=!wc.debugger.isAttached();if(owned)wc.debugger.attach('1.3');let host=null,view=null,oldBounds=null;
  try{
   view=[...getBrowser().views.values()].find(v=>v.webContents===wc);if(view&&!window().contentView.children.includes(view)){oldBounds=view.getBounds();host=new BrowserWindow({show:false,focusable:false,skipTaskbar:true,width:1000,height:700,webPreferences:{backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true}});host.contentView.addChildView(view);view.setBounds({x:0,y:0,width:1000,height:700});await new Promise(resolve=>setTimeout(resolve,100));}
   if(wc.getURL()!==value.expectedUrl)throw fault('PAGE_CHANGED','The page changed before input dispatch.',409);await wc.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:true});if(host)wc.focus();
   if(value.kind==='text'){if(typeof value.text!=='string')throw fault('INVALID_TEXT','Provide text.');if(value.selector)await wc.mainFrame.executeJavaScript(`(()=>{const nodes=document.querySelectorAll(${JSON.stringify(value.selector)});if(nodes.length!==1)throw Error('Choose exactly one field.');nodes[0].focus();})()`);await wc.debugger.sendCommand('Input.insertText',{text:value.text});}
   else if(value.kind==='key'){if(typeof value.key!=='string')throw fault('INVALID_KEY','Provide a key.');const keys={Enter:13,Tab:9,Escape:27,Backspace:8,Delete:46,ArrowLeft:37,ArrowRight:39,ArrowUp:38,ArrowDown:40,Home:36,End:35,PageUp:33,PageDown:34,Space:32,Insert:45,Control:17,Shift:16,Alt:18,Meta:91};for(let n=1;n<=24;n++)keys['F'+n]=111+n;const modifiers=(value.alt?1:0)+(value.ctrl?2:0)+(value.meta?4:0)+(value.shift?8:0);const args={key:value.key,code:value.code||value.key,windowsVirtualKeyCode:keys[value.key]||value.key.toUpperCase().charCodeAt(0),modifiers,...(value.key==='Enter'?{text:'\r',unmodifiedText:'\r'}:value.key.length===1&&!value.ctrl&&!value.alt&&!value.meta?{text:value.shift?value.key.toUpperCase():value.key,unmodifiedText:value.key}:{})};await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyDown',...args});await wc.debugger.sendCommand('Input.dispatchKeyEvent',{type:'keyUp',...args});}
   else{
    let point={x:value.x,y:value.y};if(value.selector)point=await wc.mainFrame.executeJavaScript(`(()=>{const nodes=document.querySelectorAll(${JSON.stringify(value.selector)});if(nodes.length!==1)throw Error('Choose exactly one element.');const el=nodes[0];el.scrollIntoView({block:'center',inline:'center'});const r=el.getBoundingClientRect();if(!r.width||!r.height)throw Error('Element has no visible bounds.');return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y))throw fault('INVALID_POINT','Provide a selector or finite x and y coordinates.');
    if(value.kind==='scroll')await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseWheel',...point,deltaX:Number(value.deltaX)||0,deltaY:Number(value.deltaY)||0});
    else if(value.kind==='drag'){let end={x:value.toX,y:value.toY};if(value.toSelector)end=await wc.mainFrame.executeJavaScript(`(()=>{const el=document.querySelector(${JSON.stringify(value.toSelector)});if(!el)throw Error('Target not found');const r=el.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);if(!Number.isFinite(end.x)||!Number.isFinite(end.y))throw fault('INVALID_POINT','Provide a drag destination.');await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});for(let n=1;n<=12;n++){await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseMoved',x:point.x+(end.x-point.x)*n/12,y:point.y+(end.y-point.y)*n/12,button:'left',buttons:1});await new Promise(resolve=>setTimeout(resolve,8));}await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type:'mouseReleased',...end,button:'left',clickCount:1});}
    else if(value.kind==='click'){const button=value.button||'left';if(!['left','right','middle'].includes(button))throw fault('INVALID_BUTTON','Choose left, right or middle.');for(const type of ['mousePressed','mouseReleased'])await wc.debugger.sendCommand('Input.dispatchMouseEvent',{type,...point,button,clickCount:value.count===2?2:1});}
    else throw fault('INVALID_INPUT','Choose click, drag, text, key or scroll.');
   }
   await new Promise(resolve=>setTimeout(resolve,40));return {ok:true,dispatched:true,url:wc.getURL()};
  }finally{if(wc.debugger.isAttached())await wc.debugger.sendCommand('Emulation.setFocusEmulationEnabled',{enabled:false}).catch(()=>{});if(host&&!host.isDestroyed()){host.contentView.removeChildView(view);if(oldBounds)view.setBounds(oldBounds);host.destroy();}if(owned&&wc.debugger.isAttached())wc.debugger.detach();}
 }
 async function handle(method,url,body){
  const parts=url.pathname.split('/').filter(Boolean).map(decodeURIComponent),browser=getBrowser();
  if(url.pathname==='/v1/clipboard'){const {clipboard,nativeImage}=require('electron');if(method==='GET'){const image=clipboard.readImage();return {text:clipboard.readText(),html:clipboard.readHTML(),image:image.isEmpty()?null:image.toDataURL(),source:'untrusted-clipboard-content'};}if(method==='PATCH'){const value={};if(body.text!==undefined){if(typeof body.text!=='string')throw fault('INVALID_CLIPBOARD','text must be a string.');value.text=body.text;}if(body.html!==undefined){if(typeof body.html!=='string')throw fault('INVALID_CLIPBOARD','html must be a string.');value.html=body.html;}if(body.imagePath||body.image){value.image=body.imagePath?nativeImage.createFromPath(body.imagePath):nativeImage.createFromDataURL(body.image);if(value.image.isEmpty())throw fault('INVALID_CLIPBOARD','Choose a readable image.');}clipboard.write(value);return {ok:true};}}
  if(url.pathname==='/v1/control'&&method==='GET')return {ok:true,access:'full-orbit',background:true,pages:browser?.pages()||[],tabs:browser?.tabs.map(t=>({id:t.id,workspace:t.workspace,url:t.url,title:t.title,internal:!!t.internal}))||[],nativeMethods:await rootCode('Object.keys(window.orbitDesktop).filter(key=>typeof window.orbitDesktop[key]==="function"&&!key.startsWith("on"))')};
  if(url.pathname==='/v1/orbit/invoke'&&method==='POST'){if(typeof body.method!=='string'||!Array.isArray(body.args||[]))throw fault('INVALID_METHOD','Provide a native Orbit method and its args array.');return {ok:true,value:await rootCode(`(async()=>{const name=${JSON.stringify(body.method)},args=${JSON.stringify(body.args||[])};if(!Object.hasOwn(window.orbitDesktop,name)||typeof window.orbitDesktop[name]!=='function')throw Error('Unknown Orbit method');return await window.orbitDesktop[name](...args);})()`)};}
  if(url.pathname==='/v1/orbit/evaluate'&&method==='POST')return evaluate(window().webContents,body);
  if(url.pathname==='/v1/orbit/input'&&method==='POST'){const wc=window().webContents;return serial(wc,()=>input(wc,{...body,expectedUrl:body.expectedUrl||wc.getURL()}));}
  if(url.pathname==='/v1/window'){const win=window();if(method==='GET')return {visible:win.isVisible(),minimized:win.isMinimized(),maximized:win.isMaximized()};if(method==='POST'){const actions={show:()=>win.show(),hide:()=>win.hide(),minimize:()=>win.minimize(),maximize:()=>win.maximize(),restore:()=>win.restore(),'close-to-tray':()=>win.close(),quit:()=>{const timer=setTimeout(()=>app.quit(),250);timer.unref();}};if(!Object.hasOwn(actions,body.action))throw fault('INVALID_WINDOW_ACTION','Unsupported window action.');actions[body.action]();return {ok:true};}}
  if(url.pathname==='/v1/navigation/icon'&&method==='POST'){if(typeof body.iconPath!=='string'||!path.isAbsolute(body.iconPath))throw fault('INVALID_ICON','Provide an absolute icon path.');const extension=path.extname(body.iconPath).toLowerCase();const image=['.exe','.lnk'].includes(extension)?await app.getFileIcon(body.iconPath,{size:'large'}):require('electron').nativeImage.createFromPath(body.iconPath);if(image.isEmpty())throw fault('INVALID_ICON','Choose a readable image or application icon.');const result=navigation.save({id:body.id,iconData:'data:image/png;base64,'+image.resize({width:64,height:64}).toPNG().toString('base64')});onNavigation(result);return result;}

  if(url.pathname==='/v1/pages'&&method==='POST')return browser.automate('open',body);
  if(parts[0]==='v1'&&parts[1]==='pages'&&parts.length===4&&parts[3]==='frames'&&method==='GET'){const wc=content(parts[2],url.searchParams.get('expectedUrl'));return {frames:wc.mainFrame.framesInSubtree.map(f=>({id:f.processId+':'+f.routingId,url:f.url,name:f.name}))};}
  if(parts[0]==='v1'&&parts[1]==='pages'&&parts.length===4&&method==='POST'){
   const wc=content(parts[2],body.expectedUrl);
   if(parts[3]==='evaluate')return serial(wc,()=>evaluate(content(parts[2],body.expectedUrl),body));
   if(parts[3]==='input')return serial(wc,()=>input(content(parts[2],body.expectedUrl),body));
   if(parts[3]==='action')return browser.automate(body.action,{...body,id:parts[2]});
   if(parts[3]==='download'){if(typeof body.url!=='string'||!/^https?:\/\//i.test(body.url))throw fault('INVALID_URL','Provide an HTTP(S) download URL.');wc.downloadURL(body.url);return {ok:true,started:true};}
   if(parts[3]==='favorite')return favorites.add(wc,body);
  }
  if(parts[0]==='v1'&&parts[1]==='tabs'&&method==='POST')return browser.automate(body.action,body);
  if(url.pathname==='/v1/navigation'){
   if(method==='GET')return navigation.get();
   if(method==='POST'){const result=navigation.save(body);onNavigation(result);return result;}
  }
  if(parts[0]==='v1'&&parts[1]==='navigation'&&parts.length===3){let result;if(method==='PATCH')result=navigation.save({...body,id:parts[2]});else if(method==='DELETE')result=navigation.remove(parts[2]);if(result){onNavigation(result);return result;}}
  if(url.pathname==='/v1/navigation-order'&&method==='PATCH'){const result=navigation.reorder(body.ids);onNavigation(result);return result;}
  if(url.pathname==='/v1/categories'&&method==='POST'){const result=navigation.addCategory(body);onNavigation(result);return result;}
  if(url.pathname==='/v1/settings'){
   if(method==='GET')return {ok:true,native:settings.get(),ui:await rootCode('({...prefs})')};
   if(method==='PATCH'){if(!body||typeof body!=='object'||Array.isArray(body))throw fault('INVALID_SETTINGS','Provide settings as an object.');await rootCode(`(async()=>{const patch=${JSON.stringify(body)};const saved=await window.orbitDesktop.savePreferences({...prefs,...patch});if(saved.error||saved.ok===false)throw Error(saved.error||'Settings were rejected');Object.assign(prefs,patch);saveUiPreferences();render();return true;})()`);return {ok:true,settings:settings.get()};}
  }
  if(url.pathname==='/v1/profile'&&method==='PATCH'){let avatar=body.avatar;if(body.avatarPath){const file=path.resolve(body.avatarPath);const image=require('electron').nativeImage.createFromPath(file);if(image.isEmpty())throw fault('INVALID_AVATAR','Choose a readable image.');avatar='data:image/png;base64,'+image.resize({width:128,height:128}).toPNG().toString('base64');}return rootCode(`window.orbitDesktop.saveProfile(${JSON.stringify({...body,avatar})})`);}
  if(url.pathname==='/v1/downloads'&&method==='GET')return downloads.list();
  if(url.pathname==='/v1/download-settings'&&method==='PATCH')return downloads.configure(body);
  if(parts[0]==='v1'&&parts[1]==='downloads'&&parts.length===3&&method==='POST'){if(!['pause','resume','cancel','keep','open','show','rename','move','trash','restore','remove'].includes(body.action))throw fault('INVALID_DOWNLOAD_ACTION','Unsupported download action.');return downloads.action(parts[2],body.action,body.value);}
  if(url.pathname==='/v1/favorites'&&method==='GET')return favorites.list();
  if(parts[0]==='v1'&&parts[1]==='favorites'&&parts.length===3&&method==='DELETE')return favorites.remove(parts[2]);
  if(url.pathname==='/v1/google/connection'&&method==='GET')return google.connection();
  if(url.pathname==='/v1/google/connect'&&method==='POST')return google.connect({calendarWrite:body.calendarWrite===true});
  return undefined;
 }
 return {handle};
}
module.exports={createAutomation};

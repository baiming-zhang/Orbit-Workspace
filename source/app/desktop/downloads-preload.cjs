const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitDownloads',Object.freeze({
 get:()=>ipcRenderer.invoke('orbit:downloads-get'),action:(id,action)=>ipcRenderer.invoke('orbit:downloads-action',id,action),close:()=>ipcRenderer.invoke('orbit:downloads-close'),
 onChange:callback=>{const handler=(_event,data)=>callback(data);ipcRenderer.on('orbit:downloads-changed',handler);return ()=>ipcRenderer.removeListener('orbit:downloads-changed',handler);}
}));

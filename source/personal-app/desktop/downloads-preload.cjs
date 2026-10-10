const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitDownloads',Object.freeze({
 get:()=>ipcRenderer.invoke('orbit:downloads-get'),action:(id,action,value)=>ipcRenderer.invoke('orbit:downloads-action',id,action,value),menu:()=>ipcRenderer.invoke('orbit:downloads-menu'),close:()=>ipcRenderer.invoke('orbit:downloads-close'),
 onChange:callback=>{const handler=(_event,data)=>callback(data);ipcRenderer.on('orbit:downloads-changed',handler);return ()=>ipcRenderer.removeListener('orbit:downloads-changed',handler);}
}));

contextBridge.exposeInMainWorld('orbitTheme',Object.freeze({get:()=>ipcRenderer.invoke('orbit:theme-get'),onChanged:fn=>ipcRenderer.on('orbit:theme-changed',(_event,data)=>fn(data))}));

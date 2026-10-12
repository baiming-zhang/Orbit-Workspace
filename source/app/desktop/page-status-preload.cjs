const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitPageStatus',Object.freeze({onState:callback=>ipcRenderer.on('orbit:page-status',(_event,value)=>callback(value)),action:action=>ipcRenderer.invoke('orbit:page-status-action',action)}));
contextBridge.exposeInMainWorld('orbitTheme',Object.freeze({get:()=>ipcRenderer.invoke('orbit:theme-get'),onChanged:callback=>ipcRenderer.on('orbit:theme-changed',(_event,value)=>callback(value))}));

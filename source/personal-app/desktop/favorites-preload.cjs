const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitFavorites',Object.freeze({get:()=>ipcRenderer.invoke('orbit:favorites-get'),action:(id,action)=>ipcRenderer.invoke('orbit:favorites-action',id,action),close:()=>ipcRenderer.invoke('orbit:favorites-close'),onChanged:callback=>{const handler=(_event,data)=>callback(data);ipcRenderer.on('orbit:favorites-changed',handler);return ()=>ipcRenderer.removeListener('orbit:favorites-changed',handler);}}));

contextBridge.exposeInMainWorld('orbitTheme',Object.freeze({get:()=>ipcRenderer.invoke('orbit:theme-get'),onChanged:fn=>ipcRenderer.on('orbit:theme-changed',(_event,data)=>fn(data))}));

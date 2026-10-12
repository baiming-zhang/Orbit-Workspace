const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitSplit',{
 drag:(action,value)=>ipcRenderer.invoke('orbit:split-drag',action,value),
 onState:callback=>ipcRenderer.on('orbit:split-state',(_event,state)=>callback(state))
});

contextBridge.exposeInMainWorld('orbitTheme',Object.freeze({get:()=>ipcRenderer.invoke('orbit:theme-get'),onChanged:fn=>ipcRenderer.on('orbit:theme-changed',(_event,data)=>fn(data))}));

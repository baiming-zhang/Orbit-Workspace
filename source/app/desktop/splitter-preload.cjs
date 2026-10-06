const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitSplit',{
 drag:(action,value)=>ipcRenderer.invoke('orbit:split-drag',action,value),
 onState:callback=>ipcRenderer.on('orbit:split-state',(_event,state)=>callback(state))
});

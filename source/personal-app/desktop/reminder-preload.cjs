const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitReminder',{
 getSettings:()=>ipcRenderer.invoke('orbit:reminder-settings'),
 getItems:()=>ipcRenderer.invoke('orbit:reminder-data'),
 action:(action,id)=>ipcRenderer.invoke('orbit:reminder-action',action,id),
 onUpdate:(callback)=>ipcRenderer.on('orbit:reminder-update',()=>callback())
});

contextBridge.exposeInMainWorld('orbitTheme',Object.freeze({get:()=>ipcRenderer.invoke('orbit:theme-get'),onChanged:fn=>ipcRenderer.on('orbit:theme-changed',(_event,data)=>fn(data))}));

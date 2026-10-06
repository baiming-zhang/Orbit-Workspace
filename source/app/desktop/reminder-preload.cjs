const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitReminder',{
 getSettings:()=>ipcRenderer.invoke('orbit:reminder-settings'),
 getItems:()=>ipcRenderer.invoke('orbit:reminder-data'),
 action:(action,id)=>ipcRenderer.invoke('orbit:reminder-action',action,id),
 onUpdate:(callback)=>ipcRenderer.on('orbit:reminder-update',()=>callback())
});

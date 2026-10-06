const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('orbitTabs',Object.freeze({action:(a,v)=>ipcRenderer.invoke('orbit:tabs-action',a,v),onState:fn=>ipcRenderer.on('orbit:tabs-state',(_e,s)=>fn(s)),onPdfAddress:fn=>ipcRenderer.on('orbit:pdf-address',(_e,value)=>fn(value)),onFocus:fn=>ipcRenderer.on('orbit:address-focus',fn)}));

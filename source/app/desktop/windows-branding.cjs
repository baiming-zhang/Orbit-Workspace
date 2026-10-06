const {app,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const appId='Orbit.Public';
function configureBranding(){
 app.setPath('userData',path.join(app.getPath('appData'),'Orbit Public'));
 app.setName('Orbit');
 if(process.platform==='win32')app.setAppUserModelId(appId);
}
function brandWindow(win){
 if(process.platform!=='win32')return;
 const launcher=process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;
 win.setAppDetails({appId,appIconPath:launcher,appIconIndex:0,relaunchCommand:'"'+launcher+'"',relaunchDisplayName:'Orbit'});
 win.setThumbnailToolTip('Orbit');
}
function registerShortcut(){return;}
module.exports={configureBranding,brandWindow,registerShortcut,appId};

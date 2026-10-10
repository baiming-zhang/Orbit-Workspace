const {app,shell}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const appId='Orbit.Workspace';
function configureBranding(){
 // Keep the existing profile, including encrypted logins, after renaming Orbit.
 if(!process.env.ORBIT_PDF_TEST_ENTRY)app.setPath('userData',path.join(app.getPath('appData'),'Orbit Workspace'));
 app.setName('Orbit');
 if(process.platform==='win32')app.setAppUserModelId(appId);
}
function brandWindow(win){
 if(process.platform!=='win32')return;
 const launcher=process.env.PORTABLE_EXECUTABLE_FILE||process.execPath;
 win.setAppDetails({appId,appIconPath:launcher,appIconIndex:0,relaunchCommand:'"'+launcher+'"',relaunchDisplayName:'Orbit'});
 win.setThumbnailToolTip('Orbit');
}
function registerShortcut(){
 if(process.platform!=='win32'||!app.isPackaged||!process.env.PORTABLE_EXECUTABLE_FILE)return;
 const launcher=process.env.PORTABLE_EXECUTABLE_FILE;
 const programs=path.join(app.getPath('appData'),'Microsoft','Windows','Start Menu','Programs');
 const shortcut=path.join(programs,'Orbit.lnk');
 const details={target:launcher,cwd:path.dirname(launcher),args:'',description:'Orbit 工作台',icon:launcher,iconIndex:0,appUserModelId:appId};
 const report={name:'Orbit',appId,launcher,shortcut,created:false,repaired:[]};
 try{
  fs.mkdirSync(programs,{recursive:true});
  report.created=shell.writeShortcutLink(shortcut,fs.existsSync(shortcut)?'update':'create',details);
  // Repair only links that point to this application's older portable runtime.
  const pinned=path.join(app.getPath('appData'),'Microsoft','Internet Explorer','Quick Launch','User Pinned','TaskBar');
  for(const name of fs.existsSync(pinned)?fs.readdirSync(pinned):[]){
   if(!name.endsWith('.lnk'))continue;
   const filename=path.join(pinned,name);
   try{const old=shell.readShortcutLink(filename);if(old.target===launcher||/\\Orbit\\Orbit Workspace\.exe$/i.test(old.target)){
    if(shell.writeShortcutLink(filename,'update',details))report.repaired.push(name);
   }}catch{}
  }
  fs.writeFileSync(path.join(app.getPath('userData'),'orbit-shell-integration.json'),JSON.stringify(report,null,2));
 }catch{}
 return report;
}
module.exports={configureBranding,brandWindow,registerShortcut,appId};

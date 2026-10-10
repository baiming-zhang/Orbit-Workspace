'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{spawn}=require('node:child_process');
const repository='baiming-zhang/Orbit-Workspace';
const newer=(a,b)=>{const x=a.replace(/^v/,'').split('.').map(Number),y=b.replace(/^v/,'').split('.').map(Number);for(let i=0;i<3;i++){if(x[i]>y[i])return true;if(x[i]<y[i])return false;}return false;};
const quote=value=>"'"+String(value).replace(/'/g,"''")+"'";
function installerScript({target,candidate,pid,log}){return `$ErrorActionPreference='Stop'
$target=${quote(target)}
$candidate=${quote(candidate)}
$backup=$target+'.orbit-previous'
$log=${quote(log)}
function FileDigest($file){$stream=[IO.File]::OpenRead($file);$algorithm=[Security.Cryptography.SHA256]::Create();try{return [BitConverter]::ToString($algorithm.ComputeHash($stream)).Replace('-','')}finally{$stream.Dispose();$algorithm.Dispose()}}
try {
 for($n=0;$n -lt 180;$n++){if(!(Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue)){break};Start-Sleep -Milliseconds 500}
 if(Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue){throw 'Orbit did not exit.'}
 $installed=$false
 for($n=0;$n -lt 120;$n++){try {Copy-Item -LiteralPath $target -Destination $backup -Force;Copy-Item -LiteralPath $candidate -Destination $target -Force;$installed=$true;break}catch {Start-Sleep -Milliseconds 500}}
 if(!$installed){throw 'Unable to replace Orbit.'}
 $expected=FileDigest $candidate
 if((FileDigest $target) -ne $expected){throw 'Installed file checksum mismatch.'}
 Start-Process -FilePath $target
 Remove-Item -LiteralPath $candidate -Force
 Add-Content -LiteralPath $log -Value ((Get-Date).ToUniversalTime().ToString('o')+' Update installed.')
} catch {
 if(Test-Path -LiteralPath $backup){Copy-Item -LiteralPath $backup -Destination $target -Force;Start-Process -FilePath $target}
 Add-Content -LiteralPath $log -Value ((Get-Date).ToUniversalTime().ToString('o')+' '+$_.Exception.Message)
}`;}
function createUpdater({app,net,getLanguage=()=> 'en',onStatus=()=>{},fetchImpl,applyInstaller,targetPath,version,personal}={}){
 const pkg=require('../package.json'),fetch=fetchImpl||net.fetch.bind(net);let busy=false;
 const tr=(en,zh)=>getLanguage()==='zh'?zh:en,report=(en,zh)=>onStatus({message:tr(en,zh)});
 async function check(){
  if(busy)throw Error(tr('An update is already running.','更新已在进行。'));busy=true;let candidate;
  try{
   const current=version||pkg.version,name=(personal??pkg.private)?'Orbit-Personal-Update.exe':'Orbit.exe';
   report('Checking for updates…','正在检查更新…');
   const response=await fetch('https://api.github.com/repos/'+repository+'/releases/latest',{headers:{Accept:'application/vnd.github+json','User-Agent':'Orbit-Workspace'},signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(tr('Unable to check for updates.','无法检查更新。'));
   const release=await response.json();if(!/^v?\d+\.\d+\.\d+$/.test(release.tag_name))throw Error(tr('Invalid release information.','版本信息无效。'));if(!newer(release.tag_name,current))return {ok:true,updating:false,version:current};
   const asset=release.assets?.find(a=>a.name===name);if(!asset)throw Error(tr('An update for this edition is not available yet.','此版本的更新包尚未发布。'));
   const prefix='https://github.com/'+repository+'/releases/download/'+release.tag_name+'/';if(asset.browser_download_url!==prefix+name)throw Error(tr('Invalid update address.','更新地址无效。'));
   let hash=asset.digest?.match(/^sha256:([a-f\d]{64})$/i)?.[1];
   if(!hash){const manifest=release.assets.find(a=>a.name==='SHA256.txt');if(manifest?.browser_download_url!==prefix+'SHA256.txt')throw Error(tr('Update checksum is unavailable.','更新校验值不可用。'));const r=await fetch(manifest.browser_download_url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(tr('Unable to verify the update.','无法验证更新。'));hash=(await r.text()).split(/\r?\n/).map(line=>line.match(/^([a-f\d]{64})\s+\*?(.+)$/i)).find(match=>match?.[2]===name)?.[1];}
   if(!hash)throw Error(tr('Update checksum is unavailable.','更新校验值不可用。'));
   const target=path.resolve(targetPath||process.env.PORTABLE_EXECUTABLE_FILE||app.getPath('exe'));
   if(!applyInstaller&&(!app.isPackaged||!process.env.PORTABLE_EXECUTABLE_FILE))throw Error(tr('Install updates from the portable Orbit application.','请从便携版 Orbit 安装更新。'));
   candidate=path.join(app.getPath('temp'),'Orbit-update-'+crypto.randomUUID()+'.exe');
   report('Downloading the update…','正在下载更新…');const download=await fetch(asset.browser_download_url,{signal:AbortSignal.timeout(600000)});if(!download.ok||!download.body)throw Error(tr('Unable to download the update.','无法下载更新。'));
   const fd=fs.openSync(candidate,'wx'),digest=crypto.createHash('sha256');let size=0,last=0;
   try{for await(const chunk of download.body){size+=chunk.length;if(size>1024*1024*1024)throw Error(tr('The update file is too large.','更新文件过大。'));fs.writeSync(fd,chunk);digest.update(chunk);if(Date.now()-last>700){last=Date.now();const percent=asset.size?Math.min(99,Math.round(size/asset.size*100)):0;report('Downloading the update… '+percent+'%','正在下载更新… '+percent+'%');}}}finally{fs.closeSync(fd);}
   if(digest.digest('hex').toLowerCase()!==hash.toLowerCase()||(asset.size&&size!==asset.size))throw Error(tr('Update verification failed. Try again.','更新校验失败，请重试。'));
   const header=Buffer.alloc(2),file=fs.openSync(candidate,'r');try{fs.readSync(file,header,0,2,0);}finally{fs.closeSync(file);}if(header.toString()!=='MZ')throw Error(tr('Invalid update package.','更新包无效。'));
   report('Update verified. Restarting Orbit…','更新已验证，正在重启 Orbit…');
   const input={target,candidate,pid:process.pid,log:path.join(app.getPath('userData'),'orbit-update.log')};
   if(applyInstaller)await applyInstaller(input);else {const encoded=Buffer.from(installerScript(input),'utf16le').toString('base64');const helper=spawn('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],{detached:true,windowsHide:true,stdio:'ignore'});await new Promise((resolve,reject)=>{helper.once('spawn',resolve);helper.once('error',reject);});helper.unref();setTimeout(()=>app.quit(),400);}
   candidate=null;return {ok:true,updating:true,version:release.tag_name.replace(/^v/,'')};
  }finally{busy=false;if(candidate)try{fs.rmSync(candidate,{force:true});}catch{}}
 }
 return {check};
}
module.exports={createUpdater,installerScript,newer};

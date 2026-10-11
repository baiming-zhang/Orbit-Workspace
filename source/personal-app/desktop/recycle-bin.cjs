'use strict';
const {execFile}=require('node:child_process'),path=require('node:path'),fs=require('node:fs');
function run(operation,original,token){return new Promise((resolve,reject)=>{
 // A fixed script receives data through the environment; file names are never shell code.
 const executable=path.join(process.env.SystemRoot||'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
 const script=fs.readFileSync(path.join(__dirname,'recycle-bin.ps1'),'utf8').replace(/^param\([^\n]*\)\r?\n/, '$Operation=$env:ORBIT_RECYCLE_OPERATION\n');
 const encoded=Buffer.from(script,'utf16le').toString('base64');
 execFile(executable,['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-EncodedCommand',encoded],{windowsHide:true,timeout:15000,maxBuffer:1024*1024,encoding:'utf8',env:{...process.env,ORBIT_RECYCLE_OPERATION:operation,ORBIT_RECYCLE_INPUT:JSON.stringify({original,token})}},(error,stdout,stderr)=>{
  if(error){const detail=stderr||error.message;const code=['restore-target-exists','recycle-item-missing','recycle-item-ambiguous'].find(code=>detail.includes(code));const failure=Error(code||'restore-not-completed');failure.code=code;reject(failure);return;}
  try{resolve(JSON.parse(stdout.replace(/^\uFEFF/,'').trim()));}catch{reject(Error('recycle-status-unavailable'));}
 });
});}
async function recycleFile(shell,original){
 const size=fs.statSync(original).size,startedAt=Date.now();
 // Only the native recycle operation is on the delete path. Resolve the exact
 // recycled item lazily if the user requests restoration, including after restart.
 await shell.trashItem(original);
 return {deferred:true,size,startedAt,finishedAt:Date.now()};
}
const restoreFile=(original,token)=>run('restore',original,token);
module.exports={recycleFile,restoreFile};

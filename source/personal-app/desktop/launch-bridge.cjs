const net=require('node:net'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const received=new Set();
function acceptLaunchRequest(argv){const id=argv.find(value=>/^--orbit-launch-id=\d+--?\d+$/.test(value))?.slice('--orbit-launch-id='.length);if(!id)return true;if(received.has(id))return false;received.add(id);if(received.size>256)received.delete(received.values().next().value);return true;}
// Windows command-line quoting, including escaped quotes and trailing backslashes.
function commandArgs(raw){const args=[];let i=0;while(i<raw.length){while(/\s/.test(raw[i]||'')&&i<raw.length)i++;if(i>=raw.length)break;let value='',quoted=false;while(i<raw.length&&(quoted||! /\s/.test(raw[i]))){let slash=0;while(raw[i]==='\\'){slash++;i++;}if(raw[i]==='"'){value+='\\'.repeat(Math.floor(slash/2));if(slash%2)value+='"';else if(quoted&&raw[i+1]==='"'){value+='"';i++;}else quoted=!quoted;i++;}else{value+='\\'.repeat(slash);if(i<raw.length)value+=raw[i++];}}args.push(value);}return args;}
function createLaunchBridge({app,onOpen}){
 if(process.platform!=='win32')return {dispose(){}};
 const filename=path.join(app.getPath('userData'),'launch-pipe.txt'),endpoint='\\\\.\\pipe\\orbit-workspace-'+crypto.randomBytes(16).toString('hex');let closed=false;
 const sockets=new Set(),server=net.createServer(socket=>{sockets.add(socket);let pending=Buffer.alloc(0),handled=false;socket.setTimeout(2000,()=>socket.destroy());socket.on('error',()=>{});socket.on('close',()=>sockets.delete(socket));socket.on('data',data=>{if(handled)return;pending=Buffer.concat([pending,data]);if(pending.length>65536){socket.destroy();return;}if(pending.length%2||pending.length<2||pending.readUInt16LE(pending.length-2)!==0)return;handled=true;const message=pending.subarray(0,-2).toString('utf16le'),end=message.indexOf('\n');if(end<1){socket.destroy();return;}const cwd=message.slice(0,end),raw=message.slice(end+1);if(!path.isAbsolute(cwd)||raw.includes('\0')){socket.destroy();return;}try{onOpen(commandArgs(raw),cwd);socket.end(Buffer.from('OK\0','utf16le'));}catch{socket.destroy();}});});
 server.on('error',()=>{});server.listen(endpoint,()=>{if(closed)return;try{fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',endpoint,{mode:0o600});fs.renameSync(filename+'.tmp',filename);}catch{}});
 function dispose(){closed=true;try{if(fs.readFileSync(filename,'utf8')===endpoint)fs.unlinkSync(filename);}catch{}for(const socket of sockets)socket.destroy();server.close();}
 return {dispose,endpoint};
}
module.exports={createLaunchBridge,commandArgs,acceptLaunchRequest};

'use strict';
const fs=require('node:fs'),path=require('node:path');
function createWelcome(app){
 const root=app.getPath('userData'),file=path.join(root,'welcome.json');let state;
 try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const write=()=>{fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(state));fs.renameSync(file+'.tmp',file);};
 if(!state){const existing=['workspace-settings.json','navigation.json','downloads.json','credentials.enc','local-events.json'].some(name=>fs.existsSync(path.join(root,name)));state={version:1,seen:existing,pending:!existing};write();}
 return {claim:({external=false,language='en'}={})=>{
  if(external||state.seen)return {ok:true,show:false,language};
  state={version:1,seen:true,pending:false,seenAt:new Date().toISOString()};write();return {ok:true,show:true,language};
 }};
}
module.exports={createWelcome};

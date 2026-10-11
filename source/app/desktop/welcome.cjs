'use strict';
const fs=require('node:fs'),path=require('node:path');
function createWelcome(app){
 const root=app.getPath('userData'),file=path.join(root,'welcome.json');let state,claimed=false;
 try{state=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 const write=next=>{fs.mkdirSync(root,{recursive:true});fs.writeFileSync(file+'.tmp',JSON.stringify(next));fs.renameSync(file+'.tmp',file);state=next;};
 if(!state){
  const existing=['workspace-settings.json','navigation.json','downloads.json','credentials.enc','local-events.json'].some(name=>fs.existsSync(path.join(root,name)));
  write({version:1,seen:existing,pending:!existing});
 }
 return {
  shouldShow:({external=false}={})=>!external&&!state.seen,
  claim:({external=false,language='en'}={})=>{
   if(external||state.seen)return {ok:true,show:false,language};
   claimed=true;return {ok:true,show:true,language};
  },
  complete:()=>{if(!state.seen){if(!claimed)throw Error('Welcome has not started.');write({version:1,seen:true,pending:false,seenAt:new Date().toISOString()});}return {ok:true};}
 };
}
module.exports={createWelcome};

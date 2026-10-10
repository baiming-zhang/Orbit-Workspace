const fs=require('node:fs'),path=require('node:path');
const time=require('../dist/timezone.js');
function createDemoSummary({app,getSettings,onChange=()=>{}}){
 const file=path.join(app.getPath('userData'),'demo-summary.json');
 let data=null;try{data=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
 function active(){return data?.date===time.dateKey(new Date(),getSettings().timeZone);}
 function get(){return {active:active(),date:data?.date||null,mails:active()?data.mails:[]};}
 function set(input){
  if(!input||typeof input!=='object'||!Array.isArray(input.mails)||input.mails.length>20)throw Error('Provide up to 20 demo emails.');
  const date=time.dateKey(new Date(),getSettings().timeZone);
  if(input.date!==date)throw Error('Demo emails must be dated today in the Orbit time zone.');
  const mails=input.mails.map((m,i)=>{
   if(typeof m.subject!=='string'||!m.subject.trim()||m.subject.length>300||typeof m.sender!=='string'||!m.sender.trim()||m.sender.length>100)throw Error('Each demo email needs a sender and subject.');
   return {id:'orbit-demo-mail-'+i,sender:m.sender,subject:m.subject,initial:m.sender.split(/\s+/).map(x=>x[0]).slice(0,2).join(''),time:String(m.time||'Today').slice(0,20),unread:true,demo:true};
  });
  data={date,mails};fs.writeFileSync(file,JSON.stringify(data,null,2));onChange();return {ok:true,...get()};
 }
 function clear(){data=null;if(fs.existsSync(file))fs.unlinkSync(file);onChange();return {ok:true,...get()};}
 function merge(summary){if(!active())return summary;const real=summary.gmail||{};return {...summary,demo:true,gmail:{...real,status:'success',count:(real.status==='success'?Number(real.count)||0:0)+data.mails.length,mails:[...data.mails,...(real.mails||[])]}};}
 return {get,set,clear,merge};
}
module.exports={createDemoSummary};

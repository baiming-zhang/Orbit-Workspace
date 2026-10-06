const OrbitTime=(()=>{
 const zones=[
  ['中国','Asia/Shanghai'],['香港','Asia/Hong_Kong'],['新加坡','Asia/Singapore'],
  ['美国东部 · 纽约','America/New_York'],['美国中部 · 芝加哥','America/Chicago'],['美国山地 · 丹佛','America/Denver'],['美国西部 · 洛杉矶','America/Los_Angeles'],
  ['加拿大东部 · 多伦多','America/Toronto'],['加拿大中部 · 温尼伯','America/Winnipeg'],['加拿大山地 · 埃德蒙顿','America/Edmonton'],['加拿大西部 · 温哥华','America/Vancouver'],['加拿大大西洋 · 哈利法克斯','America/Halifax'],['加拿大纽芬兰 · 圣约翰斯','America/St_Johns'],['UTC','UTC']
 ];
 function offset(value){const m=String(value).match(/^(?:UTC)?([+-])(\d{1,2})(?::?(\d{2}))?$/i);if(!m)return null;const hours=Number(m[2]),minutes=Number(m[3]||0),n=(hours*60+minutes)*(m[1]==='-'?-1:1);if(minutes>59||n< -720||n>840)throw Error('UTC 偏移需介于 -12:00 和 +14:00 之间。');return n;}
 function normalize(value='Asia/Shanghai'){const n=offset(value);if(n!==null)return 'UTC'+(n<0?'-':'+')+String(Math.floor(Math.abs(n)/60)).padStart(2,'0')+':'+String(Math.abs(n)%60).padStart(2,'0');try{new Intl.DateTimeFormat('en',{timeZone:value}).format();return value;}catch{throw Error('请选择有效时区。');}}
 function format(value,options={},zone='Asia/Shanghai',locale='zh-CN'){const tz=normalize(zone),n=offset(tz),date=new Date(value);return new Intl.DateTimeFormat(locale,{...options,timeZone:n===null?tz:'UTC'}).format(n===null?date:new Date(date.getTime()+n*60000));}
 function dateKey(value=new Date(),zone='Asia/Shanghai'){return format(value,{year:'numeric',month:'2-digit',day:'2-digit'},zone,'en-CA');}
 function clock(value,zone='Asia/Shanghai'){return format(value,{hour:'2-digit',minute:'2-digit',hourCycle:'h23'},zone,'en-GB');}
 function localInstant(date,time,zone='Asia/Shanghai'){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(time))throw Error('日程日期或时间不正确。');
  const target=Date.parse(date+'T'+time+':00Z');if(!Number.isFinite(target)||new Date(target).toISOString().slice(0,16)!==date+'T'+time)throw Error('日程时间不正确。');
  const tz=normalize(zone),n=offset(tz);if(n!==null)return new Date(target-n*60000).toISOString();
  let guess=target;
  for(let i=0;i<5;i++){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess));const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const represented=Date.parse(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second+'Z');const delta=target-represented;if(!delta)break;guess+=delta;}
  if(dateKey(guess,tz)!==date||clock(guess,tz)!==time)throw Error('此当地时间因夏令时调整不存在，请选择其他时间。');
  return new Date(guess).toISOString();
 }
 function dayWindow(now=new Date(),zone='Asia/Shanghai'){const date=dateKey(now,zone),next=new Date(date+'T12:00:00Z');next.setUTCDate(next.getUTCDate()+1);const nextDate=next.toISOString().slice(0,10);const start=localInstant(date,'00:00',zone),end=localInstant(nextDate,'00:00',zone);return {date,start,end,after:Math.floor(Date.parse(start)/1000),before:Math.floor(Date.parse(end)/1000)};}
 function label(zone){return zones.find(x=>x[1]===zone)?.[0]||normalize(zone);}
 return {zones,offset,normalize,format,dateKey,clock,localInstant,dayWindow,label};
})();
if(typeof module!=='undefined')module.exports=OrbitTime;

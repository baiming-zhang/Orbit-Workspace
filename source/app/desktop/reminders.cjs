const LEAD_MS=5*60*1000;
const OrbitTime=require('../dist/timezone.js');
function eventStart(event){
 if(event.allDay||event.time==='全天')return NaN;
 if(event.startAt)return Date.parse(event.startAt);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(event.date||'')||!/^\d{2}:\d{2}$/.test(event.time||''))return NaN;
 try{return Date.parse(OrbitTime.localInstant(event.date,event.time,event.timeZone||'Asia/Shanghai'));}catch{return NaN;}
}
function normalizeEvent(event){
 if(!event||typeof event.id!=='string'||event.id.length>256)return null;
 const start=eventStart(event);if(!Number.isFinite(start))return null;
 return {id:event.id,title:String(event.title||'未命名日程').slice(0,200),startAt:new Date(start).toISOString(),date:String(event.date||'').slice(0,10),time:String(event.time||'').slice(0,10),duration:Math.max(0,Math.min(10080,Number(event.duration)||30)),location:String(event.location||'').slice(0,300),zoomLink:String(event.zoomLink||'').slice(0,2048),remote:!!event.remote};
}
class ReminderEngine{
 constructor({state={},save=()=>{},onReminder=()=>{},now=()=>Date.now()}){this.now=now;this.save=save;this.onReminder=onReminder;this.local=Array.isArray(state.local)?state.local.map(normalizeEvent).filter(Boolean):[];this.remote=Array.isArray(state.remote)?state.remote.map(normalizeEvent).filter(Boolean):[];this.delivered=state.delivered&&typeof state.delivered==='object'?state.delivered:{};this.running=false;}
 snapshot(){return {local:this.local,remote:this.remote,delivered:this.delivered};}
 updateLocal(events){if(!Array.isArray(events)||events.length>5000)throw new Error('本地日程数据不正确。');this.local=events.map(normalizeEvent).filter(Boolean);this.save(this.snapshot());}
 updateRemote(events){this.remote=(Array.isArray(events)?events:[]).map(normalizeEvent).filter(Boolean);this.save(this.snapshot());}
 next(){return [...this.local,...this.remote].filter(e=>Date.parse(e.startAt)>this.now()).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt))[0]||null;}
 async tick(){if(this.running)return;this.running=true;try{const now=this.now();for(const [key,start] of Object.entries(this.delivered))if(Number(start)<now-7*86400000)delete this.delivered[key];const events=[...this.local,...this.remote].sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));for(const event of events){const start=Date.parse(event.startAt),key=event.id+'@'+event.startAt;if(start<=now||start-now>LEAD_MS||this.delivered[key])continue;await this.onReminder(event);this.delivered[key]=start;this.save(this.snapshot());}}finally{this.running=false;}}
}
module.exports={ReminderEngine,eventStart,normalizeEvent,LEAD_MS};

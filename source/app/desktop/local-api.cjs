const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const crypto=require('node:crypto');
function createLocalApi({app,safeStorage,google,events,browser,getSettings,onCalendarChange=()=>{}}){
 const filename=path.join(app.getPath('userData'),'local-api.enc');let config={enabled:false,port:42831,token:crypto.randomBytes(32).toString('base64url')},server=null,url='',failure='';
 try{if(fs.existsSync(filename))config={...config,...JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)))};}catch{config.enabled=false;failure='API 配置无法解密，已停止服务。';}
 function save(){if(!safeStorage.isEncryptionAvailable())throw Error('Windows API 令牌加密不可用。');fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',safeStorage.encryptString(JSON.stringify(config)));fs.renameSync(filename+'.tmp',filename);}
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 async function body(req){if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))throw Error('请使用 application/json。');let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>262144)throw Error('请求体超过 256 KiB。');}try{return JSON.parse(text||'{}');}catch{throw Error('JSON 格式不正确。');}}
 function authenticated(req){const provided=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+config.token);return provided.length===expected.length&&crypto.timingSafeEqual(provided,expected);}
 async function handler(req,res){
  if(req.headers.origin||!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')){reply(res,403,{error:'仅接受本机 API 客户端。'});return;}
  if(!authenticated(req)){reply(res,401,{error:'需要有效的 Bearer 令牌。'});return;}
  try{const target=new URL(req.url,url),segments=target.pathname.split('/').filter(Boolean).map(decodeURIComponent),method=req.method;
   if(method==='GET'&&target.pathname==='/v1/about')return reply(res,200,{name:'Orbit Workspace API',version:1,reminders:{leadMinutes:5,sound:'windows-device-connect',soundScope:'calendar-only',trayNotificationsSilent:true},...getSettings(),google:google.connection(),capabilities:['summary','gmail-read','calendar-read-write','meetings','page-text','local-events-crud']});
   if(method==='GET'&&target.pathname==='/v1/summary')return reply(res,200,await google.getSummary());
   if(method==='GET'&&target.pathname==='/v1/meetings')return reply(res,200,await google.getMeetings());
   if(method==='GET'&&target.pathname==='/v1/pages')return reply(res,200,{pages:browser.pages()});
   if(method==='GET'&&segments[1]==='pages'&&segments[3]==='text'&&segments.length===4)return reply(res,200,await browser.pageText(segments[2]));
   if(target.pathname==='/v1/local-events'&&method==='GET')return reply(res,200,events.get());
   if(target.pathname==='/v1/local-events'&&method==='POST')return reply(res,201,events.create(await body(req)));
   if(segments[0]==='v1'&&segments[1]==='local-events'&&segments.length===3){if(method==='PATCH')return reply(res,200,events.update(segments[2],await body(req)));if(method==='DELETE')return reply(res,200,events.remove(segments[2]));}
   if(segments[0]==='v1'&&segments[1]==='gmail'&&segments[2]==='messages'){if(method==='GET'&&segments.length===3)return reply(res,200,await google.readMails({query:target.searchParams.get('q')||'is:unread',limit:target.searchParams.get('limit')||20,pageToken:target.searchParams.get('pageToken')}));if(method==='GET'&&segments.length===4)return reply(res,200,await google.readMail(segments[3]));}
   if(segments[0]==='v1'&&segments[1]==='calendar'&&segments[2]==='events'){const calendarId=target.searchParams.get('calendarId')||'primary';if(method==='GET'&&segments.length===3)return reply(res,200,await google.readCalendar({calendarId,start:target.searchParams.get('start'),end:target.searchParams.get('end')}));if(['POST','PATCH','DELETE'].includes(method)){if(!google.connection().calendarWrite)return reply(res,403,{error:'请先在设置 → 本机数据 API 中启用 Google 日历写入授权。'});if((method==='POST'&&segments.length!==3)||(method!=='POST'&&segments.length!==4))throw Error('日历路径不正确。');const result=await google.writeCalendar(method,calendarId,segments[3],method==='DELETE'?{}:await body(req));onCalendarChange();return reply(res,method==='POST'?201:200,result);}}
   return reply(res,404,{error:'未找到 API 路径。'});
  }catch(error){reply(res,400,{error:error.message||'操作失败。'});}
 }
 async function start(){if(server||!config.enabled)return status();try{save();server=http.createServer(handler);server.requestTimeout=30000;server.headersTimeout=10000;const listen=port=>new Promise((resolve,reject)=>{const error=e=>{server.removeListener('listening',ready);reject(e);};const ready=()=>{server.removeListener('error',error);resolve();};server.once('error',error);server.once('listening',ready);server.listen(port,'127.0.0.1');});try{await listen(config.port);}catch(error){if(error.code!=='EADDRINUSE')throw error;await listen(0);}config.port=server.address().port;save();url='http://127.0.0.1:'+config.port;failure='';}catch(error){failure=error.message;server?.close();server=null;url='';}return status();}
 function stop(){server?.closeAllConnections();server?.close();server=null;url='';}
 function status(){return {enabled:!!server&&!!url,url,error:failure,calendarWrite:!!google.connection().calendarWrite};}
 async function configure({enabled,rotate}={}){if(rotate)config.token=crypto.randomBytes(32).toString('base64url');if(typeof enabled==='boolean')config.enabled=enabled;save();if(!config.enabled)stop();else await start();return status();}
 return {start,stop,status,configure,clientConfig:()=>({url,headers:{Authorization:'Bearer '+config.token}}),mcpEnv:()=>({ORBIT_API_URL:url,ORBIT_API_TOKEN:config.token})};
}
module.exports={createLocalApi};


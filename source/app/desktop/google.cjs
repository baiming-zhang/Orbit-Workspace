const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const crypto=require('node:crypto');
const {parseMeetingLink}=require('./links.cjs');
const defaults=require('./google-defaults.cjs');
const {createMeetingReader}=require('./meetings.cjs');
const OrbitTime=require('../dist/timezone.js');
const scopes=['https://www.googleapis.com/auth/gmail.readonly','https://www.googleapis.com/auth/calendar.readonly'];
function dayWindow(now=new Date(),zone='Asia/Shanghai'){return OrbitTime.dayWindow(now,zone);}
function zoomInEvent(event){
 const text=[event.location,event.description,event.conferenceData?.entryPoints?.map(p=>p.uri).join(' ')].filter(Boolean).join(' ').replaceAll('&amp;','&');
 for(const candidate of text.match(/https:\/\/[a-zA-Z0-9.-]+\/(?:j|my|wc\/join)\/[^\s<>"']+/g)||[]){const url=parseMeetingLink(candidate.replace(/[.,;，。；)]+$/,''));if(url)return url;}
 return '';
}
function createGoogle({app,safeStorage,shell,getTimeZone=()=> 'Asia/Shanghai'}){
 const filename=path.join(app.getPath('userData'),'google-connection.enc');
 let config={...defaults};let access=null;let authorizeCancel=null;let generation=0;let refreshPromise=null;
 try{if(fs.existsSync(filename)&&safeStorage.isEncryptionAvailable()){const saved=JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)));config={...defaults,...saved};if(saved.clientId&&saved.clientId!==defaults.clientId)config.clientSecret=saved.clientSecret||'';}}catch{config={...defaults};}
 function save(){delete config.propertyId;if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 凭据加密暂时不可用，无法保存授权。');fs.mkdirSync(path.dirname(filename),{recursive:true});const tmp=filename+'.tmp';fs.writeFileSync(tmp,safeStorage.encryptString(JSON.stringify(config)));fs.renameSync(tmp,filename);}
 function connection(){return {clientId:config.clientId||'',hasSecret:!!config.clientSecret,connected:!!config.refreshToken,calendarWrite:!!config.calendarWrite};}
 function saveConnection(input){
  const id=String(input?.clientId||'').trim(),secret=String(input?.clientSecret||'').trim();
  if(!/^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id))throw new Error('请输入 Google 桌面应用 OAuth Client ID。');
  if(secret.length>1024)throw new Error('Client Secret 长度不正确。');
  if(config.clientId&&config.clientId!==id){meetingReader.clear();config.refreshToken=null;config.calendarWrite=false;config.clientSecret='';access=null;generation++;}
  config={...config,clientId:id,...(secret?{clientSecret:secret}:{})};save();return {ok:true};
 }
 async function jsonFetch(url,options={}){let response;try{response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});}catch{throw new Error('无法连接 Google，请检查网络连接。');}if(response.status===204)return {ok:true};let data;try{data=await response.json();}catch{throw new Error('Google 返回了无法读取的响应。');}if(!response.ok){if([404,409,410].includes(response.status)){const error=new Error('Google 日程状态 '+response.status);error.status=response.status;throw error;}if(response.status===401)throw new Error('Google 授权已失效，请重新连接。');if(response.status===403)throw new Error('Google 未允许访问，请检查 API 是否启用及账号权限。');if(response.status===429)throw new Error('Google 请求过于频繁，请稍后刷新。');if(data.error==='invalid_grant')throw new Error('授权已过期或撤回，请重新连接 Google。');throw new Error('Google 请求失败，请检查授权配置。');}return data;}
 async function token(){if(access&&access.expires>Date.now()+60000)return access.value;if(refreshPromise)return refreshPromise;if(!config.refreshToken)throw new Error('尚未连接 Google。');const ownGeneration=generation;refreshPromise=(async()=>{const params=new URLSearchParams({client_id:config.clientId,refresh_token:config.refreshToken,grant_type:'refresh_token'});if(config.clientSecret)params.set('client_secret',config.clientSecret);const data=await jsonFetch('https://oauth2.googleapis.com/token',{method:'POST',body:params});if(ownGeneration!==generation)throw new Error('授权已变更，请重新刷新。');access={value:data.access_token,expires:Date.now()+Number(data.expires_in||3600)*1000};return access.value;})();try{return await refreshPromise;}finally{refreshPromise=null;}}
 async function api(url,options={}){const bearer=await token();return jsonFetch(url,{...options,headers:{Authorization:'Bearer '+bearer,'Content-Type':'application/json',...options.headers}});}
 async function connect({calendarWrite=false}={}){
  if(authorizeCancel)throw new Error('Google 授权正在进行，请先完成系统浏览器中的授权。');
  if(!config.clientId)throw new Error('请先保存桌面应用 OAuth 配置。');
  if(!safeStorage.isEncryptionAvailable())throw new Error('Windows 凭据加密暂时不可用。');
  const client={clientId:config.clientId,clientSecret:config.clientSecret};const ownGeneration=generation;
  const allowWrite=calendarWrite||!!config.calendarWrite;
  const verifier=crypto.randomBytes(48).toString('base64url'),state=crypto.randomBytes(32).toString('base64url');
  const challenge=crypto.createHash('sha256').update(verifier).digest('base64url');
  let timer,server;const result=new Promise((resolve,reject)=>{
    let settled=false;
    function finish(err,data){if(settled)return;settled=true;clearTimeout(timer);authorizeCancel=null;server?.close();err?reject(err):resolve(data);}
    authorizeCancel=()=>finish(new Error('Google 授权已取消。'));
    server=http.createServer(async(req,res)=>{
      const u=new URL(req.url,'http://127.0.0.1');
      if(req.method!=='GET'||u.pathname!=='/oauth2callback'){res.writeHead(404).end();return;}
      if(u.searchParams.get('state')!==state){res.writeHead(400).end('Invalid authorization state.');return;}
      if(u.searchParams.has('error')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end('<p>授权未完成。请返回 Orbit 工作台重试。</p>');finish(new Error('Google 授权未完成。'));return;}
      const code=u.searchParams.get('code');if(!code){res.writeHead(400).end('Missing code.');return;}
      if(ownGeneration!==generation){res.writeHead(409).end('Authorization configuration changed.');finish(new Error('连接配置已变更，请重新授权。'));return;}
      try{
        const redirect='http://127.0.0.1:'+server.address().port+'/oauth2callback';
        const params=new URLSearchParams({client_id:client.clientId,code,code_verifier:verifier,redirect_uri:redirect,grant_type:'authorization_code'});if(client.clientSecret)params.set('client_secret',client.clientSecret);
        const data=await jsonFetch('https://oauth2.googleapis.com/token',{method:'POST',body:params});
        if(allowWrite&&data.scope&&!data.scope.split(' ').some(s=>s==='https://www.googleapis.com/auth/calendar.events'||s==='https://www.googleapis.com/auth/calendar'))throw new Error('Google 尚未授予日历写入权限，请勾选相应授权后重试。');
        if(ownGeneration!==generation)throw new Error('连接配置已变更，请重新授权。');
        if(!data.refresh_token&&!config.refreshToken)throw new Error('Google 未提供持久授权，请重新连接。');
        config.refreshToken=data.refresh_token||config.refreshToken;config.calendarWrite=allowWrite;access={value:data.access_token,expires:Date.now()+Number(data.expires_in||3600)*1000};save();
        res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end('<!doctype html><meta charset="utf-8"><title>Orbit 已连接</title><body style="font-family:system-ui;padding:80px;background:#f8fafd;color:#202124"><h1>Google 已连接。</h1><p>请返回 Orbit Workspace。这一页面可以关闭。</p></body>');finish(null,{ok:true});
      }catch(error){res.writeHead(500,{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end('授权未完成。请返回 Orbit 查看连接配置。');finish(error);}
    });
    server.on('error',()=>finish(new Error('无法启动本地授权回调，请重试。')));
    server.listen(0,'127.0.0.1',async()=>{const redirect='http://127.0.0.1:'+server.address().port+'/oauth2callback';const u=new URL('https://accounts.google.com/o/oauth2/v2/auth');const params={client_id:client.clientId,redirect_uri:redirect,response_type:'code',scope:[...scopes,...(allowWrite?['https://www.googleapis.com/auth/calendar.events']:[])].join(' '),state,code_challenge:challenge,code_challenge_method:'S256',access_type:'offline',prompt:'consent'};Object.entries(params).forEach(([k,v])=>u.searchParams.set(k,v));try{await shell.openExternal(u.href);}catch{finish(new Error('无法打开系统浏览器。'));}});
    timer=setTimeout(()=>finish(new Error('授权等待超时，请重新连接 Google。')),300000);
  });return result;
 }
 async function gmail(window){
  let pageToken,count=0,ids=[],pages=0,truncated=false;
  do{const u=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');u.searchParams.set('q',`is:unread after:${window.after} before:${window.before}`);u.searchParams.set('maxResults','500');if(pageToken)u.searchParams.set('pageToken',pageToken);const data=await api(u.href);const messages=data.messages||[];count+=messages.length;ids.push(...messages.map(m=>m.id).slice(0,Math.max(0,4-ids.length)));pageToken=data.nextPageToken;pages++;if(pages>=20&&pageToken){truncated=true;break;}}while(pageToken);
  const mails=await Promise.all(ids.map(async id=>{const u=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id));u.searchParams.set('format','metadata');u.searchParams.append('metadataHeaders','From');u.searchParams.append('metadataHeaders','Subject');const m=await api(u.href);const headers=m.payload?.headers||[];const from=headers.find(h=>h.name.toLowerCase()==='from')?.value||'未知发件人';const sender=from.replace(/\s*<[^>]+>/,'').replaceAll('"','');return {id,sender,initial:sender.slice(0,2).toUpperCase(),subject:headers.find(h=>h.name.toLowerCase()==='subject')?.value||'（无主题）',time:OrbitTime.clock(Number(m.internalDate),getTimeZone())};}));return {status:'success',count,truncated,mails};
 }
 async function calendar(window){
  let pageToken,events=[],pages=0,truncated=false;
  do{const u=new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');Object.entries({timeMin:window.start,timeMax:window.end,singleEvents:'true',orderBy:'startTime',maxResults:'250',timeZone:OrbitTime.offset(getTimeZone())===null?getTimeZone():'UTC'}).forEach(([k,v])=>u.searchParams.set(k,v));if(pageToken)u.searchParams.set('pageToken',pageToken);const data=await api(u.href);events.push(...(data.items||[]).filter(e=>e.status!=='cancelled').map(e=>{const start=e.start?.dateTime,end=e.end?.dateTime;return {id:'google:'+e.id,title:e.summary||'（无标题）',date:start?dayWindow(new Date(start),getTimeZone()).date:(e.start?.date||window.date),startAt:start||null,allDay:!start,time:start?OrbitTime.clock(start,getTimeZone()):'全天',duration:start&&end?Math.max(0,Math.round((new Date(end)-new Date(start))/60000)):1440,location:e.location||'',notes:(e.description||'').replace(/<[^>]*>/g,''),zoomLink:zoomInEvent(e),htmlLink:e.htmlLink||'',type:'blue',remote:true};}));pageToken=data.nextPageToken;pages++;if(pages>=10&&pageToken){truncated=true;break;}}while(pageToken);return {status:'success',events,truncated};
 }
 async function getSummary(){const window=dayWindow(new Date(),getTimeZone());if(!config.refreshToken)return {connected:false,date:window.date,gmail:{status:'not_connected'},calendar:{status:'not_connected'}};const catchSource=fn=>fn().catch(error=>({status:'error',error:error.message}));const [g,c]=await Promise.all([catchSource(()=>gmail(window)),catchSource(()=>calendar(window))]);return {connected:true,date:window.date,updatedAt:Date.now(),gmail:g,calendar:c};}
 async function disconnect(){meetingReader.clear();generation++;authorizeCancel?.();access=null;const refreshToken=config.refreshToken;config.refreshToken=null;config.calendarWrite=false;save();if(refreshToken){try{await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',body:new URLSearchParams({token:refreshToken}),signal:AbortSignal.timeout(10000)});}catch{}}return {ok:true};}
 function calendarUrl(calendarId,eventId){if(typeof calendarId!=='string'||!calendarId||calendarId.length>1024)throw Error('日历 ID 不正确。');if(eventId!==undefined&&(typeof eventId!=='string'||!eventId||eventId.length>1024))throw Error('日程 ID 不正确。');return 'https://www.googleapis.com/calendar/v3/calendars/'+encodeURIComponent(calendarId)+'/events'+(eventId?'/'+encodeURIComponent(eventId):'');}
 async function readCalendar({calendarId='primary',start,end}={}){const window=dayWindow(new Date(),getTimeZone());const u=new URL(calendarUrl(calendarId));const min=start||window.start,max=end||window.end;if(!Number.isFinite(Date.parse(min))||!Number.isFinite(Date.parse(max))||Date.parse(max)<=Date.parse(min))throw Error('日程范围不正确。');Object.entries({timeMin:new Date(min).toISOString(),timeMax:new Date(max).toISOString(),singleEvents:'true',showHiddenInvitations:'true',maxResults:'2500',orderBy:'startTime'}).forEach(([k,v])=>u.searchParams.set(k,v));let nextPage,events=[];do{if(nextPage)u.searchParams.set('pageToken',nextPage);const data=await api(u.href);events.push(...(data.items||[]));nextPage=data.nextPageToken;}while(nextPage);return {calendarId,events};}
 async function writeCalendar(method,calendarId,eventId,input){if(!config.calendarWrite)throw Error('尚未授权 Google 日历写入。');const u=new URL(calendarUrl(calendarId,eventId));u.searchParams.set('sendUpdates','none');if(method==='DELETE')return api(u.href,{method:'DELETE'});let previous={};if(method==='PATCH'){const old=await api(calendarUrl(calendarId,eventId));if(!old.start?.dateTime)throw Error('当前写入接口支持定时日程，请通过 Google Calendar 修改全天日程。');previous={title:old.summary||'（无标题）',startAt:old.start.dateTime,duration:Math.max(5,(Date.parse(old.end.dateTime)-Date.parse(old.start.dateTime))/60000),notes:old.description||'',location:old.location||''};}const {cleanEvent}=require('./events.cjs');const e=cleanEvent(input,getTimeZone(),previous);const body={summary:e.title,description:e.notes+(e.zoomLink?'\n'+e.zoomLink:''),location:e.location,start:{dateTime:e.startAt},end:{dateTime:new Date(Date.parse(e.startAt)+e.duration*60000).toISOString()}};return api(u.href,{method,body:JSON.stringify(body)});}
 function plainBody(part){const collect=(p,mime)=>[...(p.mimeType===mime&&p.body?.data?[Buffer.from(p.body.data,'base64url').toString('utf8')]:[]),...(p.parts||[]).flatMap(child=>collect(child,mime))];const text=collect(part,'text/plain');if(text.length)return text.join('\n');return collect(part,'text/html').join('\n').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<(?:br|\/p|\/div|\/li)\b[^>]*>/gi,'\n').replace(/<[^>]+>/g,'').replace(/&(?:amp|lt|gt|quot|nbsp|#39);/g,x=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&nbsp;':' ','&#39;':"'"}[x])).replace(/&#(x[0-9a-f]+|\d+);/gi,(_m,n)=>{const code=n.startsWith('x')?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff?String.fromCodePoint(code):'';}).trim();}
 async function readMail(id){if(typeof id!=='string'||!id||id.length>256)throw Error('邮件 ID 不正确。');const m=await api('https://gmail.googleapis.com/gmail/v1/users/me/messages/'+encodeURIComponent(id)+'?format=full');const headers=m.payload?.headers||[];const header=name=>headers.find(h=>h.name.toLowerCase()===name)?.value||'';return {id:m.id,from:header('from'),to:header('to'),subject:header('subject'),date:header('date'),snippet:m.snippet||'',text:plainBody(m.payload||{}),labels:m.labelIds||[],source:'untrusted-email-content'};}
 async function readMails({query='is:unread',limit=20,pageToken}={}){if(typeof query!=='string'||query.length>2000)throw Error('邮件查询不正确。');const count=Math.min(100,Math.max(1,Number(limit)||20));const u=new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');u.searchParams.set('q',query);u.searchParams.set('maxResults',String(Math.floor(count)));if(pageToken){if(typeof pageToken!=='string'||pageToken.length>4096)throw Error('分页标记不正确。');u.searchParams.set('pageToken',pageToken);}const data=await api(u.href);const messages=await Promise.all((data.messages||[]).map(m=>readMail(m.id)));return {messages,nextPageToken:data.nextPageToken||null};}
 const meetingReader=createMeetingReader({api,getTimeZone});
 async function getMeetings(){if(!config.refreshToken)return {status:'not_connected',events:[]};return meetingReader.getMeetings();}
 async function getReminderEvents(){return config.refreshToken?meetingReader.getReminderEvents():[];}
 return {connection,saveConnection,connect,getSummary,getMeetings,getReminderEvents,readCalendar,writeCalendar,readMails,readMail,disconnect,dispose:()=>authorizeCancel?.()};
}
module.exports={createGoogle,dayWindow,zoomInEvent};

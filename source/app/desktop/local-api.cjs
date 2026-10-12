const fs=require('node:fs');const path=require('node:path');const http=require('node:http');const crypto=require('node:crypto');
const {createOpenApi,EDITOR_MAX_BYTES,UPLOAD_LIMITS}=require('./local-api-openapi.cjs');
function createLocalApi({app,safeStorage,google,events,browser,pageActions=browser,uploadRoots=[],applications,getSettings,demoSummary,automation,onCalendarChange=()=>{}}){
 const filename=path.join(app.getPath('userData'),'local-api.enc');let config={enabled:true,access:'full-orbit',port:42831,token:crypto.randomBytes(32).toString('base64url')},server=null,url='',failure='';
 try{if(fs.existsSync(filename))config={...config,...JSON.parse(safeStorage.decryptString(fs.readFileSync(filename)))};}catch{config.enabled=false;failure='API 配置无法解密，已停止服务。';}
 config.connectorKey||=crypto.randomBytes(32).toString('base64url');
 function save(){if(!safeStorage.isEncryptionAvailable())throw Error('Windows API 令牌加密不可用。');fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',safeStorage.encryptString(JSON.stringify(config)));fs.renameSync(filename+'.tmp',filename);}
 const reply=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
 const fail=(statusCode,code,message)=>{const error=Error(message);error.statusCode=statusCode;error.code=code;throw error;};
 async function body(req){if(req.orbitBody!==undefined)return req.orbitBody;
  if(!/^application\/json(?:;|$)/i.test(req.headers['content-type']||''))fail(400,'INVALID_CONTENT_TYPE','请使用 application/json。');
  if(Number(req.headers['content-length'])>8388608){req.resume();fail(413,'BODY_TOO_LARGE','请求体超过 8 MiB。');}
  const raw=await new Promise((resolve,reject)=>{const chunks=[];let bytes=0,tooLarge=false;req.on('data',chunk=>{if(tooLarge)return;bytes+=chunk.length;if(bytes>8388608){tooLarge=true;chunks.length=0;const error=Error('请求体超过 8 MiB。');error.statusCode=413;error.code='BODY_TOO_LARGE';reject(error);return;}chunks.push(chunk);});req.on('end',()=>{if(!tooLarge)resolve(Buffer.concat(chunks).toString('utf8'));});req.on('aborted',()=>reject(Error('请求在完成前中断。')));req.on('error',reject);});
  try{req.orbitBody=JSON.parse(raw||'{}');return req.orbitBody;}catch{fail(400,'INVALID_JSON','JSON 格式不正确。');}
 }
 function pageInput(value,allowed,{upload=false,write=false}={}){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(400,'INVALID_INPUT','请求参数必须是 JSON 对象。');
  if(Object.keys(value).some(key=>!allowed.includes(key)))fail(400,'UNKNOWN_PARAMETER','请求含有不支持的参数。');
  if(typeof value.expectedUrl!=='string'||value.expectedUrl.length>16384)fail(400,'EXPECTED_URL_REQUIRED','请提供目标网页的完整 expectedUrl。');
  let expected;try{expected=new URL(value.expectedUrl);}catch{fail(400,'INVALID_URL','expectedUrl 不是有效的网址。');}
  if(!['https:','http:','file:','orbit:'].includes(expected.protocol)||expected.username||expected.password)fail(400,'INVALID_URL','expectedUrl 必须是不含登录凭据的 HTTP(S) 网页地址。');
  const input={expectedUrl:expected.href};
  if(value.selector!==undefined){if(typeof value.selector!=='string'||!value.selector.trim()||value.selector.length>1024||value.selector.includes('\0'))fail(400,'INVALID_SELECTOR','selector 必须是长度不超过 1024 的非空 CSS 选择器。');input.selector=value.selector;}
  if(write){if(typeof value.text!=='string')fail(400,'TEXT_REQUIRED','请提供要写入的完整 text。');if(Buffer.byteLength(value.text,'utf8')>EDITOR_MAX_BYTES)fail(413,'EDITOR_TOO_LARGE','编辑器文本超过 4 MiB。');if(typeof value.expectedHash!=='string'||!/^\b[a-f0-9]{64}\b$/i.test(value.expectedHash))fail(400,'EXPECTED_HASH_REQUIRED','写入需提供读取时返回的 SHA256 expectedHash。');input.text=value.text;input.expectedHash=value.expectedHash.toLowerCase();}
  if(upload){if(!input.selector)fail(400,'SELECTOR_REQUIRED','上传需指定唯一 input[type=file] 的 selector。');if(!Array.isArray(value.paths)||value.paths.length<1||value.paths.length>UPLOAD_LIMITS.maxFiles||value.paths.some(file=>typeof file!=='string'||file.includes('\0')||!path.isAbsolute(file)))fail(400,'INVALID_PATHS','paths 必须包含 1–500 个本地文件的绝对路径。');if(new Set(value.paths).size!==value.paths.length)fail(400,'DUPLICATE_PATH','同一文件不能重复上传。');if(!Array.isArray(uploadRoots)||!uploadRoots.length)fail(403,'UPLOAD_ROOTS_UNSET','当前 API 没有配置可上传的本地目录。');input.paths=[...value.paths];input.roots=uploadRoots.includes('*')?[...new Set(input.paths.map(file=>path.parse(file).root))]:[...uploadRoots];input.limits={...UPLOAD_LIMITS};}
  return input;
 }
 async function pageAction(name,id,input){if(!id||id.length>256||/[\u0000-\u001f]/.test(id))fail(400,'INVALID_PAGE_ID','网页 ID 无效。');if(typeof pageActions?.[name]!=='function')fail(503,'PAGE_ACTION_UNAVAILABLE','此 Orbit 实例尚未接入网页编辑或上传能力。');return pageActions[name](id,input);}
 function authenticated(req){const expectedPath=Buffer.from('/mcp/'+config.connectorKey),providedPath=Buffer.from(String(req.url||'').split('?')[0]);if(providedPath.length===expectedPath.length&&crypto.timingSafeEqual(providedPath,expectedPath))return true;const provided=Buffer.from(req.headers.authorization||''),expected=Buffer.from('Bearer '+config.token);return provided.length===expected.length&&crypto.timingSafeEqual(provided,expected);}
 async function handler(req,res){
  if(Object.hasOwn(req.headers,'origin')||!/^127\.0\.0\.1:\d+$/.test(req.headers.host||'')||!['127.0.0.1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)){reply(res,403,{error:'仅接受本机 API 客户端。',code:'LOCAL_CLIENT_REQUIRED'});return;}
  if(!authenticated(req)){reply(res,401,{error:'需要有效的 Bearer 令牌。'});return;}
  try{const target=new URL(req.url,url),segments=target.pathname.split('/').filter(Boolean).map(decodeURIComponent),method=req.method;
   if(target.pathname==='/mcp'||target.pathname==='/mcp/'+config.connectorKey){
    if(method==='GET'||method==='DELETE')return reply(res,405,{error:'This stateless MCP endpoint accepts POST.'});
    if(method!=='POST')return reply(res,405,{error:'Use POST.'});
    const message=await body(req),answer=await require('./mcp-tools.cjs').rpc(message,async(method,pathname,input)=>{const address=new URL(pathname,url);if(address.origin!==new URL(url).origin)throw Error('Invalid API origin');const response=await fetch(address,{method,headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},...(input!==undefined&&method!=='GET'?{body:JSON.stringify(input)}:{})});return {status:response.status,body:await response.json()};});
    if(!answer){res.writeHead(202);res.end();return;}return reply(res,200,answer);
   }
   const controlled=automation?await automation.handle(method,target,['GET','DELETE'].includes(method)?{}:await body(req)):undefined;
   if(controlled!==undefined)return reply(res,200,controlled);

   if(target.origin!==new URL(url).origin||req.headers.host!==new URL(url).host)fail(403,'LOCAL_CLIENT_REQUIRED','请求地址必须与当前本机 API 地址一致。');
   if(method==='GET'&&target.pathname==='/v1/about')return reply(res,200,{name:'Orbit Workspace API',version:3,control:'full-orbit',background:true,mcp:url+'/mcp',help:'/v1/help',reminders:{leadMinutes:5,sound:'windows-device-connect',soundScope:'calendar-only',trayNotificationsSilent:true},...getSettings(),google:google.connection(),capabilities:[...(demoSummary?['local-demo-summary']:[]),'summary','gmail-read','calendar-read-write','meetings','page-text','local-events-crud','page-editor-read','page-editor-write','page-file-upload','page-element-click','page-dom-summary','openapi','page-evaluate','native-input','tabs-control','orbit-native-methods','orbit-ui-evaluate','download-management','settings-write','navigation-write','favorites-write','mcp-http','clipboard-read-write','window-control','pointer-drag','ui-native-input'],pageActions:{expectedUrlRequired:true,expectedHashRequiredForWrite:true,arbitraryJavaScript:true,readAvailable:typeof pageActions?.readPageEditor==='function',writeAvailable:typeof pageActions?.writePageEditor==='function',uploadAvailable:typeof pageActions?.uploadPageFiles==='function',clickAvailable:typeof pageActions?.clickPageElement==='function',domAvailable:typeof pageActions?.describePageDom==='function',uploadConfigured:uploadRoots.length>0,uploadScope:uploadRoots.includes('*')?'all-user-accessible-files':'configured-roots',uploadRoots:[...uploadRoots],editorMaxBytes:EDITOR_MAX_BYTES,uploadLimits:UPLOAD_LIMITS},openapi:'/v1/openapi.json'});
   if(method==='GET'&&target.pathname==='/v1/help')return reply(res,200,{version:'1.8.32',markdown:fs.readFileSync(path.join(__dirname,'API-guide.md'),'utf8')});if(method==='GET'&&target.pathname==='/v1/openapi.json'){const contract=createOpenApi(url,uploadRoots);if(!demoSummary)delete contract.paths['/v1/demo-summary'];return reply(res,200,contract);}
   if(target.pathname==='/v1/applications'&&applications&&method==='GET')return reply(res,200,applications.get());
   if(target.pathname==='/v1/applications'&&applications&&method==='PATCH')return reply(res,200,applications.update(await body(req)));
   if(target.pathname==='/v1/applications/budget'&&applications&&method==='PATCH')return reply(res,200,applications.budget(await body(req)));
   if(target.pathname==='/v1/applications/sync'&&applications&&method==='POST')return reply(res,200,await applications.sync());
   if(target.pathname==='/v1/demo-summary'&&demoSummary){if(method==='GET')return reply(res,200,demoSummary.get());if(method==='POST')return reply(res,200,demoSummary.set(await body(req)));if(method==='DELETE')return reply(res,200,demoSummary.clear());}
   if(method==='GET'&&target.pathname==='/v1/summary'){const summary=await google.getSummary();return reply(res,200,demoSummary?demoSummary.merge(summary):summary);}
   if(method==='GET'&&target.pathname==='/v1/meetings')return reply(res,200,await google.getMeetings());
   if(method==='GET'&&target.pathname==='/v1/pages')return reply(res,200,{pages:browser.pages()});
   if(method==='GET'&&segments[0]==='v1'&&segments[1]==='pages'&&segments[3]==='text'&&segments.length===4)return reply(res,200,await browser.pageText(segments[2]));
   if(segments[0]==='v1'&&segments[1]==='pages'&&segments.length===4&&segments[3]==='editor'){
    if(method==='GET'){if([...target.searchParams.keys()].some(key=>!['expectedUrl','selector'].includes(key))||[...new Set(target.searchParams.keys())].some(key=>target.searchParams.getAll(key).length!==1))fail(400,'UNKNOWN_PARAMETER','读取编辑器仅接受唯一的 expectedUrl 和可选 selector。');const input=pageInput(Object.fromEntries(target.searchParams),['expectedUrl','selector']);return reply(res,200,await pageAction('readPageEditor',segments[2],input));}
    if(method==='PATCH'){const input=pageInput(await body(req),['expectedUrl','selector','text','expectedHash'],{write:true});return reply(res,200,await pageAction('writePageEditor',segments[2],input));}
    return reply(res,405,{error:'编辑器接口仅支持 GET 或 PATCH。',code:'METHOD_NOT_ALLOWED'});
   }
   if(segments[0]==='v1'&&segments[1]==='pages'&&segments.length===4&&segments[3]==='upload'){
    if(method!=='POST')return reply(res,405,{error:'上传接口仅支持 POST。',code:'METHOD_NOT_ALLOWED'});
    const input=pageInput(await body(req),['expectedUrl','selector','paths'],{upload:true});return reply(res,200,await pageAction('uploadPageFiles',segments[2],input));
   }
   if(segments[0]==='v1'&&segments[1]==='pages'&&segments.length===4&&segments[3]==='click'){
    if(method!=='POST')return reply(res,405,{error:'点击接口仅支持 POST。',code:'METHOD_NOT_ALLOWED'});
    const input=pageInput(await body(req),['expectedUrl','selector']);if(!input.selector)fail(400,'SELECTOR_REQUIRED','点击需指定唯一可见元素的 selector。');return reply(res,200,await pageAction('clickPageElement',segments[2],input));
   }
   if(segments[0]==='v1'&&segments[1]==='pages'&&segments.length===4&&segments[3]==='dom'){
    if(method!=='GET')return reply(res,405,{error:'DOM 摘要接口仅支持 GET。',code:'METHOD_NOT_ALLOWED'});
    if([...target.searchParams.keys()].some(key=>key!=='expectedUrl')||target.searchParams.getAll('expectedUrl').length!==1)fail(400,'UNKNOWN_PARAMETER','DOM 摘要仅接受唯一的 expectedUrl。');
    const input=pageInput(Object.fromEntries(target.searchParams),['expectedUrl']);return reply(res,200,await pageAction('describePageDom',segments[2],input));
   }
   if(target.pathname==='/v1/local-events'&&method==='GET')return reply(res,200,events.get());
   if(target.pathname==='/v1/local-events'&&method==='POST')return reply(res,201,events.create(await body(req)));
   if(segments[0]==='v1'&&segments[1]==='local-events'&&segments.length===3){if(method==='PATCH')return reply(res,200,events.update(segments[2],await body(req)));if(method==='DELETE')return reply(res,200,events.remove(segments[2]));}
   if(segments[0]==='v1'&&segments[1]==='gmail'&&segments[2]==='messages'){if(method==='GET'&&segments.length===3)return reply(res,200,await google.readMails({query:target.searchParams.get('q')||'is:unread',limit:target.searchParams.get('limit')||20,pageToken:target.searchParams.get('pageToken')}));if(method==='GET'&&segments.length===4)return reply(res,200,await google.readMail(segments[3]));}
   if(segments[0]==='v1'&&segments[1]==='calendar'&&segments[2]==='events'){const calendarId=target.searchParams.get('calendarId')||'primary';if(method==='GET'&&segments.length===3)return reply(res,200,await google.readCalendar({calendarId,start:target.searchParams.get('start'),end:target.searchParams.get('end')}));if(['POST','PATCH','DELETE'].includes(method)){if(!google.connection().calendarWrite)return reply(res,403,{error:'请先在设置 → 本机数据 API 中启用 Google 日历写入授权。'});if((method==='POST'&&segments.length!==3)||(method!=='POST'&&segments.length!==4))throw Error('日历路径不正确。');const result=await google.writeCalendar(method,calendarId,segments[3],method==='DELETE'?{}:await body(req));onCalendarChange();return reply(res,method==='POST'?201:200,result);}}
   return reply(res,404,{error:'未找到 API 路径。'});
  }catch(error){const statusCode=[400,403,404,409,413,422,503].includes(error.statusCode)?error.statusCode:400;reply(res,statusCode,{error:error.message||'操作失败。',...(typeof error.code==='string'&&/^[A-Z][A-Z0-9_]{0,63}$/.test(error.code)?{code:error.code}:{})});}
 }
 async function start(){if(server||!config.enabled)return status();try{save();server=http.createServer(handler);server.requestTimeout=30000;server.headersTimeout=10000;const listen=port=>new Promise((resolve,reject)=>{const error=e=>{server.removeListener('listening',ready);reject(e);};const ready=()=>{server.removeListener('error',error);resolve();};server.once('error',error);server.once('listening',ready);server.listen(port,'127.0.0.1');});try{await listen(config.port);}catch(error){if(error.code!=='EADDRINUSE')throw error;await listen(0);}config.port=server.address().port;save();url='http://127.0.0.1:'+config.port;refreshMcpHost();failure='';}catch(error){failure=error.message;server?.close();server=null;url='';}return status();}
 function stop(){server?.closeAllConnections();server?.close();server=null;url='';}
 function status(){return {enabled:!!server&&!!url,url,mcpUrl:url?url+'/mcp':'',access:'full-orbit',background:true,error:failure,calendarWrite:!!google.connection().calendarWrite};}
 async function configure({enabled,rotate}={}){if(rotate){config.token=crypto.randomBytes(32).toString('base64url');config.connectorKey=crypto.randomBytes(32).toString('base64url');}if(typeof enabled==='boolean')config.enabled=enabled;save();if(!config.enabled)stop();else await start();return status();}
 function refreshMcpHost(){const directory=path.join(app.getPath('userData'),'mcp');fs.mkdirSync(directory,{recursive:true});const metadata=path.join(directory,'host.json'),bridge=path.join(directory,'orbit-mcp.ps1');fs.writeFileSync(metadata,JSON.stringify({url}));fs.writeFileSync(bridge,fs.readFileSync(path.join(__dirname,'mcp-http-bridge.ps1')));return {metadata,bridge};}
 function mcpConfig(){const files=refreshMcpHost();return {mcpServers:{orbit:{command:'powershell.exe',args:['-NoProfile','-ExecutionPolicy','Bypass','-File',files.bridge,'-HostMetadata',files.metadata],env:{ORBIT_API_TOKEN:config.token}}}};}

 function codexConfig(){const c=mcpConfig().mcpServers.orbit;return ['[mcp_servers.orbit]','command = '+JSON.stringify(c.command),'args = '+JSON.stringify(c.args),'default_tools_approval_mode = "approve"','startup_timeout_sec = 30','tool_timeout_sec = 120','','[mcp_servers.orbit.env]','ORBIT_API_TOKEN = '+JSON.stringify(c.env.ORBIT_API_TOKEN),''].join('\n');}
 function chatgptConfig(){return {privateMcpUrl:url+'/mcp/'+config.connectorKey,connection:'Secure MCP Tunnel',authentication:'No authentication',permissions:'full-orbit',instructions:'Configure this private URL as the tunnel upstream. Connect that tunnel in ChatGPT Plugins. Keep the URL private; rotating Orbit access revokes it.'};}
 return {start,stop,status,configure,mcpConfig,codexConfig,chatgptConfig,clientConfig:()=>({url,headers:{Authorization:'Bearer '+config.token}}),mcpEnv:()=>({ORBIT_API_URL:url,ORBIT_API_TOKEN:config.token})};
}
module.exports={createLocalApi};


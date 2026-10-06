const readline=require('node:readline');
const base=process.env.ORBIT_API_URL,token=process.env.ORBIT_API_TOKEN;
const send=value=>process.stdout.write(JSON.stringify(value)+'\n');
readline.createInterface({input:process.stdin}).on('line',async line=>{let request;try{request=JSON.parse(line);if(request.id===undefined)return;let result;
if(request.method==='initialize')result={protocolVersion:request.params?.protocolVersion||'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'orbit-public',version:'1.8.0'}};
else if(request.method==='ping')result={};
else if(request.method==='tools/list')result={tools:[{name:'orbit_request',description:'Access the Orbit local API',inputSchema:{type:'object',properties:{path:{type:'string'},method:{type:'string',enum:['GET','POST','PATCH','DELETE']},body:{type:'object'}},required:['path']}}]};
else if(request.method==='tools/call'){const a=request.params.arguments||{};if(request.params.name!=='orbit_request'||!/^\/v1\//.test(a.path))throw Error('Invalid tool or API path');const target=new URL(a.path,base);if(target.origin!==new URL(base).origin)throw Error('Invalid API origin');const r=await fetch(target,{method:a.method||'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(a.body?{body:JSON.stringify(a.body)}:{})});result={content:[{type:'text',text:await r.text()}],isError:!r.ok};}
else{send({jsonrpc:'2.0',id:request.id,error:{code:-32601,message:'Method not found'}});return;}send({jsonrpc:'2.0',id:request.id,result});
}catch(e){if(request?.id!==undefined)send({jsonrpc:'2.0',id:request.id,error:{code:-32603,message:e.message}});}});

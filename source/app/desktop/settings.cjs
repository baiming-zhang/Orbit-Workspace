const fs=require('node:fs');
const path=require('node:path');
const time=require('../dist/timezone.js');
function createSettings(app){const filename=path.join(app.getPath('userData'),'workspace-settings.json');let timeZone=Intl.DateTimeFormat().resolvedOptions().timeZone||'UTC',language='en';try{const saved=JSON.parse(fs.readFileSync(filename,'utf8'));timeZone=time.normalize(saved.timeZone);language=saved.language==='zh'?'zh':'en';}catch{}
 function write(next){fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',JSON.stringify(next));fs.renameSync(filename+'.tmp',filename);timeZone=next.timeZone;language=next.language;return {ok:true,timeZone,language};}
 return {get:()=>({timeZone,language}),save:value=>write({timeZone:time.normalize(value),language}),saveLanguage:value=>{if(!['zh','en'].includes(value))throw Error('请选择中文或 English。');return write({timeZone,language:value});}};
}
module.exports={createSettings};

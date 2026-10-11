const {normalizeWebUrl}=require('../dist/url-utils.js');
const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const {defaults,restoreRequired}=require('../dist/navigation.js');
const defaultCategories=[{id:'work',name:'工作',color:'#d95656'},{id:'study',name:'学习',color:'#4285f4'},{id:'life',name:'生活',color:'#e9b52d'}];
function cleanCategory(input){if(!input||typeof input.name!=='string'||!input.name.trim()||Array.from(input.name.trim()).length>24||typeof input.color!=='string'||!/^#[a-f0-9]{6}$/i.test(input.color))throw Error('分类名称或颜色无效。');return {id:input.id||'category-'+crypto.randomUUID(),name:input.name.trim(),color:input.color.toLowerCase()};}
const base=new Map(defaults.map(item=>[item.id,item]));
function cleanItem(input,previous){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('导航数据无效。');
 const id=previous?.id||'nav-'+crypto.randomUUID(),original=base.get(id);const name=String(input.name??previous?.name??'').trim();
 if(!name||Array.from(name).length>40)throw Error('名称需为 1–40 个字。');
 const position=input.position??previous?.position??'normal',color=input.color??previous?.color??'',category=input.category??previous?.category??'';
 if(typeof category!=='string'||category&&!['work','study','life'].includes(category)&&!/^category-[a-f0-9-]{36}$/.test(category))throw Error('分类不存在。');
 if(!['normal','pinned','bottom'].includes(position))throw Error('导航位置无效。');
 if(typeof color!=='string'||color&&!/^#[a-f0-9]{6}$/i.test(color))throw Error('导航颜色无效。');
 const iconData=input.iconData??previous?.iconData??'';
 if(typeof iconData!=='string'||iconData.length>262144||iconData&&(!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(iconData)||!Buffer.from(iconData.split(',')[1],'base64').subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))))throw Error('请选择有效的本地图标。');
 let url='';if(!original?.internal){try{const raw=normalizeWebUrl(String(input.url??previous?.url??''));const u=new URL(id==='gmail'&&raw==='https://mail.google.com/'?'https://mail.google.com/mail/u/0/':raw);if(!['https:','http:'].includes(u.protocol)||u.username||u.password||!u.hostname||u.href.length>16384)throw Error();url=u.href;}catch{throw Error('请输入完整的 http:// 或 https:// 网页地址。');}}
 return {...original,id,name,...(!original?.internal?{url}:{}),iconData,position,color,category,custom:!original};
}
function sortNavigation(items){const rank={pinned:0,normal:1,bottom:2};return items.slice().sort((a,b)=>(rank[a.position]??1)-(rank[b.position]??1));}
function createNavigation({app}){
 const filename=path.join(app.getPath('userData'),'navigation.json');let categories=defaultCategories.map(c=>({...c}));let items=defaults.map(item=>({...item,iconData:'',custom:false})),loadFailed=false,upgrade=false;
 try{if(fs.existsSync(filename)){const data=JSON.parse(fs.readFileSync(filename,'utf8'));upgrade=data.version!==6;if(data.categories!==undefined){if(!Array.isArray(data.categories)||data.categories.length>53)throw Error();const custom=data.categories.filter(c=>!defaultCategories.some(d=>d.id===c.id));const ids=new Set();for(const c of custom){if(!/^category-[a-f0-9-]{36}$/.test(c.id)||ids.has(c.id))throw Error();ids.add(c.id);categories.push(cleanCategory(c));}}if(!Array.isArray(data.items)||data.items.length>302)throw Error();const ids=new Set();items=data.items.map(item=>{if(typeof item.id!=='string'||(!base.has(item.id)&&!/^nav-[a-f0-9-]{36}$/.test(item.id))||ids.has(item.id))throw Error();ids.add(item.id);const cleaned=cleanItem(item,{id:item.id});if(cleaned.category&&!categories.some(c=>c.id===cleaned.category))throw Error();return cleaned;});}}catch{loadFailed=true;items=defaults.map(item=>({...item,iconData:'',custom:false}));}
 items=sortNavigation(items);
 function get(){return {ok:true,items:items.map(item=>({...item})),categories:categories.map(c=>({...c})),loadFailed};}
 function commit(next){next=sortNavigation(next);if(loadFailed)throw Error('导航配置读取失败，原文件已保留。');fs.mkdirSync(path.dirname(filename),{recursive:true});fs.writeFileSync(filename+'.tmp',JSON.stringify({version:6,items:next,categories},null,2));fs.renameSync(filename+'.tmp',filename);items=next;return get();}
 if(upgrade&&!loadFailed){if(!items.some(i=>i.id==='browser'))items.splice(Math.max(0,items.findIndex(i=>i.id==='overview')+1),0,{...base.get('browser'),iconData:'',custom:false});if(!items.some(i=>i.id==='pdf'))items.splice(Math.max(0,items.findIndex(i=>i.id==='browser')+1),0,{...base.get('pdf'),iconData:'',custom:false});try{commit(items);}catch{loadFailed=true;}}
 return {get,addCategory(input){if(categories.length>=53)throw Error('分类数量已达到上限。');const category=cleanCategory({...input,id:undefined});if(categories.some(c=>c.name.toLocaleLowerCase()===category.name.toLocaleLowerCase()))throw Error('此分类名称已存在。');const previous=categories;categories=[...categories,category];try{return {...commit(items),category};}catch(error){categories=previous;throw error;}},save(input){const index=input.id?items.findIndex(item=>item.id===input.id):-1;if(input.id&&index<0)throw Error('导航项不存在。');if(index<0&&items.length>=300)throw Error('导航项已达到上限。');if(input.category!==undefined){const category=categories.find(c=>c.id===input.category);if(input.category&&!category)throw Error('分类不存在。');input={...input,color:category?.color||''};}const item=cleanItem(input,index<0?undefined:items[index]);const next=items.slice();if(index<0)next.push(item);else next[index]=item;return {...commit(next),item};},remove(id){if(!items.some(item=>item.id===id))throw Error('导航项不存在。');return commit(items.filter(item=>item.id!==id));},reorder(ids){if(!Array.isArray(ids)||ids.length!==items.length||new Set(ids).size!==items.length||ids.some(id=>!items.some(item=>item.id===id)))throw Error('导航排序无效。');return commit(ids.map(id=>items.find(item=>item.id===id)));}};
}
async function chooseNavigationIcon({app,dialog,nativeImage,window,language='zh'}){
 const result=await dialog.showOpenDialog(window,{title:language==='en'?'Choose navigation icon':'选择导航图标',defaultPath:app.getPath('desktop'),properties:['openFile'],filters:[{name:language==='en'?'Images, icons, or desktop shortcuts':'图片、图标或桌面快捷方式',extensions:['png','jpg','jpeg','ico','exe','lnk']}]});
 if(result.canceled||!result.filePaths.length)return {ok:true,canceled:true};
 const selected=result.filePaths[0],extension=path.extname(selected).toLowerCase();let image;
 if(['.exe','.lnk'].includes(extension))image=await app.getFileIcon(selected,{size:'large'});
 else{if(!['.png','.jpg','.jpeg','.ico'].includes(extension)||fs.statSync(selected).size>5*1024*1024)throw Error('请选择 5 MB 以内的 PNG、JPG 或 ICO 图标。');image=nativeImage.createFromPath(selected);}
 if(image.isEmpty())throw Error('无法读取这个图标，请尝试 PNG、JPG 或 ICO 文件。');const size=image.getSize(),scale=Math.min(1,64/Math.max(size.width,size.height));
 const iconData=image.resize({width:Math.max(1,Math.round(size.width*scale)),height:Math.max(1,Math.round(size.height*scale))}).toDataURL();return {ok:true,iconData,filename:path.basename(selected)};
}
module.exports={createNavigation,cleanItem,chooseNavigationIcon};


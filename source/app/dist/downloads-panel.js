(()=>{
 let latest={items:[],folder:'',language:'en'};
 const list=document.getElementById('download-list'),error=document.getElementById('error'),tr=(en,zh)=>latest.language==='zh'?zh:en;
 const size=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?(n/1024).toFixed(0)+' KB':n+' B';
 function render(data){
  latest=data;document.documentElement.lang=data.language==='zh'?'zh-CN':'en';document.title=document.getElementById('title').textContent=tr('Downloads','下载');document.querySelector('.panel').setAttribute('aria-label',document.title);
  for(const [id,label] of [['folder',tr('Open Downloads folder','打开下载文件夹')],['close',tr('Close','关闭')]]){const button=document.getElementById(id);button.title=label;button.setAttribute('aria-label',label);}
  document.getElementById('download-folder').textContent=data.folder;document.getElementById('download-folder').title=data.folder;
  const ids=new Set(data.items.map(item=>item.id));for(const row of list.querySelectorAll('[data-id]'))if(!ids.has(row.dataset.id))row.remove();list.querySelector('.empty')?.remove();
  if(!data.items.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=tr('No downloads yet','还没有下载记录');list.append(empty);return;}
  let position=0;
  for(const item of data.items){
   let row=Array.from(list.children).find(el=>el.dataset.id===item.id);
   if(!row){row=document.createElement('section');row.className='download-row';row.dataset.id=item.id;row.setAttribute('role','listitem');row.innerHTML='<span class="file-icon" aria-hidden="true">↓</span><div class="detail"><strong></strong><p></p><progress max="100"></progress><small class="path"></small><div class="controls"></div></div>';list.insertBefore(row,list.children[position]||null);}
   position++;const busy=['progressing','paused'].includes(item.state),status={progressing:tr('Downloading','下载中'),paused:tr('Paused','已暂停'),completed:tr('Completed','已完成'),cancelled:tr('Cancelled','已取消'),interrupted:tr('Interrupted','下载中断')}[item.state]||item.state;
   row.querySelector('strong').textContent=item.name;row.querySelector('strong').title=item.name;row.querySelector('p').textContent=status+' · '+size(item.received)+(item.total?' / '+size(item.total):'');
   const progress=row.querySelector('progress');progress.hidden=!busy;if(item.total)progress.value=Math.min(100,item.received/item.total*100);else progress.removeAttribute('value');progress.setAttribute('aria-label',item.name+' · '+status);
   row.querySelector('.path').textContent=item.path;row.querySelector('.path').title=item.path;
   const key=item.state+':'+latest.language,controls=row.querySelector('.controls');if(controls.dataset.state!==key){controls.replaceChildren();controls.dataset.state=key;for(const [action,label] of item.state==='completed'?[['open',tr('Open','打开')],['show',tr('Show in folder','所在文件夹')]]:busy?[['cancel',tr('Cancel','取消')]]:[]){const button=document.createElement('button');button.dataset.action=action;button.textContent=label;controls.append(button);}}
  }
 }
 document.getElementById('close').onclick=()=>window.orbitDownloads.close();document.getElementById('folder').onclick=()=>act(null,'folder');
 async function act(id,action){try{const result=await window.orbitDownloads.action(id,action);if(!result.ok)throw Error(result.error);error.hidden=true;}catch(e){error.textContent=OrbitI18n.text(e.message,latest.language);error.hidden=false;}}
 list.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)act(button.closest('[data-id]').dataset.id,button.dataset.action);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();window.orbitDownloads.close();}});
 window.orbitDownloads.onChange(render);window.orbitDownloads.get().then(render).catch(()=>{error.hidden=false;error.textContent=tr('Unable to load downloads.','无法加载下载记录。');});
})();

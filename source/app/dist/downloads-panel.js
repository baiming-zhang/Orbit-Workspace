(()=>{
 let latest={items:[],folder:'',language:'en'};
 const list=document.getElementById('download-list'),error=document.getElementById('error'),tr=(en,zh)=>latest.language==='zh'?zh:en;
 const size=n=>n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?(n/1024).toFixed(0)+' KB':n+' B';
 const icons={show:'<path d="M3 7V5h6l2 2h10v13H3z"/>',trash:'<path d="M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>'};
 const icon=action=>'<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">'+icons[action]+'</svg>';
 const menu=document.createElement('div');menu.id='file-menu';menu.role='menu';menu.hidden=true;document.body.append(menu);
 function dismissMenu(){menu.hidden=true;menu.replaceChildren();}
 function render(data){
  latest=data;document.documentElement.lang=data.language==='zh'?'zh-CN':'en';document.title=document.getElementById('title').textContent=tr('Downloads','下载');document.querySelector('.panel').setAttribute('aria-label',document.title);
  for(const [id,label] of [['folder',tr('Open Downloads folder','打开下载文件夹')],['options',tr('Download options','下载选项')],['close',tr('Close','关闭')]]){const button=document.getElementById(id);button.title=label;button.setAttribute('aria-label',label);}
  const ids=new Set(data.items.map(item=>item.id));for(const row of list.querySelectorAll('[data-id]'))if(!ids.has(row.dataset.id))row.remove();list.querySelector('.empty')?.remove();
  if(!data.items.length){const empty=document.createElement('div');empty.className='empty';empty.textContent=tr('No downloads yet','还没有下载记录');list.append(empty);return;}
  let position=0;
  for(const item of data.items){
   let row=Array.from(list.children).find(el=>el.dataset.id===item.id);
   if(!row){row=document.createElement('section');row.className='download-row';row.dataset.id=item.id;row.setAttribute('role','listitem');row.innerHTML='<span class="file-icon" aria-hidden="true"></span><div class="detail"><a class="file-name" href="#" data-action="open"></a><div class="status-line"><p></p><div class="controls"></div></div><div class="editor"></div></div><button class="file-folder" data-action="show"></button><button class="trash" data-action="trash"></button>';list.insertBefore(row,list.children[position]||null);}
   const fileIcon=row.querySelector('.file-icon');if(!fileIcon.firstChild||fileIcon.dataset.icon!==(item.icon||'')){fileIcon.dataset.icon=item.icon||'';fileIcon.replaceChildren();if(item.icon){const image=document.createElement('img');image.src=item.icon;image.alt='';image.onerror=()=>{fileIcon.dataset.icon='';fileIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>';};fileIcon.append(image);}else fileIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h8l4 4v14H6zM14 3v5h4M9 12h6M9 16h6"/></svg>';}
   position++;const busy=['progressing','paused'].includes(item.state),pending=item.state==='awaiting-confirmation',available=['completed','moved'].includes(item.state);
   const status={progressing:tr('Downloading','下载中'),paused:tr('Paused','已暂停'),'awaiting-confirmation':tr('Confirm download','确认下载'),completed:tr('Completed','已完成'),moved:tr('Moved','已移动'),deleted:tr('Deleted','已删除'),cancelled:tr('Cancelled','已取消'),interrupted:tr('Interrupted','下载中断')}[item.state]||item.state;
   row.classList.toggle('deleted',['deleted','cancelled'].includes(item.state));
   const name=row.querySelector('.file-name');name.textContent=item.name;name.title=item.name;name.setAttribute('aria-disabled',String(!available||!!item.fileBusy));name.tabIndex=available?0:-1;
   const text=row.querySelector('p');text.textContent=pending?status+' · '+(item.total?size(item.total):tr('Size unknown','文件大小未知')):status+' · '+size(item.received)+(item.total?' / '+size(item.total):'');
   if(item.error==='folder-unavailable')text.textContent+=' · '+tr('Choose another download folder.','请更改下载目录。');
   text.title=text.textContent;
   for(const action of ['show','trash']){const button=row.querySelector('[data-action="'+action+'"]');button.title=action==='show'?tr('Show in folder','打开文件夹'):tr('Move to Recycle Bin','放入回收站');button.setAttribute('aria-label',button.title);button.disabled=!available||!!item.fileBusy;if(!button.firstChild)button.innerHTML=icon(action);}
   const editForm=row.querySelector('.editor form');if(editForm){editForm.querySelector('input').setAttribute('aria-label',tr('Filename','文件名'));editForm.querySelector('[type="submit"]').textContent=tr('Save','保存');editForm.querySelector('[type="button"]').textContent=tr('Cancel','取消');}
   if(!available)row.querySelector('.editor').replaceChildren();
   const key=item.state+':'+latest.language+':'+!!item.fileBusy,controls=row.querySelector('.controls');if(controls.dataset.state!==key){controls.replaceChildren();controls.dataset.state=key;for(const [action,label] of pending?[['keep',tr('Keep','保留')],['cancel',tr('Cancel','取消')]]:busy?[['cancel',tr('Cancel','取消')]]:[]){const button=document.createElement('button');button.dataset.action=action;button.textContent=label;button.disabled=!!item.fileBusy;controls.append(button);}}
  }
 }
 async function act(id,action,value){try{const result=await window.orbitDownloads.action(id,action,value);if(!result.ok)throw Error(result.error);error.hidden=true;return true;}catch(e){error.textContent=OrbitI18n.text(e.message,latest.language);error.hidden=false;return false;}}
 function rename(row){const item=latest.items.find(item=>item.id===row.dataset.id),editor=row.querySelector('.editor');if(!item||item.fileBusy||!['completed','moved'].includes(item.state))return;editor.replaceChildren();const form=document.createElement('form'),input=document.createElement('input');input.type='text';input.value=item.name;input.maxLength=255;input.required=true;input.setAttribute('aria-label',tr('Filename','文件名'));const save=document.createElement('button');save.type='submit';save.textContent=tr('Save','保存');const cancel=document.createElement('button');cancel.type='button';cancel.textContent=tr('Cancel','取消');cancel.onclick=()=>editor.replaceChildren();form.append(input,save,cancel);editor.append(form);input.focus();input.select();form.onsubmit=async event=>{event.preventDefault();save.disabled=true;if(await act(item.id,'rename',input.value))editor.replaceChildren();else save.disabled=false;};}
 list.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(!button)return;event.preventDefault();if(button.disabled||button.getAttribute('aria-disabled')==='true')return;dismissMenu();const row=button.closest('[data-id]');act(row.dataset.id,button.dataset.action);});
 list.addEventListener('contextmenu',event=>{
  const name=event.target.closest('.file-name');if(!name)return;event.preventDefault();dismissMenu();const row=name.closest('[data-id]'),item=latest.items.find(item=>item.id===row.dataset.id);
  for(const [action,label] of [['open',tr('Open','打开')],['rename',tr('Rename','修改文件名')],['move',tr('Move to new folder…','移动到新文件夹…')]]){const button=document.createElement('button');button.role='menuitem';button.dataset.action=action;button.textContent=label;button.disabled=!['completed','moved'].includes(item.state)||!!item.fileBusy;button.onclick=()=>{dismissMenu();if(action==='rename')rename(row);else act(item.id,action);};menu.append(button);}
  menu.hidden=false;menu.style.left=Math.max(8,Math.min(event.clientX,innerWidth-menu.offsetWidth-8))+'px';menu.style.top=Math.max(8,Math.min(event.clientY,innerHeight-menu.offsetHeight-8))+'px';menu.querySelector('button:not(:disabled)')?.focus();
 });
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))dismissMenu();});
 menu.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();const buttons=[...menu.querySelectorAll('button:not(:disabled)')],index=buttons.indexOf(document.activeElement);buttons[event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}});
 document.getElementById('close').onclick=()=>window.orbitDownloads.close();document.getElementById('folder').onclick=()=>act(null,'folder');document.getElementById('options').onclick=()=>window.orbitDownloads.menu();document.querySelector('header').oncontextmenu=event=>{event.preventDefault();window.orbitDownloads.menu();};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();if(!menu.hidden){dismissMenu();return;}const editor=list.querySelector('.editor form');if(editor)editor.remove();else window.orbitDownloads.close();}});
 setInterval(()=>window.orbitDownloads.get().then(data=>{if(JSON.stringify(data)!==JSON.stringify(latest))render(data);}).catch(()=>{}),2000);
 window.orbitDownloads.onChange(render);window.orbitDownloads.get().then(render).catch(()=>{error.hidden=false;error.textContent=tr('Unable to load downloads.','无法加载下载记录。');});
})();

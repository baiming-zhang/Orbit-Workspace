(function(){
 let latest={items:[],active:0,folder:''};
 const en=()=>prefs.language==='en',label=(zh,english)=>en()?english:zh;
 function size(n){return n>=1048576?(n/1048576).toFixed(1)+' MB':n>=1024?(n/1024).toFixed(0)+' KB':n+' B';}
 function rows(){return latest.items.length?latest.items.map(item=>{
 const busy=['progressing','paused'].includes(item.state),percent=item.total?Math.min(100,Math.round(item.received/item.total*100)):0;
 const status={progressing:label('下载中','Downloading'),paused:label('已暂停','Paused'),completed:label('已完成','Completed'),cancelled:label('已取消','Cancelled'),interrupted:label('下载中断','Interrupted')}[item.state]||item.state;
 return '<section class="download-row"><div class="download-file-icon">↓</div><div class="download-detail"><strong data-user-content>'+escapeHtml(item.name)+'</strong><p>'+status+' · '+size(item.received)+(item.total?' / '+size(item.total):'')+'</p>'+(busy?'<progress max="100" value="'+percent+'"></progress>':'')+'<small data-user-content>'+escapeHtml(item.path)+'</small></div><div class="download-controls">'+(item.state==='completed'?'<button class="secondary-btn" data-download-action="open" data-id="'+item.id+'">'+label('打开','Open')+'</button><button class="text-link" data-download-action="show" data-id="'+item.id+'">'+label('所在文件夹','Show in folder')+'</button>':busy?'<button class="text-link" data-download-action="cancel" data-id="'+item.id+'">'+label('取消','Cancel')+'</button>':'')+'</div></section>';
 }).join(''):'<div class="downloads-empty"><span>↓</span><h3>'+label('还没有下载记录','No downloads yet')+'</h3><p>'+label('下载的文件和进度会显示在这里。','Downloaded files and progress will appear here.')+'</p></div>';}
 function update(data){latest=data;const badge=document.querySelector('.download-badge');if(badge){badge.hidden=!data.active;badge.textContent=data.active;}const list=document.querySelector('#download-list');if(list)list.innerHTML=rows();}
 async function open(){const result=await window.orbitDesktop?.getDownloads();if(!result)return;update(result);openModal(label('下载','Downloads'),'<div class="downloads-toolbar"><div><strong>'+label('下载位置','Download location')+'</strong><p data-user-content>'+escapeHtml(latest.folder)+'</p></div><button class="secondary-btn" data-download-action="folder">'+label('打开下载文件夹','Open Downloads folder')+'</button></div><div id="download-list">'+rows()+'</div>',true);}
 document.addEventListener('click',async event=>{const trigger=event.target.closest('[data-action="downloads"]');if(trigger){await open();return;}const button=event.target.closest('[data-download-action]');if(button){try{const r=await window.orbitDesktop.downloadAction(button.dataset.id,button.dataset.downloadAction);if(!r.ok)throw Error(r.error);}catch(e){toast(e.message);}}});
 window.addEventListener('DOMContentLoaded',()=>{window.orbitDesktop?.onDownloadsChanged(update);window.orbitDesktop?.getDownloads().then(update).catch(()=>{});});
 window.OrbitDownloads={open,update};
})();

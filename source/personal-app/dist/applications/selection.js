window.SelectionDirectory=(()=>{
 let snapshot=null,signature='',onChange=()=>{};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function id(kind,p){return kind==='PhD'?'phd-'+p.id:p.id;}
 function deadline(kind,p){return snapshot?.items.find(i=>i.id===id(kind,p))?.deadline||(kind==='PhD'?p.admissions?.deadline||p.waiver?.finalApplicationDeadline:p.deadline)||'';}
 function selected(kind,p){return snapshot?.items.find(i=>i.id===id(kind,p))?.selected||false;}
 function groups(kind,records,render){return [true,false].map(chosen=>{const sorted=records.filter(p=>selected(kind,p)===chosen).sort((a,b)=>(deadline(kind,a)||'9999-99-99').localeCompare(deadline(kind,b)||'9999-99-99')||String(a.schoolShort||a.university).localeCompare(String(b.schoolShort||b.university))||a.id.localeCompare(b.id));return '<details class="directory-group selection-group" data-selection="'+chosen+'" '+(chosen?'open':'')+'><summary><span class="group-name">'+(chosen?'已选择':'未选择')+'</span><span class="group-count">'+sorted.length+' 项</span></summary><div class="directory-items">'+sorted.map(render).join('')+(sorted.length?'':'<p class="directory-empty">暂无项目</p>')+'</div></details>';}).join('');}
 async function refresh(){const next=await window.desktopAPI.getApplications(),key=JSON.stringify([next.budget.usdCny,next.finance.cadUsd,next.items.map(i=>[i.id,i.selected,i.deadline])]);snapshot=next;window.CompletionFinance.update(next);if(key!==signature){signature=key;onChange();}}
 window.addEventListener('application-data-changed',refresh);setTimeout(refresh,0);
 return {groups,setOnChange:callback=>{onChange=callback;}};
})();

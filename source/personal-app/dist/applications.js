window.OrbitApplications=(()=>{
 let snapshot=null,tab="plan";
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function refresh(){const next=await window.orbitDesktop?.getApplications();if(next){snapshot=next;for(const f of document.querySelectorAll('.application-frame'))f.contentWindow?.dispatchEvent(new Event('application-data-changed'));if(typeof state!=='undefined'&&state.page==='overview')render();}}
 function dashboard(){if(typeof liveSummary!=='undefined'&&liveSummary.demo)return demoDashboard();const s=snapshot;return '<div class="section-top"><h2>重要倒计时</h2><a class="text-link" href="#applications">管理申请 →</a></div><div class="two-columns countdown-grid"><section class="countdown-card ubc-countdown"><div><span>UBC 访问结束</span><strong>'+ (s?Math.max(0,s.ubc.days):'…')+'<small> 天</small></strong><p>'+esc(s?.ubc?.date||'')+'</p></div><span class="countdown-symbol">UBC</span></section><a class="countdown-card next-countdown" href="#applications"><div><span>下一个申请截止</span><strong>'+(s?.next?s.next.days:'—')+'<small>'+(s?.next?' 天':'')+'</small></strong><p>'+esc(s?.next?s.next.deadline+' · '+s.next.school+' · '+s.next.kind:'勾选项目后显示最近截止日期')+'</p><p class="countdown-caption">'+esc(s?.next?s.next.title+(s.next.sameDayCount>1?' · 同日 '+s.next.sameDayCount+' 项':''):s?'已选 '+s.selectedCount+' 个项目':'正在读取申请数据')+'</p></div><span class="countdown-symbol">→</span></a></div>';}

 function demoDashboard(){
  const english=typeof prefs!=='undefined'&&prefs.language==='en';
  const date=typeof today!=='undefined'?today:'2026-10-08';
  const later=days=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
  const t=(zh,en)=>english?en:zh;
  return '<div class="section-top"><h2>'+t('重要倒计时','Key countdowns')+'</h2><span class="label-tag">'+t('演示内容','Demo content')+'</span></div><div class="two-columns countdown-grid"><section class="countdown-card ubc-countdown"><div><span>'+t('研究里程碑','Research milestone')+'</span><strong>14<small> '+t('天','days')+'</small></strong><p>'+t('进度汇报','Progress presentation')+' · '+later(14)+'</p></div><span class="countdown-symbol">→</span></section><section class="countdown-card next-countdown"><div><span>'+t('下一个投稿截止','Next submission deadline')+'</span><strong>24<small> '+t('天','days')+'</small></strong><p>'+later(24)+' · '+t('会议摘要','Conference abstract')+'</p><p class="countdown-caption">'+t('研究摘要草稿','Research abstract draft')+'</p></div><span class="countdown-symbol">→</span></section></div>';
 }
 function actions(){return '<div class="application-top-tabs" role="tablist" aria-label="PhD&MS 申请栏目">'+[['plan','申请选择与预算'],['outreach','PhD'],['masters','MS']].map(([id,label])=>'<button role="tab" aria-selected="'+(tab===id)+'" class="application-top-tab '+(tab===id?'active':'')+'" data-application-tab="'+id+'">'+label+'</button>').join('')+'</div>';}
 function setTab(id){if(!['plan','outreach','masters'].includes(id))return;tab=id;if(typeof state!=='undefined'&&state.page==='applications')updatePageActions();}
 document.addEventListener('click',e=>{const b=e.target.closest('[data-application-tab]');if(b)document.querySelector('.application-frame')?.contentWindow?.ApplicationNavigation?.activate(b.dataset.applicationTab);});
 function page(){return '<iframe class="application-frame" title="PhD&MS 申请助手" src="applications/index.html"></iframe>';}
 window.addEventListener('DOMContentLoaded',()=>{refresh();window.orbitDesktop?.onApplicationsChanged(refresh);setInterval(refresh,60000);});
 return {dashboard,page,refresh,actions,setTab,activeTab:()=>tab};
})();

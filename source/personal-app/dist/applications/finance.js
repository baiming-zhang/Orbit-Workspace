window.CompletionFinance=(()=>{
 let snapshot;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const yuan=v=>'¥'+(v/10000).toFixed(1)+'万';
 const range=(v,format=yuan)=>v[0]===v[1]?format(v[0]):format(v[0])+'–'+format(v[1]);
 const usd=v=>'US$'+Math.round(v).toLocaleString('en-US');
 function duration(c){return c.months[0]===c.months[1]?(c.months[0]%12===0?c.months[0]/12+'年':c.months[0]+'个月'):(c.months[0]%6===0&&c.months[1]%6===0?(c.months[0]/12)+'–'+(c.months[1]/12)+'年':c.months[0]+'–'+c.months[1]+'个月');}
 function entry(id){return snapshot?.items.find(p=>p.id===id);}
 function summary(p){const c=entry(p.id)?.completionCost;return c?'<span class="master-cost-summary">学制约 '+esc(duration(c))+' · 总学费约 '+range(c.tuitionCny)+'</span>':'<span class="master-cost-summary">正在读取学制与总学费…</span>';}
 function badge(id){return entry(id)?.feeWaiver?.recommended?'<span class="waiver-mini-badge">建议waive</span>':'';}
 function details(e){const c=e.completionCost;if(!c)return '';const original=v=>c.currency+' '+Math.round(v).toLocaleString('en-US');
 return '<section class="simple-detail-card completion-cost-card"><p class="eyebrow">完成整个项目 · 自费参考</p><h3>毕业总花费预计</h3><div class="detail-finance-value">'+range(c.totalCny)+'</div><p>'+range(c.totalUsd,usd)+' · 学制约 '+duration(c)+'（'+range(c.months,String)+' 个月）</p><div class="detail-pairs">'+[
 ['总学费',range(c.tuitionCny)+' / '+range(c.tuitionUsd,usd)],
 ['当地生活费 · '+c.city,range(c.livingUsd,usd)+'；'+range(c.monthlyLiving,original)+'/月 × '+range(c.months,String)+'个月'],
 ['学校杂费 / 医疗保险',range(c.feesUsd,usd)+'；'+(c.feesAreTotal?'按项目总额':'按居住时长估算')+'，实际账单为准'],
 ['机票 / 签证 / 安置预留',range(c.setupUsd,usd)+'（一次性预算假设）'],
 ['本项目申请费',usd(c.applicationFeeUsd)+'（已确认减免时为0）'],
 ['建议资金准备 · 另留10%缓冲',range(c.reserveCny)]
 ].map(([k,v])=>'<div class="detail-pair"><span>'+esc(k)+'</span><p>'+esc(v)+'</p></div>').join('')+'</div><details class="simple-detail-fold"><summary>计算依据与官网来源</summary><p>'+esc(c.formula)+'</p><p>'+esc(c.status)+'</p><p>生活费为单人合租、餐饮、交通、教材与日常支出的规划区间，包含在当地的假期月份。杂费/保险除已明确费表外为预算预留；未自动抵扣 RA/TA、奖学金或兼职收入。跨年学费涨价、超额学分、延期注册与家属开支以实际方案调整。</p><p>换算：USD→CNY '+c.usdCny.toFixed(4)+'；CAD→USD '+c.cadUsd.toFixed(6)+' · '+esc(snapshot?.finance.asOf)+'。核查日期 '+esc(c.checkedAt)+'</p><div class="simple-detail-links"><button class="plan-button compact" data-detail-url="'+esc(c.durationSource)+'">学制官网 ↗</button><button class="plan-button compact" data-detail-url="'+esc(c.tuitionSource)+'">费用官网 ↗</button></div></details></section>';
 }
 return {update:s=>{snapshot=s;},entry,summary,badge,details,duration,range};
})();

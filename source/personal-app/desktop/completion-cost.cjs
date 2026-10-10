function completeCost(model,{usdCny,cadUsd},applicationFee=0){
 if(!model)return null;
 const usd=model.currency==='CAD'?cadUsd:1,range=f=>model[f]||[0,0];
 const tuition=range('tuition').map(x=>Math.round(x*usd*100)/100),living=range('monthlyLiving').map((x,i)=>Math.round(x*model.months[i]*usd*100)/100);
 const fees=range('annualFees').map((x,i)=>Math.round((x*(model.feesAreTotal?1:model.months[i]/12)+(model.oneTimeFees||0))*usd*100)/100);
 const setup=[1500,3000],total=tuition.map((x,i)=>Math.round((x+living[i]+fees[i]+setup[i]+(applicationFee||0))*100)/100);
 return {...model,tuitionUsd:tuition,tuitionCny:tuition.map(x=>x*usdCny),livingUsd:living,feesUsd:fees,setupUsd:setup,totalUsd:total,totalCny:total.map(x=>x*usdCny),reserveCny:total.map(x=>x*usdCny*1.1),applicationFeeUsd:applicationFee||0,usdCny,cadUsd};
}
module.exports={completeCost};

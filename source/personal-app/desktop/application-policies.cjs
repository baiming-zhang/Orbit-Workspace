const rules={
 Stanford:{group:'stanford-graduate',limit:1,summary:'每学年仅能申请一个研究生项目；Biosciences 特例不适用于此清单。',url:'https://gradadmissions.stanford.edu/apply'},
 Princeton:{group:'princeton-graduate',limit:1,summary:'每年仅能申请一个项目、一个学位；不能同时申请 PhD 和 MSE，也不提供两种学位之间的备选审查。',url:'https://gradschool.princeton.edu/admission-onboarding/prepare'},
 Cornell:{group:'cornell-graduate',limit:1,summary:'同一入学学期仅能提交一份 Graduate School 申请；重复申请不处理，改投其他 field 需联系学校转申请。',url:'https://gradschool.cornell.edu/admissions/application-steps/important-application-policies/'},
 Yale:{group:'yale-gsas',limit:1,summary:'GSAS 同一入学学期仅能申请一个院系或项目；清单中的 CEE PhD 与 S&DS MS 不能同时提交。',url:'https://gsas.yale.edu/admissions/phdmasters-application-process/admissions-frequently-asked-questions/application-faqs'},
 'UC Berkeley':{group:'berkeley-graduate',limit:1,summary:'每个招生周期仅能申请一个学位项目或官方 concurrent 项目；EECS PhD 与 Mechanical MEng 须择一，重复申请费不退。',url:'https://grad.berkeley.edu/admissions/application-process/faq/'},
 MIT:{group:'mit-meche',limit:1,summary:'清单中的 MechE PhD/SM 与 Mechanical SM 属于同一招生流程。无硕士学位者先申请 SM 再进入 PhD；不要按两份独立申请提交。MIT 不同院系的申请另按院系规则。',url:'https://meche.mit.edu/node/923'},
 Harvard:{summary:'GSAS 每年可申请最多三个不同项目；SEAS 同年最多一个 PhD 和一个硕士项目，不得同时申请多个 SEAS 硕士。',url:'https://gsas.harvard.edu/apply/applying-degree-programs'},
 'Carnegie Mellon':{summary:'SCS 可申请最多三个博士项目，以及其硕士项目；各项目要求与收费分别核对。',url:'https://www.cs.cmu.edu/education/graduate-admissions'},
 'Johns Hopkins':{summary:'允许跨院系申请；同一院系可能限一种学位。Mechanical Engineering 只能申请硕士或 PhD 其中一种。',url:'https://me.jhu.edu/education/graduate-studies/apply/'}
};
function policy(item){const r=rules[item.school];return r?{...r,checkedAt:'2026-10-06'}:null;}
function conflicts(items){const groups=new Map();for(const i of items.filter(i=>i.selected)){const r=policy(i);if(!r?.group)continue;const g=groups.get(r.group)||{school:i.school,...r,items:[]};g.items.push({id:i.id,kind:i.kind,title:i.title});groups.set(r.group,g);}return [...groups.values()].filter(g=>g.items.length>g.limit);}
module.exports={policy,conflicts};

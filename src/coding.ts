import {MODELS,BUSINESSES} from './content';
import {quote,capacity,has,log,advance} from './engine';
import {canUse,startAccess,revisionMetrics,modelAccess,tierWeight} from './access';
import type {GameState,CodingState,CodingRole,RoleAssignment,PipelineRequest,WorkPipeline,Quote,Result,CodingAction,DelegationOptions} from './types';

export const CODING_ROLES:CodingRole[]=['coordinator','coder','tester','reviewer'];
export const CODING_JOBS=[
 {id:'bug-fixes',name:'Bug fixes',unlock:350,completions:0,difficulty:35,context:4000,payout:100,duration:55,scale:3},
 {id:'small-scripts',name:'Small scripts',unlock:1800,completions:1,difficulty:45,context:8000,payout:240,duration:100,scale:6},
 {id:'data-imports',name:'Data imports',unlock:5500,completions:2,difficulty:55,context:16000,payout:460,duration:160,scale:10},
 {id:'websites',name:'Websites',unlock:16000,completions:4,difficulty:65,context:32000,payout:900,duration:240,scale:16},
 {id:'internal-tools',name:'Internal tools',unlock:30000,completions:6,difficulty:75,context:64000,payout:1600,duration:340,scale:24},
 {id:'repository-migrations',name:'Repository migrations',unlock:52000,completions:8,difficulty:90,context:128000,payout:2800,duration:480,scale:35}
];
export const LONG_FORM=['ebooks','decks','video'];
export function createCoding():CodingState{return {recovery:false,content:[],selected:null,roles:{coordinator:null,coder:null,tester:null,reviewer:null},active:null,approvedBudget:null,lastReport:null};}
const result=(ok:boolean,message:string):Result=>({ok,message});
const rounding=(seconds:number)=>Math.ceil((seconds-1e-9)/.25)*.25;
function assignment(s:GameState,role:CodingRole):RoleAssignment{return s.coding.roles[role]??{model:s.model};}
export function codingUnlock(s:GameState,id:string){const job=CODING_JOBS.find(j=>j.id===id);if(!job)return result(false,'Choose a coding contract.');if(s.totalSeconds<360)return result(false,'Coding unlocks after 6 lifetime minutes.');if(s.runEarned<job.unlock)return result(false,`Earn $${job.unlock.toLocaleString()} this run.`);if(s.career.completed<job.completions)return result(false,`Complete ${job.completions} coding contracts first.`);return result(true,'Contract available.');}
export function roleQuote(s:GameState,role:CodingRole,a:RoleAssignment,context=0){
 const model=MODELS.find(m=>m.id===a.model),revision=revisionMetrics(s,a.model,a.revision),access=modelAccess(s,a.model,a.access);
 let reason='';
 if(role==='reviewer'&&(!s.claw||!has(s,'supervisor')))reason='Install SlopClaw and Supervisor to assign an optional reviewer.';
 else if(!model||model.tier==='visual')reason='Choose a text model for this role.';
 else if(s.runEarned<model.unlock)reason=`Model unlocks at $${model.unlock.toLocaleString()} earned.`;
 else if(a.access&&a.access!==access)reason='Choose the matching local or cloud access.';
 else if(revision.contextCapacity*(s.claw&&has(s,'context')?2:1)<context)reason=`This request needs ${context.toLocaleString()} context; choose a larger model or context cleanup.`;
 else {const check=canUse(s,{model:a.model,revision:revision.id,access,workload:.01,fee:0,ignoreBusy:true});if(!check.ok)reason=check.message;}
 const q=quote(s,a.model,'seo',{access,revision:revision.id,coding:true});if(!reason&&q.vram>capacity(s))reason='That model does not fit your rig.';
 return {available:!reason,reason,model:a.model,revision:revision.id,access,score:revision.codingScore,testing:!!model?.testing,context:revision.contextCapacity*(s.claw&&has(s,'context')?2:1),cost:q.cost,vram:q.vram,role};
}
function routed(s:GameState,role:CodingRole,context:number):RoleAssignment{
 const chosen=assignment(s,role),current=roleQuote(s,role,chosen,context);
 const fallback=s.claw&&has(s,'fallback')&&(!current.available||current.cost>s.cash);
 if(s.coding.roles[role]||!fallback&&(!s.claw||!has(s,'routing')||s.routing==='manual'))return chosen;
 const candidates=MODELS.map(m=>({a:{model:m.id},q:roleQuote(s,role,{model:m.id},context),speed:m.speed})).filter(x=>x.q.available);
 candidates.sort((a,b)=>fallback||s.routing==='cheapest'?a.q.cost-b.q.cost:s.routing==='local'?Number(b.q.access==='local')-Number(a.q.access==='local')||b.q.score-a.q.score:(b.q.score*b.speed/(1+b.q.cost))-(a.q.score*a.speed/(1+a.q.cost)));
 return candidates[0]?.a??chosen;
}
function request(s:GameState,a:RoleAssignment,stage:PipelineRequest['stage'],role:CodingRole,group:number,duration:number,workload:number,context:number,workflow?:string):PipelineRequest{
 const model=MODELS.find(m=>m.id===a.model)!,rev=revisionMetrics(s,a.model,a.revision),base=quote(s,a.model,workflow??'seo',{access:a.access,revision:rev.id,coding:!workflow});
 const business=BUSINESSES.find(b=>b.id===(workflow??'seo'))!;
 // Coding reuses global economics without content fit, gates or named workflows.
 const scale=workload/business.scale,seconds=rounding(Math.max(.25,duration/business.duration*base.duration));
 const single=model.vram?quote({...s,workers:1},a.model,workflow??'seo',{access:a.access,revision:rev.id,coding:!workflow}):base;
 const cost=model.vram?single.cost*seconds/single.duration+(base.cost-single.cost)*scale:base.cost*scale;
 return {id:0,stage,role,group,model:a.model,revision:rev.id,access:base.access!,duration:seconds,cost,workload,vram:base.vram,snapshot:{...base.snapshot!,fee:model.cost?cost/(model.cost*workload):cost,workload},status:'pending',delegated:false,context};
}
export interface PipelineQuote extends Quote {requests:PipelineRequest[];repairs:number;estimatedFees:number;quota:Record<string,number>;workers:number;context:number}
function summarize(s:GameState,requests:PipelineRequest[],payout:number,repairs:number,reason='',context=0):PipelineQuote{
 const pending=requests.filter(r=>r.status==='pending'),cost=pending.reduce((n,r)=>n+r.cost,0),groups=[...new Set(requests.filter(r=>r.status!=='done').map(r=>r.group))];
 const duration=groups.reduce((n,g)=>n+Math.max(...requests.filter(r=>r.group===g&&r.status!=='done').map(r=>r.status==='running'?(s.jobs.find(j=>j.request===r.id&&j.pipeline===s.coding.active?.id)?.remaining??r.duration):r.duration)),0);
 const quota:Record<string,number>={};for(const r of pending)if(r.access==='chat'&&r.model!=='starter')quota[r.model]=(quota[r.model]??0)+r.workload*tierWeight(r.model);
 const workers=Math.max(1,...groups.map(g=>requests.filter(r=>r.group===g&&r.status!=='done').length));
 const vram=Math.max(0,...groups.map(g=>requests.filter(r=>r.group===g&&r.status!=='done').reduce((n,r)=>n+r.vram,0)));
 return {available:!reason,suitable:!reason,reason,duration,payout,cost,estimatedFees:cost,net:duration?(payout-cost)/duration:0,vram,quantized:false,requests,repairs,quota,workers,context};
}
export function codingQuote(s:GameState,id=s.coding.selected??'bug-fixes'):PipelineQuote{
 const job=CODING_JOBS.find(j=>j.id===id);if(!job)return summarize(s,[],0,0,'Choose a coding contract.');
 const roles=Object.fromEntries(CODING_ROLES.map(role=>[role,routed(s,role,role==='coder'?job.context:Math.min(job.context,8000))])) as Record<CodingRole,RoleAssignment>;
 const review=!!s.coding.roles.reviewer&&s.claw&&has(s,'supervisor');
 let reason=codingUnlock(s,id).message;if(codingUnlock(s,id).ok)reason='';
 for(const role of CODING_ROLES){if(role==='reviewer'&&!review)continue;const q=roleQuote(s,role,roles[role],role==='coder'?job.context:Math.min(job.context,8000));if(!q.available&&!reason)reason=q.reason;}
 const coder=revisionMetrics(s,roles.coder.model,roles.coder.revision),tester=revisionMetrics(s,roles.tester.model,roles.tester.revision),reviewer=revisionMetrics(s,roles.reviewer.model,roles.reviewer.revision);
 const repairs=Math.max(0,Math.min(2,Math.ceil((job.difficulty-coder.codingScore)/10))-(review&&reviewer.codingScore>=job.difficulty?1:0));
 const testing=MODELS.find(m=>m.id===roles.tester.model)?.testing?1:1.3;
 const testFactor=Math.max(.55,1+(job.difficulty-tester.codingScore)/100)*testing;
 const memory=s.claw&&has(s,'memory')&&(s.career.byJob[id]??0)>0?.5:1,cache=s.claw&&has(s,'cache')?.7:1;
 let group=0;const requests:PipelineRequest[]=[];
 const add=(stage:PipelineRequest['stage'],role:CodingRole,share:number,workShare=share)=>{requests.push(request(s,roles[role],stage,role,group++,job.duration*share,job.scale*workShare,role==='coder'?job.context:Math.min(job.context,8000)));};
 add('Brief','coordinator',.12*memory,.12*memory);add('Build','coder',.48*cache,.48*cache);
 if(review)add('Review','reviewer',.1);
 add('Test','tester',.22*testFactor,.22);
 for(let i=0;i<repairs;i++){const fixRole=s.claw&&has(s,'retries')&&tester.codingScore>coder.codingScore?'tester':'coder';add('Fix',fixRole,.2*testFactor*(s.claw&&has(s,'retries')?.75:1),.2*(s.claw&&has(s,'retries')?.75:1));add('Test','tester',.15*testFactor,.15);}
 add('Deliver','coordinator',.08);
 requests.forEach((r,i)=>r.id=i);
 const base=quote(s,roles.coder.model,'seo',{revision:coder.id,access:roles.coder.access,coding:true});
 return summarize(s,requests,job.payout*base.snapshot!.payout,repairs,reason,job.context);
}
/** Full committed contract economics. Progress never inflates its income rate. */
export function productionQuote(s:GameState):Quote|PipelineQuote{const p=s.coding.active;return p?summarize(s,p.requests.map(r=>({...r,status:'pending'})),p.payout,p.repairs):s.coding.selected?codingQuote(s):quote(s,s.model,s.business);}
/** Remaining work/cash only; never use this for sustainable income or upgrade ROI. */
export function remainingQuote(s:GameState):PipelineQuote|null{const p=s.coding.active;return p?summarize(s,p.requests,p.payout,p.repairs,p.pause):null;}
function makePipeline(s:GameState,kind:'coding'|'content',work:string,q:PipelineQuote,budget:number):WorkPipeline{return {id:`${kind}-${s.totalSeconds}-${s.totalSlop}`,kind,work,payout:q.payout,requests:structuredClone(q.requests),budget,spent:0,repairs:q.repairs,helpers:0,delegation:null,pause:'',acceptedAt:s.totalSeconds};}
export function acceptCoding(s:GameState,budget?:number):Result{
 if(!s.coding.selected)return result(false,'Select a coding contract first.');
 if(s.coding.active?.kind==='coding')return result(false,'Finish the current coding contract first.');const q=codingQuote(s);if(!q.available)return result(false,q.reason);
 const approved=budget??s.coding.approvedBudget??q.cost;if(!Number.isFinite(approved)||approved<0)return result(false,'Enter a finite nonnegative job budget.');
 if(s.coding.active)s.coding.content.unshift(s.coding.active);
 s.coding.recovery=false;s.coding.approvedBudget=approved;s.coding.active=makePipeline(s,'coding',s.coding.selected!,q,approved);pumpPipeline(s);return result(true,'Contract accepted. Its versions and payout are pinned.');
}
export function startContentPipeline(s:GameState,model:string,q:Quote):Result{
 if(s.coding.active?.kind==='coding')return result(false,'The current contract uses the production lane.');
 const requests:Array<PipelineRequest>=Array.from({length:4},(_,i)=>({id:i,stage:'Section',role:'coder',group:i,model,revision:q.revision!,access:q.access!,workload:q.snapshot!.workload/4,duration:q.duration/4,cost:q.cost/4,vram:q.vram,snapshot:{...q.snapshot!,fee:MODELS.find(m=>m.id===model)!.cost?q.snapshot!.fee:q.cost/4,workload:q.snapshot!.workload/4},status:'pending',delegated:false,context:4000}));
 const summary=summarize(s,requests,q.payout,0);const p=makePipeline(s,'content',s.business,summary,q.cost);p.id+=`-${s.coding.content.length}-${s.jobs.length}`;if(s.coding.active)s.coding.content.push(p);else s.coding.active=p;pumpPipeline(s);return result(true,'Long-form sections queued.');
}
export function pumpPipeline(s:GameState){
 for(const p of [s.coding.active,...s.coding.content].filter((p):p is WorkPipeline=>!!p))pumpOne(s,p);
}
function pumpOne(s:GameState,p:WorkPipeline){
 if(p.requests.every(r=>r.status==='done')){
  s.cash+=p.payout;s.runEarned+=p.payout;s.totalEarned+=p.payout;s.slop++;s.totalSlop++;
  if(p.kind==='coding'){s.career.completed++;s.career.byJob[p.work]=(s.career.byJob[p.work]??0)+1;}
  s.coding.lastReport={work:p.work,payout:p.payout,fees:p.spent,repairs:p.repairs,helpers:p.helpers,seconds:s.totalSeconds-p.acceptedAt};
  log(s,`Delivered ${p.work}: ${p.repairs} repairs, $${p.spent.toFixed(2)} request fees, ${p.helpers} helpers.`,'job');if(s.coding.active===p)s.coding.active=s.coding.content.shift()??null;else s.coding.content=s.coding.content.filter(x=>x!==p);return;
 }
 if(s.coding.recovery){p.pause='Making free slop. Resume with pending access or budget approval.';return;}
 const group=Math.min(...p.requests.filter(r=>r.status!=='done').map(r=>r.group));p.pause='';
 for(const r of p.requests.filter(r=>r.group===group&&r.status==='pending')){
  const worker=Array.from({length:s.workers},(_,i)=>i).find(i=>!s.jobs.some(j=>j.worker===i));if(worker===undefined){p.pause='Waiting for a free worker.';break;}
  if(r.vram>capacity(s)-s.jobs.reduce((n,j)=>n+j.vram,0)){p.pause='Waiting for GPU memory.';break;}
  if(p.spent+r.cost>p.budget+1e-8){p.pause='Approved job budget reached. Raise the budget or make free slop.';break;}
  const check=startAccess(s,{model:r.model,revision:r.revision,access:r.access,workload:r.workload,fee:r.cost,delegation:r.stage==='Coordinate'});
  if(!check.ok){p.pause=`${check.message} Change pending request access, raise the budget, or make free slop.`;break;}
  p.spent+=r.cost;r.status='running';s.jobs.push({worker,model:r.model,business:p.work,remaining:r.duration,duration:r.duration,payout:0,cost:r.cost,vram:r.vram,version:1,revision:r.revision,access:r.access,snapshot:{...r.snapshot},pipeline:p.id,request:r.id});
 }
 if(p.pause)s.notice=p.pause;
}
export function completeRequest(s:GameState,pipeline:string,id:number){const p=[s.coding.active,...s.coding.content].find(p=>p?.id===pipeline);if(p){const request=p.requests.find(r=>r.id===id);if(request)request.status='done';}}
export function codingStatus(s:GameState){const p=s.coding.active;return {active:p,stage:p?.requests.find(r=>r.status!=='done')?.stage??null,reason:p?.pause??'',quote:productionQuote(s),report:s.coding.lastReport};}

function requote(s:GameState,r:PipelineRequest,a:RoleAssignment,parts=1){
 const p=s.coding.active!,workflow=p.kind==='coding'?undefined:p.work;
 const old=MODELS.find(m=>m.id===r.model)!;
 const next=request(s,a,r.stage,r.role,r.group,r.duration*old.speed*r.snapshot.speed/parts,r.workload/parts,r.context,workflow);
 return {...next,id:r.id,delegated:true};
}
function delegatePlan(s:GameState,options:DelegationOptions):{pipeline:WorkPipeline|null;reason:string}{
 const original=s.coding.active,fail=(reason:string)=>({pipeline:null,reason});
 if(!s.claw)return fail('Install SlopClaw to delegate.');
 if(!original)return fail('There are no unsent sections to delegate. Legacy whole-job requests finish unchanged.');
 if(original.delegation)return fail('This contract has already been delegated.');
 if(!['budget','parallel'].includes(options.mode)||!Array.isArray(options.helpers)||!options.helpers.length||options.helpers.length>3)return fail('Choose one to three helpers.');
 if(options.mode==='parallel'&&(options.helpers.length<2||options.helpers.length>s.workers))return fail('Parallel mode needs two or more available worker slots.');
 const targets=original.requests.filter(r=>r.status==='pending'&&(r.stage==='Build'||r.stage==='Section'));
 if(!targets.length)return fail('All build sections have already been sent.');
 const coordinator=original.requests.find(r=>r.role==='coordinator')??original.requests[0];
 const check=canUse(s,{model:coordinator.model,revision:coordinator.revision,access:coordinator.access,workload:.01,fee:0,delegation:true,ignoreBusy:true});
 if(!check.ok)return fail(check.message);
 const helpers=options.mode==='budget'?options.helpers.slice(0,1):options.helpers;
 for(const a of helpers){const q=roleQuote(s,'coder',a,Math.max(...targets.map(r=>r.context)));if(!q.available)return fail(q.reason);if(q.access==='chat')return fail('Chat requests cannot be delegated. Choose API or local helpers.');}
 if(options.mode==='parallel'&&helpers.reduce((n,a)=>n+roleQuote(s,'coder',a).vram,0)>capacity(s))return fail('Parallel helpers exceed available GPU memory.');
 const p=structuredClone(original),first=Math.min(...targets.map(r=>r.group)),last=Math.max(...targets.map(r=>r.group));
 let nextID=Math.max(...p.requests.map(r=>r.id))+1;
 // Insert a paid coordinator request after all sent work, before the unsent sections.
 const coordination=request(s,coordinator,'Coordinate','coordinator',first,targets.reduce((n,r)=>n+r.duration,0)*.06,targets.reduce((n,r)=>n+r.workload,0)*(options.mode==='parallel'?.16:.06)*(has(s,'coordination')?.55:1),Math.min(8000,targets[0].context));coordination.id=nextID++;
 const additions:PipelineRequest[]=[coordination];let serial=first+1;
 for(const target of targets){
  const parts=target.stage==='Build'?helpers.length:1;
  for(let i=0;i<parts;i++){
   const a=helpers[(targets.indexOf(target)+i)%helpers.length],next=requote(s,target,a,parts);next.id=nextID++;
   next.group=options.mode==='parallel'?first+1+Math.floor((additions.length-1)/helpers.length):serial++;
   additions.push(next);
  }
 }
 const delta=Math.max(...additions.map(r=>r.group))-last;
 p.requests=p.requests.filter(r=>!targets.some(t=>t.id===r.id)).map(r=>r.status==='pending'&&r.group>last?{...r,group:r.group+delta}:r);
 p.requests.push(...additions);p.requests.sort((a,b)=>a.group-b.group||a.id-b.id);
 if(p.kind==='coding'){
  const job=CODING_JOBS.find(j=>j.id===p.work)!,score=Math.min(...helpers.map(a=>revisionMetrics(s,a.model,a.revision).codingScore)),review=p.requests.find(r=>r.stage==='Review');
  const repairs=Math.max(0,Math.min(2,Math.ceil((job.difficulty-score)/10))-(review&&revisionMetrics(s,review.model,review.revision).codingScore>=job.difficulty?1:0));
  if(repairs>p.repairs){const tester=p.requests.find(r=>r.stage==='Test')!,delivery=p.requests.find(r=>r.stage==='Deliver')!;let group=delivery.group;
   for(let i=p.repairs;i<repairs;i++){const fix=requote(s,targets[0],helpers[0]);fix.id=nextID++;fix.stage='Fix';fix.group=group++;fix.duration=rounding(fix.duration*.4);fix.cost*=.4;fix.workload*=.4;fix.snapshot.workload=fix.workload;p.requests.push(fix);p.requests.push({...structuredClone(tester),id:nextID++,group:group++,duration:rounding(tester.duration*.7),cost:tester.cost*.7,workload:tester.workload*.7,snapshot:{...tester.snapshot,workload:tester.workload*.7},status:'pending'});}
   delivery.group=group;p.repairs=repairs;p.requests.sort((a,b)=>a.group-b.group||a.id-b.id);
  }
 }
 p.delegation=options.mode;p.helpers=helpers.length;p.pause='';return {pipeline:p,reason:''};
}
export function delegationPreview(s:GameState,options:DelegationOptions){
 const planned=delegatePlan(s,options),p=planned.pipeline;
 if(!p)return {available:false,reason:planned.reason,remainingCost:0,totalJobCost:0,remainingSeconds:0,baselineSeconds:0,baselineCost:0,workers:0,vram:0,quota:{} as Record<string,number>,repairs:0,pipeline:null};
 const q=summarize(s,p.requests,p.payout,p.repairs),base=summarize(s,s.coding.active!.requests,p.payout,s.coding.active!.repairs);
 // The real scheduler resolves occupancy, section boundaries and coverage changes.
 const clone=structuredClone(s);clone.auto=false;clone.nextEvent=1e15;clone.coding.active=p;clone.coding.recovery=false;p.budget=p.spent+q.cost;
 let seconds=0,reason='',peakWorkers=0,peakVRAM=0;
 while(clone.coding.active?.id===p.id&&seconds<7200){pumpPipeline(clone);advance(clone,.25);seconds+=.25;peakWorkers=Math.max(peakWorkers,clone.jobs.length);peakVRAM=Math.max(peakVRAM,clone.jobs.reduce((n,j)=>n+j.vram,0));if(clone.coding.active?.id===p.id&&!clone.jobs.length&&p.pause){reason=p.pause;break;}}
 if(seconds>=7200&&clone.coding.active?.id===p.id)reason='The remaining plan exceeds the preview horizon.';
 // Return the unexecuted plan, never the clone that was simulated.
 const fresh=delegatePlan(s,options).pipeline!;
 return {available:!reason,reason,remainingCost:q.cost,totalJobCost:fresh.spent+q.cost,remainingSeconds:seconds,baselineSeconds:base.duration,baselineCost:base.cost,workers:peakWorkers,vram:peakVRAM,quota:q.quota,repairs:fresh.repairs,pipeline:fresh};
}
export function recoveryPreview(s:GameState,access:RoleAssignment['access']){
 const p=s.coding.active;if(!p)return {available:false,reason:'No pending contract.',remainingCost:0,totalJobCost:0,requests:[] as PipelineRequest[]};
 let reason='';const requests=p.requests.map(r=>{if(r.status!=='pending')return {...r};const check=roleQuote(s,r.role,{model:r.model,revision:r.revision,access},r.context);if(!check.available)reason=check.reason;
  if(r.delegated&&check.access==='chat'||r.stage==='Coordinate'&&check.access==='chat')reason='Delegated requests require API or local access.';
  const next=requote(s,r,{model:r.model,revision:r.revision,access});return {...r,access:check.access,cost:next.cost,snapshot:{...r.snapshot,fee:next.snapshot.fee}};});
 const remainingCost=requests.filter(r=>r.status==='pending').reduce((n,r)=>n+r.cost,0);return {available:!reason,reason,remainingCost,totalJobCost:p.spent+remainingCost,requests};
}
export function assistantRecommendation(s:GameState):{title:string;benefit:string;action:import('./types').Action}|null{
 const p=s.coding.active;
 if(p){const pending=p.requests.filter(r=>r.status==='pending'),remaining=pending.reduce((n,r)=>n+r.cost,0),total=p.spent+remaining;
  if(total>p.budget+1e-8)return {title:'Approve the remaining request budget',benefit:`A $${total.toFixed(2)} total cap covers $${remaining.toFixed(2)} of unsent requests. Spent fees stay paid.`,action:{type:'code-budget',budget:total}};
  if(p.pause&&/quota|plan|coverage/i.test(p.pause)){const q=recoveryPreview(s,'api');if(q.available)return {title:'Resume pending requests through API',benefit:`Keep accepted revisions; remaining request fees become $${q.remainingCost.toFixed(2)}. Approve the new budget before billing.`,action:{type:'code-recover',access:'api'}};}
  if(pending.some(r=>r.cost>s.cash))return {title:'Rebuild cash with free articles',benefit:'Pause unsent requests and earn from free SEO articles without losing paid work.',action:{type:'free-slop'}};
  if(s.coding.recovery)return {title:'Resume the approved contract',benefit:`Resume $${remaining.toFixed(2)} of pending work within the $${p.budget.toFixed(2)} approved budget.`,action:{type:'code-budget',budget:p.budget}};
  return null;
 }
 if(s.coding.selected){const current=codingQuote(s);let best:{title:string;benefit:string;action:import('./types').Action;gain:number}|null=null;
  for(const model of MODELS.filter(m=>m.tier!=='visual')){const clone=structuredClone(s);clone.coding.roles.coder={model:model.id};const q=codingQuote(clone),gain=q.net-current.net;if(q.available&&gain>0&&(!best||gain>best.gain))best={title:`Assign ${model.name} as coder`,benefit:`Estimated net rises by $${(gain*60).toFixed(2)}/minute; ${q.repairs} repairs and $${q.cost.toFixed(2)} total fees.`,action:{type:'code-role',role:'coder',assignment:{model:model.id,revision:revisionMetrics(s,model.id).id,access:modelAccess(s,model.id)}},gain};}
  if(best)return {title:best.title,benefit:best.benefit,action:best.action};
  if(current.available)return {title:'Accept the selected contract',benefit:`Approve $${current.cost.toFixed(2)} in request fees for a posted $${current.payout.toFixed(2)} payout.`,action:{type:'code-accept',budget:current.cost}};
 }
 return null;
}
export function codingBenchmark(s:GameState,model:string){const clone=structuredClone(s);for(const role of CODING_ROLES)if(role!=='reviewer')clone.coding.roles[role]={model};return codingQuote(clone);}

export function codingAction(s:GameState,a:CodingAction):Result{
 if(a.type==='free-slop'){s.coding.recovery=true;return result(true,'Pending work paused. Generate free SEO articles to rebuild cash, then resume the contract.');}
 if(a.type==='code-recover'){const q=recoveryPreview(s,a.access);if(!q.available)return result(false,q.reason);s.coding.active!.requests=q.requests;s.coding.recovery=false;pumpPipeline(s);return result(true,`Pending access updated. Remaining fees: $${q.remainingCost.toFixed(2)}; approve a budget of $${q.totalJobCost.toFixed(2)} to cover them.`);}
 if(a.type==='delegate'){const q=delegationPreview(s,a.options);if(!q.available)return result(false,q.reason);if(!Number.isFinite(a.budget)||a.budget<s.coding.active!.spent)return result(false,'Approve a finite budget covering fees already spent.');s.coding.active=q.pipeline;s.coding.active!.budget=a.budget;s.coding.recovery=false;pumpPipeline(s);return result(true,'Delegation approved. Only unsent work changed.');}
 if(a.type==='code-select'){const check=codingUnlock(s,a.id);if(!check.ok)return check;s.coding.selected=a.id;s.coding.approvedBudget=null;return result(true,'Coding contract selected. New content is suspended.');}
 if(a.type==='code-accept')return acceptCoding(s,a.budget);
 if(a.type==='work-content'){s.coding.selected=null;return result(true,'Content selected.');}
 if(a.type==='code-role'){if(!CODING_ROLES.includes(a.role))return result(false,'Unknown role.');if(a.assignment){const q=roleQuote(s,a.role,a.assignment);if(!q.available)return result(false,q.reason);}s.coding.roles[a.role]=a.assignment?{...a.assignment,revision:revisionMetrics(s,a.assignment.model,a.assignment.revision).id,access:modelAccess(s,a.assignment.model,a.assignment.access)}:null;return result(true,'Role assigned for the next contract.');}
 if(a.type==='code-budget'){if(!s.coding.active||!Number.isFinite(a.budget)||a.budget<s.coding.active.spent)return result(false,'Budget must cover fees already spent.');s.coding.recovery=false;s.coding.active.budget=a.budget;s.coding.approvedBudget=a.budget;pumpPipeline(s);return result(true,'Job budget approved.');}
 return result(false,'That pipeline action is not available.');
}

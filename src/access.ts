import {MODELS,GPUS} from './content';
import type {GameState,AccessState,AccessMode,Provider,PlanTier,Result,Quote,Job} from './types';
export const HOUR_SECONDS=5,DAY_SECONDS=120,WEEK_SECONDS=840,API_UNLOCK=350;
export const PROVIDERS:Provider[]=['OpenAI','Anthropic','Google','xAI','DeepSeek'];
export const PLAN_FEES:Record<PlanTier,number>={free:0,plus:120,pro:600};
export const PLAN_ALLOWANCES:Record<PlanTier,number>={free:80,plus:320,pro:960};
export function createAccess(legacy=false):AccessState{return {apiUnlocked:legacy,mode:'auto',plans:[],usage:{},usageWeek:1,approvedRevisions:[],selectedRevisions:{}};}
export function calendar(s:Pick<GameState,'calendarSeconds'>){const elapsed=s.calendarSeconds;return {week:Math.floor(elapsed/WEEK_SECONDS)+1,day:Math.floor(elapsed/DAY_SECONDS)%7,hour:Math.floor(elapsed/HOUR_SECONDS)%24,nextMonday:(Math.floor(elapsed/WEEK_SECONDS)+1)*WEEK_SECONDS,resetIn:WEEK_SECONDS-elapsed%WEEK_SECONDS};}
export function apiAvailable(s:GameState){return s.access.apiUnlocked||s.runEarned>=API_UNLOCK;}
export function modelAccess(s:GameState,model:string,requested?:AccessMode):AccessMode{const m=MODELS.find(m=>m.id===model);if(m?.vram)return 'local';if(requested)return requested;if(s.access.mode!=='auto')return s.access.mode;return apiAvailable(s)?'api':'chat';}
export function planMetrics(s:GameState,provider:Provider){
 const p=s.access.plans.find(p=>p.provider===provider&&p.expiresAt>s.calendarSeconds),tier:PlanTier=p?.tier??'free';
 const coveredTiers=tier==='pro'?['base','plus','pro']:tier==='plus'?['base','plus']:['base'];
 const coveredModels=MODELS.filter(m=>m.company===provider&&coveredTiers.includes(m.tier)).map(m=>m.id);
 return {provider,tier,coveredTiers,coveredModels,fee:PLAN_FEES[tier],allowance:PLAN_ALLOWANCES[tier],expiresAt:p?.expiresAt??null,renew:p?.renew??false,nextTier:p?.nextTier??tier,renewalIn:p?Math.max(0,p.expiresAt-s.calendarSeconds):null,resetIn:calendar(s).resetIn};
}
export function tierWeight(model:string){const tier=MODELS.find(m=>m.id===model)?.tier;return tier==='pro'?4:tier==='plus'?2:1;}
export interface AccessRequest {model:string;workload:number;fee:number;access?:AccessMode;revision?:string;delegation?:boolean;ignoreBusy?:boolean}
export function quotaMetrics(s:GameState,model:string,mode?:AccessMode){
 const m=MODELS.find(m=>m.id===model),route=modelAccess(s,model,mode),plan=m&&PROVIDERS.includes(m.company as Provider)?planMetrics(s,m.company as Provider):null;
 const allowance=route==='chat'&&m?.tier!=='starter'?(plan?.allowance??80):Infinity;
 const used=s.access.usageWeek===calendar(s).week?(s.access.usage[model]??0):0;
 return {access:route,allowance,used,remaining:Math.max(0,allowance-used),resetIn:calendar(s).resetIn,tier:plan?.tier??'free'};
}
export interface Revision {id:string;model:string;week:number;speed:number;payout:number;fee:number;coding:number;context:number}
export const REVISIONS:Revision[]=[
 ...['gpt','claude-sonnet','gemini-flash'].map(model=>({id:`${model}-r2`,model,week:2,speed:1.08,payout:1.12,fee:1.15,coding:4,context:1.25})),
 ...['gpt-boardroom','claude','local-32b'].map(model=>({id:`${model}-r4`,model,week:4,speed:1.12,payout:1.18,fee:model==='local-32b'?1:1.2,coding:5,context:1.5}))
];
export function revisionMetrics(s:GameState,model:string,id=s.access.selectedRevisions[model]??'original'){
 const r=REVISIONS.find(r=>r.id===id&&r.model===model),m=MODELS.find(m=>m.id===model);
 const available=id==='original'||!!r&&calendar(s).week>=r.week&&s.access.approvedRevisions.includes(id);
 return {id,available,released:id==='original'||!!r&&calendar(s).week>=r.week,approved:id==='original'||s.access.approvedRevisions.includes(id),speed:r?.speed??1,payout:r?.payout??1,fee:r?.fee??1,codingScore:Math.min(100,(m?.codingScore??0)+(r?.coding??0)),contextCapacity:(m?.contextCapacity??0)*(r?.context??1)};
}
export function adoptRevision(s:GameState,id:string):Result{const r=REVISIONS.find(r=>r.id===id);if(!r||calendar(s).week<r.week)return {ok:false,message:'That revision has not been released.'};if(!s.access.approvedRevisions.includes(id))s.access.approvedRevisions.push(id);s.access.selectedRevisions[r.model]=id;return {ok:true,message:'Revision approved and selected.'};}
export function selectRevision(s:GameState,model:string,id:string):Result{if(!MODELS.some(m=>m.id===model)||!revisionMetrics(s,model,id).available)return {ok:false,message:'Approve a released revision first.'};s.access.selectedRevisions[model]=id;return {ok:true,message:'Revision selected.'};}
export function canUse(s:GameState,r:AccessRequest):Result{
 const m=MODELS.find(m=>m.id===r.model),route=modelAccess(s,r.model,r.access);
 const fail=(message:string)=>({ok:false,message});
 if(!m||!Number.isFinite(r.workload)||r.workload<=0||!Number.isFinite(r.fee)||r.fee<0)return fail('Invalid access request.');
 if(!revisionMetrics(s,r.model,r.revision).available)return fail('Approve a released revision first.');
 if(m.vram===0&&route==='local'||m.vram>0&&r.access&&r.access!=='local')return fail('Choose the matching local or cloud access.');
 if(route==='api'&&!apiAvailable(s))return fail('API access unlocks at $350 earned this run.');
 if(r.delegation&&(!m.delegation||route==='chat'))return fail('That access does not support delegation.');
 if(route==='chat'){
  if(m.tier==='visual')return fail('Visual models require API access.');
  if(!r.ignoreBusy&&s.jobs.some(j=>j.access==='chat'||j.access===undefined&&j.model==='starter'))return fail('Chat access allows one serial worker.');
  const quota=quotaMetrics(s,r.model,route);
  if(m.tier==='plus'&&quota.tier==='free'||m.tier==='pro'&&quota.tier!=='pro')return fail('This model tier needs a higher provider plan.');
  if(r.workload*tierWeight(r.model)>quota.remaining)return fail('Weekly model quota exhausted. Resets Monday.');
  if(r.fee!==0)return fail('Chat requests have no usage fee.');
 }
 if(r.fee>s.cash)return fail('You cannot afford the next request. Use Free Trial & Error.');
 return {ok:true,message:'Access available.'};
}
// Called only after all other start checks; previews call canUse instead.
export function startAccess(s:GameState,r:AccessRequest):Result{
 const check=canUse(s,{...r,ignoreBusy:false});if(!check.ok)return check;
 const route=modelAccess(s,r.model,r.access);if(apiAvailable(s))s.access.apiUnlocked=true;
 if(route==='chat'&&r.model!=='starter'){if(s.access.usageWeek!==calendar(s).week){s.access.usage={};s.access.usageWeek=calendar(s).week;}s.access.usage[r.model]=(s.access.usage[r.model]??0)+r.workload*tierWeight(r.model);}
 s.cash-=r.fee;s.expenses+=r.fee;s.totalExpenses+=r.fee;return check;
}
export function planQuote(s:GameState,provider:Provider,tier:PlanTier){
 const current=planMetrics(s,provider),active=s.access.plans.find(p=>p.provider===provider&&p.expiresAt>s.calendarSeconds);
 const downgrade=!!active&&PLAN_FEES[tier]<PLAN_FEES[active.tier];
 const cost=downgrade?0:active?Math.max(0,PLAN_FEES[tier]-PLAN_FEES[active.tier])*(active.expiresAt-s.calendarSeconds)/WEEK_SECONDS:PLAN_FEES[tier];
 return {provider,tier,cost,available:PROVIDERS.includes(provider)&&['free','plus','pro'].includes(tier)&&cost<=s.cash,downgrade,effectiveAt:downgrade?active!.expiresAt:s.calendarSeconds,expiresAt:active?.expiresAt??s.calendarSeconds+WEEK_SECONDS,current};
}
export function changePlan(s:GameState,provider:Provider,tier:PlanTier):Result{
 const q=planQuote(s,provider,tier);if(!q.available)return {ok:false,message:'You cannot afford that weekly plan.'};
 for(const p of s.access.plans)p.renew=false;
 const active=s.access.plans.find(p=>p.provider===provider&&p.expiresAt>s.calendarSeconds);
 if(tier==='free'){if(active){active.renew=false;active.nextTier='free';}return {ok:true,message:'Renewal cancelled; paid coverage lasts until expiry.'};}
 s.cash-=q.cost;s.expenses+=q.cost;s.totalExpenses+=q.cost;
 if(active){if(q.downgrade)active.nextTier=tier;else {active.tier=tier;delete active.nextTier;}active.renew=true;}
 else {s.access.plans=s.access.plans.filter(p=>p.provider!==provider);s.access.plans.push({provider,tier,expiresAt:q.expiresAt,renew:true});}
 return {ok:true,message:'Weekly plan updated.'};
}
export function stopRenewals(s:GameState){for(const p of s.access.plans)p.renew=false;}
export function advanceAccess(s:GameState,seconds:number){
 if(!Number.isFinite(seconds)||seconds<=0)return;
 s.calendarSeconds+=seconds;if(apiAvailable(s))s.access.apiUnlocked=true;
 const week=calendar(s).week;if(s.access.usageWeek!==week){s.access.usage={};s.access.usageWeek=week;}
 for(const p of s.access.plans){while(p.renew&&p.expiresAt<=s.calendarSeconds){const next=p.nextTier??p.tier,fee=PLAN_FEES[next];if(next==='free'||fee>s.cash){p.renew=false;break;}s.cash-=fee;s.expenses+=fee;s.totalExpenses+=fee;p.tier=next;p.expiresAt+=WEEK_SECONDS;delete p.nextTier;}}
 s.access.plans=s.access.plans.filter(p=>p.expiresAt>s.calendarSeconds);
}
// Simulate access and cash timing while keeping the selected quote constant.
// Existing committed work can finish; no future news, heat or routing changes are assumed.
export function weeklyProfit(s:GameState,q:Quote,model:string){
 const forecast=structuredClone(s),horizonSeconds=calendar(s).resetIn,route=modelAccess(s,model,q.access);
 const fresh=new Set<Job>(),step=.25,workload=q.snapshot?.workload??(q.workload??tierWeight(model))/tierWeight(model);
 let jobs=0,jobsStarted=0,committedJobs=0,revenue=0,committedRevenue=0,usageFees=0,fee=0;
 for(let elapsed=0;elapsed<horizonSeconds;){
  const dt=Math.min(step,horizonSeconds-elapsed),before=forecast.expenses;advanceAccess(forecast,dt);fee+=forecast.expenses-before;elapsed+=dt;
  for(const job of forecast.jobs){job.remaining-=dt;if(job.remaining<=0){forecast.cash+=job.payout;revenue+=job.payout;if(fresh.has(job))jobs++;else {committedJobs++;committedRevenue+=job.payout;}}}
  forecast.jobs=forecast.jobs.filter(job=>job.remaining>0);
  if(!q.available||!Number.isFinite(q.duration)||q.duration<=0)continue;
  for(let worker=0;worker<forecast.workers;worker++){
   if(forecast.jobs.some(job=>job.worker===worker))continue;
   const freeVRAM=(GPUS.find(g=>g.id===forecast.gpu)?.vram??0)-forecast.jobs.reduce((n,j)=>n+j.vram,0);
   if(q.vram>freeVRAM)break;
   const reserved=startAccess(forecast,{model,access:route,revision:q.revision,workload,fee:q.cost});if(!reserved.ok)break;
   const job:Job={worker,model,business:s.business,remaining:q.duration,duration:q.duration,payout:q.payout,cost:q.cost,vram:q.vram,access:route,revision:q.revision,snapshot:q.snapshot};
   forecast.jobs.push(job);fresh.add(job);jobsStarted++;usageFees+=q.cost;
  }
 }
 const m=MODELS.find(m=>m.id===model),weeklyFee=route==='chat'&&m&&PROVIDERS.includes(m.company as Provider)?planMetrics(s,m.company as Provider).fee:0;
 return {period:'remaining-week' as const,assumption:'constant-quote' as const,timeStepSeconds:step,horizonSeconds,jobs,jobsStarted,committedJobs,committedRevenue,fee,weeklyFee,revenue,usageFees,profit:revenue-usageFees-fee,cashChange:forecast.cash-s.cash,resetIn:horizonSeconds};
}

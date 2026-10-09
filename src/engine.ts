import {createCoding,codingAction,acceptCoding,pumpPipeline,completeRequest,startContentPipeline,LONG_FORM,codingQuote,productionQuote} from './coding';
import { MODELS, BUSINESSES, GPUS, UPGRADES, HARNESS, PERKS, NEWS, LOGS, TARGETS, FUNDING, WORKER_PRICES, WORKFLOWS, BASE_SPEED, CLAW_UNLOCK, CLAW_COST } from './content';
import {PROJECTS,PROJECT_BUILD_SECONDS,projectBenefits,projectStatus} from './projects';
import type {GameState,Action,Result,Quote,Feed,AccessMode} from './types';
import {createAccess,modelAccess,quotaMetrics,revisionMetrics,canUse,startAccess,changePlan,stopRenewals,advanceAccess,adoptRevision,selectRevision,tierWeight,apiAvailable,weeklyProfit} from './access';

export const STEP=.25;
export function createGame():GameState {
 return {coding:createCoding(),career:{completed:0,byJob:{}},version:1,calendarSeconds:0,access:createAccess(),cash:15,slop:0,totalSlop:0,runEarned:0,totalEarned:0,expenses:0,totalExpenses:0,seconds:0,totalSeconds:0,fraction:0,model:'starter',business:'seo',gpu:'none',heat:25,auto:false,claw:false,workers:1,routing:'manual',upgrades:[],harness:[],perks:[],jobs:[],prestige:0,valuation:0,totalValuation:0,ending:false,discovered:[],projects:{active:null,completed:[]},feed:[{at:0,text:'You have $15 and a client looking for a cheaper writer.',kind:'system'}],seed:314159,nextEvent:300,event:null,eventLeft:0,notice:'Generate two articles, then automate for $25.',muted:true,reducedMotion:false};
}
export function has(s:GameState,id:string){return s.harness.includes(id)||s.perks.includes(id);}
export function capacity(s:GameState){return GPUS.find(g=>g.id===s.gpu)?.vram??0;}
export function stage(s:GameState){return Math.min(5,Math.max(GPUS.findIndex(g=>g.id===s.gpu),s.claw?2:0,s.upgrades.filter(id=>id.startsWith('cool')).length>2?3:0,s.prestige>=2?5:0));}
function count(s:GameState,kind:string){return s.upgrades.filter(id=>id.startsWith(kind+'-')).length;}
export function log(s:GameState,text:string,kind:Feed['kind']='system'){s.feed.unshift({at:s.totalSeconds,text,kind});s.feed.length=Math.min(30,s.feed.length);}
function rand(s:GameState){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function quote(s:GameState,modelId:string,businessId:string,options:{access?:AccessMode;revision?:string;ignoreBusy?:boolean;delegation?:boolean;coding?:boolean}={}):Quote {
 const m=MODELS.find(m=>m.id===modelId),b=BUSINESSES.find(b=>b.id===businessId);
 const empty={available:false,reason:'Choose a model and a business.',duration:0,payout:0,cost:0,net:0,vram:0,quantized:false};if(!m||!b)return empty;
 const access=modelAccess(s,modelId,options.access),revision=revisionMetrics(s,modelId,options.revision),quota=quotaMetrics(s,modelId,access);
 const suited=options.coding||m.suitableBusinesses.includes(b.id),revisionSpeed=suited?revision.speed:1,revisionPayout=!options.coding&&suited?revision.payout:1;
 const gpu=GPUS.find(g=>g.id===s.gpu),quantized=m.vram>capacity(s)&&has(s,'quantization'),vram=quantized?m.vram/2:m.vram;
 const benefits=projectBenefits(s),workflows=options.coding?[]:WORKFLOWS.filter(w=>w.business===b.id&&s.upgrades.includes(w.id));
 const workflowEffect=(effect:'speed'|'payout'|'request')=>workflows.filter(w=>w.effect===effect).reduce((n,w)=>n*w.multiplier,1);
 const speed=BASE_SPEED*(1+count(s,'speed')*.15)*(has(s,'speed')?1.2:1)*(s.claw&&has(s,'context')?1.12:1)*(s.claw&&has(s,'supervisor')?1.18:1)*(1+s.prestige*.85)*benefits.speed*workflowEffect('speed');
 const throttle=m.vram?Math.max(.32,1-Math.max(0,s.heat-65)/60):1;
 const fit=options.coding?undefined:m.fit?.[b.id];
 const duration=b.duration/(m.speed*revisionSpeed*speed*(fit?.speed??1)*(m.vram?(gpu?.speed??1)*(has(s,'local')?1.3:1)*throttle:1));
 const event=NEWS.find(n=>n.id===s.event);
 const payout=b.payout*m.value*revisionPayout*(fit?.payout??1)*(quantized?.82:1)*(1+count(s,'pay')*.2)*(1+count(s,'reach')*.16)*(has(s,'margin')?1.2:1)*(has(s,'reach')?1.25:1)*(s.claw&&has(s,'memory')?1.12:1)*(event?.effect==='demand'?event.multiplier:1)*benefits.payout*workflowEffect('payout');
 const overhead=access!=='chat'&&s.claw&&m.id!=='starter'?.35*(s.workers-1)*b.scale*(has(s,'retries')?.75:1)*(has(s,'coordination')?.55:1):0;
 const request=access==='chat'?0:m.cost*revision.fee*b.scale*(m.vram?1:benefits.cloudFee*workflowEffect('request'));
 const electricity=m.vram?(gpu?.watts??0)*duration*.00015*benefits.localElectricity:0;
 const cost=access==='chat'?0:(request+electricity+overhead)*(has(s,'cheap')?.75:1)*(s.claw&&has(s,'cache')?.8:1)*(event?.effect==='cost'?event.multiplier:1);
 const accessCheck=canUse(s,{model:modelId,access,revision:revision.id,workload:b.scale,fee:0,ignoreBusy:options.ignoreBusy??true,delegation:options.delegation});
 let reason=accessCheck.ok?'':accessCheck.message;if(s.runEarned<m.unlock)reason=`Unlocks at $${m.unlock.toLocaleString()} earned this run.`;
 if(!options.coding&&s.runEarned<b.unlock)reason=`Unlocks at $${b.unlock.toLocaleString()} earned this run.`;
 if(!options.coding&&m.quality<b.quality)reason=`Choose a stronger model for ${b.name.toLowerCase()}.`;if(vram>capacity(s))reason=`That model won’t fit: needs ${vram} GB; your rig has ${capacity(s)} GB.`;
 const suitable=s.runEarned>=m.unlock&&(options.coding||s.runEarned>=b.unlock&&m.quality>=b.quality)&&vram<=capacity(s)&&(!options.delegation||(m.delegation&&access!=='chat'));
 return {available:!reason,suitable,reason,duration,payout,cost,net:(payout-cost)/duration,vram,quantized,access,revision:revision.id,workload:b.scale*tierWeight(modelId),allowance:quota.allowance,remainingQuota:quota.remaining,snapshot:{speed:b.duration/(m.speed*duration),payout:payout/(b.payout*m.value),fee:access==='chat'?0:m.cost>0?cost/(m.cost*b.scale):cost,workload:b.scale}};
}
export function chooseModel(s:GameState,business:string,freeVRAM=capacity(s)):string {
 if(s.routing==='manual'||!s.claw||!has(s,'routing'))return s.model;
 const available=MODELS.map(m=>({m,q:quote(s,m.id,business,{ignoreBusy:false})})).filter(x=>x.q.available&&x.q.cost<=s.cash&&x.q.vram<=freeVRAM);
 if(!available.length)return s.model;
 if(s.routing==='cheapest')available.sort((a,b)=>a.q.cost-b.q.cost||b.q.net-a.q.net);
 else if(s.routing==='local')available.sort((a,b)=>Number(b.m.vram>0)-Number(a.m.vram>0)||b.q.net-a.q.net);
 else available.sort((a,b)=>b.q.net-a.q.net);return available[0].m.id;
}
export function startJob(s:GameState,worker:number):Result {
 if(s.coding.recovery){if(s.jobs.some(j=>j.worker===worker)||worker<0||worker>=s.workers)return {ok:false,message:'Worker unavailable.'};const q=quote(s,'starter','seo',{access:'chat',revision:'original',ignoreBusy:false});const paid=startAccess(s,{model:'starter',access:'chat',revision:'original',workload:1,fee:0});if(!paid.ok)return paid;s.jobs.push({worker,model:'starter',business:'seo',remaining:q.duration,duration:q.duration,payout:q.payout,cost:0,vram:0,version:1,access:'chat',revision:'original',snapshot:q.snapshot});return {ok:true,message:'Making free slop.'};}
 if(s.coding.selected)return s.coding.active?{ok:false,message:'The current coding contract uses the production lane.'}:acceptCoding(s);
 if(s.coding.active?.kind==='coding')return {ok:false,message:'The current contract uses the production lane.'};
 if(s.jobs.some(j=>j.worker===worker)||worker<0||worker>=s.workers)return {ok:false,message:'Worker unavailable.'};
 const free=capacity(s)-s.jobs.reduce((n,j)=>n+j.vram,0);let model=chooseModel(s,s.business,free),q=quote(s,model,s.business,{ignoreBusy:false});
 if(s.claw&&has(s,'fallback')&&(!q.available||q.cost>s.cash||q.vram>free)){
  const options=MODELS.map(m=>({m,q:quote(s,m.id,s.business,{ignoreBusy:false})})).filter(x=>x.q.available&&x.q.cost<=s.cash&&x.q.vram<=free).sort((a,b)=>b.q.net-a.q.net);
  if(options[0]){model=options[0].m.id;q=options[0].q;}
 }
 if(!q.available)return {ok:false,message:q.reason};
 if(q.vram>free)return {ok:false,message:'Your GPU is busy. Waiting for a job to finish.'};
 if(q.cost>s.cash)return {ok:false,message:'You can’t afford the next request. Use Free Trial & Error with SEO articles.'};
 if(LONG_FORM.includes(s.business))return startContentPipeline(s,model,q);
 const reserved=startAccess(s,{model,access:q.access,revision:q.revision,workload:q.snapshot!.workload,fee:q.cost});if(!reserved.ok)return reserved;
 s.jobs.push({worker,model,business:s.business,remaining:q.duration,duration:q.duration,payout:q.payout,cost:q.cost,vram:q.vram,version:1,revision:q.revision,access:q.access,snapshot:q.snapshot});
 return {ok:true,message:'On it.'};
}
export function income(s:GameState){
 if(s.coding.selected||s.coding.active?.kind==='coding'){const q=productionQuote(s),working=!!s.coding.active||s.auto;return {revenue:working&&q.duration?q.payout/q.duration:0,cost:working&&q.duration?q.cost/q.duration:0,net:working?q.net:0,workers:s.jobs.length,model:s.model};}
 const model=chooseModel(s,s.business),q=quote(s,model,s.business);
 if(s.jobs.length){const revenue=s.jobs.reduce((n,j)=>n+j.payout/j.duration,0),cost=s.jobs.reduce((n,j)=>n+j.cost/j.duration,0);return {revenue,cost,net:revenue-cost,workers:s.jobs.length,model};}
 if(!q.available||!s.auto||q.cost>s.cash)return {revenue:0,cost:0,net:0,workers:0,model};
 const jobs=previewJobs(s),revenue=jobs.reduce((n,j)=>n+j.payout/j.duration,0),cost=jobs.reduce((n,j)=>n+j.cost/j.duration,0);return {revenue,cost,net:revenue-cost,workers:jobs.length,model};
}
export function prestigeQuote(s:GameState){
 const target=TARGETS[Math.min(2,s.prestige)]*(s.prestige>2?Math.pow(1.7,s.prestige-2):1);
 return {target,eligible:s.runEarned>=target,name:FUNDING[Math.min(s.prestige,2)],reward:Math.max(0,Math.floor((10+s.prestige*4)*Math.sqrt(s.runEarned/target)*(has(s,'valuation')?1.5:1)))+projectBenefits(s).valuation};
}
function spend(s:GameState,cost:number){if(cost>s.cash)return false;s.cash-=cost;return true;}
function resetRun(s:GameState){
 if(apiAvailable(s))s.access.apiUnlocked=true;stopRenewals(s);
 const keep={calendarSeconds:s.calendarSeconds,access:s.access,...('career' in s?{career:s.career}:{}),prestige:s.prestige,valuation:s.valuation,totalValuation:s.totalValuation,perks:s.perks,discovered:s.discovered,projects:s.projects,totalSlop:s.totalSlop,totalEarned:s.totalEarned,totalExpenses:s.totalExpenses,totalSeconds:s.totalSeconds,ending:s.ending,muted:s.muted,reducedMotion:s.reducedMotion,feed:s.feed,seed:s.seed};
 Object.assign(s,createGame(),keep);s.cash=(has(s,'cash')?500:15)+projectBenefits(s).startingCash;s.auto=has(s,'auto');s.gpu=has(s,'gpu')?'mid':'none';s.claw=has(s,'claw');s.workers=has(s,'workers')?2:1;s.notice='Back in the bedroom. Your permanent upgrades carry over.';
}
export function dispatch(s:GameState,a:Action):Result {
 let message='',ok=false;
 if(['code-select','code-accept','code-role','code-budget','code-recover','work-content','free-slop','delegate'].includes(a.type)){const r=codingAction(s,a as import('./types').CodingAction);s.notice=r.message;return r;}
 if(a.type==='access'){if(['auto','chat','api','local'].includes(a.id)){s.access.mode=a.id;ok=true;message='Access mode changed.';}}
 else if(a.type==='plan'){const result=changePlan(s,a.provider,a.tier);s.notice=result.message;if(result.ok)log(s,result.message,'purchase');return result;}
 else if(a.type==='plan-cancel'){stopRenewals(s);ok=true;message='Automatic renewal stopped.';}
 else if(a.type==='revision-adopt'||a.type==='revision-select'){const result=a.type==='revision-adopt'?adoptRevision(s,a.id):selectRevision(s,a.model,a.id);s.notice=result.message;return result;}
 else if(a.type==='generate'){
  const slot=Array.from({length:s.workers},(_,i)=>i).find(i=>!s.jobs.some(j=>j.worker===i));
  if(slot===undefined)return {ok:false,message:'Everyone’s busy. Wait for a job to finish.'};
  const result=startJob(s,slot);s.notice=result.message;return result;
 }
 else if(a.type==='auto'){if(s.auto)message='Already running automatically.';else if(spend(s,25)){s.auto=true;ok=true;message='Running automatically. You can leave it to work.';}}
 else if(a.type==='model'){
  const m=MODELS.find(m=>m.id===a.id);if(m){const q=quote(s,m.id,s.business);if(s.runEarned>=m.unlock&&q.vram<=capacity(s)){s.model=m.id;ok=true;message=`Using ${m.name}.`;}else message=q.reason;}
 }
 else if(a.type==='business'){
  const b=BUSINESSES.find(b=>b.id===a.id);if(b&&s.runEarned>=b.unlock){s.business=b.id;s.coding.selected=null;ok=true;message=`${b.name} selected.`;}else message='That business hasn’t unlocked yet.';
 }
 else if(a.type==='gpu'){
  const index=GPUS.findIndex(g=>g.id===a.id),current=GPUS.findIndex(g=>g.id===s.gpu),g=GPUS[index];
  if(g&&index>current&&spend(s,g.cost)){s.gpu=g.id;ok=true;message=`Installed ${g.name.toLowerCase()}.`;}else if(index<=current)message='You already own this rig or a better one.';
 }
 else if(a.type==='upgrade'){
  const u=UPGRADES.find(u=>u.id===a.id);
  if(u&&!s.upgrades.includes(u.id)&&(!u.rank||s.upgrades.includes(`${u.kind}-${u.rank-1}`))&&spend(s,u.cost)){s.upgrades.push(u.id);ok=true;message=`Bought ${u.name.toLowerCase()}.`;}
  else if(u&&s.upgrades.includes(u.id))message='You already own that upgrade.';else if(u&&u.rank&&!s.upgrades.includes(`${u.kind}-${u.rank-1}`))message='Buy the previous upgrade in this category first.';
 }
 else if(a.type==='workflow'){
  const w=WORKFLOWS.find(w=>w.id===a.id),b=w&&BUSINESSES.find(b=>b.id===w.business);
  if(!w||!b)message='That workflow does not exist.';
  else if(s.runEarned<b.unlock)message='Unlock that business before buying its workflow.';
  else if(s.upgrades.includes(w.id))message='You already own that workflow.';
  else if(spend(s,w.cost)){s.upgrades.push(w.id);ok=true;message=`Bought ${w.name.toLowerCase()}.`;}
 }
 else if(a.type==='project-start'){
  const p=PROJECTS.find(p=>p.id===a.id);
  if(!p)message='That project does not exist.';
  else if(s.projects.active)message='Finish the current project first.';
  else if(s.projects.completed.some(c=>c.id===p.id))message='That project is already finished.';
  else if(s.totalSeconds<p.unlock)message=`Available after ${Math.ceil(p.unlock/60)} minutes played.`;
  else if(spend(s,p.cost)){s.projects.active={id:p.id,choices:[],remaining:0};ok=true;message=`${p.name} started. Choose the first feature.`;}
 }
 else if(a.type==='project-choice'){
  const status=projectStatus(s),option=status?.decision?.options.find(o=>o.id===a.id);
  if(!status)message='Start a project first.';
  else if(status.phase==='building')message='The current feature is still being built.';
  else if(!option)message='Choose one of the features for this decision.';
  else {status.progress.choices.push(option.id);status.progress.remaining=PROJECT_BUILD_SECONDS;ok=true;message=`${status.project.name}: building ${option.feature.toLowerCase()}.`;}
 }
 else if(a.type==='claw'){
  if(s.claw)message='SlopClaw is already installed.';else if(s.runEarned<CLAW_UNLOCK)message=`SlopClaw unlocks at $${CLAW_UNLOCK.toLocaleString()} earned this run.`;else if(spend(s,CLAW_COST)){s.claw=true;s.auto=true;ok=true;message='SlopClaw installed.';}
 }
 else if(a.type==='worker'){
  if(!s.claw)message='Install SlopClaw first.';else if(s.workers>=4)message='All four worker slots are filled.';else if(spend(s,WORKER_PRICES[s.workers])){s.workers++;ok=true;message=`Worker ${s.workers} added.`;}
 }
 else if(a.type==='harness'){
  const h=HARNESS.find(h=>h.id===a.id);
  if(h&&!s.harness.includes(h.id)&&(s.claw||h.id==='quantization')&&spend(s,h.cost)){s.harness.push(h.id);ok=true;message=`Installed ${h.name.toLowerCase()}.`;}
  else if(h&&s.harness.includes(h.id))message='That upgrade is already installed.';else if(!s.claw)message='Install SlopClaw first.';
 }
 else if(a.type==='routing'){
  if(s.claw&&has(s,'routing')&&['manual','cheapest','margin','local'].includes(a.id)){s.routing=a.id;ok=true;message=`Routing set to ${a.id==='margin'?'highest margin':a.id==='local'?'local first':a.id}.`;}else message='Install model routing in Agents first.';
 }
 else if(a.type==='perk'){
  const p=PERKS.find(p=>p.id===a.id);
  if(p&&s.prestige>=p.tier&&!s.perks.includes(p.id)&&s.valuation>=p.cost){s.valuation-=p.cost;s.perks.push(p.id);ok=true;message=`Bought ${p.name.toLowerCase()}.`;}else message='You need more valuation or a later funding round.';
 }
 else if(a.type==='prestige'){
  const p=prestigeQuote(s);if(p.eligible){s.valuation+=p.reward;s.totalValuation+=p.reward;s.prestige++;s.ending=s.prestige>=3;resetRun(s);ok=true;message=s.ending?'AGI Achieved: It Rewrote Your LinkedIn Bio.':`${p.name} raised. Back to work.`;}else message='Earn more this run before raising funding.';
 }
 if(!message)message=ok?'Done.':'You don’t have enough cash for that.';s.notice=message;if(ok)log(s,message,'purchase');return {ok,message};
}
export function advance(s:GameState,seconds:number){
 if(!Number.isFinite(seconds)||seconds<=0)return;s.fraction+=seconds;
 const steps=Math.floor((s.fraction+1e-9)/STEP);s.fraction=Math.max(0,s.fraction-steps*STEP);
 for(let i=0;i<steps;i++){
  s.seconds+=STEP;s.totalSeconds+=STEP;advanceAccess(s,STEP);
  const active=s.projects.active;
  if(active&&active.remaining>0){
   active.remaining=Math.max(0,active.remaining-STEP);
   if(active.remaining===0){
    const p=PROJECTS.find(p=>p.id===active.id)!;
    const option=p.decisions[active.choices.length-1].options.find(o=>o.id===active.choices.at(-1))!;
    if(active.choices.length===p.decisions.length){
     s.projects.completed.push({id:active.id,choices:[...active.choices]});s.projects.active=null;
     log(s,`${p.name} finished. ${option.feedback} Reward: ${p.rewardLabel}`);
    }else log(s,`${p.name}: next decision ready. ${option.feedback}`);
   }
  }
  if(s.eventLeft>0){s.eventLeft=Math.max(0,s.eventLeft-STEP);if(!s.eventLeft)s.event=null;}
  if(s.seconds>=s.nextEvent){
   const fresh=NEWS.filter(n=>n.tier<=s.prestige&&!s.discovered.includes(n.id)),pool=fresh.length?fresh:NEWS.filter(n=>n.tier<=s.prestige);
   const e=pool[Math.floor(rand(s)*pool.length)];s.event=e.id;s.eventLeft=90;if(!s.discovered.includes(e.id))s.discovered.push(e.id);
   log(s,e.title+': '+e.text,'news');s.nextEvent=s.seconds+240+Math.floor(rand(s)*120);
  }
  const localCount=s.jobs.filter(j=>j.vram>0).length,gpu=GPUS.find(g=>g.id===s.gpu),cooling=[0,8,18,35,55,80,115][count(s,'cool')]+(has(s,'cooling')?10:0);
  const targetHeat=25+(localCount?(gpu?.watts??0)*.07+localCount*9:0)-cooling;s.heat=Math.max(25,Math.min(99,s.heat+(targetHeat-s.heat)*.004*STEP));
  for(const j of s.jobs){j.remaining-=STEP;if(j.remaining<=0){if(j.pipeline){completeRequest(s,j.pipeline,j.request!);continue;}s.cash+=j.payout;s.runEarned+=j.payout;s.totalEarned+=j.payout;s.slop++;s.totalSlop++;if(s.slop===1||s.slop%13===0)log(s,LOGS[Math.floor(rand(s)*LOGS.length)],'job');}}
  s.jobs=s.jobs.filter(j=>j.remaining>0);
  pumpPipeline(s);
  if(s.auto&&(!s.coding.selected||s.coding.recovery||s.claw&&s.coding.approvedBudget!==null))for(let w=0;w<s.workers;w++)if(!s.jobs.some(j=>j.worker===w)){
   const r=startJob(s,w);if(!r.ok){if(!s.jobs.length)s.notice=r.message;break;}
  }
 }
}

// Use this for forecasts: real routing, cash, quota and VRAM reservations on a clone.
export function previewJobs(s:GameState){const preview=structuredClone(s);preview.jobs=[];preview.coding.active=null;preview.coding.content=[];for(let worker=0;worker<preview.workers;worker++)if(!startJob(preview,worker).ok)break;return preview.jobs.map(j=>{const p=[preview.coding.active,...preview.coding.content].find(p=>p?.id===j.pipeline);return p?{...j,duration:p.requests.reduce((n,r)=>n+r.duration,0),remaining:p.requests.reduce((n,r)=>n+r.duration,0),payout:p.payout,cost:p.requests.reduce((n,r)=>n+r.cost,0)}:j;});}
export function weeklyIncome(s:GameState,model=chooseModel(s,s.business)){return weeklyProfit(s,quote(s,model,s.business,{ignoreBusy:true}),model);}

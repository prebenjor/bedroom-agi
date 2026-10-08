import { MODELS, BUSINESSES, GPUS, UPGRADES, HARNESS, PERKS, NEWS, LOGS, TARGETS, FUNDING, WORKER_PRICES } from './content';
import type {GameState,Action,Result,Quote,Feed} from './types';

export const STEP=.25;
export function createGame():GameState {
 return {version:1,cash:15,slop:0,totalSlop:0,runEarned:0,totalEarned:0,expenses:0,totalExpenses:0,seconds:0,totalSeconds:0,fraction:0,model:'starter',business:'seo',gpu:'none',heat:25,auto:false,claw:false,workers:1,routing:'manual',upgrades:[],harness:[],perks:[],jobs:[],prestige:0,valuation:0,totalValuation:0,ending:false,discovered:[],feed:[{at:0,text:'You have $15 and a client looking for a cheaper writer.',kind:'system'}],seed:314159,nextEvent:300,event:null,eventLeft:0,notice:'Generate two articles, then buy automatic production for $25.',muted:true,reducedMotion:false};
}
export function has(s:GameState,id:string){return s.harness.includes(id)||s.perks.includes(id);}
export function capacity(s:GameState){return GPUS.find(g=>g.id===s.gpu)?.vram??0;}
export function stage(s:GameState){return Math.min(5,Math.max(GPUS.findIndex(g=>g.id===s.gpu),s.claw?2:0,s.upgrades.filter(id=>id.startsWith('cool')).length>2?3:0,s.prestige>=2?5:0));}
function count(s:GameState,kind:string){return s.upgrades.filter(id=>id.startsWith(kind+'-')).length;}
export function log(s:GameState,text:string,kind:Feed['kind']='system'){s.feed.unshift({at:s.totalSeconds,text,kind});s.feed.length=Math.min(30,s.feed.length);}
function rand(s:GameState){s.seed=(Math.imul(s.seed,1664525)+1013904223)>>>0;return s.seed/4294967296;}
export function quote(s:GameState,modelId:string,businessId:string):Quote {
 const m=MODELS.find(m=>m.id===modelId),b=BUSINESSES.find(b=>b.id===businessId);
 const empty={available:false,reason:'Choose a model and a business.',duration:0,payout:0,cost:0,net:0,vram:0,quantized:false};if(!m||!b)return empty;
 const gpu=GPUS.find(g=>g.id===s.gpu),quantized=m.vram>capacity(s)&&has(s,'quantization'),vram=quantized?m.vram/2:m.vram;
 const speed=.65*(1+count(s,'speed')*.15)*(has(s,'speed')?1.2:1)*(s.claw&&has(s,'context')?1.12:1)*(s.claw&&has(s,'supervisor')?1.18:1)*(1+s.prestige*.85);
 const throttle=m.vram?Math.max(.32,1-Math.max(0,s.heat-65)/60):1;
 const duration=b.duration/(m.speed*speed*(m.vram?(gpu?.speed??1)*(has(s,'local')?1.3:1)*throttle:1));
 const event=NEWS.find(n=>n.id===s.event);
 const payout=b.payout*m.value*(quantized?.82:1)*(1+count(s,'pay')*.2)*(1+count(s,'reach')*.16)*(has(s,'margin')?1.2:1)*(has(s,'reach')?1.25:1)*(s.claw&&has(s,'memory')?1.12:1)*(event?.effect==='demand'?event.multiplier:1);
 const overhead=s.claw&&m.id!=='starter'?.35*(s.workers-1)*b.scale*(has(s,'retries')?.75:1)*(has(s,'coordination')?.55:1):0;
 const cost=(m.cost*b.scale+(m.vram?(gpu?.watts??0)*duration*.00015:0)+overhead)*(has(s,'cheap')?.75:1)*(s.claw&&has(s,'cache')?.8:1)*(event?.effect==='cost'?event.multiplier:1);
 let reason='';if(s.runEarned<m.unlock)reason=`Available after $${m.unlock.toLocaleString()} earned this run.`;
 if(s.runEarned<b.unlock)reason=`Earn $${b.unlock.toLocaleString()} this run to unlock this business.`;
 if(m.quality<b.quality)reason='This business needs a more capable model.';if(vram>capacity(s))reason='That model won’t fit on your card.';
 return {available:!reason,reason,duration,payout,cost,net:(payout-cost)/duration,vram,quantized};
}
export function chooseModel(s:GameState,business:string,freeVRAM=capacity(s)):string {
 if(s.routing==='manual'||!s.claw||!has(s,'routing'))return s.model;
 const available=MODELS.map(m=>({m,q:quote(s,m.id,business)})).filter(x=>x.q.available&&x.q.cost<=s.cash&&x.q.vram<=freeVRAM);
 if(!available.length)return s.model;
 if(s.routing==='cheapest')available.sort((a,b)=>a.q.cost-b.q.cost||b.q.net-a.q.net);
 else if(s.routing==='local')available.sort((a,b)=>Number(b.m.vram>0)-Number(a.m.vram>0)||b.q.net-a.q.net);
 else available.sort((a,b)=>b.q.net-a.q.net);return available[0].m.id;
}
function startJob(s:GameState,worker:number):Result {
 const free=capacity(s)-s.jobs.reduce((n,j)=>n+j.vram,0);let model=chooseModel(s,s.business,free),q=quote(s,model,s.business);
 if(s.claw&&has(s,'fallback')&&(!q.available||q.cost>s.cash||q.vram>free)){
  const options=MODELS.map(m=>({m,q:quote(s,m.id,s.business)})).filter(x=>x.q.available&&x.q.cost<=s.cash&&x.q.vram<=free).sort((a,b)=>b.q.net-a.q.net);
  if(options[0]){model=options[0].m.id;q=options[0].q;}
 }
 if(!q.available)return {ok:false,message:q.reason};
 if(q.vram>free)return {ok:false,message:'Your card is busy. Another local job will start when there’s room.'};
 if(q.cost>s.cash)return {ok:false,message:'You can’t afford the next request. Switch to the free chatbot and SEO articles.'};
 s.cash-=q.cost;s.expenses+=q.cost;s.totalExpenses+=q.cost;
 s.jobs.push({worker,model,business:s.business,remaining:q.duration,duration:q.duration,payout:q.payout,cost:q.cost,vram:q.vram});
 return {ok:true,message:'Job queued. It sells automatically when it’s done.'};
}
export function income(s:GameState){
 const model=chooseModel(s,s.business),q=quote(s,model,s.business);
 if(s.jobs.length){const revenue=s.jobs.reduce((n,j)=>n+j.payout/j.duration,0),cost=s.jobs.reduce((n,j)=>n+j.cost/j.duration,0);return {revenue,cost,net:revenue-cost,workers:s.jobs.length,model};}
 if(!q.available||!s.auto||q.cost>s.cash)return {revenue:0,cost:0,net:0,workers:0,model};
 const slots=q.vram?Math.min(s.workers,Math.floor(capacity(s)/q.vram)):s.workers;
 const revenue=q.payout/q.duration*slots,cost=q.cost/q.duration*slots;return {revenue,cost,net:revenue-cost,workers:slots,model};
}
export function prestigeQuote(s:GameState){
 const target=TARGETS[Math.min(2,s.prestige)]*(s.prestige>2?Math.pow(1.7,s.prestige-2):1);
 return {target,eligible:s.runEarned>=target,name:FUNDING[Math.min(s.prestige,2)],reward:Math.max(0,Math.floor((10+s.prestige*4)*Math.sqrt(s.runEarned/target)*(has(s,'valuation')?1.5:1)))};
}
function spend(s:GameState,cost:number){if(cost>s.cash)return false;s.cash-=cost;return true;}
function resetRun(s:GameState){
 const keep={prestige:s.prestige,valuation:s.valuation,totalValuation:s.totalValuation,perks:s.perks,discovered:s.discovered,totalSlop:s.totalSlop,totalEarned:s.totalEarned,totalExpenses:s.totalExpenses,totalSeconds:s.totalSeconds,ending:s.ending,muted:s.muted,reducedMotion:s.reducedMotion,feed:s.feed,seed:s.seed};
 Object.assign(s,createGame(),keep);s.cash=has(s,'cash')?500:15;s.auto=has(s,'auto');s.gpu=has(s,'gpu')?'mid':'none';s.claw=has(s,'claw');s.workers=has(s,'workers')?2:1;s.notice='New run started. Your permanent perks are active.';
}
export function dispatch(s:GameState,a:Action):Result {
 let message='',ok=false;
 if(a.type==='generate'){
  const slot=Array.from({length:s.workers},(_,i)=>i).find(i=>!s.jobs.some(j=>j.worker===i));
  if(slot===undefined)return {ok:false,message:'All workers are busy. Give them a moment.'};
  const result=startJob(s,slot);s.notice=result.message;return result;
 }
 if(a.type==='auto'){if(s.auto)message='Automatic production is already on.';else if(spend(s,25)){s.auto=true;ok=true;message='Automatic production is on. You can stop clicking.';}}
 else if(a.type==='model'){
  const m=MODELS.find(m=>m.id===a.id);if(m){const q=quote(s,m.id,s.business);if(s.runEarned>=m.unlock&&q.vram<=capacity(s)){s.model=m.id;ok=true;message='Model changed. Running jobs keep their original model.';}else message=q.reason;}
 }
 else if(a.type==='business'){
  const b=BUSINESSES.find(b=>b.id===a.id);if(b&&s.runEarned>=b.unlock){s.business=b.id;ok=true;message='Business changed. Running jobs will finish first.';}else message='That business hasn’t unlocked yet.';
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
 else if(a.type==='claw'){
  if(s.claw)message='SlopClaw is already installed.';else if(s.runEarned<8000)message='SlopClaw unlocks at $8,000 earned this run.';else if(spend(s,2400)){s.claw=true;s.auto=true;ok=true;message='SlopClaw installed. Automatic production is on; workers and routing are available.';}
 }
 else if(a.type==='worker'){
  if(!s.claw)message='Install SlopClaw first.';else if(s.workers>=4)message='You’ve reached the limit of four workers.';else if(spend(s,WORKER_PRICES[s.workers])){s.workers++;ok=true;message=`Worker ${s.workers} online. More workers also mean more overhead.`;}
 }
 else if(a.type==='harness'){
  const h=HARNESS.find(h=>h.id===a.id);
  if(h&&!s.harness.includes(h.id)&&(s.claw||h.id==='quantization')&&spend(s,h.cost)){s.harness.push(h.id);ok=true;message=`Installed ${h.name.toLowerCase()}.`;}
  else if(h&&s.harness.includes(h.id))message='That upgrade is already installed.';else if(!s.claw)message='Install SlopClaw first.';
 }
 else if(a.type==='routing'){
  if(s.claw&&has(s,'routing')&&['manual','cheapest','margin','local'].includes(a.id)){s.routing=a.id;ok=true;message='Routing changed. Running jobs will finish first.';}else message='Buy model routing in SlopClaw first.';
 }
 else if(a.type==='perk'){
  const p=PERKS.find(p=>p.id===a.id);
  if(p&&s.prestige>=p.tier&&!s.perks.includes(p.id)&&s.valuation>=p.cost){s.valuation-=p.cost;s.perks.push(p.id);ok=true;message=`Bought ${p.name.toLowerCase()}. Starting equipment applies next run; production perks apply now.`;}else message='You need more valuation or a later funding round.';
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
  s.seconds+=STEP;s.totalSeconds+=STEP;
  if(s.eventLeft>0){s.eventLeft=Math.max(0,s.eventLeft-STEP);if(!s.eventLeft)s.event=null;}
  if(s.seconds>=s.nextEvent){
   const fresh=NEWS.filter(n=>n.tier<=s.prestige&&!s.discovered.includes(n.id)),pool=fresh.length?fresh:NEWS.filter(n=>n.tier<=s.prestige);
   const e=pool[Math.floor(rand(s)*pool.length)];s.event=e.id;s.eventLeft=90;if(!s.discovered.includes(e.id))s.discovered.push(e.id);
   log(s,e.title+': '+e.text,'news');s.nextEvent=s.seconds+240+Math.floor(rand(s)*120);
  }
  const localCount=s.jobs.filter(j=>j.vram>0).length,gpu=GPUS.find(g=>g.id===s.gpu),cooling=[0,8,18,35,55,80,115][count(s,'cool')]+(has(s,'cooling')?10:0);
  const targetHeat=25+(localCount?(gpu?.watts??0)*.07+localCount*9:0)-cooling;s.heat=Math.max(25,Math.min(99,s.heat+(targetHeat-s.heat)*.004*STEP));
  for(const j of s.jobs){j.remaining-=STEP;if(j.remaining<=0){s.cash+=j.payout;s.runEarned+=j.payout;s.totalEarned+=j.payout;s.slop++;s.totalSlop++;if(s.slop===1||s.slop%13===0)log(s,LOGS[Math.floor(rand(s)*LOGS.length)],'job');}}
  s.jobs=s.jobs.filter(j=>j.remaining>0);
  if(s.auto)for(let w=0;w<s.workers;w++)if(!s.jobs.some(j=>j.worker===w)){
   const r=startJob(s,w);if(!r.ok){if(!s.jobs.length)s.notice=r.message;break;}
  }
 }
}

import {MODELS,BUSINESSES,UPGRADES,WORKFLOWS,GPUS,HARNESS,WORKER_PRICES,CLAW_UNLOCK,CLAW_COST} from './content';
import {capacity,chooseModel,has,quote,dispatch} from './engine';
import type {GameState,Quote,Upgrade,Action} from './types';

export type ProductionKind='manual-ready'|'manual-running'|'automatic-running'|'waiting-for-vram'|'paused';
export interface ProductionStatus {kind:ProductionKind;reason:string;recoverable:boolean;model:string;quote:Quote}

export function agentSummary(s:GameState){
 const local=s.jobs.filter(j=>j.vram>0).length;
 return {local,cloud:s.jobs.length-local,idle:s.workers-s.jobs.length,
  usedVRAM:s.jobs.reduce((sum,j)=>sum+j.vram,0),capacity:capacity(s),
  models:[...new Set(s.jobs.map(j=>MODELS.find(m=>m.id===j.model)!.name))]};
}

// Match next-job routing and fallback without starting work or touching the RNG.
function nextSetup(s:GameState,freeVRAM=capacity(s)){
 let model=chooseModel(s,s.business,freeVRAM),q=quote(s,model,s.business);
 if(s.claw&&has(s,'fallback')&&(!q.available||q.cost>s.cash||q.vram>freeVRAM)){
  const candidates=MODELS.map(m=>({model:m.id,q:quote(s,m.id,s.business)}))
   .filter(x=>x.q.available&&x.q.cost<=s.cash&&x.q.vram<=freeVRAM).sort((a,b)=>b.q.net-a.q.net);
  if(candidates[0]){model=candidates[0].model;q=candidates[0].q;}
 }
 return {model,quote:q};
}

export function productionStatus(s:GameState):ProductionStatus {
 const freeVRAM=capacity(s)-s.jobs.reduce((sum,j)=>sum+j.vram,0),next=nextSetup(s,freeVRAM);
 const occupied=s.jobs.length,hasFreeWorker=occupied<s.workers;
 if(hasFreeWorker&&next.quote.available&&next.quote.cost<=s.cash&&next.quote.vram>freeVRAM)
  return {...next,kind:'waiting-for-vram',reason:'The card is full. Waiting for a local job to finish.',recoverable:false};
 if(occupied)return {...next,kind:s.auto?'automatic-running':'manual-running',reason:s.auto?'Automatic production is on.':'Work is in progress.',recoverable:false};
 if(!next.quote.available)return {...next,kind:'paused',reason:next.quote.reason,recoverable:true};
 if(next.quote.cost>s.cash)return {...next,kind:'paused',reason:'Not enough cash for a request. The free chatbot can still make SEO articles.',recoverable:true};
 return {...next,kind:s.auto?'automatic-running':'manual-ready',reason:s.auto?'Automatic production is on.':'Ready to generate.',recoverable:false};
}

export function projectedIncome(s:GameState){
 let cash=s.cash,freeVRAM=capacity(s),slots=0,revenue=0,cost=0;
 const model=nextSetup(s).model;
 for(let worker=0;worker<s.workers;worker++){
  const next=nextSetup({...s,cash},freeVRAM),q=next.quote;
  if(!q.available||q.cost>cash||q.vram>freeVRAM)break;
  cash-=q.cost;freeVRAM-=q.vram;slots++;
  revenue+=q.payout/q.duration;cost+=q.cost/q.duration;
 }
 return {net:revenue-cost,revenue,cost,slots,model};
}

export function upgradePreview(s:GameState,id:string){
 const u=UPGRADES.find(u=>u.id===id);if(!u)return {gain:0,reserveReason:''};
 const preview={...s,cash:s.cash-u.cost,upgrades:[...s.upgrades,u.id]},next=nextSetup(preview);
 const reserveReason=u.cost<=s.cash&&next.quote.available&&next.quote.cost>preview.cash?'You’ll need more cash to run a request after buying this.':'';
 return {gain:projectedIncome(preview).net-projectedIncome(s).net,reserveReason};
}

export function suggestedUpgrades(s:GameState):Upgrade[]{
 const next=(['speed','pay','reach'] as const).map(kind=>UPGRADES.find(u=>u.kind===kind&&!s.upgrades.includes(u.id)))
  .filter((u):u is Upgrade=>!!u);
 const ranked=next.filter(u=>u.cost<=s.cash).map(u=>({u,gain:upgradePreview(s,u.id).gain}))
  .filter(x=>x.gain>0).sort((a,b)=>b.gain/b.u.cost-a.gain/a.u.cost||a.u.cost-b.u.cost||a.u.id.localeCompare(b.u.id));
 const suggestions=ranked.map(x=>x.u);
 const goal=next.filter(u=>!suggestions.includes(u)).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id))[0];
 if(suggestions.length<2&&goal)suggestions.push(goal);
 const cooling=s.heat>65?UPGRADES.find(u=>u.kind==='cool'&&!s.upgrades.includes(u.id)):undefined;
 return (cooling?[cooling,...suggestions]:suggestions).slice(0,2);
}

export interface PurchaseCandidate {
 id:string;action:Action;cost:number;name:string;description:string;gain:number;
 payback:number|null;reserveReason:string;expectedBenefit?:string;
}

// Reserve each worker's cash and memory exactly as production does. Hardware
// may earn its improvement by enabling a model; all other previews keep the route.
export function purchaseCandidates(s:GameState):PurchaseCandidate[]{
 const options:Omit<PurchaseCandidate,'gain'|'payback'|'reserveReason'>[]=[];
 for(const kind of ['speed','pay','reach','cool'] as const){
  const u=UPGRADES.find(u=>u.kind===kind&&!s.upgrades.includes(u.id));
  if(u)options.push({...u,action:{type:'upgrade',id:u.id}});
 }
 const workflow=WORKFLOWS.find(w=>w.business===s.business&&!s.upgrades.includes(w.id));
 if(workflow)options.push({...workflow,action:{type:'workflow',id:workflow.id}});
 const currentGPU=GPUS.findIndex(g=>g.id===s.gpu);
 for(const [index,g] of GPUS.entries())if(index>currentGPU)options.push({...g,action:{type:'gpu',id:g.id}});
 if(!s.claw&&s.runEarned>=CLAW_UNLOCK)options.push({id:'claw',action:{type:'claw'},cost:CLAW_COST,name:'SlopClaw',description:'Open worker slots, routing and harness upgrades.',expectedBenefit:'Unlocks workers and the agent harness.'});
 if(s.claw&&s.workers<4)options.push({id:'worker',action:{type:'worker'},cost:WORKER_PRICES[s.workers],name:`Worker ${s.workers+1}`,description:'Run another job when requests and memory fit.'});
 for(const h of HARNESS)if(!s.harness.includes(h.id)&&(s.claw||h.id==='quantization'))options.push({...h,action:{type:'harness',id:h.id}});
 const candidates:PurchaseCandidate[]=[];
 for(const option of options){
  const affordable=option.cost<=s.cash;
  const preview=structuredClone(s);
  // Savings goals are valued once the purchase and a full request batch can be funded.
  if(!affordable)preview.cash=option.cost+Math.max(s.cash,100,quote(s,s.model,s.business).cost*s.workers);
  const hardware=option.action.type==='gpu'||(option.action.type==='harness'&&option.action.id==='quantization');
  let before=projectedIncome(preview).net;
  if(hardware)for(const m of MODELS.filter(m=>m.vram>0)){
   if(quote(preview,m.id,s.business).available)before=Math.max(before,projectedIncome({...preview,model:m.id,routing:'manual'}).net);
  }
  if(!dispatch(preview,option.action).ok)continue;
  let after=projectedIncome(preview).net,expectedBenefit=option.expectedBenefit;
  if(hardware){
   for(const m of MODELS.filter(m=>m.vram>0)){
    const q=quote(preview,m.id,s.business);if(!q.available)continue;
    const alternative={...preview,model:m.id,routing:'manual' as const};
    const net=projectedIncome(alternative).net;
    if(net>after){after=net;expectedBenefit=`Use ${m.name} for ${BUSINESSES.find(b=>b.id===s.business)!.name.toLowerCase()}.`;}
   }
  }
  if(option.id.startsWith('cool-'))expectedBenefit='Reduces throttling as the room cools.';
  const next=nextSetup(preview),reserveReason=affordable&&next.quote.available&&next.quote.cost>preview.cash?'You’ll need more cash to run a request after buying this.':'';
  const gain=after-before;
  if(gain<=0&&option.id!=='claw'&&!(s.heat>65&&option.action.type==='upgrade'&&option.id.startsWith('cool-')))continue;
  candidates.push({...option,gain,payback:gain>0?option.cost/gain:null,reserveReason,expectedBenefit});
 }
 return candidates.sort((a,b)=>{
  const cooling=(c:PurchaseCandidate)=>s.heat>65&&c.id.startsWith('cool-')?1:0;
  return cooling(b)-cooling(a)||b.gain/b.cost-a.gain/a.cost||a.cost-b.cost||a.id.localeCompare(b.id);
 });
}

export function suggestedPurchases(s:GameState):PurchaseCandidate[]{
 const all=purchaseCandidates(s),affordable=all.filter(c=>c.cost<=s.cash&&(!c.reserveReason||c.id.startsWith('cool-')));
 const suggestions=affordable.slice(0,2);
 if(suggestions.length<2){const goal=all.filter(c=>c.cost>s.cash).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id))[0];if(goal)suggestions.push(goal);}
 return suggestions;
}

export function nextPurchaseGoal(s:GameState):{candidate:PurchaseCandidate;waitSeconds:number|null}|null{
 if(!s.auto){
  const gain=projectedIncome(s).net;
  return {candidate:{id:'auto',action:{type:'auto'},cost:25,name:'Automatic production',description:'Keep producing between check-ins.',gain,payback:gain>0?25/gain:null,reserveReason:'',expectedBenefit:'Generate jobs automatically.'},waitSeconds:null};
 }
 const ready=suggestedPurchases(s).find(c=>c.cost<=s.cash&&!c.reserveReason);
 if(ready)return {candidate:ready,waitSeconds:0};
 const candidate=purchaseCandidates(s).filter(c=>c.cost>s.cash).sort((a,b)=>a.cost-b.cost||a.id.localeCompare(b.id))[0];
 if(!candidate)return null;
 const net=projectedIncome(s).net;
 return {candidate,waitSeconds:s.auto&&net>0?(candidate.cost-s.cash)/net:null};
}

export function modelPreview(s:GameState,id:string){
 const q=quote(s,id,s.business),current=nextSetup(s).quote,m=MODELS.find(m=>m.id===id)!;
 return {quote:q,delta:q.available?q.net-(current.available?current.net:0):0,
  specialties:m.specialties.map(id=>BUSINESSES.find(b=>b.id===id)!.name),
  clearsRouting:s.claw&&has(s,'routing')&&s.routing!=='manual'};
}

import {MODELS,UPGRADES} from './content';
import {capacity,chooseModel,has,quote} from './engine';
import type {GameState,Quote,Upgrade} from './types';

export type ProductionKind='manual-ready'|'manual-running'|'automatic-running'|'waiting-for-vram'|'paused';
export interface ProductionStatus {kind:ProductionKind;reason:string;recoverable:boolean;model:string;quote:Quote}

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
  return {...next,kind:'waiting-for-vram',reason:'Your card is busy. Another local job will start when there’s room.',recoverable:false};
 if(occupied)return {...next,kind:s.auto?'automatic-running':'manual-running',reason:s.auto?'Running automatically.':'Your content sells when the job finishes.',recoverable:false};
 if(!next.quote.available)return {...next,kind:'paused',reason:next.quote.reason,recoverable:true};
 if(next.quote.cost>s.cash)return {...next,kind:'paused',reason:'You can’t afford the next request. Use the free chatbot and SEO articles to recover.',recoverable:true};
 return {...next,kind:s.auto?'automatic-running':'manual-ready',reason:s.auto?'Running automatically.':'Generate a job. It sells automatically when it’s done.',recoverable:false};
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
 const reserveReason=u.cost<=s.cash&&next.quote.available&&next.quote.cost>preview.cash?'Leaves too little cash for the next request.':'';
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

export function modelPreview(s:GameState,id:string){
 const q=quote(s,id,s.business),current=nextSetup(s).quote;
 return {quote:q,delta:q.available?q.net-(current.available?current.net:0):0,
  clearsRouting:s.claw&&has(s,'routing')&&s.routing!=='manual'};
}

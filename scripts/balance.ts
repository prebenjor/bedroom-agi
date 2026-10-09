import {createGame,advance,dispatch,quote,prestigeQuote} from '../src/engine';
import {projectedIncome} from '../src/presentation';
import {MODELS,BUSINESSES,GPUS,UPGRADES,HARNESS,PERKS,WORKER_PRICES} from '../src/content';
import type {GameState,Action} from '../src/types';
import {fileURLToPath} from 'node:url';
export type Strategy='cloud'|'local'|'mixed';
export function bestSetup(s:GameState,strategy:Strategy){
 let best={model:'starter',business:'seo',net:-Infinity};
 for(const b of BUSINESSES)for(const m of MODELS){
  if(strategy==='cloud'&&m.vram)continue;
  if(strategy==='local'&&!m.vram&&m.id!=='starter')continue;
  const q=quote(s,m.id,b.id);if(!q.available||q.cost>s.cash)continue;
  // Evaluate only the proposed manual setup, with each worker paying its request
  // and reserving memory before the next. Fallback may violate cloud/local strategy.
  const candidate={...s,model:m.id,business:b.id,routing:'manual' as const,jobs:[],harness:s.harness.filter(id=>id!=='fallback')};
  const net=projectedIncome(candidate).net;if(net>best.net)best={model:m.id,business:b.id,net};
 }
 return best;
}
export function manage(s:GameState,strategy:Strategy='mixed'){
 const perks=['auto','cash','speed','margin','gpu','claw','workers','cheap','reach','local','cooling','valuation'];
 for(const id of perks){const p=PERKS.find(p=>p.id===id)!;if(!s.perks.includes(id)&&s.prestige>=p.tier&&s.valuation>=p.cost)dispatch(s,{type:'perk',id});}
 if(!s.auto){
  if(s.cash<25&&!s.jobs.length){dispatch(s,{type:'generate'});advance(s,20);if(s.cash<25){dispatch(s,{type:'generate'});advance(s,20);}}
  dispatch(s,{type:'auto'});
 }
 if(!s.claw&&s.runEarned>=8000&&s.cash>=2600)dispatch(s,{type:'claw'});
 if(strategy!=='cloud'&&s.gpu!=='none'&&!s.harness.includes('quantization')&&s.cash>=600)dispatch(s,{type:'harness',id:'quantization'});
 for(let i=0;i<24;i++){
  const old=bestSetup(s,strategy),candidates:{action:Action;cost:number;gain:number}[]=[];
  const options:{action:Action;cost:number}[]=[...UPGRADES.filter(u=>u.kind!=='cool').map(u=>({action:{type:'upgrade',id:u.id} as Action,cost:u.cost})),...HARNESS.map(h=>({action:{type:'harness',id:h.id} as Action,cost:h.cost})),...(strategy!=='cloud'?GPUS.map(g=>({action:{type:'gpu',id:g.id} as Action,cost:g.cost})):[])];
  if(s.claw&&s.workers<4)options.push({action:{type:'worker'},cost:WORKER_PRICES[s.workers]});
  for(const option of options){if(option.cost>s.cash*.92)continue;const clone=structuredClone(s);if(!dispatch(clone,option.action).ok)continue;
   const gain=bestSetup(clone,strategy).net-old.net;if(gain>0&&option.cost/gain<(strategy==='local'?8000:1000))candidates.push({...option,gain});}
  candidates.sort((a,b)=>b.gain/b.cost-a.gain/a.cost);if(!candidates.length)break;dispatch(s,candidates[0].action);
 }
 if(s.heat>65){const cool=UPGRADES.find(u=>u.kind==='cool'&&!s.upgrades.includes(u.id));if(cool&&s.cash>cool.cost*2)dispatch(s,{type:'upgrade',id:cool.id});}
 const best=bestSetup(s,strategy);dispatch(s,{type:'business',id:best.business});dispatch(s,{type:'model',id:best.model});
}
export function simulate(strategy:Strategy='mixed'){
 const s=createGame();dispatch(s,{type:'generate'});advance(s,20);dispatch(s,{type:'generate'});advance(s,20);dispatch(s,{type:'auto'});
 const runs:number[]=[],claw:number[]=[],models=new Set<string>(),businesses=new Set<string>(),checkpoints:GameState[]=[];
 let clawRecorded=false;
 for(let checks=0;checks<600;checks++){
  manage(s,strategy);models.add(s.model);businesses.add(s.business);if(s.claw&&!clawRecorded){claw.push(Math.round(s.seconds/60));clawRecorded=true;}
  if(prestigeQuote(s).eligible){runs.push(Math.round(s.seconds/60));checkpoints.push(structuredClone(s));dispatch(s,{type:'prestige'});clawRecorded=false;if(runs.length===3)break;manage(s,strategy);}
  advance(s,180);
 }
 return {strategy,runs,claw,models:[...models],businesses:[...businesses],state:s,checkpoints};
}
if(process.argv[1]===fileURLToPath(import.meta.url))for(const strategy of ['cloud','local','mixed'] as const){const {state,checkpoints,...report}=simulate(strategy);console.log(JSON.stringify({...report,ending:state.ending,cash:Math.round(state.cash)},null,2));}

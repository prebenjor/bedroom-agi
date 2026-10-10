import {MODELS} from './content';
import {quote,advance,dispatch,capacity,has} from './engine';
import {calendar,weeklyProfit,planMetrics,revisionMetrics,PROVIDERS,PLAN_FEES} from './access';
import {codingBenchmark,codingQuote,type PipelineQuote} from './coding';
import type {GameState,Quote} from './types';

export function quoteTransport(q:Quote|PipelineQuote){
 if(!('requests' in q))return q.access??'No requests';
 const access=[...new Set(q.requests.map(r=>r.access))];if(access.length<=1)return access[0]??'No requests';
 return `Mixed · ${[...new Set(q.requests.map(r=>`${r.role}: ${r.access}`))].join(', ')}`;
}

export function workComparison(s:GameState,model:string){if(!s.coding.selected)return quote(s,model,s.business);const clone=structuredClone(s);clone.model=model;return codingQuote(clone);}
export function modelCapabilityText(s:GameState,id:string){const m=MODELS.find(m=>m.id===id)!,r=revisionMetrics(s,id),context=r.contextCapacity*(s.claw&&has(s,'context')?2:1);return `Coding ${r.codingScore} · ${context.toLocaleString('en-US')} context · ${m.testing?'testing capable':'slower tests'} · ${m.delegation?'API/local delegation':'no coordination'}`;}
export function nextLockedModels(s:GameState){return new Set([...new Set(MODELS.map(m=>m.family))].map(f=>MODELS.filter(m=>m.family===f&&m.unlock>s.runEarned).sort((a,b)=>a.unlock-b.unlock)[0]?.id).filter(Boolean));}
export function recommendedModels(s:GameState){return MODELS.map(model=>({model,quote:workComparison(s,model.id)})).filter(r=>r.quote.available&&r.quote.vram<=capacity(s)).sort((a,b)=>b.quote.net-a.quote.net).slice(0,3);}
export function contentRecommendation(s:GameState){const best=recommendedModels(s)[0],current=workComparison(s,s.model);return {title:best&&best.model.id!==s.model?`Compare ${best.model.name}`:'Check your model and access',benefit:best&&best.quote.net>current.net?`$${(best.quote.net-current.net).toFixed(2)}/s more net for the next job. Compare request fees and coverage before selecting.`:'Compare Chat coverage, request fees and local memory for the next job.',drawer:'Models' as const};}
function codingForecast(s:GameState,model:string){
 const sim=structuredClone(s),horizonSeconds=calendar(s).resetIn;
 sim.auto=false;sim.nextEvent=1e15;sim.coding.selected=s.coding.selected;sim.coding.approvedBudget=null;
 for(const role of ['coordinator','coder','tester'] as const)sim.coding.roles[role]={model};
 let completed=0,revenue=0,usageFees=0,planFees=0,tracked:string|null=null;
 for(let seconds=0;seconds<horizonSeconds;seconds+=.25){
  if(!sim.coding.active){const offered=codingQuote(sim);if(offered.available){const result=dispatch(sim,{type:'code-accept',budget:Math.ceil(offered.cost*1.5)+1});if(result.ok){tracked=(sim as GameState).coding.active?.id??null;usageFees+=(sim as GameState).coding.active?.spent??0;}}}
  const prior=sim.coding.active,trackedSpent=prior?.id===tracked?prior.spent:0;
  const plans=sim.access.plans.map(p=>({...p}));
  advance(sim,Math.min(.25,horizonSeconds-seconds));
  for(const old of plans){const next=sim.access.plans.find(p=>p.provider===old.provider);if(next&&next.expiresAt>old.expiresAt)planFees+=PLAN_FEES[next.tier];}
  if(prior?.id===tracked){usageFees+=Math.max(0,prior.spent-trackedSpent);if(prior.requests.every(r=>r.status==='done')){completed++;revenue+=prior.payout;tracked=null;}}
 }
 return {period:'remaining-week' as const,horizonSeconds,completed,revenue,usageFees,planFees,profit:revenue-usageFees-planFees};
}
export function benchmarkRows(s:GameState,ids=MODELS.map(m=>m.id)){return ids.map(id=>{const model=MODELS.find(m=>m.id===id)!,q=s.coding.selected?codingBenchmark(s,id):workComparison(s,id);const raw=s.coding.selected?null:weeklyProfit(s,q,id);const alreadyPaidCoverage=PROVIDERS.reduce((n,p)=>n+planMetrics(s,p).fee,0);const forecast=raw?{...raw,revenue:raw.revenue-raw.committedRevenue,profit:raw.profit-raw.committedRevenue,completed:raw.jobs,planFees:raw.fee}:codingForecast(s,id);return {model,quote:q,forecast,alreadyPaidCoverage};});}

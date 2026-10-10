import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,advance,quote,income,nextSale} from '../src/engine';
import {benchmarkRows,quoteTransport} from '../src/benchmark';
import {weeklyProfit} from '../src/access';
import {codingQuote,delegationPreview} from '../src/coding';
import {decodeSave,encodeSave} from '../src/save';

function ready(){const s=createGame();Object.assign(s,{cash:100000,runEarned:100000,totalSeconds:600,model:'gpt',nextEvent:1e15});return s;}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);}
function contentForecast(s:ReturnType<typeof ready>){const f=benchmarkRows(s,['gpt-mini'])[0].forecast;assert.ok('cashChange' in f);return f as typeof f&ReturnType<typeof weeklyProfit>;}

for(const kind of ['coding','content'] as const)test(`final ${kind} request leaves recovery on delivery and selected content works after reload`,()=>{
 const s=ready();if(kind==='coding'){dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});}else{s.business='ebooks';s.model='claude-sonnet';dispatch(s,{type:'generate'});}
 while(!s.coding.active!.requests.at(-1)!.status.includes('running'))advance(s,.25);
 dispatch(s,{type:'free-slop'});const saved=decodeSave(encodeSave(s,0),0);assert.ok(saved);advance(saved.state,60);
 assert.equal(saved.state.coding.active,null);assert.equal(saved.state.coding.recovery,false);
 const loaded=decodeSave(encodeSave(saved.state,0),0);assert.ok(loaded);dispatch(loaded.state,{type:'business',id:'ads'});dispatch(loaded.state,{type:'model',id:'gpt'});assert.equal(dispatch(loaded.state,{type:'generate'}).ok,true);assert.equal(loaded.state.jobs[0].business,'ads');assert.equal(loaded.state.jobs[0].model,'gpt');
});
test('recovery persists while a retained long-form pipeline still has pending work',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';s.workers=2;dispatch(s,{type:'generate'});advance(s,120);dispatch(s,{type:'generate'});dispatch(s,{type:'free-slop'});advance(s,45);assert.equal(s.coding.recovery,true);assert.ok(s.coding.active);assert.ok(s.coding.active.requests.some(r=>r.status==='pending'));
});
test('content benchmark reserves coding production lane and includes remaining committed fees',()=>{
 const s=ready();s.career.completed=8;s.career.byJob['bug-fixes']=8;s.calendarSeconds=740;dispatch(s,{type:'code-select',id:'repository-migrations'});assert.equal(dispatch(s,{type:'code-accept'}).ok,true);dispatch(s,{type:'business',id:'seo'});s.model='gpt-mini';const before=structuredClone(s),f=contentForecast(s),real=structuredClone(s);real.auto=true;advance(real,100);
 assert.equal(f.completed,0);assert.equal(f.revenue,0);assert.equal(f.usageFees,0);close(f.cashChange,real.cash-s.cash);close(f.cashChange,-67.2);assert.deepEqual(s,before);
});
test('retained long-form payout funds comparisons but stays out of comparison profit',()=>{
 const s=ready();s.business='ebooks';s.model='claude-sonnet';assert.equal(dispatch(s,{type:'generate'}).ok,true);s.cash=8;s.calendarSeconds=640;dispatch(s,{type:'business',id:'seo'});s.model='gpt-mini';const f=contentForecast(s),real=structuredClone(s);real.auto=true;advance(real,200);
 assert.equal(f.committedJobs,0);assert.equal(f.committedRevenue,0);assert.equal(f.completed,real.totalSlop);close(f.cashChange,real.cash-s.cash);
 s.cash=96;const funded=contentForecast(s),live=structuredClone(s);live.auto=true;advance(live,200);assert.equal(funded.committedJobs,1);close(funded.committedRevenue,1620);assert.equal(funded.completed,live.totalSlop-1);close(funded.revenue,funded.completed*quote(s,'gpt-mini','seo').payout);close(funded.profit,funded.revenue-funded.usageFees-funded.planFees);close(funded.cashChange,live.cash-s.cash);
});
test('retained Chat pipeline respects quota exhaustion and expiring coverage',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';dispatch(s,{type:'plan',provider:'Anthropic',tier:'plus'});s.access.mode='chat';s.access.usage['claude-sonnet']=319;assert.equal(dispatch(s,{type:'generate'}).ok,false);
 s.access.usage['claude-sonnet']=280;assert.equal(dispatch(s,{type:'generate'}).ok,true);s.access.plans[0].expiresAt=790;s.access.plans[0].renew=false;s.calendarSeconds=740;dispatch(s,{type:'business',id:'seo'});s.model='gpt-mini';const f=contentForecast(s),live=structuredClone(s);live.auto=true;advance(live,100);assert.equal(f.committedJobs,0);assert.equal(f.completed,live.totalSlop);close(f.cashChange,live.cash-s.cash);assert.equal(live.access.plans.length,0);assert.ok(live.coding.active?.requests.some(r=>r.status==='pending'));
});
test('long-form live income uses whole pinned economics across independent pipelines and legacy work',()=>{
 const s=ready();s.business='ebooks';s.model='claude-sonnet';s.workers=3;const q=quote(s,s.model,s.business);dispatch(s,{type:'generate'});close(q.payout,1620);close(q.cost,128);close(income(s).revenue,q.payout/q.duration);close(income(s).net,(1620-128)/q.duration);close(nextSale(s)!.remaining,q.duration);assert.ok(nextSale(s)!.remaining>4*s.jobs[0].remaining-.001);
 advance(s,20);dispatch(s,{type:'generate'});close(nextSale(s)!.remaining,q.duration-20);s.jobs.push({worker:2,model:'starter',business:'seo',duration:10,remaining:5,payout:7,cost:1,vram:0});s.model='gpt';s.business='ads';s.upgrades=['speed-0'];close(income(s).revenue,2*1620/q.duration+.7);close(income(s).cost,2*128/q.duration+.1);assert.equal(nextSale(s)!.remaining,5);
});
test('retained long-form live income stays visible while coding uses another worker',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';s.workers=2;const content=quote(s,s.model,s.business);dispatch(s,{type:'generate'});dispatch(s,{type:'code-select',id:'bug-fixes'});const coding=codingQuote(s);dispatch(s,{type:'code-accept'});assert.equal(s.jobs.length,2);close(income(s).revenue,content.payout/content.duration+coding.payout/coding.duration);close(income(s).cost,content.cost/content.duration+coding.cost/coding.duration);
});
test('coding transport derives uniform and explicit mixed request access',()=>{
 const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});assert.equal(quoteTransport(codingQuote(s)),'api');s.gpu='rack';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});dispatch(s,{type:'code-role',role:'coordinator',assignment:{model:'gpt',access:'chat'}});dispatch(s,{type:'code-role',role:'coder',assignment:{model:'gpt',access:'api'}});dispatch(s,{type:'code-role',role:'tester',assignment:{model:'local-14b',access:'local'}});const q=codingQuote(s);assert.equal(q.available,true);assert.equal(quoteTransport(q),'Mixed · coordinator: chat, coder: api, tester: local');s.access.mode='api';assert.equal(quoteTransport(q),'Mixed · coordinator: chat, coder: api, tester: local');
});
test('quota rollover renews committed Chat coverage before starting its next section on Monday',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';dispatch(s,{type:'plan',provider:'Anthropic',tier:'plus'});s.access.mode='chat';s.calendarSeconds=799.5;dispatch(s,{type:'generate'});s.access.usage['claude-sonnet']=320;dispatch(s,{type:'business',id:'seo'});s.model='gpt-mini';const before=structuredClone(s),f=contentForecast(s),live=structuredClone(s);live.auto=true;advance(live,40.5);assert.equal(f.completed,0);assert.equal(f.committedJobs,0);assert.equal(f.planFees,120);close(f.cashChange,-120);assert.equal(live.access.usage['claude-sonnet'],8);assert.equal(live.coding.active!.requests[1].status,'running');assert.deepEqual(s,before);
});
test('new compared long-form requests retain supplied frozen economics through all sections',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';s.calendarSeconds=800;const q={...quote(s,s.model,s.business),duration:8,cost:8,payout:100,net:11.5};const f=weeklyProfit(s,q,s.model);assert.equal(f.jobs,4);assert.equal(f.jobsStarted,5);close(f.usageFees,40);close(f.revenue,400); // Fifth starts at 32.25s and its last section at 38.25s; delivery is after Monday.
});
test('parallel long-form sections contribute one whole pipeline income',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';s.workers=3;s.claw=true;s.harness=['coordination'];dispatch(s,{type:'generate'});const opts={mode:'parallel' as const,helpers:[{model:'gpt',access:'api' as const},{model:'claude-sonnet',access:'api' as const}]};const preview=delegationPreview(s,opts);assert.equal(preview.available,true);dispatch(s,{type:'delegate',options:opts,budget:preview.totalJobCost});while(s.jobs.filter(j=>j.pipeline).length<2)advance(s,.25);const p=s.coding.active!,duration=[...new Set(p.requests.map(r=>r.group))].reduce((n,g)=>n+Math.max(...p.requests.filter(r=>r.group===g).map(r=>r.duration)),0),cost=p.requests.reduce((n,r)=>n+r.cost,0);close(income(s).revenue,p.payout/duration);close(income(s).cost,cost/duration);
});

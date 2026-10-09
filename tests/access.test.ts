import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {MODELS} from '../src/content';
import {createGame,advance,dispatch,quote} from '../src/engine';
import * as access from '../src/access';
import {decodeSave,encodeSave,clockStep} from '../src/save';
const ready=()=>Object.assign(createGame(),{cash:10000,runEarned:100000,gpu:'rack' as const});
test('21 models have deliberate capability metadata and stable IDs',()=>{
 assert.equal(MODELS.length,21);
 for(const m of MODELS){assert.ok(m.family);assert.ok(m.contextCapacity>0);assert.ok(m.codingScore>=0);assert.ok(m.suitableBusinesses.length);assert.equal(m.memoryGB,m.vram);}
 for(const [id,name,score] of [['gpt-mini','ChatGDP Pebble',35],['gpt','ChatGDP Boulder',65],['claude','Clawed Epic',90],['gemini','Gemoney Spark',30],['grok','Grok Bottom Rant',55],['deepseek','DeepShill Reason',60],['local-70b','Llamateur 70B',90]] as const){const m=MODELS.find(m=>m.id===id)!;assert.equal(m.name,name);assert.equal(m.codingScore,score);}
 assert.equal(MODELS.find(m=>m.id==='gpt-mini')!.delegation,false);
});
test('calendar is independent of lifetime and deterministic across chunks and funding',()=>{
 const a=ready(),b=structuredClone(a);a.totalSeconds=b.totalSeconds=8000;
 advance(a,841);for(let i=0;i<3364;i++)advance(b,.25);
 assert.equal(a.calendarSeconds,841);assert.equal(b.calendarSeconds,841);assert.equal(access.calendar(a).week,2);
 a.runEarned=1e9;dispatch(a,{type:'prestige'});assert.equal(a.calendarSeconds,841);assert.equal(a.totalSeconds,8841);
});
test('API unlocks at run earnings 350 independent of coding and persists',()=>{
 const s=createGame();assert.equal(access.apiAvailable(s),false);s.runEarned=350;assert.equal(access.apiAvailable(s),true);
 advance(s,.25);s.runEarned=1e9;dispatch(s,{type:'prestige'});assert.equal(access.apiAvailable(s),true);
});
test('chat quotes are pure, zero request bills, serial and canonical weighted quota',()=>{
 const s=ready();s.access.mode='chat';assert.equal(dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'}).ok,true);
 const before=structuredClone(s),q=quote(s,'gpt','reviews');assert.equal(q.cost,0);assert.equal(q.access,'chat');assert.equal(q.workload,4);assert.deepEqual(s,before);
 s.model='gpt';s.business='reviews';s.workers=4;assert.equal(dispatch(s,{type:'generate'}).ok,true);assert.equal(s.access.usage.gpt,4);
 const cash=s.cash;assert.equal(dispatch(s,{type:'generate'}).ok,false);assert.equal(s.cash,cash);assert.equal(s.access.usage.gpt,4);
 s.jobs=[];s.access.usage.gpt=319;assert.equal(quote(s,'gpt','reviews').available,false);
 s.access.mode='api';assert.equal(quote(s,'gpt','reviews').available,true);assert.ok(quote(s,'gpt','reviews').cost>0);
});
test('provider switch cancels previous renewal but paid coverage remains until its boundary',()=>{
 const s=ready();dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});advance(s,120);dispatch(s,{type:'plan',provider:'Anthropic',tier:'pro'});
 assert.equal(access.planMetrics(s,'OpenAI').tier,'plus');assert.equal(s.access.plans.filter(p=>p.renew).length,1);
 advance(s,720);assert.equal(access.planMetrics(s,'OpenAI').tier,'free');assert.equal(access.planMetrics(s,'Anthropic').tier,'pro');
});
test('same-provider upgrades prorate, downgrades queue, renewal cannot create debt',()=>{
 const s=ready();dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});advance(s,420);
 const cash=s.cash;dispatch(s,{type:'plan',provider:'OpenAI',tier:'pro'});assert.equal(cash-s.cash,240);
 s.access.usage.gpt=17;dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});assert.equal(access.planMetrics(s,'OpenAI').tier,'pro');assert.equal(s.access.usage.gpt,17);
 s.cash=0;advance(s,420);assert.equal(s.cash,0);assert.equal(access.planMetrics(s,'OpenAI').tier,'free');assert.equal(s.access.plans.some(p=>p.renew),false);assert.deepEqual(s.access.usage,{});
});
test('Monday reset and funding do not refund or reset current usage or approvals',()=>{
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'pro'});s.access.usage.gpt=50;advance(s,840);assert.equal(s.access.usage.gpt,undefined);
 assert.equal(dispatch(s,{type:'revision-adopt',id:'gpt-r2'}).ok,true);s.access.usage.gpt=30;s.runEarned=1e9;
 dispatch(s,{type:'prestige'});assert.equal(s.access.usage.gpt,30);assert.ok(s.access.approvedRevisions.includes('gpt-r2'));assert.ok(s.access.plans.every(p=>!p.renew));assert.equal(s.calendarSeconds,840);
});
test('only released explicitly approved revisions route, old selectable and running work pinned',()=>{
 const s=ready();s.model='gpt';s.business='ads';const old=quote(s,'gpt','ads');
 assert.equal(dispatch(s,{type:'revision-adopt',id:'gpt-r2'}).ok,false);advance(s,840);
 assert.equal(quote(s,'gpt','ads',{revision:'gpt-r2'}).available,false);dispatch(s,{type:'revision-adopt',id:'gpt-r2'});
 const revised=quote(s,'gpt','ads');assert.ok(revised.payout>old.payout);assert.ok(revised.cost>old.cost);
 dispatch(s,{type:'generate'});const job=structuredClone(s.jobs[0]);dispatch(s,{type:'revision-select',model:'gpt',id:'original'});s.access.mode='chat';s.upgrades.push('pay-0');
 assert.equal(s.jobs[0].revision,'gpt-r2');assert.deepEqual(s.jobs[0],job);advance(s,Math.ceil(job.remaining/.25)*.25);assert.equal(s.runEarned,100000+job.payout);
});
test('canUse is pure and startAccess atomically reserves workload plus fee once',()=>{
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});const before=structuredClone(s);
 const request={model:'gpt',workload:3,fee:0,access:'chat' as const,revision:'original'};
 assert.equal(access.canUse(s,request).ok,true);assert.deepEqual(s,before);assert.equal(access.startAccess(s,request).ok,true);assert.equal(s.access.usage.gpt,6);
 s.access.mode='api';const api={...request,access:'api' as const,fee:20};const cash=s.cash;access.startAccess(s,api);assert.equal(s.cash,cash-20);assert.equal(s.access.usage.gpt,6);
 s.cash=1;assert.equal(access.startAccess(s,api).ok,false);assert.equal(s.cash,1);
});
test('weekly profit includes full plan fees and remaining weighted quota cap',()=>{
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});const q=quote(s,'gpt','reviews');
 const estimate=access.weeklyProfit(s,q,'gpt');assert.equal(estimate.fee,120);assert.ok(estimate.jobs<=80);assert.equal(estimate.profit,estimate.jobs*(q.payout-q.cost)-120);
});
test('literal f8eeb1a running job migrates without rewriting legacy fields',()=>{
 const raw=readFileSync(new URL('./fixtures/f8eeb1a-running.json',import.meta.url),'utf8'),old=JSON.parse(raw).state;
 const loaded=decodeSave(raw,1720000000000)!;assert.ok(loaded);assert.equal(loaded.state.calendarSeconds,0);assert.equal(loaded.state.totalSeconds,old.totalSeconds);assert.equal(loaded.state.access.apiUnlocked,true);assert.deepEqual(loaded.state.jobs,old.jobs);
 advance(loaded.state,Math.ceil(old.jobs[0].remaining/.25)*.25);assert.equal(loaded.state.cash,old.cash+old.jobs[0].payout);assert.equal(loaded.state.expenses,old.expenses);
});
test('new save fields reject malformed quota, plans, revisions, snapshots and clocks',()=>{
 const s=ready();const bad=[{calendarSeconds:-1},{access:{...s.access,usage:{gpt:-1}}},{access:{...s.access,usage:{bogus:1}}},{access:{...s.access,approvedRevisions:['gpt-r2']}},{access:{...s.access,selectedRevisions:{gpt:'gpt-r2'}}},{access:{...s.access,plans:[{provider:'bogus',tier:'pro',expiresAt:840,renew:true}]}},{access:{...s.access,apiUnlocked:'yes'}}];
 for(const fields of bad)assert.equal(decodeSave(encodeSave({...s,...fields} as any,100000),100000),null,JSON.stringify(fields));
 assert.ok(decodeSave(encodeSave(s,100000),100000));const step=clockStep(100000,100000+1e9);assert.equal(step.seconds,7200);assert.equal(clockStep(step.next,100000).seconds,0);
});
test('Base and visual cannot delegate; API Plus and local text can without quotas',()=>{
 const s=ready();
 assert.equal(access.canUse(s,{model:'gpt-mini',access:'api',revision:'original',workload:1,fee:1,delegation:true}).ok,false);
 assert.equal(access.canUse(s,{model:'midjourney',access:'api',revision:'original',workload:1,fee:1,delegation:true}).ok,false);
 assert.equal(access.canUse(s,{model:'midjourney',access:'chat',revision:'original',workload:1,fee:0}).ok,false);
 assert.equal(access.canUse(s,{model:'gpt',access:'api',revision:'original',workload:10000,fee:1,delegation:true}).ok,true);
 assert.equal(access.canUse(s,{model:'local-14b',access:'local',revision:'original',workload:10000,fee:1,delegation:true}).ok,true);
});
test('unaffordable starts never consume quota and plan changes never reset usage',()=>{
 const s=ready();s.access.mode='chat';s.access.usage.gpt=13;s.cash=0;const before=structuredClone(s);
 assert.equal(dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'}).ok,false);assert.deepEqual(s.access,before.access);
 s.cash=1000;dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});assert.equal(s.access.usage.gpt,13);
 dispatch(s,{type:'plan',provider:'Anthropic',tier:'plus'});dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});assert.equal(s.access.usage.gpt,13);
});
test('previewJobs uses the same serial, quota, cash and VRAM reservations as dispatch',async()=>{
 const {previewJobs}=await import('../src/engine');
 for(const mode of ['chat','api'] as const){const s=ready();s.access.mode=mode;s.model='gpt';s.business='reviews';s.workers=4;s.claw=true;dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.access.usage.gpt=316;
  const before=structuredClone(s),preview=previewJobs(s),actual=structuredClone(s);for(let i=0;i<4;i++)if(!dispatch(actual,{type:'generate'}).ok)break;
  assert.deepEqual(preview,actual.jobs);assert.deepEqual(s,before);assert.equal(preview.length,mode==='chat'?1:4);
 }
});
test('Week4 releases preserve older approved revisions and local revision fee remains electricity',()=>{
 const s=ready();advance(s,840);dispatch(s,{type:'revision-adopt',id:'gpt-r2'});advance(s,1680);
 for(const id of ['gpt-boardroom-r4','claude-r4','local-32b-r4'])assert.equal(dispatch(s,{type:'revision-adopt',id}).ok,true);
 assert.equal(access.revisionMetrics(s,'gpt','gpt-r2').available,true);const old=quote(s,'local-32b','ebooks',{revision:'original'}),fresh=quote(s,'local-32b','ebooks');assert.equal(fresh.access,'local');assert.ok(fresh.duration<old.duration);assert.ok(fresh.cost<old.cost);
});
test('valid new snapshots round trip and every malformed optional job field rejects',()=>{
 const s=ready();s.model='gpt';dispatch(s,{type:'generate'});assert.deepEqual(decodeSave(encodeSave(s,100000),100000)!.state,s);
 for(const fields of [{version:2},{access:'bogus'},{revision:'unknown'},{snapshot:{speed:1,payout:1,fee:1,workload:-1}},{access:'chat'}]){const bad=structuredClone(s);Object.assign(bad.jobs[0],fields);assert.equal(decodeSave(encodeSave(bad,100000),100000),null);}
});
test('paid renewals and calendar have identical active and capped offline simulation',()=>{
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.model='gpt';s.business='reviews';s.auto=true;
 const loaded=decodeSave(encodeSave(s,100000),100000+8e6)!;advance(loaded.state,loaded.offlineSeconds);advance(s,7200);assert.deepEqual(loaded.state,s);assert.equal(s.access.usageWeek,9);assert.ok(s.cash>=0);
});
test('API requires 350 earnings and startAccess cannot bypass serial chat using preview flags',()=>{
 const fresh=createGame();assert.equal(access.canUse(fresh,{model:'starter',access:'api',workload:1,fee:0}).ok,false);
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.model='gpt';dispatch(s,{type:'generate'});const before=structuredClone(s);
 assert.equal(access.startAccess(s,{model:'gpt',access:'chat',workload:1,fee:0,ignoreBusy:true}).ok,false);assert.deepEqual(s,before);
 assert.equal(access.revisionMetrics(s,'gpt','original').released,true);
});
test('local capability tiers expose Base Plus Plus Pro; Base has independent workers but cannot delegate',()=>{
 for(const [id,tier] of [['local-7b','base'],['local-14b','plus'],['local-32b','plus'],['local-70b','pro']] as const)assert.equal(MODELS.find(m=>m.id===id)!.capabilityTier,tier);
 const s=ready();assert.equal(access.canUse(s,{model:'local-7b',access:'local',workload:1,fee:1,delegation:true}).ok,false);
 s.model='gpt-mini';s.workers=4;s.claw=true;for(let i=0;i<4;i++)assert.equal(dispatch(s,{type:'generate'}).ok,true);assert.equal(s.jobs.length,4);
});
test('weekly forecasts identify remaining-week horizon and provider coverage includes only text plan tiers',()=>{
 const s=ready();s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});advance(s,420);
 const plan=access.planMetrics(s,'OpenAI');assert.deepEqual(plan.coveredTiers,['base','plus']);assert.ok(plan.coveredModels.includes('gpt'));assert.ok(!plan.coveredModels.includes('sora'));assert.ok(!plan.coveredModels.includes('gpt-boardroom'));
 const estimate=access.weeklyProfit(s,quote(s,'gpt','reviews'),'gpt');assert.equal(estimate.period,'remaining-week');assert.equal(estimate.horizonSeconds,420);assert.ok(estimate.jobs<=Math.floor(420/quote(s,'gpt','reviews').duration));
});

test('cancelled Plus expiry caps constant-quote Chat throughput and charges no future subscription',()=>{
 const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt';s.business='seo';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.access.plans[0].expiresAt=60;dispatch(s,{type:'plan-cancel'});
 const before=structuredClone(s),q=quote(s,'gpt','seo'),estimate=access.weeklyProfit(s,q,'gpt'),actual=structuredClone(s);actual.auto=true;advance(actual,access.calendar(s).resetIn);
 assert.equal(estimate.jobs,9);assert.equal(estimate.jobs,actual.slop-s.slop);assert.equal(estimate.fee,0);assert.ok(Math.abs(estimate.profit-(actual.cash-s.cash))<1e-7);assert.deepEqual(s,before);
});
test('forecast follows queued tier downgrades and affordable actual renewal charges',()=>{
 for(const tier of ['plus','pro'] as const){const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt-boardroom';s.business='seo';dispatch(s,{type:'plan',provider:'OpenAI',tier:'pro'});s.access.plans[0].expiresAt=60;
 if(tier==='plus')dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});
 const actual=structuredClone(s);actual.auto=true;const estimate=access.weeklyProfit(s,quote(s,s.model,s.business),s.model);advance(actual,access.calendar(s).resetIn);
 assert.equal(estimate.jobs,actual.slop-s.slop);assert.equal(estimate.fee,tier==='plus'?120:600);assert.ok(Math.abs(estimate.profit-(actual.cash-s.cash))<1e-7);}
});
test('forecast stops unaffordable renewals and retains canonical quota across downgrade',()=>{
 const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt';s.business='seo';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.access.plans[0].expiresAt=60;s.cash=0;
 const actual=structuredClone(s);actual.auto=true;const estimate=access.weeklyProfit(s,quote(s,s.model,s.business),s.model);advance(actual,access.calendar(s).resetIn);
 assert.equal(estimate.jobs,actual.slop);assert.equal(estimate.fee,0);assert.ok(Math.abs(estimate.profit-(actual.cash-s.cash))<1e-7);
 const base=ready();base.nextEvent=1e9;base.access.mode='chat';base.model='gpt-mini';dispatch(base,{type:'plan',provider:'OpenAI',tier:'plus'});base.access.plans[0].expiresAt=60;base.access.usage['gpt-mini']=79;dispatch(base,{type:'plan',provider:'OpenAI',tier:'free'});
 const projected=access.weeklyProfit(base,quote(base,base.model,'seo'),base.model),live=structuredClone(base);live.auto=true;advance(live,access.calendar(base).resetIn);assert.equal(projected.jobs,live.slop);assert.ok(projected.jobs<20);
});
test('new saves reject local and visual models marked Chat and duplicate serial Chat requests',()=>{
 for(const model of ['local-7b','midjourney','sora']){const s=ready();s.jobs=[{worker:0,model,business:'seo',remaining:1,duration:2,payout:1,cost:0,vram:0,version:1,revision:'original',access:'chat',snapshot:{speed:1,payout:1,fee:0,workload:1}}];assert.equal(decodeSave(encodeSave(s,100000),100000),null,model);}
 const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});dispatch(s,{type:'generate'});s.workers=2;s.jobs.push({...structuredClone(s.jobs[0]),worker:1});assert.equal(decodeSave(encodeSave(s,100000),100000),null);
});
test('already-committed serial Chat survives plan expiry and save reload',()=>{
 const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt';s.business='ads';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.access.plans[0].expiresAt=1;dispatch(s,{type:'plan-cancel'});dispatch(s,{type:'generate'});advance(s,2);
 assert.equal(s.access.plans.length,0);assert.equal(s.jobs.length,1);const decoded=decodeSave(encodeSave(s,100000),100000);assert.ok(decoded);assert.deepEqual(decoded.state.jobs,s.jobs);
});
test('constant-quote API forecast bills actual starts through the Monday boundary',()=>{
 const s=ready();s.nextEvent=1e9;s.access.mode='api';s.model='gpt';s.business='seo';s.workers=1;
 s.jobs=[{worker:0,model:'gpt',business:'seo',remaining:840,duration:840,payout:37,cost:4,vram:0,access:'api'}];
 const q=quote(s,s.model,s.business),estimate=access.weeklyProfit(s,q,s.model),actual=structuredClone(s);actual.auto=true;advance(actual,access.calendar(s).resetIn);
 assert.equal(estimate.jobs+estimate.committedJobs,actual.slop);assert.ok(Math.abs(estimate.usageFees-(actual.expenses-s.expenses))<1e-7);assert.ok(Math.abs(estimate.profit-(actual.cash-s.cash))<1e-7);
});
test('constant-quote forecast respects committed Chat occupancy and reports its pinned revenue',()=>{
 const s=ready();s.nextEvent=1e9;s.access.mode='chat';s.model='gpt';s.business='reviews';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});s.access.plans[0].expiresAt=1;dispatch(s,{type:'plan-cancel'});dispatch(s,{type:'generate'});
 const before=structuredClone(s),estimate=access.weeklyProfit(s,quote(s,s.model,s.business),s.model);assert.equal(estimate.jobs,0);assert.equal(estimate.committedJobs,1);assert.equal(estimate.committedRevenue,s.jobs[0].payout);assert.equal(estimate.profit,s.jobs[0].payout);assert.deepEqual(s,before);
});
test('new transport snapshots reject cloud API memory and local access with zero memory',()=>{
 for(const [model,accessMode,vram] of [['gpt','api',1],['local-7b','local',0]] as const){const s=ready();s.jobs=[{worker:0,model,business:'seo',remaining:1,duration:2,payout:1,cost:0,vram,version:1,revision:'original',access:accessMode,snapshot:{speed:1,payout:1,fee:0,workload:1}}];assert.equal(decodeSave(encodeSave(s,100000),100000),null);}
});

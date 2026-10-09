import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,advance} from '../src/engine';
import {decodeSave,encodeSave} from '../src/save';
import * as coding from '../src/coding';

function ready(){const s=createGame();s.runEarned=100000;s.totalSeconds=360;s.cash=100000;s.model='gpt-mini';s.nextEvent=1e12;return s;}
test('coding requires lifetime time and then delivers a deterministic paid pipeline',()=>{
 const s=ready();s.totalSeconds=359;
 assert.equal(dispatch(s,{type:'code-select',id:'bug-fixes'} as any).ok,false);
 s.totalSeconds=360;
 assert.equal(dispatch(s,{type:'code-select',id:'bug-fixes'} as any).ok,true);
 assert.equal(dispatch(s,{type:'code-accept'} as any).ok,true);
 const old=s.runEarned;advance(s,600);
 assert.ok(s.runEarned>old);assert.equal((s as any).career.completed,1);
 assert.equal((s as any).coding.active,null);
});

test('quoted repairs, fees and duration match one delivered pipeline',()=>{
 const s=ready();s.model='gemini';dispatch(s,{type:'code-select',id:'bug-fixes'});
 const q=coding.codingQuote(s);assert.equal(q.repairs,1);const fees=s.expenses,cash=s.cash;
 dispatch(s,{type:'code-accept'});advance(s,q.duration-.25);assert.equal(s.career.completed,0);advance(s,.25);
 assert.equal(s.career.completed,1);assert.ok(Math.abs(s.expenses-fees-q.cost)<1e-8);assert.ok(Math.abs(s.cash-cash-q.payout+q.cost)<1e-8);
 assert.equal(s.coding.lastReport!.repairs,1);
});
test('budget stops unsent requests and explicit increase resumes without refunding spent work',()=>{
 const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept',budget:.7});advance(s,100);
 assert.equal(s.career.completed,0);assert.match(s.coding.active!.pause,/budget/i);const spent=s.expenses,run=structuredClone(s.coding.active!.requests.filter(r=>r.status==='done'));
 assert.equal(dispatch(s,{type:'code-budget',budget:100}).ok,true);advance(s,200);
 assert.equal(s.career.completed,1);assert.ok(s.expenses>=spent);assert.ok(run.length>0);
});
test('Chat quota pause can recover pending requests to API with pinned revisions',()=>{
 const s=ready();s.model='gemini';s.access.mode='chat';s.access.usage.gemini=79;
 dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});advance(s,100);
 assert.match(s.coding.active!.pause,/quota/i);const done=structuredClone(s.coding.active!.requests.filter(r=>r.status==='done'));
 assert.equal(dispatch(s,{type:'code-recover',access:'api'}).ok,true);
 assert.deepEqual(s.coding.active!.requests.filter(r=>r.status==='done'),done);
 assert.match(s.coding.active!.pause,/budget/i);dispatch(s,{type:'code-budget',budget:100});advance(s,200);assert.equal(s.career.completed,1);
});
test('free slop recovers cash while preserving paused operation and sunk fees',()=>{
 const s=ready();s.cash=.7;dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});advance(s,100);
 const pipeline=s.coding.active!.id,spent=s.expenses;assert.equal(dispatch(s,{type:'free-slop'}).ok,true);s.auto=true;advance(s,40);
 assert.ok(s.cash>7);assert.equal(s.coding.active!.id,pipeline);assert.equal(s.expenses,spent);
});
test('unavailable assignments reject with reason and context gates larger repositories',()=>{
 const s=ready();s.career.completed=8;s.career.byJob['bug-fixes']=8;
 assert.equal(dispatch(s,{type:'code-role',role:'coder',assignment:{model:'sora',access:'api'}}).ok,false);
 s.model='local-32b';s.gpu='big';s.claw=true;dispatch(s,{type:'code-select',id:'internal-tools'});
 assert.match(coding.codingQuote(s).reason,/context/);s.harness=['context'];assert.equal(coding.codingQuote(s).available,true);
});
test('accepted pipeline snapshots survive role/revision/equipment changes',()=>{
 const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});
 const requests=structuredClone(s.coding.active!.requests);dispatch(s,{type:'code-role',role:'coder',assignment:{model:'claude',access:'api'}});s.upgrades=['speed-0'];s.heat=98;
 assert.deepEqual(s.coding.active!.requests,requests);assert.ok(decodeSave(encodeSave(s,0),0));
});
test('decoder rejects malformed pipeline references, budgets and career progress',()=>{
 const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});
 for(const corrupt of [(x:any)=>x.career.completed=-1,(x:any)=>x.coding.active.budget=-1,(x:any)=>x.jobs[0].request=900,(x:any)=>x.coding.active.requests[0].cost=-1]){const x=structuredClone(s);corrupt(x);assert.equal(decodeSave(encodeSave(x,0),0),null);}
});
test('reviewers reduce repairs and testers change deterministic test and repair time',()=>{
 const s=ready();s.model='gemini';dispatch(s,{type:'code-select',id:'bug-fixes'});const slow=coding.codingQuote(s);
 dispatch(s,{type:'code-role',role:'tester',assignment:{model:'claude',access:'api'}});const fast=coding.codingQuote(s);
 assert.ok(fast.duration<slow.duration);assert.equal(fast.repairs,1);
 assert.equal(dispatch(s,{type:'code-role',role:'reviewer',assignment:{model:'claude',access:'api'}}).ok,false);s.claw=true;s.harness=['supervisor'];dispatch(s,{type:'code-role',role:'reviewer',assignment:{model:'claude',access:'api'}});assert.equal(coding.codingQuote(s).repairs,0);
});
test('memory reuses completed briefs, cache saves scaffolding, retries use stronger fix models',()=>{
 const s=ready();s.claw=true;s.model='gemini';s.career.completed=1;s.career.byJob['bug-fixes']=1;dispatch(s,{type:'code-select',id:'bug-fixes'});const base=coding.codingQuote(s);
 s.harness=['memory'];const memory=coding.codingQuote(s);assert.ok(memory.requests[0].duration<base.requests[0].duration);assert.ok(memory.payout>base.payout);
 s.harness=['cache'];const cache=coding.codingQuote(s);assert.ok(cache.cost<base.cost);assert.ok(cache.requests[1].duration<base.requests[1].duration);
 s.harness=['retries'];dispatch(s,{type:'code-role',role:'tester',assignment:{model:'claude',access:'api'}});assert.equal(coding.codingQuote(s).requests.find(r=>r.stage==='Fix')!.model,'claude');
});
test('supervisor enables optional review, routing selects per role, fallback accepts runnable text',()=>{
 const s=ready();s.claw=true;s.model='gemini';s.harness=['supervisor'];dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-role',role:'reviewer',assignment:{model:'claude',access:'api'}});
 assert.equal(coding.codingQuote(s).repairs,0);dispatch(s,{type:'code-role',role:'reviewer',assignment:null});const q=coding.codingQuote(s);assert.equal(q.repairs,1);assert.ok(!q.requests.some(r=>r.stage==='Review'));
 s.harness=['routing'];s.routing='cheapest';assert.notEqual(coding.codingQuote(s).requests[1].model,'gemini');
 s.coding.roles.reviewer=null;s.harness=['fallback'];s.routing='manual';s.runEarned=350;s.model='claude';assert.equal(coding.codingQuote(s).available,true);assert.notEqual(coding.codingQuote(s).requests[1].model,'claude');
});
test('coding shares global hardware economics while content workflows stay business specific',()=>{
 const s=ready();s.model='local-7b';s.gpu='used';s.harness=['quantization'];dispatch(s,{type:'code-select',id:'bug-fixes'});
 const quant=coding.codingQuote(s);assert.equal(quant.available,true);assert.equal(quant.vram,3);s.gpu='mid';const full=coding.codingQuote(s);assert.ok(quant.payout<full.payout);
 s.heat=98;assert.ok(coding.codingQuote(s).duration>full.duration);s.heat=25;s.upgrades=['workflow-seo'];assert.deepEqual(coding.codingQuote(s),full);
 s.upgrades=['speed-0'];assert.ok(coding.codingQuote(s).duration<full.duration);
});

test('all coding contracts exclude content fit and named business workflow bonuses',async()=>{
 const {MODELS,WORKFLOWS}=await import('../src/content');
 const s=ready();s.career.completed=8;s.career.byJob['bug-fixes']=8;s.model='claude';
 for(const job of coding.CODING_JOBS){
  dispatch(s,{type:'code-select',id:job.id});const baseline=coding.codingQuote(s);
  s.upgrades=WORKFLOWS.map(w=>w.id);assert.deepEqual(coding.codingQuote(s),baseline,job.id);s.upgrades=[];
  const model=MODELS.find(m=>m.id===s.model)!,fit=model.fit;
  try {model.fit={seo:{speed:100,payout:100},reviews:{speed:100,payout:100},ads:{speed:100,payout:100},ebooks:{speed:100,payout:100},decks:{speed:100,payout:100},video:{speed:100,payout:100}};assert.deepEqual(coding.codingQuote(s),baseline,job.id);}
  finally {model.fit=fit;}
 }
});
test('one coding lane respects occupied content workers and never mutates sent snapshots',()=>{
 const s=ready();dispatch(s,{type:'generate'});const old=structuredClone(s.jobs[0]);dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});
 assert.deepEqual(s.jobs,[old]);assert.match(s.coding.active!.pause,/worker/);advance(s,200);assert.equal(s.career.completed,1);assert.equal(s.slop,2);
});
test('auto repeats only selected approved work and reports actual repairs and fees',()=>{
 const s=ready();s.claw=true;s.auto=true;dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});const roles=structuredClone(s.coding.roles);advance(s,300);
 assert.ok(s.career.completed>=2);assert.deepEqual(s.coding.roles,roles);assert.equal(s.coding.selected,'bug-fixes');assert.ok(s.coding.lastReport!.fees>0);assert.equal(s.business,'seo');
});

test('automatic coding never accepts selection alone or repeats without SlopClaw',()=>{
 for(const claw of [false,true]){
  const s=ready();s.auto=true;s.claw=claw;dispatch(s,{type:'code-select',id:'bug-fixes'});const cash=s.cash;
  advance(s,1);assert.equal(s.coding.active,null);assert.equal(s.cash,cash);assert.equal(s.expenses,0);
  dispatch(s,{type:'code-accept'});assert.notEqual(s.coding.approvedBudget,null);advance(s,300);
  if(claw)assert.ok(s.career.completed>1);else {assert.equal(s.career.completed,1);assert.equal(s.coding.active,null);}
 }
});

test('a retained reviewer assignment is inactive when Supervisor is unavailable',()=>{
 const s=ready();s.claw=true;s.harness=['supervisor'];s.model='gemini';dispatch(s,{type:'code-select',id:'bug-fixes'});
 assert.equal(dispatch(s,{type:'code-role',role:'reviewer',assignment:{model:'claude',access:'api'}}).ok,true);
 assert.ok(coding.codingQuote(s).requests.some(r=>r.stage==='Review'));s.harness=[];
 const q=coding.codingQuote(s);assert.equal(q.repairs,1);assert.ok(!q.requests.some(r=>r.stage==='Review'));
});
test('assistant makes one actionable contextual recommendation with an expected benefit',()=>{
 const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept',budget:0});
 const advice=(coding as any).assistantRecommendation?.(s);assert.equal(advice?.action.type,'code-budget');assert.match(advice.benefit,/\$/);assert.equal(s.coding.active!.spent,0);
});
test('committed finance stays stable as work completes and next-job upgrades remain measurable',async()=>{
 const {projectedIncome}=await import('../src/presentation');const s=ready();dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});
 const q=coding.productionQuote(s),next=projectedIncome(s).net;advance(s,q.duration-1);assert.equal(coding.productionQuote(s).net,q.net);assert.ok(coding.remainingQuote(s)!.duration<q.duration);
 s.upgrades=['speed-0'];assert.ok(projectedIncome(s).net>next);assert.equal(coding.productionQuote(s).net,q.net);
});
test('local coding electricity follows actual test duration and cash pauses never create debt',()=>{
 const s=ready();s.gpu='mid';s.model='local-7b';dispatch(s,{type:'code-select',id:'bug-fixes'});const q=coding.codingQuote(s),build=q.requests.find(r=>r.stage==='Build')!,test=q.requests.find(r=>r.stage==='Test')!;
 assert.ok(Math.abs(build.cost/build.duration-test.cost/test.duration)<.001);
 s.cash=.01;dispatch(s,{type:'code-accept'});advance(s,100);assert.equal(s.cash,.01);assert.match(s.coding.active!.pause,/afford/i);assert.equal(s.expenses,0);
});
test('coding acceptance queues behind old long content reservations and save remains coherent',()=>{
 const s=ready();s.model='claude-sonnet';s.business='ebooks';dispatch(s,{type:'generate'});const old=structuredClone(s.jobs[0]);
 dispatch(s,{type:'code-select',id:'bug-fixes'});assert.equal(dispatch(s,{type:'code-accept'}).ok,true);assert.equal(s.coding.active!.kind,'coding');assert.deepEqual(s.jobs,[old]);assert.equal(s.coding.content.length,1);assert.ok(decodeSave(encodeSave(s,0),0));
});
test('paid Chat coverage expires between requests and explicit API recovery preserves accepted versions',()=>{
 const s=ready();s.model='gpt';s.access.mode='chat';dispatch(s,{type:'plan',provider:'OpenAI',tier:'plus'});dispatch(s,{type:'plan-cancel'});s.access.plans[0].expiresAt=1;
 dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});const first=structuredClone(s.jobs[0]);advance(s,20);
 assert.equal(s.career.completed,0);assert.match(s.coding.active!.pause,/plan/);assert.equal(s.coding.active!.requests[0].revision,first.revision);assert.equal(s.coding.active!.requests[0].status,'done');
 dispatch(s,{type:'code-recover',access:'api'});dispatch(s,{type:'code-budget',budget:100});advance(s,100);assert.equal(s.career.completed,1);
});
test('Chat is globally serial across coding and ordinary content with quota consumed once',()=>{
 const s=ready();s.workers=4;s.claw=true;s.model='gemini';s.access.mode='chat';dispatch(s,{type:'generate'});const before=s.access.usage.gemini;
 dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});assert.equal(s.jobs.length,1);assert.equal(s.access.usage.gemini,before);advance(s,1);assert.equal(s.jobs.length,1);
 advance(s,200);assert.equal(s.career.completed,1);assert.ok(s.access.usage.gemini>before);assert.ok(s.access.usage.gemini<10);
});
test('offline pipeline advancement matches active steps including pending budget stops',()=>{
 const s=ready();s.auto=true;dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept',budget:2});const active=structuredClone(s),loaded=decodeSave(encodeSave(s,1000),181000)!;
 advance(loaded.state,loaded.offlineSeconds);for(let i=0;i<720;i++)advance(active,.25);assert.deepEqual(loaded.state,active);
});
test('career gates harder contracts and survives funding while active operation resets',()=>{
 const s=ready();assert.equal(dispatch(s,{type:'code-select',id:'small-scripts'} as any).ok,false);
 dispatch(s,{type:'code-select',id:'bug-fixes'} as any);dispatch(s,{type:'code-accept'} as any);advance(s,600);
 assert.equal(dispatch(s,{type:'code-select',id:'small-scripts'} as any).ok,true);
 s.runEarned=1e9;assert.equal(dispatch(s,{type:'prestige'}).ok,true);
 assert.equal((s as any).career.completed,1);assert.equal((s as any).coding.active,null);
});
test('missing coding fields in v1 save migrate without rewriting existing jobs',()=>{
 const s=ready();dispatch(s,{type:'generate'});const jobs=structuredClone(s.jobs);
 delete (s as any).coding;delete (s as any).career;
 const restored=decodeSave(encodeSave(s,0),0)!.state;
 assert.deepEqual(restored.jobs,jobs);assert.equal((restored as any).career.completed,0);
 assert.equal((restored as any).coding.active,null);
});

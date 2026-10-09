import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,quote,advance,income} from '../src/engine';
import {productionStatus,projectedIncome,suggestedUpgrades,modelPreview,upgradePreview} from '../src/presentation';
import * as presentation from '../src/presentation';

test('purchase recommendations expose relevant workflow savings and a timed goal without mutation',()=>{
 const s=createGame();Object.assign(s,{cash:1000,runEarned:100000,model:'gpt',business:'reviews',auto:true});
 const before=structuredClone(s),api=presentation;
 assert.equal(typeof api.purchaseCandidates,'function');
 const candidates=api.purchaseCandidates(s);
 assert.ok(candidates.some(c=>c.id==='workflow-reviews'&&c.gain>0&&c.action.type==='workflow'));
 assert.ok(!candidates.some(c=>c.action.type==='workflow'&&c.id!=='workflow-reviews'));
 assert.deepEqual(s,before);
 s.cash=1;const goal=api.nextPurchaseGoal(s);
 assert.ok(goal&&goal.candidate.cost>s.cash);assert.equal(goal.waitSeconds,null);
 s.model='starter';s.business='seo';assert.ok((api.nextPurchaseGoal(s)?.waitSeconds??0)>0);
});

test('GPU candidates include newly enabled local models and workers require actual funded capacity',()=>{
 const s=createGame();Object.assign(s,{cash:2000,runEarned:100000,model:'starter',business:'seo'});
 const api=presentation;assert.equal(typeof api.purchaseCandidates,'function');
 assert.ok(api.purchaseCandidates(s).some(c=>c.action.type==='gpu'&&c.gain>0&&c.expectedBenefit));
 Object.assign(s,{cash:200000,gpu:'mid',model:'local-7b',claw:true,workers:1});
 assert.ok(!api.purchaseCandidates(s).some(c=>c.action.type==='worker'),'A second worker alone cannot fit another 6 GB job');
});

test('hardware recommendations cannot take credit for an already available cloud switch',()=>{
 const s=createGame();Object.assign(s,{cash:1000000,runEarned:1000000});
 const candidates=presentation.purchaseCandidates(s);
 assert.ok(!candidates.some(c=>c.id==='used'),'A 4 GB card cannot enable a 6 GB local model by itself');
 assert.ok(!candidates.some(c=>c.id==='quantization'),'Quantization without any rig cannot enable a local model');
});

test('purchase goal ETAs require productive automation and manual starts lead to automation',()=>{
 const s=createGame();advance(s,60);assert.equal(s.cash,15);
 const manual=presentation.nextPurchaseGoal(s);
 assert.equal(manual?.candidate.action.type,'auto');assert.equal(manual?.candidate.cost,25);assert.equal(manual?.waitSeconds,null);
 assert.ok(!presentation.suggestedPurchases(s).some(c=>c.action.type==='auto'),'The production button already offers automation');
 s.auto=true;
 const automatic=presentation.nextPurchaseGoal(s);assert.ok(automatic&&automatic.waitSeconds!==null&&Number.isFinite(automatic.waitSeconds)&&automatic.waitSeconds>0);
 Object.assign(s,{model:'claude',cash:0,runEarned:100000});
 assert.equal(productionStatus(s).kind,'paused');assert.equal(presentation.nextPurchaseGoal(s)?.waitSeconds,null);
});

test('a meaningful affordable purchase is ready before a distant hardware savings goal',()=>{
 const s=createGame();Object.assign(s,{cash:14000,runEarned:100000,auto:true});
 const suggested=presentation.suggestedPurchases(s),goal=presentation.nextPurchaseGoal(s);
 assert.ok(goal&&goal.candidate.cost<=s.cash&&goal.candidate.gain>0);
 assert.equal(goal.waitSeconds,0);assert.equal(goal.candidate.id,suggested.find(c=>c.cost<=s.cash&&!c.reserveReason)?.id);
});

test('production distinguishes manual readiness, running jobs and automatic production',()=>{
 const s=createGame();assert.equal(productionStatus(s).kind,'manual-ready');
 dispatch(s,{type:'generate'});assert.equal(productionStatus(s).kind,'manual-running');
 s.auto=true;assert.equal(productionStatus(s).kind,'automatic-running');
});
test('an exhausted cloud setup explains recovery without overwriting its selected model',()=>{
 const s=createGame();s.auto=true;s.runEarned=2000;s.model='claude';s.cash=0;
 const result=productionStatus(s);assert.equal(result.kind,'paused');assert.equal(result.recoverable,true);
 assert.match(result.reason,/afford|request/i);assert.equal(s.model,'claude');
});
test('partial local production reports VRAM waiting rather than being broken',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:10000,gpu:'mid',model:'local-7b',workers:2,auto:true});
 dispatch(s,{type:'generate'});const result=productionStatus(s);
 assert.equal(result.kind,'waiting-for-vram');assert.equal(result.recoverable,false);
});
test('projected income ignores committed jobs and limits local worker capacity',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:10000,gpu:'mid',model:'local-7b',workers:4,auto:true});
 dispatch(s,{type:'generate'});s.jobs[0].payout=99999;
 const rate=projectedIncome(s),q=quote(s,'local-7b','seo');
 assert.equal(rate.slots,1);assert.ok(Math.abs(rate.net-q.net)<1e-12);assert.equal(rate.revenue,q.payout/q.duration);
});
test('projected local-first routing fills remaining workers with cloud jobs',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:10000,gpu:'mid',workers:4,claw:true,harness:['routing'],routing:'local',auto:true});
 const actual=structuredClone(s);advance(actual,.25);
 const projected=projectedIncome(s),running=income(actual);
 assert.equal(projected.slots,4);assert.equal(projected.model,actual.jobs[0].model);
 assert.equal(projected.revenue,running.revenue);assert.equal(projected.cost,running.cost);assert.equal(projected.net,running.net);
 assert.equal(actual.jobs[0].vram,6);assert.ok(actual.jobs.slice(1).every(j=>j.vram===0));
});
test('projected margin routing reconsiders models after each worker reserves VRAM',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:10000,gpu:'good',workers:4,claw:true,harness:['routing'],routing:'margin',auto:true});
 const actual=structuredClone(s);advance(actual,.25);
 const projected=projectedIncome(s),running=income(actual);
 assert.equal(projected.slots,actual.jobs.length);assert.equal(projected.net,running.net);
 assert.ok(actual.jobs.some(j=>j.vram>0));assert.ok(actual.jobs.some(j=>j.vram===0));
});
test('projected routing pays virtual request costs before selecting later workers',()=>{
 const s=createGame();Object.assign(s,{cash:6,runEarned:10000,gpu:'mid',workers:4,claw:true,harness:['routing','fallback'],routing:'local',auto:true});
 const actual=structuredClone(s);advance(actual,.25);
 const projected=projectedIncome(s),running=income(actual);
 assert.equal(projected.slots,actual.jobs.length);assert.equal(projected.net,running.net);
 assert.equal(projected.revenue,running.revenue);assert.equal(projected.cost,running.cost);
 assert.ok(actual.jobs.some(j=>j.model==='starter'),'The free fallback must keep later workers active');assert.equal(s.cash,6);
});
test('upgrade recommendations still recognise benefits while old jobs are running',()=>{
 const s=createGame();s.cash=100;dispatch(s,{type:'generate'});
 assert.deepEqual(suggestedUpgrades(s).map(u=>u.id),['speed-0','pay-0']);
});
test('upgrade goals skip owned ranks and promote cooling during throttling',()=>{
 const s=createGame();s.upgrades=['pay-0','speed-0'];s.cash=1;
 assert.deepEqual(suggestedUpgrades(s).map(u=>u.id),['reach-0']);
 s.heat=80;s.cash=100;assert.equal(suggestedUpgrades(s)[0].id,'cool-0');
});
test('upgrade gains account for the cash needed to run the next request',()=>{
 const s=createGame();Object.assign(s,{cash:40,runEarned:100000,auto:true,model:'gpt',business:'reviews'});
 const preview=upgradePreview(s,'speed-0');
 assert.ok(preview.gain<=0);assert.match(preview.reserveReason,/cash.*request/i);
 assert.equal(s.cash,40);
});
test('recommendations rank a usable improvement before a purchase that exhausts cloud cash',()=>{
 const s=createGame();Object.assign(s,{cash:70,runEarned:100000,auto:true,model:'gpt',business:'reviews'});
 assert.deepEqual(suggestedUpgrades(s).map(u=>u.id),['speed-0','pay-0']);
});
test('one affordable improvement is followed by the cheapest remaining savings goal',()=>{
 const s=createGame();s.cash=50;
 assert.deepEqual(suggestedUpgrades(s).map(u=>u.id),['speed-0','pay-0']);
});
test('post-purchase routing fallback avoids an incorrect request reserve warning',()=>{
 const s=createGame();Object.assign(s,{cash:40,runEarned:100000,auto:true,model:'claude',claw:true,harness:['fallback']});
 assert.equal(upgradePreview(s,'speed-0').reserveReason,'');
});
test('model previews compare against the actual route and explicitly report routing override',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:10000,claw:true,routing:'margin',harness:['routing']});
 const actual=projectedIncome(s).model;const preview=modelPreview(s,'starter');
 assert.equal(preview.clearsRouting,true);assert.equal(preview.delta,quote(s,'starter','seo').net-quote(s,actual,'seo').net);
});
test('presentation queries leave all financial state, jobs and random seed unchanged',()=>{
 const s=createGame();Object.assign(s,{cash:20000,runEarned:20000,auto:true,gpu:'good',claw:true,workers:3,heat:80,harness:['routing'],routing:'local'});
 dispatch(s,{type:'generate'});const before=structuredClone(s);
 for(let i=0;i<5;i++){productionStatus(s);projectedIncome(s);suggestedUpgrades(s);modelPreview(s,'gpt');upgradePreview(s,'speed-0');}
 assert.deepEqual(s,before);
});

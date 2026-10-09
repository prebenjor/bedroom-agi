import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,quote,advance,income} from '../src/engine';
import {productionStatus,projectedIncome,suggestedUpgrades,modelPreview,upgradePreview} from '../src/presentation';

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

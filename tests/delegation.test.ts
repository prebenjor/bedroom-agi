import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,advance,startJob} from '../src/engine';
import * as coding from '../src/coding';
function setup(){const s=createGame();s.runEarned=100000;s.totalSeconds=360;s.cash=100000;s.model='gpt';s.claw=true;s.workers=4;s.nextEvent=1e12;dispatch(s,{type:'code-select',id:'bug-fixes'});dispatch(s,{type:'code-accept'});return s;}
test('parallel delegates consume real worker slots and match remaining preview fees/time',()=>{
 const s=setup(),options={mode:'parallel' as const,helpers:[{model:'gpt',access:'api' as const},{model:'claude-sonnet',access:'api' as const}]};
 const before=JSON.stringify(s),q=(coding as any).delegationPreview?.(s,options);assert.ok(q?.available);assert.equal(JSON.stringify(s),before);
 const sunk=s.expenses;assert.equal(dispatch(s,{type:'delegate',options,budget:q.totalJobCost}).ok,true);
 const unchanged=structuredClone(s.jobs[0]);assert.equal(unchanged.model,'gpt');let peak=0;
 for(let i=0;i<q.remainingSeconds/.25;i++){advance(s,.25);peak=Math.max(peak,s.jobs.length);}
 assert.equal(s.career.completed,1);assert.ok(peak>=2);assert.ok(Math.abs(s.expenses-sunk-q.remainingCost)<1e-8);
});
test('Base helpers work under a compatible coordinator but Chat and Base coordinators reject',()=>{
 const s=setup(),options={mode:'budget' as const,helpers:[{model:'gemini',access:'api' as const}]};
 assert.equal((coding as any).delegationPreview?.(s,options)?.available,true);
 assert.equal((coding as any).delegationPreview?.(s,{...options,helpers:[{model:'gemini',access:'chat'}]})?.available,false);
 const base=setup();base.coding.active!.requests.filter(r=>r.role==='coordinator').forEach(r=>r.model='gemini');
 assert.equal((coding as any).delegationPreview?.(base,options)?.available,false);
});
test('long form has real pending sections; legacy whole-job snapshots cannot delegate',()=>{
 const s=setup();s.coding.active=null;s.coding.selected=null;s.jobs=[];s.business='ebooks';s.model='claude-sonnet';
 assert.equal(startJob(s,0).ok,true);assert.equal(s.coding.active!.requests.filter(r=>r.status==='pending').length,3);
 const options={mode:'parallel' as const,helpers:[{model:'gpt',access:'api' as const},{model:'claude-sonnet',access:'api' as const}]};
 const running=structuredClone(s.jobs);const q=(coding as any).delegationPreview?.(s,options);assert.ok(q?.available);dispatch(s,{type:'delegate',options,budget:q.totalJobCost});assert.deepEqual(s.jobs,running);
 assert.equal((coding as any).delegationPreview?.(s,options)?.available,false);
});
test('shared local memory rejects an impossible parallel delegation before billing',()=>{
 const s=setup();s.gpu='good';const cash=s.cash;
 const q=(coding as any).delegationPreview?.(s,{mode:'parallel',helpers:[{model:'local-14b',access:'local'},{model:'local-14b',access:'local'}]});
 assert.equal(q?.available,false);assert.match(q.reason,/memory|VRAM/i);assert.equal(s.cash,cash);
});
test('coordination upgrade lowers real delegated fees and budget mode is serial',()=>{
 const s=setup(),options={mode:'budget' as const,helpers:[{model:'gemini',access:'api' as const}]};const q=(coding as any).delegationPreview(s,options);
 s.harness=['coordination'];const discounted=(coding as any).delegationPreview(s,options);assert.ok(discounted.remainingCost<q.remainingCost);
 dispatch(s,{type:'delegate',options,budget:discounted.totalJobCost});let peak=0;const spent=s.expenses;for(let i=0;i<discounted.remainingSeconds/.25;i++){advance(s,.25);peak=Math.max(peak,s.jobs.length);}
 assert.equal(peak,1);assert.equal(s.career.completed,1);assert.ok(Math.abs(s.expenses-spent-discounted.remainingCost)<1e-8);
});
test('independent long-form workers retain full original economics and save round trips',async()=>{
 const {quote}=await import('../src/engine'),{encodeSave,decodeSave}=await import('../src/save');const s=setup();s.coding.active=null;s.jobs=[];s.coding.selected=null;s.model='claude-sonnet';s.business='ebooks';
 const q=quote(s,s.model,s.business),cash=s.cash;for(let i=0;i<4;i++)assert.equal(startJob(s,i).ok,true);assert.equal(s.jobs.length,4);assert.ok(decodeSave(encodeSave(s,0),0));
 advance(s,q.duration+1);assert.equal(s.slop,4);assert.ok(Math.abs(s.cash-cash-4*(q.payout-q.cost))<1e-7);
});
test('parallel preview accounts for unrelated worker reservations and delivery follows preview',()=>{
 const s=setup();s.workers=2;const p=s.coding.active!;s.jobs.push({worker:1,model:'starter',business:'seo',remaining:100,duration:100,payout:7,cost:0,vram:0});
 const options={mode:'parallel' as const,helpers:[{model:'gpt',access:'api' as const},{model:'gpt',access:'api' as const}]};const q=(coding as any).delegationPreview(s,options);assert.ok(q.available);
 dispatch(s,{type:'delegate',options,budget:q.totalJobCost});advance(s,q.remainingSeconds);assert.equal(s.coding.lastReport!.work,p.work);assert.equal(s.career.completed,1);
});

test('parallel local helpers pin memory and electricity and finish at the simulated preview time',async()=>{
 const {encodeSave,decodeSave}=await import('../src/save');const s=setup();s.gpu='big';
 const options={mode:'parallel' as const,helpers:[{model:'local-14b',access:'local' as const},{model:'local-14b',access:'local' as const}]};
 const q=coding.delegationPreview(s,options);assert.equal(q.available,true);assert.equal(q.vram,24);assert.deepEqual(q.quota,{});
 const spent=s.expenses;assert.equal(dispatch(s,{type:'delegate',options,budget:q.totalJobCost}).ok,true);assert.ok(decodeSave(encodeSave(s,0),0));
 advance(s,q.remainingSeconds-.25);assert.equal(s.career.completed,0);advance(s,.25);assert.equal(s.career.completed,1);
 assert.ok(Math.abs(s.expenses-spent-q.remainingCost)<1e-8);assert.equal(s.coding.lastReport!.helpers,2);
});

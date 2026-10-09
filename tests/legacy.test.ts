import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeSave,encodeSave} from '../src/save';
import {advance,quote} from '../src/engine';

const raw=readFileSync(new URL('./fixtures/legacy-v1.json',import.meta.url),'utf8');
// Captured with git show 369dbf1 sources: fixture values are independent of new quote code.
test('a literal pre-expansion save decodes without rewriting cash, feed or committed jobs',()=>{
 const old=JSON.parse(raw).state,decoded=decodeSave(raw,100000);
 assert.ok(decoded);assert.equal(decoded.offlineSeconds,0);assert.deepEqual(decoded.state,old);
 advance(decoded.state,.25);
 assert.equal(decoded.state.cash,9990.52534343127);
 assert.deepEqual(decoded.state.feed,old.feed);
 assert.deepEqual(decoded.state.jobs,old.jobs.map((job:any)=>({...job,remaining:job.remaining-.25})));
 assert.deepEqual(decodeSave(encodeSave(decoded.state,100250),100250)!.state,decoded.state);
});

test('legacy paid and local jobs finish for their committed payouts after model and business changes',()=>{
 const s=decodeSave(raw,100000)!.state;
 s.model='gpt-mini';s.business='ads';s.upgrades.push('speed-1','pay-1');
 advance(s,4);
 assert.equal(s.jobs.length,1);assert.equal(s.jobs[0].model,'local-7b');assert.equal(s.jobs[0].remaining,2);
 assert.equal(s.cash,9990.52534343127+56.160000000000004);assert.equal(s.runEarned,7056.16);
 assert.equal(s.expenses,9.474656568727715);
 advance(s,2);
 assert.equal(s.jobs.length,0);assert.equal(s.cash,9990.52534343127+56.160000000000004+46.8);
 assert.equal(s.runEarned,7102.96);assert.equal(s.slop,22);assert.equal(s.totalSlop,37);
 assert.equal(s.expenses,9.474656568727715);assert.deepEqual(s.feed,JSON.parse(raw).state.feed);
 assert.notEqual(quote(s,'gpt','linkedin').payout,56.160000000000004,'Changed upgrades must affect new quotes only');
});

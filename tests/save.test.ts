import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance} from '../src/engine';
import {encodeSave,decodeSave,clockStep} from '../src/save';
test('save round trip keeps committed jobs and permanent progress',()=>{
 const s=createGame();s.auto=true;advance(s,3);s.perks=['cash'];s.valuation=4;
 const r=decodeSave(encodeSave(s,100000),100000);
 assert.ok(r);assert.deepEqual(r.state,s);assert.equal(r.offlineSeconds,0);
});
test('catch-up caps at two hours and matches active earnings',()=>{
 const s=createGame();s.auto=true;
 const r=decodeSave(encodeSave(s,100000),100000+10*3600000)!;
 assert.equal(r.offlineSeconds,7200);
 advance(r.state,r.offlineSeconds);advance(s,7200);
 assert.equal(r.state.cash,s.cash);assert.equal(r.state.totalSlop,s.totalSlop);
});
test('backwards clocks produce no negative earnings',()=>{
 const r=decodeSave(encodeSave(createGame(),100000),50000)!;
 assert.equal(r.offlineSeconds,0);
});
test('ordinary fractional ticks never produce a save the game rejects',()=>{
 const s=createGame();advance(s,.2499999999999999);
 assert.ok(s.fraction>=0);
 assert.ok(decodeSave(encodeSave(s,100000),100000));
});
test('moving the system clock backward never credits an interval twice',()=>{
 let last=100000,total=0;
 for(const now of [160000,100000,160000,170000]){const step=clockStep(last,now);last=step.next;total+=step.seconds;}
 assert.equal(total,70);
});
test('malformed, oversized, unknown-version and impossible saves are rejected',()=>{
 for(const raw of ['{','null','x'.repeat(250001),JSON.stringify({version:99,state:createGame(),savedAt:0})])assert.equal(decodeSave(raw,100000),null);
 for(const change of [{cash:-1},{workers:9},{model:'unknown'},{heat:Infinity},{jobs:[{worker:0,model:'starter',business:'seo',remaining:2,duration:1,payout:7,cost:0,vram:0}]},{harness:['made-up']}]){
  assert.equal(decodeSave(encodeSave({...createGame(),...change} as any,100000),100000),null);
 }
});

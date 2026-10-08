import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,prestigeQuote} from '../src/engine';
import {activeRoomLayerIds,roomWorkerPanes} from '../src/room-state';
test('reactive room layers follow cumulative purchased cooling rather than room stage',()=>{
 const s=createGame();s.prestige=2;s.gpu='rack';assert.deepEqual(activeRoomLayerIds(s),[]);
 s.cash=1e9;for(let rank=0;rank<6;rank++){
  assert.equal(dispatch(s,{type:'upgrade',id:`cool-${rank}`}).ok,true);
  assert.deepEqual(activeRoomLayerIds(s),Array.from({length:rank+1},(_,i)=>`cool-${i}`));
 }
});
test('agent art follows installed SlopClaw and worker count without changing state',()=>{
 const s=createGame(),before=structuredClone(s);assert.equal(roomWorkerPanes(s),0);assert.deepEqual(s,before);
 s.claw=true;for(let workers=1;workers<=4;workers++){s.workers=workers;assert.equal(roomWorkerPanes(s),workers);assert.deepEqual(activeRoomLayerIds(s),['claw']);}
});
test('prestige removes purchased art while starting harness perks are immediately visible',()=>{
 const s=createGame();s.cash=1e6;s.runEarned=prestigeQuote(s).target;s.claw=true;s.upgrades=['cool-0','cool-1'];
 assert.equal(dispatch(s,{type:'prestige'}).ok,true);assert.deepEqual(activeRoomLayerIds(s),[]);assert.equal(roomWorkerPanes(s),0);
 s.perks=['claw','workers'];s.runEarned=prestigeQuote(s).target;assert.equal(dispatch(s,{type:'prestige'}).ok,true);
 assert.deepEqual(activeRoomLayerIds(s),['claw']);assert.equal(roomWorkerPanes(s),2);
});

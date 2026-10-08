import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,income} from '../src/engine';
test('the free model recovers a broke four-agent operation',()=>{
 const s=createGame();s.cash=0;s.claw=true;s.auto=true;s.workers=4;
 advance(s,30);assert.ok(s.cash>0);assert.ok(s.slop>0);
});
test('the strongest cooling actually removes thermal throttling from a rack',()=>{
 const s=createGame();s.gpu='rack';s.model='local-70b';s.auto=true;s.cash=100000;s.runEarned=100000;s.upgrades=['cool-0','cool-1','cool-2','cool-3','cool-4','cool-5'];
 advance(s,1800);assert.ok(s.heat<=65,`Rack temperature: ${s.heat}`);
});
test('a paused unaffordable setup does not claim income it cannot produce',()=>{
 const s=createGame();s.cash=0;s.model='claude';s.runEarned=2000;s.auto=true;
 advance(s,30);assert.equal(income(s).net,0);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulate,bestSetup} from '../scripts/balance';
import {createGame,dispatch} from '../src/engine';
test('balance candidates count only requests the chosen setup can fund sequentially',()=>{
 const s=createGame();Object.assign(s,{cash:6,runEarned:100000,claw:true,workers:4});
 const best=bestSetup(s,'cloud'),actual=structuredClone(s);actual.model=best.model;actual.business=best.business;actual.routing='manual';actual.harness=[];
 for(let worker=0;worker<4;worker++)if(!dispatch(actual,{type:'generate'}).ok)break;
 const net=actual.jobs.reduce((sum,job)=>sum+(job.payout-job.cost)/job.duration,0);
 assert.ok(Math.abs(best.net-net)<1e-10,`${best.model}/${best.business} estimated ${best.net}, funded ${net}`);
 assert.ok(actual.cash>=0);assert.equal(s.cash,6);
});
test('three-minute check-ins reach all three funding targets at the intended pace',()=>{
 const result=simulate('mixed');
 assert.equal(result.runs.length,3);
 assert.ok(result.runs[0]>=180&&result.runs[0]<=240,`first run: ${result.runs[0]} minutes`);
 assert.ok(result.runs[1]>=90&&result.runs[1]<=120,`second run: ${result.runs[1]} minutes`);
 assert.ok(result.runs[2]>=60&&result.runs[2]<=90,`third run: ${result.runs[2]} minutes`);
 assert.ok(result.claw[0]>=45&&result.claw[0]<=60,`SlopClaw: ${result.claw[0]} minutes`);
 assert.ok(result.models.some(id=>id.startsWith('local')));
 assert.ok(result.models.some(id=>['gpt','gemini','claude','grok'].includes(id)));
 assert.deepEqual(result.businesses.sort(),['seo','reviews','linkedin','ads','images','ebooks','decks','video'].sort(),'Every business must earn a useful place in the simulated progression');
 assert.equal(result.state.ending,true);
});

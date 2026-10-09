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
for(const strategy of ['cloud','local','mixed'] as const)test(`${strategy} decisions include the beginning and funding stretch, with no eight-minute core gap`,()=>{
 const result=simulate(strategy);
 assert.equal(result.runs.length,3);
 const bounds=[[60,90],[30,45],[20,30]];
 result.runs.forEach((minutes,i)=>assert.ok(minutes>=bounds[i][0]&&minutes<=bounds[i][1],`${strategy} run ${i+1}: ${minutes} minutes`));
 assert.ok(result.gaps.every(gaps=>gaps.every(gap=>gap<=8)),`${strategy} gaps: ${JSON.stringify(result.gaps)}`);
 assert.ok(result.checkpoints.every(s=>s.projects.completed.length===0),'Optional projects cannot hide core pacing gaps');
});
test('three-minute check-ins reach all three funding targets at the intended pace',()=>{
 const result=simulate('mixed');
 assert.equal(result.runs.length,3);
 assert.ok(result.runs[0]>=60&&result.runs[0]<=90,`first run: ${result.runs[0]} minutes`);
 assert.ok(result.runs[1]>=30&&result.runs[1]<=45,`second run: ${result.runs[1]} minutes`);
 assert.ok(result.runs[2]>=20&&result.runs[2]<=30,`third run: ${result.runs[2]} minutes`);
 assert.ok(result.claw[0]>=10&&result.claw[0]<=15,`SlopClaw: ${result.claw[0]} minutes`);
 assert.ok(result.models.some(id=>id.startsWith('local')));
 assert.ok(result.models.some(id=>['gpt','gemini','claude','grok'].includes(id)));
 assert.deepEqual(result.businesses.sort(),['seo','reviews','linkedin','ads','images','ebooks','decks','video'].sort(),'Every business must earn a useful place in the simulated progression');
 assert.equal(result.state.ending,true);
});

test('optional projects complete through three-minute check-ins and give a modest advantage',()=>{
 const baseline=simulate('mixed'),withProjects=simulate('mixed',true);
 assert.equal(withProjects.checkpoints[2].projects.completed.length,6);
 assert.ok(withProjects.runs[0]>=baseline.runs[0]*.8&&withProjects.runs[0]<=baseline.runs[0]*1.15);
 assert.ok(withProjects.runs[2]>=baseline.runs[2]*.8&&withProjects.runs[2]<=baseline.runs[2]);
});

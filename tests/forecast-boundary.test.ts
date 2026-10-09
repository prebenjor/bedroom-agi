import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance,dispatch,quote} from '../src/engine';
import {weeklyProfit} from '../src/access';
test('forecast reevaluates quota at its inclusive Monday boundary',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:100000,model:'gpt-mini',nextEvent:1e9});s.access.mode='chat';advance(s,839.75);s.access.usage['gpt-mini']=80;
 const q=quote(s,s.model,s.business);assert.equal(q.available,false);
 const estimate=weeklyProfit(s,q,s.model),actual=structuredClone(s);actual.auto=true;advance(actual,.25);
 assert.equal(estimate.jobsStarted,actual.jobs.length);assert.equal(estimate.jobsStarted,1);assert.equal(estimate.profit,0);
});
test('a busy Chat quote becomes startable after pinned work finishes',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:100000,model:'gpt-mini',nextEvent:1e9});s.access.mode='chat';advance(s,830);dispatch(s,{type:'generate'});
 const q=quote(s,s.model,s.business,{ignoreBusy:false});assert.equal(q.available,false);
 const estimate=weeklyProfit(s,q,s.model),actual=structuredClone(s);actual.auto=true;advance(actual,10);
 assert.equal(estimate.jobsStarted,1);assert.equal(estimate.committedJobs,1);assert.equal(estimate.jobs+estimate.committedJobs,actual.slop);assert.equal(estimate.profit,actual.cash-s.cash);
});
test('static business/model/hardware restrictions stay unavailable in forecasts',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:1000,nextEvent:1e9});
 for(const [model,business] of [['gpt-boardroom','seo'],['gpt-mini','video'],['local-7b','seo']]){
  const q=quote(s,model,business);assert.equal(q.available,false);assert.equal(weeklyProfit(s,q,model).jobsStarted,0);
 }
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as content from '../src/content';
import {createGame,dispatch,quote} from '../src/engine';

test('each business has one owned workflow and the existing upgrade catalog stays intact',()=>{
 const workflows=content.WORKFLOWS;
 assert.equal(workflows.length,8);
 assert.equal(content.UPGRADES.length,24);
 assert.deepEqual(workflows.map(w=>w.business).sort(),content.BUSINESSES.map(b=>b.id).sort());
});

test('workflow savings affect future cloud request fees without changing committed jobs',()=>{
 const s=createGame();Object.assign(s,{cash:100000,runEarned:100000,model:'gpt',business:'reviews',claw:true,workers:3});
 dispatch(s,{type:'generate'});const old=structuredClone(s.jobs[0]),before=quote(s,'gpt','reviews');
 assert.equal(dispatch(s,{type:'workflow',id:'workflow-reviews'}).ok,true);
 const after=quote(s,'gpt','reviews');
 assert.ok(Math.abs((before.cost-after.cost)-4*2*.25)<1e-10);
 assert.equal(after.duration,before.duration);assert.equal(after.payout,before.payout);
 assert.deepEqual(s.jobs[0],old);
 assert.equal(dispatch(s,{type:'workflow',id:'workflow-reviews'}).ok,false);
});

test('a cloud request workflow does not discount local electricity or coordination',()=>{
 const s=createGame();Object.assign(s,{cash:100000,runEarned:100000,gpu:'good',claw:true,workers:2});
 const before=quote(s,'local-7b','reviews');s.upgrades.push('workflow-reviews');
 assert.equal(quote(s,'local-7b','reviews').cost,before.cost);
});

test('business workflow ownership leaves another business quote unchanged',()=>{
 const s=createGame();Object.assign(s,{cash:100000,runEarned:100000});
 const before=quote(s,'gpt','seo');s.upgrades.push('workflow-reviews');
 assert.deepEqual(quote(s,'gpt','seo'),before);
});

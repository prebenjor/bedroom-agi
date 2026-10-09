import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,quote} from '../src/engine';
import {MODELS} from '../src/content';
import {codingQuote} from '../src/coding';

test('new paid models have a reachable profitable use with their quoted fees',()=>{
 const examples=[['claude-fable','bug-fixes'],['gemini-flash','ads'],['grok-murmur','bug-fixes'],['grok-meltdown','linkedin'],['deepseek-overthink','internal-tools']];
 for(const [id,work] of examples){const m=MODELS.find(m=>m.id===id)!;const s=createGame();Object.assign(s,{model:id,runEarned:Math.max(m.unlock,30000),totalSeconds:360,cash:5000});s.access.mode='api';s.career.completed=6;
  const q=['bug-fixes','internal-tools'].includes(work)?codingQuote(s,work):quote(s,id,work);
  assert.equal(q.available,true,`${id}: ${q.reason}`);assert.ok(q.cost>0&&q.cost<=s.cash,`${id} must be affordable`);assert.ok(q.net>0,`${id} must pay its bills`);
 }
});

test('Pro capability avoids expensive repair work on difficult coding contracts',()=>{
 const s=createGame();Object.assign(s,{runEarned:100000,totalSeconds:360,cash:5000});s.career.completed=8;s.access.mode='api';
 s.model='deepseek';const plus=codingQuote(s,'internal-tools');s.model='deepseek-overthink';const pro=codingQuote(s,'internal-tools');
 assert.equal(plus.repairs,2);assert.equal(pro.repairs,0);assert.ok(pro.cost>plus.cost);assert.ok(pro.net>plus.net,'Pro coding gains should justify its higher fees');
 s.model='gpt';const boulder=codingQuote(s,'repository-migrations');s.model='claude';const epic=codingQuote(s,'repository-migrations');
 assert.equal(boulder.repairs,2);assert.equal(epic.repairs,0);assert.ok(epic.duration<boulder.duration);assert.ok(epic.net>boulder.net);
});

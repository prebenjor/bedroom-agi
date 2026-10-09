import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODELS} from '../src/content';
import {createGame,quote} from '../src/engine';

// Each witness is a reachable unlocked setup with enough cash for one request.
const witnesses:[string,string,number,number,string][]=[
 ['starter','seo',0,15,'none'],['gemini','seo',60,10,'none'],
 ['gpt-mini','reviews',150,10,'none'],['gpt','ads',2500,30,'none'],
 ['claude','linkedin',1800,60,'none'],['grok','linkedin',4000,100,'none'],
 ['deepseek','ebooks',16000,60,'none'],['claude-sonnet','ebooks',20000,200,'none'],
 ['gemini-ultra','ads',30000,1000,'none'],['gpt-boardroom','decks',30000,1000,'none'],
 ['midjourney','images',6000,100,'none'],['sora','video',60000,1000,'none'],
 ['local-7b','seo',1000000,1000000,'rack'],['local-14b','ads',1000000,1000000,'rack'],
 ['local-32b','ebooks',1000000,1000000,'rack'],['local-70b','video',1000000,1000000,'rack']
];
for(const [model,business,runEarned,cash,gpu] of witnesses)test(`${model} has a strict economic niche in ${business}`,()=>{
 const s=createGame();Object.assign(s,{runEarned,cash,gpu,business,model});
 const selected=quote(s,model,business);assert.equal(selected.available,true);assert.ok(selected.cost<=cash);assert.ok(selected.net>0);
 for(const competitor of MODELS.filter(m=>m.id!==model)){
  const q=quote(s,competitor.id,business);if(!q.available||q.cost>cash)continue;
  assert.ok(selected.net>q.net,`${model} net ${selected.net} must beat available ${competitor.id} net ${q.net}`);
 }
});

test('cheap starter workloads favour a budget model over premium request bills',()=>{
 const s=createGame();Object.assign(s,{runEarned:1000000,cash:1000000});
 for(const business of ['seo','reviews']){
  const budget=quote(s,business==='seo'?'gemini':'gpt-mini',business);
  for(const premium of ['claude','gpt-boardroom'])assert.ok(budget.net>quote(s,premium,business).net);
 }
});
test('premium capabilities pay for their higher invoices on decks and video',()=>{
 const s=createGame();Object.assign(s,{runEarned:1000000,cash:1000000});
 for(const [model,business] of [['gpt-boardroom','decks'],['sora','video']]){
  const premium=quote(s,model,business);assert.ok(premium.net>0);
  for(const cheap of ['gemini','gpt-mini','deepseek']){
   const budget=quote(s,cheap,business);assert.ok(!budget.available||premium.net>budget.net);
  }
 }
});

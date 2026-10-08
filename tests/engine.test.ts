import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, dispatch, advance, quote, income, prestigeQuote, capacity, chooseModel } from '../src/engine';

test('a new player can earn money without paying for a model', () => {
  const s = createGame();
  assert.equal(s.cash, 15);
  dispatch(s, {type:'generate'});
  advance(s, 20);
  assert.ok(s.cash > 15);
  assert.equal(s.slop, 1);
});
test('unaffordable and duplicate purchases leave cash intact', () => {
  const s = createGame();
  assert.equal(dispatch(s,{type:'upgrade',id:'speed-0'}).ok,false);
  assert.equal(s.cash,15);
  s.cash=1000;
  assert.equal(dispatch(s,{type:'upgrade',id:'speed-0'}).ok,true);
  const after=s.cash;
  assert.equal(dispatch(s,{type:'upgrade',id:'speed-0'}).ok,false);
  assert.equal(s.cash,after);
});
test('automation produces while the player is away', () => {
  const s=createGame(); s.cash=100;
  dispatch(s,{type:'auto'});
  advance(s,180);
  assert.ok(s.slop>=12);
  assert.ok(s.runEarned>80);
});
test('local model capacity and quantization are enforced', () => {
  const s=createGame(); s.cash=100000; s.runEarned=100000;
  assert.equal(quote(s,'local-7b','seo').available,false);
  dispatch(s,{type:'gpu',id:'used'});
  assert.equal(capacity(s),4);
  assert.equal(quote(s,'local-7b','seo').available,false);
  dispatch(s,{type:'harness',id:'quantization'});
  assert.equal(quote(s,'local-7b','seo').available,true);
  const q=quote(s,'local-7b','seo');
  assert.ok(q.payout<quote({...s,gpu:'mid'},'local-7b','seo').payout);
});
test('a model switch cannot rewrite the running job', () => {
  const s=createGame(); s.cash=1000;
  dispatch(s,{type:'generate'});
  const payout=s.jobs[0].payout;
  dispatch(s,{type:'model',id:'gpt'});
  assert.equal(s.jobs[0].model,'starter');
  advance(s,20);
  assert.equal(s.runEarned,payout);
});
test('hot local inference is slower and cooling restores throughput', () => {
  const s=createGame(); s.cash=100000; s.runEarned=100000; s.gpu='rack'; s.heat=98;
  const hot=quote(s,'local-70b','video').duration;
  s.upgrades=['cool-0','cool-1','cool-2','cool-3','cool-4','cool-5'];
  s.heat=25;
  assert.ok(quote(s,'local-70b','video').duration<hot);
});
test('parallel local jobs share VRAM and do not overcommit the rig', () => {
  const s=createGame(); s.cash=100000; s.runEarned=100000; s.gpu='mid'; s.model='local-7b'; s.auto=true; s.workers=4; s.claw=true;
  advance(s,1);
  assert.equal(s.jobs.length,1);
});
test('broke cloud automation pauses and free starter recovers', () => {
  const s=createGame(); s.cash=0; s.runEarned=2000; s.model='claude'; s.auto=true;
  advance(s,20);
  assert.equal(s.jobs.length,0);
  assert.equal(s.cash,0);
  assert.match(s.notice,/afford|requests|cash/i);
  dispatch(s,{type:'model',id:'starter'});
  advance(s,20);
  assert.ok(s.cash>0);
});
test('routing picks available models and preserves an affordable fallback', () => {
  const s=createGame(); s.cash=0; s.claw=true; s.harness=['routing']; s.routing='cheapest';
  assert.equal(chooseModel(s,'seo'),'starter');
  s.gpu='mid'; s.cash=10000; s.runEarned=10000; s.routing='local';
  assert.equal(chooseModel(s,'seo'),'local-7b');
});
test('a prestige clears the run while retaining discoveries and lifetime statistics', () => {
  const s=createGame(); s.runEarned=1e9; s.cash=100000; s.slop=55; s.totalSlop=55; s.discovered=['event-0']; s.upgrades=['speed-0']; s.gpu='rack'; s.workers=4; s.claw=true;
  assert.ok(prestigeQuote(s).eligible);
  dispatch(s,{type:'prestige'});
  assert.equal(s.prestige,1);
  assert.equal(s.runEarned,0);
  assert.equal(s.gpu,'none');
  assert.equal(s.workers,1);
  assert.equal(s.totalSlop,55);
  assert.deepEqual(s.discovered,['event-0']);
  assert.ok(s.valuation>0);
});
test('three raises unlock the ending and production can continue', () => {
  const s=createGame();
  for(let i=0;i<3;i++){s.runEarned=1e9; dispatch(s,{type:'prestige'});}
  assert.equal(s.ending,true);
  dispatch(s,{type:'generate'}); advance(s,30);
  assert.ok(s.slop>0);
});
test('chunked time and elapsed time give the same production', () => {
  const a=createGame(); a.auto=true;
  const b=structuredClone(a);
  advance(a,900);
  for(let i=0;i<900;i++)advance(b,1);
  assert.equal(a.cash,b.cash);
  assert.equal(a.slop,b.slop);
  assert.equal(a.seed,b.seed);
  assert.ok(Number.isFinite(income(a).net));
});

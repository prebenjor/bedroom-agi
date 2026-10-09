import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODELS, BUSINESSES, BASE_SPEED, GPUS } from '../src/content';
import { createGame, quote, dispatch, advance } from '../src/engine';
import type { Model } from '../src/types';

// Removing fit from quote must fail these tests: labels alone cannot set prices.
test('specialty changes the real job duration and payout while neutral jobs keep base economics', () => {
 const model = Object.assign({id:'fit-fixture',name:'Fixture',company:'Fixture',tag:'CLOUD',description:'',speed:1,value:1,cost:2,quality:9,vram:0,unlock:0}, {specialties:['fit-job'],fit:{'fit-job':{speed:2,payout:3}}}) as Model;
 MODELS.push(model);
 BUSINESSES.push({id:'fit-job',name:'Fixture',icon:'',description:'',payout:10,duration:13,scale:1,quality:0,unlock:0});
 try {
  const s=createGame(); s.model=model.id; s.business='fit-job';
  const q=quote(s,model.id,'fit-job');
  const expectedDuration=13/(BASE_SPEED*2);
  assert.equal(q.duration,expectedDuration);
  assert.equal(q.payout,30);
  assert.equal(q.cost,2);
  assert.equal(q.net,28/expectedDuration);
  dispatch(s,{type:'generate'});
  advance(s,Math.ceil(expectedDuration/.25)*.25);
  assert.equal(s.runEarned,30);
  assert.equal(s.cash,43);
  delete (model as Model & {fit?:unknown}).fit;
  const neutral=quote(s,model.id,'fit-job');
  assert.equal(neutral.duration,13/BASE_SPEED);
  assert.equal(neutral.payout,10);
 } finally { MODELS.pop(); BUSINESSES.pop(); }
});

test('local specialty electricity uses accelerated duration and quantization still cuts payout by 18 percent', () => {
 const model = Object.assign({id:'local-fit-fixture',name:'Fixture',company:'Fixture',tag:'LOCAL',description:'',speed:1,value:1,cost:0,quality:9,vram:6,unlock:0}, {specialties:['fit-job'],fit:{'fit-job':{speed:2,payout:3}}}) as Model;
 MODELS.push(model);
 BUSINESSES.push({id:'fit-job',name:'Fixture',icon:'',description:'',payout:10,duration:10.4,scale:1,quality:0,unlock:0});
 try {
  const s=createGame(); s.gpu='used'; s.harness=['quantization'];
  const q=quote(s,model.id,'fit-job');
  assert.equal(q.available,true);
  const gpu=GPUS.find(g=>g.id==='used')!,expectedDuration=10.4/(BASE_SPEED*2*gpu.speed);
  assert.equal(q.duration,expectedDuration);
  assert.ok(Math.abs(q.payout-24.6)<1e-9);
  assert.ok(Math.abs(q.cost-gpu.watts*expectedDuration*.00015)<1e-9);
  assert.equal(q.vram,3);
 } finally { MODELS.pop(); BUSINESSES.pop(); }
});

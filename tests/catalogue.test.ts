import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODELS,BUSINESSES} from '../src/content';
import {createGame,quote,dispatch,advance,capacity} from '../src/engine';
import {projectedIncome} from '../src/presentation';

// Missing IDs and mismatched job snapshots are user-visible catalogue failures.
test('all expanded catalogue choices participate in valid real job quotes',()=>{
 const models=['starter','gemini','gpt','claude','grok','local-7b','local-14b','local-70b','gpt-mini','gpt-boardroom','claude-sonnet','gemini-ultra','deepseek','midjourney','sora','local-32b'];
 const businesses=['seo','linkedin','images','video','reviews','ads','ebooks','decks'];
 assert.deepEqual(MODELS.map(m=>m.id).sort(),models.sort());
 assert.deepEqual(BUSINESSES.map(b=>b.id).sort(),businesses.sort());
 const s=createGame();Object.assign(s,{cash:1e9,runEarned:1e9,gpu:'rack'});
 let usable=0;
 for(const business of businesses)for(const model of models){
  const q=quote(s,model,business);
  assert.ok(q.duration>0&&q.payout>0&&q.cost>=0&&Number.isFinite(q.net),`${model}/${business}: finite economics`);
  if(!q.available){assert.ok(MODELS.find(m=>m.id===model)!.quality<BUSINESSES.find(b=>b.id===business)!.quality);assert.ok(q.reason.length>0);continue;}
  usable++;const jobState=structuredClone(s);jobState.model=model;jobState.business=business;
  assert.equal(dispatch(jobState,{type:'generate'}).ok,true,`${model}/${business}: start`);
  const job=jobState.jobs[0];
  assert.deepEqual({duration:job.duration,payout:job.payout,cost:job.cost,vram:job.vram},{duration:q.duration,payout:q.payout,cost:q.cost,vram:q.vram});
  assert.equal(job.model,model);assert.equal(job.business,business);assert.equal(jobState.cash,s.cash-q.cost);
 }
 assert.ok(usable>64,'A majority of the 128 combinations must be usable with sufficient progress and VRAM');
});

test('new business unlocks enforce earned income even with enough purchase cash',()=>{
 for(const [id,unlock] of [['reviews',150],['ads',2500],['ebooks',16000],['decks',30000]] as const){
  const s=createGame();Object.assign(s,{cash:1e9,runEarned:unlock-1,model:'claude',gpu:'rack'});
  assert.equal(dispatch(s,{type:'business',id}).ok,false,id);assert.equal(s.business,'seo');
  s.runEarned=unlock;assert.equal(dispatch(s,{type:'business',id}).ok,true,id);assert.equal(s.business,id);
 }
});

test('automatic routing commits each request quote after cash and VRAM reservations',()=>{
 for(const routing of ['cheapest','margin','local'] as const){
  const s=createGame();Object.assign(s,{cash:30,runEarned:1e9,gpu:'big',business:'ads',claw:true,workers:4,harness:['routing','fallback'],routing,auto:false});
  const projected=projectedIncome(s);let revenue=0,cost=0;
  for(let worker=0;worker<4;worker++){
   const before=structuredClone(s);const result=dispatch(s,{type:'generate'});if(!result.ok)break;
   const job=s.jobs.at(-1)!;const q=quote(before,job.model,job.business);
   assert.deepEqual({duration:job.duration,payout:job.payout,cost:job.cost,vram:job.vram},{duration:q.duration,payout:q.payout,cost:q.cost,vram:q.vram});
   assert.equal(s.cash,before.cash-job.cost);revenue+=job.payout/job.duration;cost+=job.cost/job.duration;
  }
  assert.equal(projected.slots,s.jobs.length);assert.equal(projected.net,revenue-cost);
  assert.ok(s.cash>=0);assert.ok(s.jobs.reduce((sum,j)=>sum+j.vram,0)<=capacity(s));
 }
});

test('24 GB local model reserves quantized memory and keeps the 18 percent payout reduction',()=>{
 const s=createGame();Object.assign(s,{cash:1e6,runEarned:1e6,gpu:'good',model:'local-32b',claw:true,workers:2,harness:['quantization']});
 const q=quote(s,'local-32b','seo'),full=quote({...s,gpu:'big'},'local-32b','seo');
 assert.equal(q.available,true);assert.equal(q.quantized,true);assert.equal(q.vram,12);assert.ok(Math.abs(q.payout-full.payout*.82)<1e-9);
 assert.equal(dispatch(s,{type:'generate'}).ok,true);assert.equal(dispatch(s,{type:'generate'}).ok,false);
 assert.equal(s.jobs.length,1);assert.equal(s.jobs[0].vram,12);
});

test('every paid cloud selection can recover through free SEO production',()=>{
 for(const model of MODELS.filter(m=>m.cost>0&&m.vram===0)){
  const s=createGame();Object.assign(s,{cash:0,runEarned:1e9,model:model.id,auto:true});
  advance(s,1);assert.equal(s.cash,0);assert.equal(s.jobs.length,0);
  dispatch(s,{type:'model',id:'starter'});dispatch(s,{type:'business',id:'seo'});advance(s,20);
  assert.ok(s.cash>0,model.id);assert.ok(s.slop>0,model.id);
 }
});

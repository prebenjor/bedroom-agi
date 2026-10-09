import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch,advance,quote,prestigeQuote} from '../src/engine';
import {encodeSave,decodeSave} from '../src/save';
import {PROJECTS,projectBenefits,projectStatus} from '../src/projects';

function ready(){const s=createGame();s.totalSeconds=4000;s.cash=10000;s.runEarned=100000;return s;}
function start(s:ReturnType<typeof ready>,id:string){return dispatch(s,{type:'project-start',id});}
function choose(s:ReturnType<typeof ready>,id:string){return dispatch(s,{type:'project-choice',id});}

test('projects require lifetime time, payment, and an empty active slot',()=>{
 const s=createGame();s.cash=100;
 assert.equal(start(s,'tiny-game').ok,false);assert.equal(s.cash,100);
 s.totalSeconds=180;s.cash=24;assert.equal(start(s,'tiny-game').ok,false);assert.equal(s.cash,24);
 s.cash=100;assert.equal(start(s,'tiny-game').ok,true);assert.equal(s.cash,75);
 assert.deepEqual(s.projects.active,{id:'tiny-game',choices:[],remaining:0});
 assert.equal(start(s,'tiny-game').ok,false);assert.equal(start(s,'photo-organiser').ok,false);assert.equal(s.cash,75);
});

test('a project waits for each authored choice and completes exactly once after two builds',()=>{
 const s=ready();start(s,'tiny-game');advance(s,500);
 assert.deepEqual(s.projects.active!.choices,[]);
 assert.equal(choose(s,'unknown').ok,false);assert.equal(choose(s,'arrows').ok,true);
 assert.equal(choose(s,'personal-best').ok,false);
 advance(s,119.75);assert.equal(s.projects.active!.remaining,.25);
 advance(s,.25);assert.equal(s.projects.active!.remaining,0);
 const decisionLogs=s.feed.filter(f=>/Tiny game.*ready/i.test(f.text)).length;
 advance(s,500);assert.equal(s.feed.filter(f=>/Tiny game.*ready/i.test(f.text)).length,decisionLogs);
 assert.equal(choose(s,'arrows').ok,false);assert.equal(choose(s,'personal-best').ok,true);
 advance(s,120);assert.equal(s.projects.active,null);
 assert.deepEqual(s.projects.completed,[{id:'tiny-game',choices:['arrows','personal-best']}]);
 const cash=s.cash;advance(s,500);assert.equal(s.cash,cash);assert.equal(start(s,'tiny-game').ok,false);
});

test('project construction runs beside committed production and time chunks are deterministic',()=>{
 const a=ready();a.auto=true;start(a,'tiny-game');choose(a,'arrows');const b=structuredClone(a);
 advance(a,120);for(let i=0;i<480;i++)advance(b,.25);
 assert.ok(a.totalSlop>0);assert.equal(a.projects.active?.remaining,0);assert.equal(a.projects.active?.choices.length,1);assert.deepEqual(a,b);
});

test('projects survive funding, and the tiny game funds only the next fresh start',()=>{
 const s=ready();start(s,'tiny-game');choose(s,'arrows');advance(s,120);choose(s,'personal-best');advance(s,120);
 const before=s.cash;assert.equal(before,9975);
 start(s,'photo-organiser');choose(s,'dates');advance(s,60);const projects=structuredClone(s.projects);
 s.runEarned=1e9;assert.equal(dispatch(s,{type:'prestige'}).ok,true);
 assert.equal(s.cash,65);assert.deepEqual(s.projects,projects);assert.equal(start(s,'tiny-game').ok,false);
 s.perks=['cash'];s.runEarned=1e9;dispatch(s,{type:'prestige'});assert.equal(s.cash,550);
});

test('completed project rewards affect future quotes without rewriting running jobs',()=>{
 const s=ready();s.gpu='mid';s.claw=true;s.workers=2;
 dispatch(s,{type:'generate'});const job=structuredClone(s.jobs[0]);
 const cloud=quote(s,'gemini','seo'),local=quote(s,'local-7b','seo'),funding=prestigeQuote(s).reward;
 s.projects={active:null,completed:[
  {id:'photo-organiser',choices:['dates','preview']},{id:'stock-tracker',choices:['csv','threshold']},
  {id:'invoice-helper',choices:['line-items','reminder']},{id:'backup-tool',choices:['folders','restore']},
  {id:'community-website',choices:['events','simple-form']}
 ]};
 const c=quote(s,'gemini','seo'),l=quote(s,'local-7b','seo');
 assert.ok(Math.abs(c.duration-cloud.duration/1.02)<1e-10);assert.ok(Math.abs(c.payout-cloud.payout*1.02)<1e-10);
 // Cloud fee reduction leaves the second worker's $0.35 coordination cost alone.
 assert.ok(Math.abs(c.cost-(cloud.cost-.02))<1e-10);
 assert.ok(Math.abs(l.cost-(.35+180*l.duration*.00015*.95))<1e-10);
 assert.equal(prestigeQuote(s).reward,funding+1);assert.deepEqual(s.jobs[0],job);
});

test('old version-one saves gain empty projects and keep their job snapshots',()=>{
 const s=ready();dispatch(s,{type:'generate'});const legacy:any=structuredClone(s);delete legacy.projects;
 const decoded=decodeSave(encodeSave(legacy,1000),1000)!;
 assert.ok(decoded);assert.deepEqual(decoded.state.projects,{active:null,completed:[]});assert.deepEqual(decoded.state.jobs,s.jobs);
});

test('save validation rejects impossible project states and preserves valid decision or build progress',()=>{
 const s=ready();start(s,'tiny-game');choose(s,'arrows');advance(s,10);
 assert.deepEqual(decodeSave(encodeSave(s,1000),1000)?.state,s);
 for(const projects of [null,{}, {active:null,completed:[{id:'fake',choices:[]}]},
  {active:{id:'tiny-game',choices:['personal-best'],remaining:10},completed:[]},
  {active:{id:'tiny-game',choices:[],remaining:10},completed:[]},
  {active:{id:'tiny-game',choices:['arrows','personal-best'],remaining:0},completed:[]},
  {active:{id:'tiny-game',choices:['arrows'],remaining:121},completed:[]},
  {active:null,completed:[{id:'tiny-game',choices:['arrows']}]},
  {active:{id:'tiny-game',choices:[],remaining:0},completed:[{id:'tiny-game',choices:['arrows','personal-best']}]},
  {active:null,completed:[{id:'tiny-game',choices:['arrows','personal-best']},{id:'tiny-game',choices:['arrows','personal-best']}]}
 ]) assert.equal(decodeSave(encodeSave({...s,projects} as any,1000),1000),null);
});

test('offline construction pauses at a decision, then finishes a committed second build',()=>{
 const s=ready();start(s,'tiny-game');choose(s,'arrows');
 const first=decodeSave(encodeSave(s,1000),1000+24*3600000)!;advance(first.state,first.offlineSeconds);
 assert.equal(first.offlineSeconds,7200);assert.equal(first.state.projects.active?.remaining,0);
 assert.deepEqual(first.state.projects.active?.choices,['arrows']);assert.equal(first.state.projects.completed.length,0);
 choose(first.state,'personal-best');
 const second=decodeSave(encodeSave(first.state,1000),1000+24*3600000)!;advance(second.state,second.offlineSeconds);
 assert.equal(second.state.projects.active,null);assert.equal(second.state.projects.completed.length,1);
 assert.equal(decodeSave(encodeSave(second.state,1000),1000)?.state.projects.completed.length,1);
});

test('every authored choice completes a finite project with the same disclosed benefits',()=>{
 for(const p of PROJECTS){
  let reward:ReturnType<typeof projectBenefits>|undefined;
  for(let first=0;first<2;first++)for(let second=0;second<2;second++){
   const s=ready();assert.equal(start(s,p.id).ok,true);
   for(const index of [first,second]){
    const decision=projectStatus(s)!.decision!;const option=decision.options[index];
    assert.equal(choose(s,option.id).ok,true);assert.equal(projectStatus(s)?.phase,'building');advance(s,120);
    assert.ok(s.feed.some(f=>f.text.includes(option.feedback)));
   }
   assert.equal(projectStatus(s),null);assert.equal(s.projects.completed.length,1);
   const benefits=projectBenefits(s);if(reward)assert.deepEqual(benefits,reward);else reward=benefits;
   assert.ok(decodeSave(encodeSave(s,1000),1000));
  }
 }
});

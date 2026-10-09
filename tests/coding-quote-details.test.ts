import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,dispatch} from '../src/engine';
import {codingQuote,productionQuote,delegationPreview} from '../src/coding';
import {encodeSave,decodeSave} from '../src/save';
test('coding comparisons expose the coder quantization payout penalty',()=>{
 const s=createGame();Object.assign(s,{model:'local-14b',gpu:'mid',cash:5000,runEarned:50000,totalSeconds:360,claw:true,harness:['quantization']});s.career={completed:6,byJob:{'bug-fixes':6}};
 const compact=codingQuote(s,'small-scripts');assert.equal(compact.available,true,compact.reason);assert.equal(compact.quantized,true);assert.equal(compact.vram,6);
 s.gpu='good';const full=codingQuote(s,'small-scripts');assert.equal(full.quantized,false);assert.ok(Math.abs(compact.payout/full.payout-.82)<1e-10);
});
test('coding revisions improve work without inflating the contract rate',()=>{
 const s=createGame();Object.assign(s,{model:'gpt',cash:5000,runEarned:50000,totalSeconds:360,calendarSeconds:840});s.career={completed:6,byJob:{'bug-fixes':6}};
 const original=codingQuote(s,'websites');assert.equal(dispatch(s,{type:'revision-adopt',id:'gpt-r2'}).ok,true);
 const revised=codingQuote(s,'websites');assert.equal(revised.payout,original.payout);assert.ok(revised.duration<original.duration);assert.ok(revised.cost>original.cost);assert.ok(revised.net>original.net);
});
test('accepted quantization metadata stays pinned through upgrades, delegation and reload',()=>{
 const s=createGame();Object.assign(s,{model:'local-14b',gpu:'mid',cash:5000,runEarned:50000,totalSeconds:360,claw:true,harness:['quantization']});s.career={completed:6,byJob:{'bug-fixes':6}};
 dispatch(s,{type:'code-select',id:'small-scripts'});dispatch(s,{type:'code-accept'});
 const payout=s.coding.active!.payout;assert.equal(productionQuote(s).quantized,true);
 s.gpu='good';assert.equal(codingQuote(s).quantized,false);assert.equal(productionQuote(s).quantized,true);assert.equal(productionQuote(s).payout,payout);
 const options={mode:'budget' as const,helpers:[{model:'gpt-mini',access:'api' as const}]},preview=delegationPreview(s,options);
 assert.equal(preview.available,true,preview.reason);dispatch(s,{type:'delegate',options,budget:preview.totalJobCost});
 assert.equal(productionQuote(s).quantized,true);assert.equal(s.coding.active!.payout,payout);
 const saved=decodeSave(encodeSave(s,0),0);assert.ok(saved);assert.equal(productionQuote(saved.state).quantized,true);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,advance} from '../src/engine';
import {agentSummary} from '../src/presentation';

test('four cloud workers can run without consuming the purchased rig',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:100000,claw:true,workers:4,auto:true,gpu:'mid',model:'grok'});
 advance(s,.25);const summary=agentSummary(s);
 assert.equal(summary.cloud,4);assert.equal(summary.local,0);assert.equal(summary.usedVRAM,0);assert.equal(summary.capacity,8);assert.equal(summary.idle,0);
 assert.deepEqual(summary.models,['Grok Bottom Rant']);
});

test('local workers wait when one job occupies most of an 8 GB card',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:100000,claw:true,workers:4,auto:true,gpu:'mid',model:'local-7b'});
 advance(s,.25);const summary=agentSummary(s);
 assert.equal(summary.local,1);assert.equal(summary.cloud,0);assert.equal(summary.usedVRAM,6);assert.equal(summary.idle,3);
});

test('local-first routing shows the cloud jobs which fill remaining workers',()=>{
 const s=createGame();Object.assign(s,{cash:10000,runEarned:100000,claw:true,workers:4,auto:true,gpu:'mid',routing:'local',harness:['routing']});
 advance(s,.25);const before=structuredClone(s),summary=agentSummary(s);
 assert.equal(summary.local,1);assert.equal(summary.cloud,3);assert.equal(summary.usedVRAM,6);assert.equal(summary.idle,0);
 assert.ok(summary.models.includes('Llamateur 7B'));assert.equal(summary.models.length,2);assert.deepEqual(s,before);
});

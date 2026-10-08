import {test} from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../scripts/balance';
test('three-minute check-ins reach all three funding targets at the intended pace',()=>{
 const result=simulate('mixed');
 assert.equal(result.runs.length,3);
 assert.ok(result.runs[0]>=180&&result.runs[0]<=240,`first run: ${result.runs[0]} minutes`);
 assert.ok(result.runs[1]>=90&&result.runs[1]<=120,`second run: ${result.runs[1]} minutes`);
 assert.ok(result.runs[2]>=60&&result.runs[2]<=90,`third run: ${result.runs[2]} minutes`);
 assert.ok(result.claw[0]>=45&&result.claw[0]<=60,`SlopClaw: ${result.claw[0]} minutes`);
 assert.ok(result.models.some(id=>id.startsWith('local')));
 assert.ok(result.models.some(id=>['gpt','gemini','claude','grok'].includes(id)));
 assert.equal(result.state.ending,true);
});

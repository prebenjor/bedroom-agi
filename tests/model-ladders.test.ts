import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MODELS} from '../src/content';
test('provider tier ladders unlock in order and keep higher capability visible',()=>{
 for(const family of ['ChatGDP','Clawed','Gemoney','Grok Bottom','DeepShill']){
  const rows=MODELS.filter(m=>m.family===family).sort((a,b)=>['base','plus','pro'].indexOf(a.tier)-['base','plus','pro'].indexOf(b.tier));
  for(let i=1;i<rows.length;i++){
   assert.ok(rows[i].unlock>=rows[i-1].unlock,`${family}: ${rows[i].name} must not unlock before ${rows[i-1].name}`);
   assert.ok(rows[i].codingScore>rows[i-1].codingScore,`${family}: higher tiers must improve capability`);
   assert.ok(rows[i].contextCapacity>=rows[i-1].contextCapacity,`${family}: higher tiers must retain context capacity`);
  }
 }
});

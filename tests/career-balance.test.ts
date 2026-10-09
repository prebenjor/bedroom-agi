import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/engine';
import {codingQuote,CODING_JOBS} from '../src/coding';
import {simulateCareer} from '../scripts/career-balance';

test('larger coding work pays enough to justify its longer requests',()=>{
 const s=createGame();Object.assign(s,{model:'gpt',cash:1e6,runEarned:1e6,totalSeconds:7200});s.career.completed=20;s.access.mode='api';
 const bug=codingQuote(s,'bug-fixes');
 for(const job of CODING_JOBS.slice(1)){const q=codingQuote(s,job.id);assert.equal(q.available,true,q.reason);assert.ok(q.net>bug.net,`${job.id}: ${q.net} must exceed bug fixes ${bug.net}`);}
});

test('optional projects and approved revisions retain a modest paced career advantage',t=>{
 const result=simulateCareer('mixed',true,true);t.diagnostic(JSON.stringify({projects:true,revisions:true,runs:result.runs,maxGap:Math.max(...result.gaps.flat())}));
 assert.equal(result.completedProjects,6);assert.equal(result.approvedRevisions,6);assert.equal(result.runs.length,3);
 [[60,90],[30,45],[20,30]].forEach(([min,max],i)=>assert.ok(result.runs[i]>=min&&result.runs[i]<=max,`Projects/revisions run${i+1}: ${result.runs[i]}`));
 assert.ok(result.gaps.every(g=>g.every(n=>n<=8)));
});

for(const strategy of ['cloud','local','mixed'] as const)test(`${strategy} coding check-ins keep funding pace and meaningful purchase gaps`,t=>{
 const result=simulateCareer(strategy);assert.equal(result.runs.length,3);
 t.diagnostic(JSON.stringify({strategy,runs:result.runs,codingUsed:result.codingUsed,maxGap:Math.max(...result.gaps.flat())}));
 const bounds=[[60,90],[30,45],[20,30]];
 result.runs.forEach((minutes,i)=>assert.ok(minutes>=bounds[i][0]&&minutes<=bounds[i][1],`${strategy} career run${i+1}: ${minutes} minutes`));
 assert.ok(result.gaps.every(g=>g.every(n=>n<=8)),`${strategy} career decision gaps: ${JSON.stringify(result.gaps)}`);
 assert.ok(result.codingUsed.length>=3,`Only useful career work: ${result.codingUsed}`);
 assert.ok(result.career>=8);assert.equal(result.ending,true);assert.equal(result.completedProjects,0);
});

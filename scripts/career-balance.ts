import {createGame,advance,dispatch,prestigeQuote,quote} from '../src/engine';
import {MODELS} from '../src/content';
import {manage,type Strategy} from './balance';
import {projectedIncome} from '../src/presentation';
import {CODING_JOBS,codingQuote,codingUnlock,roleQuote} from '../src/coding';
import {PROJECTS,projectStatus} from '../src/projects';
import {fileURLToPath} from 'node:url';
import {REVISIONS,calendar} from '../src/access';

export function simulateCareer(strategy:Strategy='mixed',projects=false,approveRevisions=false){
 const s=createGame();dispatch(s,{type:'generate'});advance(s,20);dispatch(s,{type:'generate'});advance(s,20);dispatch(s,{type:'auto'});
 const runs:number[]=[],decisions:number[][]=[[]],codingUsed=new Set<string>(),models=new Set<string>(),timeline:{run:number;minutes:number;cash:number;earned:number;work:string|null;upgrades:string[];harness:string[]}[]=[];let lastUnlocks='';
 for(let check=0;check<600&&runs.length<3;check++){
  if(approveRevisions)for(const revision of REVISIONS)if(calendar(s).week>=revision.week&&!s.access.approvedRevisions.includes(revision.id))dispatch(s,{type:'revision-adopt',id:revision.id});
  const before=JSON.stringify([s.gpu,s.claw,s.workers,s.upgrades,s.harness,s.model,s.business,s.coding.selected]);
  {
   // Compare purchases against content without changing the committed pipeline.
   const active=s.coding.active,selected=s.coding.selected;
   s.coding.active=null;s.coding.selected=null;manage(s,strategy);
   const contentNet=projectedIncome(s).net;
   s.coding.active=active;s.coding.selected=selected;
   const candidates=[];
   const usable=MODELS.filter(m=>m.tier!=='visual'&&!(strategy==='cloud'&&m.vram)&&!(strategy==='local'&&!m.vram&&m.id!=='starter')&&roleQuote(s,'coordinator',{model:m.id},8000).available);
   const fastest=[...usable].sort((a,b)=>quote(s,a.id,'seo',{coding:true}).duration-quote(s,b.id,'seo',{coding:true}).duration)[0];
   const capable=[...usable].sort((a,b)=>b.codingScore-a.codingScore)[0];
   for(const job of CODING_JOBS){if(!codingUnlock(s,job.id).ok)continue;
    for(const m of MODELS){if(m.tier==='visual'||strategy==='cloud'&&m.vram||strategy==='local'&&!m.vram&&m.id!=='starter')continue;
     for(const tester of new Set([m.id,fastest?.id,capable?.id].filter((id):id is string=>!!id))){
      const clone=structuredClone(s);clone.model=m.id;clone.coding.roles={coordinator:fastest?{model:fastest.id}:null,coder:{model:m.id},tester:{model:tester},reviewer:null};clone.coding.selected=job.id;
      const q=codingQuote(clone,job.id);if(q.available&&q.cost<=s.cash*.8&&q.net>0)candidates.push({model:m.id,job:job.id,q,roles:clone.coding.roles});
     }
    }
   }
   candidates.sort((a,b)=>b.q.net-a.q.net||a.job.localeCompare(b.job));
   // A player tries the newly unlocked career, then compares sustained profits.
   const chosen=candidates[0];
   // Three-minute check-ins need approved repeats; early manual coding is tested separately.
   if(chosen&&s.claw&&(chosen.q.net>=contentNet||s.career.completed<8)){
    dispatch(s,{type:'model',id:chosen.model});
    for(const role of ['coordinator','coder','tester'] as const)dispatch(s,{type:'code-role',role,assignment:chosen.roles[role]});
    if(s.coding.selected!==chosen.job)dispatch(s,{type:'code-select',id:chosen.job});
    // Approve a displayed round-number cap, allowing modest heat-driven electricity changes.
    const budget=Math.ceil(chosen.q.cost*2)+1;
    if(!active)dispatch(s,{type:'code-accept',budget});
    else dispatch(s,{type:'code-budget',budget:Math.max(budget,active.spent+active.requests.filter(r=>r.status==='pending').reduce((n,r)=>n+r.cost,0))});
    codingUsed.add(chosen.job);models.add(chosen.model);
   }else dispatch(s,{type:'work-content'});
   }
  // Finishing committed work is required even if the player returns to content.
  const paused=s.coding.active;
  if(paused?.pause&&/budget/i.test(paused.pause))dispatch(s,{type:'code-budget',budget:paused.spent+paused.requests.filter(r=>r.status==='pending').reduce((n,r)=>n+r.cost,0)});
  if(paused?.pause&&/quota|coverage|plan/i.test(paused.pause))dispatch(s,{type:'code-recover',access:'api'});
  const unlocks=CODING_JOBS.filter(j=>codingUnlock(s,j.id).ok).map(j=>j.id).join(',');
  if(before!==JSON.stringify([s.gpu,s.claw,s.workers,s.upgrades,s.harness,s.model,s.business,s.coding.selected])||lastUnlocks!==unlocks)decisions[runs.length].push(s.seconds/60);
  lastUnlocks=unlocks;
  timeline.push({run:runs.length,minutes:s.seconds/60,cash:s.cash,earned:s.runEarned,work:s.coding.selected,upgrades:[...s.upgrades],harness:[...s.harness]});
  if(projects){const p=projectStatus(s);if(p?.decision)dispatch(s,{type:'project-choice',id:p.decision.options[0].id});else if(!p){const next=PROJECTS.find(p=>p.unlock<=s.totalSeconds&&p.cost<=s.cash*.15&&!s.projects.completed.some(c=>c.id===p.id));if(next)dispatch(s,{type:'project-start',id:next.id});}}
  if(prestigeQuote(s).eligible){runs.push(Math.round(s.seconds/60));dispatch(s,{type:'prestige'});if(runs.length<3)decisions.push([]);}
  advance(s,180);
 }
 const gaps=decisions.map((d,i)=>{const times=[0,...d,runs[i]??s.seconds/60];return times.slice(1).map((t,j)=>t-times[j]);});
 return {strategy,projects,approveRevisions,runs,gaps,codingUsed:[...codingUsed],models:[...models],career:s.career.completed,ending:s.ending,completedProjects:s.projects.completed.length,approvedRevisions:s.access.approvedRevisions.length,timeline,last:{pause:s.coding.active?.pause,work:s.coding.active?.work,selected:s.coding.selected,cash:s.cash,earned:s.runEarned,jobs:s.jobs}};
}
if(process.argv[1]===fileURLToPath(import.meta.url))for(const strategy of process.argv[2]?[process.argv[2] as Strategy]:['cloud','local','mixed'] as const)console.log(JSON.stringify(simulateCareer(strategy)));

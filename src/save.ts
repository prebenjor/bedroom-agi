import {createCoding,CODING_JOBS,CODING_ROLES,LONG_FORM} from './coding';
import type {GameState} from './types';
import {MODELS,BUSINESSES,GPUS,UPGRADES,HARNESS,PERKS,NEWS,WORKFLOWS} from './content';
import {PROJECTS,PROJECT_BUILD_SECONDS} from './projects';
import {createAccess,PROVIDERS,PLAN_FEES,REVISIONS,calendar,revisionMetrics} from './access';
const record=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
const bounded=(x:unknown,max=1e15):x is number=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=max;
function validateAccess(s:GameState){
 const a=s.access;if(!record(a)||typeof a.apiUnlocked!=='boolean'||!['auto','chat','api','local'].includes(a.mode)||!Number.isInteger(a.usageWeek)||a.usageWeek!==calendar(s).week)return false;
 if(!record(a.usage)||Object.entries(a.usage).some(([id,n])=>!MODELS.some(m=>m.id===id&&m.tier!=='starter'&&m.tier!=='local'&&m.tier!=='visual')||!bounded(n)))return false;
 if(!Array.isArray(a.approvedRevisions)||new Set(a.approvedRevisions).size!==a.approvedRevisions.length||a.approvedRevisions.some(id=>!REVISIONS.some(r=>r.id===id&&r.week<=calendar(s).week)))return false;
 if(!record(a.selectedRevisions)||Object.entries(a.selectedRevisions).some(([id,r])=>!MODELS.some(m=>m.id===id)||typeof r!=='string'||!revisionMetrics(s,id,r).available))return false;
 if(!Array.isArray(a.plans)||a.plans.length>PROVIDERS.length||new Set(a.plans.map(p=>p?.provider)).size!==a.plans.length||a.plans.filter(p=>p?.renew).length>1)return false;
 for(const p of a.plans)if(!record(p)||!PROVIDERS.includes(p.provider)||!['plus','pro'].includes(p.tier)||!bounded(p.expiresAt)||p.expiresAt<=s.calendarSeconds||p.expiresAt>s.calendarSeconds+840||typeof p.renew!=='boolean'||p.nextTier!==undefined&&(!['free','plus','pro'].includes(p.nextTier)||PLAN_FEES[p.nextTier]>PLAN_FEES[p.tier]))return false;
 return true;
}
function validateCoding(s:GameState){
 const c=s.coding,career=s.career;
 if(!record(c)||!record(career)||!Number.isInteger(career.completed)||!bounded(career.completed)||!record(career.byJob)||Object.entries(career.byJob).some(([id,n])=>!CODING_JOBS.some(j=>j.id===id)||!Number.isInteger(n)||!bounded(n))||Object.values(career.byJob).reduce((n,x)=>n+x,0)!==career.completed)return false;
 // Retained paused contracts do not occupy workers; only s.jobs has a worker cap.
 if(c.selected!==null&&!CODING_JOBS.some(j=>j.id===c.selected)||typeof c.recovery!=='boolean'||!record(c.roles)||!Array.isArray(c.content)||c.approvedBudget!==null&&!bounded(c.approvedBudget))return false;
 const validAssignment=(a:any)=>record(a)&&MODELS.some(m=>m.id===a.model&&m.tier!=='visual')&&(a.revision===undefined||typeof a.revision==='string'&&revisionMetrics(s,a.model,a.revision).available)&&(a.access===undefined||['chat','api','local'].includes(a.access))&&(!a.access||a.access==='local'===!!MODELS.find(m=>m.id===a.model)!.vram);
 if(CODING_ROLES.some(role=>c.roles[role]!==null&&!validAssignment(c.roles[role]))||Object.keys(c.roles).some(role=>!CODING_ROLES.includes(role as any)))return false;
 if(c.lastReport!==null){const r=c.lastReport;if(!record(r)||!CODING_JOBS.some(j=>j.id===r.work)&&!LONG_FORM.includes(r.work)||['payout','fees','seconds','repairs','helpers'].some(k=>!bounded((r as any)[k]))||!Number.isInteger(r.repairs)||r.repairs>2||!Number.isInteger(r.helpers)||r.helpers>3)return false;}
 const pipelines=[c.active,...c.content].filter(p=>p!==null);if(c.active===null&&c.content.length||new Set(pipelines.map(p=>p.id)).size!==pipelines.length||c.content.some(p=>p.kind!=='content'))return false;
 for(const p of pipelines){
  if(!record(p)||typeof p.id!=='string'||p.id.length>120||!['coding','content'].includes(p.kind)||(p.kind==='coding'?!CODING_JOBS.some(j=>j.id===p.work):!LONG_FORM.includes(p.work))||['payout','budget','spent','acceptedAt'].some(k=>!bounded((p as any)[k]))||p.acceptedAt>s.totalSeconds||p.spent>p.budget+1e-8||!Number.isInteger(p.repairs)||p.repairs<0||p.repairs>2||!Number.isInteger(p.helpers)||p.helpers<0||p.helpers>3||![null,'budget','parallel'].includes(p.delegation)||typeof p.pause!=='string'||p.pause.length>1200||!Array.isArray(p.requests)||!p.requests.length||p.requests.length>80)return false;
  if(new Set(p.requests.map(r=>r.id)).size!==p.requests.length)return false;
  for(const r of p.requests){
   if(!record(r)||!Number.isInteger(r.id)||!bounded(r.id,1000)||!Number.isInteger(r.group)||!bounded(r.group,100)||!['Brief','Build','Review','Test','Fix','Deliver','Section','Coordinate'].includes(r.stage)||!CODING_ROLES.includes(r.role)||!validAssignment(r)||!r.access||typeof r.revision!=='string'||!['pending','running','done'].includes(r.status)||typeof r.delegated!=='boolean'||['workload','duration','cost','vram','context'].some(k=>!bounded((r as any)[k],1e12))||r.workload<=0||r.duration<=0||r.vram>96)return false;
   if(!record(r.snapshot)||['speed','payout','fee','workload'].some(k=>!bounded((r.snapshot as any)[k],1e12))||r.snapshot.speed<=0||r.snapshot.payout<=0||r.snapshot.workload!==r.workload)return false;
   if(r.access==='chat'&&(r.cost!==0||r.vram!==0||r.snapshot.fee!==0||r.delegated||r.stage==='Coordinate')||r.access==='local'&&r.vram===0||r.access==='api'&&r.vram!==0)return false;
   if(r.stage==='Coordinate'&&!MODELS.find(m=>m.id===r.model)!.delegation)return false;
   const jobs=s.jobs.filter(j=>j.pipeline===p.id&&j.request===r.id);
   if(r.status==='running'){if(jobs.length!==1)return false;const j=jobs[0];if(j.business!==p.work||j.payout!==0||['model','revision','access','duration','cost','vram'].some(k=>(j as any)[k]!==(r as any)[k])||JSON.stringify(j.snapshot)!==JSON.stringify(r.snapshot))return false;}
   else if(jobs.length)return false;
  }
  const spent=p.requests.filter(r=>r.status!=='pending').reduce((n,r)=>n+r.cost,0);if(Math.abs(spent-p.spent)>1e-7)return false;
 }
 if(s.jobs.some(j=>j.pipeline!==undefined&&(!pipelines.some(p=>p.id===j.pipeline&&p.requests.some(r=>r.id===j.request&&r.status==='running')))||j.pipeline===undefined&&j.request!==undefined))return false;
 return true;
}
export function encodeSave(state:GameState,savedAt:number){return JSON.stringify({version:1,savedAt,state});}
export function clockStep(last:number,now:number){return {seconds:Math.min(7200,Math.max(0,(now-last)/1000)),next:Math.max(last,now)};}
export function decodeSave(raw:string,now:number):{state:GameState;offlineSeconds:number;savedAt:number}|null{
 if(raw.length>250000)return null;
 try {
  const envelope=JSON.parse(raw),s=envelope?.state;
  if(envelope?.version!==1||!s||s.version!==1||!Number.isFinite(envelope.savedAt)||envelope.savedAt<0)return null;
  for(const key of ['cash','slop','totalSlop','runEarned','totalEarned','expenses','totalExpenses','seconds','totalSeconds','valuation','totalValuation','nextEvent','eventLeft','seed','fraction'])if(!Number.isFinite(s[key])||s[key]<0||s[key]>1e15)return null;
  for(const key of ['slop','totalSlop','valuation','totalValuation','seed'])if(!Number.isInteger(s[key]))return null;
  if(!Number.isInteger(s.prestige)||s.prestige<0||s.prestige>100||!Number.isInteger(s.workers)||s.workers<1||s.workers>4||!Number.isFinite(s.heat)||s.heat<25||s.heat>99||s.fraction>=.25)return null;
  for(const key of ['auto','claw','ending','muted','reducedMotion'])if(typeof s[key]!=='boolean')return null;
  if(!MODELS.some(m=>m.id===s.model)||!BUSINESSES.some(b=>b.id===s.business)||!(s.gpu==='none'||GPUS.some(g=>g.id===s.gpu))||!['manual','cheapest','margin','local'].includes(s.routing))return null;
  for(const [key,catalog] of [['upgrades',[...UPGRADES,...WORKFLOWS]],['harness',HARNESS],['perks',PERKS],['discovered',NEWS]] as const){
   const values=s[key];if(!Array.isArray(values)||values.length>catalog.length||new Set(values).size!==values.length||values.some((v:unknown)=>!catalog.some(c=>c.id===v)))return null;
  }
  if(s.calendarSeconds===undefined)s.calendarSeconds=0;
  if(!bounded(s.calendarSeconds))return null;
  if(s.access===undefined)s.access=createAccess(true);
  if(!validateAccess(s))return null;
  if(s.coding===undefined)s.coding=createCoding();
  if(s.career===undefined)s.career={completed:0,byJob:{}};
  if(s.projects===undefined)s.projects={active:null,completed:[]};
  if(!s.projects||typeof s.projects!=='object'||!Array.isArray(s.projects.completed)||s.projects.completed.length>PROJECTS.length)return null;
  const validProject=(p:any,complete:boolean)=>{
   const project=PROJECTS.find(c=>c.id===p?.id);
   if(!project||!Array.isArray(p.choices)||p.choices.length>project.decisions.length||p.choices.some((id:unknown,i:number)=>!project.decisions[i].options.some(o=>o.id===id)))return false;
   if(complete)return p.choices.length===project.decisions.length&&p.remaining===undefined;
   return Number.isFinite(p.remaining)&&p.remaining>=0&&p.remaining<=PROJECT_BUILD_SECONDS&&!(p.choices.length===0&&p.remaining>0)&&!(p.choices.length===project.decisions.length&&p.remaining===0);
  };
  if(s.projects.completed.some((p:any)=>!validProject(p,true))||new Set(s.projects.completed.map((p:any)=>p.id)).size!==s.projects.completed.length)return null;
  if(s.projects.active!==null&&(!validProject(s.projects.active,false)||s.projects.completed.some((p:any)=>p.id===s.projects.active.id)))return null;
  if(s.event!==null&&!NEWS.some(n=>n.id===s.event))return null;
  if(!Array.isArray(s.jobs)||s.jobs.length>s.workers||new Set(s.jobs.map((j:any)=>j.worker)).size!==s.jobs.length)return null;
  for(const j of s.jobs){
   if(!Number.isInteger(j.worker)||j.worker<0||j.worker>=s.workers||!MODELS.some(m=>m.id===j.model)||(!BUSINESSES.some(b=>b.id===j.business)&&!CODING_JOBS.some(b=>b.id===j.business)))return null;
   for(const k of ['remaining','duration','payout','cost','vram'])if(!Number.isFinite(j[k])||j[k]<0||j[k]>1e12)return null;
   if(j.version!==undefined&&j.version!==1)return null;
   if(j.access!==undefined&&!['chat','api','local'].includes(j.access))return null;
   if(j.revision!==undefined&&(typeof j.revision!=='string'||!revisionMetrics(s,j.model,j.revision).available))return null;
   if(j.snapshot!==undefined){if(!record(j.snapshot)||!bounded(j.snapshot.speed,1e12)||j.snapshot.speed<=0||!bounded(j.snapshot.payout,1e12)||j.snapshot.payout<=0||!bounded(j.snapshot.fee,1e12)||!bounded(j.snapshot.workload,1e12)||j.snapshot.workload<=0)return null;}
   if(j.version===1&&(j.access===undefined||j.revision===undefined||j.snapshot===undefined))return null;
   const model=MODELS.find(m=>m.id===j.model)!;
   if(j.access==='local'&&(model.vram===0||j.vram===0)||j.access==='chat'&&(model.vram>0||model.tier==='visual'||j.vram!==0||j.cost!==0||j.snapshot?.fee!==0))return null;
   if(j.access==='api'&&(model.vram>0||j.vram!==0))return null;
   if(j.duration<=0||j.remaining<=0||j.remaining>j.duration||j.vram>96)return null;
  }
  const chats=s.jobs.filter((j:any)=>j.access==='chat');
  if(chats.length>1||chats.length&&s.jobs.some((j:any)=>j.access===undefined&&j.model==='starter'))return null;
  const cap=GPUS.find(g=>g.id===s.gpu)?.vram??0;if(s.jobs.reduce((n:number,j:any)=>n+j.vram,0)>cap)return null;
  if(!validateCoding(s))return null;
  if(!Array.isArray(s.feed)||s.feed.length>30||s.feed.some((f:any)=>!Number.isFinite(f.at)||f.at<0||typeof f.text!=='string'||f.text.length>1200||!['job','news','purchase','system'].includes(f.kind)))return null;
  if(typeof s.notice!=='string'||s.notice.length>1200)return null;
  return {state:s,offlineSeconds:clockStep(envelope.savedAt,now).seconds,savedAt:envelope.savedAt};
 }catch{return null;}
}

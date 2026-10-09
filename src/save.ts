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
   if(!Number.isInteger(j.worker)||j.worker<0||j.worker>=s.workers||!MODELS.some(m=>m.id===j.model)||!BUSINESSES.some(b=>b.id===j.business))return null;
   for(const k of ['remaining','duration','payout','cost','vram'])if(!Number.isFinite(j[k])||j[k]<0||j[k]>1e12)return null;
   if(j.version!==undefined&&j.version!==1)return null;
   if(j.access!==undefined&&!['chat','api','local'].includes(j.access))return null;
   if(j.revision!==undefined&&(typeof j.revision!=='string'||!revisionMetrics(s,j.model,j.revision).available))return null;
   if(j.snapshot!==undefined){if(!record(j.snapshot)||!bounded(j.snapshot.speed,1e12)||j.snapshot.speed<=0||!bounded(j.snapshot.payout,1e12)||j.snapshot.payout<=0||!bounded(j.snapshot.fee,1e12)||!bounded(j.snapshot.workload,1e12)||j.snapshot.workload<=0)return null;}
   if(j.version===1&&(j.access===undefined||j.revision===undefined||j.snapshot===undefined))return null;
   if(j.access==='local'&&MODELS.find(m=>m.id===j.model)!.vram===0||j.access==='chat'&&(j.vram!==0||j.cost!==0||j.snapshot?.fee!==0))return null;
   if(j.access==='api'&&MODELS.find(m=>m.id===j.model)!.vram>0)return null;
   if(j.duration<=0||j.remaining<=0||j.remaining>j.duration||j.vram>96)return null;
  }
  const cap=GPUS.find(g=>g.id===s.gpu)?.vram??0;if(s.jobs.reduce((n:number,j:any)=>n+j.vram,0)>cap)return null;
  if(!Array.isArray(s.feed)||s.feed.length>30||s.feed.some((f:any)=>!Number.isFinite(f.at)||f.at<0||typeof f.text!=='string'||f.text.length>1200||!['job','news','purchase','system'].includes(f.kind)))return null;
  if(typeof s.notice!=='string'||s.notice.length>1200)return null;
  return {state:s,offlineSeconds:clockStep(envelope.savedAt,now).seconds,savedAt:envelope.savedAt};
 }catch{return null;}
}

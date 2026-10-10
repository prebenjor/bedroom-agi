import {codingQuote,roleQuote} from './coding';
import {modelAccess} from './access';
import type {GameState,CodingRole,RoleAssignment} from './types';
export type Drawer = 'Businesses'|'Models'|'Rig'|'Agents'|'Upgrades'|'Projects'|'Funding'|'SlopBench';
export interface UiState {
 drawer:Drawer|null;
 disclosures:Record<string,boolean>;
}
export const createUiState=():UiState=>({drawer:null,disclosures:{}});
export const legacyTab=(drawer:Drawer|null)=>drawer==='Rig'?'Hardware':drawer==='Agents'?'SlopClaw':drawer==='Models'||drawer==='Funding'?drawer:'Work';
export const isContentSelected=(state:GameState,id:string)=>state.coding.selected===null&&state.business===id;
/** Preview precisely the assignment that Apply sends, including a cleared role. */
export function previewRoleDraft(state:GameState,role:CodingRole,assignment:RoleAssignment|null){
 const clone=structuredClone(state);clone.coding.roles[role]=assignment;
 const quote=codingQuote(clone),request=quote.requests.find(r=>r.role===role)??null;
 const resolved=request?roleQuote(clone,role,{model:request.model,revision:request.revision,access:request.access},request.context):assignment?roleQuote(clone,role,assignment,Math.min(quote.context,8000)):null;
 return {assignment,quote,request,role:resolved};
}
export function currentWorkAccess(state:GameState,model:string){if(state.coding.recovery)return 'chat';return state.coding.active?.requests.find(r=>r.status!=='done')?.access??state.jobs.find(j=>j.model===model)?.access??modelAccess(state,model);}
export function codingRepeatStatus(state:GameState){
 if(!state.coding.selected)return state.coding.active?.kind==='coding'?'Future coding repeats stopped':'';
 if(state.coding.approvedBudget===null)return 'Awaiting contract approval';
 if(!state.claw)return 'One job approved · SlopClaw not installed';
 if(!state.auto)return 'One job approved · repeats off';
 return state.coding.active?.pause||state.coding.recovery?'Approved repeats paused':'Approved repeats enabled';
}

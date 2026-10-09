export type Routing = 'manual' | 'cheapest' | 'margin' | 'local';
export type Provider = 'OpenAI' | 'Anthropic' | 'Google' | 'xAI' | 'DeepSeek';
export type PlanTier = 'free' | 'plus' | 'pro';
export type AccessMode = 'chat' | 'api' | 'local';
export type ModelTier = 'starter' | 'base' | 'plus' | 'pro' | 'local' | 'visual';
export interface ProviderPlan {provider:Provider;tier:Exclude<PlanTier,'free'>;expiresAt:number;renew:boolean;nextTier?:PlanTier}
export interface AccessState {apiUnlocked:boolean;mode:AccessMode|'auto';plans:ProviderPlan[];usage:Record<string,number>;usageWeek:number;approvedRevisions:string[];selectedRevisions:Record<string,string>}
export interface FinancialSnapshot {speed:number;payout:number;fee:number;workload:number}
export interface Model {family:string;tier:ModelTier;capabilityTier:Exclude<ModelTier,'local'>;codingScore:number;contextCapacity:number;testing:boolean;delegation:boolean;suitableBusinesses:string[];memoryGB:number;id:string; name:string; company:string; tag:string; description:string; specialties:string[]; fit?:Partial<Record<string,{speed:number;payout:number}>>; speed:number; value:number; cost:number; quality:number; vram:number; unlock:number}
export interface Business {id:string; name:string; icon:string; description:string; payout:number; duration:number; scale:number; quality:number; unlock:number}
export interface GPU {id:string; name:string; description:string; cost:number; vram:number; speed:number; watts:number}
export interface Upgrade {id:string; name:string; description:string; cost:number; kind:'speed'|'pay'|'cool'|'reach'; rank:number}
export interface Workflow {id:string;name:string;description:string;business:string;cost:number;effect:'speed'|'payout'|'request';multiplier:number}
export interface ProjectOption {id:string;label:string;description:string;feature:string;feedback:string}
export interface ProjectDecision {prompt:string;options:ProjectOption[]}
export interface Project {id:string;name:string;description:string;cost:number;unlock:number;rewardLabel:string;decisions:ProjectDecision[]}
export interface ProjectCompletion {id:string;choices:string[]}
export interface ProjectProgress extends ProjectCompletion {remaining:number}
export interface Harness {id:string; name:string; description:string; cost:number}
export interface Perk {id:string; name:string; description:string; cost:number; tier:number}
export interface News {id:string; title:string; text:string; speaker?:string; tier:number; effect:'demand'|'cost'|'none'; multiplier:number}
export type CodingRole='coordinator'|'coder'|'tester'|'reviewer';
export interface RoleAssignment {model:string;revision?:string;access?:AccessMode}
export type RequestStage='Brief'|'Build'|'Review'|'Test'|'Fix'|'Deliver'|'Section'|'Coordinate';
export interface PipelineRequest {id:number;stage:RequestStage;role:CodingRole;group:number;model:string;revision:string;access:AccessMode;workload:number;duration:number;cost:number;vram:number;snapshot:FinancialSnapshot;status:'pending'|'running'|'done';delegated:boolean;context:number}
export interface WorkPipeline {id:string;kind:'coding'|'content';work:string;payout:number;quantized?:boolean;requests:PipelineRequest[];budget:number;spent:number;repairs:number;helpers:number;delegation:'budget'|'parallel'|null;pause:string;acceptedAt:number}
export interface CodingState {recovery:boolean;content:WorkPipeline[];selected:string|null;roles:Record<CodingRole,RoleAssignment|null>;active:WorkPipeline|null;approvedBudget:number|null;lastReport:{work:string;payout:number;fees:number;repairs:number;helpers:number;seconds:number}|null}
export interface Career {completed:number;byJob:Record<string,number>}
export interface DelegationOptions {mode:'budget'|'parallel';helpers:RoleAssignment[]}
export interface Job {worker:number; model:string; business:string; remaining:number; duration:number; payout:number; cost:number; vram:number;version?:1;revision?:string;access?:AccessMode;snapshot?:FinancialSnapshot;pipeline?:string;request?:number}
export interface Feed {at:number; text:string; kind:'job'|'news'|'purchase'|'system'}
export interface GameState {
 coding:CodingState;career:Career;
 version:1; calendarSeconds:number;access:AccessState; cash:number; slop:number; totalSlop:number; runEarned:number; totalEarned:number; expenses:number; totalExpenses:number;
 seconds:number; totalSeconds:number; fraction:number; model:string; business:string; gpu:string; heat:number;
 auto:boolean; claw:boolean; workers:number; routing:Routing; upgrades:string[]; harness:string[]; perks:string[];
 jobs:Job[]; prestige:number; valuation:number; totalValuation:number; ending:boolean; discovered:string[];
 projects:{active:ProjectProgress|null;completed:ProjectCompletion[]};
 feed:Feed[]; seed:number; nextEvent:number; event:string|null; eventLeft:number; notice:string;
 muted:boolean; reducedMotion:boolean;
}
export type CodingAction = {type:'code-select';id:string} | {type:'code-accept';budget?:number} | {type:'code-role';role:CodingRole;assignment:RoleAssignment|null} | {type:'code-budget';budget:number} | {type:'code-recover';access:AccessMode} | {type:'work-content'|'free-slop'} | {type:'delegate';options:DelegationOptions;budget:number};
export type Action = CodingAction | {type:'access';id:AccessMode|'auto'} | {type:'plan';provider:Provider;tier:PlanTier} | {type:'plan-cancel'} | {type:'revision-adopt';id:string} | {type:'revision-select';model:string;id:string} | {type:'generate'|'auto'|'claw'|'worker'|'prestige'} | {type:'model'|'business'|'gpu'|'upgrade'|'harness'|'perk'|'workflow'|'project-start'|'project-choice';id:string} | {type:'routing';id:Routing};
export interface Result {ok:boolean; message:string}
export interface Quote {suitable?:boolean;access?:AccessMode;revision?:string;workload?:number;allowance?:number;remainingQuota?:number;snapshot?:FinancialSnapshot;available:boolean; reason:string; duration:number; payout:number; cost:number; net:number; vram:number; quantized:boolean}

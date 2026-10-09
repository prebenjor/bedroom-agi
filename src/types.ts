export type Routing = 'manual' | 'cheapest' | 'margin' | 'local';
export interface Model {id:string; name:string; company:string; tag:string; description:string; specialties:string[]; fit?:Partial<Record<string,{speed:number;payout:number}>>; speed:number; value:number; cost:number; quality:number; vram:number; unlock:number}
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
export interface Job {worker:number; model:string; business:string; remaining:number; duration:number; payout:number; cost:number; vram:number}
export interface Feed {at:number; text:string; kind:'job'|'news'|'purchase'|'system'}
export interface GameState {
 version:1; cash:number; slop:number; totalSlop:number; runEarned:number; totalEarned:number; expenses:number; totalExpenses:number;
 seconds:number; totalSeconds:number; fraction:number; model:string; business:string; gpu:string; heat:number;
 auto:boolean; claw:boolean; workers:number; routing:Routing; upgrades:string[]; harness:string[]; perks:string[];
 jobs:Job[]; prestige:number; valuation:number; totalValuation:number; ending:boolean; discovered:string[];
 projects:{active:ProjectProgress|null;completed:ProjectCompletion[]};
 feed:Feed[]; seed:number; nextEvent:number; event:string|null; eventLeft:number; notice:string;
 muted:boolean; reducedMotion:boolean;
}
export type Action = {type:'generate'|'auto'|'claw'|'worker'|'prestige'} | {type:'model'|'business'|'gpu'|'upgrade'|'harness'|'perk'|'workflow'|'project-start'|'project-choice';id:string} | {type:'routing';id:Routing};
export interface Result {ok:boolean; message:string}
export interface Quote {available:boolean; reason:string; duration:number; payout:number; cost:number; net:number; vram:number; quantized:boolean}

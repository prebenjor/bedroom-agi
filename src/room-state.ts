import type {GameState} from './types';
export function activeRoomLayerIds(s:GameState):string[]{
 return [...Array.from({length:6},(_,i)=>`cool-${i}`).filter(id=>s.upgrades.includes(id)),...(s.claw?['claw']:[])];
}
export function roomWorkerPanes(s:GameState):number{return s.claw?s.workers:0;}

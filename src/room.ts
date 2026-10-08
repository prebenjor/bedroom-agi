import type {GameState} from './types';
import {stage} from './engine';
import {STAGES} from './content';
import {ROOM_ART,OPTIONAL_ROOM_ASSETS,USED_CARD_ART,layerArt,type RoomArt,type RoomLayerArt} from './room-art';
import {activeRoomLayerIds,roomWorkerPanes} from './room-state';
type AssetStatus='loading'|'ready'|'error';
interface LoadedArt{image:HTMLImageElement;status:AssetStatus}
const cache=new Map<string,LoadedArt>();
function imageAsset(src:string):LoadedArt{
 let entry=cache.get(src);if(entry)return entry;
 const image=new Image();entry={image,status:'loading'};cache.set(src,entry);
 image.addEventListener('load',()=>{entry!.status=image.naturalWidth?'ready':'error';});
 image.addEventListener('error',()=>{entry!.status='error';});image.src=src;return entry;
}
function loadArtwork(){for(const art of ROOM_ART)imageAsset(art.src);for(const src of OPTIONAL_ROOM_ASSETS)imageAsset(src);imageAsset(USED_CARD_ART.src);}
interface Transition{state:GameState;prestige:number;active:Set<string>;starts:Map<string,number>}
let transitions=new WeakMap<HTMLCanvasElement,Transition>();
export function resetRoomTransitions(){transitions=new WeakMap();}
export function roomStatus(s:GameState){
 const index=stage(s),assetStatus=cache.get(ROOM_ART[index].src)?.status??'loading';
 const activeLayers=activeRoomLayerIds(s),layerAssets=activeLayers.map(id=>({id,status:cache.get(layerArt(id,index).src)?.status??'loading'}));
 return {stage:index,name:STAGES[index],assetStatus,loadedStages:ROOM_ART.filter(a=>cache.get(a.src)?.status==='ready').length,
  effectsActive:assetStatus==='ready'&&!s.reducedMotion&&s.jobs.length>0,activeLayers,layerAssets,workerPanes:roomWorkerPanes(s),hardwareVisual:s.gpu==='used'?'used-card':s.gpu==='none'?null:'stage-rig',hardwareAssetStatus:s.gpu==='used'?cache.get(USED_CARD_ART.src)?.status??'loading':null};
}
function layer(c:CanvasRenderingContext2D,art:RoomLayerArt,alpha:number){
 const loaded=imageAsset(art.src);if(loaded.status!=='ready')return;
 c.save();c.globalAlpha=alpha;if(art.clip){c.beginPath();c.rect(...art.clip);c.clip();}
 if(art.fullScene)c.drawImage(loaded.image,...art.rect);
 else{
  const [x,y,w,h]=art.rect,scale=Math.min(w/loaded.image.naturalWidth,h/loaded.image.naturalHeight),drawW=loaded.image.naturalWidth*scale,drawH=loaded.image.naturalHeight*scale;
  c.drawImage(loaded.image,x+(w-drawW)/2,y+h-drawH,drawW,drawH);
 }c.restore();
}
function effects(c:CanvasRenderingContext2D,art:RoomArt,s:GameState,time:number){
 const working=s.jobs.length>0,pulse=s.reducedMotion?0:(Math.sin(time/1400)+1)/2;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=working?.035+pulse*.035:.018;
 c.fillStyle='#beddf1';c.beginPath();art.screen.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 for(const [i,[x,y]] of art.lights.entries()){
  c.globalAlpha=working?.10+(s.reducedMotion?0:(Math.sin(time/900+i)+1)/2)*.22:.05;
  const glow=c.createRadialGradient(x,y,0,x,y,4);glow.addColorStop(0,art.lightColor);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(x-4,y-4,8,8);
 }c.restore();
}
function terminals(c:CanvasRenderingContext2D,art:RoomArt,s:GameState,time:number){
 const count=roomWorkerPanes(s);if(!count)return;
 const [tl,tr,br,bl]=art.screen;
 const p=(u:number,v:number):readonly[number,number]=>[(1-v)*(tl[0]+(tr[0]-tl[0])*u)+v*(bl[0]+(br[0]-bl[0])*u),(1-v)*(tl[1]+(tr[1]-tl[1])*u)+v*(bl[1]+(br[1]-bl[1])*u)];
 const quad=(u:number,v:number,w:number,h:number,fill:string)=>{c.fillStyle=fill;c.beginPath();[p(u,v),p(u+w,v),p(u+w,v+h),p(u,v+h)].forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();};
 c.save();quad(.03,.03,.94,.94,'#152b26');const columns=count===1?1:2,rows=count<=2?1:2;
 for(let i=0;i<count;i++){
  const x=.07+(i%columns)*(.88/columns),y=.07+Math.floor(i/columns)*(.88/rows),w=.80/columns,h=.80/rows;
  quad(x,y,w,h,'#274439');quad(x+.02,y+.02,w-.04,.05,'#b07b54');const activity=s.reducedMotion?.62:.47+Math.sin(time/1400+i)*.15;
  for(let line=0;line<4;line++)quad(x+.025,y+.12+line*(h-.15)/4,(w-.06)*(line===2?activity:.65),.014,'#aad192');
 }c.restore();
}
export function drawRoom(canvas:HTMLCanvasElement,s:GameState,time:number){
 loadArtwork();const ratio=Math.min(globalThis.devicePixelRatio||1,2),width=Math.round(720*ratio),height=Math.round(480*ratio);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 const c=canvas.getContext('2d');if(!c)return;c.setTransform(ratio,0,0,ratio,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.fillStyle='#eee6d7';c.fillRect(0,0,720,480);
 const index=stage(s),art=ROOM_ART[index],loaded=imageAsset(art.src),ids=activeRoomLayerIds(s),transitionIds=s.gpu==='used'?[...ids,'used-card']:ids;let t=transitions.get(canvas);
 if(!t||t.state!==s||t.prestige!==s.prestige){t={state:s,prestige:s.prestige,active:new Set(transitionIds),starts:new Map()};transitions.set(canvas,t);}
 else{for(const id of transitionIds)if(!t.active.has(id))t.starts.set(id,time);t.active=new Set(transitionIds);for(const id of t.starts.keys())if(!t.active.has(id)||time-t.starts.get(id)!>=200)t.starts.delete(id);}
 const opacity=(id:string)=>{const start=t!.starts.get(id);return s.reducedMotion||start===undefined?1:Math.max(0,Math.min(1,(time-start)/200));};
 const missing=ids.filter(id=>imageAsset(layerArt(id,index).src).status==='error');
 canvas.setAttribute('aria-label',art.description+(s.gpu==='used'?' '+USED_CARD_ART.description:'')+' '+ids.map(id=>layerArt(id,index).description).join(' ')+(s.claw?' The laptop shows '+s.workers+' active agent terminal'+(s.workers===1?'':'s')+'.':'')+(missing.length?' Some optional equipment artwork could not load; purchases remain active.':'')+(loaded.status==='error'?' The base artwork could not load; the game remains playable.':''));
 if(loaded.status==='ready'){
  c.drawImage(loaded.image,0,0,720,480);
  if(s.gpu==='used')layer(c,USED_CARD_ART,opacity('used-card'));
  for(const id of [...ids].sort((a,b)=>layerArt(a,index).order-layerArt(b,index).order)){
   layer(c,layerArt(id,index),opacity(id));
  }terminals(c,art,s,time);effects(c,art,s,time);
 }else{
  const first=imageAsset(ROOM_ART[0].src);if(first.status==='ready')c.drawImage(first.image,0,0,720,480);
  c.fillStyle='#eee6d7';c.fillRect(100,204,520,72);c.fillStyle='#514c3e';c.textAlign='center';c.font='20px Georgia, serif';
  c.fillText(loaded.status==='error'?'Bedroom artwork couldn’t load.':'Loading bedroom…',360,234);c.font='13px sans-serif';c.fillText(loaded.status==='error'?'Production and saves still work.':'Your game is ready to play.',360,256);
 }
}

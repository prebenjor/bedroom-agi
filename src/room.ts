import type {GameState} from './types';
import {stage} from './engine';
import {STAGES} from './content';
import {ROOM_ART,type RoomArt} from './room-art';

type AssetStatus='loading'|'ready'|'error';
interface LoadedArt {image:HTMLImageElement;status:AssetStatus}
const cache:LoadedArt[]=[];
function loadArtwork(){
 if(cache.length)return;
 for(const asset of ROOM_ART){
  const image=new Image(),entry:LoadedArt={image,status:'loading'};cache.push(entry);
  image.addEventListener('load',()=>{entry.status=image.naturalWidth?'ready':'error';});
  image.addEventListener('error',()=>{entry.status='error';});image.src=asset.src;
 }
}
export function roomStatus(s:GameState){
 const index=stage(s),assetStatus=cache[index]?.status??'loading';
 return {stage:index,name:STAGES[index],assetStatus,loadedStages:cache.filter(a=>a.status==='ready').length,
  effectsActive:assetStatus==='ready'&&!s.reducedMotion&&s.jobs.length>0};
}
function effects(c:CanvasRenderingContext2D,art:RoomArt,s:GameState,time:number){
 // Only the light changes. The painted scene never shifts or scales.
 const working=s.jobs.length>0,pulse=s.reducedMotion?0:(Math.sin(time/1400)+1)/2;
 c.save();c.globalCompositeOperation='screen';c.globalAlpha=working?.035+pulse*.035:.018;
 c.fillStyle='#beddf1';c.beginPath();art.screen.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
 for(const [i,led] of art.lights.entries()){
  c.globalAlpha=working?.10+(s.reducedMotion?0:(Math.sin(time/900+i)+1)/2)*.22:.05;
  const glow=c.createRadialGradient(led[0],led[1],0,led[0],led[1],4);
  glow.addColorStop(0,art.lightColor);glow.addColorStop(1,'transparent');c.fillStyle=glow;c.fillRect(led[0]-4,led[1]-4,8,8);
 }c.restore();
}
export function drawRoom(canvas:HTMLCanvasElement,s:GameState,time:number){
 loadArtwork();
 const ratio=Math.min(globalThis.devicePixelRatio||1,2),width=Math.round(720*ratio),height=Math.round(480*ratio);
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 const c=canvas.getContext('2d');if(!c)return;
 c.setTransform(ratio,0,0,ratio,0,0);c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.fillStyle='#eee6d7';c.fillRect(0,0,720,480);
 const index=stage(s),asset=ROOM_ART[index],loaded=cache[index];
 canvas.setAttribute('aria-label',asset.description+(loaded.status==='error'?' The artwork could not load; the game remains playable.':''));
 if(loaded.status==='ready'){c.drawImage(loaded.image,0,0,720,480);effects(c,asset,s,time);}
 else{
  if(cache[0].status==='ready')c.drawImage(cache[0].image,0,0,720,480);
  c.fillStyle='#eee6d7';c.fillRect(100,204,520,72);c.fillStyle='#514c3e';c.textAlign='center';c.font='20px Georgia, serif';
  c.fillText(loaded.status==='error'?'Bedroom artwork couldn’t load.':'Loading bedroom…',360,234);
  c.font='13px sans-serif';c.fillText(loaded.status==='error'?'Production and saves still work.':'Your game is ready to play.',360,256);
 }
}

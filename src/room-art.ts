import laptop from './assets/room-0.webp';
import purchases from './assets/room-1.webp';
import cables from './assets/room-2.webp';
import cooling from './assets/reactive/room-3-clean.webp';
import rack from './assets/reactive/room-4-clean.webp';
import excess from './assets/reactive/room-5-clean.webp';
import window0 from './assets/reactive/window-0.webp';
import window1 from './assets/reactive/window-1.webp';
import window2 from './assets/reactive/window-2.webp';
import window3 from './assets/reactive/window-3.webp';
import window4 from './assets/reactive/window-4.webp';
import window5 from './assets/reactive/window-5.webp';
import fan from './assets/props/fan.webp';
import caseFans from './assets/props/case-fans.webp';
import ac from './assets/props/ac.webp';
import liquid from './assets/props/liquid.webp';
import extractor from './assets/props/extractor.webp';
import claw from './assets/props/claw.webp';
import usedCard from './assets/icons/used.webp';

type Point=readonly [number,number];
export interface RoomArt {src:string;description:string;screen:readonly Point[];lights:readonly Point[];lightColor:string}
export type Rect=readonly [number,number,number,number];
export interface RoomLayerArt {src:string;description:string;rect:Rect;order:number;clip?:Rect;fullScene?:boolean}
const screen:readonly Point[]=[[125,164],[169,152],[191,211],[145,233]];
export const ROOM_ART:readonly RoomArt[]=[
 {src:laptop,screen,lights:[],lightColor:'#b6eaa1',description:'A drawn bedroom at night. A tired person in a green hoodie works at an old laptop beside a warm lamp. An unmade mustard-coloured bed, books, plants and laundry fill the small room.'},
 {src:purchases,screen,lights:[[194,329],[194,339]],lightColor:'#73e6e8',description:'The same bedroom and tired laptop user. Open GPU delivery boxes and packing material crowd the floor. A desktop PC sits under the desk; the unmade bed remains usable.'},
 {src:cables,screen,lights:[[190,330],[105,354],[670,297]],lightColor:'#c2ee79',description:'The same bedroom, now crowded with desktop PCs, a second monitor, discarded GPU packaging and cables crossing the rug. The person still works at the laptop beside the bed.'},
 {src:cooling,screen,lights:[[206,119],[218,157],[42,318]],lightColor:'#edb778',description:'The bedroom has glowing PCs and cables. The person has rolled up their sleeves. The windowsill plant is wilting; purchased cooling equipment is shown separately.'},
 {src:rack,screen,lights:[[623,154],[620,172],[622,206],[627,250],[631,317],[192,344]],lightColor:'#c4ed8b',description:'A large server rack takes over the right side of the bedroom and crowds out the bed. Thick cables cover the floor. The tired person works at the original laptop beside a wilted plant.'},
 {src:excess,screen,lights:[[603,152],[603,193],[604,228],[645,300],[681,341]],lightColor:'#c4ed8b',description:'Investor-funded equipment has overrun the same bedroom. Redundant server racks crowd out sleeping space, packaging and cables cover the floor, the plants are neglected, and a champagne bottle and unused blazer accompany the tired laptop user.'}
];
const windows=[window0,window1,window2,window3,window4,window5];
export const OPTIONAL_ROOM_ASSETS=[...windows,fan,caseFans,ac,liquid,extractor,claw];
export const USED_CARD_ART:RoomLayerArt={src:usedCard,description:'The used graphics card has arrived and sits on the floor beside the desk.',rect:[106,383,91,60],order:1};
export function layerArt(id:string,index:number):RoomLayerArt{
 const late=index===5;
 const layers:Record<string,RoomLayerArt>={
  'cool-0':{src:fan,description:'A purchased desk fan cools the equipment beside the laptop.',rect:[71,166,52,82],order:3},
  'cool-1':{src:windows[index],description:'The window is open to let the heat outside.',rect:[0,0,720,480],clip:late?[391,3,168,139]:[420,3,192,139],fullScene:true,order:0},
  'cool-2':{src:caseFans,description:'An extra case-fan assembly is fitted to the rig.',rect:late?[607,286,32,69]:index===4?[150,324,37,74]:[25,286,45,75],order:2},
  'cool-3':{src:ac,description:'A portable air conditioner occupies the floor beside the bed.',rect:late?[446,211,96,132]:[452,191,110,147],order:1},
  'cool-4':{src:liquid,description:'A liquid-cooling loop is fitted to the rig.',rect:late?[619,342,43,69]:index===4?[182,337,42,66]:[67,304,42,63],order:4},
  'cool-5':{src:extractor,description:'An industrial extractor and duct are mounted beside the window.',rect:late?[373,3,62,84]:[368,3,71,91],order:5},
  'claw':{src:claw,description:'A red mechanical USB claw sits on the front edge of the desk.',rect:[42,249,53,51],order:6}
 };return layers[id];
}

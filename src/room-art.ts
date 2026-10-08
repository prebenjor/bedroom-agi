import laptop from './assets/room-0.webp';
import purchases from './assets/room-1.webp';
import cables from './assets/room-2.webp';
import cooling from './assets/room-3.webp';
import rack from './assets/room-4.webp';
import excess from './assets/room-5.webp';

type Point=readonly [number,number];
export interface RoomArt {src:string;description:string;screen:readonly Point[];lights:readonly Point[];lightColor:string}
const screen:readonly Point[]=[[125,164],[169,152],[191,211],[145,233]];
export const ROOM_ART:readonly RoomArt[]=[
 {src:laptop,screen,lights:[],lightColor:'#b6eaa1',description:'A drawn bedroom at night. A tired person in a green hoodie works at an old laptop beside a warm lamp. An unmade mustard-coloured bed, books, plants and laundry fill the small room.'},
 {src:purchases,screen,lights:[[194,329],[194,339]],lightColor:'#73e6e8',description:'The same bedroom and tired laptop user. Open GPU delivery boxes and packing material crowd the floor. A desktop PC sits under the desk; the unmade bed remains usable.'},
 {src:cables,screen,lights:[[190,330],[105,354],[670,297]],lightColor:'#c2ee79',description:'The same bedroom, now crowded with desktop PCs, a second monitor, discarded GPU packaging and cables crossing the rug. The person still works at the laptop beside the bed.'},
 {src:cooling,screen,lights:[[206,119],[218,157],[42,318]],lightColor:'#edb778',description:'The overheated bedroom has glowing PCs, a desk fan and a portable air conditioner exhausting towards the window. The person has rolled up their sleeves. The windowsill plant is wilting.'},
 {src:rack,screen,lights:[[623,154],[620,172],[622,206],[627,250],[631,317],[192,344]],lightColor:'#c4ed8b',description:'A large server rack takes over the right side of the bedroom and crowds out the bed. Thick cables cover the floor. The tired person works at the original laptop; cooling equipment and a wilted plant remain.'},
 {src:excess,screen,lights:[[603,152],[603,193],[604,228],[645,300],[681,341]],lightColor:'#c4ed8b',description:'Investor-funded equipment has overrun the same bedroom. Redundant server racks crowd out sleeping space, packaging and cables cover the floor, the plants are neglected, and a champagne bottle and unused blazer accompany the tired laptop user.'}
];

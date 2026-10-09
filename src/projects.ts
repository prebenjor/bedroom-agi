import type {GameState,Project} from './types';

export const PROJECT_BUILD_SECONDS=120;
export const PROJECTS:Project[]=[
 {id:'tiny-game',name:'Tiny game',description:'Make a small browser game for a friend. The brief fits in one message.',cost:25,unlock:180,rewardLabel:'+$50 starting cash on every future funding reset.',decisions:[
  {prompt:'Your friend wants to play on the bus. How does the character move?',options:[
   {id:'arrows',label:'Arrow keys',description:'A keyboard version for the laptop crowd.',feature:'Keyboard controls',feedback:'Your friend played it at home instead. They still missed their stop thinking about the high score.'},
   {id:'tap',label:'Tap to jump',description:'One large touch target for a moving bus.',feature:'Touch controls',feedback:'It works with one thumb. Your friend has discovered a useful way to miss their stop.'}]},
  {prompt:'What keeps a five-minute game worth opening again?',options:[
   {id:'personal-best',label:'Save a personal best',description:'Remember the score on this device.',feature:'Saved personal best',feedback:'The score survives closing the tab. Your friend has become their own least reasonable opponent.'},
   {id:'daily-level',label:'A daily level',description:'A shared seed changes the course each day.',feature:'Daily seeded level',feedback:'Everyone gets the same course. The group chat now contains defensible excuses.'}]}]},
 {id:'photo-organiser',name:'Photo organiser',description:'Help your family find their photos without scrolling past every screenshot.',cost:80,unlock:600,rewardLabel:'All future jobs run 2% faster.',decisions:[
  {prompt:'The holiday folder contains three years and forty receipts. Where do you start?',options:[
   {id:'dates',label:'Group by date',description:'Use photo timestamps to make a timeline.',feature:'Date-based albums',feedback:'The holidays have dates again. The receipts have reluctantly joined the correct tax year.'},
   {id:'folders',label:'Keep named folders',description:'Preserve the family’s existing album names.',feature:'Named album folders',feedback:'“Actual holiday FINAL” remains a valid album. Familiarity wins the first support call.'}]},
  {prompt:'Two copies of the same sunset appear. What should the app do?',options:[
   {id:'preview',label:'Show a comparison',description:'Let someone review duplicates before removing them.',feature:'Duplicate comparison',feedback:'Your family picked the sharper sunset. Both copies of the blurry dog were kept.'},
   {id:'hide-copies',label:'Hide extra copies',description:'Keep originals on disk and show one in the album.',feature:'Reversible duplicate hiding',feedback:'The album is shorter. No one has to explain why a beloved blurry dog disappeared.'}]}]},
 {id:'stock-tracker',name:'Stock tracker',description:'Track what a local shop has on the shelf. No prediction of the future required.',cost:250,unlock:1200,rewardLabel:'All future job payouts increase by 2%.',decisions:[
  {prompt:'The shop already counts stock at closing. How do the numbers get in?',options:[
   {id:'csv',label:'Import their spreadsheet',description:'Read the daily CSV they already export.',feature:'CSV stock import',feedback:'The closing routine keeps its spreadsheet. Your app has avoided becoming one more closing task.'},
   {id:'quick-count',label:'A quick count form',description:'Use large quantity fields beside each product.',feature:'Quick stock entry',feedback:'The owner entered six boxes with one hand. The other hand remained available for the shop cat.'}]},
  {prompt:'How does the owner know it is time to order more?',options:[
   {id:'threshold',label:'Set minimum levels',description:'Flag products below a chosen stock count.',feature:'Low-stock thresholds',feedback:'The red list contains things the shop needs, which is a pleasant change for a red list.'},
   {id:'weekly-list',label:'Make a weekly order list',description:'Collect low items into a printable list.',feature:'Weekly order sheet',feedback:'The order list fits next to the till. Nobody has asked it for a strategic vision.'}]}]},
 {id:'invoice-helper',name:'Invoice helper',description:'Turn a freelancer’s notes into invoices they can check and send.',cost:750,unlock:1800,rewardLabel:'Future cloud request fees decrease by 2%.',decisions:[
  {prompt:'The work notes say “website stuff, three afternoons”. What should the draft show?',options:[
   {id:'line-items',label:'Separate line items',description:'Break the notes into editable tasks and hours.',feature:'Editable itemised invoices',feedback:'The client can see what happened. “Website stuff” has acquired a modest paper trail.'},
   {id:'summary',label:'A simple project total',description:'Keep a short description and one agreed price.',feature:'Project-total invoices',feedback:'The invoice matches the quote. Nobody needs to audit the afternoon spent fixing the printer.'}]},
  {prompt:'An invoice is overdue. How should the helper follow up?',options:[
   {id:'reminder',label:'Draft a reminder',description:'Prepare a polite message for the freelancer to send.',feature:'Reviewable payment reminders',feedback:'The reminder says the payment is late. The freelancer no longer has to write around that fact.'},
   {id:'dashboard',label:'Show unpaid invoices',description:'Keep due dates and unpaid totals on one screen.',feature:'Payment status dashboard',feedback:'The unpaid work is visible. It is less cheerful than the earnings chart, but more useful.'}]}]},
 {id:'backup-tool',name:'Backup tool',description:'Give a neighbour a backup they can restore, including the folder they forgot existed.',cost:2000,unlock:2700,rewardLabel:'Future local job electricity costs decrease by 5%.',decisions:[
  {prompt:'Which files should the first backup include?',options:[
   {id:'folders',label:'Choose important folders',description:'Let the neighbour select documents and photos.',feature:'Selected-folder backups',feedback:'The family photos are included. The downloads folder is spared its moment of public assessment.'},
   {id:'home-folder',label:'Back up the home folder',description:'Include everything, with an exclusion list.',feature:'Whole-home backups',feedback:'The forgotten folder is safe too. Three installers from 2017 have also received a new lease on life.'}]},
  {prompt:'A green check says the copy worked. How will they know the backup is useful?',options:[
   {id:'restore',label:'Practise restoring a file',description:'Guide them through one real restore.',feature:'Guided restore test',feedback:'The file came back. The green check now has evidence behind it.'},
   {id:'verify',label:'Verify every saved file',description:'Compare checksums and show the backup contents.',feature:'Verified backup contents',feedback:'Every saved file matches. Your neighbour has learned that a checksum is reassuringly boring.'}]}]},
 {id:'community-website',name:'Community website',description:'Build a small site for a local group whose current website is a pinned message.',cost:5000,unlock:3600,rewardLabel:'+1 valuation on every future funding round.',decisions:[
  {prompt:'People visit to find out what is happening. What goes on the front page?',options:[
   {id:'events',label:'Upcoming events',description:'Put dates, places, and accessibility details first.',feature:'Accessible event calendar',feedback:'Someone found the right hall on their first try. The group calls this a successful launch.'},
   {id:'directory',label:'Useful local contacts',description:'Collect opening hours and contact details.',feature:'Local contact directory',feedback:'The repair café’s phone number is now findable. The café would still prefer you brought the broken toaster.'}]},
  {prompt:'A volunteer needs to update the site next month. How do they do it?',options:[
   {id:'simple-form',label:'A short editing form',description:'Use plain fields for dates, names, and details.',feature:'Volunteer editing form',feedback:'The next event went up without your help. A volunteer has quietly removed you from the critical path.'},
   {id:'text-file',label:'An editable text file',description:'Keep the content in one documented file.',feature:'Documented text-file content',feedback:'The next volunteer found the instructions. The website has survived a committee handover.'}]}]}
];

export function projectBenefits(s:GameState){
 const done=(id:string)=>s.projects.completed.some(p=>p.id===id);
 return {startingCash:done('tiny-game')?50:0,speed:done('photo-organiser')?1.02:1,payout:done('stock-tracker')?1.02:1,cloudFee:done('invoice-helper')?.98:1,localElectricity:done('backup-tool')?.95:1,valuation:done('community-website')?1:0};
}

export function projectStatus(s:GameState){
 const progress=s.projects.active;if(!progress)return null;
 const project=PROJECTS.find(p=>p.id===progress.id);if(!project)return null;
 const phase=progress.remaining>0?'building' as const:'decision' as const;
 return {project,progress,phase,remaining:progress.remaining,decision:phase==='decision'?project.decisions[progress.choices.length]??null:null};
}

import type {Model,Business,GPU,Upgrade,Harness,Perk,News} from './types';
export const MODELS:Model[]=[
 {id:'starter',name:'Free chatbot',company:'A browser tab',tag:'FREE',description:'No invoice yet. They’re still working out what you’ll tolerate.',speed:1,value:1,cost:0,quality:1,vram:0,unlock:0},
 {id:'gemini',name:'Gemini-ish Flash',company:'Google',tag:'CLOUD',description:'Pay Google to write the page Google will summarise instead of sending anyone to.',speed:1.5,value:1.25,cost:1,quality:1.4,vram:0,unlock:60},
 {id:'gpt',name:'GPT-ish Plus',company:'OpenAI',tag:'CLOUD',description:'OpenAI calls it empowering workers. Your client calls it cancelling a freelance contract.',speed:1.2,value:1.8,cost:3.5,quality:1.8,vram:0,unlock:350},
 {id:'claude',name:'Claude-ish Opus',company:'Anthropic',tag:'CLOUD',description:'Won’t say “fuck.” Will help draft the email replacing the support department.',speed:.9,value:2.7,cost:9,quality:3,vram:0,unlock:1800},
 {id:'grok',name:'Grok-ish Unfiltered',company:'xAI',tag:'CLOUD',description:'Elon wanted a chatbot without a boss. It has one very obvious boss.',speed:1.8,value:1.7,cost:4,quality:2.1,vram:0,unlock:4000},
 {id:'local-7b',name:'Basement 7B',company:'Your own machine',tag:'LOCAL',description:'No API bill. You still need a card, electricity, and something to say.',speed:1.1,value:1.5,cost:0,quality:1.5,vram:6,unlock:500},
 {id:'local-14b',name:'Basement 14B',company:'Your own machine',tag:'LOCAL',description:'Runs in your bedroom. The training data didn’t grow here.',speed:.85,value:2,cost:0,quality:2.2,vram:12,unlock:5000},
 {id:'local-70b',name:'Basement 70B',company:'Your own machine',tag:'LOCAL',description:'You escaped the cloud. NVIDIA would like to congratulate you on your purchase.',speed:.6,value:3.1,cost:0,quality:3,vram:48,unlock:40000}
];
export const BUSINESSES:Business[]=[
 {id:'seo',name:'SEO articles',icon:'¶',description:'Outrank the person who actually tested the toaster.',payout:7,duration:8,scale:1,quality:0,unlock:0},
 {id:'linkedin',name:'LinkedIn posts',icon:'in',description:'Write the CEO’s post about layoffs. Save him a copywriter, too.',payout:26,duration:36,scale:2,quality:1,unlock:550},
 {id:'images',name:'Engagement bait',icon:'✳',description:'Fake a disaster. Sell the concern to advertisers.',payout:115,duration:54,scale:5,quality:1.4,unlock:5500},
 {id:'video',name:'Synthetic videos',icon:'▷',description:'A whole film crew’s work, without the annoying bit where they get paid.',payout:510,duration:84,scale:12,quality:2.1,unlock:52000}
];
export const GPUS:GPU[]=[
 {id:'used',name:'Used 4 GB card',description:'Finished mining coins. Starts mining other people’s work.',cost:400,vram:4,speed:.8,watts:110},
 {id:'mid',name:'8 GB bargain',description:'You bought it to avoid a subscription. Don’t calculate the payback yet.',cost:1600,vram:8,speed:1.1,watts:180},
 {id:'good',name:'12 GB workhorse',description:'The model runs locally. The electricity bill arrives locally, too.',cost:7000,vram:12,speed:1.45,watts:260},
 {id:'big',name:'24 GB monster',description:'NVIDIA’s idea of democratisation requires a very expensive card.',cost:24000,vram:24,speed:1.9,watts:420},
 {id:'double',name:'Dual 24 GB rig',description:'A second GPU. Your bed is now a shelf.',cost:75000,vram:48,speed:2.4,watts:850},
 {id:'rack',name:'96 GB bedroom rack',description:'The landlord asked about the heat. You sent him a sustainability deck.',cost:190000,vram:96,speed:3,watts:1700}
];
const upgradeNames={
 speed:['Saved prompts','Batch queue','Keyboard macros','Parallel requests','Token trimming','No more thinking'],
 pay:['Better headlines','Fake expertise','Premium templates','Brand partnerships','Enterprise pricing','Sell the methodology'],
 cool:['Desk fan','Open the window','Actual case fans','Portable AC','Liquid cooling','Industrial extractor'],
 reach:['Auto hashtags','Scheduled posts','Cross-posting','Bot followers','Content syndication','Own the entire feed']
};
const upgradeCopy={
 speed:['Keep the brief. Skip reading it next time.','Enough articles to bury someone’s actual research before breakfast.','The repetitive work is gone. Your wrists remain unemployed.','Four requests at once. The power meter has noticed.','Delete the disclaimers. Keep the confidence.','Turn off reasoning. Clients were paying for the tone anyway.'],
 pay:['Put “I tested” in the title. You didn’t.','A medical-sounding byline costs less than medical school.','Replace the freelancer’s invoice with a monthly licence.','An AI course buys ad space on your AI article. Neither mentions a customer.','Charge extra for someone they can blame when it goes wrong.','Sell a course before anyone asks whether the business works.'],
 cool:['The card gets the fan. You get the heat.','The neighbour can hear your productivity breakthrough.','The brochure said efficient. It didn’t say quiet.','Use more electricity to remove the heat from using electricity.','Your machines get a reliable water supply. The plant gets forgotten.','Vent it outside. The problem is now somebody else’s air.'],
 reach:['Add “future of work” to the post about redundancies.','By morning, you’ll have made the internet worse in six time zones.','Publish everywhere before anyone checks the first version.','Buy the applause. Investors rarely click the profiles.','Syndicate the story until the original reporting can’t be found.','Search has six million answers. All of them cite you.']
};
const upgradePrices={speed:[40,220,1800,9000,38000,140000],pay:[65,350,2200,11000,48000,190000],cool:[150,650,3000,15000,60000,230000],reach:[120,700,4500,23000,90000,350000]};
export const UPGRADES:Upgrade[]=(['speed','pay','cool','reach'] as const).flatMap(kind=>upgradeNames[kind].map((name,rank)=>({id:`${kind}-${rank}`,name,description:upgradeCopy[kind][rank],cost:upgradePrices[kind][rank],kind,rank})));
export const HARNESS:Harness[]=[
 {id:'quantization',name:'Quantization',description:'Halves VRAM when needed; payout falls 18%. The sales page calls it “no meaningful difference.”',cost:300},
 {id:'routing',name:'Model routing',description:'Choose models by cost or margin. Brand loyalty is an expensive setting.',cost:800},
 {id:'retries',name:'Retry limits',description:'25% less agent overhead. Stop charging yourself for repeated failure.',cost:1200},
 {id:'memory',name:'Persistent memory',description:'12% more payout. The brief survives longer than your client’s staff do.',cost:3200},
 {id:'context',name:'Context cleanup',description:'12% faster jobs. Remove the company values from a task that needs a caption.',cost:5500},
 {id:'coordination',name:'One agent in charge',description:'45% less agent overhead. Even the fake office had too many managers.',cost:11000},
 {id:'fallback',name:'Budget fallback',description:'Use an affordable model when the current one can’t run. Includes the free chatbot.',cost:18000},
 {id:'cache',name:'Response cache',description:'20% lower running costs. Charge a new client for the old answer; call it reuse in the climate report.',cost:36000},
 {id:'supervisor',name:'Delete the supervisor',description:'18% faster jobs. The cost-cutting finally reached management.',cost:65000}
];
export const PERKS:Perk[]=[
 {id:'cash',name:'Friends & family money',description:'Start with $500. “Anyone can build this” assumes someone lent them money.',cost:2,tier:1},
 {id:'auto',name:'Inherited scripts',description:'Start with automatic production. Your origin story can leave this part out.',cost:2,tier:1},
 {id:'margin',name:'Confident invoicing',description:'Permanent 20% payout increase. They’ve already fired the person who could price the work.',cost:3,tier:1},
 {id:'cooling',name:'A room with a window',description:'Permanent extra cooling. No patent, keynote, or cooling subscription required.',cost:2,tier:1},
 {id:'gpu',name:'Hardware write-off',description:'Start with the 8 GB rig. Your old card becomes a drawer problem.',cost:3,tier:1},
 {id:'speed',name:'Move fast',description:'Permanent 20% faster production. Checking the damage remains somebody else’s job.',cost:3,tier:1},
 {id:'claw',name:'An agent guy',description:'Start with SlopClaw installed. His consultancy has one employee and fourteen agents.',cost:3,tier:2},
 {id:'workers',name:'Unpaid cofounder',description:'Start with a second worker. Automation has made the unpaid internship much easier to scale.',cost:3,tier:2},
 {id:'cheap',name:'Volume discount',description:'Permanent 25% lower operating costs. Large customers get discounts; everyone else gets a price update.',cost:3,tier:2},
 {id:'reach',name:'Purchased audience',description:'Permanent 25% payout increase. Your community comes with an invoice.',cost:3,tier:2},
 {id:'local',name:'Own your weights',description:'Local jobs run 30% faster. You own the model; the people it learned from still get nothing here.',cost:4,tier:2},
 {id:'valuation',name:'Creative accounting',description:'Earn 50% more valuation at the next raise. Count the savings at companies you haven’t sold to.',cost:4,tier:2}
];
const newsRows: [string,string,string?,number?][]=[
 ['A future for everyone','“Everyone will benefit from AGI. We’re starting with everyone who owns shares.”','Sam Altman'],
 ['The efficiency keynote','“This card uses less power per task. Excellent reason to buy an entire warehouse of them.”','Jensen Huang'],
 ['Safe enough for payroll','“We take the risks very seriously. The support department can clear its desks on Friday.”','Dario Amodei'],
 ['A gift from Meta','“The weights are free. You provide the electricity, the debugging, and the reason we released them.”','Mark Zuckerberg'],
 ['Google would like to help','“Please keep making useful websites. We need something to put above the links to your useful websites.”','Sundar Pichai'],
 ['Freedom of expression','“Grok can disagree with anyone. If it disagrees with me, that’s a bug.”','Elon Musk'],
 ['Your review outranks the reviewer','Someone spent a week testing twelve toasters. Your article took twelve seconds. Their photos looked useful, so you used those too.'],
 ['A writer emails you','Your article sounds like hers. You start typing “the model did it,” then remember whose bank account got paid.'],
 ['The free trial ends','The price changes after you’ve built the whole workflow around it. Moving your business is apparently a feature of the premium plan.'],
 ['A note from next door','The neighbour works nights and can hear your fans through the wall. You’d send an apology, but the rig is using the cheap overnight tariff.'],
 ['The benchmark presentation','The model won on the tasks the company chose. The slide about replacing staff does not mention this.'],
 ['The first cancelled contract','A client sends you the brief they used to send a freelancer. “Great news,” they write. They mean for themselves.'],
 ['A newer model arrives','Your old model still works. Its name now has “legacy” next to it, which is cheaper than explaining the upgrade.'],
 ['The local forum has a solution','Spend another $6,000 to escape Big Tech. They’ve included an NVIDIA shopping link and a lecture about independence.'],
 ['The client wants a human touch','Their editor was made redundant last week. They ask if you can add warmth for the same price.'],
 ['The fake flood performs well','Someone asks where to donate. Your engagement dashboard marks their comment as positive sentiment.'],
 ['The agents hold a meeting','Three models debate how to cut request costs. The meeting is billed per token.'],
 ['A job advert gets updated','The company wants AI experience, five years in the role, and half the previous salary. Apparently the tools make you more valuable.'],
 ['The town hall meeting','Residents ask about the data centre’s water use. The company’s answer is a drawing of a leaf.'],
 ['A story about your success','The interviewer asks what problem you solve. You talk about your revenue until they stop asking.'],
 ['The seed round photo','The photographer crops out the takeaway boxes. The investor asks for the photo before asking for the accounts.',undefined,1],
 ['Your competitive advantage','The client deleted its in-house knowledge base after buying your service. Switching away will be a bastard. Your deck calls this retention.',undefined,1],
 ['A leadership post goes viral','The CEO thanks the team for working tirelessly. You wrote it from the brief announcing which team members are leaving.',undefined,1],
 ['Enterprise deployment','They’ve replaced the junior staff with your agents. The senior staff now spend evenings fixing the agents. Those hours aren’t on the savings slide.',undefined,1],
 ['An ethics advisor joins','She asks who gets hurt. The board asks whether that has to be in the public version.',undefined,1],
 ['The reskilling programme','The people whose jobs were cut can buy a course on selling AI services to people whose jobs are about to be cut.',undefined,1],
 ['Your sustainability report','You count the paper you didn’t print. The rack’s electricity sits in a different spreadsheet.',undefined,1],
 ['A delivery of better cards','The old GPUs work fine. You stack them beside the recycling leaflet and order faster ones.',undefined,1],
 ['Making intelligence accessible','“We want everyone to have access. Finance wants everyone to have a subscription.”','Sam Altman',1],
 ['Responsible deployment approved','The chatbot refuses a rude word in the redundancy email. Replace it with “right-sizing” and everything passes.',undefined,1],
 ['The board wants another market','Schools still have librarians. Hospitals still have receptionists. The board circles both as costs it hasn’t reached yet.',undefined,2],
 ['The bed has to go','The second rack needs that space. You sleep badly, but the company’s wellness post is scheduled for nine.',undefined,2],
 ['The acquisition closes','You buy the company that checks AI output. Your sales team can now certify its own bullshit.',undefined,2],
 ['An efficient industry','“Energy per token is down. Total demand is up. The first sentence fits on the stage backdrop.”','Jensen Huang',2],
 ['The human remains in the loop','“One person can now supervise the work of fifty. We haven’t asked that person how it’s going.”','Dario Amodei',2],
 ['Open for the common good','“Artists made the culture. We made it downloadable. I think that makes us even.”','Mark Zuckerberg',2],
 ['A better search experience','“The visitor no longer needs to leave Google. We assume the websites will find some other reason to exist.”','Sundar Pichai',2],
 ['A forecast from the boss','“The bots will do everyone’s jobs. Everyone will still buy things. Don’t interrupt the forecast with that question.”','Elon Musk',2],
 ['The IPO prospectus','The accounts include revenue, assets, and projected growth. The job losses and waste go in the voluntary report, due sometime after the float.',undefined,2],
 ['The final demonstration','AGI rewrites your LinkedIn bio. The editor who used to do this is watching the livestream between job applications. Your investors applaud.',undefined,2]
];
export const NEWS:News[]=newsRows.map(([title,text,speaker,tier],i)=>({id:`event-${i}`,title,text,speaker,tier:tier??0,effect:i%5===0?'cost':i%3===0?'demand':'none',multiplier:i%5===0?1.12:i%3===0?1.15:1}));
export const LOGS=[
 'Published before anyone with relevant experience saw it.',
 'The client approved the savings. Nobody approved the article.',
 'Changed “layoffs” to “a new chapter.”',
 'A safety filter checked the tone. The business model passed untouched.',
 'Spent $4.18 deciding which agent should write the caption.',
 'Added a human byline. Human not included.',
 'The source asked for credit. The template had no field for it.',
 'A bot liked the post about authentic connection.',
 'Someone clicked an ad while looking for an answer.',
 'Licensed a stock photo of the kind of team this replaces.',
 'The sustainability post needed another GPU pass.',
 'Summarised the reporting. Removed the reporter’s name.',
 'The citation leads to another one of your pages.',
 'Made a disaster image. Comments are asking if everyone’s okay.',
 'The warning label got less engagement. Left it off.',
 'The invoice went out before the fact check.',
 'A correction started an argument. Good day for ad revenue.',
 'The client’s editor would have caught that. The client no longer has an editor.',
 'The CEO’s heartfelt statement is ready for his assistant to post.',
 'Sold an expert guide without speaking to an expert.',
 'Found a freelancer’s portfolio in the reference material.',
 'An agent recommended a second agent. Request costs increased.',
 'The automated review approved the automated review.',
 'Changed “staff cuts” to “capacity unlocked.”',
 'The meter is turning. The output is a caption.',
 'Closed the window to keep the fan noise away from the call.',
 'Generated footage instead of booking the crew.',
 'The client asks if the synthetic actor needs a usage fee. No.',
 'Deleted the draft explaining where the data came from.',
 'A client said “cheaper than the agency.” Kept that for the pitch.',
 'The model’s apology uses more tokens than the correction.',
 'Anthropic’s manners survived the brief. The contractor’s job didn’t.',
 'Cut the boilerplate. The claim is still unsupported.',
 'The benchmark went up. Customer complaints stayed put.',
 'A founder calls this the future of work. His children have trust funds.',
 'Dinner at the desk. The rack gets its own cooling budget.',
 'A podcast says ordinary people can do this. The host sells the course.',
 'Downloaded weights trained on work you didn’t commission.',
 'Ran locally. Brought this up before anyone asked.',
 'The model invented a source. It looked expensive enough to trust.',
 'Asked for evidence. Got a more confident paragraph.',
 'A subscription renewed. The customer hasn’t logged in for months.',
 'Scheduled the wellness post for the staff who stayed late fixing this.',
 'Wrote “our people come first” from a redundancy brief.',
 'Turned the layoff announcement into employer-brand content.',
 'The client wants to sound approachable. Their support number is gone.',
 'Google gets another page to summarise.',
 'Your hosting bill still needs actual visitors.',
 'The agents spent the budget discussing budget discipline.',
 'Produced a buying guide for products nobody here has touched.',
 'The SEO score is perfect. The answer is wrong.',
 'Rewrote the press release about reducing headcount.',
 'Meta’s free model needs a card you definitely paid for.',
 'Rendered a fake factory tour. No need to visit the factory.',
 'The investor wants projected savings. Added salaries you don’t pay.',
 'Printed the green pledge. Put it under the dripping cooling tube.',
 'A customer asks who checks the work. Updated the About page.',
 'NVIDIA gets paid whether this business works or not.',
 'The water for the plant went into the cooling loop.',
 'You could stop for the night. The dashboard makes that feel like losing.'
];
export const STAGES=['A laptop and a desk','The hardware has arrived','Cables across the floor','Cooling the machines, heating the room','The rack crowds the bed','Growth has made living here worse'];
export const FUNDING=['Seed Round','Series A','IPO'];
export const TARGETS=[2500000,5800000,7500000];
export const WORKER_PRICES=[0,8000,18000,55000];

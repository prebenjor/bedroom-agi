import type {Model,Business,GPU,Upgrade,Harness,Perk,News,Workflow} from './types';
export const BASE_SPEED=1;
export const CLAW_UNLOCK=900;
export const CLAW_COST=650;
// Fictional request prices per job, multiplied by the business scale. These are not vendor token rates.
export const MODELS:Model[]=[
 {id:'starter',name:'Free Trial & Error',company:'A browser tab',tag:'FREE',description:'The free tier forgets the brief. The client will assume that was your choice.',specialties:['seo'],speed:1,value:1,cost:0,quality:1,vram:0,unlock:0},
 {id:'gemini',name:'Gemoney Flash',company:'Google',tag:'CLOUD',description:'Write a cheap page for Google to summarise above your link. Volume is the remaining business plan.',specialties:['seo'],fit:{seo:{speed:1.35,payout:1.1}},speed:1.05,value:1.15,cost:1,quality:1.8,vram:0,unlock:60},
 {id:'gpt-mini',name:'ChatGDP Mini',company:'OpenAI',tag:'CLOUD',description:'Five stars, two sentences, no time spent touching the product. The small invoice is the feature.',specialties:['reviews'],fit:{reviews:{speed:1.25,payout:1.35},seo:{speed:.6,payout:.8}},speed:1.8,value:1.25,cost:1.8,quality:1.8,vram:0,unlock:150},
 {id:'gpt',name:'ChatGDP Plus',company:'OpenAI',tag:'CLOUD',description:'Turn the product brief into a glowing review, then charge separately for the glowing advert.',specialties:['reviews','ads'],fit:{reviews:{speed:1.4,payout:1.45},ads:{speed:1.3,payout:1.65}},speed:1.15,value:1.65,cost:4,quality:2.4,vram:0,unlock:350},
 {id:'claude',name:'Clawed Opus',company:'Anthropic',tag:'CLOUD',description:'A careful tone for the deck announcing careless cuts. The manners cost extra on every request.',specialties:['linkedin','ebooks','decks'],fit:{linkedin:{speed:1.8,payout:2},ebooks:{speed:1.45,payout:2.3},decks:{speed:1.6,payout:2.6}},speed:.8,value:1.6,cost:14,quality:3.3,vram:0,unlock:1800},
 {id:'grok',name:'Grok Bottom',company:'xAI',tag:'CLOUD',description:'The provocative post is ready. Any resemblance to the owner’s opinions is excellent brand alignment.',specialties:['linkedin','images'],fit:{linkedin:{speed:2,payout:2.2},images:{speed:1.7,payout:1.7}},speed:1.3,value:1.35,cost:6,quality:2.3,vram:0,unlock:4000},
 {id:'deepseek',name:'DeepShill',company:'DeepSeek',tag:'CLOUD',description:'A whole expert guide for the price of a short apology. Nobody budgeted for the expert.',specialties:['ebooks'],fit:{ebooks:{speed:1.8,payout:1.7}},speed:1.15,value:1.4,cost:2.5,quality:2.6,vram:0,unlock:7000},
 {id:'claude-sonnet',name:'Clawed Sonnet',company:'Anthropic',tag:'CLOUD',description:'Keeps the chapter headings consistent. The author biography remains an imaginative exercise.',specialties:['ebooks'],fit:{ebooks:{speed:2.2,payout:2.4}},speed:1.1,value:1.5,cost:8,quality:2.8,vram:0,unlock:12000},
 {id:'gemini-ultra',name:'Gemoney Ultra',company:'Google',tag:'CLOUD',description:'The expensive sibling makes the ad campaign sound inevitable. Media spend is somebody else’s problem.',specialties:['ads','decks'],fit:{ads:{speed:2,payout:2.8},decks:{speed:1.5,payout:2.8}},speed:.9,value:2,cost:18,quality:3.3,vram:0,unlock:24000},
 {id:'gpt-boardroom',name:'ChatGDP Boardroom',company:'OpenAI',tag:'CLOUD',description:'Generate the investor deck and the confidence behind it. Evidence is still a separate department.',specialties:['decks'],fit:{decks:{speed:2.15,payout:3.5}},speed:.65,value:1.7,cost:20,quality:3.1,vram:0,unlock:25000},
 {id:'midjourney',name:'Midlife Journey',company:'Midjourney',tag:'CLOUD',description:'Turns the photographer’s portfolio into reference material. Your invoice calls the result original.',specialties:['images','ads'],fit:{images:{speed:2.6,payout:2.6},ads:{speed:1.5,payout:2.5}},speed:1,value:1.5,cost:10,quality:3,vram:0,unlock:5500},
 {id:'sora',name:'Slora',company:'OpenAI',tag:'CLOUD',description:'The film crew is replaced by a progress bar. It still sends an invoice for every take.',specialties:['video'],fit:{video:{speed:2.6,payout:3.5}},speed:.7,value:1.8,cost:28,quality:3.3,vram:0,unlock:52000},
 {id:'local-7b',name:'Llamateur 7B',company:'Your rig (Meta-inspired)',tag:'LOCAL',description:'The weights are free. The card and electricity have declined to join that offer.',specialties:['seo','reviews'],fit:{seo:{speed:1.15,payout:1.1},reviews:{speed:1.15,payout:1.2}},speed:1.4,value:1.5,cost:0,quality:1.8,vram:6,unlock:500},
 {id:'local-14b',name:'Llamateur 14B',company:'Your rig (Meta-inspired)',tag:'LOCAL',description:'Enough memory for the CEO’s heartfelt post. The cooling fan supplies the emotion.',specialties:['linkedin','ads'],fit:{linkedin:{speed:1.4,payout:1.7},ads:{speed:1.35,payout:1.6}},speed:1.05,value:2,cost:0,quality:2.4,vram:12,unlock:5000},
 {id:'local-32b',name:'Llamateur 32B',company:'Your rig (Meta-inspired)',tag:'LOCAL',description:'A book-length answer fits in twenty-four gigabytes. Its sources still fit nowhere.',specialties:['ebooks','decks'],fit:{ebooks:{speed:1.85,payout:1.8},decks:{speed:1.35,payout:1.5}},speed:.9,value:2.5,cost:0,quality:2.9,vram:24,unlock:16000},
 {id:'local-70b',name:'Llamateur 70B',company:'Your rig (Meta-inspired)',tag:'LOCAL',description:'You escaped the API invoice. NVIDIA congratulates you on the hardware order.',specialties:['decks','video'],fit:{decks:{speed:1.8,payout:2},video:{speed:1.8,payout:1.8}},speed:.85,value:3.1,cost:0,quality:3.3,vram:48,unlock:40000}
];
export const BUSINESSES:Business[]=[
 {id:'seo',name:'SEO articles',icon:'¶',description:'Outrank the writer who actually tested the toaster. Then complain about search quality.',payout:7,duration:8,scale:1,quality:0,unlock:0},
 {id:'reviews',name:'Fake product reviews',icon:'★',description:'Five stars from someone who has never opened the box. The affiliate link works fine.',payout:25,duration:49,scale:2,quality:1,unlock:150},
 {id:'linkedin',name:'LinkedIn posts',icon:'in',description:'Write the CEO’s heartfelt layoff post. The copywriter’s contract is in the same announcement.',payout:40,duration:92,scale:3,quality:1.4,unlock:550},
 {id:'ads',name:'Ad copy',icon:'↗',description:'Replace the agency with twelve slogans and an invoice. Call the savings a creative breakthrough.',payout:85,duration:105,scale:5,quality:1.8,unlock:1800},
 {id:'images',name:'Engagement bait',icon:'✳',description:'Fake a flood, collect concerned comments, sell the traffic. Nobody asked where to donate.',payout:180,duration:400,scale:8,quality:2,unlock:5500},
 {id:'ebooks',name:'Ebooks',icon:'▤',description:'Sell a guide from an expert who does not exist. The person who wrote the sources gets exposure.',payout:450,duration:390,scale:16,quality:2.2,unlock:16000},
 {id:'decks',name:'Corporate pitch decks',icon:'▥',description:'Turn guessed savings into a chart. The people being replaced become the addressable market.',payout:700,duration:470,scale:24,quality:2.6,unlock:30000},
 {id:'video',name:'Synthetic videos',icon:'▷',description:'A whole crew’s work without the crew’s invoice. The model provider still wants its money.',payout:1100,duration:650,scale:35,quality:2.8,unlock:52000}
];
export const GPUS:GPU[]=[
 {id:'used',name:'Used 4 GB card',description:'The seller says it only mined crypto on weekends. There were a lot of weekends.',cost:120,vram:4,speed:.8,watts:110},
 {id:'mid',name:'8 GB bargain',description:'Own the hardware outright. Keep paying the power company.',cost:600,vram:8,speed:1.1,watts:180},
 {id:'good',name:'12 GB workhorse',description:'Enough memory to keep a small agency’s old workload humming under your desk.',cost:1800,vram:12,speed:1.45,watts:260},
 {id:'big',name:'24 GB monster',description:'Jensen’s leather jacket has a better margin than your business.',cost:7000,vram:24,speed:1.9,watts:420},
 {id:'double',name:'Dual 24 GB rig',description:'Two cards occupy the space where you used to put your feet.',cost:24000,vram:48,speed:2.4,watts:850},
 {id:'rack',name:'96 GB bedroom rack',description:'The landlord asked for a fire certificate. You offered him equity.',cost:80000,vram:96,speed:3,watts:1700}
];
const upgradeNames={
 speed:['Saved prompts','Batch queue','Keyboard macros','Parallel requests','Token trimming','No more thinking'],
 pay:['Better headlines','Fake expertise','Premium templates','Brand partnerships','Enterprise pricing','Sell the methodology'],
 cool:['Desk fan','Open the window','Actual case fans','Portable AC','Liquid cooling','Industrial extractor'],
 reach:['Auto hashtags','Scheduled posts','Cross-posting','Bot followers','Content syndication','Own the entire feed']
};
const upgradeCopy={
 speed:['Keep a copy of the brief. Reading the next one becomes optional.','Queue a week’s articles before the reporter finishes the first interview.','One key now performs your entire contribution to the project.','Send four requests at once. The utility company supports your ambition.','Remove the caveats that make the answer more expensive.','Clients asked for confident prose. You can stop paying for the thinking.'],
 pay:['“Hands-on review” looks good above a product you’ve never held.','Put “Dr.” in the byline. The template doesn’t check qualifications.','Buy the format once and rent it to every client.','The sponsor sells an AI course. Your readers are the syllabus.','Add a procurement meeting and another zero to the invoice.','Package the workflow as a course while it still looks like a secret.'],
 cool:['Point it at the GPU. Your own sweat doesn’t affect production.','Export the fan noise to the neighbour’s bedroom.','A respectable amount of airflow for a deeply unreasonable desk.','Buy a second machine to fight the heat from the first.','Give the computer the water you keep forgetting to give the plant.','A duct through the wall makes the room somebody else’s emissions.'],
 reach:['Attach “people first” to the client’s restructuring announcement.','Publish through the night. You’ll wake up to a worse internet and a better balance.','Copy the post to every platform that will accept it.','The investor wants an audience. The invoice includes 10,000 of them.','Make enough copies to outrank the article you copied.','Flood the results until finding an independent source takes a second search.']
};
const upgradePrices={speed:[40,220,1800,9000,38000,140000],pay:[65,350,2200,11000,48000,190000],cool:[150,650,3000,15000,60000,230000],reach:[120,700,4500,23000,90000,350000]};
export const UPGRADES:Upgrade[]=(['speed','pay','cool','reach'] as const).flatMap(kind=>upgradeNames[kind].map((name,rank)=>({id:`${kind}-${rank}`,name,description:upgradeCopy[kind][rank],cost:upgradePrices[kind][rank],kind,rank})));
export const WORKFLOWS:Workflow[]=[
 {id:'workflow-seo',name:'Article batches',description:'Queue related articles together. New SEO jobs finish 25% faster.',business:'seo',cost:110,effect:'speed',multiplier:1.25},
 {id:'workflow-reviews',name:'Review bundles',description:'Reuse the product brief. Cloud request fees for reviews fall 25%.',business:'reviews',cost:300,effect:'request',multiplier:.75},
 {id:'workflow-linkedin',name:'Monthly retainer',description:'Sell a month of heartfelt posts in advance. LinkedIn jobs pay 25% more.',business:'linkedin',cost:900,effect:'payout',multiplier:1.25},
 {id:'workflow-ads',name:'Reusable campaign assets',description:'Keep the campaign brief. Cloud request fees for ad copy fall 20%.',business:'ads',cost:2000,effect:'request',multiplier:.8},
 {id:'workflow-images',name:'Reusable image assets',description:'Keep the style references. Cloud request fees for images fall 25%.',business:'images',cost:4800,effect:'request',multiplier:.75},
 {id:'workflow-ebooks',name:'Editorial templates',description:'Reuse the chapter structure. Ebook jobs finish 25% faster.',business:'ebooks',cost:14000,effect:'speed',multiplier:1.25},
 {id:'workflow-decks',name:'Brand kit',description:'Every slide already has a logo. Pitch decks finish 20% faster.',business:'decks',cost:28000,effect:'speed',multiplier:1.2},
 {id:'workflow-video',name:'Scene library',description:'Reuse the scenery. Cloud request fees for videos fall 25%.',business:'video',cost:52000,effect:'request',multiplier:.75}
];
export const HARNESS:Harness[]=[
 {id:'quantization',name:'Quantization',description:'Halve VRAM when a model won’t fit; earn 18% less. The brochure rounds that down to “negligible.”',cost:300},
 {id:'routing',name:'Model routing',description:'Choose by cost or profit. None of the CEOs need your loyalty.',cost:800},
 {id:'retries',name:'Retry limits',description:'Cut agent overhead by 25%. Put a spending limit on the apology loop.',cost:1200},
 {id:'memory',name:'Persistent memory',description:'Earn 12% more. Remember the brief after the company deletes its own knowledge base.',cost:3200},
 {id:'context',name:'Context cleanup',description:'Finish jobs 12% faster. A caption doesn’t need the founder’s life story.',cost:5500},
 {id:'coordination',name:'One agent in charge',description:'Cut agent overhead by 45%. Stop paying four models to nominate a fifth.',cost:11000},
 {id:'fallback',name:'Budget fallback',description:'Switch to a model you can run and afford, including the free chatbot.',cost:18000},
 {id:'cache',name:'Response cache',description:'Cut running costs by 20%. Reuse the answer; keep the new-client price.',cost:36000},
 {id:'supervisor',name:'Delete the supervisor',description:'Finish jobs 18% faster. Management discovers the efficiency programme applies upstairs.',cost:65000}
];
export const PERKS:Perk[]=[
 {id:'cash',name:'Friends & family money',description:'Start with $500. Mention the bedroom in interviews; leave out the loan.',cost:2,tier:1},
 {id:'auto',name:'Inherited scripts',description:'Start with automatic production. A useful head start for a self-made founder.',cost:2,tier:1},
 {id:'margin',name:'Confident invoicing',description:'Earn 20% more permanently. Procurement lost the employee who knew what this should cost.',cost:3,tier:1},
 {id:'cooling',name:'A room with a window',description:'Get permanent extra cooling. Your next pitch can call it passive infrastructure.',cost:2,tier:1},
 {id:'gpu',name:'Hardware write-off',description:'Start with the 8 GB rig. Keep the receipt for the tax story.',cost:3,tier:1},
 {id:'speed',name:'Move fast',description:'Finish jobs 20% faster permanently. Leave the corrections for the client.',cost:3,tier:1},
 {id:'claw',name:'An agent guy',description:'Start with SlopClaw. His one-person consultancy bills for a department.',cost:3,tier:2},
 {id:'workers',name:'Unpaid cofounder',description:'Start with a second worker. Offer it the same equity your human cofounder never got.',cost:3,tier:2},
 {id:'cheap',name:'Volume discount',description:'Pay 25% less permanently. A large customer is a valued partner; a small one gets the new rates.',cost:3,tier:2},
 {id:'reach',name:'Purchased audience',description:'Earn 25% more permanently. Tell the investor the community grew organically.',cost:3,tier:2},
 {id:'local',name:'Own your weights',description:'Local jobs run 30% faster. The artists in the training set still don’t have a royalty button.',cost:4,tier:2},
 {id:'valuation',name:'Creative accounting',description:'Earn 50% more valuation at each raise. Include projected customers in actual-looking charts.',cost:4,tier:2}
];
const newsRows: [string,string,string?,number?][]=[
 ['A future for everyone','“AGI will make everyone wealthy. We’ve organised the first everyone into a holding company.”','Sam Altman'],
 ['The efficiency keynote','“Each task uses less electricity. Order enough cards and we can make that irrelevant.”','Jensen Huang'],
 ['Safe enough for payroll','“Our safety work is thorough. The decision to remove your support team arrived in a separate email.”','Dario Amodei'],
 ['A gift from Meta','“The weights are free. Hardware, power and a product strategy are your contribution to open source.”','Mark Zuckerberg'],
 ['Google would like to help','“Keep publishing useful websites. Our answer box needs fresh material.”','Sundar Pichai'],
 ['Freedom of expression','“Grok is free to disagree with anybody on the planet. I’ll personally review the exceptions.”','Elon Musk'],
 ['Your review outranks the reviewer','A reviewer bought twelve toasters and tested them for a week. Your page copied the findings and took the first search result. You’ve added an affiliate link.'],
 ['A writer emails you','She recognises a passage from her book. You draft a reply blaming the model, then pause at the payment notification.'],
 ['The free trial ends','The provider raises prices once every part of your workflow depends on it. The migration guide begins with a sales call.'],
 ['A note from next door','Your neighbour works nights. The fans run hardest during the cheap overnight tariff. Their note is underneath your electricity savings spreadsheet.'],
 ['The benchmark presentation','The test used tasks chosen by the vendor. The client takes a photo of the slide titled “Headcount opportunity.”'],
 ['The first cancelled contract','Your new client forwards a freelancer’s old brief, including the freelancer’s rates. You undercut them by $5 and send it back.'],
 ['A newer model arrives','The old one still works. The vendor puts a grey “legacy” badge beside it and a green upgrade button below.'],
 ['The local forum has a solution','A thread on escaping Big Tech ends with a $6,000 NVIDIA shopping list. The author has an affiliate code.'],
 ['The client wants a human touch','They cut their editor last week. Today’s brief asks for the warmth, judgement and attention she used to supply. No budget change.'],
 ['The fake flood performs well','Someone asks where to send donations. Your dashboard counts the comment as engagement. You leave the image up.'],
 ['The agents hold a meeting','Three models discuss whether three models are necessary. You are charged for the minutes.'],
 ['A job advert gets updated','The employer adds AI proficiency to the requirements and removes $20,000 from the salary. The advert still describes a competitive package.'],
 ['The town hall meeting','Residents ask how much water the data centre will use. The presenter enlarges the leaf on slide seven.'],
 ['A story about your success','The interviewer asks who benefits from your product. You open the revenue chart again.'],
 ['The seed round photo','The investor asks the photographer to get the laptop logo in shot. Nobody has opened the accounts yet.',undefined,1],
 ['Your competitive advantage','The client deletes its internal knowledge base after signing. Your pitch now calls the effort of leaving “excellent retention.”',undefined,1],
 ['A leadership post goes viral','The CEO’s tribute to his tireless team gets 4,000 likes. You wrote it from a spreadsheet of the people being laid off.',undefined,1],
 ['Enterprise deployment','Junior roles disappear. Senior staff fix agent errors after hours. Finance records the salary savings and has no field for the overtime.',undefined,1],
 ['An ethics advisor joins','Her report names the people harmed by the rollout. The board asks for a version investors can skim without discomfort.',undefined,1],
 ['The reskilling programme','The company offers its departing staff a discount on an AI course. The course belongs to a board member.',undefined,1],
 ['Your sustainability report','You report the paper saved by going digital. The rack’s electricity bill is filed under operations, where the green chart won’t look.',undefined,1],
 ['A delivery of better cards','The old cards still work. A courier leaves the new ones beside the box marked “electronics recycling” from six months ago.',undefined,1],
 ['Making intelligence accessible','“We want intelligence in every household. The recurring billing team shares that vision.”','Sam Altman',1],
 ['Responsible deployment approved','The filter blocks a rude word in the layoff email. You substitute “right-sizing” and the safety indicator turns green.',undefined,1],
 ['The board wants another market','The market research lists school libraries and hospital reception desks. The board highlights the salary column.',undefined,2],
 ['The bed has to go','A second rack takes the bed’s place. You approve the client’s workplace wellness post from the floor.',undefined,2],
 ['The acquisition closes','You buy the company that certifies AI output. Sales adds “independently verified” to the website before changing the ownership notice.',undefined,2],
 ['An efficient industry','“Energy per token is down. Total consumption is up. I’d like the first statistic in a much larger font.”','Jensen Huang',2],
 ['The human remains in the loop','“One person can supervise fifty agents. We’ve put the word ‘human’ on the diagram, so the staffing question is settled.”','Dario Amodei',2],
 ['Open for the common good','“Artists contributed a century of work. We contributed a download button. This feels like a fair partnership.”','Mark Zuckerberg',2],
 ['A better search experience','“Users can get answers without visiting websites. The websites will presumably carry on out of enthusiasm.”','Sundar Pichai',2],
 ['A forecast from the boss','“The robots do every job. People keep buying our products. Please save the income question for a different presentation.”','Elon Musk',2],
 ['The IPO prospectus','Revenue gets an audited table. Job losses and discarded hardware get a voluntary report scheduled for after the float.',undefined,2],
 ['The final demonstration','AGI updates your LinkedIn bio during a livestream. Investors applaud. The editor who used to write it has sent you three unanswered invoices.',undefined,2]
];
export const NEWS:News[]=newsRows.map(([title,text,speaker,tier],i)=>({id:`event-${i}`,title,text,speaker,tier:tier??0,effect:i%5===0?'cost':i%3===0?'demand':'none',multiplier:i%5===0?1.12:i%3===0?1.15:1}));
export const LOGS=[
 'Published while the fact-checker’s quote sat unopened.',
 'The client signed off the saving before reading the article.',
 'Filed the redundancies under “an exciting new chapter.”',
 'Safety check passed. Nobody asked who gets paid.',
 'Four agents and $4.18 later, the caption says “big news.”',
 'Attached a human byline from the dropdown.',
 'The source requested credit. You archived the email.',
 'Bought twelve likes for the post about authentic connection.',
 'An ad interrupted somebody’s search for an answer.',
 'The team photo is licensed stock. The team has been cut.',
 'Ran the sustainability caption through the GPU again.',
 'The summary is shorter once you remove the reporter’s name.',
 'Every citation leads to a site you own.',
 'Donations requested beneath your fabricated flood photo.',
 'Removed the disclosure after an engagement comparison.',
 'Invoiced immediately. Fact check scheduled for later.',
 'A public correction doubled the ad impressions.',
 'The client asks who will edit this now.',
 'The CEO’s heartfelt words are in his assistant’s posting queue.',
 'Finished the expert guide without calling an expert.',
 'Used the freelancer’s portfolio as a style reference.',
 'An agent recommends expanding the agent budget.',
 'Both automated reviewers agree with the first automated reviewer.',
 'Changed the subject line to “unlocking capacity.”',
 'The power meter spins through another caption.',
 'Muted the call while the fans drowned out the client.',
 'The crew’s cancelled shoot is now a render queue.',
 'The client asks whether the synthetic actor has an agent.',
 'Removed the paragraph about the training data.',
 'Saved “cheaper than the agency” for the testimonials page.',
 'The apology is longer than the faulty answer.',
 'Anthropic’s chatbot sends the replacement plan in impeccable prose.',
 'The unsupported claim fits better without caveats.',
 'Customer complaints didn’t make the benchmark slide.',
 'A founder describes his family-funded risk as courage.',
 'Ate dinner next to a rack with a larger cooling budget.',
 'The podcast host sells the course mentioned in every episode.',
 'Downloaded a model trained on invoices nobody paid.',
 'Mentioned local inference twice during an unrelated call.',
 'The invented source has a convincing journal title.',
 'Requested evidence. The second answer adds “certainly.”',
 'Renewed a subscription the customer forgot they had.',
 'Scheduled a wellness post while the client’s staff fixed the output.',
 '“Our people come first” opens the redundancy announcement.',
 'The layoff email now doubles as recruitment content.',
 'Added warmth to the website that removed its support number.',
 'Published fresh material for Google’s answer box.',
 'The hosting invoice doesn’t accept impressions on Google.',
 'Budget review consumed the agents’ remaining budget.',
 'Ranked ten products by the descriptions on their boxes.',
 'Perfect SEO score. The recipe contains no oven temperature.',
 'The press release congratulates management for the staff cuts.',
 'Meta’s free weights are downloading to your paid-for card.',
 'Rendered the factory tour from three promotional photos.',
 'Added hypothetical salary savings to the investor deck.',
 'The green pledge is drying beside the cooling leak.',
 'A customer asks who checks the work. You send the About page.',
 'NVIDIA’s payment cleared before your first sale.',
 'Refilled the cooling loop. Forgot the plant again.',
 'Kept working because the graph had just started going up.'
];
export const STAGES=['A laptop and a desk','The hardware has arrived','Cables across the floor','Cooling the machines, heating the room','The rack crowds the bed','Growth has made living here worse'];
export const FUNDING=['Seed Round','Series A','IPO'];
export const TARGETS=[700000,1000000,1300000];
export const WORKER_PRICES=[0,2400,9000,27000];

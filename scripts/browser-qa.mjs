import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {MODELS,BUSINESSES,WORKFLOWS} from '../src/content.ts';
import {createGame,dispatch,quote} from '../src/engine.ts';
import {PROJECTS} from '../src/projects.ts';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.qa');fs.mkdirSync(root,{recursive:true});
const base=process.env.BEDROOM_URL??'http://127.0.0.1:4180/';
const browser=await chromium.launch({headless:true,...(process.env.BEDROOM_BROWSER?{executablePath:process.env.BEDROOM_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:path.join(root,name+'.png'),fullPage:true});};
const closeDrawer=async()=>{if(await page.locator('#drawer').evaluate(d=>d.open)){await page.locator('#close-drawer').click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).ui.drawer===null);}};
const open=async name=>{await closeDrawer();await page.locator('[data-drawer="'+name+'"]:visible').first().click();assert.equal((await state()).ui.drawer,name);return page.locator('[data-drawer-panel="'+name+'"]');};
const expand=async name=>{const details=page.locator('#catalogue-'+name);if(await details.count()&&!await details.evaluate(d=>d.open)){await details.locator('summary').click();await page.waitForFunction(name=>JSON.parse(window.render_game_to_text()).ui.disclosures['catalogue-'+name]===true,name);}};
const importState=async s=>{
 await closeDrawer();await page.locator('#settings').click();await page.locator('#save-text').fill(JSON.stringify({version:1,savedAt:Date.now(),state:s}));
 await page.locator('#import-save').click();await page.locator('#confirm-import').click();
};
try{
 await page.goto(base);await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 assert.equal((await state()).cash,15);
 const generate=await page.locator('#generate').boundingBox();assert.ok(generate&&generate.y>=0&&generate.y+generate.height<=844,'Generate must be visible on the initial phone screen');
 assert.ok(generate.height>=44,'Generate must have a usable touch target');
 assert.equal(await page.locator('#projects-entry').isVisible(),false,'Projects must not crowd the fresh phone screen');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile-initial');
 await page.locator('#generate').tap();await step(20000);await page.locator('#generate').tap();await step(20000);
 await page.locator('#automate').tap();assert.equal((await state()).auto,true);await step(180000);assert.ok((await state()).slop>=12);
 await page.setViewportSize({width:1366,height:768});
 let panel=await open('Models');await expand('Models');assert.equal(await panel.locator('[data-action=model]').count(),16);await shot('models');
 assert.equal(await panel.locator('.model-card:visible').count(),16,'Expanded catalogue must expose all sixteen models');
 for(const m of MODELS){
  const row=panel.locator('#model-'+m.id);assert.match(await row.locator('[id$=-specialties]').textContent(),/Best for:/);
  for(const id of m.specialties)assert.ok((await row.locator('[id$=-specialties]').textContent()).includes(BUSINESSES.find(b=>b.id===id).name),m.id+' specialty');
 }
 const model=panel.locator('[data-action=model][data-id=gemini]');await model.focus();
 const drawerScroll=await page.locator('#drawer-body').evaluate(el=>{el.scrollTop=120;return el.scrollTop;});
 await page.evaluate(()=>{window.__qaFocused=document.activeElement;});await step(650);
 assert.ok(await page.evaluate(()=>document.activeElement===window.__qaFocused),'Simulation must keep the same focused control');
 assert.equal(await page.locator('#drawer-body').evaluate(el=>el.scrollTop),drawerScroll,'Simulation must keep drawer scroll');
 assert.equal(await page.locator('#catalogue-Models').evaluate(d=>d.open),true,'Simulation must keep disclosures open');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).ui.drawer===null&&document.activeElement?.dataset.drawer==='Models');assert.equal((await state()).ui.drawer,null);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.drawer),'Models','Escape should return focus to the drawer opener');
 // The business picker opens only after a second business unlocks.
 if((await state()).runEarned<150)await step(180000);
 panel=await open('Businesses');await expand('Businesses');assert.equal(await panel.locator('[data-action=business]').count(),8);assert.equal(await panel.locator('.business-card:visible').count(),8);await shot('businesses');
 const legacy=JSON.parse(fs.readFileSync(new URL('../tests/fixtures/legacy-v1.json',import.meta.url),'utf8')).state;
 await importState(legacy);assert.equal(await page.locator('#purchase-feedback').isVisible(),false);let old=await state();assert.equal(old.cash,legacy.cash);
 assert.deepEqual(old.jobs.map(({remaining,...j})=>j),legacy.jobs.map(({remaining,...j})=>j));
 await step(6000);old=await state();assert.equal(old.jobs.length,0);assert.equal(old.runEarned,7102.96);assert.equal(old.cash,legacy.cash+56.160000000000004+46.8);
 const expanded=createGame();Object.assign(expanded,{cash:1000000,runEarned:1000000,gpu:'big',model:'local-32b',business:'ebooks',workers:2,claw:true,reducedMotion:true});
 const expected=quote(expanded,'local-32b','ebooks');assert.equal(dispatch(expanded,{type:'generate'}).ok,true);
 await importState(expanded);panel=await open('Models');await expand('Models');
 const selected=panel.locator('#model-local-32b');assert.equal(await selected.locator('[data-action=model]').getAttribute('aria-pressed'),'true');
 assert.match(await selected.locator('[id$=-price]').textContent(),/running cost \/ job.*payout/i);
 assert.match(await panel.locator('#model-gpt-price').textContent(),/request \/ job.*payout/i);
 let diagnostics=await state();assert.equal(diagnostics.catalogue.models,16);assert.equal(diagnostics.catalogue.businesses,8);
 assert.equal(diagnostics.modelDetails.selected.id,'local-32b');assert.deepEqual(diagnostics.modelDetails.selected.specialties,MODELS.find(m=>m.id==='local-32b').specialties);
 assert.equal(diagnostics.modelDetails.selected.quote.cost,expected.cost);assert.equal(diagnostics.modelDetails.selected.quote.payout,expected.payout);
 assert.equal(diagnostics.modelDetails.rows.length,16);
 for(const row of diagnostics.modelDetails.rows)assert.ok(row.quote.duration>0&&row.quote.payout>0&&Number.isFinite(row.quote.net));
 await closeDrawer();await page.locator('#settings').click();const expandedDownload=page.waitForEvent('download');await page.locator('#export-save').click();await expandedDownload;
 const expandedExport=JSON.parse(await page.locator('#save-text').inputValue()).state;assert.equal(expandedExport.model,'local-32b');assert.equal(expandedExport.business,'ebooks');
 assert.deepEqual(expandedExport.jobs.map(({remaining,...j})=>j),expanded.jobs.map(({remaining,...j})=>j));await page.locator('#dialog [data-close]').click();
 await importState(expandedExport);await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 diagnostics=await state();assert.equal(diagnostics.model,'local-32b');assert.equal(diagnostics.business,'ebooks');assert.equal(diagnostics.cash,expandedExport.cash);
 assert.deepEqual(diagnostics.jobs.map(({remaining,...j})=>j),expandedExport.jobs.map(({remaining,...j})=>j));
 panel=await open('Rig');await expand('Rig');assert.equal(await panel.locator('[data-action=gpu]').count(),6);await closeDrawer();
 await page.locator('#settings').click();await page.locator('#save-text').fill('{');await page.locator('#import-save').click();assert.match(await page.locator('#save-result').textContent(),/read.*save/i);assert.equal(await page.locator('#confirmation').evaluate(d=>d.open),false);await page.locator('#dialog [data-close]').click();
 const workflowSetup=createGame();Object.assign(workflowSetup,{cash:5000,runEarned:100000,model:'gpt-mini',business:'reviews'});
 await importState(workflowSetup);const originalRequest=(await state()).modelDetails.selected.quote.cost;panel=await open('Upgrades');
 await panel.locator('[data-action=workflow][data-id=workflow-reviews]').click();
 const workflow=WORKFLOWS.find(w=>w.id==='workflow-reviews');assert.equal((await state()).cash,5000-workflow.cost);
 assert.equal((await state()).modelDetails.selected.quote.cost,originalRequest*.75);assert.ok((await state()).workflows.includes(workflow.id));
 await closeDrawer();await page.locator('#generate').click();assert.equal((await state()).jobs[0].cost,originalRequest*.75);
 const projectSetup=createGame();Object.assign(projectSetup,{cash:20000,runEarned:100000,totalSeconds:4000,auto:true,reducedMotion:true});
 await importState(projectSetup);await step(1000);await page.setViewportSize({width:390,height:844});panel=await open('Projects');
 assert.equal(await panel.locator('.project-card').count(),6);
 for(const [index,project] of PROJECTS.entries()){
  const card=panel.locator('#project-'+project.id);await card.locator('[data-action=project-start]').click();
  for(let decision=0;decision<2;decision++){
   const option=project.decisions[decision].options[(index+decision)%2],button=card.locator('[data-action=project-choice][data-id="'+option.id+'"]');
   const box=await button.boundingBox();assert.ok(box&&box.height>=44,'Project choices need phone-sized touch targets');
   await button.click();assert.equal((await state()).projects.active.choices[decision],option.id);
   assert.equal((await state()).workers,1);assert.equal((await state()).model,'starter');assert.equal((await state()).gpu,'none');
   assert.equal(await button.isVisible(),false,'Answered decision must leave the building view');
   await page.evaluate(()=>{window.__projectFocus=document.activeElement;});await step(60000);
   assert.ok(await page.evaluate(()=>document.activeElement===window.__projectFocus),'Building updates must preserve focus');
   if(index===0&&decision===0)await shot('project-building-phone');
   await step(60000);
   if(decision===0){assert.equal((await state()).projects.active.remaining,0);await step(300000);assert.equal((await state()).projects.active.choices.length,1,'Elapsed time must not answer a project decision');}
  }
  assert.ok((await state()).projects.completed.some(p=>p.id===project.id));
 }
 assert.equal((await state()).projects.completed.length,6);const projectCollection={active:null,completed:(await state()).projects.completed};await shot('projects-complete-phone');
 await closeDrawer();assert.equal(await page.locator('#project-collection button:visible').count(),6);await shot('collection-phone');
 await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');assert.equal((await state()).projects.completed.length,6);
 await page.setViewportSize({width:1366,height:768});panel=await open('Projects');await shot('projects-complete');
 await closeDrawer();const {simulate}=await import('./balance.ts');const checkpoints=simulate('mixed').checkpoints;
 // Cancelling destructive confirmations keeps Settings and pasted data intact.
 await page.locator('#settings').click();const pasted=JSON.stringify({version:1,savedAt:Date.now(),state:checkpoints[0]});await page.locator('#save-text').fill(pasted);
 await page.evaluate(()=>{window.__qaTextarea=document.querySelector('#save-text');});await page.locator('#import-save').click();await page.locator('#confirmation [data-close]').click();
 assert.equal(await page.locator('#dialog').evaluate(d=>d.open),true);assert.equal(await page.locator('#save-text').inputValue(),pasted);
 assert.ok(await page.evaluate(()=>document.querySelector('#save-text')===window.__qaTextarea));assert.equal(await page.evaluate(()=>document.activeElement.id),'import-save');
 await page.locator('#reset-save').click();await page.locator('#confirmation [data-close]').click();assert.equal(await page.locator('#save-text').inputValue(),pasted);assert.equal(await page.evaluate(()=>document.activeElement.id),'reset-save');await page.locator('#dialog [data-close]').click();
 await importState(checkpoints[0]);panel=await open('Rig');await expand('Rig');if((await state()).gpu!=='rack')await panel.locator('[data-action=gpu][data-id=rack]').click();assert.equal((await state()).vram,96);
 panel=await open('Models');await expand('Models');await panel.locator('[data-action=model][data-id=local-70b]').click();assert.equal((await state()).model,'local-70b');assert.equal((await state()).routing,'manual');await step(180000);
 assert.ok((await state()).jobs.reduce((n,j)=>n+j.vram,0)<=96);
 panel=await open('Agents');assert.match(await panel.textContent(),/SlopClaw runs the workers/);const routing=panel.locator('[data-action=harness][data-id=routing]');if(await routing.isVisible()&&await routing.isEnabled()){await routing.click();assert.equal(await page.evaluate(()=>document.activeElement?.dataset.id),'manual');}await panel.locator('[data-action=routing][data-id=local]').click();assert.equal((await state()).routing,'local');await shot('local-rack');
 const cloudSetup=createGame();Object.assign(cloudSetup,{cash:10000,runEarned:100000,claw:true,workers:4,auto:true,gpu:'mid',model:'grok'});
 await importState(cloudSetup);await step(1000);panel=await open('Agents');assert.match(await panel.locator('#agent-usage').textContent(),/4 cloud jobs.*0 local jobs.*0 \/ 8 GB/);assert.match(await panel.locator('#agent-models').textContent(),/Grok Bottom/);await shot('agents-cloud');
 panel=await open('Rig');assert.match(await panel.locator('#rig-usage').textContent(),/cloud jobs.*aren’t using this GPU/);assert.equal(await panel.locator('#rig-watts').textContent(),'Idle');
 const mixedSetup={...cloudSetup,jobs:[],routing:'local',harness:['routing']};await importState(mixedSetup);await step(1000);panel=await open('Agents');assert.match(await panel.locator('#agent-usage').textContent(),/3 cloud jobs.*1 local job.*6 \/ 8 GB/);assert.match(await panel.locator('#agent-models').textContent(),/Llamateur 7B/);await shot('agents-mixed');
 await page.setViewportSize({width:390,height:844});await shot('agents-phone');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 for(const choice of await panel.locator('[data-action=routing]').all()){const box=await choice.boundingBox();assert.ok(box&&box.height>=44,'Routing choices need phone-sized touch targets');}
 panel=await open('Rig');await shot('rig-phone');assert.match(await panel.locator('#rig-usage').textContent(),/6.*8/);await page.setViewportSize({width:1366,height:768});
 panel=await open('Models');await expand('Models');const manual=panel.locator('[data-action=model][data-id=starter]');assert.match(await manual.textContent(),/stop routing/i);await manual.click();assert.equal((await state()).routing,'manual');assert.equal((await state()).model,'starter');
 await importState({...checkpoints[0],cash:0,jobs:[],model:'claude',business:'seo',routing:'manual',harness:checkpoints[0].harness.filter(id=>id!=='fallback')});
 assert.equal((await state()).ui.productionStatus,'paused');await page.locator('#recover').click();await step(30000);assert.ok((await state()).cash>0);
 for(let i=0;i<3;i++){
  await importState({...checkpoints[i],projects:projectCollection});assert.equal((await state()).prestige,i);panel=await open('Funding');assert.equal((await state()).funding.eligible,true);
  await shot('funding-'+i);await panel.locator('[data-action=raise]').click();await page.locator('#confirm-raise').click();
  assert.equal((await state()).prestige,i+1);assert.equal((await state()).gpu,checkpoints[i].perks.includes('gpu')?'mid':'none');assert.equal((await state()).runEarned,0);
  assert.equal((await state()).projects.completed.length,6,'Funding must retain the project collection');assert.equal((await state()).cash,(checkpoints[i].perks.includes('cash')?500:15)+50);
  if(i===2){assert.equal((await state()).ending,true);assert.match(await page.locator('#dialog-body').textContent(),/Rewrote Your LinkedIn Bio/);await shot('ending');await page.locator('#dialog [data-close]').click();}
 }
 await closeDrawer();await step(20000);assert.ok((await state()).slop>0);
 await page.locator('#settings').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export-save').click();await downloadPromise;const exported=await page.locator('#save-text').inputValue();assert.equal(JSON.parse(exported).state.prestige,3);
 await page.locator('#motion-toggle').check();await page.locator('#sound-toggle').check();await page.locator('#dialog [data-close]').click();
 await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');assert.equal((await state()).prestige,3);if(await page.locator('#dialog').evaluate(d=>d.open))await page.locator('#dialog [data-close]').click();
 await page.locator('#settings').click();assert.equal(await page.locator('#motion-toggle').isChecked(),true);assert.equal(await page.locator('#sound-toggle').isChecked(),true);await page.locator('#dialog [data-close]').click();
 await page.setViewportSize({width:390,height:844});await shot('mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#settings').click();await page.locator('#reset-save').click();await page.locator('#confirmation [data-close]').click();assert.equal((await state()).prestige,3);
 await page.locator('#reset-save').click();await page.locator('#confirm-reset').click();assert.equal((await state()).prestige,0);await shot('overview');
 const invalidContext=await browser.newContext(),invalidPage=await invalidContext.newPage();await invalidPage.addInitScript(()=>localStorage.setItem('bedroom-agi-v1','{broken'));await invalidPage.goto(base);await invalidPage.waitForFunction(()=>typeof window.render_game_to_text==='function');
 await invalidPage.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});assert.equal(await invalidPage.evaluate(()=>localStorage.getItem('bedroom-agi-v1')),'{broken');await invalidContext.close();
 assert.deepEqual(errors,[]);console.log('Browser QA passed: phone controls, catalogues, workflow spending and actual quotes, six two-stage projects and keepsakes, retained rewards across funding/reload, legacy snapshots, save export/import, automation, stable focus, routing, recovery, three raises, ending and invalid-save preservation. No browser errors.');
}finally{await browser.close();}

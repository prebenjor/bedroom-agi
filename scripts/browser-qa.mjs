import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.qa');fs.mkdirSync(root,{recursive:true});
const base=process.env.BEDROOM_URL??'http://127.0.0.1:4180/';
const browser=await chromium.launch({headless:true,...(process.env.BEDROOM_BROWSER?{executablePath:process.env.BEDROOM_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const step=ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=name=>page.screenshot({path:path.join(root,name+'.png'),fullPage:true});
const closeDrawer=async()=>{if(await page.locator('#drawer').evaluate(d=>d.open)){await page.locator('#close-drawer').click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).ui.drawer===null);}};
const open=async name=>{await closeDrawer();await page.locator('[data-drawer="'+name+'"]').first().click();assert.equal((await state()).ui.drawer,name);return page.locator('[data-drawer-panel="'+name+'"]');};
const expand=async name=>{const details=page.locator('#catalogue-'+name);if(await details.count()&&!await details.evaluate(d=>d.open))await details.locator('summary').click();};
const importState=async s=>{
 await closeDrawer();await page.locator('#settings').click();await page.locator('#save-text').fill(JSON.stringify({version:1,savedAt:Date.now(),state:s}));
 await page.locator('#import-save').click();await page.locator('#confirm-import').click();
};
try{
 await page.goto(base);await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 assert.equal((await state()).cash,15);
 const generate=await page.locator('#generate').boundingBox();assert.ok(generate&&generate.y>=0&&generate.y+generate.height<=844,'Generate must be visible on the initial phone screen');
 assert.ok(generate.height>=44,'Generate must have a usable touch target');
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await shot('mobile-initial');
 await page.locator('#generate').tap();await step(20000);await page.locator('#generate').tap();await step(20000);
 await page.locator('#automate').tap();assert.equal((await state()).auto,true);await step(180000);assert.ok((await state()).slop>=12);
 await page.setViewportSize({width:1366,height:768});
 let panel=await open('Models');await expand('Models');assert.equal(await panel.locator('[data-action=model]').count(),8);await shot('models');
 const model=panel.locator('[data-action=model][data-id=gemini]');await model.focus();
 const drawerScroll=await page.locator('#drawer-body').evaluate(el=>{el.scrollTop=120;return el.scrollTop;});
 await page.evaluate(()=>{window.__qaFocused=document.activeElement;});await step(650);
 assert.ok(await page.evaluate(()=>document.activeElement===window.__qaFocused),'Simulation must keep the same focused control');
 assert.equal(await page.locator('#drawer-body').evaluate(el=>el.scrollTop),drawerScroll,'Simulation must keep drawer scroll');
 assert.equal(await page.locator('#catalogue-Models').evaluate(d=>d.open),true,'Simulation must keep disclosures open');
 await page.keyboard.press('Escape');await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).ui.drawer===null&&document.activeElement?.dataset.drawer==='Models');assert.equal((await state()).ui.drawer,null);
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.drawer),'Models','Escape should return focus to the drawer opener');
 panel=await open('Rig');await expand('Rig');assert.equal(await panel.locator('[data-action=gpu]').count(),6);await closeDrawer();
 await page.locator('#settings').click();await page.locator('#save-text').fill('{');await page.locator('#import-save').click();assert.match(await page.locator('#save-result').textContent(),/doesn’t look right/);await page.locator('#dialog [data-close]').click();
 const {simulate}=await import('./balance.ts');const checkpoints=simulate('mixed').checkpoints;
 // Cancelling destructive confirmations keeps Settings and pasted data intact.
 await page.locator('#settings').click();const pasted=JSON.stringify({version:1,savedAt:Date.now(),state:checkpoints[0]});await page.locator('#save-text').fill(pasted);
 await page.evaluate(()=>{window.__qaTextarea=document.querySelector('#save-text');});await page.locator('#import-save').click();await page.locator('#confirmation [data-close]').click();
 assert.equal(await page.locator('#dialog').evaluate(d=>d.open),true);assert.equal(await page.locator('#save-text').inputValue(),pasted);
 assert.ok(await page.evaluate(()=>document.querySelector('#save-text')===window.__qaTextarea));assert.equal(await page.evaluate(()=>document.activeElement.id),'import-save');
 await page.locator('#reset-save').click();await page.locator('#confirmation [data-close]').click();assert.equal(await page.locator('#save-text').inputValue(),pasted);assert.equal(await page.evaluate(()=>document.activeElement.id),'reset-save');await page.locator('#dialog [data-close]').click();
 await importState(checkpoints[0]);panel=await open('Rig');await expand('Rig');await panel.locator('[data-action=gpu][data-id=rack]').click();assert.equal((await state()).vram,96);
 panel=await open('Models');await expand('Models');await panel.locator('[data-action=model][data-id=local-70b]').click();assert.equal((await state()).model,'local-70b');assert.equal((await state()).routing,'manual');await step(180000);
 assert.ok((await state()).jobs.reduce((n,j)=>n+j.vram,0)<=96);
 panel=await open('Agents');await panel.locator('details[data-disclosure=harness] > summary').click();const routing=panel.locator('[data-action=harness][data-id=routing]');if(await routing.isEnabled())await routing.click();await panel.locator('[data-action=routing][data-id=local]').click();assert.equal((await state()).routing,'local');await shot('local-rack');
 panel=await open('Models');await expand('Models');const manual=panel.locator('[data-action=model][data-id=starter]');assert.match(await manual.textContent(),/turn off routing/i);await manual.click();assert.equal((await state()).routing,'manual');assert.equal((await state()).model,'starter');
 await importState({...checkpoints[0],cash:0,jobs:[],model:'claude',business:'seo',routing:'manual',harness:checkpoints[0].harness.filter(id=>id!=='fallback')});
 assert.equal((await state()).ui.productionStatus,'paused');await page.locator('#recover').click();await step(30000);assert.ok((await state()).cash>0);
 for(let i=0;i<3;i++){
  await importState(checkpoints[i]);assert.equal((await state()).prestige,i);panel=await open('Funding');assert.equal((await state()).funding.eligible,true);
  await shot('funding-'+i);await panel.locator('[data-action=raise]').click();await page.locator('#confirm-raise').click();
  assert.equal((await state()).prestige,i+1);assert.equal((await state()).gpu,checkpoints[i].perks.includes('gpu')?'mid':'none');assert.equal((await state()).runEarned,0);
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
 assert.deepEqual(errors,[]);console.log('Browser QA passed: phone controls, automation, drawers, stable focus, explicit routing override, purchases, recovery, saves, three raises, ending, settings, reset and invalid-save preservation. No browser errors.');
}finally{await browser.close();}

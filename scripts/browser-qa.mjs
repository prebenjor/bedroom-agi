import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.qa'); fs.mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BEDROOM_BROWSER?{executablePath:process.env.BEDROOM_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=async()=>JSON.parse(await page.evaluate(()=>window.render_game_to_text()));
const step=async ms=>page.evaluate(ms=>window.advanceTime(ms),ms);
const shot=async name=>page.screenshot({path:path.join(root,name+'.png'),fullPage:true});
const importState=async s=>{
 await page.locator('#settings').click();await page.locator('#save-text').fill(JSON.stringify({version:1,savedAt:Date.now(),state:s}));
 await page.locator('#import-save').click();await page.locator('#confirm-import').click();
};
try{
 await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 await shot('initial');
 assert.equal((await state()).cash,15);
 await page.locator('[data-action=generate]').click();await step(20000);
 await page.locator('[data-action=generate]').click();await step(20000);
 await page.locator('[data-action=auto]').click();assert.equal((await state()).auto,true);
 await step(180000);assert.ok((await state()).slop>=12);
 await page.getByRole('tab',{name:'Models',exact:true}).click();assert.equal(await page.locator('.model-card').count(),8);await shot('models');
 await page.getByRole('tab',{name:'Hardware',exact:true}).click();assert.equal(await page.locator('.hardware-row').count(),6);
 await page.getByRole('tab',{name:'SlopClaw',exact:true}).click();assert.equal(await page.locator('.route-card').count(),4);
 await page.getByRole('tab',{name:'Work',exact:true}).click();
 await page.locator('#settings').click();await page.locator('#save-text').fill('{');await page.locator('#import-save').click();assert.match(await page.locator('#save-result').textContent(),/doesn’t look right/);await page.locator('[data-close]').click();
 const {simulate}=await import('./balance.ts'); const checkpoints=simulate('mixed').checkpoints;
 // Exercise equipment and automation purchases on a real simulated late-run save.
 await importState(checkpoints[0]);
 await page.getByRole('tab',{name:'Hardware',exact:true}).click();await page.locator('[data-action=gpu][data-id=rack]').click();assert.equal((await state()).vram,96);
 await page.getByRole('tab',{name:'Models',exact:true}).click();await page.locator('[data-action=model][data-id=local-70b]').click();assert.equal((await state()).model,'local-70b');await step(180000);
 assert.ok((await state()).jobs.reduce((n,j)=>n+j.vram,0)<=96);
 await page.getByRole('tab',{name:'SlopClaw',exact:true}).click();const routing=page.locator('[data-action=harness][data-id=routing]');if(await routing.isEnabled())await routing.click();await page.locator('[data-action=routing][data-id=local]').click();assert.equal((await state()).routing,'local');await shot('local-rack');
 for(let i=0;i<3;i++){
  await importState(checkpoints[i]);assert.equal((await state()).prestige,i);
  await page.getByRole('tab',{name:'Funding',exact:true}).click();assert.equal((await state()).funding.eligible,true);
  await shot('funding-'+i);await page.locator('[data-action=raise]').click();await page.locator('#confirm-raise').click();
  assert.equal((await state()).prestige,i+1);assert.equal((await state()).gpu,checkpoints[i].perks.includes('gpu')?'mid':'none');assert.equal((await state()).runEarned,0);
  if(i===2){assert.equal((await state()).ending,true);assert.match(await page.locator('#dialog-body').textContent(),/Rewrote Your LinkedIn Bio/);await shot('ending');await page.locator('[data-close]').click();}
 }
 await page.getByRole('tab',{name:'Work',exact:true}).click();await step(20000);assert.ok((await state()).slop>0);
 await page.locator('#settings').click();const downloadPromise=page.waitForEvent('download');await page.locator('#export-save').click();await downloadPromise;const exported=await page.locator('#save-text').inputValue();assert.equal(JSON.parse(exported).state.prestige,3);await page.locator('[data-close]').click();
 await page.reload();await page.waitForFunction(()=>typeof window.render_game_to_text==='function');assert.equal((await state()).prestige,3);if(await page.locator('#dialog').evaluate(d=>d.open))await page.locator('[data-close]').click();
 await page.getByRole('tab',{name:'Work',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal((await state()).tab,'Models');await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>document.activeElement.id),'tab-Models');
 await page.setViewportSize({width:390,height:844});await page.getByRole('tab',{name:'Work',exact:true}).click();await shot('mobile');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('#settings').click();await page.locator('#reset-save').click();await page.locator('[data-close]').click();assert.equal((await state()).prestige,3);
 await page.locator('#settings').click();await page.locator('#reset-save').click();await page.locator('#confirm-reset').click();assert.equal((await state()).prestige,0);
 await page.setViewportSize({width:1440,height:1100});await page.screenshot({path:path.join(root,'overview.png'),fullPage:true});
 const filePage=await context.newPage();filePage.on('pageerror',e=>errors.push(e.message));await filePage.goto(new URL('../../Bedroom AGI.html',import.meta.url).href);await filePage.waitForFunction(()=>typeof window.render_game_to_text==='function');await filePage.locator('[data-action=generate]').click();await filePage.evaluate(()=>window.advanceTime(20000));assert.equal(JSON.parse(await filePage.evaluate(()=>window.render_game_to_text())).slop,1);
 // Invalid saves must survive passive tab lifecycle events.
 const invalidContext=await browser.newContext(),invalidPage=await invalidContext.newPage();await invalidPage.addInitScript(()=>localStorage.setItem('bedroom-agi-v1','{broken'));await invalidPage.goto('http://127.0.0.1:4180');await invalidPage.waitForFunction(()=>typeof window.render_game_to_text==='function');await invalidPage.evaluate(()=>{document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));});assert.equal(await invalidPage.evaluate(()=>localStorage.getItem('bedroom-agi-v1')),'{broken');await invalidContext.close();
 assert.deepEqual(errors,[]);console.log('Browser QA passed: startup, automation, all tabs, rig/model/routing purchases, import/export, three raises, ending/freeplay, reload, keyboard, mobile, reset, invalid-save preservation and standalone HTML. No browser errors.');
}finally{await browser.close();}


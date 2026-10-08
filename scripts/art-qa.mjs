import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.qa/art');
fs.mkdirSync(root,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BEDROOM_BROWSER?{executablePath:process.env.BEDROOM_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const saveFromPage=async()=>{await page.locator('#settings').click();await page.locator('#export-save').click();const s=JSON.parse(await page.locator('#save-text').inputValue()).state;await page.locator('[data-close]').click();return s;};
const restore=async s=>{await page.locator('#settings').click();await page.locator('#save-text').fill(JSON.stringify({version:1,savedAt:Date.now(),state:s}));await page.locator('#import-save').click();await page.locator('#confirm-import').click();};
try{
 await page.goto('http://127.0.0.1:4180');await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 assert.ok((await state()).room,'Room asset status must be exposed for deterministic checks');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.loadedStages===6);
 const base=await saveFromPage();
 for(const [index,gpu] of ['none','mid','good','big','double','rack'].entries()){
  await restore({...base,gpu});await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.assetStatus==='ready');
  const s=await state();assert.equal(s.room.stage,index);assert.equal(s.room.loadedStages,6);
  assert.ok((await page.locator('#room').getAttribute('aria-label')).length>60);
  await page.locator('#room').screenshot({path:path.join(root,`stage-${index}.png`)});
 }
 await restore({...base,gpu:'rack',auto:true,reducedMotion:true});
 await page.waitForTimeout(600);assert.equal((await state()).room.effectsActive,false);
 const still=await page.locator('#room').screenshot();await page.waitForTimeout(1200);assert.deepEqual(await page.locator('#room').screenshot(),still);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const size=await page.locator('#room').boundingBox();assert.ok(Math.abs(size.width/size.height-1.5)<.02);
 await page.setViewportSize({width:1440,height:1100});await restore(base);await page.screenshot({path:path.join(root,'overview.png'),fullPage:true});
 const standalone=await context.newPage(),external=[];
 standalone.on('request',r=>{if(/^https?:/.test(r.url()))external.push(r.url());});
 await standalone.goto(new URL('../../Bedroom AGI.html',import.meta.url).href);await standalone.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.loadedStages===6);
 assert.equal(JSON.parse(await standalone.evaluate(()=>window.render_game_to_text())).room.assetStatus,'ready');assert.deepEqual(external,[]);
 // A failed image decode must keep the game usable and explain the missing artwork.
 const broken=await context.newPage();await broken.addInitScript(()=>{
  const NativeImage=window.Image;
  window.Image=class extends NativeImage {set src(value){setTimeout(()=>this.dispatchEvent(new Event('error')),0);}get src(){return '';}};
 });
 await broken.goto('http://127.0.0.1:4180');await broken.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.assetStatus==='error');
 await broken.locator('[data-action=generate]').click();await broken.evaluate(()=>window.advanceTime(20000));assert.equal(JSON.parse(await broken.evaluate(()=>window.render_game_to_text())).slop,1);
 await broken.locator('#room').screenshot({path:path.join(root,'loading-failure.png')});
 assert.deepEqual(errors,[]);console.log('Art QA passed: six stages, accessibility, reduced motion, narrow layout, standalone offline images, image failure recovery and no browser errors.');
}finally{await browser.close();}

import {chromium} from 'playwright';
import {createServer} from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(project,'.qa/art');fs.mkdirSync(root,{recursive:true});
const baseURL=process.env.BEDROOM_URL??'http://127.0.0.1:4180/';
const browser=await chromium.launch({headless:true,...(process.env.BEDROOM_BROWSER?{executablePath:process.env.BEDROOM_BROWSER}:{})});
const context=await browser.newContext({viewport:{width:1366,height:768}});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const state=()=>page.evaluate(()=>JSON.parse(window.render_game_to_text()));
const saveFromPage=async()=>{await page.locator('#settings').click();await page.locator('#export-save').click();const s=JSON.parse(await page.locator('#save-text').inputValue()).state;await page.locator('[data-close]').click();return s;};
const restore=async(s,p=page)=>{await p.locator('#settings').click();await p.locator('#save-text').fill(JSON.stringify({version:1,savedAt:Date.now(),state:s}));await p.locator('#import-save').click();await p.locator('#confirm-import').click();};
const ready=async p=>p.waitForFunction(()=>{const r=JSON.parse(window.render_game_to_text()).room;return r.assetStatus==='ready'&&r.layerAssets.every(a=>a.status==='ready');});
let embeddedServer;
try{
 await page.goto(baseURL);await page.waitForFunction(()=>typeof window.render_game_to_text==='function');
 assert.ok((await state()).room,'Room asset status must remain exposed');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.loadedStages===6);
 const base=await saveFromPage();
 for(const [index,gpu] of ['none','mid','good','big','double','rack'].entries()){
  await restore({...base,gpu});await ready(page);
  const s=await state();assert.equal(s.room.stage,index);assert.equal(s.room.loadedStages,6);
  assert.ok((await page.locator('#room').getAttribute('aria-label')).length>60);
  await page.locator('#room').screenshot({path:path.join(root,'stage-'+index+'.png')});
 }
 for(const [index,gpu] of ['none','mid','good','big','double','rack'].entries()){
  // A third cooling purchase legitimately advances the room to stage 3.
  const upgrades=Array.from({length:index<3?2:6},(_,i)=>'cool-'+i);
  await restore({...base,gpu,upgrades,reducedMotion:true});await ready(page);
  const room=(await state()).room;assert.equal(room.stage,index);assert.equal(room.loadedStages,6);
  assert.deepEqual(room.activeLayers,upgrades);assert.ok(room.layerAssets.every(a=>a.status==='ready'));
  await page.locator('#room').screenshot({path:path.join(root,'stage-layers-'+index+'.png')});
 }
 // The first real hardware purchase must visibly change the stage-0 bedroom.
 await restore({...base,cash:500,runEarned:500,reducedMotion:false});await ready(page);
 assert.equal((await state()).room.hardwareVisual,null);
 await page.locator('[data-drawer=Rig]').first().click();await page.locator('[data-drawer-panel=Rig] [data-action=gpu][data-id=used]').click();
 assert.equal((await state()).gpu,'used');assert.equal((await state()).room.hardwareVisual,'used-card');
 await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.hardwareAssetStatus==='ready');
 await page.locator('#close-drawer').click();await page.waitForFunction(()=>JSON.parse(window.render_game_to_text()).ui.drawer===null);
 await page.waitForTimeout(250);assert.match(await page.locator('#room').getAttribute('aria-label'),/used graphics card/i);
 await page.locator('#room').screenshot({path:path.join(root,'used-card-purchase.png')});
 // Every cumulative cooling purchase must survive import and appear in diagnostics.
 for(let rank=0;rank<6;rank++){
  const upgrades=Array.from({length:rank+1},(_,i)=>'cool-'+i);
  await restore({...base,gpu:'rack',upgrades});await ready(page);
  assert.deepEqual((await state()).room.activeLayers,upgrades);
  await page.locator('#room').screenshot({path:path.join(root,'cooling-'+rank+'.png')});
 }
 const allCooling=Array.from({length:6},(_,i)=>'cool-'+i);
 for(let workers=1;workers<=4;workers++){
  await restore({...base,gpu:'rack',upgrades:allCooling,claw:true,workers,auto:true,reducedMotion:true});await ready(page);
  const room=(await state()).room;assert.ok(room.activeLayers.includes('claw'));assert.equal(room.workerPanes,workers);
  await page.locator('#room').screenshot({path:path.join(root,'workers-'+workers+'.png')});
 }
 await page.waitForTimeout(600);assert.equal((await state()).room.effectsActive,false);
 const still=await page.locator('#room').screenshot();await page.waitForTimeout(1200);assert.deepEqual(await page.locator('#room').screenshot(),still);
 // Layer state follows replacement saves and does not leak from the previous room.
 await restore(base);await ready(page);assert.deepEqual((await state()).room.activeLayers,[]);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'mobile.png'),fullPage:true});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const size=await page.locator('#room').boundingBox();assert.ok(Math.abs(size.width/size.height-1.5)<.02);
 await page.setViewportSize({width:1366,height:768});await page.screenshot({path:path.join(root,'overview.png'),fullPage:true});
 // Validate the embedded deliverable over our own HTTP server; no file:// access.
 const html=fs.readFileSync(path.join(project,'docs/index.html'));assert.ok(html.length<8*1024*1024,'Standalone release must stay below 8MB');
 embeddedServer=createServer((req,res)=>{if(req.url==='/'){res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});res.end(html);}else{res.writeHead(404);res.end();}});
 await new Promise(resolve=>embeddedServer.listen(0,'127.0.0.1',resolve));
 const embeddedURL='http://127.0.0.1:'+embeddedServer.address().port+'/';
 const embeddedContext=await browser.newContext(),standalone=await embeddedContext.newPage(),external=[];
 await embeddedContext.route('**/*',route=>{const url=route.request().url();if(/^https?:/.test(url)&&url!==embeddedURL){external.push(url);return route.abort();}return route.continue();});
 await standalone.goto(embeddedURL);await standalone.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.loadedStages===6);
 await restore({...base,gpu:'rack',upgrades:allCooling,claw:true,workers:4},standalone);await ready(standalone);
 assert.equal(JSON.parse(await standalone.evaluate(()=>window.render_game_to_text())).room.workerPanes,4);
 await standalone.waitForFunction(()=>Array.from(document.images).every(i=>i.complete&&i.naturalWidth>0));
 const artwork=await standalone.locator('img').evaluateAll(images=>images.map(i=>({ready:i.complete&&i.naturalWidth>0,source:i.currentSrc})));
 assert.ok(artwork.length>=15,'Every model, hardware and SlopClaw icon should be mounted');
 assert.ok(artwork.every(a=>a.ready&&a.source.startsWith('data:')),'All illustrated icons must be embedded and decoded');
 assert.deepEqual(external,[]);await embeddedContext.close();
 // Optional additions may fail without hiding the working base room.
 const optionalContext=await browser.newContext(),optional=await optionalContext.newPage();await optional.addInitScript(()=>{
  const NativeImage=window.Image;let loads=0;
  window.Image=class extends NativeImage{
   set src(value){if(++loads<=6)super.src=value;else setTimeout(()=>this.dispatchEvent(new Event('error')),0);}
   get src(){return super.src;}
  };
 });
 await optional.goto(baseURL);await optional.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.loadedStages===6);
 await restore({...base,gpu:'rack',upgrades:allCooling,claw:true},optional);
 await optional.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.layerAssets.some(a=>a.status==='error'));
 assert.equal(JSON.parse(await optional.evaluate(()=>window.render_game_to_text())).room.assetStatus,'ready');
 await optional.locator('#generate').click();await optional.evaluate(()=>window.advanceTime(20000));assert.ok(JSON.parse(await optional.evaluate(()=>window.render_game_to_text())).slop>0);
 await optional.locator('#room').screenshot({path:path.join(root,'optional-failure.png')});
 const brokenContext=await browser.newContext(),broken=await brokenContext.newPage();await broken.addInitScript(()=>{
  const NativeImage=window.Image;window.Image=class extends NativeImage{set src(value){setTimeout(()=>this.dispatchEvent(new Event('error')),0);}get src(){return '';}};
 });
 await broken.goto(baseURL);await broken.waitForFunction(()=>JSON.parse(window.render_game_to_text()).room.assetStatus==='error');
 await broken.locator('#generate').click();await broken.evaluate(()=>window.advanceTime(20000));assert.equal(JSON.parse(await broken.evaluate(()=>window.render_game_to_text())).slop,1);
 await broken.locator('#room').screenshot({path:path.join(root,'loading-failure.png')});
 assert.deepEqual(errors,[]);console.log('Art QA passed: six stages, cumulative cooling, SlopClaw worker panes, replacement saves, accessibility, reduced motion, mobile aspect ratio, embedded HTML and icons, optional/base failure recovery. No browser errors.');
}finally{if(embeddedServer)await new Promise(resolve=>embeddedServer.close(resolve));await browser.close();}

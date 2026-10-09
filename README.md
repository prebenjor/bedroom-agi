# Bedroom AGI

A browser idle game about running a slop factory from your bedroom. No actual AI services, accounts, or payments.

## Play

Play on desktop or phone: **[Bedroom AGI](https://prebenjor.github.io/bedroom-agi/)**.

Open **Bedroom AGI.html** from the parent folder in a current desktop browser. It is a single file with the entire game inside; no installation or internet connection is needed.

Generate two articles, then buy automatic production for $25. After that, check in every few minutes. Businesses and models unlock as the run earns money. Model costs are paid when jobs start; revenue arrives when they finish. Hardware and upgrades are separate purchases.

Tap the business or model name to change the next job. **View rig** opens hardware, cooling and quantization. **Agents** appears when SlopClaw becomes available and lets you add workers and choose routing. Each local worker reserves VRAM. Quantization halves the requirement when a model cannot fit, but cuts its payout by 18%. Temperatures above 65°C slow new local jobs; cooling upgrades bring the temperature down.

**Funding** resets the operation and awards Unjustified Valuation. Permanent production perks work immediately; starting equipment perks take effect at the next reset. Three rounds finish the story, and you can keep playing afterward.

The reference player checks in every three minutes, makes two starting jobs, then chooses profitable models and upgrades. Simulated mixed-route funding times: **67 / 31 / 21 minutes**, with SlopClaw at minute 13 in the first run. A cloud-only route takes **64 / 31 / 24 minutes**; a local-first route takes **88 / 43 / 24 minutes**. The largest gap between useful core decisions is six minutes, including the final funding stretch. These simulations ignore projects; choices and check-in frequency affect actual play time.

Each business has a workflow upgrade in addition to the regular upgrades. Suggestions compare income gain and payback, including workers, hardware and agent upgrades. A hardware estimate names the local model you need to switch to. Savings timers appear only while automatic production can earn money. If a useful purchase is already affordable, the next goal says it is ready to buy.

**Projects** opens after three minutes of total play. Make a tiny game, photo organiser, shop stock tracker, invoice helper, backup tool or community website. Each has a cash budget, two feature choices and two two-minute builds. Production keeps running. Building waits for your next decision; offline time never chooses for you. The reward is disclosed before starting and is the same for either choice. Projects, features, rewards and completed keepsakes survive funding. Production rewards affect new jobs; extra starting cash arrives on the next funding reset. Completing projects gives a modest advantage: the simulated mixed route takes **67 / 30 / 21 minutes** with all six completed.

## Saves and controls

- Autosaves in your browser every ten seconds and after purchases. Offline production counts up to two hours, using the same simulation.
- Use the gear button to export/import saves, toggle sound, reduce motion, or reset progress. Import and reset require confirmation.
- Saves belong to the browser and origin where you play. Export before moving the HTML file or changing browser. Browsers may restrict storage for local files or private sessions; the game shows a warning if saving fails.
- Use Tab to navigate. **F** toggles fullscreen; **Esc** closes the current drawer or dialog, returning focus to its opener.
- All models, prices, performance, and executive dialogue are fictional satire.

## Source and development

Node.js 22 or newer is recommended. From this folder:

```text
npm install
npm run dev
npm test
npm run balance
npm run build
npm run preview
```

The production preview is served at `http://127.0.0.1:4180`. `npm run build` creates `dist/`, the standalone HTML in the parent folder, and the same complete game in `docs/index.html`. Double-click `start-game.cmd` for the production preview on Windows with Node installed.

## Publish updates

GitHub Pages serves the public `prebenjor/bedroom-agi` repository from `main` → `/docs`. The build embeds all six illustrations, styles and scripts in `docs/index.html` and writes `docs/.nojekyll`. No backend or external model service is needed.

After editing the source, run:

```text
npm ci
npm test
npm run build
git add src scripts tests art public docs README.md package.json package-lock.json
git commit -m "Update Bedroom AGI"
git push origin main
```

Pages redeploys after the push. Check the repository's Actions tab for the deployment result, then reload the play link. Keep `docs/index.html` committed; GitHub Pages does not run the Vite build for this configuration. Dependencies, `dist/` and browser QA captures stay out of Git.

Saves stay in each browser's local storage. To move an existing desktop or local-file game to your phone, export its save from Settings, transfer the text or save file, and import the text in the phone game's Settings. The online site has a different save location from the local HTML file.

`src/engine.ts` owns the simulation and typed actions, `src/content.ts` holds balance and writing, `src/save.ts` validates saves and elapsed time, and `src/room.ts` draws the room. `window.advanceTime(ms)` and `window.render_game_to_text()` support deterministic browser testing.

Tests cover purchases, automation, job snapshots, VRAM, heat, routing, recovery, resets, save validation, fractional ticks, clock changes, offline equivalence, and pacing. Browser QA also exercises drawers, stable focus and scroll, import/export, all three raises, ending/free play, reloads, keyboard controls, mobile layout, reset confirmations, and the standalone file. `npm run test:art` checks all six images, stage descriptions, reduced motion, mobile aspect ratio, failed-image recovery and embedded offline artwork.

To repeat browser QA, run `npx playwright install chromium`, start `npm run preview` in one terminal, and run `npm run test:browser` in another. Screenshots go into `.qa/`. Set `BEDROOM_BROWSER` to an existing compatible Chromium executable to use it instead of downloading a browser.

Content: sixteen models, six GPU rigs, eight businesses, 24 regular upgrades, eight workflow upgrades, nine harness upgrades, twelve permanent perks, six useful projects, forty events, and sixty production logs. The six bedroom illustrations, twenty-three model/hardware/SlopClaw icons, six project keepsakes and reactive equipment artwork were made with the built-in imagegen tool. Cooling purchases add equipment, opening the window changes its illustration, and SlopClaw adds a desk object and one to four terminal panes. Original PNGs and exact prompt sets are included in `art/`; compressed runtime images are in `src/assets/`. There are no external image requests, fonts, or tracking.

The main production screen uses a shared details drawer rather than desktop tabs. Controls remain mounted while values update, preserving focus and scroll. Suggestions estimate new-job earnings after purchase spending; current jobs retain their original terms. UI and artwork state stay separate from the unchanged version-1 game save. Reduced motion freezes effects and applies purchases without fades. Failed optional artwork does not disable purchased upgrades.

The business and model expansion preserves content IDs and the save format. New jobs use the revised prices and business specialities; work already running retains its saved cost, payout and duration. Corporate announcements and executive dialogue are fictional satire, not quotations or reporting. The jokes target layoffs sold as progress, unpaid creative work, environmental costs and the player profiting from the arrangement. Instructions and numeric costs remain literal. Existing save histories retain their earlier log entries; new events and production use the revised writing.

## Model specialities

Sixteen fictional models serve eight businesses: SEO articles, fake product reviews, LinkedIn posts, ad copy, engagement bait, ebooks, corporate pitch decks and synthetic videos. Each model card lists its strongest businesses, cost per job, payout and net earnings per second for one worker. Switching models costs nothing; each cloud request is paid when its job starts. Local jobs pay electricity and agent overhead instead.

Gemoney Flash and ChatGDP Mini suit bulk articles and reviews. Clawed Sonnet, ChatGDP Boardroom, Midlife Journey and Slora earn their higher request costs on books, decks, images and videos. The Llamateur models trade request bills for hardware, shared VRAM and heat. A larger model can be a worse purchase for the work you are doing. All rates are game balance, not real vendor pricing.

The shared quote calculation applies model speed and payout specialities to production, comparisons and routing. Balance tests cover all sixteen reachable model niches and all eight businesses, with previous-release running-job fixtures covering save compatibility. The eight additional generated badge originals and prompts are in art/model-expansion/.

SlopClaw manages workers and chooses their models; it is not a model itself. Cloud jobs need no GPU and are charged per request. Local jobs share your GPU memory and pay electricity. Agents shows the models actually in use and the cloud/local job counts. Install Model routing above the presets to let SlopClaw pick models; choosing a model in Production returns to manual choice. More workers help only when you can fund their requests or fit their local jobs.

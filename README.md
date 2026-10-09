# Bedroom AGI

A browser idle game about a bedroom slop factory, an expensive rig, and eventually getting paid to write code. All models, bills and executive dialogue are fictional satire. No actual services, payments, accounts or code execution.

**[Play on desktop or phone](https://prebenjor.github.io/bedroom-agi/)**. The standalone **Bedroom AGI.html** also works offline, with embedded artwork and scripts.

## Getting started

Generate two articles, then automate for $25. Check in every few minutes. The two suggestions compare useful purchases by income gain and payback. Hardware suggestions name the local model they enable; cooling takes priority when heat slows local work.

The business and model names open their pickers. View rig holds GPUs, cooling and quantization. Cloud models need no GPU. Local jobs share memory and pay electricity. Quantization halves memory when needed and cuts payout by 18%. Heat above 65°C slows new local work.

Funding resets the operation and awards Unjustified Valuation. Permanent perks, projects, career completions, approved revisions, calendar and quota usage survive. Funding cancels renewals; purchased chat coverage expires normally. Three rounds finish the story, and play can continue.

Pacing tests target **60–90 / 30–45 / 20–30 real minutes**, first-run SlopClaw around 10–15 minutes, and no core decision gap over eight minutes. Projects remain optional. Actual time depends on purchases and check-ins.

## Models and access

| Family | Base | Plus | Pro |
|---|---|---|---|
| ChatGDP | Pebble | Boulder | Landslide |
| Clawed | Fable | Novella | Epic |
| Gemoney | Spark | Flash | Floodlight |
| Grok Bottom | Murmur | Rant | Meltdown |
| DeepShill | — | Reason | Overthink |

Llamateur 7B, 14B, 32B and 70B run locally. Free Trial & Error is uncapped recovery. Midlife Journey and Slora are API visual specialists. Cards show capability, context, specialities, costs and finish time.

- **Chat:** provider plan, weekly model allowance, one serial worker; no delegated helpers.
- **API:** bills per request, tools and multiple workers; unlocks at $350 earned. No quota.
- **Local:** electricity, heat and shared VRAM; no subscription or quota.

One game hour lasts five real seconds, a day two minutes, a week fourteen minutes. Plans cost **Free $0 / Plus $120 / Pro $600 per game week**, granting **80/320/960 units per model**. Base/Plus/Pro calls consume 1/2/4 times the workload. Larger jobs need more units. Revisions share a model's allowance. Monday resets usage; buying a plan, switching versions and funding do not.

One paid plan can auto-renew. Provider changes stop the old renewal while retaining paid coverage. Same-provider upgrades charge a prorated difference; downgrades apply at renewal. Unaffordable renewals stop without debt. API bills remain separate.

Optional revisions arrive in Weeks 2 and 4. Approve them in Models; older versions remain selectable. Suitable work can improve while API costs rise. Sent work retains its quoted version and terms.

SlopBench compares practical finish time, repairs, fees, income, quotas and current hardware using the game's calculators. Forecasts identify their horizon and assumptions. Sponsored claims are jokes, separate from useful figures.

## Coding and SlopClaw

Bug fixes unlock after $350 earned and six minutes played. Earnings and career completions unlock scripts, imports, websites, internal tools and repository migrations. Career survives funding.

Coding follows **Brief → Build → optional Review → Test → up to two Fix/Test passes → Deliver**. Payout and expected fees appear before acceptance. Capability determines repairs, context gates larger work, and testing changes time. Accepted work can pause for cash, quota or its approved budget; it cannot permanently fail.

SlopClaw manages the models. Coordinator, Coder, Tester and Reviewer use the existing four-worker pool and shared cash/VRAM. Harness upgrades change brief reuse, scaffolding, role routing, repairs, context, parallel helpers and review. It can repeat approved work when automation is on. It does not buy equipment, change plans or job types, fund the company, or choose project features.

Compatible API/local text models can delegate unfinished coding, ebook, deck and video sections. Budget helpers work serially; parallel helpers need resources and coordination and may cost more. Confirm after checking remaining fees, time and workers/VRAM. Sent requests stay unchanged; spending is never refunded. Helper versions are pinned and requests stop at the approved budget.

## Projects, saves and controls

Projects opens after three minutes. Six small games/tools/sites have disclosed budgets and permanent rewards, two choices and two two-minute builds. Production continues. Building waits for the next decision; offline time never chooses. Finished projects become keepsakes and survive funding.

Autosaves locally every ten seconds and after actions. Background/offline use the same simulation, capped at two hours. Settings handles export/import, sound, reduced motion and confirmed reset. Saves belong to each browser and origin; export/import moves progress between phone and desktop. Tab navigates, Escape closes/returns focus, F toggles fullscreen.

Previous version-1 saves work. Running jobs keep their original payout, cost, duration and remaining time. Legacy calendars start Week 1 without changing lifetime play; legacy saves receive API immediately.

## Development and publishing

Use Node.js 22 or newer:

```text
npm ci
npm test
npm run balance
npm run balance:career
npm run build
npm run preview
```

Preview defaults to http://127.0.0.1:4180; PORT changes it. Vite development uses npm run dev. Build creates dist/, the standalone HTML in the parent folder, and the same embedded game in docs/index.html with .nojekyll. Standalone has an 8 MB limit.

GitHub Pages serves **prebenjor/bedroom-agi** from **main → /docs**. Rebuild and push:

```text
npm test
npm run build
git add src scripts tests art public docs README.md package.json package-lock.json
git commit -m "Update Bedroom AGI"
git push origin main
```

Wait for successful Pages deployment, then verify the play link. Pages does not build Vite for this configuration. Commit docs/index.html; leave dependencies, temporary files, captures and local saves out of Git.

engine.ts owns simulation/actions; content.ts balance/copy; access.ts calendar/billing/revisions; coding.ts pipeline/delegation; save.ts validation; room.ts the canvas. advanceTime(ms) and render_game_to_text() support deterministic browser checks. Controls remain mounted; UI state is separate from saves.

Run npm run test:browser and npm run test:art against the preview. Install Chromium with npx playwright install chromium or set BEDROOM_BROWSER to an executable. BEDROOM_URL selects the site; captures go to .qa/.

Content: 21 models, eight content businesses, six coding types, six GPU rigs, 24 regular upgrades, eight workflows, nine harness upgrades, twelve perks, six projects, forty events and sixty logs. Room/badge/job/project/equipment art uses the built-in image generator; selected originals and exact prompts are in art/, compressed assets in src/assets/. Labels stay HTML. No external fonts, images or tracking.

# Launch prompt — widgetVis title-aggregation captain 2026-09-01 ~20:09

Paste into a **fresh** agent chat. Do **not** continue the previous title-aggregation captain chat (token context full). Do **not** load that chat.

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** — use a slug from the Task tool list (this predecessor used `cursor-grok-4.6-xhigh`; if the list also has `cursor-grok-4.6-xhigh-fast`, prefer that for explore). Do not invent a slug. PO = vastenburg.

Talk to the PO in **Dutch**. Artifacts (contracts, code, names) **English**.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally read `widgetVis.md` (~1200 lines), all kennzahlDefaults shards, lastOriginal title helpers, and live title JS.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts or `.mdc` bodies into this chat.
- Do **not** re-read all `.mdc` files here. Point the army at named files + named MUST clauses.
- Do **not** ingest `kennzahlDefaults/*.js` shards or `laatsteOriginal` title helpers in the captain thread. Army returns **citations**.
- One job at a time in *your* context: synthesize army verdicts, stamp/patch the contract, brief the next writer.

**Quality over speed:** extra investigation and review via grok 4.6 subagents is a **good** default. Do not implement from memory of this prompt. Pre-impl contract-vs-code review **and** post-impl review are required.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- **Module Contract First.** You **write and read contracts**. Subagents check contracts against the live codebase **before** and **after** JS.
- Always diagnose: does the codebase fail the contract, or do both have the right logic but implementation is missing / flooded / overwritten?
- Order of work. PO questions only when code/contracts cannot answer.
- Spec slices for subagents: **one job per agent**, file size limits, named MUST rules, exclusive file allowlists.
- Review: contract-vs-code, MUST rules, no silent divergence. If implementation must diverge, **stop and patch the contract** (PO agrees) before more JS.
- After code: a **different** subagent reviews before you declare done.
- Parallel explore agents when jobs do not share files.
- Verify UI in the browser if browser tools exist (user rule); otherwise say what you could not verify.

### Do not

- Be the army. Do not ingest all `.mdc` files into this chat. Point subagents at files.
- Write the **bulk of production JS** yourself. You may stamp contract status / tiny parent pointers. Subagents write JS.
- Re-open **closed** PO decisions below.
- Pixel-parity with lastOriginal Line titles (`allOther` → `(Monatsdurchschnitt)` on a Stichtag query). That is **rejected**. Option **B** is locked.
- List single-caption / tooltip-only. PO approved **two List captions**, comma-separated.
- Chart tooltip text rewrite, legend captions, `widgetSettings` Aggregationstyp control, history, writeback title field, TopN-helper pin, 1000 ms tooltip delay, `localFilters()`, `_KDB.properties.kennzahlSpecificSlotDefaultObj`.
- Deep-read `_KDB.config.visualizations.*` from title files; door is `resolveVisualizationBindingConfig`.
- `setVisTitle` after render. Grow `buildVisualizationTitleText.js` past 150 lines. Reuse `suffixParts` `i===0`/`i===1` skip for aggregation.
- `readMetric.display` fallback to `derived.titleText`.
- Commit unless PO asks. No push. No `.mdc` edits unless PO asks.
- Load predecessor captain chats. This file + the title-aggregation delta + live JS are the source of truth.

### Army (grok 4.6) does

- Read legacy/current files and return **citations** (path + lines).
- Draft/edit **one** slice: either a contract stamp or a small set of JS files per task.
- Review a slice against named `.mdc` rules + the title-aggregation delta + parent §13 / §7.0.
- Do not invent architecture. Do not reopen closed PO decisions.

Never: two writers on the same file.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Active: `_____________KDB3API/`

Ignore: `_______KDB3`, `_______REDESIGN2`, `.cursor oud`, `_remediation_backup` except as cited evidence. `laatsteOriginal` is evidence **only** when a brief names a path.

Live MUST: `_____________KDB3API/.cursor/rules/` — especially **`cognos-adapter.mdc`** + `cognosHostService.md` §0. Title work does **not** need new Cognos calls; pre-render already uses `visualizationFacet.setVisTitle`.

Also: kdb-object, state, runtime, module-public-api, events, feature-structure (JS 80–120 target / **150 hard**, orchestrator 120, **>6 AMD imports = smell, >10 forbidden**), naming, error-handling, dom, amd.

Authority (highest first): approved **module contract + this delta** > `.cursor/rules/` > architecture. Silent contract/code divergence is forbidden (`feature-structure.mdc` synchronisation).

---

## Closed decisions (do not reopen)

| Decision | Status |
|---|---|
| Diagnosis | **Contract gap vs lastOriginal**, not flood. Current code matches (incomplete) parent §13. REDESIGN2 already dropped aggregation. |
| Product option | **B** — vis-type branch same as `buildLocalFilters`, not lastOriginal `allOther`. |
| List titles | **PO 2026-09-01 evening: two captions.** `P_PS_K_01` List → `(Stichtag, Monatsdurchschnitt)`. Not allOther-only, not first-only, not tooltip-only. |
| Line `P_PS_K_01` (expand dump) | B → `(Stichtag)`. lastOriginal would have shown `(Monatsdurchschnitt)`. Data is Stichtag. |
| Filter ownership | Filter already applied by binding. Title **documents**. Do not change `widgetBindingPlan` merge. |
| Settings / history / writeback | No new control, no history key, no persist of composed title. |
| Chart / legend | Unchanged. |

Rejected options: A (allOther pixel-parity), C (tooltip only), D (do nothing).

---

## Where to start (do this first, in order)

1. Read **this** handoff. Then read **only**:
   - `_____________KDB3API/contracts/widgetVis-title-aggregation-contractdelta.md`
   - Parent pointers: `widgetVis.md` §13 title bullets, §7.0 pre-render title sentence, §20 item 19, approval log last row. Do **not** ingest the whole parent in the captain thread.
2. Dispatch an **explore** subagent: contract-vs-live-code **before** JS. Named files:
   - `KDB3/js/dashboard/widgets/widgetVis/effects/buildVisualizationTitleText.js`
   - `syncVisualizationTitle.js` (`applyTooltipAndLink` / `buildTitleSuffixParts`)
   - `applyPreRenderTitle.js` / `continueBindingPipeline.js` (visType default)
   - `controllerHelpers.js` `readMetric`
   - `config/visTypes/resolveVisualizationDefinitions.js` + `resolveVisTypeIdentity.js`
   - `core/services/widgetBindingPlan/filters/buildLocalFilters.js` `branchKey`
3. **Stamp the delta** `Draft` → `Approved-for-implementation` (PO locked List; predecessor context died before stamping). Sync parent approval log. Then **and only then** JS.
4. Army implements the allowlist in delta §7. A **different** subagent reviews contract vs code after.
5. Browser-check if tools exist: drop `P_PS_K_01` Line → title `(Stichtag)`; switch List → `(Stichtag, Monatsdurchschnitt)`; Pie → `(Monatsdurchschnitt)`; tooltip matches; dimension+TopN order `display (Stichtag) nach … Top-N`.

---

## Issue (one sentence)

In lastOriginal vis widgets, after the Kennzahl name, aggregation captions were shown in parentheses in the header title text **and** the header `title` tooltip. KDB3 never ported that. Option B restores it using the **applied** vis-type kennzahlDefaults branch.

Golden vector 1 (live expand dump currently has **no** parens): `Mitarbeiter*innen - Anzahl (Stichtag)`.

---

## Implementation MUST (already in the delta — army must obey)

- `visType = settings.visType || resolveDefaultVisualizationType(_KDB)` then `resolveVisPropBucketKey` then copy `branchKey` (`Line` \| `List` \| `com.ibm.vis.custom.prognoseyearlinechart` else `allOther`).
- Slot `defaults[branch] || defaults.allOther`. Include **Aggregationstyp only** (Caption path or logical keys). Ignore Monat/Jahr.
- Config door: `resolveVisualizationBindingConfig` / `resolveKennzahlDefaults`. Not properties. Not `localFilters()`.
- Aggregation **after base, before** `nach`. Do not put it in `suffixParts[0]`. Tooltip must include the same `(caption[, caption])`.
- Strip **computed** parenthesis only. Same string pre-render (`setVisTitle`) and post-render DOM.
- `readMetric.display` = `derived.display` (fallback `code`), never `derived.titleText`.
- New file `effects/resolveTitleAggregationLabel.js`. Keep `buildVisualizationTitleText.js` ≤150.

---

## Files (allowlist)

JS:

- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/effects/resolveTitleAggregationLabel.js` (**new**)
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/effects/buildVisualizationTitleText.js`
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/effects/syncVisualizationTitle.js` (tooltip prepend only if needed)
- `_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/controllerHelpers.js`

Contracts (stamp / tiny pointers only):

- `_____________KDB3API/contracts/widgetVis-title-aggregation-contractdelta.md`
- `_____________KDB3API/contracts/widgetVis.md` (approval log + already-synced §13)
- Already pointed: `widgetVis-port-execution-spec.md`, `widgetVis-legend-normalization-contractdelta.md`

Evidence (army only): `laatsteOriginal/KDB2/js/widgets/visWidgets/helpers/visWidgetTitleHelpers.js`; `kennzahlDefaults/pPs.js` `P_PS_K_01`.

---

## Done when

- Delta status `Approved-for-implementation`, approval log has PO List lock + stamp.
- Live Line `P_PS_K_01` title/tooltip show `(Stichtag)`.
- List shows both captions. Pie/bar match allOther.
- `readMetric` cannot leak a suffixed title back as display.
- Post-impl subagent: contract matches code; no flood of `(Stichtag)` on Cognos fallback; no `setVisTitle` after render.
- Captain reports to PO in Dutch: what changed, what was verified, what was not (browser).

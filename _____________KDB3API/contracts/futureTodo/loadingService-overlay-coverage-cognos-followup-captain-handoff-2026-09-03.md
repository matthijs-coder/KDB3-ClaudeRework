# Launch prompt — loading overlay Cognos follow-up captain 2026-09-03

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*`.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST rules, `writeback.md`, `tabs.md`, widgetVis, overlay parent delta bodies, `KDB.js`, or predecessor chats.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts into this chat.
- You read/write **contracts** and **execution specs**. Army reads code, writes code, and reviews.
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `KDB.js`, `loadingAnimation.css`, `createWritebackGetService.js`, or full `writeback.md` into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch **one-line** parent contract drift if a real deviation appears, brief writers. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. This file + the two approved deltas + the follow-up execution spec + live JS (via army) are source of truth.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor captain closed the **first** overlay-coverage WP (2026-09-02, live in Cognos) and then wrote the **follow-up** contracts after PO Cognos punch list 2026-09-03. The follow-up **execution spec already exists**. Predecessor **must not** keep coordinating implementation (context full). You take the **next steps**: confirm live files → **dual review** (writers already landed) → fix MUST holes via army → parent one-line contract patches → PO Cognos checklist.

You do **not** reopen product decisions from either overlay WP.

### Do

- **Module Contract First.** Law for this WP:
  - `_____________KDB3API/contracts/loadingService-overlay-coverage-cognos-followup-contractdelta.md` (**Status: Approved**, PO vastenburg 2026-09-03)
  - `_____________KDB3API/contracts/loadingService-overlay-coverage-cognos-followup-execution-spec.md` (**Status: Ready for execution**)
  - Parent: `_____________KDB3API/contracts/loadingService-overlay-coverage-contractdelta.md` (GET mount one-liners already patched; CSS z-index **20000** line in §4 is **stale** — follow-up wins: **1000**. Kennzahlen mount row in §1 table is **stale** — follow-up wins: `#kdb-control-main-blocks`. Patch those one-liners yourself; do not rewrite the parent.)
- Split work. Tight briefs. **Parallel** grok 4.6 subagents with **exclusive file allowlists** from the follow-up spec. No two writers on the same file. **Do not re-run F1–F4** unless army finds holes.
- Gate: (1) army confirm live files vs spec (writers **claimed landed**) → (2) **fresh** subagents dual-review (mechanical rules + semantic contract vs code) → (3) fix MUST holes via army → (4) tell PO what to check in Cognos.
- First message to PO: started / blocked. After dual review: Cognos checklist (Dutch).
- If implementation must deviate: **stop**, present to PO, **update the follow-up delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Do not

- Rewrite the follow-up execution spec unless army proves an allowlist collision or a file would exceed 150 / AMD 10. Spec is already written.
- Re-investigate the closed 2026-09-02 overlay product (boot-done, SET `.dashboardFrame`, copy B, Play-toggle, leftover-hide, `smq-popup` writes, KDB2 opacity-0 + 8500ms).
- Re-open developer-mode / SU toggle (separate closed WP).
- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Implement a fifth writer slice. Do not merge F1–F4 into one agent.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from features.
- Write overlay into `smq-popup`. Mount GET on `.dashboardFrame`. Keep GET overlay for popup hold / user-tab restore.
- Edit `runApplyBindingRenderSteps.js` or thicken `applyWritebackGetPersistLanding.js` (150 cap).
- Use `document.querySelector(".page.pagegenericPage")` for tab overlay (hits KDB footer `#KDB_bottomFooterWrapper`).
- Start tab overlay for PDF traverse (`source === "dashboardPdf"`) or GET persist `writebackGet` + `scope === "singleTab"`.
- Put spinner in `#selectParameterSet`. Change copy keys (German catalog already live).
- Folders `helpers` / `common` / `shared` / leftover `Support`. Inline nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS 150 lines / orchestrator 120 / controller-fn 60 / 10 AMD imports without PO.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding (confirm blast radius; do not overwrite a landed slice) and **after**.
- Pre-flight: one-sentence summary of each MUST rule **before** producing files (follow-up spec Section A: 10 MUST `.mdc` + lifecycleVocabulary + parent overlay delta + follow-up delta + follow-up spec = **14 items**).
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD, naming `_` prefix, try/catch, file size, no foreign state writes, factory-scope helpers (no nested functions in AMD factories).
- Semantic review: compact 32px in-box; z-index 1000; GET `.contentViewPane` + finish after land (no hold keep); vis re-apply starts before pipeline; tab overlay scoped to official tab page, skip PDF and GET singleTab; SET still `.dashboardFrame`.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished. Predecessor launched F1–F4 once; **F1–F4 all landed**. Do not re-run those slices unless dual review finds holes.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/loadingService-overlay-coverage-cognos-followup-contractdelta.md`
   - `_____________KDB3API/contracts/loadingService-overlay-coverage-cognos-followup-execution-spec.md` (allowlists F1–F4)
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` (execution-spec + MUST-set; do not re-read all 11 rules into *your* context — army echoes them)
2. Tell PO you started. Do not implement in that first turn.
3. Launch an **explore** subagent to confirm live JS vs spec. Snapshot **after F1–F4 landed** (re-check; do not trust this list blindly):
   - **F1 landed:** `loadingAnimation.css` `z-index: 1000`; compact 32px CSS on slot + main-blocks; `root.contentViewPane` in `rootChromeSelectors.js`; `mainBlocksSelector` in kdbControl `domSelectors.js`; tree overlay via that selector (`applyMetricsTreeLoading.js`)
   - **F2 landed:** `widgetSettings/effects/startWidgetRenderLoading.js` exists; `placeWidgetSettingsPanel.js` calls it after new live panel insert; `handleApplySetting.js` starts before `runBindingPipeline` and finishes when `ok !== true`. **Deviation to review:** finish skipped when `result.stale === true` so a superseded apply does not lift the in-flight overlay (same `mountKey`).
   - **F3 landed:** `applyWritebackGetPersistLoading.js` mounts `root.contentViewPane`; `createWritebackGetService.js` always `finish` after land (including skip-land and land throw). Unused `isHoldArmed` helper removed; `armCancelWatch` kept because restore still arms it. `scheduleWritebackGetPersistRestore.js` still calls `finish` (now a no-op) — do not thicken that file.
   - **F4 landed:** `tabs/effects/applyTabPageLoading.js` exists (writer reported **150 lines** — at cap); `traverseTabs.js` 149 / AMD 8; `observeActiveTab.js` 117. Mount scoped under `getElementById(pageId)`; skip PDF and GET persist `singleTab`.
4. Do **not** rewrite the spec. Do **not** relaunch F1–F4 writers. Dual-review next.
5. Fresh reviewers (not the writers): mechanical + semantic. Fix via army.
6. One-line parent coverage delta CSS z-index 20000 → 1000 and Kennzahlen mount row → `#kdb-control-main-blocks` if still stale.
7. PO Cognos checklist (below).

Predecessor also one-line patched parent GET rows (do not redo unless army finds them stale). Parent **execution spec** (`loadingService-overlay-coverage-execution-spec.md`) is historical for WP-1; do not execute it again.

---

## Product decisions (closed — do not re-ask)

### WP-1 overlay coverage (2026-09-02) — live, do not reopen

| Topic | Decision |
|---|---|
| Boot-done | Modules mounted. Do **not** hold until `#selectParameterSet` / tree. |
| SET | `.dashboardFrame`, copy `dashboardRestore` (`Dashboard wird wiederhergestellt`). |
| Copy B | Boot `Dashboard wird geladen`. GET `Dashboard wird gespeichert`. Vis `Diagramm wird geladen`. Tab `Registerkarte wird geladen`. Tree `Kennzahlen werden geladen`. Slot `Parameterauswahl wird geladen`. Never English “Widget”. Never Parametersatz. |
| Play Loading-Image | Gates **boot only**. |
| Vis first drop | Whole widget shell after **new** panel insert; finish `finishRenderWait`. |
| Cover class | `KDB_loading`, not gear `KDB_hide`. |
| `smq-popup` | Never write overlay there. |
| KDB2 GET hack | No `.dashboardFrame { opacity:0 }` + 8500ms. |

### WP-2 Cognos follow-up (2026-09-03) — this job

| Topic | Decision |
|---|---|
| Compact mounts | `#kdb-control-save-load-slot` and `#kdb-control-main-blocks`: overflow hidden, **32px** spinner (override `is-large`), smaller caption, flex-centered **inside** the mount. Legacy 110px is **not** the production size. |
| Tree | Overlay moves to `#kdb-control-main-blocks`. Same `mountKey` `kdb-metrics-tree-loading`. |
| z-index | Overlay default **1000** (was 20000). Must sit **below** Cognos “Neues Parameterset erstellen” popup. |
| GET | Mount **`.pane.paneContent.contentViewPane`**. Catalog `root.contentViewPane`. Finish when persist-land **arrives on first visible tab**. **Not** popup hold. **Not** restore-to-user-tab. Skip-land: if started, finish immediately. SET stays `.dashboardFrame`. |
| Vis re-apply | Same whole-shell overlay on user `handleApplySetting` **before** `runBindingPipeline` (visType, TopN, dimension). Skip history replay. Extract `startWidgetRenderLoading.js`. Do not edit `runApplyBindingRenderSteps.js`. |
| Tab page | Official canvas `.page.pagegenericPage` of the **target tab** (layer between widget and tab). `mountKey` `kdb-tab-page-loading`. Automatic `tabs/traverse` (not PDF, not GET persist `singleTab`). User first visit: `observeActiveTab` `firstActivation && source === "user"`, finish when inner frame exists or **2s** cap. Collect `visibleDashboard` **does** get this overlay. |

---

## Writer slices (from follow-up spec — exclusive)

- **F1** CSS + catalog + tree: **landed 2026-09-03**. Compact CSS stayed in `loadingAnimation.css` (not shell/panels). Re-run only if dual review finds holes.
- **F2** vis re-apply: **landed 2026-09-03**. Extract + handleApplySetting start. Dual review must judge the `result.stale === true` skip-finish. Re-run only if holes.
- **F3** GET: **landed 2026-09-03**. contentViewPane mount; always finish after land. Re-run only if dual review finds holes.
- **F4** tab page: **landed 2026-09-03**. `applyTabPageLoading.js` at **150** lines — mechanical review must confirm it does not exceed. Re-run only if holes.

---

## MUST rules (army echoes; you do not ingest all)

`_____________KDB3API/.cursor/rules/`: `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus `cognos-adapter`. Lifecycle: `_____________KDB3API/.cursor/lifecycleVocabulary.md`. Architecture: `stateOwnership.md` / `projectStructureRules.md` only if a writer is stuck. Older rules outside `_____________KDB3API/` do **not** apply.

---

## Cognos checklist for PO (after dual review)

1. Save-load slot and main-blocks: spinner **inside** the box, vertically centered, not overflowing.
2. Kennzahlen load cover sits on `#kdb-control-main-blocks`, not overflowing the tree pane.
3. Change vis type / TopN / dimension: `Diagramm wird geladen` on the **widget shell** until render completes (same as first drop).
4. New tab, first user click: short `Registerkarte wird geladen` on that tab’s `.page.pagegenericPage` (not the KDB footer).
5. Automatic tab traverse (not PDF): same page overlay until land.
6. GET save: overlay on `.pane.paneContent.contentViewPane`; **under** Neues-Parameterset popup; **gone** once tab 1 is current — not for the whole popup lifetime.
7. SET restore still full `.dashboardFrame` + `Dashboard wird wiederhergestellt`.

---

## Out of this WP

Boot overlay C, SET frame, copy B, Play-toggle, leftover-hide, `smq-popup` writes, developer-mode, PDF overlay redesign, ready halt, widgetBase, launchpad, writeback GET/SET other keys.

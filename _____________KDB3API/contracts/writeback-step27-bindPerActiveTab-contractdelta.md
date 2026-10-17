# Contract Delta: step 27 binds vis widgets per active tab

> Delta on `contracts/writeback.md` §6.4 step 27 (and §1186 render semantics), `contracts/_archive/widgetVis-parameterSetRestore-contractdelta.md` §84-85, `contracts/widgetTopN.md` (restore not covered).
> Contract-only. Sequenced **after** WP-J (`tabs-parameterSetActivate-liveWidgetsReady`) and WP-N (degraded noise) are live-verified.

---

**Status:** `Implemented` — live run green 2026-10-06 (see Approval Log)
**Owner:** `writebackSet` (orchestration); consumers `tabs`, `widgetVis`, `widgetTopN`
**Authoring AI:** Cursor coordinator, 2026-10-06

---

## 1. Problem (evidence 2026-10-06)

Step 27 aborts (`abortedByOwner`) because one vis widget with TopN is skipped: `WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT` / `awaiting_topN` (`topNGate.js`, budget `bindingPrerequisiteTimeoutMs: 5000`, `widgetVis/config/defaults.js:6`).

- Step 27 binds while the widget's tab is usually inactive (`writeback.md:966`, `:1186`: "Cognos paints visualizations only on the active page"). Only the vis render wait is deferred (`deferRenderWait`).
- The TopN gate still requires a live helper query: claim → helper `applyBinding` → `renderWidget` → `tableData.reloadTable` → poll `getDataQueryResult` (60 s budget). In the run the poll never saw result items → `DATAQUERY_WAIT_TIMEOUT` + toast with the helper id; the 5 s gate had long expired.
- Startup uses the same chain successfully, at placement on the shown page.
- Step 28 renders only `onCanvas` vis widgets, after step 27, never helpers.
- Legacy started the helper query during placement, overlapping the tab traversal, with no failing budget.

Classification: contract gap. Code follows `writeback.md` and `widgetVis-parameterSetRestore`; neither defines how a helper query can complete before the gate when the page is inactive. "Cognos does not execute the helper query on an inactive page" is **inferred**, not proven.

Likely related PO observation: widgets without data / unclear visualization type after the aborted run (bound on inactive tabs, step 28 never ran).

## 2. Chosen direction (PO, 2026-10-06)

Step 27 runs **per tab**: for each tab that has vis entries in `widgetCorrelation`, first `tabs/parameterSetActivateTabRequested` (incl. WP-J live-widget wait), then `widgetVis/parameterSetBindingRequested` for that tab's vis widgets only. TopN helper queries then run on the active page, as at startup.

Not chosen: TopN resolution in step 28; non-fatal TopN timeout; verify-first.

No step reorder: steps 24-26 and 28-30 unchanged; only step 27's internal sequencing changes.

## 3. Pre-check results (read-only, 2026-10-06)

- **O1 Grouping.** `widgetCorrelation` comes from step 24 (`widgetBase/actions/handleParameterSetRestore.js:71`): `{ [entryIndex]: { widgetId, kind, tabIdx } }`, `tabIdx` = v3 `wgts[].tab` (dashboard-slot index, required integer). Only placed widgets are in the map; a missing tab target already fails step 24. `collectVisWidgets` ignores `tabIdx` (`parameterSetBindingHelpers.js:4-15`), so a per-tab subset of the same shape works **without widgetVis change**. Empty subset is a hard failure → never dispatch txt-only tabs.
- **O2 Showing the tab (blocker for a naive loop).** After step 23 every widget tab has an inner frame, so `parameterSetActivateTabRequested` takes the skip path (`parameterSetActivateTab.js:47-48`) and **does not click**: the page stays on the last tab step 23 clicked. The inner-frame predicate means "page DOM exists", not "page is showing". Step 27 needs a real show.
- **O3 `deferRenderWait`.** Hardcoded in widgetVis (`handleParameterSetBinding.js:84-88`), only affects the vis render wait after the TopN gate. Dropping it re-adds up to 12 s per widget on top of step 28. Keep it.
- **O4 runId / phases.** Same `runId` repeated is safe (stale = strictly lower, `handleParameterSetBinding.js:26-29`). Repeated phase names are an existing pattern (`tabActivateForWidgets` ×4). `required: true` per tab would stop at the first failing tab.
- **O5 Step 28.** Unchanged; lands on the first visible dashboard tab; renders onCanvas vis only. Step 27 must use `restoreActiveTab: false` (true would click back before the bind).
- **O6 5 s gate.** Same gate at startup (`dashboard/widgets/widgetSettings/intent/downstream.js` (`dispatchVisSettingsBatch`)). The 5 s includes Jahr pin, claim, helper move, helper apply and query. Sufficiency on an active page is **not provable from code** → live acceptance.
- **O7 Parent text.** `writeback.md:966`, `:1186`, `:1204`, `:1302`; `widgetVis-parameterSetRestore-contractdelta.md:84-85`; `tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3 / acceptance 2; `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` consumers line; `widgetTopN.md` new restore note.

## 4. Design (PO decisions 2026-10-06: P1 `forceShow` yes, P2 (a), P3 keep)

1. New writeback effect `workflows/parameterSet/set/effects/bindVisPerActiveTab.js` (≤150 lines); `runWidgetRestore.js` (75) replaces its step-27 block with one call.
2. Walk correlation entries in numeric `entryIndex` order; group `kind === "vis"` by `tabIdx`, first-seen order (same as step 23); skip tabs without vis.
3. Per group: `tabs/parameterSetActivateTabRequested` `{ tabIdx, includeHiddenDashboardTabs: true, restoreActiveTab: false, forceShow: true }` (P1), phase `tabActivateForWidgets`, `required: true`. The live-widget wait (WP-J) runs as usual.
4. Then `widgetVis/parameterSetBindingRequested` `{ widgetCorrelation: <that tab's entries> }`, phase `widgetVisBinding` (P2 for required / abort).
5. No new phase name, no `widgetVis` change, `deferRenderWait` kept (P3), step 28 unchanged.

**P1 `forceShow`** (tabs contract change, **approved**): optional boolean on `tabs/parameterSetActivateTabRequested`. When `true`, both inner-frame skip checks are bypassed and the action always clicks via `tabs/traverse` singleTab; the inner-frame wait then resolves immediately; the live-widget wait runs. Only step 27 sets it; steps 18/23 omit it and keep the skip (`tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3 unchanged for them).

**P2 Abort semantics (approved: a):** bind every vis tab with `required: false` (`degradedAllowed` = `allowDegradedWidgetBinding`), then, if any bind phase is not ok, set `run.abortedByOwner = true` and throw `ABORT` once. All tabs are tried; diagnostics per tab. Activation stays `required: true` (immediate abort).

**P3 (approved):** keep `deferRenderWait: true` in widgetVis.

**Fallback:** if `hasVis` but the grouping yields no vis entry (e.g. missing correlation), dispatch today's single `widgetVisBinding` with the full correlation (`required: !allowDegraded`, `degradedAllowed: allowDegraded`) — unchanged legacy-of-KDB3 behaviour.

Cost: one extra click + live-widget wait per vis tab (already-ready widgets resolve immediately).

## 5. Acceptance (draft)

1. Same restore: `widgetVisBinding` ok for every tab; no `awaiting_topN`; no `DATAQUERY_WAIT_TIMEOUT` toast for `model00000193df6a1936_00000000`.
2. Step 28 runs; restore ends `committed` or only singleSelect bookkeeping `degraded` (separate futureTodo).
3. Jahr still passes (WP-J); breakpoint not hit.
4. If TopN still times out on an active page: delta returns to `Draft` (gate budget / helper readiness becomes the topic).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Direction "bind per active tab" chosen by PO; order: after WP-J + WP-N. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Pre-check O1–O7 done; P1 `forceShow`, P2 (a) try all tabs then one abort, P3 keep `deferRenderWait`. |
| 2026-10-06 | `Approved` → `Implemented` | PO vastenburg (live) | Review PASS; committed `2fd7f24`. Live run (fresh load, no observer, breakpoint armed): breakpoint not hit; `nativeMultiSelectRestore` ok; 4× `tabActivateForWidgets` + `widgetVisBinding` pairs after `widgetSettingsRestore`, all ok; no `awaiting_topN`, no TopN toast; `tabsPostRestoreTraverse` ok; `outcome: "degraded"` only from `singleSelectPreRestoreReconcile` / `singleSelectResync` (futureTodo). Separate open issue, not attributed to this delta: widget stacking over kdbControl and position/size outside the canvas on tabs 2..n after restore. Parent text synced (O7): `writeback.md` steps 27 / render semantics / activate skip / §6.6.1 row 27; `widgetVis-parameterSetRestore` §4.7; `tabs-inner-frame-skip-empty-snapshot` §3 + acceptance 2; `tabs-parameterSetActivate-liveWidgetsReady` consumer line; `widgetTopN.md` §8.4. |

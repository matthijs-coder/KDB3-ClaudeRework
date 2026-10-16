# Contract Delta: `tabs/parameterSetActivateTabRequested` waits for live widgets

> Delta on top of `contracts/tabs-parameterSetRestore-contractdelta.md` §5.2 / §8, `contracts/tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3, `contracts/tabs-writeback-readiness-contractdelta.md` §8 / §11 and `contracts/writeback.md` §6.4 (steps 18/19 and 23).
> Contract-only: no production code is approved by this document.
> **Retires an Approved deferral** (§2.1), approved by PO 2026-10-06 (§7 D0).

---

**Status:** `Implemented` — live run 1 green 2026-10-06 (see Approval Log)
**Parents:** `contracts/tabs-parameterSetRestore-contractdelta.md`; `contracts/tabs-inner-frame-skip-empty-snapshot-contractdelta.md`; `contracts/tabs-writeback-readiness-contractdelta.md`; `contracts/writeback.md`
**Owner module / service:** `tabs`
**Consumer:** `writebackSet` (steps 18 and 23; since 2026-10-06 also step 27 with `forceShow: true`, see `writeback-step27-bindPerActiveTab-contractdelta.md`)
**Type:** `feature module contract delta`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Reviewed by:** pending PO

---

## 1. Problem (live evidence, 2026-10-06)

Restore of `oude parameterset.txt` (same-package v2) aborts in `nativeMultiSelectRestore` with `WRITEBACK_FILTER_RESTORE_FAILED`.

Debugger evidence at the throw (conditional breakpoint in Cognos `liveWidgetBundle.js` `onPageContextChanged`):

- Cognos guards `this.visualization` but then calls `this.visAPI.clearModelInvalid()` when the page-context change is in the widget's scope.
- Thrower: live widget `model00000193df762b7b_00000000` (visualization type `List` / `JQGrid`) on tab 3 (scope `model00000193df762b84_00000003`), in the tab's page DOM, **not** in the launchpad, **not** known to widgetBase.
- Widget state: `_renderCount: 0`, `_isCurrentlyRendering: true`, `visModelManager` and `visAPI` not yet set. The widget is in its **first render** after tab activation.
- Tab 3 was activated by step 18 (`activatedBy: "writebackSet"`); the Jahr write followed while that tab's widgets were still initialising. The write itself lands; Cognos' listener throws synchronously inside `replaceFilterContext`.

Current activate semantics (`dashboard/tabs/restore/parameterSetActivation.js` (`parameterSetActivateTab`)): click + 150 ms click margin + inner-frame DOM poll (cap 4000 ms). No Cognos widget-ready signal. `tabs-writeback-readiness-contractdelta.md` §8/§11 already states that activation does not guarantee widget readiness; `writeback.md` steps 18/19 nevertheless treat activation as sufficient before page-context writes.

Supporting run: a console observer that armed `getWidgetWhenReady(id)` (and polled `getWidget(id).getVisApi()`) for **every** live widget on tab 3 during the restore made `nativeMultiSelectRestore` pass. An earlier observer on a single widget did not prevent the throw. This is circumstantial: it does not separate "waiting" from "touching" (see Q4).

Legacy KDB2 did not hit this path: it wrote page-context filters without activating tabs and only traversed tabs afterwards, waiting per live widget with `getWidgetWhenReady` (`waitForLiveWidgetsOnTab`, 2500 ms races). Writing saved MDX ids to non-activated scopes is not adopted here.

Classification: contract gap (activation is not a sufficient barrier for page-context writes), not a code deviation from the current contract text.

## 2. Change

`tabs/parameterSetActivateTabRequested` gains a **tabs-owned post-click wait condition** (the first option listed in `tabs-writeback-readiness-contractdelta.md` §8): after the inner-frame predicate holds, the action waits until Cognos reports every live widget of that tab as ready.

Order of the action after this delta:

1. Inner-frame skip check (unchanged, `tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3).
2. Click path (unchanged): `tabs/traverse` `singleTab`, 150 ms click margin, inner-frame poll, frame-timeout → `{ ok: false }` + `WRITEBACK_TABS_TARGET_MISSING`.
3. **New, on both the skip path and the click path:** live-widget readiness wait for that tab (§3).
4. Return (§4).

Writeback is unchanged: step 18 still awaits this action before step 19 writes; step 23 still awaits it before `widgetBase/ensureTabWidgetsRouted`. No step is reordered.

### 2.1 Superseded parent text

- `tabs-parameterSetRestore-contractdelta.md` §8, bullet "Per-widget `getWidgetWhenReady` + `whenRenderComplete` on activate": the `getWidgetWhenReady` half is **retired** by this delta. `whenRenderComplete` / paint stays deferred to step 28 `widgetsRendered`.
- `tabs-parameterSetRestore-contractdelta.md` §5.2: activate keeps `waitFor: "canvas"` + inner-frame wait and does not switch to `widgetsRendered` (unchanged). "`writebackSet` still consumes only `ok`" stays true: `liveWidgets` is ignored by both callers; diagnostics are recorded, not branched on.
- `tabs-writeback-readiness-contractdelta.md` §11 "guarantees only tab-level lazyload readiness, not widget collector readiness": for `parameterSetActivateTabRequested` the guarantee becomes "inner frame + host-reported live-widget readiness (§3)". Collector readiness (`isCollectorReady`) is still not tabs-owned. Tabs still mutates no widget/filter/writeback state.

## 3. Live-widget readiness wait

- **Facet access:** new tabs reader `effects/readCanvasFacet.js` (same shape as `widgetBase/effects/readCanvasFacet.js`) over the existing stamp `_KDB.runtime.tabs.canvasFacet` (`__orchestratorTabs.js:80`). The orchestrator (120 lines, hard cap) is not edited.
- **Inventory:** `canvasFacet.listCanvasWidgets()` (sync Outcome, sources `getCanvas().findContent()`). Keep descriptors with `isLiveWidget === true` (`contentType === "widget.live"`) and `tabId === slot.tabId`. Every live widget counts, whether or not widgetBase knows it (helper lists, hierarchy tables, pool charts). Inventory is read **after** the inner-frame predicate holds.
- **Wait:** for each id, `canvasFacet.whenWidgetReady(widgetId, { signal, budgetMs })` (existing op; ring 1 arms host `getWidgetWhenReady`). All ids in parallel. No shared in-flight promise exists in ring 1; each call arms its own host waiter.
- **Budget (mandatory, maximum):** `whenWidgetReady` has **no default budget**; without `budgetMs` it never times out. The effect always passes one tab-level `budgetMs` of **5000 ms** (§7 Q1). The wait ends as soon as all waits settle; the budget is only consumed in full when a widget never reports ready.
- **Abort:** own `AbortController` at `_KDB.runtime.tabs.abortControllers["tabLiveWidgetsReady:" + tabId]`; a newer wait for the same key aborts the previous one; `cleanupTabsRuntime` aborts it on destroy. Staleness is **not** an abort trigger: the action checks `guard.isStale` after the await (existing pattern at the other awaits) → `WRITEBACK_RESTORE_CANCELLED`.
- **Outcomes per widget:** `ok` → ready. `CANVAS_WAIT_TIMEOUT` → not ready (timeout). `CANVAS_WAIT_FAILED` / `CANVAS_HOST_*` / `CANVAS_INVALID_ID` → not ready (host failure). `aborted` → handled by the stale/destroy path, not counted as not-ready.
- **Empty inventory:** zero live widgets on the tab → nothing to wait for; `ok: true`. Known blind spots, both yielding a silent empty list: (1) descriptor `tabId` canonicalisation only matches the layout item id or a **direct** child id; a widget whose `getContainer()` is deeper keeps a non-tab id; (2) `listCanvasWidgets` failure or non-array host content. The effect emits a diagnostic when the list Outcome is not `ok`, and `liveWidgets.count` is visible in the result so acceptance can detect a 0.
- **Facet failure / timeout:** see Q2. The action never swallows a later host write failure; that remains the writer's hard abort.

No new facet, no new facet op, no new `_KDB.cognosAPI` call (D4 satisfied: `listCanvasWidgets` and `whenWidgetReady` already have live callers).

No new `_KDB.state.tabs` fields. `isCanvasLoaded` / `canvasLoadedAt` semantics are not changed by this delta.

## 4. Return shape

Existing fields unchanged. Added:

```js
{
  liveWidgets: {
    count: number,          // live widgets found on the tab
    ready: number,          // whenWidgetReady ok
    notReady: string[]      // widgetIds that timed out or failed (Q2)
  }
}
```

`diagnostics[]` gets one entry per not-ready widget (code per Q2) with `{ code, message, details: { widgetId, tabId, facetCode } }`. Fields outside `details` are dropped by `makeDiagnostic` in `dispatchOwnerPhase`. Facet unavailable / inventory failure: one diagnostic with the same code, `details.widgetId: null`, `details.facetCode` = list `errorCode` (or `"CANVAS_FACET_UNAVAILABLE"`), and `liveWidgets.count: 0`.

The action does **not** set `result.degraded`: that would turn the whole restore outcome into `"degraded"` (`runNormalRestore.js:87`). Diagnostics on `ok: true` are recorded and leave the outcome `"committed"`.

## 5. Text sync (`writeback.md`)

- §6.4 (~line 1204): replace the `hasBeenActivated` skip sentence with a pointer to `tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3 (skip on inner-frame predicate). Documentation drift only; code already follows the inner-frame delta.
- §6.4 / steps 18 and 23: add that a successful activate also means "every live widget of that tab reported ready (or is listed in `liveWidgets.notReady`)" per this delta.

## 6. Out of scope

- Swallowing or retrying the `replaceFilterContext` throw (forbidden without a separate contract change).
- Restoring widgets before page-context filters; any step reorder.
- Writing saved MDX `itemId` / `sourceId` to scopes.
- `widgetBase/renderTabWidgetsRequested` or step-28 traverse changes.
- TopN helper `DATAQUERY_WAIT_TIMEOUT` (separate investigation).
- `WRITEBACK_WIDGET_BINDING_DEGRADED` "binding completed with diagnostics" on every successful bind: verified code deviation (`handleParameterSetBinding.js:96` tests truthiness of the always-present apply trace, `reportApplyResult.js:18-31`), against `widgetBindingApply.md` §diagnostics and `widgetVis-parameterSetRestore-contractdelta.md`. Separate fix.
- `tabs-writeback-readiness-contractdelta.md` §4.1 calls `pageId` / `scopeId` aliases of `tabId`; code treats `tabId` = `scopeId` = layout item id and `pageId` = first child. Text drift, separate.
- `writeback.md:241` outcome enum lacks `"abortedByOwner"` (emitted by `executeRestoreRun.js:75-76`). Text drift, separate.
- Diagnostic Log A in `core/services/cognosHost/facets/filters/write.js` (`writeFilter`) (separate, agreed as permanent failure-only log; own step).
- Colour bugs (`sett "Default"`, `backgroundColor` → `bgcol`), deferred.

## 7. Decisions (PO vastenburg, 2026-10-06)

- **D0 Deferral:** the `getWidgetWhenReady` half of `tabs-parameterSetRestore-contractdelta.md` §8 is retired (§2.1). `whenRenderComplete` stays deferred.
- **Q1 Budget:** **5000 ms** per tab, as a **maximum**: the wait resolves as soon as every live widget of the tab reports ready.
- **Q2 Timeout behaviour:** continue with `ok: true`, list ids in `liveWidgets.notReady`, one diagnostic per not-ready widget with new owner-level tabs code **`TABS_LIVE_WIDGETS_READY_TIMEOUT`** (outside the writeback enum, as `parameterSetCodes.js:4-7` allows), facet code in `details.facetCode`. A later host throw still aborts via the writer's existing hard failure. Not chosen: abort with `WRITEBACK_TABS_TARGET_MISSING`.
- **Q3 Scope:** every `parameterSetActivateTabRequested` call (steps 18 and 23), on both the skip path and the click path.
- **Q4 Proof:** acceptance requires a live run **without** console observer (breakpoint left armed, must not hit). If it still throws, "touching" (`getWidget`) rather than waiting was the effective factor and this delta returns to `Draft`.

## 8. Pre-implementation check results (read-only, 2026-10-06)

1. **`tabId` match:** holds when the widget's `getContainer().getId()` is the layout item id or a direct child (`…_00000004` under layout item `…_00000003`) → descriptor `tabId` `…_00000003` == `slot.tabId` == `scopeId` (`readCanvasItemIdentity.js:47-57, 102-119`). Deeper containers miss (see §3 blind spots). Not unit-tested; verified live in acceptance 2.
2. **Inventory during first render:** not provable from KDB3 code; `findContent()` has no rendered/visible filter. The debugger thrower already existed in the content model. Verified live in acceptance 2.
3. **Reader:** no tabs `read*Facet.js` exists → new `effects/readCanvasFacet.js`.
4. **Placement / budget:** body in new `dashboard/tabs/restore/parameterSetActivation.js` (`waitForTabLiveWidgetsReady`); called at the three `ok: true` returns of `dashboard/tabs/restore/parameterSetActivation.js` (`parameterSetActivateTab`) (skip at ~46 and ~54, click success at ~100), each followed by the existing `isStale` check. File is 118 lines / 6 imports → ~7 imports, must stay ≤ 150 lines; if not, extract the success-return builder. Orchestrator untouched.
5. **Callers:** only step 18 (`runFilterRestore.js:55-61`) and step 23 (`runWidgetRestore.js:20-27`), both `required: true`. Neither reads extra fields.

## 9. Acceptance

1. Same restore (`oude parameterset.txt`, fresh dashboard load, tab 3 not opened beforehand, no console observer): `nativeMultiSelectRestore` `ok: true`; Cognos breakpoint `!this.visAPI` does not hit.
2. `liveWidgets.count` for tab 3 > 0 and `notReady` empty in the step-18 activate result.
3. Restore order and phase list unchanged except for the extra wait time.
4. Already-ready tabs: wait resolves without measurable delay.
5. No new `_KDB.state` fields, no new facet op, no `_KDB.cognosAPI` call outside ring 1.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | — | Written after live debugger evidence; awaiting PO on Q1–Q4. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | D0 + Q1 5000 ms max, Q2 (a), Q3 all calls, Q4 live run without observer. Implementation only after execution-spec approval. |
| 2026-10-06 | `Approved` → `Implemented` | PO vastenburg (live) | Review PASS. Live run 1 (fresh load, no observer, breakpoint armed): breakpoint not hit; `nativeMultiSelectRestore` ok; no `TABS_LIVE_WIDGETS_READY_TIMEOUT` in 3× `tabActivateForPageContext` / 4× `tabActivateForWidgets`. Single run; `liveWidgets.count` not observed (not in `run.phases`). Parent text synced (`writeback.md` §6.4 + tabs guarantee line, readiness §11, `tabs-parameterSetRestore` §8). |

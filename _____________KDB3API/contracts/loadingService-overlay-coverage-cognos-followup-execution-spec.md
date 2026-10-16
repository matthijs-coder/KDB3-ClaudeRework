# Execution Spec: loading overlay Cognos follow-up

> Implements `contracts/loadingService-overlay-coverage-cognos-followup-contractdelta.md`. Parent coverage delta stays; this spec is the punch list only.

---

**Status:** `Ready for execution`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-03
**Executing AI:** grok 4.6 army F1–F4

---

## Exclusive allowlists

### F1 CSS + catalog + tree mount

**May edit:** `KDB3/css/loadingAnimation.css`, `KDB3/css/kdb-control/shell.css`, `KDB3/css/kdb-control/panels.css` (only if main-blocks compact belongs there), `KDB3/js/core/cognosHost/config/rootChromeSelectors.js`, `KDB3/js/dashboard/metricsTree/effects/applyMetricsTreeLoading.js`, `KDB3/js/dashboard/canvas/kdbControl/config/domSelectors.js`

**Must not edit:** writeback, tabs, widgetVis, KDB.js, loadingService JS (CSS only unless caption class needed — CSS only).

Work:
- Overlay z-index **1000** (was 20000).
- Compact: `#kdb-control-save-load-slot.KDB_loading` and `#kdb-control-main-blocks.KDB_loading`: `overflow:hidden`; spinner 32px; caption ~11px; overlay flex-centered in the mount.
- `root.contentViewPane = u.req(".pane.paneContent.contentViewPane")`
- Tree `querySelector` **`#kdb-control-main-blocks`** (add `mainBlocksSelector` on kdbControl domSelectors; metricsTree may query that id via kdbControl config AMD or the literal from that config — do not scrape Cognos). Keep mountKey `kdb-metrics-tree-loading`.

### F2 vis re-apply

**May create:** `KDB3/js/dashboard/widgets/widgetSettings/effects/startWidgetRenderLoading.js`

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/view/placeWidgetSettingsPanel.js`, `KDB3/js/dashboard/widgets/widgetVis/actions/handleApplySetting.js`, `KDB3/js/dashboard/widgets/widgetSettings/view/resolveWidgetPlacementContext.js` (Cognos punch: **edit** `resolveWidgetEl` — `document.getElementById(widgetId)`).

**Must not edit:** `runApplyBindingRenderSteps.js`, finishRenderWait.js (finish already there).

Work:
- Move start helpers out of placeWidgetSettingsPanel into the new effects file (factory-scope, try/catch).
- placeWidgetSettingsPanel AMD-imports and calls it after new panel insert (same gates).
- handleApplySetting: before `runBindingPipeline`, call start with `{ widgetId, widgetType: "live", isHistoryReplay, source, widgetEl? }`. Resolve widgetEl via `resolveWidgetEl` if missing. Skip history replay. If pipeline result `ok !== true`, `finishLoading({ mountKey: "kdb-widget-render-loading-"+id })` best-effort (do not add AMD past 10; handleApplySetting is 5 imports / 110 lines — extract if over 150).
- Cognos punch 2026-09-03 AM: `resolveWidgetEl` uses `document.getElementById(widgetId)`. Do **not** grow `handleApplySetting.js` (~147). Do **not** edit `runApplyBindingRenderSteps.js`.

### F2b spinner reuse (Cognos punch 2026-09-03 AM)

**May edit:** `KDB3/js/core/services/loadingService/effects/applyLoadingOverlay.js`

**Must not edit:** `removeLoadingOverlay.js`, `createLoadingService.js`, widget files (those are F2).

Work: `ensureSpinner` reuses only a **direct child** `.loadingIndicatorContainer` (`querySelector(":scope > .loadingIndicatorContainer")` or child-node walk). If none, insert a new direct-child spinner. Nested Cognos `.loadingIndicatorContainer` must not be reused. Stay ≤150. No product/copy/z-index change.

### F3 GET remount + lift at land

**May edit:** `KDB3/js/core/services/writeback/get/effects/applyWritebackGetPersistLoading.js`, `KDB3/js/core/services/writeback/get/createWritebackGetService.js`

**Must not edit:** `applyWritebackGetPersistLanding.js`, `scheduleWritebackGetPersistRestore.js` unless a one-line stop tying finish to restore is required — prefer finishing in createWritebackGetService **always** after `await applyWritebackGetPersistLanding` (delete the `isHoldArmed` keep).

Work:
- Mount: `selectors.root.contentViewPane` fallback `".pane.paneContent.contentViewPane"`.
- After land await: **always** `finish(_KDB)` (skip-land too).
- Keep start after validate / bridge only. Keep finish on land throw. Hold/restore continue without overlay.

### F4 tab page overlay

**May create:** `KDB3/js/dashboard/tabs/effects/applyTabPageLoading.js`

**May edit:** `KDB3/js/dashboard/tabs/effects/traverseTabs.js`, `KDB3/js/dashboard/tabs/effects/observeActiveTab.js`

Work:
- `applyTabPageLoading.start(_KDB, { pageId? })` / `finish(_KDB)`. mountKey `kdb-tab-page-loading`, messageKey `tab`.
- Resolve mount: if `pageId`, `document.getElementById(pageId)` then `querySelector` catalog `page.exactPageRootSelector` or `.page.pagegenericPage`. Else selected tab wrapper (not `#KDB_bottomFooterWrapper`).
- traverse: skip if `options.source === "dashboardPdf"` OR `options.source === "writebackGet"` (GET persist/collect use GET overlay / avoid double with persist). Wait: collectWidgets also source writebackGet — user still sees collect tab flicker. **Do skip only persist landing:** skip when `options.source === "writebackGet"` && `options.scope === "singleTab"`. Collect `visibleDashboard` **does** get tab overlay.
- Start after buttons resolved, before `_clickTraverseTabSequence`. Finish in `runTraverse` finally-equivalent (after restore click, on early false returns, on __controller catch). File is 148 lines / AMD 7 — **must** use the sibling so traverse stays ≤150 (8th import OK).
- observeActiveTab: when `firstActivation && source === "user"`, start with that tab’s `pageId`. Finish when inner `.pagegenericPage` exists under the page wrapper or 2s timeout. Do not start when source is `api`/`mount`.

### F5 metrics tree jsTree worker overlay (PO 2026-09-03 AM)

**Status: option 1 (PO 2026-09-03 AM).** Delete `setTimeout(deferred.resolve, 0)` in `renderMetricsTrees.js` `waitForTreeReady`. Keep `.one("ready.jstree.kdbReady")`. Do **not** recreate `observeMetricsTreeJsTreeLoading.js`. Do not edit `runMetricsTreeMount.js`.

### F5-css compact metrics container

**May edit:** `KDB3/css/loadingAnimation.css` only.

Work: compact 32px remains **only** on `#kdb-control-save-load-slot` and `#kdb-control-main-blocks`. `#kdb-control_metrics_container.KDB_loading` compact rules **removed** (overlay 2 cancelled).

---

## Section A

Echo the 10 MUST `.mdc` + lifecycleVocabulary + overlay coverage delta + **this follow-up delta** + this spec (14 items) before writing.

## Section K forbidden

Same as parent spec. No z-index 20000. No GET hold overlay. No `#selectParameterSet`. No `runApplyBindingRenderSteps.js`. No commit.

## Section J

Compact CSS in-box; GET contentViewPane + finish after land; vis re-apply starts; tab overlay on traverse (except PDF + GET singleTab) and user firstActivation; files ≤150.

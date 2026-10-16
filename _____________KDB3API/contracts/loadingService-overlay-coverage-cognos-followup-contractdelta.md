# Contract Delta: loading overlay Cognos follow-up (size, vis re-apply, tab page, GET mount)

> Amends `loadingService-overlay-coverage-contractdelta.md` after PO Cognos 2026-09-03. Does **not** reopen boot-done, SET `.dashboardFrame`, copy B, Play-toggle, leftover-hide, or `smq-popup` writes.

---

**Status:** `Approved` — PO vastenburg 2026-09-03 (chat punch list).
**Type:** `shared service contract delta` (follow-up)
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-03
**Reviewed by:** PO vastenburg, 2026-09-03
**Parent:** `contracts/loadingService-overlay-coverage-contractdelta.md`

---

## 1. Compact kdbControl mounts

Spinner `is-large` (110px) plus caption overflows `#kdb-control-save-load-slot` and `#kdb-control-main-blocks` and is not vertically centered in those boxes.

Legacy used the same 110px `is-large` on `#kdb-control_save-load_container` / main-toggles-block — no `is-medium`. **Production must shrink** those two mounts (PO defect).

| Rule | Spec |
|---|---|
| Overflow | `overflow: hidden` on those two mounts while `.KDB_loading` |
| Spinner | **32px** circle (override `.is-large` width/height inside those mounts) |
| Caption | smaller type, still German, still centered |
| Center | flex column `align-items` + `justify-content: center` on the overlay **inside the mount** (keep `position: relative` on the mount) |
| Tree mount | Kennzahlen overlay moves from `#kdb-control_metrics_container` to **`#kdb-control-main-blocks`** (same mountKey `kdb-metrics-tree-loading`, `messageKey: metrics`) |
| Slot | stays `#kdb-control-save-load-slot` |

No new `startLoading` size option unless a file would otherwise grow past 150 — CSS scoped to the two IDs is enough.

---

## 2. z-index (GET popup)

`.KDB_loading > .loadingIndicatorContainer` z-index **20000** paints **above** Cognos `smq-popup` (“Neues Parameterset erstellen”).

- Default overlay z-index: **1000** (covers widgets/settings in the mount; below body-level Cognos modal).
- GET overlay must not cover that popup.

---

## 3. GET persist remount + shorter window

Supersedes coverage-delta §7.3 mount/window.

| | Was (trial) | Now |
|---|---|---|
| Mount | `.dashboardFrame` | **`.pane.paneContent.contentViewPane`** |
| Catalog | `root.dashboardFrame` | Add `root.contentViewPane` in `rootChromeSelectors.js` (`u.req(".pane.paneContent.contentViewPane")`) |
| `mountKey` | `writeback-get-persist-loading` | unchanged |
| Copy | `dashboardSave` | unchanged |
| Window | land + popup hold + user-tab restore | **Start** after validate / before persist-land click (bridge only). **Finish as soon as land has arrived on the first visible tab** (`applyWritebackGetPersistLanding` returned). Do **not** keep the overlay for popup hold or restore-to-user-tab. |

Skip-land (already on first tab): start is optional; if started, finish immediately. Still no `smq-popup` write. SET stays `.dashboardFrame`.

---

## 4. Vis re-apply (type / TopN / dimension)

First drop overlay stays (new panel insert). **Also** start the same whole-shell overlay (`messageKey: chart`, `kdb-widget-render-loading-{id}`) on user `handleApplySetting` **before** `runBindingPipeline` (covers visType, dimension, topNChoice). Skip history replay. Finish remains `finishRenderWait` `finally`. If the pipeline never reaches that finish, finish in the `handleApplySetting` result path when `ok !== true`.

Extract `widgetSettings/effects/startWidgetRenderLoading.js` (reuse from `placeWidgetSettingsPanel.js`). Resolve `widgetEl` via existing `resolveWidgetEl(_KDB, widgetId)` when the action has no shell. **Cognos punch 2026-09-03 AM:** `resolveWidgetEl` must find the canvas shell with `document.getElementById(widgetId)` (do not use `renderParentEl.getElementById`; do not require `data-kdb-widget-id`). loadingService `ensureSpinner` may reuse only a **direct child** `.loadingIndicatorContainer` (`:scope > …`); never a nested Cognos spinner.

---

## 5. Tab page overlay

Mount: the **Cognos canvas page** `.page.pagegenericPage` of the **target tab** (scoped under that tab’s page wrapper / `pageId`). **Not** `document.querySelector(".page.pagegenericPage")` (hits KDB footer). Catalog: `dragDrop.canvasDropboxSelector` / `page.exactPageRootSelector` scoped. `mountKey`: `kdb-tab-page-loading`. `messageKey`: `tab` (`Registerkarte wird geladen`).

| When | Start | Finish |
|---|---|---|
| Automatic `tabs/traverse` | After buttons exist, **before** click sequence (`traverseTabs.js` `runTraverse`) | After sequence + restore click return, **inside** `runTraverse` (landed). Catch/timeout also finish. |
| User first visit to a new tab | `observeActiveTab` when `firstActivation === true` and `source === "user"` | When `hasTabInnerFrame` for that tab, or **2s** cap |
| GET persist land | **Do not** start this overlay (GET uses contentViewPane) | — |
| PDF traverse | **Do not** start (PDF has its own overlay; spinner must not enter html2canvas) | — |

Copy stays German `Registerkarte wird geladen`.

---

## 6. Files

**CSS / catalog:** `loadingAnimation.css` (z-index 1000; compact rules for the two kdbControl ids); `kdb-control/shell.css` or `panels.css` if slot rules belong there; `rootChromeSelectors.js` (`contentViewPane`); kdbControl `config/domSelectors.js` (`mainBlocksSelector`).

**Vis:** new `startWidgetRenderLoading.js`; `placeWidgetSettingsPanel.js` (call extract); `handleApplySetting.js` (start before pipeline). Do not edit `runApplyBindingRenderSteps.js`.

**Tree:** `applyMetricsTreeLoading.js` mount `#kdb-control-main-blocks`. Overlay 2 cancelled (option 1: `waitForTreeReady` waits on `ready.jstree`).

**GET:** `applyWritebackGetPersistLoading.js` + `createWritebackGetService.js` (always finish after land; drop hold-armed keep). Prefer not to grow `applyWritebackGetPersistLanding.js`.

**Tabs:** new `tabs/effects/applyTabPageLoading.js`; `traverseTabs.js` (two calls — split if >150); `observeActiveTab.js` firstActivation user path.

---

## 7. Acceptance

1. Slot and main-blocks: spinner **inside** the box, vertically centered, not 110px overflow.
2. Vis type / TopN / dimension change: `Diagramm wird geladen` on the widget until render complete (same as first drop).
3. New tab, first user click: short `Registerkarte wird geladen` on that tab’s `.page.pagegenericPage`.
4. Automatic traverse (not PDF, not GET persist): same page overlay until land.
5. GET save: overlay on `.pane.paneContent.contentViewPane`; **below** Neues-Parameterset popup; gone once tab 1 is current — not for the whole popup lifetime.
6. SET restore still `.dashboardFrame` + `Dashboard wird wiederhergestellt`.
7. Overlay 1 on `#kdb-control-main-blocks` stays until jsTree `ready.jstree` (worker “Loading …” gone). No English loading leaf after lift. No second overlay.

---

## 8. Metrics tree ready (PO 2026-09-03 AM, option 1)

jsTree `ready.jstree` fires only after the worker has removed “Loading …”. Overlay **1** (`kdb-metrics-tree-loading` on `#kdb-control-main-blocks`) stays until that event. **Delete** `setTimeout(deferred.resolve, 0)` in `waitForTreeReady` (`renderMetricsTrees.js`). Keep `$tree.one("ready.jstree.kdbReady", deferred.resolve)`.

**No overlay 2.** Do **not** recreate `observeMetricsTreeJsTreeLoading.js`, MutationObserver, or `runtime.metricsTree.observers`. Do not change `runMetricsTreeMount.js` finish wiring. Do not set `worker: false`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-03 | Approved | PO vastenburg | Cognos punch list in chat. |
| 2026-09-03 AM | Overlay 2 mount locked | PO vastenburg | Second tree overlay on `#kdb-control_metrics_container` (not a second key on main-blocks). |
| 2026-09-03 AM | Option 1 | PO vastenburg | Drop `waitForTreeReady` `setTimeout(0)`; overlay 1 until `ready.jstree`; overlay 2 cancelled. |

# Execution Spec: home dialog (WP6 cubes + WP7 watchdog)

> Mechanical implement. Architecture is **locked** in the two deltas. Do not reopen the proposal series. Do not invent a third chrome.

**Status:** `Implemented` — JS + `showCancel` follow-up 2026-09-08. Copy/layout: `home-dialog-wp6-wp7-copy-layout-followup-execution-spec.md`. Settlement wait: `home-dialog-wp6-settlement-wait-execution-spec.md`. PROGRAM **6** / **7** Cognos green 2026-09-08.  
**Contracts:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` (WP6 **Approved** mechanism) · `contracts/loadingService-watchdog-dialog-contractdelta.md` (WP7 **Approved** mechanism)  
**Phase:** full implement  
**Authoring AI:** WP6 captain, 2026-09-08  
**Executing AI:** Grok 4.6 in a **fresh** chat (WP7 agent implements **both**)

---

## Section A. Pre-flight read list

Echo **one sentence each** as the first message, **before any JS**. Then wait for PO/supervisor “go files” unless the handoff says echo-then-write in the same turn (this handoff: **echo then write in the same turn**).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc`
12. `_____________KDB3API/contracts/cognosHostService.md` §0 + D4 + §4 dashboard catalogue (not the whole history)
13. `_____________KDB3API/contracts/cubes-unavailable-home-dialog-contractdelta.md` — locked package
14. `_____________KDB3API/contracts/loadingService-watchdog-dialog-contractdelta.md` — locked package
15. This spec

Also echo: **this WP delta** one-liner for WP6 and WP7.

Copy live patterns: `createDashboardAdapter.js`, `buildDashboardOutcome.js`, `readDashboardHostValue.js` (do **not** reuse it for list/nav), `__orchestratorCognosHost.js`, `confirmAndDispatchTabMove.js` choose call shape, `scheduleLoadingWatchdog.js`.

---

## Section B. Folder tree (create in this order)

```
KDB3/js/core/services/cognosHost/facets/dataSources/
  config/dataSourcesErrorCodes.js
  buildDataSourcesOutcome.js
  resolveDataSourcesHostApi.js
  read/hasErrorDataSource.js
  createDataSourcesAdapter.js
KDB3/js/core/services/cognosHost/facets/dashboard/nav/
  replaceWithBiHomePerspective.js
  openAppView.js
KDB3/js/core/homeDialog/
  config/homeDialogLabels.js
  runtime/ensureHomeDialogRuntime.js
  presentHomeChoice.js
  presentCubesUnavailable.js
  __orchestratorHomeDialog.js
KDB3/js/core/services/loadingService/effects/showLoadingWatchdogDialog.js
```

Edits (existing only): see allowlist.

---

## Section C. Exclusive allowlist

**MAY create/edit only:**

| Path | Job | Lines / AMD |
|---|---|---|
| New files in §B | as named | ≤150 / ≤10 |
| `composeCognosHostEdgeFacets.js` | AMD 3→4: add `dataSources` | stay ≤120 orch-like |
| `createCognosHostService.js` | public key `dataSources: facets.dataSources` | 93→≤150 |
| `createDashboardAdapter.js` | bind two nav ops | 33, AMD 2→4 |
| `facets/dashboard/config/dashboardErrorCodes.js` | add NAV codes if needed | small |
| `KDB3/js/KDB.js` | (1) AMD + factory param `__orchestratorHomeDialog.js` after services (2) `setupCoreFactories`: `_orchestratorHomeDialog(_KDB)` after `_orchestratorServices` (3) `renderKDB` **327→328**: `await` `runtime.homeDialog.presentCubesUnavailable` via a factory-scope named helper, try/catch convert | 411→≤500; AMD 31→32 |
| `scheduleLoadingWatchdog.js` | after `finishLoading` in `runWatchdogFinish`, if `mountKey === "kdb-root-loading-animation-mount"`, call show helper | 37, AMD 1→2 |
| `loadingService/config/loadingLabels.js` | add `watchdogTitle` + `watchdogBody` exact DE from WP7 §1 | 19→~22 |
| `contracts/cognosHostService.md` | **after JS dual-review only** — captain one-liners, not this executor, unless handoff says executor may add the D4 consumer sentence |

**MUST NOT touch:** `createMessageService.js`, `buildMessageDialog.js`, `confirmAndDispatchTabMove.js`, `applyLoadingOverlay.js`, `createLoadingService.js`, `dashboardPdf/**`, `manageLoadingSession.js`, `dataSources.js` (layer-1 — call it from ring 1, do not add `hasErrorDataSource` there unless you copy `getUserName` inner-flatten; **prefer scan only in ring-1 `hasErrorDataSource.js`**), `__orchestratorServices.js`, `messageLabels.js`, WP2/SSS, `.cursor/rules/*.mdc`.

---

## Section D. Per-file (rules + behavior)

**Rules to apply (every JS file):** `amd.mdc` (`define`, `"use strict"`), `naming.mdc` (`_` on boundary inputs), `error-handling.mdc` (try/catch on named executables; Outcome convert at facet boundary), `cognos-adapter.mdc` (features/homeDialog deep files: stamped facet only), `feature-structure.mdc` (no business logic in orch), `dom.mdc` (no `document.querySelector` beyond messageService).

### dataSources facet

- Copy Outcome dialect from `buildDashboardOutcome.js` into `buildDataSourcesOutcome.js` (no `shared/` folder).
- `hasErrorDataSource(_ctx)`: if disposed → disposed Outcome. Resolve host via `_KDB.cognosAPI.dataSources.getDataSourceList` (or getFeature + list). Missing feature / missing `getDataSourceList` → **`buildOk(false)`** (legacy). For each item, `getState() === "error"` inside try; throw on item → that item is non-error. Return `buildOk(true|false)` only. **Never** put the list or `dataSourceAPI` on `Outcome.data`.
- `createDataSourcesAdapter`: `{ hasErrorDataSource: hasErrorDataSource.bind(null, ctx) }`.

### dashboard nav

- `replaceWithBiHomePerspective`: ring 1 calls `_KDB.cognosAPI.dashboard.getDashboardBiBaseUrl()`. Null/failed → failed Outcome, **no** replace. Else `window.top.location.replace(base + "?perspective=home")` (ensure slash like layer-1). `location.replace` from **ring 1 only**.
- `openAppView(_ctx, _viewName)`: wrap `_KDB.cognosAPI.dashboard.openAppView(_viewName)` with `_viewName === "home"` from caller. Discard/await host thenable **inside** ring 1; `Outcome.data` = `{ ready: true }` or `null`. Never return the host Promise.
- Do **not** use `readDashboardHostValue.js` for these ops.

### `core/homeDialog/` (NOT a `_KDB.services.*`)

- `homeDialogLabels.js`: exact DE title, body, `closeLabel`, `minimizeLabel` from WP6 locks 1–3.
- Orchestrator: merge `_KDB.config.labels.de.homeDialog`; `ensureHomeDialogRuntime`; stamp `_KDB.runtime.homeDialog.dataSourcesFacet` and `.dashboardFacet` from `_KDB.services.cognosHost` **once** (orch may look up the service; deep files must not). Publish `presentHomeChoice` and `presentCubesUnavailable` on `_KDB.runtime.homeDialog`. **No** `_KDB.api.homeDialog`, **no** `_KDB.services.homeDialog`.
- `presentHomeChoice(_KDB, _options)`: `_options.title`, `.message`, `.code`, `.severity`. Build `choices` from homeDialog labels + ids `home-close` / `home-minimize`. `await message.choose({ code, title, message, severity, choices, showCancel: false })`. Do **not** pass empty `cancelLabel`. On `reason === "selected"` + `home-close` → stamped `dashboardFacet.replaceWithBiHomePerspective()`. `home-minimize` → `openAppView("home")`. Else (`null` / cancel / dismiss) → no nav. Missing `choose` → warn, return. try/catch convert.
- `presentCubesUnavailable(_KDB)`: read stamp `dataSourcesFacet.hasErrorDataSource()`. If `ok !== true` or `data !== true` → return. Else `presentHomeChoice` with homeDialog cube title/body, `code: "CUBES_UNAVAILABLE"`, `severity: "error"`. Missing facet → warn, no dialog.

### WP7

- `loadingLabels.js`: `watchdogTitle` / `watchdogBody` exact WP7 §1 DE.
- `showLoadingWatchdogDialog(_KDB)`: `__controller`. Read loading labels; warn if empty (no hardcoded DE). Call `_KDB.runtime.homeDialog.presentHomeChoice` with those strings, `code: "LOADING_WATCHDOG"`, `severity: "warning"`. Missing helper → warn, return. **No** `choose`, **no** cognosHost lookup.
- `runWatchdogFinish`: keep `finishLoading` first. Then if `mountKey === "kdb-root-loading-animation-mount"`, call the new helper. Do not fire on any other key.

### `KDB.js`

- Factory-scope helper `awaitCubesUnavailableHomeDialog(_KDB)` — one try/catch, await presentCubesUnavailable if function. Call it between `startDashboardInitialization` and `startModules`. Do not inline detector. Do not call `_KDB.cognosAPI`.

---

## Section E. Acceptance (executor self-check)

WP6: no `hasErrorDataSource` string in feature files; only ring 1. `choose` still N-way for tabs. No Glass footer class. `KDB.js` still ≤500.

WP7: 300s unchanged; PDF 1800000 untouched; non-boot mountKeys finish-only.

---

## Section F. Forbidden

Re-open Q1 cancel. Poll. tableData surrogate. `showAlert` for WP7. New `messageService` method. CSS-hide of the cancel button. Folders `helpers`/`common`/`shared`. Tick PROGRAM 6/7. Git commit. Dump `KDB.js` into chat (file:line only).

---

## Section G. After files

Grok dual-review (short briefs: allowlist paths + FAIL/NIT). Do not self-certify Cognos green. Parent one-liners = captain after review, not executor (executor may **draft** them at delta bottom, not apply until review).

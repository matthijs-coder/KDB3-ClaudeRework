# Execution Spec: loading overlay coverage + German status text

> Mechanical spec for grok 4.6 implementers. Architecture: `contracts/loadingService-overlay-coverage-contractdelta.md` (**Approved**, PO vastenburg 2026-09-02).
> Four writers, **exclusive** allowlists. Echo every MUST in Section A **before** producing files.
> No harness. Production tree: `KDB3/js/**` + listed CSS.

---

**Status:** `Reviewed` — dual review 2026-09-02: semantic GREEN except vis seed-fail (fixed); mechanical YELLOW (grandfathered helper try/catch / nested factory collect). GET `.dashboardFrame` cover = PO Cognos taste-check.
**Module / contract:** `contracts/loadingService.md` + `contracts/loadingService-overlay-coverage-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-02
**Executing AI:** grok 4.6 army (W1–W4)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos (GET cover taste-check)

---

## Exclusive allowlists (no two writers on the same file)

### W1 loadingService + catalog + CSS + labels

**May create:**

- `KDB3/js/core/services/loadingService/config/loadingLabels.js`
- `KDB3/js/core/services/loadingService/effects/resolveLoadingMessage.js` (only if applyLoadingOverlay would exceed 150)

**May edit:**

- `KDB3/js/core/services/loadingService/createLoadingService.js` (pass-through only unless needed)
- `KDB3/js/core/services/loadingService/__orchestratorLoadingService.js`
- `KDB3/js/core/services/loadingService/effects/applyLoadingOverlay.js`
- `KDB3/js/core/services/loadingService/effects/removeLoadingOverlay.js`
- `KDB3/js/core/services/loadingService/effects/scheduleOverlayRemoval.js`
- `KDB3/js/core/services/loadingService/runtime/clearLoadingRuntime.js`
- `KDB3/css/loadingAnimation.css`
- `KDB3/js/core/cognosHost/config/rootChromeSelectors.js`

**Must not edit:** KDB.js, writeback/**, widgetSettings/**, widgetBindingApply/**, metricsTree/**, kdbControl/**, leftoverWidgets.css, `.cursor/rules/**`.

### W2 vis overlay

**May create:** `KDB3/js/dashboard/widgets/widgetSettings/effects/startWidgetRenderLoading.js` (if placeWidgetSettingsPanel would exceed 150 or AMD 10)

**May edit:**

- `KDB3/js/dashboard/widgets/widgetSettings/view/placeWidgetSettingsPanel.js`
- `KDB3/js/core/services/widgetBindingApply/effects/finishRenderWait.js`

**Must not edit:** `runApplyBindingRenderSteps.js`, `placeAllWidgetControls.js` unless a one-line payload flag is the only way to pass historyReplay — prefer reading payload via context. W2 may extend `placeAllWidgetControls.js` **only** to pass `isHistoryReplay` / `source` onto `context` (file is 119 / AMD 8). If that edit is needed, it is W2-exclusive (W3/W4 must not touch it).

**Must not edit:** loadingService internals (call `_KDB.services.loading` only), leftoverWidgets.css.

### W3 metricsTree + save-load slot

**May create:**

- `KDB3/js/dashboard/metricsTree/effects/applyMetricsTreeLoading.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/applySaveLoadSlotLoading.js`
- `KDB3/js/dashboard/canvas/kdbControl/config/domSelectors.js` (slot id) if none exists

**May edit:**

- `KDB3/js/dashboard/metricsTree/effects/runMetricsTreeMount.js`
- `KDB3/js/dashboard/canvas/kdbControl/framework/placeControlShell.js`
- `KDB3/js/dashboard/canvas/kdbControl/framework/buildControlShell.js` (read id from config if created)
- `KDB3/css/kdb-control/shell.css` (slot sibling-opacity; do not invent `helpers/`)

**Must not edit:** loadingService internals, writeback GET/SET, widgetSettings, KDB.js.

### W4 writeback + boot message

**May create:** `KDB3/js/core/services/writeback/get/effects/applyWritebackGetPersistLoading.js`

**May edit:**

- `KDB3/js/core/services/writeback/set/effects/loadingGuards.js`
- `KDB3/js/core/services/writeback/get/createWritebackGetService.js`
- `KDB3/js/core/services/writeback/get/scheduleWritebackGetPersistRestore.js`
- `KDB3/js/core/services/writeback/get/applyWritebackGetPersistLanding.js` — **only** if a **one-line** call to finish-on-cancel is required and a sibling cannot see `cancelWritebackGetPersistLanding`. Prefer **not** editing this file (150 cap). If a call is required, extract 5 lines out first so the file stays ≤150.
- `KDB3/js/KDB.js` — add `messageKey: "dashboard"` to existing `startLoading` options only. No new boot logic.

**Must not edit:** loadingService internals except via public API; metricsTree; widgetSettings; rootChromeSelectors (W1).

---

## Section A. Pre-flight read list

Executing AI **must** echo one sentence per item **before** producing files:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; pure reducers exempt.
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/_template.md` — contracts live beside architecture, not in JS.
13. `_____________KDB3API/contracts/loadingService-overlay-coverage-contractdelta.md`
14. This execution spec.

Also read your allowlisted live files before editing.

---

## Section B. Folder tree (creates only)

```
KDB3/js/core/services/loadingService/config/loadingLabels.js
KDB3/js/core/services/writeback/get/effects/applyWritebackGetPersistLoading.js
KDB3/js/dashboard/metricsTree/effects/applyMetricsTreeLoading.js
KDB3/js/dashboard/canvas/kdbControl/effects/applySaveLoadSlotLoading.js
```

Conditional: `resolveLoadingMessage.js`, `startWidgetRenderLoading.js`, kdbControl `config/domSelectors.js`.

---

## Section C. Per-file specifications (hot files)

### W1 — `loadingLabels.js`

- **Role:** config / German catalog
- **Lines:** target 20
- **AMD:** `define([], function () { return { … }; })`
- Keys **exactly:** `dashboard`, `dashboardSave`, `dashboardRestore`, `chart`, `tab`, `metrics`, `parameterSelect` with DE strings from the delta §5.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc` (config folder).

### W1 — `__orchestratorLoadingService.js`

- Merge labels: `Object.assign({}, loadingLabels, existing)` onto `_KDB.config.labels.de.loading`; existing wins. Same pattern as writeback. Stay ≤120 lines, AMD ≤10.
- **Rules to apply:** `kdb-object.mdc` (registers `_KDB.services.loading`), `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc` (thin orchestrator).

### W1 — `applyLoadingOverlay.js`

- Replace `classList.add("KDB_hide")` with `KDB_loading`.
- Resolve caption via `message` or `labels.de.loading[messageKey]`.
- `ensureSpinner`: if spinner already in mount, **update** caption text (or hide caption node if empty). If inserting, include `<p class="KDB_loadingMessage">`.
- Do not call `_KDB.cognosAPI`.
- **Rules to apply:** `amd.mdc` (named helpers at factory scope, not nested in `__controller`), `dom.mdc`, `error-handling.mdc`, `naming.mdc`, `feature-structure.mdc` (≤150).

### W1 — remove / scheduleOverlayRemoval / clearLoadingRuntime

- Remove `KDB_loading` wherever `KDB_hide` was removed for this mount. Do not remove gear `KDB_hide`.
- **Rules to apply:** `runtime.mdc`, `error-handling.mdc`, `amd.mdc`.

### W1 — `loadingAnimation.css`

- `.KDB_loading > .loadingIndicatorContainer { position:absolute; inset:0; z-index:20000; }` + opaque background; transparent variant uses alpha.
- Center spinner and `.KDB_loadingMessage` (German, readable on the cover).
- No generic `.KDB_hide` rule.

### W1 — `rootChromeSelectors.js`

- Add `dashboardFrame: u.req(".dashboardFrame")` next to `pageViewContent`.

### W2 — vis start

- After panel is in the DOM in `placeWidgetSettingsPanel.js`.
- Only `context.widgetType === "live"` (not `"text"`).
- Skip when `context.isHistoryReplay === true` or `context.source === "historyReplay"` — W2 must thread those fields from `placeAllWidgetControls` payload onto context if missing.
- `startLoading({ mountEl: context.widgetEl, mountKey: "kdb-widget-render-loading-" + widgetId, messageKey: "chart" })`.
- Store handle under `_KDB.runtime.widgetVis.byId[id]` **or** `_KDB.runtime.widgetSettings` if vis runtime missing at placeControls time — pick the owner that already has a byId bucket; do not invent `_KDB.runtime.loading` extra. If neither has a slot, store on `_KDB.runtime.widgetSettings.domRefs` / a `pendingPromises` map keyed by widgetId under **widgetSettings** runtime (owner of start). Finish looks up by widgetId + mountKey (finishLoading `{ mountKey }` is enough).
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `dom.mdc` (no `#main`), `state.mdc` (no foreign state writes).

### W2 — vis finish

- `finishRenderWait.js`: in all return paths (success, timeout, abort, mapped failure), `finishLoading({ mountKey: "kdb-widget-render-loading-" + widgetId })` best-effort try/catch. Do not add AMD if at 10; use `_KDB.services.loading` already global.
- Check AMD count before adding imports (currently 3).
- **Must not** edit `runApplyBindingRenderSteps.js`.
- **Rules to apply:** `error-handling.mdc`, `amd.mdc`, `feature-structure.mdc` (file 107 — keep ≤150).

### W3 — metrics tree

- `applyMetricsTreeLoading.js`: `start({ _KDB })` / `finish({ _KDB })`. Mount = `document.querySelector(selectors.metricsTree.rootSelector)`. mountKey `kdb-metrics-tree-loading`. messageKey `metrics`.
- Call **start** immediately after `metricsTree/loadStarted` dispatch, **before** `waitForRows`. Finish after `rendered` dispatch and in `handleMountError` / abort false-return paths.
- If `runMetricsTreeMount.js` would exceed 150, keep the helper and only add two calls.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc`.

### W3 — save-load slot

- After `saveLoadSlotEl` is assigned: start overlay mountKey `kdb-control-save-load-slot-loading`, messageKey `parameterSelect`.
- `MutationObserver` childList on the slot; finish when `slot.children` has an Element (ignore the spinner container itself — query `:scope > :not(.loadingIndicatorContainer)`). Timeout 30s then finish.
- Store observer + timeout on `_KDB.runtime.kdbControl.observers` / `.timers` (ensure buckets). Disconnect on finish and on kdbControl destroy if a destroy path already clears observers — do not skip leak.
- Do **not** query `#selectParameterSet`.
- CSS in `shell.css`: `#kdb-control-save-load-slot.KDB_loading > :not(.loadingIndicatorContainer) { opacity:0; pointer-events:none; }`
- **Rules to apply:** `runtime.mdc`, `dom.mdc`, `error-handling.mdc`, `amd.mdc`.

### W4 — SET `loadingGuards.js`

- After overlay-active no-op, resolve `mountEl = document.querySelector(_KDB.elements.selectors.root.dashboardFrame)`.
- `handle = startLoading({ mountEl, mountKey: "writeback-set-loading", messageKey: "dashboardRestore" })`.
- Return `!!(handle && handle.mountKey)`. Store `run.loadingHandle = handle` (or runtime slot the cleanup already reads).
- `finishLoadingGuarded`: `finishLoading({ handle: run.loadingHandle })` if `run.loadingStarted`.
- **Rules to apply:** `error-handling.mdc`, `amd.mdc`, `cognos-adapter.mdc` (catalog selector, not inline `.dashboardFrame` if catalog exists — W1 adds it; if W4 runs in parallel, use `(_KDB.elements.selectors.root.dashboardFrame || ".dashboardFrame")` once).

### W4 — GET persist loading

- New sibling: start after validate, **before** `applyWritebackGetPersistLanding`, only `source === "bridge"`.
- mount `.dashboardFrame`, mountKey `writeback-get-persist-loading`, messageKey `dashboardSave`.
- Store handle on `_KDB.runtime.writeback`.
- Finish when `runPersistRestore` actually dispatches restore (after the restore click is issued), on stuck cap, and when `cancelWritebackGetPersistLanding` aborts **without** restore. Do not finish in `collect()` finally (that is before hold).
- Non-bridge collect: no start.
- **Do not** mutate `smq-popup`. **Do not** thicken persist-landing past 150.
- **Rules to apply:** `error-handling.mdc`, `amd.mdc`, `feature-structure.mdc`.

### W4 — `KDB.js`

- Existing `startLoading` call: add `messageKey: "dashboard"`.
- File 407/500 — this is bootstrap wiring; allowed. No other KDB.js behavior.

---

## Section D–I

Harness / reducer tables: **none** (service already ported). Skip.

---

## Section J. Acceptance (self-check)

1. Every allowlisted edit matches the delta.
2. No file >150 JS except `KDB.js` (boot one field only).
3. AMD full-compact; no nested functions inside entry bodies.
4. No `KDB_hide` added by loadingService.
5. No `_KDB.cognosAPI` / `__getDashboardAPI`.
6. No scrape of `#selectParameterSet` from kdbControl.
7. SET start returns false when handle is null.
8. GET overlay not started for non-bridge collect.
9. Report: Section A echo, file checklist with line counts, deviations.

---

## Section K. Forbidden

- Edit `.cursor/rules/*.mdc`, `_executionSpecTemplate.md`, `_archive/*` as live.
- Edit `applyWritebackGetPersistLanding.js` beyond a cap-safe one-liner (prefer sibling).
- Edit `runApplyBindingRenderSteps.js`.
- Commit / push / git config.
- Invent `_KDB.superUser`, `_KDB.api.canvas`, new lifecycle terms, new cognosHost **facet**.
- Folders `helpers` / `common` / `shared`.
- Hold boot overlay until select exists.
- Spinner inside `smq-popup`.

---

## Section L. Reporting

Per writer: pre-flight echo (14), file table, deviations, J checklist, open questions.

---

## Section M. Reviewer handoff

Fresh subagents (not writers): mechanical MUST + semantic delta vs code, **before** was already researched; **after** implementation. GET Cognos taste-check is PO, not army.

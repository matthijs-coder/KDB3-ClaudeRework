# Execution Spec: `widgetVis` (`full port`)

> Execution spec for implementing `widgetVis` after CP-1 contract approval. Architecture decisions live in `contracts/widgetVis.md`; this spec is mechanical handoff guidance for an executing AI.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetVis.md`
**Phase:** `full port`
**Authoring AI:** `GPT-5.5, 2026-06-07`
**Executing AI:** `TBD after CP-1 approval`
**Reviewer:** `user / supervising AI`

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing output files and must echo one sentence per file.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` has fixed top-level namespaces; feature code receives `_KDB` by injection and must not invent new namespaces.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable and has one canonical writer per subtree; foreign writes are forbidden.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — non-serializable technical resources live under the owning runtime namespace and every resource needs cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — feature modules expose one module API surface, normally `{ mount, destroy, dispatch, getState }`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — direct dispatch is preferred for known owners; fact-events need catalog entries and real consumers.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — modules follow orchestrator/controller/folder conventions and Module Contract First approval.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — generated code uses English names, canonical file names, slash action names and lifecycle vocabulary terms.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors live under `_KDB.elements.selectors`, live DOM refs live under runtime, and queries are scoped.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — production JS uses one full-compact AMD `define([...], function (...) { ... })` per file.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle uses only canonical terms; pending/error details are separate fields.
12. `_____________KDB3API/contracts/widgetVis.md` — source of truth for this implementation.
13. `_____________KDB3API/contracts/widgetSettings.md` — source for settings value/history ownership and commit-after-apply discipline.
14. `_____________KDB3API/contracts/widgetBase.md` — source for shell/body ownership and cleanup callers.
15. `_____________KDB3API/contracts/widgetBindingPlan.md` — prerequisite service contract for pure plan shape.
16. `_____________KDB3API/contracts/widgetBindingApply.md` — prerequisite service contract for apply/render result shape.
17. `_____________KDB3API/contracts/dienststelle.md` — source for the downstream payload that must retarget to `widgetVis`.
18. This execution spec.

The executing AI's first output must be the 18 echoed summaries. File creation starts only after reviewer acceptance.

---

## Section B. Folder tree

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/
  __orchestratorWidgetVis.js
  createWidgetVisController.js
  config/
    actionTypes.js
    defaults.js
  state/
    initialState.js
    createWidgetVisReducer.js
    selectors.js
    cloneSerializable.js
  actions/
    handleContentCreate.js
    handleWaitUntilContentReady.js
    handleApplySetting.js
    handleDienststelleChanged.js
    handleTopNResolved.js
    handleCleanupContent.js
    handleMaximizeToggle.js
    normalizeDispatchResult.js
  effects/
    resolveBindingPrerequisites.js
    buildBindingSpec.js
    applyVisualizationProperties.js
    runBindingPipeline.js
    applyPostRenderCleanup.js
    syncVisualizationTitle.js
    installDrillthrough.js
    assembleDrillthroughSpec.js
    cleanupVisualizationContent.js
    widgetFocusMode.js
    reportApplyResult.js
  view/
    resolveVisualizationContent.js
    syncLegendVisibility.js
    syncTooltipMetadata.js
    renderDrillthroughIcon.js
    syncTitleLink.js
```

Do not create `events/eventNames.js`; `widgetVis` emits no events in this tranche.

---

## Section C. File mapping evidence

| New production file | Legacy/current evidence | Composition / alignment note |
|---|---|---|
| `__orchestratorWidgetVis.js` | Current production scaffold already registers `_KDB.api.widgetVis`. | Keep registration shape; replace scaffold wiring only. |
| `createWidgetVisController.js` | Blueprint dispatch-style API; current scaffold no-op controller. | Dispatch remains the only public command surface. |
| `config/actionTypes.js` | Contract action table. | Add only `widgetVis/*` action names; no events. |
| `config/defaults.js` | Binding timeout/profile notes and drillthrough behavior. | Declarative defaults only; no runtime state. |
| `state/*` | Blueprint `_KDB.state.widgets.vis` shape. | Derived/working state only; no settings values. |
| `actions/handleContentCreate.js` | `widgetBase` dispatches `widgetVis/contentCreate`; REDESIGN2 configure flow. | Create per-widget visual record and content context from public metric identity `{ code, display, metricsTable }`; normal startup defaults are applied later by `widgetSettings/seedDefaults`. |
| `actions/handleWaitUntilContentReady.js` | `widgetSettings` default seeding requires a per-widget readiness gate after `contentCreate`. | Coalesce waiters until the visual record, metric/data identity and runtime/opSeq exist; do not wait for binding/render. |
| `actions/handleApplySetting.js` | `widgetSettings` apply routes; binding-service interface summary. | Handles dimension/visType/topNChoice consequences without history. |
| `actions/handleDienststelleChanged.js` | Dienststelle downstream payload and blueprint §9 delta. | Direct dispatch target replaces `visualizationWidget` placeholder. |
| `actions/handleTopNResolved.js` | Blueprint option C vis/topN choreography. | OpSeq-gated terminal result consumption; full TopN last. |
| `actions/handleCleanupContent.js` | User decision: `widgetVis` owns visualization content cleanup; `widgetBase` owns shell. Binding-apply planner decision: intentional emptying is a normal apply consequence. | Map internal `forceEmpty` / `emptyReason` to canonical `BindingPlanSpec.emptyIntent`, run normal plan/apply/render-wait pipeline, then clear decorations/drillthrough runtime without history. |
| `actions/handleEnsureObservers.js` | As-built unpark (`widgetVis/ensureObservers`). | Unpark: idempotent drillthrough icon re-install with focus + legend sweep. Not capture flush. |
| `actions/handleMaximizeToggle.js` | Blueprint and REDESIGN2 focus-mode investigation say maximize/focus-mode belongs to `widgetVis`. | Implement the first tranche: thin Cognos focus-mode enter/exit plus observer-confirmed state, no history. |
| `effects/widgetFocusMode.js` | REDESIGN2 Cognos focus-mode DOM evidence: `.expandModeContainer` contains a widget clone; native expand and KDB-triggered expand produce the same DOM state. | Shared observer/effect for `isWidgetExpanded`, enter/exit confirmation, focus settings panel activation/disposal and native expand/collapse detection. |
| `effects/resolveBindingPrerequisites.js` | `widgetVis.md` §7.1 binding prerequisites gate. | Resolve settings snapshot, confirmed Dienststelle hierarchy and non-default TopN helper result before `buildPlan`; return deferred/error without planning when blocked. |
| `effects/buildBindingSpec.js` | `widgetBindingPlan` input needs, including canonical `emptyIntent`. | Build the exact `BindingPlanSpec`; map public `metric.{code,display,metricsTable}` to canonical `dataConfig.kennzahl*` at the service boundary. |
| `effects/applyVisualizationProperties.js` | Legacy `visDataWidgetLifecycleHelpers.setProperties` / `setVisualizationLayoutProperties`. | After `setVisType`, applies declarative `propertyValues` and `layoutPropertyValues` from the local resolver; failures are diagnostics only. |
| `effects/runBindingPipeline.js` | Binding plan/apply contracts and legacy binding flow. | Owns opSeq/AbortController, visualization property apply before `buildPlan`, and result interpretation including `previousManagedFilterItemIds` and intentionally-empty diagnostics. Cleanup mode (`reason:"cleanup"` / `forceEmpty`) skips pre/post visualization property apply and post-render decoration sync; missing `widgetBindingApply` is failure (not DEV skip). |
| `effects/applyPostRenderCleanup.js` | REDESIGN2 `runWidgetVisualizationCleanup` evidence. | Runs title, legend visibility, tooltip metadata and drillthrough icon re-install after confirmed render (not capture re-sync). |
| `effects/syncVisualizationTitle.js` | REDESIGN2 `buildVisualizationTitle` evidence. | Update derived title and Cognos title/link behavior after success. |
| `effects/installDrillthrough.js` | laatsteOriginal PKZ drillthrough and REDESIGN2 buffer evidence. | Consumer: plant + click + assemble + service call. Not “open URL through legacy-derived behavior” inside widgetVis. Use existing `KDB3/images/pkzDrillthrough.png`; no invented icon. |
| `effects/assembleDrillthroughSpec.js` | Owner-API spec for `_KDB.services.drillthrough`. | `source: "icon"`, `orgSelection` + preferred `orgTree`, `yearContext`. Facets via stamps. No `.KDB_optionSelected`. |
| `effects/cleanupVisualizationContent.js` | Legacy launchpad/reset cleanup and contract cleanup action. | Remove visual-owned runtime/content effects; do not move shell. |
| `effects/reportApplyResult.js` | Blueprint write-after-apply discipline. | Return success/failure payload for `widgetSettings`; never write settings. |
| `view/*` | DOM rule and REDESIGN2 title/legend/tooltip/icon behavior. | Scoped to widget shell/content only; no global DOM ownership. |

---

## Section D. Per-file specifications

### `KDB3/js/dashboard/widgets/widgetVis/__orchestratorWidgetVis.js`

- **Role**: module orchestrator.
- **Lines**: target 50, hard limit 120.
- **AMD imports**:
  - `"./createWidgetVisController.js"`
  - `"./state/selectors.js"`
- **Entry function**: `__orchestrator(_KDB, _options)`.
- **Body steps**:
  1. Create the controller with `{ _KDB, options: _options, selectors: _selectors }`.
  2. Ensure `_KDB.api` exists.
  3. Register `_KDB.api.widgetVis = controller`.
  4. Return controller.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD shape; no nested helpers.
  - `naming.mdc` — canonical orchestrator file and entry name.
  - `feature-structure.mdc` — orchestrator wires only; no business logic.
  - `kdb-object.mdc` — registers only `_KDB.api.widgetVis`.

### `KDB3/js/dashboard/widgets/widgetVis/createWidgetVisController.js`

- **Role**: controller factory.
- **Lines**: target 130, hard limit 150; split before exceeding.
- **AMD imports**:
  - `"./config/actionTypes.js"`
  - `"./state/initialState.js"`
  - `"./state/createWidgetVisReducer.js"`
  - `"./state/cloneSerializable.js"`
  - `"./actions/handleContentCreate.js"`
  - `"./actions/handleWaitUntilContentReady.js"`
  - `"./actions/handleApplySetting.js"`
  - `"./actions/handleApplyStartupSettings.js"`
  - `"./actions/handleDienststelleChanged.js"`
  - `"./actions/handleTopNResolved.js"`
  - `"./actions/handleCleanupContent.js"`
  - `"./actions/handleMaximizeToggle.js"`
  - `"./actions/normalizeDispatchResult.js"`
  - `"./effects/cleanupVisualizationContent.js"`
- **Entry function**: `createWidgetVisController(_deps)`.
- **Body steps**:
  1. Capture `_KDB`, options and selectors.
  2. Create reducer and closure `_isDisposed`.
  3. Expose `mount`, `destroy`, `dispatch`, `getState`.
  4. `mount` initializes state/runtime and marks lifecycle ready.
  5. `dispatch` validates envelope, routes by action type, and returns normalized result, including `widgetVis/waitUntilContentReady`.
  6. `destroy` sets `_isDisposed` first, calls visual cleanup for every runtime entry, clears runtime and marks disposed.
  7. `getState` returns a cloned `_KDB.state.widgets.vis` snapshot.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD; helpers at factory scope only.
  - `naming.mdc` — factory name matches module; action names use `widgetVis/actionName`.
  - `feature-structure.mdc` — controller coordinates; major logic in actions/effects.
  - `module-public-api.mdc` — dispatch-style public surface only; disposed-state discipline.
  - `state.mdc` — writes only `_KDB.state.widgets.vis`.
  - `runtime.mdc` — initializes and cleans `_KDB.runtime.widgetVis`.
  - `error-handling.mdc` — try/catch on mount/destroy/dispatch boundaries.

### `config/actionTypes.js`

- **Role**: action constants.
- **Lines**: target 60.
- **Return value**: object constants for `CONTENT_CREATE`, `WAIT_UNTIL_CONTENT_READY`, `APPLY_STARTUP_SETTINGS`, `APPLY_DIMENSION`, `APPLY_VIS_TYPE`, `APPLY_TOPN_CHOICE`, `TOPN_RESOLVED`, `DIENSTSTELLE_CHANGED`, `CLEANUP_CONTENT`, `MAXIMIZE_TOGGLE`, reducer/internal actions and `ERROR`.
- **Rules to apply**:
  - `amd.mdc` — one AMD module returning one object.
  - `naming.mdc` — constants are `UPPER_SNAKE_CASE`; values are `widgetVis/<actionName>`.
  - `feature-structure.mdc` — config-only file.

### `config/defaults.js`

- **Role**: declarative defaults.
- **Lines**: target 50.
- **Return value**: object with vis timeout profile key, drillthrough icon path/class, and accepted deferred flags.
- **Rules to apply**:
  - `amd.mdc` — one object export.
  - `naming.mdc` — English constants/keys.
  - `feature-structure.mdc` — no executable behavior.

### `state/initialState.js`

- **Role**: initial state builder.
- **Lines**: target 35.
- **Entry function**: `createInitialWidgetVisState()`.
- **Return value**: fresh `{ lifecycle: "idle", byId: {}, errorCode: null, errorMessage: null }`.
- **Rules to apply**:
  - `amd.mdc` — helper function export.
  - `state.mdc` — serializable state only.
  - `lifecycleVocabulary.md` — uses `idle`.

### `state/createWidgetVisReducer.js`

- **Role**: reducer factory.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"../config/actionTypes.js"`
  - `"./initialState.js"`
  - `"./cloneSerializable.js"`
- **Entry function**: `createWidgetVisReducer()`.
- **Reducer behavior**: implement the table in Section E only; no DOM, Cognos, events, history, Promise work or throws.
- **Rules to apply**:
  - `amd.mdc` — returns one reducer factory.
  - `state.mdc` — pure reducer; owner-only writes.
  - `naming.mdc` — action strings remain slash-style.
  - `error-handling.mdc` — reducers do not use try/catch.

### `state/selectors.js`

- **Role**: published selectors.
- **Lines**: target 80.
- **Return value**: object with selectors from Section F.
- **Rules to apply**:
  - `amd.mdc` — one object export.
  - `state.mdc` — read-only selectors, cloned output.
  - `module-public-api.mdc` — granular reads live in selectors, not `_KDB.api.widgetVis`.

### `state/cloneSerializable.js`

- **Role**: pure clone helper.
- **Lines**: target 25.
- **Entry function**: `cloneSerializable(_value)`.
- **Rules to apply**:
  - `amd.mdc` — one helper export.
  - `state.mdc` — serializable data only.

### `actions/handleContentCreate.js`

- **Role**: action handler.
- **Lines**: target 120, hard limit 150.
- **Must do**: normalize `payload.metric` from public `{ code, display, metricsTable }` (with legacy `kennzahl*` fallback only inside the local normalizer), create visual record/runtime, resolve content/header DOM through view helpers, register the minimal metric/data identity needed for `BindingPlanSpec`, resolve pending content-ready waiters, sync title, optionally install the drillthrough icon when enabled. Still must not wait on drillthrough for content-ready.
- **Must not do**: run normal drop default-settings binding or plan/apply; startup default consequences belong to `widgetSettings/seedDefaults` after `widgetVis/waitUntilContentReady`.
- **Must not do**: write settings, push history, move the shell.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — writes only through controller/reducer path.
  - `runtime.mdc` — per-widget runtime resources get cleanup.
  - `dom.mdc` — scoped shell/content queries only.
  - `error-handling.mdc` — try/catch around executable handler.

### `actions/handleWaitUntilContentReady.js`

- **Role**: per-widget readiness action handler.
- **Lines**: target 90, hard limit 130.
- **Must do**: resolve immediately when `_KDB.state.widgets.vis.byId[widgetId]` has the visual record plus minimal metric/data identity for `buildBindingSpec`, and `_KDB.runtime.widgetVis.byId[widgetId]` exists with `opSeq`.
- **Must do**: when not ready, coalesce callers under `_KDB.runtime.widgetVis.byId[widgetId].pendingPromises.contentReady` and resolve when `handleContentCreate` reaches registration-ready.
- **Must do**: support `payload.timeoutMs`, defaulting from `config/defaults.js`; timeout returns `{ ok:false, status:"timeout", errorCode:"WIDGET_VIS_CONTENT_READY_TIMEOUT" }` and clears the pending promise.
- **Must not do**: wait for `widgetBindingPlan`, `widgetBindingApply`, Cognos render, title sync, drillthrough install, settings apply success or DOM polling.
- **Must not do**: expose named public methods or let callers inspect `_KDB.runtime.widgetVis`.
- **Rules to apply**:
  - `module-public-api.mdc` — readiness is a dispatch action, not a named API method.
  - `runtime.mdc` — pending promise and timer cleanup.
  - `state.mdc` — only reads owned state, no foreign writes.
  - `error-handling.mdc` — boundary catch and timeout conversion.

### `actions/handleApplySetting.js`

- **Role**: action handler for `applyDimension`, `applyVisType`, `applyTopNChoice`.
- **Lines**: target 130, hard limit 150.
- **Must do**: set pending/opSeq, branch TopN non-default to `widgetTopN` when needed, otherwise run binding pipeline and return `reportToSettings` only after success.
- **Must not do**: commit settings or history.
- **Rules to apply**:
  - `module-public-api.mdc` — all consequences through dispatch.
  - `state.mdc` — derived/working state only.
  - `runtime.mdc` — AbortController and opSeq discipline.
  - `error-handling.mdc` — async/await abort-aware try/catch.

### `actions/handleApplyStartupSettings.js`

- **Role**: action handler for `widgetVis/applyStartupSettings`.
- **Lines**: target 120, hard limit 150.
- **Must do**: accept one startup batch payload from `widgetSettings/seedDefaults` with complete `settingsSnapshot: { dimension, visType, topNChoice }`, `changedControls[]`, `source:"startup"` and `isHistoryReplay:false`; validate the visual content context exists; run exactly one binding pipeline with `reason:"startup"` using the full snapshot.
- **Must do**: treat `topNChoice` as part of the startup settings snapshot. `widgetVis` owns interpreting `none` and future non-default TopN behavior; for default/no-op TopN, do not start an additional TopN helper pipeline.
- **Must do on confirmed success**: return `reportToSettings.controls[]` echoing the included dimension/visualization/topN controls so `widgetSettings` can commit all included startup values without history.
- **Must do on timeout/error/aborted/stale**: return a normalized failure/stale result and write only `widgetVis` owned pending/error/stale state.
- **Must not do**: commit settings, push history, dispatch separate per-control startup applies, or write `widgetSettings`.
- **Rules to apply**:
  - `module-public-api.mdc` — startup batching remains a dispatch action.
  - `state.mdc` — derived/working state only; no settings writes.
  - `runtime.mdc` — same opSeq and abort discipline as normal applies.
  - `error-handling.mdc` — async/await abort-aware try/catch.

### `actions/handleDienststelleChanged.js`

- **Role**: action handler.
- **Lines**: target 100.
- **Must do**: consume serializable Dienststelle payload, normalize `payload.resolution` to `BindingPlanSpec.hierarchySnapshot`, run binding pipeline with `reason: "dienststelle"`, return normalized result.
- **Must not do**: write Dienststelle/filter state or emit events.
- **Rules to apply**:
  - `events.mdc` — direct dispatch, no event.
  - `state.mdc` — no foreign writes.
  - `error-handling.mdc` — boundary catch.

### `actions/handleTopNResolved.js`

- **Role**: TopN promise-gate resolver (not binding-pipeline launcher in this tranche).
- **Lines**: target 100.
- **Must do**: verify `ownerVisId` and `opSeq`, ignore stale, map the payload to `helperTableResult`, and resolve the current `topNGate` waiter via `resolveTopNGateWaiter`. Return `{ gateResolved:true }` on success. If no matching waiter exists, return skipped diagnostic (`WIDGET_VIS_TOPN_NO_WAITER`) without starting `runBindingPipeline`.
- **Must not do**: dispatch a second `widgetTopN/resolveRequested`, independently run `runBindingPipeline`, or report `reportToSettings` from this handler.
- **Rules to apply**:
  - `runtime.mdc` — supersession token check.
  - `state.mdc` — derived topN values only after confirmed apply on the originating apply continuation.
  - `error-handling.mdc` — catch and convert.

### `actions/handleCleanupContent.js`

- **Role**: action handler.
- **Lines**: target 100.
- **Must do**: abort in-flight operations, map cleanup to `BindingPlanSpec.emptyIntent` when `clearBinding` is true, run the normal plan/apply/render-wait pipeline, call cleanup effect for runtime/DOM decorations, reduce cleanup success/failure, return normalized result.
- **Must not do**: move shell, write base/settings/history.
- **Rules to apply**:
  - `runtime.mdc` — cleanup every resource.
  - `dom.mdc` — remove only DOM owned by `widgetVis`.
  - `state.mdc` — clear only `_KDB.state.widgets.vis`.

### `actions/handleEnsureObservers.js`

- **Role**: as-built unpark action (`widgetVis/ensureObservers`).
- **Must do**: on unpark, re-install the drillthrough icon (idempotent) together with focus + legend sweep.
- **Must not do**: install capture listeners or flush capture buffers in T1.
- **Rules to apply**:
  - `runtime.mdc` — idempotent re-install; no duplicate icons.
  - `dom.mdc` — scoped header host (expand host when expanded).

### `actions/handleMaximizeToggle.js`

- **Role**: focus-mode action handler.
- **Lines**: target 100, hard limit 150.
- **Must do**: resolve `nextMaximized` from payload or by toggling current `widgetVis.byId[widgetId].maximized`; call `effects/widgetFocusMode.enterFocusMode` or `exitFocusMode`; write `widgetVis/maximizeSucceeded` only after Cognos focus-mode DOM state is confirmed; return normalized success/failure.
- **Must do**: install/ensure the shared focus-mode observer so native Cognos `.resizePoint.expandHandle` and native collapse produce the same state/chrome path as the settings maximize button.
- **Must do**: honor `isHistoryReplay` as a no-history marker for a future tranche, but do not push history in this implementation.
- **Must not do**: write settings/base/history state, move shell geometry, add body/canvas fullscreen classes, or persist/restore maximized state across reload.
- **Rules to apply**:
  - `module-public-api.mdc` — dispatch result, no named method.
  - `state.mdc` — write only confirmed `widgetVis.maximized`.
  - `runtime.mdc` — observer/focus-panel resources get per-widget cleanup.
  - `dom.mdc` — scoped focus-mode DOM and panel clone handling only.

### `actions/normalizeDispatchResult.js`

- **Role**: result normalizer.
- **Lines**: target 50.
- **Rules to apply**:
  - `amd.mdc` — pure helper export.
  - `naming.mdc` — clear result keys.

### `effects/buildBindingSpec.js`

- **Role**: pure-ish spec builder.
- **Lines**: target 120.
- **Must do**: build the exact `BindingPlanSpec` described in `widgetBindingPlan.md` and `widgetVis.md` Section 7. Map `changeReason -> reason`, `settings + metric -> dataConfig` (`metric.code -> kennzahlCode`, `metric.display -> kennzahlDisplay`, `metric.metricsTable -> kennzahlenTable`), `topNResult/topNResolved -> helperTableResult`, `dienststelleChanged.payload.resolution -> hierarchySnapshot`, `forceEmpty + emptyReason -> emptyIntent`, and `widgetId/ownerWidgetId/opSeq -> diagnostic echo fields.
- **Must do for cleanup**: when `cleanupContent.clearBinding === true`, output `reason:"cleanup"` and `emptyIntent:{ enabled:true, reason:<cleanup reason> }`.
- **Must do for Dienststelle**: wrap the incoming payload resolution as at least `{ resolution: payload.resolution }` and add any caller-known `activeDownstreamName` / `byFilter` fields required by the plan service before calling `buildPlan`.
- **Must not do**: call Cognos, write state, read mutable foreign state directly.
- **Must not do**: return or pass internal intermediate shapes named `changeReason`, `settings`, `metric`, `topNResult`, `forceEmpty` or `emptyReason` across the service boundary except the explicit `metric.* -> dataConfig.kennzahl*` mapping.
- **Rules to apply**:
  - `state.mdc` — no writes and no foreign state shortcut.
  - `module-public-api.mdc` — consume selector/payload data only.
  - `error-handling.mdc` — catch if function validates non-trivial inputs and may fail.

### `effects/resolveBindingPrerequisites.js`

- **Role**: pre-plan binding gate.
- **Lines**: target 120, hard limit 150.
- **Must do**: resolve the complete context required before `buildBindingSpec` and `widgetBindingPlan.buildPlan`.
- **Must do for settings**: require effective `{ dimension, visType, topNChoice }` from action `settingsSnapshot` or a documented public widgetSettings effective snapshot API; never deep-read `_KDB.state.widgets.settings`.
- **Must do for Dienststelle**: call `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` when available. If it returns a confirmed planner-ready snapshot, attach it as `hierarchySnapshot`. If unavailable/unconfirmed, wait/coalesce on the next `widgetVis/dienststelleChanged` broadcast up to timeout; timeout returns normalized deferred/error and no `buildPlan` call.
- **Must do for TopN (promise-gate)**: if `topNChoice` is `none`, `default`, empty or null, set `helperTableResult: null` and do not call `widgetTopN`. If non-default, resolve a helper List binding snapshot through `config/resolveVisualizationBindingConfig.js` using the same metric/table identity as the visible request but `visualizationType:"List"`; attach it to `widgetTopN/resolveRequested.payload.config.helperListConfig` as `{ visualizationType:"List", cognosVisualizationTypeId, visPropBucketKey, visTypeConfig }`. If that List helper metadata is missing, fail before dispatch with `WIDGET_VIS_TOPN_HELPER_LIST_CONFIG_MISSING` and diagnostics `blockedReason:"missing_topN_helper_list_config"`. Register the per-widget `topNGate` waiter (`waitForTopN`) **before** dispatching `widgetTopN/resolveRequested`, then wait for the matching current non-stale `widgetVis/topNResolved` to resolve that waiter; until `widgetTopN` exists, return documented deferred result and do not report settings success. On dispatch failure, cancel the waiter to avoid leaks.
- **Must not do for TopN**: deep-read `_KDB.config.visualizations` from the effect or require `widgetTopN` to discover helper List visualization config from global state.
- **Must do**: include diagnostics such as `blockedReason: "awaiting_dienststelle"` or `"awaiting_topN"` when the gate blocks.
- **Must not do**: call `widgetBindingPlan.buildPlan`, call `widgetBindingApply`, write settings/base/history/filter state, or silently bind without confirmed Dienststelle hierarchy.
- **Rules to apply**:
  - `module-public-api.mdc` — use public APIs/selectors only.
  - `state.mdc` — no foreign writes or deep foreign state reads.
  - `runtime.mdc` — coalesced waits/timers live under `_KDB.runtime.widgetVis`.
  - `error-handling.mdc` — async timeout/failure converted to normalized result.

### `effects/applyVisualizationProperties.js`

- **Role**: visualization presentation property effect.
- **Lines**: target 120, hard limit 150.
- **Must do**: resolve `propertyValues` and `layoutPropertyValues` through `config/resolveVisualizationBindingConfig.js` for the active normalized visualization type; ensure Cognos `visualizationType` is set first; apply both property maps through `_KDB.cognosAPI.visualization.setContentPropertyValue`; track `_KDB.runtime.widgetVis.byId[widgetId].lastAppliedVisPropertiesType`.
- **Must do**: skip pre-binding re-apply on dimension/topN/dienststelle reasons when the visualization type is unchanged; accept `options.phase` (`"preBinding"` | `"postRender"`) and `options.force` so post-render re-apply bypasses the skip; set `diagnostics.phase` accordingly.
- **Must do**: support idempotent post-render re-apply when called from `runBindingPipeline` after confirmed `applyBinding` success with `phase: "postRender"` and `force: true`.
- **Must not do**: read `_KDB.config.visualizations.definitions` directly; write settings; block binding on individual property write failures.
- **Rules to apply**:
  - `runtime.mdc` — runtime-only last-applied marker.
  - `error-handling.mdc` — boundary catch; failures become diagnostics.

### `effects/runBindingPipeline.js`

- **Role**: async binding orchestration.
- **Lines**: target 140, hard limit 150.
- **Must do**: call `resolveBindingPrerequisites` before `widgetBindingPlan.buildPlan` for normal visual binding. If prerequisites are missing/deferred, return that result and do not call `buildPlan`. When prerequisites are ready, call `applyVisualizationProperties` with `phase: "preBinding"` (set vis type → apply `propertyValues` → apply `layoutPropertyValues`), then build the canonical spec and call `widgetBindingPlan.buildPlan`; if `plan.ok !== true` or `plan.status !== "success"`, return a plan-failure result and do not call `widgetBindingApply.applyBinding`. Otherwise call `widgetBindingApply.applyBinding`; pass exact `ApplyBindingOptions` with `target: { widgetId, targetKind:"vis", ownerWidgetId:null, opSeq, reason: plan.reason }`, `signal`, `previousManagedFilterItemIds` from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds || []`, and `timeoutProfile:"vis"`; interpret `success/error/timeout/aborted`; when `plan.emptyIntent.enabled === true`, record intentionally-empty diagnostics on confirmed success.
- **Must do on confirmed apply success**: after `applyBinding` completes and before `applyPostRenderCleanup`, call `applyVisualizationProperties` again with `phase: "postRender"` and `force: true` (same maps/resolver path); check `isStaleOpSeq` before and after; attach `postRenderPropertyDiagnostics` and merge into `postRenderDiagnostics.visualizationProperties`; post-render property failures are diagnostics-only and do not downgrade an already-successful binding.
- **Must not do**: write settings or history; own binding service internals.
- **Must do on success**: replace runtime `managedFilterItemIds` with `plan.managedFilterItemIds` only after `ApplyBindingResult.status === "success"` and current `opSeq`.
- **Rules to apply**:
  - `runtime.mdc` — AbortController and pending promise cleanup.
  - `error-handling.mdc` — abort-aware async try/catch; `AbortError` is filtered.
  - `state.mdc` — owner writes only through returned reducer instructions.

### `effects/applyPostRenderCleanup.js`

- **Role**: post-render effect coordinator.
- **Lines**: target 80.
- **Must do**: call title sync, legend visibility sync, tooltip metadata sync and drillthrough **icon re-install** after confirmed apply (not capture re-sync).
- **Rules to apply**:
  - `dom.mdc` — scoped queries, no global DOM scans.
  - `runtime.mdc` — listener/icon cleanup before re-install.
  - `error-handling.mdc` — catch and convert/log.

### `effects/syncVisualizationTitle.js`

- **Role**: title effect.
- **Lines**: target 100.
- **Must do**: derive title from metric/settings/apply result plus kennzahlDefaults vis-type-branch aggregation parenthesis per `contracts/widgetVis-title-aggregation-contractdelta.md` (this original port spec did not include that suffix). Expose `applyPreRenderTitle` (Cognos `setVisTitle`, called once pre-binding from `continueBindingPipeline`); post-render sync is DOM-only (note-editable span text + title link) and returns derived `titleText`. Bugfix sync 2026-07-13: post-render Cognos `setTitle` left dropped widgets in inline-edit mode; legacy parity restored (API pre-render, DOM after render).
- **Rules to apply**:
  - `dom.mdc` — scoped title DOM.
  - `state.mdc` — return derived data; controller/reducer writes it.
  - `error-handling.mdc` — Cognos/DOM boundaries guarded.

### `effects/installDrillthrough.js`

- **Role**: drillthrough consumer coordinator.
- **Lines**: hard limit 150; split before exceeding.
- **Must do (T1)**: render/reuse PKZ icon; bind icon click; set `installed` on runtime; call `_KDB.services.drillthrough` with the assembled spec (`source: "icon"`).
- **Must not do (T1)**: content-selection listeners, capture window/flush, `_KDB.cognosAPI`, `p_p_*` encoding, `window.open`. Do not grow this file for T2 (~135 already).
- **Must not do**: `content.on` / `_KDB.cognosAPI` in widgetVis; selection goes through stamped `visualizationFacet` ops (`getSelections` / `subscribeSelections`). Invent icon asset, write state/history, store buffer in state.
- **Rules to apply**:
  - `dom.mdc` — icon DOM scoped to widget header/content.
  - `runtime.mdc` — icon/click handles under runtime with cleanup.
  - `error-handling.mdc` — listener and service-call boundaries guarded.

### `effects/assembleDrillthroughSpec.js`

- **Role**: assemble the owner-API drillthrough spec for the service.
- **Lines**: hard limit 150; split before exceeding.
- **Must do**: build spec including `source: "icon"`, `orgSelection` + preferred `orgTree`, `yearContext`. Facets via stamps (`getVisType`, Jahr `readFilterValues`, optional `dataQuery`).
- **Must not do**: scrape `.KDB_optionSelected`; encode `p_p_*`; `content.on` / `_KDB.cognosAPI` in widgetVis; selection goes through stamped `visualizationFacet` ops.
- **Rules to apply**:
  - `module-public-api.mdc` — owner APIs and injected stamps only.
  - `state.mdc` — no state writes.
  - `error-handling.mdc` — catch non-trivial assembly failures.

### `effects/cleanupVisualizationContent.js`

- **Role**: cleanup effect.
- **Lines**: target 120.
- **Must do**: remove drillthrough icon via existing `cleanupDrillthroughDecorations.js` (icon + click). Do not require content-event listener teardown that was never installed in T1. Clear timers, remove title/tooltip/legend decorations owned by `widgetVis`, clear runtime pointers after any requested `emptyIntent` binding apply has succeeded.
- **Must do**: dispose any focus-mode runtime (`focusMode.dispose`, focus-panel DOM clone, observers/listeners) when visual content cleanup, route/remove or destroy requires focus-mode teardown.
- **Must not do**: call `_KDB.services.widgetBindingApply.applyEmptyDataFilter(...)` or any empty-specific apply route; intentional emptying is handled by `BindingPlanSpec.emptyIntent` and the normal binding pipeline.
- **Must not do**: remove/move shell, write `widgetBase`, write settings, push history.
- **Rules to apply**:
  - `runtime.mdc` — complete cleanup path.
  - `dom.mdc` — only owned decorations.
  - `error-handling.mdc` — cleanup boundary catches and reports.

### `effects/widgetFocusMode.js`

- **Role**: Cognos focus-mode/maximize effect.
- **Lines**: target 150; split helper files before exceeding.
- **Must export**: helpers or object including `isWidgetExpanded`, `enterFocusMode`, `exitFocusMode`, `installFocusModeObserver`, `activateFocusModeChrome`, `disposeFocusMode`.
- **Must do**:
  1. `isWidgetExpanded(widgetId)` detects the Cognos focus-mode clone through `.expandModeContainer [id="<widgetId>"]`.
  2. `enterFocusMode` calls `_KDB.cognosAPI.widgets.enterWidgetFocusMode(widgetId)` and waits/polls briefly until `isWidgetExpanded(widgetId) === true`.
  3. `exitFocusMode` calls `_KDB.cognosAPI.widgets.exitWidgetFocusMode(widgetId)` when expanded and waits/polls until false.
  4. `installFocusModeObserver` observes a stable parent (normally `document.body`) for `.expandModeContainer` clone appearance/disappearance and converts both native Cognos expand/collapse and KDB-triggered expand/exit into one entered/exited path.
  5. Entered path is idempotent: reduce `maximized:true` once, store runtime `focusMode.observedExpanded:true`, and call `activateFocusModeChrome`.
  6. Exited path is idempotent: dispose chrome, reduce `maximized:false`, clear runtime `focusMode` handles.
  7. `activateFocusModeChrome` clones or mounts the existing settings panel into the expand container as `.KDB_focusModeSettingsPanel`, filters to the accepted focus-mode settings icons (`info`, visualization, dimensions, TopN), and makes the panel visible when required by product behavior.
  8. Store observer/dispose handles in `_KDB.runtime.widgetVis.byId[widgetId].focusMode`; never in state.
- **Must not do**: push history, write settings/base state, add global fullscreen/body/canvas classes, persist maximize across reload, depend on per-button native expand/collapse listeners as the primary detection mechanism.
- **Rules to apply**:
  - `runtime.mdc` — every observer/listener/panel clone has a dispose path.
  - `dom.mdc` — global observation is limited to Cognos focus-mode container detection and documented; panel queries are scoped from widget shell/expand container.
  - `state.mdc` — confirmed state writes happen only through reducer actions.
  - `error-handling.mdc` — Cognos/DOM boundaries return `WIDGET_VIS_MAXIMIZE_FAILED` or `WIDGET_VIS_FOCUS_PANEL_FAILED`.

### `effects/reportApplyResult.js`

- **Role**: result mapper.
- **Lines**: target 70.
- **Must do**: build `reportToSettings` for success/failure without mutating settings.
- **Rules to apply**:
  - `state.mdc` — no foreign writes.
  - `module-public-api.mdc` — caller consumes return value.

### `view/resolveVisualizationContent.js`

- **Role**: scoped DOM resolver.
- **Lines**: target 80.
- **Must do**: resolve content/header/title roots from widget shell and return refs to be stored in runtime.
- **Rules to apply**:
  - `dom.mdc` — scoped query only; live refs runtime-only.

### `view/syncLegendVisibility.js`

- **Role**: DOM mutator.
- **Lines**: target 60.
- **Must do**: legend visibility plus caption pipeline per `contracts/widgetVis-legend-normalization-contractdelta.md` (hash then compose; List is hash-only). This original port spec did not include that pipeline; the 2026-08-26 delta is the live rule.
- **Rules to apply**:
  - `dom.mdc` — scoped mutation.
  - `feature-structure.mdc` — view mutator only, no state writes.

### `view/syncTooltipMetadata.js`

- **Role**: DOM mutator.
- **Lines**: target 70.
- **Must do**: preserve accepted tooltip metadata behavior; no visible text rewrite beyond approved scope.
- **Rules to apply**:
  - `dom.mdc` — scoped mutation.
  - `state.mdc` — no state writes.

### `view/renderDrillthroughIcon.js`

- **Role**: view builder/placer.
- **Lines**: target 80.
- **Must do**: locate-or-create in `.widgetHeader .widgetIcons` (expand host when expanded). Legacy class/asset (`pkzDrillthrough.png` / `.kdb_hyperlink_icon`). Return refs only — no event logic beyond returning the node.
- **Rules to apply**:
  - `dom.mdc` — Builder/Placer split as practical; no event logic beyond returning refs.
  - `naming.mdc` — CSS classes remain legacy only where documented.

### `view/syncTitleLink.js`

- **Role**: DOM mutator.
- **Lines**: target 70.
- **Must do**: ensure the title displays the current derived text (including the aggregation parenthesis per `contracts/widgetVis-title-aggregation-contractdelta.md`) and functions as the approved URL/link affordance.
- **Rules to apply**:
  - `dom.mdc` — scoped title mutation.
  - `error-handling.mdc` — executable DOM function guarded if non-trivial.

---

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `widgetVis/mountStarted` | `mount()` | Initialize state if missing, clear module error. | `idle -> initializing` |
| `widgetVis/mountSucceeded` | `mount()` success | Set module lifecycle ready. | `initializing -> ready` |
| `widgetVis/registerContent` | `contentCreate` | Create/update `byId[widgetId]` with derived content identity. | none |
| `widgetVis/markPending` | apply/cleanup starts | Set `pending: { kind, opSeq }`, clear error. | none |
| `widgetVis/applySucceeded` | binding success | Merge derived title/datasource/topN/visType, clear pending/error. | none |
| `widgetVis/cleanupSucceeded` | cleanup success | Clear derived runtime-correlated fields, pending/error. | none |
| `widgetVis/maximizeSucceeded` | future maximize success | Write `maximized`. | none |
| `widgetVis/errorRecorded` | handler/effect failure | Record module or per-widget error fields. | module may become `error` |
| `widgetVis/destroy` | `destroy()` | Mark module disposed; state remains diagnostic only. | `ready/error -> disposed` |

---

## Section F. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetVisState(_KDB)` | `_KDB.state.widgets.vis` | Cloned vis subtree or `undefined`. |
| `readVisRecord(_KDB, widgetId)` | `_KDB.state.widgets.vis.byId[widgetId]` | Cloned record or `undefined`. |
| `readVisDerived(_KDB, widgetId)` | `byId[widgetId].derived` | Cloned derived object or `undefined`. |
| `readVisPending(_KDB, widgetId)` | `byId[widgetId].pending` | Cloned pending marker or `undefined`. |
| `readVisMaximized(_KDB, widgetId)` | `byId[widgetId].maximized` | Boolean confirmed focus-mode mirror. |

---

## Section G. Public API wiring

- Surface: `_KDB.api.widgetVis`
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`
- `mount({ enableDrillthrough?: boolean })` — default `true` when omitted; store the resolved flag on `_KDB.runtime.widgetVis.enableDrillthrough` (runtime, not state).
- `_KDB.runtime.widgetVis` initialization: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`, `byId`
- Per-widget runtime must support `pendingPromises.contentReady` for coalesced `widgetVis/waitUntilContentReady` waiters.
- `_KDB.state.widgets.vis` initialization: `{ lifecycle, byId, errorCode, errorMessage }`
- No `_KDB.services.*`, no new top-level namespace, no events.

---

## Section H. Integration deltas

These are noted for CP-2/diff-walk; do not apply unless the reviewer confirms they belong in the implementation step.

1. Retarget Dienststelle downstream from `_KDB.api.visualizationWidget.dispatch({ type: "visualizationWidget/dienststelleChanged" })` to `_KDB.api.widgetVis.dispatch({ type: "widgetVis/dienststelleChanged" })`.
2. Ensure `widgetSettings` routes normal user/history visual controls to `widgetVis/applyDimension`, `widgetVis/applyVisType`, and `widgetVis/applyTopNChoice`; shell colour remains `widgetBase`.
3. Ensure `widgetSettings/seedDefaults` waits on `widgetVis/waitUntilContentReady` before dispatching one visual startup batch action `widgetVis/applyStartupSettings` for dimension/visualization/topN defaults.
4. Ensure `handleContentCreate` does not perform normal startup default binding; only `widgetSettings/seedDefaults` dispatches the startup batch consequence.
5. Ensure `widgetBase` calls `widgetVis/cleanupContent` before launchpad transfer/removal when visual content must be cleared.
6. Ensure `widgetBindingPlan` and `widgetBindingApply` are registered before real binding actions are considered complete.
7. Production `KDB.js` calls `_KDB.api.widgetVis.mount({ enableDrillthrough: true })`.

---

## Section I. Acceptance criteria

1. Public API remains exactly `{ mount, destroy, dispatch, getState }`.
2. No file writes `_KDB.state.widgets.settings`, `_KDB.state.widgets.base`, filters, tableData or history.
3. No `widgetVis` code pushes history or exposes a history key.
4. Apply success returns `reportToSettings`; it does not commit settings.
5. `widgetVis/waitUntilContentReady` resolves when visual record + metric/data identity + runtime/opSeq exist and does not wait for binding/render.
6. Content-ready waiters are coalesced and cleaned on timeout/destroy; `widgetSettings` can call only through dispatch, not by polling state/runtime.
7. Apply failure/timeout returns failure and records only `widgetVis` owned error state.
8. Stale `opSeq` results write no state and do not report success.
9. `effects/resolveBindingPrerequisites.js` prevents `buildPlan` until effective settings, confirmed Dienststelle hierarchy and required TopN helper result are ready; `topNChoice: none/default` skips TopN waiting.
10. Missing Dienststelle or non-default TopN prerequisites return deferred/error diagnostics and do not silently bind without those inputs.
11. `effects/buildBindingSpec.js` outputs exact canonical `BindingPlanSpec`; no internal caller-shape (`changeReason`, `settings`, `metric`, `topNResult`, `forceEmpty`) crosses the service boundary except the explicit `metric.* -> dataConfig.kennzahl*` mapping.
12. `effects/runBindingPipeline.js` passes exact `ApplyBindingOptions`, including `previousManagedFilterItemIds` from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds`.
13. After confirmed apply success, runtime `managedFilterItemIds` is replaced with `plan.managedFilterItemIds`; failures/timeouts/aborts do not update it.
14. Intentional emptying maps to `BindingPlanSpec.emptyIntent` and uses `widgetBindingPlan.buildPlan -> widgetBindingApply.applyBinding -> render wait`; no `applyEmptyDataFilter` or separate empty apply route is introduced.
15. Confirmed `emptyIntent` success records diagnostics that distinguish intentionally empty from no data or binding failure.
16. If `emptyIntent` originated from `widgetSettings`, settings commit/history happens only after confirmed apply success.
17. `status:"aborted"` is treated as supersession: no settings commit and no settings error.
18. `mirrorPatch` is used only when `ApplyBindingResult.status === "success"`.
19. If `widgetBindingPlan.buildPlan` returns `ok !== true` or `status !== "success"`, `runBindingPipeline` does not call `widgetBindingApply.applyBinding`.
20. `cleanupContent` clears visual-owned decorations/drillthrough runtime but does not move/remove the shell.
21. Drillthrough uses the legacy `pkzDrillthrough.png` / `.kdb_hyperlink_icon`; runtime owns icon + click. Capture buffers unused until T2.
22. Legend-caption `#`/`ALLE`/`Beendet` normalization follows `contracts/widgetVis-legend-normalization-contractdelta.md` (not this original port spec).
23. No `events/eventNames.js` is created.
24. All JS files use full-compact AMD form and pass lints.
25. `ReadLints` is run on all new/modified JS files after implementation.

---

## Section J. Forbidden actions

- Do not modify `.cursor/rules/`, templates, blueprint, `stateOwnership.md`, or legacy trees.
- Do not add a new top-level `_KDB.*` namespace.
- Do not write production code before CP-1 approval.
- Do not implement `widgetBindingPlan` or `widgetBindingApply` inside `widgetVis`.
- Do not invent or pass a custom service-boundary binding spec shape; `BindingPlanSpec` from `widgetBindingPlan.md` is canonical.
- Do not add or call `_KDB.services.widgetBindingApply.applyEmptyDataFilter(...)`; intentional emptying goes through `BindingPlanSpec.emptyIntent` and the normal plan/apply pipeline.
- Do not implement TopN internals inside `widgetVis`.
- Do not move/resize/route widget shells inside `widgetVis`.
- Do not create new drillthrough icons or substitute an unrelated asset.
- Do not install drillthrough capture / content-selection listeners in T1.
- Do not encode `p_p_*` or `window.open` inside `widgetVis`; URL open is `_KDB.services.drillthrough`.
- Do not clone the PKZ icon onto `.KDB_focusModeSettingsPanel`.
- Do not add visible `#`/`ALLE`/`Beendet` caption rules that diverge from `contracts/widgetVis-legend-normalization-contractdelta.md`.
- Do not commit, push, or change git config.

---

## Section K. Reporting template

The executing AI's final response must include:

1. Pre-flight echo: 18 numbered summaries from Section A.
2. File checklist: every path created/modified with line count and "matches spec | deviation".
3. Deviations: any deviation with motivation and rule consulted.
4. Self-verification: pass/fail per Section I criterion.
5. Open reviewer questions: anything the spec did not cover.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-07 | `Draft` | `<pending>` | Initial execution spec created from `widgetVis.md` Draft CP-1 and investigation reports. |
| 2026-06-07 | `Draft -> Service-aligned draft` | `<pending>` | Updated execution requirements to output canonical `BindingPlanSpec`, pass canonical `ApplyBindingOptions` including previous managed-filter ids, and forbid custom intermediate binding boundary shapes. |
| 2026-06-07 | `Service-aligned draft -> Readiness-gated draft` | `<pending>` | Added mechanical instructions for `widgetVis/waitUntilContentReady`, coalesced per-widget content-ready promises and `widgetSettings` default-seeding integration. |
| 2026-08-30 | T2 F1c must-not | PO / contract writer | `installDrillthrough` / assemble: must not `content.on` / `_KDB.cognosAPI` in widgetVis; selection goes through stamped `visualizationFacet` ops. Not a new facet. |

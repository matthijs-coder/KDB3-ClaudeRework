# Execution Spec: `widgetTopN` (`full port`)

> Execution handoff for implementing `widgetTopN` after CP-1 approval of `contracts/widgetTopN.md`. This spec is mechanical: the executing AI implements the approved contract and does not make architecture decisions.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetTopN.md`
**Phase:** `full port`
**Authoring AI:** GPT-5.5, 2026-06-07
**Executing AI:** `<pending>`
**Reviewer:** `<user / supervising planner>`

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing code and must echo one sentence per item. File creation starts only after the reviewer accepts the echo.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` - `_KDB` has fixed top-level namespaces; feature modules publish under `_KDB.api` and no new top-level namespace is allowed.
2. `_____________KDB3API/.cursor/rules/state.mdc` - `_KDB.state` is serializable and owner-written only; this module writes only `_KDB.state.widgets.topN`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` - runtime resources live under owner-private buckets and every AbortController, promise, timer or resource needs cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` - feature modules expose one dispatch-style surface `{ mount, destroy, dispatch, getState }` with disposed-state guards.
5. `_____________KDB3API/.cursor/rules/events.mdc` - known-owner communication uses direct dispatch; this module emits and subscribes to no events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` - implementation follows approved contract, canonical orchestrator/controller layout and file-size discipline.
7. `_____________KDB3API/.cursor/rules/naming.mdc` - technical names are English, files use precise verb+noun names, and action names use `widgetTopN/<actionName>`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` - named executables and async effects use local try/catch, aborts are filtered, and errors convert at boundaries.
9. `_____________KDB3API/.cursor/rules/dom.mdc` - this module renders no UI, must not scan launchpad/helper/canvas DOM, and may access a helper shell by exact id only to write/confirm/clear TopN-owned claim mirror attributes.
10. `_____________KDB3API/.cursor/rules/amd.mdc` - production JS uses one full-compact AMD `define([...], function (...) { ... })` per file; no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` - module lifecycle values are canonical; per-owner resolution uses `resolutionStatus`, not lifecycle synonyms.
12. `_____________KDB3API/contracts/widgets-binding-pipeline-planner-handoff.md` - non-authority context for settled binding pipeline decisions.
13. `_____________KDB3API/contracts/widgetTopN.md` - approved source of truth for this implementation.
14. `_____________KDB3API/contracts/widgetVis.md` - authority for inbound TopN request initiation and terminal `widgetVis/topNResolved` consumption.
15. `_____________KDB3API/contracts/widgetBindingPlan.md` - schema authority for `BindingPlanSpec`, `BindingPlan` and `helperTableResult`.
16. `_____________KDB3API/contracts/widgetBindingApply.md` - authority for helper `applyBinding`, abort, timeout and diagnostics.
17. `_____________KDB3API/contracts/tableDataService.md` - authority for helper row reads through `tableData.reloadTable([{ widgetId }])`.
18. `_____________KDB3API/contracts/launchpad.md` - authority for read-only `launchpad/readSlotWidgets` helper id discovery; launchpad does not claim, move or filter helpers by eligibility.
19. `_____________KDB3API/contracts/widgetBase.md` - authority for frame/tab reads and widget movement; TopN helper claim does not require a widgetBase helper-role action.
20. This execution spec.

Forbidden pre-flight behavior: do not read legacy JS directly. Use the legacy mapping below. If implementation needs more evidence, stop and ask the planner for a read-only investigation subagent.

## Section B. Folder tree

Create only these production files under the target path:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetTopN/
  __orchestratorWidgetTopN.js
  createWidgetTopNController.js
  config/
    actionTypes.js
    defaults.js
  state/
    initialState.js
    createWidgetTopNReducer.js
    selectors.js
    cloneSerializable.js
  actions/
    handleResolveRequested.js
    handleCleanup.js
    normalizeDispatchResult.js
  effects/
    claimTopNHelper.js
    buildHelperBindingSpec.js
    runHelperBinding.js
    readHelperTableRows.js
    extractTopNResult.js
    cleanupTopNHelper.js
    dispatchTopNResolved.js
```

Do not create `view/`, `events/`, `adapters/`, CSS, tests or harness files in this phase.

## Section C. Legacy mapping table

The executing AI must not re-read legacy JS. Use this mapping as evidence and stop if more evidence is needed.

| New production file | Legacy evidence | Composition / alignment note |
|---|---|---|
| `__orchestratorWidgetTopN.js` | No direct target equivalent; blueprint module registration | New rule-aligned feature module registration under `_KDB.api.widgetTopN`. |
| `createWidgetTopNController.js` | `live/topN/__topNOrchestrator.js` public API and state-machine facade | New dispatch-style controller; no pub/sub scaffold. |
| `config/actionTypes.js` | Legacy action/event names and contract action table | Target action constants only; no event names. |
| `config/defaults.js` | Legacy render/read timeout usage and binding apply defaults | Declarative timeout/profile defaults only. |
| `state/*` | `state/startTopNResolution.js`, `updateTopNResolution.js`, `finishTopNResolution.js`, `cancelTopNResolution.js`, `readTopNResolution.js` | Convert legacy `pending.topNResolution.sequenceId` state into owned `resolutionStatus` plus `opSeq`. |
| `actions/handleResolveRequested.js` | `actions/resolveTopNResolution.js`, `runTopNHelperResolution.js` | Orchestrates claim, helper plan/apply, flat-data read, extraction and terminal dispatch. |
| `actions/handleCleanup.js` | `state/cancelTopNResolution.js`, `api/cleanupTopNHelperWidget.js`, orchestrator cleanup API | Aborts work, clears helper artifacts and optionally releases claim. |
| `effects/claimTopNHelper.js` | `claimTopNHelperTable.js` | Selection/reuse semantics through `launchpad/readSlotWidgets` plus `widgetTopN` owned claim token/state/DOM mirror; no launchpad DOM scan, no `widgetDataTable` claim validation and no `widgetBase` helper-role action. |
| `effects/buildHelperBindingSpec.js` | `buildTopNHelperContext.js`, `buildHelperPlan.js`, `resolveHierarchyHelperPlan.js` | Build canonical `BindingPlanSpec` for `targetKind:"topNHelper"` with helper-normalized `dataConfig`, not the visible chart config unchanged. |
| `effects/runHelperBinding.js` | `configureTopNHelperWidget.js`, `applyBindingPlan.js` call path | Calls `widgetBindingPlan.buildPlan` and `widgetBindingApply.applyBinding`; owns caller `opSeq` checks. |
| `effects/readHelperTableRows.js` | `readTopNHelperResult.js` | Calls `tableData.reloadTable([{ widgetId: helperWidgetId, shape:"row", pick:[...] }])`; no extraction here beyond result normalization. |
| `effects/extractTopNResult.js` | `extractFlatData.js`, `readTopNHelperResult.js`, `buildHelperPlan.js` | Extract values and exclude item id from read result + dataConfig. |
| `effects/cleanupTopNHelper.js` | `cleanupTopNHelperWidget.js` | Clears helper binding artifacts; does not destroy helper and releases claim only when requested. |
| `effects/dispatchTopNResolved.js` | `publishTopNResolutionFinished.js` | Direct dispatch to `widgetVis/topNResolved`, not event emission. |

## Section D. Per-file specifications

Every production file uses AMD full-compact form and returns exactly one value. Factory-scope helpers are allowed; nested function definitions inside entry functions, callbacks or return paths are forbidden.

### `__orchestratorWidgetTopN.js`

- **Role**: module orchestrator.
- **Lines**: target 45, hard limit 90.
- **AMD imports**:
  - `"./createWidgetTopNController.js"`
  - `"./state/selectors.js"`
- **Entry function**: `__orchestrator(_KDB, _options)`.
- **Body steps**:
  1. Create controller with `{ _KDB, options: _options || {}, selectors: _selectors }`.
  2. Ensure `_KDB.api` exists.
  3. Register `_KDB.api.widgetTopN = controller`.
  4. Return controller.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `createWidgetTopNController.js`

- **Role**: controller factory.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"./config/actionTypes.js"`
  - `"./state/initialState.js"`
  - `"./state/createWidgetTopNReducer.js"`
  - `"./state/cloneSerializable.js"`
  - `"./actions/handleResolveRequested.js"`
  - `"./actions/handleCleanup.js"`
  - `"./actions/normalizeDispatchResult.js"`
- **Entry function**: `createWidgetTopNController(_deps)`.
- **Body steps**:
  1. Capture `_KDB`, options and selectors.
  2. Create reducer and closure `_isDisposed`.
  3. Expose exactly `mount`, `destroy`, `dispatch`, `getState`.
  4. `mount` initializes `_KDB.state.widgets.topN` and `_KDB.runtime.widgetTopN`, then marks lifecycle ready.
  5. `dispatch` validates the envelope, routes `resolveRequested`, `cleanup` and `error`, and normalizes results.
  6. `destroy` sets `_isDisposed = true`, aborts all controllers, clears timers/promises/runtime entries, marks disposed and is idempotent.
  7. `getState` returns cloned `_KDB.state.widgets.topN`.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`.

### `config/actionTypes.js`

- **Role**: action constants.
- **Lines**: target 45, hard limit 80.
- **Return value**: object constants for `RESOLVE_REQUESTED`, `CLEANUP`, `ERROR`, reducer/internal actions from `widgetTopN.md` Section 10.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `config/defaults.js`

- **Role**: declarative defaults.
- **Lines**: target 35, hard limit 70.
- **Return value**: object with default timeout profile keys (`helper`, `read`), read options (`pick:"d"`, `as:"objects"`) and terminal statuses.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `state/initialState.js`

- **Role**: initial state builder.
- **Lines**: target 35.
- **Entry function**: `createInitialWidgetTopNState()`.
- **Return value**: fresh `{ lifecycle:"idle", byOwner:{}, errorCode:null, errorMessage:null }`.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `lifecycleVocabulary.md`.

### `state/createWidgetTopNReducer.js`

- **Role**: reducer factory.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"../config/actionTypes.js"`
  - `"./initialState.js"`
  - `"./cloneSerializable.js"`
- **Entry function**: `createWidgetTopNReducer()`.
- **Reducer behavior**: implement the table in Section E only; no DOM, Cognos, events, history, Promise work or throws.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `naming.mdc`, `error-handling.mdc` (reducers exempt from try/catch).

### `state/selectors.js`

- **Role**: published selectors.
- **Lines**: target 75.
- **Return value**: object with selectors from Section F.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `module-public-api.mdc`.

### `state/cloneSerializable.js`

- **Role**: pure clone helper.
- **Lines**: target 25.
- **Entry function**: `cloneSerializable(_value)`.
- **Rules to apply**: `amd.mdc`, `state.mdc`, `naming.mdc`.

### `actions/handleResolveRequested.js`

- **Role**: async action handler.
- **Lines**: target 140, hard limit 150.
- **AMD imports**:
  - `"../effects/claimTopNHelper.js"`
  - `"../effects/buildHelperBindingSpec.js"`
  - `"../effects/runHelperBinding.js"`
  - `"../effects/readHelperTableRows.js"`
  - `"../effects/extractTopNResult.js"`
  - `"../effects/cleanupTopNHelper.js"`
  - `"../effects/dispatchTopNResolved.js"`
- **Must do**:
  1. Validate owner id, payload and dependencies.
  2. Adopt envelope `opSeq` when present; increment/capture local runtime `opSeq` only when absent. Abort prior same-owner work and mark pending.
  3. Handle default TopN by terminal success with empty values and no helper work only as a direct-call/test backstop; normal `widgetVis` production clear/default TopN uses visible binding plus `widgetTopN/cleanup`.
  4. Claim/reuse helper through `claimTopNHelper`, which discovers same-tab `topN` helper ids through `launchpad/readSlotWidgets` and owns claim token confirmation.
  5. Terminal `noHelperAvailable` when no helper can be claimed.
  6. Build helper-normalized `BindingPlanSpec`, run helper binding, read helper rows through `tableData.reloadTable([{ widgetId }])`, extract result.
  7. Check current `opSeq` after every awaited boundary.
  8. Write success/error/no-helper through reducer instructions only.
  9. Dispatch exactly one terminal result for current non-stale work.
  10. After dispatching the current terminal result, run post-resolution helper cleanup through `buildPlan -> applyBinding` with `reason:"cleanup"` and `resetIntent.enabled === true` whenever helper apply succeeded for this operation, unless inspection mode is enabled with `config.preserveHelperBindingForInspection === true`, `config.topNOptions.preserveHelperBindingForInspection === true` or `config.topNOptions.skipPostResolutionHelperCleanup === true`. Use `cleanupReason:"postResolution"`, `clearHelperBinding:true`, `releaseClaim:false`, and never dispatch a second terminal result for cleanup.
- **Must not do**: write foreign state, call Cognos directly, emit events, commit history, scan DOM.
- **Rules to apply**: `runtime.mdc`, `state.mdc`, `module-public-api.mdc`, `events.mdc`, `error-handling.mdc`, `amd.mdc`.

### `actions/handleCleanup.js`

- **Role**: async cleanup action handler.
- **Lines**: target 110, hard limit 140.
- **AMD imports**:
  - `"../effects/cleanupTopNHelper.js"`
- **Must do**:
  1. Abort owner work.
  2. Clear helper binding artifacts when requested.
  3. Release claim only when payload `releaseClaim === true`.
  4. Reset owned topN state for the owner.
  5. Never destroy helper widget.
- **Rules to apply**: `runtime.mdc`, `state.mdc`, `error-handling.mdc`, `module-public-api.mdc`.

### `actions/normalizeDispatchResult.js`

- **Role**: result normalizer.
- **Lines**: target 45.
- **Return value**: helper function that returns the normalized dispatch result shape from the contract.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `state.mdc`.

### `effects/claimTopNHelper.js`

- **Role**: helper claim coordinator.
- **Lines**: target 120, hard limit 150.
- **Entry function**: `__controller(_deps, _context)`.
- **Must do**:
  1. Resolve the owner visualization `tabId` from the action context or public widgetBase frame evidence; fail with `WIDGET_TOPN_INVALID_REQUEST` when unavailable.
  2. Reuse current helper id when it is still present in the same-tab `topN` pad and `widgetTopN` state/runtime/DOM mirror confirm the same owner.
  3. Call `_KDB.api.launchpad.dispatch({ type:"launchpad/readSlotWidgets", payload:{ padKey:"topN", tabId, mode:"all" } })` to get ordered helper ids.
  4. Select the first free candidate id. A candidate is free when no current `widgetTopN.byOwner[*]` record owns it and its TopN-owned DOM mirror is absent or already matches this owner.
  5. Generate a claim token, write `helperWidgetId`/`claimToken` to `widgetTopN` owned state/runtime, and mirror `data-connected-vis-widget-id` plus `data-kdb-topn-claim-token` on the helper shell.
  6. Wait 50ms, then re-check `widgetTopN` state/runtime and DOM mirror. Confirm only when owner id, helper id and token still match. On mismatch, clear this operation's stale mirror when the token still matches and retry the next candidate.
  7. Return `{ ok:true, helperWidgetId, claimToken }`, `{ ok:false, status:"noHelperAvailable" }` or coded failure.
- **Must not do**: scan launchpad slots, read `_KDB.runtime.launchpad`, call `widgetDataTable/validateClaimable`, call a `widgetBase` helper-role action, write base/datatable state, or store DOM refs in state/runtime.
- **Rules to apply**: `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `dom.mdc`, `error-handling.mdc`.

### `effects/buildHelperBindingSpec.js`

- **Role**: canonical helper spec builder.
- **Lines**: target 100, hard limit 140.
- **Entry function**: `__controller(_context)`.
- **Must do**: output exact `BindingPlanSpec` with `targetKind:"topNHelper"`, `widgetId: helperWidgetId`, `ownerWidgetId: ownerVisId`, `opSeq`, `reason:"topN"`, helper-normalized `dataConfig`, planner-ready `hierarchySnapshot` from `widgetVis`, `config`, `helperTableResult:null`, enabled `resetIntent` (`clearAllSlots:true`, `clearAllLocalFilters:true`) and disabled `emptyIntent`.
- **Helper dataConfig rules (minimal fix)**: build a narrow helper-only `dataConfig` from `KDB3/js/core/config/visualizations/topNHelper.js` plus visible metric/table/dimension identity. Do not `Object.assign` the visible `dataConfig`. Helper `visTypeConfig.grid_cols` must be `[jahrColumnId?, dimension.topNItemId, valueColumnId]` with aggregation filter, max/current Jahr filter when available, and helper dimension exclude on `topNItemId`; omit generic `List` `slotComposition`, visible `itemId` slot columns, `Monat`, `kennzahlDefaults`, and broad List filters. Keep `dataConfig.topN` as helper query intent; ensure it matches `topNChoice`. `widgetBindingPlan` emits helper `topBottom`/`topcount` plan material and `widgetBindingApply` consumes it. If `topNHelper.js` table metadata or `topNItemId` is missing, return a coded failure instead of falling back to generic `List` config.
- **Must not do**: invent plan fields, call Cognos directly, pass generic `List` `visTypeConfig`/`slotComposition` through helper planning, or suppress the `widgetVis` Dienststelle snapshot. Reading the already loaded `tableData` year cache is allowed only for the helper Jahr filter.
- **Rules to apply**: `state.mdc`, `module-public-api.mdc`, `error-handling.mdc`, `naming.mdc`.

### `effects/runHelperBinding.js`

- **Role**: async helper plan/apply coordinator.
- **Lines**: target 130, hard limit 150.
- **Entry function**: `__controller(_deps, _context)`.
- **Must do**:
  1. Call `_KDB.services.widgetBindingPlan.buildPlan(spec)`.
  2. If plan fails, return `WIDGET_TOPN_HELPER_PLAN_FAILED` and do not call apply.
  3. Call `_KDB.services.widgetBindingApply.applyBinding(plan, options)` with `targetKind:"topNHelper"`, `ownerWidgetId`, `opSeq`, `reason: plan.reason`, `signal`, `previousManagedFilterItemIds`, `timeoutProfile:"helper"`.
  4. Treat `aborted` as supersession; `timeout` as `WIDGET_TOPN_HELPER_APPLY_TIMEOUT`; `error` as `WIDGET_TOPN_HELPER_APPLY_FAILED`.
  5. On success, return new `managedFilterItemIds` and diagnostics.
- **Must not do**: commit settings/history or use `mirrorPatch` as state.
- **Rules to apply**: `runtime.mdc`, `error-handling.mdc`, `state.mdc`.

### `effects/readHelperTableRows.js`

- **Role**: async helper row read via `tableDataService`.
- **Lines**: target 100, hard limit 140.
- **Entry function**: `__controller(_deps, _context)`.
- **Must do**: call `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId, shape:"row", pick:["display","use","d","u","value","v","label","caption"] }])`; check `signal.aborted` before and after the awaited reload; wrap returned rows in the existing read-result shape enough for `extractTopNResult`.
- **Must not do**: use `waitForRows`, `readRows` or `ensureFreshRows` for helper reuse runs; extract TopN values; call Cognos directly.
- **Rules to apply**: `runtime.mdc`, `error-handling.mdc`, `state.mdc`.

### `effects/extractTopNResult.js`

- **Role**: pure extraction helper.
- **Lines**: target 100, hard limit 140.
- **Entry function**: `__controller(_readResult, _dataConfig, _topNChoice, _topNOptions)`.
- **Must do**:
  1. Resolve count-style `n` from `topNChoice` and `topNOptions`.
  2. Resolve `excludeItemId` from `dataConfig.dataTableConfig.dimensions[dataConfig.dimension].exclude.itemId`.
  3. Select result value column by `raw.colKeys[1] || raw.colKeys[0]`, or `Object.keys(row)[1] || keys[0]` for tableData rows without `colKeys`.
  4. Unpack tableData cell objects to scalars with priority `d`, `display`, `use`, `value`, `u`, `v`, `label`, `caption`; normalize values to strings, skip empties and return first `n`.
  5. Reject stale placeholder labels (`superuser`, `dbversion`) with `WIDGET_TOPN_RESULT_STALE_HELPER`.
  6. Return coded failures `WIDGET_TOPN_EXCLUDE_ITEM_MISSING`, `WIDGET_TOPN_RESULT_EMPTY` or `WIDGET_TOPN_RESULT_STALE_HELPER`.
- **Must not do**: read state, call services, mutate inputs.
- **Rules to apply**: `state.mdc`, `error-handling.mdc`, `naming.mdc`.

### `effects/cleanupTopNHelper.js`

- **Role**: helper cleanup coordinator.
- **Lines**: target 120, hard limit 150.
- **Entry function**: `__controller(_deps, _context)`.
- **Must do**:
  1. Abort old helper work when supplied.
  2. Build a canonical cleanup `BindingPlanSpec` with `reason:"cleanup"`, `targetKind:"topNHelper"`, `helperTableResult:null`, enabled `resetIntent` (`clearAllSlots:true`, `clearAllLocalFilters:true`, `reason:"postResolution"`) and disabled `emptyIntent`.
  3. Do not add an `emptyData/forceEmpty` cleanup filter. Cleanup is a technical helper reset and should result in a reset-only plan with empty `slots`, `localFilters` and `managedFilterItemIds`.
  4. Apply that cleanup plan through `_KDB.services.widgetBindingApply.applyBinding` with previous helper managed ids from runtime.
  5. Release the TopN-owned claim only when `releaseClaim === true`: clear `widgetTopN` state/runtime claim metadata and remove TopN-owned DOM mirror attributes only when the mirrored owner/token still match.
  6. Never call or invent an extra cleanup API, never destroy the helper widget, never move helper DOM directly and never dispatch `widgetVis/topNResolved` from cleanup.
- **Rules to apply**: `runtime.mdc`, `module-public-api.mdc`, `state.mdc`, `dom.mdc`, `error-handling.mdc`.

### `effects/dispatchTopNResolved.js`

- **Role**: terminal dispatch effect.
- **Lines**: target 70, hard limit 110.
- **Entry function**: `__controller(_KDB, _payload)`.
- **Must do**: call `_KDB.api.widgetVis.dispatch({ type:"widgetVis/topNResolved", widgetId: ownerVisId, opSeq, payload })`; return whether terminal dispatch was accepted.
- **Must not do**: emit event bus events or write `widgetVis` state directly.
- **Rules to apply**: `events.mdc`, `module-public-api.mdc`, `error-handling.mdc`, `state.mdc`.

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `widgetTopN/mountStarted` | `mount()` | Initialize state if missing, clear module error. | `idle -> initializing` |
| `widgetTopN/mountSucceeded` | `mount()` success | Set module lifecycle ready. | `initializing -> ready` |
| `widgetTopN/registerOwner` | first owner request | Create per-owner record with `resolutionStatus:"idle"`. | none |
| `widgetTopN/markPending` | resolution starts | Set `resolutionStatus:"pending"`, helper id if known, pending opSeq and clear error. | none |
| `widgetTopN/helperClaimed` | helper claim success | Store `helperWidgetId` and keep pending. | none |
| `widgetTopN/resolutionSucceeded` | current successful extraction | Store result values/exclude item, status success, clear pending/error. | none |
| `widgetTopN/noHelperAvailable` | no helper terminal | Set status noHelperAvailable, clear helper/result/pending and set error code. | none |
| `widgetTopN/errorRecorded` | current failure | Set status error, error fields and clear pending. | module may become `error` for module-level failure |
| `widgetTopN/cleanupSucceeded` | cleanup success | Reset owner record to idle empty values. | none |
| `widgetTopN/destroy` | `destroy()` | Mark module disposed. | `ready/error -> disposed` |

## Section F. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetTopNState(_KDB)` | `_KDB.state.widgets.topN` | Cloned topN subtree or `undefined`. |
| `readTopNResolution(_KDB, ownerVisId)` | `byOwner[ownerVisId]` | Cloned per-owner resolution or `undefined`. |
| `readTopNHelperWidgetId(_KDB, ownerVisId)` | per-owner helper field | Helper id or `null`. |
| `readTopNStatus(_KDB, ownerVisId)` | per-owner status | Status string or `undefined`. |

## Section G. Public API wiring

- Surface: `_KDB.api.widgetTopN`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- Runtime initialization: `_KDB.runtime.widgetTopN = { abortControllers, pendingPromises, timers, byOwner }`.
- State initialization: `_KDB.state.widgets.topN = { lifecycle, byOwner, errorCode, errorMessage }`.
- Events: none.
- Bootstrap: add module registration at the widget-domain bootstrap point after dependencies are registered. Do not edit `KDB.js` unless the reviewer explicitly broadens CP-2.

## Section H. Integration requirements

Implementation must stop and report a CP-2 integration gap if any hard prerequisite is missing:

1. `_KDB.services.widgetBindingPlan.buildPlan`.
2. `_KDB.services.widgetBindingApply.applyBinding`.
3. `_KDB.services.tableData.reloadTable`.
4. `_KDB.api.widgetVis.dispatch` accepting `widgetVis/topNResolved`.
5. `_KDB.api.launchpad.dispatch` accepting `launchpad/readSlotWidgets` exactly as documented in `launchpad.md`.
6. Public widgetBase frame/tab read evidence sufficient to resolve the owner visualization `tabId`.

## Section I. Acceptance criteria

1. Every file in Section B exists and no extra folder/file was created.
2. Public API remains exactly `{ mount, destroy, dispatch, getState }`.
3. No file writes `_KDB.state.widgets.vis`, `.settings`, `.base`, `.dataTable`, history, tableData, launchpad or filters.
4. All state writes to `_KDB.state.widgets.topN` go through reducer/writer helpers owned by this module.
5. Runtime resources are under `_KDB.runtime.widgetTopN` and are cleaned by `cleanup` / `destroy`.
6. `resolveRequested` handles success, error, timeout, no-helper and aborted/stale cases.
7. Normal `widgetVis` calls adopt and echo the envelope `opSeq`; `widgetTopN` increments only when no envelope `opSeq` is supplied.
8. Every current non-stale resolution dispatches exactly one terminal `widgetVis/topNResolved`.
9. Stale/aborted work writes no state and dispatches no terminal result.
10. Helper claim/release is owned by `widgetTopN`, uses `launchpad/readSlotWidgets` for ordered same-tab `topN` helper ids, and uses claim token + DOM/state recheck after 50ms.
11. Helper binding uses canonical `BindingPlanSpec` and `ApplyBindingOptions`; no custom plan shape is introduced.
12. Helper binding uses helper-normalized `dataConfig`, not the visible chart config unchanged.
14. Helper row reading uses `tableData.reloadTable([{ widgetId }])`; TopN extraction stays in `extractTopNResult.js`.
15. `previousManagedFilterItemIds` for helper cleanup/apply come from `_KDB.runtime.widgetTopN.byOwner[ownerVisId].helperManagedFilterItemIds`.
16. Post-resolution helper cleanup runs after every non-default operation where helper apply succeeded, including read/extraction error paths after helper apply success, unless inspection mode is enabled.
17. Helper cleanup uses `buildPlan -> applyBinding` with `reason:"cleanup"` and `resetIntent.enabled === true`; no extra cleanup API is called.
18. Helper cleanup never dispatches `widgetVis/topNResolved`.
19. `mirrorPatch` is not committed to settings or state.
20. `cleanup` never destroys helper widgets and releases claims only when explicitly requested.
21. No launchpad DOM scans, helper-table DOM scans, event bus usage or history commits are introduced.
22. All JS files use full-compact AMD form and no ES module syntax.
23. Every named executable/async function follows error-handling and abort discipline.
24. `ReadLints` is run on all new/modified JS files.

## Section J. Forbidden actions

- Do not modify `.cursor/rules/`, templates, blueprint, `stateOwnership.md` or legacy trees.
- Do not write production code before CP-1 approval.
- Do not implement `widgetVis`, `widgetBindingPlan`, `widgetBindingApply`, `widgetDataTable` or `widgetBase` inside this module.
- Do not invent or pass a custom service-boundary binding spec shape.
- Do not call `_KDB.cognosAPI.widgets.*` directly from `widgetTopN`.
- Do not add `events/eventNames.js` or use `_KDB.events`.
- Do not add launchpad/helper-table DOM scans.
- Do not call `widgetDataTable/validateClaimable`, `widgetDataTable/releaseClaim` or a `widgetBase` helper-role/owner action for TopN claim.
- Do not commit settings, derived visible-widget state or history.
- Do not destroy helper widgets from `widgetTopN`.
- Do not commit, push or change git config.

## Section K. Reporting template

The executing AI's final response must include:

1. Pre-flight echo: 20 numbered summaries from Section A.
2. File checklist: every path created/modified with line count and `matches spec | deviation`.
3. Import-resolution notes, especially widget-domain bootstrap and dependency availability.
4. Deviations: any deviation with motivation and rule consulted.
5. Self-verification: pass/fail per Section I criterion.
6. `ReadLints` result for all new/modified JS files.
7. Open reviewer questions or CP-2 integration gaps.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-07 | `Draft` | `<pending>` | Initial execution spec created from `widgetTopN.md` Draft CP-1, binding pipeline contracts and read-only TopN investigation reports. |
| 2026-06-14 | `Read boundary refinement` | GPT-5.5 | Added `readHelperTableRows.js` with full reloadTable pick array; extraction unpacks tableData cell objects. |

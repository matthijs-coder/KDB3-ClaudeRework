# Execution Spec: `sicht` direct port

> Execution spec for the cheap AI implementing the approved `sicht` contract.
> This is a DIRECT PORT into the production tree. No `TEST/` sandbox and no browser harness.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/sicht.md`
**Phase:** `direct port baseline + approved behavior redesign`
**Authoring AI:** GPT-5.5, 2026-05-25
**Executing AI:** `<fill in>`
**Reviewer:** `<user / supervising AI>`

---

## Section A. Pre-flight read list

The executing AI must read these files before writing anything. Its first output must be the numbered one-sentence summaries below, filled with its own summaries. If any summary is missing, stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` - summary: `<one sentence>`
2. `_____________KDB3API/.cursor/rules/state.mdc` - summary: `<one sentence>`
3. `_____________KDB3API/.cursor/rules/runtime.mdc` - summary: `<one sentence>`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` - summary: `<one sentence>`
5. `_____________KDB3API/.cursor/rules/events.mdc` - summary: `<one sentence>`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` - summary: `<one sentence>`
7. `_____________KDB3API/.cursor/rules/naming.mdc` - summary: `<one sentence>`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` - summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` - summary: `<one sentence>`
10. `_____________KDB3API/.cursor/rules/amd.mdc` - summary: `<one sentence>`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` - summary: `<one sentence>`
12. `_____________KDB3API/contracts/_template.md` - summary: `<one sentence>`
13. `_____________KDB3API/contracts/sicht.md` - summary: `<one sentence>`
14. This execution spec - summary: `<one sentence>`

Only after the Section A echo is complete may file creation/editing begin.

---

## Section B. Scope and mapping table

### B1. Production targets

Create or modify only these production targets:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
_____________KDB3API/KDB3/css/filters/sichtSingleSelect.css
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchSingleSelectHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/compat/resolveFilterCapabilities.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/core/css/config/cssHrefList.js
```

Do not create `TEST/` files. Do not modify legacy trees.

### B2. Mapping table

| Production file | Legacy / production input | Alignment / delta note |
|---|---|---|
| `sicht/__orchestratorSicht.js` | `_______REDESIGN2/.../sicht/__sichtOrchestrator.js`, production `singleSelect/__orchestratorSingleSelect.js` | Register `_KDB.api.sicht`, initialize state/runtime/selectors; thin orchestrator only. |
| `sicht/createSichtController.js` | REDESIGN2 `__sichtOrchestrator.js`, production `specialSingleSelect/createSpecialSingleSelectController.js` | Dispatch-style public API with disposed guard, mount/destroy try/catch, no mixed methods. |
| `sicht/config/actions.js` | production action files | Canonical slash action constants. |
| `sicht/config/sichtDefinitions.js` | `core/config/tables.js`, user CP-1 decisions | BW/DEZPV config maps table keys and classes; display values come from config. |
| `sicht/config/selectors.js` | `filterDock` selector pattern | Selector/class constants only; no live DOM. |
| `sicht/state/initialState.js` | REDESIGN2 `ensureSichtState.js` | Serializable owner state with lifecycle, selections, byOption, meta, errors. |
| `sicht/state/createSichtReducer.js` | REDESIGN2 state mutations | Pure reducer only; no DOM, no services, no events. |
| `sicht/state/selectors.js` | production selector registries | Published read selectors; no writer behavior. |
| `sicht/effects/mapFilterDockHandoff.js` | production `singleSelect/effects/mapFilterDockHandoff.js`, `specialSingleSelect/effects/mapFilterDockHandoff.js` | Convert serializable filterDock payload to Sicht handoff; no DOM reads. |
| `sicht/effects/readSichtAvailabilityFromTableData.js` | REDESIGN2 `getSichtRelevance.js`, `core/config/tables.js` | Use `_KDB.services.tableData.readRows(...)`; no direct `_KDB.state.tableData` read. |
| `sicht/effects/evaluateSichtOptions.js` | REDESIGN2 `getSichtRelevance.js` | Build visible/disabled state from availability and default readiness. |
| `sicht/effects/syncSichtOptionAvailability.js` | REDESIGN2 `restorePopupSelection.js`, `hideDuplicateOptions.js` | Apply idempotent DOM classes/options for Sicht only; no foreign state writes. |
| `sicht/effects/delegateToSingleSelect.js` | production `specialSingleSelect/effects/delegateToSingleSelect.js` | Dispatch generic handoffs to `_KDB.api.singleSelect`; do not import singleSelect internals. |
| `sicht/effects/commitConfirmedSicht.js` | REDESIGN2 `applyConfirmedSichtCascade.js` | Owner-side confirmed commit handling after singleSelect success: update Sicht, notify specialSingleSelect, push history. |
| `sicht/effects/notifySpecialSingleSelect.js` | specialSingleSelect communique | Direct API dispatch `specialSingleSelect/sichtChanged` after confirmed commit only. |
| `sicht/effects/ensureSichtRuntime.js` | runtime rule + production patterns | Ensure `_KDB.runtime.sicht` buckets; effects folder, not `runtime/` folder. |
| `sicht/effects/cleanupSichtRuntime.js` | runtime rule + production patterns | Abort/unsubscribe/disconnect/clear in correct order. |
| `sicht/history/buildCommittedStep.js` | REDESIGN2 `buildCommittedStep.js` | Build `filter_sicht` step with dependent snapshots. |
| `sicht/history/readDependencySnapshots.js` | CP-1 history decision | Read specialSingleSelect via public API only; `dienststelle: null`. |
| `sicht/history/applySichtHistoryReplay.js` | REDESIGN2 `__sichtHistoryAdapter.js` | Prepare owner-only replay helper; dependent replay deferred. |
| `sichtSingleSelect.css` | REDESIGN2 popup/class evidence | Rule-compliant CSS classes; hide Alle; disabled option style. |
| `filterDock/effects/dispatchSingleSelectHandoff.js` | production file | Extend owner routing to `filterType: "sicht"` -> `_KDB.api.sicht`. |
| `filterDock/compat/resolveFilterCapabilities.js` | production file | Ensure cascade upstream resolves `filterType: "sicht"` if not already present. |
| `singleSelect/effects/commitConfirmedSelection.js` | production file | Add narrow public-API post-commit hook to `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })`. |
| `KDB.js` | production bootstrap | Import/register/mount/destroy `_KDB.api.sicht`. |
| `cssHrefList.js` | production CSS list | Add `./v1/ext/KDB3/css/filters/sichtSingleSelect.css`. |

---

## Section C. Folder tree

Create this tree:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
  __orchestratorSicht.js
  createSichtController.js
  config/
    actions.js
    sichtDefinitions.js
    selectors.js
  state/
    initialState.js
    createSichtReducer.js
    selectors.js
  effects/
    mapFilterDockHandoff.js
    readSichtAvailabilityFromTableData.js
    evaluateSichtOptions.js
    syncSichtOptionAvailability.js
    delegateToSingleSelect.js
    commitConfirmedSicht.js
    notifySpecialSingleSelect.js
    ensureSichtRuntime.js
    cleanupSichtRuntime.js
  history/
    buildCommittedStep.js
    readDependencySnapshots.js
    applySichtHistoryReplay.js
    createSichtHistoryReplayHandler.js
    stageSichtHistoryReplayHandler.js
```

Create:

```txt
_____________KDB3API/KDB3/css/filters/sichtSingleSelect.css
```

Modify:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchSingleSelectHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/compat/resolveFilterCapabilities.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/core/css/config/cssHrefList.js
```

---

## Section D. Per-file specifications

Every production JS file must use full-compact AMD: exactly one `define([...], function (...) { ... })`, no ES modules, no inline subfunction definitions inside entry functions or callbacks.

### D1. `sicht/config/actions.js`

- Role: action constants.
- Return object with these exact constants:
  - `MOUNT_SUCCEEDED: "sicht/mountSucceeded"`
  - `FILTER_DOCK_STATE_CHANGED: "sicht/filterDockStateChanged"`
  - `FILTER_DOCK_POPUP_READY: "sicht/filterDockPopupReady"`
  - `SINGLE_SELECT_COMMITTED: "sicht/singleSelectCommitted"`
  - `TABLE_DATA_CHANGED: "sicht/tableDataChanged"`
  - `SYNC_REQUESTED: "sicht/syncRequested"`
  - `SYNC_OPTIONS_EVALUATED: "sicht/syncOptionsEvaluated"`
  - `ERROR: "sicht/error"`
  - `DESTROY: "sicht/destroy"`
- Rules to apply:
  - `amd.mdc` - one AMD return object.
  - `naming.mdc` - action names use slash-style `<module>/<action>`.
  - `feature-structure.mdc` - config folder holds constants only.

### D2. `sicht/config/sichtDefinitions.js`

- Role: module-local config.
- Return:
  - `BW`: `displayValue: "BW"`, `optionTableKey: "sicht_bw"`, `defaultTableKey: "dienststelle_bw_default"`, `cssClass: "kdb-sicht-option-bw"`.
  - `DEZPV`: `displayValue: "DEZPV"`, `optionTableKey: "sicht_dezpv"`, `defaultTableKey: "dienststelle_dezpv_default"`, `cssClass: "kdb-sicht-option-dezpv"`.
- Rules to apply:
  - `state.mdc` - config is serializable; not runtime.
  - `naming.mdc` - English identifiers; German labels only if user-facing.
  - `feature-structure.mdc` - config folder holds declarative definitions.

### D3. `sicht/config/selectors.js`

- Role: selector/class constants.
- Return object with at least:
  - `rootClass: "kdb-sicht-single-select"`
  - `disabledOptionClass: "kdb-sicht-option-disabled"`
  - `optionSelector: ".ba-common-listItem-wrapper"`
  - `optionLabelSelector: ".ba-common-truncatedText__text"`
- Do not add `commitInProgressClass` to `config/selectors.js`; `KDB_sichtCommitInProgress` is a reserved contract/CSS class only (see `sicht.md` Section 16). Generic commit UI uses `KDB_singleSelectCommitInProgress`.
- Rules to apply:
  - `dom.mdc` - selector strings/classes only; no live DOM.
  - `naming.mdc` - CSS classes kebab-case with `kdb-` prefix.

### D4. `sicht/state/initialState.js`

- Role: initial state factory.
- Return a fresh object matching contract Section 4.
- Use lifecycle `"idle"`.
- Include `activeSichtValue`, `currentSelection`, `backupSelection`, `pendingSelection`, `byOption`, `meta`, `lastHistoryStep`, `errorCode`, `errorMessage`.
- Rules to apply:
  - `state.mdc` - serializable state only; no DOM/functions/promises.
  - `lifecycleVocabulary.md` - use canonical lifecycle terms only.
  - `amd.mdc` - return one factory function.

### D5. `sicht/state/createSichtReducer.js`

- Role: pure reducer factory.
- Imports `../config/actions.js`, `./initialState.js`.
- Handles:
  - `MOUNT_SUCCEEDED` -> lifecycle `ready`, clear error.
  - `SYNC_OPTIONS_EVALUATED` -> update `byOption` from payload, preserving other state.
  - `FILTER_DOCK_STATE_CHANGED` / `FILTER_DOCK_POPUP_READY` -> update `meta.lastHandoffAt` only.
  - `SINGLE_SELECT_COMMITTED` -> set `currentSelection`, `backupSelection`, `pendingSelection`, `activeSichtValue`, `meta.lastCommittedAt`, `lastHistoryStep`.
  - `ERROR` -> lifecycle `error`, error fields.
  - `DESTROY` -> lifecycle `disposed`; clear transient pending/meta safely.
- Must not call services, APIs, DOM, events, Date except via payload timestamps.
- Rules to apply:
  - `state.mdc` - canonical writer and serializable state only.
  - `error-handling.mdc` - reducers exempt — pure, no try/catch.
  - `naming.mdc` - action constants from config.

### D6. `sicht/state/selectors.js`

- Role: published selector registry.
- Export object with:
  - `readSichtState(_KDB)`
  - `readActiveSichtValue(_KDB)`
  - `readSichtOptionState(_KDB, _sichtValue)`
  - `readCurrentSichtSelection(_KDB)`
- Return cloned objects where objects are returned.
- Rules to apply:
  - `module-public-api.mdc` - granular reads through selectors, not `_KDB.api.sicht.read*`.
  - `state.mdc` - selectors are read-only and pure.

### D7. `sicht/effects/ensureSichtRuntime.js`

- Role: ensure runtime buckets.
- Ensure `_KDB.runtime.sicht` with standard buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`.
- Return the runtime object.
- Rules to apply:
  - `runtime.mdc` - runtime resources under `_KDB.runtime.sicht`, standard bucket names only.
  - `feature-structure.mdc` - this lives in `effects/`, not a `runtime/` folder.

### D8. `sicht/effects/cleanupSichtRuntime.js`

- Role: cleanup runtime resources.
- Cleanup order:
  1. Abort every `abortControllers.*`.
  2. Call every function in `subscriptions.*`.
  3. Disconnect every `observers.*`.
  4. Clear timers with `clearTimeout` / `clearInterval` where applicable.
  5. Clear `listeners`, `domRefs`, `pendingPromises`.
  6. Reset buckets to empty objects.
- Catch and `console.warn` individual cleanup failures without stopping later cleanup.
- Rules to apply:
  - `runtime.mdc` - every resource has cleanup path.
  - `error-handling.mdc` - cleanup boundary logs with context, no silent catch.

### D9. `sicht/effects/mapFilterDockHandoff.js`

- Role: normalize filterDock handoff.
- Accept serializable handoff object.
- Return null unless `filterType === "sicht"`.
- Return normalized object with `filterId`, `filterKey`, `filterLabel`, `filterScope`, `scopeId`, `filterConfig`, `interactionType`, `optionLabel`, `isAlleOption`, `popup`, `capabilities`, `timestamp`.
- Rules to apply:
  - `state.mdc` - output serializable data only.
  - `dom.mdc` - no DOM reads.

### D10. `sicht/effects/readSichtAvailabilityFromTableData.js`

- Role: read tableData-driven visibility and default readiness.
- Imports `../config/sichtDefinitions.js`.
- Use `_KDB.services.tableData.readRows(tableInput)` pattern compatible with production `specialSingleSelect/effects/buildSpecialTableDataInputs.js`.
- Build table input from `_KDB.config.tables[tableKey]` as `[{ tableName: tableKey, shape, pick }]`.
- For each definition:
  - read first row of `optionTableKey`; iterate first row fields and use the first cell.
  - availability is allowed when first cell `.use`, `.u`, `.d`, direct value, `1`, `"1"`, or `true` indicates loaded/available.
  - read first row of `defaultTableKey`; default readiness is true when rows array has at least one row.
  - return `{ known, isVisible, isDefaultReady, useValue }` per Sicht value.
- Do not read `_KDB.state.tableData` directly.
- Rules to apply:
  - `state.mdc` / `module-public-api.mdc` - service data through public service API only.
  - `kdb-object.mdc` - no legacy `_KDB.state.tablesLoaded`.

### D11. `sicht/effects/evaluateSichtOptions.js`

- Role: derive byOption state.
- Import `../config/sichtDefinitions.js`.
- Combine definitions and availability:
  - hidden when option table not available.
  - visible disabled when option available but default not ready.
  - enabled when both available and default ready.
- Preserve `displayValue` from config.
- Return serializable `byOption` object and `evaluatedAt`.
- Rules to apply:
  - `state.mdc` - pure derivation.
  - `naming.mdc` - booleans use `is*`.

### D12. `sicht/effects/syncSichtOptionAvailability.js`

- Role: DOM sync for Sicht popup options.
- Inputs: `_KDB`, runtime, mapped handoff, byOption.
- Apply only when popup/root DOM is available from handoff/runtime; no global document search except scoped to current popup/root.
- Hide `"Alle"` option by default.
- Prevent duplicates: keep selected option if duplicate labels exist; hide other duplicate entries.
- Disabled visible options get `aria-disabled="true"`, pointer-events none, class `kdb-sicht-option-disabled`.
- Current selected option stays visible.
- Do not mutate state; return summary `{ didSync, visibleCount, enabledCount }`.
- Rules to apply:
  - `dom.mdc` - DOM mutations in effects, no state writes in DOM logic, scoped queries.
  - `runtime.mdc` - live refs under `_KDB.runtime.sicht.domRefs`.
  - `naming.mdc` - CSS classes rule-compliant.

### D13. `sicht/effects/delegateToSingleSelect.js`

- Role: dispatch generic behavior to `singleSelect`.
- If `_KDB.api.singleSelect.dispatch` exists, call it with:
  - type `singleSelect/filterDockStateChanged` for `sicht/filterDockStateChanged`;
  - type `singleSelect/filterDockPopupReady` for `sicht/filterDockPopupReady`;
  - payload copied from original handoff with `filterType: "sicht"`, `capabilities.hasAlleOption: false`.
- Do not import singleSelect internals.
- Rules to apply:
  - `module-public-api.mdc` - cross-module calls use public API only.
  - `state.mdc` - no foreign state writes.

### D14. `sicht/effects/notifySpecialSingleSelect.js`

- Role: notify dependent owner after confirmed commit.
- If `_KDB.api.specialSingleSelect.dispatch` exists, dispatch:

```js
{
  type: "specialSingleSelect/sichtChanged",
  payload: { activeSichtValue: selection.displayValue }
}
```

- Return true/false for whether notification was sent.
- Rules to apply:
  - `events.mdc` - direct API for known owner; no event.
  - `state.mdc` - no foreign state writes.

### D15. `sicht/history/readDependencySnapshots.js`

- Role: read dependent snapshots for history.
- `specialSingleSelect`: if `_KDB.api.specialSingleSelect.getState()` exists, clone and return it.
- `dienststelle`: always `null` in this tranche.
- Do not read `_KDB.state.filters.specialSingleSelect` directly.
- Rules to apply:
  - `module-public-api.mdc` - public API only.
  - `state.mdc` - no foreign internal reads.

### D16. `sicht/history/buildCommittedStep.js`

- Role: build history step.
- Inputs: handoff/previousSelection/nextSelection/dependencies.
- Return shape:
  - `key: "filter_sicht"`
  - `timestamp`
  - `old: { displayValue, useValue, activeSichtValue }`
  - `new: { displayValue, useValue, activeSichtValue }`
  - `dependencies: { specialSingleSelect, dienststelle }`
- Rules to apply:
  - `state.mdc` - serializable history payload.
  - `naming.mdc` - clear English identifiers.

### D17. `sicht/history/applySichtHistoryReplay.js`

- Role: owner-only replay helper.
- Export object `{ apply: apply }`.
- For this tranche, apply only the Sicht selection through `_KDB.api.sicht.dispatch(...)` or return false if no public path is available.
- Do not restore `specialSingleSelect` or `dienststelle`; leave comment and return metadata that dependent replay is deferred.
- Rules to apply:
  - `module-public-api.mdc` - replay through owner public API.
  - `state.mdc` - no foreign writes.

### D18. `sicht/effects/commitConfirmedSicht.js`

- Role: owner side after `singleSelect` confirmed commit.
- Imports actions, history builder, dependency snapshot reader, notifySpecialSingleSelect.
- Steps:
  1. Normalize payload selection.
  2. Read previous Sicht selection from `_KDB.state.filters.sicht` via current owner state only.
  3. Read dependency snapshots.
  4. Build `filter_sicht` history step.
  5. Dispatch internal `SINGLE_SELECT_COMMITTED` with selection, timestamp and history step.
  6. Call `notifySpecialSingleSelect`.
  7. Push history via `_KDB.services.history.pushCommittedStep(step)` if available.
- Do not call legacy `_KDB.history`.
- Do not write foreign state.
- Rules to apply:
  - `state.mdc` - only owner state writes through reducer.
  - `module-public-api.mdc` - specialSingleSelect through public API only.
  - `error-handling.mdc` - caller/controller wraps boundary; this helper returns result or lets controller catch.

### D19. `sicht/createSichtController.js`

- Role: public API controller.
- Imports actions, reducer, selectors, runtime ensure/cleanup, map handoff, read availability, evaluate options, sync availability, delegate to singleSelect, commitConfirmedSicht.
- Public methods: `mount`, `destroy`, `dispatch`, `getState`.
- Disposed guard:
  - `mount` / `dispatch`: warn once and return false/undefined after disposal.
  - `getState`: return `undefined` after disposal.
  - `destroy`: idempotent.
- `mount`:
  - try/catch boundary;
  - ensure runtime;
  - dispatch `MOUNT_SUCCEEDED`;
  - schedule/evaluate option sync if tableData exists.
- `dispatch`:
  - try/catch boundary;
  - for `FILTER_DOCK_STATE_CHANGED` / `FILTER_DOCK_POPUP_READY`: map handoff, update meta, read/evaluate options, sync popup availability, delegate to singleSelect.
  - for `SINGLE_SELECT_COMMITTED`: call `commitConfirmedSicht`.
  - for `TABLE_DATA_CHANGED` / `SYNC_REQUESTED`: read/evaluate options and dispatch `SYNC_OPTIONS_EVALUATED`.
  - for `ERROR`: dispatch reducer error.
- `destroy`:
  - set disposed true first;
  - cleanup runtime;
  - dispatch `DESTROY`;
  - catch/log failures.
- Rules to apply:
  - `module-public-api.mdc` - single dispatch surface and disposed-state discipline.
  - `error-handling.mdc` - mandatory try/catch on named executables with contextual logs.
  - `runtime.mdc` - cleanup before reset.
  - `state.mdc` - owner writes only through reducer.
  - `amd.mdc` - no inline subfunctions inside public methods; helper functions at factory scope.

### D20. `sicht/__orchestratorSicht.js`

- Role: thin orchestrator.
- Imports initialState, selector config, createSichtController.
- Steps:
  1. Ensure `_KDB.state.filters`.
  2. Ensure `_KDB.runtime`, `_KDB.api`, `_KDB.elements.selectors`.
  3. Register `_KDB.elements.selectors.sicht = selectorConfig`.
  4. Initialize `_KDB.state.filters.sicht = initialState()` if missing.
  5. Create controller and assign `_KDB.api.sicht`.
  6. Return controller.
- Header comment declares lifecycle terms: `idle`, `ready`, `error`, `disposed`.
- Rules to apply:
  - `feature-structure.mdc` - thin orchestrator only.
  - `kdb-object.mdc` - allowed namespaces only.
  - `state.mdc` / `runtime.mdc` - initialize correct subtrees/buckets.

### D21. `KDB3/css/filters/sichtSingleSelect.css`

- Role: CSS for Sicht popup/options.
- Include minimal classes:
  - `.kdb-sicht-single-select ...`
  - `.kdb-sicht-option-disabled`
  - `.kdb-sicht-commit-in-progress`
- Hide `"Alle"` option only through a class/attribute pattern that the implementation applies; do not globally hide every text "Alle" in the app.
- Rules to apply:
  - `dom.mdc` / `naming.mdc` - CSS classes kebab-case with `kdb-` prefix.

### D22. Modify `filterDock/effects/dispatchSingleSelectHandoff.js`

- Extend `SUPPORTED_FILTER_TYPES` with `sicht: true`.
- Extend owner route map:
  - `apiKey: "sicht"`
  - `stateChanged: "sicht/filterDockStateChanged"`
  - `popupReady: "sicht/filterDockPopupReady"`
- Rename file only if already planned? No. Keep file name for minimal diff even though it now routes multiple owners.
- Rules to apply:
  - `module-public-api.mdc` - direct API to known owner.
  - `state.mdc` - no foreign writes.

### D23. Modify `filterDock/compat/resolveFilterCapabilities.js`

- Ensure existing filter type resolution recognizes upstream cascade / capabilities as `filterType: "sicht"`.
- Preserve existing singleSelect and specialSingleSelect behavior.
- Do not add Dienststelle behavior beyond existing filterDock classification.
- Rules to apply:
  - `feature-structure.mdc` - compat reader only; no orchestration.
  - `state.mdc` - no writes.

### D24. Modify `singleSelect/effects/commitConfirmedSelection.js`

- Add helper at factory scope `notifySichtCommit(_KDB, _handoffContext, _selection)`.
- If `_handoffContext.filterType === "sicht"` and `_KDB.api.sicht.dispatch` exists, dispatch:

```js
{
  type: "sicht/singleSelectCommitted",
  payload: {
    filterId: _handoffContext.filterId,
    filterKey: _handoffContext.filterKey,
    filterLabel: _handoffContext.filterLabel,
    filterScope: _handoffContext.filterScope,
    selection: {
      displayValue: _selection.displayValue,
      useValue: _selection.useValue
    },
    observedAt: Date.now()
  }
}
```

- Call it only after `_commitSelectionState.applyConfirmedState(...)` and only on successful commit, next to the existing `notifySpecialSingleSelectCommit` call.
- Do not change singleSelect behavior for `singleSelect` or `specialSingleSelect`.
- Rules to apply:
  - `module-public-api.mdc` - public API hook only.
  - `state.mdc` - no foreign writes.
  - `amd.mdc` - helper at factory scope, not nested.

### D25. Modify `KDB.js`

- Add AMD import for `./dashboard/filters/sicht/__orchestratorSicht.js`.
- Add factory parameter `_orchestratorSicht` in matching order.
- In `registerFeatureModules`, call `_orchestratorSicht(_KDB)` after `_orchestratorSingleSelect(_KDB)` and before `_orchestratorSpecialSingleSelect(_KDB)` or after both if dependency order requires; ensure `_KDB.api.sicht` exists before filterDock may route to it.
- In `mountFeatureModules`, call `_KDB.api.sicht.mount({})`.
- In `destroy`, call `destroyFeatureApi(this.api.sicht)` before `singleSelect` or near other filter APIs.
- Rules to apply:
  - `feature-structure.mdc` - KDB.js change limited to bootstrap wiring.
  - `kdb-object.mdc` - no new top-level namespaces.
  - `error-handling.mdc` - mandatory try/catch on named executables; lifecycle boundaries convert errors.

### D26. Modify `core/css/config/cssHrefList.js`

- Add `./v1/ext/KDB3/css/filters/sichtSingleSelect.css` near other filter CSS entries.
- Rules to apply:
  - `feature-structure.mdc` - config change only.

---

## Section E. Public API wiring

`_KDB.api.sicht` exposes exactly:

```js
{
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
}
```

No `read*` methods on `_KDB.api.sicht`. Selectors live in `sicht/state/selectors.js`.

---

## Section F. Behavior rules

1. `filterDock` routes `filterType: "sicht"` to `_KDB.api.sicht`.
2. `sicht` delegates generic popup and selection behavior to `_KDB.api.singleSelect`.
3. `singleSelect` notifies `sicht` only after confirmed successful commit.
4. `sicht` then:
   - updates `_KDB.state.filters.sicht`;
   - dispatches `specialSingleSelect/sichtChanged`;
   - pushes `filter_sicht` history if history service exists.
5. Pending selection never notifies `specialSingleSelect`.
6. `"Alle"` is hidden and no toggle-off is allowed.
7. `sicht` does not touch Dienststelle state or behavior.

---

## Section G. Acceptance criteria

AC1. Section A summaries are present before file writes.

AC2. All files in Section C exist or listed modifications are applied.

AC3. Every new JS file is AMD full-compact and has no ES module syntax.

AC4. `_KDB.api.sicht` exposes only `mount`, `destroy`, `dispatch`, `getState`.

AC5. `_KDB.state.filters.sicht` is the only state subtree written by new Sicht code.

AC6. No direct writes to `_KDB.state.filters.singleSelect`, `_KDB.state.filters.specialSingleSelect`, or future `_KDB.state.filters.dienststelle`.

AC7. `readSichtAvailabilityFromTableData.js` does not read `_KDB.state.tableData` directly; it uses `_KDB.services.tableData`.

AC8. `filterDock` routes `sicht/filterDockStateChanged` and `sicht/filterDockPopupReady`.

AC9. `singleSelect/effects/commitConfirmedSelection.js` dispatches `sicht/singleSelectCommitted` only after successful `filterType: "sicht"` commit.

AC10. `sicht` dispatches `specialSingleSelect/sichtChanged` only after `sicht/singleSelectCommitted`.

AC11. `filter_sicht` history step contains `old`, `new`, and `dependencies.specialSingleSelect` / `dependencies.dienststelle`.

AC12. `dependencies.specialSingleSelect` is read only via `_KDB.api.specialSingleSelect.getState()`.

AC13. `dependencies.dienststelle` remains `null`.

AC14. CSS uses `kdb-` classes and no broad global text selector for `"Alle"`.

AC15. `KDB.js` bootstrap wiring resolves imports and includes register/mount/destroy for `sicht`.

AC16. CSS load list includes `sichtSingleSelect.css`.

AC17. Anti-D1: every named executable, subscriber and async function has try/catch; public API methods (`mount`, `destroy`, `dispatch`) convert errors with contextual `console.error` / `console.warn`.

AC18. Anti-D2: `destroy` sets disposed first, then cleans runtime resources before resetting buckets; no resource is just nulled first.

AC19. Disposed-state discipline: public methods short-circuit after destroy per `module-public-api.mdc`; no throw from disposal guards.

AC20. No new events or `eventSubscribe.md` changes.

---

## Section H. Forbidden actions

The executing AI must not:

- Modify any file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`.
- Modify contract templates `_template.md` or `_executionSpecTemplate.md`.
- Modify legacy trees `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, or `laatsteOriginal/`.
- Create or modify `TEST/`.
- Introduce a new top-level `_KDB.*` namespace.
- Add events or event catalog entries.
- Add Dienststelle / hierarchy files or behavior.
- Import `singleSelect` internals from `sicht`.
- Read or write foreign runtime subtrees.
- Add behavior beyond `_____________KDB3API/contracts/sicht.md` and this spec.
- Commit, push, or change git config.

---

## Section I. Self-review checklist

Before reporting back, the executing AI must verify:

1. Every Section C path is created/modified.
2. File line counts stay under rule limits or deviation is reported.
3. Every public method has disposed guard.
4. Every named executable, subscriber and async function has try/catch; lifecycle boundaries convert errors.
5. Every runtime resource created has cleanup.
6. No direct `_KDB.state.tableData` reads.
7. No foreign `_KDB.state.filters.*` writes.
8. No direct imports of singleSelect internal files from sicht.
9. No events added.
10. No TEST or legacy edits.

---

## Section J. Reviewer handoff

The supervising AI will:

1. Verify Section A summaries.
2. Read every created/modified file.
3. Run `ReadLints` on touched files.
4. Cross-check every file against Section D and Section G.
5. Diff-walk legacy/reference behavior and confirm only approved rule-alignment / redesign deltas occurred.
6. Confirm bootstrap imports resolve.

---

## Section L. Reporting template

The executing AI final report must include:

1. **Pre-flight echo** - the 14 numbered summaries from Section A.
2. **File checklist** - every created/modified path, line count, and `matches spec | deviation`.
3. **Mapping confirmation** - one line per mapping-table row saying implemented/deferred.
4. **Acceptance criteria** - AC1-AC20 pass/fail.
5. **Deviations** - file, deviation, reason, rule consulted.
6. **Open questions** - only concrete blockers not covered by the spec.

---

> End of execution spec. The executing AI must not proceed without Section A echo.

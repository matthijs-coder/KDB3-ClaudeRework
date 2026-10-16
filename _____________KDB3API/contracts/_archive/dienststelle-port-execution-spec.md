# Execution Spec: `dienststelle` (`direct port`)

> Mechanical execution spec for delegated implementation after CP-1 approval of `_____________KDB3API/contracts/dienststelle.md`.
> Write directly to the production tree. No `TEST/`, no browser harness.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/dienststelle.md`
**Phase:** `direct port`
**Authoring AI:** GPT-5.5, 2026-05-26
**Executing AI:** `<pending>`
**Reviewer:** `user / supervising AI`

---

## Section A. Pre-flight

Read these files first and echo one specific sentence for each:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/dienststelle.md`
13. This execution spec.

The echo must also confirm:

- DIRECT PORT: rule-alignment only inside approved CP-1 scope.
- `_______KDB3/` is not a behavioral or copy source.
- Current production integration points in `_____________KDB3API` must be inspected before hook edits.
- Known temporary behavior gap: REDESIGN2 widget downstream propagation is not preserved in this tranche.
- Future widget downstream boundary is `_KDB.api.visualizationWidget.dispatch(...)` after that owner API exists; until then, emit the temporary tagged log `[dienststelle.visualizationWidget.dispatch]` after the same successful trigger points. No direct widget writes.
- Known temporary behavior gap: parameter-set/writeback restore is not supported in this tranche.
- No Dienststelle-owned popup observer may be added. Repeated popup display sync must use the approved filterDock-owned `popupDisplayResync` observer/re-dispatch boundary.

## Section B. Immutable Decisions

| Topic | Decision |
|---|---|
| Production target | `_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/` |
| Public API | `_KDB.api.dienststelle = { mount, destroy, dispatch, getState }` |
| State owner | `_KDB.state.filters.dienststelle` |
| Runtime owner | `_KDB.runtime.dienststelle` |
| Internal filter key | `activeFilterKey`, e.g. `Dienststelle_BW` / `Dienststelle_DEZPV` |
| Visible label | `visibleFilterLabel: "Dienststelle"`; UI-only label after DOM sanitizing, not a Cognos lookup key |
| Sicht value | `activeSichtValue: "BW" | "DEZPV"` |
| Selection value | `{ displayValue: string, useValue: string, source: "cognos" | "default" | "historyReplay" | "user" }` |
| Display sanitizing | Variant-gated: BW disabled, DEZPV enabled; legacy `#` / `|` / `" - "` transform for popup and committed display only |
| Filterdock header name | Both BW and DEZPV show `visibleFilterLabel` (`Dienststelle`) in `.wa-filterDock-filterName`; technical `[data-id]` / `activeFilterKey` remain unchanged |
| FilterDock route | `dienststelle/filterDockStateChanged`, `dienststelle/filterDockPopupReady` |
| FilterDock popup resync | Dienststelle route opts in with `needsPopupDisplayResync: true`; filterDock helper/runtime names use `popupDisplayResync`, not Dienststelle-specific observer names |
| FilterDock filters ready | Dienststelle route opts in with `needsFilterDockFiltersReady: true`; readiness means at least one `.filterItemWrapper` exists inside the filterDock root |
| Sicht route | `dienststelle/sichtChanged` |
| History step | `filter_dienststelle` |
| Future widget downstream | On successful user OK, Sicht-driven default/reconcile, or history replay, call future `_KDB.api.visualizationWidget.dispatch(...)` when available; otherwise log `[dienststelle.visualizationWidget.dispatch]`. Consumers use `_KDB.api.dienststelle.getState()` or serializable payload |
| Bootstrap | Dienststelle must be registered and mounted before Sicht startup dispatch can fire. Startup Sicht dispatch must not be lost. |

## Section C. Files

Create these files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/__orchestratorDienststelle.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/createDienststelleController.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/config/actions.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/config/dienststelleDefinitions.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/initialState.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/createDienststelleReducer.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/state/selectors.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/mapFilterDockHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/syncDienststelleFromSicht.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/reconcileConfirmedDienststelle.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/readDefaultDienststelleValue.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/awaitDienststelleDataReady.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/resolveDienststelleDataKey.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/isDienststelleValueAvailable.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/effects/applyDienststelleDefault.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/sanitizeDienststelleVisibleLabel.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/sanitizeDienststelleFilterDockName.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/applyDienststelleFilterDockNameDisplay.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleFilterDockNames.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/view/syncDienststelleViewFromState.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/buildCommittedStep.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/readDependencySnapshot.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/applyDienststelleHistoryReplay.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/createDienststelleHistoryReplayHandler.js
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/history/stageDienststelleHistoryReplayHandler.js
```

Modify only these existing files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/effects/dispatchFilterHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/commitConfirmedSicht.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/history/readDependencySnapshots.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/history/applySichtHistoryReplay.js
_____________KDB3API/KDB3/js/core/services/collectReplayHandlers.js
_____________KDB3API/KDB3/js/KDB.js
```

Stop if a listed hook file is missing or materially different from the described pattern.

## Section D. New File Specs

All production files use AMD full-compact form, one `define([...], function (...) { ... })`, one returned value, no ES modules, no CommonJS, no nested function definitions inside entry functions or callbacks.

### `config/actions.js`

- **Imports:** none.
- **Return:** object with constants:
  - `MOUNT_READY: "dienststelle/mountReady"`
  - `FILTER_DOCK_STATE_CHANGED: "dienststelle/filterDockStateChanged"`
  - `FILTER_DOCK_POPUP_READY: "dienststelle/filterDockPopupReady"`
  - `FILTER_DOCK_FILTERS_READY: "dienststelle/filterDockFiltersReady"`
  - `SICHT_CHANGED: "dienststelle/sichtChanged"`
  - `SELECTION_OBSERVED: "dienststelle/selectionObserved"`
  - `DEFAULT_APPLIED: "dienststelle/defaultApplied"`
  - `HISTORY_REPLAY_REQUESTED: "dienststelle/historyReplayRequested"`
  - `HISTORY_REPLAY_APPLIED: "dienststelle/historyReplayApplied"`
  - `SYNC_REQUESTED: "dienststelle/syncRequested"`
  - `ERROR: "dienststelle/error"`
  - `DESTROY: "dienststelle/destroy"`
- **Rules:** `amd.mdc`, `naming.mdc`; no event constants.

### `config/dienststelleDefinitions.js`

- **Imports:** none.
- **Return:** object:
  ```js
  {
    BW: {
      activeSichtValue: "BW",
      activeFilterKey: "Dienststelle_BW",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_bw_default",
      hierarchyTableKey: "dienststelle_bw_hierarchy",
      shouldSanitizeOptionDisplay: false
    },
    DEZPV: {
      activeSichtValue: "DEZPV",
      activeFilterKey: "Dienststelle_DEZPV",
      visibleFilterLabel: "Dienststelle",
      defaultTableKey: "dienststelle_dezpv_default",
      hierarchyTableKey: "dienststelle_dezpv_hierarchy",
      shouldSanitizeOptionDisplay: true
    }
  }
  ```
- **Rules:** table key mapping and display-sanitizing variant flags live only here. Do not spread `DEZPV` hardcoding through effects/views.

### `state/initialState.js`

- **Imports:** none.
- **Return:** `initialState`.
- **Helpers at factory scope:** `createEmptyResolution`, `createSelectionValue`.
- **State:** root has `lifecycle`, `activeSichtValue`, `activeFilterKey`, `visibleFilterLabel`, table keys, `byFilter`, `resolution`, `defaults`, `replay`, `meta`, `errorCode`, `errorMessage`.
- **Selection arrays:** always contain `{ displayValue, useValue, source }`.
- **Rules:** serializable state only; lifecycle subset `idle`, `ready`, `error`, `disposed`.

### `state/createDienststelleReducer.js`

- **Imports:** `./initialState.js`.
- **Factory parameter:** `_initialState`.
- **Return:** `createDienststelleReducer`.
- **Helpers:** `clone`, `ensureFilterState`, `ensurePageScope`, `copyValues`, action-specific reducers.
- **Actions:** mount ready, handoff recorded, Sicht context set, selection observed, default applied, history replay applied, error, destroy.
- **Rules:** pure reducer only; no DOM/Cognos/events/async.

### `state/selectors.js`

- **Imports:** none.
- **Return:** object with `readDienststelleState`, `readActiveDienststelleContext`, `readDienststelleResolution`, `readDienststelleSnapshot`, `readDienststelleFilterState`.
- **Behavior:** clone snapshots.
- **Rules:** published selector registry; no writes.

### `effects/resolveDienststelleDataKey.js`

- **Imports:** `../config/dienststelleDefinitions.js`.
- **Parameter:** `_definitions`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_activeSichtValue)`.
- **Behavior:** return cloned config entry or `null`.
- **Cognos identity rule:** returned `activeFilterKey` is the Cognos `getItemName()` lookup key; `visibleFilterLabel` is UI-only and must not be used for host lookup.

### `effects/mapFilterDockHandoff.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_handoff)`.
- **Behavior:** return `null` unless `filterType === "dienststelle"`; normalize filter identity, scope, interaction, popup, config, capabilities.
- **Forbidden:** `_KDB.runtime.filterDock`, DOM reads.

### `effects/readDefaultDienststelleValue.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _defaultTableKey)`.
- **Behavior:** use `_KDB.services.tableData.readRows`; parse first usable cell; return `{ displayValue, useValue, source: "default" }` or `null`.
- **Forbidden:** direct `_KDB.state.tableData`, fake defaults.

### `effects/awaitDienststelleDataReady.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _keys, _options)`.
- **Behavior:** prefer `tableDataService.waitForRows`; otherwise bounded read-method check returning a Promise.
- **Forbidden:** unbounded polling, uncleared timers.

### `effects/isDienststelleValueAvailable.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _hierarchyTableKey, _selectionValue)`.
- **Behavior:** read hierarchy rows through `tableDataService.readRows`; match `useValue` first, `displayValue` second.
- **Forbidden:** KDB2 `optionsFlat`.

### `effects/applyDienststelleDefault.js`

- **Imports:** `./readDefaultDienststelleValue.js`, `./isDienststelleValueAvailable.js`.
- **Parameters:** `_readDefaultValue`, `_isValueAvailable`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _context)`.
- **Behavior:** read/validate default; apply through `_KDB.cognosAPI.filters.replaceFilterContext` only when an approved filter API is present in context; return applied value or `null`.
- **Forbidden:** inventing filter API lookup.

### `effects/reconcileConfirmedDienststelle.js`

- **Imports:** `./resolveDienststelleDataKey.js`, `./applyDienststelleDefault.js`.
- **Parameters:** `_resolveDataKey`, `_applyDefault`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _dispatchInternal, _context)`.
- **Steps:** resolve active definition; read confirmed host values if available; respect Cognos-native pageContext restore; default missing scopes; never copy values between tabs; dispatch owner state actions; return snapshot.
- **Host lookup rule:** all Cognos filter API lookup and replay apply paths must use `activeFilterKey` (`Dienststelle_BW` / `Dienststelle_DEZPV`), never `visibleFilterLabel` (`Dienststelle`).
- **Active switching rule:** `dienststelle/sichtChanged` updates the owner context via `activeSichtValue -> dienststelleDefinitions -> activeFilterKey`; filterDock confirm uses the last known owner context and must not re-derive host identity from the UI label.
- **CP-4.1 inactive rule:** inactive Dienststelle variants are normally cleared to empty Cognos values, hidden in the UI, and ignored by handoff. Do not remove/recreate inactive variants as the normal Sicht-switch path because that changes filterDock position and misses tab scopes.
- **Known blocker:** if current production cannot provide confirmed values/filter API, report blocker; do not add KDB2 polling/click forwarding.

### `effects/syncDienststelleFromSicht.js`

- **Imports:** `./resolveDienststelleDataKey.js`, `./reconcileConfirmedDienststelle.js`.
- **Parameters:** `_resolveDataKey`, `_reconcile`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _dispatchInternal, _payload)`.
- **Behavior:** normalize `activeSichtValue`, `selection`, `source`; dispatch context update; call reconcile.
- **Inactive variant behavior:** before/around active reconcile, ensure every non-active Dienststelle variant is empty, hidden, and protected by handoff guard. Both Cognos shells may remain present; state must not claim `removed` unless Cognos absence is verified.
- **Fallback:** may read `_KDB.api.sicht.getState()` only if payload lacks value.

### `view/sanitizeDienststelleVisibleLabel.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_value)`.
- **Behavior:** pure legacy-equivalent visible display sanitizer:
  - if display text contains no `#`, return original display text unchanged;
  - after first `#`, trim; if empty, return original display text;
  - if `|` exists, use text after first `|` when non-empty;
  - only when `|` was used, if `" - "` exists, use text after first `" - "` when non-empty;
  - return final trimmed display text.
- **Scope:** display text only; never mutate Cognos `useValue`, `activeFilterKey`, `visibleFilterLabel`, host lookup, or history identity.
- **Forbidden:** DOM, runtime, observer.

### `view/sanitizeDienststelleFilterDockName.js`

- **Imports:** `../config/dienststelleDefinitions.js`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_activeFilterKey)`.
- **Behavior:** return the matching definition's `visibleFilterLabel` for `Dienststelle_BW` / `Dienststelle_DEZPV`; otherwise return `null`.
- **Scope:** filterdock header name only. This rule applies to BW and DEZPV and is not gated by `shouldSanitizeOptionDisplay`.
- **Forbidden:** DOM, runtime, Cognos lookup, `data-id` mutation.

### `view/applyDienststelleFilterDockNameDisplay.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_wrapperEl, _targetLabel, _selectors)`.
- **Behavior:** validate that the wrapper contains a technical host node with `[data-id="Dienststelle_BW"]` or `[data-id="Dienststelle_DEZPV"]`; set only `.wa-filterDock-filterName` `textContent` and `title` to `_targetLabel` when different; return changed boolean.
- **Forbidden:** `[data-id]`, `activeFilterKey`, `filterId`, `filterKey`, Cognos value/useValue, aria-label, state, runtime.

### `view/syncDienststelleFilterDockNames.js`

- **Imports:** `../config/dienststelleDefinitions.js`, `./sanitizeDienststelleFilterDockName.js`, `./applyDienststelleFilterDockNameDisplay.js`, scoped DOM helper/selectors as needed.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB)`.
- **Behavior:** iterate Dienststelle definitions across the supported filterDock buckets (`global`, `pageContext`); use scope-aware wrapper lookup; apply `visibleFilterLabel` to each wrapper header name; return a summary `{ didSync, wrappersUpdated }`.
- **Triggers:** wrapper class sync, Sicht change/reconcile view sync, popup-ready view sync, `dienststelle/filterDockFiltersReady`, and other existing Dienststelle view sync paths where wrappers may have rendered.
- **Forbidden:** new Dienststelle-owned observer, `_KDB.runtime.filterDock`, unscoped first-match document lookup, filterDock string transform, visualizationWidget dispatch changes.

### `view/syncDienststelleViewFromState.js`

- **Imports:** `./sanitizeDienststelleVisibleLabel.js`.
- **Parameter:** `_sanitize`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB, _handoff)`.
- **Behavior:** resolve the active Dienststelle definition; if `shouldSanitizeOptionDisplay !== true`, return `{ didSync: false, reason: "sanitizingDisabled" }`. For DEZPV, apply `_sanitize` to approved display surfaces:
  - popup option text nodes available from approved popup context/selectors;
  - popup option `aria-label` values as source text only; raw `aria-label` may remain unchanged;
  - popup option `title` values as display/tooltip text when present;
  - committed / closed filter display text inside the active Dienststelle wrapper.
- **Triggers:** may be called from popup-ready, confirmed commit/reconcile/default apply, Sicht change, and history replay paths.
- **Manual confirm display rule:** after a `filterDock` confirm/OK handoff, committed display sync must use the mapped handoff scope (`filterScope`, `scopeType`, `scopeId`) and may defer with a bounded `requestAnimationFrame` sequence so Cognos can finish writing the closed filter text.
- **No-handoff fallback:** when no scope handoff exists, committed display sync may inspect both supported dock buckets for the active `activeFilterKey` instead of assuming `"global"`.
- **Observer policy:** repeated Cognos hierarchy popup updates are handled by filterDock's generic `popupDisplayResync` observer/re-dispatch path. Dienststelle owns the transform and sync action only; do not add a Dienststelle-owned observer.
- **Forbidden:** new Dienststelle-owned observer, `_KDB.runtime.filterDock`, unscoped global document scan, `useValue` mutation.

### `history/buildCommittedStep.js`

- **Imports:** none.
- **Return:** `__controller`.
- **Entry:** `function __controller(_oldSnapshot, _newSnapshot, _timestamp)`.
- **Return:** `{ key: "filter_dienststelle", timestamp, old, new }`.

### `history/readDependencySnapshot.js`

- **Imports:** `../state/selectors.js`.
- **Parameter:** `_selectors`.
- **Return:** `__controller`.
- **Entry:** `function __controller(_KDB)`.
- **Behavior:** return `_selectors.readDienststelleSnapshot(_KDB)` or `null`.

### `history/applyDienststelleHistoryReplay.js`

- **Imports:** `../config/actions.js`.
- **Parameter:** `_actions`.
- **Return:** `{ apply: apply }`.
- **Entry:** `async function apply(_KDB, _targetValue, _step, _ctx)`.
- **Behavior:** require `step.key === "filter_dienststelle"`; dispatch `_KDB.api.dienststelle.dispatch({ type: _actions.HISTORY_REPLAY_REQUESTED, payload: { targetValue, step, ctx } })`; return boolean.

### `history/createDienststelleHistoryReplayHandler.js`

- **Imports:** `./applyDienststelleHistoryReplay.js`.
- **Parameter:** `_applyReplay`.
- **Return:** `createDienststelleHistoryReplayHandler`.
- **Entry:** `function createDienststelleHistoryReplayHandler(_KDB)`.
- **Return object:** `{ apply: function (...) { ... } }`, matching `sicht/history/createSichtHistoryReplayHandler.js`.

### `history/stageDienststelleHistoryReplayHandler.js`

- **Imports:** `./createDienststelleHistoryReplayHandler.js`.
- **Parameter:** `_createHandler`.
- **Return:** `stageDienststelleHistoryReplayHandler`.
- **Entry:** `function stageDienststelleHistoryReplayHandler(_KDB)`.
- **Behavior:** store handler at `_KDB.runtime.dienststelle.historyReplayHandlerContribution`.

### `__orchestratorDienststelle.js`

- **Imports:** `./state/initialState.js`, `./createDienststelleController.js`, `./history/stageDienststelleHistoryReplayHandler.js`.
- **Parameters:** `_initialState`, `_createDienststelleController`, `_stageHistoryReplayHandler`.
- **Return:** `__orchestrator`.
- **Entry:** `function __orchestrator(_KDB, _options)`.
- **Steps:** ensure `_KDB.state.filters`, `_KDB.runtime`, `_KDB.api`; initialize state/runtime if missing; stage history handler; create controller; assign `_KDB.api.dienststelle`; return controller.
- **Lifecycle comment:** `idle, ready, error, disposed`.
- **Rules:** thin orchestrator; no business logic.

### `createDienststelleController.js`

- **Imports:** `./config/actions.js`, `./state/createDienststelleReducer.js`, `./state/selectors.js`, `./effects/mapFilterDockHandoff.js`, `./effects/syncDienststelleFromSicht.js`, `./effects/reconcileConfirmedDienststelle.js`, `./view/syncDienststelleViewFromState.js`, `./view/syncDienststelleFilterDockNames.js`.
- **Parameters:** `_actions`, `_createReducer`, `_selectors`, `_mapHandoff`, `_syncFromSicht`, `_reconcile`, `_syncView`.
- **Return:** `createDienststelleController`.
- **Entry:** `function createDienststelleController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Helpers:** `dispatchInternal`, `warnDisposed`, `ensureRuntime`, `cleanupRuntime`.
- **Dispatch branches:** filterDock state, popup ready, filters ready, Sicht changed, history replay, sync, error.
- **Rules:** disposed guards, try/catch on public boundaries, cleanup order, no mixed API.

## Section E. Existing Hook Edits

### `filterDock/effects/dispatchFilterHandoff.js`

Only add:

```js
dienststelle: true
```

to `SUPPORTED_FILTER_TYPES`, and:

```js
dienststelle: {
  apiKey: "dienststelle",
  actionTypes: {
    stateChanged: "dienststelle/filterDockStateChanged",
    popupReady: "dienststelle/filterDockPopupReady",
    filtersReady: "dienststelle/filterDockFiltersReady"
  },
  needsFilterDockFiltersReady: true,
  needsPopupDisplayResync: true
}
```

to `OWNER_ROUTE_MAP`.

Do not add per-filter or per-scope readiness lookup in `filterDock`. `needsFilterDockFiltersReady` means only that the owner receives a one-shot lifecycle notification after the dock root contains at least one `.filterItemWrapper`.

### `filterDock` filters-ready delta

Approved minimal filterDock changes for this delta:

- detect `filtersReady` when the filterDock root contains at least one `.filterItemWrapper`;
- run the detection immediately after dock observer mount and from the existing coalesced dock-observer evaluation;
- store only serializable readiness metadata in filterDock state, such as `{ filtersReady: true, filtersReadyAt, filterWrapperCount }`;
- re-dispatch only to route-map owners with `needsFilterDockFiltersReady: true` and an `actionTypes.filtersReady` value;
- payload is serializable, for example `{ source: "filterDockFiltersReady", observedAt, filterWrapperCount }`;
- do not mutate owner DOM, do not implement Dienststelle label rules, and do not read/write `_KDB.state.filters.dienststelle`.

No KDB.js, Sicht, history, visualizationWidget, or eventSubscribe changes are approved for this delta.

### `sicht/effects/commitConfirmedSicht.js`

Current imports remain unchanged unless a helper file is explicitly chosen; preferred implementation adds a factory-scope `notifyDienststelle`.

After `_notifySpecialSingleSelect(_KDB, nextSelection);`, dispatch:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/sichtChanged",
  payload: {
    activeSichtValue: nextSelection.displayValue,
    selection: {
      displayValue: nextSelection.displayValue,
      useValue: nextSelection.useValue
    },
    source: isStartupDefault ? "startup" : isHistoryReplay ? "historyReplay" : "user",
    observedAt: timestamp
  }
});
```

Guard missing API, but final bootstrap must make startup notification non-lossy.

### `sicht/history/readDependencySnapshots.js`

Replace `dienststelle: null` with a clone from `_KDB.api.dienststelle.getState()` when available, else `null`. Do not read `_KDB.state.filters.dienststelle` directly.

### `sicht/history/applySichtHistoryReplay.js`

After Sicht replay dispatch succeeds, if `step.dependencies.dienststelle` exists and `_KDB.api.dienststelle.dispatch` exists, dispatch `dienststelle/historyReplayRequested` with `{ targetValue: step.dependencies.dienststelle, step, source: "sichtHistoryReplay" }`. Do not fail Sicht replay if dependency is absent.

### `core/services/collectReplayHandlers.js`

Add:

```js
var dienststelleRt = _KDB.runtime && _KDB.runtime.dienststelle;
var dienststelleContribution =
  dienststelleRt && dienststelleRt.historyReplayHandlerContribution;
addContribution(map, "filter_dienststelle", dienststelleContribution);
```

Do not alter existing keys.

### `KDB.js`

Keep dependency/parameter order one-to-one.

Required ordering:

- Add dependency `./dashboard/filters/dienststelle/__orchestratorDienststelle.js` after `singleSelect` and before `sicht`.
- Add parameter `_orchestratorDienststelle` after `_orchestratorSingleSelect` and before `_orchestratorSicht`.
- In `registerFeatureModules`, call `_orchestratorDienststelle(_KDB);` after `_orchestratorSingleSelect(_KDB);` and before `_orchestratorSicht(_KDB);`.
- In `mountFeatureModules`, call `_KDB.api.dienststelle.mount({});` after `_KDB.api.singleSelect.mount({});` and before `_KDB.api.sicht.mount({});`.
- In `destroy`, destroy in this relative order: `sicht`, `dienststelle`, `singleSelect`.

No unrelated bootstrap refactor.

## Section F. Acceptance Criteria

1. All Section C new files exist.
2. Only listed existing files are modified.
3. All target paths use `_____________KDB3API/KDB3/js/...`.
4. Every new file is AMD full-compact.
5. `KDB.js` AMD dependency and factory parameter order is correct.
6. `_KDB.api.dienststelle` exposes only `mount`, `destroy`, `dispatch`, `getState`.
7. Public methods have disposed-state guards.
8. `mount`, `destroy`, `dispatch` and other named executables have try/catch; lifecycle methods convert errors.
9. `destroy` sets disposed flag before cleanup.
10. Selection arrays contain only `{ displayValue, useValue, source }` objects.
11. `activeFilterKey`, `visibleFilterLabel`, `activeSichtValue` are distinct.
12. Cognos host lookup uses `activeFilterKey`, not `visibleFilterLabel`.
13. Inactive Dienststelle variants are cleared, hidden, and ignored by handoff; remove/recreate is not the normal Sicht-switch path.
14. If hidden empty shells remain present, owner state does not label them `removed`.
15. `shouldSanitizeOptionDisplay` gates display sanitizing: DEZPV true, BW false.
16. DEZPV popup visible text, optional title display, and committed display use the legacy `#` / `|` / `" - "` display transform; raw `aria-label` may remain as source text, and Cognos values/identity are unchanged.
17. `.wa-filterDock-filterName` shows `Dienststelle` for both `Dienststelle_BW` and `Dienststelle_DEZPV`.
18. Filterdock header-name sync mutates only `.wa-filterDock-filterName` `textContent` and `title`; `[data-id]`, `activeFilterKey`, `filterId`, `filterKey`, Cognos values, and handoff identity remain unchanged.
19. Header-name sync is scope-aware across global and pageContext buckets and is not a blind first-match document write.
20. FilterDock observes batch-level filters readiness when at least one `.filterItemWrapper` exists inside the dock root.
21. FilterDock filters-ready is not per filter id, not per scope, and does not inspect Dienststelle definitions or mutate `.wa-filterDock-filterName`.
22. `dienststelle/filterDockFiltersReady` triggers idempotent Dienststelle header-name sync without reading `_KDB.runtime.filterDock`.
23. No Dienststelle code reads `_KDB.runtime.filterDock`.
24. No Dienststelle code writes foreign state.
25. FilterDock route map adds Dienststelle only and uses explicit `needsFilterDockFiltersReady` / `needsPopupDisplayResync` capabilities.
26. Manual Dienststelle confirm/OK uses the handoff scope for committed display sync and does not rely on popup observer cleanup.
27. Sicht notifies Dienststelle after confirmed commit/startup/replay.
28. Dienststelle is mounted before Sicht startup dispatch can fire.
29. Sicht dependency snapshot reads Dienststelle through public API only.
30. History registers `filter_dienststelle`.
31. No Dienststelle-owned popup observer exists; repeated popup mutation handling is filterDock-owned `popupDisplayResync` re-dispatch only.
32. No event is emitted and `eventSubscribe.md` is untouched.
33. Parameter-set/writeback restore is absent and reported as known temporary behavior gap.
34. Widget downstream placeholder emits a serializable payload after successful user OK, Sicht-driven default/reconcile, and history replay: use `_KDB.api.visualizationWidget.dispatch(...)` when available, otherwise `console.info("[dienststelle.visualizationWidget.dispatch]", payload)`.
35. No KDB2 savedSettings/tree/polling code is ported.
36. `ReadLints` is clean on all new/modified files.
37. Static AMD import inspection passes.

## Section G. Forbidden Actions

Do not write under `TEST/`; do not edit legacy trees; do not read/use `_______KDB3/` as behavioral or copy source; do not modify rules/templates/authority docs; do not edit `eventSubscribe.md`; do not add a Dienststelle-owned popup observer; do not add widget direct writes; do not treat missing `_KDB.api.visualizationWidget` as an error while the placeholder log is active; do not implement parameter-set/writeback restore, BW old-to-new map, KDB2 savedSettings/tree, or KDB2 OK forwarding/polling; do not broaden hook edits; do not commit/push/change git config.

## Section H. Reporting Template

Final executing-AI report must include:

1. Pre-flight echo.
2. File checklist with line counts.
3. Exact hook edits.
4. AMD import resolution check.
5. Acceptance checklist pass/fail.
6. Known temporary behavior gaps: widget downstream and parameter-set/writeback restore.
7. Blockers/deviations.

## Section I. CP-2 Reviewer Checklist

Reviewer must read every changed file, run `ReadLints`, verify public API/disposed guards, verify cleanup order, inspect `KDB.js` order, confirm hook edits are minimal, confirm no observer/event/widget direct writes, diff-walk REDESIGN2 mapping, and confirm deferred gaps are reported rather than silently replaced.

---

End of execution spec.

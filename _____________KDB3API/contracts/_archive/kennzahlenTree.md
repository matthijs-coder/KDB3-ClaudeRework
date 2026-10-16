# Module Contract: `kennzahlenTree` (archived, superseded by `metricsTree`)

> Archived during the final docs pass. The Kennzahlen tree shipped as `dashboard/metricsTree/` (`_KDB.api.metricsTree`, `_KDB.state.metricsTree`); the `kennzahlenTree` module and the file tree below never existed in production. Living pointer: `contracts/metricsTree.md`.

> CP-1 draft for a DIRECT PORT from REDESIGN2 legacy into the production tree.
> No production code may be generated until this contract is approved.

---

**Status:** `Approved`
**Owner module / service:** `kennzahlenTree`
**Type:** `feature module`
**Authoring AI:** GPT-5.5, 2026-05-16
**Reviewed by:** user, CP-1 approved 2026-05-16
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Source:

```txt
legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/
```

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/kennzahlenTree/
```

This is a direct port: preserve REDESIGN2 behavior and change only what the rules force. No `TEST/` sandbox, no browser harness, no bootstrap registration in `KDB.js` unless CP-1 explicitly changes that.

## 1. Legacy Evidence

| Legacy file | Evidence used |
|---|---|
| `legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/__kennzahlenTreeOrchestrator.js` | Async tree pipeline: resolve container, avoid duplicate pending render, build state, render jsTree blocks, bind drag/drop, resolve readiness. |
| `legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/buildKennzahlenTreeState.js` | Builds per-source tree entries from `_KDB.data.hierarchies.byName`, `_KDB.properties.kennzahlenTreePropObj`, `_KDB.properties.kennzahlenTablesPropObj`; filters by `Freigabe`; creates group and leaf jsTree nodes. |
| `legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/renderKennzahlenTrees.js` | Renders one search-enabled jsTree block per source, uses jQuery + jsTree, creates search input/icon, waits for `ready.jstree`, records render time. |
| `legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/bindKennzahlenTreeDragDrop.js` | Makes leaf anchors draggable and calls legacy drag/drop API with payload fields `code`, `display`, `title`, `langtext`, `kennzahlenTable`, `originId`, `draggedElementType`. |
| `_______REDESIGN2/__savedProperties/kennzahlenTreePropId.js` | Confirms configured per-source path columns: `Gruppe1`, `Gruppe2`, `Gruppe3`. |
| `_______REDESIGN2/__savedProperties/kennzahlenTablesPropId.js` | Confirms per-source table mappings for `code`, `kurztext`, `hardcoded`, `parentCode`, `URL`. |
| `legacy-redesign2:js/base/tasks/init/setupStatePromises/steps/initializeKennzahlenTreeState.js` | Shows legacy state shape and rule violations to align: `readyPromise`, `pendingRenderPromise`, and listener arrays live in state in legacy but must move to runtime. |
| `legacy-redesign2:js/dashboard/canvas/kdbControl/createControlElementsRegistry.js` | Shows the legacy Kennzahlen mount region; production kdbControl currently exposes it as `#kdb-control_metrics_container`. |

Production evidence:

- `_____________KDB3API/KDB3/js/dashboard/kennzahlenTree/` does not exist yet.
- `_____________KDB3API/KDB3/js` currently has no `dragDrop` module or `startDrag` / `finishDrag` public API.
- `_____________KDB3API/KDB3/js/KDB.js` currently registers and mounts `header`, `footer`, and `kdbControl`; `kennzahlenTree` bootstrap registration is not present and is deferred by this contract.

## 2. Purpose

`kennzahlenTree` renders Kennzahlen hierarchy data as one searchable jsTree per configured source. It preserves the REDESIGN2 behavior of deriving group/leaf tree nodes from hierarchy rows, filtering unreleased rows for non-superusers, rendering searchable tree blocks, and preparing the same leaf drag payload shape. **Production `metricsTree` SuperUser source (2026-09-02):** [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md) Slice B — do not read `_KDB.superUser`.

The direct port does not introduce new selection semantics, new fact-events, widget binding, filter writes, launchpad writes, or Cognos mutations. Those were not present in the legacy source tranche and would be behavior changes.

## 3. Ownership

- Canonical state subtree: `_KDB.state.kennzahlenTree`.
- Canonical writer: `kennzahlenTree` only, through its controller/reducer flow.
- Foreign-write paths: none.
- Required architecture follow-up after CP-1 approval: add `_KDB.state.kennzahlenTree` to `stateOwnership.md` with canonical writer `kennzahlenTree` if this direct port is accepted.

Initial state shape:

```js
_KDB.state.kennzahlenTree = {
  lifecycle: "idle",
  bySource: {},
  sourceOrder: [],
  hasRenderableData: false,
  lastBuildAt: 0,
  lastRenderedAt: 0,
  readyResolvedAt: 0,
  errorCode: null,
  errorMessage: null
};
```

Per-source state shape:

```js
_KDB.state.kennzahlenTree.bySource[sourceKey] = {
  sourceKey: sourceKey,
  title: sourceKey,
  rowCount: 0,
  nodes: [],
  hasRenderableData: false,
  treeConfig: {},
  dataShape: []
};
```

`nodes` are serializable jsTree-compatible data. They may contain leaf attributes such as `code`, `display`, `langtext`, `title`, `kennzahlenTable`, `draggType`, and `draggedElementType`; they must not contain DOM nodes, jQuery objects, functions, promises, plugin instances, listeners, or AbortControllers.

Lifecycle subset: `idle`, `loading`, `ready`, `error`, `disposed`.

## 4. Runtime

- Owner namespace: `_KDB.runtime.kennzahlenTree`.
- Cleanup trigger: `destroy()`.

| Bucket | Shape / role |
|---|---|
| `domRefs` | Mount root, module root, per-source wrapper refs, tree elements, search input refs, and search icon refs owned by this module. |
| `listeners` | Non-abortable listener cleanup descriptors only when needed for jQuery/jsTree handlers. |
| `subscriptions` | Event-bus unsubscribe handles; expected empty in this direct port because legacy subscribes to no `_KDB.events`. |
| `abortControllers` | DOM listener scopes where native listener APIs are used. |
| `pendingPromises` | `render` / `ready` / data-wait promises moved out of legacy state. |
| `adapters` | Optional runtime handle for an injected drag/drop adapter if CP-1 chooses to preserve active drag/drop in this tranche. |

Cleanup order: set disposed guard, abort controllers, unsubscribe subscriptions, remove jQuery/jsTree handlers, destroy jsTree plugin instances, clear pending runtime promises, detach/empty owned DOM, then reset `_KDB.runtime.kennzahlenTree` buckets. Runtime must not be nulled before cleanup.

## 5. Public API

- Surface: `_KDB.api.kennzahlenTree`.
- Style: `dispatch + reducer`, matching the feature-module default.
- Motivation: the module has lifecycle actions, build/render actions, error handling, and future external integration pressure; dispatch keeps state mutation behind one owner path.

```js
_KDB.api.kennzahlenTree = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Starts the legacy-equivalent async build/render/bind pipeline against `options.rootEl` or a configured selector; returns a `Promise<boolean>` to preserve the legacy orchestrator's readiness semantics. |
| `destroy()` | Idempotent teardown; sets `_isDisposed = true` before cleanup and dispatches the disposed transition. |
| `dispatch(action)` | Sole mutation path for `_KDB.state.kennzahlenTree`; no mixed named commands. |
| `getState()` | Coarse snapshot of `_KDB.state.kennzahlenTree`; granular reads use selectors. |

Disposed-state discipline follows `module-public-api.mdc`: after destroy, `getState()` returns `undefined`, `mount()`/`dispatch()`/`destroy()` are guarded no-ops with `console.warn` where applicable, and async in-flight work ignores stale results.

## 6. Readers / Writers

Published selectors from `kennzahlenTree/state/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readKennzahlenTreeState(_KDB)` | `_KDB.state.kennzahlenTree` | Full owner subtree snapshot. |
| `readKennzahlenTreeSources(_KDB)` | `sourceOrder`, `bySource` | Ordered source entries. |
| `readKennzahlenTreeSource(_KDB, sourceKey)` | `bySource[sourceKey]` | One source entry or `undefined`. |
| `readKennzahlenTreeReady(_KDB)` | `lifecycle`, `hasRenderableData` | Boolean readiness projection. |

Internal mutation style: reducer plus focused pure builders. No public writer helpers.

Action names:

| Action type | Purpose |
|---|---|
| `kennzahlenTree/loadStarted` | Transition lifecycle to `loading` and clear previous errors. Scoped overlay `Kennzahlen werden geladen` on the tree mount: `loadingService-overlay-coverage-contractdelta.md`. |
| `kennzahlenTree/loadSucceeded` | Store `bySource`, `sourceOrder`, `hasRenderableData`, and `lastBuildAt`. |
| `kennzahlenTree/loadFailed` | Store `lifecycle: "error"`, `errorCode`, and `errorMessage`. |
| `kennzahlenTree/rendered` | Store `lastRenderedAt` and `readyResolvedAt`; transition to `ready` only when renderable data exists. |
| `kennzahlenTree/destroy` | Transition to `disposed`. |

## 7. Events

Legacy evidence emits no `_KDB.events` facts or requests and subscribes to no `_KDB.events`. Therefore this direct port emits no events, subscribes to no events, creates no `events/eventNames.js`, and requires no `eventSubscribe.md` update.

Adding `kennzahlenTree:*` fact-events later requires a contract delta and event-catalog entries before implementation.

## 8. Dependencies

- `_KDB` (always).
- `_KDB.properties.kennzahlenTreePropObj` and `_KDB.properties.kennzahlenTablesPropObj` for REDESIGN2-compatible source configuration.
- `_KDB.data.hierarchies.byName` for hierarchy row data, until a future `hierarchyDataService` is promoted.
- Optional `options.dataReadyPromise` or runtime `pendingPromises.dataReady` for async data readiness; do not read or store promises under `_KDB.state.tablesLoaded`.
- `jquery` and `base/libraries/jstree.min` for legacy-equivalent tree rendering.
- Optional injected `dragDropAdapter` with `refreshDropboxes`, `startDrag`, and `finishDrag` if CP-1 chooses active drag/drop preservation for this tranche.

The module must not discover dependencies through `window._KDB`, `window.top.getKDB()`, or legacy `window.KDB.logging`.

## 9. Cognos Touchpoints

This direct-port tranche has no direct Cognos SDK calls and no `_KDB.cognosAPI.<theme>.<function>` calls.

The source data is read from already-loaded `_KDB.data.hierarchies.byName` and property config. Loading hierarchy data itself is outside this module and remains a future `hierarchyDataService` candidate per `openDesignCandidates.md`.

## 10. DOM Discipline

Selector config belongs under `_KDB.elements.selectors.kennzahlenTree`, for example:

```js
_KDB.elements.selectors.kennzahlenTree = {
  rootSelector: "#kdb-control_metrics_container",
  treeSelector: ".metricsTree",
  sourceContainerSelector: ".kdb-metrics-tree__source",
  searchInputSelector: ".kdb-metrics-tree__search-input"
};
```

Live DOM and jQuery refs belong under `_KDB.runtime.kennzahlenTree.domRefs`.

The default root selector intentionally points at the current kdbControl-owned metrics shell container. kdbControl owns showing/hiding and placing that shell region; `kennzahlenTree` owns only the tree content it places inside the provided/root-selected container.

## 11. Folder Layout

Production target after CP-1 and execution-spec approval:

```txt
KDB3/js/dashboard/kennzahlenTree/
  __orchestratorKennzahlenTree.js
  createKennzahlenTreeController.js
  config/
    columnCandidates.js
    domSelectors.js
  state/
    initialState.js
    createKennzahlenTreeReducer.js
    selectors.js
    buildKennzahlenTreeSources.js
    buildKennzahlenTreeNodes.js
  view/
    renderKennzahlenTrees.js
    bindKennzahlenTreeSearch.js
    bindKennzahlenTreeDragDrop.js
    cleanupKennzahlenTrees.js
  adapters/
    createDragDropAdapter.js
```

No `events/` folder is created in this tranche because the module emits no events.

## 12. kdbControl Boundary

`kdbControl` remains owner of the control-shell framework, including the container that can host the Kennzahlen region and any shell toggle that shows/hides it.

`kennzahlenTree` becomes owner of:

- `_KDB.state.kennzahlenTree`;
- `_KDB.runtime.kennzahlenTree`;
- `_KDB.api.kennzahlenTree`;
- the build/render/search lifecycle of tree content inside its mount root;
- the serializable leaf payload shape used for drag start.

`kennzahlenTree` must not write `_KDB.state.kdbControl`, `_KDB.runtime.kdbControl`, widget state, filter state, launchpad state, or canvas drag/drop state. If active drag/drop is preserved, it is done through an injected adapter or public API, not through foreign state writes.

## 13. Out Of Scope

- Writing production files before CP-1 approval and execution-spec approval.
- Bootstrap registration in `KDB.js`, unless CP-1 explicitly changes this.
- Porting or redesigning `dragDrop`, `widgets`, `filters`, `launchpad`, `canvas`, or `hierarchyDataService`.
- Browser harness or `TEST/` sandbox.
- New events or event catalog edits.
- Real Cognos calls.
- Editing rule files, architecture templates, or legacy files.

## 14. Open Questions For CP-1

**Q1. Target placement:** recommend `KDB3/js/dashboard/kennzahlenTree/`, not `KDB3/js/dashboard/canvas/kdbControl/kennzahlenTree/`, because the module owns its own state/runtime/API and must not remain a kdbControl subsystem.

**Q2. State ownership:** recommend accepting `_KDB.state.kennzahlenTree` with the exact initial state in Section 3 and lifecycle subset `idle`, `loading`, `ready`, `error`, `disposed`.

**Q3. Public API:** recommend `_KDB.api.kennzahlenTree` with dispatch + reducer; no deviation from feature-module default.

**Q4. Runtime resources:** recommend moving legacy `readyPromise`, `pendingRenderPromise`, jsTree instances, jQuery handlers, live DOM refs, and drag/drop adapter handles to `_KDB.runtime.kennzahlenTree`.

**Q5. DOM placement:** recommend selector strings in `_KDB.elements.selectors.kennzahlenTree` and live refs in `_KDB.runtime.kennzahlenTree.domRefs`; default root selector points to `#kdb-control_metrics_container` as the current mount contract with kdbControl.

**Q6. Events:** recommend no emitted/subscribed events and no `eventSubscribe.md` update in this tranche.

**Q7. Disposed-state discipline:** legacy has no `_isDisposed` guard; recommend adding the required controller-closure guard during implementation.

**Q8. Drag/drop boundary:** production currently has no `dragDrop` module. Choose one before execution spec:

- **A - Preserve active drag/drop now:** add only a thin `adapters/createDragDropAdapter.js` that calls an injected/public drag-drop API if present; missing API logs one warning and disables active dragging. This preserves the module boundary but active drag/drop depends on a later owner.
- **B - Preserve payload data only in this tranche:** build the same leaf payload attributes but do not start real drag sessions until a drag/drop owner exists. This avoids cross-module scope creep but temporarily omits active drag behavior.
- **C - Expand scope to port dragDrop first or together:** best behavior parity, but violates the stated out-of-scope rule against bundling other feature modules/services into this tranche.

Recommendation: **A**. It keeps `kennzahlenTree` behavior as close as possible without importing a non-existent production module or writing foreign drag/drop state.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-16 | `Draft` rewritten | GPT-5.5 | Converted prior sandbox/MVP contract into DIRECT-PORT CP-1 draft for production target. |
| 2026-05-16 | `Draft -> Approved` | user | Q1-Q7 approved as discussed; Q8 approved as option A: preserve active drag/drop through a thin injected/public adapter, warn once and disable drag if unavailable. |

> CP-1 approved. Next artifact: `kennzahlenTree-port-execution-spec.md`.

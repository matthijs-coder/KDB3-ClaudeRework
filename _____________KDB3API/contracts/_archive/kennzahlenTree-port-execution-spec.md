# Execution Spec: `kennzahlenTree` (`direct production port`)

> Ready-for-execution spec for direct-porting REDESIGN2 `kennzahlenTree` into the production tree after CP-1 approval of `contracts/kennzahlenTree.md`.
> This spec writes production files only under `_____________KDB3API/KDB3/js/dashboard/kennzahlenTree/`. No `TEST/` sandbox and no browser harness.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/kennzahlenTree.md`
**Phase:** `direct production port`
**Authoring AI:** GPT-5.5, 2026-05-16
**Executing AI:** external executing AI
**Reviewer:** user + mid-tier AI

---

## Section A. Pre-flight read list

The executing AI must read these files in order before producing output. Its first response must echo one sentence per item.

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
12. `_____________KDB3API/contracts/_executionSpecTemplate.md`
13. `_____________KDB3API/contracts/kennzahlenTree.md`
14. This execution spec.

The executing AI must not create or edit any file until those summaries are present and accepted by the supervising AI or reviewer.

---

## Section B. Legacy inputs

Read these legacy files only as evidence. Do not modify, move, rename or delete them.

```txt
_______REDESIGN2/KDB3/js/dashboard/canvas/kdbControl/kennzahlenTree/
  __kennzahlenTreeOrchestrator.js
  buildKennzahlenTreeState.js
  renderKennzahlenTrees.js
  bindKennzahlenTreeDragDrop.js

_______REDESIGN2/__savedProperties/
  kennzahlenTreePropId.js
  kennzahlenTablesPropId.js

_______REDESIGN2/KDB3/js/base/tasks/init/setupStatePromises/steps/
  initializeKennzahlenTreeState.js

_______REDESIGN2/KDB3/js/dashboard/canvas/kdbControl/
  createControlElementsRegistry.js
```

Do not read legacy folders linearly. If another legacy file seems necessary, stop and report the exact path and reason.

---

## Section C. Mapping table

| New production file | Legacy evidence file(s) | Rule-alignment note |
|---|---|---|
| `KDB3/js/dashboard/kennzahlenTree/__orchestratorKennzahlenTree.js` | `__kennzahlenTreeOrchestrator.js`, `initializeKennzahlenTreeState.js` | Canonical orchestrator name; initialise `_KDB.state`, `_KDB.runtime`, `_KDB.api`; no async pipeline or business logic in orchestrator. |
| `KDB3/js/dashboard/kennzahlenTree/createKennzahlenTreeController.js` | `__kennzahlenTreeOrchestrator.js` | Convert legacy async orchestrator to dispatch-style public controller with disposed guards, lifecycle try/catch, and runtime cleanup. |
| `KDB3/js/dashboard/kennzahlenTree/config/columnCandidates.js` | `buildKennzahlenTreeState.js`, saved property files | Keep column candidate lists and default path columns as serializable config. |
| `KDB3/js/dashboard/kennzahlenTree/config/domSelectors.js` | `renderKennzahlenTrees.js`, `createControlElementsRegistry.js` | Move selector strings to `_KDB.elements.selectors.kennzahlenTree`; live refs go to runtime. |
| `KDB3/js/dashboard/kennzahlenTree/state/initialState.js` | `initializeKennzahlenTreeState.js` | Keep only serializable owner state; move `readyPromise`, `pendingRenderPromise`, listeners to runtime. |
| `KDB3/js/dashboard/kennzahlenTree/state/createKennzahlenTreeReducer.js` | `__kennzahlenTreeOrchestrator.js`, `initializeKennzahlenTreeState.js` | Replace direct state mutation with pure reducer actions and canonical lifecycle terms. |
| `KDB3/js/dashboard/kennzahlenTree/state/selectors.js` | Contract Section 6 | Publish granular read selectors; consumers do not read internal state directly. |
| `KDB3/js/dashboard/kennzahlenTree/state/resolveKennzahlenColumns.js` | `buildKennzahlenTreeState.js` | Extract column resolution helpers to keep node builder under file-size limits. |
| `KDB3/js/dashboard/kennzahlenTree/state/buildKennzahlenTreeNodes.js` | `buildKennzahlenTreeState.js` | Pure jsTree node-data builder preserving grouping, Freigabe filtering, text resolution, and leaf payload attributes. |
| `KDB3/js/dashboard/kennzahlenTree/state/buildKennzahlenTreeSources.js` | `buildKennzahlenTreeState.js` | Pure source-entry builder from `_KDB.data.hierarchies.byName` plus properties. |
| `KDB3/js/dashboard/kennzahlenTree/view/renderKennzahlenTrees.js` | `renderKennzahlenTrees.js` | Preserve jQuery/jsTree rendering but store DOM/plugin refs in runtime and avoid state writes. |
| `KDB3/js/dashboard/kennzahlenTree/view/bindKennzahlenTreeSearch.js` | `renderKennzahlenTrees.js` | Keep search behavior as internal module behavior; cleanup handlers through runtime. |
| `KDB3/js/dashboard/kennzahlenTree/view/bindKennzahlenTreeDragDrop.js` | `bindKennzahlenTreeDragDrop.js` | Preserve leaf drag behavior through injected `dragDropAdapter`; no foreign state writes. |
| `KDB3/js/dashboard/kennzahlenTree/view/cleanupKennzahlenTrees.js` | `renderKennzahlenTrees.js`, `bindKennzahlenTreeDragDrop.js` | Centralize jsTree destroy and jQuery handler cleanup before runtime reset. |
| `KDB3/js/dashboard/kennzahlenTree/adapters/createDragDropAdapter.js` | `bindKennzahlenTreeDragDrop.js`, REDESIGN2 dragDrop API usage | Thin adapter to optional public/injected drag/drop API; warn once and disable active drag if API is missing. |

No `events/eventNames.js` is created because CP-1 decided this direct port emits no `_KDB.events` events.

---

## Section D. Folder tree

Create exactly these production files:

```txt
_____________KDB3API/KDB3/js/dashboard/kennzahlenTree/
  __orchestratorKennzahlenTree.js
  createKennzahlenTreeController.js
  config/
    columnCandidates.js
    domSelectors.js
  state/
    initialState.js
    createKennzahlenTreeReducer.js
    selectors.js
    resolveKennzahlenColumns.js
    buildKennzahlenTreeNodes.js
    buildKennzahlenTreeSources.js
  view/
    renderKennzahlenTrees.js
    bindKennzahlenTreeSearch.js
    bindKennzahlenTreeDragDrop.js
    cleanupKennzahlenTrees.js
  adapters/
    createDragDropAdapter.js
```

Do not create or edit `KDB.js`, CSS, tests, README files, harness files, legacy files, rule files, architecture authority files, or templates in this execution pass.

---

## Section E. Per-file specifications

Every `.js` file must be a full-compact AMD module using explicit dependency-array form.

### `kennzahlenTree/__orchestratorKennzahlenTree.js`

- **Role:** module orchestrator.
- **Lines:** target 50, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./config/domSelectors.js`, `./createKennzahlenTreeController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:** ensure `_KDB.state`, `_KDB.runtime`, `_KDB.api`, `_KDB.elements.selectors` exist; initialise `_KDB.elements.selectors.kennzahlenTree` from dom selector config if missing; initialise `_KDB.state.kennzahlenTree` from `initialState()` if missing; initialise runtime buckets; create controller; register `_KDB.api.kennzahlenTree`; return controller.
- **Rules to apply:** `amd.mdc` full-compact AMD; `kdb-object.mdc` allowed namespaces only; `feature-structure.mdc` thin orchestrator; `naming.mdc` canonical orchestrator naming.

### `kennzahlenTree/createKennzahlenTreeController.js`

- **Role:** controller factory.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** reducer, selectors, source builder, renderer, search binder, drag/drop binder, cleanup, drag/drop adapter.
- **Entry function:** `createKennzahlenTreeController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Factory-scope helpers:** `runMountPipeline(_KDB, options, controllerApi, signal)` for async work; no inline async IIFE.
- **Body requirements:** closure `_isDisposed`; disposed guards on every public method; `mount` wraps body in try/catch, starts/records a pending promise in runtime, dispatches `loadStarted`, builds sources, dispatches `loadSucceeded`, renders, binds search and drag/drop, dispatches `rendered`, returns `Promise<boolean>`; `destroy` wraps body in try/catch, sets `_isDisposed = true` before cleanup, calls cleanup, clears runtime buckets, dispatches `destroy`; `dispatch` routes only through reducer and owner state.
- **Rules to apply:** `module-public-api.mdc` single dispatch surface and disposed-state discipline; `state.mdc` canonical writer only; `runtime.mdc` cleanup before runtime reset; `error-handling.mdc` mandatory try/catch on named executables; lifecycle boundaries convert errors; `amd.mdc` factory-scope async helper only.

### `kennzahlenTree/config/columnCandidates.js`

- **Role:** serializable config constants.
- **Lines:** target 60.
- **Return value:** object with `DEFAULT_PATH_COLUMNS`, `CODE_COLUMN_CANDIDATES`, `DISPLAY_COLUMN_CANDIDATES`, `LANGTEXT_COLUMN_CANDIDATES`, `PATH_TEXT_COLUMN_CANDIDATES`, `RELEASE_COLUMN_CANDIDATES`.
- **Rules to apply:** `state.mdc` config is serializable; `naming.mdc` constants are `UPPER_SNAKE_CASE`; `amd.mdc` one returned object.

### `kennzahlenTree/config/domSelectors.js`

- **Role:** selector string config.
- **Lines:** target 40.
- **Return value:** object with `rootSelector`, `treeSelector`, `sourceContainerSelector`, `searchInputSelector`, `searchIconSelector`.
- **Required defaults:** `rootSelector: "#kdb-control_metrics_container"` and `treeSelector: ".metricsTree"` for current kdbControl shell compatibility.
- **Rules to apply:** `dom.mdc` selectors only, no live refs; `naming.mdc` CSS class names kebab-case for new classes.

### `kennzahlenTree/state/initialState.js`

- **Role:** initial state factory.
- **Lines:** target 35.
- **Return value:** function `initialState()` returning the contract Section 3 state shape.
- **Rules to apply:** `state.mdc` serializable only; `lifecycleVocabulary.md` uses `idle`; no promises/listeners/DOM/runtime objects.

### `kennzahlenTree/state/createKennzahlenTreeReducer.js`

- **Role:** pure reducer.
- **Lines:** target 100, hard limit 150.
- **Actions:** `loadStarted`, `loadSucceeded`, `loadFailed`, `rendered`, `destroy`.
- **Rules to apply:** `state.mdc` pure state transition and canonical writer; `error-handling.mdc` reducers exempt — pure, no try/catch; `naming.mdc` slash action names.

### `kennzahlenTree/state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 70.
- **Exports:** `readKennzahlenTreeState`, `readKennzahlenTreeSources`, `readKennzahlenTreeSource`, `readKennzahlenTreeReady`.
- **Rules to apply:** `module-public-api.mdc` selectors are granular read surface; `state.mdc` read-only; no mutation.

### `kennzahlenTree/state/resolveKennzahlenColumns.js`

- **Role:** pure column resolver.
- **Lines:** target 120, hard limit 150.
- **Behavior:** port `resolveMappedColumnName`, `resolveHardcodedColumnName`, `resolvePathColumns`, `resolveColumnName`; return a column map for `code`, `display`, `langtext`, `pathText`, `release`, `hardcoded`, `pathColumns`.
- **Rules to apply:** `state.mdc` pure data helper; `feature-structure.mdc` focused responsibility; `naming.mdc` English helper names with German user/data field strings preserved as data.

### `kennzahlenTree/state/buildKennzahlenTreeNodes.js`

- **Role:** pure jsTree node data builder.
- **Lines:** target 130, hard limit 150.
- **Behavior:** port `buildNodesFromRows`, `rowPassesFreigabe`, `resolveCode`, `resolveLangtext`, `resolveDisplayText`, `splitPathText`, `getTextAfterColon`, `buildGroupId`, `buildLeafNodeId`; use `resolveKennzahlenColumns`; preserve group node shape and leaf `a_attr` payload including `draggType` and `draggedElementType`.
- **Rules to apply:** `state.mdc` serializable data only; `dom.mdc` no DOM creation; `feature-structure.mdc` stay within line limit by using resolver module.

### `kennzahlenTree/state/buildKennzahlenTreeSources.js`

- **Role:** pure source-entry builder.
- **Lines:** target 110, hard limit 150.
- **Behavior:** port `resolveRelevantSources`, `getHierarchyData`, `getTreeConfig`, `getTableConfig`, and `buildSourceEntry`; read from `_KDB.properties` and `_KDB.data.hierarchies.byName`; return `{ bySource, sourceOrder, hasRenderableData }`.
- **Rules to apply:** `state.mdc` no foreign writes; `kdb-object.mdc` read allowed namespaces only; no promises in state.

### `kennzahlenTree/view/renderKennzahlenTrees.js`

- **Role:** view renderer and jsTree initialiser.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** `jquery`, `../../../base/libraries/jstree.min`, `./cleanupKennzahlenTrees.js`.
- **Behavior:** port `destroyExistingTrees`, `buildTreeDom`, `initJsTree`, `waitForTreeReady`, `sanitizeForId`, `getSearchIconSvg`; render one search-enabled jsTree block per source; store DOM refs and jQuery tree refs under `_KDB.runtime.kennzahlenTree.domRefs`; return `Promise<boolean>`.
- **Rules to apply:** `dom.mdc` live refs in runtime, scoped mount root; `runtime.mdc` cleanup path required; `error-handling.mdc` caller handles lifecycle boundary.

### `kennzahlenTree/view/bindKennzahlenTreeSearch.js`

- **Role:** search event binder.
- **Lines:** target 90.
- **AMD imports:** `jquery`.
- **Behavior:** port `bindSearch`; namespace jQuery handlers with `.kdbKennzahlenTreeSearch`; store cleanup descriptors or rely on namespaced cleanup in `cleanupKennzahlenTrees`; search remains internal module behavior and emits no `_KDB.events`.
- **Rules to apply:** `dom.mdc` listener bodies stay thin; `runtime.mdc` cleanup descriptors/namespace; no state writes required unless implementation chooses to dispatch an owner action documented in the reducer.

### `kennzahlenTree/view/bindKennzahlenTreeDragDrop.js`

- **Role:** drag/drop event binder.
- **Lines:** target 120.
- **AMD imports:** `jquery`.
- **Behavior:** port leaf-only draggable sync and dragstart/dragend handlers; call injected `dragDropAdapter.refreshDropboxes`, `.startDrag`, `.finishDrag`; use `buildDragPayload`; never write canvas/dragDrop/kdbControl state.
- **Rules to apply:** `runtime.mdc` cleanup via namespaced jQuery handlers; `module-public-api.mdc` cross-owner behavior through adapter/public API only; `state.mdc` no foreign writes.

### `kennzahlenTree/view/cleanupKennzahlenTrees.js`

- **Role:** runtime cleanup helper.
- **Lines:** target 90.
- **AMD imports:** `jquery`.
- **Behavior:** remove `.kdbKennzahlenTreeSearch` and `.kdbKennzahlenDnD` handlers, destroy existing jsTree plugin instances, cancel/delete pending runtime refs where applicable, empty owned module root, clear `domRefs` entries.
- **Rules to apply:** `runtime.mdc` cleanup before reset; `dom.mdc` stale refs cleared; `error-handling.mdc` cleanup errors caught by caller destroy boundary.

### `kennzahlenTree/adapters/createDragDropAdapter.js`

- **Role:** thin adapter.
- **Lines:** target 80.
- **Behavior:** accept `_KDB` and optional `_options.dragDropApi`; resolve an API object with `refreshDropboxes`, `startDrag`, `finishDrag`; if missing, warn once and make methods no-op/false. Do not import or create a dragDrop owner.
- **Rules to apply:** `module-public-api.mdc` adapter is local/injected, not a new service; `state.mdc` no foreign state writes; `error-handling.mdc` catch/log adapter call failures with context.

---

## Section F. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `kennzahlenTree/loadStarted` | `mount()` before source build | clear errors; set `hasRenderableData: false` | `idle|ready|error -> loading` |
| `kennzahlenTree/loadSucceeded` | after source build | set `bySource`, `sourceOrder`, `hasRenderableData`, `lastBuildAt` | `loading -> ready` if renderable, otherwise `loading -> idle` |
| `kennzahlenTree/loadFailed` | mount/build/render catch | set `errorCode`, `errorMessage`, `hasRenderableData: false` | `any -> error` |
| `kennzahlenTree/rendered` | after render/search/drag binding | set `lastRenderedAt`, `readyResolvedAt` | no change if already `ready`; otherwise `loading -> ready` when renderable |
| `kennzahlenTree/destroy` | `destroy()` | set lifecycle `disposed`; keep serializable last snapshot unless cleanup requires emptying | `any -> disposed` |

---

## Section G. Public API wiring

- Surface: `_KDB.api.kennzahlenTree`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- `_KDB.state.kennzahlenTree`: initialized from `initialState()`.
- `_KDB.runtime.kennzahlenTree`: initialized with `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `pendingPromises`, `adapters`.
- `_KDB.elements.selectors.kennzahlenTree`: initialized from `config/domSelectors.js`.
- No `_KDB.services.kennzahlenTree`, no `_KDB.events` additions, no new top-level `_KDB.*` key.

---

## Section H. Bootstrap registration

Bootstrap registration in `KDB.js` is **deferred** in this tranche.

Rationale:

- User marked `KDB.js` registration out of scope unless CP-1 changes it.
- CP-1 did not require immediate bootstrap integration.
- The produced module can be statically inspected and later wired by adding the AMD import, calling `__orchestratorKennzahlenTree(_KDB)`, and deciding the mount order relative to `kdbControl`.

The executing AI must not edit `KDB.js`.

---

## Section I. Acceptance criteria

The executing AI must self-verify:

1. Every file in Section D exists under `_____________KDB3API/KDB3/js/dashboard/kennzahlenTree/`.
2. No file outside the Section D production target was created or modified.
3. Every `.js` file uses full-compact AMD `define([...], function (...) { ... })`.
4. No file exceeds its hard line limit.
5. Public API is exactly `mount`, `destroy`, `dispatch`, `getState`.
6. No runtime object, DOM node, jQuery object, Promise, listener, AbortController or function is stored in `_KDB.state.kennzahlenTree`.
7. `mount` and `destroy` wrap lifecycle bodies in `try/catch` and log with boundary-specific context.
8. Disposed-state discipline is implemented for every public method and async result path.
9. `destroy` cleans subscriptions/listeners/jsTree instances/pending promises/DOM refs before resetting runtime buckets.
10. Reducer is pure and contains no DOM, event, timer, jQuery, jsTree or async code.
11. Search remains internal module behavior and emits no `_KDB.events`.
12. Drag/drop uses only `dragDropAdapter`; it performs no foreign state writes and warns once when unavailable.
13. No `events/` folder or `eventNames.js` exists for this module.
14. Static import inspection: every AMD import path points to an existing file or an existing external dependency (`jquery`, `../../../base/libraries/jstree.min`).
15. Reporting back includes file paths, line counts, mapping confirmation, self-verification, deviations, and open questions.

---

## Section J. Forbidden actions

The executing AI must not:

- Modify `_____________KDB3API/.cursor/rules/`.
- Modify architecture authority files or templates.
- Modify `_____________KDB3API/contracts/kennzahlenTree.md` or this execution spec.
- Modify `_____________KDB3API/KDB3/js/KDB.js`.
- Modify CSS files.
- Create files under `TEST/`.
- Modify `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Create `events/eventNames.js` or edit `architecture/eventSubscribe.md`.
- Add real Cognos API calls.
- Port or create `dragDrop`, `widgets`, `filters`, `launchpad`, `canvas`, or `hierarchyDataService`.
- Commit, push, or change git config.
- Introduce behavior beyond rule-alignment; if behavior drift appears necessary, stop and report.

---

## Section K. Reporting template

Final response from the executing AI must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every created path with line count and `matches spec | deviation`.
3. **Mapping confirmation** — every Section C row marked implemented or omitted with reason.
4. **Self-verification** — pass/fail for every Section I criterion.
5. **Deviations** — file, deviation, motivation, consulted rule.
6. **Open questions for reviewer** — only concrete blockers or ambiguity found during execution.

---

## Section L. Reviewer handoff

The supervising AI must:

1. Verify pre-flight summaries are present and specific.
2. Read every created file.
3. Run `ReadLints` on all created `.js` files.
4. Cross-check every file against Section E and Section I.
5. Static-check AMD import paths and note that `KDB.js` bootstrap registration is deferred.
6. Diff-walk against REDESIGN2 and confirm rule-alignment only.
7. Decide accept, one focused fix-spec, or escalate per `midtierDirectPortTemplate.md` Section 8.

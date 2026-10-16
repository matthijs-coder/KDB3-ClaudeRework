# Execution Spec: `kennzahlenTree` (`MVP sandbox port`)

> Ready-for-execution spec for a less-capable AI to build the `kennzahlenTree` MVP under `TEST/kennzahlenTree-port/` after CP-1 contract approval.
>
> This spec produces sandbox files only. It does not write production `KDB3/js`, rule files, templates, legacy files or architecture authority documents.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/kennzahlenTree.md`
**Phase:** `MVP sandbox port`
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
12. `_____________KDB3API/contracts/_template.md`
13. `_____________KDB3API/contracts/kennzahlenTree.md`
14. This execution spec.

The executing AI must not create or edit any file until those summaries are present and accepted by the supervising AI or reviewer.

---

## Section B. Legacy inputs

Read these legacy files only as evidence. Do not modify, move, rename or delete them.

```txt
_______REDESIGN2/KDB3/js/dashboard/canvas/kdbControl/kennzahlenTree/
  buildKennzahlenTreeState.js
  renderKennzahlenTrees.js
  bindKennzahlenTreeDragDrop.js
  __kennzahlenTreeOrchestrator.js

_______REDESIGN2/__savedProperties/
  kennzahlenTreePropId.js
  kennzahlenTablesPropId.js
```

Do not read legacy folders linearly. If another legacy file seems necessary, stop and report the exact path and reason.

---

## Section C. Mapping table

| New sandbox file | Legacy evidence file(s) | Rule-alignment note |
|---|---|---|
| `TEST/kennzahlenTree-port/kennzahlenTree/__orchestratorKennzahlenTree.js` | `__kennzahlenTreeOrchestrator.js` | Rename to canonical orchestrator shape, register `_KDB.api.kennzahlenTree`, initialise owner state/runtime, no business logic. |
| `TEST/kennzahlenTree-port/kennzahlenTree/createKennzahlenTreeController.js` | `__kennzahlenTreeOrchestrator.js`, `renderKennzahlenTrees.js` | Convert async pipeline to dispatch-style public API with disposed guards, lifecycle try/catch and runtime cleanup. |
| `TEST/kennzahlenTree-port/kennzahlenTree/config/columnCandidates.js` | `buildKennzahlenTreeState.js`, property files | Preserve code/display/langtext/path/freigabe candidates and path defaults as serializable config. |
| `TEST/kennzahlenTree-port/kennzahlenTree/state/initialState.js` | Contract state sketch | Put only serializable state in `_KDB.state.kennzahlenTree`; no promises, DOM or plugin instances. |
| `TEST/kennzahlenTree-port/kennzahlenTree/state/createKennzahlenTreeReducer.js` | `runTreePipeline` state writes | Replace direct mutation with pure reducer actions. |
| `TEST/kennzahlenTree-port/kennzahlenTree/state/selectors.js` | Contract Section 5 | Publish granular read selectors; consumers do not read internals directly. |
| `TEST/kennzahlenTree-port/kennzahlenTree/data/normalizeKennzahlenSourceRows.js` | `kennzahlenTreePropId.js`, `kennzahlenTablesPropId.js` | Normalize fixture/adapter input to `{ sourceKey, treeConfig, tableConfig, rows }`. |
| `TEST/kennzahlenTree-port/kennzahlenTree/data/buildKennzahlenTreeNodes.js` | `buildKennzahlenTreeState.js` | Preserve grouping, Freigabe filter and leaf payload fields as pure data transform. |
| `TEST/kennzahlenTree-port/kennzahlenTree/data/buildKennzahlenTreeSources.js` | `buildKennzahlenTreeState.js` | Build ordered source entries from normalized sources. |
| `TEST/kennzahlenTree-port/kennzahlenTree/view/buildKennzahlenTreeView.js` | `renderKennzahlenTrees.js` | Build detached DOM; no listeners, no state writes. |
| `TEST/kennzahlenTree-port/kennzahlenTree/view/placeKennzahlenTreeView.js` | `renderKennzahlenTrees.js` | Place built DOM under owner root and update runtime domRefs only. |
| `TEST/kennzahlenTree-port/kennzahlenTree/view/syncKennzahlenTreeView.js` | `renderKennzahlenTrees.js`, `bindKennzahlenTreeDragDrop.js` | Sync selected/search/expanded visual state from owner state; no state writes. |
| `TEST/kennzahlenTree-port/kennzahlenTree/view/bindKennzahlenTreeView.js` | `renderKennzahlenTrees.js`, `bindKennzahlenTreeDragDrop.js` | Bind search, expand/collapse and select listeners through controller dispatch; store cleanup via AbortController. |
| `TEST/kennzahlenTree-port/kennzahlenTree/effects/publishKennzahlenTreeEvents.js` | Contract Section 6 | Emit documented fact-events only after reducer commits. |
| `TEST/kennzahlenTree-port/kennzahlenTree/events/eventNames.js` | Contract Section 6 | Canonical event-name constants; no string literal duplication. |
| `TEST/kennzahlenTree-port/harness/index.html` | `renderKennzahlenTrees.js` | Local harness only, with mount/destroy/load/select controls and debug output. |
| `TEST/kennzahlenTree-port/harness/harness.js` | REDESIGN2 property files | Build mock `_KDB`, fixtures and event log; no Cognos calls. |

---

## Section D. Folder tree

Create exactly these files:

```txt
TEST/kennzahlenTree-port/
  kennzahlenTree/
    __orchestratorKennzahlenTree.js
    createKennzahlenTreeController.js
    config/
      columnCandidates.js
    state/
      initialState.js
      createKennzahlenTreeReducer.js
      selectors.js
    data/
      normalizeKennzahlenSourceRows.js
      buildKennzahlenTreeNodes.js
      buildKennzahlenTreeSources.js
    view/
      buildKennzahlenTreeView.js
      placeKennzahlenTreeView.js
      syncKennzahlenTreeView.js
      bindKennzahlenTreeView.js
    effects/
      publishKennzahlenTreeEvents.js
    events/
      eventNames.js
  harness/
    index.html
    harness.js
```

Do not create CSS files, README files, tests, production files or bootstrap integration files.

---

## Section E. Per-file specifications

Every production-like module under `TEST/kennzahlenTree-port/kennzahlenTree/` must be an AMD module with explicit dependency-array form. Harness files may use browser scripts.

### `kennzahlenTree/__orchestratorKennzahlenTree.js`

- **Role:** module orchestrator.
- **Lines:** target 60, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./createKennzahlenTreeController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:** ensure `_KDB.state`, `_KDB.runtime`, `_KDB.api` exist; initialise `_KDB.state.kennzahlenTree` from `initialState` if missing; initialise `_KDB.runtime.kennzahlenTree` buckets; create controller; register `_KDB.api.kennzahlenTree`; return controller.
- **Rules to apply:**
  - `amd.mdc` — full-compact AMD, one returned orchestrator.
  - `kdb-object.mdc` — register only under allowed `_KDB.api`, `_KDB.state`, `_KDB.runtime`.
  - `feature-structure.mdc` — thin orchestrator only, no business logic.
  - `naming.mdc` — `kennzahlenTree` domain exception only; all other technical names English.

### `kennzahlenTree/createKennzahlenTreeController.js`

- **Role:** controller factory.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** reducer, selectors, data builders, view builders/placers/sync/binders, event publisher.
- **Entry function:** `createKennzahlenTreeController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Body requirements:** `_isDisposed` closure guard; public method guards; `mount` wraps body in try/catch, initialises runtime, builds sources from `options.sources` or `options.dataAdapter`, dispatches `loadStarted`/`loadSucceeded`, places/syncs/binds view, dispatches `rendered`, publishes `loaded`; `destroy` wraps body in try/catch and aborts controllers, unsubscribes subscriptions, clears runtime after cleanup, dispatches `destroy`.
- **Rules to apply:**
  - `module-public-api.mdc` — single dispatch-style surface; no mixed named commands.
  - `state.mdc` — canonical writer through reducer only; no foreign writes.
  - `runtime.mdc` — runtime buckets under `_KDB.runtime.kennzahlenTree`; cleanup before clearing runtime.
  - `error-handling.mdc` — try/catch at `mount` and `destroy`; no silent catch.
  - `amd.mdc` — async helper work at factory scope, not inline async IIFE.

### `kennzahlenTree/config/columnCandidates.js`

- **Role:** serializable config constants.
- **Lines:** target 60.
- **Return value:** object with `DEFAULT_PATH_COLUMNS`, `CODE_COLUMN_CANDIDATES`, `DISPLAY_COLUMN_CANDIDATES`, `LANGTEXT_COLUMN_CANDIDATES`, `PATH_TEXT_COLUMN_CANDIDATES`, `RELEASE_COLUMN_CANDIDATES`.
- **Rules to apply:** `state.mdc` config is serializable; `naming.mdc` constants are `UPPER_SNAKE_CASE`; `amd.mdc` single returned object.

### `kennzahlenTree/state/initialState.js`

- **Role:** initial state factory.
- **Lines:** target 40.
- **Return value:** function `initialState()` returning the exact state shape from contract Section 2.
- **Rules to apply:** `state.mdc` serializable state only; `lifecycleVocabulary.md` uses `idle`; `amd.mdc` single returned factory.

### `kennzahlenTree/state/createKennzahlenTreeReducer.js`

- **Role:** pure reducer.
- **Lines:** target 120, hard limit 150.
- **Actions:** implement every action in Section F reducer table.
- **Rules to apply:** `state.mdc` pure state transition only; no DOM, events, timers or async; `naming.mdc` slash action names; `error-handling.mdc` reducers exempt — pure, no try/catch.

### `kennzahlenTree/state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 80.
- **Exports:** `readKennzahlenTreeState`, `readKennzahlenSources`, `readSelectedKennzahl`, `readConfirmedKennzahl`, `readKennzahlenSearchText`, `readKennzahlenExpandedNodeIds`.
- **Rules to apply:** `module-public-api.mdc` selectors are granular read surface; `state.mdc` read-only; no state mutation.

### `kennzahlenTree/data/normalizeKennzahlenSourceRows.js`

- **Role:** pure source normalizer.
- **Lines:** target 80.
- **Input:** `Array<{ sourceKey, treeConfig, tableConfig, rows }>` or REDESIGN2-like object.
- **Output:** normalized source array with safe defaults.
- **Rules to apply:** `state.mdc` pure data only; `naming.mdc` English technical names with domain exception; `amd.mdc` one helper return.

### `kennzahlenTree/data/buildKennzahlenTreeNodes.js`

- **Role:** pure node builder.
- **Lines:** target 140, hard limit 150.
- **Behavior:** preserve legacy grouping by configured path columns; resolve code/display/langtext/path/freigabe/hardcoded columns; filter non-released rows unless `superUser` true; create group nodes and leaf nodes; leaf payload includes `code`, `display`, `langtext`, `title`, `kennzahlenTable`, `draggedElementType`, `draggType`.
- **Rules to apply:** `state.mdc` pure serializable node data; `dom.mdc` no DOM creation here; `feature-structure.mdc` split if hard limit would be exceeded.

### `kennzahlenTree/data/buildKennzahlenTreeSources.js`

- **Role:** pure source-entry builder.
- **Lines:** target 80.
- **Behavior:** normalize input sources, build nodes for each source, return `{ sources, sourceOrder, hasRenderableData }`.
- **Rules to apply:** `state.mdc` no side-effects; `naming.mdc` precise function names.

### `kennzahlenTree/view/buildKennzahlenTreeView.js`

- **Role:** view builder.
- **Lines:** target 120.
- **Behavior:** build a detached root containing one source block per `sourceOrder`, each with search input, tree container, nested group/leaf elements using `data-node-id`, `data-source-key` and leaf payload attributes.
- **Rules to apply:** `dom.mdc` builder creates detached DOM only; no listeners and no state writes; CSS classes kebab-case with `kdb-` prefix.

### `kennzahlenTree/view/placeKennzahlenTreeView.js`

- **Role:** view placer.
- **Lines:** target 70.
- **Behavior:** resolve mount root from `options.rootEl` or `_KDB.elements.selectors.kennzahlenTree.rootSelector`; empty previous owner content; append built view; store owner DOM refs under `_KDB.runtime.kennzahlenTree.domRefs`.
- **Rules to apply:** `dom.mdc` scoped mount-root query only; live refs in runtime, not state/elements; `runtime.mdc` owner-private refs.

### `kennzahlenTree/view/syncKennzahlenTreeView.js`

- **Role:** view mutator.
- **Lines:** target 90.
- **Behavior:** reflect selected leaf, expanded group nodes and search text from state to DOM; hide non-matching nodes for search; never dispatch.
- **Rules to apply:** `dom.mdc` mutator reads state and updates DOM only; no state mutation; scoped queries from owner root.

### `kennzahlenTree/view/bindKennzahlenTreeView.js`

- **Role:** DOM binder.
- **Lines:** target 120.
- **Behavior:** attach input/click listeners with `AbortController`; search dispatches `setSearchText`; group click dispatches `toggleNodeExpanded`; leaf click dispatches `selectKennzahl` and `confirmSelection`; stores controller under `_KDB.runtime.kennzahlenTree.abortControllers.view`.
- **Rules to apply:** `dom.mdc` listener bodies are thin dispatch calls; `runtime.mdc` cleanup via AbortController; no inline state mutation.

### `kennzahlenTree/effects/publishKennzahlenTreeEvents.js`

- **Role:** event publishing effect.
- **Lines:** target 70.
- **Exports:** `publishLoaded`, `publishSelectionConfirmed`, `publishLoadFailed` as object methods or a single dispatcher helper.
- **Rules to apply:** `events.mdc` fact-events only at confirmation points; constants from `eventNames.js`; `error-handling.mdc` catch/log event-boundary failures.

### `kennzahlenTree/events/eventNames.js`

- **Role:** event constants.
- **Lines:** target 30.
- **Return value:** `{ LOADED, SELECTION_CONFIRMED, LOAD_FAILED }` with values `kennzahlenTree:loaded`, `kennzahlenTree:selectionConfirmed`, `kennzahlenTree:loadFailed`.
- **Rules to apply:** `events.mdc` canonical home; `naming.mdc` colon fact-event names; no duplicated literals elsewhere.

### `harness/index.html`

- **Role:** local harness page.
- **Lines:** target 120.
- **Behavior:** load RequireJS, define paths to `kennzahlenTree/__orchestratorKennzahlenTree.js`, provide root container, Mount, Destroy, Load Fixtures and Confirm First Leaf buttons, state/debug panels.
- **Rules to apply:** harness exception; no production AMD imports via ES module; no Cognos.

### `harness/harness.js`

- **Role:** harness bootstrap and fixtures.
- **Lines:** target 150.
- **Behavior:** create mock `_KDB` with `state`, `runtime`, `api`, `events`, `elements.selectors.kennzahlenTree.rootSelector`; create fixture sources based on `Personal_KDB` and `Kennzahlen_TEST`; log events and state; call orchestrator; wire buttons.
- **Rules to apply:** harness exception; mock real public contract; no invented module API shape.

---

## Section F. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `kennzahlenTree/loadStarted` | `mount()` before building sources | clear error fields, set `hasRenderableData: false` | `idle|ready|error -> loading` |
| `kennzahlenTree/loadSucceeded` | after `buildKennzahlenTreeSources` | set `sources`, `sourceOrder`, `hasRenderableData`, `lastBuiltAt` | `loading -> ready` when renderable, otherwise `loading -> idle` |
| `kennzahlenTree/loadFailed` | catch in mount/build | set `errorCode`, `errorMessage`, clear renderable flag | `loading|idle|ready -> error` |
| `kennzahlenTree/setSearchText` | search input | set `searchTextBySource[sourceKey]` | none |
| `kennzahlenTree/toggleNodeExpanded` | group click | add/remove node id in `expandedNodeIdsBySource[sourceKey]` | none |
| `kennzahlenTree/selectKennzahl` | leaf click | set `selectedKennzahl` payload | none |
| `kennzahlenTree/confirmSelection` | leaf click after selection | set `confirmedSelection` payload | none |
| `kennzahlenTree/rendered` | after view bind/sync | set `lastRenderedAt` | no lifecycle change |
| `kennzahlenTree/destroy` | `destroy()` | set lifecycle `disposed`; clear selected/confirmed transient UI fields only if controller chooses to tombstone | `any -> disposed` |

---

## Section G. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readKennzahlenTreeState` | `_KDB.state.kennzahlenTree` | owner state or `undefined` |
| `readKennzahlenSources` | `sourceOrder`, `sources` | ordered array of source entries |
| `readSelectedKennzahl` | `selectedKennzahl` | selected payload or `null` |
| `readConfirmedKennzahl` | `confirmedSelection` | confirmed payload or `null` |
| `readKennzahlenSearchText` | `searchTextBySource[sourceKey]` | string |
| `readKennzahlenExpandedNodeIds` | `expandedNodeIdsBySource[sourceKey]` | array |

---

## Section H. Public API wiring

- Surface: `_KDB.api.kennzahlenTree`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- `_KDB.runtime.kennzahlenTree` initialization: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `pendingPromises`, `adapters`.
- `_KDB.state.kennzahlenTree` initialization: result of `initialState()`.
- No `_KDB.services.kennzahlenTree`, no new top-level `_KDB.*` key.

---

## Section I. Harness spec

Harness must demonstrate:

1. Mounting creates `_KDB.api.kennzahlenTree`, `_KDB.state.kennzahlenTree`, `_KDB.runtime.kennzahlenTree`.
2. Loading fixture sources renders at least two source blocks.
3. Search text filters visible node labels and updates state.
4. Group expand/collapse updates `expandedNodeIdsBySource`.
5. Leaf click updates `selectedKennzahl` and `confirmedSelection`.
6. `kennzahlenTree:selectionConfirmed` is logged once per confirmed leaf click.
7. Destroy aborts listeners and leaves post-destroy public methods guarded.

Fixture minimum:

```js
[
  {
    sourceKey: "Personal_KDB",
    treeConfig: { pathColumnNamesArr: ["Gruppe1", "Gruppe2", "Gruppe3"] },
    tableConfig: { code: "Kennzahlen - Name", kurztext: "Kurztext", hardcoded: "HARDCODED", freigabe: "Freigabe" },
    rows: [
      { "Kennzahlen - Name": "P_A_01", Kurztext: "Anzahl", LANGTEXT: "P_A_01: Anzahl", Gruppe1: "Personal", Gruppe2: "Bestand", Freigabe: 1 },
      { "Kennzahlen - Name": "P_Q_01", Kurztext: "Quote", LANGTEXT: "P_Q_01: Quote", Gruppe1: "Personal", Gruppe2: "Quote", Freigabe: 1 }
    ]
  },
  {
    sourceKey: "Kennzahlen_TEST",
    treeConfig: { pathColumnNamesArr: ["Gruppe1", "Gruppe2", "Gruppe3"] },
    tableConfig: { code: "Kennzahlen - Name", kurztext: "Kurztext", hardcoded: "HARDCODED", freigabe: "Freigabe" },
    rows: [
      { "Kennzahlen - Name": "T_01", Kurztext: "Testzahl", LANGTEXT: "T_01: Testzahl", Gruppe1: "Test", Gruppe2: "Demo", Freigabe: 1 }
    ]
  }
]
```

---

## Section J. Acceptance criteria

The executing AI must self-verify:

1. Every file in Section D exists.
2. No file outside `TEST/kennzahlenTree-port/` was created or modified.
3. Every module file under `kennzahlenTree/` uses full-compact AMD.
4. Public API is exactly `mount`, `destroy`, `dispatch`, `getState`.
5. No runtime object, DOM node, jQuery object, Promise, listener, AbortController or function is stored in `_KDB.state.kennzahlenTree`.
6. `mount` and `destroy` have try/catch boundaries and disposal guards.
7. `destroy` aborts controllers and unsubscribes before clearing runtime buckets.
8. Reducer is pure and contains no DOM/event/async code.
9. Event strings are defined only in `events/eventNames.js`.
10. Harness can mount, load fixtures, search, expand/collapse, select a leaf, log `kennzahlenTree:selectionConfirmed`, and destroy without console errors.
11. Line targets are respected; no executable file exceeds 150 lines.
12. Section L report is complete.

---

## Section K. Forbidden actions

The executing AI must not:

- Modify `_____________KDB3API/.cursor/rules/`.
- Modify `_____________KDB3API/contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify `_____________KDB3API/contracts/kennzahlenTree.md`.
- Modify `_____________KDB3API/KDB3/js/` or any production tree.
- Modify `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Create files outside `TEST/kennzahlenTree-port/`.
- Add CSS, README, tests, package files, commits or git config changes.
- Add real Cognos API calls or dashboard writes.
- Integrate with kdbControl, launchpad, filters, widgets or Cognos runtime.
- Invent behavior beyond this spec; deviations require stopping and reporting.

---

## Section L. Reporting template

Final response from the executing AI must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every created path with line count and `matches spec | deviation`.
3. **Mapping confirmation** — each row from Section C marked implemented or omitted with reason.
4. **Self-verification** — pass/fail for every Section J criterion.
5. **Deviations** — file, deviation, motivation, consulted rule.
6. **Open questions for reviewer** — only concrete blockers or ambiguity found during execution.

---

## Section M. Reviewer handoff

The supervising AI must:

1. Verify pre-flight summaries are present and specific.
2. Read every created file.
3. Run `ReadLints` on all created `.js` files.
4. Cross-check each file against Section E and Section J.
5. Decide accept, focused fix-spec, or escalate per `midtierHandoffTemplate.md` Section 8.

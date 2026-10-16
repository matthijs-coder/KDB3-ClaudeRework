# Execution Spec: `dragDrop` (direct port)

> Direct-port execution spec for the `dragDrop` dashboard/canvas feature module.
> Execute only after CP-1 approval of `contracts/dragDrop.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/dragDrop.md`
**Phase:** `direct production port`
**Authoring AI:** GPT-5.5, 2026-05-17
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing output files and must echo one sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces and ownership map.
2. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state, canonical writers, no foreign state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources under `_KDB.runtime.<owner>` with explicit cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — one public surface per module and disposed guards on every public method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — direct API vs fact/request events; event constants and catalog entries required.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, action/event naming, underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors in `_KDB.elements.selectors`, live refs in runtime, scoped DOM queries.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — read and verify whether `idle`, `ready`, `error`, and `disposed` are approved lifecycle terms for this module. If `ready` or `disposed` is not explicitly allowed, stop before implementation and request a contract delta.
12. `_____________KDB3API/contracts/_template.md` — contract shape.
13. `_____________KDB3API/contracts/dragDrop.md` — approved CP-1 contract for this direct port.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create files only after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/dashboard/canvas/dragDrop/
  __orchestratorDragDrop.js
  createDragDropController.js
  config/
    defaults.js
  state/
    initialState.js
    createDragDropReducer.js
    selectors.js
  session/
    startDragSession.js
    finishDragSession.js
    parseTransferPayload.js
  avatar/
    createDragAvatarTemplates.js
    createDragAvatar.js
    moveDragAvatar.js
    suppressNativeDragImage.js
  dropboxes/
    bindDropboxes.js
    readHelperTabIds.js
    updateDragHover.js
    resolveDropboxGeometry.js
    validateDropIntent.js
    publishValidatedDrop.js
  events/
    eventNames.js
```

Do not modify `KDB.js` in this tranche unless CP-1 explicitly expands bootstrap scope.

CP-1 has expanded scope for utilities:

```txt
_____________KDB3API/KDB3/js/core/utils/__orchestratorUtils.js
_____________KDB3API/KDB3/js/KDB.js
```

The utility scope is limited to registering existing `core/utils/throttle.js` as `_KDB.utils.throttle` and bootstrapping `__orchestratorUtils.js` from `KDB.js`. Do not change `throttle.js` behavior.

CP-1 event decision required:

- **A. Approve narrow `eventSubscribe.md` update for `canvas:dropValidated`.** Then create `events/eventNames.js` and `dropboxes/publishValidatedDrop.js`.
- **B. Do not approve `eventSubscribe.md` update.** Then do not create event-emitting code; mark `publishValidatedDrop` as deferred and stop for a contract/spec delta if drop completion cannot be represented.

Recommended route: A. Drag/drop without a validated-drop signal is incomplete, and `canvas:dropValidated` is a rule-aligned fact-event while no widgets-owner API exists in this tranche.

If CP-1 does not approve the `canvas:dropValidated` catalog update, do not create any production files from this execution spec. Stop before implementation and request a contract/spec delta. Do not create a partial `dragDrop` implementation with `bindDropboxes` but without a valid drop boundary.

---

## Section C. Legacy mapping table

| New production file | Legacy source(s) | Rule-alignment note |
|---|---|---|
| `__orchestratorDragDrop.js` | `dragDrop/__dragDropOrchestrator.js`, legacy `KDB.js` import/register evidence | Register canonical `_KDB.api.dragDrop`, initialize `_KDB.state.dragDrop` and `_KDB.runtime.dragDrop`, no WeakMap runtime, no top-level legacy logging reads. |
| `createDragDropController.js` | `dragDrop/__dragDropOrchestrator.js`, `startDragSession.js`, `finishDragSession.js`, `setupDropboxes.js` | Own public API, disposed guards, internal reducer dispatch, lifecycle/error boundaries, and runtime cleanup ordering. |
| `config/defaults.js` | `startDragSession.js`, `createDragAvatars.js`, `placeWidgetOnCanvas.js` dimension defaults | Preserve visualization/text default dimensions and avatar asset paths as declarative config. |
| `state/initialState.js` | `__dragDropOrchestrator.js`, `initializeDragAndDropState.js` | Move legacy `_KDB.state.canvas.dragDrop` to `_KDB.state.dragDrop`; keep only serializable lifecycle/session/validation data. |
| `state/createDragDropReducer.js` | Direct legacy writes in `startDragSession.js`, `finishDragSession.js`, `publishDropIntent.js` | Replace direct state writes with owner reducer actions; no runtime objects in state. |
| `state/selectors.js` | Legacy reads of `_KDB.state.canvas.dragDrop.session` | Publish read-only selectors; public API uses `getState()` only for full snapshot. |
| `session/startDragSession.js` | `startDragSession.js` | Preserve native dragstart payload, source offset, dataTransfer writes, active source marking, hidden copy, custom avatar startup, and native drag-image suppression; route state writes through controller dispatch. |
| `session/finishDragSession.js` | `finishDragSession.js` | Preserve cleanup of avatar, active dropbox, source markings, layout grid, document dragover listener, source copy, and session state; use runtime cleanup records. |
| `session/parseTransferPayload.js` | `publishDropIntent.js` `parseTransferPayload` | Preserve JSON parse fallback from `application/json` to `text/plain`; pure helper. |
| `avatar/createDragAvatarTemplates.js` | `createDragAvatars.js` | Preserve hidden template creation for text/visualization; store live template refs in runtime, not state. |
| `avatar/createDragAvatar.js` | `startDragSession.js` `createAvatar`, `buildHiddenCopy`, `markActiveSource` | Preserve custom fixed avatar clone and source-copy/source-marking behavior; split focused DOM creation from session orchestration. |
| `avatar/moveDragAvatar.js` | `startDragSession.js`, `updateDragHover.js` `moveAvatar` | Preserve pointer-following with `clientX/clientY - offsetX/offsetY`; no widget placement logic. |
| `avatar/suppressNativeDragImage.js` | `startDragSession.js` `setNativeDragImage` | Preserve temporary transparent 1x1 `setDragImage` element and cleanup timer; record cleanup in runtime. |
| `dropboxes/bindDropboxes.js` | `setupDropboxes.js` | Preserve dashboard dropbox discovery, helper-tab skip, `kdb_dropbox="true"`, and four native drag/drop listeners; register cleanup records. |
| `dropboxes/readHelperTabIds.js` | `setupDropboxes.js`, `validateDropIntent.js`, `launchpad` state evidence | Isolate temporary launchpad helper-tab read as a CP-1 compatibility exception until a launchpad API/selector is available. |
| `dropboxes/updateDragHover.js` | `updateDragHover.js` | Preserve hover handling, dropEffect copy/none, active class, and bounds checks; no direct state writes except through controller dispatch if needed. |
| `dropboxes/resolveDropboxGeometry.js` | `dropboxGeometry.js`, `placeWidgetOnCanvas.js` boundary evidence | Preserve metric/pointer/rendered-placement helpers; do not place widgets. |
| `dropboxes/validateDropIntent.js` | `validateDropIntent.js` | Preserve invalid-dropbox/helper-tab/type/bounds/filter-name validation; return serializable result only. |
| `dropboxes/publishValidatedDrop.js` | `publishDropIntent.js`, `base/events/widgetEvents.js`, `widgets/routeCanvasDropRequest.js` evidence | Preserve validated drop payload and `canvas:dropValidated` emission only if event catalog scope is approved; no widget placement. |
| `events/eventNames.js` | `base/events/widgetEvents.js` | Own the emitted event constant for this module; preserve legacy string `canvas:dropValidated` if CP-1 approves event scope. |
| `core/utils/__orchestratorUtils.js` | `core/utils/throttle.js`, existing `__orchestratorUtils.js` | Register existing throttle helper as `_KDB.utils.throttle` alongside existing utils; no behavior change. |
| `KDB.js` | Current production bootstrap | Import `_orchestratorUtils` and call it during core setup before feature modules mount, so `_KDB.utils.throttle` is available to production modules. |

Legacy files intentionally not ported into `dragDrop`:

| Legacy file | Reason |
|---|---|
| `widgets/placeWidgetOnCanvas.js` | Boundary evidence only; final placement and persistence belong to widgets/canvas owner. |
| `widgets/routeCanvasDropRequest.js` | Widget creation, launchpad take/restore, configuration, history, and success events belong to widgets owner. |
| `widgets/__widgetsOrchestrator.js` | Subscriber/placement routing belongs to future widgets/canvas tranche. |
| `kdbControl/kennzahlenTree/bindKennzahlenTreeDragDrop.js` | Source binder remains owner-specific; its behavior informs adapter contracts but is not generic dragDrop logic. |
| `kdbControl/bindToolboxTextDragDrop.js` | Toolbox source binder remains kdbControl-specific unless CP-1 expands adapter scope. |

---

## Section D. Per-file specifications

Every production file uses full-compact AMD form and returns exactly one value.

### `__orchestratorDragDrop.js`

- **Role:** feature-module orchestrator.
- **Lines:** target 70, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./createDragDropController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:**
  1. Ensure `_KDB.state`, `_KDB.runtime`, `_KDB.api`, `_KDB.elements`, `_KDB.elements.selectors`.
  2. Initialize `_KDB.state.dragDrop` from `initialState()` if absent.
  3. Initialize `_KDB.runtime.dragDrop` buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`, `dropboxesById`, `sourceRuntime`.
  4. Create controller with `{ _KDB, options }`.
  5. Register `_KDB.api.dragDrop = controller`.
  6. Return controller.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`.

### `createDragDropController.js`

- **Role:** controller factory.
- **Lines:** target 140, preferred hard limit 180. If this becomes dense, extract focused cleanup helpers into owned files and document the deviation in the CP-2 report.
- **AMD imports:** `./state/createDragDropReducer.js`, `./state/selectors.js`, `./avatar/createDragAvatarTemplates.js`, `./dropboxes/bindDropboxes.js`, `./session/startDragSession.js`, `./session/finishDragSession.js`.
- **Entry function:** `createDragDropController(_deps)`.
- **Public methods:** `mount`, `destroy`, `refreshDropboxes`, `startDrag`, `finishDrag`, `getState`.
- **Factory-scope helpers:** `ensureRuntime`, `dispatchInternal`, `clearRuntime`, `cleanupListeners`, `abortControllers`, `clearTimers`, `warnDisposed`, `handleBoundaryError`, `toErrorMessage`.
- **Behavior:**
  - `mount(options)` guards disposed, ensures runtime, creates avatar templates, binds dropboxes, dispatches `dragDrop/mountSucceeded`, returns `true`/`false`.
  - `mount(options)` is idempotent: a second mount must refresh templates/dropboxes cleanly or return `true` without duplicating templates, listeners, document listeners, or runtime refs.
  - `refreshDropboxes()` guards disposed, removes or aborts previous dropbox listener bindings, calls `bindDropboxes`, and returns `true`/`false`.
  - `startDrag(event, sourceInfo)` guards disposed, calls `startDragSession` with dispatch callback and runtime, returns `true`/`false`.
  - `finishDrag(event)` is safe when no active session exists; calls `finishDragSession` for runtime/DOM cleanup, then dispatches `dragDrop/dragFinished`, returns `true`/`false`.
  - `destroy()` is idempotent and safe after partial mount failure or active drag; sets `_isDisposed = true` first, calls `finishDragSession` for cleanup if needed, aborts controllers, removes listeners, clears timers, resets runtime buckets, and dispatches only `dragDrop/destroy`.
  - Dispatch ownership: `createDragDropController.js` is the only file that dispatches `dragDrop/dragFinished`; `session/finishDragSession.js` performs cleanup only.
  - `getState()` returns `undefined` after disposal, otherwise `selectors.readDragDropState(_KDB)`.
- **Rules to apply:** `module-public-api.mdc` (single public surface and disposed guards), `state.mdc` (canonical writer), `runtime.mdc` (cleanup before reset), `error-handling.mdc` (mandatory try/catch on named executables; mount/destroy convert errors), `amd.mdc`, `naming.mdc`.

### `config/defaults.js`

- **Role:** declarative defaults.
- **Lines:** target 45.
- **Return value:** object with default dimensions, avatar asset paths, source kind constants, accepted dragged element types, and fallback pad keys.
- **Rules to apply:** `state.mdc` (config, not state), `naming.mdc`, `amd.mdc`.

### `state/initialState.js`

- **Role:** state factory.
- **Lines:** target 30.
- **Return value:** fresh initial state from contract Section 4 with `session: null`, `lastValidation: null`, and `mountedAt: 0`; do not copy schema enum notation into JavaScript source.
- **Rules to apply:** `state.mdc` (serializable only), `lifecycleVocabulary.md`, `naming.mdc`, `amd.mdc`.

### `state/createDragDropReducer.js`

- **Role:** pure reducer.
- **Lines:** target 110.
- **Handled actions:** `dragDrop/mountSucceeded`, `dragDrop/dragStarted`, `dragDrop/dropValidated`, `dragDrop/dragFinished`, `dragDrop/error`, `dragDrop/destroy`.
- **Rules to apply:** `state.mdc` (pure and owner-only), `naming.mdc` (slash actions), `error-handling.mdc` (no throws for normal invalid input), `amd.mdc`.

### `state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 80.
- **Return value:** object containing `readDragDropState`, `readDragDropReady`, `readDragSession`, `readIsDragging`, `readLastValidation`.
- **Rules to apply:** `module-public-api.mdc` (granular reads through selector registry), `state.mdc` (read-only), `naming.mdc`, `amd.mdc`.

### `session/startDragSession.js`

- **Role:** dragstart/session coordinator.
- **Lines:** target 140, hard limit 150.
- **AMD imports:** `../config/defaults.js`, `../avatar/createDragAvatar.js`, `../avatar/moveDragAvatar.js`, `../avatar/suppressNativeDragImage.js`.
- **Entry function:** `__controller(_KDB, _event, _sourceInfo, _runtime, _dispatch)`.
- **Behavior:**
  1. Resolve native event from jQuery/native event.
  2. Validate `dataTransfer` and dragged element type.
  3. Resolve default dimensions from `_KDB.properties.*` using local dimension parsing, not `_KDB.utilities`.
  4. Resolve initial dropbox and scale.
  5. Build the serializable session/transfer payload locally with source offset, pad key, payload metadata, source kind, scale and timestamp.
  6. Remove stale avatar/source copy from runtime if present.
  7. Build hidden source copy, mark source, add layout grid class.
  8. Create custom avatar, append to `document.body`, move it using source offset.
  9. Register document `dragover` listener through runtime cleanup records or AbortController.
  10. Set `dataTransfer.effectAllowed = "copy"` and write the exact legacy payload to both `application/json` and `text/plain`.
  11. Call `suppressNativeDragImage`.
  12. Only after all required setup succeeds, dispatch `dragDrop/dragStarted`.
  13. Return `true`; on partial setup failure, cleanup owned runtime artifacts immediately, log with context, do not dispatch `dragDrop/dragStarted`, and return `false`.
- **Rules to apply:** `dom.mdc` (live refs in runtime), `runtime.mdc` (document listener cleanup), `state.mdc` (serializable session only), `error-handling.mdc` (mandatory try/catch on dragstart handler), `amd.mdc`, `naming.mdc`.

### `session/finishDragSession.js`

- **Role:** session cleanup.
- **Lines:** target 90.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB, _event, _runtime)`.
- **Behavior:** perform runtime and DOM cleanup only: remove avatar DOM, clear active dropbox class from `_runtime.domRefs.activeDropboxEl` / `_runtime.activeDropboxEl`, clear source markings, remove layout grid class, remove document dragover listener, remove temporary source copy, clear `sourceRuntime`, and return `true`/`false`. It must not dispatch `dragDrop/dragFinished`; the controller owns that dispatch. For a valid drop, this cleanup must run after validation/publish when those steps still need session/runtime payload data.
- **Rules to apply:** `runtime.mdc` (cleanup path), `dom.mdc` (remove owned DOM only), `error-handling.mdc`, `amd.mdc`, `naming.mdc`.

### `session/parseTransferPayload.js`

- **Role:** pure transfer parser.
- **Lines:** target 45.
- **Behavior:** parse JSON from the exact legacy key `application/json`; fall back to JSON from `text/plain`; return `null` on malformed input. If these keys cannot be confirmed from legacy evidence, stop and report the evidence gap before implementation.
- **Rules to apply:** `error-handling.mdc` (malformed data is expected invalid input, not a thrown reducer error), `naming.mdc`, `amd.mdc`.

### `avatar/createDragAvatarTemplates.js`

- **Role:** avatar template builder.
- **Lines:** target 100.
- **AMD imports:** `../config/defaults.js`.
- **Behavior:** create/update hidden visualization/text avatar templates under launchpad hide spot if available, otherwise fallback hidden mount; return runtime template records; do not store live nodes in state.
- **Rules to apply:** `dom.mdc` (DOM builder/runtime refs), `runtime.mdc`, `state.mdc`, `naming.mdc`, `amd.mdc`.

### `avatar/createDragAvatar.js`

- **Role:** active avatar/source-copy builder.
- **Lines:** target 100.
- **Behavior:** clone avatar template or source element, strip id, add `avatarClone`, fixed positioning, pointer-events none, high z-index, opacity, width/height, scale transform; build hidden source copy and mark source/tree node active.
- **Rules to apply:** `dom.mdc`, `runtime.mdc`, `naming.mdc`, `amd.mdc`.

### `avatar/moveDragAvatar.js`

- **Role:** avatar movement helper.
- **Lines:** target 35.
- **Behavior:** set avatar `left/top` to `clientX/clientY - session.offsetX/offsetY`; keep width/height from session. Do not compute widget placement.
- **Rules to apply:** `dom.mdc`, `naming.mdc`, `amd.mdc`.

### `avatar/suppressNativeDragImage.js`

- **Role:** native drag-image suppression.
- **Lines:** target 55.
- **Behavior:** if `dataTransfer.setDragImage` exists, create transparent 1x1 element, append to `document.body`, call `setDragImage`, register a timer/runtime cleanup to remove it immediately, and return `true`; otherwise return `false`.
- **Rules to apply:** `dom.mdc`, `runtime.mdc` (timer cleanup), `error-handling.mdc`, `naming.mdc`, `amd.mdc`.

### `dropboxes/bindDropboxes.js`

- **Role:** dropbox listener binder.
- **Lines:** target 120.
- **AMD imports:** `./readHelperTabIds.js`, `./updateDragHover.js`, `./publishValidatedDrop.js`.
- **Behavior:** before binding, remove or abort all previous dropbox listener bindings owned by `_KDB.runtime.dragDrop.listeners.dropboxes`; discover dropboxes using `_KDB.elements.dashboardDropboxes()`, skip helper tab ids via `readHelperTabIds`, set `data-kdb-drag-drop-bound` and `kdb_dropbox`, attach `dragenter`, `dragover`, `dragleave`, `drop`, and store cleanup descriptors under `_KDB.runtime.dragDrop.listeners.dropboxes`. It must not accumulate duplicate handlers on repeated `mount()` or `refreshDropboxes()`.
- **Rules to apply:** `dom.mdc` (listener cleanup), `runtime.mdc`, `state.mdc` (foreign launchpad read should be replaced by selector/API when available; document as legacy compatibility), `error-handling.mdc`, `amd.mdc`, `naming.mdc`.

### `dropboxes/readHelperTabIds.js`

- **Role:** temporary compatibility reader.
- **Lines:** target 35.
- **Behavior:** prefer `_KDB.api.launchpad.getState().helperTabIds` or an approved launchpad selector when available. If unavailable, read `_KDB.state.launchpad.helperTabIds` as the single isolated CP-1 compatibility exception; return a copied string array.
- **Rules to apply:** `state.mdc` (foreign read is isolated and documented), `module-public-api.mdc` (prefer owner API/selector), `naming.mdc`, `amd.mdc`.

### `dropboxes/updateDragHover.js`

- **Role:** hover/drop-effect controller.
- **Lines:** target 110.
- **AMD imports:** `./resolveDropboxGeometry.js`, `../avatar/moveDragAvatar.js`.
- **Behavior:** preserve `handleDragEnter`, `handleDragOver`, `handleDragLeave`, `clearActiveDropbox`; prevent default where legacy did; move avatar; set active class and `dropEffect`; reject out-of-bounds with `dropEffect = "none"`.
- **Rules to apply:** `dom.mdc`, `runtime.mdc`, `error-handling.mdc`, `amd.mdc`, `naming.mdc`.

### `dropboxes/resolveDropboxGeometry.js`

- **Role:** geometry helper.
- **Lines:** target 110.
- **Return value:** object with `resolveDropboxMetrics`, `resolvePointerWithinDropbox`, `resolveRenderedPlacement`, `isPlacementWithinBounds`.
- **Behavior:** preserve legacy coordinate math: client -> dropbox-local offset -> minus drag offset -> rendered placement/bounds; no widget placement or scale-to-layout persistence.
- **Rules to apply:** `state.mdc` (pure helper), `naming.mdc`, `amd.mdc`.

### `dropboxes/validateDropIntent.js`

- **Role:** drop validation.
- **Lines:** target 120.
- **AMD imports:** `./resolveDropboxGeometry.js`.
- **Behavior:** preserve invalid dropbox, helper-tab, invalid type, bounds, and filter-name conflict validation. Return `{ isValid, reason }`; do not throw for invalid input.
- **Rules to apply:** `state.mdc` (read-only), `error-handling.mdc` (invalid input returns result), `naming.mdc`, `amd.mdc`.

### `dropboxes/publishValidatedDrop.js`

- **Role:** validated drop boundary.
- **Lines:** target 130.
- **AMD imports:** `../events/eventNames.js`, `../session/parseTransferPayload.js`, `./resolveDropboxGeometry.js`, `./validateDropIntent.js`.
- **Behavior:** parse transfer payload, resolve dropbox, remove active class, resolve layout payload, validate, show legacy validation warning where applicable, dispatch `dragDrop/dropValidated` for owned state, emit `eventNames.DROP_VALIDATED` with JSON-serializable payload, then run final session cleanup in a finally-style path through controller/session cleanup. Do not clear session/runtime data before building the validated payload.
- **Rules to apply:** `events.mdc` (fact-event only after validation; constants only; catalog required), `state.mdc` (no foreign writes), `runtime.mdc` (temporary cleanup), `error-handling.mdc`, `amd.mdc`, `naming.mdc`.

### `events/eventNames.js`

- **Role:** event constants.
- **Lines:** target 20.
- **Return value:**
  ```js
  {
    DROP_VALIDATED: "canvas:dropValidated"
  }
  ```
- **Rules to apply:** `events.mdc` (canonical emitter-owned constant home and catalog entry), `naming.mdc`, `amd.mdc`.

### `core/utils/__orchestratorUtils.js`

- **Role:** utility orchestrator update.
- **Lines:** existing file; keep within hard limit 120.
- **AMD imports:** add `./throttle.js` after existing utility imports.
- **Behavior:** register `_KDB.utils.throttle = _throttle` alongside existing `convertUnitToPx` and `readCurrentTab`; return `_KDB.utils`.
- **Rules to apply:** `kdb-object.mdc` (`_KDB.utils` is allowed), `module-public-api.mdc` (utility functions may publish under `_KDB.utils`), `amd.mdc`, `naming.mdc`, `error-handling.mdc` (preserve orchestrator try/catch).
- **Forbidden:** do not modify `throttle.js` behavior in this tranche.

### `KDB.js`

- **Role:** bootstrap wiring update.
- **Lines:** existing approved exception file; keep changes limited to bootstrap wiring.
- **AMD imports:** add `./core/utils/__orchestratorUtils.js` in the dependency array and `_orchestratorUtils` in the factory parameters, preserving one-to-one order.
- **Behavior:** call `_orchestratorUtils(_KDB)` inside `setupCoreFactories(_KDB)` before `registerFeatureModules(_KDB)`.
- **Rules to apply:** `feature-structure.mdc` (`KDB.js` may grow for bootstrap wiring only), `amd.mdc` (dependency/parameter order), `kdb-object.mdc` (`_KDB.utils` allowed), `error-handling.mdc` (root bootstrap named executables have mandatory try/catch).
- **Forbidden:** do not change root lifecycle semantics, public renderer API, module behavior, or unrelated bootstrap order.

---

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `dragDrop/mountSucceeded` | `mount()` created templates and bound dropboxes | Clear errors, set `mountedAt`. | `idle/error -> ready` |
| `dragDrop/dragStarted` | Successful `startDrag()` | Store serializable session, set `isDragging: true`, clear last validation. | lifecycle remains `ready` |
| `dragDrop/dropValidated` | Successful validation before boundary emit | Store serializable validation summary. | lifecycle remains `ready` |
| `dragDrop/dragFinished` | `finishDrag()`, cancel, invalid drop cleanup | Clear session, set `isDragging: false`. | `ready -> ready` |
| `dragDrop/error` | Public boundary failure | Store `errorCode`, `errorMessage`, set `isDragging: false`. | `<current> -> error` |
| `dragDrop/destroy` | `destroy()` | Clear session/validation/errors and mark not dragging. | `<current> -> disposed` |

No `active`, `dragging`, or `cancelled` lifecycle terms are introduced.

Implementation must verify `idle`, `ready`, `error`, and `disposed` against `lifecycleVocabulary.md`. If any term is not approved, stop and escalate before writing production code.

---

## Section F. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readDragDropState` | `_KDB.state.dragDrop` | Full subtree or `undefined`. |
| `readDragDropReady` | `lifecycle` | `true` only when `ready`. |
| `readDragSession` | `session` | Session copy or `null`. |
| `readIsDragging` | `isDragging` | Boolean. |
| `readLastValidation` | `lastValidation` | Validation copy or `null`. |

`lastValidation` must be serializable:

```txt
isValid: boolean
reason: string | null
dropboxId: string | null
draggedElementType: string | null
validatedAt: number
```

---

## Section G. Public API wiring

- Surface: `_KDB.api.dragDrop`.
- Methods exposed: `mount`, `destroy`, `refreshDropboxes`, `startDrag`, `finishDrag`, `getState`.
- `_KDB.runtime.dragDrop` buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`, `dropboxesById`, `sourceRuntime`.
- `_KDB.state.dragDrop`: initialized from `state/initialState.js`.
- Utility bootstrap registration in `KDB.js`: in scope only for `_orchestratorUtils` import/call and `_KDB.utils.throttle` availability.
- DragDrop bootstrap registration in `KDB.js`: still deferred unless CP-1 explicitly expands dragDrop bootstrap scope.

---

## Section H. Event catalog and bootstrap notes

- CP-1 event decision:
  - A: approve narrow `eventSubscribe.md` update for `canvas:dropValidated`; create `events/eventNames.js` and `dropboxes/publishValidatedDrop.js`.
  - B: do not approve the catalog update; do not create any production files from this execution spec and stop for a contract/spec delta.
- `eventSubscribe.md` update: required if `canvas:dropValidated` is emitted in this tranche.
- `events/eventNames.js`: created only with CP-1 event approval.
- Utility bootstrap registration in `KDB.js`: approved in this CP-1 scope expansion.
- DragDrop bootstrap registration in `KDB.js`: required later for production execution, but deferred by session scope unless separately approved.
- Static import check after implementation: verify all AMD paths resolve within `dashboard/canvas/dragDrop/` and no imports from `TEST/` or legacy trees.

Proposed event catalog entry if CP-1 approves:

```md
### `canvas:dropValidated`

- **Type:** fact
- **Emitter:** `dragDrop`
- **Confirmation point:** `validateDropIntent` returned `{ isValid: true }` and the drop payload layout was resolved from the native drop event.
- **Payload:** `{ draggedElementType, dropboxId, layout, originId, padKey, payload, sourceKind, startedAt, tabId }`
- **Subscribers:** future `widgets`/canvas owner.
- **Teardown owner:** subscriber's `destroy()` removes the subscription via `_KDB.runtime.<subscriber>.subscriptions`.
```

Do not edit `eventSubscribe.md` unless CP-1 explicitly approves that scope.

---

## Section I. Acceptance criteria

1. Every file in Section B exists after execution, unless event scope is not approved and the spec is stopped for a contract delta.
2. No production file is created before CP-1 approval.
3. No `TEST/`, browser harness, legacy file, rule file, architecture authority doc, or template is modified.
4. Every production file uses full-compact AMD `define([...], function (...) { ... })`.
5. No file contains ES module syntax, CommonJS `require`, multiple `define` calls, or inline nested subfunction definitions inside entry bodies/callbacks.
6. `_KDB.api.dragDrop` exposes only `mount`, `destroy`, `refreshDropboxes`, `startDrag`, `finishDrag`, `getState`.
7. Every public method has disposed-state discipline per `module-public-api.mdc`.
8. Public methods and DOM/event boundaries have `try/catch` with contextual `console.error` and `false`/no-op return behavior.
9. `_KDB.state.dragDrop` contains only serializable values; no promises, subscriptions, DOM refs, handlers, controllers, timers, or events.
10. `_KDB.runtime.dragDrop` owns avatar DOM, source copy, dropbox refs, listeners, timers, and cleanup buckets.
11. `mount` is idempotent and does not duplicate avatar templates, dropbox listeners, document listeners, or runtime refs.
12. `refreshDropboxes` removes or aborts previous dropbox listener bindings before registering new `dragenter`, `dragover`, `dragleave`, or `drop` handlers.
13. `destroy` is safe after partial mount failure and after an active drag session.
14. `finishDrag` and `destroy` remove avatar, source copy, active source/dropbox classes, document dragover listener, timer-created native drag image, and layout grid class.
15. Native drag image is suppressed with temporary transparent 1x1 `setDragImage` element during `dragstart`.
16. Transfer payload is written to both `application/json` and `text/plain` and parsed in that order.
17. Custom avatar follows pointer by subtracting source offset from `clientX/clientY`.
18. Drop payload uses dropbox-local coordinates and drag offset; raw `clientX/clientY` is not exposed as final widget placement.
19. For valid drops, validation and publish happen before final session cleanup when payload/runtime data is still needed; cleanup always runs afterward.
20. `startDragSession` dispatches `dragDrop/dragStarted` only after required setup succeeds; on partial failure it cleans up owned runtime artifacts and returns `false`.
21. Only the controller dispatches `dragDrop/dragFinished`; `finishDragSession` performs cleanup only.
22. `dragDrop` does not place widgets, write `_KDB.state.widgets`, write `_KDB.runtime.widgets`, update history, configure widgets, or port `placeWidgetOnCanvas.js`.
23. Only `visualization` and `text` dragged element types validate.
24. Legacy `kennzahlenTree` behavior maps to production `metricsTree` where applicable; no new `kennzahlenTree` dependency is introduced from `dragDrop`.
25. Metrics/kennzahl tree behavior remains source-owner behavior: only `.jstree-leaf` nodes are draggable; parent nodes are blocked; payload metadata is preserved where source adapters call `startDrag`.
26. Toolbox behavior remains source-owner behavior: only the text/comment button is draggable with `sourceKind: "toolboxTextButton"`.
27. Event emission uses `eventNames.DROP_VALIDATED` only after CP-1 approved the event catalog scope; no hardcoded event strings at emit sites.
28. If CP-1 does not approve the event catalog scope, no partial production implementation is created from this spec.
29. `core/utils/__orchestratorUtils.js` registers existing `throttle.js` as `_KDB.utils.throttle` without changing throttle behavior.
30. `KDB.js` imports and calls `_orchestratorUtils(_KDB)` during core setup before feature modules mount; no unrelated bootstrap/lifecycle behavior changes.
31. DragDrop bootstrap registration remains deferred unless separately approved.
32. `ReadLints` is run on all new/modified production files after implementation.
33. Static AMD import inspection confirms every new import resolves.
34. CP-2 report states: lint result, rule-check result, diff-walk result, bootstrap registration status, event-catalog status.

---

## Section J. Forbidden actions

The executing AI must not:

- Modify any file before CP-1 approval.
- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, or templates unless CP-1 explicitly expands scope.
- Modify `_____________KDB3API/contracts/dragDrop.md` after approval unless a contract delta is explicitly requested.
- Modify `KDB.js` beyond the approved utility bootstrap import/call unless CP-1 explicitly changes bootstrap scope.
- Read legacy folders linearly or modify any file under `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Create `TEST/` files, harness files, browser tests, README files, or CSS files.
- Create `core/dragDrop/` or split core/dashboard architecture.
- Port `placeWidgetOnCanvas.js`, widget route logic, widget placement, widget state writes, widget configuration, or history writes into `dragDrop`.
- Introduce pointer/touch support or behavior changes beyond rule-alignment.
- Emit a new event without an approved `eventSubscribe.md` catalog entry.
- Commit, push, or change git config.

---

## Section K. Reporting template

The executing AI reports:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every path created with line count and `matches spec | deviation`.
3. **Event/bootstrap notes** — whether CP-1 approved `canvas:dropValidated` catalog scope; utility bootstrap completed; dragDrop `KDB.js` registration deferred unless CP-1 changed scope.
4. **Omitted legacy behavior** — confirm `placeWidgetOnCanvas.js`, widgets route logic, and source-owner binders were not ported into generic `dragDrop`.
5. **Self-verification** — pass/fail for all Section I criteria.
6. **Open questions** — only if the spec proved insufficient; otherwise `none`.

---

## Section L. Reviewer handoff

The supervising AI performs after implementation:

1. Verify the pre-flight summaries.
2. Read every created production file.
3. Run `ReadLints` on all new/modified production files.
4. Cross-check each file against Section D rules.
5. Diff-walk against legacy: confirm rule-alignment only, native drag/drop behavior preserved, and placement/widget behavior intentionally excluded.
6. Static inspect AMD imports and note bootstrap registration is deferred unless CP-1 approved it.
7. Confirm `eventSubscribe.md` status matches CP-1 scope.
8. Stop at CP-2 for user diff-walk + integration-check approval.

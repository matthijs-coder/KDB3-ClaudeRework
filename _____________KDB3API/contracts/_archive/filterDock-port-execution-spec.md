# Execution Spec: `filterDock` (Mode 2 direct port)

> Direct-port execution spec for the `filterDock` dashboard filters subsystem / feature module.
> Execute only after CP-1 approval of `contracts/filterDock.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/filterDock.md`
**Phase:** `Mode 2 direct production port`
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
5. `_____________KDB3API/.cursor/rules/events.mdc` — direct API vs fact/request events; no event emission without catalog approval.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, action/event naming, underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors in `_KDB.elements.selectors`, live refs in runtime, scoped DOM queries.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — read and verify that `idle`, `ready`, `error`, and `disposed` are approved lifecycle terms.
12. `_____________KDB3API/contracts/_template.md` — contract shape.
13. `_____________KDB3API/contracts/filterDock.md` — approved CP-1 contract for this direct port.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create files only after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
  __orchestratorFilterDock.js
  createFilterDockController.js
  config/
    actions.js
    selectors.js
  state/
    initialState.js
    createFilterDockReducer.js
    selectors.js
  effects/
    bindDockClickListener.js
    resolveFilterInteraction.js
  observation/
    bindDockObserver.js
    scheduleObservedStateEvaluation.js
    evaluateObservedDockState.js
    normalizeMutationSignals.js
  compat/
    getFilterConfig.js
    resolveFilterCapabilities.js
    resolveKennzahlenSource.js
```

Do not create:

```txt
events/eventNames.js
observers/
```

`compat/` contains rule-aligned compatibility readers only. It must not contain copied legacy orchestration or DOM mutation logic.

Do not modify in this tranche:

```txt
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/architecture/eventSubscribe.md
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
_____________KDB3API/KDB3/js/dashboard/filters/dienststelle/
```

---

## Section C. Recommended CP-1 new architecture

Recommended CP-1 decision: Mode 2:

- Central dock-level click listener in `filterDock`.
- Long-lived dock `MutationObserver` in `filterDock`.
- Observed dock state under `_KDB.state.filters.filterDock`.
- Parallel observed state slices, not a single observer status machine.
- Console logging of the generated click interaction object after every handled click.
- Sibling reactions deferred; no `singleSelect`, `sicht`, or `dienststelle` modifications.
- Direct API is the canonical future consumption path; events are deferred.
- `filterDock.mount()` does not own global wait-for-dock orchestration; the future filters orchestrator owns wait/retry timing.
- For this Mode 2 discovery tranche, click interaction logging is always enabled with `console.log("[filterDock.click]", interaction)`.

Acceptance criteria for new architecture:

1. `mount()` installs at most one click listener and at most one dock observer.
2. Repeated `mount()` calls do not duplicate listeners, observers, scheduled evaluations, timers, or runtime refs.
3. Every handled click creates a serializable `interaction` object and logs it with `console.log("[filterDock.click]", interaction)`.
4. Click handling dispatches only owner state actions under `_KDB.state.filters.filterDock`.
5. The MutationObserver callback records raw signals and schedules a coalesced evaluation; it does not do heavy DOM parsing or sibling routing inline.
6. Coalesced evaluation uses `requestAnimationFrame` by default, falling back to `setTimeout(..., 0)` only when needed.
7. `lastClickedFilter`, `popup`, `observedChildren`, `pendingSignals`, and `lastInteraction` are independent slices; updates to one slice do not reset unrelated slices.
8. No sibling API calls are made in this tranche.
9. No events are emitted and no event catalog files are edited in this tranche.
10. `destroy()` disconnects observer, aborts/removes click listener, cancels scheduled evaluation, clears timers, clears live refs, and dispatches `filterDock/destroy`.
11. All public methods and scheduled callbacks no-op after disposal without throwing.
12. If the dock root is missing, `mount()` returns `false`, logs a boundary warning, creates no listener or observer, and does not set lifecycle `error`.

---

## Section D. Legacy mapping table

| New production file | Legacy source(s) | Rule-alignment / Mode 2 note |
|---|---|---|
| `__orchestratorFilterDock.js` | `filters/__filtersOrchestrator.js`, `filterDock/filterDock.js` | Register `_KDB.api.filterDock`, initialize `_KDB.state.filters.filterDock`, runtime buckets and selector config; no sibling startup or routing. |
| `createFilterDockController.js` | `filterDock/filterDock.js`, `filters/__filtersOrchestrator.js` | Own public dispatch surface, disposed guards, mount/destroy, click/observer binding, reducer dispatch, idempotency. |
| `config/actions.js` | Legacy action-less direct writes | Define slash-style action constants for reducer dispatch. |
| `config/selectors.js` | Legacy hardcoded selectors in filterDock and popup files | Centralize selector strings for dock root, filter items, popup, options, OK/Cancel/Clear/Close. |
| `state/initialState.js` | Legacy `_KDB.state.filters.listeners`, routing, popup-local status evidence | Create serializable parallel state slices under `_KDB.state.filters.filterDock`; no DOM refs, listeners, observer handles, or functions. |
| `state/createFilterDockReducer.js` | Legacy direct state writes in `filterDock.js` and `__filtersOrchestrator.js` | Replace direct writes with pure owner reducer actions; merge parallel slices without overwriting unrelated observed facts. |
| `state/selectors.js` | New contract requirement | Publish read-only selectors for full state, last click, popup, observed children, last interaction. |
| `effects/bindDockClickListener.js` | `filterDock/filterDock.js` | Bind one central click listener on `#filterDockContainer`; generate and log interaction object after every click; cleanup via runtime. |
| `effects/resolveFilterInteraction.js` | `filterDock/buildFilterInfoObj.js`, `singleSelect/deriveInteractionIntent.js` | Convert click target and filter element into serializable interaction and last-clicked metadata; live DOM refs stay out of state. |
| `observation/bindDockObserver.js` | `singleSelect/restorePopupSelection.js`, `sicht/restorePopupSelection.js` local observer evidence | Create one long-lived dock observer under runtime; callback only records raw signals and schedules evaluation. |
| `observation/scheduleObservedStateEvaluation.js` | Local coalescing patterns in popup restore files | Coalesce mutation signals with `requestAnimationFrame` default; avoid heavy observer callback work; cancel/no-op after destroy. |
| `observation/evaluateObservedDockState.js` | Popup DOM reads in `singleSelect/restorePopupSelection.js`, `sicht/restorePopupSelection.js` | Read dock/popup/options/footer DOM and dispatch serializable popup/children slice updates; no sibling logic. |
| `observation/normalizeMutationSignals.js` | `MutationObserver` callback evidence in sibling popup files | Convert raw mutation records to counts/signatures/timestamps only; no DOM refs in returned object. |
| `compat/getFilterConfig.js` | `filterDock/getFilterConfig.js` | Rule-align as AMD compatibility reader with explicit `_KDB` input; preserve lookup behavior. |
| `compat/resolveFilterCapabilities.js` | `filterDock/resolveFilterCapabilities.js` | Preserve upstream/sicht, hierarchy/dienststelle, singleSelect and Alle-option detection; rename concepts in output where needed. |
| `compat/resolveKennzahlenSource.js` | `filterDock/resolveKennzahlenSource.js` | Preserve source lookup via allowed AMD import or `_KDB.utils`; no window global lookup. |

Legacy files intentionally not ported in this tranche:

| Legacy path | Reason |
|---|---|
| `singleSelect/**` | Evidence only; sibling reactions deferred to later direct API integration. |
| `sicht/**` | Evidence only; sibling reactions deferred. |
| `stelleHierarchy/**` | Evidence for future `dienststelle`; no sibling production files in this tranche. |
| `filters/__filtersOrchestrator.js` | Future production `__orchestratorFilters.js` is deferred with bootstrap discussion. |

---

## Section E. Per-file specifications

Every production file uses full-compact AMD form and returns exactly one value.

### `__orchestratorFilterDock.js`

- **Role:** feature-module orchestrator.
- **Lines:** target 80, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./config/selectors.js`, `./createFilterDockController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:**
  1. Ensure `_KDB.state`, `_KDB.state.filters`, `_KDB.runtime`, `_KDB.api`, `_KDB.elements`, `_KDB.elements.selectors`.
  2. Initialize `_KDB.state.filters.filterDock` from `initialState()` if absent.
  3. Initialize `_KDB.runtime.filterDock` buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`.
  4. Register `_KDB.elements.selectors.filterDock` from config without overwriting user-provided keys.
  5. Create controller with `{ _KDB, options }`.
  6. Register `_KDB.api.filterDock = controller`.
  7. Return controller.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`.

### `createFilterDockController.js`

- **Role:** controller factory.
- **Lines:** target 140, preferred hard limit 180. If dense, extract focused cleanup helper files and document the deviation in the CP-2 report.
- **AMD imports:** `./config/actions.js`, `./state/createFilterDockReducer.js`, `./state/selectors.js`, `./effects/bindDockClickListener.js`, `./observation/bindDockObserver.js`.
- **Entry function:** `createFilterDockController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Factory-scope helpers:** `ensureRuntime`, `dispatchInternal`, `clearRuntime`, `cleanupSubscriptions`, `cleanupListeners`, `abortControllers`, `disconnectObservers`, `clearTimers`, `warnDisposed`, `handleBoundaryError`, `toErrorMessage`.
- **Behavior:**
  - Hold `_isDisposed` in controller closure, not state.
  - `mount(options)` guards disposed, ensures runtime, verifies the dock root exists, binds click listener, binds dock observer, dispatches `filterDock/mountSucceeded`, returns `true`/`false`.
  - If the dock root is missing, `mount(options)` logs `console.warn("[filterDock.mount] dock root not found")`, creates no listener or observer, does not dispatch `filterDock/error`, and returns `false`.
  - `mount(options)` is idempotent and must not duplicate listener/observer/evaluation resources.
  - `dispatch(action)` guards disposed, routes through reducer, returns the updated state snapshot or `undefined`.
  - `getState()` returns `undefined` after disposal, otherwise selectors full snapshot.
  - `destroy()` is idempotent; set `_isDisposed = true` first, cancel evaluation, disconnect observers, abort controllers, cleanup listeners/subscriptions/timers, clear runtime refs, dispatch `filterDock/destroy`.
  - Listener cleanup must handle both paths idempotently: abort `_runtime.abortControllers.dockClick` when present and remove `_runtime.listeners.dockClick` when the fallback cleanup record exists.
  - All catches log with `console.error("[filterDock.<method>] failed", error)` and dispatch `filterDock/error` when state still exists.
- **Rules to apply:** `module-public-api.mdc` (single public surface and disposed guards), `state.mdc` (canonical writer), `runtime.mdc` (cleanup before reset), `error-handling.mdc` (mandatory try/catch on named executables; mount/destroy convert errors), `amd.mdc`, `naming.mdc`.

### `config/actions.js`

- **Role:** action constants.
- **Lines:** target 50.
- **Return value:** object with constants for `MOUNT_SUCCEEDED`, `CLICK_OBSERVED`, `MUTATIONS_OBSERVED`, `POPUP_OBSERVED`, `EVALUATION_SCHEDULED`, `EVALUATION_FINISHED`, `ERROR`, `DESTROY`.
- **Action values:** slash-style strings from contract Section 7, e.g. `filterDock/clickObserved`.
- **Rules to apply:** `naming.mdc` (UPPER_SNAKE constants, slash action names), `amd.mdc`, `feature-structure.mdc`.

### `config/selectors.js`

- **Role:** selector config.
- **Lines:** target 70.
- **Return value:** object with the selectors from contract Section 11.
- **Rules to apply:** `dom.mdc` (selector strings under `_KDB.elements.selectors.filterDock`), `naming.mdc`, `amd.mdc`.

### `state/initialState.js`

- **Role:** state factory.
- **Lines:** target 70.
- **Return value:** fresh state object from contract Section 4.
- **Behavior:** all nested slices are serializable and freshly allocated; `lastClickedFilter` and `lastInteraction` start as `null`.
- **Rules to apply:** `state.mdc` (serializable only), `lifecycleVocabulary.md` (canonical lifecycle terms), `naming.mdc`, `amd.mdc`.

### `state/createFilterDockReducer.js`

- **Role:** pure reducer.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** `../config/actions.js`, `./initialState.js`.
- **Handled actions:**
  - `filterDock/mountSucceeded`
  - `filterDock/clickObserved`
  - `filterDock/mutationsObserved`
  - `filterDock/popupObserved`
  - `filterDock/evaluationScheduled`
  - `filterDock/evaluationFinished`
  - `filterDock/error`
  - `filterDock/destroy`
- **Behavior:**
  - Return a new state object or a shallow cloned state with updated slices; do not mutate input state in place.
  - Preserve unrelated slices on every action.
  - `clickObserved` updates `lastClickedFilter`, `lastInteraction`, `pendingSignals.clickCount`, optional popup fields if supplied, and `updatedAt`.
  - `mutationsObserved` updates only `observedChildren`, `pendingSignals.mutationCount`, and `updatedAt`.
  - `popupObserved` updates only `popup` and `updatedAt`.
  - `evaluationScheduled` records `pendingSignals.scheduledAt`.
  - `evaluationFinished` clears/normalizes pending signal counts without clearing last click or popup state.
  - Reducer never stores DOM nodes, events, MutationRecords, functions, timers, or observer handles.
- **Rules to apply:** `state.mdc` (pure, serializable owner state), `naming.mdc` (slash actions), `error-handling.mdc` (no reducer throws), `amd.mdc`.

### `state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 90.
- **Return value:** object containing `readFilterDockState`, `readLastClickedFilter`, `readPopupState`, `readObservedChildren`, `readLastInteraction`.
- **Behavior:** return shallow copies for object slices where practical; never mutate state.
- **Rules to apply:** `module-public-api.mdc` (granular reads through selector registry), `state.mdc` (read-only), `naming.mdc`, `amd.mdc`.

### `effects/bindDockClickListener.js`

- **Role:** DOM event binder.
- **Lines:** target 120, hard limit 150.
- **AMD imports:** `./resolveFilterInteraction.js`.
- **Entry function:** `__controller(_KDB, _runtime, _dispatch, _options)`.
- **Behavior:**
  1. Resolve dock root from `_KDB.elements.selectors.filterDock.rootSelector`.
  2. If the dock root is missing, log `console.warn("[filterDock.mount] dock root not found")`, create no listener, and return `false`.
  3. If a click listener already exists in runtime, return `true` without rebinding.
  4. Create an `AbortController` when available and store it under `_runtime.abortControllers.dockClick`; otherwise store `{ element, type, handler }` under `_runtime.listeners.dockClick`.
  5. Add one delegated click listener.
  6. On click, guard disposed through `_options.isDisposed()` if provided.
  7. Resolve interaction via `resolveFilterInteraction`.
  8. If no relevant interaction, return.
  9. Store live refs only under `_runtime.domRefs.lastClickedElement` / `activeFilterEl` when needed.
  10. Log the generated object exactly with `console.log("[filterDock.click]", interaction)`.
  11. Dispatch `filterDock/clickObserved` with serializable payload only.
  12. Do not call sibling APIs and do not emit events.
- **Rules to apply:** `dom.mdc` (scoped queries, live refs in runtime), `runtime.mdc` (listener cleanup), `state.mdc` (serializable dispatch payload), `error-handling.mdc` (mandatory try/catch on event handlers; log and convert or rethrow), `amd.mdc`, `naming.mdc`.

### `effects/resolveFilterInteraction.js`

- **Role:** click interaction normalizer.
- **Lines:** target 140, hard limit 150.
- **AMD imports:** `../compat/getFilterConfig.js`, `../compat/resolveFilterCapabilities.js`, `../compat/resolveKennzahlenSource.js`.
- **Entry function:** `__controller(_KDB, _event, _selectors)`.
- **Behavior:**
  - Resolve target, nearest filter item, filter label/id, filter scope, source element signature, and interaction type.
  - Determine filter type:
    - upstream/cascading -> `sicht`
    - hierarchy / legacy `stelleHierarchy` -> `dienststelle`
    - singleSelect -> `singleSelect`
    - otherwise `unknown`
  - Build `lastClickedFilter` and `interaction` payloads per contract Section 4.
  - Include popup snapshot fields when cheaply available from the current DOM.
  - Return `{ lastClickedFilter, interaction }` or `null`.
  - Do not include DOM nodes, events, classList objects, MutationRecords, or functions in returned values.
- **Rules to apply:** `state.mdc` (serializable), `dom.mdc` (scoped reads), `naming.mdc` (English names), `amd.mdc`, `error-handling.mdc` (invalid DOM is normal no-op, not throw).

### `observation/bindDockObserver.js`

- **Role:** observer binder.
- **Lines:** target 90.
- **AMD imports:** `./scheduleObservedStateEvaluation.js`.
- **Entry function:** `__controller(_KDB, _runtime, _dispatch, _options)`.
- **Behavior:**
  1. Resolve dock root from selector config.
  2. If the dock root is missing, log `console.warn("[filterDock.mount] dock root not found")`, create no observer, and return `false`.
  3. If `_runtime.observers.dock` exists, return `true`.
  4. Create one `MutationObserver`.
  5. Observe child list, subtree, and relevant attributes (`class`, `style`, `aria-disabled`, `data-tid`) when supported.
  6. Observer callback must only call `scheduleObservedStateEvaluation` with raw mutation records and context.
  7. Store observer at `_runtime.observers.dock`.
  8. Return `true`/`false`.
- **Rules to apply:** `runtime.mdc` (observer cleanup), `dom.mdc` (dock root scope), `error-handling.mdc` (mandatory try/catch on observer callback), `amd.mdc`, `naming.mdc`.

### `observation/scheduleObservedStateEvaluation.js`

- **Role:** coalescing scheduler.
- **Lines:** target 110.
- **AMD imports:** `./normalizeMutationSignals.js`, `./evaluateObservedDockState.js`.
- **Entry function:** `__controller(_KDB, _runtime, _dispatch, _mutationRecords, _options)`.
- **Behavior:**
  - If disposed, return `false`.
  - Normalize raw mutation signals to serializable summary and dispatch `filterDock/mutationsObserved` when useful.
  - If an evaluation is already scheduled, merge signal counters/signatures and return `true`.
  - When merging while already scheduled, mutation counts accumulate, the latest added/removed signatures win, and `scheduledAt` stays the first scheduled timestamp until `evaluationFinished`.
  - Schedule one evaluation via `requestAnimationFrame` when available; fallback to `setTimeout(..., 0)`.
  - Store the handle under `_runtime.timers.observedStateEvaluation`.
  - Dispatch `filterDock/evaluationScheduled`.
  - In scheduled callback, no-op if disposed; otherwise call `evaluateObservedDockState`, then dispatch `filterDock/evaluationFinished`.
  - Always clear the runtime handle after the callback runs or is cancelled.
- **Rules to apply:** `runtime.mdc` (timer cleanup), `error-handling.mdc` (mandatory try/catch on scheduled/async callbacks), `state.mdc` (serializable signals), `amd.mdc`, `naming.mdc`.

### `observation/evaluateObservedDockState.js`

- **Role:** dock DOM evaluator.
- **Lines:** target 130, hard limit 150.
- **Entry function:** `__controller(_KDB, _runtime, _dispatch, _options)`.
- **Behavior:**
  - Resolve dock root and active popup/filter from runtime refs and selectors.
  - Read popup visibility, active filter id/type where available, option count, OK/Cancel presence.
  - Build serializable popup slice with `observedAt`.
  - Store live popup/filter refs only in `_runtime.domRefs`, not in state.
  - Dispatch `filterDock/popupObserved`.
  - Do not call sibling APIs and do not emit events.
- **Rules to apply:** `dom.mdc` (scoped queries, live refs in runtime), `state.mdc` (serializable popup slice), `error-handling.mdc`, `amd.mdc`, `naming.mdc`.

### `observation/normalizeMutationSignals.js`

- **Role:** pure MutationRecord normalizer.
- **Lines:** target 80.
- **Entry function:** `__controller(_mutationRecords)`.
- **Behavior:**
  - Count added/removed nodes.
  - Build string signatures for the most recent added/removed element when possible (`tagName`, `data-tid`, id/class summary).
  - Return `{ addedCount, removedCount, lastAddedSignature, lastRemovedSignature, observedAt }`.
  - Never return DOM nodes, MutationRecords, NodeLists, functions, or classList objects.
- **Rules to apply:** `state.mdc` (serializable only), `naming.mdc`, `amd.mdc`.

### `compat/getFilterConfig.js`

- **Role:** rule-aligned compatibility config reader.
- **Lines:** target 50.
- **AMD imports:** `./resolveKennzahlenSource.js`.
- **Entry function:** `__controller(_KDB, _filterLabel, _filterScope, _kennzahlenSource)`.
- **Behavior:** preserve legacy lookup in `_KDB.properties.filterPropObj` for global/pageContext filters; return `null` if missing.
- **Rules to apply:** `state.mdc` (read-only), `amd.mdc`, `naming.mdc`, `error-handling.mdc` (invalid config returns null).

### `compat/resolveFilterCapabilities.js`

- **Role:** rule-aligned compatibility capability reader.
- **Lines:** target 80.
- **Entry function:** `__controller(_filterConfig, _KDB)`.
- **Behavior:** preserve upstream/downstream, hierarchy/dienststelle, singleSelect, Alle availability and condition detection. Return booleans and condition only.
- **Rules to apply:** `state.mdc` (read-only), `naming.mdc`, `amd.mdc`.

### `compat/resolveKennzahlenSource.js`

- **Role:** source resolver adapter.
- **Lines:** target 30.
- **AMD imports:** approved production utility if available; otherwise document unresolved dependency and stop before production implementation.
- **Entry function:** `__controller(_KDB)`.
- **Behavior:** preserve legacy source lookup without `window` globals.
- **Rules to apply:** `amd.mdc` (explicit import), `kdb-object.mdc` (no forbidden legacy namespace), `naming.mdc`.

---

## Section F. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `filterDock/mountSucceeded` | `mount()` completed listener/observer binding | Set `mountedAt`, `updatedAt`, clear error fields | `idle -> ready` or `ready -> ready` |
| *(no action)* | `mount()` cannot find dock root | Log warning and return `false`; no listener/observer and no state error | no lifecycle change |
| `filterDock/clickObserved` | Central click listener generated interaction | Merge `lastClickedFilter`, `lastInteraction`, increment click signal, optional popup merge | no lifecycle change |
| `filterDock/mutationsObserved` | Observer callback normalized raw mutation signals | Merge `observedChildren`, increment mutation signal | no lifecycle change |
| `filterDock/popupObserved` | Coalesced evaluation read popup DOM | Merge `popup` slice | no lifecycle change |
| `filterDock/evaluationScheduled` | Scheduler queued evaluation | Set `pendingSignals.scheduledAt` | no lifecycle change |
| `filterDock/evaluationFinished` | Scheduled evaluation completed | Clear/normalize pending signal counters | no lifecycle change |
| `filterDock/error` | Public/effect boundary catch | Set `lifecycle: "error"`, `errorCode`, `errorMessage` | `* -> error` |
| `filterDock/destroy` | `destroy()` cleanup completed | Set `lifecycle: "disposed"`; clear transient pending signals | `* -> disposed` |

---

## Section G. Public API wiring

- Surface: `_KDB.api.filterDock`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- `_KDB.state.filters.filterDock`: initialized by orchestrator from `initialState()`.
- `_KDB.runtime.filterDock`: initialized by orchestrator/controller with standard buckets.
- `_KDB.elements.selectors.filterDock`: initialized by orchestrator from `config/selectors.js`.

Future, deferred consumption path:

```js
_KDB.api.singleSelect.dispatch({ type: "singleSelect/filterDockStateChanged", payload: interaction });
_KDB.api.sicht.dispatch({ type: "sicht/filterDockStateChanged", payload: interaction });
_KDB.api.dienststelle.dispatch({ type: "dienststelle/filterDockStateChanged", payload: interaction });
```

These calls are not implemented in this tranche.

---

## Section H. Acceptance criteria

1. Every file in Section B exists after execution, and no other production file is created or modified.
2. No file is created under `events/` or `observers/`.
3. Every file uses the full-compact AMD `define([...], function (...) { ... })` shape.
4. No ES module syntax appears in production code.
5. No inline/nested subfunction definitions appear inside entry functions, callbacks or return paths.
6. Every public method in `createFilterDockController.js` has disposed-state discipline.
7. `mount()` is idempotent and cannot duplicate click listeners, observers, timers, subscriptions, or runtime DOM refs.
8. Missing dock root makes `mount()` return `false` with warning, no listener/observer, no retry loop, no `document.body` observer, and no lifecycle `error`.
9. `destroy()` is idempotent and cleans listener, observer, scheduled evaluation, timers, subscriptions and DOM refs before clearing runtime.
10. The central click listener logs every generated interaction with `console.log("[filterDock.click]", interaction)`.
11. Click payloads and state slices contain no DOM nodes, events, MutationRecords, functions, jQuery objects, timers, observers, AbortControllers, or Promise objects.
12. The observer callback only schedules/coalesces evaluation; it does not perform heavy parsing, sibling routing, event emission, or foreign state writes inline.
13. Reducer actions update parallel slices without clearing unrelated observed facts.
14. No sibling modules are modified or called.
15. No `eventSubscribe.md` update is made and no events are emitted.
16. Bootstrap registration in `KDB.js` remains deferred and is documented in the final report.
17. Static import inspection confirms all AMD import paths resolve inside `filterDock/` or to approved production utilities.
18. `ReadLints` on all new production `.js` files is clean after implementation.
19. CP-2 diff-walk separates legacy-aligned changes from CP-1-approved Mode 2 architecture changes.

---

## Section I. Forbidden actions

The executing AI must not:

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, `filesExplained.md`, or any architecture template.
- Modify `contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify legacy trees under `_______REDESIGN2/`, `_______KDB3/`, or `_______LAATSTEORIGINAL/`.
- Modify `TEST/`.
- Modify `KDB.js` in this tranche.
- Modify `singleSelect`, `sicht`, `dienststelle`, or `stelleHierarchy` production folders in this tranche.
- Create `events/eventNames.js` for filterDock in this tranche.
- Emit new events.
- Add top-level `_KDB.*` keys.
- Create `_KDB.state.filterDock`; the only approved state path is `_KDB.state.filters.filterDock`.
- Store DOM/runtime objects in `_KDB.state.filters.filterDock`.
- Introduce lifecycle terms outside `lifecycleVocabulary.md`.
- Claim sole dock-level runtime listener ownership after this tranche.
- Implement filter value application, Cognos filter updates, history commits, or sibling reactions.
- Commit, push, or change git config.

---

## Section J. Reviewer handoff

After execution, the supervising AI must:

1. Verify the 14 pre-flight summaries are present and specific.
2. Read every created file.
3. Run `ReadLints` on all new production `.js` files.
4. Cross-check each file against its `Rules to apply` list.
5. Verify anti-D1: every named executable, subscriber and async function has try/catch; lifecycle/fire-and-forget boundaries convert errors with logging.
6. Verify anti-D2: `destroy()` disconnects/aborts/cleans before runtime reset.
7. Verify disposed-state discipline for every public method and scheduled callback.
8. Verify no sibling module, `KDB.js`, `eventSubscribe.md`, or legacy file was modified.
9. Verify static AMD imports resolve.
10. Report CP-2 status: lint, acceptance criteria, diff-walk, bootstrap deferred note, sibling deferred note.

---

## Section K. Reporting template for executing AI

The executing AI's final response must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every path created with line count and `matches spec | deviation`.
3. **Deviations** — any deviation with path, reason, and rule consulted.
4. **Self-verification** — pass/fail for every Section H criterion.
5. **Deferred boundaries** — explicit note that `KDB.js`, events, and sibling reactions were not implemented.
6. **Open questions** — only if a spec gap blocked exact execution.

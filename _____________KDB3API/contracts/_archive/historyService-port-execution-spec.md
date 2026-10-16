# Execution Spec: `historyService` (direct port)

> Direct-port execution spec for the `historyService` shared service.
> Execute only after CP-1 approval of `contracts/historyService.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/historyService.md`
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
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — services expose named methods, may use internal reducer/dispatch, and must guard disposed calls.
5. `_____________KDB3API/.cursor/rules/events.mdc` — fact-events require constants and catalog entries; events do not transfer ownership.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/service split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, action/event naming, underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM concerns apply to this service; keep DOM out of history state/runtime.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — `historyService` uses `ready`, `error`, `disposed`; `pendingStep` is reserved state, not a new lifecycle term. If the vocabulary no longer explicitly allows `ready` or `disposed`, stop and escalate before implementation.
12. `_____________KDB3API/contracts/_template.md` — contract shape.
13. `_____________KDB3API/contracts/historyService.md` — approved CP-1 contract for this direct port.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create files only after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/core/services/historyService/
  __orchestratorHistoryService.js
  createHistoryService.js
  config/
    defaults.js
  state/
    initialState.js
    cloneSerializable.js
    areSerializableEqual.js
    createHistoryReducer.js
    normalizeHistoryStep.js
  effects/
    emitHistoryChanged.js
  replay/
    resolveHistoryHandler.js
    applyHistoryStep.js
  events/
    eventNames.js
```

Do not modify `core/services/__orchestratorServices.js` or `KDB.js` in this tranche unless CP-1 explicitly expands scope. Modify `architecture/eventSubscribe.md` only if CP-1 approves the narrow `history:changed` catalog update requested by the contract.

Implementation dependency: `events/eventNames.js` and `effects/emitHistoryChanged.js` may be created only when CP-1 approved the narrow `history:changed` event catalog update. Otherwise stop and report that the execution spec requires a contract delta.

---

## Section C. Legacy mapping table

| New production file | Legacy source(s) | Rule-alignment note |
|---|---|---|
| `__orchestratorHistoryService.js` | `KDB.js` registration of `_KDB.history = createHistoryApi(_KDB)`, `initializeHistoryState.js` | Register canonical `_KDB.services.history`, initialize `_KDB.state.history` and `_KDB.runtime.history`; no legacy `_KDB.history` alias. |
| `createHistoryService.js` | `createHistoryApi.js` | Preserve public behavior with named methods, add disposed guards, internal reducer dispatch, mandatory try/catch on named executables; lifecycle boundaries convert errors, and runtime cleanup. |
| `config/defaults.js` | `initializeHistoryState.js` | Preserve `DEFAULT_HISTORY_LIMIT = 5` as declarative config. |
| `state/initialState.js` | `initializeHistoryState.js` | Preserve stack/pointer/limit defaults and add rule-required lifecycle/error/pending fields. |
| `state/cloneSerializable.js` | `createHistoryApi.js` `cloneSerializable` | Keep JSON clone fallback behavior as a pure helper. |
| `state/areSerializableEqual.js` | `createHistoryApi.js` `areEqual` | Keep JSON equality fallback behavior as a pure helper. |
| `state/createHistoryReducer.js` | `createHistoryApi.js` inline stack mutation | Centralize history state writes under canonical owner; no exposed public dispatch. |
| `state/normalizeHistoryStep.js` | `createHistoryApi.js` `createDefaultStep`, push validation | Validate and clone committed step shape; preserve invalid/no-op return behavior through service caller. |
| `effects/emitHistoryChanged.js` | `createHistoryApi.js` `emitHistoryChanged`, `base/events/history.js` | Preserve event payload; use event constant and tolerate missing event bus. |
| `replay/resolveHistoryHandler.js` | `resolveHistoryHandler.js` | Replace direct dashboard adapter imports with an empty rule-aligned resolver until owner replay APIs exist; missing handler returns `null` like legacy unknown keys. |
| `replay/applyHistoryStep.js` | `createHistoryApi.js` `applyStepValue` | Preserve target snapshot selection and async apply semantics; handler lookup delegated to resolver; failures log and resolve `false`. |
| `events/eventNames.js` | `base/events/history.js` | Canonical home for `HISTORY_CHANGED = "history:changed"` emitted by this service. |

Legacy files intentionally not ported into `historyService`:

| Legacy source | Reason |
|---|---|
| `dashboard/filters/*HistoryAdapter.js` | Feature-specific replay must live with or delegate to the filter owner once its target API exists. |
| `dashboard/canvas/widgets/*HistoryAdapter.js` | Widget replay must delegate to the future `widgets` owner; historyService must not write widget state or DOM. |
| `dashboard/tabs/__tabsHistoryAdapter.js` | Tab replay belongs to the tabs owner public API/dispatch. |
| `dashboard/canvas/kdbControl/__kdbControlSettingsHistoryAdapter.js` | kdbControl replay belongs to `_KDB.api.kdbControl.dispatch(...)`. |
| `dashboard/header/__headerHistoryAdapter.js` | Header/footer replay belongs to their owner APIs/dispatch, not direct state/render helpers. |
| `dashboard/historyControls/*` | History controls are UI consumers, not part of the shared service direct port. |

---

## Section D. Per-file specifications

Every production file uses full-compact AMD form and returns exactly one value.

### `__orchestratorHistoryService.js`

- **Role:** shared-service orchestrator.
- **Lines:** target 55, hard limit 120.
- **AMD imports:** `./config/defaults.js`, `./state/initialState.js`, `./createHistoryService.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:**
  1. Ensure `_KDB.services`, `_KDB.state`, `_KDB.runtime`.
  2. Initialize `_KDB.state.history` using `initialState(defaults)` when absent; normalize missing legacy fields when present.
  3. Initialize `_KDB.runtime.history` buckets: `subscriptions`, `listeners`, `abortControllers`, `timers`, `pendingPromises`, `adapters`.
  4. Create service with `{ _KDB, defaults, options }`.
  5. Register `_KDB.services.history = service`.
  6. Return service.
- **Rules to apply:** `amd.mdc` (single full-compact AMD module), `naming.mdc` (canonical `__orchestrator` entry), `feature-structure.mdc` (thin orchestrator only), `kdb-object.mdc` (`_KDB.services.history`), `state.mdc` (owner initializes `_KDB.state.history`), `runtime.mdc` (runtime buckets under `_KDB.runtime.history`), `error-handling.mdc` (mandatory try/catch on service startup and named executables).

### `createHistoryService.js`

- **Role:** shared-service factory.
- **Lines:** target 140, hard limit 150. If public boundary handling becomes dense, split focused helpers into owned files and stop for a spec/contract update rather than exceeding the hard limit.
- **AMD imports:** `./state/createHistoryReducer.js`, `./state/normalizeHistoryStep.js`, `./state/areSerializableEqual.js`, `./state/cloneSerializable.js`, `./effects/emitHistoryChanged.js`, `./replay/applyHistoryStep.js`.
- **Entry function:** `createHistoryService(_deps)`.
- **Public methods:** `pushCommittedStep`, `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`, `destroy`.
- **Factory-scope helpers:** `dispatchInternal`, `readHistoryState`, `createSnapshot`, `clearRuntime`, `warnDisposed`, `rejectDisposed`, `logPublicMethodError`, `recordError`.
- **Behavior:**
  - Keep `_isDisposed` in the factory closure.
  - Dispatch `history/initialize` once during service creation, then emit `history:changed` to match legacy creation behavior. Missing `_KDB.events.emit` during service creation is non-fatal and must not put `historyService` into `error`.
  - `pushCommittedStep(step)` returns `false` for invalid step, missing key, empty key, or serializable old/new equality; otherwise dispatches `history/commitStep`, emits `history:changed`, returns `true`.
  - `undo()` returns `Promise<boolean>`; if no undo is available resolve `false`; otherwise apply `step.old`, dispatch `history/undoSucceeded` only on `true`, emit `history:changed`, return `true`.
  - `redo()` mirrors undo with `step.new` and `history/redoSucceeded`.
  - `canUndo()` / `canRedo()` return booleans, `false` after disposal.
  - `getSnapshot()` returns a cloned `{ stack, pointer, limit }`, `undefined` after disposal.
  - `destroy()` is idempotent; set `_isDisposed = true`, dispatch `history/destroy`, clear runtime buckets.
- **Rules to apply:** `module-public-api.mdc` (named service methods, internal reducer allowed, no public dispatch, disposed guards), `state.mdc` (canonical owner writes only through reducer), `runtime.mdc` (cleanup before bucket reset), `events.mdc` (emit documented fact-event only), `error-handling.mdc` (mandatory try/catch on public methods and async work), `amd.mdc`, `naming.mdc`.

### `config/defaults.js`

- **Role:** declarative service config.
- **Lines:** target 15.
- **Return value:** `{ DEFAULT_HISTORY_LIMIT: 5 }`.
- **Rules to apply:** `state.mdc` (config, not state), `naming.mdc` (real module constants in upper snake case), `amd.mdc`.

### `state/initialState.js`

- **Role:** state factory.
- **Lines:** target 30.
- **AMD imports:** `../config/defaults.js`.
- **Entry function:** `__controller()`.
- **Return value:** fresh state from the contract with lifecycle `ready`, stack `[]`, pointer `-1`, limit from defaults, `pendingStep: null`, `lastChangedAt: null`, `errorCode: null`, `errorMessage: null`.
- **Lifecycle guard:** if `lifecycleVocabulary.md` does not explicitly allow `ready` or `disposed`, stop and escalate before implementation; do not invent history-local lifecycle terms.
- **Rules to apply:** `state.mdc` (serializable only), `lifecycleVocabulary.md` (canonical terms only), `amd.mdc`, `naming.mdc`.

### `state/cloneSerializable.js`

- **Role:** pure clone helper.
- **Lines:** target 25.
- **Entry function:** `__controller(_value)`.
- **Behavior:** match legacy: return `null`/`undefined` as-is; try `JSON.parse(JSON.stringify(_value))`; on clone failure return original value.
- **Rules to apply:** `state.mdc` (pure helper, no writes), `error-handling.mdc` (local clone fallback is legacy-safe; no logging needed for fallback), `amd.mdc`, `naming.mdc`.

### `state/areSerializableEqual.js`

- **Role:** pure equality helper.
- **Lines:** target 25.
- **Entry function:** `__controller(_leftValue, _rightValue)`.
- **Behavior:** match legacy: compare `JSON.stringify` output; on stringify failure compare by strict identity.
- **Rules to apply:** `state.mdc` (pure helper), `amd.mdc`, `naming.mdc`.

### `state/createHistoryReducer.js`

- **Role:** internal reducer.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** `./initialState.js`, `./cloneSerializable.js`.
- **Entry function:** `__controller(_state, _action)`.
- **Handled actions:** `history/initialize`, `history/commitStep`, `history/undoSucceeded`, `history/redoSucceeded`, `history/error`, `history/destroy`.
- **Behavior:**
  - Normalize absent/malformed `stack`, `pointer`, `limit`, `pendingStep`, `lifecycle`, `errorCode`, `errorMessage`.
  - `history/commitStep` truncates redo tail when `pointer < stack.length - 1`, pushes normalized step, shifts when over `limit`, sets `pointer = stack.length - 1`, updates `lastChangedAt`.
  - `history/undoSucceeded` decrements pointer by one only when `pointer >= 0`.
  - `history/redoSucceeded` increments pointer by one only when `pointer < stack.length - 1`.
  - `history/error` stores lifecycle `error` with serializable error fields.
  - `history/destroy` sets lifecycle `disposed`, clears `pendingStep`, preserves `stack`, `pointer`, and `limit` for post-disposal diagnostics only, and clears transient error fields. Public reads remain blocked by disposed guards.
  - No action in this tranche may set `pendingStep` to a non-null value.
- **Rules to apply:** `state.mdc` (pure, owner-only, serializable), `module-public-api.mdc` (internal reducer only), `naming.mdc` (slash-style actions), `error-handling.mdc` (reducers exempt — pure, no try/catch), `amd.mdc`.

### `state/normalizeHistoryStep.js`

- **Role:** pure step normalizer.
- **Lines:** target 50.
- **AMD imports:** `./cloneSerializable.js`.
- **Entry function:** `__controller(_step)`.
- **Behavior:** return `null` if `_step` is missing or has no non-empty string `key`; otherwise return `{ key, timestamp, old, new }` where timestamp defaults to `Date.now()` and `old`/`new` are cloned.
- **Rules to apply:** `state.mdc` (serializable step shape), `naming.mdc`, `amd.mdc`.

### `effects/emitHistoryChanged.js`

- **Role:** fact-event effect.
- **Lines:** target 45.
- **AMD imports:** `../events/eventNames.js`.
- **Entry function:** `__controller(_KDB, _historyState)`.
- **Behavior:** if `_KDB.events.emit` exists, emit `HISTORY_CHANGED` with payload `{ pointer, stackLength, limit, canUndo, canRedo }`; if event bus is missing, return silently like legacy.
- **Rules to apply:** `events.mdc` (canonical event constant, fact-event payload is JSON-serializable), `error-handling.mdc` (event boundary catches/logs emit failure), `state.mdc` (does not write state), `amd.mdc`, `naming.mdc`.

### `replay/resolveHistoryHandler.js`

- **Role:** replay handler resolver.
- **Lines:** target 30.
- **Entry function:** `__controller(_stepKey, _deps)`.
- **Behavior:** return `null` for all keys in this tranche unless `_deps.replayHandlers` contains an explicit handler for `_stepKey`; do not import dashboard modules. This preserves legacy "missing handler -> false" behavior while avoiding foreign-owner imports. `_deps.replayHandlers` is an internal dependency-injection path only and is not exposed through `_KDB.services.history`.
- **Rules to apply:** `module-public-api.mdc` (no internal feature imports, owner APIs only), `state.mdc` (no foreign writes), `feature-structure.mdc` (`replay/` owns the replay boundary), `amd.mdc`, `naming.mdc`.

### `replay/applyHistoryStep.js`

- **Role:** async replay boundary.
- **Lines:** target 70.
- **AMD imports:** `./resolveHistoryHandler.js`.
- **Entry function:** `__controller(_KDB, _direction, _step, _deps)`.
- **Behavior:**
  - Resolve handler from `step.key`.
  - If no handler or no `apply` method, log `console.warn("[historyService.applyHistoryStep] handler missing", step.key)` and return `Promise.resolve(false)`.
  - Set target value to `step.old` for undo and `step.new` for redo.
  - Await `handler.apply(_KDB, targetValue, step, { direction })`.
  - Return `true` only when handler returns `true`; on error log `console.error("[historyService.applyHistoryStep] replay failed", error)` and return `false`.
- **Rules to apply:** `error-handling.mdc` (mandatory try/catch on async work; lifecycle boundaries convert), `module-public-api.mdc` (delegation boundary, no direct foreign state writes), `state.mdc`, `amd.mdc`, `naming.mdc`.

### `events/eventNames.js`

- **Role:** event-name constants.
- **Lines:** target 15.
- **Return value:** `{ HISTORY_CHANGED: "history:changed" }`.
- **Rules to apply:** `events.mdc` (canonical home for service-emitted event), `naming.mdc` (colon-style fact event), `amd.mdc`.

---

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `history/initialize` | Service creation | Normalize shape; ensure stack, pointer, limit, pendingStep, errors. | `<missing>/ready/error -> ready` |
| `history/commitStep` | `pushCommittedStep` accepted a normalized non-no-op step | Truncate redo tail, append, enforce limit, set pointer to last index, set `lastChangedAt`. | `ready -> ready` |
| `history/undoSucceeded` | Replay of current step old snapshot returned `true` | Decrement pointer. | `ready -> ready` |
| `history/redoSucceeded` | Replay of next step new snapshot returned `true` | Increment pointer. | `ready -> ready` |
| `history/error` | Public method boundary catches unexpected error | Store `errorCode`, `errorMessage`. | `<current> -> error` |
| `history/destroy` | `destroy()` | Set `pendingStep: null`, preserve `stack`, `pointer`, and `limit`, clear transient error fields, set lifecycle disposed. | `<current> -> disposed` |

---

## Section F. Public API wiring

- Surface: `_KDB.services.history`.
- Methods exposed: `pushCommittedStep`, `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`, `destroy`.
- Methods explicitly not exposed: `dispatch`, `registerHistoryHandler`, `beginPendingStep`, `cancelPendingStep`, `finalizePendingStep`, `readHistoryState`.
- `_KDB.runtime.history` buckets: `subscriptions`, `listeners`, `abortControllers`, `timers`, `pendingPromises`, `adapters`.
- `_KDB.state.history`: initialized from `state/initialState.js` and written only via the internal reducer.
- No bootstrap registration in `__orchestratorServices.js` or `KDB.js` in this tranche unless CP-1 explicitly expands scope.

---

## Section G. Event catalog and bootstrap notes

- `eventSubscribe.md` update: required before event-emitting production code lands; apply only if CP-1 approves the narrow catalog-update scope requested by the contract. If CP-1 does not approve it, do not create `events/eventNames.js` or `effects/emitHistoryChanged.js`; stop and request a contract delta.
- Required catalog entry: `history:changed`, type `fact`, emitter `historyService`, confirmation point after history state initialization or successful stack/pointer mutation, payload `{ pointer, stackLength, limit, canUndo, canRedo }`.
- `events/eventNames.js`: created in this tranche because the service itself emits the fact-event.
- Bootstrap registration: required later by adding history orchestrator to `core/services/__orchestratorServices.js`; deferred unless CP-1 expands scope.
- Static import check after implementation: verify all AMD paths resolve within `core/services/historyService/` and do not import from `TEST/`, legacy trees, or dashboard feature modules.

---

## Section H. Acceptance criteria

1. Every file in Section B exists after execution, and no extra production file is created.
2. No production file is created before CP-1 approval.
3. No `TEST/`, browser harness, legacy file, rule file, architecture authority doc, or template is modified.
4. Every production file uses full-compact AMD `define([...], function (...) { ... })`.
5. No file contains ES module syntax, CommonJS `require`, multiple `define` calls, or inline nested subfunction definitions inside entry bodies/callbacks.
6. `_KDB.services.history` exposes only `pushCommittedStep`, `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`, `destroy`.
7. `createHistoryService.js` does not expose `dispatch`, but uses an internal reducer/dispatch path.
8. Every public method has disposed-state discipline per `module-public-api.mdc`.
9. Public methods have boundary `try/catch`; async replay work catches/logs and resolves `false` on replay failure.
10. `_KDB.state.history` contains only serializable values; no action sets `pendingStep` to a non-null value in this tranche.
11. `_KDB.runtime.history` owns runtime buckets and is cleaned in `destroy()` before bucket reset.
12. `history:changed` uses the constant from `events/eventNames.js`; no duplicated event string at emit sites.
13. No dashboard feature module, dashboard adapter, legacy path, or owner-internal file is imported by `historyService`.
14. Missing replay handler returns `false` for undo/redo, matching legacy missing-handler behavior.
15. `pushCommittedStep` preserves legacy no-op behavior for invalid key and equal old/new values.
16. Stack limit remains `5`; redo tail truncation and pointer movement match legacy behavior.
17. `destroy()` preserves `stack`, `pointer`, and `limit` only for post-disposal diagnostics; public reads still return `undefined` or `false` after disposal.
18. `ReadLints` is run on all new/modified production files after implementation.
19. Static AMD import inspection confirms every new import resolves.
20. CP-2 report states: lint result, rule-check result, diff-walk result, bootstrap registration status, event-catalog status.

---

## Section I. Forbidden actions

The executing AI must not:

- Modify any file before CP-1 approval.
- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, or templates unless CP-1 explicitly expands scope.
- Modify `eventSubscribe.md` except for the narrow `history:changed` catalog entry if CP-1 approves that scope.
- Modify `_____________KDB3API/contracts/historyService.md` after approval unless a contract delta is explicitly requested.
- Modify `core/services/__orchestratorServices.js` or `KDB.js` unless CP-1 explicitly changes bootstrap scope.
- Read legacy folders linearly or modify any file under `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Create `TEST/` files, harness files, browser tests, README files, or CSS files.
- Port dashboard feature replay adapters into `historyService`.
- Import from `dashboard/` modules, feature internals, `TEST/`, or legacy trees.
- Expose `_KDB.history` as a legacy compatibility alias.
- Introduce public pending-step methods in this tranche.
- Introduce behavior changes beyond rule-alignment; if behavior drift appears necessary, stop and escalate.
- Commit, push, or change git config.

---

## Section J. Reporting template

The executing AI reports:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every path created with line count and `matches spec | deviation`.
3. **Omitted legacy behavior** — confirm dashboard replay adapters were not ported and why.
4. **Self-verification** — pass/fail for all Section H criteria.
5. **Bootstrap/event notes** — service orchestrator registration is deferred unless CP-1 changed scope; `eventSubscribe.md` is updated only if CP-1 approved the narrow catalog scope.
6. **Open questions** — only if the spec proved insufficient; otherwise `none`.

---

## Section K. Reviewer handoff

The supervising AI performs after implementation:

1. Verify the pre-flight summaries.
2. Read every created production file.
3. Run `ReadLints` on all new/modified production files.
4. Cross-check each file against Section D rules.
5. Diff-walk against legacy: confirm rule-alignment only for history core and confirm feature replay adapters were intentionally excluded from `historyService`.
6. Static inspect AMD imports and note bootstrap registration is deferred unless CP-1 approved it.
7. Confirm `eventSubscribe.md` is not edited unless CP-1 approved the catalog-update scope.
8. Stop at CP-2 for user diff-walk + integration-check approval.

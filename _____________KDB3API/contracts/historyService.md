# Module Contract: `historyService`

> CP-1 draft for a DIRECT PORT from legacy `historyService` into the production tree.
> No production code may be generated until this contract is approved.

---

**Status:** `Draft`
**Owner module / service:** `historyService`
**Type:** `shared service`
**Authoring AI:** GPT-5.5, 2026-05-17
**Reviewed by:** `user CP-1 agreed 2026-06-16 (widgetBase layout replay keys)`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Source:

```txt
legacy-redesign2:js/base/services/historyService/
```

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/core/services/historyService/
```

This is a direct port: preserve legacy history-stack behavior and change only what the rules force. No `TEST/` sandbox, no browser harness, no production file changes before CP-1.

CP-1 recommendations captured in this draft:

| Question | Decision |
|---|---|
| Factory name | Canonical shared-service factory name `createHistoryService` (now a function in `historyService/index.js`); do not carry legacy `createHistoryApi`. |
| Replay delegation | Do not import legacy feature adapters in this tranche; feature-specific replay delegation is deferred until owner APIs/dispatch surfaces exist. |
| Event catalog | Recommended: approve a narrow `eventSubscribe.md` catalog update for `history:changed` in this tranche. |
| Pending-step API | Do not expose `beginPendingStep`, `cancelPendingStep`, or `finalizePendingStep` in this direct port; keep `pendingStep: null` in state as reserved shape only. |
| Stack limit | Preserve legacy `DEFAULT_HISTORY_LIMIT = 5`. |

## 1. Legacy Evidence

| Legacy file | Evidence used |
|---|---|
| `createHistoryApi.js` | Public methods: `pushCommittedStep`, `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`; stack truncation after undo; limit enforcement; `history:changed` payload; async undo/redo apply boundary; returns `false` on invalid steps, empty undo/redo, missing handler, or apply failure. |
| `initializeHistoryState.js` | Canonical state fields: `stack`, `pointer`, `limit`; default limit `5`; state lives under `_KDB.state.history`. |
| `resolveHistoryHandler.js` | Legacy imports feature adapters directly and resolves by step key; this violates new ownership boundaries until owner modules expose replay APIs. |
| `base/events/history.js` | Event constant `HISTORY_CHANGED = "history:changed"`. |
| `KDB.js` in legacy | Legacy bootstrap registers `_KDB.history = createHistoryApi(_KDB)` during base setup. New target uses `_KDB.services.history`. |
| History callers across filters, widgets, tabs, header, footer | Legacy callers push serializable committed steps after confirmed changes; replay adapters often write feature state directly or call feature-local helpers. |
| `dashboard/historyControls/*` | UI consumes `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot` and subscribes to `history:changed`. History controls are out of this service tranche. |

Production evidence:

- `_____________KDB3API/KDB3/js/core/services/historyService/` does not exist yet.
- `_____________KDB3API/KDB3/js/bootstrap/registerServices.js` currently registers `tableData` and `loading`; it does not register `history`.
- `_____________KDB3API/KDB3/js/KDB.js` imports `__orchestratorServices.js` only; no direct history import exists.
- `architecture/stateOwnership.md`, `projectStructureRules.md`, `state.mdc`, and `module-public-api.mdc` already identify `_KDB.state.history` as owned by `historyService` and `_KDB.services.history` as the canonical public service surface.

## 2. Purpose

`historyService` owns the application history stack for committed undo/redo steps. It stores serializable step snapshots, exposes named public methods for committing and replaying steps, publishes a fact-event when stack state changes, and keeps replay from becoming a shortcut around feature ownership.

In this direct-port tranche, the service ports the legacy history core and defines the replay boundary. Feature-specific replay handlers are deferred until the relevant owner modules/services expose rule-aligned public APIs.

## 3. Ownership

- Canonical state subtree: `_KDB.state.history`.
- Canonical writer: `historyService` only, through an internal reducer/dispatch flow.
- Existing ownership-map entry: `architecture/stateOwnership.md` already lists `_KDB.state.history` as owned by `historyService`.
- Foreign-write paths: none. Other modules commit steps through `_KDB.services.history.pushCommittedStep(step)` and replay effects must delegate to owner APIs/dispatch when implemented.

Initial state shape:

```js
_KDB.state.history = {
  lifecycle: "ready",
  stack: [],
  pointer: -1,
  limit: 5,
  pendingStep: null,
  lastChangedAt: null,
  errorCode: null,
  errorMessage: null
};
```

Committed step shape:

```js
{
  key: "widget_layoutMove",
  timestamp: 1710000000000,
  old: { widgetId: "widget-abc", x: 0, y: 0, width: 200, height: 150 },
  new: { widgetId: "widget-abc", x: 40, y: 20, width: 200, height: 150 }
}
```

`widget_layoutResize` uses the same frame shape; only the step key differs.

Lifecycle subset: `ready`, `error`, `disposed`. These terms are present in `lifecycleVocabulary.md`; if the vocabulary changes before implementation and no longer explicitly allows one of them, stop and escalate instead of introducing local history-only lifecycle terms.

`pendingStep` is reserved as a serializable field for a later explicit pending-step API. This direct port does not expose pending-step methods and does not write `pendingStep` except to initialize or clear it. No reducer action in this tranche may set `pendingStep` to a non-null value.

## 4. Runtime

- Owner namespace: `_KDB.runtime.history`.
- Cleanup trigger: `destroy()`.

| Bucket | Shape / role |
|---|---|
| `subscriptions` | Event-bus unsubscribe handles; expected empty in this tranche because the service emits only. |
| `listeners` | DOM listener cleanup records; expected empty. |
| `abortControllers` | Abortable replay scopes if future replay work becomes abortable; expected empty in the core tranche. |
| `timers` | Timer handles; expected empty. |
| `pendingPromises` | In-flight undo/redo replay promises keyed by operation if needed by implementation; clear on settle/destroy. |
| `adapters` | Future injected replay adapters or owner-delegation handles; not populated in this tranche unless CP-1 expands replay scope. |

Cleanup order: set the service `_isDisposed` guard first, abort controllers, unsubscribe subscriptions, clear listeners/timers/pending promises, clear adapters, then reset `_KDB.runtime.history` buckets. Runtime must not be nulled before cleanup.

## 5. Public API

### 5a. Shared service

- Surface: `_KDB.services.history`.
- Style: named methods, per shared-service default.
- Internal mutation style: internal reducer + dispatch, because history/undo/redo is the canonical `module-public-api.mdc` hybrid service case.

```js
_KDB.services.history = {
  pushCommittedStep: pushCommittedStep,
  undo: undo,
  redo: redo,
  canUndo: canUndo,
  canRedo: canRedo,
  getSnapshot: getSnapshot,
  destroy: destroy
};
```

Method contracts:

| Method | Signature | Contract |
|---|---|---|
| `pushCommittedStep(step)` | `(object) => boolean` | Validates a serializable committed step; ignores missing/empty key and no-op old/new equality; truncates redo tail; appends step; enforces limit `5`; emits `history:changed`; returns `true` only when a step is committed. |
| `undo()` | `() => Promise<boolean>` | If `canUndo()` is false, resolves `false`; otherwise applies the current step's `old` snapshot through the replay boundary, decrements pointer only on successful apply, emits `history:changed`, and resolves `true`. |
| `redo()` | `() => Promise<boolean>` | If `canRedo()` is false, resolves `false`; otherwise applies the next step's `new` snapshot through the replay boundary, increments pointer only on successful apply, emits `history:changed`, and resolves `true`. |
| `canUndo()` | `() => boolean` | Returns `pointer >= 0`; returns `false` after disposal. |
| `canRedo()` | `() => boolean` | Returns `pointer < stack.length - 1`; returns `false` after disposal. |
| `getSnapshot()` | `() => object | undefined` | Returns a cloned snapshot `{ stack, pointer, limit }`; returns `undefined` after disposal. |
| `destroy()` | `() => void` | Idempotent teardown; transitions owned state to `disposed`, preserves `stack`, `pointer`, and `limit` for post-disposal diagnostics only, and clears runtime buckets. Public reads still return `undefined` or `false` after disposal, so preserved state is not part of the public service contract. |

Disposed-state discipline follows `module-public-api.mdc`: after destroy, sync reads return `undefined` or `false`, async methods return `Promise.reject(new Error("historyService disposed"))`, and `destroy()` is an idempotent no-op. No disposed guard throws synchronously.

No public `dispatch`, `beginPendingStep`, `cancelPendingStep`, `finalizePendingStep`, `registerHistoryHandler`, or `read*` selector-like methods are exposed in this tranche.

## 6. Readers / Writers

**For shared services:**

- Deliberate read methods exposed on `_KDB.services.history`:
  - `canUndo()` — boolean stack/pointer projection.
  - `canRedo()` — boolean stack/pointer projection.
  - `getSnapshot()` — cloned `{ stack, pointer, limit }`, matching legacy shape.

Services do not publish a separate selector registry for their own state subtree per `module-public-api.mdc`.

**Internal reducer actions:**

| Action type | Purpose |
|---|---|
| `history/initialize` | Normalize or initialize `_KDB.state.history` to the contract shape. |
| `history/commitStep` | Append a normalized committed step, truncate redo tail, enforce limit, update pointer and `lastChangedAt`. |
| `history/undoSucceeded` | Decrement pointer after successful replay. |
| `history/redoSucceeded` | Increment pointer after successful replay. |
| `history/error` | Record `lifecycle: "error"`, `errorCode`, and `errorMessage` for owned history failures. |
| `history/destroy` | Transition lifecycle to `disposed`, clear pending runtime-owned workflow state, and preserve stack/pointer/limit for post-disposal diagnostics only. |

The reducer is internal. It is not exposed on `_KDB.services.history`.

## 7. Events

- **Emitted facts:**
  - `history:changed` — payload `{ pointer: number, stackLength: number, limit: number, canUndo: boolean, canRedo: boolean }` — emitted after initialization and after every successful committed-step, undo, or redo state change.
- **Subscribed:** none in this service tranche.
- **Request-events:** none.

CP-1 must explicitly decide the event-catalog scope. Because this tranche creates `events/eventNames.js` and `core/services/historyService/replay.js` (`emitHistoryChanged`), the narrow `architecture/eventSubscribe.md` catalog entry for `history:changed` is required before implementation may write event-emitting production code.

If CP-1 does not approve this narrow catalog update, implementation must stop before creating event-emitting code and escalate. Do not silently create the event constant/effect without the catalog entry.

Event-name constants live at `historyService/events/eventNames.js`.

## 8. Dependencies

- `_KDB` (always).
- `_KDB.events` for emitting `history:changed`.
- Internal replay boundary: `core/services/historyService/replay.js` (`resolveHistoryHandler`) and `core/services/historyService/replay.js` (`applyHistoryStep`).

No direct imports from dashboard feature modules are allowed in this tranche. Legacy `resolveHistoryHandler.js` imported filters, widgets, tabs, kdbControl, header and footer adapters directly; that shape is not rule-aligned because it would bypass owner boundaries before the target owner APIs exist.

Future replay integration must use one of:

- an owning feature module API such as `_KDB.api.widgets.dispatch(...)`;
- a shared service named method;
- a cataloged event only when `events.mdc` allows it.

## 9. Cognos Touchpoints

`historyService` itself performs no Cognos host calls in this direct-port tranche.

Replay handlers in future owner modules may perform Cognos effects through their own `_KDB.cognosAPI.<theme>` wrappers. Those effects belong to the owner module/service being replayed, not to `historyService`.

## 10. Replay Boundary

History steps remain serializable and owned by `historyService`; applying a step is delegated.

This tranche creates a replay boundary with these semantics:

- `resolveHistoryHandler(stepKey)` returns a handler only when a rule-aligned owner integration exists.
- Internal `_deps.replayHandlers` injection may be used by `resolveHistoryHandler` only as an implementation dependency, not as a public registration API.
- If no handler exists, undo/redo resolves `false`, matching legacy behavior for missing handlers.
- A handler shape is `{ apply: function (_KDB, targetValue, step, context) { ... } }`.
- `context.direction` is `"undo"` or `"redo"`.
- `targetValue` is `step.old` for undo and `step.new` for redo.
- Handlers must not write foreign state; they delegate to the owner that owns the replayed state/effect.

Known owner replay keys (`widgetBase` contribution):

| Step key | Owner handler | Delegates via |
|---|---|---|
| `widget_canvasDrop` | `widgetBase` | `widgetBase/routeToLaunchpad` or `widgetBase/takeFromLaunchpad` |
| `widget_launchpadTransfer` | `widgetBase` | `widgetBase/takeFromLaunchpad` or `widgetBase/routeToLaunchpad`, then `widgetSettings/placeControls` + `widgetSettings/restoreCommittedSettings` (undo) or `widgetSettings/cleanupWidgetControls` (redo) when `requestedBy: "widgetSettings"` |
| `widget_layoutMove` | `widgetBase` | `widgetBase/move` with `isHistoryReplay: true` |
| `widget_layoutResize` | `widgetBase` | `widgetBase/resize` with `isHistoryReplay: true` |

Layout replay handlers read `widgetId` from `targetValue` (the active frame). They dispatch owner actions rather than writing foreign state subtrees directly.

`widget_launchpadTransfer` uses one handler per key on the `widgetBase` contribution. Cross-module restore is delegated through `_KDB.api.widgetSettings.dispatch` (`placeControls`, `restoreCommittedSettings`, `cleanupWidgetControls`), not through foreign state writes or a separate `widgetSettings` replay registration for delete. Vis rebind on undo is settings-orchestrated; forward `widgetVis/cleanupContent(settingsDelete)` is not replayed on redo.

Legacy handler imports are intentionally not ported into `historyService` in this tranche.

## 11. Folder Layout

Production target after CP-1 and execution-spec approval:

As built (exports per file). `index.js` is the registrar (`registerHistoryService`).

```txt
core/services/historyService/
  index.js                                            registerHistoryService
  replay.js                                           readHistoryState, readWritebackRestoreFlag, isHistoryLocked, emitHistoryChanged, runReplay
  state.js                                            DEFAULT_HISTORY_LIMIT, createInitialState, normalizeHistoryState, normalizeHistoryStep, areSameJson, reduceHistory
  events/
    eventNames.js                                     HISTORY_CHANGED
```

`replay/` is justified because undo/redo apply semantics are the boundary between history state ownership and feature-owner effects. It prevents `core/services/historyService/index.js` (`createHistoryService`) from importing dashboard modules or becoming a god service.

## 12. Bootstrap Registration

Bootstrap registration is required for production usage but is explicitly deferred by this session unless CP-1 expands scope.

Deferred integration target:

- import `./historyService/index.js` from `bootstrap/registerServices.js`;
- call `_orchestratorHistoryService(_KDB)` during service registration;
- ensure root `destroy()` eventually calls `_KDB.services.history.destroy()`.

No `KDB.js` edit is required in this tranche if registration remains inside `bootstrap/registerServices.js`; that file already participates in bootstrap.

## 13. Out Of Scope

- Editing `eventSubscribe.md` except for the narrow `history:changed` catalog entry if CP-1 approves that scope.
- Bootstrap registration in `__orchestratorServices.js` or `KDB.js` unless CP-1 explicitly expands scope.
- Porting legacy dashboard feature replay adapters into `historyService` (except documenting owner replay keys in §10).
- `widget_removed` replay handler (deferred).
- Creating or modifying feature modules for filters, widgets, launchpad, tabs, kdbControl, header, footer, or authoring.
- Cross-service or cross-feature integration tests.
- Browser harness or `TEST/` sandbox.
- Editing or moving legacy files.
- Editing rules, authority docs, architecture templates, or contract templates.

## 14. CP-1 Decision Summary

| Question | Recommendation captured in this contract |
|---|---|
| Q1 Target placement | `KDB3/js/core/services/historyService/`; service uses focused subfolders `state/`, `effects/`, `replay/`, `config/`, `events/`. |
| Q2 State ownership | `_KDB.state.history`; state shape includes `lifecycle`, `stack`, `pointer`, `limit: 5`, `pendingStep: null`, `lastChangedAt`, `errorCode`, `errorMessage`. |
| Q3 Public API | `_KDB.services.history` named methods; internal reducer + dispatch is used but not exposed. |
| Q4 Factory naming | `createHistoryService.js`; legacy `createHistoryApi.js` is not carried forward. |
| Q5 Runtime resources | `_KDB.runtime.history` buckets initialized even if mostly empty; cleanup path required. |
| Q6 Events | `history:changed` is emitted from `events/eventNames.js`; a narrow `eventSubscribe.md` catalog update is requested for the implementation tranche. |
| Q7 Disposed state | Add `_isDisposed` guard in `core/services/historyService/index.js` (`createHistoryService`). |
| Q8 Cross-module ownership | No direct feature state writes or feature adapter imports in this service tranche. |
| Q9 Step model/replay | Steps are serializable; step application delegates through a replay boundary and resolves `false` when no handler exists. |
| Q10 Error handling | Invalid/no-op steps return `false`; undo/redo empty stack resolves `false`; replay failures resolve `false` after logging and owner error-state update where applicable. |

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |
| 2026-06-16 | `Replay boundary expanded` | `user` | Added `widget_launchpadTransfer` to §10 owner replay table; widgetBase owner with widgetSettings delegation; vis restore out of scope. |

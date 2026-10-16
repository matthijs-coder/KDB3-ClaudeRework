# historyService + kdbControl — replay bootstrap glue (CP-1 contractdelta)

**Status:** Draft for CP-1 review.  
**Datum:** 2026-05-17  
**Relatie:** verfijnt `historyService.md` §8 / §10 / §12, `kdbControl-history-contractdelta.md` §10 / §14, en de core bootstrap/service wiring in `KDB3/js/core/services/__orchestratorServices.js` plus root cleanup in `KDB3/js/KDB.js`.

---

## 1. Purpose

Deze delta koppelt de al bestaande kdbControl replay-handler contribution aan `historyService` via internal bootstrap / dependency injection.

Doel van deze tranche:

- `historyService` blijft generiek en wordt vroeg geregistreerd, ook wanneer nog geen replay handlers beschikbaar zijn.
- `historyService` krijgt een internal `replayHandlers` map bij service-creatie en mag die map later via bootstrap-only late binding vervangen of aanvullen.
- `kdbControl_settingsChange` wordt na `kdbControl.mount()` gekoppeld aan de kdbControl-owned replay handler.
- Undo/redo voor kdbControl settings gaat daarna via `historyService` naar `_KDB.api.kdbControl.dispatch({ type: "kdbControl/replaySettings", ... })`.
- Er komt geen public `registerHistoryHandler` API, geen feature-facing registration surface en geen legacy `_KDB.history` alias.

## 2. Existing Evidence

Current production evidence:

| File | Evidence |
|---|---|
| `KDB3/js/core/services/__orchestratorServices.js` | Registers shared services and can collect replay handler contributions through `collectReplayHandlers.js`. This delta requires it to support early history registration plus a later internal replay-handler bind. |
| `KDB3/js/core/services/historyService/__orchestratorHistoryService.js` | Passes `{ _KDB, defaults, options }` into `createHistoryService`; options can carry `replayHandlers`. |
| `KDB3/js/core/services/historyService/createHistoryService.js` | Reads `deps.replayHandlers || deps.options.replayHandlers || null` into its replay boundary at creation time. This delta changes that boundary to allow internal bootstrap late binding without changing the public service surface. |
| `KDB3/js/dashboard/canvas/kdbControl/history/stageKdbControlHistoryReplayHandler.js` | Stages a handler at `_KDB.runtime.kdbControl.historyReplayHandlerContribution`; the current implementation requires `_KDB.runtime.kdbControl` to exist before staging can succeed. |
| `KDB3/js/dashboard/canvas/kdbControl/history/createKdbControlHistoryReplayHandler.js` | Produces `{ apply(...) }` handler that delegates to kdbControl-owned replay. |
| `KDB3/js/dashboard/canvas/kdbControl/createKdbControlController.js` | Creates `_KDB.runtime.kdbControl` inside `mount()`. This delta requires staging the replay contribution after that runtime exists. |
| `KDB3/js/KDB.js` | Root bootstrap orders service registration, feature registration, feature mount and service cleanup. |

## 3. Scope

In scope:

- Keep `historyService` registered early with an initially empty or partial internal replay-handler map.
- Update the history replay boundary so bootstrap/service glue can late-bind a `replayHandlers` map containing:

```js
{
  kdbControl_settingsChange: _KDB.runtime.kdbControl.historyReplayHandlerContribution
}
```

- Ensure the kdbControl handler is staged only after `_KDB.runtime.kdbControl` exists.
- Ensure the handler is collected after kdbControl has staged it.
- Add a focused internal late-bind step after `kdbControl.mount()` that updates `historyService` replay handlers without recreating public feature APIs.
- The late-bind step may be implemented as a private runtime adapter owned by `historyService`, for example `_KDB.runtime.history.adapters.bindReplayHandlers`, or an equivalent orchestrator-private mechanism. It must not be exposed on `_KDB.services.history`.
- Add root service cleanup if CP-1 approves it: call `_KDB.services.history.destroy()` during root `destroy()`, alongside any other service cleanup this tranche explicitly touches.

Out of scope:

- Adding a public `_KDB.services.history.registerHistoryHandler`.
- Adding any other public `_KDB.services.history.*` registration or binding method.
- Adding `_KDB.history`.
- Changing history stack behavior, event names, or kdbControl tracked target list.
- Porting replay for filters/widgets/tabs/header/footer.
- History controls UI.
- Browser harness / `TEST/` sandbox.

## 4. Ownership And Boundaries

| Concern | Owner |
|---|---|
| `_KDB.state.history` | `historyService`. |
| `_KDB.state.kdbControl.settings` | `kdbControl`. |
| Replay-handler contribution staging | `kdbControl`, after its runtime bucket exists. |
| Replay-handler map assembly | core bootstrap/service wiring through `collectReplayHandlers.js`. |
| Replay-handler late binding | `historyService` internal runtime adapter or equivalent orchestrator-private mechanism. |
| `kdbControl_settingsChange` replay implementation | `kdbControl`. |

Bootstrap glue may read `_KDB.runtime.kdbControl.historyReplayHandlerContribution` as an internal staged integration point. No other module may call or mutate kdbControl internals directly.

The handler map is internal to `historyService`; it is not a public service surface and is not stored in `_KDB.state`.

If a runtime adapter is used for late binding, it must live under `_KDB.runtime.history.adapters` and be treated as bootstrap-private. Feature modules must not call it.

## 5. Registration Order

Required order for active replay:

1. Early service bootstrap registers `historyService` with an empty or partial internal `replayHandlers` map.
2. Feature registration creates `_KDB.api.kdbControl`.
3. `kdbControl.mount()` creates `_KDB.runtime.kdbControl` and stages `_KDB.runtime.kdbControl.historyReplayHandlerContribution`.
4. Bootstrap/service glue builds `replayHandlers.kdbControl_settingsChange` from that staged handler.
5. Bootstrap/service glue late-binds the collected handler map into the already-registered `historyService`.
6. `historyControls.mount()` may then use `_KDB.services.history.undo()` / `redo()` with active kdbControl replay.

Approved strategy for this delta:

| Strategy | Meaning |
|---|---|
| A / approved recommendation | Register `historyService` early, stage owner replay contributions after owner mount, then late-bind collected replay handlers through bootstrap-private service glue. |
| B / fallback only | Register `historyService` after `kdbControl.mount()` and before `historyControls.mount()`. This is simpler but makes history service availability later than desired. |
| C / rejected for this tranche | Register `historyService` after all modules. This is too late for consumers and makes service availability depend on UI mount order. |

No strategy may expose a public handler registration method.

## 6. Root Destroy Cleanup

This tranche may also close the currently observed service cleanup gap:

- root `destroy()` should call service `destroy()` methods before `clearRuntimeCore(this)`;
- at minimum `_KDB.services.history.destroy()` must be called if `historyService` has been registered;
- cleanup must be idempotent and must not throw if a service is absent;
- if broader service cleanup is added for all services, do it with a small focused helper and preserve existing feature destroy order unless CP-1 explicitly changes it.

If root service cleanup is considered too broad for this tranche, it may be deferred, but the CP-2 report must state that `historyService.destroy()` is not root-wired yet.

## 7. Files Expected To Change

Expected production files:

```txt
KDB3/js/core/services/historyService/createHistoryService.js
KDB3/js/core/services/historyService/__orchestratorHistoryService.js
KDB3/js/core/services/__orchestratorServices.js
KDB3/js/KDB.js
KDB3/js/dashboard/canvas/kdbControl/createKdbControlController.js
```

Optional focused helper, only if it reduces complexity and stays under clear ownership:

```txt
KDB3/js/core/services/collectReplayHandlers.js
```

No other files are expected. If another file seems necessary, stop and escalate before editing.

## 8. Acceptance Criteria

1. `_KDB.services.history` is still registered under `_KDB.services.history`; no `_KDB.history` alias is introduced.
2. `historyService` is registered early and remains available before kdbControl mount.
3. `historyService` can receive an internal late-bound `replayHandlers` map with `kdbControl_settingsChange` after kdbControl has staged its handler.
4. The late-bind mechanism is bootstrap-private and is not exposed as `_KDB.services.history.registerHistoryHandler` or any other public service method.
5. `kdbControl.mount()` stages `_KDB.runtime.kdbControl.historyReplayHandlerContribution` after `_KDB.runtime.kdbControl` exists.
6. No public `registerHistoryHandler` method is added.
7. No imports from `dashboard/canvas/kdbControl/history/*` are added inside `historyService` files.
8. Bootstrap glue may read `_KDB.runtime.kdbControl.historyReplayHandlerContribution`; no feature state is written by bootstrap.
9. If replay handler is unavailable, history service remains usable and undo/redo for that step resolves `false`.
10. Root destroy cleanup either calls `history.destroy()` or is explicitly reported deferred.
11. AMD import arrays and factory parameters remain in one-to-one order.
12. `ReadLints` is clean on touched files.
13. Static inspection confirms imports resolve and no forbidden legacy / TEST imports were introduced.

## 9. CP-1 Decisions Requested

1. Approve Strategy A: register `historyService` early, then late-bind replay handlers internally after kdbControl has staged its contribution?
2. Approve a bootstrap-private late-bind mechanism, preferably under `_KDB.runtime.history.adapters`, with no public `_KDB.services.history.*` registration method?
3. Approve staging the kdbControl replay contribution during `kdbControl.mount()` after `_KDB.runtime.kdbControl` is initialized?
4. Approve touching `KDB.js` only for the minimal ordering / bind / destroy cleanup needed by this bootstrap glue?
5. Approve optional helper updates around `core/services/collectReplayHandlers.js` if they keep `__orchestratorServices.js` and `KDB.js` small?
6. Approve root service cleanup in this tranche, at least for `historyService.destroy()`?

## 10. Approval

| Datum | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Draft delta awaiting review and approval. |

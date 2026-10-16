# Execution Spec: `historyService` + `kdbControl` replay bootstrap late bind

> Execute only after CP-1 approval of `historyService-kdbControl-replay-bootstrap-contractdelta.md`.
> This spec implements Strategy A: early `historyService` registration plus bootstrap-private late binding of kdbControl replay handlers.

---

**Status:** `Draft`
**Contract delta:** `_____________KDB3API/contracts/historyService-kdbControl-replay-bootstrap-contractdelta.md`
**Phase:** `bootstrap replay late bind`
**Authoring AI:** GPT-5.5, 2026-05-17
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below and echo one sentence per item before editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces and ownership map.
2. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state, canonical writers, no foreign state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources under `_KDB.runtime.<owner>` with explicit cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — one public surface per module/service; no ad hoc public registration APIs.
5. `_____________KDB3API/.cursor/rules/events.mdc` — event bus discipline; no event changes in this tranche.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — folder roles, small files, orchestrator/controller split and contract-first workflow.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing and underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, dependency arrays and factory parameters in one-to-one order.
10. `_____________KDB3API/contracts/historyService.md` — history service state, public API and replay boundary.
11. `_____________KDB3API/contracts/kdbControl-history-contractdelta.md` — kdbControl step model and owner replay rules.
12. `_____________KDB3API/contracts/historyService-kdbControl-replay-bootstrap-contractdelta.md` — approved Strategy A late-bind contract delta.
13. `_____________KDB3API/KDB3/js/core/services/historyService/createHistoryService.js` — current replayDeps closure and public surface.
14. `_____________KDB3API/KDB3/js/KDB.js` — current bootstrap and mount order.

First output must be the 14 summaries. If any summary is generic or missing, stop and re-read.

---

## Section B. Scope

Implement Strategy A from the contract delta:

1. Keep `historyService` registered early during `setupCoreFactories`.
2. Create an internal, bootstrap-private late-bind route for replay handlers.
3. Stage `kdbControl_settingsChange` after `_KDB.runtime.kdbControl` exists during `kdbControl.mount()`.
4. After `kdbControl.mount()`, collect replay handlers and late-bind them into the existing history service.
5. Mount `historyControls` only after the late-bind call.
6. Keep root destroy cleanup for `historyService.destroy()`.

No public registration method, no `_KDB.history`, no feature replay imports inside `historyService`.

Out of scope:

- Canvas owner implementation or `_KDB.api.canvas`.
- Broader UI input sync changes beyond the existing replay route.
- Filters/widgets/tabs/header/footer replay handlers.
- HistoryControls UI implementation changes.
- Browser harness or TEST work.

---

## Section C. Expected file changes

Required:

```txt
_____________KDB3API/KDB3/js/core/services/historyService/createHistoryService.js
_____________KDB3API/KDB3/js/core/services/historyService/__orchestratorHistoryService.js
_____________KDB3API/KDB3/js/core/services/__orchestratorServices.js
_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/createKdbControlController.js
_____________KDB3API/KDB3/js/KDB.js
```

Optional, only if it keeps files small and focused:

```txt
_____________KDB3API/KDB3/js/core/services/collectReplayHandlers.js
```

Do not edit contracts, rules, templates, legacy trees, `TEST/`, CSS, event catalog files, or unrelated dashboard feature files in this execution.

---

## Section D. Required runtime flow

The final runtime flow must be:

```txt
setupCoreFactories(_KDB)
  _orchestratorServices(_KDB)
    registers tableData, loading, historyService early
    historyService starts with replayHandlers {}
  registerFeatureModules(_KDB)
    creates _KDB.api.kdbControl and other APIs

mountFeatureModules(_KDB, _renderOptions)
  _KDB.api.header.mount({})
  _KDB.api.footer.mount({})
  _KDB.api.kdbControl.mount({})
    creates _KDB.runtime.kdbControl
    stages _KDB.runtime.kdbControl.historyReplayHandlerContribution
  _orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true })
    collectReplayHandlers(_KDB)
    late-binds into existing historyService
  _KDB.api.historyControls.mount({})
  mount remaining modules
```

If existing module ordering requires preserving `filterDock`, `launchpad`, `dragDrop` or `metricsTree` placement, preserve it except for the required insertion of the late-bind call between `kdbControl.mount()` and `historyControls.mount()`.

---

## Section E. Per-file specification

### `core/services/historyService/createHistoryService.js`

- **Role:** history service factory.
- **Lines:** keep under hard limit 150.
- **Required behavior changes:**
  - Initialize `context.replayDeps.replayHandlers` to an object, never `null`.
  - Add a factory-scope helper `bindReplayHandlers(_KDB, context, replayHandlers)` or equivalent.
  - The bind helper replaces or shallow-copies the internal `context.replayDeps.replayHandlers` map.
  - The bind helper must not be exposed on `_KDB.services.history`.
  - Store a bootstrap-private adapter under `_KDB.runtime.history.adapters.bindReplayHandlers`.
  - The adapter calls the bind helper and returns `true` on success, `false` after disposal.
  - `destroy()` must remove or null `runtime.history.adapters.bindReplayHandlers` during cleanup through the existing runtime cleanup path.
- **Public surface must remain exactly:**

```js
{
  pushCommittedStep: pushCommittedStep,
  undo: undo,
  redo: redo,
  canUndo: canUndo,
  canRedo: canRedo,
  getSnapshot: getSnapshot,
  destroy: destroy
}
```

- **Rules to apply:**
  - `module-public-api.mdc` — no public registration method; named service API unchanged.
  - `runtime.mdc` — runtime adapter is internal/bootstrap-private and cleaned on destroy.
  - `state.mdc` — service writes only `_KDB.state.history`.
  - `error-handling.mdc` — public methods keep existing try/catch behavior.
  - `amd.mdc` — full-compact AMD shape; no nested helper declarations.

### `core/services/historyService/__orchestratorHistoryService.js`

- **Role:** service orchestrator.
- **Lines:** target under 80; hard limit 120.
- **Required behavior changes:**
  - Keep state/runtime normalization.
  - Preserve early creation behavior when `_KDB.services.history` is absent.
  - If `_options.bindReplayHandlersOnly === true`, do not recreate the service.
  - In bind-only mode, read `_KDB.runtime.history.adapters.bindReplayHandlers`.
  - Call the adapter with `_options.replayHandlers || {}` when available.
  - Return `_KDB.services.history` from bind-only mode.
  - If bind-only is requested but the adapter/service is absent, log a focused warning and return existing service or `null`; do not throw.
- **Rules to apply:**
  - `feature-structure.mdc` — thin orchestrator, wiring only.
  - `runtime.mdc` — uses history-owned runtime adapter only.
  - `module-public-api.mdc` — does not add public service methods.
  - `error-handling.mdc` — service startup boundary remains try/catch.

### `core/services/__orchestratorServices.js`

- **Role:** core services orchestrator.
- **Lines:** target under 80; hard limit 120.
- **Required behavior changes:**
  - Register `tableData`, `loadingService`, and `historyService` in normal early service registration.
  - Remove or stop using the old `deferHistory` / `registerHistoryOnly` path for this use case, unless kept only as backward-compatible no-op behavior.
  - Add support for `_options.bindHistoryReplayHandlersOnly === true`.
  - In bind-only mode:
    1. call `_collectReplayHandlers(_KDB)`;
    2. call `_orchestratorHistoryService(_KDB, { bindReplayHandlersOnly: true, replayHandlers: replayHandlers })`;
    3. return `_KDB.services`.
  - Do not import kdbControl dashboard files.
  - Do not write `_KDB.state.*`.
- **Rules to apply:**
  - `feature-structure.mdc` — orchestrator contains wiring only.
  - `kdb-object.mdc` — uses `_KDB.services` only for services.
  - `runtime.mdc` — coordinates runtime adapter indirectly.
  - `amd.mdc` — dependency array and parameters stay aligned.

### `core/services/collectReplayHandlers.js` (optional existing helper)

- **Role:** focused bootstrap helper.
- **Lines:** target under 50.
- **Behavior:**
  - Read `_KDB.runtime.kdbControl.historyReplayHandlerContribution`.
  - If it has an `apply` function, return `{ kdbControl_settingsChange: handler }`.
  - If absent, return `{}`.
  - Do not write state.
  - Do not import dashboard modules.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `naming.mdc`.

### `dashboard/canvas/kdbControl/createKdbControlController.js`

- **Role:** kdbControl controller.
- **Lines:** existing file is near hard limit; keep edit minimal.
- **Required behavior changes:**
  - Remove or neutralize the constructor-time `_stageHistoryReplayHandler(_KDB, applySettingsAction)` call because it runs before `_KDB.runtime.kdbControl` exists.
  - In `mount()`, after `_KDB.runtime.kdbControl = { ... }` is assigned, call `_stageHistoryReplayHandler(_KDB, applySettingsAction)`.
  - The staging call must happen before code that could trigger history service binding.
  - Preserve existing `mount()`, `destroy()`, `dispatch()` and `getState()` public surface.
  - Do not add public methods to `_KDB.api.kdbControl`.
  - Do not write `_KDB.state.history`.
- **Rules to apply:**
  - `runtime.mdc` — stage only after runtime owner bucket exists.
  - `module-public-api.mdc` — no new public kdbControl methods.
  - `state.mdc` — no foreign history state writes.
  - `error-handling.mdc` — keep mount/destroy boundaries guarded.

### `KDB.js`

- **Role:** root bootstrap and destroy owner.
- **Lines:** existing file has approved larger bootstrap exception; keep edits focused.
- **Required behavior changes:**
  - In `setupCoreFactories(_KDB)`, call `_orchestratorServices(_KDB)` for normal early service registration.
  - Do not defer history registration in setup.
  - Keep `registerFeatureModules(_KDB)` in setup after service registration.
  - In `mountFeatureModules(_KDB, _renderOptions)`, call `_KDB.api.kdbControl.mount({})`.
  - Immediately after `kdbControl.mount({})`, call `_orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true })`.
  - Call `_KDB.api.historyControls.mount({})` after the bind call.
  - Preserve existing mounts for header, footer, launchpad, dragDrop, metricsTree, filterDock as much as possible.
  - Do not import historyService directly into `KDB.js`; use `core/services/__orchestratorServices.js`.
  - Keep `destroyCoreServices(this)` calling `_KDB.services.history.destroy()` before `clearRuntimeCore(this)`.
- **Rules to apply:**
  - `feature-structure.mdc` — `KDB.js` change is bootstrap wiring only.
  - `amd.mdc` — dependency array/factory parameters remain aligned.
  - `runtime.mdc` — root destroy reaches service cleanup.
  - `error-handling.mdc` — existing root lifecycle try/catch remains.

---

## Section F. Acceptance Criteria

1. `_KDB.services.history` is registered during setup before `kdbControl.mount()`.
2. `_KDB.services.history` public surface remains exactly `pushCommittedStep`, `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`, `destroy`.
3. No public `_KDB.services.history.registerHistoryHandler` or equivalent public bind method exists.
4. No `_KDB.history` alias exists.
5. `createHistoryService.js` supports bootstrap-private late binding of replay handlers.
6. Late binding is reachable only through a history-owned runtime adapter or equivalent orchestrator-private mechanism, not through the public service surface.
7. `kdbControl.mount()` stages `_KDB.runtime.kdbControl.historyReplayHandlerContribution` after `_KDB.runtime.kdbControl` exists.
8. `KDB.js` calls service replay binding after `kdbControl.mount()` and before `historyControls.mount()`.
9. `collectReplayHandlers()` returns `kdbControl_settingsChange` when the staged handler exists.
10. `historyService.undo()` no longer logs `handler missing kdbControl_settingsChange` when a kdbControl history step is present and the handler contribution exists.
11. `historyService` still resolves undo/redo `false` when no handler exists.
12. No `historyService` file imports kdbControl files.
13. No bootstrap code writes `_KDB.state.kdbControl` or `_KDB.state.history` directly.
14. No legacy, `TEST/`, CSS, event catalog or unrelated dashboard files are modified.
15. AMD dependency arrays and factory parameters stay aligned.
16. `ReadLints` is clean on touched files.
17. Static search confirms no forbidden aliases/imports/public methods.
18. CP-2 report states replay status: active or commit-only.
19. CP-2 report states root destroy cleanup status.

---

## Section G. Forbidden Actions

- Do not add public history handler registration APIs.
- Do not add any public `_KDB.services.history.*` bind/update method.
- Do not add `_KDB.history`.
- Do not move kdbControl replay logic into `historyService`.
- Do not import kdbControl files from historyService files.
- Do not port filters/widgets/tabs/header/footer replay.
- Do not implement `_KDB.api.canvas`.
- Do not change the kdbControl tracked target list.
- Do not add browser harness or tests.
- Do not edit `.mdc` rules, templates, architecture authority docs, event catalog files or legacy files.
- Do not change history stack limit, event names or lifecycle terms.

---

## Section H. Verification Hints

Static checks the executing AI should run or report:

```txt
Search `_KDB.history` in touched production files -> no matches.
Search `registerHistoryHandler` in touched production files -> no matches.
Search `bindReplayHandlers` -> allowed only in historyService internals / service bootstrap, not on `_KDB.services.history`.
Inspect `KDB.js` order -> kdbControl.mount, bindHistoryReplayHandlersOnly, historyControls.mount.
Inspect `createKdbControlController.js` -> stage handler after runtime initialization.
Inspect `createHistoryService.js` returned object -> no public bind method.
```

---

## Section I. Reporting Template

The executing AI reports:

1. Pre-flight echo.
2. File checklist with line counts.
3. Registration/bind order before and after.
4. Public history service surface before and after.
5. Replay handler status: active or commit-only.
6. Root destroy cleanup status.
7. ReadLints result.
8. Static search result for forbidden aliases/imports/public registration methods.
9. Deviations or open questions.

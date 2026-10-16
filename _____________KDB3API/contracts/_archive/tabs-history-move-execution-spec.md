# Execution Spec: `tabs` History (MOVE)

> Mechanical implement spec. Architecture lives in `contracts/tabs-history-contractdelta.md` (PO implement-GO 2026-08-16). Do not invent.

---

**Status:** `Executed — Cognos green 2026-08-16`
**Module / contract:** `_____________KDB3API/contracts/tabs-history-contractdelta.md`
**Phase:** `extension (MOVE history frames)`
**Authoring AI:** planner, 2026-08-16
**Executing AI:** Composer 2.5
**Root:** `_____________KDB3API/KDB3/js/`

---

## Section A. Pre-flight

Read, then echo one sentence each, then **proceed** (supervising planner pre-accepts the echo):

1. `kdb-object.mdc` 2. `state.mdc` 3. `runtime.mdc` 4. `module-public-api.mdc` 5. `events.mdc`
6. `feature-structure.mdc` 7. `naming.mdc` 8. `error-handling.mdc` 9. `dom.mdc` 10. `amd.mdc`
11. `contracts/tabs-history-contractdelta.md` (whole file — binding)
12. This spec.

## Section B. Files

Create (in order):

```
dashboard/tabs/history/buildCommittedStep.js
dashboard/tabs/history/maybePushTabsMoveHistoryStep.js
dashboard/tabs/history/applyTabsMoveHistoryReplay.js
dashboard/tabs/history/createTabsHistoryReplayHandler.js
dashboard/tabs/history/stageTabsHistoryReplayHandler.js
```

Edit:

```
dashboard/tabs/__orchestratorTabs.js          // +1 import, call stage after initializeRuntime
dashboard/tabs/actions/runTabMutationSaga.js  // +1 import, maybePush after finalize
core/services/collectReplayHandlers.js        // addContribution tabs_move from runtime.tabs
contracts/tabs-history-contractdelta.md       // Status → Implementing (approval log line)
```

**Do not edit:** `createTabsController.js` (already 10 AMD imports; destroy already nulls `historyReplayHandlerContribution`).

## Section C. Per-file

### `dashboard/tabs/history/buildCommittedStep.js`

- **Rules to apply:** `amd.mdc` (one `define`, factory-scope named fn); `naming.mdc` (`__controller`, `_` on boundary args); `error-handling.mdc` (pure one-liner object return — try/catch **not** required if body is a single object literal with no I/O).
- **Lines:** ≤40.
- **AMD imports:** none.
- **Entry:** `__controller(_s, _d, _timestamp)` returns
  `{ key: "tabs_move", timestamp, old: { tabIndex: d, targetPosition: s }, new: { tabIndex: s, targetPosition: d } }`
  where `s = _s`, `d = _d` (numbers). timestamp = `_timestamp` if finite number else `Date.now()`.
- Return `__controller`.

### `dashboard/tabs/history/maybePushTabsMoveHistoryStep.js`

- **Rules to apply:** `amd.mdc`; `naming.mdc`; `error-handling.mdc` (named executable: try/catch, log prefix `[tabs.maybePushTabsMoveHistoryStep]`, rethrow or convert — this is a non-boundary helper: log + do not throw into saga; convert by returning without push); `kdb-object.mdc` (use `_KDB.services.history`, no `window._KDB`).
- **Lines:** ≤80.
- **AMD imports:** `"./buildCommittedStep.js"`
- **Entry:** `maybePushTabsMoveHistoryStep(_KDB, _plan, _payload, _result)`
- **Logic (all must hold or no-op):**
  1. `_plan.operation === "move"`
  2. `_payload.isHistoryReplay !== true`
  3. `_result.outcome === "applied" || _result.outcome === "degraded"` (never key off `_result.ok === true` alone)
  4. `s = _plan.sourceSlot.tabIdx`, `d = _plan.targetTabIdx` are finite numbers and `s !== d`
  5. `_KDB.services.history.pushCommittedStep` is a function; else `console.warn` once via runtime flag `tabs.historyServiceMissingWarned` (dienststelle parity) and return
  6. `pushCommittedStep(buildCommittedStep(s, d, Date.now()))`
- Do not invent `history.clear`. Do not call `finishWritebackRestore`.

### `dashboard/tabs/history/applyTabsMoveHistoryReplay.js`

- **Rules to apply:** `amd.mdc` (async helper at factory scope, not IIFE inside entry); `error-handling.mdc` (async: try/catch; convert to `false`, log `[tabs.applyTabsMoveHistoryReplay]`); `module-public-api.mdc` (dispatch only); `events.mdc` (no new events).
- **Lines:** ≤70.
- **AMD imports:** none (use literal `"tabs/move"`).
- **Entry:** `async function apply(_KDB, _targetValue, _step, _ctx)` — export `{ apply: apply }`.
- **Logic:**
  1. If `_step.key !== "tabs_move"` → `false`
  2. If no `_KDB.api.tabs.dispatch` → `false`
  3. `tabIndex` / `targetPosition` from `_targetValue` must be finite numbers → else `false`
  4. `var result = await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex, targetPosition, isHistoryReplay: true, source: "historyReplay" } })`
  5. Return `true` iff `result && (result.outcome === "applied" || result.outcome === "degraded")`. **Never** `return result === true` or `return result.ok === true`.
  6. Catch → log + `return false`. AbortError filter if present.

### `dashboard/tabs/history/createTabsHistoryReplayHandler.js`

- **Rules to apply:** `amd.mdc`; `naming.mdc` (`createTabsHistoryReplayHandler`).
- **Lines:** ≤30.
- **AMD imports:** `"./applyTabsMoveHistoryReplay.js"`
- Copy dienststelle `createDienststelleHistoryReplayHandler.js` shape: factory returns `{ apply: fn }` that checks `step.key === "tabs_move"` then delegates to apply module. `void _KDB` on factory arg.

### `dashboard/tabs/history/stageTabsHistoryReplayHandler.js`

- **Rules to apply:** `runtime.mdc` (write only `_KDB.runtime.tabs.historyReplayHandlerContribution`); `error-handling.mdc` (try/catch, log `[tabs.stageTabsHistoryReplayHandler]`, convert — do not throw out of orchestrator).
- **Lines:** ≤30.
- **AMD imports:** `"./createTabsHistoryReplayHandler.js"`
- Copy `stageDienststelleHistoryReplayHandler.js`: ensure `_KDB.runtime.tabs` exists; assign contribution; return handler.

### `dashboard/tabs/__orchestratorTabs.js` (edit)

- **Rules to apply:** `amd.mdc` (import count 7→8, under 10); `feature-structure.mdc` (orchestrator wires only).
- Add import `"./history/stageTabsHistoryReplayHandler.js"` as last dep.
- After `initializeRuntime(_KDB)` (runtime object exists, contribution currently null), call `_stageHistoryReplayHandler(_KDB)` before `createTabsController`.
- Do not add business logic. File must stay ≤120 lines.

### `dashboard/tabs/actions/runTabMutationSaga.js` (edit)

- **Rules to apply:** `amd.mdc` (7→8 imports); `error-handling.mdc` (existing async already has no outer try — do **not** wrap the whole saga; maybePush has its own catch). `naming.mdc`.
- Add import `"../history/maybePushTabsMoveHistoryStep.js"`.
- Replace the success return (after `phases.finalize = _support.ok();`) with:
  ```js
  var result = _buildResult(plan.operationId, phases);
  _maybePushTabsMoveHistoryStep(_ctx._KDB, plan, payload, result);
  return result;
  ```
- Do not push on earlier abort/fail returns.
- File must stay ≤150 lines.

### `core/services/collectReplayHandlers.js` (edit)

- After widgetText `widget_textEdit` block, add:
  ```js
  var tabsRt = _KDB.runtime && _KDB.runtime.tabs;
  var tabsContribution = tabsRt && tabsRt.historyReplayHandlerContribution;
  addContribution(map, "tabs_move", tabsContribution);
  ```
- No other keys. No new `_KDB.*`.

### Contract status

In `tabs-history-contractdelta.md` header: Status → `Implementing`. Approval log: add row 2026-08-16 `Draft → Implementing` / vastenburg / implement-GO.

## Section D. Forbidden

- New `_KDB.*`, `_KDB.services.tabMutation`, `tabs/historyReplayRequested`, new events, `widgetVis/history/`, NMS history, folder regroup, `history.clear`, `finishWritebackRestore` from tabs, editing `createTabsController.js`, helpers/common/misc/shared folders, ES modules, nested subfunctions inside entry fns, exceeding 10 AMD imports, push on delete/duplicate, confirm/choose on replay.

## Section E. Acceptance (code)

1. `tabs_move` in `collectReplayHandlers.js`.
2. Orchestrator stages contribution; destroy already nulls it (do not regress).
3. User MOVE (`isHistoryReplay` absent) with outcome applied/degraded pushes inverse frame `{ old: d→s, new: s→d }`.
4. Replay dispatch uses `isHistoryReplay: true` so maybePush no-ops.
5. Handler returns `true` for degraded committed replay.
6. No `message.choose` on replay (replay never calls `confirmAndDispatchTabMove`).

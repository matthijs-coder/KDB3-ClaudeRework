# Contract Delta: writeback T2 item 5a — `waitForInflightTraversals` on restore/reset

> Closes deferred backlog §3.2. Implements an existing shall: tabs restore
> and reset must await in-flight startup/traverse before they mutate.
> Parent `tabs-parameterSetRestore-contractdelta.md` stays authoritative
> after the §4 clarification in this delta.

---

**Status:** `Implementing` (PO vastenburg, 2026-08-16: GO 5a)
**Parent:** `contracts/tabs-parameterSetRestore-contractdelta.md` §4 item 2,
§4.1, §7; `contracts/writeback.md` §6.4 steps 13–14 / newDashboard reset
**Depends on:** `tabs/actions/guardParameterSetRun.js` (`waitForInflightTraversals`,
`isStale`) — already live on activate + post-restore traverse
**Type:** `feature module contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-16
**Related:** `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 5
(slice **5a** only)

---

## 1. Purpose

`tabs/parameterSetRestoreRequested` and `tabs/parameterSetResetRequested`
must settle `_KDB.runtime.tabs.pendingPromises.startup` and `.traverse`
before `tabs/parameterSetApply` and Cognos/DOM title sync. Today only
activate and post-restore traverse wait. Restore/reset can commit names and
visibility while a startup traverse is still clicking.

No public API change. No writebackSet change. writebackSet already `await`s
the owner promise.

---

## 2. PO decisions (2026-08-16)

| # | Choice | Decision |
|---|---|---|
| 1 | T2 item 5 split | **5a only.** 5b abort-`activeIndex` and 5c canvasReady stay deferred. |
| 2 | Reset in scope | **Yes.** Same wait as restore (`newDashboard` has no later activate wait). |
| 3 | When to wait | After guard + non-mutating validation; before `parameterSetApply`. Invalid payload fails fast without waiting. |
| 4 | Helper keys | **Unchanged.** `startup` + `traverse` only. Do not wait `tabMutation`. |
| 5 | Inflight failure | **Unchanged.** Helper swallows rejection (`.catch(() => false)`). |
| 6 | Timeout | **None on the helper.** Nested traverse/hydrate already cap at `HYDRATE_TIMEOUT_MS` (30s). |
| 7 | writebackSet | **No code.** Orchestrator already awaits restore/reset. |
| 8 | `canvasReady` / abort landing | **Out.** 5c / 5b. |

---

## 3. Required behavior

Both handlers:

1. `guardParameterSetRun` (numeric `runId`, monotonic stale-guard, hydrated
   dashboard `tabId`). Guard failure returns immediately (no wait).
2. Restore only: validate `payload.tabs` shape and saved count vs slots.
   Invalid → existing `WRITEBACK_TABS_TARGET_MISSING` (no wait).
3. `await waitForInflightTraversals(_KDB)`.
4. If `isStale(runId)` → `{ ok: false, tabTargets: null }` plus existing
   `WRITEBACK_RESTORE_CANCELLED` shape from `cancelledResult()`.
5. Then apply + Cognos/DOM sync + `tabTargets` as today.

Copy the wait + stale pattern from `parameterSetActivateTab.js` /
`postParameterSetRestoreTraverse.js`. Handlers become `async` (they already
return Promises). `routeParameterSetAction.js` stays a pass-through.

`tabs/resolveFilterScopeTargets` does **not** wait (outside §4 item 2).

After the wait, a still-conflicting traverse is the existing §7
`TABS_TRAVERSE_CONFLICT` path (restore/reset do not dispatch `tabs/traverse`).

---

## 4. Files

**Must change (tabs module only):**

- `KDB3/js/dashboard/tabs/actions/parameterSetRestore.js`
- `KDB3/js/dashboard/tabs/actions/parameterSetReset.js`

**Must not change for this WP:**

- `guardParameterSetRun.js` (helper already correct)
- activate / post-traverse (already wait)
- writebackSet (`runNormalRestore.js`, `runNewDashboardReset.js`,
  `dispatchOwnerPhase.js`)
- `resolveFilterScopeTargets.js`

Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports.
No new files unless a handler would exceed 150. No `handle*` / `*Support` /
`helpers|shared|common`. No new `_KDB.*`. No `.mdc` edits.

---

## 5. Parent patches (this WP)

- `tabs-parameterSetRestore-contractdelta.md` §4 item 2: the wait applies to
  **restore and reset**; placement = after guard/validation, before apply;
  helper = `waitForInflightTraversals` (startup + traverse).
- `contracts/futureTodo/writeback-restore-deferred-backlog.md` §3.2: mark
  **in progress (T2-5a)**; do not mark done until Cognos.
- `contracts/futureTodo/t2-parameterSet-gaps-launch-prompt.md` item 5: 5a in
  progress; 5b/5c not started.

`writeback.md` needs no SET-sequence change.

---

## 6. Out of scope

- T2 5b abort-`activeIndex` / restore user tab on failed SET
- T2 5c honest `canvasReady` / `waitFor: "widgetsRendered"` on activate
- Changing `waitFor: "canvas"` globally (PDF, GET, tab mutation)
- Waiting `pendingPromises.tabMutation`
- `tabs/waitUntilTraversed` / `tabs/retraverse`
- T0/T1, WP5, canvas-discovery, T3 folder regroup, item 4 `head.icon`

---

## 7. Acceptance (Cognos after implement)

1. Normal SET with `v3.tabs`: restore still returns `tabTargets`; names and
   visibility match v3; surplus slots untouched.
2. `status === "newDashboard"`: reset still defaults names/visibility and
   returns `tabTargets`.
3. SET while tabs startup/traverse is still in flight: restore/reset wait,
   then apply; no `TABS_TRAVERSE_CONFLICT` from this race; no torn
   name/visibility vs in-flight clicks.
4. Stale `runId` after the wait: `WRITEBACK_RESTORE_CANCELLED`, `tabTargets:
   null`, no apply.
5. Invalid restore payload still fails fast (`WRITEBACK_TABS_TARGET_MISSING`)
   without waiting.
6. Activate, post-restore traverse, widget restore, filter restore, T1
   history: unchanged.

# Contract Delta: writeback T2 item 5b — abort landing tab

> Closes deferred backlog §3.1. On SET cancel/fail/abort, put the user back
> on the tab they had before the run. Success landing stays step 28 (first
> visible). Parent `tabs-parameterSetRestore-contractdelta.md` and
> `writeback.md` stay authoritative after the patches in this delta.

---

**Status:** `Implementing` (PO vastenburg, 2026-08-16: GO 5b; 5a not Cognos-green)
**Parent:** `contracts/tabs-parameterSetRestore-contractdelta.md` §5–§6;
`contracts/writeback.md` §2.2 outcomes, §6 cleanup
**Depends on:** T2-5a wait helper (keep); mutation
`ensureSlotReadyForMutation.restoreOriginalActiveTab` (tabs-internal reuse)
**Type:** `feature module + shared-service contract delta`
**Authoring AI:** planner (Grok 4.6), 2026-08-16
**Related:** `contracts/_archive/t2-parameterSet-gaps-launch-prompt.md` item 5
(slice **5b** only)

---

## 1. Purpose

Mechanical restore activations use `restoreActiveTab: false`. DOM follows the
clicked restore tab; `state.activeIndex` is a 120ms observer mirror and the
traverse confirmed payload writes the **pre-click** index. Success self-heals
via post-restore traverse (first visible). An aborted run leaves the last
restore-clicked tab on screen.

This WP restores the **pre-run user tab** (or first visible if that tab was
hidden by this run’s apply) on non-success outcomes only.

---

## 2. PO decisions (2026-08-16)

| # | Choice | Decision |
|---|---|---|
| 1 | T2 item 5 split | **5b only.** Do not mark 5a Cognos-done. 5c canvasReady stays deferred. |
| 2 | Outcomes that land | `cancelled`, `failed`, and live `abortedByOwner`. **Not** `committed` / `degraded`. Do not add `abortedByOwner` to the public `RestoreResult.outcome` enum. |
| 3 | Capture | Once at `createRunContext`, **before** any owner dispatch, via `_KDB.api.tabs.getState()`. `{ index, tabId }`. Physical `activeIndex`, not writeback `tabIdx`. Do not recapture after `parameterSetApply`. |
| 4 | How to click | New tabs action `tabs/parameterSetAbortLandingRequested`. writebackSet must not click Cognos and must not import tabs internals. Do **not** reuse `parameterSetActivateTabRequested` (`hasBeenActivated` skip). Do **not** reuse post-restore traverse (first-visible + `widgetsRendered`). |
| 5 | Hidden original | If the snapshot tab is still **visible**, land there. If it is now hidden/missing, land on the **first visible** dashboard slot and **force** the click. Do not leave the user on a hidden tab. |
| 6 | `didActivate` | Required. Set only when activate actually dispatched `tabs/traverse` (`clicked: true`), including click-then-fail. Skip-on-`hasBeenActivated` is not a click. Set the flag **before** `assertStillCurrent` so cancel-after-click still lands. |
| 7 | Cleanup | Best-effort inside `finishRestoreRun`. Direct `_KDB.api.tabs.dispatch`. **No** `dispatchOwnerPhase` (its `assertStillCurrent` throws `CANCELLED` on the main abort case). Failure must not flip `cancelled` → `failed`. Diagnostics `details.nonDegrading: true`. |
| 8 | Emit suppression | **Out.** Do not suppress `tabs:changed` for the whole parameterSet run. |
| 9 | Filt-only success | **Out.** No step 28 on filt-only success stays as-is. |
| 10 | `waitFor` | Abort click uses existing mutation activate (`waitFor: "canvas"`). Not `widgetsRendered`. |

---

## 3. writebackSet

### 3.1 Run fields

On the existing run object (not a new `_KDB.*`):

```js
run.originalActive = { index: number|null, tabId: string|null } | null
run.didActivate = false
```

Capture helper is local to `createRunContext.js`. `index: null` → abort
landing no-ops.

### 3.2 `didActivate`

`dispatchOwnerPhase`: after `api.dispatch` returns, before `assertStillCurrent`:

```js
if (spec.type === "tabs/parameterSetActivateTabRequested"
    && result && result.clicked === true) {
  run.didActivate = true;
}
```

`parameterSetActivateTabRequested` return adds `clicked: true` only on the
TRAVERSE path (success, traverse-fail, or stale **after** the click). Guard,
missing slot, skip-`hasBeenActivated`, stale-before-traverse: no `clicked`.

### 3.3 Cleanup helper

New `set/effects/restoreAbortActiveTab.js`. Called from
`executeRestoreRunCleanup.finishRestoreRun` after singleSelect finalize,
before clearing restore flags.

Gate: skip when `outcome` is `"committed"` or `"degraded"`, or when
`originalActive.index` is not a number, or when `_KDB.api.tabs.dispatch`
is missing.

Dispatch:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetAbortLandingRequested",
  payload: {
    source: "writebackSet",
    runId: run.runId,
    skipHistory: true,
    originalActive: run.originalActive,
    didActivate: run.didActivate === true
  }
});
```

Do not use `run.dispatchOwnerPhase`. try/catch; map failures to
`WRITEBACK_TABS_TRAVERSAL_FAILED` with `details.nonDegrading: true`.

---

## 4. Tabs owner

### 4.1 Action

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetAbortLandingRequested",
  payload: {
    originalActive: { index, tabId },
    didActivate: boolean,
    source, runId, skipHistory: true
  }
});
```

Return: `Promise<{ ok: boolean, diagnostics }>`.

`ok: false` is informative. writebackSet must not fail the SET from it.

### 4.2 Handler

File: `tabs/actions/parameterSetAbortLanding.js`.

1. `guardParameterSetRun` (hydrated tabs). Guard failure returns immediately.
2. `await waitForInflightTraversals`; stale → `cancelledResult()`.
3. Resolve landing index from **current** owner state (after this run’s apply):
   - snapshot index exists and `visible === true` → land there; pass through
     `didActivate`;
   - else first visible dashboard slot; **force** `didActivate: true`;
   - no visible slot → `{ ok: true }` no-op.
4. `ensureSlotReadyForMutation.restoreOriginalActiveTab(_ctx, { originalActive: { index: landingIndex, tabId }, didActivate })`.
5. Helper false → `{ ok: false, diagnostics: [WRITEBACK_TABS_TRAVERSAL_FAILED] }`.

Reuse the mutation helper (same click + `includeHiddenDashboardTabs` + skip
when `didActivate !== true` and `state.activeIndex === landingIndex`). Do not
copy `activateSlot` into a third file.

### 4.3 Routing (footgun)

`routeParameterSetAction` **defaults unknown types to post-restore traverse**.
The new type **must** be an explicit `if` and must be listed on
`isParameterSetAction`. Missing that fires a full `widgetsRendered` traverse
on abort.

`createTabsController.js`: no new AMD import (already at 10). Routing stays
`isParameterSetAction` → `routeParameterSetAction`.

`disposedResult`: same cancelled shape as other parameterSet* types.

---

## 5. Files

**Change**

- `writeback/set/state/createRunContext.js`
- `writeback/set/effects/dispatchOwnerPhase.js`
- `writeback/set/effects/executeRestoreRunCleanup.js`
- `tabs/actions/parameterSetActivateTab.js` (`clicked`)
- `tabs/actions/routeParameterSetAction.js`
- `tabs/config/actionTypes.js`

**New** (verb+noun)

- `tabs/actions/parameterSetAbortLanding.js`
- `writeback/set/effects/restoreAbortActiveTab.js`

**Must not change**

- `guardParameterSetRun.js` helper keys
- 5a restore/reset wait
- `runFilterRestore.js` / `runWidgetRestore.js` activate payloads
- `createWritebackSetService.js` overlap `await settled`
- `createTabsController.js` import list
- item 4 header/icon; T1 history; NMS; 5c canvasReady

Line budget: JS ≤150, controller fn ≤60, ≤10 AMD imports. No `handle*` /
`*Support` / `helpers|shared|common`. No new `_KDB.*`. No `.mdc`.

---

## 6. Parent patches (this WP)

- `tabs-parameterSetRestore-contractdelta.md`: new §6.1 abort landing; §8
  keep canvasReady deferred; do not list abort landing as deferred.
- `writeback.md` §6 runtime: cancelled/failed/abort cleanup best-effort
  abort landing via the tabs action; does not change `RestoreResult.outcome`.
- `writeback-restore-deferred-backlog.md` §3.1: **in progress T2-5b**;
  emit-suppression option still deferred.
- `t2-parameterSet-gaps-launch-prompt.md` item 5: 5b in progress; 5a stays
  in progress (not Cognos-green); 5c not started.

---

## 7. Out of scope

- 5a Cognos-green / backlog-done
- 5c honest `canvasReady`
- Suppress `tabs:changed` for the whole parameterSet run
- Filt-only **success** landing (no step 28)
- `newDashboard` **success** landing (no step 28)
- Public enum add of `abortedByOwner`
- Host-item create, WP5, T3 folder regroup, item 4

---

## 8. Acceptance (Cognos after implement)

1. Successful SET: still lands on first visible tab (step 28). No abort click.
2. Fail/cancel **after** at least one real tab activate: DOM + follow-up
   `tabs:changed` return to the pre-run user tab if that tab is still visible.
3. Fail **after** tabs restore hid the user tab: land on first visible
   dashboard tab (forced click), not on the hidden original.
4. Fail **before** any activate click: no extra tab click when state already
   matches the snapshot.
5. Overlap cancel: previous run’s landing finishes before the next restore
   starts (`await settled` unchanged).
6. Abort-landing failure: SET outcome stays cancelled/failed; diagnostic
   non-degrading.
7. 5a restore/reset wait, activate skip-on-`hasBeenActivated`, T1 history:
   unchanged.

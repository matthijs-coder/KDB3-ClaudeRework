# Contract Delta: dimension Ohne clears TopN

> A vis widget with a dimension and a TopN must end with TopN Ohne when the user sets the dimension to Ohne. TopN without a dimension is not allowed.

---

**Status:** `Reviewed` — 2026-10-14. Settings review green. Vis review green. Implementation authorized by this assignment.  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-14  
**Parents:** `contracts/widgetSettings.md` §4.1 and the vis dropdown safeguard, `contracts/widgetVis.md` §7.1.2 and `applyDimension`, `contracts/widgetTopN.md` (cleanup dispatch only; no TopN behavior change)

---

## 1. Purpose

One canvas or focus click on dimension Ohne, while a real dimension and a real TopN are both committed, commits both controls to `"none"` after one successful visible bind. The chart loses the dimension and the TopN filter. The TopN dropdown shows Ohne.

Two separate facts stay distinct:

- **Product rule (new).** Settings clears the stored `topNChoice` on that click. The old sentence in `widgetVis` §7.1.2 that settings does not auto-clear `topNChoice` is withdrawn for this gesture only.
- **Backstop (already required, not implemented).** If a snapshot still arrives with an absent dimension and a non-default `topNChoice`, `widgetVis` ignores that TopN and the visible bind proceeds. Today `buildBindingSpec` copies the stale key into `dataConfig.topN`, `buildTopNFilter` fails with `WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING`, and the dimension click does not commit.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Owner of the clear is **widgetSettings**. Vis does not write `_KDB.state.widgets.settings` and does not add a second `reportToSettings` control. |
| 2 | One downstream action: `widgetVis/applyDimension`. Do not also dispatch `widgetVis/applyTopNChoice`. |
| 3 | Ohne is the control sentinel `"none"`. Absent sentinels stay `none` / `default` / `""` / `null`, judged by the private `isAbsentSentinel` already in `validateTopNGroupingDimension.js`. Do not export it. Do not copy it. Do not import `widgetBindingPlan`. |
| 4 | The hook runs only when the dimension **optionKey** is absent, the committed dimension is not absent, and the committed `topNChoice` is not absent. A second Ohne click, or Ohne while TopN is already absent, does not take the hook. |
| 5 | The snapshot on that one action has `dimension` `"none"` and `topNChoice` `"none"`. `payload.nextValue` is the string `"none"`. `handleApplySetting` overlays dimension from `nextValue`; patching only the snapshot is not enough. Other snapshot fields stay as `buildWidgetVisSettingsSnapshot` already builds them. |
| 6 | Commit both values only after the vis apply is confirmed (`isVisApplyConfirmed`). TopN is committed with kind `"topN"` and its own report `{ nextValue: "none" }`. Do not pass the dimension `reportToSettings` into the TopN commit (`commitWidgetSettingValue` prefers `report.nextValue`). |
| 7 | On failure, commit neither value. No `errorCode` from this hook. `stale: true` does not commit and does not restamp. |
| 8 | Canvas history is two existing `widgetSettings_optionSelect` steps, pushed only after confirm, **TopN first, then dimension**. Focus clicks still push no history. |
| 9 | The toast guard is unchanged. It still blocks a non-absent TopN pick while the committed dimension is absent. |
| 10 | Vis backstop: when normalized dimension is null, `dataConfig.topN` is null. `buildPlan` and `buildTopNFilter` stay as they are. |
| 11 | Helper cleanup runs only on the dimension-absent return in `topNGate`, and only when `widgetTopN.getState().byOwner[widgetId].resolutionStatus` is `pending`, `success`, or `error`. `clearHelperBinding: true`, `releaseClaim: false`. A cleanup `ok: false` does not fail the visible bind. Explicit TopN Ohne (dimension still set) is not this cleanup. |
| 12 | No new events. No new `_KDB` namespace. No new public action. |

---

## 3. Locked mechanism

### 3.1 Why the click fails today

`topNGate.js` returns `null` when the dimension normalizes to null, so `resolveRequested` does not run. `buildBindingSpec.js` still sets `dataConfig.topN` from `topNChoice` (`"top-10"` is not an absent sentinel). `buildTopNFilter.js` then returns `WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING`. `buildPlan` fails before `buildMirrorPatch`, which would have set mirror `topN` to `"default"`. `applyBinding` does not run. Settings does not commit. The dimension row stays on the optimistic Ohne mark. The TopN row stays on the old key. The chart and the helper claim stay.

### 3.2 Files

| File | Role |
|---|---|
| `widgetSettings/effects/validateTopNGroupingDimension.js` | Annotate `planned.coupledTopN = { previousValue, nextValue: "none" }` and return `null`. Toast path unchanged. File is 115 lines; stay ≤ 150. |
| `widgetSettings/effects/buildDownstreamIntentAction.js` | When `planned.coupledTopN` is set, after the existing snapshot is copied onto the payload: `payload.nextValue = "none"`, `payload.settingsSnapshot.dimension = "none"`, `payload.settingsSnapshot.topNChoice = "none"`. Do not rebuild the snapshot. File is 89 lines. |
| `widgetSettings/effects/commitCoupledTopNClear.js` | **New.** Commit kind `"topN"` with report `{ nextValue: "none" }`. Do not set `result.coupledTopNCommitted`. try/catch, log, rethrow. |
| `widgetSettings/effects/finalizeVisIntentResult.js` | When `planned.coupledTopN` is set and `result` is a non-null object, set `result.coupledTopNAttempted = true` **before** the `isVisApplyConfirmed` check. A skipped `ok: true` with no `reportToSettings` returns on that check today; the flag has to be on the object both history `when`s read. In that unconfirmed branch, when `result.stale !== true`, commit nothing, do not set `coupledTopNCommitted`, do not set `errorCode`, stamp once, focus-mark, then return. In the confirmed branch, call the TopN commit **before** the existing dimension commit, then set `result.coupledTopNCommitted = true` only after both have returned, then stamp, then the focus mark. File is 134 lines; stay ≤ 150. |
| `widgetSettings/view/markFocusDimensionAndTopNFromRecord.js` | **New.** Find the focus panel the same way `stampPanelVisType` / `topNDropdownSafeguard` already do. `markPanelOption` dimension and topN from the committed record, with the same fallbacks `stampPanelVisType` uses (`.KDB_dimensionsContainer`, `.KDB_topNContainer`). No focus panel: no-op. |
| `widgetSettings/view/queueCoupledTopNClearHistory.js` | **New.** Called synchronously from the canvas binder with the dimension old and new frames. Owns both history registrations for a dimension click. |
| `widgetSettings/history/pushHistoryAfterConfirmedApply.js` | Optional `when(result)` gate, after the existing confirmation check, before the push. `isConfirmedForHistory` stays first and does not replace `when`. No `when`: current behavior. |
| `widgetSettings/view/bindWidgetSettingsPanel.js` | Replace the existing dimension push with one call to the queue, passing the frames already built around `markSelectedOption`. If the queue returns false (not a dimension dropdown), keep the existing push. File is 214 lines (already over the hard limit). Do not put the frame logic in this file. |
| `widgetVis/effects/buildBindingSpec.js` | When `normalizeDefaultValue(settings.dimension)` is null, `dataConfig.topN` is null. File is 150 lines. One ternary only. |
| `widgetVis/effects/gates/dispatchTopNCleanupWhenDimensionAbsent.js` | **New.** The cleanup dispatch. |
| `widgetVis/effects/gates/topNGate.js` | On the dimension-absent return only, call that module and then return `null` as `helperTableResult`. Do not change the `isDefaultTopNChoice` return. File is 185 lines (already over the hard limit). The call only. |

**Must not edit:** `bindFocusPanelInteractions.js`, `buildPlan.js`, `buildTopNFilter.js`, `buildMirrorPatch.js`, `widgetTopN/**`, `handleApplySetting.js`, `parameterSetRestoreBatchCommits.js`, startup seed, `validateTopNGroupingDimension` toast copy and its `applyTopNChoice` branch, `KDB.js`.

**Must not add:** a second settings dispatch, a second `reportToSettings` control, an export of `isAbsentSentinel`, a `widgetBindingPlan` import from widgetSettings, a new history key, a new event.

### 3.3 Settings hook

In `validateTopNGroupingDimension`, before the existing `applyTopNChoice` branch:

1. If `planned.type` is not `widgetVis/applyDimension`, fall through to the existing toast branch.
2. If `planned.optionKey` is not an absent sentinel, return `null`.
3. If the committed dimension is absent, or the committed `topNChoice` is absent, return `null`.
4. Otherwise set `planned.coupledTopN` from the committed `topNChoice` and return `null`.

`executeIntent` stays one path: this function, one downstream action, one finalize. Startup vis seed and parameter-set restore do not go through `executeIntent`. They are out of this hook.

`readCommittedDimension` stays. Read `topNChoice` from the same settings record. Missing `topNChoice` is absent.

### 3.4 Commit, stamp, focus

Confirmed (`isVisApplyConfirmed`), and `planned.coupledTopN` is set. Both commits and the flag sit in the existing try. Commit TopN first, then the existing dimension commit, then set the flag. A throw before the flag does not roll back the vis apply and does not add an `errorCode`. The existing catch still returns the vis result.

1. `commitCoupledTopNClear` (kind `"topN"`, report `{ nextValue: "none" }`).
2. Existing dimension commit from `reportToSettings`.
3. Set `result.coupledTopNCommitted = true` only after both commits have returned.
4. `stampPanelVisType` once. Canvas dimension and TopN then match the record (both `"none"`).
5. Focus mark from that same record.

TopN is committed first so a throw on that commit leaves the previous legal pair in settings. A throw on the dimension commit after that leaves TopN Ohne and the old dimension, which is still a legal pair. The committed flag stays unset in both throws. The existing catch still returns the vis result, and `isConfirmedForHistory` is true for that object. Both history registrations for this click therefore use a `when` that requires `coupledTopNCommitted === true` whenever `coupledTopNAttempted === true`, so neither step is pushed. A skipped `ok: true` without `reportToSettings` is the same: `isVisApplyConfirmed` is false, so nothing is committed, and `isConfirmedForHistory` would still push unless that `when` refuses it.

Unconfirmed, `planned.coupledTopN` set, `result.stale !== true`:

1. No commit. No `coupledTopNCommitted`. No `errorCode`.
2. `stampPanelVisType` once, so the canvas optimistic Ohne mark is replaced from the still-old dimension.
3. Focus mark from that same record, so a focus Ohne mark returns to the old dimension. The focus TopN row was not optimistically changed; the mark leaves it on the committed key.

`stampPanelVisType` does not mark focus option rows (`stampMatchingFocusCloneVisType` only copies the vis-type attribute). The new focus function is what moves those two rows.

Do not optimistic-mark the TopN row at click time.

### 3.5 History

`queueCoupledTopNClearHistory(kdb, panel, dropdown, intentResult, dimensionOldFrame, dimensionNewFrame)`:

1. Return `false` unless the clicked dropdown kind is `dimension`. The binder then uses its existing push.
2. Return `true` after registering nothing when the dimension old and new frames are equal. `pushCommittedStep` would drop that dimension step. Do not register a TopN step either. A click on a dimension row that is already selected (the optimistic Ohne mark left by a stale or failed apply, while the committed dimension is still real) must not leave a lone TopN step. Undo of that step would replay Top-10 while dimension is `"none"`, the toast guard would return `ok: false`, and the history pointer would not move.
3. **At this call, not inside the promise callback,** read the TopN dropdown in that same panel. Old frame = `buildDropdownSelectionFrame` (the row still selected). New frame = `fromOption` on the live row whose option key is `"none"`. If that row is missing, `console.warn` and skip the TopN registration only.
4. Register the TopN push first, when step 3 produced both frames, with `when(result) { return !!(result && result.coupledTopNCommitted === true); }`. Do not register the dimension push in this step.
5. Register the dimension push second, with `when(result)`: if `result.coupledTopNAttempted === true`, return `result.coupledTopNCommitted === true`; otherwise return `true`. Ordinary dimension changes have no attempted flag, so they still push one step. `pushHistoryAfterConfirmedApply` runs callbacks in registration order, and `pushCommittedStep` appends. TopN registered first is the older step. Undo then restores the dimension before it restores TopN.

`isConfirmedForHistory` runs first. It does not treat `coupledTopNCommitted` as a substitute for `ok` / `stale` / `status`.

Undo and redo of the pair, TopN pushed first:

- Undo 1 replays the dimension step’s old value. TopN is already `"none"`. The hook does not run.
- Undo 2 replays the TopN step’s old key. The dimension is present. The toast guard does not run.
- Redo 1 replays the TopN step’s new value `"none"`. That is `applyTopNChoice` with an absent option key. The toast guard returns without blocking. The dimension hook does not run.
- Redo 2 replays the dimension step to `"none"`. TopN is already absent, so the hook does not run.

Replay does not push history. `bindFocusPanelInteractions.js` calls `dropdownOption` and does not push. Do not add a push there. A focus Ohne click still takes the settings hook and the focus mark. It does not add history steps. That matches every other focus option click.

Frames are captured at click time because `finalizeVisIntentResult` stamps the canvas TopN row to Ohne before the binder’s promise callbacks run. Capturing inside the callback would read Ohne as the old frame, the step would be dropped, and undo could not restore TopN.

### 3.6 Vis backstop

In `buildBindingSpec`, `dataConfig.topN` is `null` when `normalizeDefaultValue(settings.dimension)` is null. Otherwise it stays `normalizeDefaultValue(settings.topNChoice)`.

`parseTopNOption` then returns `{ kind: "default" }`. `buildTopNFilter` adds no descriptor. `buildMirrorPatch` sets mirror `topN` to `"default"` because the dimension is absent. The dropdown does not move unless settings committed `"none"`.

This is what makes a restore snapshot of `dimension: "none"` plus `topNChoice: "top-10"` bind instead of failing the plan. Settings does not clear that stored TopN in this delta. The TopN dropdown can stay on Top-10 after that restore. Accepted residual.

### 3.7 Helper cleanup

`dispatchTopNCleanupWhenDimensionAbsent`:

1. If `widgetTopN`, `getState`, or `dispatch` is missing, or `getState()` is not an object, resolve `{ ok: true, skipped: true }` before any `byOwner` read. A throw here becomes a failed prerequisite and the visible bind does not proceed. Do not read `_KDB.state.widgets.topN`.
2. If there is no `byOwner[widgetId]` record, or `resolutionStatus` is not `pending`, `success`, or `error`, resolve `{ ok: true, skipped: true }`. `idle` is skipped even when `helperWidgetId` is still set: `cleanupSucceeded` with `releaseClaim: false` keeps the id and sets status back to `idle`. A later visType or Dienststelle bind with an absent dimension must not reset the helper again.
3. Otherwise `dispatch` `widgetTopN/cleanup` with `ownerVisId`, `clearHelperBinding: true`, `releaseClaim: false`.
4. On fulfillment, ignore `ok: false`. Do not throw. `handleCleanup` already returns `ok: false` instead of rejecting, and a rejection in `resolveBindingPrerequisites` aborts the visible bind.

`topNGate` uses the result only as a signal to continue. The value passed on as `helperTableResult` is `null`, never the cleanup object.

Do not add this dispatch to the `isDefaultTopNChoice` return. The settings cascade hits the dimension-absent return first. Explicit TopN Ohne while a dimension is still set stays the existing gap in `widgetVis.md` (`applyTopNChoice` clear says cleanup; the code does not). A visType change with a real dimension and a real TopN does not take either early return, so it does not clean up and the backstop does not null `dataConfig.topN`.

The chart’s TopN include filter is removed by the vis `applyBinding` managed-filter replace, not by `widgetTopN/cleanup`. Cleanup resets the parked helper.

### 3.8 Out of this delta

- Parameter-set restore and startup seed are not auto-cleared. The backstop only stops their bind from failing.
- No general dimension failure-revert for clicks that are not this hook.
- No change to toast copy, toast anchor, or history-replay silence of that toast.
- `widgetVis.md` line about `applyTopNChoice` clear dispatching cleanup stays as written. This delta does not implement that sentence.

---

## 4. Acceptance

1. Committed dimension plus Top-10, canvas click Ohne → one bind, no dimension, no TopN filter, both controls Ohne on the canvas, focus TopN row Ohne when a focus panel is open, helper cleaned when status was `pending` / `success` / `error`. Two history steps, TopN then dimension.
2. Undo once → previous dimension, TopN stays Ohne, no grouping toast.
3. Undo again → previous TopN, helper runs, no grouping toast.
4. Redo once after that full undo → TopN Ohne, dimension unchanged, no second dimension apply.
5. Redo again → dimension Ohne, hook does not fire again.
6. Failed apply → neither value committed, no history, canvas dimension row back on the old key, focus dimension row back on the old key, no `errorCode` from this hook.
7. `stale: true` → no commit, no restamp from this hook.
8. Focus Ohne click → same commits and the same focus rows, no history steps.
9. Ohne while TopN is already absent → no `coupledTopN`, no TopN history step. Ohne after the dimension commit has landed, clicked again on the already selected Ohne row → dimension frames are equal, so no TopN step and no dimension step. A click whose dimension frames are equal while the committed dimension is still real (stale or failed mark left on Ohne) may still take the hook and commit both values, and it pushes neither history step.
10. A snapshot that still has dimension `"none"` and `topNChoice` `"top-10"` → plan succeeds, `dataConfig.topN` null, no `resolveRequested`. Stored `topNChoice` stays `"top-10"` unless the settings hook ran.
11. visType change with dimension and TopN still set → no cleanup from this path, TopN helper still resolves.

---

## 5. Parent text (apply with the implementation, not before review is green)

### `widgetSettings.md` §4.1, new bullet

Clearing a committed dimension to Ohne while `topNChoice` is a real key is one `widgetVis/applyDimension`. The snapshot has `dimension` and `topNChoice` both `"none"`. Both commit only after that apply confirms. A canvas click pushes two `widgetSettings_optionSelect` steps, TopN then dimension. The absent-dimension TopN toast is unchanged. See `contracts/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`.

### `widgetSettings.md` vis dropdown safeguard, replace the absent-dimension sentence’s neighbor

Add after the toast sentence: a dimension Ohne click that clears a real TopN is not that toast. It is one confirmed dimension apply that also commits `topNChoice` `"none"`.

### `widgetVis.md` §7.1.2, replace the rationale sentence

Replace “`widgetSettings` does not auto-clear `topNChoice` when dimension is cleared; consequence interpretation is owned by `widgetVis`. WP3: this helper gate is unchanged (silent no-op backstop when dimension is absent).” with: Settings clears a real `topNChoice` when the user or a history replay clears a real dimension (`contracts/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`). If a snapshot still has an absent dimension and a non-default `topNChoice`, vis ignores that choice: `dataConfig.topN` is null, `resolveRequested` is not sent, and the visible bind proceeds. Whenever `normalizeDefaultValue(settings.dimension)` is null, a `widgetTopN` owner in status `pending`, `success`, or `error` gets `widgetTopN/cleanup` (`clearHelperBinding: true`, `releaseClaim: false`). Cleanup failure does not fail the bind. Do not add that dispatch to the `applyTopNChoice` clear sentence. Delete the WP3 silent-no-op sentence in the same edit. It describes the old gate and would forbid this cleanup.

### `widgetVis.md` approval log

One row, 2026-10-14, this delta, PO vastenburg via this assignment.

### `widgetTopN.md`

One sentence at the cleanup section: `widgetVis` may dispatch `widgetTopN/cleanup` when a dimension is absent and this owner’s `resolutionStatus` is `pending`, `success`, or `error`. Payload and reducer behavior are unchanged.

---

## Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-10-14 | Draft | coordinator | Settings cascade + vis backstop + dimension-absent cleanup. |
| 2026-10-14 | Draft (review patch 2) | review | TopN history is registered before the dimension step. `coupledTopNAttempted` is set before `isVisApplyConfirmed`. |
| 2026-10-14 | **Reviewed** | settings review + vis review | Both returned GREEN. |
| 2026-10-14 | Code review **GREEN** | settings + vis implementation review | Awaiting canvas test. |

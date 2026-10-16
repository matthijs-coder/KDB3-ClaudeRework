# Contract Delta: `tabs` History (DUPLICATE only)

> Delta on top of `contracts/tabs.md`, tab-CRUD §7 / §4.3, and
> `tabs-history-contractdelta.md` (MOVE). For **DUPLICATE frames only**,
> supersedes those “no duplicate history” bullets. MOVE / DELETE frames
> stay as in their deltas. Rename history stays out of this WP —
> `tabs-history-rename-contractdelta.md`.

---

**Status:** `Approved — Cognos green 2026-08-18`
**Parent contract:** `contracts/tabs.md`
**Depends on:** `tabs-history-delete-contractdelta.md` (A1 reuse of
`tabs/delete` + `tabs/restoreDeleted`; do not reimplement), MOVE delta,
tab-CRUD, widgetBase + filter tab-mutation, `historyService.md` §5 / §10
**Type:** `feature module contract delta`
**Authoring AI:** captain / Grok 4.6, 2026-08-18

---

## 1. Purpose

Live `tabs/duplicate` publishes **no** history key. This WP adds
replayable **`tabs_duplicate`** frames by **reusing A1 operations**.
Never re-dispatch `tabs/duplicate` (new widget ids + launchpad stock
leak). Cognos bundled at the end (**Needs PO Cognos**).

---

## 2. PO decisions (GO = accept all)

A1-follow-up GO 2026-08-18 (draft + implement in one step):

| # | Choice | Decision |
|---|---|---|
| 1 | Scope | **Duplicate history only.** Rename out. Not A2. **C1 / F / B / T3 out.** |
| 2 | Undo | Live **`tabs/delete`** on the **clone slot** (`insertSlot`). Parks **created** clone widgets, shift-left, hides last visible (= duplicate `revealSlot` under contiguous prefix). |
| 3 | Redo | Live **`tabs/restoreDeleted`**. **Never** re-dispatch `tabs/duplicate`. |
| 4 | Apply | Widen `applyTabsDeleteHistoryReplay.js` `step.key` to `tabs_delete` \| `tabs_duplicate`. Distinguisher stays `typeof insertTabIdx === "number"` → restoreDeleted, else delete. No second apply module. |
| 5 | Cognos | **Deferred.** Record “needs PO Cognos”; do not stop the train. |
| 6 | Push | Outcome **`applied` or `degraded`**. Do not re-gate `result.ok`. Shell-exhaustion degraded still pushes. |

A1 `tabs_delete` frame **inverted**: delete stores restore in `old` /
delete in `new`; duplicate stores delete in `old` / restore in `new`.
Undo/redo pass the matching `targetValue`, so the widen does not break
delete (`old` has `insertTabIdx`; duplicate `new` has it).

---

## 3. Live evidence (A1 reuse — do not re-audit delete)

- `collectReplayHandlers.js:64-65` — tabs contribution → `tabs_move` +
  `tabs_delete`. Register `tabs_duplicate` beside them.
- `createTabsHistoryReplayHandler.js:13-14` — add `tabs_duplicate` case
  → existing delete apply.
- `applyTabsDeleteHistoryReplay.js:10` key-rejects; `:16` already
  branches on `insertTabIdx`. Widen the key check only.
- `runTabMutationSaga.js` — 9 AMD imports; +1 fits the 10-cap. `:56-57`
  push move/delete; `:61-83` capture is delete-only.
- Filter `attachDeleteHistorySlice` is `operation === "delete"` +
  `deletedSlot`. Widen to **source-scope** on `operation === "duplicate"`
  (`sourceSlot`). Nested owners already `skipHistory: true` — do not
  re-plumb widgetBase / filter user-history.
- `confirmAndDispatchTabDuplicate.js` is UI-only; never on replay.
  Insert-at-end (`insertSlot === revealSlot`, empty `slotMoves`) is A1
  restoreDeleted. Replay delete already no-ops delete push. No
  `history.clear`. Stale / missing `inLaunchpad`: A1 apply-false,
  pointer stays. `tabId` stays slot-physical.

---

## 4. Frame shape (normative)

Key: `tabs_duplicate` (snake). Same tabs contribution as move/delete.

```js
{
  key: "tabs_duplicate",
  timestamp,
  old: { tabIndex: insertSlot.tabIdx, tabId: insertSlot.tabId }, // UNDO → tabs/delete
  new: {                         // REDO → tabs/restoreDeleted
    insertTabIdx: insertSlot.tabIdx,
    tabId: insertSlot.tabId,
    name: <insert name = source name>,
    hideSlot: { tabIdx, index, tabId }, // = revealSlot
    parkedWidgetIds: string[],
    filters: { singleSelect, dienststelle, nativeMultiSelect }
  }
}
```

`old` ≠ `new`. Plain JSON objects only (nested arrays/objects ok).

- **Name:** `plan.names.byIndexAfter[String(insertSlot.index)]`.
- **hideSlot:** `plan.revealSlot` (`tabIdx` / `index` / `tabId` only).
- **parkedWidgetIds:** after widgetApply, `created.map(row => row.widgetId)`
  — **not** parked-minus-moved (shift neighbors). Degraded failures never
  enter `created`; do **not** subtract `degradedEntries`. Empty `[]` valid.

---

## 5. Capture + push + replay

**Push** at the same saga finalize hook as MOVE/DELETE when all hold:
`plan.operation === "duplicate"`; `payload.isHistoryReplay !== true`;
`plan.insertSlot.tabIdx` finite; writeback restore not active. Warn if
`pushCommittedStep` is `false`. No push on abort/fail/cancelled. Do not
call from move/delete/`restoreDeleted`.

**Capture**

- **Filters — SOURCE only, at prepare** (before `filterApply`): extend
  the three filter attach helpers from delete-only to also attach
  source-scope `historySlice` when `operation === "duplicate"`. Surface
  via existing `prepare.byOwner`. Empty `{}` / `[]` valid. Missing slice
  → skip push + `console.warn` (do not fail the duplicate).
- Do **not** capture INSERT at prepare (neighbor about to shift).
- Do **not** read `_KDB.runtime.<owner>.tabMutationSnapshots`.
- **Widgets:** after widgetApply, `created.map(row => row.widgetId)`.
  Hold slices + ids on `runContext` until finalize push.

**Undo**

```
_KDB.api.tabs.dispatch({
  type: "tabs/delete",
  payload: {
    tabIndex: targetValue.tabIndex,
    tabId: targetValue.tabId,
    isHistoryReplay: true,
    source: "historyReplay"
  }
})
```

Confirm skipped. Delete push no-ops (`isHistoryReplay`).

**Redo**

```
_KDB.api.tabs.dispatch({
  type: "tabs/restoreDeleted",
  payload: {
    insertTabIdx: targetValue.insertTabIdx,
    tabId: targetValue.tabId,
    name: targetValue.name,
    hideSlot: targetValue.hideSlot,
    parkedWidgetIds: targetValue.parkedWidgetIds,
    filters: targetValue.filters,
    isHistoryReplay: true,
    source: "historyReplay"
  }
})
```

Missing `inLaunchpad` widget → A1 abort, handler `false`, pointer stays.
No `tabs/historyReplayRequested`. historyService writes state only via
`_KDB.api.tabs.dispatch`.

**Handler `apply`:** same as A1. `"applied"` / `"degraded"` → `true`;
aborted/cancelled/failed/missing/restore-guards → `false`. Do **not**
`return result.ok === true`.

---

## 6. Folder + allowlist

**CREATE:** `tabs/history/buildTabsDuplicateCommittedStep.js`,
`tabs/history/pushTabsDuplicateHistoryStep.js`

**EDIT**

- `tabs/history/createTabsHistoryReplayHandler.js` — `tabs_duplicate` → existing delete apply
- `tabs/history/applyTabsDeleteHistoryReplay.js` — key `tabs_delete` \| `tabs_duplicate`
- `tabs/actions/runTabMutationSaga.js` — +1 import, capture created ids + duplicate slices, push beside delete/move
- `core/services/collectReplayHandlers.js` — `tabs_duplicate` on the same tabs contribution
- `filters/dienststelle/actions/prepareTabMutation.js`
- `filters/nativeMultiSelect/actions/prepareTabMutation.js`
- `filters/singleSelect/actions/prepareTabMutation.js`

New JS ≤150, ≤10 AMD imports. Saga today 9 — +1 fits.

**Do NOT touch:** MOVE builders; A1 delete push/build (except apply key
widen); widgetBase apply / duplicate clone loop; filter duplicate apply;
restoreDeleted plan/apply; `listAffectedPlanSlots`; resync;
`createTabsController`; `__orchestratorTabs`; `KDB.js`; gallery; rename.

---

## 7. Acceptance (code now; Cognos later)

1. Live duplicate with `applied` or `degraded` pushes one
   `tabs_duplicate` frame. Confirm still runs for UI duplicates.
2. Undo = `tabs/delete` on the clone slot + `isHistoryReplay`; no
   `message.confirm`; no extra `tabs_delete` frame.
3. Redo = `tabs/restoreDeleted` + `isHistoryReplay`. Never re-dispatch
   `tabs/duplicate`.
4. Nested owners do not push their own steps. Replay push no-ops.
5. Missing `inLaunchpad` / A1 restore guards → handler `false`, pointer
   stays. No `history.clear`. Leftover MOVE still apply-false on D-MOVE-3.
6. Insert-at-end reuses A1 restoreDeleted.
7. GET v3 after undo and after redo matches live layout (tab-CRUD §3.8).
   **Needs PO Cognos** (bundled round).

---

## 8. Out of scope

- Rename stays out of this WP — `tabs-history-rename-contractdelta.md`. A2. **F**, **B**, **T3**, **C1**. `history.clear`.
- Replaying `tabs/duplicate`. A second apply module. MOVE / A1 delete
  push-build (except apply key widen); widgetBase clone loop; filter
  duplicate apply; restoreDeleted plan/apply; `listAffectedPlanSlots`;
  resync; controller; orchestrator; `KDB.js`; gallery.
- `widgetVis/history/`, NMS kale undo, `widget_removed` (S16), new
  events, `tabs/historyReplayRequested`, new `_KDB.*`.

---

## As-built 2026-08-18

**Created**

- `dashboard/tabs/history/buildTabsDuplicateCommittedStep.js`
- `dashboard/tabs/history/pushTabsDuplicateHistoryStep.js`

**Edited**

- `dashboard/tabs/history/createTabsHistoryReplayHandler.js` — `tabs_duplicate` → existing delete apply
- `dashboard/tabs/history/applyTabsDeleteHistoryReplay.js` — key `tabs_delete` \| `tabs_duplicate`
- `dashboard/tabs/actions/runTabMutationSaga.js` — +1 import (10 cap); capture + push beside move/delete
- `core/services/collectReplayHandlers.js` — `tabs_duplicate` on the same tabs contribution, immediately after `tabs_delete`
- `filters/dienststelle/actions/prepareTabMutation.js`
- `filters/nativeMultiSelect/actions/prepareTabMutation.js`
- `filters/singleSelect/actions/prepareTabMutation.js`

**Allowed deviations (not silent product divergence)**

- Filter slices live on `runContext.duplicateHistorySlices` (do not overload `deleteHistorySlices`).
- Created clone widget ids live on `runContext.duplicateCreatedWidgetIds` (`created[].widgetId`; missing/empty → `[]`).
- Existing filter helper name `attachDeleteHistorySlice` kept; widened to source-scope when `operation === "duplicate"` (`sourceSlot` / `clonePair.from`).

**Reviews (2026-08-18):** dual grok-4.6 **PASS-WITH-NITS**. Nits not fixed: push not named `__controller` (family clone of A1 delete push); nested map/filter in saga capture; dead name fallback if `byIndexAfter` missing (live plans always set it). No code follow-up.

**Import cap:** saga at 10 AMD imports. Next tabs-history WP must split.

**Needs PO Cognos** (bundled later): duplicate → Undo (clone tab gone, widgets parked) → Redo (same created ids restored, not a fresh clone); GET v3 both directions; insert-at-end; degraded duplicate (thinner clone) round-trip; no confirm on replay.

**Cognos green 2026-08-18** (vastenburg, bundled A1+dup+B).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-18 | Draft + implement-GO in one step → `Implementing` | vastenburg | A1-follow-up GO; Cognos later. |
| 2026-08-18 | `Implementing → Implemented — awaiting PO Cognos` | vastenburg (captain review) | Dual grok-4.6 PASS-WITH-NITS. No code follow-up. Cognos bundled later. |
| 2026-08-18 | `Implemented/awaiting Cognos → Approved — Cognos green` | vastenburg | Bundled Cognos round after A1+dup+B. |

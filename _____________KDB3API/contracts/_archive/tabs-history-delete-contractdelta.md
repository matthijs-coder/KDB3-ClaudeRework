# Contract Delta: `tabs` History (DELETE only)

> Delta on top of `contracts/tabs.md`, `tabs-tabCrud-contractdelta.md` §7 /
> §4.1 (no-undo), and `tabs-history-contractdelta.md` (MOVE-only). For
> **DELETE frames only**, supersedes those “no delete history” bullets.
> MOVE frames stay as in the MOVE delta. Duplicate history is
> `tabs-history-duplicate-contractdelta.md`. Rename stays out of this WP —
> `tabs-history-rename-contractdelta.md`.

---

**Status:** `Approved — Cognos green 2026-08-18`
**Parent contract:** `contracts/tabs.md`
**Depends on:** `tabs-history-contractdelta.md` (Cognos-green MOVE),
`tabs-tabCrud-contractdelta.md` (§2.1, §2.2, §3.1 park, §3.7 skipHistory,
§4.1 delete), `widgetBase-tabMutation-contractdelta.md`,
`singleSelect-tabMutation-contractdelta.md`,
`dienststelle-tabMutation-contractdelta.md`,
`nativeMultiSelect` tab-mutation apply, `historyService.md` §5 / §10
**Type:** `feature module contract delta`
**Authoring AI:** captain / planner + Grok 4.6 explore, 2026-08-17
**Related:** live `tabs/history/` MOVE four-file set;
`collectReplayHandlers.js` `tabs_move` only; D-CRUD-2 (park so undo stays possible)

---

## 1. Purpose

User-visible hole: live `tabs/delete` parks widgets and hides the last visible
slot, but publishes **no** history key. Only `tabs_move` is registered.
After a later delete, leftover MOVE frames can target the wrong visible-prefix
content (MOVE delta §5). This WP adds replayable **`tabs_delete`** frames.

**Live finding (do not use the MOVE inverse-dispatch shortcut):**
`tabs/delete` is not self-inverse. Re-dispatching `tabs/delete` on undo would
delete another visible tab. Redo uses live `tabs/delete`. Undo uses a new
saga operation `tabs/restoreDeleted` (reveal + shift-right + take parked
widgets + restore filters/name). Same family as delete/move/duplicate:
`runTabMutationSaga`, `skipHistory: true` on nested owners, replay via
`_KDB.api.tabs.dispatch` + `isHistoryReplay: true`. historyService owns the
stack only.

---

## 2. PO decisions for this delta (GO = accept all)

Recorded as **proposed defaults** until implement-GO:

| # | Choice | Default |
|---|---|---|
| 1 | Scope | **Delete history only.** No duplicate / rename frames. Not A2. |
| 2 | Undo action | **`tabs/restoreDeleted`**. Not `tabs/delete`, not `tabs/add`, not `tabs/duplicate`. |
| 3 | Stale MOVE | Delete **does not** truncate the stack. No `history.clear`. D-MOVE-3 miss → handler `false`, pointer stays. |
| 4 | Missing parked widget on undo | **Abort** (`outcome: "aborted"`, handler `false`, pointer stays). Do not steal a widget that left the launchpad. |
| 5 | Cognos | **Deferred.** Record “needs PO Cognos” after code; do not stop the train. |
| 6 | Allowlist | **Expanded vs predecessor sketch** (see §8). Owner apply for `restoreDeleted` is in this WP; skipHistory is already live. |

Rejecting row 2 (forcing undo = `tabs/delete`) is a product bug. If A1 feels
too heavy, pick **F** instead — do not shrink this WP into a non-replayable
push.

---

## 3. Live evidence (2026-08-17, do not re-audit)

- Registry: `collectReplayHandlers.js:62-64` — tabs contribution → `tabs_move` only.
- Handler: `createTabsHistoryReplayHandler.js:6-8` — hard-rejects any other key.
- Push: `runTabMutationSaga.js:53` → `pushTabsMoveHistoryStep.js:14-16` no-ops unless `plan.operation === "move"`. Delete shares the saga and never pushes.
- Delete UI: `confirmAndDispatchTabDelete.js` → `tabs/delete`. Cognos path hides the last visible slot (`syncTabsDomFromState`); widgets park `reason: "tabDelete"` (`handleApplyTabMutation.js:24-29`). Physical `tabId` / index never change (tab-CRUD §2.1).
- Nested skipHistory already on every owner dispatch (`dispatchOwnerTabMutation.js:12-17`). Do not re-plumb widgetBase / filter history push.
- historyService: `apply !== true` → pointer stays (`applyHistoryStep.js` + reducer `undoSucceeded`). Unknown key → handler missing → `false`. Limit 5. `old === new` rejected. `old`/`new` must be plain JSON objects.

---

## 4. Ownership / replay boundary

| Piece | Owner |
|---|---|
| Stack, pointer, `pushCommittedStep` / undo / redo | `historyService` |
| Frame build + push after a committed live DELETE | `tabs` (`pushTabsDeleteHistoryStep`) |
| Redo apply | tabs handler → `tabs/delete` + `isHistoryReplay: true` |
| Undo apply | tabs handler → `tabs/restoreDeleted` + `isHistoryReplay: true` |
| Nested permutation | existing saga; owners keep `{ skipHistory: true, source: "tabsMutation" }` |

- `tabId` remains **slot-physical**. Frame identity for redo is `{ tabIndex, tabId }` of the deleted **content’s slot at push time**; after a successful undo that same physical slot holds the restored content again.
- Do **not** add `tabs/historyReplayRequested`. Do **not** go through `confirmAndDispatchTabDelete.js` on replay (no `message.confirm`).
- Do **not** write tabs / widgets / filter state from `historyService` or from the replay handler except via `_KDB.api.tabs.dispatch`.
- Parameter restore stays `skipHistory: true`. No new `_KDB.*`. No `_KDB.services.tabMutation`.

---

## 5. Frame shape

Step key: `tabs_delete`.

```js
{
  key: "tabs_delete",
  timestamp: <ms>,
  old: {                    // UNDO command → tabs/restoreDeleted
    insertTabIdx: k,        // visible-prefix index of the deleted content
    tabId: <deletedSlot.tabId>,
    name: <content-logical name at delete>,
    hideSlot: { tabIdx, index, tabId },  // slot hidden by the delete (to reveal)
    parkedWidgetIds: string[],           // deleted-content ids only (see §6)
    filters: {                           // serializable owner slices
      singleSelect: <plain object>,
      dienststelle: <plain object>,
      nativeMultiSelect: <plain object>
    }
  },
  new: {                    // REDO command → tabs/delete
    tabIndex: k,
    tabId: <deletedSlot.tabId>
  }
}
```

`old` and `new` must differ (`pushCommittedStep` rejects equality). Nested
arrays/objects are allowed inside the plain objects; no DOM, functions, or
Cognos API handles. Lossless `JSON.stringify` round-trip is mandatory
(`normalizeHistoryStep`).

`parkedWidgetIds` = widgetApply `parked` minus `moved` (shift parks are taken
back onto neighbors; deleted content stays parked). Empty array is valid
(tab had no canvas widgets).

---

## 6. Commit + capture + replay

### 6.1 Push (live delete only)

After the same saga finalize hook as MOVE (`runTabMutationSaga` post-commit
path), when **all** hold:

1. `plan.operation === "delete"`
2. `payload.isHistoryReplay !== true`
3. `plan.deletedSlot.tabIdx` is a finite number
4. writeback restore is not active (`pushCommittedStep` already no-ops)

Do **not** re-gate on `result.ok` (false for degraded). Warn if
`pushCommittedStep` returns `false`. Do not push on abort/fail/cancelled
returns (those never reach the hook). Do not call this helper from
move/duplicate/`restoreDeleted`.

**Capture (before filters are cleared):**

- **Name:** add `deletedName` on the delete plan at plan-build time
  (`slots[deletedTabIdx].name`). Do not read post-commit names.
- **Filters:** after successful `prepareTabMutation`, before `filterApply`.
  Each filter owner’s prepare success result on delete **must** include
  `historySlice`: the serializable deleted-scope subset in the **same
  shape** that owner already stores in `tabMutationSnapshots` for
  `writeScopeFromSnapshot` / equivalent. Surface prepare results from
  `dispatchOwners` as an additive `byOwner` map (existing callers ignore it).
  Tabs copies those three slices into the frame. Tabs does **not** read
  `_KDB.runtime.<owner>.tabMutationSnapshots` (runtime is owner-private).
- **Widgets:** after successful `widgetBase/applyTabMutation`, from the
  return value (`parked` minus `moved`). No widgetBase selector import
  required.

Hold the slice on `runContext` until the finalize push. If a required
filter `historySlice` is missing, **skip the push** and `console.warn`
(do not fail the already-committed delete).

### 6.2 Redo

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

Same live `tabMutationDelete` → saga. Confirm dialog skipped. Push no-ops
(`isHistoryReplay`).

### 6.3 Undo — `tabs/restoreDeleted`

New action type `RESTORE_DELETED: "tabs/restoreDeleted"`. Routed like
delete/move/duplicate. **Not** a user-facing edit-UI tool.

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

Plan (pure, inverse of delete, duplicate-shaped permutation **without clone**):

- Guard: a hidden dashboard slot exists (`TABS_MAX_VISIBLE` otherwise →
  aborted). Prefer `payload.hideSlot.tabId` as the reveal target; it must
  currently be hidden. If that slot is visible (e.g. user `tabs/add` ate it)
  → aborted.
- `insertTabIdx` must lie in `[0, visibleCount]` of the **current** prefix.
- `slotMoves`: shift-right from `insertTabIdx` through last visible, same
  construction as `buildTabDuplicatePlan` (descending).
- `revealSlot` = the hidden slot being brought back (payload `hideSlot`).
- `insertSlot` = physical slot at `insertTabIdx` after the shift (content
  lands here). `tabId` on the payload is the **content’s original**
  `deletedSlot.tabId`; after a clean undo/redo pair it equals `insertSlot.tabId`.
  If live `insertSlot.tabId !== payload.tabId` → aborted (layout drifted).
- `landing` = `insertSlot` (user undoing delete sees the tab return).
- `names.byIndexAfter`: restored `name` on `insertSlot`; shifted names like
  duplicate.
- `restore`: `{ parkedWidgetIds, filters }` copied from the payload
  (JSON-cloned). Owners read **this**, not a live source tab.

Reducer commit: same as duplicate reveal + `names.byIndexAfter` (do **not**
reuse `plan.hideSlot` hide-branch). Operation string is `restoreDeleted`,
not `duplicate`.

Cognos: existing `applyTabMutationToCognos` (`setTabName` + `syncTabsDomFromState`
+ landing traverse). Hide/reveal is CSS visibility, not destroy/create.

### 6.4 Handler `apply` return

Same rule as MOVE. `historyService.applyHistoryStep` advances the pointer
only on strict `true`.

| `outcome` | handler returns |
|---|---|
| `"applied"` or `"degraded"` | `true` |
| `"aborted"` / `"cancelled"` / `"failed"` / missing result / restore guards | `false` |

Do **not** `return result.ok === true`. Switch on `step.key` in
`createTabsHistoryReplayHandler` (widgetBase multi-key pattern). Today’s
`tabs_move`-only apply would make every delete undo return `false`.

Register `addContribution(map, "tabs_delete", tabsContribution)` next to
`tabs_move`. One contribution object, two keys.

---

## 7. Owner apply for `restoreDeleted`

SkipHistory / `source: "tabsMutation"` unchanged. Prepare snapshots the
**current** (post-delete) layout for the shift-right, same as duplicate.
Apply then:

| Owner | restoreDeleted apply |
|---|---|
| **widgetBase** | Shift via existing park/take (`applyMoveSnapshotFirst` / duplicate shift). Then `takeFromLaunchpad` each `plan.restore.parkedWidgetIds` onto `insertSlot.tabId`, `reason: "tabRestore"`, `isHistoryReplay: true` (same as today’s tab-mutation take). If any listed id is missing or not `inLaunchpad` → `{ ok: false }` (saga aborts; handler `false`). Do **not** clone / `placeSerializedWidgetEntry`. Operation guard gains `restoreDeleted`. |
| **dienststelle / nativeMultiSelect / singleSelect** | Shift-right from prepare snapshot (duplicate path). Then write `plan.restore.filters.<owner>` onto the **insert** scope with existing `writeScopeFromSnapshot` / equivalent. Do **not** clone from a live source tab. Prepare + apply operation guards gain `restoreDeleted`. `historySlice` on delete-prepare only (undo payload), not required on restoreDeleted-prepare. |
| **host resync** | Existing `resyncTabMutationHost` after commit (non-fatal degraded). |

Rollback: existing `restoreTabMutationSnapshot`. No new owner actions.

---

## 8. Folder + allowlist

New / extend under existing `tabs/history/` (MOVE files stay; do not overload
`buildCommittedStep.js` with a second key):

```
tabs/history/buildTabsDeleteCommittedStep.js
tabs/history/pushTabsDeleteHistoryStep.js
tabs/history/applyTabsDeleteHistoryReplay.js
tabs/history/createTabsHistoryReplayHandler.js   // key switch; already staged
```

Also in this WP (required for a working undo; predecessor history-only
allowlist was insufficient):

- `core/services/collectReplayHandlers.js` — `tabs_delete` key
- `tabs/actions/runTabMutationSaga.js` — +1 import push; capture slice;
  still ≤10 AMD imports (today 8)
- `tabs/actions/runTabMutationOwnerPhases.js` — additive `byOwner` on
  `dispatchOwners` return
- `tabs/config/actionTypes.js` — `RESTORE_DELETED`
- `tabs/actions/routeTabMutationAction.js` + new `tabMutationRestoreDeleted.js`
- `tabs/state/buildTabRestoreDeletedPlan.js`
- `tabs/state/buildTabMutationPlan.js` — `deletedName` on delete plan
- `tabs/state/reduceTabMutationApply.js` — reveal/names for `restoreDeleted`
- widgetBase `handleApplyTabMutation.js` (+ small restore take helper if
  needed to stay ≤150)
- dienststelle / nativeMultiSelect / singleSelect prepare+apply operation
  guards + restoreDeleted apply + delete `historySlice`

Line budget for **new** JS: executable ≤150, orchestrator ≤120, controller fn
≤60, ≤10 AMD imports. Does not justify splitting files already over 150.

`__orchestratorTabs.js` already stages the contribution — touch only if the
create-handler import path changes (it should not). `createTabsController.js`
stays at the 10-import cap — do not add imports there.

---

## 9. Acceptance (code now; Cognos later)

1. Live delete (not replay) with outcome `applied` or `degraded` pushes one
   `tabs_delete` frame. Confirm dialog still runs for UI deletes.
2. Undo restores visible-prefix order, name, parked widgets, and the three
   filter slices; lands on the restored tab; no `message.confirm`.
3. Redo deletes that content again via `tabs/delete` + `isHistoryReplay`.
4. Nested owners do not push their own steps.
5. Replay push no-ops (`isHistoryReplay`).
6. No hidden slot / hideSlot visible / insert `tabId` mismatch / parked id
   not on launchpad → handler `false`, pointer unchanged.
7. Leftover `tabs_move` still apply-false on D-MOVE-3; delete does not
   `history.clear`.
8. GET v3 after undo and after redo consistent with live layout (tab-CRUD
   §3.8). **Needs PO Cognos** (bundled round).

---

## 10. Out of scope

- Duplicate history: `tabs-history-duplicate-contractdelta.md`. Rename stays out of this WP — `tabs-history-rename-contractdelta.md` (never A2 here).
- `history.clear` / `finishWritebackRestore` from tabs.
- `widgetVis/history/`, NMS kale-value undo, `widget_removed` replay (S16).
- Gallery / `buildControlPrimitiveGallery.js`, `KDB.js`, canvas-discovery,
  T2 5a/5b/5c, T3 folder regroup, remaining >150 splits.
- `tabs/add` or `tabs/duplicate` as fake undelete.
- New events; `tabs/historyReplayRequested`; new `_KDB.*`.

---

## As-built 2026-08-18

**Extra files beyond original §8** (required so `restoreDeleted` does not break; all were on the implement-GO allowlist):

- `core/utils/filters/tabMutationRun/listAffectedPlanSlots.js` — insert/reveal for empty `slotMoves`
- `dashboard/filters/singleSelect/actions/buildTabMutationTransfers.js` — restoreDeleted branch (no clonePair, no clearSlots)
- `dashboard/widgets/widgetBase/actions/handlePrepareTabMutation.js` — insert/reveal route collect
- `dashboard/filters/dienststelle/actions/resyncTabMutationHost.js` and `.../nativeMultiSelect/actions/resyncTabMutationHost.js` — insert/reveal host resync
- `dashboard/tabs/state/tabMutationPostconditions.js` — +1 visible / reveal-visible
- `dashboard/tabs/state/reduceTabsAction.js` — `RESTORE_DELETED` no-op beside DELETE/MOVE/DUPLICATE
- Owner restore apply siblings: widgetBase / dienststelle / nativeMultiSelect / singleSelect `applyTabMutationRestoreDeleted.js`

**Implementation notes (not silent product divergence):**

- Frozen restore plan omits `hideSlot` / `deletedSlot` / `clonePair` / `sourceSlot`.
- Insert-at-end (`insert === reveal`): do not overwrite `payload.name` with the neighbor name. Required; duplicate’s reveal-name copy is wrong for restore. `names.byIndexAfter`: insert index gets `payload.name`; reveal gets last-visible name only when reveal is a different slot.
- First-hidden reveal guard **KEEP**. Delete hides last visible, which becomes first hidden under contiguous-prefix. Revealing a later trailing hidden slot would break duplicate-shaped `slotMoves`. Captain confirmed after semantic review. Reveal `hideSlot.tabId` must be the first hidden dashboard slot (`tabIdx === visibleCount`); otherwise plan aborts.
- `plan.restore.filters.nativeMultiSelect` JSON-clones as an array (`[]` default, not `{}`); `writeScopeFromSnapshot` iterates `.length`.
- Insert-at-end empty `slotMoves`: widget apply still runs `ensureRevealTakeTarget` because apply runs before reducer reveal.

**Reviews (2026-08-18):** dual grok-4.6 mechanical + semantic **PASS-WITH-NITS**. Nits not fixed (family clones: nested finally clone of `tabMutationDelete`, `_planHelpers` alias, duplicate-family `_support` params). Cosmetic; do not mix Track P.

**Needs PO Cognos** (bundle at end): delete → Undo → Redo; GET v3 after undo and after redo (`tabs`, `wgts[].tab`, `filt.dstl.byTab`, `filt.sels[].tab`, `filt.pcfs[].tab`); no confirm on replay; leftover MOVE still apply-false on D-MOVE-3; insert-at-end delete/undo; NMS empty restore vs leftover dest host items (known risk, same as duplicate).

**Cognos green 2026-08-18** (vastenburg, bundled A1+dup+B).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-17 | `Draft — awaiting PO implement-GO` | captain | A1 named. Live verify: undo ≠ `tabs/delete`. STOP after this write. |
| 2026-08-18 | Draft → Implementing | vastenburg | implement-GO |
| 2026-08-18 | `Implementing → Implemented — awaiting PO Cognos` | vastenburg (captain review) | Dual grok-4.6 review PASS-WITH-NITS. No code follow-up. Cognos bundled later. |
| 2026-08-18 | `Implemented/awaiting Cognos → Approved — Cognos green` | vastenburg | Bundled Cognos round after A1+dup+B. |

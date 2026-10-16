# Contract Delta: `tabs` History (RENAME only)

> Delta on top of `contracts/tabs.md` §16 (no rename history), tab-CRUD §7,
> and `tabs-history-contractdelta.md` (MOVE). For **RENAME frames only**,
> supersedes those “no rename history” bullets. MOVE / DELETE / DUPLICATE
> frames stay as in their deltas. Self-inverse like MOVE. Not restoreDeleted.

---

**Status:** `Implemented — awaiting PO Cognos` (PO GO 2026-08-18; reviews PASS-WITH-NITS)
**Parent contract:** `contracts/tabs.md`
**Depends on:** MOVE + A1 delete + duplicate history deltas (register beside
them), live `tabs/rename`, `historyService.md` §5 / §10
**Type:** `feature module contract delta`
**Authoring AI:** captain / Grok 4.6, 2026-08-18
**WP:** next letter after Cognos green on A1+dup+B; captain locked **rename history**. Not A2. Not a saga op.

---

## 1. Purpose

Live `tabs/rename` publishes **no** history key. This WP adds replayable
**`tabs_rename`** frames. Undo/redo re-dispatch live `tabs/rename` (same
action, inverse name). Cognos later (**Needs PO Cognos** — new WP after the
bundled A1+dup+B round).

---

## 2. PO decisions (GO = accept all)

PO GO 2026-08-18 (next letter after Cognos green on A1+dup+B):

| # | Choice | Decision |
|---|---|---|
| 1 | Scope | **Rename history only.** Not A2. Not saga. **F / B / T3 / C1 out.** |
| 2 | Undo/redo | Live **`tabs/rename`** + `isHistoryReplay` + `preserveEditSession`. Self-inverse like MOVE. **NOT** `restoreDeleted`. |
| 3 | Push | `renameTab` **after** confirmed Cognos `setTabName` + confirmed dispatch. Skip replay / `old===new` / failed. |
| 4 | Apply | **New** `applyTabsRenameHistoryReplay.js`. Do **not** overload delete apply or MOVE `buildCommittedStep.js`. |
| 5 | Cognos | **Deferred.** Record “Needs PO Cognos”; do not stop the train. |
| 6 | Handler | `true` **iff** dispatch returns boolean `true`. Not MutationResult. |

---

## 3. Live evidence (do not re-audit MOVE/A1/dup)

- `collectReplayHandlers.js:64-66` — tabs contribution → `tabs_move` +
  `tabs_delete` + `tabs_duplicate`. Register `tabs_rename` beside them.
- `createTabsHistoryReplayHandler.js:10-16` — move vs delete/dup apply.
  Add `tabs_rename` → **new** apply (2 AMD imports today; +1 fits).
- `runTabMutationSaga.js` — **10 AMD cap**. Do **not** add imports. Rename
  is not a saga op.
- `dispatchTabsRename.js:10-20` — pending **drops** `isHistoryReplay` today.
  **Must copy** it (`payload.isHistoryReplay === true`). `preserveEditSession`
  already copied. `source` already copied.
- `applyTabsRenameEffects.js:40-56` `renameTab` — Cognos `setTabName`, then
  confirmed dispatch, then **always** `cleanupTabRenameEditSession`. Push
  here after confirmed pair. Replay **skips** cleanup.
- `reduceTabsRename.js` — **142/150**. Do **not** touch. Confirmed already
  honors `preserveEditSession === true`. Pending does **not** change
  `tab.name` — capture `previousName` from `byIndex` **before** `setTabName`.
- Nested owners / confirm dialog: N/A (inline edit; no `skipHistory` plumbing).
- Stale after later MOVE: no `history.clear`. Handler `false` if tab not
  renamable. Leftover MOVE still apply-false on D-MOVE-3.

---

## 4. Frame shape (normative)

Key: `tabs_rename` (snake). Same tabs contribution as move/delete/duplicate.

`tabIndex` is **physical** `byIndex` index (live rename `target.index` /
`payload.tabIndex`), **not** MOVE visible-prefix `tabIdx`.

```js
{
  key: "tabs_rename",
  timestamp,
  old: { tabIndex, tabId, name: previousName },   // UNDO → tabs/rename
  new: { tabIndex, tabId, name: confirmedName }   // REDO → tabs/rename
}
```

`old` ≠ `new` (`pushCommittedStep` rejects equality). Plain JSON objects
only. Same `tabIndex` / `tabId` on both sides; names differ.

**Inverse:** undo applies `old.name`; redo applies `new.name`. Same live
`tabs/rename`. No direction branching except `isHistoryReplay` +
`preserveEditSession`.

---

## 5. Capture + push + replay

**Push** from `applyTabsRenameEffects.js` `renameTab` when all hold:
Cognos `setTabName` returned; confirmed reducer dispatch ran;
`payload.isHistoryReplay !== true`; `previousName !== confirmedName`;
writeback restore not active (`pushCommittedStep` already no-ops). Warn if
`pushCommittedStep` is `false`. No push on failed path. Do **not** call from
saga / move / delete / duplicate.

**Capture:** `previousName` = `byIndex[tabIndex].name` **before**
`setTabName`. `confirmedName` = Cognos return (same fallback as today’s
confirmed dispatch: `confirmedName || payload.name`). `tabIndex` / `tabId`
from the pending payload (physical).

**Undo / redo** (handler always dispatches `targetValue`):

```
_KDB.api.tabs.dispatch({
  type: "tabs/rename",
  payload: {
    tabIndex: targetValue.tabIndex,
    tabId: targetValue.tabId,
    name: targetValue.name,
    isHistoryReplay: true,
    source: "historyReplay",
    preserveEditSession: true
  }
})
```

Replay skips `cleanupTabRenameEditSession`. Reducer already keeps the edit
session when `preserveEditSession: true`. No `tabs/historyReplayRequested`.
historyService writes state only via `_KDB.api.tabs.dispatch`.

**Handler `apply`:** `true` iff that dispatch returns **`true`** (boolean).
Do **not** map MutationResult `outcome`. Apply-false (pointer stays) when:
tabs API missing; `tabIndex` not finite; tab not renamable (visible
dashboard + `tabId`); live `tabId` mismatch; **cheap guard:** live
`tab.name` must equal the **opposite** frame name (undo: live = `new.name`;
redo: live = `old.name`). No `history.clear`.

---

## 6. Folder + allowlist

**CREATE:** `tabs/history/buildTabsRenameCommittedStep.js`,
`tabs/history/pushTabsRenameHistoryStep.js`,
`tabs/history/applyTabsRenameHistoryReplay.js`

**EDIT**

- `tabs/history/createTabsHistoryReplayHandler.js` — `tabs_rename` → new apply
- `core/services/collectReplayHandlers.js` — `tabs_rename` on the same tabs contribution
- `tabs/effects/applyTabsRenameEffects.js` — capture + push after confirmed; skip cleanup on replay
- `tabs/actions/dispatchTabsRename.js` — copy `isHistoryReplay` onto pending
- this contract

New JS ≤150, ≤10 AMD imports. Effects today 4 — +1 push fits. Handler 2 — +1
fits. Saga stays 10 — **do not add imports**.

**Do NOT touch:** saga; gallery; `KDB.js`; F; A2; delete/dup builders;
MOVE `buildCommittedStep.js`; `applyTabsDeleteHistoryReplay.js`;
`reduceTabsRename.js`; widgetBase / filters; `createTabsController.js`;
`__orchestratorTabs.js`.

---

## 7. Acceptance (code now; Cognos later)

1. Live rename (name actually changed) pushes one `tabs_rename` frame. Same
   name / failed / replay → no push. No confirm dialog (N/A).
2. Undo = `tabs/rename` to `previousName` + `isHistoryReplay` +
   `preserveEditSession`; no extra frame; no session cleanup.
3. Redo = same action to `confirmedName`. Never `restoreDeleted`. Never saga.
4. Handler `true` only on dispatch `=== true`. Not renamable / live name ≠
   opposite frame / `tabId` miss → `false`, pointer stays. No `history.clear`.
5. GET v3 after undo and after redo matches live names. **Needs PO Cognos**
   (new WP after bundled A1+dup+B round).

---

## 8. Out of scope

A2; **F / B / T3 / C1**; `history.clear`; saga; gallery; `KDB.js`;
overloading delete apply or MOVE `buildCommittedStep.js`;
`reduceTabsRename.js` (142/150); widgetBase / filters;
`__orchestratorTabs.js` / `createTabsController.js`; `widgetVis/history/`;
NMS kale undo; `widget_removed` (S16); new events;
`tabs/historyReplayRequested`; new `_KDB.*`.

---

## As-built 2026-08-18

**Created**

- `dashboard/tabs/history/buildTabsRenameCommittedStep.js`
- `dashboard/tabs/history/pushTabsRenameHistoryStep.js`
- `dashboard/tabs/history/applyTabsRenameHistoryReplay.js`

**Edited**

- `dashboard/tabs/history/createTabsHistoryReplayHandler.js` — `tabs_rename` → new apply; MOVE / delete / dup unchanged
- `core/services/collectReplayHandlers.js` — `tabs_rename` on the same tabs contribution
- `dashboard/tabs/effects/applyTabsRenameEffects.js` — capture `previousName` before `setTabName`; push after confirmed; skip cleanup on replay
- `dashboard/tabs/actions/dispatchTabsRename.js` — copy `isHistoryReplay` onto pending; post-review replay resolve prefers payload `tabIndex` / `tabId` over open `editUi.sessionTabIndex` (`isHistoryReplay` / `source: "historyReplay"`). UI path still session-first.

**Allowed deviations (not silent product divergence)**

- Handler still dispatches when live name already equals `targetValue.name`. If dispatch is not boolean `true` (no-op rename), apply returns `true` so the pointer advances.
- Cheap `isRenamableUserTab` matches rename effects (`role === "dashboard"`), not dispatch’s `isHelper` / index fallback.

**Reviews (2026-08-18):** mechanical + semantic **PASS-WITH-NITS**, then targeted replay-resolve fix.

**Needs PO Cognos** (new WP after A1+dup+B bundle): rename → undo → redo; labels; GET v3 names; undo while another tab’s inline edit is open (must not rename the session tab).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-18 | `Implementing` | vastenburg | PO GO; next letter after Cognos green on A1+dup+B; rename only. Cognos later. |
| 2026-08-18 | `Implementing → Implemented — awaiting PO Cognos` | vastenburg (captain) | reviews PASS-WITH-NITS; replay resolve now prefers payload tab over open edit session. Cognos later (new WP after A1+dup+B bundle). |
| 2026-08-18 | Cognos host round **deferred** (status unchanged) | vastenburg | PO: not now; Cognos later. Do not mark green. Next code WP only if PO names a letter. |

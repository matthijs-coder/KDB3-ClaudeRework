# Contract Delta: `tabs` History (MOVE only)

> Delta on top of `contracts/tabs.md`. For **MOVE frames only**, supersedes `tabs.md` §16 (“no history step for move”) and `tabs-tabCrud-contractdelta.md` §7 (tranche 1–3 publish no frames). Parent + tab-CRUD stay in force for duplicate / rename. Delete history is `tabs-history-delete-contractdelta.md`. PO Cognos green 2026-08-16 (MOVE → Undo → Redo).

---

**Status:** `Approved — Cognos green 2026-08-16 (MOVE → Undo → Redo)`
**Parent contract:** `contracts/tabs.md`
**Depends on:** `tabs-tabCrud-contractdelta.md` (§2.1, §3.7, §3.8, §4.2, §5, §7), tranche-2 D-MOVE-1..7 (`tabs-tabCrud-tranche2-move-execution-spec.md` — quote, do not restate), `historyService.md` §5 / §10, `historyService-writebackRestore-contractdelta.md`
**Type:** `feature module contract delta`
**Authoring AI:** planner + Grok 4.6, 2026-08-16
**Related:** live dienststelle `history/` (folder + stage pattern); widgetBase `widget_layoutMove` (dispatch-replay + `isHistoryReplay`); `collectReplayHandlers.js`; T1 of `contracts/futureTodo/post-nms-slim-futuretodo-launch-prompt.md`

---

## 1. Purpose

First tabs-history product: replayable **MOVE** frames only. Live `tabs/move` (and a user `tabs/reorder` that becomes `tabs/move`, D-CRUD-4) can push one `tabs_move` step. Undo/redo re-dispatches `tabs/move` through `_KDB.api.tabs.dispatch` with `isHistoryReplay: true`. historyService owns the stack only; it never writes tabs / widgets / filter state.

## 2. PO decisions for this delta

Recorded 2026-08-16, vastenburg:

- **GO to WRITE** this MOVE-only delta now; **STOP after write** — no implementation until a second PO GO.
- **widgetVis:** skip. Vis-option undo is settings-owned (`widgetSettings_optionSelect`). Do not create `widgetVis/history/`.
- **NMS kale history:** parked until tabs-MOVE Cognos green.
- **T2** parameterSet gaps and **T3** folder regroup: parked.

## 3. Ownership / replay boundary

| Piece | Owner |
|---|---|
| Stack, pointer, `pushCommittedStep` / undo / redo | `historyService` (`historyService.md` §5, §10) |
| Frame build + push after a committed live MOVE | `tabs` (`maybePushTabsMoveHistoryStep`) |
| Replay apply | `tabs` handler → `_KDB.api.tabs.dispatch({ type: "tabs/move", ... })` |
| Nested owner permutation during that saga | existing tab-CRUD saga; owner dispatches keep `{ skipHistory: true, source: "tabsMutation" }` (§3.7 / §5) |

- Frame identity = **visible-prefix positions**, never `tabId` as content id (`tabId` is slot-physical, tab-CRUD §2.1).
- Do **not** add `tabs/historyReplayRequested`. Prefer existing `tabs/move` + flag (unlike dienststelle snapshot replay).
- Do **not** go through `confirmAndDispatchTabMove.js` on replay (no `message.choose`).
- Parameter restore stays `skipHistory: true`.
- `tabs.md` §5 stub `historyReplayHandlerContribution: null` is populated by this WP (stage from `__orchestratorTabs.js`, not from `createTabsController.js`). Destroy cleanup nulls the contribution (dienststelle `cleanupDienststelleRuntime` parity). No new `_KDB.*`. No `_KDB.services.tabMutation`.

## 4. Frame shape + inverse

Step key: `tabs_move` (snake, like `widget_layoutMove`, `header_chromeChange`).

`pushCommittedStep` **rejects `old === new`** (`historyService.md` §5). Therefore the stored command pair is the inverse rotation, not a no-op:

```js
{
  key: "tabs_move",
  timestamp: <ms>,
  old: { tabIndex: d, targetPosition: s }, // UNDO command: inverse rotation
  new: { tabIndex: s, targetPosition: d }  // REDO command: original rotation
}
```

`s` / `d` are 0-based visible-prefix `tabIdx` as in D-MOVE-1 / D-MOVE-4 (`tabs/move` payload `tabIndex` + `targetPosition`).

**Inverse:** forward `s → d` ⇒ undo `d → s` (same insert/shift rotation, never swap). Landing on replay follows live **D-MOVE-2** of that dispatched MOVE.

historyService undo applies `step.old`, redo applies `step.new` (`historyService.md` §10). Handler always dispatches the `targetValue` as a MOVE; no direction branching except `isHistoryReplay: true`.

## 5. Commit + replay flow

**Push when** the MOVE saga reaches the post-commit finalize hook (that path already excludes abort/fail/same-position). Do not re-gate on `result.ok` (false for degraded) or on `outcome` at the hook — a committed MOVE with a misclassified later phase must still push. `historyService.pushCommittedStep` still no-ops during writeback restore.

**Push hook:** `maybePushTabsMoveHistoryStep` runs at the end of `runTabMutationSaga`, after finalize / `emitFinalTabsChanged` and before returning the MutationResult, **only** when `plan.operation === "move"` and `payload.isHistoryReplay !== true`. Read `s` / `d` from `plan.sourceSlot.tabIdx` and `plan.targetTabIdx`. Warn if `pushCommittedStep` returns `false`. Do not call maybePush from delete/duplicate paths.

**Do not push** on failed / aborted / cancelled / `TABS_MOVE_SAME_POSITION` / conflict; when `payload.isHistoryReplay === true`; during writeback restore (`historyService.beginWritebackRestore` already blocks pushes). Do not invent `history.clear`. Do not reuse `finishWritebackRestore` (writeback-only).

**Replay path (normative):**

```
_KDB.api.tabs.dispatch({
  type: "tabs/move",
  payload: {
    tabIndex: targetValue.tabIndex,
    targetPosition: targetValue.targetPosition,
    isHistoryReplay: true,
    source: "historyReplay"
  }
})
```

Same live saga (`tabMutationMove` → `runTabMutationSaga`). Replay skips the choose dialog. Existing `tabs:changed` from the saga is enough (has consumers). No new events.

**Handler `apply` return (normative):** `historyService.applyHistoryStep` advances the pointer only on strict `true`. Map the dispatched MutationResult as:

| `outcome` | handler returns |
|---|---|
| `"applied"` or `"degraded"` | `true` (committed; same rule as push) |
| `"aborted"` / `"cancelled"` / `"failed"` / missing result / D-MOVE-3 guard miss | `false` |

Do **not** implement `return result.ok === true` (widgetBase-style). That would refuse undo/redo of a degraded-but-committed MOVE whose frame was pushed.

**Stale frames after later delete/duplicate (default, not an open question):** delete/duplicate still publish no frames and do not truncate the stack. Replay handler returns `false` when live **D-MOVE-3** guards fail (source/target not a visible prefix position, etc.). historyService already keeps the pointer on apply failure. Stack invalidation belongs with later delete-history — out of this WP; no new historyService API.

## 6. Folder + wiring (`collectReplayHandlers`)

New folder is justified: tabs had no history files; this WP creates them.

```
KDB3/js/dashboard/tabs/history/
  buildCommittedStep.js
  maybePushTabsMoveHistoryStep.js
  applyTabsMoveHistoryReplay.js
  createTabsHistoryReplayHandler.js
  stageTabsHistoryReplayHandler.js
```

Copy live dienststelle `history/` shape (build / maybePush / apply / create / stage). Apply must dispatch `tabs/move` as in §5, not a snapshot action.

- Stage onto `_KDB.runtime.tabs.historyReplayHandlerContribution` (today `null` stub, `tabs.md` §5).
- `collectReplayHandlers.js` must gain key `tabs_move` (wiring only; not a new `_KDB.*`).
- `__orchestratorTabs.js` currently 7 AMD imports; +1 stage import = 8. Call stage from the orchestrator.
- `createTabsController.js` is already at the **10-import hard limit** — do not add imports there.
- Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports. No `helpers/` `common/` `misc/` `shared/`.

## 7. Acceptance / Cognos

T1a smoketest (MOVE → Undo → Redo, **no** intervening delete/duplicate):

1. User MOVE of visible `s → d` pushes one `tabs_move` frame; undo restores prior visible-prefix order; redo restores the moved order.
2. Replay does not open `message.choose`. Nested owners do not push their own steps (`skipHistory: true`).
3. Landing matches D-MOVE-2 of the replayed MOVE.
4. GET v3 after undo and after redo is consistent with the live layout (tab-CRUD §3.8: `tabs`, `wgts[].tab`, `filt.dstl.byTab`, `filt.sels[].tab`, `filt.pcfs[].tab`).
5. A user reorder that becomes `tabs/move` **does** push `tabs_move` (same saga). Same-position / conflict / failed MOVE does not.
6. Handler `false` on D-MOVE-3 guard failure (and on aborted/failed/cancelled replay) leaves the history pointer unchanged. Handler `true` on replay `outcome` `"applied"` **or** `"degraded"`.

## 8. Out of scope

- Duplicate frames: `tabs-history-duplicate-contractdelta.md`. Rename frames stay out (`tabs.md` §16 + tab-CRUD §7). Delete frames: `tabs-history-delete-contractdelta.md`.
- History-stack invalidation / truncate on later delete or duplicate (delete-history WP does **not** truncate either; no `history.clear`).
- `widgetVis/history/` — vis-option undo is `widgetSettings_optionSelect`.
- NMS kale-value undo — parked; do not update `nativeMultiSelect.md` in this WP.
- T2 parameterSet gaps; T3 folder regroup.
- Kale value undo is not this WP. Global kale is still not permuted by tab-CRUD.
- New events; `tabs/historyReplayRequested`; new `_KDB.*`; `_KDB.services.tabMutation`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-16 | `Draft — awaiting PO implement-GO` | vastenburg | GO to **write** this MOVE-only delta; STOP after write. widgetVis skip; NMS kale history parked until tabs-MOVE Cognos green; T2/T3 parked. Implementation needs a **second PO GO**. |
| 2026-08-16 | `Draft → Implementing` | vastenburg | implement-GO |
| 2026-08-16 | reviews PASS-WITH-NITS | planner | Composer mechanical + Grok cross-review; no blockers. STOP for Cognos T1a. |
| 2026-08-16 | `Implementing → Approved` | vastenburg | Cognos green: MOVE pushes `tabs_move`; undo/redo restores tab order, labels, widgets, page kale. Push-gate bugfix: do not skip on outcome after post-commit finalize. |

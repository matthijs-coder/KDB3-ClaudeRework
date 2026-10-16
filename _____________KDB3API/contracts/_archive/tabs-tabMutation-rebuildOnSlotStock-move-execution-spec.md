# Execution Spec: user move rebuilds on slot stock (WP-R tranche 3)

> Mechanical spec. Architecture is `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (**Approved**), §1, §3 move row and the `tabs_move` paragraph under that table, §4, §6, §9.
> Duplicate and user-delete are closed. Copy their primitives. Do not edit those files.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — PO live test green 2026-10-07. Text-sync of §1 and the Cognos-parent futureTodo stay open until a separate go. Cleanup of dead weight is a separate spec.
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok-4.7-xhigh-fast (only after the PO says go)
**Reviewer:** spec-review subagent, then coordinator spot-check

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/widgets/widgetBase/effects/prepareMoveSlotStock.js`
- `KDB3/js/dashboard/widgets/widgetBase/effects/applyMoveSlotStock.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/handlePrepareTabMutation.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleApplyTabMutation.js` — the move arm only. Do not edit `applyWidgetRebuildDelete`.
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js` — no new AMD import
- `KDB3/js/dashboard/tabs/history/pushTabsMoveHistoryStep.js`
- `KDB3/js/dashboard/tabs/history/applyTabsMoveHistoryReplay.js`

**Must not edit:** `prepareDuplicateSlotStock.js`, `prepareDeleteSlotStock.js`, `applyDeleteSlotStock.js`, `applyTabMutationDuplicate.js` (call `rebuildDestination`, `buildPlaceOptions`, `recordCreated`; do not change `applyMoveSnapshotFirst`), `applyTabMutationRestoreDeleted.js`, `handleRestoreTabMutationSnapshot.js` (it already treats `snapshot.slotStockRebuild === true` as a content rebuild), `dispatchOwnerTabMutation.js` (it already forwards `serializedByTabId` without setting `widgetRebuild`), `buildTabMovePlan.js`, `reduceTabMutationApply.js`, filter owners, `placeSerializedWidgetEntry.js`, `fillDuplicateWidgetContent.js` (call it), `countDuplicateSlotStock.js` (call it), `pushTabsDeleteHistoryStep.js`, `applyTabsDeleteHistoryReplay.js`, `buildTabsDuplicateCommittedStep.js`, `mutationCodes.js`, contracts, `.mdc`. No commit/push. No new `_KDB` namespace. No Cognos `moveContent` / `setParent`. No `writebackSet.restore`. Do not turn `deferRenderWait` off. Do not remove `captureDeleteParkedWidgetIds` or `bindRestoredVisWidgets.js` in this tranche.

`runTabMutationSaga.js` has 10 AMD imports. This tranche adds no import there.

## Behaviour this tranche must produce

Shells stay on the Cognos slot. A user move no longer calls `applyMoveSnapshotFirst`.

Classification: **(a)** for the live shift and the missing D-R1 / D-R2 gate. **(b)** for the history payload, closed by the paragraph under delta §3. This spec implements that paragraph. It does not reopen duplicate or delete.

### Forward `tabs/move` when the payload has no `serializedByTabId`

1. Participating tab ids are every `slotMoves` `fromTabId` and `toTabId`. Do not add `plan.landing` unless it is already in that set. Landing can be the active tab outside the rotated range (`buildTabMovePlan.js:80-85`). There is no `hideSlot`.
2. The plan is a rotation of the inclusive index range (`buildTabMovePlan.js:52-58`). Each index in that range is a source once and a destination once. A distance of one is the two-tab case of that same rotation. Do not special-case it.
3. Before any park, take a live vis/text photo of each participating id. Same inclusion rule as `shouldSerializeFrame`: not disposed, kind `vis` or `text`, role not `topNHelper`, id not `kdb3widget`. Each row is `{ sourceWidgetId, entry }`, where `entry` is the result of `serializeWidgetFrame(kdb, frame, tabIdx).entry`. `tabIdx` must be a finite number from the plan (`sourceSlot.tabIdx`, or the matching `slotMoves` `fromTabIdx` / `toTabIdx`). Without it, `buildWidgetObject.js` `buildCommon` returns null (`buildWidgetObject.js:59-68`) and the photo is empty. Copy the `readTabIdx` walk over `slotMoves` from `prepareDeleteSlotStock.js:127-137`. Do not edit that file.
4. `rebuildByTabId[toTabId]` is the live photo of `fromTabId` for each `slotMoves` entry. `rollbackByTabId[tabId]` is the live photo of that participating slot. Apply writes the first map. History `old.serializedByTabId` stores the second. `step.new` stays `{ tabIndex, targetPosition }` only.
5. D-R1: if any participating slot has an onCanvas widgetBase frame whose `kind` is neither `vis` nor `text`, and whose role is not `topNHelper`, and whose id is not `kdb3widget`, prepare returns `ok: false` with `TABS_MUTATION_KIND_UNSUPPORTED`. Kind `datatable` aborts whatever its visual type is. Match `prepareDeleteSlotStock.js` `findUnsupported`. Do not edit that function.
6. D-R2: call `countDuplicateSlotStock(context, rebuildByTabId)`. `null` means no shortage; continue and return the success object. A non-null result is returned unchanged (`TABS_MUTATION_STOCK_SHORT` or `TABS_MUTATION_PREPARE_FAILED`). Demand is the incoming rebuild rows, not the rollback photos. The saga already aborts a failed prepare before filter remap and before apply.
7. Set `snapshot.slotStockRebuild = true`. Do not set `snapshot.widgetRebuild`.
8. Apply calls `rebuildDestination` for every `rebuildByTabId` key, including a key whose row list is empty. Do not reimplement that helper. An empty list only parks that slot's current canvas widgets onto the same `tabId` and returns before reveal, the wrapper check, and place (`rebuildSlotFromEntries.js:13-16`). A non-empty list runs reveal, then the page-wrapper check, then park, then place (`rebuildSlotFromEntries.js:17-27`). Then `recordCreated`, and `fillDuplicateWidgetContent` only when that call created rows. Degraded fill rows are `fillResult.degraded`. Do not skip an empty destination. Do not park a hide slot. Do not call `applyMoveSnapshotFirst`. Do not dispatch `tabs/parameterSetActivateTabRequested` or `widgetVis/parameterSetBindingRequested`. TopN park hints stay inside the existing park path.
9. Place or fill failure after prepare passed uses the same degraded-or-structural split as `applyUserDelete`. Shortage never reaches apply.
10. Names, visibility, and filters stay on the existing move saga. Do not edit those files.

### History

Undo still dispatches `tabs/move` with `step.old` (`tabIndex` is the old target, `targetPosition` is the old source). The payload also includes `serializedByTabId` from `step.old`. Redo still dispatches `tabs/move` with `step.new` and does not include `serializedByTabId`. Both set `isHistoryReplay: true`. Replay does not push a second step.

`pushTabsMoveHistoryStep` writes `serializedByTabId` from `runContext.moveRollbackByTabId`, cloned. If that map is missing on a non-replay move, `console.warn` and return without `pushCommittedStep`. Do not read `_KDB.runtime.widgetBase`.

### Undo prepare, when `payload.serializedByTabId` is present

1. That value must be a plain object. Otherwise prepare fails and nothing physical runs.
2. `snapshot.rebuildByTabId` is a clone of it. `snapshot.rollbackByTabId` is a live photo of those keys only, for in-saga rollback of the undo itself. Set `slotStockRebuild`. Do not set `widgetRebuild`. Run D-R1 and D-R2 on the rebuild map.
3. Apply is the same loop as the forward move. The inverse `slotMoves` still drive names and filters. They do not drive the widget map.
4. Do not copy `rollbackByTabId` onto the handlePrepare return for this path. The history step already holds the original before-images.

### In-saga rollback

Move prepare sets `snapshot.slotStockRebuild`. The existing `isContentRebuildRollback` already returns true for that flag and then calls `rebuildRollback`. Do not edit `handleRestoreTabMutationSnapshot.js`.

### Saga outcome

Extend the degraded promotion so a successful widget apply with a non-empty `degradedEntries` array is also `degraded` for `move`. Leave delete, duplicate, and `restoreDeleted` as they are. This does not add a toast.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no new state subtree.
3. `.cursor/rules/runtime.mdc` — photos stay on the widgetBase tab-mutation snapshot. Tabs history must not read `_KDB.runtime.widgetBase`.
4. `.cursor/rules/module-public-api.mdc` — no new public method.
5. `.cursor/rules/events.mdc` — no new event.
6. `.cursor/rules/feature-structure.mdc` — new files ≤150 lines. The saga gains no AMD import.
7. `.cursor/rules/naming.mdc` — new files are `verbNoun.js`. No new `handle*` file.
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc` — from `widgetBase/effects/`, tabs config is `../../../tabs/...`.
10. `.cursor/rules/dom.mdc` — park and place stay the existing helpers.
11. `.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` and no `__getDashboardAPI()`.
12. Delta §1, §3 including the `tabs_move` paragraph, §4, §6, §9.
13. The delete execution spec behaviour text, read-only, as the pattern for photos, D-R1, D-R2, and empty-list park.
14. Live allowlist files, plus read-only `buildTabMovePlan.js`, `rebuildSlotFromEntries.js`, `serializeWidgetFrame.js`, `countDuplicateSlotStock.js` (signature and return only), and the exports of `applyTabMutationDuplicate.js`.
15. This spec.

## Section C. Per-file specification

#### `effects/prepareMoveSlotStock.js` (create)

Rules to apply: `amd`, `error-handling`, `naming`, `feature-structure`, `cognos-adapter`.

AMD factory returns `__controller(_context, _plan, _snapshot, _payload)`. Helpers are factory-scope function declarations. Imports, in order: `../actions/serializeWidgetFrame.js`, `../../../tabs/config/mutationCodes.js`, `./countDuplicateSlotStock.js`. If the file would pass 150 lines, stop and report. Do not create a second file.

Forward (`plan.operation === "move"` and `serializedByTabId` is not a plain object): build the participating set from `slotMoves` only, both maps, D-R1, D-R2 on `rebuildByTabId`. Write `rebuildByTabId`, `rollbackByTabId`, and `slotStockRebuild: true`. Return `{ ok: true, rollbackByTabId, diagnostics: [] }`.

Undo (`serializedByTabId` is a plain object): clone it into `snapshot.rebuildByTabId`, live-photo those keys into `snapshot.rollbackByTabId`, same D-R1 and D-R2, set `slotStockRebuild`. Return `{ ok: true, diagnostics: [] }` without `rollbackByTabId`.

Any other operation returns `ok: false` with `PREPARE_FAILED`. Do not throw for that case.

#### `effects/applyMoveSlotStock.js` (create)

Rules to apply: `amd`, `error-handling`, `naming`, `feature-structure`, `dom`.

Export `applyUserMove(_context, _payload, _plan, _snapshot, _parked, _moved)`. `buildPlaceOptions(_payload, "tabMove")`. For every key of `snapshot.rebuildByTabId`, call `rebuildDestination` with that key's rows, including `[]`. `recordCreated`. `fillDuplicateWidgetContent` only when that call created rows. Stale-run check matches `applyUserDelete`. Do not call `applyMoveSnapshotFirst`, `takeWidget`, or `routeWidget` directly. Return the same result shape as `applyUserDelete`.

#### `actions/handlePrepareTabMutation.js` (edit)

Rules to apply: `amd`, `error-handling`.

Keep the duplicate and delete gates unchanged. When `plan.operation === "move"`, call `prepareMoveSlotStock`. On failure, return the same `ok: false` shape as the delete branch. On success, copy `rollbackByTabId` onto this function's return only when the payload has no plain `serializedByTabId` and `isHistoryReplay !== true`.

#### `actions/handleApplyTabMutation.js` (edit)

Rules to apply: `amd`, `error-handling`.

Replace both the `applyMoveSnapshotFirst` call and the hardcoded success return after it (`handleApplyTabMutation.js:36-37`) with `return await applyUserMove(...)`. The delete arm at `:34` is the pattern. Do not edit `applyWidgetRebuildDelete`. Do not change the delete or duplicate arms. The body of `applyMoveSnapshotFirst` stays.

#### `tabs/actions/runTabMutationSaga.js` (edit)

Rules to apply: `error-handling`, `feature-structure`. No new import.

After a successful prepare, when `plan.operation === "move"` and `payload.isHistoryReplay !== true` and `serializedByTabId` is not a plain object, set `runContext.moveRollbackByTabId` from `prepare.byOwner.widgetBase.rollbackByTabId`. Do not overwrite `runContext.serializedByTabId` or `runContext.deleteRollbackByTabId`.

Pass `runContext` into `pushTabsMoveHistoryStep`. Widen the degraded promotion so `move` is included. Leave the other operations as they are.

#### `tabs/history/pushTabsMoveHistoryStep.js` (edit)

Rules to apply: `state`, `error-handling`, `runtime`.

Accept `_runContext`. Keep the operation and `isHistoryReplay` early returns. On a push, add `serializedByTabId: cloneJson(runContext.moveRollbackByTabId)` onto `old`. Keep `old.tabIndex`, `old.targetPosition`, and `new` as they are. If the map is missing, warn with the existing prefix and return without pushing. The committed-step builder may stay; build the extra field in this file if the builder cannot grow without a new shape. Do not read widgetBase runtime.

#### `tabs/history/applyTabsMoveHistoryReplay.js` (edit)

Rules to apply: `error-handling`.

Keep the `tabs/move` dispatch. When `targetValue.serializedByTabId` is a plain object, put it on the payload. Do not send `widgetRebuild`. Redo, whose `new` has no map, stays a positions-only replay.

## Section J. Acceptance (self-verification)

- `node --check` on every created and edited file.
- The move arm does not call `applyMoveSnapshotFirst` and does not keep the hardcoded success return that follows that call today. The function `applyMoveSnapshotFirst` still exists, unchanged.
- `applyWidgetRebuildDelete`, `prepareDeleteSlotStock.js`, and `prepareDuplicateSlotStock.js` have no diff.
- `runTabMutationSaga.js` import count is still 10.
- New files are at or under 150 lines. No nested function declarations inside an entry function.
- Undo payload can carry `serializedByTabId`. Redo payload does not.

## Section K. Live acceptance (PO)

- Move a tab by one position. The two slots exchange content. Shells stay on the Cognos slot where they were registered.
- Move a tab across several positions. Every slot in the inclusive range shows the content that rotated in. A slot outside that range, including a landing tab that did not move, is not parked.
- A participating slot with a `datatable` refuses the move. The dashboard and the active tab stay as they were.
- Too little own-slot stock refuses the move before any widget moves.
- Undo restores names, filters, and the widgets from the stored before-images onto each slot's own shells.
- Redo runs a fresh move and rotates the content again.
- Delete, delete-undo, duplicate, duplicate-undo, and duplicate-redo still behave as after the delete tranche.

## Section L. Forbidden

- Editing the closed duplicate or delete stock files, or the body of `applyMoveSnapshotFirst`.
- Extending `placeSerializedWidgetEntry.js` or `fillDuplicateWidgetContent.js`.
- Reading another module's runtime from the move history push.
- Remapping widget-scoped history (D-R3).
- Turning `deferRenderWait` off.
- A new `.mdc`, host retries, or `writebackSet.restore`.
- Text-sync of §1, or closing the Cognos-parent futureTodo, until this tranche is live-green as well.
- Cleaning up `deleteParkedWidgetIds` or `bindRestoredVisWidgets.js` here.
- Git commit, push, or stash.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator | Inventory class (a) for the shift and the missing gates, class (b) for the history field, closed in delta §3. No code until spec review and a PO go. |
| 2026-10-06 | spec review | coordinator | No MUST-FIX. Coordinator checked `buildWidgetObject.js:59-68`: a non-finite `tabIdx` makes the photo null. Nits folded: finite `tabIdx`, `null` stock result versus the failure object, empty-list versus reveal/wrapper/park/place, and replacing both `handleApplyTabMutation.js:36` and `:37`. No open product decision. Still no code until a PO go. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Explicit go, recommended option, after the delete live test went green. One writer. Do not redeploy until the move review. |
| 2026-10-06 | code review | coordinator | No MUST-FIX. Coordinator checked the map split: `rebuild[toTabId]` is the from-slot before-photo (`prepareMoveSlotStock.js:35`); history stores that rollback only on a non-replay forward move (`runTabMutationSaga.js:40-41`). Participating ids are `slotMoves` only (`prepareMoveSlotStock.js:71-80`). D-R1 and D-R2 run before the snapshot write (`prepareMoveSlotStock.js:56-62`). Ready for the Section K live test. |
| 2026-10-06 | duplication spot-check | coordinator | Move visits every rebuild key, including an empty list (`applyMoveSlotStock.js:27-29`). Delete still parks `hideSlot` with `[]` and then skips that key (`applyDeleteSlotStock.js:14-20`). That split is required. Copies match on the kind check and the photo row. Duplication does not block deploy. Unifying waits until move is live-green. |
| 2026-10-06 | closed-path spot-check | coordinator | `applyMoveSnapshotFirst` has no caller. It remains only as the function and the export (`applyTabMutationDuplicate.js:92` and `:144`). Move prepare is its own gate (`handlePrepareTabMutation.js:53`). D-R2 refuses when incoming demand exceeds that slot's own stock (`countDuplicateSlotStock.js:34-35`). That refusal is intended. It does not block the live test. |
| 2026-10-06 | consequence spot-check | coordinator | Deploy stands. For source 0 and target 2, `buildNamesByIndexAfter` writes index 0←slot 1, 1←slot 2, 2←slot 0 (`buildTabMovePlan.js:73-75`). Undo is `tabIndex` 2, `targetPosition` 0 (`buildCommittedStep.js:8`), and widgets restore the before-photos on those same tab ids. A blank non-active page remains the known `deferRenderWait` limit. `STOCK_SHORT` on an unbalanced rotation is intended. |
| 2026-10-07 | live test started | PO vastenburg | PO is running Section K. A second dead-code and duplication pass runs read-only. No production edits during that test. Text-sync and the Cognos-parent futureTodo stay open until the PO calls the test green. |
| 2026-10-07 | duplication spot-check | coordinator | The three prepares share the kind check and the `{ sourceWidgetId, entry }` row. Required splits stay: duplicate clones onto the insert slot, delete parks the hide slot, move visits every key and has an undo-map branch. `prepareDuplicateSlotStock.js:47` writes `snapshot.serializedByTabId` and `:56` deletes it on success. That does not block the live test. Unifying waits until move is live-green. |
| 2026-10-07 | dead-code spot-check | coordinator | No host-breaking leftover. `takeWidget` is called only from `applyMoveSnapshotFirst` (`applyTabMutationDuplicate.js:112`), and that function has no caller. `bindRestoredVisWidgets.js:9` still describes the old take. `deleteParkedWidgetIds` and `plan.restore.parkedWidgetIds` stay unread. Cleanup waits until the move live test is green. |
| 2026-10-07 | live test | PO vastenburg | Section K green. Cleanup spec may start. Text-sync and the Cognos-parent futureTodo are not part of that spec. |

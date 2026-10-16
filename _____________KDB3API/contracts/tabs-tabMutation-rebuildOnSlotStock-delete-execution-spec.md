# Execution Spec: user delete rebuilds on slot stock (WP-R tranche 2)

> Mechanical spec. Architecture is `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (**Approved**), §1, §3 delete and restoreDeleted rows, §4, §6, §9.
> The duplicate tranche is closed. Copy its primitives. Do not redesign them.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — PO live test green 2026-10-06. Text-sync of §1 waits until move is live-green as well.
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok-4.7-xhigh-fast (only after the PO says go)
**Reviewer:** spec-review subagent, then coordinator spot-check

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/widgets/widgetBase/effects/prepareDeleteSlotStock.js`
- `KDB3/js/dashboard/widgets/widgetBase/effects/applyDeleteSlotStock.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/handlePrepareTabMutation.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleApplyTabMutation.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/applyTabMutationRestoreDeleted.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleRestoreTabMutationSnapshot.js`
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js` — no new AMD import
- `KDB3/js/dashboard/tabs/effects/dispatchOwnerTabMutation.js`
- `KDB3/js/dashboard/tabs/history/pushTabsDeleteHistoryStep.js`
- `KDB3/js/dashboard/tabs/history/applyTabsDeleteHistoryReplay.js` — only the `step.key === "tabs_delete"` arm

**Must not edit:** `prepareDuplicateSlotStock.js`, `countDuplicateSlotStock.js` (call it, do not change it), `applyTabMutationDuplicate.js` (call `rebuildDestination`, `buildPlaceOptions`, `recordCreated`; do not change them), `applyWidgetRebuildDelete` inside `handleApplyTabMutation.js`, the `widgetRebuild` and `replayDuplicate` arms of `applyTabsDeleteHistoryReplay.js`, `buildTabsDuplicateCommittedStep.js`, `placeSerializedWidgetEntry.js`, `fillDuplicateWidgetContent.js` (call it), `placeWidgetOnCanvas.js`, `applyMoveSnapshotFirst`, filter owners, `reduceTabMutationApply.js`, `buildTabMutationPlan.js`, `buildTabRestoreDeletedPlan.js`, `mutationCodes.js`, move plan and the move arm of `handleApplyTabMutation.js`, writeback, `widgetTopN/**`, contracts, `.mdc`. No commit/push. No new `_KDB` namespace. No Cognos `moveContent` / `setParent`. No `writebackSet.restore`. Do not turn `deferRenderWait` off.

`runTabMutationSaga.js` has 10 AMD imports (`runTabMutationSaga.js:2-12`). This tranche adds no import there.

## Behaviour this tranche must produce

Shells stay on the Cognos slot. A user delete no longer calls `applyDeleteSlotMoves`. A `restoreDeleted` undo no longer calls `applyMoveSnapshotFirst` and no longer `takeWidget`s `parkedWidgetIds`.

Classification already recorded on the delta: this is class **(a)**. The code matches §3 Today. §3 Under §1 and §6 are already approved. This spec does not amend them.

### Forward `tabs/delete` when `widgetRebuild` is not set

1. Participating tab ids are `plan.deletedSlot.tabId`, `plan.hideSlot.tabId`, and every `slotMoves` `fromTabId` and `toTabId`. Do not add `plan.landing` unless it is already in that set. Do not change `collectMissingRoutes`.
2. Before any park, take a live vis/text photo of each participating id. Same inclusion rule as duplicate `shouldSerializeFrame`: not disposed, kind `vis` or `text`, role not `topNHelper`, id not `kdb3widget`. Each row is `{ sourceWidgetId, entry }`, where `entry` is `serializeWidgetFrame(...).entry` (`prepareDuplicateSlotStock.js:87-89`). `countDuplicateSlotStock` reads `row.entry.kind`. `fillDuplicateWidgetContent` matches `sourceWidgetId`. Do not edit `prepareDuplicateSlotStock.js`.
3. Two maps, both keyed by `tabId`. `rollbackByTabId[tabId]` is the live photo of that participating slot. `rebuildByTabId[toTabId]` is the live photo of `fromTabId` for each `slotMoves` entry. Apply writes the second map. History `old.serializedByTabId` stores the first map. Neither map includes a slot that is only the landing tab.
4. `plan.hideSlot` is not a destination. The plan builder never puts it in `toTabId` (`buildTabMutationPlan.js:47-58` walks toward the left; hide is the last visible tab). If `hideSlot.tabId` is nevertheless a key of `rebuildByTabId`, prepare fails and the saga aborts before filter remap and before apply.
5. Deleting the last visible tab leaves `slotMoves` empty and `hideSlot` equal to the deleted slot. `rebuildByTabId` is empty. Apply only parks that slot onto its own `tabId` and does not fill it. `rollbackByTabId` still holds that slot's photo.
6. D-R1: if any participating slot has an onCanvas widgetBase frame whose `kind` is neither `vis` nor `text`, and whose role is not `topNHelper`, and whose id is not `kdb3widget`, prepare returns `ok: false` with the existing `TABS_MUTATION_KIND_UNSUPPORTED` code. Kind `datatable` aborts whatever its visual type is. Match the predicate in `prepareDuplicateSlotStock.js` `findUnsupported`. Do not edit that function.
7. D-R2: call the existing `countDuplicateSlotStock(context, rebuildByTabId)`. Demand is the incoming rebuild rows, not the rollback photos. Return that helper's object unchanged: `null` means no shortage; `{ ok: false }` with `TABS_MUTATION_STOCK_SHORT` is a shortage; `TABS_MUTATION_PREPARE_FAILED` is unevaluable stock. The saga already aborts a failed prepare before filter remap and before apply (`runTabMutationSaga.js:34-36`).
8. Set `snapshot.slotStockRebuild = true`. Do not set `snapshot.widgetRebuild`. Do not run this path when `payload.widgetRebuild === true`; that path stays `prepareDuplicateSlotStock`.
9. Apply copies the shape of `applyWidgetRebuildDelete` (`handleApplyTabMutation.js:53-78`), not the duplicate skip at `applyTabMutationDuplicate.js:24-27`. For a hide slot that exists, call `rebuildDestination` with `[]`. An empty list only parks that slot's current canvas widgets onto the same `tabId` and returns (`rebuildSlotFromEntries.js:13-16`); it does not call `ensureRevealTakeTarget`, place, or the page-wrapper check. Then, for each `rebuildByTabId` key other than that hide id, call `rebuildDestination` with that key's rows. Non-empty rows do call `ensureRevealTakeTarget`, same-slot park, `placeSerializedWidgetEntry`, and the structural page-wrapper check. Then `recordCreated`, and `fillDuplicateWidgetContent` for the created rows only. Do not dispatch `tabs/parameterSetActivateTabRequested` or `widgetVis/parameterSetBindingRequested`. Do not call `applyDeleteSlotMoves` or `applyMoveSnapshotFirst`. TopN park hints stay inside the existing park path (`visualType: "LIST"`, `isTopNHelperClaim: true`). When the deleted slot is the hide slot, this empty call is what parks it. The old loop at `handleApplyTabMutation.js:34-37` goes away.
10. A place or fill failure after prepare passed uses the same degraded-or-structural split as `applyWidgetRebuildDelete`: structural on throw, stale run, or `rebuildDestination` failure; degraded entries on a failed place or fill that the helper already reported that way. Shortage never reaches apply.
11. Names, visibility, and the filter shift stay on the existing delete saga. Do not edit those files. Filter slices on the history step stay.

### History

`step.new` stays `{ tabIndex, tabId }`. Redo keeps dispatching `tabs/delete` with `isHistoryReplay: true` and no `widgetRebuild`. That re-enters this forward path and takes fresh photos. Do not store a rebuild map on `step.new`.

`step.old` keeps `insertTabIdx`, `tabId`, `name`, `hideSlot`, and `filters`. It gains `serializedByTabId` set to the rollback map. It stops carrying `parkedWidgetIds`. The saga may keep `captureDeleteParkedWidgetIds`; the push must not copy that array onto the step.

Undo stays `tabs/restoreDeleted` when `step.key === "tabs_delete"` and `insertTabIdx` is a number. The payload gains `serializedByTabId` and drops `parkedWidgetIds`. The `tabs_duplicate` arms (`widgetRebuild`, `replayDuplicate`, and their info-toasts) stay byte-stable. Do not add that toast to the `tabs_delete` arms.

### `tabs/restoreDeleted`

1. Prepare requires `payload.serializedByTabId` to be a plain object. Otherwise prepare fails and nothing physical runs.
2. `snapshot.rebuildByTabId` is a clone of that object. `snapshot.rollbackByTabId` is a live photo of those keys only, for in-saga rollback of the undo itself. Set `snapshot.slotStockRebuild = true`. Run D-R1 and D-R2 on that rebuild map.
3. Apply rebuilds every key, including the slot that the forward delete had hidden. Do not park-and-skip a hide slot on this path. Do not call `applyMoveSnapshotFirst`, `takeWidget`, or `bindRestoredVisWidgets`. Same `rebuildDestination` + `recordCreated` + `fillDuplicateWidgetContent` sequence as the forward destinations.
4. The same-tab guard in `buildTabRestoreDeletedPlan.js` stays. Do not edit that file. Ignore `plan.restore.parkedWidgetIds`.

### In-saga rollback

When `snapshot.physicalStarted` and `snapshot.slotStockRebuild === true`, rollback uses the existing `rebuildRollback` path (`rollbackByTabId`), including the same-slot park of `createdWidgetIds`. The existing duplicate and `widgetRebuild` predicates stay. Move still uses `restoreFromSnapshot`.

### Saga outcome

Extend the degraded promotion so a successful widget apply with a non-empty `degradedEntries` array is `degraded` for `duplicate`, for every `delete` (with or without `widgetRebuild`), and for `restoreDeleted`. Move is unchanged. This does not add a toast.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no new state subtree; frames still change only through existing reducer actions.
3. `.cursor/rules/runtime.mdc` — photos stay on the widgetBase tab-mutation snapshot, never in `_KDB.state`. Tabs history must not read `_KDB.runtime.widgetBase`.
4. `.cursor/rules/module-public-api.mdc` — no new public method; still `dispatch`.
5. `.cursor/rules/events.mdc` — no new event.
6. `.cursor/rules/feature-structure.mdc` — new files ≤150 lines. `runTabMutationSaga.js` gains no AMD import.
7. `.cursor/rules/naming.mdc` — new files are `verbNoun.js`. No new `handle*` file.
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc` — from `widgetBase/effects/`, the tabs config path is `../../../tabs/...`, not `../../tabs`.
10. `.cursor/rules/dom.mdc` — no new DOM parent logic. Park and place stay the existing helpers.
11. `.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` and no `__getDashboardAPI()` in these files.
12. `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, §3, §4, §6, §9.
13. `contracts/tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md` behaviour text, read-only.
14. Live files on the allowlist, read fully, plus read-only: `prepareDuplicateSlotStock.js` (`findUnsupported`, `shouldSerializeFrame`), `countDuplicateSlotStock.js` (signature only), `applyTabMutationDuplicate.js` (exports only), `rebuildSlotFromEntries.js`, `serializeWidgetFrame.js`, `buildTabMutationPlan.js`.
15. This spec.

## Section C. Per-file specification

#### `effects/prepareDeleteSlotStock.js` (create)

Rules to apply: `amd`, `error-handling`, `naming`, `feature-structure`, `cognos-adapter`.

AMD factory returns one function `__controller(_context, _plan, _snapshot, _payload)`. Named helpers live at factory scope, not inside the entry. Imports, in order: `../actions/serializeWidgetFrame.js`, `../../../tabs/config/mutationCodes.js`, `./countDuplicateSlotStock.js`. No other imports. If the file would pass 150 lines, stop and report. Do not create a second file and do not edit `prepareDuplicateSlotStock.js`.

User delete (`plan.operation === "delete"` and `payload.widgetRebuild !== true`): build the participating set, both maps, and the hide-is-not-a-destination guard in the behaviour section. Then D-R1, then D-R2 on `rebuildByTabId` only. Write `rebuildByTabId`, `rollbackByTabId`, and `slotStockRebuild: true` onto the snapshot. Return `{ ok: true, rollbackByTabId: <rollback map>, diagnostics: [] }`.

`restoreDeleted`: clone `payload.serializedByTabId` into `snapshot.rebuildByTabId`. Fail with `PREPARE_FAILED` when that value is not a plain object. Live-photo only those keys into `snapshot.rollbackByTabId`. Same D-R1 and D-R2. Set `slotStockRebuild`. Do not set `widgetRebuild`. On success return `{ ok: true, diagnostics: [] }` and do not put `rollbackByTabId` on that return. The snapshot field is enough for in-saga rollback. `handlePrepareTabMutation` copies `rollbackByTabId` onto its own return only for the user-delete success path.

Any other operation returns `ok: false` with `PREPARE_FAILED`. Do not throw for that case.

#### `effects/applyDeleteSlotStock.js` (create)

Rules to apply: `amd`, `error-handling`, `naming`, `feature-structure`, `dom`.

Two factory-scope functions, one AMD export object:

- `applyUserDelete(_context, _payload, _plan, _snapshot, _parked, _moved)` — hide park with `[]`, then each rebuild key except the hide id. `buildPlaceOptions(_payload, "tabDelete")`. `recordCreated`. `fillDuplicateWidgetContent` only when that call created rows. Stale-run check matches `applyWidgetRebuildDelete`.
- `applyRestoreDeleted(_context, _payload, _plan, _snapshot, _parked, _moved)` — every rebuild key, no hide skip. `buildPlaceOptions(_payload, "tabRestore")`. Same fill and stale checks.

Both call `rebuildDestination` from `applyTabMutationDuplicate.js`. Neither calls `applyMoveSnapshotFirst`, `takeWidget`, or `routeWidget` directly. Return the same result shape as `applyWidgetRebuildDelete` (`ok`, `operationId`, `moved`, `parked`, `created`, `degradedEntries`, `diagnostics`).

#### `actions/handlePrepareTabMutation.js` (edit)

Rules to apply: `amd`, `error-handling`, `module-public-api`.

Keep the existing call to `prepareDuplicateSlotStock` exactly when `plan.operation === "duplicate"` or (`delete` and `payload.widgetRebuild === true`). Add a separate call to `prepareDeleteSlotStock` when (`delete` and `widgetRebuild !== true`) or `operation === "restoreDeleted"`. On failure, return the same `ok: false` shape as the duplicate branch. On success of the delete path, copy `rollbackByTabId` from the helper result onto the object this function already returns, so `prepare.byOwner.widgetBase.rollbackByTabId` is set (`runTabMutationOwnerPhases.js:65` stores that return). Do not add it for `restoreDeleted` or for `widgetRebuild`.

#### `actions/handleApplyTabMutation.js` (edit)

Rules to apply: `amd`, `error-handling`, `feature-structure`.

When `operation === "delete"` and `payload.widgetRebuild === true`, keep `return await applyWidgetRebuildDelete(...)` unchanged, including that function's body. Otherwise, when `operation === "delete"`, call `applyUserDelete` and return its result. Do not park the deleted slot or call `applyDeleteSlotMoves` on that path. Delete `applyDeleteSlotMoves` from this file once nothing calls it. The move arm keeps `applyMoveSnapshotFirst`. The `restoreDeleted` arm delegates to `applyTabMutationRestoreDeleted.js`.

#### `actions/applyTabMutationRestoreDeleted.js` (edit)

Rules to apply: `amd`, `error-handling`, `dom`.

Replace the body so it calls `applyRestoreDeleted` and returns that result. Remove the `applyMoveSnapshotFirst` call, the `parkedWidgetIds` loop, the `takeWidget` calls, and the `bindRestoredVisWidgets` call. Drop the imports that become unused.

#### `actions/handleRestoreTabMutationSnapshot.js` (edit)

Rules to apply: `error-handling`, `state`.

`isContentRebuildRollback` stays true for a duplicate plan and for `snapshot.widgetRebuild === true`. Also return true when `snapshot.slotStockRebuild === true`. Do not send move through `rebuildRollback`.

#### `tabs/actions/runTabMutationSaga.js` (edit)

Rules to apply: `error-handling`, `feature-structure`. No new import.

After a successful prepare, when `plan.operation === "delete"` and `payload.widgetRebuild !== true` and `payload.isHistoryReplay !== true`, set `runContext.deleteRollbackByTabId` from `prepare.byOwner.widgetBase.rollbackByTabId`. Do not overwrite `runContext.serializedByTabId` (that field is the duplicate-undo incoming map).

Widen the degraded promotion at the widget-apply assignment so `degradedEntries` promotes `duplicate`, any `delete`, and `restoreDeleted`. Leave the failure and rollback branches as they are.

#### `tabs/effects/dispatchOwnerTabMutation.js` (edit)

Rules to apply: `module-public-api`, `error-handling`.

`buildOwnerPayload` for `widgetBase`: when `widgetRebuild === true`, keep returning `{ widgetRebuild: true, serializedByTabId }`. Else when `serializedByTabId` is set, return `{ serializedByTabId }` without `widgetRebuild`. Else return `{}`.

#### `tabs/history/pushTabsDeleteHistoryStep.js` (edit)

Rules to apply: `state`, `error-handling`, `runtime`.

On the `old` object, stop writing `parkedWidgetIds`. Write `serializedByTabId` from `runContext.deleteRollbackByTabId`, cloned the same way the filter slices are cloned. If that map is missing, `console.warn` with the existing prefix and return without calling `pushCommittedStep`. Keep `insertTabIdx`, `tabId`, `name`, `hideSlot`, and `filters`. Keep `new` as `{ tabIndex, tabId }`. Do not read `_KDB.runtime.widgetBase`.

#### `tabs/history/applyTabsDeleteHistoryReplay.js` (edit)

Rules to apply: `events`, `error-handling`.

In the `tabs_delete` + numeric `insertTabIdx` dispatch only: pass `serializedByTabId: targetValue.serializedByTabId` and do not pass `parkedWidgetIds`. Leave the redo `tabs/delete` dispatch as it is. Do not edit the `widgetRebuild` or `replayDuplicate` branches, including their toasts.

## Section J. Acceptance (self-verification)

- `node --check` on every created and edited file.
- `applyDeleteSlotMoves` has no remaining definition and no call sites.
- `applyTabMutationRestoreDeleted.js` contains no `applyMoveSnapshotFirst`, `takeWidget`, or `bindRestoredVisWidgets`.
- `applyWidgetRebuildDelete` is still called only when `payload.widgetRebuild === true`.
- `applyTabsDeleteHistoryReplay.js` still dispatches `tabs/delete` with `widgetRebuild: true` and `tabs/duplicate` with `replayDuplicate`.
- `runTabMutationSaga.js` import count is unchanged.
- `prepareDuplicateSlotStock.js`, `applyTabMutationDuplicate.js`, `buildTabsDuplicateCommittedStep.js`, and `reduceTabMutationApply.js` have no diff.
- New files are under 150 lines. No new `handle*` file. No nested function declarations inside an entry function.

## Section K. Live acceptance (PO)

- Delete a middle visible tab. Content from the tabs on the right appears one slot to the left. Widget shells stay on the Cognos slot where they were registered. The hidden tail is parked on its own slot and not filled.
- Delete the last visible tab. That slot's shells park on that same tab. Nothing is taken onto another tab.
- A participating slot with a `datatable` frame refuses the delete. The dashboard and the active tab stay as they were. No toast is required for that refusal beyond the existing prepare failure.
- Too little own-slot stock refuses the delete the same way, before any widget moves.
- Undo restores the tab, its name, its filters, and its widgets by rebuilding from the stored photos onto each slot's own shells. The old widget ids are not taken back onto the restored tab.
- Redo deletes that tab again through a fresh `tabs/delete`.
- Duplicate, then undo, then redo, still uses `widgetRebuild` / `replayDuplicate`. This tranche must not change that result.
- Move still shifts the same shells. This tranche must not change move.

## Section L. Forbidden

- Editing the closed duplicate serializer, the duplicate history builder, or the `widgetRebuild` / `replayDuplicate` replay arms.
- Changing `applyMoveSnapshotFirst` or the move arm.
- Extending `placeSerializedWidgetEntry.js` or `fillDuplicateWidgetContent.js`.
- Reading or writing another module's `_KDB.runtime` from the tabs history push.
- Remapping widget-scoped history onto a new shell (D-R3).
- A new `.mdc`, a new `_KDB` namespace, host retries, restore-step reordering, or writing stored MDX `itemId` / `sourceId`.
- Text-sync of §1 into `tabs-tabCrud` or `widgetBase.md`.
- Closing `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`.
- Starting the loading-text work or the undo/redo paint futureTodo.
- Git commit, push, or stash.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator | Inventory class (a). Delta §3 and §6 already state the target. No code until spec review and a PO go. |
| 2026-10-06 | spec review | coordinator | Review found no MUST-FIX. Coordinator checked `rebuildSlotFromEntries.js:13-16` and `:58-63`: an empty row list parks that slot's canvas widgets onto the same `tabId` and does not fill. Nits folded: row shape `{ sourceWidgetId, entry }`, stock-helper return values, empty-list versus non-empty reveal, saga import count is 10, `restoreDeleted` success return. No open product decision. Still no code until a PO go. |
| 2026-10-06 | `Draft` → `Approved` | PO vastenburg | Explicit go. One writer. Exclusive allowlist only. |
| 2026-10-06 | code review | coordinator | Independent review: no MUST-FIX. Coordinator checked the map split: `rebuild[toTabId]` is the from-slot photo (`prepareDeleteSlotStock.js:32`); history `old.serializedByTabId` is `rollbackByTabId` (`runTabMutationSaga.js:37-38`, `pushTabsDeleteHistoryStep.js:67`). D-R1 and D-R2 run before the snapshot write (`prepareDeleteSlotStock.js:60-66`). `prepareDeleteSlotStock.js` is 150 lines, at the hard cap. Ready for the Section K live test. |
| 2026-10-06 | cleanup pass requested | PO vastenburg | During the live test, review the tranche for dead code, stale references, duplication and overdesign. No production edits until the live result is in. Move inventory starts after that review. |
| 2026-10-06 | duplication spot-check | coordinator | `shouldSerializeFrame` matches in `prepareDeleteSlotStock.js:110` and `prepareDuplicateSlotStock.js:96-100`. The copy is what the spec required. Unifying it means editing the closed duplicate file. No cleanup edit during the live test. User-delete stays split from move until move rebuilds on slot stock. |
| 2026-10-06 | dead-code spot-check | coordinator | No host-breaking leftover. `deleteParkedWidgetIds` is only written (`runTabMutationSaga.js:89`); nothing reads it. `bindRestoredVisWidgets.js` has no AMD caller. `plan.restore.parkedWidgetIds` and two comments are dead weight for a later cleanup spec. No edit during the delete live test. |
| 2026-10-06 | live test | PO vastenburg | Section K green. Move writer may start. Do not redeploy until the move review passes, because that writer edits the same files. |

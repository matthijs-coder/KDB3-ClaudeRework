# Execution Spec: remove dead tab-mutation take (WP-R cleanup)

> Mechanical cleanup. Move, delete, and duplicate are live-green. This spec deletes symbols that no longer have a caller. It does not change rebuild behaviour.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — PO confirmed the cleanup deploy green 2026-10-07. Text-sync of §1 is a separate contract edit the same day. The three prepare files were not merged.
**Authoring AI:** Cursor coordinator, 2026-10-07
**Executing AI:** grok-4.7-xhigh-fast (only after the PO says go)

---

## Exclusive allowlist

**May delete:**

- `KDB3/js/dashboard/widgets/widgetBase/effects/bindRestoredVisWidgets.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/applyTabMutationDuplicate.js`
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js` — no new AMD import, and do not add one by removing a dependency either unless an import becomes unused. This file's imports stay as they are.
- `KDB3/js/dashboard/tabs/actions/tabMutationRestoreDeleted.js`
- `KDB3/js/dashboard/tabs/state/buildTabRestoreDeletedPlan.js`
- `KDB3/js/dashboard/widgets/widgetVis/actions/handleEnsureObservers.js` — the header comment only
- `KDB3/js/dashboard/widgets/widgetBase/actions/serializeWidgetFrame.js` — the one comment that names "move take"

**Must not edit:** every `prepare*SlotStock.js`, `applyMoveSlotStock.js`, `applyDeleteSlotStock.js`, `handleApplyTabMutation.js`, `handlePrepareTabMutation.js`, `handleRestoreTabMutationSnapshot.js`, `rebuildSlotFromEntries.js`, `fillDuplicateWidgetContent.js`, `placeSerializedWidgetEntry.js`, history replay files, filter owners, `reduceTabMutationApply.js`, contracts, `.mdc`. No commit. No text-sync of §1. Do not close `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`. Do not merge the three prepare files.

## Behaviour this cleanup must keep

Live move, delete, duplicate, and their undo and redo still rebuild on slot stock. Same-slot park through `routeWidget` stays. `plan.restore.filters` stays. Names, visibility, and filters stay.

## What to remove

1. In `applyTabMutationDuplicate.js`, delete `applyMoveSnapshotFirst` and `takeWidget`. Delete those two keys from the returned export. Keep the `routeWidget` function: `rebuildDestination` passes it into `rebuildSlotFromEntries`. Remove `routeWidget` from the export as well. Nothing outside this file reads that export (`rebuildSlotFromEntries.js:63` uses the injected dependency, not the export). Keep `ensureRevealTakeTarget` imported: `rebuildDestination` still passes it. Drop an import only if the removal leaves it unused. Do not change `applyTabMutationDuplicate`, `rebuildDestination`, `buildPlaceOptions`, or `recordCreated`.
2. Delete `bindRestoredVisWidgets.js`. It has no AMD importer. Do not replace it. Live fill stays `fillDuplicateWidgetContent`.
3. In `runTabMutationSaga.js`, delete the call `captureDeleteParkedWidgetIds(...)` and the function. Nothing reads `runContext.deleteParkedWidgetIds`. Do not change the `deleteRollbackByTabId` or `moveRollbackByTabId` copies, the degraded gate, or the history pushes.
4. In `buildTabRestoreDeletedPlan.js`, remove `parkedWidgetIds` from `plan.restore`. Keep `plan.restore.filters`. In `tabMutationRestoreDeleted.js`, stop passing `parkedWidgetIds` on the request object. Keep `filters`, `hideSlot`, `name`, `insertTabIdx`, and `tabId`.
5. In `handleEnsureObservers.js`, delete only the parenthetical `(restoreDeleted/take)` from the header comment. Do not change the function.
6. In `serializeWidgetFrame.js`, replace the phrase `move take` in the layout comment with `the frame layout resolver`. Do not change the function.

## Out of scope

The three prepares still repeat `shouldSerializeFrame`, `findUnsupported`, and the photo row. Those copies stay. Duplicate still writes `snapshot.serializedByTabId` and deletes it on success. Move still has its own `isPlainObject`. Unifying them is a later spec, not this one. `ensureRevealTakeTarget.js:18` still says `duplicate shift take`. That function is live. Do not edit it here.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/amd.mdc` — one `define`, no new nested functions, drop unused imports in a file you already edit.
2. `.cursor/rules/error-handling.mdc` — do not leave a catch that only existed for a deleted function; do not strip try/catch from functions you keep.
3. `.cursor/rules/feature-structure.mdc` — deletions must not push a kept file over 150 lines. `runTabMutationSaga.js` gains no import.
4. `.cursor/rules/naming.mdc` — no new files.
5. This spec, and a search that the symbols being deleted have no remaining callers.

## Section J. Acceptance

- `node --check` on every edited file.
- `KDB3/js` has no `applyMoveSnapshotFirst`, no `takeWidget`, no `bindRestoredVisWidgets`, no `captureDeleteParkedWidgetIds`, and no `deleteParkedWidgetIds`.
- `plan.restore.filters` is still built. `parkedWidgetIds` has no remaining write on the restore plan.
- `routeWidget` the function still exists and `rebuildDestination` still passes it.
- `prepareMoveSlotStock.js`, `prepareDeleteSlotStock.js`, `prepareDuplicateSlotStock.js`, `applyMoveSlotStock.js`, and `applyDeleteSlotStock.js` have no diff.
- The saga import count is unchanged.

## Section L. Forbidden

- Changing rebuild, park, fill, history payloads, or filter restore.
- Merging the three prepare files.
- Text-sync, a new `.mdc`, or a commit.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-07 | — → `Draft` | coordinator | Move live test is green. Dead weight only. The repeated prepare helpers stay until a later spec. No code until a read-only pass and a PO go. |
| 2026-10-07 | pre-check | coordinator | No MUST-FIX. `rebuildDestination` still passes `routeWidget` and `ensureRevealTakeTarget` (`applyTabMutationDuplicate.js:49-50`). Dropping the `routeWidget` export has no external reader. The string at `ensureRevealTakeTarget.js:18` stays. Still no code until the duplication pass and a PO go. |
| 2026-10-07 | duplication spot-check | coordinator | Unifying the prepares would change the green paths. Duplicate skips an empty key that is not a `slotMoves` from (`applyTabMutationDuplicate.js:24-27`). Move visits every key. Delete parks the hide slot and then skips it. Those splits stay. Comment edits in the cleanup spec stay; they are stale wording, not a behaviour change. |
| 2026-10-07 | `Draft` → `Approved` | PO vastenburg | Explicit go. One writer. Do not merge the three prepare files. |
| 2026-10-07 | code review | coordinator | No MUST-FIX. Coordinator checked the saga still copies `deleteRollbackByTabId` and `moveRollbackByTabId` (`runTabMutationSaga.js:41-45`) after `captureDeleteParkedWidgetIds` was removed. `routeWidget` still feeds rebuild. The three prepares were not merged. `ensureRevealTakeTarget.js:18` still says `duplicate shift take` and stays. Ready to deploy on the green move build. |

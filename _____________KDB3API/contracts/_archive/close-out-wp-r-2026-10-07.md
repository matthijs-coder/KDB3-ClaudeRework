# Close-out (2026-10-07): WP-R tab mutation and loading captions

PO vastenburg. Cognos tests for duplicate, delete, move, and the dead-take cleanup were green. The loading subline was already in the code. This note closes that run. No production code is approved by this file.

## Live

Widget DOM nodes stay on the Cognos slot where they were registered. Duplicate, delete, move, and their undo and redo rebuild content on the destination slot's own stock. Normative sentence: `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, copied into `widgetBase.md` §0.1 and `tabs-tabCrud-contractdelta.md` §2.1.

Loading captions already use one overlay and two lines:

- Tab mutation mount `tabs-mutation-loading`: session line `tabMutationCopy` / `tabMutationDelete` / `tabMutationMove` / `tabMutationRestore`, detail `Registerkarte {n} von {m}: {name}` (`formatTabMutationCaption.js`).
- Parameter-set restore mount `writeback-set-loading`: session line `dashboardRestore`, detail from `publishRestoreTabCaption` during vis bind, then the first visible tab at landing (`runNormalRestore.js:86`).

## Closed with this run

- Tab-mutation clauses of `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`. Launchpad-transfer on one tab stays open.
- Dead `applyMoveSnapshotFirst`, `takeWidget`, `bindRestoredVisWidgets.js`, and unread `parkedWidgetIds` / `deleteParkedWidgetIds`. `routeWidget` still parks on the same slot.

## Left on purpose

- Do not merge `prepareDuplicateSlotStock.js`, `prepareDeleteSlotStock.js`, and `prepareMoveSlotStock.js`. The splits are the insert clone, the hide-slot park, and the move empty-key plus undo map.
- Do not change `deferRenderWait`. A rare unpainted page after undo/redo is `futureTodo/tab-duplicate-undo-redo-partial-widgets-2026-10-06.md`.
- Unread label keys `tabProgressNamed` and `tabProgressNumber`. The live chooser always passes `{m}` when the slot is visible.
- `ensureRevealTakeTarget.js:18` still says `duplicate shift take`. The function is live.
- Colour bugs, WP-P, A1, and WP-Q status. The PO commits.

## Not a next build

No further tab-mutation or loading-caption code unless the PO asks. A new captain starts from this note, not from the 2026-10-06 handover prompts.

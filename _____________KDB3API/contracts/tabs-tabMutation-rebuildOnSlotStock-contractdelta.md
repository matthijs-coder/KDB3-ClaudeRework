# Contract Delta: tab mutation rebuilds content on the destination slot's own stock (WP-R)

> Revision of `contracts/tabs-tabCrud-contractdelta.md` and `contracts/widgetBase-tabMutation-contractdelta.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved` — pre-check PASS-WITH-NITS 2026-10-06; nits folded. Implementation still needs an execution spec and an explicit PO go.
**Parents:** `contracts/tabs-tabCrud-contractdelta.md`, `contracts/widgetBase-tabMutation-contractdelta.md`, `contracts/widgetBase.md`
**Supersedes:** `contracts/widgetBase-tabDuplicate-crossSlotClaim-contractdelta.md` (WP-D, already `Superseded`)
**Work package:** WP-R
**Type:** `contract revision` (the code follows the current contracts; those contracts contradict the principle in §1)

---

## 1. Normative principle (PO 2026-10-06)

Widget DOM nodes are never moved to another tab. A widget lives only on the slot (page) where Cognos registered it. On a tab mutation the content is fully rebuilt at its new location, using the destination slot's own stock widgets (the shells Cognos registered on that slot). Moving a tab is an illusion: content and presentation permute; widget shells do not.

No source file in `.cursor/rules/*.mdc` states this. The PO decided: record it here. After this delta is `Approved` and implemented, text-sync the same sentence into `tabs-tabCrud-contractdelta.md` §2.1 and `widgetBase.md`. Do not add a new `.mdc` rule.

## 2. Classification

**(revision, not a code-vs-contract bug.)** The current contracts require a same-shell cross-slot take, and the code does that.

- `tabs-tabCrud-contractdelta.md` §2.1: widgetBase frame `tabId` / `tabHandle` is content-logical and permutes with the plan.
- `tabs-tabCrud-contractdelta.md` §4.2: widgets keep their `widgetId`s and move between slots.
- `widgetBase-tabMutation-contractdelta.md` §2.2: for each `(from → to)`, park the `from` slot's onCanvas widgets and take those shells onto `to`, preserving `widgetId`, layout and colour. Move uses the same chain.

**Code, verified by the coordinator on the lines cited:** `PLACE_ON_CANVAS_SUCCEEDED` writes `frame.tabId` when `payload.tabId` is a non-empty string (`createWidgetBaseReducer.js:68-70`). `routeToLaunchpadSucceeded` does not assign `tabId` (`createWidgetBaseReducer.js:74-88`). Park still `REGISTER_FRAME`s `tabId`, and for an existing frame that value is the frame's own `tabId` (`handleRouteToLaunchpad.js:91`), so the park does not retarget the shell. `applyMoveSnapshotFirst` (`applyTabMutationDuplicate.js:73-94`) reads the `from` canvas and `takeWidget`s those same ids onto `toTabId`. `runTabMutationSaga.js:41-45` marks `widgetApply` degraded only for a successful duplicate with `degradedEntries`.

Cognos model parent is never updated (`futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md`). Park and take are DOM `appendChild` only. WP-R removes the tab-mutation half of that mismatch. Launchpad-transfer replay stays on one tab and is not closed by this delta.

**D-CRUD-1 still holds.** It rejects calling `writebackSet.restore(v3)` for a tab mutation, and it already allows owners to reuse restore primitives. Duplicate already does that (`placeSerializedWidgetEntry` + `fillDuplicateWidgetContent`). WP-R extends those same primitives to the shifted slots. It does not reintroduce the legacy full-dashboard restore.

**Live failure (WP-D).** Duplicate of a tab whose insert slot has no free vis shell degrades with an empty copy. The shift takes the insert slot's own vis shells onto the next slot before the clone claims stock (`applyTabMutationDuplicate.js:19`, then `:37`). Under §1 those shells stay, are parked on their own pad, and are claimable.

## 3. What changes, per operation

Cross-slot same-shell takes go away. Same-slot park and same-slot take stay.

| Operation | Today | Under §1 |
|---|---|---|
| move | `applyMoveSnapshotFirst` | serialize involved slots, park each shell onto its own pad, rebuild each destination on that slot's stock |
| delete | park deleted slot + `applyDeleteSlotMoves` | own-slot park only makes those shells claimable. The slot's stock is then overwritten with the content that shifts in. Content survival is the serialization, not the parked shell |
| duplicate | shift (`applyTabMutationDuplicate.js:19`) then rebuild the insert slot | drop the shift. Rebuild every slot the shift would have changed, plus the insert-slot clone, each on that slot's own stock |
| restoreDeleted | shift (`applyTabMutationRestoreDeleted.js:21`) then take `parkedWidgetIds` onto `insertSlot.tabId` | drop the shift and drop the id take. The plan still aborts unless `insertSource.tabId === request.tabId` (`buildTabRestoreDeletedPlan.js:31-33`). Undo rebuilds from the serialized entries |
| rollback | take the snapshot `widgetId` onto `frame.tabId` | rebuild from the prepare serialization. Same-slot park of created clones stays |
| history `tabs_move` / `tabs_delete` / `tabs_duplicate` | re-enter the saga | stay as re-entry; they follow the new saga. Delete undo and duplicate redo both store `parkedWidgetIds` today and both must carry serialization (§4) |

`tabs_move` `old` carries `serializedByTabId`: the before-images of the participating slots, keyed by `tabId`. `new` stays the forward positions only, so redo is a fresh `tabs/move`. Undo still dispatches `tabs/move` and passes that map. A fresh inverse without the map is not enough once shells are reused.

Stay, because they are same-slot: user drop, writeback restore step 24, startup / step-23 park, parameter-set reset park, canvas-drop history, launchpad-transfer history, `handleTakeFromLaunchpad`, the WP-P page target in `placeWidgetOnCanvas.js`, `resolveDropClaim`.

`placeSerializedWidgetEntry.js` is 150 lines and 7 AMD imports. Call it. Do not extend it. A per-slot loop belongs in the apply handler, which must be split by job if it would pass 150 lines.

## 4. Identity (proposal)

`widgetId` is the Cognos shell. It stays on the slot where Cognos registered it. Rebuilt content receives the destination shell's id, as duplicate already does.

Persisted v3 `wgts` entries have no `widgetId` (`buildWidgetObject.js`). D-CRUD-3 stands: stored parameter sets are not remapped. `routedTabIds` stays keyed by `tabId`.

Prepare today clones frames for every affected slot and writes `serializedEntries` only for a duplicate source's vis/text (`handlePrepareTabMutation.js`). WP-R serializes every involved slot's vis/text before any physical step. The snapshot lives in `_KDB.runtime.widgetBase.tabMutationSnapshots` (not in `_KDB.state`).

Reusing a shell as stock overwrites the content that was parked into it. Undo of a shift therefore cannot `takeWidget` the old id and expect the old content. Tab undo/redo rebuilds from the serialized entries carried on the history step. `tabs_delete` `step.old` stores `parkedWidgetIds` (`pushTabsDeleteHistoryStep.js:61`) and undo dispatches `tabs/restoreDeleted` with those ids (`applyTabsDeleteHistoryReplay.js:16-28`). `tabs_duplicate` `step.new` stores `parkedWidgetIds` of the created shells (`pushTabsDuplicateHistoryStep.js:76`, `buildTabsDuplicateCommittedStep.js:9-11`) and redo takes the same branch. Both payloads carry the serialization once the shells are reused.

Widget-scoped history (layout, resize, text, settings, canvas drop, launchpad transfer) stays keyed by shell id (D-R3). It is not remapped onto the content's new shell and it is not invalidated. After a tab mutation, replaying such a step affects the shell, which may now show different content.

TopN: serialization already skips `role === "topNHelper"` (D-R1a). Fill dispatches `widgetVis/parameterSetBindingRequested` for vis entries (`fillDuplicateWidgetContent.js:38-40`). Helper placement stays on that existing bind path. `placeHelperAfterOwner.js:21` moves the helper DOM to sit after its owner; the spec must claim a helper that is stock of the vis shell's own slot, so that `insertBefore` does not cross a page. The old `byOwner[oldVisId]` entry stays on the abandoned shell.

Focus mode lives on `runtime.widgetVis.byId[widgetId].focusMode` (`widgetVis/runtime/ensureWidgetRuntime.js:19-20`). Move mode lives on `runtime.widgetBase.byId[widgetId].interaction.move` (`widgetBase/effects/widgetMoveInteraction.js:97-98`). Both stay with the shell.

## 5. Kinds and capacity (facts)

Ready for rebuild: `vis`, and `text` stored as `txt`. Gate: `shouldSerializeFrame` (`handlePrepareTabMutation.js:80-84`) and `placeSerializedWidgetEntry.js:27` (`vis` | `txt` only).

Not serialized: frame kind `datatable` (list, hierarchy, table and crosstab are `visualType`s of that kind, not separate frame kinds), `topNHelper`, other kinds, `kdb3widget`. `kdbControl` is not a widgetBase frame. `kdb3widget` is excluded from startup routing. A move today park/takes every onCanvas frame of any kind (`readCanvasWidgetsByTab` has no kind filter). D-R1 aborts on frame `kind`, so one `datatable` frame aborts the mutation whatever its `visualType` is.

Capacity forecast runs only for duplicate, only on the insert slot, and returns `widgets.length` (`handlePrepareTabMutation.js:87-94`), which is wider than a claimable shell (`hasContent === "yes"`, on that pad, not host). Nothing reads `expectedDegradedEntries`. Move, delete and restoreDeleted do not check stock.

After §3, a destination can accept as many vis (or text) widgets as that slot has stock shells of that pad. Shortage is an authoring limit, not a shift leaking shells away.

## 6. PO decisions (2026-10-06)

Prepare fails the saga before filter remap and before any physical step. The dashboard stays byte-identical, including the active tab. This replaces the duplicate rule that a stock shortage is not a prepare failure (`widgetBase-tabMutation-contractdelta.md` §2.1 point 2) and replaces §3.4's per-entry continue for these operations.

- **D-R1 — abort on non-serializable content.** If any participating slot has an onCanvas widgetBase frame whose `kind` is neither `vis` nor `text`, prepare fails. The diagnostic names the kind and the slot. `kdb3widget` and `kdbControl` are not frames in this check; they stay on their slot. Kind `datatable` (any visual type) and any other such kind abort the whole mutation. No partial permute.
- **D-R1a — TopN helper is exempt.** A frame with `role === "topNHelper"` does not trip D-R1. It is not serialized. The rebuilt vis goes through the existing vis bind (§4). The old `byOwner` entry stays on the abandoned shell.
- **D-R2 — abort on stock shortage.** If a destination slot has fewer stock shells of pad `visualization` or `text` than the incoming vis or text content, prepare fails. The count is that slot's own shells, on canvas and in that slot's launchpad, because apply parks onCanvas shells back onto their own pad before claiming. Shells registered on another slot are not counted. `widgets.length` of the launchpad children is not the count. All operations abort; none continue as per-entry degraded.
- **D-R3 — widget history stays on the shell.** Steps for layout, resize, text, settings, canvas drop and launchpad transfer stay keyed by `widgetId`. They are not remapped onto the content's new shell and they are not invalidated. Tab undo/redo rebuilds from the serialized entries on the history step.

## 7. Text-sync after `Approved` + implementation

Living contracts:

- `tabs-tabCrud-contractdelta.md` §2.1 widgetBase clause, §4.2, §4.3 shift-right sentence, §5 phase-4 row (`takeFromLaunchpad` at the phase-4 dispatch)
- `widgetBase-tabMutation-contractdelta.md` opening membership sentence, §2.2 "take them onto the `to` slot", rollback paragraph, acceptance item that shifted widgets keep `widgetId`
- `widgetBase.md`: add the §1 principle as a short subsection after the purpose paragraphs and before `## 1. Legacy Evidence And Deltas`. Do not renumber §1. Take/park sections do not themselves say shells follow the tab
- Caller lists that name the shift as a page-target consumer: `widgetBase-parameterSetRestore-dropboxTarget-contractdelta.md`, `widgetBase-takeFromLaunchpad-pageTarget-execution-spec.md` item 5

Executed tranche specs (`tabs-tabCrud-tranche1-delete-execution-spec.md`, tranche 2 move, tranche 3 duplicate) keep their historical text. Add a one-line pointer that the shift sentences are superseded by this delta. Do not rewrite them as if they were the new spec.

Close `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md` only after implementation, and only for the tab-mutation clauses. Launchpad-transfer on one tab remains.

Likely dead after implementation (do not delete in this delta): `applyMoveSnapshotFirst`, `applyDeleteSlotMoves`, and rollback takes whose snapshot `tabId` differs from the shell's current `tabId`.

## 8. Out of scope

Colour bugs (`sett "Default"`, `backgroundColor` → `bgcol` instead of `ctcol`). New `.mdc`. Shell creation. Remapping stored parameter sets. The drop `originId` fallback (`resolveDropClaim.js`), which does not compare pad page id; not a tab-mutation path. Cleanup audit of unrelated modules (handover §6 step 4) waits until WP-R has landed.

## 9. Tranches (PO 2026-10-06)

First spec: duplicate, plus undo and redo of that duplicate. Undo still dispatches `tabs/delete` so tab metadata and filter phases stay the delete saga, and the widget phase rebuilds from the stored per-slot serialization (`widgetRebuild`). Redo dispatches `tabs/duplicate` again. A user-initiated delete or move keeps today's same-shell shift until its own tranche. Manual delete after a rebuilt duplicate is therefore still the old shift; that gap closes in the delete tranche.

2026-10-06 evening: the PO chose the delete tranche next, including undo of a user-initiated delete. Move stays on today's same-shell shift until its own tranche. The duplicate tranche stays closed.

2026-10-06 night: move inventory is closed. Class **(a)** for the live shift against §3 Under §1 and §6. Class **(b)** for the `tabs_move` payload, closed by the paragraph under the §3 table. The move execution spec is `Approved`. The delete live test is green. Move code starts now. Do not redeploy until the move review passes.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | PO vastenburg | §1 is normative. No source file. Later text-sync to `tabs-tabCrud-contractdelta.md` §2.1 and `widgetBase.md`. No new `.mdc`. Subagent model: `grok-4.7-xhigh-fast`. |
| 2026-10-06 | `Draft` amended | coordinator | Step-1 inventory folded into §2–§7. Coordinator spot-checks: saga degrade gate `runTabMutationSaga.js:41-45`; kind gate `handlePrepareTabMutation.js:80-84`; delete undo ids `pushTabsDeleteHistoryStep.js:61` + `applyTabsDeleteHistoryReplay.js:16-28`; `applyMoveSnapshotFirst` `applyTabMutationDuplicate.js:73-94`; restore plan same-tab guard `buildTabRestoreDeletedPlan.js:31-33`; take writes `tabId`, park does not (`createWidgetBaseReducer.js:68-70` and `:74-88`). |
| 2026-10-06 | D-R1, D-R2, D-R3 closed | PO vastenburg | D-R1 abort the mutation before any physical step when a participating slot has an onCanvas kind other than vis/text. D-R2 abort every operation on stock shortage. D-R3 widget history stays on the shell id. |
| 2026-10-06 | D-R1a closed | PO vastenburg | `role === "topNHelper"` does not trip D-R1. The rebuilt vis uses the existing vis bind. |
| 2026-10-06 | `Draft` → `Approved` | coordinator, after PO decisions | Pre-check PASS-WITH-NITS. Nits folded: succeeded-action name, phase-4 row wording, `insertSource.tabId`, `datatable` visual types, duplicate redo payload, bind cite, focus/move-mode paths, `widgetBase.md` insertion point. RestoreDeleted id-take dropped because the slot's own shells are the stock that gets overwritten. No production code until a tranche spec and an explicit PO go. |
| 2026-10-06 | tranche 1 chosen | PO vastenburg | Duplicate first, including undo/redo of that duplicate as a rebuild. User delete and move stay on the old shift. |
| 2026-10-06 | tranche 2 chosen | PO vastenburg | Delete first, including undo of a user-initiated delete. Move stays on today's same-shell shift. Duplicate tranche stays closed. No production code until a delete execution spec and an explicit PO go. |
| 2026-10-06 | history spot-check | coordinator | User `tabs_delete` `old` stores `parkedWidgetIds` and filter slices, not `serializedByTabId` (`pushTabsDeleteHistoryStep.js:55-68`). Undo with a numeric `insertTabIdx` dispatches `tabs/restoreDeleted` (`applyTabsDeleteHistoryReplay.js:16-29`). Duplicate undo never enters that branch: its key is `tabs_duplicate` and `old.widgetRebuild` (`buildTabsDuplicateCommittedStep.js:6-13`, replay `:42-52`). Missing per-slot serialization on a user delete is a code gap against §3 and §4, not a contract hole. §4 still says duplicate `step.new` stores `parkedWidgetIds`; live `new` is only `replayDuplicate` plus source ids (`buildTabsDuplicateCommittedStep.js:14-17`). The delete tranche must not "fix" that duplicate payload. |
| 2026-10-06 | prepare spot-check | coordinator | Class **(a)** for a user delete against §6. `handlePrepareTabMutation.js:26` calls `prepareDuplicateSlotStock` only for `duplicate`, or for `delete` when `widgetRebuild === true`. A user delete therefore skips D-R1, D-R2 and the per-slot photos. `prepareDuplicateSlotStock.js:12-17` must not be the user-delete serializer: without the flag it rejects a non-duplicate plan, and `prepareUndo` copies `payload.serializedByTabId` (duplicate-undo before-images), not a live left shift. Names, visibility and the filter shift stay on the delete saga. Do not edit `applyMoveSnapshotFirst`; move still calls it. Stop the call from `restoreDeleted` instead. |
| 2026-10-06 | apply spot-check | coordinator | Class **(a)** against §3 Under §1. Live user delete still matches the Today column: park `plan.deletedSlot` on that same `tabId`, then `applyDeleteSlotMoves` `takeWidget`s onto `toTabId` (`handleApplyTabMutation.js:30-38` and `:85-93`). `widgetRebuild === true` returns before that (`:31-32`). No delta amendment. Delete execution spec is the next gate. |
| 2026-10-06 | delete spec drafted | coordinator | `contracts/tabs-tabMutation-rebuildOnSlotStock-delete-execution-spec.md` is `Draft`. No production code until spec review and an explicit PO go. |
| 2026-10-06 | move inventory started | coordinator | Delete cleanup found no host-breaking leftover. Dead weight waits for a later cleanup spec. Read-only move inventory starts while the delete live test is still open. No move code until a move spec and an explicit PO go. |
| 2026-10-06 | move history spot-check | coordinator | Class **(b)** for the `tabs_move` payload only. `buildCommittedStep.js:6-9` stores inverse positions and nothing else. Undo and redo both dispatch `tabs/move` with `tabIndex` and `targetPosition` (`applyTabsMoveHistoryReplay.js:23-30`). §3 names serialization carriers for delete undo and duplicate redo, not for `tabs_move`. §4 still says tab undo rebuilds from photos on the history step once shells are reused, and the handover requires those photos when content lands on another shell. The move spec must add that field. Do not treat a fresh inverse `tabs/move` as enough. |
| 2026-10-06 | move apply spot-check | coordinator | Class **(a)** against §3 Under §1. Live move still matches Today: `handleApplyTabMutation.js` falls through to `applyMoveSnapshotFirst`, which `takeWidget`s the same shell onto `toTabId` (`applyTabMutationDuplicate.js:104-112`). The plan is a rotation of the inclusive index range, not only a two-tab swap (`buildTabMovePlan.js:52-58`). Every index in that range is a source once and a destination once. No vis/text photo before the physical step. Do not edit `applyMoveSnapshotFirst`; stop calling it from the move arm. |
| 2026-10-06 | move prepare spot-check | coordinator | Class **(a)** against §6. `handlePrepareTabMutation.js:27` and `:40` do not call a stock prepare for `move`. Names, visibility and filters already follow `slotMoves`. `prepareDeleteSlotStock.js` is 150 lines and rejects any other operation (`:17`), so move prepare is a new file. Landing is not always a content participant (`buildTabMovePlan.js:80-95`). |
| 2026-10-06 | §3 `tabs_move` payload | coordinator | Records the handover rule in the paragraph under the §3 table. `old.serializedByTabId` is the before-images. `new` stays positions. No move code until the move spec is reviewed and the PO says go. |
| 2026-10-07 | text-sync | coordinator | PO called the cleanup deploy green. §1 is now in `tabs-tabCrud-contractdelta.md` §2.1 and `widgetBase.md` §0.1. Phase-4 row, move and duplicate as-builts, `widgetBase-tabMutation` membership, apply bullets, rollback, and acceptance items point at rebuild on own stock. Historical tranche specs keep their text plus a supersession line. Tab-mutation clauses of `futureTodo/widgetBase-cognosModelParent-futuretodo-2026-10-06.md` are closed. Launchpad-transfer on one tab stays open. No production code in this step. |

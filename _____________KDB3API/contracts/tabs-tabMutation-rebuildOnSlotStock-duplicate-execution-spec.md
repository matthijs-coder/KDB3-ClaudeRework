# Execution Spec: duplicate rebuilds on slot stock (WP-R tranche 1)

> Mechanical spec. Architecture is `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (**Approved**). Do not re-decide D-R1, D-R1a, D-R2, D-R3, or the tranche boundary in §9.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A before editing.

---

**Status:** `Executed` — live 2026-10-06: PO says copy works. Undo/redo occasionally leaves some widgets unplaced. Not `Implemented` until that flake is classified or the PO accepts it.
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok-4.7-xhigh-fast (when the PO says go)
**Reviewer:** coordinator + spec-review subagent + PO live test

---

## Exclusive allowlist

**May create:**

- `KDB3/js/dashboard/widgets/widgetBase/effects/prepareDuplicateSlotStock.js`
- `KDB3/js/dashboard/widgets/widgetBase/effects/countDuplicateSlotStock.js`
- `KDB3/js/dashboard/widgets/widgetBase/effects/rebuildSlotFromEntries.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetBase/actions/handlePrepareTabMutation.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/applyTabMutationDuplicate.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleApplyTabMutation.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/handleRestoreTabMutationSnapshot.js`
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js`
- `KDB3/js/dashboard/tabs/effects/dispatchOwnerTabMutation.js`
- `KDB3/js/dashboard/tabs/config/mutationCodes.js`
- `KDB3/js/dashboard/tabs/history/buildTabsDuplicateCommittedStep.js`
- `KDB3/js/dashboard/tabs/history/pushTabsDuplicateHistoryStep.js`
- `KDB3/js/dashboard/tabs/history/applyTabsDeleteHistoryReplay.js`
- `KDB3/js/dashboard/widgets/widgetBase/actions/resolveDropClaim.js`

**Must not edit:** `placeSerializedWidgetEntry.js`, `fillDuplicateWidgetContent.js`, `applyTabMutationRestoreDeleted.js`, `applyMoveSnapshotFirst` (it stays in `applyTabMutationDuplicate.js` and move/delete still call it), filter owners, writeback `runWidgetRestore.js` / `bindVisPerActiveTab.js` (call the same tab action, do not fork that file), `widgetTopN/**`, `placeWidgetOnCanvas.js`, every `tabs/move` plan, user-delete plan builder, contracts, `.mdc`. `resolveDropClaim.js` may be edited only to export the existing eligibility helpers. No commit/push. No new `_KDB` namespace. No Cognos `moveContent` / `setParent`.

## Behaviour this tranche must produce

Shells stay on the Cognos slot. Duplicate no longer calls `applyMoveSnapshotFirst`.

Forward `tabs/duplicate`:

1. Prepare serializes vis/text on every `plan.affectedTabIds` slot (same gate as `shouldSerializeFrame`: not disposed, kind `vis` or `text`, role not `topNHelper`, id not `kdb3widget`).
2. Destinations are each `slotMoves[].toTabId`, plus `insertSlot.tabId` for the clone of `sourceSlot`. The source slot is not a destination.
3. Two maps, both keyed by destination `tabId`. `serializedByTabId[tabId]` is the live photo of what is on that slot before any park. `rebuildByTabId[tabId]` is what apply writes there: for a `slotMoves` target, the photo of `fromTabId`; for `insertSlot`, the photo of `sourceSlot`. Undo and in-saga rollback write the first map. Apply writes the second. Order does not matter; both photos are taken before any park.
4. D-R1: if any onCanvas frame on an affected slot has a kind other than `vis` or `text`, and its role is not `topNHelper`, prepare returns `ok: false`. Kind `datatable` aborts whatever its visual type is. `kdb3widget` is not a frame in this check.
5. D-R2: for each destination, own-slot stock of pad `visualization` (vis) and `text` must be at least the incoming count. Stock is onCanvas frames of that kind on that `tabId`, plus launchpad children of that pad and `tabId` that `resolveDropClaim.js` `claimFromPad` would treat as `hasContent`, excluding ids already counted on the canvas. `widgets.length` is not the count. Shortage returns `ok: false`. The saga already aborts a failed prepare before filter remap and before apply.
6. For each destination that has at least one incoming row: call `ensureRevealTakeTarget` with that slot's `{ index, tabId }` before any `appendChild`, including the reveal slot. Then park that slot's onCanvas widgets onto that same `tabId`. A frame with `role === "topNHelper"` or `kind === "topN"` is routed with the same hints as `parkWidgetsForParameterSet.js` (`visualType: "LIST"`, `isTopNHelperClaim: true`). Then `placeSerializedWidgetEntry` for each incoming entry onto that same `tabId`. If that helper has returned and the destination page element is not inside its tab wrapper, return a structural failure. Do not rely on the tab-container fallback in `placeWidgetOnCanvas`. Then `fillDuplicateWidgetContent` for that destination's created rows only. Fill allocates the numeric `runId`. Do not dispatch `tabs/parameterSetActivateTabRequested` or `widgetVis/parameterSetBindingRequested` yourself. A destination whose incoming row list is empty, and whose `tabId` is not a `slotMoves` `fromTabId`, is left untouched: do not park it. The reveal slot is never a `from`. The existing post-commit landing traverse still returns the user to the landing tab. Do not park or rebuild the source slot.
7. A place or fill failure after prepare passed is still the current degraded-or-structural split inside duplicate apply (structural on throw/superseded, degraded on `placeResult.ok === false` or fill). Shortage itself never reaches apply.

Undo of `tabs_duplicate` (history `step.old`):

- Replay dispatches `tabs/delete` with `widgetRebuild: true` and `serializedByTabId` set to the destination before-images. It does not dispatch `tabs/restoreDeleted`. It does not send `rebuildByTabId` or a filter snapshot.
- `tabs/tabMutationApply` and the filter phase stay the delete saga. Names and visibility invert by the left shift and the hide. Visible-tab filters invert the same way: duplicate copied them one slot to the right, delete copies that live chain one slot to the left. The revealed tail is cleared when it is hidden again. That is today's duplicate-undo, not a second filter photo. Do not store filter slices on the history step.
- Widget apply, only when `widgetRebuild === true`, does not call `applyDeleteSlotMoves` and does not park-and-leave the deleted slot. It rebuilds each key of `serializedByTabId` except `plan.hideSlot.tabId`. That hide slot is parked onto its own `tabId` and left in the launchpad, so the re-hidden tail stays empty, matching today's delete. Every other key is rebuilt onto that same `tabId`.
- A user delete without the flag keeps today's park plus `applyDeleteSlotMoves`.

Redo of `tabs_duplicate` (history `step.new`):

- Replay dispatches `tabs/duplicate` with the source `tabId` / `tabIndex` and `isHistoryReplay: true`. `step.new` must not contain `insertTabIdx`.
- That runs the forward path again. Existing `isHistoryReplay` guards already skip a second history push.

In-saga rollback when `snapshot.physicalStarted` and the run is a duplicate or a `widgetRebuild` delete: do not take a snapshot `widgetId` onto a different `tabId`. Rebuild each overwritten `tabId` from `snapshot.rollbackByTabId` (live serialization taken at prepare, before this run's parks). Same-slot park of `createdWidgetIds` stays. Move and a user delete keep today's `restoreFromSnapshot` take.

## Section A. Pre-flight read list

Echo one sentence per row before editing.

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc` — no new state subtree; frames still change only through existing reducer actions.
3. `.cursor/rules/runtime.mdc` — serialization stays on `runtime.widgetBase.tabMutationSnapshots`, never in `_KDB.state`.
4. `.cursor/rules/module-public-api.mdc` — no new public method; still `dispatch`.
5. `.cursor/rules/events.mdc` — no new event.
6. `.cursor/rules/feature-structure.mdc` — ≤150 lines, ≤6 imports unless the file already exceeds that and this edit does not add imports.
7. `.cursor/rules/naming.mdc` — new files are `verb + noun`. No new `handle*` file.
8. `.cursor/rules/error-handling.mdc`
9. `.cursor/rules/amd.mdc`
10. `.cursor/rules/dom.mdc` — no new DOM parent logic; park and take stay the existing helpers.
11. `.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` and no `__getDashboardAPI()` in these files.
12. `contracts/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, §3, §4, §6, §9.
13. Live files, read fully: the allowlist edits, plus read-only `effects/placeSerializedWidgetEntry.js`, `effects/fillDuplicateWidgetContent.js`, `core/services/writeback/set/effects/bindVisPerActiveTab.js` (payload only), `actions/serializeWidgetFrame.js`, `state/buildTabDuplicatePlan.js`.
14. This spec.

## Section C. Per-file specification

#### `tabs/config/mutationCodes.js` (edit)

Add `KIND_UNSUPPORTED: "TABS_MUTATION_KIND_UNSUPPORTED"` and `STOCK_SHORT: "TABS_MUTATION_STOCK_SHORT"`. Nothing else.

#### `effects/prepareDuplicateSlotStock.js` (new)

- Role: effect. Entry `__controller`. Target ≤120 lines. Imports: `../actions/serializeWidgetFrame.js`, `../config/launchpadChannels.js`, `../../tabs/config/mutationCodes.js`. 3 imports.
- Parameters: `(_context, _plan, _snapshot, _payload)`.
- Steps, in `try`, then `console.error("[widgetBase.prepareDuplicateSlotStock] failed", err); throw err`:
  1. If `_payload.widgetRebuild === true`, set `_snapshot.widgetRebuild = true`. `_snapshot.rebuildByTabId` is a JSON clone of `_payload.serializedByTabId` (those values are already the destination before-images). `_snapshot.rollbackByTabId` is a live serialize of those same tab ids (step 3), so a failed undo puts the post-duplicate content back. Run steps 4 and 5 against `rebuildByTabId`. Return `{ ok, diagnostics }`.
  2. Otherwise require `plan.operation === "duplicate"`. Leave `_snapshot.widgetRebuild` unset. Build `serializedByTabId` for every id in `plan.affectedTabIds`. The kind/role/id gate lives only in this file: move `shouldSerializeFrame` here and delete it from `handlePrepareTabMutation.js`. Do not copy `shouldCollectFrame` from writeback. Store the map on `_snapshot`. Build `rebuildByTabId`: for each `slotMoves` entry, `toTabId` gets `serializedByTabId[fromTabId]`; then set `insertSlot.tabId` to `serializedByTabId[sourceSlot.tabId]`. Do not put the source slot in `rebuildByTabId`. Set `_snapshot.rollbackByTabId` to the destination before-images: for each key of `rebuildByTabId`, `rollbackByTabId[key] = serializedByTabId[key]` (the live photo of that slot, not the incoming `rebuildByTabId` value).
  3. Live serialize helper: same predicate, frames from `readCanvasWidgetsByTab` for that `tabId`. Each stored row is `{ sourceWidgetId, entry }` with `entry` the object `serializeWidgetFrame` already returns. Skip a null entry. Do not count a null entry as demand.
  4. D-R1 over `plan.affectedTabIds` (forward) or the keys of `rebuildByTabId` (undo). Offending frame → `{ ok: false, diagnostics: [{ code: KIND_UNSUPPORTED, message, tabId, kind }] }`.
  5. D-R2 over each destination key. Vis demand is rows whose `entry.kind === "vis"`. Text demand is `entry.kind === "txt"`. Stock for vis uses pad `CHANNELS.VISUALIZATION` and frame kind `vis`. Stock for text uses pad `CHANNELS.TEXT` and frame kind `text`. Count a shell only when the exported eligibility from `resolveDropClaim.js` accepts it (the same `hasContent === "yes"` tri-state and the same launchpad-slot / not-host checks `claimFromPad` already uses). On-canvas frames of that kind on that tab count as stock because apply parks them onto that pad before claiming. Do not count `widgets.length`. If the facet is unevaluable, return `ok: false` with `TABS_MUTATION_PREPARE_FAILED`, not `STOCK_SHORT` and not a pretend zero. Shortage of an evaluable pad → `{ ok: false, diagnostics: [{ code: STOCK_SHORT, message, tabId, kind }] }`.
  6. Success → `{ ok: true, diagnostics: [] }`. Do not set `expectedDegradedEntries`. After `rebuildByTabId` and `rollbackByTabId` are set, drop the full affected album from the snapshot. Those two maps are the only photos apply and rollback read.
- Rules: `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`, `cognos-adapter.mdc`. No nested function declarations inside the entry. Factory-scope helpers allowed.

#### `effects/rebuildSlotFromEntries.js` (new)

- Role: effect. Entry `__controller`. Target ≤120 lines.
- Imports: `./placeSerializedWidgetEntry.js` only, unless a second import is required for a constant already used by `applyTabMutationDuplicate.js`. Do not import `applyTabMutationDuplicate.js`.
- Parameters: `(_context, _tabId, _rows, _deps)` where `_deps` is `{ routeWidget, ensureRevealTakeTarget, revealSlot, parked, moved, placeOptions, isStale, runId }`.
- Steps in `try`:
  1. Read onCanvas widgets for `_tabId`. `routeWidget` each with that same `_tabId`. When the frame's `role` is `topNHelper` or its `kind` is `topN`, the route payload also includes `visualType: "LIST"` and `isTopNHelperClaim: true` (same hints as `parkWidgetsForParameterSet.js`). Other frames keep today's payload (`isHistoryReplay: true`, no visual type).
  2. Before any place, `await ensureRevealTakeTarget` with `{ index, tabId }` for this destination. The caller passes `index` from `insertSlot` or the `slotMoves` `to` index. This is every destination, not only the reveal slot.
  3. For each row, if `isStale`, return `{ ok: false, superseded: true, created: [], degradedEntries: [] }`. Else `placeSerializedWidgetEntry` with `_tabId` and the same place-option shape duplicate uses today (`guard`, `reason`, `source: "tabsMutation"`, `skipHistory: true`, `isHistoryReplay: true`).
  4. Collect `created` as `{ sourceWidgetId, widgetId }` and per-entry degraded the same way `applyTabMutationDuplicate.js` does now. A throw or `superseded` sets `ok: false` and `structural: true`.
  5. Return `{ ok: true, created, degradedEntries }` when no structural failure. `ok: true` with degraded entries is allowed.
- `catch`: log `[widgetBase.rebuildSlotFromEntries] failed` and rethrow.
- Rules: `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc` (no new query; park/take stay inside the injected helpers and `placeSerializedWidgetEntry`).

#### `actions/handlePrepareTabMutation.js` (edit)

- Keep the routed-slot check and the frame snapshot.
- When `plan.operation === "duplicate"` or (`plan.operation === "delete"` and `payload.widgetRebuild === true`), `await` the new prepare effect. If it returns `ok: false`, return `ok: false` with its diagnostics and do not return `ok: true`.
- Remove the old duplicate-only block that sets `expectedDegradedEntries` from `countLaunchpadShells` / `widgets.length`. Delete `countLaunchpadShells` if nothing else in this file calls it.
- Move, user delete, and restoreDeleted prepare stay `expectedDegradedEntries: 0` and `ok: true` after the routed-slot check.
- File must stay ≤150 lines. If the edit would pass that, the moved logic belongs in the new prepare file, not in new helpers pasted at the bottom.
- Rules: `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc`.

#### `actions/applyTabMutationDuplicate.js` (edit)

- Delete the `applyMoveSnapshotFirst(...)` call at the start of `applyTabMutationDuplicate`. Keep the function and its export. Move and user delete still call it.
- Keep the `ensureRevealTakeTarget` call only as the dependency passed into the rebuild effect (the effect calls it per reveal slot).
- For each destination key of `snapshot.rebuildByTabId`, `await` the rebuild effect, passing that slot's index. Concatenate `created` and `degradedEntries`. On `structural` or `superseded`, return the existing `structuralFail`. Record created ids on `snapshot.createdWidgetIds` as today. After each destination, `fillDuplicateWidgetContent` for that destination's created rows only. Do not dispatch vis binding or tab activate yourself.
- Do not add a fourth placement API. File ≤150 lines. `applyMoveSnapshotFirst`, `routeWidget`, and `takeWidget` stay in this file. `routeWidget` gains an optional hints argument used for TopN frames; existing callers that omit it stay unchanged.
- Rules: `amd.mdc`, `error-handling.mdc`, `feature-structure.mdc`.

#### `actions/handleApplyTabMutation.js` (edit)

- In the `delete` branch, when `payload.widgetRebuild === true`: do not call `applyDeleteSlotMoves` and do not run the deleted-slot park loop. Skip `plan.hideSlot.tabId`: park that slot's onCanvas widgets onto that same `tabId` and do not place entries there. Rebuild every other key of `snapshot.rebuildByTabId`, then `fillDuplicateWidgetContent` per destination as duplicate does. Pass `reason: "tabDelete"`.
- When the flag is absent, the delete branch is byte-identical to today.
- The `move` branch is byte-identical.
- Rules: `amd.mdc`, `error-handling.mdc`.

#### `actions/handleRestoreTabMutationSnapshot.js` (edit)

- If `physicalStarted` and (`snapshot.plan.operation === "duplicate"` or `snapshot.widgetRebuild === true`): skip `restoreFromSnapshot`'s take loop and skip `restoreFrames`. Park `createdWidgetIds` as today. Rebuild each key of `snapshot.rollbackByTabId` onto that `tabId` through the rebuild effect. Then delete the snapshot.
- Any other operation: today's function, unchanged.
- Prepare must have stored `snapshot.plan` (the existing `snapshotFrames` already stores the plan; do not drop it) and `snapshot.widgetRebuild` when the flag was set.
- Rules: `amd.mdc`, `error-handling.mdc`, `runtime.mdc`.

#### `actions/resolveDropClaim.js` (edit)

- Export the existing helpers `claimFromPad` already depends on for eligibility (`widgetHasContent` / the tri-state reader, and the launchpad-slot check). Do not change who gets claimed or the order. `prepareDuplicateSlotStock` imports those exports. No second copy of the tri-state.
- Rules: `amd.mdc`, `module-public-api.mdc` (this file stays an internal effect; the export is for the sibling prepare file, not a new `_KDB.api` method).

#### `tabs/actions/runTabMutationSaga.js` (edit)

- After `runContext` is created, copy `payload.widgetRebuild` and `payload.serializedByTabId` onto `runContext`.
- No other phase-order change. The duplicate degraded gate at lines 41–45 stays for fill/place degraded entries. A prepare `ok: false` must still abort before filter apply (already true; do not weaken it).
- Rules: `error-handling.mdc`, `feature-structure.mdc`. This file is already over 6 imports; do not add an import.

#### `tabs/effects/dispatchOwnerTabMutation.js` (edit)

- `buildOwnerPayload` for `widgetBase` returns `{ widgetRebuild, serializedByTabId }` from `runContext` when the flag is true, else `{}`. Filter owners stay on `tabIdxToScopeId` only.
- Rules: `amd.mdc`, `module-public-api.mdc`.

#### `tabs/history/buildTabsDuplicateCommittedStep.js` (edit)

- `old`: `{ tabIndex: insertTabIdx, tabId: insertSlot.tabId, widgetRebuild: true, serializedByTabId }`. `serializedByTabId` is the destinations' before-images (not the source slot). Do not put `sourceTabId` or filter slices on `old`.
- `new`: `{ replayDuplicate: true, sourceTabId, sourceTabIndex }`. No `insertTabIdx`, no `parkedWidgetIds`.
- Parameters of the factory change to take those fields. Keep the function the only export.
- Rules: `naming.mdc`, `amd.mdc`.

#### `tabs/history/pushTabsDuplicateHistoryStep.js` (edit)

- Copy `snapshot.rollbackByTabId` into the history field `serializedByTabId`. That map is the destination before-images. Do not copy `rebuildByTabId`. Do not copy filter snapshots. `step.new` has no filter slices; redo re-runs duplicate, and undo filters go through the delete saga. Source slot and insert index for `step.new` come from `plan.sourceSlot` / `plan.insertSlot`.
- Still return immediately when `payload.isHistoryReplay === true`.
- Rules: `error-handling.mdc`, `runtime.mdc` (read the snapshot, do not store it under `_KDB.state`).

#### `tabs/history/applyTabsDeleteHistoryReplay.js` (edit)

- `step.key === "tabs_delete"`: both branches unchanged.
- `step.key === "tabs_duplicate"` and `targetValue.widgetRebuild === true`: dispatch `tabs/delete` with `tabIndex`, `tabId`, `widgetRebuild`, `serializedByTabId`, `isHistoryReplay: true`, `source: "historyReplay"`.
- `step.key === "tabs_duplicate"` and `targetValue.replayDuplicate === true`: dispatch `tabs/duplicate` with `tabId: sourceTabId`, `tabIndex: sourceTabIndex`, `isHistoryReplay: true`, `source: "historyReplay"`.
- Do not dispatch `tabs/restoreDeleted` for `tabs_duplicate`.
- Rules: `amd.mdc`, `error-handling.mdc`, `events.mdc` (this is a direct API call, not a request-event).

## Section J. Acceptance (self-verification)

The writer reports, before claiming done:

1. `node --check` on every allowlist file.
2. Line count and `define` import count for the two new files and for `applyTabMutationDuplicate.js`, `handlePrepareTabMutation.js`, `handleApplyTabMutation.js`.
3. `applyTabMutationDuplicate` has no call to `applyMoveSnapshotFirst`. `handleApplyTabMutation` move branch still calls it. User delete (no flag) still calls `applyDeleteSlotMoves`.
4. Forward prepare sets `snapshot.rollbackByTabId[tabId]` from the live photo of that slot for every `rebuildByTabId` key, then drops the full album. History `old.serializedByTabId` is that `rollbackByTabId`, not `rebuildByTabId`. `snapshot.widgetRebuild` is set only on the undo path.
5. `buildTabsDuplicateCommittedStep` `new` object has no `insertTabIdx`.
6. `prepareDuplicateSlotStock` has no `widgets.length` stock count.
7. No edit outside the allowlist (`git diff --stat`).

## Section K. Live acceptance (PO)

Reload the dashboard. Do not pre-open every tab.

1. Duplicate the tab that previously came back empty (the one with several vis widgets and an insert slot that had no free vis pad). The copy shows those vis widgets, with settings. Neighbour tabs show the content that used to shift, and a vis shell's Cognos container id is still the page of the slot it was registered on.
2. Undo that duplicate. The copy is gone. Neighbour content and the visible tabs' filters are back where they were. The slot that was revealed and then hidden again is cleared, as a delete-undo already does today.
3. Redo. The copy is back, same as step 1.
4. Delete a tab from the UI (not via undo). That path still uses the old shift. Expect the pre-WP-R behaviour. Do not treat a failure of step 4 as a failure of this tranche.
5. A tab that contains a datatable: duplicate is refused, the dashboard is unchanged, and the diagnostic code is `TABS_MUTATION_KIND_UNSUPPORTED`.
6. If a destination has fewer vis shells than the incoming vis count: duplicate is refused with `TABS_MUTATION_STOCK_SHORT`, dashboard unchanged.

## Section L. Forbidden

- Editing move apply, restoreDeleted apply, or `placeSerializedWidgetEntry.js`.
- Deleting `applyMoveSnapshotFirst` or `applyDeleteSlotMoves`.
- Calling `writebackSet.restore`.
- Updating a Cognos widget parent.
- Remapping widget-history steps (D-R3).
- Continuing a duplicate when stock is short.
- A user delete picking up `widgetRebuild` because the flag leaked into a UI delete payload.
- Git commit or push.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Draft` | coordinator | Tranche 1 per delta §9. Spec review not yet run. |
| 2026-10-06 | review FAIL folded | coordinator | History and forward rollback store destination before-images (`serializedByTabId[dest]`), not `rebuildByTabId`. Undo prepare sets `snapshot.widgetRebuild`. `snapshotFrames` already stores `plan` (`guardTabMutation.js:33-37`). |
| 2026-10-06 | re-review PASS | coordinator | The three must-fixes agree. |
| 2026-10-06 | swarm holes folded | coordinator | Vis bind per destination after `forceShow`. Stock count calls exported `resolveDropClaim` eligibility. `shouldSerializeFrame` moves. Two snapshot maps, not three. |
| 2026-10-06 | filter undo hole folded | coordinator | Withdrawn. Visible-tab filters invert through the delete shift. Clearing the revealed tail is today's duplicate-undo. |
| 2026-10-06 | edge holes folded, writer go | coordinator | Page traverse before place. Fill owns the vis `runId`. TopN park hints. Undo skips `hideSlot`. Empty non-source destinations are not parked. |
| 2026-10-06 | review PASS-WITH-NITS → `Executed` | coordinator | Review PASS-WITH-NITS. No must-fix. `byId` stays. Nits: prepare is 149 lines; `hasTabInnerFrame` import is the page-in-wrapper check. |
| 2026-10-06 | live mostly green | PO vastenburg | Copy, undo and redo work. Rarely not every widget is placed on undo/redo. Two post-review fixes, not yet in the review: AMD path `../../../tabs/config/mutationCodes.js` in `prepareDuplicateSlotStock.js` and `countDuplicateSlotStock.js`; stock count skips one unevaluable shell and keeps the canvas count when the pad read fails. |

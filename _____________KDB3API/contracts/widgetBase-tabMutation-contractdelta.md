# Contract Delta: `widgetBase` Tab-Mutation (prepare / apply / restore snapshot)

> Delta on top of `contracts/widgetBase.md`, owned by the tab-CRUD saga defined in `contracts/tabs-tabCrud-contractdelta.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved — PO 2026-08-10; cross-reviewed (writeback planner corrections A/C incorporated 2026-07-15)`
**Parent contract:** `contracts/widgetBase.md`
**Consumer:** `tabs` (tab-CRUD saga only; `source: "tabsMutation"`)
**Depends on:** `tabs-tabCrud-contractdelta.md` (§2.1 field table, §2.2 invariant, §2.3 phases, §2.4 MutationResult, §3 binding frames), `widgetBase-lazyLaunchpadRouting-contractdelta.md`, `widgetBase-parameterSetRestore-contractdelta.md`
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-14 (§4 corrected per writeback-planner code review, 2026-07-15)
**Reviewed by:** writeback function planner 2026-07-15 (corrections A: ensure-routed motivation + no third `routedTabIds` writer; C: ensure called without runId); PO `<pending>`

---

## 1. Purpose

The tab-CRUD saga permutes *content* over immutable physical Cognos slots (`tabs-tabCrud-contractdelta.md` §2.1 — normative, not restated here). `widgetBase` owns the widget side of that permutation: on duplicate, delete, and move it rebuilds content on the destination slot's own stock. It does not take a shell onto another tab (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1, live 2026-10-07). Tabs never touches widget state or widget DOM (`stateOwnership.md`); it dispatches the three actions below and consumes their results.

Widget membership of a shell is **slot-physical**: the frame fields `tabId`/`tabHandle` (`state/createWidgetBaseReducer.js`) are the Cognos slot where that shell was registered. They do not permute with the tab. Rebuilt content is placed on the destination slot's own shells. `routedTabIds[tabId]` stays slot-physical bookkeeping ("this slot's pre-existing widgets were routed once"), never permuted and never written by mutation code (§3/§4).

## 2. New Dispatches

All three follow §3.7 of the parent CRUD delta: payload carries `{ runId, operationId, source: "tabsMutation", skipHistory: true }`; stale `runId` (guard modeled on `handleEnsureTabWidgetsRouted.js` / `_KDB.runtime.widgetBase.parameterSetRunId` discipline, but on a dedicated `tabMutationRunId` key) resolves `{ ok: false, errorCode: "TABS_MUTATION_CANCELLED" }` with **no side effects**.

New action types (`config/actionTypes.js`):

| Constant | String |
|---|---|
| `PREPARE_TAB_MUTATION` | `widgetBase/prepareTabMutation` |
| `APPLY_TAB_MUTATION` | `widgetBase/applyTabMutation` |
| `RESTORE_TAB_MUTATION_SNAPSHOT` | `widgetBase/restoreTabMutationSnapshot` |

### 2.1 `widgetBase/prepareTabMutation` — saga phase 2

Payload: `{ plan, runId, operationId, source, skipHistory }` where `plan` is the immutable tabs mutation plan (slots keyed on `tabId` **and** position).

Behavior (no DOM, no Cognos):

1. Snapshot all frames in `_KDB.state.widgets.base.byId` whose `tabId` is in the plan's affected slot set, plus the affected `routedTabIds` entries, under `_KDB.runtime.widgetBase.tabMutationSnapshots[operationId]`.
2. Capacity check (duplicate, delete, and move): own-slot stock of pad `visualization` or `text` must cover the incoming vis or text count. Shortage fails prepare before any physical step (`tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §6 D-R2). The older rule that a duplicate shortage is only `expectedDegradedEntries` is superseded.
3. Readiness check: every affected *target* slot must be canvas-loaded and ensure-routed (§4 precondition); if not verifiable, fail prepare.

Return: `Promise<{ ok, operationId, snapshotWidgetIds: string[], expectedDegradedEntries: number, diagnostics }>`. Failure → saga aborts pre-mutation (dashboard byte-identical).

### 2.2 `widgetBase/applyTabMutation` — saga phase 4 (irreversibility frontier)

Payload: `{ plan, runId, operationId, source, skipHistory }`. The plan's `slotMoves` describe content permutation as ordered slot pairs. Shells stay on their Cognos slot. Apply parks each involved shell onto its own pad and rebuilds the incoming vis/text on the destination slot's own stock. The as-built paragraphs below this list keep the historical shift; they are superseded for tab mutation by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (live 2026-10-07).

- **delete** (`plan.operation === "delete"`): serialize the participating slots first. Park the hidden tail on its own `tabId` and do not fill it. Rebuild every other destination from the photo of the slot whose content shifts in. Do not `takeWidget` a shell onto another tab.
- **move**: same rebuild over the rotation range `[min(s,d), max(s,d)]`. Every index in that range is a source once and a destination once. No shell is created or destroyed. Widget-scoped history stays on the shell id.
- **duplicate**: rebuild every shifted slot and the insert-slot clone on that slot's own stock, then `fillDuplicateWidgetContent`. Do not shift shells first. Skipping the fill's settings placement is still a contract breach (§3.2 parent frame).
- Apply performs **no `routedTabIds` writes** (corrected 2026-07-15, §4): the ensure-routed dispatches the saga awaits before this phase have already seeded the affected slots.

Return: `Promise<{ ok, operationId, moved: string[], parked: string[], created: Array<{ sourceWidgetId, widgetId }>, degradedEntries: Array<{ sourceWidgetId, code, message }>, diagnostics }>`.

Failure behavior: delete/move — abort saga, best-effort rollback (§2.3); duplicate — per-entry degraded (§3.4 parent frame), abort only on structural failure (no launchpad, no plan slot).

**As-built 2026-08-12:** move apply snapshot-first (read all `slotMove` sources → park all → take all); rollback re-places from prepare snapshot (replaces reverse-move loop); operation guard now `delete|move`.

**As-built 2026-08-12 (duplicate, tranche 3):** **prepare** — `serializeWidgetFrame.js` wraps the unchanged pure GET `buildWidgetObject.js` (dashboard→core AMD import; writeback planner sign-off) via owner `getState` reads; per-frame `serializedEntries` + launchpad capacity forecast → `expectedDegradedEntries` stored in widgetBase's own `tabMutationSnapshots[operationId]` bucket (D-DUP-2). **apply** — `applyTabMutationDuplicate.js`: descending `slotMoves` shift via `applyMoveSnapshotFirst`, then per-entry `placeSerializedWidgetEntry` on `insertSlot.tabId`; per-entry creation failures → `degradedEntries` (continue); shift/guard failures → structural `{ ok: false }`; `createdWidgetIds` recorded in prepare snapshot for rollback. **rollback** — `handleRestoreTabMutationSnapshot.js` parks `createdWidgetIds` best-effort via `parkCreatedWidgetsForRollback.js`. **D-DUP-1** — per-entry placement extracted to `effects/placeSerializedWidgetEntry.js` (shared with writebackSet restore; guard descriptor `parameterSetRunId`|`tabMutationRunId`; §10.1 middle-path waiver). Operation guard now `delete|move|duplicate`. **content-fill (amended 2026-08-12 after smoketest):** after per-entry placement, `effects/fillDuplicateWidgetContent.js` reuses restore steps 25-27 (`widgetSettings/parameterSetRestoreBatchRequested` → `widgetText/parameterSetRestoreRequested` → `widgetVis/parameterSetBindingRequested`) over the cloned entries with a compacted `widgets`/`widgetCorrelation` map (indexed by created order) and a freshly allocated `parameterSetRestoreRunId` (canonical writeback allocator, keeps owner runId guards monotone); payloads carry `source: "tabsMutation"`, `skipHistory: true`; content-fill failures are degraded-only (`degradedEntries`), never structural.

**As-built 2026-08-13:** `handleTakeFromLaunchpad.js` — when `targetLayout` is not numeric, layout resolves via `resolveCanvasLayoutFromFrame(readFrame(widgetId))` on the live frame (post-park `lastCanvasLayout`); tab-mutation `takeWidget` omits frozen pre-park layout. Duplicate serialize DOM merge in this as-built is superseded 2026-08-27.

**As-built 2026-08-16 (GET layout + drop tabId):** writeback GET `collectWidgets.js` merges live DOM layout via `mergeDomLayoutIntoFrame` after traverse before `buildWidgetObject`. `handleDropCreate` `PLACE_ON_CANVAS_SUCCEEDED` includes `tabId` from the drop route when present. `placeSerializedWidgetEntry` re-applies layout after `contentCreate` (shared SET + duplicate). Duplicate serialize no longer shares that DOM-merge helper (2026-08-27).

**As-built 2026-08-27 (duplicate serialize layout source):** `serializeWidgetFrame.js` stamps `resolveCanvasLayoutFromFrame` (`lastCanvasLayout`, else `layout`) onto a frame copy before `buildWidgetObject`. No shell resolve and no `mergeDomLayoutIntoFrame` — prepare stays DOM-free (§2.1). Shared with GET is the pure `buildWidgetObject` v3 shape, not the layout source. Clone placement still maps serialized `x,y,w,h` to `targetLayout` on `handleTakeFromLaunchpad` (same apply path as move take; new shell id cannot omit `targetLayout`). On-canvas `PLACE_ON_CANVAS_SUCCEEDED` writes `layout` and `lastCanvasLayout` from the same payload, so the stamp is a no-op versus raw `frame.layout`; the load-bearing change is dropping the 08-13 DOM merge (hidden Cognos page → 300×200). This is **not** the last-tab clone size/position fix — that is the insert===reveal as-built below.

**As-built 2026-08-13 (duplicate reveal-slot take):** `applyTabMutationDuplicate.js` + `ensureRevealTakeTarget.js` — before `takeWidget` onto `plan.revealSlot.tabId`, activate that slot via `_KDB.api.tabs.dispatch` (`tabs/traverse`, `includeHiddenDashboardTabs: true`, `waitFor: "canvas"`) and call `_KDB.api.dragDrop.refreshDropboxes()` because `widgetApply` precedes reducer `revealDuplicateTailSlot` and `subscribeTabsChangedRebind` suppresses dropbox rebind while `tabMutation` is pending.

**As-built 2026-08-27 (duplicate clone onto insert===reveal):** Last-visible-tab copy has empty `slotMoves`, so the shift-take `ensureRevealTakeTarget` never ran; clones still target `insertSlot`, which **is** the reveal. `restoreDeleted` already activated + `refreshDropboxes` before taking onto insert when `insertSlot.tabId === revealSlot.tabId`; duplicate clone place did not. `widgetApply` still precedes reducer reveal; `tabMutation` still suppresses dropbox rebind. Duplicate apply now calls the same helper with the same traverse payload before `placeSerializedWidgetEntry` in that case only. No new placement API.

**As-built 2026-08-27 (restoreDeleted vis chrome rebind):** restoreDeleted redo/undo-delete apply still `takeWidget` parked ids (no `placeSerializedWidgetEntry` / `contentCreate` / full `fillDuplicateWidgetContent`). After takes, vis-only `widgetVis/parameterSetBindingRequested` over taken vis frames (`moved`, `kind === "vis"`), same public bind as duplicate fill vis-half and SET step 27, fresh `parameterSetRestoreRunId`, `source: "tabsMutation"`, `skipHistory: true`, degraded-only. Needed because park `disposeWidgetRuntime` drops vis runtime and redo never re-applied catalog chrome (`titleMode`/axes/legend/title); plot can remain on the shell. Layout still from take/`lastCanvasLayout`. Does not put vis props in history.

### 2.3 `widgetBase/restoreTabMutationSnapshot` — rollback

Payload: `{ operationId, runId, source }`.

- Before any physical step of §2.2 ran: pure state restore from `tabMutationSnapshots[operationId]` — complete, cheap (this is why filters apply before widgets, D-CRUD-7b).
- After physical steps started on a duplicate, delete, move, or `restoreDeleted`: rebuild each overwritten slot from `rollbackByTabId` on that slot's own stock. Same-slot park of created clones stays. Do not take a snapshot `widgetId` onto a different `tabId`. A widget that cannot be rebuilt produces a `TABS_MUTATION_ROLLBACK_INCOMPLETE` diagnostic. Never silent.
- Always deletes the snapshot bucket on completion.

Return: `Promise<{ ok, operationId, restored: string[], unrecoverable: string[], diagnostics }>`.

## 3. Runtime & State Rules

- New runtime bucket: `_KDB.runtime.widgetBase.tabMutationSnapshots = {}` (init in `ensureWidgetBaseRuntime.js`, cleared in `cleanupWidgetRuntime.js`), plus `tabMutationRunId` stale-guard key. No tab-mutation data in `_KDB.state` (runtime-only, `runtime.mdc`).
- Frame writes (`tabId`, `tabHandle`, `placement`, `launchpadPad`, `launchpadSlotKey`) go exclusively through the existing reducer actions emitted by the reused primitives (`ROUTE_TO_LAUNCHPAD_SUCCEEDED`, `PLACE_ON_CANVAS_SUCCEEDED`); the tab-mutation handlers introduce **no new reducer writes** for placement.
- `routedTabIds` is slot-physical bookkeeping ("this slot's pre-existing widgets were routed once") and keeps its existing **two writers only** — the mount-seed (`mountStartup.js`) and `mayMarkRouted` inside `handleEnsureTabWidgetsRouted.js` (which refuses to mark while `missingShells > 0`). Tab-mutation handlers never write it: a third writer would bypass that honesty check. It is never permuted (slot-physical per parent §2.1); the saga's awaited ensure calls seed it as a side effect (§4).

## 4. Precondition: target slots activated + ensure-routed (corrected 2026-07-15)

Correction note: an earlier revision of this section claimed the lazy routing would re-park saga-placed widgets on a slot with unset `routedTabIds`. That hazard **does not exist**: `buildCanvasWidgetDescriptor.js` has an ownership guard (`isOwnedWidget`, skipReason `WIDGET_BASE_WIDGET_ALREADY_OWNED`) that excludes every widget tracked in widgetBase state — any placement — from parking, and saga-placed widgets are tracked via `takeFromLaunchpad` → `PLACE_ON_CANVAS_SUCCEEDED`. Also note the lazy subscriber dispatches ensure on **every** activation (the `firstActivation` filter was removed 2026-07-12); ensure is idempotent via `routedTabIds`/`pendingRouteByTabId`.

The precondition itself stands, for the correct reasons (mirrors `writeback.md` §6.6 step 23): before `applyTabMutation`, the saga must have activated every affected target slot and awaited `widgetBase/ensureTabWidgetsRouted` for it (intermediate activations suppressed per parent §3.5), because:

1. **pre-existing/untracked Cognos shells** on the target slot must be parked on the launchpad *before* new content lands there (otherwise they are unclaimable and collide with placed content);
2. **Cognos needs the page rendered/visible** for shell claims and DOM moves on that slot.

The saga dispatches ensure **without a `runId`** (decided at cross-review, option 1): `handleEnsureTabWidgetsRouted` stale-guards against `parameterSetRunId` only, and passing the saga's mutation runId would either falsely cancel (`WRITEBACK_RESTORE_CANCELLED`) or skip guarding. Payload: `{ tabId, reason: "tabsMutation" }` — idempotency via `routedTabIds`/`pendingRouteByTabId` suffices; the existing writeback path stays untouched. Successful ensure marks the slot routed via `mayMarkRouted` — no manual seeding anywhere in the mutation path. `prepareTabMutation` verifies this precondition (§2.1 point 3).

## 5. Events

None. `widgetBase` emits no new events for tab mutation; the saga's single final `tabs:changed` (`source: "tabsMutation"`) triggers the normal lazy-routing subscriber, which is a no-op on routed slots (idempotent by design).

## 6. Acceptance

1. Delete: the hidden tail's shells are parked on that same slot and left empty. Shifted content is rebuilt on the destination slot's own shells. Those shells keep the `widgetId` Cognos registered on that slot.
2. Move: zero shell creation or destruction; shells stay on the Cognos slot where they were registered; rebuilt content is what `writebackGet` shows on that slot (parent §3.8).
3. Duplicate: clones have working settings chrome (placeControls) and fresh `widgetId`s; shell exhaustion degrades per entry while the operation completes.
4. Stale `runId` at any of the three dispatches → `TABS_MUTATION_CANCELLED`, zero side effects.
5. Rollback before the physical frontier restores byte-identical widget state; after the frontier, every unrecoverable widget appears in `unrecoverable` + diagnostics.
6. No new placement variant exists: duplicate provably calls the same pipeline/effects as `handleParameterSetRestore.js` (or the convergence layer superseding it).

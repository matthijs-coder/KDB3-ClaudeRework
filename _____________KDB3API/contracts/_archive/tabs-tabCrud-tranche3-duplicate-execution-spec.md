# Execution Spec: `tabs` Tab-CRUD Tranche 3 — duplicate (shared saga + owners)

> Shell shift sentences in this historical spec are superseded by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (live 2026-10-07). Do not implement them again.

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the contracts, not here.
>
> **Scope:** tranche 3 only — `tabs/duplicate`. Delete and move behavior must remain byte-identical after this tranche. Reorder stays deferred (`tabs/reorder` → `tabs/move` per D-CRUD-4).
> **Build waves (binding):** Wave A = tabs core (duplicate plan, reducer widen, saga duplicate semantics, routing). Wave B = widgetBase placement extraction + serialization + apply widen, dienststelle duplicate apply, duplicate UI. Cross-review every file before Wave B starts; run ReadLints + line counts per file after each wave.
>
> **Architectural reference (one paragraph):** insert-after-source, reveal-tail-slot, and guards follow `tabs-tabCrud-contractdelta.md` §4.3 and PO decisions D-DUP-1..5 below; widget serialization/placement and per-entry degraded semantics follow §3.2–§3.4; filter clone semantics are in the three owner deltas §2.2. Tranche-1/2 as-built precedents: shared 9-phase saga in `runTabMutationSaga.js`, `hostResync` after `cognosSync`, final `tabs:changed` with `source: "tabsMutation"` emitted **after** lock release. UI gated by `TAB_DUPLICATE_UI_ENABLED` (flipped `true` 2026-08-14 after Cognos smoketests passed).

---

**Status:** Built 2026-08-12 (Waves A+B); cross-review passed; F2-F5 + F7 + F8 applied; Cognos smoketests passed 2026-08-14 (including layout take-fallback, rename commit-on-switch, reveal-slot activate+refreshDropboxes); `TAB_DUPLICATE_UI_ENABLED` flipped `true` 2026-08-14.
**Module / contracts:** `tabs-tabCrud-contractdelta.md` (master §2, §4.3, §5), `widgetBase-tabMutation-contractdelta.md`, `singleSelect-tabMutation-contractdelta.md`, `dienststelle-tabMutation-contractdelta.md`, `kdbControl-tabsCrud-contractdelta.md`, `messageService.md` (Approved; consumed, never modified)
**Phase:** `extension (tranche 3: duplicate)`
**Authoring AI:** Composer, 2026-08-12
**Executing AI:** `<tbd>`
**Reviewer:** PO (vastenburg) + writeback function planner (Wave B owner files)

### PO decisions (binding, approved 2026-08-12)

| ID | Decision |
|---|---|
| **D-DUP-1** | **Placement-convergence middle path (§10.1 gate waived):** the per-entry placement block of `handleParameterSetRestore.js` (`resolveDropClaim` → `takeFromLaunchpad` → colour → `dispatchRestoreContentCreate` → `dispatchWidgetSettingsPlaceControls`) is **extracted** into a shared widgetBase effect `placeSerializedWidgetEntry.js`, called by both the writebackSet restore loop (behavior-neutral refactor; contract as-built sync required) and the new duplicate apply. The shared effect takes an explicit guard descriptor (`parameterSetRunId` **or** `tabMutationRunId`); it **never** sets `runtime.parameterSetRunId` for `tabsMutation` callers. Full `completeShellPlacement` / `completePostPlacement` convergence stays backlog. |
| **D-DUP-2** | **Serialization timing:** widget serialization happens inside widgetBase `prepareTabMutation` (owner reads own state; new helper `serializeWidgetFrame.js` wraps GET's pure `buildWidgetObject.js`, callable with one frame, zero change to GET). Prepare stores `serializedEntries` (v3 `wgts` entry shape + `sourceWidgetId`) plus `expectedDegradedEntries` (shell capacity check against launchpad stock) **in widgetBase's own tabMutation snapshot bucket** (runtime, keyed by `operationId`); the duplicate apply reads them owner-locally. *Transport correction 2026-08-12 (state scan):* `tabMutationSagaSupport.dispatchOwners` discards owner results, so the saga does NOT transport entries via `runContext`; owner-local transport keeps `tabMutationSagaSupport.js` unchanged. |
| **D-DUP-3** | **Copy name:** identical to source name (legacy parity). No `"Kopie von"`. |
| **D-DUP-4** | **Landing:** stay on the source tab (legacy parity). The copy's widgets load lazily on first activation (§3.6, no render barrier). Final `tabs:changed` emit for the **current (source)** tab per D-CRUD-6. |
| **D-DUP-5** | **Zero-widget duplicate:** allowed — reveal slot + clone filters, empty widget list. |

---

## Section A. Pre-flight read list

> The executing AI **must** read each file below in order before producing any output, then echo a one-sentence summary of each (R6 enforcement).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `<echo>`
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: `<echo>`
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: `<echo>`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: `<echo>`
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: `<echo>`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: `<echo>`
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: `<echo>`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: `<echo>`
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: `<echo>`
11. `_____________KDB3API/contracts/tabs-tabCrud-contractdelta.md` — summary: `<echo>` (must mention §2.1 field table, §2.2 invariant, §2.4 MutationResult, §4.3 duplicate, §5 owner table)
12. `_____________KDB3API/contracts/widgetBase-tabMutation-contractdelta.md` — summary: `<echo>` (must mention §2.1 duplicate serialization/capacity, §2.2 restore pipeline, per-entry degraded)
13. `_____________KDB3API/contracts/singleSelect-tabMutation-contractdelta.md` + `dienststelle-tabMutation-contractdelta.md` — summary: `<echo>` (must mention §2.2 clone on duplicate; singleSelect `buildTabMutationTransfers` duplicate branch)
14. `_____________KDB3API/contracts/kdbControl-tabsCrud-contractdelta.md` — summary: `<echo>` (must mention `message.confirm`, in-flight disable, MutationResult feedback)
15. `_____________KDB3API/contracts/messageService.md` — summary: `<echo>` (must mention `ConfirmResult` fail-closed semantics; service consumed, never modified)
16. `_____________KDB3API/contracts/tabs-tabCrud-tranche2-move-execution-spec.md` — summary: `<echo>` (must mention shared saga, Wave structure, as-built precedents)
17. This execution spec itself.

First output = the 17 echoed summaries; file creation starts only after reviewer acceptance.

Reference implementations to read (patterns to copy, not modify unless listed in Section C): `tabs/actions/runTabMutationSaga.js`, `tabs/actions/tabMutationSagaSupport.js`, `tabs/actions/tabMutationMove.js`, `tabs/state/buildTabMovePlan.js`, `tabs/state/reduceTabMutationApply.js`, `tabs/state/buildTabMutationPlan.js` (`buildHideSlot` precedent for tail-slot handling), `tabs/state/reduceTabsAction.js` (`addVisibleTab` reveal precedent), `widgetBase/actions/handleParameterSetRestore.js` (placement block to extract), `widgetBase/actions/handlePrepareTabMutation.js`, `widgetBase/actions/handleApplyTabMutation.js`, `core/services/writeback/get/collectors/buildWidgetObject.js` + `collectWidgets.js`, `filters/dienststelle/actions/applyTabMutationScopeOps.js` (`writeScopeFromSnapshot`), `filters/singleSelect/actions/buildTabMutationTransfers.js` (duplicate branch), `tabs/effects/tabEditIconActions.js`, `tabs/effects/confirmAndDispatchTabMove.js`, `tabs/config/defaults.js`.

---

## Duplicate plan shape (`buildTabDuplicatePlan.js`)

Pure builder entry `buildTabDuplicatePlan(_state, _request)` for `_request = { operation: "duplicate", tabIndex | tabId, source }`.

### Guards

1. Contiguous-prefix precondition via `readContiguousPrefixError` (shared with delete/move).
2. Source resolves to a visible dashboard tab (`!isHelper`, `visible === true`).
3. `countVisible(slots) === limits.maxUserTabs` → `{ ok: false, errorCode: TABS_MAX_VISIBLE }` (no hidden slot to reveal).

### Frozen plan fields

| Field | Semantics |
|---|---|
| `operation` | `"duplicate"` |
| `operationId` | unique string (`tabmut-<ts>-<n>`) |
| `sourceSlot` | `{ tabIdx, index, tabId }` — tab to copy |
| `revealSlot` | first hidden dashboard slot (`visible !== true`); becomes visible at commit; `tabIdx === countVisible` before mutation |
| `insertSlot` | `{ tabIdx: sourceTabIdx + 1, index, tabId }` — physical slot receiving the copy |
| `slotMoves` | descending shift-right pairs from `insertSlot.tabIdx` through last visible (`countVisible - 1`), each `{ fromIndex, fromTabId, fromTabIdx, toIndex, toTabId, toTabIdx }`; final pair moves last visible content into `revealSlot` |
| `names.byIndexAfter` | physical-index map: shifted slots get pre-mutation names from their `from` sources; `insertSlot.index` gets **source name** (D-DUP-3); `revealSlot.index` gets the name that occupied the last visible slot before shift |
| `clonePair` | `{ from: sourceSlot, to: insertSlot }` — clone source for filter owners and widget creation. NOTE: `clonePair` comes **in addition to** the `slotMoves` shifts — displaced content (filters AND widgets of every slot right of the source) follows `slotMoves` exactly like a move; only the copy itself is produced from `clonePair`. |
| `landing` | `sourceSlot` frozen copy (D-DUP-4) |
| `affectedTabIds` | union of `sourceSlot.tabId`, `insertSlot.tabId`, `revealSlot.tabId`, and every `fromTabId`/`toTabId` in `slotMoves` |

**Example:** 4 visible `[A,B,C,D]`, hidden `E`. Duplicate `B` (`sourceTabIdx=1`): `insertSlot=2`, `slotMoves` descending `[{D→E},{C→D}]` (last visible first; reducer is snapshot-first so order is safety, not correctness), copy name at slot 2 = `B.name`, `revealSlot=E`, `landing=B`. Edge: duplicating the LAST visible tab yields `insertSlot === revealSlot`, `slotMoves = []` — coherent by construction.

**Zero-widget (D-DUP-5):** same plan; `serializedEntries` may be `[]`; filter clone + slot shift still run.

---

## Phase-by-phase table (duplicate vs move)

| Phase | Owner(s) | Duplicate behavior | Delta vs move |
|---|---|---|---|
| 1 **plan** | tabs | `buildTabDuplicatePlan`; abort on `TABS_MAX_VISIBLE` | insert+reveal vs rotation; adds `revealSlot`, `insertSlot`, `clonePair` |
| 2 **slotReadiness** | tabs | `ensureSlotReadyForMutation` for all `affectedTabIds` incl. revealed tail | same machinery; more affected slots |
| 3 **scopeResolve** | tabs | `tabs/resolveFilterScopeTargets` → `runContext.tabTargets` | unchanged |
| 4 **prepare** | widgetBase, singleSelect, dienststelle | widgetBase: snapshot + **serialize source-tab onCanvas frames** → `serializedEntries` + `expectedDegradedEntries`; route check on `insertSlot`/`revealSlot`/`slotMoves.toTabId` | move: snapshot only; dup adds serialization + capacity forecast |
| 5 **filterApply** | singleSelect, dienststelle | snapshot-sourced **shift transfers per `slotMoves`** (descending; displaced tabs' values move right, exactly like move) **plus the clone transfer** `clonePair.from → clonePair.to`; **no clears** — the source scope keeps its values and every target is overwritten from snapshot | move: rotation transfers + no net new scope; dup: extra clone transfer, source untouched, revealed tail scope written |
| 6 **widgetApply** | widgetBase | first **shift displaced widgets per `slotMoves`** (descending park/take, preserving widgetIds — same machinery as move), then per `serializedEntry`: `placeSerializedWidgetEntry` on `insertSlot.tabId` with fresh `widgetId`; creation failures → `degradedEntries`, **continue** | move: park/take only; dup: park/take shifts + create pipeline for the copy; **saga exception:** `ok:true` + `degradedEntries` unless structural throw |
| 7 **commit** | tabs reducer | duplicate branch: snapshot-first apply `slotMoves` (shift right), set `revealSlot.visible=true`, name at insert = source name, `landing=sourceSlot`; postcondition `visibleCountAfter === visibleCountBefore + 1` | move: same visible set; dup: +1 visible |
| 8 **cognosSync** | tabs effect | `applyTabMutationToCognos` + `syncTabsDomFromState` over `names.byIndexAfter` + visibility | unchanged |
| 9 **hostResync** | singleSelect, dienststelle | re-push all affected scopes incl. **new tab's scope** (`insertSlot`) | move: rotation scopes only |
| 10 **finalize** | tabs saga | `guardTabMutation.release` → `emitFinalTabsChanged` for **source** landing tab | move: content-following landing |

---

## Rollback semantics

| Failure point | Behavior |
|---|---|
| Before **widgetApply** (plan → filterApply) | Cheap rollback: `restoreTabMutationSnapshot` per owner from prepare snapshots; `abortOnOriginalTab`; dashboard byte-identical. |
| During **widgetApply** — shift (park/take) failure | Structural, still pre-frontier for creation: abort + rollback via prepare snapshots (same as move). |
| During **widgetApply** — per-entry shell/content failure of the COPY | **Committed degraded outcome** (§3.4): entry recorded in `degradedEntries`; saga continues; **no rollback** for missing copy widgets. MutationResult `outcome: "degraded"` when any `degradedEntries` or `expectedDegradedEntries` realized. |
| During **widgetApply** — structural/unexpected throw | Abort + best-effort `rollbackOwners` (park created shells back to launchpad where possible); honest `TABS_MUTATION_ROLLBACK_INCOMPLETE` diagnostics. |
| **commit** failure (postcondition) | `rollbackOwners` all three owners. **Best-effort undo:** widgets created in widgetApply → route to launchpad via `restoreTabMutationSnapshot` physical path; filter clone on insert scope cleared; tabs state unchanged (reducer returned error). Document diagnostics; residual widgets on launchpad acceptable with `ROLLBACK_INCOMPLETE`. |
| After **commit** (`cognosSync`, `hostResync`) | Non-fatal degrade only; committed state stands (tranche-2 precedent). |

---

## Section B. Folder tree (creation order; existing files marked MODIFY)

```
--- WAVE A (tabs core) ---
KDB3/js/dashboard/tabs/
  actions/tabMutationDuplicate.js          (NEW: thin duplicate wrapper, ≤150, expect ~60)
  actions/runTabMutationSaga.js            (MODIFY: duplicate widgetApply degraded semantics only — no entry transport)
  actions/routeTabMutationAction.js        (MODIFY: route DUPLICATE)
  state/buildTabDuplicatePlan.js           (NEW: pure duplicate plan builder, ≤150)
  state/tabMutationPostconditions.js       (NEW: passesPostcondition extracted from reducer + duplicate check, ≤100)
  state/reduceTabMutationApply.js          (MODIFY: duplicate commit branch; postcondition via extracted helper — file is 120/130 pre-edit)
  createTabsController.js                  (MODIFY: remove DUPLICATE from isDeferredAction)

--- WAVE B (owners + UI + writeback refactor) ---
KDB3/js/dashboard/widgets/widgetBase/
  effects/placeSerializedWidgetEntry.js    (NEW: shared placement effect, ≤150)
  actions/serializeWidgetFrame.js          (NEW: per-frame v3 serializer helper, ≤150)
  actions/handleParameterSetRestore.js     (MODIFY: call placeSerializedWidgetEntry per entry)
  actions/handlePrepareTabMutation.js      (MODIFY: duplicate serialization + capacity)
  actions/handleApplyTabMutation.js        (MODIFY: duplicate branch via placeSerializedWidgetEntry)

KDB3/js/core/services/writeback/get/collectors/
  buildWidgetObject.js                     (UNCHANGED — stays the single pure builder; serializeWidgetFrame wraps it)
  collectWidgets.js                        (UNCHANGED — zero GET risk; correction 2026-08-12 after state scan)

KDB3/js/dashboard/filters/dienststelle/
  actions/applyTabMutationDuplicate.js     (NEW: clone via writeScopeFromSnapshot, ≤150)
  actions/applyTabMutation.js              (MODIFY: route duplicate → applyTabMutationDuplicate)

KDB3/js/dashboard/filters/singleSelect/
  actions/buildTabMutationTransfers.js     (MODIFY: accept plan.clonePair.to / plan.insertSlot as clone target — verify only if not already matched)

KDB3/js/dashboard/tabs/
  effects/confirmAndDispatchTabDuplicate.js (NEW: confirm flow + dispatch, ≤100)
  effects/tabEditIconActions.js            (MODIFY: duplicate enablement + handler)
  config/defaults.js                       (MODIFY: TAB_DUPLICATE_UI_ENABLED + German copy)
```

**UNCHANGED (do not edit):** `guardTabMutation.js`, `buildMutationResult.js`, `dispatchOwnerTabMutation.js`, `ensureSlotReadyForMutation.js`, `applyTabMutationToCognos.js`, `syncTabsDomFromState.js`, `tabMutationSagaSupport.js` (unless line-budget forces one helper extraction), `singleSelect` apply stack beyond `buildTabMutationTransfers` clone-target aliases, `followActiveTab.js` / subscriber suppression predicates.

**Doc-sync (same PR or immediate follow-up, PO-mandated):**
- `contracts/widgetBase-tabMutation-contractdelta.md` — as-built note: D-DUP-1 middle-path placement extraction; §10.1 gate waived for tranche 3.
- `contracts/tabs-tabCrud-contractdelta.md` §11 — add item 7: this execution spec.
- `contracts/widgetBase-parameterSetRestore-contractdelta.md` — as-built: restore loop delegates per-entry placement to `placeSerializedWidgetEntry.js` (behavior-neutral).
- `architecture/eventSubscribe.md` — duplicate uses same finalize emit path (no new event).

---

## Section C. Per-file specifications

> Every file: full-compact AMD `define([...], function (...) { ... })`; named helpers at factory scope only; executable JS ≤150 lines; `Rules to apply` verified before completion. Shared payload convention (master delta §3.7): every owner dispatch carries `{ runId, operationId, source: "tabsMutation", skipHistory: true }`.

#### `tabs/state/buildTabDuplicatePlan.js` (NEW)

- **Role:** pure duplicate plan builder (D-DUP-3..5). **Lines:** ≤150.
- **Imports:** `mutationCodes.js`, `buildTabMutationPlan.js` (`countVisible`, `readContiguousPrefixError`), `listDashboardSlots.js`.
- Implement guards and frozen plan per **Duplicate plan shape** section above.
- `slotMoves` built **descending** `fromTabIdx` (last visible → reveal first) for snapshot-first reducer safety.
- **Rules:** `state.mdc` (pure), `naming.mdc`, `amd.mdc`.

#### `tabs/actions/tabMutationDuplicate.js` (NEW)

- **Role:** thin duplicate wrapper (mirror `tabMutationMove.js`). **Lines:** ≤150 (expect ~60).
- Entry `handleTabMutationDuplicate(_ctx, _action)`: `guardTabMutation.acquire` → `runTabMutationSaga(..., { buildPlan: buildDuplicatePlan })` → register/release.
- **Rules:** `error-handling.mdc`, `feature-structure.mdc`.

#### `tabs/actions/runTabMutationSaga.js` (MODIFY)

- **Role:** shared saga — add duplicate-only widgetApply gate. **Lines:** ≤150 (52 pre-edit).
- NO entry transport (D-DUP-2 correction): serialized entries live in widgetBase's own snapshot bucket; the saga passes only the usual envelope.
- **widgetApply gate (duplicate exception):** if `plan.operation === "duplicate"` and the widgetApply result has `ok === true` with `degradedEntries.length > 0`, phase = `degraded` (not `failed`); do **not** rollback. Only `ok === false` (structural) triggers rollback.
- `buildMutationResult` (verify, likely unchanged): degraded phase + successful commit already resolves to `outcome: "degraded"` per §2.4 as-built.
- **Rules:** `error-handling.mdc`, `events.mdc`.

#### `tabs/state/tabMutationPostconditions.js` (NEW)

- **Role:** `passesPostcondition(byIndex, state, plan)` extracted verbatim from `reduceTabMutationApply.js` (file is 120/130 pre-edit) + new duplicate check. **Lines:** ≤100.
- Duplicate check: `visibleCountAfter === visibleCountBefore + 1`, contiguous prefix intact, `revealSlot` now visible.
- **Rules:** `state.mdc` (pure), `naming.mdc`.

#### `tabs/state/reduceTabMutationApply.js` (MODIFY)

- **Role:** pure reducer widen for duplicate. **Lines:** ≤130 after postcondition extraction.
- **`operation === "duplicate"` branch:** snapshot-first apply descending `slotMoves` (shift right); then apply `names.byIndexAfter` (NOTE: delete flows names via slotMove copies + `hideSlot.baselineName`; move also applies `names.byIndexAfter` as of 2026-08-13 — duplicate must additionally write the copy name at `insertSlot.index` and the reveal name); set `revealSlot` `visible: true` + button visible (mirror `addVisibleTab` in `reduceTabsAction.js`); `landing` from plan (`sourceSlot`); `isActive` on landing index only.
- Postcondition via extracted `tabMutationPostconditions.js`.
- Delete/move paths unchanged (behavior-identical after extraction).
- **Rules:** `state.mdc`, `naming.mdc`.

#### `widgetBase/actions/serializeWidgetFrame.js` (NEW)

- **Role:** per-frame serializer WRAPPER (correction 2026-08-12: GET stays untouched). **Lines:** ≤100.
- Entry `serializeWidgetFrame(_KDB, _frame, _tabIdx)` → v3 `wgts` entry object or `null` + diagnostic; code-only (no langtext/url/display/metricsTable persistence).
- Implementation: gathers the per-widget records from the other owners via their PUBLIC APIs (`_KDB.api.widgetSettings/.widgetVis/.widgetText.getState()` — same sources `collectWidgets.js` uses) and delegates to the existing pure `core/services/writeback/get/collectors/buildWidgetObject.js` via AMD import (dashboard → core import of a pure function; no state, no service coupling). GET collector and `buildWidgetObject` remain byte-identical.
- Writeback planner sign-off covers this import direction; record as-built in `widgetBase-tabMutation-contractdelta.md`.
- **Rules:** `state.mdc`, `amd.mdc`.

#### `widgetBase/effects/placeSerializedWidgetEntry.js` (NEW)

- **Role:** shared per-entry placement (D-DUP-1). **Lines:** ≤150.
- Entry `placeSerializedWidgetEntry(_context, _entry, _targetTabId, _options)` where `_options = { guard: { kind: "parameterSetRunId"|"tabMutationRunId", runId }, reason, source, skipHistory, isHistoryReplay }`.
- Pipeline: `resolveDropClaim` → `takeFromLaunchpad` → colour (vis) → `dispatchRestoreContentCreate` → `dispatchWidgetSettingsPlaceControls`.
- Guard checks appropriate runtime key; **never** assigns `runtime.parameterSetRunId` when `guard.kind === "tabMutationRunId"`.
- Return `{ ok, widgetId?, degraded?, diagnostics }` per entry.
- **Rules:** `error-handling.mdc`, `feature-structure.mdc`.

#### `widgetBase/actions/handlePrepareTabMutation.js` (MODIFY)

- **Role:** widen for duplicate. **Lines:** ≤150.
- **Duplicate path:** enumerate onCanvas frames on `plan.sourceSlot.tabId`; `serializeWidgetFrame` each → `serializedEntries: Array<{ sourceWidgetId, entry }>`; count launchpad shells per kind vs frame count → `expectedDegradedEntries`. Store both **in the own prepare snapshot bucket** (keyed by `operationId`, alongside the frame snapshots — D-DUP-2 correction); the return keeps `{ ok, snapshotWidgetIds, expectedDegradedEntries }` for diagnostics only.
- Route readiness: all `slotMoves.toTabId` + `insertSlot.tabId` + `revealSlot.tabId` must be routed (extend current `toTabId` check).
- Delete/move paths unchanged.
- **Rules:** `error-handling.mdc`.

#### `widgetBase/actions/handleApplyTabMutation.js` (MODIFY)

- **Role:** widen to delete|move|duplicate. **Lines:** ≤150.
- **Duplicate path:** (1) shift displaced widgets per `plan.slotMoves` (descending park/take from prepare snapshot, preserving widgetIds — reuse the in-file `applyMoveSnapshotFirst` machinery); (2) read `serializedEntries` from widgetBase's OWN prepare snapshot bucket (keyed by `operationId` — D-DUP-2 correction); for each entry call `placeSerializedWidgetEntry` targeting `plan.insertSlot.tabId`; collect `created` correlation + `degradedEntries`; return `{ ok: true, degradedEntries, ... }` even when some entries failed (per-entry catch). Shift failures are structural (rollbackable, pre-frontier); creation failures are per-entry degraded.
- Structural failure (guard stale, missing `insertSlot`, missing snapshot, shift failure) → `{ ok: false }`.
- **Rules:** `error-handling.mdc`.

#### `widgetBase/actions/handleParameterSetRestore.js` (MODIFY)

- **Role:** behavior-neutral refactor. **Lines:** ≤150 (may require moving helpers out).
- Replace inline per-entry placement loop body with `placeSerializedWidgetEntry` calls (`guard.kind: "parameterSetRunId"`).
- GET/smoketest parity required before Wave B gate closes.
- **Rules:** `error-handling.mdc`.

#### `dienststelle/actions/applyTabMutationDuplicate.js` (NEW)

- **Role:** duplicate-only filter apply. **Lines:** ≤150.
- (1) Shift writes per `plan.slotMoves` (descending): `writeScopeFromSnapshot` of each `from` scope's prepare-snapshot entries onto the `to` scope — **no clears**, every target overwritten from snapshot (mirror of `applyTabMutationMove.js` minus the source clears).
- (2) Clone write: resolve `fromScopeId` / `toScopeId` from `plan.clonePair` + `tabIdxToScopeId`; `writeScopeFromSnapshot` onto the insert scope (`applyTabMutationScopeOps.js`); source untouched.
- **Rules:** `error-handling.mdc`.

#### `filters/singleSelect` — `buildTabMutationTransfers.js` (MODIFY)

- **As-built duplicate branch** currently sets `transfers = [clonePair]` only and `clearSlots = []` — that is INCOMPLETE for the shift-right model: it must become `transfers = slotMoves pairs (descending) + clonePair`, `clearSlots = []` (all targets are overwritten from snapshot; the source keeps its values).
- **`readDuplicatePair` expects:** `from` = `plan.sourceSlot` | `plan.clonePair.from`; `to` = `plan.insertSlot` | `plan.clonePair.to` | `plan.targetSlot` | `plan.newSlot`. Spec plan provides `sourceSlot`, `insertSlot`, `clonePair` — extend `readDuplicatePair` only if `insertSlot`/`clonePair.to` not yet read (verify at build time).
- Dienststelle mirrors the same rule in `applyTabMutationDuplicate.js`: shift writes per `slotMoves` (snapshot-sourced, no clears) plus the clone write.
- **Rules:** `amd.mdc`.

#### `tabs/effects/confirmAndDispatchTabDuplicate.js` (NEW)

- **Role:** effect (mirror `confirmAndDispatchTabDelete.js`). **Lines:** ≤100.
- In-flight guard → `TAB_DELETE_CONFLICT_TEXT`; `message.confirm` unavailable → fail-closed `console.warn`.
- `await svc.confirm({ code: "TABS_DUPLICATE_CONFIRM", title: TAB_DUPLICATE_CONFIRM_TITLE, message: TAB_DUPLICATE_CONFIRM_TEXT })` — legacy parity: `"Diese Registerkarte duplizieren?"`.
- On confirm: `tabs/duplicate` dispatch `{ tabIndex, tabId, source: "tabsEditUi" }`.
- Surface `TABS_MAX_VISIBLE`, conflict, degraded (`TAB_MUTATION_DEGRADED_TEXT`), failure (`TAB_DUPLICATE_FAILED_TITLE`).
- **Rules:** `dom.mdc`, `error-handling.mdc`.

#### `tabs/effects/tabEditIconActions.js` (MODIFY)

- Add duplicate enablement: `cfg.key === "duplicate" && TAB_DUPLICATE_UI_ENABLED === true && !isTabMutationInFlight`.
- Bind `confirmAndDispatchTabDuplicate` on duplicate icon click.
- **Rules:** `dom.mdc`, `error-handling.mdc`.

#### `tabs/config/defaults.js` (MODIFY)

- Add `TAB_DUPLICATE_UI_ENABLED: false`.
- `TAB_DUPLICATE_CONFIRM_TITLE`: `"Diese Registerkarte duplizieren?"` (legacy parity — title carries the question).
- `TAB_DUPLICATE_CONFIRM_TEXT`: brief consequence text (German).
- `TAB_DUPLICATE_FAILED_TITLE`: `"Registerkarte duplizieren fehlgeschlagen"`.
- Reuse `TAB_DELETE_CONFLICT_TEXT`, `TAB_MUTATION_DEGRADED_TEXT`.
- **Rules:** `naming.mdc`, `amd.mdc`.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `tabs/tabMutationApply` | saga phase 7 (commit) | **duplicate:** snapshot-first shift-right per `slotMoves`; reveal tail slot; copy name at insert; landing `isActive` on source; postcondition visible count +1 | none |

`reduceTabsAction` `DUPLICATE` case stays no-op (commit via `TAB_MUTATION_APPLY` only).

## Section E. Published selectors

None new.

## Section F. Public API wiring

`tabs/duplicate` payload: `{ tabIndex (0-based tabIdx), tabId?, source }`. No `targetPosition` (insert is always `sourceTabIdx + 1`).

## Sections G/H/I. Harness

Not applicable — Cognos smoketests below.

## Section J. Acceptance criteria (self-verification)

1. All Wave A/B files per Section B; line counts ≤150; ReadLints clean per wave.
2. Delete + move regression smoketests unchanged after Wave A.
3. Duplicate middle tab with widgets+filters: copy at `source+1`, source name on copy, filters cloned, widgets on copy after first activation.
4. `countVisible === maxUserTabs` → `outcome: "aborted"`, `TABS_MAX_VISIBLE`.
5. Zero-widget tab duplicates: visible count +1, filters cloned, no widget errors.
6. Shell exhaustion → `outcome: "degraded"`, `degradedEntries` populated, tab layout still commits.
7. Forced per-entry widget failure → degraded committed (no full rollback).
8. `writebackGet` consistent (§3.8) including degraded runs.
9. Exactly one `tabs:changed` (`source: "tabsMutation"`) for **source** tab; user stays on source.
10. Move/delete copy afterwards works (no stale scope or widget corruption).
11. `handleParameterSetRestore` GET parity after placement extraction (writeback planner sign-off).

## Section K. Forbidden actions

Template list applies; additionally: do not modify contract deltas or `messageService.md` during implementation PR (doc-sync is separate); do not implement `tabs/reorder`; do not add render barrier; do not emit history frames (D-CRUD-2); do not implement plain page-context **normale filters** clone (see Open items); do not set `runtime.parameterSetRunId` from tab-mutation placement; do not add `"Kopie von"` prefix.

## Section L / M. Reporting & reviewer handoff

Template sections apply. Wave B requires writeback function planner sign-off on `serializeWidgetFrame`, `placeSerializedWidgetEntry`, and GET collector refactor.

---

## Smoketests (console-first, then UI after flag flip)

**Console-first (Wave A, `TAB_DUPLICATE_UI_ENABLED` stays `false`):**

```js
// Helpers: countVisible, writebackGet, read active tabIdx
await _KDB.api.tabs.dispatch({ type: "tabs/duplicate", payload: { tabIndex: 1, source: "smoketest" } }); // middle tab
// Pre-fill max visible tabs, then:
await _KDB.api.tabs.dispatch({ type: "tabs/duplicate", payload: { tabIndex: 0, source: "smoketest" } }); // → TABS_MAX_VISIBLE abort
await _KDB.api.tabs.dispatch({ type: "tabs/duplicate", payload: { tabIndex: 2, source: "smoketest" } }); // zero-widget tab
```

Per successful duplicate verify:
- Layout: visible count +1; copy immediately right of source; tail slot revealed.
- Names: copy name === source name (not prefixed).
- Landing: active tab unchanged (source); `tabs:changed` references source slot.
- Filters: `filt.sels[].tab` / `filt.dstl.byTab` show clone values on new index; source unchanged.
- Widgets: onCanvas count on source unchanged; copy widgets appear after first activation of new tab.
- GET consistency after duplicate (§3.8).
- Shell exhaustion: park all but one shell, duplicate widget-heavy tab → `degraded` + diagnostics, layout still committed.
- Forced widgetBase entry throw (test hook) → full rollback if structural; per-entry fail → degraded committed.
- Follow-up: `tabs/move` then `tabs/delete` on the copy — no corruption.

**UI (after `TAB_DUPLICATE_UI_ENABLED: true`, Wave B):**
- Duplicate icon enabled in rename session; confirm `"Diese Registerkarte duplizieren?"`; confirm executes duplicate.
- Icons disabled during in-flight mutation; `TABS_MAX_VISIBLE` / conflict / degraded / failure surfacing per `confirmAndDispatchTabDuplicate.js`.

---

## Wave execution checklist

| Step | Action |
|---|---|
| 0 | **Prerequisite:** singleSelect popup re-arm fix landed 2026-08-12 — Cognos hertest must pass (see Open items) |
| 1 | Wave A: `buildTabDuplicatePlan`, `tabMutationDuplicate`, saga duplicate semantics, reducer, routing |
| 2 | Wave A gate: delete + move regression; line counts + ReadLints |
| 3 | Cross-review Wave A (tabs planner + PO) |
| 4 | Wave B: placement extraction, serialization, widgetBase/dienststelle apply, GET refactor, duplicate UI |
| 5 | Wave B gate: console smoketests; restore GET parity; line counts + ReadLints |
| 6 | Cross-review Wave B (writeback planner sign-off) |
| 7 | Cognos end-to-end → flip `TAB_DUPLICATE_UI_ENABLED: true` |
| 8 | Doc-sync per Section B list |

---

## Open items

| Item | Status | Notes |
|---|---|---|
| **singleSelect popup re-arm regression fix** | **Landed 2026-08-12 — Cognos hertest pending** | `restorePopupSelection` liveness check + `forceFreshPopupMount` widening + `resyncTabMutationHost` domRefs clear. Build starts after the hertest passes. |
| **Normale filters** (plain page-context filters outside singleSelect/dienststelle owners) | **KNOWN GAP — separate track, PO-sequenced** | PO approved option A (new `filters/pageContextPlain` owner) on 2026-08-12, to be built AFTER the move-UI flip and tranche 3. See `futureTodo/pageContextPlain-filter-owner-backlog.md`. Until then plain filter values stay on the physical slot during mutations (accepted). |
| `completeShellPlacement` / `completePostPlacement` full convergence | Backlog | D-DUP-1 middle path is sufficient for tranche 3; full convergence remains future work. |
| `specialSingleSelect` | Out of scope | Unless already handled by singleSelect owner clone path; no separate tranche-3 work. |

---

## As-built notes

- **Wave A:** `buildTabDuplicatePlan.js`, `tabMutationPostconditions.js` (`passesPostcondition` extracted from reducer + duplicate visible-count check), `tabMutationDuplicate.js`, duplicate branch in `reduceTabMutationApply.js`, duplicate degraded `widgetApply` gate in `runTabMutationSaga.js`, routing in `routeTabMutationAction.js`; `DUPLICATE` removed from `isDeferredAction`.
- **Wave B — widgetBase:** `placeSerializedWidgetEntry.js` (D-DUP-1 shared placement; guard `parameterSetRunId`|`tabMutationRunId`; §10.1 middle-path waiver); `serializeWidgetFrame.js` (AMD path `../../../../core/.../buildWidgetObject.js` — 4× `../`); `applyTabMutationDuplicate.js` (`applyMoveSnapshotFirst` relocated here, shared by move/delete via imports); `parkCreatedWidgetsForRollback.js`; prepare stores `serializedEntries` + `expectedDegradedEntries` in owner-local snapshot bucket (D-DUP-2 transport correction); `handleParameterSetRestore.js` behavior-neutral delegation.
- **Wave B — filter owners:** `dienststelle/applyTabMutationDuplicate.js` (shift-writes + clone, no clears); `singleSelect/buildTabMutationTransfers.js` (`slotMoves` + `clonePair`, `clearSlots: []`).
- **Wave B — UI:** `confirmAndDispatchTabDuplicate.js` — PO decision D-DUP-confirm: `message.confirm` (`"Diese Registerkarte duplizieren?"`) contrary to earlier single-click line; `tabEditIconActions.js` duplicate behind `TAB_DUPLICATE_UI_ENABLED: false`.
- **F8 — smoketest correction 2026-08-12 (duplicate content-fill):** Cognos smoketest finding: duplicated txt widget showed the default text (vis clones likewise unbound). Root cause: duplicate apply ran only per-entry placement (`placeSerializedWidgetEntry`), never restore steps 25-27 (widgetSettings batch, widgetText restore, widgetVis binding). Fix: new `widgetBase/effects/fillDuplicateWidgetContent.js` (compacted `widgets` + `widgetCorrelation` over successfully created clones; fresh `parameterSetRestoreRunId` from the canonical writeback allocator; `source: "tabsMutation"`; degraded-only failures) called from `applyTabMutationDuplicate.js` after the placement loop behind a staleness re-check.
- **2026-08-13 — reveal-slot shift-take layout fix:** `ensureRevealTakeTarget.js` (extracted helper) — before `takeWidget` onto `revealSlot`, activate hidden tail via `tabs/traverse` + `refreshDropboxes` (widgetApply runs before reducer reveal; tabMutation suppresses `subscribeTabsChangedRebind`).

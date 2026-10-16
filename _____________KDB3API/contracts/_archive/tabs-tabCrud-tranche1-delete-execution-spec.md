# Execution Spec: `tabs` Tab-CRUD Tranche 1 — delete (saga + owners)

> Shell shift sentences in this historical spec are superseded by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (live 2026-10-07). Do not implement them again.

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the contracts, not here.
>
> **Scope:** tranche 1 only — `tabs/delete`. Move/duplicate are out of scope (their handlers stay deferred).
> **Build waves (binding, D-CRUD-8):** Wave 1 = tabs + widgetBase + edit-UI wiring, buildable immediately. Wave 2 = singleSelect + dienststelle handlers — **D-CRUD-8 lifted 2026-08-10**; singleSelect Wave-2 files exist and are to be synced, dienststelle still to build. Tranche 1 is shippable/smoketestable end-to-end only after Wave 2; until then a `tabs/delete` dispatch aborts at prepare with an honest `TABS_MUTATION_PREPARE_FAILED` (filter owners return `false` for unknown types).

---

**Status:** `Ready for execution (Wave 1) — cross-review corrections A–E incorporated + messageService integration synced 2026-07-15; Wave 2 buildable since 2026-08-10 (D-CRUD-8 lifted); Wave-2 sync amendments by tabs planner 2026-08-10: tabTargets value shape pinned, slotMoves tabIdx fields, saga preamble, dienststelle reconcile deferral, singleSelect sync scope (identity §12 rework stays with the identity track)`
**Module / contracts:** `tabs-tabCrud-contractdelta.md` (master), `widgetBase-tabMutation-contractdelta.md`, `singleSelect-tabMutation-contractdelta.md`, `dienststelle-tabMutation-contractdelta.md`, `kdbControl-tabsCrud-contractdelta.md`, `messageService.md` (Approved; consumed, never modified)
**Phase:** `extension (tranche 1: delete)`
**Authoring AI:** Fable 5, 2026-07-14 (rev. 2026-07-15)
**Executing AI:** `<tbd>`
**Reviewer:** PO (vastenburg) + writeback function planner (Wave 2 files)

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
11. `_____________KDB3API/contracts/tabs-tabCrud-contractdelta.md` — summary: `<echo>` (must mention §2.1 field table, §2.2 invariant, §2.4 MutationResult, §4.1 landing rule)
12. `_____________KDB3API/contracts/widgetBase-tabMutation-contractdelta.md` — summary: `<echo>` (must mention the §4 precondition: activate + ensure **without runId**; the re-park hazard was rejected — `isOwnedWidget` prevents it; no `routedTabIds` writes from mutation code)
13. `_____________KDB3API/contracts/singleSelect-tabMutation-contractdelta.md` + `dienststelle-tabMutation-contractdelta.md` — summary: `<echo>` (must mention the D-CRUD-8 build gate)
14. `_____________KDB3API/contracts/kdbControl-tabsCrud-contractdelta.md` — summary: `<echo>` (must mention awaited `message.confirm` + fail-closed)
15. `_____________KDB3API/contracts/messageService.md` — summary: `<echo>` (must mention `ConfirmResult` fail-closed semantics and that the service is consumed, never modified)
16. This execution spec itself.

First output = the 16 echoed summaries; file creation starts only after reviewer acceptance.

Reference implementations to read (patterns to copy, not modify): `tabs/actions/routeParameterSetAction.js`, `tabs/actions/guardParameterSetRun.js`, `tabs/actions/parameterSetActivateTab.js`, `widgetBase/actions/handleEnsureTabWidgetsRouted.js`, `widgetBase/actions/handleRouteToLaunchpad.js`, `widgetBase/actions/handleTakeFromLaunchpad.js`, `singleSelect/actions/parameterSetRuntime.js`.

---

## Section B. Folder tree (creation order; existing files marked MODIFY)

```
KDB3/js/dashboard/tabs/
  config/actionTypes.js                      (MODIFY: +TAB_MUTATION_APPLY)
  config/mutationCodes.js                    (NEW)
  state/buildTabMutationPlan.js              (NEW, pure)
  state/buildMutationResult.js               (NEW, pure)
  state/reduceTabMutationApply.js            (NEW, pure)
  state/reduceTabsAction.js                  (MODIFY: +1 case)
  actions/guardTabMutation.js                (NEW)
  actions/tabMutationDelete.js               (NEW)
  actions/routeTabMutationAction.js          (NEW)
  effects/ensureSlotReadyForMutation.js      (NEW)
  effects/applyTabMutationToCognos.js        (NEW)
  effects/dispatchOwnerTabMutation.js        (NEW)
  effects/confirmAndDispatchTabDelete.js     (NEW, conditional: only if renderTabEditIcons.js would exceed 150 lines)
  effects/renderTabEditIcons.js              (MODIFY: enable delete via message.confirm)
  config/defaults.js                         (MODIFY: +3 German copy constants)
  createTabsController.js                    (MODIFY: route DELETE, keep MOVE/DUPLICATE/REORDER deferred)

KDB3/js/dashboard/widgets/widgetBase/
  config/actionTypes.js                      (MODIFY: +3 types)
  state/ensureWidgetBaseRuntime.js           (MODIFY: +tabMutationSnapshots, tabMutationRunId)
  effects/cleanupWidgetRuntime.js            (MODIFY: clear new buckets)
  actions/tabMutationSupport.js              (NEW: guard + snapshot helpers)
  actions/handlePrepareTabMutation.js        (NEW)
  actions/handleApplyTabMutation.js          (NEW, delete-only)
  actions/handleRestoreTabMutationSnapshot.js (NEW)
  createWidgetBaseController.js              (MODIFY: +3 routes)

KDB3/js/dashboard/canvas/kdbControl/framework/
  followActiveTab.js                         (MODIFY: suppression predicate +tabMutation)
KDB3/js/dashboard/widgets/widgetBase/effects/
  subscribeTabsChanged.js                    (MODIFY: suppression predicate +tabMutation)
KDB3/js/dashboard/canvas/dragDrop/dropboxes/
  subscribeTabsChangedRebind.js              (MODIFY: suppression predicate +tabMutation)

--- WAVE 2 (BUILT; as-built frame recorded at cross-review 2026-08-10 — supersedes the original mechanical frame below) ---
KDB3/js/dashboard/filters/singleSelect/
  config/actions.js                          (MODIFY: +3 types)
  actions/tabMutationSupport.js              (NEW: guard/scope/matching/snapshot-clone; runtime keys seeded in effects/ensureSingleSelectRuntime.js, cleared in effects/guardInteractionFreshness.js)
  actions/prepareTabMutation.js              (NEW)
  actions/applyTabMutation.js                (NEW, delete-only)
  actions/applyTabMutationWrites.js          (NEW: host write/verify primitives)
  actions/buildTabMutationTransfers.js       (NEW: plan → transfers/clearSlots)
  actions/restoreTabMutationSnapshot.js      (NEW)
  actions/resolveTabMutationSnapshotTarget.js (NEW: id-match + semantic remount fallback)
  actions/handleTabMutationAction.js         (NEW: thin router)
  actions/dispatchSingleSelectAction.js      (MODIFY: route 3 types, Promise-returning)
KDB3/js/dashboard/filters/dienststelle/
  config/actions.js                          (MODIFY: +3 types)
  actions/tabMutationSupport.js              (NEW: guard + scope resolve via restoreSupport.resolveScopeId; runtime keys in effects/ensureDienststelleRuntime.js)
  actions/prepareTabMutation.js              (NEW)
  actions/applyTabMutation.js                (NEW, delete-only)
  actions/restoreTabMutationSnapshot.js      (NEW)
  actions/handleTabMutationAction.js         (NEW: thin router)
  createDienststelleController.js            (MODIFY: route 3 types)
```

> Naming note (cross-review 2026-08-10): the as-built files use `prepareTabMutation.js`/`applyTabMutation.js`/`restoreTabMutationSnapshot.js` and `tabMutationSupport.js` instead of the originally specified `handleTabMutation*.js`/`tabMutationRuntime.js`. Behavior conforms to the owner deltas; the as-built names are canonical. Section C's Wave-2 per-file frames apply to the as-built files by role.

---

## Section C. Per-file specifications

> Every file: full-compact AMD `define([...], function (...) { ... })`; named helpers at factory scope only; executable JS ≤150 lines; `Rules to apply` verified before completion. Shared payload convention (master delta §3.7): every owner dispatch carries `{ runId, operationId, source: "tabsMutation", skipHistory: true }`.

#### `tabs/config/mutationCodes.js`

- **Role:** constants. **Lines:** ~20. **Imports:** none.
- Exports: `CONFLICT: "TABS_MUTATION_CONFLICT"`, `CANCELLED: "TABS_MUTATION_CANCELLED"`, `MIN_VISIBLE: "TABS_MIN_VISIBLE"`, `MAX_VISIBLE: "TABS_MAX_VISIBLE"`, `PREPARE_FAILED: "TABS_MUTATION_PREPARE_FAILED"`, `APPLY_FAILED: "TABS_MUTATION_APPLY_FAILED"`, `POSTCONDITION_FAILED: "TABS_MUTATION_POSTCONDITION_FAILED"`, `ROLLBACK_INCOMPLETE: "TABS_MUTATION_ROLLBACK_INCOMPLETE"`.
- **Rules:** `naming.mdc` (constants object), `amd.mdc`.

#### `tabs/state/buildTabMutationPlan.js`

- **Role:** pure plan builder. **Lines:** ≤150. **Imports:** `../config/mutationCodes.js`, `./listDashboardSlots.js`.
- Entry `buildTabMutationPlan(_state, _request)` for `_request = { operation: "delete", tabIndex | tabId, source }`:
  1. Resolve target slot by `tabId` first, `tabIndex` fallback; both recorded in the plan (master §2.3 phase 1: stable-id + position).
  2. Guards: target exists, `!isHelper`, `visible === true`; visible count > `state.limits.minVisibleUserTabs` else `{ ok: false, errorCode: MIN_VISIBLE }`; contiguous-prefix invariant precondition (§2.2) else `POSTCONDITION_FAILED` shaped as precondition diagnostic.
  3. Build `slotMoves`: ascending list `{ fromIndex, fromTabId, fromTabIdx, toIndex, toTabId, toTabIdx }` for every visible slot right of the deleted position (content shift-left). **Wave-2 amendment (2026-08-10):** the `fromTabIdx`/`toTabIdx` fields are mandatory — the filter owners resolve scopes per tabIdx (owner deltas §2.2); physical `index` alone is insufficient whenever tabIdx ≠ physical index. `hideSlot` likewise carries `tabIdx` next to `index`. **As-built (2026-08-12):** the loop caps at the last visible slot (`countVisible - 1`); hidden trailing slots are excluded from `slotMoves` and therefore from `affectedTabIds`.
  4. Freed slot = last **visible** slot pre-delete (`tabIdx = countVisible - 1`) → `hideSlot { tabIdx, index, tabId, baselineName }` (`baselineName` = `readBaselineName(request, index)` || `"Tab " + (index + 1)` — never `tab.name`, which after the shift would re-apply the deleted-away name). `names.byIndexAfter` shifts names only within the visible prefix (deleted position through last visible − 1), then sets the freed slot to `baselineName`; hidden trailing slots are omitted from the map (Cognos sync skips absent keys). **As-built (2026-08-12):** with pre-existing hidden trailing slots, the freed slot is the last visible slot, not `limits.maxUserTabs - 1`; trailing hidden slots keep their fields untouched.
  5. Landing rule (master §4.1, D-CRUD-6): if active content ≠ deleted content → landing slot = slot where the previously active content ends up per `slotMoves`; if active content == deleted content → landing = deleted position, unless it was the last visible position → previous visible slot.
  6. Return frozen `{ ok: true, plan: { operation, operationId, deletedSlot, slotMoves, hideSlot, landing: { index, tabId }, affectedTabIds, names: { byIndexAfter } } }` — `operationId` = `"tabmut-" + Date.now() + "-" + counter`.
- **Rules:** `state.mdc` (pure, no DOM/Cognos/runtime access), `naming.mdc`, `amd.mdc`, `feature-structure.mdc`.

#### `tabs/state/buildMutationResult.js`

- **Role:** pure result assembler (master §2.4). **Lines:** ≤80.
- Entry `buildMutationResult(_operationId, _phases)`; derives `outcome` per master §2.4: `commit`/`postcondition` failure → `"failed"`; a `rollback` phase with residual damage (`degraded`/`failed`) → `"degraded"` (D-CRUD-7a — `"aborted"` requires a clean rollback); other pre-commit `failed` → `"aborted"`; any `degraded` → `"degraded"`; else `"applied"`. `ok = outcome === "applied"`. Includes `phases` map and flattened top-level `diagnostics`. (Sync 2026-08-10: earlier wording "widgetApply failure resolves failed" contradicted master §2.4 and is superseded.)
- **Rules:** `state.mdc` pure, `amd.mdc`.

#### `tabs/state/reduceTabMutationApply.js`

- **Role:** pure reducer for `tabs/tabMutationApply`. **Lines:** ≤120.
- Entry `reduceTabMutationApply(_state, _payload)` (`_payload = { plan }`): new state where per `slotMoves` the **content-logical fields only** (`name`, `visible`, `button.*` — master §2.1 table; never `tabId`/`pageId`/`isCanvasLoaded`/`hasBeenActivated`) shift left; `hideSlot` becomes `visible: false` + baseline name; `isActive` true only on `plan.landing.index`. Asserts §2.2 postcondition (visible = contiguous prefix, ≥ min) — on violation returns `{ state: _state, error: POSTCONDITION_FAILED }` shape so the caller can fail the commit without a half-write.
- **Rules:** `state.mdc` (pure, immutable — new objects, no in-place mutation), `naming.mdc` slash-type.

#### `tabs/state/reduceTabsAction.js` (MODIFY)

- Add one case: `TAB_MUTATION_APPLY` → delegate to `reduceTabMutationApply`. Import added to the deps array. No other edits.

#### `tabs/actions/guardTabMutation.js`

- **Role:** lock + runId guard (pattern `guardParameterSetRun.js`). **Lines:** ≤80.
- `acquire(_ctx)`: if `runtime.pendingPromises.tabMutation` → `{ ok: false, errorCode: CONFLICT }`; if `pendingPromises.traverse|startup` → CONFLICT (existing traverse-conflict rule); else allocate monotonic `runtime.tabMutationRunId` and return `{ ok: true, runId }`. `register(_ctx, promise)` / `release(_ctx, promise)` manage `pendingPromises.tabMutation`. `isStale(_ctx, runId)`.
- **Rules:** `runtime.mdc` (runtime-only bookkeeping), `error-handling.mdc`.

#### `tabs/actions/tabMutationDelete.js`

- **As-built 2026-08-12 (tranche 2 refactor):** saga body moved to shared `runTabMutationSaga.js` / `tabMutationSagaSupport.js`; this file is now a thin delete wrapper — behavior unchanged.
- **Role:** saga handler (master §2.3 phases). **Lines:** ≤150 (delegate to effects).
- Entry `handleTabMutationDelete(_ctx, _action)`:
  1. `guardTabMutation.acquire`; build plan (`buildTabMutationPlan`); plan failure → resolve MutationResult `aborted` with plan diagnostics.
  1b. Capture the originally active tab (`state.activeIndex` + its tabId) in the run context **before** any mechanical activation. On every abort path that returns before commit (slotReadiness, prepare, filterApply, widgetApply failure), re-activate that original tab via the same activation helper before resolving — master delta §2.3 phase 2: byte-identical includes the visible active tab (added 2026-07-15, review finding 4).
  2. Phase `slotReadiness`: for every slot in `affectedTabIds` await `_ensureSlotReadyForMutation` (activation + ensure-routed; widgetBase delta §4). Failure → abort (incl. step 1b restore).
  3. Phase `prepare`: `_dispatchOwnerTabMutation` to `widgetBase`, `singleSelect`, `dienststelle` (`<owner>/prepareTabMutation`). Any `ok: false` → abort (phase result `failed`), rollback prepared owners via `restoreTabMutationSnapshot` into `phases.rollback`, resolve per master §2.4.
  4. Phase `filterApply` (phase 3, before widgets — D-CRUD-7b): `singleSelect/applyTabMutation`, then `dienststelle/applyTabMutation`. Failure → rollback all three owners into `phases.rollback`, resolve per master §2.4 (`aborted` when rollback clean, `degraded` on residual damage).
  5. Phase `widgetApply` (phase 4, irreversibility frontier): `widgetBase/applyTabMutation`. Failure → best-effort rollback all owners into `phases.rollback`; `ROLLBACK_INCOMPLETE` diagnostics only when an owner rollback actually reports damage; resolve per master §2.4 (`aborted` clean / `degraded` residual — sync 2026-08-10, supersedes the earlier `failed` wording here).
  6. Phase `commit`: dispatch internal `tabs/tabMutationApply`; on reducer postcondition error → rollback attempt + resolve `failed`.
  7. Phase `cognosSync`: `_applyTabMutationToCognos(plan)` — degraded on partial rename (pattern `TABS_RENAME_FAILED`), never fatal.
  8. Phase `hostResync`: `resyncOwners` dispatches `singleSelect/resyncTabMutationHost` and `dienststelle/resyncTabMutationHost` — re-pushes committed filter state after cognosSync scope reloads; degraded on diagnostics, never fatal (shared core with move; as-built 2026-08-12).
  9. Finalize: release lock, then emit exactly one `tabs:changed` for `plan.landing` with `source: "tabsMutation"` (reuse the final-emit helper of `observeActiveTab.js`/post-restore-traverse — same emit path, not a new emitter).
  10. Resolve `buildMutationResult(operationId, phases)`.
- **Rules:** `error-handling.mdc` (try/catch, async), `events.mdc` (single fact-emit at documented point), `feature-structure.mdc`.

#### `tabs/actions/routeTabMutationAction.js`

- **Role:** router (pattern `routeParameterSetAction.js`). **Lines:** ≤60.
- `isTabMutationAction(type)` → true for `DELETE` only in tranche 1 (`MOVE`/`DUPLICATE`/`REORDER` stay with `isDeferredAction`). `route(_ctx, action)` → `handleTabMutationDelete`. `disposedResult()` mirroring parameterSet router.
- **Rules:** `amd.mdc`, `naming.mdc`.

#### `tabs/effects/ensureSlotReadyForMutation.js`

- **Role:** effect. **Lines:** ≤100.
- For a slot `{ tabId, index }`: if not canvas-loaded/activated, activate via the same activation effect used by `parameterSetActivateTab.js` (reuse its helper, do not duplicate click logic); then `await _KDB.api.widgetBase.dispatch({ type: "widgetBase/ensureTabWidgetsRouted", payload: { tabId, reason: "tabsMutation" } })` — **no `runId` in the ensure payload** (cross-review C: ensure stale-guards against `parameterSetRunId` only; the saga's mutation runId would falsely cancel or skip guarding; idempotency via `routedTabIds`/`pendingRouteByTabId` suffices). Returns `{ ok, diagnostics }`.
- **Rules:** `error-handling.mdc` (await + try/catch, AbortController where the reused helper requires), `dom.mdc` (selectors via `_KDB.elements.selectors`).

#### `tabs/effects/applyTabMutationToCognos.js`

- **Role:** effect (post-commit sync). **Lines:** ≤120.
- Loop `plan.names.byIndexAfter` → Cognos `setTabName` per changed slot (pattern `applyParameterSetTabsToCognos.js`); then `syncTabsDomFromState`; then activate `plan.landing` (single click via existing activation helper — this activation happens **inside** the suppression window, the final emit of the saga is the only published event). Partial failure → diagnostics, `status: "degraded"`.
- **Rules:** `error-handling.mdc`, `dom.mdc`.

#### `tabs/effects/dispatchOwnerTabMutation.js`

- **Role:** effect helper. **Lines:** ≤80.
- `dispatchOwnerTabMutation(_KDB, _owner, _type, _plan, _runContext)` — merges `{ plan, runId, operationId, source: "tabsMutation", skipHistory: true }`, plus `tabIdxToScopeId` **only for the filter owners** (`singleSelect`, `dienststelle`; widgetBase's contract payload carries no map). Awaits `_KDB.api[_owner].dispatch`, normalizes `false`/missing api to `{ ok: false, errorCode: PREPARE_FAILED, diagnostics: [ownerUnavailable] }` (this is the honest Wave-1 abort). `tabIdxToScopeId` source (cross-review B): the canonical tabs-owned resolve action from the writeback track — `tabs/resolveFilterScopeTargets` (`tabs-filterScopeSelectors-contractdelta.md`, **landed 2026-08-10**, consumed by writeback GET and SET). Wave 2 must use the canonical action; the `listTabScopeIds.js` / tabTargets fallback path is superseded.
- **Wave-2 MODIFY (2026-08-10, binding value shape):** the payload field stays named `tabIdxToScopeId` (writeback convention) but its value is the **full `tabTargets` map** returned by `tabs/resolveFilterScopeTargets`: `{ [tabIdx: string]: { tabId, pageId, scopeId?, visible } }` — rich objects, not a flat `{ tabIdx: scopeIdString }` map. Rationale: dienststelle's `restoreSupport.resolveScopeId` requires object targets (scopeId + tabId/pageId layout fallback); singleSelect's `readScopeValue` accepts both shapes, so the rich map serves both owners. Resolve is dispatched once per saga run (before the prepare phase), failure → abort with the resolve diagnostics.
- **Rules:** `error-handling.mdc`.

#### `tabs/effects/renderTabEditIcons.js` (MODIFY)

- Add `enabledActions` resolution gated on `_defaults.TAB_DELETE_UI_ENABLED` (new constant in `tabs/config/defaults.js`, **`false` in Wave 1**): while `false`, the delete icon keeps the deferred rendering (`aria-disabled`, `onDeferredIconClick`) exactly like duplicate/move — per `kdbControl-tabsCrud-contractdelta.md` §2 an icon activates only when its operation is end-to-end available, and in Wave 1 every delete deterministically aborts at prepare. The flag flips to `true` in the Wave-2 tranche after the end-to-end smoketests pass. **As-built 2026-08-12: flipped to `true`** after the Cognos smoketests (delete middle/last tab, GET consistency, min-visible guard, forced-failure rollback with byte-identical GET) passed. When `true`: `delete` becomes enabled (remove `aria-disabled` for that icon). Click handler (factory-scope `onDeleteIconClick`, async, try/catch), per `kdbControl-tabsCrud-contractdelta.md` §3:
  1. `const svc = _KDB.services && _KDB.services.message;` — if missing: `console.warn("[tabs.editIcon] messageService unavailable — delete blocked (fail closed)")` and return. **No native `confirm` fallback** (decided 2026-07-15, supersedes the earlier placeholder).
  2. `const result = await svc.confirm({ code: "TABS_DELETE_CONFIRM", title: "Diese Registerkarte löschen?", message: "Der gesamte Inhalt dieser Registerkarte wird ebenfalls gelöscht." });` — labels stay the service defaults (`Ja`/`Nein`). A rejected Promise (disposed service) is caught → fail closed, nothing deleted.
  3. Only when `result && result.confirmed === true`: `const mutationResult = await _KDB.api.tabs.dispatch({ type: "tabs/delete", payload: { tabIndex, tabId, source: "tabsEditUi" } })`.
  4. Surface `mutationResult.ok === false` via the service, mapping is consumer-owned: `TABS_MIN_VISIBLE` → `svc.notify({ code, severity: "warning", message: MIN_VISIBLE_TEXT })`; `TABS_MUTATION_CONFLICT` → `svc.notify({ code, severity: "warning", message: CONFLICT_TEXT })`; other failures → `svc.showAlert({ code, severity: "error", title: DELETE_FAILED_TITLE, message: buildDeleteFailedText(mutationResult) })`. Also `console.warn` with the full MutationResult.
  5. German copy constants live in `tabs/config/defaults.js` (existing home of tab-edit strings): `MIN_VISIBLE_TEXT = "Die letzte sichtbare Registerkarte kann nicht gelöscht werden."`, `CONFLICT_TEXT = "Es läuft bereits eine Registerkarten-Aktion. Bitte warten Sie einen Moment."`, `DELETE_FAILED_TITLE = "Registerkarte löschen fehlgeschlagen"`. **Rule for count-bearing copy:** any text that mentions the number of user tabs is built at call time from the configured dashboard-role tab count (`state.limits.maxUserTabs`, sourced from `KDB3/js/core/config/tabs.js` role `"dashboard"` entries) — never a hardcoded "5" (PO 2026-07-15). Tranche 1's three texts above are countless by design; the rule binds future duplicate/move copy.
  `duplicate`/`move` keep `onDeferredIconClick`. Keep the modified file ≤150 lines: if the handler pushes it over, extract to a new `tabs/effects/confirmAndDispatchTabDelete.js` (effect role, same rules) and call it from the icon binding.
- **Rules:** `dom.mdc`, `error-handling.mdc` (async click handler try/catch; a confirm rejection is caught and treated as fail-closed).

#### `tabs/effects/confirmAndDispatchTabDelete.js` (conditional, see above)

- **Role:** effect. **Lines:** ≤100. Contains steps 1–4 of the click handler verbatim; `renderTabEditIcons.js` only binds it. Same rules line.

#### `tabs/config/defaults.js` (MODIFY)

- Add the three German copy constants of step 5 (`TAB_DELETE_MIN_VISIBLE_TEXT`, `TAB_DELETE_CONFLICT_TEXT`, `TAB_DELETE_FAILED_TITLE`) plus `TAB_DELETE_CONFIRM_TITLE`/`TAB_DELETE_CONFIRM_TEXT`. Constants only — no logic, no hardcoded tab counts in any text (count-bearing copy is assembled at call time from `state.limits`).
- **Rules:** `naming.mdc` (constants), `amd.mdc`.

#### `tabs/createTabsController.js` (MODIFY)

- In `dispatch`: before the `isDeferredAction` line, route `_routeTabMutationAction.isTabMutationAction(action.type)` → `_routeTabMutationAction(buildEffectContext(instance), action)`; disposed-guard mirrors the parameterSet branch. Remove `DELETE` from `isDeferredAction`. Two-line diff plus import.

#### `widgetBase/config/actionTypes.js` (MODIFY)

- Add `PREPARE_TAB_MUTATION: "widgetBase/prepareTabMutation"`, `APPLY_TAB_MUTATION: "widgetBase/applyTabMutation"`, `RESTORE_TAB_MUTATION_SNAPSHOT: "widgetBase/restoreTabMutationSnapshot"`.

#### `widgetBase/actions/tabMutationSupport.js`

- **Role:** guard + snapshot helpers. **Lines:** ≤100.
- `guardRun`/`isStale` on `runtime.tabMutationRunId` (pattern `parameterSetRuntime.js`); `snapshotFrames(_KDB, plan, operationId)` — deep-copy affected `byId` frames + `routedTabIds` entries into `runtime.tabMutationSnapshots[operationId]`; `readSnapshot`, `deleteSnapshot`.
- **Rules:** `runtime.mdc` (runtime-only), `state.mdc` (reads state, never writes).

#### `widgetBase/actions/handlePrepareTabMutation.js`

- **Role:** action handler (owner delta §2.1). **Lines:** ≤100.
- Guard → snapshot → readiness verification (`routedTabIds` set for every target slot in `plan.slotMoves`; else `ok: false`) → return `{ ok, operationId, snapshotWidgetIds, expectedDegradedEntries: 0, diagnostics }` (capacity check is duplicate-only; hardcode 0 in tranche 1).
- **Rules:** `error-handling.mdc`.

#### `widgetBase/actions/handleApplyTabMutation.js`

- **Role:** action handler (owner delta §2.2, delete-only). **Lines:** ≤150.
- Guard; assert `plan.operation === "delete"` else `{ ok: false }`. Step 1: for every onCanvas widget frame with `tabId === plan.deletedSlot.tabId` dispatch internal `ROUTE_TO_LAUNCHPAD` (`reason: "tabDelete"`), collect `parked`. Step 2: for each `slotMoves` pair ascending: park `from` onCanvas widgets, then per widget `TAKE_FROM_LAUNCHPAD` onto `to` slot preserving layout/colour, collect `moved`. **As-built (2026-08-12):** uses `readCanvasWidgetsByTab` (`placement === "onCanvas"`, `lifecycle !== "disposed"`) — launchpad stock is never parked or shifted. **No `routedTabIds` writes anywhere in this handler** (cross-review A: the two existing writers stay the only ones; the saga's awaited ensure calls already seeded the slots). Reuse `_handleRouteToLaunchpad`/`_handleTakeFromLaunchpad` via controller-internal dispatch context — **no new placement code**. Failure mid-chain: return `{ ok: false, moved, parked, diagnostics }` (saga triggers rollback).
- **Rules:** `error-handling.mdc` (async chain, try/catch), `state.mdc` (frame writes only through existing reducer actions).

#### `widgetBase/actions/handleRestoreTabMutationSnapshot.js`

- **Role:** rollback handler (owner delta §2.3). **Lines:** ≤120.
- If no physical step ran (snapshot flag `physicalStarted !== true`): restore frame state via internal reducer action + restore `routedTabIds`; complete. Else: reverse `slotMoves` best-effort via park/take on onCanvas widgets only (`readCanvasWidgetsByTab`); unrecoverable widgets → `unrecoverable[]` + `ROLLBACK_INCOMPLETE` diagnostics. Always `deleteSnapshot`.
- **Rules:** `error-handling.mdc`.

#### `widgetBase/state/selectors.js` (MODIFY)

- **As-built (2026-08-12):** exports `readCanvasWidgetsByTab(_KDB, tabId)` — cloned frames where `tabId` matches, `placement === "onCanvas"`, and `lifecycle !== "disposed"`; used by tab-mutation apply/rollback handlers instead of `readWidgetsByTab`.

#### `widgetBase/createWidgetBaseController.js`, `ensureWidgetBaseRuntime.js`, `cleanupWidgetRuntime.js` (MODIFY)

- Controller: 3 route lines. Runtime: `tabMutationSnapshots = {}`, `tabMutationRunId` untouched-init. Cleanup: clear both.

#### Suppression predicate edits (3 × MODIFY, one line each)

- `followActiveTab.js` `isTraversalInFlight`: add `|| pendingPromises.tabMutation`.
- `widgetBase/effects/subscribeTabsChanged.js` and `dragDrop/dropboxes/subscribeTabsChangedRebind.js`: same predicate extension (if no predicate exists yet, add the identical `pendingPromises`-check used by `followActiveTab.js`). Master delta §3.5/§6; update the `eventSubscribe.md` catalog entry accordingly.

#### WAVE 2 — `singleSelect` (6 files) and `dienststelle` (6 files) — count corrected at cross-review (config/actions.js MODIFY is the sixth)

> **D-CRUD-8 gate lifted 2026-08-10 — buildable per cross-review.** The singleSelect handlers already in the working tree are to be synced against this frame; dienststelle is greenfield. Shapes are fixed by the two owner deltas §2.1–2.3; this spec adds only the mechanical frame:

- `actions/tabMutationRuntime.js` per module: copy of the module's parameterSet runtime pattern on `tabMutationRunId` + `tabMutationSnapshots`.
- `handleTabMutationPrepare.js`: snapshot affected scopes exactly per the owner deltas §2.1 — singleSelect: per affected filter entry `currentSelection`, `backupSelection`, `pendingSelection` (state + host-read where the label-keyed state cannot attribute per tab); dienststelle: per scope and per **all** `byFilter` keys the complete pageContext entry (`currentValues`, `backupValues`, `pendingValues`, `lastObservedHostValues`, `lastConfirmedAt`).
- `handleTabMutationApply.js` (delete-only): clear deleted scope; permute shift pairs ascending via the module's existing apply/clear primitives (`applyRestoreSelection.js` family resp. scope helpers); never touch global scope; no hierarchy validation / BW mapping (dienststelle delta §2.2).
- `handleTabMutationRestore.js`: re-apply snapshot, report unrecoverables.
- Controller MODIFY: route the 3 types through the Promise-returning branch (pattern: parameterSet routing).
- **Alignment duty:** the writeback track landed the canonical scopeId→tabIdx resolution as `tabs/resolveFilterScopeTargets` (2026-08-10) — consume it, do not fork (D-CRUD-8). Deviation = stop and report.
- **Wave-2 saga preamble (tabs-side, 2 × MODIFY, before any owner build):** `dispatchOwnerTabMutation.js` switches from `listTabScopeIds` to the canonical resolve action with the rich `tabTargets` value shape (see its entry above); `buildTabMutationPlan.js` adds `fromTabIdx`/`toTabIdx` to `slotMoves` and `tabIdx` to `hideSlot`. These two fixes also close the scope-resolution gap in the already-present singleSelect handlers (their `scopeBySlot` resolves tabIdx-first with a tabId fallback that only works on rich targets) without touching the singleSelect module.
- **dienststelle reconcile deferral (owner delta §3):** the reconcile entrypoints (`SYNC_REQUESTED`, `TABLE_DATA_CHANGED` in `routeDienststelleDispatch`) check `_KDB.runtime.tabs.pendingPromises.tabMutation` and defer/no-op while a mutation is in flight — one guard clause, read-only foreign-state access explicitly allowed by the owner delta.
- **singleSelect sync scope (mandate 2026-08-10):** verification-only against the saga preamble above — confirm `scopeBySlot`/`buildTabMutationTransfers` resolve correctly with rich targets + tabIdx fields; **no rework of the snapshot keying in this tranche**. The mechanical supersession by `singleSelect-filterInstanceIdentity` §12 (snapshots keyed on `filterInstanceId` instead of label buckets) lands with the identity track in that module (single-builder rule); until then the label-bucket handlers stay as built and the cross-review records this as a known, contract-tracked deviation.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `tabs/tabMutationApply` | saga phase 5 (commit) | content-logical shift-left per plan (§2.1 fields only), hide last slot + baseline name, `isActive` → landing slot; postcondition assert | none |

No other reducer changes. widgetBase/singleSelect/dienststelle introduce **no new reducer actions** (writes go through existing actions/effects paths).

## Section E. Published selectors

None new. Existing tabs selectors (`readTabTargets`, coarse projection) must reflect post-commit state without change — verify, don't edit.

## Section F. Public API wiring

No new public surfaces. New dispatch types ride the existing `_KDB.api.tabs|widgetBase|singleSelect|dienststelle.dispatch` surfaces. Runtime additions: `_KDB.runtime.tabs.{tabMutationRunId, pendingPromises.tabMutation}`, `_KDB.runtime.widgetBase.{tabMutationSnapshots, tabMutationRunId}`, Wave 2 equivalents per filter module.

## Sections G/H/I. Harness

Not applicable — tranche 1 is verified in live Cognos via the smoketests below (consistent with the tabs parameterSet tranche, which shipped without a harness). No harness files are created.

## Section J. Acceptance criteria (self-verification)

1. All Wave-1 files exist per Section B; Wave-2 files **absent** unless the gate was lifted in writing.
2. Template criteria 2–11 of `_executionSpecTemplate.md` §J hold (AMD shape, line limits, no inline subfunctions, pure reducers, try/catch on mount/destroy-equivalents, cleanup completeness).
3. Master-delta smoketests (tabs-tabCrud §9) runnable after Wave 2: delete middle tab → widgets parked, content shifts left, last slot hidden with baseline name, landing per D-CRUD-6; `writebackGet` consistent (§3.8, explicitly also after `outcome: "degraded"`); exactly one `tabs:changed` `source: "tabsMutation"`; min-visible guard blocks last tab; failing prepare leaves dashboard byte-identical; pre-mutation parameterSet restores positionally (D-CRUD-3).
4. Wave-1-only behavior: `tabs/delete` resolves `outcome: "aborted"` with an `ownerUnavailable` diagnostic — no partial mutation.
5. MessageService integration (per messaging-planner verification list, 2026-07-15): confirm-Ja deletes; Nein/Escape/close deletes nothing; missing or disposed `_KDB.services.message` deletes nothing (fail closed, warn logged); double click while the saga runs → one saga + conflict notify; `TABS_MIN_VISIBLE` on the last visible tab → warning notify, no mutation; degraded/failed MutationResult → `showAlert`; after tabs `destroy()` a pending confirm settles per the service contract and no dispatch follows.

## Section K. Forbidden actions

Template list applies unchanged; additionally: do not modify the five contract deltas or `messageService.md`; do not touch the `core/services/messageService/` tree (the service is consumed, never modified); do not touch `singleSelect`/`dienststelle` trees during Wave 1; do not write any `routedTabIds` entry from mutation code; do not add a fourth placement variant in widgetBase (duplicate is out of scope); do not emit any new event names; no native `confirm`/`alert` anywhere.

## Section L / M. Reporting & reviewer handoff

Template sections apply unchanged. Reviewer adds one extra check: cross-review sign-off from the writeback function planner recorded for every Wave-2 file before acceptance (D-CRUD-8).

### Cross-review sign-off record (writeback function planner, 2026-08-10)

Scope: all Wave-2 files (10 singleSelect, 7 dienststelle incl. controller/config/runtime touchpoints) plus saga-side `dispatchOwnerTabMutation.js`, `tabMutationDelete.js`, `buildMutationResult.js`. First pass by two independent review subagents, sign-off by the writeback function planner. **Verdict: signed off — no blockers.** Findings and resolutions:

1. **Fixed (dienststelle `restoreTabMutationSnapshot.js`):** stale-guard rejection deleted the operation's snapshot — a side effect forbidden by delta L29. Delete removed from the guard branch; snapshot survives as the recovery path.
2. **Fixed (saga `tabMutationDelete.js` + `buildMutationResult.js`):** rollback results were ignored and a `ROLLBACK_INCOMPLETE` diagnostic was pushed unconditionally on widgetApply failure. Rollback now records an honest `phases.rollback` (ok / degraded-with-diagnostics); outcome per master §2.4: `aborted` only with clean rollback, `degraded` on residual damage. The spec's earlier "widgetApply failure → failed" wording is superseded (§C sync notes).
3. **Sanctioned (singleSelect `applyTabMutation.js`):** clears-before-applies order is equivalent to per-pair apply-then-clear because transfers are snapshot-sourced; clarification added to owner delta §5.2.
4. **Sanctioned (singleSelect `tabMutationSupport.js`):** cross-scope target matching without `itemId` is correct (`itemId` is scope-local); clarification added to owner delta §5.3.
5. **Noted, no change:** `source`/`skipHistory` accepted but not validated at owner boundaries (no history-write path exists in these files); ambiguous same-scope matches use `TAB_MUTATION_APPLY_FAILED` rather than a dedicated collision code; dienststelle `restored[]`/`unrecoverable[]` can both contain one scope on partial per-filterKey outcomes (consumers must read both); dienststelle `TAB_MUTATION_SCOPE_WRITE` resets `errorCode`/`errorMessage` on scope writes (accepted as intentional stale-error cleanup).

PO ratification of items 2–4 (contract/spec text changes): granted in session 2026-08-10 (GO on the cross-review mandate).

6. **Fixed (Cognos smoketest 2026-08-11, `applyTabMutationToCognos.js`):** the rename skip-guard compared plan target names against post-commit state names (always equal), silently skipping every `setTabName` — tab buttons kept their pre-mutation labels while state and widgets shifted correctly. Guard reduced to a null check; `names.byIndexAfter` already lists only the slots to rename.
7. **Fixed (Cognos smoketest 2026-08-11, `syncTabsDomFromState.js`):** fix 6 was necessary but not sufficient — Cognos' `setPropertyValue("title", …)` (the `setTabName` mechanism) persists the title but does not drive the visible tab-button text; legacy KDB2 always wrote the label DOM node directly (verified in `wbParameterSetTabsHelpers.js` / `kdbControlFunctions.js`). `syncTabsDomFromState` now syncs dashboard-tab button labels from committed state (selector chain `tabLabelSelectors`, skipping labels in an active contenteditable rename session). This also repairs the previously unnoticed same gap in the parameterSet restore path (`applyParameterSetTabsToCognos.js` calls the same sync).

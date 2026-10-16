# Execution Spec: `tabs` Tab-CRUD Tranche 2 — move (shared saga + owners)

> Shell shift sentences in this historical spec are superseded by `tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` (live 2026-10-07). Do not implement them again.

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the contracts, not here.
>
> **Scope:** tranche 2 only — `tabs/move`. Duplicate stays deferred. Delete behavior must remain byte-identical after the shared-saga refactor.
> **Build waves (binding):** Wave A = tabs core (shared saga extraction, move plan, reducer widen, routing). Wave B = widgetBase + dienststelle apply widen + move UI. Cross-review every file before Wave B starts; run ReadLints + line counts per file after each wave.
>
> **Architectural reference (one paragraph):** rotation/landing/guards follow `tabs-tabCrud-contractdelta.md` §4.2 and PO decisions D-MOVE-1..7 below; owner park/take and filter permute semantics are in the three owner deltas §2.2 (rotation range wording). Tranche-1 as-built precedents (`tabs-tabCrud-tranche1-delete-execution-spec.md` §C): 9-phase saga in `tabMutationDelete.js`, `fromTabIdx`/`toTabIdx` on `slotMoves`, `readCanvasWidgetsByTab`, Cognos rename via `applyTabMutationToCognos` + `syncTabsDomFromState`, final `tabs:changed` with `source: "tabsMutation"` emitted **after** lock release, `TAB_DELETE_UI_ENABLED` gate pattern.

---

**Status:** `Approved for execution (PO 2026-08-12)`. Built 2026-08-12 (Waves A+B); cross-review passed; Cognos smoketests passed 2026-08-12 (rotation, GET consistency, guards, rollback, filter hostResync + popup re-arm fixes included); `TAB_MOVE_UI_ENABLED` flipped to `true` 2026-08-12.
**Module / contracts:** `tabs-tabCrud-contractdelta.md` (master §2, §4.2, §5), `widgetBase-tabMutation-contractdelta.md`, `singleSelect-tabMutation-contractdelta.md`, `dienststelle-tabMutation-contractdelta.md`, `kdbControl-tabsCrud-contractdelta.md`, `messageService.md` (Approved; consumed, never modified)
**Phase:** `extension (tranche 2: move)`
**Authoring AI:** Composer, 2026-08-12
**Executing AI:** `<tbd>`
**Reviewer:** PO (vastenburg) + writeback function planner (Wave B owner files)

### PO decisions (binding, approved 2026-08-12)

| ID | Decision |
|---|---|
| **D-MOVE-1** | **Rotation semantics:** request moves visible source position `s` to visible target position `d` (both 0-based `tabIdx` within the visible prefix). `slotMoves` = `{s→d}` plus, for `s < d`: `{i→i-1}` for `i` in `s+1..d`; for `s > d`: `{i→i+1}` for `i` in `d..s-1`. Application is **SNAPSHOT-FIRST** at every layer (reducer, widgetBase, dienststelle; singleSelect already snapshot-sourced) so pair order is irrelevant. Insert/shift, never swap — legacy parity confirmed against KDB2 `configurationToolboxHelpers.js` `adjustTabObj` (bidirectional splice over fixed slots). |
| **D-MOVE-2** | **Landing (content-following):** if the active tab was the moved tab → land on `d`; if the active content was in the shifted range → land on its new position; otherwise unchanged. Final `tabs:changed` emit with `source: "tabsMutation"` reused from delete's finalize (shared saga). **⚠ DELIBERATE LEGACY DEVIATION:** legacy always landed on tab 1 as a full-restore artifact. |
| **D-MOVE-3** | **Guards:** source must be a visible dashboard tab; target must be a visible position (`0..countVisible-1`); `s === d` → clean abort, new code `TABS_MOVE_SAME_POSITION`, no mutation, no confirm/choose dialog (abort surfaces via `notify` per feedback rules). Conflict lock (`guardTabMutation`) reused unchanged. Min-visible **not** relevant for move. Hidden slots never participate in `slotMoves` — **⚠ DELIBERATE LEGACY DEVIATION:** legacy hidden slots could ride along in shifts as a restore artifact. |
| **D-MOVE-4** | **Payload:** `tabs/move` `{ tabIndex (0-based source tabIdx), tabId?, targetPosition (0-based target tabIdx), source }`. UI labels remain 1-based per the `_tabNumber` rule. |
| **D-MOVE-5** | **UI:** move icon click (rename edit session, same as delete icon) → `_KDB.services.message.choose` with German title/text; options = visible positions `1..N` excluding the current position; opaque option ids mapped by tabs to `targetPosition`; new flag `TAB_MOVE_UI_ENABLED: false` in `tabs/config/defaults.js` (flips only after Cognos smoketests, delete precedent). In-flight disable + conflict notify reuse existing mechanisms (`TAB_DELETE_CONFLICT_TEXT` is operation-generic — reuse it; add German copy constants for the choose dialog and failure title). |
| **D-MOVE-6** | **Render:** lazy path, no render barrier (delete precedent). |
| **D-MOVE-7** | **Plan shape:** no `hideSlot`, no baseline name reset; `names.byIndexAfter` contains **only** the rotation range (physical indices `min(s,d)..max(s,d)`), values = post-rotation names. Postcondition: per-slot visible flags **unchanged** (same visible set), contiguous prefix intact. |

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
11. `_____________KDB3API/contracts/tabs-tabCrud-contractdelta.md` — summary: `<echo>` (must mention §2.1 field table, §2.2 invariant, §2.4 MutationResult, §4.2 move, §5 owner table)
12. `_____________KDB3API/contracts/widgetBase-tabMutation-contractdelta.md` — summary: `<echo>` (must mention §2.2 move rotation range, snapshot-first rollback)
13. `_____________KDB3API/contracts/singleSelect-tabMutation-contractdelta.md` + `dienststelle-tabMutation-contractdelta.md` — summary: `<echo>` (must mention §2.2 rotation range; singleSelect snapshot-sourced apply precedent)
14. `_____________KDB3API/contracts/kdbControl-tabsCrud-contractdelta.md` — summary: `<echo>` (must mention `message.choose`, in-flight disable, MutationResult feedback)
15. `_____________KDB3API/contracts/messageService.md` — summary: `<echo>` (must mention `ChooseResult` fail-closed semantics; service consumed, never modified)
16. `_____________KDB3API/contracts/tabs-tabCrud-tranche1-delete-execution-spec.md` — summary: `<echo>` (must mention 9-phase saga, as-built precedents, Wave structure)
17. This execution spec itself.

First output = the 17 echoed summaries; file creation starts only after reviewer acceptance.

Reference implementations to read (patterns to copy, not modify unless listed in Section B): `tabs/actions/tabMutationDelete.js` (current 9-phase saga — source for extraction), `tabs/state/buildTabMutationPlan.js`, `tabs/effects/confirmAndDispatchTabDelete.js`, `tabs/effects/renderTabEditIcons.js`, `widgetBase/actions/handleApplyTabMutation.js`, `widgetBase/actions/handleRestoreTabMutationSnapshot.js`, `filters/singleSelect/actions/applyTabMutation.js`, `filters/singleSelect/actions/applyTabMutationWrites.js`, `filters/dienststelle/actions/applyTabMutation.js`.

---

## Section B. Folder tree (creation order; existing files marked MODIFY)

```
--- WAVE A (tabs core) ---
KDB3/js/dashboard/tabs/
  actions/runTabMutationSaga.js              (NEW: shared 9-phase core, ≤150)
  actions/tabMutationSagaSupport.js          (NEW: rollback + phase helpers, ≤150)
  actions/tabMutationMove.js               (NEW: thin move wrapper, ≤150, expect ~60)
  actions/tabMutationDelete.js             (MODIFY: thin wrapper over shared core; delete behavior identical)
  actions/routeTabMutationAction.js        (MODIFY: route MOVE)
  state/buildTabMovePlan.js                (NEW: pure move plan builder, ≤150)
  state/buildTabMutationPlan.js            (MODIFY: export countVisible + readContiguousPrefixError)
  state/reduceTabMutationApply.js          (MODIFY: snapshot-first + move postcondition)
  config/mutationCodes.js                  (MODIFY: +TABS_MOVE_SAME_POSITION)
  createTabsController.js                  (MODIFY: remove MOVE from isDeferredAction)

--- WAVE B (owners + UI) ---
KDB3/js/dashboard/widgets/widgetBase/
  actions/handleApplyTabMutation.js        (MODIFY: delete|move; snapshot-first reads)
  actions/handleRestoreTabMutationSnapshot.js (MODIFY: snapshot-sourced re-place)

KDB3/js/dashboard/filters/dienststelle/
  actions/applyTabMutation.js              (MODIFY: drop delete-only guard; snapshot-sourced apply)

KDB3/js/dashboard/tabs/
  effects/confirmAndDispatchTabMove.js     (NEW: choose flow + dispatch, ≤100)
  effects/renderTabEditIcons.js            (MODIFY: move enablement + handler extract if >150)
  config/defaults.js                       (MODIFY: TAB_MOVE_UI_ENABLED + German copy)
```

**UNCHANGED (do not edit):** `guardTabMutation.js`, `buildMutationResult.js`, `dispatchOwnerTabMutation.js`, `ensureSlotReadyForMutation.js`, `applyTabMutationToCognos.js`, `syncTabsDomFromState.js`, `reduceTabsAction.js` (MOVE case stays no-op; commit via `TAB_MUTATION_APPLY`), entire `singleSelect` tab-mutation stack (`prepareTabMutation`, `applyTabMutation`, `applyTabMutationWrites`, `buildTabMutationTransfers`, `restoreTabMutationSnapshot`, `tabMutationSupport`), `followActiveTab.js` / `subscribeTabsChanged.js` / `subscribeTabsChangedRebind.js` suppression predicates (already include `tabMutation` from tranche 1).

**Doc-sync (same PR or immediate follow-up, PO-mandated):**
- `architecture/eventSubscribe.md` — `tabs:changed` catalog entry: emitter path is the shared saga `finalize` phase in `runTabMutationSaga.js` (moved from delete-only wording; applies to delete and move).
- `contracts/tabs-tabCrud-contractdelta.md` §11 — add item 6: `tabs-tabCrud-tranche2-move-execution-spec.md` (move; Wave A tabs core, Wave B owners + UI).

---

## Section C. Per-file specifications

> Every file: full-compact AMD `define([...], function (...) { ... })`; named helpers at factory scope only; executable JS ≤150 lines; `Rules to apply` verified before completion. Shared payload convention (master delta §3.7): every owner dispatch carries `{ runId, operationId, source: "tabsMutation", skipHistory: true }`.

#### `tabs/actions/runTabMutationSaga.js` (NEW)

- **Role:** shared saga core extracted from `tabMutationDelete.js`. **Lines:** ≤150.
- **Imports:** `guardTabMutation`, `buildMutationResult`, `tabMutationSagaSupport` (rollback, phase helpers, emit), `ensureSlotReadyForMutation`, `dispatchOwnerTabMutation`, `applyTabMutationToCognos`, `actionTypes`, `mutationCodes`.
- Entry `runTabMutationSaga(_ctx, _action, _runId, _options)` where `_options = { buildPlan, operationLabel }`:
  1. **plan** — call `_options.buildPlan(state, payload)`; failure → `aborted` MutationResult.
  1b. Capture `originalActive` before any mechanical activation (tranche-1 precedent B4).
  2. **slotReadiness** — `affectedTabIds` via `ensureSlotReadyForMutation`.
  3. **scopeResolve** — `tabs/resolveFilterScopeTargets` (unchanged).
  4. **prepare** — owners `widgetBase`, `singleSelect`, `dienststelle`.
  5. **filterApply** — `singleSelect`, `dienststelle`.
  6. **widgetApply** — `widgetBase` (irreversibility frontier).
  7. **commit** — `tabs/tabMutationApply`.
  8. **cognosSync** — `applyTabMutationToCognos`.
  9. **hostResync** — `singleSelect/resyncTabMutationHost` + `dienststelle/resyncTabMutationHost` via `resyncOwners` (non-fatal; diagnostics → `phases.hostResync: degraded`).
  10. **finalize** — `guardTabMutation.release` **before** emit (tranche-1 B3), then `emitFinalTabsChanged`, resolve `buildMutationResult`.
- Abort paths before commit: `abortOnOriginalTab` (restore original active tab) — identical to delete.
- **Rules:** `error-handling.mdc`, `events.mdc`, `feature-structure.mdc`.

#### `tabs/actions/tabMutationSagaSupport.js` (NEW)

- **Role:** helpers moved out of delete saga. **Lines:** ≤150.
- Exports: `ok()`, `failed(diag)`, `captureOriginalActive(state)`, `ensureSlots`, `resolveScopeTargets`, `dispatchOwners`, `rollbackOwners`, `emitFinalTabsChanged`, `abortOnOriginalTab` — verbatim behavior from current `tabMutationDelete.js` lines 67–146.
- **Rules:** `error-handling.mdc`, `amd.mdc`.

#### `tabs/actions/tabMutationMove.js` (NEW)

- **Role:** thin move wrapper. **Lines:** ≤150 (expect ~60).
- Entry `handleTabMutationMove(_ctx, _action)`:
  1. `guardTabMutation.acquire`; on conflict → MutationResult `aborted`.
  2. `runTabMutationSaga(_ctx, _action, runId, { buildPlan: buildTabMovePlan })`.
  3. `guardTabMutation.register` / `release` around the promise (same as delete).
- **Rules:** `error-handling.mdc`, `feature-structure.mdc`.

#### `tabs/actions/tabMutationDelete.js` (MODIFY)

- **Role:** thin delete wrapper — **behavior and MutationResult shape unchanged**. **Lines:** ≤60 after refactor.
- Replace inline `runSaga` with `runTabMutationSaga(_ctx, _action, runId, { buildPlan: buildTabMutationPlan })`.
- Delete the duplicated helper functions now living in `tabMutationSagaSupport.js`.
- **Regression gate:** tranche-1 smoketest checklist must pass unchanged after Wave A.
- **Rules:** `error-handling.mdc`.

#### `tabs/state/buildTabMovePlan.js` (NEW)

- **Role:** pure move plan builder (D-MOVE-1,3,4,7). **Lines:** ≤150.
- **Imports:** `mutationCodes.js`, `buildTabMutationPlan.js` (import `countVisible`, `readContiguousPrefixError` — see below), `listDashboardSlots.js`.
- Entry `buildTabMovePlan(_state, _request)` for `_request = { operation: "move", tabIndex | tabId, targetPosition, source }`:
  1. Resolve source slot: `tabId` first, `tabIndex` fallback → `sourceSlot { tabIdx, index, tabId }`.
  2. Guards: contiguous-prefix precondition via `readContiguousPrefixError`; source exists, `!isHelper`, `visible === true`; `targetPosition` is number in `0..countVisible-1`; target slot visible.
  3. `s === d` → `{ ok: false, errorCode: TABS_MOVE_SAME_POSITION }` (no diagnostics required beyond code; UI maps to notify).
  4. Build `slotMoves` per D-MOVE-1 (visible prefix only; ascending `fromTabIdx` order optional — snapshot-first makes order irrelevant):
     - Always include `{s→d}`.
     - If `s < d`: add `{i→i-1}` for `i` from `s+1` to `d`.
     - If `s > d`: add `{i→i+1}` for `i` from `d` to `s-1`.
     - Entry shape identical to delete: `{ fromIndex, fromTabId, fromTabIdx, toIndex, toTabId, toTabIdx }` (frozen objects).
  5. `names.byIndexAfter`: only physical indices in rotation range `[min(s,d)..max(s,d)]`; value at each index = name that occupies that slot after rotation (read from pre-mutation slots). No `hideSlot`.
  6. `landing` per D-MOVE-2: compute from active `tabIdx` + moved/shifted range; return `{ tabIdx, index, tabId }`.
  7. `affectedTabIds`: union of move endpoints (`sourceSlot.tabId`, landing `tabId`) and every `fromTabId`/`toTabId` in `slotMoves` — **no hidden-slot tabIds**.
  8. Return frozen `{ ok: true, plan: { operation: "move", operationId, sourceSlot, targetTabIdx: d, slotMoves, landing, affectedTabIds, names: { byIndexAfter } } }`.
- **Rules:** `state.mdc` (pure), `naming.mdc`, `amd.mdc`.

#### `tabs/state/buildTabMutationPlan.js` (MODIFY)

- **Role:** delete-only plan builder (rename **not** needed). **Lines:** ≤120 (unchanged budget).
- Export `countVisible` and `readContiguousPrefixError` on the AMD return object (or as named properties) for `buildTabMovePlan` reuse — minimal duplication, no shared helper file.
- No behavioral change to delete plan logic.
- **Rules:** `state.mdc`, `amd.mdc`.

#### `tabs/state/reduceTabMutationApply.js` (MODIFY)

- **Role:** pure reducer widen for move. **Lines:** ≤130.
- **Snapshot-first content reads (D-MOVE-1):** before any `slotMoves` write, deep-clone and record content-logical fields (`name`, `visible`, `button`) for every `fromIndex` in the plan; apply writes from that snapshot map, not from progressively mutated `byIndex`. Behavior-neutral for delete (delete's ascending shift-left is already safe; snapshot-first makes move safe when pair order would otherwise read stale sources).
- **`hideSlot` block:** gate on `plan.hideSlot` presence (`operation === "delete"` only). Move plans omit `hideSlot`.
- **Move postcondition (D-MOVE-7):** extend `passesPostcondition`:
  - Existing contiguous-prefix + min-visible checks remain.
  - **Add explicit same-visible-set check for `plan.operation === "move"`:** `visibleCountAfter === visibleCountBefore` AND every dashboard slot's `visible` flag equals its pre-commit value. Contiguous-prefix alone does not prove visibility preservation when content permutes — the explicit check is required.
- Landing / `isActive` / `activeIndex` unchanged from delete path.
- **Rules:** `state.mdc`, `naming.mdc`.

#### `tabs/config/mutationCodes.js` (MODIFY)

- **Role:** constants. **Lines:** ~22.
- Add `SAME_POSITION: "TABS_MOVE_SAME_POSITION"`.
- No other code changes unless a move-specific apply code is needed later (none for tranche 2).
- **Rules:** `naming.mdc`, `amd.mdc`.

#### `tabs/actions/routeTabMutationAction.js` (MODIFY)

- **Role:** router. **Lines:** ≤70.
- `isTabMutationAction(type)` → true for `DELETE` **and** `MOVE`.
- `route` → `handleTabMutationDelete` or `handleTabMutationMove` by type.
- **Rules:** `amd.mdc`, `naming.mdc`.

#### `tabs/createTabsController.js` (MODIFY)

- Remove `MOVE` from `isDeferredAction` (keep `DUPLICATE`, `REORDER` deferred).
- No other routing changes (mutation router already wired from tranche 1).
- **Rules:** `feature-structure.mdc`.

#### `widgetBase/actions/handleApplyTabMutation.js` (MODIFY)

- **Role:** action handler widen to delete|move. **Lines:** ≤150.
- Guard: accept `plan.operation === "delete" | "move"`; else `{ ok: false }`.
- **Delete path (unchanged):** park deleted-slot onCanvas widgets (`reason: "tabDelete"`); then per-pair park/take ascending.
- **Move path (D-MOVE-1, snapshot-first):**
  1. **Read phase:** for every `slotMoves` entry, `readCanvasWidgetsByTab(fromTabId)` into a map `widgetsByFromTabId` **before any park/take**.
  2. **Park phase:** park all collected widgets (all moves) to launchpad (`reason: "tabMove"`).
  3. **Take phase:** for each move pair, take widgets from the snapshot map onto `toTabId` preserving layout/colour (`reason: "tabMove"`); existing `PLACE_ON_CANVAS_SUCCEEDED` tabId persistence flow unchanged.
- Deleted-slot park block gated on `plan.operation === "delete"` only.
- **No `routedTabIds` writes** (tranche-1 precedent).
- **Rules:** `error-handling.mdc`, `state.mdc`.

#### `widgetBase/actions/handleRestoreTabMutationSnapshot.js` (MODIFY)

- **Role:** rollback handler widen. **Lines:** ≤130.
- Replace `reverseMoves` live reads with **snapshot-sourced re-place** for both delete and move:
  - When `physicalStarted === true`: for each widget in `snapshot.byId`, if frame was onCanvas at prepare time, `ROUTE_TO_LAUNCHPAD` then `TAKE_FROM_LAUNCHPAD` using **snapshot** `tabId` + layout (not current live tabId from reverse slotMoves iteration).
  - Then `restoreFrames` from `snapshot.byId` (existing path).
- Delete rollback behavior must remain equivalent (snapshot tabId matches pre-mutation placement).
- **Rules:** `error-handling.mdc`.

#### `dienststelle/actions/applyTabMutation.js` (MODIFY)

- **Role:** apply widen to delete|move. **Lines:** ≤150 (may require extracting one helper to stay under budget).
- Drop `plan.operation !== "delete"` guard; accept delete|move.
- **Delete path:** unchanged (clear deleted scope, then per-pair moves).
- **Move path (snapshot-sourced, align with singleSelect `applyTabMutationWrites`):**
  1. Read all scope entries needed from the prepare snapshot (keyed by scopeId / filterKey) into a local map **before any host write**.
  2. Clear all `from` scopes in the rotation range (all `fromTabIdx` in `slotMoves`, deduped).
  3. Write snapshot values to each `to` scope via existing `dispatchScopeWrite` + `applyHostScope` primitives.
- Pair iteration order irrelevant (snapshot-sourced). Stale-run checks unchanged.
- **Rules:** `error-handling.mdc`.

#### `tabs/effects/confirmAndDispatchTabMove.js` (NEW)

- **Role:** effect (mirror `confirmAndDispatchTabDelete.js`). **Lines:** ≤100.
- Entry `confirmAndDispatchTabMove(_KDB, _request)` where `_request = { tabIndex, tabId, visibleCount }`:
  1. In-flight guard: if `pendingPromises.tabMutation` → `notify` with `TAB_DELETE_CONFLICT_TEXT` (operation-generic), return.
  2. If `message.choose` unavailable → `console.warn` fail-closed, return.
  3. Build options: visible positions `1..N` (1-based labels per `_tabNumber`) **excluding** current `tabIndex + 1`; opaque ids `"pos-" + targetTabIdx` mapped back to 0-based `targetPosition`.
  4. `await svc.choose({ code: "TABS_MOVE_CHOOSE", title: TAB_MOVE_CHOOSE_TITLE, message: TAB_MOVE_CHOOSE_TEXT, options })` — rejected Promise → fail-closed.
  5. On chosen id: `await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex, tabId, targetPosition, source: "tabsEditUi" } })`.
  6. Surface failures: `TABS_MOVE_SAME_POSITION` → `notify` warning (should not happen from UI); `TABS_MUTATION_CONFLICT` → `notify` with conflict text; other → `showAlert` with `TAB_MOVE_FAILED_TITLE` + diagnostic text builder (mirror delete's `buildDeleteFailedText` pattern).
- **Rules:** `dom.mdc`, `error-handling.mdc`.

#### `tabs/effects/renderTabEditIcons.js` (MODIFY)

- **Role:** effect. **Lines:** ≤150 — **extract** `onMoveIconClick` to `confirmAndDispatchTabMove.js` if handler addition would exceed budget (file is 146 lines as-built).
- Add move enablement: `cfg.key === "move" && TAB_MOVE_UI_ENABLED === true && !isTabMutationInFlight(context)` (mirror delete gate).
- Bind `confirmAndDispatchTabMove` on move icon click when enabled; deferred stub when disabled.
- In-flight disable applies to **all** icons when `tabMutation` pending (extend `isDeleteEnabled` pattern to a generic `isIconEnabled(cfg, context)` or parallel `isMoveEnabled`).
- **Rules:** `dom.mdc`, `error-handling.mdc`.

#### `tabs/config/defaults.js` (MODIFY)

- Add:
  - `TAB_MOVE_UI_ENABLED: false` (flip to `true` only after Cognos smoketests pass — delete precedent).
  - `TAB_MOVE_CHOOSE_TITLE` — e.g. `"Registerkarte verschieben"`.
  - `TAB_MOVE_CHOOSE_TEXT` — e.g. `"Wählen Sie die neue Position für diese Registerkarte."` (count-bearing copy assembled at call time from `state.limits.maxUserTabs` if needed; this text is countless).
  - `TAB_MOVE_FAILED_TITLE` — e.g. `"Registerkarte verschieben fehlgeschlagen"`.
- Reuse `TAB_DELETE_CONFLICT_TEXT` for move conflict (do not duplicate).
- **Rules:** `naming.mdc`, `amd.mdc`.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `tabs/tabMutationApply` | saga phase 7 (commit) | **delete:** content-logical shift-left, hide last visible slot, landing `isActive` (unchanged). **move:** snapshot-first content permutation per `slotMoves` over rotation range only; no visibility changes; landing `isActive`; postcondition adds same-visible-set assert | none |

No other reducer changes. `reduceTabsAction` MOVE case stays no-op.

## Section E. Published selectors

None new. Existing tabs selectors must reflect post-commit state without change — verify, don't edit.

## Section F. Public API wiring

No new public surfaces. `tabs/move` rides existing `_KDB.api.tabs.dispatch`. Runtime: unchanged tranche-1 keys (`tabMutationRunId`, `pendingPromises.tabMutation`, owner snapshots).

## Sections G/H/I. Harness

Not applicable — verified in live Cognos via smoketests below (consistent with tranche 1).

## Section J. Acceptance criteria (self-verification)

1. All Wave A/B files exist per Section B; line counts ≤150 per file; ReadLints clean per file after each wave.
2. Template criteria 2–11 of `_executionSpecTemplate.md` §J hold.
3. Delete regression: tranche-1 smoketests still pass after shared-saga refactor (Wave A gate before Wave B).
4. Move plan: middle→first, first→last, adjacent moves produce correct `slotMoves` and `names.byIndexAfter` rotation-range-only maps.
5. `s === d` dispatch (console) → `outcome: "aborted"`, code `TABS_MOVE_SAME_POSITION`, dashboard byte-identical.
6. `writebackGet` after move: `tabs`, `wgts[].tab`, `filt.sels[].tab`, `filt.dstl.byTab` consistent with new layout (§3.8); includes `outcome: "degraded"` runs.
7. Exactly one `tabs:changed` with `source: "tabsMutation"` per successful move; no intermediate subscriber fires during saga.
8. Landing checks (D-MOVE-2): active moved tab → `d`; active in shifted range → new position; active outside range → unchanged slot.
9. Forced `widgetApply` failure → rollback; GET byte-identical to pre-move.
10. Double dispatch while saga runs → conflict notify, one saga.
11. UI (after `TAB_MOVE_UI_ENABLED: true`): choose flow dispatches move; cancel/close moves nothing; missing messageService fail-closed.

## Section K. Forbidden actions

Template list applies; additionally: do not modify the contract deltas or `messageService.md`; do not touch `core/services/messageService/`; do not modify `singleSelect` tab-mutation files; do not add render barrier for move; do not emit new event names; no native `confirm`/`alert`; do not implement duplicate/reorder; do not permute hidden slots; do not change delete MutationResult shape or semantics.

## Section L / M. Reporting & reviewer handoff

Template sections apply. Wave A completion report: line counts for all Wave A files + delete regression smoketest note. Wave B completion report: line counts + move smoketest checklist (§Smoketests). Writeback function planner sign-off required for Wave B owner files before PO acceptance.

---

## Smoketests (console-first, then UI after flag flip)

**Console-first (Wave A, `TAB_MOVE_UI_ENABLED` stays `false`):**

```js
// Helpers: read active tabIdx, dispatch move, run writebackGet
await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex: 2, targetPosition: 0, source: "smoketest" } }); // middle → first
await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex: 0, targetPosition: countVisible - 1, source: "smoketest" } }); // first → last
await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex: 1, targetPosition: 2, source: "smoketest" } }); // adjacent s<d
await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex: 2, targetPosition: 1, source: "smoketest" } }); // adjacent s>d
await _KDB.api.tabs.dispatch({ type: "tabs/move", payload: { tabIndex: 1, targetPosition: 1, source: "smoketest" } }); // s===d abort → TABS_MOVE_SAME_POSITION
```

Per successful move verify:
- GET consistency: `wgts[].tab` indices, tab names rotated in state + Cognos buttons (`syncTabsDomFromState`), filters follow via singleSelect/dienststelle scopes.
- Landing: set active tab to moved tab / shifted-range tab / outside-range tab before each move; assert post-move active matches D-MOVE-2.
- Rollback: inject forced failure in `widgetApply` (test hook or temporary throw); assert byte-identical GET vs pre-move snapshot.
- Conflict: double-dispatch while first saga in flight → second resolves conflict, one mutation applied.

**UI (after `TAB_MOVE_UI_ENABLED: true`, Wave B):**
- Move icon enabled in rename session; choose dialog shows positions `1..N` excluding current; selection executes move with `source: "tabsEditUi"`.
- Icons disabled during in-flight mutation; re-enabled after final `tabs:changed`.
- `TABS_MOVE_SAME_POSITION` / conflict / failure surfacing per `confirmAndDispatchTabMove.js`.

---

## Wave execution checklist

| Step | Action |
|---|---|
| 1 | Wave A: build `tabMutationSagaSupport` + `runTabMutationSaga`, refactor delete wrapper, add `buildTabMovePlan`, reducer widen, codes, routing |
| 2 | Wave A gate: delete smoketests pass unchanged; line counts + ReadLints |
| 3 | Cross-review Wave A files (tabs planner + PO) |
| 4 | Wave B: widgetBase apply/restore, dienststelle apply, move UI effect + `renderTabEditIcons` + defaults |
| 5 | Wave B gate: move console smoketests; line counts + ReadLints |
| 6 | Cross-review Wave B owner files (writeback function planner sign-off) |
| 7 | Cognos end-to-end smoketests → flip `TAB_MOVE_UI_ENABLED: true` |
| 8 | Doc-sync: `eventSubscribe.md`, master delta §11 item 6 |

---

## As-built notes (2026-08-12)

Benign build deviations from Section B/C:

1. Choose param name `choices` (not `options`) in `confirmAndDispatchTabMove.js`.
2. Extracted helper files: `tabEditIconActions.js`, `applyTabMutationMove.js`, `applyTabMutationScopeOps.js`.
3. Diagnostics message on `TABS_MOVE_SAME_POSITION` (`SAME_POSITION` abort path).
4. **hostResync phase (2026-08-12):** after `cognosSync`, saga dispatches `singleSelect/resyncTabMutationHost` + `dienststelle/resyncTabMutationHost` via `tabMutationSagaSupport.resyncOwners` to re-push committed filter selections — widget routing/commit/traverse reload page-context scopes and revert phase-3 writes without this late resync (mirror of writeback restore step 22).
5. **hostResync reconcile-first (2026-08-12, after first Cognos smoketest):** the plain re-push was a silent no-op because singleSelect's cached `filterApisByInstanceId` pointed at detached controls after the traverse (write + verify both hit the stale object). The singleSelect handler now captures committed selections first, runs `reconcileFilterInstances` (reason `tabMutation`) to refresh the host API map, re-pushes to the fresh controls, and overlays the captured selections back into state (reconcile adopts host values into `currentSelection`, hence capture-first). Dienststelle is unaffected (live per-call host lookup).
6. **Reducer name apply (2026-08-13):** smoketest after duplicate+add+move-left showed the displaced slot keeping the vacated name (widgets moved correctly). `reduceTabMutationApply` now applies `plan.names.byIndexAfter` for `operation === "move"` via the same `applyNamesByIndexAfter` helper duplicate already uses; delete `hideSlot.baselineName` path unchanged.

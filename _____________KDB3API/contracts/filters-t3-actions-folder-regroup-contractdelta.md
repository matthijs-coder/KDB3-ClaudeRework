# Contract Delta: T3 — SS / DS / NMS `actions/` folder regroup

> Behaviour-neutral AMD path-only. Not a product WP. Not S16 / F / C2 / D.
> After GO: grok 4.6 implementer uses §6 as exclusive allowlist. No execution-spec.

---

**Status:** `Implemented` (PO GO folder regroup 2026-08-18; dirty-tree **B**; Cognos N/A)
**Parent:** `architecture/projectStructureRules.md`; `feature-structure.mdc`;
`contracts/futureTodo/nms-slim-handoff-launch-prompt.md` §7
**Type:** `structure contract delta`
**Authoring AI:** captain / Grok 4.6 explore, 2026-08-18
**WP:** captain-picked **T3** after PO asked to choose a letter (Cognos deferred).

---

## 1. Purpose

`singleSelect`, `dienststelle`, and `nativeMultiSelect` still keep
`parameterSet*` and `*TabMutation*` mixed in a flat `actions/`. This WP
moves them into `actions/parameterSet/` and `actions/tabMutation/`.
Import strings change. Behaviour does not.

---

## 2. Why T3 (captain pick — grok 4.6 live evidence)

| Letter | Verdict | Why |
|---|---|---|
| **T3** | **Pick** | Only bounded WP that is not a dead undo, needs no Cognos, does not reopen closed tracks |
| F | No | Catalog still one PNG; no picker; `header/setIcon` exists but history-without-picker is dead |
| S16 | No | `widget_removed` commits but undo needs a shell → **D**. No live `widgetBase/remove` UI (settings delete parks via launchpad, already replayable) |
| C2 | No | Disposed dispatch already warn+return; no crash. C1 leave-until-bug |
| D / E | No | D needs `createWidget` spike + PO. E until datasource switching is a product |

Rename Cognos stays `Implemented — awaiting PO Cognos` (PO deferred host).

---

## 3. PO decisions (GO = accept all)

| # | Choice | Decision |
|---|---|---|
| 1 | Letter | **T3 only.** Path-only regroup. Not F / S16 / C2 / D. |
| 2 | Behaviour | **Zero** reducer / effect / Cognos / DOM / history changes. AMD path strings + file moves only. |
| 3 | Layout | `actions/parameterSet/` + `actions/tabMutation/` per owner. No `helpers/` `common/` `misc/` `shared/`. |
| 4 | NMS history | Do **not** create `nativeMultiSelect/actions/history/`. Existing `history/` folders stay. `handleNativeMultiSelectHistoryReplay.js` stays in `actions/` root. |
| 5 | `restoreSupport.js` | **Stay** at `dienststelle/actions/restoreSupport.js`. Both clusters import it. Do not copy. Do not invent `shared/`. |
| 6 | Kernel | `core/utils/filters/tabMutationRun/` untouched. No second kernel. No `_KDB.services.tabMutation`. |
| 7 | Dirty tree | **12 dirty tabMutation MOVE files** (Track S / restoreDeleted). GO must pick **A** commit those 12 first, then T3; or **B** T3 on dirty tree (git rename + existing mods). Do not edit those 12 bodies in T3. |
| 8 | Cognos | **N/A.** Structure only. |
| 9 | Log | After implement: append `architecture/structure-remediation-log.md`. Do not edit `structure-audit.md`. |

---

## 4. Counts

| Owner | → tabMutation | → parameterSet | stay `actions/` root |
|---|---:|---:|---:|
| SS | 10 | 16 | 10 |
| DS | 10 | 4 | 1 (`restoreSupport.js`) |
| NMS | 11 | 6 | 4 |
| **Total** | **31** | **26** | **15** |

Outside the three `actions/` folders: **two** controllers (DS + NMS). SS controller stays (only imports `dispatchSingleSelectAction.js`). Orchestrators: no update.

---

## 5. Dirty overlap (MOVE files — do not edit bodies)

**`M` (9)**

- `singleSelect/actions/{applyTabMutation,buildTabMutationTransfers,prepareTabMutation}.js`
- `dienststelle/actions/{applyTabMutation,prepareTabMutation,resyncTabMutationHost}.js`
- `nativeMultiSelect/actions/{applyTabMutation,prepareTabMutation,resyncTabMutationHost}.js`

**`??` (3)**

- `{singleSelect,dienststelle,nativeMultiSelect}/actions/applyTabMutationRestoreDeleted.js`

No dirty parameterSet MOVE. No dirty STAY.

---

## 6. Exclusive allowlist

Base: `KDB3/js/dashboard/filters/<owner>/actions/`

### 6.1 SS → `tabMutation/`

`prepareTabMutation.js`, `buildTabMutationTransfers.js`, `applyTabMutation.js`,
`applyTabMutationRestoreDeleted.js`, `applyTabMutationWrites.js`,
`restoreTabMutationSnapshot.js`, `resyncTabMutationHost.js`,
`guardTabMutation.js`, `resolveTabMutationSnapshotTarget.js`,
`routeTabMutationAction.js`

### 6.2 SS → `parameterSet/`

`routeParameterSetIdentityAction.js`, `handleParameterSetRestore.js`,
`handleParameterSetClear.js`, `handleParameterSetResync.js`,
`handleParameterSetRunFinished.js`, `parameterSetRuntime.js`,
`parameterSetRuntimeRegistry.js`, `parameterSetWritebackGenerationGuards.js`,
`parameterSetResyncApply.js`, `parameterSetResyncApplyPair.js`,
`clearParameterSetInstances.js`, `restoreEntryHandlers.js`,
`applyRestoreSelection.js`, `applyRestoreSelectionCore.js`,
`filterRestoreSupport.js`, `recordRestoreOutcome.js`

### 6.3 SS STAY

`dispatchSingleSelectAction.js`, `routeIdentityAction.js`,
`reconcileFilterInstances.js`, `reconcileRunSupport.js`,
`notifyInventoryReconciledOwners.js`, `awaitOwnerInventoryAck.js`,
`inventoryOwnerDispatch.js`, `applyOwnerSelection.js`,
`applySpecialSelectionPolicy.js`, `ownerSelectionSupport.js`

STAY files rewrite sibling AMD only (e.g. dispatcher → `./tabMutation/routeTabMutationAction.js`).

### 6.4 DS → `tabMutation/`

`prepareTabMutation.js`, `applyTabMutation.js`, `applyTabMutationMove.js`,
`applyTabMutationDuplicate.js`, `applyTabMutationRestoreDeleted.js`,
`applyTabMutationScopeOps.js`, `restoreTabMutationSnapshot.js`,
`resyncTabMutationHost.js`, `guardTabMutation.js`, `routeTabMutationAction.js`

### 6.5 DS → `parameterSet/`

`routeParameterSetAction.js`, `parameterSetRestore.js`,
`parameterSetClear.js`, `applyRestorePlan.js`

### 6.6 DS STAY

`restoreSupport.js`

### 6.7 NMS → `tabMutation/`

`prepareTabMutation.js`, `applyTabMutation.js`, `applyTabMutationDelete.js`,
`applyTabMutationMove.js`, `applyTabMutationDuplicate.js`,
`applyTabMutationRestoreDeleted.js`, `applyTabMutationScopeOps.js`,
`restoreTabMutationSnapshot.js`, `resyncTabMutationHost.js`,
`guardTabMutation.js`, `routeTabMutationAction.js`

### 6.8 NMS → `parameterSet/`

`routeParameterSetAction.js`, `parameterSetRestore.js`,
`parameterSetRestoreGlobal.js`, `parameterSetClear.js`,
`parameterSetHostApply.js`, `parameterSetContext.js`

### 6.9 NMS STAY

`handleFilterDockConfirm.js`, `routeNativeMultiSelectUserCommit.js`,
`handleNativeMultiSelectHistoryReplay.js`, `collectWritebackSnapshot.js`

### 6.10 Controllers (AMD strings only)

- `dienststelle/createDienststelleController.js` — `routeParameterSetAction` + `routeTabMutationAction`
- `nativeMultiSelect/createNativeMultiSelectController.js` — `routeTabMutationAction` + `routeParameterSetAction` + `parameterSetContext`

### 6.11 This contract

---

## 7. Do NOT touch

`KDB.js`; gallery / toolbox; tabs saga; tabs history; `widgetBase/**`;
`header/**`; `tabMutationRun/**` bodies; SS/DS/NMS `history/` folders;
`collectReplayHandlers.js`; widgetBase history; `.mdc` rules;
`structure-audit.md`.

Moved `guardTabMutation.js` files may add one `../` on existing kernel AMD
strings. Kernel files themselves stay.

---

## 8. Acceptance

1. After move, RequireJS still resolves every SS/DS/NMS action. No leftover
   `./actions/foo.js` pointing at a moved file.
2. `restoreSupport.js` remains one file at DS `actions/` root.
3. No new `shared/` / `helpers/` / NMS `actions/history/`.
4. Diff is path + git rename. No reducer/effect/DOM/Cognos/history body edits.
   The 12 dirty MOVE files: path only, bodies unchanged.
5. Controllers still dispatch the same action types. No public API change.
6. Append one T3 row to `architecture/structure-remediation-log.md`.

---

## 9. Out of scope

F, S16, C2, D, E, C/G/H, A2, gallery, `KDB.js`, remaining >150,
rename Cognos, WP5 merge, new `_KDB.*`, `.mdc` edits.

---

## As-built 2026-08-18

**Moved** — 31 → `actions/tabMutation/`, 26 → `actions/parameterSet/` (54 git mv + 3 untracked `applyTabMutationRestoreDeleted.js` filesystem moves).

**Stay** — 15 at `actions/` root, including DS `restoreSupport.js`.

**Controllers** — DS + NMS AMD path strings only. SS controller unchanged.

**Reviews** — mechanical + semantic **PASS-WITH-NITS**. Structure log appended. Dirty-12 bodies remain Track S (expected under B).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-18 | `Draft — awaiting PO implement-GO` | vastenburg (captain) | PO asked captain to pick a letter. Grok 4.6 explore: T3 only viable. STOP for **GO folder regroup** + dirty-tree A or B. |
| 2026-08-18 | `Draft → Implementing` | vastenburg | **GO folder regroup.** Dirty-tree **B** (no commit; PO did not ask). Path-only. Three exclusive grok-4.6 writers: SS / DS / NMS. |
| 2026-08-18 | `Implementing → Implemented` | vastenburg (captain review) | Dual grok-4.6 PASS-WITH-NITS. Product nit: T3 row appended to `structure-remediation-log.md`. Cosmetic nits left (CRLF, DS controller 12 AMD pre-existing). No JS follow-up. Cognos N/A. |
| 2026-08-18 | Track P **O** (park) | vastenburg (captain) | After T3: dual explore — no next code WP. F/C2/S16/D/E stay parked. |

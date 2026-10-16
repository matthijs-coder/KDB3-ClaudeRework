# Contract Delta: `nativeMultiSelect` History (kale values)

> Delta on `contracts/nativeMultiSelect.md` and `contracts/filterDock.md`. Kale **value** undo/redo. Not tab-permutation (that is `tabs_move`).

---

**Status:** `Approved — Cognos green 2026-08-16`
**Parent contract:** `contracts/nativeMultiSelect.md`
**Depends on:** `historyService.md` §5 / §10, `nativeMultiSelect.md` §2 / §5 (name+scope identity; dest-skip), `filterDock.md` §9 (owner routing), dienststelle `history/` (folder + dispatch-replay), `tabs-history-contractdelta.md` (skipHistory on tab-mutation)
**Type:** `feature module contract delta`
**Authoring AI:** planner, 2026-08-16
**Related:** T1b of `contracts/futureTodo/post-nms-slim-futuretodo-launch-prompt.md`. P0/P1: no history/events — superseded for kale-value undo only.

---

## 1. Purpose

Undo/redo of **unowned kale values** (global and page-context) that the user confirms in the Cognos native multi-select UI (`.filterItemWrapper` + native OK). Replay writes through `_KDB.api.nativeMultiSelect.dispatch` + `replaceFilterContext` (name + scope). historyService never writes filter state.

Tab MOVE undo already restores page kale **as content that follows the tab**. This WP is undo of a kale confirm itself.

---

## 2. Commit trigger (PO 2026-08-16)

**filterDock confirm-only.** Kale lives in `.filterItemWrapper`; commit is native `[data-tid="okClickable"]`. Cognos may portal that footer **outside** `#filterDockContainer`. filterDock owns a **document capture** for that OK/Cancel only when `lastClickedFilter.filterType === "nativeMultiSelect"` and the click is **not** already inside the dock root (SS Fertig stays on the existing dock listener). OK/Cancel detection uses `closest`, not `target.matches` (inner `span` clicks). NMS does **not** add its own click listener.

Confirm host-read is **not** a wait on `getFilterValues`. Capture-OK is pre-apply. `new` comes from selected popup option **labels** on the mount (`is-selected` / `aria-selected` / checkbox), handed off as `confirmedLabels`. NMS maps each label to `{ d, u }`: reuse `u` from the pre-OK host/`byScope` row when `d` matches; otherwise build TM1 unique name `{itemId}->:[TMR].[{dim}].[{hier}].[{d}]` from `filterConfig.itemId` (Jahr: `d` `"2022"`, `u` `[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]->:[TMR].[Jahr_flach].[Jahr_flach].[2022]`). Skip a label (warn) if `itemId` is missing and no reused `u`. No poll, no MutationObserver.

filterDock remains observer + router: it does **not** write kale values (Cognos already applied them on OK). NMS is a thin confirm-consumer, not a Sicht/Dienststelle-style popup owner.

| Must | Must not |
|---|---|
| Classify kale as `nativeMultiSelect` after owned types | Steal sicht / specialSingleSelect / singleSelect / dienststelle |
| Route `stateChanged` only | `popupReady`, `filtersReady`, header/committed-display, `needsPopupDisplayResync` |
| NMS handles `confirm` only | Apply `replaceFilterContext` on confirm (host already wrote) |
| Update `byScope` + maybePush | Alle / popup sanitizing / out-click / write+verify |
| | Fact-events without a consumer; polling |

**Classification** (`filterDock/effects/resolveFilterType.js`), after existing owned returns:

- `isNative` → `"nativeMultiSelect"` (positive claim, analogous to `isSingleSelect` → `singleSelect`)
- residual `!isSingleSelect && !isHierarchy` remains fallback → `"nativeMultiSelect"`
- hierarchy without downstream stays `"unknown"`

Route type stays `"nativeMultiSelect"` (not a filterType string `isNative`). `__savedProperties/filterPropId.js` is the Cognos property dump (`filterPropId` → `_KDB.properties.filterPropObj`); JS must be re-uploaded/set on the dashboard object for Cognos to see it.

Confirm handler still filters with `listUnowned` / claim: a mis-routed wrapper that is not unowned kale is a no-op (no step).

**Empty confirm:** if `confirmedLabels` is `[]` (or mapped `new` is empty), update `byScope` but **do not** push a history step (GET `filt.pcfs` already omits empty `vals`). Missing popup mount (`confirmedLabels` null) is a no-op, not an empty confirm.

**Missing `byScope` row:** `old.values = []`. First confirm after SET restore uses the restored row.

---

## 3. Ownership / replay

| Piece | Owner |
|---|---|
| Dock classify + OK handoff | `filterDock` |
| Frame build + push after user confirm | `nativeMultiSelect` |
| Stack | `historyService` |
| Replay | handler → `_KDB.api.nativeMultiSelect.dispatch` |
| SET restore / tab-mutation | `skipHistory: true` (no kale-value step; `tabs_move` covers permutation) |

- Identity = **itemName + scope key**, never `itemId` as content id.
- Scope key: `"global"` or stripped page `scopeId` (`stripTabpanel`). `byScope` write reuses an existing matching key when one exists.
- Values: `[{ d, u }, …]` (same clone as GET `filt.pcfs`).
- Step key: `filter_nativeMultiSelect`.
- One step per confirmed `(itemName, scopeKey)`. Other kale in the same scope are not extra steps.
- `pushCommittedStep` rejects `old === new` — skip no-op OK.

```js
{
  key: "filter_nativeMultiSelect",
  timestamp: <ms>,
  old: { itemName, scopeKey, values: [/* previous byScope */] },
  new: { itemName, scopeKey, values: [/* mapped confirmedLabels */] }
}
```

**Confirm (normative):** `nativeMultiSelect/filterDockStateChanged`. Ignore unless `payload.interactionType === "confirm"`. Require `confirmedLabels` as an array (missing/null = warn + no-op; empty `[]` = empty OK). Resolve itemName from `filterLabel` (fallback `itemNameHint`). Resolve scope (page: `tabs/resolveFilterScopeTargets` via `tabId`). Enumerate `listUnowned`. Match by itemName. `old` = previous `byScope` row (or `[]`). `new` = map `confirmedLabels` to `{d,u}` (reuse `u` from pre-OK host/`byScope` when `d` matches; else TM1 unique name from `filterConfig.itemId`). Merge the confirmed item into `byScope` via `nativeMultiSelect/tabMutationScopeWrite` (full scope array; do not wipe siblings). Do **not** `replaceFilterContext` on user OK. Then `maybePush` unless skipHistory / isHistoryReplay / empty new values / old===new. Warn if live item missing or a label has no `u`.

**Replay (normative):** `nativeMultiSelect/historyReplayRequested` with `isHistoryReplay: true`, `skipHistory: true`. Effect: `lookupNativeMultiSelectApiByName(itemName, scope)` → `replaceFilterContext(api, targetValue.values)` → reducer `byScope` write. Missing host: skip + warn, handler returns `false` (dest-skip, no create). Do not go through `parameterSetHostApply` (`SKIPPED` / `RESTORE_FAILED` stay out).

---

## 4. Folder + wiring

```
dashboard/filters/nativeMultiSelect/history/
  buildCommittedStep.js
  maybePushNativeMultiSelectHistoryStep.js
  applyNativeMultiSelectHistoryReplay.js
  createNativeMultiSelectHistoryReplayHandler.js
  stageNativeMultiSelectHistoryReplayHandler.js
```

Confirm/replay **actions** stay under `actions/` (flat; no T3 regroup):

- `effects/resolveNativeMultiSelectConfirmScope.js` (page `scopeId` is null on filterDock handoff — `ownerRequired`; resolve `tabId` via `tabs/resolveFilterScopeTargets`)
- `effects/mapNativeMultiSelectConfirmedValues.js` (labels → `{d,u}`; reuse known `u` or TM1 unique name from `itemId`)
- `effects/prepareNativeMultiSelectConfirmWrite.js`
- `actions/handleFilterDockConfirm.js`
- `actions/handleNativeMultiSelectHistoryReplay.js`
- `actions/routeNativeMultiSelectUserCommit.js` (one controller import covering both)

filterDock:

- `config/ownerRoutes.js` — `nativeMultiSelect` in `SUPPORTED_FILTER_TYPES` + `OWNER_ROUTE_MAP` (`apiKey: "nativeMultiSelect"`, `allowDeprecatedScopeProjection: false`, `stateChanged` only)
- `effects/resolveFilterType.js` — fallback as §2
- `effects/bindDockClickListener.js` — dock root + document capture for NMS portal OK (skip if click already inside dock root)
- `effects/readClickIntent.js` — OK/Cancel via `closest`
- `effects/readConfirmedNativeSelectLabels.js` — selected option labels at NMS confirm (`null` if popup mount missing)
- `effects/resolveFilterInteraction.js` / `buildFilterDockHandoff.js` — `confirmedLabels` on NMS confirm handoff
- `runtime/cleanupFilterDockRuntime.js` — abort `nmsDocumentClick`

- Stage from `__orchestratorNativeMultiSelect.js` (2 → 3 AMD imports).
- Controller 8 → 9 (the user-commit router). Dispatch fn ≤60.
- `collectReplayHandlers.js` gains `filter_nativeMultiSelect`.
- Destroy: `cleanupNativeMultiSelectRuntime` nulls `historyReplayHandlerContribution`.
- Line budget: JS ≤150, orchestrator ≤120, controller fn ≤60, ≤10 AMD imports.
- No `helpers/` `common/` `misc/` `shared/`. No new `_KDB.*`. No T3 folder regroup.

---

## 5. Acceptance / Cognos

1. Change page kale, native OK; undo restores previous values; redo the confirmed values. No `message.choose`.
2. Same for **global** kale.
3. Option click without OK does **not** push. Cancel does **not** push.
4. SET restore and tab-MOVE do **not** push `filter_nativeMultiSelect`.
5. Tab-MOVE undo still uses `tabs_move`; a kale OK after MOVE is its own step.
6. Empty OK (all options off): `byScope` updates, no history step.
7. Missing dest host on replay: skip + warn, pointer unchanged.

---

## 6. Out of scope

- Tab-CRUD history (done: `tabs_move`).
- `widgetVis/history/`.
- Full dock-owner surface (popupReady, Alle, filtersReady, header resync, write+verify).
- Standing poll / host-callback / second NMS click listener (document OK stays in filterDock).
- `parameterSetHostApply` SET codes on replay.
- Changing GET skip-empty `vals` (T2).
- T3 folder regroup.
- Host-item create.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-16 | `Draft — awaiting PO GO on commit-trigger` | planner | Live NMS had no user-commit path. |
| 2026-08-16 | `Approved — implement GO` | PO vastenburg | Kale is `.filterItemWrapper`; commit is native OK. Trigger = filterDock confirm-only. Empty confirm = no step. |
| 2026-08-16 | `Approved — DOM snapshot, no poll` | PO vastenburg | `d` display (e.g. `"2022"`), `u` MUN. Poll rejected. Confirm `new` from popup labels + reuse/`itemId` TM1 map. |
| 2026-08-16 | `Approved — Cognos green` | PO vastenburg | Page + global Jahr OK → undo/redo. Option/cancel no step. SET/MOVE no `filter_nativeMultiSelect`. Empty OK no step. |

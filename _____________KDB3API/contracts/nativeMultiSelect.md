# Module Contract: `nativeMultiSelect`

> Kale Cognos multi-select filters that no other owner claims (global **and** page-context). Formerly `pageContextPlain`. v3 bucket remains `filt.pcfs`.

---

**Status:** `Approved` — P2 implemented 2026-08-15 (rename + global GET/SET).
**Owner module:** `nativeMultiSelect`
**Type:** `feature module`
**Authoring AI:** planner, 2026-08-15
**Related:** `writeback.md` §4.3 / §6.3, `nativeMultiSelect-rename-and-global-contractdelta.md`, `tabs-tabCrud-contractdelta.md`, `nativeMultiSelect-history-contractdelta.md` (T1b Cognos green 2026-08-16)
**Supersedes:** `pageContextPlain.md` (stub only after this tranche)

---

## 1. Purpose

Own unowned Cognos multi-select filter *values* (kale / native host items): persist via `filt.pcfs`, restore on SET, permute **page-context** values across tab delete/move/duplicate, and undo/redo **user-confirmed** kale values. Global values do not follow tab-CRUD. User confirm is filterDock native OK only (`nativeMultiSelect-history-contractdelta.md`).

## 2. Ownership

- Canonical state: `_KDB.state.filters.nativeMultiSelect`
- Canonical writer: `nativeMultiSelect` reducer only.

```js
_KDB.state.filters.nativeMultiSelect = {
  lifecycle: "idle", // idle | ready | error | disposed
  byScope: {
    // [scopeId | "global"]: [ { itemId, itemName, sourceId, values: [{ d, u }] } ]
  },
  errorCode: null,
  errorMessage: null
};
```

Page `scopeId` is live-derived via `tabs/resolveFilterScopeTargets`. Key `"global"` is the global host scope (not a tab index).

## 3. Runtime

`_KDB.runtime.nativeMultiSelect`: buckets `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`, plus `tabMutationRunId`, `tabMutationSnapshots`, `parameterSetRunId`. Destroy zeros both runIds.

## 4. Public API

`_KDB.api.nativeMultiSelect` — `mount`, `destroy`, `dispatch`, `getState`. Dispatch + reducer only.

| Type | Role |
|---|---|
| `nativeMultiSelect/mountReady` | mount |
| `nativeMultiSelect/prepareTabMutation` | saga prepare (page scopes only) |
| `nativeMultiSelect/applyTabMutation` | saga filterApply |
| `nativeMultiSelect/restoreTabMutationSnapshot` | rollback |
| `nativeMultiSelect/resyncTabMutationHost` | post-commit resync |
| `nativeMultiSelect/tabMutationScopeWrite` | reducer write (`byScope`; allows `"global"`) |
| `nativeMultiSelect/parameterSetClearRequested` | SET / newDashboard clear |
| `nativeMultiSelect/parameterSetRestoreRequested` | SET restore `filt.pcfs` |
| `nativeMultiSelect/collectWritebackSnapshotRequested` | GET snapshot (sync, host-enumerate) |
| `nativeMultiSelect/filterDockStateChanged` | filterDock OK handoff; confirm-only consumer (no host write) |
| `nativeMultiSelect/historyReplayRequested` | history undo/redo (`isHistoryReplay`, `skipHistory`) |
| `nativeMultiSelect/error` | error |
| `nativeMultiSelect/destroy` | destroy |

ParameterSet before tab-mutation; collect before generic reducer dispatch. filterDock confirm and history replay after those dedicated routers.

## 5. Cognos

- Enumerate: `getAllGlobalFilterItems` and `getAllPageContextFilterItems`.
- Write: `replaceFilterContext` only.
- Lookup: tab-mutation **source clear** by itemId+source scope; **dest write** by name+dest scope (itemIds are per-scope), then persist the dest host `itemId` in `byScope`; **resync** by dest itemId then name; SET restore by name+scope. Page-scope match is `_tabpanel` strip equality only; never treat `"global"` as a page alias.
- Claim uses kennzahlen-source `readClaimDefinition` with `scopeType` `"global"` or `"pageContext"`. Empty `itemId` is not claimed.
- Missing dest host: skip + warn; do not create items.

## 6. Folder

```txt
dashboard/filters/nativeMultiSelect/
  config/actions.js
  config/parameterSetCodes.js
  state/initialState.js
  state/createNativeMultiSelectReducer.js
  actions/handleTabMutationAction.js
  actions/tabMutationSupport.js
  actions/prepareTabMutation.js
  actions/applyTabMutation.js
  actions/applyTabMutationScopeOps.js
  actions/applyTabMutationDelete.js
  actions/applyTabMutationMove.js
  actions/applyTabMutationDuplicate.js
  actions/restoreTabMutationSnapshot.js
  actions/resyncTabMutationHost.js
  actions/routeParameterSetAction.js
  actions/parameterSetClear.js
  actions/parameterSetRestore.js
  actions/parameterSetRestoreGlobal.js
  actions/parameterSetHostApply.js
  actions/parameterSetContext.js
  actions/collectWritebackSnapshot.js
  effects/ensureNativeMultiSelectRuntime.js
  effects/cleanupNativeMultiSelectRuntime.js
  effects/readClaimDefinition.js
  effects/isUnownedNativeMultiSelectItem.js
  effects/stripTabpanel.js
  effects/listUnownedNativeMultiSelectItems.js
  effects/lookupNativeMultiSelectRef.js
  effects/lookupNativeMultiSelectRefByName.js
  effects/resolveNativeMultiSelectConfirmScope.js
  effects/mapNativeMultiSelectConfirmedValues.js
  effects/prepareNativeMultiSelectConfirmWrite.js
  actions/handleFilterDockConfirm.js
  actions/handleNativeMultiSelectHistoryReplay.js
  actions/routeNativeMultiSelectUserCommit.js
  history/buildCommittedStep.js
  history/maybePushNativeMultiSelectHistoryStep.js
  history/applyNativeMultiSelectHistoryReplay.js
  history/createNativeMultiSelectHistoryReplayHandler.js
  history/stageNativeMultiSelectHistoryReplayHandler.js
  createNativeMultiSelectController.js
  __orchestratorNativeMultiSelect.js
```

**As-built 2026-08-16 (T1b kale-value history):** filterDock confirm-only (`nativeMultiSelect` in `OWNER_ROUTE_MAP`, `stateChanged` only). Page scope via `tabs/resolveFilterScopeTargets` (`tabId`; dock `scopeId` is null / `ownerRequired`). Step key `filter_nativeMultiSelect`. Confirm `new` comes from popup `confirmedLabels` mapped to `{d,u}` (reuse known `u` by `d`, else TM1 `{itemId}->:[TMR].[{dim}].[{hier}].[{d}]`). Empty OK updates `byScope`, no history step. No host poll after OK.

**As-built 2026-08-16:** Jahr uses `isNative: "true"` plus `isSingleSelect: "false"`.

**As-built 2026-08-16:** `stripTabpanel` owner-local (`dashboard/filters/nativeMultiSelect/state.js` (`stripTabpanel`)); `tabMutationSupport` wraps shared `tabMutationRun` library (DS-style guard/stale); `actions/` files remain flat (folders not moved); `lookupNativeMultiSelectRef` and `lookupNativeMultiSelectRefByName` not merged.

**As-built 2026-08-16 (dest itemId / GET page collect):** Kale host `itemId`s are per-scope. Tab-mutation dest write (move/duplicate shift+clone) resolves the dest host by **name + dest scope** (`lookupNativeMultiSelectRefByName`, dest-skip + warn if missing, never create); reducer `byScope` stores the dest host’s live `itemId`. Resync uses that dest `itemId` first, then name. Source clear still uses source `itemId` + source scope. GET `filt.pcfs` page collect uses `listUnowned(scopeId)` only; identities stay `"global|"+nm` vs `String(tab)+"|"+nm`; global is never listed into page entries. Page lookups use `_tabpanel` strip equality only. Historical P0 dest lookup-by-itemId (`pageContextPlain-tabMutation-contractdelta.md` §2.2) is superseded for the live owner.

## 7. Out of scope

Host-item create; `classifyFilterInstance`; renaming `filt.pcfs`; tab-CRUD of global; consolidation refactor; new `_KDB.*` keys; full filterDock owner surface (popupReady / Alle / filtersReady / write+verify). Kale-value history is in `nativeMultiSelect-history-contractdelta.md` (confirm-only). v2→v3 mapping of `filt.pcfs` is `writebackMap` (T2.1); NMS GET/SET owners are unchanged.

---

## Approval Log

| Date | Notes |
|---|---|
| 2026-08-15 | Renamed from `pageContextPlain`; global scope added (PO GO) |
| 2026-08-16 | T1b kale-value history: filterDock confirm-only + `filter_nativeMultiSelect` (Cognos green) |

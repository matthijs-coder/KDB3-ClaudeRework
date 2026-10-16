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

As built: 13 files; exports are listed per file. `__orchestratorNativeMultiSelect.js` is a shim over `index.js`. Tab-mutation code sits in `tabMutation/`, parameter-set restore and the GET collect in `restore.js`.

```txt
dashboard/filters/nativeMultiSelect/
  __orchestratorNativeMultiSelect.js                  shim over index.js (path kept for KDB.js)
  commit.js                                           commitFilterDockConfirm, mapConfirmedValues, prepareConfirmWrite, buildCommittedStep, emitFilterConfirmed (emits `filters:confirmed` with the confirmed column and values; widgetVis derives Jahr and the year), findByName
  config.js                                           actions, parameterSetCodes, tabMutationCodes, HISTORY_STEP_KEY
  history.js                                          createHistoryReplayHandler, applyHistoryReplay, mergeReplayItem
  hostFilterIo.js                                     warnDestSkip, writeRef, applyByItemId, applyByName
  index.js                                            registerNativeMultiSelect
  inventory.js                                        createClaimIndex, readClaimDefinition, isUnownedFilterDescriptor, listUnownedItems, listAllUnownedScopes, lookupRef, lookupRefByName
  restore.js                                          parameterSetClear, parameterSetRestore, collectWritebackSnapshot
  state.js                                            initialState, createReducer, cloneValues, cloneItem, materializeValues, stripTabpanel, readByScope, ...
  tabMutation/
    apply.js                                          applyTabMutation
    guard.js                                          guardRun, isStale, cancelled, resolveScopeIdForSlot, pushUnique
    hostScopes.js                                     failed, clearScopeItems, writeScopeFromSnapshot, resyncTabMutationHost
    snapshot.js                                       prepareTabMutation, restoreTabMutationSnapshot
```

**As-built 2026-08-16 (T1b kale-value history):** filterDock confirm-only (`nativeMultiSelect` in `OWNER_ROUTE_MAP`, `stateChanged` only). Page scope via `tabs/resolveFilterScopeTargets` (`tabId`; dock `scopeId` is null / `ownerRequired`). Step key `filter_nativeMultiSelect`. Confirm `new` comes from popup `confirmedLabels` mapped to `{d,u}` (reuse known `u` by `d`, else TM1 `{itemId}->:[TMR].[{dim}].[{hier}].[{d}]`). Empty OK updates `byScope`, no history step. No host poll after OK.

**As-built 2026-08-16:** Jahr uses `isNative: "true"` plus `isSingleSelect: "false"`.

**As-built 2026-08-16:** `stripTabpanel` owner-local (`dashboard/filters/nativeMultiSelect/state.js` (`stripTabpanel`)); `tabMutation/guard.js` holds the run-guard option bag, the tabs-facet read and the slot resolver over `_core/tabMutation.js` / `_core/tabMutationScopes.js` (DS-style guard/stale; Phase 2 W6b: one shared runner for all three filter owners); `lookupRef` and `lookupRefByName` (`inventory.js`) are not merged. (Superseded layout note: the former flat `actions/*.js` and `effects/*.js` files are now the files listed above.)

**As-built 2026-08-16 (dest itemId / GET page collect):** Kale host `itemId`s are per-scope. Tab-mutation dest write (move/duplicate shift+clone) resolves the dest host by **name + dest scope** (`lookupRefByName` in `inventory.js`, dest-skip + warn if missing, never create); reducer `byScope` stores the dest host’s live `itemId`. Resync uses that dest `itemId` first, then name. Source clear still uses source `itemId` + source scope. GET `filt.pcfs` page collect uses `listUnowned(scopeId)` only; identities stay `"global|"+nm` vs `String(tab)+"|"+nm`; global is never listed into page entries. Page lookups use `_tabpanel` strip equality only. Historical P0 dest lookup-by-itemId (`pageContextPlain-tabMutation-contractdelta.md` §2.2) is superseded for the live owner.

## 7. Out of scope

Host-item create; `classifyFilterInstance`; renaming `filt.pcfs`; tab-CRUD of global; consolidation refactor; new `_KDB.*` keys; full filterDock owner surface (popupReady / Alle / filtersReady / write+verify). Kale-value history is in `nativeMultiSelect-history-contractdelta.md` (confirm-only). v2→v3 mapping of `filt.pcfs` is `writebackMap` (T2.1); NMS GET/SET owners are unchanged.

---

## Approval Log

| Date | Notes |
|---|---|
| 2026-08-15 | Renamed from `pageContextPlain`; global scope added (PO GO) |
| 2026-08-16 | T1b kale-value history: filterDock confirm-only + `filter_nativeMultiSelect` (Cognos green) |

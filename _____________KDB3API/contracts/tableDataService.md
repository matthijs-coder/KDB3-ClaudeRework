# Module Contract: `tableDataService`

> Skeleton-only iteration. Litmustest target: validate shared-service rules and the new `_executionSpecTemplate.md` against a non-feature-module module type. Out of scope of this iteration is full Cognos behavior; see Section 10.

---

**Status:** `Approved`
**Owner module / service:** `tableDataService`
**Type:** `shared service`
**Authoring AI:** Claude (Opus 4.7), 2026-05-12
**Reviewed by:** user (2026-05-12)
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## User decisions (Phase 1.4)

| ID | Decision |
|----|----------|
| **Q1** | **C — Hierarchy deferred.** Skeleton handles only list-type tables. Hierarchy data is recorded as a deferred design candidate (`hierarchyDataService`) in `_____________KDB3API/architecture/_archive/openDesignCandidates.md`; promotion criterion is the first hierarchy consumer in a later port. |
| **Q2** | **Flat state subtree.** `_KDB.state.tableData.<tableName>` (e.g. `_KDB.state.tableData.pkz`). Keeps selector paths short and consistent with the `_KDB.state.kdbControl.<subsystem>` shape from the first litmustest. Leaves room for sibling `_KDB.state.tableData._meta` if ever needed. |
| **Q3** | **Name-based.** `tableName` corresponds to a Cognos visualisation title; callers pass strings like `"pkz"`. Handle-based resolution may be added later as an internal helper without changing the public method signatures. |
| **Q4** | **`_KDB.services.tableData`.** Aligns with the architecture authority documents (`stateOwnership.md`, `state.mdc`). Legacy `_KDB.services.getTableData` is not part of this contract; any compat-shim is a separate concern. |
| **Q5** | **Named writer helpers.** Internal mutations go through writer helpers (`markTableLoading`, `markTableLoaded`, `markTableFailed`, `markTableStale`, `markTableDisposed`); no internal reducer or `actionTypes.js` for the skeleton. Promote to an internal reducer + dispatch only when cross-cutting transitions appear in a later port. |

**Approval:** Approved on 2026-05-12 by user (recommendations applied verbatim above).

---

## 1. Purpose

`tableDataService` loads, caches and exposes per-table row data from Cognos data queries. It owns `_KDB.state.tableData.*` with structured per-table lifecycle and freshness fields. It deduplicates concurrent loads of the same table, emits fact-events on load completion or failure, and exposes a small named-method API for consumers to read rows, wait for rows, force a reload, or ensure freshness.

This service supersedes the legacy `_KDB.services.getTableData.loadTableData` entry point and the unstructured `_KDB.data.tables.byHandle` cache; mirroring or migration of legacy callers is out of scope of this contract iteration.

---

## 2. Ownership

- Canonical state subtree: `_KDB.state.tableData.<tableName>` per loaded table.
- Initial state shape per table (one-screen sketch):

```js
_KDB.state.tableData[tableName] = {
  lifecycle: "idle",        // idle | loading | ready | error | disposed
  freshness: "stale",       // fresh | stale
  rows: undefined,          // populated on ready
  rowCount: 0,
  lastLoadedAt: null,       // epoch ms
  errorCode: null,          // populated on error
  errorMessage: null        // populated on error
};
```

The container `_KDB.state.tableData` is owned by the service. The exact nesting (`_KDB.state.tableData.<tableName>` flat, or `_KDB.state.tableData.byName[<tableName>]` nested) is **Q2** below.

- Foreign-write paths: none. Foreign modules request changes through this service's public methods; actual state writes happen only through internal writer helpers (Section 5).

## 3. Runtime

- Owner namespace: `_KDB.runtime.tableData`.
- Buckets used:

| Bucket | Shape / role |
|---|---|
| `pendingLoads` | `Object<tableKey, Promise<sourceRows>>` — one in-flight load per table key. Non-forcing callers such as `loadTable`/`waitForRows` may reuse the promise; `reloadTable` aborts and replaces it. Cleared on resolution, rejection or abort. |
| `abortControllers` | `Object<tableKey, AbortController>` — one controller per in-flight load; `reloadTable`, `abortTable` and `destroy` call `.abort()` on the previous controller. |
| `subscriptions` | empty in this skeleton iteration; reserved for future cross-service subscriptions. |
| `notifiedLoadFailures` | `Object<tableKey, errorMessage>` — toast-dedupe fingerprint for `notifyLoadFailed`. Same `errorMessage` for the same key does not toast again. Cleared on successful `markTableLoaded` for that key and on `destroy`. Not cleared on abort. |
| `canvasWidgetsForLookup` / `canvasWidgetsForLookupPromise` | Boot cache for `resolveTableWidgetId` (performance hotfix 2026-08-23, CLUSTER_E §S2.7c). One `listCanvasWidgets({ waitUntilReady: true })` per boot, not per table. Slice 5 must not remove this. |

- Cleanup trigger: `destroy()` (Section 4) aborts every `abortControllers[key]`, awaits or discards every `pendingLoads[key]`, then clears runtime buckets. No state mutation on destroy beyond the disposed lifecycle transition.
- Notes on non-standard resources: none.

## 4. Public API

### 4b. Shared service

- Surface: `_KDB.services.tableData`.
- Style: **named methods** (per `module-public-api.mdc` category default for services).
- Methods:

```js
_KDB.services.tableData = {
  loadTable: loadTable,
  readRows: readRows,
  readPendingLoad: readPendingLoad,
  waitForRows: waitForRows,
  reloadTable: reloadTable,
  ensureFreshRows: ensureFreshRows,
  readTableState: readTableState,
  registerConfiguredLoads: registerConfiguredLoads,
  abortTable: abortTable,
  destroy: destroy
};
```

### 4c. Array input contract (production implementation)

All public read/load methods except `destroy`, `registerConfiguredLoads` and parameterless `readTableState` accept an **array of input items**, not a single `tableName` string. `abortTable` uses the same array input.

Each item must include at least one table key:

| Key | Role |
|---|---|
| `tableName` | Name/title-based table lookup |
| `tableid` | Handle-based table lookup |
| `widgetId` | Widget-id-based lookup (used by TopN helper reads) |

Optional per-item fields:

| Field | Type | Default | Role |
|---|---|---|---|
| `shape` | `"row"` \| `"column"` | `"row"` | Output orientation after `shapeTableRows` |
| `pick` | `string[]` or pick-mapping objects | `["display","use"]` | Cell field projection; allowed keys: `display`, `use`, `d`, `u`, `value`, `v`, `label`, `caption` |
| `title` / `name` | `string` | — | Optional title hint for name resolution |
| `role` | `string` | — | Optional role hint |
| `isCoreTable` | `boolean` | `false` | Core-table load policy |

Example TopN helper read input:

```js
[{
  widgetId: helperWidgetId,
  shape: "row",
  pick: ["display", "use", "d", "u", "value", "v", "label", "caption"]
}]
```

Return unwrapping rule: a one-item input array resolves to that single shaped result directly; a multi-item input array resolves to an array of shaped results in input order. For `shape:"row"` the shaped result is `object[]`; for `shape:"column"` it is `{ columnNames, rowCount, columns }`. `readPendingLoad` does not use this unwrap. One item returns the load promise or `null`. Any other input returns `null`.

`reloadTable` is the force-reload boundary: abort any in-flight load for the same table key, mark loading, run the Cognos load effect, commit shaped rows to `_KDB.state.tableData`, then return shaped rows. Callers that reuse the same `widgetId` across helper runs (for example `widgetTopN`) must use `reloadTable` after each successful helper apply/render rather than `readRows`, `waitForRows` or `ensureFreshRows`, because cache freshness alone does not prove the latest helper binding was read.

Method contracts:

| Method | Signature | Triggers load? | Returns |
|---|---|---|---|
| `loadTable(input)` | `(TableInputItem[]) => Promise<ShapedRows \| ShapedRows[]>` | yes | loads tables not yet ready; returns shaped result(s) using the single-vs-multi unwrapping rule. |
| `readRows(input)` | `(TableInputItem[]) => ShapedRows \| ShapedRows[] \| undefined` | no | cached shaped rows/result(s) or `undefined`. Never throws. |
| `readPendingLoad(input)` | `(TableInputItem[]) => Promise \| null \| undefined` | no | One resolved item: the in-flight load promise, or `null` when none. Any other input: `null`. Disposed or thrown: `undefined`. Does not start or abort a load. Not the shaped-row unwrap. See `drillthrough-hierarchy-wait-open-contractdelta.md` §5. |
| `waitForRows(input)` | `(TableInputItem[]) => Promise<ShapedRows \| ShapedRows[]>` | yes, if not `ready` | resolves with shaped result(s) on `ready`; rejects on `error`. Deduplicates via `pendingLoads`. |
| `reloadTable(input)` | `(TableInputItem[]) => Promise<ShapedRows \| ShapedRows[]>` | always | aborts existing load for each key, forces fresh load, returns shaped result(s). |
| `ensureFreshRows(input)` | `(TableInputItem[]) => Promise<ShapedRows \| ShapedRows[]>` | only if `freshness !== "fresh"` or `lifecycle !== "ready"` | cached or freshly reloaded shaped result(s). |
| `readTableState(input?)` | `(TableInputItem[] \| undefined) => object \| object[] \| undefined` | no | per-table state snapshot(s), or the full tableData subtree when called without input. |
| `registerConfiguredLoads(tablesConfig)` | `(object) => Promise<string[]>` | yes | registers configured core tables and returns loaded keys. |
| `abortTable(input)` | `(TableInputItem[]) => Promise<void>` | no | aborts in-flight load(s) for each resolved key. Silent: no toast, no `tableData:loadFailed`. Lifecycle stays `loading` unless a later load commits. Disposed → `Promise.reject("tableDataService disposed")`. |
| `destroy()` | `() => void` | no | aborts all in-flight loads; transitions each per-table `lifecycle` to `disposed`. |

- Internal mutation style (independent of public style): see **Q5** below — either named writer helpers or an internal reducer + dispatch path.
- Lifecycle subset declared per table: `idle | loading | ready | error | disposed`.
- Freshness vocabulary declared per table: `fresh | stale` (separate dimension per `lifecycleVocabulary.md`).

## 5. Readers / Writers

**For shared services:**

- Deliberate read methods exposed on `_KDB.services.tableData`:
  - `readRows(input)` — pure cache read for one or more table input items; returns shaped rows or `undefined`. Does not trigger a load.
  - `readPendingLoad(input)` — one-item read of the in-flight load promise, or `null`. Does not trigger a load.
  - `readTableState(input?)` — per-table or full snapshot of `_KDB.state.tableData`.

Services do not publish a separate selector registry for their own state subtree per `module-public-api.mdc`.

**For all state owners:**

- Internal writer helpers (reducer-only or writer-only depending on Q5 outcome). Not exposed across module boundaries.
  - `markTableLoading(_KDB, { tableName })` — transitions to `lifecycle: "loading"`.
  - `markTableLoaded(_KDB, { tableName, rows, rowCount })` — transitions to `lifecycle: "ready"`, `freshness: "fresh"`, sets `lastLoadedAt`.
  - `markTableFailed(_KDB, { tableName, errorCode, errorMessage })` — transitions to `lifecycle: "error"`.
  - `markTableStale(_KDB, { tableName })` — sets `freshness: "stale"` without touching lifecycle.
  - `markTableDisposed(_KDB, { tableName })` — transitions to `lifecycle: "disposed"`.

## 6. Events

- **Emitted (facts):**
  - `tableData:loadFinished` — payload `{ tableName: string, rowCount: number }` — emitted after `markTableLoaded` commits.
  - `tableData:loadFailed` — payload `{ tableName: string, errorCode: string, errorMessage: string }` — emitted after `markTableFailed` commits.
- **Subscribed:**
  - none in this skeleton iteration.
- **Request-events:** none.

Both emitted events are catalogued in [_____________KDB3API/architecture/eventSubscribe.md](_____________KDB3API/architecture/eventSubscribe.md).

## 7. Dependencies

- `_KDB` (always).
- `_KDB.events` (emit only).
- `_KDB.runtime.tableData.canvasFacet` — stamped by `__orchestratorTableData` from `_KDB.services.cognosHost.canvas` (slice 2). `resolveTableWidgetId` reads it through `effects/readCanvasFacet.js`.
- `_KDB.runtime.tableData.dataQueryFacet` — stamped by `__orchestratorTableData` from `_KDB.services.cognosHost.dataQuery` (slice 4). `readTableQueryResult` reads it through `effects/readDataQueryFacet.js`. `waitForTableQueryResult.js` is dead (not on the load path; do not revive). Deep files do not look up `_KDB.services.cognosHost`.
- `_KDB.runtime.tableData.visualizationFacet` / `_KDB.runtime.tableData.widgetsFacet` — stamped by `__orchestratorTableData` from existing `cognosHost.visualization` / `cognosHost.widgets` (not a new facet/op). Leftover Hierarchy `HideData` park wrap only: unpark instance ids `HideData` / `_none` / `_1`; body live `containsignorecase` `"b"`; repark then unsignaled `renderWidget` gated by `shouldRestorePark`. Authority: `tableData-hierarchy-park-filter-contractdelta.md`.
- Table-name source — see **Q3**: either `_KDB.properties.loadingTablesPropObj` (REDESIGN2 pattern, name-based) or `_KDB.config.tables` (KDB3 pattern, handle-based).

`core/services/tableData/index.js` (`createTableDataService`) stays at 150 lines / 10 AMD. Slice 4 does not add a named method. `abortTable` is unchanged (cluster D): array of `{tableName|tableid|widgetId}`; disposed → `Promise.reject(new Error("tableDataService disposed"))`; aborted loads silent.

## 8. Cognos Touchpoints

tableData does **not** call `_KDB.cognosAPI` after slice 4. Host access is ring 1 only (`cognosHostService.md` §4 review rule).

- `effects/readDataQueryFacet.js` — owner choke point for `_KDB.runtime.tableData.dataQueryFacet`.
- `core/services/tableData/queryRead.js` (`readTableQueryResult`) — calls `dataQueryFacet.readQueryRows(widgetId, {budgetMs: 60000, intervalMs: 100, signal})` and maps Outcome → owner dialect `{status:"ready"|"failed"|"aborted"|"empty", result}`. `result` is `TableRowsResult` (`{ columns, columnNames, rowCount }`), never a live query handle. `"empty"` is owner-only (`!widgetId` before the facet is called). Timeout / flatten / host failure map to `"failed"` (B4), not `"empty"`.
- `effects/waitForTableQueryResult.js` — **dead.** Not imported. Load path is `readParkedTableQueryResult` → `readTableQueryResult` → `dataQueryFacet.readQueryRows`. Do not revive this wait; do not route park through `waitForQueryResult`.
- `effects/readCanvasFacet.js` — canvas DTO for widget-id resolution (slice 2). `visType` / `visTitle` arrive on that DTO; tableData does not call `_KDB.cognosAPI.visualization` or `.canvas`.
- `core/services/tableData/loadLifecycle.js` (`runLoadTableWork`) — consumes the flattened DTO from `readParkedTableQueryResult` (park-listed leftovers) or plain `readTableQueryResult` inside that wrap. AMD 10→9: `normalizeTableData.js` is no longer imported (file left on disk unused). Failed query still takes `markTableFailed` + toast (B4 / D2 dedupe). Abort is silent. Park protocol: `tableData-hierarchy-park-filter-contractdelta.md`.

`abortTable` / `abortTableLoad` / `abortPreviousHierarchyWarmup` are unchanged. Flattening (`core/services/cognosHost/facets/dataQuery/rows.js` (`flattenQueryRows`)) lives in ring 1. Live host method remains `_KDB.cognosAPI.dataQuery.getDataQueryResult` inside `facets/dataQuery/resolveDataQueryHostApi.js` only.

## 9. Folder Layout

Target tree for port / skeleton (under `TEST/tableDataService-port/` for the litmustest; under `KDB3/js/core/services/tableData/` for production). Per Q5, no `config/actionTypes.js` and no internal reducer.

```txt
tableData/
  __orchestratorTableData.js
  createTableDataService.js
  state/
    initialState.js
    writers/
      markTableLoading.js
      markTableLoaded.js
      markTableFailed.js
      markTableStale.js
      markTableDisposed.js
  effects/
    __orchestratorEffects.js
    loadTableFromCognos.js
  events/
    eventNames.js
```

## 10. Out Of Scope

- Hierarchy data — owner: separate `hierarchyDataService` (or merged in, depending on **Q1**).
- Aggregate `tables:loaded` event covering many tables — owner: bootstrap orchestrator, not this service.
- Real Cognos queries beyond stubbed `Promise.resolve(...)` fixtures in the harness — owner: production wiring (later iteration).
- Super-user table-name resolution and permission checks — owner: the **consumer** (kdbControl visibility + metricsTree Freigabe per [kdbControl-developer-mode-toggle-contractdelta.md](./_archive/kdbControl-developer-mode-toggle-contractdelta.md)), not this service. Config key `superuser` is a normal `load: true` leftover; this service only caches rows.
- Migration of legacy `_KDB.data.tables.byHandle` consumers (`syncSettingsVisibility.js`, `applyStartupSicht.js`, etc.) — owner: those consumers, in a later port.
- Compat read-through bridge between new `_KDB.state.tableData` and legacy `_KDB.data.tables` — separate decision, not in this contract.

## 11. Resolved Questions (archive)

Original Q1–Q5 are resolved in **User decisions (Phase 1.4)** at the top of this document.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-12 | `Draft` created | Claude (Opus 4.7) | Initial draft with Q1–Q5 awaiting user decisions. |
| 2026-06-14 | `Array input API delta` | GPT-5.5 | Documented production array-input contract with `widgetId`, `shape`, `pick`; `reloadTable` as force-reload boundary for helper reuse callers such as `widgetTopN`. |
| 2026-08-20 | `abortTable` + toast-dedupe | cluster D | Public `abortTable(input)` aborts in-flight loads silently. Runtime `notifiedLoadFailures` dedupes load-failure toasts per tableKey while the same `errorMessage` holds. |
| 2026-09-09 | Hierarchy leftover `HideData` park | PO vastenburg | Owner stamps `visualizationFacet` + `widgetsFacet`. Load wrap unpark → `renderWidget` → read → repark. No new public method. Delta: `tableData-hierarchy-park-filter-contractdelta.md`. |
| 2026-09-09 | Park smoke-fail Rec A HOLD | captain | Cognos smoke: host matches filter instance id (`HideData_none` survives `{ itemId: "HideData" }`). Wrap-only: also remove `_none`/`_1`; post-repark unsignaled render with second `shouldRestorePark` check. JS pending GO. |
| 2026-09-09 | Park wrap Rec A implemented | captain + dual grok 4.6 | `core/services/tableData/queryRead.js` (`readParkedTableQueryResult`) only. Dual PASS. Cognos smoke pending PO. |
| 2026-09-09 | HideData park body = attribute equals | PO vastenburg | Numeric `from`/`to` closed. `parkFilter.body` is `{ values: ["1"] }` on the three leftover keys. Wrap unchanged. |
| 2026-09-09 | HideData park body = containsignorecase b | PO live dump | Query empty with `conditions.operator: "containsignorecase"`, `values: ["b"]`. Config body matches dump. Wrap unchanged. |
| 2026-09-10 | HideData park write = keepexclude | PO console | `addFilter` + `conditionsInfo`/`keepexclude` sticks (leftovers stay empty). Read-shape `conditions` must not be sent to `addFilter`. |
| 2026-09-10 | 3A `localFilterRecipes.js` | PO vastenburg + dual grok 4.6 | Authored `parkFilter: "hideDataContainsB"`; `tables.js` resolves to `{ itemId, body }` before stamp. No `_KDB.config.localFilterRecipes`. Wrap unchanged. Delta: `tableData-local-filter-recipes-contractdelta.md`. |
| 2026-10-14 | `readPendingLoad` | PO vastenburg | Sync read of an in-flight load promise. Does not start a load. Delta: `drillthrough-hierarchy-wait-open-contractdelta.md` §5. Code reviewed. |

> When implementation diverges from the contract, stop, present the deviation, update this contract, and resume per the synchronisation clause in `feature-structure.mdc`.

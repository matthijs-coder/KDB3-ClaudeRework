# Execution Spec: `tableDataService` (`getTableData` direct port)

> CP-1 draft execution spec for porting legacy-known-good table data loading from `_______KDB3/KDB3/js/core/services/getTableData/` into the production redesign tree under the existing approved `tableDataService` contract.
>
> This is **not** a new `dataTableLoad` service. `dataTableLoad`, `getTableData`, and `tableDataService` refer to the same intended capability; the canonical redesign label is `tableDataService`, exposed as `_KDB.services.tableData`.

---

**Status:** `CP-1 draft - pending user approval`
**Module / contract:** `_____________KDB3API/contracts/tableDataService.md`
**Phase:** `full direct port from legacy getTableData`
**Authoring AI:** GPT-5.5, 2026-05-16
**Executing AI:** TBD
**Reviewer:** user + mid-tier AI

---

## CP-1 Proposed Decision Summary

The existing approved `tableDataService` contract is the canonical base. This spec proposes the following CP-1 decisions for this direct-port tranche:

1. **Canonical label:** use `tableDataService`, not `dataTableLoad` or `getTableData`.
2. **Production target:** `_____________KDB3API/KDB3/js/core/services/tableData/`.
3. **Public surface:** `_KDB.services.tableData`, named-method service.
4. **Input model:** support both simple string input and object input:
   - `loadTable("pkz")`
   - `loadTable({ tableHandle: "pkz", title: "PKZ", widgetId: "..." })`
5. **Legacy source of truth:** `_______KDB3/KDB3/js/core/services/getTableData/`; use `_______REDESIGN2/KDB3/js/base/tasks/init/loadAllTableData/` only as historical context for init-task behavior.
6. **State ownership:** `_KDB.state.tableData` is the serializable status/data subtree owned by this service.
7. **Runtime ownership:** `_KDB.runtime.tableData` owns pending loads, AbortControllers, and any temporary query/runtime handles.
8. **Legacy `_KDB.data.tables.byHandle` cache:** do not preserve as canonical state; if compatibility is required later, document it as a separate compatibility shim.
9. **Hierarchy behavior:** legacy supports `visType === "hierarchy"`; this spec keeps hierarchy handling inside this tranche only if CP-1 explicitly accepts it. If not accepted, hierarchy files/paths must be omitted and documented as deferred to `hierarchyDataService`.
10. **Bootstrap registration:** likely required later in `KDB.js`, but out of scope for this tranche; document as deferred integration work after CP-2.

If any proposed CP-1 decision is rejected, update this spec before execution.

---

## Section A. Pre-flight Read List

The executing AI must read these files in order before producing output. Its first response must echo one sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/architecture/stateOwnership.md`
13. `_____________KDB3API/architecture/eventSubscribe.md`
14. `_____________KDB3API/contracts/tableDataService.md`
15. This execution spec.

The executing AI must not create or edit any file until those summaries are present and accepted by the supervising AI or reviewer.

---

## Section B. Legacy Inputs

Primary source files:

```txt
_______KDB3/KDB3/js/core/services/getTableData/
  __orchestratorGetTableData.js
  loadTableData.js
  resolveTableWidgetId.js
  readTableQueryResult.js
  normalizeTableData.js
  storeTableData.js
  storeHierarchyData.js
```

Context-only source files:

```txt
_______KDB3/KDB3/js/core/bootstrap/tablesData/
  __orchestratorTablesData.js
  loadTablesData.js
  buildTableWidgetIdMap.js

_______KDB3/KDB3/js/core/bootstrap/statePromises/
  createRuntimePromise.js
  createTablePromises.js
  initializeTablesState.js

_______KDB3/KDB3/js/core/events/tablesData.js
```

Historical fallback only:

```txt
_______REDESIGN2/KDB3/js/base/tasks/init/loadAllTableData/
```

Do not modify, move, rename, or delete any legacy file.

---

## Section C. Mapping Table

| New production file | Legacy source file(s) | Alignment note |
|---|---|---|
| `KDB3/js/core/services/tableData/__orchestratorTableData.js` | `getTableData/__orchestratorGetTableData.js` | Rename service registration from `_KDB.services.getTableData` to canonical `_KDB.services.tableData`; initialize `_KDB.state.tableData` and `_KDB.runtime.tableData`; no bootstrap registration in this tranche. |
| `KDB3/js/core/services/tableData/createTableDataService.js` | `getTableData/loadTableData.js` | Convert returned single function into named-method service surface; add disposed-state guard; keep legacy load semantics as `loadTable`, plus read/wait/reload helpers from contract. |
| `KDB3/js/core/services/tableData/state/initialTableState.js` | Contract + legacy implicit cache shape | Create serializable per-table state shape with lifecycle/freshness/error fields; no Promise/function/Cognos objects in state. |
| `KDB3/js/core/services/tableData/state/writers/markTableLoading.js` | `loadTableData.js` implicit in-flight behavior | Owner-only writer for `loading` lifecycle. |
| `KDB3/js/core/services/tableData/state/writers/markTableLoaded.js` | `storeTableData.js`, `loadTableData.js` | Store normalized table rows/status under `_KDB.state.tableData[tableKey]`; legacy `_KDB.data.tables.byHandle` is not canonical. |
| `KDB3/js/core/services/tableData/state/writers/markTableFailed.js` | `readTableQueryResult.js`, `loadTableData.js` null-on-failure paths | Preserve null/empty/timeout distinctions in fields; do not reinterpret empty data as error. |
| `KDB3/js/core/services/tableData/state/writers/markTableDisposed.js` | No legacy direct equivalent | Required by `module-public-api.mdc` disposed-state discipline. |
| `KDB3/js/core/services/tableData/effects/resolveTableWidgetId.js` | `resolveTableWidgetId.js` | Port widget resolution by title with explicit Cognos wrapper dependencies and mandatory try/catch. |
| `KDB3/js/core/services/tableData/effects/readTableQueryResult.js` | `readTableQueryResult.js` | Port async wait/result fetch; keep 60000ms/100ms legacy wait defaults; add AbortSignal/stale-result checks where rule-alignment requires. |
| `KDB3/js/core/services/tableData/effects/normalizeTableData.js` | `normalizeTableData.js` | Pure normalization helper; preserve `columns`, `columnNames`, `rowCount` shape. |
| `KDB3/js/core/services/tableData/effects/storeHierarchyData.js` | `storeHierarchyData.js` | Conditional on CP-1 hierarchy inclusion; otherwise omit and document deferred `hierarchyDataService`. |
| `KDB3/js/core/services/tableData/events/eventNames.js` | `core/events/tablesData.js`, `eventSubscribe.md` | Only create if this service emits `tableData:*` fact-events; use existing catalog names from `tableDataService.md`, not legacy `table:loaded` / `tables:loaded`. |

---

## Section D. Folder Tree

Create these files only after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/core/services/tableData/
  __orchestratorTableData.js
  createTableDataService.js
  state/
    initialTableState.js
    writers/
      markTableLoading.js
      markTableLoaded.js
      markTableFailed.js
      markTableDisposed.js
  effects/
    resolveTableWidgetId.js
    readTableQueryResult.js
    normalizeTableData.js
    storeHierarchyData.js        (conditional: only if CP-1 accepts hierarchy in this tranche)
  events/
    eventNames.js                (only if fact-events remain in scope)
```

Do not create `TEST/`, harness files, browser fixtures, local Node tests, or bootstrap registration files in this tranche.

---

## Section E. Public API Contract For This Port

The service object registered at `_KDB.services.tableData` must expose named methods only:

```js
{
  loadTable: loadTable,
  readRows: readRows,
  waitForRows: waitForRows,
  reloadTable: reloadTable,
  ensureFreshRows: ensureFreshRows,
  readTableState: readTableState,
  destroy: destroy
}
```

Method contracts:

| Method | Input | Returns | Behavior |
|---|---|---|---|
| `loadTable` | `string | { tableHandle?, tableName?, title?, widgetId? }` | `Promise<tableData|null>` | Legacy-compatible default load; use cached ready data when present; otherwise resolve widget and query Cognos. |
| `readRows` | same table key input | `tableData | undefined` | Pure cache read; no implicit Cognos load. |
| `waitForRows` | same table key input | `Promise<tableData|null>` | Return pending promise if present; return ready data if present; otherwise call `loadTable`. |
| `reloadTable` | same table key input | `Promise<tableData|null>` | Abort previous pending load for the same key and start a fresh load. |
| `ensureFreshRows` | same table key input | `Promise<tableData|null>` | Return ready/fresh cached data, otherwise reload. |
| `readTableState` | same table key input or omitted | `object | undefined` | Read service-owned state only. |
| `destroy` | none | `void` | Idempotent teardown; set `_isDisposed = true`, abort pending loads, clear runtime buckets, mark tables disposed. |

Post-disposal behavior must follow `module-public-api.mdc`:

- sync reads return `undefined`;
- async methods return `Promise.reject(new Error("tableDataService disposed"))`;
- `destroy()` is idempotent;
- guards do not throw synchronously.

---

## Section F. Data And State Semantics

State owner:

```js
_KDB.state.tableData
```

Per-table state shape:

```js
{
  lifecycle: "idle" | "loading" | "ready" | "error" | "disposed",
  freshness: "fresh" | "stale",
  tableHandle: string | null,
  tableName: string | null,
  title: string | null,
  widgetId: string | null,
  rows: object | null,
  rowCount: number,
  isHierarchy: boolean,
  hasData: boolean,
  errorCode: string | null,
  errorMessage: string | null,
  lastLoadedAt: number | null
}
```

Legacy `normalizeTableData.js` output is preserved as the `rows` value:

```js
{
  columns: object,
  columnNames: string[],
  rowCount: number
}
```

Empty results:

- `queryResult === null` remains a successful completion with `rows: null`, `hasData: false`, unless the failure path is explicitly known.
- A normalized result with `rowCount: 0` is not an error.
- Timeout while waiting maps to `lifecycle: "error"` only when the thrown/rejected path is distinguishable; if legacy swallowed it as `null`, preserve that behavior and record `hasData: false`.

Forbidden in `_KDB.state.tableData`:

- Promise objects;
- `.resolve` functions;
- AbortControllers;
- Cognos DataQueryExecution objects;
- DOM/jQuery references.

Runtime owner:

```js
_KDB.runtime.tableData = {
  pendingLoads: {},
  abortControllers: {},
  subscriptions: {}
}
```

Use `pendingLoads[tableKey]` for in-flight promises and `abortControllers[tableKey]` for cancellation/stale-result protection.

---

## Section G. Event Discipline

If fact-events are in scope, use the existing `tableDataService.md` events:

```txt
tableData:loadFinished
tableData:loadFailed
```

Rules:

- emit `tableData:loadFinished` only after `markTableLoaded` commits;
- emit `tableData:loadFailed` only after `markTableFailed` commits;
- do not emit legacy `table:loaded` or `tables:loaded` from this service;
- do not add `dataTableLoad:*` events;
- do not edit `eventSubscribe.md` in this tranche unless the user explicitly approves.

If the CP-1 decision is "promise-return only, no service events", omit `events/eventNames.js` and document that no event catalog update is needed.

Aggregate startup event `tables:loaded` belongs to a future bootstrap/init task, not to `tableDataService`.

---

## Section H. Per-file Specifications

### `__orchestratorTableData.js`

- **Role:** service orchestrator.
- **Imports:** `./createTableDataService.js`.
- **Entry:** `function __orchestrator(_KDB)`.
- **Responsibilities:**
  1. Ensure `_KDB.services`, `_KDB.state`, `_KDB.runtime` exist.
  2. Ensure `_KDB.state.tableData` exists.
  3. Ensure `_KDB.runtime.tableData.pendingLoads`, `abortControllers`, and `subscriptions` exist.
  4. Register `_KDB.services.tableData = _createTableDataService(_KDB)`.
  5. Return `_KDB.services.tableData`.
- **Must not:** perform a Cognos query, scan widgets, emit events, or register bootstrap startup loads.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `error-handling.mdc`.

### `createTableDataService.js`

- **Role:** shared service factory.
- **Imports:**
  - `./state/initialTableState.js`
  - `./state/writers/markTableLoading.js`
  - `./state/writers/markTableLoaded.js`
  - `./state/writers/markTableFailed.js`
  - `./state/writers/markTableDisposed.js`
  - `./effects/resolveTableWidgetId.js`
  - `./effects/readTableQueryResult.js`
  - `./effects/normalizeTableData.js`
  - conditional `./effects/storeHierarchyData.js`
  - conditional `./events/eventNames.js`
- **Entry:** `function createTableDataService(_KDB)`.
- **Factory-scope helpers required:**
  - `normalizeTableInput(_input)`
  - `resolveTableKey(_input)`
  - `readEntry(_KDB, _input)`
  - `emitLoadFinished(_KDB, _entry)`
  - `emitLoadFailed(_KDB, _entry)`
  - `runLoadTableWork(_KDB, _input, signal)`
- **Public methods:** exactly the methods in Section E.
- **Async discipline:** async work lives in `runLoadTableWork` at AMD factory scope, not in an inline async IIFE.
- **Disposed-state:** closure `_isDisposed` set to `true` at the beginning of `destroy()`.
- **Rules to apply:** `amd.mdc`, `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `error-handling.mdc`, `events.mdc`, `naming.mdc`.

### `state/initialTableState.js`

- **Role:** pure initial state factory.
- **Entry:** `function initialTableState(_input)`.
- **Return:** new object matching Section F.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `naming.mdc`.

### `state/writers/markTableLoading.js`

- **Role:** owner-only writer.
- **Entry:** `function markTableLoading(_KDB, _payload)`.
- **Behavior:** initialize entry if absent, set `lifecycle: "loading"`, `freshness: "stale"`, clear error fields, preserve identity fields.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `naming.mdc`.

### `state/writers/markTableLoaded.js`

- **Role:** owner-only writer.
- **Entry:** `function markTableLoaded(_KDB, _payload)`.
- **Behavior:** set `lifecycle: "ready"`, `freshness: "fresh"`, identity fields, `rows`, `rowCount`, `isHierarchy`, `hasData`, `lastLoadedAt`, clear error fields.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `naming.mdc`.

### `state/writers/markTableFailed.js`

- **Role:** owner-only writer.
- **Entry:** `function markTableFailed(_KDB, _payload)`.
- **Behavior:** set `lifecycle: "error"`, preserve previous rows as stale if present, set `freshness: "stale"`, `errorCode`, `errorMessage`.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `error-handling.mdc`, `naming.mdc`.

### `state/writers/markTableDisposed.js`

- **Role:** owner-only writer.
- **Entry:** `function markTableDisposed(_KDB, _payload)`.
- **Behavior:** mark one table or all known tables as `lifecycle: "disposed"` without storing runtime handles in state.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `runtime.mdc`, `naming.mdc`.

### `effects/resolveTableWidgetId.js`

- **Role:** Cognos canvas lookup effect.
- **Legacy source:** `resolveTableWidgetId.js`.
- **Entry:** `async function resolveTableWidgetId(_KDB, _title)`.
- **Behavior:** wait for canvas, scan `widget.live`, accept `list` and `hierarchy`, match by visualisation title.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `naming.mdc`.

### `effects/readTableQueryResult.js`

- **Role:** Cognos query wait/result effect.
- **Legacy source:** `readTableQueryResult.js`.
- **Entry:** `async function readTableQueryResult(_KDB, _widgetId, _options)`.
- **Behavior:** preserve legacy wait defaults: timeout `60000`, poll `100`; call `_KDB.cognosAPI.dataQuery.awaitForTableData`, then `_KDB.cognosAPI.dataQuery.getDataQueryResult`.
- **Abort behavior:** if `options.signal.aborted`, return `{ status: "aborted", result: null }` before writing state.
- **Rules to apply:** `amd.mdc`, `error-handling.mdc`, `runtime.mdc`, `naming.mdc`.

### `effects/normalizeTableData.js`

- **Role:** pure query-result normalizer.
- **Legacy source:** `normalizeTableData.js`.
- **Entry:** `function normalizeTableData(_queryResult)`.
- **Behavior:** preserve `columns`, `columnNames`, `rowCount`; preserve `extractCellValue` behavior.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`.

### `effects/storeHierarchyData.js` (conditional)

- **Role:** hierarchy query-result transformer.
- **Legacy source:** `storeHierarchyData.js`.
- **Entry:** `function storeHierarchyData(_KDB, _input, _queryResult)`.
- **Behavior:** only if CP-1 includes hierarchy in this service; otherwise omit.
- **Rules to apply:** `amd.mdc`, `state.mdc`, `naming.mdc`, `error-handling.mdc`.

### `events/eventNames.js` (conditional)

- **Role:** event constants owned by emitter.
- **Constants:**
  - `LOAD_FINISHED = "tableData:loadFinished"`
  - `LOAD_FAILED = "tableData:loadFailed"`
- **Rules to apply:** `amd.mdc`, `events.mdc`, `naming.mdc`.

---

## Section I. Acceptance Criteria

1. All created files live under `_____________KDB3API/KDB3/js/core/services/tableData/`.
2. No file is created under `TEST/`.
3. No legacy file is modified, deleted, renamed, or moved.
4. No `KDB.js` bootstrap registration is implemented in this tranche.
5. Every production JS file is AMD full-compact: one top-level `define([...], function (...) { ... })`.
6. No file uses ES `import` or `export`.
7. No public service method writes runtime objects into `_KDB.state`.
8. `_KDB.state.tableData` contains only serializable table status/data.
9. `_KDB.runtime.tableData` owns pending promises and AbortControllers.
10. Every public method has disposed-state behavior per `module-public-api.mdc`.
11. Every lifecycle/async/Cognos boundary has `try/catch` with contextual `console.error`.
12. `destroy()` sets `_isDisposed = true` before aborting/clearing runtime.
13. Empty result is not treated as error unless legacy did so for that exact path.
14. Timeout/failure semantics are documented in state fields without inventing behavior beyond rule-alignment.
15. Event constants, if present, use `tableData:*` catalog names only.
16. `ReadLints` is run on all newly created JS files after execution.
17. All AMD import paths resolve relative to the new production files.
18. The executing AI reports any omitted conditional hierarchy/event files with the CP-1 decision that caused omission.

---

## Section J. Forbidden Actions

The executing AI must not:

- modify `_____________KDB3API/.cursor/rules/`;
- modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, or `eventSubscribe.md`;
- modify `_template.md` or `_executionSpecTemplate.md`;
- create a separate `dataTableLoad` service;
- register `_KDB.services.getTableData`;
- add `_KDB.state.tablesLoaded` or any Promise/function under `_KDB.state`;
- add `_KDB.data.tables` as canonical storage;
- emit `dataTableLoad:*`, `table:loaded`, or `tables:loaded` from this service;
- modify `KDB.js`;
- create a browser harness, Node harness, or `TEST/` files;
- port unrelated loading/history/widget services in this tranche;
- change behavior beyond rule-alignment without escalating.

---

## Section K. Bootstrap / Integration Note

This tranche creates the service files only. Later integration likely requires:

1. adding `./core/services/tableData/__orchestratorTableData.js` to `KDB.js` or a future services orchestrator;
2. registering `_KDB.services.tableData`;
3. deciding whether startup calls `loadTable` / `loadAll` from `KDB.js`, a core services orchestrator, or a separate init-task boundary;
4. migrating any consumers from legacy `_KDB.data.tables.*` reads to `_KDB.services.tableData.*` reads.

Do not implement any of these integration steps in this direct-port tranche unless the user explicitly approves a follow-up CP.

---

## Section L. Cheap-AI Launch Prompt

Use this compact prompt after CP-1 approval:

```text
You are the executing AI for a DIRECT PORT.

Read and follow exactly:
_____________KDB3API/contracts/tableDataService-getTableData-port-execution-spec.md

Before creating files, complete Section A and echo the one-sentence summaries.
Then create only the files listed in Section D under:
_____________KDB3API/KDB3/js/core/services/tableData/

Do not use TEST, do not modify legacy, do not modify KDB.js, do not create a dataTableLoad service, and do not change behavior beyond rule-alignment.
Report using Section M.
```

---

## Section M. Reporting Template

The executing AI's final report must include:

1. Pre-flight echo summaries.
2. File checklist with created path and line count.
3. Conditional omissions: hierarchy/event files and the CP-1 decision behind each.
4. Mapping confirmation against Section C.
5. Acceptance criteria pass/fail from Section I.
6. Lint result summary.
7. Import-resolution check summary.
8. Deviations, if any, with rule citation and reason.


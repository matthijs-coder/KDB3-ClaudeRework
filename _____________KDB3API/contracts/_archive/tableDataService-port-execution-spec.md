# Execution Spec: `tableDataService` (skeleton)

> Empirical test of `_executionSpecTemplate.md` (R5 + R6 from the kdbControl litmustest report). The executing AI must follow Section A pre-flight echo and every per-file `Rules to apply` checklist before reporting back. D1 (missing mandatory try/catch on named executables/subscribers/async) and D2 (runtime cleanup in destroy) **must not** occur in the first pass — these are explicit acceptance criteria.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/tableDataService.md` (Approved 2026-05-12)
**Phase:** `skeleton`
**Authoring AI:** Claude (Opus 4.7), 2026-05-12
**Executing AI:** TBD
**Reviewer:** user + Claude

---

## Section A. Pre-flight read list

> Read each file below in order, **before** producing any output file. After reading, **echo back a one-sentence summary of each item** in your first reply. If a summary is missing or wrong, the run stops; re-read and retry.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `<one sentence>`
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: `<one sentence>`
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: `<one sentence>`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: `<one sentence>`
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: `<one sentence>`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: `<one sentence>`
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: `<one sentence>`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: `<one sentence>`
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: `<one sentence>`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — summary: `<one sentence>`
12. `_____________KDB3API/contracts/_template.md` — summary: `<one sentence>`
13. `_____________KDB3API/contracts/tableDataService.md` — summary: `<one sentence>`
14. This execution spec itself.

The executing AI's **first** output must be the 14 echoed summaries as a numbered list. Only after the reviewer accepts the echo (or after the AI verifies its own summaries against the rule headers) does file creation begin.

---

## Section B. Folder tree

> Exact paths to create. Top-down folder creation; files in the order they appear under each folder.

```
TEST/tableDataService-port/
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
  harness/
    index.html
    harness.js
    adapters/
      createMockKdb.js
    fixtures/
      pkzRows.js
```

Total: 15 files. No conditional files (Q5 = writer helpers → no `config/actionTypes.js`, no internal reducer).

---

## Section C. Per-file specifications

> Every file below has a `Rules to apply` line. The executing AI must satisfy each rule before declaring the file done.

### `TEST/tableDataService-port/tableData/__orchestratorTableData.js`

- **Role**: service orchestrator. Registers `_KDB.services.tableData` and initializes `_KDB.runtime.tableData`.
- **Target lines**: 15–30.
- **AMD imports**:
  - `"./createTableDataService"`
- **Factory parameters**: `_createTableDataService`.
- **Factory-scope helpers**: none.
- **Entry function**: `__orchestratorTableData(_KDB)`.
- **Body steps**:
  1. Initialize `_KDB.runtime.tableData = { pendingLoads: {}, listeners: {}, subscriptions: {} }` if not already present.
  2. Initialize `_KDB.state.tableData = _KDB.state.tableData || {}` if not already present.
  3. Assign `_KDB.services.tableData = _createTableDataService(_KDB)`.
- **Header comment**: `// Lifecycle terms for tableDataService: idle, loading, ready, error, disposed. Freshness terms: fresh, stale (separate field).`
- **Return**: `__orchestratorTableData`.
- **Rules to apply**:
  - `amd.mdc` — full-compact `define([...], function (...) { ... })`; named entry function at AMD factory scope; no inline subfunctions in the entry function body.
  - `naming.mdc` — underscore prefix on `_KDB` and `_createTableDataService` (boundary inputs); orchestrator name matches `__orchestrator<Module>`.
  - `feature-structure.mdc` — thin orchestrator (wiring only; no business logic, no DOM, no event listeners).
  - `kdb-object.mdc` — `_KDB.services.tableData` is the canonical registration point for shared services.

### `TEST/tableDataService-port/tableData/createTableDataService.js`

- **Role**: service factory. Produces the named-methods object exposed at `_KDB.services.tableData`.
- **Target lines**: 100–140 (largest file; service factory hard limit per `feature-structure.mdc` is 150).
- **AMD imports**:
  - `"./state/initialState"`
  - `"./state/writers/markTableLoading"`
  - `"./state/writers/markTableLoaded"`
  - `"./state/writers/markTableFailed"`
  - `"./state/writers/markTableStale"`
  - `"./state/writers/markTableDisposed"`
  - `"./effects/loadTableFromCognos"`
  - `"./events/eventNames"`
- **Factory parameters**: `_initialState, _markTableLoading, _markTableLoaded, _markTableFailed, _markTableStale, _markTableDisposed, _loadTableFromCognos, _eventNames`.
- **Factory-scope helpers** (declared **below** the entry function at AMD factory scope, per `amd.mdc`):
  - `function ensureTableEntry(_KDB, tableName) { /* returns existing or initializes _KDB.state.tableData[tableName] via _initialState() */ }`
  - `function emitLoadFinished(_KDB, tableName, rowCount) { /* _KDB.events.emit(_eventNames.LOAD_FINISHED, { tableName, rowCount }) */ }`
  - `function emitLoadFailed(_KDB, tableName, errorCode, errorMessage) { /* _KDB.events.emit(_eventNames.LOAD_FAILED, { tableName, errorCode, errorMessage }) */ }`
- **Entry function**: `createTableDataService(_KDB)`. Returns the named-methods object.
- **Method bodies** (each public method wraps its body in `try/catch`):
  - `readRows(tableName)` — sync; returns `_KDB.state.tableData[tableName] ? _KDB.state.tableData[tableName].rows : undefined`. Catch: `console.error("[tableData.readRows]", err); return undefined;`. **No state writes on catch** (pure read).
  - `waitForRows(tableName)` — if `pendingLoads[tableName]` exists, return it. If `lifecycle === "ready"`, return `Promise.resolve(state.rows)`. Otherwise call `reloadTable(tableName)`.
  - `reloadTable(tableName)` — async. Steps:
    1. `ensureTableEntry(_KDB, tableName)`.
    2. If `_KDB.runtime.tableData.listeners[tableName]`, call `.abort()` on it; clear.
    3. Create new `AbortController`, store in `_KDB.runtime.tableData.listeners[tableName]`.
    4. `_markTableLoading(_KDB, { tableName })`.
    5. Create the promise: `const p = (async () => { try { const result = await _loadTableFromCognos(_KDB, { tableName, signal: controller.signal }); _markTableLoaded(_KDB, { tableName, rows: result.rows, rowCount: result.rows.length }); emitLoadFinished(_KDB, tableName, result.rows.length); return result.rows; } catch (err) { const errorCode = err && err.name === "AbortError" ? "aborted" : "loadFailed"; const errorMessage = String(err); console.error("[tableData.reloadTable:" + tableName + "]", err); _markTableFailed(_KDB, { tableName, errorCode, errorMessage }); emitLoadFailed(_KDB, tableName, errorCode, errorMessage); throw err; } finally { delete _KDB.runtime.tableData.pendingLoads[tableName]; delete _KDB.runtime.tableData.listeners[tableName]; } })();`.
    6. Store `_KDB.runtime.tableData.pendingLoads[tableName] = p`.
    7. Return `p`.
  - `ensureFreshRows(tableName)` — if `state[tableName] && state[tableName].lifecycle === "ready" && state[tableName].freshness === "fresh"`, return `Promise.resolve(state[tableName].rows)`. Else `return reloadTable(tableName);`. Wrap in try/catch.
  - `getState()` — return `_KDB.state.tableData`. Wrap in try/catch; on catch return `{}`.
  - `destroy()` — try/catch wrapper. Body:
    1. For each `tableName` in `_KDB.runtime.tableData.listeners`: call `.abort()`.
    2. For each `tableName` in `_KDB.runtime.tableData.pendingLoads`: ignore (will reject via abort).
    3. For each `tableName` in `_KDB.state.tableData`: `_markTableDisposed(_KDB, { tableName })`.
    4. Reset `_KDB.runtime.tableData = { pendingLoads: {}, listeners: {}, subscriptions: {} }`.
    Catch: `console.error("[tableData.destroy]", err);` and leave runtime in best-effort state.
- **Return** (the service object):
  ```js
  return {
    readRows: readRows,
    waitForRows: waitForRows,
    reloadTable: reloadTable,
    ensureFreshRows: ensureFreshRows,
    getState: getState,
    destroy: destroy
  };
  ```
- **Rules to apply**:
  - `amd.mdc` — full-compact define; named entry function `createTableDataService` and named helpers `ensureTableEntry`, `emitLoadFinished`, `emitLoadFailed` at AMD factory scope only; no inline subfunctions inside any method body, callback, or promise chain.
  - `naming.mdc` — `create<Service>Service` pattern; underscore prefix only on AMD imports and `_KDB`; method names `verb + noun` (camelCase).
  - `feature-structure.mdc` — service factory file; lives at module root; entry-function name matches the role suffix.
  - `module-public-api.mdc` — named methods only; no public `dispatch`; `getState` allowed as coarse snapshot; no granular `read*` for foreign subtrees; service does not publish a separate selector registry.
  - `state.mdc` — only this service writes to `_KDB.state.tableData`; mutations go through `_markTable*` writers; no direct state assignment in method bodies.
  - `runtime.mdc` — initialize `pendingLoads`, `listeners`, `subscriptions` buckets in orchestrator; **cleanup in `destroy` aborts every `listeners[tableName]` and clears the runtime; cleanup uses `delete` per pending key in the `finally` block of each load promise**.
  - `error-handling.mdc` — **every public method body wrapped in `try/catch`**; on catch, log with `console.error("[tableData.<method>:<context>]", err)`; for failure-prone async loads, call `_markTableFailed` and emit `tableData:loadFailed` from the load-effect chain (already inside `reloadTable`), then re-throw to consumer; pure reads (`readRows`, `getState`) do not write state on catch.
  - `events.mdc` — emit `tableData:loadFinished` only after `_markTableLoaded` commits; emit `tableData:loadFailed` only after `_markTableFailed` commits; constants from `./events/eventNames` (no string literals at emit sites).

### `TEST/tableDataService-port/tableData/state/initialState.js`

- **Role**: pure factory returning the initial per-table state shape.
- **Target lines**: 10–20.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `initialState()`. Returns a new object every call.
- **Body**:
  ```js
  return {
    lifecycle: "idle",
    freshness: "stale",
    rows: undefined,
    rowCount: 0,
    lastLoadedAt: null,
    errorCode: null,
    errorMessage: null
  };
  ```
- **Rules to apply**:
  - `amd.mdc` — pure factory; one named entry function; no inline subfunctions.
  - `naming.mdc` — `initialState` is descriptive; lifecycle string from `lifecycleVocabulary.md`.
  - `state.mdc` — initial shape matches the contract Section 2 exactly.

### `TEST/tableDataService-port/tableData/state/writers/markTableLoading.js`

- **Role**: internal writer; transitions `_KDB.state.tableData[tableName]` to `lifecycle: "loading"`.
- **Target lines**: 10–20.
- **AMD imports**: `"../initialState"`.
- **Factory parameters**: `_initialState`.
- **Entry function**: `markTableLoading(_KDB, _payload)`. Returns `undefined`.
- **Body**:
  1. `const tableName = _payload.tableName;`
  2. `_KDB.state.tableData = _KDB.state.tableData || {};`
  3. `_KDB.state.tableData[tableName] = _KDB.state.tableData[tableName] || _initialState();`
  4. `_KDB.state.tableData[tableName].lifecycle = "loading";`
  5. `_KDB.state.tableData[tableName].errorCode = null;`
  6. `_KDB.state.tableData[tableName].errorMessage = null;`
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc` (underscore prefix on `_KDB`, `_payload`, `_initialState`).
  - `state.mdc` — pure writer; no side-effects beyond state mutation; no events emitted here (emission lives in the service).

### `TEST/tableDataService-port/tableData/state/writers/markTableLoaded.js`

- **Role**: internal writer; transitions to `lifecycle: "ready"`, `freshness: "fresh"`.
- **Target lines**: 10–20.
- **AMD imports**: `"../initialState"`.
- **Factory parameters**: `_initialState`.
- **Entry function**: `markTableLoaded(_KDB, _payload)`. Returns `undefined`.
- **Body**:
  1. `const { tableName, rows, rowCount } = _payload;`
  2. `_KDB.state.tableData = _KDB.state.tableData || {};`
  3. `_KDB.state.tableData[tableName] = _KDB.state.tableData[tableName] || _initialState();`
  4. `_KDB.state.tableData[tableName].lifecycle = "ready";`
  5. `_KDB.state.tableData[tableName].freshness = "fresh";`
  6. `_KDB.state.tableData[tableName].rows = rows;`
  7. `_KDB.state.tableData[tableName].rowCount = typeof rowCount === "number" ? rowCount : (rows ? rows.length : 0);`
  8. `_KDB.state.tableData[tableName].lastLoadedAt = Date.now();`
  9. `_KDB.state.tableData[tableName].errorCode = null;`
  10. `_KDB.state.tableData[tableName].errorMessage = null;`
- **Rules to apply**: same as `markTableLoading`.

### `TEST/tableDataService-port/tableData/state/writers/markTableFailed.js`

- **Role**: internal writer; transitions to `lifecycle: "error"`.
- **Target lines**: 10–20.
- **AMD imports**: `"../initialState"`.
- **Factory parameters**: `_initialState`.
- **Entry function**: `markTableFailed(_KDB, _payload)`. Returns `undefined`.
- **Body**:
  1. `const { tableName, errorCode, errorMessage } = _payload;`
  2. `_KDB.state.tableData = _KDB.state.tableData || {};`
  3. `_KDB.state.tableData[tableName] = _KDB.state.tableData[tableName] || _initialState();`
  4. `_KDB.state.tableData[tableName].lifecycle = "error";`
  5. `_KDB.state.tableData[tableName].errorCode = String(errorCode || "unknown");`
  6. `_KDB.state.tableData[tableName].errorMessage = String(errorMessage || "");`
- **Rules to apply**: same.

### `TEST/tableDataService-port/tableData/state/writers/markTableStale.js`

- **Role**: internal writer; sets `freshness: "stale"`; does not touch lifecycle.
- **Target lines**: 10–15.
- **AMD imports**: `"../initialState"`.
- **Factory parameters**: `_initialState`.
- **Entry function**: `markTableStale(_KDB, _payload)`. Returns `undefined`.
- **Body**:
  1. `const tableName = _payload.tableName;`
  2. `_KDB.state.tableData = _KDB.state.tableData || {};`
  3. `_KDB.state.tableData[tableName] = _KDB.state.tableData[tableName] || _initialState();`
  4. `_KDB.state.tableData[tableName].freshness = "stale";`
- **Rules to apply**: same.

### `TEST/tableDataService-port/tableData/state/writers/markTableDisposed.js`

- **Role**: internal writer; transitions to `lifecycle: "disposed"`; clears rows.
- **Target lines**: 10–20.
- **AMD imports**: `"../initialState"`.
- **Factory parameters**: `_initialState`.
- **Entry function**: `markTableDisposed(_KDB, _payload)`. Returns `undefined`.
- **Body**:
  1. `const tableName = _payload.tableName;`
  2. `if (!_KDB.state.tableData || !_KDB.state.tableData[tableName]) return;`
  3. `_KDB.state.tableData[tableName].lifecycle = "disposed";`
  4. `_KDB.state.tableData[tableName].rows = undefined;`
  5. `_KDB.state.tableData[tableName].rowCount = 0;`
- **Rules to apply**: same.

### `TEST/tableDataService-port/tableData/effects/__orchestratorEffects.js`

- **Role**: effects orchestrator stub. In the skeleton it returns nothing usable; reserved for future cross-service effect wiring (e.g. global "tables:loaded" aggregate). Stub body keeps the file aligned with the contract folder layout.
- **Target lines**: 10–15.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `__orchestratorEffects(_KDB)`. Returns `undefined`.
- **Body**: `void _KDB; // placeholder for cross-service effect wiring`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`.
  - `feature-structure.mdc` — orchestrator role; no logic.

### `TEST/tableDataService-port/tableData/effects/loadTableFromCognos.js`

- **Role**: async effect; performs the Cognos-side load via `_KDB.cognosAPI` wrappers. Skeleton-stub: calls a mocked `awaitForTableData` + `getDataQueryResult` chain and returns `{ rows }`.
- **Target lines**: 30–60.
- **AMD imports**: none (uses `_KDB` only).
- **Factory parameters**: none at AMD level.
- **Entry function**: `loadTableFromCognos(_KDB, _options)` (async).
- **Body**:
  1. `const tableName = _options.tableName;`
  2. `const signal = _options.signal;`
  3. **Try block:**
     1. `if (signal && signal.aborted) { const e = new Error("aborted"); e.name = "AbortError"; throw e; }`
     2. `await _KDB.cognosAPI.dataQuery.awaitForTableData(tableName, { signal: signal });`
     3. `if (signal && signal.aborted) { const e = new Error("aborted"); e.name = "AbortError"; throw e; }`
     4. `const result = await _KDB.cognosAPI.dataQuery.getDataQueryResult(tableName);`
     5. `const rows = (result && result.rows) ? result.rows : [];`
     6. `return { rows: rows };`
  4. **Catch block:** rethrow (parent `reloadTable` handles error transitioning + event emission).
- **Rules to apply**:
  - `amd.mdc` — full-compact define; named entry function `loadTableFromCognos`; **no inline subfunctions inside the entry function body, including no inline error constructors as helpers** (the `e.name = "AbortError"` two-line shape inline is allowed because it's just object property assignment, not a function definition).
  - `naming.mdc` — underscore prefix only on `_KDB`, `_options`.
  - `error-handling.mdc` — try/catch boundary at external API call site; honors `AbortController.signal`; rethrows so the caller (`reloadTable`) can transition state and emit the failure event.
  - `runtime.mdc` — `AbortController` is created by the caller in `reloadTable`; effect honors the signal.

### `TEST/tableDataService-port/tableData/events/eventNames.js`

- **Role**: canonical home for this service's emitted events.
- **Target lines**: 5–15.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: not applicable; the define factory returns an object literal directly.
- **Body** (factory return value):
  ```js
  return {
    LOAD_FINISHED: "tableData:loadFinished",
    LOAD_FAILED: "tableData:loadFailed"
  };
  ```
- **Rules to apply**:
  - `amd.mdc` — define returns a single object literal (allowed shape per the rule).
  - `events.mdc` — event-name constants live in the emitter's canonical home `<emitterModule>/events/eventNames.js` (R2 from the kdbControl litmustest report); the strings match the contract Section 6 verbatim.
  - `naming.mdc` — colon-style names; past-tense facts.

### `TEST/tableDataService-port/harness/index.html`

- **Role**: harness page; loads RequireJS, the mock `_KDB`, and starts `harness.js`.
- **Target lines**: 30–45.
- **Exact content** (verbatim):
  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>tableDataService port harness</title>
    </head>
    <body>
      <div id="app"></div>
      <pre id="harness-debug-log"></pre>
      <button type="button" id="harness-load-pkz">Load pkz</button>
      <button type="button" id="harness-reload-pkz">Reload pkz</button>
      <button type="button" id="harness-destroy">Destroy</button>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/require.js/2.3.6/require.min.js"></script>
      <script src="adapters/createMockKdb.js"></script>
      <script src="fixtures/pkzRows.js"></script>
      <script>
        require.config({
          baseUrl: ".",
          paths: { "core/services/tableData": "../tableData" }
        });
        require(["harness"]);
      </script>
    </body>
  </html>
  ```
- **Rules to apply**: none of the production rules; harness lives outside `KDB3/js/**` per `amd.mdc` harness-exception.

### `TEST/tableDataService-port/harness/harness.js`

- **Role**: harness entry; mounts service, wires buttons.
- **Target lines**: 35–55.
- **AMD imports**:
  - `"core/services/tableData/__orchestratorTableData"`
- **Factory parameters**: `_orch`.
- **Factory-scope helpers** (allowed per `amd.mdc`):
  - `function appendLog(text) { var el = document.getElementById("harness-debug-log"); if (el) el.textContent += String(text) + "\n"; }`
  - `function logState(_KDB, tableName) { var s = _KDB.state.tableData && _KDB.state.tableData[tableName]; if (!s) { appendLog("[tableData] " + tableName + ": (no entry)"); return; } appendLog("[tableData] " + tableName + ": " + s.lifecycle + " / " + s.freshness + " / rowCount=" + s.rowCount); }`
- **Entry function**: anonymous IIFE-style body inside the define factory; not a named function declaration here because the define returns the wiring; the AMD factory body itself contains the boot logic. Acceptable per `amd.mdc` because no nested subfunctions are created at runtime.
  - **Body**:
    1. `var _KDB = window.createMockKdb(document);`
    2. `_orch(_KDB);`
    3. `_KDB.events.subscribe("tableData:loadFinished", function (p) { appendLog("[event] tableData:loadFinished " + JSON.stringify(p)); });`
    4. `_KDB.events.subscribe("tableData:loadFailed", function (p) { appendLog("[event] tableData:loadFailed " + JSON.stringify(p)); });`
    5. Wire `#harness-load-pkz` click: `logState` before, `_KDB.services.tableData.waitForRows("pkz")` then `logState` after.
    6. Wire `#harness-reload-pkz` click: `logState`, then `_KDB.services.tableData.reloadTable("pkz")`, then `logState` after resolve.
    7. Wire `#harness-destroy` click: `_KDB.services.tableData.destroy(); logState(_KDB, "pkz");`.
- **Rules to apply**:
  - `amd.mdc` harness-exception; named factory-scope helpers `appendLog`, `logState` are allowed; click handlers are inline-anonymous as event-listener callbacks (a recognized JS pattern, not a "subfunction definition inside the entry function" because the entry function here is the factory itself and the event handlers are callbacks — see `amd.mdc` Forbidden example #2). To stay strictly safe, declare the click handlers as factory-scope named functions and pass them by name to `addEventListener`.

> Implementation note for the executing AI: prefer the strictly safe variant — declare `function onLoadPkz() { ... }`, `function onReloadPkz() { ... }`, `function onDestroyPkz() { ... }` at AMD factory scope and pass them by name to `addEventListener`. This avoids any ambiguity around `amd.mdc`'s "no subfunction definitions inside callbacks" reading.

### `TEST/tableDataService-port/harness/adapters/createMockKdb.js`

- **Role**: standalone (non-AMD) mock builder, attached to `window.createMockKdb`. Mirrors the kdbControl harness mock shape; adds Cognos `dataQuery` stubs that resolve fixture rows.
- **Target lines**: 50–80.
- **Wrapper**: classic IIFE (`(function () { ... })()`); no `define`. Attaches `createMockKdb` to `window`.
- **Exposed function**: `createMockKdb(doc)` returning the mock `_KDB`.
- **Mock shape**:
  ```js
  return {
    api: {},
    services: {},
    runtime: {},
    config: { options: {}, dashboard: {} },
    properties: {},
    data: { tables: {} },
    state: { dashboard: { isAuthoring: false }, tableData: {}, tablesLoaded: Promise.resolve() },
    elements: {
      controlRoot: function () { return d.getElementById("app"); }
    },
    events: createTopicBus(),
    cognosAPI: {
      dataQuery: {
        awaitForTableData: function (_tableName, _options) {
          return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () { resolve(); }, 150);
            if (_options && _options.signal) {
              _options.signal.addEventListener("abort", function () { clearTimeout(timer); var e = new Error("aborted"); e.name = "AbortError"; reject(e); });
            }
          });
        },
        getDataQueryResult: function (_tableName) {
          if (_tableName === "pkz" && window.__pkzFixtureRows) { return Promise.resolve({ rows: window.__pkzFixtureRows }); }
          return Promise.resolve({ rows: [] });
        }
      },
      visualization: { getVisType: function () { return Promise.resolve("list"); }, getVisTitle: function () { return Promise.resolve(""); } },
      canvas: { getCanvasWhenReady: function () { return Promise.resolve(null); }, findCanvasContent: function () { return Promise.resolve(null); } }
    }
  };
  ```
- `createTopicBus()` is an internal helper inside the IIFE; same minimal in-memory pub/sub as in the kdbControl harness mock.
- **Rules to apply**: none of the production rules; harness adapter; **must** match the shape of `cognosAPI.dataQuery.*` calls used by `loadTableFromCognos.js`.

### `TEST/tableDataService-port/harness/fixtures/pkzRows.js`

- **Role**: fixture rows for the `pkz` table, exposed as `window.__pkzFixtureRows`.
- **Target lines**: 10–25.
- **Wrapper**: classic IIFE; no `define`.
- **Body**: assign `window.__pkzFixtureRows = [ /* 3–5 plausible row objects, e.g. { id: "...", label: "..." } */ ];`.
- **Rules to apply**: none; fixture only.

---

## Section D. Writer behavior table (replaces "Reducer behavior" — Q5 = writers)

> Per Q5, this service uses writer helpers, not an internal reducer.

| Writer | Trigger (caller) | State mutation | Lifecycle / freshness transition |
|---|---|---|---|
| `markTableLoading` | `reloadTable` | sets `lifecycle = "loading"`, clears error fields | `idle | ready | error → loading` |
| `markTableLoaded` | `reloadTable` (success branch) | sets `lifecycle = "ready"`, `freshness = "fresh"`, populates `rows`, `rowCount`, `lastLoadedAt`, clears error fields | `loading → ready (fresh)` |
| `markTableFailed` | `reloadTable` (catch branch) | sets `lifecycle = "error"`, populates `errorCode`, `errorMessage`; leaves rows (now `stale`) | `loading → error` |
| `markTableStale` | (reserved; not called in skeleton) | sets `freshness = "stale"` | freshness only |
| `markTableDisposed` | `destroy` | sets `lifecycle = "disposed"`, clears rows | `* → disposed` |

---

## Section E. Public read methods

| Method | Reads from | Returns | Triggers load? |
|---|---|---|---|
| `readRows(tableName)` | `_KDB.state.tableData[tableName].rows` | rows or `undefined` | no |
| `getState()` | `_KDB.state.tableData` | the whole subtree | no |

No selector registry is published for shared services (per `module-public-api.mdc`).

---

## Section F. Public API wiring

- Surface: `_KDB.services.tableData`.
- Methods exposed: `readRows, waitForRows, reloadTable, ensureFreshRows, getState, destroy`.
- Runtime init at orchestrator load (not at `mount`, since services don't have `mount`): `_KDB.runtime.tableData = { pendingLoads: {}, listeners: {}, subscriptions: {} }`.
- State init at orchestrator load: `_KDB.state.tableData = _KDB.state.tableData || {}` (per-table entries are created lazily by writers).

---

## Section G. Harness HTML spec

See per-file spec for `harness/index.html` above. Exact `<!doctype html>` content is provided verbatim.

---

## Section H. Harness JS spec

See per-file spec for `harness/harness.js` above. Strict factory-scope click handlers required.

---

## Section I. Mock extensions

The mock `_KDB` must provide every shape the service touches:

| Shape | Stub |
|---|---|
| `cognosAPI.dataQuery.awaitForTableData(tableName, { signal })` | Promise with 150 ms timeout; honors AbortSignal (rejects with `AbortError`). |
| `cognosAPI.dataQuery.getDataQueryResult(tableName)` | `Promise.resolve({ rows })` for `"pkz"` from `window.__pkzFixtureRows`; empty rows otherwise. |
| `cognosAPI.visualization.getVisType / getVisTitle` | resolves `"list"` / `""` (not used in skeleton but kept to match the contract). |
| `cognosAPI.canvas.getCanvasWhenReady / findCanvasContent` | resolves `null` (not used in skeleton). |
| `events.subscribe / emit` | in-memory pub/sub; emit calls all subscribers synchronously. |
| `state.tableData` | empty object initially; populated by writers. |
| `state.tablesLoaded` | `Promise.resolve()` placeholder. |

---

## Section J. Acceptance criteria (self-verification before reporting back)

1. Every file from Section B exists at the specified path.
2. Every file matches its per-file specification in Section C, including the `Rules to apply` line.
3. Every production file (under `tableData/`) uses the full-compact AMD `define([...], function (...) { ... })` shape.
4. No file exceeds the line target declared in its spec; service factory may use up to 150 (hard limit per `feature-structure.mdc`).
5. **No file contains inline subfunction definitions inside the entry function body, inside any method body, or inside any callback. Named helpers live at AMD factory scope.** (This is the explicit anti-D-deviation check for the harness JS in particular.)
6. **Every named executable in `createTableDataService.js` has `try/catch`.** Public methods convert errors; pure reads (`readRows`, `getState`) do not write state on catch; async loads dispatch `markTableFailed` and emit `tableData:loadFailed` on catch via the existing `reloadTable` chain. (Explicit anti-D1 check.)
7. **`destroy()` aborts every entry in `_KDB.runtime.tableData.listeners`, marks every state entry as `disposed`, then resets the runtime bucket to fresh empty maps. No `runtime.tableData = null` before iterating.** (Explicit anti-D2 check.)
8. No imports outside the module's own folder (`tableData/`), the harness folder (`harness/`), and the AMD baseUrl shim. No imports from `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, `TEST/dashboard/`, `TEST/kdbControl/`, `TEST/kdbControl-port/`.
9. No forbidden tree was read or modified (see Section K).
10. Event-name strings live only in `tableData/events/eventNames.js`; no hardcoded `"tableData:loadFinished"` / `"tableData:loadFailed"` at emit or subscribe sites.
11. Per-table state shape matches the contract Section 2 exactly (7 fields).
12. Reporting back: file path checklist with line counts, deviation list (if any), pass/fail per Section J criterion, and the 14 echoed pre-flight summaries.

---

## Section K. Forbidden actions

The executing AI **must not**:

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `_____________KDB3API/contracts/_template.md` or `_____________KDB3API/contracts/_executionSpecTemplate.md`.
- Modify the approved module contract `_____________KDB3API/contracts/tableDataService.md`.
- Modify `_____________KDB3API/architecture/eventSubscribe.md`, `_____________KDB3API/.cursor/lifecycleVocabulary.md`, or any other architecture document.
- Read or modify legacy trees: `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`. (Note: `TEST/kdbControl-port/` and `TEST/kdbControl/` are also off-limits; this run only creates files inside `TEST/tableDataService-port/`.)
- Write CSS, tests, README, or any documentation files.
- Commit, push, or change git config.
- Invent behavior beyond what this spec describes. Any necessary deviation requires stopping and reporting back with the proposed deviation and motivation.
- Skip the Section A pre-flight echo or proceed without the 14 summaries.

---

## Section L. Reporting template

The executing AI's final response must include all of the following, in this order:

1. **Pre-flight echo** — 14 numbered rule/file summaries from Section A.
2. **File checklist** — table of every path created with line count and `matches spec | deviation` status.
3. **Deviations** — bullet list of every deviation: file path, deviation, motivation, rule consulted.
4. **Self-verification** — explicit pass/fail per criterion in Section J (1–12).
5. **Open questions for reviewer** — anything the spec did not cover that required improvisation, framed as a question.

---

## Section M. Reviewer handoff

After the executing AI reports:

1. Reviewer verifies the 14 echoed summaries are present and roughly correct.
2. Reviewer reads every file created.
3. Reviewer runs `ReadLints` on all `.js` files.
4. Reviewer cross-checks each file against the `Rules to apply` line in Section C.
5. Reviewer's verdict: accept, fix-spec for another iteration, or escalate.

After accept, the user opens `TEST/tableDataService-port/harness/index.html` in a browser, clicks `Load pkz`, and confirms the debug log shows the lifecycle transitions `idle → loading → ready` and the `tableData:loadFinished` event with `rowCount` matching the fixture row count. That is CP2 for this litmustest.

# Execution Spec: leftover Hierarchy `HideData` park filter

> Mechanical spec for Grok 4.6 army. Architecture lives in `tableData-hierarchy-park-filter-contractdelta.md` (**Approved**, PO vastenburg 2026-09-09). Do **not** re-decide itemId, live body `containsignorecase` `"b"`, load-path owner, `renderWidget`, fail-open remove, empty-after-unpark fail, stamps, or allowlist.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> **Smoke-fail patch:** wrap Rec A shipped (captain GO 2026-09-09). Dual review PASS. Cognos smoke pending PO.

---

**Status:** `Implemented` — wrap Rec A dual grok 4.6 PASS 2026-09-09. Cognos smoke pending PO.
**Module / contract:** `contracts/tableDataService.md` + `contracts/tableData-hierarchy-park-filter-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6 coordinator, 2026-09-09
**Executing AI:** grok 4.6 army (one writer, after review PASS)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer — smoke-fail patch)

**May edit:**

- `KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js`

**Must not edit:** `createTableDataService.js`; `runLoadTableWork.js`; `tables.js`; `__orchestratorTableData.js`; `readTableQueryResult.js`; `waitForTableQueryResult.js`; `inspectQueryResult.js`; `waitForQueryResult.js`; `startTableLoad.js`; `abortTableLoad.js`; `clearRuntimeLoad.js`; `resolveTableWidgetId.js`; metricsTree; dienststelle; widgetBindingApply; widgetVis; widgetTopN; `bindingSpecs.js`; `writeFilter.js`; `addOrReplaceLocalFilter.js`; `clearAllLocalFilters.js`; `removeLocalFilter.js`; `renderWidget.js`; `KDB.js`; parent contracts except captain-owned one-liners; `.cursor/rules/*.mdc`; git.

**Must not create:** any new file; `helpers/` / `common/` / `shared/`; a public park API; a `listLocalFilters` op; a second wrap in dienststelle or metricsTree.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` via argument; config under `_KDB.config.tables`; no new top-level namespace.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this WP does not add writers; `markTableLoaded` / `markTableFailed` stay the only load commits.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — stamp existing facet refs on `_KDB.runtime.tableData`; no new park-generation bucket.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `_KDB.services.tableData` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events; existing `tableData:loadFinished` / `loadFailed` unchanged.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS ≤150; orch ≤120; AMD ≤10 or split; no `helpers`/`common`/`shared`; Module Contract First already satisfied.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English files; `_` on boundary params; no new lifecycle term.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on the wrap; facet Outcomes never thrown; missing park filter is skip not fail.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM in this WP.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define` per file; factory-scope named helpers; no new nested subfunctions inside the entry; no ES modules in `KDB3/js/**`.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — no new lifecycle terms; empty park-listed load uses `error` via existing `markTableFailed`.
12. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no `_KDB.cognosAPI` / `__getDashboardAPI` in tableData; stamps only; no new facet/op.
13. `_____________KDB3API/contracts/tableData-hierarchy-park-filter-contractdelta.md` — HideData `containsignorecase` `"b"`; unpark (`HideData`/`_none`/`_1`) → render → read → repark; successor-gated unsignaled post-repark render; empty ≠ ready for park keys.
14. This execution spec.

---

## Section B. Folder tree (smoke-fail patch)

```
KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js  (edit only)
```

No new files. No new folders. Other Section C files below are **already shipped**; do not re-open them.

---

## Section C. Per-file specifications

Smoke-fail writer: **only** `readParkedTableQueryResult.js`. Other files in this section are shipped history — do not re-open.

#### `KDB3/js/core/config/tables.js`

- **Role:** declarative table config
- **Lines:** 203 → ~230 (hard 150 does **not** apply to this config file; keep the edit tiny)
- **AMD:** unchanged `define([], ...)`
- **Change only:** add the same `parkFilter` object to `personal_kdb`, `dienststelle_bw_hierarchy`, `dienststelle_dezpv_hierarchy`. Literal duplicate three times. No shared const outside the returned object (file already returns one object literal — inline on each key).
- **Exact object:**

```js
parkFilter: {
  itemId: "HideData",
  body: {
    exclude: false,
    values: [],
    type: "display",
    conditionsInfo: {
      excludedValues: [],
      conditions: {
        operator: "containsignorecase",
        itemId: "HideData",
        ignoreCase: true,
        values: ["b"],
        valueType: "display"
      }
    },
    action: "keepexclude"
  }
}
```

- **Must not:** add `parkFilter` to any other key; change `load` / `name` / `role`; invent `visType` fields.

- **Rules to apply:** `kdb-object` (config lives on `_KDB.config.tables`); `naming` (English keys).

---

#### `KDB3/js/core/services/tableData/effects/readVisualizationFacet.js`

- **Role:** owner choke
- **Lines:** target 10 (hard 20)
- **AMD imports:** none (`define([], ...)`)
- **Factory parameters:** `_KDB`
- **Entry:** copy `effects/readDataQueryFacet.js` 1–10. Return `runtime.tableData.visualizationFacet` or `null`.
- **Must not:** look up `_KDB.services.cognosHost`; read `runtime.widgetVis` or `runtime.widgetBindingApply`.

- **Rules to apply:** `cognos-adapter` (stamp choke); `runtime`; `amd`.

---

#### `KDB3/js/core/services/tableData/effects/readWidgetsFacet.js`

- **Role:** owner choke
- **Lines:** target 10 (hard 20)
- **AMD imports:** none
- **Factory parameters:** `_KDB`
- **Entry:** same as visualization choke, property `widgetsFacet` on `runtime.tableData`.
- **Must not:** copy `widgetVis/effects/readWidgetsFacet.js` path (`runtime.widgetVis`).

- **Rules to apply:** `cognos-adapter`; `runtime`; `amd`.

---

#### `KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js`

- **Role:** load-path wrap (effect)
- **Lines:** target ≤145 (hard **150**)
- **AMD imports** (order):
  - `"./readVisualizationFacet.js"`
  - `"./readWidgetsFacet.js"`
  - `"./readTableQueryResult.js"`
- **Factory parameters:** none on the AMD factory (file returns the named async function). Match `readTableQueryResult.js` style: `function readParkedTableQueryResult(...)`.
- **Entry function:** `async function readParkedTableQueryResult(_KDB, _widgetId, _input, _signal)`
- **Factory-scope named helpers** (no nested functions inside the entry):
  - `function readParkFilter(_KDB, _input)` — `tableKey = input.tableHandle || input.tableName`; read `_KDB.config.tables[tableKey].parkFilter`; return `{ itemId, body }` only if `itemId` is non-empty string and `body` is a non-null object; else `null`.
  - `function isAbortSignal(_signal)` — `!!(_signal && _signal.aborted === true)`.
  - `function shouldRestorePark(_KDB, _tableKey, _signal)` — contract §6 table. Read `_KDB.runtime.tableData.abortControllers[_tableKey]` (AbortController). Missing → true. `current.signal === _signal` → true. Else false. Compare **`.signal`**, never `current === _signal`. If `!_tableKey` return true.
  - `function isParkListedEmpty(_readResult)` — `readResult && readResult.status === "ready"` and (`!readResult.result` or `readResult.result.rowCount === 0`).
  - `async function tryRemoveParkFilter(_vis, _widgetId, _itemId, _signal)` — if no vis / no `removeLocalFilter`, return. If aborted, return. Three fail-open removes, **same** abort gate and `{ signal: _signal }` as today: `{ itemId: _itemId }`, `{ itemId: _itemId + "_none" }`, `{ itemId: _itemId + "_1" }`. Inline try/catch per call or one try around the three. Swallow errors and non-ok Outcomes. **Never throw.** Do not add a nested function inside the entry (8–50). Do not edit `addOrReplaceLocalFilter.js`.
  - `async function restoreParkFilter(_vis, _widgetId, _park, _KDB)` — if `!_vis` or `typeof vis.addOrReplaceLocalFilter !== "function"`, return. Do not pass the load signal. `await vis.addOrReplaceLocalFilter(widgetId, park.itemId, park.body)`. After await: if `ok !== true` and `reason === "disposed"`, return silently; else on throw / `ok !== true` `console.error("[tableDataService.readParkedTableQueryResult] repark failed", ...)`. Do not throw. Do not render here (render is `finally` after a second `shouldRestorePark` check). Do not add a runtime disposed / generation bucket.
  - `async function waitParkPollInterval(_ms, _signal)` — Promise that resolves after `_ms` or sooner if `_signal.aborted`. No nested functions: factory-scope only. Do not throw.
  - `async function readUntilParkRows(_KDB, _widgetId, _signal)` — clock `Date.now() + 60000` **after caller already rendered**. Loop: abort → `{ status: "aborted", result: null }`; `readResult = await readTableQueryResult(_KDB, _widgetId, { signal: _signal })`; if aborted/failed/non-empty ready → return that result; if ready-empty and `Date.now() >= deadline` → `{ status: "failed", result: null, error: new Error("TABLE_DATA_PARK_EMPTY") }`; else `await waitParkPollInterval(100, _signal)` and continue. Do **not** call `peekQueryRows` / `waitForTableQueryResult`. Do **not** change `inspectQueryResult.js`.

- **Entry body algorithm:**
  1. If `!_widgetId` or abort → delegate `readTableQueryResult(_KDB, _widgetId, { signal: _signal })` (same empty/abort dialect as today).
  2. `park = readParkFilter(_KDB, _input)`. If `!park` → `return readTableQueryResult(...)`.
  3. `vis = readVisualizationFacet(_KDB)`; `widgets = readWidgetsFacet(_KDB)`.
  4. `tableKey = _input.tableHandle || _input.tableName`.
  5. `try { await tryRemoveParkFilter(...); if abort → return { status: "aborted", result: null }; if !widgets || typeof widgets.renderWidget !== "function" → return failed (Error `"widgetsFacet.renderWidget missing"`); `renderOutcome = await widgets.renderWidget(_widgetId, { signal: _signal });` if abort after render → aborted; if `!renderOutcome || renderOutcome.ok !== true` → failed (use `errorCode` if present); `return await readUntilParkRows(_KDB, _widgetId, _signal);` } `finally { if (park && _widgetId && shouldRestorePark(_KDB, tableKey, _signal)) { await restoreParkFilter(vis, _widgetId, park, _KDB); if (shouldRestorePark(_KDB, tableKey, _signal) && widgets && typeof widgets.renderWidget === "function") { try { await widgets.renderWidget(_widgetId); } catch (error) { console.error("[tableDataService.readParkedTableQueryResult] repark render failed", error); } } } }` Unsignaled render only. Swallow non-ok Outcome the same way (`console.error`, no throw). If first `shouldRestorePark` is false: skip **add and** render. Squeeze blanks; file stays ≤150; AMD stays 3. No `.catch(fn)` in the entry.
  6. Outer try/catch around the try/finally: abort errors → `{ status: "aborted" }`; other throw → `{ status: "failed", error }` + `console.error`. **Repark must still run** (finally).

- **Must not:** `clearAllLocalFilters`; `writeFilter`; `whenRenderComplete`; `peekQueryRows`; `_KDB.cognosAPI`; `waitForTableQueryResult`; change `inspectQueryResult.js`; pass aborted signal into `addOrReplaceLocalFilter`. Wrap-local poll until `rowCount > 0` **is required**.

- **Rules to apply:** `cognos-adapter`; `error-handling`; `amd`; `feature-structure` (150); `naming`.

---

#### `KDB3/js/core/services/tableData/__orchestratorTableData.js`

- **Role:** service orchestrator
- **Lines:** 54 → ~72 (hard **120**)
- **AMD:** stays **2** (`createTableDataService`, `registerConfiguredLoadsOnStartup`). Stamp readers stay **factory-scope functions in this file**, like existing `readCanvasFacet` / `readDataQueryFacet`.
- **Change:** add `readVisualizationFacet(_KDB)` and `readWidgetsFacet(_KDB)` next to the existing two (return `service.visualization` / `service.widgets`). In `stampHostFacets`, assign `visualizationFacet` and `widgetsFacet` after `dataQueryFacet`.
- **Must not:** import the new `effects/readVisualizationFacet.js` here (those are for deep files). Do not add AMD. Do not thicken `createTableDataService`.

- **Rules to apply:** `amd` (orch ≤120, AMD 2); `cognos-adapter` (orchestrator stamps); `runtime`.

---

#### `KDB3/js/core/services/tableData/operations/runLoadTableWork.js`

- **Role:** load worker
- **Lines:** 138 (keep ≤150)
- **AMD:** stays **9**. Replace the `../effects/readTableQueryResult.js` import with `../effects/readParkedTableQueryResult.js`. Parameter `_readTableQueryResult` → `_readParkedTableQueryResult` (or keep local name; one binding).
- **Call site** (today line ~25): change

```js
const readResult = await _readTableQueryResult(_KDB, widgetId, { signal: signal });
```

to

```js
const readResult = await _readParkedTableQueryResult(_KDB, widgetId, input, signal);
```

- **Must not:** inline park logic; add AMD; change `commitLoaded` / toast / abort handling.

- **Rules to apply:** `amd` (9, not 10); `feature-structure`; `error-handling` (existing failed path consumes wrap `status === "failed"`).

---

## Section D. Closed decisions (do not reopen)

1. `itemId` is the string `"HideData"` — not a TM1 unique-name guess.
2. Write body is keepexclude `containsignorecase` `"b"` (live console: leftovers stay empty). Read dump `conditions` is not the addFilter body. Not numeric `from`/`to`, not `{ values: ["1"] }`.
3. Identification is `parkFilter` on three config keys, not `visType === "hierarchy"` in JS.
4. Wrap is only on `runLoadTableWork` via the new effect. Not metricsTree, not `awaitDienststelleDataReady`.
5. No `parkAfterFirstLoad` flag / runtime latch.
6. No `listLocalFilters`.
7. Empty structured query remains valid **globally**. Wrap-local: first ready-empty after render is not fail; still empty after 60s is `TABLE_DATA_PARK_EMPTY`. SET restore ready+0 S6 does not run; do not patch dienststelle.
8. Repark successor guard uses existing `abortControllers[tableKey].signal === signal`. No new bucket. Post-repark `renderWidget` is unsignaled, inside that guard, with a **second** `shouldRestorePark` check after add. Skip both when a successor owns the widget.
9. Unpark instance ids are `"HideData"`, `"HideData_none"`, `"HideData_1"` only in this wrap. Do not reopen D4 `listLocalFilters` or `clearAllLocalFilters`.

---

## Section E. Dual-review checklist (after JS)

- [ ] only `readParkedTableQueryResult.js` changed in JS
- [ ] wrap ≤150, AMD 3
- [ ] unpark removes `itemId`, `itemId+"_none"`, `itemId+"_1"` (fail-open, same signal)
- [ ] `finally`: skip add+render when `shouldRestorePark` is false; re-check before unsignaled `renderWidget`; swallow render fail (no throw)
- [ ] no `_KDB.cognosAPI` / `_KDB.services.cognosHost` in the wrap
- [ ] no `clearAllLocalFilters` / `writeFilter` / `listLocalFilters`
- [ ] `createTableDataService.js`, `addOrReplaceLocalFilter.js`, metricsTree, dienststelle git-unchanged
- [ ] JSDoc-free unless the wrap already uses it

---

## Section F. Out of scope

Cognos 10k cap; unique-leaf JS; duplicate-hide; toast PROGRAM; Alle CSS; DEZPV cube vs calculated Sicht; `markTableStale`; Q1 `hierarchyDataService`; parent folder-layout rewrite in `tableDataService.md` §9.

# Contract Delta: leftover Hierarchy `HideData` park filter

> PO vastenburg 2026-09-09: leftover `visType: "Hierarchy"` widgets are expensive while idle. Park with widget-local HideData **keepexclude** `containsignorecase` `"b"` (live console: leftovers stay empty). KDB unparks for the Cognos read, then restores that body. Numeric `from`/`to` and list `{ values: ["1"] }` are **closed**. Dump `getFilterList` `conditions` (no `conditionsInfo`) is **read shape only** — do not pass it to `addFilter`. Default Dienststelle volume and Cognos 10k cap stay **OOS**. Unique-leaf JS org-tree filter (rec **F**) stays closed.

---

**Status:** `Implemented` — wrap Rec A dual review PASS 2026-09-09 (mechanical + semantic). Cognos-host smoke pending PO.
**Type:** `shared service contract delta`
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-09
**Reviewed by:** PO vastenburg (product lock + live probe)
**Related rules:** `cognos-adapter.mdc`, `feature-structure.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc`, `runtime.mdc`, `kdb-object.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/tableDataService.md` | §3 stamps, §7/§8 host choke, load path wrap. **No** new public method. |
| `contracts/cognosHostService.md` | §7 tableData injection: stamp existing `visualizationFacet` + `widgetsFacet` (not a new facet, not a new op, not D4). |

Parent **Q1** (“hierarchy deferred / list-only skeleton”) is **stale for these leftovers**. `resolveTableWidgetId` already matches `visType` lowercase `list` \| `hierarchy`. This WP does **not** create `hierarchyDataService`.

---

## 1. Purpose

Three leftover Hierarchy visualizations stay cheap while KDB is idle, and still yield a real query when `tableData` loads them:

| `tables.js` key | Cognos `visTitle` | First load |
|---|---|---|
| `personal_kdb` | `Personal_KDB` | Boot `loadTable` (`load: true`) |
| `dienststelle_bw_hierarchy` | `Dienststelle_BWHierarchy` | Later `waitForRows` (`load: false`) |
| `dienststelle_dezpv_hierarchy` | `Dienststelle_DEZPVHierarchy` | Later `waitForRows` (`load: false`) |

`HideData` is an **attribute** data item on each leftover’s datasource. **Write** (live console `addFilter`, leftovers stay empty one after another): keepexclude body in §4. **Read** (`getFilterList`): `conditions.operator: "containsignorecase"`, `values: ["b"]`. Do not send the read object to `addFilter` — that drops the filter after `remove`. Removing the filter restores rows (unpark).

---

## 2. Product rules (closed)

| Rule | Behaviour |
|---|---|
| Allowlist | Only the three `tables.js` keys that carry `parkFilter`. Not every `visType === "Hierarchy"`. Not List leftovers (Jahr, NewestStichtag, TopN untitled, filter-option tables, SuperUser, writeback, `*_ready`). |
| Filter | Widget-**local** visualization filter. `itemId: "HideData"`. Write body §4 (`keepexclude` + `containsignorecase` `"b"`). Unpark still `HideData` / `_none` / `_1`. Do not remove other leftover filters (e.g. Personal_KDB Kurztext). |
| Before read | **Try** three fail-open removes, same abort gate: `{ itemId }`, `{ itemId+"_none" }`, `{ itemId+"_1" }`. Host matches **filter instance id**, not `columnId`. UI-authored park is `HideData_none`; KDB `addFilter` is `HideData`. Missing any id = skip, **not** fail. Do not list filters (D4). Do not edit `addOrReplaceLocalFilter.js`. |
| After unpark | `renderWidget(widgetId)` then wrap-local poll of existing `readTableQueryResult` until `rowCount > 0` or 60s/abort. `renderWidget` does not wait for a new query; `waitForQueryResult` still treats the **current** parked empty (`itemCount > 0`, `rowCount === 0`) as success. The first ready-empty after render is **not** `TABLE_DATA_PARK_EMPTY`. |
| After success | `addOrReplaceLocalFilter(widgetId, "HideData", body)`, then unsignaled `renderWidget` **only** if the successor guard still says this load owns the widget (contract §6). Swallow render fail; do not convert a successful read into `markTableFailed`. |
| Kennzahlen | First boot may have **no** park filter yet. Remove is a no-op → full read → then park. If authoring already parked `Personal_KDB`, remove **must** run before that first boot read. |
| Hierarchy | May be authored already parked. Same wrap on first `waitForRows` load. |
| Empty after unpark | For `parkFilter` keys only: if the wrap poll still has `rowCount === 0` (or null flatten) at budget, that is **failed**, not `ready`+empty. Do **not** change `inspectQueryResult.js`. SET restore’s ready+0 S6 fallback **does not run** for these keys (`waitForRows` rejects). Do not patch dienststelle. |
| Cache | `waitForRows` after `ready` stays cache-only (no unpark). `reloadTable` always goes through the wrap. |
| Authoring | PO may keep HideData on BW/DEZPV from dashboard open. KDB does not list local filters. |
| HideSpot | The three `parkFilter` rows also set `launchpad: false`. widgetBase discovery stamps the descriptor from `entry.name`; those leftovers stay on the authored canvas (leftover CSS hides them). Not this wrap. |

**Forbidden**

- `clearAllLocalFilters` (strips every local filter on that widget).
- `writeFilter` / page-context / `scopeId: widgetId`.
- `forceEmpty` / `emptyData` / widgetBindingApply / widgetVis / widgetTopN rebuild on these leftovers.
- New public `tableData` method; new cognosHost facet or op (`listLocalFilters` is D4 — no).
- `_KDB.cognosAPI` / `__getDashboardAPI` from tableData / features.
- Waiting for `rowCount > 0` inside `inspectQueryResult` / `waitForQueryResult` (global). Wrap-local poll after render **is** required (§5).
- `whenRenderComplete` on leftovers (tab-vis waiter; may never fire).
- Parking by datasource name `Personal_KDB` (visible charts). Identification is `tables.js` key + leftover widget title match already used by `resolveTableWidgetId`.

---

## 3. Ownership

| Layer | Role |
|---|---|
| `tables.js` | Authored `parkFilter: "hideDataContainsB"` on the three keys only. **`tables.js`** factory-scope `resolveParkFilters` looks up `core/config/localFilterRecipes.js` and stamps `{ itemId, body }` before the module returns (wrap hop unchanged). Same three rows also carry `launchpad: false` (boolean next to `load`; do **not** infer HideSpot from the recipe id). HideSpot skip is **widgetBase**, not this wrap. No `helpers/` / `common/` / `shared/`. No `_KDB.config.localFilterRecipes`. Authorship: `tableData-local-filter-recipes-contractdelta.md`. |
| `__orchestratorTableData` | Stamp `_KDB.runtime.tableData.visualizationFacet` and `.widgetsFacet` next to canvas/dataQuery. Factory-scope readers, no extra AMD. |
| `effects/readVisualizationFacet.js` / `readWidgetsFacet.js` | Owner chokes. Copy `readDataQueryFacet.js`. Read `runtime.tableData`, not `widgetVis`. |
| `effects/readParkedTableQueryResult.js` (**new**) | Unpark → render → existing `readTableQueryResult` → empty rail → repark in `finally`. |
| `operations/runLoadTableWork.js` | Replace the `readTableQueryResult` import with the wrap. No other park logic. AMD stays 9. |
| `createTableDataService.js` | **Untouched** (150 / AMD 10). |
| metricsTree / dienststelle | **Untouched.** First Kennzahlen read is boot `loadTable`; owner wraps are too late. |

---

## 4. Config shape

**Authored** on each of the three keys (`parkFilter` is a recipe id): `parkFilter: "hideDataContainsB"`. Recipe bytes live in `core/config/localFilterRecipes.js` (`hideDataContainsB`). `tables.js` resolves the id before return.

**Stamped** (wrap lookup — unchanged bytes):

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

Lookup: `_KDB.config.tables[tableKey].parkFilter` where `tableKey` is `resolveTableKey(input)` (`tableHandle` \|\| `tableName`). Absent / incomplete `parkFilter` → today’s `readTableQueryResult` only.

`addOrReplaceLocalFilter` must receive this **write** body as-is. Empty `values[]` so the facet does not rewrite `type`. Do not pass `getFilterList` `conditions` (read shape).

---

## 5. Load-path protocol

Inside the wrap, only when `parkFilter` is complete and `widgetId` is non-empty:

1. Fail-open three `visualizationFacet.removeLocalFilter` calls: `{ itemId }`, `{ itemId+"_none" }`, `{ itemId+"_1" }`. Host miss / `WRITE_FAILED` / missing filter → continue. Disposed / abort → aborted dialect, still attempt repark in `finally` per §6.
2. `widgetsFacet.renderWidget(widgetId, { signal })`. Failed Outcome → `{ status: "failed" }` (existing load-fail + toast). Still repark in `finally`.
3. After render returns, poll existing `readTableQueryResult`. Clock **starts after render**. Empty-ready retries every 100 ms (factory-scope sleep; honour abort).
4. A poll hit that is `failed` / `aborted` / non-empty `ready` returns immediately (do not convert host timeout / `itemCount === 0` into `TABLE_DATA_PARK_EMPTY`).
5. A poll hit that is `ready` and empty retries until 60000 ms after render, then `{ status: "failed", error: TABLE_DATA_PARK_EMPTY }` so `runLoadTableWork` takes `markTableFailed`. Do not `commitLoaded`.
6. `finally`: restore park per §6.

Non-park tables: call `readTableQueryResult` only (no render).

---

## 6. Abort and repark

Repark with `addOrReplaceLocalFilter(widgetId, itemId, body)` **without** the load `signal` (an aborted signal would skip restore and leave the leftover unparked). Disposed = missing visualization facet, or Outcome `reason === "disposed"`. There is no `_KDB.runtime.tableData.disposed` flag. Do not invent one.

**Successor guard (no new runtime bucket):** at wrap start, remember `signal`. In `finally`, read `abortControllers[tableKey]`.

| `abortControllers[tableKey]` | Repark (add + render)? |
|---|---|
| Same controller (`current.signal === signal`) | Yes (success path; controller still this load). |
| Different controller (`current.signal !== signal`) | **No** — skip **add and** post-repark render. `reloadTable` / abort+restart already owns the widget; successor unparks itself. |
| Missing (abort without successor: `abortTable` / inactive hierarchy warmup) | **Yes** — leftover must not stay unparked. Unsignaled render is required so idle leftover is not a full-scan leftover paint. |

**Post-repark render:** `addOrReplaceLocalFilter` does not re-query. After restore, **re-check** `shouldRestorePark`. If still true, `await widgets.renderWidget(widgetId)` **without** the load signal (a signaled render returns aborted without host paint). If the first check was false, skip both. Swallow render throw / non-ok (`console.error`); **do not throw** from `finally` (that would replace a successful wrap return with `markTableFailed`). `TABLE_DATA_PARK_EMPTY` still hits this `finally` (toast stays until `_none` unpark works).

Repark / post-repark-render failure: `console.error`, do **not** convert a successful read into `markTableFailed`. Idle cost is worse than a false load error after rows are in hand.

Do not invent `_KDB.runtime.tableData.parkGeneration`. Do not change `startTableLoad` / `abortTableLoad` / `clearRuntimeLoad` unless the wrap cannot see `abortControllers` (it can).

---

## 7. Stamps (existing facets)

```js
_KDB.runtime.tableData.visualizationFacet = cognosHost.visualization;
_KDB.runtime.tableData.widgetsFacet = cognosHost.widgets;
```

Ops used: `removeLocalFilter`, `addOrReplaceLocalFilter`, `renderWidget`. Deep files use `read*Facet.js` only. No `_KDB.services.cognosHost` lookup in `effects/` / `operations/`.

This is a **new owner stamp**, not a new cognosHost facet or op.

---

## 8. Files (exclusive)

**Smoke-fail patch (this WP):** only `KDB3/js/core/services/tableData/effects/readParkedTableQueryResult.js`.

**Do not touch:** `createTableDataService.js`; `runLoadTableWork.js`; `addOrReplaceLocalFilter.js`; `clearAllLocalFilters.js`; `removeLocalFilter.js`; `tables.js`; `inspectQueryResult.js`; `waitForQueryResult.js`; `waitForTableQueryResult.js` (dead; do not revive); metricsTree; dienststelle; widgetBindingApply / widgetVis / widgetTopN; `bindingSpecs.js`; `writeFilter.js`; `.cursor/rules/*.mdc`.

---

## 9. Acceptance

1. Boot Kennzahlen: `personal_kdb` `ready` with `rowCount > 0`; leftover `Personal_KDB` has HideData `containsignorecase` `"b"` afterwards (paint/chrome parked). Kurztext exclude-null may remain.
2. After Sicht known: active hierarchy leftover loads with `rowCount > 0`, then is parked again. BW warmup must **not** toast `TABLE_DATA_PARK_EMPTY`.
3. Console `getLocalFiltersList`: HideData `conditions.operator === "containsignorecase"` and `values: ["b"]`. Not a numeric slider / list equals-1.
4. `waitForRows` second call does not unpark (cache).
5. List leftovers without `parkFilter` unchanged (no extra `renderWidget`).
6. Missing HideData on first Kennzahlen boot does not fail the load.

---

## 10. Out of scope

- Cognos 10k viz cap; unique-leaf JS filter; duplicate-hide; toast PROGRAM; Alle CSS; DEZPV calculated-Sicht vs native cube.
- Authoring how PO plants HideData in the Cognos spec (assumed present on the datasource).
- `markTableStale.js` (contract-listed, still missing) — not this WP.
- `createTablePayload.isHierarchy` remaining `false`.
- Public `listLocalFilters`.
- Dienststelle SET restore timeout wording / S6 ready+0 path — park-listed empty hierarchy fails not-ready; do not edit restore JS.

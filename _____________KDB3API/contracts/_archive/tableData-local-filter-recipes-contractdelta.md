# Contract Delta: extract leftover park body into `localFilterRecipes.js` (3A)

> PO vastenburg 2026-09-10: do not keep the HideData write body triplicated on three `tables.js` rows. Split **which leftover is parked** (row flag) from **the named local-filter write recipe**. Catalog name is general (`localFilterRecipes`), not `parkFilters`. Locked placement **3A**: `KDB3/js/core/config/localFilterRecipes.js`. No new `_KDB.config` sibling.

---

**Status:** `Implemented` — dual JS review PASS; **PO Cognos green 2026-09-10**.
**Type:** `shared service contract delta` (config authorship only)
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-10
**Reviewed by:** pending army; PO product lock 3A
**Related rules:** `kdb-object.mdc`, `feature-structure.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc`
**Spec:** `contracts/tableData-local-filter-recipes-execution-spec.md`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/tableData-hierarchy-park-filter-contractdelta.md` | §3 `tables.js` authorship; §4 authored vs stamped `parkFilter` shape. Product rules, wrap protocol, HideSpot, body bytes: **unchanged**. |
| `contracts/tableDataService.md` | Approval-log one-liner only. No new public method. |

This WP does **not** change HideData `containsignorecase` `"b"`, unpark ids, repark, wrap file, HideSpot (`launchpad: false`), or widgetBase.

---

## 1. Purpose

One named catalog of widget-local `addFilter` write bodies. Three leftover rows point at the same recipe by **id**. After `tables.js` resolves, `_KDB.config.tables[key].parkFilter` stays `{ itemId, body }` so `readParkedTableQueryResult.js` does not change.

---

## 2. Product lock (PO 2026-09-10)

| # | Lock |
|---|---|
| 1 | File: `KDB3/js/core/config/localFilterRecipes.js`. Not `parkFilters.js`. Not `filterDefinitions.js`. Not `widgetDataTable/config`. Not `tableData/config`. Not `visualizations/`. |
| 2 | No `_KDB.config.localFilterRecipes`. No `_KDB.localFilterRecipes`. `__orchestratorConfig.js` stays at its current 12 AMD imports (already over 10). |
| 3 | `tables.js` rows keep `parkFilter: "hideDataContainsB"` (recipe id string). Factory-scope resolve replaces that string with the recipe object **before** the module returns. |
| 4 | `launchpad: false` stays a **separate** boolean on the same three rows. Do **not** infer HideSpot skip from `parkFilter`. |
| 5 | Catalog may later hold other **named local `addFilter` write bodies**. It must **not** absorb Sicht / Dienststelle / `specialFilterDefinitions` / page-context `writeFilter` / Alle hide / vis `widgetFilter` / kennzahl `filter`. |
| 6 | Wrap, `createTableDataService.js`, `runLoadTableWork.js`, `addOrReplaceLocalFilter.js`, leftover CSS, metricsTree, dienststelle, widgetBase: **untouched**. |

---

## 3. Authored vs stamped shape

**Authored** on each of the three keys (`personal_kdb`, `dienststelle_bw_hierarchy`, `dienststelle_dezpv_hierarchy`):

```js
parkFilter: "hideDataContainsB"
```

**Stamped** (what the wrap already reads):

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

Lookup unchanged: `_KDB.config.tables[tableKey].parkFilter`. Wrap still requires `itemId` string + `body` object. A leftover **string** on the stamp would skip park (`readParkFilter` → null). Resolve **must** finish inside `tables.js`.

Unknown / missing recipe id: only when the row’s `parkFilter` is a **string** that does not resolve to `{ itemId, body }`, delete that row’s `parkFilter` (fail-open; wrap skips) and `console.error` that id. Do **not** delete or log `parkFilter` on other table keys (absent / already an object). Do not throw from config (would break boot). Do not leave a string on any returned row.

If `resolveParkFilters` catches: `console.error`, do **not** rethrow. Strip any leftover string `parkFilter` on the object being returned, then return it (fail-open skip, not wrap-reads-id).

Share the recipe object by reference. Do not clone. Do not `Object.freeze`.

---

## 4. Ownership

| Layer | Role |
|---|---|
| `localFilterRecipes.js` | Named map. Today one key: `hideDataContainsB` → `{ itemId, body }` (bytes = parent §4 write body). One `define([])`. English comment: catalog is local `addFilter` write bodies, not `writeFilter` / Sicht / Alle. No resolve helper exported. |
| `tables.js` | AMD-imports `./localFilterRecipes.js`. Three rows: `parkFilter: "hideDataContainsB"`. One-line English comment pointing at that file. Factory-scope `resolveParkFilters(tables, _recipes)` (local `tables` is **not** `_`-prefixed; `_recipes` is the imported map). try/catch; catch logs and does not rethrow. Returns the tables object. Hard 150 does **not** apply (config catalog). |
| `__orchestratorConfig.js` | Unchanged. Still stamps `_KDB.config.tables` from `tables.js` only. |
| Wrap | Unchanged. One hop: `_KDB.config.tables[tableKey].parkFilter`. |

No `helpers/` / `common/` / `shared/`. No leftover title literals. No `parkFilter: true`.

---

## 5. Forbidden

- New `_KDB.config` sibling or new top-level `_KDB.*`.
- Resolving the recipe id in the wrap (would add AMD / grow 147).
- Resolving in `__orchestratorConfig.js` (13th AMD).
- `widgetDataTable` as owner (scaffold; leftover park is tableData + `tables.js`).
- Inferring `launchpad: false` from a recipe id.
- Moving Sicht / `writeFilter` / bindingSpecs recipes into this file.
- Changing HideData body bytes, unpark suffix list, or repark protocol.
- Editing `.cursor/rules/*.mdc`. Git commit.

---

## 6. Files (exclusive)

**Create:** `KDB3/js/core/config/localFilterRecipes.js`

**Edit:** `KDB3/js/core/config/tables.js`

**Captain contract-only (not army JS):** this file; parent park-delta §3/§4; `tableDataService.md` approval log; this execution spec.

**Do not touch:** `readParkedTableQueryResult.js`; `createTableDataService.js`; `runLoadTableWork.js`; `__orchestratorConfig.js`; `__orchestratorTableData.js`; `addOrReplaceLocalFilter.js`; `inspectQueryResult.js`; widgetBase; leftoverWidgets.css; hideSpot.css; metricsTree; dienststelle; `bindingSpecs.js`; `writeFilter.js`; `KDB.js`.

---

## 7. Acceptance

1. `_KDB.config.tables.personal_kdb.parkFilter.itemId === "HideData"` and `.body.action === "keepexclude"` and `.body.conditionsInfo.conditions.values[0] === "b"`. Same object shape on both Dienststelle leftover keys.
2. `_KDB.config.localFilterRecipes` is **undefined**.
3. `__orchestratorConfig.js` still has exactly 12 AMD paths; wrap AMD stays 3; wrap line count unchanged.
4. `launchpad: false` still on the three leftover rows only. widgetBase HideSpot skip still from that boolean + `entry.name`, not from `parkFilter`.
5. Product park behaviour unchanged (Kennzahlen cache full; leftover HideData after wrap; Kurztext remains). Cognos smoke is PO after JS.

---

## 8. Out of scope

- HideSpot handshake / moving leftovers into `#KDB_HideSpot`.
- `HideData_2` (do not ship; do not save dashboard if present).
- Dead `waitForTableQueryResult.js` / unused `normalizeTableData.js` (pre-existing; do not revive or delete).
- Parent wrap Rec A protocol; numeric / list park bodies (closed).

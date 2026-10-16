# Execution Spec: extract leftover park body into `localFilterRecipes.js` (3A)

> Mechanical spec for Grok 4.6 army. Architecture lives in `tableData-local-filter-recipes-contractdelta.md`. Do **not** re-decide the catalog name, `_KDB.config` sibling, wrap hop, HideData body bytes, or HideSpot boolean.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.

---

**Status:** `Implemented` — dual JS review PASS; **PO Cognos green 2026-09-10**.
**Module / contract:** `contracts/tableDataService.md` + `contracts/tableData-local-filter-recipes-contractdelta.md`
**Phase:** `extension` (config authorship)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-10
**Executing AI:** grok 4.6 army (one writer after review PASS)
**Reviewer:** captain + dual grok 4.6 review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/core/config/localFilterRecipes.js`

**May edit:**

- `KDB3/js/core/config/tables.js`

**Must not edit:** wrap `readParkedTableQueryResult.js`; `createTableDataService.js`; `runLoadTableWork.js`; `__orchestratorConfig.js`; `__orchestratorTableData.js`; `addOrReplaceLocalFilter.js`; `inspectQueryResult.js`; `waitForQueryResult.js`; widgetBase; leftover CSS; metricsTree; dienststelle; `bindingSpecs.js`; `writeFilter.js`; `KDB.js`; parent contracts (captain-owned); `.cursor/rules/*.mdc`; git.

**Must not create:** `helpers/` / `common/` / `shared/`; `_KDB.config.localFilterRecipes`; a wrap import of the catalog; a second resolve in the orchestrator.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — config stays under `_KDB.config.tables`; no new top-level namespace; no `_KDB.config.localFilterRecipes`.
2. `_____________KDB3API/.cursor/rules/state.mdc` — this WP writes no `_KDB.state`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — this WP writes no `_KDB.runtime`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — no new `tableData` method.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — no `helpers`/`common`/`shared`; named catalog file is allowed (peer of `dataSources.js`); Module Contract First already on this delta.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English file/keys/comments; `_` on the AMD import binding; recipe id `hideDataContainsB`.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — `resolveParkFilters` is a named helper with a loop → local try/catch; catch logs and does **not** rethrow; unknown **string** id = omit that row’s `parkFilter` + `console.error` that id.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — no DOM.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define` per file; factory-scope named helper; no nested function inside the helper body; no ES modules.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — no Cognos calls in this WP.
12. `_____________KDB3API/contracts/tableData-local-filter-recipes-contractdelta.md` — 3A; string id on row; resolve in `tables.js`; stamped `{ itemId, body }`; wrap untouched.
13. This execution spec.

---

## Section B. Folder tree

```
KDB3/js/core/config/localFilterRecipes.js   (create)
KDB3/js/core/config/tables.js               (edit)
```

No new folders.

---

## Section C. Per-file specifications

#### `KDB3/js/core/config/localFilterRecipes.js`

- **Role:** named catalog of widget-local `addFilter` write bodies
- **Lines:** ~45 (hard 150; keep tiny)
- **AMD:** `define([], function () { ... })`
- **Return:** one object:

```js
{
  hideDataContainsB: {
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
}
```

- **Comment (English, ≤2 lines):** this catalog is local `addFilter` write bodies. Not page-context `writeFilter`, Sicht, or Alle hide.
- **Must not:** export a resolve/helper function; stamp anything; mention leftover vis titles; `Object.freeze` / clone; put Sicht / `writeFilter` / `specialFilterDefinitions` / vis `widgetFilter` recipes here.

#### `KDB3/js/core/config/tables.js`

- **Role:** table registry
- **Lines:** shrink (hard 150 does **not** apply)
- **AMD:** `define(["./localFilterRecipes.js"], function (_localFilterRecipes) { ... })` — one import, `_` prefix.
- **Change only:**
  1. Add the AMD import.
  2. On `personal_kdb`, `dienststelle_bw_hierarchy`, `dienststelle_dezpv_hierarchy` only: replace the inline `{ itemId, body }` with `parkFilter: "hideDataContainsB"`.
  3. Keep `launchpad: false` on those three rows.
  4. One English comment near the first `parkFilter` (or above the helper): recipe id comes from `./localFilterRecipes.js`.
  5. Factory-scope helper `resolveParkFilters(tables, _recipes)` — local `tables` is **not** `_`-prefixed:
     - try/catch; catch: `console.error`, do **not** rethrow; delete any leftover **string** `parkFilter` on `tables`, then return `tables`
     - for each own key: if `parkFilter` is **not** a string, leave it (do not delete, do not log)
     - if it is a string: replace with `_recipes[id]` when that value is an object with `itemId` + `body`; else delete that row’s `parkFilter` and `console.error` that id
     - return `tables`
     - do not clone / freeze the recipe
  6. `return resolveParkFilters(tablesLiteral, _localFilterRecipes);`
- **Must not:** change `name` / `load` / `role` / `pick` / `shape` / `isCoreTable` / `launchpad`; add `parkFilter` to other keys; leave a string on the returned object; import from `tableData/` or `widgetDataTable/`; add a second helper; delete `parkFilter` on keys that never had a string id.

---

## Section D. Done when

Writer reports: both files written; Section A echoes; line counts; AMD counts (recipes = 0 deps, tables = 1 dep); stamped shape is `{ itemId, body }` for the three keys; no `_KDB.config.localFilterRecipes` wiring.

Then **stop**. Dual review is a separate army. Do not self-certify Cognos.

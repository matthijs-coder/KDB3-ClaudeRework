# Module Contract: `metricsTree` (as built)

> Short as-built contract. The original CP-1 direct-port draft was named `kennzahlenTree` and is archived at [`_archive/kennzahlenTree.md`](./_archive/kennzahlenTree.md) (its purpose, DOM discipline and open questions still apply; names and the folder tree do not).

**Owner module:** `metricsTree` (feature module). **Path:** `KDB3/js/dashboard/metricsTree/`.

## Purpose

Renders the searchable Kennzahlen (metrics) jsTree inside the kdbControl metrics container (`#kdb-control_metrics_container`) and makes leaf nodes draggable sources for `dragDrop`. It reads table data through `_KDB.services.tableData` (table key `personal_kdb`, plus `superuser` for the super-user allowance). The tree source configuration comes from `_KDB.properties.kennzahlenTreePropObj` (Cognos property `kennzahlenTreePropId`, saved shape `{ "<Table name>": { pathColumnNamesArr: [...] } }`, looked up by source key `personal_kdb`, then by table name `Personal_KDB`); `catalog.js` uses `pathColumnNamesArr` as the group path columns and falls back to `Gruppe1`/`Gruppe2`/`Gruppe3` when the property is absent, unparsable or has no entry or no non-empty array for the source. The `dynamicTree` flag in the saved value is not read.

**Known mismatch (code, not docs):** the table column mapping in `catalog.js` still reads `_KDB.properties.metricsTablesPropObj`, which nothing sets; `core/properties/propertyDefinitions.js` publishes `kennzahlenTablesPropObj`. Today the column mapping therefore always falls back to `config.tables.personal_kdb` and the column-name candidate lists. Aligning it would activate the saved `code`/`kurztext`/`hardcoded` mapping and can change leaf labels, so it needs a decision against real data (Phase 2 follow-up). The tree name was aligned in P2-X3.

## Surface

- `_KDB.api.metricsTree = { mount, destroy, dispatch, getState, resolveMetricByCode }`.
- State: `_KDB.state.metricsTree` (lifecycle `idle` / `loading` / `ready` / `error` / `disposed`).
- Selectors for the DOM: `_KDB.elements.selectors.metricsTree` (`rootSelector`).
- Runtime: `_KDB.runtime.metricsTree` (`domRefs.treesBySource`, abort controllers, pending render promise, `metricIndex`); `destroy()` cleans the trees and runtime buckets.
- Emits no events and subscribes to none.

## Folder layout

```txt
KDB3/js/dashboard/metricsTree/
  index.js         # registerMetricsTree: state/runtime setup, api
  config.js        # DOM selector, table keys, column candidates, search icon
  state.js         # initial state and reducer
  effects.js       # mount pipeline: source input, loading overlay, error handling
  catalog.js       # tree sources and nodes from table rows (path columns, Freigabe filter)
  metricLookup.js  # metric code index and resolveMetricByCode
  view.js          # jsTree render, search, DOM refs, cleanup
  dragSource.js    # leaf anchors as drag sources, drag payload
```

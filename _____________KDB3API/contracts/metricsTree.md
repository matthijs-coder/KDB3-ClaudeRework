# Module Contract: `metricsTree` (as built)

> Short as-built contract. The original CP-1 direct-port draft was named `kennzahlenTree` and is archived at [`_archive/kennzahlenTree.md`](./_archive/kennzahlenTree.md) (its purpose, DOM discipline and open questions still apply; names and the folder tree do not).

**Owner module:** `metricsTree` (feature module). **Path:** `KDB3/js/dashboard/metricsTree/`.

## Purpose

Renders the searchable Kennzahlen (metrics) jsTree inside the kdbControl metrics container (`#kdb-control_metrics_container`) and makes leaf nodes draggable sources for `dragDrop`. It reads table data through `_KDB.services.tableData` (table key `personal_kdb`, plus `superuser` for the super-user allowance) and the per-source configuration in `_KDB.properties.metricsTreePropObj` / `metricsTablesPropObj` (read in `catalog.js`).

**Known mismatch (code, not docs):** `core/properties/propertyDefinitions.js` publishes the Cognos properties as `_KDB.properties.kennzahlenTreePropObj` / `kennzahlenTablesPropObj`; `metricsTree/catalog.js` reads the `metrics*` names. Confirm against the live report before relying on either spelling.

## Surface

- `_KDB.api.metricsTree = { mount, destroy, dispatch, getState, resolveMetricByCode }`.
- State: `_KDB.state.metricsTree` (lifecycle `idle` / `loading` / `ready` / `error` / `disposed`).
- Selectors for the DOM: `_KDB.elements.selectors.metricsTree` (`rootSelector`).
- Runtime: `_KDB.runtime.metricsTree` (`domRefs.treesBySource`, abort controllers, pending render promise, `metricIndex`); `destroy()` cleans the trees and runtime buckets.
- Emits no events and subscribes to none.

## Folder layout

```txt
KDB3/js/dashboard/metricsTree/
  __orchestratorMetricsTree.js  # shim: re-exports index.js (path kept for KDB.js)
  index.js         # registerMetricsTree: state/runtime setup, api
  config.js        # DOM selector, table keys, column candidates, search icon
  state.js         # initial state and reducer
  effects.js       # mount pipeline: source input, loading overlay, error handling
  catalog.js       # tree sources and nodes from table rows (path columns, Freigabe filter)
  metricLookup.js  # metric code index and resolveMetricByCode
  view.js          # jsTree render, search, DOM refs, cleanup
  dragSource.js    # leaf anchors as drag sources, drag payload
```

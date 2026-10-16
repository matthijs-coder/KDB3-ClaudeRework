# Module Contract: `dataSourceContext` — STUB

> Future owner for the active datasource context. This is a stub only; full contract belongs to a later datasource tranche.

**Status:** `Stub`
**Owner module / service:** `dataSourceContext`
**Type:** `feature/domain module`
**Authoring AI:** GPT-5.5, 2026-06-08
**Reviewed by:** `<pending full contract>`

## 1. Purpose

`dataSourceContext` will own the currently selected datasource context for metrics/Kennzahlen and any future datasource switch lifecycle. It exists so metrics tree, filters, widgets and binding assemblers do not each invent their own datasource source of truth.

## 2. Ownership

- Future canonical state subtree: `_KDB.state.dataSourceContext`.
- Single writer: `dataSourceContext`.
- Other modules must not read this state directly. They consume a stable public method/selector.

## 3. Public API Sketch

Feature module surface remains dispatch-style plus targeted read methods:

```js
_KDB.api.dataSourceContext = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState,
  getCurrentMetricsDataSource: getCurrentMetricsDataSource
};
```

`getState()` is a cloned snapshot/debug API, not the semantic integration contract for other modules. Cross-module datasource reads should use `getCurrentMetricsDataSource()` or a published selector such as `readCurrentMetricsDataSource(_KDB)`.

## 4. Current Temporary Policy

Until this module exists, modules that need the metrics datasource may use a local boundary resolver that first checks for `_KDB.api.dataSourceContext.getCurrentMetricsDataSource()`, then falls back to `_KDB.config.dataSources.metrics.default`.

The current hardcoded default is `Personal_KDB`.

## 5. Future Effects

Changing the datasource should orchestrate known downstream owners, including metrics tree rebuild, filter-module refresh, and later controlled widget rebind/replan. Exact dispatch/event choreography is out of scope for the current `widgetVis` tranche.

# Execution Spec: `tabs` Dispatch Traversal

> Implements the dispatch-based traversal API from `tabs-writeback-readiness-contractdelta.md`.
> Scope: Promise-returning `tabs/traverse` with `waitFor: "canvas"`. Widget-render readiness remains deferred.

---

**Status:** `Draft`
**Parent contract:** `_____________KDB3API/contracts/tabs.md`
**Delta:** `_____________KDB3API/contracts/tabs-writeback-readiness-contractdelta.md`
**Phase:** `dispatch traversal`
**Authoring AI:** GPT-5.5, 2026-06-21
**Executing AI:** `composer 2.5 subagent`

---

## 1. Goal

Make this public API work:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: {
    source: "writebackGet",
    scope: "singleTab",
    tabIndex: 2,
    includeHiddenDashboardTabs: true,
    restoreActiveTab: true,
    waitFor: "canvas",
    timeoutMs: 30000
  }
});
```

The returned Promise resolves `true` when the requested tabs-level canvas lazyload barrier completes, otherwise `false`.

## 2. Files To Read

Read before editing:

1. `contracts/tabs.md`
2. `contracts/tabs-writeback-readiness-contractdelta.md`
3. this execution spec
4. `KDB3/js/dashboard/tabs/createTabsController.js`
5. `KDB3/js/dashboard/tabs/effects/traverseTabs.js`
6. `KDB3/js/dashboard/tabs/state/reduceTabsAction.js`
7. `KDB3/js/dashboard/tabs/state/createInitialTabsState.js`
8. `KDB3/js/dashboard/tabs/config/actionTypes.js`
9. `KDB3/js/dashboard/tabs/config/defaults.js`

Do not read legacy folders.

## 3. Required Behavior

### 3.1 Dispatch Routing

`_KDB.api.tabs.dispatch({ type: "tabs/traverse", payload })` must call the async traversal effect and return its Promise.

It must not only reduce state.

### 3.2 Supported Payload

```js
{
  source: "writebackGet",
  scope: "visibleDashboard" | "allDashboard" | "singleTab",
  tabIndex: 0,
  includeHiddenDashboardTabs: false,
  includeHelperTabs: false,
  restoreActiveTab: true,
  waitFor: "canvas",
  timeoutMs: 30000
}
```

Defaults:

- `source: "api"`;
- `scope: "visibleDashboard"`;
- `includeHiddenDashboardTabs: false`;
- `includeHelperTabs: false`;
- `restoreActiveTab: true`;
- `waitFor: "canvas"`;
- `timeoutMs` may use existing hydrate timeout default.

`waitFor: "widgetsRendered"` is supported since 2026-07-13: per traversed tab, after the click delay, the traverse awaits `widgetBase/renderTabWidgetsRequested` via `_KDB.api.widgetBase` (effect `tabs/effects/awaitTabWidgetsRendered.js`), which renders the tab's onCanvas vis widgets with a bounded render-complete wait. Failures degrade (warn + continue). The optional traverse option `restoreTabIndex` (number) overrides the natively captured `activeIndex` as the landing tab when `restoreActiveTab: true`.

### 3.3 Scope Semantics

| Scope | Traversed tabs |
|---|---|
| `visibleDashboard` | visible dashboard-role tabs only |
| `allDashboard` | dashboard-role tabs; include hidden only when `includeHiddenDashboardTabs === true` |
| `singleTab` | only `payload.tabIndex`; hidden allowed only when `includeHiddenDashboardTabs === true` |

Helper/non-dashboard tabs remain excluded unless `includeHelperTabs === true`; helper traversal may return `false` if unsupported.

### 3.4 No Visibility Mutation

Traversal may temporarily click/activate hidden dashboard tabs, but must not:

- set `_KDB.state.tabs.byIndex[index].visible = true`;
- add durable `KDB_visible` tab-button state for hidden tabs;
- call `tabs/add`;
- change tab order.

### 3.5 Active Tab Restore

If `restoreActiveTab !== false`, restore the previously active tab after traversal. When the caller passes `restoreTabIndex` (post-restore traverse, bugfix sync 2026-07-13), that index overrides the natively captured `activeIndex` as the landing tab.

Log restore using existing `[tabs.traverse] restored active tab` logging.

### 3.6 State Updates

On pending:

- `traversal.lifecycle = "loading"`;
- record traversal scope/source where practical.

On confirmed:

- `traversal.lifecycle = "ready"`;
- `traversedIndexes` contains requested indexes that were actually clicked;
- visited requested tabs get `isCanvasLoaded: true`;
- if implementing new fields is low-risk, set `hasBeenActivated`, `activatedAt`, `activatedBy`, `canvasLoadedAt`, `canvasLoadSource`; otherwise leave as contract-reserved and do not fake them.

On failure:

- `traversal.lifecycle = "error"`;
- `errorCode` / `errorMessage` populated;
- Promise resolves `false`.

## 4. Concurrency

Do not start duplicate identical traversal workflows.

Minimum acceptable implementation:

- keep `runtime.tabs.pendingPromises.traverse` or scoped key;
- if an equivalent traversal is in flight, return the existing Promise;
- if a different traversal is in flight, either return `false` with owned error or queue only if trivial.

## 5. Logging

Preserve existing `[tabs.traverse]` logging:

- `called/start`;
- `traversing tab`;
- `completed relevant tabs`;
- `restored active tab`.

Logs must include `source`, `scope`, `tabIndex` where applicable, and tab identity when available.

## 6. Forbidden

Do not implement:

- widget-render readiness;
- writeback logic;
- widget/launchpad/filter mutations;
- delete/duplicate/move/reorder;
- new top-level `_KDB.*`;
- legacy reads/writes.

## 7. Validation

Run:

- `ReadLints` on changed files;
- `node --check` on changed JS files.

Search/report:

- no `adjustTabObj`;
- no `WBParameter`;
- no `pushCommittedStep`;
- no widget mutation behavior;
- no legacy folder reads.

Manual smoke examples:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: { source: "manual", scope: "visibleDashboard" }
});

await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: {
    source: "manual",
    scope: "singleTab",
    tabIndex: 2,
    includeHiddenDashboardTabs: true,
    restoreActiveTab: true,
    waitFor: "canvas"
  }
});
```

Expected:

- Promise resolves boolean;
- relevant logs appear;
- active tab restored;
- hidden tab visibility state unchanged.

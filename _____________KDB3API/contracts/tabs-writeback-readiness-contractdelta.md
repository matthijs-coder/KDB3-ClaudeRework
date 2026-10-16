# Contract Delta: `tabs` Writeback Readiness

> Delta on top of `contracts/tabs.md`.
> Captures what the current tabs traversal does and does not guarantee for future writeback collectors.
> This delta is contract-only: no production code is approved by this document.

---

**Status:** `Draft`
**Parent contract:** `_____________KDB3API/contracts/tabs.md`
**Owner module / service:** `tabs`
**Consumer:** future `writebackGet` / writeback service
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-06-21
**Reviewed by:** writeback GET visible-dashboard amendment 2026-08-30 (`writeback-get-visibleDashboard-contractdelta.md`)

---

## 1. Purpose

The writeback planner asked whether legacy `moveToFirstTabAndBack` can be replaced by KDB3 `tabs` traversal.

This delta records the current answer:

- current startup `traverseTabs` is useful for visible dashboard-tab lazy loading;
- it is **not** a writeback GET readiness barrier by itself;
- GET collectors use `tabs/traverse` `scope: "visibleDashboard"` (`writeback-get-visibleDashboard-contractdelta.md`);
- hidden-include remains a **capability** for SET activate / old payloads that still name a hidden `tabIdx`, not a GET collector barrier.

## 1.1 Design Decision

Dashboard startup and writeback have different traversal requirements:

| Flow | Requirement |
|---|---|
| Dashboard startup | `tabs.mount()` triggers non-blocking background traversal. It must not block `KDB.js` startup and may remain performance-oriented. |
| Writeback GET | Before DOM/canvas/widget collectors: `tabs/traverse` `scope: "visibleDashboard"`, `includeHiddenDashboardTabs: false`. Hidden slots are **shell-relevant** (`tabs[]` `hide: 1`) and **not content-relevant**. |
| Writeback SET | May request hidden include (`singleTab` / activate) only when the payload names that `tabIdx` in `wgts` or page-`filt`. |

Hidden dashboard tabs stay in the model as unused tail slots. GET must not activate them to collect widgets or page-context DOM. SET still activates a hidden tab when an old photo still lists it.

## 2. Current Traversal Guarantee

Current `tabs` traversal guarantees only this:

1. The `tabs` module has discovered Cognos tab buttons and built `_KDB.state.tabs.byIndex`.
2. Traversal clicks tabs that the current implementation considers traversable.
3. In the current implementation, traversable tabs are **visible dashboard-role tabs only**.
4. Helper tabs, non-dashboard tabs and hidden dashboard tabs are not guaranteed to be clicked.
5. After successful traversal, `_KDB.state.tabs.traversal.lifecycle` may become `"ready"`.
6. `traversedIndexes` records the indexes actually visited.
7. `byIndex[index].isCanvasLoaded` may be set for visited indexes.
8. The active tab is restored on a best-effort basis after traversal.

This means:

```txt
traversal.lifecycle === "ready"
```

currently means:

```txt
the current visible-dashboard-tab traversal completed
```

It does **not** mean:

```txt
all physical/user/helper/hidden tabs are ready for writeback collectors
```

## 3. Explicit Non-Guarantees

Current traversal does not guarantee:

- hidden dashboard tabs were visited;
- launchpad/helper tabs were visited;
- every physical Cognos tab was clicked;
- every tab canvas has fully rendered all widgets;
- every widget/content collector can safely read final DOM;
- page-context filters are fully materialized for every hidden tab;
- writeback can replace legacy `moveToFirstTabAndBack` with current startup traversal alone.

The current traversal state must therefore not be used as the only writeback save barrier.

Current startup traversal is still required and should still be triggered by `tabs.mount()`. The restriction is that startup traversal is not enough for writeback and must not be awaited in `KDB.js`.

## 4. Stable Mapping Guarantee

After `tabs/syncFromDom` has succeeded, `tabs` owns the mapping:

```js
_KDB.state.tabs.byIndex[index] = {
  index: 0,
  tabId: "...",
  pageId: "...",
  role: "dashboard",
  visible: true
}
```

For cross-module consumers, this mapping must be read through:

```js
_KDB.api.tabs.getState()
```

or a published tabs selector, not by foreign mutation of `_KDB.state.tabs`.

`tabId` and `pageId` are the canonical tab/page identity available to writeback for future page-context-filter or scope-id mapping. If writeback needs a distinct `scopeId` field, that must be added by a future contract delta rather than inferred ad hoc.

## 4.1 Identity Terminology For Writeback

Tabs and writeback must keep these identity layers separate:

| Term | Contract meaning |
|---|---|
| `tabIdx` / `index` | Stable 0-based physical dashboard tab position. This is the persisted v3 writeback position used by tab/widget entries. |
| `tabId` | Canonical Cognos page/content identity used by KDB3 module APIs. |
| `pageId` | Alias/projection for the same Cognos page/content identity unless a future Cognos-specific delta proves a durable difference. |
| `scopeId` | Filter/page-context alias for `tabId` / `pageId`; not a separate persisted tabs identity in this tranche. |
| `cor_page_id` | Legacy/DOM naming for the same page identity, mainly in launchpad/dropzone metadata. |
| `containerId` | Runtime Cognos/widget container handle below the tab/page level; not a durable tabs identity. |
| `dropboxId` | Runtime DOM/drop target handle under a tab's first child/page container; not a durable tabs identity. |

Writeback must persist tab/widget placement primarily by `tabIdx`. It may use `tabId` / `pageId` / `scopeId` aliases as runtime lookup aids, but must not treat `containerId` or `dropboxId` as stable saved tab identity.

## 4.2 Tab DOM Nesting Model

Tabs own the tab/page identity, not every widget DOM node below it.

The expected Cognos nesting model is:

```txt
layout.items[tabIdx]              // tab shell / page owner
  items[0]                        // first child / page container
    items[]                       // widget specs below the page container
```

In the rendered DOM, widgets and drop targets may live under a first child/page container below the tab element. WritebackSet must therefore not assume that the tab button DOM itself is the widget target. If a restore step needs a DOM `containerId` or `dropboxId`, it must resolve that after the tab has been activated/rendered, or through a future owner API that exposes the runtime target safely.

## 4.3 Per-Tab Readiness State Model

Future tabs implementation must split these concepts instead of overloading `isCanvasLoaded`:

```js
_KDB.state.tabs.byIndex[index] = {
  // Existing identity / visibility
  index: 0,
  tabId: "...",
  pageId: "...",
  role: "dashboard",
  visible: true,

  // Selection: current Cognos/UI selected tab
  isSelected: false,

  // Activation history: tabs module has clicked/activated this tab at least once
  hasBeenActivated: false,
  activatedAt: null,
  activatedBy: null,

  // Tabs-level lazyload barrier
  isCanvasLoaded: false,
  canvasLoadedAt: null,
  canvasLoadSource: null
};
```

Compatibility note:

- existing `isActive` is treated as the current selected-tab projection and should be considered an alias for future `isSelected`;
- current `isCanvasLoaded` is ambiguous in production code and must be clarified before writeback depends on it;
- tab index `0` is usually the Cognos startup tab, but this contract does not treat it as writeback-rendered unless tabs state confirms the lazyload barrier.

`isCollectorReady` is not owned by tabs. Widget/content collector readiness belongs to widgets/writeback/tableData/filter contracts or a future collaboration contract.

## 5. Future Wait API Reservation

Future writeback integration may add:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/waitUntilTraversed",
  payload: {
    source: "writebackSet",
    includeHiddenDashboardTabs: true,
    includeHelperTabs: false,
    timeoutMs: 30000
  }
});
```

Reserved wait. Do not brand GET with `includeHiddenDashboardTabs: true`.
GET’s live barrier is §11 (`visibleDashboard` / `false`).

Required semantics:

- returns `Promise<boolean>`;
- resolves `true` only when the requested traversal scope has completed;
- resolves `false` for timeout, disposed state or recoverable traversal failure;
- when `includeHiddenDashboardTabs === true`, the requested scope includes dashboard-role tabs even when `_KDB.state.tabs.byIndex[index].visible === false`;
- must not mutate tab visibility;
- must not write widget, launchpad, filter or writeback state;
- must store pending promises/timers under `_KDB.runtime.tabs`;
- must coalesce concurrent wait requests where possible.

This API is reserved only. It is not implemented by this delta.

## 6. Dispatch-Based Traverse API

`tabs` must support explicit traversal through the feature-module dispatch surface. This is the public API writeback and other modules may await.

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: {
    source: "writebackSet",
    scope: "singleTab",
    tabIndex: 2,
    includeHiddenDashboardTabs: true,
    restoreActiveTab: true,
    waitFor: "canvas",
    timeoutMs: 30000
  }
});
```

Generic/SET `singleTab` example (old payload / step 18/23). GET required payload is §11.

Required semantics:

- returns `Promise<boolean>`;
- supports `scope: "visibleDashboard" | "allDashboard" | "singleTab"`;
- `scope: "singleTab"` requires `tabIndex`;
- `scope: "visibleDashboard"` traverses visible dashboard-role tabs only;
- `scope: "allDashboard"` traverses dashboard-role tabs and may include hidden dashboard tabs when `includeHiddenDashboardTabs === true`;
- `includeHiddenDashboardTabs` never mutates `_KDB.state.tabs.byIndex[index].visible`;
- `restoreActiveTab: true` restores the previously selected tab after traversal; the optional `restoreTabIndex` (number) overrides the natively captured index with an explicit landing tab (added 2026-07-13 for the post-restore traverse);
- concurrent identical traversal requests must be coalesced or rejected predictably;
- traversal resources live under `_KDB.runtime.tabs.pendingPromises` / `timers`;
- failures are recorded under `_KDB.state.tabs.traversal.errorCode/errorMessage`;
- `waitFor: "canvas"` is tabs-owned and means the requested tab/page canvas lazyload barrier has passed;
- `waitFor: "widgetsRendered"` is supported since 2026-07-13: per traversed tab the traverse awaits the widgets-owned readiness API `widgetBase/renderTabWidgetsRequested` (render + bounded render-complete wait for the tab's onCanvas vis widgets); failures degrade with a warning and never abort the traversal.

The dispatch action is the concrete near-term implementation target. The named `waitUntilTraversed` / `retraverse` concepts below are compatibility/reservation names for writeback planning and may delegate to this dispatch action later.

## 7. Future Retraverse API Reservation

Future writeback integration may add:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/retraverse",
  payload: {
    source: "writebackSet",
    includeHiddenDashboardTabs: true,
    includeHelperTabs: false,
    restoreActiveTab: true,
    timeoutMs: 30000
  }
});
```

Reserved. Hidden-include is SET/old-payload, not GET collect.

Required semantics:

- returns `Promise<boolean>`;
- may temporarily activate/click tabs within the requested scope;
- when `includeHiddenDashboardTabs === true`, must visit dashboard-role tabs even if their KDB visibility state is hidden;
- restores the previously active tab when `restoreActiveTab === true`;
- does not change `_KDB.state.tabs.byIndex[index].visible`;
- does not persistently show hidden tabs as user-visible tab buttons;
- does not leave `KDB_visible` or equivalent visible-button state behind for hidden dashboard tabs;
- does not mutate launchpad/widgets/filters/writeback;
- coalesces or rejects duplicate in-flight retraverse safely;
- records result under `_KDB.state.tabs.traversal` without corrupting existing tab state.

This API is reserved only. It is not implemented by this delta.

## 8. Collector Readiness

Writeback-grade retraverse must guarantee a **tabs-level lazyload barrier**:

- every requested dashboard tab has been temporarily activated/clicked;
- Cognos has had an opportunity to instantiate that tab's canvas/content container;
- `_KDB.state.tabs.byIndex[index].hasBeenActivated === true` for successfully visited requested dashboard tabs once that field is implemented;
- `_KDB.state.tabs.byIndex[index].isCanvasLoaded === true` for successfully visited requested dashboard tabs, using the future clarified meaning "tabs-level lazyload barrier passed";
- `_KDB.state.tabs.traversal.traversedIndexes` includes successfully visited requested dashboard tabs.

This is the minimum tabs guarantee needed before writeback DOM/canvas/widget collectors attempt to read tab-local content.

Even future `waitUntilTraversed` / `retraverse` does not automatically guarantee widget collector readiness unless explicitly extended.

If writeback needs to know that widgets/content on a tab are stable for collection, a future contract must define one of:

- a tabs-owned post-click wait condition;
- a widgets-owned readiness selector/API;
- a writeback-owned collector retry policy;
- a collaboration contract between `tabs`, `widgets` and `writeback`.

Until then, tabs traversal readiness and widget collector readiness remain separate concerns.

## 9. Writeback Usage Rule

Until a future execution spec implements the explicit dispatch traversal API, writeback may only use tabs data as read-only metadata:

```js
const tabsState = _KDB.api.tabs.getState();
```

Allowed current reads:

- `tabsState.byIndex[index].tabId`;
- `tabsState.byIndex[index].pageId`;
- `tabsState.byIndex[index].role`;
- `tabsState.byIndex[index].visible`;
- `tabsState.traversal.lifecycle`;
- `tabsState.traversal.traversedIndexes`.

Forbidden current assumptions:

- `traversal.lifecycle === "ready"` means all writeback-relevant tabs are collector-ready;
- hidden tabs have been visited;
- helper/launchpad tabs have been visited;
- writeback may directly click Cognos tabs through private tabs internals;
- writeback may mutate `_KDB.state.tabs`.

## 10. Future Acceptance Criteria

A future implementation may be accepted only when tests/review show:

1. `dispatch({ type: "tabs/traverse", ... })` returns a Promise that resolves when the requested tabs-level traversal scope is complete.
2. `waitUntilTraversed` can wait for current traversal without blocking dashboard startup if/when implemented.
3. `retraverse` can visit requested dashboard tabs without changing tab visibility if/when implemented.
4. Hidden dashboard tabs can be included for writeback without becoming visible buttons.
5. Helper tabs remain excluded unless explicitly requested and safe.
6. Active tab is restored after dispatch traversal/retraverse when requested; post-restore traversals land on the tab given by `restoreTabIndex` instead of the natively captured `activeIndex` (§6).
7. Concurrent traversal/wait/retraverse calls are coalesced or rejected predictably.
8. Failures leave `_KDB.state.tabs.traversal.errorCode/errorMessage`.
9. No writeback, widget, launchpad or filter state is mutated by tabs traversal.
10. Writeback reads tab identity through public tabs API/selectors only.
11. For `includeHiddenDashboardTabs: true`, all dashboard-role tab indexes requested by writeback are either present in `traversedIndexes` with `isCanvasLoaded: true`, or the API returns `false` with an owned traversal error.
12. Future tabs state distinguishes current selection (`isSelected` / `isActive`) from activation history (`hasBeenActivated`) and collector readiness (not tabs-owned).
13. `waitFor: "widgetsRendered"` requires a widgets-owned public readiness API; satisfied since 2026-07-13 by `widgetBase/renderTabWidgetsRequested`.

## 11. P0 Alignment For `writebackGet`

This delta is a P0 dependency of `contracts/writeback.md` §12.

P0 implementation target:

- `tabs/traverse` from §6 is required before `writebackGet.collect()` runs DOM/canvas/widget collectors.
- `tabs/waitUntilTraversed` (§5) and `tabs/retraverse` (§7) remain reserved compatibility names and are not P0 requirements unless a later tabs owner delta promotes them.

Before `writebackGet.collect()` may run DOM/canvas/widget collectors, tabs must expose a public dispatch or wait surface with this minimum contract:

```js
await _KDB.api.tabs.dispatch({
  type: "tabs/traverse",
  payload: {
    source: "writebackGet",
    scope: "visibleDashboard",
    includeHiddenDashboardTabs: false,
    restoreActiveTab: true,
    waitFor: "canvas",
    timeoutMs: 30000
  }
});
```

GET payload amended 2026-08-30 (`writeback-get-visibleDashboard-contractdelta.md`):
click visible dashboard tabs only. Hidden slots stay in `tabs[]` as `hide: 1`
shells and are not traversed for content.

Required behavior:

- action type and payload shape are documented;
- hidden dashboard tabs are included when a caller requests `includeHiddenDashboardTabs: true` (SET activate / old payloads); GET does not request that;
- helper tabs remain excluded unless explicitly requested;
- the active tab is restored;
- no widget/filter/writeback state is mutated by tabs traversal;
- failure returns/records a tabs-owned diagnostic;
- tabs guarantees only tab-level lazyload readiness, not widget collector readiness. Exception (2026-10-06): `tabs/parameterSetActivateTabRequested` additionally awaits host-reported live-widget readiness per `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`; collector readiness stays not tabs-owned.

`writebackGet` must still own widget/content retry policy after this tabs barrier succeeds.

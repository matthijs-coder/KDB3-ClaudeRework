# Module Contract: `tabs`

> CP-1 draft for a NEW `tabs` feature module in the production tree.
> This is not a direct port: legacy behavior is evidence, but the new module owns the redesigned contract.
> No production code may be generated until this contract is approved.

---

**Status:** `Draft`
**Owner module / service:** `tabs`
**Type:** `feature module`
**Authoring AI:** GPT-5.5, 2026-06-18
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Redesign Scope

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/tabs/
```

This module consolidates tab behavior that is currently spread across legacy modules. It is a new owner-aligned module, not a line-by-line legacy port.

Approved design direction for phase 1:

| Area | Decision |
|---|---|
| Ownership | `tabs` is the canonical writer of `_KDB.state.tabs` and exposes `_KDB.api.tabs`. |
| kdbControl boundary | `kdbControl` renders/hosts controls and dispatches tab intents; it does not own tab state or tab business rules. |
| Implement now | Startup sync/hydrate/traverse, tab-button visibility, edit-tool state, authoring visibility, add visible tab, existing kdbControl toolbox-line selection, rename. |
| Defer | Delete, duplicate, move/reorder, widget remapping, persistent writeback mutation strategy, and undo/redo replay for those writeback mutations. |
| Persistence boundary | Deferred operations must be isolated behind a future tabs persistence/writeback adapter or service contract; phase 1 must not invent a shortcut. |

## 1. Evidence Baseline

Investigation results used for this contract:

| Source | Evidence used |
|---|---|
| `legacy-redesign2:js/dashboard/tabs/` | State-driven tab visibility, helper-tab conventions, authoring visibility, startup DOM sync/hydration, optional traversal API, add/rename pattern. |
| `legacy-redesign2:js/dashboard/canvas/kdbControl/` | kdbControl as UI/event layer rather than tabs owner. |
| `laatsteOriginal/KDB2/js/controlContainer/configurationFunctions/helpers/configurationToolboxHelpers.js` | Working legacy business behavior for rename, soft-delete, duplicate, move and writeback remapping. Only rename is in phase 1. |
| Current `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkToolboxPlaceholderApis.js` | Existing production kdbControl already expects `_KDB.api.tabs.dispatch(...)`. |
| Current `dashboard/canvas/kdbControl/framework/syncView.js` (`syncFrameworkViewFromState`) | Existing production kdbControl already expects `_KDB.api.tabs.getState()` projections for toolbox tab-edit UI. |
| Current `_____________KDB3API/KDB3/js/core/cognosAPI/tabs.js` | Inner-ring wrappers for `getTabsContainers`, `getTabsContent`, `getTabName`, `setTabName`. Called from ring 1 only; not the tabs module wrapping target. |

Legacy code must not be treated as the design. It is evidence for behavior and edge cases only.

## 2. Purpose

`tabs` owns dashboard tab state, tab-button presentation state, tab edit-button state, startup traversal/synchronization, and tab commands that affect Cognos tab visibility or names.

It provides one canonical public surface for other modules to request tab behavior and read tab projections. It keeps Cognos tab DOM details, helper-tab rules, and tab visibility rules out of `kdbControl`, `launchpad`, `filterDock`, `widgets`, and `dienststelle`.

## 3. Ownership

- Canonical state subtree: `_KDB.state.tabs`.
- Canonical writer: `tabs` only, through its controller/reducer flow.
- Public surface: `_KDB.api.tabs`.
- Runtime owner namespace: `_KDB.runtime.tabs`.
- Existing ownership-map entry: `architecture/stateOwnership.md` already lists `_KDB.state.tabs` as owned by `tabs`.

Foreign-write paths: none. Other modules must not write `_KDB.state.tabs`, Cognos tab button classes, tab names, tab edit target, or tab visibility directly.

### 3.1 Owns

`tabs` owns:

- visible/hidden tab descriptors;
- active tab identity and active tab index;
- tab names as the module's serializable view of Cognos tab names;
- tab button visibility and disabled/available state;
- tab edit-tool state, including the existing kdbControl toolbox line index;
- helper-tab metadata and lifecycle;
- traversal/hydration state;
- phase-1 add and rename behavior.

### 3.2 Does Not Own

`tabs` does not own:

- kdbControl shell DOM or toolbox layout;
- canonical authoring state (`_KDB.state.authoring`);
- launchpad slot state;
- widget state or widget DOM placement;
- filter state;
- history stack state;
- a generic writeback service.

## 4. State

Initial state shape:

```js
_KDB.state.tabs = {
  lifecycle: "idle",
  byIndex: {},
  order: [],
  visibleOrder: [],
  activeIndex: null,
  activeTabId: null,
  currentTabId: null,
  editTarget: null,
  toolboxTabEditLineIndex: null,
  selectedTool: null,
  isAuthoringView: false,
  helperTab: {
    index: 5,
    tabId: null,
    pageId: null,
    lifecycle: "idle",
    errorCode: null,
    errorMessage: null
  },
  limits: {
    maxUserTabs: 5,
    helperTabIndex: 5,
    minVisibleUserTabs: 1
  },
  traversal: {
    lifecycle: "idle",
    traversedIndexes: [],
    lastTraversedAt: null,
    errorCode: null,
    errorMessage: null
  },
  hydration: {
    lifecycle: "idle",
    helperDomHydrated: false,
    lastSyncedAt: null,
    errorCode: null,
    errorMessage: null
  },
  pendingOperation: null,
  errorCode: null,
  errorMessage: null
};
```

Per-tab descriptor shape:

```js
_KDB.state.tabs.byIndex[tabIndex] = {
  index: 0,
  tabId: null,
  pageId: null,
  name: "Tab",
  visible: true,
  isActive: false,
  isHelper: false,
  isCanvasLoaded: false,
  button: {
    visible: true,
    disabled: false,
    domStatus: "unknown"
  },
  edit: {
    canRename: true,
    canDelete: false,
    canDuplicate: false,
    canMove: false,
    canReorder: false
  },
  lifecycle: "idle",
  errorCode: null,
  errorMessage: null
};
```

State must stay serializable. DOM nodes, jQuery objects, event handlers, timeout handles, promises, Cognos handles and adapter instances live under `_KDB.runtime.tabs`, not `_KDB.state.tabs`.

`currentTabId` is retained as a compatibility projection for existing consumers, but the canonical field for new readers is `activeTabId`. If both exist they must represent the same tab identity.

## 5. Runtime

Runtime namespace:

```js
_KDB.runtime.tabs = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  adapters: {},
  historyReplayHandlerContribution: null
};
```

Runtime roles:

| Bucket | Role |
|---|---|
| `domRefs` | Cached tab button/container refs owned by tabs during mount/sync; refreshed from Cognos DOM as needed. |
| `listeners` | Cleanup descriptors for non-abortable DOM listeners only. |
| `subscriptions` | Event-bus unsubscribe handles, including authoring enter/exit if the implementation uses events. |
| `abortControllers` | Mount/traverse/hydration scopes and abortable DOM listener scopes. |
| `observers` | DOM observers for Cognos tab DOM readiness if polling is insufficient. |
| `timers` | Timeout/interval ids for polling or delayed hydration. |
| `pendingPromises` | In-flight mount, hydrate, traverse, rename or wait actions. |
| `adapters` | Injected/local Cognos tabs adapter and future persistence adapter references. |
| `historyReplayHandlerContribution` | Deferred until tabs history replay is approved. |

Phase 1 may populate only `adapters.cognos`. It must not create a persistence/writeback adapter slot with behavior, and it must leave `historyReplayHandlerContribution` as `null`.

Cleanup order: set the controller disposed guard first, abort controllers, unsubscribe subscriptions, remove listeners, disconnect observers, clear timers, clear pending promises/adapters, detach only tabs-owned DOM additions, then reset `_KDB.runtime.tabs` buckets. Runtime must not be nulled before cleanup.

## 6. Public API

Surface:

```js
_KDB.api.tabs = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Style: dispatch + reducer, matching feature-module default. No mixed named commands such as `_KDB.api.tabs.renameTab(...)`.

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Initializes state/runtime, syncs current Cognos tab DOM into `_KDB.state.tabs`, starts hydration and startup traversal, subscribes to authoring events when `_KDB.events` is available, and resolves `true`/`false` for recoverable startup. |
| `destroy()` | Idempotent teardown of tabs-owned runtime resources and subscriptions. |
| `dispatch(action)` | Sole public command path. State-changing actions go through reducer/effects. May return a Promise for async commands such as traverse or rename. |
| `getState()` | Returns a cloned/coarse projection of `_KDB.state.tabs` for cross-module UI sync. It must include fields consumed by kdbControl and launchpad. |

Disposed-state discipline follows `module-public-api.mdc`: after destroy, `getState()` returns `undefined`; `dispatch()` is a no-op and logs once via `console.warn("[tabs.dispatch] called after destroy")`; `mount()` is a no-op and logs once via `console.warn("[tabs.mount] called after destroy; obtain a fresh instance from the factory")`; `destroy()` remains idempotent. No disposed guard throws synchronously. The factory/orchestrator is the canonical revive path.

## 7. Actions

Action names are slash-style.

### 7.1 Phase-1 Actions

| Action type | Trigger | Contract |
|---|---|---|
| `tabs/initialize` | `mount()` | Normalize `_KDB.state.tabs` and `_KDB.runtime.tabs`. |
| `tabs/syncFromDom` | mount, hydrate, explicit refresh | Read Cognos tab DOM through approved adapters/selectors and update descriptors. |
| `tabs/hydrateDom` | mount | Wait for Cognos tab buttons/content to exist without clicking tabs. |
| `tabs/traverse` | mount and explicit caller | Visit user tabs to trigger lazy Cognos loading; skip helper tab. Startup traversal is enabled in phase 1. |
| `tabs/add` | kdbControl "Tab hinzufügen" | Make the next hidden user tab visible; do not create a new physical Cognos tab. kdbControl consults `getState().canAdd` on add click; false → `_KDB.services.message.notify`, no dispatch. |
| `tabs/selectEditTarget` | Existing kdbControl tab-edit radio | Compatibility action name. The payload `tabIndex` is the toolbox line index `0..4`, not a physical tab index. It sets `toolboxTabEditLineIndex` and derives `selectedTool`. It must not set `editTarget` in phase 1. |
| `tabs/selectTool` | Future explicit tool selector | Optional alias for future UI. In phase 1 only `rename` is valid; deferred tools are rejected as unavailable. |
| `tabs/rename` | kdbControl rename flow or inline rename confirmation | Resolve a visible non-helper target tab, call Cognos `setTabName` through effects, then update state from confirmed result. |
| `tabs/authoringEntered` | authoring event/API bridge | Show all physical tab buttons in DOM while preserving `visible` state truth. |
| `tabs/authoringExited` | authoring event/API bridge | Restore DOM visibility from `_KDB.state.tabs.byIndex[*].visible`. |
| `tabs/error` | catch boundary | Record owned error state. |
| `tabs/destroy` | `destroy()` | Transition lifecycle and clear owned transient state. |

### 7.2 Deferred Actions

These action names may be reserved but must not perform persistent behavior in phase 1:

| Action type | Status | Required behavior before implementation |
|---|---|---|
| `tabs/delete` | Deferred | Always return `false` in phase 1. No state mutation, no `pendingOperation`, no writeback, no widget deletion/remapping. |
| `tabs/duplicate` | Deferred | Always return `false` in phase 1. No state mutation, no `pendingOperation`, no writeback, no widget cloning/remapping. |
| `tabs/move` | Deferred | Always return `false` in phase 1. No state mutation, no `pendingOperation`, no writeback, no widget remapping. |
| `tabs/reorder` | Deferred | Always return `false` in phase 1. No state mutation, no `pendingOperation`, no writeback, no widget remapping. |

Delete, duplicate, move and reorder require a separate persistence/writeback/history CP before implementation.

## 8. Selectors And Read Projections

Published selectors live under `tabs/state/selectors.js`.

Required selectors:

| Selector | Returns |
|---|---|
| `readTabsState(_KDB)` | `_KDB.state.tabs` projection or default empty shape. |
| `readActiveTabId(_KDB)` | Active tab id/current tab id. |
| `readActiveTabIndex(_KDB)` | Active tab index. |
| `readVisibleTabs(_KDB)` | Ordered array of visible non-helper tabs. |
| `readTabByIndex(_KDB, tabIndex)` | Cloned descriptor or `null`. |
| `readTabEditTarget(_KDB)` | Current explicit physical edit target `{ tabIndex, tabId }` or `null`; phase 1 normally returns `null` because current kdbControl selects tools, not physical tabs. |
| `readTabsForLaunchpad(_KDB)` | Ordered visible non-helper descriptors `{ tabId, pageId, index, name, isActive }[]`. |
| `readTabsForKdbControl(_KDB)` | Projection `{ visibleTabs, toolboxTabEditLineIndex, selectedTool, canAdd, actions }`. |

`getState()` must expose a stable projection including at least:

```js
{
  lifecycle,
  visibleTabs,
  activeIndex,
  activeTabId,
  currentTabId,
  editTarget,
  toolboxTabEditLineIndex,
  selectedTool,
  canAdd,
  actions
}
```

Phase-1 `actions` shape:

```js
{
  rename: { enabled: true, reason: null },
  delete: { enabled: false, reason: "deferred" },
  duplicate: { enabled: false, reason: "deferred" },
  move: { enabled: false, reason: "deferred" },
  reorder: { enabled: false, reason: "deferred" }
}
```

`rename.enabled` is `true` only when a visible non-helper target can be resolved. `canAdd` is `true` only when at least one hidden non-helper user tab exists.

Foreign modules must use `_KDB.api.tabs.getState()` or published selectors; they must not deep-read `_KDB.state.tabs.byIndex` directly.

## 9. kdbControl Boundary

`kdbControl` is the UI host for tab tools. It may:

- render tab add/select/edit controls;
- call `_KDB.api.tabs.dispatch(...)`;
- call `_KDB.api.tabs.getState()` for UI sync;
- show a one-time warning when tabs API is unavailable.

`kdbControl` must not:

- mutate `_KDB.state.tabs`;
- toggle Cognos tab `KDB_visible` directly;
- call `_KDB.cognosAPI.tabs.setTabName` or `_KDB.services.cognosHost.tabs` directly (rename goes through `_KDB.api.tabs`);
- implement tab delete/duplicate/move business rules;
- mirror canonical tab truth under `_KDB.state.kdbControl`.

Known phase-1 kdbControl calls:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/add",
  payload: { source: "kdbControl" }
});

_KDB.api.tabs.dispatch({
  type: "tabs/selectEditTarget",
  payload: { source: "kdbControl", tabIndex: 0 }
});
```

For the current production kdbControl, `payload.tabIndex` in `tabs/selectEditTarget` is the toolbox edit-line index:

| Line index | Tool |
|---:|---|
| `0` | `rename` |
| `1` | `delete` deferred |
| `2` | `duplicate` deferred |
| `3` | `move` deferred |
| `4` | `reorder` deferred |

Selecting line `0` sets `selectedTool: "rename"`. Selecting lines `1..4` may update `toolboxTabEditLineIndex` for UI parity, but `actions.*.enabled` for those tools remains `false` with reason `"deferred"` and dispatching the corresponding action returns `false`.

Rename execution must enter through `_KDB.api.tabs.dispatch({ type: "tabs/rename", payload })`. The current production kdbControl line `0` only selects the rename tool; it does not yet provide a committed new name. A future kdbControl delta may add the UI that gathers the name and dispatches `tabs/rename`, but it must not dispatch delete/duplicate/move/reorder execution in phase 1.

## 10. Authoring Boundary

Canonical authoring state belongs to the `authoring` module, not `tabs`.

`tabs` subscribes to authoring facts when `_KDB.events` is available and the canonical events exist:

- `authoring:entered` -> dispatch `tabs/authoringEntered`;
- `authoring:exited` -> dispatch `tabs/authoringExited`.

It may also call the authoring selector for initial sync if the selector is available. It updates only tabs-owned DOM visibility and tabs-owned state projections. Authoring mode behavior:

- authoring entered: show all physical tab buttons, including hidden user tabs and helper tab if present;
- authoring exited: restore visible buttons from `_KDB.state.tabs.byIndex[*].visible`;
- do not rewrite canonical `visible` fields solely because authoring is active.

## 11. Cognos Touchpoints

All Cognos tab access goes through injected/local adapters wrapping the cognosHost `tabs` facet (`_KDB.services.cognosHost.tabs`; orchestrator injects it). `createCognosTabsAdapter` wraps `listTabs` / `getTabName` / `setTabName`; consumer names `getTabsContainers` / `getTabsContent` remain. Layer-1 `core/cognosAPI/tabs.js` is inner ring only (called from ring 1).

Allowed phase-1 touchpoints:

| Method | Use |
|---|---|
| `getTabsContainers()` | Discover tab button/container DOM wrappers. |
| `getTabsContent()` | Discover tab content/canvas wrappers. |
| `getTabName(tabLike)` | Read current Cognos tab name during sync. |
| `setTabName(tabLike, name)` | Commit rename after validation. |

Phase 1 may toggle the configured visible CSS class on Cognos tab buttons as the owner of tab button presentation state. It must centralize selectors/classes in tabs config and avoid scattering Cognos-version-specific selectors.

Required phase-1 class/config constants:

| Constant | Value |
|---|---|
| Visible class | `KDB_visible` |
| User tab button marker | `kdb-user-tab-btn` |
| Helper tab button marker | `kdb-helper-tab-btn` |
| Helper tab content marker | `kdb-helper-tab` |
| Primary tab button selector | `.ba-common-tabList__tooltip` |
| Fallback tab button selector | `.ba-common-tooltip` |

## 12. Startup, Hydration And Traverse

Startup sequence:

1. Initialize `_KDB.state.tabs` and `_KDB.runtime.tabs`.
2. Sync current Cognos DOM into state.
3. Hydrate/wait for Cognos tab DOM readiness without arbitrary long timeout chains.
4. Traverse user tabs during startup.
5. Restore active tab when traversal finishes.
6. Render/sync tab button visibility from state and authoring mode.
7. Expose `_KDB.api.tabs` before modules that depend on tabs projections consume it, where bootstrap order allows.

Traversal rules:

- user tabs are fixed to the approved max user tab count unless a later CP changes limits;
- helper tab index is configured and skipped during traversal;
- traversal updates `isCanvasLoaded` for visited user tabs;
- traversal lifecycle is owned under `_KDB.state.tabs.traversal`;
- pending promises/timers live under `_KDB.runtime.tabs`;
- failures must leave recoverable error state instead of blocking dashboard startup indefinitely.

## 13. Add And Visibility Rules

Phase-1 add behavior:

- kdbControl consults `getState().canAdd` on add click; false → `_KDB.services.message.notify`, no dispatch;
- `tabs/add` finds the next hidden non-helper user tab;
- marks it visible in `_KDB.state.tabs`;
- applies the visible class to the corresponding Cognos tab button through tabs effects;
- updates kdbControl-safe projections;
- returns `false` or records a non-fatal error when no hidden user tab is available.

Business rules:

- maximum user tabs: `5`;
- minimum visible user tabs: `1`;
- helper tab is not a user tab;
- visibility truth is `_KDB.state.tabs.byIndex[index].visible`, not current DOM class during authoring mode.

## 14. Rename Rules

Phase-1 rename is in scope.

Contract:

- input may identify a non-helper visible user tab by physical `tabIndex` or `tabId`;
- if no physical `tabIndex`/`tabId` is provided, rename targets the current active visible non-helper user tab;
- new name must be normalized to a non-empty string;
- reducer may stage `pendingOperation` before the Cognos call; in phase 1 rename is the only legitimate user of `pendingOperation`;
- effect calls `setTabName` through the injected adapter wrapping the cognosHost `tabs` facet;
- after success, state is updated from the confirmed name and DOM/read projections are synced;
- on failure, keep the previous name and record `errorCode`/`errorMessage` under the affected tab and/or root tabs state;
- phase 1 does not push history for rename. If later persistence/history requires rename replay, that is a separate contract delta.

Rename does not require the deferred writeback mutation strategy. If later persistence requires rename writeback, that is a separate contract delta.

## 15. Deferred Persistence / Writeback CP

Delete, duplicate, move and reorder are explicitly deferred because they require a larger design choice:

- whether tabs owns a local persistence adapter;
- whether a shared `_KDB.services.writeback` should be introduced;
- how tabs and widgets snapshots are represented;
- how widget-tab remapping is computed and committed;
- how undo/redo replays writeback-backed tab mutations.

Future CP must define a boundary similar to:

```js
tabsPersistenceAdapter.commitTabMutation({
  type: "delete",
  before: {},
  after: {},
  widgetRemap: {}
});
```

Until that CP is approved, production code must not implement legacy `adjustTabObj`, clone widgets, remove widgets, remap widget tab fields, write parameter sets for tab CRUD, or create partial persistence/writeback adapters under `_KDB.runtime.tabs.adapters`.

## 16. History

Phase 1:

- phase 1 omits tabs history integration entirely, including rename;
- no history step may be pushed for delete, duplicate, move or reorder;
- no history replay handler may write `_KDB.state.tabs` directly from `historyService`.

Future tabs history replay must delegate through `_KDB.api.tabs.dispatch(...)` with an `isHistoryReplay` flag or equivalent replay context that prevents recursive history commits.

## 17. Events

Preferred phase-1 path for known-owner calls is direct dispatch to `_KDB.api.tabs`, matching current kdbControl placeholder code.

Events may be used for facts emitted by tabs:

| Event | Status | Meaning |
|---|---|---|
| `tabs:changed` | Optional phase 1 | Generic fact after confirmed state-changing tab update. |
| `tabs:renamed` | Optional phase 1 | Fact after confirmed rename. |
| `tabs:traversed` | Optional phase 1 | Fact after successful traversal. |
| `tabs:error` | Optional phase 1 | Fact after recoverable tabs-owned error. |

Before using request events such as `tabs:toolRequested`, the contract must document why direct owner dispatch is insufficient for that flow.

## 18. Module Shape

Expected production folder shape:

```txt
KDB3/js/dashboard/tabs/
  config/
  state/
  effects/
  events/
  adapters/
  createTabsController.js
  __orchestratorTabs.js
```

Only create folders with real content. `view/` may be added only if tabs creates its own DOM; phase 1 can keep button visibility under `effects/` if it only mutates existing Cognos tab buttons.

## 19. Integration Boundaries

| Module/service | Boundary |
|---|---|
| `kdbControl` | Calls tabs API and reads tabs projection; no tab writes. |
| `authoring` | Owns canonical authoring state/events; tabs consumes facts/selectors. |
| `launchpad` | Reads tab descriptors through tabs API/selectors. |
| `widgets` | Owns widget state; future delete/duplicate/move remapping must not bypass widgets ownership. |
| `filterDock` / filters | Must migrate away from direct `_KDB.state.tabs` deep reads when tabs selectors are available. |
| `historyService` | Owns stack only; replay delegates to tabs API. |
| `_KDB.services.cognosHost.tabs` | Ring-1 tabs facet; ring-2 adapter wraps it. Layer-1 `core/cognosAPI/tabs.js` is inner ring only. No business rules. |

## 20. Acceptance Criteria For CP-1

CP-1 is accepted when the user agrees that:

1. `tabs` is the canonical owner of `_KDB.state.tabs` and `_KDB.api.tabs`.
2. kdbControl remains UI-only for tab controls and calls tabs through dispatch/getState.
3. Phase 1 includes startup sync/hydrate/traverse, visibility, authoring visibility, add, existing kdbControl toolbox-line selection and rename.
4. Delete, duplicate, move/reorder and writeback-backed widget remapping are deferred.
5. Rename may be implemented now without solving the deferred writeback CP.
6. No new top-level `_KDB.*` namespace is introduced.
7. No production code is generated until an execution spec for the chosen phase is approved.

## 21. Open Questions For Later CPs

These are intentionally not blockers for phase 1:

- Should writeback become `_KDB.services.writeback` or a tabs-local persistence adapter first?
- What exact snapshot shape supports undo/redo for delete, duplicate and move?
- Should widget remapping be owned by tabs, widgets, or a collaboration contract between both?
- Should reorder be a separate concept from move, or just a UI over move?
- Should rename later write to the same persistence layer as delete/duplicate/move?

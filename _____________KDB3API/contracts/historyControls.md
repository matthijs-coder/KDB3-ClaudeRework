# Module Contract: `historyControls`

> CP-1 draft for a direct production port of the KDB undo/redo toolbar controls.
> No production code may be generated until this contract is approved.

---

**Status:** `Draft`
**Owner module / service:** `historyControls`
**Type:** `thin dashboard UI consumer / feature module`
**Authoring AI:** GPT-5.5, 2026-05-17
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. CP-1 Decision Summary

| Question | Decision requested |
|---|---|
| Placement | `KDB3/js/dashboard/controls/historyControls/` under the dashboard controls owner area. |
| Public surface | Minimal lifecycle surface `_KDB.api.historyControls = { mount, destroy }`; no dispatch because this module only owns two buttons and no state transitions. |
| State ownership | No `_KDB.state.historyControls`; history state remains owned by `historyService`. |
| Runtime ownership | `_KDB.runtime.historyControls` owns DOM refs, subscriptions, abort controllers, observers and pending mount promises. |
| History calls | Call `_KDB.services.history.undo()`, `redo()`, `canUndo()`, `canRedo()`, `getSnapshot()` only through the service surface. |
| Event catalog | Update existing `history:changed` catalog entry to list `historyControls` as subscriber. |
| CSS | Add `KDB3/css/customButtons/toolbarControls.css` and register it in `core/css/config/cssHrefList.js`. |
| Bootstrap | Import, register, mount and destroy via `KDB3/js/KDB.js`. |

## 1. Legacy Evidence

Source:

```txt
_______REDESIGN2/KDB3/js/dashboard/historyControls/
```

Read-only evidence:

| Legacy file | Evidence used |
|---|---|
| `dashboard/historyControls/mountHistoryButtons.js` | Builds a wrapper with undo and redo buttons, waits for `[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading`, and inserts the wrapper before the first toolbar child. |
| `dashboard/historyControls/__historyControlsOrchestrator.js` | Mounts/syncs the buttons, listens for clicks, subscribes to `history:changed`, and observes toolbar rebuilds. |
| `dashboard/historyControls/updateHistoryButtonsState.js` | Reads `canUndo()` / `canRedo()` and toggles disabled button state. |
| `base/events/history.js` | Defines `HISTORY_CHANGED = "history:changed"`. |
| `base/services/historyService/createHistoryApi.js` | Legacy service methods consumed by the buttons: `undo`, `redo`, `canUndo`, `canRedo`, `getSnapshot`. |
| `KDB.js` in REDESIGN2 | Registers legacy history service in `setupBase()` and starts history controls in `startModules()`. |
| `css/KDB.css` | Provides the legacy history button styling block around `.KDB_historyToolbarGroup` and `.KDB_historyButton`. |

Production evidence:

- `_KDB.services.history` already exists in `KDB3/js/core/services/historyService/`.
- `historyService/events/eventNames.js` already owns the `history:changed` event constant.
- `architecture/eventSubscribe.md` already catalogs `history:changed`, but its subscriber is still `TBD`.
- `KDB3/js/KDB.js` currently registers and mounts header, footer, kdbControl, launchpad, dragDrop and metricsTree; it does not yet wire `historyControls`.
- `KDB3/css/customButtons/toolbarControls.css` does not exist yet.

## 2. Purpose

`historyControls` renders two dashboard toolbar buttons, Undo and Redo, and wires them to `_KDB.services.history`. It is a thin UI consumer: it owns button DOM, event listeners, subscription cleanup and toolbar remount behavior, but it does not own history state or history replay behavior.

## 3. Placement And Classification

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/controls/historyControls/
```

Classification: thin dashboard UI feature module.

Rationale:

- The buttons are global dashboard controls, not kdbControl settings UI.
- The module consumes `historyService`; it does not implement history logic.
- A small `_KDB.api.historyControls` lifecycle surface keeps bootstrap and cleanup explicit without adding a stateful dispatch module.

## 4. Ownership

- Canonical state subtree: none.
- This module must not create `_KDB.state.historyControls`.
- It must not write `_KDB.state.history`.
- It must not write any foreign state subtree.
- It reads history capability only through `_KDB.services.history.canUndo()`, `_KDB.services.history.canRedo()` and `_KDB.services.history.getSnapshot()`.
- It commands history only through `_KDB.services.history.undo()` and `_KDB.services.history.redo()`.

## 5. Runtime

- Owner namespace: `_KDB.runtime.historyControls`.
- Cleanup trigger: `_KDB.api.historyControls.destroy()` called from root destroy.

Runtime shape:

```js
_KDB.runtime.historyControls = {
  domRefs: {
    toolbarHostEl: null,
    rootEl: null,
    undoButtonEl: null,
    redoButtonEl: null
  },
  subscriptions: {
    historyChanged: null
  },
  abortControllers: {
    mount: null,
    click: null
  },
  observers: {
    toolbar: null
  },
  timers: {},
  pendingPromises: {
    mount: null
  }
};
```

Notes:

- DOM nodes and handles live only in runtime, never in state.
- Subscription handles live in `runtime.historyControls.subscriptions`.
- DOM listener cleanup should prefer `AbortController` where available.
- Toolbar `MutationObserver` is allowed because Cognos may rebuild the action bar after initial mount.

Cleanup order:

1. Set the controller closure `isDisposed` flag.
2. Abort `abortControllers`.
3. Call unsubscribe handles in `subscriptions`.
4. Disconnect `observers`.
5. Clear timers and pending promise refs.
6. Remove the placed root element if still attached.
7. Reset `_KDB.runtime.historyControls` to empty standard buckets.

## 6. Public API

Surface:

```js
_KDB.api.historyControls = {
  mount: mount,
  destroy: destroy
};
```

Style: named lifecycle methods. This is a deliberate narrow deviation from the feature-module dispatch default because:

- the module owns no serializable state;
- there are only two DOM buttons;
- external callers should not command undo/redo through `historyControls`; they should call `_KDB.services.history` directly if needed;
- adding dispatch would create ceremony without owner state transitions.

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Idempotently initializes runtime, registers selectors if needed, waits for the toolbar host, places the buttons, subscribes to `history:changed`, binds button clicks, starts toolbar observation, then syncs enabled state. Returns `true` on successful start or `false` if unavailable. |
| `destroy()` | Idempotently removes listeners, subscriptions, observer, pending refs and placed DOM. No throw. |

Disposed-state discipline:

- `mount()` after destroy logs a warning and returns `false`.
- `destroy()` after destroy is a no-op.
- No public method throws from a disposal guard.

## 7. DOM And Selectors

Selector config lives under:

```js
_KDB.elements.selectors.historyControls = {
  toolbarHostSelector: '[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading',
  rootSelector: '[data-kdb-history-controls="true"]',
  undoButtonSelector: '[data-kdb-history-action="undo"]',
  redoButtonSelector: '[data-kdb-history-action="redo"]'
};
```

Mount behavior:

- Use `waitForElObserver` to wait for `toolbarHostSelector` under `document`.
- Build a detached DOM subtree with two buttons.
- Idempotently avoid duplicate roots by checking for `rootSelector` inside the host.
- Place root before `toolbarHostEl.firstChild || null`, matching legacy behavior.
- Store live refs in `_KDB.runtime.historyControls.domRefs`.

Button DOM:

- Root: `data-kdb-history-controls="true"`.
- Buttons: `data-kdb-history-action="undo"` and `data-kdb-history-action="redo"`.
- Button labels: `Undo`, `Redo`.
- Disabled state must set both `button.disabled` and `aria-disabled`.

## 8. Readers / Writers

No selectors are published for cross-module reads because the module owns no state.

Internal helpers may read:

- `_KDB.services.history.canUndo()`
- `_KDB.services.history.canRedo()`
- `_KDB.services.history.getSnapshot()`

Internal helpers may call:

- `_KDB.services.history.undo()`
- `_KDB.services.history.redo()`

No internal helper writes `_KDB.state.*`.

## 9. Events

Emitted facts: none.

Subscribed events:

- `history:changed` from `historyService/events/eventNames.js`.
- Handler syncs the button enabled/disabled state from the event payload when present, or from service `canUndo()` / `canRedo()` as fallback.
- Unsubscribe handle lives at `_KDB.runtime.historyControls.subscriptions.historyChanged`.
- Teardown owner: `historyControls.destroy()`.

`architecture/eventSubscribe.md` update required:

- Replace the current `history:changed` subscriber placeholder with `historyControls`.
- Subscriber file: `KDB3/js/dashboard/controls/historyControls/effects/subscribeHistoryChanged.js`.
- Teardown: `_KDB.api.historyControls.destroy()` clears `_KDB.runtime.historyControls.subscriptions.historyChanged`.

## 10. Dependencies

- `_KDB` (always).
- `_KDB.services.history` (optional at mount; missing service disables controls and logs one warning).
- `_KDB.events` for subscribing to `history:changed`.
- `core/utils/waitForElObserver.js` for waiting on the Cognos toolbar host.
- `core/services/historyService/events/eventNames.js` for the event constant.

Missing history service behavior:

- Buttons may mount disabled if `_KDB.services.history` is absent.
- Clicks must no-op when the service is missing.
- Missing service must not write error state or fail dashboard startup.

## 11. Cognos Touchpoints

This module performs no Cognos API calls.

It touches Cognos-rendered DOM only by waiting for and placing controls inside:

```txt
[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading
```

This is a documented DOM host selector touchpoint, not a Cognos API wrapper.

## 12. CSS

Add:

```txt
KDB3/css/customButtons/toolbarControls.css
```

Register in:

```txt
KDB3/js/core/css/config/cssHrefList.js
```

CSS class names:

```txt
.kdb-history-controls
.kdb-history-controls__item
.kdb-history-controls__button
.kdb-history-controls__button--disabled
.kdb-history-controls__icon
```

The CSS ports only the custom button styling from legacy `KDB.css` and must not port Cognos native undo/redo plugin visibility rules for:

```txt
#com.ibm.bi.dashboard.undoPluginContainer
#com.ibm.bi.dashboard.redoPluginContainer
```

Those native Cognos plugin controls are out of scope. **2026-09-03:** they stay hidden by `cognosButtons.css` when they are `.pluginContainer` inside `[id="com.ibm.bi.dashboard.toolbars.actionBar"]` ([cognosButtons-allowlist-invert-contractdelta.md](./_archive/cognosButtons-allowlist-invert-contractdelta.md) §3.2), not by `[id$="PluginContainer"]` and not by this module’s CSS.

## 13. Folder Layout

```txt
KDB3/js/dashboard/controls/historyControls/
  __orchestratorHistoryControls.js
  createHistoryControlsController.js
  config/
    domSelectors.js
  view/
    buildHistoryControls.js
    placeHistoryControls.js
    syncHistoryControlsView.js
  effects/
    bindHistoryControlsClick.js
    subscribeHistoryChanged.js
  observation/
    bindToolbarObserver.js
  runtime/
    cleanupHistoryControlsRuntime.js
```

No state folder is created because no state is owned.

No events folder is created because this module emits no events.

## 14. Bootstrap Registration

Update `KDB3/js/KDB.js`:

- Add AMD import for `./dashboard/controls/historyControls/__orchestratorHistoryControls.js`.
- Add factory parameter `_orchestratorHistoryControls`.
- Call `_orchestratorHistoryControls(_KDB)` in `registerFeatureModules(_KDB)`.
- Call `_KDB.api.historyControls.mount({})` in `mountFeatureModules(_KDB, _renderOptions)` after history service exists and before or after other dashboard feature mounts. Recommended order: after `kdbControl.mount({})`, before launchpad/dragDrop/metricsTree.
- Call `destroyFeatureApi(this.api.historyControls)` in `destroy()` before destroying core services.

The current production bootstrap registers historyService after feature registration but before `startModules()`, so `_KDB.services.history` is expected to exist by the time `historyControls.mount()` runs.

## 15. Out Of Scope

- No history service behavior changes.
- No kdbControl history commit/replay changes.
- No public `_KDB.history` alias.
- No `_KDB.state.historyControls`.
- No direct writes to `_KDB.state.history`.
- No replay handler registration.
- No keyboard shortcuts.
- No custom icon library changes.
- No browser harness or `TEST/` work.
- No native Cognos undo/redo plugin styling or visibility policy.
- No legacy edits.
- No rule/template edits.

## 16. CP-1 Questions

1. Approve `KDB3/js/dashboard/controls/historyControls/` as final production placement?
2. Approve minimal `_KDB.api.historyControls = { mount, destroy }` lifecycle surface with no dispatch?
3. Approve no `_KDB.state.historyControls` and runtime-only ownership?
4. Approve updating `KDB.js` for import, register, mount and destroy wiring?
5. Approve updating `eventSubscribe.md` for the existing `history:changed` subscriber entry?
6. Approve adding `KDB3/css/customButtons/toolbarControls.css` and registering it in `cssHrefList.js`?

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |

# Module Contract: `launchpad`

> CP-1 draft for a DIRECT PORT from legacy launchpad into the production tree.
> No production code may be generated until this contract is approved.

---

**Status:** `Draft`
**Owner module / service:** `launchpad`
**Type:** `feature module`
**Authoring AI:** GPT-5.5, 2026-05-17
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Source:

```txt
legacy:js/dashboard/launchpad/
```

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/launchpad/
```

This is a direct port: preserve legacy launchpad-environment behavior and change only what the rules force. No `TEST/` sandbox, no browser harness, no production file changes before CP-1.

Rule-alignment decision from CP-1 discussion: `launchpad` is the environment owner only. Widget cleanup, widget lifecycle, widget DOM movement, and writes to `_KDB.state.widgets` belong to the future `widgets` owner, not to `launchpad`.

## 1. Legacy Evidence

| Legacy file | Evidence used |
|---|---|
| `legacy:js/dashboard/launchpad/__orchestratorLaunchpad.js` | Startup sequence: ensure state, resolve tabs, build/place DOM, settle readiness, subscribe to legacy widget/property signals, route widgets. |
| `ensureLaunchpadState.js` + `core/bootstrap/statePromises/initializeLaunchpadState.js` | Legacy launchpad state fields and rule violations: runtime promise and subscriptions live in state and must move to `_KDB.runtime.launchpad`. |
| `getLaunchpadPadConfig.js` | Canonical **legacy** pad keys and host ids: `visualization`, `text`, `dataTables`, `shapes`. Production target streamlines these — see the pad-label note in §10. |
| `getLaunchpadTabDescriptors.js`, `collectLaunchpadTabIndexes.js`, `buildLaunchpadTabsFromState.js`, `buildLaunchpadTabsFromConfig.js`, `buildLaunchpadTabsFromCanvas.js`, `buildLaunchpadTabDescriptor.js`, `resolveLaunchpadHelperTabs.js` | Tab descriptor discovery from legacy `_KDB.state.tabs`, `_KDB.config.tabs`, Cognos canvas content, and helper-tab metadata; target reads tabs only through a published tabs API/selector when available. |
| `dashboard/launchpad/view.js` (`buildLaunchpadDom`), `dashboard/launchpad/view.js` (`placeLaunchpadDom`), `appendWidgetToLaunchpadSlot.js`, `findLaunchpadSlotMeta.js`, `resolveLaunchpadTabGenericPage.js` | Launchpad DOM structure, hidden host, pad containers, slot metadata, and selector shape. |
| `routeAllWidgetsToLaunchpad.js`, `sendWidgetToLaunchpad.js`, `takeWidgetFromLaunchpad.js`, `takeAllWidgetsFromLaunchpad.js`, `cleanLaunchpadWidget.js`, `setLaunchpadWidgetPlacement.js` | Legacy widget movement and widget-state writes; these are not owned by launchpad under the new rules and are deferred to a future `widgets` owner tranche. |
| `subscribeHideWidgetsToggle.js`, `subscribeLaunchpadWidgetSend.js`, `core/events/launchpad.js`, `core/events/widgetProperties.js` | Legacy event/request wiring; rule-alignment replaces known-owner widget movement with direct `widgets` API/dispatch in a later tranche. |

Production evidence:

- `_____________KDB3API/KDB3/js/dashboard/launchpad/` does not exist yet.
- `_____________KDB3API/KDB3/js/KDB.js` currently does not import, register, mount, or destroy `launchpad`.
- `_____________KDB3API/KDB3/js/core/properties/developerMode.js` (`setHideWidgetsToggle`) now only mirrors `KDBHideWidgetsToggle` onto the developer-mode class; it does not route to launchpad.
- A production `widgets` module/API is not present in this tranche, so widget movement integration is deferred.

## 2. Purpose

`launchpad` owns the hidden launchpad environment where widgets can later move themselves: pad definitions, tab/slot metadata, detached DOM structure, placement of that environment in the dashboard document, and read-only metadata needed by the future `widgets` owner.

It does not own widgets, widget lifecycle, widget cleanup, widget DOM movement, widget state, filters, tabs, kdbControl, or history behavior.

## 3. Ownership

- Canonical state subtree: `_KDB.state.launchpad`.
- Canonical writer: `launchpad` only, through its controller/reducer flow.
- Foreign-write paths: none.
- Existing ownership-map entry: `architecture/stateOwnership.md` already lists `_KDB.state.launchpad` as owned by `launchpad`.

Initial state shape:

```js
_KDB.state.launchpad = {
  lifecycle: "idle",
  domReady: false,
  helperTabPageId: null,
  helperTabIds: [],
  padsByKey: {},
  tabs: [],
  errorCode: null,
  errorMessage: null
};
```

Per-pad slot metadata shape:

```js
_KDB.state.launchpad.padsByKey[padKey] = [
  {
    aliases: [],
    childIndex: 0,
    corTabIndex: 0,
    pageId: null,
    tabId: null,
    slotKey: "visualization_0"
  }
];
```

`tabId` is the single canonical launchpad tab identity. `pageId` and `aliases` may only mirror that same canonical value; intermediate Cognos child/container ids are not stored as launchpad state identity.

Lifecycle subset: `idle`, `initializing`, `ready`, `error`, `disposed`.

State must remain serializable. No DOM nodes, jQuery objects, event subscriptions, promises, AbortControllers, Cognos handles, or functions may live under `_KDB.state.launchpad`.

## 4. Runtime

- Owner namespace: `_KDB.runtime.launchpad`.
- Cleanup trigger: `destroy()`.

| Bucket | Shape / role |
|---|---|
| `domRefs` | `hideSpotEl`, `rootEl`, pad container refs, and slot refs owned by launchpad. |
| `listeners` | Non-abortable DOM listener cleanup descriptors; expected empty in this environment-only tranche. |
| `subscriptions` | Event-bus unsubscribe handles; expected empty unless CP-1 expands event scope. |
| `abortControllers` | Abortable mount/work scopes and native listener scopes. |
| `observers` | DOM observers if mount-target waiting becomes necessary; expected empty unless specified. |
| `timers` | Timeout handles; expected empty. |
| `pendingPromises` | `mount` / readiness promise references moved out of legacy state. |

Cleanup order: set the controller `_isDisposed` guard first, abort controllers, unsubscribe subscriptions, remove listeners, disconnect observers, clear timers, detach launchpad DOM, clear pending promises, then reset `_KDB.runtime.launchpad` buckets. Runtime must not be nulled before cleanup.

## 5. Public API

- Surface: `_KDB.api.launchpad`.
- Style: `dispatch + reducer`, matching the feature-module default.
- Motivation: `launchpad` is a feature module with lifecycle state, DOM mount/destroy, and future external callers; dispatch keeps state mutation behind one owner path.

```js
_KDB.api.launchpad = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Builds and places the launchpad environment, stores/coalesces the in-flight mount promise under `_KDB.runtime.launchpad.pendingPromises.mount`, then resolves to `true` on success and `false` on recoverable failure. If already ready, resolves `true`; if mount is in flight, returns the existing promise. |
| `destroy()` | Idempotent teardown; sets `_isDisposed = true` before cleanup and dispatches the disposed transition. |
| `dispatch(action)` | Sole public command path for `_KDB.api.launchpad`; state-changing actions go through the reducer. Effect-only actions such as `launchpad/waitUntilReady` may return a Promise without writing state. No mixed named commands. |
| `getState()` | Coarse snapshot of `_KDB.state.launchpad`; granular reads use selectors. |

Disposed-state discipline follows `module-public-api.mdc`: after destroy, `getState()` returns `undefined`, `mount()` / `dispatch()` / `destroy()` are guarded no-ops with `console.warn` where applicable, and async in-flight work ignores stale results.

No `sendWidget*`, `takeWidget*`, `cleanWidget*`, or `setWidgetPlacement*` methods are exposed on `_KDB.api.launchpad`; those are future `widgets` owner actions.

### 5.1 Readiness Wait Action

Consumers that must wait for launchpad readiness use the dispatch surface:

```js
await _KDB.api.launchpad.dispatch({
  type: "launchpad/waitUntilReady",
  payload: { timeoutMs: 5000 }
});
```

Contract:

- Returns `Promise<boolean>`.
- Resolves `true` immediately when `readLaunchpadReady(_KDB)` is already true.
- If mount is in flight, returns/coalesces `_KDB.runtime.launchpad.pendingPromises.mount`.
- If launchpad is `idle` and the implementation can safely start mount, it may delegate to `mount({})`; otherwise it resolves `false` with no state write.
- Resolves `false` for timeout, error or disposed states unless the implementation chooses to reject fatal programmer errors.
- Stores Promise/timer resources only in `_KDB.runtime.launchpad.pendingPromises` / `timers`; never in `_KDB.state`.
- Does not emit a `launchpad:ready` event and does not add a named `_KDB.api.launchpad.waitUntilReady` method.
- Cross-module consumers must not read `_KDB.runtime.launchpad` directly.

### 5.2 Read-Only Slot Widget Discovery

Consumers that need the ordered widget ids currently parked in a launchpad pad/slot use the dispatch surface:

```js
await _KDB.api.launchpad.dispatch({
  type: "launchpad/readSlotWidgets",
  payload: {
    padKey: "visualization",
    tabId: "sales-tab",
    mode: "first"
  }
});
```

Payload:

```js
{
  padKey: "text" | "visualization" | "dataTables" | "topN" | "otherResources",
  tabId: string | null,
  mode: "first" | "all"
}
```

Result:

```js
{
  ok: true,
  padKey: "visualization",
  tabId: "sales-tab",
  mode: "first",
  widgets: [
    {
      widgetId: "widget-id",
      slotKey: "visualization_0",
      tabId: "sales-tab",
      padKey: "visualization",
      childIndex: 0
    }
  ],
  widgetId: "widget-id"
}
```

Contract:

- Returns `Promise<object>`.
- `mode` defaults to `"all"` when omitted.
- `tabId` defaults to `null` when omitted. With `tabId:null`, discovery covers all slots for the pad in launchpad slot order, and each slot's direct children remain in DOM order.
- Performs no reducer write and no `_KDB.state.*` write.
- Resolves slots through launchpad-owned slot metadata and launchpad-owned runtime DOM refs; consumers must not read `_KDB.runtime.launchpad`.
- Traverses only direct child elements of resolved slots and reports id-bearing children in deterministic launchpad order.
- `mode:"first"` returns at most one entry in `widgets` and sets `widgetId` to that id or `null`.
- `mode:"all"` returns every id-bearing direct child in `widgets` and sets `widgetId` to `null`.
- Failure returns `{ ok:false, errorCode, errorMessage, padKey, tabId, mode, widgets:[], widgetId:null }`.
- Result data is serializable metadata only. It never includes DOM nodes, jQuery objects, Cognos objects, shell references or functions.
- It does not claim widgets, move widgets, write widget state, write launchpad state, write history, emit events or call Cognos widget APIs.
- `includeShells` is intentionally not part of the contract. A consumer that needs a shell resolves it inside its own ownership boundary from the returned `widgetId`.
- `onlyEligibleWidgetShells` is intentionally not part of the contract. Cognos-content eligibility, host/writeback filtering, helper claimability and widget-type semantics belong to `widgetBase`, `widgetTopN` and `widgetDataTable`, not to launchpad.

## 6. Readers / Writers

Published selectors from `launchpad/state/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readLaunchpadState(_KDB)` | `_KDB.state.launchpad` | Full owner subtree snapshot. |
| `readLaunchpadReady(_KDB)` | `lifecycle`, `domReady` | Boolean readiness projection. |
| `readLaunchpadSlots(_KDB, padKey, tabId?)` | `padsByKey[padKey]` | Slots of one pad (live array copy); with `tabId` only slots whose `tabId` or alias matches. |
| `readLaunchpadSlotMeta(_KDB, padKey, tabId)` | `padsByKey[padKey]` | Slot metadata for a tab id / alias, or `undefined`. |

`tabs` and `helperTabIds` stay in the owner state subtree but have no published selector (read them through `readLaunchpadState`). Internal mutation style: reducer plus focused pure builders. No public writer helpers.

Action names:

| Action type | Purpose |
|---|---|
| `launchpad/mountStarted` | Transition lifecycle to `initializing` and clear previous errors. |
| `launchpad/mountSucceeded` | Store `tabs`, `padsByKey`, `helperTabIds`, `helperTabPageId`, set `domReady: true`, transition to `ready`. |
| `launchpad/mountFailed` | Store `lifecycle: "error"`, `domReady: false`, `errorCode`, and `errorMessage`. |
| `launchpad/waitUntilReady` | Effect-only public wait action. It returns `Promise<boolean>` and performs no reducer state write. |
| `launchpad/readSlotWidgets` | Effect-only public discovery action. It returns ordered widget-id metadata for a pad/tab slot and performs no reducer state write. |
| `launchpad/destroy` | Transition to `disposed` and clear readiness. |

## 7. Events

This direct-port tranche emits no fact-events, subscribes to no events, creates no `events/eventNames.js`, and requires no `eventSubscribe.md` update.

Rationale:

- Legacy `launchpad:widgetSendRequested` is a request to a known owner under the new rules: `widgets`, not `launchpad`.
- Legacy `properties:hideWidgetsToggled` reaction must be routed to the future `widgets` API/dispatch or a documented properties/widgets integration, not handled by launchpad.
- `launchpad:ready` is deferred until a real multi-consumer need appears; consumers can read `readLaunchpadReady` and slot metadata once the module is mounted.

Adding any `launchpad:*` fact-event later requires a contract delta and an `eventSubscribe.md` catalog entry before implementation.

## 8. Dependencies

- `_KDB` (always).
- `_KDB.config.tabs` for configured dashboard/helper tab roles.
- `_KDB.api.tabs.getState()` or published tabs selectors for current tab descriptors when available; if no tabs public surface exists in this tranche, fall back to config/canvas discovery rather than deep-reading `_KDB.state.tabs`.
- `_KDB.cognosAPI.tabs.getTabsContainers()` for tab layout discovery fallback.
- `_KDB.cognosAPI.canvas.findCanvasContent()` for canvas-content fallback.
- `_KDB.elements.kdbWidget` only as a legacy host-reference exception to resolve the owner document; new live launchpad refs are stored under `_KDB.runtime.launchpad.domRefs`.

The module must not discover dependencies through `window._KDB`, `window.top.getKDB()`, or global service lookups from deep files.

## 9. Cognos Touchpoints

Calls performed by launchpad:

| Call | Context | State mirror owner |
|---|---|---|
| `_KDB.cognosAPI.tabs.getTabsContainers()` | Resolve dashboard/helper tab descriptors when a tabs owner snapshot is unavailable or insufficient. | `launchpad` stores only serializable descriptor metadata under `_KDB.state.launchpad`. |
| `_KDB.cognosAPI.canvas.findCanvasContent()` | Fallback descriptor discovery when tab config/state are unavailable. | `launchpad` stores only serializable descriptor metadata under `_KDB.state.launchpad`. |

No widget Cognos calls are performed by launchpad in this contract. Widget rendering, widget container resolution, widget type classification, and widget cleanup belong to the future `widgets` owner.

Direct reads from `_KDB.state.tabs` are not part of this contract; launchpad may consume a tabs snapshot only through the `tabs` owner public surface or through injected/published selectors.

## 10. DOM Discipline

Selector config belongs under `_KDB.elements.selectors.launchpad`, for example:

```js
_KDB.elements.selectors.launchpad = {
  hideSpotSelector: "#KDB_HideSpot",
  rootSelector: "#KDB_widgetLaunchpad",
  slotSelector: "[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"
};
```

Live DOM references belong under `_KDB.runtime.launchpad.domRefs`.

Launchpad may create and place:

- `#KDB_HideSpot`;
- `#KDB_widgetLaunchpad`;
- pad containers for `visualization`, `text`, `dataTables`, `topN`, and `otherResources` (all per-tab);
- per-tab slot elements with `data-kdb-launchpad-pad="<padKey>"`, `cor_page_id="<tabId>"`, and `cor_page_index="<childIndex>"`.

`cor_page_id` is the authoritative DOM page/tab id for a slot, paired with `cor_page_index` and `data-kdb-launchpad-pad` for unique slot targeting.

Other modules must not read `_KDB.runtime.launchpad.domRefs`. A future `widgets` tranche may consume published launchpad selectors and state selectors to locate its destination, but widget DOM mutation remains owned by `widgets`.

> **Pad-label streamlining (delta vs legacy — apply with approval).** Production launchpad channels align 1:1 with the widget content modules + one catch-all, all per-tab: `text`, `visualization`, `dataTables`, `topN`, and `otherResources`. Remap from legacy labels: legacy `shapes` → `dataTables`; legacy `dataTables` → `topN`; `text`/`visualization` unchanged. The legacy `shapes` catch-all role moves to `otherResources`. Authority for this mapping: `architecture/_archive/widgets-domain-blueprint.md` §3.

## 11. Folder Layout

As built after the Phase 1 module-template rework (8 files):

```txt
KDB3/js/dashboard/launchpad/
  __orchestratorLaunchpad.js  # shim: re-exports index.js (path kept for KDB.js)
  index.js              # registerLaunchpad: controller, mount/dispatch/destroy, readiness
  config.js             # DOM_SELECTORS (published as _KDB.elements.selectors.launchpad), PAD_CONFIG (five pads), ACTION_TYPES
  state.js              # initial state and reducer (mountStarted/Succeeded/Failed, destroy)
  state/selectors.js    # published selectors (frozen external path, read by widgetBase)
  buildLaunchpadTabs.js # tab descriptors from state / config / canvas and helper tabs
  effects.js            # readSlotWidgets (slot widget ids per tab), hide-spot lookup
  view.js               # launchpad DOM build/place, hide-spot keep/replace, owner document, runtime DOM refs
```

`launchpad` emits no fact-events and has no `events/` folder.

## 12. Bootstrap Registration

Bootstrap registration in `KDB.js` is needed for the module to run in production, but is explicitly deferred by this session unless CP-1 expands scope.

Deferred integration target:

- import `./dashboard/launchpad/__orchestratorLaunchpad.js`;
- call the orchestrator during feature registration;
- call `_KDB.api.launchpad.mount({})` during feature mounting;
- call `_KDB.api.launchpad.destroy()` during root destroy.

## 13. Out Of Scope

- Moving any widget into or out of launchpad.
- Writing `_KDB.state.widgets` or reading/writing `_KDB.runtime.widgets`.
- Cleaning widget DOM decorations.
- Rendering or re-rendering widgets after a move.
- Returning DOM nodes, shell references or eligibility-filtered widget lists from `launchpad/readSlotWidgets`.
- Claiming, reserving, moving or classifying widgets during `launchpad/readSlotWidgets`.
- Subscribing to `properties:hideWidgetsToggled` or `launchpad:widgetSendRequested`.
- Creating a `widgets` module, widgets API, or widgets contract.
- Bootstrap registration in `KDB.js`.
- Browser harness, TEST sandbox, cross-feature integration tests.
- Editing legacy files or architecture rules/templates.

## 14. CP-1 Decision Summary

| Question | Recommendation captured in this contract |
|---|---|
| Q1 Target placement | `KDB3/js/dashboard/launchpad/`; flat feature module, no subsystem structure needed for environment-only scope. |
| Q2 State ownership | Yes, `_KDB.state.launchpad`; exact initial state and lifecycle subset defined above. |
| Q3 Public API | `_KDB.api.launchpad` with `mount`, `destroy`, `dispatch`, `getState`; no named widget commands. |
| Q4 Runtime resources | `_KDB.runtime.launchpad` owns DOM refs, cleanup buckets, and pending mount/readiness promises. |
| Q5 Events | No launchpad events in this tranche; no event-catalog update. |
| Q6 Disposed state | Add `_isDisposed` controller guard during implementation. |
| Q7 DOM discipline | Selectors under `_KDB.elements.selectors.launchpad`; live refs under `_KDB.runtime.launchpad.domRefs`. |
| Q8 Cross-module ownership | Widget movement/cleanup/state writes are removed from launchpad scope and deferred to `widgets`; direct `_KDB.state.tabs` reads are avoided unless a future tabs contract publishes that read path. |
| Q9 History/undo | No history/undo behavior in launchpad environment scope; no `historyService` dependency. |

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |

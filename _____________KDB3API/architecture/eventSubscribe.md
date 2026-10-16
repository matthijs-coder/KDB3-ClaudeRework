# Event Catalog

The canonical catalog of all events published on `_KDB.events`. Every emitted fact-event, request-event and its subscribers is registered here. An event that is not in this catalog is not considered published per `_____________KDB3API/.cursor/rules/events.mdc`.

Naming, payload and direction rules live in `events.mdc`, `naming.mdc` and `module-public-api.mdc`. This file is the source of truth for **which** events exist and who handles them.

## How To Read An Entry

Every entry has the following fields:

- **Name** — `<region>:<entity><VerbPast>` for facts, `<region>:<verb><Entity>Requested` for requests.
- **Type** — `fact` or `request`.
- **Emitter** — the owner module or service that publishes the event.
- **Confirmation point** — for facts: which state transition or operation confirms the fact before emit. Required.
- **Payload** — JSON-serialisable payload shape; no functions, no DOM nodes.
- **Subscribers** — modules that subscribe and the file path of their handler.
- **Teardown owner** — who unsubscribes when (usually the subscriber's `destroy` per `runtime.mdc`).
- **Motivation (requests only)** — which of the three allowed reasons from `events.mdc` applies: genuinely polymorphic owner, architectural boundary, or multiple independent side-effects.

## How To Add An Entry

1. Propose the event with the user; confirm fact vs request and naming.
2. Add a new section below using the template at the end of this file.
3. Implement emit / subscribe / teardown in the owning module.
4. Reference this catalog entry from the relevant module contract per `_____________KDB3API/contracts/_archive/_template.md` section 6.

A new event without a catalog entry is not allowed to land in code.

---

## Module: kdbControl

Catalog entries for `_____________KDB3API/contracts/kdbControl.md` Section 6. Emitters use `_KDB.events` per `events.mdc`.

### `header:confirmedChanged`

- **Type:** fact
- **Emitter:** `header` module (effects after state commit + DOM sync)
- **Confirmation point:** `_KDB.state.header` reflects the committed transition and header DOM sync for that commit has completed (`header.md` §7).
- **Domain vs lifecycle:** payload field **`status`** is **chrome presence** on `_KDB.state.header` (domain tri-state); it is **not** the module **`lifecycle`** field from `lifecycleVocabulary.md` when that field exists separately (`header.md` §2.1).
- **Payload:**
  ```js
  {
    status: "idle" | "active" | "removed",
    subtitleStatus: "hidden" | "visible",
    titleText: string,
    subtitleText: string,
    source: "kdbControl" | "api" | "bootstrap"
  }
  ```
- **Subscribers:**
  - `footer` — file: `TEST/kdbControl-port/footer/createFooterController.js` — handler: `header:confirmedChanged` subscription in `mount` applies **G-header-removed** (`footer.md` §6) via guarded `footer/hide` dispatch; wrapped in `try/catch`.
  - `kdbControl` (sandbox toolbox read-sync) — file: `TEST/kdbControl-port/kdbControl/framework/__orchestratorFramework.js` — handler: calls `syncFrameworkViewFromState` only (no `_KDB.state.kdbControl` mirror of header/footer); unsubscribe stored at `_KDB.runtime.kdbControl.subscriptions.headerFooterToolboxReadSync`.
- **Teardown owner:** **`footer.destroy()`** clears `runtime.footer.subscriptions.headerConfirmedChanged`; **`kdbControl.destroy()`** clears `headerFooterToolboxReadSync` per `kdbControl-header-footer-toolbox-contractdelta.md` §6.

### ~~Toolbox request-events superseded (CP-1)~~

The following **request** catalog rows applied when toolbox used `_KDB.events` for header/footer chrome. **CP-1 (2026-05-13):** known-owner controls use **`_KDB.api.header.dispatch`** / **`_KDB.api.footer.dispatch`** instead; these request names are **not** emitted from the sandbox port. See `contracts/_archive/kdbControl-header-footer-toolbox-contractdelta.md` §4–5 and `contracts/kdbControl.md` §6.

- ~~`header:toggleRequested`~~ — superseded by direct `header/toggle` dispatch.
- ~~`header:editRequested`~~ — superseded by direct `header/startTitleEdit` / related header actions.
- ~~`header:subtitleToggleRequested`~~ — superseded by direct `header/toggleSubtitle`.
- ~~`header:subtitleEditRequested`~~ — superseded by direct `header/startSubtitleEdit`.
- ~~`footer:toggleRequested`~~ — superseded by direct `footer/toggle`.

### `tabs:toolRequested`

- **Type:** request
- **Emitter:** `kdbControl`
- **Motivation:** genuinely polymorphic owner (tool activation may be handled outside kdbControl).
- **Payload:**
  ```js
  {
    toolId: string
  }
  ```
- **Subscribers:**
  - *(placeholder)* — file: `TBD` — handler: `TBD`.
- **Teardown owner:** subscriber's `destroy()` removes the subscription via `_KDB.runtime.<subscriber>.subscriptions`.

### `authoring:entered`

- **Type:** fact
- **Emitter:** `authoring` module (canonical owner of `_KDB.state.authoring`)
- **Confirmation point:** `_KDB.state.authoring.isAuthoring` commits **`false` → `true`**; emit immediately after that state commit.
- **Payload:**
  ```js
  {
    isAuthoring: true,
    source: "cognos-ui" | "api" | "bootstrap"
  }
  ```
- **Subscribers:**
  - `kdbControl` — file: `kdbControl/__orchestratorKdbControl.js` (or documented wiring) — handler: subscription registered in `mount`; unsubscribe fn stored under `_KDB.runtime.kdbControl.subscriptions.authoringEntered`.
- **Teardown owner:** **`kdbControl.destroy()`** — must clear **`authoringEntered`** (and all other `kdbControl` subscription handles) per `_____________KDB3API/contracts/_archive/kdbControl-authoring-mode-contractdelta.md` §7 and `_____________KDB3API/contracts/kdbControl.md` §3.

### `authoring:exited`

- **Type:** fact
- **Emitter:** `authoring` module (canonical owner of `_KDB.state.authoring`)
- **Confirmation point:** `_KDB.state.authoring.isAuthoring` commits **`true` → `false`**; emit immediately after that state commit.
- **Payload:**
  ```js
  {
    isAuthoring: false,
    source: "cognos-ui" | "api" | "bootstrap"
  }
  ```
- **Subscribers:**
  - `kdbControl` — file: `kdbControl/__orchestratorKdbControl.js` (or documented wiring) — handler: subscription registered in `mount`; unsubscribe fn stored under `_KDB.runtime.kdbControl.subscriptions.authoringExited`.
- **Teardown owner:** **`kdbControl.destroy()`** — must clear **`authoringExited`** (and all other `kdbControl` subscription handles) per `_____________KDB3API/contracts/_archive/kdbControl-authoring-mode-contractdelta.md` §7 and `_____________KDB3API/contracts/kdbControl.md` §3.

---

## Module: tableDataService

Catalog entries for `_____________KDB3API/contracts/tableDataService.md` Section 6. Emitter uses `_KDB.events` per `events.mdc`.

### `tableData:loadFinished`

- **Type:** fact
- **Emitter:** `tableDataService`
- **Confirmation point:** the internal writer `markTableLoaded` has committed `_KDB.state.tableData.<tableName>` to `lifecycle: "ready"`, `freshness: "fresh"` with populated `rows` and `rowCount`. The event is emitted immediately after that commit.
- **Payload:**
  ```js
  {
    tableName: string,
    rowCount: number
  }
  ```
- **Subscribers:**
  - *(placeholder)* — file: `TBD` — handler: `TBD`.
- **Teardown owner:** subscriber's `destroy()` removes the subscription via `_KDB.runtime.<subscriber>.subscriptions`.

### `tableData:loadFailed`

- **Type:** fact
- **Emitter:** `tableDataService`
- **Confirmation point:** the internal writer `markTableFailed` has committed `_KDB.state.tableData.<tableName>` to `lifecycle: "error"` with populated `errorCode` and `errorMessage`. The event is emitted immediately after that commit.
- **Payload:**
  ```js
  {
    tableName: string,
    errorCode: string,
    errorMessage: string
  }
  ```
- **Subscribers:**
  - *(placeholder)* — file: `TBD` — handler: `TBD`.
- **Teardown owner:** subscriber's `destroy()` removes the subscription via `_KDB.runtime.<subscriber>.subscriptions`.

---

## Module: historyService

Catalog entries for `_____________KDB3API/contracts/historyService.md` Section 7. Emitter uses `_KDB.events` per `events.mdc`.

### `history:changed`

- **Type:** fact
- **Emitter:** `historyService`
- **Confirmation point:** `_KDB.state.history` has been initialized or has committed a successful stack/pointer mutation through `pushCommittedStep`, `undo`, or `redo`; the event is emitted immediately after that state commit.
- **Payload:**
  ```js
  {
    pointer: number,
    stackLength: number,
    limit: number,
    canUndo: boolean,
    canRedo: boolean
  }
  ```
- **Subscribers:**
  - `historyControls` — file: `KDB3/js/dashboard/controls/historyControls/effects/subscribeHistoryChanged.js` — handler: syncs Undo/Redo enabled state from the payload or `_KDB.services.history` fallback reads.
- **Teardown owner:** `historyControls.destroy()` clears `_KDB.runtime.historyControls.subscriptions.historyChanged`.

---

## Module: dragDrop

Catalog entry for `_____________KDB3API/contracts/dragDrop.md` Section 8. Emitter uses `_KDB.events` per `events.mdc`.

### `canvas:dropValidated`

- **Type:** fact
- **Emitter:** `dragDrop`
- **Confirmation point:** `validateDropIntent` returned `{ isValid: true }` and the drop payload layout was resolved from the native drop event.
- **Payload:**
  ```js
  {
    draggedElementType: string,
    dropboxId: string,
    layout: object,
    originId: string | null,
    padKey: string | null,
    payload: object,
    sourceKind: string,
    startedAt: number,
    tabId: string | null
  }
  ```
- **Subscribers:**
  - `widgets` / canvas owner — file: `TBD future tranche` — handler: `TBD`.
- **Teardown owner:** subscriber's `destroy()` removes the subscription via `_KDB.runtime.<subscriber>.subscriptions`.

---

## Module: tabs

Catalog entry for `_____________KDB3API/contracts/_archive/tabs-activationEvent-contractdelta.md` and `_____________KDB3API/contracts/_archive/tabs-kdbControl-clickAhead-follow-contractdelta.md`. Emitter uses `_KDB.events` per `events.mdc`. **Status: approved and implemented 2026-07-11; click-ahead 2026-09-04, Cognos groen.**

### `tabs:activationStarted`

- **Type:** fact
- **Emitter:** `tabs` module — file: `KDB3/js/dashboard/tabs/effects/bindTabListClickAhead.js` (capture `click` on the tab list; no state commit).
- **Confirmation point:** the user clicked a Cognos dashboard tab button that is not already active and that has a `pageId` in `_KDB.state.tabs.byIndex`. Emitted in capture phase so kdbControl can move the host before Cognos hides the previous page. Not emitted during `pendingPromises.traverse || .startup || .tabMutation`.
- **Payload:**
  ```js
  {
    tabIndex: number,
    tabIdx: number | null,
    tabId: string | null,
    pageId: string | null,
    firstActivation: boolean,
    source: "userClick"
  }
  ```
- **Subscribers:**
  - `kdbControl` — file: `KDB3/js/dashboard/canvas/kdbControl/framework/followActiveTab.js` — same host-move handler as `tabs:changed` (`moveHostToActiveTab`); skip while tabs work is in flight; handle at `_KDB.runtime.kdbControl.subscriptions.tabsActivationStarted`.
- **Teardown owner:** `tabs.destroy()` aborts `_KDB.runtime.tabs.abortControllers.tabListClick`; kdbControl `destroy()` clears `subscriptions.tabsActivationStarted`.

### `tabs:changed`

- **Type:** fact
- **Emitter:** `tabs` module — file: `KDB3/js/dashboard/tabs/effects/observeActiveTab.js` (activation observer effect after state commit). Additional final-emit points: `KDB3/js/dashboard/tabs/actions/postParameterSetRestoreTraverse.js` (`source: "postRestoreTraverse"`) and the shared saga finalize phase in `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js` (`tabMutationSagaSupport.js`) for `tabs/delete` and `tabs/move` (`source: "tabsMutation"`) — each emits exactly one landing-tab fact after its suppression window closes.
- **Confirmation point:** `_KDB.state.tabs` has committed the observed activation change (`activeIndex` / `byIndex[*].isActive` / `hasBeenActivated`) via the internal `tabs/activeTabObserved` reducer action; emit immediately after that commit. No emit on no-op selection changes.
- **Payload:**
  ```js
  {
    tabIndex: number,          // physical Cognos index
    tabIdx: number | null,     // writeback dashboard-order index, null for non-dashboard tabs
    tabId: string | null,
    pageId: string | null,
    firstActivation: boolean,
    source: string             // diagnostic only; observed values include user/api/mount/postRestoreTraverse/tabsMutation
  }
  ```
- **Subscribers:**
  - `widgetBase` — file: `KDB3/js/dashboard/widgets/widgetBase/effects/subscribeTabsChanged.js` — handler: dispatches `widgetBase/ensureTabWidgetsRouted` on every activation with a non-null `tabId` (idempotent via `routedTabIds`; bugfix sync 2026-07-12, the earlier `firstActivation` filter made retry of a raced first ensure unreachable) per `widgetBase-lazyLaunchpadRouting-contractdelta.md` §4; suppression predicate matches tabs in-flight work (`pendingPromises.traverse || pendingPromises.startup || pendingPromises.tabMutation`); handle at `_KDB.runtime.widgetBase.subscriptions.tabsChanged`.
  - `kdbControl` — file: `KDB3/js/dashboard/canvas/kdbControl/framework/followActiveTab.js` — handler: re-parents the `.KDB3Widget` host (control shell + launchpad) into the active tab's page element resolved by payload `pageId` per `kdbControl-tabFollow-contractdelta.md` §2 (CP-1) and `tabs-kdbControl-clickAhead-follow-contractdelta.md`; ignores events while tabs work is in flight (`_KDB.runtime.tabs.pendingPromises.traverse || .startup || .tabMutation`); handle at `_KDB.runtime.kdbControl.subscriptions.tabsChanged` (wrapper clears the `tabFollowRetry` timer before unsubscribing). Also subscribes to `tabs:activationStarted` (`subscriptions.tabsActivationStarted`).
  - `footer` — file: `KDB3/js/dashboard/footer/createFooterController.js` — handler: internal `__tabsSync` → `syncFooterFromState` (page indicator = physical `readActiveTabIndex` + 1). No in-flight suppression (paint only; must not use `__mountSync`). Handle: `_KDB.runtime.footer.subscriptions.tabsChanged`. Teardown: `footer.destroy()`.
  - `dragDrop` — file: `KDB3/js/dashboard/canvas/dragDrop/dropboxes/rebind.js` (binding in `dropboxes/bind.js`) — handler: per-page rebind. On every activation it binds only the activated page's dropbox (element looked up by payload `pageId`, then `tabId`; no document-wide rebind, other pages keep their bound listeners; a payload without both ids falls back to a document-wide bind). Bound dropboxes are kept idempotently, one AbortController per dropbox element. After every activation one bounded kit `pollUntil` (200ms interval, 3s cap) re-binds the page until a pass finds the same connected, bound element one interval after the previous pass (covers Cognos' lazy page render and a page node swapped right after the first bind; a helper page ends the poll at once). A newer activation aborts the previous poll. A timeout with a recorded error is logged once with `console.error`. Suppression predicate: kit `readTabsBusy` (`pendingPromises.traverse || .startup || .tabMutation`). `dragDrop.mount` subscribes before its initial document-wide bind. Handle at `_KDB.runtime.dragDrop.subscriptions.tabsChanged`, poll abort controller at `_KDB.runtime.dragDrop.abortControllers.tabsChangedRebind` (replaces the former `timers.tabsChangedRebind`)
- **Teardown owner:** each subscriber's `destroy()` clears its own `subscriptions.tabsChanged` (and kdbControl also `tabsActivationStarted`); `tabs.destroy()` disconnects the activation observer (`_KDB.runtime.tabs.observers.activeTabObserver`) and aborts `abortControllers.tabListClick`.

---

## Template For A New Entry

````md
### `<region>:<name>`

- **Type:** fact | request
- **Emitter:** `<module / service>`
- **Confirmation point:** `<state transition or operation>` (facts only)
- **Motivation:** `<polymorphic | architectural boundary | multiple independent side-effects>` (requests only)
- **Payload:**
  ```js
  {
    // JSON-serialisable fields only
  }
  ```
- **Subscribers:**
  - `<module>` — file: `<path>` — handler: `<function>`.
- **Teardown owner:** `<who unsubscribes when>`
````

See also: `_____________KDB3API/.cursor/rules/events.mdc`, `naming.mdc`, `module-public-api.mdc`, `_____________KDB3API/contracts/_archive/_template.md`.

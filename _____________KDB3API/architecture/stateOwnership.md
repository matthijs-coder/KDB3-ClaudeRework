# State Ownership and Module APIs

Architecture rules for `_KDB.state`, module ownership, public APIs, services, and cross-module communication. This document is one of the two highest-authority sources for the project, alongside `_____________KDB3API/architecture/projectStructureRules.md`. The rules in `_____________KDB3API/.cursor/rules/` (start with `core.mdc`) operationalise these principles.

## Core Principle

`_KDB.state` remains the central state store for durable, JSON-serialisable dashboard state.

But: **central state store does not mean public write access.** Modules may not freely mutate any subtree in `_KDB.state`. Each subtree has one owner and one canonical writer.

## State vs Runtime

Use `_KDB.state` only for inspectable, JSON-serialisable dashboard reality:

- selected widget id;
- active tab id;
- filter values;
- kdbControl settings;
- table load status (`lifecycle` + `freshness` per `_____________KDB3API/.cursor/lifecycleVocabulary.md`);
- header / footer status;
- persisted dashboard UI settings.

Do not store these in `_KDB.state`:

- DOM nodes;
- jQuery objects;
- event handlers;
- AbortControllers;
- observers;
- timeout or interval ids;
- Promise objects;
- Cognos API objects;
- adapter instances;
- functions;
- temporary mouse / hover / drag implementation details.

Use `_KDB.runtime.<owner>` for those, per `_____________KDB3API/.cursor/rules/runtime.mdc`.

Recommended split:

```js
_KDB.state    // serializable dashboard state
_KDB.runtime  // DOM refs, listeners, observers, timers, adapters
_KDB.services // shared capabilities
_KDB.api      // public module APIs
_KDB.events   // top-level event bus (not a service)
```

Example:

```js
_KDB.state.kdbControl = {
  settings: {},
  selectedSection: "dashboard",
  isCollapsed: false
};

_KDB.runtime.kdbControl = {
  placedShell: null,
  listeners: {},
  subscriptions: {},
  abortControllers: {}
};
```

## Canonical Writer Rule

Every `_KDB.state.<subtree>` has exactly **one** canonical writer. Only the writer module mutates its own subtree. Other modules read through selectors or request changes through the writer's public API.

### Full Ownership Map

| State subtree | Canonical writer |
|---|---|
| `_KDB.state.kdbControl` | `kdbControl` module |
| `_KDB.state.authoring` | `authoring` module |
| `_KDB.state.widgets` | **family container** (not a writer) — nested writers in Widget sub-owners below |
| `_KDB.state.filters` | **family container** (not a writer) — nested writers in Filter sub-owners below |
| `_KDB.state.launchpad` | `launchpad` module |
| `_KDB.state.tabs` | `tabs` module |
| `_KDB.state.header` | `header` module |
| `_KDB.state.footer` | `footer` module |
| `_KDB.state.tableData` | `tableDataService` |
| `_KDB.state.loading` | `loadingService` |
| `_KDB.state.history` | `historyService` |

This table is the canonical source. Modules introducing a new top-level subtree must add an entry here per `state.mdc` *New state and unclear ownership* (canonical writer, initial state shape, read/write contract, ownership-map entry).

### Filter sub-owners

`_KDB.state.filters` is a **family container**, not a single writer. Nested subtrees have their own canonical writers. Sibling filter owners must not write each other's nested keys.

| Nested subtree | Canonical writer | Public API |
|---|---|---|
| `_KDB.state.filters.singleSelect` | `singleSelect` | `_KDB.api.singleSelect` |
| `_KDB.state.filters.dienststelle` | `dienststelle` | `_KDB.api.dienststelle` |
| `_KDB.state.filters.sicht` | `sicht` | `_KDB.api.sicht` |
| `_KDB.state.filters.specialSingleSelect` | `specialSingleSelect` | `_KDB.api.specialSingleSelect` |
| `_KDB.state.filters.nativeMultiSelect` | `nativeMultiSelect` | `_KDB.api.nativeMultiSelect` |

There is no `_KDB.api.filters` dispatcher — that name in older drafts is superseded by the per-owner APIs above.

### Widget sub-owners

`_KDB.state.widgets` is a **family container**, not a single writer. Nested subtrees have their own canonical writers. Sibling widget owners must not write each other's nested keys.

There is **no** `_KDB.api.widgets` (0 hits in production JS). Older drafts and examples that used `_KDB.api.widgets` / `widgets.dispatch` are stale. Live APIs are the six rows below. `dashboard/canvas/` is a group folder (`kdbControl`, `pageSurface`, `dragDrop`). Page size and background live at `_KDB.api.canvas` (module `pageSurface`); there is no `_KDB.state.pageSurface`.

| Nested subtree | Canonical writer | Public API |
|---|---|---|
| `_KDB.state.widgets.base` | `widgetBase` | `_KDB.api.widgetBase` |
| `_KDB.state.widgets.settings` | `widgetSettings` | `_KDB.api.widgetSettings` |
| `_KDB.state.widgets.text` | `widgetText` | `_KDB.api.widgetText` |
| `_KDB.state.widgets.vis` | `widgetVis` | `_KDB.api.widgetVis` |
| `_KDB.state.widgets.topN` | `widgetTopN` | `_KDB.api.widgetTopN` |

The `widgetDataTable` scaffold module was retired in Phase 2 W12 (frames of kind `datatable` stay a `widgetBase` concept with no content owner). Runtime owners stay top-level (`_KDB.runtime.widgetBase`, …), not under `runtime.widgets`.

The JS-on-ramp for these APIs is `_____________KDB3API/architecture/jsModuleMap.md`.

Other modules may read through selectors / readers or request changes through public APIs, actions, commands, or events.

## Readers And Selectors

Other modules should not depend on internal state shape. Prefer named readers / selectors:

```js
readKdbControlState(_KDB);
readSelectedWidgetId(_KDB);
readWidgetState(_KDB, widgetId);
readActiveTabId(_KDB);
```

This allows internal state shape to change later without breaking consumers. Selectors live in the owner's selector registry (`<owner>/state/selectors.js` or its index) per `module-public-api.mdc`.

For data owned by a shared service, reads go through the service's deliberate read methods (e.g. `_KDB.services.tableData.readRows(tableName)`), not through a separate selector registry.

## Public Module APIs

Every feature module used by other modules exposes a small public API under `_KDB.api.<module>`:

```js
_KDB.api.kdbControl
_KDB.api.canvas
_KDB.api.authoring
_KDB.api.widgetBase
_KDB.api.widgetSettings
_KDB.api.widgetText
_KDB.api.widgetVis
_KDB.api.widgetTopN
_KDB.api.launchpad
_KDB.api.singleSelect
_KDB.api.dienststelle
_KDB.api.sicht
_KDB.api.specialSingleSelect
_KDB.api.nativeMultiSelect
_KDB.api.tabs
_KDB.api.header
_KDB.api.footer
```

`_KDB.api.widgets` is stale and must not be used as an example. `_KDB.api.canvas` is the pageSurface receiver (page size / background), not a widget-placement API.

A public API is the module's front door. Feature modules use **dispatch + reducer** as default per `module-public-api.mdc`.

Good (dispatch-style commands on feature modules):

```js
_KDB.api.widgetBase.dispatch(action);
_KDB.api.launchpad.dispatch({ type: "launchpad/sendWidget", payload: { widgetId } });
_KDB.api.kdbControl.dispatch(action);
```

Not this:

```js
// Foreign state writes are forbidden.
_KDB.state.widgets.base = nextBase;
_KDB.state.launchpad.items.push(widget);

// Named commands on a dispatch-style API are a forbidden mixed shape per module-public-api.mdc.
_KDB.api.launchpad.sendWidget(widgetId);
```

## Services vs APIs

`_KDB.services` contains shared capabilities. Examples:

```js
_KDB.services.tableData
_KDB.services.history
_KDB.services.cognosHost
```

Services provide infrastructure or reusable capabilities, and they default to named-method public surfaces per `module-public-api.mdc`.

The event bus is **not** a service: it lives at the top-level `_KDB.events` per `_____________KDB3API/.cursor/rules/state.mdc` and `events.mdc`. Older drafts that referenced `_KDB.services.eventBus`, `_KDB.services.cognos`, or `_KDB.services.logging` are superseded. Live Cognos adapter key: `_KDB.services.cognosHost`. There is no logging service.

`_KDB.api` contains feature-module APIs (see Full Ownership Map above for the canonical list).

**Rule of thumb:**

- use `_KDB.services` for infrastructure;
- use `_KDB.api` for feature / module behaviour.

Avoid vague god services such as:

- `dashboardService`
- `widgetService`
- `filterService`
- `stateService`

These often become bypasses around module ownership.

## Events

Use events for cross-module communication. Events describe facts or requests, not implementation details. The full naming and discipline rules live in `_____________KDB3API/.cursor/rules/events.mdc`.

Good event names (canonical colon-style per `events.mdc` and `naming.mdc`):

```txt
kdbControl:widgetSelected             // fact, region operates on entity (past tense)
launchpad:moveWidgetRequested         // request, ends with Requested
widgets:widgetMovedToLaunchpad        // fact
tableData:loadFinished                // fact, region is subject
header:toggled                        // fact
footer:toggleRequested                // request
```

Slash-style names (`kdbControl/toggleLaunchpad`, `launchpad/sendWidget`) belong to **actions**, not events; see `naming.mdc` for the action-vs-event distinction.

Subscribers may only:

- write their own state subtree, or
- call the explicit public API of the owning module.

Subscribers must not directly mutate another module's state subtree.

## Commands And Requests

If module B wants module A to change something, module B uses one of these:

- call module A's public API (dispatch for features, named methods for services);
- publish a request-event when the conditions in `events.mdc` apply.

Do not directly write module A's state.

Good (direct API call to known owner, dispatch-style feature module):

```js
_KDB.api.launchpad.dispatch({ type: "launchpad/sendWidget", payload: { widgetId } });
```

Good (request-event when owner is genuinely polymorphic or behind an architectural boundary, see `events.mdc`):

```js
_KDB.events.emit("launchpad:sendWidgetRequested", { widgetId });
```

Bad (foreign state write):

```js
_KDB.state.launchpad.items.push(widget);
```

Bad (named command on a dispatch-style API):

```js
_KDB.api.launchpad.sendWidget(widgetId);
```

## Reducers And Effects

Reducers are pure:

```txt
state + action -> nextState
```

Reducers must not:

- touch DOM;
- call Cognos;
- emit events;
- write history;
- start timers;
- perform async work.

Effects perform outside-world actions:

- Cognos API call;
- event emit via `_KDB.events`;
- history commit;
- dashboard DOM effect;
- async side effect.

Avoid one large `effects/` dumping ground. Split by responsibility when needed (illustrative file names):

```txt
effects/
  applyCognosFilterEffects.js
  applyLaunchpadEffects.js
  applyHistoryEffects.js
  publishKdbControlEvents.js
```

## Dependency Injection

Modules receive dependencies explicitly from their orchestrator / controller.

Good:

```js
createKdbControlController({
  _KDB,
  eventBus,
  historyService,
  tableDataService,
  cognosAdapter
});
```

Avoid deep files doing this:

```js
window._KDB.services.historyService;
```

Deep modules should not search globally for dependencies.

## tableDataService

`tableDataService` is a shared service subsystem, not a UI-feature module.

**Responsibilities:**

- load table data;
- cache table data;
- manage load status (`lifecycle` + `freshness`);
- wait until rows are available;
- expose table data through a public API.

**Public API (named methods):**

```js
loadTable(tableName);
loadAll(tableNames);
readRows(tableName);
waitForRows(tableName, options);
reloadTable(tableName, options);
ensureFreshRows(tableName);
readTableState(tableName);
```

**Ownership:** `_KDB.state.tableData` belongs to `tableDataService`. Other modules read table data through the service API. Other modules do not mutate `_KDB.state.tableData`.

**Not responsibilities of `tableDataService`:**

- widget behaviour;
- filter behaviour;
- launchpad logic;
- kdbControl state;
- dashboard decisions.

Rule: `tableDataService` provides data. Consumers interpret that data inside their own module.

## Startup

Startup / init tasks decide which tables are loaded at dashboard start.

Example:

```js
_KDB.services.tableData.loadAll(requiredTables);
```

This means:

- `loadAllTableData` is startup flow;
- `tableDataService` is the reusable data capability.

## kdbControl

`kdbControl` owns controls, buttons, inputs, settings UI, and its own state.

It should **not** own:

- widget state;
- filter state;
- launchpad state;
- tab state;
- table data state;
- **canonical dashboard authoring mode** (`_KDB.state.authoring` / `_KDB.api.authoring` — **`authoring`** module per CP-1; `kdbControl` is a subscriber only).

**Public API (dispatch-style per `module-public-api.mdc`):**

```js
_KDB.api.kdbControl = {
  mount,
  destroy,
  dispatch,
  getState
};
```

There is no `registerControl` / `registerCustomControl`: built-in controls are static (`contracts/kdbControl.md` F4).

### controlDefinitions

Use declarative control definitions for repeated buttons, inputs, toggles, and selects. Definitions are strictly serializable data; behaviour is resolved by named actions, selectors, controller and effects (see `module-public-api.mdc`).

```js
{
  id: "toggleLaunchpad",
  type: "button",
  label: "Launchpad",
  action: "kdbControl/toggleLaunchpad"
}
```

```js
{
  id: "topN",
  type: "select",
  label: "Top N",
  optionsKey: "topN",
  action: "kdbControl/setTopN"
}
```

Benefits:

- less repeated render / bind / sync code;
- controls become easier to test;
- buttons and inputs have one source of truth;
- future modules can register controls through the public API.

### Recommended folder structure

Illustrative template only, not the as-built tree. The real kdbControl layout is in `contracts/kdbControl.md` §9; module file layouts in general are in `architecture/jsModuleMap.md`.

```txt
kdbControl/
  config/
    controlDefinitions.js
    actions.js
    selectors.js
    defaults.js
  state/
    createInitialState.js
    reduceKdbControlAction.js
    readState.js
    writeState.js
  view/
    renderKdbControl.js
    renderControlElement.js
    syncViewFromState.js
  adapters/
    createCognosKdbAdapter.js
    createMockKdbAdapter.js
  effects/
    applyKdbControlEffects.js
  createKdbControlController.js
  createControlElementsRegistry.js
  kdbControl.css
  dashboard/canvas/kdbControl/index.js
```

Optional later folders:

```txt
events/
harness/
diagnostics/
validation/
```

## Harnesses

A harness is a local test environment for a module without Cognos.

A harness may contain:

- `index.html`;
- mock `_KDB`;
- mock adapter;
- mock dashboard DOM;
- debug state panel;
- browser assertions.

Purpose:

- test UI;
- test buttons;
- test inputs;
- test state transitions;
- test events;
- test effects.

A harness should preserve the real module's DOM and CSS contracts whenever visual parity matters.

## Summary Rule

Autarkic modules do not mean every module duplicates everything.

They mean:

- each module owns its own state, view, and behaviour;
- shared services provide infrastructure through narrow APIs;
- communication goes through public APIs, actions, or events;
- `_KDB.state` remains central, but write access is restricted by ownership;
- runtime objects stay out of `_KDB.state`.

See also: `_____________KDB3API/architecture/projectStructureRules.md`, `_____________KDB3API/architecture/_archive/migrationContext.md`, `_____________KDB3API/architecture/eventSubscribe.md`, `_____________KDB3API/architecture/filesExplained.md`, `_____________KDB3API/.cursor/rules/`.

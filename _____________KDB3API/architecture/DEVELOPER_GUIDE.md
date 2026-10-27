# KDB3 Developer Guide

**Audience:** a developer who takes over KDB3 without the original author. **Language:** English; user-facing strings in the product are German. **State described:** `main` after Phase 2 (`9e29c09`).

**Path conventions.** Paths in `code spans` are relative to `_____________KDB3API/` (the folder that contains this guide's `architecture/` folder). JS paths such as `core/...`, `dashboard/...`, `bootstrap/...`, `workflows/...` and `KDB.js` are relative to `KDB3/js/`. `tools/...` is the repository-root folder next to `_____________KDB3API/`; commands such as `node tools/check-all.mjs` run from the repository root. `kdbControl`, `pageSurface` and `dragDrop` live under `dashboard/canvas/`; `_KDB.api.canvas` is the `pageSurface` module.

---

## 1. What KDB3 is and what this guide covers

KDB3 is an **IBM Cognos Analytics dashboard extension**. It turns an ordinary Cognos dashboard into the *configurable personnel dashboard* ("Konfigurierbares Personaldashboard") and adds:

- a **control panel** (`kdbControl`) for page size, header/footer, tabs and comments, and drag of **Kennzahlen** (metrics) from a tree onto the canvas;
- **KDB widgets** (visualizations, text, a hidden TopN helper) with a gear-icon settings panel;
- **filters** with domain logic (Dienststelle hierarchy, Sicht, rights-gated special filters, native multi-selects) on the Cognos filter dock;
- **undo/redo**, **save/restore** as a *parameter set*, **PDF export**, **share links**, a **Wien-KI** button and **drill-through** to PKZ detail reports.

KDB3 does not replace Cognos: it drives Cognos through the dashboard API, and Cognos stays the engine that queries data and renders charts.

**Project history in one paragraph.** KDB3 was refactored in three phases without changing behaviour. *Phase 0*: safety nets (checks, kit tests, smoke checklist, debug and orphan removal, rules, archived contracts). *Phase 1*: every module moved to the module template with the helper kit, Cognos facets and one canonical state writer (workstreams WS-A to WS-P). *Phase 2* (waves W1 to W14, X1 to X4, each a reviewed pull request): manifest-driven bootstrap, filter owner kit, tab saga on slot stock, the `workflows/` layer, removal of all shims and of `widgetDataTable`, naming and doc hygiene. The code base went from about 1,800 files and 122,000 lines to about 720 files and 90,000 lines. Behaviour is pinned by golden and unit tests recorded on pre-change code. **No Cognos runtime exists in CI**, so everything Cognos-facing still needs the manual smoke run (chapters 11 and 14).

**Scale (Phase 2 complete).** 720 production JavaScript files and 90,618 lines under `KDB3/js/` (vendored libraries excluded), none over 400 code lines; 132 Node test files; `check-all` runs four checks (chapter 11). No build step: the files you edit are the files Cognos loads.

### Quick start and reading list

1. Read chapters 2 to 6, then open `KDB.js` (about 200 lines), `bootstrap/featureManifest.js` and `KDB3/spec.json`.
2. Read `AGENTS.md` and `.cursor/rules/core.mdc` (rules, frozen contract).
3. Open `dashboard/header/`, a complete small module (6.2); then `architecture/stateOwnership.md` and `core/services/cognosHost/index.js` plus one facet.
4. Check a change from the repository root with `node tools/check-all.mjs` (Node 22 or newer); Cognos-facing changes are verified by hand (`tools/smoke-checklist.md`).

---

## 2. How Cognos loads the extension

### 2.1 `spec.json`

`KDB3/spec.json` is the extension manifest. It declares one dashboard content type: `collectionItems[0]` with `id` and `name` `KDB3` (menu entry and `.zip` name) and `type` `KDB3Widget` (the CSS class on the widget element); `renderer.class` `v1/ext/KDB3/js/KDB` (AMD id of `KDB3/js/KDB.js`); `renderer.dependencies` `Dashboard.Canvas`, `UserProfile`, `Properties`, `Dashboard.API` (host features injected as `options.features[...]`); `renderer.runtimeDependencies` `DataQueryExecution` (to read query results); and a `propertyList` of 16 text inputs and 4 toggles (2.4).

`spec.json` is part of the **frozen external contract**: change it only with a written note and review, and re-upload the extension afterwards.

### 2.2 URL prefix and deploy

Cognos serves everything under **`v1/ext/KDB3/`**. The prefix is hard-coded in `spec.json` and in one JS place, `core/config/assetBase.js` (`ASSET_BASE`, used by `core/css/config/cssHrefList.js` and the image configs). To deploy, **zip the whole `KDB3/` folder and upload it**. Since Phase 2 `KDB3/js/` has two new top-level folders, **`bootstrap/` and `workflows/`**, next to `core/` and `dashboard/`; a zip without them will not load. Re-upload whenever `spec.json` changes, then hard-reload the browser to drop cached AMD files (14.1, item 2).

### 2.3 AMD and the renderer contract

Cognos loads code with RequireJS. Every production file is exactly **one** `define([deps], function (...) { ... return oneValue; })`; no ES modules, CommonJS or top-level side effects (`amd.mdc`); dependency paths are relative and end in `.js`. The one exception is the host module `jquery` (a bare id, imported only by `metricsTree/dragSource.js` and `view.js`).

`KDB.js` returns the class `KDB` (contract documented above `getAPI()`):

```js
const instance = new KDB(options);     // options.parent = widget element, options.features = host features
instance.getAPI().render(options);     // getAPI() returns ONLY { render }
instance.destroy();                    // called directly by Cognos when the widget or dashboard closes
```

There is no `propertyChanged`, `resize` or `setData` hook. Properties are read once at boot (`core/properties/loadProperties.js`); only `KDBHideWidgetsToggle` is subscribed live (`SUBSCRIPTIONS` in `propertyDefinitions.js`, `core/properties/developerMode.js`).

Reopening a dashboard can boot **two instances** and dispose the first during the open sequence ("double boot"), so `window.top.getKDB` is removed only by the instance that owns it (`core/bootstrap/getKDBAnchor.js`, `uninstallGetKDB`).

### 2.4 Property panel keys

The author pastes configuration into the widget's property fields (paste sources: `__savedProperties/`, not imported by code). `core/properties/loadProperties.js` reads them at boot into `_KDB.properties`. Each text input must be a JSON object with **exactly one key equal to the property id**, e.g. `{"filterPropId": {...}}`; anything else is logged and read as `undefined`.

| Cognos property id | `_KDB.properties` key |
|---|---|
| `loadingTablesPropId` (hidden Cognos tables loaded at boot) | `loadingTablesPropObj` |
| `kennzahlenTablesPropId`, `kennzahlenTreePropId`, `kennzahlSpecificSlotDefaultId`, `filterPropId`, `textWidgetPropId`, `visualizationsPropId`, `visualizationsDataPropId`, `pdfAttachmentPageId`, per-type ids (`linePropId`, `piePropId`, `stackedBarPropId`, `stackedColumnPropId`, `listPropId`, `com.ibm.vis.custom.prognoseyearlinechartPropId`) | the id with `Id` replaced by `Obj` (`prognosePropObj` for the Prognose chart) |
| `parameterMappingId` / `headerWidgetPropId` | not loaded / `headerWidgetPropObj` (loaded but not declared; 14.1) |
| `KDBReadyToggle` | same; boot gate: when off, boot stops before `startModules` (registration, including authoring and CSS, already ran) |
| `KDBLoadingImageToggle`, `KDBLoadingImageTransparentToggle` | `KDBPlayLoadingImageToggle`, `KDBLoadingImageTransparentToggle` (boot overlay) |
| `KDBHideWidgetsToggle` | same; developer mode, the only live-subscribed property |

The id-to-key table is `core/properties/propertyDefinitions.js` (`OBJECTS`, `TOGGLES`, `SUBSCRIPTIONS`). The package-bound KID/itemId map that replaces `parameterMappingId` is `core/config/mapping/parameterMap.js`; edit it when the Cognos package changes.

---

## 3. Architecture

### 3.1 Layers and dependency direction

```
KDB.js                renderer class: event bus, render gate, destroy
  |-- bootstrap/      composition root (imported only by KDB.js): featureManifest.js, registerServices.js
  |-- workflows/      parameterSet (save/restore, Cognos bridge), pdfExport: services that drive several features
  |-- dashboard/      features, _KDB.api.<module>: header, footer, tabs, launchpad, canvas/{kdbControl, pageSurface,
  |                     dragDrop}, metricsTree, controls/toolbarControls, widgets/*, filters/* (+ filters/_core kit)
  `-- core/           imports neither dashboard/ nor workflows/
        bootstrap/ (boot lifecycle steps), properties, config, events, css, authoring, homeDialog, utils (+ kit)
        services/     tableData, history, loading, message, chrome, widgetBindingPlan/Apply, widgetBinding, drillthrough
          cognosHost  (ring 1: facets, Outcome objects) -> cognosAPI (inner ring: SDK wrappers) -> __getDashboardAPI()
        cognosHost    (chrome ring: selector catalogue, no SDK)
```

- `KDB.js` imports `bootstrap/` and `core/` and is the only importer of `bootstrap/`.
- `bootstrap/` may import everything; `registerServices.js` is the only importer of `workflows/`.
- `workflows/` imports `core/`; published dashboard surfaces are allowed (the gate only reports such edges; there are none). Features are reached at runtime through `_KDB.api.<owner>`.
- `dashboard/` imports `core/` and other dashboard modules through published selectors and event files; never `workflows/`.
- `core/` imports `core/` only, with no allow-list.

The **layering gate** is `tools/lib/layering.mjs`, enforced by `node tools/check-imports.mjs` with four rules, all at zero: `core -> dashboard`, `core -> workflows`, `dashboard -> workflows`, and `bootstrap/` imported by anything but `KDB.js`. Vocabulary shared across layers therefore lives in `core` (`core/events/tabs.js` and `filters.js`, `core/utils/tabSlots.js`, `core/config/writebackErrorCodes.js`). Features talk to other features through `_KDB.api.<module>` (commands) and published selectors and event-name files (reads), and reach Cognos only through a facet; dashboard code calls workflow services through `_KDB.services.*`, never by import.

### 3.2 The three "cognos" folders

Three folders with "cognos" in the name are three layers and must **not be merged** (product-owner decision, `.cursor/rules/cognos-adapter.mdc`; a collapse proposed in Phase 2 was dropped): a Cognos upgrade then stays contained (SDK changes in the inner ring, DOM changes in the chrome catalogue, KDB logic untouched).

- **Inner ring**, `core/cognosAPI/`, published as `_KDB.cognosAPI.<theme>.<fn>`: the only code calling `__getDashboardAPI()`; plain wrappers without KDB logic or state, usable from the console (`getKDB().cognosAPI.dashboard.getMode()`). Ten themes: `glassMessages` (Glass app controller, not the dashboard SDK), `dashboard`, `canvas`, `dataSources`, `widgets`, `visualization`, `dataQuery`, `filters`, `tabs`, `async`. `captureRoot.js` is a DOM helper of `dashboard.resolveCaptureRoot`, not a theme.
- **Ring 1**, `core/services/cognosHost/`, published as `_KDB.services.cognosHost.<facet>`: nine facets (`filters`, `widgets`, `canvas`, `visualization`, `dataQuery`, `dashboard`, `dataSources`, `messages`, `tabs`; `facets/<name>/index.js`) that handle waiting, timeouts and abort and return **Outcome** objects.
- **Chrome ring**, `core/cognosHost/`, published as `_KDB.elements.selectors.<group>` and `_KDB.runtime.cognosHost.chromeChecks`: CSS selectors for Cognos' own UI (toolbar, tabs, filter dock, widget frames) and a check that reports required selectors that find nothing.

An **Outcome** is `{ ok, outcome: "ok" | "degraded" | "aborted" | "failed", data?, errorCode?, reason?, diagnostics? }` (`core/services/cognosHost/outcome.js`); callers check `ok` instead of wrapping Cognos promises in try/catch. After `destroy`, facets answer with a disposed Outcome (`reason: "disposed"`), never `null`. Add no facet operation or wrapper without a real caller (a few inner-ring functions have none, e.g. `getUserInfo`, a console helper: deletion candidates, `cognos-adapter.mdc` says delete in the cognos workstream, not ad hoc).

**How a feature calls Cognos.** At registration the owner copies a facet into its runtime, e.g. `_KDB.runtime.widgetVis.dataQueryFacet = _KDB.services.cognosHost.dataQuery` (a "stamp"); effects then call `rt.dataQueryFacet.readQueryRows(...)` and check the Outcome. Features read stamps and facets through small local `readHostFacet` helpers (`core/utils/readHostFacet.js` exists but only a test imports it). Features never call `_KDB.cognosAPI` or `__getDashboardAPI()`; stamp names are stable. `_KDB.services.chrome` (`core/services/chrome/`) is a stateless facade over `chromeChecks`.

### 3.3 Remaining exceptions

Two exceptions to "only through facets" (do not copy): PDF capture calls `_KDB.cognosAPI.dashboard.resolveCaptureRoot` in `workflows/pdfExport/capture/captureTabPage.js` (the `dashboard` facet lacks it), and `KDB.js` sets `_KDB.cognosAPI` to `null` on destroy (`core/cognosAPI/index.js` creates it). The Phase 1 exception "writeback imports from `dashboard/`" is gone: it now reads owners through `core` constants and `_KDB.api.<owner>.getState()`.

---

## 4. The `_KDB` object and state ownership

One `KDB` instance is *the* `_KDB` object, passed as the first argument to almost every function. `window.top.getKDB()` returns it for debugging; production code never uses globals.

- `_KDB.state`: JSON-serialisable dashboard and session state; one **canonical writer** per subtree.
- `_KDB.runtime`: per-owner technical objects (DOM refs, listeners, observers, timers, AbortControllers, pending promises, facet stamps); owner-private, cleaned up in `destroy`.
- `_KDB.api`: the public API of each feature, normally `{ mount, destroy, dispatch, getState }`; commands go through `dispatch` (exceptions below).
- `_KDB.services`: shared services with named methods (`tableData.readRows`, `history.undo`); no `dispatch`.
- `_KDB.events`: event bus (`emit`, `subscribe` with `{ signal }`); facts only (9.7).
- `_KDB.cognosAPI`: inner Cognos ring, called only by ring 1. `_KDB.config`: static configuration and German labels (`config.labels.de.<module>`). `_KDB.properties`: property panel values (2.4), read-only. `_KDB.elements.selectors`: CSS selector strings per module. `_KDB.utils`: six pure helpers published by `core/utils/registerUtils.js` (the kit is imported via AMD). `_KDB.data`: reserved, unused.

No other top-level keys. `_KDB.runtime.core` is small: `domRefs.renderParentEl`, the CSS link registry `domRefs.cssLinks` and `adapters.content` (the Cognos content adapter read by `core/properties`).

**Known exceptions to the `{ mount, destroy, dispatch, getState }` shape:** `api.dragDrop.startDrag`, `finishDrag`, `refreshDropboxes` (`startDrag` is the real drag entry); `api.shareControls.applyReadOnlyChrome`; `api.properties = { applyDeveloperMode }` (`core/properties/index.js`); `api.tabs.isMutationRunning()`, `isBusy()` and `readCurrentTab(root)`; `api.kdbControl.syncView`; `api.metricsTree.resolveMetricByCode`. **Authoring** is a feature API registered from `core` (`core/authoring/index.js`): its `register` assigns `_KDB.api.authoring` and **mounts it immediately** (so its manifest entry has no `mount`), then stamps `dashboardFacet`, because `mount` resets `runtime.authoring`.

### 4.1 One canonical writer per subtree

| Subtree | Writer |
|---|---|
| `state.header`, `footer`, `tabs`, `launchpad`, `kdbControl`, `dragDrop`, `metricsTree`, `authoring` | the module of the same name |
| `state.widgets.<sub>` (`base`, `settings`, `vis`, `text`, `topN`) | the matching widget module |
| `state.filters.<sub>` (`filterDock`, `singleSelect`, `sicht`, `specialSingleSelect`, `dienststelle`, `nativeMultiSelect`) | the matching filter module |
| `state.tableData`, `state.history`, `state.loading` | the service of the same name |
| `state.rootLifecycle` | `core/bootstrap/rootLifecycle.js`, driven by `KDB.js` |

The full map is `architecture/stateOwnership.md`. There is **no** `_KDB.api.widgets` or `_KDB.api.filters`: each widget and filter type has its own API. Everyone else **reads through the owner's selectors** and **changes state through the owner's `dispatch` or a service method** (event subscribers and restore included).

```js
var tabId = tabsSelectors.readActiveTabId(_KDB);                                  // read through a selector
_KDB.api.header.dispatch({ type: "header/show", payload: { source: "api" } });    // command to the owner
var rows = _KDB.services.tableData.readRows("pkz");                               // service call
```

State never holds DOM nodes, promises, functions, AbortControllers or Cognos objects. **The Cognos mirror:** some values exist in both KDB state and Cognos (filter selections, the active tab, a widget's visualization); the owner that writes the mirrored value also makes the Cognos call and re-syncs after Cognos-driven changes, and multi-step Cognos updates are mirrored into state only when complete.

---

## 5. Boot, mount and destroy

### 5.1 The manifest and the bootstrap files

- `bootstrap/featureManifest.js` is the **composition root**: `entries` (every `register`, in registration order), `destroyOrder` (feature names), `serviceDestroyOrder` (service keys).
- `bootstrap/registerServices.js` registers the services in a fixed order (`cognosHost`, `chrome`, `tableData`, `loading`, `message`, `widgetBindingPlan`, `widgetBindingApply`, `widgetBinding`, `dashboardPdf`, `history`, the writeback services, `drillthrough`).
- `core/bootstrap/`: `lifecycle.js` (`registerAll`, `mountPhase`, `mountBootModules`, `destroyFeatures`, `destroyServices`), `renderBoundary.js` (boot overlay, cubes dialog, chrome flush, `reportRenderFailure`), `rootLifecycle.js`, `runtimeCore.js`, `getKDBAnchor.js`, `config.js`, `labels.js`, `teardownSteps.js`.

An entry has `name`, `register` (the module's `register<Module>(_KDB)`; **omitted** for the four toolbar buttons `historyControls`, `pdfExportControls`, `wienKiControls`, `shareControls`, which `toolbarControls` publishes), `api` (the `_KDB.api` key to mount and destroy), `mount: { options, phase? }` (default phase `boot`) and `destroy` (custom teardown for entries without an `api`: `properties`, `css`, `homeDialog`). Array order is the **registration order**; the boot mount order is the same order restricted to entries with a `mount` and phase `boot`. A feature missing from `destroyOrder` is never destroyed.

The first ten entries are infrastructure (bootstrap labels, chrome selectors, properties, config, css, `cognosAPI`, **services**, **authoring**, homeDialog, utils); the 24 after them are the features (header first, `nativeMultiSelect` last; `toolbarControls` registers the four toolbar entries; only `widgetVis` has non-empty mount options). Registering creates `_KDB.api.*` and mounts nothing (authoring excepted).

### 5.2 Boot (`KDB.renderKDB`)

1. **Constructor.** Creates `state.rootLifecycle` (`idle`), `runtime.core`, the event bus and empty root namespaces.
2. **Render gate.** `renderKDB` stores its promise; a second call on the same instance returns it and registers and mounts nothing (it warns when `parent` differs; the old code re-mounted onto the new parent, 14.1 item 4). A call after `destroy` returns `false`.
3. **`setupCore`.** Sets `rootLifecycle` to `initializing`, installs `window.top.getKDB`, calls `registerAll`. **Ready gate:** if `KDBReadyToggle` is not `true`, boot stops here.
4. Optional **loading overlay** (`KDBPlayLoadingImageToggle`, mount key `kdb-root-loading-animation-mount`), then the "cubes unavailable" dialog check (`core/homeDialog/`).
5. **`startModules`** mounts the 22 entries with `phase: "boot"` in manifest order: header, footer, tabs, kdbControl, canvas (pageSurface), the four toolbar controls, launchpad, widgetBase, widgetSettings, widgetText, widgetVis, widgetTopN, dragDrop, metricsTree and the five filter owners. **`filterDock` is not mounted here** (`phase: "afterLoading"`).
6. **`scheduleChromeCapabilityFlush`** (right after `startModules`) requests a one-time report of required Cognos selectors that were not found; dock selectors may still be missing then.
7. **`finishDashboardInitialization`.** Sets `rootLifecycle` to `ready`, lifts the overlay, **then** mounts the `afterLoading` phase (`filterDock`; Cognos creates the filter dock only after the overlay is gone), applies read-only chrome for share links and starts a pending URL-share restore.

`_isDisposed` is checked after every `await`: a render that finds the instance destroyed stops with a console warning. Any other failure sets `rootLifecycle` to `error`, lifts the overlay and shows a German alert (`reportRenderFailure`).

### 5.3 Destroy (`KDB.destroy`)

Idempotent; sets `_isDisposed` first. Every step has its own try/catch; the first error is kept and decides `error` versus `disposed`.

1. `destroyFeatures` walks **`destroyOrder`** (not the reverse of mount): `nativeMultiSelect`, `specialSingleSelect`, `sicht`, `dienststelle`, `singleSelect`, `filterDock`, `metricsTree`, `pdfExportControls`, `wienKiControls`, `shareControls`, `pageSurface`, `authoring`, `kdbControl`, `tabs`, `historyControls`, `dragDrop`, `widgetTopN`, `widgetVis`, `widgetText`, `widgetSettings`, `widgetBase`, `launchpad`, `footer`, `header`, then the custom teardowns `properties`, `homeDialog`, `css`.
2. `destroyServices` walks **`serviceDestroyOrder`**: `drillthrough` first (its pending waits hang on a table load, so they are released before `tableData` settles), `writebackBridge`, `writebackSet`, `writebackGet`, `writebackMap`, `dashboardPdf`, `widgetBindingApply`, `history`, `message`, `loading`, `tableData`, and `cognosHost` **last** (consumers still see a live but aborting host). `chrome`, `widgetBindingPlan` and `widgetBinding` have no `destroy`.
3. `clearRuntimeCore` and event bus `dispose()`; `window.top.getKDB` removed (only if this instance owns it); `rootLifecycle` set, then `events`, `services`, `api`, `cognosAPI` set to `null`.

### 5.4 Replay registration and the loading watchdog

**History replay.** There is no central replay list. Each owner builds its handler (`createReplayHandler`) and registers it with the kit's `registerReplayKeys(_KDB, keys, handler)`, which calls `services.history.registerReplayHandler(key, handler)` per key: in the owner's `register` (tabs, filter owners, widgets) or in its `mount` when the handler needs mounted state (header, footer, kdbControl). Handlers are looked up by key, so order does not matter, and the history service's `destroy` clears them. The 18 step keys are in 9.6.

**Loading watchdog.** Every loading overlay arms a timer: default `300000` ms (`WATCHDOG_MS`, `core/services/loadingService/config.js`), overridable with `startLoading({ watchdogMs })` (the PDF export does). When it fires, the service first `finishLoading`s that mount key, then calls every handler registered with `services.loading.registerWatchdogHandler(mountKey, fn)` with `{ title, message, code: "LOADING_WATCHDOG", severity: "warning", mountKey }`. A failing handler is logged, never thrown. Only the boot overlay has one: `core/homeDialog/index.js` registers it for `BOOT_LOADING_MOUNT_KEY` and offers the home dialog.

### 5.5 Lifecycle vocabulary and disposed-state discipline

`lifecycle` fields use only the terms in `.cursor/lifecycleVocabulary.md`: `idle`, `initializing`, `loading`, `ready`, `mounted`, `error` (with `errorCode`, `errorMessage`), `destroying`, `disposed`, `pending`, `committed`. Freshness (`"fresh" | "stale"`) and presence (header and footer `status`: `idle`, `active`, `removed`; widgets `placement`: `onCanvas`, `inLaunchpad`, `removed`) are separate fields. Saved parameter sets read these values, so their spelling never changes.

**Disposed-state discipline (the kit rule).** After `destroy()` public methods should be safe no-ops: `dispatch` returns a failure instead of throwing (`module-public-api.mdc`: `{ ok: false, errorCode: "<MODULE>_DISPOSED" }`), `getState` returns `undefined`, a second `destroy` does nothing, a disposed instance is never revived (`createDisposedGuard`, chapter 8). **Modules vary:** `header.dispatch` returns `false` and `header.getState` returns the live state, whereas `dragDrop.getState` returns `undefined`; check the owner.

---

## 6. The module template

### 6.1 The template

New and refactored modules follow one shape (`feature-structure.mdc`); create only the files with real content.

| File | Holds |
|---|---|
| `index.js` | The module's one export, `register<Module>(_KDB)` (e.g. `registerHeader`; `singleSelect` exports `register`): initialises state and runtime, stamps facets, creates the controller (`mount`, `destroy`, `dispatch`, `getState`), assigns `_KDB.api.<module>`. Called by `bootstrap/featureManifest.js` |
| `state.js` | Action types, initial state and the **pure** reducer (no DOM, Cognos, events, timers or try/catch) |
| `selectors.js` | `read*(_KDB, ...)` functions; the file other modules import |
| `view.js` | DOM build, place and sync from state (or a `view/` folder) |
| `effects.js` | Everything with outside effects: Cognos calls, event emits, history commits, async work |
| `config.js` | Constants, defaults, label keys, selector strings, error codes |
| `history.js`, `restore.js`, `tabMutation.js`, `events.js` | Optional: undo/redo steps and replay handler; the `<module>/parameterSetRestoreRequested` handler; tab move/duplicate/delete participation; names of emitted events |

Flow inside a module: `dispatch(action)` goes to the reducer, which produces the next `_KDB.state.<owner>`; then effects run (DOM sync, Cognos calls, history push, events).

Where the code differs: the published selectors file is `selectors.js` in some modules and `state/selectors.js` in others (`header`, `footer`, `sicht`, `widgetBase`; `singleSelect`, `launchpad`, `kdbControl` have both; `nativeMultiSelect` has none), so check before importing; event-name files are `events.js` (dragDrop) or `events/eventNames.js`; `core/authoring`, `core/homeDialog`, `core/cognosHost` and `core/services/cognosHost` are not on the template; the filter owners build their controller on `_core/ownerController.js` (9.1).

### 6.2 Worked example: `dashboard/header/`

- `index.js`: `registerHeader` initialises `_KDB.state.header`, calls `ensureRuntime(_KDB, "header")` and assigns `_KDB.api.header`. The controller creates `createDisposedGuard("header")`; `mount` resolves the mount target and registers the replay handler; `dispatch` goes to `dispatchHeaderAction`, then `reduceAndRunEffects`: reducer, `_KDB.state.header = next`, `runHeaderEffects`, `pushHeaderHistoryStep`.
- `state.js` (`createInitialHeaderState`, reducer `reduceHeader`; `status` is `idle`, `active` or `removed`), `state/selectors.js` (`readHeaderStatus`), `events/eventNames.js` (`header:confirmedChanged`, the only event emitted), `config.js` (`VALID_SOURCES`, `ERROR_CODES`, labels), `view.js` (`ensureHeaderChrome`, `syncHeaderView`, `removeHeaderChrome`: views read state, never write it).
- `effects.js`: `runHeaderEffects` (view sync, inline edit session `editSession.js`, kdbControl panel sync, event), a boundary with its own try/catch. `history.js`: `pushHeaderHistoryStep` (keys `header_chromeChange`, `header_textChange`), `createHeaderReplayHandler`. `restore.js`: `restoreHeaderParameterSet` (numeric `runId`, rejects stale runs, applies the saved header absolutely, returns diagnostics).

Header has no facet stamps and no tab mutation; for both, read `dashboard/filters/nativeMultiSelect/`; for a large module, `dashboard/tabs/`.

### 6.3 Moving files: no shims

There are **no forwarding shims and no `__orchestrator*` or `__controller` files** any more (removed in Phase 2 W12; `tools/tests/w14-naming.test.mjs` fails on new `__orchestrator*` names). When you move or merge a file other modules import, repoint every importer in the same change (`node tools/check-imports.mjs --json` or grep) and the doc citations (`node tools/check-doc-paths.mjs --suggest`). `feature-structure.mdc` and old contracts still mention shims as history.

### 6.4 Services

A service publishes `_KDB.services.<service>` with **named methods** and no `dispatch`. `core/services/tableData/` is the reference: `index.js` (`registerTableData`) ensures the runtime, stamps four facets (`canvas`, `dataQuery`, `visualization`, `widgets`) and wraps every method in the disposed guard and a boundary try/catch. Pipeline services keep sub-domain folders (`workflows/parameterSet/get`, `set`, `map`); a service may use a reducer internally (`historyService`).

### 6.5 Cross-module rules

- **Read** another module only through its published selectors or `_KDB.api.<m>.getState()`. **Change** it only through `_KDB.api.<m>.dispatch(...)` or a service method.
- **Never** write another module's `_KDB.state` subtree or touch its `_KDB.runtime.<owner>`. A few known reads remain (14.1, item 12); do not add new ones.
- `dispatch` takes `{ type: "<module>/<intent>", payload }`. Action types other modules dispatch (e.g. `<owner>/parameterSetRestoreRequested`) are public: do not rename them. Return values differ by module (`header` a boolean, others a result object).

### 6.6 When to split, and size

One concept per file: aim for at most about 300 to 400 code lines; over 500, check for two concepts; over 800, justify it in a header comment. Functions stay near 60 lines (74 are longer, `tools/function-lengths.mjs`). No folder for fewer than about four files unless it is a named sub-domain; at most three folder levels below a module; no vague names (`helpers`, `common`, `misc`, `manager`, `shared`). Measure with `node tools/line-report.mjs --module <path>`.

---

## 7. The helper kit and other utils

### 7.1 The kit: `core/utils/kit/`

Import the kit by AMD relative path (it is **not** on `_KDB.utils`) instead of writing local copies; each file's header comment documents its API.

| File | Helper | Use it when |
|---|---|---|
| `data.js` | `cloneJson`, `isPlainObject`, `isObjectLike`, `toArray` | Deep copy of plain data (cycles and BigInt throw); type checks |
| `async.js` | `sleep(ms, signal?)`; `pollUntil({ check, timeoutMs, intervalMs, backoff, maxIntervalMs, predicate, signal })` | Abort-aware delay (resolves `true` after the delay, `false` on abort, never rejects); waiting for Cognos or the DOM (needs a timeout, returns `{ ok, ... }`) |
| `runtime.js` | `ensureRuntime(_KDB, owner, defaults?)`, `ensureRuntimeBuckets(rt)` | At registration: get or create `_KDB.runtime.<owner>` and its standard buckets without replacing it |
| | `disposeRuntimeBuckets(rt)` | In `destroy`: aborts controllers, unsubscribes, removes listeners, disconnects observers, cancels timers; returns errors instead of throwing |
| | `addListener`, `scheduleTimeout`, `scheduleFrame`, `clearTimer`, `cancelTimer`, `readTabsBusy(_KDB, keys?)` | Listeners, timers and frames that cleanup removes; is a tab traverse, startup or mutation in flight |
| `errors.js` | `createDisposedGuard(label)`, `codedError(code, message?, extra?)` | `{ isDisposed, dispose, blocked(method) }` (warns once per method after destroy); errors that carry a code |
| `history.js` | `pushHistoryStep(_KDB, step, options?)`, `createReplayHandler(applyByKey)`, `registerReplayKeys(_KDB, keys, handler)` | Pushing an undo step (no-op during replay or with `skipHistory`); building a replay handler; registering it with the history service (returns an unregister function) |

### 7.2 Other utils

`core/utils/` holds pure helpers. Six are published on `_KDB.utils` by `registerUtils.js`: `convertUnitToPx`, `getTableConfigObject`, `readCurrentTab`, `waitFor`, `waitForElObserver`, `readableTextColorForHex`. Others are imported by path: `readHostFacet.js` (3.2), `readRightFlag.js`, `tabSlots.js` (`listDashboardSlots`, `matchTabScope`, `MAX_USER_TABS`), `buildWidgetObject.js`, and `orgTree/` (the one Dienststelle hierarchy implementation, used by dienststelle and drill-through). `core/utils/filters/tabMutationRun/` is the filter owners' run-guard and snapshot machinery.

---

## 8. Lifecycle and teardown in practice

Every long-lived thing has an owner and a cleanup path in `destroy` (see `dashboard/header/index.js`: `guard.dispose()` first so in-flight callbacks stop, then view cleanup, then `disposeRuntimeBuckets(rt)`, in one boundary try/catch). Full rules: `.cursor/rules/runtime.mdc` and `error-handling.mdc`. The ones that bite most:

- **`ensureRuntime`, never `_KDB.runtime.<owner> = {...}`**: a wholesale replacement erases facet stamps and the standard buckets (`domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`). **Dispose first.**
- **Listeners and timers** go through `addListener` / `scheduleTimeout` / `scheduleFrame`, or `{ signal }` from one `AbortController` per scope (`_KDB.events.subscribe(name, handler, { signal })` too).
- **Async work** takes `_KDB`, arguments and an `AbortSignal`; check `signal.aborted` after every `await`, drop stale results, give every wait a timeout.
- **`try/catch` only at boundaries** (Cognos hooks, public API entry points, DOM/timer/observer callbacks, fire-and-forget async). The boundary logs once, `console.error("[module.boundary] what failed", context, err)`, and turns the error into state (`lifecycle: "error"`, `errorCode`), `{ ok: false, errorCode }` or a fact-event; never log and rethrow. Error codes are `MODULE_WHAT`.
- **Replay handlers** are built in `history.js`, kept as `_KDB.runtime.<owner>.historyReplayHandlerContribution`, registered with `registerReplayKeys` (5.4) and called with `(_KDB, targetValue, step, ctx)`; replay actions carry `isHistoryReplay: true` so nothing new is pushed.
- **DOM:** selectors in `config.js`, live nodes in `rt.domRefs` (valid for one render cycle), `textContent` for user and data text.

---

## 9. Data flow per feature

A path starting with a module name (e.g. `singleSelect/commit/commitSelection.js`) lives under that module's group folder: `dashboard/filters/`, `dashboard/widgets/`, `dashboard/canvas/`, `dashboard/controls/`, `dashboard/`, `core/services/` or `workflows/`. Commands are dispatches `_KDB.api.<owner>.dispatch({ type: "<owner>/<intent>", payload })`.

### 9.1 Filters

- `filterDock` owns the Cognos filter dock DOM (click capture, popup observation). It **never writes filter values**: it hands interactions to the owning filter (`ownerRouter.js`).
- `singleSelect` writes and verifies values in Cognos for the single-select family (`hostFilterIo.js`, `commit/commitSelection.js`) through its stamped `filters` facet. `sicht` and `specialSingleSelect` (Sicht; rights-gated special filters) own semantic state and delegate dock interaction and the Cognos commit to `singleSelect`, told back via `singleSelect/commit/ownerNotify.js`.
- `dienststelle` owns the hierarchy and writes Cognos itself (`effects/hostScope/`). `nativeMultiSelect` covers native multi-selects no custom filter owns (`commit.js`, `hostFilterIo.js`).

Routing is declared in `filterDock/ownerRoutes.js` (`OWNER_ROUTE_MAP`); `filterDock/identity.js` `resolveFilterType` classifies a dock filter from `_KDB.properties.filterPropObj`. Instance ids come from `singleSelect/state/instance.js` `buildFilterInstanceId`: prefix `g` (global) or `p` (page context), then `|s=<scope>`, then `|i=<itemId>` or, without itemId, `|l=<label>`; on the first click the id is often still `null` and is bound after the inventory reconcile (`singleSelect/inventory/`).

**The filter owner kit (`dashboard/filters/_core/`)** replaces the copies the five owners once had:

- `ownerController.js`: the `mount`/`destroy`/`dispatch`/`getState` skeleton (`createOwnerController`); all five owners.
- `dockHandoff.js`: `mapDockHandoff(handoff, profile)`, one normalisation of dock handoffs, each consumer passing a `HANDOFF_PROFILE`; used by `singleSelect`, `sicht` and `specialSingleSelect` (`delegation.js`) and `dienststelle` (`effects/dispatchRoute.js`), not by `nativeMultiSelect` (its dock confirm is in `commit.js`).
- `filterDefinitions.js`, `ownerPolicy.js`: reading `filterPropObj`; inventory classification, native claim rules.
- `parameterSetRun.js`: `claimParameterSetRun`, `isStaleParameterSetRun` (restore paths).
- `tableDataWatcher.js`: `watchTableData` (`sicht`, `specialSingleSelect`, `dienststelle`).
- `tabMutation.js`, `tabMutationScopes.js`: shared prepare/apply/restore/resync runners (`TABS_MUTATION_*` codes, snapshot ledger) for `singleSelect`, `nativeMultiSelect`, `dienststelle`; scope-id resolution for tab slots (the last two).

**`filters:confirmed`.** After a user commit or an undo replay, `singleSelect` (`commit/commitSelection.js`, `historyReplay.js`) and `nativeMultiSelect` (`commit.js`, `history.js`) call `emitConfirmed` from `core/events/filters.js`; payload `{ filterType, scopeType, tabId?, scopeId?, columnId?, confirmedValues? }`. Sicht never emits it. The only consumer is `widgetVis/topN/filtersConfirmed.js` (subscribed at widgetVis mount); no filter owner imports widgetVis.

**(a) A user confirms a single-select filter in the dock**

1. `filterDock/interaction/dockClick.js` `onDockClick`: `clickInteraction.resolveClickInteraction` classifies the click; `ownerRouter.dispatchHandoffToOwner(..., "stateChanged")` sends `<apiKey>/filterDockStateChanged` to the routed owner (Sicht and special filters forward it to `singleSelect` via `delegation.js`).
2. `singleSelect/dockHandoff/handoff.js` `processFilterDockHandoff` maps the handoff through the kit, binds it to an instance (`routeInteraction.js` `resolveInteractionInstance`) and calls `commit/commitSelection.js` `commitConfirmedSelection`.
3. `hostFilterIo.writeValues` and `verifySelection` via `runtime.singleSelect.filtersFacet`; on failure the previous selection is restored, or the owner state is flagged uncertain when rollback cannot be verified.
4. `ownerNotify.notifyOwnerCommit` tells Sicht or the special filter (`sicht/singleSelectCommitted`, `specialSingleSelect/userSelectionCommitted`); `state/selection.js` `applyConfirmedState` updates `state.filters.singleSelect`; the undo step `filter_singleSelect` is pushed; `filters:confirmed` is emitted. (Later and separately, `filterDock/observation/ownerResync.js` tells owners to re-sync their custom label.)

**(b) A Sicht change drives Dienststelle.** Steps 1 to 3 of (a) run with Sicht as owner. `sicht/commit.js` `commitConfirmedSicht` writes state, notifies `specialSingleSelect/sichtChanged`, then `dienststelle/sichtChanged` (skipped on undo replay), then pushes history (`filter_sicht`). `dienststelle/effects/sichtSync.js` `syncFromSicht` clears the inactive variant (BW or DEZPV), applies the `SICHT_CHANGED` patch and runs `effects/reconcile/runReconcile.js` `reconcileConfirmed` (host scope apply or clear in `effects/hostScope/`);

**(c) TopN wave.** Charts with a non-default TopN must be re-ranked when a Jahr or Stichtag context changes. `filters:confirmed` reaches `widgetVis/topN/filtersConfirmed.js`, which builds the request (`topN/waveRequest.js`) and starts `topN/wave.js` `runTopNFilterConfirmWave` **fire-and-forget**: a failure is logged and never fails the commit. The wave rebinds every on-canvas visualization with a non-default TopN (optionally pinning the period, `topN/periodPin.js`) and releases each helper claim after its bind; for a hidden tab it waits in `runtime.widgetVis.pendingTopNWavesByTab`.

**Tab mutation in the owners.** The kit runs the lifecycle order; owners differ in what they snapshot: `singleSelect` per `filterInstanceId` (`tabMutation/prepare.js`, own `guard.js`, `transfers.js`), `nativeMultiSelect` per scope (`tabMutation/snapshot.js`, `apply.js`, `hostScopes.js`), `dienststelle` in one `tabMutation.js`. `sicht` and `specialSingleSelect` have no handlers: their state travels with the `singleSelect` instances.

### 9.2 Widgets

`widgetBase` owns the **frame** (kind, placement, layout, tab); `widgetSettings` the **committed settings** and gear panel; `widgetVis` the **derived and render state** (title, drill-through, maximize); `widgetTopN` the hidden helper; `widgetText` the text. A **`datatable` frame** (a List widget on the canvas) is a passive shell without a content owner, like `other` and `topN` frames. The `widgetDataTable` module is gone (W12); saved sets with `tbl` widgets still load and those widgets are skipped on restore by design. Per-vis-type gear availability is `visTypeRules.supportsDimension` (TopN follows the dimension). Prognose is false; `stampPanelState` then sets `data-kdb-dimension="off"` (`widgetSettings/config/selectors.js` `panelDimensionAttr`) on the live gear and the focus clone so CSS hides Dimension and TopN without naming the vis type. A switch or restore onto Prognose commits both controls to Ohne (`"none"`). Undo of that switch restores the previous vis type together with the dimension and TopN captured on the history frame, through one `widgetVis/applyVisType` bind (TopN helper included); redo applies Prognose and clears both controls to Ohne again.

**(a) Dropping a Kennzahl creates a bound widget**

1. `metricsTree/dragSource.js` starts a drag session (`_KDB.api.dragDrop.startDrag`). On drop, `canvas/dragDrop/dropboxes/publish.js` `publishValidatedDrop` validates and emits `canvas:dropValidated`; dragDrop never creates widgets.
2. `widgetBase/index.js` `startDropCreate` dispatches `widgetBase/dropCreate` (`canvas.js`). `launchpadRoute.js` (`resolveClaimedWidget`) takes a widget from the launchpad pool; `view/placement.js` `placeWidgetOnCanvas` and `effects.js` `applyWidgetLayout` place it. When no launchpad widget is free, `dropCreate` fails and `startDropCreate` calls `notifyPadExhausted`.
3. `effects.js` `dispatchContentCreate` sends `widgetVis/contentCreate` or `widgetText/contentCreate` by kind; `canvas.js` `finalizeDrop` pushes `widget_canvasDrop`; `widgetSettings/placeControls` attaches the gear panel; default settings lead to `widgetVis/applyStartupSettings` and pipeline (b).

**(b) The binding pipeline (every settings change)**

1. A gear-panel click calls `widgetSettings/effects/dispatchWidgetSettingsIntent.js` `executeIntent`; `KIND_TABLE` (`widgetSettings/config.js`) and `intent/descriptor.js` map the intent to a target action such as `widgetVis/applyDimension`, with the full settings snapshot (`intent/downstream.js`).
2. `widgetVis/settings.js` calls `widgetVis/binding/pipeline.js` `runBindingPipeline`. Prerequisites: Dienststelle context (`binding/gates.js`) and, for non-default TopN, `topN/gate.js` (dispatches `widgetTopN/resolveRequested`, waits for `widgetVis/topNResolved`).
3. `binding/spec.js` `buildBindingSpec` assembles metric, settings, Dienststelle snapshot, grain overlay, slot and filter specs from `_KDB.config.visualizations.bindingSpecs` (single source `core/config/visualizations/`: `definitions.js`, `bindingSpecsVisTypes.js`, `bindingSpecsGrain.js`, `visTypeRules.js`, `topNHelper.js`) and the TopN helper result.
4. `_KDB.services.widgetBinding.run(spec, opts)` calls `widgetBindingPlan.buildPlan(spec)` (**pure**), then `widgetBindingApply.applyBinding(plan, { target, signal, ... })`, which applies the plan to Cognos as one coherent update; the TopN helper binding uses the same entry. The 13 step ids in `APPLY_STEPS` (`core/services/widgetBindingApply/applyBindingPlan.js`; `readCurrentVisType`, `setDatasourceInitial`, `setVisType`, `clearSlotsAndFilters`, `setDatasourceAfterClear`, `applySlots`, `removeManagedFilters`, `applyLocalFilters`, `applyTopBottom`, `armRenderWait`, `renderWidget`, `waitRenderComplete`, `buildSuccessResult`) are part of the diagnostics contract; `validateInputs` runs first (a signal without `addEventListener` is rejected).
5. `binding/applyResult.js` records derived state; `render/postRender.js` syncs title, drill-through and maximize icon; the settings step is pushed to history (`widgetSettings_optionSelect`) once, when the user action is complete.

**(c) The hidden TopN helper.** A chart cannot rank itself, so `widgetTopN` borrows a hidden Cognos List widget from the launchpad pool (`helperClaim.js`: only `widgetTopN` claims and releases; also `helperPlacement.js`, `helperBinding.js`, `helperSpec.js`, `extractTopNResult.js`, `cleanup.js` with `releaseClaim: true`). A default TopN skips the helper (`core/config/visualizations/topNHelper.js`). BottomN is the same path: dropdown keys `bottom-10` … `bottom-1` (labels `Letzte-10` … `Letzte-1`) pick Cognos `bottomcount` instead of `topcount` in `core/services/widgetBindingPlan/slots/buildSlotPlan.js` `addTopBottomOption`; no separate helper, flow or state. The gear-panel list is Ohne, Top-10…Top-1, then Letzte-10…Letzte-1 (dashed CSS lines after Ohne and Top-1). **Where the helper lives:** at rest it sits in its slot of the `topN` pad (`#KDB_topNPad`, inside the launchpad's `#KDB_HideSpot`). For the bind and the read only, `helperPlacement.js` moves its shell beside the owner chart and records a **placement lease** (`byOwner[ownerId].helperPlacement`, the slot as launchpad attributes); every exit of the op (success, error, abort) puts the helper back into that slot, but only the op that holds the lease does so. The post-resolution cleanup then clears the binding in the slot, without delaying the owner chart. If the slot is gone at restore time the helper goes to another slot of the same pad and tab, and once the cleanup has settled a helper found outside every slot (and not on loan or claimed by another owner) is parked again (`parkStrayHelper`). There is no debug or inspection switch: the helper never stays on the canvas on purpose, and a reload finds it in its slot (startup discovery routes an untitled stray LIST back into the `topN` pad).

**(d) Removing a widget.** `widgetBase/remove` triggers `widgetVis/disposeWidgetRuntime` (`reason: "remove"`), `widgetSettings/cleanupWidgetControls` and the shell detach; `dispatchWidgetTopNCleanup` then releases the helper claim (not awaited). Nothing in the app dispatches `widgetBase/remove` today: the settings-panel Delete and a tab delete **park** the chart in the launchpad and keep its claim (14.1, item 5).

### 9.3 Tabs

Cognos offers a **fixed set of tab slots**. KDB never adds or removes Cognos tabs; it shows or hides slots (default: 5 user tabs plus one helper tab, `core/config/dashboardSettings.js` `tabs`). "Moving" or "deleting" a tab means **permuting content across the fixed slots** and updating names and visibility. *Physical index* = the Cognos slot (`state.tabs.byIndex` key); *tabIdx* = position in the dashboard slot list (used by writeback); *tabId / pageId* = KDB tab identity versus the Cognos page element id. Shared slot rules: `core/utils/tabSlots.js`; shared vocabulary: `core/events/tabs.js` (`EVENTS`, `ACTIONS`; `tabs/events/eventNames.js` re-exports `EVENTS` only).

An observer mirrors the active tab from Cognos (`tabs/observe.js` commits `tabs/activeTabObserved`); others follow `tabs:changed` and `tabs:activationStarted`. Rename (`tabs/rename`) is not part of the saga; `tabs/reorder` is unsupported.

**Tab mutation saga (delete, duplicate, move, restore a deleted tab)**

1. `tabs/editUi/confirm.js` dispatches `tabs/delete`, `tabs/duplicate`, `tabs/move` or `tabs/restoreDeleted`; `tabs/tabMutation/actions.js` `routeTabMutationAction` admits **one run at a time** (`runtime.tabs.pendingPromises.tabMutation`).
2. `tabMutation/plans.js` builds the plan (delete: `slotMoves` shift content left, the last visible slot is hidden, a landing tab is chosen); visible slots stay a contiguous prefix.
3. `tabMutation/saga.js` `runTabMutationSaga` (owner dispatches in `owners.js`): make every affected slot ready (traverse, widgetBase routes its widgets), resolve filter scope targets, ask each owner in `mutationOwners.PREPARE_OWNERS` (`widgetBase`, `singleSelect`, `dienststelle`, `nativeMultiSelect`; `tabs/config.js`) to **prepare** (snapshot), then **apply**: the three filter owners, then `widgetBase/applyTabMutation`.
4. Reducer `tabs/tabMutationApply` (`tabMutation/reduce.js`) permutes content over `plan.slotMoves` (the commit). `applyToCognos` renames the Cognos tabs, syncs the DOM and traverses to the landing tab; the filter owners **resync** with the host; `tabs:changed` is emitted; `history.pushTabMutationHistoryStep` pushes the undo step (not during replay).
5. A failure before the commit rolls the owners back and returns to the original tab; an incomplete rollback makes the outcome `degraded` (`TABS_MUTATION_ROLLBACK_INCOMPLETE`; others: `applied`, `aborted`, `failed`). A `finally` always clears the snapshots.

**Slot stock.** The widget part of prepare, apply and rollback is an engine owned by tabs (`tabs/tabMutation/slotStock/`: `prepare.js`, `apply.js`, `rollback.js`, `ledger.js`), written against an injected **port** that `widgetBase/slotStock/` builds per dispatch (`port.js`, `serialize.js`, `placeEntries.js`, `fillContent.js`; entry `tabMutationOwner.js`). The engine never touches widgetBase state; its rollback data lives in `_KDB.runtime.tabs.slotStock` (`{ snapshots, runId }`), which the saga releases. A tab holding a widget kind other than `vis` or `text` (e.g. a `datatable` frame) makes prepare fail (`findUnsupported`). 

### 9.4 Parameter sets and share links (`workflows/parameterSet/`)

A **parameter set** is the saved snapshot of a dashboard as compact JSON. The external Cognos "writeback" extension saves and loads it through two functions KDB publishes on `window.top` (`bridge/hostGlobals.js`, installed by `registerWriteback`; `services.writebackBridge.uninstall()` removes them): `WBParameterGetFunction` and `WBParameterSetFunction`. These and the saved formats are frozen. `workflows/parameterSet/index.js` registers `writebackGet`, `writebackSet`, `writebackMap` and `writebackBridge`; paths in this section are relative to that folder.

**The v3 format** (`schema/v3Defaults.js`). Keys are descriptive and at most five characters; an omitted key means "owner default": `v`, `pkg` (schema version `3`; package key from `core/config/mapping/parameterMap.js`); `canv`, `sett` (canvas and kdbControl settings; unknown `sett` keys are invalid); `head`, `foot` (header `on`, `title`, `sub`, `subOn`, `icon`; footer `on`); `filt` (filter selections by family, global and page scope); `tabs` (names, visibility, order); `wgts` (widgets: `tab`, `x`, `y`, `w`, `h`, `kind`; kinds `vis` and `txt` supported, `tbl` and `topn` reserved).

**Save (GET).** `WBParameterGetFunction` calls `bridgeGet` (`cognosWritebackBridge.js`), then `writebackGet.collect({ source: "bridge" })`: resolve the package key, run the collectors in order (`get/runWritebackGetCollectors.js`): `canvasSettings`, `headerFooter`, `tabs`, `filters`, `widgets`. If any collector fails, **the save is aborted** and the user alerted; a partial payload is never persisted. Then `schema/normalizeV3.js` and `schema/validateV3.js` (invalid aborts). `get/persist/persistLanding.js` lands the UI under a loading overlay; the bridge returns `JSON.stringify(v3)`.

**Load (SET).** `WBParameterSetFunction(raw, status)` runs `bridge/runBridgeSetRestore.js` (asks to discard unsaved changes, never rejects into Cognos). `status` is `notDefaultParamSet`, `default` (and legacy spellings) or `newDashboard`, which calls `restore(null, status)` without format detection.

1. **Format detection.** `schema/detectSourceFormat.js` classifies `v3`, `v2` (KDB2 legacy shape) or unknown. `writebackMap.toV3` converts v2 (`map/adapters/mapV2ToV3.js` and helpers, KID token remapping via `core/config/mapping/`).
2. **`writebackSet.restore(v3, status, options)`** (`set/createWritebackSetService.js`). Default loads wait until `state.rootLifecycle` is `ready` and are skipped when the URL carries a `parameterId`. **Overlap:** a default load while any restore is in flight is rejected (`WRITEBACK_RESTORE_CANCELLED`); a later non-default load sets `cancelRequested` on the running one, waits for it to settle, then starts. `allocateRestoreRunId()` hands out run ids (shared with tab duplicate guards).
3. `set/effects/executeRestoreRun.js`: loading overlay, then **`history.beginWritebackRestore({ runId })` before any owner dispatch** (history commits are blocked, so restore creates no undo steps). `newDashboard` runs `runNewDashboardReset` instead.
4. `set/effects/runNormalRestore.js` dispatches to owners with `source: "writebackSet"`, a `runId` and `skipHistory: true` (`dispatchOwnerPhase.js`; the special single-select sync does not force it). The phase names are the durable contract (`RESTORE_PHASE_NAMES`, 31 names), in this order:
   `status`, `validate`, `historyBegin`, `newDashboardReset`, `widgetReset`, `kdbControlRestore`, `headerRestore`, `footerRestore`, `tabsRestore`, `tabTargetResolve`, `filterScopeResolve`, `singleSelectPreRestoreReconcile`, `filterClear`, `sichtRestore`, `singleSelectGlobalRestore`, `tabActivateForPageContext`, `singleSelectPageContextRestore`, `nativeMultiSelectRestore`, `sichtDownstreamVisibility`, `dienststelleRestore`, `singleSelectResync`, `specialSingleSelectRestoreSync`, `tabActivateForWidgets`, `tabWidgetsEnsureRouted`, `widgetBaseRestore`, `widgetSettingsRestore`, `widgetTextRestore`, `widgetVisBinding`, `tabsPostRestoreTraverse`, `historyFinish`, `cleanup`.

   **Always required:** `widgetReset` (parks all widgets, fans out reset) and `kdbControlRestore`. **Always dispatched:** `headerRestore` and `footerRestore` (`required` only when `head` / `foot` exist; an omitted section **hides** the header or footer). **Only if the section is present:** `tabs` gives `tabsRestore`; `filt` gives the filter phases (`set/effects/filters/runFilterRestore.js`: target resolve, reconcile, clear, Sicht, `singleSelect` global and page context, `nativeMultiSelect` only if `pcfs`, Dienststelle, then always `singleSelectResync` and the special sync); `wgts` gives tab activation and routing, `widgetBase`, `widgetSettings`, `widgetText` (only if a `txt` widget exists) and vis binding per active tab (`runWidgetRestore.js`, `bindVisPerActiveTab.js`); `tabs` or `wgts` gives the post-restore traverse. A missing `tabs`, `filt` or `wgts` section means "leave the owner as it is". Those files are the truth, not `contracts/writeback.md`.
5. Cleanup calls `history.finishWritebackRestore`: the restored state becomes the **undo baseline**; undo cannot pass a loaded set.

**Compatibility.** Saved v2 and v3 sets must keep loading; never rename a v3 key or an owner restore action type. Golden tests pin this (`tools/tests/ws-c-writeback-map.test.mjs`, `ws-c-restore-contract.test.mjs`).

**Share links.** `controls/toolbarControls/shareButton.js` `onShareClick` reads the selected parameter set (`services.writebackBridge.readSelectedParameterSet`), then the dashboard's live content path: the `dashboard` facet's `getPathRef` (the inner ring converts `getDashboardInfo().searchPath`, e.g. `/content/folder[@name='A']/exploration[@name='B']`, into `.public_folders/A/B`), else `pathRef` from the current URL (`toolbarControls/readUrlPathRef.js`); without a path it shows a German alert and offers no link. `shareLink.js` `openShareCopyDialog` shows two links (edit and Nur Lesen) of the native Cognos form `<…/cognos/bi/>?perspective=dashboard&pathRef=…&action=view&mode=dashboard[&subView=…]&nav_filter=true[&parameterId=…]&parameterLabel=…[&readOnly=1]`. Never the dashboard `id`/`objRef` or a `#` link: those fail a cold open in Cognos Glass (`getAccountInfo is not a function`) unless the dashboard was opened through the menu that day. Law: `contracts/shareControls-pathRef-link-contractdelta.md`. Inbound, the link's `parameterId` is read from the query or hash (`urlShare/readUrlParameterId.js`); boot restores that set (`urlShare/whenUrlShareRestoreSettled.js`) and `shareControls.applyReadOnlyChrome` makes the chrome read-only for `readOnly=1`.

### 9.5 PDF export (`workflows/pdfExport/`)

`controls/toolbarControls/pdfButton.js` `runExport` calls `_KDB.services.dashboardPdf.exportDashboardPdf({ signal, onProgress })`. `workflows/pdfExport/index.js` starts a run session (`session.js`: loading overlay with its own `watchdogMs`, KDB chrome hidden); `vendors.js` loads jsPDF and html2canvas on demand. `exportRun.js` `runDashboardPdfExport` builds the manifest of visible tabs, exits focus mode, builds attachment rows (`attachment/`), renders the title page, captures one screenshot per tab (`capture/captureTabPage.js`), renders attachment pages and saves; a `finally` restores the original tab and focus mode. One export runs at a time; expected failures return `{ ok: false, errorCode, errorMessage }`.

### 9.6 Undo and redo

Features push **steps** `{ key, old, new }` through the kit (`pushHistoryStep`) after a completed user action. `core/services/historyService/` keeps the stack in memory only (limit 5), rejects steps whose `old` equals `new` and steps during a writeback restore. `toolbarControls/historyButton.js` calls `_KDB.services.history.undo()` / `.redo()`. The service calls the handler registered for `step.key`, `handler.apply(_KDB, step.old | step.new, step, { direction })`; only a strict `true` counts as success, otherwise the user sees a German message and history stays put. The handler dispatches the inverse action with `isHistoryReplay: true`, so nothing new is pushed. The 18 step keys (stable names) by registering owner (5.4) are:

`header`: `header_chromeChange`, `header_textChange`; `footer`: `footer_chromeChange`; `kdbControl`: `kdbControl_settingsChange`; `tabs`: `tabs_move`, `tabs_delete`, `tabs_duplicate`, `tabs_rename`; `singleSelect`, `sicht`, `dienststelle`, `nativeMultiSelect`: `filter_singleSelect`, `filter_sicht`, `filter_dienststelle`, `filter_nativeMultiSelect`; `widgetBase`: `widget_canvasDrop`, `widget_launchpadTransfer`, `widget_layoutMove`, `widget_layoutResize`; `widgetSettings`: `widgetSettings_optionSelect`; `widgetText`: `widget_textEdit`.

`widget_removed` is pushed (`widgetBase/canvas.js`) but has **no replay handler** (14.1, item 6).

### 9.7 Table loading and events

**Tables.** KDB "tables" are hidden Cognos list or hierarchy widgets listed in `loadingTablesPropObj`. `tableData.registerConfiguredLoads` resolves each live widget by **title = configured table name** (`resolveTableWidgetId.js`), reads the result through the `dataQuery` facet (`queryRead.js`), caches rows in `state.tableData.<name>` (`lifecycle`, `freshness`) and emits `tableData:loadFinished` or `tableData:loadFailed`. `readRows` is a pure cache read; `waitForRows` waits for a load in flight; `reloadTable` forces a load; `ensureFreshRows` reloads when not ready or stale.

**Events.** The bus is synchronous and one-way; a throwing handler is logged and does not stop others. Events carry facts: `tabs:changed`, `tabs:activationStarted`, `tableData:loadFinished`, `tableData:loadFailed`, `authoring:entered`, `authoring:exited`, `canvas:dropValidated`, `history:changed`, `header:confirmedChanged`, `filters:confirmed`. Shared vocabulary sits in `core/events/` (`tabs.js`, `filters.js`, `authoringMode.js`); `tabs:renamed`, `tabs:traversed` and `tabs:error` are declared there but never emitted; `architecture/eventSubscribe.md` may lag, so check the emitter's `events.js` or `events/eventNames.js`. Restore and tab mutation are direct-dispatch sagas. Event names are frozen.

---

## 10. Naming conventions and project rules

### 10.1 Conventions in short

- English everywhere except user-facing strings (`_KDB.config.labels.de.<module>`) and domain nouns (`dienststelle`, `sicht`, `kennzahl`, `stichtag`, `jahr`); no German or Dutch technical words in identifiers (gate: `w14-naming.test.mjs`).
- `camelCase` functions and variables, `UPPER_SNAKE_CASE` constants, `PascalCase` constructors; functions are verb plus noun (`readActiveTabId`); booleans `is*`, `has*`, `can*`, `should*`, `did*`. Imported bindings and received parameters carry a leading underscore (`_KDB`, `_tabsSelectors`).
- Action types `<module>/<intent>`; events `<region>:<entityVerbPast>` (requests `...Requested`); error codes `MODULE_WHAT`.
- New CSS classes use `kebab-case` with the `kdb-` prefix; existing `KDB_*` classes and ids stay until a CSS pass renames them with their JS uses (14.1, item 9). Persisted keys and values keep their spelling even where it breaks these rules (e.g. the `kdbControl/framework/*` action types).

### 10.2 The rule files (`.cursor/rules/*.mdc`)

Eleven files, written for AI assistants but the most precise statement of the conventions; `core.mdc` is always applied, the others load for matching files.

| File | Covers |
|---|---|
| `core.mdc` | Frozen contract, layers, namespaces, one writer, Cognos rings, API shapes, size, boundaries, PR checklist |
| `feature-structure.mdc` | Module template, `index.js` skeleton, folder depth, no forwarders |
| `module-public-api.mdc` | `{ mount, destroy, dispatch, getState }` vs service methods; disposed guard; `tableData` read contract |
| `state.mdc` | State vs runtime/config/properties; canonical writers; lifecycle, freshness, Cognos mirror |
| `runtime.mdc` | Runtime buckets, kit cleanup, AbortController and `{ signal }` hygiene |
| `events.mdc` | API call vs fact-event vs request-event; naming, constants, catalogue |
| `error-handling.mdc` | Boundaries, no log-and-rethrow, error codes, Outcome results, abort handling |
| `dom.mdc` | Selectors in config, refs in runtime, scoped queries, safe HTML, CSS naming |
| `cognos-adapter.mdc` | The three rings, stamps, Outcome, no partial widget updates, exceptions |
| `naming.mdc` | Identifiers, files, folders, actions, booleans, language |
| `amd.mdc` | One `define` per file, relative `.js` dependencies, no ES modules or CommonJS |

`AGENTS.md` is the short entry point for coding agents; `architecture/projectStructureRules.md` the human-readable summary; `architecture/conventions.md` ends with the "Final layout" table. Some lines are stale (14.1, item 17).

### 10.3 The frozen external contract

Do not change these without a written note in the pull request (what, why, how old saved sets and settings keep working) and explicit review:

- `KDB3/spec.json` and the entry points (`KDB.js` render and destroy, `window.top.getKDB`, `WBParameterGetFunction`, `WBParameterSetFunction`);
- parameter sets (v2 and v3 keep loading, the v3 shape stays), property and settings formats, persisted keys and values;
- public names: `_KDB.api.*` and `_KDB.services.*` methods, event names; also stable: action types other modules dispatch, `_KDB.runtime.<owner>.<x>Facet` stamps, restore phase names, history step keys, import paths of published selectors and event-name files.

---

## 11. Tools and checks

All tools live in `tools/` (repository root), need Node 22 or newer, have no npm dependencies and run from the repository root.

**`node tools/check-all.mjs [--verbose]` must pass before merge.** Four checks, one PASS/FAIL line each (about 19 seconds, mostly the tests); it does **not** run `line-report`.

| Check | Command | Fails when |
|---|---|---|
| 1. Syntax | `node tools/check-syntax.mjs` | A `.js` file under `KDB3/js` does not parse |
| 2. Imports and layering | `node tools/check-imports.mjs [--json]` | A broken relative path, a dependency id without `.js`, a cycle, an **orphan** (unreachable from `KDB.js` or `spec.json`, not in `tools/orphan-allowlist.txt`) or a **layering violation** (3.1); `workflows -> dashboard` edges are only reported. `--json` lists cross-module imports, useful before a move |
| 3. Doc paths | `node tools/check-doc-paths.mjs [--suggest] [--fix]` | A living doc (`contracts/*.md`, `architecture/*.md`, `.cursor/rules`, `AGENTS.md`, `README.md`, `tools/*.md`, `KDB3/images/README.md`; not `_archive/` or `futureTodo/`) cites a path under `KDB3/js/{dashboard,core,workflows,bootstrap}/` or `tools/` that does not exist. `--fix` rewrites docs only |
| 4. Tests | `node --test tools/tests/*.test.mjs` | Any of the 132 test files fails |

**Other tools (not in `check-all`):** `node tools/line-report.mjs [--module <prefix>] [--top N]` (files over 400, 500, 800 code lines, lines over 180 characters, per-module totals; never fails on size); `function-lengths.mjs` (named functions over 60 lines); `german-identifiers.mjs [--domain]` (German or Dutch technical words in identifiers, must be zero; enforced by `w14-naming.test.mjs`); `w13-guards.mjs inventory [--out f] | remove [--apply] | proof --out f` (`typeof x === "function"` guards; `remove --apply` rewrites JS); `x4-clone-bench.mjs` (JSON clone cost of the Dienststelle broadcast and TopN wave). Support: `tools/lib/` (`amd-graph.mjs`, `amd-loader.mjs`, `layering.mjs`), `orphan-allowlist.txt`, `doc-paths-allowlist.txt` (empty).

**Tests** (`tools/tests/`, `lib/`, `fixtures/`) are named by what they pin: `w1` to `w14` and `x1` to `x4` (Phase 2 waves), `ws-a*` to `ws-o*` (Phase 1 workstreams: `ws-a` Cognos layers, `ws-c` writeback, `ws-d` services), `filterOwner*` (owner kit), plus per-module files. Golden files (`*.golden.json`, `*.snapshot.json`, `*.expected.json`) pin writeback mapping, binding plans, the drill-through URL, PDF export, restore outcomes and filter classification; change one on purpose only with a reason in the PR. Pure AMD modules load in a test through `loadAmd(absPath, { stubs, modules, overrides })` (`tools/lib/amd-loader.mjs`); code touching the DOM or Cognos at load time cannot.

**There is no Cognos runtime in CI.** Everything that talks to Cognos (facets, chrome selectors, filter dock, binding, tabs, writeback, PDF, live mount and destroy timing) is verified **by hand**; tests cover logic with stubs.

**Manual smoke checklist** (`tools/smoke-checklist.md`): "expected" means "same as the baseline" (`main` before your change). Headings: `0) Setup` (deploy, reference dashboard, baseline sets A in v3 and B in v2; the only v2 sample is `oude parameterset.txt` at the repo root), `1) Boot core smoke [CORE]` (about 10 minutes, after EVERY merge), `2) Phase 0 specific checks`, `3) Per-area sections` (`WS-A` to `WS-P`), `4) Leak and performance checks`, `5) How to report a failure`, then the unnumbered `WS-K filterDock`, `6) WS-K metricsTree`, `7) WS-H singleSelect + nativeMultiSelect` and `8) Phase 2` with one `### P2-...` block per wave (`P2-W1` to `P2-W14`, `P2-X1` to `P2-X4`; the highest Cognos priority, 14.1).

---

## 12. How to ...

### 12.1 Add a feature module

1. Create `dashboard/<area>/<module>/` with `index.js` returning `register<Module>(_KDB)`; copy `dashboard/header/` (6.2).
2. In `register<Module>`: initialise `_KDB.state.<module>`, call `ensureRuntime(_KDB, "<module>")`, merge labels into `_KDB.config.labels.de.<module>`, stamp facets (`_KDB.runtime.<module>.<x>Facet = _KDB.services.cognosHost.<facet>`), assign `_KDB.api.<module>`. Undo: register the replay handler in this `register` (or in `mount` when it needs mounted state) with `registerReplayKeys` (12.6).
3. The controller exposes `mount`, `destroy`, `dispatch`, `getState`; `destroy` calls `guard.dispose()` first, then `disposeRuntimeBuckets`.
4. Add **one manifest entry** in `bootstrap/featureManifest.js`: the AMD import and `{ name, register, api, mount: { options: {} } }` in `entries` (position = registration and mount order; `phase: "afterLoading"` only for things Cognos creates after the overlay lifts), and the `name` in `destroyOrder`. `KDB.js` does not change.
5. Add the state subtree to `architecture/stateOwnership.md`, a test in `tools/tests/`, and run `node tools/check-all.mjs`. For save and restore see 12.7.

### 12.2 Add a widget type

Add the module under `dashboard/widgets/` (state `state.widgets.<type>`) and register it (12.1). `widgetBase/effects.js` `dispatchContentCreate` maps a kind to `<type>/contentCreate`, so a new kind needs a case there; the gear panel comes from `widgetSettings/config/controlDefinitions.js` and `KIND_TABLE`. A persisted kind also needs v3 schema entries, a collector and a restore handler (12.7). A new **visualization type** needs definitions and binding specs in `core/config/visualizations/` and wiring in `widgetVis/visTypes.js`. Hide or show Dimension/TopN through `visTypeRules.supportsDimension` and the `data-kdb-dimension` stamp (`panelDimensionAttr`); do not add vis-type names to the hide CSS.

### 12.3 Add a filter

1. Define it in the `filterPropId` paste source with capability flags (`cascade`, `isSingleSelect`, `isHierarchy`, `isNative`, `condition`) and paste it into Cognos.
2. Add an entry to `OWNER_ROUTE_MAP` (`filterDock/ownerRoutes.js`) and a branch in `filterDock/identity.js` `resolveFilterType`.
3. Create `dashboard/filters/<name>/`: `index.js` builds its controller with `_core/ownerController.js` and stamps the `filters` facet; `state.js` for `state.filters.<name>`; a handler for `<name>/filterDockStateChanged` (`mapDockHandoff` with a `HANDOFF_PROFILE`, or directly like `nativeMultiSelect`). For Cognos writes delegate to `singleSelect` (`sicht`, `specialSingleSelect`: `delegation.js`) or use the filters facet (`dienststelle/effects/hostScope/`, `nativeMultiSelect/hostFilterIo.js`).
4. Undo (12.6), a restore action (usually `<name>/parameterSetRestoreRequested`, with `_core/parameterSetRun.js`; `specialSingleSelect` uses `specialSingleSelect/syncRequested`) and a collector (12.7). For page-scoped filters wire the four tab-mutation actions (`prepareTabMutation`, `applyTabMutation`, `restoreTabMutationSnapshot`, `resyncTabMutationHost`) through `_core/tabMutation.js` (and `tabMutationScopes.js` when scope-keyed) and list the owner in `mutationOwners` (`dashboard/tabs/config.js`).
5. To refresh TopN charts after commits, call `emitConfirmed` (`core/events/filters.js`); never import widgetVis. Register the module (12.1). Examples: `nativeMultiSelect`, `specialSingleSelect`.

### 12.4 Call Cognos (add a facet operation)

1. Look in `core/services/cognosHost/facets/<facet>/` first. In your module use the stamp `_KDB.runtime.<owner>.<x>Facet`, check `outcome.ok`, and on failure read `outcome.outcome` and `outcome.errorCode`.
2. If it is missing and you have a **real caller**: add the SDK wrapper to the theme file in `core/cognosAPI/` (try it as `getKDB().cognosAPI.<theme>.<fn>()`), then the facet operation: ids and plain data in, `pollUntil` and the abort signal for waiting, Outcome out; never a raw Cognos promise or handle.
3. If the owner does not stamp that facet yet, add the stamp in its `register`. Apply a widget's binding change as **one** update (`services.widgetBinding.run`).
4. A new Cognos chrome selector goes into the catalogue in `core/cognosHost/config/` (`rootChromeSelectors.js`, `tabChromeSelectors.js`, `pageChromeSelectors.js`, `filterDockChromeSelectors.js`, `widgetChromeSelectors.js`).
5. Extend a test (`ws-a*` tests stub facets) and verify in Cognos (smoke `WS-A`).

### 12.5 Add a config value, label, CSS file or property

Config tables: `core/config/` (`registerConfig.js`); module constants and German labels: the module's `config.js` (labels merge into `_KDB.config.labels.de.<module>`). CSS: a file under `KDB3/css/<area>/` with `kdb-` class names and an entry in `core/css/config/cssHrefList.js` (order matters). Property: `KDB3/spec.json` (`propertyList`), `OBJECTS` or `TOGGLES` in `propertyDefinitions.js`, a paste source in `__savedProperties/`, then re-upload (frozen contract: write the PR note).

### 12.6 Add a history (undo/redo) step

1. In the module's `history.js`, after the user action is **complete**, call `pushHistoryStep(_KDB, { key: "<module>_<what>", old, new }, options)` with JSON-serialisable snapshots (pass the action's `options`, so replay and restore push nothing).
2. Build the handler with `createReplayHandler({ "<module>_<what>": apply })`; `apply(_KDB, targetValue, step, ctx)` validates, dispatches the inverse action with `isHistoryReplay: true`, returns `true` on success.
3. Register it with `registerReplayKeys(_KDB, ["<module>_<what>"], handler)` in the module's `register` or `mount`, and keep it in `_KDB.runtime.<module>.historyReplayHandlerContribution`. There is no central list to edit.
4. Test as in `tools/tests/ws-d-history.test.mjs`; verify undo and redo in Cognos.

### 12.7 Make something survive save and restore

Paths relative to `workflows/parameterSet/`. **Save:** add a collector in `get/collectors/`, register it in `get/runWritebackGetCollectors.js`, add keys to `schema/v3Defaults.js` and handle them in `schema/normalize/` and `schema/validate/` (short keys, at most five characters, omit defaults). **Restore:** implement `<module>/parameterSetRestoreRequested` in the module's `restore.js` (numeric `runId`, reject stale runs, apply absolutely, honour `skipHistory`, return diagnostics), add a phase in `set/effects/runNormalRestore.js` or its sub-runners (9.4) and a name in `RESTORE_PHASE_NAMES`. Old sets lack your keys, so "missing" must restore to a sensible default; never rename v3 keys; for fields in KDB2 sets add a mapping in `map/adapters/`. A workflow must not import unpublished `dashboard/` files. **Test:** extend `tools/tests/ws-c-writeback-map.test.mjs` (and golden JSON); in Cognos save a v3 set, change the dashboard, load it, then load the v2 sample.

---

## 13. Troubleshooting: where to look

Symptom, then the first file to open:

- Widget stays empty ("KDBReadyToggle is not true"), a property seems ignored, or "second render() ignored": the `KDBReadyToggle` property in Cognos; `core/properties/propertyDefinitions.js` (JSON must be wrapped as `{"<propertyId>": {...}}`); `KDB.js` `renderKDB`
- `RequireJS` error or 404 on a KDB file, or nothing loads after an upgrade: The deployed zip (does it contain `bootstrap/` and `workflows/`?); the failing `define([...])`; `node tools/check-imports.mjs`
- Alert about missing Cognos elements after boot: `core/cognosHost/chromeChecks.js` and the selector catalogue in `core/cognosHost/config/`
- Loading overlay stays, then a "nicht vollständig geladen" message after 5 minutes: `core/services/loadingService/watchdog.js`, `core/homeDialog/index.js` (5.4)
- Filter click does nothing: `filterDock/ownerRoutes.js`, `identity.js`, `interaction/dockClick.js`
- Filter value wrong or reverted; Dienststelle does not follow Sicht: `singleSelect/commit/commitSelection.js`, `hostFilterIo.js` (or `nativeMultiSelect/commit.js`); `dienststelle/effects/sichtSync.js`
- A chart does not bind or shows wrong data: `widgetVis/binding/pipeline.js`, `binding/spec.js`, `core/services/widgetBinding/index.js`, `core/services/widgetBindingApply/applyBindingPlan.js`
- TopN charts slow, not re-ranked after a filter change, or leftover helper widgets: `widgetVis/topN/filtersConfirmed.js`, `topN/wave.js`, `widgetTopN/cleanup.js`, `helperClaim.js`
- Tab delete, move or duplicate breaks content: `tabs/tabMutation/saga.js`, `owners.js`, `plans.js`, `reduce.js`, `slotStock/`
- Saved set loads partly or in the wrong order, or an old v2 set loads wrong (`schema/detectSourceFormat.js`, `map/adapters/mapV2ToV3.js`): `workflows/parameterSet/set/effects/runNormalRestore.js`, `filters/runFilterRestore.js`, `dispatchOwnerPhase.js`, console diagnostics
- Undo does nothing for one action kind: The owner's `history.js` and its `registerReplayKeys` call; `core/services/historyService/replay.js`
- Rows missing or a table does not load: `core/services/tableData/queryRead.js`, `resolveTableWidgetId.js` (hidden table widget's title must equal the configured name)
- PDF export fails or has missing pages: `workflows/pdfExport/exportRun.js`, `capture/captureTabPage.js`
- Alert "Das KDB-Dashboard konnte nicht geladen werden", or memory/listener growth after reopening: `core/bootstrap/renderBoundary.js` `reportRenderFailure` (console `[core.renderKDB] failed`); the owner's `destroy`, `core/utils/kit/runtime.js`, smoke section 4

---

## 14. Known limitations, open items, and where docs live

### 14.1 Known limitations and open items

Groups: **S** Cognos smoke run needed, **P** product question for Matthijs, **T** parked technical item, **D** doc debt. "Smoke" is `tools/smoke-checklist.md` section `8) Phase 2`; Phase 2 intends no behaviour change beyond log output and microtask timing, but none of it ran against Cognos.

| # | Item | Detail |
|---|---|---|
| 1 S | **Run the Phase 2 smoke** | One block per wave. Highest priority: `P2-W1` (double boot, `render()` twice), `P2-W6a`/`W6b` (tab move, duplicate, delete, forced failure), `P2-X1`/`X2` (TopN delay, helper back in its slot), `P2-W12` (undo and redo for all 18 keys, an old set with a table widget), `P2-W9a`/`W9b` (vis changes, Jahr multi-select with a TopN chart), `P2-W11` (save, load, URL share, PDF) |
| 2 S | **Deploy `bootstrap/` and `workflows/`** | Zip the whole `KDB3/` (2.2); relative AMD ids, but resolution cannot be shown without Cognos |
| 3 S | **Line chart with grain but no dimension** | Fails planning on `main` (`WIDGET_BINDING_PLAN_SLOT_REQUIRED_EMPTY`, pinned as `line|jahr|dim=null` in `tools/tests/fixtures/w8-vis-rules.golden.json`); verify in Cognos whether that is intended |
| 4 P | **Second `render()` with a new parent** | Does Cognos ever call it on a live instance? It is ignored with a warning (the old code re-mounted) |
| 5 P | **Parked TopN chart keeps its helper claim?** | Settings Delete and tab delete park the chart and keep the claim by design; a leaked helper is the recurring risk |
| 6 P | **`widget_removed` has no undo handler** | Undo of a removed chart fails with the replay-failed message and blocks older undo steps |
| 7 P | **Binding error envelope** | Removing the pipeline guards (`reachedApply`, `settleWithoutApplyService`) would turn a throw before apply into `WIDGET_VIS_BINDING_APPLY_FAILED` instead of `WIDGET_VIS_MOUNT_FAILED`, also the (wrong) code for a synchronous dispatch throw |
| 8 P | **Data questions** | `metricsTablesPropObj` versus `kennzahlenTablesPropObj` mismatch; a missing table widgetId stays an empty `ready` table (`failed` would add a toast per table at boot); shaped-rows cache not done; KDB2 sets whose filter `meta.name` equals its key lose Sicht and Dienststelle in cross-package loads (`map/adapters/remapV2KidTokens.js`, `classifyV2FilterItem.js`; unknown whether real saves look like that) |
| 9 P | **CSS prefix** | `KDB_*` (82 families, 850 uses) versus `kdb-` (138, 355 uses); renaming touches persisted ids and needs a Cognos check |
| 10 P | **Filter classification edge cases** | Native versus single-select flag overlap (synthetic only) and disposed-result alignment are pinned by goldens |
| 11 T | **Frozen-contract drift** | `parameterMappingId` declared but not loaded (the real map is `core/config/mapping/parameterMap.js`); `headerWidgetPropId` loaded but not declared; duplicate `"comment"` keys in `spec.json` |
| 12 T | **Cross-module coupling left** | Reads of `runtime.cognosHost.chromeChecks` (header, footer, toolbarHost, tabs, filterDock; `services.chrome` is the facade), `runtime.tabs.pendingPromises` and `runtime.core.domRefs`; deep imports from `widgetBase` into `tabs`; tab-scope matching duplicated in writeback, the TopN wave and singleSelect restore |
| 13 T | **Developer mode, `readCurrentTab`** | The developer-mode toggle is not one-way (that would change the synchronous kdbControl echo); `_KDB.utils.readCurrentTab` compat versus `api.tabs.readCurrentTab` |
| 14 T | **Hygiene leftovers** | 542 `typeof ... === "function"` guards; 74 functions over 60 lines; caller-less `cognosAPI` wrappers; per-frame `getState()` clones; facet stamps kept; `core/properties/selectors.js` and `core/utils/readHostFacet.js` are allowlisted orphans |
| 15 T | **Behavioural limits** | `tabs/reorder` unsupported; visible tabs must be a contiguous prefix; duplicate-undo with partial widgets (`contracts/futureTodo/tab-duplicate-undo-redo-partial-widgets-2026-10-06.md`); TopN wave is best-effort; `dataSourceContext` is an unregistered stub; prototype-key hierarchy cells crash `core/utils/orgTree/` |
| 16 T | **Other parked items** | `spec.json` drift, jsPDF 2.5 and PNG to JPEG, `jquery-ui.css` trim, unused images, a Jahr "Gesamt" CSS rule, `comments/startCreate` double dispatch (click and mousedown listeners), filterDock F-P3; `contracts/futureTodo/` holds 12 memos |
| 17 D | **Stale lines** | `README.md` "Checks" lists only syntax, imports and kit tests; `core.mdc` PR line omits doc paths and layering; `architecture/projectStructureRules.md` still says writeback violates `core -> dashboard` (false since W11); `module-public-api.mdc`, `runtime.mdc` and `cognos-adapter.mdc` speak of Phase 2 follow-ups (those reads and stamps stay). `AGENTS.md` is current |
| 18 D | **Pre-refactor prose** | About 155 bare file names in 35 living docs describe the old layout (`check-doc-paths` cannot see bare names, module-relative paths, links or `legacy:` paths); `architecture/jsModuleMap.md` is partly Dutch and "after Phase 1"; `contracts/writeback.md` uses old service vocabulary |
| 19 D | **Contract deltas** | 17 `contracts/*-contractdelta.md` files are still cited from JS comments; archive after repointing |
| 20 D | **Other docs** | `__savedProperties/README.md` is partly outdated; `architecture/eventSubscribe.md` is incomplete |

### 14.2 Where documentation lives

Start page and console recipes: `README.md`. Rules: `AGENTS.md`, `.cursor/rules/*.mdc` (10.2), `.cursor/lifecycleVocabulary.md`. Architecture: `architecture/projectStructureRules.md`, `conventions.md` (with "Final layout"), `stateOwnership.md`, `eventSubscribe.md`, `filesExplained.md`, `jsModuleMap.md`. Contracts and backlog: `contracts/<module>.md` (index `contracts/README.md`), `contracts/WBParameterSet.md`, `*-contractdelta.md`, `contracts/futureTodo/`. Tools: `tools/README.md`, `tools/smoke-checklist.md`. History only: `architecture/_archive/`, `contracts/_archive/`.

Documentation is partly Dutch and German; some contracts predate the refactor. Treat the **code** as current truth (over `contracts/writeback.md`, which code comments still cite as normative), the rule files as the conventions, contracts as design intent that may be stale. `_archive/` and anything citing `laatsteOriginal/KDB2` describe the legacy KDB2.

---

## 15. Glossary

Domain nouns only; *(unconfirmed)* needs the product owner. Architecture terms (facet, stamp, Outcome, owner, ring, slot stock, tab mutation, manifest) are defined where introduced.

- **KDB**: The product: the configurable personnel dashboard (acronym expansion *unconfirmed*)
- **Kennzahl** (pl. Kennzahlen): Metric or KPI shown in a visualization; chosen from the metrics tree
- **Dienststelle**: Organisational unit (office, department) in the city administration; a hierarchical filter
- **Sicht** (pl. Sichten): "View": the data perspective (e.g. BW versus DEZPV; tables `Sichten_BW`, `Sichten_DEZPV`) that determines which hierarchies and values apply
- **BW / DEZPV**, **PKZ**, **PG / DSL**: Data-source families behind Sicht and Dienststelle; the detail report family targeted by drill-through; rights-gated special filters (`specialSingleSelect`) *(all expansions unconfirmed)*
- **Stichtag**, **Jahr**, **Aufriss**, **Langtext**, **Prognose**: Cut-off date of a data snapshot; year (time filter and grain); drill dimension; long description of a metric; forecast (custom year-line visualization)
- **parameter set**, **v2 / v3**: Saved dashboard snapshot (compact JSON); v2 is the KDB2 legacy shape (mapped on load), v3 the current shape
- **launchpad**, **TopN helper**: Hidden parking area for widgets not on the canvas; the hidden List widget borrowed to compute a TopN ranking
- **filter dock**, **chrome**, **Wien-KI**, **Teilen**: The Cognos filter panel KDB observes; Cognos' own UI around the canvas; the City of Vienna AI assistant button; the share-link button

# Module Contract: core bootstrap tranche 1

**Status:** CP-1 approved; ready for execution-spec  
**Owner module / service:** `core`  
**Type:** `subsystem`  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Reviewed by:** user, 2026-05-16  
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 1. Purpose

`core` bootstrap tranche 1 creates the minimal production runtime foundation for the already ported `kdbControl`, `header` and `footer` modules to run inside a real Cognos extension. It defines the extension manifest, the `KDB.js` entry class, the production event bus, and only the thin Cognos host wrappers required by those three module contracts.

This tranche is deliberately smaller than legacy bootstrap: it does not seed dashboard state beyond the `_KDB` object shape required for module startup, does not load table data, and does not register services whose modules are not ported yet.

## 2. Ownership

- Canonical state subtree: none newly owned by `core` as feature state.
- Bootstrap-owned root state: `_KDB.state.rootLifecycle` may track bootstrap lifecycle only.
- Foreign-write paths: none. `core` initializes top-level `_KDB` namespaces and calls module orchestrators / public `mount()` methods; it does not write `kdbControl`, `header` or `footer` state after their owners are registered.

Minimum `_KDB` shape:

```js
_KDB = {
  state: {
    rootLifecycle: { lifecycle: "idle", errorCode: null, errorMessage: null }
  },
  runtime: { core: {} },
  services: {},
  api: {},
  events: createEventBus(),
  config: { options: {} },
  properties: {},
  elements: { selectors: {} },
  utils: {},
  cognosAPI: {},
  data: {}
};
```

Dropdown and option lists are part of declarative config and live under `_KDB.config.options`; `_KDB.dropdownOptions` is a deprecated legacy namespace and is not part of the minimum production `_KDB` shape.

Lifecycle subset for `rootLifecycle`: `idle`, `initializing`, `ready`, `error`, `disposed`.

## 3. Runtime

- Owner namespace: `_KDB.runtime.core`
- Keys (since Phase 2 W12; the unread raw Cognos handles and the never-filled `subscriptions`/`abortControllers`/`pendingPromises` buckets are gone): `domRefs.renderParentEl` (render parent, set by the boot mount), `domRefs.cssLinks` (created by `core/css`), `adapters.content` (the Cognos content object, read only by `core/properties`)
- Cleanup trigger: `KDB.destroy()`
- Notes: bootstrap-owned root DOM references and the Cognos content adapter live under `_KDB.runtime.core`, not under `_KDB.state`, `_KDB.elements` or ad hoc legacy keys.

Cleanup order in `KDB.destroy()` (host teardown entrypoint; the Cognos content-API calls it directly on the class instance):

1. Repeat calls are a no-op via `_teardownComplete` (set after teardown finishes); `_isDisposed` is set first, before any cleanup runs.
2. Call `destroy()` on all registered feature APIs, then on core services (incl. `writebackBridge`, which de-installs `window.top.WBParameter*Function` with an ownership check so a newer boot's globals are never removed).
3. Clear runtime references (`_KDB.runtime.core = {}`); remove the `window.top.getKDB` anchor when it still points to this instance (ownership check for double-boot); dispose root lifecycle; then null `_KDB.events`, `_KDB.services`, `_KDB.api` and `_KDB.cognosAPI`.

## 4. Public API

### 4e. Subsystem routing

`core` is a subsystem that produces the extension entry object, the `_KDB` runtime registry and thin host-wrapper registrations. It does not publish a feature surface under `_KDB.api.core` and does not publish a service under `_KDB.services.core`.

The Cognos extension entry is the AMD `KDB.js` class expected by `spec.json` (`renderer.class: "v1/ext/KDB3/js/KDB"`); it exposes the host-facing `getAPI().render(options)` lifecycle used by Cognos. Teardown is not part of `getAPI()`: the Cognos content-API calls `instance.destroy()` directly on the class instance (runtime-verified 2026-08-19: `removeDialog → destroyContentMap → api-utils t.destroy → KDB.destroy`), so `destroy()` is the single teardown entrypoint. A reopen boots two instances and disposes the first one mid-open (double-boot); teardown of `window.top` anchors (`getKDB`, `WBParameter*Function`) is therefore ownership-checked. Internally it registers:

- `_KDB.events` from `core/events/createEventBus.js`
- `_KDB.cognosAPI.canvas.*`
- `_KDB.cognosAPI.glassMessages.*`
- `_KDB.api.header`
- `_KDB.api.footer`
- `_KDB.api.kdbControl`

## 5. Readers / Writers

- Published readers/selectors: none for `core` in tranche 1.
- Internal writers:
  - `setRootLifecycle(_KDB, lifecycle, error)` may be used inside `KDB.js` or a small bootstrap helper.
  - Namespace initialization happens only in `KDB.js` construction / render bootstrap, before feature module owners mount.

No helper in `core` writes `_KDB.state.kdbControl`, `_KDB.state.header` or `_KDB.state.footer`; those are initialized and mutated by their module orchestrators/controllers.

## 6. Events

- Emitted facts: none in tranche 1.
- Subscribed: none in tranche 1.
- Request-events: none.

`core/events/createEventBus.js` implements the bus surface required by `events.mdc`:

```js
_KDB.events.emit(eventName, payload);
const unsubscribe = _KDB.events.subscribe(eventName, handler, options);
_KDB.events.unsubscribe(eventName, handler);
```

`subscribe()` returns a real unsubscribe function. `emit()` snapshots the current subscriber list before dispatching and wraps each subscriber call in `try/catch` so one bad subscriber does not break the bus.

## 7. Dependencies

- Cognos renderer options: `options.content`, `options.features`
- Cognos dependencies from manifest: `Dashboard.Canvas`, `UserProfile`, `Properties`, `Dashboard.API`
- Runtime dependency from manifest: none in this tranche; `DataQueryExecution` is deferred until a table/data-query tranche requires it.
- Module registrars: `dashboard/header/index.js`, `dashboard/footer/index.js`, `dashboard/canvas/kdbControl/index.js` (called from `bootstrap/featureManifest.js`)
- Thin wrappers: `core/cognosAPI/canvas`, `core/cognosAPI/glassMessages`
- Event bus: `core/events/createEventBus`

## 8. Cognos Touchpoints

Exact wrapper scope for tranche 1, derived from `kdbControl.md` §8:

- `_KDB.cognosAPI.canvas.getCanvasPropertiesList()` — thin wrapper around Cognos canvas property-list host call.
- `_KDB.cognosAPI.canvas.getCanvasPropertyValue(propertyName)` — thin wrapper around Cognos canvas property read.
- `_KDB.cognosAPI.canvas.setCanvasPropertyValue(propertyName, propertyValue)` — thin wrapper around Cognos canvas property write, returning the host result or current value.
- `_KDB.cognosAPI.glassMessages.showToast(text, type)` — thin wrapper around Cognos glass toast.
- `_KDB.cognosAPI.glassMessages.showMessageDialog(text, title, type)` — thin wrapper around Cognos glass message dialog.

No wrapper is added for `showErrorDialog`, data queries, widgets, filters, tabs, visualization, properties or dashboard host APIs in this tranche unless CP-1 explicitly expands scope.

`header.md` and `footer.md` do not add required Cognos wrappers for their approved CP-1 slice; their Cognos persistence remains out of scope.

## 9. Folder Layout

Approved production tree:

```txt
_____________KDB3API/
  KDB3/
  spec.json
    js/
      KDB.js
      core/
        events/
          createEventBus.js
        cognosAPI/
          index.js
          canvas.js
          glassMessages.js
      dashboard/
        canvas/
          kdbControl/
            ...
        header/
          ...
        footer/
          ...
```

`_____________KDB3API/KDB3` is the project production-code root for JS and CSS. The top-level `KDB3/` option is rejected because the workspace also contains legacy `_______KDB3/KDB3`, making path confusion more likely than rule-glob convenience.

### 9.1 `KDB.js` size and change policy

`KDB3/js/KDB.js` is the Cognos renderer entry class. It may grow up to **500 lines** without additional approval when a change is limited to bootstrap wiring: AMD factory imports, core factory calls, module orchestrator registration, module mount/destroy calls and allowed `_KDB` namespace initialization.

Any other `KDB.js` change requires explicit user approval, including lifecycle semantics, `_KDB` shape/top-level keys, public renderer API, error handling, DOM placement policy, services/state/events or feature behavior.

## 10. Out Of Scope

- No authoring module bootstrap.
- No dashboard-state seeding beyond the minimum `_KDB` object and root lifecycle.
- No tableDataService or widgetBindingService registration.
- No historyService, configLoader, loadingService, data query service, super-user bootstrap or properties subscription bootstrap.
- No move of `TEST/` skeletons into production during this tranche.
- No extra Cognos wrappers beyond Section 8.
- No new top-level `_KDB.*` namespace.
- No edits to `.cursor/rules`, templates or legacy trees.

## 11. CP-1 Decisions

| ID | Decision |
|---|---|
| Q1 | Production JS/CSS lives under `_____________KDB3API/KDB3/...`. Do not create a top-level `KDB3/` sibling because `_______KDB3/KDB3` already exists as legacy reference and creates path-risk. |
| Q2 | Include passive thin wrappers only, split by theme: `core/cognosAPI/canvas.js` and `core/cognosAPI/glassMessages.js`. No caller-flow, no state, no extra behavior. |
| Q3 | Ignore legacy `launchpad` for this tranche because it is not ported yet. `KDB.js` directly registers the three available orchestrators, then mounts `header`, `footer`, `kdbControl` in that order. |
| Q4 | Do not create `_KDB.state.tablesLoaded` and do not bootstrap table rows/promises in `KDB.js`. Start-table vs later helper-table data/readiness is deferred to a future `tableDataService` / table-bootstrap tranche. |
| Q5 | Omit `runtimeDependencies: ["DataQueryExecution"]` from `spec.json` in this tranche; add it later contract-first when data-query code requires it. |

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-16 | `Draft → CP-1 approved` | user | Q1-Q5 resolved in chat; execution spec may be written. |

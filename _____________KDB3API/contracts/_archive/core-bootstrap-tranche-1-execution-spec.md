# Execution Spec: `core` (`bootstrap tranche 1`)

**Status:** Ready for execution  
**Module / contract:** `_____________KDB3API/contracts/core.md`  
**Phase:** bootstrap tranche 1  
**Authoring AI:** GPT-5.5, 2026-05-16  
**Executing AI:** pending  
**Reviewer:** user / supervising AI  

---

## Section A. Pre-flight read list

The executing AI must read each file below in order, before producing any output file, and must echo one sentence per item before writing files.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: fixed `_KDB` top-level namespaces; no new top-level keys and no legacy namespace reuse.
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: `_KDB.state` is serializable owner-written state only; no Promise objects, DOM, functions or foreign writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: technical resources live under `_KDB.runtime.<owner>` buckets and every resource needs cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: feature APIs and service APIs are single surfaces with disposed-state guards; core does not invent `_KDB.api.core`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: `_KDB.events` is top-level, `subscribe` returns cleanup, subscribers are isolated and events do not transfer ownership.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: contract first, thin orchestrators, small files, exact folder roles and no business logic in wiring files.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: English technical names, canonical file/function naming, and underscore only for boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: selectors live under `_KDB.elements.selectors`, live host refs under `_KDB.runtime.<owner>.domRefs`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: production JS uses one explicit AMD `define([...], function (...) { ... })` with factory-scope named helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — summary: lifecycle values come from the canonical vocabulary; root bootstrap uses only the approved subset.
12. `_____________KDB3API/contracts/_template.md` — summary: contracts define ownership, API, events, dependencies, Cognos touchpoints and folder layout before implementation.
13. `_____________KDB3API/contracts/core.md` — summary: core bootstrap tranche 1 creates the manifest, `KDB.js`, event bus and only passive canvas/glassMessages wrappers.
14. This execution spec.

The executing AI's first output must be the 14 echoed summaries as a numbered list.

---

## Section B. Folder tree

Create only these paths:

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
          __orchestratorCognosAPI.js
          canvas.js
          glassMessages.js
```

Do not create or move `header`, `footer` or `kdbControl` production files in this tranche.

---

## Section C. Per-file specifications

#### `_____________KDB3API/KDB3/spec.json`

- **Role**: Cognos extension manifest.
- **Lines**: target 35-70.
- **Content requirements**:
  - Valid JSON, no comments.
  - Top-level `name`: `"KDB3"`.
  - `schemaVersion`: `"1.0"`.
  - One dashboard extension with one collection item.
  - Collection item keeps legacy-compatible identity: `id: "KDB3"`, `type: "KDB3Widget"`, `name: "KDB3"`.
  - Renderer class: `"v1/ext/KDB3/js/KDB"`.
  - Renderer dependencies exactly: `"Dashboard.Canvas"`, `"UserProfile"`, `"Properties"`, `"Dashboard.API"`.
  - Do not add `runtimeDependencies`.
  - Do not add property-list entries, table properties, table toggles or legacy property panel config in this tranche.
- **Rules to apply**:
  - `feature-structure.mdc` — manifest is a production root artifact under the approved `_____________KDB3API/KDB3/` tree.
  - `kdb-object.mdc` — manifest must point only to `KDB.js`; it does not define `_KDB` namespaces.
  - `naming.mdc` — no new non-English technical identifiers.

#### `_____________KDB3API/KDB3/js/KDB.js`

- **Role**: Cognos renderer entry class and bootstrap orchestrator.
- **Lines**: target 100-200 for the first bootstrap tranche; hard limit 500 for bootstrap wiring only per `core.md` Section 9.1.
- **AMD imports**:
  - `"./core/events/createEventBus.js"`
  - `"./core/cognosAPI/__orchestratorCognosAPI.js"`
  - `"./dashboard/header/__orchestratorHeader.js"`
  - `"./dashboard/footer/__orchestratorFooter.js"`
  - `"./dashboard/canvas/kdbControl/__orchestratorKdbControl.js"`
- **Factory parameters**:
  - `_createEventBus`
  - `_orchestratorCognosAPI`
  - `_orchestratorHeader`
  - `_orchestratorFooter`
  - `_orchestratorKdbControl`
- **Factory-scope named helpers**:
  - `function createInitialRootLifecycle()`
  - `function setRootLifecycle(_KDB, _lifecycle, _error)`
  - `function createRuntimeCore(_options)`
  - `function setupCoreFactories(_KDB)`
  - `function registerFeatureModules(_KDB)`
  - `function mountFeatureModules(_KDB, _renderOptions)`
  - `function destroyFeatureApi(_api)`
  - `function clearRuntimeCore(_KDB)`
- **Entry function**:
  - Name: `KDB` class.
  - Constructor parameters: `_options`.
  - Constructor body:
    1. Initialize all allowed top-level `_KDB` namespaces directly on the instance: `state`, `runtime`, `services`, `api`, `events`, `config`, `properties`, `elements`, `utils`, `cognosAPI`, `data`.
    2. Initialize dropdown and option-list config under `_KDB.config.options`; do not initialize `_KDB.dropdownOptions`.
    3. Store Cognos host feature refs and content under `_KDB.runtime.core.adapters` / `_KDB.runtime.core.domRefs`, not under a new top-level key.
    4. Initialize `_KDB.events` via `_createEventBus()`.
    5. Set `_isDisposed = false` on the instance.
  - Methods:
    - `getAPI()` returns `{ render: this.renderKDB.bind(this) }`.
    - `getKDB()` returns `this`.
    - `installGetKDB()` is a dedicated method equivalent to legacy `KDB.js`: assign the current instance as the global debug accessor (`window.top.getKDB` when available; fallback to `window.getKDB` or `globalThis.getKDB` only when needed).
    - `setupCore()` is a dedicated method for core/factory registration; it wraps its body in `try/catch`, calls `installGetKDB()`, then calls `setupCoreFactories(this)`.
    - `startModules(_renderOptions)` is a dedicated method for module startup only; it wraps its body in `try/catch` and calls `mountFeatureModules(this, _renderOptions)`.
    - `renderKDB(_renderOptions)` wraps its body in `try/catch`; set lifecycle `initializing`, call `this.setupCore()`, call `this.startModules(_renderOptions)`, then lifecycle `ready`.
    - `destroy()` is idempotent; set `_isDisposed = true`, destroy feature APIs in order `kdbControl`, `footer`, `header`, clear `runtime.core`, then lifecycle `disposed`.
  - `setupCoreFactories(_KDB)` body order: `_orchestratorCognosAPI(_KDB)`, then `registerFeatureModules(_KDB)`. It does not mount feature modules.
  - `registerFeatureModules(_KDB)` order: `_orchestratorHeader(_KDB)`, `_orchestratorFooter(_KDB)`, `_orchestratorKdbControl(_KDB)`.
  - `mountFeatureModules(_KDB, _renderOptions)` order: `_KDB.api.header.mount({ mountTarget })`, `_KDB.api.footer.mount({ mountTarget })`, `_KDB.api.kdbControl.mount({})`; `mountTarget` is `_renderOptions.parent` if present, otherwise `_KDB.runtime.core.domRefs.hostContent`.
- **Return value**: `KDB`.
- **Rules to apply**:
  - `amd.mdc` — one full-compact AMD `define`, named factory-scope helpers only, no inline subfunctions or ES module syntax.
  - `kdb-object.mdc` — only allowed top-level namespaces; no `apiContent`, no `_KDB.utilities`, no `_KDB.generalFunctions`.
  - `state.mdc` — no `_KDB.state.tablesLoaded`; no Promise objects in state; no table rows in core.
  - `runtime.mdc` — Cognos feature refs and host DOM refs in `_KDB.runtime.core`; cleanup before clearing runtime.
  - `module-public-api.mdc` — do not publish `_KDB.api.core`; guard `renderKDB`/`destroy` after disposal.
  - `error-handling.mdc` — `renderKDB`, `setupCore`, `startModules` and `destroy` are lifecycle boundaries with `try/catch`, context logs and root lifecycle error state.
  - `dom.mdc` — no live DOM refs under `_KDB.elements`; keep selectors under `_KDB.elements.selectors`.
  - `feature-structure.mdc` — bootstrap file stays thin; no table loading, service registration, business logic or module implementation.
  - `core.md` Section 9.1 — `KDB.js` may exceed the normal 150-line executable limit only for bootstrap wiring; any non-wiring change requires explicit user approval.
  - `naming.mdc` — English identifiers and boundary underscores.

#### `_____________KDB3API/KDB3/js/core/events/createEventBus.js`

- **Role**: event bus factory.
- **Lines**: target 55-85.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Factory-scope named helpers**:
  - `function createEventBus()`
  - Optional small helpers: `function removeHandler(_handlers, _eventName, _handler)`
- **Entry function**:
  - Name: `createEventBus`.
  - Body:
    1. Keep `handlersByEventName` in factory-created instance closure.
    2. `subscribe(_eventName, _handler, _options)` validates inputs; registers the handler; returns a real `unsubscribe` function.
    3. If `_options.signal` exists, register an abort listener that calls the unsubscribe function.
    4. `emit(_eventName, _payload)` snapshots subscribers before invoking; each subscriber call is individually wrapped in `try/catch` and logs `console.error("[core.events.emit]", { eventName: _eventName }, error)`.
    5. `unsubscribe(_eventName, _handler)` removes a handler by event name and function, for compatibility with `events.mdc`.
- **Return value**: `createEventBus`.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD, no nested subfunctions inside executable flow except the returned `unsubscribe` function explicitly required by the bus contract.
  - `events.mdc` — surface is `emit`, `subscribe`, `unsubscribe`; `subscribe` returns cleanup; no payload mutation.
  - `error-handling.mdc` — subscriber boundary catches and logs so one bad subscriber does not break siblings.
  - `runtime.mdc` — no runtime bucket writes here; owners store unsubscribe handles under their own runtime.
  - `naming.mdc` — event names are boundary inputs; no hardcoded project event constants in this file.

#### `_____________KDB3API/KDB3/js/core/cognosAPI/__orchestratorCognosAPI.js`

- **Role**: thin wrapper orchestrator.
- **Lines**: target 25-45.
- **AMD imports**:
  - `"./canvas.js"`
  - `"./glassMessages.js"`
- **Factory parameters**:
  - `_createCanvasApi`
  - `_createGlassMessagesApi`
- **Entry function**:
  - Name: `__orchestrator`.
  - Parameters: `_KDB`.
  - Body:
    1. Ensure `_KDB.cognosAPI` exists.
    2. Assign `_KDB.cognosAPI.canvas = _createCanvasApi(_KDB)`.
    3. Assign `_KDB.cognosAPI.glassMessages = _createGlassMessagesApi(_KDB)`.
    4. Return `_KDB.cognosAPI`.
- **Return value**: `__orchestrator`.
- **Rules to apply**:
  - `amd.mdc` — one AMD module with a named `__orchestrator`.
  - `kdb-object.mdc` — wrappers publish only under `_KDB.cognosAPI.<theme>`.
  - `feature-structure.mdc` — orchestrator contains wiring only, no host-call logic.
  - `naming.mdc` — canonical orchestrator name.

#### `_____________KDB3API/KDB3/js/core/cognosAPI/canvas.js`

- **Role**: thin host wrapper factory for canvas APIs.
- **Lines**: target 45-75.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Factory-scope named helpers**:
  - `function readDashboardApi(_KDB)`
  - `function readCanvas(_KDB)`
- **Entry function**:
  - Name: `__controller`.
  - Parameters: `_KDB`.
  - Body:
    1. Return exactly these methods: `getCanvasPropertiesList`, `getCanvasPropertyValue`, `setCanvasPropertyValue`.
    2. `getCanvasPropertiesList()` calls `readCanvas(_KDB).getPropertyNameList()`.
    3. `getCanvasPropertyValue(_propertyName)` calls `readCanvas(_KDB).getPropertyValue(_propertyName)`.
    4. `setCanvasPropertyValue(_propertyName, _propertyValue)` calls `readCanvas(_KDB).setPropertyValue(_propertyName, _propertyValue)` and returns the host result if one is returned, otherwise `readCanvas(_KDB).getPropertyValue(_propertyName)`.
  - `readDashboardApi(_KDB)` reads `_KDB.runtime.core.adapters.dashboardApi` and throws a plain `Error` when unavailable.
  - `readCanvas(_KDB)` calls `readDashboardApi(_KDB).getCanvas()`.
- **Return value**: `__controller`.
- **Rules to apply**:
  - `amd.mdc` — one AMD module, factory-scope helpers only.
  - `kdb-object.mdc` — no state, no services, no feature flow; wrapper is published only through the orchestrator under `_KDB.cognosAPI.canvas`.
  - `error-handling.mdc` — wrapper stays thin; do not catch host errors here unless adding context and rethrowing is explicitly justified.
  - `state.mdc` — no mirror writes; callers own any state sync.
  - `feature-structure.mdc` — no methods beyond the three approved wrappers.

#### `_____________KDB3API/KDB3/js/core/cognosAPI/glassMessages.js`

- **Role**: thin host wrapper factory for glass message APIs.
- **Lines**: target 35-60.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Factory-scope named helpers**:
  - `function readGlassContext()`
  - `function showToast(_text, _type)`
  - `function showMessageDialog(_text, _title, _type)`
- **Entry function**:
  - Name: `__controller`.
  - Parameters: `_KDB`.
  - Body:
    1. Return exactly these methods: `showToast`, `showMessageDialog`.
    2. `showToast(_text, _type)` calls `readGlassContext().showToast(_text, { type: _type })`.
    3. `showMessageDialog(_text, _title, _type)` calls `readGlassContext().showMessage(_text, _title, _type)`.
  - `readGlassContext()` reads `window.__glassAppController.glassContext` and throws a plain `Error` when unavailable.
- **Return value**: `__controller`.
- **Rules to apply**:
  - `amd.mdc` — one AMD module, no ES module syntax.
  - `kdb-object.mdc` — wrapper publishes only under `_KDB.cognosAPI.glassMessages` via orchestrator.
  - `error-handling.mdc` — wrapper stays thin; caller boundary handles recovery.
  - `feature-structure.mdc` — no `showErrorDialog` and no extra message APIs in this tranche.
  - `state.mdc` — no state writes.

---

## Section D. Reducer behavior table

No reducer is created in this tranche.

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| n/a | n/a | n/a | n/a |

---

## Section E. Published selectors

No selectors are published by `core` in this tranche.

| Selector | Reads | Returns |
|---|---|---|
| n/a | n/a | n/a |

---

## Section F. Public API wiring

- Surface: no `_KDB.api.core` and no `_KDB.services.core`.
- Host-facing entry: Cognos loads `KDB.js` from `spec.json` and calls `getAPI().render(options)`.
- `renderKDB()` lifecycle sequence: `setupCore()` then `startModules(_renderOptions)`.
- `setupCore()` sequence: `installGetKDB()` then `setupCoreFactories(this)`.
- `setupCoreFactories(_KDB)` sequence: `__orchestratorCognosAPI` then `registerFeatureModules(_KDB)`.
- `_KDB.events`: assigned by `KDB.js` from `createEventBus()`.
- `_KDB.cognosAPI.canvas`: assigned by `__orchestratorCognosAPI`.
- `_KDB.cognosAPI.glassMessages`: assigned by `__orchestratorCognosAPI`.
- Feature modules:
  - register order: `header`, `footer`, `kdbControl`;
  - mount order: `header`, `footer`, `kdbControl`;
  - destroy order: `kdbControl`, `footer`, `header`.

---

## Section G. Harness HTML spec

No harness is created in this tranche.

---

## Section H. Harness JS spec

No harness JS is created in this tranche.

---

## Section I. Mock extensions

No mock files are created in this tranche.

---

## Section J. Acceptance criteria

1. `_____________KDB3API/KDB3/spec.json` exists, is valid JSON, points renderer class to `v1/ext/KDB3/js/KDB`, lists only the four approved renderer dependencies, and has no `runtimeDependencies`.
2. `KDB.js` creates only allowed top-level `_KDB` namespaces and does not create `apiContent`, `tablesLoaded`, `_KDB.utilities`, `_KDB.generalFunctions`, `_KDB.dropdownOptions` or any new top-level key.
3. `KDB.js` stores Cognos feature refs and host content under `_KDB.runtime.core`, not `_KDB.state` or `_KDB.elements`.
4. `KDB.js` has dedicated methods `installGetKDB()`, `setupCore()` and `startModules(_renderOptions)`; `renderKDB()` calls `setupCore()` before `startModules(_renderOptions)`.
5. `setupCore()` calls `installGetKDB()` and `setupCoreFactories(this)`; `setupCoreFactories` registers Cognos wrappers and feature-module APIs but does not mount modules.
6. `KDB.js` registers orchestrators in order `header`, `footer`, `kdbControl`, and mounts in order `header`, `footer`, `kdbControl`.
7. `KDB.js` has lifecycle `try/catch` around `renderKDB`, `setupCore`, `startModules` and `destroy`, logs with contextual tags, and records root lifecycle `error` on failure.
8. `createEventBus.js` exposes `emit`, `subscribe`, `unsubscribe`; `subscribe` returns an unsubscribe function, not a handle object.
9. `createEventBus.js` wraps each subscriber call in `try/catch` and continues to later subscribers after a failure.
10. `core/cognosAPI/canvas.js` exports exactly three wrappers: `getCanvasPropertiesList`, `getCanvasPropertyValue`, `setCanvasPropertyValue`.
11. `core/cognosAPI/glassMessages.js` exports exactly two wrappers: `showToast`, `showMessageDialog`.
12. No data-query, widgets, filters, tabs, visualization, dashboard, properties or `showErrorDialog` wrappers are created.
13. No `tableDataService`, `widgetBindingService`, `historyService`, `loadingService`, config loader, authoring bootstrap or launchpad bootstrap is registered.
14. Every production JS file uses explicit AMD dependency-array form and contains no ES `import` / `export`.
15. No file exceeds the target hard limits in Section C.
16. No legacy tree (`_______KDB3`, `_______REDESIGN2`, `_______LAATSTEORIGINAL`) is modified.

---

## Section K. Forbidden actions

The executing AI must not:

- Modify any `.mdc` rule file.
- Modify `_____________KDB3API/contracts/_template.md` or `_executionSpecTemplate.md`.
- Modify legacy trees: `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`.
- Create a top-level `KDB3/` folder outside `_____________KDB3API/`.
- Move or copy `TEST/` skeletons into production.
- Create production `header`, `footer`, `kdbControl`, `authoring`, `launchpad`, `tableData`, `history`, `loading`, `widgets`, `filters`, `tabs` or service files.
- Add `runtimeDependencies` to `spec.json`.
- Add `_KDB.state.tablesLoaded` or any Promise under `_KDB.state`.
- Add wrappers beyond `canvas.js` and `glassMessages.js`.
- Commit, push or change git config.
- Invent behavior beyond this spec.

---

## Section L. Reporting template

The executing AI's final response must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every created path with line count and `matches spec | deviation`.
3. **Deviations** — any deviation with path, motivation and rule consulted.
4. **Self-verification** — pass/fail for every Section J criterion.
5. **Open questions for reviewer** — only if the spec left something uncovered.

---

## Section M. Reviewer handoff

The supervising AI must:

1. Verify the 14 echoed summaries are present and concrete.
2. Read every created file.
3. Run `ReadLints` on all created `.js` files.
4. Cross-check all Section J acceptance criteria.
5. Stop at CP-2 for user verification before any next tranche.

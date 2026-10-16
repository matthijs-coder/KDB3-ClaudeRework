# kdbControl port — execution spec (cheap AI)

**Inputs:** approved `kdbControl.md` (2026-05-12) and this document only for file creation (plus Section A read list in a session that may read those paths). **User decisions:** Q1 defer `controlDefinitions`; Q2 nested `state.kdbControl.{framework,toolbox,settings,authoringMode}` + root `lifecycle`; Q3 keep `authoringMode` subsystem (flag dashboard split in Phase 3 litmustest report); Q4 per-subsystem orchestrators, **omit** `view/__orchestratorView.js`.

**Phase 3 reminder:** `kdbControl-litmustest-report.md` must note `authoringMode` as candidate for dashboard-level module split.

---

## Section A — Pre-flight read list (order)

1. All `_____________KDB3API/.cursor/rules/*.mdc` (10 files).
2. `_____________KDB3API/.cursor/lifecycleVocabulary.md`.
3. `_____________KDB3API/contracts/_template.md`.
4. `_____________KDB3API/contracts/kdbControl.md` (approved).
5. This execution spec.

---

## Section B — Folder tree (creation order)

```
TEST/kdbControl-port/
  kdbControl/
    __orchestratorKdbControl.js
    createKdbControlController.js
    state/
      initialState.js
      createKdbControlReducer.js
      selectors.js
      writers/
        writeSettingsSnapshot.js
        writeFrameworkView.js
    effects/
      __orchestratorEffects.js
    events/
      eventNames.js
    framework/
      __orchestratorFramework.js
    toolbox/
      __orchestratorToolbox.js
    settings/
      __orchestratorSettings.js
    authoringMode/
      __orchestratorAuthoringMode.js
  harness/
    index.html
    harness.js
    adapters/
      createMockKdb.js
    state/
      createMockKdbStateSeed.js
```

**Omitted (per contract):** `config/controlDefinitions.js`, `view/__orchestratorView.js`.

---

## Section C — Per-file AMD spec

**Convention:** AMD `define([...], function (...) { ... });` only. Underscore prefix on AMD dependency parameters and boundary parameters where rules require it. No nested `function` declarations inside `mount` / `destroy` / `dispatch` / factory callbacks; use module top-level named exports only (each file one factory). Max **50 lines** per file.

### `kdbControl/events/eventNames.js`

- **deps:** `[]`
- **params:** none
- **exports:** object with string constants `ACTION_INIT`, `ACTION_DESTROY` equal to `kdbControl/init`, `kdbControl/destroy`
- **entry:** n/a (data module)
- **return:** constants object
- **stub body:** literal strings only

### `kdbControl/state/initialState.js`

- **deps:** `[]`
- **factory:** returns `initialState` (no underscore; factory name)
- **return:** `function initialState()` returning nested default: `lifecycle: "idle"`, `framework: { frameworkViewUi: undefined, visibility: undefined }`, `toolbox: {}`, `settings: { snapshot: {}, dashboardDimensions: undefined, controlPanelColors: undefined }`, `authoringMode: {}`

### `kdbControl/state/createKdbControlReducer.js`

- **deps:** `["../events/eventNames"]`
- **param:** `_eventNames`
- **return:** `function createKdbControlReducer()` returning reducer `function (state, action)` that only handles `_eventNames.ACTION_INIT` → `lifecycle` `"mounted"` and `_eventNames.ACTION_DESTROY` → `"disposed"` via shallow copy; else returns `state` unchanged

### `kdbControl/state/writers/writeSettingsSnapshot.js`

- **deps:** `[]`
- **return:** `function writeSettingsSnapshot(state, _payload)` returns `state` unchanged (stub)

### `kdbControl/state/writers/writeFrameworkView.js`

- **deps:** `[]`
- **return:** `function writeFrameworkView(state, _payload)` returns `state` unchanged (stub)

### `kdbControl/state/selectors.js`

- **deps:** `[]`
- **return:** object with five functions per contract paths; each returns subtree or `undefined` if missing

### `kdbControl/effects/__orchestratorEffects.js`

- **deps:** `[]`
- **return:** `function __orchestratorEffects(_KDB)` empty body (stub)

### `kdbControl/framework/__orchestratorFramework.js`

- **deps:** `[]`
- **return:** `function __orchestratorFramework(_KDB)` empty body

### `kdbControl/toolbox/__orchestratorToolbox.js`

- **deps:** `[]`
- **return:** `function __orchestratorToolbox(_KDB)` empty body

### `kdbControl/settings/__orchestratorSettings.js`

- **deps:** `[]`
- **return:** `function __orchestratorSettings(_KDB)` empty body

### `kdbControl/authoringMode/__orchestratorAuthoringMode.js`

- **deps:** `[]`
- **return:** `function __orchestratorAuthoringMode(_KDB)` empty body

### `kdbControl/createKdbControlController.js`

- **deps:** `"./state/initialState"`, `"./state/createKdbControlReducer"`, `"./effects/__orchestratorEffects"`, `"./framework/__orchestratorFramework"`, `"./toolbox/__orchestratorToolbox"`, `"./settings/__orchestratorSettings"`, `"./authoringMode/__orchestratorAuthoringMode"`, `"./events/eventNames"` (all relative to `kdbControl/`)
- **params:** `_initialState`, `_createKdbControlReducer`, `_effects`, `_framework`, `_toolbox`, `_settings`, `_authoringMode`, `_eventNames`
- **return:** `function createKdbControlController(_KDB)` returning API object `{ mount, destroy, dispatch, getState }` where:
  - `mount` sets `_KDB.runtime.kdbControl` to `{ domRefs: {}, listeners: {}, subscriptions: {}, pendingPromises: {} }`, sets `_KDB.state.kdbControl` to `reduce(_initialState(), { type: _eventNames.ACTION_INIT })`, calls the five subsystem orchestrators and `_effects` once each with `_KDB`
  - `destroy` sets state via reducer `ACTION_DESTROY`, sets `_KDB.runtime.kdbControl` to `null`
  - `dispatch` applies reducer to current ` _KDB.state.kdbControl`
  - `getState` returns `_KDB.state.kdbControl`

### `kdbControl/__orchestratorKdbControl.js`

- **deps:** `["./createKdbControlController"]`
- **param:** `_createKdbControlController`
- **return:** `function __orchestratorKdbControl(_KDB)` assigns `_KDB.api.kdbControl = _createKdbControlController(_KDB)`

### `harness/state/createMockKdbStateSeed.js`

- **deps:** `[]`
- **return:** `function createMockKdbStateSeed()` returns `{}` (stub for future seed merge)

### `harness/adapters/createMockKdb.js`

- **Non-AMD** IIFE: assign `window.createMockKdb`. Minimal `_KDB` shape: `api`, `state` (with `dashboard`, `kdbControl`, `tablesLoaded: Promise.resolve()`), `runtime`, `config`, `properties`, `elements` getters for `#app`, `#mock-dashboard-frame`, `#mock-main-host`, topic `events` with no-op subscribe/emit, `data.tables`, `cognosAPI` stubs per contract Section 8.
- **Deviation allowed:** not a full copy of legacy TEST color maps; condensed mock to satisfy Section J line limit; restore palette in real port.

### `harness/harness.js`

- **deps:** `["dashboard/canvas/kdbControl/__orchestratorKdbControl"]`
- **param:** `_orchestrator`
- **IIFE-equivalent:** `define` factory runs `boot` after wiring: build `_KDB` from `window.createMockKdb(document)`, call `_orchestrator(_KDB)`, attach `#harness-mount` / `#harness-destroy` to call `mount`/`destroy` and append lifecycle lines and literal `[kdbControl] mounted` on successful mount to `#harness-debug-log`

### `harness/index.html`

- Full `<!doctype html>`: load RequireJS from CDN; `script` `adapters/createMockKdb.js` before config; `require.config` with `baseUrl: "."` and `paths["dashboard/canvas/kdbControl"] = "../kdbControl"`; body ids: `app`, `mock-dashboard-frame`, `mock-main-host`, `harness-debug-log`, buttons `harness-mount`, `harness-destroy`; `require(["harness"])`

---

## Section D — Reducer stub

`createKdbControlReducer` returns reducer handling only `kdbControl/init` and `kdbControl/destroy` via `eventNames` constants; shallow-copy state object; other actions unchanged.

---

## Section E — Selector stub

Five one-liner functions per Section 5 of contract (nested paths).

---

## Section F — Public API wiring

`__orchestratorKdbControl` assigns `_KDB.api.kdbControl` from `createKdbControlController`. Runtime initialisation on `mount` per Section C.

---

## Section G — Harness HTML

As Section C `index.html` bullet.

---

## Section H — Harness JS

Append lifecycle strings (`idle→mounted` style or explicit `lifecycle: …` lines) on each `mount`/`destroy`. Log placeholder for emitted events only if harness emits none in stub (no invented emits).

---

## Section I — Mock extensions

`cognosAPI` canvas + glassMessages stubs; `data.tables`; `state.tablesLoaded = Promise.resolve()`.

---

## Section J — Acceptance criteria (self-verify)

1. Every path from Section B exists (except omitted).
2. Every `.js` uses AMD `define` except `createMockKdb.js` (explicitly non-AMD).
3. No file > 50 lines.
4. No nested function declarations inside `mount`/`destroy`/`dispatch`/AMD factory callbacks.
5. No imports outside `TEST/kdbControl-port/kdbControl/` and `TEST/kdbControl-port/harness/`.
6. `index.html` references only URLs under harness + CDN + `../kdbControl` map.
7. Report: path checklist + line counts + deviations.

---

## Section K — Forbidden actions

No edits to `.mdc`, `_template.md`, contract files; no CSS; no tests; no README; no commits; no invented runtime behavior beyond stubs; no reads of `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`.

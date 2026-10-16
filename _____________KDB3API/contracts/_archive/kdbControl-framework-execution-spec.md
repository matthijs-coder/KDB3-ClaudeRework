# Execution Spec: `kdbControl` (`framework tranche 1`)

> Delegated execution spec for the kdbControl framework subsystem after CP-1 approval of the framework tranche 1 contract delta.
> The executing AI must implement only the inert static framework primitives described here. It must not make architectural decisions or add behavior outside this spec.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/kdbControl.md`
**Phase:** `framework tranche 1`
**Authoring AI:** `GPT-5.5, 2026-05-12`
**Executing AI:** `<agent name + date when known>`
**Reviewer:** `user / mid-tier AI`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing or editing any output file. Its first response must echo one sentence per item. If any summary is missing or generic, execution stops.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` namespaces are fixed; no new top-level namespace is allowed.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable and owner-written; kdbControl owns `_KDB.state.kdbControl`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources live under `_KDB.runtime.<owner>` buckets; AbortControllers live under `abortControllers`.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — kdbControl remains a dispatch-style feature API with `mount`, `destroy`, `dispatch`, `getState`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no hardcoded event strings and no request-events in this tranche.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — respect Module Contract First, small files, folder roles, and orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — technical names are English; German is allowed only in user-facing labels.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables/subscribers/async; reducers exempt (pure, no try/catch); lifecycle boundaries convert errors.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors live under `_KDB.elements.selectors.kdbControl`; live refs live under `_KDB.runtime.kdbControl.domRefs`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — production-style files use one AMD `define([...], function (...) {})`; no ES modules or inline subfunctions inside entry bodies.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle terms are canonical; this tranche does not invent terms.
12. `_____________KDB3API/contracts/_template.md` — contract sections define ownership, runtime, API, events and folder layout.
13. `_____________KDB3API/contracts/kdbControl.md` — approved contract and framework tranche 1 delta.
14. This execution spec.

---

## Section B. Folder tree

Create or update exactly these files. Paths are relative to the project root.

```txt
TEST/kdbControl-port/
  kdbControl/
    createKdbControlController.js                 (update)
    events/
      eventNames.js                               (update; actions + existing event constants)
    state/
      initialState.js                             (update)
      createKdbControlReducer.js                  (update)
      selectors.js                                (update)
      writers/
        writeFrameworkView.js                     (update)
    framework/
      config/
        placeholderControlOptions.js              (new)
      __orchestratorFramework.js                  (replace stub)
      createFrameworkElement.js                   (new)
      buildControlShell.js                        (new)
      buildControlHeader.js                       (new)
      buildControlMainToggles.js                  (new)
      buildControlMainBlocks.js                   (new)
      buildControlPrimitiveGallery.js             (new)
      placeControlShell.js                        (new)
      bindFrameworkView.js                        (new)
      bindFrameworkCollapse.js                    (new)
      bindFrameworkTopToggles.js                  (new)
      bindFrameworkSectionToggles.js              (new)
      bindFrameworkPrimitiveVisuals.js            (new)
      syncFrameworkViewFromState.js               (new)
  harness/
    index.html                                    (update)
    harness.js                                    (update)
    adapters/
      createMockKdb.js                            (update)
```

Do not create CSS, README, tests, files under legacy trees, or new subsystem implementation files outside the tree above.

---

## Section C. Per-file specifications

Every file must satisfy its `Rules to apply` list before the executing AI moves to the next file.

### `TEST/kdbControl-port/kdbControl/events/eventNames.js`

- **Role:** action and event constants registry.
- **Lines:** target 20, hard limit 60.
- **AMD imports:** none.
- **Entry function:** none; return one object literal from the AMD factory.
- **Required constants:** keep existing constants and add action constants:
  - `ACTION_FRAMEWORK_SELECT_PANEL: "kdbControl/framework/selectPanel"`
  - `ACTION_FRAMEWORK_TOGGLE_COLLAPSE: "kdbControl/framework/toggleCollapse"`
  - `ACTION_FRAMEWORK_TOGGLE_SECTION: "kdbControl/framework/toggleSection"`
  - `ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT: "kdbControl/framework/setPlaceholderInput"`
  - `ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION: "kdbControl/framework/setPlaceholderSelection"`
- **Rules to apply:**
  - `amd.mdc` — one AMD factory returning one value.
  - `naming.mdc` — action names use slash-style `<module>/<action>`, English technical names.
  - `events.mdc` — these are actions, not emitted events; do not add new event strings.

### `TEST/kdbControl-port/kdbControl/state/initialState.js`

- **Role:** initial state factory.
- **Lines:** target 20, hard limit 60.
- **AMD imports:** none.
- **Entry function:** `initialState()`.
- **Body steps:** return root state with `lifecycle: "idle"`, `framework`, `toolbox`, `settings`, `authoringMode`.
- **Framework shape:** exactly:
  ```js
  framework: {
    activeTopPanel: "metrics",
    openSectionId: null,
    isCollapsed: false,
    placeholderInputs: {},
    placeholderSelections: {}
  }
  ```
- **Rules to apply:**
  - `state.mdc` — state is JSON-serializable; no DOM, listeners, promises or functions.
  - `naming.mdc` — English technical values (`metrics`, not `kennzahlen`).
  - `lifecycleVocabulary.md` — `idle` is canonical.
  - `amd.mdc` — AMD factory returns the state factory.

### `TEST/kdbControl-port/kdbControl/state/createKdbControlReducer.js`

- **Role:** pure reducer factory.
- **Lines:** target 80, hard limit 150.
- **AMD imports:** `../events/eventNames`.
- **Entry function:** `createKdbControlReducer()`.
- **Reducer behavior:** keep existing init/destroy/error handling and add pure framework action handling:
  - `ACTION_FRAMEWORK_SELECT_PANEL` sets `framework.activeTopPanel` to payload `panelId`, defaulting invalid values to current state.
  - `ACTION_FRAMEWORK_TOGGLE_COLLAPSE` toggles or sets `framework.isCollapsed` from payload `isCollapsed`.
  - `ACTION_FRAMEWORK_TOGGLE_SECTION` sets `framework.openSectionId` to payload `sectionId`, or `null` when the clicked section is already open.
  - `ACTION_FRAMEWORK_SET_PLACEHOLDER_INPUT` writes `placeholderInputs[inputId] = value`.
  - `ACTION_FRAMEWORK_SET_PLACEHOLDER_SELECTION` writes `placeholderSelections[controlId] = value`.
- **Implementation discipline:** clone only the needed root/framework/placeholder objects; never mutate the input state object.
- **Rules to apply:**
  - `state.mdc` — reducer is pure, writes only owned `_KDB.state.kdbControl`.
  - `feature-structure.mdc` — reducer lives under `state/`; keep file below hard limit.
  - `naming.mdc` — English technical action fields (`panelId`, `sectionId`, `controlId`).
  - `error-handling.mdc` — reducers exempt — pure, no try/catch for invalid payloads; ignore/normalize.
  - `amd.mdc` — one AMD factory, no inline subfunction definitions inside reducer body.

### `TEST/kdbControl-port/kdbControl/state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 40, hard limit 100.
- **AMD imports:** none.
- **Return value:** object containing existing settings selectors plus:
  - `readFrameworkActiveTopPanel(state)`
  - `readFrameworkOpenSectionId(state)`
  - `readFrameworkCollapsed(state)`
  - `readFrameworkPlaceholderInputs(state)`
  - `readFrameworkPlaceholderSelections(state)`
- **Do not expose:** `readVisibilityState` or `readFrameworkViewUi` unless matching state fields are added in a later approved contract delta.
- **Rules to apply:**
  - `state.mdc` — selectors are read-only and pure.
  - `module-public-api.mdc` — granular reads use selectors, not `_KDB.api.kdbControl.read*`.
  - `naming.mdc` — selector names use `read*`.
  - `amd.mdc` — one AMD factory returning one registry.

### `TEST/kdbControl-port/kdbControl/state/writers/writeFrameworkView.js`

- **Role:** owner-internal writer helper for framework subtree.
- **Lines:** target 40, hard limit 80.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB, _nextFramework)`.
- **Body steps:** ensure `_KDB.state.kdbControl.framework` exists and shallow-copy serializable values from `_nextFramework` into it.
- **Usage boundary:** called only by kdbControl-owned controller/reducer flow if needed; not imported by consumers.
- **Rules to apply:**
  - `state.mdc` — owner writer only, no foreign state writes, serializable state only.
  - `module-public-api.mdc` — not a public API method.
  - `naming.mdc` — boundary args use underscore prefix.
  - `amd.mdc` — normal executable file returns `__controller`.

### `TEST/kdbControl-port/kdbControl/createKdbControlController.js`

- **Role:** dispatch-style public API controller factory.
- **Lines:** target 100, hard limit 150.
- **AMD imports:** keep existing imports.
- **Required change:** call framework orchestrator as `_fw(_KDB, { dispatch: dispatch, getState: getState })` from `mount`.
- **Required method extraction:** define `getState()` as a named factory-scope method inside `createKdbControlController` scope, not an anonymous inline return member.
- **Runtime initialization:** initialize `_KDB.runtime.kdbControl` with `domRefs`, `listeners`, `abortControllers`, `subscriptions`, `pendingPromises`.
- **Destroy order:** unsubscribe `subscriptions`, abort every `abortControllers` entry, then run reducer destroy, then clear/null runtime.
- **Disposed behavior:** keep current skeleton behavior unless already present; do not add new public methods.
- **Rules to apply:**
  - `module-public-api.mdc` — public surface remains `mount`, `destroy`, `dispatch`, `getState`; no `registerControl`.
  - `runtime.mdc` — AbortControllers under `abortControllers`, not `listeners`; cleanup before nulling runtime.
  - `error-handling.mdc` — `mount` and `destroy` remain try/catch boundaries with contextual `console.error`.
  - `state.mdc` — dispatch is sole mutation path for kdbControl-owned state.
  - `amd.mdc` — no inline subfunction definitions inside return path or callbacks.

### `TEST/kdbControl-port/kdbControl/framework/config/placeholderControlOptions.js`

- **Role:** placeholder-only config for harness-visible primitives.
- **Lines:** target 40, hard limit 120.
- **AMD imports:** none.
- **Return value:** serializable object with:
  - `radioOptions`: two or three German-label placeholder options with English `value` ids.
  - `dropdownOptions`: two or three German-label placeholder options with English `value` ids.
  - `inputPlaceholders`: one or two input definitions with English `id` and German `label` / `placeholder`.
- **No behavior:** no action names, no callbacks, no Cognos values, no business semantics.
- **Rules to apply:**
  - `state.mdc` — config is serializable, not runtime state.
  - `naming.mdc` — technical ids/values English; user-facing labels may be German.
  - `feature-structure.mdc` — config belongs in the framework config folder for this tranche.
  - `amd.mdc` — one AMD factory returning one object.

### `TEST/kdbControl-port/kdbControl/framework/createFrameworkElement.js`

- **Role:** DOM element builder helper.
- **Lines:** target 30, hard limit 80.
- **AMD imports:** none.
- **Entry function:** `__controller(_tagName, _id, _className, _attributes)`.
- **Body steps:** create element, set optional id/class/attributes, return element.
- **Rules to apply:**
  - `dom.mdc` — builder creates detached DOM; no state mutation, no listener binding.
  - `naming.mdc` — boundary parameters use underscore prefix.
  - `amd.mdc` — normal executable file returns `__controller`.

### `TEST/kdbControl-port/kdbControl/framework/buildControlShell.js`

- **Role:** view builder for the full detached control shell.
- **Lines:** target 80, hard limit 150.
- **AMD imports:** `./createFrameworkElement`, `./buildControlHeader`, `./buildControlMainToggles`, `./buildControlMainBlocks`, `./buildControlPrimitiveGallery`.
- **Entry function:** `__controller(_KDB)`.
- **Body steps:** build shell root, content container, arrow control, header, main toggles, main blocks, primitive gallery; return detached shell.
- **Required ids/classes:** use English technical ids: `kdb-control_metrics_container`, `kdb-control_metrics_toggle`; labels may say "Kennzahlen".
- **Rules to apply:**
  - `dom.mdc` — builder only; no attach, no listeners, no state writes.
  - `naming.mdc` — English technical names; CSS classes remain kebab-case with `kdb-` prefix.
  - `feature-structure.mdc` — builder role under framework folder.
  - `amd.mdc` — imports match parameters; helpers at factory scope.

### `TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js`

- **Role:** detached header builder.
- **Lines:** target 50, hard limit 100.
- **AMD imports:** `./createFrameworkElement`.
- **Entry function:** `__controller(_KDB)`.
- **Body steps:** build title text "Dashboard-Steuerung" and an inert settings/info area if needed for visual parity; links/buttons do not dispatch behavior.
- **Rules to apply:**
  - `dom.mdc` — no listener binding or state writes.
  - `naming.mdc` — technical ids/classes English; German label text allowed.
  - `events.mdc` — no event emission.
  - `amd.mdc` — one factory returns `__controller`.

### `TEST/kdbControl-port/kdbControl/framework/buildControlMainToggles.js`

- **Role:** detached top-panel toggle builder.
- **Lines:** target 50, hard limit 100.
- **AMD imports:** `./createFrameworkElement`.
- **Entry function:** `__controller(_KDB)`.
- **Controls:** build inert buttons for `metrics`, `toolbox`, `settings`; labels "Kennzahlen", "Toolbox", "Einstellungen".
- **Data attributes:** `data-panel-id="metrics|toolbox|settings"`.
- **Rules to apply:**
  - `dom.mdc` — builder only; no listeners.
  - `naming.mdc` — technical values English, label text can be German.
  - `state.mdc` — no state mutation from builder.
  - `amd.mdc` — normal executable file shape.

### `TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js`

- **Role:** detached containers for top-level panels and groups.
- **Lines:** target 70, hard limit 130.
- **AMD imports:** `./createFrameworkElement`.
- **Entry function:** `__controller(_KDB)`.
- **Body steps:** build `metrics`, `toolbox`, `settings` containers; within toolbox/settings create placeholder expandable group shells with `data-section-id` English values.
- **Rules to apply:**
  - `dom.mdc` — builder only; no state writes.
  - `naming.mdc` — English ids (`metrics`, `settingsLayout`, `toolboxBasics`), German visible labels allowed.
  - `feature-structure.mdc` — keep focused and below hard limit.
  - `amd.mdc` — no nested subfunctions inside entry body.

### `TEST/kdbControl-port/kdbControl/framework/buildControlPrimitiveGallery.js`

- **Role:** detached primitive demo builder.
- **Lines:** target 100, hard limit 150.
- **AMD imports:** `./createFrameworkElement`, `./config/placeholderControlOptions`.
- **Entry function:** `__controller(_KDB)`.
- **Body steps:** build one inert button row, one text input row, one radio group and one dropdown/select or dropdown container using placeholder config.
- **Data attributes:** inputs use `data-placeholder-input-id`; radio/dropdown use `data-placeholder-control-id`.
- **No real behavior:** do not set `data-kdb-action`; do not emit events; do not call services.
- **Rules to apply:**
  - `dom.mdc` — builder only; no listener binding or state mutation.
  - `state.mdc` — placeholder values are not business state and are only recorded by controller actions later.
  - `naming.mdc` — technical ids English; German labels/placeholders allowed.
  - `amd.mdc` — helper functions at factory scope only.

### `TEST/kdbControl-port/kdbControl/framework/placeControlShell.js`

- **Role:** placer for the built shell.
- **Lines:** target 50, hard limit 100.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB, _shell)`.
- **Body steps:** resolve mount root from `_KDB.elements.controlRoot()` first, then `_KDB.elements.selectors.kdbControl.rootSelector` scoped through `document.querySelector` only as a documented harness mount-root exception; attach shell if not already present; store live refs under `_KDB.runtime.kdbControl.domRefs`.
- **Rules to apply:**
  - `dom.mdc` — placer attaches DOM and stores live refs in runtime, not state.
  - `runtime.mdc` — runtime refs under `_KDB.runtime.kdbControl.domRefs`.
  - `naming.mdc` — boundary parameters use underscore prefix.
  - `amd.mdc` — one AMD factory.

### `TEST/kdbControl-port/kdbControl/framework/bindFrameworkView.js`

- **Role:** binder orchestrator for framework visual interactions.
- **Lines:** target 70, hard limit 120.
- **AMD imports:** `./bindFrameworkCollapse`, `./bindFrameworkTopToggles`, `./bindFrameworkSectionToggles`, `./bindFrameworkPrimitiveVisuals`, `./syncFrameworkViewFromState`.
- **Entry function:** `__controller(_KDB, _surface)`.
- **Body steps:** abort previous `_KDB.runtime.kdbControl.abortControllers.frameworkView` if present; create new AbortController; store it; build context `{ _KDB, dispatch, getState, rootEl, contentEl }`; bind collapse/top/section/primitive handlers; run sync.
- **Rules to apply:**
  - `runtime.mdc` — AbortController stored in `abortControllers.frameworkView`, not `listeners`.
  - `dom.mdc` — listeners are thin and dispatch visual-only actions; no inline state mutation.
  - `error-handling.mdc` — binder returns false on missing DOM; no silent failures that hide lifecycle errors.
  - `amd.mdc` — no inline subfunctions inside entry body.

### `TEST/kdbControl-port/kdbControl/framework/bindFrameworkCollapse.js`

- **Role:** visual collapse listener binder.
- **Lines:** target 60, hard limit 100.
- **AMD imports:** `../events/eventNames`.
- **Entry function:** `__controller(_ctx, _signal)`.
- **Behavior:** click/Enter/Space on arrow dispatches `ACTION_FRAMEWORK_TOGGLE_COLLAPSE` with the next boolean value; then calls sync through context if provided.
- **Rules to apply:**
  - `runtime.mdc` — listener cleanup is via passed AbortSignal.
  - `dom.mdc` — listener body is thin; no direct state mutation.
  - `state.mdc` — state change goes through dispatch/reducer.
  - `amd.mdc` — handlers at factory scope; no nested functions.

### `TEST/kdbControl-port/kdbControl/framework/bindFrameworkTopToggles.js`

- **Role:** top-panel toggle listener binder.
- **Lines:** target 70, hard limit 120.
- **AMD imports:** `../events/eventNames`.
- **Entry function:** `__controller(_ctx, _signal)`.
- **Behavior:** delegated click/Enter/Space on `[data-panel-id]` dispatches `ACTION_FRAMEWORK_SELECT_PANEL` with English `panelId`.
- **Rules to apply:**
  - `dom.mdc` — scoped delegated listener under framework content/root.
  - `naming.mdc` — `panelId` values are English.
  - `state.mdc` — dispatch only, no direct writes.
  - `amd.mdc` — handlers are factory-scope declarations.

### `TEST/kdbControl-port/kdbControl/framework/bindFrameworkSectionToggles.js`

- **Role:** expandable group listener binder.
- **Lines:** target 70, hard limit 120.
- **AMD imports:** `../events/eventNames`.
- **Entry function:** `__controller(_ctx, _signal)`.
- **Behavior:** delegated click/Enter/Space on `[data-section-id]` dispatches `ACTION_FRAMEWORK_TOGGLE_SECTION` with English `sectionId`.
- **Rules to apply:**
  - `dom.mdc` — scoped listeners, no direct state mutation.
  - `runtime.mdc` — cleanup via AbortSignal.
  - `state.mdc` — open/close state through reducer only.
  - `amd.mdc` — factory-scope handlers only.

### `TEST/kdbControl-port/kdbControl/framework/bindFrameworkPrimitiveVisuals.js`

- **Role:** inert primitive value listener binder.
- **Lines:** target 90, hard limit 140.
- **AMD imports:** `../events/eventNames`.
- **Entry function:** `__controller(_ctx, _signal)`.
- **Behavior:** delegated `input` / `change` events for placeholder text/radio/dropdown controls dispatch placeholder actions only; inert buttons may log/mark selected locally through dispatch if represented in `placeholderSelections`.
- **Forbidden:** no `data-kdb-action`, no events, no services, no header/footer/tab calls.
- **Rules to apply:**
  - `dom.mdc` — listener body delegates to dispatch and sync; no business logic.
  - `state.mdc` — writes only kdbControl framework placeholder fields through reducer.
  - `events.mdc` — no event bus emission.
  - `amd.mdc` — no inline subfunctions inside event callbacks; use named factory-scope handlers.

### `TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js`

- **Role:** mutator syncing DOM classes/values from state.
- **Lines:** target 100, hard limit 150.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB)`.
- **Behavior:** read `_KDB.state.kdbControl.framework`; apply selected/visible/collapsed classes and placeholder form values to DOM refs under `_KDB.runtime.kdbControl.domRefs`; do not write state.
- **Required classes:** `KDB_visible`, `kdb-control_selected`, `kdb-control_collapsed`, `kdb-control_content_hidden`.
- **Rules to apply:**
  - `dom.mdc` — mutator reads state and mutates DOM only; no state writes.
  - `runtime.mdc` — reads own runtime refs only.
  - `state.mdc` — state read is owner-owned.
  - `amd.mdc` — one AMD factory returning `__controller`.

### `TEST/kdbControl-port/kdbControl/framework/__orchestratorFramework.js`

- **Role:** thin framework subsystem orchestrator.
- **Lines:** target 60, hard limit 120.
- **AMD imports:** `./buildControlShell`, `./placeControlShell`, `./bindFrameworkView`, `./syncFrameworkViewFromState`.
- **Entry function:** `__orchestrator(_KDB, _surface)`.
- **Body steps:** build shell, place shell, bind framework view with dispatch/getState surface, sync from state, return placed shell or `null`.
- **Rules to apply:**
  - `feature-structure.mdc` — orchestrator wires only; no business logic or listener bodies.
  - `dom.mdc` — builder/placer/binder/mutator split.
  - `runtime.mdc` — relies on runtime refs and AbortController cleanup.
  - `amd.mdc` — entry function named `__orchestrator`; one returned value.

### `TEST/kdbControl-port/harness/index.html`

- **Role:** local browser harness page.
- **Lines:** target 50, hard limit 120.
- **Required updates:** add minimal inline harness styles for visibility/collapsed classes and a `Log state` button; keep RequireJS loading.
- **Rules to apply:**
  - `amd.mdc` — harness exception applies; RequireJS remains acceptable.
  - `dom.mdc` — harness can provide mount roots and debug UI; production DOM rules apply to kdbControl files.

### `TEST/kdbControl-port/harness/harness.js`

- **Role:** browser harness runner.
- **Lines:** target 60, hard limit 120.
- **AMD imports:** `dashboard/canvas/kdbControl/__orchestratorKdbControl`.
- **Behavior:** mount/destroy buttons call public API; log lifecycle and framework state; expose no production-only globals except local mock `_KDB` if useful for browser inspection.
- **Rules to apply:**
  - `module-public-api.mdc` — harness uses `_KDB.api.kdbControl.mount/destroy/getState`; no internal module imports.
  - `amd.mdc` — harness can use AMD; no direct ES import of production AMD.

### `TEST/kdbControl-port/harness/adapters/createMockKdb.js`

- **Role:** mock `_KDB` factory.
- **Lines:** target 70, hard limit 140.
- **Required updates:** add `_KDB.elements.selectors.kdbControl` selector strings; add `runtime.kdbControl` only if needed by initial mount; do not add real Cognos behavior.
- **Rules to apply:**
  - `kdb-object.mdc` — mock uses allowed namespaces only.
  - `dom.mdc` — selector strings under `_KDB.elements.selectors.kdbControl`; live refs are not stored in `_KDB.elements`.
  - `runtime.mdc` — runtime objects remain under `_KDB.runtime`.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `kdbControl/init` | `mount()` | root lifecycle becomes `mounted`; framework initial shape exists | `idle -> mounted` |
| `kdbControl/destroy` | `destroy()` | root lifecycle becomes `disposed` | `mounted/ready/error -> disposed` |
| `kdbControl/error` | catch in `mount`/`destroy` | root lifecycle becomes `error`; set `errorCode`, `errorMessage` | any -> `error` |
| `kdbControl/framework/selectPanel` | top toggle click/key | `framework.activeTopPanel = panelId`; clear `openSectionId` if panel changes | none |
| `kdbControl/framework/toggleCollapse` | arrow click/key | `framework.isCollapsed` toggles or is set from payload | none |
| `kdbControl/framework/toggleSection` | group click/key | `framework.openSectionId` toggles between clicked section and `null` | none |
| `kdbControl/framework/setPlaceholderInput` | input event | `framework.placeholderInputs[inputId] = value` | none |
| `kdbControl/framework/setPlaceholderSelection` | radio/dropdown/change | `framework.placeholderSelections[controlId] = value` | none |

---

## Section E. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readFrameworkActiveTopPanel` | `state.framework.activeTopPanel` | English panel id string |
| `readFrameworkOpenSectionId` | `state.framework.openSectionId` | English section id or `null` |
| `readFrameworkCollapsed` | `state.framework.isCollapsed` | boolean |
| `readFrameworkPlaceholderInputs` | `state.framework.placeholderInputs` | object |
| `readFrameworkPlaceholderSelections` | `state.framework.placeholderSelections` | object |

Existing settings selectors may stay unchanged if still present. Do not expose selectors for absent fields.

---

## Section F. Public API wiring

- Surface: `_KDB.api.kdbControl`
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`
- No new public methods.
- Runtime initialization: `domRefs`, `listeners`, `abortControllers`, `subscriptions`, `pendingPromises`
- State initialization: `_KDB.state.kdbControl.framework` as approved in the contract delta.
- Framework orchestrator call: `_fw(_KDB, { dispatch: dispatch, getState: getState })`

---

## Section G. Harness HTML spec

Use the existing harness page and add only:

- minimal styles for `.KDB_visible`, `.kdb-control_selected`, `.kdb-control_collapsed`, `.kdb-control_content_hidden`;
- a `Log state` button with id `harness-log-state`;
- no external CSS file.

---

## Section H. Harness JS spec

Harness flow:

1. Create mock `_KDB`.
2. Run `__orchestratorKdbControl(_KDB)`.
3. Mount button calls `_KDB.api.kdbControl.mount({})`.
4. Destroy button calls `_KDB.api.kdbControl.destroy()`.
5. Log-state button writes `JSON.stringify(_KDB.api.kdbControl.getState().framework, null, 2)` to the debug log.
6. Manual browser verification clicks the rendered top toggles, expandable groups, collapse arrow, input, radio and dropdown controls.

---

## Section I. Mock extensions

The mock `_KDB` must provide:

- `_KDB.elements.controlRoot()` returning `#app`;
- `_KDB.elements.selectors.kdbControl.rootSelector`;
- `_KDB.events.subscribe` and `_KDB.events.emit` stubs;
- `_KDB.runtime` object;
- `_KDB.state.dashboard.isAuthoring`;
- `_KDB.state.kdbControl` initially `null`;
- existing Cognos stubs may remain, but framework tranche 1 must not call them.

---

## Section J. Acceptance criteria

The executing AI must self-verify all criteria before reporting back.

1. Every file in Section B exists or is explicitly documented as unchanged because it already matched the spec.
2. The first executing-AI response contains the 14 pre-flight summaries from Section A.
3. No file under `_____________KDB3API/.cursor/rules/`, templates, or legacy trees was modified.
4. No technical value/id/ref uses German (`kennzahlen`) where English is required; use `metrics`.
5. `_KDB.state.kdbControl.framework` is serializable and matches the approved contract shape.
6. AbortControllers are stored under `_KDB.runtime.kdbControl.abortControllers`, not `listeners`.
7. Selectors match actual state fields; no selectors for `visibility` or `frameworkViewUi` in this tranche.
8. `_KDB.api.kdbControl` exposes only `mount`, `destroy`, `dispatch`, `getState`.
9. No framework interaction emits events, calls Cognos, calls services, writes dashboard canvas, or mutates widget/filter/launchpad/tab/header/footer/history/tableData state.
10. Builders do not attach DOM or bind listeners; placer attaches; binders bind thin listeners; mutator syncs DOM from state.
11. `mount` and `destroy` remain try/catch lifecycle boundaries.
12. `destroy` unsubscribes subscriptions, aborts abortControllers, then clears runtime.
13. Browser harness can mount, visually switch panels, open/close groups, collapse/expand, update placeholder input/radio/dropdown state, log framework state, and destroy without console errors.

---

## Section K. Forbidden actions

The executing AI must not:

- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, contract templates, or litmustest reports.
- Modify `_____________KDB3API/contracts/kdbControl.md` or this execution spec during execution.
- Read or modify legacy trees except for the already identified read-only reference paths if explicitly needed for comparison.
- Add `controlDefinitions[]` or `config/controlDefinitions.js`.
- Add `registerControl` or `registerCustomControl`.
- Add real behavior behind buttons, inputs, radio buttons, dropdowns or expand/collapse controls.
- Emit request-events or fact-events from framework tranche 1.
- Call Cognos APIs, tableDataService, history, header/footer/tabs/widgets/filters/launchpad APIs.
- Commit, push, change git config, or run destructive git commands.

---

## Section L. Reporting template

The executing AI's final response must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every created/updated path, line count, and `matches spec | deviation`.
3. **Deviations** — each deviation with path, motivation and rule consulted.
4. **Self-verification** — pass/fail for each Section J criterion.
5. **Open questions** — only if the spec was incomplete; otherwise state `none`.

---

## Section M. Reviewer handoff

The supervising AI must:

1. Verify the 14 summaries are present and non-generic.
2. Read every touched file.
3. Run `ReadLints` on touched `.js` files.
4. Cross-check each file against Section C `Rules to apply`.
5. Verify anti-D1 (`mount`/`destroy` and other mandatory functions have try/catch; lifecycle methods convert errors) and anti-D2 (cleanup order and abortControllers bucket).
6. Stop at CP-2 and ask the user to perform browser-level verification in `TEST/kdbControl-port/harness/index.html`.


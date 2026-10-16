# Execution Spec: `historyControls` (direct production port)

> Direct-port execution spec for the `historyControls` thin dashboard UI consumer.
> Execute only after CP-1 approval of `contracts/historyControls.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/historyControls.md`
**Phase:** `direct production port`
**Authoring AI:** GPT-5.5, 2026-05-17
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing output files and must echo one sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces and ownership map.
2. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state, canonical writers, no foreign state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources under `_KDB.runtime.<owner>` with explicit cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — one public surface per module and disposed guards on public methods.
5. `_____________KDB3API/.cursor/rules/events.mdc` — event constants, event catalog, subscription cleanup and no hardcoded event strings.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, actions/events and underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors in `_KDB.elements.selectors`, live refs in runtime, scoped DOM queries.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — verify disposal and lifecycle terms if lifecycle language is used.
12. `_____________KDB3API/contracts/_executionSpecTemplate.md` — execution-spec checklist discipline.
13. `_____________KDB3API/contracts/historyControls.md` — CP-1 contract for this module.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create or modify only these production files after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/dashboard/controls/historyControls/
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

_____________KDB3API/KDB3/css/historyControls.css

Modify:
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/core/css/config/cssHrefList.js
_____________KDB3API/architecture/eventSubscribe.md
```

If `KDB3/js/dashboard/controls/` is absent in the working tree, create it exactly as the parent folder for `historyControls/`; do not choose a different placement.

Do not create:

```txt
KDB3/js/dashboard/controls/historyControls/state/
KDB3/js/dashboard/controls/historyControls/events/
```

---

## Section C. Direct-port mapping

| New production file | Legacy evidence file | Rule-alignment note |
|---|---|---|
| `__orchestratorHistoryControls.js` | `dashboard/historyControls/__historyControlsOrchestrator.js` | Convert legacy orchestrator into thin AMD orchestrator that registers `_KDB.api.historyControls`; no business logic. |
| `createHistoryControlsController.js` | `dashboard/historyControls/__historyControlsOrchestrator.js` | Move lifecycle, mount, destroy, service calls and cleanup into a controller factory with disposed guard. |
| `config/domSelectors.js` | `dashboard/historyControls/mountHistoryButtons.js` | Move hardcoded selectors into selector config and register under `_KDB.elements.selectors.historyControls`. |
| `view/buildHistoryControls.js` | `dashboard/historyControls/mountHistoryButtons.js` | Build detached DOM with kebab `kdb-` classes and data attributes; no listeners or state writes. |
| `view/placeHistoryControls.js` | `dashboard/historyControls/mountHistoryButtons.js` | Wait/placement logic with runtime DOM refs and idempotent duplicate prevention. |
| `view/syncHistoryControlsView.js` | `dashboard/historyControls/updateHistoryButtonsState.js` | Sync disabled state from event payload or history service methods; no global KDB lookup. |
| `effects/bindHistoryControlsClick.js` | `dashboard/historyControls/__historyControlsOrchestrator.js` | Replace document-level listener with root-scoped click listener using AbortController cleanup. |
| `effects/subscribeHistoryChanged.js` | `dashboard/historyControls/__historyControlsOrchestrator.js` + `base/events/history.js` | Import event constant from `historyService/events/eventNames.js`, store unsubscribe in runtime. |
| `observation/bindToolbarObserver.js` | `dashboard/historyControls/__historyControlsOrchestrator.js` | Observe Cognos toolbar rebuilds; store observer in runtime and disconnect on destroy. |
| `css/historyControls.css` | `css/KDB.css` history button block | Port only custom button styling; use kebab classes; do not port Cognos native undo/redo plugin policy. |
| `KDB.js` | `REDESIGN2/KDB.js` startup lines for historyControls | Add import/register/mount/destroy wiring in existing root bootstrap style. |
| `cssHrefList.js` | Production CSS loader pattern | Register new stylesheet path. |
| `eventSubscribe.md` | Existing `history:changed` catalog placeholder | Replace `TBD` subscriber with concrete `historyControls` subscriber and teardown owner. |

---

## Section D. Per-file specifications

### `KDB3/js/dashboard/controls/historyControls/config/domSelectors.js`

- **Role:** selector config.
- **Lines:** target 15-30.
- **AMD imports:** none.
- **Entry function / return value:** return object literal:

```js
{
  toolbarHostSelector: '[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading',
  rootSelector: '[data-kdb-history-controls="true"]',
  undoButtonSelector: '[data-kdb-history-action="undo"]',
  redoButtonSelector: '[data-kdb-history-action="redo"]'
}
```

- **Rules to apply:**
  - `amd.mdc` — one explicit AMD `define([], function () { ... })`.
  - `dom.mdc` — selector strings only; no live DOM refs.
  - `naming.mdc` — English technical names and camelCase keys.

### `KDB3/js/dashboard/controls/historyControls/__orchestratorHistoryControls.js`

- **Role:** feature orchestrator.
- **Lines:** target 35-70.
- **AMD imports:**
  - `"./config/domSelectors.js"`
  - `"./createHistoryControlsController.js"`
- **Factory parameters:** `_domSelectors`, `_createHistoryControlsController`.
- **Entry function:** `__orchestrator(_KDB)`.
- **Body steps:**
  1. Ensure `_KDB.api`, `_KDB.runtime`, `_KDB.elements` and `_KDB.elements.selectors` exist.
  2. Register selector config at `_KDB.elements.selectors.historyControls`, preserving existing keys if already present.
  3. Normalize `_KDB.runtime.historyControls` to standard buckets: `domRefs`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`.
  4. Create controller with `_createHistoryControlsController(_KDB)`.
  5. Assign `_KDB.api.historyControls = controller`.
  6. Return controller.
- **Return value:** `__orchestrator`.
- **Rules to apply:**
  - `amd.mdc` — full-compact AMD shape, no inline subfunctions inside entry function.
  - `feature-structure.mdc` — thin orchestrator, wiring only.
  - `kdb-object.mdc` — register only under allowed `_KDB.api`, `_KDB.runtime`, `_KDB.elements.selectors`.
  - `runtime.mdc` — initialize runtime buckets without storing serializable state.
  - `dom.mdc` — selector config under `_KDB.elements.selectors.historyControls`.

### `KDB3/js/dashboard/controls/historyControls/createHistoryControlsController.js`

- **Role:** controller factory.
- **Lines:** target 90-140, hard limit 150.
- **AMD imports:**
  - `"../../../../core/utils/waitForElObserver.js"`
  - `"./view/placeHistoryControls.js"`
  - `"./view/syncHistoryControlsView.js"`
  - `"./effects/bindHistoryControlsClick.js"`
  - `"./effects/subscribeHistoryChanged.js"`
  - `"./observation/bindToolbarObserver.js"`
- **Factory parameters:** `_waitForElObserver`, `_placeHistoryControls`, `_syncHistoryControlsView`, `_bindHistoryControlsClick`, `_subscribeHistoryChanged`, `_bindToolbarObserver`.
- **Factory-scope helpers:**
  - `function readRuntime(_KDB)` — returns `_KDB.runtime.historyControls`.
  - `function resetRuntime(_KDB)` — resets runtime standard buckets after cleanup.
  - `function clearSubscriptions(runtime)` — calls all function values in `subscriptions`.
  - `function abortControllers(runtime)` — aborts all AbortController values.
  - `function disconnectObservers(runtime)` — disconnects all observer values.
  - `function removePlacedRoot(runtime)` — removes `domRefs.rootEl` if still attached.
  - `function clearTimers(runtime)` — clears timeout/interval handles.
- **Entry function:** `createHistoryControlsController(_KDB)`.
- **Controller closure:** `var isDisposed = false; var didWarnMissingHistoryService = false;`.
- **Public methods:**
  - `mount(_options)`
  - `destroy()`
- **`mount` body steps:**
  1. Wrap body in `try/catch`; log `console.error("[historyControls.mount]", error)` and return `false` on failure.
  2. If `isDisposed` is true, warn and return `false`.
  3. Ensure runtime bucket exists.
  4. Resolve history service from `_KDB.services.history`; if missing, warn once but still allow disabled controls to mount.
  5. If a mount promise exists in `runtime.pendingPromises.mount`, return `true`.
  6. Create `AbortController` for mount wait when supported and store at `runtime.abortControllers.mount`.
  7. Start `_waitForElObserver(selectors.toolbarHostSelector, document, { timeoutMs: 30000, signal })`.
  8. In the promise chain, if disposed or aborted, stop.
  9. Call `_placeHistoryControls(_KDB, toolbarHostEl)`.
  10. Call `_bindHistoryControlsClick(_KDB, { sync: sync })`.
  11. Call `_subscribeHistoryChanged(_KDB, { sync: sync })`.
  12. Call `_bindToolbarObserver(_KDB, { remount: remountAndSync })`.
  13. Call `_syncHistoryControlsView(_KDB)`.
  14. Clear `pendingPromises.mount` on settle.
- **`destroy` body steps:**
  1. If already disposed, return.
  2. Set `isDisposed = true` before cleanup.
  3. Wrap cleanup in `try/catch`; log `console.error("[historyControls.destroy]", error)` on failure.
  4. Abort controllers.
  5. Clear subscriptions.
  6. Disconnect observers.
  7. Clear timers and pending promises.
  8. Remove placed root DOM.
  9. Reset runtime buckets.
- **Rules to apply:**
  - `module-public-api.mdc` — minimal lifecycle public surface; disposed guard; no dispatch because CP-1 approves narrow lifecycle surface.
  - `runtime.mdc` — all listeners/subscriptions/observers/pending promises are stored and cleaned.
  - `error-handling.mdc` — mandatory try/catch on mount/destroy and async helpers; lifecycle boundaries convert errors.
  - `state.mdc` — no `_KDB.state.historyControls` and no direct `_KDB.state.history` writes.
  - `dom.mdc` — live refs under runtime only.
  - `amd.mdc` — no nested helper declarations inside public methods or callbacks.

### `KDB3/js/dashboard/controls/historyControls/view/buildHistoryControls.js`

- **Role:** DOM builder.
- **Lines:** target 40-80.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB)`.
- **Body steps:**
  1. Create detached root `div`.
  2. Set class `kdb-history-controls`.
  3. Set `data-kdb-history-controls="true"`.
  4. Build two item wrappers and buttons using DOM APIs, not `innerHTML`.
  5. Undo button: type `button`, class `kdb-history-controls__button`, action `undo`, aria-label/title `Undo`, text/icon `Undo` or a simple text icon.
  6. Redo button: same for `redo`.
  7. Return root element.
- **Rules to apply:**
  - `dom.mdc` — builder creates detached DOM only; no placement, no listener binding, no state writes.
  - `naming.mdc` — kebab CSS classes with `kdb-` prefix.
  - `amd.mdc` — one controller function; helper functions at factory scope if needed.

### `KDB3/js/dashboard/controls/historyControls/view/placeHistoryControls.js`

- **Role:** DOM placer.
- **Lines:** target 50-90.
- **AMD imports:**
  - `"./buildHistoryControls.js"`
- **Factory parameter:** `_buildHistoryControls`.
- **Entry function:** `__controller(_KDB, _toolbarHostEl)`.
- **Body steps:**
  1. Read selectors from `_KDB.elements.selectors.historyControls`.
  2. Read runtime from `_KDB.runtime.historyControls`.
  3. If host already contains root selector, reuse existing root.
  4. Otherwise build root and insert before `_toolbarHostEl.firstChild || null`.
  5. Store `toolbarHostEl`, `rootEl`, `undoButtonEl`, `redoButtonEl` under `runtime.domRefs`.
  6. Return root element or `null`.
- **Rules to apply:**
  - `dom.mdc` — placer attaches DOM and stores live refs under runtime.
  - `state.mdc` — no state writes.
  - `error-handling.mdc` — caller owns lifecycle boundary; this helper returns `null` for missing inputs.

### `KDB3/js/dashboard/controls/historyControls/view/syncHistoryControlsView.js`

- **Role:** DOM mutator / view sync.
- **Lines:** target 60-100.
- **AMD imports:** none.
- **Factory-scope helpers:**
  - `function readHistoryService(_KDB)` — returns `_KDB.services.history` or `null`.
  - `function resolveCapability(_historyService, _payload, _name)` — prefer payload boolean, fallback service method.
  - `function setButtonState(buttonEl, isEnabled)` — sets `disabled`, `aria-disabled`, and disabled class.
- **Entry function:** `__controller(_KDB, _payload)`.
- **Body steps:**
  1. Resolve runtime refs; if root/buttons missing, return `false`.
  2. Resolve `canUndo` and `canRedo` from payload if present, otherwise from service.
  3. If service is missing, both buttons disabled.
  4. Apply disabled state to undo and redo.
  5. Optionally call `getSnapshot()` only for local diagnostic safety if needed; do not log by default.
  6. Return `true`.
- **Rules to apply:**
  - `dom.mdc` — mutates only mounted DOM state.
  - `state.mdc` — no direct state reads/writes.
  - `module-public-api.mdc` — service reads only through deliberate service methods.

### `KDB3/js/dashboard/controls/historyControls/effects/bindHistoryControlsClick.js`

- **Role:** DOM listener effect.
- **Lines:** target 70-110.
- **AMD imports:** none.
- **Factory-scope helpers:**
  - `function readHistoryService(_KDB)` — returns service or `null`.
  - `function isHistoryButton(target, rootEl)` — resolves closest button under root.
  - `function runHistoryAction(_KDB, action)` — calls service `undo()` or `redo()` and returns promise.
- **Entry function:** `__controller(_KDB, _options)`.
- **Body steps:**
  1. Read runtime and root.
  2. If click controller already exists in `runtime.abortControllers.click`, return `true`.
  3. Create `AbortController` if available and store it.
  4. Bind click listener to `runtime.domRefs.rootEl`, not `document`.
  5. Listener ignores disabled buttons and non-history targets.
  6. Listener prevents default.
  7. Listener calls `_KDB.services.history.undo()` or `.redo()` based on `data-kdb-history-action`.
  8. After promise settles, call `_options.sync()` when provided.
  9. Catch and log `console.error("[historyControls.click]", error)`.
  10. If AbortController is unavailable, store a cleanup function in `runtime.listeners.click`.
- **Rules to apply:**
  - `runtime.mdc` — listener has cleanup path through AbortController or listener cleanup function.
  - `error-handling.mdc` — async fire-and-forget path catches errors.
  - `events.mdc` — no event emission.
  - `state.mdc` — no state writes.
  - `module-public-api.mdc` — commands history only through `_KDB.services.history`.

### `KDB3/js/dashboard/controls/historyControls/effects/subscribeHistoryChanged.js`

- **Role:** event subscription effect.
- **Lines:** target 50-90.
- **AMD imports:**
  - `"../../../../core/services/historyService/events/eventNames.js"`
- **Factory parameter:** `_historyEventNames`.
- **Entry function:** `__controller(_KDB, _options)`.
- **Body steps:**
  1. Read runtime and `_KDB.events`.
  2. If subscription already exists, return `true`.
  3. Subscribe to `_historyEventNames.HISTORY_CHANGED`.
  4. Handler wraps its body in `try/catch`.
  5. Handler calls `_options.sync(payload)` when provided.
  6. Store unsubscribe at `runtime.subscriptions.historyChanged`.
  7. Return `true`.
- **Rules to apply:**
  - `events.mdc` — import event constant from emitter canonical home; store unsubscribe under runtime subscriptions.
  - `runtime.mdc` — cleanup handle is stored.
  - `error-handling.mdc` — subscriber handler has mandatory try/catch.
  - `state.mdc` — subscriber does not write foreign state.

### `KDB3/js/dashboard/controls/historyControls/observation/bindToolbarObserver.js`

- **Role:** toolbar rebuild observer effect.
- **Lines:** target 60-100.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB, _options)`.
- **Body steps:**
  1. Read runtime and selectors.
  2. If observer already exists, return `true`.
  3. If `MutationObserver` or `document.body` is unavailable, return `false`.
  4. Create observer that schedules remount/sync with a small timer in `runtime.timers.toolbarRemount`.
  5. Observer must not do heavy DOM work inline.
  6. Timer calls `_options.remount()` when provided.
  7. Observe `document.body` with `{ childList: true, subtree: true }`.
  8. Store observer at `runtime.observers.toolbar`.
- **Rules to apply:**
  - `runtime.mdc` — observer and timer are stored and cleaned.
  - `dom.mdc` — document-scoped observation is justified by Cognos toolbar rebuilds documented in the contract.
  - `error-handling.mdc` — observer callback catches/logs errors or delegates to a guarded timer function.

### `KDB3/css/historyControls.css`

- **Role:** custom button styling.
- **Lines:** target 40-90.
- **Selectors/classes:**
  - `.kdb-history-controls`
  - `.kdb-history-controls__item`
  - `.kdb-history-controls__button`
  - `.kdb-history-controls__button:hover:not(:disabled)`
  - `.kdb-history-controls__button:disabled`
  - `.kdb-history-controls__button--disabled`
  - `.kdb-history-controls__icon`
- **Ported styling:** use legacy dimensions and basic look from `REDESIGN2/KDB3/css/KDB.css` history button block.
- **Rules to apply:**
  - `naming.mdc` — kebab CSS classes with `kdb-` prefix.
  - `dom.mdc` — CSS targets only module-owned custom classes/data attrs.
- **Forbidden CSS:**
  - Do not style or hide `#com.ibm.bi.dashboard.undoPluginContainer`.
  - Do not style or hide `#com.ibm.bi.dashboard.redoPluginContainer`.
  - Do not port superuser overlay CSS.

### `KDB3/js/KDB.js`

- **Role:** root bootstrap wiring.
- **Lines:** keep under approved `KDB.js` wiring exception.
- **Change steps:**
  1. Add AMD dependency string: `"./dashboard/controls/historyControls/__orchestratorHistoryControls.js"`.
  2. Add matching factory parameter `_orchestratorHistoryControls` in the same order.
  3. In `registerFeatureModules(_KDB)`, call `_orchestratorHistoryControls(_KDB)`.
  4. In `mountFeatureModules(_KDB, _renderOptions)`, call `_KDB.api.historyControls.mount({})`.
  5. In `destroy()`, call `destroyFeatureApi(this.api.historyControls)` before `destroyCoreServices(this)`.
- **Recommended order:**
  - Register after `_orchestratorKdbControl(_KDB)` and before `_orchestratorLaunchpad(_KDB)`, unless import ordering makes a cleaner local placement obvious.
  - Mount after `_KDB.api.kdbControl.mount({})` and before launchpad/dragDrop/metricsTree.
  - Destroy before core services, with the other feature APIs.
- **Rules to apply:**
  - `amd.mdc` — dependency array and factory parameters stay one-to-one.
  - `feature-structure.mdc` — `KDB.js` change is bootstrap wiring only.
  - `kdb-object.mdc` — no new top-level `_KDB.*` namespace.
  - `runtime.mdc` — destroy path reaches feature cleanup.

### `KDB3/js/core/css/config/cssHrefList.js`

- **Role:** CSS registration config.
- **Change steps:**
  1. Add `"./v1/ext/KDB3/css/historyControls.css"` to the returned array.
  2. Place it near other dashboard CSS, preferably after `footer.css` and before `kdb-control/*` or near `metricsTree.css`.
- **Rules to apply:**
  - `amd.mdc` — preserve AMD object/list return shape.
  - `feature-structure.mdc` — declarative config only.

### `architecture/eventSubscribe.md`

- **Role:** event catalog update.
- **Change target:** existing `history:changed` entry under `Module: historyService`.
- **Replace subscriber placeholder with:**

```md
- **Subscribers:**
  - `historyControls` — file: `KDB3/js/dashboard/controls/historyControls/effects/subscribeHistoryChanged.js` — handler: syncs Undo/Redo enabled state from the payload or `_KDB.services.history` fallback reads.
- **Teardown owner:** `historyControls.destroy()` clears `_KDB.runtime.historyControls.subscriptions.historyChanged`.
```

- **Rules to apply:**
  - `events.mdc` — every subscriber is cataloged; teardown owner is explicit.
  - `runtime.mdc` — subscription cleanup points to runtime subscription handle.

---

## Section E. Runtime and cleanup requirements

The implementation must satisfy all runtime cleanup checks:

1. `mount()` is idempotent: repeated calls do not duplicate DOM, click listeners, event subscriptions, observers or timers.
2. `destroy()` is idempotent.
3. `destroy()` sets the controller `isDisposed` guard before cleanup.
4. `destroy()` aborts `abortControllers`, calls subscription cleanup handles, disconnects observers, clears timers, removes placed DOM and resets runtime buckets.
5. Any pending mount promise checks disposal/abort before placing DOM or binding resources.
6. No subscription handle is stored in `_KDB.state`.
7. No live DOM reference is stored in `_KDB.elements`.

---

## Section F. History service behavior requirements

1. The module must never read or write `_KDB.state.history` directly.
2. The module must never use `_KDB.history`.
3. Undo click calls `_KDB.services.history.undo()` only when the button is enabled and the method exists.
4. Redo click calls `_KDB.services.history.redo()` only when the button is enabled and the method exists.
5. Enabled state uses event payload `canUndo` / `canRedo` when supplied.
6. Fallback enabled state uses `_KDB.services.history.canUndo()` / `.canRedo()`.
7. `getSnapshot()` may be used only as a deliberate service read fallback/diagnostic, not for direct state mutation.
8. Missing history service disables both buttons and logs at most one warning per controller instance.
9. Undo/redo promise rejection is caught and logged at the click boundary.

---

## Section G. Acceptance criteria

1. All files in Section B exist after execution.
2. No files outside Section B are modified.
3. `historyControls` is located under `KDB3/js/dashboard/controls/historyControls/`.
4. `_KDB.api.historyControls` exists with exactly `mount` and `destroy`, unless CP-1 explicitly changes the surface.
5. No `_KDB.state.historyControls` appears anywhere.
6. No `_KDB.history` reference appears anywhere in new or modified production files.
7. No direct `_KDB.state.history` read/write appears in historyControls files.
8. `history:changed` is imported from `core/services/historyService/events/eventNames.js`.
9. `history:changed` subscriber is cataloged in `eventSubscribe.md`.
10. Button DOM is idempotently placed into `[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading`.
11. Button clicks call `_KDB.services.history.undo()` / `.redo()`.
12. Button enabled state follows `canUndo` / `canRedo`.
13. Destroy cleanup removes DOM/listeners/subscriptions/observers/timers/pending refs.
14. `KDB.js` imports, registers, mounts and destroys `historyControls`.
15. `cssHrefList.js` includes `historyControls.css`.
16. CSS uses `kdb-history-controls*` classes and does not target Cognos native undo/redo plugin containers.
17. All production JS files use AMD explicit dependency-array shape.
18. No file exceeds its declared hard line limit.
19. `ReadLints` is clean for all touched files.

---

## Section H. Forbidden actions

The executing AI must not:

- Modify `.cursor/rules/*.mdc`.
- Modify contract templates.
- Modify legacy trees under `_______REDESIGN2`, `_______KDB3`, or `_______LAATSTEORIGINAL`.
- Add a `TEST/` harness or browser harness.
- Add `_KDB.history`.
- Add `_KDB.state.historyControls`.
- Write `_KDB.state.history` directly.
- Add public methods other than `mount` and `destroy` unless CP-1 changes the contract.
- Add keyboard shortcuts.
- Modify `historyService` behavior.
- Modify kdbControl history commit/replay behavior.
- Port Cognos native undo/redo plugin CSS policy.
- Create vague folders such as `helpers`, `common`, `manager`, or `shared`.

---

## Section I. Reviewer handoff

After execution, the reviewer must:

1. Verify the Section A pre-flight echo is present and specific.
2. Read every touched file.
3. Run `ReadLints` on:
   - `KDB3/js/dashboard/controls/historyControls/`
   - `KDB3/js/KDB.js`
   - `KDB3/js/core/css/config/cssHrefList.js`
4. Static-check that AMD imports resolve.
5. Static-check all acceptance criteria in Section G.
6. Confirm cleanup order in `createHistoryControlsController.js`.
7. Confirm `eventSubscribe.md` lists `historyControls` as subscriber for `history:changed`.
8. Confirm no forbidden terms appear: `_KDB.history`, `_KDB.state.historyControls`, direct `_KDB.state.history`.

---

## Section J. Reporting template

The executing AI final report must include:

1. Pre-flight echo: 14 numbered summaries.
2. File checklist with line count and `matches spec | deviation`.
3. Deviations, if any, with file path, reason and rule consulted.
4. Acceptance criteria pass/fail list for Section G.
5. Lint result summary.
6. Open questions for reviewer, if any.

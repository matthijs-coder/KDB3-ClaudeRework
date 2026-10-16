# Execution Spec: `launchpad` (direct port)

> Direct-port execution spec for the `launchpad` feature module.
> Execute only after CP-1 approval of `contracts/launchpad.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/launchpad.md`
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
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — feature modules use one dispatch-style `_KDB.api.<module>` surface and disposed guards.
5. `_____________KDB3API/.cursor/rules/events.mdc` — use direct API for known owners; events require canonical constants and catalog entries.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, action/event naming, underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors in `_KDB.elements.selectors`, live refs in runtime, scoped DOM queries.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle terms; `launchpad` uses the canonical subset `idle`, `initializing`, `ready`, `error`, `disposed`, all of which are defined in this vocabulary.
12. `_____________KDB3API/contracts/_template.md` — contract shape.
13. `_____________KDB3API/contracts/launchpad.md` — approved CP-1 contract for this direct port.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create files only after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/dashboard/launchpad/
  __orchestratorLaunchpad.js
  createLaunchpadController.js
  config/
    domSelectors.js
    padConfig.js
  state/
    initialState.js
    createLaunchpadReducer.js
    selectors.js
    collectLaunchpadTabIndexes.js
    buildLaunchpadTabDescriptors.js
    buildLaunchpadTabDescriptor.js
    buildLaunchpadTabsFromState.js
    buildLaunchpadTabsFromConfig.js
    buildLaunchpadTabsFromCanvas.js
    resolveLaunchpadHelperTabs.js
  view/
    buildLaunchpadDom.js
    placeLaunchpadDom.js
    removeLaunchpadDom.js
```

Do not create `events/eventNames.js` in this tranche.

---

## Section C. Legacy mapping table

| New production file | Legacy source(s) | Rule-alignment note |
|---|---|---|
| `__orchestratorLaunchpad.js` | `__orchestratorLaunchpad.js`, `ensureLaunchpadState.js` | Thin registration only: ensure `_KDB.api.launchpad`, `_KDB.state.launchpad`, `_KDB.runtime.launchpad`, selector config; no behavior or widget routing in orchestrator. |
| `createLaunchpadController.js` | `__orchestratorLaunchpad.js`, `settleLaunchpadReady.js`, `routeAllWidgetsToLaunchpad.js` | Controller owns public API, lifecycle, dispatch, mount/destroy, runtime readiness promise; removes all widget movement responsibility. |
| `config/domSelectors.js` | `ensureLaunchpadState.js`, `buildLaunchpadDom.js`, `placeLaunchpadDom.js` | Move legacy `_KDB.elements.launchpad*` strings to `_KDB.elements.selectors.launchpad`. |
| `config/padConfig.js` | `getLaunchpadPadConfig.js` + approved widgets channel delta | Implement target pad keys `visualization`, `text`, `dataTables`, `topN`, `otherResources`; legacy `shapes` is not an active target. |
| `state/initialState.js` | `initializeLaunchpadState.js`, `ensureLaunchpadState.js` | Keep only serializable state; move `ready` promise and subscriptions out to runtime. |
| `state/createLaunchpadReducer.js` | `__orchestratorLaunchpad.js`, `initializeLaunchpadState.js` | New reducer is rule-alignment; state writes centralized under launchpad owner. |
| `state/selectors.js` | `findLaunchpadSlotMeta.js`, state reads across legacy files | Publish read-only selector registry; no public `read*` methods on `_KDB.api.launchpad`. |
| `state/collectLaunchpadTabIndexes.js` | `collectLaunchpadTabIndexes.js` | Preserve dashboard/helper tab config parsing as pure helper. |
| `state/buildLaunchpadTabDescriptors.js` | `getLaunchpadTabDescriptors.js` | Coordinator for descriptor fallback order; pure metadata builder, no DOM writes. |
| `state/buildLaunchpadTabDescriptor.js` | `buildLaunchpadTabDescriptor.js` | Preserve descriptor normalization as pure helper. |
| `state/buildLaunchpadTabsFromState.js` | `buildLaunchpadTabsFromState.js` | Preserve state-first tab discovery from a tabs owner snapshot; do not deep-read `_KDB.state.tabs` directly. |
| `state/buildLaunchpadTabsFromConfig.js` | `buildLaunchpadTabsFromConfig.js` | Preserve config/layout fallback; pure transformation. |
| `state/buildLaunchpadTabsFromCanvas.js` | `buildLaunchpadTabsFromCanvas.js` | Preserve canvas fallback metadata; Cognos boundary catches host failures. |
| `state/resolveLaunchpadHelperTabs.js` | `resolveLaunchpadHelperTabs.js` | Preserve helper tab detection; read-only tab metadata. |
| `view/buildLaunchpadDom.js` | `buildLaunchpadDom.js`, `getLaunchpadPadConfig.js` | Build detached DOM only; no state writes and no placement. |
| `view/placeLaunchpadDom.js` | `placeLaunchpadDom.js` | Place launchpad DOM and store live refs in runtime, not state/elements. |
| `view/removeLaunchpadDom.js` | `placeLaunchpadDom.js` cleanup inverse | New focused cleanup helper for destroy; rule-alignment for runtime cleanup. |

Legacy files intentionally not ported into launchpad:

| Legacy file | Reason |
|---|---|
| `sendWidgetToLaunchpad.js`, `sendRequestedWidgetToLaunchpad.js`, `routeAllWidgetsToLaunchpad.js` widget loop behavior | Widget movement belongs to future `widgets` owner. |
| `takeWidgetFromLaunchpad.js`, `takeAllWidgetsFromLaunchpad.js` | Returning widgets belongs to future `widgets` owner. |
| `cleanLaunchpadWidget.js` | Widget DOM cleanup belongs to future `widgets` owner. |
| `setLaunchpadWidgetPlacement.js` | Writes `_KDB.state.widgets`; forbidden from launchpad. |
| `appendWidgetToLaunchpadSlot.js` | Actual widget DOM append belongs to `widgets`; slot metadata remains available via selectors. |
| `subscribeHideWidgetsToggle.js`, `subscribeLaunchpadWidgetSend.js` | Legacy event wiring targets known `widgets` owner and is deferred; launchpad has no subscriptions in this tranche. |
| `resolveLaunchpadWidgetMeta.js`, `classifyLaunchpadWidget.js` | Widget metadata/classification belongs to future `widgets` movement flow. |
| `findLaunchpadSlotMeta.js` | Replaced by `state/selectors.js` selector `readLaunchpadSlotMeta`. |
| `resolveLaunchpadTabGenericPage.js` | Returning widgets to tab generic pages belongs to future `widgets` owner. |

---

## Section D. Per-file specifications

Every production file uses full-compact AMD form and returns exactly one value.

### `__orchestratorLaunchpad.js`

- **Role:** feature-module orchestrator.
- **Lines:** target 60, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./config/domSelectors.js`, `./createLaunchpadController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:**
  1. Ensure `_KDB.state`, `_KDB.runtime`, `_KDB.api`, `_KDB.elements`, `_KDB.elements.selectors`.
  2. Register `_KDB.elements.selectors.launchpad` if absent.
  3. Initialize `_KDB.state.launchpad` from `initialState()` if absent.
  4. Initialize `_KDB.runtime.launchpad` buckets.
  5. Create controller with `{ _KDB, options }`.
  6. Register `_KDB.api.launchpad = controller`.
  7. Return controller.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`.

### `createLaunchpadController.js`

- **Role:** controller factory.
- **Lines:** target 120, hard limit 150.
- **AMD imports:** `./state/createLaunchpadReducer.js`, `./state/selectors.js`, `./state/buildLaunchpadTabDescriptors.js`, `./view/buildLaunchpadDom.js`, `./view/placeLaunchpadDom.js`, `./view/removeLaunchpadDom.js`.
- **Entry function:** `createLaunchpadController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Factory-scope helpers:** `runMountPipeline`, `waitUntilReady`, `ensureRuntime`, `clearPendingMount`, `abortControllers`, `unsubscribeSubscriptions`, `warnDisposed`, `toErrorMessage`, `isAbortError`.
- **Behavior:**
  - `mount(options)` guards disposed, resolves `true` immediately if already ready, returns `runtime.pendingPromises.mount` if mount is in flight, otherwise creates `AbortController`, stores under `runtime.abortControllers.mount`, dispatches `launchpad/mountStarted`, starts `runMountPipeline`, stores promise under `runtime.pendingPromises.mount`, returns `Promise<boolean>`.
  - `runMountPipeline` builds tab descriptors, builds detached DOM, places DOM, dispatches `launchpad/mountSucceeded` with serializable metadata, returns `true`; on placement failure dispatches `launchpad/mountFailed` and returns `false`.
  - `dispatch({ type: "launchpad/waitUntilReady", payload })` calls `waitUntilReady(payload)`, returns `Promise<boolean>`, performs no reducer write, and never exposes `_KDB.runtime.launchpad` to callers.
  - `waitUntilReady(payload)` resolves `true` when `selectors.readLaunchpadReady(_KDB)` is true, returns the in-flight `runtime.pendingPromises.mount` when present, optionally delegates to `mount({})` when safe, and resolves `false` on timeout/error/disposed.
  - `destroy()` is idempotent; set `_isDisposed = true` first, abort controllers, unsubscribe subscriptions, remove DOM, clear runtime buckets, dispatch `launchpad/destroy`.
  - `dispatch(action)` uses reducer as sole state write path; after disposed, no-op with warning except `launchpad/destroy`.
  - `getState()` returns `undefined` after disposal, otherwise `selectors.readLaunchpadState(_KDB)`.
- **Rules to apply:** `module-public-api.mdc` (single dispatch surface and disposed guards), `state.mdc` (canonical writer), `runtime.mdc` (cleanup before reset), `error-handling.mdc` (mandatory try/catch on named executables/subscribers/async; lifecycle boundaries convert errors), `amd.mdc`, `naming.mdc`.

### `config/domSelectors.js`

- **Role:** selector config.
- **Lines:** target 20.
- **Return value:**
  ```js
  {
    hideSpotSelector: "#KDB_HideSpot",
    rootSelector: "#KDB_widgetLaunchpad",
    slotSelector: "[data-kdb-launchpad-pad][cor_page_id][cor_page_index]"
  }
  ```
- **Rules to apply:** `dom.mdc` (selectors only), `kdb-object.mdc` (registered under `_KDB.elements.selectors.launchpad`), `naming.mdc`.

### `config/padConfig.js`

- **Role:** declarative pad config.
- **Lines:** target 25.
- **Return value:** object matching target pad keys and ids: `visualization`, `text`, `dataTables`, `topN`, `otherResources`.
- **Rules to apply:** `state.mdc` (config, not state), `naming.mdc`, `amd.mdc`.

### `state/initialState.js`

- **Role:** state factory.
- **Lines:** target 25.
- **Return value:** fresh initial state from contract Section 3.
- **Rules to apply:** `state.mdc` (serializable only), `lifecycleVocabulary.md`, `naming.mdc`, `amd.mdc`.

### `state/createLaunchpadReducer.js`

- **Role:** pure reducer.
- **Lines:** target 90.
- **Handled actions:** `launchpad/mountStarted`, `launchpad/mountSucceeded`, `launchpad/mountFailed`, `launchpad/destroy`. `launchpad/waitUntilReady` is effect-only and must not enter the reducer.
- **Rules to apply:** `state.mdc` (pure and owner-only), `naming.mdc` (slash actions), `error-handling.mdc` (no throws for normal invalid input), `amd.mdc`.

### `state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 100.
- **Return value:** object containing `readLaunchpadState`, `readLaunchpadReady`, `readLaunchpadTabs`, `readLaunchpadHelperTabIds`, `readLaunchpadSlotMeta`.
- **Rules to apply:** `module-public-api.mdc` (granular reads through selector registry), `state.mdc` (read-only), `naming.mdc`, `amd.mdc`.

### `state/collectLaunchpadTabIndexes.js`

- **Role:** pure config reader.
- **Legacy behavior:** return sorted dashboard/helper tab keys by `role`.
- **Rules to apply:** `state.mdc` (pure), `naming.mdc`, `amd.mdc`.

### `state/buildLaunchpadTabDescriptors.js`

- **Role:** tab descriptor coordinator.
- **AMD imports:** `./collectLaunchpadTabIndexes.js`, `./buildLaunchpadTabsFromState.js`, `./buildLaunchpadTabsFromConfig.js`, `./buildLaunchpadTabsFromCanvas.js`, `./resolveLaunchpadHelperTabs.js`.
- **Behavior:** match legacy fallback order using allowed reads: tabs owner snapshot from `_KDB.api.tabs.getState()` or injected/published selector if available -> configured layout tabs -> canvas content fallback; return `{ helperTabIds, helperTabPageId, tabs }`.
- **Rules to apply:** `state.mdc` (metadata only), `error-handling.mdc` (Cognos read boundaries), `amd.mdc`, `naming.mdc`.

### `state/buildLaunchpadTabDescriptor.js`

- **Role:** pure descriptor builder.
- **Behavior:** preserve one canonical `tabId`; `pageId` and `aliases` may only mirror that same canonical value, with no intermediate Cognos child/container id stored as identity.
- **Rules to apply:** `state.mdc`, `naming.mdc`, `amd.mdc`.

### `state/buildLaunchpadTabsFromState.js`

- **Role:** pure tabs-snapshot transformer.
- **Behavior:** accept a tabs owner snapshot as an argument, read `byIndex` and `presentationOrder` from that snapshot, exclude helper tabs, compact child indexes; if no snapshot is provided, return `[]`.
- **Rules to apply:** `state.mdc` (pure read-only transform), `module-public-api.mdc` (foreign tabs data enters through owner public surface or injected selector only), `naming.mdc`, `amd.mdc`.

### `state/buildLaunchpadTabsFromConfig.js`

- **Role:** pure layout/config transformer.
- **AMD imports:** `./buildLaunchpadTabDescriptor.js`.
- **Behavior:** preserve legacy config/layout fallback.
- **Rules to apply:** `state.mdc`, `naming.mdc`, `amd.mdc`.

### `state/buildLaunchpadTabsFromCanvas.js`

- **Role:** Cognos canvas fallback metadata reader.
- **Behavior:** call `_KDB.cognosAPI.canvas.findCanvasContent()` inside a boundary; return serializable descriptor metadata only.
- **Rules to apply:** `error-handling.mdc` (mandatory try/catch on external API call sites), `state.mdc`, `naming.mdc`, `amd.mdc`.

### `state/resolveLaunchpadHelperTabs.js`

- **Role:** helper tab metadata resolver.
- **AMD imports:** `./collectLaunchpadTabIndexes.js`, `./buildLaunchpadTabDescriptor.js`.
- **Behavior:** prefer `tabsSnapshot.helperTab.tabId` when the tabs owner snapshot is supplied; fallback to helper tabs from config/layout.
- **Rules to apply:** `state.mdc`, `naming.mdc`, `amd.mdc`.

### `view/buildLaunchpadDom.js`

- **Role:** DOM builder.
- **AMD imports:** `../config/padConfig.js`.
- **Behavior:** build detached `hideSpotEl`, root element, pad containers, and slot elements; return `{ hideSpotEl, domRefs, tabs, padsByKey, helperTabIds, helperTabPageId }`.
- **Important:** `padsByKey` in the return value must be serializable; DOM refs go separately under `domRefs`.
- **Rules to apply:** `dom.mdc` (builder only; no placement, no state write), `state.mdc` (serializable metadata split from live refs), `naming.mdc`, `amd.mdc`.

### `view/placeLaunchpadDom.js`

- **Role:** DOM placer.
- **Behavior:** resolve owner document from `_KDB.elements.kdbWidget.ownerDocument` if present, remove previous hide spot matching selector, append new hide spot to document body, store live refs under `_KDB.runtime.launchpad.domRefs`.
- **Rules to apply:** `dom.mdc` (live refs in runtime), `runtime.mdc` (cleanup path exists), `error-handling.mdc` (mandatory try/catch on named DOM handlers), `naming.mdc`, `amd.mdc`.

### `view/removeLaunchpadDom.js`

- **Role:** DOM cleanup helper.
- **Behavior:** remove `runtime.domRefs.hideSpotEl` from parent if present; clear launchpad `domRefs` fields without touching other modules' DOM/runtime.
- **Rules to apply:** `dom.mdc`, `runtime.mdc`, `naming.mdc`, `amd.mdc`.

---

## Section E. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `launchpad/mountStarted` | `mount()` | Set `domReady: false`, clear errors. | `idle/error/disposed -> initializing` unless disposed guard prevents call. |
| `launchpad/mountSucceeded` | DOM built and placed | Store `tabs`, `padsByKey`, `helperTabIds`, `helperTabPageId`, set `domReady: true`. | `initializing -> ready` |
| `launchpad/mountFailed` | Build/place failure | Set `domReady: false`, store `errorCode`, `errorMessage`. | `initializing -> error` |
| `launchpad/waitUntilReady` | Consumer waits for launchpad readiness | Effect-only; no reducer state change. | none |
| `launchpad/destroy` | `destroy()` | Set `domReady: false`, clear arrays/maps, clear errors. | `<current> -> disposed` |

---

## Section F. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readLaunchpadState` | `_KDB.state.launchpad` | Full subtree or `undefined`. |
| `readLaunchpadReady` | `lifecycle`, `domReady` | `true` only when `ready` and `domReady === true`. |
| `readLaunchpadTabs` | `tabs` | Shallow copy of tab descriptors. |
| `readLaunchpadHelperTabIds` | `helperTabIds` | Copy of helper ids. |
| `readLaunchpadSlotMeta` | `padsByKey[padKey]` | Matching slot metadata by tab id / alias. |

---

## Section G. Public API wiring

- Surface: `_KDB.api.launchpad`.
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`.
- `_KDB.runtime.launchpad` buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`.
- `_KDB.state.launchpad`: initialized from `state/initialState.js`.
- No bootstrap registration in `KDB.js` in this tranche unless CP-1 explicitly expands scope.

---

## Section H. Event catalog and bootstrap notes

- `eventSubscribe.md` update: not needed for this tranche.
- `events/eventNames.js`: not created.
- Bootstrap registration in `KDB.js`: required later for production execution, but deferred by session scope.
- Static import check after implementation: verify all AMD paths resolve within `dashboard/launchpad/` and to existing core paths only; no imports from `TEST/` or legacy trees.

---

## Section I. Acceptance criteria

1. Every file in Section B exists after execution, and no extra production file is created.
2. No production file is created before CP-1 approval.
3. No `TEST/`, browser harness, legacy file, rule file, architecture authority doc, or template is modified.
4. Every production file uses full-compact AMD `define([...], function (...) { ... })`.
5. No file contains ES module syntax, CommonJS `require`, multiple `define` calls, or inline nested subfunction definitions inside entry bodies/callbacks.
6. `_KDB.api.launchpad` exposes only `mount`, `destroy`, `dispatch`, `getState`.
7. Every public method has disposed-state discipline per `module-public-api.mdc`.
8. `mount`, `destroy`, and other mandatory functions have try/catch; lifecycle methods convert errors; async work filters abort/stale results.
9. `launchpad/waitUntilReady` returns `Promise<boolean>`, coalesces any in-flight mount promise, stores no Promise in state and performs no reducer write.
10. `_KDB.state.launchpad` contains only serializable values; no promises, subscriptions, DOM refs, handlers, or controllers.
11. `_KDB.runtime.launchpad` owns live DOM refs and cleanup buckets; destroy aborts/unsubscribes/removes before resetting runtime.
12. Launchpad does not write `_KDB.state.widgets`, `_KDB.runtime.widgets`, `_KDB.state.tabs`, filters, kdbControl, or canvas state, and does not deep-read `_KDB.state.tabs`.
13. Launchpad does not move, clean, classify, render, or return widgets.
14. No event names are hardcoded at emit/subscribe sites because this tranche emits/subscribes to no events.
15. `ReadLints` is run on all new/modified production files after implementation.
16. Static AMD import inspection confirms every new import resolves.
17. CP-2 report states: lint result, rule-check result, diff-walk result, bootstrap registration status, event-catalog status.

---

## Section J. Forbidden actions

The executing AI must not:

- Modify any file before CP-1 approval.
- Modify any `.mdc` file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, or templates unless CP-1 explicitly expands scope.
- Modify `_____________KDB3API/contracts/launchpad.md` after approval unless a contract delta is explicitly requested.
- Modify `KDB.js` unless CP-1 explicitly changes bootstrap scope.
- Read legacy folders linearly or modify any file under `_______KDB3/`, `_______REDESIGN2/`, or `_______LAATSTEORIGINAL/`.
- Create `TEST/` files, harness files, browser tests, README files, or CSS files.
- Create `events/eventNames.js` or update `eventSubscribe.md` in this tranche.
- Port widget movement/cleanup/state-write files into launchpad.
- Introduce behavior changes beyond rule-alignment; if behavior drift appears necessary, stop and escalate.
- Commit, push, or change git config.

---

## Section K. Reporting template

The executing AI reports:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **File checklist** — every path created with line count and `matches spec | deviation`.
3. **Omitted legacy behavior** — confirm widget movement files were not ported into launchpad and why.
4. **Self-verification** — pass/fail for all Section I criteria.
5. **Bootstrap/event notes** — `KDB.js` registration deferred unless CP-1 changed scope; `eventSubscribe.md` not needed.
6. **Open questions** — only if the spec proved insufficient; otherwise `none`.

---

## Section L. Reviewer handoff

The supervising AI performs after implementation:

1. Verify the pre-flight summaries.
2. Read every created production file.
3. Run `ReadLints` on all new/modified production files.
4. Cross-check each file against Section D rules.
5. Diff-walk against legacy: confirm rule-alignment only and confirm widget movement was intentionally excluded from launchpad.
6. Static inspect AMD imports and note bootstrap registration is deferred unless CP-1 approved it.
7. Stop at CP-2 for user diff-walk + integration-check approval.

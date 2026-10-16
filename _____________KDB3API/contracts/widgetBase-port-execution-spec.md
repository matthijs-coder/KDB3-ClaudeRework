# Execution Spec: `widgetBase` (`full port`)

> Execution spec for implementing `widgetBase` after CP-1 contract approval. This spec is intentionally mechanical: architecture decisions live in `contracts/widgetBase.md`.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetBase.md`
**Phase:** `full port`
**Authoring AI:** `GPT-5.5, 2026-06-06`
**Executing AI:** `TBD after CP-1 approval`
**Reviewer:** `user CP-1 agreed 2026-06-16 (layout move/resize history replay tranche)`

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing output files and must echo one sentence per file.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` has fixed top-level namespaces; feature code receives `_KDB` by injection and must not invent new namespaces.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable and has one canonical writer per subtree; foreign writes are forbidden.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — non-serializable technical resources live under the owning runtime namespace and every resource needs cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — feature modules expose one module API surface, normally `{ mount, destroy, dispatch, getState }`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — events are catalogued facts/requests; subscribers clean up handles and never write foreign state.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — modules follow orchestrator/controller/folder conventions and Module Contract First approval.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — generated code uses English names, canonical file names, slash action names and lifecycle vocabulary terms.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors live under `_KDB.elements.selectors`, live DOM refs live under runtime, and queries are scoped.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — production JS uses one full-compact AMD `define([...], function (...) { ... })` per file.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle uses only canonical terms; placement is a separate domain field.
12. `_____________KDB3API/contracts/widgetBase.md` — source of truth for this implementation.
13. `_____________KDB3API/contracts/launchpad.md` — source for launchpad slot metadata, selectors and five per-tab channels.
14. `_____________KDB3API/contracts/dragDrop.md` — source for the `canvas:dropValidated` payload and placement boundary.
15. `_____________KDB3API/contracts/historyService.md` — source for committed history step semantics.
16. This execution spec.

The executing AI's first output must be the 16 echoed summaries. File creation starts only after reviewer acceptance.

---

## Section B. Folder tree

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetBase/
  __orchestratorWidgetBase.js
  createWidgetBaseController.js
  config/
    actionTypes.js
    launchpadChannels.js
  state/
    initialState.js
    createWidgetBaseReducer.js
    selectors.js
    cloneSerializable.js
    resolveLaunchpadRoute.js
  actions/
    handleDropCreate.js
    handleRouteAllToLaunchpad.js
    handleRouteToLaunchpad.js
    handleTakeFromLaunchpad.js
    handleMoveOrResize.js
    handleSetColour.js
    handleRemove.js
    rollbackWidgetBaseOperation.js
    normalizeDispatchResult.js
  view/
    resolveWidgetShell.js
    resolveLaunchpadSlotElement.js
    placeWidgetOnCanvas.js
    moveWidgetToLaunchpad.js
    applyWidgetLayout.js
    applyWidgetColour.js
  effects/
    subscribeDropValidated.js
    dispatchContentCreate.js
    commitWidgetBaseHistory.js
    discoverCanvasWidgets.js
    cleanupWidgetRuntime.js
```

Do not create `events/eventNames.js`; `widgetBase` emits no fact-events in this tranche.

---

## Section C. Per-file specifications

### `KDB3/js/dashboard/widgets/widgetBase/__orchestratorWidgetBase.js`

- **Role**: module orchestrator.
- **Lines**: target 50, hard limit 120.
- **AMD imports**:
  - `"./createWidgetBaseController.js"`
  - `"./state/selectors.js"`
- **Factory parameters**:
  - `_createWidgetBaseController`
  - `_selectors`
- **Entry function**:
  - Name: `__orchestrator`
  - Parameters: `_KDB`, `_options`
  - Body steps:
    1. Create controller with `createWidgetBaseController({ _KDB, options: _options, selectors: _selectors })`.
    2. Ensure `_KDB.api` exists.
    3. Register `_KDB.api.widgetBase = controller`.
    4. Return controller.
- **Return value**: `__orchestrator`.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD shape; no nested helpers.
  - `naming.mdc` — canonical orchestrator file and entry name.
  - `feature-structure.mdc` — orchestrator wires only; no business logic.
  - `kdb-object.mdc` — registers only `_KDB.api.widgetBase`, no new top-level namespace.

### `KDB3/js/dashboard/widgets/widgetBase/createWidgetBaseController.js`

- **Role**: controller factory.
- **Lines**: target 120, hard limit 150; split before exceeding.
- **AMD imports**:
  - `"./config/actionTypes.js"`
  - `"./state/initialState.js"`
  - `"./state/createWidgetBaseReducer.js"`
  - `"./state/cloneSerializable.js"`
  - `"./effects/subscribeDropValidated.js"`
  - `"./effects/cleanupWidgetRuntime.js"`
  - `"./actions/handleDropCreate.js"`
  - `"./actions/handleRouteAllToLaunchpad.js"`
  - `"./actions/handleRouteToLaunchpad.js"`
  - `"./actions/handleTakeFromLaunchpad.js"`
  - `"./actions/handleMoveOrResize.js"`
  - `"./actions/handleSetColour.js"`
  - `"./actions/handleRemove.js"`
  - `"./actions/normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_actionTypes`
  - `_initialState`
  - `_createWidgetBaseReducer`
  - `_cloneSerializable`
  - `_subscribeDropValidated`
  - `_cleanupWidgetRuntime`
  - `_handleDropCreate`
  - `_handleRouteAllToLaunchpad`
  - `_handleRouteToLaunchpad`
  - `_handleTakeFromLaunchpad`
  - `_handleMoveOrResize`
  - `_handleSetColour`
  - `_handleRemove`
  - `_normalizeDispatchResult`
- **Entry function**:
  - Name: `createWidgetBaseController`
  - Parameters: `_deps`
  - Body steps:
    1. Capture `_KDB`, `options` and `selectors` from `_deps`.
    2. Create reducer.
    3. Keep `_isDisposed` and one-time warn flags in closure.
    4. Expose `mount`, `destroy`, `dispatch`, `getState`.
    5. `mount` initializes state/runtime, subscribes `canvas:dropValidated`, optionally dispatches `routeAllToLaunchpad`.
    6. `dispatch` validates envelope, routes action type to `actions/handle*.js`, and returns the normalized dispatch result.
    7. `destroy` marks disposed first, cleans subscriptions/runtime and dispatches destroy.
    8. `getState` returns cloned `_KDB.state.widgets.base`.
- **Return value**: `{ mount, destroy, dispatch, getState }`.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD; helpers at factory scope only.
  - `naming.mdc` — factory name matches module; action names use `widgetBase/actionName`.
  - `feature-structure.mdc` — controller coordinates, major logic in helpers/effects.
  - `module-public-api.mdc` — dispatch-style public surface only; disposed-state discipline.
  - `state.mdc` — writes only `_KDB.state.widgets.base`.
  - `runtime.mdc` — initializes and cleans `_KDB.runtime.widgetBase`.
  - `events.mdc` — stores subscription cleanup.
  - `error-handling.mdc` — mandatory try/catch on named executables/effects/subscribers; mount/destroy convert errors.

### `KDB3/js/dashboard/widgets/widgetBase/config/actionTypes.js`

- **Role**: action constants.
- **Lines**: target 40.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: none; factory returns object.
- **Return value**: object with constants for all action types in the contract.
- **Rules to apply**:
  - `amd.mdc` — one AMD module returning one object.
  - `naming.mdc` — constant names `UPPER_SNAKE_CASE`; values use concrete `widgetBase/actionName` strings.
  - `feature-structure.mdc` — config-only file.

### `KDB3/js/dashboard/widgets/widgetBase/config/launchpadChannels.js`

- **Role**: route constants and channel aliases.
- **Lines**: target 80.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Return value**: object containing `CHANNELS`, `LEGACY_REMAP`, `SKIP_REASON`.
- **Rules to apply**:
  - `amd.mdc` — one object export.
  - `naming.mdc` — English constants.
  - `feature-structure.mdc` — declarative config only.

### `KDB3/js/dashboard/widgets/widgetBase/state/initialState.js`

- **Role**: initial state builder.
- **Lines**: target 35.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `createInitialWidgetBaseState`
- **Parameters**: none.
- **Return value**: fresh state object `{ lifecycle, byId, errorCode, errorMessage }`.
- **Rules to apply**:
  - `amd.mdc` — helper function export.
  - `state.mdc` — serializable state only.
  - `lifecycleVocabulary.md` — uses `idle`.

### `KDB3/js/dashboard/widgets/widgetBase/state/createWidgetBaseReducer.js`

- **Role**: reducer factory.
- **Lines**: target 120, hard limit 150.
- **AMD imports**:
  - `"../config/actionTypes.js"`
  - `"./initialState.js"`
  - `"./cloneSerializable.js"`
- **Factory parameters**:
  - `_actionTypes`
  - `_initialState`
  - `_cloneSerializable`
- **Entry function**: `createWidgetBaseReducer`
- **Parameters**: none.
- **Return value**: reducer function.
- **Behaviour**: handle mount, frame registration, pending, placement success, launchpad route success, removal, `errorRecorded` and destroy actions exactly as `widgetBase.md` Section 8.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD.
  - `state.mdc` — pure reducer; no effects, DOM, Cognos or history.
  - `naming.mdc` — action types are semantic slash names.
  - `error-handling.mdc` — reducers exempt — pure, no try/catch.

### `KDB3/js/dashboard/widgets/widgetBase/state/selectors.js`

- **Role**: published selectors.
- **Lines**: target 90.
- **AMD imports**:
  - `"./cloneSerializable.js"`
- **Factory parameters**:
  - `_cloneSerializable`
- **Return value**: object with `readWidgetBaseState`, `readFrame`, `readWidgetsByTab`, `readPlacement`, `readAllWidgetIds`.
- **Rules to apply**:
  - `amd.mdc` — one selector registry export.
  - `state.mdc` — read-only selectors; cloned returns.
  - `module-public-api.mdc` — granular reads live in selectors, not on `_KDB.api.widgetBase`.

### `KDB3/js/dashboard/widgets/widgetBase/state/cloneSerializable.js`

- **Role**: pure clone helper.
- **Lines**: target 30.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `cloneSerializable`
- **Parameters**: `_value`
- **Return value**: JSON-safe clone for objects/arrays/primitives.
- **Rules to apply**:
  - `amd.mdc` — helper function export.
  - `state.mdc` — no runtime/DOM cloning.
  - `naming.mdc` — precise verb+noun file name.

### `KDB3/js/dashboard/widgets/widgetBase/state/resolveLaunchpadRoute.js`

- **Role**: pure route classifier.
- **Lines**: target 120, hard limit 150.
- **AMD imports**:
  - `"../config/launchpadChannels.js"`
- **Factory parameters**:
  - `_launchpadChannels`
- **Entry function**: `resolveLaunchpadRoute`
- **Parameters**: `_descriptor`
- **Return value**: route result from `widgetBase.md` Section 7.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `state.mdc` — pure descriptor-only classification, no state writes and no `_KDB` reads.
  - `naming.mdc` — semantic names.
  - `dom.mdc` — accepts descriptors/ids, not live DOM when avoidable.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleDropCreate.js`

- **Role**: action workflow.
- **Lines**: target 120, hard limit 150.
- **AMD imports**:
  - `"../state/resolveLaunchpadRoute.js"`
  - `"../view/placeWidgetOnCanvas.js"`
  - `"../effects/dispatchContentCreate.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./rollbackWidgetBaseOperation.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_resolveLaunchpadRoute`
  - `_placeWidgetOnCanvas`
  - `_dispatchContentCreate`
  - `_commitWidgetBaseHistory`
  - `_rollbackWidgetBaseOperation`
  - `_normalizeDispatchResult`
- **Entry function**: `handleDropCreate`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized dispatch result.
- **Rules to apply**:
  - `amd.mdc` — helper export with semantic name.
  - `state.mdc` — state writes only through controller dispatch/reducer.
  - `runtime.mdc` — opSeq and runtime refs go under widgetBase runtime.
  - `error-handling.mdc` — rollback on content/placement failure.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleRouteAllToLaunchpad.js`

- **Role**: action workflow.
- **Lines**: target 100.
- **AMD imports**:
  - `"../effects/discoverCanvasWidgets.js"`
  - `"./handleRouteToLaunchpad.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_discoverCanvasWidgets`
  - `_handleRouteToLaunchpad`
  - `_normalizeDispatchResult`
- **Entry function**: `handleRouteAllToLaunchpad`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving aggregate normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `error-handling.mdc` — one failed widget does not stop the batch.
  - `state.mdc` — no history for startup routing.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleRouteToLaunchpad.js`

- **Role**: action workflow.
- **Lines**: target 120, hard limit 150.
- **AMD imports**:
  - `"../state/resolveLaunchpadRoute.js"`
  - `"../view/moveWidgetToLaunchpad.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_resolveLaunchpadRoute`
  - `_moveWidgetToLaunchpad`
  - `_commitWidgetBaseHistory`
  - `_normalizeDispatchResult`
- **Entry function**: `handleRouteToLaunchpad`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — moves shell to launchpad via selector-resolved slot only.
  - `runtime.mdc` — no launchpad runtime reads.
  - `error-handling.mdc` — structured missing-target failure.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleTakeFromLaunchpad.js`

- **Role**: action workflow.
- **Lines**: target 100.
- **AMD imports**:
  - `"../view/placeWidgetOnCanvas.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_placeWidgetOnCanvas`
  - `_commitWidgetBaseHistory`
  - `_normalizeDispatchResult`
- **Entry function**: `handleTakeFromLaunchpad`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `state.mdc` — success clears both `launchpadPad` and `launchpadSlotKey`.
  - `error-handling.mdc` — Cognos/DOM placement boundary returns structured failure.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleMoveOrResize.js`

- **Role**: action workflow.
- **Lines**: target 90.
- **AMD imports**:
  - `"../view/applyWidgetLayout.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_applyWidgetLayout`
  - `_commitWidgetBaseHistory`
  - `_normalizeDispatchResult`
- **Entry function**: `handleMoveOrResize`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `state.mdc` — durable layout only after final confirmed effect.
  - `error-handling.mdc` — Cognos layout boundary handled.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleSetColour.js`

- **Role**: action workflow.
- **Lines**: target 80.
- **AMD imports**:
  - `"../view/applyWidgetColour.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_applyWidgetColour`
  - `_commitWidgetBaseHistory`
  - `_normalizeDispatchResult`
- **Entry function**: `handleSetColour`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `state.mdc` — writes durable `colour` only after confirmed effect.
  - `error-handling.mdc` — external effect failures become structured errors.

### `KDB3/js/dashboard/widgets/widgetBase/actions/handleRemove.js`

- **Role**: action workflow.
- **Lines**: target 90.
- **AMD imports**:
  - `"../effects/cleanupWidgetRuntime.js"`
  - `"../effects/commitWidgetBaseHistory.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_cleanupWidgetRuntime`
  - `_commitWidgetBaseHistory`
  - `_normalizeDispatchResult`
- **Entry function**: `handleRemove`
- **Parameters**: `_context`, `_action`
- **Return value**: Promise resolving normalized result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `state.mdc` — remove means `placement: "removed"`; no parking.
  - `runtime.mdc` — cleanup before disposed state.

### `KDB3/js/dashboard/widgets/widgetBase/actions/rollbackWidgetBaseOperation.js`

- **Role**: rollback workflow.
- **Lines**: target 90.
- **AMD imports**:
  - `"../view/moveWidgetToLaunchpad.js"`
  - `"../effects/cleanupWidgetRuntime.js"`
  - `"./normalizeDispatchResult.js"`
- **Factory parameters**:
  - `_moveWidgetToLaunchpad`
  - `_cleanupWidgetRuntime`
  - `_normalizeDispatchResult`
- **Entry function**: `rollbackWidgetBaseOperation`
- **Parameters**: `_context`, `_rollbackRequest`
- **Return value**: Promise resolving normalized rollback result.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `runtime.mdc` — clears runtime created during failed operation.
  - `error-handling.mdc` — no history on rollback; structured rollback-failed result.

### `KDB3/js/dashboard/widgets/widgetBase/actions/normalizeDispatchResult.js`

- **Role**: result normalizer.
- **Lines**: target 50.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `normalizeDispatchResult`
- **Parameters**: `_result`
- **Return value**: normalized result shape from Section D2.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `naming.mdc` — semantic helper name.
  - `state.mdc` — pure helper, no writes.

### `KDB3/js/dashboard/widgets/widgetBase/view/resolveWidgetShell.js`

- **Role**: DOM resolver.
- **Lines**: target 70.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `resolveWidgetShell`
- **Parameters**: `_KDB`, `_widgetId`, `_scopeEl`
- **Return value**: widget shell element or `null`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — scoped queries only; no state writes.
  - `runtime.mdc` — returned live refs are stored by caller under runtime only.

### `KDB3/js/dashboard/widgets/widgetBase/view/resolveLaunchpadSlotElement.js`

- **Role**: DOM resolver for launchpad slot.
- **Lines**: target 90.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `resolveLaunchpadSlotElement`
- **Parameters**: `_KDB`, `_slotMeta`
- **Return value**: slot element or `null`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — use launchpad selectors and scoped lookup; no `_KDB.runtime.launchpad` read.
  - `runtime.mdc` — live slot refs belong to `widgetBase` runtime only.

### `KDB3/js/dashboard/widgets/widgetBase/view/placeWidgetOnCanvas.js`

- **Role**: DOM placer.
- **Lines**: target 100.
- **AMD imports**:
  - `"./resolveWidgetShell.js"`
- **Factory parameters**:
  - `_resolveWidgetShell`
- **Entry function**: `placeWidgetOnCanvas`
- **Parameters**: `_KDB`, `_request`
- **Return value**: `{ ok, widgetId, layout, shellEl, errorCode? }`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — placer only; state writes stay in controller/reducer.
  - `runtime.mdc` — caller stores shell refs and cleanup.
  - `error-handling.mdc` — return structured failure, do not throw for expected missing DOM.

### `KDB3/js/dashboard/widgets/widgetBase/view/moveWidgetToLaunchpad.js`

- **Role**: DOM placer.
- **Lines**: target 100.
- **AMD imports**:
  - `"./resolveWidgetShell.js"`
  - `"./resolveLaunchpadSlotElement.js"`
- **Factory parameters**:
  - `_resolveWidgetShell`
  - `_resolveLaunchpadSlotElement`
- **Entry function**: `moveWidgetToLaunchpad`
- **Parameters**: `_KDB`, `_request`
- **Return value**: `{ ok, widgetId, slotKey, shellEl, errorCode? }`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — move only widgetBase-owned shell; no launchpad runtime reads.
  - `runtime.mdc` — live refs stored by caller under widgetBase runtime.

### `KDB3/js/dashboard/widgets/widgetBase/view/applyWidgetLayout.js`

- **Role**: DOM/Cognos layout effect helper.
- **Lines**: target 80.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `applyWidgetLayout`
- **Parameters**: `_KDB`, `_widgetId`, `_layout`
- **Return value**: Promise resolving `{ ok, layout, errorCode? }`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — DOM mutation only, no state writes.
  - `error-handling.mdc` — catch Cognos layout failures with context.

### `KDB3/js/dashboard/widgets/widgetBase/view/applyWidgetColour.js`

- **Role**: DOM/Cognos colour effect helper.
- **Lines**: target 70.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `applyWidgetColour`
- **Parameters**: `_KDB`, `_widgetId`, `_colour`
- **Return value**: Promise resolving `{ ok, colour, errorCode? }`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `dom.mdc` — no state writes.
  - `error-handling.mdc` — catch external effect failures.

### `KDB3/js/dashboard/widgets/widgetBase/effects/subscribeDropValidated.js`

- **Role**: event subscription effect.
- **Lines**: target 80.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `subscribeDropValidated`
- **Parameters**: `_KDB`, `_dispatch`
- **Return value**: unsubscribe handle.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `events.mdc` — subscribes to catalogued `canvas:dropValidated`; stores cleanup via caller.
  - `runtime.mdc` — cleanup handle required.
  - `error-handling.mdc` — subscriber has mandatory try/catch; catches/logs and dispatches owned error.

### `KDB3/js/dashboard/widgets/widgetBase/effects/dispatchContentCreate.js`

- **Role**: cross-module dispatch effect.
- **Lines**: target 100.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `dispatchContentCreate`
- **Parameters**: `_KDB`, `_request`
- **Return value**: Promise resolving content owner result.
- **Additional duty**: after successful content owner creation, `handleDropCreate` also starts post-drop settings startup through `_KDB.api.widgetSettings.dispatch(...)` when `widgetSettings` is available. Keep that orchestration outside content owner modules.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `module-public-api.mdc` — calls content module dispatch surfaces only.
  - `state.mdc` — no content state writes.
  - `error-handling.mdc` — missing owner/rejected content create becomes structured failure.

### `KDB3/js/dashboard/widgets/widgetBase/effects/commitWidgetBaseHistory.js`

- **Role**: history effect.
- **Lines**: target 90.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `commitWidgetBaseHistory`
- **Parameters**: `_KDB`, `_step`
- **Return value**: boolean.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `module-public-api.mdc` — uses `_KDB.services.history.pushCommittedStep`.
  - `state.mdc` — commits serializable snapshots only.
  - `error-handling.mdc` — logs failed history commit boundary once.

### `KDB3/js/dashboard/widgets/widgetBase/effects/discoverCanvasWidgets.js`

- **Role**: Cognos discovery effect.
- **Lines**: target 110.
- **AMD imports**:
  - `"../state/resolveLaunchpadRoute.js"`
- **Factory parameters**:
  - `_resolveLaunchpadRoute`
- **Entry function**: `discoverCanvasWidgets`
- **Parameters**: `_KDB`, `_options`
- **Return value**: Promise resolving descriptors for startup route-all.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `error-handling.mdc` — Cognos calls wrapped with context.
  - `state.mdc` — no writes; returns serializable descriptors.
  - `dom.mdc` — no long-lived DOM refs.

### `KDB3/js/dashboard/widgets/widgetBase/effects/cleanupWidgetRuntime.js`

- **Role**: runtime cleanup effect.
- **Lines**: target 90.
- **AMD imports**: none.
- **Factory parameters**: none.
- **Entry function**: `cleanupWidgetRuntime`
- **Parameters**: `_KDB`, `_widgetId`
- **Return value**: `{ ok: boolean }`.
- **Rules to apply**:
  - `amd.mdc` — helper export.
  - `runtime.mdc` — abort controllers, remove listeners, disconnect observers, clear timers and pending promises.
  - `dom.mdc` — release live refs, no state writes.
  - `error-handling.mdc` — cleanup errors logged at boundary.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `widgetBase/mountStarted` | `mount()` | Ensure base state exists; clear module error. | `idle -> initializing` |
| `widgetBase/mountSucceeded` | successful mount | Mark module ready. | `initializing -> ready` |
| `widgetBase/registerFrame` | discovered/drop/take widget | Upsert `byId[widgetId]` frame. | frame `idle` or unchanged |
| `widgetBase/markPending` | operation start | Set frame `pending = { kind, opSeq }`. | optional `ready -> loading` |
| `widgetBase/placeOnCanvasSucceeded` | drop/take/move/resize success | Set `placement`, `layout`, `lastCanvasLayout`, clear launchpad pad/slot and pending. | frame `loading -> ready` |
| `widgetBase/routeToLaunchpadSucceeded` | route success | Set `placement: "inLaunchpad"`, pad, slot, `layout: null`, preserve `lastCanvasLayout`, clear pending. | frame `loading -> ready` |
| `widgetBase/removeSucceeded` | remove success | Set `placement: "removed"`, clear pending. | frame `ready -> disposed` |
| `widgetBase/errorRecorded` | boundary failure | Record error fields at module or frame level. | current -> `error` |
| `widgetBase/destroy` | `destroy()` | Mark module disposed; frame cleanup already done. | current -> `disposed` |

---

## Section D2. Controller Action Workflows

Every workflow returns:

```js
{
  ok: boolean,
  widgetId?: string,
  opSeq?: number,
  skipped?: boolean,
  stale?: boolean,
  rolledBack?: boolean,
  placement?: "onCanvas" | "inLaunchpad" | "removed",
  errorCode?: string,
  errorMessage?: string,
  reasonCode?: string
}
```

### D2.1 Global `opSeq` Rule

Every async per-widget action generates or receives an `opSeq`. Before any success/failure reducer action mutates a frame, the handler verifies that the frame's current `pending.opSeq` still matches. Stale results return `{ ok: false, stale: true, widgetId, opSeq }`, clear no unrelated pending state, move no DOM and commit no history.

### D2.2 `mount`

1. Dispatch `widgetBase/mountStarted`.
2. Initialize `_KDB.runtime.widgetBase` buckets.
3. Subscribe `canvas:dropValidated`; store cleanup handle in `runtime.widgetBase.subscriptions`.
4. Dispatch `widgetBase/mountSucceeded`.
5. If `autoRouteAll !== false`, await `_KDB.api.launchpad.dispatch({ type: "launchpad/waitUntilReady", payload: { timeoutMs: options.launchpadReadyTimeoutMs || 5000 } })`.
6. If launchpad readiness resolves `false`, record `WIDGET_BASE_LAUNCHPAD_NOT_READY` and do not run startup route-all.
7. If launchpad readiness resolves `true`, dispatch `widgetBase/routeAllToLaunchpad` with reason `startup`.
8. On failure, log once, dispatch `widgetBase/errorRecorded` with `WIDGET_BASE_MOUNT_FAILED`, and return `false`.

### D2.3 `routeAllToLaunchpad`

1. Await launchpad readiness through `_KDB.api.launchpad.dispatch({ type: "launchpad/waitUntilReady", payload })`; do not read `_KDB.runtime.launchpad`.
2. Discover serializable descriptors via Cognos canvas/tabs wrappers.
3. For each descriptor, run route-to-launchpad workflow with reason `startup`.
4. Skip host widget and `writebackTable` as successful skips.
5. Record per-widget failures but continue the batch.
6. Commit no history.

### D2.4 `dropCreate`

1. Validate envelope and resolve canonical `widgetId` when already known.
2. Claim shell in deterministic order:
   - Kennzahl/metrics-tree visualization drop: resolve drop tab and claim the first eligible shell from that tab's `visualization` launchpad channel.
   - Toolbox text-button drop: resolve drop tab and claim the first eligible shell from that tab's `text` launchpad channel.
   - Existing launchpad/source id: use `dropRequest.originId` when it resolves to an eligible shell.
   - Payload/source widget id: use source metadata only when it resolves to an eligible Cognos shell.
   - Otherwise fail `WIDGET_BASE_WIDGET_ID_MISSING`.
3. Reject id mismatch with `WIDGET_BASE_WIDGET_ID_CONFLICT`.
4. Build a serializable descriptor and call descriptor-only `resolveLaunchpadRoute`.
5. If skipped, return `{ ok: true, skipped: true, reasonCode }`.
6. Register/read frame, create `opSeq`, and mark pending `dropCreate`.
7. Snapshot previous placement/layout/launchpad fields.
8. Place shell on canvas with validated dragDrop layout and apply Cognos layout.
9. Dispatch contentCreate using D2.10 content owner mapping.
10. After successful contentCreate, dispatch post-drop settings startup using D2.10a settings startup mapping when `_KDB.api.widgetSettings` is available. Do not dispatch settings startup before contentCreate succeeds.
11. Do not call `widgetVis/waitUntilContentReady` from `widgetBase`; `widgetSettings/seedDefaults` owns that wait for visual widgets.
12. If contentCreate or placement fails, run rollback, clear runtime created for the attempt and commit no history.
13. If settings startup fails after successful contentCreate, do not rollback; return/drop success may include diagnostics while `widgetSettings` owns its pending/error state.
14. If `opSeq` is stale, return stale result and commit no history.
15. On success, write `placement: "onCanvas"`, `layout`, `lastCanvasLayout`, `launchpadPad: null`, `launchpadSlotKey: null`, clear pending.
16. Commit `widget_canvasDrop` unless replay. Do not wait for settings default seeding, visual content-ready, binding or render before committing base history.

### D2.5 `routeToLaunchpad`

1. Read existing frame or discover descriptor.
2. Resolve route unless a trusted rollback/replay target pad is supplied.
3. Resolve slot metadata only through the published launchpad selector `readLaunchpadSlotMeta(_KDB, padKey, tabId)` from `dashboard/launchpad/state/selectors.js`.
4. Resolve DOM slot using launchpad selector config; never read `_KDB.runtime.launchpad`.
5. Apply only shell/frame transfer cleanup owned by `widgetBase`. Do not duplicate visual binding/filter/slot cleanup owned by `widgetVis/cleanupContent`; do not remove settings DOM owned by `widgetSettings/cleanupWidgetControls`.
6. Move shell into slot.
7. Write `placement: "inLaunchpad"`, `launchpadPad`, `launchpadSlotKey`, `layout: null`, preserve `lastCanvasLayout`, clear pending.
8. Commit `widget_launchpadTransfer` only for user/content-request reasons. The history `new` frame must use the resolved post-transfer route (`route.launchpadPad`, resolved slot key, route tab) rather than values from the pre-transfer frame snapshot.

Settings-delete/reset-to-launchpad uses this same public action with `reason: "user"` and optional diagnostic fields such as `requestedBy: "widgetSettings"`, `widgetType`, `isLiveWidget` and `isTextWidget`. Do not add a separate `widgetBase/settingsDelete` or `widgetBase/resetToLaunchpad` action unless a future flow has different base effects/history semantics.

### D2.6 `takeFromLaunchpad`

1. Use envelope `widgetId`; payload must not repeat it.
2. Resolve shell and target canvas/dropbox.
3. Place shell on canvas and apply Cognos layout.
4. Write `placement: "onCanvas"`, `layout`, `lastCanvasLayout`, `launchpadPad: null`, `launchpadSlotKey: null`, lifecycle `ready`.
5. Commit transfer history only for user-visible take actions.

### D2.7 `move` / `resize`

Mode actions:

1. `widgetBase/enableMove` arms one-shot move mode from a settings/toolbar shortcut. It initializes draggable interaction and runtime-only start layout state; it writes no durable layout and commits no history.
2. `widgetBase/setMoveMode` sets move mode `"default" | "oneShot" | "persistent"`. `"default"` disables move interaction; `"oneShot"` disables after the next final move; `"persistent"` remains armed until disabled. No history.
3. `widgetBase/resizeToggle` arms/disarms resize interaction. It initializes resizable interaction, runtime-only start layout state, min-size constraints (`text`: 100x50, live/visualization: 300x300), handles and any grid/containment helpers. No history.

Final commit actions:

4. Ignore non-final movement for durable state/history, except allowed transient DOM preview.
5. On final action, mark pending with `opSeq`.
6. Apply DOM/Cognos layout.
7. If `opSeq` matches, write `layout` and `lastCanvasLayout`.
8. Commit `widget_layoutMove` or `widget_layoutResize` unless replay. `old`/`new` frames include `widgetId` plus flat layout `{ x, y, width, height }`; do not port REDESIGN2 full widget snapshots for this tranche.

### D2.8 `applyColour` / `setColour`

1. Mark pending with `opSeq`.
2. Accept settings dropdown `optionValue` as the preferred colour input; accept `toColour` only as a compatibility alias.
3. Resolve and apply the shell/root background colour, mirror Cognos `fillColor` when the wrapper is available, and perform the minimal text-widget header `fill-customColor*` class sync when needed for legacy parity.
4. If `opSeq` matches, write frame `colour` as a base mirror.
5. Do not commit `widget_colourSet` for new user actions. Colour value/history belongs to `widgetSettings`; `widgetBase` is consequence-only for colour.

### D2.9 `remove`

`remove` is true removal/disposal only. Parking is always `routeToLaunchpad`.

1. Dispatch content cleanup when applicable.
2. Remove/detach shell according to available DOM/Cognos capability.
3. Clean widget runtime.
4. Write `placement: "removed"` and `lifecycle: "disposed"`.
5. Commit `widget_removed` only for user removal.
6. Destroy/replay removals commit no new history.

### D2.10 Content Owner Mapping

| Route result | Content dispatch |
|---|---|
| `kind: "text"` | `_KDB.api.widgetText.dispatch({ type: "widgetText/contentCreate", widgetId, payload })`; payload carries toolbox text-button drop context and initial text defaults. |
| `kind: "vis"` | `_KDB.api.widgetVis.dispatch({ type: "widgetVis/contentCreate", widgetId, payload })`; payload carries Kennzahl/metrics-tree context and `metric: { code, display, metricsTable }`. |
| `kind: "datatable"` | `_KDB.api.widgetDataTable.dispatch({ type: "widgetDataTable/contentCreate", widgetId, payload })` |
| `kind: "topN"`, `role: "topNHelper"` | No direct user-drop contentCreate; only explicit TopN helper claim/restore may call `_KDB.api.widgetTopN.dispatch(...)` per later TopN contract. |
| `kind: "other"` | No contentCreate in this tranche. |

Direct user drop of a LIST without explicit TopN claim is treated as `datatable`. Untitled LIST routes to `topN` only during startup discovery, restore or explicit TopN helper claim.

### D2.10a Post-Drop Settings Startup

After successful content owner creation, `widgetBase` starts settings UI startup when `_KDB.api.widgetSettings` is available:

1. Dispatch `_KDB.api.widgetSettings.dispatch({ type: "widgetSettings/placeControls", widgetId, payload })` or an equivalent settings-startup action.
2. `widgetSettings` owns the internal sequence from `placeControls` to `seedDefaults`; `widgetBase` does not orchestrate default values.
3. For visual widgets, `widgetSettings/seedDefaults` waits on `widgetVis/waitUntilContentReady` before dispatching visual default consequences.
4. `widgetBase` must not call `widgetVis/waitUntilContentReady`, inspect `_KDB.state.widgets.vis` or inspect `_KDB.runtime.widgetVis`.
5. Settings startup must never be called before successful contentCreate.
6. Failure of `placeControls`, `seedDefaults` or visual default apply after successful shell placement and contentCreate does not trigger rollback and does not block `widget_canvasDrop` history. The failure belongs to `widgetSettings`.

### D2.11 History Replay Scope

Replay in this tranche is limited to the same Cognos dashboard/spec identity context where the same Cognos widget DOM ids still resolve. Cross-session id remapping is out of scope and must not be simulated.

Layout replay (`widget_layoutMove`, `widget_layoutResize`) reuses the same Cognos-id scope as canvas-drop replay. Replay handlers are siblings of `applyWidgetBaseCanvasDropHistoryReplay`: registered via `collectReplayHandlers`, dispatch owner actions with `isHistoryReplay: true`, and skip history commit on the replay path.

New execution files for this tranche:

| File | Role |
|---|---|
| `history/applyWidgetBaseLayoutMoveHistoryReplay.js` | Undo/redo → `widgetBase/move` dispatch |
| `history/applyWidgetBaseLayoutResizeHistoryReplay.js` | Undo/redo → `widgetBase/resize` dispatch |
| `history/createWidgetBaseLayoutHistoryReplayHandler.js` | Handler factory for layout keys (or extend existing factory) |
| `core/services/collectReplayHandlers.js` | Register `widget_layoutMove` and `widget_layoutResize` |
| `actions/handleMoveOrResize.js` | Include `widgetId` in committed `old`/`new` frames |

---

## Section E. Published selectors

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetBaseState` | `_KDB.state.widgets.base` | Cloned base subtree or `undefined`. |
| `readFrame` | `_KDB.state.widgets.base.byId[widgetId]` | Cloned frame or `undefined`. |
| `readWidgetsByTab` | `_KDB.state.widgets.base.byId` | Cloned frame array for a tab. |
| `readPlacement` | frame placement fields | Placement projection or `undefined`. |
| `readAllWidgetIds` | frame keys | Array of widget ids. |

---

## Section F. Public API wiring

- Surface: `_KDB.api.widgetBase`
- Methods exposed: `mount`, `destroy`, `dispatch`, `getState`
- `_KDB.runtime.widgetBase` initialization: `subscriptions`, `abortControllers`, `listeners`, `observers`, `timers`, `pendingPromises`, `byId`
- `_KDB.state.widgets.base` initialization: `lifecycle`, `byId`, `errorCode`, `errorMessage`
- Per-frame durable fields include nullable `layout`, `lastCanvasLayout`, `colour`, `launchpadPad` and `launchpadSlotKey`.

---

## Section G. Integration prerequisites

Implementation must stop and report if any prerequisite is absent:

1. Launchpad production pad config has not been updated to `text`, `visualization`, `dataTables`, `topN`, `otherResources`.
2. `_KDB.api.launchpad.dispatch({ type: "launchpad/waitUntilReady" })` is not implemented or not contract-approved.
3. `readLaunchpadSlotMeta(_KDB, padKey, tabId)` cannot resolve all five target pads.
4. `canvas:dropValidated` is not catalogued with `widgetBase` as subscriber.
5. No content owner API exists for a drop's target kind; rollback must run and no history may be committed.
6. No reliable `widgetId` can be resolved from Cognos DOM/spec/content.
7. `_KDB.cognosAPI.canvas.setLayoutPosition(widgetId, layout)` is required for a path but no production wrapper exists; implementation must either stop for a Cognos-wrapper delta or explicitly return a layout-mirror limitation instead of pretending Cognos layout was confirmed.
8. `_KDB.api.widgetSettings` is absent: content drop may still succeed, but the implementation must report/diagnose that settings placement/default seeding was skipped rather than rolling back the base/content result.

---

## Section H. Legacy-to-target mapping table

| New production file | Legacy evidence | Composition / alignment note |
|---|---|---|
| `__orchestratorWidgetBase.js` | REDESIGN2 widgets orchestrator | Keeps orchestration thin; registers one dispatch API. |
| `createWidgetBaseController.js` | REDESIGN2 route/drop/reset orchestration | Coordinates actions through reducer/effects; no monolithic legacy flow. |
| `config/actionTypes.js` | REDESIGN2 widget event/action names and history adapter keys | Centralizes target action strings; preserves semantic workflow names while replacing legacy event routing with dispatch. |
| `config/launchpadChannels.js` | REDESIGN2 classifier + user-approved channel delta | Encodes target five channels and legacy remap. |
| `state/initialState.js` | REDESIGN2 `ensureRegionState`; laatsteOriginal `_KDB.state.widgets[widgetId]` registry | Creates serializable target subtree `_KDB.state.widgets.base`; no runtime handles in state. |
| `state/createWidgetBaseReducer.js` | REDESIGN2 `setWidgetSetting`, confirm/drop/reset state writes | Pure owner reducer for frame lifecycle, placement, pending/error and destroy transitions. |
| `state/selectors.js` | Current launchpad selector pattern; state-rule reader discipline | Publishes granular reads instead of adding read methods to `_KDB.api.widgetBase`. |
| `state/cloneSerializable.js` | Current contract pattern in services/selectors | Clones state snapshots to avoid returning mutable owner state. |
| `state/resolveLaunchpadRoute.js` | `classifyLiveWidgetLaunchpadPad.js`, KDB2 hide-spot routing | Pure target classifier; skips host/writeback, maps untitled LIST to `topN` only for startup/restore/explicit TopN claim. |
| `actions/handleDropCreate.js` | REDESIGN2 `routeCanvasDropRequest.js`; laatsteOriginal `widgetsOrchestrator.js` | New composed workflow: claim shell, place frame, dispatch content create, rollback on failure. |
| `actions/handleRouteAllToLaunchpad.js` | REDESIGN2 `scheduleInitialRoute` and route-all helpers | Startup discovery and parking after launchpad readiness; no startup history. |
| `actions/handleRouteToLaunchpad.js` | REDESIGN2 `sendLiveWidgetToLaunchpad.js`, `sendTextWidgetToLaunchpad.js`; KDB2 `resetWidget` | Moves a shell to a selector-resolved launchpad slot and records base placement. |
| `actions/handleTakeFromLaunchpad.js` | REDESIGN2 `takeLiveWidgetFromLaunchpad.js`, `takeTextWidgetFromLaunchpad.js`; KDB2 `getWidgetFromLaunchpad` | Takes a claimed Cognos shell from launchpad to canvas without minting a KDB id. |
| `actions/handleMoveOrResize.js` | REDESIGN2 `commitWidgetMove.js`, `commitWidgetResize.js`; jQuery UI stop handlers | Commits durable layout only after final confirmed movement/resize. |
| `actions/handleSetColour.js` | REDESIGN2 `commitWidgetColourChange.js`; KDB2 `setBackgroundColor` | Applies/mirrors shell/Cognos colour on request from `widgetSettings`; no new user-action colour history in `widgetBase`. |
| `actions/handleRemove.js` | REDESIGN2 cleanup/reset evidence; KDB2 reset/take-back distinction | True removal/disposal path; launchpad parking remains a separate route action. |
| `actions/rollbackWidgetBaseOperation.js` | REDESIGN2 `routeCanvasDropRequest.restoreToLaunchpad` | Deterministic route-back after placement/content failure; no history on rollback. |
| `actions/normalizeDispatchResult.js` | Current production service result patterns | Standardizes `{ ok, widgetId, opSeq, errorCode }` results for callers and rollback. |
| `view/resolveWidgetShell.js` | REDESIGN2 `resolveLiveWidgetMeta`, take helpers; KDB2 launchpad helper id lookup | Resolves Cognos DOM shell by id/scope; returned refs stay runtime-only. |
| `view/resolveLaunchpadSlotElement.js` | REDESIGN2 `findLaunchpadSlotMeta`, `appendWidgetToLaunchpadSlot`; current launchpad selectors | Resolves launchpad DOM through metadata/selectors, never through launchpad runtime. |
| `view/placeWidgetOnCanvas.js` | REDESIGN2 `placeWidgetOnCanvas.js`; dragDrop contract §11 | Uses validated payload scale/clamp boundary; final placement owned by widgetBase. |
| `view/moveWidgetToLaunchpad.js` | REDESIGN2 send/take helpers; launchpad contract | Moves widgetBase-owned shell to launchpad slot resolved by selectors. |
| `view/applyWidgetLayout.js` | REDESIGN2 `placeWidgetOnCanvas.js`, move/resize commit helpers | Applies DOM layout and uses `_KDB.cognosAPI.canvas.setLayoutPosition` only if a production wrapper exists; otherwise reports the integration gap. |
| `view/applyWidgetColour.js` | REDESIGN2 default background/colour helpers; KDB2 `setBackgroundColor` | Applies shell/background colour without content-module styling writes. |
| `effects/subscribeDropValidated.js` | REDESIGN2 `WIDGET_DROP_VALIDATED` subscription; production dragDrop event constant | Subscribes to `canvas:dropValidated` and stores cleanup under widgetBase runtime. |
| `effects/dispatchContentCreate.js` | REDESIGN2 drop path content/configure handoff | Replaces inline configuration with dispatch to content owners. |
| `effects/commitWidgetBaseHistory.js` | REDESIGN2 widget history pushes | Commits only after confirmed effects via `historyService`. |
| `effects/discoverCanvasWidgets.js` | REDESIGN2 route-all; current `canvas.findCanvasContent()` / `tabs.getTabsContent()` wrappers | Startup discovery through Cognos wrappers, no legacy direct globals. |
| `effects/cleanupWidgetRuntime.js` | REDESIGN2 reset cleanup + laatsteOriginal lifecycle helpers | Runtime cleanup under `_KDB.runtime.widgetBase`, not state. |

---

## Section I. Acceptance criteria

1. Every file from Section B exists and follows its Section C spec.
2. Public API is exactly `{ mount, destroy, dispatch, getState }`.
3. No file writes outside `_KDB.state.widgets.base`.
4. No DOM node, listener, promise, AbortController or Cognos object is stored in state.
5. No code reads `_KDB.runtime.launchpad`.
6. All launchpad routing uses `text`, `visualization`, `dataTables`, `topN`, `otherResources`.
7. `kdb3widget`/host widget and `writebackTable` are skipped.
8. `widgetId` is the Cognos widget DOM id.
9. `widgetBase.mount()` awaits launchpad readiness through `launchpad/waitUntilReady`; `KDB.js` does not need to await `launchpad.mount()`.
10. `routeAllToLaunchpad` commits no startup history.
11. `contentCreate` failure runs rollback and commits no history.
12. After successful `contentCreate`, `widgetBase` dispatches `widgetSettings/placeControls` and `widgetSettings/seedDefaults` when `widgetSettings` is available.
13. `widgetBase` does not call `widgetVis/waitUntilContentReady`; visual readiness is handled inside `widgetSettings/seedDefaults`.
14. Settings startup failure after successful contentCreate does not rollback shell placement/content creation and does not block `widget_canvasDrop` history.
15. Kennzahl/metrics-tree visualization drops claim from the matching tab's `visualization` channel before dispatching `widgetVis/contentCreate`.
16. Toolbox text-button drops claim from the matching tab's `text` channel before dispatching `widgetText/contentCreate`.
17. `remove` never parks; parking uses `routeToLaunchpad`.
18. `canvas:dropValidated` subscription is cleaned on destroy.
19. `ReadLints` reports no new diagnostics for created JS files.

---

## Section J. Forbidden actions

- Do not modify `.cursor/rules/`, templates or legacy trees.
- Do not write production code before CP-1 approval.
- Do not edit authority docs unless explicitly approved for the launchpad/widgetBase deltas.
- Do not create a top-level `_KDB.*` namespace.
- Do not add named commands to `_KDB.api.widgetBase`.
- Do not bundle another widget module implementation into this tranche.
- Do not bootstrap in `KDB.js` unless explicitly approved after CP-2.
- Do not invent unlisted launchpad channels or restore old `shapes` as an active target.

---

## Section K. Reviewer handoff

Before implementation is accepted, the reviewer checks:

1. The pre-flight echo is present and correct.
2. Every created file matches Section C.
3. All imports resolve.
4. `ReadLints` is clean.
5. The launchpad five-pad production delta is present before routing is exercised.
6. `widgetBase` contract and this execution spec still match.


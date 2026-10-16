# Widgets Current-Architecture Touchpoints

> READ-ONLY investigation map of the CURRENT (target) `_____________KDB3API` project for the upcoming **widgets** meta-architecture planning session.
> Scope: 4 future widget types (text, visualization, topN, datatable) under `KDB3/js/dashboard/`.
> This document describes the integration surfaces the future widgets module/services must plug into. It does NOT describe legacy widgets behavior, and it does NOT read the legacy trees (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`).
> Authored: 2026-06-05. Source: live production code + architecture docs + contracts at investigation time.

---

## IMPORTANT: contracts say "deferred", code says "mounted"

Several contracts (`launchpad.md`, `dragDrop.md`, `historyService.md`) are CP-1 drafts written when those modules were unbuilt, and still contain "Bootstrap registration is deferred" language. The **current production `KDB3/js/KDB.js` already registers and mounts them.** Where a contract and the live code disagree, this document treats the **live code** as the current architecture reality and flags the divergence. The planner should trust the code map in Section 2.

---

## 1. Rules summary (what a widgets module must obey)

Highest-authority docs: `architecture/stateOwnership.md` and `architecture/projectStructureRules.md`. The 10 MUST rules under `.cursor/rules/` (`kdb-object`, `state`, `runtime`, `naming`, `module-public-api`, `events`, `feature-structure`, `error-handling`, `dom`, `amd`) operationalise them.

**Public API discipline (`module-public-api.mdc`, stateOwnership "Public Module APIs").**
- Feature modules expose a narrow public surface at `_KDB.api.<module>` whose **default style is `dispatch + reducer`**: `{ mount, destroy, dispatch, getState }`. Commands are `dispatch({ type: "<module>/<verb>", payload })`.
- Shared services expose **named methods** at `_KDB.services.<service>` (e.g. `tableData`, `history`).
- The two shapes must not be mixed. `_KDB.api.launchpad.sendWidget(id)` (named command on a dispatch API) is explicitly forbidden; foreign state writes like `_KDB.state.widgets.x = …` are forbidden.

**State vs runtime (`state.mdc`, `runtime.mdc`).**
- `_KDB.state.<owner>` holds only serializable dashboard/session state (ids, values, settings, `lifecycle` + `freshness`). No DOM nodes, jQuery, listeners, subscriptions, AbortControllers, timers, observers, promises, Cognos handles, adapters, or functions.
- Technical runtime objects live under `_KDB.runtime.<owner>` (`domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`). Cleanup is owned by the module's `destroy()`.
- `lifecycle` values come only from `.cursor/lifecycleVocabulary.md` (`idle`, `initializing`, `loading`, `ready`, `error`, `disposed`, plus UI `mounted`/`destroying`, history `pending`/`committed`). `freshness` (`fresh`/`stale`) is a separate field.

**Ownership (`stateOwnership.md` "Canonical Writer Rule").** Every `_KDB.state.<subtree>` has exactly one canonical writer. Others read through selectors/readers or request changes through the owner's public API. Services may write only their own subtree.

**Events (`events.mdc`, `eventSubscribe.md`).** Events on `_KDB.events` carry facts/requests, never transfer ownership. Fact names are `<region>:<entity><VerbPast>`; request names end `…Requested`; slash-style `region/verb` strings are **actions**, not events. **An event that is not catalogued in `eventSubscribe.md` is not allowed to land in code.** Subscribers may only write their own subtree or call the owning module's API.

**Contract-first (`feature-structure.mdc` "Module Contract First").** No production code for a new module/service before an approved module contract in `_____________KDB3API/contracts/`. New top-level `_KDB.*` namespaces and new lifecycle terms require explicit user approval. Files stay small (80–120 LOC target), orchestrators thin, controllers own the public API and dispatch, reducers pure, effects do side-effects.

---

## 2. Current ownership / namespace map (verified against live code)

### `_KDB.state.*` canonical writers (from `stateOwnership.md` Full Ownership Map)

| State subtree | Canonical writer | Mounted today? |
|---|---|---|
| `_KDB.state.kdbControl` | kdbControl | ✅ mounted |
| `_KDB.state.authoring` | authoring (CP-1) | ✅ core (`__orchestratorAuthoring`) |
| `_KDB.state.launchpad` | launchpad | ✅ mounted |
| `_KDB.state.dragDrop` | dragDrop | ✅ mounted (CP-1 approved subtree, **not yet in the ownership-map table** — divergence) |
| `_KDB.state.filters.filterDock` | filterDock | ✅ mounted |
| `_KDB.state.filters.singleSelect` | singleSelect | ✅ mounted |
| `_KDB.state.filters.specialSingleSelect` | specialSingleSelect | ✅ mounted |
| `_KDB.state.filters.sicht` | sicht | ✅ mounted |
| `_KDB.state.filters.dienststelle` | dienststelle | ✅ mounted |
| `_KDB.state.tableData` | tableDataService | ✅ service |
| `_KDB.state.loading` | loadingService | ✅ service |
| `_KDB.state.history` | historyService | ✅ service |
| `_KDB.state.tabs`, `header`, `footer` | tabs / header / footer | header/footer ✅ mounted; tabs has no module yet |
| **`_KDB.state.widgets`** | **widgets module (RESERVED, no owner exists)** | ❌ does not exist |

**Confirmed reserved for the future widgets owner:**
- `_KDB.state.widgets` — listed in the ownership map (`stateOwnership.md` line 80, `projectStructureRules.md` line 131) with canonical writer **"widgets module"**. No subtree, no writer, no code exists today.
- `_KDB.runtime.widgets[widgetId]` — `projectStructureRules.md` line 111 gives the canonical example `_KDB.runtime.widgets[widgetId].listeners`. Per-widget runtime keyed by `widgetId` is the documented shape. Nothing creates it today.
- `_KDB.api.widgets` — listed as a feature-module API (`stateOwnership.md` line 112). Does not exist.
- `_KDB.api.visualizationWidget` — referenced as a future owner by `dienststelle` (see §3.4). Does not exist.

### `_KDB.api.*` feature modules mounted in `KDB.js` today

Registered in `registerFeatureModules` and mounted in `mountFeatureModules`:
`header`, `footer`, `kdbControl`, `historyControls`, `launchpad`, `dragDrop`, `metricsTree`, `filterDock`, `singleSelect`, `dienststelle`, `sicht`, `specialSingleSelect`. (`authoring` is registered as a core orchestrator.)

### `_KDB.services.*` services mounted today

Via `core/services/__orchestratorServices.js`: `tableData`, `loading`, `history`.

### Draft-only / candidate (no code)

- `widgetBindingService` and `hierarchyDataService` — `architecture/openDesignCandidates.md`. Candidates only; not adopted, no contract, no code. Both are directly relevant to widgets:
  - `widgetBindingService`: candidate owner of Cognos slot/filter/render-wait mutations for widgets. Until promoted, feature-local orchestration inside the consuming widget is acceptable.
  - `hierarchyDataService`: candidate sibling of `tableDataService` for `visType === "hierarchy"` data (`_KDB.state.hierarchyData.<tableName>`), with `readHierarchy/waitForHierarchy/reloadHierarchy/ensureFreshHierarchy`. Trigger is the first hierarchy widget consumer.

---

## 3. Per-touchpoint integration spec

### 3.1 launchpad (`contracts/launchpad.md`, `dashboard/launchpad/`)

**Status:** mounted in `KDB.js` (`_KDB.api.launchpad.mount({})`), despite the contract's §12/§13 "bootstrap deferred" language.

**Public API** (`createLaunchpadController.js`): dispatch-style `_KDB.api.launchpad = { mount, destroy, dispatch, getState }`. Actions: `launchpad/mountStarted`, `launchpad/mountSucceeded`, `launchpad/mountFailed`, `launchpad/destroy`.

**Published selectors** (`launchpad/state/selectors.js`, contract §6):
`readLaunchpadState`, `readLaunchpadReady`, `readLaunchpadTabs`, `readLaunchpadHelperTabIds`, `readLaunchpadSlotMeta(_KDB, padKey, tabId)`.

**Pad/slot metadata it exposes.** Canonical pad keys `visualization`, `text`, `dataTables`, `shapes`. State shape (`_KDB.state.launchpad`): `lifecycle, domReady, helperTabPageId, helperTabIds, padsByKey, tabs`. Per-pad slot meta: `{ aliases, childIndex, corTabIndex, layoutContainerId, pageId, tabId, slotKey: "visualization_0" }`. Slot DOM uses `data-kdb-launchpad-slot="<padKey>_<childIndex>"`. `mountSucceeded` stores `tabs`, `padsByKey`, `helperTabIds`, `helperTabPageId`.

**Explicitly DEFERRED to the future widgets owner** (quote, `contracts/launchpad.md`):
> "Widget cleanup, widget lifecycle, widget DOM movement, and writes to `_KDB.state.widgets` belong to the future `widgets` owner, not to `launchpad`." (§0)

> "No `sendWidget*`, `takeWidget*`, `cleanWidget*`, or `setWidgetPlacement*` methods are exposed on `_KDB.api.launchpad`; those are future `widgets` owner actions." (§5)

Out-of-scope list (§13): "Moving any widget into or out of launchpad. Writing `_KDB.state.widgets` or reading/writing `_KDB.runtime.widgets`. Cleaning widget DOM decorations. Rendering or re-rendering widgets after a move."

> "A future `widgets` tranche may consume published launchpad selectors and state selectors to locate its destination, but widget DOM mutation remains owned by `widgets`." (§10)

**Boundary for widgets:** launchpad is the **environment owner only** (hidden hosts `#KDB_HideSpot` / `#KDB_widgetLaunchpad`, pad containers, slot metadata). Widgets read slot meta through launchpad selectors and own all widget DOM movement, cleanup, re-render, and `_KDB.state.widgets` writes. `_KDB.runtime.launchpad.domRefs` is private — widgets must not read it.

### 3.2 dragDrop (`contracts/dragDrop.md`, `dashboard/canvas/dragDrop/`)

**Status:** mounted in `KDB.js` (`_KDB.api.dragDrop.mount({})`). Contract §14 "deferred" language is stale.

**Public API** (`createDragDropController.js`): named-method interaction surface `_KDB.api.dragDrop = { mount, destroy, refreshDropboxes, startDrag, finishDrag, getState }`. (Deviates from dispatch default because source binders and the `metricsTree` adapter need imperative methods; internal writes still go through a reducer.)

**The validated-drop hand-off — `canvas:dropValidated`** (catalogued in `eventSubscribe.md`, emitted by `dragDrop/dropboxes/publishValidatedDrop.js` line 40 via `_KDB.events.emit(_eventNames.DROP_VALIDATED, …)`; `events/eventNames.js`: `DROP_VALIDATED: "canvas:dropValidated"`).
- **Type:** fact. **Emitter:** `dragDrop` after `validateDropIntent` returns `{ isValid: true }`, temporary copy cleanup ran, and layout was resolved.
- **Payload** (built in `buildEventPayload`, matches catalog):

```js
{
  draggedElementType: string,   // "visualization" | "text"
  dropboxId: string,
  layout: object,               // { defaultHeight, defaultWidth, dragOffset:{x,y}, pointer, scaleX, scaleY }
  originId: string | null,
  padKey: string | null,        // "visualization" | "text"
  payload: object,              // source transfer payload (metrics code/display/title/… or text)
  sourceKind: string,           // "metricsTreeLeaf" | "kennzahlenTreeLeaf" | "toolboxTextButton" | "unknown"
  startedAt: number,
  tabId: string | null
}
```

- **Subscriber:** `eventSubscribe.md` lists it as `widgets / canvas owner — file: TBD future tranche — handler: TBD`. **No subscriber exists today.** Drops are validated and announced into the void.

**Coordinate / placement boundary** (quote, `contracts/dragDrop.md` §11). dragDrop computes up to the validated payload; the widgets/canvas owner finishes placement:

> dragDrop owns: `clientX/clientY -> dropbox-local pointer offset -> minus drag anchor offset -> rendered placement + scale metadata in payload`.
> The widgets/canvas owner owns: `rendered placement -> divide by canvas scale -> clamp within canvas bounds -> append/place widget -> persist layout/Cognos state/history`.
> "Do not use raw `clientX/clientY` as widget `left`/`top`."

§15 out-of-scope: "Creating, moving, placing, configuring, or persisting widgets. Porting `placeWidgetOnCanvas.js` into `dragDrop`. Writing `_KDB.state.widgets`, `_KDB.runtime.widgets`…".

**Boundary for widgets:** subscribe to `canvas:dropValidated`, take `layout` (scale-aware metadata), divide by scale, clamp to canvas, create/place the widget DOM, and persist widget state + history.

### 3.3 canvas placement (`dashboard/canvas/`)

**Reality check:** `dashboard/canvas/` is a group folder: `dragDrop/`, `kdbControl/`, and `pageSurface/` (`_KDB.api.canvas` — page size and background only, `contracts/pageSurface.md`). There is **no canvas placement module**. Widget placement is `widgetBase`. The `metricsTree` module supplies drag sources; `dragDrop` validates drops; `widgetBase` places shells.

**Conclusion:** `_KDB.api.canvas` is **not** the placement owner. Placement is `widgetBase`. Do not route drops or restore shells through pageSurface.

### 3.4 dienststelle → visualizationWidget (`contracts/dienststelle.md` §12, `dashboard/filters/dienststelle/`)

**Status:** dienststelle is mounted and the widget hand-off placeholder is fully implemented in `effects/notifyVisualizationWidgetDienststelleChanged.js`.

**Documented future boundary** (quote, `contracts/dienststelle.md` §12): "Dienststelle does not write widget state or widget runtime directly. Dienststelle communicates downstream hierarchy changes through the future `visualizationWidget` owner API. … If `_KDB.api.visualizationWidget.dispatch` exists, call it; otherwise emit the temporary log and do not treat the missing widget API as an error."

**Implemented dispatch-or-log** (`dispatchOrLog`): if `_KDB.api.visualizationWidget.dispatch` is a function it calls it; otherwise `console.info("[dienststelle.visualizationWidget.dispatch]", payload)`. This is the temporary placeholder; the contract says it "must be removed when `visualizationWidget` is implemented".

**Exact intended payload shape** (`contracts/dienststelle.md` §12; built by `buildVisualizationWidgetDienststellePayload.js`):

```js
_KDB.api.visualizationWidget.dispatch({
  type: "visualizationWidget/dienststelleChanged",
  payload: {
    filterId, filterLabel,            // e.g. "Dienststelle_DEZPV"
    activeFilterKey, visibleFilterLabel,   // "Dienststelle"
    selection: { displayValue, useValue, source: "user"|"default"|"historyReplay" },
    resolution: { /* serializable snapshot */ },
    source: "user" | "sichtDefault" | "historyReplay"
  }
});
```

**Trigger points** (only when an effective `selection.useValue` exists; `NOTIFY_CONTEXT_SOURCES = user|startup|sicht|historyReplay`):
- after a successful user Dienststelle OK/confirm applies a new effective value;
- after a successful Sicht-driven default/reconcile applies a new effective value;
- after a successful history undo/redo replay applies a Dienststelle snapshot;
- **not** after purely visual label sanitizing.

**Boundary for widgets:** the visualization widget owner must expose `_KDB.api.visualizationWidget.dispatch` and accept the `visualizationWidget/dienststelleChanged` action; it must read Dienststelle state only via `_KDB.api.dienststelle.getState()` or the serializable payload, never `_KDB.state.filters.dienststelle` directly.

### 3.5 tableDataService (`contracts/tableDataService.md`, `core/services/tableData/`)

**Status:** mounted service `_KDB.services.tableData`.

**Named-method read contract** (the surface topN/datatable widgets consume; contract §4b):

```js
_KDB.services.tableData = {
  readRows(tableName),        // pure cache read, no load trigger, never throws
  waitForRows(tableName),     // Promise<rows>; triggers load if not ready; dedupes via pendingLoads
  reloadTable(tableName, opts),  // aborts current load, forces fresh load
  ensureFreshRows(tableName), // cached if fresh+ready, else reload
  getState(),                 // snapshot of _KDB.state.tableData
  destroy()
};
```

Per-table state: `{ lifecycle: idle|loading|ready|error|disposed, freshness: fresh|stale, rows, rowCount, lastLoadedAt, errorCode, errorMessage }` at `_KDB.state.tableData.<tableName>`. Only the service writes this subtree; consumers never mutate it.

**hierarchyDataService deferral** (contract Q1 = "C — Hierarchy deferred"; `openDesignCandidates.md`): the skeleton handles **list-type tables only**. Hierarchy data (`visType === "hierarchy"`) is the deferred `hierarchyDataService` candidate. A topN/datatable widget over list data uses `tableDataService`; a hierarchy-backed widget would need the (not-yet-built) `hierarchyDataService` or feature-local hierarchy loading.

**Boundary for widgets:** topN and datatable widgets read rows exclusively through these named methods (typically `waitForRows`/`ensureFreshRows` then `readRows`). They must not read `_KDB.state.tableData` directly. Hierarchy-shaped widgets must flag the hierarchy gap to the planner.

### 3.6 historyService (`contracts/historyService.md`, `core/services/historyService/`)

**Status:** mounted service `_KDB.services.history`.

**Public API** (named methods): `{ pushCommittedStep(step), undo(), redo(), canUndo(), canRedo(), getSnapshot(), destroy() }`. State `_KDB.state.history = { lifecycle, stack, pointer, limit: 5, pendingStep:null, lastChangedAt, errorCode, errorMessage }`. Committed step shape: `{ key, timestamp, old:{…}, new:{…} }` (serializable snapshots).

**Replay boundary** (contract §10). Applying a step is delegated:
- `resolveHistoryHandler(stepKey)` returns a handler only when a rule-aligned owner integration exists; otherwise undo/redo resolves `false`.
- Handler shape: `{ apply: function (_KDB, targetValue, step, context) { … } }`.
- `context.direction` is `"undo"` or `"redo"`; `targetValue` is `step.old` for undo, `step.new` for redo.
- Handlers must not write foreign state; they delegate to the state's owner.

**How an owner registers a replay handler today** (verified in code — the live pattern a widgets owner must mirror):
1. The owner module stages a contribution onto its own runtime: `_KDB.runtime.<owner>.historyReplayHandlerContribution = handler` (see `dienststelle/history/stageDienststelleHistoryReplayHandler.js`).
2. `core/services/collectReplayHandlers.js` reads each owner's `runtime.<owner>.historyReplayHandlerContribution` and maps it to step keys. Currently registered: `kdbControl_settingsChange`, `header_chromeChange`, `header_textChange`, `footer_chromeChange`, `filter_singleSelect`, `filter_sicht`, **`filter_dienststelle`**.
3. `KDB.js` `mountFeatureModules` calls `_orchestratorServices(_KDB, { bindHistoryReplayHandlersOnly: true })` **after** feature modules mount, which re-collects handlers and binds them into `historyService`.

**Existing model: the `dienststelle` history step (`filter_dienststelle`).** Standalone step key `filter_dienststelle`, step shape `{ key, timestamp, old:{ activeSichtValue, activeFilterKey, visibleFilterLabel, valuesByScope:{ global, pageContext } }, new:{…} }`. Replay runs through the owner's own logic (`handleDienststelleHistoryReplay.js`) and must not push a new history step. This is the cleanest template for a future `widget_*` step (e.g. `widget_layoutMove`, already used as the example step key in `historyService.md` §3).

**Boundary for widgets:** to participate in undo/redo, the widgets owner (a) pushes serializable `widget_*` committed steps via `pushCommittedStep` after confirmed changes, and (b) stages a replay handler at `_KDB.runtime.widgets.historyReplayHandlerContribution` and gets a new entry added to `collectReplayHandlers.js` (which is a tiny KDB-core edit — note for the planner).

### 3.7 eventSubscribe (`architecture/eventSubscribe.md`, `events.mdc`)

**Events already catalogued that a widgets module would emit/subscribe:**

| Event | Type | Emitter | Relevance to widgets |
|---|---|---|---|
| `canvas:dropValidated` | fact | dragDrop | **Widgets must subscribe** (currently subscriber = TBD future widgets/canvas owner). |
| `history:changed` | fact | historyService | Payload `{ pointer, stackLength, limit, canUndo, canRedo }`; subscribed by `historyControls`. Widgets may subscribe if they need to react to undo/redo. |
| `tableData:loadFinished` | fact | tableDataService | `{ tableName, rowCount }`; subscriber currently placeholder. topN/datatable widgets may subscribe to refresh on load. |
| `tableData:loadFailed` | fact | tableDataService | `{ tableName, errorCode, errorMessage }`; placeholder subscriber. |

**Discipline for adding new events.** A new event requires: (1) propose to user, confirm fact vs request and naming; (2) add an `eventSubscribe.md` entry; (3) implement emit/subscribe/teardown in the owning module; (4) reference the catalog entry from the module contract. "A new event without a catalog entry is not allowed to land in code." Known-owner commands should prefer direct API dispatch over events (the `dienststelle`/`filterDock` pattern).

---

## 4. What the widgets domain will have to provide

Consolidated obligations the current architecture already implies for the future widgets module/services:

1. **Own `_KDB.state.widgets`** as the single canonical writer (reserved in the ownership map), storing only serializable widget state (ids, type, layout left/top/size, config, per-widget lifecycle/freshness).
2. **Own `_KDB.runtime.widgets[widgetId]`** for per-widget DOM refs, listeners, subscriptions, abortControllers, observers, timers — cleaned up by the widgets owner's `destroy()`.
3. **Expose a public API** `_KDB.api.widgets` (dispatch-style) and, for visualization specifically, **`_KDB.api.visualizationWidget.dispatch`** accepting `visualizationWidget/dienststelleChanged` (exact payload in §3.4). Decide whether `visualizationWidget` is its own API or a facet of `widgets` (open question).
4. **Subscribe to `canvas:dropValidated`** and finish the placement pipeline dragDrop defers: divide rendered placement by canvas scale, clamp to canvas bounds, append/place the widget, and persist layout/Cognos/history.
5. **Take over launchpad widget operations** launchpad refuses: send/take/clean/route widgets, widget DOM movement between canvas and launchpad slots, widget re-render after a move, and all `_KDB.state.widgets` writes — reading destination slot metadata via launchpad selectors only.
6. **Consume data through services, not state:** `tableDataService` named methods for list-backed topN/datatable widgets; flag the `hierarchyDataService` gap for any hierarchy-backed widget; consider `widgetBindingService` for Cognos slot/filter/render-wait orchestration (currently feature-local is acceptable).
7. **Register a history replay handler** for `widget_*` step keys: stage `_KDB.runtime.widgets.historyReplayHandlerContribution = { apply(_KDB, targetValue, step, context) }`, add the step key(s) to `core/services/collectReplayHandlers.js`, and push serializable committed steps via `_KDB.services.history.pushCommittedStep`.
8. **Accept the dienststelle downstream hand-off** so the temporary `[dienststelle.visualizationWidget.dispatch]` log can be removed; expose state to dienststelle/other consumers via `_KDB.api.widgets.getState()` / serializable payloads only.
9. **Follow a Module Contract First workflow** (one contract per widget type or one widgets-domain contract + deltas) before any code, including catalog entries for any new `widgets:*` events and explicit approval for any new namespace/lifecycle terms.
10. **Decide canvas placement ownership** (widgets vs a separate `canvas` owner) and create/mount it in `KDB.js`, ordered after launchpad + dragDrop are available.

---

## 5. Open questions / ambiguities for the planner

1. **`visualizationWidget` vs `widgets`.** Is `_KDB.api.visualizationWidget` a standalone module/API, or the visualization-type facet of a single `widgets` module? `dienststelle` only references `visualizationWidget`; the ownership map only reserves `widgets`. The contract for widgets must reconcile these names (and whether topN/datatable/text each get sibling APIs or share `_KDB.api.widgets` with a `type` discriminator).
2. **Canvas placement owner.** `dashboard/canvas/` has dragDrop + kdbControl but no placement owner. Does placement (scale-divide, clamp, append, persist) live inside the widgets module, or a dedicated `canvas` placement owner that widgets call? This affects who subscribes to `canvas:dropValidated` and who owns canvas geometry/scale.
3. **Hierarchy data path.** topN/datatable/visualization widgets backed by Cognos hierarchies have no service — `tableDataService` is list-only and `hierarchyDataService` is an unpromoted candidate. Does the widgets work trigger promotion of `hierarchyDataService`, or is feature-local hierarchy loading acceptable for the first widget tranche?
4. **widgetBindingService promotion.** Cognos slot/filter/render-wait orchestration is a candidate service. Is the first widget port the "two-feature repetition" trigger to promote it, or do widgets orchestrate Cognos binding feature-locally?
5. **collectReplayHandlers edit.** Registering widget replay handlers requires editing `core/services/collectReplayHandlers.js` (KDB-core). Is that edit in-scope for the widgets tranche, and what `widget_*` step keys are canonical (`widget_layoutMove`, `widget_create`, `widget_remove`, `widget_configChange`…)?
6. **Contract-vs-code drift.** `launchpad.md`, `dragDrop.md`, `historyService.md` still say "bootstrap deferred" though the code mounts them. Should these contracts be synced before the widgets contract references them, to avoid the planner reasoning from stale "not mounted" statements?
7. **Drop payload sufficiency.** Does the `canvas:dropValidated` payload (`layout` with scale + pointer + dragOffset, `padKey`, `payload`, `tabId`) carry everything a widget needs to create itself, or will widgets need extra fields (e.g. canvas bounds, default widget config) that imply a dragDrop contract delta?

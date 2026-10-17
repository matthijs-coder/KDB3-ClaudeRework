# Module Contract: `widgetVis`

> Full CP-1 contract for the visualization-content composed-port tranche. Design authority lives in `_____________KDB3API/architecture/_archive/widgets-domain-blueprint.md`; this contract makes the `widgetVis` implementation scope explicit and keeps settings/history/layout ownership outside this module.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetVis`
**Type:** `feature module` (content / consequence owner)
**Authoring AI:** GPT-5.5, 2026-06-07
**Reviewed by:** `<pending CP-1 approval>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetVis` is a new visualization-content owner assembled from legacy visualization behavior and the widgets-domain blueprint. It is not a 1-to-1 port of one legacy module.

Target production path:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetVis/
```

This tranche owns visualization content consequences: content creation, binding requests, post-render title/legend/tooltip cleanup, drillthrough T1 header icon + T2 S2 datapoint chrome + service call (F1c via stamped `visualizationFacet`; no Ctrl), Dienststelle downstream reaction, and visual-content cleanup. It does not own settings values, settings history, frame placement, layout move/resize, launchpad routing, or TopN internals.

No production behavior code may be generated until this CP-1 contract is approved. The execution spec in `widgetVis-port-execution-spec.md` is a handoff document, not approval to code.

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `architecture/_archive/widgets-domain-blueprint.md` | Authority for content/base/settings split, dispatch APIs, state ownership, write-after-apply discipline and service boundaries. |
| `contracts/widgetSettings.md` | `widgetSettings` owns panel control values and their history; `widgetVis` receives apply commands and reports confirmed effect success/failure. |
| `contracts/widgetBase.md` | `widgetBase` owns shell/body, placement, layout, launchpad movement and base cleanup ordering; it may request visual-content cleanup through `widgetVis`. |
| `contracts/widgetBindingPlan.md` / `widgetBindingApply.md` | Binding services are hard prerequisites for real setting consequences. `widgetVis` provides the spec/target and consumes plan/apply diagnostics. |
| `contracts/dataSourceContext.md` | Future owner for active metrics datasource selection. Until that module exists, `widgetVis` uses a local datasource resolver with a global-config default. |
| REDESIGN2 visualization investigation | Title composition, post-render cleanup trigger, legend visibility, tooltip metadata and Cognos focus-mode DOM behavior. |
| lastOriginal `alterVisTitle` vs kennzahlDefaults (2026-09-01) | Header title/tooltip aggregation parentheses; lastOriginal always used `allOther`; this tranche used the binding vis-type branch. **Grouping-A Implemented** (PO canvas 2026-09-11): same factory as `buildLocalFilters` on grain packs `stichtag` \| `jahr` \| `list`. Rules: `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`, `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md`. |
| legacy drillthrough investigation | Drillthrough T1 header icon + T2 S2 datapoint chrome + service call; F1c via stamped `visualizationFacet`; runtime cleanup of icons/click/unsubs. |
| current production touchpoint investigation | `widgetVis` scaffold and bootstrap already exist; binding services and Dienststelle retargeting are missing integration points. |

Deliberate deltas versus legacy:

- `widgetVis` has no own history keys in this tranche. `widgetSettings` owns settings history; `widgetBase` owns frame/layout/launchpad history. Undo/redo reaches `widgetVis` through the same normal dispatches those owners use.
- Visual-content cleanup moves to `widgetVis`, not `widgetBase`: `widgetBase` owns the shell/body and calls `widgetVis/cleanupContent` before or during launchpad transfer/removal when visual content must be cleared.
- Visible legend-caption normalization for `#` / `ALLE` / `Beendet` is **in this tranche** as a string pipeline in `view/legend/` (hash per segment, then keep Cognos order; compose is unused). Hash vectors: `contracts/_archive/widgetVis-legend-normalization-contractdelta.md`. Keep-order assemble: `contracts/_archive/widgetVis-legend-keep-order-non-list-contractdelta.md`. LINE titles: `contracts/_archive/widgetVis-legend-line-dst-first-contractdelta.md`. Flash sequencing (observer before `applyBinding`; sweep before post-render properties): `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`. It is not vis-type config. Title-header tooltip and `syncTooltipMetadata` stay as they are except the title-aggregation suffix in `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`.
- Header title/tooltip Aggregationstyp parentheses are **in this tranche** as a derived string in the existing title builder (same lookup as `buildLocalFilters`). Deliberate delta vs lastOriginal `allOther`. **Grouping-A Implemented:** effective grain + shared factory, not vis-type `branchKey`. Title does not own the grouping control. Rules and golden vectors: `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`. Catalog: `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md`.
- Drillthrough is a T1 header-icon consumer + T2 S2 datapoint chrome + `_KDB.services.drillthrough` call. T2 consumes F1c ops on the existing stamped `visualizationFacet` (`getSelections` / `subscribeSelections`). No Ctrl. No 3s flush. No new facet. Shared inner class `.kdb_hyperlink_icon`; T1 asset `pkzDrillthrough.png`; S2 asset `datapoint_pkzDrillthrough.png` under wrapper `kdb-datapoint-pkz`. T1 header placement (`right: 28px`, `.widgetHeader .widgetIcons`) is unchanged.
- Maximize/focus-mode is owned by `widgetVis` as Cognos focus/expand behavior, not frame geometry. The accepted first tranche is observer-based and intentionally minimal: no persisted maximize restore and no `widgetVis` history key.
- TopN is last: `widgetVis` must preserve action and opSeq protocol, but full TopN resolution waits for `widgetTopN`.
- Intentional emptying is a normal binding consequence: `widgetVis` maps its internal `forceEmpty`/`emptyReason` intent to canonical `BindingPlanSpec.emptyIntent`, then still runs `buildPlan -> applyBinding -> render wait -> confirmed result`; no separate apply-service empty route is introduced.

## 2. Purpose

`widgetVis` owns the visible visualization content inside a widget frame. It turns settings and external commands into visualization binding effects through `widgetBindingPlan` and `widgetBindingApply`, updates derived/working visualization state after confirmed effects, manages post-render title/legend/tooltip plus drillthrough T1 header icon, T2 S2 datapoint chrome (F1c subscribe/peek), and service call, and cleans visual content when requested by `widgetBase` or `widgetSettings`.

`widgetVis` is a consequence owner, not a settings owner. It never stores canonical `dimension`, `visType`, `topNChoice`, `showValues`, or grouping grain values and never pushes settings history.

For the current tranche, `widgetVis` resolves the metrics datasource through a local config boundary. The resolver checks for a future `_KDB.api.dataSourceContext.getCurrentMetricsDataSource()` first, then falls back to `_KDB.config.dataSources.metrics.default`, currently `Personal_KDB`. Deep `widgetVis` files must not hardcode `Personal_KDB` or read datasource globals directly.

## 3. Ownership

Canonical state subtree:

```js
_KDB.state.widgets.vis = {
  lifecycle: "idle",
  byId: {},
  errorCode: null,
  errorMessage: null
};
```

Per-widget state:

```js
_KDB.state.widgets.vis.byId[widgetId] = {
  widgetId: "<cognos-dom-id>",
  derived: {
    titleText: "",
    code: null,
    display: null,
    metricsTable: null,
    langtext: null,           // optional metric passthrough from the canonical tree lookup; title tooltip source (§13, sync 2026-07-14)
    url: null,                // optional metric passthrough; title hyperlink href (§13, sync 2026-07-14)
    topNResultValues: [],
    datasourceId: null,
    datasourceName: null,
    lastAppliedVisType: null,
    emptyStatus: null,        // null | "intentional" | "noData"
    emptyReason: null
  },
  maximized: false,
  pending: { kind: null, opSeq: null },
  errorCode: null,
  errorMessage: null
};
```

Ownership rules:

- `widgetVis` is the only writer of `_KDB.state.widgets.vis`.
- `widgetVis` reads settings values only through `widgetSettings` selectors or through the apply action payload supplied by `widgetSettings`.
- `widgetVis` writes derived/working state only after confirmed effects or confirmed cleanup.
- `widgetVis` never writes `_KDB.state.widgets.settings`, `_KDB.state.widgets.base`, `_KDB.state.widgets.topN`, `_KDB.state.history`, or any filter subtree.
- Drillthrough buffers, Cognos content objects, DOM nodes, listeners, promises and AbortControllers are runtime-only and never stored in state.

Lifecycle subset for the module-level state: `idle`, `initializing`, `ready`, `error`, `disposed`. Per-widget visual records do not introduce their own lifecycle field in this tranche; `pending` and `errorCode` cover operation status.

## 4. Runtime

Owner namespace:

```js
_KDB.runtime.widgetVis = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  byId: {}
};
```

Per-widget runtime:

```js
_KDB.runtime.widgetVis.byId[widgetId] = {
  domRefs: {
    contentEl: null,
    headerEl: null,
    titleLinkEl: null,
    drillthroughIconEl: null,
    datapointDrillthroughIconEl: null
  },
  listeners: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  opSeq: 0,
  lastSuccessfulPlan: null,
  managedFilterItemIds: [],
  drillthrough: {
    installed: false,
    lastSelectionEvent: null,
    pendingSelectionEvents: [],
    captureActive: false
  },
  focusMode: {
    observedExpanded: false,
    observer: null,
    focusPanelEl: null,
    dispose: null,
    source: null
  }
};
```

Runtime rules:

- `opSeq` is the single stale-result guard per visualization widget.
- New apply work aborts prior same-widget apply work where safe and increments `opSeq`.
- `lastSuccessfulPlan` and `managedFilterItemIds` are runtime coordination only; they are not settings or history.
- `pendingPromises.contentReady` coalesces callers waiting for per-widget content registration. It resolves after `contentCreate` has created the visual state record, registered the minimal metric/data identity needed for `BindingPlanSpec`, and initialized per-widget runtime. It does **not** wait for Cognos binding/render completion.
- Tranche 1 does not install `content.on` or capture-flush listeners. T1 icon click listeners and `drillthroughIconEl` belong to `widgetVis` and are removed by `cleanupContent` and `destroy`.
- Tranche 2 (PO 2026-08-30): `subscribeSelections` via stamped `visualizationFacet` (per-widgetId replace). Store the unsubscribe on `listeners.drillthrough*` and unsub on dispose / tab / re-install. S2 plant uses `datapointDrillthroughIconEl` + a second `drillthrough*` listener. **Subscribe drives chrome; `getSelections` peek is source of truth at click.** Capture keys may be reused as a last-selection buffer only. Never `widget.querySelector(".kdb_hyperlink_icon")` (hits T1). No `_KDB.cognosAPI` / `content.on` in widgetVis.
- Focus-mode observers, focus-panel DOM clones and any dispose handles belong to `widgetVis` runtime and are removed by unmaximize, `cleanupContent`, route/remove cleanup and `destroy`.
- `destroy()` sets `_isDisposed = true` first, aborts controllers, removes listeners, disconnects observers, clears timers/pending promises, removes owned icon/title DOM additions, clears runtime entries and marks module state `disposed`.

## 5. Public API

Feature module surface:

```js
_KDB.api.widgetVis = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Signature | Contract |
|---|---|---|
| `mount(options)` | `({ enableDrillthrough?: boolean } = {}) => boolean` | Default `enableDrillthrough: true` when omitted. Production `KDB.js` passes `{ enableDrillthrough: true }` explicitly. The resolved flag is stored on `_KDB.runtime.widgetVis.enableDrillthrough` (runtime, not state). Initializes `_KDB.state.widgets.vis` and `_KDB.runtime.widgetVis`. Does not create per-widget content; per-widget creation is `contentCreate`. |
| `destroy()` | `() => void` | Idempotent module teardown; sets `_isDisposed` before cleanup and removes all owned runtime resources. |
| `dispatch(action)` | `(action: WidgetVisAction) => Promise<object>` | Single command entry. All state/effect actions route through this method. Post-disposal calls no-op and warn once. |
| `getState()` | `() => object | undefined` | Returns a cloned snapshot of `_KDB.state.widgets.vis`; never returns live mutable state. |

No named commands are added to `_KDB.api.widgetVis`.

### 5.1 Action Envelope

Every action uses:

```js
{
  type: "widgetVis/<actionName>",
  widgetId: "<required for per-widget actions>",
  opSeq: 1,
  payload: {}
}
```

Payloads must not repeat `widgetId` unless the contract for an external payload explicitly preserves legacy field names; envelope `widgetId` wins and conflicts return `WIDGET_VIS_WIDGET_ID_CONFLICT`.

Normalized dispatch result:

```js
{
  ok: boolean,
  outcome?: "aborted",       // adapter-contract outcome class (E0b, 2026-08-20)
  reason?: "disposed",       // set with outcome on post-disposal dispatches
  widgetId?: string,
  opSeq?: number,
  skipped?: boolean,
  stale?: boolean,
  status?: "success" | "timeout" | "error" | "aborted",
  reportToSettings?: object,
  errorCode?: string,
  errorMessage?: string,
  diagnostics?: object
}
```

`reportToSettings` is a result object for the caller (`widgetSettings`) to consume; `widgetVis` does not write settings state directly.

Post-disposal dispatch returns the uniform silent disposed outcome (E0b, 2026-08-20, `ADAPTER_ONTWERP_2026-08-20.md` §3.4): `{ ok: false, outcome: "aborted", reason: "disposed", skipped: true, status: "aborted" }` — no user message, no history entry, one-time console warn. The same shape (minus `skipped` where the module's normalizer has no such field) applies to `widgetSettings`, `widgetText`, `widgetDataTable` and `widgetTopN`; `widgetBase` keeps its `ok:false` + `errorCode` disposed result and adds `outcome`/`reason`.

## 6. Action Payloads And Behaviour

### `widgetVis/contentCreate`

Payload:

```js
{
  dropRequest?: object, // required for real drops; omitted by non-drop callers (parameter-set restore, replay) that supply an explicit `metric` (sync 2026-07-14)
  initialSettings?: {
    dimension?: string,
    visType?: string,
    topNChoice?: string
  }, // explicit replay/migration override only; normal drop defaults come from widgetSettings/seedDefaults
  metric: {
    code: string,
    display: string,
    metricsTable?: string,
    langtext?: string,  // long title / tooltip text from the metrics tree (optional, sync 2026-07-14)
    url?: string        // dxmeta measure url from the metrics tree (optional; consumed by the title link, §13; sync 2026-07-14)
  },
  isHistoryReplay: boolean
}
```

The optional `langtext` / `url` fields are carried into the derived metric identity when present and are ignored otherwise. They are supplied by the canonical metrics-tree lookup (`metricsTree-resolveMetricByCode-contractdelta.md`) so all placement paths (drop, history replay, parameter-set restore) deliver the same metric descriptor. Neither field is persisted in v3 writeback (code-only rule, `writeback.md` §4.5). The post-render title sync consumes them for the title tooltip and hyperlink (§13, sync 2026-07-14).

Flow:

1. Ensure per-widget state/runtime exists.
2. Resolve content/header DOM within the shell owned by `widgetBase`.
3. Build the initial derived title from metric/drop-context evidence.
4. Register the minimal metric/data identity required for later `buildBindingSpec` calls.
5. Resolve any `widgetVis/waitUntilContentReady` waiters for this `widgetId`. Content-ready means registration-ready, not render-ready.
6. For normal drop startup (`isHistoryReplay: false`), do not run default control binding in `contentCreate`; initial visual/default consequences are owned by `widgetSettings/seedDefaults` after readiness. `initialSettings` is reserved for an explicit replay/migration contract and must not silently compete with startup seeding.
7. Plant the T1 drillthrough icon (and bind icon click) when enabled and content exists. T2: F1c `subscribeSelections` + S2 plant when peek/subscribe reports real categories. No `content.on` in this module.
8. Return success only after required content initialization succeeds.

`contentCreate` is the per-widget readiness gate for normal drop startup. It prepares content context and metric/data identity so later `widgetVis/apply*` actions can build a canonical `BindingPlanSpec`; it is not the owner of default settings consequences.

### `widgetVis/waitUntilContentReady`

Payload:

```js
{
  timeoutMs: number
}
```

Readiness contract:

- This action is a per-widget readiness gate for `widgetSettings` default seeding and any other owner that must know whether `widgetVis` can accept apply actions for a widget.
- It resolves `{ ok: true, widgetId, ready: true }` when `_KDB.state.widgets.vis.byId[widgetId]` exists and contains the minimal metric/data identity required to build a canonical `BindingPlanSpec`, and `_KDB.runtime.widgetVis.byId[widgetId]` exists with an `opSeq` bucket.
- It does **not** wait for `widgetBindingPlan`, `widgetBindingApply`, Cognos render, title sync, legend/tooltip cleanup, drillthrough install, or any settings apply success.
- If the widget is not ready yet, the action coalesces a Promise under `_KDB.runtime.widgetVis.byId[widgetId].pendingPromises.contentReady` and resolves it when `contentCreate` reaches the registration-ready point.
- `timeoutMs` defaults to the module default content-ready timeout. Timeout resolves `{ ok: false, status: "timeout", errorCode: "WIDGET_VIS_CONTENT_READY_TIMEOUT" }` and leaves no dangling pending promise.
- `destroy()` rejects or resolves pending waiters with a disposed/failed result before clearing runtime.
- `widgetSettings` must call this action through `_KDB.api.widgetVis.dispatch(...)`; it must not poll `_KDB.state.widgets.vis` or inspect `_KDB.runtime.widgetVis`.

### `widgetVis/applyStartupSettings`

Payload:

```js
{
  settingsSnapshot: {
    dimension: string | null,
    visType: string,
    topNChoice: string
  },
  changedControls: [
    { kind: "dimension", control: "dimension", previousValue: string | null, nextValue: string | null },
    { kind: "visualization", control: "visType", previousValue: string | null, nextValue: string },
    { kind: "topN", control: "topNChoice", previousValue: string | null, nextValue: string }
  ],
  source: "startup",
  isHistoryReplay: false
}
```

Startup settings are a batch consequence for normal widget drops only. `widgetSettings/seedDefaults` sends this action after `widgetVis/waitUntilContentReady` succeeds, instead of sending separate startup `applyDimension`, `applyVisType`, and `applyTopNChoice` actions. `settingsSnapshot` is authoritative for the startup `BindingPlanSpec.dataConfig`; `changedControls` tells `widgetVis` and the caller which settings values are represented in the batch. `colour` / `backgroundColor` is not part of this payload and remains a shell consequence owned by `widgetBase`.

Settings-delete undo restore may also call this action with `source: "historyReplay"`, `isHistoryReplay: true`, and a `settingsSnapshot` built from committed `_KDB.state.widgets.settings` (not dropdown startup defaults). In that case `widgetVis` uses `reason: "historyReplay"`, runs the same single batch binding pipeline, and must not push history. `widgetSettings` does not re-commit values that are already in settings state when the batch succeeds.

`widgetVis` must run at most one visible binding pipeline for this action, and only after `resolveBindingPrerequisites` has completed. At startup batch start, `widgetVis` increments/captures one visible widget runtime `opSeq`, marks `pending:{ kind:"startupSettings", opSeq }`, and reuses that `opSeq` for any internal TopN helper request and for the final visible binding pipeline. It maps `{ dimension, visType, topNChoice }` from the snapshot into the canonical binding spec and uses `reason: "startup"`. `widgetVis` owns how `topNChoice` is interpreted, including `none`; `widgetSettings` must not pre-resolve or strip TopN semantics.

For default/no-op TopN values, `widgetVis` must skip TopN-helper waiting and set `helperTableResult: null`. If the startup batch represents a replay/migration/edge case where `previousValue` for `topNChoice` was non-default, or a current helper claim can be seen through `widgetTopN` public state/selectors, `widgetVis` must also dispatch `widgetTopN/cleanup` with `clearHelperBinding:true` and `releaseClaim:false` before the confirmed visible binding report. For a fresh normal drop with no previous TopN helper claim, no cleanup is required.

For non-default startup TopN, `widgetVis` coalesces helper completion internally: it dispatches `widgetTopN/resolveRequested` with the startup batch `opSeq`, waits for the matching terminal `widgetVis/topNResolved` payload under the same pending startup operation, converts it to `helperTableResult`, and only then calls `widgetBindingPlan.buildPlan(spec)` once for the visible widget. The inline/coalesced handler must not report settings success from the helper terminal alone; the batch `reportToSettings` is returned only after the confirmed visible apply. If `widgetTopN` is unavailable in the current tranche, this action may return documented deferred/report data without requiring `widgetSettings` to send a second startup visual action.

Startup binding must also include a confirmed Dienststelle hierarchy snapshot. `widgetVis` first reads `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` when available. If no confirmed snapshot is available yet, it waits for/coalesces the next `widgetVis/dienststelleChanged` broadcast up to a timeout. On timeout or missing confirmed hierarchy, `widgetVis` returns a pending/deferred/error result and does not silently bind without hierarchy.

On confirmed success, return `reportToSettings` with batch-level diagnostics and per-control data sufficient for `widgetSettings` to commit all included startup values without history:

```js
{
  controls: [
    { kind: "dimension", control: "dimension", previousValue, nextValue },
    { kind: "visualization", control: "visType", previousValue, nextValue },
    { kind: "topN", control: "topNChoice", previousValue, nextValue }
  ],
  diagnostics: object | null
}
```

On timeout/error/aborted/stale, write only `widgetVis` owned pending/error/stale state and return a normalized failure result. `widgetVis` must not commit `_KDB.state.widgets.settings` or push history. `widgetSettings` must not fall back to separate startup `apply*` actions after this action fails.

### `widgetVis/applyDimension`

Payload:

```js
{
  control: "dimension",
  previousValue: string | null,
  nextValue: string,
  settingsSnapshot: object,
  source: "user" | "historyReplay" | "startup",
  isHistoryReplay: boolean
}
```

Runs derive -> `widgetBindingPlan.buildPlan(spec)` -> `widgetBindingApply.applyBinding(plan, options)` -> post-apply title/legend/tooltip + drillthrough icon re-install (not capture flush). On confirmed success, returns `reportToSettings` with the control, previous/next values and diagnostics. It does not commit the value or push history. Dimension-carrier data-item display name is Cognos `setCustomLabel` inside apply (`contracts/_archive/visualization-dimension-custom-label-contractdelta.md`); `widgetVis` does not call `setCustomLabel` / `_KDB.cognosAPI` / `__getDashboardAPI()`.

`settingsSnapshot` is authoritative for `BindingPlanSpec.dataConfig` on user/historyReplay apply actions. `widgetVis` maps `{ dimension, visType, topNChoice }` from the snapshot and overlays only the changed control `nextValue`. Missing or incomplete snapshots for user/historyReplay paths return a documented error. Normal drop startup must use `widgetVis/applyStartupSettings` rather than sending `source: "startup"` per-control apply actions.

When `nextValue` is an absent sentinel (`none` / `default` / `""`), `widgetVis` treats dimension as cleared for the full effective snapshot and applies §7.1.2 (TopN helper must not run while dimension is absent, even if `topNChoice` in the snapshot is still a non-default key such as `"top-10"`).

(sequences removed from project scope, PO 2026-07-12)

### `widgetVis/applyVisType`

Payload:

```js
{
  control: "visType",
  previousValue: string | null,
  nextValue: string,
  settingsSnapshot: object,
  source: "user" | "historyReplay" | "startup",
  isHistoryReplay: boolean
}
```

Same plan/apply/report discipline as `applyDimension`; a `visType` change may force slot rebuild according to `widgetBindingPlan`.

### `widgetVis/applyTopNChoice`

Payload:

```js
{
  control: "topNChoice",
  previousValue: string | null,
  nextValue: string,
  settingsSnapshot: object,
  source: "user" | "historyReplay" | "startup",
  isHistoryReplay: boolean
}
```

This action starts the TopN protocol and keeps `widgetSettings` out of helper resolution. `widgetSettings` dispatches only to `widgetVis`; `widgetVis` is the consequence-owner that coordinates `widgetTopN`, visible apply success and `reportToSettings`.

For non-default `nextValue`, `widgetVis`:

1. increments/captures the visible widget runtime `opSeq`;
2. marks `pending:{ kind:"topNChoice", opSeq }`;
3. builds the same canonical prerequisite material used for `BindingPlanSpec` (`dataConfig`, `hierarchySnapshot`, `config`) from the effective settings snapshot and data identity;
4. enriches the TopN request `config` with a helper List binding snapshot resolved through `widgetVis/bindingConfig.js` / `visTypes.js`, not by deep-reading globals in the effect:

```js
config.helperListConfig = {
  visualizationType: "List",
  cognosVisualizationTypeId: string | null,
  visPropBucketKey: "List",
  visTypeConfig: object
};
```

This snapshot is the helper target metadata `widgetTopN` needs to build its helper List `BindingPlanSpec`. It comes from the same metrics table / data identity as the visible request, but with `visualizationType:"List"`. `widgetTopN` must not have to discover this visualization config from global state.
5. dispatches:

```js
_KDB.api.widgetTopN.dispatch({
  type: "widgetTopN/resolveRequested",
  widgetId: widgetId,
  opSeq: opSeq,
  payload: {
    ownerVisId: widgetId,
    topNChoice: nextValue,
    jahrFilterValue: { d: string, u: string } | string,
    monatFilterValue: { d: string, u: string } | string,
    settingsSnapshot: settingsSnapshot,
    dataConfig: dataConfig,
    hierarchySnapshot: hierarchySnapshot,
    config: Object.assign({}, config, { helperListConfig: helperListConfig }),
    source: source,
    isHistoryReplay: isHistoryReplay
  }
});
```

`widgetVis` resolves the period pin **before** this dispatch (`tableData.reloadTable` on config key `newestStichtag`; leftover vis-title `NewestStichtag`). `widgetTopN` applies Jahr/Monat includes; it does not call tableData for that leftover. See `contracts/_archive/widgetTopN-newestStichtag-contractdelta.md`.

`widgetTopN` adopts this `opSeq` and echoes the same value in `widgetVis/topNResolved`; it does not increment a second independent user-intent sequence for this normal path. In the canonical promise-gate implementation, `applyTopNChoice` stays pending through `resolveBindingPrerequisites` (TopN helper wait) and the visible `buildPlan -> applyBinding` pipeline; it returns `reportToSettings` only after confirmed visible apply success. The settings value and history may be committed only after that originating `applyTopNChoice` dispatch completes with success.

For default/clear `nextValue` (absent sentinel per `widgetSettings` §4.1), `widgetVis` does not require helper resolution. It dispatches `widgetTopN/cleanup` when an existing helper claim/binding may need clearing, then runs the visible binding pipeline with `helperTableResult:null` and the cleared TopN value. If `widgetTopN` is unavailable in the current tranche, return a documented deferred result and do not report settings success for non-default TopN. Normal drop startup TopN is included in `widgetVis/applyStartupSettings`; `widgetSettings` must not send a separate startup `applyTopNChoice` for the same seed operation. Absent topN is not a TopN id; normalize before planning per §7.1.1.

### `widgetVis/applyShowValues`

Payload:

```js
{
  control: "showValues",
  previousValue: boolean | null,
  nextValue: boolean,
  settingsSnapshot: object,
  source: "user" | "historyReplay",
  isHistoryReplay: boolean
}
```

Property-only consequence (`contracts/_archive/widgetVis-show-values-contractdelta.md`). No `widgetBindingPlan.buildPlan`, no `applyBinding`, no slot/title/legend pipeline, no bind `opSeq` bump. Writes Cognos `valueLabels.visible` and `labels.visible` through the stamped `visualizationFacet.setContentProperty` (ring 1 host `setContentPropertyValue`). List: success no-op, no those keys. Missing facet / host fail → `ok: false`, no settings commit. Success returns `reportToSettings`. `widgetVis` still does not store `showValues`. Overlay of explicit vs catalog inherit on binding property applies is the same delta.

### `widgetVis/topNResolved`

Payload:

```js
{
  ownerVisId: string,
  opSeq: number,
  status: "success" | "error" | "noHelperAvailable",
  resultValues: string[],
  excludeItemId: string | null,
  errorCode?: string,
  errorMessage?: string
}
```

Accept only when `ownerVisId` matches the envelope `widgetId` and `opSeq` is current. On stale result, write nothing and return `{ ok: false, stale: true }`.

In the canonical promise-gate implementation, `topNResolved` primarily resolves the in-flight `topNGate` waiter registered by `resolveBindingPrerequisites` before `widgetTopN/resolveRequested` was dispatched. The visible binding pipeline continues in the originating `applyTopNChoice` / `applyStartupSettings` / `runBindingPipeline` continuation and reuses the accepted `opSeq`; it must not increment `opSeq` again before `buildPlan -> applyBinding`. `handleTopNResolved` is gate-resolver only and does not independently launch `runBindingPipeline` in this tranche.

Outcome rules (promise-gate):

| Terminal status | `handleTopNResolved` behavior | Originating apply continuation |
|---|---|---|
| `success` | Map the payload to `helperTableResult` and resolve the current `topNGate` waiter. | Continue `buildPlan -> applyBinding` with `reason:"topN"`, write `derived.topNResultValues` only after confirmed apply success, and return `reportToSettings` for `topNChoice`. |
| `error` | Resolve the waiter with a failed helper result; do not call `buildPlan` from this handler. | Clear pending, record a `widgetVis` owned error using the terminal `errorCode` when present, and return failure with no `reportToSettings`. |
| `noHelperAvailable` | Resolve the waiter with a failed helper result; do not call `buildPlan` from this handler. | Clear pending, record/report `WIDGET_VIS_TOPN_UNAVAILABLE`, and return failure with no `reportToSettings`. |
| stale | Write nothing and return `{ ok:false, stale:true }`; do not resolve a waiter. | Treat as expected supersession: no settings commit and no settings error. |
| no matching waiter | Return skipped diagnostic (`WIDGET_VIS_TOPN_NO_WAITER`); do not start `runBindingPipeline`. | If the originating apply is still waiting on the gate, it times out or fails prerequisite resolution. |

Only a current successful visible apply on the originating apply dispatch may report success to `widgetSettings`. `widgetVis` never writes settings/history directly.

### `widgetVis/dienststelleChanged`

Payload:

```js
{
  filterId: string,
  filterLabel: string,
  activeFilterKey: string,
  visibleFilterLabel: string,
  selection: object,
  hierarchySnapshot: object,
  source: "user" | "sichtDefault" | "historyReplay" | string
}
```

`hierarchySnapshot` is the planner-ready Dienststelle hierarchy snapshot (`activeDownstreamName`, string-array `resolution.dominantValues` / `downstreamValues`, `resolution.hasConfirmedSelection`). Legacy `resolution` object arrays on the payload are no longer the binding contract.

Inbound direct command from `dienststelle`, not an event subscription. `widgetVis` treats the payload as a hierarchy/filter fact and re-applies the visible visualization binding through plan/apply. It must not write Dienststelle state or history.

Broadcast rule:

- `dienststelle` dispatches one global command with no envelope `widgetId`.
- When `widgetVis/dienststelleChanged` arrives without `widgetId`, `widgetVis` fans out over current `_KDB.state.widgets.vis.byId` keys.
- When `widgetId` is present, only that widget is handled (manual tests / targeted replay).
- Per-widget handling prefers payload `hierarchySnapshot` when present; otherwise it normalizes legacy payload fields into planner-ready `BindingPlanSpec.hierarchySnapshot`. It reads current settings context through payload `settingsSnapshot` when present, otherwise `_KDB.api.widgetSettings.getState()` public snapshot material.
- Gate fallback without a payload snapshot asks Dienststelle for `{ pageScopeId: "active" }`, not the no-arg flatten. The same `{ pageScopeId: "active" }` applies to every leftover widgetVis bind that today calls no-arg `getCurrentHierarchySnapshot` for a planner snapshot (including startup/settings paths that go through this gate).

### `widgetVis/cleanupContent`

Payload:

```js
{
  reason: "launchpadTransfer" | "remove" | "settingsDelete" | "historyReplay" | "destroy",
  requestedBy: "widgetBase" | "widgetSettings" | "widgetVis" | string,
  clearBinding: boolean,
  clearDrillthrough: boolean,
  clearDomDecorations: boolean,
  isHistoryReplay: boolean
}
```

Public cleanup command for visual content. Callers:

- `widgetBase` before moving a visual widget back to launchpad or removing the shell.
- `widgetSettings` when a user delete action should clear visual content/settings consequences.
- `widgetVis.destroy()` for module teardown.

Behavior:

1. Increment/capture `opSeq` and abort in-flight apply work. If the visual has an active TopN helper claim or pending TopN resolution, dispatch `widgetTopN/cleanup` before or alongside visual cleanup: `{ ownerVisId: widgetId, reason: <mapped cleanup reason>, clearHelperBinding: true, releaseClaim: reason === "remove" || reason === "destroy" }`.
2. If `clearBinding`, run the same `buildPlan -> applyBinding -> render wait -> confirmed result` pipeline used by settings actions. Generic cleanup maps to canonical `BindingPlanSpec.emptyIntent: { enabled: true, reason }` and remains **semantic empty** via `localFilters[{ kind:"emptyData", mode:"forceEmpty" }]`; it does **not** bulk-clear Cognos slots unless the plan explicitly sets `slotsChanged:true` or `slotsToClear:["all"]`.
3. `reason:"settingsDelete"` with `clearBinding:true` is not semantic empty. It maps to technical reset-only binding cleanup while the Cognos widget still has valid datasource/model context: `BindingPlanSpec.emptyIntent: { enabled:false, reason:null, itemId:null, value:null }` plus `BindingPlanSpec.resetIntent: { enabled:true, scope:"visTarget", clearAllSlots:true, clearAllLocalFilters:true, reason:"settingsDelete" }`. `widgetBindingPlan` must translate that into a reset-only plan with no slot re-additions. Missing `widgetBindingApply` on required cleanup (`settingsDelete`, `clearBinding:true`) is **`ok:false`** (not `skipped:true`).
4. After confirmed cleanup apply (or when `clearBinding:false` but decoration flags are set), call `cleanupVisualizationContent` — not normal post-render title/legend/tooltip sync.
5. If `clearDrillthrough`, remove T1 + S2 PKZ icons and clicks, and call stored `listeners.drillthrough*` unsubs, via `cleanupDrillthroughDecorations` (`drillthrough/install.js`). T1 never installed `content.on`; T2 teardown is the stamped-facet unsubscribe. Capture keys may be cleared if present.
6. If `clearDomDecorations`, remove title-link/legend/tooltip decorations owned by `widgetVis` and disconnect legend observers/timers.
7. On confirmed semantic empty-apply success, clear `pending`/`errorCode`, clear `derived.topNResultValues`, set `derived.emptyStatus: "intentional"`, store the serializable `emptyReason`, and keep diagnostics distinct from no-data or binding-failure diagnostics. For `settingsDelete` reset-only cleanup, clear visual TopN/runtime coordination without writing intentional-empty derived status. Replace runtime `managedFilterItemIds` with `plan.managedFilterItemIds` (often the stop-filter id for force-empty plans, empty for reset-only plans) and clear `lastSuccessfulPlan`.

No history is committed by `widgetVis` for cleanup. Any history consequence belongs to the caller owner (`widgetBase` or `widgetSettings`).

When `cleanupContent` is called with `reason:"settingsDelete"` it is a forward cleanup consequence for a settings reset/delete, not a terminal removal of the Cognos shell. The corresponding undo is owned by the history step that moved the shell (`widget_launchpadTransfer`) and must re-enter `widgetVis` through public dispatch after `widgetBase` has restored the shell to canvas. `widgetVis` must therefore make cleanup replay-safe:

- Cleanup may clear binding, managed-filter runtime, drillthrough and DOM decorations, but it must not destroy serializable metric identity needed for later `contentCreate` / rebind unless the caller reason is true `remove` or `destroy`.
- Settings-delete cleanup with `clearBinding:true` must use the technical reset-only intent described above, so undo restore does not have to clear stale/orphan Cognos slot metadata left behind by semantic empty cleanup.
- On undo after settings delete, the restore path may call `widgetVis/contentCreate` again with the original metric identity or may call a documented apply/rebind action with `settingsSnapshot`; both paths must use `isHistoryReplay:true` / replay source and must not push history.
- `widgetVis` must not infer undo from history state. It only honors explicit replay/restore dispatches from the owning replay orchestration and reports success/failure so `widgetSettings` can decide whether settings controls/defaults are restored.
- If visual cleanup succeeded but later base transfer or settings cleanup failed, replay/restore remains best-effort through the same public actions; `widgetVis` never writes base/settings state directly to compensate.

### `widgetVis/disposeWidgetRuntime` (E0a, 2026-08-20)

Envelope-only action (`widgetId` required, optional `payload.reason`). Park, tab-delete and remove are dispose points (`ADAPTER_ONTWERP_2026-08-20.md` §3.7, meting M3): `widgetBase` dispatches this action from `cleanWidgetForTransfer` (route-to-launchpad funnel, covering startup routing, tab mutations, parameterSet park and settings reset), `handleRemove` and `rollbackWidgetBaseOperation`. Behavior: without a `runtime.widgetVis.byId[widgetId]` bucket it is a silent no-op (`ok:true, skipped:true`); otherwise it exits native focus mode when expanded, disposes the focus-mode observer (`document.body`) and legend observer, cancels pending per-widget work (topN gate, contentReady waiters with `status:"cancelled"`, dienststelle-gate waiters for this widget, in-flight apply abort) and deletes the runtime bucket (removed, not nulled). Idempotent; no state writes, no history, no user message. Unlike `cleanupContent` it never creates a runtime bucket and never touches binding/derived state.

### `widgetVis/ensureObservers` (E0a, 2026-08-20)

Envelope-only action (`widgetId` required, optional `payload.reason`). Unpark = rebuild (§3.7): `widgetBase/handleTakeFromLaunchpad` dispatches this after a successful place-on-canvas so widgets that return without `contentCreate` (restoreDeleted undo, plain take) get their focus-mode and legend observers reinstalled, plus an idempotent T1 drillthrough icon re-install and T2 subscribe replace + S2 sync (with focus + legend; not capture flush). Skips silently when no vis record exists (text widgets, never-registered widgets). Installations are idempotent (focus: alreadyInstalled guard; legend: disconnect-first on the query root; T1 drillthrough: locate-or-create; T2: per-widgetId subscribe replace). Legend unpark is **sweep + install**, not install-only: Cognos may re-paint captions on return to canvas, so sanitizers run here with the current settings snapshot. Missing `.Legend` does not skip the observer. Observe/sweep BEM content when present, otherwise the widget shell.

### `widgetVis/maximizeToggle`

Payload:

```js
{
  nextMaximized: boolean,
  source: "user" | "nativeExpand" | "nativeCollapse" | "programmatic" | "historyReplay",
  isHistoryReplay: boolean
}
```

Owned by `widgetVis` as Cognos focus-mode behavior, not frame geometry. `widgetBase` remains out of scope for focus-mode except that route/remove flows may request `widgetVis/maximizeToggle` with `nextMaximized:false` before moving or deleting a live widget. `widgetSettings` owns the user control that triggers the intent and may provide/reuse its settings-panel DOM, but it does not own the focus-mode state. `dashboardPdf` may dispatch this action with `source: "programmatic"` to temporarily exit confirmed focus-mode before dashboard capture and restore it after original-tab restore; it reads only `getState().byId[id].maximized` and does not write vis state or runtime.

First-tranche behavior:

1. For settings-panel maximize clicks, `widgetSettings` dispatches `widgetVis/maximizeToggle` with a computed `nextMaximized` value from `widgetVis.byId[widgetId].maximized`. `widgetSettings` does not write a `maximized` setting value.
2. `widgetVis` calls thin Cognos wrappers on `_KDB.cognosAPI.widgets`: `enterWidgetFocusMode(widgetId)` or `exitWidgetFocusMode(widgetId)`. These wrappers trigger/exit Cognos focus mode only; they do not write KDB state.
3. `widgetVis` installs one idempotent focus-mode DOM observer for the widget. The observer watches the Cognos focus-mode DOM (`.expandModeContainer` containing a clone with the same widget id) and treats DOM appearance as entered and DOM disappearance as exited.
4. The observer is the shared path for both entry modes: the KDB settings maximize button and the native Cognos `.resizePoint.expandHandle`. No duplicate native-handle click implementation is introduced.
5. On confirmed entered state, `widgetVis` dispatches/reduces `widgetVis/maximizeSucceeded` with `nextMaximized:true`, records runtime `focusMode.observedExpanded:true`, and activates focus-mode chrome.
6. Focus-mode chrome clones or repositions only widget settings DOM needed inside `.expandModeContainer` as `.KDB_focusModeSettingsPanel`, filters it to the allowed settings icons for this tranche, mounts it near the expand header, and marks it `KDB_visible` when the product requirement is to show settings immediately after maximize. The clone still appends the focus-only unmaximize control; that node (and any cloned maximize) is CSS-hidden. Visible exit is Cognos `.collapseSvg.focusMode` (`contracts/_archive/widgetVis-settings-maximize-chrome-hide-contractdelta.md`).
7. On confirmed exited state (native collapse, programmatic exit, route/delete cleanup or observer disappearance), `widgetVis` disposes the focus panel/observer handles and reduces `maximized:false`. After chrome dispose on a **normal** unmaximize (not cleanup/destroy), run focus-exit drillthrough sync (`contracts/_archive/widgetVis-drillthrough-focus-restore-contractdelta.md` §6): T1 locate-or-create + click re-bind on the canvas header; S2 peek-sync on the canvas widget. Do not re-plant from `cleanupContent` / `disposeWidgetRuntime`. Do not restamp settings dropdowns on this exit. Canvas option chrome is updated on confirmed settings commit (`contracts/_archive/widgetSettings-focus-canvas-option-stamp-contractdelta.md`).
8. No body/canvas/fullscreen classes, global layout manager, shell geometry writes or persisted maximize restore are introduced.

History for maximize remains deferred in this implementation tranche. `isHistoryReplay` is reserved for the future minimal `{ widgetId, maximized }` replay contract and must suppress any future history push. Until that explicit history delta is approved, `widgetVis/maximizeToggle` writes no history.

### `widgetVis/error`

Payload:

```js
{
  errorCode: string,
  errorMessage: string,
  operation: string
}
```

Records module-level or per-widget owned error state. Foreign error propagation happens by dispatch result only; no foreign writes.

## 7. Binding Pipeline Contract

`widgetBindingPlan.md` is the canonical authority for `BindingPlanSpec` and `BindingPlan`; `widgetBindingApply.md` is the canonical authority for `ApplyBindingOptions` and `ApplyBindingResult`. `widgetVis` may use internal terms such as `changeReason`, `settings`, `metric`, `topNResult`, `forceEmpty` and `emptyReason`, but these names are caller-internal source material only. The public cross-module metric identity for `contentCreate` and internal vis state uses `code`, `display`, and `metricsTable`, plus the optional passthrough fields `langtext` and `url` (stored in derived state when present, no binding/plan impact; sync 2026-07-14). Before calling `buildPlan`, `widgetVis` maps `metric.code -> dataConfig.kennzahlCode`, `metric.display -> dataConfig.kennzahlDisplay`, and `metric.metricsTable -> dataConfig.kennzahlenTable`.

### 7.0 Visualization presentation properties

`widgetVis` owns visualization presentation property application. `widgetBindingApply` stays focused on datasource, slots, local filters and render wait.

Declarative config keys per visualization type in `_KDB.config.visualizations.definitions.visualizations[<type>]`:

| Key | Meaning | Cognos touchpoint |
|---|---|---|
| `propertyValues` | Chart/content properties applied immediately after `visualizationType` is set | stamped `visualizationFacet.setContentProperty` (ring 1 `setContentProperty` in `core/services/cognosHost/facets/visualization/properties.js` → host `setContentPropertyValue`). Feature files: no `_KDB.cognosAPI` |
| `layoutPropertyValues` | Additional layout/content properties for the active visualization type | same facet op. Overlay `valueLabels.visible` / `labels.visible` from explicit `settings.showValues` or catalog inherit; when those values are shown, also overlay `contrast.label.color` + `valueLabels.color` = `true`; skip those keys for List (`contracts/_archive/widgetVis-show-values-contractdelta.md` §6.1a) |

Source of truth: `_KDB.config.visualizations.definitions`. Deep `widgetVis` files must not read that config directly; they consume `visTypes.js` / `bindingConfig.js` only (other modules use `selectors.js` `readVisPropBucketKey`).

Apply order inside `runBindingPipeline`:

**Pre-binding** (before `widgetBindingPlan.buildPlan`):

1. ensure/set Cognos `visualizationType` (`resolveCognosVisualizationTypeId` → `visualization.setVisType`)
2. apply `propertyValues`
3. apply `layoutPropertyValues`
4. `buildBindingSpec` → `widgetBindingPlan.buildPlan` → `widgetBindingApply.applyBinding` (slots/filters/render). Before `applyBinding` (not cleanup / `forceEmpty`): install the legend-caption `MutationObserver` on the legend query root (`resolveLegendQueryRoot` — BEM `.widget-content` / `.ba-common-widget__content` / `[data-kdb-widget-content]` when present, otherwise the widget shell), even when `.Legend` is not in the DOM yet. Skip install only when there is no node (`no_query_root`), the opSeq is stale, `MutationObserver` is unavailable, or cleanup mode. Do **not** skip because the node is the shell. `no_legend_root` is not a skip reason on this path. `resolveVisualizationContent`'s shell fallback for `contentCreate` / title is unchanged. Flash sequencing and observer-write rules: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`.

Pre-binding re-apply rule: run steps 1–3 on `startup`, `visType`/`contentCreate` reasons, or when the normalized visualization type differs from `_KDB.runtime.widgetVis.byId[widgetId].lastAppliedVisPropertiesType`. Skip on dimension/topN/dienststelle applies when the visualization type is unchanged. Do **not** skip when `reason === "showValues"` (property-only overlay must write). Post-render `force: true` must overlay too so catalog re-apply does not stomp an explicit override. **Skip entirely** when `reason === "cleanup"` or internal `forceEmpty === true` (cleanup uses `emptyIntent` or `resetIntent`, not visualization property re-decoration).

**Pre-render title write** (bugfix sync 2026-07-13, legacy parity with `setProperties` → `setVisTitle`): after the pre-binding property apply succeeds (no blockers), `continueBindingPipeline` calls `syncVisualizationTitle.applyPreRenderTitle` once — the only place the Cognos title API (`setVisTitle` → `getVisApi().setTitle`) runs. Fire-and-forget; failures are logged and do not block the pipeline. Pre-render and post-render share the same composed string from `buildVisualizationTitleText`, including the Aggregationstyp parenthesis (`contracts/_archive/widgetVis-title-aggregation-contractdelta.md`). Top-N may still be absent pre-render when `topNResultValues` are not yet available; aggregation must not depend on that helper.

**Post-render** (after confirmed `ApplyBindingResult.status === "success"` and current `opSeq`):

1. Legend caption sweep + observer install immediately (`sweepLegendCaptions` → `runLegendSanitizers` + `installLegendTextObserver` on the query root). This runs **before** post-render visualization properties so Cognos caption paint is rewritten before the sequential property writes (flash sequencing 2026-08-26).
2. idempotent re-apply of steps 1–3 via the same `applyVisualizationProperties` effect with `phase: "postRender"` and `force: true` (bypasses `lastAppliedVisPropertiesType` skip). Bugfix sync 2026-07-13: the post-render pass excludes `titleMode` from `propertyValues` — re-writing `titleMode: "customTitle"` after render re-initialized Cognos' note-editable title and left freshly dropped widgets in inline-edit mode. `titleMode` is applied pre-binding only (legacy set it once before slots).
3. `applyPostRenderCleanup` (title + legend again + tooltip + drillthrough icon re-install; not capture flush). The normalized post-render cleanup result's top-level `ok` reflects title sync success only; legend and tooltip outcomes are diagnostics-only and do not flip `ok` to false when title sync succeeded. Bugfix sync 2026-07-13: post-render title sync is DOM-only (legacy `alterVisTitle` parity: text write on `.widgetHeader .widgetTitle .note-editable p span` plus the header title-link) — it no longer calls the Cognos `setVisTitle` API, which after render flipped the title into inline-edit mode on metricsTree drops.

Cleanup mode (`reason === "cleanup"` or `forceEmpty === true`) **does not** run the pre-apply legend observer, the immediate post-success legend sweep, post-render property re-apply, or `applyPostRenderCleanup`. After confirmed cleanup apply, `cleanupVisualizationContent` removes widgetVis-owned drillthrough/DOM decorations and resets runtime coordination fields per payload flags.

Post-render property re-apply runs only when binding/render succeeded. It does not dispatch settings writes. `ensureVisType` remains idempotent (writes only when Cognos type differs).

Diagnostics: pre-binding property diagnostics are preserved on the normalized result (`diagnostics.visualizationProperties` / `propertyDiagnostics`). Post-render property diagnostics are attached separately as `postRenderPropertyDiagnostics` and nested under `postRenderDiagnostics.visualizationProperties` when post-render cleanup runs. Each property diagnostics object includes `phase: "preBinding"` or `phase: "postRender"`.

Pre-binding property apply failures are `widgetVis` diagnostics only; they do not commit settings and do not block the binding pipeline unless the Cognos wrapper is unavailable (reported as blocker diagnostics). When pre-binding blockers are present, `runBindingPipeline` stops before `buildPlan` and returns `errorCode: "WIDGET_VIS_VISUALIZATION_PROPERTY_BLOCKED"`.

Post-render property apply failures (including wrapper blockers and per-key write failures) are diagnostics-only for an already-successful binding; they do not change `ok`/`status` or prevent `reportToSettings`.

### 7.1 Binding Prerequisites Gate

`widgetVis` must resolve all binding prerequisites before calling `_KDB.services.widgetBindingPlan.buildPlan(spec)`. This gate applies to startup binding, user/history settings applies, Dienststelle re-apply, cleanup binding and future TopN completion, except that cleanup may intentionally replace normal settings/hierarchy with cleanup intents (`emptyIntent` for semantic empty, `resetIntent` for settings-delete reset-only cleanup).

Required inputs for normal visual binding:

| Input | Source | Rule before `buildPlan` |
|---|---|---|
| `dimension` | `widgetSettings` `settingsSnapshot` / effective snapshot | Must be a real dimension key, or an absent sentinel (`none` / `default` / `""`) / `null`. Absent values normalize to `null` before any `dataTableConfig.dimensions[...]` lookup. Absent dimension MUST NOT trigger dimension-key lookup or helper-list config keyed by `"none"`. See §7.1.1–§7.1.2. |
| `visType` | `widgetSettings` `settingsSnapshot` / effective snapshot | Must be present and mapped to visualization config before planning. |
| `topNChoice` | `widgetSettings` `settingsSnapshot` / effective snapshot | Absent (`none` / `default` / `""`) skips helper waiting and uses `helperTableResult: null`. Non-default must wait for `widgetTopN` terminal result before planning, except when §7.1.2 blocks helper resolution because dimension is absent. |
| `dienststelle` | `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` or `widgetVis/dienststelleChanged` broadcast | A confirmed planner-ready hierarchy snapshot is required. `widgetVis` must not silently bind without hierarchy after timeout. |

`resolveBindingPrerequisites` is the internal boundary that owns this gate. It may read targeted public APIs/selectors such as `dienststelle.getCurrentHierarchySnapshot()` and the public widgetSettings effective snapshot contract; it must not deep-read foreign state. If a prerequisite is not ready, `widgetVis` returns a normalized pending/deferred/error result with diagnostics such as `awaiting_dienststelle` or `awaiting_topN`, and does not call `buildPlan`.

Dienststelle readiness means `hierarchySnapshot.resolution.hasConfirmedSelection === true` and string-array hierarchy values are available. The snapshot may be obtained immediately from `dienststelle.getCurrentHierarchySnapshot()` or later from a coalesced `widgetVis/dienststelleChanged` broadcast. TopN readiness means either `topNChoice` is absent (`none`/default/empty), or dimension is absent per §7.1.2 (helper blocked), or `widgetVis` has first resolved helper List metadata (`config.helperListConfig`) through its local visualization config resolver and the promise-gate waiter for the current `opSeq` has then been resolved with a current non-stale `helperTableResult` (typically via `widgetVis/topNResolved` resolving the registered `topNGate` waiter).

#### §7.1.1 Normalization at binding boundary

Before `_KDB.services.widgetBindingPlan.buildPlan(spec)`:

1. `normalizeDefaultValue(settings.dimension)` → `null` when absent; otherwise real dimension key.
2. `parseTopNOption(settings.topNChoice, config.topNOptions)` → `{ kind: "default" }` when absent.
3. `BindingPlanSpec.dataConfig.dimension` receives `null` or a real key only — never `"none"`.
4. `BindingPlanSpec.dataConfig.topN` receives parsed topN input; absent → default kind.

`settingsSnapshot` may still carry `"none"` strings from `widgetSettings` (B1 handoff); normalization is `widgetVis` responsibility immediately before planning. Cognos mirror may use host token `"default"` for cleared values; that token is not a settings control value.

#### §7.1.2 Absent dimension gates TopN helper (C1)

When `normalizeDefaultValue(settings.dimension)` is `null`:

- TopN helper resolution MUST NOT run, even if `topNChoice` is a non-default key such as `"top-10"`.
- `helperTableResult` MUST be `null`.
- Visible binding proceeds with no dimension contribution and no TopN filter from helper (non-default `topNChoice` in the snapshot is ignored until a real dimension is selected).
- `widgetVis` MUST NOT dispatch `widgetTopN/resolveRequested` for this prerequisite pass.

Rationale: TopN is a dimension-scoped capability; without a dimension there is no valid helper target. Settings clears a real `topNChoice` when the user or a history replay clears a real dimension (`contracts/_archive/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`). If a snapshot still has an absent dimension and a non-default `topNChoice`, vis ignores that choice: `dataConfig.topN` is null, `resolveRequested` is not sent, and the visible bind proceeds. Whenever `normalizeDefaultValue(settings.dimension)` is null, a `widgetTopN` owner in status `pending`, `success`, or `error` gets `widgetTopN/cleanup` (`clearHelperBinding: true`, `releaseClaim: false`). Cleanup failure does not fail the bind.

Canonical `BindingPlanSpec` produced by `widgetVis`:

```js
{
  reason: "contentCreate" | "startup" | "dimension" | "visType" | "topN" | "dienststelle" | "cleanup",
  targetKind: "vis",
  widgetId: "<widgetId>",
  ownerWidgetId: null,
  opSeq: 1,

  dataConfig: {
    kennzahlCode: "...",
    kennzahlDisplay: "...",
    kennzahlenTable: "...",
    datasourceName: null,
    datasourceId: "...",
    visualizationType: "...",
    cognosVisualizationTypeId: null,
    visPropBucketKey: null,
    visTypeConfig: {},
    dataTableConfig: {
      dimensions: {},
      sorting: {}
    },
    kennzahlDefaults: {},
    dimension: null,
    topN: null,
    hierarchyTarget: null
  },

  hierarchySnapshot: null,
  helperTableResult: null,
  emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
  resetIntent: {
    enabled: false,
    scope: null,
    clearAllSlots: false,
    clearAllLocalFilters: false,
    reason: null
  },

  config: {
    filterPropObj: {},
    parameterMappingObj: {},
    topNOptions: {},
    emptyDataFilter: {
      itemId: "...",
      value: "1",
      reason: null
    }
  }
}
```

`reason: "contentCreate"` is reserved for explicit `initialSettings` cases such as history replay, migration or another approved caller that intentionally requests initial binding during content creation. In the normal drop flow, `widgetVis/contentCreate` registers per-widget context/readiness only; startup/default binding is initiated later by `widgetSettings/seedDefaults` through one `widgetVis/applyStartupSettings` action with `reason: "startup"`.

Mapping rules:

| `widgetVis` internal source | Canonical service-boundary field |
|---|---|
| `changeReason` | `BindingPlanSpec.reason` |
| `settings.dimension` | `dataConfig.dimension` |
| `settings.visType` | `dataConfig.visualizationType` and `dataConfig.cognosVisualizationTypeId` when known |
| `settings.topNChoice` | `dataConfig.topN` |
| `metric.metricsTable` | `dataConfig.kennzahlenTable` |
| `metric.code` | `dataConfig.kennzahlCode` |
| `metric.display` | `dataConfig.kennzahlDisplay` |
| `dataIdentity.datasourceName` / resolved datasource id | `dataConfig.datasourceName` / `dataConfig.datasourceId` |
| resolved visualization/data-table config | `dataConfig.visTypeConfig` (including optional `slotComposition` policy), `dataConfig.dataTableConfig`, `dataConfig.kennzahlDefaults`, `dataConfig.visPropBucketKey` |
| `topNResult` / `widgetVis/topNResolved` payload | `helperTableResult` with `topNResultValues` and `topNExcludeItemId` |
| `dienststelleChanged.payload` normalized by `widgetVis` | `hierarchySnapshot` (`activeDownstreamName` from `activeFilterKey`; `resolution` with `hasConfirmedSelection` and string-array values) |
| `forceEmpty` + `emptyReason` | `emptyIntent: { enabled: true, reason: emptyReason }` |
| `cleanupContent(reason:"settingsDelete", clearBinding:true)` | `emptyIntent: { enabled:false, reason:null, itemId:null, value:null }` and `resetIntent: { enabled:true, scope:"visTarget", clearAllSlots:true, clearAllLocalFilters:true, reason:"settingsDelete" }` |
| `widgetId`, `ownerWidgetId`, `opSeq` | Diagnostic echo fields on `BindingPlanSpec` and `BindingTarget`; stale handling remains caller-owned |

Required `BindingPlan` fields consumed by `widgetVis`: `ok`, `status`, `errorCode`, `errorMessage`, `reason`, `targetKind`, `widgetId`, `ownerWidgetId`, `opSeq`, `datasource`, `visualization`, `slotsChanged`, `slotsToClear`, `slots[]`, `localFilters[]`, `managedFilterItemIds[]`, `emptyIntent`, `resetIntent`, `mirrorPatch`, and `diagnostics`.

Intentional emptying rules:

- `widgetVis` does not pass a custom `forceEmpty` boolean through to the service boundary. It maps internal emptying intent to `BindingPlanSpec.emptyIntent`.
- `config.emptyDataFilter` supplies the stop-filter convention/default only; it does not itself request emptying.
- The plan service represents intentional emptying as `BindingPlan.emptyIntent` plus a `localFilters[]` descriptor with `kind: "emptyData"` and `mode: "forceEmpty"`.
- `widgetVis` derives intentional-empty UI/state diagnostics from `BindingPlan.emptyIntent`, the `emptyData/forceEmpty` descriptor, and/or `ApplyBindingResult.diagnostics.emptyMode/emptyReason`.
- `emptyMode` is not a required `BindingPlan` field.
- Settings-delete reset-only cleanup is intentionally not an emptying rule. It uses `resetIntent` with disabled `emptyIntent`; `widgetVis` expects `widgetBindingPlan` to preserve reset intent and return no slots/local filters to re-add for this cleanup path.
- `widgetVis` must not call `_KDB.services.widgetBindingApply.applyEmptyDataFilter(...)` or any empty-specific apply route.

`widgetVis` calls `widgetBindingApply` with canonical `ApplyBindingOptions`:

```js
_KDB.services.widgetBindingApply.applyBinding(plan, {
  target: {
    widgetId: widgetId,
    targetKind: "vis",
    ownerWidgetId: null,
    opSeq: opSeq,
    reason: plan.reason
  },
  signal: abortController.signal,
  previousManagedFilterItemIds: _KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds || [],
  timeoutProfile: "vis"
});
```

After `ApplyBindingResult.status === "success"` and the `opSeq` is still current, `widgetVis` replaces `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds` with `plan.managedFilterItemIds`. Previous managed-filter ids never come from `BindingPlan`; they are caller runtime and enter apply through `ApplyBindingOptions.previousManagedFilterItemIds`.

Required apply result fields consumed by `widgetVis`:

```js
{
  status: "success" | "timeout" | "error" | "aborted",
  mirrorPatch: object | null,
  diagnostics: {
    targetWidgetId: string,
    targetKind: "vis" | "topNHelper" | "dataTableHelper",
    ownerWidgetId: string | null,
    opSeq: number | null,
    reason: string | null,
    completedSteps: [],
    failedStep: null,
    skippedSteps: [],
    errorCode: null,
    errorMessage: null,
    emptyMode: "forceEmpty" | null,
    emptyReason: string | null,
    elapsedMs: 0,
    renderWaitMs: 0,
    timedOut: false,
    aborted: false,
    warnings: [],
    cognos: {}
  }
}
```

Outcome rules:

| Outcome | `widgetVis` behavior | Caller/settings behavior |
|---|---|---|
| `success` and current `opSeq` | Use `mirrorPatch` and diagnostics, write derived state, replace runtime `managedFilterItemIds` with `plan.managedFilterItemIds`, clear pending/error, run title/legend/tooltip + drillthrough icon re-install (not capture flush), return `reportToSettings`. | `widgetSettings` may commit the control value and history step. |
| `success` with `plan.emptyIntent.enabled === true` and current `opSeq` | Write intentionally-empty diagnostics (`derived.emptyStatus: "intentional"`), clear visual derived values/managed runtime as specified, replace runtime `managedFilterItemIds`, and return success. | If emptying came from a settings control/delete action, `widgetSettings` may commit/history only after this confirmed apply success. |
| `success` with `plan.resetIntent.reason === "settingsDelete"` and current `opSeq` | Treat as technical reset-only cleanup: clear visual TopN/runtime coordination and decorations, replace runtime `managedFilterItemIds` with `[]`, do not write intentional-empty derived status, and return success. | `widgetSettings`/`widgetBase` may continue reset-to-launchpad only after confirmed apply success. |
| `timeout` / `error` | Set `WIDGET_VIS_BINDING_APPLY_FAILED`, `WIDGET_VIS_BINDING_TIMEOUT`, `WIDGET_VIS_EMPTY_APPLY_FAILED` or a more specific owned code, clear pending, return failure; do not use `mirrorPatch`. | `widgetSettings` keeps previous value and records its own error. |
| `aborted` or stale `opSeq` | Treat as expected supersession; write no derived success state, do not use `mirrorPatch`, and return stale/aborted. | No commit, no settings error. |
| Plan failure | Set `WIDGET_VIS_BINDING_PLAN_FAILED`, clear pending, no apply call. | No commit. |

`mirrorPatch` is caller-owned proposal material and is only usable when `ApplyBindingResult.status === "success"`. For `timeout`, `error` and `aborted`, `widgetBindingApply` returns `mirrorPatch: null` and `widgetVis` must not commit settings or derived state from it.

## 8. Readers / Writers

Published selectors from `widgetVis/selectors.js`. They return the stored record itself (no clone): callers must treat it as read-only.

| Selector | Reads | Returns |
|---|---|---|
| `readVisRecord(_KDB, widgetId)` | `_KDB.state.widgets.vis.byId[widgetId]` | Per-widget visual record (`derived`, `pending`, `maximized`, ...) or `undefined`. |
| `readVisMaximized(_KDB, widgetId)` | `byId[widgetId].maximized` | Boolean confirmed focus-mode mirror; `false` when no record exists. |
| `readVisPropBucketKey(_KDB, visType)` | `config.visualizations.bindingSpecs.visualizationTypeToBucket` | Cognos visualization bucket key of a vis type (same as `visTypes.resolveVisPropBucketKey(visType, _KDB)`). |

`ACTION_TYPES` (the `widgetVis/*` action type constants, same object as `state.js` `ACTION_TYPES`) is also published through `selectors.js`; the former path shims `config/actionTypes.js`, `config/resolveVisualizationBindingConfig.js` and `config/visTypes/resolveVisTypeIdentity.js` no longer exist (Phase 2 W9a).

The whole subtree is available through `_KDB.api.widgetVis.getState()` (cloned).

Internal reducer actions:

| Action type | Purpose |
|---|---|
| `widgetVis/mountStarted` | Initialize module state/runtime and set lifecycle `initializing`. |
| `widgetVis/mountSucceeded` | Set module lifecycle `ready`. |
| `widgetVis/registerContent` | Create or update per-widget visual record. |
| `widgetVis/markPending` | Set per-widget pending marker and `opSeq`. |
| `widgetVis/applySucceeded` | Write derived state from successful plan/apply. |
| `widgetVis/cleanupSucceeded` | Clear visual derived/runtime-correlated state after cleanup. |
| `widgetVis/maximizeSucceeded` | Write confirmed `maximized` after Cognos focus-mode DOM entered/exited. |
| `widgetVis/errorRecorded` | Record module or per-widget error. |
| `widgetVis/destroy` | Mark module disposed after runtime cleanup. |

Reducers are pure and perform no DOM, Cognos, history or event effects.

## 9. Events

`widgetVis` emits no fact-events and subscribes to no event-bus events in this tranche.

Known-owner communication uses direct dispatch:

- `widgetSettings -> widgetVis`: `applyStartupSettings` for normal drop default seeding; `applyDimension`, `applyVisType`, `applyTopNChoice`, `applyShowValues` for user/history setting consequences; and user delete through `cleanupContent`.
- `widgetSettings -> widgetVis`: `waitUntilContentReady` before default seeding for a newly created visual widget.
- `widgetBase -> widgetVis`: `contentCreate` and `cleanupContent`.
- `dienststelle -> widgetVis`: broadcast `dienststelleChanged` (no `widgetId`); `widgetVis` owns fan-out to visible vis records.
- `widgetTopN -> widgetVis`: `topNResolved`.

No `events/eventNames.js` is created unless a real fact-event consumer appears and `eventSubscribe.md` is updated first.

## 10. Dependencies

- `_KDB` as injected boundary input.
- `_KDB.api.widgetBase` for shell/frame coordination only through dispatch; no runtime reads.
- `_KDB.api.widgetSettings` selectors or payload snapshots for control values; no settings writes.
- `_KDB.api.widgetSettings` may call `widgetVis/waitUntilContentReady` before default seeding; `widgetVis` returns readiness through dispatch results only.
- `_KDB.api.widgetTopN` for `resolveRequested` when TopN is in scope.
- `_KDB.api.dienststelle.getCurrentHierarchySnapshot()` for confirmed planner-ready hierarchy context before normal visual binding. `widgetVis` may also consume `widgetVis/dienststelleChanged` broadcasts; it must not deep-read Dienststelle state.
- `_KDB.api.dataSourceContext.getCurrentMetricsDataSource()` when the future datasource module exists. This targeted read method is preferred over `dataSourceContext.getState()` as an integration contract.
- `_KDB.config.dataSources.metrics.default` as the temporary metrics datasource fallback until `dataSourceContext` exists. `Personal_KDB` is the current default and must be read through the local `widgetVis` resolver only.
- `_KDB.services.widgetBindingPlan.buildPlan`.
- `_KDB.services.widgetBindingApply.applyBinding`; cleanup that intentionally empties a visual still uses the canonical `applyBinding` path with an empty plan.
- `_KDB.services.tableData` only when needed for data identity reads; no direct tableData state reads.
- `_KDB.cognosAPI.widgets.*` and `_KDB.cognosAPI.visualization.*` through binding services for binding/render, and directly from `widgetVis` for title, declarative visualization properties (`setVisType`, `setContentPropertyValue`), focus-mode or post-render cleanup touchpoints not owned by the services. Drillthrough host reads use injected cognosHost facets only (`visualizationFacet` including F1c `getSelections` / `subscribeSelections`, `filtersFacet`, existing stamps); URL open goes through `_KDB.services.drillthrough`. Deep files read `visualizationFacet` through `readHostFacet` in `runtime.js`. No `_KDB.cognosAPI` / `content.on` in widgetVis for selections.
- `_KDB.services.drillthrough` for PKZ URL build/open from the T1 icon click and the T2 datapoint click.
- `_KDB.api.sicht.getState()` for drillthrough spec assembly (`currentSelection` / `activeSichtValue`).
- `KDB3/images/pkzDrillthrough.png` and `.kdb_hyperlink_icon` for the T1 header drillthrough icon. S2 paints `KDB3/images/datapoint_pkzDrillthrough.png` on the same class under `.kdb-datapoint-pkz`.

Deep files receive dependencies through AMD imports and controller options. They do not discover `_KDB` through `window`.

## 11. Cognos Touchpoints

| Touchpoint | Context | Owner of state mirror |
|---|---|---|
| Apply datasource, vis type, slots, local filters, render wait | Through `widgetBindingApply`. | `widgetVis` commits derived state only after success; settings values stay with `widgetSettings`. |
| Read/set title | `widgetVis` post-apply title sync. | `widgetVis.derived.titleText`. |
| Content selection events / current selections | Tranche 2 via stamped `visualizationFacet.getSelections` / `subscribeSelections` (F1c ops on the existing visualization facet; not a new facet). Host `content.on` stays in ring 1. | Subscribe drives chrome; peek is source of truth at click. Optional last-selection buffer only. |
| Drillthrough URL open | `_KDB.services.drillthrough` on T1 icon click (`source:"icon"`) and T2 S2 click (`source:"datapoint"` + `categories[]` from peek). Not widgetVis `window.open` / `_KDB.cognosAPI`. | No state write. |
| Focus mode / maximize | `_KDB.cognosAPI.widgets.enterWidgetFocusMode/exitWidgetFocusMode` plus `.expandModeContainer` observer. | `widgetVis.maximized` after confirmed focus-mode DOM state. |
| Intentional emptying / clear managed slots and local filters | `cleanupContent` via `BindingPlanSpec.emptyIntent` and normal `applyBinding`. | `widgetVis` clears derived/runtime fields after confirmed empty apply. |

`widgetVis` must not perform layout move/resize Cognos calls; those belong to `widgetBase`.

## 12. DOM Boundaries

`widgetBase` owns the shell/body. `widgetVis` may query within the shell for visualization content, title/header affordances and drillthrough icon placement. Queries must be scoped from a widget root identified by `[data-kdb-widget-id="<widgetId>"]` or an equivalent shell ref supplied by `widgetBase`.

`widgetVis` may create/manage:

- title link behavior for the visualization title;
- the T1 PKZ drillthrough icon: locate-or-create in `.widgetHeader .widgetIcons`; legacy wrapper + `.kdb_hyperlink_icon` and `pkzDrillthrough.png` (placement unchanged: `right: 28px`);
- the T2 S2 datapoint PKZ icon: distinct wrapper (`kdb-datapoint-pkz` or equivalent) on `.widget.liveWidget.maximizable`, sibling of `.resizeEdge.topRight` and `widgetContentWrapper`; inner `a.kdb_hyperlink_icon` + `datapoint_pkzDrillthrough.png`. Not inside TR. Not header `.widgetIcons`. Canvas host is the canvas maximizable root (skip if not `.maximizable` / TR missing). Focus host for T1+S2 is `.expandModeContainer > .kdb-expand-drillthrough-column` after `.collapseSvg.focusMode` (clone is `.liveWidget.widget`; **no** `maximizable` / TR gate). SHOW in expand when peek has real categories. Hide cloned in-widget copies. Never `widget.querySelector(".kdb_hyperlink_icon")`;
- the canvas maximize proxy: distinct wrapper `kdb-widget-maximize` on `.widget.liveWidget.maximizable`, sibling of `.resizeEdge.topRight` (same host as S2). Not inside TR. Not header `.widgetIcons`. Same column box as T1/S2 (`right: -26px`, `25×25`, 2px three-side border); `top: 0`. Asset `KDB3/images/maximize_32.svg`. Do **not** reuse `.kdb_hyperlink_icon`. Hide when `.widget:not(.nodeSelected)` (scoped to `.dashboardFrame:not(.kdb-widget-chrome-always)` per [kdbControl-widget-chrome-always-contractdelta.md](./_archive/kdbControl-widget-chrome-always-contractdelta.md)) and under `.expandModeContainer`. Settings `.KDB_maximizeButton` stays in the live settings DOM and dispatch map; CSS-hide it on `.liveWidget` so the canvas proxy is the only visible enter control (`contracts/_archive/widgetVis-settings-maximize-chrome-hide-contractdelta.md`). Native `.resizeEdge.topRight` stays in the DOM (enterFocusMode still clicks `div.resizeEdge.topRight > *`) but is visually hidden (`visibility`/`opacity`/`pointer-events`); do not uncrush; do not `display:none` the click node if that would break `enterWidgetFocusMode`;
- legend visibility/tooltip metadata cleanup on content nodes;
- focus-mode settings chrome inside Cognos `.expandModeContainer` as a runtime-owned clone/helper of the existing settings panel, without storing settings values;
- visual-content DOM decorations it created itself.

Forbidden:

- global unscoped `document.querySelector` except a documented shell-root lookup;
- storing DOM in `_KDB.state`;
- reading `_KDB.runtime.widgetBase` or `_KDB.runtime.launchpad`;
- moving widget shells between canvas/launchpad;
- inventing a new icon for drillthrough;
- planting S2 in header `.widgetIcons` or inside TR; uncrushing `#maximize_32_v7`; `content.on` / `_KDB.cognosAPI` in widgetVis for selections.

## 13. Title, Legend, Tooltip And Drillthrough

Title behavior:

- Title text is derived from metric/display evidence plus current settings consequences **and** the Aggregationstyp include of the active kennzahlDefaults **grain pack** (`contracts/_archive/widgetVis-title-aggregation-contractdelta.md`; grouping-A Implemented: `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md`). Live JS uses the shared caption factory (no `branchKey`).
- The title changes with settings choices after confirmed apply (vis type or grouping grain updates aggregation when the factory include changes).
- The title must function as a URL/link affordance according to the legacy drillthrough/navigation behavior.
- `derived.titleText` records the last confirmed **composed** title text; it is not a user-editable setting. `readMetric.display` must not fall back to `derived.titleText`.

Title link and tooltip (implemented 2026-07-14, legacy `alterVisTitle`/`addLinkToKennzahl` parity; aggregation suffix 2026-09-01):

- The post-render title sync (`syncVisualizationTitle`, DOM-only) additionally writes:
  - **tooltip:** the `title` attribute on `.widgetHeader .widgetTitle` is set to the metric's tree `title`/`langtext` (`derived.langtext`, fallback `code + ": " + display`) followed by the **same aggregation string as the visible title** and the same settings suffixes ("nach <dimension>", Top-N label);
  - **hyperlink:** when `derived.url` is non-empty, the title text node (`.note-editable p span`) is wrapped in `<a class="kdb_hyperlink" href="<url>" target="_blank" rel="noopener">`. Clicking the title opens the metric's dxmeta url in a new browser tab (native anchor behavior, no `window.open`, no click listener). When `derived.url` is empty, no anchor exists (an existing anchor from a previous metric is unwrapped).
- The write is idempotent and re-runs on every post-render sync, so it survives Cognos re-renders that wipe the title DOM (legacy parity: legacy re-ran `alterVisTitle` after every configure/settings change).
- When `derived.langtext`/`derived.url` are absent (widgets registered before this sync), the descriptor is re-resolved defensively through `_KDB.api.metricsTree.resolveMetricByCode(derived.code || metric.code)`.
- `cleanupVisualizationContent` (with `clearDomDecorations`) unwraps the anchor and removes the `.widgetTitle` `title` attribute (existing "remove title-link decorations" rule).
- CSS (`KDB3/css/widgets/widgetVis.css`) guarantees the linked title renders as normal black text: `.kdb_hyperlink { text-decoration: none; color: inherit; }` plus `color: black` on base/hover/focus (legacy `KDBDroppedWidgets.css`/`KDB.css` parity).

Legend/tooltip behavior:

- **Title-header tooltip** (the `title` attribute on `.widgetHeader .widgetTitle`) stays as §13 above (including the 2026-09-01 aggregation suffix). Legend deltas do not rewrite it.
- **Chart tooltip metadata** (`syncTooltipMetadata` in `render/postRender.js`) stays as-is: it annotates Cognos tooltip nodes with `data-kdb-pipe-parts`. This delta does not rewrite chart tooltip text.
- **Legend captions** are rewritten by `runLegendSanitizers` (immediate post-success sweep, then again in `applyPostRenderCleanup`) and by the legend `MutationObserver` (`sanitizeLegendCaptionMutation`, then caption-only subtree sanitize). Both call `sanitizeLegendCaptionText` from `legend/captionText.js`. Non-observer sweeps on BEM content may toggle legend-title `KDB_visible`. Sweeps whose query root is the widget shell are captions-only (no `KDB_visible`). The observer must not toggle `KDB_visible`.
- Caption pipeline (not vis-type config): (1) hash-segment normalization for `#` / `ALLE` / `BEENDET` **per segment** on every vis type including List (Gesamt/Beendet flags are segment-local); (2) return the hashed spaced-pipe string in Cognos order (keep-order); (3) for non-List vis types, collapse exactly-two prefix dim tokens (`m | Männlich` → `m`). Exception — Prognose only (`normalizeVisualizationType === "Prognose"` or exact IBM ids): when hashed `parts.length >= 5` and `parts[n-2]` is a 4-digit year, reserve n-1 Stichtag, n-2 Jahr, n-3 DST (keep) then exact-2 on prefix `slice(0, n-3)`; do not run dual-era on that result. Authority: `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`. List stays hash-only (both dim tokens). Historical compose assembler removed 2026-09-02 (`contracts/_archive/widgetVis-legend-compose-dead-code-cleanup-contractdelta.md`). Legend parts split only on spaced pipe `/[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/`; bare `|` inside a token is the marker delimiter. Hash vectors 1–11: `contracts/_archive/widgetVis-legend-normalization-contractdelta.md`. Keep-order assemble: `contracts/_archive/widgetVis-legend-keep-order-non-list-contractdelta.md`. Dim-token collapse: `contracts/_archive/widgetVis-legend-dim-token-collapse-contractdelta.md`. LINE titles: `contracts/_archive/widgetVis-legend-line-dst-first-contractdelta.md`.
- **Observer** watches BEM content when present, otherwise the widget shell (subtree), armed **before** `applyBinding` so captions that paint during `renderWidget` are rewritten as they appear. It does not wait for `.Legend`. `mutationNeedsLegendSanitize` is caption-only: `characterData` on a caption-host parent; `childList` on a caption host, legend root, or added/removed caption/legend element (no `querySelector` inside `svg`/`g`/`path`; optional descendant query only on non-SVG added/removed elements); `attributes`+`id` keeps caption-child behavior. Sequencing: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`.
- **Observer writes (load icon flash, 2026-08-26; shell observe 2026-08-27):** the callback MUST NOT `classList.add`/`remove` `KDB_visible` and MUST NOT call `runLegendSanitizers(queryRoot)`. After a failed in-place mutation sanitize, rewrite caption text in the mutation target / added subtree only (inner selectors when the scan root is `.Legend` / `.legend`; include the root when it is a caption host). Do not query the whole query root and do not scan the observe root itself as a full-widget fallback. Observe BEM when present, otherwise the shell, so restore paint still rewrites captions. `resolveVisualizationContent` shell fallback stays for `contentCreate` / title. Companion CSS (icon cap, hideSpot id case) is owned by `widgetSettings.css` / `widgets/widgetHiding.css` (former `hideSpot.css`), not widgetVis JS.
- **Unpark** (`ensureObservers`) sweeps + installs; Cognos may re-paint.
- **Do not (legend, future agents)**
  - Do not skip legend observe/sweep because the query root is the widget shell (`observe_root_is_shell` is not a skip). Prefer BEM content when present, otherwise the shell. Details: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`.
  - Do not toggle `KDB_visible` from the legend observer (global `.KDB_visible { display: block }` restyles the dashboard and flashes icons). Shell sweeps are captions-only. Do not call `runLegendSanitizers` from the observer.
  - Do not change the caption string pipeline (`legend/captionText.js` / hash keep-order then non-List dim collapse) to fix timing or icon flash. Pipeline rules: `contracts/_archive/widgetVis-legend-normalization-contractdelta.md` (hash vectors 1–11), `contracts/_archive/widgetVis-legend-keep-order-non-list-contractdelta.md`, and `contracts/_archive/widgetVis-legend-dim-token-collapse-contractdelta.md`. LINE titles: `contracts/_archive/widgetVis-legend-line-dst-first-contractdelta.md`.
- Legend-item hover follows the caption `textContent` (Cognos default). Do not set caption `title` or `aria-label` in this tranche.

Drillthrough behavior (T1 header icon unchanged; T2 F1c + S2, PO 2026-08-30):

- **T1:** Plant the legacy PKZ icon (`pkzDrillthrough.png`, `.kdb_hyperlink_icon`) in `.widgetHeader .widgetIcons` (`right: 28px` unchanged) and bind icon click. Click assembles a spec with `source: "icon"` and calls `_KDB.services.drillthrough`. Do not invent a new asset. Do not reopen T1 header placement.
- **T2:** Subscribe via stamped `visualizationFacet.subscribeSelections` (per-widgetId replace). Plant S2 only when peek/subscribe reports **real** categories (not `null` / empty). Hide on `deselect` / `clearAll` / widget deselect / tab. Click assembles `source: "datapoint"` + `categories[]` from `getSelections` peek; if peek is `null`, do not open. Trigger is native Cognos datapoint select (highlight). **No Ctrl. No 3s flush.**
- Subscribe drives chrome; peek is source of truth at click. Capture keys may be reused as a last-selection buffer only.
- Title `.kdb_hyperlink` stays the metric-URL feature; do not conflate it with the PKZ icon.
- T1 icon + T2 S2 + `listeners.drillthrough*` are installed after content create, confirmed render, unpark (`ensureObservers`), and **focus exit** (normal unmaximize only); removed by `cleanupContent`/`destroy`. No `content.on` / `_KDB.cognosAPI` in widgetVis.
- Keep the datapoint (S2) icon builder/placer in `drillthrough/icon.js` and `drillthrough/datapointChrome.js`; do not grow `drillthrough/install.js`. Never `widget.querySelector(".kdb_hyperlink_icon")`.
- Opening the URL is the drillthrough service, not widgetVis `window.open` / `_KDB.cognosAPI`. Effect only: no history or settings write.
- Focus: T1 + S2 plant on `.kdb-expand-drillthrough-column` after `.collapseSvg.focusMode` (Ausblenden). S2 only when peek/subscribe reports real categories. Hide cloned copies still on expand `.widgetIcons` / clone root. Maximize proxy stays hidden in expand. Do not clone either icon onto `.KDB_focusModeSettingsPanel`. Do not mutate the Ausblenden button (`contracts/_archive/widgetVis-drillthrough-focus-restore-contractdelta.md`).
- Keep the 2×2 crush on `.resizeEdge.topRight`. Do not uncrush native `#maximize_32_v7`. Hide native maximize chrome visually; the node must remain for `widgetsFacet.enterFocusMode`. Canvas maximize proxy is a separate always-on plant (not F1c, not `enableDrillthrough`). Click: `_KDB.api.widgetVis.dispatch({ type: "widgetVis/maximizeToggle", widgetId, payload: { source: "user" } })` — omit `nextMaximized` so the handler toggles, same as settings maximize. Do not `.click()` settings DOM or `.resizeEdge.topRight`. Do not grow `drillthrough/install.js`.
- `.widget:not(.nodeSelected) .kdb_hyperlink_icon` still hides S2 when the widget is deselected — intended.
- PDF: hide `.kdb_hyperlink_icon`, `.kdb-widget-maximize`, `.kdb-datapoint-pkz`, and `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)` in the grouped `widgets/widgetHiding.css` (former `pdfCapture.css`) rule (plus clone-side hide). One allowed `:has()` for the T1 column wrapper. Details: `contracts/_archive/dashboardPdf-legend-chrome-qa-contractdelta.md`.

## 14. History Behaviour

`widgetVis` owns no history keys in this tranche.

| Action | History |
|---|---|
| `contentCreate` | No `widgetVis` history. `widgetBase` owns drop/create history after content create succeeds. |
| `applyStartupSettings` | No `widgetVis` history. `widgetSettings` commits the included startup control values only after the single batch result reports confirmed success, and never pushes startup history. |
| `applyDimension` / `applyVisType` / `applyTopNChoice` / `applyShowValues` | No `widgetVis` history. `widgetSettings` commits the control value and history only after `widgetVis` reports confirmed success. |
| `dienststelleChanged` | No `widgetVis` history. Dienststelle/filter history remains with filter owners. |
| `cleanupContent` | No `widgetVis` history. Caller owner decides whether its own action is history-tracked. |
| `maximizeToggle` | No history in the first focus-mode tranche. A future undo/redo tranche may add a minimal `{ widgetId, maximized }` history step only after explicit contract delta. |

History undo/redo enters through normal owner dispatch paths. `widgetVis` must not special-case replay except honoring `isHistoryReplay` and avoiding duplicate reports.

## 15. Error Taxonomy

| Code | Meaning |
|---|---|
| `WIDGET_VIS_MOUNT_FAILED` | Module mount failed. |
| `WIDGET_VIS_UNKNOWN_ACTION` | Dispatch received an unrecognized `widgetVis/<actionName>` type. |
| `WIDGET_VIS_WIDGET_ID_CONFLICT` | Envelope widget id conflicts with payload/source id. |
| `WIDGET_VIS_CONTENT_CREATE_FAILED` | Content initialization failed. |
| `WIDGET_VIS_CONTENT_READY_TIMEOUT` | A caller waited for per-widget content registration but `contentCreate` did not make the widget ready within the timeout. |
| `WIDGET_VIS_CONTENT_CONTEXT_MISSING` | Content-ready or apply was requested but the visual record lacks required metric/data identity for `BindingPlanSpec`. |
| `WIDGET_VIS_VISUALIZATION_PROPERTY_BLOCKED` | Cognos visualization wrapper unavailable or missing required API before binding plan. |
| `WIDGET_VIS_BINDING_PLAN_FAILED` | Binding plan service rejected or could not build a plan. |
| `WIDGET_VIS_BINDING_APPLY_FAILED` | Apply service returned error. |
| `WIDGET_VIS_BINDING_TIMEOUT` | Apply/render wait timed out. |
| `WIDGET_VIS_CLEANUP_FAILED` | Visual-content cleanup failed. |
| `WIDGET_VIS_EMPTY_APPLY_FAILED` | Intentional empty plan/apply failed. |
| `WIDGET_VIS_DRILLTHROUGH_FAILED` | Drillthrough install/wiring failed (missing host, missing stamp, plant/bind failure). Service build/open codes stay on the drillthrough service — do not collapse those into this code. |
| `WIDGET_VIS_TOPN_UNAVAILABLE` | TopN requested but `widgetTopN` is unavailable or returned no helper. |
| `WIDGET_VIS_TOPN_HELPER_LIST_CONFIG_MISSING` | TopN requested but `widgetVis` could not resolve the helper List binding metadata required by `widgetTopN`. |
| `WIDGET_VIS_STALE_OPERATION` | Operation was superseded by a newer `opSeq`; normally returned, not stored as error. |
| `WIDGET_VIS_MAXIMIZE_FAILED` | Cognos focus-mode enter/exit or observer confirmation failed. |
| `WIDGET_VIS_FOCUS_PANEL_FAILED` | Focus-mode settings panel creation/binding/dispose failed. |
| `WIDGET_VIS_DESTROY_FAILED` | Destroy cleanup boundary caught an error. |

Errors are logged once at the boundary with operation context and converted to owned state or dispatch result. Foreign state is never written on error.

## 16. Supersession

Each per-widget operation gets an `opSeq` from `_KDB.runtime.widgetVis.byId[widgetId].opSeq`. Async effects capture the current value and check it after every awaited boundary. If superseded, the older continuation returns `{ ok: false, stale: true }`, does not write state, does not run post-apply cleanup, and does not report success to settings.

Abortable work stores its controller under the per-widget `abortControllers` bucket. Starting a new operation of the same kind aborts the prior controller where safe.

`topNResolved` must carry `opSeq` and is ignored when stale.

## 17. Folder Layout

As built after the Phase 1 module-template rework (53 files, one concern per file; `widgetVis` emits no events, so there is no `events/` folder):

```txt
KDB3/js/dashboard/widgets/widgetVis/
  index.js            # registerWidgetVis: controller, ROUTES table, host facet stamps, mount/dispatch/destroy
  config.js           # timeouts, class names, focus-mode poll values, GROUPINGS
  state.js            # ACTION_TYPES, initial state, reducer, metric identity helpers
  selectors.js        # published: ACTION_TYPES, readVisRecord, readVisMaximized, readVisPropBucketKey
  runtime.js          # runtime buckets, per-widget runtime, content-ready waiters, readHostFacet
  context.js          # buildContext, action validation, opSeq helpers
  results.js          # normalizeDispatchResult, finalizePipelineResult, reportApplyResult
  dom.js              # shell / visualization content / query-root resolution
  lifecycle.js        # contentCreate, waitUntilContentReady, ensureObservers, disposeWidgetRuntime, module dispose
  settings.js         # applyDimension / applyVisType / applyTopNChoice / applyGrouping, applyStartupSettings
  settingsSnapshot.js # effective settings snapshot for binding
  cleanup.js          # cleanupContent (binding cleanup, decoration cleanup)
  restore.js          # parameterSet binding batch and cancel
  bindingConfig.js    # binding config resolution (dimensions, sorting, data table, empty filter, TopN list)
  visTypes.js         # visualization type/definition/property resolution, Kennzahl defaults
  years.js            # year parsing helpers
  binding/
    spec.js               # buildBindingSpec (tokens, widget filters, grain overlay)
    pipeline.js           # validateSettings, prerequisites, runBindingPipeline
    gates.js              # prerequisite gate waiters (Dienststelle/hierarchy)
    applyResult.js        # apply success/failure handling, derived patch
    dienststelleChanged.js# widgetVis/dienststelleChanged handling and broadcast
  topN/
    gate.js               # TopN prerequisite and widgetVis/topNResolved
    periodPin.js          # period/Stichtag pin and readConfirmedJahrYear
    wave.js               # TopN filter-confirm wave (runTopNFilterConfirmWave)
    waveRequest.js        # `filters:confirmed` event payload -> wave payload (Jahr decision, selectedYear)
    filtersConfirmed.js   # subscribe(_KDB): starts the wave from `filters:confirmed` (fire-and-forget), installed by mount
  render/
    visProperties.js      # applyVisualizationProperties (declarative property application)
    displayOptions.js     # showValues / iterator / zoom / caption display options
    postRender.js         # applyPostRenderCleanup, tooltip metadata, decoration cleanup
    title.js              # visualization title text and title link
  legend/
    captionText.js        # legend caption string pipeline (sanitizeLegendCaptionText)
    captionDom.js         # legend host/caption DOM predicates
    sanitize.js           # runLegendSanitizers: caption/subtree sanitizing
    observer.js           # legend text MutationObserver
    sweep.js              # sweepLegendCaptions, install observer before apply
  drillthrough/
    install.js            # installDrillthrough, installContentDecorations, syncDrillthroughAfterFocusExit, cleanup
    spec.js               # assembleDrillthroughSpec / datapoint spec
    orgTree.js            # org hierarchy tree from cells/rows
    year.js               # drillthrough Jahr resolution
    icon.js               # header and datapoint icon DOM
    datapointChrome.js    # datapoint (S2) icon sync from selections
    click.js              # click binding
  focus/
    focusMode.js          # enter/exit focus mode
    observer.js           # shared focus-state observer
    panel.js              # focus panel clone and pointer handling
    domQueries.js         # focus-mode DOM queries
    maximizeIcon.js       # canvas maximize icon plant/cleanup
    maximizeToggle.js     # widgetVis/maximizeToggle handler
  visualization.js    # published: applyVisualizationProperties (widgetTopN helper chart; transitional function import)
```

### 17.1 Filter-confirm TopN wave (event)

The filter owners (`singleSelect`, `nativeMultiSelect`) do not import widgetVis. After a confirmed commit or history replay they emit `filters:confirmed` (`core/events/filters.js`, payload `{ filterType, scopeType, tabId?, scopeId?, columnId?, confirmedValues? }`). `widgetVis.mount` subscribes (`topN/filtersConfirmed.js`; the unsubscribe lives in `runtime.subscriptions.filtersConfirmed` and is released on destroy). The handler maps the event to the wave request (`topN/waveRequest.js`: `isJahr` only for a string `columnId` equal to the TopN helper table's `jahrColumnId`; `selectedYearKnown`/`selectedYear` only when `confirmedValues` is present) and runs `runTopNFilterConfirmWave` without awaiting it; a failure is logged (`[widgetVis.filtersConfirmed] topN wave failed`) and never reaches the emitting commit. The bus emits synchronously, so the wave's synchronous prefix still runs at the emitter's call position (before the nativeMultiSelect history push, after the singleSelect history push). No wave starts while widgetVis is not mounted. The three former path shims (`actions/runTopNFilterConfirmWave.js`, `effects/readConfirmedJahrYear.js`, `effects/applyVisualizationProperties.js`) are deleted; `visualization.js` is the published import for widgetTopN's helper chart.

## 18. Bootstrap And Integration

Current production already registers and mounts the `widgetVis` scaffold from `KDB.js`. This tranche updates the implementation in place; it does not require a new `KDB.js` registration for `widgetVis`.

Required integration prerequisites or deltas:

- `widgetBindingPlan` and `widgetBindingApply` must exist and be registered before real binding actions can be accepted as complete.
- `dienststelle` must be retargeted from the legacy placeholder `_KDB.api.visualizationWidget.dispatch({ type: "visualizationWidget/dienststelleChanged" })` to `_KDB.api.widgetVis.dispatch({ type: "widgetVis/dienststelleChanged" })` during the approved widgetVis tranche.
- `widgetSettings` startup routing must target one `widgetVis/applyStartupSettings` action for dimension/visualization/topN defaults (not `showValues` — inherit); user/history intent routing must target `widgetVis/applyDimension`, `widgetVis/applyVisType`, `widgetVis/applyTopNChoice`, and `widgetVis/applyShowValues`; shell colour stays with `widgetBase`.
- `widgetBase` may call `widgetVis/cleanupContent` before launchpad transfer/removal of a visual widget.
- `widgetTopN` must be registered before non-default TopN can complete; if unavailable, `widgetVis/applyTopNChoice` returns a documented deferred/error result and does not report settings success.
- Production `KDB.js` calls `widgetVis.mount({ enableDrillthrough: true })`. Omitted option still defaults true. The flag is runtime, not state.
- `_KDB.services.drillthrough` must be registered before production `widgetVis` mount. Missing service → install skip + `WIDGET_VIS_DRILLTHROUGH_FAILED` wiring; `contentCreate` still succeeds.

## 19. Out Of Scope

- Editing `.cursor/rules/`, templates, authority docs or legacy trees.
- Writing canonical settings values or settings history.
- Writing frame/layout/launchpad state or move/resize behavior.
- TopN helper claim/resolution internals.
- Datasource selection ownership and datasource-switch orchestration; future owner is `dataSourceContext`.
- Binding service internals beyond consuming their public APIs.
- Cross-module integration tests.
- Bootstrap registration for new binding services.
- Parameter-set/writeback restore.
- Legend caption `aria-label` parity with KDB2; chart tooltip **text** rewrite (distinct from `syncTooltipMetadata` pipe-part annotation).
- Maximize/focus-mode history, persisted restore, global fullscreen/body classes, or widgetBase ownership without a focused contract delta.
- `p_p_*` catalog / URL open (owned by `_KDB.services.drillthrough`).
- PDF capture hide of the drillthrough icon (owned by `dashboardPdf`).
- New visualization **facet** (F1c is ops on the existing `visualization` facet). `_KDB.cognosAPI` / `content.on` in widgetVis for selections. Ctrl / 3s flush. Growing `dashboard/widgets/widgetVis/drillthrough/install.js` (`installDrillthrough`) for S2. Planting S2 in header `.widgetIcons` or inside TR. Uncrushing `#maximize_32_v7` / reopening T1 `right: 28px`.
- Scraping `.KDB_optionSelected`.
- Cloning the PKZ icon onto `.KDB_focusModeSettingsPanel`.
- Mutating `.collapseSvg.focusMode` or planting PKZ on that button. B column is a sibling **after** it.

## 20. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ mount, destroy, dispatch, getState }`.
2. Every public action payload above is specified and returns normalized dispatch results.
3. `_KDB.state.widgets.vis` is the only state subtree written by `widgetVis`.
4. `widgetVis` stores no canonical settings values and pushes no history.
5. `waitUntilContentReady` resolves per-widget content registration readiness without waiting for binding/render and without requiring `widgetSettings` to poll state or runtime.
6. `resolveBindingPrerequisites` prevents `widgetBindingPlan.buildPlan(spec)` until settings, Dienststelle hierarchy and any required TopN helper result are ready; `topNChoice: none/default` skips helper waiting.
7. Missing Dienststelle or non-default TopN prerequisites return pending/deferred/error diagnostics and do not silently bind without those inputs.
8. Apply success/failure is reported to the caller so `widgetSettings` can commit or reject the settings value.
9. Intentional emptying maps internal `forceEmpty` / `emptyReason` source material to canonical `BindingPlanSpec.emptyIntent` and uses the normal `buildPlan -> applyBinding -> render wait -> confirmed result` pipeline; no `_KDB.services.widgetBindingApply.applyEmptyDataFilter(...)` route exists.
10. `cleanupContent` is the public cleanup route for visual content, callable by `widgetBase` and `widgetSettings`.
11. Settings-delete cleanup with `clearBinding:true` maps to `BindingPlanSpec.resetIntent` and disabled `emptyIntent`; it is technical reset-only cleanup, not intentional emptying.
11. T1 header icon + T2 S2 + runtime bucket (including `listeners.drillthrough*` unsubs) are owned and cleaned by `widgetVis`; URL open is `_KDB.services.drillthrough`. `content.on` is not required in widgetVis. Subscribe drives chrome; peek is source of truth at click.
12. Binding services are consumed only through their public surfaces.
13. Dienststelle inbound is a direct dispatch, not an event.
14. TopN result handling is opSeq-gated and stale-safe.
15. Metrics datasource is resolved through the local `widgetVis` datasource resolver: future `dataSourceContext.getCurrentMetricsDataSource()` first, `_KDB.config.dataSources.metrics.default` fallback second; no deep file hardcodes `Personal_KDB`.
16. Maximize/focus-mode is implemented as a minimal widgetVis-owned Cognos focus-mode tranche: observer-confirmed state, settings focus-panel chrome, no history and no persisted restore.
17. Visible `#`/`ALLE`/`Beendet` legend-caption normalization is in scope per `contracts/_archive/widgetVis-legend-normalization-contractdelta.md` (hash per segment, then keep-order; compose unused). LINE `.lgd-title` helper: `contracts/_archive/widgetVis-legend-line-dst-first-contractdelta.md`. Remaining gaps (caption `aria-label`, chart tooltip text rewrite) stay out of scope.
18. Production files use AMD full-compact form and pass lints when implemented.
19. After PO approval of `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`: visible title and header tooltip include the kennzahlDefaults Aggregationstyp captions in parentheses after the display name (Line `P_PS_K_01` inherit → `(Stichtag)`); `readMetric` does not leak suffixed `titleText` as `display`. After grouping-A: same factory as binding; Line+`jahr` → `(<jahrCaption>)`; pie+`stichtag` → `(Stichtag)`.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub` | Planner (Claude Opus 4.8) | Initial outline from widgets-domain blueprint. |
| 2026-06-07 | `Stub -> Draft CP-1` | `<pending>` | Full composed-port contract expanded: settings/history ownership clarified, visual cleanup owned by `widgetVis`, binding services declared prerequisite, drillthrough and future legend-normalization decisions recorded. |
| 2026-06-07 | `Draft CP-1 -> Service-aligned draft` | `<pending>` | Aligned binding boundary to canonical `widgetBindingPlan` / `widgetBindingApply` contracts: `BindingPlanSpec`, `ApplyBindingOptions.previousManagedFilterItemIds`, `emptyIntent`, success-only `mirrorPatch`, and abort-as-supersession semantics. |
| 2026-06-07 | `Service-aligned draft -> Readiness-gated draft` | `<pending>` | Added `widgetVis/waitUntilContentReady` as the per-widget registration-readiness gate for `widgetSettings` default seeding; readiness waits for visual record + metric/data identity, not Cognos render. |
| 2026-06-08 | `Readiness-gated draft -> Datasource-default aligned draft` | `<pending>` | Recorded temporary `Personal_KDB` datasource default via global config and local `widgetVis` resolver, with future replacement by `dataSourceContext.getCurrentMetricsDataSource()`. |
| 2026-06-08 | `Datasource-default aligned draft -> Binding-gated draft` | `<pending>` | Added `resolveBindingPrerequisites`: settings snapshot, confirmed Dienststelle hierarchy and non-default TopN helper result must be ready before `widgetBindingPlan.buildPlan(spec)`. |
| 2026-06-11 | `Binding-gated draft -> TopN handshake aligned draft` | GPT-5.5 | Made the `widgetSettings -> widgetVis -> widgetTopN -> widgetVis -> widgetSettings` route explicit: `widgetVis` owns the normal `opSeq`, dispatches the full `resolveRequested` payload, waits for `topNResolved`, and only reports settings success after confirmed visible apply. |
| 2026-06-11 | `TopN handshake aligned draft -> Reset cleanup replay-safe draft` | GPT-5.5 | Clarified that `cleanupContent(settingsDelete)` is forward cleanup for reset-to-launchpad, not terminal removal; undo must re-enter `widgetVis` through public replay/restore dispatch after `widgetBase` restores the shell. |
| 2026-06-16 | `Absent-sentinel CP-1 delta` | User-approved (A1+B1+C1) | Added §7.1.1 normalization boundary, §7.1.2 absent-dimension gates TopN helper; clarified `none` is not a dimension/topN id. Cross-ref `widgetSettings` §4.1, blueprint §7.1. |
| 2026-08-26 | `Legend-caption normalization delta` | PO (vastenburg) | Visible `#`/`ALLE`/`Beendet` caption pipeline in `view/legend/` (hash then compose; List hash-only). Parent §1/§13/§17/§19/§20 synced. Delta: `contracts/_archive/widgetVis-legend-normalization-contractdelta.md`. |
| 2026-09-02 | `LINE DST-first legend (L1)` | PO (vastenburg) | Same PR as slots S1. LINE keep-order captions; hash flags per segment (all vis types); second title helper. Non-LINE vectors 1–11 remain. Delta: `contracts/_archive/widgetVis-legend-line-dst-first-contractdelta.md`. |
| 2026-08-26 | `Legend-caption flash sequencing` | PO (vastenburg) | A+B not C: observer on queryRoot before `applyBinding`; sweep+observer before post-render properties; caption-only mutation filter; unpark sweeps. Delta: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`. |
| 2026-08-26 | `Observer writes / load icon flash` | PO (vastenburg) | Observer must not toggle `KDB_visible` or full-scan `queryRoot`; subtree captions only. Companion CSS in `widgetSettings.css` / `widgets/widgetHiding.css` (former `hideSpot.css`). Delta §3.1: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`. |
| 2026-08-27 | `Legend observe shell when BEM missing` | PO (vastenburg) | Observe BEM content when present, otherwise the widget shell, so restore paint still rewrites captions; observer writes stay caption-text-only (no `KDB_visible`). Shell sweeps are captions-only. Delta §3 / §3.1: `contracts/_archive/widgetVis-legend-caption-flash-contractdelta.md`. |
| 2026-08-27 | `Golden vector 11 + agent do-not` | PO (vastenburg) | Golden vector 11 (org-code `#` without ALLE/BEENDET) + agent do-not box. |
| 2026-08-29 | parent sync from widgetVis-drillthrough-service-contractdelta.md | PO vastenburg (delta approved 2026-08-28) | T1 icon consumer + service call; capture deferred. |
| 2026-08-30 | T2 F1c + S2 | PO / contract writer | Subscribe + S2 plant + datapoint spec via stamped `visualizationFacet`. No Ctrl. No new facet. T1 header icon unchanged. |
| 2026-09-01 | `Title aggregation suffix` Draft | Coordinator (Grok 4.6); `<pending PO>` | Header title/tooltip `(caption)` from kennzahlDefaults vis-type branch (not lastOriginal `allOther`). Delta: `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`. No production code until PO. |
| 2026-09-01 evening | `Title aggregation suffix` Approved-for-implementation | Coordinator (Grok 4.6); PO List two-captions already locked | Pre-impl: missing helper, not flood. `readMetric` must not use `derived.titleText` as `display`. Tooltip prepend in `syncVisualizationTitle`. Delta: `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`. |
| 2026-09-02 | `Title aggregation suffix` Implemented | PO (vastenburg) green | Live canvas: Line `(Stichtag)`, List two captions. Delta: `contracts/_archive/widgetVis-title-aggregation-contractdelta.md`. |
| 2026-09-11 | Grouping-A Draft pointer | captain; PO A-shape lock | Grain packs + factory pending Approved grouping delta. Parent §1/§13/§20 point at `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md`. |
| 2026-09-11 | Grouping-A Approved | PO vastenburg | Execution spec `widgetVis-grouping-jahr-stichtag-a-execution-spec.md`. Army W1–W3. No B chrome. |
| 2026-09-11 | Grouping-A Implementing | captain; army W1–W3 | `branchKey` gone; factory + sibling overlay in tree. Dual NIT. Await canvas. |
| 2026-09-11 evening | Grouping-A Implemented | PO vastenburg | Inherit titelhaakjes green. Chrome is grouping-delta Step B. |
| 2026-09-11 evening | Grouping-B Approved | captain (PO auto-approve 3× green) | Zeitebene chrome + dataConfig.grouping stamp. Spec ready. Q6 still D. |
| 2026-09-12 | Grouping-B Implemented | PO vastenburg | Canvas stap 2 groen. Delta: `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md` §11. |
| 2026-09-12 | Grouping-F Implemented | PO vastenburg | 5 layouts + Diagrammstandard inherit; illegal token CLEARs. Delta §12. Q6 still D. |
| 2026-09-12 | Family A inherit-row chrome Implemented | PO vastenburg | Zeitebene + showValues Diagrammstandard dashed inherit; showValues delete-key. Delta: `contracts/_archive/widgetSettings-family-a-inherit-row-chrome-contractdelta.md`. |
| 2026-09-01 | Parent sync NewestStichtag period pin | Implementing captain (Grok 4.6); PO product lock | `resolveRequested` payload names `jahrFilterValue` + `monatFilterValue`; `widgetVis` owns leftover pin via `reloadTable`. Delta: `contracts/_archive/widgetTopN-newestStichtag-contractdelta.md`. |
| 2026-09-02 | `LINE Dim→DST→Jahr + legend` PO green | PO (vastenburg) | LINE `[dim?, Dienststelle, Jahr]`; captions hash + exact-2 dim collapse; List excluded; Prognose slots unchanged. Compose file deleted. Deltas: `widgetVis-series-dim-dst-jahr-order-contractdelta.md`, `widgetVis-legend-keep-order-non-list-contractdelta.md`, `widgetVis-legend-dim-token-collapse-contractdelta.md`, `widgetVis-legend-compose-dead-code-cleanup-contractdelta.md`. Prognose: `contracts/_archive/prognose-align-series-with-line.md`. |
| 2026-09-06 | `Prognose keep-Stichtag legend collapse (B)` | PO (vastenburg) | Prognose Jahr-last n>=5: reserve DST+Stichtag+Jahr then exact-2 on prefix; dual-era else. Delta: `contracts/_archive/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`. |
| 2026-10-14 | Dimension Ohne clears TopN | PO vastenburg via assignment; reviews green | Settings clears a real `topNChoice` on that gesture. Absent dimension still ignores a stale TopN and may dispatch `widgetTopN/cleanup`. Delta: `contracts/_archive/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`. |

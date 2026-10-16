# Module Contract: `widgetTopN`

> Full CP-1 contract for the TopN-resolution composed-port tranche. Design authority lives in `_____________KDB3API/architecture/_archive/widgets-domain-blueprint.md`; the binding boundary is fixed by `widgetBindingPlan.md`, `widgetBindingApply.md` and `widgetVis.md`.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetTopN`
**Type:** `feature module` (content helper / consequence resolver)
**Authoring AI:** GPT-5.5, 2026-06-07
**Reviewed by:** `<pending CP-1 approval>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetTopN` is a new TopN resolution owner assembled from REDESIGN2 TopN evidence, older helper-table behavior and the widgets-domain blueprint. It is not a 1-to-1 port of a legacy module.

Target production path:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetTopN/
```

This tranche owns the TopN helper-resolution workflow for visible visualization widgets: request state, helper selection/claim orchestration, helper-target binding, helper row read through `tableDataService`, hierarchy rewrite input, extraction of `resultValues` / `excludeItemId`, cleanup of helper binding artifacts, and terminal dispatch back to `widgetVis`.

No production behavior code may be generated until this CP-1 contract is approved. The execution spec in `widgetTopN-port-execution-spec.md` is a handoff document, not approval to code.

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `architecture/_archive/widgets-domain-blueprint.md` | Authority for `widgetTopN` as first-class content module serving `widgetVis`, state ownership, dispatch choreography and Section 12 execution readiness. |
| `contracts/_archive/widgets-binding-pipeline-planner-handoff.md` | Non-authority context for already-settled binding pipeline decisions. |
| `contracts/widgetBindingPlan.md` | Schema authority for `BindingPlanSpec`, `BindingPlan`, `helperTableResult`, `emptyIntent`, `managedFilterItemIds` and `opSeq` diagnostic echo. |
| `contracts/widgetBindingApply.md` | Authority for helper `applyBinding`, helper target shape, timeout, abort and diagnostics. |
| `contracts/widgetVis.md` | Authority for inbound `resolveRequested` caller shape and outbound `widgetVis/topNResolved` payload consumption. |
| `contracts/widgetSettings.md` | Settings owner and history owner for `topNChoice`; it reaches TopN only through `widgetVis`. |
| `contracts/widgetDataTable.md` | Context for datatable/List content, but this TopN claim tranche no longer depends on datatable claim validation/release. |
| `contracts/widgetBase.md` | Frame record authority for `role:"topNHelper"` and `ownerWidgetId`; helper placement is a base-frame concern. |
| `contracts/tableDataService.md` | Authority for helper-widget row reads through `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId }])`. |
| REDESIGN2 TopN investigation report | Legacy state machine, helper claim/reuse, sequence guard, helper cleanup order, hierarchy rewrite and flat-data extraction. |
| `widgets-legacy-survey-laatsteoriginal.md` TopN sections | Older evidence for hidden List helper, per-tab helper selection, launchpad claim protection and dimension guard. |

Deliberate deltas versus legacy:

- Legacy `topN:resolutionFinished` pub/sub is not revived. The target uses direct dispatch: `widgetTopN/resolveRequested` in, `widgetVis/topNResolved` out.
- Legacy string `sequenceId` (`topN-{timestamp}-{counter}`) becomes a numeric `opSeq`. In the normal settings flow, `widgetVis` owns the user-intent `opSeq` and `widgetTopN` adopts/echoes it. `widgetTopN` increments its own runtime `opSeq` only for direct/test calls that omit an envelope `opSeq`.
- Legacy helper claim markers on ad hoc widget pending fields become `widgetTopN` owned claim metadata plus a reversible DOM mirror (`data-connected-vis-widget-id`, `data-kdb-topn-claim-token`).
- Legacy per-run cleanup kept the helper claim and cleared helper filters/slots. Target cleanup is expressed through the existing binding services: a helper cleanup plan carries `resetIntent` for a technical slots/local-filters reset; it does not invent a separate apply cleanup API, does not destroy the helper and does not release the claim unless explicitly requested.
- Legacy `isSuperseded` flag is not preserved. Staleness is determined only by current `opSeq` plus `AbortController` state.
- Legacy helper DOM scan / `data-kdb-claimed-run` mechanics are replaced by launchpad ordered id discovery plus `widgetTopN` owned claim token confirmation. `widgetTopN` never reads launchpad DOM or runtime directly.
- Legacy TopN UI/info-toast decisions stay outside `widgetTopN`; no-helper and error surfacing belongs to `widgetVis` / `widgetSettings`. WP3: settings owns the toast.
- Legacy result extraction from helper rows is preserved semantically, but the row read is delegated to `tableDataService.reloadTable([{ widgetId: helperWidgetId }])`.

## 2. Purpose

`widgetTopN` resolves TopN selections for visible visualization widgets. Given a request from `widgetVis`, it claims or reuses a hidden datatable/List helper, builds and applies a helper-target binding plan, reads helper table rows through `tableDataService`, extracts TopN result values and the exclude item id, stores owned resolution state, and dispatches one terminal result to `widgetVis`.

`widgetTopN` is not a visible widget, not a settings owner and not a binding schema authority. It does not apply TopN values to the visible widget; `widgetVis` maps the terminal payload to `helperTableResult` and runs the visible-widget binding pipeline.

## 3. Ownership

Canonical state subtree:

```js
_KDB.state.widgets.topN = {
  lifecycle: "idle",
  byOwner: {},
  errorCode: null,
  errorMessage: null
};
```

Per-owner resolution state:

```js
_KDB.state.widgets.topN.byOwner[ownerVisId] = {
  ownerVisId: "<visible widget id>",
  resolutionStatus: "idle" | "pending" | "success" | "error" | "noHelperAvailable",
  helperWidgetId: null,
  claimToken: null,
  resultValues: [],
  excludeItemId: null,
  errorCode: null,
  errorMessage: null,
  pending: { kind: null, opSeq: null }
};
```

Ownership rules:

- `widgetTopN` is the only writer of `_KDB.state.widgets.topN`.
- `resolutionStatus` is a TopN domain status, not a lifecycle term.
- `widgetTopN` never writes `_KDB.state.widgets.vis`, `_KDB.state.widgets.settings`, `_KDB.state.widgets.base`, `_KDB.state.widgets.dataTable`, `_KDB.state.history`, launchpad state or tableData state.
- TopN helper claim ownership belongs to `widgetTopN`: it records `helperWidgetId` / `claimToken` in its own state and mirrors the active owner/token on the helper shell DOM.
- `widgetTopN` does not require `widgetDataTable` claim validation and does not require a `widgetBase` helper-role/owner action for claim. Helper candidates are expected to be pre-routed into the same-tab `topN` launchpad pad.
- `widgetBase` remains the frame/movement owner. If a helper must be moved between canvas and launchpad, that remains a `widgetBase` action; the TopN claim itself is not a base-frame write.
- `resultValues` and `excludeItemId` are derived/working TopN state only. They are not settings values and are not history snapshots.

Lifecycle subset for module-level state: `idle`, `initializing`, `ready`, `error`, `disposed`. Per-owner records use `resolutionStatus` plus `pending` instead of custom lifecycle values.

## 4. Runtime

Owner namespace:

```js
_KDB.runtime.widgetTopN = {
  abortControllers: {},
  pendingPromises: {},
  timers: {},
  byOwner: {}
};
```

Per-owner runtime:

```js
_KDB.runtime.widgetTopN.byOwner[ownerVisId] = {
  abortControllers: {},
  pendingPromises: {},
  timers: {},
  opSeq: 0,
  helperWidgetId: null,
  claimToken: null,
  helperManagedFilterItemIds: [],
  lastHelperPlan: null
};
```

Runtime rules:

- `opSeq` is the single stale-result guard per visible owner widget for TopN resolution.
- In the normal user/settings path, `widgetVis` increments/captures the user-intent `opSeq` before dispatching `widgetTopN/resolveRequested`; `widgetTopN` adopts that envelope `opSeq`, stores it as the current owner runtime `opSeq`, uses it for all helper work and echoes it in `widgetVis/topNResolved`.
- `widgetTopN` increments `_KDB.runtime.widgetTopN.byOwner[ownerVisId].opSeq` only when a direct/test caller omits envelope `opSeq`.
- Starting a new `resolveRequested` for the same `ownerVisId` aborts older same-owner work where safe and replaces the pending marker, whether the `opSeq` was adopted from `widgetVis` or generated locally.
- `helperManagedFilterItemIds` is caller-runtime input for helper cleanup and is passed to `widgetBindingApply.applyBinding` as `previousManagedFilterItemIds`.
- `claimToken` is generated and owned by `widgetTopN` for helper claim confirmation. It is mirrored to owned TopN state as serializable claim metadata and to helper shell attributes for runtime collision detection; it is not a widgetBase/base-frame field.
- `lastHelperPlan` is runtime diagnostic/recovery material only. It is never persisted and never used as a settings/history source.
- On successful explicit cleanup, `helperManagedFilterItemIds` is reset to the cleanup plan's `managedFilterItemIds`; for reset-only helper cleanup this is `[]`. `lastHelperPlan` is cleared unless the implementation deliberately keeps it only as diagnostics for the same live claim.
- `destroy()` sets `_isDisposed = true` first, aborts all controllers, clears timers/pending promises, runs best-effort helper cleanup for owned active claims when safe, clears runtime entries, and marks module state `disposed`.
- Runtime never stores DOM nodes or Cognos host objects.

## 5. Public API

Feature module surface:

```js
_KDB.api.widgetTopN = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Signature | Contract |
|---|---|---|
| `mount(options)` | `({ helperTimeoutMs?: number, readTimeoutMs?: number } = {}) => boolean` | Initializes `_KDB.state.widgets.topN` and `_KDB.runtime.widgetTopN`. Does not create per-widget resolution records. |
| `destroy()` | `() => void` | Idempotent module teardown; sets disposed guard before cleanup and aborts/clears all owned runtime resources. |
| `dispatch(action)` | `(action: WidgetTopNAction) => Promise<object>` | Single command entry. All state/effect actions route through dispatch. Post-disposal calls no-op and warn once. |
| `getState()` | `() => object | undefined` | Returns a cloned snapshot of `_KDB.state.widgets.topN`; never returns live mutable state. |

No named commands are added to `_KDB.api.widgetTopN`.

### 5.1 Action Envelope

Every action uses:

```js
{
  type: "widgetTopN/<actionName>",
  widgetId: "<owner visualization widget id>",
  opSeq: 1,
  payload: {}
}
```

Rules:

- The envelope `widgetId` is the visible owner visualization widget id.
- Payloads may also carry `ownerVisId` for compatibility with `widgetVis` payload naming, but it must match envelope `widgetId`; conflicts return `WIDGET_TOPN_OWNER_ID_CONFLICT`.
- `opSeq` is optional for callers. If present, `widgetTopN` adopts it and must not increment again. If absent, `widgetTopN` increments and captures the current runtime `opSeq`.
- Dispatch results are normalized:

```js
{
  ok: boolean,
  ownerVisId?: string,
  helperWidgetId?: string | null,
  opSeq?: number,
  status?: "success" | "error" | "noHelperAvailable" | "aborted",
  stale?: boolean,
  terminalDispatched?: boolean,
  errorCode?: string,
  errorMessage?: string,
  diagnostics?: object
}
```

## 6. Action Payloads And Behaviour

### `widgetTopN/resolveRequested`

Payload:

```js
{
  ownerVisId: string,
  topNChoice: string,
  settingsSnapshot: object,
  dataConfig: BindingPlanSpec.dataConfig,
  hierarchySnapshot: BindingPlanSpec.hierarchySnapshot | null,
  config: {
    filterPropObj: object,
    parameterMappingObj: object,
    topNOptions: object,
    emptyDataFilter?: object
  },
  jahrFilterValue: { d: string, u: string } | string | null,
  monatFilterValue: { d: string, u: string } | string | null,
  source: "user" | "historyReplay" | "startup" | "dienststelle" | string,
  isHistoryReplay: boolean
}
```

Flow:

1. Validate owner id, dependencies, `topNChoice`, `dataConfig` and `config`.
2. Require normalized `topNChoice` to match `dataConfig.topN` for non-default requests. Normalization uses the same option parsing semantics as `widgetBindingPlan.parseTopNOption(raw, config.topNOptions)`, plus the accepted default/none sentinels used by `widgetVis`.
3. If `topNChoice` is default/none, dispatch terminal success with `resultValues: []`, `excludeItemId: null` and no helper work. This is a direct-call/test backstop only; in the normal `widgetVis` production path, default/clear TopN is handled by `widgetVis` through visible binding plus `widgetTopN/cleanup` when an existing helper claim may need clearing. In production, `widgetVis` MUST NOT dispatch `resolveRequested` when dimension is absent (`widgetVis` §7.1.2) or when topN is absent (§7.1).
4. **Absent input sentinel set (canonical):** `""`, `"default"`, `"none"`. These are not TopN ids. The value `"0"` is deprecated and must not be introduced by new callers; alignment with `normalizeDefaultValue` is required in the implementation tranche.
5. Adopt envelope `opSeq` when present; otherwise increment/capture the owner runtime `opSeq`. Abort prior same-owner resolution and mark `_KDB.state.widgets.topN.byOwner[ownerVisId].resolutionStatus = "pending"`.
6. Claim or reuse a helper through the helper claim contract in Section 7. Discovery uses `launchpad/readSlotWidgets` for the owner's same-tab `topN` pad; validation/claim state is owned by `widgetTopN`, not `widgetDataTable` or `widgetBase`.
7. If no helper is available, write owned status `noHelperAvailable`, dispatch terminal `widgetVis/topNResolved` with `status:"noHelperAvailable"`, and return success with `terminalDispatched:true`.
8. Build a helper-target `BindingPlanSpec` with `targetKind:"topNHelper"`, `widgetId: helperWidgetId`, `ownerWidgetId: ownerVisId`, `opSeq`, `reason:"topN"`, a helper-normalized `dataConfig`, `hierarchySnapshot`, `config`, and no `helperTableResult`.
9. Call `_KDB.services.widgetBindingPlan.buildPlan(spec)`.
10. If the helper plan fails, write owned error status and dispatch terminal `status:"error"`.
11. Call `_KDB.services.widgetBindingApply.applyBinding(plan, { target:{ widgetId: helperWidgetId, targetKind:"topNHelper", ownerWidgetId: ownerVisId, opSeq, reason: plan.reason }, signal, previousManagedFilterItemIds: helperManagedFilterItemIds, timeoutProfile:"helper" })`.
12. On helper apply success and current `opSeq`, replace `helperManagedFilterItemIds` with `plan.managedFilterItemIds` and store `lastHelperPlan` runtime-only.
13. Call `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId, shape:"row", pick:["display","use","d","u","value","v","label","caption"] }])` to read helper rows.
14. Extract TopN result values from helper table rows and resolve `excludeItemId` from `dataConfig.dataTableConfig.dimensions[dataConfig.dimension].exclude.itemId`.
15. If still current, write `resolutionStatus:"success"`, `helperWidgetId`, `resultValues`, `excludeItemId`, clear error/pending, dispatch terminal `widgetVis/topNResolved`.
16. After the current terminal result has been dispatched, run post-resolution helper cleanup when a helper apply succeeded for this operation, unless inspection mode is enabled through `config.preserveHelperBindingForInspection === true`, `config.topNOptions.preserveHelperBindingForInspection === true` or `config.topNOptions.skipPostResolutionHelperCleanup === true`. Use the explicit helper cleanup sequence in Section 8 with `cleanupReason:"postResolution"`, `clearHelperBinding:true` and `releaseClaim:false`. This applies after terminal `success` and after current terminal `error` cases that occur after helper apply success (for example tableData read or extraction errors). Do not run post-resolution cleanup for `noHelperAvailable`, helper claim failure, helper plan failure or stale/aborted operations. Cleanup does not destroy or release the helper claim unless a separate explicit `cleanup` request asks for release.

Terminal dispatch payload:

```js
_KDB.api.widgetVis.dispatch({
  type: "widgetVis/topNResolved",
  widgetId: ownerVisId,
  opSeq: opSeq,
  payload: {
    ownerVisId: ownerVisId,
    opSeq: opSeq,
    status: "success" | "error" | "noHelperAvailable",
    resultValues: [],
    excludeItemId: null,
    errorCode: null,
    errorMessage: null
  }
});
```

A `resolveRequested` for an owner whose widgetBase frame has `placement: "removed"` returns an aborted/stale result before any record, claim, helper work or terminal is created. A resolve aborted before the claim is written (cleanup or remove during helper discovery) writes no claim.

Terminal rule: every non-stale `resolveRequested` must dispatch exactly one terminal result to `widgetVis` within bounded helper apply/read time. Stale/aborted older work dispatches no terminal result because a newer `opSeq` owns the terminal answer.

### `widgetTopN/cleanup`

`widgetVis` may dispatch `widgetTopN/cleanup` when a dimension is absent and this owner’s `resolutionStatus` is `pending`, `success`, or `error`. Payload and reducer behavior are unchanged. See `contracts/_archive/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`.

Payload:

```js
{
  ownerVisId: string,
  reason: "visDestroy" | "helperDestroy" | "superseded" | "launchpadTransfer" | "destroy" | string,
  releaseClaim: boolean,
  clearHelperBinding: boolean
}
```

Flow:

1. Abort in-flight work for `ownerVisId`.
2. If `clearHelperBinding === true` and a helper exists, run the explicit helper cleanup sequence in Section 8. No direct Cognos wrapper calls are made outside `widgetBindingApply`, and there is no separate cleanup method on `widgetBindingApply`.
3. If `releaseClaim === true`, clear the `widgetTopN` owned claim state/runtime for `ownerVisId` and remove only the TopN-owned DOM mirror attributes from the helper shell when the mirrored owner/token still match. `widgetTopN` does not call `widgetDataTable/releaseClaim` or a `widgetBase` helper-role action.
4. Clear owned TopN state for that owner to `resolutionStatus:"idle"`, `helperWidgetId:null` when the claim is released, `resultValues:[]`, `excludeItemId:null`, clear pending/error when cleanup succeeds.
5. Cleanup never destroys the helper widget. The helper remains parked in the `topN` launchpad pad unless a separate `widgetBase` action routes it elsewhere.

Release defaults:

| Trigger | `clearHelperBinding` | `releaseClaim` |
|---|---:|---:|
| Superseded new TopN request | true | false |
| Visible widget launchpad transfer | true | false |
| Visible widget destroy/remove | true | true |
| Helper widget destroy/remove | false | true |
| Module destroy | best effort | best effort |

Release on remove/destroy: for cleanup reasons `remove` and `destroy` with `releaseClaim: true`, a helper clear that fails (for example no helper `dataConfig` yet because the first bind never finished) does not keep the claim: the claim, the TopN-owned mirror attributes and the owner records are released anyway and the result stays `ok: false` (`WIDGET_TOPN_CLEANUP_FAILED`). The next claimant resets the helper in its own pre-apply. Other reasons (explicit clear, Jahr wave) keep the claim on a failed clear. An owner whose widgetBase frame is missing or has `placement: "removed"` counts as gone and its records are pruned by a release; overlapping releases of the same owner prune the state record even if the runtime record is already gone.

### `widgetTopN/error`

Payload:

```js
{
  ownerVisId?: string,
  errorCode: string,
  errorMessage: string,
  operation: string
}
```

Records module-level or per-owner error state. Foreign error propagation happens by dispatch result or terminal `widgetVis/topNResolved` payload only.

## 7. Helper Claim Contract

Helper claim is owned by `widgetTopN` and uses launchpad only for read-only candidate discovery:

1. Determine the owner visualization tab id from the owner frame/public frame snapshot or request context.
2. Call `_KDB.api.launchpad.dispatch({ type:"launchpad/readSlotWidgets", payload:{ padKey:"topN", tabId, mode:"all" } })`.
3. Reuse the current `helperWidgetId` when it is still present in the same-tab `topN` list and the TopN-owned state/runtime/DOM mirror confirm the same `ownerVisId`.
4. Otherwise select the first free widget id from the same-tab `topN` list. A candidate is free when no current `widgetTopN.byOwner[*]` record claims it and its TopN-owned DOM mirror is absent or already matches this owner.
5. Generate a unique `claimToken`, write the pending claim to `widgetTopN` owned state/runtime, and mirror it on the helper shell using TopN-owned attributes such as `data-connected-vis-widget-id` and `data-kdb-topn-claim-token`.
6. Wait 50ms, then re-read `widgetTopN` state/runtime and the DOM mirror. The claim succeeds only if `ownerVisId`, `helperWidgetId` and `claimToken` still match in all three places.
7. If confirmation fails, clear only this operation's stale mirror when the token still matches, retry with the next free same-tab `topN` candidate, and return `noHelperAvailable` when no candidate can be confirmed.
8. `widgetTopN` stores only serializable claim metadata in state (`helperWidgetId`, `claimToken`) and runtime coordination in `_KDB.runtime.widgetTopN`; it never stores DOM refs.

Selection policy:

- Reuse the current `helperWidgetId` when it still validates for the same `ownerVisId`.
- Otherwise select the first confirmable helper for the owner's tab from the `topN` pad using the launchpad ordered id list.
- No fallback to `dataTables` or arbitrary datatable candidates is part of this contract. If no same-tab `topN` helper is available, return `noHelperAvailable`.
- A helper claimed by a different owner is unavailable.
- Orphaned TopN claims may be released by `widgetTopN` only after the owning visible frame is confirmed missing or removed through public state/API evidence; cleanup removes only TopN-owned claim state/runtime and TopN-owned DOM mirror attributes.

## 8. Binding Pipeline Usage

`widgetBindingPlan.md`, `widgetBindingApply.md` and `tableDataService.md` are canonical. `widgetTopN` must not invent parallel plan, apply or row-read shapes.

### 8.1 Helper-target normalization

`widgetTopN` does not pass the visible-widget chart spec unchanged to the helper plan. It builds a helper-normalized `dataConfig` before calling `widgetBindingPlan.buildPlan`.

#### 8.1.1 Minimal helper config (`topNHelper.js`)

This tranche uses a narrow helper-only binding snapshot declared in `KDB3/js/core/config/visualizations/topNHelper.js`. Helper planning must not clone the visible `dataConfig` or reuse generic `List` `bindingSpecs` (`slotComposition`, broad `widgetFilter`, `kennzahlDefaults`).

Helper `visTypeConfig` is helper-only:

- Single active slot: `grid_cols`.
- `grid_cols` semantics: `[dimension.topNItemId, valueColumnId]` where `valueColumnId` uses the `[replaceKennzahlName]` placeholder resolved by the generic slot planner from `dataConfig.kennzahlCode`. Jahr and Monat are includes only, never slot columns.
- No `Monat` column, no visible-dimension `itemId`/tooltip column, no generic `List` `slotComposition`, no `kennzahlDefaults` on helper `dataConfig`.
- `dimensionSelectionAffects` uses a non-slot sentinel (`disabled`) so the generic planner does not prepend visible dimensions into `grid_cols`.
- Helper dimension filters use `topNItemId` with exclude defaults `Gesamt`, `ALLE`, `^` (or dimension-specific exclude values when supplied on the visible dimension config).
- Helper `widgetFilter` carries: (1) `AggregationstypId: { include: ["Stichtag"] }` (not `Monatsdurchschnitt`; not visible-vis `kennzahlDefaults`); (2) Jahr include on `jahrColumnId` `[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]` when the period pin has a year caption; (3) Monat include on `[Personal_KDB_TM1].[Monat_flach].[Monat_flach].[Monat]` when the period pin has a mapped TM1 display caption (`JUL`, never `"07"`). Period pin is leftover List vis-title `NewestStichtag` via `tableData.reloadTable` (`contracts/_archive/widgetTopN-newestStichtag-contractdelta.md`). No year-table fallback.
- `extractTopNResult` still reads `excludeItemId` from the original visible `request.dataConfig.dataTableConfig.dimensions[dimension].exclude.itemId`; helper `dataConfig` does not replace that extraction source.
- Helper `BindingPlanSpec.hierarchySnapshot` is the planner-ready snapshot supplied by `widgetVis`; `widgetBindingPlan` may use it for the Dienststelle local filter, but must not inject the hierarchy item as an extra `topNHelper` slot column.
- `topBottom` / `topcount` apply behavior is represented as helper slot plan material and consumed by `widgetBindingApply`; `widgetTopN` still owns only orchestration/read/extract/cleanup timing.

`widgetBindingApply` applies the Cognos `topcount`; `widgetTopN` does not call Cognos TopBottom APIs directly.

Rules:

- `targetKind` is always `"topNHelper"`.
- `widgetId` is the helper widget id; `ownerWidgetId` is the visible widget id.
- `helperTableResult` is always `null` for helper-target plans. Helper results are produced after `tableDataService.reloadTable([{ widgetId: helperWidgetId }])` and later consumed by the visible-widget `targetKind:"vis"` plan inside `widgetVis`.
- `dataConfig.visualizationType` / `cognosVisualizationTypeId` / `visTypeConfig` are normalized to the explicit TopN helper config in `KDB3/js/core/config/visualizations/topNHelper.js` (Cognos vis type remains `List`), not the visible chart config and not generic `List` `bindingSpecs`.
- The canonical helper config source is `topNHelper.js` plus the visible request's metric/table/dimension identity (`kennzahlCode`, `kennzahlenTable`, `datasourceId`, selected dimension `topNItemId` / exclude values). `widgetVis` validates availability via `config.topNHelperConfig` (formerly `helperListConfig`) before dispatch; it must not attach generic `List` `visTypeConfig`/`slotComposition`.
- `dataConfig.topN` keeps the requested TopN value for helper planning. Per `widgetBindingPlan` caller mapping, `targetKind:"topNHelper"` interprets count-style TopN as helper query/slot intent and must not require `helperTableResult`.
- `topNChoice` and `dataConfig.topN` must match after default/value normalization.
- `hierarchySnapshot` is passed through from `widgetVis` on helper-target plans (see §8.1.1).

Helper-target `BindingPlanSpec`:

```js
{
  reason: "topN",
  targetKind: "topNHelper",
  widgetId: helperWidgetId,
  ownerWidgetId: ownerVisId,
  opSeq: opSeq,
  dataConfig: helperDataConfig,
  hierarchySnapshot: hierarchySnapshot,
  helperTableResult: null,
  resetIntent: {
    enabled: true,
    scope: "helperTarget",
    clearAllSlots: true,
    clearAllLocalFilters: true,
    reason: "topNHelperPreApply"
  },
  emptyIntent: { enabled: false, reason: null, itemId: null, value: null },
  config: config
}
```

### 8.2 Helper apply/read options

Helper `applyBinding` options:

```js
{
  target: {
    widgetId: helperWidgetId,
    targetKind: "topNHelper",
    ownerWidgetId: ownerVisId,
    opSeq: opSeq,
    reason: plan.reason
  },
  signal: abortController.signal,
  previousManagedFilterItemIds: helperManagedFilterItemIds,
  timeoutProfile: "helper"
}
```

Helper row read input:

```js
[{
  widgetId: helperWidgetId,
  shape: "row",
  pick: ["display", "use", "d", "u", "value", "v", "label", "caption"]
}]
```

`tableDataService` owns the Cognos table/list row read and cache state. `widgetTopN` owns interpreting the returned rows and extracting TopN values.

Abort/timeout rules:

- `status:"aborted"` from apply/read is expected supersession. It writes no error and dispatches no terminal result for that stale operation.
- `status:"timeout"` from helper apply maps to `WIDGET_TOPN_HELPER_APPLY_TIMEOUT`; tableData read failures/timeouts map to `WIDGET_TOPN_FLAT_DATA_FAILED` / `WIDGET_TOPN_FLAT_DATA_TIMEOUT` when the `opSeq` is still current.
- `mirrorPatch` from helper apply is not used as a settings commit. At most, it is runtime diagnostic material.

### 8.3 Helper cleanup plan

`widgetTopN` cleanup uses the same `buildPlan -> applyBinding` path. There is no separate `widgetBindingApply` cleanup method.

Cleanup `BindingPlanSpec`:

```js
{
  reason: "cleanup",
  targetKind: "topNHelper",
  widgetId: helperWidgetId,
  ownerWidgetId: ownerVisId,
  opSeq: opSeq,
  dataConfig: helperDataConfig,
  hierarchySnapshot: null,
  helperTableResult: null,
  resetIntent: {
    enabled: true,
    scope: "helperTarget",
    clearAllSlots: true,
    clearAllLocalFilters: true,
    reason: "postResolution"
  },
  emptyIntent: {
    enabled: false,
    reason: null,
    itemId: null,
    value: null
  },
  config: config
}
```

Cleanup apply options are the same helper target options as normal helper apply, with `previousManagedFilterItemIds` read from `_KDB.runtime.widgetTopN.byOwner[ownerVisId].helperManagedFilterItemIds`.

Cleanup semantics:

- The cleanup plan is a technical reset, not intentional emptying. It clears helper slots and local filters through `resetIntent`; it does not add an `emptyData/forceEmpty` filter.
- Post-resolution cleanup runs after every successful helper apply for a non-default resolution, including read/extraction error paths after that apply, unless inspection mode explicitly preserves the helper for debugging. It is best-effort after the terminal result and must never dispatch a second `widgetVis/topNResolved`.
- Helper reuse relies on the `reason:"topN"` pre-apply reset instead of a separate pre-read cleanup apply.
- Cleanup does not request a slot rebuild and does not directly clear slots; `widgetBindingPlan` owns `reason:"cleanup"` slot policy.
- After cleanup success, runtime `helperManagedFilterItemIds` becomes `plan.managedFilterItemIds` for the cleanup plan, which is `[]` for reset-only helper cleanup.
- `lastHelperPlan` is cleared after cleanup unless kept only as non-authoritative diagnostics.
- Cleanup failure maps to `WIDGET_TOPN_CLEANUP_FAILED`; it must not destroy the helper or write foreign state.

### 8.4 Parameter-set restore

During parameter-set restore, the TopN chain (claim → helper apply → `renderWidget` → `tableData.reloadTable` → result read) runs inside the widgetVis `awaiting_topN` gate of writeback step 27 (`bindingPrerequisiteTimeoutMs`, 5000 ms, same gate as at startup). Writeback shows the owner's tab before binding it (`writeback-step27-bindPerActiveTab-contractdelta.md`), so the helper query runs on the active page, as at startup. Binding while the tab was inactive let the helper poll end in `DATAQUERY_WAIT_TIMEOUT` after the gate had expired (2026-10-06; "Cognos does not run the helper query on an inactive page" is inferred). `widgetTopN` itself is unchanged: no restore-specific action, budget or claim rule.

## 9. Result Extraction

`widgetTopN` owns extraction from the rows returned by `tableDataService`.

Inputs:

- helper rows returned by `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId }])`
- `dataConfig.dimension`
- `dataConfig.topN`
- `dataConfig.dataTableConfig.dimensions[dimension].exclude.itemId`
- parsed TopN count from `topNOptions` / `widgetBindingPlan` parsing rules

Rules:

- `excludeItemId` is resolved from the selected dimension config's `exclude.itemId`.
- Result value column defaults to `colKeys[1]` when present, otherwise `colKeys[0]`. For tableData row objects without `colKeys`, use `Object.keys(row)[1]` with fallback to `keys[0]`.
- Cell objects from `tableData` are unpacked to scalars with priority: `d`, `display`, `use`, `value`, `u`, `v`, `label`, `caption`.
- Values are string-normalized, empty values are skipped, and the first `n` values are returned for count-style TopN.
- Column labels `superuser` and `dbversion` are stale placeholder guards and must produce `WIDGET_TOPN_RESULT_STALE_HELPER`.
- If flat data succeeds but no values are extracted, the terminal status is `error` with `WIDGET_TOPN_RESULT_EMPTY`.
- Hierarchy rewrite affects helper filtering through `hierarchySnapshot` / plan descriptors. It does not directly produce terminal result values.

Terminal success payload:

```js
{
  ownerVisId: ownerVisId,
  opSeq: opSeq,
  status: "success",
  resultValues: ["..."],
  excludeItemId: "<dimension exclude item id>",
  errorCode: null,
  errorMessage: null
}
```

`widgetVis` maps this terminal payload to `helperTableResult`:

```js
{
  ok: true,
  applied: true,
  topNResultValues: resultValues,
  topNExcludeItemId: excludeItemId,
  error: null
}
```

## 10. Readers / Writers

Published selectors from `dashboard/widgets/widgetTopN/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetTopNState(_KDB)` | `_KDB.state.widgets.topN` | Cloned topN subtree or `undefined`. |
| `readTopNResolution(_KDB, ownerVisId)` | `byOwner[ownerVisId]` | Cloned per-owner resolution or `undefined`. |
| `readTopNHelperWidgetId(_KDB, ownerVisId)` | `byOwner[ownerVisId].helperWidgetId` | Helper id or `null`. |
| `readTopNStatus(_KDB, ownerVisId)` | `byOwner[ownerVisId].resolutionStatus` | Status string or `undefined`. |
| `readOwnerState(_KDB, ownerVisId)` | `byOwner[ownerVisId]` | Copy of ONE owner record (no clone of the other owners); `undefined` for a missing owner and after destroy. Used by `widgetVis/topN/gate.js`. |

Internal reducer actions:

| Action type | Purpose |
|---|---|
| `widgetTopN/mountStarted` | Initialize module state/runtime and set lifecycle `initializing`. |
| `widgetTopN/mountSucceeded` | Set module lifecycle `ready`. |
| `widgetTopN/markPending` | Set `resolutionStatus:"pending"` and pending `opSeq`. |
| `widgetTopN/helperClaimed` | Store helper id on owned state. |
| `widgetTopN/resolutionSucceeded` | Store result values/exclude item and clear pending/error. |
| `widgetTopN/noHelperAvailable` | Store no-helper status and clear helper/result fields. |
| `widgetTopN/errorRecorded` | Store owned error status/details. |
| `widgetTopN/cleanupSucceeded` | Reset one owner resolution record. |
| `widgetTopN/destroy` | Mark module disposed after runtime cleanup. |

Reducers are pure and perform no DOM, Cognos, history, event or foreign-state effects.

## 11. Events

`widgetTopN` emits no fact-events and subscribes to no event-bus events in this tranche.

Known-owner communication uses direct dispatch:

- `widgetVis -> widgetTopN`: `widgetTopN/resolveRequested`.
- `widgetTopN -> widgetVis`: `widgetVis/topNResolved`.
- `widgetTopN -> launchpad`: `launchpad/readSlotWidgets` for read-only same-tab `topN` helper id discovery.
- `widgetTopN -> widgetBase`: frame/tab reads when needed through public state/API evidence only; no helper role/owner claim action is required.

No `events/` folder; communication is direct dispatch only.

## 12. Dependencies

- `_KDB` as injected boundary input.
- `_KDB.api.widgetVis.dispatch` for terminal `topNResolved`.
- `_KDB.api.launchpad.dispatch({ type:"launchpad/readSlotWidgets", payload })` for read-only same-tab `topN` helper id discovery.
- `_KDB.api.widgetBase.getState()` or published widgetBase selectors when needed to resolve the owner visualization `tabId` or confirm owner frame existence. `widgetTopN` must not read `_KDB.runtime.widgetBase`.
- `_KDB.services.widgetBindingPlan.buildPlan`.
- `_KDB.services.widgetBindingApply.applyBinding`.
- `_KDB.services.tableData.reloadTable`.
- `widgetTopN` selectors for cross-module reads.

Deep files receive dependencies through AMD imports and controller options. They do not discover `_KDB` through `window`.

## 13. Cognos Touchpoints

| Touchpoint | Context | Owner |
|---|---|---|
| Helper datasource/vis type/slots/local filters/render | Through `widgetBindingApply.applyBinding` with `targetKind:"topNHelper"`. | `widgetBindingApply` owns Cognos mutation; `widgetTopN` owns caller state. |
| Helper row read | Through `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId }])`. | `tableDataService` owns Cognos table/list row read and cache; `widgetTopN` owns value extraction. |
| Helper widget identity/placement | Helper ids are discovered through `launchpad/readSlotWidgets`; helper placement remains a `widgetBase` concern outside the claim. | `launchpad` owns ordered id discovery; `widgetTopN` owns claim state/token; `widgetBase` owns movement if movement is requested separately. |

TopN helper rows use `tableDataService.reloadTable([{ widgetId: helperWidgetId }])`; `widgetBindingApply` owns helper apply/render only.

Forbidden:

- Direct calls to `_KDB.cognosAPI.widgets.*` from `widgetTopN`.
- Direct DOM lookup of helper tables, launchpad pads or canvas shells.
- Direct shell movement or helper destruction.
- Calling `widgetDataTable/validateClaimable`, `widgetDataTable/releaseClaim` or a `widgetBase` helper-role action for TopN claim.

## 14. DOM Boundaries

`widgetTopN` has no UI and owns no persistent DOM. It may perform exact-id helper-shell access only for its TopN claim mirror attributes.

Allowed:

- Passing helper/owner widget ids to services and public dispatch calls.
- Resolving a helper shell by exact `widgetId` only to write, confirm or clear TopN-owned claim mirror attributes (`data-connected-vis-widget-id`, `data-kdb-topn-claim-token`). The DOM node is scoped local to that effect and is never stored in state or runtime.
- Recorded exception (as built, not yet re-homed to `widgetBase`): `helperPlacement.js` (`appendHelperAfterOwner`, `restoreHelperPlacement`) moves the helper shell itself, beside the owner shell for the helper apply/read and back into its own `topN` launchpad slot afterwards (slot resolved by its pad/page attributes). Runtime keeps only the serializable lease `byOwner[ownerVisId].helperPlacement = { helperWidgetId, opSeq, slot }`; only the latest leasing op restores.

Forbidden:

- Launchpad slot scans, helper-table DOM scans, canvas shell movement, broad `document.querySelector` discovery or global `$`.
- Storing DOM refs in `_KDB.state` or `_KDB.runtime.widgetTopN`.
- Showing no-helper/error UI directly.

## 15. History Behaviour

`widgetTopN` owns no history keys and never calls `_KDB.services.history`.

| Action | History |
|---|---|
| `resolveRequested` | No TopN history. `widgetSettings` owns `topNChoice` history after `widgetVis` confirms the visible-widget apply. |
| `cleanup` | No TopN history. Caller owner decides whether its own action is history-tracked. |
| terminal `topNResolved` | No history. `widgetVis` uses it as derived input to the visible binding pipeline. |

History replay re-enters through `widgetSettings` / `widgetVis` normal dispatch paths; `widgetTopN` only honors `isHistoryReplay` to avoid duplicate UI or history side effects, which it does not own anyway.

## 16. Error Taxonomy

| Code | Meaning |
|---|---|
| `WIDGET_TOPN_MOUNT_FAILED` | Module mount failed. |
| `WIDGET_TOPN_OWNER_ID_CONFLICT` | Envelope owner id conflicts with payload `ownerVisId`. |
| `WIDGET_TOPN_INVALID_REQUEST` | Missing or invalid request payload. |
| `WIDGET_TOPN_UNAVAILABLE_DEPENDENCY` | Required public API/service is missing. |
| `WIDGET_TOPN_NO_HELPER_AVAILABLE` | No claimable helper exists for the owner/tab. |
| `WIDGET_TOPN_HELPER_CLAIM_FAILED` | Helper validation or frame claim failed. |
| `WIDGET_TOPN_HELPER_PLAN_FAILED` | Helper-target `BindingPlanSpec` failed planning. |
| `WIDGET_TOPN_HELPER_APPLY_FAILED` | Helper `applyBinding` returned `error`. |
| `WIDGET_TOPN_HELPER_APPLY_TIMEOUT` | Helper apply/render timed out. |
| `WIDGET_TOPN_FLAT_DATA_FAILED` | Helper row read through `tableDataService` failed. |
| `WIDGET_TOPN_FLAT_DATA_TIMEOUT` | Helper row read through `tableDataService` timed out. |
| `WIDGET_TOPN_RESULT_EMPTY` | Helper read succeeded but no usable TopN values were extracted. |
| `WIDGET_TOPN_RESULT_STALE_HELPER` | Helper read returned stale placeholder labels such as `superuser` or `dbversion`. |
| `WIDGET_TOPN_EXCLUDE_ITEM_MISSING` | Selected dimension has no configured TopN exclude item id. |
| `WIDGET_TOPN_CLEANUP_FAILED` | Helper cleanup failed. |
| `WIDGET_TOPN_STALE_OPERATION` | Operation was superseded by a newer `opSeq`; normally returned, not stored as error. |
| `WIDGET_TOPN_DESTROY_FAILED` | Destroy cleanup boundary caught an error. |

Errors are logged once at the boundary with operation context and converted to owned state, dispatch result and/or terminal payload. Foreign state is never written on error.

## 17. Supersession

Each owner resolution gets an `opSeq` from the `widgetVis` envelope in the normal settings flow, or from `_KDB.runtime.widgetTopN.byOwner[ownerVisId].opSeq` only when no envelope `opSeq` is supplied. Async effects capture the current value and check it after every awaited boundary.

Rules:

- New same-owner `resolveRequested` supersedes old same-owner work.
- When `widgetVis` supplies an `opSeq`, `widgetTopN` stores and echoes exactly that value. It must not increment again.
- Superseded work aborts where possible and returns `{ ok:false, stale:true }`.
- Superseded work writes no state, does not cleanup a newer helper plan and dispatches no terminal result.
- Current timeout/error work dispatches exactly one terminal `status:"error"` payload.
- `widgetVis` independently ignores stale terminal results by `opSeq`.

## 18. Folder Layout

As built (13 files, exports per file). `__orchestratorWidgetTopN.js` is a shim over `index.js` (controller, dispatch table, `registerWidgetTopN`).

```txt
dashboard/widgets/widgetTopN/
  __orchestratorWidgetTopN.js                         shim over index.js (path kept for KDB.js)
  cleanup.js                                          handleCleanup, startPostResolutionCleanup
  config.js                                           TOPN_PAD_KEY, PAD_ATTR, CLAIM_OWNER_ATTR, CLAIM_TOKEN_ATTR, NOTE_EDITABLE_SELECTOR, CLAIM_CONFIRM_MS, CLEANUP_KEY_PREFIX, ...
  extractTopNResult.js                                extractTopNResult
  helperBinding.js                                    readBindingServices, runHelperBinding, readHelperTableRows, buildHelperApplyOptions, readPlanError, readApplyError
  helperClaim.js                                      claimTopNHelper, releaseTopNClaim, runExclusiveHelperCleanup
  helperPlacement.js                                  appendHelperAfterOwner, restoreHelperPlacement, isHelperOnLoanToOwner, dismissHelperTitleEdit
  helperSpec.js                                       buildTopNSpec, buildCleanupSpec
  index.js                                            registerWidgetTopN
  resolve.js                                          handleResolveRequested
  results.js                                          messageFromError, failure, staleAborted, staleOperation, ownerIdConflict, isAborted, isAbortError, ...
  selectors.js                                        readWidgetTopNState, readOwnerState, readOwnerClaim, isHelperClaimedByOtherOwner
  state.js                                            ACTION_TYPES, createInitialState, reduceWidgetTopN, validateAction, validateResolveRequest, validateCleanupRequest, isDefaultTopN, ...
```

No `view/`, `events/` or `lifecycle/` folder. The helper claim DOM mirror lives in `helperClaim.js` (with `helperPlacement.js` for DOM placement), not a view layer.

## 19. Bootstrap And Integration

Required registration:

- Import and call `__orchestratorWidgetTopN` from the widget-domain bootstrap point after `launchpad`, `widgetBase`, `widgetBindingPlan`, `widgetBindingApply` and `widgetVis` are registered.
- Register `_KDB.api.widgetTopN`.
- Mount after dependencies are available; `mount()` itself does not claim helpers.
- Destroy before `widgetBase` / `launchpad` if possible so owned helper claim mirrors can be cleared while helper shells and launchpad ids still resolve.

Hard implementation prerequisites:

- `widgetBindingPlan` and `widgetBindingApply` registered with the schemas in their contracts.
- `widgetVis` accepts `widgetVis/topNResolved` exactly as contracted.
- `launchpad` exposes `launchpad/readSlotWidgets` for same-tab `topN` helper discovery or CP-2 must stop at the integration gap.
- `widgetBase` exposes enough public frame/tab read evidence to resolve the owner visualization tab id or CP-2 must stop at the integration gap.

## 20. Out Of Scope

- Editing `.cursor/rules/`, templates, authority docs or legacy trees.
- Applying terminal result values to the visible widget; owner: `widgetVis`.
- Storing or committing `topNChoice`; owner: `widgetSettings`.
- Helper frame movement/placement writes; owner: `widgetBase` (the temporary helper-shell move in `helperPlacement.js` is the §14 recorded exception; it writes no frame state).
- Populating/classifying the same-tab `topN` launchpad helper pool. TopN helper claim in this tranche trusts that pad as pre-arranged helper inventory.
- Cognos apply/read internals; owner: `widgetBindingApply`.
- Binding schema changes; owner: `widgetBindingPlan`.
- TopN UI/no-helper surfacing; owner: `widgetVis` / settings UI.
- Cross-module integration tests.
- KDB.js bootstrap wiring in this CP-1 step.

## 21. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ mount, destroy, dispatch, getState }`.
2. Action payloads for `resolveRequested`, `cleanup` and `error` are fully specified.
3. `_KDB.state.widgets.topN` is the only state subtree written by `widgetTopN`.
4. `_KDB.runtime.widgetTopN` owns `opSeq`, AbortControllers, pending promises, helper managed-filter runtime and cleanup.
5. `widgetTopN` never writes `widgetVis`, `widgetSettings`, `widgetBase`, `widgetDataTable`, launchpad, tableData or history state.
6. Helper claim/release is owned by `widgetTopN`: launchpad supplies ordered ids, `widgetTopN` writes claim state/token and DOM mirror, and neither `widgetDataTable` nor a `widgetBase` helper-role action is required.
7. Binding pipeline usage uses canonical `BindingPlanSpec`, `BindingPlan`, `ApplyBindingOptions`, and `ApplyBindingResult`.
8. Helper-target planning uses helper-normalized `dataConfig`, not the visible chart config unchanged.
9. TopN extraction is owned by `widgetTopN`; helper row reading itself is owned by `tableDataService`.
10. Helper row reads use `tableDataService.reloadTable([{ widgetId: helperWidgetId }])`.
11. Every non-stale resolution produces exactly one terminal `widgetVis/topNResolved` payload.
12. `noHelperAvailable` is reported as a terminal status; `widgetTopN` shows no UI.
13. Normal `widgetVis` calls supply `opSeq`; `widgetTopN` adopts/echoes it and increments only for calls without envelope `opSeq`.
14. Supersession uses `opSeq` plus `AbortController`; stale work writes no state and dispatches no terminal result.
15. Post-resolution helper cleanup runs after every non-default operation where helper apply succeeded, including read/extraction error paths after helper apply success, unless inspection mode is enabled.
16. Helper cleanup uses `buildPlan -> applyBinding` with `reason:"cleanup"` and `resetIntent.enabled === true`; no extra cleanup API is invented.
17. Helper cleanup never dispatches a second terminal `widgetVis/topNResolved`.
18. Helper cleanup does not destroy helpers and releases the TopN-owned claim only for explicit release triggers.
19. No events, launchpad DOM scans, helper-table DOM scans or history commits are introduced.
20. Production files use AMD full-compact form and pass lints when implemented.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub` | Planner (Claude Opus 4.8) | Initial outline from widgets-domain blueprint. |
| 2026-06-07 | `Stub -> Draft CP-1` | `<pending>` | Full composed-port contract expanded: direct vis/topN dispatch, helper claim orchestration, binding-plan/apply/read usage, terminal-result guarantee, `opSeq` supersession and helper cleanup/release rules. |
| 2026-06-14 | `Draft CP-1 read boundary refinement` | GPT-5.5 | TopN helper reads use `readHelperTableRows` with full `tableData.reloadTable` pick array; extraction unpacks tableData cell objects. |
| 2026-09-01 | Parent sync NewestStichtag period pin | Implementing captain (Grok 4.6); PO product lock | §8.1.1: last month of selected Jahr; `grid_cols` two slots; Monat include beside Jahr. `resolveRequested` names `jahrFilterValue` + `monatFilterValue`. Delta: `contracts/_archive/widgetTopN-newestStichtag-contractdelta.md`. |
| 2026-10-06 | Parent sync restore note | Cursor coordinator; PO live | §8.4: restore runs the TopN chain on the shown tab (writeback step 27 per tab). No `widgetTopN` change. Delta: `contracts/writeback-step27-bindPerActiveTab-contractdelta.md`. |
| 2026-10-16 | Parent sync helper restore | Cursor Phase 0 worker; PO decision (restore helper) | §14/§20: record that `placeHelperAfterOwner.js` moves the helper shell (beside owner, then back to its `topN` slot) with a runtime placement lease. No API change. |

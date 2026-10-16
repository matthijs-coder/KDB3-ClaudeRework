# Service Contract: `widgetBindingApply`

> Full CP-1 contract for the shared Cognos binding-apply service in the widgets composed-port path. Design authority lives in `_____________KDB3API/architecture/_archive/widgets-domain-blueprint.md`; this contract expands the original stub with the §12 execution-readiness details.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetBindingApply`
**Type:** `shared service`
**Authoring AI:** GPT-5.5, 2026-06-07
**Reviewed by:** `<pending CP-1 approval>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetBindingApply` is a new shared service assembled from the REDESIGN2 declarative apply path plus the widgets-domain blueprint. It is not a 1-to-1 port of a legacy module.

Target production path:

```txt
_____________KDB3API/KDB3/js/core/services/widgetBindingApply/
```

The service applies an already-built binding plan to a Cognos widget target: datasource, visualization type, slots, local filters, render and render-wait. It has no product ownership, no canonical widget state, no history ownership and no DOM ownership.

No production behavior code may be generated until this CP-1 contract is approved. The execution spec in `widgetBindingApply-port-execution-spec.md` is a handoff document, not approval to code.

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `architecture/_archive/widgets-domain-blueprint.md` | Authority for shared-service boundary, no `_KDB.state.widgets` writes, named-method public API, write-after-apply discipline and §12 detail requirements. |
| `contracts/widgetBindingPlan.md` | Schema authority for `BindingPlan`; `widgetBindingApply` consumes its output and must not rebuild domain decisions. |
| `contracts/widgetVis.md` | Visible-widget consumer; expects `applyBinding(plan, { target: { widgetId, targetKind:"vis" }, signal, timeoutProfile:"vis" })`. |
| `contracts/widgetTopN.md` / `widgetDataTable.md` | Helper-table consumer path; topN configures a datatable/List helper through this service and reads helper rows through `tableDataService`. |
| `architecture/_archive/widgets-legacy-survey-redesign2.md` RUN 4 | Legacy apply order, plan fields, slot/filter/render touchpoints, post-success writebacks, supersession checks, rollback and diagnostics. |
| Read-only legacy investigation report | Confirms `applyBindingPlan` as the authoritative apply path and `applyLiveWidgetSlots`/`applyLiveWidgetLocalFilters` as superseded imperative twins. |

Deliberate deltas versus legacy:

- The service never calls legacy-style `mergeSettings`, `setLastConfirmedBindingPlan`, lifecycle/error writers, or managed-filter state writers under `_KDB.state.widgets`.
- Legacy inline rollback/replay of `lastConfirmedBindingPlan` moves to the caller. This service is non-transactional and reports enough diagnostics for the caller to decide whether to re-apply a last-known-good plan.
- Legacy `mySeq` supersession is represented by the caller-owned `AbortSignal` plus optional `opSeq` metadata in `target`; superseded work maps to `status: "aborted"` when the signal is aborted before completion.
- Legacy imperative twins (`applyLiveWidgetSlots`, `applyLiveWidgetLocalFilters`) are not ported as public paths. Slot and filter apply is declarative plan-driven only.
- Legacy post-success title/list-summary writebacks are not part of this service. Title and cosmetic post-render cleanup belong to `widgetVis`; helper-summary suppression belongs to the caller or a future focused contract delta if needed.
- Legacy datasource-before-clear order is preserved where relevant because REDESIGN2 used a second datasource set after slot/filter clear; the simplified stub order is refined below.
- Previous managed-filter ids are caller runtime, not plan output. `widgetVis` passes `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds` through `ApplyBindingOptions.previousManagedFilterItemIds`.

## 2. Purpose

`widgetBindingApply` applies a declarative binding plan to a target Cognos widget and reports the confirmed or failed apply result. It is target-parametrized so both the visible visualization widget and the TopN helper/List widget can use one apply/render surface.

The service is a technical effect boundary. It does not decide widget lifecycle, settings commit, history, TopN fallback, launchpad routing, title text, drillthrough or UI errors.

Non-ownership statement: `widgetBindingApply` does not own table/list row reads for TopN helper widgets. `widgetTopN` reads helper rows through `_KDB.services.tableData.reloadTable([{ widgetId: helperWidgetId }])` and owns TopN value extraction.

## 3. Ownership

State ownership:

- Owns no `_KDB.state` subtree.
- Writes no `_KDB.state.widgets.*`, `_KDB.state.history`, `_KDB.state.tableData`, filter state, launchpad state or service-owned lifecycle state.
- Returns `mirrorPatch` from the plan as caller-owned commit material only.

Runtime ownership:

- Owns only service-level runtime buckets needed for service teardown and optional default configuration:

```js
_KDB.runtime.widgetBindingApply = {
  abortControllers: {},
  pendingPromises: {},
  timers: {}
};
```

- Does not own per-widget opSeq. Callers own `_KDB.runtime.widgetVis.byId[widgetId].opSeq` or `_KDB.runtime.widgetTopN.byOwner[ownerVisId].opSeq` and pass `target.opSeq` plus `signal`.
- Does not retain plans, rows or Cognos host objects after a call completes.
- `destroy()` aborts service-owned controllers/timers if any were created by the service, clears pending references and tombstones the service instance through `_isDisposed`.

## 4. Public API

Shared service surface:

```js
_KDB.services.widgetBindingApply = {
  applyBinding: applyBinding,
  destroy: destroy
};
```

Named methods are used because this is a shared service, not a feature module. No `dispatch` or `getState` is exposed.

Method signatures:

| Method | Signature | Contract |
|---|---|---|
| `applyBinding` | `(plan: BindingPlan, options: ApplyBindingOptions) => Promise<ApplyBindingResult>` | Applies datasource/visType/slots/local filters/render to `options.target`; honors `plan.resetIntent` for technical target reset; returns status, caller-owned `mirrorPatch`, and diagnostics. |
| `destroy` | `() => void` | Idempotent service teardown. After destroy, async public methods reject with `new Error("widgetBindingApply disposed")`; sync `destroy()` returns silently on repeat. |

### 4.1 `BindingTarget`

```js
{
  widgetId: string,
  targetKind: "vis" | "topNHelper" | "dataTableHelper",
  ownerWidgetId?: string | null,
  opSeq?: number,
  reason?: string
}
```

Rules:

- `widgetId` is the Cognos widget id to mutate/read.
- `targetKind: "vis"` is the visible visualization widget path.
- `targetKind: "topNHelper"` / `"dataTableHelper"` is a List/datatable helper path used by `widgetTopN`.
- `ownerWidgetId` is required for helper targets when known so diagnostics can correlate helper work back to the visible widget.
- `opSeq` is copied into diagnostics only; the caller remains the authority for stale-result checks.

### 4.2 `ApplyBindingOptions`

```js
{
  target: BindingTarget,
  signal: AbortSignal,
  previousManagedFilterItemIds?: string[],
  timeoutMs?: number,
  timeoutProfile?: "vis" | "helper",
  renderWait?: {
    waitForStart?: boolean,
    waitForComplete?: boolean,
    intervalMs?: number
  }
}
```

Rules:

- `target` and `signal` are required.
- `previousManagedFilterItemIds` is caller-runtime input. For `widgetVis`, the source is `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds`; this service consumes the array for cleanup but does not persist it. For `targetKind:"topNHelper"`, helper reset is driven by `plan.resetIntent` and the per-id remove-managed-filters path is skipped.
- `timeoutMs` overrides `timeoutProfile`.
- Default timeouts are configured in service defaults: `vis: 12000`, `helper: 5000`.
- `renderWait.waitForStart` defaults to `true` for `targetKind:"vis"` and `false` for helper targets unless the caller overrides it.
- `renderWait.waitForComplete` defaults to `true`. When the caller passes `false` (added 2026-07-13 for writeback restore), the service still triggers `renderWidget` but does not arm or await render events: step 12 is reported in `skippedSteps:["waitRenderComplete"]`, `renderWaitMs` is `0` and the apply result is `success`. Callers own render completion themselves — writeback restore binds widgets on inactive tabs where Cognos fires no render events (awaiting them burned the full vis timeout per widget), and the post-restore tab traversal performs the visible render.

## 5. Plan Input Contract Consumed

`widgetBindingApply` consumes, but does not produce, this subset of the `widgetBindingPlan` output:

```js
{
  ok: true,
  status: "success",
  reason: "contentCreate" | "dimension" | "visType" | "topN" | "hierarchy" | "dienststelle" | string,
  targetKind: "vis" | "topNHelper" | "dataTableHelper",
  widgetId: string | null,
  ownerWidgetId: string | null,
  opSeq: number | null,
  datasource: {
    id: string,
    name: string | null
  },
  visualization: {
    visType: string,                    // UI/config key or label, not necessarily the Cognos setType id
    canonicalVisType: string | null,
    cognosVisualizationTypeId: string | null  // preferred Cognos visualization id for setVisType
  },
  slotsChanged: boolean,
  slotsToClear: ["all"] | [],
  slots: [
    {
      slotName: string,
      columnIds: string[],
      sortByColumn?: string | null,
      sortSpecs?: [
        { columnId: string, order: "ascending" | "descending" | string | string[], priority?: number }
      ],
      options?: {
        limit?: number | null,
        keepOnlyFirst?: boolean,
        source?: string
      }
    }
  ],
  localFilters: [
    {
      kind: "widgetFilter" | "kennzahlDefault" | "dimension" | "topN" | "hierarchy" | "emptyData",
      mode: "include" | "exclude" | "reverse" | "contains" | "beginsWith" | "includeExcludeOr" | "hierarchyKeepexclude" | "forceEmpty",
      itemId: string,
      values: string[],
      reason?: string,
      options?: object
    }
  ],
  managedFilterItemIds: string[],
  emptyIntent: {
    enabled: boolean,
    reason: string | null,
    itemId: string | null,
    value: "1" | null
  },
  mirrorPatch: object,
  diagnostics?: object
}
```

If `plan.ok !== true` or `plan.status !== "success"`, `applyBinding` returns `status: "error"` with `errorCode: "WIDGET_BINDING_APPLY_INVALID_PLAN"` and performs no Cognos writes.

## 6. Result Shapes

### 6.1 `ApplyBindingResult`

```js
{
  status: "success" | "timeout" | "error" | "aborted",
  mirrorPatch: object | null,
  diagnostics: {
    service: "widgetBindingApply",
    operation: "applyBinding",
    targetWidgetId: string,
    targetKind: "vis" | "topNHelper" | "dataTableHelper",
    ownerWidgetId: string | null,
    opSeq: number | null,
    reason: string | null,
    completedSteps: string[],
    failedStep: string | null,
    skippedSteps: string[],
    errorCode: string | null,
    errorMessage: string | null,
    emptyMode: "forceEmpty" | null,
    emptyReason: string | null,
    elapsedMs: number,
    renderWaitMs: number,
    timedOut: boolean,
    aborted: boolean,
    warnings: [
      { code: string, message: string, step?: string }
    ],
    cognos: {
      currentVisType?: string | null,
      desiredVisType?: string | null,
      datasourceId?: string | null,
      appliedSlotCount?: number,
      appliedFilterCount?: number
    }
  }
}
```

`mirrorPatch` is copied from `plan.mirrorPatch` only on `status: "success"`; for `timeout`, `error` and `aborted` it is always `null`.

`emptyMode` and `emptyReason` are derived from `plan.emptyIntent` first, falling back to the first `localFilters[]` descriptor with `kind:"emptyData"` and `mode:"forceEmpty"`.

## 7. Apply Step Order

`applyBinding` performs these steps and records each successful step in `diagnostics.completedSteps` using the exact step ids below:

1. `validateInputs` — validate `_KDB`, `plan`, `target`, `signal`, `cognosAPI.widgets`.
2. `readCurrentVisType` — call `getVisType(target.widgetId)` when `plan.visualization` is present.
3. `setDatasourceInitial` — call `setVizDataSource(plan.datasource.id, target.widgetId)`.
4. `setVisType` — call `setVisType(desiredVisType, target.widgetId)` only when current canonical type differs or current type is unknown. `desiredVisType` is the Cognos visualization id: prefer `plan.visualization.cognosVisualizationTypeId` when non-null, then `canonicalVisType`, then `visType` as a final fallback for legacy/standard labels.
5. `clearSlotsAndFilters` — if `plan.slotsChanged === true`, `plan.slotsToClear` contains `"all"`, or `plan.resetIntent.enabled === true` with `clearAllSlots` / `clearAllLocalFilters`, call `clearAllSlots(target.widgetId)` then `clearAllLocalFilters(target.widgetId)`.
6. `setDatasourceAfterClear` — repeat `setVizDataSource(plan.datasource.id, target.widgetId)` after a clear, matching REDESIGN2 behavior.
7. `applySlots` — run only when the plan is rebuilding/resetting slots (`plan.slotsChanged === true`, `slotsToClear` contains `"all"`, or reset intent requests slot/local-filter reset). For filter-only plans where slots are unchanged, record `applySlots` as skipped and do not call `addDataItemsToSlot`. When run, honor `slot.options.limit` / `slot.options.keepOnlyFirst` before applying `columnIds`, call `addDataItemsToSlot(target.widgetId, slotName, effectiveColumnIds)`, then if `slot.options.customLabel` is present call `setCustomLabelInSlot(target.widgetId, slotName, customLabel.columnId, customLabel.label)` (empty label is an apply failure, not a skip), then `sortDataItemInSlot(slotName, columnId, order, target.widgetId, priority)` for each resolved sort spec. Authority: `contracts/_archive/visualization-dimension-custom-label-contractdelta.md`.
8. `removeManagedFilters` — remove previously managed filters only when the caller passes `options.previousManagedFilterItemIds[]` and `targetKind !== "topNHelper"`; otherwise skip and report `skippedSteps:["removeManagedFilters"]`. The service does not read previous ids from the plan and does not persist managed-filter ids itself.
9. `applyLocalFilters` — for each descriptor, build the Cognos local-filter body and call `addOrReplaceLocalFilter(target.widgetId, descriptor.itemId, body)`.
10. `applyTopBottom` — for `targetKind:"topNHelper"` only, apply `SlotPlanItem.options.topBottom` to the helper slot/value item through `setTopBottomOnSlot`; skip for visible targets or plans without topBottom material.
11. `renderWidget` — trigger `renderWidget(target.widgetId)` after render wait subscriptions have been armed (when `renderWait.waitForComplete !== false`; on the deferred path nothing is armed first).
12. `waitRenderComplete` — wait for render completion with timeout; arm `whenRenderStart` when `renderWait.waitForStart === true` and always arm `whenRenderComplete` before calling `renderWidget`, then await the armed promises after the render trigger. When `renderWait.waitForComplete === false` (§4.2), nothing is armed and nothing is awaited: the step is reported in `skippedSteps` and the apply succeeds directly after the render trigger.
13. `buildSuccessResult` — return success result with caller-owned `mirrorPatch`.

A vis plan with `resetIntent.rebuildAfterClear === false` stops after `clearSlotsAndFilters`. Steps 2–4 and 6–12 are recorded as skipped. That flag is set only for `targetKind: "vis"` and `resetIntent.reason: "parameterSetReset"`. Helper plans and `settingsDelete` keep the full order above.

Render-wait subscription order:

- The render phase must establish Cognos render subscriptions before the render trigger: arm `whenRenderStart` when configured, arm `whenRenderComplete`, then call `renderWidget`. Exception: when `renderWait.waitForComplete === false` (§4.2), nothing is armed or awaited — only `renderWidget` is triggered.
- After `renderWidget` returns, await the armed `whenRenderStart` promise first when present, then await the armed `whenRenderComplete` promise.
- The diagnostic step ids remain `renderWidget` for the trigger and `waitRenderComplete` for the awaited render lifecycle; the internal subscription timing must not be represented as a separate public step.

Abort discipline:

- Check `signal.aborted` before step 1 and after every awaited Cognos call.
- If aborted, stop immediately and return `status: "aborted"` with no further Cognos calls and `mirrorPatch: null`.

Timeout discipline:

- The timeout wraps the combined render-wait phase for `applyBinding`. `whenRenderStart` and `whenRenderComplete` share one render-wait budget; do not give each phase a fresh full timeout unless a contract delta explicitly changes this.
- A timeout returns `status: "timeout"` and records `failedStep` as `waitRenderComplete`.
- Timeout does not imply rollback.
- Abort returns `status: "aborted"` and is expected caller-owned supersession, not a binding error.

## 8. Cognos Touchpoints

Required logical Cognos widget-binding surface consumed:

| Wrapper | Used by | Notes |
|---|---|---|
| `getVisType(widgetId)` | `readCurrentVisType` | Used to avoid unnecessary visType writes where possible. |
| `setVizDataSource(datasourceId, widgetId)` | `setDatasourceInitial`, `setDatasourceAfterClear` | Initial and post-clear datasource write. |
| `setVisType(visType, widgetId)` | `setVisType` | Uses the Cognos visualization id, preferring `plan.visualization.cognosVisualizationTypeId`; UI/config labels such as `"Prognose"` must not be passed to Cognos when an id such as `"com.ibm.vis.custom.prognoseyearlinechart"` is available. |
| `clearAllSlots(widgetId)` | `clearSlotsAndFilters` | Conditional on `slotsChanged`. |
| `clearAllLocalFilters(widgetId)` | `clearSlotsAndFilters` | Conditional on `slotsChanged`; full reset before rebuild. |
| `addDataItemsToSlot(widgetId, slotName, columnIds)` | `applySlots` | Plan-driven only; skipped for filter-only updates where slots are unchanged. |
| `setCustomLabelInSlot(widgetId, slotName, columnId, label)` | `applySlots` | After add, when `slot.options.customLabel` is present. Facet order `(widgetId, …)`. Empty label fails. |
| `sortDataItemInSlot(slotName, columnId, order, widgetId, priority)` | `applySlots` | Supports `sortSpecs[]` and legacy single `sortByColumn` converted by plan or effect helper. |
| `setTopBottomOnSlot(widgetId, slotName, topBottom)` | `applyTopBottom` | Applies Cognos `topcount` for TopN helper List widgets to the planned metric/value item. |
| `removeLocalFilter(widgetId, itemId)` | `removeManagedFilters` | Only for caller-supplied previous managed ids. |
| `buildKeepexcludeConditionsFilterObj(values, options)` | `applyLocalFilters` | Used for exclude / include-exclude-or bodies. |
| `addOrReplaceLocalFilter(widgetId, itemId, body)` | `applyLocalFilters` | Body built from descriptor. |
| `renderWidget(widgetId)` | `renderWidget` | Triggers render. |
| `whenRenderStart(widgetId, options)` | `waitRenderComplete` | Optional wait-for-start. |
| `whenRenderComplete(widgetId, options)` | `waitRenderComplete` | Timeout-raced render completion. |

Namespace placement decision for CP-2:

- The table above defines the **logical capability names** consumed by `widgetBindingApply`, not a requirement that every wrapper already live under `_KDB.cognosAPI.widgets`.
- Current production may provide some capabilities under existing thematic namespaces such as `_KDB.cognosAPI.visualization`, `_KDB.cognosAPI.async` or `_KDB.cognosAPI.dataQuery`. `widgetBindingApply` may consume those existing wrappers through a focused internal adapter/facade as long as the public service contract and diagnostics stay unchanged.
- Missing slot/filter capabilities must be ported as thin Cognos wrappers or exposed through the same internal adapter/facade before the affected apply step is accepted. Do not move product state, history, rollback or widget ownership into this adapter.

Explicitly not consumed here: title writes, summary suppression, focus/maximize, drillthrough, layout movement, launchpad DOM movement, tableData service reads.

## 9. Filter Body Translation

Filter descriptors are translated during apply because the translator uses Cognos wrapper helpers.

| Descriptor mode | Cognos body |
|---|---|
| `include` | `{ values: descriptor.values || [] }` |
| `reverse` | `{ values: descriptor.values || [], reverse: true }` when supported by wrapper; otherwise same values body and warning `WIDGET_BINDING_APPLY_REVERSE_FILTER_BODY_COMPAT`. |
| `exclude` | `buildKeepexcludeConditionsFilterObj(descriptor.values, { exclude: true, ...descriptor.options })` |
| `contains` | Cognos condition body for "contains" matching, with the searched value(s) from `descriptor.values`; exact wrapper shape is implemented only when the Cognos local-filter wrapper supports it. |
| `beginsWith` | Cognos condition body for "begins with" matching, with the searched value(s) from `descriptor.values`; exact wrapper shape is implemented only when the Cognos local-filter wrapper supports it. |
| `includeExcludeOr` | OR condition body built from `descriptor.options.includeValues` / `excludeValues`; uses `buildKeepexcludeConditionsFilterObj` where required. |
| `hierarchyKeepexclude` | `{ exclude: false, values, overrideHierarchyDefaultSelection: true, action: "keepexclude" }` |
| `forceEmpty` | Intentional-empty filter: apply an include filter where `descriptor.itemId` is a datasource-wide stop-filter item and `descriptor.values` is usually `["1"]`, while the datasource-calculated item evaluates to `0`; diagnostics mark this as an intentional empty result, not a data failure. |

Unknown modes fail the call with `WIDGET_BINDING_APPLY_UNKNOWN_FILTER_MODE`.

`forceEmpty` is accepted only through the normal plan-driven `localFilters[]` path, usually `{ kind:"emptyData", mode:"forceEmpty", itemId, values:["1"], reason }`, with `plan.emptyIntent` as the canonical summary. There is no `_KDB.services.widgetBindingApply.applyEmptyDataFilter(...)` method. If a caller needs "empty this target now" without a full user-facing binding plan, that caller asks `widgetBindingPlan` to build a minimal technical plan and then calls `applyBinding`.

## 9.1 Slot Options

`SlotPlanItem.options.limit` and `SlotPlanItem.options.keepOnlyFirst` are v1 scope because `widgetBindingPlan` marks them apply-consumed.

Rules:

- `keepOnlyFirst: true` means apply only the first `columnIds` item.
- `limit: n` means apply at most the first `n` `columnIds` items.
- When both are present, `keepOnlyFirst` is stricter and wins.
- If a future option cannot be enforced by the current Cognos wrapper surface, `applyBinding` returns `status:"error"`, `failedStep:"applySlots"` and `errorCode:"WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED"` rather than silently ignoring it.

## 10. Failure, Rollback And Non-Transactional Semantics

The service is best-effort and non-transactional:

- Completed Cognos side effects are not automatically undone on a later step failure.
- No inline replay of a previous plan happens inside the service.
- The caller keeps canonical state unchanged unless `status === "success"`.
- The caller may choose to re-apply `lastSuccessfulPlan` by calling `applyBinding` again.
- `completedSteps`, `failedStep`, `appliedSlotCount`, `appliedFilterCount` and `warnings` are the recovery evidence.

Step failure mapping:

| Failed step | Typical error code |
|---|---|
| `validateInputs` | `WIDGET_BINDING_APPLY_INVALID_INPUT` |
| `readCurrentVisType` | `WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED` |
| `setDatasourceInitial` / `setDatasourceAfterClear` | `WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED` |
| `setVisType` | `WIDGET_BINDING_APPLY_SET_VIS_TYPE_FAILED` |
| `clearSlotsAndFilters` | `WIDGET_BINDING_APPLY_CLEAR_FAILED` |
| `applySlots` | `WIDGET_BINDING_APPLY_SLOT_FAILED` |
| `applySlots` | `WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED` |
| `removeManagedFilters` | `WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED` |
| `applyLocalFilters` | `WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED` |
| `applyTopBottom` | `WIDGET_BINDING_APPLY_TOPBOTTOM_UNAVAILABLE` or `WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED` |
| `renderWidget` | `WIDGET_BINDING_APPLY_RENDER_FAILED` |
| `waitRenderComplete` | `WIDGET_BINDING_APPLY_RENDER_TIMEOUT` or `WIDGET_BINDING_APPLY_RENDER_WAIT_FAILED` |

## 11. Error Taxonomy

| Code | Meaning |
|---|---|
| `WIDGET_BINDING_APPLY_DISPOSED` | Public async method was called after `destroy()`. |
| `WIDGET_BINDING_APPLY_INVALID_INPUT` | Missing `_KDB`, target, signal, widget id, or required option shape. |
| `WIDGET_BINDING_APPLY_INVALID_PLAN` | Plan is missing, not successful, or lacks required datasource/visualization/slot/filter shape. |
| `WIDGET_BINDING_APPLY_COGNOS_SURFACE_MISSING` | Required `_KDB.cognosAPI.widgets.*` wrapper is unavailable. |
| `WIDGET_BINDING_APPLY_GET_VIS_TYPE_FAILED` | Current visType read failed. |
| `WIDGET_BINDING_APPLY_SET_DATASOURCE_FAILED` | Datasource write failed. |
| `WIDGET_BINDING_APPLY_SET_VIS_TYPE_FAILED` | Visualization type write failed. |
| `WIDGET_BINDING_APPLY_CLEAR_FAILED` | Slot or local-filter clear failed. |
| `WIDGET_BINDING_APPLY_SLOT_FAILED` | Slot add or sort failed. |
| `WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED` | A `SlotPlanItem.options` field cannot be enforced by the current apply surface. |
| `WIDGET_BINDING_APPLY_REMOVE_FILTER_FAILED` | Previous managed filter removal failed. |
| `WIDGET_BINDING_APPLY_TOPBOTTOM_UNAVAILABLE` | A helper plan requires TopBottom/topcount but the Cognos wrapper is unavailable. |
| `WIDGET_BINDING_APPLY_TOPBOTTOM_FAILED` | Applying Cognos TopBottom/topcount failed. |
| `WIDGET_BINDING_APPLY_UNKNOWN_FILTER_MODE` | A local-filter descriptor mode is not supported. |
| `WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED` | A requested operator such as `contains` or `beginsWith` is not available through the current Cognos wrapper surface. |
| `WIDGET_BINDING_APPLY_FORCE_EMPTY_FILTER_INVALID` | A `forceEmpty` descriptor is missing `itemId` or the target value. |
| `WIDGET_BINDING_APPLY_LOCAL_FILTER_FAILED` | Local-filter body build or add/replace failed. |
| `WIDGET_BINDING_APPLY_RENDER_FAILED` | Render trigger failed. |
| `WIDGET_BINDING_APPLY_RENDER_WAIT_FAILED` | Render completion wait failed without timeout. |
| `WIDGET_BINDING_APPLY_RENDER_TIMEOUT` | Render did not complete within timeout. |
| `WIDGET_BINDING_APPLY_ABORTED` | Caller signal was aborted due to expected caller-owned supersession. |
| `WIDGET_BINDING_APPLY_UNEXPECTED_ERROR` | Boundary catch fallback for an uncategorized failure. |

Errors are logged once at the public method boundary with compact context and converted into result objects, except disposed async methods which reject per `module-public-api.mdc`.

## 12. Supersession And `opSeq`

The service does not generate or persist `opSeq`.

Caller responsibilities:

- Increment the per-widget `opSeq` before starting a new logical apply.
- Abort older same-widget work when superseding it.
- Pass `target.opSeq` and `signal`.
- Ignore any result whose `diagnostics.opSeq` is stale.

Service responsibilities:

- Include `target.opSeq` in diagnostics.
- Check `signal.aborted` before and after each awaited operation.
- Return `status: "aborted"` and `errorCode: "WIDGET_BINDING_APPLY_ABORTED"` on abort; callers treat this as supersession/no-commit, not a binding failure.
- Avoid post-abort logging for expected aborts.

## 13. Readers / Writers

Public readers/writers:

- `applyBinding` writes Cognos state only.
- `destroy` writes only service runtime cleanup/tombstone state.

No selector registry is published because shared services expose deliberate named methods and this service owns no `_KDB.state` subtree.

## 14. Events

This service emits no events and subscribes to no events.

Reasons:

- `applyBinding` is a request/response operation with a return value.
- Known owners (`widgetVis`, `widgetTopN`) call the service directly.
- Fact-events would be pollution until a real independent consumer exists.

No `events/eventNames.js` is created for this module.

## 15. DOM Boundaries

The service performs no DOM queries and stores no DOM refs. Overlay **finish** after `whenRenderComplete` lives in `finishRenderWait.js` (widgetId + loadingService handle/key only); start is widgetSettings. See `loadingService-overlay-coverage-contractdelta.md`.

Allowed:

- Passing `widgetId` to Cognos wrappers, because wrapper implementations own host-specific object resolution.

Forbidden:

- `document.querySelector`, global `$`, or shell/header/content DOM lookup.
- Storing live DOM in `_KDB.state`, `_KDB.runtime.widgetBindingApply`, or `_KDB.elements`.
- Moving widget shells between canvas and launchpad.
- Creating title/drillthrough/legend DOM decorations.

## 16. History Behaviour

This service owns no history keys and never calls `_KDB.services.history`.

History commit discipline:

- Settings/control owners commit history only after the consequence-owner confirms `applyBinding` success.
- `applyBinding` failure/timeout/abort produces diagnostics only; abort is expected supersession and should not be surfaced as a settings error.
- Replay re-enters through the caller's normal apply path; the service does not special-case history replay except carrying `plan.reason` / `target.reason` in diagnostics.

## 17. Dependencies

Injected runtime:

- `_KDB` as boundary input to the orchestrator/service factory.
- `_KDB.cognosAPI.widgets.*` wrappers listed in §8.
- Optional service defaults passed by orchestrator options; no direct read from foreign module internals.

Upstream consumers:

- `_KDB.api.widgetVis` via its actions.
- `_KDB.api.widgetTopN` when helper apply is implemented; helper row reads go through `_KDB.services.tableData`, not through this service.

Sibling service:

- `widgetBindingPlan` produces the plan; this service does not import internal plan builders.

## 18. Folder Layout

```txt
KDB3/js/core/services/widgetBindingApply/
  __orchestratorWidgetBindingApply.js
  createWidgetBindingApplyService.js
  config/
    defaults.js
  effects/
    applyBindingPlan.js
    applySlots.js
    applyLocalFilters.js
    buildFilterBody.js
    waitForRender.js
  diagnostics/
    createDiagnostics.js
    createApplyResult.js
```

No `state/`, `view/`, `events/` or `adapters/` folders are created because the service owns no state, DOM, emitted events or host adapter.

## 19. Bootstrap And Integration

Required registration:

- `KDB3/js/core/services/__orchestratorServices.js` imports and calls `__orchestratorWidgetBindingApply`.
- The service registers `_KDB.services.widgetBindingApply`.
- `KDB3/js/KDB.js` does not need a direct service import if existing service bootstrap already calls `__orchestratorServices`; only the services orchestrator changes.

This tranche explicitly defers bootstrap registration in `KDB.js`. Service-orchestrator registration is required during CP-2 implementation unless the implementation is staged as files-only.

Integration order:

1. `widgetBindingPlan` contract/service first or same wave.
2. `widgetBindingApply` service registered.
3. `widgetVis` consumes visible-target apply.
4. `widgetDataTable` / `widgetTopN` consume helper-target apply; helper row reads use `tableDataService`.

## 20. Out Of Scope

- Building plans, slot selection or domain filter descriptors (`widgetBindingPlan`).
- Deciding when a widget should be intentionally emptied; callers express that through `BindingPlan.emptyIntent` and a `localFilters[]` `emptyData/forceEmpty` descriptor.
- Committing settings, derived widget state or history (`widgetSettings`, `widgetVis`, `widgetTopN`).
- Inline rollback/replay of last-good plan.
- Title, legend, tooltip, drillthrough, focus mode and list-summary cosmetic writebacks. Slot data-item `setCustomLabel` after add is an apply Cognos touchpoint, not this bucket (`contracts/_archive/visualization-dimension-custom-label-contractdelta.md`).
- Launchpad, canvas placement, widget cleanup ownership and DOM movement.
- TableData cache reads, helper row reads, TopN row extraction or hierarchy data loading.
- Cross-module integration tests.
- Editing `.cursor/rules/`, templates, authority docs or legacy trees.

## 21. Notes For Related Planners

For the `widgetBindingPlan` planner:

- `widgetBindingPlan.md` is the schema authority. `widgetBindingApply` consumes the final `BindingPlan` shape, including `emptyIntent`, `SlotPlanItem.options`, required `localFilters[].values`, and `managedFilterItemIds` as new-plan output only.
- Previous managed-filter ids are not plan output; they are caller runtime and enter apply through `ApplyBindingOptions.previousManagedFilterItemIds`.
- Existing filter operators (`include`, `exclude`, `contains`, `beginsWith`, etc.) remain declarative descriptors; this service only translates them to Cognos bodies.

For the `widgetVis` planner:

- Treat intentional emptying as an apply consequence: request/build a plan with `emptyIntent.enabled === true`, consume the resulting `emptyData/forceEmpty` descriptor, then call `widgetBindingApply.applyBinding` and wait for render confirmation.
- In UI/state diagnostics, distinguish intentional empty (`forceEmpty` success) from no-data/error; do not store it as a binding failure.
- If a widget must be emptied without a full setting-change plan, call the plan service for a minimal technical empty plan rather than adding a separate `widgetBindingApply` public command.
- Pass previous managed-filter ids from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds` as `ApplyBindingOptions.previousManagedFilterItemIds`, then after successful apply replace that runtime array with `plan.managedFilterItemIds`.

## 22. Resolved CP-1 Questions / Remaining Confirmations

| Question | Status |
|---|---|
| Apply order `setDatasourceInitial -> setVisType -> clear -> setDatasourceAfterClear` | **Resolved.** Contract §7 is authoritative and preserves REDESIGN2's second datasource write after clearing slots/filters. |
| Previous managed-filter ids source | **Resolved.** They come from caller runtime through `ApplyBindingOptions.previousManagedFilterItemIds`, not from `BindingPlan`. |
| Legacy `applyBindingPlanPostSuccess` title/list-summary writebacks | **Still needs CP-1 confirmation.** Current contract excludes them from this service and leaves title/cosmetic cleanup to `widgetVis` or a later focused delta. |
| Helper row-read boundary | **Resolved.** TopN helper row reads are owned by `widgetTopN` via `tableDataService.reloadTable([{ widgetId }])`; `widgetBindingApply` owns apply/render only. |
| Datasource-wide stop-filter convention for `forceEmpty` | **Resolved at apply boundary.** Apply consumes `plan.emptyIntent` / `emptyData/forceEmpty`; the stop-filter id/value convention is resolved upstream by `widgetBindingPlan` from spec/config. |
| Direct `KDB.js` bootstrap registration | **Still needs CP-2 confirmation.** Current contract expects service-orchestrator registration and defers direct `KDB.js` changes. |
| Slot options `limit` / `keepOnlyFirst` | **Resolved.** Apply consumes them in v1 or returns `WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED`. |
| `aborted` status semantics | **Resolved.** Abort is expected caller-owned supersession, not a binding error and not a settings error. |

## 23. Cross-Contract Alignment Log

### 23.1 Deltas Applied To `widgetBindingApply.md`

- Aligned consumed plan shape with final `BindingPlan`: `status`, `widgetId`, `ownerWidgetId`, `opSeq`, `emptyIntent`, required `localFilters[].values`, optional `localFilters[].reason`, and `SlotPlanItem.options`.
- Added `ApplyBindingOptions.previousManagedFilterItemIds?: string[]` and documented the `widgetVis` runtime source.
- Updated `removeManagedFilters` to consume `options.previousManagedFilterItemIds`, with no expectation of `plan.previousManagedFilterItemIds`.
- Added v1 handling for `SlotPlanItem.options.limit` / `keepOnlyFirst`, including explicit unsupported failure.
- Clarified force-empty as normal `localFilters[]` apply path with no separate `applyEmptyDataFilter` method.
- Added optional `emptyMode` / `emptyReason` apply diagnostics derived from `plan.emptyIntent` or the force-empty descriptor.
- Re-stated `mirrorPatch` as non-null only on `status:"success"` and null for `timeout`, `error`, and `aborted`.
- Clarified `aborted` as expected caller-owned supersession.

### 23.2 Required Follow-Up For `widgetVis`

- Build canonical `BindingPlanSpec` before calling `widgetBindingPlan.buildPlan`; do not pass internal `settings`, `dataIdentity`, `changeReason`, or `topNResult` shapes through unchanged.
- Pass `target.opSeq` and `signal` to `applyBinding`.
- Pass previous managed-filter ids from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds` to `ApplyBindingOptions.previousManagedFilterItemIds`.
- After `status:"success"`, update the caller-owned runtime managed-filter ids to `plan.managedFilterItemIds`; do not ask `widgetBindingApply` to persist them.
- Treat `status:"aborted"` as stale/superseded work: no settings commit, no settings error.
- Use `mirrorPatch` only from successful apply results.

## 24. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ applyBinding, destroy }` under `_KDB.services.widgetBindingApply`.
2. `applyBinding` has exact input/result schemas.
3. No `_KDB.state.widgets` writes are allowed.
4. Runtime ownership is limited to service cleanup buckets; per-widget `opSeq` and AbortControllers stay caller-owned.
5. Apply step ids and order are fixed and diagnostics record completed/failed/skipped steps.
6. `ApplyBindingOptions.previousManagedFilterItemIds` is the only previous-managed-filter input path.
7. Slot options `limit` / `keepOnlyFirst` are either consumed or fail explicitly.
8. Failure is explicitly non-transactional; rollback/replay is caller-owned.
9. Timeout and abort behavior are documented, and abort is supersession rather than a binding error.
10. Cognos wrappers consumed are enumerated and no DOM boundary is crossed.
11. No events or history steps are emitted/committed by the service.
12. `forceEmpty` is documented as an explicit descriptor mode inside the normal plan-driven apply pipeline; no empty-specific public method exists.
13. `mirrorPatch` is non-null only on successful apply.
14. Cross-contract follow-up for `widgetVis` is documented.
15. Legacy deltas are documented.
16. CP-2 implementation can map each production file to legacy evidence and rule obligations.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub` | Planner (Claude Opus 4.8) | Initial outline from widgets-domain blueprint. |
| 2026-06-07 | `Stub -> Draft CP-1` | `<pending>` | Full composed-port contract expanded: named service API, target shapes, apply/read schemas, non-transactional failure, Cognos surface, opSeq/AbortSignal and service boundaries fixed. |
| 2026-06-07 | `Draft CP-1 -> Contract freeze draft` | `<pending>` | Sequential alignment to `widgetBindingPlan.md` schema authority: previous managed filters moved to apply options, final `BindingPlan` fields consumed, `emptyIntent`/force-empty and slot options aligned, abort semantics clarified. |

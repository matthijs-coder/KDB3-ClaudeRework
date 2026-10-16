# Service Contract: `widgetBindingPlan`

> Full CP-1 contract for the shared binding-planning service in the widgets composed-port path. Design authority lives in `_____________KDB3API/architecture/widgets-domain-blueprint.md`; this contract expands the original stub with the §12 execution-readiness details.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetBindingPlan`
**Type:** `shared service`
**Authoring AI:** GPT-5.5, 2026-06-07
**Reviewed by:** `<pending CP-1 approval>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetBindingPlan` is a new shared service assembled from the REDESIGN2 pure binding builders plus the widgets-domain blueprint. It is not a 1-to-1 port of a legacy module.

Target production path:

```txt
_____________KDB3API/KDB3/js/core/services/widgetBindingPlan/
```

The service builds a declarative binding plan: which datasource and visualization type the caller intends, which column ids belong in which Cognos slot and order, which sort metadata applies, which slot/filter clear intent should be carried to the apply service, and which local-filter descriptors should be applied. It does not test whether Cognos accepts the plan and does not apply anything to Cognos.

No production behavior code may be generated until this CP-1 contract is approved. The execution spec in `widgetBindingPlan-port-execution-spec.md` is a handoff document, not approval to code.

## 1. Evidence And Deliberate Deltas

| Evidence | Use in this contract |
|---|---|
| `architecture/widgets-domain-blueprint.md` | Authority for shared-service boundary, named-method API, no state writes, no Cognos touchpoints and §12 detail requirements. |
| `contracts/widgetBindingApply.md` | Consumer boundary: apply consumes the plan and owns Cognos mutation, render wait, timeout, abort and apply diagnostics. |
| `contracts/widgetVis.md` / `widgetTopN.md` | Upstream callers prepare the spec, own per-widget state/runtime/history and pass helper results into the planner. |
| `architecture/widgets-legacy-survey-redesign2.md` RUN 4 | Legacy compute/apply split, binding-plan fields, slot/filter/mirror responsibilities and legacy failure strings. |
| Read-only legacy JS investigation report | Confirms the planner composition: `buildBindingPlan` wraps `buildSlotPlan`, `buildFilterDescriptors`, `buildMirrorPatch` and `parseTopNOption`; all are sync and have no DOM/Cognos/state writes. |

Deliberate deltas versus legacy:

- The public entry is `buildPlan(spec)` instead of `buildBindingPlan(_KDB, widgetId, dataConfig, hierarchySnapshot, helperTableResult)`.
- All mutable `_KDB` reads are removed from the planning path. The caller passes read-only snapshots such as `filterPropObj`, `parameterMappingObj` and `topNOptions` in `spec.config`.
- `spec.reason` is explicit and drives `slotsChanged`; the legacy gap where `dataConfig.reason` was usually missing is not preserved.
- Legacy `slotPlan` is exposed as `slots`; legacy `filterDescriptors` is exposed as `localFilters`.
- `targetKind` is included as a declarative plan discriminator (`vis`, `topNHelper`, `dataTableHelper`) only. It does not authorize Cognos apply behavior.
- Intentional emptying is triggered by explicit `emptyIntent.enabled === true` and represented in output both as a plan summary and as a declarative local-filter descriptor (`kind:"emptyData"`, `mode:"forceEmpty"`), not as a separate apply command.
- `mirrorPatch` remains caller-owned commit material. Neither `widgetBindingPlan` nor `widgetBindingApply` commits it to state.
- The imperative legacy twins (`applyLiveWidgetSlots`, `applyLiveWidgetLocalFilters`) are not ported into this service; they are superseded by declarative planning plus `widgetBindingApply`.
- The injectable TopN parser shape (`parseTopNOption(raw, topNOptions)`) is canonical for this composed port; the legacy `_KDB.dropdownOptions` read is not carried forward.
- Previous managed-filter ids are never plan output. The plan returns the new `managedFilterItemIds`; callers pass previous ids to `widgetBindingApply` through apply options.

## 2. Purpose

`widgetBindingPlan` turns a caller-prepared binding spec into a deterministic, declarative plan. The plan says what should be bound: datasource, visualization type, slot contents and order, slot sort metadata, local filters with include/exclude/reverse/hierarchy modes, managed-filter ids, and a caller-owned settings mirror proposal.

It does not apply, validate against Cognos, render, wait, roll back, push history, write widget state, claim helper widgets, query TopN helper data or decide product lifecycle.

## 3. Ownership

State ownership:

- Owns no `_KDB.state` subtree.
- Writes no `_KDB.state.widgets.*`, `_KDB.state.history`, filter state, launchpad state or service-owned lifecycle state.
- Does not store `lastSuccessfulPlan`, `lastConfirmedBindingPlan`, managed-filter state or diagnostics in `_KDB.state`.

Runtime ownership:

- Owns no `_KDB.runtime` subtree.
- Creates no listeners, subscriptions, AbortControllers, timers, pending promises, DOM refs, Cognos host objects or opSeq counters.
- Because the service is pure and stateless, the public surface is exactly `{ buildPlan }`; there is no `destroy()` method.

## 4. Public API

Shared service surface:

```js
_KDB.services.widgetBindingPlan = {
  buildPlan: buildPlan
};
```

Named methods are used because this is a shared service, not a feature module. No `dispatch`, `getState`, lifecycle method or granular read method is exposed.

Method signature:

| Method | Signature | Contract |
|---|---|---|
| `buildPlan` | `(spec: BindingPlanSpec) => BindingPlan` | Synchronously validates and normalizes the spec, builds slot intent, local-filter intent and mirror proposal, then returns a serializable plan or a serializable failure. It never throws for known validation failures. |

Post-disposal discipline is not applicable because this pure service has no `destroy()` lifecycle and no runtime resources. If root bootstrap removes `_KDB.services.widgetBindingPlan`, callers must treat the missing service as a bootstrap/integration error.

### 4.1 Action Payload Schemas

None. This service is not dispatch-style and has no actions. The only public payload is `BindingPlanSpec`.

## 5. `BindingPlanSpec`

```js
{
  reason: "contentCreate" | "dimension" | "visType" | "topN" | "hierarchy" | "hierarchyFilter" | "dienststelle" | string | null,
  targetKind: "vis" | "topNHelper" | "dataTableHelper",
  widgetId?: string | null,
  ownerWidgetId?: string | null,
  opSeq?: number | null,

  dataConfig: DataConfig,
  hierarchySnapshot?: HierarchySnapshot | null,
  helperTableResult?: HelperTableResult | null,
  emptyIntent?: {
    enabled: boolean,
    reason?: string,
    itemId?: string,
    value?: "1"
  },
  resetIntent?: {
    enabled: boolean,
    scope?: "helperTarget" | string,
    clearAllSlots?: boolean,
    clearAllLocalFilters?: boolean,
    reason?: string
  },

  config: {
    filterPropObj: object,
    parameterMappingObj: object,
    topNOptions: object,
    emptyDataFilter?: {
      itemId: string,
      value?: string,
      reason?: string
    }
  }
}
```

Rules:

- `reason` is a caller-supplied planning reason and is copied into the output. It drives `slotsChanged`.
- `targetKind` is required and copied into the output. It is used for diagnostics and future helper planning distinctions only; apply semantics live in `widgetBindingApply`.
- `widgetId`, `ownerWidgetId` and `opSeq` are diagnostic correlation fields only. The planner does not read runtime by id and does not perform stale-result checks.
- `dataConfig`, `hierarchySnapshot`, `helperTableResult` and `config` must be serializable snapshots prepared by the caller.
- `emptyIntent.enabled === true` is the only trigger for intentional emptying. `config.emptyDataFilter` is a convention/default and must not by itself request emptying.
- When intentional emptying is requested, the stop-filter item id is resolved in this order: `emptyIntent.itemId`, `config.emptyDataFilter.itemId`, then an approved static convention inside the supplied `dataConfig`. It must not be read from mutable widget state and must not be discovered by `widgetBindingApply`.
- `resetIntent.enabled === true` is technical reset intent, not intentional emptying. For `targetKind:"topNHelper"`, it declares that `widgetBindingApply` should clear helper slots and local filters before apply or as reset-only cleanup. For `targetKind:"vis"` with `reason:"cleanup"` and `resetIntent.reason === "settingsDelete"` or `resetIntent.scope === "visTarget"`, it declares reset-only vis cleanup with no slot re-additions.
- The same `spec` must always produce the same `BindingPlan`; no call may read mutable widget state, DOM, Cognos or time.

### 5.1 `DataConfig`

```js
{
  kennzahlCode: string,
  kennzahlDisplay?: string | null,
  kennzahlenTable?: string | null,

  datasourceName?: string | null,
  datasourceId: string,

  visualizationType: string,
  cognosVisualizationTypeId?: string | null,
  visPropBucketKey?: string | null,

  visTypeConfig: object,
  dataTableConfig: {
    dimensions?: object,
    sorting?: object
  },
  kennzahlDefaults?: object,

  dimension?: string | null,
  topN?: string | null,

  hierarchyTarget?: string | null
}
```

Relevant nested fields:

- `visTypeConfig` may contain slot keys `values`, `categories`, `series`, `color`, `repeatHorizontal`, `repeatVertical`, `grid_cols`, plus `dimensionSelectionAffects`, optional `slotComposition` and `widgetFilter`.
- `visTypeConfig.slotComposition[slotName]` is an optional declarative policy snapshot for column-id composition order. Supported modes today:
  - `dimension.mode: "prependThenMoveFirstToIndex"` with `targetIndex` — prepend the selected dimension id, then move that prepended dimension id from index `0` to `targetIndex` (List `grid_cols` legacy parity: `Jahr | Monat | Dimension | Kennzahl`).
  - `hierarchy.mode: "insertBeforeSelectedDimensionOrBeforeLast"` — dedupe the hierarchy id, insert before the selected dimension column when present, otherwise before the last column (List `grid_cols` legacy parity: hierarchy before Kennzahl, or before Dimension when selected).
  - `hierarchy.mode: "insertAfterSelectedDimensionOrAt"` with `targetIndex` — dedupe the hierarchy id, then insert immediately after the selected dimension column when that id is present in the slot array, otherwise insert at clamped `targetIndex` (same clamp as `moveElement`: min `0`, max current length; default `0`). Line `series` declares this mode in `bindingSpecs` (`targetIndex: 0`) so series order is `[Dienststelle, Jahr]` with no extra dimension and `[dim, Dienststelle, Jahr]` when a dimension is already on the slot. Prognose `series` (`com.ibm.vis.custom.prognoseyearlinechart`) declares the same mode (`targetIndex: 0`) so order is `[Dienststelle, Jahr, Stichtag]` with no extra dimension and `[dim, Dienststelle, Jahr, Stichtag]` when a dimension is already on the slot. Defaults remain `[Jahr, Stichtag]`; Dienststelle is not hardcoded into defaults. Walkthrough: DST inserts at 0 after optional dim prepend.
  - `hierarchy.mode: "moveToIndex"` with `targetIndex` — dedupe the hierarchy id, then insert at clamped `targetIndex` (same clamp as `moveElement`: min `0`, max current length). Implemented for compatibility; current vis buckets do not declare this mode. Unknown or absent hierarchy mode on non-`grid_cols` remains append.
- **Pie carve** (`contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md` §14): confirmed Dienststelle is **not** appended to `categories` (no-policy append fallback is skipped for pie). Segment stays the selected Dimension (pie force-single). DST is **prepended** on one Repeat via `insertBeforeSelectedDimensionOrBeforeLast` (no dim on Repeat → before last; empty → `[DST]`): `jahr` / `jahrStichtag` / V → Repeat-V; H → Repeat-H. Do **not** replace Repeat-V wholesale with `[DST]` for every grain (that would steal Monat on H). Empty Repeat-V is still collected when it declares a hierarchy policy (otherwise DST falls to the local hierarchy filter only).
- When `slotComposition` is absent for a slot, `grid_cols` still falls back to the List legacy composition rules above (that List hierarchy fallback stays `grid_cols` only; it is not lifted to `series`). Other slots keep append-after-defaults hierarchy merge (`Dimension | defaults | Dienststelle` for Prognose/StackedColumn-style configs) unless that slot declares its own `hierarchy` policy. Pie is the exception in the bullet above.
- `dataTableConfig.dimensions[dimension]` may contain `itemId`, `include`, `exclude` and `reverse`.
- `dataTableConfig.sorting[columnId]` may define sort order as a custom Cognos member-order `string[]` or `string`, a direction object `{ order: "ascending" | "descending", priority?: number }`, or a raw direction/custom-order value. Vis Jahr and Monat member order is ascending: years 2017→2030, months JAN→DEZ with Gesamt last. Those arrays live only in `js/core/config/visualizations/sorting.js` (`YEAR_ASC` / `MONTH_ASC` are reverses of the DESC seeds). `LINE_PROGNOSE_SORTING` is also the default `sorting` export and is shared by line, prognose, and the stacked/pie fallback. List uses the same ascending arrays with Jahr priority 1 and Monat priority 2. A chosen dimension is not a key in that map. Its member order is the extra `captionAscending` spec in §6.1, appended after these Jahr/Monat specs.
- `kennzahlDefaults` may define default local filters. **Grouping-A Implemented** (`contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md`): packs are `stichtag` \| `jahr` \| `list` via the shared caption factory, not `visPropBucketKey` / the retired `branchKey` ternary.

### 5.2 `HierarchySnapshot`

```js
{
  activeDownstreamName?: string | null,
  resolution?: {
    hasConfirmedSelection: boolean,
    downstreamValues?: string[],
    dominantValues?: string[],
    dominantScopeKey?: string | null
  },
  byFilter?: object
}
```

Rules:

- A hierarchy descriptor is planned only when `resolution.hasConfirmedSelection === true`.
- The planner may use `activeDownstreamName`, `downstreamValues`, `dominantValues` and `dominantScopeKey` to resolve the target item id through `config.filterPropObj`.
- Missing confirmed hierarchy values or source mapping is a plan failure when hierarchy planning is required by the spec.

### 5.3 `HelperTableResult`

```js
{
  ok: boolean,
  applied?: boolean,
  topNResultValues?: string[] | null,
  topNExcludeItemId?: string | null,
  error?: string | null
}
```

Rules:

- `helperTableResult` is produced by `widgetTopN` or a caller-owned pre-plan helper flow.
- The planner never queries helper data.
- A count-style visible-widget plan (`targetKind:"vis"`) requires a successful helper result with non-empty `topNResultValues` and a resolvable `topNExcludeItemId`.
- A helper-target plan (`targetKind:"topNHelper"`) must not require `helperTableResult`; it is the plan that produces the helper result later.
- Default/no TopN plans do not require a helper result.

## 6. `BindingPlan`

```js
{
  ok: boolean,
  status: "success" | "error",
  errorCode: string | null,
  errorMessage: string | null,
  legacyError?: string | null,

  reason: string | null,
  targetKind: "vis" | "topNHelper" | "dataTableHelper",
  widgetId: string | null,
  ownerWidgetId: string | null,
  opSeq: number | null,

  datasource: {
    id: string,
    name: string | null
  } | null,

  visualization: {
    visType: string,
    canonicalVisType: string | null,
    cognosVisualizationTypeId: string | null
  } | null,

  slotsChanged: boolean,
  slotsToClear: ["all"] | [],
  slots: SlotPlanItem[],
  localFilters: LocalFilterDescriptor[],
  managedFilterItemIds: string[],
  emptyIntent: {
    enabled: boolean,
    reason: string | null,
    itemId: string | null,
    value: "1" | null
  },
  resetIntent: {
    enabled: boolean,
    scope: string | null,
    clearAllSlots: boolean,
    clearAllLocalFilters: boolean,
    reason: string | null
  },
  mirrorPatch: object,

  diagnostics: BindingPlanDiagnostics
}
```

Failure result rules:

- `ok: false`, `status: "error"`, `slots: []`, `localFilters: []`, `managedFilterItemIds: []`, `emptyIntent: { enabled:false, reason:null, itemId:null, value:null }`, `resetIntent: { enabled:false, scope:null, clearAllSlots:false, clearAllLocalFilters:false, reason:null }`, `mirrorPatch: {}`, `slotsChanged: false`, `slotsToClear: []`.
- `datasource` and `visualization` may be `null` when the input needed to build them is invalid.
- Known validation failures are returned as error plans, not thrown.
- Unexpected exceptions are caught at the public method boundary, logged once with compact context, and converted to `WIDGET_BINDING_PLAN_INTERNAL`.

### 6.1 `SlotPlanItem`

```js
{
  slotName: "values" | "categories" | "series" | "color" | "repeatHorizontal" | "repeatVertical" | "grid_cols" | string,
  columnIds: string[],
  sortByColumn?: string | null,
  sortSpecs?: [
    {
      columnId: string,
      order: "ascending" | "descending" | string | string[],
      priority?: number
    }
  ],
  options?: {
    limit?: number | null,
    keepOnlyFirst?: boolean,
    topBottom?: {
      type: "topcount",
      value: number,
      rank: false,
      valueItemId: string
    },
    source?: "default" | "dimension" | "hierarchy" | "kennzahl" | "mixed" | string,
    customLabel?: { columnId: string, label: string }
  }
}
```

Rules:

- `columnIds` is the exact ordered list the apply service should add to the slot.
- `sortSpecs` is preferred for new code. `sortByColumn` may be included only as legacy compatibility material when one sort column is sufficient.
- Slot limits or "first item only" semantics are declarative `options` and are in scope for v1. `widgetBindingApply` must consume `options.limit` / `options.keepOnlyFirst` or explicitly fail with an apply error when the current Cognos wrapper surface cannot enforce them. The planner does not test Cognos enforcement.
- For `targetKind:"topNHelper"` and count-style TopN, the helper `grid_cols` slot emits `options.topBottom` so `widgetBindingApply` can apply Cognos `topcount` to the helper metric/value item.
- `options.customLabel` is emitted only when `dataConfig.dimension` is a real dimension-dropdown key (not `null` / `""` / `default` / `none`). `columnId` is that dimension’s catalog `itemId`; `label` is that key (same string as the dropdown option). Empty `label` is forbidden. TopN helper and absent dimension omit the field. Apply consumes it via `setCustomLabelInSlot` after add (`contracts/visualization-dimension-custom-label-contractdelta.md`).
- When `options.customLabel.columnId` is a non-empty string, the planner appends one `sortSpecs` entry after the Jahr/Monat specs taken from `dataTableConfig.sorting`: `{ columnId, order: "captionAscending", priority }` where `priority` is one higher than the last emitted spec (or `1` when none were emitted). The List `grid_cols` cap of two specs applies only to that `sorting.js` slice; this dimension spec sits outside the cap. If that `columnId` is already among the emitted specs, do not append a second sort for it. When this caption spec is emitted, `sortByColumn` is null. `captionAscending` is not `"ascending"`: the visualization facet sends `{ by: "caption", type: "asc" }` with no `custom.top`, and matches the column with `getColumnId()` then `getId()`. This path does not sort Dienststelle, Kennzahl, or Stichtag. Jahr and Monat stay on the §5.1 arrays in `sorting.js`.
- Empty optional slots are skipped with a warning. Empty required slots fail with `WIDGET_BINDING_PLAN_SLOT_REQUIRED_EMPTY`.

### 6.2 `LocalFilterDescriptor`

```js
{
  kind: "widgetFilter" | "kennzahlDefault" | "dimension" | "topN" | "hierarchy" | "emptyData",
  mode: "include" | "exclude" | "contains" | "beginsWith" | "reverse" | "includeExcludeOr" | "hierarchyKeepexclude" | "forceEmpty",
  itemId: string,
  values: string[],
  reason?: string,
  options?: {
    includeValues?: string[],
    excludeValues?: string[],
    overrideHierarchyDefaultSelection?: boolean,
    action?: "keepexclude" | string,
    sourceKey?: string | null
  }
}
```

Rules:

- The planner describes filter intent only. Cognos filter-body construction belongs to `widgetBindingApply`.
- `kind: "emptyData"` with `mode: "forceEmpty"` is the apply instruction for intentional emptying. It is emitted only when `spec.emptyIntent.enabled === true`. Shape: `{ kind:"emptyData", mode:"forceEmpty", itemId:"<stopFilter item id>", values:["1"], reason?: string }`.
- `emptyData.itemId` must be resolved by the planner from `spec.emptyIntent.itemId`, `spec.config.emptyDataFilter.itemId`, `dataConfig` or an approved static convention in the binding spec. `widgetBindingApply` must not look it up from mutable widget state.
- Consumers may derive `emptyMode` / `emptyReason` from `BindingPlan.emptyIntent` or from the `emptyData/forceEmpty` descriptor. They are not required to inspect both.
- `include`, `exclude`, `contains`, `beginsWith`, `includeExcludeOr` and `hierarchyKeepexclude` are declarative filter operators. The apply service translates them to Cognos bodies.
- `mode: "includeExcludeOr"` carries `includeValues` and `excludeValues` in `options`.
- When a count-style TopN include descriptor shares `itemId` with an existing `exclude` or `includeExcludeOr` descriptor (widget, kennzahl default, or dimension), the planner composes both intents into one `kind:"topN"`, `mode:"includeExcludeOr"` descriptor instead of overwriting the exclude side.
- Hierarchy descriptors use `mode: "hierarchyKeepexclude"` and set `options.overrideHierarchyDefaultSelection === true`.
- `mode: "forceEmpty"` must have `values:["1"]` and must never be emitted without a concrete `itemId`.
- `values` is required and always a string array. Descriptors with no `itemId` fail; descriptors with empty `values` are skipped unless the mode requires values, in which case the plan fails.
- `managedFilterItemIds` is the deduplicated list of descriptor `itemId`s this plan proposes as the new caller/apply-managed local filters.
- Previous managed-filter ids are not part of `BindingPlan`. They are runtime-owned by `widgetVis` and passed to `widgetBindingApply` through `ApplyBindingOptions.previousManagedFilterItemIds?: string[]`.

### 6.3 `mirrorPatch`

```js
{
  visualizationType?: string,
  dimension?: string,
  topN?: string,
  topNResultValues?: string[],
  topNExcludeItemId?: string,
  datasourceId?: string,
  datasourceName?: string | null
}
```

Rules:

- `mirrorPatch` is a declarative proposal for the caller.
- The planner does not commit it to `_KDB.state.widgets.*`.
- The planner always attaches `mirrorPatch` to `BindingPlan` as caller-owned proposal material. `widgetBindingApply` echoes `plan.mirrorPatch` in `ApplyBindingResult` only when `status === "success"`; the caller decides whether and where to commit it.
- When `dimension` is default or TopN is default/none, `topN` is normalized to `"default"` and TopN result fields are omitted.
- **Absent tokens:** `normalizeDefaultValue` and `parseTopNOption` are the canonical normalizers at the plan boundary. Inputs `"none"`, `"default"`, and `""` are equivalent absent markers; they are never dimension keys or TopN ids. Mirror output uses `"default"` per host convention. See `contracts/widgetVis.md` §7.1.1 and `architecture/widgets-domain-blueprint.md` §7.1.
- `mirrorPatch` remains valid proposal material even on a successful force-empty plan, but the caller decides which fields to commit after `widgetBindingApply` returns `status: "success"`.

### 6.4 `BindingPlanDiagnostics`

```js
{
  service: "widgetBindingPlan",
  operation: "buildPlan",
  reason: string | null,
  targetKind: string,
  widgetId: string | null,
  ownerWidgetId: string | null,
  opSeq: number | null,
  emptyIntent: {
    enabled: boolean,
    reason: string | null,
    itemId: string | null,
    value: "1" | null
  },
  legacyError: string | null,
  failedStage: "validateSpec" | "parseTopN" | "buildSlots" | "buildFilters" | "buildMirrorPatch" | null,
  warnings: [
    {
      code: string,
      message: string,
      field?: string,
      legacySource?: string
    }
  ],
  counts: {
    slotCount: number,
    localFilterCount: number,
    managedFilterCount: number
  }
}
```

Diagnostics remain planning diagnostics. They must not include Cognos apply status, render status, timeout status, completed apply steps or rollback decisions.

## 7. Composition Order

`buildPlan(spec)` performs these stages:

1. `validateSpec` — validate required `spec`, `dataConfig`, `targetKind`, `datasourceId`, `visualizationType` and config snapshot shapes.
2. `buildBaseIdentity` — construct `datasource` and `visualization` from `dataConfig` (preserved even on reset-only cleanup).
3. `resolveEmptyIntent` — if `spec.emptyIntent.enabled === true`, resolve the stop-filter `itemId` and normalize `{ enabled, reason, itemId, value:"1" }`; otherwise emit disabled empty intent.
4. `resolveResetIntent` — normalize technical reset intent. For `targetKind:"topNHelper"`, reset intent may request a helper-target full reset.
5. **Vis reset-only short-circuit** — when `targetKind:"vis"`, `reason:"cleanup"`, `resetIntent.enabled === true`, and (`resetIntent.reason === "settingsDelete"` or `resetIntent.scope === "visTarget"`), return immediately without slot/filter/mirror planning. Output: `slotsChanged:true`, `slotsToClear:["all"]`, `slots:[]`, `localFilters:[]`, `managedFilterItemIds:[]`, `mirrorPatch:{}`, disabled `emptyIntent`, normalized `resetIntent`, preserved `datasource`/`visualization`.
6. `parseTopN` — parse `dataConfig.topN` with `parseTopNOption(raw, spec.config.topNOptions)`.
7. `buildSlots` — build ordered `slots[]` from `visTypeConfig` (including optional `slotComposition` policy), dimension selections, hierarchy slot merge and sort metadata. A slot name is collected when its raw `visTypeConfig` value is non-empty **or** `slotComposition[slotName].hierarchy` exists (empty Repeat can still receive confirmed Dienststelle). Empty optional after resolve still skipped.
8. `buildFilters` — build ordered `localFilters[]` and `managedFilterItemIds[]` from widget filters, kennzahl defaults, dimension filters, resolved intentional-emptying intent, TopN result and hierarchy result.
9. `buildMirrorPatch` — build the caller-owned settings mirror proposal from data config and filter TopN fields. For `targetKind:"topNHelper"` with `reason:"cleanup"` and reset intent, zero planned slots/filters and emit `mirrorPatch:{}`.
10. `buildSuccessPlan` — attach `reason`, `targetKind`, `slotsChanged`, `slotsToClear`, datasource, visualization, `emptyIntent`, `resetIntent` and diagnostics.

### 7.1 `slotsChanged` Policy

`slotsChanged` is derived from lowercased `spec.reason`:

| Reason | `slotsChanged` |
|---|---|
| `topn` / `topN` | `false` |
| `hierarchyfilter` / `hierarchyFilter` | `false` |
| `hierarchy` | `false` |
| `cleanup` with `emptyIntent.enabled === true` | `false` |
| `visualizationtype` / `visType` | `true` |
| `dimension` | `true` |
| missing or unknown | `true` |

`slotsToClear` is `["all"]` when `slotsChanged === true`, otherwise `[]`.

This is planning intent only. The apply service decides how to execute the clear.

## 8. Error Taxonomy

| Code | Legacy source | Meaning |
|---|---|---|
| `WIDGET_BINDING_PLAN_MISSING_SPEC` | `missingDataConfig` | Missing spec or required `dataConfig`. |
| `WIDGET_BINDING_PLAN_INVALID_TARGET` | new | Missing or unsupported `targetKind`. |
| `WIDGET_BINDING_PLAN_MISSING_DATASOURCE` | new | `dataConfig.datasourceId` is missing. |
| `WIDGET_BINDING_PLAN_MISSING_VISUALIZATION` | new | `visualizationType` or `visTypeConfig` is missing. |
| `WIDGET_BINDING_PLAN_TOPN_UNKNOWN` | `unknownTopNValue` | TopN value cannot be parsed from `topNOptions`. |
| `WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_AFFECTS` | `missingDimensionSelectionAffects` | Dimension selection exists but no affected slot is configured. |
| `WIDGET_BINDING_PLAN_SLOT_MISSING_DIM_ITEM` | `missingSelectedDimensionItemId` | Selected dimension has no configured item id. |
| `WIDGET_BINDING_PLAN_SLOT_REQUIRED_EMPTY` | `requiredSlotEmpty` | A required slot resolves to no column ids. |
| `WIDGET_BINDING_PLAN_SLOT_FAILED` | `buildSlotPlanFailed` | Slot planning failed in a categorized child stage. |
| `WIDGET_BINDING_PLAN_FILTER_PARAM_MAP` | `missingParameterMapping` | Widget filter key cannot resolve through `parameterMappingObj`. |
| `WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_MISSING` | new | Intentional emptying was requested but no stop-filter item id was supplied by spec/config/convention. |
| `WIDGET_BINDING_PLAN_EMPTY_DATA_FILTER_INVALID` | new | Intentional emptying resolved a stop-filter item id but no valid force-empty value could be produced. |
| `WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING` | `missingTopNHelperResult` | Count-style visible-widget TopN requires a helper result but none was supplied. |
| `WIDGET_BINDING_PLAN_TOPN_HELPER_FAILED` | `topNHelperFailed` | Supplied helper result is failed. |
| `WIDGET_BINDING_PLAN_HIERARCHY_VALUES` | `missingHierarchyValues` | Confirmed hierarchy snapshot has no usable values. |
| `WIDGET_BINDING_PLAN_HIERARCHY_SOURCE` | `missingHierarchySourceConfig` | Hierarchy source cannot resolve through `filterPropObj`. |
| `WIDGET_BINDING_PLAN_HIERARCHY_ITEM` | `missingHierarchyItemId` | Hierarchy target item id cannot be resolved. |
| `WIDGET_BINDING_PLAN_FILTER_FAILED` | `buildFilterDescriptorsFailed` | Filter planning failed in a categorized child stage. |
| `WIDGET_BINDING_PLAN_INTERNAL` | `buildBindingPlanFailed` | Public boundary catch for an unexpected planning exception. |

Warnings:

| Code | Meaning |
|---|---|
| `WIDGET_BINDING_PLAN_OPTIONAL_SLOT_EMPTY` | Optional slot resolved to no column ids and was skipped. |
| `WIDGET_BINDING_PLAN_LEGACY_SORT_FALLBACK` | Legacy single `sortByColumn` was emitted because no full `sortSpecs` could be built. |
| `WIDGET_BINDING_PLAN_HIERARCHY_NOT_CONFIRMED` | Hierarchy snapshot exists but has no confirmed selection, so no hierarchy filter/slot merge is planned. |
| `WIDGET_BINDING_PLAN_TOPN_DEFAULTED` | TopN input collapsed to default/none. |
| `WIDGET_BINDING_PLAN_TOPN_DIMENSION_FILTER_COMPOSED` | TopN include merged with an existing exclude/`includeExcludeOr` descriptor on the same `itemId` into `includeExcludeOr`. |

## 9. Determinism And Purity

The service is deterministic:

- same `BindingPlanSpec` input produces the same `BindingPlan` output;
- no calls to `Date.now`, random ids, DOM, Cognos, event bus, history or mutable widget state;
- no direct reads from `_KDB.properties`, `_KDB.config`, `_KDB.dropdownOptions`, `_KDB.state`, `_KDB.runtime` or `window`;
- all config/properties used by planning come from `spec.config`;
- outputs are newly built serializable objects and arrays;
- input objects are treated as read-only and must not be mutated.

Error handling:

- Public `buildPlan` has a local `try/catch`.
- Known invalid inputs return a failure plan.
- Unexpected exceptions are logged once with `[widgetBindingPlan.buildPlan]` and compact context, then converted to `WIDGET_BINDING_PLAN_INTERNAL`.
- Internal pure one-line helpers may remain exempt from `try/catch`; non-trivial builder helpers return failure results rather than throwing where practical.

## 10. Supersession, `opSeq` And Cancellation

This service does not own supersession:

- does not create or increment `opSeq`;
- does not create, read or abort `AbortController`;
- does not check stale runtime state;
- does not return `aborted`, `timeout` or `superseded` statuses.

Caller responsibilities:

- `widgetVis` and `widgetTopN` own caller-side stale handling. `widgetVis` increments the normal visible-widget intent `opSeq`; `widgetTopN` adopts/echoes that value for normal TopN calls and increments only for direct calls without an envelope `opSeq`.
- The caller may pass `opSeq` into `spec` for diagnostic echo only.
- If the caller supersedes work before or after planning, the plan may be discarded without any cleanup.

Previous managed-filter ids:

- `widgetBindingPlan` never returns `previousManagedFilterItemIds`.
- `managedFilterItemIds` in the plan are the new ids proposed by this plan.
- `widgetVis` owns previous managed ids in `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds`.
- `widgetBindingApply` consumes previous ids through `ApplyBindingOptions.previousManagedFilterItemIds?: string[]`, not from the plan.

## 11. History Behaviour

This service owns no history keys and never calls `_KDB.services.history`.

Rules:

- Planning has no history side effect.
- `mirrorPatch` is not a history step and is not canonical state.
- Settings/control owners commit history only after the consequence-owner confirms apply success.
- History replay re-enters through the caller's normal spec-preparation and `buildPlan` path; the planner does not branch on replay except carrying `reason` in diagnostics when supplied.

## 12. Readers / Writers

Public readers/writers:

- `buildPlan` reads only its `spec` argument.
- `buildPlan` writes nothing outside its local return object.

No selector registry is published because this service owns no `_KDB.state` subtree and exposes one deliberate named method.

## 13. Events

This service emits no events and subscribes to no events.

Reasons:

- Planning is a synchronous request/response operation.
- Known callers call `_KDB.services.widgetBindingPlan.buildPlan(spec)` directly.
- A fact-event would have no independent consumer and would pollute the event catalog.

No `events/eventNames.js` is created for this module.

## 14. DOM Boundaries

The service performs no DOM work.

Forbidden:

- `document.querySelector`, global `$`, widget shell/content/header lookup or launchpad lookup.
- Storing live DOM in `_KDB.state`, `_KDB.runtime`, `_KDB.elements` or the returned plan.
- Inferring slot/filter values from rendered DOM.

## 15. Cognos Touchpoints

None.

Forbidden:

- No `_KDB.cognosAPI.*` calls.
- No Cognos render, render-wait, data-source set, visType set, slot mutation, local-filter mutation, flat-data read or title/list-summary write.
- No attempt to verify whether Cognos will accept the plan.

`widgetBindingApply` is the first service allowed to translate the plan into Cognos effects.

## 16. Dependencies

Injected/runtime dependencies:

- `_KDB` is received only by the orchestrator so it can register `_KDB.services.widgetBindingPlan`.
- `createWidgetBindingPlanService` should not need `_KDB`; if `_KDB` is passed for factory consistency, service methods must not read from it.

AMD/internal dependencies:

- Pure builders under the service folder.
- Pure transform utilities copied or imported from approved target locations. Legacy helpers such as `rewriteUniqueNameSourceToken` and `sanitizeWidgetDownstreamDisplayValues` may be ported as precise pure files if no approved shared target exists.

No dependencies on:

- `_KDB.api.*`
- `_KDB.services.*`
- `_KDB.events`
- `_KDB.cognosAPI.*`
- `_KDB.runtime.*`
- DOM globals

## 17. Folder Layout

```txt
KDB3/js/core/services/widgetBindingPlan/
  __orchestratorWidgetBindingPlan.js
  createWidgetBindingPlanService.js
  buildPlan.js
  config/
    slotNames.js
  diagnostics/
    createPlanDiagnostics.js
    createPlanFailure.js
    createPlanSuccess.js
  parsing/
    parseTopNOption.js
  slots/
    buildSlotPlan.js
    resolveSlotColumnIds.js
    resolveSlotSortSpecs.js
  filters/
    buildLocalFilters.js
    resolveFilterItemId.js
    buildTopNFilter.js
    buildHierarchyFilter.js
  mirror/
    buildMirrorPatch.js
  utils/
    cloneSerializable.js
    normalizeDefaultValue.js
    rewriteUniqueNameSourceToken.js
    sanitizeWidgetDownstreamDisplayValues.js
```

No `state/`, `view/`, `effects/`, `events/` or `adapters/` folders are created because the service owns no state, DOM, effects, emitted events or host adapter.

## 18. Bootstrap And Integration

Required registration:

- `KDB3/js/core/services/__orchestratorServices.js` imports and calls `__orchestratorWidgetBindingPlan`.
- The orchestrator registers `_KDB.services.widgetBindingPlan`.
- `KDB3/js/KDB.js` does not need a direct service import if existing service bootstrap already calls `__orchestratorServices`; only the services orchestrator changes.

This tranche explicitly defers direct `KDB.js` bootstrap registration. Service-orchestrator registration is required during CP-2 implementation unless the implementation is staged as files-only.

Integration order:

1. `widgetBindingPlan` service registered.
2. `widgetBindingApply` service registered.
3. `widgetVis` prepares visible-widget specs and consumes plans.
4. `widgetTopN` prepares helper specs/results and consumes plans.

## 19. Caller Mapping Notes

`widgetBindingPlan` owns the canonical service-boundary shape. Callers may use different internal names, but must map to `BindingPlanSpec` before calling `buildPlan`.

### 19.1 `widgetVis`

| `widgetVis` internal input | Canonical `BindingPlanSpec` field |
|---|---|
| `changeReason` | `reason` |
| `settings.dimension` | `dataConfig.dimension` |
| `settings.visType` | `dataConfig.visualizationType` plus `dataConfig.cognosVisualizationTypeId` when known |
| `settings.topNChoice` | `dataConfig.topN` |
| `dataIdentity.kennzahlenTable` | `dataConfig.kennzahlenTable` |
| `dataIdentity.kennzahlCode` | `dataConfig.kennzahlCode` |
| `dataIdentity.datasourceName` | `dataConfig.datasourceName` |
| resolved datasource id | `dataConfig.datasourceId` |
| resolved visualization/data-table config | `dataConfig.visTypeConfig`, `dataConfig.dataTableConfig`, `dataConfig.kennzahlDefaults`, `dataConfig.visPropBucketKey` |
| `topNResult` / `topNResolved` payload | `helperTableResult` with `topNResultValues` and `topNExcludeItemId` |
| `forceEmpty` + `emptyReason` | `emptyIntent: { enabled:true, reason: emptyReason }` |
| `dienststelleChanged.payload.resolution` | `hierarchySnapshot` |
| generic `cleanupContent` with `clearBinding === true` (semantic empty) | `reason: "cleanup"` plus `emptyIntent: { enabled:true, reason: cleanupReason }` |
| `cleanupContent` with `clearBinding === true` and `reason:"settingsDelete"` | `reason: "cleanup"` plus disabled `emptyIntent` and `resetIntent: { enabled:true, scope:"visTarget", clearAllSlots:true, clearAllLocalFilters:true, reason:"settingsDelete" }` |

Rules:

- Generic cleanup / force-empty uses enabled `emptyIntent` and produces semantic emptying (`emptyData/forceEmpty` descriptor, `slotsChanged:false`).
- Settings-delete cleanup uses disabled `emptyIntent` plus enabled vis reset intent; the planner short-circuits to a reset-only full clear (`slotsChanged:true`, `slotsToClear:["all"]`, `slots:[]`, `localFilters:[]`, `managedFilterItemIds:[]`, `mirrorPatch:{}`) without slot/filter rebuild.
- `widgetVis.buildBindingSpec.js` must output the canonical `BindingPlanSpec`; it must not pass its internal `settings`, `dataIdentity`, `changeReason` or `topNResult` shapes through to the service boundary.
- `widgetVis` resolves or receives `dataConfig.datasourceId` before calling `buildPlan`.
- `widgetVis` passes previous managed-filter ids to `widgetBindingApply`, not to `widgetBindingPlan`.
- `widgetVis` may use `BindingPlan.emptyIntent` or the `emptyData/forceEmpty` descriptor to distinguish intentional empty from no-data/error diagnostics.
- For Dienststelle input, `widgetVis` must assemble a `HierarchySnapshot` object that at least wraps the payload resolution as `{ resolution: payload.resolution }`; when active downstream names or `byFilter` are needed for hierarchy slot/filter planning, `widgetVis` supplies those caller fields before invoking `buildPlan`.

### 19.2 `widgetTopN` Helper Caller Mapping

`widgetTopN` uses `buildPlan(spec)` twice for hidden helper widgets: once to configure/read a helper for a non-default TopN request, and optionally once to clean the parked helper after use.

Normal helper plan mapping:

| `widgetTopN` context | `BindingPlanSpec` field |
|---|---|
| helper widget id | `widgetId` |
| visible owner widget id | `ownerWidgetId` |
| adopted/generated sequence | `opSeq` |
| helper List/datatable visualization config | `dataConfig.visTypeConfig`, `dataConfig.visualizationType`, `dataConfig.cognosVisualizationTypeId` |
| selected TopN value | `dataConfig.topN` |
| current Dienststelle hierarchy snapshot | `hierarchySnapshot` |
| no helper result yet | `helperTableResult:null` |

Helper-target rules:

- For `targetKind:"topNHelper"`, count-style TopN is helper query intent. It may influence helper slots, sort metadata, slot options such as `limit` / `keepOnlyFirst`, or local filters needed to produce the helper result.
- For `targetKind:"topNHelper"`, `buildPlan` must not return `WIDGET_BINDING_PLAN_TOPN_HELPER_MISSING` solely because `helperTableResult` is `null`.
- For `targetKind:"vis"`, count-style TopN still requires a successful `helperTableResult` before TopN local filters can be built.
- `widgetTopN` must pass a helper-normalized `dataConfig`; a visible chart `visTypeConfig` must not be passed unchanged to a helper target.
- The helper-normalized config must be assembled from caller snapshots, especially `dataConfig.dataTableConfig` plus `spec.config` material. The planner validates the result but does not discover helper visualization config from mutable state.

Helper cleanup mapping:

| `widgetTopN` cleanup context | `BindingPlanSpec` field |
|---|---|
| cleanup request | `reason:"cleanup"` |
| helper target | `targetKind:"topNHelper"` |
| technical helper reset | `resetIntent:{ enabled:true, scope:"helperTarget", clearAllSlots:true, clearAllLocalFilters:true, reason:"postResolution" }` |
| intentional emptying | `emptyIntent:{ enabled:false, reason:null, itemId:null, value:null }` |
| helper result | `helperTableResult:null` |

Cleanup rules:

- `reason:"cleanup"` with `targetKind:"topNHelper"` and `resetIntent.enabled === true` is a reset-only helper plan.
- `reason:"cleanup"` with `targetKind:"vis"`, `resetIntent.enabled === true`, and (`resetIntent.reason === "settingsDelete"` or `resetIntent.scope === "visTarget"`) is a reset-only vis plan for settings-delete cleanup.
- Reset-only cleanup plans emit `slots:[]`, `localFilters:[]`, `managedFilterItemIds:[]` and `mirrorPatch:{}`; `widgetBindingApply` performs the technical reset.
- Cleanup does not emit an `emptyData/forceEmpty` descriptor and does not require an empty-filter item id.
- The planner does not remove previous managed filters itself; `widgetTopN` passes runtime `previousManagedFilterItemIds` to `widgetBindingApply.applyBinding`.

## 20. Out Of Scope

- Applying the plan to Cognos, rendering, render-wait, timeout and abort handling (`widgetBindingApply`).
- Testing whether Cognos accepts slot/filter/visType intent.
- Reading helper rows or extracting TopN result values (`tableDataService` / `widgetTopN`).
- Committing settings, derived widget state, managed-filter state, last-confirmed plans or history (`widgetSettings`, `widgetVis`, `widgetTopN`).
- Inline rollback/replay of last-good plans.
- Title, legend, tooltip, drillthrough, focus mode and list-summary cosmetic writebacks. Instance `setCustomLabel` on a slot data item is **not** this bucket: the planner only emits `options.customLabel`; apply performs the host write (`contracts/visualization-dimension-custom-label-contractdelta.md`).
- Launchpad, canvas placement, widget cleanup ownership and DOM movement.
- Cross-module integration tests.
- Editing `.cursor/rules/`, templates, authority docs or legacy trees.

## 21. Resolved CP-1 Questions

| Former question | Decision |
|---|---|
| Q1: Should `spec.reason` explicitly drive `slotsChanged`? | **CONFIRMED.** `reason` is canonical and drives `slotsChanged`; the planner does not infer reason from field diffs. |
| Q2: Is `targetKind:"topNHelper"` / `"dataTableHelper"` allowed now? | **CONFIRMED.** It is a declarative discriminator only; helper claim/query/apply remains outside this service. |
| Q3: Rename legacy `slotPlan` / `filterDescriptors`? | **CONFIRMED.** Boundary names are `slots` and `localFilters`. |
| Q4: Keep `managedFilterItemIds` and `slotsToClear`? | **CONFIRMED.** They remain declarative hints/output. Previous managed ids are not plan output and move through apply options. |
| Q5: Canonical TopN parser shape? | **CONFIRMED.** `parseTopNOption(raw, topNOptions)` is canonical; no `_KDB.dropdownOptions` read. |
| Q6: Keep `hierarchyTarget`? | **CONFIRMED.** Optional future field in `DataConfig`; not a blocker and not a state write. |
| Q7: Emit warnings for skipped optional slots/defaulted TopN? | **CONFIRMED.** Planning warnings are useful and replace legacy silent skips where they clarify behavior. |
| Slot options `limit` / `keepOnlyFirst` | **CONFIRMED FOR V1.** They remain in `SlotPlanItem.options`; `widgetBindingApply` must consume them or return an explicit unsupported-operator/apply error. |
| Intentional emptying trigger | **CONFIRMED.** `emptyIntent.enabled === true` triggers planning of `emptyData/forceEmpty`; `config.emptyDataFilter` is only the stop-filter convention/default. |
| Cleanup reason slot policy | **CONFIRMED.** `reason:"cleanup"` with `targetKind:"topNHelper"` and `resetIntent.enabled === true` is a reset-only helper plan with no slot/filter rebuild. `reason:"cleanup"` with `targetKind:"vis"` and vis reset intent (`settingsDelete` or `scope:"visTarget"`) is a reset-only vis plan with `slotsChanged:true` and no slot/filter rebuild. |

## 22. Cross-Contract Alignment Log

### 22.1 Deltas Made In `widgetBindingPlan.md`

- Added `BindingPlanSpec.emptyIntent?: { enabled, reason?, itemId?, value? }`.
- Added `BindingPlan.emptyIntent` as the canonical summary for intentional emptying.
- Formalized conversion from `emptyIntent.enabled === true` to `localFilters[]` descriptor `{ kind:"emptyData", mode:"forceEmpty", itemId, values:["1"], reason }`.
- Clarified `config.emptyDataFilter` as convention/default only, not a trigger.
- Clarified consumers may derive `emptyMode` / `emptyReason` from `BindingPlan.emptyIntent` or from the force-empty descriptor.
- Clarified `previousManagedFilterItemIds` is never plan output.
- Kept `SlotPlanItem.options.limit` / `keepOnlyFirst` in v1 and marked them apply-consumed.
- Added `widgetVis` caller mapping notes.
- Added `widgetTopN` helper caller mapping: `targetKind:"topNHelper"` accepts `helperTableResult:null`, uses helper-normalized `dataConfig`, and cleanup uses `reason:"cleanup"` plus `resetIntent.enabled === true`.
- Replaced open questions with resolved CP-1 decisions.

### 22.2 Required Downstream Deltas For `widgetBindingApply.md`

- §4.2 `ApplyBindingOptions`: add `previousManagedFilterItemIds?: string[]`.
- §5 consumed plan shape: consume final `BindingPlan` fields `widgetId`, `ownerWidgetId`, `opSeq`, `emptyIntent`, and `localFilters[].reason`.
- §5 / §9 filter descriptor shape: align `values` as required `string[]`; keep `kind`, `mode`, `itemId`, `values`, `options`, optional `reason`.
- §7 step 8: remove `plan.previousManagedFilterItemIds[]`; use `options.previousManagedFilterItemIds`.
- §7 / §9 slot apply: consume `SlotPlanItem.options.limit` / `keepOnlyFirst` or fail explicitly when unsupported.
- §6 diagnostics: expose optional `emptyMode` / `emptyReason`, derived from `plan.emptyIntent` or the `emptyData/forceEmpty` descriptor.
- §6 result rules: `mirrorPatch` is non-null only on `status:"success"`; `timeout`, `error` and `aborted` return `mirrorPatch:null`.
- §10-§12: clarify `aborted` as expected caller-owned supersession, not a binding error.
- §22 Q2: update previous managed-filter decision to `ApplyBindingOptions.previousManagedFilterItemIds`.

### 22.3 Required Downstream Deltas For `widgetVis.md` And `widgetVis-port-execution-spec.md`

- Rewrite §7 Binding Pipeline Contract to output canonical `BindingPlanSpec`.
- Map `changeReason -> reason`.
- Map `settings + dataIdentity -> dataConfig`, including resolved `datasourceId`, `visTypeConfig`, `dataTableConfig`, `kennzahlDefaults`, `visPropBucketKey`, dimension/topN and visualization fields.
- Map `topNResult` / `topNResolved -> helperTableResult`.
- Map `dienststelleChanged.payload.resolution -> hierarchySnapshot`.
- Map `forceEmpty + emptyReason -> emptyIntent`.
- Remove `emptyMode` as a required plan field; derive intentional-empty status from `plan.emptyIntent`, force-empty descriptor or apply diagnostics.
- Pass previous managed-filter ids from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds` to `widgetBindingApply.applyBinding(..., { previousManagedFilterItemIds })`.
- Treat `aborted` as normal supersession: no settings commit and no settings error.
- Commit/report settings/history only after `widgetBindingApply` returns `status:"success"`.
- Use `mirrorPatch` only from successful apply results.

## 23. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ buildPlan }` under `_KDB.services.widgetBindingPlan`.
2. `buildPlan(spec)` has an exact input schema and output schema.
3. No `_KDB.state` writes, `_KDB.runtime` ownership, DOM access, event use, history calls or Cognos calls are allowed.
4. `spec.reason` and `targetKind` are explicit inputs and copied to diagnostics.
5. Slot planning specifies slot names, ordered column ids, sort metadata and slot options only.
6. Filter planning specifies descriptor intent only, including `emptyIntent -> emptyData/forceEmpty`; Cognos filter-body translation is excluded.
7. `mirrorPatch` is documented as caller-owned proposal material only.
8. Error taxonomy maps observed legacy failures into `WIDGET_BINDING_PLAN_*` codes.
9. Supersession/opSeq/cancellation are caller-owned and diagnostics-only for this service.
10. Previous managed-filter ids are excluded from plan output and delegated to apply options.
11. Slot limit/first-item options are either apply-consumed or fail explicitly downstream.
12. Cross-contract handoff deltas for apply and vis are documented.
13. Legacy deltas are documented.
14. CP-2 implementation can map each production file to legacy evidence and rule obligations.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub` | Planner (Claude Opus 4.8) | Initial outline from widgets-domain blueprint. |
| 2026-06-07 | `Stub -> Draft CP-1` | `<pending>` | Full composed-port contract expanded: plan-only named service API, explicit spec/plan schemas, slot/filter/mirror boundaries, no Cognos/state/runtime/history ownership. |
| 2026-06-07 | `Draft CP-1 -> Contract freeze draft` | `<pending>` | Sequential alignment pass: `emptyIntent` canonicalized, previous managed filters moved to apply options, slot options marked apply-consumed, `widgetVis` mapping and downstream deltas recorded. |
| 2026-09-11 | Grouping-A pending pointer | captain; PO A-shape lock | `kennzahlDefaults` packs become `stichtag` \| `jahr` \| `list` via factory. Live JS still vis-type packs. Delta: `contracts/widgetVis-grouping-jahr-stichtag-contractdelta.md`. |
| 2026-09-11 evening | Grouping-A Implemented | PO vastenburg | Inherit titelhaakjes green. Factory packs live. Chrome is grouping-delta Step B. |
| 2026-09-30 | Chosen-dimension caption sort | PO vastenburg | Extra `captionAscending` spec after Jahr/Monat, outside the List cap of two. Facet `{ by: "caption", type: "asc" }`, no `custom.top`. `sorting.js` unchanged. |

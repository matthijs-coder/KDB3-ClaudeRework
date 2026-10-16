# Execution Spec: `widgetBindingPlan` (`full port`)

> Execution handoff for the shared planning service after CP-1 approval of `contracts/widgetBindingPlan.md`. This spec is mechanical: the executing AI implements the approved contract and does not make architecture decisions.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetBindingPlan.md`
**Phase:** `files-only CP-2 implementation`
**Authoring AI:** GPT-5.5, 2026-06-07
**Executing AI:** `<pending>`
**Reviewer:** `<user / supervising planner>`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing output files, then echo back a one-sentence summary for each item. Execution starts only after the reviewer accepts the echo.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — summary: `_KDB` has fixed top-level namespaces; services publish under `_KDB.services`; forbidden legacy namespaces are not used in new code.
2. `_____________KDB3API/.cursor/rules/state.mdc` — summary: `_KDB.state` is serializable owner-written state; this service owns no state and writes no state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — summary: `_KDB.runtime` holds owner-private technical resources; this pure service owns no runtime buckets.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — summary: shared services expose one named-method surface under `_KDB.services.<service>`; this service exposes only `buildPlan`.
5. `_____________KDB3API/.cursor/rules/events.mdc` — summary: events are for documented facts/requests with consumers; this service emits and subscribes to none.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — summary: new services require an approved contract first, canonical orchestrator/service factory roles, precise folders and size discipline.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — summary: English technical names, camelCase identifiers, precise verb+noun files and underscore prefixes only for boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: named executable/public boundaries use local try/catch unless pure/exempt; failures are logged once and converted at boundaries.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — summary: DOM refs/selectors follow strict placement rules; this service performs no DOM access.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — summary: production JS uses full-compact AMD `define([...], function (...) { ... })`, one top-level define and no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — summary: lifecycle terms are canonical; this service owns no lifecycle state.
12. `_____________KDB3API/contracts/widgetBindingPlan.md` — summary: the approved plan-only contract defines `buildPlan(spec)` and all input/output/error boundaries.
13. `_____________KDB3API/contracts/widgetBindingApply.md` — summary: apply consumes plans and owns Cognos mutation/render/abort/timeout; those concerns stay out of `widgetBindingPlan`.
14. This execution spec itself — summary: implement only the files and behavior specified here; stop on gaps instead of inventing behavior.

Forbidden pre-flight behavior: do not read legacy JS directly. The legacy mapping below is already distilled from read-only investigation. If a missing detail seems to require legacy re-inspection, stop and ask the planner to run a read-only investigation subagent.

---

## Section B. Folder tree

This is a files-only implementation task. Create only these production files under the target path:

```txt
_____________KDB3API/KDB3/js/core/services/widgetBindingPlan/
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

Do not create `state/`, `view/`, `effects/`, `events/`, `adapters/`, CSS, tests or harness files in this phase.

Do not modify `KDB3/js/core/services/__orchestratorServices.js` or `KDB3/js/KDB.js` in this task. Service bootstrap/integration is a separate CP-2 diff-walk task after the files-only service implementation is reviewed.

---

## Section C. Per-file specifications

Every production file uses AMD full-compact form and returns exactly one value. Factory-scope helpers are allowed; nested function definitions inside entry functions, callbacks or return paths are forbidden.

### `__orchestratorWidgetBindingPlan.js`

- **Role**: service orchestrator.
- **Lines**: target 35, hard limit 80.
- **AMD imports**:
  - `"./createWidgetBindingPlanService.js"`
- **Factory parameters**:
  - `_createWidgetBindingPlanService`
- **Entry function**:
  - Name: `__orchestrator`
  - Parameters: `_KDB`, `_options`
  - Body steps:
    1. Ensure `_KDB.services` exists.
    2. Create the service through `_createWidgetBindingPlanService(_options || {})`.
    3. Assign `_KDB.services.widgetBindingPlan = service`.
    4. Return the service.
- **Return value**: `__orchestrator`.
- **Rules to apply**:
  - `amd.mdc` — full-compact AMD, named `__orchestrator`, no business logic.
  - `kdb-object.mdc` — register only under `_KDB.services.widgetBindingPlan`.
  - `feature-structure.mdc` — thin orchestrator; no planning logic.
  - `naming.mdc` — underscore prefixes on boundary inputs only.
  - `module-public-api.mdc` — service surface is one named-method object.
  - `error-handling.mdc` — try/catch around orchestrator registration; log and rethrow because bootstrap owns failure handling.

### `createWidgetBindingPlanService.js`

- **Role**: service factory.
- **Lines**: target 60, hard limit 120.
- **AMD imports**:
  - `"./buildPlan.js"`
- **Factory parameters**:
  - `_buildPlan`
- **Entry function**:
  - Name: `createWidgetBindingPlanService`
  - Parameters: `_options`
  - Body steps:
    1. Return `{ buildPlan: buildPlan }`.
    2. `buildPlan(_spec)` delegates to `_buildPlan(_spec)`.
    3. Do not expose `destroy`, `dispatch`, `getState` or read methods.
- **Return value**: `createWidgetBindingPlanService`.
- **Rules to apply**:
  - `amd.mdc` — service factory AMD shape.
  - `module-public-api.mdc` — named-method service surface, exactly `{ buildPlan }`.
  - `state.mdc` — no state reads/writes.
  - `runtime.mdc` — no runtime buckets.
  - `error-handling.mdc` — do not add a second catch/log wrapper; `buildPlan.js` owns the single unexpected-error catch/log boundary.
  - `naming.mdc` / `feature-structure.mdc` — canonical factory naming and size.

### `buildPlan.js`

- **Role**: pure planner orchestrator.
- **Lines**: target 110, hard limit 150.
- **AMD imports**:
  - `"./parsing/parseTopNOption.js"`
  - `"./slots/buildSlotPlan.js"`
  - `"./filters/buildLocalFilters.js"`
  - `"./mirror/buildMirrorPatch.js"`
  - `"./diagnostics/createPlanDiagnostics.js"`
  - `"./diagnostics/createPlanFailure.js"`
  - `"./diagnostics/createPlanSuccess.js"`
- **Entry function**:
  - Name: `__controller`
  - Parameters: `_spec`
  - Body steps:
    1. Create base diagnostics from `_spec`.
    2. Validate required `spec`, `targetKind`, `dataConfig`, `datasourceId`, `visualizationType`, `visTypeConfig` and `config`.
    3. Parse TopN with `_parseTopNOption(dataConfig.topN, spec.config.topNOptions)`.
    4. Build slots with `_buildSlotPlan(spec, parsedTopN, diagnostics)`.
    5. Resolve `emptyIntent`: when `spec.emptyIntent.enabled === true`, resolve `itemId` in the order `spec.emptyIntent.itemId -> spec.config.emptyDataFilter.itemId -> dataConfig/convention`, normalize `value` to `"1"`, and fail with the contract's empty-data error code when no valid stop-filter item id/value exists.
    6. Resolve `resetIntent`: normalize explicit technical reset intent; for `targetKind:"topNHelper"` allow helper full reset with `clearAllSlots:true` and `clearAllLocalFilters:true`; for `targetKind:"vis"` with cleanup reset intent (`settingsDelete` or `scope:"visTarget"`) preserve vis reset-only intent.
    7. Build local filters with `_buildLocalFilters(spec, parsedTopN, resolvedEmptyIntent, diagnostics)`.
    8. Build mirror patch with `_buildMirrorPatch(spec, parsedTopN, filterResult, diagnostics)`.
    9. For reset-only cleanup (`targetKind:"topNHelper"` + `reason:"cleanup"` + `resetIntent.enabled === true`, or `targetKind:"vis"` + `reason:"cleanup"` + vis reset intent), return a reset-only plan with `slots:[]`, `localFilters:[]`, `managedFilterItemIds:[]` and `mirrorPatch:{}`.
    10. Compute `slotsChanged` and `slotsToClear` from `spec.reason` and reset intent.
    11. Return `_createPlanSuccess(...)` with `emptyIntent`, `resetIntent`, `managedFilterItemIds`, `slots`, `localFilters`, `mirrorPatch`, and diagnostics counts.
    12. Convert known invalid stages to `_createPlanFailure(...)`; catch unexpected errors and return `WIDGET_BINDING_PLAN_INTERNAL`.
- **Return value**: `__controller`.
- **Rules to apply**:
  - `amd.mdc` — named factory-scope helpers only.
  - `error-handling.mdc` — local try/catch at public planner boundary; known validation returns failure plan.
  - `state.mdc` / `runtime.mdc` / `dom.mdc` / `events.mdc` — no reads/writes/resources/DOM/events.
  - `module-public-api.mdc` — implements service method behavior only, no extra surface.
  - `naming.mdc` / `feature-structure.mdc` — precise names and line limit.

### `config/slotNames.js`

- **Role**: declarative constants.
- **Lines**: target 30, hard limit 80.
- **AMD imports**: none.
- **Return value**: object containing slot name constants and required slot set.
- **Rules to apply**:
  - `amd.mdc` — AMD object export.
  - `naming.mdc` — constants use `UPPER_SNAKE_CASE`.
  - `feature-structure.mdc` — config folder contains declarative definitions only.

### `diagnostics/createPlanDiagnostics.js`

- **Role**: diagnostics builder.
- **Lines**: target 60, hard limit 100.
- **AMD imports**: none.
- **Entry function**: `__controller(_spec)`.
- **Behavior**: return the initial diagnostics shape from the contract with `service`, `operation`, correlation fields, warning list and zero counts.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — serializable object only.

### `diagnostics/createPlanFailure.js`

- **Role**: failure result builder.
- **Lines**: target 70, hard limit 110.
- **AMD imports**:
  - `"../utils/cloneSerializable.js"`
- **Entry function**: `__controller(_context)`.
- **Behavior**: return a full failure `BindingPlan` with empty `slots`, `localFilters`, `managedFilterItemIds`, `emptyIntent:{ enabled:false, reason:null, itemId:null, value:null }`, `mirrorPatch`, `slotsChanged:false`, `slotsToClear:[]`, normalized `errorCode`, optional `legacyError`, and cloned diagnostics.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `error-handling.mdc` — pure result builder can avoid try/catch if implemented as straightforward transformation.
  - `state.mdc` — serializable only.

### `diagnostics/createPlanSuccess.js`

- **Role**: success result builder.
- **Lines**: target 80, hard limit 120.
- **AMD imports**:
  - `"../utils/cloneSerializable.js"`
- **Entry function**: `__controller(_context)`.
- **Behavior**: return successful `BindingPlan` from datasource, visualization, slots, filters, `managedFilterItemIds`, `emptyIntent`, mirror patch, slotsChanged/slotsToClear and diagnostics counts.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — clone/serialize output, no live references.

### `parsing/parseTopNOption.js`

- **Role**: pure parser.
- **Lines**: target 70, hard limit 110.
- **AMD imports**:
  - `"../utils/normalizeDefaultValue.js"`
- **Entry function**: `__controller(_rawValue, _topNOptions)`.
- **Behavior**: default sentinels `""`, `"default"`, `"none"` return `{ kind:"default" }`; normalize `top N` / `top-N`; resolve count options from `_topNOptions`; unknown returns `{ kind:"unknown", value }`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `kdb-object.mdc` — no `_KDB.dropdownOptions` read; options are injected.
  - `error-handling.mdc` — pure parser returns tagged result, does not throw for unknown values.

### `slots/buildSlotPlan.js`

- **Role**: pure slot-plan builder.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"../config/slotNames.js"`
  - `"./resolveSlotColumnIds.js"`
  - `"./resolveSlotSortSpecs.js"`
- **Entry function**: `__controller(_spec, _parsedTopN, _diagnostics)`.
- **Behavior**: enumerate active slots from `visTypeConfig`, resolve ordered `columnIds`, merge hierarchy column intent where confirmed, attach sort metadata, skip empty optional slots with warning, fail empty required slots.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` / `runtime.mdc` / `dom.mdc` — pure serializable planning only.
  - `error-handling.mdc` — non-trivial executable helper returns `{ ok:false, errorCode }` for known failures.

### `slots/resolveSlotColumnIds.js`

- **Role**: pure slot column resolver.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"../utils/rewriteUniqueNameSourceToken.js"`
  - `"../utils/normalizeDefaultValue.js"`
- **Entry function**: `__controller(_context)`.
- **Behavior**: resolve defaults, `replaceKennzahlName`/kennzahl placeholders, dimension overlays, list grid ordering, pie category override, repeatHorizontal and hierarchy-slot merge. Return `{ ok, columnIds, options?, errorCode?, legacyError? }`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — no mutation of input config; clone arrays.
  - `error-handling.mdc` — return tagged failures for missing dimension item config.

### `slots/resolveSlotSortSpecs.js`

- **Role**: pure sort metadata resolver.
- **Lines**: target 70, hard limit 110.
- **AMD imports**: none.
- **Entry function**: `__controller(_slotName, _columnIds, _dataTableConfig)`.
- **Behavior**: derive `sortSpecs[]` from `dataTableConfig.sorting`; list/grid may include up to two ordered specs; single-column legacy fallback may set `sortByColumn`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — pure read from supplied config only.

### `filters/buildLocalFilters.js`

- **Role**: pure local-filter planner.
- **Lines**: target 130, hard limit 150.
- **AMD imports**:
  - `"./resolveFilterItemId.js"`
  - `"./buildTopNFilter.js"`
  - `"./buildHierarchyFilter.js"`
  - `"../utils/cloneSerializable.js"`
- **Entry function**: `__controller(_spec, _parsedTopN, _resolvedEmptyIntent, _diagnostics)`.
- **Behavior**: build descriptors in order: `visTypeConfig.widgetFilter`, `kennzahlDefaults`, dimension filters, resolved intentional-emptying descriptor, TopN filter, hierarchy filter. Deduplicate/upsert by `itemId`; return descriptors, managed ids and TopN fields for mirror patch.
- **Behavior addendum**: intentional emptying is emitted only from the resolved empty intent as `{ kind:"emptyData", mode:"forceEmpty", itemId:"<stopFilter item id>", values:["1"], reason?: string }`; the stop-filter `itemId` resolution order is `spec.emptyIntent.itemId -> spec.config.emptyDataFilter.itemId -> dataConfig/convention`, never mutable widget state.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — pure descriptors only, no mutable widget-state lookup and no filter body construction.
  - `error-handling.mdc` — tagged failures for mapping/helper/hierarchy issues.

### `filters/resolveFilterItemId.js`

- **Role**: pure filter item resolver.
- **Lines**: target 70, hard limit 110.
- **AMD imports**: none.
- **Entry function**: `__controller(_key, _parameterMappingObj)`.
- **Behavior**: bracketed Cognos ids pass through; symbolic keys resolve through `<key>_widget_localfilter_KID`; missing map returns `WIDGET_BINDING_PLAN_FILTER_PARAM_MAP`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `kdb-object.mdc` — no direct `_KDB.properties` read.

### `filters/buildTopNFilter.js`

- **Role**: pure TopN descriptor builder.
- **Lines**: target 80, hard limit 120.
- **AMD imports**: none.
- **Entry function**: `__controller(_spec, _parsedTopN)`.
- **Behavior**: if TopN default, return no descriptor; if count, require successful helper result with `topNResultValues` and `topNExcludeItemId`; return descriptor `{ kind:"topN", mode:"include", itemId, values }`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `error-handling.mdc` — tagged failures for unknown/missing/failed helper.

### `filters/buildHierarchyFilter.js`

- **Role**: pure hierarchy descriptor builder.
- **Lines**: target 100, hard limit 140.
- **AMD imports**:
  - `"../utils/rewriteUniqueNameSourceToken.js"`
  - `"../utils/sanitizeWidgetDownstreamDisplayValues.js"`
- **Entry function**: `__controller(_spec)`.
- **Behavior**: when hierarchy selection is confirmed, resolve source config and item id through `filterPropObj`, rewrite/sanitize values, and return hierarchy keepexclude descriptor; unconfirmed hierarchy returns no descriptor plus warning.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — pure descriptor only.
  - `error-handling.mdc` — tagged failures for missing hierarchy values/source/item.

### `mirror/buildMirrorPatch.js`

- **Role**: pure mirror proposal builder.
- **Lines**: target 80, hard limit 120.
- **AMD imports**:
  - `"../utils/normalizeDefaultValue.js"`
- **Entry function**: `__controller(_spec, _parsedTopN, _filterResult)`.
- **Behavior**: return caller-owned proposal with visualization type, normalized dimension, normalized topN, helper TopN fields when applicable, datasource id/name. Never write state.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.
  - `state.mdc` — mirror patch is serializable proposal only.

### `utils/cloneSerializable.js`

- **Role**: pure clone utility.
- **Lines**: target 35, hard limit 80.
- **AMD imports**: none.
- **Entry function**: `__controller(_value)`.
- **Behavior**: clone serializable arrays/objects; return primitives as-is; no DOM/function support.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `utils/normalizeDefaultValue.js`

- **Role**: pure normalization utility.
- **Lines**: target 45, hard limit 80.
- **AMD imports**: none.
- **Entry function**: `__controller(_value)`.
- **Behavior**: collapse `null`, `undefined`, `""`, `"default"` and `"none"` to canonical default checks while preserving non-default strings.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `utils/rewriteUniqueNameSourceToken.js`

- **Role**: pure Cognos unique-name string transformer.
- **Lines**: target 80, hard limit 120.
- **AMD imports**: none.
- **Entry function**: `__controller(_value, _sourceToken, _targetToken)`.
- **Behavior**: port only the pure rewrite behavior needed by slots/hierarchy filters; no `_KDB`, state, DOM or Cognos calls.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

### `utils/sanitizeWidgetDownstreamDisplayValues.js`

- **Role**: pure hierarchy value sanitizer.
- **Lines**: target 80, hard limit 120.
- **AMD imports**: none.
- **Entry function**: `__controller(_values)`.
- **Behavior**: port only the pure value normalization needed by hierarchy filter descriptors; return a new string array.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

---

## Section D. State behavior table

This service has no reducer and no state behavior.

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| n/a | n/a | No `_KDB.state` subtree is owned or written. | n/a |

---

## Section E. Published selectors

None.

| Selector | Reads | Returns |
|---|---|---|
| n/a | n/a | n/a |

---

## Section F. Public API wiring

- Surface: `_KDB.services.widgetBindingPlan`
- Methods exposed: `buildPlan`
- `_KDB.runtime.widgetBindingPlan` initialization: none
- `_KDB.state.widgetBindingPlan` initialization: none
- Bootstrap target: deferred. A later CP-2 diff-walk may update `KDB3/js/core/services/__orchestratorServices.js` to import and call `__orchestratorWidgetBindingPlan.js`; this files-only task does not change bootstrap files.

---

## Section G. Legacy Evidence Mapping

The executing AI must not re-read legacy JS. Use this mapping as evidence and stop if more evidence is needed.

| New production file | Legacy evidence | Composition / alignment note |
|---|---|---|
| `createWidgetBindingPlanService.js` | `buildBindingPlan.js`, `configureLiveWidget.js` callsite | New named-method surface wrapping the pure planner. |
| `__orchestratorWidgetBindingPlan.js` | No direct legacy module; blueprint service registration | New KDB3 service registration under `_KDB.services`. |
| `buildPlan.js` | `buildBindingPlan.js` | Compose validate -> TopN parse -> slots -> filters -> mirror -> success/failure plan. |
| `config/slotNames.js` | `buildSlotPlan.js` slot constants | Preserve slot vocabulary and required-slot distinction. |
| `diagnostics/*` | `buildBindingPlan.js` failure helpers | Normalize legacy string failures into `WIDGET_BINDING_PLAN_*` result objects. |
| `parsing/parseTopNOption.js` | `parseTopNOption.js`, `live/topN/core/parseTopNOption.js` | Prefer injectable `topNOptions` signature; no `_KDB.dropdownOptions` read. |
| `slots/buildSlotPlan.js` | `buildSlotPlan.js` | Pure slot intent; no Cognos mutation twin. |
| `slots/resolveSlotColumnIds.js` | `buildSlotPlan.js`, `applyLiveWidgetSlots.js` duplicate logic | Pull shared slot-id resolution into pure helper. |
| `slots/resolveSlotSortSpecs.js` | `buildSlotPlan.js` sort metadata | Normalize `sortSpecs[]`; legacy `sortByColumn` fallback allowed. |
| `filters/buildLocalFilters.js` | `buildFilterDescriptors.js`; `widgetBindingApply` contract delta for intentional emptying | Pure descriptor building; includes `emptyData/forceEmpty` intent when specified; no Cognos filter-body construction and no mutable state lookup. |
| `filters/resolveFilterItemId.js` | `buildFilterDescriptors.js`, `applyLiveWidgetLocalFilters.js` duplicate resolver | Parameter mapping is injected through spec config. |
| `filters/buildTopNFilter.js` | `buildFilterDescriptors.js`, `applyLiveWidgetTopN.js` output shape | Consume caller-supplied helper result; do not query helper. |
| `filters/buildHierarchyFilter.js` | `buildFilterDescriptors.js`, `applyHierarchyToHelperTable.js` parallel logic | Plan hierarchy descriptor only; apply service builds body. |
| `mirror/buildMirrorPatch.js` | `buildMirrorPatch.js`, `live/topN/core/buildMirrorPatch.js` | Caller-owned mirror proposal; no state commit. |
| `utils/rewriteUniqueNameSourceToken.js` | Legacy pure rewrite utility | Port pure string rewrite only. |
| `utils/sanitizeWidgetDownstreamDisplayValues.js` | Legacy hierarchy sanitizer | Port pure value sanitizer only. |

---

## Section H. Acceptance criteria

The executing AI must self-verify before reporting back:

1. Every file from Section B exists and no extra folder/file was created.
2. `_KDB.services.widgetBindingPlan` exposes exactly `{ buildPlan }`.
3. No file reads or writes `_KDB.state`, `_KDB.runtime`, `_KDB.events`, `_KDB.api`, `_KDB.services` or `_KDB.cognosAPI`, except the orchestrator writing `_KDB.services.widgetBindingPlan`.
4. No file uses DOM APIs, jQuery, timers, AbortController, Promise coordination or Cognos wrappers.
5. No file reads `window`, `window.top`, `_KDB.properties`, `_KDB.dropdownOptions` or legacy forbidden namespaces.
6. `buildPlan(spec)` is synchronous and deterministic for the same serializable spec.
7. `spec.reason` drives `slotsChanged` exactly as in the contract.
8. Output uses `slots` and `localFilters`, not legacy public names `slotPlan` / `filterDescriptors`.
9. Filter descriptors are intent only, including `emptyData/forceEmpty`, `include`, `exclude`, `contains`, `beginsWith`, `includeExcludeOr` and `hierarchyKeepexclude`; no Cognos filter body is built in this service.
10. `emptyData/forceEmpty` stop-filter `itemId` is sourced from the serializable spec/config/convention and not looked up from mutable widget state.
11. `emptyIntent.itemId` resolution order is `spec.emptyIntent.itemId -> spec.config.emptyDataFilter.itemId -> dataConfig/convention`.
12. Successful plan output contains `emptyIntent` and `managedFilterItemIds`; failure output contains the empty failure `emptyIntent` shape and empty `managedFilterItemIds`.
13. `mirrorPatch` is returned only as proposal data and is never committed.
14. Known validation failures return failure plans with `WIDGET_BINDING_PLAN_*` codes.
15. Unexpected boundary errors log once in `buildPlan.js` and return `WIDGET_BINDING_PLAN_INTERNAL`; `createWidgetBindingPlanService.js` delegates without duplicate logging.
16. All production files use full-compact AMD and obey line targets/hard limits.
17. `ReadLints` passes for all created files.

---

## Section I. Forbidden actions

The executing AI must not:

- Modify `.cursor/rules/`, lifecycle vocabulary, templates, blueprint or authority docs.
- Modify `contracts/widgetBindingPlan.md` or this execution spec during execution.
- Read or modify legacy trees (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`, `TEST/`) without a new planner-approved investigation task.
- Create production files outside `KDB3/js/core/services/widgetBindingPlan/`.
- Modify `KDB3/js/core/services/__orchestratorServices.js` or add bootstrap registration in `KDB.js`; bootstrap registration is a separate CP-2 diff-walk task only if explicitly approved.
- Add DOM, Cognos, render, timeout, AbortController, state, runtime, event or history behavior.
- Commit, push or change git config.
- Invent behavior beyond the approved contract.

---

## Section J. Reporting template

Final execution report must include:

1. Pre-flight echo: the 14 summaries from Section A.
2. File checklist: every created path, line count and `matches spec | deviation`.
3. Deviations: any deviation with file path, motivation and rule consulted.
4. Self-verification: pass/fail for every Section H criterion.
5. Open questions: anything not covered by the contract/spec.

---

## Section K. Reviewer handoff

The supervising planner/reviewer must:

1. Verify pre-flight echo is present and correct.
2. Read every created production file.
3. Run `ReadLints` on all created JS files.
4. Cross-check each file against Section C and Section H.
5. Decide: accept, request fix-spec iteration, or escalate.

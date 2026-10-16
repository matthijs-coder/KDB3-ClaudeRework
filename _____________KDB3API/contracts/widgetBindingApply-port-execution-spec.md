# Execution Spec: `widgetBindingApply` (full port)

> Execution handoff for the `widgetBindingApply` shared service after CP-1 approval. This spec is mechanical: implement exactly the approved contract in `contracts/widgetBindingApply.md`; do not make new architecture decisions.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/widgetBindingApply.md`
**Phase:** `full port`
**Authoring AI:** GPT-5.5, 2026-06-07
**Executing AI:** `<pending>`
**Reviewer:** `<user>`

---

## Section A. Pre-flight read list

The executing AI must read each file below before producing code and must echo one sentence per item before file creation.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` has fixed top-level namespaces; services register under `_KDB.services` and no new top-level namespace is allowed without approval.
2. `_____________KDB3API/.cursor/rules/state.mdc` — `_KDB.state` is serializable and owner-written only; this service must not write widget state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources live under owner buckets and require cleanup; service teardown must abort/clear owned runtime references.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — shared services expose a single named-method surface and guard disposed instances.
5. `_____________KDB3API/.cursor/rules/events.mdc` — events are only for documented facts/requests; this service emits none.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — service files follow factory/orchestrator layout, contract-first gating and size limits.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, verb+noun files, canonical orchestrator/factory names and underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — named executables and async Cognos effects need local try/catch; aborts are filtered and returned as expected status.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors/live DOM do not belong in this service; no DOM queries are allowed.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — production JS uses one full-compact AMD `define([...], function (...) { ... })` per file, no ES modules.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle terms are canonical; this service owns no lifecycle state.
12. `_____________KDB3API/contracts/widgetBindingApply.md` — approved CP-1 contract to implement.
13. `_____________KDB3API/contracts/widgetBindingPlan.md` — sibling plan service contract; consume only its public output shape.
14. This execution spec.

## Section B. Folder tree

```txt
_____________KDB3API/KDB3/js/core/services/widgetBindingApply/
  __orchestratorWidgetBindingApply.js
  createWidgetBindingApplyService.js
  config/
    defaults.js
  diagnostics/
    createDiagnostics.js
    createApplyResult.js
  effects/
    applyBindingPlan.js
    applySlots.js
    applyLocalFilters.js
    buildFilterBody.js
    waitForRender.js
```

No `state/`, `view/`, `events/` or `adapters/` folders are created.

## Section C. Legacy mapping table

| New production file | Legacy evidence | Composition / alignment note |
|---|---|---|
| `__orchestratorWidgetBindingApply.js` | No direct legacy equivalent | New rule-aligned service registration under `_KDB.services.widgetBindingApply`; replaces ad hoc direct imports/calls. |
| `createWidgetBindingApplyService.js` | `applyBindingPlan.js` | Named-method service surface `{ applyBinding, destroy }`; `applyBinding` is the apply/render boundary without state writes. |
| `config/defaults.js` | `renderWidgetCycle.js` | Captures default timeout profiles: visible render and helper render. |
| `diagnostics/createDiagnostics.js` | `applyBindingPlan.js` step return objects and error codes | Normalizes legacy `{ ok, superseded, error, replayed }` into contract diagnostics. |
| `diagnostics/createApplyResult.js` | `handleApplyFailure` result branches in `applyBindingPlan.js` | Builds `{ status, mirrorPatch, diagnostics }` without rollback/state commit. |
| `effects/applyBindingPlan.js` | `applyBindingPlan.js` | Main step orchestrator: validate, datasource, visType, conditional clear, slots, filters, render, wait. |
| `effects/applySlots.js` | `applyBindingPlan.js`, `applyLiveWidgetSlots.js` | Plan-driven slot loop; imperative twin is evidence only, not a public path. |
| `effects/applyLocalFilters.js` | `applyBindingPlan.js`, `applyLiveWidgetLocalFilters.js` | Plan-driven local-filter loop for current descriptors only; previous managed-filter removal is a separate step in `applyBindingPlan.js`. |
| `effects/buildFilterBody.js` | `buildFilterBodyFromDescriptor.js`, `applyLiveWidgetLocalFilters.js` | Descriptor-to-Cognos-body translator for include/exclude/reverse/contains/beginsWith/includeExcludeOr/hierarchy/forceEmpty. |
| `effects/waitForRender.js` | `renderWidgetCycle.js`, `whenRenderComplete.js` | Timeout-raced render wait; no render lifecycle state writes/events. |

### Cognos wrapper namespace mapping

The contract's §8 wrapper table is a logical capability list. During CP-2, implementation may map those capabilities to existing production namespaces (`_KDB.cognosAPI.visualization`, `_KDB.cognosAPI.async`, `_KDB.cognosAPI.dataQuery`) or to newly ported thin wrappers behind a focused adapter/facade. Keep that mapping private to `widgetBindingApply` effects or a precisely named adapter file; do not change the public service API, diagnostics, state ownership, history ownership or caller contracts.

## Section D. Per-file specifications

#### `__orchestratorWidgetBindingApply.js`

- **Role**: service orchestrator.
- **Lines**: target 35, hard limit 80.
- **AMD imports**: `./createWidgetBindingApplyService.js`, `./config/defaults.js`.
- **Entry function**: `__orchestrator(_KDB, _options)`.
- **Body steps**:
  1. Ensure `_KDB.services` and `_KDB.runtime` exist.
  2. Ensure `_KDB.runtime.widgetBindingApply = { abortControllers:{}, pendingPromises:{}, timers:{} }` without replacing populated buckets.
  3. Create service with `{ _KDB, defaults, options }`.
  4. Assign `_KDB.services.widgetBindingApply = service`.
  5. Return service.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `runtime.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

#### `createWidgetBindingApplyService.js`

- **Role**: service factory.
- **Lines**: target 110, hard limit 150.
- **AMD imports**: diagnostics/result helpers plus all effect files.
- **Entry function**: `createWidgetBindingApplyService(_deps)`.
- **Public methods**:
  - `applyBinding(_plan, _options)` delegates to `effects/applyBindingPlan.js`.
  - `destroy()` sets `_isDisposed = true`, aborts/clears service-owned runtime buckets, idempotent.
- **Disposed behavior**: async methods reject `new Error("widgetBindingApply disposed")`; `destroy()` silently returns after first call.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `module-public-api.mdc`, `runtime.mdc`, `error-handling.mdc`, `state.mdc`.

#### `config/defaults.js`

- **Role**: constants/config.
- **Lines**: target 20, hard limit 60.
- **Return value**: object with `timeouts: { vis: 12000, helper: 5000 }` and `renderWaitDefaults`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`.

#### `diagnostics/createDiagnostics.js`

- **Role**: diagnostics builder.
- **Lines**: target 70, hard limit 120.
- **Entry function**: `__controller(_target, _operation, _reason)`.
- **Helpers**: `addCompletedStep`, `setFailedStep`, `addWarning`, `finishDiagnostics`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc` (pure one-liners exempt).

#### `diagnostics/createApplyResult.js`

- **Role**: result normalizer.
- **Lines**: target 55, hard limit 100.
- **Entry function**: `__controller(_status, _plan, _diagnostics)`.
- **Body**: return `mirrorPatch` only for `status === "success"`; otherwise `null`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `state.mdc`.

#### `effects/applyBindingPlan.js`

- **Role**: apply orchestration effect.
- **Lines**: target 130, hard limit 150.
- **AMD imports**: `../diagnostics/createDiagnostics.js`, `../diagnostics/createApplyResult.js`, `./applySlots.js`, `./applyLocalFilters.js`, `./waitForRender.js`.
- **Entry function**: `__controller(_deps, _plan, _options)`.
- **Step order**: exactly contract §7 (`validateInputs`, `readCurrentVisType`, `setDatasourceInitial`, `setVisType`, `clearSlotsAndFilters`, `setDatasourceAfterClear`, conditional `applySlots`, `removeManagedFilters`, `applyLocalFilters`, `applyTopBottom`, `renderWidget`, `waitRenderComplete`, `buildSuccessResult`).
- **removeManagedFilters step**: read `_options.previousManagedFilterItemIds || []`; when empty, add `removeManagedFilters` to `skippedSteps`; when present, call the resolved Cognos remove-local-filter capability for each id, record completed/failed step separately, and do not persist previous ids in the service.
- **Abort checks**: before first step and after every await.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `runtime.mdc`, `state.mdc`.

#### `effects/applySlots.js`

- **Role**: Cognos slot effect.
- **Lines**: target 80, hard limit 120.
- **Entry function**: `__controller(_KDB, _target, _slots, _diagnostics, _signal)`.
- **Body**: run only when the plan is rebuilding/resetting slots (`slotsChanged`, `slotsToClear:["all"]`, or reset intent). For filter-only updates with unchanged slots, mark `applySlots` skipped and do not call `addDataItemsToSlot`. When run, apply `slot.options.limit` / `keepOnlyFirst` before adding data items when supported by the wrapper; if unsupported, fail explicitly with `WIDGET_BINDING_APPLY_SLOT_OPTION_UNSUPPORTED`. Then call `addDataItemsToSlot`; then apply `sortSpecs[]` or single `sortByColumn`; abort-check after each awaited call.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `state.mdc`.

#### `effects/applyLocalFilters.js`

- **Role**: Cognos local-filter effect.
- **Lines**: target 90, hard limit 130.
- **AMD imports**: `./buildFilterBody.js`.
- **Entry function**: `__controller(_KDB, _target, _filterDescriptors, _diagnostics, _signal)`.
- **Body**: build and apply each current descriptor body only; previous managed-filter removal is owned by the separate `removeManagedFilters` step in `applyBindingPlan.js`. Do not persist managed ids.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `state.mdc`.

#### `effects/buildFilterBody.js`

- **Role**: descriptor translator.
- **Lines**: target 100, hard limit 140.
- **Entry function**: `__controller(_KDB, _descriptor)`.
- **Modes**: `include`, `reverse`, `exclude`, `contains`, `beginsWith`, `includeExcludeOr`, `hierarchyKeepexclude`, `forceEmpty`; unknown throws/returns coded error consumed by caller.
- **forceEmpty**: translate `{ kind:"emptyData", mode:"forceEmpty", itemId, values:["1"], reason? }` into the intentional-empty filter body defined by `widgetBindingApply.md`; missing `itemId` or `values` returns `WIDGET_BINDING_APPLY_FORCE_EMPTY_FILTER_INVALID`.
- **Operator support**: if `contains` / `beginsWith` cannot be represented by the current Cognos wrapper surface, return `WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`.

#### `effects/waitForRender.js`

- **Role**: render-wait effect.
- **Lines**: target 80, hard limit 120.
- **Entry function**: may stay `__controller(_KDB, _target, _options, _diagnostics, _signal)` if paired with explicit arm/finish helpers, or may expose focused helper methods such as `armRenderWait(...)` and `finishRenderWait(...)` while keeping the file's AMD return value single and compact.
- **Body**: establish render lifecycle subscriptions before `renderWidget` is triggered: arm `whenRenderStart` when `renderWait.waitForStart === true`, always arm `whenRenderComplete`, then let `runApplyBindingRenderSteps.js` call `renderWidget`, and finally await the armed promises. Use one combined render-wait timeout budget for start + complete, not a fresh full timeout for each phase. Return render wait ms and keep diagnostics under the existing `waitRenderComplete` step id.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `error-handling.mdc`, `runtime.mdc`.

## Section E. Public API wiring

- Surface: `_KDB.services.widgetBindingApply`.
- Methods exposed: `applyBinding`, `destroy`.
- Runtime initialization: `_KDB.runtime.widgetBindingApply = { abortControllers, pendingPromises, timers }`.
- State initialization: none.
- Events: none.
- Bootstrap: update `KDB3/js/core/services/__orchestratorServices.js` to import and call the service orchestrator. Do not edit `KDB.js` unless reviewer explicitly broadens CP-2.

## Section F. Acceptance criteria

1. Every file in Section B exists and follows its per-file spec.
2. Service surface is exactly `{ applyBinding, destroy }`.
3. No code writes `_KDB.state.widgets`, `_KDB.state.history`, launchpad, filters or tableData state.
4. All production files use full-compact AMD and no ES module syntax.
5. Every named executable and async effect has required `try/catch`; aborts are filtered.
6. Apply step order and step ids match contract §7 exactly.
7. Diagnostics/result shapes match contract §6.
8. `effects/buildFilterBody.js` covers `forceEmpty`, `contains`, `beginsWith`, `include`, `reverse`, `exclude`, `includeExcludeOr`, and `hierarchyKeepexclude`.
9. `effects/applySlots.js` consumes `slot.options.limit` / `keepOnlyFirst` or returns an explicit unsupported apply error.
10. The `removeManagedFilters` step is registered separately in diagnostics; when no previous ids are passed, diagnostics record `skippedSteps:["removeManagedFilters"]`.
11. `applyBinding` returns `WIDGET_BINDING_APPLY_INVALID_PLAN` and performs no Cognos writes when `plan.ok !== true` or `plan.status !== "success"`.
12. Apply diagnostics populate `emptyMode` / `emptyReason` from `plan.emptyIntent` or the first `emptyData/forceEmpty` descriptor.
13. TopN/helper row reads use `tableDataService.reloadTable([{ widgetId }])`, and TopN extraction stays in `widgetTopN`.
14. No DOM queries, events, history commits or legacy tree edits.
15. `ReadLints` is run on all new/edited JS files.
16. Imports resolve from `core/services/__orchestratorServices.js` through all new service files.

## Section G. Forbidden actions

- Do not modify `.cursor/rules/`, templates or authority docs.
- Do not read or modify legacy trees during implementation; use this spec and contract as evidence.
- Do not implement `widgetBindingPlan`, `widgetVis`, `widgetTopN` or `widgetDataTable`.
- Do not add `events/eventNames.js`.
- Do not add state folders/selectors/reducers.
- Do not add direct `KDB.js` bootstrap registration unless explicitly approved.
- Do not implement rollback/replay in this service.
- Do not commit or push.

## Section H. Reviewer handoff

The executing AI reports:

1. Pre-flight echo from Section A.
2. File checklist with line counts.
3. Import-resolution notes, especially `__orchestratorServices.js`.
4. `ReadLints` result for all new/edited JS.
5. Deviations or blockers, if any.


# Widgets Binding Pipeline Planner Handoff

> Handoff / non-authority note for future planner-AI chats. The contracts and execution specs remain authoritative. This file only preserves the cross-contract decisions and suggested planner prompts after the sequential alignment round for `widgetBindingPlan`, `widgetBindingApply`, and `widgetVis`.

---

**Status:** `handoff`
**Date:** 2026-06-07
**Scope:** widgets binding pipeline CP-1 planning
**Authority:** non-authority; read the referenced contracts for the actual contract.

## 1. Canonical Pipeline

The intended pipeline is:

```txt
widgetVis buildBindingSpec
  -> _KDB.services.widgetBindingPlan.buildPlan(spec)
  -> _KDB.services.widgetBindingApply.applyBinding(plan, options)
  -> widgetVis result handling
  -> widgetSettings commit/history only after confirmed success
```

For TopN:

```txt
widgetVis dispatches widgetTopN/resolveRequested
  -> widgetTopN resolves helper/data
  -> widgetTopN uses widgetBindingPlan + widgetBindingApply for helper-target binding/read
  -> widgetTopN dispatches widgetVis/topNResolved
  -> widgetVis applies visible-widget result through the same binding pipeline
```

## 2. Do Not Reopen These Decisions

- `widgetBindingPlan.md` is the schema authority for `BindingPlanSpec` and `BindingPlan`.
- `widgetBindingApply.md` is the authority for `ApplyBindingOptions`, `ApplyBindingResult`, Cognos mutation, render wait, timeout and abort result semantics.
- `widgetVis.md` is the authority for visible-widget orchestration, state/runtime ownership, result handling and settings-reporting.
- `reason` is canonical. `widgetVis.changeReason` is caller-internal only.
- `dataConfig` is canonical. `widgetVis.settings` and `widgetVis.dataIdentity` are caller-internal source material only.
- `helperTableResult` is canonical. `widgetVis.topNResult` / `topNResolved` payloads must be mapped to it.
- `hierarchySnapshot` is canonical. Dienststelle resolution payloads must be normalized into this shape by the caller.
- `emptyIntent.enabled === true` is the only force-empty trigger. `config.emptyDataFilter` is convention/default only.
- Force-empty is represented in the plan as both `BindingPlan.emptyIntent` and `localFilters[]` descriptor `{ kind:"emptyData", mode:"forceEmpty", itemId, values:["1"], reason? }`.
- No separate `applyEmptyDataFilter` method exists or should be added.
- `previousManagedFilterItemIds` is never plan output. It is caller runtime and passed through `ApplyBindingOptions.previousManagedFilterItemIds`.
- `managedFilterItemIds` is new plan output and replaces the caller runtime list only after apply success.
- `opSeq` and `AbortController` are caller-owned by `widgetVis` / `widgetTopN`. Plan/apply may echo `opSeq` in diagnostics but do not own supersession.
- `aborted` means expected caller-owned supersession, not a settings error.
- `mirrorPatch` is a proposal in `BindingPlan`; `widgetBindingApply` returns it non-null only on `status:"success"`; callers use it only after success.
- `SlotPlanItem.options.limit` / `keepOnlyFirst` are v1-scope; apply must consume them or explicitly return an unsupported apply error.
- `reason:"cleanup"` with `emptyIntent.enabled === true` is a minimal force-empty plan and `slotsChanged:false`.

## 3. Required Read List For Any Related Planner

Read the project rules and blueprint as normal. Additionally, before making contract changes in this pipeline, read:

```txt
_____________KDB3API/contracts/widgetBindingPlan.md
_____________KDB3API/contracts/widgetBindingApply.md
_____________KDB3API/contracts/widgetVis.md
_____________KDB3API/contracts/widgetBindingPlan-port-execution-spec.md
_____________KDB3API/contracts/widgetBindingApply-port-execution-spec.md
_____________KDB3API/contracts/widgetVis-port-execution-spec.md
```

If planning `widgetTopN`, also read:

```txt
_____________KDB3API/contracts/widgetTopN.md
_____________KDB3API/contracts/widgetDataTable.md
_____________KDB3API/architecture/widgets-domain-blueprint.md
```

## 4. Communique For Future `widgetTopN` Planner

Use this prompt when starting the `widgetTopN` planner:

```md
You are the planner-AI for `widgetTopN` in the widgets composed-port path.

Read this handoff first:
`_____________KDB3API/contracts/widgets-binding-pipeline-planner-handoff.md`

Then read:
- `contracts/widgetTopN.md`
- `contracts/widgetDataTable.md`
- `contracts/widgetVis.md`
- `contracts/widgetBindingPlan.md`
- `contracts/widgetBindingApply.md`
- `architecture/widgets-domain-blueprint.md` especially §3, §4, §6, §12

Your task is contract-first CP-1 planning for `widgetTopN`, not implementation.

Critical inherited pipeline decisions:
- `widgetVis` calls `widgetTopN` via dispatch: `widgetTopN/resolveRequested`.
- `widgetTopN` owns TopN resolution state/runtime and helper orchestration.
- `widgetTopN` may use `widgetBindingPlan.buildPlan(spec)` and `widgetBindingApply.applyBinding(plan, options)` for helper-target binding.
- `widgetTopN` reads helper rows through `tableDataService.reloadTable([{ widgetId: helperWidgetId }])`.
- `widgetTopN` reports terminal result back to `widgetVis` via `widgetVis/topNResolved`.
- Correlation is by owner visualization `widgetId`; stale results are ignored by `opSeq`.
- `opSeq` / AbortController for TopN resolution are owned by `widgetTopN` for its own work and echoed in payloads to `widgetVis`.
- Always produce a terminal TopN result: `success | error | noHelperAvailable` within bounded time.
- Do not write `widgetVis` state, `widgetSettings` state, `widgetBase` state, or history.
- Do not invent a new plan shape. Use canonical `BindingPlanSpec`, `BindingPlan`, `ApplyBindingOptions`, and `ApplyBindingResult`.
- Previous managed-filter ids for helper targets are caller/runtime-owned and passed to apply via `ApplyBindingOptions.previousManagedFilterItemIds`.
- Force-empty, if needed for helper cleanup, goes through `emptyIntent` + `emptyData/forceEmpty`; no separate empty apply command.

Deliverables:
- Full CP-1 contract for `widgetTopN`.
- Exact action payloads, runtime ownership, state ownership, helper claim/release behavior, `widgetVis` dispatch choreography, `widgetBindingPlan`/`widgetBindingApply` usage, `tableDataService` helper row-read handling, error taxonomy, supersession/opSeq, history behavior and acceptance checks.
- Stop before production code.
```

## 5. Resume Prompt For `widgetBindingPlan` Planner

```md
Resume as the `widgetBindingPlan` planner / schema authority.

Read:
`contracts/widgets-binding-pipeline-planner-handoff.md`
`contracts/widgetBindingPlan.md`
`contracts/widgetBindingPlan-port-execution-spec.md`
and the related service/module contracts if a boundary change is proposed.

Current state:
- `widgetBindingPlan.md` is the canonical schema for `BindingPlanSpec` and `BindingPlan`.
- Emptying is `emptyIntent.enabled === true` plus `localFilters[{ kind:"emptyData", mode:"forceEmpty" }]`.
- Previous managed-filter ids are not plan output.
- `reason:"cleanup"` with `emptyIntent.enabled === true` means `slotsChanged:false`.
- `SlotPlanItem.options.limit/keepOnlyFirst` are v1-scope and apply-consumed.

Only change the plan contract/spec if a concrete downstream inconsistency is proven. Do not reopen naming/ownership decisions without explicit user approval.
```

## 6. Resume Prompt For `widgetBindingApply` Planner

```md
Resume as the `widgetBindingApply` planner.

Read:
`contracts/widgets-binding-pipeline-planner-handoff.md`
`contracts/widgetBindingPlan.md`
`contracts/widgetBindingApply.md`
`contracts/widgetBindingApply-port-execution-spec.md`

Current state:
- Consume the final `BindingPlan`; do not define a parallel plan shape.
- `ApplyBindingOptions.previousManagedFilterItemIds?: string[]` is the only source of previous managed-filter ids.
- `localFilters[].values` is required `string[]`; `localFilters[].reason` is optional.
- `forceEmpty`, `contains`, `beginsWith`, `include`, `exclude`, `reverse`, `includeExcludeOr`, and `hierarchyKeepexclude` are descriptor modes/operators that apply translates to Cognos bodies.
- `slot.options.limit/keepOnlyFirst` must be consumed or fail explicitly.
- `mirrorPatch` is non-null only on `status:"success"`.
- `aborted` is expected supersession, not a binding error.

If updating the contract/spec, only align consumer behavior to `widgetBindingPlan`; do not move product/state/history ownership into apply.
```

## 7. Resume Prompt For `widgetVis` Planner

```md
Resume as the `widgetVis` planner.

Read:
`contracts/widgets-binding-pipeline-planner-handoff.md`
`contracts/widgetVis.md`
`contracts/widgetVis-port-execution-spec.md`
`contracts/widgetBindingPlan.md`
`contracts/widgetBindingApply.md`

Current state:
- `widgetVis` is orchestrator/caller, not schema authority.
- `buildBindingSpec.js` must output exact canonical `BindingPlanSpec`.
- Internal terms must be mapped before service boundary:
  - `changeReason -> reason`
  - `settings + dataIdentity -> dataConfig`
  - `topNResult/topNResolved -> helperTableResult`
  - `dienststelleChanged.payload.resolution -> hierarchySnapshot`
  - `forceEmpty + emptyReason -> emptyIntent`
- `runBindingPipeline.js` calls `buildPlan`; if plan fails, do not call apply.
- `applyBinding` options include `previousManagedFilterItemIds` from `_KDB.runtime.widgetVis.byId[widgetId].managedFilterItemIds`.
- Replace runtime `managedFilterItemIds` with `plan.managedFilterItemIds` only after apply success.
- `status:"aborted"` is supersession; no settings commit and no settings error.
- Use `mirrorPatch` only from successful apply result.
- `widgetSettings` commit/history only after confirmed apply success.

Do not introduce an ad-hoc plan shape, separate empty-apply route, or settings/history writes inside `widgetVis`.
```

## 8. Short Chat Prompt For Any Planner

```md
Before continuing, read:
`_____________KDB3API/contracts/widgets-binding-pipeline-planner-handoff.md`

Then read the contracts/specs it names for your module. Treat that handoff as non-authority context and the referenced contracts as authority. Do not reopen settled binding-pipeline decisions unless you find a concrete contradiction and escalate it first.
```

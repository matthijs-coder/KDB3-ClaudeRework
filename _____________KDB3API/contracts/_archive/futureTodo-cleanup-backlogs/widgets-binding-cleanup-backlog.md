# Future Todo: Widgets Binding Cleanup (Deferred Steps)

> Backlog for behavior-preserving cleanup rounds after the completed **2026-06** tranche on `widgetBindingPlan` and `widgetBindingApply`.  
> Rule: each item needs its own CP-1 plan + behavior-preservation check before execution. Escalate when semantics are unclear.

---

## Completed Tranche (closed)

| Module | Path | Outcome |
|---|---|---|
| `widgetBindingPlan` | `KDB3/js/core/services/widgetBindingPlan/` | Split oversize files; removed dead `composeTopNWithExclude`; shared `matchFilterPropEntry`; reason constants; all files under 150-line hard limit. Public API `{ buildPlan }` unchanged. |
| `widgetBindingApply` | `KDB3/js/core/services/widgetBindingApply/` | Split filter/slot builders; shared `parseFilterDescriptor`; abort helpers; pre-step / phase dedupe; all files under 150-line hard limit. Public API `{ applyBinding, destroy }` unchanged. |

No contract updates were required for either module.

---

## Phase 3 — Same Modules (optional polish, higher risk)

### `widgetBindingPlan`

| Item | Files | Risk | Notes |
|---|---|---|---|
| Filter value normalization unification | `filters/filterValueHelpers.js`, `filters/buildTopNFilter.js`, `filters/buildHierarchyFilter.js` | **High** | TopN accepts more field aliases and different empty coercion (`""` vs `null`) than helpers. Requires behavioral matrix before merge. |
| `resolveFilterMode` extract | `filters/buildLocalFilters.js` (129 lines) | Low | Dedupe widget / kennzahl / dimension mode resolution; no API change. |
| Failure/success envelope dedupe | `core/services/widgetBindingPlan/planResult.js` (`createPlanFailure`), `core/services/widgetBindingPlan/planResult.js` (`createPlanSuccess`) | Medium | Asymmetric clone of `datasource`/`visualization` on failure may be intentional. |
| `rewriteUniqueNameSourceToken` → core util | `utils/rewriteUniqueNameSourceToken.js` vs `KDB3/js/core/utils/` | Medium | Plan fork adds optional `_sourceToken` guard; contract §16 keeps plan-local pure ports. |
| `cloneSerializable` → shared core util | `utils/cloneSerializable.js` | Medium | Catch returns original ref vs `undefined` elsewhere — verify parity first. |

### `widgetBindingApply`

| Item | Files | Risk | Notes |
|---|---|---|---|
| Abort return-shape unification | `effects/applySlots.js`, `effects/applyTopBottom.js`, leaf step runners | **Medium** | Today mix `{ ok: false, aborted: true }` vs `{ aborted: true, result }`. Unify only with full pipeline walk. |
| `normalizeValueEntry` ↔ plan chain | `effects/filterBodyHelpers.js` vs `widgetBindingPlan/filters/buildTopNFilter.js` | **High** | Same as plan-side normalization item; do once for both services. |
| Hoist keepexclude / display-type to `cognosAPI` | `buildKeepexcludeConditionsFilterObj.js`, `createCognosBindingFilterMethods.js` | **High** | Currently facade-local legacy ports. Hoist only when KDB3 cognosAPI surface is canonical and approved. |
| Remove dead `exclude` override in operator builder | `effects/operatorFilterBodies.js` | Low–Medium | `exclude: options.exclude !== false` passed to `buildKeepexcludeOptions`; builder may ignore it — verify before delete. |
| Mechanische try/catch on pure filter helpers | `filterBodyHelpers.js`, `core/services/widgetBindingApply/filterBody/keepexcludeConditions.js` (`buildKeepexcludeConditionsFilterObj`) | Low | Rule compliance only; large diff, no functional win. |
| Trim files slightly above 120 target | `runApplySlotsFiltersPhase.js`, `runApplyBindingRenderSteps.js`, `operatorFilterBodies.js` | Low | Under 150 hard limit; split only if readability still poor. |
| Complete `applyBindingStepBundle` barrel | `effects/applyBindingStepBundle.js` | Low | Omitting middle/phase imports is intentional wiring; document or complete — no behavior change either way. |
| `createCognosBindingFacade` dual API access | `effects/createCognosBindingFacade.js` | Medium | Slots/filters via dashboard API vs vis/render via `_KDB.cognosAPI`; clarify ownership before refactor. |

---

## Next Cleanup Modules (not started)

Recommended order follows the binding pipeline (callers after shared services).

### 1. `widgetVis` — **closed** (2026-06)

- Path: `KDB3/js/dashboard/widgets/widgetVis/`
- Contract: `contracts/widgetVis.md`
- Follow-up: `futureTodo/widgetVis-cleanup-followup-backlog.md`

### 2. `widgetTopN`

- Path: `KDB3/js/dashboard/widgets/widgetTopN/`
- Contract: `contracts/widgetTopN.md`
- Likely themes: helper plan/apply orchestration; helper cleanup plans; tableData read boundary; duplicate hierarchy/topN normalization with plan service.

### 3. `widgetSettings`

- Path: `KDB3/js/dashboard/widgets/widgetSettings/` (verify exact path at audit)
- Contract: `contracts/widgetSettings.md`
- Likely themes: settings DOM builders; mirror commit boundaries; history interaction.

### 4. `widgetBase` — **closed** (2026-06)

- Path: `KDB3/js/dashboard/widgets/widgetBase/`
- Contract: `contracts/widgetBase.md`
- Follow-up: `futureTodo/widgetBase-cleanup-followup-backlog.md`
- Content delegation (separate tranche): `futureTodo/widgetBase-cleanup-delegation-to-content-owners.md`

---

## Cross-Cutting Follow-Ups

| Item | When |
|---|---|
| Git commit(s) for plan + apply refactor tranche | Before merge or next module work |
| Contract approval log (`Draft CP-1` → approved) | `widgetBindingPlan.md`, `widgetBindingApply.md` — administrative, not blocking cleanup |
| Shared util: `normalizeDefaultValue` | Already cross-used; consider single `core/utils` home if more modules import plan copy |
| Integration smoke after caller cleanups | After `widgetVis` / `widgetTopN` cleanup — end-to-end binding pipeline |

---

## Execution Discipline (repeat per round)

1. Pre-flight: `projectStructureRules.md`, `stateOwnership.md`, module contract, targeted `.mdc` clauses only.
2. Read-only audit subagents per file; CP-1 plan → user approval.
3. Executor pass; ReadLints on changed files.
4. CP-2: diff-walk + behavior-preservation (public API, step order, result shapes, runtime ownership).
5. Update contract **only** if public API / state / events change.

Do not edit legacy trees (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) or authority docs as part of cleanup rounds.

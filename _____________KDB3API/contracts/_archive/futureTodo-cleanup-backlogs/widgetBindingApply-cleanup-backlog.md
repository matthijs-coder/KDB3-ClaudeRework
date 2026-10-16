# Future Todo: `widgetBindingApply` — deferred cleanup & consolidation

## Context

Behavior-preserving cleanup rounds **1–3** (2026-06) on `KDB3/js/core/services/widgetBindingApply/` are **closed as sufficient** for production module hygiene:

- runtime-init dedupe, amd nested-helper fixes, unused params removed;
- pipeline splits (`runApplySlotsFiltersPhase`, `slotApplyHelpers`, `operatorFilterBodies`, `buildIncludeExcludeOrFilterBody`);
- filter helpers consolidated (`filterBodyHelpers`, `missingFilterItemIdError`, `parseFilterDescriptor`);
- cognos facade uses `_KDB.cognosAPI.visualization.getSlots` / `.getLocalFilters` instead of inline canvas chain;
- render runner deduped via `bindingApplyStepHelpers`.

Public API, apply step order, diagnostics schema and `contracts/widgetBindingApply.md` were **not** changed.

Do **not** reopen routine cleanup on this module unless integration/harness finds a regression or a listed item below is explicitly scheduled.

---

## Tier C — behavior or architecture decision required

These were identified during audit but **intentionally not done** because they may change runtime semantics or cross layer boundaries.

| Item | Location | Why deferred | Before doing |
|------|----------|--------------|--------------|
| **`buildKeepexcludeConditionsFilterObj` → `_KDB.cognosAPI`** | `effects/buildKeepexcludeConditionsFilterObj.js`, wired via `createCognosBindingFacade` | Near-copy of legacy/cognosAPI; contract §8 allows internal adapter until namespace placement is decided | CP on cognosAPI ownership; preserve local `filterObj.type` for include if still required; update facade to consume shared primitive only |
| **`createCognosBindingFilterMethods` → cognosAPI** | `effects/createCognosBindingFilterMethods.js` | Legacy port of `addOrReplaceLocalFilter` / display-type normalization | Confirm single owner for widget local-filter writes; silent `removeFilter` catch is intentional |
| **Vis-type alias map shared with `widgetVis`** | `resolveBindingApplyOptions.js` (`COGNOS_VIS_TYPE_CANONICAL_BY_LOWER`) | Cross-module; plans may already canonicalize via `widgetBindingPlan` | Verify no double-normalization; align with `widgetVis/config/resolveVisualizationBindingConfig.js` |
| **`sortDataItemInSlot`: target single slot** | `createCognosBindingSlotMethods.js` | Full `getSlotList()` scan vs `getSlot(_slotId)` — possible Cognos quirk | Harness/regression on multi-slot widgets |
| **`includeexcludeor` endswith fallback** | `buildIncludeExcludeOrFilterBody.js` | Silent degradation when keepexclude clause build fails | Product decision: fail with `WIDGET_BINDING_APPLY_FILTER_OPERATOR_UNSUPPORTED` vs keep fallback |
| **`armRenderWait`: error when `waitForStart` but no `whenRenderStart`** | `core/services/widgetBindingApply/renderWait.js` (`armRenderWait`) | Today silently skips start-wait | Contract/diagnostics decision; may surface new apply failures on partial cognos surfaces |
| **Pre vs middle error return-shape unification** | `applyBindingPlan.js` vs `runApplyBindingMiddleSteps.js` | Middle returns step-specific `result`; pre returns generic error | Confirm caller/diagnostic consumers; may change `errorCode`/`failedStep` visibility |
| **Abort check before `clearAllLocalFilters`** | `runClearSlotsAndFiltersStep.js` | Abort after `clearAllSlots` only leaves partial Cognos state | Explicit non-transactional semantics review (contract §10) |

---

## Optional structural follow-ups (low priority)

Safe, small wins if file-size or scanability becomes an issue again:

| Item | Notes |
|------|--------|
| **`runApplyBindingRenderSteps.js` file-size** | ~120 lines after dedupe; further shrink only if new logic is added |
| **`waitForRender.js` barrel** | 12-line re-export; delete only if all consumers import `armRenderWait` / `finishRenderWait` directly |
| **`normalizeValueEntry` shared with `widgetBindingPlan`** | `filterBodyHelpers` vs `buildTopNFilter` — semantics differ (strings vs `{d,u}`); document divergence or extract shared util with explicit apply-vs-plan modes |
| **`createCognosBindingSlotMethods` split** | Optional extract `setTopBottomOnSlot` / `sortDataItemInSlot` if file grows past 120 target |

---

## Cross-module cleanup (outside this service)

Not `widgetBindingApply` scope; schedule with owning module planners:

- **`widgetBindingPlan`** — plan builder dedupe, filter descriptor normalization alignment with apply helpers;
- **`widgetVis`** — consumer of `applyBinding`; managed-filter runtime handoff (`previousManagedFilterItemIds`);
- **`widgetTopN`** — helper-target apply + `tableDataService` row reads;
- **cognosAPI gap fill** — any slot/filter wrapper still missing under `_KDB.cognosAPI.widgets` / `visualization` per contract §8.

---

## Suggested trigger to schedule a follow-up wave

1. **cognosAPI consolidation CP** approved (single source for keepexclude + local-filter methods).
2. **Binding-pipeline harness** exists and covers vis + TopN helper apply paths.
3. **Regression** in filter modes (`includeexcludeor`, `reverse`, `forceEmpty`) or render-wait timeout/abort after a Cognos upgrade.

Until then: treat `widgetBindingApply` cleanup as **done**.

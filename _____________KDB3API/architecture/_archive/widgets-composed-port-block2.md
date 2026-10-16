# Block 2 — Per-tranche SESSION TASK wrapper (widgets composed-port)

> Fill in the template below for ONE target and paste it in place of `<<SESSION TASK>>` in Block 1 (`widgets-composed-port-block1.md`). One module/service per session. The per-target table at the bottom gives the specifics to drop in.

---

## Template (fill in `<...>`)

```
SESSION TASK (composed port — widgets domain):
Target module/service: <widgetBase | widgetText | widgetVis | widgetTopN | widgetDataTable | widgetBindingPlan | widgetBindingApply>
Type: <feature module | shared service>
Contract stub (start point): _____________KDB3API/contracts/<target>.md
Target production path: _____________KDB3API/KDB3/js/<path from blueprint §8>

Authority: _____________KDB3API/architecture/widgets-domain-blueprint.md
  - Honour §3 (acceptance matrix), §4 (state ownership), §6 (communication), §12 (full-contract requirements).

Legacy evidence — investigate VIA a read-only investigation subagent (the planner does NOT read these trees directly; consume the subagent's concise report):
  - <legacy source paths for this target — see per-target table>

Investigation-debt gate (do FIRST if listed): <none | targeted read-only investigation per blueprint §11>

Workflow: composed port, contract-first, CP-gated. Stop at CP-1 (full contract), then CP-2 (diff-walk + integration).

Behavior policy: rule-alignment + deliberate structural improvement allowed; document every delta vs legacy. Blueprint is authority — deviation requires escalation.

In-scope this session:
- Full module/service contract at _____________KDB3API/contracts/<target>.md, expanded from the stub with ALL blueprint §12 items: exact public-API signatures, action-payload schemas, canonical state writes, runtime ownership, DOM boundaries, Cognos touchpoints, history behaviour, error taxonomy, supersession/opSeq, acceptance checks.
- Execution spec at _____________KDB3API/contracts/<target>-port-execution-spec.md with a mapping table (new production file -> legacy evidence + composition/alignment note per file).
- Production files under the target path (orchestrator, controller/service factory, state/, view/, effects/, events/eventNames.js only if this module emits events).
- ReadLints on all new files; verify all imports resolve; note whether KDB.js / orchestrator bootstrap registration is needed (this tranche or explicitly deferred).

Out-of-scope this session:
- Bundling another module/service.
- Bootstrap registration in KDB.js (separate, after CP-2).
- Applying blueprint §9 authority-doc deltas without explicit approval.
- Cross-module integration tests; editing legacy trees.

Open questions (collect during survey; I decide at CP-1):
- Q1: exact target path + which `_KDB.state.widgets.<sub>` it writes (per blueprint §4).
- Q2: public surface/style (dispatch feature module vs named-method service per blueprint).
- Q3: runtime buckets under `_KDB.runtime.<target>` (incl. `opSeq`/AbortController) and cleanup path.
- Q4: events emitted/subscribed (catalog update needed?) — most widget modules subscribe only.
- Q5: disposed-state discipline (`_isDisposed`).
- Add any question the legacy survey raises that the blueprint/rules do not cover.

Per-target notes:
- <drop the row from the per-target table below>
```

---

## Per-target table (specifics to drop into the template)

| Target | Type | Production path | Primary legacy evidence | Investigation gate | Roadmap order |
|---|---|---|---|---|---|
| `widgetBase` | feature module | `KDB3/js/dashboard/widgets/widgetBase/` | REDESIGN2 `dashboard/canvas/widgets/` (orchestrator, lifecycle, place/route, reset, history adapters) + laatsteOriginal `widgets/helpers/` (canvasPlacement, launchpad, actions) | **Yes** — laatsteOriginal external lifecycle (launchpad send/take, `dragAndDropLifecycleHelpers`, `wbParameterSetWidgetsHelpers`); also resolve `widgetId` source/stability + the two §12 widgetBase blockers (launchpad DOM ownership, contentCreate rollback) | 1 |
| `widgetText` | feature module | `KDB3/js/dashboard/widgets/widgetText/` | REDESIGN2 `widgets/text/*` + laatsteOriginal `textWidgets/*` | none | 2 |
| `widgetBindingPlan` | shared service | `KDB3/js/core/services/widgetBindingPlan/` | REDESIGN2 `buildBindingPlan.js`, `buildSlotPlan.js`, `buildFilterDescriptors.js`, `buildMirrorPatch.js`, `parseTopNOption.js` | none (but lock the plan input/output shape per §12 before code) | 3 |
| `widgetBindingApply` | shared service | `KDB3/js/core/services/widgetBindingApply/` | REDESIGN2 `applyBindingPlan.js`, `applyBindingPlanPostSuccess.js`, `applyLiveWidgetSlots.js`, `applyLiveWidgetLocalFilters.js`, `base/cognosAPI/widgets/*` | none (lock step-order/timeout/abort/diagnostics + non-transactional failure per §12) | 3 |
| `widgetVis` | feature module | `KDB3/js/dashboard/widgets/widgetVis/` | REDESIGN2 `widgets/` (settings/commit/title/cleanup/configureLiveWidget) + laatsteOriginal `visWidgets/*` | **Yes** — full legend/tooltip normalization (`#`/`ALLE`/`Beendet`) per blueprint §11 | 4 |
| `widgetDataTable` | feature module | `KDB3/js/dashboard/widgets/widgetDataTable/` | REDESIGN2 `live/` LIST classification/transfer + helper usage | none | 5 |
| `widgetTopN` | feature module | `KDB3/js/dashboard/widgets/widgetTopN/` | REDESIGN2 `live/topN/*` (orchestrator, core, state, api, actions, events) | none (lock helper-claim lifecycle + terminal-result/`opSeq` contract per stub §11) | 6 |

Dependencies to respect (from the blueprint): `widgetBase` before any content module; `widgetBindingPlan` + `widgetBindingApply` before `widgetVis`; `widgetDataTable` (helper) before/with `widgetTopN`; history-replay wiring last. `widgetVis` dispatch target replaces the legacy `visualizationWidget` placeholder in `dienststelle` (apply that delta with approval during the `widgetVis` tranche).

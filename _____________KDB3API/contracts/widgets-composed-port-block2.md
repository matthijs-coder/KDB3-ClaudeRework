# Block 2 — Per-tranche SESSION TASK (widgets composed-port) — lean v2

> The Block2-writer AI fills the template for ONE target and the user pastes it in place of `<<SESSION TASK>>` in Block 1. Goal: give the planner **pointers** (exact sections + decisive files), not full docs, so its context stays lean. Supersedes `architecture/widgets-composed-port-block2.md`.
>
> Filling rules: choose exactly one target; resolve paths/sections from the per-target table; render the table row as readable text (no raw `|` markdown); fill only what the sources support (leave `<...>` + a note if unknown); produce only the filled SESSION TASK block.

---

## Template (fill `<...>`)

```
SESSION TASK (composed port — widgets domain):
Target: <module/service name>   Type: <feature module | shared service>
Contract stub (start point, read this in full): _____________KDB3API/contracts/<target>.md
Target production path: _____________KDB3API/KDB3/js/<path>

Authority sections to honour (read only these blueprint sections, not the whole doc):
  - §3 acceptance matrix row(s): <which>
  - §4 state ownership: <this target's subtree, or "none">
  - §6 communication: <relevant flow, e.g. 6.2 vis↔topN / 6.3 settings/drop>
  - §12 full-contract requirements (all) ; §9 deltas relevant: <which> ; §11 open items relevant: <which / none>

Relevant contract clauses (pointers — do NOT read full contracts; a subagent extracts these sections):
  - <contract>.md <§ + one-line why> (e.g. launchpad.md §10 pad/slot selectors)
  - <...>

Investigation-debt gate (do FIRST if listed): <none | the §11 investigation for this target>

target-map subagent — questions to answer (the planner's first step):
  Q1 <...>   Q2 <...>   Q3 <...>   (keep to the decisive few)
target-map subagent — sources + focus (caps: max <N> files, relevant line-ranges only):
  - Legacy: <exact files> — find: <symbols/behaviours>
  - Current touchpoints (if needed): <exact files/sections>

Workflow: composed port, contract-first, CP-gated. Stop at CP-1 (full contract), then CP-2.
Behavior policy: rule-alignment + deliberate improvement; document every delta vs legacy; blueprint is authority.

In-scope: full contract at _____________KDB3API/contracts/<target>.md (all §12 items) + execution spec
  _____________KDB3API/contracts/<target>-port-execution-spec.md (mapping table: new file -> legacy evidence + note)
  + production files under the target path + ReadLints + import-resolution + bootstrap note (this tranche or deferred).
Out-of-scope: bundling another target; KDB.js bootstrap (after CP-2); applying §9 deltas without approval; editing legacy.

Open questions (collect; user decides at CP-1):
  - <stub §11 blockers + any survey-raised gap not covered by blueprint/rules>

Dependencies to respect: <from the table>.
```

---

## Per-target pointer table (source for filling the template)

| Target | Type | Production path | Stub §s that matter | Blueprint §s | Relevant contract clauses | Decisive legacy files + focus | Investigation gate |
|---|---|---|---|---|---|---|---|
| `widgetBase` | feature module | `KDB3/js/dashboard/widgets/widgetBase/` | full contract already drafted | §3,§4(base),§6.3 drop,§9,§11,§12 | `launchpad.md` §10 (pad/slot selectors, 5 per-tab channels), `dragDrop.md` (canvas:dropValidated payload) | REDESIGN2 `dashboard/canvas/widgets/` (orchestrator, place/route, reset, history adapters); laatsteOriginal `widgets/helpers/` (launchpad send/take, dragAndDropLifecycle) — find: drop→place flow, route-all, rollback, widgetId source | **Yes** — laatsteOriginal external lifecycle + widgetId source/stability; resolve colour-ownership reconciliation (colour value/history → `widgetSettings`) |
| `widgetSettings` | feature module | `KDB3/js/dashboard/widgets/widgetSettings/` | §1,§2,§4,§7,§10,§11 | §3,§4(settings),§6.3 settings,§7,§12 | `kdbControl` selector for gear-hide toggle | REDESIGN2 `widgets/` (settings panel build/place/bind, dropdown contract, focusModeSettingsPanel) — find: control set per type, commit→effect dispatch points | none |
| `widgetText` | feature module | `KDB3/js/dashboard/widgets/widgetText/` | §1,§2,§4,§10 | §3,§4(text),§7,§12 | — | REDESIGN2 `widgets/text/*` + laatsteOriginal `textWidgets/*` — find: inline edit, editable-node, font/restyle apply | none |
| `widgetBindingPlan` | shared service | `KDB3/js/core/services/widgetBindingPlan/` | §1,§2,§10,§11 | §2,§4(none),§12 | — | REDESIGN2 `buildBindingPlan.js`, `buildSlotPlan.js`, `buildFilterDescriptors.js`, `buildMirrorPatch.js`, `parseTopNOption.js` — find: plan input/output shape | none (lock plan input/output shape) |
| `widgetBindingApply` | shared service | `KDB3/js/core/services/widgetBindingApply/` | §1,§2,§4,§10,§11 | §2,§4(none),§12 | — | REDESIGN2 `applyBindingPlan.js`, `applyBindingPlanPostSuccess.js`, `applyLiveWidgetSlots.js`, `applyLiveWidgetLocalFilters.js`, `base/cognosAPI/widgets/*` — find: apply step order, render-wait/timeout, mirror commit | none (lock step-order/timeout/abort/diagnostics) |
| `widgetVis` | feature module | `KDB3/js/dashboard/widgets/widgetVis/` | §1,§2,§4,§8,§10,§11 | §3,§4(vis),§6.2,§6.3,§12 | `dienststelle.md` (visualizationWidget→widgetVis dispatch); binding-service stubs | REDESIGN2 `widgets/` (configureLiveWidget, title/cleanup) + `visWidgets/*` — find: derive→apply flow, legend/tooltip, drillthrough | **Yes** — legend/tooltip normalization (`#`/`ALLE`/`Beendet`) |
| `widgetDataTable` | feature module | `KDB3/js/dashboard/widgets/widgetDataTable/` | §1,§2,§4,§10 | §3,§4(dataTable),§12 | `tableDataService.md` (read methods) | REDESIGN2 `live/` LIST classification/transfer + helper usage — find: claim validation, parking | none |
| `widgetTopN` | feature module | `KDB3/js/dashboard/widgets/widgetTopN/` | §1,§2,§4,§11 | §3,§4(topN),§6.2,§12 | binding-service stubs | REDESIGN2 `live/topN/*` (orchestrator, core, state, api, actions, events) — find: resolution state machine, helper claim, hierarchy rewrite | none (lock helper-claim + terminal-result/`opSeq`) |

Global dependency order (from blueprint §10): `widgetBase` → `widgetSettings` → `widgetText` → `widgetBindingPlan`+`widgetBindingApply` → `widgetVis` → `widgetDataTable` → `widgetTopN` → history replay. `widgetVis` dispatch target replaces the legacy `visualizationWidget` placeholder in `dienststelle` (apply that delta with approval during the `widgetVis` tranche).

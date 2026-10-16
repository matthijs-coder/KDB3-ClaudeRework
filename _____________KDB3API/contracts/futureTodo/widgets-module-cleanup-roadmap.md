# Future Todo: Widgets Module Cleanup Roadmap

> Index of behavior-preserving cleanup rounds for the composed-port widgets domain.  
> Each closed tranche has a dedicated follow-up/backlog file. Rule: new work starts with pre-flight + audit + CP-1 plan; no opportunistic cross-module refactors.

---

## Status Overview

| Module / service | Path | Cleanup status | Backlog / notes |
|---|---|---|---|
| **widgetBase** | `KDB3/js/dashboard/widgets/widgetBase/` | **Closed** (2026-06) | `widgetBase-cleanup-followup-backlog.md` |
| **widgetTopN** | `KDB3/js/dashboard/widgets/widgetTopN/` | **Closed** (2026-06) | `widgetTopN-cleanup-followup-backlog.md` |
| **widgetBindingPlan** | `KDB3/js/core/services/widgetBindingPlan/` | **Closed** (2026-06) | `widgets-binding-cleanup-backlog.md` |
| **widgetBindingApply** | `KDB3/js/core/services/widgetBindingApply/` | **Closed** (2026-06) | `widgetBindingApply-cleanup-backlog.md` |
| **widgetSettings** | `KDB3/js/dashboard/widgets/widgetSettings/` | **Not started** | ~70 files; oversize: `handleSeedDefaults`, `cleanupWidgetControls`, `applyConfiguredDefault` |
| **widgetVis** | `KDB3/js/dashboard/widgets/widgetVis/` | **Not started** | Largest module; legend/focus/binding; see also `widgetVis-legend-normalization-backlog.md` |
| **widgetText** | `KDB3/js/dashboard/widgets/widgetText/` | **Not started** | Audit when text tranche is production-stable |
| **widgetDataTable** | `KDB3/js/dashboard/widgets/widgetDataTable/` | **Not started** | After vis/settings if in scope |

---

## Recommended Order (remaining rounds)

1. **widgetSettings** — active integration with `widgetBase` (delete/undo/history); medium size; STUB contract but production-tested.
2. **widgetVis** — highest complexity; enables content-cleanup delegation; binding pipeline caller cleanup.
3. **widgetText** / **widgetDataTable** — when content modules are in daily use.
4. **Cross-module tranches** (after vis/settings): content-cleanup delegation, disposed-dispatch standard, shared `cloneSerializable`.

Binding services (`widgetBindingPlan`, `widgetBindingApply`) are done; caller modules should be cleaned before revisiting plan/apply optional polish in `widgets-binding-cleanup-backlog.md` Phase 3.

---

## Per-Module Likely Themes (pre-audit hints)

### `widgetSettings`

- Contract: `contracts/widgetSettings.md` (STUB → full CP-1 sync after cleanup if API stable).
- Split oversize: `handleSeedDefaults.js`, `runtime/cleanupWidgetControls.js`, `config/applyConfiguredDefault.js`.
- Dedupe: dropdown builders, intent dispatch, panel/toolbar placement.
- History replay boundaries (option steps vs base transfer).
- Intent → `widgetVis` / `widgetBase` dispatch map consolidation.

### `widgetVis`

- Contract: `contracts/widgetVis.md`.
- Split: legend stack (`legendCaptionDom`, `installLegendTextObserver`), `topNGate`, `buildBindingSpec`, `cleanupVisualizationContent`.
- Pipeline dedupe: `runBindingPipeline` / `continueBindingPipeline` / prerequisites.
- Managed-filter runtime handoff with `widgetBindingApply`.
- Separate backlog: `widgetVis-legend-normalization-backlog.md` (legend-specific; may merge into vis cleanup CP-1).

### `widgetTopN` (closed — follow-ups only)

- See `widgetTopN-cleanup-followup-backlog.md` for Tier F items (disposed dispatch, cleanup abort signal, helper vis type, etc.).

### `widgetBase` (closed — follow-ups only)

- See `widgetBase-cleanup-followup-backlog.md` and `widgetBase-cleanup-delegation-to-content-owners.md`.

---

## Cross-Cutting Backlogs

| Topic | File |
|---|---|
| Binding plan/apply Phase 3 polish | `widgets-binding-cleanup-backlog.md`, `widgetBindingApply-cleanup-backlog.md` |
| widgetBase → content-owner transfer clean | `widgetBase-cleanup-delegation-to-content-owners.md` |
| Vis legend normalization | `widgetVis-legend-normalization-backlog.md` |
| Disposed-dispatch discipline | `widgetTopN-cleanup-followup-backlog.md` § Cross-Module |
| Shared `cloneSerializable` / error helpers | Mentioned in multiple module follow-ups; needs project-wide CP-1 |

---

## Execution Discipline (repeat per round)

1. Pre-flight: `architecture/projectStructureRules.md`, `architecture/stateOwnership.md`, module contract, targeted `.mdc` clauses only.
2. Read-only audit subagents per file; CP-1 plan → user approval.
3. Sequential executor batches; ReadLints on changed files.
4. CP-2: diff-walk + behavior-preservation (public API, state, events, history, result shapes).
5. Update contract **only** if public API / state / events change.

Do not edit legacy trees (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) or `.cursor/rules/` as part of cleanup rounds.

---

## Integration Smoke (after caller cleanups)

Run end-to-end after **widgetVis** and/or **widgetSettings** cleanup:

- drop → content create → settings seed;
- vis binding change via settings intent;
- TopN resolve → `topNResolved` → vis apply;
- settings-delete → launchpad → undo/redo;
- startup `routeAllToLaunchpad`.

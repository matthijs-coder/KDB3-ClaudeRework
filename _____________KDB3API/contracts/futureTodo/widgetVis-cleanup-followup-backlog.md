# Future Todo: `widgetVis` Cleanup Follow-Up

> Backlog for optional work **after** the closed **2026-06** behavior-preserving cleanup tranche on `widgetVis`.  
> Rule: each item needs explicit approval, runtime or caller evidence where noted, and a behavior-preservation check before execution.

---

## Closed Tranche (2026-06)

**Path:** `KDB3/js/dashboard/widgets/widgetVis/`  
**Contract:** `contracts/widgetVis.md`

Delivered:

| Area | Outcome |
|---|---|
| File size | 39 → ~80 AMD files; all module JS ≤ 150-line hard limit via splits + thin facades |
| Dedupe | Shared `finalizePipelineResult`, `isCompleteSettingsSnapshot`, `resolveQueryRoot`, reducer merge, gate splits |
| Dead code | Removed orphan `state/cloneState.js`, unused exports/imports, dead `topNLocalFilters` |
| Rule alignment | amd nested-fn hoist (focus mode), try/catch on `contentReady`, `actionRouter` + `controllerHelpers`, direct function exports |
| Diagnostics | `WIDGET_VIS_UNKNOWN_ACTION` (E2); TopN prerequisite catch distinguishes timeout vs failure (E8); post-render `ok` semantics documented (E6) |
| Integration | E3 broadcast gate wake once; E7 `resolveTopNHelperListConfig` via config facade; orchestrator vs `mount()` init ownership |
| Cross-module | `widgetTopN/effects/runHelperBinding.js` — direct `_applyVisualizationProperties(...)` call after export shape change |

Public API `{ mount, destroy, dispatch, getState }`, action types, and `_KDB.state.widgets.vis` shape were intentionally unchanged.

Cognos smoke (2026-06): TopN helper path, startup batch, dienststelle broadcast verified.

**Cross-module fix:** `widgetTopN/effects/runHelperBinding.js` — use `_applyVisualizationProperties(_KDB, …)` not `.applyVisualizationProperties` (regression from widgetVis export slimming).

No contract update required for the closed tranche except minor §7.0 / §15 deltas already applied (`applyPostRenderCleanup` `ok` semantics, `WIDGET_VIS_UNKNOWN_ACTION`).

---

## Deferred Items (former Step 4)

Do **not** implement opportunistically.

### D1 — Post-destroy dispatch return shape (former E1)

**Current (`widgetVis`):** post-destroy `dispatch` returns `{ ok: true, skipped: true, errorCode: "WIDGET_VIS_DESTROY_FAILED" }`.

**Inconsistency (project-wide):**

| Pattern | Modules |
|---|---|
| `ok: true` + `skipped` / `aborted` | `widgetVis`, `widgetSettings`, `widgetTopN`, `widgetText`, `widgetDataTable` |
| `ok: false` + error code | `widgetBase`, `launchpad` |

**Risk:** callers that treat `ok === true` as success without checking `skipped` / `status`.

**Before change:** grep all `_KDB.api.widgetVis.dispatch` callers; align via a **project-wide disposed-dispatch mini-contract** (see also `widgetTopN-cleanup-followup-backlog.md` F1).

### D2 — TopN cleanup skip when API missing (former E4)

**Current:** `handleCleanupContent` → `dispatchTopNCleanup` returns `{ ok: true, skipped: true }` when `_KDB.api.widgetTopN` is absent.

**Risk:** orphan TopN helper claim/runtime if cleanup runs while `widgetTopN` is not registered.

**Before change:** reproduce teardown or partial-bootstrap scenario; contract allows deferred skip — change only with evidence.

### D3 — Flat `dienststelleChanged` payload path (former E5) — **closed / no action**

**Investigation (2026-06):** production `dienststelle` always sends nested `hierarchySnapshot` from `readCurrentHierarchySnapshot()` (includes `hierarchyItemId` when Cognos resolves it). `widgetVis` `normalizeHierarchySnapshot` uses the planner path; flat path applies only to manual/test dispatches without wrapper.

**Reopen only if:** a non-test caller dispatches `widgetVis/dienststelleChanged` without `payload.hierarchySnapshot`.

**Separate edge case (not E5):** `hierarchyItemId === null` when `resolveHierarchyItemId()` fails — debug Cognos/filter API context, not flat-path normalization.

### D4 — DOM selectors registry (`dom.mdc`)

**Current:** legend/title/tooltip/content files use inline Cognos class selectors and `document.getElementById` in `resolveVisualizationContent.js`.

**Target:** `_KDB.elements.selectors.widgetVis` per `dom.mdc`.

**Risk:** low functional gain; regression risk on post-render cleanup if selectors drift.

**Scope:** separate tranche; move selectors verbatim first, no behavior “fixes” in the same PR.

### D5 — Legend vs tooltip pipe-regex unification

**Current:** `view/legend/legendCaptionText.js` uses Unicode-aware `SPACED_PIPE_DELIMITER_REGEX`; `view/syncTooltipMetadata.js` uses weaker `\s+\|\s+`.

**Before change:** confirm Cognos emits NBSP/thin-space delimiters on tooltip nodes; unifying regexes changes tooltip metadata behavior.

**Related:** visible legend-caption `#`/`ALLE`/`Beendet` normalization is implemented by `widgetVis-legend-normalization-contractdelta.md` (2026-08-26). D5 remains tooltip-node regex only.

---

## Cross-Module / Project-Wide

### Disposed-dispatch discipline

Same as D1 — treat as one decision across all `_KDB.api.*` feature modules, not a `widgetVis`-only tweak.

### Shared “default TopN” predicate

`isDefaultTopNChoice` logic appears in `widgetVis` gates, `syncVisualizationTitle`, `widgetBindingPlan`, and `widgetTopN`. A shared util reduces drift but needs a **single canonical home** (plan parsing vs vis gates) and caller audit.

### Shared `messageFromError` / small effect helpers

Duplicated per module (`widgetTopN`, `launchpad`, etc.). Belongs in a project-wide `_KDB.utils` or core helper tranche — out of scope for closed `widgetVis` cleanup unless explicitly approved.

### Export shape consistency after facade slimming

When a `widgetVis` AMD module switches from `{ fn: fn }` to direct `return fn`, grep **all** importers under `KDB3/js/**` (not only `widgetVis/`). Reference fix: `widgetTopN/effects/runHelperBinding.js`.

---

## Hygiene (low priority)

| Item | Notes |
|---|---|
| Contract approval log | `widgetVis.md` still `Draft CP-1`; update approval log when tranche is formally signed off |
| `config/visTypes/` AMD depth | Imports to `KDB3/js/core/**` from `widgetVis/config/visTypes/` need five `../` segments; audit on next touch |
| `syncVisualizationTitle` multi-export | Still returns `{ buildVisualizationTitleText, syncVisualizationTitle }`; optional slim to direct export if all callers updated |

---

## Explicit Non-Goals (remain closed)

- Changing binding pipeline semantics, settings commit timing, or TopN handshake protocol without contract delta.
- Reintroducing removed dead code (`cloneState.js`, object exports on `applyVisualizationProperties` / `readEffectiveSettingsContext`).
- Editing `.cursor/rules/` or authority docs as part of this follow-up.
- Legacy tree reads or ports (`_______REDESIGN2/`, `_______KDB3/`, `laatsteOriginal/`).

---

## Suggested Trigger To Reopen

Reopen this backlog when **one** of these is true:

1. a disposed-dispatch or teardown race bug is observed in production;
2. a project-wide disposed-dispatch standard is approved;
3. DOM/selector work is scheduled as a dedicated `dom.mdc` tranche;
4. legend/tooltip normalization becomes user-visible again (see `widgetVis-legend-normalization-backlog.md`);
5. a new `widgetVis` feature tranche touches prerequisite gates, dienststelle payload shape, or public dispatch results.

Until then, consider **`widgetVis` cleanup complete**.

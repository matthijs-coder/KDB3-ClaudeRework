# Execution Spec: Prognose Jahr before Stichtag + segmentIndex + legend B retarget

> Authority: `contracts/widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`. Do not invent. No JS until successor captain + PO implement-green after army contract-check.

---

**Status:** `Frozen` — PO smoke green 2026-09-07
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-07
**Executing AI:** grok 4.6 army (Agent A slots, Agent B legend, Agent C segmentIndex)
**Reviewer:** fresh grok 4.6 reviews after implementation
**PO green:** 2026-09-07; army contract-check CLEAR `ced41817`; successor captain stamped 2026-09-07

No harness. Tree `_____________KDB3API/` only.

Exclusive slices — **no two writers on the same file**.

---

## Agent A — slots only

**May edit:**

- `KDB3/js/core/config/visualizations/bindingSpecs.js` — Prognose bucket **only** (`com.ibm.vis.custom.prognoseyearlinechart`)
- `contracts/widgetBindingPlan.md` — §5.1 Prognose walkthrough sentence only

**Must not:** `applySlotComposition.js`, `resolveSlotColumnIds.js`, legend files, vis property files, `definitions.js`, LINE/List/pie/stacked buckets, `KDB.js`.

Change: series defaults `[Jahr, Stichtag]`. Keep `dimensionSelectionAffects: "series"` and hierarchy `insertAfterSelectedDimensionOrAt` `targetIndex: 0`.

§5.1: order is `[Dienststelle, Jahr, Stichtag]` / `[dim, Dienststelle, Jahr, Stichtag]`. Defaults remain `[Jahr, Stichtag]`.

Acceptance: no-dim DST → `[Dienststelle, Jahr, Stichtag]`; +dim DST → `[dim, Dienststelle, Jahr, Stichtag]`; omit → `[Jahr, Stichtag]` / `[dim, Jahr, Stichtag]`.

---

## Agent B — legend only

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/view/legend/collapseLegendCaptionDimParts.js`
- `contracts/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md` — pointer: Jahr-last gate superseded; keep dual-era freeze
- `contracts/widgetVis.md` — §13 Prognose **exception sentence only** (do not rewrite global exact-2). Replace with: Exception — Prognose only (`normalizeVisualizationType === "Prognose"` or exact IBM ids): when hashed `parts.length >= 5` and `parts[n-2]` is a 4-digit year, reserve n-1 Stichtag, n-2 Jahr, n-3 DST (keep) then exact-2 on prefix `slice(0, n-3)`; do not run dual-era on that result. Authority: `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`. Do not add a second exception.

**Must not:** hash, observer, titles, slots, **`legendCaptionText.js`** (boolean `_reservePrognoseTail` is already passed; do not pass visType into collapse).

Locks: exclusive B-or-dual-era; `slice(0, n-3)`; B-gate `parts[n-2]` `/^\d{4}$/` + Prognose + `n>=5`; reserve n-1 Stichtag, n-2 Jahr, n-3 DST; List skip first (already in orchestrator); no substring visType; no `findFirstYear` as B predicate.

Acceptance vectors: B1, B1-belt, B3, B4, MAG residual, B6, B7, B7b, B8 (old Jahr-last 5-token **unchanged**), B9.

If collapse would exceed 150: sibling under `view/legend/`.

---

## Agent C — segmentIndex only

**May create:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/applyPrognoseSeriesSegmentIndexes.js`

**May edit:**

- `KDB3/js/dashboard/widgets/widgetVis/effects/buildDerivedPatch.js` — **one call** from `handleApplyBindingSuccess` after `isCleanupMode` early return, before post-render `applyVisualizationProperties`. **Do not change arity.** Use `_plan`. Do **not** edit `continueBindingPlanAndApply.js`. If the file would exceed 150 or 10 AMD: extract `handleApplyBindingSuccess` to a sibling and re-export the same names from `buildDerivedPatch.js`.

**Must not:** `applyVisualizationProperties.js` (at/over 150), `definitions.js`, inner ring `cognosAPI/**`, `cognosHost` facet factories, `bindingSpecs.js`, legend files, `KDB.js`.

Behavior:

1. Gate: `normalizeVisualizationType(plan.visualization.visType or settings.visType) === "Prognose"`.
2. Read series `columnIds` from `plan.slots` (`slotName === "series"`).
3. `Array.prototype.indexOf` of exact unique names:
   - `[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]`
   - `[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]`
4. Build map: `series.year.segmentIndex` / `series.prognose.segmentIndex` only for indexes `>= 0`. JS **numbers**, not strings.
5. Write via `readVisualizationFacet(_KDB).setContentProperty` + existing `applyPropertyMap`. Outcome, not raw host Promise.
6. try/catch on export; factory-scope helpers; AMD; `"use strict"`; `_` boundary params; file ≤150; imports ≤10.
7. Cleanup / skip / abort: no-op write (do not throw into apply success). Missing facet: log + skip (boundary convert).

Forbidden: `_KDB.cognosAPI`, `__getDashboardAPI()`, deep `_KDB.services.cognosHost` lookup, new facet, hardcoded 1/2.

---

## Section A. Pre-flight (each agent)

Echo one sentence each: kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd, cognos-adapter D4, this spec, the authority delta. Then implement (successor captain pre-authorizes after echoes; do not wait a second turn **once PO has greened**).

---

## Section J. Combined acceptance

1. Slots walkthrough §0.
2. Legend B1 → `m | Stelle(Alle) | 2024 | M06`. Stichtag kept. LINE D1 frozen.
3. After apply, DST+no-dim: year **1**, prognose **2**; +dim: **2** and **3**; DST-omit no-dim: **0** and **1**.
4. No visType switch in `resolveSlotColumnIds`. No `.includes("line")`. No new facet. No compose revival. No commit.

Stop if the contract cannot be followed.

---

## Section K. Forbidden

Legacy trees `_______KDB3`, `_______REDESIGN2`, `_remediation_backup`, `laatsteOriginal`. Git commit/push. Growing `applyVisualizationProperties.js`. Sequential B+dual-era. `slice(0, n-4)`.

---

## Section L. Report (each agent, SHORT)

Pre-flight echoes; files + line/import counts; vector or index table; deviations; stop reasons.

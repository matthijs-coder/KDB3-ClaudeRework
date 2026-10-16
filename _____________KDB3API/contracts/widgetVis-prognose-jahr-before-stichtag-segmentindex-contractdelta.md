# Contract Delta: Prognose series Jahr before Stichtag + segmentIndex + legend retarget

> Supersedes the **series order** of `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` (`[dim?, Dienststelle, Stichtag, Jahr]`).
> Retargets legend product B in `contracts/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md` (Jahr is **not** last).
> Parent: `widgetBindingPlan.md` §5.1, `widgetBindingApply.md`, `widgetVis.md` §13, `cognosHostService.md` visualization `setContentProperty`.
> Apply stays `clearAllSlots` + `addDataItemsToSlot`. No `moveDataItemInSlot`. No new Cognos facet/op (D4): existing `setContentProperty` → host `setPropertyValue`. Never `.includes("line")` / `isLineLikeVisType`.

---

**Status:** `Frozen` — PO smoke green 2026-09-07
**Type:** `feature / planner + caption + vis-property contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-07
**Reviewed by:** army contract-check CLEAR `ced41817` (after adversarial patch); successor captain stamp 2026-09-07
**PO (vastenburg) 2026-09-07:** new order Dimension \| Dienststelle \| Jahr \| Stichtag; write `series.year.segmentIndex` and `series.prognose.segmentIndex` from the **actual** series list (dim in front shifts indexes; DST omit follows the real list). Go on delta+spec; successor captain implements.

---

## 0. Product lock (slots)

Exact bucket: `com.ibm.vis.custom.prognoseyearlinechart`.

```text
[dim?, Dienststelle, Jahr, Stichtag]
```

| Situation | Wanted series |
|---|---|
| no extra dim, confirmed DST | `[Dienststelle, Jahr, Stichtag]` |
| + dim, confirmed DST | `[dim, Dienststelle, Jahr, Stichtag]` |
| DST omitted | `[Jahr, Stichtag]` / `[dim, Jahr, Stichtag]` |

Do **not** invent missing columns. LINE / List / stacked / pie: **byte-unchanged**.

---

## 1. Planner (defaults swap only)

Keep live hierarchy `insertAfterSelectedDimensionOrAt`, `targetIndex: 0`. Do **not** edit `applySlotComposition.js` / `resolveSlotColumnIds.js`.

Prognose `bindingSpecs` `series` defaults: **`[Jahr, Stichtag]`** (swap of the two ids already planned; Dienststelle not in defaults). Keep `dimensionSelectionAffects: "series"`.

Walkthrough (confirmed DST):

- no dim: `[Jahr, Stichtag]` → DST at 0 → `[Dienststelle, Jahr, Stichtag]`
- + dim: prepend dim → `[dim, Jahr, Stichtag]` → DST after dim → `[dim, Dienststelle, Jahr, Stichtag]`

---

## 2. `segmentIndex` (existing op, new keys)

Host: `content.setPropertyValue` via stamped `_KDB.runtime.widgetVis.visualizationFacet.setContentProperty` (ring-1 wrap of `_KDB.cognosAPI.visualization.setContentPropertyValue`). **No** `_KDB.cognosAPI` from this feature. **No** new facet.

Keys (dotted strings, same as catalog maps):

- `series.year.segmentIndex` = 0-based index of the **Jahr** column in planned `series` `columnIds`
- `series.prognose.segmentIndex` = 0-based index of the **Stichtag** column in planned `series` `columnIds`

Derive with **Array** `columnIds.indexOf` of these **exact** unique names (Prognose `bindingSpecs` series ids):

- Jahr: `[Personal_KDB_TM1].[Jahr_flach].[Jahr_flach].[Jahr]`
- Stichtag: `[Personal_KDB_TM1].[Stichtag].[Stichtag].[Stichtag]`

Forbidden: `String.prototype.indexOf` / `.includes` on ids; short `"Jahr"` / `"Stichtag"` substrings. Do **not** count dim/DST flags. Do **not** hardcode 1 and 2 in `definitions.js`. Values are JS **numbers** (`1`, not `"1"`).

If `indexOf === -1`: **omit that key** (do not invent an index).

| Situation | year | prognose |
|---|---|---|
| DST, no dim | 1 | 2 |
| DST + dim | 2 | 3 |
| no DST, no dim | 0 | 1 |
| no DST + dim | 1 | 2 |

**When:** **after** `applyBinding` has applied slots. Pre-binding catalog `applyVisualizationProperties` is too early.

Live site: `buildDerivedPatch.handleApplyBindingSuccess(_context, _ctx, _input, _plan, _applyResult, _propertyResult)` — **do not change arity**. Use `_plan` (4th arg) `slots`. **Do not edit** `continueBindingPlanAndApply.js`. Insert the sibling call **after** the existing `isCleanupMode` early return, **before** post-render `applyVisualizationProperties`. Cleanup / abort / missing-apply skip must **not** write `segmentIndex`.

New sibling effect; reuse `applyPropertyMap` + stamped `setContentProperty`. **Do not** grow `applyVisualizationProperties.js` (150). If `buildDerivedPatch.js` would exceed 150 or 10 AMD: extract `handleApplyBindingSuccess` to a sibling and **re-export the same names** from `buildDerivedPatch.js`.

VisType gate: `normalizeVisualizationType === "Prognose"` (same aliases as legend B). Never substring.

---

## 3. Legend B retarget (keep Stichtag, collapse dim)

Product B unchanged: keep Stichtag; collapse `m | Männlich` → `m`. Titles stay `replaceTooltipInLegendTitle`. List skip first. Exclusive B **or** dual-era (never sequential). Prefix JS `slice(0, n - 3)`; `slice(0, n-4)` forbidden.

**Supersede B-gate and reserve tail** (Jahr is **not** last):

B-branch when **all** hold:

1. visType is Prognose (`normalizeVisualizationType === "Prognose"` or exact IBM ids — not raw-only `"Prognose"`)
2. `n >= 5`
3. `parts[n - 2]` matches `/^\d{4}$/` (**Jahr at n-2**, not last-part year, not `findFirstYear`)

Then reserve (keep): `n-1` Stichtag, `n-2` Jahr, `n-3` DST. Exact-2 on prefix `parts.slice(0, n - 3)`. Return. Do not run dual-era on survivors.

Else: live dual-era byte-same (LINE year-last DST).

Typical hashed 5-token (new order):

```text
m | Männlich | Stelle(Alle) | 2024 | M06
→
m | Stelle(Alle) | 2024 | M06
```

| # | visType | Input | Output |
|---|---|---|---|
| B1 | `com.ibm.vis.custom.prognoseyear` | `m \| Männlich \| Stelle(Alle) \| 2024 \| M06` | `m \| Stelle(Alle) \| 2024 \| M06` |
| B1-belt | `com.ibm.vis.custom.prognoseyearlinechart` | same | same |
| B3 | dropdown id | `Stelle(Alle) \| 2024 \| M06` | unchanged (n=3) |
| B4 | dropdown id | `m \| Männlich \| 2024 \| M06` | `m \| 2024 \| M06` (4-token dual-era; DST omitted) |
| MAG 4 | dropdown id | `MAG \| Stelle(Alle) \| 2024 \| M06` | dual-era residual (may drop Stelle) — not a fake B pass |
| B6 | `list` | B1 input | unchanged (skip collapse) |
| B7 / D1 | `line` | `m \| Männlich \| AKH(Alle) \| 2024` | `m \| AKH(Alle) \| 2024` |
| B7b | `line` | B1 5-token | unchanged 5-token (B must not run) |
| B8 old Jahr-last | dropdown id | `m \| Männlich \| Stelle(Alle) \| M06 \| 2024` | dual-era (n-2 is not year) — prefix length 3, **unchanged** 5-token |
| B9 | `null` / `""` | B1 input | unchanged 5-token |

Do **not** rewrite `widgetVis.md` §13 global exact-2 into reserve-3. **Replace only** the existing Prognose exception sentence (do not add a second exception). New fragment:

Exception — Prognose only (`normalizeVisualizationType === "Prognose"` or exact IBM ids): when hashed `parts.length >= 5` and `parts[n-2]` is a 4-digit year, reserve n-1 Stichtag, n-2 Jahr, n-3 DST (keep) then exact-2 on prefix `slice(0, n-3)`; do not run dual-era on that result. Authority: this delta.

---

## 4. Files

| Path | Role |
|---|---|
| `KDB3/js/core/config/visualizations/bindingSpecs.js` | Prognose series defaults → `[Jahr, Stichtag]` only |
| `contracts/widgetBindingPlan.md` §5.1 | Prognose walkthrough → Jahr before Stichtag |
| `widgetVis/view/legend/collapseLegendCaptionDimParts.js` | B-gate + reserve tail retarget |
| `widgetVis/effects/applyPrognoseSeriesSegmentIndexes.js` | **New.** After-slots writes of the two keys |
| `widgetVis/effects/buildDerivedPatch.js` | Call the sibling from `handleApplyBindingSuccess` (after applyBinding). Stay ≤150 / ≤10 AMD |
| `contracts/widgetVis.md` §13 | Verbatim replace of the Prognose exception only |
| Parent slot + B legend deltas | Pointer: superseded order / Jahr-last gate |

**Do not edit:** `applySlotComposition.js`, `resolveSlotColumnIds.js`, `KDB.js`, hash, observer, titles, `definitions.js` (no hardcoded segmentIndex), LINE/List/pie/stacked buckets, compose (deleted).

---

## 5. Out of scope

- New cognosHost facet or inner-ring host method
- Hardcoded year=1 / prognose=2 in the catalog
- Dropping Stichtag from captions (old option C)
- LINE / List / stacked / pie slots
- Empty Stelle product change, TopN `slotsChanged`, tooltip-text, `KDB_visible`

---

## 6. If this cannot be done

If indexes cannot be derived from `plan.slots` series `columnIds` after apply, or B1 cannot be produced without `.includes("line")` or a visType switch in `resolveSlotColumnIds`: **stop**, PO, do not improvise.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-07 | `Draft` | PO (vastenburg) go on delta+spec | Jahr before Stichtag; dynamic segmentIndex; legend B retarget; DST omit follows real list. |
| 2026-09-07 | Draft patched | coordinator | Army: uniqueName locks, handleApplyBindingSuccess arity, numeric indexes, no legendCaptionText edit. |
| 2026-09-07 | `Approved-for-implementation` | successor captain (PO go 2026-09-07; army CLEAR `ced41817`) | Stamp; Agents A/B/C execute. |
| 2026-09-07 | `Implementing` | successor captain | A slots, B legend, C segmentIndex landed. Semantic review PASS. Mechanical REJECT on `legendCaptionText.js` overridden: pre-existing prior WP boolean gate; this WP did not edit that file. Pending PO Cognos. |
| 2026-09-07 | `Frozen` | PO vastenburg smoke green | Close-out: no JS dead code; handoff archived; align-series note CLOSED. |

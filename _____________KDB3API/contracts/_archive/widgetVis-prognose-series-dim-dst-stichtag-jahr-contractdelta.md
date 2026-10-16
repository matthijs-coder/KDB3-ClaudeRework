# Contract Delta: Prognose series order Dimension → Dienststelle → Stichtag → Jahr

> Unblocks `contracts/futureTodo/prognose-align-series-with-line.md` after PO adapted the custom vis (2026-09-06).
> Reuses the live LINE hierarchy mode from `contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`. Does **not** reopen LINE / List / stacked / pie encodings (PO green 2026-09-02).
> Parent: `contracts/widgetBindingPlan.md` §5.1. Apply stays `clearAllSlots` + `addDataItemsToSlot`. No `moveDataItemInSlot`. No new Cognos facet/op (D4).

---

**Status:** `Implemented` (slots) — series order **superseded 2026-09-07** by `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`
**Parent contracts:** `widgetBindingPlan.md` §5.1, `widgetBindingApply.md`, `widgetVis.md`
**Type:** `feature / planner contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-06
**Reviewed by:** `PO (vastenburg) 2026-09-06: custom vis adapted; implement planner series order only; no segmentIndex writes unless an existing facet op is proven and contracted`

---

## 0. Product rule

Exact bucket id: `com.ibm.vis.custom.prognoseyearlinechart`. Never `.includes("line")`. Never `isLineLikeVisType`.

When Dimension, Dienststelle, Stichtag and Jahr are **already** planned on Prognose `series`, order them:

```text
[dim?, Dienststelle, Stichtag, Jahr]
```

| Situation | Live today | Wanted |
|---|---|---|
| no extra dim, confirmed DST | `[Jahr, Stichtag, Dienststelle]` | `[Dienststelle, Stichtag, Jahr]` |
| + dim, confirmed DST | `[dim, Jahr, Stichtag, Dienststelle]` | `[dim, Dienststelle, Stichtag, Jahr]` |
| no extra dim, DST omitted (`hasConfirmedSelection !== true`) | `[Jahr, Stichtag]` | `[Stichtag, Jahr]` |
| + dim, DST omitted | `[dim, Jahr, Stichtag]` | `[dim, Stichtag, Jahr]` |

Do **not** invent missing Dimension / Dienststelle / Stichtag / Jahr. Order only.

LINE / List / stacked / pie: **byte-unchanged**.

---

## 1. Planner (reuse LINE mode + Prognose defaults swap)

No visType string switch in `resolveSlotColumnIds`. No shared Line+Prognose reverse helper for `[Jahr, Stichtag]`. List `grid_cols` hierarchy stays off `series`. `applySlotComposition.insertHierarchyId` already implements `insertAfterSelectedDimensionOrAt`; **do not edit** that file or `resolveSlotColumnIds.js` unless a review proves the call does not pass `selectedDimensionId` or the mode is missing.

Prognose `bindingSpecs` bucket only:

1. `series` defaults: `[Stichtag, Jahr]` (swap of the two ids already planned; both stay).
2. Keep `dimensionSelectionAffects: "series"`.
3. Add `slotComposition.series.hierarchy`:

```js
hierarchy: {
  mode: "insertAfterSelectedDimensionOrAt",
  targetIndex: 0
}
```

Semantics (already live for LINE, after dedupe):

1. If `_selectedDimensionId` is present in the array, insert the hierarchy id **immediately after** it.
2. Else insert at clamped `targetIndex` (same clamp as `moveElement`; default `0`).
3. Unknown mode still **push**. Empty DST omit when `hasConfirmedSelection !== true` stays.

Walkthrough (confirmed DST, `targetKind !== "topNHelper"`):

- no dim: defaults `[Stichtag, Jahr]` → DST at 0 → `[Dienststelle, Stichtag, Jahr]`
- + dim: prepend dim → `[dim, Stichtag, Jahr]` → DST after dim → `[dim, Dienststelle, Stichtag, Jahr]`

Do **not** hardcode Dienststelle into Prognose `series` defaults.

KDB3 does **not** write `segmentIndex` / `series.year` / `series.prognose`. PO adapted the custom vis; default is planner order only. A `segmentIndex` write requires a later contract, an **existing** facet op, and a live caller (D4).

---

## 2. Legend / titles (slots agent: no legend files)

Keep-order + exact-2 dim collapse already run for non-List. Titles stay `replaceTooltipInLegendTitle`. Do **not** revive `composeLegendCaptionParts.js`. Never `.includes("line")` / `isLineLikeVisType`.

**Review finding (2026-09-06, agent f392f7e5):** the LINE dual-era rule does **not** cover typical Prognose. Jahr-last with Stichtag is `… | DST | Stichtag | Jahr`, so “part before year” is **Stichtag**, not Dienststelle. Exact-2 prefix then often does not fire (prefix length 3) or can drop Stelle. Handoff Cognos example `m | Stelle(Alle) | 2024` also omits Stichtag — that is a **product** choice, not implied by slots.

**PO (vastenburg) + army 2026-09-06:** product **B** implemented — keep Stichtag, collapse dim only. Caption algorithm: `contracts/widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`. Dual-era LINE unchanged.

Option C (drop Stichtag) and A (leave 5-token uncollapsed) are **rejected** for this WP.

---

## 3. Files

| Path | Role |
|---|---|
| `KDB3/js/core/config/visualizations/bindingSpecs.js` | Prognose bucket only: defaults swap + `slotComposition.series` hierarchy as above |
| `contracts/widgetBindingPlan.md` | §5.1: Prognose `series` now declares the same hierarchy mode as Line |
| `contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md` | Pointer: Prognose no longer skipped |
| `contracts/futureTodo/prognose-align-series-with-line.md` | Unblocked / implementing |

Do not edit `applySlotComposition.js`, `resolveSlotColumnIds.js`, `KDB.js`, or legend files unless a review proves the LINE mode is not already wired.

---

## 4. Out of scope

- LINE / stacked / pie / List slot order
- New `cognosHost` facet or `segmentIndex` writes
- Empty Stelle, TopN `slotsChanged: true`, tooltip-text rewrite, observer-flash, `KDB_visible`, header title
- `collapseLegendCaptionDimParts.js` algorithm (unless review proves failure)

---

## 5. If this cannot be done

If the wanted order cannot be produced without a visType switch in `resolveSlotColumnIds` or a new Cognos op: **stop**, report to PO, do not improvise.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-06 | `Approved-for-implementation` | PO (vastenburg) | Custom vis adapted this chat; planner series order only; reuse LINE `insertAfterSelectedDimensionOrAt`; no segmentIndex; no visType switch. |
| 2026-09-06 | `Implemented` (slots) + review ACCEPT | Agent A `9c046771`; review `2bdf49a5` | Prognose defaults `[Stichtag, Jahr]` + same hierarchy mode. Walkthrough matches §1. LINE/List/pie/stacked untouched. |
| 2026-09-06 | Legend **stop** | coordinator; review `f392f7e5` | Dual-era DST heuristic fails with Stichtag between DST and Jahr. PO must pick caption option A/B/C (§2) before legend JS. |
| 2026-09-06 | Product **B** chosen | coordinator (army stress-test; PO asked zoom-in) | Keep Stichtag, collapse dim. Caption delta drafted. JS pending PO implement-green. |

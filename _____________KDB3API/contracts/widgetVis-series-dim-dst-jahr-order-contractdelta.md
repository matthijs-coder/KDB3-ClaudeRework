# Contract Delta: series order Dimension → Dienststelle → Jahr (except List and Prognose)

> Supersedes the **+dimension** row of `contracts/widgetVis-line-dienststelle-series-order-contractdelta.md` (S1). Default LINE without extra dim stays `[Dienststelle, Jahr]`.
> Companion legend: `contracts/widgetVis-legend-keep-order-non-list-contractdelta.md` (same PR).
> Prognose slots: **sibling WP** — `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` (PO adapted custom vis 2026-09-06). This delta does **not** reopen LINE encodings.

---

**Status:** `Implemented` — PO (vastenburg) **green** 2026-09-02
**Parent contracts:** `widgetBindingPlan.md` §5.1, `widgetBindingApply.md`, `widgetVis.md`
**Type:** `feature / planner contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Reviewed by:** `PO (vastenburg) 2026-09-02: Dim→DST→Jahr except List; LINE +dim = [dim, DST, Jahr]; Prognose skipped; do not invent missing columns`

---

## 0. Product rule

For visualization types **other than List**, when Dimension, Dienststelle and Jahr are **already** planned in the **same slot**, order them:

```text
Dimension → Dienststelle → Jahr
```

Do **not** add Dimension or Jahr (or Dienststelle) when that column is not already on that slot. This delta is order only.

| Vis | Same-slot Dim / DST / Jahr? | Wanted |
|---|---|---|
| LINE `series` | yes (`series` holds Jahr + optional dim + DST) | no dim: `[Dienststelle, Jahr]`; +dim: `[dim, Dienststelle, Jahr]` |
| Prognose `series` | yes, plus Stichtag | **not this delta** — `widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` (`[dim?, Dienststelle, Stichtag, Jahr]`) |
| StackedBar / StackedColumn | no — Jahr is `categories`; dim+DST are `color` | leave encodings; `color` already `[dim, DST]` when both present; do not pull Jahr onto `color` |
| pie | no — dim+DST share `categories`; Jahr is `repeatHorizontal` | leave encodings. Live: no extra dim `[Geschlecht, Dienststelle]` on `categories`; +dim `[dim, Dienststelle]` (Geschlecht dropped). The `repeatVertical` replace branch in `resolveSlotColumnIds` is **unreachable** (empty and not dim-affected); do not “fix” it in this PR |
| List `grid_cols` | N/A (excluded) | unchanged List modes |

S1 live LINE +dim is `[Dienststelle, dim, Jahr]`. This delta changes that to `[dim, Dienststelle, Jahr]`.

---

## 1. LINE planner (S1 mode replacement)

Keep the S1 insert point: PLAN `columnIds`, apply stays `clearAllSlots` + `addDataItemsToSlot`. No `moveDataItemInSlot`. No new Cognos facet (D4). No visType switch in `resolveSlotColumnIds`. List fallback `resolveHierarchyPolicy` stays **`grid_cols` only**.

Replace Line `slotComposition.series.hierarchy` `moveToIndex` / `targetIndex: 0` with:

```js
hierarchy: {
  mode: "insertAfterSelectedDimensionOrAt",
  targetIndex: 0
}
```

Semantics in `insertHierarchyId` (after dedupe):

1. If `_selectedDimensionId` is present in the array, insert the hierarchy id **immediately after** it.
2. Else insert at clamped `targetIndex` (same clamp as `moveElement`; default `0`).
3. Unknown mode still **push**. Keep existing `moveToIndex` implementation (unused by current buckets after this switch).

Walkthrough (confirmed DST, `targetKind !== "topNHelper"`):

- LINE no dim: defaults `[Jahr]` → insert at 0 → `[Dienststelle, Jahr]`
- LINE + dim: prepend dim → `[dim, Jahr]` → insert after dim → `[dim, Dienststelle, Jahr]`

Do **not** hardcode Dienststelle into Line `series` defaults. Do **not** reverse `[Jahr]`. Prognose `slotComposition.series` is **not** this delta (sibling WP).

`resolveSlotColumnIds` already calls `insertHierarchyId(..., selectedDimensionId)` when a hierarchy policy exists. **Do not edit that file** unless a review proves the call does not pass `selectedDimensionId`.

---

## 2. Stacked / pie / List / Prognose

- **Stacked:** `dimensionSelectionAffects: "color"`; Jahr stays `categories`. No new `slotComposition`. Do not add Jahr to `color`.
- **pie:** DST already appends on `categories` (same slot as dim / default Geschlecht). Jahr stays `repeatHorizontal`. Do not add Jahr to `categories`. Do not retarget DST onto `repeatVertical` (that replace branch is currently unreachable).
- **List:** `grid_cols` modes unchanged.
- **Prognose:** not this delta — `widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md`.

---

## 3. Files

| Path | Role |
|---|---|
| `KDB3/js/core/config/visualizations/bindingSpecs.js` | Line hierarchy mode → `insertAfterSelectedDimensionOrAt`, `targetIndex: 0` |
| `KDB3/js/core/services/widgetBindingPlan/slots/applySlotComposition.js` | Implement the new mode in `insertHierarchyId` |
| `contracts/widgetBindingPlan.md` | §5.1 document the mode next to `moveToIndex` |
| `contracts/widgetVis-line-dienststelle-series-order-contractdelta.md` | Pointer: +dim row superseded |

Do not edit `resolveSlotColumnIds.js` unless required. No `KDB.js`. No legend files from the slots agent.

---

## 4. Out of scope

- Prognose series order / `segmentIndex` (sibling WP)
- Empty Stelle
- TopN `slotsChanged: true`
- Moving Jahr across Cognos slots (stacked categories → color, pie repeatHorizontal → categories)
- List `grid_cols`

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | Dim→DST→Jahr except List. LINE +dim `[dim, DST, Jahr]`. Prognose skipped (custom vis). Order only; no invented columns. |
| 2026-09-02 | Implemented + review ACCEPT | review agent a8520f34 | LINE `[Dienststelle, Jahr]` / `[dim, Dienststelle, Jahr]`. Prognose/stacked/pie/List unchanged. |
| 2026-09-02 | `Implemented` PO green | PO (vastenburg) | App accepted. Prognose still futureTodo. |
| 2026-09-06 | Pointer only | coordinator | Prognose unblocked as sibling delta; LINE encodings stay frozen. |

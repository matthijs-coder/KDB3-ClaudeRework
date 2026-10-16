# Future Todo: Prognose series order — unblocked (custom vis adapted)

**Status:** `CLOSED` — 2026-09-07 PO smoke green. Live law: `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md` (`[dim?, Dienststelle, Jahr, Stichtag]` + after-slots `segmentIndex` + legend B at n-2 Jahr).
**Date:** 2026-09-02 (opened) / 2026-09-06 (unblocked) / 2026-09-07 (closed)
**Owner now:** closed — do not execute from this note.

PO (vastenburg) adapted `com.ibm.vis.custom.prognoseyearlinechart` on 2026-09-06. KDB3 writes `series.year.segmentIndex` / `series.prognose.segmentIndex` via existing `setContentProperty` (`applyPrognoseSeriesSegmentIndexes.js`).

**Product lock:**

```text
[dim?, Dienststelle, Jahr, Stichtag]
```

- No extra dim → `[Dienststelle, Jahr, Stichtag]`
- DST omit follows the real list (`[Jahr, Stichtag]` / `[dim, Jahr, Stichtag]`).
- Dynamic writes: `series.year.segmentIndex` / `series.prognose.segmentIndex` via existing `setContentProperty`.
- Exact vis id `com.ibm.vis.custom.prognoseyearlinechart`. Never `.includes("line")`. Never `isLineLikeVisType`.

## Why it was blocked (historical)

`com.ibm.vis.custom.prognoseyearlinechart` source is **not** in this repo. Until 2026-09-06 the custom vis hardcoded Jahr at series index 0 (`series.year.segmentIndex = 0`). Live planner was `[Jahr, Stichtag, DST]` so Jahr stayed index 0. The locked order moves Jahr off index 0. PO adapted the vis. **Superseded 2026-09-07:** KDB3 writes `series.year.segmentIndex` / `series.prognose.segmentIndex` after slots (`applyPrognoseSeriesSegmentIndexes.js`; law `widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`).

LINE / stacked / legend work remains **closed** (PO green 2026-09-02). This item is Prognose slots only.

## Planner (this WP)

Authority: `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md`.

1. Prognose `series` defaults: `[Stichtag, Jahr]` (swap of the two already-planned ids).
2. Prognose `slotComposition.series.hierarchy`: same live LINE mode — `insertAfterSelectedDimensionOrAt`, `targetIndex: 0`.
3. Walkthrough (confirmed DST): no dim → `[Dienststelle, Stichtag, Jahr]`; + dim → `[dim, Dienststelle, Stichtag, Jahr]`.
4. Empty DST omit when `hasConfirmedSelection !== true` stays. Then `[Stichtag, Jahr]` / `[dim, Stichtag, Jahr]` — do not invent DST.
5. Do **not** copy List `grid_cols` onto series. Do **not** put a visType switch in `resolveSlotColumnIds`. Do **not** reverse `[Jahr, Stichtag]` via a shared Line+Prognose helper.
6. Captions: product **B** implemented — keep Stichtag, collapse dim only. Algorithm in `widgetVis-legend-prognose-keep-stichtag-dim-collapse-contractdelta.md`. Titles stay `replaceTooltipInLegendTitle`. PO Cognos pending.

## Explicitly not in this WP

- New `cognosHost` facet or `segmentIndex` writes
- LINE / List / stacked / pie encodings
- `composeLegendCaptionParts.js` revival

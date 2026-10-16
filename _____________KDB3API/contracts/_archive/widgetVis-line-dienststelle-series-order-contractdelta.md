# Contract Delta: LINE series order Dienststelle → dimension → Jahr

> Delta on `contracts/widgetBindingPlan.md` §5.1 / `slots/`, `contracts/widgetBindingApply.md`, `contracts/widgetVis.md` binding, and `KDB3/js/core/config/visualizations/bindingSpecs.js`.
> Product port of a proven KDB2 LINE DST-first rule. The `laatsteOriginal/KDB2` tree in this workspace is the **Jahr-first baseline** (DST append-last). The product rule below is the handover, not a copy-paste of that tree.

---

**Status:** `Approved-for-implementation`
**Parent contracts:** `widgetBindingPlan.md`, `widgetBindingApply.md`, `widgetVis.md`
**Companion:** `contracts/widgetVis-legend-line-dst-first-contractdelta.md` (captions/titles; same PR, separate agent)
**Supersede (2026-09-02):** +dimension LINE order is now `[dim, Dienststelle, Jahr]` per `contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`. Default no-dim `[Dienststelle, Jahr]` still holds.
**Type:** `feature / planner contract delta`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Reviewed by:** `PO (vastenburg) 2026-09-02: S1 + L1 same PR`

---

## 0. Diagnosis

This is **not** “code diverges from the current contract”.

Live KDB3 and `widgetBindingPlan.md` §5.1 both specify non-List merge **`Dimension | defaults | Dienststelle`**. LINE `series` is `[Jahr]` then optional prepended dim, then DST **append**. Apply only `clearAllSlots` + `addDataItemsToSlot(columnIds)` in that order. There is **no** `moveDataItemInSlot` in KDB3 (`cognosHost.visualization` has add/sort/clear only).

The product change is: LINE chart groups/colours on Dienststelle (Cognos first series field = outer series). End order:

| Situation | Today (contract + code) | Wanted |
|---|---|---|
| default (no extra dim) | `[Jahr, Dienststelle]` | `[Dienststelle, Jahr]` |
| + Geschlecht / Altersgruppe / … | `[dim, Jahr, Dienststelle]` | `[Dienststelle, dim, Jahr]` |

Prognose, bar/stacked, pie, List: **unchanged**.

---

## 1. Insert point (KDB3 architecture, not KDB2 host-move)

KDB2 did `addDataItems` then `moveDataItemInSlot("series", stelleId, 0)` in hierarchy downstream. KDB3 already composes order in **PLAN**. Do **not** add a visualization facet op (`cognos-adapter.mdc` D4).

**Canonical insert:** after dim prepend + defaults, move the hierarchy column id to series index `0`, still inside `widgetBindingPlan` `columnIds`. Apply stays dumb: write the planned array.

Gate is **Line binding bucket only** (`bindingSpecs.visTypeByBucket.Line`), slot `series`. Do **not**:

- hardcode Dienststelle into `Line.series` defaults (wrong cube / empty-select / duplicate);
- reverse the 1-item `[Jahr]` array;
- reverse Prognose `[Jahr, Stichtag]`;
- use `isLineLikeVisType` or `.includes("line")` (Cognos Prognose id `com.ibm.vis.custom.prognoseyearlinechart` contains `"line"`);
- reuse List `grid_cols` `insertBeforeSelectedDimensionOrBeforeLast` on series (Prognose `[Jahr, Stichtag]` would put DST before last = before Stichtag).

### 1.1 New `slotComposition` mode

`widgetBindingPlan.md` §5.1 adds one hierarchy mode (List modes stay):

```js
hierarchy: {
  mode: "moveToIndex",
  targetIndex: 0
}
```

Semantics in `applySlotComposition.insertHierarchyId`:

1. Dedupe the hierarchy id if already present.
2. Insert at `targetIndex` (clamp like existing `moveElement`).
3. Unknown / absent mode on non-`grid_cols` stays **append** (today’s default). **Calling `insertHierarchyId` without implementing `moveToIndex` is still a no-op** (live code pushes after the List-mode `if`).

**Triple implementation invariant (review 2026-09-02):** S1 is a no-op unless **all three** land:

1. Line `bindingSpecs` `slotComposition.series.hierarchy.mode: "moveToIndex"`.
2. `insertHierarchyId` implements that mode.
3. `resolveSlotColumnIds` calls `insertHierarchyId` for a non-`grid_cols` slot **when a hierarchy policy exists**.

`resolveHierarchyPolicy` List fallback stays **`grid_cols` only**. Do not extend it to `series` (that is S5-shared and would reorder Prognose). Honour policy on non-`grid_cols` **without** dropping the pie `repeatVertical` replace or the default `dimAffects` **push** when policy is null.

`resolveSlotColumnIds.__controller` is already at the 60-line controller hard limit. Keep the new branch tiny or extract hierarchy inject; do not add a visType switch there.

Declare it **only** on the Line bucket:

```js
// bindingSpecs.js → visTypeByBucket.Line.byKennzahlenTable.Personal_KDB
"dimensionSelectionAffects": "series",
"slotComposition": {
  "series": {
    "hierarchy": {
      "mode": "moveToIndex",
      "targetIndex": 0
    }
  }
}
```

Prognose bucket: **no** `slotComposition.series`. StackedBar/Column/pie/List: unchanged.

### 1.2 Why PLAN is enough (Stelle rebuilds)

`spec.reason: "dienststelle"` is not in the filter-only `slotsChanged` table → **unknown → true** → full slot rebuild. TopN / `hierarchy` / `hierarchyFilter` stay `slotsChanged: false` and **do not** rewrite series; they keep the last planned order. After this delta, a later TopN therefore keeps DST-first if the last slot rebuild already applied it.

Do **not** map `dienststelle` onto `hierarchyfilter` as part of this work (that would freeze series order and skip applySlots).

Writeback restore: `parameterSetBinding` → `APPLY_STARTUP_SETTINGS` with live reason **`historyReplay`** (unknown → `slotsChanged` true) → `buildPlan` → `addDataItemsToSlot`. It does **not** replay a stored series array.

**TopN product gap (accepted):** TopN does not rebuild series. Already-bound Jahr-first widgets stay Jahr-first until the next `startup` / `historyReplay` / `contentCreate` / `visType` / `dimension` / `dienststelle` rebuild. After that rebuild, later TopN **keeps** DST-first. Do not flip TopN to `slotsChanged: true` in this delta.

**Rejected alternatives (code review):** visType unshift in `resolveSlotColumnIds` (S2); new `moveDataItemInSlot` facet (S3, D4); reorder in `applySlots` (S4); copy List hierarchy mode onto series (S5); prepend DST on all series slots (S6, Prognose). List mode on **today’s** Line `[Jahr]` / `[dim, Jahr]` accidentally equals `moveToIndex 0`; that is not List’s meaning and breaks if Line series grows.

---

## 2. Empty Stelle

`dienststelle.md` **no-empty invariant**: a dashboard must not finish with no relevant Dienststelle selection. User-clear paths receive defaults.

Planner already omits DST when `hierarchySnapshot.resolution.hasConfirmedSelection !== true`.

Live notify (`notifyVisualizationWidgetDienststelleChanged`) still returns when `!useValue`, so widgetVis is not asked to rebind on a truly empty selection; DST can remain from the last successful bind until the next slot rebuild.

**Out of scope for this delta** unless PO overrides: changing notify / `dienststelleGate` / empty rebind. Defensive planner omit stays.

---

## 3. Cognos touchpoints

No new facet. Existing apply path:

- `_KDB.runtime.widgetBindingApply.visualizationFacet.clearAllSlots`
- `addDataItemsToSlot(widgetId, "series", columnIds)` in planned order

`widgetVis` does not look up `_KDB.services.cognosHost` or `_KDB.cognosAPI`.

---

## 4. Files

| Path | Role |
|---|---|
| `KDB3/js/core/config/visualizations/bindingSpecs.js` | Line-only `slotComposition.series.hierarchy.moveToIndex` |
| `KDB3/js/core/services/widgetBindingPlan/slots/applySlotComposition.js` | Implement `moveToIndex` |
| `KDB3/js/core/services/widgetBindingPlan/slots/resolveSlotColumnIds.js` | Honour hierarchy policy on non-`grid_cols` slots |
| `contracts/widgetBindingPlan.md` | Document the new mode next to List modes |

No `KDB.js`, no new `cognosHost` op, no `widgetVis/effects` slot shuffle.

---

## 5. Out of scope

- Prognose DST-first / planner order — sibling WP `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` (futureTodo unblocked 2026-09-06)
- Legend captions/titles — companion delta
- Bar / pie / List slot order
- PKZ year (label `jahr`/`year`, not series index 0)
- Chart tooltip **text** rewrite; `syncTooltipMetadata` pipe-part annotation stays
- Empty-Stelle notify/gate redesign
- Forcing TopN to rebuild slots
- Datapoint drillthrough first-match (`assembleDatapointAufriss` — first Cognos category that matches Stelle/dim). Verify in app; do not retarget in this delta unless PO says DST-first must not steal `p_aufspannen_1`

Sorting (`LINE_PROGNOSE_SORTING`) is by **column id** (Jahr/Monat), not series index — order-safe. PDF, writeback payload, PKZ year-by-label, icon drillthrough: order-safe. No `getSlotSeries` in KDB3.

---

## 6. Open questions

1. **Empty Stelle strip** — coordinator recommendation: **out of scope** (no-empty invariant). Override if PO still wants a defensive rebuild that drops DST.
2. **`moveToIndex` vs hard `prepend` in `resolveSlotColumnIds` for Line only** — recommendation: **declarative `slotComposition`** (List already uses this). A visType string check inside `resolveSlotColumnIds` is worse. **Closed by review: S1.**
3. **TopN frozen Jahr-first until next slot rebuild** — recommendation: **accept**. First Stelle/dim/visType/restore after deploy is enough.
4. **Datapoint aufriss first-match** — recommendation: **verify in app**, not in this PR.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | `Draft` | coordinator | Mapping complete. No implementation until PO accepts. |
| 2026-09-02 | `Draft` (review) | coordinator | Slot-option review + blast-radius: keep S1; record triple no-op, `historyReplay`, TopN gap, aufriss verify. |
| 2026-09-02 | `Approved-for-implementation` | PO (vastenburg) | S1 + L1 together, same PR. Do not ship slots without the legend companion. |
| 2026-09-02 | Implemented (code) + review ACCEPT | review agent 350d935e | Triple no-op live. LINE `[Dienststelle, Jahr]` / `[Dienststelle, dim, Jahr]`. Prognose still appends DST. Apply clear+add. Ship only with L1. |
| 2026-09-02 | +dim row superseded | PO (vastenburg) | LINE +dim becomes `[dim, Dienststelle, Jahr]`. See `widgetVis-series-dim-dst-jahr-order-contractdelta.md`. |
| 2026-09-02 | Blast-radius ACCEPT | review agent f366f380 | No `isLineLikeVisType` / `.includes("line")` / `moveDataItemInSlot`. Prognose/stacked/pie/List isolated. |

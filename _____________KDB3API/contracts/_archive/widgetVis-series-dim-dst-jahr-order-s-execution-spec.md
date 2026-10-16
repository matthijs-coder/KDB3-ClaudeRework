# Execution Spec: LINE Dim → Dienststelle → Jahr (hierarchy mode)

> Architectural decisions live in `contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`. Do not invent.

---

**Status:** `Frozen` — PO green 2026-09-02
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent 8d7f3181-da40-45af-9b4a-99005ed3b147 (Agent A — slots)
**Reviewer:** grok 4.6 review agent a8520f34-2ace-42ef-844f-47e7b548c66e — ACCEPT

---

## Section A. Pre-flight

Read, then echo one sentence per MUST-rule + cognos-adapter D4 in the final report: kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd, cognos-adapter.

Also read the authority delta, this spec, and the live files in Section B.

Do not read legend files. Do not edit Prognose / List / stacked / pie buckets except if you accidentally open them — leave them unchanged.

---

## Section B. Files only

```
_____________KDB3API/KDB3/js/core/config/visualizations/bindingSpecs.js
_____________KDB3API/KDB3/js/core/services/widgetBindingPlan/slots/applySlotComposition.js
_____________KDB3API/contracts/widgetBindingPlan.md
```

Do **not** edit `resolveSlotColumnIds.js` unless `insertHierarchyId` is not already passed `selectedDimensionId` (it is). Hard cap 150 lines; `insertHierarchyId` is a helper not the 60-line controller.

---

## Section C. Per-file

#### `bindingSpecs.js`

- Line `Personal_KDB` `slotComposition.series.hierarchy` only: change `mode` from `"moveToIndex"` to `"insertAfterSelectedDimensionOrAt"`; keep `"targetIndex": 0`.
- Keep `dimensionSelectionAffects: "series"`. No Dienststelle in series defaults.
- Prognose / stacked / pie / List: **byte-unchanged**.

#### `applySlotComposition.js`

- In `insertHierarchyId`, after the List-mode `if`, before `moveToIndex`:
  - `mode === "insertAfterSelectedDimensionOrAt"`
  - If `_selectedDimensionId` is in `next`, insert hierarchy id at `index + 1`
  - Else insert at clamped `targetIndex` (default 0; same clamp as `moveElement`)
- Keep `moveToIndex` and unknown-mode **push**.
- Factory-scope named helpers; AMD `define`; no ESM.
- **Rules:** amd, naming, error-handling (keep existing pure-helper pattern), feature-structure ≤150, cognos-adapter D4 (no facet).

#### `widgetBindingPlan.md` §5.1

- Document `insertAfterSelectedDimensionOrAt` next to `moveToIndex`.
- State Line `series` uses it; List fallback remains `grid_cols` only; Prognose has no series hierarchy policy.

---

## Section J. Acceptance

1. LINE no dim: `[Dienststelle, Jahr]`
2. LINE + dim: `[dim, Dienststelle, Jahr]` (not `[Dienststelle, dim, Jahr]`)
3. Prognose unchanged (no slotComposition.series)
4. pie `repeatVertical` replace intact; List `grid_cols` modes intact
5. No visType string in slot files. No new facet.

Stop and report if the contract cannot be followed.

---

## Section L. Report (SHORT)

Pre-flight echoes; file checklist + line counts; diffs summary; contract-vs-code walkthrough Line no-dim / Line+dim / Prognose; risks.

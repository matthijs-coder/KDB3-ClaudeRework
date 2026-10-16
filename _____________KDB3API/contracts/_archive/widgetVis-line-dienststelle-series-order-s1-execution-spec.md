# Execution Spec: LINE series DST-first (S1)

> Cheap-AI implementation spec. Product architecture lives in the approved delta. This spec says HOW to build, not WHAT the product is. Do not invent.

---

**Status:** `Reviewed` — implementer grok 4.6 2026-09-02; review agent **ACCEPT** (triple no-op, Prognose/pie/List isolation, apply clear+add)
**Module / contract:** `_____________KDB3API/contracts/widgetBindingPlan.md`
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-line-dienststelle-series-order-contractdelta.md`
**Companion (do not implement):** `_____________KDB3API/contracts/widgetVis-legend-line-dst-first-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent 9162bf73-d7e3-4b1e-90d5-ace833982bd2 (Agent A — slots)
**Reviewer:** grok 4.6 review agent 350d935e-0ef8-4272-b8c7-acc4cd11ae3b — ACCEPT

---

## Section A. Pre-flight read list

Read each file **before** editing. Echo **one sentence per MUST-rule** in the final report (do not wait for a human; implement in the same turn after echoing internally).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` (D4: no new facet/op)
12. The approved delta (authority)
13. This execution spec
14. Current live files listed in Section B (read, then patch)

Do **not** read: `widgetVis/view/legend/**`, KDB2/`laatsteOriginal`, `_______KDB3`, `_______REDESIGN2`, `_remediation_backup`.

---

## Section B. Folder tree (edit only these)

```
_____________KDB3API/KDB3/js/core/config/visualizations/
  bindingSpecs.js
_____________KDB3API/KDB3/js/core/services/widgetBindingPlan/slots/
  applySlotComposition.js
  resolveSlotColumnIds.js
_____________KDB3API/contracts/
  widgetBindingPlan.md   (§5.1 only — new hierarchy mode next to List modes)
```

If `resolveSlotColumnIds.__controller` cannot stay ≤ 60 lines, extract a **sibling** under `slots/` (e.g. hierarchy-inject helper). Report the new path. Do not exceed 150 lines on any executable file; extract sibling instead.

---

## Section C. Per-file specifications

#### `KDB3/js/core/config/visualizations/bindingSpecs.js`

- **Role**: declarative vis-type binding config
- **Change**: Line bucket only (`visTypeByBucket.Line` → `byKennzahlenTable.Personal_KDB`). Add:

```js
"slotComposition": {
  "series": {
    "hierarchy": {
      "mode": "moveToIndex",
      "targetIndex": 0
    }
  }
}
```

- Keep existing `"dimensionSelectionAffects": "series"`.
- Do **not** put Dienststelle into Line `series` defaults.
- Prognose / stacked / pie / List buckets: **unchanged**. No `slotComposition.series` on Prognose.
- **Rules to apply**: `naming.mdc` (config keys camelCase as live); `feature-structure.mdc` (config file); `cognos-adapter.mdc` (no new Cognos op). This file is JSON-like config inside AMD — do not convert to ESM.

#### `KDB3/js/core/services/widgetBindingPlan/slots/applySlotComposition.js`

- **Role**: named helper `insertHierarchyId` (factory-scope)
- **Change**: implement `hierarchy.mode === "moveToIndex"`:
  1. Dedupe the hierarchy id if already present.
  2. Insert at `targetIndex` (clamp like existing `moveElement`).
  3. Unknown / absent mode on non-`grid_cols` stays **push** (today’s default after the List-mode `if`).
- Do not implement host `moveDataItemInSlot`. Do not reorder in applySlots.
- **Rules to apply**: `amd.mdc` (factory-scope named helpers; full-compact `define`); `naming.mdc`; `error-handling.mdc` (try/catch on named executables unless the existing helper is a pure one-liner — keep the file’s existing error pattern; do not strip try/catch if present); `feature-structure.mdc` (≤150 lines).

#### `KDB3/js/core/services/widgetBindingPlan/slots/resolveSlotColumnIds.js`

- **Role**: `__controller` slot column-id composition
- **Change (tiny)**: call `insertHierarchyId` for a **non-`grid_cols`** slot **when a hierarchy policy exists**.
- `resolveHierarchyPolicy` List fallback stays **`grid_cols` only**. Do not lift it to `series`.
- Honour policy **without** dropping pie `repeatVertical` replace or the default `dimAffects` **push** when policy is null.
- **Forbidden in this file**: visType string checks; `isLineLikeVisType`; `.includes("line")`; Dienststelle hardcoded; reverse of `[Jahr]` or Prognose `[Jahr, Stichtag]`.
- `__controller` is already at the 60-line controller hard limit. Keep the new branch tiny or extract sibling. Do not grow the controller function past 60 lines.
- **Rules to apply**: `amd.mdc`; `naming.mdc` (`__controller`, `_` on boundary params); `feature-structure.mdc` (controller function ≤60; file ≤150); `error-handling.mdc`; `cognos-adapter.mdc` (plan-only; no facet).

#### `contracts/widgetBindingPlan.md` §5.1

- Add hierarchy mode `moveToIndex` + `targetIndex` next to the existing List modes.
- Semantics: dedupe hierarchy id, insert at clamped `targetIndex`. Unknown mode on non-`grid_cols` remains append.
- State that Line `series` declares this mode in `bindingSpecs`; other vis buckets unchanged.
- Do not rewrite the rest of the parent. Do not claim List fallback now applies to `series`.

---

## Section J. Acceptance criteria

1. Triple no-op: (1) Line bindingSpecs policy, (2) `insertHierarchyId` implements `moveToIndex`, (3) `resolveSlotColumnIds` calls it on non-`grid_cols` when policy exists. Missing any one = fail.
2. Default LINE plan order with confirmed DST: `[Dienststelle, Jahr]`. With extra dim: `[Dienststelle, dim, Jahr]`.
3. Prognose series unchanged (`[Jahr, Stichtag]` then DST append; with dim `[dim, Jahr, Stichtag, DST]`).
4. pie `repeatVertical` replace still works. Default dimAffects push still works when hierarchy policy is null.
5. Apply path untouched: still `clearAllSlots` + `addDataItemsToSlot(columnIds)` in planned order. No `moveDataItemInSlot`.
6. No new Cognos facet/op. No `KDB.js`. No legend files. No TopN `slotsChanged: true`. Empty Stelle out of scope.
7. Line counts: executable files ≤150; `__controller` function ≤60 or extracted.
8. AMD `define()`, factory-scope named helpers, no ESM.

---

## Section K. Forbidden actions

- Edit any legend file, `composeLegendCaptionParts.js`, `widgetVis.md`, or the legend deltas.
- New `cognosHost` facet or `moveDataItemInSlot`.
- visType switch inside `resolveSlotColumnIds`.
- Copy-paste from KDB2 / `laatsteOriginal` as DST-first source (that tree is Jahr-first).
- Git commit/push. Invent S2–S6. Scope: Prognose DST-first, empty Stelle, TopN slotsChanged, aufriss retarget.
- If the contract cannot be followed: **stop and report**. Do not invent.

---

## Section L. Report (keep short)

1. Pre-flight: one sentence per MUST-rule + cognos-adapter D4.
2. File checklist: path, line count, controller-function line count if applicable, matches spec | deviation.
3. Diffs summary (not full dumps): what changed in each file.
4. Contract-vs-code: triple no-op yes/no; Prognose/pie/List untouched yes/no.
5. Risks / open questions. Stop items if any.

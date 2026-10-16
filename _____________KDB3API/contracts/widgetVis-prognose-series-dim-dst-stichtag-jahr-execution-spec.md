# Execution Spec: Prognose series Dim → Dienststelle → Stichtag → Jahr

> Architectural decisions live in `contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md`. Do not invent. Reuse live LINE hierarchy mode. No new architecture.

---

**Status:** `Executed` — slots review **ACCEPT** (`2bdf49a5`). Legend not in this spec.
**Delta (authority):** `_____________KDB3API/contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md`
**Product lock:** `_____________KDB3API/contracts/futureTodo/prognose-align-series-with-line.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator Grok 4.6, 2026-09-06
**Executing AI:** grok 4.6 Agent A (slots)
**Reviewer:** fresh grok 4.6 review agents after implementation

No harness. Production tree `_____________KDB3API/` only.

---

## Exclusive allowlist (Agent A)

**May edit:**

- `_____________KDB3API/KDB3/js/core/config/visualizations/bindingSpecs.js` — Prognose vis bucket **only**
- `_____________KDB3API/contracts/widgetBindingPlan.md` — §5.1 one bullet: Prognose `series` now uses the same hierarchy mode as Line

**Must not edit:** `applySlotComposition.js`, `resolveSlotColumnIds.js`, `KDB.js`, any legend file, LINE / List / stacked / pie buckets, `.cursor/rules/**`, other contracts except the §5.1 bullet above.

If `insertHierarchyId` is missing `insertAfterSelectedDimensionOrAt` or `resolveSlotColumnIds` does not pass `selectedDimensionId`: **stop** and report. Do not grow `resolveSlotColumnIds` (already at the 60-line `__controller` cap). Do not add a visType switch.

Hard cap: 150 lines per JS file. No git commit/push.

---

## Section A. Pre-flight

Read, then echo **one sentence each** in the final report (supervising captain pre-authorizes proceeding after you have read them; do not wait for a second turn):

1. `kdb-object.mdc`
2. `state.mdc`
3. `runtime.mdc`
4. `module-public-api.mdc`
5. `events.mdc`
6. `feature-structure.mdc`
7. `naming.mdc`
8. `error-handling.mdc`
9. `dom.mdc`
10. `amd.mdc`
11. `cognos-adapter.mdc` — D4: no new facet/op; no `segmentIndex` writes
12. Authority delta + this spec + `widgetBindingPlan.md` §5.1 hierarchy bullets
13. Live Prognose bucket in `bindingSpecs.js` (locate by **exact** id `com.ibm.vis.custom.prognoseyearlinechart`; never `.includes("line")`)
14. Confirm LINE already declares `insertAfterSelectedDimensionOrAt` + `targetIndex: 0` on Line `series`, and `insertHierarchyId` already implements that mode — then leave those files untouched

Do not dump `bindingSpecs.js` or `widgetVis.md` into the report. Cite paths + short diffs only.

---

## Section C. Per-file

#### `bindingSpecs.js` (Prognose bucket only)

Locate the Prognose visualization bucket by exact Cognos id `com.ibm.vis.custom.prognoseyearlinechart` (or the Personal_KDB sibling keyed that way). Do not match Line. Do not match UI label `"Prognose"` via substring.

Changes:

1. `series` defaults: swap to `[Stichtag, Jahr]` (same two planned ids; order only). Keep both. Do not add Dienststelle to defaults.
2. Keep `dimensionSelectionAffects: "series"`.
3. Add `slotComposition.series.hierarchy` exactly:

```js
mode: "insertAfterSelectedDimensionOrAt",
targetIndex: 0
```

Match the Line `series` hierarchy object shape already in this file (same keys, Prognose bucket only).

LINE / List / stacked / pie buckets: **byte-unchanged**.

**Rules to apply:** `naming.mdc` (English identifiers; exact vis id); `feature-structure.mdc` (config file; no vague folders); `cognos-adapter.mdc` D4 (config only, no facet); `amd.mdc` (keep existing AMD if the file uses it).

#### `widgetBindingPlan.md` §5.1

On the existing `insertAfterSelectedDimensionOrAt` bullet (today: Line `series` declares the mode; “Prognose has no `slotComposition.series` hierarchy policy”):

- Keep the Line walkthrough.
- Replace the Prognose clause with: Prognose `series` (`com.ibm.vis.custom.prognoseyearlinechart`) declares the **same** mode (`targetIndex: 0`) so order is `[Dienststelle, Stichtag, Jahr]` with no extra dimension and `[dim, Dienststelle, Stichtag, Jahr]` when a dimension is already on the slot. Defaults remain `[Stichtag, Jahr]`; Dienststelle is not hardcoded into defaults.

Do not lift List `grid_cols` fallback onto `series`. Do not document a visType switch.

---

## Section J. Acceptance

1. Prognose no dim, confirmed DST: `[Dienststelle, Stichtag, Jahr]`
2. Prognose + dim, confirmed DST: `[dim, Dienststelle, Stichtag, Jahr]`
3. DST omitted: `[Stichtag, Jahr]` / `[dim, Stichtag, Jahr]` — no invented DST
4. LINE / List / pie / stacked buckets byte-unchanged
5. No visType string switch. No `.includes("line")`. No `isLineLikeVisType`. No new facet. No `segmentIndex`.
6. `applySlotComposition.js` and `resolveSlotColumnIds.js` not edited
7. No legend files touched

Stop and report if the contract cannot be followed.

---

## Section K. Forbidden

- Production JS outside the Prognose `bindingSpecs` bucket
- `composeLegendCaptionParts.js` revival
- Shared Line+Prognose reverse helper
- Commit / push / git config
- Legacy trees: `_______KDB3`, `_______REDESIGN2`, `_remediation_backup`, `laatsteOriginal`

---

## Section L. Report (SHORT)

1. Pre-flight echoes (numbered)
2. File checklist + line counts
3. Diff summary (Prognose bucket keys only; no full file dump)
4. Contract-vs-code walkthrough: no-dim / +dim / DST-omitted
5. Confirmation LINE/List/pie/stacked untouched; no visType switch; D4
6. Open questions / stop reasons

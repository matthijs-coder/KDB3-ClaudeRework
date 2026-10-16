> **SUPERSEDED / archived 2026-09-07.** WP implemented (Jahr before Stichtag + segmentIndex + legend B). PO smoke green. Not a live launch prompt. Law is `contracts/widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`. Do not execute from here.

---

# Launch prompt — Prognose Jahr before Stichtag + segmentIndex + legend B retarget

Paste into a **fresh** agent chat. Do **not** continue the previous Prognose coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace-root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Production code lives **ONLY** in `_____________KDB3API/` (not `_______KDB3`, not `_______REDESIGN2`, not `_remediation_backup`).

Talk to PO in **Dutch**. Contracts, code, comments, agent-prompts: **English**.

---

## Token budget — 256k, take this seriously

Delegation is **mandatory**. You read/write **contracts** and **execution specs**. Grok 4.6 subagents do primary code-read, code-write, and reviews.

You do **not** dump `bindingSpecs.js`, `widgetVis.md`, `buildDerivedPatch.js`, or the whole legend pipeline into the captain thread. Point subagents at paths. Demand short structured reports.

Extra investigation and extra review via subagents is **in principle a good thing**. Quality over speed.

---

## You are

Organizer / coordinator / planner / team captain.

**Do**
- Module Contract First. An approved delta outranks improvisation.
- This WP’s law is already written and army-checked **CLEAR**. Implement it; do not reopen LINE / List / stacked / pie encodings (PO green 2026-09-02).
- If the contract cannot be followed: **stop**, PO, update contract, resume. Silent divergence forbidden.
- Cognos: existing `setContentProperty` only (wraps host `setPropertyValue`). **No new facet/op** (D4, `cognos-adapter.mdc`). Features use stamped `_KDB.runtime.widgetVis.visualizationFacet`, not `_KDB.cognosAPI`, not `__getDashboardAPI()`, not deep `_KDB.services.cognosHost`.
- After army implementation: **fresh** review agents (not the authors). Stamp contracts. Report to PO in Dutch. No git commit/push unless PO asks.

**Do not**
- Write production JS yourself (`KDB3/js/**`). That is Grok 4.6 subagent work.
- Reopen LINE / List / stacked / pie slot encodings.
- Revive `composeLegendCaptionParts.js`.
- Use `.includes("line")`, `.includes("prognose")`, or `isLineLikeVisType`.
- Put a visType switch in `resolveSlotColumnIds`.
- Grow `applyVisualizationProperties.js` (already 150).
- Edit `continueBindingPlanAndApply.js` or `legendCaptionText.js`.
- Hardcode `segmentIndex` 1/2 in `definitions.js`.
- Copy List `grid_cols` onto `series`.
- Git commit/push unless PO asks.

---

## Start here (do this first)

1. Read (do not re-litigate):
   - `_____________KDB3API/contracts/widgetVis-prognose-jahr-before-stichtag-segmentindex-contractdelta.md`
   - `_____________KDB3API/contracts/widgetVis-prognose-jahr-before-stichtag-segmentindex-execution-spec.md`
2. Stamp both **Approved-for-implementation** / **Ready for execution** (PO go was 2026-09-07; army contract-check CLEAR `ced41817` after adversarial patch).
3. Launch **Agent A** (slots), then **Agent B** (legend), then **Agent C** (segmentIndex) — exclusive file slices in the spec. Parallel A+B is OK; C depends on planned series ids (uniqueNames are already in the spec; A should land defaults swap first or C uses those exact strings anyway).
4. Fresh reviews vs spec Section J. Fix via subagents if REJECT.
5. Report to PO (Dutch): slots walkthrough; caption example `m | Stelle(Alle) | 2024 | M06`; Cognos checklist (nested series: dim, Stelle, Jahr, Stichtag last; properties year/prognose indexes; custom vis still correct). No “klaar Frozen” until PO Cognos green. No commit.

---

## Product (locked)

Series: **`[dim?, Dienststelle, Jahr, Stichtag]`**.

Planner: keep `insertAfterSelectedDimensionOrAt` `targetIndex: 0`; Prognose defaults **`[Jahr, Stichtag]`** (swap from live `[Stichtag, Jahr]`).

`segmentIndex` from **actual** `plan.slots` series `columnIds` after apply:

| Situation | year | prognose |
|---|---|---|
| DST, no dim | 1 | 2 |
| DST + dim | 2 | 3 |
| no DST, no dim | 0 | 1 |
| no DST + dim | 1 | 2 |

Keys: `series.year.segmentIndex`, `series.prognose.segmentIndex`. JS numbers. Exact uniqueNames in the delta.

Legend B: keep Stichtag, collapse dim. Gate: Prognose + `n>=5` + **`parts[n-2]` is year**. Reserve n-1 Stichtag, n-2 Jahr, n-3 DST. Exclusive B or dual-era. `slice(0, n-3)`.

---

## MUST via subagents (do not ingest all `.mdc`)

`kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, `cognos-adapter.mdc` D4.

150-line JS cap. `applyVisualizationProperties.js` = 150 already. `buildDerivedPatch.js` ≈ 146 / 6 AMD.

---

## Context the previous captain already settled (do not re-investigate unless a subagent proves otherwise)

- KDB3 did **not** previously write those `segmentIndex` keys. Adding them is existing op + new keys.
- Catalog `propertyValues` cannot encode “+1 if dim”. Dynamic write after slots only.
- `handleApplyBindingSuccess` already receives `_plan`. Cleanup early-return must not write.
- `legendCaptionText.js` already passes boolean `_reservePrognoseTail`; Agent B only retargets collapse internals.
- Previous WP (Jahr last, product B captions) is live; this WP **supersedes series order and B-gate**. LINE dual-era stays frozen.
- MAG 4-token residual: dual-era may still drop Stelle — document, do not “fix” with a global heuristic.

---

## Out of scope

Empty Stelle product, TopN `slotsChanged: true`, tooltip-text rewrite, observer-flash, `KDB_visible`, header title, new Cognos facet.

---

## First message to PO

Short Dutch: delta+spec already CLEAR; you start Agent A/B/C; no “klaar” before review; no production JS from your hands.

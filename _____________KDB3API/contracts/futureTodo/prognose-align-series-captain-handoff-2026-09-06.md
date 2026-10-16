# Launch prompt — Prognose series Dim→DST→Stichtag→Jahr (custom vis adapted)

Paste into a **fresh** agent chat. Do **not** continue the LINE DST-first coordinator chat (token context full / closed). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace-root:
`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Production code lives **ONLY** in `_____________KDB3API/` (not `_______KDB3`, not `_______REDESIGN2`, not `_remediation_backup`).

Talk to PO in **Dutch**. Contracts, code, comments, agent-prompts: **English**.

---

## Token budget — 256k, take this seriously

Delegation is mandatory. You read/write **contracts** and **execution specs**. Grok 4.6 subagents do primary code-read, code-write, and reviews.

You do **not** dump `bindingSpecs.js`, `widgetVis.md`, or the whole legend pipeline into the captain thread. Point subagents at paths. Demand short structured reports.

---

## You are

Organizer / coordinator / planner / team captain.

**Do**
- Module Contract First. Authority is the futureTodo product lock + the live LINE planner mode (reuse, do not invent a visType switch).
- Unblock/update the futureTodo, write a **new** Prognose slot contract delta, then an execution spec, then army implementation, then **fresh** review agents.
- If the contract cannot be followed: **stop**, PO, update contract, resume. Silent divergence forbidden.
- Cognos: existing facets only. **No new facet/op** (D4, `cognos-adapter.mdc`). PO has adapted the custom vis; default is **planner series order only** — do **not** add `segmentIndex` writes unless a subagent proves an **existing** facet op is required and the contract says so.
- Quality over speed. Extra investigation/review via subagents is good.

**Do not**
- Write production JS yourself (`KDB3/js/**`). That is Grok 4.6 subagent work.
- Reopen LINE / List / stacked / pie encodings (PO green 2026-09-02).
- Revive `composeLegendCaptionParts.js` (deleted 2026-09-02).
- Use `.includes("line")` or `isLineLikeVisType`. Prognose Cognos id `com.ibm.vis.custom.prognoseyearlinechart` **contains** `"line"`.
- Copy List `grid_cols` hierarchy onto `series`.
- Put a visType string switch in `resolveSlotColumnIds`.
- Reverse `[Jahr, Stichtag]` with a shared Line+Prognose helper.
- Git commit/push unless PO asks.
- Scope: empty Stelle, TopN `slotsChanged: true`, tooltip-text rewrite, observer-flash, `KDB_visible`, header title.

---

## Authority (read these; do not re-litigate)

1. **This item (product lock):**  
   `_____________KDB3API/contracts/futureTodo/prognose-align-series-with-line.md`  
   Wanted series: **`[dim?, Dienststelle, Stichtag, Jahr]`**.  
   No extra dim: `[Dienststelle, Stichtag, Jahr]`. Order only; do not invent missing columns.  
   Exact bucket id: `com.ibm.vis.custom.prognoseyearlinechart`.

2. **How LINE already does Dim→DST→Jahr (reuse):**  
   `_____________KDB3API/contracts/widgetVis-series-dim-dst-jahr-order-contractdelta.md`  
   Mode already live: `insertAfterSelectedDimensionOrAt` + `targetIndex: 0` on Line `series`. Prognose currently has **no** `slotComposition.series`.

3. **Legend already keep-order + dim collapse (do not rewrite):**  
   `_____________KDB3API/contracts/widgetVis-legend-dim-token-collapse-contractdelta.md`  
   After this slot change, Prognose captions become Jahr-last (like LINE). DST heuristic “year is last → DST is the part before year” then applies. Collapse `m | Männlich` → `m` already runs for non-List. Titles stay `replaceTooltipInLegendTitle` unless PO asks otherwise.  
   Vector **D4** in that delta is the **old** Jahr-first Prognose caption; retarget after the slot change.

4. Parent: `_____________KDB3API/contracts/widgetBindingPlan.md` §5.1. Apply stays dumb: `clearAllSlots` + `addDataItemsToSlot(columnIds)`. No `moveDataItemInSlot`.

5. MUST checklist (echo via subagents, do not ingest all `.mdc` into captain context):  
   `kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus `cognos-adapter.mdc` D4.  
   150-line file cap; `__controller` 60 lines (`resolveSlotColumnIds` is already at the cap — do not grow it).

---

## Live facts (do not guess)

Prognose `bindingSpecs` today: `series` defaults `[Jahr, Stichtag]`, `dimensionSelectionAffects: "series"`, DST **append** (no hierarchy policy) → `[Jahr, Stichtag, DST]` / `[dim, Jahr, Stichtag, DST]`.

LINE already: defaults `[Jahr]` + `insertAfterSelectedDimensionOrAt` → `[Dienststelle, Jahr]` / `[dim, Dienststelle, Jahr]`.

**Recommended planner shape (not architecture invention — it is the LINE mode + defaults swap):**

1. Prognose `series` defaults: `[Stichtag, Jahr]` (swap only; both already planned).
2. Prognose `slotComposition.series.hierarchy`: same as Line — `mode: "insertAfterSelectedDimensionOrAt"`, `targetIndex: 0`.
3. Walkthrough (confirmed DST):
   - no dim: defaults `[Stichtag, Jahr]` → DST at 0 → **`[Dienststelle, Stichtag, Jahr]`**
   - + dim: prepend dim → `[dim, Stichtag, Jahr]` → DST after dim → **`[dim, Dienststelle, Stichtag, Jahr]`**
4. Empty DST omit when `hasConfirmedSelection !== true` stays. Then series is `[Stichtag, Jahr]` / `[dim, Stichtag, Jahr]` — do not invent DST.

If a subagent finds this cannot work without a visType switch or a new Cognos op: **stop** and ask PO.

---

## Out of scope

- LINE / stacked / pie / List slot order
- New `cognosHost` facet or `segmentIndex` writes unless contract + existing op + live caller
- Legend compose revival
- Changing `collapseLegendCaptionDimParts.js` unless a review proves Jahr-last Prognose captions fail the existing dual-era heuristic
- Copy-paste from `laatsteOriginal/KDB2` as DST-first source (that tree is Jahr-first)

---

## Sequence

0. Stamp/update `prognose-align-series-with-line.md`: PO adapted custom vis 2026-09-06; blocker lifted; still no JS until the **new** slot delta is Approved-for-implementation (PO already unlocked product; captain may stamp the delta Approved if PO’s “vis is adapted, implement” is this chat).
1. Write `_____________KDB3API/contracts/widgetVis-prognose-series-dim-dst-stichtag-jahr-contractdelta.md` (English). Execution spec from `_executionSpecTemplate.md` (short; no new architecture).
2. Agent A (slots only): `bindingSpecs.js` Prognose bucket, maybe `widgetBindingPlan.md` §5.1 one bullet. Prefer **not** editing `applySlotComposition.js` / `resolveSlotColumnIds.js` if the LINE mode already covers it. File-lock: Agent A must not touch legend files.
3. Agent B only if legend vectors/parent bullets need Prognose Jahr-last examples — **not** if collapse already handles it. Verify with a review agent; do not “improve” titles.
4. Fresh review: walkthrough no-dim / +dim; Prognose-only bindingSpecs; LINE/List/pie/stacked untouched; no visType switch; no new facet; 150/60 caps.
5. Report to PO (Dutch): what landed; Cognos checklist (nested series outer=dim then Stelle then Stichtag, Jahr inner; captions `m | Stelle(Alle) | 2024`; custom vis year/prognose still correct). No commit.

---

## First message to PO

Short: futureTodo unblocked; Prognose slot delta + Agent A started; you wait for review before “klaar”. No production JS from your hands.

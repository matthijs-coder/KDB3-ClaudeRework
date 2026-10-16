# Launch prompt — TopN NewestStichtag captain 2026-09-01

Paste into a **fresh** agent chat. Do **not** continue the previous TopN / verse-coordinator chat (token context full). Do **not** load that chat or its agent transcripts.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Cursor Grok 4.6** — use a slug from the Task tool list (predecessor used `cursor-grok-4.6-xhigh`). Do not invent a slug. PO = vastenburg.

Talk to the PO in **Dutch**. Artifacts (contracts, code, names) **English**.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally read `widgetTopN.md` (~760 lines), `widgetVis.md` (~1200), all kennzahlDefaults, CLUSTER_E rapport, or re-walk the Jahr/Monat investigation.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts or `.mdc` bodies into this chat.
- Do **not** re-read all `.mdc` files here. Point the army at named files + named MUST clauses.
- One job at a time in *your* context: synthesize army verdicts, stamp/patch the contract, brief writers.
- **Quality over speed:** extra investigation and review via grok 4.6 subagents is a **good** default. Do not implement from memory of this prompt. Pre-impl contract-vs-code **and** post-impl review by a **different** subagent are required.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- **Module Contract First.** You **write and read contracts**. Subagents check contracts against the live codebase **before** and **after** JS.
- Always diagnose: does the codebase fail the contract, or do both have the right logic but implementation is missing / flooded / overwritten? (This issue was **flooded year-grain in both** — not a lookup bug.)
- Order of work. PO questions only when code/contracts cannot answer.
- Spec slices for subagents: **one job per agent**, file size limits, named MUST rules, exclusive file allowlists.
- Review: contract-vs-code, MUST rules, no silent divergence. If implementation must diverge, **stop and patch the contract** (PO agrees) before more JS.
- After code: a **different** subagent reviews before you declare done.
- Parallel explore agents when jobs do not share files.
- Verify TopN in the browser if browser tools exist (user rule): empty Jahr, Jahr 2026, Jahr 2025. Otherwise say what you could not verify.

### Do not

- Be the army. Do not ingest all `.mdc` files into this chat.
- Write the **bulk of production JS** yourself. You may stamp contract status / tiny parent pointers. Subagents write JS.
- Re-open **closed** PO decisions below.
- Re-investigate Pad A (Monat Code `01`–`12` on the helper) unless live Cognos `addFilter` evidence appears that the delta is wrong.
- Re-open visType split (max complete year vs max month) or calendar-year default (23.08 futureTodo — **superseded**).
- Pixel-parity with lastOriginal TopN year-table behaviour.
- Load predecessor captain chats. This file + the NewestStichtag delta + live JS are the source of truth.
- Commit unless PO asks. No push. No `.mdc` edits unless PO asks.

### Army (grok 4.6) does

- Read live files and return **citations** (path + lines).
- Draft/edit **one** slice: either a contract stamp or a small set of JS files per task.
- Review a slice against named `.mdc` rules + the NewestStichtag delta + parent `widgetTopN.md` §8.1.1.
- Do not invent architecture. Do not reopen closed PO decisions.

Never: two writers on the same file.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Active: `_____________KDB3API/`

Ignore: `_______KDB3`, `_______REDESIGN2`, `.cursor oud`, `_remediation_backup` except as cited evidence.

Live MUST: `_____________KDB3API/.cursor/rules/` — especially **`cognos-adapter.mdc`**, `state.mdc` (only `tableDataService` writes `_KDB.state.tableData`), `feature-structure.mdc` (JS 80–120 target / **150 hard**, **>6 AMD imports = smell, >10 forbidden**), kdb-object, runtime, module-public-api, events, naming, error-handling, dom, amd.

Authority (highest first): approved **module contract + this delta** > `.cursor/rules/` > architecture. Silent contract/code divergence is forbidden.

---

## Closed product decisions (do not reopen)

1. **Grain:** last **month** of the selected Jahr period, not year-only, not calendar year.
2. **Source:** leftover Cognos List, vis-title exact **`NewestStichtag`**. PO already built it (kennzahl in the query so DEZ without data cannot win). Follows global Jahr: empty/2026 → `202607…` (example: data through July 2026); 2025 → `202512…`.
3. **Pad B locked:** parse `YYYYMM` from leftover `d`; map `01→JAN` … `12→DEZ`; helper Monat include is **`JUL`**, never `"07"`. Pad A (helper Monat Code data item) **rejected** — no Code/ID level in live dumps.
4. **PO Cognos/KDB properties:** **nothing further.** No `loadingTablesPropId`, no HTML `table-name`, no helper-List authoring, no Monat in helper slots.
5. **tableData:** per TopN resolve **`reloadTable([{ tableName: "newestStichtag", … }])`**. Not `waitForRows` / `ensureFreshRows` / `readRows`. No foreign `_KDB.state.tableData` access. Config key `newestStichtag`, `name: "NewestStichtag"`, `load: false`.
6. **No year-table fallback** if NewestStichtag missing/unparseable → fail the resolve.
7. Helper aggregation pin stays **`Monatsdurchschnitt`**. Monat is **filter only**. `grid_cols` stays `[topNItemId, valueColumnId]`.
8. `widgetVis` resolves the pin; `widgetTopN` applies includes. Payload: `jahrFilterValue` + `monatFilterValue`.
9. Do not invert `drillthrough/config/monthLabels.js`.
10. Drillthrough must **not** copy this leftover as a Jahr fallback.

---

## Where to start (order)

1. Read **only**:
   - `_____________KDB3API/contracts/widgetTopN-newestStichtag-contractdelta.md`
   - this handoff
2. **Do not** implement JS yet.
3. Dispatch grok 4.6 **pre-impl** contract-vs-code (allowlist in the delta §7 vs live `topNGate.js`, `resolveTopNJahrFilterValue.js`, `buildHelperBindingSpec.js`, `tables.js`, `topNHelper.js`, `tableData` wait vs reload). Ask: any silent contradiction with the delta?
4. If army is clean: stamp the delta **`Approved-for-implementation`**, sync the two parent sentences (`widgetTopN.md` §8.1.1, `widgetVis.md` resolveRequested payload). If army finds a real contradiction: **stop**, patch the delta, PO agrees, then stamp.
5. **Then** JS via army, exclusive allowlist, one writer per file, 150-line cap.
6. **Different** subagent: post-impl review (contract, MUST, no year fallback, reloadTable, map, no Monat slot).
7. Live smoke with PO: TopN on a vis with dimension — Jahr empty, 2026, 2025. Expect rows (not dropdown snap-back to Ohne) for all three when NewestStichtag has data.

Mark superseded (if not already): `contracts/futureTodo/futureTodoNew(23.08.2026)/jahr-filter-huidig-jaar-of-lege-selectie.md`.

F5 (`jahrFilterValue` / `yearFilterValue` aliases in `validateResolveRequest`) is **hygiene**, not this feature. Ride along only if those files are already open.

---

## Predecessor transfer (do not re-derive)

- **Classificatie:** contract én code waren jaar-grain; lege Jahr overspoelt “when available” via year-tabel max `d`.
- **Live include:** `type:"display"` (`addOrReplaceLocalFilter`). Monat members `JAN`…`DEZ` (`sorting.js`).
- **Live payload gap:** `widgetVis.md` omits `jahrFilterValue`; `topNGate.js` already sends it.
- **10/10 verification** (2026-09-01 evening, grok 4.6): year key vs name, waitForRows cache, no `markTableStale.js`, no `NewestStichtag` in live JS, `loadingTablesPropId` unused by tableData lookup.
- Canvas leftover **exists in Cognos** (PO). Not yet in `tables.js`.
- Host lag: if smoke after Jahr=2025 still reads `202607`, try leftover `renderWidget` before `reloadTable` (helper pattern). KDB timing, not a new PO property.

---

## Out of scope (this captain)

- Title-aggregation (`widgetVis-title-aggregation-*`) — other captain / other delta.
- Writeback persist landing.
- Cluster E leftover, drillthrough, sicht DnD.
- Deleting leftover List `Jahr` / `tables.js` `year`.
- Changing visible vis Jahr handling (page context stays).
- Git commit/push unless PO asks.

---

## Done when

- Delta stamped `Approved-for-implementation`.
- JS on the allowlist only; parents synced.
- Post-impl review: 0 MAJOR on grain/cache/map/slots.
- PO live: empty Jahr + 2026 + 2025 TopN return members (or a documented leftover-miss error, never silent 2026 year-table).

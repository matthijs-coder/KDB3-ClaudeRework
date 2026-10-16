# Launch prompt — footer Datenaktualisierung (`update_date`) captain 2026-09-02

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you re-read all MUST `.mdc` files, `tableDataService.md`, legacy `_______KDB3` footer, and every army transcript yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts into this chat.
- Do **not** re-open “is the date hardcoded?” or S1 vs S2/S3 vs T2/T3/T4. Product + architecture are **locked**.
- Do **not** dump `footer.md`, `KDB.js`, or leftover KDB2 helpers into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch contracts **only if a blocking live-code fact appears**, brief writers. Army holds the file bodies.

Quality over speed: extra investigation and review rounds via grok 4.6 subagents are a **good** default. Shipping `26.4.2026` again, a `n.v.` flash on every show, or `abortTable("update_date")` is worse than a slower WP.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor role (keep): you **write and read contracts**. Subagents check contracts against the live codebase **before and after** new JS. You do **not** do the primary code read, code write, or initial review.

On every issue, ask: does the codebase disagree with the contract? Or do both agree, but implementation is wrong / overwhelmed? For this WP the answer is already known: **Type 3** — `footer.md` CP-1 was chrome-`status` only; live footer invented a dead properties/config fallback that always paints `"26.4.2026"`; `tables.js` already names `update_date` → vis-title `aktualisierungsDatum`, `load: true`.

### Do

- Split work. Write tight briefs. Run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- **Module Contract First.** Contracts + spec are already approved. **Do not rewrite the delta.** Implement against it.
- Gate: army **pre-impl** contract-vs-code (confirm live files still match the diagnosis; do not re-litigate product) → one writer per exclusive allowlist against the **execution spec** → dual review (mechanical + semantic) via **fresh** subagents → fix MUST holes → PO Cognos check.
- Echo: each implementer echoes one sentence per MUST in the spec **before** producing files (spec Section A: 14 rows).
- First message to PO: started / blocked. After dual review: what Cognos must re-check.

### Do not

- Write production JS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**; captain synthesizes and owns contracts.
- Re-open: paint-only (S2); runtime cache (S3); wait only when `active` as primary (T2); `loadFinished`-only (T3); mount-wait **plus** event subscribe as primary (T4); `reloadTable` / `ensureFreshRows`; `readRows` without wait; empty line instead of `n.v.`; English state aliases (`updateDateFormatted`); `labels.de`; PDF `Datenaktualität`.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from footer. No new cognosHost facet. Footer has **no** Cognos touchpoint.
- `abortTable("update_date")` — kills the **shared** boot load.
- Subscribe to `tableData:loadFinished` / `loadFailed` for this leftover (bus does not replay; boot is often already `ready`).
- Add a 10th AMD import on `createFooterController.js` (already 9; 10 is the wall).
- Grow `createFooterController` with wait/format logic. Start/abort via existing `_footerEffects` (`__mountSync` / `__unmount`).
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Load predecessor captain chats or `agent-transcripts`. This file + live JS + approved contracts/spec are source of truth.
- Port `_KDB.data.tables` from `_______KDB3` / `_______REDESIGN2`.
- Touch center Erstellt (`new Date() (unbekannt)`), hardcoded Cognos URL, page indicator `"1"`, writeback `foot`, history snapshot files (they already track `footer.status` only).

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- Contract vs codebase comparison (**before** implementation and **after**).
- Implementation against the approved delta + execution spec (echo MUSTs first).
- Exclusive allowlists. No two writers on the same file.
- If blocked: stop and report; do **not** improvise architecture.

Captain does **not** use army to re-decide S1/T1/F1. Army may still find a **mechanical** step impossible on live APIs (e.g. `waitForRows` signature differs). Then stop and report to PO with a proposed **delta tweak** — do not silently go back to the hardcoded date.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Authority (highest first):

1. This prompt (PO locks).
2. `contracts/footer-update-date-contractdelta.md` — **Approved-for-implementation**.
3. `contracts/footer-update-date-execution-spec.md` — **Ready for execution** (file allowlist + per-file steps).
4. Parent: `contracts/footer.md` (already patched §2.1 / §5 for the date fields + `footer/applyUpdateDate`).
5. `architecture/projectStructureRules.md` + `.cursor/rules/` (army reads them; you do not dump them here).
6. Live `KDB3/js/**`.

---

## Locked product (do not re-ask PO)

| ID | Lock |
|---|---|
| Missing date | `Datenaktualisierung: n.v.` (literal, not `labels.de`). View coalesces `null`/`""` → `"n.v."`. |
| Storage | S1: `_KDB.state.footer.aktualisierungsDatumRaw` + `aktualisierungsDatumFormatted`. Not paint-only. Not runtime. |
| Timing | T1: `waitForRows` on **`footer.mount` even while idle**. Backup: if both date fields still `null` when `status` becomes `active`, start the same wait. |
| Fetch | F1: `[{ tableName: "update_date", shape: "row", isCoreTable: true }]` then `readRows` same input. Config key, **not** vis-title `aktualisierungsDatum`. |
| Format | `D.M.YYYY` (strip leading zeros). ISO `YYYY-MM-DD` accepted. Else `"n.v."`. |
| History | `source: "bootstrap"` already skipped in `pushFooterHistoryStep.js`. Snapshot stays `footer.status`. **Do not edit history/*.js.** |
| Restore / writeback | Date not in v3 `foot`. Leave dates in place. |
| PDF | Anhang `Datenaktualität` is `properties.pdfAttachmentPageObj.dataFreshness` — **different field**. Out of scope. |

Why S1: `__orchestratorFooterEffects` **tears down DOM** whenever `status !== "active"`, then always `syncFooterFromState`. Live-node paint dies on hide.

Why T1: `setupCoreFactories` starts tableData boot loads **before** footer mount. Wait **joins** in-flight/cache. T2 as primary always flashes `n.v.` (sync paint, async wait). T3 misses the event (bus does not replay).

---

## Where to start (exact order)

1. **Do not write JS in your first turn.** Confirm you are captain; list the next army briefs.
2. Launch **one** grok 4.6 explore: pre-impl contract-vs-code on the execution-spec allowlist vs live files. Question: still Type 3 stub in `syncFooterFromState.js`? `copy()` still `{ status }` only? Controller still 9 imports? `tables.js` `update_date` still `load: true` without shape/pick?
3. If no blocker: launch **one** grok 4.6 writer against the execution spec (exclusive allowlist in the spec). Writer’s first output = 14 echoed MUST sentences, then files.
4. After writer: **two fresh** grok 4.6 reviews in parallel:
   - Mechanical: spec Section C + J vs diff.
   - Semantic: delta vs behavior (no foreign tableData, no abortTable, no 10th import, view `formatted \|\| "n.v."`, reducer copy dates).
5. Fix MUST holes via army (not you), then tell PO what to click in Cognos.

**Cognos check (PO):** Fußzeile aan → left column `Datenaktualisierung: <echte leftover-datum>` not `26.4.2026`. Toggle uit/aan → datum blijft. Als de List leeg/fout is → `n.v.`. Header-off still hides footer.

---

## Live facts (do not rediscover)

- Stub: `KDB3/js/dashboard/footer/view/syncFooterFromState.js` `readDataAktDate` → properties → config → `"26.4.2026"`. Neither properties nor `_KDB.config.dashboard` is populated.
- Table: `KDB3/js/core/config/tables.js` key `update_date`, `name: "aktualisierungsDatum"`, `load: true`. Boot: `registerConfiguredLoads` stamps `isCoreTable: true` on the **load** input; `waitForRows` caller must still pass `isCoreTable: true` (config object itself has no that flag).
- `waitForRows` has **no** AbortSignal. Aborted Cognos work **resolves `null`** (does not reject). Treat abort/`null` as abort, **not** as missing date.
- `loadRegistryReady` = keys registered / loads **started**, not rows ready. `waitForRows` + `isCoreTable` waits registry then joins `pendingLoads`.
- Controller: `createFooterController.js` ~136 lines, **9 AMD imports**, `createFooterController` function already over the 60-line cap (grandfathered). Destroy today does **not** call effects — spec adds one `__unmount` line using **existing** `_footerEffects` import.
- `SOURCE` closed set: `kdbControl | api | bootstrap`. `applyUpdateDate` must use `"bootstrap"`. Do not add `writebackSet`.
- Folder `view/` is live (not `dom/` as in old footer.md layout). Spec uses `view/syncFooterFromState.js`.

---

## Suggested army split (after pre-impl)

| Agent | Job | Allowlist |
|---|---|---|
| Writer | Spec Section B/C | spec exclusive list only |
| Review A | Mechanical spec vs diff | read allowlist + spec + delta |
| Review B | Semantic MUST / races | same + `waitForRowsInputs.js` (read-only) |

Do not put two writers on `createFooterController.js` or `__orchestratorFooterEffects.js`.

---

## Open only if army proves a live blocker

If `waitForRows` on a single-item array does not unwrap as the spec assumes, **stop** and propose a one-line delta tweak (still F1, still `update_date`). Do not switch to `reloadTable`.

---

## First message to PO (template)

Started as captain for footer `update_date`. Will not rewrite the approved delta. Next: pre-impl army check, then one writer against `footer-update-date-execution-spec.md`. No JS from me unless a one-line wiring exception.

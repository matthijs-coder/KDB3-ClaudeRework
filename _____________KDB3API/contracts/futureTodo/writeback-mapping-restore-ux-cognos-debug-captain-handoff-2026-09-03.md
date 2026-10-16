# Launch prompt — writeback mapping + restore UX **Cognos debug** captain 2026-09-03

Paste into a **fresh** agent chat. Do **not** continue the implement-captain chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*`.

Predecessor (implement captain) shipped M1/S1/D1/U1, wrote parent one-liners, and stopped after PO Cognos started. **This file** is law for what you do next.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `writeback.md`, full `dienststelle.md`, Map adapters, SET restore orchestrators, predecessor chats, or dump writer file bodies into this thread.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this chat.
- You read/write **contracts** (and a tiny debug-log spec if needed). Army does **primary code read**, **code write**, **initial + dual review**, and **contract ↔ codebase** compare.
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `KDB.js`, `parameterMap.js`, `bwOldToNewMap.js`, or full `writeback.md` / `dienststelle.md` into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, brief writers, patch **one-line** parent drift. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **This file + live JS (via army) + the three deltas + execution spec** are source of truth.
- Grok dual-review agents previously died with `resource_exhausted` when briefs were huge (full `.mdc` + many files). Keep review briefs **short**: listed JS paths + a FAIL/NIT checklist, **no** pasting rule files.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor closed: A1/A2/C4/C5/C6 **implemented** on disk; contract↔code captain review **PASS WITH NITS**; parents patched; **not** `Approved — Cognos green`. PO started Cognos: **baseline `set(get())` same-package works**, but **every load** now shows a Dienststelle “niet gevonden / nicht verfügbar” user message.

You take **Cognos-debug + targeted fix**. You do **not** reopen A1/A2/C4/C5/C6 product. You do **not** rewrite the execution spec unless army proves a **new** contradiction.

### Captain does

- Read **this** handoff first. Then (cited sections only, via army for file bodies): execution spec, UX delta C4/C5, `buildRestoreScopePlan.js` / `parameterSetRestore.js` / `notifyRestoreOutcome.js`.
- First PO message (Dutch): started; Cognos baseline toast is the job; launching army for **debug logs first**, then root-cause; no speculative product reopen.
- Split work. Tight briefs. Exclusive file allowlists. No two writers on the same file.
- Gate: (1) army read of live restore plan + C4 toast path → (2) **debug `console.log`** (PO asked) → (3) PO re-runs baseline and pastes console → (4) army root-cause vs live logs → (5) **stop and present** if the fix would change C4/C5 product → else one targeted JS fix → (6) fresh dual review (short briefs) → (7) Dutch note for PO re-test. Do not self-certify Cognos green.
- If implementation must deviate from the three deltas: **stop**, present to PO, **update the relevant delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Captain does not

- Write production JS/CSS yourself unless a subagent is blocked on a **one-line** debug log that would cost more to re-brief. Default: **army writes code**.
- Re-investigate legacy `setupWBParameterMapFunction` / `restoreFromParameterset`.
- Reopen A1 name-match, A2 pkg-fail, C5 no-tab-S6-when-global-saved, C6 fail-fast, C4 SET-finish toast owner.
- Treat “toast on every baseline load” as proof that C4 was wrong. **C4 is new visibility** on `fallbackScopes` / `missingValues` that previously restored **silently**. The bug may be: (a) false `missing`/`fallback` on a healthy same-package round-trip, or (b) a real miss that always existed and is now user-visible. Army must distinguish those with logs before changing product.
- Move abort `showAlert` strings into labels. Add Rechte copy. Toast from `dienststelle`. Hook `hasDegradedPhase()` for C4.
- Import `parameterMap.js` into Map source mapper. Import `writebackMap` into SET.
- Grow files past 150 / orch 120 / 10 AMD without PO.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from features.
- Mark v2Map `Approved — Cognos green` without a **dated PO host pass** that includes this toast regression **and** the original 7-item checklist.

### Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding and **after**.
- Pre-flight: one-sentence summary of relevant MUST items **before** producing files (do **not** require echoing all 18 spec Section A items unless touching those slices).
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD `define` + factory-scope named helpers, `_` prefix on boundary inputs, try/catch, file size, no foreign `_KDB.state` writes.
- Semantic review against **C4/C5 live behavior** + PO console output, not against this handoff’s memory.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## Law (read these, not the old chat)

1. `_____________KDB3API/contracts/futureTodo/writeback-mapping-restore-ux-cognos-debug-captain-handoff-2026-09-03.md` — **this file**.
2. `_____________KDB3API/contracts/writeback-dienststelle-restore-ux-contractdelta.md` — C4/C5/C6 (now **Implemented — awaiting PO Cognos**).
3. `_____________KDB3API/contracts/writeback-mapping-restore-ux-execution-spec.md` — how C4 stash / toast pick was built.
4. `_____________KDB3API/contracts/writeback-v2Map-contractdelta.md` / `writeback-mapping-package-mismatch-contractdelta.md` — **do not reopen** unless logs prove A1/A2 caused the toast (unlikely for same-package baseline).
5. Cited live JS (army):  
   - `KDB3/js/dashboard/filters/dienststelle/actions/parameterSet/buildRestoreScopePlan.js`  
   - `buildDienststelleHierarchyIndex.js`  
   - `parameterSetRestore.js`  
   - `applyRestorePlan.js`  
   - `KDB3/js/core/services/writeback/set/effects/dispatchDienststelleRestore.js`  
   - `notifyRestoreOutcome.js`  
   - `KDB3/js/core/services/writeback/get/collectors/collectDienststelleFilter.js`  
   - `KDB3/js/dashboard/filters/dienststelle/config/dienststelleDefinitions.js`  
   - `KDB3/js/core/config/tables.js` (table key catalog — **do not dump**)

Parents already patched by predecessor: `writeback.md` §2.2 / §5 / §6.5 / MAP bullet; `dienststelle-parameterSetRestore-contractdelta.md` §5; `mapping-config-ssot-contractdelta.md` SET kidIndex row; `writeback-urlParameterId-contractdelta.md` overlay ladder.

---

## Locked predecessor facts (do not re-litigate)

| ID | Live |
|---|---|
| **A1** | Name-match only. Same-package iff every GFO key ∈ `{datasourceName, alternativeDatasourceName}`. Unmatched old table names stay unmatched. |
| **A2** | SET `validateRestorePayload.js` + kidIndex; positional `WRITEBACK_MAPPING_PACKAGE_MISMATCH` + `throw ABORT`. Factory still 10 AMD. |
| **C4** | SET-finish `message.notify` from `writebackLabels.js` (two keys). Stash **`phase.result`**. Abort `showAlert` only; never both. Overlay: missing-id > abort > info. |
| **C5** | No tab S6-default when global **saved** member applied (`fallback = null` on non-global plan items). |
| **C6** | `break` on global `requiredOk` false; skip reconcile. |
| **PO Cognos 2026-09-03** | Baseline same-package `set(get())` **functions**, but **every load** shows Dienststelle unavailable / not-found style toast. |

Accepted nits (not this WP unless they explain the toast): A2 compares `String(normalized.pkg)` after `validateV3`; U1 helpers shorter than spec target-band.

---

## PO question already answered (do not re-research from scratch)

**Where does restore decide which Dienststelle the user “may” have?**

Not widget properties. Not a Rechte/config allow-list. Not `_KDB.properties` for membership.

1. **Saved value to apply** comes from v3 `filt.dstl` (`glob` / `byTab`). GET (`collectDienststelleFilter.js`) persists **`useValue` strings** (not display captions).
2. **Validity / “in hierarchy”** is a lookup of that **useValue** in an in-memory index built from the **hierarchy data table on the dashboard canvas**, via `tableDataService.readRows`:
   - Sicht BW → `dienststelle_bw_hierarchy`
   - Sicht DEZPV → `dienststelle_dezpv_hierarchy`
   - Keys live in `dienststelleDefinitions.js` / `core/config/tables.js`.
   - Index: `buildDienststelleHierarchyIndex.js` — keyed by **useValue** (`u` / `use`); display is `d` / `display` when present.
3. **S6 default** (only when fallback is allowed) comes from the **default** canvas table: `dienststelle_bw_default` / `dienststelle_dezpv_default` (`readDefaultDienststelleValue.js`) — pair `{displayValue, useValue}`.
4. Optional BW caption remap: `bwOldToNewMap.js` on restore path only (`mapOldToNew: true`). Still not Rechte.
5. UX delta: “not in hierarchy index” = **missing**. There is **no** separate rights check. Do not invent one.

C4 toast fires when RestoreResult is `committed`/`degraded` **and** stashed `fallbackScopes.length > 0` (fallback copy) **else** `missingValues.length > 0` (missing copy). DISPLAY_DEGRADED-only must **not** toast.

**Working hypothesis for army (prove or kill with logs, do not assume):** C4 made a previously silent `missingValues`/`fallbackScopes` **user-visible**. Same-package baseline should have empty hint. If hint is non-empty, find **which scope**, **which saved useValue**, and **whether the hierarchy index actually contains that useValue** (timing: table not ready? GET stored display as use? BW map? empty hierarchy rows?).

---

## Immediate job (order)

### 1. Debug logs (PO asked — do this first)

Army adds **temporary, prefixed** `console.log` (not a new loggingService). Keep files ≤150. Suggested allowlist (adjust after glob; exclusive):

- `buildRestoreScopePlan.js` / `normalizeScope` — per saved value: `scope`, raw saved string, `hasUseValue`, mapped BW value if any, pushed `{displayValue, useValue}` or `missing`.
- `parameterSetRestore.js` — after plan: `hierarchyTableKey`, `defaultTableKey`, `rowCount`, `applyResult.requiredOk`, `appliedScopes`, `fallbackScopes`, `missingValues`.
- `notifyRestoreOutcome.js` — outcome, picked `labelKey`, hint lengths (do not log full `_KDB`).

Prefix: `[writebackSet.debug.dstlRestore]` or `[dienststelle.debug.restorePlan]`. Log **useValue and displayValue explicitly**. Do not log full table dumps.

Then **stop** and ask PO to reload baseline and paste the console lines.

### 2. After PO paste

Army root-cause. Captain presents in Dutch: false toast vs real miss; proposed fix; whether a delta update is required.

Likely fix classes (pick with evidence):

- **False C4** (hint non-empty on a successful same-package apply of the saved member): tighten C4 gate (e.g. do not toast `missingValues` on a tab when C5 left it empty **and** global applied) — **that is a product/delta change → ask PO first**.
- **Real miss** (saved useValue not in index): fix GET identity, restore lookup, or wait-for-rows — **not** “Rechte”.
- **Timing**: hierarchy `rowCount === 0` then later rows appear — wait/ready bug.

### 3. Cognos re-test (PO)

Original 7-item checklist still required before green. This toast regression is **blocking** for item 1 (baseline) even if filters visually look OK.

---

## MUST reminder (army echoes; you do not paste the files)

`kdb-object`, `state`, `runtime`, `naming`, `module-public-api`, `events`, `feature-structure`, `error-handling`, `dom`, `amd`, plus `cognos-adapter.mdc`. Lifecycle terms only from `lifecycleVocabulary.md`.

---

## First message to PO (Dutch, first turn)

Started. Implement WP is on disk; this chat is Cognos-debug. Baseline same-package works but C4 toast fires every load. Army adds restore-plan `console.log` (saved useValue/displayValue vs hierarchy hit/miss). After you paste console, we root-cause before changing C4 product. No JS from the captain in that first turn beyond launching army.

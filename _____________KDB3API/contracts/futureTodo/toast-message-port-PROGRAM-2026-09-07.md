# Program — toast / dialog port (legacy parity)

> **Live program index.** Next captain: start here. Do **not** load predecessor chats or `agent-transcripts`.
>
> Canvas (PO scan): `canvases/toast-legacy-gap-inventory.canvas.tsx`
> Naslag (facts): `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
> Law per WP: the `*-contractdelta.md` named in the checklist (Draft until PO Approved).

**PO:** vastenburg. Talk in **Dutch**. Artifacts **English**; UI strings German under `_KDB.config.labels.de.*`.

**Production tree:** `_____________KDB3API`. Legacy evidence: `laatsteOriginal/KDB2` (read-only). Older trees (`_______KDB3`, `_______REDESIGN2`) are not law.

**Investigation closed 2026-09-07.** Do not re-open the global toast census. Use the naslag. Army may verify **one WP’s** live files vs naslag before coding.

---

## How the next captain starts

1. Open **this file**. Find the first checklist row that is still `- [ ]` in the **active wave**.
2. That row’s **number** is your entire job. Do not start the next number.
3. Read **only**: this program (standing orders + your row), the naslag section for that number, the named **Draft/Approved delta**, `feature-structure.mdc` (workflow — do **not** ingest all 11 MUST files).
4. If the delta is still `Draft`: first PO message in Dutch = “WP *n* delta is Draft; proposal series is **open**; ik schrijf geen JS.”
5. **TODO (mandatory, before Approved):** run the **proposal series** for this number (see below). Candidate files / review-captain defaults in the Draft are **inputs**, not the solution.
6. After the series: write the chosen mechanism into the delta, then wait for PO **Approved**. Then execution spec. Then JS.
7. After Cognos green: tick the box (`- [x]`), set Status + date in the row, add a one-line Approval log on **your** delta, parent one-liners **after** dual review. Stop. Leave the next `- [ ]` for the next captain.

**Stop when your number is ticked.** Do not “helpfully” start 3 if you were 1.

Wave gate: **Wave 1 complete** (boxes 1, 3, 4, 5, 8 all `[x]`, Cognos green 2026-09-07). **Wave 2 complete** (boxes 2, 6, 7 all `[x]`, Cognos green 2026-09-08). **SSS paper may already exist.** **SSS production JS/CSS is still forbidden** until the SSS captain has **asked PO in that chat** whether wave 2 is done and received yes. Do not infer “SSS go” from this paragraph or from a WP6/WP7 chat.

---

## You are (planner / team captain)

Organizer / coordinator / planner. Subagents are **Grok 4.6** (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). `explore` = read; `generalPurpose` = write / review.

### Captain does

- **Module Contract First.** Your WP delta is law for that folder **after** the proposal series is written in and PO Approved. Approved delta outranks `.mdc` / `architecture/` for that slice. Silent code↔contract drift is forbidden: stop, PO, update delta, then resume.
- Run the **proposal series** for your number (options + pros/cons + recommendation) before locking mechanism. Present the recommendation to PO; do not self-approve.
- Read/write **contracts** (and tiny parent one-liners after review). Split work. Tight briefs. Exclusive allowlists. No two writers on the same file.
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op. None of those should appear in wave 1.
- If army proves the allowlist would exceed JS 150 / orch 120 / AMD 10: stop, propose split, do not silently grow files.

### Captain does not

- Primary code read of large trees, production JS/CSS writes (except a **one-line** wiring fix that costs more to re-brief), or self-certify Cognos green.
- Ingest all 11 MUST `.mdc` files, full parent contracts, `KDB.js`, html2canvas, or predecessor transcripts into **this** thread.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. Commit only if PO asks.
- Treat review-captain **candidate** file names, hook sketches, or “voorstel: ja” as locked mechanism.
- Implement a different WP number than the first open box.
- Invent a new `messageService` method. Use existing `notify` / `notifyAnchored` / `showAlert` / `confirm` / `choose` / `showCopyable`.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from feature files. New Glass footer hacks / toast clones are forbidden (`messageService.md` Q3).
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Re-open product locks on **other** WPs. Re-open SSS rights/Sicht policy in wave 1–2.
- Port invert-selection English `alert`, geodata popover, or the dead Leitung widget-banner (naslag: not in this program).

### Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- For the open WP: a **proposal series** (≥2 options per open mechanism question, pros/cons vs live sizes + MUST + product locks, one recommendation). Not a single invented architecture.
- **Contract ↔ codebase compare before coding** (blast radius, line counts, AMD) **and after**.
- Extra investigation and extra review rounds are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Pre-flight: if an execution spec exists, echo Section A (14 one-liners) **before** files. If the captain skipped a spec (solo, PO allowed), army still echoes the 10 MUST + `cognos-adapter` + **this WP delta** in one sentence each, then writes.
- Exclusive allowlists from the spec or from the captain brief. If blocked: stop and report; do not invent architecture.
- Mechanical review: AMD `define`, `_` prefix on boundary inputs, try/catch, ≤150 / orch ≤120 / ≤10 AMD, no foreign state writes, factory-scope helpers only, no DE string literals in the wrong owner, no `document.querySelector` beyond mount root.
- Semantic review: the WP acceptance list in **that** delta (copy, skip rules, no double toast, `skipDiscardConfirmOnce`, etc.).

Subagent model: `cursor-grok-4.6-xhigh`. Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

Grok dual-review previously died with `resource_exhausted` when briefs pasted full `.mdc` + many files. Keep review briefs **short**: listed paths + FAIL/NIT checklist.

---

## Token budget — take this seriously

Captain context is **256k**. It **will** fill if you personally re-read all MUST rules, full `writeback.md` / `widgetVis.md` / `messageService.md`, `KDB.js`, or this whole naslag plus all deltas.

Delegation is **mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into the captain thread. One job in *your* context: synthesize army verdicts, brief the next writer, patch parent **one-liners**. Army holds file bodies.

---

## Wave order (PO 2026-09-07)

| Wave | Numbers | Theme |
|---|---|---|
| **1** (done 2026-09-07) | **1, 3, 4, 5, 8** | Discard confirm; Top-N grouping toast; max-widgets toast; header/footer zoom hint; tabs **add** at max |
| **2** (done 2026-09-08) | **2, 6, 7** | Dienststelle empty-OK toast; cubes home dialog; 5-min watchdog dialog |
| **3** (paper now; **JS** after wave 2 `[x]` + PO yes) | **SSS** | specialSingleSelect follow-up (not a toast gap — see naslag) |

Investigation numbers match the gap table (1–8). There is no WP “9” in this program.

---

## TODO — proposal series (per WP, before Approved)

**Open for every wave-2 number** (same ritual as wave 1). Wave-1 series are **locked**. The coordination captain of WP2 / 6 / 7 must finish this **before** locking mechanism, **before** PO Approved, **before** an execution spec, **before** JS.

1. Army lists **≥2 options** for each open mechanism question on that WP’s delta (hook, file split, skip map, revert store, toast surface, severity, disable vs click, …).
2. Each option: **pros / cons** against live file sizes, MUST rules, **product** locks (copy, owner, skip overlay / no-dispatch), and naslag **facts**.
3. Army + captain produce **one recommendation** per question. Captain presents it to PO in Dutch.
4. Only then write the chosen mechanism into the delta. Named helpers in the current Drafts are **candidates**, not law.
5. Dual-review the locked mechanism vs live files, then ask Approved.

Do **not** skip this TODO by shipping a review-captain default. Product copy/owner/skip rules stay; **solution direction stays open until this series**.

Wave 2 / SSS captains run the same TODO when they write real deltas. Wave 2 JS: WP2 / WP6 / WP7 handoffs (2026-09-08). SSS paper: `toast-message-port-sss-captain-handoff-2026-09-08.md`.

---

## Checklist — tick your number

Captains edit **this table only** to check a box. Do not rewrite standing orders.

### Wave 1

- [x] **1** Discard confirm — `contracts/writeback-discard-confirm-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Cognos: green 2026-09-07
- [x] **3** Top-N grouping toast — `contracts/widgetSettings-topn-grouping-toast-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Cognos: green 2026-09-07
- [x] **4** Max widgets per tab — `contracts/widgetBase-max-widgets-toast-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Cognos: green 2026-09-07
- [x] **5** Header/footer zoom hint — `contracts/header-footer-zoom-hint-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Cognos: green 2026-09-07 (trigger parked inactive per PO)
- [x] **8** Tabs add at max — `contracts/tabs-add-max-visible-toast-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Cognos: green 2026-09-07

### Wave 2 (**done** 2026-09-08 — Cognos green)

- [x] **2** Dienststelle empty selection on user OK — `contracts/dienststelle-empty-ok-toast-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Spec: `contracts/dienststelle-empty-ok-toast-execution-spec.md` — Cognos: green 2026-09-08
- [x] **6** Cubes unavailable close/minimize — `contracts/cubes-unavailable-home-dialog-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Spec: `contracts/home-dialog-wp6-wp7-execution-spec.md` — JS: shipped 2026-09-08 — Cognos: green 2026-09-08
- [x] **7** 5-minute load watchdog dialog — `contracts/loadingService-watchdog-dialog-contractdelta.md` — Status: `Approved` — Proposal series: **locked** — Spec: `contracts/home-dialog-wp6-wp7-execution-spec.md` — JS: shipped 2026-09-08 — Cognos: green 2026-09-08

### Wave 3 (paper allowed; **JS blocked** until PO yes in SSS chat — wave-2 boxes are `[x]`)

- [x] **SSS** specialSingleSelect UX follow-up — `contracts/specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` + `contracts/specialSingleSelect-restore-default-h2-contractdelta.md` — Status: `Implemented` — Cognos: green 2026-09-09

---

## Product locks for wave 1 (coordinator 2026-09-07 — PO must confirm)

Until PO objects, captains treat these as Draft locks inside the deltas:

| # | Lock |
|---|---|
| 1 | `_KDB.services.message.confirm`. Copy = legacy German. Buttons **OK** / **Abbrechen** (`confirmLabel` / `cancelLabel`), not tabs’ Ja/Nein. Honor `skipDiscardConfirmOnce` and boot overlay. Cancel → revert select. No native `confirm`. |
| 3 | Owner **widgetSettings** (anchor = Top-N dropdown). If dimension absent, **do not** dispatch `widgetVis/applyTopNChoice`; `notifyAnchored`; revert optimistic dropdown; do not write `topNChoice`. Copy = legacy German. `widgetVis` §7.1.2 unchanged. |
| 4 | Owner **widgetBase** at drop-claim exhaustion (empty eligible launchpad list), not every `WIDGET_BASE_WIDGET_ID_MISSING`. `notify` warning. Copy = legacy German. Launchpad stays environment-only. |
| 5 | **One** toast, not header+footer pair. Same `code` / `dedupeKey`. Fire on transition into `status: "active"` (user or restore). Do not fire on hide. Copy = legacy German. `notify` is enough (dock anchor optional). |
| 8 | Same user copy as duplicate max: `TAB_DUPLICATE_MAX_VISIBLE_TEXT` (do **not** hardcode “5”). If `canAdd !== true`, **no** `tabs/add` dispatch; `notify` warning. Toolbox must consult `canAdd`. |

These rows are **product intent** (copy, owner, skip overlay / no-dispatch / one toast). **Mechanism is not locked** (files, hook, `notify` vs `notifyAnchored`, severity, disable vs click, dirty-bit vs always-confirm, revert store). That waits for the **proposal series** TODO.

Wave 2 / SSS locks stay in those stubs. Do not invent them in wave 1.

---

## Execution specs

Wave-1 captains **write an execution spec** from `_executionSpecTemplate.md` **after** the proposal series is locked **and** PO Approves the delta, and **before** army writes JS. Exclusive allowlists. Captain does not ingest the spec into the thread after writers have it — point at the path.

---

## Parent one-liners (captain after dual review, not writers)

Listed at the end of each delta. Typical: remove “discard UI OOS” from `writeback-urlParameterId-contractdelta.md` §11 after WP1 ships.

# Launch prompt — WP5 implement captain

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain chat. Do **not** load `agent-transcripts`.

You are **planner / team captain / organizer**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). `explore` = read; `generalPurpose` = write / review. PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `_KDB.config.labels.de.*`.

**You are WP5 only** (header/footer zoom hint). PO overrode wave order 1→3→4→5→8. Boxes 1/3/4 may still be open — **ignore them**. Do not start WP8. Do not re-open the proposal series. Do not rewrite the Approved delta except a one-line Approval log after Cognos, or a stop-and-PO contract fix if army proves code↔contract drift.

---

## Token budget — take this seriously

Captain context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `header.md` / `footer.md` / `messageService.md`, `KDB.js`, the whole naslag, or predecessor transcripts.

**Delegation is mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this thread. Your job in *your* context: synthesize army verdicts, brief the next writer, patch **tiny** contract/spec wording if FAIL, parent **one-liners** after JS review. Army holds file bodies.

Grok dual-review previously died with `resource_exhausted` when briefs pasted full `.mdc` + many files. Keep briefs **short**: listed paths + FAIL/NIT checklist.

Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## You (captain) do

- Read/write **contracts** (this WP’s delta/spec + tiny parent one-liners after JS dual-review). Split work. Tight briefs. Exclusive allowlists. No two writers on the same file.
- **Module Contract First.** Approved WP5 delta outranks `.mdc` / `architecture/` for this slice. Silent code↔contract drift: stop, PO, update delta, then resume.
- After JS: two **fresh** army reviews (mechanical vs spec; semantic vs delta). Extra investigation and extra review rounds are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op. None of those belong in WP5.
- If army proves the allowlist would exceed JS 150 / orch 120 / AMD 10: stop, propose split, do not silently grow files.
- After PO Cognos **green**: tick PROGRAM box **5**, one-line Approval log on the delta, parent one-liners. **Stop.**

## You (captain) do not

- Primary code read of large trees, production JS/CSS writes (except a **one-line** wiring fix that costs more to re-brief), or self-certify Cognos green.
- Ingest all 11 MUST `.mdc` files, full parent contracts, `KDB.js`, or predecessor transcripts into **this** thread. Workflow only: `feature-structure.mdc`.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. Commit only if PO asks.
- Re-open proposal-series options (Glass `notify` + latch, reopen `messageService.md` Q4, filter-dock anchor, `dashboard/chrome/`, duplicate footer wrapper).
- Invent a new `messageService` method. Call `_KDB.cognosAPI` / `__getDashboardAPI`. Grow `createHeaderController.js` (152) or `createFooterController.js` (AMD 9).
- Folders `helpers` / `common` / `shared`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Tick box 5 before Cognos green. Start WP1/3/4/8. Write parent one-liners **before** JS dual-review.

## Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- **Contract ↔ codebase compare before coding** (blast radius, line counts, AMD) **and after**.
- Pre-flight: echo execution spec **Section A** (14 one-liners) **before** producing files. Captain accepts the echo, then writer may create files.
- Exclusive allowlist from the spec. If blocked: stop and report; do not invent architecture.
- Mechanical review: AMD `define`, `_` prefix on boundary inputs, try/catch, ≤150 / orch ≤120 / ≤10 AMD, no foreign state writes, factory-scope helpers only, no DE string in the helper, no `document.querySelector`, no `notify()` from this helper, footer imports the **leaf** helper only.
- Semantic review: WP5 acceptance in the Approved delta (one toast, restore both-on, hide = no new fire, skip mount/unmount/replay, missing service = warn + no-op).

---

## Start here (this order) — do not dump these files into your thread

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 5 only**.
2. `_____________KDB3API/contracts/header-footer-zoom-hint-contractdelta.md` — **Approved**. Law.
3. `_____________KDB3API/contracts/header-footer-zoom-hint-execution-spec.md` — **Ready for execution**. Mechanical how.
4. Naslag **Number 5 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`.
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only).

First Dutch PO line: “WP5 is Approved; spec is Ready; ik laat army Section A echodt, daarna JS; ik schrijf zelf geen productie-JS.”

---

## Your next steps (stop after Cognos green + box 5)

1. Launch **one** writer on the spec allowlist. First output = Section A echo. Accept echo, then files. No two writers on the same file.
2. After files land: **verify live files** (do not trust the writer’s checklist alone).
3. Dual-review (two fresh grok 4.6): A mechanical vs spec; B semantic vs delta. Short briefs.
4. FAIL → army patch on allowlist only. NIT → you decide (tiny spec/delta wording vs ignore).
5. Parent one-liners listed at the end of the WP5 delta (`header.md` / `footer.md`; Q4 on `messageService.md` stays true). Captain writes those **after** dual-review of JS, not the writer.
6. PO Cognos: header on → one German zoom hint; footer on while showing → no second; restore both-on → one; hide → no new hint; undo show → no hint.
7. Tick PROGRAM **5**. Stop. Do not start 8.

---

## Do not rediscover (already locked)

Point army at the delta/spec; do not re-investigate these as open questions:

- Live `notify()` **ignores** `code`/`dedupeKey`. Collapse = `notifyAnchored` on **the same connected** `_KDB.runtime.header.domRefs.rootEl`, `code: "HEADER_FOOTER_ZOOM_HINT"`, `durationMs: 10000`, `severity: "info"`. **No** Glass `notify()` if root missing/disconnected (that doubles restore).
- Helper: `header/effects/notifyZoomHint.js`, export `__controller(_KDB, _action, _prev, _next)`. Labels: `header/config/headerLabels.js` → `_KDB.config.labels.de.header.zoomFitToPageHint` (exact DE in spec). Helper does **not** AMD-import labels and does **not** hardcode DE. `typeof === "string"` then `trim()` — never `String(undefined)`.
- Header effects: AMD 7→8, call **after** `__mountSync` return (live ~line 75), **before** `HEADER_CONFIRMED_CHANGED`. Header mount **lies** about prev (idle `initialState`) — skip is mandatory.
- Footer effects: AMD 5→6, **one** call after `_syncFooterFromState` (live ~line 55). Live signature is `(_KDB, action, prevState)` — pass `_notifyZoomHint(_KDB, action, prevState, st)`. `__unmount` returns first. `_action === null` is legal (prev === next → no toast).
- Footer may import **only** the leaf helper. Must **not** import `__orchestratorHeaderEffects.js`. Keep header effects’ existing footer **view** `syncFooterFromState`.
- Skip `__mountSync` / `__unmount` / `isHistoryReplay`. Do **not** skip restore (`skipHistory` ≠ replay). Compare `_action.type` twice; never `=== "__mountSync" || "__unmount"`.
- Frozen: `createHeaderController.js` (152), `createFooterController.js` (AMD 9), restore runners (`runNormalRestore.js` **and** `runNewDashboardReset.js`), history apply files, `mapV2HeaderFooter.js` (maps more than `turnedOn` — still do not edit), `KDB.js`, messageService.
- In-flight hide may Glass-relocate an open toast (`messageService.md` Q4). Out of WP5. Do not “fix” it.
- Proposal series + spec↔contract dual-review: already done. Cheap-AI footguns are **already patched in the spec**.

**Must not add:** `dashboard/chrome/`; footer duplicate wrapper; runtime latch; new events; new messageService methods.

---

## Production tree

`_____________KDB3API`. Legacy evidence: `laatsteOriginal/KDB2` (read-only). Older trees are not law.

# Launch prompt — toast-port captain (WP8 continuation)

> **SHIPPED 2026-09-07.** PROGRAM **8** `[x]`. Cognos green. Do **not** re-run W1. Do **not** recreate `tabs/effects/confirmAndDispatchTabAdd.js` (rejected). Live helper: `kdbControl/framework/dispatchToolboxTabsAdd.js`. This file is a frozen launch prompt, not live law.

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain chat. Do **not** load `agent-transcripts`.

You are **planner / team captain / organizer / coordinator**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `labels.de.*`.

**You are WP8 only.** PO assigned this seat to WP8 even though wave-1 boxes 1, 3, 4, 5 are still open. Do **not** switch to WP1. Do **not** start 3, 4, 5, wave 2, or SSS.

---

## Token budget — 256k, take this seriously

Captain context is **256k** and **will** fill if you personally re-read all MUST `.mdc` files, full `tabs.md` / `messageService.md` / `KDB.js`, the whole naslag, predecessor chats, or paste file bodies into this thread.

**Delegation is mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into the captain thread. Your job: synthesize army verdicts, brief the next writer, patch parent **one-liners** after review. Army holds file bodies.

Do **not** ingest all 11 MUST files. Army echoes MUST (spec Section A). You read: PROGRAM standing orders + WP8 row, naslag **§8 only**, the Approved delta, the execution spec, `feature-structure.mdc` **workflow only**.

---

## You are (planner / team captain)

### Captain does

- **Module Contract First.** Approved WP8 delta is law for this slice (outranks `.mdc` / `architecture/` here). Silent code↔contract drift: stop, PO, update delta, then resume.
- Read/write **contracts** (delta, spec, tiny parent one-liners after dual review + Cognos). Split work. Tight briefs. Exclusive allowlists. No two writers on the same file.
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op. None of those should appear in WP8.
- If army proves the allowlist would exceed JS 150 / orch 120 / AMD 10: stop, propose split, do not silently grow files.
- After JS: dual-review vs **spec + delta + live files**. Quality over speed.
- After Cognos green: tick PROGRAM box **8**, one-line Approval log on the delta, parent one-liners. **Stop.** Do not start another WP.

### Captain does not

- Primary code read of large trees, production JS/CSS writes (except a **one-line** wiring fix that costs more to re-brief), or self-certify Cognos green.
- Ingest all 11 MUST `.mdc` files, full parent contracts, `KDB.js`, html2canvas, or predecessor transcripts into **this** thread.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. Commit only if PO asks.
- Re-open the proposal series, disable-vs-click, helper home, or `tabs/effects/confirmAndDispatchTabAdd.js`.
- Re-open the global toast census. Invert-selection English `alert`, geodata popover, Leitung banner: not this program.
- Invent a new `messageService` method. Use existing `notify` / `notifyAnchored` / `showAlert` / `confirm` / `choose` / `showCopyable`. WP8 uses **`notify` only** (not `notifyAnchored`, not `confirm`).
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from feature files. Glass toast clones forbidden.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in the **new** helper. ES modules in `KDB3/js/**`.
- Tick box 8 before Cognos green. Write parent one-liners before dual review.

### Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Extra investigation and extra review rounds are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- **Contract ↔ codebase compare before coding** (blast radius, line counts, AMD) **and after**.
- Pre-flight: echo spec Section A (14 one-liners) **before** files. Exclusive allowlist from the spec. If blocked: stop and report; do not invent architecture.
- Mechanical review: AMD `define`, `_` prefix on boundary inputs, try/catch **in the helper not the trampoline**, ≤150 / AMD 1 on the binder, no foreign state writes, factory-scope helpers only, no DE string with a literal `5`, no `document.querySelector` beyond mount root, **no** kdbControl AMD into `dashboard/tabs/**`.
- Semantic review: WP8 acceptance in the **delta** (click → toast at max, no `tabs/add`; hidden tab → add as today; same sentence as duplicate; missing `notify` fail-closed; missing/disposed `getState` → no toast).

Subagent model: `cursor-grok-4.6-xhigh`. Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

Keep review briefs **short**: listed paths + FAIL/NIT checklist. Grok dual-review previously died with `resource_exhausted` when briefs pasted full `.mdc` + many files.

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 8** only.
2. Naslag **Number 8 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. **Approved** delta: `contracts/tabs-add-max-visible-toast-contractdelta.md`
4. **Ready for execution** spec: `contracts/tabs-add-max-visible-toast-execution-spec.md`
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only).

**Do not** re-run the proposal series. It is **locked**. PO **Approved** 2026-09-07. Spec was army-reviewed (**SPEC-OK**). Consequences NITs are already patched in the spec.

**First PO line (Dutch):** “WP8 is Approved; spec is Ready for execution; ik start W1; ik schrijf zelf geen JS.”

---

## What is already done (do not redo)

- Product locks, proposal series (KEEP-A clickable, KEEP-B `dispatchToolboxTabsAdd.js` in kdbControl/framework, KEEP API-only), second-pass stress tests, dual-review of locked mechanism (both APPROVE yes).
- Execution spec written; army spec↔contract **SPEC-OK**; spec patches: `"use strict"`, `const` not `var`, J6 `.mdc` read vs modify, trampoline no try/catch, notify two-check `!svc || typeof svc.notify !== "function"`.
- **JS done.** `dispatchToolboxTabsAdd.js` exists. Binder trampoline calls the helper; `safeTabsDispatch` remains for `selectEditTarget` only. Dual-review APPROVE. Cognos green. Parent one-liners written.

---

## Locked mechanism (do not reopen)

- Keep add button **clickable**. No disable/hide/`aria-disabled` in fill or `syncFrameworkTabEditUi.js`.
- New `KDB3/js/dashboard/canvas/kdbControl/framework/dispatchToolboxTabsAdd.js` (AMD 0, single exported function, not `__controller`, not `confirm*`).
- Binder `bindFrameworkToolboxPlaceholderApis.js` is **148** / AMD 0. After edit **≤150** / AMD **1**. Single-line `define(["./dispatchToolboxTabsAdd"], function (_dispatchToolboxTabsAdd) {` (siblings omit `.js`). Replace only the add `safeTabsDispatch` call. Keep `safeTabsDispatch` for `selectEditTarget`. Do not overflow-split comments/radios. `bindFrameworkView.js` stays AMD 7 (untouched).
- **API-only.** `_KDB.api.tabs.getState()` / `dispatch` + `_KDB.services.message.notify`. **MUST-illegal:** kdbControl AMD-import of `tabs/effects/*` or `tabs/config/*`. Rejected candidate: `tabs/effects/confirmAndDispatchTabAdd.js`. No 5th `createTabsController` method. Do not import `readTabsForKdbControl`.
- Copy: clone exact `Maximale Anzahl an Registerkarten erreicht.` (tabs `TAB_DUPLICATE_MAX_VISIBLE_TEXT` stays SSOT for duplicate). No labels merge. No hardcoded `5`. `code: "TABS_MAX_VISIBLE"` (Glass ignores `code`; still pass it).
- Decision tree (do **not** use `(snapshot && snapshot.canAdd) !== true`):
  1. no tabs API / `getState` not a function / snapshot not a real object → `console.warn`, **no toast**, no dispatch
  2. `!svc || typeof svc.notify !== "function"` → fail-closed warn, **no dispatch** (also blocks happy-path add — **locked NIT**, do not “fix”)
  3. `snapshot.canAdd !== true` → `notify` warning, no dispatch
  4. else `dispatch({ type: "tabs/add", payload: { source: "kdbControl" } })`; missing `dispatch` once-warn **only here**, same string as live binder
- try/catch **in the helper**, not the trampoline. `const`/`let`, not `var`.
- Leave reducer `TABS_NO_HIDDEN_TAB` and `dispatchTabsAction.js` doomed-add commit alone.
- Do not reuse `warnSettingsMessage.js`. Do not add pending-`tabMutation` CONFLICT guard (not WP8).

---

## Next steps (in order)

**Done 2026-09-07.** W1 + dual-review + Cognos green + PROGRAM **8** ticked + parent one-liners. **Stop.** Do not start another WP from this prompt.

**Do not:** re-run W1; recreate the rejected `confirmAndDispatchTabAdd.js`; rewrite the spec; start WP1/3/4/5; write JS yourself; dump `KDB.js`.

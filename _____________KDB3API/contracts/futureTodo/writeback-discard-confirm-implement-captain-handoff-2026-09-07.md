# Launch prompt — WP1 discard-confirm **implement** captain 2026-09-07

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German only under `_KDB.config.labels.de.*`.

The older paste `contracts/futureTodo/toast-message-port-captain-handoff-2026-09-07.md` is **stale for WP1** (it assumed Draft + open proposal series). **This file** is the live launch prompt. Standing orders still live in the PROGRAM.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `writeback.md` / `messageService.md`, `KDB.js`, predecessor chats, or the whole naslag plus every wave-1 delta.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this chat.
- You read/write **contracts** (and tiny parent one-liners after review). Army does **primary code read**, **code write**, **initial + dual review**, and **contract ↔ codebase** compare (before and after).
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `cognosWritebackBridge.js`, `createWritebackSetService.js`, `executeRestoreRun.js`, `selectParameterSetById.js`, or full parent contracts into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, brief writers, patch **one-line** parent drift. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **This file + the Approved delta + the execution spec + live JS (via army)** are source of truth.

Grok dual-review agents previously died with `resource_exhausted` when briefs were huge (full `.mdc` + many files). Keep review briefs **short**: listed JS paths + a FAIL/NIT checklist, **no** pasting rule files.

Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor closed **product + mechanism + spec**. **No production JS/CSS for this WP has been written yet.** You take the **next steps**: army W1 → W2 → army confirm live files vs spec → **fresh** dual review (mechanical MUST + semantic delta §8 vs code) → fix MUST holes via army → parent one-liners → PO Cognos checklist (delta §8).

You do **not** reopen the proposal series, product locks, or spec architecture (except a proven allowlist collision or a file that would exceed 150 / AMD 10).

### Captain does

- **Module Contract First.** Law for this WP:
  - `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (standing orders + checklist row **1**)
  - `_____________KDB3API/contracts/writeback-discard-confirm-contractdelta.md` (**Status: Approved**, PO vastenburg 2026-09-07)
  - `_____________KDB3API/contracts/writeback-discard-confirm-execution-spec.md` (**Status: Ready for execution** — exclusive allowlists W1 then W2)
- First PO message (Dutch): started; delta Approved; spec Ready; you will not re-litigate skip map / stamp / file split; you will run W1/W2 then review.
- Split work. Tight briefs. Grok 4.6 with **exclusive allowlists W1–W2** from the spec. No two writers on the same file. Do not merge slices.
- **Order:** W1 first (seeds, labels, confirm helper, stamp, skip-flag `finally`). W2 only after `confirmDiscardUnsavedChanges.js` exists on disk (SET runner + thin `bridgeSet`).
- Gate: (1) Approved + spec Ready already → (2) army W1 (Section A echo **14** before files) → (3) army W2 → (4) army confirm files vs spec → (5) **fresh** subagents dual-review → (6) fix via army → (7) you patch parent **one-liners** (delta §9) → (8) Dutch Cognos checklist from delta §8.
- If implementation must deviate: **stop**, present to PO, **update the delta first**, then the spec, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.
- Tick PROGRAM box **1** only when Cognos green. Then **stop**. Do not start WP **3**.

### Captain does not

- Rewrite the execution spec unless army proves an allowlist collision or a file would exceed 150 / AMD 10.
- Re-open: dirty bit; focus/pointerdown previous-value; confirm on all `restore()` (including recover); confirm in `executeRestoreRun`; stamp in `notifyBridgeSetSettled`; `source === "bridge"` skip gate; native `confirm`; Glass footer; `#selectParameterSet` `change` listener as hook; chasing grandfathered `cognosWritebackBridge.js` down to 150; a third new JS file; 11th AMD on `createWritebackSetService.js`.
- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from **new** files.
- Edit `KDB.js`, `historyControls/**`, `shareControls/**`, `messageService` internals, `recoverUrlSharePending.js`, `waitForParameterSetSelectReady.js`, `createWritebackSetService.js`.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Invent a new `messageService` method. Use existing `confirm`.
- Self-certify Cognos green.
- Load this predecessor thread.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding (blast radius) and **after**.
- Pre-flight: one-sentence summary of every item in spec Section A (**14**) **before** producing files.
- Exclusive allowlists. If blocked: stop and report; do not invent architecture.
- Mechanical review: AMD `define`, `_` prefix on boundary inputs, try/catch, file size ≤150 (bridge **decreases** from 282, not forced to 150), AMD ≤10, set service stays AMD 10, no foreign state writes, factory-scope helpers (no nested functions in new AMD entries), no DE literals outside `writebackLabels.js`.
- Semantic review: delta **§8** (copy; skip flag **always cleared if true**; overlay; mapped `statusKind === "default"` including aliases via runner `STATUS_TABLE`; host `newDashboard` confirms; recover does **not**; skip-before-latch; disposed `confirm` **rejects**; stamp only `ok === true` captured at `executeRestoreRun` **start**; revert `.value=` no `change`; no second queued dialog).

`subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` (standing orders + row **1** — do not ingest the whole naslag)
   - `_____________KDB3API/contracts/writeback-discard-confirm-contractdelta.md` (§6 + §8; do not ingest parents)
   - `_____________KDB3API/contracts/writeback-discard-confirm-execution-spec.md` (allowlists W1–W2)
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only — do **not** re-read all 11 rules into *your* context; army echoes them)
2. Tell PO you started (Dutch). **Do not implement** in that first turn.
3. Launch W1 (spec allowlist). Do not start W2 until W1 has landed `bridge/confirmDiscardUnsavedChanges.js`.
4. Launch W2.
5. Fresh reviewers (not the writers): mechanical + semantic. Fix via army.
6. Captain one-line parent patches per delta §9. Do not rewrite parents.
7. PO Cognos checklist (Dutch) = delta §8.

Naslag for WP1 only if army needs facts: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md` **Number 1**. Do not re-census toasts.

---

## Already done — do not redo

| Item | Status |
|---|---|
| Global toast census | Closed 2026-09-07 |
| WP1 proposal series (Q1–Q5) | Locked in delta §6 / §10 |
| Army stress-test of recommendations | HOLD / HOLD-WITH-TWEAK |
| Dual-review of locked delta vs live | NITS patched; no MUST-FIX |
| PO **Approved** | 2026-09-07 |
| Execution spec | **Ready for execution** |
| Spec vs contract | **SPEC-SOUND** |
| Spec vs live sizes | **SPEC-FIX-THEN-W1** — **already patched** (runner must declare `restoreStartedAt` / `didEnterRestore` / `result`; factory-scope `toBridgeDiagnostic`; `cognosWritebackBridge.js` AMD **6→4**, no dead normalize import) |
| Production JS | **Not started** |

---

## Mechanism (closed — law is the delta, this is a reminder)

- Confirm on **`bridgeSet` / `runBridgeSetRestore` before `restore()`**, not on all `restore()` callers, not in `executeRestoreRun`.
- Skip (proceed restore, **no** modal): `skipDiscardConfirmOnce` (**always clear if it was true**) **or** overlay **or** mapped `statusKind === "default"`. Then latch, then `message.confirm`.
- Host `newDashboard`: confirm. Recover `restore(null, "newDashboard")`: **no** confirm (not on `bridgeSet`).
- Two new files only: `confirmDiscardUnsavedChanges.js` + `runBridgeSetRestore.js`. Revert + stamp **inline**.
- Stamp `lastConfirmedParameterSetId` in `executeRestoreRun` on `ok === true`, id captured at **start**. Seed orch analog = `pendingRunId`, **not** boolean `!== true`.
- Revert: `select.value = last \|\| "-"`; **no** `change`; **not** `selectParameterSetById`.
- `selectParameterSetById` `finally` clears leftover skip **after** `armWaiter` returns (SET already consumed the flag during that await).

If spec and delta ever disagree, **delta wins**. Stop and patch the spec; do not invent a third architecture.

---

## Product decisions (closed — do not re-ask)

| # | Decision |
|---|---|
| 1 | `_KDB.services.message.confirm`. Copy = exact DE in `writebackLabels.js`. Buttons **OK** / **Abbrechen**. Honor skip-flag + overlay + default. Cancel → revert select. No native `confirm`. |
| 2 | No dirty bit. No `change` listener as confirm hook. |
| 3 | No new public writeback methods. |

---

## After Cognos green

1. Tick PROGRAM checklist **1** (`- [x]`), Status + date.
2. Approval log one-liner on the delta.
3. Spec status → `Frozen` or `Executed` as you prefer, one line.
4. **Stop.** Next captain owns WP **3** (Top-N grouping toast). Wave 2 still blocked.

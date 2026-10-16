# Launch prompt — writeback mapping + restore UX **implement** captain 2026-09-03

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context ~180k/250k). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*`.

The **spec-writing** captain is done. Predecessor handoff `writeback-mapping-restore-ux-captain-handoff-2026-09-03.md` is **historical** (how the spec was written). **This file** is law for what you do next.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `writeback.md`, full `dienststelle.md`, Map adapters, SET restore orchestrators, predecessor chats, or dump writer file bodies into this thread.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this chat.
- You read/write **contracts** (one-line parent patches after code) and **do not rewrite** the execution spec unless army proves a **new** contradiction.
- Army (Grok 4.6) does the **primary code read**, **code write**, **initial + dual review**, and **contract ↔ codebase** compare **before** (spot-check allowlists still match disk) and **after** implementation.
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `KDB.js`, `runNormalRestore.js`, `parameterMap.js` (the KID table), `bwOldToNewMap.js`, or full `writeback.md` into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, brief writers, patch **one-line** parent drift. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **This file + the execution spec + the three deltas + live JS (via army)** are source of truth.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor closed: product package Approved; three contract-only deltas; pre-impl army vs live JS; execution spec written and **reviewed** (MUST + A1 mapping/filters/vis + A2/C4–C6 pipeline + completeness vs deltas). Four spec block-holes were **patched in the spec** (not still open). PO **implement GO** 2026-09-03 (vastenburg) with captain recommendation: **A1 name-match only**.

You take **implementation + review + parent one-liners + Cognos checklist**. You do **not** reopen product. You do **not** rewrite the spec from scratch.

### Captain does

- Read **this** handoff + `_____________KDB3API/contracts/writeback-mapping-restore-ux-execution-spec.md` + the three deltas (cited sections, not full `writeback.md`).
- First message to PO (Dutch): started; GO already given; launching writers; no JS from you in that turn.
- Split work. Tight briefs. **Parallel** grok 4.6 writers with **exclusive file allowlists from the spec**. No two writers on the same file. Do **not** merge M1–U1 into one agent.
- Prefer **D1 before U1** if sequential (C4 toast grain matches C5). M1 and S1 are independent and may run in parallel with D1.
- Gate: (1) army **spot-check** spec allowlist paths + line counts still match disk (do not re-do the 2026-09-03 full pre-impl) → (2) writers (Section A echo **before** files) → (3) **fresh** dual review (new subagents, not the writers): mechanical MUST + semantic vs the **three deltas** → (4) one fix-iteration max then escalate → (5) captain parent one-liners (spec Section M) **after** code matches → (6) Dutch Cognos checklist for PO. Do not self-certify green.
- If implementation must deviate: **stop**, present to PO, **update the relevant delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Captain does not

- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Re-investigate legacy `setupWBParameterMapFunction` / `restoreFromParameterset`.
- Re-open the four spec holes as if they were still unpatched (see “Already closed” below).
- Reopen A1/A2/C4/C5/C6 product. Reopen: full legacy Map (slots/DS/localFilters); MAG/level use-KID as a must; first-GFO-key OR; warn-instead-of-fail on `pkg`; toast from `dienststelle`; “Rechte”; S6-default on a tab when global saved MAG applied; abort-on-every-miss; v3 KID migrator; SET→Map; v2 SS `.d` vs `.u`.
- Restore A1 **Object.keys / first-unbound** table-KID fallback (PO accepted **name-match only**).
- Mark v2Map `Approved — Cognos green` without a dated PO host pass (A3). T2 GREEN reopen-bans ≠ Cognos §10.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from features. Map stays pure (allowed reads: kidIndex, `filterPropObj`, `bwOldToNewMap` only).
- Import `parameterMap.js` into `buildV2SourceMapping.js`. Import `writebackMap` into SET.
- Reuse `reconcileConfirmedDienststelle` `userNotify`. Hook `hasDegradedPhase()` or DISPLAY_DEGRADED-only for C4.
- Grow `runFilterRestore.js` past 150. Exceed JS 150 / orch 120 / controller-fn 60 / 10 AMD without PO.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry. ES modules in `KDB3/js/**`.

---

## Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding (spot-check) and **after**.
- Pre-flight: one-sentence summary of each Section A item **before** producing files.
- Exclusive allowlists from the spec. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD `define` + factory-scope named helpers, naming `_` prefix on boundary inputs, try/catch (**anti-D1**; `runFilterRestore` must **gain** try/catch), file size, no foreign `_KDB.state` writes, Map purity, SET no Map import, **new** German only in `writebackLabels.js` (**carve-out:** existing hardcoded DE abort `showAlert` may stay in `notifyRestoreOutcome` / present rung 2 — UX §2 OOS).
- Semantic review against the **three deltas** + the **patched spec**, not against this handoff’s memory.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## Law (read these, not the old chat)

1. `_____________KDB3API/contracts/writeback-mapping-restore-ux-execution-spec.md` — **how** (allowlists, per-file rules, Section A echo, J/K/L/M). Status: Ready + **PO GO**.
2. `_____________KDB3API/contracts/writeback-v2Map-contractdelta.md` — A1 §4 / §11.
3. `_____________KDB3API/contracts/writeback-mapping-package-mismatch-contractdelta.md` — A2.
4. `_____________KDB3API/contracts/writeback-dienststelle-restore-ux-contractdelta.md` — C4/C5/C6.
5. Parents only as **cited sections via army** after code: `writeback.md` §2.2 / §5 / §6.5 / ~1428; `dienststelle-parameterSetRestore-contractdelta.md` §3 / §5; `writeback-urlParameterId-contractdelta.md` overlay ladder; `mapping-config-ssot-contractdelta.md` call-site table (SET reads `resolveRuntimePackageKey`); `messageService.md` notify vs showAlert.

Live path correction already in spec: A2 validate is `set/state/validateRestorePayload.js`, **not** `writeback/schema/…`.

---

## Locked decisions (do not re-litigate)

| ID | Required |
|---|---|
| **A1** | Same-package iff every GFO key ∈ `{datasourceName, alternativeDatasourceName}` → skip remap. Remap table KIDs **only** when GFO key **equals** those runtime names. **No** first-unbound / next-unbound / Object.keys-order bind (would SWAP or collapse). Unmatched old table names stay unmatched. Kale `u` still `{label}_filter_use_KID`. No slots/DS source map. Filters dest = **name**. Vis bind = **runtime** `parameterMap` + global hierarchy snapshot. Army already verified filters + vis still work. |
| **A2** | SET + kidIndex **inside validate only** (factory is 10 AMD). `failed` + `WRITEBACK_MAPPING_PACKAGE_MISMATCH` via live **positional** `addDiagnostic` + **`throw ABORT`**. Before widgetReset. No Map import. Known MAG+code-only overblock accepted. v2-after-Map must **not** fire (`mapV2ToV3` already stamps `pkg`). History wipe same as invalid v3 — do not reorder `historyBegin`. |
| **A3** | Keep v2Map status; extra A1 items 8–10 on the host list. |
| **C4** | SET-finish `message.notify` from `writebackLabels.js` (**two** keys). Unwrap **`phase.result`**. Abort `showAlert` only; never both. Overlay: extend present **early-return**; ladder missing-id > abort > info. Destroy/clear `pendingDienststelleRestoreInfo`. |
| **C5** | No tab S6-default when global **saved** member applied. Guard missing global plan item. Plan file **141/150** — ≤8-line loop, no extra comments. |
| **C6** | Abort threshold unchanged. **`break` on any global `requiredOk` false** (incl. `writeFilter` fail). Skip reconcile. Do not move dstl before step 9. |
| **B** | CP-3 holds. |

---

## Already closed (do not re-open as “holes”)

Spec review 2026-09-03 found four **block** holes; predecessor **patched the spec**:

1. C4 stash = `phase.result.fallbackScopes` / `missingValues` (not the envelope).
2. Overlay present early-return must include `pendingDienststelleRestoreInfo`.
3. C6 `break` on `writeFilter` fail, not only empty values / missing ref.
4. A1 drop order-fallback (name-match only).

Nits also in spec: abort DE leftover allowed; rest of `map/adapters` OOS; no dstl-before-step-9; C5 no-throw if no global item.

U1 **extra files** vs UX §7 typical blast (pending-flag 1-liners) are **required** by UX §3.3 — not overreach.

---

## Where to start (order)

1. Read **only** this file + the execution spec + the three deltas.
2. First PO message (Dutch): started / GO in hand / launching army.
3. Optional short army spot-check: allowlist files still exist; `runFilterRestore.js` still ~149; SET factory still 10 AMD; `parameterSetRestore.js` still 10 AMD. **Do not** restart Map/legacy research.
4. Launch writers per spec slices **M1 / S1 / D1 / U1**. Exclusive allowlists — copy from spec Section C, do not invent files.
5. Fresh dual review (new agents).
6. Parent one-liners (v2Map §9, mismatch §4, UX §6, SSOT call-site).
7. Dutch Cognos checklist (below). Do not self-certify green.

---

## Cognos checklist (give PO after dual review)

1. Same-dashboard `set(get())` unchanged.
2. v2 same-package two-table GFO either key order: skip remap; Sicht + kale + dstl + vis OK.
3. v2 alt-first **cross-package** (if a fixture exists): no GFO collapse; kale members stick (remapped `u`); vis binds.
4. v3 `pkg` ≠ runtime: SET failed, **no** parked vis leftover.
5. Saved global MAG, missing tab dstl: empty PC chip, vis MAG, info toast, no abort.
6. Global dstl unrestorable, no default: abort alert, no info toast, no S6 chips on tabs, widgets parked, filters still on dock.
7. URL `parameterId` missing-id: still one modal; no stacked dstl toast.

---

## MUST reminder (army echoes these; you do not paste the files)

`kdb-object`, `state`, `runtime`, `naming`, `module-public-api`, `events`, `feature-structure`, `error-handling`, `dom`, `amd`, plus `cognos-adapter.mdc` (Map/SET are not ring-1). Lifecycle terms only from `lifecycleVocabulary.md`.

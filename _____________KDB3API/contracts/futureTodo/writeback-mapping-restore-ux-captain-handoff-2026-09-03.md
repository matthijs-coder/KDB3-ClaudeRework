# Launch prompt — writeback mapping + Dienststelle restore UX captain 2026-09-03

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*`.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST rules, full `writeback.md`, full `dienststelle.md`, Map adapters, restore orchestrators, or predecessor chats.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts into this chat.
- You read/write **contracts** and **execution specs**. Army reads code, writes code, and reviews (contract ↔ code **before** and **after** implementation).
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `KDB.js`, `runNormalRestore.js`, `parameterMap.js` (the KID table), `bwOldToNewMap.js`, or full `writeback.md` into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch **one-line** parent drift if a real deviation appears, brief writers. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **This file + the three deltas below + live JS (via army)** are source of truth.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor (this handoff’s author) investigated legacy KDB2 mapping + Dienststelle restore vs live KDB3, stress-tested a PO package, and **wrote the three Approved contract-only deltas**. Predecessor **must not** keep coordinating (context full). You take the **next steps**.

PO **approved the product package** on 2026-09-03 (vastenburg). Deltas exist. You do **not** reopen A1/A2/C4/C5/C6 product choices unless army proves a **new** contradiction with live code that the deltas did not already document.

### Do

- **Module Contract First.** Law for this WP (read these, not the old chat):
  1. `_____________KDB3API/contracts/writeback-v2Map-contractdelta.md` — **§4 same-package (amended), §8–§11 A1 recast**
  2. `_____________KDB3API/contracts/writeback-mapping-package-mismatch-contractdelta.md` — **A2 SET `pkg` fail**
  3. `_____________KDB3API/contracts/writeback-dienststelle-restore-ux-contractdelta.md` — **C4/C5/C6**
  4. Parents only as **cited sections** via army: `writeback.md` §2.2 / §5 / §6.5 / ~1428; `dienststelle-parameterSetRestore-contractdelta.md` §3 / §5; `writeback-urlParameterId-contractdelta.md` overlay ladder; `messageService.md` notify vs showAlert
- First message to PO (Dutch): started; three deltas already Approved contract-only; you will write an **execution spec**, then army implements **after** you show the spec (or PO says implement GO if they want a second look). Do not write JS in the first turn.
- Write `_____________KDB3API/contracts/writeback-mapping-restore-ux-execution-spec.md` from `contracts/_executionSpecTemplate.md`. Exhaustive: pre-flight Section A (10 MUST `.mdc` + lifecycleVocabulary + the three deltas + this handoff + kidIndex/parameterMap **shape only**), folder tree, **per-file `Rules to apply`**, AC including anti-D1 try/catch and anti-D2 destroy, forbidden actions, Section L report template.
- Split work. Tight briefs. **Parallel** grok 4.6 subagents with **exclusive file allowlists**. No two writers on the same file.
- Gate: (1) army **pre-impl** contract vs live code (confirm paths, line counts, 149-line `runFilterRestore.js`) → (2) execution spec → (3) PO implement GO if not already implied → (4) writers → (5) **fresh** dual review (mechanical MUST + semantic delta) → (6) one fix-iteration max then escalate → (7) parent one-liners from the deltas’ “parent as-built” lists **after** code → (8) Dutch Cognos checklist for PO.
- If implementation must deviate: **stop**, present to PO, **update the relevant delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Do not

- Re-investigate legacy `setupWBParameterMapFunction` / `restoreFromParameterset` as if the product were open. Legacy lessons are **already** in the deltas.
- Reopen: full legacy Map (slots/DS/localFilters); MAG/level use-KID as a **must**; first-GFO-key OR vs alt table; warn-instead-of-fail on `pkg`; toast from `dienststelle`; “Rechte” copy; S6-default on a tab when global saved MAG applied; abort-on-every-miss; v3 KID migrator; SET→Map.
- Pull v2 SS `.d` vs `.u` extract into this WP (explicit out of scope in v2Map §8 and UX §8).
- Mark v2Map `Approved — Cognos green` without a dated PO host pass (A3). T2 GREEN reopen-bans ≠ Cognos §10.
- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from features. Map stays pure (allowed reads: kidIndex, `filterPropObj`, `bwOldToNewMap` only).
- Folders `helpers` / `common` / `shared` / leftover `Support`. Inline nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS 150 / orchestrator 120 / controller-fn 60 / 10 AMD imports without PO.
- Import `parameterMap.js` into `buildV2SourceMapping.js`. Import `writebackMap` into SET.
- Reuse `reconcileConfirmedDienststelle` `userNotify` for the toast (that is vis dispatch).
- Hook `hasDegradedPhase()` or DISPLAY_DEGRADED-only for C4.
- Grow `runFilterRestore.js` past 150 (extract).

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding and **after**.
- Pre-flight: one-sentence summary of each MUST rule **before** producing files (spec Section A).
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD `define` + factory-scope named helpers, naming `_` prefix on boundary inputs, try/catch, file size, no foreign `_KDB.state` writes, Map purity, SET no Map import, German only in `writebackLabels.js`.
- Semantic review against the **three deltas**, not against this handoff’s memory.

Suggested slices (adjust after pre-impl glob; exclusive files):

| Slice | Owns |
|---|---|
| M1 Map A1 | `remapV2KidTokens.js`, `buildV2SourceMapping.js` only |
| S1 SET A2 | `validateRestorePayload.js` (+ kidIndex AMD on SET factory/orchestrator if needed) |
| D1 dstl C5/C6 | `buildRestoreScopePlan.js`, `applyRestorePlan.js` (`parameterSetRestore.js` only if reconcile skip must be wired there) |
| U1 SET UX C4 | extract capture from `runFilterRestore.js`; `executeRestoreRun.js` + new notify helper; `writebackLabels.js`; overlay present-pending **only if** info must pend |

Do not give one agent all four slices.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## Where to start (order)

1. Read **only** this handoff + the three delta files (not full `writeback.md`).
2. Launch **explore** army: live paths + line counts for the file tables in v2Map §11, mismatch §5, UX §7. Confirm `kidIndex` exports `alternativeDatasourceName` / `resolveRuntimePackageKey`. Confirm `runFilterRestore.js` line count.
3. Write the execution spec.
4. Stop for PO if spec allowlists collide or a file cannot stay ≤150 without an extra split the deltas did not name.
5. Implement via army in M1 → S1 → D1 → U1 (Map does not depend on SET UX; A2 validate should fail **before** widgetReset).
6. Fresh dual review (new subagents, not the writers).
7. Parent one-liners (v2Map §9 list, mismatch §4, UX §6) **after** code matches.
8. Dutch Cognos checklist (below). Do not self-certify green.

---

## Product package (do not re-litigate)

| ID | Live problem | Required |
|---|---|---|
| **A1** | Same-package = first GFO key vs main only; alt-first remap collapses GFO onto `Personal_KDB` | All GFO keys ⊆ `{main, alt}` → skip remap. Remap path emits `alternativeDatasource_name_KID`. Kale `u` still `{label}_filter_use_KID`. No slots/DS source map. |
| **A2** | SET ignores `pkg`; GET launders | SET + kidIndex; `failed` + `WRITEBACK_MAPPING_PACKAGE_MISMATCH`; **before park**; no Map; known overblock MAG+code-only foreign v3 **accepted**. |
| **A3** | v2Map still awaiting Cognos | Keep status; extra A1 items 8–10 on the host list. |
| **C4** | Degraded silent | SET-finish `message.notify` from `writebackLabels.js` (**two** keys: fallback vs missing-without-default); abort `showAlert` only; never both; overlay missing-id > abort > info. |
| **C5** | Per-scope S6 on tabs while vis binds global MAG | No tab S6-default when global **saved** member applied. |
| **C6** | Non-fail-fast PC defaults then abort | Stop later writes + skip reconcile when global cannot apply/fallback. Abort threshold unchanged. |
| **B** | — | CP-3 holds. |

Filters dest = **name**. Vis bind = **current** `parameterMap` + global hierarchy snapshot. Empty PC + global MAG = inherit (HOLD).

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

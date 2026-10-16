# Launch prompt — WP4 continuation captain

Paste into a **fresh** agent chat. Do **not** continue the predecessor captain chat. Do **not** load `agent-transcripts`.

You are **planner / team captain / organizer / coordinator**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). `explore` = read; `generalPurpose` = write / review. PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `_KDB.config.labels.de.*`.

**You are WP4 only** (max widgets per tab toast). PO assigned this seat even if wave-1 boxes 1/3/5/8 are open or in other chats. Do **not** switch WP. Do **not** start 1, 3, 5, 8, wave 2, or SSS.

The predecessor **wrote spec + JS before PO Approved** (misread “go after second pass”). You inherit that mess. **You do not write production JS yourself.** Army writes after **Approved** delta+spec.

---

## Token budget — 256k, take this seriously

Captain context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `widgetBase.md` / `launchpad.md` / `messageService.md`, `KDB.js`, the whole naslag, predecessor chats, or paste file bodies into this thread.

**Delegation is mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this thread. One job in *your* context: synthesize army verdicts, write **delta/spec** after PO Approved, brief the next writer, parent **one-liners** after dual review. Army holds file bodies.

Do **not** ingest all 11 MUST files. Army echoes MUST (spec Section A). You read: PROGRAM standing orders + **row 4**, naslag **§4 only**, the WP4 delta, the WP4 spec, `feature-structure.mdc` **workflow only**.

Grok dual-review previously died with `resource_exhausted` when briefs pasted full `.mdc` + many files. Keep review briefs **short**: listed paths + FAIL/NIT checklist.

Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

Extra investigation and extra review via subagents is a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory. Contract ↔ codebase compare **before** and **after** the patch.

---

## You (captain) do

- **Module Contract First.** After PO Approves the package below, **you** write the chosen mechanism into the delta, then shrink the spec to match. Approved delta outranks `.mdc` / `architecture/` for this slice. Silent code↔contract drift: stop, PO, update delta, then resume.
- Present / wait for PO **Approved** before any further JS. If the user’s first message in *this* chat is already **Approved** of package **A**, skip re-pitching options; write delta+spec, then army patch.
- Read/write **contracts** (this WP’s delta/spec + tiny parent one-liners after JS dual-review). Split work. Tight briefs. Exclusive allowlists. No two writers on the same file.
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op. None of those belong in WP4.
- If army proves the allowlist would exceed JS 150 / orch 120 / AMD 10: stop, propose split, do not silently grow files.
- After JS: two **fresh** army reviews (mechanical vs spec; semantic vs delta). Then PO Cognos. Tick PROGRAM **4** only when Cognos green.

## You (captain) do not

- Primary code read of large trees, production JS/CSS writes (except a **one-line** wiring fix that costs more to re-brief), or self-certify Cognos green.
- **Naive-delete** the first `while` in `claimFirstEligibleFromDiscovery` — that is option **B** (false German toast when `hasContent` failed). Tracked one-pass **A** uses a `sawUnevaluable` (or equivalent) flag.
- Patch JS before the delta+spec match Approved **A**.
- Ingest all 11 MUST `.mdc` files, full parents, `KDB.js`, or predecessor transcripts into **this** thread.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. Commit only if PO asks.
- Re-open owner **widgetBase**, German copy, `notify` **warning**, no restore toast, no `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`, no extra notify/labels files.
- Grow `handleDropCreate.js` (AMD **13**) or `createWidgetBaseController.js` (AMD **28**). Touch `placeSerializedWidgetEntry.js` (150).
- Invent a new `messageService` method. Call `_KDB.cognosAPI` / `__getDashboardAPI`. Glass toast clones.
- Folders `helpers` / `common` / `shared`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Tick box 4 before Cognos green. Re-open the global toast census.

## Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Extra investigation / extra review rounds = good default. Quality over speed.
- **Contract ↔ codebase compare before coding** (blast radius, line counts, AMD) **and after**.
- Pre-flight: echo spec Section A (14 one-liners) **before** files. Exclusive allowlist. If blocked: stop and report; do not invent architecture.
- Mechanical: AMD `define`, `_` prefix on boundary inputs, try/catch, ≤150 / orch ≤120 / ≤10 AMD, factory-scope helpers, no foreign launchpad state/runtime, toast predicate **only** `ok !== true && isEligibleListEmpty === true`.
- Semantic: WP4 acceptance in the **Approved** delta (full pad drop → DE warning; free slot → no this toast; unevaluable/`ok !== true` → no this copy; restore/duplicate → no toast; no ghost widget).

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — standing orders + **row 4** only.
2. Naslag **Number 4 only**: `contracts/futureTodo/toast-message-port-NASLAG-2026-09-07.md`
3. Draft delta: `contracts/widgetBase-max-widgets-toast-contractdelta.md` (**not** Approved until PO says so).
4. Unapproved spec: `contracts/widgetBase-max-widgets-toast-execution-spec.md` (HOW leaked architecture; shrink after Approve).
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only).
6. This file. **Do not** re-run the global toast census. **Do not** re-open product locks on copy/owner/warning/no-restore.

**First PO line if Approve is not yet in this chat (Dutch):**  
“WP4 is Draft; JS bestaat te vroeg; ik schrijf zelf geen JS; ik wacht op jouw Approved van pakket A (tracked one-pass), daarna schrijf ik delta+spec en laat het leger patchen.”

**First PO line if this chat already contains Approved of package A:**  
“WP4 Approved pakket A; ik schrijf delta+spec; army patcht `resolveDropClaim` (+ normalize omit-unless-true); ik schrijf zelf geen JS.”

---

## What is already done (do not redo from scratch)

- Product locks (owner widgetBase, exact DE copy, `notify` warning, no restore toast, launchpad environment-only, no new error code).
- Proposal series + second-pass stress/overdesign. Toast **shape** stands: subscriber factory-scope `startDropCreate` / `notifyPadExhausted`, `isEligibleListEmpty` not `reasonCode`, no extra files, ghost gate `claim && claim.widgetId`.
- **JS exists** (too early) on four files only:
  - `widgetBase/effects/subscribeDropValidated.js` — 54 / AMD **0** (keep)
  - `widgetBase/actions/resolveDropClaim.js` — **130** / AMD **2** (**FAIL inside**: two-pass abort)
  - `widgetBase/actions/normalizeDispatchResult.js` — 42 / AMD **0** (passthrough always `false` — NIT)
  - `widgetBase/__orchestratorWidgetBase.js` — 83 / AMD **5** (inline `maxWidgetsPerTab` seed, keep)
- Untouched (must stay): `handleDropCreate.js` 117 / AMD **13**; controller 140 / AMD **28**; `placeSerializedWidgetEntry.js` **150** (remap drops extras → restore still no toast).
- Parent `widgetBase.md` has **three unapproved insertions** (dropCreate bullet ~249, subscriber ~567, **§14** row ~690). Delta said one-liner after review and **do not** add the flag to §14.
- PROGRAM row **4**: still `- [ ]`, Status Draft, series listed **open**. Do not tick until Cognos green **after** Approved.

There is **no git** to revert the four JS files safely. Reconstructing pre-WP4 `resolveDropClaim` (~102 lines, no `hasContent` callback, old `if (claim)` ghost) is riskier than a tracked A patch.

---

## FAIL still live (must not Approve as-is)

`claimFirstEligibleFromDiscovery` first `while`: any `readHasContentState === "unevaluable"` → `{ hasContentUnevaluable: true }` → `claimFromPad` returns `null` → **no later free evaluable shell** (drop **and** GET/PS restore / tab-duplicate via `claimParkedShell` + same `sourceKind`s) **and** no German toast.

Host (`cognosHostService.md`): not `ok && data === true` → **ineligible, continue** — not abort the pad.

Naive **delete of that first `while`** does **not** implement A. `hasContentUnevaluable` becomes dead → always `emptyListMarker()` = option **B** (toast when host `hasContent` failed = false DE copy).

---

## Options army already ran (do not re-open unless PO rejects A)

### 1. Two-pass abort

| | Option | Pros | Cons |
|---|---|---|---|
| **A** | One pass: skip unevaluable ids (host continue). After no `widgetId`: stamp `emptyListMarker` only if **zero** unevaluable (plus `widgets: []`). Facet missing → `null`. Use a **tracked** `sawUnevaluable` (or equivalent). | Claim matches host; later free shells work on drop+restore; toast only when eligible list proven empty; fits 130/AMD 2 | Full pad + one `READ_FAILED` still silent toast (fail-closed) |
| B | One pass skip + stamp whenever no claim | Same claim fix; fewer flags | Host-down → false “max widgets in use”; violates acceptance 3 |
| C | Stamp only `widgets.length === 0`; drop unevaluable tracking | Main full-pad path **is** `[]` | Lock 4 is empty **eligible** list; parked-unclaimable children: no drop, no toast |
| D | Stamp if `[]` **or** ≥1 evaluable and no `widgetId` | Host-down silent; mixed full+flaky still toasts | Still toasts with some unevaluable ids (acceptance 3 literal) |

**Lock A.** Reject B. Reject C vs lock 4. D only if PO prefers mixed-pad toast.

### 2. Flag on every dispatch (NIT)

- **A** keep always-false passthrough — envelope noise  
- **B** copy **only when true** — subscriber `=== true` unchanged  
- **C** remove from `normalizeDispatchResult` — toast dies unless `handleDropCreate` grows (forbidden)

**Lock B.**

### 3. Unapproved JS (PROCESS)

- Keep 4 files, **Approve then patch** `resolveDropClaim` (+ normalize B)  
- Revert 4 files — **unsafe, no git**  
- Freeze abort in production — restore/drop can still miss a free shell  

**Lock: Approve then patch.** Do not patch-then-Approve again.

### 4. Parent `widgetBase.md`

After Approve: **strip** the three insertions, then **one** dropCreate one-liner only. **Do not** keep the §14 taxonomy sentence.

---

## Package to wait for / apply after PO Approved

1. Mechanism **A** (tracked one-pass) in the delta. Spec §C D/F **shrink** to that loop — delete two-pass / `hasContentUnevaluable` sentinel as law.
2. Keep subscriber helper, `notify` warning, `isEligibleListEmpty`, no extra files, ghost gate, no restore toast.
3. Normalize: omit `isEligibleListEmpty` unless `true`.
4. Army exclusive allowlist after spec freeze: **`resolveDropClaim.js`** + **`normalizeDispatchResult.js`**. Do not edit subscribe/orch unless army FAIL. Do not edit handleDropCreate / controller / placeSerialized / launchpad / `KDB.js`.
5. Parent one-liner **after** JS dual-review (captain). Then PO Cognos. Then tick PROGRAM **4**.

**Do not** write JS yourself. **Do not** Approve yourself.

---

## Next steps (strict order)

1. Confirm PO **Approved** package A (this prompt’s package). If they want B/C/D or revert — stop, do not invent.
2. Captain writes the locked mechanism into `widgetBase-max-widgets-toast-contractdelta.md` (Status `Approved`). Shrink `widgetBase-max-widgets-toast-execution-spec.md` to A + normalize-B. Strip unapproved parent inserts now that Approve exists; do not write the new one-liner until step 5.
3. One army **writer**, spec allowlist. First output = 14 Section A echoes, **then** files. Point at the **spec path**; do not paste the spec into this thread after the writer has it.
4. Verify live: first `while` gone; `sawUnevaluable` (name may vary) present; AMD still 2 / 0; files ≤150.
5. Dual-review (two fresh Grok 4.6, short briefs): spec + delta + edited JS. Fix FAILs.
6. Captain: one dropCreate parent one-liner (not §14).
7. PO Cognos: vis pad full + kennzahl → DE warning, no half shell; free slot → no this toast; launchpad-not-ready → no this copy; GET restore miss → no this toast.
8. Tick PROGRAM **4**. Stop.

---

## Do / do not (short)

**Do:** wait for Approved → delta+spec A → army patch → dual-review → Cognos → tick 4.

**Do not:** naive-delete the first loop; grow AMD-13/28 files; mint `WIDGET_BASE_LAUNCHPAD_EXHAUSTED`; dump `KDB.js`; load `agent-transcripts`; start another WP; treat predecessor “Reviewed / LOCK HOLDS” as PO Approved.

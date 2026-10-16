# Launch prompt — share read-only link implement captain 2026-09-04

> **SUPERSEDED — do not paste as a new captain job.**  
> Live law: `contracts/shareControls-read-only-link-contractdelta.md` — **Approved — Cognos green** 2026-09-04.  
> Token is readable English **`readOnly=1`** (exact inbound). Opaque hex `7c91e04b2a1f` is **rejected**. Inbound parse is SET-ladder (A then B, query then hash), second apply in `KDB.js` before `whenUrlShareRestoreSettled`.

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German under `_KDB.config.labels.de.*`.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `shareControls.md`, full `messageService.md`, `KDB.js`, widgetSettings, leftover/PDF CSS, or predecessor chats.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this chat.
- You read/write **contracts** (and tiny parent one-liners). Army does **primary code read**, **code write**, **initial + dual review**, and **contract ↔ codebase** compare (before and after).
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `KDB.js`, `bindShareClick.js`, `createModalQueue.js`, `pdfCapture.css`, or full parent contracts into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, brief writers, patch **one-line** parent drift. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **Source of truth is the live delta** (`shareControls-read-only-link-contractdelta.md`, Cognos green). This handoff is archive only.

Grok dual-review agents previously died with `resource_exhausted` when briefs were huge (full `.mdc` + many files). Keep review briefs **short**: listed JS paths + a FAIL/NIT checklist, **no** pasting rule files.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor wrote the Draft, army shipped W1–W4, PO Cognos **green** 2026-09-04 after token `readOnly=1` + SET-ladder inbound. **Do not implement this WP again.**

You do **not** reopen pad A / polarity / hide-set. You do **not** restore opaque hex `7c91e04b2a1f`.

### Captain does

- **Module Contract First.** Law: `contracts/shareControls-read-only-link-contractdelta.md` — **Approved — Cognos green**. Execution spec is **Executed** (stale W1–W4 sketches lose to the delta).
- First PO message (Dutch): this WP is Cognos green; do not re-implement; do not restore hex.
- Do not launch W1–W4. This WP is shipped. New work needs a **new** delta, not this handoff.
- If implementation must deviate: **stop**, present to PO, **update the delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Captain does not

- Rewrite the execution spec unless army proves an allowlist collision or a file would exceed 150 / AMD 10 / controller AMD 6.
- Re-open pad B/C/D/E, `hidWs`, `KDB_developerMode`, PDF hide-set, HMAC/SHA, opaque hex hash keys.
- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from features.
- Edit `KDB.js` **except** the existing `applyReadOnlyChrome()` wiring in `finishDashboardInitialization` (immediately before `whenUrlShareRestoreSettled`). Do not add AMD. Do not edit writeback `readUrlParameterId.js`, `createModalQueue.js` (default), leftoverWidgets, pdfCapture, kdbControl JS, widgetSettings JS.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS 150 / orch 120 / controller-fn 60 / 10 AMD without PO. Share **controller stays 6 AMD** (`openShareCopyDialog` is imported by `bindShareClick`, not the controller).

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding (blast radius) and **after**.
- Pre-flight: one-sentence summary of each item in spec Section A (**14**) **before** producing files.
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD, `_` prefix, try/catch, file size, no foreign state writes, factory-scope helpers (no nested functions in AMD factories), controller AMD still 6, orch AMD 5.
- Semantic review: toggle in `showCopyable` (not toolbar); default Nur Lesen on; token `&readOnly=1` after `parameterLabel`; inbound A-then-B query-then-hash exact `1`; apply **add and remove** on `#main` (orch + `KDB.js` before SET settle); destroy does not touch class; hide four CSS subjects only; maximize + drillthrough stay; leftover `:has(.KDB_widgetSettings)` still sees the panel node; Copy uses mutated `options.copyText`; `showCopyable` without `toggle` unchanged.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/shareControls-read-only-link-contractdelta.md`
   - `_____________KDB3API/contracts/shareControls-read-only-link-execution-spec.md` (allowlists W1–W4)
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` (execution-spec + MUST-set; do **not** re-read all 11 rules into *your* context — army echoes them)
2. Tell PO this WP is **already Cognos green**. Do **not** launch W1–W4. Do **not** restore hex token.
3. Any change: update the **delta** first. Hex `7c91e04b2a1f` is rejected history, not a target.

---

## Product decisions (closed — do not re-ask)

| Topic | Decision |
|---|---|
| Placement | **A** — toggle **inside** `showCopyable`, not the action bar |
| Polarität | **„Nur Lesen“**, default **ON** (checked = read-only URL) |
| Token | Readable English **`readOnly=1`** after `parameterLabel` (~12 extra characters). Off = omit key. Inbound **exact** `1` only. Opaque hex `7c91e04b2a1f` is **rejected**. |
| Class | `kdb-share-read-only` on `#main` via `dashboardClassHost` |
| Apply | **add** if exact `readOnly=1` on SET ladder (A `navigation.name` then B `location.href`; query then hash); **remove** otherwise. Second apply in `KDB.js` immediately before `whenUrlShareRestoreSettled`. |
| Destroy | does **not** `classList` `#main` |
| Hide | `#kdb-control-root`, `.KDB_widgetSettingsButton`, `.KDB_widgetSettings`, `.KDB_focusModeSettingsPanel` |
| Keep | maximize `.kdb-widget-maximize`, drillthrough `.kdb_hyperlink_icon` / `.kdb-datapoint-pkz` |
| Not security | DevTools bypass OK |
| Labels | `Nur Lesen` / `Ohne KDB-Steuerung und Widget-Einstellungen` |

---

## Transfer (predecessor learned — do not re-investigate from scratch)

- `showCopyable` cannot take HTML/callbacks (Q11). Dual precomputed URLs + declarative `toggle`. Copy reads `request.options.copyText` **by reference** — mutate it; **do not** edit `createModalQueue.js` unless dual review proves a stale paste.
- Live `showCopyable` has **no sanitizer**; do not add one that would drop `toggle`.
- `onShareClick` is already **57/60** → `openShareCopyDialog.js` is **required**. Controller AMD is **6**; do not import the dialog file there.
- `bindMessageDialog.js` is **130** lines → `bindCopyableToggle.js` + `appendCopyableToggle.js` required; `readFocusable` must include `input`.
- Leftover hide is `:has(.KDB_widgetSettings)` — **do not** skip building the settings panel.
- Do **not** copy `pdfCapture.css` grouped selectors (those also hide maximize/drillthrough).
- `hidWs` / `KDB_hide` is inert and SET-scoped — wrong tool.
- `KDB_developerMode` **shows** leftovers + IBM chrome — wrong polarity.
- Parse: fork writeback ladder in `readShareReadOnlyTokenPresent.js` (A `navigation.name` then B `href`; query then hash). **Do not** import or extend `readUrlParameterId`. `navigation.name` has no fragment — that is why B (href) is required for hash-only outbound keys.
- Second share `dom.mdc` document-root exception: `querySelector(dashboardClassHost)`. `location.href` is not a DOM exception.
- Dialog portal is `document.body` — `#main` hide will not hide the share dialog.
- Spec Section A = 14 echoes. Writers report Section L.

---

## MUST rules (army echoes; you do not ingest all)

`kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus `cognos-adapter`. Lifecycle vocabulary: do not invent a term for this class.

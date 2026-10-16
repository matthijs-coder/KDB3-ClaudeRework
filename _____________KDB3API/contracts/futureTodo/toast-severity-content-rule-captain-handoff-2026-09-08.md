# Launch prompt — toast severity content-rule (align live callers)

Paste into a **fresh** agent chat. Do **not** continue the WP2 chat. Do **not** load `agent-transcripts`.

You are **planner / team captain**. Subagents: Grok 4.6 (`cursor-grok-4.6-xhigh`; if missing, current grok 4.6 listing). `explore` = read; `generalPurpose` = write / review. PO = vastenburg. Talk **Dutch**. Artifacts **English**; UI German under `_KDB.config.labels.de.*`.

**You are this slice only:** lock a **content rule** for toast `severity` (`info` | `warning` | `error` | `success`) and bring **all live `notify` / `notifyAnchored` callers in line**. PO 2026-09-08: **no exceptions**.

This is **not** PROGRAM numbers 2 / 6 / 7 / SSS. Ignore “first open box” (that would send you to WP6). Wave-2 JS for cubes/watchdog is a **different** captain.

**First PO line (Dutch):** “WP2 is Cognos groen; ik lock de severity-regel; army herberekent callers; geen uitzonderingen; geen WP6/7/SSS.”

---

## Start here (this order)

1. `_____________KDB3API/contracts/futureTodo/toast-message-port-PROGRAM-2026-09-07.md` — **standing orders only** (captain vs army, 256k, proposal series ritual, MUST echo). Do **not** take checklist rows 6, 7, SSS.
2. This file (handoff).
3. `_____________KDB3API/.cursor/rules/feature-structure.mdc` (workflow only). Army echoes MUST.
4. `contracts/messageService.md` — Q2 tokens + Shared option `severity?` **only** (do not dump; service does **not** own domain meaning).
5. Write `contracts/toast-severity-content-rule-contractdelta.md` (or the name you and PO agree). Status `Draft`. Proposal series **open**. **No JS** until PO **Approved**.

---

## You are (planner / team captain)

Organizer / coordinator / planner. **256k context — take delegation seriously.** It **will** fill if you personally re-read all MUST `.mdc` files, full `writeback.md` / `tabs.md` / `messageService.md`, `KDB.js`, or predecessor transcripts. Point army at **paths**. Do not paste whole contracts or JS into **this** thread. Your job: synthesize army verdicts, write/patch the delta + spec, brief the next writer, parent **one-liners** after dual review. Army holds file bodies.

### Captain does

- Module Contract First. After proposal series + PO Approved, **your delta is law** for this slice. Silent code↔contract drift: stop, PO, update delta, resume.
- Run the **proposal series** (≥2 options per open mechanism question, pros/cons, one recommendation). Present to PO in Dutch. Do not self-approve.
- Read/write **contracts**. Split work. Tight briefs. Exclusive allowlists. No two writers on the same file.
- Ask PO on grey ownership, new `_KDB` namespace, new lifecycle term, new cognosHost facet/op.
- If army proves an allowlisted file would exceed JS 150 / orch 120 / AMD 10: stop, propose split, do not silently grow files.

### Captain does not

- Primary code read of large trees, production JS/CSS writes (except a **one-line** wiring fix that costs more to re-brief), or self-certify Cognos green.
- Ingest all 11 MUST `.mdc` files, full parent contracts, `KDB.js`, html2canvas, or predecessor chats.
- Edit `.cursor/rules/*.mdc`. Edit `contracts/_archive/*` as live. Push git. Commit only if PO asks.
- Invent a new `messageService` method. Do not add a messageService **Q** that makes the **service** interpret domain outcomes (consumers own mapping — `messageService.md` §1 / Q6).
- Tick PROGRAM **6 / 7 / SSS**. Re-open WP2 product (copy, hook, `info` for empty-OK). Re-open SSS rights/Sicht.
- Folders `helpers` / `common` / `shared`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- `_KDB.cognosAPI` / `__getDashboardAPI` from feature files. Glass footer hacks / toast clones.

### Army (Grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- **Contract ↔ codebase compare before coding and after.**
- Extra investigation and extra review rounds are a **good default**. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Pre-flight: if a spec exists, echo Section A (14 one-liners) **before** files.
- Exclusive allowlists. If blocked: stop and report; do not invent architecture.
- Mechanical review: AMD `define`, `_` on boundary inputs, try/catch, ≤150 / orch ≤120 / ≤10 AMD, no foreign state writes, factory-scope helpers only, no DE literals in the wrong owner.
- Semantic review: **this** delta’s acceptance (token matches the rule; copy unchanged unless PO says otherwise).

Subagent model: `cursor-grok-4.6-xhigh`. Do **not** poll Task with AwaitShell. End the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

Grok dual-review previously died with `resource_exhausted` when briefs pasted full `.mdc` + many files. Keep review briefs **short**: listed paths + FAIL/NIT checklist.

---

## Handoff facts (inputs, not law)

Predecessor (WP2 captain, 2026-09-08) closed Dienststelle empty-OK toast. **Cognos green.** PROGRAM row **2** is `[x]`. Do not reopen it.

**User-visible chrome (live):**

- Glass `notify` `warning` → **yellow + exclamation**.
- Glass / KDB `info` → **blue** (KDB anchored = left bar, no glyph).
- KDB `notifyAnchored` `warning` → yellow **bar only**, no exclamation.

**PO product:** not everything the same colour — **one rule**, applied with **no exceptions**.

**Locked rule (PO accepted; write into the Draft as product locks):**

Pick the token from **what happened to the requested domain action**, not from legacy Glass type and not from “this feels yellow.”

| Token | Meaning |
|---|---|
| **`error`** | Machinery / path **failed** (load, replay). User cannot treat it as handled. Restore-abort stays `showAlert` `error`. |
| **`warning`** | User click/gesture **refused**. Nothing they asked for landed. They must do a **different** legal action. |
| **`info`** | Domain path **completed**, with substitute or FYI (default applied, restore fallback, zoom hint). Informed recovery. |
| **`success`** | Completed **positive** copy (copy-to-clipboard OK). Do not fold into `info`. |

Wave-1 **intentional** divergences from legacy Glass type **already fit this rule** — KEEP:

- WP3 Top-N blocked: `warning` (legacy was `info`).
- WP4 pad exhausted: `warning` (legacy was `error`).
- WP8 add-at-max: `warning` (legacy add was `info`).
- WP2 empty-OK: `info` (legacy `info`) — **do not change**.
- Restore H2/H3: `info`.

**Known DRIFTs** (army 2026-09-08 — **re-verify**, do not treat as a closed census):

| Caller | Live token | Rule says | Files (verify) |
|---|---|---|---|
| Settings **min applied** (clamp landed) | `warning` | **`info`** | `kdbControl/settings/warnSettingsMessage.js` + gate that uses `KDB_CONTROL_SETTINGS_DIMENSION_MIN_APPLIED` |
| Tabs **degraded** (“Die Aktion wurde ausgeführt…”) | `warning` | **`info`** | `tabs/effects/confirmAndDispatchTabDelete.js` / `…Duplicate.js` / `…Move.js` — `TAB_MUTATION_DEGRADED_TEXT` |

Settings **invalid** (`proceed: false`) stays **`warning`**. Tabs min/max/conflict/same-position stay **`warning`**. Copy fallback (click did not land) stays **`warning`**. Copy OK stays **`success`**.

Army must **re-grade every** live `notify` / `notifyAnchored` `severity:` under `KDB3/js` against the table **before** locking files. If a third DRIFT appears, put it in the delta — **no exceptions**, do not park it.

---

## Proposal series (mandatory before Approved)

≥2 options, pros/cons vs live sizes + MUST + this rule, one recommendation, at least:

1. **Where the rule lives:** toast-program note + this delta vs a new `messageService` Q (predecessor rec: **not** a new Q — service must not own domain meaning).
2. **Scope of JS:** token-only (`severity: "info"`) vs also restyle copy. Predecessor rec: **token-only** unless a German sentence is literally a “blocked” sentence for an applied action (then ask PO).
3. **`warnSettingsMessage.js`:** one helper serves **invalid** (keep warning) and **min-applied** (info). Options: branch on reason-code vs split helper vs two call-site payloads. Do not grow the file past 150.
4. **Tabs degraded:** three confirm-helpers; shared constant vs each payload. Do not grow files past 150 / AMD 10.
5. **File allowlist / AMD** after army line counts.

Do **not** invent a `messageService.warn` revival (`messageService.md` already rejects that as API).

---

## Do not

- Start WP6, WP7, SSS, or a new toast census of “missing” legacy toasts.
- Change WP2 `info` / copy / hook.
- Tick PROGRAM 6/7/2.
- Dump `KDB.js` / full `tabs.md` / full `kdbControl` contracts into this thread.
- Edit `.mdc`.
- Self-approve JS.

After Cognos green on **this** slice: Approval log + parent one-liners (rule pointer on `messageService.md` `severity?` row is enough — do not rewrite Q2). Stop. Leave WP6/7 for their captains.

# Launch prompt — writeback GET persist-popup hold captain 2026-09-01

Paste into a **fresh** agent chat. Do **not** continue the previous persist-landing captain chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you re-read `writeback.md`, all tabs/writeback deltas, leftover-hide, kdbControl-tabFollow, and the predecessor investigation yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts into this chat.
- Do **not** re-open A vs B/C/D, “fault is in the extension”, or “why save fails on tab 2” as a product mystery. A′ land is proven. This WP is the **hold/restore trigger**.
- Do **not** dump `writeback.md`, `KDB.js`, Cognos console stacks, or KDB2 helpers into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, **patch the contract delta**, brief writers. Army holds the file bodies.

Quality over speed: extra investigation and review rounds via grok 4.6 subagents are a **good** default. Restoring the user tab while the extension popup is still open (user typing or loader still up) is worse than a slower WP.

---

## You are

**Organizer / coordinator / planner / team captain.**

You **write and read contracts**. Subagents check contracts against the live codebase **before and after** new JS. You do not do the primary code read/write/review.

Predecessor captain **violated** this: they wrote production JS in `applyWritebackGetPersistLanding.js` / `scheduleWritebackGetPersistRestore.js`. Do **not** copy that habit. Army owns those files now.

### Do

- Split work. Tight briefs. **Parallel** grok 4.6 subagents with **exclusive file allowlists**.
- **Module Contract First.** Patch `writeback-get-persist-landing-contractdelta.md` §3 / §5 for popup-lifetime hold. Present to PO. No new JS until PO ack of that patch (the rest of A′ is already Implementing).
- Gate: army confirms live restore vs PO popup-gone (do not re-litigate A′) → **you** patch the delta → PO ack → short execution spec if writers would guess → one writer per allowlist → dual review (mechanical + semantic) via **fresh** subagents → fix MUST holes → PO Cognos check.
- Echo: each implementer echoes one sentence per MUST **before** producing files.
- First message to PO: started / blocked. After dual review: what Cognos must re-check.

### Do not

- Write production JS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Re-open B (KDB2 `#saveParameterSet` + opacity 0 + 8500ms scrape), C, D, inbound share, FilterDock, PDF, tab CRUD, WritebackTabel CRUD, `syncBridge`.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from writeback GET or the bridge.
- Scrape `#saveParameterSet` / `#selectParameterSet` from GET (read/select stay in existing bridge SET helpers only). Watching the **popup node** (`smq-popup` / `#preloader-object`) as a persist-busy signal is **in** this WP; clicking or filling `#saveParameterSet` is **out**.
- Thicken `cognosWritebackBridge.js` with tab logic. Bridge: `await collect({ source: "bridge" })` → `JSON.stringify`.
- `notifySaveFailed` / German `Dashboard speichern` if land/hold/restore fails after v3 is valid.
- Invent `helpers/` `common/` `shared/`. No new service.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Load predecessor captain chats or `agent-transcripts`. This file + live JS + contracts are source of truth.
- Await popup-gone **inside** `collect()` / `apply` **before** JSON returns — **deadlock** (extension persist starts only after GET returns).
- Restore the user tab on a **wall-clock timeout while the popup still exists**. That is the live bug PO reported.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- Contract vs live files (before and after).
- Implementation against the approved delta patch (echo MUSTs first).
- Exclusive allowlists. No two writers on the same file.
- If blocked: stop and report; do not improvise architecture.

Captain does **not** use army to re-decide A′. Army may find a mechanical hole (e.g. GET runs only after Okay, so land cannot happen at “popup first paint”). Then stop and report — do not silently go back to 8s restore.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Authority (highest first):

1. This prompt (PO popup-lifetime hold).
2. `contracts/writeback-get-persist-landing-contractdelta.md` **after you patch §3/§5 and PO acks**.
3. That delta’s parents: `writeback.md` §2.1 / §3; visible-dashboard GET; tabs-writeback-readiness §11; kdbControl-tabFollow §2.
4. `architecture/projectStructureRules.md` + `.cursor/rules/` (army reads them; you do not dump them here).
5. Live `KDB3/js/**`.

---

## 0. Closed product (do not reopen)

**A′ works for persist if we stay on tab 1.**

- Symptom was: save from tab 2+ → name missing in `#selectParameterSet`; no German alert. Save already on tab 1 works.
- Land+follow **does** run (PO saw jump to tab 1). Collect succeeds.
- **X1 2026-09-01:** wrap cancelled the delayed restore; user stayed on tab 1; **name appeared**. So persist is page-scoped at **GET-return / persist time**, not click-time-only (H2 killed). H1: restore too soon.
- Landing path (keep): `tabs/writebackGetPersistLandingRequested` = `tabs/traverse` `singleTab` `waitFor: "canvas"` then tabs-owner `tabs:changed` `source: "writebackGetPersistLanding"` so `followActiveTab` runs. Do not use `parameterSetActivateTabRequested`. Do not reuse GET collect `TRAVERSE_PAYLOAD` as persist land. Do not edit `followActiveTab.js`.
- Gate: `collect({ source: "bridge" })` only.
- Widget GET layout: owner `lastCanvasLayout` else `layout` (DOM merge already dropped). Not this WP.

**PO 2026-09-01 evening — extension UI (normative for this captain):**

1. User clicks parameter save in the **external** extension.
2. A popup appears (`<smq-popup>` **direct child of `document.body`**). User types the set name. Title example: `<h1 class="api-title">Neues Parameterset erstellen</h1>` — optional identity: `api-title` text contains `parameterset` (case-insensitive).
3. User clicks Okay → **loader** `#preloader-object` (`display:block`, nested `.preloader`). Then `WBParameterGetFunction` / `writebackGet.collect({ source: "bridge" })` runs (army must confirm vs live: GET on Okay, not on popup-open).
4. When the loader disappears, the **whole popup goes with it**. Then we are done with the persist window.
5. **Stay on tab 1 until the popup element is gone** — gone because save finished **or** because the user cancelled. Same outcome: popup not in `document.body`.
6. PO rejected live behaviour: land on tab 1 then **jump back to tab 3 on a timer regardless of the user**. 8s fallback while the popup still exists is **forbidden**.

Predecessor “watch `#preloader-object` then restore, 8s if never seen, 20s if never hides” is **too weak**: 8s still yanks the user while they may be in the dialog; restore must key off **popup node absence**, not a clock.

---

## 1. What you implement (normative)

Keep A′ land (first **visible** dashboard slot, follow must run, stringify only after land+host wait).

Change **only the restore/hold**:

```text
GET (bridge) invoked.
If persist popup is present (smq-popup on document.body; prefer api-title containing "parameterset"):
  land on first visible dashboard tab (if not already there).
Collect + validate (do not wait for popup-gone here).
Return v3 → bridge JSON.stringify.
Fire-and-forget: stay on that tab until smq-popup is absent from document.body
  (save complete OR user cancelled).
Then restore captured user tab (same persist-land action; follow must run).
If popup never appears: no land/restore (internal collect) OR if GET ran without popup, do not invent a timer yank.
```

**Deadlock:** do **not** `await` popup-gone inside `collect()` before return.

**Optional identity:** if several `smq-popup` exist, the save dialog is the one whose `h1.api-title` contains `parameterset`. PO offered this; army confirms live.

**Documents:** popup is a **direct `document.body` child**. Prefer the document KDB actually runs in; also `window.top.document.body` only if that document is different (GET is installed on `window.top`). Ignore KDB `#WB > #preloader-object`.

**Cancel existing watch** on: user `tabs:changed` (source ≠ `writebackGetPersistLanding`), SET `parameterSetRestoreActive`, GET re-entry, `destroy()`. If the user switches tabs by hand while the popup is still open, do not fight them (same as today).

**Fallback clock:** only if the popup was seen and then the node is stuck for a **long** safety cap (order 30s+, not 8s). Prefer “node gone”. Do not restore at 8s while `smq-popup` still exists.

---

## 2. Where to start (this session)

### Step 0

First PO message: you have this handoff; next is **Draft patch** to the existing delta (popup-lifetime hold). Ask only: is GET invoked at Okay (loader) or already when the name popup opens? If army can see it in live `bridgeGet` / extension timing from GET-side logs, do not nag PO.

### Step 1 — army, read-only, parallel

| Agent | Question | Start files |
|---|---|---|
| Restore vs popup | Live restore trigger: `#preloader-object` poll + 8s/20s? Does restore fire while `smq-popup` still in `body`? | `KDB3/js/core/services/writeback/get/scheduleWritebackGetPersistRestore.js`; `applyWritebackGetPersistLanding.js`; `createWritebackGetService.js` |
| Land timing | Land after validate or at collect start? Must land while popup exists, still return JSON before persist completes. | same GET files; `cognosWritebackBridge.js` `bridgeGet` |
| Popup identity | `body > smq-popup`, `h1.api-title`, `#preloader-object`; `#WB` ignore | live files only; do not scrape `#saveParameterSet` |

### Step 2 — you patch the delta

File (already exists): `_____________KDB3API/contracts/writeback-get-persist-landing-contractdelta.md`

Replace §3 step 10 / §5 delayed restore with popup-gone (this prompt §1). Status stays `Implementing` after PO ack of the patch. Keep A′ land sentences.

**Present the patch. Stop. No JS** until PO ack.

### Step 3 — after PO ack

- Army implements. Exclusive allowlists. Likely only GET persist files (`applyWritebackGetPersistLanding.js` is at **150-line cap** — watch stays in `scheduleWritebackGetPersistRestore.js`).
- Dual review (fresh subagents). Mechanical: AMD, 150, no `_KDB.cognosAPI`, no `#saveParameterSet` write/scrape, generation cancel. Semantic: no restore while `smq-popup` in `body`; GET still returns before persist; cancel/destroy; tab-1 skip still works.
- Fix MUST holes via army.

### Step 4 — Cognos (PO)

1. From tab 3: save → popup → Okay → stay on tab 1 **until popup gone** → then back to tab 3; new name in `#selectParameterSet`.
2. From tab 3: open popup, **cancel** → popup gone → restore to tab 3; no German fail.
3. Save already on tab 1 still works.
4. User can sit in the name popup longer than 8s without being yanked to tab 3.
5. No `[writebackGet.collect]` fail-visible throw on happy path.

---

## 3. Live files (after approval)

**GET (writers)**

- `KDB3/js/core/services/writeback/get/applyWritebackGetPersistLanding.js` (150 cap)
- `KDB3/js/core/services/writeback/get/scheduleWritebackGetPersistRestore.js` (restore watch — **this is the bug**)
- `KDB3/js/core/services/writeback/get/createWritebackGetService.js` only if land must move **before** collectors (PO: GET+popup → tab 1). If GET runs at Okay, land-after-validate may stay; army proves it.

**Bridge:** `cognosWritebackBridge.js` — await only.

**Do not touch unless one-line need:** `followActiveTab.js`, leftover CSS, SET post-restore, `parameterSetActivateTab.js`, collectWidgets `TRAVERSE_PAYLOAD`.

---

## 4. Rejected / do not revive

| ID | Why |
|---|---|
| B | Save-button scrape + opacity + 8500ms. |
| 8s restore while popup open | PO: yanks user regardless of dialog. X1 proved hold must last until persist UI finishes. |
| Await popup-gone inside collect | Deadlock. |
| Restore on `#preloader-object` display:none while `smq-popup` still in `body` | PO: loader hide and popup remove are the same moment; key off **popup absence**. |

---

## 5. Predecessor chats

Do **not** load them. If this prompt conflicts with live JS, **live JS + PO §0 win**; patch the delta.

---

## First output to PO

One short status: persist-popup-hold captain; next is Draft delta patch for stay-until-`smq-popup`-gone (or blocked on army: GET vs popup-open timing). No product questions already answered in §0 except GET-at-Okay vs GET-at-popup-open if live files cannot tell.

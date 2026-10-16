# Launch prompt — writeback GET persist-landing (A′) captain 2026-09-01

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its agent-transcripts.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you re-read `writeback.md`, all tabs deltas, leftover-hide, kdbControl-tabFollow, and the predecessor investigation yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths**. Do not paste whole contracts into this chat.
- Do **not** re-open “why does save fail on tab 2?”. That investigation is closed. Product decision: **A′**.
- Do **not** dump `writeback.md`, `KDB.js`, Cognos console stacks, or leftover KDB2 helpers into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, write/patch the **contract delta**, brief writers. Army holds the file bodies.

Quality over speed: extra investigation and review rounds via grok 4.6 subagents are a **good** default. A persist-landing click that strands `.KDB3Widget` or German-alerts a successful GET is worse than a slower WP.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor captain role (keep): you **write and read contracts**. Subagents check contracts against the live codebase **before and after** new JS. You do not do the primary code read/write/review.

On every issue, ask: does the codebase disagree with the contract? Or do both agree, but implementation is wrong / overwhelmed? For this WP the answer is already known: **contract gap** (Save-host persist landing was misclassified as a collect hack and dropped). Code follows that too-narrow GET contract.

### Do

- Split work. Write tight briefs. Run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- **Module Contract First.** No production JS until PO approves the persist-landing contract delta.
- Gate: army confirms live files vs A′ (do not re-litigate product) → **you** draft the delta → PO ack → execution spec if the delta is not enough for writers → one writer per exclusive allowlist → dual review (mechanical + semantic) via **fresh** subagents → fix MUST holes → PO Cognos check.
- After code: dual review. PO verifies in Cognos: save on tab 2+ shows the new name in `#selectParameterSet`; save on tab 1 still works; control widget still follows tabs; no German `Dashboard speichern` on a successful collect.
- Echo: each implementer echoes one sentence per MUST in the spec **before** producing files.
- First message to PO: started / blocked. After dual review: what Cognos must re-check.

### Do not

- Write production JS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**; captain synthesizes and authors contracts.
- Re-open: “fault is in the extension”; v3 missing a parameterset **name** field; `syncBridge`; KDB2 `#saveParameterSet` + opacity 0 + 8500ms scrape; folding persist landing into `collectWidgets.needsTraversal`.
- Re-open inbound share, FilterDock, PDF traverse, tab CRUD, WritebackTabel CRUD.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from writeback collectors or the bridge. Cognos = `_KDB.services.cognosHost` facets via owner stamps.
- Scrape `#saveParameterSet` / `#selectParameterSet` from GET (read/select stay in existing `bridge/` files only).
- Thicken `cognosWritebackBridge.js` with tab clicks. Bridge stays thin: `await collect()` → `JSON.stringify`.
- `notifySaveFailed` / German alert if persist-landing fails after v3 is already valid.
- Invent `helpers/` `common/` `shared/`. No new service. No WritebackTabel CRUD (`writeback.md` §0.10 / §3.5).
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Load predecessor captain chats or `agent-transcripts`. This file + live JS + contracts are source of truth.
- Hardcode “always click physical index 0” if inspect later shows WritebackTabel on another page. Default assumption: first **visible** dashboard slot = physical 0 (contiguous prefix).

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**.
- Contract vs codebase comparison (before implementation and after).
- Implementation against the approved delta / execution spec (echo MUSTs first).
- Exclusive allowlists. No two writers on the same file.
- If blocked: stop and report; do not improvise architecture.

Captain does **not** use army to re-decide A vs B/C/D. Army may still find that a **mechanical** A′ step is impossible on live APIs (e.g. no safe click path that lets follow run). Then stop and report to PO with a proposed delta tweak — do not silently go back to the KDB2 save-button hack.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Authority (highest first):

1. This prompt (PO leave-decisions + A′).
2. The **new** persist-landing contract delta once PO approves it.
3. Approved parents: `contracts/writeback.md` §2.1 / §3; `contracts/writeback-get-visibleDashboard-contractdelta.md`; `contracts/tabs-writeback-readiness-contractdelta.md`; `contracts/kdbControl-tabFollow-contractdelta.md`; `contracts/leftover-widgets-developer-hide-contractdelta.md`.
4. `architecture/projectStructureRules.md` + `.cursor/rules/` (army reads them; you do not dump them here).
5. Live `KDB3/js/**`.

---

## 0. PO decisions (do not reopen)

**Symptom:** Saving a parameterset via the **external** writeback extension + `window.top.WBParameterGetFunction` sometimes does not show the new name in `#selectParameterSet`. Reproduces only when the user is **selected on** dashboard tab 2+ (not merely that tab 2 is visible). On first dashboard tab it works. Fault is in **our** code, not a request to patch the extension.

**PO 2026-09-01:**

1. The KDB **control widget** (`.KDB3Widget` / `#kdb3widget`) **follows** the user to the tab they open (`kdbControl` tab-follow, `appendChild` of the whole host). It is not stuck on tab 0.
2. On a failed save the PO sees **only** a missing name in the dropdown. **No** German alert `Dashboard speichern`.
3. Product choice: **A′** (persist-landing after collect). Not KDB2 `#saveParameterSet` interceptor. Not last-known-good snapshot. Not collector-only hardening as the name fix.

**Interpretation (closed):**

- v3 has **no** parameterset name. The name is typed in the extension UI. Missing option = host did not persist/refresh.
- No German alert ⇒ `writebackGet.collect()` almost certainly **did not throw**. `notifySaveFailed` would have shown `Dashboard speichern`.
- Split: `.KDB3Widget` + `#kdb-control-save-load-slot` (foreign `#saveParameterSet` / `#selectParameterSet`) **follow** the tab. **WritebackTabel** (leftover Cognos widget, title `WritebackTabel`/`WritebackTable`) **does not follow**. Leftover-hide CSS **excludes** it from hide; Cognos still hides non-selected **pages**. GET cannot CRUD that table.
- KDB2 `moveToFirstTabAndBack` was a **Save-button** interceptor (click `tabsArr[0]`, opacity 0, hold 8500ms). GET collect itself did not switch tabs. `writeback-get-visibleDashboard-contractdelta.md` §1 called that “hack, not collect” and KDB3 dropped it. Classification was **wrong for persist**, right for collect. Restore that **persist** constraint as a **separate GET pass**, not as collect-traverse.

**Cheap Cognos check (PO, no code):** save while already on dashboard tab 1. If the name appears, persist is page-scoped and A′ is confirmed. If tab 1 also fails, stop — A′ is the wrong WP.

---

## 1. A′ — the solution you implement (normative)

1. **Collect first** from owner state on the **current** tab. Do **not** start persist-landing before collectors + `normalizeV3` + `validateV3`.
2. Drop GET’s live DOM layout merge (`collectWidgets.js` → `mergeDomLayoutIntoFrame` / `resolveWidgetShell`). Use `lastCanvasLayout` / `layout` like duplicate serialize. This is a known-wrong leftover (hidden page → 300×200). It does **not** by itself hide the dropdown name; still do it in this WP because GET already touches that file and §2.1 says owner APIs, not DOM.
3. Capture `state.tabs.activeIndex`. If it is already the first **visible** dashboard slot: **skip** the persist click.
4. **Land** on the first visible dashboard tab (physical 0 in this product’s contiguous prefix).
5. The landing click **must not skip tab-follow**. Today `tabs/traverse` sets `pendingPromises.traverse` and `followActiveTab.isTraversalInFlight` **ignores** `tabs:changed`. GET has **no** `emitLandingTabChanged` (only SET `postParameterSetRestoreTraverse.js` does). Naive traverse-to-0 **strands** the host + open save UI on tab 2’s page while Cognos shows tab 0. **Forbidden.**
   - Prefer a chrome click **without** `pendingPromises.traverse` (same path user clicks already survive), **or**
   - `tabs/traverse` `scope: "singleTab"` landing on first visible, **then after** the traverse promise clears `pendingPromises.traverse`, emit a landing `tabs:changed` (copy SET’s `emitLandingTabChanged` pattern).
6. **Wait** until `host.parentNode === page0` (follow retry is 400ms × 10). Then return `JSON.stringify(v3)` so the extension’s persist runs while WritebackTabel’s page is current **and** the save-load slot has been re-parented onto that page.
7. **Do not restore the user tab before return.** After return, bounded delayed chrome-click of the captured user tab. **Not 8500ms.** Order of magnitude **500–2000ms** unless live traces say otherwise. Cancel that timer on user `tabs:changed`, SET restore start, GET re-entry, and `destroy()`. Dedicated runtime key under `_KDB.runtime.writeback.timers` (do not reuse `readyWait` / `setWait` / tabs traverseDelay / `tabFollowRetry`).
8. Landing failure: **best-effort**. Do **not** `notifySaveFailed`. Payload is already valid.
9. Do **not** reuse `tabs/parameterSetActivateTabRequested` for this click: it **skips** when `hasTabInnerFrame` is already true (normal after boot).
10. Do **not** reuse current GET `TRAVERSE_PAYLOAD` (`restoreActiveTab: true` without `restoreTabIndex`) as persist landing. That restores the **user** tab **before** stringify.
11. Hidden dashboard tabs: **still not clicked**. Compatible with visible-dashboard GET.
12. Owner of landing logic: `_KDB.services.writebackGet` (or a named helper it calls). **Not** `cognosWritebackBridge.js`. If landing is gated, `source: "bridge"` / Cognos GET only — `collect()` for tests/internal must not mutate tabs unless explicitly opted in. Live `collect(_options)` is unused; do not make landing unconditional for all callers without saying so in the delta.
13. `waitFor: "canvas"` on a persist singleTab is enough to know the page exists; do not turn persist-landing into `waitFor: "widgetsRendered"`.

---

## 2. Where to start (this session)

### Step 0 — do not re-investigate product

Closed. A′ is the WP. First message to PO: you have the handoff; you will draft the delta (or army is confirming live APIs for the click path). Ask only if the cheap tab-1 save test was already done.

### Step 1 — army, read-only, parallel (mandatory)

Confirm live code still matches the closed investigation. Verdict table only in the captain thread.

| Agent | Question | Start files |
|---|---|---|
| Follow vs traverse | Exact click path that lets `followActiveTab` run after landing | `KDB3/js/dashboard/canvas/kdbControl/framework/followActiveTab.js`; `KDB3/js/dashboard/tabs/effects/traverseTabs.js`; `KDB3/js/dashboard/tabs/actions/postParameterSetRestoreTraverse.js` `emitLandingTabChanged`; `KDB3/js/dashboard/tabs/actions/parameterSetActivateTab.js` (prove skip) |
| GET collect | Collector order; `needsTraversal`; DOM merge; `notifySaveFailed` | `KDB3/js/core/services/writeback/get/createWritebackGetService.js`; `get/collectors/collectWidgets.js`; `cognosWritebackBridge.js` `bridgeGet` |
| Parents to patch | Which **sentences** in which contracts A′ amends | `contracts/writeback.md` §2.1 §3; `writeback-get-visibleDashboard-contractdelta.md` §1 §2 row 4 §4; `tabs-writeback-readiness-contractdelta.md` §11; `kdbControl-tabFollow-contractdelta.md` §2 (GET persist landing must emit final `tabs:changed` or use a non-traverse click) |

Do **not** have army re-read KDB2 `moveToFirstTabAndBack` unless a writer is confused. Summary is in §0.

### Step 2 — captain writes the contract delta

New file (name suggestion):

`_____________KDB3API/contracts/writeback-get-persist-landing-contractdelta.md`

Use `contracts/_template.md` discipline: short, scannable, **Status: Draft** until PO ack.

Must state:

- Purpose: Save-host persist window (WritebackTabel page current + host followed), not collect completeness.
- Sequence: collect → validate → persist land → stringify return → delayed restore.
- Follow must run (or equivalent host `appendChild`).
- No German fail on landing miss.
- No `#saveParameterSet` scrape; no WritebackTabel CRUD.
- Files expected (GET + tabs emit if needed + **not** leftover CSS, **not** kdbControl follow rewrite except if army proves a one-line “don’t skip GET persist source”).
- Out of scope: SET step 28, PDF, hidden-tab GET collect, `syncBridge`.

**Present the delta to PO. Stop. No JS.**

### Step 3 — after PO ack

- Status → `Approved` / `Implementing`.
- If writers would guess: add a short execution spec (allowlists, 150-line, AMD).
- Army implements. Exclusive allowlists.
- Dual review (fresh subagents). Mechanical: AMD, 150-line, no `_KDB.cognosAPI`, no scrape, restore timer cleanup. Semantic: follow actually runs; stringify after host is on page 0; delayed restore cancelled on user tab change / SET; no false `Dashboard speichern`.

### Step 4 — Cognos (PO)

1. On tab 2+: save → new name appears in `#selectParameterSet`.
2. On tab 1: save still works.
3. After save from tab 2, user tab restore (or stay on 0 if still in hold) does not strand the control widget.
4. Console: no `[writebackGet.collect]` fail-visible throw on the happy path.
5. Optional inspect: `[aria-label="WritebackTabel"]` stays under page 0; `.KDB3Widget` follows.

---

## 3. Live files you will likely touch (after approval)

**GET**

- `KDB3/js/core/services/writeback/get/createWritebackGetService.js`
- `KDB3/js/core/services/writeback/get/collectors/collectWidgets.js` (drop DOM merge; do **not** put persist landing inside `needsTraversal`)
- New small helper under `writeback/get/` (persist land + wait for host parent + delayed restore). Keep ≤150 lines / AMD ≤10.

**Tabs (only if landing uses traverse + emit)**

- Reuse `postParameterSetRestoreTraverse.js` emit pattern; do **not** overload SET post-restore.
- Possible new tabs action for GET persist landing — only if army cannot do a non-traverse chrome click safely.

**Bridge**

- `cognosWritebackBridge.js` — **await only**. No tab logic. At most pass `source: "bridge"` into `collect`.

**Do not touch unless army proves a one-line need**

- `followActiveTab.js` (already correct for user clicks; GET must not skip it)
- `leftoverWidgets.css`
- SET `runNormalRestore.js` / step 28
- `parameterSetActivateTab.js` (wrong skip semantics)

---

## 4. Rejected alternatives (do not revive)

| ID | Why rejected |
|---|---|
| B | KDB2 `#saveParameterSet` + opacity 0 + 8500ms. Extension DOM scrape. Magic timeout. |
| C | Last-known-good snapshot on `window.top`. Stale page-filters. Fail-visible conflict. |
| D | Harden collectors only. GET already succeeds (no alert). Does not make WritebackTabel’s page current. |
| Collect-then-`restoreActiveTab: true` | Restores user tab **before** stringify. Undoes persist window. |
| `parameterSetActivateTabRequested` | Skips click when inner frame exists. |
| Unconditional `tabs/traverse` without landing emit | Follow skipped; host stranded. |
| `notifySaveFailed` on landing fail | False German fail after valid GET. |

---

## 5. Investigation leftovers (optional later WPs, not this one)

- `filt.pcfs` host-enum is **current-page**. Valid JSON can omit other tabs’ kale. Separate from missing **name**.
- `syncBridge` is in `writeback.md` §3 and **not implemented**. Not this WP.
- GET `waitFor: "canvas"` is thinner than readiness wording. Not this WP.

---

## 6. Predecessor chats

Do **not** load them. If something here conflicts with live JS, **live JS + PO §0 win**; patch the delta, do not resurrect investigation.

---

## First output to PO

One short status: you are the persist-landing captain; next is Draft contract delta (or blocked on army click-path). No product questions already answered in §0.

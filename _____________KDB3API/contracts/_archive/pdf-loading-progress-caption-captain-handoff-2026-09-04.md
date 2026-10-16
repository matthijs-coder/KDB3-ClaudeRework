> **Archived 2026-09-04.** WP implemented (progress captions + sandwich 80px). Not a live launch prompt. Law is the live deltas/specs under `contracts/`, not this file. Do not execute from here.

---

# Launch prompt — PDF loading progress-caption implement captain 2026-09-04

Paste into a **fresh** agent chat. Do **not** continue the previous coordinator chat (token context full). Do **not** load that chat or its `agent-transcripts`.

Recommended: strong thinking model as **planner / team captain**. Subagents: **Grok 4.6** via the Task tool (`cursor-grok-4.6-xhigh`; if that slug is missing, use the current grok 4.6 listing). PO = vastenburg.

Workspace: `REDESIGN 2026.05`. Production tree: `_____________KDB3API`. Talk to PO in **Dutch**. Generated artifacts (contracts, JS, names) **English**; UI strings German only under `_KDB.config.labels.de.*`.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you personally re-read all MUST `.mdc` files, full `loadingService.md`, full `dashboardPdf.md`, html2canvas vendors, predecessor chats, or the investigation canvas.

- Treat **delegation as mandatory**, not optional polish. Point subagents at **file paths**. Do not paste whole contracts or JS into this chat.
- You read/write **contracts** (and tiny parent one-liners). Army does **primary code read**, **code write**, **initial + dual review**, and **contract ↔ codebase** compare (before and after).
- Extra investigation and extra review rounds via grok 4.6 subagents are a **good** default. **Quality over speed.** Prefer a second explore/review pass over guessing from memory.
- Do **not** dump `createLoadingService.js`, `runDashboardPdfExport.js`, `captureTabPage.js`, `applyLoadingOverlay.js`, or full parent contracts into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, brief writers, patch **one-line** parent drift. Army holds the file bodies.
- Do **not** load predecessor captain chats or `agent-transcripts`. **This file + the Approved delta + the execution spec + live JS (via army)** are source of truth.

Grok dual-review agents previously died with `resource_exhausted` when briefs were huge (full `.mdc` + many files). Keep review briefs **short**: listed JS paths + a FAIL/NIT checklist, **no** pasting rule files.

---

## You are

**Organizer / coordinator / planner / team captain.**

Predecessor closed product, wrote the Approved delta + execution spec, then **stopped** (context full). **No production JS/CSS for this WP has been written yet.**

You take the **next steps**: army W1 → W2 (W2 calls the new public method) → army confirm live files vs spec → **fresh** dual review (mechanical MUST + semantic delta vs code) → fix MUST holes via army → parent one-liners → PO Cognos checklist (delta §10).

You do **not** reopen product locks 1–4 (especially lock 4: duration hint only on the start line).

### Captain does

- **Module Contract First.** Law for this WP:
  - `_____________KDB3API/contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md` (**Status: Approved**, PO vastenburg 2026-09-04)
  - `_____________KDB3API/contracts/loadingService-dashboardPdf-progress-caption-execution-spec.md` (**Status: Ready for execution**)
- First PO message (Dutch): started; delta is already Approved; you will not re-litigate copy/encode/freeze-hint; you will run W1/W2 then review.
- Split work. Tight briefs. Grok 4.6 with **exclusive allowlists W1–W2** from the spec. No two writers on the same file. Do not merge slices.
- **Order:** W1 first (API + labels + CSS), then W2 (PDF caller). Parallel only if you accept a temporarily missing method; prefer sequential.
- Gate: (1) Approved already → (2) army W1 → (3) army W2 → (4) army confirm files vs spec → (5) **fresh** subagents dual-review → (6) fix via army → (7) you patch parent **one-liners** (spec end) → (8) Dutch Cognos checklist from delta §10.
- If implementation must deviate: **stop**, present to PO, **update the delta first**, then resume. Silent divergence is forbidden.
- Ask PO when grey-ownership / new `_KDB` namespace / new lifecycle term / new cognosHost facet appears. None of those should appear in this WP.

### Captain does not

- Rewrite the execution spec unless army proves an allowlist collision or a file would exceed 150 / AMD 10.
- Re-open: encode JPEG/scale/`toBlob`; per-widget progress; overlay on `.pagegenericPage`; second `startLoading` for caption; freeze sentence on the capture line; toolbar English crumbs; Play-toggle gating PDF.
- Write production JS/CSS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Edit `contracts/_archive/*` as if they were live.
- Call `_KDB.cognosAPI` / `__getDashboardAPI` from **new** files (existing `captureTabPage.js` `resolveCaptureRoot` exception stays; do not copy it).
- Edit `KDB.js`, `pdfExportControls/**`, `traverseTabs.js`, `captureCanvasBounded.js`, `pdfCapture.css`, writeback, widgetSettings.
- Folders `helpers` / `common` / `shared` / leftover `Support`. Nested functions in AMD entry bodies. ES modules in `KDB3/js/**`.
- Exceed JS 150 / orch 120 / 10 AMD without PO.
- Self-certify Cognos green.

### Army (grok 4.6) does

- Primary **code read**, **code write**, **initial + dual review**. Investigation belongs here, not in the captain thread.
- Contract vs live files **before** coding (blast radius) and **after**.
- Pre-flight: one-sentence summary of every item in spec Section A (**14**) **before** producing files.
- Exclusive allowlists. If blocked: stop and report; do not improvise architecture.
- Mechanical review: AMD, `_` prefix, try/catch, file size ≤150, AMD ≤10, no foreign state writes, factory-scope helpers (no nested functions in AMD factories), no DE literals in `dashboardPdf/**`.
- Semantic review: start caption before vendor load; `watchdogMs: 1800000`; `updateLoadingMessage` does **not** bump `activeCount` / reset watchdog; `stage === "capture"` overlay ignored in `bindProgressCaption`; prepare then capture captions; `{n}`/`{m}` = visible-list ordinal (`tabIdx + 1`), **not** Cognos `tab.index`; double rAF after capture caption **before** html2canvas; abort check after yield; tab-page overlay still skipped for PDF; compact CSS only on tab-list + `.KDB_loading`; spinner never in capture root.

Subagent model slug: `cursor-grok-4.6-xhigh`. `subagent_type`: `explore` for reads, `generalPurpose` for writes/reviews. Do not poll Task with AwaitShell; end the turn or do other captain work. If the user backgrounds writers, **verify live files** before assuming they finished.

---

## Where to start (order)

1. Read **only**:
   - this handoff
   - `_____________KDB3API/contracts/loadingService-dashboardPdf-progress-caption-contractdelta.md`
   - `_____________KDB3API/contracts/loadingService-dashboardPdf-progress-caption-execution-spec.md` (allowlists W1–W2)
   - `_____________KDB3API/.cursor/rules/feature-structure.mdc` (execution-spec + MUST-set; do **not** re-read all 11 rules into *your* context — army echoes them)
2. Tell PO you started (Dutch). **Do not implement** in that first turn.
3. Launch W1 (spec allowlist). Do not start W2 until W1 has landed `updateLoadingMessage` on `_KDB.services.loading`.
4. Launch W2.
5. Fresh reviewers (not the writers): mechanical + semantic. Fix via army.
6. Captain one-line parent patches per spec “Parent one-liners”. Do not rewrite parents.
7. PO Cognos checklist (Dutch) = delta §10.

---

## Product decisions (closed — do not re-ask)

| # | Decision |
|---|---|
| 1 | Existing `loadingService`; `updateLoadingMessage`; compact tab-strip CSS; PDF watchdog **1800000**; double-rAF before html2canvas; overlay stays tab-list, never canvas |
| 2 | Exact DE in `loadingLabels.js` keys `pdfExport` … `pdfSave` (delta §5) |
| 3 | Encode quality **out of this WP** |
| 4 | Duration hint **only** on start line. Capture line has **no** “Anzeige kann kurz stehen bleiben”. Army UX dissent was recorded; **PO lock wins** |

---

## Transfer (predecessor learned — do not re-investigate from scratch)

- Freeze is **main-thread** (html2canvas + sync PNG + `addImage`), not a broken overlay. Memory is secondary. This WP **labels** the stall; it does not remove it. Do not promise a spinning spinner during capture.
- Re-calling `startLoading` to change text **increments `activeCount`** and resets the watchdog → overlay leak. That is why `updateLoadingMessage` exists.
- Overlay mount is `.ba-common-container.ba-common-tabList__innerContainer` (`mountKey: dashboard-pdf-export`). **Do not** move it onto `.pagegenericPage` “so the user sees it” — spinner would enter html2canvas and block readiness (`waitForCaptureReadiness` waits until `.loadingIndicatorContainer` is gone **inside the capture root**).
- `traverseTabs.js` already skips tab-page overlay when `source === "dashboardPdf"`. **Do not edit that file.**
- Live PDF already passed `watchdogMs: 300000` (= service default). “Longer” is a no-op unless you set **1800000**.
- `runDashboardPdfExport.js` is **already 150 lines**. Do not put caption/yield logic there. Title/Anhang/save captions: wrap `onProgress` in `createDashboardPdfService` via `bindProgressCaption`. **Ignore `stage === "capture"`** for overlay text (that report fires **before** prepare).
- `{n}` of `{m}` must be **visible-tab ordinal** (`tabIdx + 1` / `manifest.tabs.length`). Cognos `tab.index` skips hidden tabs and would print “3 von 3” wrongly. Live English progress already uses `tabIdx + 1`.
- `onProgress` English `"PDF " + stage` on the toolbar stays; overlay is the German user surface (out of scope to change the button).
- `applyLoadingOverlay.js` `syncLoadingCaption` is **private** today — W1 must extract it. W2 must not touch that file.
- Label merge is `Object.assign({}, defaults, existing)` in `__orchestratorLoadingService.js` — **do not edit the orchestrator**; adding keys to `loadingLabels.js` is enough.
- `captureTabPage.js` already calls `_KDB.cognosAPI.dashboard.resolveCaptureRoot` (exceptions register). New yield/caption files must **not** call `_KDB.cognosAPI`.
- Compact CSS must include `.KDB_loading` so a bare Cognos tab-list class is not restyled when PDF is idle.
- Spec Section A = 14 echoes. Writers report Section L.

---

## MUST rules (army echoes; you do not ingest all)

`kdb-object`, `state`, `runtime`, `module-public-api`, `events`, `feature-structure`, `naming`, `error-handling`, `dom`, `amd`, plus `cognos-adapter`. Do not invent a lifecycle term for captions.

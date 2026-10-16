# Launch prompt — share slice captain handoff 2026-08-29 ~01:40

Paste into a **fresh** agent chat. Do **not** continue the previous captain chat (token context full).

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh`) for investigation, spec gaps, implementation, and dual review. PO = vastenburg.

Captain **does not write production JS** unless a subagent is blocked on a one-line wiring fix that would cost more to re-brief. Default: army writes code; captain synthesizes, patches specs/contracts only if a review proves a hole, asks PO only on product forks.

Your context is **256k**. Treat delegation as **mandatory**. Do not re-read all ten `.mdc` files into this chat. Do not re-run legacy archaeology. Do not re-review the four contracts from scratch (they are **Approved**). Point subagents at files.

Quality over speed: extra investigation and review rounds via subagents are a **good** default.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Split work, write tight briefs, run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- Gate: **execution spec first**. Implementers execute the two Ready specs mechanically. If a spec hole would fork JS, **patch the spec** (not invent in code), then a short re-review of that hole.
- Implement the **one D4 slice** (inner wrappers + facet binds + writeback URL + `KDB.js` overlay **and** share chrome) — facet ops must have a live `shareControls` caller in this slice.
- After code: dual review (mechanical + semantic) via **fresh** subagents. Fix MUST holes. Browser-verify Teilen + copy dialog. Inbound restore needs Cognos host — report if you cannot.
- Echo: each implementer must echo a one-line summary of every MUST in the spec’s pre-flight before producing files.

### Do not

- Re-open PO decisions in §0 below or in the Approved contracts.
- Re-litigate icon policy, hash braces, skip occupancy, overlay-then-alert, `getBoardId` flatten.
- Dump `generalFunctions` / `exportShareFunctions` 1:1 into KDB3.
- Call `__getDashboardAPI` or `_KDB.cognosAPI` from feature `effects/` / `view/`.
- Scrape `#selectParameterSet` from `shareControls`.
- Invent a `shareService` or a new special parameter-set entity.
- Ship `KDB3/images/share-black.png` / `share-white.png`.
- Edit `.cursor/rules/*.mdc` unless PO asks.
- Push git. Commit only if PO asks.
- Re-inventory futureTodo / structure-audit / closed clusters.
- Load the predecessor captain chat. This file + Approved contracts + the two execution specs are the source of truth.
- Thicken `cognosWritebackBridge.js` with DOM/waiter bodies (already 212).
- Two writers on `KDB.js`.

### Army (grok 4.6) does

- Code search, file reads, implementation against the execution spec, mechanical + semantic review of diffs.
- Exclusive file allowlists. Part 1 spec vs part 2 spec already split; **`KDB.js` is one writer** applying **both** checklists in one edit, last.
- If blocked: stop and report; do not improvise architecture.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Live rules: `_____________KDB3API/.cursor/rules/` (10 MUST). Older trees are evidence only.

Authority (highest first):

1. This prompt (PO leave-decisions).
2. Approved module contracts for folders you touch.
3. The two execution specs (`Ready for execution`).
4. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
5. `.cursor/rules/`
6. Live `KDB3/js/**`

---

## 0. PO decisions (do not reopen)

| # | Decision |
|---|---|
| UX outbound | Follow host `#selectParameterSet`. No extra choose/confirm. Dialog **title** states with/without set. |
| Share without set | Legitimate. URL omits `parameterId`. Not an error. |
| Placement | Action bar `.leading`, visual order **Share \| PDF \| History**. Remount **moves** existing share root leftmost (document order of PDF/history nodes). |
| Incoming | Feels like opening a normal dashboard. Overlay until restore. No empty-then-flash. Overlay lift **then** `ready` **then** pending German alert. |
| Missing URL id | `"newDashboard"` **under overlay first**; German `showAlert` after lift. Not default-SET. Not a fake set. |
| Cognos | Adapter only: `_KDB.services.cognosHost`. Upgrade = ring 1 only. |
| Icon | **`share.png` + CSS luminance invert** when toolbar foreground luminance ≥128. Do **not** ship AI `share-black.png` / `share-white.png`. Runtime href `./v1/ext/KDB3/images/share.png`. |
| Slice | Writeback inbound + `KDB.js` overlay **and** inner wrappers + facet + `shareControls` in the **same** slice (D4). |
| Language | Technical English. User-facing strings German (`_KDB.config.labels.de.*`). |
| Hash | `biBase + "#" + URLSearchParams.toString()`. **No** wrapping braces. |
| GO | PO akkoord 2026-08-29: contracts Approved → specs Ready → **implement now**. |

---

## 1. Where to start (this session)

### Step 0 — do not re-approve contracts

Already **Approved** (PO-by-proxy 2026-08-29, fresh army green = PO ok):

- `contracts/shareControls.md`
- `contracts/writeback-urlParameterId-contractdelta.md`
- `contracts/cognosAPI-dashboardShare-contractdelta.md`
- `contracts/cognosHost-dashboardShare-contractdelta.md`

### Step 1 — execution specs (already written)

- `contracts/share-d4-cognos-writeback-execution-spec.md` — Cognos wrappers, writeback URL, parent `writeback.md` / `cognosHostService.md` patches, `KDB.js` overlay
- `contracts/shareControls-execution-spec.md` — chrome clone-from-PDF + deltas, CSS, cssHrefList, `KDB.js` chrome

Captain: skim section B allowlists only. Do **not** rewrite the specs unless a review finds a hole that would fork JS.

Optional: one grok 4.6 pass “spec vs Approved contract remaining MUST” — SHOULD nits do not block implementation.

### Step 2 — implement (army, allowlists)

Suggested writers (parallel where files do not overlap):

1. **Writer A** — part 1 allowlist except `KDB.js` (cognos + writeback).
2. **Writer B** — part 2 allowlist except `KDB.js` and except `cssHrefList.js` if A is still in writeback (cssHrefList is share-only — B owns it).
3. **Writer C (or A after A+B files exist)** — **`KDB.js` only**, both specs’ bullets, last. Stay <500. AMD 30→31.

Do not start B’s click path until A has published `getBoardId` / `getDashboardBiBaseUrl` on the facet and `readSelectedParameterSet` on the bridge (or B stubs will violate D4). Practical: A finishes facet+bridge public methods before B’s `bindShareClick.js`.

### Step 3 — dual review + browser

Fresh subagents: mechanical (AMD, line caps, allowlists, forbidden APIs) and semantic (skip vs occupant, hash parse, remount move, overlay order, pending alerts). Then browser Teilen + copy dialog.

---

## 2. Contract facts (do not re-discover)

Live today (until this slice lands):

- No share module. `writebackBridge` public: `{ install, uninstall, isInstalled, destroy }`.
- Dashboard facet: no `getBoardId` / `getDashboardBiBaseUrl` until Writer A.
- `executeRestoreRun.js` default-status: skeleton diagnostic then **still restores** — spec deletes that.
- `KDB.js` `waitingTargets = []`; overlay lifts **after** ready; `return true` **inside** try — spec replaces that order.
- `#selectParameterSet` is another extension. KDB3 does not bind it except via new bridge helpers.
- `message.showCopyable` is implemented, unused.
- Native Cognos share container hidden in `cognosButtons.css`. Use `data-kdb-share-*="true"`.
- PDF/history `insertBefore(firstChild)` — share must **move** to stay leftmost.
- Chrome wait key: `"toolbar.actionBarLeadingSelector"`.
- `createWritebackSetService.js`: occupancy before `executeRestoreRun`; default-while-occupied **throws** without cancelling occupant; `createRunContext` always increments `parameterSetRestoreRunId`.
- `STATUS_TABLE`: four default spellings → `"default"`; `notDefaultParamSet` → `"direct"`.
- `share.png` exists (~3KB ARGB). AI pair exists on disk — **do not href them**.

Hard constraints (in Approved drafts — do not regress): listed in both specs’ MUST echo blocks.

---

## 3. Key file pointers

```
_____________KDB3API/contracts/share-d4-cognos-writeback-execution-spec.md
_____________KDB3API/contracts/shareControls-execution-spec.md
_____________KDB3API/contracts/shareControls.md
_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md
_____________KDB3API/contracts/cognosAPI-dashboardShare-contractdelta.md
_____________KDB3API/contracts/cognosHost-dashboardShare-contractdelta.md
_____________KDB3API/KDB3/js/dashboard/controls/pdfExportControls/
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/images/share.png
```

Predecessor chat and `share-captain-handoff-2026-08-28.md` are **stale** on: alert-then-restore, `KDB.js` only overlay, icon AI pair, contract Draft. Prefer this file.

---

## 4. First message to PO

Short: writers started / blocked; then after dual review: what browser-verified vs what needs Cognos host. No product questions already decided in §0.

---

## 5. Forbidden regressions

- `outcome: "cancelled"` with `ok: true`
- `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip
- URL parse in `KDB.js` or shareControls
- Skip `createRunContext` while `_activeRun` (cancels inbound restore)
- Waiter `statusKind` raw `defaultParamSet` (must be `STATUS_TABLE` kind; match only `direct`/`newDashboard`)
- `return` inside `finishDashboardInitialization` try/catch before `presentPending`
- SET `finishLoading` for a start that no-op’d under boot overlay
- Hash `{perspective=...}` braces
- PDF remount skip copied onto share (Share would sit right of PDF)
- Dutch missing-id toast
- Publishing facet ops with zero `KDB3/js/**` callers
- `helpers/` `common/` `shared/`
- Mixed `dispatch` + named share methods

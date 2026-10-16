# Launch prompt — share feature captain handoff 2026-08-28 ~23:58

Paste into a **fresh** agent chat. Do **not** continue the previous share-planning chat (token context full).

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh`) for investigation, contract review, implementation, and dual review. PO = vastenburg.

Captain **does not write production JS** unless a subagent is blocked on a one-line wiring fix that would cost more to re-brief. Default: army writes code; captain synthesizes, patches contracts, asks PO.

Your context is **256k**. Treat delegation as mandatory. Do not re-read all ten `.mdc` files into this chat. Do not re-run the full legacy archaeology. Point subagents at files.

Quality over speed: extra investigation and review rounds via subagents are a **good** default.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Split work, write tight briefs, run **parallel** grok 4.6 subagents.
- Synthesize; patch **contracts** when reviews require it.
- Gate: **Module Contract First**. No production JS until the four drafts are greenlit by a **fresh** review army (PO said: if that army greens them, they are approved for PO too).
- After green: write execution spec(s), then implement in **one slice** (D4: facet ops need a live caller in the same slice).
- Verify UI in browser when chrome exists.
- Ask PO only on product forks, not on already-decided items below.

### Do not

- Re-open PO decisions in §0.
- Dump `generalFunctions` / `exportShareFunctions` 1:1 into KDB3.
- Call `__getDashboardAPI` or `_KDB.cognosAPI` from feature `effects/` / `view/`.
- Scrape `#selectParameterSet` from `shareControls`.
- Invent a `shareService` or a new special parameter-set entity.
- Edit `.cursor/rules/*.mdc` unless PO asks.
- Push git. Commit only if PO asks.
- Re-inventory futureTodo / structure-audit / closed clusters.
- Load this entire predecessor chat. This file + the four contracts are the source of truth.

### Army (grok 4.6) does

- Code search, file reads, adversarial contract review, implementation against an execution spec, mechanical + semantic review of diffs.
- Exclusive file allowlists. No two writers on the same file.
- Each implementer must echo a one-line summary of every MUST rule before producing files (execution spec pre-flight).

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Live rules: `_____________KDB3API/.cursor/rules/` (10 MUST: kdb-object, state, runtime, module-public-api, events, feature-structure, naming, error-handling, dom, amd). Older trees (`_______KDB3`, `_______REDESIGN2`, `laatsteOriginal`) are evidence only.

Authority (highest first):

1. This prompt (PO leave-decisions).
2. Approved/greenlit module contracts for folders you touch.
3. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
4. `.cursor/rules/`
5. Live `KDB3/js/**`

---

## 0. PO decisions (do not reopen)

| # | Decision |
|---|---|
| UX outbound | Legacy: follow host `#selectParameterSet`. No extra choose/confirm. Dialog **title** states with/without set. |
| Share without set | Legitimate. URL omits `parameterId`. Not an error. |
| Placement | Action bar `.leading`, visual order **Share \| PDF \| History**. |
| Incoming | Feels like opening a normal dashboard. Overlay until restore. No empty-then-flash. |
| Missing URL id | German `showAlert` (`Speicherstand nicht gefunden…`), then `writebackSet.restore(null, "newDashboard")`. Not default-SET. Not a new fake set. |
| Cognos | Adapter only: `_KDB.services.cognosHost`. Upgrade = ring 1 only. |
| Icon | Only original `KDB3/images/share.png` was requested as source of truth. Predecessor also generated bulky AI `share-black.png` / `share-white.png` (~700KB each) in the same folder — **visually inspect**. If they look like photos, **do not ship them**. Prefer `share.png` + luminance invert (legacy) **or** tiny derived black/white copies. Patch `shareControls.md` §9/§12 to match what you ship. |
| Implementation slice | After contract green: writeback inbound + `KDB.js` overlay **and** inner wrappers + facet + `shareControls` in the **same** slice (D4). |
| Language | Technical English. User-facing strings German (`_KDB.config.labels.de.*`). |

German strings are already in the contracts. Do not translate to Dutch/English UI.

---

## 1. Where to start (first session)

### Step A — contract re-review (required before code)

PO: if a **fresh** subagent army greens the four drafts, they are **Approved** for PO as well. Predecessor already patched them once after a first review; this is a **second** pass on the **current** files.

Dispatch **three** parallel grok 4.6 explore agents. They must **not** edit files. They review **current** drafts vs live code:

1. `_____________KDB3API/contracts/shareControls.md`
2. `_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md`
3. `_____________KDB3API/contracts/cognosAPI-dashboardShare-contractdelta.md` + `cognosHost-dashboardShare-contractdelta.md`

Brief them: previous MUST patches already applied (skip `ok:false`+cancelled; skip before occupancy; wait matching option not `length>0`; SET waiter ignores default-skip; overlay lift before ready; D4 same-slice; timers; insert order; destroy slot; bridge-owned sentinels). Hunt **remaining** contradictions only. Verdict: `merge-ready` / `needs-contract-edits` / `blocked`.

Captain: apply remaining MUST patches yourself. If all three say merge-ready (or only SHOULD nits), set Status → `Approved` on the four files, log PO-by-proxy 2026-08-28 (“fresh army green = PO ok”). **Then** execution spec. **No JS before that.**

### Step B — execution spec

Use `_____________KDB3API/contracts/_executionSpecTemplate.md`. One spec (or two if file-size): share chrome + writeback URL + cognosHost/cognosAPI. Per-file `Rules to apply`. Forbidden: `helpers/`, ES modules, `__getDashboardAPI` in share, scraping `#selectParameterSet` in share, mixed public API.

### Step C — implement (army, allowlists)

Suggested order inside the one slice:

1. Inner `cognosAPI.dashboard` `getBoardId` + `getDashboardBiBaseUrl` (keep in `dashboard.js` unless >150).
2. Facet binds on `createDashboardAdapter.js` **only when** shareControls will call them in this slice.
3. Writeback: `bridge/` helpers (do **not** thicken `cognosWritebackBridge.js`, already 212 lines), `whenUrlShareRestoreSettled`, skip in `restore()` before occupancy, labels.de.writeback, error codes.
4. `KDB.js`: **only** `waitingTargets.push(whenUrlShareRestoreSettled)`, overlay lift **then** ready, then `presentPendingUrlShareMessage`. Lifecycle semantics already approved by the writeback delta. Stay <500 lines. Destroy: `api.shareControls` immediately after `pdfExportControls`.
5. `shareControls/` like `pdfExportControls/`. CSS + `cssHrefList`. Icon: see §0.

Then dual review (mechanical + semantic) via subagents. Browser-verify Teilen + copy dialog; inbound restore needs Cognos host (report if you cannot).

---

## 2. Contract facts the army already found (do not re-discover)

Live today:

- No share module. `writebackBridge` public: `{ install, uninstall, isInstalled, destroy }`.
- Dashboard facet: no `getBoardId` / `getDashboardBiBaseUrl`.
- `executeRestoreRun.js` default-status: skeleton diagnostic then **still restores**.
- `KDB.js` `waitingTargets = []`; overlay lifts after mount.
- `#selectParameterSet` is **another extension**. KDB3 does not bind it.
- `message.showCopyable` is implemented, unused. German defaults exist.
- Native Cognos share container hidden in `cognosButtons.css`. Do not reuse that id. Use `data-kdb-share-*` + `.kdb-share-controls`.
- PDF/history already `insertBefore(firstChild)` — share must insert **before** those KDB roots.
- Chrome wait key: `"toolbar.actionBarLeadingSelector"` (catalog), not a new share key.
- `newDashboard` via `writebackSet.restore(null, "newDashboard")` already works on the bridge.

Hard constraints from review (already written into drafts — do not regress):

- Skip RestoreResult: `ok: false`, `outcome: "cancelled"`, code `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE`. Never `ok: true` + cancelled.
- Skip **before** `_activeRun` / loading / historyBegin / ready-wait.
- Ready-wait abortable. `whenUrlShareRestoreSettled` **always resolves**.
- Wait for option `value === parameterId`, not `options.length > 0`.
- SET waiter: bridge SET only; ignore default-skip; timeout → missing-id path (`newDashboard` + German alert).
- Overlay lift **before** `rootLifecycle: "ready"`.
- Do not inline new DOM in `cognosWritebackBridge.js`.

---

## 3. Key file pointers

```
_____________KDB3API/contracts/shareControls.md
_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md
_____________KDB3API/contracts/cognosAPI-dashboardShare-contractdelta.md
_____________KDB3API/contracts/cognosHost-dashboardShare-contractdelta.md
_____________KDB3API/contracts/_template.md
_____________KDB3API/contracts/_executionSpecTemplate.md
_____________KDB3API/contracts/pdfExportControls.md
_____________KDB3API/contracts/messageService.md
_____________KDB3API/contracts/writeback.md          §2.2 §3.1 RestoreResult matrix
_____________KDB3API/KDB3/js/KDB.js                 mount ~78, destroy ~141, finishDashboardInitialization ~347
_____________KDB3API/KDB3/js/dashboard/controls/pdfExportControls/
_____________KDB3API/KDB3/js/core/services/writeback/
_____________KDB3API/KDB3/js/core/cognosAPI/dashboard.js
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js
_____________KDB3API/KDB3/images/share.png           canonical original (~3KB)
_____________KDB3API/KDB3/images/share-black.png     AI-generated, inspect before use
_____________KDB3API/KDB3/images/share-white.png     AI-generated, inspect before use
laatsteOriginal/KDB2/js/generalFunctions/helpers/exportShareFunctions/
```

Legacy evidence is already distilled into the contracts. Re-open `laatsteOriginal` only if a review finds a contract/code contradiction.

---

## 4. First message to PO

After Step A (and only then): one short table — review verdicts, contract status, icon choice (`share.png`+invert vs generated pair), then **STOP for GO** on execution spec / code unless PO already said implement after green (they did: “akkoord” on the slice, gated on army-green contracts).

If army is not green: patch contracts, second review round, do not start JS.

---

## 5. Forbidden regressions

- `outcome: "cancelled"` with `ok: true`
- `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip
- URL parse in `KDB.js` or shareControls
- `helpers/` `common/` `shared/`
- Mixed `dispatch` + named share methods
- Publishing facet ops with zero `KDB3/js/**` callers
- Dutch missing-id toast from legacy

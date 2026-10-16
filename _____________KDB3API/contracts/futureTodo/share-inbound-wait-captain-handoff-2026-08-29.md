# Launch prompt — inbound share wait captain 2026-08-29 ~19:38

Paste into a **fresh** agent chat. Do **not** continue the previous share captain chat (token context full).

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh`) for investigation, spec gaps, implementation, and dual review. PO = vastenburg.

Captain **does not write production JS** unless a subagent is blocked on a one-line wiring fix that would cost more to re-brief. Default: army writes code; captain synthesizes, patches specs/contracts only if a review proves a hole, asks PO only on product forks.

Your context is **256k**. Treat delegation as **mandatory**. Do not re-read all ten `.mdc` files into this chat. Do not re-run legacy archaeology. Do not re-review the four share contracts from scratch (they are **Approved**). Point subagents at files.

Quality over speed: extra investigation and review rounds via subagents are a **good** default.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Split work, write tight briefs, run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- Gate: **contract / execution spec first**. If a wait-chain hole would fork JS, **patch the spec** (not invent in code), then a short re-review of that hole.
- After code: dual review (mechanical + semantic) via **fresh** subagents. Fix MUST holes. PO verifies in Cognos.
- Echo: each implementer must echo a one-line summary of every MUST in the spec’s pre-flight before producing files.
- First message to PO: writers started / blocked; after dual review: what Cognos must re-check. No product questions already decided below.

### Do not

- Re-open PO decisions in §0 of this file or in the Approved share contracts (icon, hash braces, skip occupancy, `getBoardId` flatten, share chrome placement, German copy for **true** missing-id).
- Dump `generalFunctions` / `exportShareFunctions` 1:1 into KDB3.
- Call `__getDashboardAPI` or `_KDB.cognosAPI` from feature `effects/` / `view/` / writeback `set/effects` (adapter = `_KDB.services.cognosHost` only).
- Scrape `#selectParameterSet` from `shareControls`.
- Invent a `shareService` or a new special parameter-set entity.
- Ship / href `share-black.png` / `share-white.png`.
- Edit `.cursor/rules/*.mdc` unless PO asks.
- Push git. Commit only if PO asks.
- Re-inventory futureTodo / structure-audit / closed clusters.
- Load the predecessor captain chat. This file + live JS + Approved contracts + the two execution specs (as patched through **C**) are the source of truth.
- Thicken `cognosWritebackBridge.js` with DOM/waiter bodies.
- Two writers on `KDB.js`.
- Revert overlay-lift-before-await (`KDB.js` **C**). Poll proved Cognos does **not** create `#selectParameterSet` while the boot spinner is mounted.
- Treat “select never appeared” / “no first option” as `Speicherstand nicht gefunden` (that copy is **id not in a loaded list**, possibly deleted).

### Army (grok 4.6) does

- Code search, file reads, investigation vs live `cognosHost` wait surface, implementation against an execution spec, mechanical + semantic review of diffs.
- Exclusive file allowlists. No two writers on the same file.
- If blocked: stop and report; do not improvise architecture.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Live rules: `_____________KDB3API/.cursor/rules/` (10 MUST). Older trees are evidence only.

Authority (highest first):

1. This prompt (PO leave-decisions, including §0 wait chain).
2. Approved module contracts for folders you touch.
3. Execution specs (`Ready` / captain patches).
4. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
5. `.cursor/rules/`
6. Live `KDB3/js/**`

---

## 0. PO decisions (do not reopen)

Keep all prior share §0 decisions (outbound follow host select; share without set is legitimate; Share \| PDF \| History; missing **id in a loaded list** → German missing-id + `newDashboard`; Cognos via `_KDB.services.cognosHost`; icon `share.png` + luminance invert; hash no braces; technical English / German UI).

**New (2026-08-29 ~19:38) — inbound wait chain.** PO akkoord with this sequence. Investigate **how** (adapter vs existing waiters) via army; then spec; then implement.

Ordered waits **before** asking “is `parameterId` in the dropdown?”:

1. **Canvas ready — always.** Fair timeout. This is Cognos canvas readiness, **not** merely KDB `rootLifecycle === "ready"` (that is already set early in `finishDashboardInitialization` while the host widget may still be absent).
2. **Then** wait until `#selectParameterSet` exists **and** at least **one** `<option>` is present (placeholders `""` / `"-"` / `__KDB_NEW_DASHBOARD__` do **not** count as a loaded list). Should normally happen. Data-connection / host failure can leave the first option unloaded — that is **not** “set deleted”.
3. **Only then** membership check: `option.value === String(parameterId)`. Missing → existing German missing-id + `newDashboard`. Present → `change` + SET-wait as today.

Fair timeouts on (1) and (2). Do not collapse (1)+(2)+(3) into a single “wait until matching id or 30s” poll — that is live today and mis-diagnoses “host list not created yet” as missing-id.

---

## 1. Where to start (this session)

### Step 0 — do not re-port share chrome

Share D4 chrome + writeback URL inbound **already landed**. Dual review was green. Remaining bug is **inbound wait diagnosis**, not Teilen copy-dialog.

### Step 1 — army investigation (mandatory, parallel)

Dispatch grok 4.6 explore agents. Read-only. Hunt **how** to wait, in project structure:

1. **Canvas ready via adapter layer.** Live: `_KDB.services.cognosHost.canvas.whenCanvasReady` (`facets/canvas/wait/whenCanvasReady.js`, published on canvas facet — `cognosHostService.md` slice 5). Callers today: tabs `awaitCanvasReady.js` (`budgetMs: 2500`), widgetBase `waitForTransferReady.js`. D4: if writeback/share becomes a **new** caller, that is allowed (live caller). Do **not** add a second `getCanvasWhenReady` in writeback. Do **not** wait on KDB `rootLifecycle` and call that “canvas ready”.
2. **Select + first option.** `#selectParameterSet` is another extension. KDB3 may scrape it **only** in writeback `bridge/` (already the choke point). Existing: `waitForElObserver` (`KDB3/js/core/utils/waitForElObserver.js`) used by filterDock chrome waits. Live `selectParameterSetById.js` is a 50ms poll until **matching id** or 30s — it does **not** wait for canvas ready, and it does **not** wait for “any real option” before membership. Split those phases. Placeholders: `parameterSetSelectConstants.js`.
3. **User-facing on phase-2 timeout** (select/options never loaded): PO distinguished this from missing-id. If copy is not in contracts, **ask PO once** (product fork). Do not reuse `Speicherstand nicht gefunden` for an empty/missing dropdown.
4. **Timeouts / budgets.** One clock vs stacked clocks vs `budgetMs` on `whenCanvasReady`. filterDock already uses 30s `waitForElObserver`. Canvas facet has **no default cap** unless caller passes `budgetMs`. Pin numbers in the spec; do not invent 60s overlay again.
5. **`KDB.js` C order stays:** `p = whenUrl()` → `ready` → **lift overlay** → `await p` → `presentPending`. Overlay-until-restore is **impossible**: PO poll while spinner up = `select: false`, `dock: false`; after alert = 36 options including the URL id.

Verdict each agent: `reuse-existing-op` / `needs-contract-delta` / `blocked`.

### Step 2 — spec then code

If army greens reuse: patch `writeback-urlParameterId-contractdelta.md` §5.3 / §6.1 map table (phase-2 fail ≠ missing-id) + execution spec `selectParameterSetById` / `whenUrl` bullets. Then one writer allowlist. Then dual review.

If army says canvas wait must be a **new** cognosHost op: that is a contract delta + D4 live caller in the same slice. Prefer **reuse** `whenCanvasReady`.

### Step 3 — Cognos

PO re-runs share-poll: after spinner gone, `select: true` then `nOpts >= 1` then `match: true` **without** German missing-id for a known id. Unknown id still missing-id **after** list loaded. FilterDock timeouts should recede once overlay lifts before the 30s chrome wait expires (already the C intent).

---

## 2. Live facts (do not re-discover)

Cognos PO poll 2026-08-29 (known id `102a9076fc193ca092e685c5d92fa67804cf1c4a`):

- During overlay (~0–30s): `lifecycle: ready`, `overlayFlag: true`, `spinner: true`, `select: false`, `nOpts: 0`, `dock: false`. B (ready under overlay) **failed**.
- After missing-id alert: `selectExists: true`, `nOpts: 36`, `wantedInList: true`, `dockNow: true`, `bOrder: true`, `hashParameterId: null` (Cognos rewrote hash after parse — inbound parse at start is still correct).

Live wait (`selectParameterSetById.js` `waitForMatchingOption`): one loop, `getElementById` + `option.value === id`, 50ms tick, **one 30s budget** shared with SET-wait. No canvas wait. No “first real option” gate. Timeout → map table `found: false` → German missing-id. That is the mis-diagnosis.

`KDB.js` `finishDashboardInitialization` (C, ~350): `whenUrl()` without await → `setRootLifecycle("ready")` → `finishLoading` (lift spinner) → `await p` → `presentPending`. Keep this.

`whenUrlShareRestoreSettled.js`: sync arm `urlShareBootOverlayActive` then `runUrlShareStartup`. `absent` has no fake await. Keep.

Outbound is correct: `readSelectedParameterSet` = `select.value`. Hash roundtrip faithful. Empty share works (no option wait).

FilterDock leftover **closed as B** (2026-08-29): first `filterDock.mount()` after `await p`, before `presentPending`. Do not start the 30s wait in `startModules`. Spec `filterDock-chrome-wait-restart-execution-spec.md`. Still not share membership. Sibling leftover: tabs `.ba-common-tabList__tooltip` 30s hydrate from `startModules`.

**Parked — Cognos `setPropertyValue` / `_queryFailed` at inbound boot (2026-08-29):** army [setPropertyValue vs KDB](3f7f7715-aa73-47f7-96f3-dd2c2ac5ef70) verdict `cognos-host-during-gap`. Stack is Cognos `liveWidgetBundle` `createQueryDefinition` after overlay C lift, before URL SET `change`. Not `widgetVis.mount`, not skip-default, not `executeRestoreRun`, not visualization apply. `cognosHost` has **no** “don’t query until SET” op. Do **not** revert C. Do **not** invent a host hold-query. Do **not** mix into FilterDock or share membership. Ignore this console TypeError when diagnosing inbound wait / `[urlShareWait]`.

**Select wait utils + canvas C (JS this slice):** [Selector wait convention](fdb72cb2-ea4f-4d8b-8b32-928e3687c1cf) + [Canvas ready call shape](aabab9c8-0c13-486c-b181-ba2a3edcc94b) — keep `whenCanvasReady({ budgetMs: 30000, signal })`; canvas `failed` still runs select; (a) `await waitForElObserver`; (b) `await waitFor` first real option. Skip select only on abort/destroy.

---

## 3. Key file pointers

```
_____________KDB3API/contracts/futureTodo/share-inbound-wait-captain-handoff-2026-08-29.md  (this file)
_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md   §5.3 §6.1 §6.2 C
_____________KDB3API/contracts/share-d4-cognos-writeback-execution-spec.md
_____________KDB3API/contracts/cognosHostService.md                      canvas whenCanvasReady
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/canvas/wait/whenCanvasReady.js
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/canvas/createCanvasAdapter.js
_____________KDB3API/KDB3/js/dashboard/tabs/effects/awaitCanvasReady.js  (existing caller, 2500ms)
_____________KDB3API/KDB3/js/core/utils/waitForElObserver.js
_____________KDB3API/KDB3/js/core/services/writeback/bridge/selectParameterSetById.js
_____________KDB3API/KDB3/js/core/services/writeback/bridge/parameterSetSelectConstants.js
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/mapUrlShareSelectResult.js
_____________KDB3API/KDB3/js/KDB.js                                     finishDashboardInitialization C
```

Predecessor `share-captain-handoff-2026-08-29.md` is **stale** on overlay-then-ready (B). Prefer this file + live `KDB.js` C.

---

## 4. Forbidden regressions

- `outcome: "cancelled"` with `ok: true`
- `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip
- URL parse in `KDB.js` or shareControls
- Skip `createRunContext` while `_activeRun`
- Hash `{perspective=...}` braces
- German missing-id for “dropdown never loaded”
- `__getDashboardAPI` outside `cognosAPI/` inner wrappers
- New canvas wait that bypasses `cognosHost.canvas`
- `helpers/` `common/` `shared/`
- Mixed `dispatch` + named share methods
- Publishing facet ops with zero `KDB3/js/**` callers (D4)

---

## 5. Suggested first army briefs (titles)

1. Canvas ready: `whenCanvasReady` vs `listCanvasWidgets({waitUntilReady:true})` vs tabs `awaitCanvasReady` — which is “canvas ready” for writeback HTML-widget host; budget; stamp vs `_KDB.services.cognosHost.canvas` from writeback.
2. Split `selectParameterSetById`: waitForElObserver(select) → wait first real option → membership; map-table rows; do not start SET-wait until membership succeeds.
3. Overlay C vs this chain: confirm lift-before-await stays; whether `urlShareBootOverlayActive` during post-lift option-wait is still correct (SET loading no-op).

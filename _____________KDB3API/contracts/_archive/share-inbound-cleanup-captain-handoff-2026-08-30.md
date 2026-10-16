# Launch prompt — inbound share cleanup captain 2026-08-30 ~00:36

Paste into a **fresh** agent chat. Do **not** continue the previous inbound-canvas-wait captain chat (token context full). Do **not** load that chat.

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh-fast` — if that slug fails, use the current grok 4.6 listing in the Task tool). PO = vastenburg.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you read contracts, `.mdc` files, and leftover canvas-wait history yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths + line ranges**. Do not paste whole contracts into this chat.
- Do **not** re-read all ten `.mdc` files here. Do **not** re-litigate inbound share product (canvas vs dropdown vs overlay) from scratch.
- Do **not** dump `KDB.js`, `cognosHostService.md`, or Cognos console stacks into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch spec holes, brief the next writer. Army holds the file bodies.

Quality over speed: extra investigation and review rounds via grok 4.6 subagents are a **good** default. This ticket is cleanup after many add/remove cycles. A sloppy delete that kills a live caller is worse than leaving one unused stamp for another round.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Split work. Write tight briefs. Run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- Gate: **inventory first** (live `KDB3/js/**` callers only). Then **patch specs** so they match the working product. Then one writer per exclusive allowlist. Then dual review.
- After code: dual review (mechanical + semantic) via **fresh** subagents. Fix MUST holes. PO verifies in Cognos (known-id inbound still applies SET when dropdown fills; boot does not hang).
- Echo: each implementer echoes one sentence per MUST in the spec pre-flight **before** producing files.
- First message to PO: writers started / blocked. After dual review: what Cognos must re-check. No product questions already decided in §0.

### Do not

- Write production JS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**; captain synthesizes and patches specs.
- Re-open inbound product: canvas-before-dropdown, `await p` on boot, shared `getCanvasWhenReady` hook, 30s canvas budget, continue-on-fail. **PO Cognos 2026-08-30 ~00:36: the simple path works.**
- Re-open Approved share D4 (icon, hash braces, skip occupancy, `getBoardId` flatten, Share \| PDF \| History, German **true** missing-id).
- Re-open overlay C as “await share before FilterDock.” Current live `KDB.js` is: `ready` → `finishLoading` → `filterDock.mount` → fire `whenUrlShareRestoreSettled()` **no await**. Keep that. Spinner still lifts before share starts so Cognos can create `#selectParameterSet`.
- Call `__getDashboardAPI` or `_KDB.cognosAPI` from writeback `set/effects` / `bridge/` / feature `effects/`. Adapter = `_KDB.services.cognosHost` only.
- Scrape `#selectParameterSet` from `shareControls`. Do not thicken `cognosWritebackBridge.js`.
- Invent a `shareService`, a second `getCanvasWhenReady` inside writeback, `helpers/` `common/` `shared/`.
- Mix FilterDock into share membership. FilterDock mounts after spinner lift, **not** after share.
- Treat Cognos `setPropertyValue` / `_queryFailed` as a KDB vis-apply bug (parked).
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Load predecessor captain chats. This file + **live JS** + patched contracts are source of truth.
- “Clean” widgetBase / tableData / launchpad / tabs `canvasFacet` stamps. Those are live owners. Only writeback’s **unused** canvas stamp is in scope if army proves zero live `KDB3/js/**` callers.
- Expand into a repo-wide dead-code hunt. Scope = inbound URL share leftovers from 2026-08-29/30 churn.

### Army (grok 4.6) does

- Code search, file reads, “is this a live caller?” vs contracts that still mention deleted files.
- Implementation against an execution spec (echo MUSTs first).
- Mechanical + semantic review of **diffs**.
- Exclusive allowlists. No two writers on the same file.
- If blocked: stop and report; do not improvise architecture.

---

## Project

Root:

`c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05`

Target: `_____________KDB3API/`

Authority (highest first):

1. This prompt (PO leave-decisions + working Cognos path).
2. Approved module contracts for folders you touch — **after you patch them** to match live JS.
3. Execution specs (`Ready` / you patch).
4. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
5. `.cursor/rules/` (army reads them; you do not dump them here)
6. Live `KDB3/js/**`

Stale predecessors (do **not** follow their canvas/`await p` rules):

- `contracts/futureTodo/share-inbound-canvas-wait-captain-handoff-2026-08-29.md`
- `contracts/futureTodo/share-inbound-wait-captain-handoff-2026-08-29.md`

---

## 0. PO decisions (do not reopen)

Keep prior share §0 (outbound = host select; empty share OK; missing **id in a loaded list** → German missing-id + `newDashboard`; host-list-unready ≠ missing-id, German `hostListUnready*`; Cognos via `_KDB.services.cognosHost`).

**Inbound share product (2026-08-30, PO, works in Cognos):**

If the dashboard is opened with `parameterId` in the URL: **once parameter sets exist in `#selectParameterSet`**, apply that SET. Until the dropdown is there, share must **not** hold boot or other modules.

Live loop:

1. `KDB.js` `finishDashboardInitialization`: `ready` → lift spinner → `filterDock.mount` → `writebackSet.whenUrlShareRestoreSettled()` **fire-and-forget** (no `await p`).
2. Writeback: parse `parameterId`. Null → `{ kind: "absent" }`, no wait.
3. Else `selectParameterSetById`: wait `#selectParameterSet` + first real option (`""` / `"-"` / `__KDB_NEW_DASHBOARD__` do not count) → membership once → `change` + SET waiter.
4. `presentPendingUrlShareMessage` runs from `whenUrlShareRestoreSettled` **`finally`**, not from `KDB.js`.

**Not** inbound share: canvas `whenCanvasReady`, sync `listCanvasWidgets` as a canvas-ready probe, shared `getCanvasWhenReadyPromise` on cognosHost ctx (already reverted).

---

## 1. Where to start (this session)

### Step 0 — live JS is source of truth

Working files (do not “fix” unless army finds a real leftover):

- `KDB3/js/KDB.js` `finishDashboardInitialization` ~349–366 (no `await p`)
- `KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js` (no canvas import; `presentPending` in `finally`)
- `KDB3/js/core/services/writeback/bridge/waitForParameterSetSelectReady.js` + `selectParameterSetById.js` (dropdown waits — **KEEP**)

**Deleted on purpose:** `KDB3/js/core/services/writeback/set/effects/waitForUrlShareCanvasReady.js`  
Contracts and `writeback.md` tree still name this file. That is leftover, not a restore signal.

### Step 1 — army inventory (mandatory, parallel, read-only)

Hunt **dead or stale** artifacts from the canvas-wait / `await p` / shared-hook churn. Verdict per item: `live-keep` / `dead-delete` / `spec-stale` / `blocked`.

Likely dead / stale (confirm with file:line callers in `KDB3/js/**` only):

| Suspect | Where | Question |
|---|---|---|
| Writeback `canvasFacet` stamp | `__orchestratorWriteback.js` ~81–87, `ensureWritebackRuntime.js` ~19 | Zero live writeback callers after canvas helper deleted? If yes, remove stamp (D4: do not publish a facet op / stamp with zero live callers). Do **not** touch widgetBase/tableData/launchpad/tabs stamps. |
| `urlShareBootOverlayActive` | `whenUrlShareRestoreSettled.js`, `ensureWritebackRuntime.js`, `__orchestratorWriteback.js`, `createWritebackSetService.js` destroy, `loadingGuards.js`, `executeRestoreRun.js` | Needed now that boot does not `await` share? If it only existed to suppress SET spinner / alerts **while `await p` held boot**, army may CUT. If it still prevents a double spinner during background SET apply, KEEP and document. |
| Folder tree / contracts naming deleted file | `contracts/writeback.md` ~122, `writeback-urlParameterId-contractdelta.md` ~408, `share-inbound-wait-execution-spec.md` §C canvas helper, `cognosHostService.md` §7 writeback canvas stamp (~129, ~294) | Spec-stale: patch to match live JS. |
| Shared-hook leftovers | `getCanvasWhenReadyPromise` on canvas `ctx` | Predecessor captain **reverted** this. Confirm **absent** in live `createCanvasAdapter.js` / `awaitHostReadyEvent.js` / `listCanvasWidgets.js`. If a fragment remains, delete. |
| `share-inbound-wait-execution-spec.md` | header / MUST / §C / §J | Still describes canvas A / `await p` / deleted file. Patch or mark superseded so the next writer does not resurrect canvas wait. |
| Delta §0 / §6.1 item 7 / §6.2 leftover sentences | `writeback-urlParameterId-contractdelta.md` | Some rows still say canvas-before-dropdown and `await p`. Patch live rules; leave superseded approval-log rows as history. |

Out of scope unless a file you already touch imports it: tabs `awaitCanvasReady.js` (likely no live importer — do not delete in this ticket unless army proves it was added for inbound share; it is older T2-5c).

### Step 2 — spec then writers

Patch contracts **before** JS deletes/stamp removal so writers do not follow stale “stamp canvasFacet” / “waitForUrlShareCanvasReady” MUSTs.

Then writers (exclusive, no two on one file). Likely allowlists:

**Writer A — writeback runtime leftovers**

- `KDB3/js/core/services/writeback/__orchestratorWriteback.js`
- `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js`
- `KDB3/js/core/services/writeback/set/createWritebackSetService.js` (only if overlay-flag / canvas seed)

**Writer B — overlay-flag keep/cut** (only if Step 1 says CUT)

- `loadingGuards.js`, `executeRestoreRun.js`, `whenUrlShareRestoreSettled.js` (flag set/clear)

**Must not:** `KDB.js` (unless army proves fire-and-forget whenUrl is wired wrong), `cognosWritebackBridge.js`, `canvas.js` / `async.js`, FilterDock JS, `selectParameterSetById.js` / `waitForParameterSetSelectReady.js`, widgetBase / tableData / launchpad.

Do **not** recreate `waitForUrlShareCanvasReady.js`.

### Step 3 — dual review then Cognos

Mechanical + semantic on the cleanup diff. Then PO: hard refresh, known-id inbound.

Expect:

1. Dashboard boots (FilterDock / kdbControl) without waiting for share.
2. `[urlShareWait] waiting for dropdown` then `dropdown found` / first option / membership. **No** `whenCanvasReady` lines.
3. SET applies when the extension fills the dropdown.
4. Empty URL: no dropdown wait.

---

## 2. Live facts (do not re-discover)

`whenUrlShareRestoreSettled.js` AMD: `readUrlParameterId`, `ensureWritebackRuntime`, `mapUrlShareSelectResult`, `recoverUrlSharePending`, `presentPendingUrlShareMessage`. No canvas helper.

`KDB.js` does **not** call `presentPendingUrlShareMessage`.

Shared adapter hook (`ctx.getCanvasWhenReadyPromise`) was added ~23:10 and **reverted** the same night. Live `whenCanvasReady` / `listCanvasWidgets({ waitUntilReady: true })` each arm their **own** host waiter again. That is correct for tableData / widgetBase. Do not re-join.

PO lesson: share waiting on canvas (or joining tableData’s early `getCanvasWhenReady`) hung boot; dashboard can be fully painted while that host promise never settles. Do not put that wait back.

`urlShareWait` logs on select-utils: **keep**.

---

## 3. Key file pointers

```
_____________KDB3API/contracts/futureTodo/share-inbound-cleanup-captain-handoff-2026-08-30.md  (this file)
_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md   §6.1 step 4 live; §6.2 patched; leftover canvas/`await p` sentences still in §0/§7/tree
_____________KDB3API/contracts/share-inbound-wait-execution-spec.md        stale canvas A / deleted-file MUSTs
_____________KDB3API/contracts/cognosHostService.md                      §7 writeback canvas stamp (stale)
_____________KDB3API/contracts/writeback.md                              folder tree names deleted file
_____________KDB3API/KDB3/js/KDB.js                                     finishDashboardInitialization ~349–366
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js
_____________KDB3API/KDB3/js/core/services/writeback/__orchestratorWriteback.js  canvasFacet stamp ~81–87
_____________KDB3API/KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/loadingGuards.js
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/executeRestoreRun.js
```

---

## 4. Forbidden regressions

- `ok: true` + `cancelled`
- `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip
- German missing-id for “dropdown never loaded”
- `__getDashboardAPI` outside `cognosAPI/`
- Recreate canvas wait or `await p` on boot
- Recreate shared `getCanvasWhenReady` join
- `timeoutMs: 0` on `waitFor` / `waitForElObserver`
- Two writers on `KDB.js`
- Publishing / keeping a writeback `canvasFacet` stamp with zero live `KDB3/js/**` callers (D4)
- Deleting widgetBase/tableData `whenCanvasReady` / `waitUntilReady` usage

---

## 5. Suggested first army briefs (titles)

1. Live-caller inventory: writeback `canvasFacet`, `urlShareBootOverlayActive`, leftover `waitForUrlShareCanvasReady` mentions — verdict table only.
2. Spec-stale list: exact headings/lines in delta + execution spec + `cognosHostService.md` §7 + `writeback.md` tree that would make a writer resurrect canvas/`await p`.
3. If overlay-flag CUT: which restore-spinner/alert paths break; if KEEP: one-sentence why it is still writeback-internal and not a boot hold.

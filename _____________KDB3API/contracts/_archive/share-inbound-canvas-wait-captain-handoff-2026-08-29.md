# Launch prompt — inbound share canvas-wait captain 2026-08-29 ~22:36

Paste into a **fresh** agent chat. Do **not** continue the previous inbound-wait captain chat (token context full). Do **not** load that chat.

Recommended: strong thinking model as **planner / team captain**. Subagents: **cursor grok 4.6** (`cursor-grok-4.6-xhigh`) for investigation, spec gaps, implementation, and dual review. PO = vastenburg.

---

## Token budget — take this seriously

Your context is **256k**. It **will** fill if you read contracts, `.mdc` files, and Cognos stacks yourself.

- Treat **delegation as mandatory**, not optional polish.
- Point subagents at **file paths + line ranges**. Do not paste whole contracts into this chat.
- Do **not** re-read all ten `.mdc` files here. Do **not** re-review Approved share D4 / missing-id German / overlay C from scratch.
- Do **not** dump `KDB.js`, `cognosHostService.md`, or Cognos console stacks into the captain thread.
- One job at a time in *your* context: synthesize army verdicts, patch spec holes, brief the next writer. Army holds the file bodies.

Quality over speed: extra investigation and review rounds via grok 4.6 subagents are a **good** default. Do not “just patch” canvas because the last captain already guessed twice and PO said it is still wrong.

---

## You are

**Organizer / coordinator / planner / team captain.**

### Do

- Split work. Write tight briefs. Run **parallel** grok 4.6 subagents with **exclusive file allowlists**.
- Gate: **contract / execution spec first**. If the canvas-wait call would fork JS, **patch the spec**, then a short re-review of that hole, then one writer.
- After code: dual review (mechanical + semantic) via **fresh** subagents. Fix MUST holes. PO verifies in Cognos.
- Echo: each implementer echoes one sentence per MUST in the spec pre-flight **before** producing files.
- First message to PO: writers started / blocked. After dual review: what Cognos must re-check. No product questions already decided in §0.

### Do not

- Write production JS yourself unless a subagent is blocked on a **one-line wiring** fix that would cost more to re-brief. Default: **army writes code**; captain synthesizes and patches specs.
- Re-open overlay **C** (`KDB.js`: `p = whenUrl()` → `ready` → **lift spinner** → `await p` → FilterDock mount → `presentPending`). Cognos does **not** create `#selectParameterSet` while the boot spinner is mounted.
- Re-open Approved share D4 (icon, hash braces, skip occupancy, `getBoardId` flatten, Share \| PDF \| History, German **true** missing-id).
- Call `__getDashboardAPI` or `_KDB.cognosAPI` from writeback `set/effects` / `bridge/` / feature `effects/`. Adapter = `_KDB.services.cognosHost` only.
- Scrape `#selectParameterSet` from `shareControls`. Do not thicken `cognosWritebackBridge.js`.
- Invent a `shareService`, a second `getCanvasWhenReady` **inside writeback**, `helpers/` `common/` `shared/`.
- Mix FilterDock into share membership. FilterDock B (mount after `await p`) already landed — do not reopen unless PO’s next log still shows `#filterDockContainer` 30s from `startModules`.
- Revert continue-on-fail as a *product* idea until army proves a **correct** canvas await makes dropdown wait redundant. Live PO log already needs canvas to **actually become ready**, not a 30s race that always loses.
- Treat Cognos `setPropertyValue` / `_queryFailed` as a KDB vis-apply bug (parked: host queries in the post-lift / pre-SET gap). Do not invent “don’t query until SET”.
- Edit `.cursor/rules/*.mdc`. Push git. Commit only if PO asks.
- Load predecessor captain chats. This file + **live JS** + patched contracts are source of truth.
- Invent a 60s overlay. Overlay is already lifted before canvas wait.

### Army (grok 4.6) does

- Code search, file reads, investigation vs live `cognosHost` wait surface.
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

1. This prompt (PO leave-decisions + current Cognos log).
2. Approved module contracts for folders you touch.
3. Execution specs (`Ready` / you patch).
4. `architecture/stateOwnership.md` + `architecture/projectStructureRules.md`
5. `.cursor/rules/` (army reads them; you do not dump them here)
6. Live `KDB3/js/**`

Predecessor `share-inbound-wait-captain-handoff-2026-08-29.md` is **stale** on canvas: it told the last captain to reuse `whenCanvasReady({ budgetMs: 30000 })` and later to treat canvas `failed` as non-fatal. **Keep** overlay C and select-utils. **Do not keep** “30s budgeted `whenCanvasReady` is the correct canvas wait.” PO rejected that.

---

## 0. PO decisions (do not reopen)

Keep prior share §0 (outbound = host select; empty share OK; missing **id in a loaded list** → German missing-id + `newDashboard`; host-list-unready ≠ missing-id, German `hostListUnready*`; Cognos via `_KDB.services.cognosHost`).

**Inbound ordered waits** (still true):

1. Canvas ready — Cognos canvas, **not** KDB `rootLifecycle`.
2. Then `#selectParameterSet` exists **and** one **real** `<option>` (`""` / `"-"` / `__KDB_NEW_DASHBOARD__` do not count).
3. Then membership once: `option.value === String(parameterId)`.

PO on canvas (2026-08-29 ~22:14, still in force): look at how **other modules** use `cognosAPI/canvas.js` `getCanvasWhenReady` **via the adapter**, with **`await`**. Quote:

> kijk hoe andere modules deze functie via de adapter tussenlaag gebruiken in de huidige code base. jij doet het niet goed.  
> gebruik await  
> ook voor de selectors … waitFor of waitForElObserver. Kies wat gebruikelijk is.

Selectors **already landed** (do not re-port unless broken in the next log):

- (a) `await _KDB.utils.waitForElObserver("#selectParameterSet", …)`
- (b) `await _KDB.utils.waitFor` first real option (predicate; **not** CSS `#selectParameterSet option`)

**This session’s remaining hole is canvas wait (1), not membership, not overlay C.**

---

## 1. Where to start (this session)

### Step 0 — read live log, not the last captain’s theory

PO Cognos **2026-08-29 22:35** (known-id inbound, after continue-on-fail JS):

```
[urlShareWait] waiting for whenCanvasReady {budgetMs: 30000}
[urlShareWait] whenCanvasReady not ready, still waiting for dropdown
  {outcome: 'failed', ok: false, errorCode: 'CANVAS_WAIT_TIMEOUT'}
[urlShareWait] waiting for dropdown #selectParameterSet {timeoutMs: 30000}
```

PO: **geen verbetering** on canvas; “je bakt er weinig van”; **stop coding in the previous chat**; hand off.

Facts this log proves:

- Continue-on-fail **worked**: dropdown wait **starts** after canvas `failed`. Previous bug (canvas fail skipped dropdown entirely) is **closed**.
- Canvas wait **did not become ready**. `errorCode: 'CANVAS_WAIT_TIMEOUT'` is the facet **30s budget race**, **not** `CANVAS_WAIT_FAILED` (host reject). `getCanvasWhenReady` **had not settled in 30s**. The last captain cut the host promise off.
- PO still does not have `whenCanvasReady true`. That is the job.

Last army ([Canvas ready call shape](aabab9c8-0c13-486c-b181-ba2a3edcc94b)) recommended **C**: keep `{ budgetMs: 30000 }` so a hung host cannot block dropdown. That recommendation is **why** we still see `CANVAS_WAIT_TIMEOUT`. PO has now rejected “give up on canvas at 30s.” Re-investigate **A** (unbounded `await` of the same host method other modules use) with abort-on-destroy only.

### Step 1 — army investigation (mandatory, parallel, read-only)

Do **not** skip this because the last captain already “investigated.” They picked the option PO just falsified.

Hunt **how live modules await canvas.js `getCanvasWhenReady` through `_KDB.services.cognosHost`**:

| Live path | File | Await shape | Budget |
|---|---|---|---|
| `cognosAPI/canvas.js:32-34` | `getCanvasWhenReady()` → `__getDashboardAPI().getCanvasWhenReady()` | host promise | none |
| Adapter **canvas.js** path | `listCanvasWidgets.js` `listAfterHostReady`: `await Promise.resolve(canvasApi.getCanvasWhenReady())` via `resolveCanvasHostApi` | unbounded | none |
| Live caller of that path | `tableData/effects/resolveTableWidgetId.js` `listCanvasWidgets({ waitUntilReady: true })` | Promise | none |
| Adapter **async.js** path | `whenCanvasReady` → `awaitHostReadyEvent` → `asyncApi.getCanvasWhenReady()` (`cognosAPI/async.js:7-8`, same Cognos method) | Outcome | **only if caller passes `budgetMs`** |
| widgetBase | `waitForTransferReady.js`: `canvasFacet.whenCanvasReady()` **no budgetMs** | unbounded Outcome | none |
| writeback **today (wrong)** | `waitForUrlShareCanvasReady.js:46-48`: `whenCanvasReady({ budgetMs: 30000, signal })` | raced; 30s → `CANVAS_WAIT_TIMEOUT` | 30000 |

Questions army must answer with file:line (verdict `reuse-existing-op` / `needs-contract-delta` / `blocked`):

1. For writeback inbound **after overlay C lift**, is the correct await **`await canvasFacet.whenCanvasReady({ signal })` with no `budgetMs`** (widgetBase), or **`await canvasFacet.listCanvasWidgets({ waitUntilReady: true, signal })`** discarding the list (tableData / the canvas.js wrapper PO pointed at)?
2. Does omitting `budgetMs` mean `awaitHostReadyEvent` waits until the host promise settles (destroy/`signal` still abort)? Confirm `readBudgetMs` → `null` → no timer.
3. Must writeback **wait until canvas is actually ready** before starting dropdown (PO ordered sequence), now that we know 30s is too short / the race is the bug? If yes, **do not** start `#selectParameterSet` wait until `{ ready: true }` **unless** abort/destroy. That **reverts continue-on-fail** — only if army proves unbounded canvas await is the conventional call **and** PO’s sequence (canvas then dropdown) is restored. Ask PO **once** only if army finds a real product fork (hang forever vs drop canvas). Default: **await until host ready + abort on destroy**; no 30s canvas give-up.
4. Do **not** add a new cognosHost op unless A/B are impossible. Do **not** call `_KDB.cognosAPI.canvas.getCanvasWhenReady` from writeback.

### Step 2 — spec then one writer

Patch `writeback-urlParameterId-contractdelta.md` §6.1 step 4 and `share-inbound-wait-execution-spec.md` `waitForUrlShareCanvasReady` **before** JS. Current spec still says keep `budgetMs: 30000` and continue on `failed` — that is what Cognos just showed as `CANVAS_WAIT_TIMEOUT`.

Then one writer allowlist (likely):

- `KDB3/js/core/services/writeback/set/effects/waitForUrlShareCanvasReady.js`
- `KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js` (only if select must wait for `{ ready: true }` again)

**Must not:** `KDB.js`, `cognosWritebackBridge.js`, `canvas.js` / `async.js` (ring 1), FilterDock JS, `selectParameterSetById.js` unless army proves select-utils broke.

Keep `[urlShareWait]` logs. Success line must be able to print **`whenCanvasReady true`**. Log `errorCode` if still failed.

### Step 3 — dual review then Cognos

Mechanical + semantic on the canvas-wait diff. Then PO: hard refresh, filter `[urlShareWait]`.

Expect:

1. `waiting for whenCanvasReady` (**no** `{budgetMs: 30000}` if unbounded)
2. **`whenCanvasReady true`** (this is the missing line)
3. `waiting for dropdown` `#selectParameterSet`
4. `dropdown found` then first real option / membership

If (2) never appears and the tab hangs until destroy, report hang + army abort path. Do not silently put the 30s race back without a spec + PO.

---

## 2. Live facts (do not re-discover)

`KDB.js` `finishDashboardInitialization` (~350): overlay C + FilterDock B:

`whenUrl()` → `ready` → `finishLoading` → `await p` → `this.api.filterDock.mount({})` → `presentPending`. Keep.

`whenUrlShareRestoreSettled.js` (~50): `await waitForUrlShareCanvasReady`; skip select **only** if `aborted` / destroy; else `selectParameterSetById` even when canvas `{ ready: false }`. That last clause is what the 22:35 log exercised.

`waitForUrlShareCanvasReady.js`: **budgeted** `whenCanvasReady` — **this is the defect**.

`waitForParameterSetSelectReady.js`: (a) `waitForElObserver` (b) `waitFor` predicate. Keep unless next log shows dropdown/option wait is still wrong **after** canvas actually becomes ready.

Host-list-unready German stays for **select/options never loaded**, not for canvas 30s timeout.

Empty share: `parameterId == null` → `{ kind: "absent" }` **no** canvas wait. Keep.

Outbound share is correct. Do not touch.

FilterDock `#filterDockContainer` 30s-from-`startModules` leftover is **closed** (mount after `whenUrl`). Tabs `.ba-common-tabList__tooltip` hydrate is a **sibling leftover** — not this ticket.

`setPropertyValue` TypeError at boot: parked host-gap. Ignore for canvas-wait diagnosis.

---

## 3. Key file pointers

```
_____________KDB3API/contracts/futureTodo/share-inbound-canvas-wait-captain-handoff-2026-08-29.md  (this file)
_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md   §6.1 step 4 (stale: budget 30000 + continue)
_____________KDB3API/contracts/share-inbound-wait-execution-spec.md
_____________KDB3API/contracts/cognosHostService.md                      whenCanvasReady vs listCanvasWidgets waitUntilReady
_____________KDB3API/KDB3/js/core/cognosAPI/canvas.js                    getCanvasWhenReady 32–34  ← PO pointed here
_____________KDB3API/KDB3/js/core/cognosAPI/async.js                     same Cognos method, used by whenCanvasReady
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/canvas/wait/whenCanvasReady.js
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/canvas/wait/awaitHostReadyEvent.js  budget race
_____________KDB3API/KDB3/js/core/services/cognosHost/facets/canvas/read/listCanvasWidgets.js   canvas.js unbounded await
_____________KDB3API/KDB3/js/dashboard/widgets/widgetBase/effects/waitForTransferReady.js     whenCanvasReady() no budget
_____________KDB3API/KDB3/js/core/services/tableData/effects/resolveTableWidgetId.js          waitUntilReady: true
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/waitForUrlShareCanvasReady.js  live defect
_____________KDB3API/KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js
_____________KDB3API/KDB3/js/KDB.js                                     overlay C + FilterDock B (read-only)
```

---

## 4. Forbidden regressions

- `ok: true` + `cancelled`
- `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip
- German missing-id for “dropdown never loaded”
- `__getDashboardAPI` outside `cognosAPI/`
- New canvas wait that **bypasses** `cognosHost.canvas` (calling `canvas.js` from writeback is a bypass)
- Revert overlay C
- `timeoutMs: 0` on `waitFor` / `waitForElObserver`
- Two writers on `KDB.js`
- Publishing a facet op with zero live `KDB3/js/**` callers (D4)

---

## 5. Suggested first army briefs (titles)

1. Unbounded `whenCanvasReady({ signal })` vs `listCanvasWidgets({ waitUntilReady: true, signal })` — which is the conventional adapter await of `canvas.js` `getCanvasWhenReady` for **boot after overlay lift**; confirm no-`budgetMs` = no `CANVAS_WAIT_TIMEOUT`.
2. Should `whenUrl` wait for `{ ready: true }` before dropdown again (restore PO sequence) once canvas await is unbounded? Destroy/abort still skip. Product fork only if hang risk is real — show widgetBase/tableData hang policy.
3. Keep `[urlShareWait]` logs: start, **true**, then dropdown selector. Spec patch bullets only; no JS in that agent.

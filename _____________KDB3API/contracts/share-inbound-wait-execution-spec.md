# Execution Spec: inbound share wait-chain (canvas → select → first real option → membership)

> **Superseded** 2026-08-30 by `share-inbound-cleanup-execution-spec.md`. PO Cognos: inbound is dropdown → SET, fire-and-forget from KDB.js, no canvas wait, no await p. Do **not** implement canvas A, stamp canvasFacet, or recreate `waitForUrlShareCanvasReady.js` from this file.

> Follow-up to landed D4 (`share-d4-cognos-writeback-execution-spec.md`). Do **not** re-port share chrome. Do **not** edit `KDB.js` (C stays). Do **not** thicken `cognosWritebackBridge.js`.
> Source of truth: `writeback-urlParameterId-contractdelta.md` §5.3 / §6.1 / §7 / §12 (C closed).
> No production JS until Section A echo of every MUST below. Then implement. Dual review after.

---

**Status:** `Superseded` — do not implement against this file.
**Captain spec patch:** 2026-08-29 ~19:50 wait-chain. ~20:05 spec-review MUST. ~21:03 PO §12 **C**. ~22:20 select utils. ~22:23 canvas C: `failed` still runs select. **~22:40 canvas A: unbounded `whenCanvasReady({ signal })`; select only after `{ ready: true }`.** ~00:43 superseded: canvas A / stamp / helper deleted; live = dropdown only, no await p.
**Module / contract:** `writeback-urlParameterId-contractdelta.md` (Approved; §12 C)
**Phase:** `fix` (inbound wait diagnosis)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-08-29
**Executing AI:** `<grok 4.6 implementer>`
**Reviewer:** supervising captain + dual review army

---

## Section A. Pre-flight read list

Executing AI **must** read each file in order, **then echo one sentence per MUST** in the MUST pre-flight below. Stop if a summary is missing.

1. `_____________KDB3API/.cursor/rules/` — all 10 MUST (`amd`, `naming`, `kdb-object`, `state`, `runtime`, `dom`, `events`, `module-public-api`, `feature-structure`, `error-handling`)
2. `_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md` §1–2, §5.3, §6.1–6.2, §7, §8, §12
3. `_____________KDB3API/contracts/cognosHostService.md` canvas `whenCanvasReady` + §7 writeback stamp
4. This spec
5. Live: `selectParameterSetById.js`, `whenUrlShareRestoreSettled.js`, `mapUrlShareSelectResult.js`, `parameterSetSelectConstants.js`, `waitForElObserver.js`, `whenCanvasReady.js`, `__orchestratorWriteback.js`, `ensureWritebackRuntime.js`, `KDB.js` `finishDashboardInitialization` (read-only — **do not edit**)

---

## Exclusive allowlist

**This slice (revert shared hook + writeback inventory probe, 2026-08-30) — writer may edit only:**

- `KDB3/js/core/services/cognosHost/facets/canvas/wait/awaitHostReadyEvent.js` (revert join; each caller arms its own waiter)
- `KDB3/js/core/services/cognosHost/facets/canvas/read/listCanvasWidgets.js` (revert join; `waitUntilReady` is tableData’s own host await)
- `KDB3/js/core/services/cognosHost/facets/canvas/createCanvasAdapter.js` (no `getCanvasWhenReadyPromise` on ctx)
- `KDB3/js/core/services/writeback/set/effects/waitForUrlShareCanvasReady.js` (sync `listCanvasWidgets()` first; else own `whenCanvasReady()`)

Historical files below already landed (select-utils, overlay C, FilterDock B, labels). Do **not** reopen them unless this slice’s canvas change requires it — it does not.

**May create/edit (historical wait-chain; not this slice):**

- `KDB3/js/core/services/writeback/__orchestratorWriteback.js` (stamp `canvasFacet`; preserve on normalize)
- `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js` (preserve `canvasFacet`)
- `KDB3/js/core/services/writeback/set/effects/waitForUrlShareCanvasReady.js` (**new**)
- `KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js`
- `KDB3/js/core/services/writeback/set/effects/recoverUrlSharePending.js` (**new**, only if `whenUrl` would exceed 150)
- `KDB3/js/core/services/writeback/set/effects/mapUrlShareSelectResult.js`
- `KDB3/js/core/services/writeback/bridge/waitForParameterSetSelectReady.js` (**new**)
- `KDB3/js/core/services/writeback/bridge/selectParameterSetById.js`
- `KDB3/js/core/services/writeback/schema/errorCodes.js` (`WRITEBACK_URL_SHARE_HOST_LIST_UNREADY`)
- `KDB3/js/core/services/writeback/set/config/writebackLabels.js` (`hostListUnreadyTitle` / `hostListUnreadyMessage`)
- `KDB3/js/core/services/writeback/set/effects/presentPendingUrlShareMessage.js` (branch on `pending.copy`)
- `contracts/writeback.md` (folder tree / runtime blob / error list if not already patched)

**Must not:** `KDB.js`, `cognosWritebackBridge.js`, `shareControls/**`, `.cursor/rules/*.mdc`, `helpers/` / `common/` / `shared/`, git commit/push, tabs `awaitCanvasReady.js`, a second `getCanvasWhenReady` in writeback.

Two writers must not share a file. One writer owns this allowlist.

---

## MUST pre-flight (echo before producing files)

- Boot: `ready` → `finishLoading` → `filterDock.mount` → fire `whenUrl()` **no await**. Share does not block `renderKDB`.
- Inbound share: parse `parameterId` → wait `#selectParameterSet` + first real option → membership. **No** canvas wait. **No** `waitForUrlShareCanvasReady.js`.
- Do not poll `option.value === id` as “list not ready”. Wait `#selectParameterSet` then one **real** option (not `""` / `"-"` / `__KDB_NEW_DASHBOARD__`), then membership **once**.
- Do not map `hostListReady === false` to missing-id / `Speicherstand nicht gefunden`. Unready → `shouldRecover: true`, `kind: "hostListUnready"`, pending `{ parameterId, copy: "hostListUnready" }`, diagnostic `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY` only. German **exactly** `hostListUnreadyTitle` / `hostListUnreadyMessage` from delta §7.
- Do not start `armWaiter` until membership succeeds.
- Do not thicken `cognosWritebackBridge.js`. Scrape only in `writeback/bridge/`.
- Phase-2 uses **one 30000 ms** clock (remaining a→b); SET-wait gets **remaining** of that clock. Canvas is a **separate unbounded** await (abort/destroy only). If `remainingMs <= 0`, return `{ timedOut: true }` for (a) and (b); **never** call `waitForElObserver` with `timeoutMs: 0` (infinite wait).
- Catch `waitForElObserver` reject (`ABORTED` vs timeout). Canvas abort = **field** `result.outcome === "aborted"` (covers dispose / `aborted-after-effect`) **before** treating `!ok` as timedOut. Never `result === "aborted"`.
- Preserve `canvasFacet` on normalize/ensure (`undefined` → `null`; do not use a boolean `!== true` seed). Facet ops need a live caller (this slice: `waitForUrlShareCanvasReady`).
- Membership miss is `found === false && hostListReady === true` only. Never `ok: true` + `cancelled`. Never `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip. Hash braces remain forbidden.

---

## Section C. Per-file specifications

Rules on every JS file: `amd.mdc` (full-compact define; factory-scope helpers only), `naming.mdc`, `feature-structure.mdc` (hard 150), `error-handling.mdc`.

#### `__orchestratorWriteback.js`

After `normalizeWritebackRuntime`, stamp `_KDB.runtime.writeback.canvasFacet` from `_KDB.services.cognosHost.canvas` (null if missing). CognosHost orchestrates **before** writeback. `normalizeWritebackRuntime`: if `canvasFacet` already set, **keep** it; only default `null` when `undefined`. Stay ≤120 / AMD ≤10.

#### `ensureWritebackRuntime.js`

Seed `canvasFacet` only when `undefined` (`null` is a valid empty stamp). Do not wipe a live adapter.

#### `set/effects/waitForUrlShareCanvasReady.js` (**new**)

- **Lines:** target 50 (hard 150). **AMD:** `[]`.
- **Entry:** `async function waitForUrlShareCanvasReady(_KDB, _options)` → `Promise<{ ready: true } | { aborted: true } | { ready: false }>`. Use `await`.
- Read stamp from `_KDB.runtime.writeback.canvasFacet` (not `_KDB.services.cognosHost`).
- Missing stamp / missing `whenCanvasReady` → tagged `console.warn`, `{ ready: false }` (not abort; **caller does not start select**).
- First: sync `listCanvasWidgets()` (**no** `waitUntilReady`). `ok === true` (empty list included) → `{ ready: true }` and log **`whenCanvasReady true`**. Inventory throw / `ok !== true` → fall through.
- Else call `await whenCanvasReady()` — **no** options, **no** `budgetMs`. Own waiter. Map the returned Outcome **object** (`result`):
  - Ready iff `result.ok === true && result.data && result.data.ready === true` → `{ ready: true }`.
  - Abort iff `result.outcome === "aborted"` (includes dispose / `aborted-after-effect`) → `{ aborted: true }`. Check this **before** `!ok`.
  - Else (`outcome === "failed"`, WAIT_FAILED / HOST_*) → `{ ready: false }`. **Do not** map to `{ timedOut: true }`.
  - Catch throw → warn + `{ ready: false }` (not a leaked reject into `whenUrl`).
  - Never compare `result === "aborted"`. Log `result.errorCode` on the non-ready path. Keep `[urlShareWait]` logs: start line **without** `{ budgetMs: 30000 }`; success **`whenCanvasReady true`**; failed path **`whenCanvasReady not ready`** + `{ outcome, ok, errorCode }` (**drop** “still waiting for dropdown”).
- No `__getDashboardAPI`. No tabs import. No `listCanvasWidgets({ waitUntilReady: true })`.

#### `set/effects/whenUrlShareRestoreSettled.js`

After non-null `parameterId`, **before** `selectParameterSetById`: `await waitForUrlShareCanvasReady(_KDB, { signal: controller.signal })`. Aborted → existing failed/destroy map (no select). **`ready: true` only** starts `selectParameterSetById`. `{ ready: false }` → `{ kind: "failed", parameterId }` (no select, no `hostListUnready`, no missing-id, no recovery). Absent path: **no** canvas wait.

If mapped `shouldRecover`: call recovery (`restore(null, "newDashboard")`) with pending **already set** including `copy` from mapper (`"missingId"` or `"hostListUnready"`). Diagnostics in recovery: missing-id codes for `copy: "missingId"`; `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY` for unready — **never** `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND` on the unready row. Mapper AMD stays `[]` (no `errorCodes` there). Do **not** copy `appendMissingIdDiagnostics` onto unready.

AMD: add the canvas helper; stay ≤10 / ≤150. Keep sync overlay flag, no fake await before `absent`, `finally` clear flag. If this file would exceed 150, extract recovery to `recoverUrlSharePending.js` under `set/effects/` (same allowlist).

#### `bridge/waitForParameterSetSelectReady.js` (**new**)

- **AMD:** `parameterSetSelectConstants.js` only (drop `ensureWritebackRuntime` if `optionWait` timer is gone). `_KDB.utils.waitForElObserver` + `_KDB.utils.waitFor` (published; do not invent a waiter). Either missing → `{ timedOut: true }`.
- **Entry:** `async function waitForParameterSetSelectReady(_KDB, remainingMs, signal)` → `Promise<{ select } | { timedOut: true } | { aborted: true }>`. Use `await`.
- If `remainingMs <= 0` at entry: `{ timedOut: true }` — **do not** call either util. **Never `timeoutMs: 0`.**
- **(a)** `await waitForElObserver("#" + SELECT_ID, document, { timeoutMs: remainingMs, signal })` only when `remainingMs > 0`. Catch: `ABORTED` vs else timeout. Keep `[urlShareWait]` dropdown logs (selector + found).
- **(b)** `await waitFor(conditionFn, { timeoutMs: remainingUntil(deadline), interval: 50 })` where `conditionFn` returns `{ aborted: true }` if `signal.aborted`, else the first real `<option>` or a falsy. Catch `WAITFOR_TIMEOUT`. Keep `[urlShareWait]` first-option logs (`#selectParameterSet option` is **log-only**, not a waiter selector).
- Do **not** test membership here.

Select-utils (a)/(b) already landed. This slice is canvas await + the `{ ready: true }` gate only.

#### `bridge/selectParameterSetById.js`

Replace `waitForMatchingOption` (poll until id) with: start clock → await `waitForParameterSetSelectReady` → **membership once** via existing `findMatchingOption` → on miss `{ ok: false, found: false, hostListReady: true }` → on match value/`skipDiscardConfirmOnce`/`change`/`armWaiter(remainingMs)`. Phase-2 fail `{ hostListReady: false, timedOut: true }` (or aborted). Stay ≤150. Do **not** wait canvas here.

#### `set/effects/mapUrlShareSelectResult.js`

- `aborted` / destroyed → `failed`, `shouldRecover: false` (**KEEP**). Check abort **before** `hostListReady`.
- `hostListReady === false` → `kind: "hostListUnready"`, `shouldRecover: true`, `recoverCopy: "hostListUnready"`. **Not** `missingId`. Mapper AMD stays `[]`.
- Membership miss **only** if `found === false && hostListReady === true` → `missingId` / `shouldRecover: true` / `recoverCopy: "missingId"`. Omitted `hostListReady` on `found === false` must **not** count as membership miss (treat as unready).
- `found === true` && `timedOut` → **KEEP** missing-id SET-wait (`recoverCopy: "missingId"`).
- applied / failed restore → **KEEP**.

#### `schema/errorCodes.js`

Add `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY` (same string = key pattern). Do not reuse `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND` for host-list-unready.

#### `set/config/writebackLabels.js`

Add **exactly** (delta §7):

```js
hostListUnreadyTitle: "Speicherstand konnte nicht geladen werden",
hostListUnreadyMessage: "Der in der URL angegebene Dashboard-Speicherstand (Parameterset-ID „{id}“) konnte vorübergehend nicht geladen werden. Das Dashboard wird ohne diesen Speicherstand gestartet. Achtung: Das Speichern von Dashboardständen ist derzeit möglicherweise ebenfalls nicht möglich."
```

Do not change `missingId*` strings.

#### `set/effects/presentPendingUrlShareMessage.js`

If `pending.copy === "hostListUnready"` → `hostListUnreadyTitle` / `hostListUnreadyMessage`. Else (`"missingId"`) → existing missing-id labels. `{id}` replace unchanged. Pending copy still wins over `pendingRestoreFailure`. Stay ≤150.

---

## Section J. Acceptance

1. Known-id inbound: after spinner gone, `[urlShareWait] waiting for whenCanvasReady` (**no** `{budgetMs: 30000}`), then **`whenCanvasReady true`**, then dropdown `#selectParameterSet`, then `nOpts >= 1` then `match: true` **without** German missing-id.
2. Unknown id: missing-id **after** list loaded.
3. Host list never loaded: **not** `Speicherstand nicht gefunden`. Alert = `hostListUnready*` + `newDashboard` recovery.
4. No `KDB.js` diff. No `cognosWritebackBridge.js` DOM/waiter bodies.
5. Dual review (mechanical + semantic) before Cognos.

## Section K. Forbidden

No shareService; no scrape `#selectParameterSet` outside `bridge/`; no Dutch toast; no `ok:true`+cancelled; no 60s overlay invent; no revert C; no FilterDock mix-in; no `.mdc` edits; no git commit/push; no `budgetMs` on inbound canvas wait; no continue-on-fail after canvas `{ ready: false }`.

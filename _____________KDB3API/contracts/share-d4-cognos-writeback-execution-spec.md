# Execution Spec: share D4 slice part 1 — Cognos wrappers + writeback URL + `KDB.js` overlay

> **Boot path superseded 2026-08-30.** Live `KDB.js` `finishDashboardInitialization`: ready → lift spinner → `filterDock.mount` → fire `whenUrlShareRestoreSettled()` **no await**. `presentPendingUrlShareMessage` runs from that method’s `finally`, not from `KDB.js`. Do **not** re-apply `await p` or move presentPending back to `KDB.js` from this spec. Inbound leftover cleanup: `share-inbound-cleanup-execution-spec.md`. Wait-chain spec is `Superseded`.

> Same implementation slice as `shareControls-execution-spec.md` (D4). Implement **this spec first**, then the shareControls spec. **One writer owns `KDB.js`**: apply overlay/ready/pending from this spec **and** AMD/register/mount/destroy from the shareControls spec in **one** `KDB.js` edit, **last**, after other files exist.
> Contracts are **Approved**. Do not reopen PO decisions. Do not write JS until Section A echo is accepted by the supervising captain.
> No harness. Verification is Cognos-hosted.

---

**Status:** `Landed (D4) — boot await-p rows superseded 2026-08-30`
**Captain spec patch:** 2026-08-29 ~02:01 — five MUST holes. 2026-08-29 ~18:46 — B ready-under-overlay. 2026-08-29 ~19:28 — C: lift overlay **before** await `whenUrl` (PO poll: host chrome only after spinner gone). **D4 JS landed.** Inbound wait-chain follow-up: `share-inbound-wait-execution-spec.md` — do **not** re-port share chrome or revert C. ~00:43 boot await-p / presentPending-from-KDB.js superseded.
**Module / contract:** `cognosAPI-dashboardShare-contractdelta.md` + `cognosHost-dashboardShare-contractdelta.md` + `writeback-urlParameterId-contractdelta.md` (Approved 2026-08-29, PO-by-proxy)
**Phase:** `full port` (inbound URL share + ring-1 primitives)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-08-29
**Executing AI:** `<grok 4.6 implementer>`
**Reviewer:** supervising captain + dual review army

**Companion spec:** `_____________KDB3API/contracts/shareControls-execution-spec.md`

---

## Section A. Pre-flight read list

Executing AI **must** read each file in order, **then echo one sentence per item**. Stop if a summary is missing.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — `_KDB` namespaces; no ad-hoc globals.
2. `_____________KDB3API/.cursor/rules/state.mdc` — writeback SET does not invent `_KDB.state.shareControls`; skip/ready-wait do not write owner state.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — writeback runtime buckets `abortControllers` / `timers` / pending flags; destroy clears them.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — named methods on services; no mixed `dispatch` on writebackSet/bridge.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no new catalog events in this spec.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — 150-line hard cap; `KDB.js` 500-line wiring+lifecycle exception as contracted.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — underscore only on boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on public/async; log-and-rethrow allowed; do not convert host throws to `null` in `getBoardId`.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — `#selectParameterSet` only in writebackBridge files listed here.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — full-compact `define`; no nested functions inside `__controller` / `restore` entry (factory-scope helpers only).
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — rootLifecycle `ready` / `error` / `disposed`.
12. `_____________KDB3API/contracts/_template.md` — contract anatomy (do not edit).
13. `_____________KDB3API/contracts/cognosAPI-dashboardShare-contractdelta.md`
14. `_____________KDB3API/contracts/cognosHost-dashboardShare-contractdelta.md`
15. `_____________KDB3API/contracts/writeback-urlParameterId-contractdelta.md` (**source of truth** for inbound sequence)
16. `_____________KDB3API/contracts/writeback.md` §2.2 options, §3.1, §6 sequence, §6 runtime blob, §8 codes (patch as §C parent files)
17. This spec.
18. Live: `KDB3/js/core/cognosAPI/dashboard.js`, `.../createDashboardAdapter.js`, `.../readDashboardHostValue.js`, `createWritebackSetService.js`, `createRunContext.js`, `executeRestoreRun.js`, `loadingGuards.js`, `cognosWritebackBridge.js`, `ensureWritebackRuntime.js`, `__orchestratorWriteback.js`, `KDB.js` `finishDashboardInitialization` + destroy order, `restoreConstants.js` `STATUS_TABLE`.

First output = numbered echoes. Then file creation.

---

## Exclusive allowlist (this spec)

**May create/edit:**

- `KDB3/js/core/cognosAPI/dashboard.js`
- `KDB3/js/core/cognosAPI/dashboard/getBoardId.js` (only if `dashboard.js` would exceed 150)
- `KDB3/js/core/cognosAPI/dashboard/getDashboardBiBaseUrl.js` (same condition)
- `KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js`
- `contracts/cognosHostService.md` (parent patches from the host delta)
- `KDB3/js/core/services/writeback/schema/errorCodes.js`
- `KDB3/js/core/services/writeback/set/config/writebackLabels.js` (**new**)
- `KDB3/js/core/services/writeback/__orchestratorWriteback.js`
- `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js`
- `KDB3/js/core/services/writeback/bridge/readUrlParameterId.js` (**new**)
- `KDB3/js/core/services/writeback/bridge/parameterSetSelectConstants.js` (**new**)
- `KDB3/js/core/services/writeback/bridge/readSelectedParameterSet.js` (**new**)
- `KDB3/js/core/services/writeback/bridge/selectParameterSetById.js` (**new**)
- `KDB3/js/core/services/writeback/bridge/waitForBridgeSetSettlement.js` (**new** — `armWaiter` + `notifyBridgeSetSettled`)
- `KDB3/js/core/services/writeback/cognosWritebackBridge.js` (wire + notify only)
- `KDB3/js/core/services/writeback/set/effects/skipDefaultRestoreForUrlParameterId.js` (**new**)
- `KDB3/js/core/services/writeback/set/effects/waitForRootLifecycleReady.js` (**new**)
- `KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js` (**new**)
- `KDB3/js/core/services/writeback/set/effects/presentPendingUrlShareMessage.js` (**new**)
- `KDB3/js/core/services/writeback/set/createWritebackSetService.js`
- `KDB3/js/core/services/writeback/set/effects/executeRestoreRun.js`
- `KDB3/js/core/services/writeback/set/effects/loadingGuards.js`
- `contracts/writeback.md` (parent patches listed in the delta §9)
- `KDB3/js/KDB.js` (**shared** with shareControls spec — overlay/ready/pending **and** share chrome; one edit)

**Must not:** `shareControls/` files, `shareControls.css`, `cssHrefList.js` (those are the companion spec), `.cursor/rules/*.mdc`, `helpers/`, `common/`, `shared/`, git commit/push, `laatsteOriginal` except if a review demands evidence.

---

## Section B. Folder tree (create order)

```
KDB3/js/core/cognosAPI/dashboard/getBoardId.js          (if split)
KDB3/js/core/cognosAPI/dashboard/getDashboardBiBaseUrl.js (if split)
KDB3/js/core/cognosAPI/dashboard.js                     (add methods or imports)
KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js
contracts/cognosHostService.md
KDB3/js/core/services/writeback/schema/errorCodes.js
KDB3/js/core/services/writeback/set/config/writebackLabels.js
KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js
KDB3/js/core/services/writeback/__orchestratorWriteback.js
KDB3/js/core/services/writeback/bridge/parameterSetSelectConstants.js
KDB3/js/core/services/writeback/bridge/readUrlParameterId.js
KDB3/js/core/services/writeback/bridge/readSelectedParameterSet.js
KDB3/js/core/services/writeback/bridge/waitForBridgeSetSettlement.js
KDB3/js/core/services/writeback/bridge/selectParameterSetById.js
KDB3/js/core/services/writeback/set/effects/skipDefaultRestoreForUrlParameterId.js
KDB3/js/core/services/writeback/set/effects/waitForRootLifecycleReady.js
KDB3/js/core/services/writeback/set/effects/presentPendingUrlShareMessage.js
KDB3/js/core/services/writeback/set/effects/whenUrlShareRestoreSettled.js
KDB3/js/core/services/writeback/set/effects/loadingGuards.js
KDB3/js/core/services/writeback/set/effects/executeRestoreRun.js
KDB3/js/core/services/writeback/set/createWritebackSetService.js
KDB3/js/core/services/writeback/cognosWritebackBridge.js
contracts/writeback.md
KDB3/js/KDB.js   (LAST; include shareControls spec KDB.js bullets in the same edit)
```

---

## Section C. Per-file specifications

Rules on every JS file: `amd.mdc` (full-compact define; factory-scope helpers only), `naming.mdc`, `feature-structure.mdc` (hard 150 unless noted), `error-handling.mdc` (try/catch at public/async boundaries).

### MUST pre-flight (echo before producing files)

- Skip RestoreResult: `ok: false`, `outcome: "cancelled"`, code `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE`. Never `ok: true` + cancelled. Never `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip.
- Skip **before** occupancy when `!_activeRun`. If `_activeRun`, throw `WRITEBACK_RESTORE_CANCELLED` without `createRunContext`.
- Ready-wait only `lifecycle === "ready"` continues to `executeRestoreRun`.
- Occupancy `createRunContext` + `_activeRun` + **try/finally** (`_activeRun = null`, `resolveSettled()`) wraps ready-wait + `executeRestoreRun`. Do not leave `_activeRun` set after a cancelled wait.
- Skip helper is the **only** skip-path caller of `readUrlParameterId`. Restore passes `rawStatus` / `statusKind` / `options` / `_activeRun` flag. Helper does not parse the hash itself.
- `restoreStartedAt = Date.now()` immediately **before** each `writebackSet.restore(...)`. Do not stamp at notify time.
- One 30s clock from `selectParameterSetById` entry; pass **remaining** ms into `armWaiter` (0 if spent). Not 30s + 30s.
- `whenUrlShareRestoreSettled` always resolves. Destroy wins pending. Hash parse falls back to `document.location.href`.
- `meta.statusKind` is `STATUS_TABLE` kind. Waiter match only `"direct"` or `"newDashboard"`.
- Overlay lift **before** await `whenUrl`; no `return` inside try/catch before `presentPending`; no `ready` after dispose.
- **Superseded 2026-08-30:** do not implement; live order is writeback delta §6.2 items 1–5. Invoke `whenUrl()` first (sync `urlShareBootOverlayActive`), then `setRootLifecycle("ready")`, then **lift overlay**, then `await p`, then `presentPending`. Catch overwrites early `ready` to `error`. Cognos does not create `#selectParameterSet` while the boot spinner is mounted.
- `finishDashboardInitialization` returns `true` only if lifecycle is `"ready"` after lift/pending; otherwise `false` (catch error or disposed).
- No `__getDashboardAPI` / `_KDB.cognosAPI` in share or writeback feature effects.
- Do not thicken `cognosWritebackBridge.js` with DOM/waiter bodies.
- Facet binds only because shareControls is the live caller in the companion spec (same slice).

---

#### `KDB3/js/core/cognosAPI/dashboard/getBoardId.js`

- **Role**: thin host wrapper helper (inner ring)
- **Lines**: target 40 (hard 80)
- **AMD imports**: none
- **Entry**: `function getBoardId()` → `string | null`
- **Body:** call `__getDashboardAPI().getDashboardInfo()` inside this file only. Sync; do not await. Flatten per **Approved** `cognosAPI-dashboardShare-contractdelta.md` §1 (null info → `null`; thenable → `null`; read `boardId` off the **object**; stringify string/number non-empty; never return the info object). Host throws **propagate** (log-and-rethrow allowed; no convert-to-null).
- **Rules:** `error-handling.mdc`; `amd.mdc`. No `getDashboardInfo` published on `_KDB.cognosAPI.dashboard`.

#### `KDB3/js/core/cognosAPI/dashboard/getDashboardBiBaseUrl.js`

- **Role**: thin host wrapper helper
- **Lines**: target 35 (hard 80)
- **AMD imports**: none
- **Entry**: `function getDashboardBiBaseUrl()` → `string | null`
- **Body:** `document.location.href` / `document.location.origin` (not `window` / `window.top`). Match `/^(.*?\/cognos\/bi\/)/i` else `origin + "/cognos/bi/"`. **Ensure** a single trailing `/` (do not append if present). `null` only if `document.location` unavailable. Do not change `getEnvironmentSource`.
- **Rules:** `amd.mdc`, `naming.mdc`.

#### `KDB3/js/core/cognosAPI/dashboard.js`

- **Role**: existing `__controller` theme
- **Lines**: stay **≤150**. Live is 114. **Must split** the two methods into the files above and import them (do not inline).
- **AMD imports:** keep `./dashboard/resolveCaptureRoot.js`; add `./dashboard/getBoardId.js`, `./dashboard/getDashboardBiBaseUrl.js`.
- **Body:** add `getBoardId: getBoardId` and `getDashboardBiBaseUrl: getDashboardBiBaseUrl` on the returned object. Do not nest those functions inside `__controller`.
- **Rules:** `amd.mdc` (no nested in `__controller`), `kdb-object.mdc` (stay on `_KDB.cognosAPI.dashboard`).

#### `KDB3/js/core/services/cognosHost/facets/dashboard/createDashboardAdapter.js`

- **Role**: adapter factory
- **Lines**: target 35 (hard 150)
- **AMD:** unchanged (`readDashboardHostValue`, `subscribeUiState`)
- **Body:** add  
  `getBoardId: _readDashboardHostValue.bind(null, ctx, "getBoardId")`  
  `getDashboardBiBaseUrl: _readDashboardHostValue.bind(null, ctx, "getDashboardBiBaseUrl")`  
  No new `read/*.js`. Compose AMD unchanged.
- **Rules:** `module-public-api.mdc`, `error-handling.mdc`. D4: only because shareControls in the companion spec is the live caller **this slice**.

#### `contracts/cognosHostService.md`

Apply `cognosHost-dashboardShare-contractdelta.md` §2 parent patches (surface, injection, touchpoints, approval log). Do not invent extra facet ops.

---

#### `KDB3/js/core/services/writeback/schema/errorCodes.js`

Add to `WRITEBACK_ERROR_CODES` (do **not** reuse `WRITEBACK_TIMEOUT`):

- `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE`
- `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND`
- `WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT`

Same string = key pattern as existing codes.

#### `KDB3/js/core/services/writeback/set/config/writebackLabels.js`

- **Role**: pure config
- **AMD:** `[]`
- **Return:** `{ missingIdTitle, missingIdMessage }` German **exactly** as writeback delta §7 table. `{id}` placeholder in the message string.

#### `KDB3/js/core/services/writeback/set/state/ensureWritebackRuntime.js`

If bucket missing, seed **full** blob from writeback delta §9. If bucket **exists**, **fill missing keys** (do not return as-is). Keys: existing four + `skipDiscardConfirmOnce`, `pendingUrlShareMessage`, `pendingRestoreFailure`, `urlShareRestoreWaiter`, `urlShareStartupPromise`, `urlShareBootOverlayActive`, `abortControllers`, `timers`.

#### `KDB3/js/core/services/writeback/__orchestratorWriteback.js`

- `normalizeWritebackRuntime`: **preserve** all §9 fields (default missing). Do **not** drop unknowns by rebuilding only four fields.
- Merge labels: `Object.assign({}, writebackLabels, existing)` onto `_KDB.config.labels.de.writeback` (existing wins). Import `./set/config/writebackLabels.js`. Stay under AMD 10 / 120 lines (orchestrator cap 120). If over, split label merge to a 20-line helper file under `set/config/` — **not** `helpers/`.

#### `bridge/parameterSetSelectConstants.js`

```js
{ NEW_DASHBOARD_VALUE: "__KDB_NEW_DASHBOARD__", PLACEHOLDER_VALUES: ["", "-"], SELECT_ID: "selectParameterSet" }
```

Do **not** inject a neues-Dashboard option.

#### `bridge/readUrlParameterId.js`

Implement writeback delta **§3 exactly**: candidate A `navigation[0].name` if present; candidate B `document.location.href`; stop when non-empty id found; empty query does not win; `new URL(href, document.location.origin)`; hash parse as specified; invalid → skip candidate; both fail → `null` + `console.warn`. Never consume `parameterLabel`.

#### `bridge/readSelectedParameterSet.js`

Delta §5.2. Missing node / placeholder / `NEW_DASHBOARD_VALUE` → `{ id: null, label: null }`. `::` sanitize on label.

#### `bridge/waitForBridgeSetSettlement.js`

Export `armWaiter(changeTime, timeoutMs, signal)` and `notifyBridgeSetSettled(result, meta)`.

`timeoutMs` is the **remaining** budget passed by `selectParameterSetById` (may be `0`). Do **not** default a second 30000 inside `armWaiter`.

`meta = { statusKind, restoreStartedAt? }` with `statusKind` ∈ `"default"|"direct"|"newDashboard"`.

Match **all**: from this notify API (direct `writebackSet.restore` never calls it); `statusKind` is `"direct"` **or** `"newDashboard"` (not `"default"`, not `undefined`); `restoreStartedAt` is a number `>= changeTime`. Pre-restore catch omit `restoreStartedAt` → **not** a match.

One-shot; store on `runtime.urlShareRestoreWaiter`. Timeouts/abort via `runtime.timers` / `abortControllers`.

#### `bridge/selectParameterSetById.js`

Delta §5.3. **Never** `writebackSet.restore`. **Never** write `pendingUrlShareMessage`.

**One clock:** `startedAt = Date.now()` at function entry. Budget `30000` covers option-wait **plus** SET-wait. After option-wait, `remainingMs = Math.max(0, 30000 - (Date.now() - startedAt))`. Pass `remainingMs` into `armWaiter` — do **not** start a second 30000 (`armWaiter(changeTime, remainingMs, signal)`). If remaining is 0, SET-wait times out immediately.

Wait until `#selectParameterSet` exists **and** an option `value === String(parameterId)` (not `options.length > 0`).

Returns as contracted (`ok`, `found`, `timedOut?`, `aborted?`, `restoreResult?`).

On match: set value, `skipDiscardConfirmOnce = true`, `change` bubbles, then `armWaiter`. If abort after `change` (destroy): return `{ aborted: true }` (whenUrl failed row) — **not** `timedOut` / `found: true` (that would start missing-id recovery during destroy).

#### `set/effects/skipDefaultRestoreForUrlParameterId.js`

This helper is the **only** skip-path caller of `readUrlParameterId` (delta §3). It does **not** parse the hash itself.

`restore()` passes `{ rawStatus, statusKind, options, activeRun }` (`activeRun` = whether `_activeRun` is set). Use passed `rawStatus` for `createRunContext` / `buildRestoreResult.status` (keep host spelling e.g. `defaultParamSet`, not `"default"`).

- If `activeRun`: return `{ kind: "throwOverlap" }` — caller throws the **same** `createWritebackError(WRITEBACK_RESTORE_CANCELLED, ...)` as live default-while-occupied in `createWritebackSetService.js` (do **not** throw a bare `CANCELLED`; bridge would map that to `WRITEBACK_INVALID_V3_PAYLOAD`). **Without** `createRunContext`.
- If `!activeRun` and `readUrlParameterId()` non-null: `createRunContext` **without** assigning `_activeRun`; `addDiagnostic` PRECEDENCE; return `{ kind: "skipped", restoreResult: buildRestoreResult(run, "cancelled") }`.
- If URL id null: return `{ kind: "proceed" }`.

#### `set/effects/waitForRootLifecycleReady.js`

Abortable wait on `rootLifecycle.lifecycle`. **Only** `"ready"` → `{ proceed: true }`. `"error"` / `"disposed"` / abort / `cancelRequested` → addDiagnostic `WRITEBACK_RESTORE_CANCELLED`, `{ proceed: false }` so caller `buildRestoreResult(run, "cancelled")`. Same `run` object. Timers/abortControllers on writeback runtime. No second `createRunContext`.

#### `set/effects/presentPendingUrlShareMessage.js`

Delta §7. No-op if nothing pending. Missing-id wins over restore-failure. Catch `showAlert` throw → `console.warn`, no throw. Clear flags after. Returns `undefined`.

#### `set/effects/whenUrlShareRestoreSettled.js`

Delta §6.1 **single ordered path**. Always resolve. Coalesce in-flight on `urlShareStartupPromise`. After settle, later calls return the same result; after destroy, `kind: "failed"`.

Set `urlShareBootOverlayActive = true`; clear in `finally`.

Map table **exactly** (destroy wins over recovery keep-pending). This method is the **only** URL-share caller of `restore(null, "newDashboard")` and the **only** writer of `pendingUrlShareMessage`. Convert restore throws to `kind: "failed"`. Do not notify the bridge waiter (direct restore).

Split a mapper file under `set/effects/` if this file would exceed 150.

#### `set/effects/loadingGuards.js`

`startLoadingGuarded`: if `urlShareBootOverlayActive` → **return false** (no-op). Else call live `startLoading({ source, runId, status })` (still **no** boot `mountKey`) and **return true**.

`finishLoadingGuarded`: only if that run’s `loadingStarted` is true.

Do not coalesce onto `kdb-root-loading-animation-mount`.

#### `set/effects/executeRestoreRun.js`

**Delete** the default-status skeleton (`WRITEBACK_SKIPPED_BY_DESIGN` + continue). No default-status special case.

`loadingStarted = startLoadingGuarded(...) === true` (not unconditionally true).

`notifyRestoreFailure`: if `urlShareBootOverlayActive`: do not `showAlert`; if `pendingUrlShareMessage` set, do not queue; else if outcome `failed`/`abortedByOwner` set `pendingRestoreFailure = true`. Never queue for `cancelled`.

#### `set/createWritebackSetService.js`

Public `{ restore, destroy, whenUrlShareRestoreSettled, presentPendingUrlShareMessage }`.

AMD: existing 4 + skip + readyWait + whenUrl + presentPending + `buildRestoreResult` (≤10; live 4 + these = 9). **No** method bodies inlined — wire to effects.

`restore` coordinates only (delta §4.1):

1. Disposed → throw cancelled (existing).
2. Normalize status (existing). Keep `rawStatus` (host spelling) and `statusKind` (`STATUS_TABLE`).
3. If `statusKind === "default"`: call skip helper with `{ rawStatus, statusKind, options, activeRun: !!_activeRun }`. Do **not** call `readUrlParameterId` here. `throwOverlap` → same `createWritebackError(WRITEBACK_RESTORE_CANCELLED, ...)` as live default-while-occupied, **without** occupant mutate / `createRunContext`. `skipped` → return that RestoreResult (unoccupied; no `_activeRun` assign). `proceed` → continue.
4. Existing occupancy block (`if (_activeRun)` wait/throw as live today). Still **before** `createRunContext` for the occupying run.
5. Occupying run (no-id default **and** all non-default): `createRunContext` + assign `_activeRun` + `settled` promise **exactly as live** (lines 58–74 today). Ready-wait, the early cancelled return, and `executeRestoreRun` **must sit inside that same try/finally**. Finally: if `_activeRun.runId === run.runId` then `_activeRun = null`; then `resolveSettled()`. Leaving `_activeRun` set after a cancelled wait hangs the next non-default `await _activeRun.settled` and lets a second default skip the throw.
6. Inside the try: if `statusKind === "default"`: `await waitForRootLifecycleReady(run)`; if not proceed, `return buildRestoreResult(run, "cancelled")` (no `executeRestoreRun`). Then `return await executeRestoreRun(_KDB, run, v3)`.

`destroy`: abort `abortControllers` (enough for whenUrl destroy row — **no** second resolve of `urlShareStartupPromise`); clear timers; clear pending flags **without** showing; then existing `_activeRun.cancelRequested`. Stay **≤150**.

#### `cognosWritebackBridge.js`

Do **not** add DOM or waiter logic. Import `readSelectedParameterSet`, `selectParameterSetById`, `notifyBridgeSetSettled`.

Public add those two methods beside install/uninstall/isInstalled/destroy.

Stamp `restoreStartedAt = Date.now()` immediately **before** each `writebackSet.restore(...)` (delta §5: at **entry**). Pass that value into notify. Do **not** stamp `Date.now()` inside `notifyAfterRestore` / after `restore()` returns (a post-return stamp can make a pre-change in-flight SET look new and settle the URL waiter).

Factory-scope `notifyAfterRestore(result, rawStatus, restoreStartedAt)`: `statusKind = STATUS_TABLE[rawStatus]`; if kind **missing**, **skip notify**. Call after every `restore()` return and catch-when-restore-entered, using the **entry** stamp. Catch-before-restore: omit `restoreStartedAt` (or skip notify).

Host `newDashboard` via `WBParameterSetFunction` **MUST** notify. Import `restoreConstants` for `STATUS_TABLE` if needed.

Stay wire-only; file is already 212 (over 150 — do not add bodies).

#### `contracts/writeback.md`

Apply delta §9: public API methods; §3.1 skip `ok:false`+cancelled + overlap cell; §6 insert skip/ready-wait; runtime blob replace; §8 three codes; folder tree under `bridge/` and `set/effects/` and `set/config/writebackLabels.js`.

#### `KDB3/js/KDB.js` (LAST — also apply shareControls spec bullets)

Stay **≤500**. AMD 30→31: add `./dashboard/controls/shareControls/__orchestratorShareControls.js` immediately after pdf orchestrator import/param.

`registerFeatureModules`: `__orchestratorShareControls(_KDB)` immediately after pdf.

`mountFeatureModules`: `_KDB.api.shareControls.mount({})` immediately after pdf mount (~line 78).

`destroyRegisteredFeatures`: `api.shareControls` **immediately after** `api.pdfExportControls` (~line 141).

`finishDashboardInitialization` — required order from writeback delta §6.2 **C** (PO poll: host chrome after spinner gone):

**Superseded 2026-08-30:** do not implement steps 4–6; live order is delta §6.2 (fire whenUrl, no await; presentPending in whenUrl finally; filterDock.mount after lift).

1. `const p = writebackSet.whenUrlShareRestoreSettled()` when the method exists — **do not await yet**.
2. If not disposed and lifecycle not already `disposed`/`error` → `setRootLifecycle(this, "ready")`. Never `ready` before step 1.
3. **Lift overlay now:** one `finishLoading({ handle: rootLoadingHandle })` if handle && loadingService. Do **not** await `p` first.
4. `try { if (p) await p; }`
5. `catch`: log; `setRootLifecycle(this, "error", error)` (overwrite early `ready`); **must not** `return` here.
6. **Then** `writebackSet.presentPendingUrlShareMessage()` if method exists and not destroyed (outside try/catch).
7. **Then** return: `true` **only if** `rootLifecycle.lifecycle === "ready"`. Otherwise `false`.

`whenUrlShareRestoreSettled.js`: set `urlShareBootOverlayActive = true` in the **sync** public entry after dispose/coalesce checks, **then** assign `urlShareStartupPromise = runUrlShareStartup`. Keep `finally` clear. Do not `await Promise.resolve()` before `absent`.

No URL parse, no restore orchestration in this class.

---

## Section D–E

No feature reducer. No published share/writeback selectors in this spec.

## Section F. Public API wiring

- `_KDB.cognosAPI.dashboard.getBoardId` / `getDashboardBiBaseUrl` → `string | null`
- `_KDB.services.cognosHost.dashboard` + those two Outcome reads
- `_KDB.services.writebackSet` += `whenUrlShareRestoreSettled`, `presentPendingUrlShareMessage`
- `_KDB.services.writebackBridge` += `readSelectedParameterSet`, `selectParameterSetById`

## Section G–I

Omitted: no harness / no mocks. Cognos-hosted. Document as omitted (not a Q-decision).

## Section J. Acceptance

1. All allowlist files exist or parent patches applied.
2. `dashboard.js` ≤150 (split if needed).
3. `createWritebackSetService.js` ≤150 / AMD ≤10.
4. `cognosWritebackBridge.js` has no DOM/waiter bodies.
5. No `helpers/` / `common/` / `shared/`.
6. No `__getDashboardAPI` outside `cognosAPI/` and the inner wrappers.
7. Default skeleton gone from `executeRestoreRun.js`.
8. `KDB.js` ≤500; lift overlay before await `whenUrl`; no early return before `presentPending`; share chrome wiring present if companion spec executed in same edit.
9. Dual review (mechanical + semantic) via subagents before browser.

## Section K. Forbidden

Same as template §K plus: no shareService; no scrape `#selectParameterSet` outside listed bridge files; no Dutch toast; no `ok:true`+cancelled; no `WRITEBACK_SKIPPED_BY_DESIGN` for URL skip; no git commit/push; no `.mdc` edits; do not implement `shareControls/` in this spec’s writer if a second writer owns that allowlist — except `KDB.js` is one writer for both specs.

## Section L–M

Template reporting + dual review. Supervising captain verifies D4: facet ops have a live shareControls caller in the same slice.

# Contract Delta: writeback URL `parameterId` + shared-link restore

> Implements the already-contracted default-status URL precedence (`writeback.md` §2.2 / §3.1) and the inbound half of dashboard sharing.
> Outbound Teilen UI: `contracts/shareControls.md`.
> No production code until this delta is **Approved**.

---

**Status:** `Approved`
**Parent:** `contracts/writeback.md` §2.2, §3, §3.1, §6, §8; `KDB3/js/KDB.js` `finishDashboardInitialization`; `contracts/core.md` §9.1 (`KDB.js` line budget)
**Type:** `shared-service contract delta` (writeback SET + writebackBridge + boot overlay)
**Authoring AI:** Cursor Grok 4.6, 2026-08-28
**Related:** `shareControls.md`, `messageService.md`

---

## 1. Purpose

When a user opens a dashboard URL that contains `parameterId`, they must see **that** parameter-set dashboard as the first painted state after host chrome exists. Lift the boot spinner so Cognos can create `#selectParameterSet`; then fire `whenUrlShareRestoreSettled` (**do not await**). Overlay-until-restore is **impossible** and must not be restored.

When the URL has no `parameterId`, sharing-without-a-set is legitimate: do not treat it as an error; host default-SET may run after ready per existing §3.1.

When the URL **has** a `parameterId` that is **absent from a loaded** host `#selectParameterSet` list, inform in **German** and start an empty dashboard via existing status `"newDashboard"`. That copy is **membership miss only** (id not in a loaded list, possibly deleted). It is **not** “select never appeared” or “no first real option” (`hostListUnready`). Do not invent a new parameter-set entity. Do not fall back to the user's default set (the URL already named a specific save).

---

## 2. PO decisions (2026-08-28)

| # | Choice | Decision |
|---|---|---|
| 1 | Outbound with/without | Legacy: current host dropdown value. Not this delta (shareControls). |
| 2 | Share without `parameterId` | Valid. Not an error. |
| 3 | First paint with URL id | Lift boot overlay **before** fire `whenUrlShareRestoreSettled` (**do not await**). Host chrome is gated on spinner gone, not on KDB `ready`. After lift, `urlShareBootOverlayActive` only no-ops SET loading and defers restore-failure alerts — it does not hold the spinner. |
| 4 | Missing id in a **loaded** list | `"newDashboard"` reset during background `whenUrl` (after lift). German `showAlert` **only** via `presentPendingUrlShareMessage` after overlay lift. Not default-SET. Call order is reset-then-alert, not “alert then restore”. |
| 5 | Payload source | Other extension. KDB programmatically selects the option and fires `change`; KDB does not fetch DWH JSON. |
| 6 | Host dropdown ownership | Read/select only through `writebackBridge`. Feature modules do not scrape `#selectParameterSet`. After `"newDashboard"` recovery, KDB **does not** rewrite the host select (the other extension owns options; a dead id may remain visible). |
| 7 | Inbound wait chain (2026-08-30) | Ordered waits **before** membership: (1) `#selectParameterSet` exists **and** at least one real `<option>` (placeholders `""` / `"-"` / `__KDB_NEW_DASHBOARD__` do not count); (2) **then** sync membership `option.value === String(parameterId)`. **No** canvas / `whenCanvasReady` step. Do not poll until matching id or 30s. |
| 8 | Host list never loaded | **C (PO 2026-08-29):** `newDashboard` reset **and** German `hostListUnready*` copy (not `Speicherstand nicht gefunden`). Title/body in §7. |

---

## 3. URL `parameterId` parse (one helper)

Canonical reader, used by default-SET skip **and** inbound apply. Lives under `writeback/bridge/readUrlParameterId.js`. Not in shareControls, not ad-hoc in `KDB.js`.

Share URLs put `parameterId` **only in the hash** (`shareControls.md` §10.2). Resource Timing `navigation.name` is the URL **without fragment**. A parse that stops at `navigation.name` would always miss inbound share ids.

Parse order:

1. Candidate A = `performance.getEntriesByType("navigation")[0].name` when that entry exists (no fragment — do not stop here).
2. Candidate B = `document.location.href` (includes hash; same document as `getDashboardBiBaseUrl` / viewer hash). B is always **in the list**; do **not** parse B after A already produced a non-empty `parameterId`.
3. For each remaining candidate, in A-then-B order, extract `parameterId`:
   - `new URL(href, document.location.origin)` (origin base so a relative `navigation.name` is not `Invalid URL` → `null`).
   - Query: `searchParams.get("parameterId")`. A **non-empty** value wins and **stops the whole parse**. Empty string `parameterId=` does **not** win; continue to hash on this candidate, then to the next candidate.
   - Hash: strip `#`; if the hash contains `?`, parse the part after `?`; else parse the whole hash as `URLSearchParams`. Non-empty `parameterId` wins and stops.
4. Empty / missing after both candidates → `null` (not the legacy sentinel string `"load_parameterset=false"`).
5. Invalid URL on a candidate → skip that candidate; if both fail → `null` + tagged `console.warn`; default-SET may proceed.

`parameterLabel` is never consumed on inbound.

---

## 4. Default-status skip (before occupancy)

Replace the skeleton diagnostic in `executeRestoreRun.js` that currently **continues** into `runNormalRestore`. After this delta, `executeRestoreRun.js` has **no** default-status special case (skeleton removed; ready-wait is not there).

`restore()` **coordinates** only. Bodies live in `set/effects/` (see §9). Do **not** inline skip or ready-wait in `createWritebackSetService.js` (88 lines today; hard cap 150) or in `cognosWritebackBridge.js`.

Do **not** add `signal` to parent `restore()` `options` (`writeback.md` §2.2 stays `{ allowDegradedWidgetBinding, timeoutMs, source }`). Ready-wait abort is `_KDB.runtime.writeback.abortControllers` + `run.cancelRequested` + `destroy`.

### 4.1 Ordered default flow

After status normalize (`writeback.md` §6 step 1), **before** overlap occupancy (`_activeRun`):

When `statusKind === "default"`:

1. Read `parameterId` via §3.
2. If **non-null** (URL skip):
   - **If `_activeRun` is set:** do **not** call `createRunContext` (it would increment `parameterSetRestoreRunId` and cancel the occupant via `assertStillCurrent`). Do **not** set `cancelRequested` on the occupant. Follow live default-overlap: **throw** `WRITEBACK_RESTORE_CANCELLED` without mutating the occupant. That throw is overlap, not this skip.
   - **If `!_activeRun`:** call `skipDefaultRestoreForUrlParameterId`. Create a run context **for the skip result only** (`createRunContext`) **without** assigning `_activeRun` and **without** `executeRestoreRun`. Return via **`buildRestoreResult`** (do not hand-build `ok`). The sample below is the **shape after** `buildRestoreResult`, not a literal to copy.
   - Parent matrix (`writeback.md` §2.2) **forbids** `ok: true` + `outcome: "cancelled"`. Existing cancelled means “this run did not commit”; `notifyRestoreFailure` stays silent for cancelled.
   - Do **not** reuse `WRITEBACK_SKIPPED_BY_DESIGN`.
   - Do **not** run abort-landing or `singleSelect/parameterSetRunFinished` (no owners ran).
   - Unoccupied skip is sync; `destroy` does not need to abort it.

```js
{
  ok: false,
  status: <raw default status>,
  runId,                    // from the unoccupied skip run context
  outcome: "cancelled",
  diagnostics: [{
    code: "WRITEBACK_URL_PARAMETER_ID_PRECEDENCE",
    phase: "set",
    message: "default restore skipped because URL parameterId is present",
    details: { parameterId: "<id>" }
  }],
  phases: <run.phases>      // from that same unoccupied context
}
```

3. If **null** (no URL id): **then** run existing overlap occupancy / `_activeRun` assignment, **then** abortable ready-wait (`waitForRootLifecycleReady`).
   - Wait until `_KDB.state.rootLifecycle.lifecycle` is `"ready"`, `"error"`, or `"disposed"` (or abort / `cancelRequested`).
   - **Only** `lifecycle === "ready"` continues to `executeRestoreRun`. `"error"`, `"disposed"`, abort, and `cancelRequested` → add diagnostic `WRITEBACK_RESTORE_CANCELLED`, then `RestoreResult` cancelled / `ok: false` via `buildRestoreResult` (`buildRestoreResult` does not inject that code). No loading, no `historyBegin`, no abort-landing, no `parameterSetRunFinished` (no owners ran). Do **not** hang forever waiting for a `ready` that E forbids after boot error.
   - Same run object from occupancy through wait through `executeRestoreRun`; do **not** `createRunContext` a second time.
   - Abort via `run.cancelRequested`, `writebackSet.destroy` (must abort this wait even though URL-skip never occupies), and `runtime.abortControllers` / `runtime.timers` for the wait.
   - Do **not** wait for ready on `notDefaultParamSet` or `newDashboard`.

Second in-flight default remains a **throw** `WRITEBACK_RESTORE_CANCELLED` (existing overlap policy: default-while-occupied does **not** set `cancelRequested` on the occupant). Occupancy **before** ready-wait makes that throw true during the no-id wait. URL-id skip is unoccupied **only** when `!_activeRun`; when occupied it uses the same throw (see step 2).

Non-default statuses: unchanged occupancy then `executeRestoreRun` (no skip, no ready-wait).

---

## 5. `writebackBridge` host-select surface

Add named methods on the existing `_KDB.services.writebackBridge` (host wiring, not a new service). DOM of `#selectParameterSet` exists **only** in this choke point.

`cognosWritebackBridge.js` is grandfathered over 150. New select constants, URL parse, read/select helpers, SET waiter, and notify **must** live in the listed `bridge/` files. Thin `bridgeSet` delegates to `runBridgeSetRestore.js`; `notifyAfterRestore` lives there (not factory-scope on the bridge). Do **not** add DOM or waiter logic to `cognosWritebackBridge.js`.

Do not require a new undocumented `writebackSet` method for the waiter.

`notifyBridgeSetSettled(result, meta)` **`meta` is required:**

```js
meta = { statusKind: "default" | "direct" | "newDashboard", restoreStartedAt?: number }
```

- `meta.statusKind` is the normalized live `STATUS_TABLE` kind (`"default"` / `"direct"` / `"newDashboard"`), **never** the raw host spelling (`defaultParamSet` / `defaultparamset` / `defaultparameterset` / `notDefaultParamSet`). Catch-without-run (overlap throw) still uses `STATUS_TABLE[rawStatus]`. Do **not** match on `RestoreResult.status`.
- `restoreStartedAt` = `Date.now()` (ms) at **entry** to `writebackSet.restore` for that `bridgeSet` attempt.
- Call notify after **every** `restore()` return **and** after `bridgeSet` catch **when `restore()` was entered**. Occupied-default notify stays required (restore was entered) and **must not** settle the URL waiter (`statusKind === "default"`).
- Catch **before** `restore()` was entered (`assertBridgeUsable`, unsupported format, unknown/`undefined` `STATUS_TABLE[rawStatus]`, etc.): omit `restoreStartedAt` **or** do not notify. The waiter **must not** treat that notify as a matching settle (`undefined !== "default"` must **not** count as a match). Host never-called SET must still timeout → `missingId` via `whenUrl`, not `kind: "failed"` from a pre-restore envelope.
- Direct `writebackSet.restore` still does not notify.
- Host `WBParameterSetFunction` `newDashboard` **MUST** notify like every other `bridgeSet` restore return (`statusKind` is `"newDashboard"`, not `"default"`). Independent of live `restore(null, status)` omitting `{ source: "bridge" }`. `whenUrl` recovery is a **direct** `restore(null, "newDashboard")` and **MUST NOT** notify.

### 5.1 Constants

```js
NEW_DASHBOARD_VALUE = "__KDB_NEW_DASHBOARD__"
PLACEHOLDER_VALUES = ["", "-"]
SELECT_ID = "selectParameterSet"
```

KDB prepends one host option, value `NEW_DASHBOARD_VALUE`, label `----- Ein neues Dashboard erstellen -----`, as the first child of `#selectParameterSet` once that select exists. It is not a real parameter-set id. URL recover still does not rewrite the select. A user pick of this option is handled only by the sentinel capture in `writeback-discard-confirm-contractdelta.md`.

### 5.2 `readSelectedParameterSet()`

```js
{ id: string|null, label: string|null }
```

- Missing node → `{ id: null, label: null }`
- Value in placeholders or `NEW_DASHBOARD_VALUE` → `{ id: null, label: null }`
- Else `id` = `select.value`; `label` = selected option text with legacy `::` sanitize (`/^(.*)\s*::\s*.*$/` → group 1)

ShareControls is the outbound consumer and uses this object **as-is**. No `_KDB.state` write.

### 5.3 `selectParameterSetById(parameterId, options?)`

```js
options?: { timeoutMs?: number, signal?: AbortSignal }
// default timeoutMs: 30000 — **one** budget covering select + first-real-option + remaining SET-wait
// (remaining ms into armWaiter). Not 30s + 30s. Overlay already lifted — this is not a spinner clock.
→ Promise<{
  ok: boolean,
  found: boolean,
  hostListReady?: boolean,  // false = select/options never loaded; true after first real option
  timedOut?: boolean,
  aborted?: boolean,
  restoreResult?: RestoreResult
}>
```

This helper **never** calls `writebackSet.restore` and **never** writes `pendingUrlShareMessage`. Recovery restore + pending are owned only by `whenUrlShareRestoreSettled` (§6.1). This helper **never** waits for canvas.

Bodies that scrape `#selectParameterSet` or wait for it live in `bridge/` (this file + `waitForParameterSetSelectReady.js`). Do **not** thicken `cognosWritebackBridge.js`.

1. **Select wait** (select exists + first real option), one 30000 ms clock from function entry (`startedAt = Date.now()`; `options.timeoutMs` may override). Remaining of **that same** clock is shared between (a) and (b); do **not** give select 30s then options another 30s.
   - If `remainingMs <= 0` before (a) or before (b): return `{ timedOut: true }` for that phase. **Do not** call `waitForElObserver` or `waitFor`. **Never pass `timeoutMs: 0`** into either util (0 = infinite wait).
   - **(a)** `await` `#selectParameterSet` via `_KDB.utils.waitForElObserver` (`"#" + SELECT_ID`, `document`, `{ timeoutMs: remaining, signal }`). Model: filterDock / toolbar / footer chrome waits. Catch reject: `err.code === "ABORTED"` → aborted; otherwise → select-wait timeout.
   - **(b)** Then `await _KDB.utils.waitFor` until **one real option** (predicate; `interval: 50`, `timeoutMs: remaining`). Real = `option.value` **not** in `PLACEHOLDER_VALUES` (`""`, `"-"`) and **not** `NEW_DASHBOARD_VALUE`. Placeholder-only `options.length > 0` is **not** a loaded list. Do **not** use `waitForElObserver` for (b) (`querySelector` hits the first `<option>`, including placeholders). Do **not** wait on CSS `#selectParameterSet option` as “loaded list”. `waitFor` has **no AbortSignal**: abort is a truthy sentinel from `conditionFn` (do **not** throw from `conditionFn` — `waitFor` swallows throws and retries). Catch `err.code === "WAITFOR_TIMEOUT"` → timedOut. Missing `waitFor` → timedOut (no single-read degrade). Drop `runtime.timers.optionWait` from this helper.
2. If **aborted** during (a)/(b) with no matching restore yet: `{ ok: false, found: false, hostListReady: false, aborted: true }` — **no** `change`, **no** restore.
3. If (a) or (b) **times out**: `{ ok: false, found: false, hostListReady: false, timedOut: true }` — **no** `change`, **no** restore. This is **not** membership miss. Mapper **must not** send this row to German missing-id (§6.1 / §12).
4. **(c) Membership once**, sync, **after** a real option exists. `option.value === String(parameterId)`. **Do not** poll for the matching id as “list not ready yet”. If no match: `{ ok: false, found: false, hostListReady: true }` — **no** `change`, **no** restore. This **is** missing-id (id not in a loaded list).
5. Else: set `select.value`, set `_KDB.runtime.writeback.skipDiscardConfirmOnce = true` (`writeback-discard-confirm-contractdelta.md` honors and **always clears** this if it was true, including overlay-skip and waiter timeout `finally`). `dispatchEvent(new Event("change", { bubbles: true }))`.
6. Arm the one-shot waiter **after** `change` **and only after membership succeeded** via `waitForBridgeSetSettlement.armWaiter` (record `change` time). `remainingMs = Math.max(0, timeoutMs - (Date.now() - startedAt))`. Pass `remainingMs` into `armWaiter` — do **not** start a second 30000. If remaining is 0, SET-wait times out immediately. Waiter observes **notify**, not a restore event. Live `bridgeSet` is a closure; there is no restore event.
7. `notifyBridgeSetSettled(result, meta)` matching rule (all must hold):
   - notify came from `WBParameterSetFunction` / `bridgeSet` (direct `writebackSet.restore` does **not** notify);
   - `meta.statusKind` is `"direct"` or `"newDashboard"` (not `"default"`, not `undefined`). All four raw default spellings normalize to `"default"` and must not count as applied. Unknown raw status must **not** settle. Live non-default kind is `"direct"`; do **not** require `"notDefaultParamSet"`.
   - `meta.restoreStartedAt` is a number **and** `meta.restoreStartedAt >= changeTime` (omit/`undefined` = pre-restore catch → **not** a match; ignore in-flight restores that started before `change`).
8. Matching restore settles → `{ ok: restore.ok, found: true, hostListReady: true, restoreResult }`.
9. If a matching option existed (or `change` fired) but no matching SET settles before remaining budget: diagnostic `WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT`, return `{ ok: false, found: true, hostListReady: true, timedOut: true }`. This helper still does **not** restore and does **not** write pending. `whenUrlShareRestoreSettled` **does** take the missing-id recovery for this result (§6.1). Do not drop recovery by reading this bullet in isolation.

Never call `writebackSet.restore` with a GET snapshot from this helper. Never re-enter `WBParameterSetFunction` for missing-id reset (empty payload throws for non-`newDashboard`).

---

## 6. Boot overlay + inbound apply

### 6.1 `whenUrlShareRestoreSettled` — single ordered path

```js
_KDB.services.writebackSet.whenUrlShareRestoreSettled() -> Promise<UrlShareStartupResult>
```

Always **resolves** (never rejects), including destroy/abort and **throws** from live `restore()` (`WRITEBACK_RESTORE_CANCELLED` when disposed or on second default). This method is the throw boundary: convert throws to `kind: "failed"`. Do **not** add this promise to `waitingTargets` / do **not** `await` it from `KDB.js`.

A second call while in-flight **coalesces** to the same promise (`runtime.urlShareStartupPromise`). After that promise **settles**, later calls return the **same** `UrlShareStartupResult` (no re-parse, no re-select, no re-arm overlay). After destroy, later calls resolve `kind: "failed"` immediately (destroy wins even if a settled result had `missingId` / `hostListUnready` pending).

```js
{
  kind: "absent" | "applied" | "missingId" | "hostListUnready" | "failed",
  parameterId: string|null,
  restoreResult?: RestoreResult
}
```

**Sequence (MUST; do not duplicate select / `change` / waiter logic inside another SET effect):**

1. Set `urlShareBootOverlayActive = true` in the **synchronous** `whenUrlShareRestoreSettled` entry **before** assigning `urlShareStartupPromise` / before the first `await`. `KDB.js` does **not** await this promise. Cleared in `runUrlShareStartup` `finally` when this promise settles. Do **not** add `await Promise.resolve()` before the `absent` return (that would hold the flag across empty-share `ready` and no-op default-SET loading). After dispose → `failed`, and on coalesce-return of an in-flight promise, do **not** re-arm the flag. **Amended 2026-10-13:** keep the flag through the inventory-quiet wait and through `#selectParameterSet` readiness (SET loading stays a no-op; no boot spinner). In `selectParameterSetById`, after membership succeeds and after `skipDiscardConfirmOnce = true`, set the flag **false before** `change`. The `restore()` that `change` starts then uses SET loading on `.dashboardFrame` (`writeback-set-loading`, `Dashboard wird wiederhergestellt`), same as a direct load. Do not clear the flag when membership fails, times out, or aborts (no `change`). Do not remount the boot cover. Do not pass mountKey `kdb-root-loading-animation-mount`. Discard confirm still skips because `skipDiscardConfirmOnce` is set before the flag clears. Restore-failure alerts for that restore follow the direct-load path (`notifyRestoreOutcome` may `showAlert`); the boot spinner is already gone.
2. `parameterId` = §3 parse.
3. If `parameterId == null` → `{ kind: "absent", parameterId: null }`. Host default-SET remains allowed after ready. Absent also means **no** dropdown wait.
4. Else wait for the host dropdown only (writeback-internal). Do **not** wait for canvas / `whenCanvasReady`. Do **not** block `KDB.js` boot on this promise. `selectResult = await selectParameterSetById(parameterId)` — `#selectParameterSet` exists, then one real option, then membership. **Before that select,** `writeback-urlShare-inventoryQuiet-contractdelta.md` requires the inventory-quiet wait. That wait is inside `whenUrl`, not in `KDB.js`, and is not a canvas wait.
5. Map **once**:

| Condition | `kind` | Recovery `restore(null, "newDashboard")` | `pendingUrlShareMessage` |
|---|---|---|---|
| disposed / `selectResult.aborted === true` / destroy before `whenUrl` settlement | `failed` | **no** | **cleared, not shown** — **always wins** over later rows |
| `hostListReady === false` (select never appeared / no first real option) | `hostListUnready` | **yes — this method only** | `{ parameterId, copy: "hostListUnready" }` — MUST NOT missing-id German |
| `found === false` and `hostListReady === true` (membership miss: id not in a **loaded** list) | `missingId` | **yes — this method only** | `{ parameterId, copy: "missingId" }` |
| `found === true` and `timedOut === true` (SET-wait timeout) | `missingId` | **yes — this method only** | `{ parameterId, copy: "missingId" }` |
| `found === true`, restore settled, `restore.ok === true` | `applied` | no | leave null |
| `found === true`, restore settled, `restore.ok === false` | `failed` | no | leave null; queue restore-failure for after lift **only** if `outcome` is `failed` / `abortedByOwner`, not `cancelled` (§6.2) |
| recovery `restore` throws or returns `ok: false`, **and** the instance is **not** disposed and destroy did **not** already clear pending | `failed` | attempted | **keep** pending including `copy` (that row’s German still shown; do not stack restore-failure) |

**Precedence:** disposed / abort / destroy-before-settlement **always** wins: `kind: "failed"`, `pendingUrlShareMessage` **and** `pendingRestoreFailure` remain cleared, no `showAlert`. Catch of recovery throw **must not** write pending after destroy. Aborting `abortControllers` is enough for this row; do **not** also queue a second deferred resolve of `urlShareStartupPromise` (race with this method’s return).

6. Recovery (`missingId` **or** `hostListUnready`): this method is the **only** caller of `writebackSet.restore(null, "newDashboard")` for URL share and the **only** writer of `pendingUrlShareMessage`. Wait for that restore. Set pending **before** restore (so `notifyRestoreFailure` under the overlay flag does not stack). Diagnostics: `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND` (+ `WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT` when SET-wait was the trigger) for `copy: "missingId"`; `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY` for `copy: "hostListUnready"` — **never** attach missing-id diagnostics on the unready row. Catch throws → `kind: "failed"` (never reject), **keep** pending `copy`. If destroy ran during that restore, apply the precedence row (clear pending; do not re-arm). Direct `restore` does **not** notify the URL `armWaiter` — a `newDashboard` SET timeout is this restore’s own result, **not** the missing-id SET-wait row.

Public factory stays a thin facade: `createWritebackSetService.js` wires named methods to `set/effects/` helpers; no method bodies inlined (`amd.mdc`). Extra AMD imports of those effects stay under the 10-import cap.

### 6.2 `KDB.js` `finishDashboardInitialization`

This overlay/ready change is a **lifecycle-semantics** amendment, not bootstrap wiring. It is explicitly approved by this delta (`feature-structure.mdc` / `core.md` §9.1). `KDB.js` is 403/500.

This delta’s `KDB.js` allowance is **additive** to `shareControls.md` §9. Share must **not** hold boot. FilterDock mounts after spinner lift, independent of URL restore.

No URL parse, no restore orchestration, no extra boot logic in the class. Do not split `KDB.js`. Stay under 500.

Required order (2026-08-30 PO: apply URL SET only once the dropdown has options; do not intertwine share with other boot waits). **Amended 2026-10-13:** the inventory-quiet wait in `writeback-urlShare-inventoryQuiet-contractdelta.md` is the one approved wait inside `whenUrl`. `KDB.js` still does not await it.

1. If `!_isDisposed` and lifecycle is not already `"disposed"` / `"error"`: `setRootLifecycle(..., "ready")`.
2. **Lift overlay:** one `finishLoading({ handle: rootLoadingHandle })` if handle and loadingService exist.
3. `this.api.filterDock.mount({})` if not disposed. Do not await. Not share membership.
4. Fire `writebackSet.whenUrlShareRestoreSettled()` if the method exists — **do not await**. Dropdown wait + SET run in the background. `presentPendingUrlShareMessage` runs from that method’s `finally`, not from `KDB.js`.
5. Return `true` **only if** `rootLifecycle.lifecycle === "ready"`; otherwise `false`.

`urlShareBootOverlayActive` may still be true during the inventory-quiet wait and the option-wait after visual lift (SET loading stays no-op until the flag is cleared before `change`; no second spinner, no boot cover). Empty share: fire then `absent` (no dropdown wait); lift already happened in step 2.

**SET loading vs boot overlay (one rule):** while `urlShareBootOverlayActive === true`, `startLoadingGuarded` is a **no-op** and **returns false**. On a real start it **returns truthy** (live function is void today — change the return so `loadingStarted` can latch it). `loadingStarted` is latched from **that start-call result**, not by re-reading the overlay flag later. If start no-op’d, that run **must not** call `finishLoadingGuarded` later **even after the flag clears**. Do **not** pass boot `mountKey` `"kdb-root-loading-animation-mount"` into SET loading. Do **not** coalesce SET `startLoading` onto that mountKey. After the flag clears, **later** user-driven restores (new `restore()` calls) use SET loading as today.

**`notifyRestoreFailure` vs overlay:** live `notifyRestoreFailure` runs inside `executeRestoreRun` **before** `whenUrlShareRestoreSettled` resolves. The spinner is already lifted; `urlShareBootOverlayActive` is only the background-SET latch. While that flag is true:

- do **not** `showAlert` from `notifyRestoreFailure`;
- if `pendingUrlShareMessage != null` (missing-id path): do not queue restore-failure (missing-id wins; no stack);
- else if outcome is `failed` / `abortedByOwner`: set `pendingRestoreFailure = true`. Do **not** set it for `outcome === "cancelled"` (live `notifyRestoreFailure` is silent for cancelled; destroy already covered by the precedence row).

`presentPendingUrlShareMessage` after lift shows at most one modal (§7).

Do not move restore orchestration into `shareControls`.

### 6.3 Ready vs skip

Combined with §4, a default-SET seeing a URL id still skips **before** occupancy. A default-SET with no URL id waits for `lifecycle === "ready"` (occupancy already taken so destroy can abort the wait). Overlay lift is already done in §6.2 before fire; empty-share `absent` then settles with no dropdown wait. URL-id still skips. Do not add a sync/microtask `rootLifecycle` listener (empty-share safety depends on ready-wait remaining a macrotask).

---

## 7. Pending user messages (German)

`presentPendingUrlShareMessage()`:

- If `pendingUrlShareMessage == null` **and** `pendingRestoreFailure !== true` **and** `pendingRestoreInfo == null` → **no-op** (absent / applied / destroy-cleared). Do not open a modal.
- If `pendingUrlShareMessage` is set → `showAlert` once with the copy selected by `pendingUrlShareMessage.copy`, then clear `pendingUrlShareMessage`, `pendingRestoreFailure`, **and** `pendingRestoreInfo`. Missing-id **wins** over abort and info (no stack).
- Else if `pendingRestoreFailure` → `showAlert` once with the existing restore-failure copy (`notifyRestoreOutcome.js`: title `Dashboard wiederherstellen`, `severity: "error"`), then clear abort **and** info flags. Abort **wins** over info (no stack).
- Else if `pendingRestoreInfo` → `message.notify` once per entry in `labelKeys[]` (fallback: single `labelKey`) using `labels.de.writeback[key]`, then clear that blob. Keys may be dstl C4 or SSS P1/default (`specialSingleSelect-restore-default-h2-contractdelta.md`). Dstl C4 still wins at SET finish (zero SSS keys pended).
- Returns `undefined`.

Pending shape (required so `{id}` and copy are defined):

```js
pendingUrlShareMessage: { parameterId: string, copy: "missingId" | "hostListUnready" } | null
```

Omitted `copy` is **not** allowed after this slice. Membership / SET-wait recovery writes `"missingId"`. Host-list-unready writes `"hostListUnready"`.

```js
{
  title: <labels for that copy>,
  severity: "warning",
  message: <message with {id} = pendingUrlShareMessage.parameterId>
}
```

German source of truth — `_KDB.config.labels.de.writeback` (merge in `__orchestratorWriteback.js` from `set/config/writebackLabels.js` **only** — not `writeback/config/`). Same pattern as messageService: `Object.assign({}, defaults, existing)` (existing wins).

| Key | German | When |
|---|---|---|
| `missingIdTitle` | `Speicherstand nicht gefunden` | `copy: "missingId"` — id not in a **loaded** list, or SET-wait timeout |
| `missingIdMessage` | `Der in der URL angegebene Dashboard-Speicherstand (Parameterset-ID „{id}“) wurde in der Auswahlliste nicht gefunden. Er wurde möglicherweise gelöscht. Das Dashboard wird ohne Parameterset gestartet.` | same |
| `hostListUnreadyTitle` | `Speicherstand konnte nicht geladen werden` | `copy: "hostListUnready"` — select never appeared / no first real option |
| `hostListUnreadyMessage` | `Der in der URL angegebene Dashboard-Speicherstand (Parameterset-ID „{id}“) konnte vorübergehend nicht geladen werden. Das Dashboard wird ohne diesen Speicherstand gestartet. Achtung: Das Speichern von Dashboardständen ist derzeit möglicherweise ebenfalls nicht möglich.` | same (PO 2026-08-29) |

Do **not** reuse `missingId*` for host-list-unready. `{id}` is the raw `parameterId`. `acknowledgeLabel` may use messageService default `OK`.

If `messageService` is missing **or** `showAlert` throws: tagged `console.warn`, no throw (same as live `notifyRestoreFailure`).

Do not use the legacy Dutch toast.

---

## 8. Error / diagnostic codes (parent §8)

Add to `schema/errorCodes.js` (do not reuse unused `WRITEBACK_TIMEOUT`: that name is generic restore-budget, not URL-share):

| Code | Use |
|---|---|
| `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE` | Default-SET skipped because URL has `parameterId` |
| `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND` | URL id not in a **loaded** host list (membership miss) or SET-wait timeout treated as missing; missing-id path taken. **Not** host-list-unready. |
| `WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT` | Matching option existed (or change fired) but no matching bridge SET settled in time |
| `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY` | `#selectParameterSet` / first real option never loaded. Host-list-unready path (`copy: "hostListUnready"`). **Not** missing-id. |

---

## 9. RestoreResult / parent table patches

Parent `writeback.md` patches (apply on approval; implementers must not follow the unpatched parent sequence):

### §2.2 public API — add (do **not** add `signal` to `restore` options)

```js
_KDB.services.writebackSet.whenUrlShareRestoreSettled() -> Promise<UrlShareStartupResult>
_KDB.services.writebackSet.presentPendingUrlShareMessage() -> undefined
```

Public `writebackSet` becomes `{ restore, destroy, whenUrlShareRestoreSettled, presentPendingUrlShareMessage }`. Named methods; no mixed `dispatch`.

Public `writebackBridge` gains `readSelectedParameterSet` and `selectParameterSetById` beside `install` / `uninstall` / `isInstalled` / `destroy`.

### §3.1 default-row

Stays: skip default restore when URL `parameterId` is present **and report diagnostic**. This delta defines that skip as a real `return` via `buildRestoreResult`: `outcome: "cancelled"`, **`ok: false`**.

**Parallel / overlap cell:** no-id default path keeps occupy + second-default **throw** without mutating the occupant. URL-id skip is unoccupied **and must not supersede** a non-skip occupant: if `_activeRun` is set, throw `WRITEBACK_RESTORE_CANCELLED` without `createRunContext` / run-id steal (see §4.1). Loading-target cell after this delta: boot overlay while `urlShareBootOverlayActive`; SET loading only on runs whose start was **not** no-op’d (§6.2).

### §6 restore sequence — insert before overlap

After step 1 (normalize status), **before** current step 2 (overlap occupancy):

- If `statusKind === "default"` and §3 `parameterId` is non-null:
  - `_activeRun` set → throw overlap (no skip `createRunContext`).
  - else → unoccupied skip return (§4.1 step 2). Stop. Do not occupy, load, `historyBegin`, or ready-wait.
- Then current step 2 overlap occupancy.
- Then if `statusKind === "default"` and §3 `parameterId` was null: abortable ready-wait (§4.1 step 3).
- Then current steps 3+ (`executeRestoreRun`: loading, flags, history begin, …).

### §8 error codes — add the three URL codes from this delta §8 to the parent list.

### §6 runtime blob — replace with

```js
_KDB.runtime.writeback = {
  parameterSetRestoreActive: false,
  parameterSetRestoreActiveCount: 0,
  parameterSetRestoreRunId: 0,
  pendingRunId: null,
  skipDiscardConfirmOnce: false,
  pendingUrlShareMessage: null,       // { parameterId, copy: "missingId"|"hostListUnready" } | null
  pendingRestoreFailure: false,
  urlShareRestoreWaiter: null,
  urlShareStartupPromise: null,
  urlShareBootOverlayActive: false,
  abortControllers: {},               // readyWait, optionWait, urlShareStartup
  timers: {},                         // readyWait, optionWait
};
```

`normalizeWritebackRuntime` **and** `ensureWritebackRuntime` **fill defaults when the object already exists**. Live `ensureWritebackRuntime` returns an existing bucket **as-is** today — that would drop these keys. Live `normalizeWritebackRuntime` **rebuilds four fields and drops unknowns** — it must **preserve** the fields above (defaulting missing ones). Do not strip `abortControllers` / `timers`.

Folder tree parent §1: add under `bridge/`:

```txt
readUrlParameterId.js
parameterSetSelectConstants.js
readSelectedParameterSet.js
selectParameterSetById.js
waitForParameterSetSelectReady.js  // select exists + first real option (not membership)
waitForBridgeSetSettlement.js   // armWaiter + notifyBridgeSetSettled (one module)
```

And under `set/effects/`:

```txt
skipDefaultRestoreForUrlParameterId.js
waitForRootLifecycleReady.js
recoverUrlSharePending.js       // newDashboard + pending.copy (whenUrl line cap)
whenUrlShareRestoreSettled.js
mapUrlShareSelectResult.js
presentPendingUrlShareMessage.js
```

And under `set/config/` **only**:

```txt
writebackLabels.js              // German _KDB.config.labels.de.writeback
```

Do not put those bodies in `cognosWritebackBridge.js` or in a `helpers/` / `common/` / `shared/` folder.

---

## 10. Runtime

See §9 runtime blob. `writebackSet.destroy`:

- abort `abortControllers` (ready-wait, option-wait, startup) — that is enough for in-flight `whenUrl` to map the destroy row; do **not** also queue a second resolve of `urlShareStartupPromise`;
- clear `timers`;
- in-flight `whenUrlShareRestoreSettled` resolves `kind: "failed"` via that abort (not a racing extra resolve);
- clear `pendingUrlShareMessage` **without** showing it;
- clear `pendingRestoreFailure` without showing it;
- then existing `_activeRun.cancelRequested` behavior.

---

## 11. Out of scope

- share button / copy dialog — `shareControls`
- `getBoardId` / bi-base URL — cognosHost dashboard facet
- WritebackTabel CRUD
- Discard-confirm UI — shipped in `writeback-discard-confirm-contractdelta.md`
- Injecting `NEW_DASHBOARD` option into the host select
- `sichtChange`

---

## 12. Open questions

None for PO. **C closed 2026-08-29:** host-list-unready → `newDashboard` + `hostListUnreadyTitle` / `hostListUnreadyMessage` (§7). Inbound wait is dropdown-only; canvas wait superseded 2026-08-30.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-08-28` | `Draft` | Cursor Grok 4.6 | Closes executeRestoreRun skeleton; overlay + missing-id → newDashboard + German alert. |
| `2026-08-28` | `Draft` (review patch) | Cursor Grok 4.6 | Army: skip `ok:false`+cancelled; skip before occupancy; abortable ready-wait; SET waiter ignores default-skip; wait for matching option not `length>0`; timeout → missingId; overlay lift before ready; KDB.js lifecycle approval; bridge file split. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [writeback URL review](ac64bcd6-77b3-4920-a46d-ec6bea73db7f) | Hash fallback to `location.href`; one owner of newDashboard+pending; abort≠missingId; ordered whenUrl path; skip unoccupied vs ready-wait after occupancy; named skip/ready-wait files; bridge notify hook; no restore() signal; overlay then alert; pending no-op + shape; suppress notifyRestoreFailure under boot overlay; no SET loading while boot overlay; throws→failed; KDB.js additive to share chrome; parent §6 + runtime blob. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [writeback second pass](3020161f-226c-45d1-942c-36aba815ac12) | Skip must not steal occupant `runId`; destroy wins over recovery pending; notify `meta.restoreStartedAt`; pre-restore catch ≠ waiter settle; per-run SET loading pairing; no `ready` after dispose. |
| `2026-08-29` | `Draft` (MUST patch) | Captain after [writeback third pass](e68661d5-5a71-4760-a572-82d01e41a5df) | `meta.statusKind` = `STATUS_TABLE` kind; ready-wait only `ready` runs restore; no `return` before `presentPending`; one 30s select budget. |
| `2026-08-29` | `Approved` | PO-by-proxy (captain; handoff: fresh army green = PO ok) | [writeback fourth pass](651a9edd-d901-47e8-ae0d-4f2efa6c2132) merge-ready. SHOULD nits: catch `return false`, startLoading truthy, unknown statusKind not a match, `addDiagnostic` then build. |
| `2026-08-29` | `Approved` (B lifecycle) | Captain after Cognos missing-id on valid id; army [hide](83deda63-d2af-4d06-9517-c77c4c88365d) [occupancy](29b9aaaa-a9c7-4ce0-b4f5-8e02e8a1dc9b) [pins](5d02c090-2367-44ff-8624-9d96b499149d) | `ready` under overlay then await `whenUrl` then lift then `presentPending`. Sync overlay flag before returning `p`. Host list fill is not gated on default `RestoreResult.ok`. |
| `2026-08-29` | `Approved` (C overlay) | Captain after PO poll: overlay window `select:false`/`dock:false`; after alert `wantedInList:true` (36 options incl. URL id) | Lift boot overlay **before** await `whenUrl`. Cognos creates `#selectParameterSet` only after spinner gone, not on KDB `ready`. |
| `2026-08-29` | `Approved` (inbound wait-chain; §12 open) | Captain after army [overlay C](6809279d-33ce-4893-889b-3f35f7040867) [canvas](850aa757-437a-4ea3-a0e3-e125d1374537) [select](c239b167-db7c-4be0-b432-07f32f55237b) | Reuse `whenCanvasReady`; split select/first-real-option/membership; `found: false` is membership miss only; host-list-unready ≠ missing-id. No `KDB.js` change. JS writer blocked on §12. |
| `2026-08-29` | `Approved` (wait-chain MUST patch) | Captain after [spec review](01d33678-49ef-49f1-8755-a17da403f80e) | Canvas abort = Outcome field `result.outcome === "aborted"` before `!ok` timeout. Unready parks as `kind: "failed"` + `shouldRecover: false` until §12 (not missing-id fallthrough; not choosing A). `remainingMs <= 0` skips `waitForElObserver`. |
| `2026-08-29` | `Approved` (§12 C) | PO | Host-list-unready: `newDashboard` + new German `hostListUnready*` (not missing-id). Pending `{ parameterId, copy }`. JS unblocked. |
| `2026-08-29` | `Approved` (FilterDock B clock) | Captain after Cognos `#filterDockContainer` 30s miss ~29s post-boot | §6.2 item 4b: first `filterDock.mount` after `await p`, before `presentPending`. Overlay C unchanged. Not membership. |
| `2026-08-29` | `Approved` (select wait utils) | Captain after army [Selector wait convention](fdb72cb2-ea4f-4d8b-8b32-928e3687c1cf) | §5.3 (a) `await waitForElObserver`; (b) `await waitFor` predicate (not CSS option, not `timers.optionWait`). JS same slice as canvas-ready call fix. |
| `2026-08-29` | `Approved` (canvas C continue) | Captain after army [Canvas ready call shape](aabab9c8-0c13-486c-b181-ba2a3edcc94b) | **Superseded ~22:36.** Had kept `whenCanvasReady({ budgetMs: 30000, signal })` and continue-on-fail. Cognos 22:35: `CANVAS_WAIT_TIMEOUT`; dropdown started; canvas never `true`. |
| `2026-08-29` | `Approved` (canvas A unbounded) | Captain after army [Canvas await shape](c9238205-85dc-44a7-9c70-37f62c9214a7) [sequence](a915805b-bbd8-4ec8-91f6-2c8ea9028390) [spec bullets](db6eb32b-1589-45b2-82c3-f17a913c15a5); PO 22:35 log | **Superseded ~23:10.** Unbounded `{ signal }` still armed a **new** host waiter. Cognos ~23:00: hang on `getCanvasWhenReady`. |
| `2026-08-29` | `Approved` (one getCanvasWhenReady hook) | Captain after PO: use the adapter hook like tableData/widgetBase; loading overlay is irrelevant | **Superseded 2026-08-30.** Shared hook joined writeback to tableData’s hung early promise. |
| `2026-08-30` | `Approved` (revert join + writeback sync probe) | Captain after PO: modules must not share one canvas wait; URL owner is writeback only | **Superseded same night.** Canvas probe still blocked boot via `await p`. |
| `2026-08-30` | `Approved` (share off boot) | PO: apply URL SET only when dropdown has options; do not intertwine | `KDB.js` does not `await` whenUrl. No canvas wait. FilterDock after spinner lift. `presentPending` in whenUrl `finally`. |
| `2026-08-30` | `Approved` (leftover cleanup) | PO / captain | Live rules match Cognos: no await whenUrl, no canvas wait, no writeback canvasFacet stamp. Overlay flag stays as background SET latch. JS stamp cut: share-inbound-cleanup-execution-spec.md. |

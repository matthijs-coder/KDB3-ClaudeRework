# Execution Spec: WP6 nonempty DataSources list wait (sharpened B)

> Restore the cubes dialog when the first `getDataSourceList()` is still `[]` while Cognos-native prep chrome already shows. Not an error-state poll. Copy follow-up stays.

**Status:** `Superseded` — settlement wait: `home-dialog-wp6-settlement-wait-execution-spec.md`. Do not execute this list-length spec.  
**Law:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` locks **7** and **16** (this rewrite) + recommended package #1  
**Phase:** detector timing follow-up  
**Authoring AI:** WP6 captain, 2026-09-08  
**Executing AI:** Grok 4.6 army (`cursor-grok-4.6-xhigh`)

---

## Section A. Pre-flight (echo one sentence each, then write same turn)

1. `cognos-adapter.mdc` — ring 1 only talks to `_KDB.cognosAPI`; homeDialog stamps facets; no `_KDB.cognosAPI` from `presentCubesUnavailable`
2. `error-handling.mdc` — try/catch on named executables; abort is not a logged failure
3. `runtime.mdc` — waits register `abortControllers` on the owner (`cognosHostService`); cleanup on destroy
4. `amd.mdc` — `define`, factory-scope helpers, no nested functions in entry bodies
5. `feature-structure.mdc` — JS ≤150 / AMD ≤10; no `helpers/` / `shared/`
6. WP6 locks **7** and **16**
7. This spec

Also echo: no error-state poll; no 60s; no `KDB.js` edit; no PROGRAM tick; copy labels untouched.

---

## Section B. Exclusive allowlist

**MAY create/edit only:**

| Path | Job | Lines / AMD |
|---|---|---|
| **New** `KDB3/js/core/services/cognosHost/facets/dataSources/wait/waitForNonEmptyDataSourceList.js` | Bounded wait until `Array.isArray(list) && list.length > 0`. Abort on `runtime.cognosHostService.abortControllers`. Reuse **existing** sleeper via AMD import `../../dataQuery/wait/awaitPollInterval.js` (generic; do **not** import `waitForQueryResult.js`). | ≤140 / ≤6 |
| `KDB3/js/core/services/cognosHost/facets/dataSources/read/hasErrorDataSource.js` | `__controller` **async**. Missing `getDataSourceList` → immediate `buildOk(false)` (no wait). Else `await waitForNonEmpty…(_ctx, getDataSourceList)`. Nonempty list → existing `listHasError` / `itemIsError` (do **not** clone the scan into the wait file). Timeout/abort/empty → `buildOk(false)`. Keep throw handling: **do not** retry ticks on throw. | 73 → ≤120 / 3→4 |
| `KDB3/js/core/homeDialog/presentCubesUnavailable.js` | **`await`** `hasErrorDataSource()`. If not `ok && data === true`: `console.warn("[homeDialog.presentCubesUnavailable] skipped", ok, data, outcome, reason)` then return. Do not log the host list. | 54 → ≤70 / 1 |

**MUST NOT touch:** `KDB.js`, `createDataSourcesAdapter.js` (bind still works), `cognosAPI/dataSources.js`, `createCognosHostService.js`, `presentHomeChoice.js`, `homeDialogLabels.js`, `loadingLabels.js`, `showLoadingWatchdogDialog.js`, `waitForQueryResult.js`, `awaitPollInterval.js` (import only), `messageService/**`, `scheduleLoadingWatchdog.js`, `.cursor/rules/*.mdc`, WP2/SSS.

---

## Section C. Wait file behavior

Copy abort **register / store / release** shape from `facets/dataQuery/wait/waitForQueryResult.js` (`registerWait` / `storeWait` / `releaseWait` + `ensureCognosHostRuntime`), with key prefix `dataSourceListWait:` (not `queryResultWait:`).

Constants in the wait file:

- `LIST_WAIT_INTERVAL_MS = 150`
- `LIST_WAIT_BUDGET_MS = 15000`

Loop (factory-scope named helpers; entry is `async function waitForNonEmptyDataSourceList(_ctx, _getDataSourceList)`):

1. If disposed/stale or `_getDataSourceList` is not a function → return `null` (no throw).
2. Register abort; `try/finally` release + `controller.abort()`.
3. Each tick: disposed/stale/aborted → return `null`.
4. `list = _getDataSourceList()`. If `list` is thenable (`list && typeof list.then === "function"`), `await list` **once this tick**. If that await throws → **rethrow** (caller fail-closed; do not continue the interval).
5. If `Array.isArray(list) && list.length > 0` → return `list`.
6. If `Date.now() - startedAt >= LIST_WAIT_BUDGET_MS` → return `null`.
7. `await awaitPollInterval(controller, controller.signal, LIST_WAIT_INTERVAL_MS)`.

Do **not** call `getState`. Do **not** throw on timeout. Do **not** swallow `getDataSourceList` throws.

---

## Section D. `hasErrorDataSource.js`

- Keep `isDisposedOrStale`, `itemIsError`, `listHasError` as they are.
- `async function __controller(_ctx)`.
- After missing-API immediate `buildOk(false)`, `list = await _waitForNonEmptyDataSourceList(_ctx, dataSourcesApi.getDataSourceList.bind(dataSourcesApi))`.
- If `!Array.isArray(list)` → `buildOk(false)` (timeout, abort, or empty-valid).
- Else `buildOk(listHasError(list))`.
- `catch`: same as today (`console.error` + `buildFailed` only if `list` already an array; else `buildOk(false)`). Do not start a wait inside `catch`.

---

## Section E. Forbidden

Poll `getState` / `listHasError` every tick (that is rec **C**). 60s budget. Wait on missing feature. Timers on `runtime.homeDialog`. New public facet op. New `messageService` method. Glass. Native Cognos string. Tick PROGRAM 6/7. Git commit. Dump `KDB.js`.

---

## Section F. After files

Grok dual-review (mechanical + semantic). Confirm `presentCubesUnavailable` awaits. Confirm adapter still one op. Confirm `KDB.js` untouched. Do not self-certify Cognos green.

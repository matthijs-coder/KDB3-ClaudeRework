# Execution Spec: WP6 DataSources settlement wait

> Supersedes list-length wait (`home-dialog-wp6-list-wait-execution-spec.md`). One loop. First `"error"` wins. Not rec C.

**Status:** `Reviewed` — dual Grok PASS 2026-09-08. PO Cognos green 2026-09-08. PROGRAM **6** / **7** `[x]`.  
**Law:** `contracts/cubes-unavailable-home-dialog-contractdelta.md` locks **7** and **16** + package #1  
**Phase:** settlement poll  
**Authoring AI:** WP6 captain, 2026-09-08  
**Executing AI:** Grok 4.6 army (`cursor-grok-4.6-xhigh`)

---

## Section A. Pre-flight (echo one sentence each, then write same turn)

1. `cognos-adapter.mdc` — ring 1 only; homeDialog stamps; no `_KDB.cognosAPI` from presenter
2. `error-handling.mdc` — try/catch; abort is not a logged failure
3. `runtime.mdc` — abortControllers on `cognosHostService`; cleanup in `finally`
4. `amd.mdc` — `define`, factory-scope helpers
5. `feature-structure.mdc` — JS ≤150 / AMD ≤10; no `helpers/`
6. WP6 locks **7** and **16** (settlement, not list-length)
7. This spec

Also echo: no second wait file; no `KDB.js`; no `ds.on`; no `getLocalizedName`; no PROGRAM tick.

---

## Section B. Exclusive allowlist

| Path | Job | Lines / AMD |
|---|---|---|
| **Rename/replace** `wait/waitForNonEmptyDataSourceList.js` → `wait/waitForSettledDataSourceList.js` | Same abort/sleeper/thenable unwrap. Stop predicate becomes a **callback** `_shouldKeepWaiting(_list)` passed from hasError. Empty list → keep waiting. Do **not** hardcode `"loading"` in this file. Delete the old nonempty file so there is **one** waiter. | ≤140 / 2 |
| `read/hasErrorDataSource.js` | Own three-way `readItemState`: `"error"` / `"ready"` / `"unsettled"` (`loading`, unknown, throw, missing `getState`). `listShouldKeepWaiting`: true if `!Array.isArray` or `length===0` or any unsettled; **false** if any `"error"` (first error wins) or all `"ready"`. Pass that function into the wait. After wait returns an array: `buildOk(listHasError(list))`. `null` → `buildOk(false)`. Keep missing-API immediate false. | ≤120 / 4 |
| `presentCubesUnavailable.js` | **No edit** unless the wait import path broke the presenter (it should not). | 62 / 1 |

**MUST NOT touch:** `KDB.js`, `createDataSourcesAdapter.js`, `cognosAPI/dataSources.js`, `presentHomeChoice.js`, labels, `waitForQueryResult.js`, `awaitPollInterval.js` (import only), messageService, WP2/SSS.

---

## Section C. Wait file

Keep: `LIST_WAIT_INTERVAL_MS = 150`, `LIST_WAIT_BUDGET_MS = 15000`, `dataSourceListWait:` abort key, `ensureCognosHostRuntime`, import `../../dataQuery/wait/awaitPollInterval.js`, thenable unwrap once per tick, rethrow host throws, timeout → `null`.

Entry: `async function waitForSettledDataSourceList(_ctx, _getDataSourceList, _shouldKeepWaiting)`

Each tick after unwrap: if `typeof _shouldKeepWaiting !== "function"` → return `null`. If `_shouldKeepWaiting(list) !== true` and `Array.isArray(list)` → return `list`. If budget exceeded → return `null`. Else interval.

Do **not** clone `itemIsError` here.

---

## Section D. Predicates (hasErrorDataSource only)

```text
readItemState(item):
  try getState()
  "error" → "error"
  "ready" → "ready"
  else → "unsettled"
  catch → "unsettled"

listShouldKeepWaiting(list):
  if not array or length 0 → true
  if any error → false   // first error wins
  if any unsettled → true
  return false           // all ready
```

`listHasError` stays `any readItemState === "error"` (or keep existing `itemIsError` if it stays `=== "error"` only — both OK).

---

## Section E. Forbidden

Second wait file. Stacked 15s. Poll until error regardless of `ready` (C). Freeze first nonempty array. `ds.on`. `getLocalizedName`. Tick PROGRAM. Commit. Dump `KDB.js`.

---

## Section F. After files

Grok dual-review. Confirm old `waitForNonEmptyDataSourceList.js` is **gone**. Adapter still one op. Presenter still awaits. Not Cognos green.

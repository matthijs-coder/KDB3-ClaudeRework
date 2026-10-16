# Execution Spec: `dienststelle` Stable Default Final Clean Build

---

**Status:** `Ready for execution after rollback`
**Contract:** `_____________KDB3API/contracts/dienststelle.md`
**Supersedes:** ad-hoc prompts and earlier unstable `dienststelle-stable-default-clean-rebuild-spec.md` iterations
**Scope:** clean production implementation of the proven Cognos-stable Dienststelle auto-default flow

---

## 1. Root Cause

The Cognos API call and `{ d, u }` default payload are correct. The failures came from orchestration:

- a wait/probe layer wrote a pageContext default before the real apply path;
- `walkPageScopes` then wrote the same default again;
- `visualizationWidget/dienststelleChanged` refreshed downstream widgets while Cognos was still rendering after the clear/apply cycle.

This caused Cognos render cancellation and query errors. The final implementation must enforce:

```txt
read-only wait -> one apply path -> deferred widget notify
```

No wait/readiness helper may write filters.

---

## 2. Behavior

### Global User Clear

When the user clears the global active Dienststelle filter and confirms:

- global remains empty;
- empty dashboard pageContext tabs receive the active default;
- dashboard tabs with existing/restored values keep their values;
- helper/non-dashboard tabs are excluded;
- values are never copied between tabs.

Dashboard tabs come from `_KDB.config.tabs` role `"dashboard"` plus `_KDB.cognosAPI.tabs.getTabsContainers()[index].id`.

### PageContext User Clear

When the user clears one pageContext Dienststelle filter while global is empty:

- only that confirmed tab is eligible for default;
- other tabs are not changed.

---

## 3. Hard Constraints

These are acceptance requirements:

- AMD full-compact modules only.
- No public API changes.
- No new events.
- No foreign state writes.
- No filterDock, Sicht, widget, history, CSS, core Cognos API, contract/rules, TEST, bootstrap or legacy edits.
- No `updateFilter` fallback in `applyDienststelleDefault`.
- No `replaceFilterContext` in wait/readiness helpers.
- No write-ready probe.
- No fixed 3000ms or other blind minimum delay.
- No variables named `chain`, `tmp`, `result2`, or similar meaningless flow names.
- New helpers must be small and single-purpose.

Line limits:

| File | Limit |
|---|---:|
| `listDashboardTabScopeIds.js` | 60 |
| `awaitDienststelleHostPostClearReady.js` | 120 |
| `reconcileDienststelleHostScopes.js` | 180 |

If a limit cannot be met cleanly, stop and report instead of producing large code.

---

## 4. Allowed Files

Allowed to modify:

```txt
KDB3/js/dashboard/filters/dienststelle/effects/readDienststelleHostSelection.js
KDB3/js/dashboard/filters/dienststelle/effects/resolveDienststelleDefaultTargets.js
KDB3/js/dashboard/filters/dienststelle/effects/reconcileDienststelleHostScopes.js
KDB3/js/dashboard/filters/dienststelle/effects/applyDienststelleDefault.js
KDB3/js/dashboard/filters/dienststelle/effects/reconcileConfirmedDienststelle.js
KDB3/js/dashboard/filters/dienststelle/effects/buildVisualizationWidgetDienststellePayload.js
KDB3/js/dashboard/filters/dienststelle/effects/awaitDienststelleHostCommitSettle.js
```

Allowed to create:

```txt
KDB3/js/dashboard/filters/dienststelle/effects/listDashboardTabScopeIds.js
KDB3/js/dashboard/filters/dienststelle/effects/awaitDienststelleHostPostClearReady.js
```

---

## 5. Required Flow

The user OK path must be:

```txt
routeDienststelleDispatch
  -> runDienststelleReconcile
  -> reconcileConfirmedDienststelle
  -> reconcileDienststelleHostScopes
      1. awaitDienststelleHostCommitSettle for user OK
      2. choose mode from settled global value
      3. if mode === "userCommit": awaitDienststelleHostPostClearReady
      4. walkPageScopes
      5. apply defaults through applyDienststelleDefault only
      6. finish reconcile / SYNC_REQUESTED
  -> defer visualizationWidget notify by 600ms for user OK
```

Do not move default application outside reconcile. Do not add a second reconcile. Do not add a second history step.

---

## 6. File Specifications

### 6.1 `listDashboardTabScopeIds.js`

Role: list dashboard tab scopes.

Rules:

- Import nothing.
- Read `_KDB.cognosAPI.tabs.getTabsContainers()`.
- Read `_KDB.config.tabs`.
- Sort config keys numerically.
- Include only entries whose role is `"dashboard"`.
- Return `{ scopeId, normalizedScopeId }` where `scopeId` is `layoutItems[index].id`.
- Do not use `from`, child item ids, DOM ids, or `_tabpanel` suffix for writes.

### 6.2 `readDienststelleHostSelection.js`

Add only small helpers if not present:

- `normalizeScopeId(scopeId)`
- `resolveRawPageContextScope(_KDB, activeFilterKey, canonicalScopeId)`

`resolveRawPageContextScope` maps canonical layout scope to raw Cognos host scope by normalized equality against `listPageContextScopes`. Keep existing exact-match `lookupFilterApi` behavior.

### 6.3 `resolveDienststelleDefaultTargets.js`

Role: decide what to preserve and what to default.

Return:

```js
{
  candidateScopes: [],
  checkedScopes: [],
  targetScopes: [],
  existingValuesByScope: {}
}
```

Rules:

- Global user commit candidates: all dashboard tab scopes.
- PageContext user commit candidates: only confirmed `context.scopeId`.
- Map canonical candidates to raw host scopes.
- Read via `lookupFilterApi` + `readFilterValues`.
- Missing `filterApi` is warned and is not treated as empty.
- Existing values go to `existingValuesByScope`.
- Empty readable values (`readFilterValues(...) === null`) go to `targetScopes`.
- Do not use current/visible tab filtering for global user commit.

### 6.4 `awaitDienststelleHostPostClearReady.js`

Role: read-only readiness gate immediately before pageContext writes.

Constants:

```js
var POLL_INTERVAL_MS = 50;
var TIMEOUT_MS = 8000;
var REQUIRED_STABLE_READS = 6;
var QUIET_MS_AFTER_STABLE = 400;
```

Required steps:

1. Global host value is `null`.
2. Target scope list is stable for `REQUIRED_STABLE_READS`.
3. Every `targetScope` has a `filterApi`.
4. Every `targetScope` reads `null`.
5. After stable reads, wait `QUIET_MS_AFTER_STABLE`.

Important:

- Validate `targetScopes`, not every checked dashboard scope.
- Existing/restored values in `existingValuesByScope` are preserved and do not block readiness.
- If `targetScopes.length === 0` and there are existing/checked scopes, return ready; no default apply will occur.
- If `targetScopes.length === 0` and nothing was checked/observed, do not return ready.
- Missing global API or target API is not ready.
- Use `_KDB.utils.waitFor` if available.
- On timeout, return `{ timedOut: true, stableReadCount }`; do not throw through dispatch.

Required labels:

```txt
[dienststelle.awaitHostPostClearReady.start]
[dienststelle.awaitHostPostClearReady.done]
[dienststelle.awaitHostPostClearReady.timeout]
```

Forbidden in this file:

- `replaceFilterContext`
- `updateFilter`
- `applyDienststelleDefault`
- write-ready probe
- fixed 3000ms delay

### 6.5 `reconcileDienststelleHostScopes.js`

Rules:

- Import both settle helpers:
  - `awaitDienststelleHostCommitSettle`
  - `awaitDienststelleHostPostClearReady`
- Run commit-settle before mode selection for user OK.
- Run post-clear readiness only in `userCommit` mode and immediately before `walkPageScopes`.
- If post-clear readiness times out or has fewer than `REQUIRED_STABLE_READS`, do not apply defaults.
- A readiness failure is not success:
  - return a reconcile result with `readinessFailed: true`;
  - dispatch an owner-visible error/status action if available;
  - do not schedule widget notify for that result.
- `source: "tableData"` must not enter startup global-default behavior after a user clear. Treat tableData reconcile as sync/read-only unless the context is explicit startup/Sicht init.
- The live `TABLE_DATA_CHANGED` producer and router must deliver that `source`. A truthy `{ tableName, rowCount }` payload must not drop it. `payload.source === undefined` must not wipe the type default.
- Keep default writes only through `_applyDefault`.
- Do not default global on user global clear.

### 6.6 `applyDienststelleDefault.js`

Single write boundary:

- require `context.filterApi`;
- require `_KDB.cognosAPI.filters.replaceFilterContext`;
- call only:

```js
filtersApi.replaceFilterContext(filterApi, [{ d: defaultValue.displayValue, u: defaultValue.useValue }])
```

Return `defaultValue` on success, `null` on failure/missing inputs. No `updateFilter`, no `getFilterConfig`, no Sicht lookup.

### 6.7 `reconcileConfirmedDienststelle.js`

Rules:

- Notify widget only after successful reconcile.
- For user OK, defer notify by 600ms and log:

```txt
[dienststelle.visualizationWidget.dispatch.deferred]
```

- Do not notify if reconcile result has `readinessFailed === true` or no effective selection.
- Do not notify from wait helpers.

### 6.8 `buildVisualizationWidgetDienststellePayload.js`

Rules:

- If global `dominantValues` has a value, payload scope is global.
- If effective value comes from `pageContextValuesByScope`, payload scope is pageContext with that actual scope id.
- Do not let a global handoff override a pageContext-only effective selection.
- No debug logs.

---

## 7. Acceptance Matrix

| Scenario | Expected |
|---|---|
| Global clear | Global remains empty; empty dashboard pageContext tabs default; existing/restored tab values preserved. |
| PageContext clear | Only confirmed tab defaults when global is empty. |
| Mixed tabs | Existing values preserved; empty tabs defaulted; no cross-tab copy. |
| Wait helpers | Read-only; no filter writes, no write-ready probe. |
| Apply path | Exactly one `replaceFilterContext` per target scope through `applyDienststelleDefault`. |
| Widget notify | One deferred notify after successful user OK; none on readiness failure. |
| TableData | No startup global default after user global clear. |
| Cognos stability | No table/widget render cancellation errors after global clear + auto-default. |
| History | One user commit step; no extra history step. |

---

## 8. Review Checklist

Before final report:

1. No forbidden files touched.
2. Line limits respected.
3. Wait helpers contain no write calls.
4. `applyDienststelleDefault` contains no `updateFilter`.
5. Global user commit uses dashboard tabs from config/layout.
6. Post-clear readiness validates `targetScopes`, not all checked scopes.
7. Existing values do not block readiness.
8. Timeout skips defaulting and suppresses widget notify.
9. TableData reconcile cannot global-default after user clear.
10. AMD imports resolve.
11. ReadLints clean.

---

## 9. Final Report

Report:

1. Files touched and line counts.
2. Exact user OK flow.
3. Confirmation wait helpers are read-only.
4. Confirmation single apply path.
5. Confirmation dashboard tab scope source.
6. Confirmation widget defer and readiness-failure suppression.
7. Confirmation tableData global-default guard.
8. S1/S2/S5 reasoning.
9. Lint result.
10. Manual Cognos smoke checklist.

---

End of spec.

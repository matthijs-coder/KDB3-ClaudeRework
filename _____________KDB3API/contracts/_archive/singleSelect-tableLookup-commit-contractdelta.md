# singleSelect tableData-first commit lookup contractdelta

**Status:** CP-1 approved for execution  
**Date:** 2026-05-24  
**Relation:** Refines `singleSelect.md`, supersedes F6c/F6d `getValues()` discovery ladder in `resolveCommitFilterValue.js`. Commit order aligned with F6 native-click removal baseline (`singleSelect-f6-native-click-removal-fix-spec.md`, accepted 2026-05-26).

---

## 1. Purpose

Replace fragile Cognos `getValues()` pre/post-OK value discovery with deterministic lookup from configured `single_select_options` tableData rows for normal singleSelect filters.

## 2. Commit order

1. Resolve Cognos filter API.
2. If popup mount exists: `syncPopupOptionSelection` (visual `.KDB_selectedOption` class sync only; no native option clicks).
3. Pending `"Alle"` → `replaceFilterContext(filterApi, [])`.
4. Else:
   - map `filterLabel` → table key via `resolveFilterOptionsTableKey`;
   - read shaped rows from `_KDB.services.tableData.readRows` / bounded `waitForRows`;
   - match pending display label against row cell `display`;
   - build Cognos value `{ d: display, u: use }`;
   - `replaceFilterContext(filterApi, [value])`.
5. Strict `verifyCommitFilterValue(filterApi, pendingLabel)` — commit fails and rolls back if verify fails.
6. Apply confirmed state from table `use` value (not from constructed label fallback).
7. Owner notification and history push (unchanged scope).
8. Close popup via existing filterDock-owned request in `finally` (success only).

**F6 native-click removal (accepted baseline, 2026-05-26):** commit no longer calls `syncNativePopupToPending`. Cognos values are applied only through `replaceFilterContext`; visual popup state through `syncPopupOptionSelection`.

## 3. Table key mapping

Explicit:

| filterLabel | tableKey |
|---|---|
| Berufsfamilie | berufsfamilie_filter |
| Dienstverhältnis | dienstverhaeltnis_filter |
| Geschlecht | geschlecht_filter |
| Altersgruppe | altersgruppe_filter |
| Personengruppe | personengruppe_filter |
| Dienststellenleitung | dienststellenleitung_filter |

Default: lowercase normalized label + `_filter`.

## 4. Row shape

Configured tables use `shape: "row"` and `pick: [{ display: "d" }, { use: "u" }]`.

Expected shaped row:

```js
{ "<ColumnName>": { display: "<label>", use: "<TM1 member key>" } }
```

Parser compares normalized `cell.display` to pending label; returns `{ d, u }`.

## 5. Fallback policy

- CP-1: table lookup is required for configured filters.
- Table not ready, missing config, or label not found → fail clearly, rollback prior confirmed selection.
- Forbidden: `{ u: label, d: label }` construction; postSync/postOk `getValues()` discovery ladder.

## 6. Removed

- `resolveCommitFilterValue.js` (postSync / postOk / constructed phases).
- `constructValueFromLabel` and `readKnownUseValue` helpers.
- `[singleSelect.applyPending]` debug logs.

## 7. Preserved

- `syncPopupOptionSelection` (visual popup class sync before commit).
- Strict `verifyCommitFilterValue` post-commit safety check (verify-downgrade is a separate future CP decision).
- `singleSelect/filterDockPopupReady` sync-only behavior (F6/F6b).
- No `_KDB.runtime.filterDock` reads from singleSelect.
- No new events; no tableData state writes from singleSelect.

## 7.1 Removed (F6 native-click removal, accepted baseline)

- `syncNativePopupToPending.js` — commit-only native Cognos option clicks; deleted after smoke passed 2026-05-26.
- `clickNativePendingOption.js` — obsolete commit discovery helper (if still absent, no restore).

## 8. Acceptance

| Case | Expected |
|---|---|
| Geschlecht Alle → weiblich, OK | commits weiblich with real TM1 `u` |
| Geschlecht weiblich → männlich, OK | commits männlich with real TM1 `u` |
| Alle path | `replaceFilterContext([])` |
| Reopen popup | only committed option selected |
| Rapid A/B then OK | latest pending commits |
| Table not ready | clear failure + rollback |
| F6/F6b | no popupReady flood; no duplicate confirm |

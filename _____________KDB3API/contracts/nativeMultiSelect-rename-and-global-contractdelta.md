# Contract Delta: rename `pageContextPlain` → `nativeMultiSelect` + global scope

> One tranche: mechanical owner rename **and** claim/GET/SET of kale filters on **global and page-context** scopes (sels-pattern). On conflict, `writeback.md` wins. v3 key `filt.pcfs` is unchanged.

---

**Status:** `Approved` — Grok 4.6 high 2026-08-15 (approve-with-fixes; F1–F6 applied). Composer may start.
**Supersedes:** `pageContextPlain.md` name/scope exclusions; P1 “`tab` required”; P0 “no global-scope items” for GET/SET/claim only (tab-CRUD still page-only). **This delta wins over P1 ‘`pcfs` is present’ wording in writeback step 18** (page-preactivate is page-`tab` `pcfs` only).
**PO GO:** 2026-08-15 — dual-scope like other filter owners; rename with the same step.
**Authoring AI:** planner, 2026-08-15

---

## 1. Rename (mechanical, no behaviour except §2)

| Old | New |
|---|---|
| Folder `dashboard/filters/pageContextPlain/` | `nativeMultiSelect/` |
| `_KDB.api.pageContextPlain` | `_KDB.api.nativeMultiSelect` |
| `_KDB.state.filters.pageContextPlain` | `_KDB.state.filters.nativeMultiSelect` |
| `_KDB.runtime.pageContextPlain` | `_KDB.runtime.nativeMultiSelect` |
| Action prefix `pageContextPlain/` | `nativeMultiSelect/` |
| Phase `pageContextPlainRestore` | `nativeMultiSelectRestore` |
| Saga/writeback owner string `"pageContextPlain"` | `"nativeMultiSelect"` |
| `PAGE_CONTEXT_PLAIN_*` error codes | `NATIVE_MULTI_SELECT_*` |
| Contract files `pageContextPlain*.md` | `nativeMultiSelect*.md` |

**Keep:** `filt.pcfs`, `validatePcfs.js`, `normalizePcfs.js` (schema bucket, not owner name).

**Must-hit owner literals** (missed string = tab-CRUD/SET abort): `KDB.js` AMD+mount/destroy; `runTabMutationSaga.js` (all owner lists); `dispatchOwnerTabMutation.js` `buildOwnerPayload`; `runNewDashboardReset.js`; `dispatchFilterClearPhases.js`; `runFilterRestore.js`; `restoreConstants.js`; GET `collectPageContextPlain.js` → `collectNativeMultiSelect.js` + `collectFilters.js`.

After rename, **delete** the old folder and leave `contracts/pageContextPlain.md` as a 10-line superseded stub pointing here.

## 2. Dual scope (behaviour)

Same owner as `singleSelect`/`dienststelle`: **global and page-context**.

| | Global | Page-context |
|---|---|---|
| v3 | `{ nm, vals }` — `tab` omitted | `{ nm, tab, vals }` |
| Identity | `"global\|" + trimmed(nm)` | `String(tab) + "\|" + trimmed(nm)` |
| Host enum | `getAllGlobalFilterItems()` | `getAllPageContextFilterItems()` filtered by live scope |
| Claim | `readClaimDefinition(..., "global", ...)` | `readClaimDefinition(..., "pageContext", ...)` then same unowned predicates as P0 |
| SET | `scopeId = "global"`; no tab pre-activate | existing tabIdx → scopeId; pre-activate listed tabs |
| Tab-CRUD | **do not permute** (no tab slot) | unchanged P0 dest-skip |

Reducer **allows** `byScope.global`. Tab-mutation prepare still walks only `tabIdxToScopeId` slots — never writes global.

Host write remains `replaceFilterContext` only. Dest-skip unchanged. Do not create host items. Do not change `classifyFilterInstance.js`.

## 3. GET

`collectWritebackSnapshotRequested` is still host-enumerate, read-only.

1. **Always** enumerate global claimed items with non-empty `{d,u}` → `{ nm, vals }` (no `tab`).
2. If `tabIdxToScopeId` is a usable object, also emit page entries as today.
3. If tab targets are missing: still return global entries; diagnostic skip for page; **do not** return `entries: []` solely because targets are missing.
4. Duplicate identity: first wins + `WRITEBACK_SKIPPED_BY_DESIGN`.

Collector file: `collectNativeMultiSelect.js`. Dispatch `_KDB.api.nativeMultiSelect`. No AMD import of the owner folder.

## 4. SET

- `validatePcfs`: `tab` **optional**. If present, non-negative integer. Identity as §2. Unknown fields still invalid.
- `needsPageTargets` / `collectPageContextTabIdx`: only `pcfs` entries **with** `tab` (plus sels page / `dstl.byTab`). Global-only `pcfs` must not require tab targets.
- Clear when `filt.pcfs` present: complete snapshot — clear claimed kale on **global and** every live page scope in `tabIdxToScopeId`. `newDashboard` without targets: enumerate unowned global **and** page-context items.
- Restore: one phase `nativeMultiSelectRestore` (no `degradedAllowed`). Owner splits `tab` vs no-`tab`. Missing dest → `{ ok: true, degraded: true }`. Hard throw / missing page tab target → `{ ok: false }`.
- Orchestrator owner string and action types use `nativeMultiSelect`.

## 5. Out of scope

Creating host items; `writebackMap`; `classifyFilterInstance`; tbl/topn; `sichtChange`; header icon; consolidation refactor; new `_KDB.*` namespaces; renaming `filt.pcfs`.

## 6. Acceptance (Cognos)

1. Global kale multi-select: GET emits `filt.pcfs` **without** `tab`; `set(get())` restores it.
2. Page-context kale: still GET/SET with `tab`; tab delete/move/duplicate still follow content (P0 dest-skip).
3. `filt.pcfs` with mixed global + page entries round-trips both.
4. SET `filt` without `pcfs` does not clear kale (global or page).
5. `newDashboard` clears both scopes.
6. After rename: no remaining `_KDB.api.pageContextPlain` / saga `"pageContextPlain"`.

---

## Approval Log

| Date | Status | Notes |
|---|---|---|
| 2026-08-15 | Approved | Grok F1 GET global without targets; F2 needsPageTargets last conjunct only; F3 clear always includes global; F4 restore split not groupByTab(undefined); F5 tab-mutation skip global scopeId |

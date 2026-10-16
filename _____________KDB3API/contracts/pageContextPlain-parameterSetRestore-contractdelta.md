# Contract Delta: `pageContextPlain` parameterSet GET/SET (`filt.pcfs`)

> Delta on `pageContextPlain.md` and `writeback.md` §4.3 / §4.6 / §4.7 / §6.3 / §6 step 18–19 / §7. P1 only: kale **page-context** filter values round-trip through v3. On conflict, `writeback.md` wins.

---

**Status:** `Approved` — Grok 4.6 high cross-review 2026-08-14 (approve-with-fixes; F1–F7 applied). Composer build may start.
**Owner module:** `pageContextPlain`
**Type:** `feature module contract delta`
**Authoring AI:** planner, 2026-08-14
**Depends on:** P0 Cognos-green (`pageContextPlain-tabMutation-contractdelta.md`), `writeback.md`, `tabs-filterScopeSelectors-contractdelta.md`
**PO GO:** 2026-08-14 (P1 GET/SET; binding recommendations in planner handoff)

---

## 1. Purpose

Persist kale Cognos page-context filter values (unowned by sicht / singleSelect / dienststelle / specialSingleSelect) in v3 as `filt.pcfs[]`, and restore them on `writebackSet` without creating host items and without a warm owner reconcile.

P0 `byScope` is filled only during tab-mutation apply. GET must **not** read cold `getState().byScope`. GET enumerates the live host through the owner claim helper.

## 2. v3 shape

```js
filt.pcfs: [
  { nm: "Region", tab: 2, vals: [{ d: "Wien", u: "W" }, { d: "NÖ", u: "N" }] }
]
```

| Field | Rule |
|---|---|
| `nm` | Required non-empty string. Host `itemName` / `getFilterItemLabel`. Parallel to `sels.key`. Trimmed for identity. Case-sensitive. |
| `tab` | **Required** non-negative integer tab index. Page-context only. Absent `tab` is **invalid in P1** (schema-ready for a later global-kale tranche; P1 does not emit or accept it). |
| `vals` | Required non-empty array of `{ d, u }`. Both `d` and `u` are required non-empty strings. Multi-select. Not `sels`’ single use-string array. |
| identity | `tab + "|" + trimmed(nm)`. Duplicates fail `validateV3`. |
| omit | Omit empty items; omit `pcfs` entirely when none remain. |
| forbidden | `itemId`, `sourceId`, `scopeId`, `key`, `inst`, and any other extra field. No ID-ban exception. |

Do **not** put kale entries in `filt.sels`. `sels` requires a semantic mapping key, single-select `vals` of use-strings, and inventory. Kale is host-named, multi `{ d, u }`, owner `pageContextPlain`.

**Display-value exception:** `writeback.md` §4.3 “Do not store display values” does **not** apply to `filt.pcfs`. Kale has no parameter mapping from which `d` can be derived; `replaceFilterContext` needs both `d` and `u`. This is the only approved display-value store in `filt`.

## 3. GET

- Collector: `writeback/get/collectors/collectPageContextPlain.js`, wired from `collectFilters.js` after `liveTabTargets` is resolved (same position as `dstl`/`sels` — after targets, independent of sicht).
- Collector must **not** AMD-import `dashboard/filters/pageContextPlain/**`. It dispatches the public owner API.
- If `liveTabTargets` is null (targets collector failed), omit `pcfs` and emit `WRITEBACK_SKIPPED_BY_DESIGN` (do not throw).
- Dispatch (synchronous):

```js
_KDB.api.pageContextPlain.dispatch({
  type: "pageContextPlain/collectWritebackSnapshotRequested",
  payload: { tabIdxToScopeId: liveTabTargets, source: "writebackGet" }
})
```

- Owner walks each `tabIdx` in `tabIdxToScopeId`, reads `scopeId` from the target object (`tabTargets` value shape), calls `listUnownedPageContextItems(_KDB, scopeId)` (same claim as P0 prepare).
- Emit `{ nm, tab, vals }` only when `nm` is non-empty after trim **and** at least one value pair has non-empty `d` and `u` (stringify, trim). Drop empty pairs; drop the item if none remain.
- Duplicate `tab|nm` on the host: keep the first enumeration order, skip extras, diagnostic `WRITEBACK_SKIPPED_BY_DESIGN`.
- Unmappable / empty `scopeId`: skip that tab, diagnostic `WRITEBACK_SKIPPED_BY_DESIGN`.
- Collect is **read-only**: no reducer write, no `byScope` warm-up, no `parameterSetRunId` bump, no `runId` required.
- Return `{ ok: true, entries, diagnostics }`. Collector copies `entries` into `filt.pcfs` when `entries.length > 0`; forwards owner diagnostics.

## 4. SET — orchestrator

Reuse existing restore plumbing. Not a new framework.

| Site | Change |
|---|---|
| `filterRestoreTargets.collectPageContextTabIdx` | Third argument: `filt.pcfs`. Union `pcfs[].tab` into the pre-activate list. |
| `needsPageTargets` | True when page-sels exist **or** `dstl.byTab` **or** `filt.pcfs` is a non-empty array. |
| Step 15 clear | Dispatch `pageContextPlain/parameterSetClearRequested` **only when `filt.pcfs` is present** (dstl-style; omitted `pcfs` means do not touch kale). Payload `{ status, tabIdxToScopeId, runId, skipHistory: true }`. Required; failure `WRITEBACK_FILTER_CLEAR_FAILED`. |
| Step 18 pre-activate | `filt.pcfs[].tab` joins the existing activate loop (same `tabs/parameterSetActivateTabRequested`, `includeHiddenDashboardTabs: true`). |
| After step 19, before step 20 | `pageContextPlain/parameterSetRestoreRequested` when `filt.pcfs` is present. Payload `{ filters: v3.filt.pcfs, tabIdxToScopeId, source, runId, skipHistory: true }`. **No** `inventoryGeneration`, **no** `phase`, **no** Dienststelle hierarchy. Required. Orchestrator: `required: true` and **do not** set `degradedAllowed` (live `dispatchOwnerPhase` coerces every `ok: false` to degraded when that flag is set, which would swallow hard host-write failure and missing-tab abort). Owner dest-skip parity: `{ ok: true, degraded: true }` plus `WRITEBACK_SKIPPED_BY_DESIGN`. Hard host-write throw: `{ ok: false }` → abort `WRITEBACK_FILTER_RESTORE_FAILED`. Missing tab target: `{ ok: false }` → abort `WRITEBACK_TABS_TARGET_MISSING`. Do not add `degradedAllowed` on clear either; clear dest-skip is also `{ ok: true, degraded: true }`. |
| `newDashboard` | Add `"pageContextPlain"` to the existing clear-owner loop (`required: false`). |

`dispatchOwnerPhase` already injects `source: "writebackSet"`, `runId`, `skipHistory`.

## 5. SET — owner

### 5.1 Actions

| Type | Role |
|---|---|
| `pageContextPlain/parameterSetClearRequested` | Clear claimed kale items on live page-context scopes, then write `byScope[scopeId] = []`. |
| `pageContextPlain/parameterSetRestoreRequested` | Lookup by **name + live scope** (claimed items only), `replaceFilterContext`, write `byScope` for restored scopes. |
| `pageContextPlain/collectWritebackSnapshotRequested` | GET snapshot (sync, read-only). |

Controller routes **parameterSet (clear/restore) before** the tab-mutation branch; collect before generic `dispatchInternal`. Disposed controller returns `{ ok: false, diagnostics: [{ code: WRITEBACK_RESTORE_CANCELLED }] }` for parameterSet; collect returns `{ ok: true, entries: [], diagnostics: [] }`.

### 5.2 Runtime

- Add `parameterSetRunId: 0` next to existing `tabMutationRunId`. Separate counters. Tab-mutation must not bump `parameterSetRunId` and vice versa.
- `guardRun` / `isStale`: copy dienststelle semantics (`runId` numeric; stale if `runId < parameterSetRunId`; then set `parameterSetRunId = runId`). Collect does not use this guard.
- Cleanup / orchestrator init zero `parameterSetRunId`.
- No reconcile. No history. No events. No `skipHistory` owner-side special case beyond ignoring history (owner has no history contribution).

### 5.3 Clear semantics (full snapshot when `pcfs` present)

When `filt.pcfs` is present, `pcfs` is the **complete** kale page-context snapshot (sels-like, not dstl-byTab-only):

1. If `tabIdxToScopeId` is a non-empty object: for each target with a non-empty `scopeId`, `listUnownedPageContextItems`, `replaceFilterContext(item, [])` via **itemId + scope** lookup (`lookupPlainFilterApi`, P0). Missing host item → skip + `console.warn` (same as P0 dest-skip). Throw → `ok: false`.
2. If `tabIdxToScopeId` is missing/empty (`newDashboard`): enumerate `getAllPageContextFilterItems()`, keep items that pass `isUnownedPageContextItem` **and** are not global (`scope !== "global"` after strip `_tabpanel`), clear those. Same skip/throw rules.
3. After host clears, reducer-write `byScope[scopeId] = []` for every scope that was targeted (reuse internal `pageContextPlain/tabMutationScopeWrite` with `clear: true` — no second reducer action).

### 5.4 Restore semantics

1. Group `payload.filters` by `tab`. Resolve `scopeId` from `tabIdxToScopeId[String(tab)]`. Missing scope → diagnostic `WRITEBACK_TABS_TARGET_MISSING`, `ok: false` (orchestrator already asserted; this is belt-and-suspenders).
2. Lookup: `lookupPlainFilterApiByName(_KDB, nm, scopeId)` — match trimmed label, stripped scope, **and** `isUnownedPageContextItem`. First host match wins. Must not write a sicht/singleSelect/dienststelle/special item that happens to share a label.
3. Missing host item → skip + `console.warn` + diagnostic `WRITEBACK_SKIPPED_BY_DESIGN` + `degraded: true`. Do **not** create Cognos filter items.
4. `replaceFilterContext` throw → diagnostic `WRITEBACK_FILTER_RESTORE_FAILED`, `ok: false`.
5. After all entries for a scope: reducer-write that scope’s applied items `{ itemId, itemName, sourceId, values }` from the live lookup (so P0 tab-mutation `byScope` stays usable after SET). Scopes cleared but not restored stay `[]`.
6. Return `{ ok, degraded, appliedScopes, skipped, diagnostics }`. `ok: true` when no hard failure; `degraded: true` when any dest skip occurred.

### 5.5 Host write

Only `replaceFilterContext`. Do not call `clearPageContextFilter`. Do not change `classifyFilterInstance.js`.

## 6. Schema (same tranche — required)

Without this, GET emitting `pcfs` is rejected as `WRITEBACK_INVALID_V3_PAYLOAD`.

- `validateFilt` whitelist: `sicht | dstl | sels | pcfs`.
- `validatePcfs`: array of plain objects; `nm` non-empty string; `tab` required non-negative integer; `vals` non-empty array of `{ d, u }` non-empty strings; unknown fields invalid; duplicate `tab|nm` invalid; **absent `tab` invalid**.
- `normalizeFilt`: omit empty `pcfs`; omit entries whose `vals` become empty; trim `nm` / `d` / `u`; preserve wrong types for validate. Empty-entry omission may emit `WRITEBACK_FILTER_KIND_UNSUPPORTED` (sels precedent).
- Split new validate/normalize helpers into sibling files so `validateFilters.js` / `normalizeFilters.js` stay ≤150 lines.

## 7. Legacy map (contract only in this tranche)

When `writebackMap` is implemented, kale entries in legacy `tabs[index].pageContextFilterObjArr` map to `filt.pcfs[]` with `tab: <tabIdx>`, **not** to `filt.sels`. Dienststelle items in that array still map to `filt.dstl.byTab`; mapped single-select items still map to `filt.sels`.

P1 **does not implement** `writebackMap`. The map service currently has no `pageContextFilterObjArr` handling. This delta only amends `writeback.md` §7 so the future map cannot dump kale into `sels`.

## 8. Out of scope (P1)

- Global kale (`tab` omitted / `scope === "global"`). Same `pcfs[]` bucket later; not a second key.
- Creating missing dest host items.
- Warm reconcile / filling `byScope` on GET.
- Folding kale into `sels` or `dstl.byTab`.
- `classifyFilterInstance.js` / silencing `HOST_ITEM_UNKNOWN`.
- filterDock, history, Alle/useValue, inventoryGeneration, Sicht coupling.
- Tab-mutation consolidation refactor.
- New top-level `_KDB.*` namespaces.
- Changing P0 dest-skip / tab-CRUD apply paths except reuse of `lookupPlainFilterApi` and `listUnownedPageContextItems` / `isUnownedPageContextItem`.

## 9. Acceptance (Cognos)

1. Dashboard with kale page-context values: `writebackGet` emits `filt.pcfs` with `nm` + `tab` + `{d,u}` vals; no kale in `sels`.
2. `set(get())` restores those values on the same tabs when dest host items exist.
3. Empty kale → `pcfs` omitted; `validateV3` accepts payloads with or without `pcfs`.
4. Payload with unknown `filt.pcfs` extra fields or missing `tab` → `WRITEBACK_INVALID_V3_PAYLOAD`.
5. SET toward a tab whose kale host item is missing → restore continues (`degraded`); tab-CRUD move/duplicate still work (P0 dest-skip unchanged).
6. Omitted `filt.pcfs` on a SET that has other `filt` fields does **not** clear kale.
7. `newDashboard` clears kale page-context values (non-fatal if host missing).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-08-14 | Draft | planner | P1 from PO-accepted recommendations; GET host-enumerate because `byScope` is cold |
| 2026-08-14 | Approved | planner after Grok 4.6 high | F1 no `degradedAllowed` on restore; F2 complete-snapshot in writeback.md; F3 normalize keep extra keys; F4 `pageContextPlainRestore` phase name; F5 host-clear before reducer; F6 tab-CRUD GET list; F7 tree/cleanup |

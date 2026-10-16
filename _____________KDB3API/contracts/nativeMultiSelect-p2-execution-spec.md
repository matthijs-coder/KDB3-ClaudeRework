# Execution Spec: `nativeMultiSelect` (rename + global scope)

> Copy `pageContextPlain` → `nativeMultiSelect`, then apply dual-scope. Do not invent architecture. Planner pre-accepts Section A echo: echo summaries then implement **same turn**.

---

**Status:** `Implemented` — Composer 2.5 2026-08-15; planner F1–F5 review pass.
**Contracts:** `nativeMultiSelect.md`, `nativeMultiSelect-rename-and-global-contractdelta.md`, `writeback.md` §4.3
**Executing AI:** Composer 2.5
**Reviewer:** Composer 2.5 initial; planner final

---

## Section A. Pre-flight

Read then echo one sentence each:

1. `.cursor/rules/kdb-object.mdc`
2. `.cursor/rules/state.mdc`
3. `.cursor/rules/runtime.mdc`
4. `.cursor/rules/module-public-api.mdc`
5. `.cursor/rules/feature-structure.mdc` — JS ≤150; orchestrator ≤120; controller fn ≤60; AMD imports ≤10
6. `.cursor/rules/amd.mdc`
7. `.cursor/rules/naming.mdc`
8. `.cursor/rules/error-handling.mdc`
9. `contracts/nativeMultiSelect.md`
10. `contracts/nativeMultiSelect-rename-and-global-contractdelta.md`
11. `contracts/writeback.md` §4.3 pcfs + §6.3 kale row
12. This spec
13. `KDB.js` mount/destroy of pageContextPlain
14. `tabs/actions/runTabMutationSaga.js` owner lists

Reference (read, copy, then delete old folder): entire `dashboard/filters/pageContextPlain/`.

---

## Section B. Work order

1. **Copy** `KDB3/js/dashboard/filters/pageContextPlain/` → `nativeMultiSelect/`.
2. **Rename files** inside the new folder per `nativeMultiSelect.md` §6 (controller, orchestrator, reducer, ensure/cleanup runtime, claim helpers). Keep action filenames (`prepareTabMutation.js`, `parameterSetClear.js`, …).
3. **String-replace inside the new folder:** `pageContextPlain` → `nativeMultiSelect`; `PageContextPlain` → `NativeMultiSelect`; `PAGE_CONTEXT_PLAIN` → `NATIVE_MULTI_SELECT`; log prefixes; AMD paths to renamed files (`isUnownedPageContextItem` → `isUnownedNativeMultiSelectItem`, `listUnownedPageContextItems` → `listUnownedNativeMultiSelectItems`, `lookupPlainFilterApi` → `lookupNativeMultiSelectApi`, `lookupPlainFilterApiByName` → `lookupNativeMultiSelectApiByName`).
4. **Apply behaviour patches** in Section C (global claim/GET/SET/reducer).
5. **Patch external JS** in Section C2.
6. **Delete** `dashboard/filters/pageContextPlain/` entirely. Grep `pageContextPlain` under `KDB3/js` — zero hits except comments forbidden; fix leftovers.
7. **Do not** rename `filt.pcfs` / `validatePcfs.js` / `normalizePcfs.js`.

Line limits: 150 / 120 / 60. Split if needed; no new architecture.

---

## Section C. Behaviour patches (new folder)

### C1. `effects/isUnownedNativeMultiSelectItem.js`

Remove `if (!scope || scope === "global") return false`.
- Empty scope (after trim) still `return false`.
- `scopeType = (stripTabpanel(scope) === "global") ? "global" : "pageContext"`.
- `readClaimDefinition(_KDB, scopeType, itemName, itemId)` — keep all other unowned predicates (dienststelle name, hierarchy, singleSelect, missing flags).
- Empty itemId still unclaimed.

### C2. `effects/listUnownedNativeMultiSelectItems.js`

`listUnownedNativeMultiSelectItems(_KDB, _scopeId)`:
- `target = stripTabpanel(_scopeId)`.
- If `target === "global"`: `filtersApi.getAllGlobalFilterItems()` (if missing, `[]`).
- Else: `getAllPageContextFilterItems()`, keep items whose stripped scope equals `target`.
- Keep only `isUnownedNativeMultiSelectItem`. Same return shape `{ itemId, itemName, sourceId, values }`.

### C3. `effects/lookupNativeMultiSelectApi.js` and `...ByName.js`

If stripped `_scopeId === "global"`, search `getAllGlobalFilterItems()`; else page-context inventory. ByName still requires `isUnownedNativeMultiSelectItem`. First match wins.

### C4. `state/createNativeMultiSelectReducer.js`

On `tabMutationScopeWrite`: allow `scopeId === "global"`. Still reject empty scopeId.

### C5. `actions/collectWritebackSnapshot.js`

Do **not** say “as today”. Replace the algorithm:

1. Delete any early-return that returns `entries: []` when `tabIdxToScopeId` is missing.
2. `entries = []; diagnostics = []; seen = {}`.
3. **Always** collect global first: `listUnownedNativeMultiSelectItems(_KDB, "global")` → `{ nm, vals }` (no `tab`); identity `"global|" + trimmed(nm)`; skip empty `nm` / empty `{d,u}`; duplicate → first wins + `WRITEBACK_SKIPPED_BY_DESIGN`.
4. If `tabIdxToScopeId` is a non-null, non-array object, append the page loop (`identity = String(tab) + "|" + nm`).
5. Else push a page skip diagnostic; **do not** clear `entries`.
6. `catch` must return already-collected `entries`, not `[]`.

### C6. `actions/parameterSetClear.js`

- `collectScopeIds`: **always** start with `["global"]`, then append page `scopeId`s from `tabIdxToScopeId` (skip empty; skip duplicate `"global"`).
- `listAllUnownedScopes` (no map / `newDashboard`): include `"global"` plus host-enumerated page-context unowned scopes (skip empty).
- Host-clear first, then reducer write per scope (including `"global"`). Failed item → no reducer write for that scope. Dest-skip stays `{ ok: true, degraded: true }`. Do not set `degradedAllowed` on orchestrator clear.

### C7. `actions/parameterSetRestore.js`

```js
var globalEntries = filters.filter(function (e) { return e && e.tab === undefined; });
var pageEntries = filters.filter(function (e) { return e && e.tab !== undefined; });
```

- Restore `globalEntries` with `scopeId = "global"`; **no** `tabIdxToScopeId` lookup; **no** `parseInt`; **no** `String(entry.tab)`. Missing host → dest-skip (`skipped` + `degraded: true`), not `TARGET_MISSING`.
- Run `groupByTab` **only** on `pageEntries`. Page missing `scopeId` → `{ ok: false }` `TARGET_MISSING`.
- `tab === 0` is page (`!== undefined`). Do not use `if (!entry.tab)`.
- Reducer write per scope, including `"global"`.

### C8. Tab-mutation files

Rename types/logs. In `tabMutationSupport.resolveScopeIdForSlot`, after a successful resolve, if `stripTabpanel(scopeId) === "global"`, return `{ ok: true, skip: true, scopeId: null }` (or equivalent). Callers (`prepareTabMutation.resolveAffectedScopes`, apply delete/move/duplicate, `resyncTabMutationHost`) **continue** without snapshot/apply/resync — do **not** abort the saga. Prepare still walks only plan tab slots; never `Object.keys(byScope)`.

---

## Section C2. External JS

### `KDB.js`

AMD path `__orchestratorNativeMultiSelect.js`; factory param; register/mount/destroy `_KDB.api.nativeMultiSelect`. Stay within KDB.js bootstrap exception (≤500).

### `runTabMutationSaga.js`

Replace every `"pageContextPlain"` owner-list entry with `"nativeMultiSelect"` (prepare, filterApply, all rollbacks, hostResync).

### `dispatchOwnerTabMutation.js`

`buildOwnerPayload` whitelist: `nativeMultiSelect` instead of `pageContextPlain`.

### `runNewDashboardReset.js`

Clear loop: `"nativeMultiSelect"` not `"pageContextPlain"`.

### `dispatchFilterClearPhases.js`

`owner: "nativeMultiSelect"`, type `nativeMultiSelect/parameterSetClearRequested`. Rename `includePageContextPlain` → `includeNativeMultiSelect`.

### `runFilterRestore.js`

- Replace **only** the last `needsPageTargets` conjunct (keep sels-page and `dstl.byTab`):

```js
const needsPageTargets = pageEntries.length > 0
  || _filterTargets.hasTabScopedDienststelle(filt.dstl)
  || pcfsEntries.some(function (e) { return e && e.tab !== undefined; });
```

Use `tab !== undefined` (sels-parallel). `tab: 0` is page. Do not replace the whole expression with only the pcfs `some`.
- `collectPageContextTabIdx`: already ignores undefined `tab` via `isTabIdx` — keep.
- Restore phase: `phaseName: "nativeMultiSelectRestore"`, `owner: "nativeMultiSelect"`, type `nativeMultiSelect/parameterSetRestoreRequested`. **No** `degradedAllowed`.
- Pass `includeNativeMultiSelect` when `filt.pcfs !== undefined`.

### `restoreConstants.js`

Replace `pageContextPlainRestore` with `nativeMultiSelectRestore` (same list position).

### GET collector

Rename `collectPageContextPlain.js` → `collectNativeMultiSelect.js`. Dispatch `nativeMultiSelect/collectWritebackSnapshotRequested` on `_KDB.api.nativeMultiSelect`. **Always dispatch.** Pass `tabIdxToScopeId: liveTabTargets` even when null (do **not** substitute `{}`). Keep a skip diagnostic when `!liveTabTargets`. If the owner API is missing, say the API is missing — do not reuse “live tab targets are missing.” Update `collectFilters.js` AMD + call + error label.

### `validatePcfs.js`

`tab` optional. If `tab !== undefined`, must be non-negative integer. Identity: `(entry.tab === undefined ? "global" : String(entry.tab)) + "|" + trimmed(nm)`. Entry must be a plain object `{ nm, tab?, vals }`. Allowed fields still `nm`, `tab`, `vals`.

### `normalizePcfs.js`

No change except keep copying every own key (P1 F3). Optional: diagnostic text “page-context-plain” → “native multi-select” (cosmetic).

---

## Section D–F

Reducer: `tabMutationScopeWrite` may set `byScope.global`. Collect writes nothing. Public API: `_KDB.api.nativeMultiSelect` only. No harness.

---

## Section J. Self-check

1. `KDB3/js` grep `pageContextPlain` / `PageContextPlain` / `PAGE_CONTEXT_PLAIN` → **zero**.
2. Grep `filt.pcfs` still present; `validatePcfs.js` exists.
3. Line limits; controller AMD ≤10; each controller fn ≤60.
4. `classifyFilterInstance.js` untouched; `writeback/map/**` untouched; P0 dest-skip in applyHostItem (now native apply) still skip+warn on missing dest.
5. Global-only SET: `needsPageTargets` last conjunct is false so tab resolve is not required. `assertRequiredLiveScopes` already no-ops on an empty tab list.
6. Restore dispatch has no `degradedAllowed`.
7. Old folder deleted.

---

## Section K. Forbidden

Contracts except as-built folder-list sync. Do **not** rename historical `pageContextPlain-p0-execution-spec.md` / `pageContextPlain-p1-execution-spec.md` / tabMutation delta filenames — leave them; stub only `contracts/pageContextPlain.md`. Do not edit `.mdc`. No `writebackMap`. No `filt.pcfs` rename. No commits. No tests/README. No new `_KDB.*`.

Planner **does** expect you to update these contract/doc strings if you touch JS owner names (keep docs in sync): `architecture/stateOwnership.md`; `contracts/writeback.md` owner strings / phase name / `tab` optional; `contracts/tabs-tabCrud-contractdelta.md` owner name; replace `contracts/pageContextPlain.md` with a stub “superseded by nativeMultiSelect.md”. Do not rewrite writeback §4.3 from scratch — only the kale/`tab`/owner-name sentences.

---

## Section L. Report

Pre-flight echo; file checklist with line counts; grep proof of zero `pageContextPlain` in `KDB3/js`; deviations; J pass/fail.

## Cognos (PO)

Global kale GET without `tab` + `set(get())`; page kale + tab-CRUD still OK; mixed `pcfs`; omitted `pcfs` does not clear; `newDashboard` clears both.

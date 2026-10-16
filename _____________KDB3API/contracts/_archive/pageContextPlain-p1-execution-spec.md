# Execution Spec: `pageContextPlain` P1 (`filt.pcfs` GET/SET)

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the contracts.
>
> **Scope:** P1 only — kale page-context values round-trip through `filt.pcfs`. Reuse existing restore plumbing. Do not create host items. Do not read cold `byScope` on GET. Do not change `classifyFilterInstance.js`. Do not implement `writebackMap`.
>
> **Supervising planner pre-accepts the Section A echo for this delegated run:** echo the numbered summaries at the top of the first progress message, then create/edit files in the **same turn**. Do not wait for a second human GO.

---

**Status:** `Executed` — Composer 2.5 build + initial review clean 2026-08-14. Planner final review: **accept**. Awaiting PO Cognos smoketest.
**Module / contracts:** `pageContextPlain.md`, `pageContextPlain-parameterSetRestore-contractdelta.md`, `writeback.md` §4.3 / §4.6 / §4.7 / §6.3 / §6 step 18–19 / §6.4 orchestrator rule / §6.0.1 / §7
**Phase:** `extension (P1 writeback GET/SET)`
**Authoring AI:** planner, 2026-08-14
**Executing AI:** Composer 2.5
**Reviewer:** Composer 2.5 initial; planner or Grok 4.6 high final

---

## Section A. Pre-flight read list

The executing AI **must** read each file below in order, **before** producing any output file, then echo a one-sentence summary of each.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — JS executable hard max 150; orchestrator 120; controller function 60; >10 AMD imports requires split.
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/_template.md`
13. `_____________KDB3API/contracts/pageContextPlain.md` + `pageContextPlain-parameterSetRestore-contractdelta.md` + `writeback.md` §4.3, §6.3, steps 15–22
14. This execution spec itself.

Reference implementations (**read, copy pattern; do not modify unless listed in Section B**):

- `KDB3/js/dashboard/filters/dienststelle/actions/routeParameterSetAction.js`
- `KDB3/js/dashboard/filters/dienststelle/createDienststelleController.js` (`guardRun` / `isStale` / dispatch order: parameterSet **before** tab-mutation)
- `KDB3/js/dashboard/filters/pageContextPlain/effects/listUnownedPageContextItems.js`
- `KDB3/js/dashboard/filters/pageContextPlain/effects/lookupPlainFilterApi.js`
- `KDB3/js/dashboard/filters/pageContextPlain/effects/isUnownedPageContextItem.js`
- `KDB3/js/dashboard/filters/pageContextPlain/actions/applyTabMutationScopeOps.js` (`applyHostItem` dest-skip — copy skip+warn, **do not** reuse `TABS_MUTATION_*` codes in SET)
- `KDB3/js/core/services/writeback/schema/validate/validateFilters.js` (`validateSels` as the array-entry pattern)
- `KDB3/js/core/services/writeback/schema/normalize/normalizeFilters.js`
- `KDB3/js/core/services/writeback/set/effects/runFilterRestore.js`
- `KDB3/js/core/services/writeback/set/effects/filterRestoreTargets.js`
- `KDB3/js/core/services/writeback/get/collectors/collectFilters.js`
- `KDB3/js/core/services/writeback/set/effects/dispatchOwnerPhase.js` (`degradedAllowed`)

---

## Section B. Folder tree

Create first, then edit.

**Create** under `KDB3/js/dashboard/filters/pageContextPlain/`:

```
config/parameterSetCodes.js
effects/lookupPlainFilterApiByName.js
actions/parameterSetContext.js
actions/parameterSetHostApply.js
actions/parameterSetClear.js
actions/parameterSetRestore.js
actions/routeParameterSetAction.js
actions/collectWritebackSnapshot.js
```

**Create** under `KDB3/js/core/services/writeback/`:

```
schema/validate/validatePcfs.js
schema/normalize/normalizePcfs.js
get/collectors/collectPageContextPlain.js
set/effects/dispatchFilterClearPhases.js
```

**Edit** (only these):

- `pageContextPlain/config/actions.js`
- `pageContextPlain/effects/ensurePageContextPlainRuntime.js`
- `pageContextPlain/effects/cleanupPageContextPlainRuntime.js`
- `pageContextPlain/__orchestratorPageContextPlain.js`
- `pageContextPlain/createPageContextPlainController.js`
- `writeback/schema/validate/validateFilters.js`
- `writeback/schema/normalize/normalizeFilters.js`
- `writeback/get/collectors/collectFilters.js`
- `writeback/set/effects/filterRestoreTargets.js`
- `writeback/set/effects/runFilterRestore.js`
- `writeback/set/effects/runNewDashboardReset.js`
- `writeback/set/config/restoreConstants.js`

Do **not** create a new reducer action. Reuse `pageContextPlain/tabMutationScopeWrite`.

---

## Section C. Per-file specifications

Named helpers at AMD factory scope only. No inline subfunctions inside the entry function, callbacks, or return path. `"use strict";` in every file.

### C1. `pageContextPlain/config/parameterSetCodes.js`

- **Role**: config constants
- **Lines**: target 20 (hard 40)
- **AMD imports**: none (`define([], function () {`)
- **Return** `Object.freeze({` with exactly:
  - `RESTORE_FAILED: "WRITEBACK_FILTER_RESTORE_FAILED"`
  - `CLEAR_FAILED: "WRITEBACK_FILTER_CLEAR_FAILED"`
  - `CANCELLED: "WRITEBACK_RESTORE_CANCELLED"`
  - `TARGET_MISSING: "WRITEBACK_TABS_TARGET_MISSING"`
  - `SKIPPED: "WRITEBACK_SKIPPED_BY_DESIGN"`
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

### C2. `pageContextPlain/config/actions.js` (edit)

Add three keys next to existing ones (do not rename P0 keys):

- `PARAMETER_SET_CLEAR_REQUESTED: "pageContextPlain/parameterSetClearRequested"`
- `PARAMETER_SET_RESTORE_REQUESTED: "pageContextPlain/parameterSetRestoreRequested"`
- `COLLECT_WRITEBACK_SNAPSHOT_REQUESTED: "pageContextPlain/collectWritebackSnapshotRequested"`

Keep returning a plain object (same as today). Target ≤ 20 lines.

### C3. `pageContextPlain/effects/ensurePageContextPlainRuntime.js` (edit)

Add `parameterSetRunId: 0` to the default runtime object next to `tabMutationRunId`. Do not remove existing buckets. Target ≤ 25 lines.

### C4. `pageContextPlain/effects/cleanupPageContextPlainRuntime.js` (edit)

After `tabMutationRunId = 0`, set `parameterSetRunId = 0`. Do not abort listeners (P0 pattern). Target ≤ 45 lines.

### C5. `pageContextPlain/__orchestratorPageContextPlain.js` (edit)

Add `parameterSetRunId: 0` to the inline runtime init object (same keys as `ensurePageContextPlainRuntime`). Orchestrator must stay ≤ 120 lines (today ~36). No business logic.

### C6. `pageContextPlain/effects/lookupPlainFilterApiByName.js`

- **Role**: effect
- **Lines**: target 50 (hard 80)
- **AMD imports**: `"./isUnownedPageContextItem.js"`
- **Entry**: `function lookupPlainFilterApiByName(_KDB, _itemName, _scopeId)`
- **Body**:
  1. try/catch; on catch `console.error("[pageContextPlain.lookupPlainFilterApiByName] failed", error); return null;`
  2. `nm = String(_itemName || "").trim()`; if empty return null.
  3. `filtersApi = _KDB.cognosAPI.filters`; if missing `getAllPageContextFilterItems` return null.
  4. `targetScope = String(_scopeId || "").replace(/_tabpanel$/, "")`.
  5. Loop items; skip if `!_isUnownedPageContextItem(_KDB, filtersApi, item)`.
  6. Match `String(filtersApi.getFilterItemLabel(item) || "").trim() === nm` AND stripped `getFilterScope(item) === targetScope`.
  7. Return the **first** matching host item object; else null.
- Copy `stripTabpanel` as a factory-scope helper (do not import `lookupPlainFilterApi.js`).
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc` (try/catch around host loop), `feature-structure.mdc`

### C7. `pageContextPlain/actions/parameterSetHostApply.js`

- **Role**: action/effect helper
- **Lines**: target 70 (hard 120)
- **AMD imports**: `"../effects/lookupPlainFilterApi.js"`, `"../effects/lookupPlainFilterApiByName.js"`, `"../config/parameterSetCodes.js"`
- **Factory-scope helpers**:
  - `function warnSkip(_kind, _details)` — `console.warn("[pageContextPlain." + _kind + "] dest item skipped", _details)`
  - `function applyReplace(_KDB, _filterApi, _values, _diagnostics, _failCode, _meta)` — if `replaceFilterContext` missing, push `{ code: _failCode, message: "host apply API unavailable" }` plus `_meta`, return `"failed"`; try `await replaceFilterContext(_filterApi, _values || [])`; catch → push failCode + message, return `"failed"`; return `"applied"`.
- **Exports** `Object.freeze({ applyByItemId, applyByName })`:
  - `async function applyByItemId(_KDB, _itemId, _scopeId, _values, _diagnostics)` — lookup via existing `lookupPlainFilterApi`; if null: `warnSkip("applyByItemId", { itemId, scopeId })`, push `{ code: SKIPPED, itemId, scopeId, message: "dest host item missing" }`, return `"skipped"`; else `applyReplace` with `CLEAR_FAILED` if values empty else `RESTORE_FAILED`.
  - `async function applyByName(_KDB, _itemName, _scopeId, _values, _diagnostics)` — lookup via `lookupPlainFilterApiByName`; if null: `warnSkip("applyByName", { itemName, scopeId })`, push `{ code: SKIPPED, itemName, scopeId, message: "dest host item missing" }`, return `"skipped"`; else `applyReplace` with `RESTORE_FAILED`. Return `"applied"` | `"skipped"` | `"failed"`.
- Do **not** import `applyTabMutationScopeOps.js`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`

### C8. `pageContextPlain/actions/parameterSetContext.js`

- **Role**: controller helper
- **Lines**: target 45 (hard 70)
- **AMD imports**: `"../effects/ensurePageContextPlainRuntime.js"`, `"../config/parameterSetCodes.js"`
- **Entry**: `function createParameterSetContext(_controller, _dispatchInternal)`
- **Return** object with:
  - `_KDB`, `dispatchInternal`
  - `ensureRuntime`: `function () { _controller.runtime = _controller.runtime || _ensureRuntime(_controller._KDB); return _controller.runtime; }`
  - `guardRun(payload)`: if `runId` is not a finite number, return `{ ok: false, diagnostics: [{ code: CANCELLED, message: "pageContextPlain parameterSet action requires a numeric runId" }] }`; `ensureRuntime()`; if `typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId`, return cancelled stale diagnostic; set `runtime.parameterSetRunId = runId`; return `null`.
  - `isStale(runId)`: true when `runtime.parameterSetRunId` is a number and `runId <` it.
- Named helpers `guardRun` / `isStale` at factory scope if needed to avoid nested functions inside the entry — prefer attaching methods that are factory-scope functions taking `(_controller, ...)`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `runtime.mdc`, `feature-structure.mdc`

If factory-scope-only is tight, this shape is approved:

```js
function createParameterSetContext(_controller, _dispatchInternal) {
  return {
    _KDB: _controller._KDB,
    dispatchInternal: _dispatchInternal,
    guardRun: guardRun.bind(null, _controller),
    isStale: isStale.bind(null, _controller),
    ensureRuntime: ensureRuntime.bind(null, _controller)
  };
}
```

with `guardRun` / `isStale` / `ensureRuntime` as factory-scope functions.

### C9. `pageContextPlain/actions/parameterSetClear.js`

- **Role**: action
- **Lines**: target 90 (hard 140)
- **AMD imports**: `"../config/actions.js"`, `"../config/parameterSetCodes.js"`, `"../effects/listUnownedPageContextItems.js"`, `"../effects/isUnownedPageContextItem.js"`, `"./parameterSetHostApply.js"`
- **Entry**: `function parameterSetClear(_ctx, _payload)` → returns a Promise.
- **Body**:
  1. `guard = _ctx.guardRun(_payload)`; if guard, `return Promise.resolve(guard)`.
  2. `return runClear(_ctx, _payload)` (async factory-scope `runClear`).
- **`runClear`**:
  1. `diagnostics = []`; `clearedScopes = []`; `degraded = false`.
  2. Build `scopeIds` (unique, skip empty, skip `"global"`):
     - If `payload.tabIdxToScopeId` is a non-null object with keys: for each value, read `scopeId` string (trim); skip empty.
     - Else (`newDashboard`): call `listAllUnownedScopes(_KDB)` helper — `getAllPageContextFilterItems()`, keep `isUnownedPageContextItem`, strip scope, skip `""` and `"global"`, unique.
  3. For each `scopeId`: `items = listUnownedPageContextItems(_KDB, scopeId)`; for each item `applyByItemId(..., [], diagnostics)`; if result `"skipped"` set degraded; if `"failed"` return `{ ok: false, degraded, clearedScopes, diagnostics }` **without** reducer write for that scope; if `_ctx.isStale(payload.runId)` return cancelled. After all items for that scope succeed or skip: `_ctx.dispatchInternal({ type: TAB_MUTATION_SCOPE_WRITE, payload: { scopeId, items: [], clear: true } })`; push unique scope to `clearedScopes`.
  4. If `payload.status === "newDashboard"`: return `{ ok: true, degraded: degraded || diagnostics.length > 0, clearedScopes, diagnostics }` (non-fatal).
  5. Else return `{ ok: diagnostics.filter(isHardFail).length === 0, degraded, clearedScopes, diagnostics }` where hard fail means `code === CLEAR_FAILED` (SKIPPED is not hard).
- Helper `readTargetScopeId(_target)` at factory scope: `String((_target && _target.scopeId) || "").trim()`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc` (try/catch in `runClear` wrapping the loop; on throw `{ ok: payload.status === "newDashboard", degraded: true, diagnostics: [{ code: CLEAR_FAILED, message }] }`), `state.mdc` (only reducer write via `dispatchInternal`), `feature-structure.mdc`

### C10. `pageContextPlain/actions/parameterSetRestore.js`

- **Role**: action
- **Lines**: target 100 (hard 150)
- **AMD imports**: `"../config/actions.js"`, `"../config/parameterSetCodes.js"`, `"../effects/lookupPlainFilterApiByName.js"`, `"./parameterSetHostApply.js"`
- **Entry**: `function parameterSetRestore(_ctx, _payload)` → Promise; `guardRun` then `runRestore`.
- **`runRestore`**:
  1. `filters = Array.isArray(payload.filters) ? payload.filters : []`.
  2. Group by `String(entry.tab)` into a plain object of arrays (factory helper `groupByTab`).
  3. `appliedScopes = []`; `skipped = []`; `diagnostics = []`; `degraded = false`.
  4. For each tab key: parseInt tab; `target = payload.tabIdxToScopeId && payload.tabIdxToScopeId[String(tab)]`; `scopeId = readTargetScopeId(target)`; if empty: push `{ code: TARGET_MISSING, tab, message: "tab target has no resolvable scopeId" }`, return `{ ok: false, diagnostics }`.
  5. `appliedItems = []`. For each entry in the group:
     - `nm = String(entry.nm || "").trim()`; `vals = Array.isArray(entry.vals) ? entry.vals : []`.
     - `outcome = await applyByName(_KDB, nm, scopeId, vals, diagnostics)`.
     - if `"failed"` return `{ ok: false, degraded, appliedScopes, skipped, diagnostics }`.
     - if `"skipped"`: `degraded = true`; `skipped.push({ nm, tab, scopeId })`; continue.
     - `host = lookupPlainFilterApiByName(_KDB, nm, scopeId)` (second lookup after write is OK); push `{ itemId, itemName: nm, sourceId, values: cloneVals(vals) }` using host getters when host is non-null, else `{ itemId: "", itemName: nm, sourceId: "", values: cloneVals(vals) }`.
     - if stale → cancelled result.
  6. `_ctx.dispatchInternal({ type: TAB_MUTATION_SCOPE_WRITE, payload: { scopeId, items: appliedItems, clear: false } })`; push scope to `appliedScopes`.
  7. Return `{ ok: true, degraded, appliedScopes, skipped, diagnostics }`.
- `cloneVals` factory helper: map to `{ d: String(v.d), u: String(v.u) }`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc` (try/catch; throw → `{ ok: false, diagnostics: [{ code: RESTORE_FAILED, message }] }`), `state.mdc`, `feature-structure.mdc`

### C11. `pageContextPlain/actions/routeParameterSetAction.js`

- **Role**: action router
- **Lines**: target 35 (hard 50)
- **AMD imports**: `"../config/actions.js"`, `"../config/parameterSetCodes.js"`, `"./parameterSetClear.js"`, `"./parameterSetRestore.js"`
- Copy dienststelle `routeParameterSetAction` exactly in structure: clear vs restore; `isParameterSetAction` = the two SET types only (**not** collect); `disposedResult` = `Promise.resolve({ ok: false, diagnostics: [{ code: CANCELLED, message: "pageContextPlain controller is disposed" }] })`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

### C12. `pageContextPlain/actions/collectWritebackSnapshot.js`

- **Role**: action (GET, sync, read-only)
- **Lines**: target 80 (hard 130)
- **AMD imports**: `"../effects/listUnownedPageContextItems.js"`, `"../config/parameterSetCodes.js"`
- **Entry**: `function collectWritebackSnapshot(_ctx, _payload)` — **synchronous**, no `guardRun`, no reducer write.
- **Body**:
  1. `tabIdxToScopeId = payload.tabIdxToScopeId`; if not a non-null object, return `{ ok: true, entries: [], diagnostics: [{ code: SKIPPED, message: "live tab targets unavailable for pcfs collect" }] }`.
  2. Loop `Object.keys(tabIdxToScopeId)`:
     - `tab = parseInt(key, 10)`; skip if not a finite non-negative integer equal to itself.
     - `scopeId = String((tabIdxToScopeId[key] && tabIdxToScopeId[key].scopeId) || "").trim()`; if empty: push SKIPPED diagnostic `{ tab }`, continue.
     - `items = listUnownedPageContextItems(_ctx._KDB, scopeId)`.
     - For each item: `nm = String(item.itemName || "").trim()`; if empty continue.
     - `vals = materializeVals(item.values)` (factory helper: keep pairs whose trimmed `d` and `u` are both non-empty strings).
     - if `vals.length === 0` continue.
     - `identity = String(tab) + "|" + nm`; if `seen[identity]`: push SKIPPED `{ nm, tab, message: "duplicate pcfs identity omitted" }`, continue; else `seen[identity] = true`.
     - `entries.push({ nm: nm, tab: tab, vals: vals })`.
  3. try/catch around the loop; on catch return `{ ok: true, entries: [], diagnostics: [{ code: SKIPPED, message }] }` (GET must not throw).
  4. Return `{ ok: true, entries: entries, diagnostics: diagnostics }`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `state.mdc` (no writes), `feature-structure.mdc`

### C13. `pageContextPlain/createPageContextPlainController.js` (edit)

Keep file ≤ 150 lines; each function ≤ 60.

- Add AMD imports (keep total ≤ 10): `"./actions/routeParameterSetAction.js"`, `"./actions/parameterSetContext.js"`, `"./actions/collectWritebackSnapshot.js"`.
- `dispatch` order **inside try**, after disposed handling:
  1. If `action.type === COLLECT_WRITEBACK_SNAPSHOT_REQUESTED` (use `_actions` constant): return `_collectWritebackSnapshot({ _KDB: _controller._KDB }, action.payload)`.
  2. Else if `_routeParameterSetAction.isParameterSetAction(action.type)`: return `_routeParameterSetAction(_createParameterSetContext(_controller, dispatchInternal.bind(null, _controller)), action)`.
  3. Else if tab-mutation (existing).
  4. Else existing `dispatchInternal` + `getState`.
- Disposed `dispatch`: if parameterSet → `disposedResult()`; if collect → `{ ok: true, entries: [], diagnostics: [] }`; if tab-mutation → existing; else warn + undefined.
- Do **not** add named public methods.
- **Rules to apply**: `module-public-api.mdc`, `state.mdc`, `runtime.mdc`, `error-handling.mdc`, `amd.mdc`, `feature-structure.mdc`

### C14. `writeback/schema/validate/validatePcfs.js`

- **Role**: schema validator helper
- **Lines**: target 90 (hard 140)
- **AMD imports**: `"./validatePrimitives.js"`
- **Export** `Object.freeze({ validatePcfs })`.
- Mirror `validateSels` structure:
  - `pcfs` must be an array.
  - Each entry a plain object.
  - `nm` non-empty trimmed string.
  - `tab` **required** non-negative integer (reject `tab === undefined`).
  - `vals` non-empty array; each val a plain object with `d` and `u` non-empty strings; unknown val fields invalid; unknown entry fields invalid. Allowed entry fields: `nm`, `tab`, `vals` only.
  - Duplicate identity `tab + "|" + trimmed(nm)` → `duplicate filt.pcfs entry identity`.
- Messages: prefix `filt.pcfs` analog to sels messages.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

### C15. `writeback/schema/validate/validateFilters.js` (edit)

- Add AMD import `"./validatePcfs.js"`.
- Whitelist keys: `["sicht", "dstl", "sels", "pcfs"]`.
- After `validateSels`, if `filt.pcfs !== undefined` call `_validatePcfs.validatePcfs(filt.pcfs, diagnostics)`.
- File must stay ≤ 150 lines. If it would exceed, stop and split — but with `validatePcfs` extracted it must fit.
- **Rules to apply**: `amd.mdc`, `feature-structure.mdc`

### C16. `writeback/schema/normalize/normalizePcfs.js`

- **Role**: schema normalizer helper
- **Lines**: target 80 (hard 130)
- **AMD imports**: `"../errorCodes.js"`
- **Export** `normalizePcfs(pcfs, diagnostics)` (function, like `normalizeSels`).
- If not array: return `pcfs` unchanged when not null/undefined, else null (preserve wrong types).
- For each entry: if not plain object, push through unchanged.
- For each plain-object entry: if `vals` is an array, keep only `{ d, u }` pairs whose stringify-trim `d` and `u` are both non-empty; if none remain, emit `WRITEBACK_FILTER_KIND_UNSUPPORTED` `"empty page-context-plain filter entry omitted during normalization"` `{ nm, tab }` and skip the entry.
- Clone by copying **every own key** (sels precedent): `Object.keys(entry).forEach` → `clone[key] = …`. Trim `nm` / `d` / `u` when those values are strings. Do **not** drop unknown keys (`itemId`, `sourceId`, `scopeId`, `key`, `inst`, …) — `validatePcfs` must reject them. Do not invent `tab` if missing (validate will fail). Preserve wrong types for validate.
- Return `normalized.length === 0 ? null : normalized`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

### C17. `writeback/schema/normalize/normalizeFilters.js` (edit)

- Add AMD import `"./normalizePcfs.js"`.
- After sels: `const pcfs = _normalizePcfs(filt.pcfs, diagnostics); if (pcfs !== null) normalized.pcfs = pcfs;`
- Copy-through unknown keys: change the known-key list to `["sicht", "dstl", "sels", "pcfs"]`.
- File ≤ 150 lines.
- **Rules to apply**: `amd.mdc`, `feature-structure.mdc`

### C18. `writeback/get/collectors/collectPageContextPlain.js`

- **Role**: GET collector
- **Lines**: target 55 (hard 90)
- **AMD imports**: `"../../schema/errorCodes.js"`
- **Entry**: `function collectPageContextPlain(_KDB, diagnostics, liveTabTargets)`
- **Body**:
  1. If `!liveTabTargets` push `WRITEBACK_SKIPPED_BY_DESIGN` `"pcfs collector skipped because live tab targets are missing"` and return `null`.
  2. `api = _KDB.api.pageContextPlain`; if no `dispatch`, same skip diagnostic, return null.
  3. `result = api.dispatch({ type: "pageContextPlain/collectWritebackSnapshotRequested", payload: { tabIdxToScopeId: liveTabTargets, source: "writebackGet" } })`.
  4. If `result && Array.isArray(result.diagnostics)` append them to `diagnostics`.
  5. `entries = result && Array.isArray(result.entries) ? result.entries : []`.
  6. Return `entries.length > 0 ? entries : null`.
  7. try/catch: `record` via pushing `WRITEBACK_SKIPPED_BY_DESIGN` `"pageContextPlain collector failed"` `{ error: message }`, return null.
- Do **not** AMD-import `dashboard/filters/pageContextPlain/**`.
- **Rules to apply**: `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`

### C19. `writeback/get/collectors/collectFilters.js` (edit)

- Add AMD import `"./collectPageContextPlain.js"`.
- After the `dstl` try/catch (and before assembling `filt`), add a try/catch: `pcfs = _collectPageContextPlain(_KDB, diagnostics, liveTabTargets)` on failure `recordCollectorError(diagnostics, "pageContextPlain", error); pcfs = null`.
- If `pcfs && pcfs.length > 0` set `filt.pcfs = pcfs`.
- File ≤ 150. Do not change sicht/sels/dstl rules.
- **Rules to apply**: `amd.mdc`, `feature-structure.mdc`

### C20. `writeback/set/effects/filterRestoreTargets.js` (edit)

- Change `collectPageContextTabIdx(pageEntries, dstl)` to `collectPageContextTabIdx(pageEntries, dstl, pcfs)`.
- After dstl.byTab union, if `Array.isArray(pcfs)` union each `entry.tab` with the same `isTabIdx` + unique rule as `pageEntries`.
- File ≤ 100.

### C21. `writeback/set/effects/dispatchFilterClearPhases.js` (new; extract)

- **Role**: SET effect
- **Lines**: target 50 (hard 80)
- **AMD imports**: `"../../schema/errorCodes.js"`
- **Entry**: `async function dispatchFilterClearPhases(run, inventoryGeneration, resolvedTargets, includeDienststelle, includePageContextPlain)`
- Move the existing three clear dispatches from `runFilterRestore.js` **verbatim**, then add:

```js
if (includePageContextPlain) {
  await run.dispatchOwnerPhase({
    phaseName: "filterClear", owner: "pageContextPlain",
    type: "pageContextPlain/parameterSetClearRequested",
    payload: { status: run.status, tabIdxToScopeId: resolvedTargets, inventoryGeneration: inventoryGeneration },
    required: true, failureCode: _errorCodes.codes.WRITEBACK_FILTER_CLEAR_FAILED,
  });
}
```

`inventoryGeneration` may be passed on the pcfs clear payload; the owner **ignores** it. Passing it is OK for payload uniformity with sicht/singleSelect.

- **Rules to apply**: `amd.mdc`, `naming.mdc`, `feature-structure.mdc`

### C22. `writeback/set/effects/runFilterRestore.js` (edit)

- Import `./dispatchFilterClearPhases.js` instead of inlining clear.
- `const pcfsEntries = Array.isArray(filt.pcfs) ? filt.pcfs : [];`
- `collectPageContextTabIdx(pageEntries, filt.dstl, pcfsEntries)`
- `needsPageTargets = pageEntries.length > 0 || hasTabScopedDienststelle(filt.dstl) || pcfsEntries.length > 0`
- Replace `dispatchClearPhases(...)` with `_dispatchFilterClearPhases(run, inventoryGeneration, resolvedTargets, filt.dstl !== undefined, filt.pcfs !== undefined)`
- **After** the step-19 `pageEntries` block (after generation assert), **before** sicht downstream:

```js
if (pcfsEntries.length > 0) {
  await run.dispatchOwnerPhase({
    phaseName: "pageContextPlainRestore", owner: "pageContextPlain",
    type: "pageContextPlain/parameterSetRestoreRequested",
    payload: { filters: pcfsEntries, tabIdxToScopeId: resolvedTargets },
    required: true,
    failureCode: _errorCodes.codes.WRITEBACK_FILTER_RESTORE_FAILED,
  });
}
```

Do **not** set `degradedAllowed`. Dest-skip is owner `{ ok: true, degraded: true }`. Hard failure is `{ ok: false }` and must abort.

- Delete the local `dispatchClearPhases` function.
- File ≤ 150.
- **Rules to apply**: `amd.mdc`, `feature-structure.mdc`

### C23. `writeback/set/effects/runNewDashboardReset.js` (edit)

Change the owner loop to `["sicht", "singleSelect", "dienststelle", "pageContextPlain"]`. No other changes. Keep `required: false`.

### C24. `writeback/set/config/restoreConstants.js` (edit)

Insert `"pageContextPlainRestore"` in `RESTORE_PHASE_NAMES` immediately after `"singleSelectPageContextRestore"`. No other changes. Do not reuse `singleSelectPageContextRestore` or `filterClear` for the kale restore phase.

---

## Section D. Reducer behavior table

No new reducer types. P1 clear/restore dispatch existing `pageContextPlain/tabMutationScopeWrite`. Collect writes nothing.

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| `pageContextPlain/tabMutationScopeWrite` | P0 apply + P1 clear/restore | replace or clear `byScope[scopeId]` | none |
| `pageContextPlain/parameterSetClearRequested` | writeback SET / newDashboard | none directly (effects + scope write) | none |
| `pageContextPlain/parameterSetRestoreRequested` | writeback SET | none directly | none |
| `pageContextPlain/collectWritebackSnapshotRequested` | writeback GET | none | none |

---

## Section E. Published selectors

None. GET uses dispatch collect, not `getState().byScope`.

---

## Section F. Public API wiring

- Surface: `_KDB.api.pageContextPlain` (unchanged methods: `mount`, `destroy`, `dispatch`, `getState`)
- Runtime adds `parameterSetRunId: 0`
- State shape unchanged

---

## Section G–I. Harness / mocks

Omitted. No harness. No tests.

---

## Section J. Acceptance criteria (self-verification)

1. Every Section B create/edit path exists.
2. Every file matches Section C including `Rules to apply`.
3. Full-compact AMD on every touched `.js` file.
4. No touched file exceeds 150 lines; orchestrator ≤ 120; each controller function ≤ 60; controller AMD imports ≤ 10.
5. No inline subfunctions inside entry functions / callbacks / return path.
6. Writeback collectors do not AMD-import `dashboard/filters/pageContextPlain/**`. Owner SET/GET files do not import `singleSelect` / `dienststelle` / `sicht` / `specialSingleSelect` internals.
7. No forbidden tree modified (Section K).
8. Reducer unchanged except being invoked with existing `tabMutationScopeWrite`. Collect is read-only.
9. `mount`/`destroy` try/catch unchanged and still valid.
10. Cleanup zeros `parameterSetRunId`.
11. No events added.
12. Report with Section L.
13. `validateFilt` accepts `pcfs` and rejects unknown filt keys still.
14. `classifyFilterInstance.js` and `writeback/map/**` untouched.
15. P0 tab-mutation files (`applyTabMutation*.js`, `prepareTabMutation.js`, `lookupPlainFilterApi.js`) untouched except being imported.
16. `RESTORE_PHASE_NAMES` includes `pageContextPlainRestore`. Restore dispatch does **not** set `degradedAllowed`.

---

## Section K. Forbidden actions

- Modify any `.mdc` file, `_template.md`, `_executionSpecTemplate.md`.
- Modify `classifyFilterInstance.js`, `readFilterDefinition.js`, `writeback/map/**`, any `dienststelle/**` / `singleSelect/**` / `sicht/**` production file.
- Modify the approved P1 contracts or this spec (stop and report instead).
- Implement `writebackMap` / `pageContextFilterObjArr` mapping.
- Create Cognos filter items; call `clearPageContextFilter`; add `itemId`/`sourceId`/`scopeId` to v3.
- Put kale entries into `filt.sels`.
- Read GET from `getState().byScope`.
- Warm-reconcile `byScope` on GET.
- Add `inventoryGeneration` / `phase` semantics to the owner (orchestrator may pass unused keys).
- Change P0 dest-skip behavior in `applyTabMutationScopeOps.js`.
- Write CSS, tests, README, harness.
- Commit, push, or change git config.
- Register a new `_KDB.*` namespace or `_KDB.api.filters.pageContextPlain`.
- Skip Section A.

---

## Section L. Reporting template

1. **Pre-flight echo** — numbered summaries from Section A.
2. **File checklist** — path, line count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule consulted.
4. **Self-verification** — pass/fail per Section J.
5. **Open questions for reviewer**.

---

## Section M. Reviewer handoff

Initial review (Composer 2.5): every new/edited file, ReadLints, line counts, Rules-to-apply, whitelist `pcfs`, restore insert point (after sels page-context, before sicht downstream), GET host-enumerate, name lookup uses `isUnownedPageContextItem`, restore **without** `degradedAllowed`, host-clear before reducer write, `pageContextPlainRestore` in `RESTORE_PHASE_NAMES`. Fix in a correction pass.

Final review (planner or Grok 4.6 high only): accept / fix-spec / escalate. Do not implement in the final-review pass.

---

## Cognos smoketest (PO, after final review)

1. Kale page-context filter with multi values on a tab: GET emits `filt.pcfs` (`nm`, `tab`, `{d,u}`); not in `sels`.
2. `set(get())` restores those values when the dest host item exists.
3. No kale → `pcfs` omitted; `validateV3` still accepts the payload.
4. SET with `filt` but without `pcfs` does not wipe kale.
5. Move/duplicate of tabs with kale still works (P0 dest-skip unchanged).
6. `newDashboard` clears kale (missing host is non-fatal).

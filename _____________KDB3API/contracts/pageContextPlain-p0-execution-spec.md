# Execution Spec: `pageContextPlain` (P0 tab-mutation owner)

> Per-module execution spec per `_executionSpecTemplate.md`. The executing AI implements mechanically; architectural decisions live in the contracts.
>
> **Scope:** P0 only — kale page-context values follow tab delete/move/duplicate. No writeback GET/SET, no `filt.pcfs`, no filterDock/history/parameterSet, no change to `classifyFilterInstance.js`.
> **Pattern:** copy the dienststelle 9-file tab-mutation skeleton (prepare / apply / scopeOps / move / duplicate / restore / resync / support / handle), thinner value model, host-enumerated claim set.
>
> **Supervising planner pre-accepts the Section A echo for this delegated run:** echo the numbered summaries at the top of the first progress message, then create files in the **same turn**. Do not wait for a second human GO.

---

**Status:** `Executed` — P0 Cognos smoketests passed 2026-08-14 (move/duplicate/delete; dest-item skip fix); committed.
**Module / contracts:** `pageContextPlain.md`, `pageContextPlain-tabMutation-contractdelta.md`, `tabs-tabCrud-contractdelta.md` §2.3 / §5, `architecture/stateOwnership.md` filter sub-owners
**Phase:** `extension (P0 tab-mutation owner)`
**Authoring AI:** planner, 2026-08-14
**Executing AI:** Composer 2.5
**Reviewer:** Composer 2.5 initial; planner or Grok 4.6 final

---

## Section A. Pre-flight read list

The executing AI **must** read each file below in order, **before** producing any output file, then echo a one-sentence summary of each.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — summary: mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/_template.md`
13. `_____________KDB3API/contracts/pageContextPlain.md` + `pageContextPlain-tabMutation-contractdelta.md`
14. This execution spec itself.

Reference implementations (**read, copy pattern, do not modify** unless listed in Section B):

- `KDB3/js/dashboard/filters/dienststelle/actions/{tabMutationSupport,prepareTabMutation,applyTabMutation,applyTabMutationScopeOps,applyTabMutationMove,applyTabMutationDuplicate,restoreTabMutationSnapshot,resyncTabMutationHost,handleTabMutationAction}.js`
- `KDB3/js/dashboard/filters/dienststelle/actions/restoreSupport.js` (`resolveScopeId` + `matchLayoutScopeId` only — copy the algorithm, do not import)
- `KDB3/js/dashboard/filters/singleSelect/effects/classifyFilterInstance.js` (claim complement — copy predicates, do not import)
- `KDB3/js/dashboard/filters/singleSelect/effects/readFilterDefinition.js` (definition lookup algorithm — copy into `readClaimDefinition.js`, do not import)
- `KDB3/js/core/cognosAPI/filters.js` (host primitives)
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js`
- `KDB3/js/dashboard/tabs/effects/dispatchOwnerTabMutation.js`
- `KDB3/js/KDB.js` (bootstrap wiring only)

---

## Section B. Folder tree

Create under `_____________KDB3API/KDB3/js/dashboard/filters/pageContextPlain/` in this order. Then edit the three saga/bootstrap files.

```
pageContextPlain/
  config/actions.js
  state/initialState.js
  state/createPageContextPlainReducer.js
  effects/ensurePageContextPlainRuntime.js
  effects/cleanupPageContextPlainRuntime.js
  effects/readClaimDefinition.js
  effects/isUnownedPageContextItem.js
  effects/listUnownedPageContextItems.js
  effects/lookupPlainFilterApi.js
  actions/tabMutationSupport.js
  actions/prepareTabMutation.js
  actions/applyTabMutationScopeOps.js
  actions/applyTabMutationDelete.js
  actions/applyTabMutationMove.js
  actions/applyTabMutationDuplicate.js
  actions/applyTabMutation.js
  actions/restoreTabMutationSnapshot.js
  actions/resyncTabMutationHost.js
  actions/handleTabMutationAction.js
  createPageContextPlainController.js
  __orchestratorPageContextPlain.js
```

Edits (no other production files):

- `KDB3/js/KDB.js`
- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js`
- `KDB3/js/dashboard/tabs/effects/dispatchOwnerTabMutation.js`

---

## Section C. Per-file specifications

Shared AMD rules for every `.js` file: full-compact `define([...], function (...) { ... });`, `"use strict";`, named entry + helpers at AMD factory scope only, **no inline subfunctions** inside the entry function / callbacks / return path. Underscore-prefix on boundary inputs only. Hard limit **150** lines (orchestrator **120**; controller **function** **60**).

### Shared claim algorithm (binding)

`isUnownedPageContextItem` is the **complement** of `classifyFilterInstance.js`. Duplicate the predicates; do not import singleSelect files.

Claim (`return true`) only when all of:

0. `getFilterItemId(item)` is non-empty after `String`+trim.
1. Host scope is page-context: `String(getFilterScope(item))` is non-empty and not `"global"`.
2. Normalized itemName does **not** start with `"dienststelle"`.
3. Classification would be `status: "unknown"`:

```
definitionResult = readClaimDefinition(_KDB, "pageContext", itemName, itemId)
if (definitionResult.status !== "ok" || !definitionResult.definition) → CLAIM
definition = definitionResult.definition
if isTrueish(definition.isHierarchy) OR normalized(definition.cascade) === "downstream" → NOT claim
if normalized(definition.condition) is "personengruppe" or "dienststellenleitung" → NOT claim
if isTrueish(definition.isSingleSelect) → NOT claim
if neither isHierarchy nor isSingleSelect flag is present (hasOwnFlag) → NOT claim (singleSelect default)
else → CLAIM
```

`readClaimDefinition` copies `readFilterDefinition.js` and **must** pass the same `_source` as `enumerateFilterInstances.js` (`core/utils/getKennzahlenSource.js`, AMD-import allowed). Do **not** walk all `filterPropObj` keys. `ambiguous`/`missing` under that source → CLAIM (classify `unknown`); a successful neither-flag definition → NOT claim.

If `getFilterItemId(item)` is null/empty after `String`+trim, do not claim (`return false` / skip). Lookup must require a non-empty `itemId`. Never fall back to `itemName`. Never store the host filter API object.

### Shared host write algorithm (binding)

- Values on the wire are Cognos `{ d, u }[]` (already the `getFilterValues` / `cloneFilterValues` shape). Do **not** convert through dienststelle `displayValue`/`useValue`.
- Write: `filtersApi.replaceFilterContext(filterApi, values || [])`.
- Clear: `replaceFilterContext(filterApi, [])` (do not also call `clearPageContextFilter` — one primitive).
- Lookup: `lookupPlainFilterApi(_KDB, itemId, scopeId)` using `getAllPageContextFilterItems()`, match `String(getFilterItemId(item)) === String(itemId)` AND scope equal after `String` plus strip trailing `_tabpanel` on both sides. Never match by itemName alone.
- Missing dest host item (`lookup` returns null, API is present): **skip** — do **not** push `TABS_MUTATION_APPLY_FAILED`. P0 cannot create Cognos items on the dest tab. Optional `console.warn("[pageContextPlain.applyHostItem] dest item skipped", { itemId, scopeId })`.
- Missing `filtersApi.replaceFilterContext`: push `TABS_MUTATION_APPLY_FAILED` (`host apply API unavailable`) — this **does** fail apply.
- Thrown `replaceFilterContext`: push `TABS_MUTATION_APPLY_FAILED` with the error message — this **does** fail apply.
- Apply returns `ok: false` only when fail-diagnostics exist (API missing, throw, missing whole snapshot, unresolvable scope). Skip is not a fail-diagnostic.
- Missing `snapshot.byScope[scopeId]` key: treat as `[]` (same as delete/clear `|| []`). Do not push `snapshot scope entry missing`.
- Empty claimed list: no-op, `ok: true`.
- Resync: same skip for missing dest items; `ok: true` unless throw.

### Shared scope resolution (binding)

Copy `resolveScopeId` + `matchLayoutScopeId` from `dienststelle/actions/restoreSupport.js` into `tabMutationSupport.js`. `tabIdxToScopeId` is the full `tabTargets` object `{ [tabIdx]: { tabId, pageId, scopeId?, visible } }`. Never index tabs positionally. Unresolvable scope → `{ ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", ... }] }`.

Affected slots for prepare = dienststelle `listAffectedSlots`: every `slotMoves` from/to, plus `deletedSlot`, `hideSlot`, and on `operation === "duplicate"` also `sourceSlot`, `insertSlot`, `revealSlot`.

---

#### `config/actions.js`

- **Role**: action-name constants
- **Lines**: target 20
- **AMD imports**: none (`define([], function () { ... })`)
- **Return**: object with keys `MOUNT_READY`, `PREPARE_TAB_MUTATION`, `APPLY_TAB_MUTATION`, `RESTORE_TAB_MUTATION_SNAPSHOT`, `RESYNC_TAB_MUTATION_HOST`, `TAB_MUTATION_SCOPE_WRITE`, `ERROR`, `DESTROY` mapped to slash-style `pageContextPlain/<camel>` (`mountReady`, `prepareTabMutation`, `applyTabMutation`, `restoreTabMutationSnapshot`, `resyncTabMutationHost`, `tabMutationScopeWrite`, `error`, `destroy`).
- **Rules to apply**: `naming.mdc` — slash-style actions; `amd.mdc`; `feature-structure.mdc` — config folder.

#### `state/initialState.js`

- **Role**: initial state factory
- **Lines**: target 20
- **Entry**: `function initialState()` returns `{ lifecycle: "idle", byScope: {}, errorCode: null, errorMessage: null }`.
- **Rules to apply**: `state.mdc`; `lifecycleVocabulary.md` terms only; `amd.mdc`; `naming.mdc`.

#### `state/createPageContextPlainReducer.js`

- **Role**: reducer
- **Lines**: target 90
- **AMD imports**: `../config/actions.js`, `./initialState.js`
- **Entry**: `function createPageContextPlainReducer()` returns `function reducer(_state, _action)`.
- **Behavior**: see Section D. Clone `items` arrays shallowly (`itemId`/`itemName`/`sourceId` strings + `{ d, u }` values). Never mutate the previous state object.
- **Rules to apply**: `state.mdc` — pure, no side-effects, no foreign writes; `naming.mdc`; `amd.mdc`; `feature-structure.mdc`.

#### `effects/ensurePageContextPlainRuntime.js`

- **Role**: runtime initializer
- **Lines**: target 25
- **Entry**: `function ensurePageContextPlainRuntime(_KDB)` — ensure `_KDB.runtime.pageContextPlain` with buckets `listeners: {}`, `subscriptions: {}`, `abortControllers: {}`, `observers: {}`, `timers: {}`, `pendingPromises: {}`, `tabMutationRunId: 0`, `tabMutationSnapshots: {}`. Do **not** create `parameterSetRunId`. Return the runtime object.
- **Rules to apply**: `runtime.mdc`; `amd.mdc`; `naming.mdc`; `error-handling.mdc` — one-liner helper, try/catch optional.

#### `effects/cleanupPageContextPlainRuntime.js`

- **Role**: runtime cleanup
- **Lines**: target 45
- **Entry**: `function cleanupPageContextPlainRuntime(_runtime)` — copy `cleanupDienststelleRuntime.js`: unsubscribe `subscriptions` in try/catch warn; then reset `listeners`/`subscriptions`/`abortControllers`/`observers`/`timers`/`pendingPromises` to `{}`; `tabMutationRunId = 0`; `tabMutationSnapshots = {}`. Do **not** abort `listeners`. Omit `historyReplayHandlerContribution` / `parameterSetRunId` / `domRefs` if unused. No-op if `!_runtime`.
- **Rules to apply**: `runtime.mdc` — unsubscribe then abort then clear; `error-handling.mdc`; `amd.mdc`.

#### `effects/readClaimDefinition.js`

- **Role**: effects helper
- **Lines**: target 80 (copy `readFilterDefinition.js`)
- **AMD imports**: `../../../../core/utils/getKennzahlenSource.js`
- **Entry**: `function readClaimDefinition(_KDB, _scopeType, _itemName, _itemId)` — same algorithm as `readFilterDefinition.js`, passing `_source = getKennzahlenSource(_KDB)` (never `null` / never all source keys). Console tag `[pageContextPlain.readClaimDefinition]`. try/catch, rethrow after log.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`; `state.mdc` — read `_KDB.properties.filterPropObj` only, never write.

#### `effects/isUnownedPageContextItem.js`

- **Role**: effects helper
- **Lines**: target 70
- **AMD imports**: `./readClaimDefinition.js`
- **Factory-scope helpers**: `normalized`, `isTrueish`, `hasOwnFlag` (copy classifyFilterInstance).
- **Entry**: `function isUnownedPageContextItem(_KDB, _filtersApi, _item)` implements the claim algorithm above, including empty-`itemId` → `false`. try/catch: log `[pageContextPlain.isUnownedPageContextItem]`, return `false` on throw (fail closed: do not steal).
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `effects/listUnownedPageContextItems.js`

- **Role**: effects helper
- **Lines**: target 50
- **AMD imports**: `./isUnownedPageContextItem.js`
- **Entry**: `function listUnownedPageContextItems(_KDB, _scopeId)` — `filtersApi.getAllPageContextFilterItems()`, keep items where `isUnownedPageContextItem` is true and stripped-scope equals stripped `_scopeId`. Map to `{ itemId, itemName, sourceId, values }` via `getFilterItemId` / `getFilterItemLabel` / `getFilterSourceId` / `getFilterValues`. Empty array if API missing. try/catch → log, return `[]`.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`.

#### `effects/lookupPlainFilterApi.js`

- **Role**: effects helper
- **Lines**: target 55
- **Factory-scope helper**: `function stripTabpanel(_scope)` — `String(_scope || "").replace(/_tabpanel$/, "")`.
- **Entry**: `function lookupPlainFilterApi(_KDB, _itemId, _scopeId)` — if `_itemId` is null/empty after `String`+trim, return `null`. Else `getAllPageContextFilterItems()`, return first item whose non-empty itemId and stripped scope match. try/catch per item (continue). Return `null` if none. Never match by itemName.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`.

#### `actions/tabMutationSupport.js`

- **Role**: action support
- **Lines**: target 120
- **AMD imports**: none (scope resolution is local; do not import dienststelle)
- **Exports**: `guardRun`, `isStale`, `cancelled`, `resolveScopeIdForSlot`, `writeSnapshot`, `readSnapshot`, `deleteSnapshot`, `cloneItem`, `cloneValues`, `pushUnique`.
- **Behavior**: copy dienststelle `tabMutationSupport.js` (`ensureRuntimeKeys` creates `tabMutationRunId` + `tabMutationSnapshots` only). Messages say `pageContextPlain` not `dienststelle`. Add `resolveScopeId` + `matchLayoutScopeId` (copy restoreSupport). `cloneValues` maps `{ d, u }` (null-safe). `cloneItem` clones the four snapshot fields.
- **Rules to apply**: `runtime.mdc`; `amd.mdc`; `naming.mdc`; `error-handling.mdc` — helpers may be one-liners.

#### `actions/prepareTabMutation.js`

- **Role**: action handler
- **Lines**: target 90
- **AMD imports**: `./tabMutationSupport.js`, `../effects/listUnownedPageContextItems.js`
- **Entry**: `async function prepareTabMutation(_ctx, _payload)`
- **Body**:
  1. `guardRun`; on guard return `{ ok: false, operationId, snapshotScopes: [], diagnostics }`.
  2. Require `payload.plan`; else `TABS_MUTATION_PREPARE_FAILED`.
  3. Resolve affected slots → unique `scopeIds`; any unresolved → fail prepare.
  4. Build snapshot `{ runId, operationId, byScope }` by calling `listUnownedPageContextItems` per scope (empty list valid).
  5. `writeSnapshot`; return `{ ok: true, operationId, snapshotScopes, diagnostics: [] }`.
- Wrap body in try/catch → log `[pageContextPlain.prepareTabMutation]`, return prepare-failed diagnostic.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`; `state.mdc` — no reducer writes here; snapshot is runtime-only.

#### `actions/applyTabMutationScopeOps.js`

- **Role**: action support
- **Lines**: target 110
- **AMD imports**: `../config/actions.js`, `./tabMutationSupport.js`, `../effects/lookupPlainFilterApi.js`
- **Exports**: `writeScopeFromSnapshot`, `clearScopeItems`, `resyncHostScope`, `failed`.
- `dispatchScopeWrite(_ctx, _scopeId, _items, _clear)` → `_ctx.dispatchInternal({ type: TAB_MUTATION_SCOPE_WRITE, payload: { scopeId, items, clear } })`.
- `async function applyHostItem(_KDB, _itemId, _scopeId, _values, _diagnostics)` — lookup then `replaceFilterContext`. Split: (1) missing `filtersApi.replaceFilterContext` → `TABS_MUTATION_APPLY_FAILED` "host apply API unavailable"; (2) lookup null → **skip** (warn, no fail diagnostic); (3) throw → `TABS_MUTATION_APPLY_FAILED` with message.
- `writeScopeFromSnapshot(_ctx, _scopeId, _items, _payload, _appliedScopes, _diagnostics, _support)` — clone items, dispatch write, then each item `applyHostItem`, `pushUnique(appliedScopes, scopeId)`, stale-check after each item.
- `clearScopeItems(_ctx, _scopeId, _items, _payload, _clearedScopes, _diagnostics, _support)` — dispatch clear (`items: []`), then each snapshot item `applyHostItem` with `[]`, `pushUnique(clearedScopes, scopeId)`, stale-check.
- `resyncHostScope(_KDB, _scopeId, _items, _diagnostics)` — for each current owner-state item, `applyHostItem` (no dispatch).
- `failed(_operationId, _appliedScopes, _clearedScopes, _diagnostics)` — dienststelle shape.
- **Rules to apply**: `error-handling.mdc` — try/catch around host replace (inside `applyHostItem`); `state.mdc` — writes only via `dispatchInternal`; `amd.mdc`; `naming.mdc`.

#### `actions/applyTabMutationDelete.js`

- **Role**: action handler
- **Lines**: target 70
- **AMD imports**: `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`
- **Entry**: `async function applyDeleteMutation(_ctx, _payload)`
- **Body**: Do **not** copy `applyDeleteMutation` from dienststelle `applyTabMutation.js`. No live `byScope` reads; no `.sort` on `slotMoves`. Require snapshot `runId` match; resolve `deletedSlot`; `clearScopeItems` for `snapshot.byScope[deletedScope] || []`; then reuse move: clear unique from-scopeIds from snapshot items, then for each `slotMoves` **as given** write `snapshot.byScope[from]` onto `to`. Stale-checks. Diagnostics → `failed`.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`.

#### `actions/applyTabMutationMove.js`

- **Role**: action handler
- **Lines**: target 55
- **AMD imports**: `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`
- **Entry**: copy dienststelle `applyTabMutationMove.js` substituting `writeScopeFromSnapshot` / `clearScopeItems` (items array instead of byFilter). Snapshot-sourced; clear unique froms first; then write each to from snapshot.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`.

#### `actions/applyTabMutationDuplicate.js`

- **Role**: action handler
- **Lines**: target 70
- **AMD imports**: `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`
- **Entry**: copy dienststelle `applyTabMutationDuplicate.js`: descending `slotMoves` already in the plan — iterate as given (do not re-sort); each shift is `writeScopeFromSnapshot` **without clears**; then clone `clonePair.from || sourceSlot` onto `clonePair.to || insertSlot`. `clearedScopes: []`. Missing clone snapshot scope → fail.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`.

#### `actions/applyTabMutation.js`

- **Role**: action handler
- **Lines**: target 30
- **AMD imports**: `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`, `./applyTabMutationDelete.js`, `./applyTabMutationMove.js`, `./applyTabMutationDuplicate.js`
- **Entry**: `async function applyTabMutation(_ctx, _payload)` — guardRun; require operation in `delete|move|duplicate`; route. try/catch log `[pageContextPlain.applyTabMutation]`.
- **Rules to apply**: `error-handling.mdc`; `amd.mdc`; `naming.mdc`; `feature-structure.mdc` — ≤6 imports is OK here (5).

#### `actions/restoreTabMutationSnapshot.js`

- **Role**: action handler
- **Lines**: target 80
- **AMD imports**: `../config/actions.js`, `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`
- **Entry**: copy dienststelle restore: stale-guard has **zero side effects** (snapshot stays). Missing snapshot → `{ ok: true, restored: [], unrecoverable: [], diagnostics: [] }`. Per scope: dispatch write of cloned items, then host-apply each item (empty values → `[]`). Failed host item → `unrecoverable` + `TABS_MUTATION_ROLLBACK_INCOMPLETE`. Delete snapshot bucket at end. `ok` iff `unrecoverable.length === 0`.
- **Rules to apply**: `error-handling.mdc`; `runtime.mdc`; `amd.mdc`; `naming.mdc`.

#### `actions/resyncTabMutationHost.js`

- **Role**: action handler
- **Lines**: target 70
- **AMD imports**: `./tabMutationSupport.js`, `./applyTabMutationScopeOps.js`
- **collectAffectedSlots(_plan)**: unique `tabIdx` from `slotMoves` from/to, `deletedSlot`, `hideSlot`, and on duplicate also `clonePair.from/to`, `sourceSlot`, `insertSlot`, `revealSlot`.
- **Entry**: guardRun; for each slot resolve scope; read `_KDB.state.filters.pageContextPlain.byScope[scopeId] || []`; `resyncHostScope`. Missing scope → diagnostic, continue. Outer try/catch: log `[pageContextPlain.resyncTabMutationHost]`, `ok: false` only on throw. Otherwise `ok: true` with diagnostics.
- **Rules to apply**: `error-handling.mdc`; `state.mdc` — read own subtree only, no writes; `amd.mdc`.

#### `actions/handleTabMutationAction.js`

- **Role**: action router
- **Lines**: target 45
- **AMD imports**: `../config/actions.js`, `./prepareTabMutation.js`, `./applyTabMutation.js`, `./restoreTabMutationSnapshot.js`, `./resyncTabMutationHost.js`
- **Entry**: copy dienststelle `handleTabMutationAction.js` (route by type; default restore). Attach `isTabMutationAction` and `disposedResult` (message: `pageContextPlain controller is disposed`).
- **Rules to apply**: `module-public-api.mdc`; `amd.mdc`; `naming.mdc`.

#### `createPageContextPlainController.js`

- **Role**: controller factory
- **Lines**: target 120; **each of** `mount` / `destroy` / `dispatch` **function bodies ≤ 60**
- **AMD imports**: `./config/actions.js`, `./state/createPageContextPlainReducer.js`, `./effects/ensurePageContextPlainRuntime.js`, `./effects/cleanupPageContextPlainRuntime.js`, `./actions/handleTabMutationAction.js`
- **Factory**: `function createPageContextPlainController(_deps)` stores `{ _KDB, options, reducer, runtime: null, isDisposed: false, didWarnDisposed: false }` and returns `{ mount, destroy, dispatch, getState }`.
- `dispatchInternal` writes **only** `_KDB.state.filters.pageContextPlain` through the reducer.
- `mount`: if disposed, warn once, return false. try: ensure runtime, dispatch `MOUNT_READY`, return true. catch: `console.error("[pageContextPlain.mount]", err)`, dispatch `ERROR` with `errorCode`+`errorMessage`, return false.
- `destroy`: if already disposed return. set `isDisposed`. try: cleanup runtime, dispatch `DESTROY`. catch: `console.error("[pageContextPlain.destroy]", err)`, dispatch `ERROR`.
- `dispatch`: if disposed and tab-mutation type → `disposedResult`; else warn and return undefined. If tab-mutation type → `handleTabMutationAction({ _KDB, runtime, dispatchInternal }, action)`. Else `dispatchInternal` then `getState`. catch: log `[pageContextPlain.dispatch]`, dispatch `ERROR`.
- `getState`: disposed → undefined; else `_KDB.state.filters.pageContextPlain`.
- **Rules to apply**: `module-public-api.mdc` — dispatch+reducer only; `state.mdc`; `runtime.mdc` — cleanup in destroy; `error-handling.mdc` — try/catch on mount/destroy/dispatch; `amd.mdc`; `naming.mdc`; `feature-structure.mdc`.

#### `__orchestratorPageContextPlain.js`

- **Role**: module orchestrator
- **Lines**: target 40 (hard 120)
- **AMD imports**: `./state/initialState.js`, `./createPageContextPlainController.js`
- **Entry**: `function __orchestrator(_KDB, _options)` — ensure `state.filters`, seed `state.filters.pageContextPlain` via `initialState()` if missing, seed runtime via empty buckets + `tabMutationRunId: 0` + `tabMutationSnapshots: {}`, `controller = createPageContextPlainController({ _KDB, options })`, `_KDB.api.pageContextPlain = controller`, return controller. No business logic.
- **Rules to apply**: `kdb-object.mdc` — registers `_KDB.api.pageContextPlain`; `feature-structure.mdc` — thin orchestrator; `amd.mdc`; `naming.mdc` — `__orchestrator`.

#### `KDB.js` (edit)

- **Role**: Cognos renderer bootstrap (500-line exception: wiring only)
- **Changes only**:
  1. Add AMD dep `"./dashboard/filters/pageContextPlain/__orchestratorPageContextPlain.js"` immediately after the specialSingleSelect orchestrator path in the `define([...])` array.
  2. Add factory param `_orchestratorPageContextPlain` immediately after `_orchestratorSpecialSingleSelect`.
  3. `registerFeatureModules`: call `_orchestratorPageContextPlain(_KDB);` after specialSingleSelect.
  4. `mountFeatureModules`: `_KDB.api.pageContextPlain.mount({});` after specialSingleSelect.
  5. `destroyRegisteredFeatures`: `destroyFeatureApi(_KDB.api.pageContextPlain);` **before** specialSingleSelect (LIFO).
- Do not change version, lifecycle, or any other behavior.
- **Rules to apply**: `kdb-object.mdc`; `feature-structure.mdc` — KDB.js bootstrap exception; `amd.mdc`.

#### `runTabMutationSaga.js` (edit)

- Add `"pageContextPlain"` to:
  - prepare list (after `dienststelle`)
  - filterApply list (after `dienststelle`)
  - every `rollbackOwners` list that currently includes `singleSelect`/`dienststelle` (three sites)
  - hostResync list (after `dienststelle`)
- No other saga changes.
- **Rules to apply**: `feature-structure.mdc`; `amd.mdc`; stay under 150 lines.

#### `dispatchOwnerTabMutation.js` (edit)

- Change `buildOwnerPayload` owner check to also include `"pageContextPlain"` so `tabIdxToScopeId: _runContext.tabTargets` is attached.
- **Rules to apply**: `naming.mdc`; `amd.mdc`.

---

## Section D. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle |
|---|---|---|---|
| `pageContextPlain/mountReady` | `mount()` | `{ lifecycle: "ready", errorCode: null, errorMessage: null }` | idle → ready |
| `pageContextPlain/tabMutationScopeWrite` | apply/restore | if `!payload.scopeId` or scope is `"global"`: return state. `clear === true`: `byScope[scopeId] = []`. else `byScope[scopeId] = cloned items`. Clear error fields. | none |
| `pageContextPlain/error` | catch in mount/destroy/dispatch | `{ lifecycle: "error", errorCode, errorMessage }` | → error |
| `pageContextPlain/destroy` | `destroy()` | `{ lifecycle: "disposed" }` | → disposed |
| unknown | — | return state | none |

Prepare/apply/resync/restore **actions do not hit the reducer** except via `tabMutationScopeWrite`.

---

## Section E. Published selectors

None in P0. `getState` returns the owner subtree.

---

## Section F. Public API wiring

- Surface: `_KDB.api.pageContextPlain`
- Methods: `mount`, `destroy`, `dispatch`, `getState`
- Runtime: `_KDB.runtime.pageContextPlain` as in `ensurePageContextPlainRuntime`
- State: `_KDB.state.filters.pageContextPlain` from `initialState()`

---

## Section G. Harness HTML spec

Omitted. P0 has no Cognos-free harness. PO tests in Cognos.

---

## Section H. Harness JS spec

Omitted. Same as G.

---

## Section I. Mock extensions

Omitted. No harness.

---

## Section J. Acceptance criteria (self-verification)

1. Every Section B file exists.
2. Every file matches Section C including `Rules to apply`.
3. Full-compact AMD on every new `.js` file.
4. No new file exceeds 150 lines; orchestrator ≤ 120; each controller function ≤ 60.
5. No inline subfunctions inside entry functions / callbacks / return path.
6. No import of `singleSelect`, `dienststelle`, `sicht`, or `specialSingleSelect` internals. The **only** allowed extra-module import is `KDB3/js/core/utils/getKennzahlenSource.js` from `readClaimDefinition.js`.
7. No forbidden tree modified (Section K).
8. Reducer is pure; Cognos writes live only in actions/effects.
9. `mount` and `destroy` try/catch; on catch dispatch `pageContextPlain/error` + `console.error("[pageContextPlain.<phase>]", err)`.
10. `destroy` unsubscribes subscriptions, aborts listeners, then clears runtime buckets.
11. No events emitted; no event-name constants file (none owned).
12. Report back with Section L template.
13. `buildOwnerPayload` includes `pageContextPlain`.
14. Saga owner lists include `pageContextPlain` in prepare, filterApply, all three rollbacks, hostResync.
15. `writeback.md` and `classifyFilterInstance.js` untouched.

---

## Section K. Forbidden actions

- Modify any `.mdc` file.
- Modify `_template.md` or `_executionSpecTemplate.md`.
- Modify `writeback.md`, `classifyFilterInstance.js`, `readFilterDefinition.js`, any `dienststelle/**` or `singleSelect/**` or `sicht/**` file.
- Modify `pageContextPlain.md` / the tabMutation delta / this spec (stop and report instead).
- Read or modify legacy trees: `TEST/dashboard/`, `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`.
- Write CSS, tests, README, harness, GET/SET collectors, `filt.pcfs`.
- Commit, push, or change git config.
- Do not import `singleSelect`, `dienststelle`, `sicht`, or `specialSingleSelect` internals. The only allowed extra-module import is `core/utils/getKennzahlenSource.js`.
- Register `_KDB.api.filters.pageContextPlain` or a new top-level `_KDB.*` namespace.
- Skip Section A or proceed without the echoed summaries.

---

## Section L. Reporting template

1. **Pre-flight echo** — numbered summaries from Section A.
2. **File checklist** — path, line count, matches spec | deviation.
3. **Deviations** — path, deviation, motivation, rule consulted.
4. **Self-verification** — pass/fail per Section J.
5. **Open questions for reviewer**.

---

## Section M. Reviewer handoff

Initial review (Composer 2.5): read every new/edited file, ReadLints, line counts, Rules-to-apply, claim-algorithm fidelity vs `classifyFilterInstance.js`, saga list completeness, `buildOwnerPayload`. Fix in a correction pass.

Final review (planner or Grok 4.6 only): accept / fix-spec / escalate. Do not implement in the final-review pass.

---

## Cognos smoketest (PO, after final review)

1. Add a kale (non-KDB-config) page-context filter with a multi-value selection on tab 2 of 3. Delete tab 1: values stay on the shifted content, not on the vacated slot. Last slot hidden.
2. Move tab with kale filter: values follow the content.
3. Duplicate: source and copy have identical kale values; displaced tab keeps its own.
4. Tab with only dienststelle/singleSelect filters: behavior unchanged; no double-write steal.
5. `writebackGet` after mutation still validates (no new `filt` key).

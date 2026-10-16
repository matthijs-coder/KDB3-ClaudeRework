# Execution Spec: `tableDataService` (`startup promise registry`)

> Ready-for-execution spec for adding early configured table-load registration by stable config key.
>
> This tranche updates existing production redesign files only where listed below. It must not create a new service and must not make root bootstrap wait for all table loads to complete.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/tableDataService-startup-promise-registry-contractdelta.md`
**Phase:** `startup promise registry`
**Authoring AI:** GPT-5.5, 2026-05-16
**Executing AI:** external executing AI
**Reviewer:** user + mid-tier AI

---

## Section A. Pre-flight read list

The executing AI must read these files in order before producing output. Its first response must echo one sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/amd.mdc`
10. `_____________KDB3API/contracts/tableDataService.md`
11. `_____________KDB3API/contracts/tableDataService-startup-promise-registry-contractdelta.md`
12. This execution spec.

The executing AI must not edit files until those summaries are present and accepted by the supervising AI or reviewer.

---

## Section B. Current code inputs

Read these production redesign files before editing:

```txt
_____________KDB3API/KDB3/js/core/config/tables.js
_____________KDB3API/KDB3/js/core/config/__orchestratorConfig.js
_____________KDB3API/KDB3/js/core/services/tableData/__orchestratorTableData.js
_____________KDB3API/KDB3/js/core/services/tableData/createTableDataService.js
_____________KDB3API/KDB3/js/core/services/tableData/input/normalizeTableInputs.js
_____________KDB3API/KDB3/js/core/services/tableData/input/resolveTableKey.js
_____________KDB3API/KDB3/js/core/services/tableData/operations/loadTableInputs.js
_____________KDB3API/KDB3/js/core/services/tableData/operations/waitForRowsInputs.js
_____________KDB3API/KDB3/js/core/services/tableData/operations/startTableLoad.js
_____________KDB3API/KDB3/js/core/services/tableData/operations/runLoadTableWork.js
_____________KDB3API/KDB3/js/KDB.js
```

Do not read legacy folders for this tranche; the behavior is defined by the current redesign contract delta.

---

## Section C. Mapping table

| File to update/create | Existing source | Alignment note |
|---|---|---|
| `KDB3/js/core/services/tableData/__orchestratorTableData.js` | existing file | Initialise registry runtime fields under `_KDB.runtime.tableData`; promises stay in runtime. |
| `KDB3/js/core/services/tableData/createTableDataService.js` | existing file | Add `registerConfiguredLoads` named method to the existing service surface with disposed guard. |
| `KDB3/js/core/services/tableData/operations/registerConfiguredLoads.js` | new file | Filter `_KDB.config.tables` by `load === true`, start loads by stable config key, resolve `loadRegistryReady` after registration only. |
| `KDB3/js/core/services/tableData/operations/resolveConfiguredLoadInputs.js` | new file | Pure helper to produce stable-key inputs from config: `{ tableName: key }`. |
| `KDB3/js/KDB.js` | existing file | Call `tableData.registerConfiguredLoads()` after `setupCore()`; do not add it to all-load waiting targets. |

No other files are in scope.

---

## Section D. Folder tree

Create/update exactly these files:

```txt
_____________KDB3API/KDB3/js/core/services/tableData/
  __orchestratorTableData.js          (update)
  createTableDataService.js           (update)
  operations/
    resolveConfiguredLoadInputs.js    (new)
    registerConfiguredLoads.js        (new)

_____________KDB3API/KDB3/js/KDB.js   (update)
```

Do not create harness files, tests, CSS files, README files, contracts, rules or legacy files.

---

## Section E. Per-file specifications

### `core/services/tableData/__orchestratorTableData.js`

- **Role:** service orchestrator update.
- **Lines:** keep under 80.
- **Change:** initialise:
  - `_KDB.runtime.tableData.loadRegistryReady`
  - `_KDB.runtime.tableData.loadRegistryReadyResolve`
  - `_KDB.runtime.tableData.loadRegistryKeys`
- **Initial values:** `Promise.resolve([])`, `null`, `[]`.
- **Rules to apply:**
  - `runtime.mdc` — Promise and resolver live in runtime, not state.
  - `feature-structure.mdc` — thin orchestrator only.
  - `amd.mdc` — preserve full-compact AMD shape.

### `core/services/tableData/createTableDataService.js`

- **Role:** service factory update.
- **Lines:** hard limit 150.
- **AMD imports:** add `./operations/registerConfiguredLoads.js`.
- **New public method:** `registerConfiguredLoads(_tablesConfig)`.
- **Disposed behavior:** if `_isDisposed`, return `Promise.reject(new Error("tableDataService disposed"))`.
- **Try/catch:** catch synchronous method failure and return rejected Promise using existing `rejectPublicMethodError`.
- **Return surface:** include `registerConfiguredLoads`.
- **Rules to apply:**
  - `module-public-api.mdc` — service named-method surface remains single surface.
  - `runtime.mdc` — no Promise in state.
  - `error-handling.mdc` — public method boundary catches and logs.
  - `feature-structure.mdc` — if import count exceeds hard threshold, stop and report instead of hiding logic inline.

### `core/services/tableData/operations/resolveConfiguredLoadInputs.js`

- **Role:** pure config-to-input helper.
- **Lines:** target 60.
- **AMD imports:** none.
- **Entry function:** `__controller(_tablesConfig)`.
- **Behavior:** return an ordered array of `{ tableName: key }` for every own config key where `entry && entry.load === true`; preserve object key order; ignore `load: false`.
- **Important:** do not return `{ tableName: entry.name }`.
- **Rules to apply:**
  - `state.mdc` — pure data transform, no state/runtime writes.
  - `naming.mdc` — stable key vocabulary: `tableKey`, not mutable display/title names.
  - `amd.mdc` — one returned function.

### `core/services/tableData/operations/registerConfiguredLoads.js`

- **Role:** runtime registry operation.
- **Lines:** target 100.
- **AMD imports:** `./resolveConfiguredLoadInputs.js`, `./loadTableInputs.js`, `../input/normalizeTableInputs.js`.
- **Entry function:** `__controller(_KDB, _tablesConfig)`.
- **Behavior:**
  1. Resolve `tablesConfig = _tablesConfig || (_KDB.config && _KDB.config.tables) || {}`.
  2. Build stable-key inputs with `_resolveConfiguredLoadInputs(tablesConfig)`.
  3. Create a fresh runtime registry promise and store it at `_KDB.runtime.tableData.loadRegistryReady`.
  4. Store resolver at `_KDB.runtime.tableData.loadRegistryReadyResolve` until resolved.
  5. Store key list at `_KDB.runtime.tableData.loadRegistryKeys`.
  6. For each input, call `_loadTableInputs(_KDB, [normalizedInput])` or equivalent existing load path so `_KDB.runtime.tableData.pendingLoads[tableKey]` is registered.
  7. Do not await all load promises.
  8. Resolve `loadRegistryReady` with the stable key list after the loop completes.
  9. Clear `loadRegistryReadyResolve`.
  10. Return `_KDB.runtime.tableData.loadRegistryReady`.
- **Catch behavior:** log `[tableDataService.registerConfiguredLoads] registry failed`; resolve or reject consistently. Prefer rejecting `loadRegistryReady` if setup fails before registration is complete.
- **Rules to apply:**
  - `runtime.mdc` — aggregate Promise/resolver in runtime only.
  - `state.mdc` — state receives only serializable table entries via existing writers.
  - `error-handling.mdc` — no silent catch; public method will also catch synchronous failures.
  - `module-public-api.mdc` — operation is internal to the service; consumers call public method.

### `KDB3/js/KDB.js`

- **Role:** root bootstrap wiring update.
- **Lines:** may grow only within approved bootstrap-wiring exception; no feature behavior.
- **Change:** after `await this.setupCore();` and before feature module startup, call a small named helper that invokes `this.services.tableData.registerConfiguredLoads()` if present.
- **Helper:** add factory-scope function `registerConfiguredTableLoads(_KDB)` or equivalent named helper.
- **Important:** do not push the returned promise into `waitingTargets`; do not wait for all table loads to finish.
- **Allowed:** optionally catch/log synchronous call failures so root startup can continue only if that is consistent with existing root error handling; otherwise let `renderKDB` catch.
- **Rules to apply:**
  - `feature-structure.mdc` — `KDB.js` exception permits bootstrap wiring only.
  - `runtime.mdc` — do not store promise in root state.
  - `error-handling.mdc` — root lifecycle boundary already catches failures; no silent swallowing.
  - `amd.mdc` — no inline nested helper inside method body; helper at factory scope.

---

## Section F. Public behavior

After this tranche:

```js
_KDB.services.tableData.registerConfiguredLoads();
```

starts all `_KDB.config.tables` entries where `load === true` by stable config key and returns:

```js
_KDB.runtime.tableData.loadRegistryReady
```

Consumers use:

```js
await _KDB.runtime.tableData.loadRegistryReady;
const rows = await _KDB.services.tableData.waitForRows([{ tableName: "personal_kdb" }]);
```

The key `personal_kdb` is stable. The title `_KDB.config.tables.personal_kdb.name` may change independently and is used only for Cognos widget title lookup.

---

## Section G. Acceptance criteria

The executing AI must self-verify:

1. `_KDB.state` contains no Promise, resolver function, AbortController or runtime object.
2. `_KDB.runtime.tableData.loadRegistryReady` exists immediately after tableData orchestrator registration.
3. `registerConfiguredLoads()` filters `load: true` from `_KDB.config.tables`.
4. `registerConfiguredLoads()` uses config keys such as `personal_kdb`, not `entry.name`, as table keys.
5. `pendingLoads[personal_kdb]` is used for the load promise when `personal_kdb.load === true`.
6. `state.tableData.personal_kdb` is the state entry path when loading starts or completes.
7. Root `KDB.js` does not wait for all table loads to complete.
8. Existing public methods `loadTable`, `readRows`, `waitForRows`, `reloadTable`, `ensureFreshRows`, `readTableState`, `destroy` still exist.
9. New public method `registerConfiguredLoads` is disposed-state guarded.
10. No files outside Section D were modified.

---

## Section H. Forbidden actions

- Do not modify rules, templates or contracts.
- Do not modify legacy folders.
- Do not add `_KDB.data` as canonical table storage.
- Do not store any Promise in `_KDB.state`.
- Do not use `entry.name` as the stable key.
- Do not await all configured loads in `KDB.js`.
- Do not introduce new events.
- Do not create a new service.
- Do not add tests, harnesses, CSS, README, package files, commits or git config changes.

---

## Section I. Reporting template

Final response from the executing AI must include:

1. **Pre-flight echo** — 12 numbered summaries from Section A.
2. **File checklist** — each file in Section D with line count and `matches spec | deviation`.
3. **Behavior checklist** — pass/fail for Section G.
4. **Deviations** — file, deviation, motivation, consulted rule.
5. **Open questions for reviewer** — only concrete blockers or ambiguities.

---

## Section J. Reviewer handoff

The supervising AI must read every touched file, run lints on changed `.js` files, and verify the stable-key + runtime-promise invariants before CP-2.

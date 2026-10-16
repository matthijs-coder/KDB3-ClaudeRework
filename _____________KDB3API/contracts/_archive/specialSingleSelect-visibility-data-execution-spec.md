# Execution Spec: `specialSingleSelect` visibility/data unblockers

> Mini direct-port integration spec for making `specialSingleSelect` react to tableData readiness and for defining the approved Sicht input boundary.
> This spec deliberately does **not** invent a production `sicht` module.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/specialSingleSelect.md`
**Related delta:** `_____________KDB3API/contracts/specialSingleSelect-payload-key-contractdelta.md`
**Phase:** `visibility/data integration`
**Authoring AI:** GPT-5.5, 2026-05-24
**Executing AI:** `<pending>`
**Reviewer:** `<pending>`

---

## Section A. Pre-flight read list

The executing AI must read these files before editing and echo one sentence per file:

1. `_____________KDB3API/contracts/specialSingleSelect.md`
2. `_____________KDB3API/contracts/specialSingleSelect-payload-key-contractdelta.md`
3. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/state.mdc`
6. `_____________KDB3API/.cursor/rules/runtime.mdc`
7. `_____________KDB3API/.cursor/rules/events.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/amd.mdc`
10. `_____________KDB3API/.cursor/rules/dom.mdc`
11. `_____________KDB3API/.cursor/rules/naming.mdc`
12. This execution spec.

---

## Section B. Scope

Allowed production files:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/__orchestratorSpecialSingleSelect.js
KDB3/js/dashboard/filters/specialSingleSelect/createSpecialSingleSelectController.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/runSpecialSingleSelectSync.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/readSpecialRightsFromTableData.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/readDefaultOptionFromTableData.js
KDB3/js/dashboard/filters/specialSingleSelect/runtime/cleanupSpecialSingleSelectRuntime.js
```

Allowed new files:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/effects/subscribeTableDataChanges.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/buildSpecialTableDataInputs.js
```

Forbidden in this iteration:

- Do not edit `filterDock/`.
- Do not edit `singleSelect/`.
- Do not edit `KDB.js`.
- Do not edit `tables.js`.
- Do not create a production `sicht` module.
- Do not add new events or edit `architecture/eventSubscribe.md`.
- Do not edit CSS or `cssHrefList.js`.
- Do not edit legacy trees.
- Do not add `TEST/` or harness files.

---

## Section C. Decisions

### C1. tableData trigger

Use existing fact-event:

```txt
tableData:loadFinished
```

This event is already emitted by `tableDataService` and cataloged in `architecture/eventSubscribe.md`. No event catalog change is required.

`specialSingleSelect` subscribes to `tableData:loadFinished` and dispatches:

```js
{
  type: "specialSingleSelect/tableDataChanged",
  payload: {
    tableName: eventPayload.tableName,
    rowCount: eventPayload.rowCount
  }
}
```

Only relevant table names should trigger sync:

```txt
Alle
Personengruppe
Dienststellenleitung
Personengruppe_Filter
Dienststellenleitung_Filter
```

The implementation may normalize those event `tableName` values to configured table keys:

```txt
alle
personengruppe
dienststellenleitung
personengruppe_filter
dienststellenleitung_filter
```

### C2. initial tableData sync

On `mount`, `specialSingleSelect` should perform one `syncRequested` / current `scheduleSync` after registering the tableData subscription. This lets already-ready tables update rights/classes without waiting for a new event.

### C3. Sicht source

There is no production `sicht` module in this tree. Therefore this iteration does **not** create an automatic Sicht source.

Approved behavior for this iteration:

- Keep the existing public action:
  `specialSingleSelect/sichtChanged`.
- Do not route `filterDock` `filterType: "sicht"` directly to `specialSingleSelect` in this tranche.
- Do not infer active Sicht from DOM text.
- For dashboard smoke, active Sicht may be set manually through `_KDB.api.specialSingleSelect.dispatch({ type: "specialSingleSelect/sichtChanged", payload: { activeSichtValue: "BW" } })` until the real `sicht` owner exists.

Future tranche:

- A production `sicht` module or parent `dashboard/filters/__orchestratorFilters.js` will send confirmed Sicht changes to `_KDB.api.specialSingleSelect.dispatch`.

### C4. rights/options read shape

The tableData read helpers must use `_KDB.services.tableData.readRows(...)` only.

Expected input style:

```js
[{ tableName: "<tableKey>", shape: tableConfig.shape, pick: tableConfig.pick }]
```

Acceptance must verify whether `readRows` returns rows for all required keys. If a read returns `undefined`, the module treats that table as unknown and does not invent defaults.

---

## Section D. Per-file specs

### `effects/buildSpecialTableDataInputs.js` (new)

- **Role:** tiny config-driven helper for relevant specialSingleSelect table keys and event table-name matching.
- **Target size:** under 80 lines.
- **Return / exports:** an object with:
  - `tableKeys`: array of required config keys.
  - `isRelevantTableName(tableName)`: true for table key or configured table `name`.
  - `buildTableInput(_KDB, tableKey)`: returns the one-entry input array for tableDataService or `null`.
- **Rules to apply:**
  - `state.mdc` — tableData reads through service input, not direct state.
  - `feature-structure.mdc` — config/effect helper stays focused and small.
  - `amd.mdc` — full AMD compact module.
  - `naming.mdc` — clear English names.

### `effects/subscribeTableDataChanges.js` (new)

- **Role:** subscribe to `tableData:loadFinished` and dispatch `specialSingleSelect/tableDataChanged` for relevant tables.
- **Target size:** under 100 lines.
- **AMD imports:**
  - `./buildSpecialTableDataInputs.js`
- **Behavior:**
  1. If `_KDB.events.subscribe` is unavailable, return `null`.
  2. Subscribe to `"tableData:loadFinished"`.
  3. Handler checks `isRelevantTableName(payload.tableName)`.
  4. Handler calls `api.dispatch({ type: "specialSingleSelect/tableDataChanged", payload: { tableName, rowCount } })`.
  5. Handler has try/catch and logs `[specialSingleSelect.tableDataChanged] failed`.
  6. Return unsubscribe function.
- **Rules to apply:**
  - `events.mdc` — subscribe to existing fact-event; store unsubscribe under runtime subscriptions.
  - `runtime.mdc` — cleanup path required.
  - `error-handling.mdc` — subscriber has mandatory try/catch; catches/logs.
  - `module-public-api.mdc` — dispatch to owner public API.

### `__orchestratorSpecialSingleSelect.js`

- **Role:** wiring only.
- **Required changes:**
  - Import `subscribeTableDataChanges`.
  - After controller creation / API registration, call subscription helper.
  - Store unsubscribe at `_KDB.runtime.specialSingleSelect.subscriptions.tableDataLoadFinished`.
  - Do not add business logic.
  - Keep lifecycle comment.
- **Rules to apply:**
  - `feature-structure.mdc` — orchestrator is wiring only.
  - `runtime.mdc` — subscription stored under owner runtime.
  - `amd.mdc` — import count must stay acceptable.

### `createSpecialSingleSelectController.js`

- **Role:** public API lifecycle and dispatch wrapper.
- **Required changes:**
  - Ensure `mount()` dispatches or schedules a sync after runtime is ready.
  - Do not add tableData subscription logic here if orchestrator owns the subscription.
  - Keep file under 150 lines.
- **Rules to apply:**
  - `module-public-api.mdc` — public methods guard disposal.
  - `error-handling.mdc` — mount/destroy and other mandatory functions have try/catch.

### `effects/runSpecialSingleSelectSync.js`

- **Role:** existing sync route.
- **Required changes:**
  - Ensure `TABLE_DATA_CHANGED` schedules sync.
  - Ensure `SICHT_CHANGED` schedules sync.
  - Preserve abort/disposed guards.
  - Keep at or below 150 lines; if adding code would exceed 150, move helper logic to `buildSpecialTableDataInputs.js` or another allowed tiny helper.
- **Rules to apply:**
  - `runtime.mdc` — stale sync ignored.
  - `feature-structure.mdc` — line limit strict.

### `effects/readSpecialRightsFromTableData.js`

- **Role:** read rights from tableDataService.
- **Required changes:**
  - Reuse `buildTableInput` from `buildSpecialTableDataInputs.js` if this reduces duplication.
  - Keep rights normalization: `1`, `"1"`, `true` are allowed.
  - Missing / unresolved table remains `{ known: false, allowed: false }`.
- **Rules to apply:**
  - `state.mdc` — no direct `_KDB.state.tableData`.

### `effects/readDefaultOptionFromTableData.js`

- **Role:** read first valid option row from tableDataService.
- **Required changes:**
  - Reuse `buildTableInput` if practical.
  - If no valid first row, return unknown / null; no fake defaults.
- **Rules to apply:**
  - `state.mdc` — tableDataService reads only.

### `runtime/cleanupSpecialSingleSelectRuntime.js`

- **Role:** runtime cleanup.
- **Required changes:**
  - Ensure `subscriptions.tableDataLoadFinished` unsubscribe is called.
  - Cleanup order: subscriptions/abort controllers before resetting buckets.
- **Rules to apply:**
  - `runtime.mdc` — cleanup all subscriptions.
  - `error-handling.mdc` — cleanup should not throw.

---

## Section E. Acceptance criteria

1. `specialSingleSelect` subscribes to `tableData:loadFinished`.
2. Relevant completed tables dispatch `specialSingleSelect/tableDataChanged`.
3. Irrelevant table load events no-op.
4. `mount()` triggers one initial sync for already-loaded tables.
5. `sichtChanged` remains public action and schedules sync when manually dispatched.
6. No automatic production Sicht source is invented.
7. No direct `_KDB.state.tableData` reads are added.
8. No new event names are introduced.
9. Subscription is stored under `_KDB.runtime.specialSingleSelect.subscriptions` and cleaned on destroy.
10. Files remain under 150 lines.
11. Lints are clean on touched files.

Dashboard smoke after this iteration:

1. Manually dispatch `specialSingleSelect/sichtChanged` with `activeSichtValue: "BW"`.
2. Confirm tableData load events or initial sync set rights from tableDataService reads.
3. If rights allow, wrappers receive `KDB_specialSingleSelect`, `KDB_SSS_right`, and `KDB_Sicht_BW`.
4. Clicking a visible special filter delegates to `singleSelect`.

---

## Section F. Deferred items

Still deferred after this spec:

- Production `sicht` module or parent filters orchestrator.
- Automatic `sicht -> specialSingleSelect/sichtChanged` route.
- `tables.js` changes, unless separate evidence proves config shape is wrong.
- Full E2E CP-2 sign-off without a real Sicht source.

---

## Section G. Reporting template

The executing AI reports:

1. Pre-flight echo (12 summaries).
2. Files changed and line counts.
3. How tableData events are filtered.
4. How subscriptions are stored and cleaned.
5. Confirmation that no production Sicht source was invented.
6. Confirmation that `sichtChanged` manual dispatch schedules sync.
7. Any deviations or blockers.

---

## Section H. Reviewer handoff

Reviewer checks:

- Existing `tableData:loadFinished` event only; no event catalog edits.
- No direct tableData state reads.
- Subscription cleanup.
- Line limits.
- No edits outside allowed scope.

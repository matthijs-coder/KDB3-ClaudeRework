# Contract Delta: `tableDataService` startup promise registry

> CP-1 delta for early table-load registration from `_KDB.config.tables`.
>
> This delta extends `_____________KDB3API/contracts/tableDataService.md` for the production startup path. It does not introduce a new service.

---

**Status:** `Draft`
**Base contract:** `_____________KDB3API/contracts/tableDataService.md`
**Owner service:** `tableDataService`
**Type:** shared service contract delta
**Authoring AI:** GPT-5.5, 2026-05-16
**Reviewed by:** pending CP-1

---

## CP-1 decisions

| ID | Decision |
|---|---|
| **D1 Stable key** | The stable table key is the key from `_KDB.config.tables`, for example `personal_kdb`, not the mutable Cognos title/name `Personal_KDB`. |
| **D2 State keying** | `_KDB.state.tableData[tableKey]` is keyed by the stable config key. The entry may store `title: configEntry.name` as metadata, but the state path does not change when the title changes. |
| **D3 Runtime keying** | `_KDB.runtime.tableData.pendingLoads[tableKey]` and `abortControllers[tableKey]` are keyed by the same stable config key. |
| **D4 Promise placement** | Promises never live in `_KDB.state`. Pending load promises and registry readiness promises live under `_KDB.runtime.tableData`. |
| **D5 Registry readiness** | Add a runtime promise `loadRegistryReady` that resolves when all `load: true` config keys have been registered as pending or already-known table entries, not when all loads have completed. |
| **D6 No all-load wait** | Root bootstrap must not wait for all table loads to finish before mounting or marking root ready. Startup only creates/registers load promises early. |
| **D7 Consumer wait pattern** | Consumers that need a specific table first wait for `loadRegistryReady`, then call `waitForRows([{ tableName: "<stableKey>" }])`. |

---

## 1. Purpose

The startup promise registry lets modules safely wait for table data by stable config key from the beginning of dashboard startup, without forcing the root bootstrap to wait for all tables to finish loading.

The problem solved here is timing, not data ownership: consumers need to know that the table promise for `personal_kdb` has either been registered or that the service has at least created a serializable table state entry for that key. After that, they can call `waitForRows([{ tableName: "personal_kdb" }])` and receive the existing pending promise or trigger the load through the normal `tableDataService` path.

---

## 2. Ownership

State remains owned by `tableDataService`:

```js
_KDB.state.tableData[tableKey]
```

Runtime remains owned by `tableDataService`:

```js
_KDB.runtime.tableData.pendingLoads[tableKey]
_KDB.runtime.tableData.abortControllers[tableKey]
_KDB.runtime.tableData.loadRegistryReady
_KDB.runtime.tableData.loadRegistryReadyResolve
_KDB.runtime.tableData.loadRegistryKeys
```

`loadRegistryReady`, resolver functions and any aggregate Promise are technical runtime coordination objects and must not be written to `_KDB.state`.

---

## 3. Public API addition

Extend `_KDB.services.tableData` with one named method:

```js
_KDB.services.tableData = {
  loadTable: loadTable,
  readRows: readRows,
  waitForRows: waitForRows,
  reloadTable: reloadTable,
  ensureFreshRows: ensureFreshRows,
  readTableState: readTableState,
  registerConfiguredLoads: registerConfiguredLoads,
  destroy: destroy
};
```

Method contract:

| Method | Signature | Returns | Behavior |
|---|---|---|---|
| `registerConfiguredLoads` | `(tablesConfig?: object) => Promise<string[]>` | `loadRegistryReady` promise resolving to registered stable keys | Reads `tablesConfig || _KDB.config.tables`, filters `entry.load === true`, starts/records loads by stable config key, resolves registry readiness once every key has a pending load or known state entry. It does not wait for rows to finish loading. |

Post-disposal behavior follows `module-public-api.mdc`: `registerConfiguredLoads` returns `Promise.reject(new Error("tableDataService disposed"))`.

---

## 4. Input model

For each config entry:

```js
personal_kdb: {
  name: "Personal_KDB",
  role: "kennzahlen",
  load: true
}
```

The service creates input equivalent to:

```js
{
  tableName: "personal_kdb"
}
```

The existing load path resolves the Cognos title from `_KDB.config.tables.personal_kdb.name`. This preserves stable keying while allowing the dashboard title to change.

If implementation extends input normalization, it may internally represent the same intent as:

```js
{
  tableHandle: "personal_kdb",
  tableName: "personal_kdb",
  title: "Personal_KDB",
  widgetId: null
}
```

That internal shape must not change the public consumer pattern: consumers use stable config keys.

---

## 5. Runtime registry lifecycle

During `__orchestratorTableData`, runtime must initialise registry fields:

```js
_KDB.runtime.tableData.loadRegistryReady = Promise.resolve([]);
_KDB.runtime.tableData.loadRegistryReadyResolve = null;
_KDB.runtime.tableData.loadRegistryKeys = [];
```

When `registerConfiguredLoads` starts:

1. Build `loadRegistryKeys` from config keys where `entry.load === true`.
2. Create a fresh `loadRegistryReady` promise and store its resolver in runtime.
3. For each key, call the existing load path using the stable key.
4. Do not await those load promises as a group.
5. Resolve `loadRegistryReady` with the stable key list after all keys have been registered into `pendingLoads` or are already represented in `_KDB.state.tableData`.
6. Clear `loadRegistryReadyResolve` after resolving.

On `destroy`, clear/settle registry runtime the same way pending loads are cleaned: abort pending loads, clear resolver references, reset `loadRegistryKeys`, and do not leave stale pending registry promises that can resolve after disposal.

---

## 6. Bootstrap relationship

`KDB.js` may call `registerConfiguredLoads()` after `setupCore()` has registered config and services. This call must not be added to the root `waitingTargets` that block root readiness for data completion.

Allowed bootstrap shape:

```js
const tableDataService = this.services && this.services.tableData;
if (tableDataService && typeof tableDataService.registerConfiguredLoads === "function") {
  tableDataService.registerConfiguredLoads();
}
```

Forbidden bootstrap shape:

```js
waitingTargets.push(tableDataService.registerConfiguredLoads());
```

`registerConfiguredLoads()` resolves quickly after registration, but root code should still not treat it as an all-data-loaded gate.

---

## 7. Consumer pattern

Consumers that need `personal_kdb` use:

```js
await _KDB.runtime.tableData.loadRegistryReady;
const rows = await _KDB.services.tableData.waitForRows([{ tableName: "personal_kdb" }]);
```

This waits for registry availability, then waits only for the specific table.

Consumers must not:

- wait for all configured loads to complete;
- read `_KDB.runtime.tableData.pendingLoads` directly when the public service API can be used;
- write `_KDB.state.tableData` directly;
- use mutable `entry.name` as their stable key.

---

## 8. Out of scope

- Changing table config keys.
- Waiting for all table loads in root bootstrap.
- Adding `_KDB.data` as canonical table storage.
- Moving hierarchy data into a new service.
- New events for registry readiness.
- Browser harness or production behavior outside `tableDataService` and the minimal startup call.

---

## Approval log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-16 | `Draft` created | GPT-5.5 | Startup promise registry delta drafted from user decision. |

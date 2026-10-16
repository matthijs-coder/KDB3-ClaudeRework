# Contract Delta: URL share waits until single-select inventory is quiet

> Amends `contracts/writeback-urlParameterId-contractdelta.md` §6.1 step 4 and §6.2 “do not intertwine”.
> Amends `contracts/singleSelect-filterInstanceIdentity-contractdelta.md` §4 inventory.
> No public-signature change on `writeback.md` §2.2.
> No production code until this delta is implemented against this text.

---

**Status:** `Approved` — PO vastenburg 2026-10-13
**Parent:** `writeback-urlParameterId-contractdelta.md` §6.1–§6.2; `singleSelect-filterInstanceIdentity-contractdelta.md` §4
**Type:** `shared-service contract delta` (writeback SET startup + singleSelect inventory flag)
**Authoring AI:** Cursor Grok 4.7, 2026-10-13

---

## 1. Purpose

A share URL with `parameterId` and a later direct parameter-set load enter the same `writebackSet.restore()` chain. The URL chain fires host `change` while `filterDock` `filtersReady` can still start `singleSelect/reconcileFilterInstances`. That reconcile sets `inventory.freshness` to `"stale"` immediately and later bumps `generation`. Filter restore then aborts with `WRITEBACK_SINGLESELECT_INVENTORY_STALE` after widget reset, so widgets never return.

This delta delays `change` until that reconcile has finished. It does not weaken the in-restore identity abort. It does not add a second restore pipeline.

---

## 2. Decisions (2026-10-13)

| # | Choice | Decision |
|---|---|---|
| 1 | Where | Inside `runUrlShareStartup`, only when `parameterId != null`, **before** `selectParameterSetById`. Not inside `selectParameterSetById`. Not inside `restore`. |
| 2 | Boot | `KDB.js` still does **not** await `whenUrlShareRestoreSettled`. No `whenCanvasReady`. |
| 3 | Clock | Own **68000 ms**, started at this wait. Not subtracted from the §5.3 30000 ms select + SET clock. Not `missingId` / `hostListUnready`. |
| 4 | Quiet | All three: `filtersReady === true`, `freshness === "fresh"`, `inventory.reconcileInFlight === false`. |
| 5 | `filtersReady` still false | **Not quiet.** Do not call `selectParameterSetById`. `wrapperCount < 1` is not a terminal empty dock (the observer can still arm `filtersReady` later). No new filterDock state fact. |
| 6 | Timeout | `{ kind: "failed", parameterId }`. No `change`, no `restore`, no `newDashboard`, no `pendingUrlShareMessage`, no `pendingRestoreFailure`. `console.warn` only. No new German copy, error code, or `kind`. |
| 7 | Destroy / abort | Existing silent `failed` row. Clear pending. No alert. |
| 8 | In-flight flag | Boolean on inventory **state**. The reconcile Promise stays runtime-only. Clear the boolean only in the `clearRun` branch that deletes the matching promise. A superseded `finally` must not clear the newer run’s flag. |
| 9 | Identity abort | Unchanged. Unexpected generation or freshness during a restore still aborts. |
| 10 | Page-context poll | Unchanged. 2500 ms host poll after tab activate stays a later, separate abort. |

---

## 3. Amendment to URL §6.1

After step 3 (`parameterId == null` → `absent`, no dropdown wait), and **before** current step 4 (`selectParameterSetById`):

1. `await` the inventory-quiet wait (new effect `writeback/set/effects/waitForSingleSelectInventoryQuiet.js`).
2. Poll with `_KDB.utils.waitFor`. Interval 50 ms. No `Promise.race`. Abort is a truthy sentinel returned from `conditionFn` (`waitFor` swallows throws). Signal is the existing `urlShareStartup` `AbortController`.
3. Quiet when one sample sees all of:
   - `_KDB.api.filterDock.getState().filtersReady === true`
   - single-select `inventory.freshness === "fresh"` via `getState()` / the published selector (`readSingleSelectState` already clones `inventory`)
   - `inventory.reconcileInFlight === false`
4. Quiet → continue with current step 4 (`selectParameterSetById`). The §5.3 30000 ms clock still starts at that function’s entry, not during this wait.
5. Not quiet at 68000 ms, or aborted → return `{ kind: "failed", parameterId }` and **do not** call `selectParameterSetById`. Do not map this through `mapUrlShareSelectResult` into `missingId` or `hostListUnready`.

`parameterId == null` does not enter this wait.

§6.2 “do not intertwine share with other boot waits” is amended by this delta only: this quiet wait is the one approved wait inside `whenUrl`. It is not a `KDB.js` wait and not a canvas wait.

The 68000 ms budget is the sum of clocks that start at different moments after `filterDock.mount` returns: dock wait 30000 + filtersReady cap 30000 + reconcile inventory default 3000 + two sequential owner acks at 2500. Do not shorten it. Falling through to `select` while `filtersReady` is still false reopens the stale race, including when the first wrapper appears late and the filtersReady cap then extends past this budget.

A dashboard that never reaches `filtersReady` takes the silent `failed` row. The shared set is not applied. Widgets are not parked. That is accepted. No German alert on this row.

---

## 4. `inventory.reconcileInFlight`

Add to `singleSelect` inventory state (default `false`):

```js
inventory: {
  generation: 0,
  freshness: "stale",
  reconcileInFlight: false,
  reconciledAt: null,
  errorCode: null
}
```

Rules:

- The reconcile **Promise** stays at `_KDB.runtime.singleSelect.pendingPromises.reconcile`. Writeback must not read that slot. No selector reads runtime to derive this flag.
- Set `reconcileInFlight: true` in the same inventory assign that sets `freshness: "stale"` at reconcile entry.
- `freshness: "fresh"` is written before owner notify. The flag stays `true` through that notify. Quiet requires the flag to be false, so owner-ack time is not treated as quiet.
- Clear `reconcileInFlight` to `false` only in the `clearRun` branch whose condition is `pendingPromises.reconcile.promise ===` the promise being finished (the same branch that deletes that slot). Do not clear it from the `reconcileRunId` / abort-controller branch alone. A superseded run’s `finally` fails that promise match and must leave the newer run’s flag true.
- `getState()` / `readSingleSelectState` publish the flag by cloning `inventory`. No new selector function.

`inventory.freshness` stays `fresh | stale`. In-flight **promise** coordination stays runtime-only. The boolean is the published state mirror of “a reconcile promise is the current slot”.

---

## 5. Out of scope

- `KDB.js`, `createWritebackSetService.js` (148 lines / 10 AMD; no new import), `selectParameterSetById` (no second clock).
- `assertStableGeneration`, `runFilterRestore`, `runNormalRestore`, page-context host poll.
- `filterDock` actions and state. Do not publish an “observation finished, no items” fact from `wrapperCount < 1`.
- New `UrlShareStartupResult.kind`, error code, or German copy.
- `tabMutation` during the dropdown wait **after** quiet. That can still trip the existing identity abort. Not this delta.
- Page-context host registration. This wait only delays when that later poll starts.

`whenUrlShareRestoreSettled.js` may take a 7th AMD import for the new effect (smell, under the 10 cap).

---

## 6. Parent text

`writeback-urlParameterId-contractdelta.md` §6.1 step 4 and §6.2, and `singleSelect-filterInstanceIdentity-contractdelta.md` §4, carry a pointer at the amended sentences. Implementers follow **this** delta where those sentences still describe the old order.

`writeback.md` §2.2 public methods stay `{ restore, destroy, whenUrlShareRestoreSettled, presentPendingUrlShareMessage }`.

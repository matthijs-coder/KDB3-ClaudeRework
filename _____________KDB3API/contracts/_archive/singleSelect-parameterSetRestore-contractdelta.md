# Contract Delta: `singleSelect` Parameter-Set Restore

> Delta on top of `contracts/singleSelect.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/singleSelect.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** PO (vastenburg), 2026-07-12
**Sync note:** 2026-07-12 — v3-keys gesynchroniseerd naar het descriptieve schema van `contracts/writeback.md` (`fl.ss` positionele tuples → `filt.sels` objecten `{key, tab?, vals}`); `tabIdxToScopeId` gedefinieerd als de tabs-owner `tabTargets`-map. Met PO-akkoord.
**Amendment:** 2026-07-15 — formeel geamendeerd door `writeback-filterInstanceIdentity-contractdelta.md` §1/§5/§6: het `parameterSetRestoreRequested`-payload krijgt additioneel `inventoryGeneration` (naast bestaand `filters`/`phase`/`tabIdxToScopeId`/`source`/`runId`/`skipHistory`), en de `applied`/`skipped`/`diagnostics`-retourvorm (§3 regels 97–105) wordt uitgebreid met optioneel `inst`, `filterInstanceId` en `degraded` (`code` blijft het enige foutveld). Bestaande velden en semantiek blijven ongewijzigd. Met PO-akkoord (filter-instance identity migration, 2026-07-15).
**Amendment:** 2026-08-10 — review-driven run-lifecycle amendment (status and all prior decisions unchanged): one pinned fresh `inventoryGeneration` per restore run is reused by the clear, `"global"` and `"pageContext"` phases without additional reconcile; the terminal `parameterSetResyncRequested` performs exactly one reconcile and additionally returns the new `inventoryGeneration` (§3/§4); new public action `singleSelect/parameterSetRunFinished` for runtime-only idempotent run-registry cleanup (§3); post-await run/generation/freshness guards and verified host compensation (§4); failure modes and acceptance updated (§5/§6). Cross-file: `writeback-filterInstanceIdentity-contractdelta.md` §4/§6 and `singleSelect-filterInstanceIdentity-contractdelta.md` §6/§6.2/§9. With PO approval.

---

## 1. Purpose

`writebackSet.restore(v3)` must restore supported v3 `filt.sels` filter entries through the `singleSelect` owner. Writeback must not directly mutate single-select state, filter DOM or Cognos filter context.

## 2. v3 Mapping

v3 field:

```js
filt: {
  sels: [
    { key: "Jahr", vals: ["2026"] },
    { key: "Altersgruppe", tab: 2, vals: ["18-25"] }
  ]
}
```

Entry:

```js
{ key, tab?, vals }
```

Where:

- `key` is the semantic filter key.
- `tab` absent means global scope; `tab: <tabIdx>` (number) means page-context scope on that dashboard tab index.
- `vals` are use values, not display values.

## 3. Public Dispatches

Clear:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/parameterSetClearRequested",
  payload: {
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
});
```

Restore:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/parameterSetRestoreRequested",
  payload: {
    filters: filteredSels,
    phase: "global", // or "pageContext"
    tabIdxToScopeId,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

`filteredSels` is the subset of `v3.filt.sels` matching the requested phase: entries without `tab` for `"global"` and entries with `tab` for `"pageContext"`.

`tabIdxToScopeId` is the tabs-owner `tabTargets` map (`{ [tabIdx: string]: { tabId, pageId, scopeId?, visible } }` per `contracts/tabs-parameterSetRestore-contractdelta.md` §3/§3.1). `scopeId` may be absent; the owner must then derive the scope via its own Cognos paths or fail the entry with a diagnostic.

Post-Dienststelle resync:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/parameterSetResyncRequested",
  payload: {
    tabIdxToScopeId,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

Run finished (amendment 2026-08-10):

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/parameterSetRunFinished",
  payload: {
    runId,
    source: "writebackSet",
    outcome: "success" // "success" | "failure" | "cancelled" | "abortedByOwner"
  }
});
```

`singleSelect/parameterSetRunFinished` is the terminal cleanup action for one
parameterSet run. It performs runtime-only idempotent cleanup of the run's
registry record under
`_KDB.runtime.singleSelect.pendingPromises.parameterSetRuns[runId]` (including
its `appliedByInstanceId` registry, pending-promise bookkeeping and pinned
generation record). It never writes host filter values, never mutates
`_KDB.state`, and never pushes history. Result/ack shape:

```js
Promise<{
  ok: boolean,
  runId,
  released: boolean,        // a live registry record was removed by this call
  alreadyReleased: boolean, // record was already gone; idempotent repeat
  diagnostics: Array<{ code, runId?, message }>
}>
```

Semantics:

1. A valid payload requires a non-empty `runId`, `source: "writebackSet"` and an
   `outcome` from the closed enum above. Anything else fails closed with
   `ok: false`, diagnostic `SINGLE_SELECT_PARAMETER_SET_RUN_FINISH_INVALID`, and
   releases nothing.
2. Cleanup is idempotent: an unknown or already-cleaned `runId` resolves
   `ok: true, released: false, alreadyReleased: true` with the informational
   diagnostic `SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED`.
3. `outcome` is recorded in diagnostics only; it triggers no compensation, host
   write or state change.
4. `writebackSet` must dispatch this action in a finally path for every run —
   on success, failure, cancellation and external-owner abort alike.
5. Owner handlers (clear/restore/resync) additionally clean the run's registry
   record immediately on their own terminal failure; the later finally-path
   `parameterSetRunFinished` call is then the idempotent no-op of rule 2.

Return contract:

```js
Promise<{
  ok: boolean,
  applied: Array<{ key, tab? }>,
  skipped: Array<{ key, tab?, code }>,
  diagnostics: Array<{ code, key?, tab?, message }>
}>
```

Amendment 2026-08-10: `parameterSetResyncRequested` additionally returns
`inventoryGeneration` — the new generation produced by its single terminal
reconcile (§4). All other return fields, including the 2026-07-15 `inst`/
`filterInstanceId`/`degraded` extension, are unchanged.

## 4. Restore Semantics

The owner must:

1. validate `runId`;
2. clear owner state/context through owner paths;
3. validate `phase`;
4. restore only entries matching the requested phase (no `tab` for `"global"`, `tab: <tabIdx>` for `"pageContext"`);
5. resolve each entry through filter definitions and parameter mapping;
6. resolve `tab: <tabIdx>` using `tabIdxToScopeId` only in `"pageContext"` phase;
7. write Cognos filter context through existing owner/Cognos wrapper paths;
8. commit reducer state through owner dispatch/reducer paths;
9. avoid history writes when `skipHistory === true`;
10. return per-filter diagnostics.

`writebackSet` must call the global phase before page-context activation and call the page-context phase only after all required tab targets for those page-context entries have been activated/writeback-ready.

If `v3.filt` or `v3.filt.sels` is omitted in a normal restore status, `writebackSet` must not call `singleSelect/parameterSetRestoreRequested`. SingleSelect owner defaults are applied only by explicit reset/default orchestration such as `status === "newDashboard"`.

After Dienststelle restore, `singleSelect/parameterSetResyncRequested` must:

1. validate `runId`;
2. re-read relevant owner state/Cognos context after Dienststelle reconcile;
3. re-apply or confirm committed single-select selections affected by Dienststelle/Sicht dependencies;
4. avoid history writes when `skipHistory === true`;
5. return diagnostics before widget restore starts.

Unsupported filter kinds must be skipped with `WRITEBACK_FILTER_KIND_UNSUPPORTED`, not silently dropped.

### 4.1 Generation Lifecycle And Post-Await Guards (amendment 2026-08-10)

- One restore run pins exactly one fresh `inventoryGeneration`, supplied by
  `writebackSet` from its single pre-phase reconcile. The clear phase and both
  restore phases (`"global"`, `"pageContext"`) reuse that pinned generation and
  dispatch no additional reconcile.
- `parameterSetResyncRequested` is the terminal phase: it performs exactly one
  reconcile after its host writes and returns the resulting new
  `inventoryGeneration` in its result. No other parameterSet phase changes the
  generation.
- Post-await guards: after every awaited boundary (readiness wait, host write,
  host reread, reconcile), the owner revalidates — before any further host write
  and before committing reducer state — that the `runId` is still current, the
  pinned `inventoryGeneration` is still current, and `inventory.freshness` is
  `"fresh"`. A guard failure skips the write/commit with a coded diagnostic:
  `WRITEBACK_RESTORE_CANCELLED` for a stale run,
  `WRITEBACK_SINGLESELECT_INVENTORY_STALE` for a stale generation or freshness.
- Verified host compensation: when a guard fails after a host write, or commit
  verification fails, the owner restores the prior confirmed pair on the same
  host instance through write plus reread verification before returning. State
  is never committed from an unverified host value, and no history is pushed.
- Terminal owner failure of clear/restore/resync cleans the run's registry
  record immediately (§3, `parameterSetRunFinished` rule 5).

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| clear failure | abort SET before filter restore, except `status === "newDashboard"` may continue with non-fatal diagnostic + reset defaults |
| missing tab target for page-context scope | fail that entry with `WRITEBACK_TABS_TARGET_MISSING` |
| unsupported filter kind | diagnostic `WRITEBACK_FILTER_KIND_UNSUPPORTED` |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| required filter restore failure | owner returns `ok: false`; `writebackSet` decides abort/degrade by v3 tolerance matrix |
| post-Dienststelle resync failure | return diagnostic; `writebackSet` aborts before widget restore for required filters |
| stale generation/freshness detected post-await | skip write/commit with `WRITEBACK_SINGLESELECT_INVENTORY_STALE`; verified host compensation for already-written hosts (§4.1) |
| invalid `parameterSetRunFinished` payload | fail closed with `SINGLE_SELECT_PARAMETER_SET_RUN_FINISH_INVALID`; nothing is released |
| repeated/unknown `parameterSetRunFinished` runId | idempotent no-op: `ok: true, alreadyReleased: true` with `SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED` |

## 6. Acceptance

- Global and page-context entries restore through the same owner action but with explicit `phase`.
- `scopeId` is never persisted in v3.
- Display values are not required for restore.
- No history step is pushed during parameter-set restore.
- Unsupported filters produce diagnostics.
- Post-Dienststelle resync completes before widget restore starts.
- Clear, global and page-context phases reuse the run's single pinned fresh
  `inventoryGeneration`; only the terminal resync performs a reconcile and
  returns the new `inventoryGeneration` (amendment 2026-08-10).
- Every run ends with an idempotent `parameterSetRunFinished` cleanup dispatched
  by `writebackSet` in a finally path; owner terminal failure cleans the run
  registry immediately, and the cleanup never mutates host, state or history
  (amendment 2026-08-10).
- Post-await run/generation/freshness guards protect every host write and state
  commit; stale detection or verification failure triggers verified host
  compensation and never commits an unverified value (amendment 2026-08-10).

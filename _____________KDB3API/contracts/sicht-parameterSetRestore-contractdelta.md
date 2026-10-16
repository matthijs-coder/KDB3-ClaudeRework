# Contract Delta: `sicht` Parameter-Set Restore

> Delta on top of `contracts/sicht.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved`
**Parent contract:** `contracts/sicht.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** PO (vastenburg), 2026-07-12
**Sync note:** 2026-07-12 — v3-keys gesynchroniseerd naar het descriptieve schema van `contracts/writeback.md` (`fl.si` → `filt.sicht`), met PO-akkoord.
**Amendment:** 2026-07-12 — `dstlWillFollow`-vlag toegevoegd aan de downstream-visibility-payload (PO-akkoord); zie §3/§4.
**Amendment:** 2026-07-15 — formeel geamendeerd door `sicht-filterInstanceIdentity-contractdelta.md` §7: het `sicht/parameterSetRestoreRequested`-payload (§3 regels 51–61) krijgt additioneel `inventoryGeneration`; bestaande `sicht`/`source`/`runId`/`skipHistory`/`status`-velden blijven ongewijzigd. De feitelijke filter-write wordt gedelegeerd aan de canonieke singleSelect-instance. Met PO-akkoord (filter-instance identity migration, 2026-07-15).

---

## 1. Purpose

`writebackSet.restore(v3)` must restore v3 `filt.sicht` through the `sicht` owner and trigger downstream visibility semantics before Dienststelle/widget restore.

## 2. v3 Mapping

v3 field:

```js
filt: { sicht: "BW" }
```

`sicht` is a semantic Sicht use value. It must not contain Cognos `sourceId`/`itemId`.

## 3. Public Dispatches

Clear:

```js
_KDB.api.sicht.dispatch({
  type: "sicht/parameterSetClearRequested",
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
_KDB.api.sicht.dispatch({
  type: "sicht/parameterSetRestoreRequested",
  payload: {
    sicht: v3.filt.sicht,
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
});
```

Downstream visibility:

```js
_KDB.api.sicht.dispatch({
  type: "sicht/parameterSetDownstreamVisibilityRequested",
  payload: {
    sicht: v3.filt.sicht,
    dstlWillFollow: v3.filt.dstl !== undefined,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

`dstlWillFollow` semantics: when `true`, step 21 (`dienststelle/parameterSetRestoreRequested`) follows and will realign Dienststelle itself — the Sicht owner must notify only non-Dienststelle downstream owners (e.g. specialSingleSelect) and must not trigger the full `dienststelle/sichtChanged` pass (avoids duplicate restore side-effects). When `false`, no Dienststelle restore follows — the Sicht owner must trigger the full Dienststelle downstream notification (history-suppressed) so Dienststelle realigns to the restored Sicht.

Each dispatch must expose an awaitable completion point to `writebackSet`.

## 4. Restore Semantics

The owner must:

1. validate `runId`;
2. clear Sicht state/Cognos context via owner paths;
3. restore the semantic Sicht value through existing confirmed-commit semantics;
4. avoid startup-default behavior unless `status` explicitly requests default restore;
5. trigger downstream visibility before Dienststelle restore, honoring `dstlWillFollow` (§3);
6. avoid history writes when `skipHistory === true`;
7. return diagnostics.

If `v3.filt` or `v3.filt.sicht` is omitted in a normal restore status, `writebackSet` must not call `sicht/parameterSetRestoreRequested` or `sicht/parameterSetDownstreamVisibilityRequested`. Sicht owner defaults are applied only by explicit reset/default orchestration such as `status === "newDashboard"`.

`status === "sichtChange"` is reserved/deferred in writeback tranche 1. If a later tranche promotes it, the Sicht owner delta must define change semantics instead of cold-start semantics.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| clear failure | abort SET before filters restore, except `status === "newDashboard"` may continue with non-fatal diagnostic + reset defaults |
| unsupported Sicht value | fail with `WRITEBACK_INVALID_V3_PAYLOAD` or owner diagnostic |
| Sicht restore/downstream visibility failure | fail with `WRITEBACK_SICHT_RESTORE_FAILED` |
| stale `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| downstream visibility failure | abort before Dienststelle restore |

## 6. Acceptance

- `filt.sicht` restores to owner-confirmed Sicht state.
- Downstream visibility is applied before Dienststelle restore.
- No history step is pushed for parameter-set restore.
- Clear failure aborts SET, except `status === "newDashboard"` may continue with non-fatal diagnostic + reset defaults.

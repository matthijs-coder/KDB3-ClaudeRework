# Contract: `WBParameterSet` — deferred Dienststelle hierarchy validation

> CP-3 product decision: hierarchy validation against `dienststelle_*_hierarchy` does not belong in normal Dienststelle paths. It may be reintroduced only when parameter-set restore / `WBParameterSet` is implemented.

---

**Status:** `Deferred`
**Owner module / service:** `WBParameterSet` (future) / `dienststelle` (consumer)
**Related contracts:**

```txt
_____________KDB3API/contracts/dienststelle.md
_____________KDB3API/contracts/_archive/dienststelle-port-execution-spec.md
```

**Authoring AI:** GPT-5.5, 2026-05-27
**Product decision date:** 2026-05-27 (CP-3)

---

## 1. Background

During the initial Dienststelle direct port, hierarchy validation was implemented in normal effect paths:

- (former `isDienststelleValueAvailable.js`; folded into `effects/reconcile/defaults.js`) read rows from `dienststelle_bw_hierarchy` / `dienststelle_dezpv_hierarchy` and matched a candidate value by `useValue` or `displayValue`.
- (former `applyDienststelleDefault.js`, now `applyDefault` in `effects/reconcile/defaults.js`) called that helper before applying a default via Cognos `replaceFilterContext`.
- (former `reconcileConfirmedDienststelle.js`, now `effects/reconcile/runReconcile.js`) waited for both the default table and the hierarchy table to reach lifecycle `ready` before reconcile proceeded.

## 2. Problem that motivated removal

When `dienststelle_bw_hierarchy` (or DEZPV equivalent) was lifecycle `ready` but had **rowCount 0**, hierarchy validation blocked normal flows:

- Sicht startup could not apply the BW default (`MAG`) from `dienststelle_bw_default`.
- Default apply returned `null` even though the default table had a valid row.
- Reconcile unnecessarily depended on hierarchy table readiness for paths that only need the default table.

This was incorrect for normal Dienststelle behavior. An empty hierarchy table must not prevent defaulting or reconcile on startup, Sicht switch, filterDock confirm, or history replay.

## 3. CP-3 decision — validation removed from normal paths

Hierarchy validation against `dienststelle_*_hierarchy` must **not** run in:

| Path | Validation removed |
|---|---|
| Sicht startup | yes |
| Sicht switch (confirmed commit) | yes |
| Normal reconcile | yes |
| Default apply (`applyDienststelleDefault`) | yes |
| filterDock confirm / Cognos read after OK | yes |
| History replay | yes |

Normal default apply reads only from `dienststelle_*_default` and writes through Cognos when a filter API is available. Reconcile waits only on the active default table key, not the hierarchy table key.

`hierarchyTableKey` remains in `dienststelle/config.js` (`DEFINITIONS`) and owner state metadata for future `WBParameterSet` use. No broad cleanup of hierarchy metadata is required in CP-3.

## 4. Deferred scope — where validation belongs later

Hierarchy validation may be reintroduced **only** when implementing parameter-set restore / `WBParameterSet`:

- Restore of Dienststelle values from a saved parameter set or writeback payload.
- Validation that restored `useValue` / `displayValue` exists in the active hierarchy semantics table before commit.

Until that tranche:

- Do not add `isDienststelleValueAvailable` (or equivalent) back into startup, reconcile, default apply, filterDock, or history replay paths.
- Do not wait on hierarchy table readiness for normal reconcile.

## 5. TODO (future tranche)

- [ ] Implement parameter-set restore entry point for Dienststelle (`restoreDienststelleFromParameterSet` or equivalent under `WBParameterSet`).
- [ ] Reintroduce hierarchy validation **only** at restore time: validate candidate values against `dienststelle_*_hierarchy` before applying restored selections.
- [ ] Define fallback when hierarchy is ready but empty vs. when hierarchy is not yet loaded during restore.
- [ ] Document interaction with BW old-to-new ID map if parameter-set payloads carry legacy identifiers.

## 6. Acceptance note for CP-3

After CP-3:

1. Sicht startup BW applies default `MAG` via Cognos even when `dienststelle_bw_hierarchy` has rowCount 0.
2. No normal Dienststelle effect caller invokes hierarchy availability validation.
3. CP-2 host lookup remains on `activeFilterKey` (`Dienststelle_BW` / `Dienststelle_DEZPV`), not `visibleFilterLabel`.

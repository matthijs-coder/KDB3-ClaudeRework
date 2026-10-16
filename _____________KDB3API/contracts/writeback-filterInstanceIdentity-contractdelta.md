# Contract Delta: `writeback` Filter-Instance Identity

> Migrates `filt.sels` collection and restore from label buckets to public
> filter-instance selectors while keeping Cognos internal IDs out of persisted v3.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15` — GET/SET collectors + generation lifecycle landed 2026-08-10; §10 round-trip tests still missing, PO sign-off pending.
**Owner module / service:** `writebackGet` / `writebackSet`
**Type:** `shared-service consumer contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/writeback.md`
**Depends on:** `singleSelect-filterInstanceIdentity-contractdelta.md`,
`cognosAPI-filters-instanceInventory-contractdelta.md`,
`tabs-filterScopeSelectors-contractdelta.md`

---

## 1. Purpose

Writeback must export and restore each supported single-select instance separately.
It may persist semantic tab/filter identity, but must not persist Cognos
`scopeId`, `itemId`, `sourceId`, `filterInstanceId` or DOM identity.

This delta preserves v3 compatibility and adds an optional semantic discriminator
for two same-label filters in one tab.

It supersedes the `filt.sels[]` row/shape in `writeback.md` §4.3 lines 508–543,
§4.6 line 668 and §4.7 line 731 by adding optional `inst`. It also formally amends
the Approved `singleSelect-parameterSetRestore-contractdelta.md` §3 lines 97–105
return shape as defined in §5 below.

## 2. Persisted Schema

`filt.sels` remains an array of descriptive objects:

```js
{
  key: "<semantic filter key>",
  inst: "<optional semantic instance key>",
  tab: 0,
  vals: ["<useValue>"]
}
```

Rules:

- `key` remains the semantic filter name/key.
- `tab` remains the dashboard tab index and is omitted for global filters.
- `vals` contains semantic Cognos use values only.
- `inst` is optional and contains the config-owned `semanticInstanceKey`.
- `inst` is emitted only when needed to distinguish two live entries with the same
  `key` and same global/page tab target, or when config explicitly requires it.
- Existing v3 without `inst` remains valid.
- `inst` is not `itemId`, `scopeId`, `filterInstanceId`, tabId, pageId or a DOM ID.
- Display values are not persisted.

Schema normalization preserves `inst` as a trimmed non-empty string when present.
Unknown/empty `inst` is omitted, not converted to a host ID.

This schema addition is a blocking implementation prerequisite:

- `normalizeFilters.js` preserves valid `inst`;
- `validateFilters.js` adds `inst` to the allowed entry fields and validates it as
  optional non-empty string;
- old records without `inst`, mixed old/new arrays and new records with `inst` have
  normalize/validate/round-trip tests;
- GET must not emit `inst` until the normalizer and validator ship in the same
  tranche.

## 3. GET Collection

`writebackGet` consumes the published singleSelect instance selector:

```js
readFilterInstances(_KDB, {
  status: "active",
  hostStatus: "present"
})
```

It must not collect from `getState().byScope`.

Before collecting page-context instances, GET awaits
`tabs/resolveFilterScopeTargets` and passes that live map to the tabs scope-match
selector. The collector validates returned layout scopes against the singleSelect
inventory and does not rely on tabId/pageId alias equality alone.

For each projected instance:

1. exclude filters whose canonical domain owner is `sicht` or `dienststelle`;
2. read `useValue` only;
3. omit empty/default selections according to existing writeback rules;
4. global: emit no `tab`;
5. pageContext: map `scopeId` to exactly one `tabIdx` through the tabs-owner
   projection;
6. emit `inst` when same `key + tab` would otherwise be ambiguous;
7. sort deterministically by global/page, tab, key and inst.

Every selected owner instance produces at most one `filt.sels` entry. No label map
may collapse two instances.

Failure policy:

- no scope-to-tab match:
  `WRITEBACK_SINGLESELECT_SCOPE_TARGET_MISSING`;
- scope maps to multiple tabs:
  `WRITEBACK_SINGLESELECT_SCOPE_TARGET_AMBIGUOUS`;
- same key/tab instances lack unique semantic keys:
  `WRITEBACK_SINGLESELECT_INSTANCE_KEY_MISSING`;
- missing `useValue` for a non-empty confirmed selection:
  `WRITEBACK_SINGLESELECT_USE_VALUE_MISSING`.

Unsafe entries are skipped with diagnostics; GET never guesses. Required-filter
policy from the parent contract still determines whether the final GET is degraded
or failed.

## 4. SET Resolution

`writebackSet` owns exactly one restore-time tabs scope resolution and one
singleSelect inventory reconcile before filter-owner restore phases. It
dispatches/awaits:

```js
{
  type: "singleSelect/reconcileFilterInstances",
  payload: {
    reason: "parameterRestore",
    runId: "<writeback run id>"
  }
}
```

The successful result's `generation` is carried to Sicht, singleSelect and
specialSingleSelect work. Live tab targets are converted to the already-approved
`tabIdxToScopeId` payload for page-context owners; no new Dienststelle payload field
is introduced. Consumers reuse the generation and must not start competing
restore-time reconciles. A stale generation returns
`WRITEBACK_SINGLESELECT_INVENTORY_STALE`.

Generation lifecycle (amendment 2026-08-10):

1. The pre-phase reconcile's `generation` is pinned once per run as the run's
   fresh `inventoryGeneration`. The clear phase, the `"global"` restore phase
   and the `"pageContext"` restore phase all reuse this pinned generation and
   trigger no additional reconcile.
2. Only the terminal `singleSelect/parameterSetResyncRequested` performs a
   reconcile — exactly one, owner-internal, after its host writes — and returns
   the resulting new `inventoryGeneration` in its result.
3. `writebackSet` treats only that terminal resync transition as an expected
   generation change. It validates the returned `inventoryGeneration` against
   the current owner inventory (current, non-superseded generation with
   `freshness: "fresh"`) before continuing, then passes the new generation to
   the subsequent specialSingleSelect sync phase.
4. Any other observed generation or freshness change during the run is
   unexpected: the affected work fails with
   `WRITEBACK_SINGLESELECT_INVENTORY_STALE` and the run aborts or degrades per
   the parent tolerance matrix.
5. Owner-side post-await run/generation/freshness guards before host writes and
   state commits, and verified host compensation on stale detection or
   verification failure, are defined in
   `singleSelect-parameterSetRestore-contractdelta.md` §4.1; writeback never
   reports success from an unverified host value.

Each persisted entry resolves as follows:

### 4.1 Global

`key + optional inst + scopeType: "global"` must match exactly one live owner
instance.

### 4.2 Page context

1. Resolve `tab` through tabs-owned `tabTargets`.
2. Derive the live Cognos `scopeId`.
3. Resolve `key + optional inst` within that scope.
4. Apply to the matched canonical `filterInstanceId`.

An absent `inst` is accepted only when exactly one instance matches the old
`key + target` tuple. Multiple matches return
`WRITEBACK_SINGLESELECT_INSTANCE_AMBIGUOUS`.

Restore never scans by label and picks the first Cognos object.

## 5. Restore Display/Use Semantics

Persisted `vals` are use values. For every non-empty restore:

1. Ask the owner/config/table mapping for a true display/use pair.
2. Write the pair through the owner action.
3. If true display is unavailable, use the single owner restore helper for a
   transport-only `d = u` and mark
   `WRITEBACK_SINGLESELECT_DISPLAY_DEGRADED`; do not commit that `d` as owner
   display.
4. Reread the same host instance (one-shot `readValues`; no extra loop).
5. Commit `.d` and `.u` separately. Unique `resolveRestoreSelectionPair` hit:
   resolved `d` may win over observed `d`; resync must not abort SET solely
   because host `.d` ≠ resolved `d`. Skip write (not throw) on `"unavailable"`
   after F1.

Empty `vals` restores the explicit Alle/empty policy selection.

The Approved restore contract's `applied` / `skipped` arrays are extended, not
replaced:

```js
Promise<{
  ok: boolean,
  applied: Array<{
    key, inst?, tab?, filterInstanceId, degraded
  }>,
  skipped: Array<{
    key, inst?, tab?, filterInstanceId?, degraded, code
  }>,
  diagnostics: Array<{
    code, key?, inst?, tab?, filterInstanceId?, message
  }>
}>
```

`code` remains the sole skipped/error field name; `errorCode` is not introduced in
this return shape.

The public persisted/result payload must not expose the runtime Cognos API object.

## 6. Restore And Resync Actions

Existing action names remain:

```txt
singleSelect/parameterSetClearRequested
singleSelect/parameterSetRestoreRequested
singleSelect/parameterSetResyncRequested
```

`parameterSetRestoreRequested` accepts the v3 entries plus `tabIdxToScopeId` and
`inventoryGeneration`, formally amending the Approved restore payload in
`singleSelect-parameterSetRestore-contractdelta.md` §3. It resolves entries to
canonical instances and rejects a stale generation. The per-run page-context
registry is part of
the in-flight coordination record under
`_KDB.runtime.singleSelect.pendingPromises.parameterSetRuns[runId]`:

```js
appliedByInstanceId[filterInstanceId] = {
  key,
  inst,
  tab,
  scopeId,
  useValue
}
```

It is runtime-only and is removed when the restore/resync run settles or is
superseded.

Run cleanup (amendment 2026-08-10): every run ends with

```js
{
  type: "singleSelect/parameterSetRunFinished",
  payload: {
    runId,
    source: "writebackSet",
    outcome: "success" // "success" | "failure" | "cancelled" | "abortedByOwner"
  }
}
```

dispatched by `writebackSet` in a finally path on success, failure, cancellation
and external-owner abort alike. The action is runtime-only and idempotent,
cleans the parameterSet run registry, mutates no host or `_KDB.state` value and
pushes no history; its full result/ack shape and diagnostics
(`SINGLE_SELECT_PARAMETER_SET_RUN_FINISH_INVALID`,
`SINGLE_SELECT_PARAMETER_SET_RUN_ALREADY_RELEASED`) are defined in
`singleSelect-parameterSetRestore-contractdelta.md` §3. Owner handlers
additionally clean the run's registry record immediately on their own terminal
failure; the finally-path call is then an idempotent no-op.

Resync iterates this instance registry. It must not read or broadcast a label-keyed
owner value. After host writes it dispatches/awaits one reconcile — the run's
only post-pin reconcile — and returns the combined structured diagnostics plus
the new `inventoryGeneration` (amendment 2026-08-10, §4).

Clear enumerates canonical supported instances against the run's pinned
`inventoryGeneration` and clears each host object exactly once. Amendment
2026-08-10: clear performs no reconcile; the pinned generation remains valid
through clear and both restore phases, and only the terminal resync reconciles
(§4). It does not clear Sicht/Dienststelle through singleSelect.

## 7. Tabs Mapping

`tabIdxToScopeId` remains runtime-derived and is never persisted.

- Tabs owner supplies `{tabId, pageId, scopeId?, visible}`.
- `scopeId` from the live layout-container resolver is preferred and is verified
  against enumerated Cognos filter scopes.
- A normalized `scopeId` may be matched to stable slot `pageId/tabId` aliases only
  as diagnostic fallback; alias-only evidence cannot authorize a filter write.
- Missing/ambiguous mapping returns
  `WRITEBACK_TABS_TARGET_MISSING`; no candidate-order fallback.
- Hidden tabs are activated/readied under the existing restore sequence before host
  filter writes.

## 8. Legacy Compatibility

Old v3 records without `inst`:

- restore normally when one live instance matches;
- fail only the ambiguous entry when multiple same-key instances exist;
- never acquire/persist a Cognos ID during migration.

Old page-context records remain tab-index based. The migration does not reinterpret
tab position as filter identity.

The legacy `collectSingleSelectPageContext.js` was removed on 2026-08-10; the instance collector is the sole GET source.

## 9. Public Boundaries

- Read filter state through published selectors.
- Mutate owners only through `_KDB.api.<owner>.dispatch`.
- Read tabs through its API/selectors.
- Cognos objects and owner internals are not imported into writeback.
- No direct `_KDB.state.filters.*` or `_KDB.state.tabs` access.
- `writebackSet` retains structured `{ok, degraded, diagnostics}` owner acks and the
  existing ordered restore phases.

## 10. Planned Implementation Impact

Expected responsibilities after contract approval:

```txt
core/services/writeback/get/collectors/collectFilters.js
core/services/writeback/get/collectors/collectFilterTargets.js
core/services/writeback/get/collectors/collectSingleSelectInstances.js
core/services/writeback/get/collectors/singleSelectCollectorInventory.js
core/services/writeback/get/collectors/singleSelectCollectorScope.js
core/services/writeback/get/collectors/singleSelectCollectorMaterialize.js
core/services/writeback/get/collectors/buildScopeIdToTabIdx.js
core/services/writeback/schema/normalize/normalizeFilters.js
core/services/writeback/schema/validate/validateFilters.js
core/services/writeback/set/effects/runFilterRestore.js
core/services/writeback/set/effects/filterRestoreTargets.js
core/services/writeback/set/effects/filterRestoreGeneration.js
core/services/writeback/set/effects/finalizeSingleSelectRun.js
core/services/writeback/set/effects/executeRestoreRunCleanup.js
core/services/writeback/set/effects/restoreRunBranches.js
core/services/writeback/set/effects/restoreRunGuards.js
core/services/writeback/set/effects/restoreRunState.js
dashboard/tabs/actions/resolveFilterScopeTargets.js
dashboard/filters/singleSelect/actions/handleParameterSetClear.js
dashboard/filters/singleSelect/actions/handleParameterSetRestore.js
dashboard/filters/singleSelect/actions/handleParameterSetResync.js
dashboard/filters/singleSelect/actions/restoreFilterInstances.js
dashboard/filters/singleSelect/actions/applyRestoreSelection.js
```

Schema and round-trip test files are required in the repository's existing
writeback test location. No TEST/legacy production artifact is used as evidence or
modified.

Exact splits follow the file-size/import rules. Existing uncommitted tab-CRUD owner
files are foreign work and require cross-review before overlap.

## 11. Acceptance

1. GET emits two `Berufsfamilie` entries for two tab scopes.
2. GET emits global and page-context same-label entries separately.
3. Same-label same-tab siblings round-trip when semantic `inst` keys exist.
4. Old entries without `inst` still restore when uniquely resolvable.
5. Ambiguous old entries fail visibly and never choose the first item.
6. SET targets one scope/item instance per entry.
7. Display is host/table resolved or visibly degraded; it is never silently copied
   from use.
8. `scopeId`, `itemId` and `filterInstanceId` are absent from serialized v3.
9. Hidden tabs restore through existing readiness sequencing.
10. No direct foreign state, DOM or WBParameter scraping is introduced.
11. Existing global filter v3 remains compatible.
12. One pinned fresh `inventoryGeneration` serves the clear, global and
    page-context phases without additional reconciles; only the terminal resync
    reconciles and returns the new generation, which is validated against the
    current inventory and passed to the specialSingleSelect sync (§4).
13. Every run — success, failure, cancellation or external-owner abort —
    dispatches `singleSelect/parameterSetRunFinished` in a finally path;
    cleanup is runtime-only, idempotent and free of host/state/history effects
    (§6).
14. A generation or freshness change outside the terminal resync transition
    fails with `WRITEBACK_SINGLESELECT_INVENTORY_STALE`; no unverified host
    value is committed or reported as success (§4).

## 12. Out Of Scope

- PDF consumer changes;
- Dienststelle schema changes;
- tab CRUD implementation;
- persisting display labels or Cognos internal IDs;
- multi-select filters outside existing v3 support.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Instance-aware v3 direction approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions, including the additive `inst` schema and the formal amendment (§1/§5/§6) to the Approved `singleSelect-parameterSetRestore-contractdelta.md`. Contract text approved; separate production-start authorization was still required at this entry; build/atomic-tranche gates apply. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started under the approved schema, restore policy and tranche gates. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 run-lifecycle amendment` | PO vastenburg | Review-driven parameterSet run-lifecycle amendment: one pinned fresh `inventoryGeneration` per run reused by clear/global/page phases without reconcile; terminal resync performs exactly one reconcile and returns the new `inventoryGeneration`, which writeback validates against current inventory and passes to the special sync; any other mid-run generation/freshness change fails with `WRITEBACK_SINGLESELECT_INVENTORY_STALE` (§4). Mandatory finally-path `singleSelect/parameterSetRunFinished` cleanup on success/failure/cancellation/external-owner abort, with owner-side immediate registry cleanup on terminal owner failure (§6; action contract in `singleSelect-parameterSetRestore-contractdelta.md` §3). Acceptance items 12–14 added. No 2026-07-15 decision is revised. |
| 2026-09-09 | `Implementation in progress (status unchanged) — restore table-display overlay` | PO vastenburg (Cognos green) | §5 steps 4–5: unique hit resolved `d` may win over observed `d`; resync must not abort SET solely because host `.d` ≠ resolved `d`; skip-write (not throw) on `"unavailable"` after F1. Law: `singleSelect-restore-table-display-contractdelta.md`. No 2026-07-15 decision is revised. |

# Contract Delta: `historyService` Filter-Instance Replay Identity

> Extends the serializable `filter_singleSelect` step contract and keeps replay
> delegated to the filter owner.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `historyService` and `singleSelect` replay contribution
**Type:** `shared-service / owner-replay contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contracts:** `contracts/historyService.md`, `contracts/singleSelect.md`
**Depends on:** `singleSelect-filterInstanceIdentity-contractdelta.md`

---

## 1. Purpose

Undo/redo for singleSelect must replay one concrete live filter instance. Label plus
`filterScope` is insufficient for page-context filters and must not route replay to
the first Cognos match.

`historyService` remains a generic stack/replay coordinator. `singleSelect` creates,
validates and applies its own instance-aware steps through the existing internal
`_deps.replayHandlers` injection described by `historyService.md` §10 lines 216–228.
This delta extends that replay payload contract; it does not introduce registration.

## 2. Ownership

- `_KDB.state.history` remains owned only by `historyService`.
- `_KDB.state.filters.singleSelect` remains owned only by `singleSelect`.
- `historyService` does not interpret filter identity or mutate filter state.
- The `singleSelect` replay handler resolves current host identity and dispatches
  owner work.
- Replay handler contribution remains runtime-only.

## 3. New Step Shape

New `filter_singleSelect` committed steps use:

```js
{
  key: "filter_singleSelect",
  timestamp: 0,
  old: {
    filterInstanceId: "<live canonical id>",
    scopeType: "global" | "pageContext",
    scopeId: "<raw Cognos scope>",
    itemId: "<Cognos item id or null>",
    semanticInstanceKey: "<stable semantic key>",
    filterLabel: "<label>",
    displayValue: "<display or null>",
    useValue: "<use>",
    displaySource: "cognos" | "table" | "policy" | "unavailable"
  },
  new: {
    filterInstanceId: "<same live canonical id>",
    scopeType: "global" | "pageContext",
    scopeId: "<same raw Cognos scope>",
    itemId: "<same Cognos item id or null>",
    semanticInstanceKey: "<same semantic key>",
    filterLabel: "<same label>",
    displayValue: "<display or null>",
    useValue: "<use>",
    displaySource: "cognos" | "table" | "policy" | "unavailable"
  }
}
```

Rules:

- `old` and `new` must identify the same logical live instance.
- `displayValue` and `useValue` remain separate.
- Empty/Alle is `{displayValue: "Alle", useValue: ""}`.
- No DOM refs, Cognos API objects, tab positions or mutable state objects enter a
  step.
- `scopeId` and `itemId` are allowed in the in-session history stack but are not
  writeback persistence fields.
- Step values are deeply cloned/normalized by the service without dropping the
  identity fields.
- All owner-specific replay metadata, including dependencies, lives inside both
  `old` and `new`. New top-level step fields beyond `key`, `timestamp`, `old` and
  `new` are forbidden and are not relied upon.

## 4. Step Validation

Before push, the singleSelect step builder/validator guarantees:

1. both values are serializable;
2. both carry matching `scopeType`;
3. normalized scope, item/semantic key and label identify the same instance;
4. both have an explicit `useValue`;
5. display may be `null` only with a coded degraded source from the owner;
6. `filterInstanceId` is present on both `old` and `new` for new steps.

Invalid steps are rejected with `HISTORY_STEP_INVALID`; no partial step is pushed.

The generic service validates only serializability and the allowlisted step shape;
it does not interpret filter identity or validate whether the Cognos instance is
currently live. Identity checks above and replay liveness remain owner
responsibility.

## 5. Replay Resolution

The singleSelect replay handler:

1. ensures/reconciles the current instance inventory when stale; amendment
   2026-08-10: a stale inventory is refreshed by dispatching
   `singleSelect/reconcileFilterInstances` with `reason: "historyReplay"`, and
   resolution proceeds only on a successful result committed as `fresh` — a
   failed, degraded-to-stale or superseded reconcile fails the replay closed
   with `SINGLE_SELECT_HISTORY_REPLAY_FAILED` and resolves nothing against the
   stale inventory;
2. tries the exact `filterInstanceId`;
3. verifies its scope/item tuple still matches;
4. if a remount/rebuild produced a different string ID, resolves the complete
   `scopeType + scopeId + itemId/semanticInstanceKey` tuple;
5. applies the target d/u pair to that one instance;
6. rereads host d/u and commits owner state;
7. returns a structured boolean/result to historyService.

It must not resolve by label alone when multiple live matches exist.

Failure codes:

- no live match: `SINGLE_SELECT_HISTORY_INSTANCE_MISSING`;
- multiple matches: `SINGLE_SELECT_HISTORY_INSTANCE_AMBIGUOUS`;
- target display unavailable and cannot safely write:
  `SINGLE_SELECT_HISTORY_DISPLAY_UNAVAILABLE`;
- host write/reread failure: `SINGLE_SELECT_HISTORY_REPLAY_FAILED`;
- compensation/rollback failure (amendment 2026-08-10):
  `SINGLE_SELECT_HISTORY_ROLLBACK_FAILED`;
- special owner notification failure (amendment 2026-08-10):
  `SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED`.

History pointer movement follows the existing service contract: failed owner replay
does not silently advance the pointer.

Failure visibility (amendment 2026-08-10): every replay failure — missing,
ambiguous, invalid step, display unavailable, host write/reread failure,
rollback failure and owner notification failure — is recorded visibly in the
singleSelect owner state (`lastDiagnostics` and, where applicable,
`errorCode`/`errorMessage`), not only in the returned result. In all of these
cases the history pointer stays unchanged.

Target display policy (amendment 2026-08-10): the target value's
`displaySource` allowlist remains exactly `cognos | table | policy |
unavailable`. Replay rejects a target with `displayValue: null` unless its
`displaySource` is `"unavailable"`; a null display is never substituted with
the use value.

Special owner notification (amendment 2026-08-10): replaying a generic
`filter_singleSelect` step that targets a visible special instance must, after
the host commit, await the `specialSingleSelect` owner notification. If that
notification fails or is rejected, the handler compensates by rolling back the
host write to the prior pair and reports the replay failed
(`SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED`; a failed rollback additionally
records `SINGLE_SELECT_HISTORY_ROLLBACK_FAILED`). Replay of a regular
(non-special) singleSelect-owned instance performs no foreign owner
notification.

## 6. Legacy Step Compatibility

Legacy step values may contain only:

```js
{
  filterScope,
  filterLabel,
  itemId,
  displayValue,
  useValue
}
```

Compatibility resolver:

- global: replay only when one live global instance matches itemId or unique label;
- pageContext: replay only when one live page-context instance matches all available
  fields across the complete inventory;
- zero matches: missing diagnostic;
- multiple matches: ambiguous diagnostic and no replay.

Legacy page-context history cannot be safely migrated when multiple tabs contain the
same label/item. It is rejected visibly rather than assigned to the active tab.

No persistent migration rewrites old stack entries in place. Successful legacy
resolution may be logged diagnostically but retains immutable step history.

Builder, `normalizeHistoryStep`, replay-handler wiring and legacy resolution ship as
one atomic migration gate. Identity-aware step creation remains disabled until all
four are deployed together; this prevents a rich step from being normalized or
replayed by a label-only path.

## 7. Tab Mutation Interaction

The current tab-CRUD tranches publish no history frames. This delta does not add
them.

If a future tab-history delta replays content movement:

- tab owner replays the tab saga;
- filter owner applies its tab-mutation snapshot/permutation;
- historyService never rewrites scope IDs itself.

A singleSelect step whose physical host instance was removed after a tab mutation
fails as missing unless the future tab-history contract supplies a safe logical
remap.

## 8. Writeback Restore Guard

Existing `beginWritebackRestore(runId)` / `finishWritebackRestore(runId)` behavior
continues to suppress ordinary history commits during parameter restore.

Reconcile, restore and resync actions carrying `skipHistory: true` must not push
instance steps. A stale run cannot publish a late step.

## 9. Public Boundary

- `historyService` named-method public API remains unchanged.
- No filter-specific public method is added to `_KDB.services.history`.
- `singleSelect` contributes its replay handler through the existing staged runtime
  contribution.
- The handler calls only `_KDB.api.singleSelect.dispatch` / owner-local effects.
- No history code imports singleSelect state/effects internals.

## 10. Planned Implementation Impact

Expected responsibilities after contract approval:

```txt
dashboard/filters/singleSelect/history/buildCommittedStep.js
dashboard/filters/singleSelect/history/applySingleSelectHistoryReplay.js
dashboard/filters/singleSelect/history/createSingleSelectHistoryReplayHandler.js
dashboard/filters/singleSelect/effects/replayCommittedSelection.js
core/services/historyService/state/normalizeHistoryStep.js
```

The history service change is limited to preserving/validating the allowlisted
identity fields nested under `old` and `new`; all filter semantics stay in the owner
handler.

## 11. Acceptance

1. Undo on tab B never changes same-label tab A.
2. Global/pageContext same-label steps replay independently.
3. New history retains separate display/use values.
4. A stale ID can resolve only through a unique complete tuple.
5. Ambiguous legacy page-context history fails without pointer advance.
6. Unique legacy global/history remains replayable.
7. Parameter restore creates no history entries.
8. historyService performs no foreign state write or filter API lookup.
9. Replay over a stale inventory resolves only after a successful `fresh`
   reconcile with `reason: "historyReplay"`; a failed reconcile fails the
   replay closed without resolution (§5).
10. Every replay failure — missing, ambiguous, invalid step, display
    unavailable, host write/reread, rollback, owner notify — is recorded
    visibly in singleSelect owner diagnostics/error state and leaves the
    history pointer unchanged (§5).
11. Replay of a visible special generic step awaits the `specialSingleSelect`
    owner notification and compensates/rolls back on failure; regular replay
    performs no foreign owner notification (§5).
12. Replay rejects a target with `displayValue: null` unless
    `displaySource: "unavailable"`; the `displaySource` allowlist stays
    `cognos | table | policy | unavailable` (§5).

## 12. Out Of Scope

- persisted writeback schema;
- tab CRUD history frames;
- migrating historical ambiguous records by user prompt;
- PDF;
- Dienststelle/Sicht step redesign beyond their existing owner contracts.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Instance-aware history direction approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions. Contract text approved; separate production-start authorization was still required at this entry; the four-part atomic migration gate (§6) applies. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started; the §6 atomic migration gate remains binding. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 history-replay amendment` | PO vastenburg | Review-driven replay-resolution amendment (§5): stale-inventory replay requires a successful `fresh` reconcile via `singleSelect/reconcileFilterInstances` with `reason: "historyReplay"` (reason added to the canonical closed enum in `singleSelect-filterInstanceIdentity-contractdelta.md` §6/§6.2, with fail-safe flags and suppressed owner inventory notification) before any resolution; unknown/missing reasons fail closed and never map to `filtersReady`. Failure codes `SINGLE_SELECT_HISTORY_ROLLBACK_FAILED` and `SINGLE_SELECT_HISTORY_OWNER_NOTIFY_FAILED` added; all replay failures are recorded visibly in singleSelect owner diagnostics/error state with the history pointer unchanged. Visible special generic-step replay awaits `specialSingleSelect` owner notification and compensates/rolls back on failure; regular replay has no foreign notify. Target `displaySource` allowlist preserved (`cognos|table|policy|unavailable`); null display rejected unless source is `unavailable`. Acceptance items 9–12 added. No decision from 2026-07-15 is revised. |

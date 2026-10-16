# Contract Delta: `singleSelect` Canonical Filter-Instance Identity

> Structural correction to `contracts/singleSelect.md`.
> This delta replaces label-only mutable state with collision-free host-instance state.
> Approved CP-1 contract text; production implementation is in progress under the
> approved build sequencing and atomic-tranche gates.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `singleSelect`
**Type:** `feature-module contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `PO design direction + adversarial architecture, implementation-feasibility and rules reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/singleSelect.md`
**Dependent deltas:** `cognosAPI-filters-instanceInventory-contractdelta.md`,
`filterDock-filterInstanceIdentity-contractdelta.md`,
`writeback-filterInstanceIdentity-contractdelta.md`,
`historyService-filterInstanceIdentity-contractdelta.md`,
`specialSingleSelect-filterInstanceIdentity-contractdelta.md`,
`sicht-filterInstanceIdentity-contractdelta.md`,
`tabs-filterScopeSelectors-contractdelta.md`

---

## 1. Purpose And Supersession

`singleSelect` must represent every supported Cognos filter instance independently.
Two page-context filters with the same label on different scopes, a global and
page-context filter with the same label, and two same-label items in one scope must
not share mutable owner state.

This delta supersedes:

- `singleSelect.md` §4 lines 140–144: `byScope[filterScope][filterLabel]` is no
  longer canonical mutable state;
- the use-value collapse where `displayValue === useValue`;
- DOM hydration as a confirmed selection source;
- parameter restore/resync behavior that writes or stores `d = u`;
- label-only page-context API lookup and replay.

Existing `filterKey`, `filterLabel`, tab index and display text remain semantic or
compatibility fields. None is a filter-instance identity by itself.

## 2. Ownership Boundary

- Canonical mutable subtree remains `_KDB.state.filters.singleSelect`.
- Canonical writer remains `singleSelect`.
- No new top-level `_KDB.*` key or umbrella filter registry is introduced.
- `dienststelle` remains the owner of its hierarchy selections.
- `sicht` remains the owner of confirmed Sicht domain state.
- `specialSingleSelect` remains the owner of rights, visibility and parked special
  selections.
- Foreign modules read cloned owner selectors or `getState()` and request mutations
  through `_KDB.api.singleSelect.dispatch(...)`.
- Cognos access is exclusively through `_KDB.cognosAPI.filters`.

`singleSelect` may hold generic interaction state for delegated Sicht or special
filters, but it must not become a second canonical source for foreign domain state.
Owner notification after successful commit remains mandatory.

## 3. Canonical Identity

### 3.1 Identity tuple

The canonical live identity tuple is:

```js
{
  scopeType: "global" | "pageContext",
  scopeId: "<raw Cognos getScope()>",
  itemId: "<raw Cognos getItemId()>"
}
```

`scopeId` is Cognos host/slot identity. It is allowed in serializable session owner
state, but remains excluded from persisted writeback v3.

`filterInstanceId` is a deterministic encoded key:

```txt
<g|p>|s=<encode(normalizeCognosScopeId(scopeId))>|i=<encode(itemId)>
```

Rules:

1. `g` is used only for `scopeType: "global"` and normalized scope `"global"`.
2. `p` is used for non-global Cognos scopes.
3. `normalizeCognosScopeId` from
   `core/utils/normalizeCognosScopeId.js` trims and removes only the known terminal
   `_tabpanel` host alias; it performs no label rewriting. Identity, tabs and
   writeback import this one utility rather than defining local normalizers.
4. Every component is encoded before joining. Raw `"__"` concatenation is forbidden.
5. The raw `scopeId`, `itemId` and `itemName` remain fields on the record for host
   lookup and diagnostics.
6. Reconcile validates that one ID maps to exactly one host item.

### 3.2 Controlled label fallback

When `itemId` is unavailable, the fallback key is:

```txt
<g|p>|s=<encode(normalizeCognosScopeId(scopeId))>|l=<encode(itemNameOrFilterLabel)>
```

Fallback is accepted only when full host enumeration proves exactly one matching
item in that scope. The record carries `identityQuality: "labelFallback"` and a
`SINGLE_SELECT_IDENTITY_LABEL_FALLBACK` diagnostic.

If two host items in one scope require the same fallback, reconcile fails those
items with `SINGLE_SELECT_IDENTITY_COLLISION`. It must not use array position,
DOM identity, a cosmetic label suffix or the last interaction to disambiguate.

`filterInstanceId` is immutable for the lifetime of one mounted owner instance.
When a later reconcile obtains `itemId` for a fallback record, the owner enriches
the record and emits the diagnostic `SINGLE_SELECT_IDENTITY_ENRICHED`, but retains
the existing fallback ID until destroy/remount. Replay still verifies the complete
tuple rather than trusting the ID string alone. This keeps foreign owner references
and parked selections stable without adding an identity-rekey event.

### 3.3 Semantic instance key

`semanticInstanceKey` is a stable config-owned key used only when persistence must
distinguish same-label items in one scope. It is not a Cognos ID and is not the
mutable state key.

- A unique `filterLabel`/`itemName` is the default semantic key.
- Additive config lives at
  `_KDB.properties.filterPropObj[source].filterInstances[definitionId]`:

  ```js
  {
    scopeType: "global" | "pageContext",
    filterLabel: "<UI/semantic label>",
    itemName: "<host item name>",
    itemId: "<optional host item id>",
    instanceKey: "<stable semantic sibling key>"
  }
  ```

- Existing `globalFilters` / `pageContextFilters` label maps remain valid for unique
  labels. `filterInstances` is required only when those maps cannot represent
  same-label siblings.
- `definitionId` and `instanceKey` are config semantics, not host identity.
- `instanceKey` must be unique within one
  `scopeType + filterLabel + target-tab` persistence group.
- singleSelect validates but never mutates the properties object.
- Missing required configured keys produce
  `SINGLE_SELECT_SEMANTIC_INSTANCE_KEY_MISSING`; duplicates produce
  `SINGLE_SELECT_SEMANTIC_INSTANCE_KEY_DUPLICATE`.
- Persistence may store this as optional `filt.sels[].inst`; see the writeback
  delta.

## 4. Canonical State

```js
_KDB.state.filters.singleSelect = {
  lifecycle: "idle",
  inventory: {
    generation: 0,
    freshness: "stale",
    reconcileInFlight: false,
    reconciledAt: null,
    errorCode: null
  },
  instancesById: {
    "<filterInstanceId>": {
      filterInstanceId: "<filterInstanceId>",
      scopeType: "pageContext",
      scopeId: "<raw Cognos scope>",
      filterLabel: "Berufsfamilie",
      itemName: "Berufsfamilie",
      itemId: "<Cognos item id or null>",
      semanticInstanceKey: "Berufsfamilie",
      identityQuality: "itemId",
      filterType: "singleSelect",
      selectionOwner: "singleSelect",
      status: "active",
      hostStatus: "present",
      currentSelection: {
        displayValue: "Display A",
        useValue: "[member].[A]",
        displaySource: "cognos"
      },
      backupSelection: {
        displayValue: "Display A",
        useValue: "[member].[A]",
        displaySource: "cognos"
      },
      pendingSelection: {
        displayValue: "Display B",
        useValue: null,
        resolutionStatus: "unresolved"
      },
      isCommitInProgress: false,
      hasAlleOption: true,
      condition: null,
      timestamps: {
        discoveredAt: 0,
        reconciledAt: 0,
        interactionAt: null,
        confirmedAt: null
      }
    }
  },
  lastInteraction: null,
  lastConfirmedAt: null,
  lastDiagnostics: [],
  errorCode: null,
  errorMessage: null
};
```

Normative rules:

- `instancesById` is the sole mutable selection registry for records with
  `selectionOwner: "singleSelect"` and the sole singleSelect-backed identity
  descriptor registry.
- `byScope` must not exist as a second mutable source.
- `selectionOwner` is `"singleSelect"` for regular/special instances and `"sicht"`
  for a delegated Sicht descriptor. Only `"singleSelect"` records contain durable
  `currentSelection`, `backupSelection` and `pendingSelection`; delegated-owner
  draft/confirmed selection lives in the named owner. The generic effect receives a
  cloned owner selection context and keeps only call-local working values.
- `itemName` is host semantic metadata; `filterLabel` is the configured/UI label.
  They may currently be equal but must not be collapsed by contract.
- `status: "active" | "removed"` preserves the existing domain status.
- `hostStatus: "present" | "missing"` describes inventory presence and is not
  module lifecycle.
- `inventory.freshness` uses only the canonical `fresh | stale` freshness dimension.
  `inventory.reconcileInFlight` is the published state boolean from
  `writeback-urlShare-inventoryQuiet-contractdelta.md` §4. The reconcile Promise
  stays runtime-only.
- `lastDiagnostics` is replaced on each reconcile, cloned on read and capped at 50
  entries; it is not an append-only log.
- Empty selection is the explicit policy pair
  `{ displayValue: "Alle", useValue: "", displaySource: "policy" }`.
- Non-empty singleSelect-owned confirmed selections preserve `.d` and `.u`
  independently, including
  the valid case where their strings are equal.
- A missing display is represented as `displayValue: null` with
  `displaySource: "unavailable"`; it is never replaced by `useValue`.
- State contains no Cognos API objects, DOM refs, tab IDs, page IDs or tab indexes.

## 5. Runtime

Runtime-only host references live under:

```js
_KDB.runtime.singleSelect.adapters.filterApisByInstanceId
```

The map is built off to the side and atomically replaced after a successful
inventory pass. It is cleared on destroy and invalidated on a superseding reconcile.

Existing runtime buckets and parameter-set/tab-mutation run IDs remain separate.
Reconcile coordination lives under
`_KDB.runtime.singleSelect.pendingPromises.reconcile`, including its monotonic run
ID and Promise. An `AbortController`, when supported by the awaited boundary, lives
under the standard `abortControllers` bucket. Stale completion cannot overwrite a
newer inventory.

## 6. Inventory And Reconcile

New public action:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/reconcileFilterInstances",
  payload: {
    reason: "mount" | "filtersReady" | "parameterRestore" | "tabMutation"
      | "historyReplay",
    runId: "<caller run id when applicable>"
  }
});
```

The action returns:

```js
Promise<{
  ok: boolean,
  degraded: boolean,
  generation: number,
  discovered: string[],
  updated: string[],
  removed: string[],
  diagnostics: Array<{ code, filterInstanceId?, scopeId?, itemId?, message }>
}>
```

Reconcile:

1. waits through an owner-bounded readiness path;
2. enumerates all Cognos filter items through `_KDB.cognosAPI.filters`;
3. classifies supported singleSelect-backed items without DOM discovery;
4. builds/validates IDs before owner-state mutation;
5. reads host `.d` and `.u` separately;
6. preserves pending interaction only for an unchanged live instance;
7. marks or removes stale instances according to the caller reason;
8. atomically commits state and runtime API maps;
9. records explicit diagnostics for malformed host objects;
10. never uses `filterDock.lastInteraction` as inventory.

The raw host pass sees every filter item. `instancesById` stores only regular
singleSelect, specialSingleSelect and delegated Sicht descriptors. Dienststelle
items are classified and left to the Dienststelle owner; unknown items produce a
diagnostic and are not silently adopted.

Required triggers:

- owner mount initiates a bounded inventory attempt;
- `filterDock` filters-ready dispatches a reconcile hint;
- successful parameter restore performs host reread/reconcile before returning;
  amendment 2026-08-10: within one parameterSet run this reconcile happens
  exactly once, inside the terminal `parameterSetResyncRequested` phase — the
  clear/global/page phases reuse the run's pinned generation without reconcile
  (per-instance host rereads remain unaffected);
- tab apply/rollback reconciles after Cognos writes;

Timeout uses `SINGLE_SELECT_RECONCILE_TIMEOUT`. Enumeration failure uses
`SINGLE_SELECT_RECONCILE_FAILED`. Partial malformed items make the result degraded;
identity collision makes the affected restore/commit unsafe and therefore failed.

Reason validation (amendment 2026-08-10): `reason` is a closed enum. An invalid
or unknown `reason` fails closed with `SINGLE_SELECT_RECONCILE_REASON_INVALID`:
no readiness wait, no host enumeration, no inventory/state commit, no generation
change, no owner notification (§6.2), and never a grant of
`allowStartupDefault` or `allowSpecialPolicy`.

Replay reason (amendment 2026-08-10): `historyReplay` is added to the closed
reason enum for owner-initiated replay reconciles (see
`historyService-filterInstanceIdentity-contractdelta.md` §5). It carries
fail-safe policy: it never triggers a Sicht startup default and never triggers
automatic special policy inventory sync, and no cross-owner inventory
notification is emitted for it (§6.2). An unknown or missing `reason` is never
coerced or defaulted to `filtersReady` (or any other allowed reason); it fails
closed as defined above.

### 6.1 Owner-delegated mutation actions

The canonical owner defines both actions consumed by dependent contracts.

```js
{
  type: "singleSelect/applyOwnerSelection",
  payload: {
    filterInstanceId,
    operationId,
    selection: { displayValue, useValue },
    source: "sichtStartup" | "parameterRestore" | "historyReplay",
    notifyOwner: "sicht",
    skipHistory: true
  }
}
```

This action targets a descriptor with `selectionOwner: "sicht"`, writes/rereads the
host instance and dispatches the confirmed pair to `_KDB.api.sicht`. It does not
store the delegated pair in singleSelect state and never pushes generic
`filter_singleSelect` history. `skipHistory` is forwarded to Sicht so startup,
restore and replay can suppress the semantic `filter_sicht` frame. `operationId` is
required, echoed in the callback and deduplicated by both owners.

```js
{
  type: "singleSelect/applySpecialSelectionPolicy",
  payload: {
    semanticSpecialFilterId,
    filterInstanceIds: [],
    operation: "applyDefault" | "clearHidden" | "restoreParked",
    selection: { displayValue, useValue },
    source: "specialSingleSelect",
    skipHistory: true
  }
}
```

This action targets only `selectionOwner: "singleSelect"` special instances,
applies each ID at most once, updates canonical active selection after host reread
and returns per-instance results. Automatic policy actions always suppress generic
history; ordinary user commits on visible special filters retain generic history.

Both actions return:

```js
Promise<{
  ok: boolean,
  degraded: boolean,
  applied: Array<{ filterInstanceId, ok, degraded, errorCode? }>,
  diagnostics: Array<{ code, filterInstanceId?, message }>
}>
```

Only this canonical delta defines production files/actions under `singleSelect/`.
Dependent owner deltas reference these actions and do not independently redefine
their behavior.

### 6.2 Cross-Owner Inventory Notification (CP-1 clarification, 2026-08-10)

After a reconcile commits with `inventory.freshness: "fresh"` and its generation
is still current (not superseded by a newer reconcile), singleSelect notifies the
dependent owners through their public dispatch actions
`sicht/singleSelectInventoryReconciled` and
`specialSingleSelect/singleSelectInventoryReconciled`. The receiver-side action
contracts live in the respective owner deltas; the canonical payload emitted here
is:

```js
{
  inventoryGeneration: 0,
  source: "singleSelect",
  reason: "mount" | "filtersReady" | "parameterRestore" | "tabMutation"
    | "historyReplay",
  timestamp: 0,
  allowStartupDefault: false,
  allowSpecialPolicy: false
}
```

Normative rules:

1. **Fresh-commit gate.** Notification is emitted only after the reconcile result
   has been atomically committed as `fresh` and non-stale. A failed, degraded-to-
   stale or superseded reconcile emits no owner notification.
2. **Restore suppression.** `reason: "parameterRestore"` is never emitted as an
   owner notification; the writeback restore orchestration supplies the inventory
   generation and owner phases separately. Reason/source flags exist so receivers
   cannot run Sicht startup defaults during clear/restore flows and so special
   policy sync stays constrained to allowed reasons.
   Amendment 2026-08-10: `reason: "historyReplay"` is likewise never emitted as
   an owner inventory notification; replay-specific owner notification is
   governed solely by the replay contract in
   `historyService-filterInstanceIdentity-contractdelta.md` §5.
3. **Flag policy.** `reason: "mount"` and `reason: "filtersReady"` may set
   `allowStartupDefault: true`. `reason: "tabMutation"` may set
   `allowSpecialPolicy: true` but must never set `allowStartupDefault: true`.
   Amendment 2026-08-10: `reason: "historyReplay"` always carries
   `allowStartupDefault: false` and `allowSpecialPolicy: false`.
   Flags derive only from a `reason` validated against the closed enum; an
   invalid, unknown or missing reason fails the reconcile closed (§6,
   amendment 2026-08-10), is never mapped to `filtersReady` and
   never grants either flag.
4. **Canonical key.** `inventoryGeneration` is the only canonical notification
   key. Transitional receiver-side aliases (for example a legacy `generation`
   field) may be accepted temporarily by receivers but are never emitted by this
   owner.
5. **Awaited structured ack.** Each dispatch is awaited and resolves to the
   structured acknowledgement defined by the receiver deltas. Owner-disposed,
   negative (rejected/invalid) and degraded acknowledgements are explicit,
   distinct result states; none of them may be collapsed into success.
6. **Per-owner tracking.** Acknowledgement is tracked runtime-only under the
   existing `_KDB.runtime.singleSelect` buckets, keyed by owner +
   `inventoryGeneration`. Only an owner whose ack reported success is marked
   notified. A missing, disposed or rejecting owner is not marked and remains
   retryable for the same generation.
7. **Bounded awaits.** Notification awaits are bounded with timeout and, where
   the boundary supports it, an `AbortController` in the standard
   `abortControllers` bucket. Before recording timeout/failure diagnostics,
   singleSelect rechecks that the reconcile generation is still current; a
   superseded generation ends the attempt without owner-failure diagnostics.
8. **Destroy.** Runtime destroy clears all per-owner notification tracking.
9. **Resync return unchanged.** `singleSelect/parameterSetResyncRequested`
   retains its return shape `Promise<{ ok, applied, skipped, degraded,
   diagnostics }>`; this clarification changes no resync return field. The
   separate run-lifecycle amendment of 2026-08-10 (recorded in
   `singleSelect-parameterSetRestore-contractdelta.md` §3/§4.1 and
   `writeback-filterInstanceIdentity-contractdelta.md` §4/§6) additively
   extends that return with `inventoryGeneration` — the new generation produced
   by the terminal resync's single reconcile; no existing field changes.

## 7. Interaction, Hydration And Commit

### 7.1 Interaction resolution

A filterDock handoff is an interaction hint, not canonical identity. `singleSelect`
resolves it against the current inventory using:

1. actual host scope from the verified
   `tabs/resolveFilterScopeTargets` result matched to the handoff tab hint;
2. explicit config/host `itemId` when available;
3. `semanticInstanceKeyHint` only when config maps it to one exact itemId/itemName;
4. unique `itemName`/label within that host scope.

Zero matches return `SINGLE_SELECT_INSTANCE_NOT_FOUND`. Multiple matches return
`SINGLE_SELECT_INSTANCE_AMBIGUOUS`. Neither path commits a value.

If the live tabs scope candidate does not match an enumerated Cognos filter scope,
resolution returns `SINGLE_SELECT_SCOPE_TARGET_UNVERIFIED`. Alias-only matching is
diagnostic fallback evidence and cannot authorize a page-context commit.

CP-1 clarification (2026-08-10): a page-context scope provided by the caller is
never trusted on the basis of a textual `scopeResolution` marker or any other
caller-asserted string. Canonical resolution always verifies the target `tabId`
through `tabs/resolveFilterScopeTargets` before a page-context commit. Global
scope remains explicit (`scopeType: "global"`) and is never inferred.

### 7.2 Hydration

- Confirmed owner state hydrates from Cognos values or an explicit owner-provided
  `{displayValue, useValue}` pair.
- Popup DOM may identify the user's pending display choice and sync presentation.
- Popup DOM may not create, replace or infer confirmed `useValue`.
- A pending selection may remain unresolved until table/config lookup at commit.
- Existing `wasHydratedFromDom` becomes presentation/runtime evidence only and must
  not authorize confirmed-state mutation.

### 7.3 Commit

Commit targets one resolved `filterInstanceId` and one runtime filter API object.

1. Resolve pending display to a real `{d,u}` via config/table data.
2. Write through `_KDB.cognosAPI.filters`.
3. Read the same host instance back.
4. Verify both target instance and value.
5. Commit independent display/use values to owner state.
6. Notify the delegated domain owner. Push generic `filter_singleSelect` history
   only for regular/special user commits when `skipHistory !== true`; never push it
   for `filterType: "sicht"` or automatic special policy actions.
7. On failure, restore the prior pair on the same instance.

`verifyCommitFilterValue` must not accept a use-value match as proof that the
display label matched. Verification reports which field was observed.
Post-write target/value mismatch returns
`SINGLE_SELECT_COMMIT_VERIFICATION_MISMATCH`, restores the prior pair when possible,
and never pushes history.

## 8. Display And Use Contract

- Cognos value `.d` maps only to `displayValue`.
- Cognos value `.u` maps only to `useValue`.
- `displayValue === useValue` is valid and must preserve both strings.
- `displayValue` must not be parsed from a MUN/use value.
- Binding and writeback consume `useValue`.
- UI, diagnostics and future PDF consume `displayValue`.
- Formatting such as final-bracket extraction is not owner-state behavior.

Parameter restore receives persisted use values:

1. resolve a real display from owner config/table data where possible;
2. write a true pair;
3. when unavailable, route through the one owner restore helper that may use a
   coded transport-only `d = u`;
4. perform bounded host reread (one-shot `readValues`; no extra loop);
5. commit `.d/.u` separately. On parameter-set restore/resync, when
   `resolveRestoreSelectionPair` returns a unique pair, resolved `d` may win over
   observed `d` if they differ. Transport `d=u` must not become confirmed
   `displayValue` when the lookup was degraded. Unique `*_filter` use beats dump
   singleton. Owner `"table"` may persist when Cognos echoes a member token as
   `.d` that is not equal to `.u`.

If the host requires a transport `d` and no real display is available, a temporary
transport-only `d = u` is permitted only with
`SINGLE_SELECT_RESTORE_DISPLAY_DEGRADED`. It must not become confirmed
`displayValue`; failed reread leaves display unavailable and returns degraded.

## 9. Public Read Contract

The dispatch-style API remains:

```js
_KDB.api.singleSelect = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

No `getFilterInstances`, `getFilterInstance` or named reconcile method is added to
the API surface.

This delta supersedes the `dispatch(action)` return row in `singleSelect.md` §6 for
these async action types only:

```txt
singleSelect/reconcileFilterInstances
singleSelect/applyOwnerSelection
singleSelect/applySpecialSelectionPolicy
singleSelect/parameterSetClearRequested
singleSelect/parameterSetRestoreRequested
singleSelect/parameterSetResyncRequested
singleSelect/parameterSetRunFinished
singleSelect/prepareTabMutation
singleSelect/applyTabMutation
singleSelect/restoreTabMutationSnapshot
```

For those actions, `dispatch` returns the documented `Promise<result>`; other action
return semantics are unchanged. `singleSelect/parameterSetRunFinished` (added by
the 2026-08-10 run-lifecycle amendment) is contract-defined in
`singleSelect-parameterSetRestore-contractdelta.md` §3: runtime-only idempotent
parameterSet run-registry cleanup with no host write, state mutation or history.

Published cloned selectors:

```js
readFilterInstances(_KDB, options)
readFilterInstance(_KDB, filterInstanceId)
readFilterInstancesByScope(_KDB, scopeType, scopeId)
readSingleSelectState(_KDB)
```

`readFilterInstances` returns each matching instance exactly once in deterministic
`filterInstanceId` order. Projection:

```js
{
  filterInstanceId,
  scopeType,
  scopeId,
  filterLabel,
  itemName,
  itemId,
  semanticInstanceKey,
  filterType,
  selectionOwner,
  identityQuality,
  displayValue,
  useValue,
  displaySource,
  status,
  hostStatus
}
```

Selectors always clone records and never expose mutable state or Cognos objects.
For `selectionOwner !== "singleSelect"`, display/use fields are `null`; consumers
read the named owner's confirmed-selection selector.
Tab-oriented consumers resolve `scopeId` through published tabs selectors.

## 10. Compatibility Projection

During migration, `getState()` also exposes a derived `byScope` compatibility view.
It is rebuilt from `instancesById` on every read and is never stored or mutated.

- Global labels are included only when one instance resolves for that label.
- Page-context labels are included only when exactly one instance resolves across
  the requested legacy bucket.
- A collision is omitted rather than last-wins and appears in
  `compatibilityDiagnostics`.
- New consumers must use instance selectors.

The compatibility view remains while current writeback collectors and the PDF
consumer read `getState().byScope`. The writeback implementation in this batch
migrates its collectors first. Final removal is owned by the future
`dashboardPdf-filterInstanceIdentity-contractdelta.md` and additionally requires a
repository search proving zero consumers. The PO approved this two-step plan on
2026-07-15: canonical `instancesById` is the source of truth now, the derived
read-only `getState().byScope` projection is a temporary migration-only exception to
the public-API rule, the PDF consumer migrates to instance selectors in the future
PDF delta, and the projection is then removed. No new production consumer may read
`getState().byScope`.

## 11. History And Persistence Migration

- New history values carry `filterInstanceId`, `scopeType`, raw `scopeId`, `itemId`,
  `semanticInstanceKey`, `filterLabel`, `displayValue`, `useValue` and
  `displaySource`.
- Replay resolves the complete tuple against the live inventory.
- Legacy global or page-context history may replay only when exactly one live
  instance matches its old fields.
- Ambiguous legacy page-context history returns
  `SINGLE_SELECT_HISTORY_INSTANCE_AMBIGUOUS`; it never picks the first item.
- Persisted writeback continues to exclude `scopeId`, `itemId` and
  `filterInstanceId`.
- Runtime restore resolves `tab + key + optional inst` to one live instance.
- Instance-aware history builder, normalized payload preservation, replay handler
  and legacy resolver ship in one atomic tranche. Identity-aware history commits
  must not be enabled while any one path remains label/scope-only.

## 12. Tab Lifecycle

Filter identities are host-slot physical; selected content is content-logical.

- Move permutes selection pairs between existing target instances.
- Duplicate clones selection pairs to the target scope's matching semantic
  instances.
- Delete clears the deleted content's target instances.
- Prepare snapshots are keyed by `filterInstanceId` and include full d/u pairs.
- Apply/rollback use scope + item identity and then reconcile.
- `tabId`, `pageId` and `tabIdx` are derived through tabs-owned selectors and are
  not stored on an instance.
- Stale scope instances are removed only after live host enumeration proves absence.

This section mechanically supersedes §1 line 23 and §2.1–2.3 of
`singleSelect-tabMutation-contractdelta.md`; its snapshot/apply/rollback keys are
rewritten from label buckets to `filterInstanceId`. That foreign tab-CRUD document
now carries the reciprocal dependency/status/mechanics amendment (its §5), and the
PO plus both planners approved the resulting `filterInstanceId` mechanics on
2026-07-15. Contract mechanics are therefore reconciled; build sequencing of that
track remains governed by its own build gate D-CRUD-8 (writeback track first), which
is a scheduling constraint, not an open contract blocker.

## 13. Dependencies And Cognos Touchpoints

Allowed dependencies:

- `_KDB.cognosAPI.filters` inventory/read/write helpers;
- `_KDB.services.tableData` for explicit display/use resolution;
- `_KDB.services.history` for committed steps;
- published tabs selectors and `tabs/resolveFilterScopeTargets` dispatch for
  verified scope-to-tab projection;
- public APIs of `sicht` and `specialSingleSelect` for owner notification.

No direct foreign `_KDB.state` or `_KDB.runtime` access is allowed.

## 14. Planned File Responsibilities

Implementation may add or split files under existing folders only:

```txt
singleSelect/
  actions/
    applyOwnerSelection.js
    applySpecialSelectionPolicy.js
    reconcileFilterInstances.js
  config/
    actions.js
    errorCodes.js
  effects/
    enumerateFilterInstances.js
    reconcileFilterInstanceState.js
    resolveInteractionInstance.js
    readConfirmedHostSelection.js
  state/
    buildFilterInstanceId.js
    createFilterInstanceState.js
    selectors.js
  runtime/
    replaceFilterApiRegistry.js
```

Shared scope normalization is imported from
`core/utils/normalizeCognosScopeId.js`; singleSelect does not create a second
normalizer.

Names are indicative but must remain English verb+noun. All touched/new executable
files must satisfy the 150-line and six-import limits; already-oversized or
over-imported hotspots are split before substantive identity behavior is added.
Production `createSingleSelectController.js` is already above the 150-line hard
limit; this tranche must extract action routing/coordination before adding new
branches and must not grow that file further.

**As-built 2026-08-16:** `effects/writeVerifiedSelection.js` added (shared Cognos
write/verify/rollback primitive). `effects/writeAndVerifyInstanceSelection.js`
remains the tabMutation/history wrapper; `actions/applyOwnerSelection.js` remains
the sicht-delegation entry (both call the primitive).

## 15. Acceptance

1. Two tabs with `Berufsfamilie` retain different values.
2. Interaction on tab B does not change tab A owner state.
3. Global and pageContext instances with the same label coexist.
4. Initial reconcile contains every supported host instance without a click.
5. Public instance selectors return every instance exactly once.
6. Cognos `.d` and `.u` remain separate, even when equal.
7. Parameter restore resolves display correctly or returns a coded degraded result
   after mandatory host reread.
8. Writeback exports every scope separately.
9. Restore resolves by tab/scope plus item/semantic instance, never label alone.
10. Copy/move/delete and rollback leave no stale owner instances.
11. Hidden special filters remain hidden while their live instances remain
    inventory-addressable.
12. Existing global filters remain compatible.
13. No foreign state reads/writes are introduced.
14. No DOM or WBParameter filter registry is introduced.
15. No PDF production file is changed in this migration.
16. Owner inventory notification is emitted only after a committed `fresh`,
    non-stale reconcile and never for `reason: "parameterRestore"` (§6.2).
17. Notification acknowledgement is tracked per owner + `inventoryGeneration`;
    only a successfully acknowledging owner is marked, a missing/rejected owner
    remains retryable for the same generation, and destroy clears the tracking
    (§6.2).
18. Notification awaits are bounded with timeout/abort and recheck reconcile
    currentness before failure diagnostics; disposed/negative/degraded acks are
    never collapsed into success (§6.2).
19. Page-context commits are authorized only by verified
    `tabs/resolveFilterScopeTargets` resolution, never by a textual
    `scopeResolution` value; global remains explicit (§7.1).
20. An invalid reconcile `reason` fails closed with
    `SINGLE_SELECT_RECONCILE_REASON_INVALID`: no inventory/state commit, no
    generation change, no owner notification and no
    `allowStartupDefault`/`allowSpecialPolicy` grant (§6, §6.2).
21. `singleSelect/parameterSetRunFinished` performs runtime-only idempotent
    parameterSet run-registry cleanup with no host write, state mutation or
    history, and repeated/unknown runIds resolve as idempotent no-ops (§9;
    action contract in `singleSelect-parameterSetRestore-contractdelta.md` §3).
22. A `reason: "historyReplay"` reconcile emits no cross-owner inventory
    notification, never triggers a Sicht startup default or automatic special
    policy sync, and always carries `allowStartupDefault: false` and
    `allowSpecialPolicy: false`; an unknown or missing reason fails closed and
    is never mapped to `filtersReady` (§6, §6.2).

## 16. CP-1 Approval Decisions (closed 2026-07-15)

The PO explicitly closed every CP-1 blocker on 2026-07-15. Contract text is approved,
and the PO subsequently authorized production implementation on 2026-07-15.
Implementation is in progress under the build sequencing and atomic-tranche rules
stated in this delta and its dependents.

1. **Approved** — the additive
   `filterPropObj[source].filterInstances[definitionId].instanceKey` schema (§3.3).
2. **Approved** — the CP-1 restore policy: true d/u first, otherwise coded
   transport-only `d = u` plus mandatory reread, with no assumed `{u}` capability
   (§8; `cognosAPI-filters-instanceInventory-contractdelta.md` §4).
3. **Approved** — the formal amendments to the already-Approved singleSelect/Sicht
   parameter-restore deltas. The amending text lives in
   `writeback-filterInstanceIdentity-contractdelta.md` §1/§5/§6 (singleSelect
   restore payload/return shape) and `sicht-filterInstanceIdentity-contractdelta.md`
   §7 (Sicht restore payload); both target deltas now carry back-reference amendment
   notes.
4. **Approved** — the tab-CRUD planner's reciprocal amendment and joint sign-off
   described in §12, now recorded in `singleSelect-tabMutation-contractdelta.md` §5.
5. **Approved** — the two-step PDF compatibility plan (§10): canonical
   `instancesById` now, a temporary read-only derived `getState().byScope`
   projection, PDF migration in the future PDF delta, then projection removal.

The stale generic `_KDB.state.filters → filters module` row in
`architecture/stateOwnership.md` should receive per-owner sub-rows in a separately
approved authority-doc change. That documentation correction is tracked but is not
an implementation blocker because this set already names each canonical writer, and
it was explicitly excluded from the five approved decisions.

## 17. Out Of Scope

- PDF consumer implementation or display formatting;
- Dienststelle hierarchy-state redesign;
- changing tab slot/content architecture;
- persisting Cognos internal IDs;
- DOM identity as state source;
- authority-rule, template or ownership-map changes;
- commits, branches, resets or pushes.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Architecture direction approved; contract text and dependent deltas authorized for drafting. Production code remains blocked pending cross-review. |
| 2026-07-15 | `Cross-review pending → complete; blockers open` | GPT-5.6 Sol planner | Three independent reviews reconciled; production remains blocked on §16 PO/cross-track decisions. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | All five §16 decisions approved: (1) additive `filterInstances[definitionId].instanceKey` schema, (2) true d/u then coded transport-only `d = u` + mandatory reread, no assumed `{u}`, (3) formal amendments to Approved singleSelect/Sicht parameter-restore deltas, (4) reciprocal tab-CRUD `filterInstanceId` mechanics amendment + joint sign-off, (5) two-step PDF compatibility (canonical `instancesById` now, temporary read-only derived `getState().byScope`, PDF migrates later, projection then removed). Separate production-start authorization was still required at this approval entry; build gates and atomic-tranche rules apply. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started under the approved decisions, build sequencing and atomic-tranche gates. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 clarification amendment` | PO vastenburg | Review-driven clarification of cross-owner inventory notification wiring: (1) §6.2 — formal emission of `sicht/singleSelectInventoryReconciled` and `specialSingleSelect/singleSelectInventoryReconciled` with canonical payload `{inventoryGeneration, source, reason, timestamp, allowStartupDefault, allowSpecialPolicy}`, fresh-commit gate, `parameterRestore` suppression, flag policy (mount/filtersReady may allow startup; tabMutation may allow special policy but never startup default), `inventoryGeneration` as sole canonical key, awaited structured acks with explicit disposed/negative/degraded semantics, per-owner+generation retryable tracking cleared on destroy, bounded awaits with currentness recheck, and unchanged resync return `{ok, applied, skipped, degraded, diagnostics}`. (2) §7.1 — textual `scopeResolution` never authorizes page-context scope; `tabs/resolveFilterScopeTargets` verification is mandatory. Acceptance items 16–19 added. No decision from 2026-07-15 is revised. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 run-lifecycle amendment` | PO vastenburg | Review-driven parameterSet run-lifecycle amendment: reconcile `reason` is a closed enum failing closed with `SINGLE_SELECT_RECONCILE_REASON_INVALID` — no inventory commit, no generation change, no owner notification, no startup/policy flag grant (§6/§6.2 rule 3); `singleSelect/parameterSetRunFinished` added to the async dispatch list (§9) with its full contract in `singleSelect-parameterSetRestore-contractdelta.md` §3; resync return additively extended with `inventoryGeneration` per the same amendment (§6.2 rule 9 note). Acceptance items 20–21 added. No decision from 2026-07-15 or from the earlier 2026-08-10 clarification is revised. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 history-replay amendment` | PO vastenburg | Review-driven history-replay amendment: `historyReplay` added to the closed reconcile reason enum (§6) with fail-safe policy — no Sicht startup default, no automatic special policy inventory sync, `allowStartupDefault: false` / `allowSpecialPolicy: false` always, and cross-owner inventory notification suppressed for this reason (§6.2 rules 2–3); an unknown or missing reason continues to fail closed and is never coerced to `filtersReady`. Replay owner-notification/compensation semantics live in `historyService-filterInstanceIdentity-contractdelta.md` §5. Acceptance item 22 added. No decision from 2026-07-15 or from the earlier 2026-08-10 amendments is revised. |
| 2026-09-09 | `Implementation in progress (status unchanged) — restore table-display overlay` | PO vastenburg (Cognos green) | §8 steps 4–5: unique `resolveRestoreSelectionPair` resolved `d` may win over observed `d`; transport `d=u` must not become confirmed display when degraded; Filter unique `*_filter` use beats dump singleton; `"table"` may persist on member-token echo. Law: `singleSelect-restore-table-display-contractdelta.md`. No 2026-07-15 decision is revised. |

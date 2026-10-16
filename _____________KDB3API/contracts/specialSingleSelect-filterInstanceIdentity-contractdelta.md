# Contract Delta: `specialSingleSelect` Instance-Aware Delegation

> Keeps rights/visibility policy in `specialSingleSelect` while making
> `singleSelect` the sole active selection-pair owner for special filter instances.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `specialSingleSelect`
**Type:** `feature-module contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/specialSingleSelect.md`
**Depends on:** `singleSelect-filterInstanceIdentity-contractdelta.md`

---

## 1. Purpose

`specialSingleSelect` continues to decide rights, Sicht compatibility, visibility,
automatic defaulting and parked-user behavior for Personengruppe and
Dienststellenleitung. It does not become a page-context selection registry.

Every live special filter instance is addressed through the canonical singleSelect
inventory. Active Cognos/confirmed d/u pairs have one mutable owner:
`singleSelect`.

This delta supersedes the active/parked value shape in
`specialSingleSelect.md` §4 lines 82–154 and the direct automatic Cognos writer
responsibility in §10 lines 343–358.

## 2. Ownership Split

`specialSingleSelect` owns:

- rights and visibility policy per semantic special definition;
- active Sicht input used by that policy;
- distinct parked (inactive) user selections per concrete instance;
- policy/audit metadata and errors;
- wrapper classes/display visibility.

`singleSelect` owns:

- current, backup and pending active selection per concrete instance;
- Cognos commit/clear/reread for those instances;
- active d/u projection;
- generic popup interaction and history.

Consequences:

- `lastAppliedUseValue` and `lastAppliedDisplayValue` are no longer canonical active
  selection fields.
- Existing compatibility fields remain an explicitly deprecated owner-local cache
  updated from successful callbacks while consumers migrate; no owner logic may
  read them as current selection.
- `parkedUserSelection` remains legitimate special-owner state because it is
  intentionally inactive and not the current Cognos selection.

## 3. State Delta

Definition-level state remains keyed by stable semantic IDs:

```js
_KDB.state.filters.specialSingleSelect.byFilterId = {
  personengruppe: {
    filterLabel: "Personengruppe",
    rightTableKey: "personengruppe",
    optionTableKey: "personengruppe_filter",
    rightAllowed: false,
    alleAllowed: false,
    isVisibleForSicht: false,
    isVisible: false,
    selectionSource: "none", // deprecated aggregate compatibility metadata only, see §3.1
    selectionSourceByInstanceId: {
      "<filterInstanceId>": "user" | "specialDefault" | "clearedBySpecialSingleSelect" | "none"
    },
    wasSetBySpecialSingleSelect: false,
    lastAppliedUseValue: null,
    lastAppliedDisplayValue: null,
    parkedSelectionsByInstanceId: {
      "<filterInstanceId>": {
        displayValue: "<display>",
        useValue: "<use>",
        parkedAt: 0
      }
    },
    lastPolicyAppliedAt: null,
    errorCode: null,
    errorMessage: null
  }
};
```

Rules:

- `byFilterId` keys remain semantic policy IDs, not runtime filter IDs.
- Live instance IDs are obtained from published singleSelect selectors and are not
  persisted as a duplicate inventory list.
- Parked selections preserve d/u separately.
- `lastAppliedUseValue` / `lastAppliedDisplayValue` remain owner-local,
  write-only compatibility cache fields until the separate PDF migration. They are
  updated only from a successful singleSelect callback, are never read for policy,
  restore or Cognos writes, and are not a canonical current selection source.
- A parked entry is removed after successful restoration or when reconcile proves
  the host instance no longer exists.
- Definition-level `isVisible` applies to all matching live instances unless a
  future contract introduces per-instance rights.

### 3.1 Per-Instance Selection Provenance (CP-1 clarification, 2026-08-10)

Selection provenance is per concrete instance, never per definition.

`selectionSourceByInstanceId` is serializable owner-local policy/audit state
(plain JSON, keyed by `filterInstanceId`, exposed only as clones through the
existing §7 selectors):

```js
selectionSourceByInstanceId["<filterInstanceId>"] =
  "user" | "specialDefault" | "clearedBySpecialSingleSelect" | "none";
```

Decision rule:

- Every parking, restore and automatic default decision for a concrete instance
  reads only that instance's entry (plus its own parked entry). One sibling's
  provenance must never affect another sibling's parking, restore or default
  behavior.
- The definition-level `selectionSource` field becomes deprecated aggregate
  compatibility metadata only. It may be updated for legacy consumers while they
  migrate, but it is never a decision source for policy, parking, restore,
  default or clear logic.

Update/removal rules:

- successful user-driven commit reported by singleSelect for an instance:
  entry becomes `"user"`;
- successful `applyDefault` on an instance: entry becomes `"specialDefault"`;
- successful `restoreParked` on an instance: entry becomes `"user"` (a parked
  user selection restores user provenance);
- successful special-owner clear (`clearHidden`) on an instance: entry becomes
  `"clearedBySpecialSingleSelect"`;
- reconcile proves the host instance no longer exists: the entry is removed
  (same lifecycle as its parked entry);
- an absent entry reads as `"none"`.

Entries are updated only after the corresponding singleSelect operation reports
success, consistent with §6.

## 4. Handoff Mapping

`mapFilterDockHandoff` preserves:

```js
{
  semanticSpecialFilterId,
  runtimeFilterId,
  filterLabel,
  itemNameHint,
  itemIdHint,
  semanticInstanceKeyHint,
  scopeType,
  tabId,
  scopeId,
  filterConfig,
  capabilities,
  interactionType
}
```

The current deletion of `filterConfig.itemId` before delegation is forbidden.

Delegation uses:

```js
{
  filterType: "specialSingleSelect",
  authorizedByOwner: "specialSingleSelect",
  semanticSpecialFilterId: "<definition id>",
  ...identityHints
}
```

`singleSelect` accepts this payload only after the special owner has completed
rights/visibility gating. It resolves the concrete instance against its inventory.

### 4.1 Semantic Definition Matching And Sibling Instances (CP-1 clarification, 2026-08-10)

- A semantic special definition matches live instances by its configured
  `filterLabel` / `itemName`, taken from the definition configuration.
- `semanticInstanceKey` identifies a concrete instance among same-label
  siblings. It must never be treated as the definition ID: it never keys
  `byFilterId` and is never used as `semanticSpecialFilterId`.
- Uniqueness validation applies per concrete instance: each live instance must
  resolve to exactly one canonical inventory record, otherwise
  `SPECIAL_SINGLE_SELECT_INSTANCE_AMBIGUOUS` (§6) is raised.
- After uniqueness validation, all matching concrete sibling instances are
  included in the resolved `filterInstanceIds` set. Multiple validated siblings
  for one definition are a normal state, not ambiguity.

## 5. Visibility And Hidden Instances

Hidden special filters remain present in singleSelect inventory when Cognos still
enumerates them.

- `specialSingleSelect.isVisible` controls wrapper presentation and policy.
- Inventory `hostStatus` describes host presence, not visibility.
- A hidden instance must have no active disallowed Cognos selection.
- Hiding never deletes the canonical inventory record solely because the wrapper is
  hidden.
- Showing restores a parked pair only when rights and Sicht allow it and the same
  canonical instance still resolves.

Future consumers that need visibility combine:

1. singleSelect instance selector;
2. specialSingleSelect visibility selector keyed by semantic definition.

No owner copies the other's mutable state.

## 6. Automatic Set/Clear Boundary

specialSingleSelect no longer writes a special filter directly through Cognos and
then mirrors duplicate active values. It dispatches:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/applySpecialSelectionPolicy",
  payload: {
    semanticSpecialFilterId,
    filterInstanceIds: ["<resolved ids>"],
    operation: "applyDefault" | "clearHidden" | "restoreParked",
    selection: {
      displayValue: "<display>",
      useValue: "<use>"
    },
    source: "specialSingleSelect",
    skipHistory: true
  }
});
```

`selection` is omitted for clear. The action returns structured per-instance
results. Special owner updates policy/parked state only after success.

Failure codes:

- no matching live instances:
  `SPECIAL_SINGLE_SELECT_INSTANCE_MISSING`;
- inventory has not completed:
  `SPECIAL_SINGLE_SELECT_INVENTORY_NOT_READY`;
- ambiguous semantic-to-instance mapping:
  `SPECIAL_SINGLE_SELECT_INSTANCE_AMBIGUOUS`;
- singleSelect owner reject/failure:
  `SPECIAL_SINGLE_SELECT_POLICY_APPLY_FAILED`;
- parked selection display/use invalid:
  `SPECIAL_SINGLE_SELECT_PARKED_SELECTION_INVALID`.

No silent catch is allowed.

Migration is ordered and gated:

1. preserve `itemId` and route every automatic host write through singleSelect;
2. prove no direct special-owner Cognos writer remains;
3. change `lastApplied*` to callback-only compatibility cache;
4. remove that cache only in the separate PDF migration.

The old direct writer and new owner action must never be enabled concurrently.

## 7. Public Selectors

The existing dispatch-style API remains unchanged.

Published special-owner selectors include:

```js
readSpecialFilterPolicy(_KDB, semanticSpecialFilterId)
readSpecialFilterVisibility(_KDB, semanticSpecialFilterId)
readParkedSpecialSelections(_KDB, semanticSpecialFilterId)
```

All return clones. `getState()` remains a clone of the special owner subtree only;
it does not join or embed foreign singleSelect state. The deprecated owner-local
compatibility cache from §3 remains visible until the future
`dashboardPdf-filterInstanceIdentity-contractdelta.md` migrates its consumer and a
repository search proves zero readers.

## 8. Reconcile Triggers

Existing Sicht/tableData sync remains definition-policy reconcile.

After:

- Sicht change;
- rights/tableData change;
- singleSelect inventory reconcile;
- parameter restore;
- tab mutation;

specialSingleSelect reevaluates matching live instances and dispatches needed owner
policy actions. Repeated sync is idempotent and aborts superseded work through its
existing runtime controller.

During parameter restore it reuses the writeback-owned singleSelect inventory
`generation`; it does not dispatch a competing restore-time reconcile. A stale
generation returns `SPECIAL_SINGLE_SELECT_INVENTORY_STALE`.

Cross-owner notification uses public dispatch or a previously approved fact route;
no foreign state/runtime read.

### 8.1 Inventory Reconcile Notification (CP-1 clarification, 2026-08-10)

specialSingleSelect formally defines the public dispatch action through which the
canonical singleSelect owner reports a committed `fresh`, non-stale inventory
reconcile (sender-side gating and tracking live in
`singleSelect-filterInstanceIdentity-contractdelta.md` §6.2):

```js
_KDB.api.specialSingleSelect.dispatch({
  type: "specialSingleSelect/singleSelectInventoryReconciled",
  payload: {
    inventoryGeneration: 0,
    source: "singleSelect",
    reason: "mount" | "filtersReady" | "tabMutation",
    timestamp: 0,
    allowStartupDefault: false,
    allowSpecialPolicy: false
  }
});
```

The dispatch is awaited and returns a structured acknowledgement:

```js
Promise<{
  ok: boolean,
  acknowledged: boolean,
  degraded: boolean,
  disposed: boolean,
  inventoryGeneration: number,
  diagnostics: Array<{ code, message }>
}>
```

Normative rules:

1. `inventoryGeneration` is the only canonical notification key. A transitional
   alias field (for example legacy `generation`) may be accepted temporarily on
   receive for migration, but specialSingleSelect never emits or forwards alias
   keys.
2. `reason: "parameterRestore"` is never received on this action: the canonical
   owner suppresses it and the writeback restore orchestration supplies the
   inventory generation and owner phases separately, consistent with the §8
   restore rule and `SPECIAL_SINGLE_SELECT_INVENTORY_STALE`.
3. The §8 reevaluation of matching live instances and any resulting automatic
   owner policy actions (§6) run in response to this notification only when
   `allowSpecialPolicy: true`. `reason: "tabMutation"` may carry
   `allowSpecialPolicy: true` but never `allowStartupDefault: true`;
   `allowStartupDefault` is a Sicht-owner flag and is ignored by
   specialSingleSelect. Sync remains idempotent and abortable per §8.
4. Acknowledgement semantics are explicit: `acknowledged: true` only when the
   owner accepted and processed the notification for that generation;
   `disposed: true` with `ok: false` when the owner is not mounted; a rejected
   or invalid notification returns `ok: false` with coded diagnostics; degraded
   processing returns `ok: true, degraded: true`. None of the disposed,
   negative or degraded outcomes may be reported as plain success, and a
   non-successful ack leaves this owner retryable by the sender for the same
   generation.

## 9. Planned Implementation Impact

Expected responsibilities after contract approval:

```txt
specialSingleSelect/state/initialState.js
specialSingleSelect/state/createSpecialSingleSelectReducer.js
specialSingleSelect/state/selectors.js
specialSingleSelect/effects/mapFilterDockHandoff.js
specialSingleSelect/effects/delegateToSingleSelect.js
specialSingleSelect/effects/runSpecialSingleSelectSync.js
specialSingleSelect/effects/applyAutomaticSpecialSelection.js
```

The referenced singleSelect action/file is defined and implemented under the
canonical singleSelect identity delta, not by this owner delta.

`runSpecialSingleSelectSync.js` already exceeds the import limit; it must be split
before this tranche adds dependencies or behavior.

## 10. Acceptance

1. Delegation preserves item/scope/tab identity hints.
2. Two special instances never share active selection state.
3. Hidden special filters stay hidden after inventory reconcile.
4. Hidden live instances remain inventory-addressable.
5. Clear/default/park restore targets each concrete instance exactly once.
6. Parked d/u remains separate.
7. Active d/u exists only in singleSelect canonical state.
8. No direct foreign state/runtime write or direct special-owner Cognos write remains
   on the migrated path.
9. Existing BW-only rights/Sicht policy remains compatible.
10. Definition matching uses configured `filterLabel`/`itemName`;
    `semanticInstanceKey` is never treated as a definition ID, and all matching
    validated sibling instances are targeted (§4.1).
11. Parking/restore/default decisions read only the target instance's entry in
    `selectionSourceByInstanceId`; one sibling's provenance never affects
    another, and definition-level `selectionSource` is never a decision source
    (§3.1).
12. Notification-driven policy sync runs only for an acknowledged reconcile
    notification with `allowSpecialPolicy: true` and never for
    `parameterRestore`, which supplies the inventory generation separately
    (§8.1).
13. Inventory notifications are keyed by `inventoryGeneration` only;
    transitional receiver aliases may be accepted temporarily but are never
    emitted (§8.1).
14. Notification acks are structured and explicit; disposed, negative and
    degraded outcomes are never reported as plain success and remain retryable
    for the same generation (§8.1).

## 11. Out Of Scope

- changing which special definitions exist;
- changing BW/DEZPV rights semantics;
- generic filter inventory ownership;
- Dienststelle;
- PDF.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Instance-aware special-owner boundary approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions, incl. the two-step PDF plan that keeps the deprecated `lastApplied*` cache until the future PDF delta migrates its consumer. Contract text approved; separate production-start authorization was still required at this entry; ordered migration gate (§6) applies. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started; the ordered owner migration and two-step PDF compatibility gates remain binding. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 clarification amendment` | PO vastenburg | Review-driven clarification from adversarial review: (1) §4.1 — definition matching uses configured `filterLabel`/`itemName`; `semanticInstanceKey` only distinguishes concrete same-label siblings and is never a definition ID; all validated siblings are targeted. (2) §3.1 — per-instance provenance map `selectionSourceByInstanceId` added as the sole decision source for parking/restore/default; definition-level `selectionSource` demoted to deprecated aggregate compatibility metadata. Acceptance items 10–11 added. No decision from 2026-07-15 is revised. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 clarification amendment` | PO vastenburg | Review-driven clarification of cross-owner inventory notification wiring: §8.1 — formal definition of `specialSingleSelect/singleSelectInventoryReconciled` with canonical payload `{inventoryGeneration, source, reason, timestamp, allowStartupDefault, allowSpecialPolicy}` and awaited structured ack; `inventoryGeneration` is the sole canonical key (transitional aliases accepted temporarily, never emitted); `parameterRestore` is never received (writeback supplies generation/owner phases separately); policy sync gated on `allowSpecialPolicy: true` (tabMutation may allow special policy, never startup default); explicit disposed/negative/degraded ack semantics with per-generation retryability. Acceptance items 12–14 added. No decision from 2026-07-15 or the 2026-08-10 §3.1/§4.1 amendment is revised. |

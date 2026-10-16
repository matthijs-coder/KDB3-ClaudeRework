# Contract Delta: `sicht` Canonical Selection Delegation

> Preserves Sicht domain/selection ownership while making delegated singleSelect
> interaction stateless with respect to confirmed Sicht values.

---

**Status:** `Approved CP-1 (contract text) — Implementation in progress — PO authorized 2026-07-15`
**Owner module / service:** `sicht`
**Type:** `feature-module contract delta`
**Authoring AI:** GPT-5.6 Sol, 2026-07-15
**Reviewed by:** `three independent contract reviews + GPT-5.6 Sol final integral review, 2026-07-15; PO CP-1 text approved 2026-07-15`
**Parent contract:** `contracts/sicht.md`
**Depends on:** `singleSelect-filterInstanceIdentity-contractdelta.md`,
`specialSingleSelect-filterInstanceIdentity-contractdelta.md`,
`sicht-parameterSetRestore-contractdelta.md`

---

## 1. Purpose

Sicht has two different responsibilities:

1. generic Cognos single-select interaction and the active d/u pair;
2. upstream domain meaning: availability, active Sicht display value, history
   dependencies and downstream notification.

Sicht canonically owns its current/backup/pending pair because that pair is part of
the upstream domain state. `singleSelect` owns only the shared interaction effect
and the stable identity descriptor for this delegated filter; it does not persist a
second Sicht selection pair.

This delta supersedes `sicht.md` §4 lines 109–137 only for identity fields and
§7 lines 238–286 for delegated handoff/commit mechanics. Sicht remains the canonical
owner of the selection triplet shown in the parent.

## 2. Ownership Delta

`singleSelect` owns:

- the concrete Sicht `filterInstanceId`;
- Cognos write, reread, rollback and generic popup state.

`sicht` owns:

- current, backup and pending Sicht selection;
- `byOption` availability and configured display/use pairs;
- `activeSichtValue` as confirmed domain display (`"BW"` / `"DEZPV"`);
- `activeFilterInstanceId` reference;
- startup/default policy;
- downstream notification and `filter_sicht` history;
- Sicht-specific error/meta state.

`activeSichtValue` is derived from a confirmed `.d` delivered by singleSelect. It is
not reconstructed from `.u`.

## 3. State Delta

Canonical Sicht state becomes:

```js
_KDB.state.filters.sicht = {
  lifecycle: "idle",
  activeSichtValue: null,
  activeFilterInstanceId: null,
  currentSelection: { displayValue: "", useValue: "" },
  backupSelection: { displayValue: "", useValue: "" },
  pendingSelection: { displayValue: "" },
  byOption: {},
  meta: {
    lastHandoffAt: null,
    lastCommittedAt: null,
    startupDefaultCommitted: false,
    startupDefaultInProgress: false
  },
  lastHistoryStep: null,
  errorCode: null,
  errorMessage: null
};
```

`currentSelection` and `backupSelection` preserve confirmed `.d/.u` independently.
`pendingSelection` is display-only by explicit draft contract and never infers a use
value. `activeSichtValue` equals confirmed `currentSelection.displayValue`.

## 4. FilterDock Delegation

Sicht preserves all identity hints from filterDock and adds owner option mappings:

```js
{
  filterType: "sicht",
  authorizedByOwner: "sicht",
  itemIdHint,
  itemNameHint,
  semanticInstanceKeyHint,
  scopeType,
  tabId,
  scopeId,
  filterConfig: {
    selectionValuesByDisplay: {
      BW: { d: "BW", u: "<use>" },
      DEZPV: { d: "DEZPV", u: "<use>" }
    }
  },
  ownerSelectionContext: {
    currentSelection: { displayValue, useValue },
    backupSelection: { displayValue, useValue },
    pendingSelection: { displayValue }
  }
}
```

The context is a cloned payload from Sicht's own state. singleSelect uses it only
within the delegated call and does not persist it in its instance descriptor.
Host reread remains the authority before confirmed callback.

Sicht must not import singleSelect internals or read its state/runtime directly.

## 5. Confirmed Commit Callback

During delegated popup interaction, singleSelect reports draft transitions through:

```js
{
  type: "sicht/singleSelectDraftChanged" | "sicht/singleSelectDraftReverted",
  payload: {
    filterInstanceId,
    pendingSelection: { displayValue },
    timestamp: 0
  }
}
```

Sicht alone mutates its `pendingSelection`. Revert resets pending to backup.
These draft actions do not notify downstream owners or create history.

CP-1 clarification (2026-08-10): the draft payload is display-only and canonical —
exactly `{ filterInstanceId, pendingSelection: { displayValue }, timestamp }`. It
never carries `useValue`, `displaySource` or any alias fields, and Sicht must not
infer or store a use value from a draft transition.

After successful host write and reread, singleSelect dispatches:

```js
_KDB.api.sicht.dispatch({
  type: "sicht/singleSelectCommitted",
  payload: {
    filterInstanceId: "<canonical id>",
    selection: {
      displayValue: "BW",
      useValue: "<use>",
      displaySource: "cognos" | "table"
    },
    timestamp: 0,
    operationId: "<delegated operation id>",
    source: "user" | "startup" | "parameterRestore" | "historyReplay",
    skipHistory: false
  }
});
```

Sicht validates:

- the instance is global and uniquely classified as Sicht;
- display is a configured enabled option;
- use is present for non-empty Sicht;
- callback is not stale.

Every delegated write has an `operationId`. singleSelect echoes it once; Sicht
records/ignores duplicate confirmations and never redispatches the same operation
back to singleSelect. This is the mandatory loop guard for startup, restore and
history delegation.

On success it stores the confirmed pair in `currentSelection` and
`backupSelection`, resets `pendingSelection` to the confirmed display, and updates
`activeFilterInstanceId`, `activeSichtValue`, meta and Sicht history metadata. It
then notifies specialSingleSelect and Dienststelle under the existing ordering/skip
guards.

Invalid callbacks return/record:

- `SICHT_INSTANCE_INVALID`;
- `SICHT_DISPLAY_VALUE_INVALID`;
- `SICHT_USE_VALUE_MISSING`;
- `SICHT_COMMIT_STALE`.

### 5.1 Inventory Reconcile Notification (CP-1 clarification, 2026-08-10)

Sicht formally defines the public dispatch action through which the canonical
singleSelect owner reports a committed `fresh`, non-stale inventory reconcile
(sender-side gating and tracking live in
`singleSelect-filterInstanceIdentity-contractdelta.md` §6.2):

```js
_KDB.api.sicht.dispatch({
  type: "sicht/singleSelectInventoryReconciled",
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
   receive for migration, but Sicht never emits or forwards alias keys.
2. `reason: "parameterRestore"` is never received on this action: the canonical
   owner suppresses it and the writeback restore orchestration supplies the
   generation and owner phases separately (§7).
3. Sicht may run its §6 startup default in response to this notification only
   when `allowStartupDefault: true` (only `mount`/`filtersReady` may carry it)
   and its own startup policy allows. Notifications arising from clear/restore
   flows never allow a startup default; `allowSpecialPolicy` is a special-owner
   flag and is ignored by Sicht.
4. Acknowledgement semantics are explicit: `acknowledged: true` only when Sicht
   accepted and processed the notification for that generation;
   `disposed: true` with `ok: false` when the owner is not mounted; a rejected
   or invalid notification returns `ok: false` with coded diagnostics; degraded
   processing returns `ok: true, degraded: true`. None of the disposed,
   negative or degraded outcomes may be reported as plain success.

## 6. Startup Default

The existing startup direct-Cognos exception is removed on the migrated path.

Sicht resolves the unique live Sicht instance through the public singleSelect
selector and dispatches:

```js
{
  type: "singleSelect/applyOwnerSelection",
  payload: {
    filterInstanceId,
    operationId,
    selection: { displayValue, useValue },
    source: "sichtStartup",
    notifyOwner: "sicht",
    skipHistory: true
  }
}
```

singleSelect writes, rereads and confirms. Sicht updates domain state only from the
confirmed callback. Timeout/failure uses the existing startup error discipline with
an explicit cause code.

## 7. Parameter Restore And Resync

`sicht/parameterSetRestoreRequested` continues to own domain validation and
downstream ordering, but delegates the actual filter write to the canonical
singleSelect instance.

This formally amends the Approved `sicht-parameterSetRestore-contractdelta.md` §3
lines 51–61 by adding `inventoryGeneration` to the restore payload. Existing
`sicht`, `source`, `runId`, `skipHistory` and `status` fields remain unchanged.

Restore:

1. reuse the writeback-owned inventory `generation` and resolve the unique global
   Sicht descriptor; a stale generation fails instead of starting another
   reconcile;
2. map persisted semantic Sicht value to true d/u from `byOption`;
3. dispatch owner selection with `skipHistory: true`;
4. await confirmed callback;
5. notify downstream according to `dstlWillFollow`;
6. return structured diagnostics.

No path writes `d = u` unless both configured values genuinely are equal.

Post-Dienststelle resync reads identity from the singleSelect descriptor and the
confirmed pair from `readConfirmedSichtSelection`; it does not reconstruct the pair
from `activeSichtValue`.

## 8. History

`filter_sicht` remains the semantic history step because Sicht commits have
downstream meaning beyond generic selection.

New step identity includes:

```js
{
  filterInstanceId,
  scopeType: "global",
  scopeId: "global",
  itemId,
  semanticInstanceKey,
  displayValue,
  useValue,
  activeSichtValue,
  dependencies
}
```

That object is the value shape stored independently under both history `old` and
`new`; `dependencies` is not a top-level history-step field.

Generic `filter_singleSelect` history is not pushed for `filterType: "sicht"` to
avoid duplicate undo frames.

Sicht replay:

1. restores the concrete singleSelect instance through public dispatch;
2. waits for confirmed callback;
3. replays dependent owners through their public boundaries;
4. never writes singleSelect state directly.

Legacy Sicht steps resolve only when one live global Sicht instance exists.

## 9. Public Read Contract

The API surface remains dispatch-style and unchanged.

Published cloned selectors:

```js
readSichtState(_KDB)
readActiveSichtValue(_KDB)
readActiveSichtInstanceId(_KDB)
readConfirmedSichtSelection(_KDB)
```

`readConfirmedSichtSelection` reads only the Sicht owner subtree and returns:

```js
{
  filterInstanceId,
  displayValue,
  useValue,
  displaySource
}
```

or null when Sicht has no confirmed selection. `getState()` remains a clone of the
Sicht owner subtree only and therefore preserves current writeback/PDF compatibility
without composing foreign state.

## 10. Downstream Display/Use

- `specialSingleSelect/sichtChanged` continues to receive confirmed
  `activeSichtValue` (display domain value).
- Dienststelle Sicht switching continues to receive the confirmed domain display
  expected by its contract.
- Binding and Cognos writes use `useValue` from the canonical Sicht selection
  selector.
- Downstream code must not silently exchange display and use.

## 11. Planned Implementation Impact

Expected responsibilities after contract approval:

```txt
sicht/state/initialState.js
sicht/state/createSichtReducer.js
sicht/state/selectors.js
sicht/effects/delegateToSingleSelect.js
sicht/actions/handleSingleSelectDraftChanged.js
sicht/actions/handleSingleSelectDraftReverted.js
sicht/actions/handleSingleSelectCommitted.js
sicht/effects/commitConfirmedSicht.js
sicht/effects/commitStartupSichtDefault.js
sicht/actions/handleParameterSetRestore.js
sicht/actions/handleParameterSetDownstreamVisibility.js
sicht/history/buildCommittedStep.js
sicht/history/applySichtHistoryReplay.js
```

The referenced singleSelect action/callback implementation is defined by the
canonical singleSelect identity delta, not by this owner delta.

Cutover is atomic: remove the direct startup Cognos writer and prevent singleSelect
from persisting Sicht pairs before delegated writes are enabled. There is no phase
where both owners write/store the confirmed pair.

## 12. Acceptance

1. Sicht has one canonical active d/u pair in Sicht owner state.
2. singleSelect stores no duplicate durable Sicht selection pair.
3. Startup, user commit, parameter restore and history replay target one global
   instance.
4. Same-label page-context filters cannot be mistaken for global Sicht.
5. Downstream special/Dienststelle notification receives true display semantics.
6. Binding/write uses true use semantics.
7. No direct foreign state/runtime access or direct migrated-path Cognos write
   remains in Sicht.
8. Existing `filter_sicht` history remains one semantic undo frame.
9. Delegated operation IDs suppress duplicate callbacks and feedback loops.
10. Startup default on the notification path runs only for an acknowledged
    reconcile notification with `allowStartupDefault: true`
    (`mount`/`filtersReady`); clear/restore-flow notifications never trigger a
    startup default (§5.1).
11. Inventory notifications are keyed by `inventoryGeneration` only;
    transitional receiver aliases may be accepted temporarily but are never
    emitted (§5.1).
12. Notification acks are structured and explicit; disposed, negative and
    degraded outcomes are never reported as plain success (§5.1).
13. Draft callbacks carry the display-only canonical payload
    `{pendingSelection: {displayValue}, timestamp}`; no `useValue`/
    `displaySource` alias data is received or inferred (§5).

## 13. Out Of Scope

- changing Sicht option semantics;
- moving rights policy out of Sicht;
- redesigning Dienststelle;
- PDF implementation;
- adding named methods to the Sicht API.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-07-15 | `Proposed → Draft CP-1` | PO vastenburg | Canonical delegation direction approved for contract drafting; implementation remains blocked pending cross-review. |
| 2026-07-15 | `Draft CP-1 (blockers open) → Approved CP-1 (contract text)` | PO vastenburg | Master approval blockers closed via the canonical `singleSelect-filterInstanceIdentity-contractdelta.md` §16 decisions, including the formal amendment (§7) to the Approved `sicht-parameterSetRestore-contractdelta.md`. Contract text approved; separate production-start authorization was still required at this entry; atomic cutover rule (§11) applies. |
| 2026-07-15 | `Approved CP-1 (contract text) → Implementation in progress` | PO vastenburg | Production implementation authorized and started; the §11 atomic owner cutover remains binding. |
| 2026-08-10 | `Implementation in progress (status unchanged) — CP-1 clarification amendment` | PO vastenburg | Review-driven clarification of cross-owner inventory notification wiring: (1) §5.1 — formal definition of `sicht/singleSelectInventoryReconciled` with canonical payload `{inventoryGeneration, source, reason, timestamp, allowStartupDefault, allowSpecialPolicy}` and awaited structured ack; `inventoryGeneration` is the sole canonical key (transitional aliases accepted temporarily, never emitted); `parameterRestore` is never received (writeback supplies generation/owner phases separately); startup default only on `allowStartupDefault: true`; explicit disposed/negative/degraded ack semantics. (2) §5 — draft payload confirmed display-only canonical `{pendingSelection: {displayValue}, timestamp}` with no alias data. Acceptance items 10–13 added. No decision from 2026-07-15 is revised. |

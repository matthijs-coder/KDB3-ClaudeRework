# Contract Delta: `historyService` Writeback Restore

> Delta on top of `contracts/historyService.md` and `contracts/writeback.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Draft`
**Parent contract:** `contracts/historyService.md`
**Consumer:** `writebackSet`
**Type:** `core service contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `<pending>`

---

## 1. Purpose

Parameter-set restore performs many owner dispatches. Those dispatches must not create one undo/redo history entry per internal restore step.

This delta defines how history is reset or baselined around `writebackSet.restore(v3)`.

## 2. Public Service API

Required service surface:

```js
_KDB.services.history.beginWritebackRestore({
  source: "writebackSet",
  runId,
  status
});

_KDB.services.history.finishWritebackRestore({
  source: "writebackSet",
  runId,
  outcome: "committed" | "degraded" | "cancelled" | "failed",
  baseline?: {
    kind: "postRestore" | "newDashboardReset",
    status: string,
    capturedAt: number,
    stateHash?: string,
    diagnostics?: Array<{ code, phase, message }>
  }
});
```

Equivalent dispatch/service names are acceptable only if the history owner delta documents the same semantics.

## 3. Runtime Semantics

During writeback restore/reset:

- owner reset/default/restore dispatches receive `skipHistory: true`;
- history service must ignore internal restore steps;
- undo must not take the dashboard back into pre-restore partial state;
- redo must not replay partial restore internals;
- cancellation/failure must leave history in a coherent state.

Default decision:

```txt
restore resets history to a post-restore baseline
```

The baseline may be empty or a single synthetic restore baseline record matching `writeback.md` §2.2. It must not contain per-owner internal actions.

Orchestrator ordering:

1. `writebackSet` creates `parameterSetRestoreRunId`.
2. `writebackSet` calls `beginWritebackRestore({ runId, source: "writebackSet", status })`.
3. Owner reset/default/restore dispatches run with `skipHistory: true`.
4. `writebackSet` calls `finishWritebackRestore({ source: "writebackSet", runId, outcome, baseline })` at the history baseline/reset step before clearing restore flags.

No owner reset/default/restore dispatch may run before `beginWritebackRestore` except schema/status validation and runId creation.

## 4. Replay Handler Reuse

Owner replay helpers may be reused by writeback restore only when called with restore metadata:

```js
{
  source: "writebackSet",
  runId,
  skipHistory: true,
  isHistoryReplay: false,
  isParameterSetRestore: true
}
```

Writeback restore is not a history replay, even if it reuses history replay helpers.

## 5. Failure Modes

| Condition | Behavior |
|---|---|
| restore cancelled | finish with `outcome: "cancelled"` and no partial internal history |
| restore failed after reset | finish with `outcome: "failed"` and diagnostics; history owner decides whether baseline remains empty or last valid baseline |
| stale `runId` | ignore finish request unless it matches active restore run |
| owner dispatch pushes history despite `skipHistory` | contract violation; test failure |

## 6. Acceptance

- No internal restore action appears as a user undo step.
- After successful restore, undo cannot return to pre-restore partial dashboard state.
- History service can be entered/exited exactly once per restore `runId`.
- Reused replay helpers do not set `isHistoryReplay: true` unless the action is actually undo/redo.

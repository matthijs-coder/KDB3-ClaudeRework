# Execution Spec: history undo/redo of a duplicate surfaces a partial update

> Small follow-up to `tabs-tabMutation-rebuildOnSlotStock-duplicate-execution-spec.md`.
> The toast does not put missing widgets back. It reports that the undo or redo finished incomplete.
> No harness. One writer. Echo Section A before editing.

---

**Status:** `Ready for execution` — PO vastenburg 2026-10-06 chose this over a paint investigation. Waiting for an explicit go.
**Parent:** `contracts/futureTodo/tab-duplicate-undo-redo-partial-widgets-2026-10-06.md`

---

## Exclusive allowlist

**May edit:**

- `KDB3/js/dashboard/tabs/actions/runTabMutationSaga.js`
- `KDB3/js/dashboard/tabs/history/applyTabsDeleteHistoryReplay.js`

**Must not edit:** widget apply, fill, place, confirmAndDispatch*, filter owners, `defaults.js` (reuse `TAB_MUTATION_DEGRADED_TEXT`). No commit.

## Behaviour

1. When `payload.widgetRebuild === true` and `plan.operation === "delete"` and widget apply returns `ok: true` with a non-empty `degradedEntries` array, set `phases.widgetApply` to `{ status: "degraded", diagnostics: widgetApply.diagnostics || [] }`. The duplicate branch at `runTabMutationSaga.js:43` stays as it is. Do not add an import.
2. In `applyTabsDeleteHistoryReplay`, call `notify` only inside the `widgetRebuild` delete branch and only inside the `replayDuplicate` branch, after that dispatch returns `outcome === "degraded"`. Do not put the check on the shared return (`applyTabsDeleteHistoryReplay.js` around line 67). `step.key === "tabs_delete"` must not notify, even when `outcome` is `"degraded"`. Use `_KDB.services.message.notify` with `severity: "info"` and `message` `TAB_MUTATION_DEGRADED_TEXT` (import `../config/defaults.js`). If `notify` is missing, do nothing. Do not toast on `applied`. Do not copy `surfaceFailure` (that also alerts min-visible, conflict, and hard failures). The function still returns true for `degraded`.
3. User-delete and move history are unchanged. A UI delete without `widgetRebuild` does not gain this toast from the saga.

## Section A

Echo one sentence each: `error-handling.mdc`, `events.mdc` (direct call, no new event), `amd.mdc`, this spec.

## Section J

`node --check` on both files. Saga import count unchanged. `git diff --stat` shows only the two files.

## Section L

No retry of a failed place or fill. No change to which widgets are built.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-10-06 | — → `Ready for execution` | PO vastenburg | Silent partial undo/redo. Surface the existing info toast. Do not investigate paint first. |

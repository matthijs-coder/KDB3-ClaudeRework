# KDB3 History Service Guide

Read this file only when the user explicitly means app-level history behavior such as `history commit`, `undo`, `redo`, `history step`, `pushCommittedStep`, or the history toolbar. Do not use this guide for normal git commits.

**Structural rules** (thin registry, adapter `apply` contract, grouping keys, no replay → `pushCommittedStep`): see **`rules/history-adapters.mdc`** next to this file under `.cursor/`.

## Current architecture

Paths below are under the project output root `_______KDB3/` (dashboard and services live in `KDB3/js/...`; see `ai-discipline.mdc`).

- Service entry: `KDB3/js/base/services/historyService/createHistoryApi.js`
- Handler registry: `KDB3/js/base/services/historyService/resolveHistoryHandler.js`
- Reference adapter: `filter_singleSelect` via `KDB3/js/dashboard/filters/singleSelect/__singleSelectHistoryAdapter.js`
- Toolbar UI: `KDB3/js/dashboard/historyControls/__historyControlsOrchestrator.js`

## Public API

The live API is `_KDB.history` and currently exposes:

- `pushCommittedStep(step)`
- `undo()`
- `redo()`
- `canUndo()`
- `canRedo()`
- `getSnapshot()`

The service stores runtime state in `_KDB.state.history`.

## When to push a step

Push a history step only after the feature has a fully confirmed, stable result.

- Good: after Cognos has accepted the change and `_KDB.state` has been updated to the confirmed value.
- Bad: while the user is still editing pending popup state.
- Bad: before `replaceFilterContext(...)` or equivalent host normalization is complete.

The current single-select flow is the model: it builds a committed step only from confirmed `displayValue` + `useValue`.

## Step shape

Every history step must have:

- `key`
- `timestamp`
- `old`
- `new`

`pushCommittedStep` rejects empty keys and no-op steps where `old` and `new` are equal.

Current example:

```js
{
  key: "filter_singleSelect",
  timestamp: Date.now(),
  old: {
    filterScope: "global",
    filterLabel: "Personengruppe",
    itemId: "...",
    useValue: "...",
    displayValue: "Lehrlinge"
  },
  new: {
    filterScope: "global",
    filterLabel: "Personengruppe",
    itemId: "...",
    useValue: "",
    displayValue: "Alle"
  }
}
```

## How to add a new history-enabled feature

1. Add a feature-specific step builder near the owning feature.
2. Register the new `key` in `resolveHistoryHandler.js`.
3. Implement `handler.apply(_KDB, targetValue, fullStep, ctx)`.
4. In `apply`, update Cognos or other host state first, then mirror the same confirmed result into `_KDB.state`.
5. Return `true` only if the replay actually succeeded.

## Replay rules

- `undo()` applies `step.old`
- `redo()` applies `step.new`
- Replay must not create a new history step
- Replay must leave the feature in a normal confirmed state, not a pending edit state
- Replay must clear transient flags such as `isCommitInProgress`

## UI behavior

The history toolbar listens to the `history:changed` event and updates button enabled state automatically. Feature code should not manage undo/redo button state directly. It should only push committed steps or expose a correct handler.

## Single-select specifics

For single-select filters:

- committed data is confirmed `displayValue` + `useValue`
- `Alle` is represented as `displayValue: "Alle"` and empty replacement values
- history replay uses Cognos `replaceFilterContext(...)`
- replay also mirrors `currentSelection`, `backupSelection`, and `pendingSelection`

## Terminology

In this codebase, `history commit` means committing an application history step, not a git commit.

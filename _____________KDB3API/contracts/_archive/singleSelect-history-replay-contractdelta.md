# singleSelect — history replay / undo-redo (contractdelta)

**Status:** Draft for CP-1 review  
**Date:** 2026-05-24  
**Relation:** Refines `singleSelect.md` §history, `singleSelect-tableLookup-commit-contractdelta.md`, and `historyService-kdbControl-replay-bootstrap-contractdelta.md`.

---

## 1. Purpose

Enable `historyService` undo/redo to replay `filter_singleSelect` steps through singleSelect-owned logic. Commit continues to push history steps; replay does not.

---

## 2. Ownership

| Concern | Owner |
|---|---|
| `_KDB.state.filters.singleSelect` | `singleSelect` only |
| `_KDB.state.history` | `historyService` only |
| Step construction on commit | `singleSelect` (`buildCommittedStep.js`) |
| Cognos `replaceFilterContext` on replay | `singleSelect` (`replayCommittedSelection.js`) |
| Replay handler contribution | `singleSelect`, staged on orchestrator init |
| Handler map entry `filter_singleSelect` | `collectReplayHandlers.js` (registration only) |

Forbidden:

- `historyService` writes singleSelect state
- `singleSelect` reads `_KDB.runtime.filterDock`
- Replay pushes history or emits events
- `eventSubscribe` / `specialRights` in this tranche

---

## 3. Step shape

Step key: `filter_singleSelect`

```js
{
  key: "filter_singleSelect",
  timestamp: number,
  old: {
    filterScope: string,
    filterLabel: string,
    itemId: string,
    displayValue: string,
    useValue: string
  },
  new: { /* same fields */ }
}
```

`historyService` passes `step.old` on undo and `step.new` on redo to the handler as `targetValue`.

---

## 4. Replay commit

For `targetValue` (undo → `step.old`, redo → `step.new`):

1. Resolve Cognos filter API via `resolveFilterApi` (handoff built from step fields; no filterDock runtime).
2. `displayValue === "Alle"` → `replaceFilterContext(filterApi, [])`.
3. Else if `useValue` is valid (non-empty after `selectionState` normalization) → `replaceFilterContext(filterApi, [{ u, d }])`.
4. Else → `resolveFilterValueFromTable(filterLabel, displayValue)` → `replaceFilterContext` with `{ d, u }` from table row.
5. Sync owner state: `currentSelection`, `backupSelection`, `pendingSelection` = target confirmed selection (`commitSelectionState.applyConfirmedState`).

Replay must not call `history.pushCommittedStep`, must not emit `filter:applied` or other events, and must not open/close filterDock popups.

---

## 5. Runtime contribution

Staged during `__orchestratorSingleSelect` (before `bindHistoryReplayHandlersOnly`):

```txt
_KDB.runtime.singleSelect.historyReplayHandlerContribution
```

Handler shape:

```js
{
  apply: function (_KDB, targetValue, step, context) { /* delegates to applySingleSelectHistoryReplay */ }
}
```

Cleared on `singleSelect.destroy()`.

---

## 6. Files

```txt
KDB3/js/dashboard/filters/singleSelect/
  history/
    applySingleSelectHistoryReplay.js
    createSingleSelectHistoryReplayHandler.js
    stageSingleSelectHistoryReplayHandler.js
  effects/
    replayCommittedSelection.js

KDB3/js/core/services/collectReplayHandlers.js   // add filter_singleSelect entry only
```

---

## 7. Acceptance criteria

1. Confirmed singleSelect change still pushes one `filter_singleSelect` step.
2. Undo restores `step.old` Cognos context and owner selection triple.
3. Redo restores `step.new`.
4. Replay with missing/invalid `useValue` uses tableData lookup.
5. Replay creates no new history step and emits no events.
6. `historyService` does not import singleSelect modules.

---

## Approval

| Date | Actor | Note |
|------|-------|------|
| `<pending>` | `<pending CP-1>` | Initial replay tranche |

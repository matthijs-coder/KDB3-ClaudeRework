# KDB3 singleSelect / filterDock Cleanup Closure

**Status:** closed  
**Date:** 2026-05-24  
**Scope:** `KDB3/js/dashboard/filters/singleSelect/`, `KDB3/js/dashboard/filters/filterDock/`, related CSS

The cleanup series is complete. `singleSelect` is functionally working. No new events were added. `specialRights` / `specialSingleSelect` remain out of scope.

---

## Final Architecture

### singleSelect owns

- Pending / current / backup selection state
- Popup DOM sync (footer, option rows, selection visuals)
- TableData-first commit orchestration
- Rollback and history integration

### filterDock owns

- Dock click listener
- Dock observer
- Popup observation and `POPUP_OBSERVED` dispatch
- PopupReady / session reset
- Bounded post-ready handoff to `singleSelect`
- Native close / cancel DOM actions (`closeActivePopup`, `clickOriginalPopupButton`)

### Boundary rules (unchanged)

- `singleSelect` requests dock actions via `_KDB.api.filterDock.dispatch(...)` only.
- `singleSelect` does not read `_KDB.runtime.filterDock`.
- `filterDock` does not write `_KDB.state.filters.singleSelect`.
- Commit / OK closes via `requestClosePopup` → `closeActivePopup`; cancel uses native button click via `clickOriginalPopupButton`.

---

## Removed Complexity

### Dead singleSelect helpers removed

- `createConfirmedSelectionFromValue.js`
- `pollNormalizedFilterValue.js`
- `filterValueHelpers.js`

### singleSelect streamlined

- `commitConfirmedSelection.js` reduced below 150 lines.
- `verifyCommitFilterValue.js` added as a tiny synchronous post-commit verifier.
- No polling, timer, or observer logic in `singleSelect`.
- No `_KDB.runtime.filterDock` reads in `singleSelect`.
- No fake `{u,d}` fallback construction.

### filterDock streamlined

- `createFilterDockController.js` split: factory + `lifecycle/runFilterDockControllerLifecycle.js`.
- Popup snapshot duplication removed; observation reuses `effects/readPopupSnapshot.js`.
- PopupReady trace / debug logging removed.
- `clickOriginalPopupButton.js` diagnostic warning noise reduced; identity guard behavior unchanged (filterId → filterKey → label fallback).

### CSS

- Conservative cleanup in `singleSelect.css` / related filter CSS; no aggressive relocation.

---

## Validation Status

| Area | Status |
|---|---|
| Browser smoke | Green |
| Lints | Clean on touched files |
| File line limits (150) | Restored on split / trimmed modules |
| Static forbidden-pattern checks | Green |
| PopupReady open / sync | Works |
| Specific value commit | Works |
| Alle commit | Works |
| Cancel / out-click rollback | Works |
| Post-commit close | Works |
| Reopen / session reset | Works |
| PopupReady flood | Not observed |

---

## Deferred By Design

- `bindOutClickRevert.js` remains a known boundary exception inside `singleSelect`.
- Moving out-click ownership to `filterDock` requires separate CP approval.
- `specialRights` / `specialSingleSelect` not ported in this series.
- No event catalog changes.
- No `tableDataService` behavior changes.
- No aggressive CSS relocation.
- No further identity guard simplification beyond warning cleanup in `clickOriginalPopupButton.js`.

---

## Future Work If Needed

Only if a concrete need arises — not scheduled cleanup:

- Move out-click handling to `filterDock` in a separate approved tranche.
- Revisit `specialSingleSelect` only under its own contract.
- Revisit CSS organization only with a visual regression plan.
- Revisit tableData startup behavior only if a real smoke / production timing issue appears.

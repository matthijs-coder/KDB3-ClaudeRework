# Fix Spec: `singleSelect` tableData lookup streamline + filterDock-owned resync

> Planning spec for simplifying the current `singleSelect` implementation after multiple F6/F6b/F6c/F6d/F6f iterations.
> The goal is a simpler tableData-first commit path and deterministic visual resync without adding observers, timers, or retry loops inside `singleSelect`.

---

**Status:** Ready for execution after approval  
**Date:** 2026-05-24  
**Owner modules:** `singleSelect`, `filterDock`  
**Related contracts/specs:** `singleSelect.md`, `filterDock.md`, `singleSelect-popupReady-sync-contractdelta.md`, `singleSelect-filterDock-cleanup-fix-spec.md`, `singleSelect-F6c-smoke-communique.md`  
**Planner:** GPT-5.5

---

## 1. Purpose

The `singleSelect` module has accumulated temporary commit-resolution and popup-sync code while moving from Cognos `getValues()` timing to tableData lookup tables.

This tranche streamlines the design:

- `tableData` lookup is the canonical source for non-Alle `{ u, d }` commit values.
- `singleSelect` owns pending/current/backup state, popup DOM sync, and commit orchestration.
- `filterDock` owns dock/popup observation and sends bounded sync-only handoffs when Cognos mutates popup DOM after ready.
- `singleSelect` must not add timers, requestAnimationFrame retries, MutationObservers, dock listeners, or runtime reads from `filterDock`.

## 2. Current Problem Summary

### 2.1 Commit complexity

Earlier F6c/F6d attempts used Cognos `filterApi.getValues()` as a value discovery mechanism:

- pre-OK lookup;
- post-OK polling;
- constructed fallbacks;
- native option click helpers;
- normalized polling ladders.

These were fragile because `getValues()` reflects committed dashboard state, not reliably the pending popup state. For the six configured singleSelect filters, tableData already provides stable display/use pairs.

### 2.2 Visual resync gap

After a successful OK commit, first popup reopen can show Cognos native checked / inner `is-selected` state without the wrapper class `.KDB_selectedOption`. Existing CSS intentionally hides checked visuals when `.KDB_selectedOption` is absent.

Root cause:

- `filterDock` dispatches `singleSelect/filterDockPopupReady` only on the initial ready transition.
- Cognos may mutate popup subtree/classes after that first sync.
- `filterDock` observes the mutation, but `singleSelect` receives no bounded follow-up sync handoff.

The fix must stay with `filterDock` observation ownership. Do not solve this with a `singleSelect` observer, timeout, or rAF workaround.

## 3. Architectural Decisions

1. `singleSelect` has no owner-local popup observer in this tranche.
2. `singleSelect` has no timers or rAF retry loops in this tranche.
3. `singleSelect` does not read `_KDB.runtime.filterDock`.
4. `filterDock` may dispatch an additional bounded sync-only `singleSelect/filterDockPopupReady` when a ready popup receives post-ready Cognos DOM mutations.
5. `singleSelect/filterDockPopupReady` remains sync-only:
   - map handoff;
   - ensure state;
   - restore/hydrate/sync popup;
   - return before intent derivation.
6. Non-Alle commit values come from tableData lookup.
7. No `getValues()` discovery ladder is restored for configured filters.
8. If a table is not ready or the pending label cannot be found, commit fails clearly and rolls back.
9. No new events and no `eventSubscribe.md` changes.
10. No `specialRights` port.

## 4. Scope

### 4.1 Allowed `singleSelect` scope

Allowed to edit:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/resolveCommitFilterValue.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/filterValueHelpers.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/pollNormalizedFilterValue.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/clickNativePendingOption.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/applyPendingSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/syncPopupOptionSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/restorePopupSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/runSingleSelectInteraction.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/config/resolveFilterOptionsTableKey.js
```

Allowed to create if missing:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/config/resolveFilterOptionsTableKey.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
```

Allowed to delete if unused after refactor:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/clickNativePendingOption.js
```

### 4.2 Allowed `filterDock` scope

Allowed to edit only for bounded post-ready sync handoff:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/managePopupReadyTransition.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/evaluateObservedDockState.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/observation/normalizeMutationSignals.js
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/runtime/cleanupFilterDockRuntime.js
```

### 4.3 Contract/documentation scope

Allowed to create:

```txt
_____________KDB3API/contracts/singleSelect-tableLookup-commit-contractdelta.md
```

### 4.4 Forbidden scope

Do not edit:

```txt
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/core/services/tableData/
_____________KDB3API/KDB3/js/core/config/tables.js
_____________KDB3API/KDB3/css/
_____________KDB3API/architecture/eventSubscribe.md
_____________KDB3API/.cursor/rules/
legacy reference trees
```

Do not modify `filterDock` outside the allowed observation/runtime files.

## 5. Required Work

### F1 - Document tableData-first commit path

Create `singleSelect-tableLookup-commit-contractdelta.md`.

Must state:

- tableData lookup is canonical for the six configured singleSelect filters;
- `getValues()` discovery ladders are obsolete for configured filters;
- `singleSelect` reads tableData through service API only;
- `singleSelect` never writes `_KDB.state.tableData`;
- table-not-ready or label-not-found fails clearly and rolls back;
- F6/F6b popupReady sync-only remains active;
- `filterDock` remains observation owner.

### F2 - Table key mapping

Create or verify `config/resolveFilterOptionsTableKey.js`.

Required mappings:

| Filter label | table key |
|---|---|
| `Berufsfamilie` | `berufsfamilie_filter` |
| `Dienstverhältnis` | `dienstverhaeltnis_filter` |
| `Geschlecht` | `geschlecht_filter` |
| `Altersgruppe` | `altersgruppe_filter` |
| `Personengruppe` | `personengruppe_filter` |
| `Dienststellenleitung` | `dienststellenleitung_filter` |

Default may be normalized lowercase + `_filter`, but explicit mapping is required for umlaut/transliteration cases.

### F3 - Table value resolver

Create or verify `effects/resolveFilterValueFromTable.js`.

Behavior:

- Input: `_KDB`, `filterLabel`, `pendingLabel`.
- Resolve table key through `resolveFilterOptionsTableKey`.
- Read rows through `_KDB.services.tableData`.
- Prefer public service read API. Do not write tableData state.
- Parse picked row shape:

```js
{ "<ColumnName>": { display: "<label>", use: "<TM1 member key>" } }
```

- Match normalized `cell.display` to normalized `pendingLabel`.
- Return:

```js
{ ok: true, selectedValue: { d: cell.display, u: cell.use }, tableKey, rowCount }
```

- On table not ready / missing service / label not found, return `{ ok: false, errorCode, tableKey, rowCount }`.
- Do not construct `{ u: label, d: label }`.
- Do not use DOM or Cognos `getValues()` for primary resolution.

### F4 - Simplify commit path

Update `commitConfirmedSelection.js`.

Target commit path:

1. Set commit state/UI.
2. Resolve `filterApi`.
3. Run `syncPopupOptionSelection` if popup mount is available (visual class sync only).
4. For `Alle`, call `replaceFilterContext(filterApi, [])`.
5. For non-Alle:
   - call `resolveFilterValueFromTable`;
   - if not ok, throw clear error before replacing;
   - call `replaceFilterContext(filterApi, [selectedValue])`.
6. Strict `verifyCommitFilterValue` — commit fails and rolls back if verify fails. Verify-downgrade is a separate future CP decision.
7. Apply confirmed state with table lookup `u`.
8. Push history if available.
9. Close popup through existing filterDock-owned request only after successful commit.
10. On failure, rollback state/Cognos as current contract requires.

**Post-F6 baseline (2026-05-26):** `syncNativePopupToPending` removed from commit path; native Cognos option clicks are not required for configured filters.

### F5 - Remove obsolete commit discovery ladder

Remove or heavily simplify:

- `resolveCommitFilterValue.js`;
- `filterValueHelpers.js`;
- `pollNormalizedFilterValue.js`;
- `clickNativePendingOption.js`.

Rules:

- Delete `clickNativePendingOption.js` if it has no remaining imports.
- Remove postSync / postOk / constructed discovery functions.
- Remove `constructValueFromLabel`.
- Remove `readFilterValues` / `findMatchingValue` unless a minimal verification helper still needs them.
- Keep `normalizeText`, `isResolvedUseValue`, and `getDisplayFromValue` only if still used.

### F6 - Remove debug logs

Remove smoke/debug logs from `applyPendingSelection.js`.

Keep `console.warn` for real missing-data warnings.

### F7 - Bounded post-ready filterDock resync

Implement bounded filterDock-owned follow-up sync for the first-popup-reopen visual issue.

Requirements:

- Keep initial transition-based popupReady.
- If the same active singleSelect popup remains visible/ready and filterDock observes a post-ready Cognos DOM mutation, allow a bounded follow-up `singleSelect/filterDockPopupReady`.
- Do not dispatch popupReady on every observer tick.
- Do not key dedup solely on `popup.observedAt`.
- Reset ready/resync state on popup close, active filter change, or destroy.
- Mutation trigger must account for attribute/class mutations, not only childList added/removed.
- Avoid feedback loop from singleSelect's own class mutations:
  - at most one follow-up resync per open cycle is acceptable for CP-1;
  - if more are needed, stop and report rather than creating an unbounded loop.
- Payload remains serializable.
- `singleSelect` receives the same sync-only popupReady action and must not derive intent from it.

Preferred implementation:

- Extend `managePopupReadyTransition.js` runtime state with a `postReadyResyncDispatched` flag and mutation generation fields.
- Extend `normalizeMutationSignals.js` with attribute mutation count/signature if needed.
- Extend `evaluateObservedDockState.js` to pass the mutation/evaluation summary into the ready transition decision.

### F8 - Preserve no-observer/no-timer singleSelect boundary

Static checks must show:

- no `new MutationObserver` in `singleSelect/`;
- no `setTimeout`, `setInterval`, `requestAnimationFrame` in `singleSelect/`;
- no `addEventListener` dock-level listener in `singleSelect/`;
- no `_KDB.runtime.filterDock` read in `singleSelect/`.

Note: standard runtime buckets may still exist in `_KDB.runtime.singleSelect`, but this tranche must not create/use observers or timers in that module.

## 6. Acceptance Criteria

### Commit behavior

1. `Geschlecht`: `Alle -> weiblich -> OK` commits `weiblich` with real TM1 `u`.
2. `Geschlecht`: `weiblich -> männlich -> OK` commits `männlich` with real TM1 `u`.
3. Repeated A/B switching before OK commits latest pending.
4. `Alle` commits `replaceFilterContext(filterApi, [])`.
5. Table-not-ready or label-not-found fails clearly and rolls back.

### Popup visual behavior

6. Commit OK -> first popup reopen shows committed option wrapper with `.KDB_selectedOption`.
7. Reopen popup shows only one checked/selected option.
8. No duplicate ghost rows.
9. No OK flicker loop.
10. No popupReady flood; allowed count per open cycle is bounded.

### Boundaries

11. `singleSelect/filterDockPopupReady` remains sync-only.
12. `singleSelect` has no observer/timer/rAF workaround.
13. `filterDock` remains observation owner.
14. No `_KDB.runtime.filterDock` reads from `singleSelect`.
15. No tableData state writes from `singleSelect`.
16. No new events / `eventSubscribe.md`.
17. No `specialRights` port.
18. Lints clean.
19. File-size rules respected; split focused helpers if needed.

## 7. Verification

Run after implementation:

1. `ReadLints` on touched files.
2. Static search:
   - `singleSelect/`: no `_KDB.runtime.filterDock`;
   - `singleSelect/`: no `new MutationObserver`, `requestAnimationFrame`, `setTimeout`, `setInterval`;
   - `singleSelect/`: no dock-level `addEventListener`;
   - repo: no `_KDB.events` / `filter:applied` additions;
   - `singleSelect/`: no `_KDB.state.tableData` writes.
3. Manual Cognos smoke:
   - all cases in acceptance criteria;
   - inspect `getKDB().state.filters.singleSelect.byScope.global.Geschlecht.currentSelection.useValue`, which must be the TM1 key, not label text;
   - inspect first popup reopen DOM for `.KDB_selectedOption`.

## 8. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. Files created/edited/deleted with line counts.
3. Commit path after cleanup.
4. Table lookup API/row shape actually used.
5. Obsolete files/functions removed.
6. Bounded filterDock resync strategy.
7. F1-F8 pass/fail.
8. Acceptance criteria pass/fail.
9. Static forbidden-access checks.
10. Remaining smoke risks.

---

## 9. Executing-AI Prompt

```text
You are the executing AI for `singleSelect` tableData lookup streamline + filterDock-owned bounded resync.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/singleSelect-tableLookup-streamline-fix-spec.md
2. _____________KDB3API/contracts/singleSelect.md
3. _____________KDB3API/contracts/filterDock.md
4. _____________KDB3API/contracts/singleSelect-popupReady-sync-contractdelta.md
5. _____________KDB3API/contracts/singleSelect-filterDock-cleanup-fix-spec.md
6. _____________KDB3API/contracts/singleSelect-F6c-smoke-communique.md
7. KDB3/js/core/config/tables.js
8. Relevant .cursor/rules: state, runtime, module-public-api, events, feature-structure, dom, amd, error-handling.

Echo one sentence per file/rule before editing.

Implement only `singleSelect-tableLookup-streamline-fix-spec.md`.

Core goals:
- Streamline `singleSelect` to tableData-first commit lookup.
- Remove obsolete Cognos `getValues()` discovery ladders for configured filters.
- Remove debug logs.
- Visual popup sync via `syncPopupOptionSelection` before commit (no native option clicks on commit; see F6 native-click removal baseline).
- Add bounded filterDock-owned post-ready popup resync.
- Do not add observers, timers, rAF retries, dock listeners, or `_KDB.runtime.filterDock` reads in `singleSelect`.

Hard constraints:
- No new events.
- No `eventSubscribe.md` changes.
- No `specialRights` port.
- No filterDock changes outside allowed observation/runtime files.
- No tableDataService changes.
- No CSS changes.
- No KDB.js changes.
- No legacy tree changes.
- Respect file-size limits; split focused helpers.

After edits:
- Run lints on touched files.
- Run static forbidden-access checks from the spec.
- Report files changed/deleted/created with line counts.
- Report commit path, table lookup shape, removed obsolete functions, and bounded resync behavior.
- Report acceptance criteria pass/fail and remaining manual smoke steps.
```


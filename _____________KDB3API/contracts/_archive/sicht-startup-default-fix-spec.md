# Fix Spec: `sicht` startup default selection

> Focused P2 tranche for the first dashboard-start / first-open Sicht state issue.
> `singleSelect` currently initializes the delegated Sicht filter as `"Alle"` even though Sicht has no Alle option, while `_KDB.state.filters.sicht` and Cognos still have no confirmed value. This spec adds a contract-driven Sicht startup default and a narrow singleSelect hydration guard for `filterType: "sicht"`.

---

**Status:** `Ready for execution after user approval`
**Date:** 2026-05-25
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Related specs:**

```txt
_____________KDB3API/contracts/sicht-port-execution-spec.md
_____________KDB3API/contracts/sicht-port-fix-spec-2.md
_____________KDB3API/contracts/sicht-port-fix-spec-4.md
_____________KDB3API/contracts/sicht-popupReady-parity-fix-spec.md
```

Legacy reference:

```txt
_______REDESIGN2/KDB3/js/dashboard/filters/sicht/applyStartupSicht.js
```

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
6. `_____________KDB3API/.cursor/rules/dom.mdc`
7. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
8. `_____________KDB3API/.cursor/rules/amd.mdc`
9. `_____________KDB3API/contracts/sicht.md`
10. `_____________KDB3API/contracts/sicht-startup-default-fix-spec.md`
11. `_______REDESIGN2/KDB3/js/dashboard/filters/sicht/applyStartupSicht.js`

---

## Section B. User evidence

Before first opening the Sicht filter:

```js
_KDB.state.filters.sicht.currentSelection
// { displayValue: "", useValue: "" }
```

After first opening the Sicht filter without selecting anything:

```js
_KDB.state.filters.singleSelect.byScope.global.Sicht.currentSelection
// { displayValue: "Alle", useValue: "" }

_KDB.state.filters.singleSelect.byScope.global.Sicht.hasAlleOption
// false
```

After manually selecting and committing `DEZPV`:

```js
_KDB.state.filters.sicht.currentSelection
// { displayValue: "DEZPV", useValue: "" }

_KDB.state.filters.singleSelect.byScope.global.Sicht.currentSelection
// { displayValue: "DEZPV", useValue: "" }
```

Problem summary:

- The first delegated `singleSelect` state for Sicht defaults to `"Alle"`.
- Sicht contract says `"Alle"` is hidden and Sicht always has a normal option selected.
- Cognos has no startup Sicht value yet.
- Manual commit works, so this is startup/default initialization, not the P0 popupReady parity issue.

---

## Section C. Scope

Allowed to modify or create files only under:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
```

Allowed single narrow `singleSelect` file:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/state/ensureFilterState.js
```

Allowed contract sync:

```txt
_____________KDB3API/contracts/sicht.md
```

If a clean implementation needs any other file, stop and report before editing it.

---

## Section D. Required design

### D1. Add a contract note for startup default

File:

```txt
contracts/sicht.md
```

Add a short contract synchronization note:

- Sicht startup may choose the first enabled normal Sicht option from tableData-derived `byOption`.
- Startup default must commit a real Cognos Sicht filter value, not just set KDB UI state.
- Startup default must notify `specialSingleSelect/sichtChanged` through the existing confirmed-commit path.
- Startup default must not run Dienststelle / hierarchy cascade.
- Startup default history is skipped unless the user later approves startup history.

### D2. Add a startup default action

File:

```txt
KDB3/js/dashboard/filters/sicht/config/actions.js
```

Add:

```js
STARTUP_DEFAULT_COMMITTED: "sicht/startupDefaultCommitted"
```

or reuse `SINGLE_SELECT_COMMITTED` internally if no separate action is needed. If reusing, document in the report why a new action was unnecessary.

### D3. Select the startup candidate from owned `byOption`

Create:

```txt
KDB3/js/dashboard/filters/sicht/effects/selectStartupSichtDefault.js
```

Behavior:

- Input: `_KDB`, `byOption`.
- Choose the first option whose state has:
  - `isVisible === true`;
  - `isEnabled === true`;
  - `displayValue` not empty and not `"Alle"`;
  - `useValue` not empty.
- Prefer deterministic order from `sicht/config/sichtDefinitions.js`: `BW`, then `DEZPV`.
- Return:

```js
{
  ok: true,
  selection: { displayValue: "BW", useValue: "<table use value>" },
  reason: "firstEnabled"
}
```

- If no candidate exists, return `{ ok: false, reason: "noEnabledSichtDefault" }`.
- Do not read DOM.
- Do not read `_KDB.state.tableData` directly.
- Do not read filterDock runtime.

### D4. Commit startup default to Cognos

Create:

```txt
KDB3/js/dashboard/filters/sicht/effects/commitStartupSichtDefault.js
```

Behavior:

1. Do nothing if `_KDB.state.filters.sicht.currentSelection.displayValue` is already non-empty.
2. Do nothing if `_KDB.state.filters.sicht.meta.startupDefaultCommitted === true` or `startupDefaultInProgress === true`.
3. Resolve the startup candidate via `selectStartupSichtDefault`.
4. Resolve the Cognos global filter API for `filterLabel: "Sicht"` using `_KDB.cognosAPI.filters.getAllGlobalFilterItems()` and `filterConfig.itemId` when available.
5. Call `_KDB.cognosAPI.filters.replaceFilterContext(filterApi, [{ d, u }])`.
6. Dispatch the existing confirmed path:

```js
_dispatchInternal({
  type: _actions.SINGLE_SELECT_COMMITTED,
  payload: {
    selection: candidate.selection,
    timestamp: Date.now(),
    historyStep: null,
    isStartupDefault: true
  }
});
```

7. Notify `specialSingleSelect` via the existing `notifySpecialSingleSelect` helper or by reusing `commitConfirmedSicht` with a skip-history option.

Important:

- Do not push `filter_sicht` history for startup default.
- Do not call `_KDB.api.singleSelect.dispatch(...)` to fake a user commit.
- Do not write `_KDB.state.filters.singleSelect`.
- Do not run Dienststelle / hierarchy behavior.
- Do not add events.

Implementation note:

- If reusing `commitConfirmedSicht.js`, extend it with an options/payload guard so `isStartupDefault === true` skips history push but still updates Sicht state and notifies specialSingleSelect.
- Keep every touched JS file <=150 lines. Split focused helpers if needed.

### D5. Trigger startup default after tableData evaluation

Files:

```txt
KDB3/js/dashboard/filters/sicht/createSichtController.js
KDB3/js/dashboard/filters/sicht/effects/evaluateAndStoreSichtOptions.js
```

Required behavior:

- `mount()` evaluates and stores `byOption` as today.
- After `byOption` is available, attempt startup default once.
- `dispatch({ type: "sicht/tableDataChanged" })` or `sicht/syncRequested` may attempt startup default again if the earlier attempt returned no candidate because tableData was not ready.
- Startup default is idempotent:
  - no second Cognos commit after success;
  - no override after user has manually committed a Sicht value;
  - no repeated in-progress commit.

Preferred shape:

- Keep `createSichtController.js` under 150 lines by moving startup work to effects.
- `evaluateAndStoreSichtOptions` may stay pure-ish and only return `byOption`; the controller/effect decides whether to run startup commit.

### D6. Hydrate delegated `singleSelect` Sicht state from public Sicht state

File:

```txt
KDB3/js/dashboard/filters/singleSelect/state/ensureFilterState.js
```

Required narrow change:

- Only for `_handoff.filterType === "sicht"`.
- On first creation of `byScope[filterLabel]`, if `_KDB.api.sicht.getState()` returns a confirmed normal selection:

```js
{
  currentSelection: { displayValue: "BW", useValue: "..." }
}
```

then initialize `singleSelect` state for that filter with that selection instead of `"Alle"`.

- Do not import Sicht internals.
- Do not write `_KDB.state.filters.sicht`.
- Do not change generic `singleSelect` or `specialSingleSelect` defaults.
- If Sicht state is still empty, leave current behavior unchanged; the startup commit path should normally fill it before first open.

Acceptance:

- After startup default success, first opening the Sicht filter shows the committed normal option as pending/current/backup in `singleSelect`, not `"Alle"`.
- `hasAlleOption` remains `false`.

---

## Section E. Boundaries to preserve

Do not:

- modify `filterDock/`;
- modify CSS;
- modify `KDB.js`;
- modify `filterPropId.js` or saved properties;
- modify legacy trees or `TEST/`;
- add events or edit `eventSubscribe.md`;
- add Dienststelle / hierarchy dispatch or state;
- import `singleSelect` internals from `sicht`;
- write `_KDB.state.filters.singleSelect` from `sicht`;
- write `_KDB.state.filters.specialSingleSelect`;
- read `_KDB.state.tableData` directly;
- read `_KDB.runtime.filterDock` from any Sicht file;
- reintroduce legacy `_KDB.state.tablesLoaded`.

This tranche may use `_KDB.cognosAPI.filters.replaceFilterContext(...)` from Sicht only for startup default, because no generic popup user commit exists at dashboard start. The implementation must keep this as a documented narrow startup exception and must not move normal user commits out of `singleSelect`.

---

## Section F. Verification

Static verification:

1. `ReadLints` on all touched files.
2. No `filterDock/` file changed.
3. No CSS changed.
4. No events added.
5. No `_KDB.runtime.filterDock` under `sicht/`.
6. No `_KDB.state.tableData` under `sicht/`.
7. No `KDB_cascadingFilter` change.
8. `singleSelect/state/ensureFilterState.js` changes are gated by `filterType === "sicht"`.
9. All touched JS files <=150 lines.

Manual Cognos smoke:

1. Reload dashboard.
2. Before opening Sicht:
   - `_KDB.state.filters.sicht.currentSelection.displayValue` is `BW` or `DEZPV`.
   - Cognos filter API for Sicht has matching value.
3. First opening Sicht:
   - no hidden `"Alle"` state appears for `singleSelect.byScope.global.Sicht`;
   - committed option wrapper has `.KDB_selectedOption`;
   - option is visually selected and clickable semantics are correct.
4. Re-click selected option does not toggle to empty / Alle.
5. Manual switch `BW <-> DEZPV` still commits through existing `singleSelect` path.
6. `specialSingleSelect/sichtChanged` is dispatched after startup default and after manual confirmed commit.
7. No Dienststelle dispatch is expected.
8. Startup default does not push a history step.

---

## Section G. Reporting template

Executing AI must report:

1. Pre-flight echo.
2. Files created/modified with line counts.
3. Contract sync summary.
4. Startup candidate selection behavior.
5. Cognos commit path used.
6. How history is skipped for startup.
7. How `singleSelect` Sicht hydration is gated.
8. Static verification results.
9. Manual smoke steps still required.
10. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `sicht` startup default selection.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/sicht-startup-default-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Implement only this spec.

Core goals:
- Sicht must not start with hidden `Alle` as the delegated singleSelect state.
- On dashboard startup, choose the first enabled Sicht option from tableData-derived byOption.
- Commit that default to the Cognos Sicht filter.
- Update `_KDB.state.filters.sicht` through the Sicht owner path.
- Notify `specialSingleSelect/sichtChanged`.
- Skip startup history.
- Hydrate `singleSelect` Sicht state from `_KDB.api.sicht.getState()` on first open, gated only to `filterType: "sicht"`.

Hard constraints:
- Do not modify filterDock.
- Do not modify CSS.
- Do not modify KDB.js.
- Do not modify filterPropId or savedProperties.
- Do not modify legacy trees or TEST.
- Do not add events.
- Do not add Dienststelle/hierarchy behavior.
- Do not write `_KDB.state.filters.singleSelect` from Sicht.
- Do not import Sicht internals into singleSelect; use `_KDB.api.sicht.getState()` only.
- Do not read `_KDB.state.tableData` directly.
- Do not read `_KDB.runtime.filterDock` from Sicht.
- Keep touched JS files <=150 lines.

After edits:
- Run lints on touched files.
- Run static forbidden checks from Section F.
- Report using Section G.
```

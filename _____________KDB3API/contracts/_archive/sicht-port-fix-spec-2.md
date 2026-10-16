# Fix Spec 2: `sicht` CP-2 remaining blockers

> Focused fix iteration for the remaining CP-2 blockers after `sicht-port-fix-spec-1.md`.
> Apply only the fixes below. Do not broaden scope.

---

**Status:** `Ready for execution`
**Base contract:** `_____________KDB3API/contracts/sicht.md`
**Base execution spec:** `_____________KDB3API/contracts/sicht-port-execution-spec.md`
**Prior fix spec:** `_____________KDB3API/contracts/sicht-port-fix-spec-1.md`
**Reviewer finding:** CP-2 still not green; three blockers remain.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
2. `_____________KDB3API/.cursor/rules/amd.mdc`
3. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
4. `_____________KDB3API/.cursor/rules/state.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/contracts/sicht.md`
7. `_____________KDB3API/contracts/sicht-port-execution-spec.md`
8. `_____________KDB3API/contracts/sicht-port-fix-spec-1.md`
9. This fix spec.

---

## Section B. Files allowed to modify

Only modify or create files under these paths:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
```

Do not modify `core/config/tables.js`; the approved source tables are already present there.

If a clean fix requires any other file, stop and report before editing it.

---

## Section C. Required fixes

### C1. Fix Sicht value lookup for generic `singleSelect` commit

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
```

Problem:

For `filterLabel: "Sicht"`, `singleSelect` derives `sicht_filter`, but no such table key exists. The approved Sicht option data comes from:

```txt
sicht_bw
sicht_dezpv
```

Each row shape may look like:

```js
rows[0].BW_Loaded.use
rows[0].DEZPV_Loaded.use
```

Required change:

- Add a narrow special-case inside `resolveFilterValueFromTable.js` for `_filterLabel === "Sicht"`.
- Do not modify `resolveFilterOptionsTableKey.js` unless you stop and report first; this is a Sicht-specific lookup, not generic singleSelect table naming.
- For pending label `"BW"`, read table key `sicht_bw`.
- For pending label `"DEZPV"`, read table key `sicht_dezpv`.
- Read rows via existing `tableDataService` path already in `resolveFilterValueFromTable.js`.
- Iterate the first row fields and use the first cell.
- Return selected value:

```js
{
  d: "BW",
  u: <cell.use || cell.u || cell.d || direct scalar>
}
```

and equivalent for `DEZPV`.

- If table/row/cell/use value is missing, return a normal lookup failure (`ok: false`) with an explicit error code such as `sichtOptionValueMissing`.
- Preserve all existing behavior for non-Sicht filters.

Acceptance:

- `resolveFilterValueFromTable(_KDB, "Sicht", "BW")` uses `sicht_bw`, not `sicht_filter`.
- `resolveFilterValueFromTable(_KDB, "Sicht", "DEZPV")` uses `sicht_dezpv`.
- Existing singleSelect option lookup remains unchanged.

Rules to apply:

- `module-public-api.mdc` - tableData reads stay through service methods.
- `state.mdc` - no direct `_KDB.state.tableData` read.
- `feature-structure.mdc` - keep file under 150 lines after change; split only if unavoidable and reported.

### C2. Split `syncSichtOptionAvailability.js` below the hard limit

Current file:

```txt
KDB3/js/dashboard/filters/sicht/effects/syncSichtOptionAvailability.js
```

Problem:

The file was reported at 236 lines, above the `feature-structure.mdc` hard limit.

Required split:

Create focused effect files under `sicht/effects/`:

```txt
resolveSichtPopupMount.js
readSichtOptionLabel.js
applySichtOptionState.js
hideDuplicateSichtOptions.js
syncSichtOptionAvailability.js
```

Responsibilities:

- `resolveSichtPopupMount.js`
  - owner-scoped DOM resolution only;
  - may use cached `_KDB.runtime.sicht.domRefs.popupMount` if attached;
  - may query current filter wrapper using filterDock selector config;
  - may fallback to `.wa-filterDock-filterItemMount`;
  - must not read `_KDB.runtime.filterDock`;
  - stores live refs only in `_KDB.runtime.sicht.domRefs`.

- `readSichtOptionLabel.js`
  - reads the option label from a passed option node using the configured label selector;
  - no state, no runtime writes.

- `hideDuplicateSichtOptions.js`
  - hides duplicate option rows, keeping the selected row where possible;
  - no state writes.

- `applySichtOptionState.js`
  - applies hidden/disabled/classes/aria for one option;
  - hides `"Alle"`;
  - no state writes.

- `syncSichtOptionAvailability.js`
  - orchestrates the above helpers;
  - remains under 150 lines;
  - returns `{ didSync, visibleCount, enabledCount }`.

Acceptance:

- Every new/modified JS file is under 150 lines.
- No live DOM in `_KDB.state`.
- No cross-owner runtime reads.
- `"Alle"` hiding, duplicate prevention and disabled option behavior remain implemented.

Rules to apply:

- `feature-structure.mdc` - focused files, hard line limit.
- `dom.mdc` - DOM mutation in effects, scoped lookups, live refs in runtime.
- `runtime.mdc` - live refs owned by `_KDB.runtime.sicht`.
- `amd.mdc` - helpers at factory scope, one return value per file.

### C3. Split `createSichtController.js` below the hard limit

Current file:

```txt
KDB3/js/dashboard/filters/sicht/createSichtController.js
```

Problem:

The file was reported at 167 lines, above the `feature-structure.mdc` hard limit.

Required split:

Create focused controller-support effects under `sicht/effects/`:

```txt
evaluateAndStoreSichtOptions.js
handleSichtFilterDockHandoff.js
```

Responsibilities:

- `evaluateAndStoreSichtOptions.js`
  - imports `readSichtAvailabilityFromTableData` and `evaluateSichtOptions`;
  - dispatches `SYNC_OPTIONS_EVALUATED` via injected `dispatchInternal`;
  - returns `byOption`;
  - no public API, no DOM.

- `handleSichtFilterDockHandoff.js`
  - imports `mapFilterDockHandoff`, `syncSichtOptionAvailability`, `delegateToSingleSelect`, and `evaluateAndStoreSichtOptions`;
  - maps handoff;
  - dispatches handoff timestamp via injected `dispatchInternal`;
  - syncs popup availability only for popup-ready or visible popup;
  - delegates to `singleSelect`;
  - returns true/false.

Then simplify `createSichtController.js`:

- keep public API methods and disposed guards;
- keep try/catch boundaries;
- call imported support effects;
- final file under 150 lines.

Acceptance:

- `createSichtController.js` final line count <=150.
- Public API remains exactly `{ mount, destroy, dispatch, getState }`.
- `mount`, `destroy`, `dispatch` still have try/catch boundaries.
- Disposed-state discipline unchanged.
- No foreign state writes.

Rules to apply:

- `feature-structure.mdc` - controller stays focused and under hard limit.
- `module-public-api.mdc` - public API shape unchanged.
- `error-handling.mdc` - lifecycle/public boundaries retain try/catch.
- `state.mdc` - owner writes only via reducer.

---

## Section D. Forbidden actions

Do not:

- modify `.cursor/rules/`;
- modify contract templates;
- modify legacy trees;
- modify `TEST/`;
- add events or `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- write foreign state;
- read `_KDB.runtime.filterDock`;
- read `_KDB.state.tableData` directly;
- touch files outside Section B unless you stop and report first.

---

## Section E. Self-verification

Before reporting back, verify:

1. `resolveFilterValueFromTable(_KDB, "Sicht", "BW")` targets `sicht_bw`.
2. `resolveFilterValueFromTable(_KDB, "Sicht", "DEZPV")` targets `sicht_dezpv`.
3. Existing non-Sicht singleSelect lookup behavior is preserved.
4. `syncSichtOptionAvailability.js` <=150 lines.
5. `createSichtController.js` <=150 lines.
6. Every new split file <=150 lines.
7. No `_KDB.runtime.filterDock` read.
8. No direct `_KDB.state.tableData` read.
9. No foreign state write.
10. No lint diagnostics introduced.

---

## Section F. Report template

Final report must include:

1. Pre-flight echo (9 summaries).
2. File checklist with final line counts.
3. Fix confirmation for C1-C3.
4. Self-verification result for E1-E10.
5. Deviations, if any.

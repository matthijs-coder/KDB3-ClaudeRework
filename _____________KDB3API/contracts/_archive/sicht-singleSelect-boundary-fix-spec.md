# Fix Spec: remove Sicht value lookup from `singleSelect`

> Corrective boundary fix after review found Sicht-specific table lookup logic inside `singleSelect/effects/resolveFilterValueFromTable.js`.
> `singleSelect` may keep generic delegated interaction support for `filterType: "sicht"`, but it must not own Sicht semantics such as `BW`, `DEZPV`, `sicht_bw`, `sicht_dezpv`, or `filterLabel === "Sicht"` lookup branches.

---

**Status:** `Ready for execution`
**Date:** 2026-05-25
**Base contracts:**

```txt
_____________KDB3API/contracts/sicht.md
_____________KDB3API/contracts/singleSelect.md
```

Related specs:

```txt
_____________KDB3API/contracts/sicht-port-fix-spec-2.md
_____________KDB3API/contracts/sicht-startup-default-fix-spec.md
```

Correction note:

- `sicht-port-fix-spec-2.md` C1 solved the runtime lookup symptom by adding a `Sicht` special-case in `singleSelect`.
- That fix is now considered architecturally wrong.
- This spec replaces that shape with owner-provided, serializable selected values from `sicht` to `singleSelect`.

---

## Section A. Required pre-flight

Read these files before changing anything and echo a one-sentence summary of each:

1. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/events.mdc`
5. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
6. `_____________KDB3API/.cursor/rules/amd.mdc`
7. `_____________KDB3API/contracts/sicht.md`
8. `_____________KDB3API/contracts/singleSelect.md`
9. `_____________KDB3API/contracts/sicht-singleSelect-boundary-fix-spec.md`

---

## Section B. Scope

Allowed production files:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/delegateToSingleSelect.js
_____________KDB3API/KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
```

Allowed contract sync:

```txt
_____________KDB3API/contracts/sicht.md
```

If another file appears necessary, stop and report before editing it.

---

## Section C. Problem

Current violation:

```js
// singleSelect/effects/resolveFilterValueFromTable.js
function readSichtTableKey(_pendingLabel) {
  return _pendingLabel === "BW" ? "sicht_bw" : (_pendingLabel === "DEZPV" ? "sicht_dezpv" : null);
}
```

and:

```js
if (_filterLabel === "Sicht") {
  return resolveSichtFilterValue(_KDB, _pendingLabel);
}
```

These are Sicht-owned semantics inside `singleSelect`.

Allowed `singleSelect` knowledge:

- `filterType: "sicht"` is allowed as a delegated interaction type.
- `singleSelect` may notify `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })` after a successful delegated commit.
- `singleSelect` may consume a generic owner-provided selected value from the handoff payload.

Forbidden `singleSelect` knowledge:

- `"Sicht"` label special-case for table lookup.
- `BW` / `DEZPV` option semantics.
- `sicht_bw` / `sicht_dezpv` table keys.
- first-row Sicht table-cell interpretation.

---

## Section D. Required Fix

### D1. Sicht provides selected values in the delegated handoff

Files:

```txt
KDB3/js/dashboard/filters/sicht/effects/handleSichtFilterDockHandoff.js
KDB3/js/dashboard/filters/sicht/effects/delegateToSingleSelect.js
```

Required behavior:

- After `byOption = _evaluateAndStoreSichtOptions(...)`, pass `byOption` into `_delegateToSingleSelect(...)`.
- `delegateToSingleSelect` builds a serializable generic map under `filterConfig.selectionValuesByDisplay`.
- The map shape must be generic, not table-specific:

```js
{
  BW: { d: "BW", u: "<useValue from byOption.BW.useValue>" },
  DEZPV: { d: "DEZPV", u: "<useValue from byOption.DEZPV.useValue>" }
}
```

- Only include entries with non-empty `displayValue` and non-empty `useValue`.
- Keep `filterType: "sicht"` and `capabilities.hasAlleOption: false`.
- Do not write `_KDB.state.filters.singleSelect`.
- Do not import `singleSelect` internals.

Implementation note:

- The map lives in `filterConfig` because `singleSelect/effects/mapFilterDockHandoff.js` already preserves `filterConfig`.
- Do not add a new top-level `_KDB` namespace or event.

### D2. `singleSelect` consumes owner-provided values generically

Files:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
KDB3/js/dashboard/filters/singleSelect/effects/resolveFilterValueFromTable.js
```

Required behavior:

- Change the resolver call to pass the handoff context:

```js
_resolveFilterValueFromTable.resolveFilterValueFromTable(
  _KDB,
  _handoffContext.filterLabel,
  nextSelectionLabel,
  _handoffContext
);
```

- Add a generic first step in `resolveFilterValueFromTable`:
  - read `_handoffContext.filterConfig.selectionValuesByDisplay`;
  - if it contains `_pendingLabel` with `{ d, u }`, return `ok: true` with that selected value;
  - use a generic source string such as `"providedSelectionValues"`.

- Keep the existing tableData lookup for normal singleSelect filters.
- Do not special-case `Sicht`.
- Do not special-case `BW` or `DEZPV`.
- Do not reference `sicht_bw` or `sicht_dezpv`.

### D3. Remove all Sicht-specific logic from `singleSelect/effects/resolveFilterValueFromTable.js`

Delete from `singleSelect/effects/resolveFilterValueFromTable.js`:

- `readSichtTableKey`;
- `readSichtUseValue`;
- `readFirstValidSichtUseValue`;
- `resolveSichtFilterValue`;
- `if (_filterLabel === "Sicht") { ... }`.

Acceptance:

- Static search in `singleSelect/` has no `sicht_bw`.
- Static search in `singleSelect/` has no `sicht_dezpv`.
- Static search in `singleSelect/effects/resolveFilterValueFromTable.js` has no `Sicht`, `BW`, or `DEZPV`.
- Existing non-Sicht table lookup behavior remains unchanged.

### D4. Remove debug traces from commit path

File:

```txt
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Remove temporary debug logging such as:

```js
console.log("[sicht.history] singleSelect notifyOwnerCommit", payload);
```

Acceptance:

- No new debug logs are added.
- Real `console.warn` / `console.error` boundaries remain.

### D5. Preserve existing delegated commit behavior

Do not regress:

- `singleSelect` still accepts `filterType: "sicht"` in interaction routing.
- `singleSelect` still performs generic popup sync, pending selection, Cognos `replaceFilterContext`, and close behavior.
- After successful `filterType: "sicht"` commit, `singleSelect` still calls `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })`.
- Generic singleSelect history is still skipped for `filterType: "sicht"`.
- `sicht` still pushes `filter_sicht` history for normal user commits.
- Startup default history remains skipped.

---

## Section E. Boundaries To Preserve

Do not:

- modify `filterDock/`;
- modify CSS;
- modify `KDB.js`;
- modify `filterPropId.js` or saved properties;
- modify legacy trees or `TEST/`;
- add events or edit `eventSubscribe.md`;
- add Dienststelle / hierarchy behavior;
- import `singleSelect` internals from `sicht`;
- import `sicht` internals from `singleSelect`;
- read `_KDB.runtime.filterDock` from `sicht`;
- read `_KDB.state.tableData` directly;
- write `_KDB.state.filters.singleSelect` from `sicht`;
- introduce public API methods on `_KDB.api.sicht` beyond `mount`, `destroy`, `dispatch`, `getState`.

---

## Section F. Verification

Static verification:

1. `ReadLints` on touched files.
2. No `filterDock/` files changed.
3. No CSS changed.
4. No events added.
5. No `singleSelect/` match for `sicht_bw` or `sicht_dezpv`.
6. No `singleSelect/effects/resolveFilterValueFromTable.js` match for `Sicht`, `BW`, or `DEZPV`.
7. `singleSelect/effects/resolveFilterValueFromTable.js` still resolves normal table-backed filters.
8. `sicht/effects/delegateToSingleSelect.js` supplies serializable `filterConfig.selectionValuesByDisplay`.
9. All touched JS files are <=150 lines.
10. `commitConfirmedSelection.js` remains <=150 lines after the resolver signature change and debug-log removal.

Manual smoke:

1. Reload dashboard.
2. Sicht startup default still commits when tableData is ready.
3. First opening Sicht does not initialize hidden `"Alle"`.
4. Manual `BW -> DEZPV` or `DEZPV -> BW` commit succeeds.
5. Cognos Sicht filter receives `{ d, u }` from Sicht-owned byOption values.
6. `sicht/singleSelectCommitted` fires after manual commit.
7. `specialSingleSelect/sichtChanged` fires after confirmed Sicht commit.
8. `filter_sicht` history is pushed for manual commit.
9. No generic singleSelect history is pushed for `filterType: "sicht"`.
10. Normal non-Sicht singleSelect filters still commit through tableData lookup.

---

## Section G. Reporting Template

Executing AI must report:

1. Pre-flight echo.
2. Files modified with final line counts.
3. Exact removed Sicht-specific code from `singleSelect`.
4. New generic owner-provided value shape consumed by `singleSelect`.
5. How Sicht builds `selectionValuesByDisplay`.
6. Static verification results.
7. Manual smoke steps still required.
8. Deviations or blockers.

---

## Executing-AI Prompt

```text
You are the executing AI for `sicht` / `singleSelect` boundary correction.

Project root:
c:\Users\vastenburg\OneDrive - XTENTION INFORMATIONSTECHNOLOGIE G.m.b.H\Desktop\KDB2\REDESIGN 2026.05

Read first:
1. _____________KDB3API/contracts/sicht-singleSelect-boundary-fix-spec.md
2. All Section A files from that spec.

Echo one sentence per file/rule before editing.

Implement only this spec.

Core goals:
- Remove all Sicht-specific table/value lookup logic from `singleSelect/effects/resolveFilterValueFromTable.js`.
- Let `sicht` provide generic `filterConfig.selectionValuesByDisplay` in the delegated handoff.
- Let `singleSelect` consume that generic owner-provided value before falling back to its normal tableData lookup.
- Preserve normal singleSelect table lookup.
- Preserve Sicht delegated commit and owner notification.
- Remove temporary debug logs from the singleSelect commit path.

Hard constraints:
- Do not modify filterDock.
- Do not modify CSS.
- Do not modify KDB.js.
- Do not modify filterPropId or savedProperties.
- Do not modify legacy trees or TEST.
- Do not add events.
- Do not add Dienststelle/hierarchy behavior.
- Do not import singleSelect internals from Sicht.
- Do not import Sicht internals from singleSelect.
- Do not add public methods to _KDB.api.sicht.
- Do not read _KDB.state.tableData directly.
- Keep touched JS files <=150 lines.

After edits:
- Run lints on touched files.
- Run static searches:
  - no `sicht_bw` or `sicht_dezpv` under `singleSelect/`;
  - no `Sicht`, `BW`, or `DEZPV` in `singleSelect/effects/resolveFilterValueFromTable.js`.
- Report using Section G.
```

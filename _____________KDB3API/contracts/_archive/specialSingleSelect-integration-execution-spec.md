# Execution Spec: `specialSingleSelect` integration hooks

> Mini direct-port integration spec for routing existing filterDock / singleSelect hooks to the already-created `specialSingleSelect` module.
> This is not a broad rewrite and not a new feature port.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/specialSingleSelect.md`
**Phase:** `integration hooks`
**Authoring AI:** GPT-5.5, 2026-05-24
**Executing AI:** `<pending>`
**Reviewer:** `<pending>`

---

## Section A. Pre-flight read list

The executing AI must read these files before editing and echo one sentence per file:

1. `_____________KDB3API/contracts/specialSingleSelect.md`
2. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
3. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
4. `_____________KDB3API/.cursor/rules/state.mdc`
5. `_____________KDB3API/.cursor/rules/runtime.mdc`
6. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
7. `_____________KDB3API/.cursor/rules/amd.mdc`
8. `_____________KDB3API/.cursor/rules/dom.mdc`
9. `_____________KDB3API/.cursor/rules/naming.mdc`
10. This execution spec.

---

## Section B. Scope

Allowed production files:

```txt
KDB3/js/dashboard/filters/filterDock/effects/dispatchSingleSelectHandoff.js
KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js
```

Allowed only if the current imports require it after reading the target files:

```txt
KDB3/js/dashboard/filters/singleSelect/config/actions.js
```

Forbidden in this iteration:

- Do not edit `KDB.js`.
- Do not edit CSS or `cssHrefList.js`.
- Do not edit `specialSingleSelect/` unless a syntax-level import name mismatch blocks this integration.
- Do not edit legacy trees.
- Do not add TEST / harness files.
- Do not create events or edit `eventSubscribe.md`.
- Do not create a `sicht` module or parent filters orchestrator in this iteration.

Deferred after this iteration:

- `sicht -> specialSingleSelect/sichtChanged` hook, because no production `sicht` module file exists yet.
- `tableData -> specialSingleSelect/tableDataChanged` refresh hook.
- rights table shape / `tables.js` changes if rights reads remain unknown.

---

## Section C. Integration behavior

### C1. filterDock routing

Current blocker:

`filterDock/effects/dispatchSingleSelectHandoff.js` treats `specialSingleSelect` as supported but dispatches all supported handoffs to `_KDB.api.singleSelect`.

Required behavior:

- If `_handoff.filterType === "specialSingleSelect"`, dispatch to `_KDB.api.specialSingleSelect`.
- If `_handoff.filterType === "singleSelect"`, keep dispatching to `_KDB.api.singleSelect`.
- Use owner-specific action types:
  - state change:
    - `singleSelect/filterDockStateChanged`
    - `specialSingleSelect/filterDockStateChanged`
  - popup ready:
    - `singleSelect/filterDockPopupReady`
    - `specialSingleSelect/filterDockPopupReady`
- If the target API is missing, return `false` without throwing.
- Do not dispatch a `specialSingleSelect` handoff to `singleSelect` directly; `specialSingleSelect` delegates generic behavior after gating/class sync.

### C2. singleSelect user-selection notification

Required behavior:

- After a `singleSelect` commit succeeds for `_handoffContext.filterType === "specialSingleSelect"`, notify `_KDB.api.specialSingleSelect.dispatch`.
- Dispatch action type: `specialSingleSelect/userSelectionCommitted`.
- Payload must be serializable and minimal:

```js
{
  filterId: _handoffContext.filterId,
  filterKey: _handoffContext.filterKey,
  filterLabel: _handoffContext.filterLabel,
  filterScope: _handoffContext.filterScope,
  condition: _handoffContext.condition,
  selection: {
    displayValue: nextConfirmedSelection.displayValue,
    useValue: nextConfirmedSelection.useValue
  },
  observedAt: Date.now()
}
```

- Notify only after `_commitSelectionState.applyConfirmedState(...)` and successful Cognos verification.
- If `_KDB.api.specialSingleSelect` is missing, no-op.
- Do not add events.
- Do not make `singleSelect` interpret rights, Sicht, or special visibility.

---

## Section D. Per-file specs

### `KDB3/js/dashboard/filters/filterDock/effects/dispatchSingleSelectHandoff.js`

- **Role:** owner routing adapter from `filterDock` handoff to filter owner API.
- **Target size:** under 80 lines.
- **Rules to apply:**
  - `module-public-api.mdc` — known owner command uses direct API dispatch.
  - `events.mdc` — do not introduce request-events.
  - `feature-structure.mdc` — keep file small and responsibility-focused.
  - `amd.mdc` — one compact AMD module, one returned controller.
  - `naming.mdc` — clear names; no vague helper names.
- **Implementation notes:**
  - Replace the single `SUPPORTED_FILTER_TYPES` / single API route with an owner route map or equivalent simple branching.
  - Keep `false` return for unsupported or unavailable target APIs.
  - Do not mutate `_handoff`.

### `KDB3/js/dashboard/filters/singleSelect/effects/commitConfirmedSelection.js`

- **Role:** existing generic singleSelect commit effect, with one narrow post-success notification hook.
- **Target size:** must remain under 150 lines.
- **Rules to apply:**
  - `module-public-api.mdc` — notify through `_KDB.api.specialSingleSelect.dispatch`, do not import internals from `specialSingleSelect`.
  - `state.mdc` — do not write `_KDB.state.filters.specialSingleSelect` directly.
  - `error-handling.mdc` — notification is non-critical; if target API is absent, no-op; do not mask the successful singleSelect commit.
  - `feature-structure.mdc` — keep hook tiny; extract a factory-scope helper if needed.
  - `amd.mdc` — helper must be factory-scope, not nested inside `__controller`.
- **Implementation notes:**
  - Add a small factory-scope helper, for example `notifySpecialSingleSelectCommit(_KDB, _handoffContext, _nextConfirmedSelection)`.
  - Call it only after successful commit state application.
  - The helper must not throw for missing `specialSingleSelect` API.
  - Do not add a dependency import unless strictly needed.

### `KDB3/js/dashboard/filters/singleSelect/config/actions.js` (conditional)

- **Role:** action constants for `singleSelect` only.
- **Default:** do not edit.
- **Allowed only if needed:** no expected change; do not add `specialSingleSelect` constants here unless the target file already imports action constants and the executor chooses to reuse a literal-free local map.

---

## Section E. Acceptance criteria

1. `filterDock` dispatches `filterType: "specialSingleSelect"` to `_KDB.api.specialSingleSelect.dispatch`.
2. `filterDock` continues dispatching `filterType: "singleSelect"` to `_KDB.api.singleSelect.dispatch`.
3. `singleSelect` notifies `specialSingleSelect/userSelectionCommitted` after a successful commit for special filters.
4. No rights/Sicht logic is added to `singleSelect`.
5. No popup / OK / Cancel behavior is duplicated in `specialSingleSelect`.
6. No events are added.
7. No file exceeds 150 lines; `dispatchSingleSelectHandoff.js` remains under 80 lines.
8. No internal files from `specialSingleSelect` are imported by `singleSelect`.
9. Lints are clean on touched files.

---

## Section F. Reporting template

The executing AI reports:

1. Pre-flight echo (10 summaries).
2. Files changed and line counts.
3. Exact routing behavior implemented.
4. Confirmation that deferred hooks remain deferred:
   - `sichtChanged`
   - `tableDataChanged`
   - rights table shape / `tables.js`
5. Any deviations or blockers.

---

## Section G. Reviewer handoff

Reviewer checks:

- `dispatchSingleSelectHandoff.js` uses owner-specific APIs and action types.
- `commitConfirmedSelection.js` hook runs only after successful commit.
- No foreign state writes.
- No event catalog change.
- Line limits and lints.

# Execution Spec: `filterDock -> singleSelect` integration

> Focused execution spec for wiring `filterDock` handoffs to the existing `singleSelect` public API.
> Execute only after CP-1 approval of `filterDock-singleSelect-integration-contractdelta.md`.

---

**Status:** `Draft`
**Contracts:** `filterDock.md`, `filterDock-downstream-handoff-contractdelta.md`, `singleSelect.md`, `filterDock-singleSelect-integration-contractdelta.md`
**Phase:** `focused integration tranche`
**Authoring AI:** GPT-5.5, 2026-05-22

---

## Section A. Pre-flight read list

The executing AI must read and echo one sentence per file before editing:

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/contracts/filterDock-singleSelect-integration-contractdelta.md`
12. This execution spec.

---

## Section B. Scope

Default allowed production edits:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
```

Default expected new/modified files:

```txt
filterDock/
  effects/
    resolveFilterInteraction.js
    dispatchSingleSelectHandoff.js
  observation/
    evaluateObservedDockState.js
  state/
    createFilterDockReducer.js
  config/
    actions.js
```

Only if needed for clean separation:

```txt
filterDock/effects/buildSingleSelectHandoff.js
```

Do not modify by default:

```txt
KDB.js
eventSubscribe.md
dashboard/filters/singleSelect/
dashboard/filters/sicht/
dashboard/filters/dienststelle/
TEST/
legacy reference trees
.cursor/rules/
```

If a singleSelect edit appears necessary, stop and report the exact reason before editing.

---

## Section C. Existing integration points

Existing `singleSelect` evidence:

- `createSingleSelectController.js` dispatch accepts:
  - `singleSelect/filterDockStateChanged`
  - `singleSelect/filterDockPopupReady`
- `runSingleSelectInteraction.js` maps handoff payload and defers `specialSingleSelect` when special-rights data is needed.

Therefore the primary task is in `filterDock`: build a complete handoff payload and dispatch it.

---

## Section D. Required behavior

### D1. Enrich handoff payload

`effects/resolveFilterInteraction.js` must return an interaction payload containing:

- `filterId`
- `filterKey`
- `filterLabel`
- `filterType`
- `filterScope`
- `scopeType`
- `scopeId`
- `scope`
- `filterConfig`
- `capabilities`
- `interactionType`
- `isAlleOption`
- `optionLabel`
- `sourceElementSignature`
- `popup`
- `observedAt`

`filterScope` and `scopeType` must both be present. `filterKey` should preserve legacy keying:

```js
filterKey = filterScope + "__" + filterLabel;
```

If current code uses runtime `scope + "__" + filterLabel` for `filterId`, keep `filterId` only if needed for current state, but add `filterKey` for `singleSelect`.

### D2. Alle detection

Detect Alle using:

```js
target.closest('[data-tid="KDB_singleSelect_AlleOption"]')
```

Alle click must produce:

```js
interactionType: "alle",
isAlleOption: true,
optionLabel: "Alle"
```

Normal option click should produce:

```js
interactionType: "option",
isAlleOption: false,
optionLabel: "<visible option label>" | null
```

### D3. Click handoff dispatch

Add a focused `effects/dispatchSingleSelectHandoff.js`.

Role:

- Accept `_KDB`, `handoff`, `actionType`.
- No-op unless `_KDB.api.singleSelect.dispatch` exists.
- No-op unless `handoff.filterType` is `singleSelect` or `specialSingleSelect`.
- Dispatch:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockStateChanged",
  payload: handoff
});
```

Do not emit events.

### D4. Popup-ready dispatch

When `evaluateObservedDockState.js` observes popup readiness:

```js
popup.isVisible === true
popup.hasOptions === true
popup.optionCount > 0
```

build or reuse the latest handoff from `_KDB.state.filters.filterDock.lastInteraction`, merge the latest `popup`, and dispatch:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockPopupReady",
  payload: handoff
});
```

Use `dispatchSingleSelectHandoff.js` with an `actionType` parameter or equivalent focused helper.

Avoid duplicates:

- Store a runtime marker such as `_KDB.runtime.filterDock.lastSingleSelectPopupReadyKey`.
- Key should include `filterKey` and `popup.observedAt`.
- Do not dispatch popup-ready twice for the same key.

### D5. Do not create cross-module runtime coupling

Do not pass:

- DOM nodes;
- events;
- MutationRecords;
- NodeLists;
- `_KDB.runtime.filterDock.domRefs`;
- functions.

`singleSelect` must receive serializable payload only.

---

## Section E. Per-file specifications

### `effects/resolveFilterInteraction.js`

- Add/ensure fields listed in D1.
- Add `isAlleOption` and `interactionType: "alle"`.
- Add `optionLabel` extraction from the clicked option row when available.
- Preserve disabled OK/Cancel no-op behavior.
- Rules: `state.mdc`, `dom.mdc`, `naming.mdc`, `amd.mdc`, `error-handling.mdc`.

### `effects/dispatchSingleSelectHandoff.js`

- New file.
- Full-compact AMD.
- Return one `__controller(_KDB, _handoff, _actionType)` function.
- Map action types:
  - `"stateChanged"` -> `singleSelect/filterDockStateChanged`
  - `"popupReady"` -> `singleSelect/filterDockPopupReady`
- No-op and return `false` if API missing or filter type unsupported.
- Return `true` when dispatch is called.
- Rules: `module-public-api.mdc`, `events.mdc` (direct API, no events), `state.mdc` (serializable payload), `amd.mdc`, `naming.mdc`.

### `effects/bindDockClickListener.js`

- Import `dispatchSingleSelectHandoff.js`.
- After owner `_dispatch({ type: CLICK_OBSERVED ... })`, call dispatch helper with `"stateChanged"`.
- Do not call helper before filterDock state dispatch/logging.
- Rules: `runtime.mdc`, `error-handling.mdc`, `module-public-api.mdc`.

### `observation/evaluateObservedDockState.js`

- Import `dispatchSingleSelectHandoff.js` if needed.
- After `POPUP_OBSERVED` owner dispatch, if popup ready, build handoff from latest `lastInteraction` + popup.
- Dispatch popup-ready to singleSelect using helper.
- Deduplicate via runtime marker.
- Rules: `runtime.mdc`, `state.mdc`, `module-public-api.mdc`, `error-handling.mdc`.

### `state/createFilterDockReducer.js`

- Only modify if needed to preserve new handoff fields in `lastInteraction` / `lastClickedFilter`.
- Reducer must keep parallel slices and no runtime objects in state.

### `config/actions.js`

- Modify only if a new owner-internal action is needed. Prefer not to add one if existing `CLICK_OBSERVED` and `POPUP_OBSERVED` suffice.

---

## Section F. Acceptance criteria

1. `ReadLints` clean for all touched files.
2. No files outside `filterDock/` modified unless the executing AI stopped and received explicit approval.
3. No `events/`, no events emitted, no `eventSubscribe.md`.
4. No `KDB.js` change.
5. No `sicht` or `dienststelle` calls.
6. Normal `singleSelect` handoff dispatch occurs after click.
7. Popup-ready dispatch occurs only when `popup.isVisible && popup.hasOptions && popup.optionCount > 0`.
8. Popup-ready dispatch is not duplicated for the same filter/popup observation key.
9. Payload includes all D1 fields.
10. Alle produces `interactionType: "alle"` and `isAlleOption: true`.
11. Payload contains no runtime/DOM objects.
12. Static AMD imports resolve.

---

## Section G. Smoke check

Manual smoke target:

1. Click a normal singleSelect filter, e.g. Geschlecht.
2. Confirm `[filterDock.click]` appears.
3. Confirm:

```js
window.top.getKDB().api.singleSelect.getState().lastInteraction
```

is updated.

If it stays `undefined` while `[filterDock.click]` logs, the direct API dispatch is still missing or the filter type/payload is not accepted by `singleSelect`.

---

## Section H. Reporting

Return:

1. Files changed/created with line counts.
2. Exact dispatch paths added.
3. Payload shape confirmation.
4. Acceptance criteria F1-F12 pass/fail.
5. Deferred items, especially specialSingleSelect and live OK/Cancel owner methods.

# Execution Spec: `specialSingleSelect` payload and canonical key alignment

> Mini direct-port fix spec for aligning runtime handoff payloads with canonical `specialSingleSelect` state keys.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/specialSingleSelect.md`
**Contract delta:** `_____________KDB3API/contracts/specialSingleSelect-payload-key-contractdelta.md`
**Phase:** `payload/key fix`
**Authoring AI:** GPT-5.5, 2026-05-24
**Executing AI:** `<pending>`
**Reviewer:** `<pending>`

---

## Section A. Pre-flight read list

The executing AI must read these files before editing and echo one sentence per file:

1. `_____________KDB3API/contracts/specialSingleSelect.md`
2. `_____________KDB3API/contracts/specialSingleSelect-payload-key-contractdelta.md`
3. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/state.mdc`
6. `_____________KDB3API/.cursor/rules/runtime.mdc`
7. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
8. `_____________KDB3API/.cursor/rules/amd.mdc`
9. `_____________KDB3API/.cursor/rules/naming.mdc`
10. This execution spec.

---

## Section B. Scope

Allowed production files:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/config/specialFilterDefinitions.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/mapFilterDockHandoff.js
KDB3/js/dashboard/filters/specialSingleSelect/effects/runSpecialSingleSelectSync.js
KDB3/js/dashboard/filters/specialSingleSelect/state/createSpecialSingleSelectReducer.js
```

Allowed new file:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/config/resolveSpecialFilterId.js
```

Forbidden in this iteration:

- Do not edit `filterDock/`.
- Do not edit `singleSelect/`.
- Do not edit `KDB.js`.
- Do not edit CSS or `cssHrefList.js`.
- Do not edit `tables.js`.
- Do not edit legacy trees.
- Do not add events or edit `eventSubscribe.md`.
- Do not add `TEST/` or harness files.

---

## Section C. Required behavior

### C1. Canonical key resolver

Create `config/resolveSpecialFilterId.js`.

Behavior:

- Inputs: `_definitions`, `_payload`.
- Return the canonical config id (`personengruppe` or `dienststellenleitung`) or `null`.
- Match order:
  1. `payload.filterId` if it is already a key in definitions.
  2. `payload.condition` against `definition.condition`, case-insensitive.
  3. `payload.filterLabel` against `definition.filterLabel`, case-insensitive.
- Do not inspect DOM.
- Do not import from `filterDock` or `singleSelect`.
- Keep under 80 lines.

Rules to apply:

- `state.mdc` — state keys come from owner config, not runtime labels.
- `module-public-api.mdc` — no internal imports from other modules.
- `feature-structure.mdc` — config utility belongs under module `config/`.
- `amd.mdc` — one compact AMD module.
- `naming.mdc` — English names, boundary underscore prefix.

### C2. Normalize filterDock handoff

Update `effects/mapFilterDockHandoff.js`.

Behavior:

- Import `specialFilterDefinitions` and `resolveSpecialFilterId`.
- Preserve raw runtime id as `runtimeFilterId`.
- Set `filterId` to the canonical config id.
- Preserve `filterKey` from raw payload, or fallback to runtime id / scope+label.
- If canonical id cannot be resolved, return `null`.
- Keep returned object serializable.

Also fix any current typo / undefined variable in the handoff path if present in `runSpecialSingleSelectSync.js`; the guard must use `mappedHandoff`, not an undefined name.

Rules to apply:

- `state.mdc` — reducer inputs must use canonical owner keys.
- `feature-structure.mdc` — keep mapping small and focused.
- `amd.mdc` — imports <= 6 preferred.

### C3. Normalize userSelectionCommitted before reducer

Update the `USER_SELECTION_COMMITTED` path.

Preferred location:

- `effects/runSpecialSingleSelectSync.js` in `routeAction`, before `dispatchInternal`.

Behavior:

- For `_actions.USER_SELECTION_COMMITTED`, normalize payload to canonical reducer shape:

```js
{
  filterId: "dienststellenleitung",
  runtimeFilterId: payload.filterId,
  filterKey: payload.filterKey,
  filterLabel: payload.filterLabel,
  filterScope: payload.filterScope,
  condition: payload.condition,
  displayValue: payload.selection && payload.selection.displayValue,
  useValue: payload.selection && payload.selection.useValue,
  observedAt: payload.observedAt
}
```

- If `selection` is missing but flat `displayValue` / `useValue` exist, accept those too.
- If canonical id cannot be resolved, do not dispatch the reducer write.
- Do not create new keys from runtime ids.

Rules to apply:

- `state.mdc` — one canonical writer and stable keys.
- `error-handling.mdc` — no throw for missing optional integration payload; no-op is acceptable.
- `module-public-api.mdc` — input comes through public dispatch.

### C4. Reducer remains simple

Update `state/createSpecialSingleSelectReducer.js` only if needed after C3.

Behavior:

- Reducer reads canonical `payload.filterId`.
- Reducer reads flat `payload.displayValue` / `payload.useValue`.
- Reducer may store optional `runtimeFilterId`, `filterKey`, `filterLabel`, `filterScope`, `condition`, `observedAt` if already part of the patch shape, but must not parse nested `selection`.
- If `payload.filterId` is missing, return state unchanged.

Rules to apply:

- `state.mdc` — reducer is pure, no side effects.
- `feature-structure.mdc` — keep reducer small.
- `amd.mdc` — no nested helper definitions.

---

## Section D. Acceptance criteria

1. `specialSingleSelect/userSelectionCommitted` with raw `filterId: "global__Dienststellenleitung"` updates `byFilterId.dienststellenleitung`.
2. No `byFilterId["global__Dienststellenleitung"]` entry is created.
3. Nested `selection.displayValue` / `selection.useValue` are stored as `lastAppliedDisplayValue` / `lastAppliedUseValue`.
4. Raw `filterId` is preserved as metadata (`runtimeFilterId`) when useful, not used as state key.
5. `mapFilterDockHandoff` returns canonical `filterId` and runtime metadata, or `null` for unknown special filters.
6. Unknown condition/label payloads no-op without throwing.
7. No edits outside allowed scope.
8. All touched files are under 150 lines.
9. Lints are clean on touched files.

---

## Section E. Reporting template

The executing AI reports:

1. Pre-flight echo (10 summaries).
2. Files changed and line counts.
3. How canonical id resolution works.
4. Confirmation that runtime ids no longer create `byFilterId` entries.
5. Confirmation that deferred items remain deferred:
   - `sichtChanged` hook
   - `tableDataChanged` hook
   - `tables.js` rights-shape
   - dashboard E2E smoke
6. Deviations or blockers.

---

## Section F. Reviewer handoff

Reviewer checks:

- Resolver uses only module config and payload fields.
- Reducer never creates runtime-id state keys.
- No internal imports from `singleSelect` or `filterDock`.
- No foreign state writes.
- Line limits and lints.

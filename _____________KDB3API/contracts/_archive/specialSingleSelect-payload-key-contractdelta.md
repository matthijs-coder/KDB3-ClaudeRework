# Contract Delta: `specialSingleSelect` payload and canonical key alignment

> CP-1 delta for resolving the runtime `filterId` vs canonical `filterId` mismatch found after the integration mini-tranche smoke.

---

**Status:** `Draft`
**Base contract:** `_____________KDB3API/contracts/specialSingleSelect.md`
**Owner module / service:** `specialSingleSelect`
**Type:** `dashboard/filters feature module`
**Authoring AI:** GPT-5.5, 2026-05-24
**Reviewed by:** `<pending>`

---

## 1. Decision

The canonical state keys for `_KDB.state.filters.specialSingleSelect.byFilterId` remain:

```txt
personengruppe
dienststellenleitung
```

Runtime identities from `filterDock` and `singleSelect`, such as:

```txt
global__Personengruppe
global__Dienststellenleitung
pageContext__Personengruppe
```

are not canonical state keys. They are handoff/runtime identifiers only and must not create additional entries under `byFilterId`.

## 2. Rationale

The module-local config uses stable ids (`personengruppe`, `dienststellenleitung`) so casing and legacy naming differences do not leak into state ownership. Smoke showed that routing payloads can contain runtime `filterId` values built from scope + label. If reducers merge by raw runtime `filterId`, the state can split into duplicate keys and visibility/selection state becomes inconsistent.

## 3. Canonical Resolution Rule

Every inbound payload that can update per-filter state must be normalized inside `specialSingleSelect` before it reaches the reducer.

Resolution order:

1. If `payload.filterId` is already a known config id, use it.
2. Else match `payload.condition` case-insensitively against `specialFilterDefinitions[filterId].condition`.
3. Else match `payload.filterLabel` case-insensitively against `specialFilterDefinitions[filterId].filterLabel`.
4. Else, no state write occurs; report or no-op according to the calling boundary.

The resolver lives under `specialSingleSelect`, for example:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/config/resolveSpecialFilterId.js
```

or as a small export next to `specialFilterDefinitions.js`. It must not inspect DOM text and must not import from `filterDock` or `singleSelect` internals.

## 4. Payload Shape

`specialSingleSelect/userSelectionCommitted` may keep the nested selection payload from the integration spec:

```js
{
  filterId: "global__Dienststellenleitung",
  filterKey: "global__Dienststellenleitung",
  filterLabel: "Dienststellenleitung",
  filterScope: "global",
  condition: "Dienststellenleitung",
  selection: {
    displayValue: "DST_LTNG",
    useValue: "[...]"
  },
  observedAt: 0
}
```

Before reducer write, `specialSingleSelect` normalizes it to:

```js
{
  filterId: "dienststellenleitung",
  runtimeFilterId: "global__Dienststellenleitung",
  filterKey: "global__Dienststellenleitung",
  filterLabel: "Dienststellenleitung",
  filterScope: "global",
  condition: "Dienststellenleitung",
  displayValue: "DST_LTNG",
  useValue: "[...]",
  observedAt: 0
}
```

The reducer reads only canonical `filterId`, `displayValue`, `useValue`, and optional metadata fields. It does not parse nested payloads.

## 5. State Patch Rule

For `USER_SELECTION_COMMITTED`, update only the existing canonical entry:

```js
_KDB.state.filters.specialSingleSelect.byFilterId.dienststellenleitung
```

Do not create:

```js
_KDB.state.filters.specialSingleSelect.byFilterId["global__Dienststellenleitung"]
```

If canonical resolution fails, skip the per-filter write and avoid inventing a new state key.

## 6. Handoff Rule

`filterDock` handoffs remain runtime payloads. `specialSingleSelect/effects/mapFilterDockHandoff.js` may keep both:

- `runtimeFilterId` from raw `handoff.filterId`;
- canonical `filterId` resolved from condition/label/config.

Downstream gating and reducer writes use canonical `filterId`. Delegation to `_KDB.api.singleSelect` may pass through the runtime `filterId` / `filterKey` required by generic `singleSelect`.

## 7. Acceptance

This delta is accepted when:

1. `USER_SELECTION_COMMITTED` for `global__Dienststellenleitung` updates `byFilterId.dienststellenleitung`.
2. No new `byFilterId.global__Dienststellenleitung` key appears.
3. `lastAppliedDisplayValue` and `lastAppliedUseValue` are populated from nested `selection`.
4. Existing config ids continue to work for direct actions.
5. Unknown conditions / labels do not create state keys.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 delta pending. |

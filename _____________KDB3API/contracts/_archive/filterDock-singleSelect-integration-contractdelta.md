# filterDock -> singleSelect integration contractdelta

**Status:** Draft for CP-1 review.  
**Date:** 2026-05-22  
**Relation:** Refines `filterDock.md`, `filterDock-downstream-handoff-contractdelta.md`, and `singleSelect.md` for the first direct API handoff from `filterDock` to `singleSelect`.

---

## 1. Purpose

This tranche wires the already-ported `filterDock` observation layer to the already-ported `singleSelect` owner module.

Goal:

- `filterDock` continues to own dock click + dock observer state.
- `singleSelect` continues to own single-select state, popup mutation behavior, pending/backup/current selections and Cognos effects.
- `filterDock` dispatches serializable handoff payloads to `_KDB.api.singleSelect.dispatch(...)`.

This is an integration tranche, not a pure direct port.

## 2. Approved Scope

Allowed production target:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
```

Minimal `singleSelect` production edits are allowed only if static inspection proves the existing public API cannot consume the handoff. Current evidence shows `singleSelect` already accepts:

```js
singleSelect/filterDockStateChanged
singleSelect/filterDockPopupReady
```

Default implementation should therefore touch `filterDock` only.

Out of scope:

- `sicht` and `dienststelle` handoff wiring.
- `specialSingleSelect` behavior execution beyond preserving payload fields and letting `singleSelect` defer it.
- Events and `eventSubscribe.md`.
- Cross-module runtime reads from `_KDB.runtime.filterDock`.
- New dock-level listeners or long-lived dock observers in `singleSelect`.
- Filter value behavior changes outside what existing `singleSelect` owner logic already does.

## 3. Handoff Routes

### Click route

After `filterDock` creates and stores a handoff with `filterType === "singleSelect"` or `filterType === "specialSingleSelect"`, it dispatches:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockStateChanged",
  payload: handoff
});
```

### Popup-ready route

When the observer sees the same active filter popup is ready:

```js
popup.isVisible === true
popup.hasOptions === true
popup.optionCount > 0
```

`filterDock` dispatches:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockPopupReady",
  payload: handoff
});
```

`hasOkButton` / `hasCancelButton` are included but are not required for option-label and Alle-option preparation.

## 4. Handoff Payload

The dispatched payload must be serializable and follow `filterDock-downstream-handoff-contractdelta.md`.

Required fields for this tranche:

```js
{
  filterId: string,
  filterKey: string,
  filterLabel: string,
  filterType: "singleSelect" | "specialSingleSelect",
  filterScope: "global" | "pageContext",
  scopeType: "global" | "pageContext",
  scopeId: string,
  scope: string,
  filterConfig: object | null,
  capabilities: {
    isUpstream: boolean,
    isDownstream: boolean,
    isHierarchy: boolean,
    isSingleSelect: boolean,
    hasAlleOption: boolean,
    condition: string | null
  },
  interactionType: "open" | "option" | "alle" | "confirm" | "cancel" | "clear" | "close" | "unknown",
  isAlleOption: boolean,
  optionLabel: string | null,
  sourceElementSignature: string,
  popup: {
    isVisible: boolean,
    activeFilterId: string | null,
    activeFilterType: string | null,
    hasOptions: boolean,
    optionCount: number,
    hasOkButton: boolean,
    hasCancelButton: boolean,
    observedAt: number
  },
  observedAt: number
}
```

Do not include DOM nodes, events, MutationRecords, NodeLists, jQuery objects, functions, timers, observers, AbortControllers, or Promises.

## 5. Alle And Option Label

`filterDock` must distinguish Alle from normal options:

```txt
clickTarget.closest('[data-tid="KDB_singleSelect_AlleOption"]')
```

Alle click:

```js
interactionType: "alle",
isAlleOption: true,
optionLabel: "Alle"
```

Normal option click:

```js
interactionType: "option",
isAlleOption: false,
optionLabel: "<visible option label>" // when readable, else null
```

Downstream modules must not parse `sourceElementSignature` to recover Alle when `isAlleOption` is present.

## 6. Owner Mapping

Only these filter types dispatch to `singleSelect` in this tranche:

| `filterType` | Dispatch? | Notes |
|---|---:|---|
| `singleSelect` | yes | Primary smoke target, e.g. Geschlecht. |
| `specialSingleSelect` | yes | Existing `singleSelect` may defer with warning; behavior remains deferred. |
| `sicht` | no | Future tranche. |
| `dienststelle` | no | Future tranche. |
| `unknown` | no | No-op. |

## 7. Idempotency And Duplicate Dispatch

`filterDock` should avoid repeated popup-ready dispatches for the same filter/popup observation batch.

Minimum rule:

- Store a serializable/runtime-local marker for the last popup-ready dispatch key, e.g. `filterKey + ":" + popup.observedAt`.
- Do not dispatch `singleSelect/filterDockPopupReady` twice for the same key.
- Reset naturally when a new click changes `lastClickedFilter` or popup `observedAt` changes.

The marker may live in `_KDB.runtime.filterDock` because it is runtime coordination, not durable state.

## 8. DOM Actions

This tranche does not solve OK/Cancel live DOM actions beyond what the current `singleSelect` owner already supports through mount options.

Rules:

- `singleSelect` must not read `_KDB.runtime.filterDock.domRefs`.
- If a missing live DOM action blocks real confirm/cancel behavior, stop and report the need for a later narrow `filterDock` owner method, such as `clickOriginalButton`.
- Do not add such owner method unless explicitly approved in this integration CP-1.

## 9. Acceptance Criteria

1. Clicking a normal singleSelect filter causes `filterDock` to log `[filterDock.click]`.
2. The same click dispatches `singleSelect/filterDockStateChanged` to `_KDB.api.singleSelect`.
3. When the popup is ready (`isVisible && hasOptions && optionCount > 0`), `filterDock` dispatches `singleSelect/filterDockPopupReady`.
4. `window.top.getKDB().api.singleSelect.getState().lastInteraction` updates after the handoff.
5. Payload includes `filterKey`, `filterScope`, `scopeType`, `scopeId`, `scope`, `filterConfig`, `capabilities`, `isAlleOption`, and `optionLabel`.
6. `singleSelect`, `sicht`, `dienststelle`, `KDB.js`, and `eventSubscribe.md` are not modified unless CP-1 explicitly expands scope.
7. No events are emitted.
8. No runtime objects appear in payload or `_KDB.state`.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | Integration CP-1 pending. |

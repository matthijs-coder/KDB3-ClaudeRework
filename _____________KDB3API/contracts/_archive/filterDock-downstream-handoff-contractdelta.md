# filterDock — downstream handoff contractdelta

**Status:** Draft — synced with `filterDock.md` integration phase (2026-05-26).  
**Date:** 2026-05-22 (original); 2026-05-26 (integration sync)  
**Relation:** Appendix to `filterDock.md`. Describes the implemented handoff contract from `filterDock` to filter-owner modules. Does not modify production code by itself.

---

## 1. Purpose

This delta defines the handoff contract from `filterDock` to filter-owner modules.

`filterDock` is the central dock observation and routing owner:

- one dock-level click listener;
- one long-lived dock `MutationObserver`;
- serializable observed state under `_KDB.state.filters.filterDock`;
- live DOM refs only under `_KDB.runtime.filterDock.domRefs`;
- direct owner dispatch on click and popup-ready for supported filter types.

`singleSelect`, `specialSingleSelect`, and `sicht` consume filterDock handoffs through their public APIs. They do not add their own dock-level click listener or long-lived dock observer.

---

## 2. Handoff Trigger Model

The handoff model has two phases (both implemented):

1. **Click observed** — `filterDock` creates a serializable interaction object, stores it in `lastInteraction` / `lastClickedFilter`, and dispatches a click handoff to the known owner when `filterType` is supported.
2. **Popup readiness observed** — the dock observer evaluates popup readiness (`hasOptions`, `optionCount`, `hasOkButton`, `hasCancelButton`) and, when criteria are met, dispatches a popup-ready handoff (Route B).

Owner modules may use click dispatch alone or wait for popup-ready depending on their needs. Option injection and label normalization typically require popup-ready (`popup.hasOptions === true`, `popup.optionCount > 0`).

Confirm/cancel handling additionally checks the relevant button presence:

```js
popup.hasOkButton === true
// or
popup.hasCancelButton === true
```

---

## 3. Downstream Handoff Shape

The canonical downstream payload is a serializable object. It must not contain DOM nodes, events, MutationRecords, jQuery objects, functions, timers, observers, AbortControllers, or Promises.

```js
{
  filterId: "global__Personengruppe",
  filterKey: "global__Personengruppe",
  filterLabel: "Personengruppe",
  filterType: "singleSelect" | "specialSingleSelect" | "sicht" | "dienststelle" | "unknown",
  filterScope: "global" | "pageContext",
  scopeType: "global" | "pageContext",
  scopeId: "global" | "<tabId>" | "unknown",
  scope: "global" | "<tabId>" | "unknown",
  filterConfig: {
    // JSON-serializable config read from _KDB.properties.filterPropObj
  },
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

Field aliases are intentional for bridge safety:

- `filterScope` and `scopeType` carry the legacy bucket (`global` / `pageContext`).
- `scopeId` and `scope` carry the runtime tab/global key.
- `filterId` uses runtime scope (`scope + "__" + filterLabel`); `filterKey` uses DOM bucket scope (`filterScope + "__" + filterLabel`). They may differ on `pageContext`.

`singleSelect` may continue legacy state keying with:

```txt
byScope[filterScope][filterLabel]
```

It must not be forced to key by tab id unless its own contract approves that behavior change.

---

## 4. Alle Option

Legacy `singleSelect` distinguishes a custom Alle option from normal option clicks.

The handoff payload must support this explicitly:

```js
interactionType: "alle",
isAlleOption: true
```

Detection rule:

```txt
clickTarget.closest('[data-tid="KDB_singleSelect_AlleOption"]')
```

If the interaction is not an Alle option:

```js
isAlleOption: false
```

`sourceElementSignature` may include the `data-tid`, but downstream modules must not rely on parsing the signature when `isAlleOption` is available.

Runtime Alle/right semantics remain with `specialSingleSelect`; `filterDock` exposes config-only `hasAlleOption` in capabilities.

---

## 5. Live DOM Boundary

Cross-module reads from `_KDB.runtime.filterDock` remain forbidden by default.

Therefore owner modules must not directly read:

```js
_KDB.runtime.filterDock.domRefs
```

Allowed integration pattern — serializable owner dispatch (implemented):

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockStateChanged",
  payload: handoff
});

_KDB.api.specialSingleSelect.dispatch({
  type: "specialSingleSelect/filterDockStateChanged",
  payload: handoff
});

_KDB.api.sicht.dispatch({
  type: "sicht/filterDockStateChanged",
  payload: handoff
});
```

Popup-ready equivalents:

```js
_KDB.api.singleSelect.dispatch({ type: "singleSelect/filterDockPopupReady", payload: handoff });
_KDB.api.specialSingleSelect.dispatch({ type: "specialSingleSelect/filterDockPopupReady", payload: handoff });
_KDB.api.sicht.dispatch({ type: "sicht/filterDockPopupReady", payload: handoff });
```

Routing is implemented in `effects/dispatchSingleSelectHandoff.js` (deferred rename to `dispatchFilterHandoff.js`).

### If DOM action is unavoidable

If a filter owner needs a live Cognos DOM action that cannot be represented by the serializable payload, do not let the owner read `filterDock.runtime`.

Instead, add a narrow `filterDock` owner method in a later approved contract delta, for example:

```js
_KDB.api.filterDock.clickOriginalButton({
  filterId: handoff.filterId,
  buttonTid: "okClickable"
});
```

That method would execute inside `filterDock`, using its own runtime refs, and return a boolean. It is not implemented by this delta.

---

## 6. Popup Ready Route

**Route B is implemented:** `filterDock` dispatches a second direct API action when the observer sees the popup is ready (`observation/dispatchPopupReadyHandoff.js`).

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockPopupReady",
  payload: handoff
});
```

Equivalent routes exist for `specialSingleSelect` and `sicht`.

Route A (owner pulls snapshot after click dispatch only) is not the canonical production path.

---

## 7. Owner Mapping

Current direct API targets (matches production route map):

| `filterType` | Target API | Notes |
|---|---|---|
| `singleSelect` | `_KDB.api.singleSelect` | Normal single-select filters. |
| `specialSingleSelect` | `_KDB.api.specialSingleSelect` | Separate owner; special rights / Alle behavior is owner logic. |
| `sicht` | `_KDB.api.sicht` | Cascading / upstream Sicht behavior. |
| `dienststelle` | none | No dispatch until `_KDB.api.dienststelle` exists and is approved. |
| `unknown` | none | No owner dispatch. |

Events remain deferred. Direct API is canonical because the owner is known.

---

## 8. Classification vs Dispatch Proof

- `_KDB.api.filterDock.getState().lastInteraction` proves filterDock classification only.
- Downstream dispatch proof requires monkey-patching the target owner API (see `filterDock.md` §9.1).
- Production code does not require unconditional `console.log` for click discovery.

---

## 9. Out Of Scope

This delta does not:

- modify production code in a contract-sync tranche;
- modify owner modules (`singleSelect`, `specialSingleSelect`, `sicht`, `dienststelle`);
- introduce events or update `eventSubscribe.md`;
- allow cross-module runtime reads;
- activate Dienststelle dispatch;
- rename `dispatchSingleSelectHandoff.js` (deferred naming tranche);
- move filter value application, Cognos updates, or history commits into `filterDock`.

---

## 10. Planner Notes For Owner Modules

Owner planners should assume:

- `filterDock` is the source of dock click and popup readiness facts and routes handoffs to known owners.
- Each owner owns its own state, pending/backup selection, option injection, label normalization, confirm/cancel behavior, and Cognos/value effects.
- Owners consume dispatch actions such as:

```js
singleSelect/filterDockStateChanged
singleSelect/filterDockPopupReady
specialSingleSelect/filterDockStateChanged
specialSingleSelect/filterDockPopupReady
sicht/filterDockStateChanged
sicht/filterDockPopupReady
```

- Owners should not add a dock-level click listener or a long-lived dock observer.
- If an owner needs a DOM-only action, it should request a narrow `filterDock` owner method rather than reading `_KDB.runtime.filterDock`.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-26 | `Draft` (integration sync) | — | Aligned with current router + popup-ready production; `specialSingleSelect` → `_KDB.api.specialSingleSelect`; Route B implemented; visibility policy synced. |
| `<pending>` | `Draft -> Approved` | `<pending>` | Handoff delta pending. |

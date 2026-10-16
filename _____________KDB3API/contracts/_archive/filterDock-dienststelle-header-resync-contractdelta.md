# Contract Delta: filterDock -> dienststelle header resync

**Status:** Draft for user approval
**Date:** 2026-06-04
**Owner modules:** `filterDock`, `dienststelle`
**Base contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/dienststelle.md
```

---

## 1. Purpose

This delta approves a narrow, early `filterDock` observer notification for Dienststelle header-name resync after Cognos replaces or mutates filter dock DOM nodes after startup.

The goal is to remove short-lived user-visible host names such as `Dienststelle_BW` or `Dienststelle_DEZPV` after the dashboard is already running. Startup ordering and wrapper visibility remain separate implementation concerns.

## 2. Ownership Decision

`filterDock` remains the neutral dock observer and owner router. It may detect coalesced dock `childList` / already-approved attribute mutation signals and dispatch a serializable notification to known owner modules that opt in.

`dienststelle` remains the only owner of the display transform from technical host identity to user-facing header text. `filterDock` must not implement or duplicate the `Dienststelle_* -> Dienststelle` string rule.

## 3. Approved Route

Add one route-map capability for the `dienststelle` owner:

```js
dienststelle: {
  apiKey: "dienststelle",
  actionTypes: {
    stateChanged: "dienststelle/filterDockStateChanged",
    popupReady: "dienststelle/filterDockPopupReady",
    filtersReady: "dienststelle/filterDockFiltersReady",
    headerObserved: "dienststelle/filterDockHeaderObserved"
  },
  needsFilterDockFiltersReady: true,
  needsPopupDisplayResync: true,
  needsFilterDockHeaderResync: true
}
```

`needsFilterDockHeaderResync` means: this owner wants an early, coalesced notification when the long-lived dock observer sees relevant dock structure or approved attribute changes before or after the initial `filtersReady` gate.

## 4. Action Contract

`filterDock` dispatches:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/filterDockHeaderObserved",
  payload: {
    source: "filterDockHeaderObserved",
    observedAt: number,
    addedCount: number,
    removedCount: number,
    attributeCount: number,
    filterWrapperCount: number
  }
});
```

Payload rules:

- Payload is JSON-serializable.
- Payload contains no DOM nodes, jQuery objects, MutationRecord objects, callbacks, or live runtime refs.
- Payload does not include transformed display labels.
- Payload does not include owner-private Dienststelle state.
- `filterWrapperCount` is the current count observed by `filterDock`; it is a hint, not a guarantee that every Dienststelle wrapper exists.

## 5. Observer Scope

This delta deliberately chooses the conservative observer scope:

- Use existing dock observer `childList`, `subtree`, and approved attribute signals.
- Do not enable `characterData`.
- Do not add `title` to the dock observer attribute filter for this tranche.
- Do not create a Dienststelle-owned `MutationObserver`.
- Do not add a second dock-level observer for header labels.

Reason: Cognos is expected to replace header/text nodes rather than mutate text nodes in place, and the cheaper child-list / existing attribute path should cover the target issue without increasing observer noise.

If later production evidence proves Cognos only mutates existing text nodes, stop and request a new contract decision before enabling `characterData` or observing `title`.

## 6. Feedback-Loop Guard

The notification must avoid re-dispatching solely because Dienststelle applied its own visibility or ready classes.

Implementation must exclude or ignore KDB-owned mutation targets/classes including, at minimum:

```txt
KDB_dienststelle
KDB_dienststelle_active
KDB_dienststelleActive_BW
KDB_dienststelleActive_DEZPV
KDB_dienststelle_popupLabelsReady
```

The dispatch must be coalesced with the existing filterDock observed-state scheduling discipline. No owner dispatch may run directly inside the raw `MutationObserver` callback.

## 7. Dienststelle Handling

`dienststelle/filterDockHeaderObserved` is a narrow lifecycle action.

On this action, Dienststelle may run only its existing idempotent header-name sync, equivalent in behavior to the header portion of `dienststelle/filterDockFiltersReady`:

- call the Dienststelle-owned header-name sync across supported global and pageContext buckets;
- write only approved `.wa-filterDock-filterName` `textContent` and `title`;
- never mutate `[data-id]`, `activeFilterKey`, `filterId`, `filterKey`, Cognos lookup identity, selection values, history snapshots, or filterDock state;
- perform no reconcile, no Sicht sync, no widget downstream effects, and no popup option sanitizing from this action.

Repeated notifications are acceptable. The Dienststelle sync must remain idempotent and safe when wrappers are missing.

## 8. Contract Matrix

| Concern | Decision |
|---|---|
| Startup label sync | Out of scope for this delta; existing startup paths may remain. |
| Post-startup Cognos header replacement | Covered by early filterDock observer notification. |
| Observer owner | `filterDock`. |
| Label transform owner | `dienststelle`. |
| New Dienststelle observer | Forbidden in this tranche. |
| `characterData` / `title` observation | Forbidden in this tranche. |
| Events catalog | No `_KDB.events` entry; direct known-owner API dispatch is used. |
| Payload | Serializable metadata only. |
| Performance control | Existing rAF/coalescing plus KDB-owned mutation exclusion. |

## 9. Approval

CP approval of this delta allows an execution spec to implement the route-map capability, early coalesced dispatch, and Dienststelle narrow action handling. It does not approve unrelated Dienststelle cleanup, file splitting, selector moves, or behavior changes.


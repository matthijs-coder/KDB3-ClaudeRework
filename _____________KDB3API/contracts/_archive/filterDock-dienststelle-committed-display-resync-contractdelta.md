# Contract Delta: filterDock -> dienststelle committed display resync

**Status:** Draft for user approval
**Date:** 2026-06-05
**Owner modules:** `filterDock`, `dienststelle`
**Base contracts:**

```txt
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/dienststelle.md
```

---

## 1. Purpose

This delta approves a narrow `filterDock` observer notification for Dienststelle committed bottom-display resync after Cognos writes or replaces filter dock committed-value DOM.

The immediate target is the DEZPV flow where a global Dienststelle clear + OK causes pageContext defaults to be applied programmatically, after which `.wa-filterDock-filterItem-bottom` may temporarily show raw Cognos hierarchy text such as `M06|... # 3h4_ZKS - Liquidatur`.

The goal is deterministic owner handoff when the committed display DOM changes. It is not a timer retry, fake user commit, popup resync extension, or new defaulting behavior.

## 2. Ownership Decision

`filterDock` remains the neutral dock observer and owner router. It may detect coalesced dock mutation signals that are relevant to committed bottom-display DOM and dispatch serializable notifications to route-map owners that opt in.

`dienststelle` remains the only owner of Dienststelle display sanitizing. `filterDock` must not implement, duplicate, or infer the Dienststelle hierarchy text transform.

Programmatic defaults must not be routed as fake manual `filterDockStateChanged` / `clickedOk` commits. Manual and programmatic flows should instead converge after Cognos changes committed display DOM through this observed committed-display lifecycle notification.

## 3. Approved Route

Add one route-map capability for the `dienststelle` owner:

```js
dienststelle: {
  apiKey: "dienststelle",
  needsFilterDockFiltersReady: true,
  needsFilterDockHeaderResync: true,
  needsPopupDisplayResync: true,
  needsFilterDockCommittedDisplayResync: true,
  actionTypes: {
    stateChanged: "dienststelle/filterDockStateChanged",
    popupReady: "dienststelle/filterDockPopupReady",
    filtersReady: "dienststelle/filterDockFiltersReady",
    headerObserved: "dienststelle/filterDockHeaderObserved",
    committedDisplayObserved: "dienststelle/filterDockCommittedDisplayObserved"
  }
}
```

`needsFilterDockCommittedDisplayResync` means: this owner wants an idempotent notification when the long-lived dock observer sees committed bottom-display DOM activity that may require owner-specific display sanitizing.

## 4. Action Contract

`filterDock` dispatches:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/filterDockCommittedDisplayObserved",
  payload: {
    source: "filterDockCommittedDisplayObserved",
    observedAt: number,
    addedCount: number,
    removedCount: number,
    attributeCount: number,
    committedDisplayMutationCount: number,
    filterWrapperCount: number
  }
});
```

Payload rules:

- Payload is JSON-serializable.
- Payload contains no DOM nodes, jQuery objects, MutationRecord objects, callbacks, or live runtime refs.
- Payload does not include transformed display labels.
- Payload does not include owner-private Dienststelle state.
- `committedDisplayMutationCount` is a relevance hint, not a guarantee that every committed display node still exists when the owner handles the action.
- `filterWrapperCount` is a dock-level hint only.

## 5. Observer Scope

This delta deliberately starts with the conservative observer scope already used by the long-lived dock observer:

- Use existing dock observer `childList`, `subtree`, and already-approved attribute signals.
- Treat mutations as relevant only when the mutation target or added/removed nodes are at, inside, or contain committed bottom-display selectors such as `.wa-filterDock-filterItem-bottom` and `.wa-filterDock-filterItemText`.
- Do not enable `characterData` in this tranche.
- Do not add `title` or `aria-label` to the long-lived dock observer attribute filter in this tranche.
- Do not create a Dienststelle-owned `MutationObserver`.
- Do not add a second dock-level observer.

If Cognos production evidence proves the committed bottom-display is changed only through in-place text-node `characterData`, stop and request a new contract decision before enabling `characterData`.

## 6. Feedback-Loop Guard

The notification must not loop solely because Dienststelle applied its own sanitizing or visibility classes.

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

`dienststelle/filterDockCommittedDisplayObserved` is a narrow lifecycle action.

On this action, Dienststelle may run only its existing idempotent committed display sanitizing path:

- run the Dienststelle-owned view sync across supported global and pageContext buckets, equivalent to `_syncView(_KDB, null)`, unless execution introduces an equally narrow committed-only existing helper;
- write only approved committed-display text/title/aria-if-empty surfaces already owned by Dienststelle sanitizing;
- never mutate `[data-id]`, `activeFilterKey`, `filterId`, `filterKey`, Cognos lookup identity, selection values, history snapshots, or filterDock state;
- perform no reconcile, no defaulting, no Sicht sync, no widget downstream effects, and no popup option-specific observer work from this action.

Repeated notifications are acceptable. The Dienststelle sync must remain idempotent and safe when wrappers are missing.

## 8. Contract Matrix

| Concern | Decision |
|---|---|
| Manual commit display sync | Existing `filterDockStateChanged` + Dienststelle reconcile path remains. |
| Programmatic pageContext defaults | Do not fake a manual commit; converge through observed committed-display DOM change. |
| Observer owner | `filterDock`. |
| Display transform owner | `dienststelle`. |
| New Dienststelle observer | Forbidden in this tranche. |
| Popup resync reuse | Forbidden; popup mount/session resync remains popup-only. |
| `characterData` observation | Forbidden in first execution tranche; requires follow-up approval if needed. |
| Events catalog | No `_KDB.events` entry; direct known-owner API dispatch is used. |
| Payload | Serializable metadata only. |
| Performance control | Existing coalescing plus relevance filter and KDB-owned mutation exclusion. |

## 9. Approval

CP approval of this delta allows an execution spec to implement the route-map capability, committed-display relevance detection, coalesced owner dispatch, and Dienststelle narrow action handling. It does not approve timer retry ladders, fake user commits, popup route reuse, CSS changes, `aria-label` rewrites, unrelated cleanup, or behavior changes outside deterministic committed-display resync.

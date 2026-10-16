# Contract Delta: `dashboardPdf` Canonical Filter-Instance Attachment Rows

> Migrates dashboardPdf Anhang filter rows to canonical filter-instance identity and
> canonical tabs scope resolution.

---

**Status:** `Implemented — pending live Cognos validation`
**Owner module / service:** `dashboardPdf`
**Type:** `feature-module contract delta`
**Parent contract:** `contracts/dashboardPdf.md`
**Depends on:** `contracts/singleSelect-filterInstanceIdentity-contractdelta.md`,
`contracts/tabs-filterScopeSelectors-contractdelta.md`,
`contracts/specialSingleSelect-filterInstanceIdentity-contractdelta.md`

---

## 1. Canonical Read Sources

dashboardPdf attachment filter rows use only public owner APIs:

- `_KDB.api.singleSelect.getState().instancesById`
- `_KDB.api.singleSelect.getState().inventory`
- `_KDB.api.tabs.dispatch({ type:"tabs/resolveFilterScopeTargets", payload:{ source:"dashboardPdf" } })`
- `_KDB.api.sicht.getState()`
- `_KDB.api.dienststelle.getState()`
- `_KDB.api.specialSingleSelect.getState()`

No dashboardPdf production path reads `_KDB.state` directly.
No dashboardPdf production path reads `singleSelect.getState().byScope`.

## 2. Freshness Gate (Fail Closed)

Before building Anhang filter rows:

1. Read `singleSelect.getState().inventory.freshness`.
2. If freshness is not `fresh`, dispatch exactly once:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/reconcileFilterInstances",
  payload: { reason: "<allowed reason>" }
});
```

3. Re-read state.

If reconcile rejects/fails, or freshness remains non-`fresh`, dashboardPdf returns a
coded fatal result and emits no knowingly partial PDF.

## 3. Scope Resolution Contract

Page-context scope IDs are resolved only through the tabs owner action:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/resolveFilterScopeTargets",
  payload: { source: "dashboardPdf" }
});
```

No label/token heuristic is used for page-context value placement.
Scope matching uses canonical scope normalization only.

## 4. Attachment Filter Row Semantics

For each scope (`global` and each visible tab row):

- fixed label order:
  `Sicht`, `Jahr`, `Dienststelle`, `Berufsfamilie`, `Dienstverhältnis`,
  `Geschlecht`, `Altersgruppe`, `Dienststellenleitung`, `Personengruppe`
- one row/value entry per label per scope
- if multiple canonical instances share a label in one scope:
  merge in deterministic instance order, de-duplicate values, join with `; `

## 5. Display-Only Rule

Filter display values use canonical display fields only.

- singleSelect records: `currentSelection.displayValue` only when display source is
  valid for confirmed display
- no fallback from display to `useValue`
- missing/unavailable display renders empty and emits a coded warning

## 6. Label-Specific Rules

- `Sicht` uses `_KDB.api.sicht.getState().currentSelection.displayValue`
- `activeSichtValue` is only a degraded fallback with coded warning when
  `currentSelection.displayValue` is unavailable
- `Dienststelle` visible label is always `Dienststelle`
- `Dienststelle` global values come from the active filter's global
  `currentSelectionByScope` entries (`displayValue` only)
- `Dienststelle` page-context values come from active filter scope entries
  (`displayValue` only), mapped through canonical resolved scope targets
- `Personengruppe` and `Dienststellenleitung` are emitted only when
  `specialSingleSelect.getState().byFilterId[id].isVisible === true`; their values
  come from canonical `singleSelect` instances, never from deprecated
  `lastAppliedDisplayValue`

## 7. Errors And Warnings

Fatal (export aborted, no partial file):

- `DASHBOARD_PDF_FILTER_PREPARATION_FAILED`: singleSelect inventory freshness cannot be guaranteed
- `DASHBOARD_PDF_SCOPE_TARGET_RESOLVE_FAILED`: canonical tabs scope-target resolution fails

Warnings (row remains renderable):

- `DASHBOARD_PDF_FILTER_DISPLAY_UNAVAILABLE`: display unavailable / invalid display source
- `DASHBOARD_PDF_SICHT_FALLBACK_USED`: degraded Sicht fallback
- `DASHBOARD_PDF_ATTACHMENT_SCOPE_MAP_WARNING`: unresolved page-context scope-to-tab mapping for a specific value source


# Contract Delta: Dimensions option Lehrlinge omitted

> Lehrlinge is not a vis-widget Dimensions dropdown option. Remove it from the Cognos property and from the JS dimension catalog. Do not add a second filter or a restore safety net.

---

**Status:** `Approved` — 2026-09-28 PO vastenburg. Second stress-test held. No execution spec; the change is one catalog key.  
**Type:** `feature-module contract delta`  
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-09-28  
**Parents:** `contracts/widgetSettings.md` (metrics-table dropdown population), `contracts/visualization-dimension-custom-label-contractdelta.md` (exemplar list only)

---

## 1. Purpose

The vis-widget settings dropdown for Dimensions must not offer Lehrlinge. The option was never rolled out. Old parameter sets that might still store that string are out of scope.

---

## 2. Closed product decisions

| # | Lock |
|---|---|
| 1 | Lehrlinge is not a Dimensions option and not a bindable dimension catalog key. |
| 2 | Live dropdown keys, when the table `dimensions` map is non-empty, are `Object.keys` of `_KDB.properties.visualizationsDataPropObj[table].dimensions`. That object is the Cognos dashboard property `visualizationsDataPropId`. PO removes the `Lehrlinge` key under `Personal_KDB.dimensions` and under `Kennzahlen_TEST.dimensions`. |
| 3 | Code catalog and empty-property fallback: delete only the `Lehrlinge` entry in `KDB3/js/core/config/visualizations/dimensions.js`. Remaining keys stay: Altersgruppe, Berufsfamilie, Dienstverhältnis, Geschlecht. |
| 4 | No deny-list in `populateTableDropdown`. No second copy of the option list. |
| 5 | No orphan, restore, history, or writeback normalization of a stored `Lehrlinge` value. |
| 6 | `filterPropId` Personengruppe stays, including `displayValue` Lehrlinge. specialSingleSelect, `tables.js`, `aufrissMaps.js`, and the `dimensions.js` re-export shims stay untouched. |
| 7 | `__savedProperties/visualizationsDataPropId.js` is a dump, not runtime. Do not edit it for this change. |
| 8 | Custom-label law still sets the label to the dropdown key. Lehrlinge is no longer such a key. Do not rewrite the Frozen custom-label execution spec or its futureTodo handoff. |

---

## 3. Read order (unchanged mechanism)

`readTablePropertyKeys` in `widgetSettings/view/populateTableDropdown.js`:

1. Non-empty keys of `visualizationsDataPropObj[table].dimensions`.
2. Else `Object.keys` of `_KDB.config.dimensions` / `visualizations/dimensions.js`.

Both sources omit Lehrlinge after PO property edit and the catalog delete. Binding still reads the JS catalog via `resolveVisualizationDimensions`, not the Cognos property values.

---

## 4. Files

| File | Action |
|---|---|
| `KDB3/js/core/config/visualizations/dimensions.js` | Delete the `Lehrlinge` key only. |
| `contracts/widgetSettings.md` | One-liner under metrics-table dropdown population. |
| `contracts/visualization-dimension-custom-label-contractdelta.md` | Strike Lehrlinge from the §1 exemplar list only. |
| This file | Product law. |

**Must not touch:** `populateTableDropdown.js`, widgetBindingPlan, widgetSettings view beyond the existing read order, `core/config/dimensions.js`, `widgetSettings/config/dimensions.js`, specialSingleSelect, drillthrough `aufrissMaps.js`, `__savedProperties/**`.

---

## 5. Out of scope

- Personengruppe filter option and its rights table.
- Drillthrough icon token `LEHRLINGE`.
- Sorting of Jahr / Monat (parked).
- Safety net for dashboards saved with dimension Lehrlinge.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-28 | Draft → Approved | PO vastenburg | Property `visualizationsDataPropId` edited by PO. Code is catalog delete only. No restore net. Stress-test HOLD. |

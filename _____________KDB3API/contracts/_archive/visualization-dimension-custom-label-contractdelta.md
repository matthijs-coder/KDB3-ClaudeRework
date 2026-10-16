# Contract Delta: dimension data-item `setCustomLabel`

> Cognos Dashboard `DataItemAPI.setCustomLabel(label)` is **instance-scoped** (one widget slot item). It does not rename the TM1 attribute or other widgets.
> PO vastenburg 2026-09-02: live `temp1.getDataItemList()[0].setCustomLabel("test")` works. Put the inner-ring wrapper in `cognosAPI/visualization.js` (not `dataQuery.js`). New **op** on the existing `visualization` facet (not a new facet). Apply after `addDataItems`. Label = dimension-dropdown key. No dimension → no call. Empty label forbidden when a dimension is selected.

---

**Status:** `Frozen` — PO vastenburg Cognos ack 2026-09-02. Implemented (execution spec + army).
**Type:** `feature module contract delta` (cognosHost op + plan/apply; widgetVis is caller of apply only)
**Authoring AI:** Cursor Grok 4.6 (coordinator), 2026-09-02
**Reviewed by:** PO vastenburg, approved 2026-09-02
**Related rules:** `cognos-adapter.mdc`, `feature-structure.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `module-public-api.mdc`

**Parents this delta amends**

| Parent | Slice |
|---|---|
| `contracts/cognosHostService.md` | visualization facet catalogue: new op `setCustomLabelInSlot`; D4 live caller = `widgetBindingApply.applySlots` |
| `contracts/widgetBindingPlan.md` | `SlotPlanItem.options.customLabel` |
| `contracts/widgetBindingApply.md` | §7 `applySlots` after `addDataItemsToSlot`; Cognos touchpoints table |
| `contracts/widgetVis.md` | `applyDimension` / binding pipeline: no direct `setCustomLabel`; apply owns it |

---

## 1. Purpose

When a vis widget binds a chosen dimension, Cognos names the data item after the last unique-name segment (`Tooltip` for most dimensions). List column headers and chart legend titles then show `Tooltip`.

Keep binding the configured `itemId` (including `[Tooltip]` where that is the catalog). After the item exists in the slot, set its **custom label** to the same string as the dimension dropdown option (`Altersgruppe`, `Berufsfamilie`, `Dienstverhältnis`, `Geschlecht`). Lehrlinge is not a Dimensions option (`contracts/widgetSettings-dimensions-lehrlinge-omit-contractdelta.md`).

---

## 2. Product rules (closed)

| Case | Behaviour |
|---|---|
| Dimension absent (`null` / `""` / `default` / `none` / dropdown **Ohne**) | Do **not** emit `customLabel`. Do **not** call `setCustomLabel`. |
| Dimension is a real dropdown key | **Always** set that key as the custom label on **only** the dimension-carrier data item. Empty string is **forbidden**. |
| Jahr / Monat / Dienststelle / Kennzahl / other slot members | Unchanged names. |
| TopN helper (`dimensionSelectionAffects: "disabled"`) | No `customLabel`. |
| `dimensions.js` `itemId` | Unchanged. Do not strip `[Tooltip]` from the columnId. |

Label text = `Object.keys` / dropdown `label` for real options (same as `populateTableDropdown` `buildDimensionOptions`: `label: values[index]`). Not German `Ohne`. Not vis widget title.

---

## 3. Ownership

| Layer | Folder | Role |
|---|---|---|
| Inner ring | `KDB3/js/core/cognosAPI/visualization.js` | `_KDB.cognosAPI.visualization.setCustomLabel(widgetId, slotId, columnId, label)`. `__getDashboardAPI` only here. WidgetId-first. Never return a host handle. |
| Ring 1 | existing `visualization` facet | `setCustomLabelInSlot(widgetId, slotId, columnId, label, {signal?}) → Promise<Outcome>`. Calls the inner-ring method. Factory `createVisualizationAdapter`. Stamp `visualizationFacet`. |
| Plan | `widgetBindingPlan` | Emit `options.customLabel` when a real dimension is planned. No Cognos. |
| Apply | `widgetBindingApply.applySlots` | After successful `addDataItemsToSlot`, if `customLabel` present, call the facet via `_cognosBinding` (`bindNamed`, **not** reversed `wrap*`). |
| widgetVis | stamped facet / `applyBinding` only | Must **not** call `_KDB.cognosAPI` or `__getDashboardAPI`. Must **not** walk slot items. |

**Forbidden:** new facet; `dataQuery.js`; 11th AMD on `__orchestratorCognosAPI.js`; stuffing a SlotAPI walk into `dataQuery`; `getLabel() === "Tooltip"` as matcher; `addDataItems({ columnId, name })`; List DOM header rewrite; changing legend caption/title sanitizers in this WP; `cleanDataIdForList` / binding the level instead of `[Tooltip]`.

---

## 4. Inner ring

`visualization.js` may grow to **200 lines** for this wrapper **without** a further PO ping. **Above 200** requires an explicit PO discussion before merge. Other JS files stay on the normal 150 hard cap unless already excepted (`KDB.js`).

```js
setCustomLabel: function (_widgetId, _slotId, _columnId, _label) { /* host walk; no leaked handle */ }
```

Host chain (same as live probe):

`getCanvas().getContent(widgetId).getFeature("Visualization").getSlots().getSlot(slotId).getDataItemList()`

Match: `getColumnId() === columnId`, else `getId() === columnId` (same dual match as `setTopBottomOnSlot`). Call `dataItem.setCustomLabel(label)`. Empty / non-string `label`: do not call the host (facet maps to `VISUALIZATION_INVALID_ID`). Missing slot/item/method: throw; facet maps to `ITEM_NOT_FOUND` / `HOST_CAPABILITY_MISSING` / `WRITE_FAILED`.

Do not add a new file under `cognosAPI/visualization/` for this WP (PO: stay in `visualization.js`).

---

## 5. Facet op

```js
_KDB.services.cognosHost.visualization.setCustomLabelInSlot(
  widgetId, slotId, columnId, label, { signal? }
) // Promise<Outcome>
```

Copy `setVisTitle.js` / `setTopBottomOnSlot.js` Outcome dialect: disposed, abort, abort-after-effect, `HOST_UNAVAILABLE`, `HOST_CAPABILITY_MISSING`, `ITEM_NOT_FOUND`, `WRITE_FAILED`, `try/catch` never throws to the caller. Empty label → `VISUALIZATION_INVALID_ID` (same class as empty `setVisTitle`).

Bind on `buildVisualizationSlotSurface.js` (4 → 5 AMD). `createVisualizationAdapter` / compose / `__orchestratorCognosHost` **unchanged**.

`createCognosBindingFacade.js`: `bindNamed(visualizationFacet, "setCustomLabelInSlot")`. Do **not** copy `sortDataItemInSlot` reversed argument wrap. Add to `isComplete()` in the **same** PR as the facet op (otherwise apply cannot require it).

D4 live caller: `widgetBindingApply` `applySlots`.

---

## 6. Plan schema

`SlotPlanItem.options` gains:

```js
customLabel?: { columnId: string, label: string }
```

Emit on the slot named by `visTypeConfig.dimensionSelectionAffects` when `dataConfig.dimension` is a real key and that slot is planned. `columnId` = that dimension’s catalog `itemId` (the same id prepended into `columnIds`). `label` = that key.

Do not emit on reset-only / empty-slot plans. Do not emit a `customLabel` with empty `label` or empty `columnId` (plan error if a real dimension was selected but lookup failed).

No new `BindingPlan` top-level array.

---

## 7. Apply order

In `applySlots`, per slot that runs add:

1. `addDataItemsToSlot(widgetId, slotName, effectiveColumnIds)`
2. If `slot.options.customLabel` is present → `setCustomLabelInSlot(widgetId, slotName, customLabel.columnId, customLabel.label)`
3. Existing `sortDataItemInSlot` loop

Filter-only applies (slots skipped) do not call custom label. Planned `customLabel` with empty label → `WIDGET_BINDING_APPLY_SLOT_FAILED` / invalid, not a silent skip. Host miss after add → fail `applySlots` (item should exist).

---

## 8. Out of scope

- Legend caption/title DOM sanitizers (`replaceTooltipInLegendTitle`, LINE title drop, observer captions-only). If Cognos still paints `Tooltip` after this WP, that is a **follow-up**, not a silent extra rewrite here.
- `syncTooltipMetadata` text rewrite.
- Changing `dimensions.js` / `parameterMap.js` unique names. Deleting the `Lehrlinge` catalog key is authorized only by `contracts/widgetSettings-dimensions-lehrlinge-omit-contractdelta.md`. Do not rename the remaining keys or their `itemId`s.
- Package/model calculated items.
- widgetVis list-header DOM.
- New cognosHost facet.

---

## 9. Implementation files (normative)

| Path | Change |
|---|---|
| `KDB3/js/core/cognosAPI/visualization.js` | Add `setCustomLabel`. Stay ≤200 lines. |
| `KDB3/js/core/services/cognosHost/facets/visualization/write/setCustomLabelInSlot.js` | New write |
| `…/buildVisualizationSlotSurface.js` | Bind |
| `…/widgetBindingApply/effects/createCognosBindingFacade.js` | `bindNamed` + `isComplete` |
| `…/widgetBindingApply/effects/applySlots.js` | After add |
| `…/widgetBindingPlan/slots/` (resolve/build slot plan) | Emit `options.customLabel` |
| This file + parent one-liners listed above | Contracts |

---

## 10. Acceptance

1. List + real dimension: column header is the dropdown key, not `Tooltip`. Cells still use the bound `[Tooltip]` (or Altersgruppe level) item.
2. Charts + real dimension: legend title no longer starts with `Tooltip` because Cognos uses the custom label (e.g. `Geschlecht - Dienststelle_BW - Jahr`).
3. Ohne / none: no `setCustomLabel`; no empty-string host call.
4. Other columns in the same slot keep Cognos names.
5. widgetVis / apply-effects never call `__getDashboardAPI` / `_KDB.cognosAPI`.
6. `visualization.js` ≤ 200. Other new/edited JS ≤ 150 unless already excepted.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-09-02 | Draft → Approved | PO vastenburg | Live `setCustomLabel`; visualization.js ≤200; dropdown keys; no-dim skip; empty label forbidden; dimension item only. Implementation deferred to a fresh captain. |
| 2026-09-02 | Approved → Frozen | PO vastenburg | Cognos ack: List header + chart legend title show dropdown key, not `Tooltip`. |
| 2026-09-28 | Frozen exemplar amended | PO vastenburg | Lehrlinge struck from the §1 dropdown-key list. Remaining unique names unchanged. |

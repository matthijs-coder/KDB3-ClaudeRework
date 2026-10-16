# Contract Delta: vis toggle “Werte beschriftung” (`valueCaption`)

> Fourth Family A row in the existing Zusatzoptionen nest. Not a new icon. Not a showValues reopen. Not a `settingFamily` helper.
> PO vastenburg 2026-10-05: offer the row on every visualization type except Pie and List. Unset effective value is **on** for every relevant type.

---

**Status:** `Frozen` — PO vastenburg Cognos ack 2026-10-05: the Werte beschriftung toggle works. Host property `valueAxis.ticks.labels.visible`. The writer passes a JavaScript boolean through `visualizationFacet.setContentProperty`.
**Type:** `feature-module contract delta`
**Authoring AI:** Cursor Grok 4.7 coordinator, 2026-10-05
**Parents:** `contracts/widgetSettings-vis-toggle-panel-wp2-contractdelta.md`, `contracts/widgetSettings-iterator-standard-on-contractdelta.md`, `contracts/widgetVis-show-values-contractdelta.md` (pointer only), `contracts/writeback.md` §4.5

---

## 1. Diagnose

**B.** Live showValues / iterator / zoom already match their contracts (Family A: field absent = Standard, inherit deletes the key, explicit boolean KEEP-all-vis, GET omits, present `0` is not an omit sentinel, host write via stamped `visualizationFacet.setContentProperty`). A fourth row dropped into `.KDB_showValuesContainer` as extra children breaks the closed kind lists, the pill CSS, and the grid. `buildWidgetVisSettingsSnapshot.js` is at 142 lines; extract before the new key.

Cognos property for this row, distinct from `valueLabels.visible` + `labels.visible`: **`valueAxis.ticks.labels.visible`**. PO console 2026-10-05 on widget `model0000019a8ddfccc1_00000000`: `content.setPropertyValue("valueAxis.ticks.labels.visible", "false")` hides the value-axis tick labels; `"true"` shows them. That call is the inner-ring host chain. Feature code does not make it.

## 2. Product

| Topic | Law |
|---|---|
| Chrome | Same icon (`KDB_showValuesButton`, Zusatzoptionen). New inner host. Phrase DOM text **`Werte beschriftung`**. No new `live[]` icon. Not `_KDB.config.labels.de`. |
| State / kind | `valueCaption`. Absent \| `true` \| `false`. Never `"inherit"` / `"none"` / `"default"`. `normalizeKind` maps `valuecaption` → `valueCaption`. |
| Options | `vcap-off` / `vcap-inherit` / `vcap-on`. Values `off` / `inherit` / `on`. Labels Aus / Standard / Ein. `isDefault` on inherit. |
| Writeback | **`vcap`**. Omit when absent. Present `0` and `1` both persist. No `SCHEMA_VERSION`. No v2 map. |
| Relevant chrome | **Line, StackedBar, StackedColumn, Prognose.** Hide **Pie** (row CSS, keep-DOM, widget and focus). **List** already hides every `[data-kdb-showvalues-row]` and the icon. |
| TopN | Hide. TopN is a List-shaped helper, not a Diagrammtyp entry. Apply skip = `List` or `TopN`, same as iterator/zoom. Do not widen the showValues List-only skip. |
| Unset | Field absent. Chrome marks Standard. Do not seed. Do not add to `VIS_STARTUP_KINDS`. Effective host value **true** on the four relevant types (clone iterator Standard-on, not zoom-off). Explicit boolean wins. |
| KEEP | Explicit `true` / `false` survives a vis-type switch, including hide types. |
| Ein off allowlist | `{ ok: true, skipped: true }` and **no** `reportToSettings`. Do not commit `1`. |
| Aus | State `false` and GET `vcap: 0` on every type. Host write `false` only when the property is on the allowlist. |
| Inherit | Delete the field. On the allowlist, write the Standard (**true**). |
| History | Existing key `widgetSettings_optionSelect`. Frame kind `valueCaption`. First paint is not a step. |
| Grid | Header row 1, Werte anzeigen row 2, Iterator row 3, Zoomleiste row 4, this row **5**. Prognose remounts this row to **4** (Zoomleiste is already on 3 there). Widget and focus panel. |
| Host | `valueAxis.ticks.labels.visible` on Line, StackedBar, StackedColumn, Prognose. Not Pie, List, TopN. Not `definitions.js`. |
| Value | JavaScript boolean `true` / `false`. PO confirmed boolean `false` works on this key, same as the string `"false"`. Do not pass the string. |
| Adapter | widgetVis reads the stamp `_KDB.runtime.widgetVis.visualizationFacet` via `readVisualizationFacet` and calls `setContentProperty`. Ring 1 `setContentProperty.js` calls `_KDB.cognosAPI.visualization.setContentPropertyValue`, which is the only `content.setPropertyValue`. No new facet or op. |

## 3. Build shape

Clone iterator Standard-on inside the existing pair `handleApplyIteratorZoom` / `applyIteratorZoom`. Same action `widgetVis/applyIteratorZoom`. No `applyValueCaption.js`. No new `actionRouter` import. No `_KDB.services.settingFamily`. No third `*DropdownSafeguard.js`.

`stampIteratorZoomHosts` carries the third map. `APPLY_ON_REASON` gains `valueCaption`. Four envelopes stay hand-copied: snapshot `appendExplicitVisOverrides`, `readEffectiveSettingsContext`, `parameterSetBindingHelpers.readCommittedSettings`, `handleApplyStartupSettings`. Also `clearLeftoverFamilyAKeys` (`valueCaption` and `valueCaptionMeta`).

**Extract first:** move `buildCommittedRestoreBatch` and `buildRestoreControlEntry` out of `buildWidgetVisSettingsSnapshot.js` into `widgetSettings/effects/buildCommittedRestoreBatch.js`. Re-export so `restoreCommittedSettingsOnHistoryReplay.js` does not gain an import. If `applyIteratorZoom.js` would pass 150, extract the host maps first (`iteratorZoomHostMaps.js`). Do not add a generic Family A copier.

**Frozen:** `applyShowValues.js`, `handleApplyShowValues.js`, `overlayShowValuesOnLayoutMap`, `handleApplySetting.js`, `definitions.js`, `controlDefinitions.js`, `collectVisualStartupDefaults.js`, `actionRouter.js`, `closeVisibleDropdowns.js`, `domQueries.js`, `mapV2VisWidget.js`. Completeness triad stays `{ dimension, visType, topNChoice }`.

Kind lists that must name `valueCaption` together: `populateStaticDropdown` (`ensureToggleNest`), `buildDropdownOptions`, `options.js`, `kindToStateKey`, `visKindToControl` (`KIND_TO_CONTROL` and `isWidgetVisKind`), `intentDispatchMap`, `resolveCanonicalVisOptionValue`, `commitWidgetSettingValue` inherit-delete, `stampPanelVisType`, keep-open sets in `bindWidgetSettingsPanel` and `bindFocusPanelInteractions`, `shouldApplyVisualizationProperties`, writeback `WIDGET_FIELDS.vis` / `validateWidgetFields` / `VIS_KEYS` / `assignOptionalFlag01` / `parameterSetRestoreBatchCommits`. Pill CSS groups that today list only `iterator, zoom` gain this kind, including the un-flyout rule.

## 4. Write path

widgetVis → stamped `visualizationFacet.setContentProperty(widgetId, "valueAxis.ticks.labels.visible", true|false)` → ring 1 → `setContentPropertyValue` → `content.setPropertyValue`. No new op.

The four relevant types share this one key. A host rejection is `ok: false` and does not commit. Pie, List, and TopN are not in the host map.

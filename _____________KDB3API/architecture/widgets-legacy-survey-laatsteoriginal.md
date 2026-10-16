# Widgets Legacy Survey — laatsteOriginal/KDB2/js/widgets/

READ-ONLY survey of the oldest/most complete KDB2 widgets tree. 21 source files total.
Files marked **[FULL]** were read in full; **[SAMPLED]** were read partially (top + signatures).

---

## 1. Tree map

```
widgets/
├─ widgetsOrchestrator.js              [FULL]  Entry point: per-drop orchestrator; type-resolve + delegate
├─ widgetHelpers.js                    [FULL]  setupWidgetHelpers(_KDB): wires the 5 helper submodules
├─ helpers/                            (5 files — shared Layer A/B helpers, all merged onto _KDB.widgets.helpers)
│  ├─ widgetActionsHelpers.js          [FULL]  resetWidget(take), changeText, move/resize/maximize, setBackgroundColor, toggleSettings
│  ├─ widgetCanvasPlacementHelpers.js  [FULL]  placeWidgetOnCanvas, setWidthHeight, giveWidgetApiObj, setWidgetAdditions
│  ├─ widgetLaunchpadHelpers.js        [FULL]  getWidgetFromLaunchpad (claim element, identity)
│  ├─ widgetToolbarButtonListenersHelpers.js [FULL] addListenersToButtons (toolbar→action), setDropdown
│  └─ widgetDropdownOptionHandlersHelpers.js [FULL] addListenersDropdownOptions (settings UI), resetTopNUi
├─ textWidgets/                        (2 files)
│  ├─ textWidgetOrchestrator.js        [FULL]  configure(): font, starting text, header icons/restyle
│  └─ textWidgetHelpers.js             [FULL]  setFontSize/adjustFontSizeToFit/findOptimalFontSize, setRestyle, setIcons, setTextWidgetStartingText
├─ visWidgets/                         (3 files at this level)
│  ├─ visWidgetOrchestrator.js         [FULL]  configure(): data→TopN→hierarchy re-apply→drillthrough→title
│  ├─ visWidgetHelpers.js              [FULL]  Loader: wires title + topN submodules
│  ├─ addPkzDrillthrough.js            [FULL]  PKZ-AT drillthrough (CTRL-click capture + icon → external report URL)
│  ├─ helpers/                         (2 files)
│  │  ├─ visWidgetTitleHelpers.js      [FULL]  alterVisTitle (title text + tooltip + kennzahl URL link)
│  │  └─ visWidgetTopNHelpers.js       [FULL]  setTopN + hidden query-table TopN resolution
│  └─ visData/                         (2 files at this level)
│     ├─ visDataOrchestrator.js        [FULL]  configure(): visType normalize, datasource, slots, filters, layout, render lifecycle
│     ├─ visDataHelpers.js             [FULL]  Loader: wires the 5 visData submodules
│     └─ helpers/                      (5 files)
│        ├─ visDataDatasourceHelpers.js [SAMPLED] findDataSourceId, setDataSource
│        ├─ visDataSlotsHelpers.js     [FULL]  setSlotsData, handleOtherSlots, handleSlotValues, emptySlot, decimals/format
│        ├─ visDataDownstreamFilterHelpers.js [FULL] setWidgetFilter, applyActiveDownstreamToWidget, filterAllOutUsingDummy
│        ├─ visDataLegendAndTooltipHelpers.js [SAMPLED] legend text normalization, tooltip handling, MutationObserver (~858 lines)
│        └─ visDataWidgetLifecycleHelpers.js [FULL] setProperties, setupGiveKDBWidgetObj, setVisualizationLayoutProperties, resetAllVisWidgetData
```

**File counts per subfolder:** root 2 · helpers/ 5 · textWidgets/ 2 · visWidgets/ (level) 3 · visWidgets/helpers/ 2 · visData/ (level) 2 · visData/helpers/ 5.  **Total: 21.**

**Loader pattern:** every file is an AMD `define([...])` returning a `setupXxx(_KDB)` that mutates a global `_KDB.widgets.*` namespace and merges via `Object.assign`. Submodule loaders (`widgetHelpers`, `visWidgetHelpers`, `visDataHelpers`) just call child setups. The only "instance" object is `_widgetObj` (the runtime per-widget object), threaded through every call.

---

## 2. Orchestrator & lifecycle

### Two entry points (both OUTSIDE the widgets tree, both call the same orchestrator)
1. **Drag-and-drop** — `controlContainer/dragAndDrop/helpers/dragAndDropLifecycleHelpers.js` builds `widgetObj` on drop and `await widgetsOrchestrator(widgetObj, _KDB)`.
2. **Parameter-set restore** — `writeback/setupWBParameterSetFunction/helpers/wbParameterSetWidgetsHelpers.js` builds a `widgetObjArr` from saved state and calls `widgetsOrchestrator(widgetObj, _KDB, perTabIndex)` (NOT awaited; per-tab `widgetIndex` so concurrent TopN tables pick the right hidden table).

### `widgetsOrchestrator(_widgetObj, _KDB, _widgetIndex=0)` (the canonical orchestrator)
Owns the shared (Layer A) drop sequence for ALL types:
1. `getWidgetFromLaunchpad` → resolves `canvasObj {widgetElement, widgetId}` (claims a hidden launchpad element).
2. `giveWidgetApiObj(widgetId)` → builds `widgetApiObj` (a clone of `_KDB.cognosAPIFunctions` + widgetId).
3. `setWidgetAdditions` (inject settings UI/header) + `addListenersToButtons` (toolbar).
4. `setBackgroundColor(default)`.
5. `addListenersDropdownOptions` for: vis(visualizations, topN, dimensions per keyTable), text(fontSize, backgroundColor, restyle).
6. `placeWidgetOnCanvas`.
7. Register watch: `_KDB.state.widgets[widgetId] = {watching:true}` + `cognosAPIFunctions.watchWidgetRender(widgetId)`.
8. `getWidgetWhenReady` (Promise.race w/ 3s timeout — never hangs restore).
9. **Type resolution** via `_widgetObj.draggedElementType.toUpperCase()`:
   - `VISUALIZATION` → `_KDB.widgets.vis.orchestrator.configure(...)` then post-drop legend cleanup (`handleTooltipsAndWarning` + `cleanupLegendText`).
   - `TEXT`/`HEADER` → `_KDB.widgets.text.orchestrator.configure(..., {isHeader})`.

### Mount / destroy / cleanup
- **Mount** = the orchestrator sequence above; widget DOM lives in a hidden launchpad and is *appended* to the canvas dropbox (`placeWidgetOnCanvas`).
- **Destroy/take** = `helpers.resetWidget` (widgetActionsHelpers): stop watching, finish loading anim, disconnect legend MutationObserver, move element back to the launchpad `[cor_page_id=...]`, remove settings UI/header, release `data-kdb-claimed-run`, clear vis local filters + slots, `delete _KDB.giveKDBWidgetObj[widgetId]`. (This is the "take/reset" route — there is NO separate destroy() — reset returns it to launchpad.)

### Vis lifecycle flow (visWidgetOrchestrator.configure → visDataOrchestrator.configure)
visType normalize → `setupGiveKDBWidgetObj` → loading anim start → `getWidgetWhenReady`/`whenRenderComplete2` → `setProperties` (titleMode customTitle, axis titles off) → `clearAllSlots` → `setDataSource` → (custom types set type after DS) → `setVisualizationLayoutProperties` → `setSlotsData` → `setWidgetFilter` (incl. downstream hierarchy re-apply) → tooltip interval (200ms × 3s) → loading anim finish. Then back in visWidgetOrchestrator: TopN (if set) → re-apply dominant hierarchy downstream → clickWarningOnHover → `addPkzDrillthrough` → `alterVisTitle` (after render, 12s race).

---

## 3. Per-type breakdown

### TEXT / HEADER  (textWidgets/)
- Files: `textWidgetOrchestrator.js`, `textWidgetHelpers.js`.
- Layer C behaviors: **font size** (default→may resolve to `automatic`→responsive binary-search `findOptimalFontSize`), **starting text** (`data.title` or explanation default), **HEADER extras**: `KDB_headerWidget` class + `setIcons` (image from `headerWidgetsObj.defaultIcon`) + `setRestyle` (header class swap, `reinigen` strips). Editable node via `changeText` (contenteditable `.note-editable`, focusout commits; responsive font re-fit).

### VISUALIZATION  (visWidgets/ + visData/)
- Files: orchestrators + `visWidgetTitleHelpers`, all `visData/*`.
- Layer C behaviors: **title** (`alterVisTitle`: `display (aggType) nach <dim> <TopN>` + tooltip + kennzahl URL link), **vis data/slots** (`setSlotsData`/`handleOtherSlots`/`handleSlotValues`: series/color/categories/repeat*/grid_cols + measure formatting/decimals by aggregation type), **datasource** (`setDataSource`/`findDataSourceId` by `datasourceName`), **layout props** (`setVisualizationLayoutProperties`: per-visType axis/labels/grid/prognose custom props), **legend/tooltip** (strip `a#b`→`b`, MutationObserver), **drillthrough** (`addPkzDrillthrough`).

### topN  (FOLDED INTO vis — NOT a separate type)
- Files: `visWidgets/helpers/visWidgetTopNHelpers.js` + topN branches in `widgetDropdownOptionHandlersHelpers.js`, `visWidgetTitleHelpers.js`.
- Layer C behaviors: `setTopN` builds a **hidden query "List" table** (claimed via `dataTablesPad` + per-tab `widgetIndex`), configures grid_cols slots, sort desc, `setTopBottom topcount`, excludes Gesamt/ALLE, reads results (`getTopNQueryResultsArray`), applies an `in` local filter to the visualization, then **moves the table back to the pad** (`resetTopNTable`). Guard: TopN only allowed when a grouping dimension ≠ default/none.

### datatable / List  (NOT a distinct widget type — it is vis visType "List")
- "List" is one of the vis types in `visDataOrchestrator` switch. List-specific logic is scattered: `handleOtherSlots`/`handleSlotValues` (List slot key, `replaceKennzahlName`, `moveDataItemInSlot("grid_cols",0,2)`, `hideSummaries`), and the TopN hidden table is itself a List vis.

---

## 4. Capability matrix

| Concern | text | visualization | topN | datatable | shared / cross |
|---|---|---|---|---|---|
| **send to launchpad** | — | — | — | — | NOT in widgets tree (dragAndDrop builds widgetObj from launchpad element); `getWidgetFromLaunchpad` claims it |
| **toolbar binding** | widgetToolbarButtonListenersHelpers (font/restyle/icons titles) | same (visualization/dimensions/topn titles) | same (topn title→setDropdown) | via vis | `addListenersToButtons` aria-label→action dispatch (DE+EN) |
| **widget identity/type resolution** | widgetsOrchestrator (TEXT/HEADER) | widgetsOrchestrator (VISUALIZATION) | n/a (vis subtype) | n/a (vis "List") | `draggedElementType.toUpperCase()`; `getWidgetFromLaunchpad` gives widgetId |
| **canvas placement** | widgetCanvasPlacementHelpers | same | — | same | `placeWidgetOnCanvas`/`setWidthHeight` (zoom-aware, dropbox.append) |
| **history steps** | — | — | — | — | **ABSENT in widgets tree** (no add/drop/replay here) |
| **error recovery** | textWidgetOrchestrator try/catch | every orchestrator try/catch + log; render `Promise.race` timeouts | setTopN try/catch | via vis | `wrapFn`/`log` fallbacks; loading-anim watchdog; non-fatal cosmetic catches |
| **launchpad pad/take (route/reset)** | resetWidget (header/text cleanup) | resetWidget (filters+slots clear) | resetTopNTable (table→pad), resetTopNUi | via vis | `widgetActionsHelpers.resetWidget` moves element back to launchpad; releases claim |
| **settings (focus panel, dim/seq)** | setWidgetAdditions + dropdowns (fontSize/restyle/icons) | dropdowns (visualizations/dimensions/sequences/topN) | topN dropdown guard | dimensions/sequences via vis | `widgetDropdownOptionHandlersHelpers.addListenersDropdownOptions` (`_widgetObj.settings`) |
| **slot plan** | — | visDataSlotsHelpers (`setSlotsData` plan over series/color/categories/repeat*/grid_cols) | visWidgetTopNHelpers (grid_cols plan for query table) | List slot rules in handleOtherSlots | shared `handleOtherSlots`/`handleSlotValues` |
| **slot apply (live slots)** | — | `slot.addDataItems`/`sortDataItemInSlot`/`moveDataItemInSlot`/`emptySlot` | setTopNTable grid_cols + setTopBottom | same | applied directly on Cognos `getSlots()` |
| **live widget lifecycle (live/launchpad routing)** | watch + resetWidget | watch + resetWidget + resetAllVisWidgetData | n/a | n/a | `_KDB.state.widgets`, `watchWidgetRender`, `getWidgetWhenReady`/`whenRenderComplete2` |
| **text edit / font / restyle / editable node** | textWidgetHelpers + changeText | (vis title uses changeText too) | — | — | `changeText` shared (vis title vs text body) |
| **title** | (header text) | visWidgetTitleHelpers `alterVisTitle` | feeds title text (`Top-N`) | — | — |
| **vis data** | — | visDataOrchestrator + visDataSlotsHelpers | reads query result | List measure format | — |
| **drillthrough** | — | addPkzDrillthrough | — | — | — |
| **datasource** | — | visDataDatasourceHelpers | setDataSource on query table | same | `setDataSource`/`findDataSourceId` |
| **legend / tooltip** | — | visDataLegendAndTooltipHelpers | — | — | post-drop cleanup in widgetsOrchestrator |
| **helper table claim / resolution** | — | (consumes topN result) | visWidgetTopNHelpers (`dataTablesPad`, `getTabNumber`, claim by widgetIndex) | n/a | `_KDB.elementsObj.hiddenArea.dataTablesPad` |
| **hierarchy rewrite / downstream** | — | visDataDownstreamFilterHelpers `setWidgetFilter` | re-applied after setTopN | same | `_KDB.filters.hierarchy.helpers.applyDominantHierarchyDownstreamToWidget` |
| **TopN descriptor** | — | settings.topN | `topNTemp{excludeDataItem,...}` + hardcodeSettings.topN map | — | normalize `top2`→`top-2` |
| **list/datatable slot columns + dim/seq** | — | handleOtherSlots | — | List branch (replaceKennzahlName, move 0→2, hideSummaries) | shared slot code |

---

## 5. State & runtime

**Global `_KDB.*` read/written by widgets:**
- `_KDB.widgets.{helpers, vis.orchestrator, vis.helpers, vis.data.orchestrator, vis.data.helpers, text.orchestrator, text.helpers}` — installed namespaces.
- `_KDB.state.widgets[widgetId] = {watching}` , `_KDB.state.pkzDrillthroughAttached[widgetId]`.
- `_KDB.giveKDBWidgetObj[widgetId]` — closure returning the `_widgetObj` (live registry; deleted on reset).
- `_KDB.activeObserversObj.widgets[widgetId].legend` — MutationObserver handle.
- `_KDB.calledFunctionsLog.*` — pervasive "start/finish" tracing (every fn).
- `_KDB.widgetProperties.*` (read-only config): `visualizationWidgetsObj`, `visualizationDataWidgetsObj[table]` (dimensions/sorting/datasourceName), `visualizationDefinitionsObj` (`*VisualizationObj`, `kennzahlSpecificSlotsDefaultsObj`), `textWidgetsObj`/`headerWidgetsObj`, `tablesObj`, `resolveWidgetLocalFilterItemId`.
- `_KDB.hardcodeSettings.widgetSettings.{backgroundColor, restyle, topN}`; `_KDB.elementsObj/selectorsObj.hiddenArea.*`; `_KDB.tabsObj`, `_KDB.tempTree`, `_KDB.temp.parameterSetRestoreRunId`, `_KDB.dienststelleHierarchyData.*`.

**Runtime/DOM (NOT serializable):** `_widgetObj.canvasObj.{widgetElement,widgetId,settingsButton,buttonsContainer}`, `widgetApiObj`, `dropbox`, `event`, the Cognos content/visualization features, MutationObservers, claimed launchpad DOM elements, `topNTemp`.
**Serializable-ish (settings):** `_widgetObj.settings.{fontSize, backgroundColor, restyle, icons, visualizations, dimensions, sequences, topN}` and `_widgetObj.data.{code,display,langtext,kennzahlenTable,title,tooltip}` — this is what parameter-set restore round-trips.

---

## 6. Cognos touchpoints (grouped by concern)

- **Widget API access:** `__getDashboardAPI()/window.__getDashboardApi()`, `getCanvas().getContent(id)`, `getContent(id).getFeature("Visualization"|"DataSources"|"DataQueryExecution")`, `cognosAPIFunctions.getWidget(id)`, `editchart()`.
- **Readiness/render:** `getWidgetWhenReady`, `whenRenderComplete`/`whenRenderComplete2`, `watchWidgetRender`, `render()`, `awaitForTableData`, `getRowCount`.
- **Vis config:** `setVisType`, `setVisTitle`, `setContentPropertyValue`/`getContentPropertyValue`, `setPropertyValue` (titleMode/axes/grid/prognose), `clearAllSlots`, `getSlots().getSlot(...)`, `addDataItems`/`removeDataItems`/`moveDataItemInSlot`/`sortDataItemInSlot`/`setSort`/`setTopBottom`/`setFormat`, `getSlotValues`, `getSlot{Series,Color,Categories,...}`.
- **Datasource:** `getDataSourcesArray`, `getFeature("DataSources").getDataSourceList/setActiveDataSourceId`, `setDataSource`, `getVizDataSourceId`.
- **Local filters:** `localFilters()`/`getLocalFilters()`, `addFilter`/`removeFilter`/`getFilterList`, `buildKeepexcludeConditionsFilterObj`, `addOrReplaceLocalFilter`, `ensureWidgetLocalFilterDisplayType`, `repairWidgetLocalFiltersDisplayType`.
- **Page context / selections (drillthrough):** `getPageContextItemsArr`, `content.getSelections`, `content.on("all", ...)`, `getVisType2`, `hasCustomVisTitleMode`, `getContainer().getId()`.
- **UX:** `showMessage`, `playLoadingAnimation`, `clickWarningOnHover`, `getCurrentTabId`.

---

## 7. Integration touchpoints

- **Launchpad:** hidden-area launchpads per type (`visualizationLaunchpad`, `textLaunchpad`, `dataTablesPad`); selected by `cor_page_id`/`tab{key}_launchpad`. `getWidgetFromLaunchpad` claims an element (`data-kdb-claimed-run`); `resetWidget`/`resetTopNTable` return elements to the launchpad/pad.
- **Drag/drop/canvas placement:** `dragAndDropLifecycleHelpers` (dragStart builds widgetObj, drop → orchestrator); `placeWidgetOnCanvas` + jQuery UI `draggable`/`resizable` (zoom/scale-aware, snap via `checkSnap`).
- **Filters/hierarchy downstream → vis:** `_KDB.filters.hierarchy.helpers.applyDominantHierarchyDownstreamToWidget` / `applyDownstreamToWidgetSlotsAndLocalFilter` / `getCombinedDownstreamValuesForWidget`; `_KDB.filters.cascading.helpers.getActiveDownstreamFilterContext`. Re-applied at multiple points (after setWidgetFilter, after TopN, after dimension change).
- **tableData / helper tables:** TopN uses hidden List query tables from `dataTablesPad`, per-tab `widgetIndex`; `awaitForTableData`.
- **History:** **Not present in widgets tree** — no add/drop/replay step code here. (The recently-viewed `handleDienststelleHistoryReplay.js` lives under `dashboard/filters/...`, not widgets.)
- **Parameter-set restore (writeback):** `wbParameterSetWidgetsHelpers.setWidgets` re-drives the orchestrator from saved `settings`/`data`; relies on `parameterSetRestoreRunId` claim semantics + per-tab widgetIndex for TopN.

---

## 8. Behaviors present here, likely MISSING/changed in a REDESIGN2 attempt (key value of this tree)

1. **Per-tab `widgetIndex` for concurrent TopN hidden tables.** TopN claims a specific table in `dataTablesPad` by `widgetIndex`; parameter-set restore increments a per-tab counter. A redesign that drops the index will let parallel restores grab the same hidden table → wrong/empty TopN.
2. **Launchpad "claim" race protection (`data-kdb-claimed-run` + `parameterSetRestoreRunId`).** Legacy always took `widgetsArray[0]`; this tree explicitly claims/releases so concurrent async placements don't collide. Easy to silently lose.
3. **Deterministic hierarchy-downstream RE-APPLY at three points** (after `setWidgetFilter`, after `setTopN`, after dimension change) using canonical pageContext scope id (`model..._00000000`, NOT the child dropbox `_00000001`). A redesign applying it once will "lose" the downstream filter after TopN/re-render.
4. **TopN ↔ dimension coupling + guard.** TopN requires a grouping dimension; changing dimension to default/none auto-resets TopN UI + removes its local filter; a German info toast explains the guard. Plus `top2`/`Top 2`→`top-2` normalization for restored values.
5. **Title composition + aggregation-type decimals.** `alterVisTitle` builds `display (aggType) nach <dim> <Top-N>`, adds kennzahl URL link, syncs tooltip; decimals derived from aggregation type with List "max of two" rule and percent override. Fine-grained and easy to under-implement.
6. **Render-never-hang discipline.** Multiple `Promise.race` timeouts (3s ready, 12s render, 8s prognose `progFull`) + loading-anim watchdog so a stalled Cognos render never freezes restore/UI.
7. **Post-drop legend hash-prefix cleanup** (`a#b`→`b`) via MutationObserver, run only on-canvas (never in launchpad).
8. **`resetWidget` = take-back (not destroy):** disconnects legend observer, clears local filters + slots, releases claim, restores text/header to default — a redesign treating delete as a plain DOM removal will leak observers/filters/registry entries.
9. **PKZ drillthrough**: CTRL-key buffered selection capture window (3s) + BW/DEZPV hierarchy "highest-wins" rewrite into report URL params — a large, self-contained behavior likely simplified/dropped.

---

## 9. Recommended canonical KDB2 source file per concern

| Concern | Canonical file |
|---|---|
| Orchestration / type resolution | `widgets/widgetsOrchestrator.js` |
| Helper wiring / namespace | `widgets/widgetHelpers.js` |
| Toolbar → action dispatch | `widgets/helpers/widgetToolbarButtonListenersHelpers.js` |
| Settings dropdowns (text+vis) | `widgets/helpers/widgetDropdownOptionHandlersHelpers.js` |
| Canvas placement / size | `widgets/helpers/widgetCanvasPlacementHelpers.js` |
| Launchpad claim / identity | `widgets/helpers/widgetLaunchpadHelpers.js` |
| Reset / take-back / move / resize | `widgets/helpers/widgetActionsHelpers.js` |
| Text type (font/restyle/icons/text) | `widgets/textWidgets/textWidgetHelpers.js` (+ orchestrator) |
| Vis lifecycle | `widgets/visWidgets/visWidgetOrchestrator.js` + `visData/visDataOrchestrator.js` |
| Slot plan + apply | `widgets/visWidgets/visData/helpers/visDataSlotsHelpers.js` |
| Widget-local + downstream filters | `widgets/visWidgets/visData/helpers/visDataDownstreamFilterHelpers.js` |
| Datasource | `widgets/visWidgets/visData/helpers/visDataDatasourceHelpers.js` |
| Layout props + hard cleanup | `widgets/visWidgets/visData/helpers/visDataWidgetLifecycleHelpers.js` |
| Legend/tooltip | `widgets/visWidgets/visData/helpers/visDataLegendAndTooltipHelpers.js` |
| Title | `widgets/visWidgets/helpers/visWidgetTitleHelpers.js` |
| TopN (descriptor + resolution) | `widgets/visWidgets/helpers/visWidgetTopNHelpers.js` |
| Drillthrough | `widgets/visWidgets/addPkzDrillthrough.js` |

---

## 10. Open questions for round 2

1. **History/launchpad-take/parameter-set** live OUTSIDE widgets/ (dragAndDrop, writeback, dashboard/filters). For the 4-type meta-architecture, should the redesign pull history-adapter + launchpad bridge into the widget layer, or keep them external as KDB2 does? Need a survey of `wbParameterSetWidgetsHelpers` + `dragAndDropLifecycleHelpers` to map the full create→live→launchpad→destroy contract.
2. **datatable as a 1st-class type:** KDB2 has no datatable type — "List" is a vis subtype and TopN reuses a hidden List table. Is the new `datatable` type meant to formalize List, or is it a new grid? Determines whether slot code is shared with vis or forked.
3. **topN as type vs modifier:** KDB2 folds topN into vis (settings + hidden-table resolution). The target taxonomy lists topN as a type — is it a standalone widget or a vis decorator? Big structural decision.
4. **Settings model:** `_widgetObj.settings` is the de-facto serializable contract but it is read from DOM (`KDB_optionSelected`) in many places. Round 2 should define the authoritative settings schema vs DOM.
5. **`visDataLegendAndTooltipHelpers.js` (~858 lines, sampled only):** needs a full read to extract the legend/tooltip/observer contract before redesign.
6. **`_KDB.filters.hierarchy.helpers` API** (applyDominant…, applyDownstreamToWidgetSlotsAndLocalFilter, getCombinedDownstreamValuesForWidget) is consumed but defined elsewhere — its contract is central to vis correctness and must be surveyed.
7. **Cognos API surface** (`cognosAPIFunctions`) is the real coupling layer; a binding/adapter inventory is needed to know what the redesign must re-expose per type.

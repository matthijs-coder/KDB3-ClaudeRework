# JS-on-ramp — module map

Levende inhoudsopgave van productie-JS. **Begin hier**, niet in `contracts/`.

Bron: live `KDB3/js/KDB.js` (register 44–65, mount 67–95, destroy 131–176). Bijwerken wanneer een orchestrator in `KDB.js` landt. First-week-tabel gepromoveerd uit `readability-maintainability.md` §6.1–6.2 (niet herschreven).

Zoekgewoonte: open van die module `config/actions.js` of `config/actionTypes.js`. Dat is de echte TOC.

---

## Stamps (liegen niet meer)

| Leugen | Waarheid |
|---|---|
| `core/bootstrap/` | **Bestaat niet.** Boot is `KDB.js`. |
| Eén `cognosHost` | Drie verschillende folders: `core/cognosHost/` (chrome-selectors) ≠ `core/services/cognosHost/` (`_KDB.services.cognosHost`, ring 1) ≠ `core/cognosAPI/` (`_KDB.cognosAPI`, inner SDK). |
| `_KDB.api.widgets` | **Bestaat niet** (0 hits in `KDB3/js`). Zes APIs: `widgetBase` / `widgetSettings` / `widgetText` / `widgetVis` / `widgetDataTable` / `widgetTopN`. |
| `_KDB.api.canvas` | Live. Folder `dashboard/canvas/pageSurface/` (niet de groepsmap `dashboard/canvas/`). kdbControl stuurt intents via `settingsPostDispatchSideEffects.js` → `_KDB.api.canvas.dispatch`. Contract: `contracts/pageSurface.md`. |
| `_KDB.services.writeback` | **Bestaat niet.** Vier keys: `writebackGet` / `writebackSet` / `writebackMap` / `writebackBridge`. **Set = restore-orchestrator**, geen cache. |

---

## First week — wil je X, open Y

De zes kaarten (week één):

| Wil je… | Open (pad t.o.v. `KDB3/js/`) |
|---|---|
| De modulelijst / boot | `KDB.js` |
| Filterfamilie-routing | `dashboard/filters/filterDock/config/ownerRoutes.js` |
| Tab delete/move/duplicate | `dashboard/tabs/actions/runTabMutationSaga.js` |
| Settings-gevolgen | `dashboard/widgets/widgetSettings/config/intentDispatchMap.js` |
| Opgeslagen dashboard terugzetten | `core/services/writeback/set/effects/runNormalRestore.js` |
| Undo/redo-handlers | `core/services/collectReplayHandlers.js` |

Als je X wilt wijzigen, begin in Y, publiek Z:

| Ik wil wijzigen… | Folder | Publiek |
|---|---|---|
| Filterwaarde na dock-confirm | `dashboard/filters/filterDock/` + owner | `_KDB.api.filterDock` observeert; **bezit geen values**. Dispatch `"<owner>/filterDockStateChanged"` |
| Tab delete/move/duplicate | `dashboard/tabs/actions/runTabMutationSaga.js` | `_KDB.api.tabs.dispatch` — tabs schrijft geen filter/widget-state |
| Parameter set restore | `core/services/writeback/set/` (`runNormalRestore.js` = faselijst) | `_KDB.services.writebackSet` → `"<owner>/parameterSetRestoreRequested"` |
| Widget drop / launchpad | dragDrop `publishValidatedDrop` → `widgetBase/handleDropCreate` / `handleTakeFromLaunchpad` | `_KDB.api.dragDrop` / `_KDB.api.widgetBase`. Launchpad is parkeerplaats, niet de drop-workflow |
| Vis binding naar Cognos | `widgetVis/effects/continueBindingPlanAndApply.js` | `_KDB.api.widgetVis` → `_KDB.services.widgetBindingPlan` (puur) + `widgetBindingApply` |
| Undo/redo | `core/services/historyService` + `<module>/history/` | `_KDB.services.history`; chrome: `_KDB.api.historyControls`; registry: `collectReplayHandlers.js` |
| Header/footer | `dashboard/header/`, `dashboard/footer/` | `_KDB.api.header` / `footer` |
| Control-paneel | `dashboard/canvas/kdbControl/` | `_KDB.api.kdbControl` |
| Dashboard page size / achtergrond | `dashboard/canvas/pageSurface/` | `_KDB.api.canvas` (niet de groepsmap `canvas/`) |
| Tab-activatie side-effects | fact `tabs:changed` (`observeActiveTab.js`) | Een van de weinige echte bus-paden |
| PDF export | `pdfExportControls` + `dashboardPdf` | `_KDB.api.pdfExportControls` + `_KDB.services.dashboardPdf` |
| Cognos host-call (feature / writeback / andere service) | owner `effects/read*Facet.js`; how-to `contracts/cognosHostService.md` §0 + `.cursor/rules/cognos-adapter.mdc` | stamp `_KDB.runtime.<owner>.*Facet` — **niet** `_KDB.cognosAPI` |
| Cognos SDK-wrapper (nieuwe host-chain) | `core/cognosAPI/<theme>.js` | `_KDB.cognosAPI` — alleen ring 1 (`core/services/cognosHost/`) belt dit |
| App wiring / mountvolgorde | `KDB.js` | Geen `core/bootstrap/` |

Ook: `_KDB.services.tableData`, `_KDB.services.loading`, `_KDB.services.message`, `_KDB.api.metricsTree`, `_KDB.api.authoring`.

---

## Drie termen (niet in `lifecycleVocabulary.md`)

| Term | Betekenis in één zin |
|---|---|
| **tabMutation** | Live saga voor delete/move/duplicate. Content permuteert over **vaste Cognos-slots**. Roept geen `writebackSet.restore`. |
| **parameterSet** | Opgeslagen dashboard-snapshot (compact v3 JSON). Restore is photo-per-position, niet “volg deze tab-identiteit.” |
| **filterDock** | Observer/router over Cognos filter-UI. Bezit geen filterwaarden. Routes via `ownerRoutes.js`. |

Native multi-select confirm (OK in de dock) mag state schrijven via `nativeMultiSelect/tabMutationScopeWrite` — **die naam liegt** (geen tab-mutatie; Cognos schreef de host al; wij snapshotten `byScope`).

Meer tribal vocab: `readability-maintainability.md` §6.2.

---

## Modules — bron `KDB.js`

Volgorde = `registerFeatureModules` (authoring komt uit `setupCoreFactories` en mount zichzelf).

| Module | Folder | Publiek | Eén zin |
|---|---|---|---|
| *(boot)* | `KDB.js` | klasse `KDB` / `getAPI().render` | Enige eerlijke inhoudsopgave: register, mount, destroy. |
| authoring | `core/authoring/` | `_KDB.api.authoring` | Cognos uiState → enter/exit. Feature in core; mount vóór services. |
| header | `dashboard/header/` | `_KDB.api.header` | Kop: presence, titel, inline edit. |
| footer | `dashboard/footer/` | `_KDB.api.footer` | Voet: presence, header-gated. |
| tabs | `dashboard/tabs/` | `_KDB.api.tabs` | Tab-identiteit **+** tabMutation-saga. Kaart: `runTabMutationSaga.js`. |
| kdbControl | `dashboard/canvas/kdbControl/` | `_KDB.api.kdbControl` | Dashboard-stuurpaneel in `.KDB3Widget`. `canvas/` blijft groepsmap. |
| pageSurface | `dashboard/canvas/pageSurface/` | `_KDB.api.canvas` | Cognos page size + achtergrond. Intents van kdbControl. Geen state-subtree. |
| historyControls | `dashboard/controls/historyControls/` | `_KDB.api.historyControls` | Undo/Redo-knoppen (chrome). Stack: `_KDB.services.history`. |
| pdfExportControls | `dashboard/controls/pdfExportControls/` | `_KDB.api.pdfExportControls` | PDF-knop → `dashboardPdf`. |
| launchpad | `dashboard/launchpad/` | `_KDB.api.launchpad` | Verborgen parkeerplaats voor widgets. |
| widgetBase | `dashboard/widgets/widgetBase/` | `_KDB.api.widgetBase` | Frame: id, plaats, launchpad, move/resize. Geen base-class. |
| widgetSettings | `dashboard/widgets/widgetSettings/` | `_KDB.api.widgetSettings` | Tandwielpaneel + control values. Kaart: `intentDispatchMap.js`. |
| widgetText | `dashboard/widgets/widgetText/` | `_KDB.api.widgetText` | Editable tekst, geen binding. |
| widgetVis | `dashboard/widgets/widgetVis/` | `_KDB.api.widgetVis` | Visualisatie-inhoud + binding-pipeline. |
| widgetDataTable | `dashboard/widgets/widgetDataTable/` | `_KDB.api.widgetDataTable` | Gemonteerde stub; dispatch is no-op. |
| widgetTopN | `dashboard/widgets/widgetTopN/` | `_KDB.api.widgetTopN` | Vis-helper, geen droppable widget. State keyed op `ownerVisId`. |
| dragDrop | `dashboard/canvas/dragDrop/` | `_KDB.api.dragDrop` | HTML5 drag-sessie; maakt geen widgets. |
| metricsTree | `dashboard/metricsTree/` | `_KDB.api.metricsTree` | Kennzahlen-jsTree in kdbControl-DOM. |
| filterDock | `dashboard/filters/filterDock/` | `_KDB.api.filterDock` | Dock observer + registry. **Geen** filter-owner. |
| singleSelect | `dashboard/filters/singleSelect/` | `_KDB.api.singleSelect` | Generieke popup/host I/O. |
| dienststelle | `dashboard/filters/dienststelle/` | `_KDB.api.dienststelle` | Hierarchiefilter, Sicht-gebonden. |
| sicht | `dashboard/filters/sicht/` | `_KDB.api.sicht` | Policy-owner globaal Sicht; delegeert host naar singleSelect. |
| specialSingleSelect | `dashboard/filters/specialSingleSelect/` | `_KDB.api.specialSingleSelect` | Rights-gated PG/DSL; delegeert host. |
| nativeMultiSelect | `dashboard/filters/nativeMultiSelect/` | `_KDB.api.nativeMultiSelect` | Unowned native multi-selects. |

Geen `_KDB.api.filters`, geen `_KDB.api.widgets`, geen `_KDB.api.properties`. `_KDB.api.canvas` is pageSurface, niet de groepsmap `dashboard/canvas/`.

---

## Services — bron `core/services/__orchestratorServices.js`

| Service | Folder | Publiek | Eén zin |
|---|---|---|---|
| cognosHost | `core/services/cognosHost/` | `_KDB.services.cognosHost` | Cognos-SDK achter acht Outcome-facets. |
| tableData | `core/services/tableData/` | `_KDB.services.tableData` | Table-query cache, abort, rows. |
| loading | `core/services/loadingService/` | `_KDB.services.loading` | Overlay start/finish. |
| message | `core/services/messageService/` | `_KDB.services.message` | Toast / alert / confirm / choose. |
| widgetBindingPlan | `core/services/widgetBindingPlan/` | `_KDB.services.widgetBindingPlan` | Pure spec → plan. Geen destroy in `KDB.js`. |
| widgetBindingApply | `core/services/widgetBindingApply/` | `_KDB.services.widgetBindingApply` | Plan uitvoeren op Cognos. |
| dashboardPdf | `core/services/dashboardPdf/` | `_KDB.services.dashboardPdf` | PDF-export **+** filter-appendix-saga. |
| history | `core/services/historyService/` | `_KDB.services.history` | Undo/redo-stack + writeback-baseline. |
| writebackGet | `core/services/writeback/get/` | `_KDB.services.writebackGet` | State → compact v3 (collectors). |
| writebackSet | `core/services/writeback/set/` | `_KDB.services.writebackSet` | **Restore-orchestrator** (v3 → owners). Kaart: `runNormalRestore.js`. |
| writebackMap | `core/services/writeback/map/` | `_KDB.services.writebackMap` | Legacy → v3 mapping. |
| writebackBridge | `core/services/writeback/` | `_KDB.services.writebackBridge` | `window.top` WBParameterGet/Set-globals. |

Replay-handlers worden **tweemaal** gebonden (`KDB.js` na kdbControl-mount en na nativeMultiSelect-mount).

---

## Overige core (geen dashboard-feature)

| Folder | Surface | Eén zin |
|---|---|---|
| `core/cognosHost/` | selectors via `registerCognosHostSelectors` | Chrome-catalogus + miss-checks. **Niet** de service. |
| `core/cognosAPI/` | `_KDB.cognosAPI` | Inner SDK-encyclopedie. Enige plek met `__getDashboardAPI()`. |
| `core/config/` | `_KDB.config` | Config + frozen `parameterMap`-dump. |
| `core/css/` | injecteert `KDB3/css/` | Href-injectie. |
| `core/events/` | `_KDB.events` | Bus in de constructor. `authoringMode.js` = twee event-naamconstanten (live imports, geen dode leftover). |
| `core/properties/` | `_KDB.properties` | Report-properties. Destroy: `runtime.properties.controller`. |
| `core/utils/` | `_KDB.utils` | sleep/throttle/wait + helpers. `core/utils/filters/tabMutationRun/` woont op schijf maar staat **niet** op `_KDB.utils`. |

---

## Stale contracts (niet herschrijven — niet als kaart gebruiken)

| Bestand | Waarom stale | Gebruik in plaats daarvan |
|---|---|---|
| `contracts/tabs.md` | Status Draft; phase-1 **defert** move/delete. Live tabs doen dat al. | `runTabMutationSaga.js` |
| `contracts/widgetSettings.md` | Draft; noemt `commitDimension` / `commitVisType` / `commitColour`. | `intentDispatchMap.js` |
| `contracts/nativeMultiSelect.md` §6 | Folderlijst is plat `actions/*.js`; live tree heeft `actions/tabMutation/` en `actions/parameterSet/`. | Live `nativeMultiSelect/` + `config/actions.js` |
| `contracts/pageContextPlain.md` | Status **Superseded**. | `nativeMultiSelect` (v3-bucket `filt.pcfs`) |

`eventSubscribe.md` is geen human map voor confirm / tab-move / settings — dat zijn dispatch-sagas, geen bus-events.

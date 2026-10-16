# Communiqué Aan Planner-AI — Widgets Domain Architecture Direction
## Context
Doel is het porten van legacy widgetgedrag naar het nieuwe KDB3-redesign, waar state ownership, runtime ownership, public APIs, service boundaries en module folders strak gereguleerd zijn.
Legacy laat zien dat er functioneel maar twee actieve widgetfamilies zijn:
- `text`
- `visualization` / live widgets
`topN` is in legacy geen zelfstandig widget-type, maar een visualization-capability die een verborgen LIST/datatable-helper gebruikt. `datatable` is vooral een passieve LIST/table-widget: na dashboardstart naar launchpad brengen, later uitlezen of als TopN-helper gebruiken.
De nieuwe architectuur mag bewuster modelleren dan legacy, maar moet niet per ongeluk legacy-helperconstructies verheffen tot zelfstandige productmodules.
## Beslissingen Tot Nu Toe
### 1. Eén `widgets` Feature-Module
We kiezen voor één `widgets` feature-module als canonical owner van:
```txt
_KDB.state.widgets
_KDB.runtime.widgets[widgetId]
_KDB.api.widgets
Deze module bezit:

widget identity / registry
lifecycle
initial route-all-to-launchpad na dashboardstart
canvas placement na canvas:dropValidated
launchpad send/take/cleanup
settings mount/unmount integratie
widget history steps + replay handlers
dispatch boundary voor downstream updates zoals Dienststelle
Reden: deze concerns zijn cross-type. Als text, visualization, topN en datatable aparte feature-modules met eigen state-writers worden, raakt de registry versnipperd en ontstaat spanning met de canonical writer rule voor _KDB.state.widgets.

2. Subsystemen Binnen widgets
Voorgestelde interne structuur:

widgets/
  text/
  visualization/
  topN/
  datatable/
  settings/
  placement/
  launchpadBridge/
  history/
  state/
  runtime/
  effects/
  createWidgetsController.js
  __orchestratorWidgets.js
text en visualization zijn de echte actieve widgetfamilies.

topN wordt een eigen subsysteem vanwege zijn eigen complexiteit, maar blijft conceptueel een capability van visualization.

datatable krijgt hoogstens een kleine subfolder voor classificatie, launchpad routing, helper-marker/claim-gedrag en read integration. Het wordt geen eigen feature-module.

3. datatable Geen Eigen Module
Datatable is in deze planning passief:

na dashboardstart naar launchpad;
eventueel uitleesbaar via bestaande data-services;
eventueel claimbaar als TopN-helper;
geen eigen lifecycle-interactie voor de gebruiker behalve algemene widget lifecycle;
geen eigen settings/drag/drop productgedrag in deze tranche.
Daarom geen:

_KDB.api.datatable
_KDB.state.datatable
_KDB.runtime.datatable
Wel registry entries onder widgets:

_KDB.state.widgets.byId[datatableWidgetId]
De data zelf hoort bij:

_KDB.services.tableData
en later eventueel hierarchyDataService als hierarchy-data nodig blijkt.

4. TopN Als Eigen Subsystem, Niet Eigen Top-Level State
TopN krijgt een eigen subsystem omdat het veel zelfstandige logica heeft:

resolution state-machine;
helper-table claim/release;
helper LIST/table configuratie;
flat-data uitlezen;
stored-values shortcut bij history/replay;
stale/supersession guards;
cleanup versus persistent claim;
Jahr/aggregation/hierarchy rewrite regels;
teruggeven van topNResultValues en topNExcludeItemId.
Maar TopN krijgt geen eigen top-level state:

_KDB.state.topN   // niet doen
TopN-state blijft onder _KDB.state.widgets, omdat de canonical writer widgets blijft en TopN altijd gekoppeld is aan concrete widget-instances.

5. Widget Registry Per widgetId, Niet Per Type
Voorkeur voor:

_KDB.state.widgets.byId[widgetId]
niet:

_KDB.state.widgets.visualization[widgetId]
_KDB.state.widgets.topN[widgetId]
_KDB.state.widgets.datatable[widgetId]
Redenering:

Alle fysieke Cognos widgets hebben een widgetId, launchpad-placement, lifecycle, cleanup, possible history footprint en DOM/runtime-koppeling. Daarom is widgetId de primaire registry-as.

Type/role hoort als veld in de entry:

{
  widgetId: "w1",
  kind: "visualization" | "text" | "datatable",
  role: "primary" | "topNHelper",
  ownerWidgetId: null | "visualizationWidgetId"
}
Voor een visualization met TopN-helper betekent dat:

_KDB.state.widgets.byId[visualizationWidgetId]
_KDB.state.widgets.byId[topNHelperTableWidgetId]
De helper-table is dus een eigen registry-entry omdat hij fysiek een echte Cognos/List widget is. Maar hij is geen zelfstandig product-widget. De relatie wordt expliciet vastgelegd:

_KDB.state.widgets.byId[visualizationWidgetId].topN = {
  helperWidgetId: "topNHelperTableWidgetId",
  resolution: { /* pending/error/result metadata */ }
};
_KDB.state.widgets.byId[topNHelperTableWidgetId].role = "topNHelper";
_KDB.state.widgets.byId[topNHelperTableWidgetId].ownerWidgetId = visualizationWidgetId;
DOM/launchpad mag dit spiegelen met KDB-owned attributes, bijvoorbeeld:

data-kdb-widget-id="<widgetId>"
data-kdb-widget-role="topNHelper"
data-kdb-topn-owner-widget-id="<visualizationWidgetId>"
Maar DOM is niet de bron van waarheid; state is canoniek.

Planner-AI: heroverweeg deze keuze expliciet. Vooral de vraag: is de TopN-helper-table voldoende "eigen widget" om sibling te zijn in widgets.byId, of moet de helper volledig als child-resource onder de visualization leven? Onze voorkeur is sibling-by-id met expliciete owner-relatie, omdat dit beter past bij launchpad routing, cleanup, helper-claiming, diagnostics en fysieke Cognos widget identity.

6. Settings Als Widgets-Submodule
Settings wordt geen top-level module/service.

Settings-submodule bezit:

settingsbar bouwen/plaatsen;
iconen/dropdowns tonen;
state-to-UI sync;
click/dropdown intent normaliseren;
focus/open/close lifecycle van settings UI.
Settings voert de businessactie niet zelf uit. Een klik vertaalt naar een widgets-dispatch/action, waarna de juiste subsystem-owner handelt:

text edit/font/layout/colour → widgets/text
visualization type/dimension/sequences/title/layout/colour → widgets/visualization
topN keuze → widgets/topN via visualization flow
reset/send-to-launchpad → widgets lifecycle/launchpadBridge
Reden: settings is UI/control surface, geen eigenaar van widgetgedrag.

7. Twee Services Voor Binding
We kiezen bewust voor twee gescheiden services:

slotPlanService
widgetBindingService
slotPlanService
Pure planning service:

geen DOM;
geen Cognos calls;
geen _KDB.state.widgets writes;
input: widget settings, data config, hierarchy snapshot, TopN result, visualization type;
output: declaratief slot/filter/binding plan.
Deze service kan unit-testbaar en deterministic zijn.

widgetBindingService
Cognos apply/render service:

datasource zetten;
visType zetten;
slots clearen/vullen;
widget-local filters toevoegen/vervangen/verwijderen;
render triggeren/wachten;
eventueel helper-table configure/read stappen ondersteunen;
returnt resultaat/diagnostics.
Belangrijke grens: widgetBindingService mag geen productbeslissingen nemen. Het beslist niet:

welk widget-type iets is;
of history gepusht wordt;
of een widget naar launchpad moet;
of Dienststelle relevant is;
welke settings canoniek worden;
welke widgets door een downstream change geraakt zijn.
Dat blijft bij widgets/visualization of widgets/topN.

8. Visualization Flow
Visualization is de eigenaar van live-widget productgedrag:

settings interpreteren;
dataConfig bepalen;
Dienststelle/hierarchy snapshot ontvangen/verwerken;
TopN-resolution aanvragen indien nodig;
slotPlanService aanroepen;
widgetBindingService aanroepen;
na succesvolle apply state mirroren;
history pushen;
cleanup/title/legend/tooltip laten lopen.
TopN geeft dus data terug aan visualization. TopN past niet zelfstandig de visible visualization-widget state als productbeslissing aan buiten de widgets-owner flow.

9. TopN Flow
Voorkeursflow:

visualization setting / dienststelle change / history replay
  -> widgets/visualization determines reconfigure need
  -> widgets/topN resolves helper result if topN active
  -> topN returns topNResultValues + topNExcludeItemId
  -> visualization builds full binding input
  -> slotPlanService builds plan
  -> widgetBindingService applies plan/render
  -> widgets mirrors confirmed settings/history
TopN praat dus "heen en terug" met visualization, maar blijft binnen widgets.

10. Dienststelle Flow
Akkoord: Dienststelle praat met widgets/visualization, niet direct met TopN of planner-service.

Voorkeursrichting:

dienststelle
  -> _KDB.api.widgets.dispatch({ type: "widgets/dienststelleChanged", ... })
  -> widgets/visualization determines affected visualization widgets
  -> visualization may request TopN resolution where required
  -> visualization calls slotPlanService + widgetBindingService
Niet:

dienststelle -> topN
dienststelle -> slotPlanService
slotPlanService -> dienststelle
Reden: Dienststelle is een filter-owner. Slot planning moet expliciete input krijgen, geen foreign state gaan ophalen. Visualization is de juiste plek om domain context samen te brengen.

11. Launchpad / Canvas Ownership
Launchpad blijft environment owner: pads, slots, helper tabs, metadata.

Widgets bezit:

initial route-all-to-launchpad;
taking widgets from launchpad;
sending widgets back to launchpad;
cleanup before parking;
DOM movement of widget elements;
final canvas placement after dragDrop validated payload;
widget layout state/history.
DragDrop blijft alleen validated drop intent + coordinate evidence leveren.

12. History
History blijft bij historyService.

Widgets doet:

serializable widget_* committed steps pushen;
replay handler bijdrage stagen onder _KDB.runtime.widgets;
replay via widgets public API/eigen owner flow;
geen direct foreign state writes door historyService.
Belangrijke likely step keys:

widget_canvasDrop
widget_launchpadTransfer
widget_layoutMove
widget_layoutResize
widget_colourChange
widget_layoutChange
widget_textEdit
widget_liveVisualizationTypeChange
widget_liveDimensionChange
widget_liveSequencesChange
widget_liveTopNChange
Planner-AI moet toetsen welke keys in de eerste tranche echt nodig zijn.

Open Vragen Aan Planner-AI
Bevestig of widgets.byId[widgetId] als primaire registry-as beter is dan per-type state nesting.
Heroverweeg expliciet de TopN-helper-relatie:
sibling registry entry met role:"topNHelper" + ownerWidgetId;
of child-resource onder visualization. Onze voorkeur is sibling-by-id met expliciete owner-relatie.
Bevestig de servicegrens:
slotPlanService puur;
widgetBindingService voor Cognos apply/render;
geen lifecycle/history/productbeslissingen in services.
Bevestig of datatable passief genoeg is om geen eigen feature-module te krijgen.
Bepaal of _KDB.api.visualizationWidget als compat-facet nodig blijft voor Dienststelle, of dat Dienststelle direct wordt omgebogen naar _KDB.api.widgets.dispatch.
Bepaal de eerste port-roadmap:
widgets skeleton + registry/runtime;
launchpad route-all/send/take;
text drop/settings;
visualization drop/settings/basic binding;
slotPlanService/widgetBindingService;
TopN subsystem;
history replay.
Communiqué V2 Aan Planner-AI — Widgets Architectuur Na Review
Context
Na jouw feedback hebben we de richting aangescherpt. De hoofdkeuze blijft: één publieke widgets feature-module als canonical owner van widget identity, lifecycle, placement, launchpad movement, runtime cleanup en history. Binnen die module willen we echter grote, module-achtig gestructureerde submodules gebruiken voor de verschillende widget-domeinen.

Belangrijk: met submodule bedoelen we hier géén publieke feature-module.

Een widgets submodule mag:

een eigen folder hebben;
een eigen orchestrator/controller/effects/state/view structuur hebben;
intern groot en zelfstandig georganiseerd zijn;
door de parent widgets controller via injected facades worden aangeroepen.
Een widgets submodule mag niet:

een eigen _KDB.api.<submodule> publiceren;
een eigen top-level _KDB.state.<submodule> bezitten;
foreign callers direct op interne files laten leunen;
buiten de canonical widgets-writers om _KDB.state.widgets muteren.
De publieke owner blijft dus:

_KDB.api.widgets
_KDB.state.widgets
_KDB.runtime.widgets
Terminologie
Voorgestelde taal:

widgets feature-module
widgets submodules
shared services
Voorbeelden:

widgets/text
widgets/visualization
widgets/topN
widgets/datatable
widgets/settings
widgets/placement
widgets/launchpadBridge
widgets/history
Deze submodules mogen qua ordening lijken op normale modules, maar ownership-wise blijven ze intern onder widgets.

Structuurvoorstel
widgets/
  __orchestratorWidgets.js
  createWidgetsController.js
  state/
  runtime/
  config/
  effects/
  text/
    __orchestratorTextSubmodule.js
    createTextSubmoduleController.js
    state/
    view/
    effects/
  visualization/
    __orchestratorVisualizationSubmodule.js
    createVisualizationSubmoduleController.js
    state/
    view/
    effects/
  topN/
    __orchestratorTopNSubmodule.js
    createTopNSubmoduleController.js
    state/
    effects/
    adapters/
  datatable/
    __orchestratorDatatableSubmodule.js
    createDatatableSubmoduleController.js
    effects/
  settings/
    __orchestratorSettingsSubmodule.js
    createSettingsSubmoduleController.js
    view/
    effects/
  placement/
  launchpadBridge/
  history/
Alle externe communicatie loopt via _KDB.api.widgets.dispatch(...).

Services: Bewuste Vroege Promotie
We hebben jouw feedback besproken over de regel dat services normaal pas gepromoot worden bij een tweede onafhankelijke feature-consumer. We kiezen hier bewust voor een CP-1-beslissing om twee services toch nu al echt als services neer te zetten:

_KDB.services.slotPlan
_KDB.services.widgetBinding
Motivatie:

visualization en topN zijn geen kleine helpers, maar grote zelfstandige widgets-submodules.
Ze gebruiken dezelfde binding-infrastructuur op verschillende Cognos targets:
visualization op de zichtbare live widget;
topN op de helper LIST/datatable widget.
De binding-pipeline is architectonisch kritisch genoeg om een expliciet contract, named-method API en testbare grens te verdienen.
Als dit intern blijft, wordt de widgets-module te snel een grote module met verborgen infrastructuur.
De services blijven strikt infrastructureel en nemen geen product-, lifecycle-, history- of launchpadbeslissingen.
Belangrijke grens:

slotPlanService is puur:

input -> declaratief plan -> output
Geen Cognos, geen DOM, geen state writes.

widgetBindingService doet Cognos apply/render:

datasource
visType
slots
local filters
render/wait
diagnostics/mirrorPatch result
Maar schrijft niet naar _KDB.state.widgets.

De canonical state commit blijft bij widgets/visualization of de parent widgets writer-flow.

State Model
We nemen de feedback over lifecycle volledig over.

Geen legacy lifecycle-termen zoals:

active
inLaunchpad
removed
als canonical lifecycle gebruiken.

Nieuwe state split:

{
  lifecycle: "idle" | "initializing" | "loading" | "ready" | "error" | "disposed",
  placementStatus: "onCanvas" | "inLaunchpad" | "removed",
  kind: "text" | "visualization" | "datatable",
  role: "primary" | "topNHelper",
  ownerWidgetId: null | "visualizationWidgetId"
}
placementStatus of vergelijkbare domeinstatus is widgets-owned state, maar geen lifecycle-vocabulaire. Exacte naam mag planner/CP-1 toetsen.

Registry Per WidgetId
We blijven bij:

_KDB.state.widgets.byId[widgetId]
Niet:

_KDB.state.widgets.text[widgetId]
_KDB.state.widgets.visualization[widgetId]
_KDB.state.widgets.topN[widgetId]
Reden:

alle fysieke Cognos widgets hebben een echte widgetId;
launchpad routing, cleanup, placement, diagnostics en history zijn per widget-id;
type/role zijn velden, geen primaire nesting-as;
dit houdt één registry en één canonical writer.
TopN Helper Relatie
We nemen jouw aanscherping over: de TopN-helper-table is een sibling byId entry met een reversibele role overlay, geen child-resource die door visualization wordt gemaakt/vernietigd.

Voorbeeld:

_KDB.state.widgets.byId[visualizationWidgetId] = {
  kind: "visualization",
  role: "primary",
  topN: {
    helperWidgetId: "helperListWidgetId",
    resolutionStatus: "pending" // domeinstatus, geen lifecycle
  }
};
_KDB.state.widgets.byId[helperListWidgetId] = {
  kind: "datatable",
  role: "topNHelper",
  ownerWidgetId: visualizationWidgetId,
  placementStatus: "inLaunchpad"
};
Constraints:

claim/release is reversibel;
cleanup van de visualization vernietigt de helper niet;
claim release en helper cleanup zijn gescheiden;
“geen helper beschikbaar” wordt expliciete TopN resolution-state/diagnostic, geen stille legacy-fail;
DOM attributes mogen de relatie spiegelen voor debug/claim-hulp, maar state blijft canoniek.
State Vs Runtime Voor Pending/Supersession
We nemen over: serialiseerbare operatie-markers mogen in _KDB.state.widgets, maar runtime resources horen in _KDB.runtime.widgets[widgetId].

State mag bijvoorbeeld bevatten:

pending operation kind
last error code
confirmed settings
resolution diagnostic
Runtime bevat:

AbortController
Promise references
Cognos handles
render cycle tokens
sequence ownership tokens
DOM refs/listeners
We willen één coherent supersession-mechanisme ontwerpen, niet legacy’s mix van cycleId, mySeq en topN sequenceId blind porten. CP-1 moet bepalen hoe dit runtime-contract eruitziet.

Settings
settings wordt een widgets-submodule, geen service en geen publieke module.

Settings bezit:

settingsbar bouwen/plaatsen;
iconen/dropdowns tonen;
open/close/focus gedrag;
UI sync vanuit state;
clicks vertalen naar intents.
Settings schrijft nooit canonical widget state. Businessuitvoering ligt bij:

widgets/text
widgets/visualization
widgets/topN
widgets/launchpadBridge
Dienststelle Flow
Akkoord met jouw feedback: geen _KDB.api.visualizationWidget behouden als aparte publieke surface.

Dienststelle wordt omgebogen naar:

_KDB.api.widgets.dispatch({
  type: "widgets/dienststelleChanged",
  payload: { ... }
});
Flow:

dienststelle
  -> widgets/visualization
  -> eventueel widgets/topN resolution
  -> slotPlanService
  -> widgetBindingService
  -> widgets commit state/history
Niet:

dienststelle -> topN
dienststelle -> slotPlanService
slotPlanService -> dienststelle
Datatable
Voor deze tranche blijft datatable passief.

Wel:

byId registry entry;
kind "datatable";
launchpad routing;
eventueel helper role voor TopN;
uitleesbaar via tableDataService.
Niet:

_KDB.api.datatable
_KDB.state.datatable
_KDB.runtime.datatable
Een latere echte grid/datatable-productambitie kan als uitbreiding van widgets/datatable landen zonder de registry opnieuw te ontwerpen.

Niet Porten / Bewust Verbeteren
Niet blind porten:

multi-cased kdb_* / KDB_* DOM-soup als structurele fallback;
module-global drillthrough buffers;
jQuery .data() history snapshots;
legacy lifecycle-termen als canonical lifecycle.
Verbetering:

settings UI schrijft nooit state;
confirmed apply-flow schrijft settings pas na succesvolle apply;
runtime buffers zoals drillthrough-selectie gaan onder _KDB.runtime.widgets[widgetId].
Gates Voor CP-1 / Roadmap
Voor implementatie zijn contractbeslissingen nodig voor:

widgets module contract.
slotPlanService contract.
widgetBindingService contract.
DragDrop canvas:dropValidated subscriber boundary.
Launchpad deferred widget movement boundary.
History replay handler registratie voor widget_* keys.
Dienststelle contract-delta: visualizationWidget placeholder vervangen door _KDB.api.widgets.dispatch.
Voorgestelde roadmap:

0. Contract-delta's en service/module contracts
1. widgets skeleton + byId registry + runtime buckets + lifecycle/placementStatus
2. launchpad route-all/send/take
3. text drop/settings end-to-end
4. visualization drop/settings/basic binding
5. slotPlanService + widgetBindingService
6. topN submodule + helper claim/resolution
7. history replay voor geselecteerde widget_* keys
MVP-history keys pas kiezen nadat de binding-flow staat. widget_live* keys hoeven niet allemaal in de eerste tranche.

Open Vragen Aan Planner-AI
Bevestig de term widgets submodule met bovenstaande definitie.
Toets of placementStatus de juiste naam is voor onCanvas | inLaunchpad | removed, of dat een andere domeinstatusnaam beter is.
Bevestig vroege promotie van slotPlanService en widgetBindingService als expliciete CP-1-uitzondering op de normale promotion trigger.
Bevestig het sibling-byId TopN-helper model met reversibele role overlay.
Toets het ene supersession-mechanisme: wat hoort in state, wat in runtime?
Bevestig dat visualizationWidget als publieke API verdwijnt ten gunste van _KDB.api.widgets.dispatch.
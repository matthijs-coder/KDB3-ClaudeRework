Writeback Service — Projectplan (KDB3)
Onderzoek is afgerond op basis van twee parallelle analyses: de huidige KDB3-architectuur (_____________KDB3API/KDB3/js) en de originele writeback-implementatie (laatsteOriginal/KDB2/js/writeback). Dit document is het planningsdocument — geen code.

1. Doel en scope
We bouwen een writeback service met drie publieke functies, analoog aan het origineel:

Functie	Doel
get
Huidige dashboardstaat vastleggen in een compact, serialiseerbaar object (JSON)
set
Een get-object (of gemapt legacy-object) terugzetten op het dashboard
map
Oude writeback-parametersets vertalen naar het huidige Cognos-pakket / KDB3-datamodel
Extern contract (Cognos-compatibel):

window.top.WBParameterGetFunction() → JSON-string
window.top.WBParameterSetFunction(json, status) → void (async side effects)
WBParameterMapFunction(obj, KDB) → intern, aangeroepen vanuit set
2. Architectuurvergelijking
Origineel (KDB2) — monolithisch, DOM-gedreven
WBParameterGetFunction
  → moveToFirstTabAndBack → canvas → tabs → globalFilters → header → footer → config → widgets → JSON
WBParameterSetFunction
  → parse → WBParameterMapFunction → resetKDB → canvas/header/footer → filters → dienststelle orchestrator → widgets → tabs → config
WBParameterMapFunction
  → universalize (KID-tokens) → de-universalize (parameterMapping) → Sicht-normalisatie
State zat verspreid over _KDB.cognosAPIFunctions, jQuery DOM-reads, _KDB.tabsObj, _KDB.filters.*, en widgetsOrchestrator.

Huidig (KDB3) — modulair, reducer-gedreven
_KDB
├── state.*          ← serialiseerbare domein-state (per module reducer)
├── runtime.*        ← DOM, observers, pending promises (niet serialiseren)
├── api.*            ← mount / dispatch / getState per feature
├── services.*       ← cross-cutting (history, tableData, bindingPlan/Apply)
└── cognosAPI.*      ← Cognos Dashboard API facade
Belangrijk verschil: KDB3 heeft al snapshot/restore-patronen (history replay, vis settings, dienststelle hierarchy snapshot), maar geen end-to-end parameter-set service. Writeback is expliciet uitgesteld in contracten (WBParameterSet.md, dienststelle.md CP-3).

3. Aanbevolen module-plaatsing
core/services/writeback/
├── createWritebackService.js       ← publieke API
├── effects/
│   ├── collectDashboardState.js    ← GET aggregator
│   └── applyRestorePlan.js         ← SET orchestrator
├── mappers/
│   ├── mapLegacyPayload.js         ← MAP (KID universalize/de-universalize)
│   ├── mapKdbStateToParameterSet.js
│   └── mapParameterSetToRestorePlan.js
└── config/
    └── parameterSetSchema.js       ← versie + velddefinities
Waarom core/services/: writeback is cross-cutting over filters, widgets, kdbControl, header, tabs en Cognos PageContext — vergelijkbaar met historyService en widgetBindingApply.

Optioneel: dunne facade _KDB.api.writeback voor UI-integratie (save/load dropdown).

4. Datamodel — GET output
Strategie: hybride model
Combineer het originele JSON-schema (backward compat voor Cognos writeback + opgeslagen sets) met KDB3-interne selectors waar die efficiënter zijn.

Voorgesteld top-level schema (v1):

{
  version: "1.0",                    // NIEUW — ontbreekt in origineel
  canvas: { width, height },
  tabs: { [index]: { id, name, position, visible, pageContextFilterObjArr } },
  globalFiltersObj: { [tableName]: { [filterItemId]: FilterState } },
  topHeader: { turnedOn, text?, icon? },
  bottomFooter: { turnedOn },
  configuration: { dashboardWidth, dashboardHeight, ... },
  widgets: { [widgetId]: WidgetState }
}
Efficiëntie-principes voor GET:

Geen widgetEl DOM-referenties (zoals origineel)
Geen runtime/derived state (widgetVis.byId.derived — opnieuw berekend na restore)
Geen history stack
Skip writebackTable, host widget, launchpad/hidden widgets (zoals origineel)
Parallel verzamelen waar modules onafhankelijk zijn (widgets per tab)
Mapping KDB3-bronnen → GET-velden
GET-veld	KDB3 bron
canvas
_KDB.state.kdbControl.settings.dashboard + cognosAPI.canvas.getCanvasPropertyValue
tabs
cognosAPI.tabs + launchpad state + page-context per tab
globalFiltersObj
cognosAPI.filters + api.sicht/dienststelle/singleSelect.getState()
topHeader / bottomFooter
api.header.getState() + footer state
configuration
_KDB.state.kdbControl.settings (dashboard, controlPanel, defaultsNew)
widgets
widgetBase.getState().byId + widgetSettings.getState().byWidget + widgetText.getState().byId + Cognos slots/visType
5. GET — implementatieplan
Fase G1: Infrastructuur
Service registreren via __orchestratorServices.js
parameterSetSchema.js met versie "1.0"
Globale exposure: window.top.WBParameterGetFunction
Fase G2: Domein-collectors (parallel uitvoerbaar)
Collector	Prioriteit	Complexiteit
Canvas size
P1
Laag — bestaande kdbControl state + Cognos API
Configuration
P1
Laag — _KDB.state.kdbControl.settings
Top header / footer
P1
Laag — header/footer API state
Global filters
P1
Hoog — async datasource lookup, Sicht/Dienststelle/singleSelect
Tabs + page-context
P2
Hoog — tab visibility, filters per tab
Widgets
P2
Hoog — placement, settings, slots, local filters
Fase G3: Edge cases (origineel-aligned)
moveToFirstTabAndBack: Cognos rendert niet alle tabs tenzij je er doorheen navigeert. Bij save via #saveParameterSet: eerste tab → wacht 8,5s → terug. Alternatief in KDB3: tab traversal via cognosAPI.tabs zonder DOM-truc (te valideren).
Widget-exclusies: writebackTable, shapes, lege live widgets, launchpad widgets
widgetEl strippen vóór serialisatie
Acceptatiecriteria GET
Output is valide JSON-string, parseerbaar door set
Round-trip: set(get()) herstelt visueel equivalent dashboard (binnen tolerantie)
Geen DOM/runtime properties in output
Performance: < 5s voor typisch dashboard (widgets parallel)
6. SET — implementatieplan
Kernprincipe: restore via bestaande dispatch-paden
Set mag niet direct Cognos muteren buiten de bestaande module-flows om — anders race conditions, incomplete binding, en inconsistent state.

Restore-volgorde (origineel-aligned, KDB3-aangepast)
1. Loading start
2. map(payload)                          ← WBParameterMapFunction
3. Set restore flags                     ← parameterSetRestoreActive, parameterSetRestoreRunId
4. Reset dashboard                       ← widgets weg, filters leeg
5. Canvas size                           ← kdbControl dispatch
6. Header / footer                       ← header/footer dispatch
7. Empty all filters                     ← filter helpers
8. Global filters (excl. Dienststelle)   ← sicht, singleSelect via dispatch
9. Page-context filters per tab          ← cognosAPI.filters
10. Cascading downstream visibility      ← sicht effects
11. Dienststelle restore                 ← restoreDienststelleFromParameterSet (NIEUW)
12. Single-select re-init                ← singleSelect replay
13. Widgets                              ← widgetBase + widgetSettings + widgetVis pipeline
14. Tabs (visibility, names)             ← tabs + launchpad
15. Configuration UI                     ← kdbControl settings inputs
16. Clear restore flags + loading finish
Status-waarden (origineel contract)
Status	Gedrag
"notDefaultParamSet"
Direct restore
"default" / "defaultParamSet"
Wacht op ready; skip bij URL parameterId
"newDashboard"
Reset naar leeg dashboard met defaults
"sichtChange"
Restore met Sicht-change semantics
Domein-specifieke restore entry points (nieuw te bouwen)
Module	Entry point	Contract-ref
Dienststelle
restoreDienststelleFromParameterSet
WBParameterSet.md TODO
Widget base
restoreWidgetsFromParameterSet
widgetBase.md — buiten scope CP
Widget settings
applyCommittedSettingsBatch
Hergebruik history restore batch
kdbControl
settings dispatch
Bestaande reducer actions
Sicht
startup default / confirmed commit
Bestaande dispatch
SingleSelect
replayCommittedSelection
Bestaande history handler
Kritieke gaps t.o.v. KDB3 huidige staat
Gap	Impact	Prioriteit
restoreDienststelleFromParameterSet ontbreekt
Dienststelle restore faalt
P0
Hierarchy validation bij restore (CP-3 deferred)
BW old-to-new mapping
P0
_KDB.api.canvas.dispatch niet geïmplementeerd
Canvas size restore incompleet
P1
parameterSetRestoreRunId race protection ontbreekt
Widget claim conflicts
P1
WritebackTabel load: false
Geen CRUD op opgeslagen sets
P2 (later)
History stack reset bij restore
Onduidelijk gedrag
P2 (beslissing nodig)
Acceptatiecriteria SET
Laadt opgeslagen JSON zonder console errors
Filters, widgets, tabs, header/footer visueel correct
Dienststelle hierarchy correct na restore (incl. BW/DEZPV switch)
Default parameter set + URL parameterId guard werkt
Discard-confirm flow bij dropdown change
"newDashboard" reset werkt
7. MAP — implementatieplan
Strategie: KID-token universalize/de-universalize (1:1 port)
Origineel gebruikt _KDB.widgetProperties.parameterMapping als bron van truth voor huidige pakket-identifiers. KDB3-equivalent moet worden gedefinieerd (waarschijnlijk core/config/parameterMapping.js of properties namespace).

Transformatiestappen
1. buildParameterSetMapping(savedObj)
   → reversed map: KID → originele concrete waarde
2. Early return als datasource_name_KID ongewijzigd
   → skip volledige remap, fix alleen Sicht sourceId/itemId
3. universalizeParameterSet(savedObj, savedMap)
   → property names + string values → ***KID*** tokens
4. deUniversalizeParameterSet(universalized, currentMap)
   → tokens → concrete waarden huidig pakket
5. Sicht-normalisatie
   → dedupe, behoud saved Sicht indien geldig, anders default
KID-categorieën (uit origineel)
Token	Voorbeeld
datasource_name_KID
Personal_Fakten_KDB_TM1
{label}_filter_KID
filter itemId
{label}_filter_use_KID
filter use-value base
Dienststelle_BW_level001_filter_use_KID
hierarchy levels
kennzahlenTable_KID
widget metric table
widget_datasource_id_KID
widget datasource
{label}_slots_KID
vis slot column IDs
Uitzonderingen (niet mappen): localFilters, selectedOptions.dimension

Acceptatiecriteria MAP
Oude parameter set van pakket A laadt correct op pakket B
Early return bij zelfde pakket (performance)
Onbekende KID → zichtbare sterren (debugging)
Sicht altijd geldig na map
8. Fasering — aanbevolen implementatievolgorde
2026-06-21
2026-06-28
2026-07-05
2026-07-12
2026-07-19
2026-07-26
2026-08-02
2026-08-09
2026-08-16
2026-08-23
2026-08-30
2026-09-06
2026-09-13
2026-09-20
Contract + parameterMapping config
Service skeleton + registratie
Canvas + config + header collectors
Filter + tab collectors
Widget collector + integratie
moveToFirstTab + edge cases
KID mapping port
Sicht normalisatie + early return
Reset + canvas + header/footer
Filter restore (excl. Dienststelle)
Dienststelle restore orchestrator
Widget restore pipeline
Tabs + config + status flows
Cognos writeback wiring
Round-trip tests
WritebackTabel CRUD (optioneel)
Fase 0 — Voorbereiding
Fase 1 — GET
Fase 2 — MAP
Fase 3 — SET
Fase 4 — Integratie
Writeback Service — implementatiefasen
Fase 0 — Voorbereiding (blocker voor alles)
Contract delta: WBParameterSet.md status van Deferred → Draft
parameterMapping config in KDB3 definiëren (port van _KDB.widgetProperties.parameterMapping)
Service skeleton registreren
Beslissing: history stack resetten bij restore?
Fase 1 — GET (kan parallel met MAP-voorbereiding)
Bottom-up: eenvoudige collectors eerst, widgets als laatste.

Fase 2 — MAP
Port van originele helpers; kan starten zodra GET-schema vaststaat.

Fase 3 — SET (langste fase)
Dienststelle restore is de kritieke path — expliciet uitgesteld in CP-3, nu nodig:

restoreDienststelleFromParameterSet met hierarchy validation alleen bij restore
BW old-to-new ID mapping (mapOldToNewAlways: true)
Fase 4 — Integratie
Cognos #saveParameterSet / #selectParameterSet wiring
Interne callers (tab delete/copy, Sicht change, PDF export)
WritebackTabel load: true + CRUD (optioneel)
9. Open beslissingen (product/architectuur)
#	Vraag	Opties	Aanbeveling
Q1
Schema-versie toevoegen?
Ja ("1.0") / Nee (legacy compat)
Ja — expliciet veld, map kan oude sets zonder versie behandelen
Q2
History stack bij restore?
Reset / Behoud / Snapshot
Reset — voorkomt undo naar pre-restore state
Q3
moveToFirstTabAndBack vervangen?
DOM-truc / Cognos tab API traversal
Valideren — Cognos API-first indien betrouwbaar
Q4
Canvas restore via kdbControl of canvas module?
kdbControl dispatch / canvas.dispatch implementeren
kdbControl — settings al daar; canvas.dispatch is nog stub
Q5
WritebackTabel in scope?
Fase 4 / Later
Later — GET/SET/MAP eerst zonder CRUD
Q6
Launchpad state in GET?
Ja / Nee
Nee — origineel slaat launchpad niet op; widgets op canvas only
Q7
Dienststelle hierarchy validation
Alleen bij restore (CP-3)
Bevestigen — per WBParameterSet.md
10. Risico's
Risico	Ernst	Mitigatie
WidgetId-instabiliteit na reset
Hoog
parameterSetRestoreRunId + orchestrator re-drive (legacy patroon)
Dienststelle restore complexiteit
Hoog
Aparte tranche; eigen contract + tests
Cognos tab rendering bij GET
Medium
moveToFirstTabAndBack of API-traversal
Binding pipeline timing bij SET
Medium
Wacht op contentReady + dienststelle gate (bestaande widgetVis gates)
Backward compat oude parameter sets
Medium
MAP met KID-tokens + safety nets (tab0 visible, default Sicht)
_KDB.api.canvas.dispatch stub
Medium
Canvas restore via kdbControl + direct cognosAPI
11. Afhankelijkheden per domein
writeback service
├── cognosAPI (filters, tabs, canvas, widgets, visualization)
├── api.kdbControl (settings restore)
├── api.header / api.footer
├── api.sicht (filter restore)
├── api.dienststelle (+ NIEUW: restoreFromParameterSet)
├── api.singleSelect (replay)
├── api.widgetBase (placement restore)
├── api.widgetSettings (committed settings batch)
├── api.widgetVis (binding pipeline na settings)
├── api.widgetText (text content)
├── api.launchpad (tab/slot routing)
├── services.widgetBindingPlan + widgetBindingApply
├── config.parameterMapping (NIEUW)
└── config.tables.writeback (WritebackTabel — later)
12. Volgende stap
Voordat implementatie start, zijn 3 productbeslissingen nodig:

Bevestig fasering — akkoord met Fase 0→1→2→3→4 volgorde?
Beantwoord Q1–Q7 (§9) — vooral history reset en schema-versie
Contract delta — WBParameterSet.md activeren en Dienststelle restore scope formaliseren
Daarna kan de eerste implementatietranche starten met Fase 0 + GET collectors (canvas, config, header) — laag risico, direct testbaar, en levert het datamodel op waar MAP en SET op bouwen.

Wil je dat ik per fase gedetailleerde acceptatiecriteria + testscenario's uitwerk, of eerst de open beslissingen (§9) doorlopen?

jij lijkt voor te stellen dat we het parameterSave object aanpassen aan de vorm uit de oude legacy code. Dat wil ik niet. Ik wil dat we een vorm bedenken die volwaardig duidelijk en efficient (zo klein mogelijk is) is omdat we deze parametersets in datawarehouse moeten opslaan. minder ruimte kosten is beter.  



er moet dus een substantiele maping functie komen voor de vertaling. De oude mapping code kon oude, oude code vertalen naar oude code, nu moet er dus waarschijnlijk een mogelijkheid komen om zowel oude, oude alswel oude code naar de nieuwe variant te mappen.  

Goed punt — ik bekijk eerst wat er in KDB3 al aan state/selectors bestaat, zodat we een compact nieuw formaat kunnen ontwerpen in plaats van het legacy-schema te hergebruiken.

Je hebt gelijk — mijn eerdere plan ging ten onrechte uit van backward compat op het legacy JSON-schema. Dat is de verkeerde richting voor jullie doel (datawarehouse-opslag, minimale footprint). Hier is een herzien architectuurvoorstel.

Correctie van de richting
Legacy formaat is opslag-onvriendelijk omdat het:

Cognos-interne IDs opslaat (sourceId, itemId, dataSource.id, slot column IDs)
Display-waarden dubbel opslaat (u + d per filterwaarde)
Lange property-namen herhaalt (globalFiltersObj, pageContextFilterObjArr, valuesArray)
Per widget tab-metadata dupliceert (tab.id, tab.name, tab.index)
Metric-metadata over-volledig is (code, display, langtext, tooltip, kennzahlenTable)
CSS-strings opslaat ("1800px") i.p.v. getallen
Geen defaults weglaat — alles wordt altijd weggeschreven
De oude map was bovendien niet een schema-translator: het was een pakket-migratie binnen hetzelfde schema (KID-tokens via universalize / deUniversalize). Dat is maar één laag van wat jullie nu nodig hebben.

Nieuwe scheiding: drie lagen
Laag	Verantwoordelijkheid	Input → Output
get
Huidige staat → KDB3 compact format (v3)
dashboard → { v: 3, ... }
set
Alleen v3 terugzetten
v3 object → dashboard
map
Alle legacy formats → v3
v0/v1/v2 → v3 object (daarna set)
                    ┌─────────────┐
  Oude-oude set ──► │             │
  Oude KDB2 set ──► │    map()    │──► v3 object ──► set() ──► dashboard
  (DWH import)      │             │
                    └─────────────┘
  Huidig dashboard ──► get() ──► v3 object ──► DWH opslag
  DWH restore      ──► set(v3) ──► dashboard
set accepteert dus nooit legacy direct — alleen v3. Map wordt de substantiële vertaallaag.

Ontwerpprincipes voor v3 (compact + duidelijk)
1. Semantische keys, geen Cognos IDs
Sla op wat de business betekenis is, niet wat Cognos vandaag toevallig als ID heeft:

Filter: "Sicht" → "BW" (useValue), niet [TM1].[...].[Sicht].[Sicht].[BW]
Dienststelle: hiërarchie-pad of level-waarden via KID-labels (Dienststelle_BW_level001_filter_use_KID), niet ruwe TM1-member strings
Metric: "metricCode" alleen, niet display/langtext/tooltip
Vis: "BAR" + "dimension" + "topNChoice" — precies wat buildWidgetVisSettingsSnapshot al gebruikt
Cognos IDs worden bij restore opgezocht via config (parameterMapping, filter definitions, tables).

2. Defaults weglaten (delta-encoding)
Alleen afwijkingen opslaan t.o.v. defaults uit kdbControl/state/initialState.js en widget dropdown defaults:

// Default dashboard 1800x800, wit — niet opslaan als identiek
// Alleen: { "ds": { "h": 900 } }  als hoogte afwijkt
3. Korte, stabiele property-namen
Twee opties (productbeslissing):

Optie A	Optie B
Korte keys in JSON (v, cv, fl, wg)
Normale keys in JSON (version, canvas, filters, widgets)
Kleinste blob per rij
Leesbaarder, iets groter
Aanbeveling voor DWH: A voor de blob; schema-document in DWH-metadata (kolomdefinities)
4. Arrays i.p.v. objecten waar volgorde vastligt
Widgets per tab als array (geen widgetId als key — die verandert bij restore):

// v3 widget entry (vis)
[tabIdx, x, y, w, h, "METRIC_CODE", "BAR", "SUM", "5"]
// text widget
[tabIdx, x, y, w, h, "t", "comment text", fontSize?, colour?]
Of typed object met korte keys — arrays zijn compacter maar minder self-documenting.

5. Geen redundantie
Tab-info één keer in tabs[], niet per widget
Filter display values (d) niet opslaan — bij restore afleiden of alleen u gebruiken
registeredWidgets niet opslaan — afleidbaar uit widget-lijst
6. Expliciete versie + optioneel compressie-hint
{
  "v": 3,
  "pkg": "Personal_Fakten_KDB_TM1",   // datasource context voor map-validatie
  "cv": [1800, 800],                   // canvas [w,h] — getallen, geen "px"
  "ds": { /* delta settings */ },
  "hd": { "on": 1, "t": "Titel" },    // header
  "ft": { "on": 0 },
  "fl": { /* filters compact */ },
  "tb": [ /* tabs */ ],
  "wg": [ /* widgets */ ]
}
Geschatte besparing t.o.v. legacy: 60–80% op een typisch dashboard (vooral door weglaten defaults, IDs, display-duplicaten en metric-metadata).

Voorgestelde v3-structuur (concept)
{
  "v": 3,
  "pkg": "Personal_Fakten_KDB_TM1",
  "cv": [1800, 800],
  "ds": {
    // alleen afwijkende kdbControl settings
    "db": { "bg": "#f0f0f0" },
    "cp": { "btn": "#333" },
    "dn": { "vis": { "w": 500, "h": 350 } }
  },
  "hd": { "on": 1, "t": "Dashboard titel", "i": "icon.png" },
  "ft": { "on": 0 },
  "fl": {
    "si": "BW",                                    // Sicht useValue
    "di": {                                        // Dienststelle
      "k": "Dienststelle_BW",                      // activeFilterKey
      "g": ["MAG", "00123456"],                    // global scope path (useValues)
      "p": { "0": ["level1val"], "2": ["x","y"] }   // pageContext per tabIdx, indien nodig
    },
    "ss": [                                        // overige single-select filters
      { "id": "Altersgruppe", "s": "g", "v": ["18-25"] }
    ]
  },
  "tb": [
    { "n": "Tab 1", "vis": 1, "pc": [ /* tab page-context filters compact */ ] },
    { "n": "Tab 2", "vis": 0 }
  ],
  "wg": [
    // [tabIdx, x, y, w, h, type, ...typeSpecific]
    [0, 100, 50, 400, 300, "vis", "Umsatz", "BAR", "SUM", "5"],
    [0, 520, 50, 300, 150, "txt", "Toelichting", 14, "#fff"],
    [1, 50, 50, 600, 400, "vis", "Kosten", "LINE", "AVG", "10", "#eee"]
  ]
}
get bouwt dit direct vanuit KDB3 selectors (widgetSettings snapshot, dienststelle resolution, kdbControl.settings, etc.) — niet via legacy Cognos DOM-reads.

set parsed v3 → intern restore plan → bestaande dispatch-paden.

Map: substantiële multi-generatie vertaling
De map-functie wordt een pipeline met adapters, niet één KID-swap:

geen v
globalFiltersObj + widgets
v: 3
Raw payload uit DWH/Cognos
detectSourceFormat
Adapter: legacy-old v0/v1
Adapter: KDB2 v2
Pass-through
Normalized intermediate
Semantic mapper
KDB3 v3 object
Output voor set
Drie bronformaten (voorstel)
Format	Herkenning	Waarschijnlijke bron
v0/v1 (oude-oude)
Geen v, andere widget-structuur, remapByStringify-cube keys
Oudste opgeslagen sets in DWH
v2 (oude KDB2)
globalFiltersObj, widgets[widgetId].slots, configuration.dashboardWidth
laatsteOriginal writeback output
v3 (nieuw)
"v": 3
Nieuwe get()-output
Per adapter wat het doet
Adapter v0/v1 → normalized:

Hergebruik concept remapByStringify (string-replace over JSON) voor cube/package renames
Normaliseer naar v2-achtige tussenstructuur (intern, niet opslaan)
Adapter v2 → v3:

globalFiltersObj → compact fl.si, fl.di, fl.ss
configuration + canvas → delta ds + cv
widgets[widgetId] → wg[] arrays; strip dataSource, slots column IDs → resolve via metric code + vis defaults
tabs → compact tb[]; page-context filters meenemen in tb[].pc of fl
Dienststelle: hierarchy levels → fl.di.g path via KID-mapping
Semantic mapper (alle paden):

Pakket/datasource: parameterMapping (KID → concrete waarde)
Filter IDs: Cognos itemId → semantisch filter label/key
Metric codes: validatie tegen metrics table
Dienststelle hierarchy: BW old-to-new (mapOldToNewAlways) — pas hier, niet in normale filter flows (CP-3)
Slot column IDs → vis type + dimension (inverse van binding plan)
Wat hergebruiken uit legacy map-code
Legacy	Hergebruik	Niet hergebruiken
buildParameterSetMapping
KID-extractie logica
Output-formaat
universalize / deUniversalize
Token-strategie voor pakket-migratie
Als eindformaat
Sicht-normalisatie
Dedupe + default fallback
—
remapByStringify
v0/v1 cube rename adapter
—
Early return bij zelfde pakket
Performance in semantic layer
—
get / set / map contract (herzien)
Functie	Input	Output	Doel
get
_KDB
v3 JSON-string (compact, delta-encoded)
Opslaan in DWH
set
v3 object (+ status)
void
Restore
map
elke legacy raw payload
v3 object
Migratie / oude sets laden
Cognos writeback-compat: Cognos roept historisch WBParameterGetFunction / WBParameterSetFunction aan. Opties:

Thin wrapper: Cognos-functies roepen intern get/set aan; bij load via dropdown → map(raw) → set(v3)
DWH-first: Cognos writeback slaat v3 op; dropdown leest v3 direct
DWH-overwegingen
Naast compact JSON:

Kolom schema_version (int) naast blob — snelle filtering zonder parse
Kolom pkg (datasource) — voor map-validatie en partitionering
Optioneel: gzip/compress op blob (extra 50–70% bij grote sets)
Later: genormaliseerde star schema (header + filter rows + widget rows) als queries op filterwaarden nodig zijn — start met compact JSON blob
Open ontwerpkeuzes voor jou
Korte keys (A) vs leesbare keys (B) in de blob zelf?
Widget als array-tuple vs kort object — tuples zijn kleiner, objecten zijn debug-vriendelijker
localFilters per widget — opslaan in v3 of afleiden bij restore? (legacy sloeg ze op maar mapte ze niet)
Welke legacy-generaties exact in DWH? — hebben jullie voorbeelden van “oude-oude” sets? Dat bepaalt of v0-adapter nodig is of alleen v2→v3
Display values (d) nooit opslaan — akkoord? (restore gebruikt alleen useValue)
Cognos WBParameterGetFunction — moet die nog legacy JSON teruggeven voor backward compat, of mag die direct v3 worden?
Samenvatting
Je instinct klopt: v3 is een nieuw, compact, semantisch datamodel aligned met KDB3 state (widgetSettings snapshot, dienststelle resolution, kdbControl.settings) — niet een copy van KDB2 writeback JSON.

map wordt de zware module: schema-adapters (v0, v2 → v3) plus semantic translation (KID, pakket, hierarchy, metric/slot resolution). De oude map-code levert building blocks voor de semantic laag, niet het eindformaat.

Als je wilt, kan ik in een volgende stap een formeel v3 schema-document (veld-voor-veld met types, defaults, en verplicht/optioneel) uitwerken — nog steeds zonder code — inclusief een mapping-matrix v2→v3 per veld.

is het verstandig om 1 service of 3 services te maken? Voor de compactheid en onderhoudbaarheid neig ik naar 3. wat denk jij?

Even kijken hoe KDB3 services nu registreert, zodat het advies aansluit bij jullie patronen.

Je neiging naar 3 is verstandig — met één belangrijke nuance: drie modules/services, één gedeeld schema-contract. Niet drie volledig losse eilanden.

Kort antwoord
Ja, 3 aparte services/modules — dat past bij KDB3 (vergelijk widgetBindingPlan + widgetBindingApply) en bij de aard van get/set/map. Niet één monolithische writebackService.js met alles erin.

Maar wel een gedeelde writeback/schema-laag, anders drijft het v3-formaat uit elkaar tussen get en map.

Waarom 3 beter is dan 1
Aspect	get	set	map
Richting
Alleen lezen
Alleen schrijven/orchestreren
Alleen transformeren
Complexiteit
Collectors, parallel
Reset + dispatch-volgorde + gates
Legacy-adapters + KID + semantic mapping
Dependencies
Licht (selectors, cognosAPI read)
Zwaar (bijna alle api.*)
Zwaar maar ander (legacy code, parameterMapping)
Wanneer nodig
Elke save
Elke restore
Alleen migratie / oude DWH-sets
Testen
Snapshot-tests op v3 output
Integratie/restore-tests
Fixture per legacy-versie
set hoeft legacy niet te kennen — dat is de grootste winst voor onderhoud. set = “ik krijg geldig v3, ik zet het dashboard terug”. Punto.

map hoeft het dashboard niet te muteren — pure functie: raw → v3. Ideaal voor unit tests met JSON-fixtures uit het datawarehouse.

Dat is precies de scheiding die je wilt als map substantieel wordt (v0, v2 → v3).

Waarom niet 3 volledig losse services zonder shared core
Het gevaar bij “3 services, elk hun eigen schema”:

get schrijft fl.si, map produceert filters.sicht → set faalt stilletjes
defaults-delta encoding verschilt per service → DWH-blobs inconsistent
Validatie gedupliceerd → dubbel onderhoud
Gedeeld contract (verplicht):

core/services/writeback/
├── schema/                    ← SINGLE SOURCE OF TRUTH
│   ├── v3Schema.js            types, defaults, validate, normalize
│   └── detectSourceFormat.js
├── get/
│   └── createWritebackGetService.js
├── set/
│   └── createWritebackSetService.js
├── map/
│   ├── createWritebackMapService.js
│   └── adapters/              v0, v2, semantic
└── __orchestratorWriteback.js ← registreert alles
get en map produceren v3; set consumeert v3. Beide gebruiken dezelfde validateV3() / normalizeV3().

Registratie op _KDB: 3 services of 1 namespace?
KDB3 registreert nu aparte services per concern:

_KDB.services.widgetBindingPlan
_KDB.services.widgetBindingApply
_KDB.services.history
Aanbeveling — zelfde patroon:

_KDB.services.writebackGet   // { collect() → v3 }
_KDB.services.writebackSet   // { restore(v3, status) }
_KDB.services.writebackMap   // { toV3(raw) → v3 }
Alternatief (ook oké):

_KDB.services.writeback = { get, set, map }
Drie top-level keys is iets consistenter met widgetBindingPlan/widgetBindingApply. Het maakt in de praktijk weinig verschil — kies één stijl en houd die aan.

Dependency-richting (belangrijk)
schema  ◄───  get
schema  ◄───  map
schema  ◄───  set
map  ──X──►  set     (geen directe import)
get  ──X──►  set     (geen directe import)
Caller bepaalt de keten:

// Nieuw
const v3 = await writebackGet.collect();
await writebackSet.restore(v3);
// Oud uit DWH
const v3 = writebackMap.toV3(rawLegacy);
await writebackSet.restore(v3);
set roept niet automatisch map aan bij onbekende versie — liever een expliciete fout (UNSUPPORTED_SCHEMA_VERSION) zodat je weet dat map gemist is.

Cognos-compat (window.top)
Legacy verwacht WBParameterGetFunction / WBParameterSetFunction. Dat is een dunne wiring-laag (4–5 regels per functie), geen vierde service:

WBParameterGetFunction → writebackGet.collect() → JSON.stringify
WBParameterSetFunction → detect format → map.toV3() indien nodig → set.restore()
Die wiring mag in __orchestratorWriteback.js of een apart cognosWritebackBridge.js — geen businesslogica.

Wanneer 1 service wél zinnig zou zijn
Alleen als:

team zeer klein is,
map klein blijft (alleen v2→v3, geen oude-oude),
en jullie bewust alles in één bestand willen houden.
Gezien jullie eisen (DWH-compact v3, multi-generatie map, substantiële vertaling) is dat scenario onwaarschijnlijk.

Conclusie
Keuze	Oordeel
1 monolithische service
Afgeraden — map vervuilt set, legacy koppelt aan restore
3 services + gedeeld schema
Aanbevolen — past bij KDB3, scheidt verantwoordelijkheden, map testbaar in isolatie
3 services zonder shared schema
Afgeraden — schema-drift
Je instinct klopt. Formuleer het als: “3 services, 1 contract” — drie implementaties, één v3-schema als bindmiddel.

Als je wilt, kan ik hierna de exacte publieke API per service (methoden, input/output, foutcodes) uitschrijven — nog steeds zonder code.

ik weet niet hoe intelligent jij bent / wat jouw model is. Dit onderdeel is zeer belangrijk in het project. Ik wil daarom jouw bevindingen met een zwaarder model delen. ik denk er aan om al jouw output te delen. willen we de planner daarna nog iets meer meegeven? willen we dat de planner nog investigation subagnets aanstuurt voor verdere investigation?  

Je vraag gaat over proces en handoff, niet over code — dat beantwoord ik direct.

Wat ik ben (eerlijk)
Ik ben Auto, een agent-router in Cursor. Voor dit gesprek heb ik vooral planner- en synthesewerk gedaan: subagents laten verkennen, bevindingen samenvoegen, architectuurkeuzes formuleren. Dat is geschikt voor orientatie en richting; voor een kritisch, detailrijk ontwerp (formeel v3-schema, mapping-matrix per legacy-versie, restore-volgorde met edge cases) is een zwaarder model als prima ontwerper/implementeerder een verstandige keuze.

De subagent-onderzoeken waren solide maar niet exhaustief — ze zijn een goede basis, geen volledige due diligence.

Alles delen, of cureren?
Niet blind alles dumpen. De zwaardere agent raakt dan verdrinkend in context en herhaalt onderzoek.

Wel delen: een handoff-pakket met vaste structuur:

#	Document	Inhoud
1
Beslissingen ( vastgelegd )
Geen legacy-formaat; compact v3 voor DWH; 3 services + gedeeld schema; set accepteert alleen v3; map doet v0/v2→v3
2
Open beslissingen
Lijst hieronder — expliciet “nog niet besloten”
3
Architectuur-synthese
KDB3-modulair model, _KDB.state/api/services, restore via dispatch
4
Legacy-synthese
Oude get/set/map flows, KID-mapping, restore-volgorde, status-waarden
5
Gap-lijst
o.a. restoreDienststelleFromParameterSet, canvas.dispatch stub, WritebackTabel load: false
6
Voorgestelde module-structuur
writeback/schema, get, set, map
7
Concept v3-schema
Compact model uit ons gesprek (nog geen formeel contract)
Optioneel bijvoegen: ruwe subagent-rapporten als appendix — alleen als de zwaardere agent iets moet verifiëren, niet als hoofdleesstof.

Moet de planner daarna nog iets meegeven?
Ja — expliciete opdracht + productinput. Zonder dat gaat het zwaardere model aannames doen.

A. Opdracht aan het zwaardere model (1 alinea)
Bijvoorbeeld:

“Lever een implementatie-ready ontwerp voor writeback: formeel v3-schema, publieke API per service (get/set/map), mapping-matrix v2→v3 (en v0 indien samples), restore-orchestratie voor set, faseplan met acceptatiecriteria. Geen code tenzij expliciet gevraagd. Respecteer KDB3-patronen (core/services, dispatch-paden, contracten).”

B. Productbeslissingen die jij (of PO) moet invullen
Zonder deze blijft het ontwerp hangen:

Korte keys vs leesbare keys in de DWH-blob
Widget-encoding: array-tuples vs kort object
localFilters per widget: opslaan of afleiden bij restore?
Display values (d): nooit opslaan — ja/nee?
History stack bij restore: resetten?
Cognos WBParameterGet/SetFunction: direct v3 of wrapper met map?
Scope map: alleen v2→v3, of ook “oude-oude” — heb je DWH-voorbeelden?
Prioriteit: eerst get+schema, of parallel map voor migratie?
C. Constraints (hard)
Geen legacy JSON als opslagformaat
set = alleen v3
map = enige legacy-ingang
Dienststelle-restore + hierarchy-validatie alleen bij restore (CP-3 / WBParameterSet.md)
Bestaande api.*.dispatch-paden hergebruiken, geen directe Cognos-bypass
D. Wat het zwaardere model niet hoeft te doen
Volledige KDB3-codebase opnieuw in kaart brengen
Legacy writeback regel voor regel porten
WritebackTabel CRUD in fase 1 (tenzij jij dat wilt)
Nog investigation-subagents door de planner?
Gericht ja, niet breed opnieuw.

Brede exploratie (“hele architectuur”) is grotendeels klaar. Extra subagents wel zinvol voor blokkerende gaten vóór detailontwerp:

Onderzoek	Waarom	Output
Legacy DWH-samples
v0/v2 adapters zijn speculatie zonder echte payloads
2–3 anonymized JSON + veldverschillen
parameterMapping in KDB3
Map hangt hieraan; onduidelijk of het al bestaat
Locatie, shape, vs legacy KID-lijst
Restore-paden per domein
set-orchestratie moet exact op dispatch aansluiten
Per domein: welke action/API, volgorde, bestaande replay handlers
Cognos writeback wiring
Extension/UI-contract
Waar worden get/set aangeroepen in KDB3 host
Dienststelle restore gap
Grootste risico in set
Status restoreDienststelleFromParameterSet, contract dienststelle.md + WBParameterSet.md
Grootte-inschatting legacy vs v3
DWH-businesscase
Op 1–2 voorbeeld-dashboards: bytes legacy vs concept v3
Niet opnieuw: volledige widgetVis-pipeline, hele filter-architectuur, tenzij restore daar specifiek op vastloopt.

Aanbevolen volgorde:

1. Jij vult open productbeslissingen in (of “defaults OK”)
2. Planner stuurt 2–4 gerichte read-only subagents (bovenstaande tabel)
3. Planner merge: handoff v2 = beslissingen + synthese + nieuwe bevindingen
4. Zwaarder model: formeel schema + API + faseplan + mapping-matrix
5. Pas daarna implementatie-tranches
Aanbevolen workflow
Dit gesprek — richting + synthese
Jij: productbeslissingen
Planner: 2-4 gerichte subagents
Handoff-pakket v2
Zwaarder model: formeel ontwerp
Review door jou
Implementatie in tranches
Rolverdeling:

Rol	Wie
Richting, trade-offs, 3 services + v3
Dit gesprek (behouden)
Gerichte feiten verzamelen
Planner + subagents
Formeel schema, mapping-matrix, restore-spec
Zwaarder model
Go/no-go product
Jij
Concreet advies
Deel niet “alles” — deel een gecurateerd handoff-pakket + open vragen.
Geef de planner een expliciete opdracht voor wat het zwaardere model moet opleveren.
Ja, nog subagents — maar 4 gerichte, geen brede herexploratie.
Blokker vóór zwaarder model: minimaal 1–2 echte legacy parametersets uit DWH; zonder die is map-specificatie giswerk.
Als je wilt, kan ik in Ask-modus het handoff-pakket als één copy-paste document uitschrijven (beslissingen + synthese + open vragen + subagent-briefings) — klaar om naar het zwaardere model te plakken.
# Architecture & explainability review — `KDB3/js`

> **Read-only captain review, 2026-08-25.** No code, contract, rule or git state was changed.
> Eight Grok 4.6 teams (overarching, Cognos-ring, core services, filters, widgets, chrome, protocols, human on-ramp) plus independent captain verification of the load-bearing claims.
> Scope: production JS under `KDB3/js/**` excluding `core/libraries/`. ~1514 files (core 466 / dashboard 1047).
>
> This is a **full-tree design review**, not a hygiene audit. File size, leaks and Cognos-isolation *counts* already live in `architecture/structure-audit*.md`. The question here is different: **is the design solid, are the blocks real blocks, and can a human be told how this works?**
>
> A same-day six-block review already exists (`architecture-design-review-2026-08-25.md`). This pass did **not** copy it. Overlap is independent confirmation. Extra coverage: every dashboard module, every core service, leftover `core/` folders, hop-counts for three user actions.

---

## Samenvatting voor de PO

**Korte antwoorden op de vijf vragen.**

| Vraag | Oordeel |
|---|---|
| Solide op overkoepelend niveau? | **Ja.** De ring, state/runtime-scheiding, één writer per subtree en één publieke module-API zijn geen papier. Bootstrap in `KDB.js` doet wat de regels beloven. |
| Solide per component? | **Ongelijk.** Gouden blokken bestaan (loading, message, nativeMultiSelect, historyControls, filterDock-routes). Blur zit waar een module een tweede baan kreeg en nooit hernoemd werd. |
| Helder afgebakende taken? | **Op owner-niveau ja, op protocol-niveau nee.** Elke feature heeft een verdedigbare charter. Drie sagas (tabMutation, parameterSet-restore, history replay) snijden er dwars doorheen en hebben geen eigen folder. |
| Makkelijk onderhoudbaar? | **Ja voor een lokale owner-wijziging, nee voor een protocol-wijziging.** Een zevende filter toevoegen is niet “één rij in één tabel” — behalve bij filterDock. |
| Uitlegbaar aan een mens? | **Ja in tien minuten, als je de drie kaarten krijgt. Nee als je bij `contracts/` of foldernamen begint.** Dat is de zwakste as, en de goedkoopste om te repareren. |

**Eén zin.** KDB3 is een bewust gebouwde codebase met echte componenten en een echte engineeringcultuur, waarvan de *mechanismen* beter zijn dan de *wegwijzers*. De abstractie die telt (generieke owner-dispatch) bestaat al. Wat ontbreekt is het bordje “begin hier”.

**Wat ik expliciet níet vind.** “Te veel duplicatie, dus er ontbreekt een abstractie.” Het consolidatieprogramma is uitgevoerd; restore-vs-seed en per-owner tabMutation-handlers zijn **bewust niet** samengevoegd. Wie hier nog een saga-framework overheen legt, zou schade doen.

**De vijf dingen die wél aandacht vragen**, opbrengst per uur:

| # | Kern | Kosten |
|---|---|---|
| 1 | tabMutation-deelnemerslijst staat 7× hardgecodeerd → één bevroren config | uren |
| 2 | Drie kaarten publiceren als on-ramp: `ownerRoutes.js`, `runTabMutationSaga.js`, `intentDispatchMap.js` (+ `runNormalRestore.js`) | uren |
| 3 | Twee `cognosHost`-folders heten hetzelfde; docs zeggen nog `core/bootstrap/` en `_KDB.api.widgets` | uren (docs/namen) |
| 4 | `writeback` is de applicatie-orchestrator, niet infrastructuur — het label liegt | middel (herlabelen, niet verhuizen) |
| 5 | `singleSelect` spreekt generieke “owner”-taal over hardcoded `sicht`-logica | middel |

**Eén ding als je maar één ding doet:** punten 1 + 2. Geen gedragsverandering. Pakt de as die het slechtst scoort.

---

## 1. Methode

Acht read-only Grok 4.6-teams, elk een schijf van de boom, plus captain-verificatie van claims met `file:line`. Findings zonder bron zijn weggelaten.

Bewuste constraint voor uitlegbaarheid: de code is eerst gelezen, daarna pas de contracts. Het gat tussen die twee is een finding, geen voetnoot.

Niet gedaan: runtime in Cognos, file-size-hygiene, CSS-kwaliteit, `core/libraries/` internals, gedragscorrectheid van individuele reducers.

---

## 2. Tien minuten uitleg (wat je een nieuweling wél zegt)

KDB is een overlay op een Cognos-dashboard. Cognos maakt `new KDB(options)`, roept `getAPI().render()` aan, later `destroy()`. **`KDB.js` is de enige eerlijke inhoudsopgave.** Daar staan alle modules in bootvolgorde.

Denk in **owners**, niet in de zes canonieke folders. Elke owner schrijft één `_KDB.state`-subtree en is bereikbaar via `_KDB.api.<naam>.dispatch(...)`. Services onder `_KDB.services` zijn gedeelde machines (Cognos-host, history, writeback, messages, table data, widget binding). Features schrijven elkaars state niet.

Het scherm is vier banden:

1. **Chrome** — header, footer, kdbControl (stuurpaneel), undo/redo- en PDF-knoppen.
2. **Tabs** — Cognos-tabbladen zijn fysieke slots die niet verhuizen. Namen, widgets en filterwaarden **permuteren over slots**. Die permutatie heet `tabMutation`.
3. **Filter dock** — wij bezitten de Cognos-popup niet. `filterDock` kijkt naar clicks en stuurt een handoff. **Waarden** leven in `singleSelect`, `dienststelle`, `sicht`, `specialSingleSelect`, `nativeMultiSelect`.
4. **Widgets** — `widgetBase` is het frame (plaats, kleur, move). `widgetSettings` is het tandwielpaneel. `widgetVis` / `widgetText` / `widgetTopN` zijn gevolgen. Een vis-dropdown “zet geen setting”; hij bouwt een Cognos-binding via `widgetBindingPlan` + `widgetBindingApply`.

Drie verhalen voor week één:

- **Filter bevestigen** = dock observeert → owner commit. Native multi-select schrijft Cognos **niet** bij OK; Cognos deed dat al. Wij snapshotten `byScope`.
- **Tab verplaatsen** = bevestigingsdialoog → `tabs/move`-saga. Tabs schrijft filter/widget-state nooit zelf. Elke owner doet prepare / apply / resync; daarna hernoemt Cognos de tabs.
- **Opgeslagen dashboard** = writeback Get/Set (`parameterSet`). Restore is een foto-per-positie, geen “volg deze tab-identiteit”.

Eén zoekgewoonte: open van die module `config/actions.js` of `config/actionTypes.js`. Dat is de echte TOC. Begin niet in `contracts/` tot je weet welk bestand nog waar is.

---

## 3. Overkoepelend ontwerp

### 3.1 Hoe het systeem écht werkt

Cognos instantieert één `KDB`. Die instantie **is** het register `_KDB`.

| Laag | Folder | Rol |
|---|---|---|
| Inner ring | `core/cognosAPI/` | Cognos-SDK-encyclopedie. Enige plek met `__getDashboardAPI()` (71 calls, 9 files, 0 daarbuiten). Geeft live SDK-handles terug. |
| Ring 1 | `core/services/cognosHost/` | Isolerende adapter. Ids/DTO’s in, `Outcome` + scalars uit. Acht facets: filters, widgets, canvas, visualization, dataQuery, dashboard, messages, tabs. |
| Chrome-catalogus | `core/cognosHost/` (9 files) | CSS-selectors + miss-checks. **Geen** SDK-ring. Zelfde naam, ander vak. |
| Features | `dashboard/**` | Eén state-subtree, `_KDB.api.<module>`, DOM/listeners in `_KDB.runtime.<owner>`. |
| Services | `core/services/**` | Gedeelde named-method machines op `_KDB.services`. |

Namespaces in de constructor (`KDB.js` 262–268): `state`, `runtime`, `services`, `api`, `events`, `config`, `properties`, `elements`, `utils`, `cognosAPI`, `data`. `_KDB.data` is toegestaan en **leeg** (0 productiegebruik).

Boot (`setupCoreFactories` → `registerFeatureModules` → `mountFeatureModules`): chrome-selectors → properties → config → css → cognosAPI → **authoring (feature, mount meteen)** → services → utils → dashboard-features. Destroy is grofweg omgekeerd; `cognosHost.destroy` als laatste service.

### 3.2 Scores overkoepelend

| As | Score | Waarom |
|---|---|---|
| Soliditeit | **4 / 5** | Boot, ringen, namespaces, ordered destroy en Cognos-SDK-isolatie zijn geïmplementeerd, niet ceremonieel. Aftrek: authoring-vóór-services, dubbele history-bind, ownership-map achter de tree. |
| Grenshelderheid | **3 / 5** | Core-vs-dashboard klopt grotendeels, dan twee `cognosHost`-folders, authoring-in-core, chrome vs SDK, CSS vs JS, properties als derde surface. |
| Onderhoudbaarheid | **3 / 5** | Header/tabs/een genoemd filter vind je op foldernaam. Cognos (drie folders), widgets (zes API’s), filters (401 files) en nested kdbControl kosten een middag. |
| Uitlegbaarheid | **3 / 5** | Het productverhaal past op één whiteboard. Eén click volgen zonder de drie kaarten is 2/5. Gecombineerd: 3, *als* iemand de kaarten geeft. |

### 3.3 Wat overkoepelend sterk is (beschermen)

**S1 — State/runtime-scheiding is echt.** `_KDB.runtime` heeft één owner per module. `tableData` is het bewijs: consumers gaan door `_KDB.services.tableData`; mutaties door `state/writers/mark*.js`.

**S2 — Publieke API is voorspelbaar.** De meeste features: `{ mount, destroy, dispatch, getState }`. Uitzonderingen zijn dun en verklaarbaar: `historyControls` / `pdfExportControls` alleen mount/destroy; `dragDrop` named methods (`startDrag`/`finishDrag`); `kdbControl.syncView`; `dienststelle.getCurrentHierarchySnapshot`.

**S3 — Cognos-SDK-containment houdt.** `__getDashboardAPI()` alleen in `core/cognosAPI/`. `_KDB.cognosAPI` buiten ring 1: `KDB.js`-teardown plus één geregistreerde PDF-uitzondering (`captureTabPage.js:50`). Een Cognos-upgrade raakt ring 1, niet tientallen features.

**S4 — Generieke owner-dispatch bestaat al.** `writeback/set/effects/dispatchOwnerPhase.js` (105 regels) is volledig generiek (`_KDB.api[spec.owner]`), met `source`/`runId`/`skipHistory`, stale-cancel, en detectie van een owner die de fase nooit implementeerde (regel 47). Dat is echte infrastructuur.

**S5 — Het team weet wanneer *niet* te abstraheren.** Restore-vs-seed (WP5) is onderzocht en geweigerd op vijf gedocumenteerde gedragsverschillen. Per-owner tabMutation-handlers eveneens. Resterende herhaling is tot nader order doelbewust.

**S6 — Nieuwste code is de beste code.** `loadingService`, `messageService`, `pdfExportControls`, `nativeMultiSelect`. Remediatie is “convergeer op het goede voorbeeld”, niet “verzin een design”.

### 3.4 Wat overkoepelend liegt (namen / plaatsing)

| Op schijf | Wat het écht is | Waarom het misleidt |
|---|---|---|
| `core/cognosHost/` | Chrome **selector-catalogus** | Zelfde naam als ring-1 service `core/services/cognosHost/` (115 files) |
| `core/authoring/` | Feature: `_KDB.api.authoring` | Features horen onder `dashboard/` |
| `dashboard/canvas/` | Groepsmap, **geen** module | Geen `_KDB.api.canvas`. kdbControl waarschuwt dat canvas-intents nergens aankomen (`settingsPostDispatchSideEffects.js:7–15`) |
| `dashboard/canvas/kdbControl/` | Stuurpaneel, niet canvas-geometrie | Woont in `#KDB3Widget` en volgt de actieve tab door de hele host te verhuizen |
| `core/utils/filters/tabMutationRun/` | Saga/run-id-kernel | Geen util, niet op `_KDB.utils` |
| `core/events/authoringMode.js` | Twee event-naamconstanten | Regels willen dit in de module |
| `architecture/filesExplained.md` | Tekent `core/bootstrap/` | Die map bestaat niet. Boot is `KDB.js` |
| `stateOwnership.md` | `_KDB.api.widgets` | **Geen** `_KDB.api.widgets` in productie-JS. Zes widget-API’s. |

`_KDB.api.widgets` is geverifieerd: 0 hits. `_KDB.api.canvas` bestaat alleen als dode dispatch-poging in kdbControl.

---

## 4. Scorebord — elk blok

Scores 1–5. Grens: **crisp** / **mostly-crisp** / **blurry**. “Uitleg” = kun je dit in twee minuten uitleggen vanaf foldernaam + twee files?

### 4.1 Core services

| Blok | Files | Job in één zin | Grens | Solid | Grenshelder | Onderhoud | Uitleg |
|---|---:|---|---|---:|---:|---:|---:|
| `cognosHost` (service) | 115 | Cognos-SDK achter acht Outcome-facets | mostly-crisp | 4 | 3 | 3 | 3 |
| `cognosHost` (chrome) | 9 | Selector-catalogus + miss-checks | crisp (taak) / blurry (naam) | 4 | 2 | 3 | 2 |
| `cognosAPI` | 23 | Inner SDK-encyclopedie | crisp voor SDK; chrome lekt naar binnen | 4 | 3 | 3 | 3 |
| `loadingService` | 12 | Overlay start/finish | **crisp** | 5 | 5 | 5 | 5 |
| `messageService` | 17 | Toast / alert / confirm / choose | mostly-crisp | 4 | 4 | 4 | 4 |
| `historyService` | 12 | Undo/redo-stack + writeback-baseline | mostly-crisp | 4 | 4 | 4 | 4 |
| `tableData` | 36 | Table-query cache, abort, rows | mostly-crisp | 4 | 4 | 4 | 4 |
| `widgetBindingPlan` | 33 | Pure spec → plan | mostly-crisp; package lekt | 4 | 3 | 3 | 3 |
| `widgetBindingApply` | 36 | Plan uitvoeren op Cognos | mostly-crisp | 4 | 4 | 3 | 3 |
| `writeback` | 80 | Persist/restore **+ restore-saga** | **blurry** | 4 | 2 | 2 | 2 |
| `dashboardPdf` | 23 | PDF-export **+ filter-appendix-saga** | **blurry** | 4 | 2 | 2 | 3 |
| services-orchestrator | 2 | Boot + replay-handlercollectie | mostly-crisp | 4 | 3 | 4 | 4 |

`core/services` is **geen** coherente infrastructuurlaag. Drie soorten dingen in één emmer:

1. Echte infrastructuur — cognosHost, loading, message, tableData, history.
2. Domeinengines voor één familie — widgetBindingPlan / Apply (vis + TopN).
3. Applicatie-sagas — writeback Set/Get-collectors, dashboardPdf (tab-walk + appendix).

Writeback publiceert **vier** keys (`writebackGet` / `Set` / `Map` / `Bridge`), geen `_KDB.services.writeback`. Map+schema zijn protocol-infrastructuur. Set is de dashboard-restore-applicatie. Het label “service” liegt; de plaatsing is lokale conventie, geen structurele fout. **Niet verhuizen. Wel herlabelen in docs.**

Plan vs Apply is conceptueel schoon (Plan puur, Apply Cognos). Lek: `widgetVis` importeert `widgetBindingPlan/defaults/normalizeDefaultValue.js` in plaats van via de service.

### 4.2 Overige core

| Blok | Files | Job | Grens | Notitie |
|---|---:|---|---|---|
| `authoring` | 7 | `_KDB.api.authoring` — Cognos uiState → enter/exit | mostly-crisp | Feature in core; mount vóór services bestaan |
| `config` | 24 | `_KDB.config` + frozen `parameterMap` dump | mostly-crisp | mapping is productdata naast echte config |
| `properties` | 13 | Cognos report-properties → `_KDB.properties` | blurry surface | noch api noch service; destroy via `runtime.properties.controller` |
| `events` | 2 | Event bus + leftover `authoringMode.js` | crisp + leftover | |
| `utils` | 15 | sleep/throttle/wait + domeinhelpers | blurry | `tabMutationRun/` hoort hier niet |
| `css` | 3 | Injecteert `KDB3/css/` hrefs | crisp | CSS woont in een tweede tree |

### 4.3 Filterfamilie (401 files)

```
 Cognos filter dock
        │
        ▼
 ┌──────────────┐
 │  filterDock  │  observer / router   ← GEEN filter
 │ ownerRoutes  │  classify → handoff → api.<owner>
 └──────┬───────┘
        │
   ┌────┼─────────┬──────────┬────────────┐
   ▼    ▼         ▼          ▼            ▼
 sicht  special  dienststelle  nativeMulti  singleSelect
 OWNER  OWNER    OWNER         OWNER        HOST
 BW/DEZPV PG/DSL hierarchy     unowned      popup + host I/O
   │      │         ▲
   └──sichtChanged──┘
   delegate popup ──────────────────────────► singleSelect
```

| Blok | Files | Job | Grens | Solid | Grens | Onderhoud | Uitleg |
|---|---:|---|---|---:|---:|---:|---:|
| `filterDock` | 71 | Dock observer + registry | mostly-crisp | 4 | 4 | 3 | 4 |
| `nativeMultiSelect` | 44 | Unowned native multi-selects | **crisp** | 4 | 5 | 4 | 4 |
| `dienststelle` | 85 | Hierarchiefilter, Sicht-gebonden | mostly-crisp | 4 | 4 | 3 | 4 |
| `sicht` | 54 | Policy-owner globaal Sicht; delegeert host | mostly-crisp | 4 | 4 | 3 | 4 |
| `specialSingleSelect` | 35 | Rights-gated PG/DSL; delegeert host | mostly-crisp | 3 | 4 | 3 | 3 |
| `singleSelect` | 112 | Generieke popup/host | **blurry** | 4 | 2 | 2 | 3 |

**Beschermen:** `filterDock/config/ownerRoutes.js` als enige dispatch-tabel. Owner-vs-host-split (Sicht/special beslissen, singleSelect schrijft). Unowned-claim blijft in nativeMultiSelect. Vier-werkwoord tabMutation (`prepare` / `apply` / `restore` / `resync`).

**Niet beschermen:** `name === "sicht"` in `classifyFilterInstance.js:26–27`; `applyOwnerSelection.js:17` eist `notifyOwner === "sicht"`; directe import van `sicht/state/selectors.js` vanuit singleSelect parameterSet.

Twee classifiers (dock `resolveFilterType.js` vs singleSelect `classifyFilterInstance.js`) is de belangrijkste familiescheur.

### 4.4 Widgetfamilie (343 files)

Geen class-hiërarchie. Zes sibling features. Mountvolgorde: Base → Settings → Text → Vis → DataTable → TopN.

| Blok | Files | Job | Grens | Solid | Grens | Onderhoud | Uitleg |
|---|---:|---|---|---:|---:|---:|---:|
| `widgetBase` | 89 | Frame: id, plaats, launchpad, move/resize | mostly-crisp | 4 | 3 | 3 | 3 |
| `widgetSettings` | 76 | Tandwielpaneel + control values | mostly-crisp | 4 | 4 | 3 | 4 |
| `widgetVis` | 94 | Visualisatie-inhoud + binding-pipeline | mostly-crisp | 4 | 3 | 3 | 4 |
| `widgetText` | 43 | Editable tekst, geen binding | **crisp** | 4 | 4 | 4 | 5 |
| `widgetTopN` | 31 | Vis-helper, geen droppable widget | mostly-crisp | 4 | 3 | 4 | 4 |
| `widgetDataTable` | 10 | Gemonteerde stub, dispatch = no-op | **blurry** (drie verhalen) | 2 | 2 | 3 | 2 |

`widgetBase` is **geen** base class. Kind-routing is een kleine switch (`resolveContentOwnerApi.js:13–28`). `widgetTopN` is een resolver keyed op `ownerVisId`, state in `byOwner`. `widgetDataTable` is een uitgestelde List-tranche: `createWidgetDataTableController.js:42` — alle actions `SCAFFOLD_NOOP`. Base routed `kind === "datatable"` er nog heen. Contract belooft claim-API’s die niet bestaan. Live TopN claimt helpers zelf.

Binding-grens: vis en TopN zijn consumers van Plan/Apply. Lek: vis AMD-importeert een Plan-internal; vis én TopN hebben een tweede Cognos-pad (`applyVisualizationProperties`) naast Apply.

**Beschermen:** frame-record als identiteitsbron; drop-workflow (claim → place → layout → contentCreate → settings); `intentDispatchMap.js`; vis-pipeline (prerequisites → plan → apply → derived); TopN-handshake `topNResolved`.

### 4.5 Chrome / shell / navigatie

`dashboard/canvas/` is een groepsmap, geen laag. Twee soorten chrome, geen gedeelde chrome-owner: **page chrome** (header, footer, Cognos-tabknoppen, toolbar) en **authoring chrome** (kdbControl + guest metricsTree).

| Blok | Files | Job | Grens | Solid | Grens | Onderhoud | Uitleg |
|---|---:|---|---|---:|---:|---:|---:|
| `kdbControl` | 71 | Dashboard-stuurpaneel | mostly-crisp | 4 | 3 | 3 | 3 |
| `dragDrop` | 26 | HTML5 drag-sessie; maakt geen widgets | **crisp** | 4 | 5 | 4 | 4 |
| `tabs` | 98 | Tab-identiteit **+ tabMutation-saga** | **blurry** | 4 | 2 | 2 | 3 |
| `launchpad` | 25 | Verborgen parkeerplaats voor widgets | mostly-crisp | 4 | 4 | 4 | 3 |
| `header` | 23 | Kop: presence, titel, inline edit | mostly-crisp | 4 | 4 | 4 | 4 |
| `footer` | 17 | Voet: presence, header-gated | mostly-crisp | 4 | 4 | 4 | 4 |
| `metricsTree` | 20 | Kennzahlen-jsTree in kdbControl-DOM | mostly-crisp | 4 | 4 | 4 | 3 |
| `historyControls` | ~10 | Undo/Redo-knoppen | **crisp** | 4 | 5 | 5 | 5 |
| `pdfExportControls` | ~13 | PDF-knop → dashboardPdf-service | **crisp** | 4 | 5 | 4 | 5 |

tabs is twee producten in één folder: navigatiechrome en een multi-owner writeback-saga. De saga is solide (`runTabMutationSaga.js`); het *blok* is wazig. historyControls vs historyService is het schoonste UI-vs-service-split in de tree.

launchpad vs tabs vs kdbControl overlappen in vocabulaire (“tabs”), niet in ownership: tabs bezit identiteit, kdbControl vraagt add/edit, launchpad *leest* tab-ids voor helper-pads.

---

## 5. Drie protocollen (waar onderhoud écht zit)

Fan-out naar owners is drie keer opgelost, op drie kwaliteitsniveaus:

| Tier | Waar | Mechanisme |
|---|---|---|
| **Best** | writeback restore | Bevroren 31-fase-enum (`restoreConstants.js:7–16`) + generieke `dispatchOwnerPhase` |
| **Best** | filterDock | Eén declaratieve tabel `ownerRoutes.js` (67 regels) |
| **Goed mechanisme, ad-hoc lijst** | tabMutation | Generieke `dispatchOwners(owner + "/" + suffix)`, deelnemers 7× inline |
| **Goed** | history replay | Generieke apply + `collectReplayHandlers.js` (keys hardcoded, één plek) |
| **Goed (klein)** | authoring | Event bus; subscribers niet gedeclareerd (kdbControl + tabs) |

### 5.1 tabMutation — P0 onderhoud

Start: tab-edit-icoon → confirm → `tabs/delete|move|duplicate` → `runTabMutationSaga.js:15`.

Deelnemers **niet** in `tabs/config/`. Zeven letterlijke arrays:

```
runTabMutationSaga.js:31   prepare     [widgetBase, singleSelect, dienststelle, nativeMultiSelect]
runTabMutationSaga.js:36   filterApply [singleSelect, dienststelle, nativeMultiSelect]
runTabMutationSaga.js:38   rollback    [vier]
runTabMutationSaga.js:45   rollback    [vier]
runTabMutationSaga.js:51   rollback    [vier]
runTabMutationSaga.js:54   resync      [drie]
clearTabMutationSnapshots.js:6  SNAPSHOT_OWNER_KEYS [vier]
```

Captain-geverifieerd. 4-vs-3 is intentioneel (widgetBase doet geen filter-apply/host-resync). `sicht` / `specialSingleSelect` / `filterDock` horen er terecht niet in (rijden mee op singleSelect-inventory).

Mechanisme is goed (`runTabMutationOwnerPhases.js`). Alleen de **registry** ontbreekt. Miss één rollback-kopie → snapshot ongerestored, geen missing-participant-detectie.

**Goedkoop:** één bevroren `tabs/config/tabMutationOwners.js` met de huidige waarden. Gedrag ongewijzigd. Per-owner handlers **niet** mergen (bewuste asymmetrieën: SS vs DS/NMS guards; widgetBase eigen snapshot-vorm).

Een zevende filter: ~10 files in de nieuwe owner **en** zeven array-literals. Niets in de tree somt die zeven op.

### 5.2 parameterSet restore — excellent, verkeerd gelabeld

Start: Cognos `WBParameterSetFunction` → `writebackSet.restore` → `runNormalRestore.js:12`.

Volgorde **is** het protocol (dienststelle ná sicht, widgets last). Dispatcher al generiek. Owner-folder: `core/services/writeback/set/` — niet dakloos. Het woord “service” verbergt dat dit de applicatie-orchestrator is.

Seed (`handleSeedDefaults.js`, ná drop) is een **andere** pijplijn. WP5 weigerde de merge op vijf gedragsverschillen. **Niet samenvoegen.**

### 5.3 history replay — goed, collector makkelijk te missen

Start: toolbar → `history.undo()` → `collectReplayHandlers.js:10–69`. Keys hardcoded, bijdragen gestempeld op `runtime.<owner>.historyReplayHandlerContribution`. `specialSingleSelect` heeft **geen** eigen key (policy zit op singleSelect). Miss de collector-regel → undo doet stil niks.

`KDB.js:76` en `:94` binden replay-handlers **tweemaal**: eerst zodat historyControls header/kdbControl ziet, daarna zodat filters/widgets/tabs meedoen. Uitlegbaar, makkelijk te missen.

### 5.4 Binding — excellent

`runBindingPipeline.js` → Plan → Apply. Geen multi-owner fan-out. Dienststelle/TopN zijn **gates**, geen protocoldeelnemers. Nieuw vis-achtig widget-type: zelfde pijplijn. Text/datatable gaan hier **niet** doorheen. Geen widget-type-switch in Plan/Apply bouwen.

### 5.5 filterDock — excellent

`ownerRoutes.js` is het voorbeeld hoe een deelnemerslijst eruitziet. Een zevende filter: één map-rij + `resolveFilterType`-tak + owner-module. Dispatcher ongewijzigd.

### 5.6 authoring — klein en goed

`syncAuthoringFromDashboardMode.js` → `authoring:entered|exited`. Twee subscribers. Te klein voor een dispatcher. Optioneel: één comment “subscribers: kdbControl, tabs”.

---

## 6. Uitlegbaarheid — hop-counts

Na mount gaat geen user-actie meer door `KDB.js`. Click → dispatch.

| User-actie | Files om het *idee* te snappen | Files om een failure te traceren |
|---|---:|---:|
| Native multi-select bevestigen (OK in dock) | **11** | ~16 |
| Widgetkleur wijzigen | **11** | ~14 |
| Tab verplaatsen | **8** voor het idee (`runTabMutationSaga.js` is de kaart) | **~24+** (vier owner-klonen) |
| Vis-type / dimensie / TopN | — | **16–20** (binding rebuild, geen dropdown-write) |

Native confirm schrijft Cognos **niet**. De reducer-action heet toch `nativeMultiSelect/tabMutationScopeWrite` (`config/actions.js:10`). Die naam is een leugen voor onboarding.

`applyTabMutationToCognos` hernoemt + traverse’t. Slotpermutatie zit in owner-apply. Nog een leugen.

### Gouden start vs anti-start

**Eerst laten zien:** `KDB.js` · `nativeMultiSelect` · `ownerRoutes.js` · `runTabMutationSaga.js` · `intentDispatchMap.js` · `messageService` · `runNormalRestore.js`.

**Niet hier beginnen:** `singleSelect` (112 files, leftover Support) · `filterDock/observation/` (30 files) · `widgetVis` als “compleet canoniek module” (lege `adapters/events/lifecycle/observation`) · `contracts/tabs.md` (Status Draft, “defer move/delete” — productie heeft 98 files die dat doen) · de `contracts/`-map als geheel (~243 md, waarvan ~132 deltas/specs).

Leftover-namen, captain-geteld: **8** `*Support.js`, **2** `*Shared.js`. `*Internals*` / `maybePush*` / `stage*History*` folders: **0** (opgeruimd). Lege folders die nog een laag claimen: `singleSelect/integration`, `singleSelect/runtime`, `sicht/runtime`, `widgetVis/{adapters,events,lifecycle,observation}`, `kdbControl/toolbox`, `widgetSettings/dom`.

---

## 7. Zijn de blokken uitlegbaar als blokken?

**Op het korrel dat het product telt: ja.** Header, tabs, dock, elke filter-owner, widgetBase/settings/vis, writeback, cognosHost — echte blokken, publiek oppervlak, één state-writer.

**Op het korrel dat de folder-template belooft: nee.** De zes canonieke folders (`config state view effects adapters events`) zijn niet waar taken leven. Taken leven in `actions/` (en klonen van `tabMutation/` / `parameterSet/`), in `observation/`, en in sagas die **legaal** owners kruisen. Dat extra set (`actions/ history/ runtime/ observation/`) is de-facto standaard, geen drift — de regel erkent het al als optioneel, de praktijk maakt er de default van.

Een nieuweling vindt de **module** in 30 seconden vanuit `KDB.js` en is daarna een middag kwijt in één click.

Delimited files bestaan (`applyTabMutationMove.js` naast `applyTabMutationDelete.js` is een goede split). De faalmodus is **dezelfde taak gekopieerd naar vier owners**, plus routers-voor-routers (dock → controller → user-commit-route → handle).

---

## 8. Findings (alleen wat evidence heeft)

### F1 — Zelfde structurele probleem, drie kwaliteitstiers, niets zegt in welke je zit — P0 begrip

Fan-out bestaat als (a) bevroren fase-enum + generieke dispatcher, (b) één declaratieve tabel, (c) hardcoded namen in string-vergelijkingen (singleSelect “owner”-files). Alle drie correct vandaag. Een developer generaliseert vanaf de eerste die hij ziet.

Aanbeveling: tiers expliciet maken; tier 3 → tier 2 (F3); tier 2’s deelnemerslijst dezelfde single-source-behandeling als tier 1 (F2). De abstractie bestaat al in `dispatchOwnerPhase.js`. Werk is propagatie, geen inventie.

### F2 — tabMutation-deelnemerslijst 7× — P0 onderhoud

Zie §5.1. Hoogste waarde-per-uur in dit rapport.

### F3 — singleSelect spreekt “owner”, implementeert `sicht` — P0 begrip

Generieke bestandsnamen (`applyOwnerSelection`, `awaitOwnerInventoryAck`, `ownerSelectionSupport`) impliceren een registry. Implementatie is een nameswitch. Host-rol beschermen; name-hardcoding is schuld.

### F4 — `writeback` is de applicatie-orchestrator — P1 label

`createWritebackSetService.js:12–14` zegt het zelf: Set muteert geen owner-state; elke mutatie gaat door owner-dispatch. `runNormalRestore.js` is de faselijst. Get-collectors importeren `dashboard/**`. Niet verhuizen. In `filesExplained` / on-ramp: “dit is restore, geen cache.”

### F5 — `tabs` is navigatie plus platform-saga — P1 blok

~98 files, één dispatch-tabel. Navigatie is uitlegbaar; de saga is een platform-workflow die toevallig met “tab” begint. Geen split forceren. Wél: `runTabMutationSaga.js` als de kaart benoemen, niet `tabs.md`.

### F6 — Twee `cognosHost`-folders + dode `api.canvas` + dode `api.widgets` — P1 navigatie

Chrome-catalogus hoort te blijven (andere faalmodus dan SDK). De **naam** is de tax. Ownership-docs en `filesExplained` sturen mensen naar mappen/API’s die niet bestaan.

### F7 — `widgetDataTable` is een gemonteerde leugen — P2

Tien files, dispatch no-op, Base routed er nog heen, contract belooft claim-API, TopN claimt zelf. Laat inert tot een echte List-tranche. Niet het oude “TopN via DataTable”-verhaal nieuw leven inblazen.

### F8 — Contracts zijn een langere on-ramp dan de code, en deels vals — P1 uitleg

`tabs.md` Draft vs 98-file saga. `widgetSettings.md` `commitDimension`/`commitVisType` vs code die alleen `commitColour` plus een intent-map heeft. `nativeMultiSelect.md` §6 folderlijst is stale. `pageContextPlain.md` is superseded en ligt nog in de contracts-root. Drie JS-files leggen het systeem uit; ze staan niet op de kaart die een mens krijgt.

### F9 — History-keys en authoring-subscribers zijn impliciet — P2

`collectReplayHandlers.js` is de signpost; auto-discovery zou ontbrekende keys verbergen. Laat de map. Comment: specialSingleSelect heeft geen key. Authoring: twee subscribers, grep volstaat; optioneel één comment.

### F10 — Plan-package lekt; vis heeft een tweede Cognos-pad — P2

`widgetVis/effects/buildBindingSpec.js` importeert Plan-internals. `applyVisualizationProperties` staat naast Apply. Geen derde pad laten groeien. Package-grens van Plan dichten wanneer vis toch al open is.

---

## 9. Niet doen

| Anti-patroon | Waarom |
|---|---|
| Saga-framework / `tabMutation`-god-object | Mechanisme bestaat. Registry ontbreekt. |
| Restore mergen met seed | Vijf gedocumenteerde gedragsverschillen. |
| Per-owner tabMutation-handlers mergen | Bewuste SS/DS/NMS/widgetBase-asymmetrieën. |
| Writeback uit `core/services` slepen | Lokale conventie; verhuizen breekt boot/contracts zonder leeswinst. |
| Chrome-catalogus in ring 1 duwen | Andere faalmodus (DOM CSS vs SDK Outcomes). |
| `widgetDataTable` “afmaken” zonder List-tranche | Scaffold-ceremonie, geen product. |
| Big-bang folder-rename van `dashboard/` | AMD-paden, contracts, git-historie tegelijk. |
| README per modulefolder | Veroudert sneller dan code. Eén index + drie kaarten. |
| Mass-rename `handle*` / `actions.js` → `actionTypes.js` | Grandfathered ruis; geen taakbeschrijving. |
| `eventSubscribe.md` als human map voor confirm/move/settings | Dat zijn dispatch-sagas, geen bus-events. |

---

## 10. Goedkoopste verbeteringen (geen refactors)

1. **`tabs/config/tabMutationOwners.js`** — bevries de huidige vier lijsten. Consumptie: `runTabMutationSaga.js` + `clearTabMutationSnapshots.js`.
2. **Levende on-ramp van één pagina** — `KDB.js`-modulelijst + “wil je X, open Y”: `ownerRoutes.js`, `runTabMutationSaga.js`, `intentDispatchMap.js`, `runNormalRestore.js`. Stampt: geen `core/bootstrap/`; `core/cognosHost` ≠ `core/services/cognosHost` ≠ `core/cognosAPI`; geen `_KDB.api.widgets` / `_KDB.api.canvas`.
3. **Stale contracts banneren, niet herschrijven** — tabel: `tabs.md` / `widgetSettings.md` / `nativeMultiSelect.md` §6 vs live TOC-files. `pageContextPlain.md` mentaal uit de root.
4. **Lege-folderlijst** — 15 regels “deze directories zijn hulzen”. Voorkomt dat `widgetVis/adapters` als architectuur wordt gelezen.
5. **Drie sagas in vocabulary, één keer**, naast `lifecycleVocabulary.md`: `tabMutation` = live slot-permutatie (niet writeback); `parameterSet` = opgeslagen foto; `filterDock` = observer, geen owner. Expliciet: confirm mag schrijven via `tabMutationScopeWrite`.

---

## 11. Captain-verificatie (niet alleen agent-claims)

| Claim | Check |
|---|---|
| `__getDashboardAPI` alleen inner ring | 71 sites, 9 files, alle onder `core/cognosAPI/`. 0 daarbuiten. |
| Geen `_KDB.api.widgets` | 0 hits in `KDB3/js`. |
| `_KDB.api.canvas` dood | Alleen kdbControl-waarschuwing `settingsPostDispatchSideEffects.js:7–15`. |
| Zeven tabMutation-arrays | `runTabMutationSaga.js` 31/36/38/45/51/54 + `clearTabMutationSnapshots.js:6`. |
| `ownerRoutes.js` enige dock-tabel | Vijf owners, capability flags, geverifieerd. |
| Restore-fasen bevroren | `restoreConstants.js:7–16`, 31 namen; `runNormalRestore.js` voert ze uit. |
| History-collector | `core/services/collectReplayHandlers.js:10–69`. Geen specialSingleSelect-key. |
| widgetDataTable stub | `createWidgetDataTableController.js:42` SCAFFOLD_NOOP. |
| Sicht-hardcoding in host | `classifyFilterInstance.js:26–27`. |
| `*Support.js` | 8 files. `*Shared.js` | 2 files. |

Agenten waren het eens op de load-bearing punten (ringen, writeback-als-saga, tabMutation-lijst, owner-vs-host, DataTable-stub, canvas-geen-module). Afwijking alleen op **uitlegbaarheidsscore** (overkoepelend-team 4, on-ramp-team 2). Captain: **3**, gesplitst — productverhaal 4, click-trace zonder kaart 2.

---

## 12. Wat dit review níet is

- Geen opdracht om code te wijzigen. Niets is gewijzigd.
- Geen vierde structure-audit. Hygiëne (file size, leaks) is niet herhaald tenzij het begrip schaadt.
- Geen contract-rewrites. Stale contracts zijn gesignaleerd, niet herschreven.
- Geen runtime-bewijs in Cognos. Alle claims zijn static.

---

## 13. Bronindex (start hier)

| Wil je… | Open |
|---|---|
| De modulelijst | `KDB3/js/KDB.js` (register 44–65, mount 67–95, destroy 131–176) |
| Filterfamilie-kaart | `dashboard/filters/filterDock/config/ownerRoutes.js` |
| Tab-CRUD-kaart | `dashboard/tabs/actions/runTabMutationSaga.js` |
| Settings-router | `dashboard/widgets/widgetSettings/config/intentDispatchMap.js` |
| Restore-kaart | `core/services/writeback/set/effects/runNormalRestore.js` |
| Restore-fasenamen | `core/services/writeback/set/config/restoreConstants.js` |
| Generieke dispatcher | `core/services/writeback/set/effects/dispatchOwnerPhase.js` |
| Undo-kaart | `core/services/collectReplayHandlers.js` |
| Cognos-facets | `core/services/cognosHost/createCognosHostService.js:70–87` |
| Chrome-selectors | `core/cognosHost/registerCognosHostSelectors.js` |
| Gouden filter | `dashboard/filters/nativeMultiSelect/` |
| Gouden kleine service | `core/services/loadingService/`, `core/services/messageService/` |
| Gouden dunne UI | `dashboard/controls/historyControls/` |

Einde. Geen code gewijzigd.

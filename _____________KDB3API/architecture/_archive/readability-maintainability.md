# Readability & Maintainability Proposal (KDB3/js)

> **Historisch voorstel (2026-08-16).** Geen code-, contract- of regelwijzigingen in deze pass;
> geen levende adapterregel. `widgetVis` heeft géén map `adapters/`. Cognos-isolatie is
> `contracts/cognosHostService.md`, niet de canonieke zes-folder `adapters/`. Volg
> `cognosHostService.md`, de bijgewerkte `structure-audit-rubric.md` dimensie #3 en
> `feature-structure.mdc`.

> Read-only captain-synthese. Geen code-, contract- of regelwijzigingen in deze pass.  
> Datum: 2026-08-16. Scope: productie-JS onder `KDB3/js/**`.  
> Complementary aan `architecture/structure-audit.md` (2026-07-10) en `architecture/structure-audit-2.md` (2026-08-16): die rapporten gaan over Cognos-isolatie, file-size hubs, leaks en duplicatie. Dit document gaat over **menselijk begrip**: folders, namen, lagen, en wat een nieuwe maintainer nodig heeft.

Evidence:

- tree-inventaris + steekproeven (singleSelect, nativeMultiSelect, tabs, widgetBase, widgetVis, filterDock, writeback, messageService, pdfExportControls)
- vier gerichte subagents: Composer 2.5 (overdesign, layout-uniformiteit) en Grok 4.6 (naming, vocabulary/on-ramp)
- bestaande regels: `projectStructureRules.md`, `feature-structure.mdc`, `naming.mdc`

Interactief overzicht (zelfde inhoud, scanbaar): canvas `kdb3-readability-maintainability.canvas.tsx` in de Cursor canvases-map van deze workspace.

---

## 1. Oordeel

De tree is **al modulair en ownership-strak**. Foreign `_KDB.state`-writes zijn zeldzaam, orchestrator/controller-split wordt gevolgd, `__getDashboardAPI()` zit in `core/cognosAPI`. Dat is het sterke punt van het project.

Het leesbaarheidsprobleem is niet “te weinig lagen”, maar:

1. **dezelfde lifecycle-template** (orchestrator → route → support → stage → create → apply) ook waar een laag geen gedrag heeft;
2. **leftover-namen** (`Support` / `Shared` / `Helpers` / `Internals`) die een restbak zijn in plaats van een verantwoordelijkheid;
3. **drie cross-cutting sagas** (tabMutation, parameterSet, history replay) waarbij één gebruikersactie 11–28 files opent;
4. **ontbrekende indexes** — `filesExplained.md` catalogiseert docs, niet de JS-tree; ~218 contract-files zijn de huidige on-ramp.

`nativeMultiSelect`, `messageService` en `pdfExportControls` tonen de bedoelde dichtheid. `singleSelect` (~108 files) toont wat er gebeurt als elk contractparagraaf een file wordt.

**Voorkeur bij balanceren:** readability, duidelijkheid en maintainability gaan altijd voor code-reductie. Liever 10 files met duidelijke werkwoorden dan 6 files genaamd Support/Shared/Internals.

---

## 2. Niet doen

| Anti-patroon | Waarom het maintainability schaadt |
|---|---|
| Gezonde controllers herschrijven (singleSelect, widgetBase, filterDock, writeback) | Die zijn al de bedoelde multi-method facade. Churn zonder leeswinst. |
| Big-bang folder-rename van heel `dashboard/` | Git-historie, contracts, AMD-paden en agent-prompts breken tegelijk. |
| Nieuwe generieke lagen (`FilterBase`, saga-framework, `_KDB.services.tabMutation` god-object) | Vervangt oude complicated abstraction door een nieuwe. |
| README per modulefolder | Veroudert sneller dan code. Eén module-map + vocabulary wint. |
| Writeback opnieuw splitsen | Al gedaan (60 files). Resterend is DRY van strings, niet size. |
| Meer contract-deltas of execution-specs voor renames | De on-ramp is al te lang. |
| `eventSubscribe.md` als human map behandelen | Filter confirm, tab move, restore en launchpad-take zijn **dispatch-sagas**, geen bus-events. |

---

## 3. Observaties

### 3.1 Folder-uniformiteit

Canonical layout volgens `feature-structure.mdc`: `config/ state/ view/ effects/ adapters/ events/` plus `create<Module>Controller.js` en `__orchestrator<Module>.js`.

Praktijk: bijna elke serieuze module heeft ook `actions/`, `history/` en `runtime/`. Dat is geen fout — het is een 8-folder de-facto standaard die de regel nog niet erkent. Slechts **1 van 27** dashboard-modules heeft alle 6 canonical folders (`widgetVis`).

| Module | Canonical | Extra | Oordeel |
|---|---|---|---|
| `messageService` (17) | config view effects + runtime | runtime | **Gouden kleine service** |
| `pdfExportControls` (13) | config view effects adapters | observation, runtime | **Gouden UI-control** |
| `nativeMultiSelect` (40) | config state effects | actions, history | **Gouden filter** — template voor siblings |
| `launchpad` (19) | config state view effects | — | Template (geen extra folders) |
| `widgetVis` (84) | alle 6 | actions, runtime, gates/, legend/ | Volste canonical; gates/legend KEEP |
| `singleSelect` (108) | config state effects | actions, history, 7× Support | Gedrift: parameterSet-shardwolk |
| `filterDock` (71) | config state effects | observation (~31), lifecycle, runtime | observation is echte taak; namen te lang |
| `tabs` (63) | config state effects adapters | actions, history | Template-ok; traverse/controller te groot |
| `widgetBase` | config state view effects | actions, history | `tabMutationSupport` importeert core **niet** |
| `kdbControl` (47) | state effects events | framework, settings, toolbox, authoringMode, history | Nested orchestrators; framework = chrome/shell |
| `header` / `footer` / `widgetSettings` | config state effects events | `dom/` i.p.v. `view/` | Hernoem bij aanraking |
| `dashboardPdf` | orchestrator + runner | **`helpers/` (verboden)** | helpers → effects |
| `writeback` (60) | get/set/schema | collectors, validate, normalize | KEEP: service is get/set, geen UI-module |
| `widgetBindingPlan` (33) | config + factory | slots, filters, intent, policy, **utils/**, diagnostics | Taakfolders KEEP; `utils/` hernoemen |

**Filter-family klonen** (zelfde relatieve paden in SS / DS / NMS): `handleTabMutationAction`, `prepareTabMutation`, `tabMutationSupport`, `applyTabMutation*`. Voorspelbaar voor de saga; verwarrend wanneer kopieën uit elkaar lopen. Convergeer naar de **NMS-vorm**, niet naar de SS-ouder.

**Widget-family:** `config/actionTypes.js` + `state/initialState.js` in alle zes. Copy-paste: `cloneSerializable`, `normalizeDispatchResult`. `widgetDataTable` is een bewuste stub.

### 3.2 Extra folders — KEEP / RENAME / CONSOLIDATE

| Folder | Verdict | Rationale |
|---|---|---|
| `actions/` | **Voorstel als canonical (optioneel)** | 169 files; sync dispatch-handlers, geen directe Cognos/DOM |
| `history/` | KEEP (optioneel) | Replay staging per owner |
| `runtime/` | KEEP (optioneel) | Past bij `_KDB.runtime.<owner>` |
| `observation/` | KEEP (optioneel) | Echte MutationObserver/readiness-pipeline (filterDock, toolbar controls) |
| `dom/` | RENAME → `view/` | header, footer, widgetSettings |
| `helpers/` | RENAME → `effects/` | Verboden; dashboardPdf |
| `utils/` in een module | RENAME / lift | widgetBindingPlan, widgetTopN |
| `framework/`, `settings/`, `toolbox/`, `authoringMode/` | KEEP | kdbControl sub-orchestrators; alleen lege toolbox-stub weg |
| `session/`, `avatar/`, `dropboxes/` | KEEP | dragDrop-domein |
| `get/`, `set/`, `map/`, `schema/`, `bridge/` | KEEP | writeback-decompositie; niet naar UI-layout dwingen |
| `gates/`, `legend/` | KEEP | al onder effects/view in widgetVis |
| `lifecycle/` (widgets) | CONSOLIDATE | vooral dode `writeLifecycle.js` |
| `actions/shared/` | FLATTEN | verboden `shared` in widgetVis |

Geen `adapters/` forceren waar de module geen Cognos raakt (`sicht` is correct zonder).

### 3.3 Naming

`naming.mdc` vraagt verb+noun en verbiedt `handle` / `do` / `process` / `manage`. In productie:

| Patroon | Aantal (orde) | Opmerking |
|---|---:|---|
| `handle*.js` | 61 | Nieuwe code kopieert siblings |
| `*Support.js` | 18 | Restbak; vier `tabMutationSupport.js`-klonen |
| `stage*HistoryReplayHandler.js` | 11 | ~13–16 regels pass-through |
| `maybePush*.js` | 7 | Family-template |
| `manage*.js` | 7 | filterDock observation + PDF/text |
| `*Shared.js` | 4 | Split-restant |

Filters gebruiken `config/actions.js`; widgets/tabs gebruiken `config/actionTypes.js` — dezelfde rol, twee namen.

`__controller` is **inconsistent**: helft van de files gebruikt die naam, helft exporteert een filename-matching functie; extra exports worden soms aan `__controller` geplakt. Grep is daardoor ruis.

Domain-Duits **houden** als productvocabulaire: `sicht`, `dienststelle`, `kennzahl`, `langtext`. Technical German/telegram in writeback-wire (`filt`, `dstl`, `pcfs`) niet English-washen zolang het JSON-contract vastligt; locals mogen Engels.

Booleans: `{ ok, diagnostics }` behandelen als Result-type (geen `isOk`-sweep). Echte flags wél `is`/`has`/`can`/`should`/`did` (`didPush`, `isStale`).

### 3.4 Overdesign / lagen

Niet elke extra file is overdesign. `applyTabMutationDelete.js` naast `applyTabMutationMove.js` is leesbaar. Overdesign begint wanneer de split geen verantwoordelijkheid uitdrukt, of wanneer één klik een router-van-routers wordt.

**Files openen voor één user-actie (happy path):**

| Actie | Nu | Doelbeeld |
|---|---:|---:|
| Native multi-select bevestigen in filter dock | 11–13 | 5–6 |
| Tab verplaatsen | 22–28 | ~8 (saga blijft; owner-Support-klonen weg) |
| Parameter-set restore (één global singleSelect) | 25–35; full dashboard 40+ | niet forceren lager; intern één restore-file + action-constants |
| History undo (singleSelect-filter) | 12–14 | stage/create weg; één `replayHistoryStep` per owner |
| Widget drop vanaf launchpad | 6–8 | ~5 (WP4 Shared al deels gedaan) |

**Hoogste overdesign-sites:**

1. **Split-brain state in singleSelect.** Reducer is lifecycle-only (`MOUNT`/`ERROR`/`DESTROY`); `commitConfirmedSelection` schrijft `instancesById` direct. nativeMultiSelect-reducer die `byScope` wél bezit is het leesbare model. Rewrite van de SS-reducer = **needs discussion**, geen R0.
2. **Router-on-router** bij dock-confirm (filterDock handoff → controller → `routeNativeMultiSelectUserCommit` → handle → scope).
3. **singleSelect confirm:** 7-laags interaction pipeline + barrel `runSingleSelectInteraction.js`.
4. **History-triplet** per owner: `stage*` → `create*` → `apply*` → `maybePush*` (+ soms dispatch terug de owner in).
5. **Vier `tabMutationSupport.js`** die `core/utils/filters/tabMutationRun/` wrappen; widgetBase kopieert i.p.v. te importeren.
6. **filterDock/observation (~31 files)** — noodzakelijke complexiteit, excessieve synoniemen (`Pipeline`/`Session`/`Evaluation`).
7. **`config/actions.js` vs string literals** in singleSelect `routeParameterSetIdentityAction.js`. nativeMultiSelect is hier consistent.
8. **Pass-throughs:** `*ControllerInternals.js`, `observeDockPopupPipeline.js`, `stage*`, lege `kdbControl/toolbox` orchestrator, dode `writeFrameworkView.js` / `writeLifecycle.js`.

**Niet flatten:** `core/cognosAPI`, filterDock als observation-hub, `historyService` core, writeback set-orchestrator, owner API-grenzen, `runTabMutationSaga.js` zelf, `messageService` public surface (`notify`/`confirm`/`choose`).

De 150-regel cap is **slechts deels schuldig**. De meeste Support-files zijn 13–40 regels (ceremony, niet de cap). `tabMutationSupport` ~130 is het klassieke “split om onder 150 te blijven, daarna per owner kopiëren.”

---

## 4. Aanbevelingen — namen

**Policy voor nieuwe files:** `apply` / `commit` / `confirm` / `restore` / `bind` / `sync`. Geen `handle*`, geen `*Support.js`, geen `*Shared.js`. Een rest-file heet naar de echte taak.

**Bestaande `handle*`:** grandfatheren. Alleen hernoemen als het bestand toch opengaat. `handleTabMutationAction.js` is vier one-liners rond files die al bestaan — **delete, niet hernoemen**.

**Hoogste leeswinst (safe rename tenzij anders vermeld):**

| Huidig | Voorstel |
|---|---|
| `tabMutationSupport.js` (×4) | `guardTabMutation.js` + `resolveTabMutationScope.js` (owner-specifiek); shared guards blijven in `core/utils/filters/tabMutationRun/` |
| `ownerNotificationSupport.js` | `awaitOwnerInventoryAck.js` |
| `dispatchContentCreateShared.js` | `resolveContentOwnerApi.js` |
| `maybePush*HistoryStep.js` | `push*HistoryStep.js` (maybe is implementatie-hedge) |
| `stage*HistoryReplayHandler.js` | verwijderen; inline in orchestrator of `create*` |
| `routeNativeMultiSelectUserCommit.js` | fold in controller-dispatch, of `applyNativeMultiSelectCommit.js` |
| `applyTabMutationScopeOps.js` | `writeNativeMultiSelectHostValues.js` |
| `lookupNativeMultiSelectApi.js` / `ByName.js` | `findFilterItemById.js` / `findFilterItemByLabel.js` |
| `tabMutationSagaSupport.js` | `runTabMutationOwnerPhases.js` |
| `managePopupDisplayResync.js` | `syncPopupDisplay.js` |
| `config/actions.js` (filters) | op termijn `config/actionTypes.js` (widgets/tabs-conventie) |
| `singleSelectControllerInternals.js` | delete |

**Houden:** `create<Module>Controller.js`, `__orchestrator*`, duidelijke verb+noun (`applyTabMutation`, `commitConfirmedSelection`, `placeWidgetOnCanvas`, `collectWidgets`), domain-Duits, widgetTopN `*Helper*` (Cognos helper-visualisatie, geen leftover-folder), `handoff` als named dock→owner payload.

---

## 5. Aanbevolen volgorde (PO-gate per tranche)

Readability eerst, uniformity meeliften. Geen Cognos-gedrag in dezelfde PR als een rename. P0-leaks uit structure-audit-2 (KDB.js destroy-registry, widgetVis topNGate, kdbControl document-listeners, singleSelect `.getValues()`, historyService `Date.now()` in reducer) blijven **voorgaan** als veiligheid en leesbaarheid in één programma zitten.

| Tranche | Inhoud | Klasse | Gedrag |
|---|---|---|---|
| **R0** | Delete pass-throughs: `*ControllerInternals.js`, `runSingleSelectInteraction.js` barrel, `observeDockPopupPipeline.js` barrel, lege toolbox-orchestrator, `writeFrameworkView.js`, `writeLifecycle.js`. Proef: `stage*` inlinen in één module (NMS). | MUST | Behoudend |
| **R1** | Regel-addities (zie §7). Naming-policy voor nieuwe files. `config/actionTypes.js` als canonieke naam voor **nieuwe** modules. | MUST (docs) | Geen runtime |
| **R2** | `dashboardPdf/helpers` → `effects/`; `dom/` → `view/` alleen als die modules toch open gaan; bindingPlan/widgetTopN `utils/` → precise folders. | SHOULD | Paden wijzigen, gedrag gelijk |
| **R3** | History-template inkorten (stage weg, maybePush hernoemen), één module per PR. | SHOULD | Behoudend als commit-if-diff identiek blijft |
| **R4** | Support-files hernoemen naar hun taak. widgetBase (+ remaining clones) adopteren `core/utils/filters/tabMutationRun`. | SHOULD | Behoudend; overlap met bestaande WP3 |
| **R5** | filterDock observation: hernoem synoniemen, geen merge-refactor. `nativeMultiSelect` in filterDock `OWNER_ROUTE_MAP` verifiëren (audit-2 onzekerheid). | MAY | Hernoemen veilig; route-map needs discussion |
| **R6** | Ceremonial reducers, thick cognosAPI, kennzahlDefaults shard | DEFER | structure-audit werk, deels needs discussion |

Bestaande consolidatie-WP’s (parameterSet / tabMutation, deels DONE 2026-08-16) **niet overdoen**.

---

## 6. Project-addities (nuttig voor dit grote project)

Niet “meer docs.” Vijf levende indexes, daarna freeze op nieuwe deltas en folder-READMEs. De zoektoets die een mens (en toekomstige AI) nodig heeft zit al in de tree: `"<module>/<verb>"` in `config/actions.js` of `config/actionTypes.js`.

### 6.1 First-week map

Als je X wilt wijzigen, begin in Y, publiek Z. Zoek eerst de module’s `config/actions.js` / `actionTypes.js` — dat is de echte TOC.

| Ik wil wijzigen… | Folder | Publiek |
|---|---|---|
| Filterwaarde na dock-confirm | `dashboard/filters/filterDock/` + owner (`handleFilterDockConfirm` / interaction) | `_KDB.api.filterDock` observeert; **bezit geen values**. Dispatch `"<owner>/filterDockStateChanged"` |
| Tab delete/move/duplicate | `dashboard/tabs/actions/runTabMutationSaga.js` | `_KDB.api.tabs.dispatch` — tabs schrijft geen filter/widget-state |
| Parameter set restore | `core/services/writeback/set/` (`runNormalRestore.js` = faselijst) | `_KDB.services.writebackSet` → `"<owner>/parameterSetRestoreRequested"` |
| Widget drop / launchpad | dragDrop `publishValidatedDrop` → `widgetBase/handleDropCreate` / `handleTakeFromLaunchpad` | `_KDB.api.dragDrop` / `_KDB.api.widgetBase`. Launchpad is parkeerplaats, niet de drop-workflow |
| Vis binding naar Cognos | `widgetVis/effects/continueBindingPlanAndApply.js` | `_KDB.api.widgetVis` → `_KDB.services.widgetBindingPlan` (puur) + `widgetBindingApply` |
| Undo/redo | `core/services/historyService` + `<module>/history/` | `_KDB.services.history`; chrome: `_KDB.api.historyControls`; registry: `collectReplayHandlers.js` |
| Header/footer | `dashboard/header/`, `dashboard/footer/` | `_KDB.api.header` / `footer` (direct dispatch) |
| Control-paneel / toolbox | `dashboard/canvas/kdbControl/` | `_KDB.api.kdbControl` |
| Tab-activatie side-effects | fact `tabs:changed` (`observeActiveTab.js`) | Een van de weinige echte bus-paden (widgetBase, kdbControl follow, dragDrop rebind) |
| PDF export | `pdfExportControls` + `dashboardPdf` | `_KDB.api.pdfExportControls` + `_KDB.services.dashboardPdf` |
| Cognos host-call | `core/cognosAPI/<theme>.js` | `_KDB.cognosAPI` — niet in feature-reducers |
| App wiring / mountvolgorde | `KDB3/js/KDB.js` | Er is **geen** `core/bootstrap/` ondanks de tekening in `filesExplained.md` |

Ook: `_KDB.services.tableData`, `_KDB.services.loading`, `_KDB.services.message`, `_KDB.api.metricsTree`, `_KDB.api.authoring`.

### 6.2 Vocabulary (tribal knowledge)

`lifecycleVocabulary.md` bestaat; **deze lijst niet**.

| Term | Betekenis in één zin |
|---|---|
| parameterSet | Opgeslagen dashboard-snapshot (compact v3 JSON). Restore is photo-per-position, niet “volg deze tab-identiteit.” |
| writeback | Drie services: Get (state → v3), Set (v3 → owners), Map (legacy → v3). Geen Cognos writeback-widget. |
| tabMutation | Live saga voor delete/move/duplicate. Content permuteert over **vaste Cognos-slots**. Roept geen `writebackSet.restore`. |
| slot-physical vs content-logical | Slot-ids (`tabId`, `pageId`, index) bewegen nooit. Namen, widgets, filterwaarden wel. |
| filterDock | Observer/router over Cognos filter-UI. Bezit geen filterwaarden. Routes via `ownerRoutes.js`. |
| sicht | First-class filter-owner die commits **delegeert** naar singleSelect. Geen generieke view-laag. |
| dienststelle | Org-unit hiërarchie-filter. Eigen module, eigen restore/tabMutation. |
| nativeMultiSelect / pcfs | Unowned Cognos multi-select (page-context en global). v3-bucket `filt.pcfs`. Oude naam: `pageContextPlain`. |
| bindingPlan / bindingApply | Plan = declaratief wat gebonden moet (puur). Apply = Cognos muteren. Callers bezitten state en history. |
| opSeq | Per-widget monotonic counter. Stale async wordt genegeerd. Geen v3-veld. |
| inventoryGeneration | Generatie van de ontdekte Cognos filter-instance-lijst. Restore/clear pint er één; mismatch → abort. |
| ownerNotification / ack | Na singleSelect reconcile/commit: directe API-dispatch + ack-wait naar sicht/specialSingleSelect. Geen bus-event. |
| saga / MutationResult / RestoreResult | Multi-owner phased run (`ok` / `degraded` / `failed`). Eerlijke restschade, geen distributed transaction. |
| traverse | Cognos-tabs aflopen zodat lazy pages bestaan vóór restore/mutatie. |
| launchpad | Parkeerplaats voor widgets niet op het canvas. `takeFromLaunchpad` / `routeToLaunchpad` zijn widgetBase-actions. |
| kdbControl | KDB-chrome (toolbox, settings, control shell). Geen Cognos-control. |
| runId vs operationId vs parameterSetRestoreRunId | Cancellation tokens. Door elkaar halen is een typische first-week bug. |
| scopeId / tabpanel | Cognos container-id; `global` vs per-tab. `stripTabpanel` is id-normalisatie, geen DOM-strip. |

### 6.3 Vijf addities, gerankt

| # | Additie | Nuttigheid | Onderhoudskost |
|---|---|---|---|
| 1 | `architecture/jsModuleMap.md` (of JS-sectie in `filesExplained.md`) — ~25 rijen: module → folder → `_KDB.api.*`/`services.*` → één zin. Bijwerken wanneer een orchestrator in `KDB.js` landt. | Hoogst | Laag |
| 2 | `architecture/domainGlossary.md` — de termen in §6.2. Sibling van `lifecycleVocabulary.md`. | Zeer hoog | Zeer laag |
| 3 | `architecture/userFlows.md` — vier flows (filter confirm, tab move, restore, widget drop) + vis-bind. User action → folder → action-type → API → “begin niet hier.” | Hoog | Laag |
| 4 | `contracts/INDEX.md` — live contracts vs actieve deltas vs `_archive/` / `futureTodo/` / `*-execution-spec.md`. Policy: nieuw gedrag in het **parent**-contract; delta alleen terwijl twee tracks parallel lopen, daarna fold of archive. | Hoog | Midden |
| 5 | Drie zinnen in `projectStructureRules.md`: **module** (`dashboard/`, `_KDB.api.*`) vs **service** (`core/services/`, `_KDB.services.*`) vs **util** (`core/utils/`, `_KDB.utils.*`). Als het runIds, snapshots of cancellation heeft, is het geen util. Rook: `core/utils/filters/tabMutationRun/` is saga-machinery die **niet** op `_KDB.utils` staat. Plus: “zoek `config/actions.js` vóór het contract.” | Hoog voor AI-churn | Bijna gratis |

**Hygiene goedkoper dan een zesde doc:** `eventSubscribe.md` is stale (TEST-paden, ontbrekende productie-events). `openDesignCandidates.md` noemt `widgetBindingService` nog als candidate terwijl Plan/Apply bestaan. `stateOwnership.md` noemt `_KDB.state.widgets` als van een `widgets`-module; de APIs zijn `widgetBase` / `widgetVis` / …. Stale maps kosten meer dan ontbrekende maps.

**Wat zou schaden:** per-folder READMEs; comments in elk file die de saga herhalen; launch prompts / execution specs / audit-rapporten als first-week pad; contracts dupliceren naar `KDB3/js`.

---

## 7. Regel-vragen (default: niet aanpassen)

Uitgangspunt blijft: file-limieten, verb+noun, orchestrator/controller, AMD, ownership.

| Regel | Spanning | Captain-aanbeveling |
|---|---|---|
| JS hard 150 / target 80–120 | Coordinators worden Support.js; de meeste Support-files zijn 13–40 regels ceremony | **Houden.** Companion: leftover-suffixes even verboden als `handle`. Optioneel: geen nieuwe file onder ~40 regels tenzij pure config. Liever één goedgekeurde 160-regel coordinator. |
| >6 / >10 imports | Thin orchestrators en `create*Controller` raken 10+ omdat ze routeren | **Houden.** Exception voor thin orchestrators al in de regel — toepassen, niet verruimen. |
| `handle`/`do`/`process`/`manage` verboden | 61 `handle*.js` in productie | **Houden voor nieuwe files.** Grandfather bestaande. Geen mass-rename. |
| Forbidden folders `helpers`/`shared`/`utils`-in-module | dashboardPdf/helpers en bindingPlan/utils bestaan | **Houden.** Fix bij aanraking (R2). |
| Canonical folders zonder actions/history/runtime/observation | De facto 8-folder standaard | **Wél aanpassen** (zie hieronder). |
| `__controller` als enige functienaam | Inconsistent; stack traces en grep lijden | Filename-matching export (`applyTabMutation`). `__controller` mag als alias, niet als enige naam. |
| `{ ok, degraded, stale }` | Boolean-regel zou honderden `isOk` forceren | `{ ok, diagnostics }` = Result-type, vrijgesteld. Echte flags wél prefix. |
| English-only vs domain-Duits | `sicht` → `view` botst met `view/` | English voor technical identifiers; glossary voor producttermen. |
| writeback `get/`/`set/` (werkwoorden als folder) | naming.mdc: folders zijn nouns | **Niet hernoemen.** Hoge churn, intentionele decompositie. |
| kdbControl `framework/` | klinkt als app-framework | **Niet hernoemen** in deze ronde. Het is chrome/shell. |

**Twee kleine regelwijzigingen die wél de moeite waard zijn (PO-akkoord):**

1. `feature-structure.mdc`: optionele folders `actions/`, `history/`, `runtime/`, `observation/` — only if they have real content. Service-specifieke splits (writeback get/set, widgetBindingPlan pipeline) blijven toegestaan.
2. `naming.mdc`: leftover-suffixes `Support`, `Helpers`, `Shared`, `Internals` even verboden als `handle`/`manage`. Split by **job**, not by overflow.

Gouden templates voor nieuwe code:

| Type | Kopieer |
|---|---|
| Filter | `nativeMultiSelect` (niet singleSelect) |
| Widget | `widgetVis` folder-set (niet widgetTopN) |
| Control | `pdfExportControls` |
| Service | `messageService` of writeback get/set/schema |

---

## 8. Relatie tot bestaande programma’s

| Document | Rol t.o.v. dit voorstel |
|---|---|
| `architecture/structure-audit-2.md` | Cognos-wrappers, size-hubs, P0 leaks. Blijft het pad voor upgrade-resilience. |
| `contracts/structure-captain-remediation-launch-prompt.md` | Implementatie-captain voor gedragsbehoudende splits. Mag parallel lopen zolang dezelfde files niet door twee agents worden geclaimd. |
| `contracts/futureTodo/parameterSet-tabMutation-consolidation-refactor-prompt.md` | WP0–WP4 deels DONE. R4 hierboven overlapt WP3 (widgetBase adopt tabMutationRun) — niet overdoen. |
| Dit document | Leesbaarheid, naming, folder-conventie, on-ramp. Geen Cognos-gedrag, geen reducer-rewrite zonder PO. |

Target is **niet** de slimste architectuur. Target is een codebase die saai, voorspelbaar, uniform en rule-compliant is — zonder onnodige machinery.

---

*Captain-synthese 2026-08-16. Geen code- of contractwijzigingen in deze pass.*

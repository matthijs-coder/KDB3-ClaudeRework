# Structure Audit — KDB3 (2026-07-10)

> **Historische snapshot (2026-07-10).** Geen levende checklist. Voeg geen per-module
> `adapters/create*Adapter.js` toe. Volg `contracts/cognosHostService.md` en de bijgewerkte
> `structure-audit-rubric.md` dimensie #3. Bevindingen hieronder beschrijven de tree van die datum.

> READ-ONLY audit tegen `architecture/structure-audit-rubric.md` (15 dimensies, P0/P1/P2), geankerd op
> `projectStructureRules.md` en de 10 MUST-rules. Scope: `KDB3/js/dashboard/**` en `KDB3/js/core/services/**`
> (~840 files, ~48.700 regels). Uitgevoerd door 18 per-module read-only rubric-subagents + lead-synthese.
> Dit rapport bevat uitsluitend bevindingen — geen fixes. Alles wat gedrag zou kunnen wijzigen is gemarkeerd
> als **needs discussion**.
>
> Findingformaat: `dimensie# | severity | file:line | beschrijving | voorgestelde actie | geschatte regel-reductie`.
> Paden zijn relatief t.o.v. de module-map. Contract-drift (#12) is overal alleen op code-signalen beoordeeld;
> de `contracts/*.md` zijn bewust niet gelezen (context-discipline) — zie per module "Onzekerheden".

---

## 0. Managementsamenvatting

**Algeheel beeld:** de redesign-architectuur (orchestrator/controller-split, pure reducers, state-vs-runtime-scheiding,
dispatch-API's) wordt breed gevolgd. Er is **nergens raw Cognos-hostaccess** (`__getDashboardAPI()`, `.getSpec()`,
`glassContext`) buiten wrappers gevonden — een sterke uitgangspositie. **Geen enkele module schrijft direct in
andermans state-subtree** (één legacy-uitzondering, zie P0's).

**De drie grootste structurele risico's:**

1. **Cognos-isolatie is half af (#3, P1, projectbreed).** Modules gebruiken `_KDB.cognosAPI.*`, maar bijna geen
   enkele module heeft de voorgeschreven `adapters/create<Module>Adapter.js`. Item-level SDK-aanroepen
   (`getValues`, `getItemName`, `getContainer`, `getSlotList`, `setSort`, `renderWidget`, …) zitten verspreid in
   `effects/`, `state/` en zelfs `view/`. Een Cognos-upgrade raakt daardoor tientallen files i.p.v. één adapterlaag.
   Enige positieve uitzondering: `tabs` (heeft `adapters/createCognosTabsAdapter.js`).
2. **File-size-overschrijdingen concentreren zich in een paar hotspots (#1, P1).** ~30 files boven hard limit 150,
   met extreme uitschieters: `writeback/set/createWritebackSetService.js` (820), `kdbControl/framework/buildControlPrimitiveGallery.js`
   (607), `writeback/schema/validateV3.js` (422), `kdbControl/framework/buildControlMainBlocks.js` (360),
   `kdbControl/framework/syncFrameworkViewFromState.js` (336), `dienststelle/state/selectors.js` (333),
   `tabs/effects/traverseTabs.js` (323), `tabs/state/reduceTabsAction.js` (294), `tabs/createTabsController.js` (289).
3. **Runtime-cleanup-gaten (#4).** Drie P0's (timers/waiters/document-listeners zonder destroy-pad) plus een
   terugkerend patroon van dode runtime-scaffolding (`abortControllers`/`pendingPromises` buckets die nergens
   gevuld worden).

**P0-bevindingen (4):**

| # | Locatie | Bevinding |
|---|---|---|
| P0-1 | `widgets/widgetSettings/view/bindWidgetSettingsPanel.js:100,147` | Twee `window.setTimeout`-calls niet geregistreerd in `runtime.timers`, geen cleanup bij destroy — post-dispose callbacks mogelijk. |
| P0-2 | `widgets/widgetVis/runtime/cleanupRuntime.js:5-21` | destroy ruimt topNGate-waiters/`setTimeout` niet op (dienststelleGate wél) — hangende timers na teardown. |
| P0-3 | `widgets/widgetBase/effects/cleanWidgetForTransfer.js:42-47` | Directe teardown-write op legacy per-widget subtree `_KDB.state.widgets[widgetId].listeners/subscriptions` — foreign/legacy state-mutatie (needs discussion: is dit subtree nog eigendom van content-modules?). |
| P0-4 | `canvas/kdbControl/framework/buildControlPrimitiveGallery.js:242-258` | `document.addEventListener("mousedown", …)` per color-field zonder AbortSignal/teardown — document-level listener leak na destroy. *(door subagent als #4 P1 gemeld; lead-upgrade naar P0 wegens uncleaned document-listener = leak-risico per rubric-severitydefinitie)* |

Geschatte totale regel-reductie bij uitvoeren van alle voorgestelde structurele acties: **ruwweg 3.500–4.500 regels**
(~8% van de scope), waarvan ~1.500 in `writeback` + `kdbControl` + `tabs` alleen.

---

## 1. Module-status in één oogopslag

| Module | Omvang | P0 | Grootste risico | Gezondheid |
|---|---|---|---|---|
| canvas/kdbControl | 44f / ~3.1k | 1 | oversize `framework/`-files, document-listener leak | matig |
| canvas/dragDrop | 21f / ~1.5k | 0 | helper-duplicatie, folderafwijking | goed |
| widgets/widgetVis | 81f / ~5.0k | 1 | topNGate-teardown, geen adapter | goed-matig |
| widgets/widgetSettings | 73f / ~4.3k | 1 | timer-leak, god-handlers, try/catch-bloat | matig |
| widgets/widgetBase | 64f / ~3.4k | 1 | Cognos in view/, runtime-conventie, 22 imports | matig |
| widgets/widgetText | 39f / ~2.1k | 0 | Cognos in view/, runtime-namespace | goed |
| widgets/widgetTopN | 29f / ~2.1k | 0 | file-size-druk, geen adapter | goed-matig |
| widgets/widgetDataTable | 10f / ~0.2k | 0 | bewuste scaffold; layout-achterstand | n.v.t. |
| filters/dienststelle | 64f / ~4.4k | 0 | `selectors.js` 333 regels mét Cognos-calls, timer-cleanup | matig |
| filters/filterDock | 59f / ~3.7k | 0 | host-DOM-koppeling zonder adapter, fan-in | goed-matig |
| filters/singleSelect | 41f / ~2.3k | 0 | state-mutaties buiten reducer, 11 imports | matig |
| filters/specialSingleSelect | 24f / ~1.4k | 0 | duplicatie met singleSelect | goed |
| filters/sicht | 33f / ~1.8k | 0 | DOM in effects/, hardcoded peer-strings | goed |
| tabs | 16f / ~1.9k | 0 | 6/16 files boven hard limit, zware duplicatie | zwak (file-size) |
| header | 20f / ~1.2k | 0 | god-controller, history-duplicatie met footer | goed-matig |
| footer | 17f / ~0.6k | 0 | idem, asymmetrie met header | goed |
| launchpad | 19f / ~1.5k | 0 | Cognos-traversal in state/, 2 hard breaches | goed-matig |
| metricsTree | 15f / ~1.2k | 0 | god-controller, reducer-impurity (`Date.now`) | goed-matig |
| controls/historyControls | 9f / ~0.5k | 0 | controller 174 regels | goed |
| services/widgetBindingApply | 40f / ~2.4k | 0 | Cognos-SDK-manipulatie zonder adapters/ | matig |
| services/widgetBindingPlan | 33f / ~1.7k | 0 | oversize controllers, 12 imports in buildPlan | goed |
| services/writeback | 11f / ~2.4k | 0 | 820-regel monolith, contract-mismatches | zwak (file-size) |
| services/tableData | 32f / ~1.5k | 0 | Cognos-parsing in effects, duplicatie | goed |
| services/historyService | 12f / ~0.6k | 0 | god-service-file 200 regels, reducer-`Date.now()` | goed-matig |
| services/loadingService | 12f / ~0.5k | 0 | duplicatie, layout-divergentie | goed |
| services root (orchestrator + collectReplayHandlers) | 2f / ~0.16k | 0 | centrale feature-kennis in core | goed |

---

## 2. Per-module findings

### 2.1 canvas/kdbControl (44 files, ~3.1k regels)

Indeling: root + `authoringMode/ effects/ events/ framework/ history/ settings/ state/ toolbox/` — geen `adapters/`, geen canonieke `view/` (heet `framework/`).

**#3 Cognos-isolatie:** geen raw hostaccess in 44 files; module is UI/settings-only. Geen actie.

**#1 File size**
- `1 | P1 | framework/buildControlPrimitiveGallery.js:1-607 | 4× hard limit; palette-read, color-dropdowns, switches, radios, buttons in één file | split: readColorPalette.js, wireColorFieldDropdown.js, createColorInput.js, createTogglePrimitives.js, createRadioGroup.js | ~350`
- `1 | P1 | framework/buildControlMainBlocks.js:1-360 | 2.4× hard limit; alle panel-section builders | split per sectie (fillDashboardSettings/fillGraphSettings/fillCommentSettings/…) | ~200`
- `1 | P1 | framework/syncFrameworkViewFromState.js:1-336 | monolithische view-sync (panels, placeholders, tabs, header/footer, switches) | split: syncPanelVisibility/syncPlaceholders/syncSettingsBoundInputs/syncTabEditUi/syncOwnerToggles | ~180`
- `1 | P1 | state/createKdbControlReducer.js:1-236 | framework- + settings-reducers in één file | split reduceFrameworkActions.js + reduceSettingsActions.js, router blijft | ~80`
- `1 | P1 | createKdbControlController.js:1-207 | dispatch-pipeline + history + mount/destroy in één file | split dispatchKdbControlAction.js, mount/destroyKdbControlRuntime.js | ~60`
- `1 | P2 | framework/buildControlHeader.js:1-149; bindFrameworkToolboxPlaceholderApis.js:1-148; settings/bindSettingsForm.js:1-142; history/applyControlSettingsHistoryReplay.js:1-142 | boven target 80–120 | extracties per file | ~165 totaal`

**#2 God-controller/orchestrator**
- `2 | P1 | framework/__orchestratorFramework.js:17-25 | event-subscription callback-body in orchestrator | verplaats naar effects/subscribeHeaderFooterToolboxSync.js | ~15`
- `2 | P1 | framework/syncFrameworkViewFromState.js:68-331 | god-view-sync: ~10 syncfuncties + 45-regel controller inline | zie split hierboven | (in #1)`
- `2 | P2 | createKdbControlController.js:167-197 | ~30 regels inline destroy-cleanup | extract effects/destroyKdbControlRuntime.js | ~20`

**#4 State vs runtime**
- `4 | P0 | framework/buildControlPrimitiveGallery.js:242-258 | document-level mousedown-listener per color-field zonder teardown | wire via AbortSignal van frameworkView of cleanup-registry onder _KDB.runtime.kdbControl.listeners | -`
- `4 | P1 | framework/bindFrameworkToolboxPlaceholderApis.js:68-91 | module-level rAF (tabSelectRaf) niet geannuleerd in destroy | cancel rAF in destroy-pad (needs discussion: timing) | -`
- `4 | P2 | createKdbControlController.js:149 | pendingPromises-bucket ongebruikt | verwijderen | ~1`
- `4 | P2 | framework/syncFrameworkViewFromState.js:278-288 | module-globals blijven na destroy staan tot remount | reset in destroy-helper | -`

**#6 API shape**
- `6 | P1 | createKdbControlController.js:124-136 | geen _isDisposed-guard op dispatch | guard toevoegen (needs discussion: no-op vs throw) | ~5`
- `6 | P1 | createKdbControlController.js:124-129 | gemengde dispatch-return (void vs Promise bij parameterSetRestoreRequested) | normaliseer return-contract (needs discussion) | -`
- `6 | P2 | createKdbControlController.js:137-138 | getState retourneert raw state i.p.v. via selectors | route via readKdbControlState | -`
- `6 | P2 | createKdbControlController.js:201-203 | named method syncView naast dispatch op publieke API | documenteren of intern maken (needs discussion) | -`

**#8 Duplicatie**
- `8 | P1 | framework/syncFrameworkViewFromState.js:7-20 + bindFrameworkPrimitiveVisuals.js:3-16 + settings/bindSettingsForm.js:3-16 | SETTINGS_*_INPUT_IDS drievoudig gedupliceerd | centraliseer in settings/config/settingsBoundInputIds.js | ~30`
- `8 | P1 | framework/bindFramework*.js (5 files) | readFrameworkBindContext + module-globals 5× gekopieerd | extract framework/readFrameworkBindContext.js | ~25`
- `8 | P1 | framework/syncFrameworkViewFromState.js:103-137 + settings/bindSettingsForm.js:28-102 | input-id→settings-action mapping dubbel (read vs dispatch) | gedeelde settings/settingsInputBindings.js | ~60`
- `8 | P2 | state/selectors.js:1-107 | volledige selector-module nergens geïmporteerd (dead) | wiren of verwijderen | ~107`
- `8 | P2 | state/writers/writeFrameworkView.js:1-33 | reducer-bypass-writer, nergens geïmporteerd | verwijderen (needs discussion) | ~33`

**#9 AMD:** `9 | P1 | createKdbControlController.js:1-14 | 12 imports (>10) | effects-bundle of sub-orchestrator | -`

**#10 Events**
- `10 | P1 | framework/bindFrameworkKdbActionToggles.js:21-31; bindFrameworkPrimitiveVisuals.js:33; bindFrameworkToolboxPlaceholderApis.js:31,66,83 | hardcoded owner-action-strings ("header/toggle", "footer/toggle", "header/startTitleEdit", "comments/startCreate", "tabs/add", "tabs/selectEditTarget") | importeer owner-constants | ~13`
- `10 | P1 | effects/settingsPostDispatchSideEffects.js:27-40 | hardcoded canvas-intent-strings | centraliseer in events/eventNames.js | ~8`
- `10 | P2 | events/eventNames.js:21-26 | legacy request-keys nergens gebruikt | verwijderen of documenteren | ~6`

**#11/#13/#14/#15 (selectie)**
- `11 | P2 | framework/buildControlMainBlocks.js:290-352 e.a. | Duitse UI-strings inline | centraliseer in labels-config/i18n | -`
- `13 | P2 | toolbox/__orchestratorToolbox.js:3-5 | no-op orchestrator | verwijderen of vullen (needs discussion) | ~7`
- `14 | P2 | createKdbControlController.js:59-66 | tryFrameworkSyncView slikt alle sync-fouten | log of laat bubbelen | -`
- `15 | P1 | (module) | geen adapters/; history/ en authoringMode/ top-level; framework/ i.p.v. view/ | herstructureer naar view/build|bind|sync + effects/history | -`
- `15 | P1 | framework/syncFrameworkViewFromState.js:3-4 | diepe cross-module imports naar header/footer i.p.v. owner-API/DI | dunne read-facade | ~10`

Positief: reducers puur, geen foreign writes, cross-module netjes via `_KDB.api.*.dispatch`.
Onzekerheden: contracts niet gelezen (`registerControl`, parameterSetRestore-stub, `syncView` op API niet verifieerbaar); history-contribution-merge gebeurt buiten scope.

---

### 2.2 canvas/dragDrop (21 files, ~1.6k regels)

Indeling: `config/ state/ events/` + domeinmappen `avatar/ dropboxes/ session/` — geen `view/ effects/ adapters/`.

- `3 | P2 | dropboxes/publishValidatedDrop.js:110-120 | toast via _KDB.cognosAPI.showToast (correct), maar UI-feedback in dropboxes/ i.p.v. effects/ | verplaats naar effects/showDropValidationToast.js | ~15`
- `1 | P1 | createDragDropController.js:1-175 | 175 regels (> hard 150) | runtime-init/cleanup naar effects/; controller alleen API-delegatie | ~55`
- `1 | P2 | session/startDragSession.js:1-138; avatar/createDragAvatarTemplates.js:1-117 | boven target | splits per verantwoordelijkheid | ~65`
- `2 | P2 | createDragDropController.js:102-155 | runtime-init/cleanup inline | extract effects/ensureDragDropRuntime.js + cleanup | ~45`
- `4 | P2 | dropboxes/updateDragHover.js:67-97 + session/finishDragSession.js:35-42 | dubbele activeDropboxEl-referentie (root-alias + domRefs) | root-alias verwijderen | ~8`
- `4 | P2 | __orchestratorDragDrop.js:34-38 + controller:107-111 | runtime-buckets (subscriptions/observers/pendingPromises/abortControllers) nergens gevuld | verwijderen | ~20`
- `4 | P2 | session/startDragSession.js | cleanupPartialStart mist clearMarkedSources + riep ongedefinieerde removeLayoutGrid aan | opgelost 2026-07-13: delegeert nu naar finishDragSession | -`
- `6 | P2 | createDragDropController.js:156-161 | disposed-guard warn+return i.p.v. throw | needs discussion (projectbrede conventie) | -`
- `8 | P1 | __orchestratorDragDrop.js:29-41 + controller:102-114 | ensureRuntime volledig gedupliceerd | één effects/ensureDragDropRuntime.js | ~25`
- `8 | P1 | session/startDragSession.js:62-76 + avatar/createDragAvatarTemplates.js:110-114 | parseDimensionToPx dubbel, met afwijkende eenheid-logica | unify (needs discussion: cm/mm-verschil kan bewust zijn) | ~20`
- `8 | P2 | dropboxes/bindDropboxes.js:52-58 + validateDropIntent.js:45-51 + publishValidatedDrop.js:73-81 | readParentTabId/resolveTabElement 3× | extract dropboxes/resolveParentTabId.js | ~25`
- `8 | P2 | session/ + avatar/ (4 plekken) | removeRuntimeElement/removeDocumentDragOverListener gedupliceerd | extract session/runtimeDomCleanup.js | ~30`
- `8 | P2 | state/selectors.js:33-35 e.a. | cloneSerializable 3× lokaal | naar _KDB.utils | ~15`
- `10 | P2 | createDragDropController.js:30,49,92,166 | interne "dragDrop/*" action-strings hardcoded | config/actionNames.js | ~5`
- `11 | P2 | dropboxes/publishValidatedDrop.js:115-119 | Duitse gebruikersteksten inline | config/messages.js | ~8`
- `11 | P2 | config/defaults.js:14-20 vs updateDragHover.js:70,99 + finishDragSession.js:67 | classnames in defaults gedefinieerd maar elders hardcoded | defaults consequent gebruiken | ~7`
- `14 | P2 | createDragDropController.js:25-96 + updateDragHover.js:9-62 | mechanische try/catch rond sync DOM-flows | reduceer tot boundaries | ~25`
- `15 | P1 | (module) | avatar/ dropboxes/ session/ i.p.v. view/ effects/ | hergroepeer bij volgende refactor | -`
- `15 | P2 | dropboxes/readHelperTabIds.js:13-19; publishValidatedDrop.js:71; startDragSession.js:107 | foreign reads (launchpad-state-fallback, tabs.currentTabId) en eigen state zonder selector | gebruik owner-selectors/API | ~4`

Positief: pure reducer, geen foreign writes, DOM/listeners netjes in `_KDB.runtime.dragDrop` met destroy-cleanup, alleen `cognosAPI.showToast` als Cognos-touch.

---

### 2.3 widgets/widgetVis (81 files, ~5.0k regels)

Indeling: `config/(visTypes/) state/ view/(legend/) effects/(gates/,focusMode/) runtime/ lifecycle/ actions/(cleanup/,shared/)` — geen `adapters/` of `events/`.

- `4 | P0 | runtime/cleanupRuntime.js:5-21 | destroy ruimt topNGate-waiters (setTimeout) niet op; dienststelleGate wél | rejectAllTopNGateWaiters toevoegen in cleanupRuntime + cleanupWidgetRuntime (needs discussion: reject vs resolve timing) | ~15`
- `4 | P1 | runtime/cleanupRuntime.js:48-74 | cleanupWidgetRuntime cleant pendingPromises.topNGate niet | timer cancel + waiter reject per widget | ~10`
- `3 | P1 | (module-breed) | _KDB.cognosAPI.visualization/widgets/filters direct in 6+ effect-files; geen createWidgetVisAdapter.js | adapters/createWidgetVisAdapter.js; route alle Cognos-calls daarheen | -`
- `3 | P2 | effects/ensureVisType.js:4-20 | effect accepteert ruwe visApi | naar adapterlaag | ~10`
- `1 | P1 | view/legend/legendCaptionDom.js:1-157; view/legend/installLegendTextObserver.js:1-161; effects/gates/topNGate.js:1-161 | drie files boven hard 150 | splits per verantwoordelijkheid (selectors vs mutators; waiter-lifecycle vs orchestration) | ~115`
- `1 | P1 | effects/buildBindingSpec.js:76-143 | functie ~68 regels (> hard 60) | mappers naar buildBindingSpecMappers.js | ~25`
- `1 | P1 | 10 files 121–146 regels (buildBindingSpec, buildVisualizationTitleText, legendCaptionText, handleContentCreate, cleanupVisualizationContent, createWidgetVisReducer, normalizeHierarchySnapshot, createWidgetVisController, contentReady, controllerHelpers) | boven target | incrementele splits (details in subagent-rapport) | ~350`
- `1 | P2 | 11 files 107–119 regels | boven target-ondergrens | splitsen bij volgende touch | ~80`
- `2 | P1 | view/legend/installLegendTextObserver.js:85-156 | ~72-regel functie met inline business-logica | extract observer-core | ~25`
- `5 | P2 | controllerHelpers.js:67-70 + __orchestratorWidgetVis.js:23 | init van parent-bucket _KDB.state.widgets | centraliseer parent-init bij widgets-owner (needs discussion) | -`
- `6 | P2 | createWidgetVisController.js:38-43,116-125 | isDisposed i.p.v. _isDisposed; getState na destroy → undefined zonder guard | align conventie (needs discussion) | -`
- `8 | P1 | effects/gates/topNGate.js:8 + effects/buildBindingSpec.js:5 | dubbele deep-import core/services/widgetBindingPlan/utils/normalizeDefaultValue.js | re-export via config of _KDB.utils | -`
- `8 | P2 | cleanupVisualizationContent.js:11 + legendCaptionDom.js:4 | LEGEND_TITLE_SELECTOR dubbel | view/legend/legendSelectors.js | ~8`
- `8 | P2 | 3 effect-files | herhaald cognosAPI-null-check-patroon | adapter-helper | ~20`
- `9 | P1 | actions/handleContentCreate.js:1-10 + actions/actionRouter.js:1-11 | 10 imports (restructure-drempel) | router-facade | -`
- `9 | P1 | effects/resolveTopNJahrFilterValue.js:2 e.a. (3 files) | deep-imports naar core/config buiten module | injectie via config-facade | -`
- `9 | P2 | actions/actionRouter.js:36-48 | routes-map per dispatch opnieuw opgebouwd | naar module-scope | ~10`
- `10 | P2 | effects/gates/topNGate.js:116 + actions/handleCleanupContent.js:15 | hardcoded "widgetTopN/resolveRequested"/"widgetTopN/cleanup" | constants importeren | -`
- `11 | P2 | runtime/ (folder) | naam botst met _KDB.runtime-concept | hernoemen (needs discussion) | -`
- `13 | P2 | lifecycle/writeLifecycle.js:1-14 | dead file (nergens geïmporteerd; zou reducer bypassen) | verwijderen | ~14`
- `14 | P2 | runtime/contentReady.js:14-113 + createWidgetVisController.js:25-125 | mechanische try/catch+rethrow op elke helper/methode | beperk tot boundaries | ~45`
- `15 | P1 | (module) | geen adapters/ en events/; extra mappen actions/ lifecycle/ runtime/ | adapters/ toevoegen; afwijking documenteren of convergeren | -`

Positief: pure reducer, geen foreign writes, geen raw hostaccess, cross-module via `_KDB.api.*.dispatch`.

---

### 2.4 widgets/widgetSettings (73 files, ~4.3k regels)

Indeling: root (orchestrator, controller, routeWidgetSettingsDispatch) + `config/(12) state/(5) view/(23) effects/(15) actions/(6) runtime/(4) history/(4) lifecycle/(1) events/(1)` — geen `adapters/`.

- `4 | P0 | view/bindWidgetSettingsPanel.js:100 | window.setTimeout(runDeferredIconDispatch, 50) niet in runtime.timers; geen cleanup | registreer + clear bij abort/destroy (needs discussion: timing) | ~10`
- `4 | P0 | view/bindWidgetSettingsPanel.js:147 | window.setTimeout(closeDropdowns, 0) idem | zelfde timer-registry-patroon | ~6`
- `4 | P1 | runtime/initializeRuntime.js:12 | runtime.timers-bucket bestaat maar wordt nergens gevuld | gedeelde scheduleWidgetSettingsTimer-helper of bucket verwijderen | -`
- `1 | P1 | view/bindWidgetSettingsPanel.js:1-154 | hard limit 150 overschreden | split: panelPointerHandlers.js, panelDocumentPointerListener.js, deferredIconDispatch.js | ~45`
- `1 | P1 | actions/handleSeedDefaults.js:43-136 | runSeedDefaults ~94 regels (> hard 60); god-handler (readiness, collect, 3 apply-loops, aggregatie) | fase-splits: runSeedReadinessPhase / applyColourDefaultsLoop / applySingleDefaultsLoop / applyVisBatchPhase | ~40`
- `1 | P1 | effects/orchestrateResetToLaunchpad.js:1-135; effects/finalizeVisIntentResult.js:1-133; effects/buildWidgetVisSettingsSnapshot.js:1-127; actions/handleCommitColour.js:1-121 (runCommitColour ~56r) | boven target, lange promise-ketens/handlers | stap-extracties per file | ~110`
- `1 | P1 | 10 verdere files 87–119 regels (resolveWidgetPlacementContext, placeAllWidgetControls, applyVisStartupSeedBatch, applySingleStartupDefault, applyWidgetSettingsOptionHistoryReplay, dispatchWidgetSettingsIntent, buildWidgetSettingsPanel, buildDropdownOption, populateTableDropdown, cleanupWidgetControls, recordWidgetSettingSeedStatus) | boven/nabij target | splits (details subagent-rapport) | ~150`
- `2 | P1 | view/bindWidgetSettingsPanel.js:37-76,78-96,124-137 | onPanelPointerDown/onPanelClick/onDocumentPointerDown met selectie-, history-, dispatch- en dropdown-logica inline | extract panelOptionPointerHandler / panelIconPointerHandler / panelOutsidePointerBehavior | ~50`
- `2 | P1 | effects/finalizeVisIntentResult.js:43-130 | completion-handlers combineren effect + state-commit | split commit-pad naar effects/commitIntentResultToState.js | ~22`
- `3 | P1 | (module-root) | geen adapters/; host-reads verspreid (_KDB.properties.visualizationsDataPropObj in populateTableDropdown.js:89-91; _KDB.runtime.core.domRefs in resolveRenderRoot.js:3-4) | dunne host-adapter | ~5`
- `3 | P1 | view/applyWidgetSettingsButtonVisibility.js:27-31 + view/panelOutsidePointerBehavior.js:21-30 | ad-hoc foreign reads van _KDB.state.kdbControl + _KDB.runtime.kdbControl | via kdbControl public reader | ~10`
- `5 | P1 | __orchestratorWidgetSettings.js:28 + createWidgetSettingsController.js:68-70 | schrijft parent-namespace _KDB.state.widgets = {} | alleen eigen subtree initialiseren; parent-init bij widgets-owner | -`
- `6 | P1 | createWidgetSettingsController.js:45 | disposed-dispatch retourneert stilletjes {ok:true, skipped} | align disposed-conventie (needs discussion) | -`
- `8 | P1 | effects/collectVisualStartupDefaults.js:74-95 + history/applyWidgetSettingsOptionHistoryReplay.js:64-85 | findDropdownByKind gedupliceerd (met normalizeKind-divergentie!) | gedeelde view/findDropdownByKind.js | ~25`
- `8 | P1 | actions/applySingleStartupDefault.js:73-100 + effects/finalizeVisIntentResult.js:97-121 | commitReportToSettings-logica dubbel | gedeelde state/commitReportToSettings.js | ~22`
- `9 | P1 | view/placeAllWidgetControls.js:1-9 + effects/dispatchWidgetSettingsIntent.js:1-9 | 8 imports (>6) | facade/bundeling | -`
- `10 | P1 | 9 hardcoded cross-module dispatch-strings: panelOutsidePointerBehavior.js:14-15 ("widgetBase/setMoveMode","widgetBase/resizeToggle"); waitForVisualContentReady.js:14; orchestrateResetToLaunchpad.js:25,55,88; dispatchVisSettingsBatch.js:9; handleCommitColour.js:39,100 | gedeelde action-type-constants | -`
- `10 | P2 | events/eventNames.js:1-3 | lege stub | vullen of verwijderen | ~3`
- `11 | P2 | resolveWidgetPlacementContext.js:82-98 (kennzahlenTable naast metricsTable); controlDefinitions.js:22,31 ("Löschen"); buildDownstreamIntentAction.js:58-62 (einmalig/aktiv/aan) | mixed vocabulaire | consolideren (needs discussion: backward compat) | ~5`
- `14 | P1 | bindWidgetSettingsPanel (8×), buildWidgetSettingsPanel (5×), cleanupRuntime (6×), cleanupWidgetControls (6×), createWidgetSettingsController (6×), ~20 view-files (1-4×) | systematische try/catch-bloat rond lokale sync code | module-brede error-policy: boundary-only | ~80-120`
- `15 | P1 | (module-root) | afwijkende mappen actions/ history/ lifecycle/ runtime/; geen adapters/ | align of documenteer; lifecycle/ (1 file) mergen | ~5`

Positief: dunne orchestrator, dispatch-only API, AbortController-cleanup voor listeners, geen raw Cognos-SDK, downstream consequent via `_KDB.api.*.dispatch`.

---

### 2.5 widgets/widgetBase (64 files, ~3.4k regels)

Indeling: root + `actions/(14) config/(2) state/(9) view/(11) effects/(18) history/(10)` — geen `adapters/`, geen `events/`.

- `5 | P0 | effects/cleanWidgetForTransfer.js:42-47 | schrijft/teardownt _KDB.state.widgets[widgetId].listeners/subscriptions (legacy per-widget subtree) | route via content-owner API; verwijder directe legacy-mutatie (needs discussion: is subtree nog owned?) | ~15`
- `3 | P1 | (module-breed) | cognosAPI in 7 files (view+effects) zonder adapter | adapters/createWidgetBaseAdapter.js | ~40-60`
- `3 | P1 | effects/readCanvasDiscoverySources.js:38-116 | raw Cognos canvas-object-traversal (.getId, geneste getContainer) | host-parsing naar adapter | ~30`
- `3 | P1 | view/applyWidgetLayout.js:18-24; view/applyWidgetColour.js:35-49; view/resolveWidgetShell.js:55-63 | Cognos-calls (setLayoutPosition, getContent+setPropertyValue, eligibility-check) in view/ | naar effects/adapter; view krijgt data | ~45`
- `3 | P2 | effects/buildCanvasWidgetDescriptor.js:42-70 | gedupliceerde Cognos meta-enrichment | centraliseer in adapter | ~25`
- `1 | P1 | 10 files 108–147 regels (resolveLaunchpadRoute 147, widgetResizeInteraction 144, createWidgetBaseReducer 135, readCanvasDiscoverySources 128, createWidgetBaseController 120, handleRouteToLaunchpad 119, placeWidgetOnCanvas (layout-math ~55r in view), handleDropCreate 112, widgetMoveInteraction 110, applyWidgetBaseLaunchpadTransferHistoryReplay 108) | boven target, geen hard breaches | splits per file (details subagent-rapport) | ~215`
- `2 | P1 | effects/widgetResizeInteraction.js:41-53 + effects/widgetMoveDraggableInit.js:40-58 | jQuery-callbacks met layout-read+dispatch+setTimeout inline | benoemde factory-scope handlers | ~40`
- `2 | P2 | actions/handleRouteToLaunchpad.js:37-62 | diep geneste .then-callbacks | flatten naar benoemde stappen | ~10`
- `4 | P1 | state/ensureWidgetBaseRuntime.js:4-17 | runtime onder _KDB.runtime.widgetBase.byId i.p.v. canoniek _KDB.runtime.widgets[widgetId] | align (needs discussion — geldt voor hele widget-familie) | -`
- `6 | P2 | createWidgetBaseController.js:29,62 | isDisposed-naam + misleidende errorCode WIDGET_BASE_DESTROY_FAILED bij disposed dispatch | hernoem (needs discussion) | -`
- `8 | P1 | effects/readWidgetLayoutFromDom.js:56-58 | verboden legacy-namespace _KDB.utilities.convertToPx | migreer naar _KDB.utils | ~5`
- `8 | P1 | state/resolveLaunchpadRoute.js:98-113 + effects/buildCanvasWidgetDescriptor.js:75-86 | firstNonEmpty/normalize + isHostWidget dubbel | state/descriptorUtils.js | ~30`
- `8 | P2 | config/launchpadChannels.js:14-15 | Cognos widget-type-vocabulaire lokaal | naar cognosAPI/gedeelde config | ~10`
- `9 | P1 | createWidgetBaseController.js:1-22 | 22 AMD-imports (>10 restructure) | actions/createActionRouter.js; controller importeert router+core | ~10`
- `9 | P1 | actions/handleDropCreate.js:1-14 (14) + actions/handleRouteToLaunchpad.js:1-11 (11) | import-bloat | context-factory per workflow | ~10`
- `10 | P1 | effects/subscribeDropValidated.js:9 | hardcoded "canvas:dropValidated" | importeer emitter-constant | ~3`
- `10 | P2 | widgetResizeInteraction.js:16 + widgetMoveDraggableInit.js:16; dispatchContentCreate.js:62-71; dispatchWidgetSettingsPlaceControls.js:32; history/applyWidgetBase*.js | hardcoded eigen + foreign action-strings | actionTypes-constants | ~20`
- `11 | P2 | widgetMoveInteraction.js:9-13 (einmalig/aktiv/aan); dispatchWidgetSettingsPlaceControls.js:23,55-60 (kennzahlenTable) | mixed vocabulaire | config/moveModes.js; naming-align (needs discussion) | -`
- `12 | P2 | actions/handleParameterSetReset.js:4-41 | bewuste stub met contractdelta-verwijzing | tracken als open contract-item | -`
- `14 | P2 | view/resolveWidgetShell.js:59-62 + readCanvasDiscoverySources.js:61-66 | mechanische try/catch | versimpel | ~10`
- `15 | P1 | (module) | geen adapters/ + events/; actions/ + history/ extra | adapters toevoegen; variant documenteren | -`
- `15 | P2 | dispatchWidgetSettingsPlaceControls.js:1-2 + createWidgetBaseController.js:8 | diepe cross-module imports (widgetSettings-selectors, launchpad-selectors) | DI via orchestrator | ~5`

Positief: pure reducer, action-delegatie, geen raw `getDashboardAPI`/`getSpec`.

---

### 2.6 widgets/widgetText + widgetTopN + widgetDataTable (78 files, ~4.4k regels)

**widgetText** (39f, ~2.1k) — `actions/ config/ state/ view/ effects/ runtime/ history/` + root dispatch-context:
- `3 | P1 | view/applyTextFontSize.js:88-99 | Cognos fontSize via getContent/setPropertyValue in view/; geen adapter | setCognosFontSize naar adapter + dunne effect-wrapper | ~15`
- `3 | P1 | view/resolveWidgetTextShell.js:7 | raw document.getElementById i.p.v. _KDB.elements/gedeelde resolver | delegeren naar centrale selector | ~5`
- `1 | P1 | createWidgetTextController.js:1-133; state/createWidgetTextReducer.js:1-131; view/applyTextFontSize.js:1-130 | boven target | splits (lifecycle-helpers, reducer-helpers, normalisatie vs Cognos vs DOM) | ~100`
- `2 | P2 | actions/startInlineTextEdit.js:37-48 | geneste onConfirm/onCancel met commit-flow | extract bindEditCallbacks.js (needs discussion: async commit) | ~20`
- `4 | P1 | runtime/initializeRuntime.js:5-15 | _KDB.runtime.widgetText.byId i.p.v. _KDB.runtime.widgets[widgetId] | familie-brede runtime-conventie alignen | -`
- `6 | P2 | createWidgetTextController.js:92-105 | dispatch retourneert Promise; siblings inconsistent | standaardiseer over widget-familie | -`
- `8 | P1 | createWidgetTextController.js:1-10 | 9 imports | verdunnen | ~10`
- `14 | P2 | meerdere view/actions/effects | mechanische try/catch | boundary-only | ~30-50`

**widgetTopN** (29f, ~2.1k) — `actions/ config/ state/ effects/ runtime/ utils/`:
- `3 | P1 | effects/readHelperTableRows.js:33-38 | cognosAPI.widgets.renderWidget direct; geen adapter; plus import van widgetVis/effects/applyVisualizationProperties.js | adapters/createWidgetTopNAdapter.js | ~12`
- `1 | P1 | createWidgetTopNController.js:1-149; state/createWidgetTopNReducer.js:1-147; actions/handleResolveRequested.js:1-147; runtime/ensureWidgetTopNRuntime.js:1-138 | nabij/op hard limit | splits (controllerHelpers, reducerHelpers, resolvePipeline, abortUtils) | ~155`
- `1 | P2 | 5 effects-files 105–129 regels | boven target | splits bij touch | ~120`
- `2 | P2 | actions/handleResolveRequested.js:126-139 | runtime-mutatie in action i.p.v. effects/ | verplaatsen | ~15`
- `4 | P1 | state/createWidgetTopNReducer.js:31-32 | DESTROY wist byOwner niet (widgetText wist wél) | needs discussion: bewuste retentie of leak | -`
- `4 | P1 | runtime/ensureWidgetTopNRuntime.js:18-26 | runtime.widgetTopN.byOwner i.p.v. runtime.widgets[widgetId] | familie-conventie | -`
- `6 | P1 | createWidgetTopNController.js:70-72 | disposed dispatch retourneert ok:true met errorCode DESTROY_FAILED | corrigeer naar ok:false/skipped (needs discussion) | -`
- `10 | P2 | effects/readTopNHelperCandidates.js:18-19 ("launchpad/readSlotWidgets"); effects/dispatchTopNResolved.js:10 ("widgetVis/topNResolved") | hardcoded foreign strings | constants | -`
- `11 | P2 | utils/ | vage foldernaam | hernoemen | -`
- `15 | P1 | __orchestratorWidgetTopN.js:9-13 | orchestrator init geen state/runtime (widgetText wél) | align verantwoordelijkheden | -`

**widgetDataTable** (10f, ~0.2k) — bewuste scaffold:
- `4 | P1 | runtime/initializeRuntime.js:5-14 | module-runtime i.p.v. per-widget | plan bij implementatie | -`
- `6 | P1 | createWidgetDataTableController.js:39-43 | sync dispatch-return; siblings Promise | align (needs discussion) | -`
- `6 | P2 | lifecycle/writeLifecycle.js:4-7 | directe state-write buiten reducer/dispatch | reducer bij groei | -`
- `15 | P1 | (module) | mist actions/ view/ adapters/ vs siblings | spiegelen bij implementatie | -`

**Familie-duplicatie/-inconsistentie (cross-cutting binnen widgets):** cloneSerializable dubbel (Text/TopN, DataTable met andere naam); normalizeDispatchResult met verschillende velden; controller-boilerplate 3 varianten; runtime-init 3 varianten; runtime-plaatsing alle drie `_KDB.runtime.widget<X>` i.p.v. gedocumenteerd `_KDB.runtime.widgets[widgetId]`; orchestrator-verantwoordelijkheden divergent; destroy-state-gedrag divergent; dispatch-return-shape divergent (Promise vs sync); geen enkele widget-module heeft `adapters/`.

---

### 2.7 filters/dienststelle (64 files, ~4.4k regels)

Indeling: `config/ state/ view/ effects/ history/` + root — geen `adapters/`, geen `events/`.

- `3 | P1 | (module) | geen adapter; Cognos-hostlogica in 10+ effect-files | adapters/createDienststelleAdapter.js als enige Cognos-touchpoint | ~80-120`
- `3 | P1 | state/selectors.js:233-266 | selector roept _KDB.cognosAPI.filters aan en werkt met host-SDK-item-objecten (getItemId etc.) | resolveHierarchyItemId* naar adapter; selector alleen state→DTO | ~40`
- `3 | P1 | effects/lookupDienststelleFilterApi.js:15-105 | centrale lookup met directe Cognos-itemmethodes | fold in adapter | -`
- `3 | P1 | effects/applyDienststelleDefault.js:11-29 + clearDienststelleFilterScope.js:5-23 + applyStoredDienststelleScopeValues.js:27-121 + clearDienststelleHostFilter.js:62 | herhaald replaceFilterContext/clearPageContextFilter over meerdere effects | consolideer write-paden in adapter | ~60`
- `3 | P1 | effects/listDashboardTabScopeIds.js:23-27 | directe cognosAPI.tabs.getTabsContainers() in effect | via adapter of gedeelde tabs-wrapper | -`
- `1 | P1 | state/selectors.js:1-333 | 333 regels (hard 150): readers + snapshot-builders + metrics-rewrite + Cognos-resolve | split readDienststelleSelectors / buildHierarchySnapshot / adapter-deel | ~120`
- `1 | P1 | createDienststelleController.js:1-155 | boven hard 150 | guards extraheren | ~25`
- `1 | P1 | view/applyDienststelleDisplaySanitizing.js:1-149; effects/routeDienststelleDispatch.js:1-146; effects/applyStoredDienststelleScopeValues.js:1-145; state/createDienststelleReducer.js:1-145 | nabij hard limit | splits per file | ~145`
- `2 | P1 | effects/handleDienststelleHistoryReplay.js:43-104 | ~62-regel inline replay-orchestratie | stageHistoryReplaySteps.js met named helpers | ~30`
- `2 | P1 | state/selectors.js:269-323 | reconcile-achtige businesslogica in selector-laag | naar state/buildHierarchySnapshot.js | ~25`
- `4 | P1 | effects/reconcileConfirmedDienststelle.js:39-41 + scheduleDienststelleViewSync.js:57-72 + reconcileDienststelleHostScopes.js:12-15 | setTimeout/rAF zonder registratie in runtime.timers, geen destroy-cleanup | track + cancel in cleanupDienststelleRuntime (needs discussion: timing) | -`
- `4 | P2 | view/dienststelleDisplayLabelSanitizeSupport.js:5 | module-scope WeakMap voor DOM-label-state | naar runtime of stateless (needs discussion) | -`
- `6 | P2 | createDienststelleController.js:110-130,33-39 | dispatch retourneert state-snapshot (gemengd surface); named getCurrentHierarchySnapshot naast dispatch | documenteer contract (needs discussion) | -`
- `8 | P2 | state/selectors.js:7-16 + state/cloneJsonValue.js + effects/buildVisualizationWidgetDienststellePayload.js:4-13 | drievoudige JSON-clone-helpers | _KDB.utils | ~25`
- `8 | P2 | view/sync*.js (3 files) | SCOPE_BUCKETS gedupliceerd | config/scopeBuckets.js | ~10`
- `8 | P2 | 8+ effects | herhaald filtersApi-resolve-patroon | adapter-factory | ~30`
- `8 | P2 | state/selectors.js:1-3 | state importeert effects (laag-inversie) | lookup naar adapter | -`
- `9 | P2 | effects/routeDienststelleDispatch.js:1-8 (9) + handleDienststelleHistoryReplay.js:1-9 (8) | import-smell | router splitsen | -`
- `10 | P2 | effects/notifyVisualizationWidgetDienststelleChanged.js:15 | hardcoded "widgetVis/dienststelleChanged" | constant importeren | -`
- `13 | P2 | notifyVisualizationWidgetDienststelleChanged.js:20 + history/maybePushDienststelleHistoryStep.js:36 + 15 files | console.info/warn/error als operationele logging | logging-service | -`
- `15 | P1 | (module) | geen adapters/ + events/; history/ top-level | align layout | -`

Positief: orchestrator 37 regels wiring-only; reducers puur; geen foreign writes; subscriptions met teardown.

---

### 2.8 filters/filterDock (59 files, ~3.7k regels)

Indeling: root + `config/ state/ effects/ observation/(25) compat/ lifecycle/ runtime/` — geen `adapters/ events/ view/`.

- `3 | P1 | effects/dispatchFilterHandoff.js:1-133 | host-DOM-koppeling + OWNER_ROUTE_MAP zonder adapter | adapters/createFilterDockAdapter.js; route-map naar config/ | ~40`
- `3 | P1 | 7+ files (resolveFilterInteraction.js:61; bindDockClickListener.js:16-21; observation/bindDockObserver.js:4-9; evaluateObservedDockState.js:26-31; dispatchPopupDisplayResync.js:19-24; closeActivePopup.js:20-21; waitForFilterDockReady.js:24-27) | document.querySelector/waitForElObserver verspreid | consolideer naar runtime/readDockRoot.js + adapter | ~60`
- `3 | P1 | config/selectors.js:1-21 vs waitForFilterDockReady.js:21-22 | dock-selectors deels extern geïnjecteerd, niet in module-config | volledige selector-set naar config (needs discussion indien bewust) | -`
- `1 | P1 | observation/evaluateObservedDockState.js:1-147 | 147 regels + 11 imports (>10) | popup-routing → routePopupObservation.js; readers → selectors | ~50`
- `1 | P1 | observation/managePopupDisplayResync.js:61-135 | attach-functie ~74 regels (> hard 60) | attach-validatie vs observer-setup splitsen | ~35`
- `1 | P1 | state/createFilterDockReducer.js:24-113 | reduce-functie ~90 regels (> hard 60) | per action-type handlers | ~30`
- `1 | P2 | 8 files 101–124 regels (detectAndDispatchFiltersReady, readClickIntent, clickOriginalPopupButton, resolveFilterInteraction (controller ~77r), cleanupFilterDockRuntime, evaluatePopupDisplayResyncSession, mountFilterDockController, createFilterDockController) | boven target | splits per file | ~180`
- `5 | P2 | effects/readFilterScope.js:9-10 | foreign read _KDB.state.tabs.currentTabId | via tabs-API/reader | -`
- `6 | P2 | createFilterDockController.js:21,42-44 | isDisposed + warn/return | conventie alignen (needs discussion) | -`
- `8 | P1 | 4 files (bindDockObserver, bindDockClickListener, evaluateObservedDockState, dispatchPopupDisplayResync) | resolveDockRoot 4× gedupliceerd terwijl runtime/readDockRoot.js bestaat | overal readDockRoot gebruiken | ~40`
- `8 | P1 | evaluateObservedDockState.js:34-43 vs state/selectors.js:22-39 | readers inline gedupliceerd | selectors hergebruiken | ~15`
- `8 | P1 | 3 observation-files | readFilterWrapperCount 3× | extract effects/readFilterWrapperCount.js | ~25`
- `8 | P1 | effects/dispatchFilterHandoff.js:15-44 | cross-module action-strings gedupliceerd t.o.v. siblings | gedeelde filters-constants | -`
- `9 | P2 | mountFilterDockController (8), resolveFilterInteraction (7), managePopupDisplayResync (7) | import-smell | facades | -`
- `9 | P2 | compat/getFilterConfig.js:1 | import core/utils/getKennzahlenSource buiten module | DI via orchestrator | -`
- `11 | P2 | compat/ | vage foldernaam | hernoemen naar config/ of adapters/ | -`
- `14 | P2 | observation/detachPopupDisplayResync.js:53-54 | lege catch | loggen of invariant documenteren | -`
- `15 | P1 | (module) | observation/(25 files) compat/ lifecycle/ runtime/ i.p.v. canoniek effects/adapters/view | observation-DOM → effects/; host-lees → adapters/ | -`

Positief: dunne orchestrator (57r), pure reducer, runtime compleet onder `_KDB.runtime.filterDock` met destroy-cleanup, geen raw Cognos-SDK, geen foreign writes.

---

### 2.9 filters/singleSelect + specialSingleSelect (65 files, ~3.7k regels)

**singleSelect** (41f, ~2.3k) — `config/ state/ effects/(27) history/(4)` + root; geen `adapters/ events/ view/ runtime/`:
- `3 | P1 | effects/resolveFilterApi.js:4-53 | Cognos filter-item-lookup (getPageContextItemsArr, getAllGlobalFilterItems, getItemName/Id/Scope) inline | adapters/createSingleSelectAdapter.js | -`
- `3 | P1 | effects/verifyCommitFilterValue.js:4-11 | direct filterApi.getValues() | readFilterValues naar adapter | -`
- `3 | P1 | effects/commitConfirmedSelection.js:33-70 + replayCommittedSelection.js:96-127 + restorePreviousConfirmedSelection.js:5-15 | replaceFilterContext over 3+ effects | centrale commit/rollback-adapter | ~25`
- `1 | P1 | effects/replayCommittedSelection.js:1-149 | nabij hard limit; Sicht-replay + generieke replay + Cognos-commit | split replaySichtHistory / replayGenericFilterHistory | ~40`
- `1 | P2 | createSingleSelectController.js:1-140; restorePopupSelection.js:18-121; resolveFilterValueFromTable.js:1-126; 3 files 106-109r | boven target | splits per file | ~115`
- `4 | P1 | state/ensureFilterState.js:48-55 + commitConfirmedSelection.js:48-49 | transient flags (isCommitInProgress, wasHydratedFromDom, appliedInteractionSeq) in _KDB.state | naar runtime (needs discussion: restore-semantiek) | -`
- `4 | P2 | controller:32-44 vs orchestrator:24-32 | runtime-init dubbel | één runtime/ensureSingleSelectRuntime.js (zoals special) | ~15`
- `5 | P1 | effects/processFilterDockHandoff.js:38-45 + state/ensureFilterState.js:17-80 | per-filter mutaties buiten reducer/dispatch (directe byScope-writes in eigen subtree) | via reducer-actions of expliciete owner-writers (needs discussion) | -`
- `6 | P1 | createSingleSelectController.js:99-123 | gemengd model: reducer alleen lifecycle, filter-acties in effects | documenteren of reducer uitbreiden (needs discussion) | -`
- `9 | P1 | effects/commitConfirmedSelection.js:1-12 | 11 imports (>10) | commit-pipeline herstructureren | -`
- `10 | P1 | effects/requestFilterDockPopupAction.js:13,32 + notifyOwnerAfterCommit.js:28-29 | hardcoded "filterDock/...", "sicht/singleSelectCommitted", "specialSingleSelect/userSelectionCommitted" | owner-constants | -`
- `15 | P1 | (module) | mist adapters/ events/ view/ runtime/ | align met special (runtime/) + adapters | -`

**specialSingleSelect** (24f, ~1.4k) — `config/ state/ effects/(13) runtime/(2)` + root:
- `3 | P1 | effects/resolveSpecialFilterApi.js:5-27 | subset-duplicaat van singleSelect-lookup | gedeelde adapter | ~25`
- `3 | P1 | effects/applyAutomaticSpecialSelection.js:15-54 | direct getValues/replaceFilterContext/clearPageContextFilter | adapter | ~30`
- `1 | P1 | effects/runSpecialSingleSelectSync.js:1-150 | op hard limit; dispatch + abort + sync-loop + routing in één file | split dispatchInternal/scheduleSync/routeAction | ~45`
- `2 | P2 | runSpecialSingleSelectSync.js:22-143 | dispatchInternal+routeAction+sync in één file | routing van scheduling scheiden | ~40`
- `6 | P1 | createSpecialSingleSelectController.js:74-81 | dispatchInternal geëxporteerd uit effect-file | naar controller/state-helper | -`
- `8 | P2 | buildSpecialTableDataInputs.js:40-47 + readDefaultOptionFromTableData.js:4-16 | table-helpers duplicaat van singleSelect | gedeelde helpers | ~22`
- `10 | P2 | effects/delegateToSingleSelect.js:4-5,26-28 | hardcoded singleSelect-action-strings | constants (cross-import of shared) | -`
- `15 | P1 | vs singleSelect | bewuste delegatie-architectuur (special → single) niet gedocumenteerd | delegatie-contract vastleggen | -`

**Duplicatie tussen beide (dedup-winst ~130–170 regels):** handoff-mapping (~20r), Cognos-lookup (~22r), table-input builder (~8r), option-cell-normalisatie (~12r), controller-lifecycle (~45r), orchestrator-bootstrap (~22r), reducer-lifecycle (~18r). Gedeelde basis haalbaar: `filters/shared/` (handoff-base, resolveGlobalFilterApi, table-helpers) zonder de bewuste delegatie te vervangen.

---

### 2.10 filters/sicht + filters-root (33 files, ~1.8k regels)

Indeling: `sicht/{config,state,effects,history}` + root orchestrator/controller. Filters-root bevat géén losse .js — submodules mounten zelfstandig (needs discussion of dat bewust is; mount-wiring in KDB.js buiten scope).

- `3 | P1 | effects/resolveSichtGlobalFilterApi.js:29-52 | Cognos-filterresolutie (getAllGlobalFilterItems, getItemName/Id) in effect | adapters/createSichtAdapter.js | ~25`
- `3 | P1 | effects/commitStartupSichtDefault.js:56-62 + history/applySichtHistoryReplay.js:57-68 | replaceFilterContext verspreid; geen centraal commitpad | adapter of dedicated effect | ~15`
- `1 | P1 | createSichtController.js:1-151 | boven hard 150 | dispatch-routing/lifecycle-helpers extraheren | ~20-35`
- `1 | P2 | history/applySichtHistoryReplay.js:1-124 | boven target | resolveReplaySelection + requestSingleSelectReplaySync splitsen | ~20`
- `9 | P1 | createSichtController.js:1-10 | 9 imports | dispatch-router-effect | -`
- `10 | P1 | effects/delegateToSingleSelect.js:73-75; commitConfirmedSicht.js:38 ("dienststelle/sichtChanged"); notifySpecialSingleSelect.js:10 ("specialSingleSelect/sichtChanged"); history/applySichtHistoryReplay.js:43,108 | hardcoded cross-module dispatch-strings | peer-constants importeren | -`
- `5 | P2 | effects/resolveSichtGlobalFilterApi.js:10-11 | directe foreign read _KDB.state.kennzahlenSource naast utils | uitsluitend _KDB.utils.getKennzahlenSource | -`
- `8 | P2 | state/selectors.js:4-12 + history/readDependencySnapshots.js:4-12 | cloneObject dubbel; SICHT_FILTER_LABEL dubbel; inline state-reads naast selectors | _KDB.utils + config + selectors gebruiken | ~12`
- `11 | P2 | effects/mapFilterDockHandoff.js:22 | mapper heet __controller (verwarrend) | hernoemen | -`
- `14 | P2 | createSichtController.js:76-142 | try/catch rond sync controller-flow | boundary-only | ~10`
- `15 | P1 | effects/syncSichtOptionAvailability.js:38-92 + applySichtOptionState.js:13-43 + resolveSichtPopupMount.js:19-88 | DOM-logica in effects/ i.p.v. view/ (peers hebben view/) | verplaatsen naar view/ | -`
- `15 | P2 | (module) | history/ sibling; runtime-helpers in effects/ i.p.v. runtime/ | align met peers | -`

Onzekerheid: `replaceFilterContext` sync in startup maar `await` in history-replay — gedragsverschil, needs discussion.
Positief: geen P0, pure reducer, runtime-cleanup aanwezig, geen raw hostaccess.

---

### 2.11 tabs (16 files, ~1.9k regels)

Indeling: `config/ state/ effects/ adapters/ events/` + root. **Zwaarste file-size-overtreder van het project naar verhouding: 6 van 16 files boven hard limit 150.**

- `1 | P1 | createTabsController.js:1-289 | +139 boven hard limit | split: effects/traverseDispatch.js, state/tabGuards.js, effects/cleanupTabsRuntime.js | ~135`
- `1 | P1 | effects/traverseTabs.js:1-323 | +173 boven hard limit | split: view/readTabButtons.js, effects/traversePayload.js; logTraverse verwijderen | ~100`
- `1 | P1 | state/reduceTabsAction.js:1-294 | boven hard limit | split reducers per groep (sync/traverse/rename/editUi); dode resolveRenameTarget weg | ~80`
- `1 | P1 | effects/applyTabsEffects.js:1-183 | boven hard limit | buildTabsSyncPayload.js + gedeelde view/readTabButtons.js | ~60`
- `1 | P1 | effects/bindTabRenameEditSession.js:1-206 | boven hard limit | view/resolveTabDom.js + gedeelde guards | ~50`
- `1 | P1 | state/selectors.js:1-172 | boven hard limit | state/kdbControlProjection.js + tabGuards | ~40`
- `2 | P1 | createTabsController.js:111-195 | traverse-validatie + state-writes zowel in controller als traverseTabs.js | traverse-orchestratie volledig naar effects/ | ~65`
- `2 | P1 | effects/applyTabsEffects.js:95-179 | buildSyncPayload + ~15 DOM-helpers in één effect | benoemde helpers view/ | ~70`
- `3 | P2 | effects/traverseTabs.js:244-247 | tab-activatie via raw DOM .click() buiten adapter | dunne cognosAPI.tabs.setActiveTab overwegen (needs discussion: gedrag) | -`
- `3 | P2 | effects/applyTabsEffects.js:121-157 | direct document.querySelectorAll voor Cognos-tab-DOM | gedeelde view/readTabButtons.js | ~30`
- `4 | P1 | effects/traverseTabs.js:191-210 | withTimeout-timer niet in runtime.timers, destroy ruimt niet op | registreren of gedeelde delay-helper | -`
- `4 | P2 | controller:35-50 (startup-promise niet geabort); orchestrator:57-60 (ongebruikte runtime-slots) | abort-patroon (needs discussion); slots verwijderen | ~10`
- `6 | P1 | __orchestratorTabs.js:13 | readActiveTabId niet op _KDB.api.tabs terwijl projectregels dit noemen (contract-drift #12 P1) | reader aan publieke API toevoegen | -`
- `7 | P2 | state/reduceTabsAction.js:218-229 | dode resolveRenameTarget in reducer | verwijderen | ~22`
- `8 | P1 | 3 files | readTabButtons-cluster drievoudig gekopieerd (~90r) | view/readTabButtons.js | ~60`
- `8 | P1 | controller vs traverseTabs (2×) | traverse-options-normalisatie + payload-validatie dubbel | gedeelde config/validator | ~35`
- `8 | P1 | 6 plekken | isDashboardTab/isRenamableUserTab/isVisibleUserTab 6× gekopieerd | state/tabGuards.js | ~50`
- `8 | P1 | 4 plekken | resolveRenameTarget/findTabById 4× | gedeelde helper | ~40`
- `8 | P2 | config/selectors.js vs state/selectors.js | twee "selectors"-bestanden met andere betekenis | hernoem config → domSelectors.js | -`
- `10 | P1 | events/eventNames.js:5-8 | CHANGED/RENAMED/TRAVERSED/ERROR gedefinieerd maar nergens gepubliceerd | publish implementeren of opruimen | -`
- `10 | P2 | createTabsController.js:254-255 | hardcoded "authoring:entered"/"authoring:exited" | emitter-constants | -`
- `13 | P2 | traverseTabs.js:229-231 + renderTabEditIcons.js:105-109 | console.log in productie (logTraverse; icon-stub) | verwijderen/flaggen | ~10`
- `14 | P2 | orchestrator + controller + syncTabsDomFromState | try/catch per stap/subfunctie | boundary-only | ~50`
- `15 | P2 | (module) | geen view/; adapter dekt alleen naam/containers/content | view/ introduceren; adapter uitbreiden (needs discussion) | -`

Positief: **enige module met een echte Cognos-adapter** (`adapters/createCognosTabsAdapter.js`); reducer puur; geen foreign writes; destroy grotendeels compleet.

---

### 2.12 header + footer (37 files, ~1.8k regels)

**header** (20f, ~1.2k) — `config/ dom/ effects/ events/ history/ state/` + root; geen `adapters/ view/`:
- `1 | P1 | createHeaderController.js:1-155 | boven hard 150; factory ~97 regels (> hard 60) | split resolveMountTarget / headerDispatchHelpers / parameterSetRestoreStub | ~35`
- `1 | P1 | state/createHeaderReducer.js:4-132 | reducer-body boven target | handlers per groep splitsen | ~30`
- `2 | P1 | createHeaderController.js:13-115 | god-controller: snapshots, mount-target, commit-preemption, restore-stub inline | delegeren naar state/ + effects/ | ~40`
- `4 | P2 | controller destroy reset edit-metadata niet; bindHeaderEditSession.js:78-91 setTimeout buiten AbortSignal | edit-metadata resetten; timers koppelen (needs discussion) | -`
- `5 | P2 | effects/__orchestratorHeaderEffects.js:68-69 | foreign read _KDB.state.footer.status | footer-selector/API | -`
- `6 | P1 | createHeaderController.js:99-101 | dispatch retourneert boolean óf Promise | uniformeren (needs discussion) | -`
- `8 | P1 | controller:13-20 + effects-orchestrator:19-26 | snapshotChrome intern dubbel | gedeelde chromeSnapshot.js | ~12`
- `8 | P1 | effects/__orchestratorHeaderEffects.js:6,68-70 | header roept footer/dom/syncFooterFromState direct aan (cross-module import) | footer-sync via footer-API/event (needs discussion) | -`
- `10 | P2 | reducer + effects + history | dispatch-actietypes ("header/toggle" etc.) overal string literals; alleen bus-event heeft constant | config/actionNames.js | -`
- `11 | P2 | dom/buildHeaderChrome.js:40,53,69 | Duitse UI-strings inline | config/i18n | -`
- `13 | P2 | dom/buildHeaderChrome.js:27-34 + syncHeaderFromState.js:45-56 | draftTitleEl/draftSubtitleEl altijd hidden, nooit gebruikt | dead DOM verwijderen of draft-flow implementeren (needs discussion) | ~15`
- `15 | P2 | dom/ i.p.v. view/ | align foldernaam | -`

**footer** (17f, ~0.6k):
- `1 | P1 | createFooterController.js:1-136 | factory ~104 regels (> hard 60) | onHeaderConfirmed / restore-stub / wouldActivate extraheren | ~35`
- `2 | P1 | createFooterController.js:25-82 | activation-guard, mount-wait, subscription-handler inline | delegeren | ~25`
- `5 | P2 | dom/syncFooterFromState.js:31 | directe read _KDB.state.header.titleText | header-selector | -`
- `6 | P1 | createFooterController.js:57-59 | mixed dispatch-return (zelfde als header) | uniformeren (needs discussion) | -`
- `8 | P1 | state/selectors.js:1,9 | importeert header-selectors direct | shared chrome-selectors of header-API | -`
- `9 | P1 | createFooterController.js:1-10 | 8 imports | herstructureren na extracties | -`
- `11 | P2 | dom/buildFooterChrome.js:26 | hardcoded URL bi-dev.digital-wien.gv.at | naar config | -`
- `13 | P2 | dom/syncFooterFromState.js:21 | hardcoded fallback-datum "26.4.2026" | config-default | -`
- `15 | P1 | (module) | asymmetrie met header: geen config/, inline reducer-helpers, mount-target wél apart (header niet) | symmetrie herstellen | ~25`

**Duplicatie header↔footer (dedup-winst ~180–220 regels, ~11% van gecombineerd):** history-subboom near-copies
(stage/create/maybePush/build/apply-replay-handlers, 50–95% overlap), `setHidden` 100% identiek, place-helpers ~80%,
ensure/teardown-chrome ~55%, SOURCE/validSource ~70%, parameterSetRestore-stub ~90%, kdbControl-syncView-glue ~70%.
Voorstel: shared `dashboard/chromeHistory/*` + `dashboard/chromeDom/*` utilities.

---

### 2.13 launchpad + metricsTree + controls/historyControls (43 files, ~3.3k regels)

**launchpad** (19f, ~1.5k) — `config/ state/ view/ effects/` + root; geen `adapters/ events/`:
- `3 | P1 | state/buildLaunchpadTabDescriptors.js:111-130 | Cognos-layout via cognosAPI.tabs direct in state-laag | adapters/createLaunchpadCognosAdapter.js | ~45`
- `3 | P1 | state/buildLaunchpadTabsFromCanvas.js:56-64 | raw SDK-traversal (getContainer().getId()) op canvas-objecten | naar adapter: readTabIdsFromCanvas() | ~25`
- `1 | P1 | effects/readSlotWidgets.js:1-159 + state/buildLaunchpadTabDescriptors.js:1-163 | twee hard breaches | splits (slot-element-resolve / collect; adapter-extract / tab-resolutie) | ~75`
- `1 | P2 | createLaunchpadController.js:1-141 + view/buildLaunchpadDom.js:1-139 | boven target | runtime-helpers / buildPad+buildSlot extraheren | ~50`
- `2 | P2 | createLaunchpadController.js:107-129 | readiness/validatie inline | effects/launchpadReadiness.js | ~25`
- `6 | P2 | createLaunchpadController.js:46-52 | dispatch retourneert Promise | state | undefined gemengd | normaliseren (needs discussion) | -`
- `8 | P2 | readSlotWidgets + selectors + placeLaunchpadDom + buildLaunchpadDom | doesSlotMatchTab/resolveOwnerDocument/readHostSelector/selector-fallbacks gedupliceerd | state/launchpadDomHelpers.js | ~35`
- `10 | P2 | controller:2-3,19,138-139 | action-types deels constanten, deels inline | config/actionNames.js | -`
- `15 | P2 | (module) | clearLaunchpadRuntime.js buiten effects/; geen adapters/ events/ | herplaatsen; adapter toevoegen | -`

**metricsTree** (15f, ~1.2k) — `config/ state/ view/ adapters/`; geen `effects/ events/`:
- `1 | P1 | createMetricsTreeController.js:1-156 + state/buildMetricsTreeNodes.js:1-163 | twee hard breaches | mount-pipeline + dataload → effects/; leaf-build apart | ~95`
- `2 | P1 | createMetricsTreeController.js:8-30,122-148 | god-controller: mount-pipeline + async dataload inline | naar effects/ | ~55`
- `7 | P1 | state/createMetricsTreeReducer.js:30,48-49 | reducer roept Date.now() (impurity) | timestamp via payload injecteren | -`
- `1 | P2 | view/renderMetricsTrees.js:1-150 | op hard limit | buildTreeDom + initJsTree apart | ~40`
- `4 | P2 | view/bindMetricsTreeSearch.js:31-43 | rAF-id niet in runtime.timers | registreren/cancellen (needs discussion) | -`
- `5 | P2 | view/bindMetricsTreeDragDrop.js:7 + renderMetricsTrees.js:11 | views lezen state direct | selectors gebruiken | -`
- `8 | P2 | renderMetricsTrees + cleanupMetricsTrees | resolveRoot/readRuntime dubbel | shared dom-context | ~20`
- `15 | P2 | (module) | geen effects/ (logica in controller); adapters/ alleen dragDrop | effects/ toevoegen | -`

**controls/historyControls** (9f, ~0.5k) — `config/ view/ effects/ observation/`; geen state (runtime-only control):
- `1 | P1 | createHistoryControlsController.js:1-174 | boven hard limit; mount/remount/cleanup/API in één file | cleanup → effects/clearHistoryControlsRuntime.js; mount → effects/mountHistoryControls.js | ~60`
- `2 | P1 | idem:78-150 | god-controller | controller ≤40r wiring | ~70 (overlapt met #1)`
- `3 | P2 | config/domSelectors.js:5 | Cognos-toolbar-selector hardcoded (com.ibm.bi.dashboard.toolbars.actionBar) — DOM-koppeling | dunne toolbar-adapter overwegen (needs discussion) | -`
- `4 | P2 | observation/bindToolbarObserver.js:39-42 | MutationObserver op document.body subtree:true (breed; disconnect wél aanwezig) | target versmallen (needs discussion) | -`
- `6 | P2 | controller:169-172 | API alleen mount/destroy (afwijkend van dispatch-modules) | bewuste afwijking documenteren | -`
- `8 | P2 | bindHistoryControlsClick.js:4-6 + syncHistoryControlsView.js:4-6 | readHistoryService dubbel | gedeelde reader | ~8`
- `15 | P2 | observation/ | non-standaard mapnaam | mergen onder effects/ | -`

Positief overall: launchpad dispatch-API conform (`launchpad/readSlotWidgets`, `waitUntilReady`); historyControls voorbeeldig in lifecycle-cleanup en event-constant-gebruik.

---

### 2.14 services/widgetBindingApply (40 files, ~2.4k regels)

Indeling: root + `config/(1) effects/(33) runtime/(2) diagnostics/(2)` — geen `state/ adapters/`.

- `3 | P1 | effects/createCognosBindingSortMethods.js:43-52 | diepe SDK-traversal (getSlotList→getDataItemList→setSort) | naar adapters/ of cognosAPI.visualization | ~40`
- `3 | P1 | effects/createCognosBindingTopBottomMethods.js:9-47 + createCognosBindingSlotMethods.js:12-24 + createCognosBindingFilterMethods.js:17-44 | data-item-iteratie, slot-mutaties, local-filter-contract inline in effects | dedicated adapterlaag | ~85`
- `3 | P1 | effects/createCognosBindingFacade.js:8-53 | facade in effects/ i.p.v. adapters/create<...>Adapter.js | hernoem/verplaats | -`
- `1 | P1 | 4 controller-functies boven hard 60: applyBindingPlan.js:20-103 (~84r), runApplySlotsFiltersPhase.js:37-121 (~85r), runApplyBindingRenderSteps.js:18-120 (~103r), applySlots.js:6-88 (~83r) | fase-splits per file | ~100`
- `1 | P2 | applyLocalFilters (63r-functie), finishRenderWait (65r-functie), 2 files 123-124 regels | net boven limieten | splits | ~45`
- `2 | P1 | effects/applyBindingPlan.js:20-103 | service coördineert volledige binding-lifecycle — feature-achtige orchestratie in core service | service-grens vs widgets-module bevestigen (needs discussion) | -`
- `2 | P1 | ~10 filter-build-files | Cognos-filter-domeinvocabulaire (keepexclude, forceEmpty, hierarchyKeepexclude) in core service | verplaatsing naar widgets/gedeelde cognosAPI.filters evalueren (needs discussion) | -`
- `2 | P2 | applyBindingPlan.js:38-79 | 5× herhaald abort-check-blok | guardAbortedOrContinue-helper | ~15`
- `4 | P2 | runtime/ensureWidgetBindingApplyRuntime.js:11-14 + createWidgetBindingApplyService.js:37-46 | pendingPromises/abortControllers-buckets nooit gevuld; destroy leegt wat nergens geregistreerd wordt | dead scaffolding verwijderen of implementeren | ~8`
- `8 | P1 | effects/resolveBindingApplyOptions.js:4-44 | plan-interpretatie (vis-type-canonicalisatie e.d.) overlapt vermoedelijk met widgetBindingPlan | gedeelde config/reader (needs discussion) | ~30`
- `8 | P2 | effects/bindingApplyStepHelpers.js:14-33 | 4 bijna-identieke abort-return-helpers | mergen tot 2 | ~12`
- `9 | P1 | applyBindingPlan, runApplySlotsFiltersPhase, runApplyBindingMiddleSteps | 7 imports elk | step-bundles | -`
- `11 | P2 | runtime/manageBindingApplyTimers.js | zwak werkwoord manage; diagnostics/ niet-standaard map | hernoemen | -`
- `13 | P2 | 18 files | console.error/warn zonder logging-service | routeren | -`
- `14 | P2 | createCognosBindingFacade.js:9-57 + applySlots/applyLocalFilters guard-checks | redundante try/catch en surface-checks na upstream-validatie | opschonen | ~17`
- `15 | P1 | (root) | geen adapters/; geen state/ (stateless executor — afwijkend van tableData/history) | adapterlaag; stateless-keuze documenteren (needs discussion) | -`

Positief: geen foreign writes, geen raw getDashboardAPI/getSpec, timers opgeruimd in destroy/finally, kleine effect-files als basispatroon.

---

### 2.15 services/widgetBindingPlan (33 files, ~1.7k regels)

Indeling: root (orchestrator, service, buildPlan) + `config/ diagnostics/ filters/ intent/ mirror/ parsing/ policy/ slots/ utils/ validate/`.

- `1 | P1 | filters/buildLocalFilters.js:1-136 | boven target | split addWidgetFilters/addKennzahlDefaults/addDimensionFilters naar filters/sources/ | ~40`
- `1 | P1 | 3 controller-functies boven hard 60: slots/resolveSlotColumnIds.js:29-104 (~76r), slots/buildSlotPlan.js:25-97 (~73r), filters/buildHierarchyFilter.js:37-107 (~71r) | per-concern helpers | ~65`
- `2 | P1 | slots/resolveSlotColumnIds.js:29-104 | god-controller: dimension/sequence/pie/hierarchy-compositie inline | resolveDimensionColumns/resolveSequenceColumns/injectHierarchyColumns | ~30`
- `3 | P2 | buildHierarchyFilter.js:97-103 + utils/rewriteUniqueNameSourceToken.js:12-29 + filters/matchFilterPropEntry.js:4-25 | geen raw SDK, wel Cognos/TM1-bindingvocabulaire (unique names, _TM1) zonder centrale catalogus | token/filter-mode-constants centraliseren (needs discussion) | -`
- `8 | P1 | slots/resolveSlotColumnIds.js:2-7 | slots/ importeert filters/-helper (laagkoppeling) | naar gedeelde submap | -`
- `8 | P1 | buildHierarchyFilter.js:33-35 + resolveSlotColumnIds.js:25 | datasource-token-resolutie dubbel | resolveDatasourceTargetToken.js | ~8`
- `8 | P2 | hierarchy-pipeline + d/u-normalisatie overlappend (2 paren) | gedeelde helpers | ~55`
- `9 | P1 | buildPlan.js:1-12 | 12 imports (>10) | buildPlanStages.js of sub-orchestrators | -`
- `11 | P2 | utils/; Kennzahl-vocabulaire | vage map; domein-aliassen | hernoemen; glossary | -`
- `12 | P2 | config/planReasons.js:4 + validate/validateSpec.js:10 | dataTableHelper toegestaan in validatie zonder plan-branch | contract vs gedrag verifiëren (needs discussion) | -`
- `14 | P2 | __orchestratorWidgetBindingPlan.js:7-14 | try/catch rond 3-regel wiring | versmallen | ~5`

Positief: stateless pure planner; geen state/runtime/foreign writes/events; nul raw Cognos-hostaccess; schone plan/apply-scheiding (geen cross-imports).

---

### 2.16 services/writeback (11 files, ~2.4k regels)

Indeling: `__orchestratorWriteback.js`(57) · `cognosWritebackBridge.js`(183) · `get/`(87+142) · `set/createWritebackSetService.js`(**820**) · `map/`(74) · `schema/`(114+60+332+422+68). **Grootste file-size-probleem van het project.**

- `1 | P1 | set/createWritebackSetService.js:1-820 | 5.5× hard limit; restore-orchestratie, run-context, guards en alle fase-flows in één monolith | split in ~9 files: set/config/restoreConstants.js, set/effects/{executeRun,runNormalRestore,runFilterRestore,runWidgetRestore,runNewDashboardReset,historyLoadingGuards}.js, set/state/createRunContext.js, set/helpers/restoreHelpers.js; kern ~100r | ~670`
- `1 | P1 | schema/validateV3.js:1-422 | 2.8× hard limit | split per schema-sectie (core/ds/sections/filters/widgets) | ~270`
- `1 | P1 | schema/normalizeV3.js:1-332 | 2.2× hard limit | split per domeinsectie (top/ds/filters/widgets) | ~180`
- `1 | P1 | cognosWritebackBridge.js:1-183 | boven hard limit | split installLifecycle / parseBridgePayload / kern-delegatie | ~90`
- `1 | P2 | get/collectors/collectCanvasSettings.js:1-142 | boven target | collectDefaultsNew apart | ~35`
- `2 | P1 | set-service: executeRun ~66r, runNormalRestore ~102r, runFilterRestore ~91r, createRunContext ~132r (met geneste dispatchOwnerPhase ~74r) | god-service: 25 restore-fasen over 10+ feature-owners in core | herstructureer naar set/effects/ per domein met dunne coördinator | ~400 (structureel, overlapt #1)`
- `2 | P1 | cognosWritebackBridge.js:96-155 | bridgeSet ~60r met payload-normalisatie + format-routing | parsing naar parseBridgePayload.js | ~35`
- `3 | P1 | cognosWritebackBridge.js:26-75 | directe window.top-mutatie (WBParameterGet/SetFunction) zonder cognosAPI-wrapper | _KDB.cognosAPI.writeback.installGlobals() wrapper (needs discussion: install-semantiek) | -`
- `4 | P2 | set-service:56-102 | _activeRun-Promise in module-closure; destroy zet alleen cancelRequested | lifecycle-contract documenteren of expliciete teardown (needs discussion) | -`
- `5 | P2 | get/collectors/collectCanvasSettings.js:147-148 | directe read _KDB.state.kdbControl | readKdbControlState gebruiken | -`
- `6 | P2 | orchestrator:21-32 | vier losse writeback*-surfaces i.p.v. één facade | unified facade overwegen (needs discussion) | -`
- `8 | P1 | get-service:50-51 + map-service:34-35 + bridge:131-137 | normalize→validate-pipeline 3× gedupliceerd | schema/runTerminalPipeline.js | ~25`
- `9 | P1 | set-service:512-528,613-620 | geneste subfuncties in createRunContext (AMD-anti-pattern) | hoisten | ~23`
- `12 | P1 | get-service:41-48 vs collectors | collector bestaat maar is niet gewired in collect() (code-divergentie) | wiren of als WIP markeren (needs discussion) | -`
- `12 | P1 | bridge:135-137 vs map-service:47-54 | bridge stuurt v2 naar writebackMap.toV3 dat "not implemented" gooit — evidente mismatch | v2-adapter implementeren of v2-pad blokkeren vóór productie-enable (needs discussion) | -`
- `13 | P2 | collectCanvasSettings.js (ongewired, functioneel dead) + map-service:17 (void _KDB) | opruimen of wiren | ~142`
- `14 | P2 | set-service:677-696 + get-service:68-74 | try/catch rond optionele calls / silent null-return | versimpelen | ~17`
- `15 | P2 | (root) | geen state/ effects/ adapters/ op root; monolith-layout | alignen bij split | -`

Positief: owner-dispatch i.p.v. foreign writes (P0-vrij), runtime onder `_KDB.runtime.writeback`, geen verspreide Cognos-SDK-calls buiten de bridge.

---

### 2.17 services/tableData (32 files, ~1.5k regels)

Indeling: root + `input/ operations/ effects/ state/(initialTableState + writers/) events/`.

- `3 | P1 | effects/resolveTableWidgetId.js:16-35 | Cognos content-API (.getType/.getId) + "widget.live"-vocabulaire in effect | naar cognosAPI.canvas-wrapper of adapter | -`
- `3 | P1 | effects/normalizeTableData.js:41-96 | IDataQueryResult-parsing (getResultItemList/getRowCount/getValue/getLabel) direct | dunne cognosAPI.dataQuery.normalizeResult-wrapper | ~60`
- `1 | P1 | operations/shapeTableRows.js:1-157 | boven hard 150 | split shaping vs pick-helpers | ~40`
- `1 | P1 | input/normalizeTableInputs.js:1-140 + createTableDataService.js:1-141 | boven target | normalizePick apart; guard-wrappers naar factory | ~85`
- `2 | P1 | createTableDataService.js:18-112 | 8 bijna-identieke public-method-wrappers (try/catch/dispose) inline | guardAndInvoke-factory | ~55`
- `2 | P1 | operations/loadTableInputs.js:17-22 + ensureFreshRowsInputs.js:17-22 | load-or-cache-pipeline dubbel | resolveRowsLoadPromise | ~15`
- `2 | P2 | state/writers/markTable{Loaded,Loading,Failed}.js | writeIdentity/readString/copyPick drievoudig | tableEntryHelpers.js | ~45`
- `8 | P1 | 7 plekken | readString 7× lokaal | _KDB.utils.readString | ~25`
- `8 | P1 | initialTableState + 2 writers | copyPick/copyPickItem dubbel | gedeelde pick-copy-helper | ~20`
- `9 | P1 | operations/runLoadTableWork.js:1-12 | 10 imports | loadPipeline-facade | -`
- `11 | P2 | operations/ + __controller-naamgebruik op helpers | niet-standaard | hernoemen/documenteren | -`
- `13 | P2 | orchestrator:19 + service:105 | subscriptions-bucket nooit gebruikt | verwijderen | ~4`
- `14 | P2 | createTableDataService.js:22-111 + writers-bootstrap | mechanische try/catch; redundante state-bootstrap | boundary-guard; init vertrouwen | ~43`
- `15 | P1 | (root) | geen adapters/; operations/ afwijkend | hernoemen/documenteren | -`

Positief: named-method service met `_isDisposed`-guards (correct patroon), promises/AbortControllers in runtime, alleen eigen subtree, events via constants.

---

### 2.18 services/historyService + loadingService + services-root (26 files, ~1.2k regels)

**historyService** (12f, ~0.6k) — `config/ state/ replay/ effects/ events/` + root:
- `1 | P1 | createHistoryService.js:1-200 | boven hard 150; public API + writeback-restore + dispatch + runtime-cleanup + guards in één file | split writebackRestore/ lifecycle/ api/ + dunne factory | ~70`
- `1 | P1 | state/createHistoryReducer.js:1-163 | boven hard 150 | normalizeState-helpers apart; reducer alleen routing | ~30`
- `2 | P1 | createHistoryService.js:11-197 | god-service: ~15 helpers + 8 methods inline | per verantwoordelijkheid extraheren | ~50`
- `2 | P1 | __orchestratorHistoryService.js:37-74 | orchestrator bevat state/runtime-normalisatie i.p.v. wiring-only | naar state/normalizeHistoryState.js | ~35`
- `4 | P2 | createHistoryService.js:162-168 | runtime-buckets gewist maar (in scope) nergens gevuld; pendingStep altijd null | opruimen of documenteren (needs discussion) | ~20`
- `6 | P1 | createHistoryService.js:81-96 | mixed return-shape (undo/redo Promise vs boolean); isDisposed i.p.v. _isDisposed | uniformeren + hernoemen | -`
- `7 | P1 | state/createHistoryReducer.js:91,103,118 | reducer roept Date.now() (impurity) | timestamp via caller/effect (needs discussion) | ~3`
- `8 | P1 | orchestrator:37-50 + reducer:34-50 | dubbele state-normalisatie | één normalizeHistoryState.js | ~25`
- `10 | P2 | service | "history/…"-action-literals; events wél via constants | config/actionTypes.js | ~5`
- `14 | P1 | createHistoryService.js:32-121 | try/catch op elke method incl. sync guards | boundary-only | ~30`

**loadingService** (12f, ~0.5k) — `state/ effects/ runtime/` + root:
- `3 | P1 | effects/applyLoadingOverlay.js:9 | Cognos-host-UI-markup (ba-common-progressIndicator, spinner-SVG) inline | view/spinnerTemplate.js of adapter-markup | ~10`
- `8 | P1 | applyLoadingOverlay.js:35-49 + removeLoadingOverlay.js:31-57 | resolveMountElement/-Key + finish-varianten dubbel | effects/resolveLoadingMount.js | ~28`
- `8 | P1 | scheduleOverlayRemoval.js:34-51 + runtime/clearLoadingRuntime.js:38-51 | spinner-removal + mount-restore dubbel | view/restoreMountOverlay.js | ~20`
- `8 | P2 | removeLoadingOverlay.js:60-67 + scheduleLoadingWatchdog.js:17-24 | clearWatchdog-duplicatie | gedeelde helper | ~10`
- `4 | P2 | effects/scheduleOverlayRemoval.js:14 | setTimeout-callback kan post-destroy firen bij falend destroy-pad | disposed-guard in callback (needs discussion) | ~3`
- `11 | P2 | applyLoadingOverlay.js:49 | hardcoded fallback "kdb-root-loading" | config/defaults.js | ~2`
- `12 | P2 | (service) | _KDB.state.loading-ownership niet in projectStructureRules-tabel | documenteren | -`
- `15 | P1 | (service) | layout-divergentie met historyService: geen config/ events/, imperatieve mutatie, runtime-key "loadingService" vs "history" | alignen | -`

**services-root:**
- `1 | P1 | __orchestratorServices.js:1-93 | boven orchestrator-target 40-80 (onder hard 120) | registerEarlyServices extraheren | ~25`
- `2 | P1 | collectReplayHandlers.js:10-57 | centrale kennis van álle module-step-keys + runtime-contribution-paden in core — elke nieuwe history-step vereist core-edit | module-self-registration via registry-API (needs discussion) | -`
- `8 | P1 | collectReplayHandlers.js:18-19 | header_chromeChange + header_textChange delen één handler — impliciete conventie | documenteren in header-contract | -`
- `14 | P2 | __orchestratorServices.js | ~40% lege regels | formatting | ~15`

Positief: replay via gedelegeerde module-handlers (geen foreign writes door de service zelf); loadingService dunne controller met correcte DOM/timer-runtime-scheiding; twee-fase history-startup is bewust en wiring-only.

---

## 3. Cross-cutting bevindingen

### CC-1 — Cognos-isolatie: wrappers ja, adapters nee (#3, P1, projectbreed)
Nul raw hostaccess (`__getDashboardAPI`, `getSpec`, `glassContext`) in de hele scope — de `_KDB.cognosAPI`-wrapper-laag
wordt consequent gebruikt. Maar de **tweede helft van het patroon ontbreekt vrijwel overal**: alleen `tabs` heeft een
`adapters/create<Module>Adapter.js`. Gevolg: item-level SDK-vocabulaire (`getValues`, `getItemName`, `getItemId`,
`getScope`, `getContainer`, `getContent`, `setPropertyValue`, `getSlotList`, `setSort`, `setTopBottom`,
`replaceFilterContext`, `renderWidget`, `IDataQueryResult`-parsing) zit verspreid in effects, selectors en zelfs
`view/`-files van: widgetVis, widgetBase (incl. view/!), widgetText (view/), widgetTopN, dienststelle (state/selectors!),
singleSelect, specialSingleSelect, sicht, launchpad (state/!), widgetBindingApply, tableData. Bij een Cognos-upgrade
die item-API's raakt zijn dat ~40+ te reviewen files i.p.v. ~12 adapters.
**Ernstigste varianten:** Cognos-calls in `view/` (widgetBase, widgetText) en in `state/selectors` (dienststelle, launchpad).
**Actie:** adapter-rollout per module (zie remediatie-volgorde), met `tabs` als referentie-implementatie.

### CC-2 — File-size: ~30 hard-limit-overschrijdingen, geconcentreerd (#1, P1)
Top-10 overtreders: writeback set-service (820), kdbControl buildControlPrimitiveGallery (607), writeback validateV3 (422),
kdbControl buildControlMainBlocks (360), kdbControl syncFrameworkViewFromState (336), dienststelle selectors (333),
tabs traverseTabs (323), tabs reduceTabsAction (294), tabs createTabsController (289), header/dienststelle/kdbControl
controllers (151–207). Drie modules leveren ~60% van het overschot: **writeback, kdbControl, tabs**.
Daarnaast een brede band van files op 120–150 regels (widgetVis 10×, widgetBase 10×, widgetSettings 14×) — geen hard
breaches maar dezelfde richting.

### CC-3 — Runtime-cleanup-gaten + dode runtime-scaffolding (#4)
Terugkerend patroon A (leak-risico): timers/rAF/listeners zonder destroy-pad — widgetSettings (2× setTimeout, **P0**),
widgetVis (topNGate-timers, **P0**), kdbControl (document-mousedown per color-field, **P0**; module-rAF), dienststelle
(setTimeout/rAF in 3 effects), tabs (withTimeout), metricsTree (rAF), header (edit-session-timers).
Terugkerend patroon B (bloat): runtime-buckets (`abortControllers`, `pendingPromises`, `subscriptions`, `observers`)
geïnitialiseerd maar nooit gevuld — dragDrop, widgetBindingApply, tableData, historyService, tabs, kdbControl.
**Actie:** één gedeelde timer/rAF-registratiehelper per module-runtime + opschonen van dode buckets.

### CC-4 — Hardcoded cross-module action/event-strings (#10, P1)
Vrijwel elke module dispatcht naar siblings met string-literals: kdbControl→header/footer/tabs/comments,
widgetSettings→widgetBase/widgetVis/widgetText (9 plekken), widgetVis→widgetTopN, widgetTopN→launchpad/widgetVis,
sicht→singleSelect/dienststelle/specialSingleSelect, singleSelect→filterDock/sicht/special, filterDock→alle filters,
widgetBase→canvas/widgetSettings/content-modules, dienststelle→widgetVis. Bovendien hebben de meeste modules geen
constants voor hun **eigen** action-types (header, footer, launchpad, metricsTree, historyService).
**Actie:** per module `config/actionNames.js` (eigen types) + consumers importeren owner-constants. Dit is ook de
goedkoopste bescherming tegen stille contract-drift.

### CC-5 — Duplicatie-clusters (#8)
1. **header ↔ footer**: history-subboom + chrome-DOM + controller-stubs ~180–220 regels dedup (shared `dashboard/chrome*`).
2. **singleSelect ↔ specialSingleSelect**: ~130–170 regels (shared `filters/shared/`).
3. **Binnen tabs**: readTabButtons 3×, tab-guards 6×, rename-target 4×, traverse-validatie 2× (~185 regels).
4. **Binnen filterDock**: resolveDockRoot 4×, wrapper-count 3× (~80 regels).
5. **Projectbreed micro-patroon**: `cloneSerializable`/`cloneJson`-kopieën in ≥7 modules; `readString`-kopieën 7× in
   tableData — kandidaat voor `_KDB.utils`.
6. **widget-familie**: controller/runtime/dispatch-boilerplate in 3 varianten (Text/TopN/DataTable).

### CC-6 — Over-defensiveness: mechanische try/catch (#14, P2 maar hoog volume)
Systematisch patroon: try/catch rond lokale sync-code zonder boundary — zwaarst in widgetSettings (~30+ blokken,
~80–120 regels), tableData (8 method-wrappers), historyService (elke method), tabs, sicht, dragDrop, widgetVis
(contentReady + controller). Geschatte totale winst projectbreed: **~350–450 regels** plus significant betere
foutzichtbaarheid. Verdient één projectbrede error-handling-policy (boundary-only) i.p.v. per-file-fixes.

### CC-7 — Folder-layout-divergentie (#15)
Canoniek is `config/ state/ view/ effects/ adapters/ events/`. Afwijkingen: `framework/` (kdbControl), `dom/`
(header/footer), `observation/`+`compat/` (filterDock), `operations/` (tableData), `avatar/dropboxes/session/`
(dragDrop), `actions/`+`history/`+`lifecycle/`+`runtime/` (hele widget-familie), `utils/` (widgetTopN, widgetBindingPlan),
`diagnostics/` (bindingApply). `adapters/` ontbreekt in 17 van 18 scopes; `events/eventNames.js` is op meerdere plekken
een lege of ongebruikte stub (widgetSettings, widgetDataTable, tabs deels). Niet urgent, wel voorspelbaarheids-verlies;
alignen kan meeliften met de per-module splits.

### CC-8 — API-conventie-drift (#6)
Twee patronen door elkaar: (a) `isDisposed` i.p.v. `_isDisposed` in vrijwel alle modules; guard-gedrag varieert
(silent return / warn+return / reject / throw); (b) gemengde dispatch-return-shapes (boolean vs Promise vs
state-snapshot vs undefined) binnen én tussen modules (header, footer, kdbControl, launchpad, dienststelle,
widget-familie, historyService). Verdient één projectbesluit + geleidelijke uitrol (**needs discussion**, deels
gedragsgevoelig).

### CC-9 — Widget-familie runtime-conventie (#4/#15)
`projectStructureRules.md` schrijft `_KDB.runtime.widgets[widgetId]` voor; álle widget-content-modules gebruiken
`_KDB.runtime.widget<X>.byId/byOwner`. Ofwel de regel wordt aangepast (bewuste keuze documenteren), ofwel de familie
migreert — **needs discussion**, raakt cleanup-paden.

### CC-10 — Reducer-impurity via `Date.now()` (#7)
metricsTree-reducer (regels 30,48-49) en historyService-reducer (91,103,118). Klein maar principieel: timestamps
horen via de action-payload binnen te komen.

### CC-11 — Centrale feature-kennis in core (#2)
`core/services/collectReplayHandlers.js` kent alle module-step-keys en runtime-paden; writeback-set-service
orkestreert 25 restore-fasen over 10+ owners. Beide zijn werkende patronen maar maken core tot bottleneck bij elke
module-wijziging. Structurele optie: module-self-registration (registry-API) — **needs discussion**.

### CC-12 — Logging + i18n (#13/#11)
Projectbreed `console.warn/error/info` direct (geen logging-service); Duitse UI-strings inline in kdbControl, dragDrop,
header, footer, tabs, widgetSettings (i18n/labels-config-kandidaat); hardcoded omgevings-URL + datum-fallback in footer.

---

## 4. Aanbevolen remediatie-volgorde

Uitgangspunt: gedragsbehoud; alles "needs discussion" eerst bespreken. Volgorde is gekozen op (risico × ROI × afhankelijkheden).

### Tranche 0 — P0's + quick-wins (klein, direct, laag risico)
1. **widgetSettings timer-registratie** (P0-1): `bindWidgetSettingsPanel.js:100,147` — needs discussion over timing, daarna triviale fix.
2. **widgetVis topNGate-teardown** (P0-2): `rejectAllTopNGateWaiters` in beide cleanup-paden — needs discussion (reject vs resolve).
3. **kdbControl document-listener** (P0-4): AbortSignal-wiring in `buildControlPrimitiveGallery`.
4. **widgetBase `cleanWidgetForTransfer`** (P0-3): eerst ownership-vraag beantwoorden (legacy subtree?), dan routeren via owner-API.
5. Dead code verwijderen (veilig, ~350 regels): kdbControl `state/selectors.js` + `writeFrameworkView.js`, widgetVis `lifecycle/writeLifecycle.js`, tabs dode reducer-helper + console.logs, dode runtime-buckets (CC-3B), writeback ongewirede collector (na needs-discussion #12).

### Tranche 1 — De drie file-size-hotspots (structureel, hoogste regel-ROI)
6. **writeback**: split set-service (820→~100), validateV3, normalizeV3, bridge. Vooraf de twee contract-mismatches (#12: ongewirede collector; v2-bridge→map "not implemented") bespreken — die bepalen de doelstructuur. (~1.200 regels reductie)
7. **tabs**: splits controller/traverseTabs/reducer/applyTabsEffects/bindTabRename/selectors + dedup-cluster (tabGuards, readTabButtons, traverse-validatie). Meteen `readActiveTabId` op `_KDB.api.tabs` zetten (contract-drift P1). (~500 regels)
8. **kdbControl**: splits de drie framework-monolieten + reducer + controller; dedupe settings-input-maps; framework/→view/ hergroepering kan meeliften. (~900 regels)

### Tranche 2 — Cognos-adapter-rollout (upgrade-resilience, het strategische doel)
Volgorde op upgrade-blootstelling, met `tabs` als referentiepatroon:
9. **widgetBindingApply** (diepste SDK-manipulatie: slots/sort/topBottom/filters) — facade verplaatsen naar `adapters/`.
10. **dienststelle** (Cognos in selectors + 10+ effects) — combineert met selectors-split (333→~100).
11. **widgetBase** (Cognos in view/ + canvas-traversal) + **widgetVis** (6+ effect-files) + **widgetText/widgetTopN** (klein).
12. **filters-familie**: gedeelde `filters/shared/` Cognos-lookup (singleSelect/special/sicht) — combineert met dedup CC-5.2.
13. **launchpad** (SDK-traversal in state/) en **tableData** (IDataQueryResult-parsing → cognosAPI-wrapper).
14. **writeback-bridge** window.top-wrapper (needs discussion).

### Tranche 3 — Duplicatie-consolidatie
15. header↔footer shared chrome-utilities (~200 regels) + god-controller-splits van beide.
16. singleSelect↔specialSingleSelect `filters/shared/` (~150 regels; alleen na adapter-besluit uit tranche 2).
17. filterDock dedup (readDockRoot e.a.) + evaluateObservedDockState-split (11 imports).
18. `_KDB.utils`-uitbreiding: cloneSerializable/readString-consolidatie projectbreed.
19. historyService/loadingService splits + layout-alignment; metricsTree/historyControls controller-splits.

### Tranche 4 — Projectbrede hygiëne-policies (besluiten eerst, dan mechanisch uitrollen)
20. **Action-name-constants** (CC-4): per module `config/actionNames.js`; consumers importeren owner-constants.
21. **Error-handling-policy** (CC-6): boundary-only try/catch; ~350-450 regels + betere diagnostiek.
22. **Disposed-conventie + dispatch-return-shape** (CC-8): één besluit, geleidelijke uitrol (needs discussion).
23. **Widget-runtime-conventie** (CC-9): regel aanpassen óf familie migreren (needs discussion).
24. **Reducer-timestamps** (CC-10), **folder-alignment** (CC-7, meeliften met splits), **logging-service + i18n-config** (CC-12).

### Openstaande discussiepunten (blokkerend voor de betreffende tranches)
- Ownership `_KDB.state.widgets[widgetId]`-subtree (P0-3) en parent-init `_KDB.state.widgets` (widgetSettings/widgetVis #5).
- writeback: collector wiren of WIP; v2-pad bridge↔map; service-grens (restore-fasen in core vs modules).
- Disposed-guard-gedrag (throw vs warn vs no-op) en dispatch-return-uniformering.
- Widget-familie runtime-pad (`runtime.widgets[id]` vs `runtime.widget<X>`).
- tabs: DOM-`.click()` vs `setActiveTab`-adapter (gedrag!).
- filters: transient flags in state (restore-semantiek) en singleSelect reducer-vs-effects-model.
- collectReplayHandlers: centrale registry vs module-self-registration.

---

*Audit uitgevoerd 2026-07-10 door structure-audit-lead (Fable 5) met 18 read-only rubric-subagents (composer 2.5).
Contract-files (`contracts/*.md`) en `eventSubscribe.md` zijn bewust niet gelezen; alle #12-bevindingen zijn
code-evident of als onzekerheid gemarkeerd.*

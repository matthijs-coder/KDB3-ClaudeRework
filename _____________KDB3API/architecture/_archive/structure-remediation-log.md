# Structure remediation log

Track R entries only in this file’s first creation. Track S was verified 2026-08-17 and is not restated here.

Date: 2026-08-17. Scope: `KDB3/js/**`. No commit.

## R0 — delete pass-throughs / dead scaffolding

| Finding | Status | Note |
|---|---|---|
| `singleSelect/singleSelectControllerInternals.js` barrel | fixed | Callers import `ensureSingleSelectRuntime` + `singleSelectControllerGuards` |
| `singleSelect/effects/runSingleSelectInteraction.js` barrel | fixed | `createSingleSelectController` → `guardInteractionFreshness`; `dispatchSingleSelectAction` → `processFilterDockHandoff` |
| `specialSingleSelect/specialSingleSelectControllerInternals.js` barrel | fixed | Controller AMD inlined ensure/cleanup/acks |
| `filterDock/observation/observeDockPopupPipeline.js` barrel | fixed | `evaluateObservedDockState` imports the three pipeline files |
| `kdbControl/toolbox/__orchestratorToolbox.js` empty stub | fixed | Removed AMD import + `_tb(_KDB)` from `createKdbControlController` |
| `kdbControl/state/writers/writeFrameworkView.js` unused | fixed | Zero importers; live path is `bindFrameworkView` / `syncFrameworkViewFromState` |
| `widgetVis/lifecycle/writeLifecycle.js` unused | fixed | Zero importers; vis lifecycle via reducer |
| NMS `stageNativeMultiSelectHistoryReplayHandler.js` | fixed | Inlined at factory scope in `__orchestratorNativeMultiSelect.js` (same try/catch + log tag) |
| `widgetSettings/lifecycle/writeLifecycle.js` | skipped | Live importer: `createWidgetSettingsController.js` — not a pass-through |
| `widgetDataTable/lifecycle/writeLifecycle.js` | skipped | Live importer: `createWidgetDataTableController.js` — not a pass-through |
| Other owners’ `stage*.js` (10 files) | deferred | R0 probe was NMS-only |

Locked Track-S files were not touched. Authority-docs (`.cursor/rules/`, `projectStructureRules.md`) were not touched.

## R1 — rules (docs only)

| Finding | Status | Note |
|---|---|---|
| Optional folders `actions/` `history/` `runtime/` `observation/` | fixed | `feature-structure.mdc` + `projectStructureRules.md` |
| Leftover suffixes forbidden for new files | fixed | `naming.mdc`: Support/Helpers/Shared/Internals |
| module vs service vs util | fixed | `projectStructureRules.md`; search `config/actions.js` before the contract |

## P0 leftover after Track S

| Finding | Status | Note |
|---|---|---|
| Feature-module host `.getValues()` | fixed | Wrapper-only in SS verify, dienststelle normalize, widgetVis topN jahr |

## R2 — folder renames

| Finding | Status | Note |
|---|---|---|
| `dashboardPdf/helpers/` | fixed | → `effects/` |
| `header/dom/`, `footer/dom/` | fixed | → `view/` |
| `widgetBindingPlan/utils/` | fixed | → `serialize/` `sourceTokens/` `defaults/` `filters/` |
| `widgetTopN/utils/` | fixed | lifted into existing `effects/` |
| `widgetVis/actions/shared/` | fixed | flattened into `actions/` |

## R3 — history template

| Finding | Status | Note |
|---|---|---|
| Remaining `stage*HistoryReplayHandler.js` | fixed | Inlined into orchestrator/controller factory scope |
| `maybePush*.js` | fixed | Renamed `push*.js` (file + function + log tags); skip/diff logic kept |

## R4 — Support rename + tabMutationRun

| Finding | Status | Note |
|---|---|---|
| Tab-mutation leftover names | fixed | `guardTabMutation`, `routeTabMutationAction`, `runTabMutationOwnerPhases`, `awaitOwnerInventoryAck`, … |
| widgetBase adopt `guardTabMutationRun` util | skipped | widgetBase requires numeric `runId` only; util would change cancel shape |
| 8 mixed leftover `*Support.js` | skipped | Split would be overdesign; grandfather |

## R5 — filterDock observation synonyms + OWNER_ROUTE_MAP

| Finding | Status | Note |
|---|---|---|
| NMS `popupReady` on OWNER_ROUTE_MAP | skipped | Would add Cognos behavior; NMS stays `stateChanged` only |
| `manage*` / long observation names | fixed | File rename only; runtime keys unchanged |

## R6 — kennzahlDefaults shard + thick cognosAPI

| Finding | Status | Note |
|---|---|---|
| `kennzahlDefaults.js` (~4.7k, 113 keys) | fixed | Prefix shards `visualizations/kennzahlDefaults/{pA,pAbs,pBil,pBez,pFl,pPs,pS,pL}.js`; aggregator stays `kennzahlDefaults.js` (same file+folder pattern as `filters.js`). Public path `_KDB.config.visualizations.kennzahlDefaults` unchanged. Exact TM1 strings preserved; no fragment dedup |
| `flattenDataQueryResult` unused | fixed | Deleted; tableData `normalizeTableData` remains canonical |
| `awaitForTableData` poll in wrapper | fixed | Moved to `tableData/effects/waitForTableQueryResult.js`; polls one-shot `getDataQueryResult`. Timeout 60000 / interval 100 / abort-after-wait unchanged |
| `visualization.clearAllLocalFilters` loop | fixed | Same id-guess loop now in `createCognosBindingFilterMethods`; facade still exposes `clearAllLocalFilters`. Leaves `getLocalFilters` / `removeLocalFilter` thin |
| `clearAllPageContextFilters` unused | fixed | Deleted |
| `whenRenderStartComplete` unused | fixed | Deleted; `whenRenderStart` / `whenRenderComplete` kept |
| Ceremonial SS reducer rewrite | skipped | Lifecycle-only reducer; `instancesById` written outside. Needs discussion, not a readability win |
| Filter-fragment dedup vs bindingSpecs | skipped | Mixed Caption-path vs short keys |
| tabs/kdbControl/gallery size-hubs | skipped | Gallery has Track-S AbortSignal listeners; remaining-issues defers gallery split |

## Remaining track — Batch 2 size splits (2026-08-17)

Verb-named splits. Gallery not touched. Click still inner `[role=tab]`. Timer key `runtime.tabs.timers.traverseDelay` unchanged. Destroy still sets `isDisposed` before cleanup.

| Finding | Status | Note |
|---|---|---|
| `tabs/effects/traverseTabs.js` (~328) | fixed | Hub kept as `__controller`; new `clickTabChromeButton`, `readTabButtonWrappers`, `resolveTraverseTabIndexes`, `clickTraverseTabSequence`, `buildTraverseDispatchPayload`. Extra exports on the default function. `applyTabsEffects` still imports `./traverseTabs.js` |
| `tabs/createTabsController.js` (~317) | fixed | Public factory still `{mount,destroy,dispatch,getState}`. New `mountTabsController`, `dispatchTabsAction`, `dispatchTabsTraverse`, `dispatchTabsRename`, `commitTabsState`, `cleanupTabsRuntime`. `__orchestratorTabs.js` untouched. TRAVERSE coalescing / `TABS_TRAVERSE_CONFLICT` / `{state,error}` duck-type preserved |
| `tabs/state/reduceTabsAction.js` (~294) | fixed | Export path unchanged. New `copyTabsState`, `reduceTabsSyncFromDom`, `reduceTabsTraversal`, `reduceTabsRename`. Switch coverage identical. `Date.now()` left in sync/traverse (not S-P0) |
| `kdbControl/framework/syncFrameworkViewFromState.js` (~336) | fixed | Thin `__controller`. New `syncFrameworkPanelChrome`, `syncFrameworkPlaceholderInputs`, `syncFrameworkTabEditUi`, `syncFrameworkSwitchCheckboxes` (`.syncHeaderEditModeRadios` attached), `wireHeaderSettingsClick` (same `kdbForHeaderSettingsRootClick` + `frameworkHeaderSettingsWired` + `abortControllers.frameworkView`). Importers still `"./syncFrameworkViewFromState"` |
| `buildControlPrimitiveGallery.js` | skipped | Track-S AbortSignal listeners; PO lock: do not split |

## Remaining track — B8 tiny cognosHost catalog (2026-08-17)

Exact existing strings. Query sites only. `SPINNER_HTML` template unchanged (still contains `loadingIndicatorContainer`). No filterDock `ba-common-*`. No dragDrop avatar/`document.body` leak. No gallery.

| Finding | Status | Note |
|---|---|---|
| `root.loadingIndicatorSelector` | fixed | `.loadingIndicatorContainer` in `registerCognosHostSelectors`. Query sites: `waitForCaptureReadiness` (caller `captureTabPage` passes catalog value), `applyLoadingOverlay.querySelector`, `scheduleOverlayRemoval` |
| `dragDrop.pageTemplateSelector` | fixed | `.page.pagetemplateIndicator`. Query sites: `startDragSession`, `finishDragSession`, `ensureWidgetInteractionRuntime.toggleGridOverlay` (+ move/resize callers pass `_KDB`) |
| `toolbar.actionBarLeadingSelector` | fixed | `'[id="com.ibm.bi.dashboard.toolbars.actionBar"] .leading'`. pdf/history orchestrators merge `toolbarHostSelector` from catalog; module `config/domSelectors.js` stay owner-only |
| `dragDrop.canvasDropboxSelector` | skipped | Already catalogued; kept |
| Spinner HTML from selector | rejected | Would change generated markup; template left verbatim |
| filterDock popup CSS dump | deferred | Not this track |
| dragDrop avatar / `document.body` leak | deferred | Not mixed into catalog diff; rebind-poll not fixed |

## Remaining track — B6 dienststelle selectors (2026-08-17)

Cognos host reads out of `state/`. Snapshot stays **sync** with the same DTO (`hierarchyItemId` still live Cognos item id + `rewriteToMetricsSource`, not `filterPropObj`). `getCurrentHierarchySnapshot` name unchanged.

| Finding | Status | Note |
|---|---|---|
| Cognos in `dienststelle/state/selectors.js` | fixed | Selectors are pure state readers (112 lines). Snapshot builder → `effects/readCurrentHierarchySnapshot.js`. Item-id walk → `effects/resolveHierarchyItemId.js` (prefers `filtersApi.getFilterItemId`, `getItemId` fallback). Prefix rewrite → `effects/rewriteDienststelleToMetricsSource.js` (config prefix, not SDK) |
| `createDienststelleController.getCurrentHierarchySnapshot` | fixed | Calls the effect helper |
| `buildVisualizationWidgetDienststellePayload` | fixed | Imports the effect helper; no longer imports selectors |
| Leaf-verb campaign | skipped | Only `getFilterItemId` rode along in B6 |
| `createDienststelleController` AMD import count 11→12 | deferred | Factory was already over 10; extra import is the snapshot effect. Further controller split needs discussion, not a barrel |

## Remaining track — A1 writeback.md §3 (2026-08-17)

| Finding | Status | Note |
|---|---|---|
| `WBParameterSetFunction` typed `Promise<void>` | fixed | Now `Promise<RestoreResult>`. SET documented as non-throwing (`{ ok: false, … }`). GET still `Promise<string>` and may reject. **No JS change** to `cognosWritebackBridge.js` |
| v2 as reserved | skipped | Not re-documented; v2 map already implemented |

## Remaining track — Batch 4 waitForFilterInventory (2026-08-17)

| Finding | Status | Note |
|---|---|---|
| `waitForFilterInventory` untracked `setTimeout` | fixed | Delay registers `runtime.singleSelect.timers.inventoryRetry`; abort listener `clearTimeout` + resolve. Destroy still aborts `abortControllers.reconcile` (resolves the waiter) |
| metricsTree reducer `Date.now()` fallback | skipped | Not S-P0; payloads already stamp |
| dragDrop rebind-poll | deferred | Not this track |

## Remaining track — still out of scope

| Finding | Status | Note |
|---|---|---|
| Hide `visualization.getSlots` | skipped | Binding-apply leftover; PO keep |
| `cognosAPI.writeback` theme | rejected | Contract stays `window.top.WBParameter*` |
| tabs `setActiveTab` | rejected | KEEP_CLICK |
| widgetBase adopt `tabMutationRun` | skipped | Numeric `runId` pin |
| `*Support.js` rename sweep | skipped | Grandfather 8 files |
| NMS `popupReady` on OWNER_ROUTE_MAP | skipped | Would add Cognos behavior |
| Batch C hygiene (disposed/dispatch/reducers/replay/`runtime.widgets`) | deferred | PO default: do not start |

## Remaining track — untracked timers (2026-08-17)

Safety round after Track Remaining. Delay numbers unchanged. Destroy unhangs waiters. Gallery / dragDrop rebind-poll / metricsTree `Date.now` not touched. Track S: `cleanWidgetForTransfer` still does not teardown `_KDB.state.widgets[id]`.

| Finding | Status | Note |
|---|---|---|
| dienststelle user-notify `setTimeout(600)` | fixed | `runtime.dienststelle.timers.userNotify`; live-map identity; cleanup `clearTimeout`+`cancelAnimationFrame` before map wipe |
| dienststelle view-sync rAF / `setTimeout(0)` | fixed | `runtime.dienststelle.timers.viewSync`; 4 rAF frames kept; no-rAF still one `setTimeout(0)` |
| `waitForTableQueryResult` poll 60s/100ms | fixed | `runtime.tableData.timers["queryResultPoll:"+widgetId]`; caller passes existing per-load `signal`; abort rejects `AbortError` in-poll (was abort-after-wait). Timeout still → `{ status: "empty" }` |
| `waitForTabContainer` / `waitForScopedShells` | fixed | Module `runtime.widgetBase.timers` + `abortControllers` keys per `tabId`. Abort **resolves**. `destroyWidgetBaseModule` uses `abortBucket` (previously `clearBucket(..., "abort")` did not `.abort()`). Constants 2000/100/400 kept |
| widgetBase move-stop `setTimeout(50)` | fixed | `byId[id].timers.moveStop`; transfer `teardownHandle` clears numeric ids; live drag-stop delay kept |

## Remaining track — readDockRoot DRY (2026-08-17)

Four identical local `resolveDockRoot` copies now import `filterDock/runtime/readDockRoot.js`. Helper semantics unchanged (`rootSelector` → `document.querySelector`). No `domRefs.dockRoot` cache. `cloneSerializable` campaign not started.

| Finding | Status | Note |
|---|---|---|
| Local `resolveDockRoot` in bindDockObserver / bindDockClickListener / evaluateObservedDockState / dispatchPopupDisplayResync | fixed | AMD-import existing helper; call sites still re-query |
| `closeActivePopup` document catcher fallback | skipped | Cognos portal; catcher may live outside dock |
| `waitForFilterDockReady` / bucket popup mounts | skipped | Different job / different root |
| `cloneSerializable` → `core/utils` | rejected | Catch semantics differ (return original vs undefined vs null); pin required; not this track |

## Remaining track — P12 / S14 + executable size splits (2026-08-17 evening)

PO: T2 green; Cognos smoketest deferred (batch later). Batch B resolved from live contracts without PO: KEEP_CLICK, `window.top.WBParameter*`, RestoreResult canonical, dienststelle Cognos already in effects, no leaf-verb campaign, cognosHost tiny catalog already landed. S8 traverse/controller/reducer and S9 `syncFrameworkViewFromState` were already split (log Batch 2). S10 inventory timer already fixed.

| Finding | Status | Note |
|---|---|---|
| P12 `maxUserTabs` GET fallback `Infinity` | fixed | `collectTabs.js` / `collectWidgets.js` now fall back to `tabs/config/defaults.js` `MAX_USER_TABS` (same as `listDashboardSlots.js`). Hardcoded `5` in `tabMutationPostconditions.js`, `reduceTabMutationApply.js`, `buildTabDuplicatePlan.js` uses that default too. `reduceTabMutationApply.buildVisibleOrder` now passes `state` into `isDashboardTab`. |
| S14 metricsTree reducer `Date.now()` | fixed | Fallbacks are `0` (matches `initialState`). Controller still stamps payloads. |
| `bindTabRenameEditSession.js` / `applyTabsEffects.js` size | fixed | Job files under `tabs/effects/`. Public AMD paths kept. Compatibility barrel `bindTabRenameEditSession.js` (3 re-exports) left so callers do not change. |
| `createKdbControlReducer.js` size | fixed | Thin router + `reduceFrameworkActions` / `reduceSettingsActions` / `copyState.js`. Switch coverage identical. |
| `createKdbControlController.js` size + 13 AMD imports | fixed | Thin factory `{mount,destroy,dispatch,getState,syncView}`. Destroy: abort controllers before gallery `rt.listeners`. R3: do not reintroduce `stage*HistoryReplayHandler` — live file is `history/registerKdbControlHistoryReplayHandler.js`. |
| `buildControlMainBlocks.js` size | fixed | Hub + job files under `framework/`. **Gallery not touched.** |
| `placeLaunchpadDom.js` size | fixed | Hub + keep/replace, owner-document, selectors, runtime-refs siblings. |
| widgetVis legend size (`installLegendTextObserver`, `legendCaptionDom`) | fixed | Public paths kept. Pipe regex / `#`/`ALLE`/`Beendet` not changed. |
| `createHeaderController.js` size | fixed | Destroy cleanup → `runtime/cleanupHeaderRuntime.js`. |
| `createHistoryControlsController.js` size | fixed | `runtime/cleanupHistoryControlsRuntime.js`. Click/observer untouched. |
| `createDragDropController.js` size | fixed | Public `{destroy,finishDrag,getState,mount,refreshDropboxes,startDrag}`. Destroy still `finishDragSession` then unregister rebind then cleanup. Rebind-poll not “fixed”. |
| metricsTree controller / `buildMetricsTreeNodes.js` size | fixed | Mount in `effects/runMetricsTreeMount.js`; leaf builder sibling. Reducer not re-edited. |
| `buildLaunchpadTabDescriptors.js` / `readSlotWidgets.js` size | fixed | Public paths kept. |
| `shapeTableRows.js` size | fixed | Pick-cell → `pickTableCell.js`. No hierarchyDataService. |
| Gallery / `KDB.js` / `bindWidgetSettingsPanel.js` / `topNGate.js` / `visualization.js` / historyService size | skipped | Locked S-invariants, cognosAPI reopen, or config/data files (kennzahlDefaults shards, `bindingSpecs`, `tables.js`, `bwOldToNewMap`) |
| Batch C disposed / dispatch-shape / `cloneSerializable` unify / `writeVerifiedSelection` clones / `widget_removed` replay | deferred | Needs PO or catch-semantics pin |

## T3 — SS / DS / NMS `actions/` folder regroup (2026-08-18)

PO GO folder regroup; dirty-tree **B** (no commit). Path-only AMD. Dual grok-4.6 review PASS-WITH-NITS. Cognos N/A.

Contract: `contracts/filters-t3-actions-folder-regroup-contractdelta.md`

| Finding | Status | Note |
|---|---|---|
| SS / DS / NMS `actions/` flat (`parameterSet*` mixed with `*TabMutation*`) | fixed | `actions/parameterSet/` + `actions/tabMutation/`. 31 + 26 moved; 15 stay at `actions/` root. DS `restoreSupport.js` stays at root (both clusters). No `shared/` / `helpers/`. No NMS `actions/history/`. |
| Controllers | fixed | DS + NMS AMD strings only. SS controller unchanged (`dispatchSingleSelectAction.js`). |




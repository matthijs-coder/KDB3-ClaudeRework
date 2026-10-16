# Structure Audit 2 (Second Opinion)

> **Historical snapshot (2026-08-16).** Not a living checklist. Do not add per-module
> `adapters/create*Adapter.js`. Follow `contracts/cognosHostService.md` and the updated
> `structure-audit-rubric.md` dimension #3. Findings below describe the tree as of that date.
>
> **Paths are historical.** Every `file:line` below names the tree as of 2026-08-16. The Phase 1
> module-layout rework since then renamed, merged and split many of those files (for example `widgetBase`,
> `widgetSettings`, `widgetVis`, `tabs`, the filters and `core/services/writeback`), so most cited paths and
> line numbers no longer exist. For the current layout see `architecture/jsModuleMap.md` and the
> "Files" / "Folder Layout" section of each `contracts/<module>.md`; to open a cited file as audited, check
> out the repo at the audit date (`git log --before=2026-08-17`).

> Independent read-only audit of production JS under `KDB3/js/**`.  
> Date: 2026-08-16. Auditor: second-opinion lead (subagent batches + synthesis).  
> Rubric: `architecture/structure-audit-rubric.md`, anchored on `architecture/projectStructureRules.md`.  
> First audit (`architecture/structure-audit.md`, 2026-07-10) was **not** consulted until the delta section at the end.  
> No code, contracts, or rules were changed.

Finding format (per rubric):

```text
<dimension> | <severity> | file:line | one-line description | suggested action | est. line reduction
```

Severity: **P0** correctness / leak / coupling / raw Cognos host with upgrade risk. **P1** maintainability (size, god-controller, duplication, scattered Cognos, mixed API). **P2** hygiene.

Suggested actions are structural/cleanup only. Anything that might change behavior is marked **needs discussion**.

---

## 0. Scope and inventory (2026-08-16)

Production tree: `_____________KDB3API/KDB3/js/**`. Legacy (`_______REDESIGN2/`, `laatsteOriginal/`, `_______KDB3/`) out of scope.

| Area | JS files | Lines |
|---|---:|---:|
| `dashboard/**` | 927 | 57 114 |
| `core/**` | 312 | 21 261 |
| `KDB.js` | 1 | 269 |
| **Total `KDB3/js`** | **1 240** | **78 644** |

Largest clusters: filters 381 / 23 731; widgets 323 / 18 841; services 230 / 12 483.

| Module | Files | Lines |
|---|---:|---:|
| `dashboard/filters/singleSelect` | 108 | 7 410 |
| `dashboard/widgets/widgetVis` | 84 | 5 362 |
| `dashboard/widgets/widgetBase` | 83 | 4 939 |
| `dashboard/filters/dienststelle` | 80 | 4 965 |
| `dashboard/widgets/widgetSettings` | 76 | 4 266 |
| `dashboard/filters/filterDock` | 71 | 4 053 |
| `dashboard/canvas/kdbControl` | 47 | 3 338 |
| `dashboard/tabs` | 58 | 4 455 |
| `core/services/writeback` | 60 | 4 078 |
| `core/config` (dominated by `kennzahlDefaults.js`) | 14 | 5 740 |
| `core/cognosAPI` + `cognosHost` | 24 | 1 236 |
| Newer: `nativeMultiSelect` / `messageService` / `dashboardPdf` / `pdfExportControls` | 31 / 17 / 22 / 13 | 1 634 / 899 / 1 336 / 443 |

Hard-limit outliers (>150 executable, excluding vendor): `core/config/visualizations/kennzahlDefaults.js` (4 766), `kdbControl/framework/syncFrameworkViewFromState.js` (336), `buildControlPrimitiveGallery.js` (315), `dienststelle/state/selectors.js` (311), `tabs/effects/traverseTabs.js` (305), `tabs/createTabsController.js` (299), `tabs/state/reduceTabsAction.js` (285), `KDB.js` (269, bootstrap exception only if wiring-only), `kdbControl` reducer/controller/gallery siblings, `cognosAPI/dataQuery.js` (260), `cognosAPI/visualization.js` (201), `historyService/createHistoryService.js` (199).

Vendor (not scored as feature code): `core/libraries/jspdf.umd.min.js` (~395). `jquery-ui.min.js` appears unused as JS (CSS only).

---

## 1. Executive verdict

The production tree is **already modular**: orchestrators are mostly wiring-only, most `create*Controller.js` files **delegate** (the intended multi-method controller is not the anti-pattern), foreign `_KDB.state` writes are rare-to-absent, and `__getDashboardAPI()` / `.getSpec()` are confined to `core/cognosAPI`.

The remaining structural debt is **cross-cutting**, not “one god file”:

1. **Cognos-upgrade resilience is incomplete.** Wrappers exist, but many are not thin; they return live host handles, so feature modules continue the SDK (`getSlots` → `addDataItems`, `getContent` → `setPropertyValue`). Per-module `create*Adapter.js` is missing almost everywhere. Cognos **DOM/CSS** (`ba-common-*`, `.page.*`, loading spinner class) is scattered outside `cognosHost`.
2. **File-size debt is concentrated**, not uniform. `kennzahlDefaults.js` is ~83% of `core/config`. Tabs and kdbControl own the next-largest hard-limit cluster. Most filter/widget files sit in a 120–149 band.
3. **Duplication is the highest-yield maintainability win.** Tab-mutation guards exist in `core/utils/filters/tabMutationRun/` but are reimplemented in `widgetBase` and `tabs`. Filter host write/rollback is cloned inside `singleSelect`. Filter-value normalizers exist three times in binding Plan/Apply. `cloneSerializable` is triplicated across widget modules. Dock-root resolution is copied four times in `filterDock`.
4. **A few real P0 lifecycle/purity issues:** `KDB.js` mount/destroy registry mismatch (`metricsTree` never destroyed; feature destroy is not isolated); `historyService` reducer uses `Date.now()`; `singleSelect` falls back to host SDK `.getValues()`.

The project is **not** over-designed into unreadable layers. The problem is **incomplete isolation + copy-paste of the same sagas**, plus a handful of oversized hubs (tabs traverse, kdbControl view-sync, dienststelle selectors, kennzahl defaults).

---

## 2. Cross-cutting patterns

### 2.1 Cognos isolation / adapter layer (rubric #3) — primary

- `__getDashboardAPI()`, `.getSpec()`, Glass SDK: **only inside `core/cognosAPI`**. Isolation of the *entry* is done.
- Wrappers are **mixed**: `canvas`, `dataSources`, `tabs`, most getters are one host chain. **Thick:** `dataQuery.js` (flatten + poll), `visualization.clearAllLocalFilters` (loop + id guessing), `filters.clearAllPageContextFilters`, `async.whenRenderStartComplete`, `widgets` focus-mode DOM clicks.
- Catalog holes force feature modules to keep talking to host objects: slot verbs (`clearAllSlots` / `addDataItems` / `setTopBottom` / `setSort`) live in `widgetBindingApply` facades; `content.setPropertyValue` in widgetBase/widgetText; canvas item `getId`/`getContainer` after `findCanvasContent`; `pageContext.getPageContextItem` in widgetVis; filter-item methods in dienststelle lookup.
- Almost no feature module has `adapters/create<Module>Adapter.js`. Exceptions: `tabs` (`createCognosTabsAdapter.js` — API only, not tab-button DOM), `widgetBindingApply` (`createCognosBindingFacade` — good local pattern), `metricsTree` (dragDrop adapter, not Cognos), `properties` (content adapter — exemplar).
- Cognos **DOM** is the second upgrade surface: tabs button `.click()` in four files; filterDock portal/footer clicks; dashboardPdf `.loadingIndicatorContainer`; dragDrop `.page.pagegenericPage` / `.pagetemplateIndicator`; widgetVis focus-mode DOM duplicating `widgets.js`.
- `cognosHost/registerCognosHostSelectors.js` is a small seed; `readCurrentTab.js` duplicates `tab.selectedTab` instead of using it exclusively.

### 2.2 File size + split candidates (rubric #1)

Highest-impact splits (mechanical, behavior-preserving):

| File | Lines | Split |
|---|---:|---|
| `core/config/visualizations/kennzahlDefaults.js` | 4 766 | Prefix shards (`P_ABS`, `P_PS`, …) + thin aggregator |
| `kdbControl/framework/syncFrameworkViewFromState.js` | 336 | `framework/sync/*` |
| `kdbControl/framework/buildControlPrimitiveGallery.js` | 315 | palette vs factories; **also document-listener leak** |
| `dienststelle/state/selectors.js` | 311 | readers vs extractors; **evict cognosAPI** |
| `tabs/effects/traverseTabs.js` | 305 | orchestrator + `dom/tabButtonDom` |
| `tabs/createTabsController.js` | 299 | `dispatchTraverse` / `dispatchRename` |
| `tabs/state/reduceTabsAction.js` | 285 | per-family reducers |
| `core/cognosAPI/dataQuery.js` | 260 | get vs flatten vs wait — wait/flatten **out of wrappers** (needs discussion) |
| `KDB.js` | 269 | wiring-only again (overlay/host mapping out) |

### 2.3 God-controllers (rubric #2)

**Most controllers are not gods.** Multi-method `create*Controller.js` with delegation is the intended pattern and is followed in singleSelect, dienststelle, sicht, nativeMultiSelect, specialSingleSelect, widgetBase, widgetVis, widgetSettings, filterDock, dragDrop, kdbControl, header/footer, writeback services.

True / partial gods:

- `tabs/createTabsController.js` — **partial god**: inlined traverse coalescing, rename pipeline, runtime cleanup, duplicated `normalizeTraversePayload`.
- `core/services/historyService/createHistoryService.js` — **god-service**: API + writeback-restore + replay + teardown.
- `KDB.js` — **failed wiring-only bootstrap** (loading overlay, DOM, property-toggle flow).
- `cognosAPI/dataQuery.js` — flatten + poll inlined in the wrapper controller.
- `runDashboardPdfExport.js` / `messageService/renderAnchoredNotification.js` — oversized orchestrators, not module controllers.
- `createHistoryControlsController.js` (161) vs newer `pdfExportControls` (lean) — template drift.

### 2.4 State vs runtime / leaks (rubric #4)

Generally correct: serializable state vs `_KDB.runtime.<owner>`. Residual leaks:

- `KDB.js` destroy: `_isDisposed` set first; a throw skips remaining features; `metricsTree` never destroyed.
- `kdbControl` color-field `document.mousedown` listeners survive destroy.
- `dragDrop` avatar templates on `document.body` not removed; `isTabDropboxBound` checks the wrong element (**likely broken poll**).
- `widgetVis` destroy rejects dienststelle/contentReady waiters but not `topNGate` promises.
- `singleSelect` `waitForFilterInventory` retry timeouts untracked.
- `widgetVis` focus-mode `setTimeout` not stored in `runtime.timers`.

### 2.5 Foreign state writes (rubric #5)

**No confirmed P0 foreign `_KDB.state` writes.** Cross-module contact is `_KDB.api.*.dispatch`. Weaker couplings (P1): footer reads `_KDB.state.header`; specialSingleSelect/sicht read singleSelect inventory shape; writeback collectors import owner selectors; widgetBase `cleanWidgetForTransfer` deletes legacy `_KDB.state.widgets[widgetId]` buckets.

### 2.6 Duplication (rubric #8)

| Pattern | Where | Action |
|---|---|---|
| Tab-mutation guard/snapshot | `core/utils/filters/tabMutationRun/*` vs widgetBase vs `tabs/guardTabMutation.js` | One shared guard |
| Tab-mutation file set | singleSelect / dienststelle / nativeMultiSelect (same names) | Shared scope-ops + layout helper |
| Host write / rollback | singleSelect restore/resync/clear/special/commit | One adapter helper (`writeVerifiedSelection` already exists, unused by clones) |
| Filter-value normalize | binding Plan (2) + Apply (1) | `bindingFilterValues.js` |
| `cloneSerializable` | widgetText / widgetTopN / widgetDataTable | `_KDB.utils` |
| Dock-root query | 4 filterDock files vs `readDockRoot.js` | Always use `readDockRoot` |
| Settings input IDs | kdbControl sync / bind / visuals (3 copies) | One map |
| `rewriteUniqueNameSourceToken` | `core/utils` vs `widgetBindingPlan/utils` | One module |
| `sleep` / `throttle` / `waitFor` | exported, unused; modules inline `setTimeout` | Adopt `_KDB.utils` |
| Toolbar observer + Cognos actionBar selector | historyControls + pdfExportControls | Shared control helper |

Forbidden namespaces (`_KDB.utilities` / `generalFunctions` / `dropdownOptions` / `cache` / `tmp` / `shared`): **not found** in audited production modules. Extra instance keys on `KDB`: `_isDisposed`, `version`.

### 2.7 Over-defensiveness (rubric #14)

Mechanical `try/catch` around local sync is pervasive (cognosAPI wrappers, filterDock observation, widgetVis `contentReady`, messageService public methods, tableData query failures collapsed to `{ status: "empty" }`). Highest behavioral risk: **swallowed Cognos/query errors**. Narrowing catches is cleanup; changing empty-vs-failed is **needs discussion**.

### 2.8 Folder-layout consistency (rubric #15)

Preferred `config/ state/ view/ effects/ adapters/ events/` is applied unevenly. Newer `messageService` and `pdfExportControls` match the template; `dashboardPdf` uses `helpers/`; `filterDock` uses `observation/` (reasonable) but no `adapters/`; header/footer use `dom/` not `view/`; launchpad/metricsTree disagree on `effects/` vs `adapters/`. Filter family: no `adapters/` anywhere.

---

## 3. Recommended remediation order

**Quick wins (low behavior risk, high clarity)**

1. Delete unused scaffolding: kdbControl `writeFrameworkView.js`, `placeholderControlOptions.js`, empty toolbox orchestrator; singleSelect dead `SICHT_HISTORY_REPLAY_COMMITTED`; unused cognosAPI methods after confirmation; `jquery-ui.min.js` if unused.
2. Dedup already-solved helpers: filterDock `readDockRoot`; import sibling `config/actions.js` instead of hardcoded event strings; export `normalizeCognosScopeId` on `_KDB.utils`; collapse writeback `restoreRun*.js` barrels only if contracted tree allows (**needs discussion**).
3. Adopt `core/utils/filters/tabMutationRun` in widgetBase and tabs; adopt `_KDB.utils.sleep` / `waitFor` at poll sites.

**Structural — Cognos layer first (upgrade resilience)**

4. Split `dataQuery.js` / `visualization.js`; move flatten/poll/bulk-clear/callback-orchestrator **out** of wrappers (**needs discussion** — behavior-adjacent). Add missing leaf verbs (`setContentPropertyValue`, slot mutations, `getPageContextItem`) so callers stop using returned handles.
5. Expand `cognosHost` as the host-CSS catalog (tabs `ba-common-tabList*`, PDF loading spinner, dragDrop `.page.*`, filter popups). One `readTabButtons` DOM helper for tabs.
6. Add per-module adapters only where Cognos is actually touched: singleSelect, dienststelle, widgetVis, widgetBindingApply (promote facade), launchpad, dashboardPdf readiness, widgetText fontSize.

**Structural — size hubs**

7. Shard `kennzahlDefaults.js` by prefix (mechanical first; filter-fragment dedup second — **needs discussion**).
8. Split tabs (`traverseTabs`, controller, reducer) and kdbControl framework (sync + gallery). Fix gallery document-listener leak in the same pass.
9. Split `dienststelle/state/selectors.js` and move hierarchy Cognos reads to effects (align with singleSelect).

**Lifecycle / purity P0**

10. `KDB.js`: one ordered registry for register/mount/destroy; destroy `metricsTree`; per-feature try/catch; extract loading overlay so bootstrap is wiring-only again.
11. `historyService` reducer: pass `timestamp` in action payload (remove `Date.now()`).
12. `singleSelect`: drop `_filterApi.getValues()` fallback.

**Then (larger, still structural)**

13. Align historyControls with pdfExportControls template (`runtime/`, `waitFor*Toolbar`).
14. Shared binding filter-value normalizer + plan-owned `clearSlotsAndFilters`.
15. singleSelect host write/rollback unification (uses existing `writeVerifiedSelection`).
16. Ceremonial filter reducers (family-wide in-place mutations) — **needs discussion** before a rewrite.

Do **not** start with rewriting healthy controllers (singleSelect, widgetBase, widgetVis, filterDock, writeback). They are not the bottleneck.

---

## 4. Findings by module

### 4.1 `KDB.js` (bootstrap)

**Verdict:** 270 lines, **30 AMD imports**. All 11 allowed namespaces initialized; no forbidden namespaces. **Not wiring-only** — loading overlay, `document.querySelector`, property-toggle flow, raw `features.*` capture. The 500-line exception does not apply until that logic is extracted.

```
State vs runtime | P0 | KDB.js:87 vs 117-141 | metricsTree is mounted but destroyRegisteredFeatures never calls its destroy | add destroyFeatureApi(_KDB.api.metricsTree) in reverse-mount order (needs discussion if another owner already tears it down) | 0
State vs runtime | P0 | KDB.js:117-141 | feature destroy is not isolated; _isDisposed is set true first, so a throw leaves remaining features alive and a second destroy() returns immediately | per-feature try/catch; do not skip leftover teardown (needs discussion) | +8
State vs runtime | P0 | KDB.js:102-104 vs 37 | setup registers many services but destroyCoreServices only tears down message, dashboardPdf, history | destroy every registered service in a documented order (needs discussion) | +4
File size | P1 | KDB.js:1-270 | 270 lines; 500-line exception does not apply while non-wiring logic remains | extract loading init + runtime-core factory so KDB.js is wiring-only | ~40–70
Orchestrator vs controller | P1 | KDB.js:201-243 | renderKDB inlines loading-overlay feature flow | KDB.js should only await a named bootstrap step (needs discussion: who owns root loading) | ~30
Cognos isolation | P1 | KDB.js:20-29 | constructor features copied with raw Cognos keys into runtime.core.adapters | move mapping into cognosHost/adapter; keep only a wiring call (needs discussion: this is the host injection point) | ~12
Cross-module consistency | P1 | KDB.js:67-95 vs 117-141 | mount list and destroy list differ in membership and order | one ordered registry driving register/mount/destroy | ~20
AMD hygiene | P1 | KDB.js:1 | 30 AMD imports exceeds restructure threshold of 10 | keep as root registrar only after wiring-only is restored; otherwise a module registry (needs discussion) | 0
Duplication & namespaces | P2 | KDB.js:167-168 | ad-hoc _isDisposed and version sit beside the 11 allowed namespaces | drop or relocate version (needs discussion) | ~1
Dead / debug | P2 | KDB.js:76,94 | bindHistoryReplayHandlersOnly invoked twice in one mount | keep a single bind unless the sandwich is intentional (needs discussion) | ~1
Dead / debug | P2 | KDB.js:228-231 | waitingTargets is always [] so Promise.all is a no-op stub | remove or wire real waits (needs discussion) | ~6
Public API shape | P2 | KDB.js:172-177,244-267 | getAPI has no disposed guard; destroy does not uninstall window.top.getKDB | guard getAPI; clear global in destroy (needs discussion vs Cognos/debug) | ~3
```

### 4.2 `core/cognosAPI` + `core/cognosHost`

**Verdict:** **Mixed wrappers.** Isolation of `__getDashboardAPI` is done. Upgrade risk is **returned handles + missing leaf verbs + thick dataQuery/visualization**. `cognosHost` selector catalog is too small.

Public surface (themes): `glassMessages`, `dashboard`, `canvas`, `dataSources`, `widgets`, `visualization`, `dataQuery`, `filters`, `tabs`, `async`.

```
File size | P1 | core/cognosAPI/dataQuery.js:1 | 260 lines (hard 150) | split getDataQueryResult / flattenDataQueryResult / awaitForTableData | ~180
File size | P1 | core/cognosAPI/visualization.js:1 | 201 lines (hard 150) | split contentProperties, dataSource, slots, localFilters | ~90
Cognos isolation | P0 | core/cognosAPI/dataQuery.js:33 | flattenDataQueryResult is result-shaping business logic, not one host chain | move to tableData (normalizeTableData already exists) or a named adapter (needs discussion) | ~143
Cognos isolation | P0 | core/cognosAPI/dataQuery.js:177 | awaitForTableData is poll/timeout (waits are owner behavior) | move wait to tableData; keep one-shot getDataQueryResult (needs discussion) | ~73
Cognos isolation | P0 | core/cognosAPI/filters.js:89 | clearAllPageContextFilters enumerates then loops (not one host chain) | delete bulk helper or make owners loop (needs discussion) | ~6
Cognos isolation | P0 | core/cognosAPI/visualization.js:161 | clearAllLocalFilters loops getFilterList and guesses ids | keep removeLocalFilter; move bulk/id-policy to widgetBindingApply (needs discussion) | ~22
Cognos isolation | P0 | core/cognosAPI/async.js:23 | whenRenderStartComplete runs a feature callback between waits | keep the two waits; drop the callback orchestrator (needs discussion) | ~16
Cognos isolation | P0 | core/cognosAPI/visualization.js:108 | getSlots/getLocalFilters return raw host so widgetBindingApply continues the SDK | add thin leaf verbs; stop returning slot/filter handles (needs discussion) | —
Cognos isolation | P0 | core/cognosAPI/widgets.js:11 | getContent returns raw content; callers then setPropertyValue | add named setContentPropertyValue with stable arity (needs discussion) | —
Public API shape | P1 | core/cognosAPI/visualization.js:38 vs widgets.js:35 | getContentPropertyValue arities disagree (widgetId,name vs name,widgetId) | pick one arity (needs discussion) | —
Cognos isolation | P1 | core/cognosAPI/widgets.js:62 | enter/exitWidgetFocusMode click Cognos chrome; duplicated in widgetVis | keep one host wrapper; drop the widgetVis copy (needs discussion) | —
Public API shape | P1 | core/cognosAPI/canvas.js:32 vs async.js:7 | getCanvasWhenReady duplicated | keep one (needs discussion) | ~4
Duplication & namespaces | P1 | core/cognosAPI/dataQuery.js:33 | flattenDataQueryResult has no callers; tableData reimplements flattening | delete unused flatten or converge (needs discussion) | ~143
Dead / debug | P1 | core/cognosAPI/dataSources.js:7 | entire dataSources theme has no production callers | confirm reserved vs dead (needs discussion) | ~38 if removed
Dead / debug | P1 | core/cognosAPI/dashboard.js:24 | several dashboard.* methods have no callers in KDB3/js | confirm reserved upgrade vocabulary vs dead (needs discussion) | —
Cognos isolation | P1 | core/cognosHost/registerCognosHostSelectors.js:8 | host CSS catalog is small; ba-common-* live in feature configs | expand cognosHost as the host-selector vocabulary (needs discussion) | —
Over-defensiveness | P2 | core/cognosAPI/canvas.js:4 | mechanical try/catch around a sync object-literal controller (same pattern in several themes) | drop wrapper try that cannot fail locally | ~6 each
```

God-controllers: **yes** — `dataQuery.js`. Fat: `visualization.js`, `widgets.js` (focus-mode). `filters.js` already split some helpers. `dashboard.js` delegates capture-root.

### 4.3 `core/config`

**Verdict:** Cognos **host isolation clean** (no API calls). Size is the issue: `kennzahlDefaults.js` is 4 766 lines / 113 kennzahl entries / ~83% of the folder. TM1 vocabulary duplicated across visualization config files. `__orchestratorConfig.js` is wiring-only.

```
File size | P1 | visualizations/kennzahlDefaults.js:1 | 4766 lines (~19× config 250); 113 near-identical per-kennzahl templates | split by theme prefix into kennzahlDefaults/*.js + thin aggregator; optional fragment dedup (needs discussion) | 0 net reorg; optional ~1500
Duplication & namespaces | P1 | visualizations/kennzahlDefaults.js:9 + bindingSpecs.js:24 | duplicated filter semantics (Aggregationstyp, Monat/Jahr exclude) | extract shared filter-fragment constants; document widget-default vs kennzahl-override | ~200–400
Duplication & namespaces | P1 | visualizations/definitions.js:76-90 + 112-126 | List and TopN visualization definitions are byte-identical | shared base object or alias | ~15
AMD hygiene | P1 | __orchestratorConfig.js:1-13 | 12 AMD imports exceeds restructure threshold | group visualization shards behind visualizations/index.js | 0
State vs runtime | P1 | parameterMapping.js:138-150 | config module mutates _KDB.runtime.parameterMapping cache | move cache accessors out of config (reorg) | 0
File size | P2 | tables.js:1 | 175 lines with repetitive single_select_options entries | extract filter-table template | ~40
Duplication & namespaces | P2 | dimensions.js:1-7 | passthrough re-export of visualizations/dimensions.js | import visualizations/dimensions.js at consumer | ~8
Duplication & namespaces | P2 | colorPalette.js:6 + 55 | duplicate keys weiß and weiss both #ffffff | keep one canonical key; alias if needed | ~2
Dead / debug | P2 | tables.js:23 | personal_berechtigung_kdb_ready description copy-pastes wrong source name | fix description string | 0
```

### 4.4 `core/utils`, `events`, `properties`, `authoring`, `css`, `libraries`

**Verdict:** `events` is the real bus (`KDB.js` instantiates `createEventBus`). `properties` is the **Cognos-isolation exemplar** (all via `runtime.core.adapters.content`). Generic utils are well-placed but **under-adopted**. `readCurrentTab` leaks `cognosAPI`.

```
Cognos isolation | P1 | core/utils/readCurrentTab.js:69-80 | utils calls cognosAPI.tabs.getTabsContainers for tab index | move index resolution to cognosAPI.tabs; utils returns DOM id only | ~25
Duplication & namespaces | P1 | core/utils/__orchestratorUtils.js:28-40 | normalizeCognosScopeId used 12× via deep import, not on _KDB.utils | export via orchestrator | 0
Duplication & namespaces | P1 | widgetBase/actions/tabMutationSupport.js:4-19 | reimplements guardRun/isStale from guardTabMutationRun.js | import shared guard; delete local copies | ~15
Duplication & namespaces | P1 | widgetBindingPlan/utils/rewriteUniqueNameSourceToken.js:4-29 | near-duplicate of core/utils/rewriteUniqueNameSourceToken.js | single module with optional sourceToken param | ~25
Dead / debug | P2 | core/utils/__orchestratorUtils.js:36-37 | sleep/throttle exported with zero consumers | remove or adopt in poll sites | ~12
Cognos isolation | P2 | core/utils/readCurrentTab.js:7-8 | default tab selector duplicates registerCognosHostSelectors.js:17 | require selector from _KDB.elements.selectors.tab only | ~5
Duplication & namespaces | P2 | properties/loadToggleProperties.js:7-28 | identical normalizeToggleValue copied in applyHideWidgetsToggleChange.js | extract normalizeToggleValue.js | ~22
Dead / debug | P2 | core/libraries/jquery-ui.min.js:1 | JS bundle appears unused (CSS only loaded) | remove file or add explicit loader (needs discussion) | vendor LOC
```

`tabMutationRun/` files: `guardTabMutationRun.js` (84), `tabMutationSnapshots.js` (48), `listAffectedPlanSlots.js` (28). Used by filter `tabMutationSupport.js`; **not** by widgetBase/tabs.

### 4.5 `core/services/writeback`

**Verdict:** Well-split (get/set/map/schema/bridge). **No god-controllers. No foreign state writes.** Cognos Dashboard SDK absent; host access is contracted `window.top.WBParameter*` in `cognosWritebackBridge.js` only — **thin-ish, not a feature-flow god-bridge**. Two files over 120-line target.

```
Events | P1 | set/effects/runFilterRestore.js:30 | ~25 owner action types are hardcoded strings | centralize restore/GET types next to owner actionTypes | 0
Duplication & namespaces | P1 | set/effects/ensureTabWidgetsRouted.js:26 | copies dispatch/ack/cancel/abort instead of dispatchOwnerPhase | extend dispatchOwnerPhase with cancel-code hook | ~70
Duplication & namespaces | P1 | get/collectors/collectTabs.js:42 + collectWidgets.js:95 | duplicated readOrderedDashboardTabs / isDashboardTab | one shared dashboard-tab order helper | ~25
File size | P1 | get/collectors/collectCanvasSettings.js:14 | 138 lines over 120 target | split collectCanv vs collectSett | ~70
File size | P1 | cognosWritebackBridge.js:15 | 136 lines; install/uninstall + GET/SET + logging | split host install vs bridgeGet/bridgeSet | ~50
Contract drift | P1 | cognosWritebackBridge.js:88 | contract SET is Promise<void>|void; implementation returns RestoreResult | needs discussion: keep structured return or swallow to void | 0
Cognos isolation | P2 | cognosWritebackBridge.js:32 | window.top assigned directly; no _KDB.cognosAPI.writeback.* | needs discussion vs contracted window.top | 0
Public API shape | P1 | __orchestratorWriteback.js:31 | also registers writebackBridge; each service exposes uncontracted destroy | document extras or stop publishing | 0
```

### 4.6 `widgetBindingPlan` + `widgetBindingApply`

**Verdict:** Plan is pure; Apply owns Cognos via `createCognosBindingFacade`. **No foreign widget-state writes. No P0.** Debt: duplicated filter-value normalization, slot-clear policy, oversized apply render/slots controllers.

```
Orchestrator vs controller | P1 | widgetBindingApply/effects/applyBindingPlan.js:20 | top-level controller ~84 lines with repeated abort/outcome branching | extract runApplyPhase(signal, fn) | ~25
Orchestrator vs controller | P1 | widgetBindingApply/effects/runApplyBindingRenderSteps.js:18 | render-phase controller ~115 lines exceeds 60-line hard cap | split triggerRender / awaitRenderOrDefer / finalizeApplySuccess | ~40
Duplication & namespaces | P1 | widgetBindingApply/effects/resolveBindingApplyOptions.js:31 | shouldClearSlots re-derives intent Plan already emits as slotsToClear | Plan emits explicit clearSlotsAndFilters; Apply reads one flag | ~20
Duplication & namespaces | P1 | widgetBindingPlan/filters/filterValueHelpers.js:4 | normalizeFilterValue duplicated in Apply filterBodyHelpers and buildTopNFilter | shared bindingFilterValues.js | ~60
Cognos isolation | P2 | widgetBindingApply/effects/createCognosBindingFilterMethods.js:19 | Cognos filter vocabulary (suffix _1, type display) lives in Apply not cognosAPI | move addOrReplaceLocalFilter into cognosAPI.visualization | ~35
File size | P2 | widgetBindingPlan/filters/buildLocalFilters.js:1 | 129 lines; aggregates all filter sources | split filters/sources/*; keep composer | ~20
AMD hygiene | P2 | widgetBindingPlan/buildPlan.js:1 | 13 AMD imports | group behind barrel | 0
```

### 4.7 `dashboardPdf` + `messageService` (newer)

**Verdict:** Both stay under 150-line hard cap. No foreign `_KDB.state` writes. Cognos capture root / filename / glass toasts go through `_KDB.cognosAPI`. Gaps: PDF readiness polls Cognos spinner class; messageService anchored-notification god-module; `helpers/` vs `effects/` layout drift.

```
Cognos isolation | P1 | dashboardPdf/helpers/waitForCaptureReadiness.js:23 | polls .loadingIndicatorContainer instead of a cognosAPI.dashboard readiness wrapper | add waitForCaptureReady(root) to cognos adapter | ~15
Cognos isolation | P1 | dashboardPdf/runDashboardPdfExport.js:50 | Cognos calls scattered; no createDashboardPdfAdapter.js | thin adapter re-exporting getFileName, resolveCaptureRoot, metadata | 0
Orchestrator vs controller | P1 | dashboardPdf/runDashboardPdfExport.js:35 | ~69 lines orchestrating manifest, capture loop, attachment, save | extract captureAllTabs + finalizeExport | ~25
Duplication & namespaces | P1 | dashboardPdf/helpers/buildAttachmentRows.js:57 | ensureFreshSingleSelectInventory called twice per export | call once in runner | ~8
Orchestrator vs controller | P1 | messageService/view/renderAnchoredNotification.js:32 | mixes create, listener/observer/timer, dedupe, positioning (108 lines) | split anchoredNotificationLifecycle + thin coordinator | ~35
Duplication & namespaces | P1 | messageService/view/bindMessageDialog.js:4 | near-identical registerListener/removeListener vs renderAnchoredNotification | shared runtime/domListenerRegistry.js | ~25
Contract drift | P2 | dashboardPdf/helpers/sanitizeAttachmentText.js:76 | toDisplayText falls back to useValue; contract forbids useValue for filter rows | remove useValue path or restrict callers (needs discussion) | ~1
Cross-module consistency | P2 | dashboardPdf/helpers/ | uses helpers/ instead of effects/ (cf. messageService) | rename/move side-effect modules to effects/ | 0
```

### 4.8 `tableData`, `historyService`, `loadingService`

```
File size | P1 | tableData/operations/shapeTableRows.js:1 | 155 lines (hard 150) | split normalizeSourceRows / pickCell | ~25
Cognos isolation | P1 | tableData/effects/resolveTableWidgetId.js:14 | canvas/visualization scan in service effects, not an adapter | move widget discovery behind adapter | 0
Duplication & namespaces | P1 | tableData/state/writers/markTableLoaded.js:9 | readString/writeIdentity/copyPick copied across Loaded/Loading/Failed | extract tableEntryHelpers.js | ~70
Over-defensiveness | P1 | tableData/effects/readTableQueryResult.js:35 | all query failures collapse to { status: "empty" } | distinguish abort vs timeout vs failure (needs discussion) | ~10
File size | P1 | historyService/createHistoryService.js:1 | 199 lines; API + writeback-restore + replay + teardown | extract writebackRestore.js + historyRuntimeCleanup.js | ~55
File size | P1 | historyService/state/createHistoryReducer.js:1 | 161 lines (hard 150) | move normalizeState/copyState to historyStateUtils.js | ~30
Reducer purity | P0 | historyService/state/createHistoryReducer.js:91 | Date.now() inside commitStep/movePointer/applyWritebackBaseline | pass timestamp in action payload | ~5
Orchestrator vs controller | P1 | historyService/createHistoryService.js:44 | god-service: writeback restore, replay, runtime flags, public API | invert: writeback registers guard callback on history | ~45
Duplication & namespaces | P1 | core/services/collectReplayHandlers.js:12 | hardcoded registry of 10 feature historyReplayHandlerContribution keys | feature modules self-register | ~40
```

`loadingService` is the cleanest of the three (70-line facade; DOM in runtime). Overlay HTML string in `applyLoadingOverlay.js` is a P2 split.

### 4.9 `dashboard/canvas/kdbControl`

**Verdict:** **Not a god-controller.** Cognos isolation: **no `cognosAPI`**; tab-follow uses raw `document` per approved contract. Eight hard oversized files. Color dropdown `document.mousedown` listeners leak across destroy.

```
State vs runtime | P1 | framework/buildControlPrimitiveGallery.js:242-258 | each color field registers a permanent document mousedown listener (no teardown) | bind layer with AbortSignal or singleton document handler | ~15
File size | P1 | framework/syncFrameworkViewFromState.js:1 | 336-line view-sync monolith | split into framework/sync/* | ~220–260
File size | P1 | framework/buildControlPrimitiveGallery.js:1 | 315-line DOM factory | split palette/dropdown vs primitive factories | ~180–210
File size | P1 | state/createKdbControlReducer.js:1 | 236-line reducer | split framework vs settings reducer modules | ~120–140
Duplication & namespaces | P1 | framework/syncFrameworkViewFromState.js:7-20 | same 11 settings input IDs duplicated in bindSettingsForm and bindFrameworkPrimitiveVisuals | single settingsBoundInputIds.js | ~25–30
AMD hygiene | P1 | createKdbControlController.js:1-15 | 15 AMD dependencies | facade + applySettingsAction.js + destroyRuntime.js | ~40–50
Dead / debug | P2 | state/writers/writeFrameworkView.js:7-25 | unused direct state mutation bypassing reducer | delete file | ~30
Dead / debug | P2 | toolbox/__orchestratorToolbox.js:3-5 | empty orchestrator stub | remove call or add real wiring | ~7
```

### 4.10 `dashboard/canvas/dragDrop`

**Verdict:** Not a god-controller. Partial Cognos isolation (no API imports; hardcoded `.page.*` DOM). Likely broken tab-rebind poll.

```
Cognos isolation | P1 | session/startDragSession.js:91 | layout grid targets hardcoded .page.pagetemplateIndicator | move selector into _KDB.elements.selectors.dragDrop + scope to ownerDocument | ~8
Cognos isolation | P1 | dropboxes/resolveBoundDropbox.js:11 | default dropbox selector .page.pagegenericPage is Cognos page markup | inject via elements registry only | ~4
State vs runtime | P1 | dropboxes/subscribeTabsChangedRebind.js:71 | poll success checks kdb_dropbox on pageEl, but bind sets it on dropbox descendant | query dropbox inside page before early-exit | ~6
File size | P1 | createDragDropController.js:1 | 178 lines exceeds hard 150 | extract ensureRuntime/cleanup into runtime/ensureDragDropRuntime.js | ~35
Duplication & namespaces | P1 | session/startDragSession.js:63 vs avatar/createDragAvatarTemplates.js:110 | two parseDimensionToPx implementations | shared config/parseWidgetDimensions.js | ~25
Foreign writes | P1 | dropboxes/publishValidatedDrop.js:105 | adds dropped class to origin DOM outside dragDrop ownership | emit event; let source binder mark origin | ~8
```

### 4.11 Filters

#### `singleSelect` (108 files / 7 410 lines)

**Verdict:** Controller/orchestrator **clean**. Isolation failure is **missing adapter + 10 scattered `_KDB.cognosAPI.filters` sites**, plus one P0 host `.getValues()`. No P0 foreign state writes. Reducer is ceremonial (family pattern). File-size debt is a 120–149 cluster, not one monolith.

```
Cognos isolation | P0 | effects/verifyCommitFilterValue.js:9-10 | fallback calls host SDK _filterApi.getValues() when wrapper getFilterValues is missing | keep only the wrapper path | ~3
File size | P1 | actions/ownerNotificationSupport.js:1 | 149 lines | split ack-wait vs ack-classify vs generation tracking | ~70
Cognos isolation | P1 | effects/enumerateFilterInstances.js:111 | ten action/effect files read _KDB.cognosAPI.filters; no createSingleSelectAdapter.js | add adapters/createSingleSelectAdapter.js | ~80 across module
Duplication & namespaces | P1 | actions/applyRestoreSelectionCore.js:102 | rollbackHostWrite cloned in resync/clear; writeVerifiedSelection unused by those paths | one host write/reread/rollback helper | ~80
Foreign writes | P1 | actions/parameterSetResyncApply.js:6 | AMD-imports sicht/state/selectors.js (private-selector read) | use _KDB.api.sicht.getState() | ~8
Events | P1 | effects/notifyOwnerAfterCommit.js:59 | hardcoded sicht/specialSingleSelect action strings | import emitter action constants | ~15
Reducer purity | P1 | effects/commitConfirmedSelection.js:33 | effects write selection/error fields directly on _KDB.state.filters.singleSelect | route canonical writes through reducer (needs discussion) | n/a
Contract drift | P1 | config/actions.js:11 | SICHT_HISTORY_REPLAY_COMMITTED declared, never routed | delete dead type or restore handler | ~2
```

#### `dienststelle` (80 files / 4 965 lines)

**Verdict:** Thin controller. **`state/selectors.js` is the top risk** (311 lines + Cognos in state layer — singleSelect selectors have zero cognosAPI). Reducer helpers mutate nested scope in place.

```
Cognos isolation | P0 | state/selectors.js:233 | state selectors call cognosAPI.filters and lookupFilterApi for hierarchyItemId | move resolveHierarchyItemId* to effects/; keep selectors state-only | ~35 moved
File size | P1 | state/selectors.js:1 | 311-line monolith | split readers/extractors/snapshot; drop Cognos from state | ~200
Reducer purity | P1 | state/reducerStateHelpers.js:49 | applyScopeSelection/applyScopeClear mutate nested currentSelectionByScope in place | deep-copy scope entries (needs discussion if intentional perf) | 0
Duplication & namespaces | P1 | effects/dienststelleScopeApplySupport.js:4 | toCognosValues duplicated in restoreSupport and applyDienststelleDefault | single effects/cognosValueAdapter.js | ~25
Cognos isolation | P1 | (multi-site) | replaceFilterContext from 6 files with repeated typeof checks | central writeDienststelleFilterContext gateway | ~20
```

#### `filterDock` (71 files / 4 053 lines)

**Verdict:** Best file-size discipline in filters (max 118). **No foreign writes** — all owner traffic via `api.dispatch`. Main gap: Cognos DOM without adapter; `readDockRoot` unused by four callers. `nativeMultiSelect` not in `OWNER_ROUTE_MAP`.

```
Cognos isolation | P1 | effects/bindDockClickListener.js:16-21 | Cognos dock DOM queried inline instead of readDockRoot (also bindDockObserver, evaluateObservedDockState, dispatchPopupDisplayResync) | replace 4 copies with runtime/readDockRoot.js | ~24
Cognos isolation | P1 | effects/closeActivePopup.js:26-28 | global document.querySelector for Cognos portal catcher | move to thin Cognos DOM adapter | 0
Cognos isolation | P1 | effects/clickOriginalPopupButton.js:107-115 | direct native Cognos footer button .click() | wrap in adapters/ clickNativeDialogButton | 0
Cross-module consistency | P1 | filterDock/ (module root) | missing adapters/; Cognos DOM scattered across 15+ files | createFilterDockDomAdapter.js consolidating query/click/observe | 0
Over-defensiveness | P2 | observation/manageFiltersReadyWatch.js:8-22 | try/catch on every local sync helper | keep outer boundary only | ~25
```

#### `sicht` (55 files / 3 375 lines)

**Verdict:** **Cognos isolation exemplary** (zero raw host / cognosAPI). All mutations via `singleSelect` API. Not a god-controller. Debt: duplicated instance validation and parameter-set inventory gates; eight modules at the AMD 6-import ceiling.

```
File size | P1 | state/createSichtReducer.js:64 | 141 lines; SINGLE_SELECT_COMMITTED branch ~40 lines | extract per-action reducers | ~50
Duplication & namespaces | P1 | effects/validateSingleSelectCommitPayload.js:25 | unique live global Sicht instance query triplicated | shared readUniqueLiveSichtInstance | ~45
Duplication & namespaces | P1 | effects/notifyDienststelle.js:12 | dienststelle/sichtChanged payload built twice with divergent flags | single buildDienststelleSichtChangedPayload | ~25
Duplication & namespaces | P1 | actions/handleParameterSetClear.js:76 | inventoryGeneration stale-check duplicated with restore | parameterSetInventoryGate.js | ~30
Events | P1 | effects/delegateToSingleSelect.js:103 | cross-module action types as string literals | config/crossModuleActions.js | ~5
```

#### `nativeMultiSelect` (31 files / 1 634 lines) — newer

**Verdict:** Leanest filter. Controller thin. Tab-mutation split matches dienststelle. No P0. Cognos via wrappers only; **no module adapter**; three parallel `replaceFilterContext` paths. Public API matches `contracts/nativeMultiSelect.md`.

```
Cognos isolation | P1 | effects/lookupNativeMultiSelectApi.js:10-34 | filter enumeration duplicated across lookup/list/lookupByName | merge behind effects/cognosEnumerateNativeMultiSelectItems.js or adapters/ | ~80
Cognos isolation | P1 | actions/parameterSetHostApply.js:18-33 | replaceFilterContext duplicated in hostApply, scopeOps, restoreSnapshot | single effects/replaceNativeMultiSelectContext.js | ~35
Duplication & namespaces | P1 | actions/tabMutationSupport.js:29-50 | matchLayoutScopeId duplicated vs dienststelle restoreSupport | shared matchLayoutScopeId in core/utils/filters | ~30
File size | P1 | createNativeMultiSelectController.js:81-122 | 132 lines; dispatch is largest inline block | extract routeNativeMultiSelectDispatch.js | ~40
```

#### `specialSingleSelect` (36 files / 2 294 lines)

**Verdict:** **Policy orchestrator over singleSelect, not a fork.** No P0. One file over 120 (`resolveLiveSpecialInstances.js` 135). DOM class sync is the only raw host surface.

```
File size | P1 | effects/resolveLiveSpecialInstances.js:57 | 135 lines; sibling-identity validation inflates resolver | extract validateSiblingIdentity | ~35
Cognos isolation | P1 | effects/syncSpecialFilterClasses.js:20-46 | document.querySelector DOM writes in effects, no view/ | move to view/syncSpecialSingleSelectDom.js | 0
Foreign writes | P1 | effects/resolveLiveSpecialInstances.js:12-38 | reads singleSelect instancesById/hostStatus/selectionOwner | narrow singleSelect inventory API (needs discussion) | 0
Duplication & namespaces | P1 | state/createSpecialSingleSelectReducer.js:7-20 | cloneParkedSelections duplicated in specialPolicyShared | shared cloneSpecialSelectionMaps.js | ~18
Dead / debug | P2 | effects/syncSpecialFilterClasses.js:51-74 | resolveFilterIdByCondition exported, never imported | remove dead export | ~24
```

### 4.12 Widgets

#### `widgetBase` (83 files / 4 939 lines)

**Verdict:** Strong separation (state reducer-only; DOM in runtime). **Not a god-controller.** No sibling-owner state writes. Cognos mostly via `_KDB.cognosAPI` but no module adapter. Tab-mutation scaffolding reimplements core utils.

```
Foreign writes | P1 | effects/cleanWidgetForTransfer.js:41-48 | teardown deletes listeners on legacy _KDB.state.widgets[widgetId] bucket | route through content-owner cleanup APIs (needs discussion) | 0
AMD hygiene | P1 | effects/placeSerializedWidgetEntry.js:6-8 | effect imports and calls action handlers directly, bypassing dispatch/opSeq | refactor to _context.dispatch (needs discussion) | ~15
Duplication & namespaces | P1 | actions/tabMutationSupport.js:4-57 | bespoke guard/snapshot parallel to core/utils/filters/tabMutationRun | adopt shared guardTabMutationRun + tabMutationSnapshots | ~40
File size | P1 | state/resolveLaunchpadRoute.js:1 | 147 lines; five route resolvers + normalization | split predicates/normalizers | ~45
Cognos isolation | P2 | effects/renderTabWidgets.js:40-51 | direct cognosAPI.widgets.renderWidget in feature effect | thin adapter | 0
```

#### `widgetVis` (84 files / 5 362 lines)

**Verdict:** Pipeline architecture is sound. **Not a god-controller.** No raw host SDK. **No `adapters/`** — Cognos scattered across six effect files. Destroy misses topN-gate waiters. Legend/title DOM is the size driver.

```
File size | P1 | effects/gates/topNGate.js:1 | 154 lines (hard 150) | split waiter lifecycle from resolveTopNPrerequisite | ~40
File size | P1 | view/legend/legendCaptionDom.js:1 | 149 lines | extract sanitizeLegendCaptionMutation + collectCaptionEntries | ~35
Cognos isolation | P1 | effects/applyVisualizationProperties.js:60 | Cognos vis-property apply scattered; no module adapter | adapters/createWidgetVisCognosAdapter.js | 0
State vs runtime | P1 | runtime/cleanupRuntime.js:6-21 | destroy rejects dienststelle/contentReady waiters but not topNGate promises | add rejectAllTopNGateWaiters | ~15
AMD hygiene | P1 | actions/actionRouter.js:1 | 13 AMD imports | thin router to type→handler map | ~10
Dead / debug | P2 | lifecycle/writeLifecycle.js:2 | writeLifecycle mutates state.widgets.vis directly; zero importers | delete or wire through dispatchInternal | ~14
```

#### `widgetSettings` (76 files / 4 266 lines)

**Verdict:** No Cognos API leaks, no foreign state writes. **No reducer** (direct mutation). Four files >120. View layer dispatches widgetBase move/resize.

```
Public API shape | P1 | view/panelOutsidePointerBehavior.js:14-15 | view dispatches widgetBase/setMoveMode and resizeToggle, bypassing widgetSettings routing | route through widgetSettings action (needs discussion if intentional UX) | 0
Foreign writes | P1 | effects/buildDownstreamIntentAction.js:78-85 | readVisMaximizedFromApi reads widgetVis.getState().byId | add widgetVis/isMaximized query (needs discussion) | ~8
Reducer purity | P1 | state/commitWidgetSettingValue.js:15-28 | no reducer; state mutated directly | introduce reduceWidgetSettings (needs discussion) | 0
File size | P1 | view/bindWidgetSettingsPanel.js:1 | 146-line event hub | split panelPointerHandlers / panelDocumentPointer / deferredIconDispatch | ~40
Over-defensiveness | P2 | (module-wide) | ~90 try blocks | reserve try/catch to module boundaries | ~80–120
```

#### `widgetText` / `widgetTopN` / `widgetDataTable`

**widgetDataTable** is an **intentional stub** (noop dispatch, no Cognos). **widgetTopN** has the size debt (controller 149 at hard cap). **widgetText** has inline Cognos fontSize in the view layer.

```
Cognos isolation | P1 | widgetText/view/applyTextFontSize.js:88-99 | inline cognosAPI.widgets.getContent + setPropertyValue(fontSize) in view | extract setWidgetFontSize adapter | ~15
File size | P1 | widgetText/view/applyTextFontSize.js:7-127 | view mixes DOM styling, Cognos sync, normalization, reflow | split normalize / adapter / applyDomFontSize | ~40
Duplication & namespaces | P1 | widgetText/state/cloneSerializable.js:1-14 | identical JSON-clone in widgetTopN and widgetDataTable | lift to _KDB.utils.cloneSerializable | ~25
Cognos isolation | P1 | widgetTopN/effects/readHelperTableRows.js:33-38 | direct cognosAPI.widgets.renderWidget; no module adapter | adapters/renderHelperWidget.js | ~12
Orchestrator vs controller | P1 | widgetTopN/createWidgetTopNController.js:97-146 | inlines dispatchInternal/ensureState that widgetText extracted | extract widgetTopNDispatchContext.js | ~50
Public API shape | P1 | widgetTopN/createWidgetTopNController.js:70-72 | disposed dispatch returns { ok: true, status: "aborted", errorCode: WIDGET_TOPN_DESTROY_FAILED } | align with widgetText skipped/disposed shape (needs discussion) | ~3
Contract drift | P1 | widgetDataTable/createWidgetDataTableController.js:39-43 | contract specifies contentCreate/validateClaimable/releaseClaim; only SCAFFOLD_NOOP exists | implement tranche or update contract | n/a
```

### 4.13 `dashboard/tabs`

**Verdict:** **Partial god-controller** + god-reducer. Cognos **API** isolated in `createCognosTabsAdapter.js`. Cognos **tab chrome DOM** duplicated across four effect files (highest-impact dedup). Six HARD oversized files (~20% of module lines). Mutation saga is dispatch-based (no P0 foreign writes) but owner names are string literals.

```
File size | P1 | effects/traverseTabs.js:1 | 305 lines; traverse + DOM click + logging | split traverseOrchestrator + dom/tabButtonDom | ~80
File size | P1 | createTabsController.js:1 | 299 lines; inlined dispatch/traverse/rename | extract dispatchTraverse.js + dispatchRename.js | ~70
File size | P1 | state/reduceTabsAction.js:1 | 285-line mega-switch | split per action family into state/reducers/* | 0 (structure)
Orchestrator vs controller | P1 | createTabsController.js:87-296 | partial god-controller: traverse coalescing, rename pipeline, runtime cleanup inlined | delegate to named modules | ~80
Cognos isolation | P1 | effects/traverseTabs.js:95,249-251 | tab activation via raw DOM .click() bypasses adapter | centralize in adapters/dom or effects/dom/cognosTabButtons.js | ~20
Cognos isolation | P1 | effects/applyTabsEffects.js:124-127 | duplicate Cognos tab-button DOM scan (also traverseTabs, syncTabsDomFromState, observeActiveTab) | single effects/dom/readTabButtons.js | ~40
Duplication & namespaces | P1 | createTabsController.js:164-177 | duplicate normalizeTraversePayload vs traverseTabs.js:254-266 | one config/normalizeTraversePayload.js | ~25
Events | P1 | createTabsController.js:284-285 | hardcoded authoring:entered/exited | import shared authoring eventNames | 0
Contract drift | P1 | actions/runTabMutationSaga.js:28-40 | hardcoded owner list + action suffix strings | owner registry config (mutationOwners.js) | 0
Dead / debug | P2 | effects/traverseTabs.js:234-236 | console.log traverse diagnostics in production hot path | gate behind debug flag or remove | ~15
```

### 4.14 Chrome: `header`, `footer`, `launchpad`, `metricsTree`

**Verdict:** No foreign **writes**. Footer **reads** header state. Only **launchpad** calls `cognosAPI` (and has no adapter). Hard-cap breaches: `readSlotWidgets.js` (159), `createMetricsTreeController.js` (156). Folder-layout split: header/footer use `dom/`; launchpad/metricsTree use `view/`.

```
File size | P1 | header/createHeaderController.js:57 | factory ~86 lines exceeds controller-function hard 60 | extract snapshotChrome/commitActiveEdit | ~25
File size | P1 | footer/createFooterController.js:32 | factory ~94 lines exceeds controller-function hard 60 | extract bindFooterLifecycle.js | ~30
Foreign writes | P1 | footer/state/selectors.js:9 | footer selectors import header readHeaderStatus | pass headerStatus via event payload or shared chrome selectors | ~5
File size | P1 | launchpad/effects/readSlotWidgets.js:1 | 159 lines exceeds hard 150 | split slot DOM resolution into view/resolveLaunchpadSlot.js | ~60
Cognos isolation | P1 | launchpad/state/buildLaunchpadTabDescriptors.js:117 | Cognos layout read in state builder, not adapter | adapters/createLaunchpadLayoutAdapter.js wrapping cognosAPI.tabs | ~15
Cognos isolation | P1 | launchpad/state/buildLaunchpadTabsFromCanvas.js:10 | Cognos canvas read in state builder | same launchpad Cognos adapter | ~10
File size | P1 | metricsTree/createMetricsTreeController.js:1 | 156 lines exceeds hard 150 | move runMountPipeline + readSourceInput to effects/runMetricsTreeMount.js | ~70
Orchestrator vs controller | P1 | metricsTree/createMetricsTreeController.js:8 | mount pipeline orchestration in controller | same split; controller wires only | ~40
```

### 4.15 Controls: `historyControls` + `pdfExportControls` (newer)

**Verdict:** Both are thin UI consumers of services (no inlined history/PDF logic). pdfExport is the better template (`runtime/`, `waitFor*`). historyControls controller is 161 lines (HARD). Shared `bindToolbarObserver` + Cognos actionBar selector.

```
Orchestrator vs controller | P1 | historyControls/createHistoryControlsController.js:32-76 | controller owns generic bucket iterators + full teardown | extract runtime/cleanupHistoryControlsRuntime.js (mirror pdfExport) | ~45
File size | P1 | historyControls/createHistoryControlsController.js:100-150 | mount wait lives in controller (161 total) | extract effects/waitForHistoryToolbar.js | ~35
Duplication & namespaces | P1 | historyControls/observation/bindToolbarObserver.js:42 | MutationObserver on document.body {subtree:true}; near-identical in pdfExportControls | shared bindToolbarRemountObserver | ~40 both modules
Cognos isolation | P1 | historyControls/config/domSelectors.js:5 | Cognos host selector duplicated in pdfExportControls | shared toolbarHostSelector constant | ~2
```

---

## 5. Uncertainties (lead)

1. Whether unused `cognosAPI.dashboard.*` / `dataSources.*` methods are reserved upgrade vocabulary or dead.
2. Whether `writeback.md` contracted `window.top.WBParameter*` overrides the rubric’s `_KDB.cognosAPI.<theme>.<fn>` requirement.
3. Whether ceremonial filter reducers (in-place mutations in singleSelect/dienststelle family) are an accepted family convention.
4. Whether `metricsTree` teardown is owned elsewhere (not visible in `KDB.js`).
5. `flattenDataQueryResult` unused vs `tableData/normalizeTableData` — which is canonical.
6. `nativeMultiSelect` exclusion from filterDock `OWNER_ROUTE_MAP` — intentional?
7. Mixed TM1 key shapes in `kennzahlDefaults.js` (full Caption paths vs short `"Monat"`) — splitting must preserve exact strings.
8. `kdbControl` tab-follow raw `document.getElementById` is contract-approved; future architecture may still want `cognosAPI` adapters.

---

## 6. What this audit did *not* find (important negatives)

- Almost no P0 **foreign `_KDB.state` writes**. Ownership discipline is the strongest property of the tree.
- Almost no god-controllers in the filter/widget families. Do not “fix” healthy `create*Controller.js` files.
- No forbidden legacy namespaces (`_KDB.utilities` / `generalFunctions` / `dropdownOptions`) in audited production JS.
- Newer modules (`nativeMultiSelect`, `messageService`, `dashboardPdf`, `pdfExportControls`) are **leaner** than older siblings and generally follow the folder template more closely — except dashboardPdf `helpers/` and missing adapters.
- `widgetDataTable` is an intentional stub, not abandoned production code.

---

## 7. Delta t.o.v. eerste audit (2026-07-10)

Eerste rapport: `architecture/structure-audit.md` (Fable 5, 2026-07-10). Scope toen: `dashboard/**` + `core/services/**` (~840 files / ~48 700 regels). Scope nu: hele `KDB3/js/**` (1 240 files / 78 644 regels), inclusief lagen die de eerste audit **niet** dekte.

Beide audits zijn het eens over het hoofdbeeld: orchestrator/controller-split wordt gevolgd, foreign `_KDB.state`-writes zijn zeldzaam, `__getDashboardAPI()` zit niet verspreid in feature-modules. Het structurele probleem is **incomplete Cognos-adapterlaag + geconcentreerde file-size-hubs + duplicatie**.

Severity-verschil (methodisch, niet inhoudelijk): de eerste audit upgrade-de enkele leaks naar **P0** (uncleaned timer/listener). Deze second opinion hield leaks vaak op **P1** tenzij destroy/teardown aantoonbaar kapot is (`KDB.js`) of raw SDK wordt aangeroepen (`getValues`). Remediation-agent: behandel de overlapping leak-sites als **P0** (eerste audit) tenzij hieronder als opgelost gemarkeerd.

---

### (a) Bevestigd (beide audits vinden het)

| Onderwerp | Eerste audit | Deze audit | Notitie |
|---|---|---|---|
| Cognos-wrappers ja, per-module `create*Adapter.js` nee | CC-1, P1 projectbreed | §2.1, bijna elke module | `tabs` blijft de positieve uitzondering (API-adapter); tab-**DOM** is nog steeds niet geïsoleerd |
| Cognos in `view/` (widgetBase, widgetText) en in `state/` (dienststelle selectors, launchpad tab descriptors) | CC-1 “ernstigste varianten” | dienststelle P0/P1, launchpad P1, widgetText P1 | Onveranderd |
| kdbControl `framework/` hard-limit cluster (sync 336, gallery, main blocks, reducer, controller) | top file-size hotspot | §4.9 | Gallery was 607, is nu 315 — **deels gesplitst, nog steeds HARD** |
| tabs `traverseTabs` / `createTabsController` / `reduceTabsAction` hard oversize | 323 / 289 / 294 | 305 / 299 / 285 | Nauwelijks kleiner; module is **gegroeid** (16 → 58 files) door tab-mutation saga |
| dienststelle `state/selectors.js` te groot + Cognos in selectors | 333 regels, P1 | 311 regels, P0 (Cognos-in-state) | Zelfde site; severity strenger hier |
| widgetVis destroy ruimt `topNGate`-waiters niet op | **P0-2** | §4.12 P1 `cleanupRuntime.js:6-21` | **Bevestigd.** Volg eerste-audit P0 |
| widgetBase `cleanWidgetForTransfer` teardownt legacy `_KDB.state.widgets[widgetId]` | **P0-3** | §4.12 P1 | **Bevestigd.** Ownership nog steeds **needs discussion** |
| kdbControl color-field `document.mousedown` zonder teardown | **P0-4** | §4.9 P1 `buildControlPrimitiveGallery.js:242-258` | **Bevestigd.** Volg eerste-audit P0 (leak) |
| historyService `Date.now()` in reducer | CC-10 | §4.8 P0 `createHistoryReducer.js:91` | Bevestigd; hier P0 (reducer impurity) |
| historyService god-file ~200 regels | 200 | 199 | Onveranderd |
| filterDock `resolveDockRoot` 4× gedupliceerd | CC-5.4 | §4.11 P1 | Bevestigd; `readDockRoot.js` bestaat al maar wordt ondergebruikt |
| `cloneSerializable` / JSON-clone kopieën | CC-5.5 | widgetText/TopN/DataTable + utils-notitie | Bevestigd |
| Hardcoded cross-module action-strings | CC-4 | singleSelect, sicht, tabs saga, writeback restore, kdbControl | Bevestigd; erger in writeback (~25 types) |
| Mechanische try/catch | CC-6 | widgetSettings ~90, filterDock observation, cognosAPI wrappers, messageService | Bevestigd |
| widgetBindingApply: Cognos-SDK via facade in `effects/`, niet `adapters/` | §2.14 | §4.6 | Bevestigd; facade is nog steeds de juiste *lokale* grens |
| tableData `resolveTableWidgetId` Cognos-scan in effects | §2.17 | §4.8 | Bevestigd |
| launchpad Cognos in `state/` builders, geen adapter | §2.13 | §4.14 | Bevestigd; `readSlotWidgets.js` 159 HARD nog steeds |
| metricsTree god-controller 156 HARD | §2.13 | §4.14 | Bevestigd |
| historyControls controller boven hard limit | 174 | 161 | Iets kleiner, nog HARD; pdfExportControls is nu het betere template |
| writeback `window.top.WBParameter*` zonder `_KDB.cognosAPI.writeback` | §2.16 P1 | §4.5 P2 | Bevestigd; nog steeds **needs discussion** vs `writeback.md` §3 |
| `collectReplayHandlers.js` centrale feature-kennis | CC-11 | §4.8 | Bevestigd |
| Dode kdbControl-scaffolding (`writeFrameworkView.js`, empty toolbox orchestrator) | §2.1 | §4.9 | Bevestigd |
| widgetVis `lifecycle/writeLifecycle.js` dead | §2.3 | §4.12 | Bevestigd |
| widgetDataTable is bewuste stub | §2.6 | §4.12 | Bevestigd |
| Geen forbidden `_KDB.utilities` / `dropdownOptions` namespaces | impliciet | §2.6 | Bevestigd |
| Geen verspreide `__getDashboardAPI()` in feature-modules | managementsamenvatting | §2.1 | Bevestigd — het lek zit in **returned handles**, niet in de entry |

**widgetSettings timer-P0 (eerste audit P0-1):** deze pass heeft `bindWidgetSettingsPanel.js:100` (50 ms deferred dispatch) als onzekerheid gemeld, niet als P0. Niet onafhankelijk bevestigd dat de timers nog steeds buiten `runtime.timers` vallen — **niet als opgelost behandelen**; verifieer vóór tranche 0.

---

### (b) Tegengesproken of inmiddels opgelost (met onderbouwing)

| Eerste-audit finding | Status nu | Onderbouwing |
|---|---|---|
| `writeback/set/createWritebackSetService.js` **820 regels** — grootste file-size-probleem | **Opgelost (gesplitst)** | writeback is nu **60 files / ~4 078 regels**; **0 files >150**. `runFilterRestore` e.d. bestaan als aparte effects (precies de split die audit 1 voorstelde). Resterend: 2 files >120 (`collectCanvasSettings` 138, `cognosWritebackBridge` 136) |
| `writeback/schema/validateV3.js` 422 / `normalizeV3.js` 332 | **Opgelost (gesplitst)** | Geen writeback-file meer boven hard 150; schema ligt onder `schema/validate/` + `schema/normalize/` met o.a. `validatePcfs.js`, `validateFilters.js` |
| writeback omvang “11 files / ~2.4k” | **Structureel veranderd, niet meer de hotspot** | 11 → 60 files. Nieuwe schuld is stringly-typed owner actions + drie dispatch-implementaties, niet één god-file |
| kdbControl `buildControlPrimitiveGallery.js` **607** | **Deels opgelost** | Nu **315** (nog HARD). `buildControlMainBlocks.js` 360 → **191** |
| “Nul raw Cognos-hostaccess in de hele scope” | **Genuanceerd / deels tegengesproken** | Feature-modules doen inderdaad geen `__getDashboardAPI()`. Wél: `singleSelect` `_filterApi.getValues()` (host-object fallback); wrappers zelf bevatten feature-flow (`dataQuery.flatten/poll`, `clearAllLocalFilters`); Cognos-**DOM** (tabs `.click()`, filterDock footer `.click()`, PDF spinner-class) was buiten hun wrapper-definitie |
| tabs “16 files / ~1.9k” als puur file-size-probleem | **Veranderd van karakter** | Nu 58 files / 4 455 regels: tab-mutation **saga** koppelt tabs aan filter/widget owners. Size-hubs blijven, plus nieuwe orchestratie-koppeling |
| singleSelect “41 files / ~2.3k” | **Veranderd** | Nu 108 / 7 410 — parameter-set + tab-mutation + write-verify-rollback. Controller is nóg schoner; de “god” zit in gekloonde host-write paden |
| dragDrop `cleanupPartialStart` broken `removeLayoutGrid` | **Al opgelost in eerste rapport zelf** (2026-07-13 noot) | Deze pass: delegeert naar `finishDragSession`; niet opnieuw als defect |
| writeback ongewirede collector / `collectCanvasSettings` “functioneel dead” | **Tegengesproken** | `collectCanvasSettings.js` is nu een levende collector (138 regels, in de GET-pipeline) |
| Eerste audit: writeback “zwak (file-size)” | **Niet meer de zwakste module** | Nu: goed gesplitst, residual P1 duplicatie. Zwakste size-hubs zijn **kennzahlDefaults** (niet in hun scope), **tabs**, **kdbControl framework** |
| metricsTree reducer `Date.now()` (CC-10) | **Niet herbevestigd** | Chrome-batch meldde het niet. Kan opgelost zijn of gemist; **niet als bevestigd P0 behandelen zonder re-check** van `state/createMetricsTreeReducer.js` |
| Eerste-audit schatting ~3 500–4 500 regels reductie op 48.7k | **Herschalen** | writeback-split is al gedaan (~1 200 van hun ROI). Resterende ROI zit in kennzahlDefaults-reorg (0 netto tot fragment-dedup), tabs/kdbControl splits, adapter-extracties |

Niet tegengesproken, wel **verschoven**: hun tranche 1 “split writeback eerst” is achterhaald. Tranche 1 nu: **cognosAPI dun maken + kennzahlDefaults sharden + tabs/kdbControl splits** (zie §3).

---

### (c) Nieuw (alleen door deze audit — o.a. dektes die audit 1 niet had)

**Lagen buiten de eerste scope**

| Nieuw onderwerp | Severity | Waar |
|---|---|---|
| `kennzahlDefaults.js` **4 766 regels** (19× config-limiet; 113 kennzahl-templates) | P1 | `core/config` — dominante size-finding van het hele project |
| TM1-filtervocabulaire gedupliceerd over kennzahlDefaults / bindingSpecs / dimensions / sorting | P1 | `core/config` |
| `parameterMapping.js` muteert `_KDB.runtime` vanuit `config/` | P1 | `core/config` |
| `_KDB.cognosAPI` wrappers zijn **mixed/thick**: flatten+poll in `dataQuery.js` (260), `clearAllLocalFilters` loop, `whenRenderStartComplete`, returned handles (`getSlots`/`getContent`) zodat feature-SDK doorgaat | P0/P1 | `core/cognosAPI` — dit is de ontbrekende helft van “upgrade raakt alleen de wrapperlaag” |
| Catalog-gaten: slot verbs, `setContentPropertyValue`, `getPageContextItem`, host-CSS buiten `cognosHost` | P1 | `core/cognosAPI` + `cognosHost` |
| Ongebruikte wrapper-surface (`dataSources.*`, veel `dashboard.*`, `whenRenderStartComplete`) | P1 | `core/cognosAPI` |
| `readCurrentTab.js` belt `cognosAPI.tabs` vanuit utils; selector dupliceert `cognosHost` | P1 | `core/utils` |
| `tabMutationRun` in `core/utils` bestaat, maar widgetBase + tabs reimplementeren de guard | P1 | utils vs widgetBase vs tabs — **nieuw cluster** (tab-CRUD is sinds 10 jul gegroeid) |
| `_KDB.utils.sleep` / `throttle` / `waitFor` ondergebruikt | P2 | `core/utils` |
| `jquery-ui.min.js` lijkt ongebruikt (alleen CSS geladen) | P2 | `core/libraries` |
| `KDB.js` is **geen** wiring-only bootstrap: overlay-flow, DOM, `features.*` mapping; 30 AMD imports | P1 | `KDB.js` |
| `metricsTree` gemount, **nooit destroyed**; feature-destroy niet geïsoleerd; services-teardown incompleet | P0 | `KDB.js` |
| `nativeMultiSelect` (31f / 1 634) — lean, geen P0, geen adapter, drie `replaceFilterContext`-paden, tab-mutation à la dienststelle | P1 | nieuwe filter |
| `messageService` (17f / 899) — CP-1 layout goed; anchored-notification god-module; listener-registry duplicatie | P1 | nieuwe service |
| `dashboardPdf` (22f / 1 336) — capture via `cognosAPI.dashboard`; **spinner-class leak** `.loadingIndicatorContainer`; `helpers/` i.p.v. `effects/` | P1 | nieuwe service |
| `pdfExportControls` (13f / 443) — schoner template dan historyControls; gedeelde toolbar-observer/selector met historyControls | P1 (DRY) | nieuwe control |

**Nieuwe bevindingen in wél eerder gedekte modules**

| Nieuw onderwerp | Severity | Waar |
|---|---|---|
| `singleSelect` host SDK `.getValues()` fallback | P0 | `effects/verifyCommitFilterValue.js:9-10` |
| `singleSelect` write/reread/rollback **gekloond** (restore/resync/clear) terwijl `writeVerifiedSelection.js` bestaat | P1 | filter host-I/O |
| `singleSelect` AMD-import van `sicht/state/selectors.js` | P1 | private-selector read |
| Dead `SICHT_HISTORY_REPLAY_COMMITTED` | P1/P2 | contract vs code |
| dragDrop tab-rebind checkt `kdb_dropbox` op **page** i.p.v. dropbox-child — waarschijnlijk kapotte poll | P1 | `subscribeTabsChangedRebind.js:71` |
| widgetSettings heeft **geen reducer** (directe mutatie) | P1 | niet zo geformuleerd in audit 1 |
| widgetSettings view dispatcht `widgetBase/setMoveMode` / `resizeToggle` | P1 | layering |
| widgetBinding Plan/Apply: drie filter-value normalizers + dubbele slot-clear policy | P1 | cross-service |
| writeback: drie dispatch-implementaties (`dispatchOwnerPhase` / `ensureTabWidgetsRouted` / `finalizeSingleSelectRun`) | P1 | ontstaan ná de set-service split |
| writeback bridge SET retourneert `RestoreResult` i.p.v. contract `void` | P1 | contract drift |
| tabs mutation saga hardcoded owner-lijst | P1 | nieuwe koppeling sinds tab-CRUD |
| `filterDock` routeert `nativeMultiSelect` niet | onzeker | mogelijk bewust |
| `specialSingleSelect` is een policy-wrapper, geen fork (eerste audit noemde vooral duplicatie) | nuance | minder “dedup naar shared” dan audit 1 tranche 3.16 |

---

### Gevolg voor de remediation-agent

1. **Niet** beginnen met writeback-file-size — dat is gedaan. Resterend writeback-werk is constants + dispatch-DRY + bridge-contract.
2. **Wél** beginnen met: (i) P0 leaks die beide audits delen (topNGate, kdbControl document-listener, widgetBase legacy teardown — plus **KDB.js destroy-registry** en **singleSelect `getValues`**), (ii) **cognosAPI dun + leaf verbs**, (iii) **kennzahlDefaults sharden**, (iv) tabs/kdbControl size-splits.
3. Merge findings op `file:line` + dimensie. Bij severity-conflict op dezelfde leak-site: **P0 wint** (eerste audit), behalve waar deze audit aantoont dat de file is verdwenen/gesplitst.
4. Nieuwe modules (nativeMultiSelect, messageService, dashboardPdf, pdfExportControls, core/config, core/cognosAPI, KDB.js, core/utils) hebben **geen tegenhanger** in audit 1 — neem deze rapportage als enige bron.

---

*Second-opinion audit 2026-08-16. 23 read-only rubric-batches (Composer 2.5 + Grok 4.6 op isolatie/kernlagen) + lead-synthese. Eerste rapport pas na afronding van §0–§6 gelezen. Geen code- of contractwijzigingen.*


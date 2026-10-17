# Module Contract: `writeback`

> Contract for the KDB3 writeback services. This document replaces the legacy-shaped writeback storage direction from `contracts/_archive/overdracht/writeback.md` and promotes the compact v3 direction from `contracts/_archive/overdracht/writebackExtra.md` into the active writeback contract.
> No production code may be generated until this contract is reviewed and approved.

---

**Status:** `Approved - implementation tranche 1 in progress`
**Owner service:** `writeback`
**Type:** `core service group`
**Authoring AI:** GPT-5.5, 2026-07-08
**Reviewed by:** `PO (vastenburg), approved 2026-07-08; implementation syncs §1/§4.5.1/§8 approved 2026-07-10; §1 tree realized incl. file-size splits (feature-structure.mdc) approved 2026-07-10; GET wgts decisions (onCanvas-only, colours delta) approved 2026-07-10; sequences removed from project scope (all `seq` fields/rules dropped) approved 2026-07-12; descriptive-key redesign (§4: canv/sett/head/foot/filt/tabs/wgts; widgets and sels as short-key objects, positional tuples dropped, closes Open Decision 1) approved 2026-07-10; T2 item 2 close 2026-08-16; T2 item 3 close 2026-08-16; GET visible-dashboard collect (click + content) + hide:1 shells 2026-08-30 — see writeback-get-visibleDashboard-contractdelta.md`
**Related contracts:** `tabs.md`, `tabs-writeback-readiness-contractdelta.md`, `writeback-get-visibleDashboard-contractdelta.md`, `tabs-activationEvent-contractdelta.md`, `widgetBase-lazyLaunchpadRouting-contractdelta.md`, `dienststelle.md`, `header.md`, `footer.md`, `widgetBase.md`, `widgetBase-parameterSetReset-contractdelta.md`, `widgetSettings.md`, `widgetVis.md`, `widgetText.md`, `widgetDataTable.md`, `widgetTopN.md`, `historyService.md`, `tableDataService.md`, `writeback-t2-item2-contractdelta.md`, `writeback-t2-item3-contractdelta.md`

---

## 0. Contract Decisions

1. KDB3 writeback is implemented as **three services plus one shared schema contract**:
   - `_KDB.services.writebackGet`
   - `_KDB.services.writebackSet`
   - `_KDB.services.writebackMap`
2. Data warehouse storage uses **only compact v3 payloads**. Legacy KDB2 JSON is not a storage format.
3. `writebackSet` accepts **only validated v3**. It does not silently map legacy payloads.
4. `writebackMap` is the only legacy entry point. It maps v0/v1/v2 legacy payloads to v3.
5. `writebackGet` produces v3 directly from KDB3 state/API selectors, not by recreating KDB2 DOM snapshots.
6. A shared `schema/` layer is the single source of truth for v3 defaults, validation, normalization and source-format detection.
7. Restore uses existing KDB3 module dispatch/replay paths. Direct Cognos mutation is allowed only through existing owner APIs/effects.
8. Dienststelle hierarchy validation belongs only to the parameter-set restore path, preserving the CP-3 decision in `dienststelle.md`.
9. Mapping SSOT is package-bound JS under `KDB3/js/core/config/mapping/`: `parameterMap.js` (frozen flat `*_KID` map) and `kidIndex.js` (grouped index / required keys). Cognos property `parameterMappingId` is not loaded. `__savedProperties/parameterMappingId.js` is a static fixture, not runtime. See `contracts/_archive/mapping-config-ssot-contractdelta.md`.
10. `WritebackTabel` CRUD is out of scope for the first implementation tranche.
11. Production restore requires owner contract deltas for `tabs`, `header`, `footer`, `dienststelle`, widget reset, `widgetBase`, `widgetSettings`, `widgetVis`, `widgetText`. Kind `"tbl"` / helper `"topn"` do not enter scope (T2 item 2 close 2026-08-16, skip-by-design).
12. P0 deltas in section 12 exist and are approved except items 8–9 (Draft); implementation proceeds under the approved set (sync 2026-08-10).

## 1. Placement

Target production path:

```txt
_____________KDB3API/KDB3/js/workflows/parameterSet/
```

Target config path for semantic mapping helpers:

```txt
_____________KDB3API/KDB3/js/core/config/mapping/
  parameterMap.js
  kidIndex.js
  bwOldToNewMap.js
```

`parameterMap.js` is the package-bound source of truth for current KID / itemId values (edit this folder when the Cognos package changes). `kidIndex.js` exposes required-key definitions and a grouped index over that frozen map. `__savedProperties/parameterMappingId.js` may seed the map as a fixture; production does not load Cognos `parameterMappingId`. Cross-package: source map from the v2 payload; target from `parameterMap.js`.

Service tree (as built; per-section splits follow the `feature-structure.mdc` file-size limits --
entry files `validateV3.js` / `normalizeV3.js` compose the per-§4-section modules under `validate/` /
`normalize/`, `set/` splits restore mechanics into `config/`, `state/` and `effects/`):

```txt
workflows/parameterSet/
├── __orchestratorWriteback.js         registers writebackGet/Set/Map + writebackBridge, merges German labels
├── cognosWritebackBridge.js           guarded host bridge (WBParameterGetFunction / WBParameterSetFunction), install/uninstall
├── schema/
│   ├── errorCodes.js                  error code table (includes WRITEBACK_TIMEOUT)
│   ├── v3Defaults.js
│   ├── detectSourceFormat.js
│   ├── validateV3.js
│   ├── validate/
│   │   ├── validatePrimitives.js
│   │   ├── validateCoreFields.js      (frame/canv/sett)
│   │   ├── validateChrome.js          (head/foot)
│   │   ├── validateFilters.js         (filt)
│   │   ├── validatePcfs.js            (filt.pcfs)
│   │   ├── validateTabsWidgets.js     (tabs/wgts objects)
│   │   └── validateWidgetFields.js    (wgts per-kind fields)
│   ├── normalizeV3.js
│   └── normalize/
│       ├── normalizeCoreFields.js     (canv/sett/head/foot)
│       ├── normalizeFilters.js        (filt)
│       ├── normalizePcfs.js           (filt.pcfs)
│       └── normalizeTabsWidgets.js    (tabs/wgts objects)
├── get/
│   ├── createWritebackGetService.js   public writebackGet; runs collectors, then the bridge-only persist landing
│   ├── runWritebackGetCollectors.js   collector run + notifySaveFailed alert
│   ├── collectors/
│   │   ├── collectorSupport.js        shared helpers (dashboard-tab role rule, scope helpers)
│   │   ├── collectCanvasSettings.js   (canv/sett)
│   │   ├── collectHeaderFooter.js     (head/foot)
│   │   ├── collectTabs.js             (tabs; hidden dashboard shells as hide:1)
│   │   ├── collectFilters.js          (filt orchestrator: sicht/dstl/sels/pcfs)
│   │   ├── collectDienststelleFilter.js (filt.dstl)
│   │   ├── collectSingleSelectInstances.js (filt.sels via instance inventory)
│   │   ├── materializeSingleSelect.js (pending single-select entries -> persisted entries / inst)
│   │   ├── collectNativeMultiSelect.js (filt.pcfs via nativeMultiSelect collect dispatch)
│   │   ├── buildScopeIdToTabIdx.js
│   │   ├── collectWidgets.js          (wgts; visibleDashboard traverse)
│   │   └── buildWidgetObject.js       (wgts per-widget object)
│   └── persist/                       bridge-only landing after the host "save parameter set" popup
│       ├── persistLanding.js          applyWritebackGetPersistLanding / cancelWritebackGetPersistLanding (abortControllers.persistLanding)
│       ├── persistLoadingOverlay.js   loading overlay handle (runtime.getPersistLoadingHandle)
│       └── persistPopupProbe.js       finds the Cognos save popup (<smq-popup> in body, this window or top)
├── set/
│   ├── createWritebackSetService.js
│   ├── config/
│   │   ├── restoreConstants.js        phase enum, status table, sentinels
│   │   └── writebackLabels.js         German _KDB.config.labels.de.writeback
│   ├── state/
│   │   ├── ensureWritebackRuntime.js  runtime.writeback defaults
│   │   ├── createRunContext.js
│   │   ├── validateRestorePayload.js
│   │   ├── readOwnerTargets.js
│   │   └── buildRestoreResult.js
│   └── effects/
│       ├── executeRestoreRun.js
│       ├── executeRestoreRunCleanup.js
│       ├── runGuards.js               history begin/finish guards (steps 6/29)
│       ├── dispatchOwnerPhase.js
│       ├── runNormalRestore.js
│       ├── runNewDashboardReset.js
│       ├── runWidgetRestore.js
│       ├── bindVisPerActiveTab.js     step 27 per-tab vis binding
│       ├── ensureTabWidgetsRouted.js  step 23 precondition
│       ├── publishRestoreTabCaption.js
│       ├── restoreAbortActiveTab.js
│       ├── waitForPageContextHost.js
│       ├── waitForRootLifecycleReady.js
│       ├── finalizeSingleSelectRun.js
│       ├── notifyRestoreOutcome.js
│       └── filters/
│           ├── runFilterRestore.js
│           ├── filterRestoreGeneration.js
│           ├── filterRestoreTargets.js
│           ├── buildAllowedClearTabIdxs.js
│           ├── dispatchFilterClearPhases.js
│           ├── dispatchDienststelleRestore.js
│           └── dispatchSpecialSingleSelectRestore.js
├── urlShare/                          URL parameterId handling around the default restore
│   ├── readUrlParameterId.js          reads the id from navigation name / document hash
│   ├── skipDefaultRestoreForUrlParameterId.js
│   ├── whenUrlShareRestoreSettled.js  called from KDB.js; applies the URL id, resets to newDashboard on failure
│   ├── waitForSingleSelectInventoryQuiet.js
│   ├── mapUrlShareSelectResult.js
│   └── presentPendingUrlShareMessage.js
├── map/
│   ├── createWritebackMapService.js
│   └── adapters/                      v2 -> v3
│       ├── mapV2ToV3.js
│       ├── mapV2CanvasSettings.js
│       ├── mapV2Chrome.js             header/footer (mapV2HeaderFooter)
│       ├── mapV2Layout.js             widget tab + layout parsing
│       ├── mapV2Filters.js
│       ├── mapV2FilterEntries.js
│       ├── extractV2FilterValues.js
│       ├── classifyV2FilterItem.js
│       ├── mapV2Widgets.js            widget entries (vis/txt)
│       ├── remapV2KidTokens.js
│       └── v2KidTree.js               buildV2SourceMapping / universalizeV2KidTree / deUniversalizeV2KidTree
└── bridge/
    ├── hostGlobals.js                 installs the window.top globals; `__kdbOwner` is a getter so a destroyed KDB is not kept alive
    ├── bridgeResult.js                failureResult / cancelledResult / toBridgeDiagnostic
    ├── normalizeBridgeSetInput.js     SET input canonicalization (§3.3)
    ├── runBridgeSetRestore.js         host SET path + notifyAfterRestore
    ├── confirmDiscardUnsavedChanges.js
    ├── ensureNewDashboardOption.js    "new dashboard" option in the host parameter-set select
    ├── hostParameterSetSelect.js      readSelectedParameterSet, waitForParameterSetSelectReady, revertSelect
    ├── parameterSetSelectConstants.js
    ├── selectParameterSetById.js
    └── waitForBridgeSetSettlement.js  armWaiter + notifyBridgeSetSettled
```

Registration belongs in `bootstrap/registerServices.js`, alongside `tableData`, `loadingService`, `widgetBindingPlan`, `widgetBindingApply` and `history`.

## 2. Public Services

### 2.1 `writebackGet`

Public API:

```js
_KDB.services.writebackGet.collect(options?) -> Promise<V3ParameterSet>
```

Responsibilities:

- collect current dashboard state into compact v3;
- read from owner APIs/selectors where available;
- omit runtime-only state, DOM references, history stacks and derived state;
- skip host widgets, `writebackTable` widgets and launchpad-only widgets;
- apply defaults/delta encoding through the shared schema layer;
- return an object, not a JSON string;
- end every collection with `normalizeV3(...)` and `validateV3(...)`;
- fail visible (remediation B3, 2026-08-19): a genuine collector crash (throw, or `ok: false` from an owner snapshot) marks the run with `WRITEBACK_COLLECTOR_FAILED` and `collect()` throws instead of returning a partial payload — silent section omission would become restore-by-omission data loss on the next SET. Design-skips (`WRITEBACK_SKIPPED_BY_DESIGN`) still never abort GET. The user is informed through `messageService.showAlert` before the throw; the bridge keeps its existing rethrow contract.

The Cognos bridge serializes the object when exposing `window.top.WBParameterGetFunction`.

Persist landing (as built, `get/persist/`): when the GET comes from the Cognos bridge, `createWritebackGetService.js` calls `persistLanding.applyWritebackGetPersistLanding` after validation. After a bridge save the host shows its "save parameter set" popup on the first visible dashboard tab, so the landing moves KDB to that tab, watches the popup (`persistPopupProbe.js`) and returns to the tab the user was on. Every wait is tied to `runtime.persistRestoreGeneration` and the abort controller `runtime.abortControllers.persistLanding`; `cancelWritebackGetPersistLanding` aborts it on destroy or a newer GET. `persistLoadingOverlay.js` shows the loading overlay while landing and keeps its handle in `runtime.getPersistLoadingHandle` (not in a runtime bucket, so a bucket reset during the wait cannot lose it).

Preconditions:

- properties/config must be available;
- tabs identity must be synced;
- for DOM/canvas/widget collectors, the tabs contract must provide a writeback-grade traversal barrier.

Tabs dependency:

- startup `tabs.mount()` traversal is not sufficient as a writeback barrier;
- before DOM/canvas/widget collection, `writebackGet` must use the public `tabs/traverse` dispatch target from `tabs-writeback-readiness-contractdelta.md` with `scope: "visibleDashboard"` and `includeHiddenDashboardTabs: false` (`writeback-get-visibleDashboard-contractdelta.md`);
- `tabs[]` still serialises every dashboard-role slot (hidden as `hide: 1`) from tabs state; that walk is not a traverse;
- page-scoped `filt` / `wgts` collect only `visible === true` slots; hidden content is skip-by-design;
- tabs guarantees only tab-level lazyload readiness, not widget-internal readiness; exception: `tabs/parameterSetActivateTabRequested` additionally awaits host `getWidgetWhenReady` for the tab's live widgets (`tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`);
- widget collectors need their own readiness/retry policy.

### 2.2 `writebackSet`

Public API:

```js
_KDB.services.writebackSet.restore(v3, status?, options?) -> Promise<RestoreResult>
_KDB.services.writebackSet.destroy() -> undefined
_KDB.services.writebackSet.whenUrlShareRestoreSettled() -> Promise<UrlShareStartupResult>
_KDB.services.writebackSet.presentPendingUrlShareMessage() -> undefined
```

Public `writebackSet` is `{ restore, destroy, whenUrlShareRestoreSettled, presentPendingUrlShareMessage }`. Named methods; no mixed `dispatch`.

`options` shape:

```js
{
  allowDegradedWidgetBinding?: boolean,
  timeoutMs?: number,
  source?: "bridge" | "test" | "internal"
}
```

`allowDegradedWidgetBinding` defaults to `false`. When `false`, required tranche-1 visualization binding failures make restore fail. When `true`, widgetVis may return `outcome: "degraded"` only with diagnostics for every affected widget.

`RestoreResult` shape:

```js
{
  ok: boolean,
  status: "notDefaultParamSet" | "default" | "defaultParamSet" | "defaultparamset" | "defaultparameterset" | "newDashboard",
  runId: number,
  outcome: "committed" | "cancelled" | "failed" | "degraded",
  baseline?: {
    kind: "postRestore" | "newDashboardReset",
    status: string,
    capturedAt: number,
    stateHash?: string,
    diagnostics?: Array<{ code, phase, message }>
  },
  diagnostics: Array<{ code, phase, message, details?, runId? }>,
  phases: Array<{
    name: RestorePhaseName,
    owner?: string,
    ok: boolean,
    degraded?: boolean,
    diagnostics?: Array<{ code, message, details? }>,
    missingShells?: number
  }>
}
```

`tabWidgetsEnsureRouted` may set `missingShells` (number, default 0). Leftover shells do not set `phase.degraded` (`writeback-restore-missingShells-contractdelta.md`).

`RestorePhaseName` enum:

```txt
status
validate
historyBegin
newDashboardReset
widgetReset
kdbControlRestore
headerRestore
footerRestore
tabsRestore
tabTargetResolve
filterClear
sichtRestore
singleSelectGlobalRestore
tabActivateForPageContext
singleSelectPageContextRestore
nativeMultiSelectRestore
sichtDownstreamVisibility
dienststelleRestore
singleSelectResync
tabActivateForWidgets
tabWidgetsEnsureRouted
widgetBaseRestore
widgetSettingsRestore
widgetTextRestore
widgetVisBinding
tabsPostRestoreTraverse
historyFinish
cleanup
```

Rules:

- `ok === true` requires every required tranche-1 field in §4.6 to be restored or owner-equivalent according to §4.6.1.
- `outcome: "degraded"` is allowed only for fields classified as unsupported, skipped by design or explicitly diagnostic-tolerant in §4.6. Package mismatch (`WRITEBACK_MAPPING_PACKAGE_MISMATCH`) is **not** §4.6-tolerant: SET `ok: false`, `outcome: "failed"`.
- `status === "newDashboard"` returns `ok === true` only when the reset/default branch completes without required owner reset failures.
- `baseline` is required when `outcome` is `"committed"` or `"degraded"`. It is optional for `"failed"` and `"cancelled"`.

Outcome matrix:

| `ok` | `outcome` | Meaning |
|---|---|---|
| `true` | `"committed"` | all required tranche-1 fields/reset defaults completed without degraded required behavior |
| `true` | `"degraded"` | restore completed with only diagnostic-tolerant degradation, skipped-by-design objects or `allowDegradedWidgetBinding === true` binding degradation |
| `false` | `"failed"` | required restore/reset behavior failed |
| `false` | `"cancelled"` | restore was cancelled or superseded before a committed baseline |

`ok: false` with `outcome: "degraded"` is invalid. `ok: true` with `outcome: "failed"` or `"cancelled"` is invalid.

Required owner outcome rules:

- Present `head` with header owner `{ ok: false }` makes `RestoreResult` `ok: false`, `outcome: "failed"`.
- Present `head` with unknown `head.icon` and header owner `{ ok: true, degraded: true }` makes `RestoreResult` `ok: true`, `outcome: "degraded"` (`WRITEBACK_HEADER_FIELD_UNSUPPORTED`). Copy owner diagnostics on `ok: true`.
- Present `foot` with footer owner `{ ok: false }` makes `RestoreResult` `ok: false`, `outcome: "failed"`.
- `WRITEBACK_FOOTER_HEADER_GUARD` with a successfully restored inactive header (`head.on: 0` or omitted header resolved inactive) makes `RestoreResult` `ok: true`, `outcome: "degraded"` because the footer request was inconsistent with the header guard.
- `WRITEBACK_FOOTER_HEADER_GUARD` caused by header restore failure makes `RestoreResult` `ok: false`, `outcome: "failed"`.
- Dienststelle all requested scopes applied makes `outcome: "committed"` unless another phase degraded/failed.
- Dienststelle fallback/partial restore on diagnostic-tolerant scopes makes `outcome: "degraded"`.
- Dienststelle required global scope cannot be applied or fallbacked makes `outcome: "failed"`.

Responsibilities:

- validate/normalize v3;
- reject unsupported schema versions;
- orchestrate restore through owner dispatch paths;
- set and clear restore flags;
- reset dashboard state before restore unless status says otherwise;
- restore filters before widgets;
- restore Dienststelle before widget visualization binding;
- reset or isolate history according to this contract;
- return structured success/failure diagnostics.

`writebackSet` must not import or call `writebackMap`. The caller/bridge decides whether mapping is required before restore.

Supported status values:

- `"notDefaultParamSet"`: direct restore;
- `"default"` / `"defaultParamSet"` / `"defaultparamset"` / `"defaultparameterset"`: wait for ready and respect URL `parameterId` precedence (all four spellings observed in legacy callers are equivalent);
- `"newDashboard"`: reset to empty/default dashboard state;

Reserved/deferred status:

- `"sichtChange"` is not supported in tranche 1. It may be promoted only after `widgetVis/syncDownstreamAfterSichtChangeRequested` and related downstream owner deltas are approved.

### 2.3 `writebackMap`

Public API:

```js
_KDB.services.writebackMap.toV3(raw, options?) -> V3ParameterSet
```

Responsibilities:

- detect source format;
- map v2 KDB2 writeback JSON to compact v3;
- map v0/v1 legacy payloads only when real DWH samples define those formats;
- build source mapping from the legacy payload where needed and target mapping from `core/config/mapping/parameterMap.js` through `kidIndex.js`;
- preserve unknown mapping tokens visibly in diagnostics rather than silently dropping them;
- end every mapping with `normalizeV3(...)` and `validateV3(...)`.

`writebackMap` is pure with respect to the dashboard: it must not mutate `_KDB.state`, `_KDB.runtime`, Cognos filters, tabs or widgets.

### 2.4 Canonical Schema Pipeline

Both producers must use the same terminal pipeline:

```txt
writebackGet: collectRawKdbState -> normalizeV3 -> validateV3 -> V3ParameterSet
writebackMap: mapRawLegacy     -> normalizeV3 -> validateV3 -> V3ParameterSet
```

Rules:

- `normalizeV3` owns default omission, object canonicalization, sentinel conversion and field ordering.
- `validateV3` owns version checks, per-kind widget field validation and required semantic fields.
- `detectSourceFormat` lives in `schema/`; the bridge and map service may call it, but the bridge must not implement mapping logic.
- `writebackSet` must call `normalizeV3` / `validateV3` defensively before restore, even if the caller claims the payload is already v3.
- Legacy same-package fast paths may skip expensive KID remapping, but they must still return normalized v3, never legacy v2.

## 3. Cognos Bridge

The bridge is thin business-logic-free wiring:

```js
window.top.WBParameterGetFunction() -> Promise<string> | string
window.top.WBParameterSetFunction(raw, status) -> Promise<RestoreResult>
```

Public `_KDB.services.writebackBridge` is `{ install, uninstall, isInstalled, destroy, readSelectedParameterSet, selectParameterSetById }`.

GET may reject. SET does **not** throw: failures resolve to `{ ok: false, outcome: "failed", diagnostics: [...] }` (same `RestoreResult` family as `writebackSet.restore`). Extra resolved fields are backward-compatible for fire-and-forget Cognos callers.

Bridge behavior:

1. `WBParameterGetFunction` calls `writebackGet.collect()` and returns `JSON.stringify(v3)`.
2. `WBParameterSetFunction` is a thin `bridgeSet` wrapper. Host SET lives in `bridge/runBridgeSetRestore.js` (discard confirm, then parse/`detectSourceFormat`):
   - if v3: calls `writebackSet.restore(v3, status)`;
   - if legacy: calls `writebackMap.toV3(raw)` and then `writebackSet.restore(v3, status)`;
   - if unsupported: returns `{ ok: false, outcome: "failed", diagnostics: [...] }` (does not throw).
3. Array-wrapped legacy payloads must be normalized before format detection.
4. The bridge must be installed only when services exist and dashboard readiness can be awaited or guarded.
5. The bridge must not implement `WritebackTabel` CRUD.
6. The bridge returns a `Promise` by default. A synchronous bridge mode is allowed only behind an explicit `options.syncBridge === true` compatibility flag.
7. Bridge errors must be surfaced as structured diagnostics:

```js
{
  code: "WRITEBACK_...",
  phase: "bridge|get|map|set|restore",
  runId: 0,
  message: "...",
  details: {}
}
```

Global install (as built, `bridge/hostGlobals.js`): both globals are stamped as KDB bridge anchors (`__kdbWritebackBridge`, `__kdbForeignPrevious`). `__kdbOwner` is defined as a getter, so the anchor on `window.top` does not keep a destroyed KDB instance alive; readers only test it against an instance. On uninstall a live previous KDB anchor (reverse destroy order) is restored; an anchor whose owner is disposed is skipped in favour of its foreign previous; if a newer boot already replaced our anchor the global is left alone.

### 3.1 Status Semantics

`writebackSet.restore(v3, status)` must normalize status before any restore work.

| Status | Reset scope | URL `parameterId` behavior | Loading target | Parallel restore policy |
|---|---|---|---|---|
| `"notDefaultParamSet"` | reset widgets, filters, tabs/config state covered by v3, and history baseline | ignored | dashboard restore loading | reject/cancel any in-flight restore before start |
| `"default"` / `"defaultParamSet"` / `"defaultparamset"` / `"defaultparameterset"` | same as direct restore, but only after dashboard ready | if URL `parameterId` is present, skip default restore and report diagnostic via `buildRestoreResult`: `outcome: "cancelled"`, **`ok: false`** (never `ok: true` + cancelled; never `WRITEBACK_SKIPPED_BY_DESIGN`). URL-id skip is unoccupied **only** when `!_activeRun`; if `_activeRun` is set, throw `WRITEBACK_RESTORE_CANCELLED` without `createRunContext` / run-id steal. | boot overlay while `urlShareBootOverlayActive`; SET loading on `.dashboardFrame` (`writeback-set-loading`, `Dashboard wird wiederhergestellt`) only on runs whose start returned a **truthy handle** (`loadingService-overlay-coverage-contractdelta.md`) | no-id default path keeps occupy + second-default **throw** without mutating the occupant |
| `"newDashboard"` | reset to empty dashboard defaults, clear widgets/filters/history, restore no saved widgets | ignored | dashboard reset loading | reject/cancel any in-flight restore before reset |
| `"sichtChange"` | unsupported tranche 1; reject with diagnostic unless promoted by a later owner delta | ignored | none | reject |

`status === "newDashboard"` is a reset branch, not a restore variant. It must not consume `v3.tabs`, `v3.filt`, `v3.wgts`, `head`, `foot`, `canv` or `sett` as saved restore state. The orchestrator may validate only the bridge envelope needed to call `restore(...)`, then executes §6.0.1 and returns a reset `RestoreResult`.

The bridge must reject `"sichtChange"` with `WRITEBACK_UNSUPPORTED_STATUS` until the later tranche is approved.

## 4. v3 Storage Schema

v3 is optimized for DWH storage with human-readable keys (PO-approved key redesign 2026-07-10): descriptive keys of at most 5 characters, semantic values, no Cognos-internal IDs, no display duplication, no defaults unless changed. All sections are plain objects/object arrays; positional tuples are not used.

Top-level shape:

```js
{
  v: 3,
  pkg: "Personal_KDB",
  canv: { w: 1800, h: 800 },
  sett: {},
  head: {},
  foot: {},
  filt: {},
  tabs: [],
  wgts: []
}
```

Top-level fields:

- `v` is required and must be `3`.
- `pkg` is required and stores the semantic package/profile key used for mapping validation, not a Cognos model id.
- `canv` is optional canvas size `{ w, h }` and must be omitted when equal to default.
- `sett` is optional dashboard/settings delta.
- `head` is optional top-header delta.
- `foot` is optional footer delta.
- `filt` is optional filters payload.
- `tabs` is optional tab payload.
- `wgts` is optional widget payload.

Omission rule:

- Optional fields must be omitted when empty/default.
- Empty arrays/objects should not be serialized unless their presence changes behavior.
- Display labels are not stored when they can be resolved from tables/config during restore.

Round-trip rule:

- The contract target is visual/functional equivalence, not byte-for-byte legacy parity.
- Every intentionally skipped field must be listed in a tolerance matrix before implementation.
- Fields required for accepted round-trip parity must be present in v3, derivable from owner defaults, or restored with a documented fallback diagnostic.

Canonical sentinel rules:

- Missing optional settings normalize to omission; a sentinel value (`null`, `""`, `"none"`, legacy `"default"`) on an optional key normalizes to key omission.
- Legacy `"none"`, `""`, `null` and default-like sentinels must normalize to one canonical representation per field.
- `dim`, `topn`, `type`, `bgcol`, `ctcol` and text style fields require explicit sentinel definitions in `v3Defaults.js`.

### 4.1 Canvas And Settings

`canv`:

```js
canv: { w: 1800, h: 800 }
```

Rules:

- numbers only, no `"px"` strings;
- omit when equal to defaults;
- restore through `kdbControl` settings path unless a future canvas owner dispatch exists.

`sett` stores only settings deltas from the default canvas settings (`core/config/canvasSettingsDefaults.js`, which `kdbControl/state/initialState.js` also uses):

```js
sett: {
  dash: {},  // dashboard settings delta
  panel: {}, // control panel settings delta
  newwg: {}  // defaults for newly created widgets
}
```

Exact key names inside `sett` follow the schema map in `schema/v3Defaults.js`. They must not mirror the entire `kdbControl` state tree.

#### 4.1.1 `sett` Key Catalog

`schema/v3Defaults.js` defines these keys. Unknown `sett` keys are invalid.

| v3 key | Owner state path | Type | Default source | Omit rule |
|---|---|---|---|---|
| `sett.dash.w` | `settings.dashboard.width` | number | `settingsDimensionConfig.dashboard.width.default` | omit when default |
| `sett.dash.h` | `settings.dashboard.height` | number | `settingsDimensionConfig.dashboard.height.default` | omit when default |
| `sett.dash.bg` | `settings.dashboard.backgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.dashboardBg` | omit when default |
| `sett.dash.hidWs` | `settings.dashboard.hideWidgetSettingsButtons` | `0 | 1` | `true` | omit when `1`; emit `0` when false ([kdbControl-widget-chrome-always-contractdelta.md](./_archive/kdbControl-widget-chrome-always-contractdelta.md)) |
| `sett.dash.devOn` | `settings.dashboard.isDeveloperMode` | `0 | 1` | `false` | omit when `0` |
| `sett.dash.hidSu` | *(retired)* previously `hideSuButtons` | `0 | 1` | ignore | GET never emits; SET accepts and **ignores** (do not migrate to `devOn`) |
| `sett.panel.bg` | `settings.controlPanel.backgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.panelBg` | omit when default |
| `sett.panel.btn` | `settings.controlPanel.buttonColor` | colour string/token | `settingsColorDefaults.colorInputs.panelButton` | omit when default |
| `sett.panel.act` | `settings.controlPanel.actionButtonColor` | colour string/token | `settingsColorDefaults.colorInputs.panelActionButton` | omit when default |
| `sett.panel.inBg` | `settings.controlPanel.innerBackgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.panelInnerBg` | omit when default ([kdbControl-inner-color-contractdelta.md](./_archive/kdbControl-inner-color-contractdelta.md)) |
| `sett.newwg.vis.w` | `settings.defaultsNew.visualization.width` | number | `settingsDimensionConfig.visualization.width.default` | omit when default |
| `sett.newwg.vis.h` | `settings.defaultsNew.visualization.height` | number | `settingsDimensionConfig.visualization.height.default` | omit when default |
| `sett.newwg.vis.bg` | `settings.defaultsNew.visualization.backgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.graphBg` | omit when default |
| `sett.newwg.txt.w` | `settings.defaultsNew.comment.width` | number | `settingsDimensionConfig.comment.width.default` | omit when default |
| `sett.newwg.txt.h` | `settings.defaultsNew.comment.height` | number | `settingsDimensionConfig.comment.height.default` | omit when default |
| `sett.newwg.txt.bg` | `settings.defaultsNew.comment.backgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.commentBg` | omit when default |

### 4.2 Header And Footer

Header:

```js
head: { on: 1, title: "Dashboard title", sub: "Subtitle", subOn: 1 }
// head.icon omitted when the logo is the default stem "Stadt-wien"
```

Footer:

```js
foot: { on: 0 }
```

Rules:

- `on` is `1` or `0`;
- `head.on: 1` maps to `header.status: "active"`;
- `head.on: 0` maps to `header.status: "removed"`;
- `header.status: "idle"` with default title/subtitle/icon state normalizes to omitted `head`;
- `head.title`, `head.sub`, `head.subOn` or `head.icon` without `head.on` is invalid in v3;
- `header.status: "removed"` normalizes to `{ on: 0 }`; title/subtitle/icon fields are omitted in tranche 1 unless PO later approves preserving removed-header draft text;
- `header.status: "active"` normalizes to `{ on: 1 }` plus non-default `title`, `sub`, `subOn` and `icon` fields;
- `head.title` maps to `header.titleText`;
- `head.sub` maps to `header.subtitleText`;
- `head.subOn: 1` maps to `header.subtitleStatus: "visible"` (only emitted for the edge case "subtitle active but text empty"; a non-empty `head.sub` implies a visible subtitle);
- `head.subOn: 0` maps to `header.subtitleStatus: "hidden"`;
- `head.icon` is a PNG filename stem (no path, no `.png`); maps to `header.iconKey`; omit when the stem is a default alias (`"Stadt-wien"` / `"Stadt-Wien"` / `"Default"`); unknown stem is diagnostic-tolerant (`WRITEBACK_HEADER_FIELD_UNSUPPORTED`) and restores the default logo;
- `foot.on: 1` maps to `footer.status: "active"`;
- `foot.on: 0` maps to `footer.status: "removed"`;
- `footer.status: "idle"` normalizes to omitted `foot`;
- omit default values.

### 4.3 Filters

Filter shape:

```js
filt: {
  sicht: "BW",
  dstl: {
    key: "Dienststelle_BW",
    glob: ["MAG"],
    byTab: {
      "2": ["00123456"]
    }
  },
  sels: [
    { key: "Jahr", vals: ["2026"] },
    { key: "Altersgruppe", tab: 2, vals: ["18-25"] }
  ],
  pcfs: [
    { nm: "Region", tab: 2, vals: [{ d: "Wien", u: "W" }, { d: "NÖ", u: "N" }] }
  ]
}
```

Fields:

- `sicht`: Sicht use value (global by definition).
- `dstl`: Dienststelle state.
- `dstl.key`: active Dienststelle filter key.
- `dstl.glob`: global Dienststelle semantic path/use values.
- `dstl.byTab`: page-context Dienststelle values keyed by tab index string.
- `sels`: single-select filter entries.
- `pcfs`: kale (unowned) native multi-select entries owned by `nativeMultiSelect` (global when `tab` omitted; page-context when `tab` present).

Single-select entry:

```js
{ key, inst?, tab?, vals }
```

Where:

- `key` is the semantic filter key from the central parameter mapping, e.g. `"Jahr"`;
- `inst` is an optional semantic instance key per `writeback-filterInstanceIdentity-contractdelta.md`;
- `tab` is absent for global scope, or a non-negative integer tab index for tab/page context;
- `vals` is an array of use values.

Kale native multi-select entry (`nativeMultiSelect`, formerly `pageContextPlain`):

```js
{ nm, tab?, vals: [{ d, u }, ...] }
```

Where:

- `nm` is the host item name (`getFilterItemLabel`), parallel to `sels.key`;
- `tab` is a non-negative integer tab index for page-context, or **omitted for global** (sels-pattern; P2 2026-08-15);
- `vals` is a non-empty array of `{ d, u }` pairs (multi-select). Both `d` and `u` are required non-empty strings.
- Identity for validate/dedup: `(tab === undefined ? "global" : String(tab)) + "|" + trimmed(nm)`.
- Do not put kale entries in `filt.sels`.

Filter rules:

- If `filt` is omitted in normal restore statuses, `writebackSet` must skip filter clear and all filter restore steps. Existing owner-default filter state remains owner-controlled.
- If `filt` is present but a subfield is omitted, only the present subfields participate in restore. Dispatch `nativeMultiSelect` clear/restore **only when `filt.pcfs` is present**. Omitted `filt.pcfs` must not clear kale values (global or page-context).
- Present `filt.pcfs` is the **complete** kale snapshot (sels-like) for **global + visible page scopes + hidden `tabIdx`s this payload names**: step 15 clears those scopes, then restore applies listed entries. Hidden page scopes **not** named in the payload must not be cleared (`writeback-get-visibleDashboard-contractdelta.md`). Items/scopes not in `pcfs[]` among that allow-list are left empty. `tab` omitted = global; `tab` present = that tab.
- Restore resolves concrete IDs via parameter mapping, filter definitions and tabs runtime mapping, **except `filt.pcfs`**: identity is `(tab === undefined ? "global" : tab) + "|" + trimmed(nm)`; SET looks up claimed host items by name + live scope (`isUnownedNativeMultiSelectItem`), not parameter mapping.
- Do not store display values, **except** `filt.pcfs[].vals[].d`: kale has no semantic mapping from which display can be derived, and Cognos `replaceFilterContext` requires `{ d, u }`.
- Do not store Cognos `sourceId`, `itemId`, `containerId` or `scopeId`.
- `validateV3` must reject `filt.dstl` without `filt.sicht`, because Dienststelle restore requires the active Sicht value to choose the active hierarchy.
- Dienststelle hierarchy validation is done only during restore.

### 4.4 Tabs

Tab list:

```js
tabs: [
  { name: "Tab 1" },
  { name: "Hidden tab", hide: 1 }
]
```

Tab entry:

```js
{ name, hide? }
```

Rules:

- If `tabs` is omitted in normal restore statuses, `writebackSet` must not call `tabs/parameterSetRestoreRequested`; existing tabs remain owner-controlled/default.
- The tab index is implied by array position.
- `name` is required when the tab exists.
- `hide` is optional; omit for visible tabs (default), `hide: 1` for hidden tabs.
- Persist the tab index, not Cognos `tabId`, `pageId`, `containerId` or `dropboxId`.
- Runtime restore may use `tabId` / `pageId` from `_KDB.api.tabs.getState()`.

Tabs contract dependency:

- Writeback must not infer that `traversal.lifecycle === "ready"` means all writeback-relevant tabs are collector-ready.
- For GET, hidden dashboard tabs are **shell-relevant** (`tabs[]` `hide: 1`) and **not content-relevant**. The GET traverse barrier is `scope: "visibleDashboard"` with `includeHiddenDashboardTabs: false` (`writeback-get-visibleDashboard-contractdelta.md`).
- For SET, `tabs/parameterSetActivateTabRequested` is required before page-context writes or widget restore on any hidden or not-canvas-ready dashboard tab **that the payload actually names** in `wgts` or page-`filt`. New GET payloads do not name hidden content; old payloads still may.
- Post-restore traversal may be needed after widgets/tabs are restored to trigger render for visible dashboard tabs.

### 4.5 Widgets

Widgets are stored as descriptive-key objects (PO-approved key redesign 2026-07-10). `widgetId` is not persisted.

Common keys for every kind:

```js
{ tab, x, y, w, h, kind, ...kindSpecific }
```

- `tab`: index into `tabs`.
- `x`, `y`, `w`, `h`: numeric layout values.
- `kind`: `"vis"` or `"txt"` in tranche 1. vis `type: "list"` is `kind: "vis"` required parity, not `"tbl"`. Kind `"tbl"` and helper kind `"topn"` are skipped by design (GET omit, no restore). vis key `topn` (topNChoice) stays live and is distinct from helper kind `"topn"`.

Visualization widget:

```js
{ tab, x, y, w, h, kind: "vis", code, type, dim?, topn?, vals?, grp?, iter?, wzbar?, vcap?, bgcol?, ctcol? }
```

vis `type: "list"` is a visType key on `kind: "vis"` (bucket `"List"`), same GET/SET path as bar/line. It is not kind `"tbl"`. vis `topn` is semantic TopN choice (`topNChoice`) and is distinct from helper kind `"topn"`. vis `vals` is explicit show-values (`0|1`); omit when inherit (`contracts/_archive/widgetVis-show-values-contractdelta.md`). `vals: 0` is a valid present value, not an omit sentinel. vis `grp` is explicit grouping grain (`stichtag` \| `jahr` \| `jahrStichtag` \| `stichtagProJahrH` \| `stichtagProJahrV`); omit when inherit; omit when the token is illegal for this `type`; a present token may equal that vis `defaultGrain` (`contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md` §13). vis `iter` is explicit iterator (`0|1`); omit when inherit; present `0` is explicit false, including hide types (`contracts/_archive/widgetSettings-vis-toggle-panel-wp2-contractdelta.md`). vis `wzbar` is explicit Zoomleiste (`0|1`); omit when inherit; present `0` is explicit false, including hide types (same WP2 delta). vis `vcap` is explicit Werte beschriftung (`0|1`); omit when inherit; present `0` is explicit false, including hide types (`contracts/_archive/widgetSettings-value-caption-contractdelta.md`). Do not splice `iter` / `wzbar` / `vcap` into the `vals` or `grp` sentence.

Text widget:

```js
{ tab, x, y, w, h, kind: "txt", text, fsize?, bgcol?, style? }
```

Kind `"tbl"` (Cognos List/datatable shells, pad dataTables, stub `widgetDataTable`) and helper kind `"topn"` (role `topNHelper`, pad `topN`) carry no field spec and are skipped by design. There is no `WIDGET_FIELDS.tbl` / `.topn`.

Rules:

- Store the semantic `code` (metricCode), not metric display, tooltip, table metadata or Cognos slot IDs.
- Store only committed user choices that cannot be derived from defaults. Omitted optional Family B keys (`dim`/`topn`/colours/`fsize`/`style`) = owner default. Family A `vals` / `grp` / `iter` / `wzbar` / `vcap`: omitted = inherit (not “equals catalog default”). `grp` is also omitted when the token is illegal for this `type`. Do not B-omit explicit `iter`/`wzbar`/`vcap` `0`.
- Store text `style` / background-style deltas when needed for visual parity.
- `bgcol` is owned by `widgetBase` shell/frame restore.
- `ctcol` is owned by `widgetSettings` / visualization content restore.
- Widget visualization binding is recomputed after restore by `widgetSettings` / `widgetVis`. BindingPlan rebuilds Cognos local filters after restore from `code` / `type` / `dim` / `topn` / empty-vis.
- `localFilters` is derived-only: not a v3 widget key. GET does not collect. Compact `[[filterKey, values]]` is a **rejected persist form**, not a future-on-by-default schema. v2 map omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`. A v3 widget that includes `localFilters` → `WRITEBACK_INVALID_V3_PAYLOAD`.
- Kind `"tbl"` and helper kind `"topn"` are skipped by design (GET omit, no restore). If a SET payload still carries those kinds, `validateV3` emits tolerant `WRITEBACK_WIDGET_KIND_UNSUPPORTED` and widgetBase skips (no claim, no `contentCreate`). Do not require GET to produce those kinds.
- Skip `writebackTable`, host widget, helper widgets and launchpad-only widgets (GET omit, no restore). Launchpad-only remains skip-by-design.

Rejected persist form for widget-local filters (documentation only; not a v3 widget key; do not persist; GET does not collect):

```js
[
  [filterKey, values]
]
```

where `filterKey` is semantic and `values` are use values.

#### 4.5.1 Widget Field Map

The widget schema is keyed, not positional. `validateV3` must validate kind, required keys and per-key type; unknown keys are invalid.

| Key | `"vis"` widget | `"txt"` widget |
|---|---|---|
| `tab` | tab index number, required | tab index number, required |
| `x`/`y`/`w`/`h` | numbers, required | numbers, required |
| `kind` | literal `"vis"` | literal `"txt"` |
| `code` | `metricCode` string, required | not allowed |
| `type` | canonical `visType` key, required | not allowed |
| `dim` | semantic dimension key, optional | not allowed |
| `topn` | semantic topN choice, optional | not allowed |
| `vals` | explicit show-values `0\|1`, optional | not allowed |
| `grp` | explicit grouping grain, optional | not allowed |
| `iter` | explicit iterator `0\|1`, optional | not allowed |
| `wzbar` | explicit Zoomleiste `0\|1`, optional | not allowed |
| `vcap` | explicit Werte beschriftung `0\|1`, optional | not allowed |
| `bgcol` | frame colour token/string, optional | shell colour token/string, optional |
| `ctcol` | content/settings colour token/string, optional | not allowed |
| `text` | not allowed | text string, required |
| `fsize` | not allowed | fontSize number, optional |
| `style` | not allowed | restyle string/object token, optional |

Validation rules:

- `tab` must be a non-negative integer and must resolve to an existing tab target after tabs restore/current tabs mapping; if `tabs` is present, `tab < tabs.length` is required before dispatch;
- optional Family B keys are omitted when the owner default applies (`dim`/`topn` "none", colours "#ffffff", `fsize` "automatic", `style` default). vis `vals` is a separate Family A clause: omit when inherit; present `0` is explicit false, not a sentinel. vis `grp` is a separate Family A clause: omit when inherit **or** when the token is illegal for this `type`; present equal-to-`defaultGrain` is explicit. vis `iter` / `wzbar` / `vcap` are separate Family A clauses: omit when inherit; present `0` is explicit false, including hide types; do not B-omit false. A present optional key must carry a valid non-sentinel value, never `null` (sync 2026-07-10: key omission replaces the former positional trailing-trim rules). Do not list `grp` inside the Family B parenthesis;
- sentinel values (`null`, `""`, `"none"`, legacy `"default"`, `fsize` `"automatic"`) on optional keys normalize to key omission in `normalizeV3`;
- future extensions add new optional keys; readers must treat absent keys as owner default (forward/backward compatible without version bump);
- `"tbl"` and `"topn"` widgets are skipped by design (GET omit, no `WIDGET_FIELDS.tbl` / `.topn`): if those kinds still appear in `wgts`, `validateV3` emits `WRITEBACK_WIDGET_KIND_UNSUPPORTED` without failing the payload, widgetBase skips the widget per §4.6/§6.6 (no claim/contentCreate), and `RestoreResult.outcome` becomes `"degraded"` at best.

### 4.6 Round-Trip Tolerance Matrix

This matrix is normative for `set(get())` acceptance. `writebackGet`, `writebackMap`, `normalizeV3` and `validateV3` must classify each field according to it.

| Area / field | Tranche 1 status | Required behavior |
|---|---|---|
| `v`, `pkg` | required | must be present and valid |
| `canv` canvas size | required when non-default | restore exact numeric width/height through owner path |
| `sett.dash`, `sett.panel`, `sett.newwg` | required when non-default and key is in `v3Defaults` | restore configured deltas; unknown keys fail validation |
| `head`, `foot` | required for header/footer state | restore enabled state, title/subtitle, non-default `head.icon` (PNG stem) and footer status through owner APIs; unknown `head.icon` stem → default logo + `WRITEBACK_HEADER_FIELD_UNSUPPORTED` (degraded, not failed) |
| `filt.sicht` Sicht | required | restore exact semantic use value or fail |
| `filt.dstl` Dienststelle | required when selected | restore owner-equivalent Dienststelle state with CP-3 restore-only validation; fallback/partial diagnostics allowed only by §6.5 and must make `RestoreResult.outcome` degraded or failed |
| `filt.sels` global/page filters | required for supported single-select filters | restore use values; display values are derived |
| `filt.pcfs` kale native multi-select | required when present | restore `{ d, u }` via `nativeMultiSelect`; complete snapshot among **global + visible** page scopes (clears those, then restores listed entries); hidden page scopes must not be cleared (`writeback-get-visibleDashboard-contractdelta.md`); `tab` omitted = global; missing dest host → skip + degraded; do not create host items; omit empty `pcfs` |
| leftover host filter kinds (not `filt.sicht` / `dstl` / `sels` / `pcfs`) | skipped by design | GET silent-omit, no restore, no fifth `filt` key; kale stays `pcfs`; special values stay `sels`; v2 map omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED` (row 5, unchanged); exclude from parity |
| `tabs` names/visibility | required | restore via tabs owner; enforce at least one visible tab; `set(get())` requires exact owner-equivalence when physical tab count is unchanged, while legacy/import payloads with fewer saved tabs may leave extra physical tabs untouched with diagnostics |
| `wgts` `"vis"` layout/kind/metric/vis settings | required | restore layout, metric, visType (including `type: "list"` as `kind: "vis"`, not `"tbl"`), dimension, vis key `topn` (topNChoice; distinct from helper kind `"topn"`) and colours within owner defaults |
| `wgts` `"txt"` content/style | required | restore text, font size, text colour, background/restyle if present |
| `localFilters` | derived-only | not a v3 widget key; BindingPlan rebuilds after restore; GET does not collect; compact `[[filterKey, values]]` is a rejected persist form, not a future-on-by-default schema; v2 map omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`; a v3 widget that includes `localFilters` → `WRITEBACK_INVALID_V3_PAYLOAD`; exclude from parity claim |
| `"tbl"` widgets (Cognos List/datatable shells, pad dataTables, stub `widgetDataTable`) | skipped by design | GET omit, no restore, no `WIDGET_FIELDS.tbl`; SET: if `kind: "tbl"` still appears in `wgts`, `validateV3` emits tolerant `WRITEBACK_WIDGET_KIND_UNSUPPORTED` and widgetBase skips (no claim/contentCreate); v2 map omit + `WRITEBACK_WIDGET_KIND_UNSUPPORTED` |
| helper `"topn"` widgets (role `topNHelper`, pad `topN`) | skipped by design | GET omit, no restore, no `WIDGET_FIELDS.topn`; distinct from vis key `wgts[].topn`; SET: if `kind: "topn"` still appears in `wgts`, `validateV3` emits tolerant `WRITEBACK_WIDGET_KIND_UNSUPPORTED` and widgetBase skips; v2 map omit + `WRITEBACK_WIDGET_KIND_UNSUPPORTED` |
| `writebackTable` widgets | skipped by design | GET omit, no restore; not part of visual parity |
| host/KDB container widget | skipped by design | GET omit, no restore |
| launchpad-only widgets | skipped by design | GET omit, no restore (GET silent-omit carve-out; see §4.6.1) |
| `KDB_CB_HeaderDraggable` / legacy header widgets | unsupported tranche 1 | header state uses `head`; legacy draggable header widgets emit diagnostic |
| Cognos IDs, DOM refs, `widgetId`, `scopeId` | never stored | derive at runtime or fail with target diagnostic |
| history/runtime/derived widgetVis state | never stored | recompute through owner APIs |

`set(get())` acceptance means equivalence only for rows marked `required` or `required when non-default`. Rows marked unsupported must be asserted as diagnostics in tests (map/GET where those fields are collected). Rows marked skipped by design use the GET silent-omit carve-out in §4.6.1; do not require GET to emit `WRITEBACK_SKIPPED_BY_DESIGN`. `localFilters` is derived-only / map-only, not a GET diagnostic.

#### 4.6.1 Assertion Profile

Round-trip tests must assert by owner state, not by raw JSON bytes alone.

| Assertion class | Fields | Test rule |
|---|---|---|
| Exact v3 value match | `v`, `pkg`, `canv`, `filt.sicht`, `filt.sels`, `filt.pcfs`, `tabs` when physical tab count is unchanged, widget layout, widget `code`, `type`, text content | after `set(get())`, owner selectors return equivalent normalized values |
| Owner-state equivalence | `sett`, `head`, `foot`, `filt.dstl`, widget sentinels, colours | compare normalized owner state against `v3Defaults`, current hierarchy/default rules and owner selectors, not raw omitted fields |
| Default restore by omission | omitted optional fields (including omitted `head.icon`) | absence in v3 means restore/keep owner default; tests assert owner default (`iconKey` `"Stadt-wien"`), not JSON presence |
| Diagnostic-required unsupported | legacy header widgets | get/map emits a fixed diagnostic code and parity tests exclude that field |
| Diagnostic-tolerant header icon | unknown `head.icon` stem | SET `ok: true`, `outcome: "degraded"`, `WRITEBACK_HEADER_FIELD_UNSUPPORTED`; logo falls back to default; GET of default still omits `head.icon` |
| Derived-only / map-only diagnostic | `localFilters` | not a skipped widget; GET does not collect; compact persist form is rejected; v2 map omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`; a v3 widget that includes `localFilters` fails validate (`WRITEBACK_INVALID_V3_PAYLOAD`); BindingPlan rebuilds after restore; exclude from parity |
| Skipped by design | `"tbl"` (Cognos List/datatable shells, pad dataTables, stub `widgetDataTable`), helper `"topn"` (role `topNHelper`, pad `topN`), launchpad-only widgets, `writebackTable`, host/KDB container widget, leftover host filter kinds (not `filt.sicht` / `dstl` / `sels` / `pcfs`) | GET silent-omit is an accepted leftover; tests must not require GET to emit `WRITEBACK_SKIPPED_BY_DESIGN` (optional later WP may emit it) or `WRITEBACK_FILTER_KIND_UNSUPPORTED` for leftover host filters. SET: if `kind` `"tbl"` / `"topn"` appears in `wgts`, `validateV3` emits tolerant `WRITEBACK_WIDGET_KIND_UNSUPPORTED` and widgetBase skips. Do not copy that SET-tolerant clause onto `filt` (unknown `filt.*` → `WRITEBACK_INVALID_V3_PAYLOAD`). Exclude the object from visual parity |
| Runtime-derived | Cognos ids, `widgetId`, DOM refs, `scopeId`, derived widgetVis state | never assert persisted value; assert successful runtime resolution or explicit target diagnostic |

Required diagnostics:

- unsupported widget kind: `WRITEBACK_WIDGET_KIND_UNSUPPORTED` (SET/validate when `kind` `"tbl"` / `"topn"` appears in `wgts`; v2 map for datatable/topN — not a GET emit requirement);
- unsupported widget local filters: `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED` (v2 map only; GET does not collect `localFilters`; a v3 widget that includes `localFilters` is `WRITEBACK_INVALID_V3_PAYLOAD`);
- skipped-by-design widget/object: `WRITEBACK_SKIPPED_BY_DESIGN` (GET silent-omit of `"tbl"` / helper `"topn"` / launchpad-only is an accepted leftover; optional later WP may emit this on GET);
- missing tab target: `WRITEBACK_TABS_TARGET_MISSING`;
- surplus physical tabs left untouched: `WRITEBACK_TABS_SURPLUS_UNTOUCHED`;
- tabs traversal failure: `WRITEBACK_TABS_TRAVERSAL_FAILED`;
- package mismatch: `WRITEBACK_MAPPING_PACKAGE_MISMATCH`;
- filter clear failure: `WRITEBACK_FILTER_CLEAR_FAILED`;
- non-Dienststelle filter restore/resync failure: `WRITEBACK_FILTER_RESTORE_FAILED`;
- Sicht restore/downstream failure: `WRITEBACK_SICHT_RESTORE_FAILED`;
- widget binding degraded: `WRITEBACK_WIDGET_BINDING_DEGRADED`;
- unsupported filter kind: `WRITEBACK_FILTER_KIND_UNSUPPORTED` (v2 map for unclassifiable v2 filter kinds — not a GET leftover-host emit requirement; GET leftover-host silent-omit is accepted leftover. GET still emits this code for dstl-without-sicht and singleSelect unsupported `scopeType`; those uses stay as-built);
- unknown `head.icon` stem: `WRITEBACK_HEADER_FIELD_UNSUPPORTED` (SET owner; default aliases are omitted on GET, not diagnosed);
- header apply/DOM failure: `WRITEBACK_HEADER_RESTORE_FAILED`.

### 4.7 Canonical Field Encodings

`schema/v3Defaults.js` is normative for defaults, omit rules, aliases and sentinels. `normalizeV3` must use this table and `validateV3` must reject unknown encodings.

| Field | Type / encoding | Source | Default / omit rule | Sentinel normalization |
|---|---|---|---|---|
| `v` | integer `3` | schema | required | no aliases |
| `pkg` | semantic package key string | runtime mapping index | required | trim; empty invalid |
| `canv` | `{ w, h }` numbers | kdbControl/canvas | omit when equal to defaults | `"1800px"` legacy -> `1800` during map only |
| `sett.dash/panel/newwg` | keyed delta objects from §4.1.1 | kdbControl settings | omit empty/default keys | unknown key invalid |
| `head.on` | `0 | 1` | `header.status` | omit only when `idle` with default title/subtitle | `"active"` -> `1`, `"removed"` -> `0`, `"idle"` -> omit; `head.title/sub/subOn` without `head.on` invalid |
| `head.title` | string | `header.titleText` | omit empty/default | `null`/`undefined` -> omit |
| `head.sub` | string | `header.subtitleText` | omit empty/default | `null`/`undefined` -> omit |
| `head.subOn` | `0 | 1` | `header.subtitleStatus` | omit if owner default | `"visible"` -> `1`, `"hidden"` -> `0` |
| `head.icon` | string PNG stem | `header.iconKey` | omit default aliases (`Stadt-wien` / `Stadt-Wien` / `Default`) and when `on !== 1` | `null` / `""` / `"none"` drop in `normalizeV3`; `.png` strip at owner / GET / v2 map (not in `normalizeHeaderLike`); `"Default"` / `"Stadt-Wien"` / `"Stadt-wien"` stay as default aliases, not omission sentinels; unknown stem → default + `WRITEBACK_HEADER_FIELD_UNSUPPORTED` |
| `foot.on` | `0 | 1` | `footer.status` | omit when `idle` | `"active"` -> `1`, `"removed"` -> `0`, `"idle"` -> omit |
| `filt.sicht` | semantic use value string | Sicht state / legacy filter | required if Sicht exists | aliases normalize through mapping index |
| `filt.dstl.key` | `"Dienststelle_BW" | "Dienststelle_DEZPV"` | Dienststelle state / legacy filter | required if `filt.dstl` exists | legacy labels normalize via mapping |
| `filt.dstl.glob`, `filt.dstl.byTab[*]` | arrays of semantic use values | Dienststelle snapshot / legacy hierarchy | omit empty scopes | display labels resolved during restore, not stored |
| `filt.sels[]` | `{ key, inst?, tab?, vals }` | instance inventory + live scope match | omit unsupported/empty filters with diagnostic; `tab` absent = global; page-context entries require fresh inventory + liveScope evidence; unmapped scope → diagnostic | legacy scope container -> `tab: <tabIdx>` during map |
| `filt.pcfs[]` | `{ nm, tab?, vals: [{ d, u }, ...] }` | host enumerate of unowned global + page-context items (not cold `byScope`) | omit empty items; omit `pcfs` if none; `tab` omitted = global; missing dest host on SET → skip + degraded | kale `pageContextFilterObjArr` → `pcfs` with `tab`; legacy global kale → `pcfs` without `tab` (`writebackMap` T2.1) |
| `tabs[]` | `{ name, hide? }` | tabs state | omit `hide` when default visible | booleans normalize to `hide: 1` / omission |
| `wgts[].code` | semantic metricCode string | widgetVis derived metric identity (`derived.code`); restored through the step-24 `contentCreate` orchestration (sync 2026-07-12) | required for `"vis"` | display/tooltips never stored |
| `wgts[].type` | canonical visType key | widgetSettings snapshot | required for `"vis"` | Cognos vis ids map to canonical key |
| `wgts[].dim` | semantic dimension key | widgetSettings snapshot | omit when owner default | `"none"`, `""`, `null` -> omit |
| `wgts[].topn` | semantic topN choice | widgetSettings/topN | omit when owner default | `"none"`, `""`, `null` -> omit |
| `wgts[].vals` | explicit show-values `0\|1` | widgetSettings `showValues` | omit when inherit (never overrode) | present `0` is explicit false; do not treat `0` as omit |
| `wgts[].grp` | F grain string | widgetSettings `grouping` | omit inherit **or** illegal-for-`type` | `"inherit"` / junk fail validation; present equal-to-`defaultGrain` is explicit |
| `wgts[].bgcol` | frame/shell colour token/string | widgetBase frame (vis) / widgetSettings -> widgetBase shell (txt) | omit when default | normalize equivalent hex/case |
| `wgts[].ctcol` | content colour token/string | widgetSettings/content | omit when default | normalize equivalent hex/case |
| `wgts[].text` | text string | widgetText | required for `"txt"` | `null` -> empty string only if owner accepts |
| `wgts[].fsize` | fontSize number | widgetSettings | omit when default (owner token `"automatic"`) | non-numeric owner token -> omit; invalid number fails validation |
| `wgts[].style` | restyle token/object | widgetSettings | omit when default | owner delta defines exact shape |

Minimum fixtures required before implementation:

- minimal v3: `{ "v": 3, "pkg": "<current>" }`;
- full supported v3: canvas/settings/header/footer, Sicht, Dienststelle, one global single-select, one page-context single-select, two tabs, one `"vis"` widget and one `"txt"` widget;
- unsupported fixture: a v3 widget with `localFilters` fails validate (`WRITEBACK_INVALID_V3_PAYLOAD`); `"tbl"` / `"topn"` entries still validate with tolerant `WRITEBACK_WIDGET_KIND_UNSUPPORTED`. Do not require GET to produce those kinds.

## 5. Mapping Config

`KDB3/js/core/config/mapping/parameterMap.js` is the runtime source of truth for current package mapping. `KDB3/js/core/config/mapping/kidIndex.js` is the canonical writeback index/schema helper for that frozen map.

Development/test fixtures may be derived from (not a runtime import):

```txt
_____________KDB3API/__savedProperties/parameterMappingId.js
```

The grouped target index should be built at startup or service initialization:

```js
{
  package: {
    pkg: "Personal_KDB",
    datasourceName: "...",
    datasourcePrefix: "...",
    widgetDatasourceId: "..."
  },
  filters: {
    Sicht: { itemId: "...", useBase: "BW" },
    Jahr: { itemId: "...", useBase: "..." }
  },
  dienststelle: {
    BW: {
      filterItemId: "...",
      levels: {
        level001: "...",
        level002: "..."
      }
    },
    DEZPV: {
      filterItemId: "..."
    }
  },
  widget: {
    slots: {},
    localFilters: {}
  },
  rawKid: {}
}
```

Rules:

- `rawKid` must keep the original KID map for debugging and legacy universalize/de-universalize helpers.
- Service code should prefer grouped semantic lookups over scanning the raw flat map.
- Missing required mapping keys are a config error for writeback phases that need them, not a recoverable silent fallback.
- `alternativeDatasource_*`, duplicate spelling variants (`Sicht`/`SICHT`, `Dienstverhältnis`/`Dienstverhaeltnis`) and environment-specific widget datasource ids must be preserved or explicitly normalized.
- Cross-package mapping uses a source map derived from the saved/legacy v2 payload and a target map derived from `parameterMap.js`.
- Unknown legacy KID tokens should remain visible in diagnostics.

Index rebuild/sync rules:

- the grouped index is built once from the frozen `parameterMap.js` (the map does not change at runtime);
- `writebackMap.toV3(...)` must verify required keys / package via `kidIndex.js` before mapping;
- `writebackSet.restore(...)` must verify the runtime package/index before resolving semantic v3 fields;
- there is no Cognos property refresh of this map; package changes are a JS config edit;
- `pkg` in v3 must match the runtime package key derived from the current target mapping for direct restore;
- package mismatch during direct v3 restore fails with `WRITEBACK_MAPPING_PACKAGE_MISMATCH` (`outcome: "failed"`). Comparison is SET `validateRestorePayload` + `kidIndex.resolveRuntimePackageKey`; SET must not import or call `writebackMap`. There is no map/migration escape hatch;
- `__savedProperties/parameterMappingId.js` is never a runtime import.

Required KID categories:

- datasource/package keys;
- global/page filter item keys;
- filter use-value bases;
- Dienststelle BW/DEZPV filter keys and hierarchy level use bases;
- widget datasource keys;
- metrics table key;
- widget local filter keys;
- visualization slot keys.

## 6. Restore Orchestration

Target sequence for `writebackSet.restore(v3, status)`:

1. Normalize status and reject unsupported `"sichtChange"`.
   After this step, **before** overlap occupancy: if `statusKind === "default"` and URL `parameterId` is non-null, then `_activeRun` set → throw overlap (no skip `createRunContext`); else unoccupied skip return (`ok: false`, `outcome: "cancelled"`, `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE`). Stop. Do not occupy, load, `historyBegin`, or ready-wait.
2. Reject/coalesce/cancel overlapping restores according to §3.1.
   Then if `statusKind === "default"` and URL `parameterId` was null: abortable ready-wait. Only `lifecycle === "ready"` continues. Then current steps 3+ (`executeRestoreRun`).
3. Start loading / restore diagnostics.
4. Set `_KDB.runtime.writeback.parameterSetRestoreActive = true`.
5. Create `parameterSetRestoreRunId`.
6. Call `_KDB.services.history.beginWritebackRestore({ runId, source: "writebackSet", status })`.
7. If `status === "newDashboard"`, execute §6.0.1 and return; do not run normal-restore steps 8-29.
8. Validate and normalize v3.
9. Reset dashboard widgets through `widgetBase/parameterSetResetRequested`.
10. Restore canvas/settings through `kdbControl`; configuration UI sync belongs to this owner step.
11. Restore header and capture `headerStatus` from the header owner result or public selector.
12. Restore footer with the captured `headerStatus`.
13. If `v3.tabs` is present, restore tab targets, names and visibility through the tabs owner API before any tab-scoped filter/widget restore; if `v3.tabs` is omitted, skip tabs restore and read current tab targets from tabs owner state.
14. Resolve tab indexes to runtime `tabId` / `pageId` / scope aliases.
15. If `v3.filt` is present, empty filters through approved filter-owner APIs; if `v3.filt` is omitted, skip filter clear and filter restore.
16. If `v3.filt.sicht` is present, restore Sicht.
17. If `v3.filt.sels` has global entries, restore non-Dienststelle global filters.
18. If `v3.filt.sels` has page-context entries or `v3.filt.dstl.byTab` is present or `v3.filt.pcfs` has entries with `tab`, pre-activate/writeback-ready tab targets needed by page-context filters, including hidden dashboard tabs.
19. If `v3.filt.sels` has page-context entries, restore non-Dienststelle page-context filters using resolved tab scopes. Then, if `v3.filt.pcfs` is present, restore kale filters through `nativeMultiSelect/parameterSetRestoreRequested` (after sels page-context, before Sicht downstream; global `pcfs` entries need no tab pre-activate).
20. If `v3.filt.sicht` is present, apply Sicht downstream visibility.
21. If `v3.filt.dstl` is present, restore Dienststelle using a new restore-only entry point.
22. If `v3.filt` is present, re-sync/replay single-select selections through `singleSelect/parameterSetResyncRequested`.
23. Pre-activate/writeback-ready tab targets needed by widget restore, including hidden dashboard tabs; after each activation, await `widgetBase/ensureTabWidgetsRouted` for that tab (§6.6, `widgetBase-lazyLaunchpadRouting-contractdelta.md`) so pre-restore widgets on lazily loaded tabs are parked on the launchpad before widget restore.
24. Restore widget shells/layout grouped by tab index through `widgetBase`.
25. Apply widget settings batch through `widgetSettings`.
26. Restore text widget content through `widgetText`.
27. Trigger widgetVis binding pipeline through `widgetVis`, **per tab** (`writeback-step27-bindPerActiveTab-contractdelta.md`, text sync 2026-10-06): for each tab with vis entries in `widgetCorrelation` (first-seen order), first `tabs/parameterSetActivateTabRequested` with `forceShow: true` / `restoreActiveTab: false` (`required: true`), then `widgetVis/parameterSetBindingRequested` for that tab's entries only (`required: false`); after all tabs, any failed bind sets `abortedByOwner` and aborts once. TopN helper queries thereby run on the shown page, as at startup. The deferred render wait stays (binding never awaits Cognos render events; the visible render is owned by step 28 — bugfix sync 2026-07-13).
28. Trigger post-restore tab traversal/render for dashboard tabs represented in v3 (`waitFor: "widgetsRendered"`: per tab an explicit render + bounded render-complete wait via `widgetBase/renderTabWidgetsRequested`; lands on the first visible dashboard tab — see §6.4 render semantics, bugfix sync 2026-07-13).
29. Reset history stack or replace it with a restore baseline through `_KDB.services.history.finishWritebackRestore({ source: "writebackSet", runId, outcome, baseline })`.
30. Clear restore flags and finish loading.

### 6.0.1 `newDashboard` Reset Branch

`status === "newDashboard"` is a reset-only flow.

Required sequence after common steps 1-6:

1. Reset widgets through `widgetBase/parameterSetResetRequested` with `{ status, runId, skipHistory: true }`.
2. Empty filters through owner `*/parameterSetClearRequested` actions with `{ status, runId, skipHistory: true }` for `sicht`, `singleSelect`, `dienststelle`, and `nativeMultiSelect` (`nativeMultiSelect` is always included in this reset loop; `required: false`). Kale stays empty from that clear. Then dispatch the existing public `sicht/syncRequested` (same startup path as mount; `required: false`). That commit uses source `sichtStartup` (first enabled BW, then DEZPV) and notifies Dienststelle, which writes the default table row because the host is empty. Do not fake a manual Sicht click. Do not wipe specialSingleSelect parked memory from writeback. A skipped or failed startup is a non-fatal diagnostic.
3. Reset tabs to owner defaults through `tabs/parameterSetResetRequested`; do not restore `v3.tabs`.
4. Reset canvas/settings through `kdbControl` owner defaults; do not restore `v3.canv` or `v3.sett`.
5. Reset header/footer through owner defaults; do not restore `v3.head` or `v3.foot`.
6. Finish history with a reset baseline through `_KDB.services.history.finishWritebackRestore({ source: "writebackSet", runId, outcome, baseline })`, where `outcome` matches reset success, failure or cancellation.
7. Clear restore flags and finish loading.

No widget restore, widget settings batch, text restore, widgetVis binding, Dienststelle restore, singleSelect restore or post-restore traversal may run in this branch. Any supplied saved v3 content is ignored for restore purposes.

Failure rule:

- owner reset/default failure aborts the reset branch unless that owner can guarantee the affected state is already empty/default and returns a non-fatal diagnostic;
- a tolerated reset failure must still appear in `RestoreResult.diagnostics`;
- `ok === true` requires the visible dashboard result to be empty/default, not merely that dispatches completed.

History decision:

- restore should reset history by default;
- writeback restore must not push one history step per internal dispatch;
- owner replay helpers may be reused with `skipHistory` / `isHistoryReplay` style flags.

History orchestration:

- call `_KDB.services.history.beginWritebackRestore({ runId, source: "writebackSet", status })` at step 6 before any owner dispatch, including reset/clear/default dispatches;
- call `_KDB.services.history.finishWritebackRestore({ source: "writebackSet", runId, outcome, baseline })` at step 29 in the normal branch or §6.0.1 step 6 in the `newDashboard` branch;
- every owner dispatch between begin/finish receives `skipHistory: true`;
- if restore is cancelled/failed, call `finishWritebackRestore` with the matching outcome before clearing restore flags;
- if restore is cancelled/failed (including live `abortedByOwner` before the public outcome map), best-effort restore the pre-run user tab through `tabs/parameterSetAbortLandingRequested` (`writeback-t2-item5b-contractdelta.md`). Failure of that click must not change `RestoreResult.outcome`. Success landing remains the post-restore traverse (first visible).

Runtime restore state:

```js
_KDB.runtime.writeback = {
  parameterSetRestoreActive: false,
  parameterSetRestoreActiveCount: 0,
  parameterSetRestoreRunId: 0,
  pendingRunId: null,
  skipDiscardConfirmOnce: false,      // honored + cleared by writeback-discard-confirm-contractdelta.md
  lastConfirmedParameterSetId: null,
  discardConfirmInFlight: false,
  pendingUrlShareMessage: null,       // { parameterId, copy: "missingId"|"hostListUnready" } | null
  pendingRestoreFailure: false,
  urlShareRestoreWaiter: null,
  urlShareStartupPromise: null,
  urlShareBootOverlayActive: false,
  abortControllers: {},               // readyWait, optionWait, urlShareStartup
  timers: {},                         // readyWait, optionWait
};
```

Rules:

- overlapping restores must be rejected or cancel the previous run explicitly;
- every async owner completion that can mutate restored state must check the current `parameterSetRestoreRunId`;
- `parameterSetRestoreActiveCount` exists for nested/parallel owner work and must return to `0` before flags clear;
- history, widget, Dienststelle and widgetVis gates must receive `skipHistory` / `runId` / restore-source metadata where their owner contracts require it.

### 6.1 Widget Reset

Required owner-backed reset entry point:

```js
_KDB.api.widgetBase.dispatch({
  type: "widgetBase/parameterSetResetRequested",
  payload: {
    source: "writebackSet",
    runId,
    status,
    skipHistory: true
  }
})
```

Contract:

- `writebackSet` must await this action before normal widget restore starts;
- `writebackSet` must not directly remove widget DOM, widget reducer state, launchpad entries, committed settings, text content or widgetVis binding state;
- `widgetBase` owns reset orchestration across widgetBase/widgetSettings/widgetText/widgetVis through owner-approved paths;
- `status === "newDashboard"` uses this action and then stops before any `v3.wgts` restore;
- reset failure aborts restore unless the widget owner returns a non-fatal diagnostic and guarantees the affected widget is no longer active in layout/settings/text/binding state.

### 6.2 kdbControl, Header And Footer Restore

Required kdbControl entry point:

```js
_KDB.api.kdbControl.dispatch({
  type: "kdbControl/parameterSetRestoreRequested",
  payload: {
    canvas: v3.canv,
    settings: v3.sett,
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
})
```

Required header entry point:

```js
_KDB.api.header.dispatch({
  type: "header/parameterSetRestoreRequested",
  payload: {
    header: v3.head,
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
})
```

Required footer entry point:

```js
_KDB.api.footer.dispatch({
  type: "footer/parameterSetRestoreRequested",
  payload: {
    footer: v3.foot,
    headerStatus,
    source: "writebackSet",
    runId,
    skipHistory: true,
    status
  }
})
```

Contract:

- `canv` and `sett` restore must run before tab/filter/widget restore;
- unknown `sett` keys fail validation before dispatch;
- owner APIs must define how configuration UI controls are synced after restore;
- `kdbControl/parameterSetRestoreRequested` owns only `canv`, `sett` and configuration UI sync;
- `header/parameterSetRestoreRequested` maps `head` to `header.status`, `titleText`, `subtitleText` and `subtitleStatus`;
- `footer/parameterSetRestoreRequested` maps `foot` to `footer.status` and must respect the header guard from `footer.md`;
- header restore must complete before footer restore; `writebackSet` passes `headerStatus` to footer from the header result or public header selector;
- for `status === "newDashboard"`, these owners ignore saved restore fields and apply owner defaults/empty state;
- failure in canvas/settings restore aborts SET unless status is `"newDashboard"` and defaults can be applied.

### 6.3 Filter Restore Dispatch Table

WritebackSet owns sequencing only. Filter owners own state, Cognos writes, history suppression and view sync.

| Step | Owner | Action | Payload minimum | Failure mode |
|---|---|---|---|---|
| clear | `sicht`, `singleSelect`, `dienststelle`, `nativeMultiSelect` and owner-approved tranche-1 filter owners only | `*/parameterSetClearRequested` | `{ runId, source: "writebackSet", skipHistory: true, status }` plus `tabIdxToScopeId` when page-context owners need it | abort with `WRITEBACK_FILTER_CLEAR_FAILED` if owner clear fails, except `status === "newDashboard"` may continue with non-fatal diagnostic + reset defaults. Dispatch `nativeMultiSelect` clear **only when `v3.filt.pcfs` is present** (omitted `pcfs` must not clear kale). |
| Sicht | `sicht` | `sicht/parameterSetRestoreRequested` | `{ sicht: v3.filt.sicht, runId, skipHistory: true, status }` | abort with filter diagnostic |
| Single-select/global | `singleSelect` | `singleSelect/parameterSetRestoreRequested` | `{ filters: v3.filt.sels entries without tab, phase: "global", tabIdxToScopeId, runId, skipHistory: true }` | per-filter diagnostic; abort only for required filters |
| Page-context filters | `singleSelect` / relevant filter owner | same restore action, scoped entries | `{ filters: v3.filt.sels entries with tab, phase: "pageContext", tabIdxToScopeId, runId, skipHistory: true }` | fail target missing with `WRITEBACK_TABS_TARGET_MISSING` |
| Kale native multi-select (`filt.pcfs`) | `nativeMultiSelect` | `nativeMultiSelect/parameterSetRestoreRequested` | `{ filters: v3.filt.pcfs, tabIdxToScopeId, runId, skipHistory: true }` — no `inventoryGeneration`, no `phase`; `tab` omitted = global | missing dest host item → owner `{ ok: true, degraded: true }` + `WRITEBACK_SKIPPED_BY_DESIGN` (orchestrator must **not** set `degradedAllowed`); hard host-write failure `{ ok: false }` aborts with `WRITEBACK_FILTER_RESTORE_FAILED`; missing **page** tab target `{ ok: false }` aborts with `WRITEBACK_TABS_TARGET_MISSING` |
| Sicht downstream visibility | `sicht` plus downstream owners | `sicht/parameterSetDownstreamVisibilityRequested` | `{ sicht: v3.filt.sicht, dstlWillFollow: v3.filt.dstl !== undefined, runId, skipHistory: true }` | abort before Dienststelle restore |

`dstlWillFollow` (added 2026-07-12, PO-approved): when `true`, the Sicht owner must not trigger the full Dienststelle notification because step 21 (`dienststelle/parameterSetRestoreRequested`) will realign Dienststelle itself; when `false` (restore without `v3.filt.dstl`), the Sicht owner must trigger the full Dienststelle downstream notification (history-suppressed) so Dienststelle realigns to the restored Sicht.
| Post-Dienststelle resync | `singleSelect` | `singleSelect/parameterSetResyncRequested` | `{ tabIdxToScopeId, runId, source: "writebackSet", skipHistory: true }` | abort before widget restore for required-filter failure |

These action names are contract targets. If owner modules choose different names, the owner deltas must define an equivalent public dispatch with the same semantics.

No generic "other filter owner" clear is approved by this contract beyond the owners named in the table (`sicht`, `singleSelect`, `dienststelle`, `nativeMultiSelect`). Kale is already `filt.pcfs`; special-right **values** (Personengruppe / Dienststellenleitung) are already `filt.sels` (policy stays `specialSingleSelect/syncRequested`, not a fifth owner). After that restore sync, SET may stash `specialSingleSelectRestoreHint` from the ack; overlay info is the generic `pendingRestoreInfo` blob (`specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md`). Leftover host kinds are skip-by-design (`writeback-t2-item3-contractdelta.md`). Only a **new claimed** filter owner needs an explicit clear/restore delta.

### 6.4 Tabs Restore

Required owner entry point:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetRestoreRequested",
  payload: {
    tabs: v3.tabs,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
})
```

Contract:

- restore physical tab targets before widget restore;
- apply tab names and visibility through tabs owner state/effects, not direct writeback DOM mutation;
- ensure at least one dashboard tab is visible;
- provide a `tabIdx -> { tabId, pageId, scopeId? }` lookup for filter and widget restore;
- `tabs/resolveFilterScopeTargets` is the canonical live scopeId↔tabIdx map used by GET (`workflows/parameterSet/get/collectors/collectFilters.js` (filter target resolution)) and SET (`filterRestoreTargets.js`), complementing the restore-run `tabTargets`;
- handle saved tab-count mismatch with diagnostics;
- support hidden dashboard tabs without making hidden tab buttons permanently visible;
- expose `tabs/parameterSetActivateTabRequested` for hidden or not-canvas-ready tabs before page-context writes and widget restore;
- saved tab count greater than physical/creatable tab count fails with `WRITEBACK_TABS_TARGET_MISSING`;
- saved tab count lower than physical tab count restores the first `N` saved targets and leaves remaining physical tabs untouched with diagnostics.

Post-restore traversal entry point:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/postParameterSetRestoreTraverseRequested",
  payload: {
    scope: "visibleDashboard",
    includeHiddenDashboardTabs: false,
    restoreActiveTab: true,
    source: "writebackSet",
    runId
  }
})
```

The default post-restore scope is `"visibleDashboard"`: dashboard-role tabs with `visible === true` after tabs restore (snapshot entries without `hide: 1`, plus surplus host slots that remain visible). Hidden dashboard tabs are not clicked in this pass. Widget and page-context restore still activate hidden tabs in steps 18/23 via `tabs/parameterSetActivateTabRequested` **when the payload names those tabIdxs**. GET no longer clicks hidden tabs and no longer collects hidden content; `tabs[]` still emits `hide: 1` shells (`writeback-get-visibleDashboard-contractdelta.md`).

Render semantics (bugfix sync 2026-07-13): the post-restore traversal runs the tabs traverse with `waitFor: "widgetsRendered"` on **visible dashboard tabs only** — per activated tab the widgets-owned readiness API (`widgetBase/renderTabWidgetsRequested`) renders that tab's onCanvas vis widgets and waits (bounded, 2.5s cap per widget) for render completion, legacy `traverseTabsSafely` parity. This is what makes step-27 bindings visually render on those visible tabs: Cognos paints visualizations only on the active page, so widgets bound while their tab was inactive stay empty until this traversal (previously they stayed empty until a manual tab switch). Hidden dashboard tabs are not visited here; they may stay unpainted until later shown. Correspondingly, step-27 binding itself uses a deferred render wait (`renderWait.waitForComplete: false` toward `widgetBindingApply`): awaiting render events on inactive tabs cannot succeed and burned the full 12s vis timeout per widget, sequentially. Since 2026-10-06 step 27 shows each vis tab before binding it (`writeback-step27-bindPerActiveTab-contractdelta.md`); the deferred render wait is kept deliberately (P3: dropping it would re-add up to 12s per widget on top of step 28), so step 28 remains the owner of the visible render and of the landing tab. The traversal lands on the first visible dashboard tab (`restoreTabIndex`, legacy parity) instead of the natively captured `activeIndex`, which at that point reflects the last restore-activated tab.

Pre-widget activation entry point:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetActivateTabRequested",
  payload: {
    tabIdx,
    source: "writebackSet",
    runId,
    skipHistory: true,
    includeHiddenDashboardTabs: true,
    restoreActiveTab: false
  }
})
```

This action is required before widget/page-context restore for any tab target that is hidden or not yet canvas-ready. It must temporarily activate the requested dashboard tab without persistent visibility mutation. Tabs whose inner frame is already present are acknowledged without a physical click (`skippedActivation: true`); the skip criterion is the tab-scoped inner-frame predicate of `tabs-inner-frame-skip-empty-snapshot-contractdelta.md` §3, not `hasBeenActivated` (text sync 2026-10-06; supersedes the 2026-07-13 `hasBeenActivated` skip). `isCanvasLoaded` is not a valid skip signal (it is also set for never-rendered lazy tabs). Exception: payload `forceShow: true` (step 27 only, `writeback-step27-bindPerActiveTab-contractdelta.md` P1) bypasses the inner-frame skip and always clicks, because step 27 needs the tab actually showing, not only its page DOM present; steps 18/23 omit it and keep the skip. On both the skip and the click path a successful activate additionally means every live widget of that tab reported `getWidgetWhenReady` (max 5000 ms; not-ready widgets are listed as `TABS_LIVE_WIDGETS_READY_TIMEOUT` diagnostics, never an abort) per `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md` — this is the barrier before step-19 page-context writes and step-23 widget restore.

Orchestrator rule:

- for every `filt.sels` entry with `tab`, every `filt.pcfs[].tab`, every key in `filt.dstl.byTab`, and every `wgts` entry whose tab target is hidden or not canvas-ready, `writebackSet` must await `tabs/parameterSetActivateTabRequested` before dispatching the owner restore that writes to that tab.

### 6.5 Dienststelle Restore

Required new entry point:

```js
_KDB.api.dienststelle.dispatch({
  type: "dienststelle/parameterSetRestoreRequested",
  payload: {
    dienststelle: v3.filt.dstl,
    activeSichtValue,
    tabIdxToScopeId,
    source: "writebackSet",
    runId,
    skipHistory: true,
    options: {
      mapOldToNew: true,
      fallbackToDefault: true,
      hierarchyWaitTimeoutMs: 60000
    }
  }
})
```

Contract:

- input is derived from v3 `filt.dstl` plus active Sicht;
- page-context keys in `filt.dstl.byTab` are resolved from tab index to runtime scope ids before Cognos writes;
- BW old labels are handled in three phases: `writebackMap` pre-normalizes legacy payloads, `dienststelle/parameterSetRestoreRequested` validates via `bwOldToNewMap.js`, and direct v3 restore may map old labels only on this restore path with diagnostics;
- waits for hierarchy/default table data only on this restore path;
- validates saved values against current hierarchy semantics;
- applies BW old-to-new mapping where needed;
- applies valid scopes through existing Dienststelle/Cognos scope helpers;
- reconciles confirmed Dienststelle state;
- does not push history;
- returns applied/fallback/missing diagnostics.

Fallback rules (`writeback-dienststelle-restore-ux-contractdelta.md`):

- hierarchy ready and `rowCount > 0`: validate saved values against hierarchy and apply valid scopes;
- hierarchy ready and `rowCount === 0`: emit explicit diagnostic and apply configured fallback per scope;
- hierarchy not ready before timeout: fail Dienststelle restore with `WRITEBACK_DIENSTSTELLE_RESTORE_FAILED`;
- normal Dienststelle reconcile/default paths must not call restore-only hierarchy validation;
- if global applied a **saved** valid member, do **not** S6-default a missing `byTab` (empty PC after clear; vis keeps global MAG);
- if global cannot apply and cannot fallback: stop later `byTab` writes, skip restore reconcile, then SET abort (`requiredOk` still global-only);
- SET finish: info `message.notify` from `writebackLabels.js` when dstl `fallbackScopes` or `missingValues` and RestoreResult is `committed`/`degraded`; abort `showAlert` only; never both. Overlay ladder: missing-id modal > abort alert > info (`pendingRestoreInfo`). If dstl info does not fire, SSS P1 hint may use the same channel (dstl wins).

### 6.6 Widget Restore

Required owner-backed capability:

```js
_KDB.api.widgetBase.dispatch({
  type: "widgetBase/parameterSetRestoreRequested",
  payload: {
    widgets: v3.wgts, // read-only orchestration input; widgetBase consumes only its subset per §6.6.1
    tabTargets,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
})
```

Precondition (step 23, amended 2026-07-11): before dispatching `widgetBase/parameterSetRestoreRequested` for a tab, `writebackSet` must await `_KDB.api.widgetBase.dispatch({ type: "widgetBase/ensureTabWidgetsRouted", payload: { tabId, reason: "writebackSet", runId } })` for that activated tab target. This parks pre-restore canvas widgets of lazily loaded tabs on the launchpad so they are claimable; the call is idempotent/coalesced per `widgetBase-lazyLaunchpadRouting-contractdelta.md` and a concurrent `tabs:changed`-triggered ensure is harmless.

Contract:

- restore widgets grouped by `tab` index;
- resolve runtime tab targets through `_KDB.api.tabs.getState()`;
- use widget owner APIs (`widgetBase`, `widgetSettings`, `widgetText`, `widgetVis`);
- never rely on persisted `widgetId`;
- use `parameterSetRestoreRunId` to prevent stale async claims;
- skip unsupported widget kinds with diagnostics;
- wait for content readiness before applying settings that require rendered content;
- widgetVis must wait for Dienststelle hierarchy snapshot/gate before binding.
- widgetBase owns claim/take/create/placement orchestration; writeback owns sequencing and diagnostics only;
- widgetBase must not write widget settings, widget text content or widgetVis binding state from the raw `v3.wgts` input;
- widgetSettings owns committed setting batches;
- widgetText owns text content application only;
- widgetVis owns visualization binding and downstream gates.

KDB3 should not assume active tab mutation unless widget owner APIs require it. If inactive/hidden tab targets cannot be safely mutated, the tabs module must provide a restore-only activation API.

#### 6.6.1 Widget Restore Orchestration

`writebackSet` owns this sequence; widget owners own effects and state writes.

| Sub-step | Owner | Dispatch / effect | Payload subset | Async rule | Failure behavior |
|---|---|---|---|---|---|
| `24` | `widgetBase` | `widgetBase/parameterSetRestoreRequested` | common keys `tab/x/y/w/h/kind`, tab target, `"vis"` `bgcol` where present, `"vis"` `code` as metric/content identity for the per-widget `contentCreate` orchestration (sync 2026-07-12) | await claim/create/layout/shell completion incl. content-context creation | abort widget restore if required target/create fails; emit unsupported diagnostics for unsupported kinds |
| `25` | `widgetSettings` | `widgetSettings/parameterSetRestoreBatchRequested` | `"vis"` keys `type`, `dim`, `topn`, `vals`, `grp`, `ctcol`; `"txt"` keys `fsize`, `bgcol`, `style` | await committed settings batch and shell-colour consequence dispatch | abort that widget binding/style restore; continue other widgets only if owner marks failure non-fatal |
| `26` | `widgetText` | `widgetText/parameterSetRestoreRequested` | `"txt"` key `text` | await text content commit | abort that text widget on owner failure |
| `27` | `widgetVis` | per vis tab: `tabs/parameterSetActivateTabRequested` (`forceShow: true`), then `widgetVis/parameterSetBindingRequested` (sync 2026-10-06) | that tab's subset of the correlation map (widget ids created by `widgetBase`) plus committed settings snapshot | await activate, then contentReady + Dienststelle/topN gates, per tab sequentially | supported `"vis"` binding failure returns failed/degraded widget diagnostic; all vis tabs are tried, then `writebackSet` aborts once (`abortedByOwner`) unless the affected widget is unsupported/skipped or `options.allowDegradedWidgetBinding === true`; activate failure aborts immediately |

Rules:

- `widgetBase` returns a correlation map from v3 `wgts` entry index to runtime `widgetId`;
- later owner steps consume that correlation map, never persisted `widgetId`;
- every sub-step receives `runId`, `source: "writebackSet"` and `skipHistory: true`;
- stale `runId` completion must be ignored by every widget owner;
- `"txt"` `bgcol` (shell colour) is committed by `widgetSettings` and handed off to `widgetBase` through the existing colour-consequence path; `widgetBase` must not consume `"txt"` `bgcol` directly from `v3.wgts`;
- `code` is metric/content identity, not a committed setting: step 24 hands it to the owner drop-create path (`widgetVis/contentCreate` orchestrated per entry, like a real drop) and `widgetSettings` never commits or stores `code` (PO decision 2026-07-12);
- the metric descriptor (display, langtext, metricsTable, url) is not persisted in v3 and is re-resolved live through `_KDB.api.metricsTree.resolveMetricByCode(code)` — the same canonical lookup used by the drop path (`metricsTree-resolveMetricByCode-contractdelta.md`, PO decision 2026-07-14);
- step 24 dispatches `widgetSettings/placeControls` per successfully content-created entry (awaited, `isHistoryReplay: true`, `source: "writebackSet"`, seedDefaults skipped) so restored widgets carry the settings gear/panel before the step-25 batch decorates them; `placeControls` failure is non-fatal per entry (PO decision 2026-07-14, `widgetBase-parameterSetRestore-contractdelta.md` §4c).

### 6.7 `sichtChange` Restore Semantics

`status === "sichtChange"` is reserved and unsupported in tranche 1.

If a later tranche promotes it, the following semantics become required:

- Sicht restore must run with change semantics, not startup-default semantics;
- Dienststelle restore/reconcile must complete before widget downstream resync;
- downstream widget local filters/slots affected by Sicht must be cleared or rebuilt through widget owner APIs;
- legacy-equivalent `syncDownstreamWidgetsAfterRestore` behavior is required in tranche 3 through a named owner action, e.g. `widgetVis/syncDownstreamAfterSichtChangeRequested`, unless PO explicitly downgrades `"sichtChange"` support before implementation.

The bridge must reject `"sichtChange"` with a structured unsupported-status diagnostic until that later tranche is approved.

## 7. Mapping Matrix: v2 Legacy To v3

This matrix is the minimum required v2 adapter scope.

- legacy `configuration.dashboardWidth/dashboardHeight` -> `canv` and `sett` deltas;
- legacy `canvas.width/height` -> `canv` if more authoritative than configuration;
- legacy `topHeader` -> `head`;
- legacy `bottomFooter` -> `foot`;
- legacy `globalFiltersObj.Sicht` -> `filt.sicht`;
- legacy Dienststelle global filters -> `filt.dstl.glob` and `filt.dstl.key`;
- legacy Dienststelle page-context filters -> `filt.dstl.byTab`;
- legacy Dienststelle BW old labels -> current semantic use values through `bwOldToNewMap.js` during `writebackMap` pre-normalization when a mapping exists; unmapped labels remain diagnostic-bearing inputs for restore validation;
- legacy other global/page filters -> `filt.sels`;
- unclassifiable v2 global/page filters (not sicht, not Dienststelle/hierarchy, not single-select, not native, no `{ d, u }` pairs) -> omit + `WRITEBACK_FILTER_KIND_UNSUPPORTED`;
- legacy `tabs[index].name/visible` -> `tabs[index]` `{ name, hide? }`;
- legacy `tabs[index].pageContextFilterObjArr` kale (unowned, multi `{ d, u }`) items -> `filt.pcfs` entries with `tab: <tabIdx>` — **not** `filt.sels`; Dienststelle items in that array still map to `filt.dstl.byTab`; mapped single-select items still map to `filt.sels`;
- legacy `widgets[widgetId].tab.index` -> widget `tab`;
- legacy widget layout/style -> widget `x,y,w,h,bgcol/ctcol`;
- legacy widget metric/table metadata -> widget `code`;
- legacy vis slots -> semantic `dim` / binding choices where resolvable;
- legacy selected options `dimension`, `visType`, `topNChoice` -> widget keys `dim`, `type`, `topn`; legacy `sequence`/`sequences` values are dropped in `writebackMap` (sequences removed from project scope, PO 2026-07-12);
- legacy text widget text/style/background -> `"txt"` widget keys `text`, `fsize`, `bgcol`, `style`;
- legacy local filters -> omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`; compact persist is rejected; not a v3 widget key; BindingPlan rebuilds after restore; GET does not collect;
- legacy datatable/topN widgets -> omit + `WRITEBACK_WIDGET_KIND_UNSUPPORTED` (v2 map code unchanged); kind `"tbl"` / helper `"topn"` are skipped by design (GET omit, no restore); vis type `"list"` and vis key `topn` are not these leftovers;
- legacy `dataSource`, `sourceId`, `itemId`, `slot` Cognos IDs -> not stored; resolve semantically.

v0/v1 scope:

- v0/v1 adapters remain provisional until real anonymized DWH samples are supplied;
- without samples, only v2 -> v3 is implementation-ready.

## 8. Error Codes

The canonical error enum lives in `schema/errorCodes.js` and is shared by all three services and the bridge.

Initial error enum:

- `WRITEBACK_UNSUPPORTED_SCHEMA_VERSION`
- `WRITEBACK_UNSUPPORTED_STATUS`
- `WRITEBACK_INVALID_V3_PAYLOAD`
- `WRITEBACK_UNSUPPORTED_LEGACY_FORMAT`
- `WRITEBACK_MAPPING_CONFIG_MISSING`
- `WRITEBACK_MAPPING_TOKEN_UNRESOLVED`
- `WRITEBACK_MAPPING_PACKAGE_MISMATCH`
- `WRITEBACK_TABS_NOT_READY`
- `WRITEBACK_TABS_TARGET_MISSING`
- `WRITEBACK_TABS_TRAVERSAL_FAILED`
- `WRITEBACK_TABS_SURPLUS_UNTOUCHED`
- `WRITEBACK_FILTER_CLEAR_FAILED`
- `WRITEBACK_FILTER_RESTORE_FAILED`
- `WRITEBACK_SICHT_RESTORE_FAILED`
- `WRITEBACK_DIENSTSTELLE_RESTORE_FAILED`
- `WRITEBACK_DIENSTSTELLE_BW_LABEL_MAPPED`
- `WRITEBACK_DIENSTSTELLE_BW_LABEL_UNMAPPED`
- `WRITEBACK_KDBCONTROL_RESTORE_FAILED`
- `WRITEBACK_HEADER_FIELD_UNSUPPORTED`
- `WRITEBACK_HEADER_RESTORE_FAILED`
- `WRITEBACK_FOOTER_HEADER_GUARD`
- `WRITEBACK_WIDGET_RESET_FAILED`
- `WRITEBACK_WIDGET_KIND_UNSUPPORTED`
- `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`
- `WRITEBACK_WIDGET_RESTORE_FAILED`
- `WRITEBACK_WIDGET_BINDING_DEGRADED`
- `WRITEBACK_SKIPPED_BY_DESIGN`
- `WRITEBACK_COLLECTOR_FAILED` (added 2026-08-19, remediation B3: genuine GET collector crash; aborts the save fail-visible instead of persisting a partial payload)
- `WRITEBACK_FILTER_KIND_UNSUPPORTED`
- `WRITEBACK_SCHEMA_NORMALIZE_FAILED`
- `WRITEBACK_HISTORY_GUARD_FAILED`
- `WRITEBACK_RESTORE_CANCELLED`
- `WRITEBACK_TIMEOUT`
- `WRITEBACK_URL_PARAMETER_ID_PRECEDENCE`
- `WRITEBACK_URL_PARAMETER_ID_NOT_FOUND`
- `WRITEBACK_URL_PARAMETER_SET_WAIT_TIMEOUT`
- `WRITEBACK_URL_SHARE_HOST_LIST_UNREADY`

Errors should include:

- `code`;
- `message`;
- `phase`;
- `details`;
- `runId` where applicable.

## 9. Acceptance Criteria

Schema/design:

- v3 schema can be validated without reading legacy code.
- `get` and `map` both produce the same normalized v3 shape.
- `set` rejects non-v3 payloads unless called through the bridge/map chain.
- defaults/delta encoding are deterministic.
- the round-trip tolerance matrix in section 4.6 lists every intentionally skipped or default-restored field.
- canonical field encodings in section 4.7 are sufficient to implement `v3Defaults.js`, `normalizeV3.js` and `validateV3.js`.

GET:

- `JSON.parse(await WBParameterGetFunction())` validates as v3.
- Hidden dashboard tabs appear in `tabs[]` as `hide: 1` shells; GET does not click them and does not collect their widgets or page-filters (`writeback-get-visibleDashboard-contractdelta.md`).
- Output contains no DOM nodes, runtime handles, Cognos internal IDs or history state.
- `writebackTable` and launchpad-only widgets are skipped.

SET:

- `set(get())` restores a visually equivalent dashboard within the section 4.6 tolerance matrix only.
- Dienststelle BW/DEZPV restore works with hierarchy validation only on restore path.
- Widget restore does not depend on persisted widget IDs.
- History after restore cannot undo into pre-restore partial state.
- Status values `notDefaultParamSet`, `default*` and `newDashboard` have explicit behavior; reserved `"sichtChange"` is rejected in tranche 1.
- hidden tab targets can be restored or fail with explicit tab-target diagnostics before widget restore starts.

MAP:

- v2 legacy samples map to valid v3.
- Same-package mapping uses fast path where safe.
- Cross-package mapping resolves KID-based **filter item keys**, **kale `u` uniqueName bases**, and **GFO table keys** (`datasource_name_KID` + `alternativeDatasource_name_KID`). Widget datasource / vis slots remain **runtime** `parameterMap.js` / BindingPlan. Do not shrink `REQUIRED_KEYS`.
- Unknown v0/v1 formats fail explicitly until samples exist.

## 10. Implementation Tranches

Fase 0: contract and skeleton

- approve this contract;
- approve P0 owner contract deltas listed in section 12;
- add `core/config/mapping/` (`parameterMap.js`, `kidIndex.js`);
- register writeback orchestrator and three service shells;
- add schema validation/normalization;
- add Cognos bridge with guarded no-op/error behavior;
- record tabs and Dienststelle contract deltas.

Fase 1: GET

- implement collectors for canvas/settings/header/footer;
- implement filters/tabs collectors;
- implement widget collector with tabs traversal dependency;
- verify compact output size.

Fase 2: MAP — v2 adapter implemented 2026-08-16 (`writeback-v2Map-contractdelta.md`; Cognos acceptance still open)

- v2 adapter under `map/adapters/` maps KDB2 GET JSON to compact v3;
- KID universalize/de-universalize live as `map/adapters/` files (not `_KDB.utils`);
- semantic mapping through `core/config/mapping/kidIndex.js` grouped index over `parameterMap.js`;
- v0/v1 still sample-gated (`WRITEBACK_UNSUPPORTED_LEGACY_FORMAT`).

Fase 3: SET

- implement restore flags and reset flow;
- implement filters restore;
- implement Dienststelle restore entry point;
- implement widget restore pipeline;
- implement tabs/config/status flows.

Fase 4: integration

- enable bridge for Cognos extension;
- add round-trip and legacy import tests;
- decide later whether `WritebackTabel` CRUD enters scope.

## 11. Open Decisions

These must be closed before production implementation:

1. ~~Tagged tuples are the current v3 draft decision for DWH size~~ — CLOSED 2026-07-10: PO approved the switch to descriptive-key objects (§4/§4.5.1) for readability and forward compatibility; positional tuples are no longer part of v3.
2. ~~`localFilters` are unsupported in tranche 1 by default; PO may promote them only by approving owner deltas and updating section 4.6.~~ — CLOSED 2026-08-16: derived-only, not a v3 widget key; compact persist rejected; GET does not collect; v2 map omit + `WRITEBACK_WIDGET_LOCALFILTER_UNSUPPORTED`; v3 `localFilters` → `WRITEBACK_INVALID_V3_PAYLOAD`. See `writeback-t2-item2-contractdelta.md`.
3. v0/v1 map scope depends on real DWH samples.
4. Exact `kidIndex.js` grouped index shape needs implementation review against all KID keys and package variants.
5. Tabs activation for hidden/not-canvas-ready targets is required through `tabs/parameterSetActivateTabRequested`; owner implementations may optimize inactive-tab targeting only if they preserve the same public readiness semantics.
6. ~~`"tbl"` and `"topn"` widgets are unsupported in tranche 1 by default; owner-approved field specs are required to promote them.~~ — CLOSED 2026-08-16: kind `"tbl"` and helper kind `"topn"` skipped by design (GET omit, no restore). vis `type: "list"` is `kind: "vis"` required parity. vis key `wgts[].topn` stays live. See `writeback-t2-item2-contractdelta.md`.
7. Compression is a DWH/storage decision outside JS contract, but v3 must remain JSON-compatible.

## 12. Required P0 Contract Deltas

13 of 15 P0 deltas exist and are Approved; items 8 (`historyService-writebackRestore-contractdelta.md`) and 9 (`tabs-writeback-readiness-contractdelta.md`) remain Draft (sync 2026-08-10):

1. `tabs-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - owner restore action for tab names/visibility/physical targets;
   - `tabs/parameterSetResetRequested` for `status === "newDashboard"`;
   - `tabIdx -> tabId/pageId/scopeId` lookup contract;
   - hidden dashboard tab handling;
   - post-restore traversal payload semantics;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
2. `dienststelle-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `dienststelle/parameterSetRestoreRequested`;
   - `dienststelle/parameterSetClearRequested`;
   - CP-3 restore-only hierarchy validation;
   - BW old-to-new map ownership;
   - timeout/fallback/partial diagnostics;
   - clear failure before restore aborts SET unless status is `"newDashboard"`;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
3. `widgetBase-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `widgetBase/parameterSetRestoreRequested`;
   - widget claim/create/placement by `tab` index;
   - per-entry content-context orchestration with `"vis"` `code` as metric identity (§6.6.1, sync 2026-07-12);
   - direct colour input only for `"vis"` `bgcol`; `"txt"` `bgcol` (shell colour) arrives only through the `widgetSettings` consequence path defined in §6.6.1;
   - runId guards and unsupported-kind diagnostics;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
4. `widgetBase-parameterSetReset-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `widgetBase/parameterSetResetRequested`;
   - owner-backed widget reset before normal restore and for `status === "newDashboard"`;
   - coordination with `widgetSettings/parameterSetResetRequested`, `widgetText/parameterSetResetRequested` and `widgetVis/parameterSetCancelBindingsRequested`;
   - no direct writeback mutation of widget state, DOM, launchpad, settings, text or binding state;
   - action type, payload shape, `status`, `runId`/`skipHistory`, and failure mode.
5. `widgetSettings-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - committed settings batch restore;
   - canonical sentinels for `dim`, `topn`, `ctcol` and `"txt"` `bgcol`;
   - handoff/consequence from committed `"txt"` `bgcol` to `widgetBase` shell colour;
   - `skipHistory` semantics;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
6. `widgetVis-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - binding after settings restore;
   - Dienststelle/topN/content readiness gates;
   - stale runId cancellation;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
7. `widgetText-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - text content restore only;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
8. `historyService-writebackRestore-contractdelta.md` — Draft (sync 2026-08-10)
   - restore baseline/reset behavior;
   - owner dispatches with `skipHistory` / restore source;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
9. `tabs-writeback-readiness-contractdelta.md` — Draft (sync 2026-08-10); GET payload amended 2026-08-30 by `writeback-get-visibleDashboard-contractdelta.md`
   - GET traversal barrier before DOM/canvas/widget collectors;
   - GET barrier is `scope: "visibleDashboard"`, `includeHiddenDashboardTabs: false`;
   - widget collector readiness boundary;
   - action type, payload shape, `runId` where relevant, and failure mode.
10. `sicht-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `sicht/parameterSetRestoreRequested`;
   - `sicht/parameterSetClearRequested`;
   - `sicht/parameterSetDownstreamVisibilityRequested`;
   - restore `filt.sicht` and downstream visibility without normal-startup semantics;
   - clear failure before restore aborts SET;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
11. `singleSelect-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `singleSelect/parameterSetRestoreRequested`;
   - programmatic restore for `filt.sels`, including page-context entries with `tab`;
   - owner clear action semantics;
   - `singleSelect/parameterSetResyncRequested` after Dienststelle restore and before widget restore;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
12. `kdbControl-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `kdbControl/parameterSetRestoreRequested`;
   - restore `canv` / `sett` and synchronize configuration UI;
   - owner default behavior for `status === "newDashboard"`;
   - does not restore `head` / `foot`;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
13. `header-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10); **T2 item 4** `head.icon` 2026-08-16 (`writeback-t2-item4-contractdelta.md`)
   - `header/parameterSetRestoreRequested`;
   - map `head.on`, `head.title`, `head.sub`, `head.subOn`, `head.icon` to `header.status`, `titleText`, `subtitleText`, `subtitleStatus`, `iconKey`;
   - unknown `head.icon` stem → default + `WRITEBACK_HEADER_FIELD_UNSUPPORTED` (degraded, not failed);
   - owner default behavior for `status === "newDashboard"`;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
14. `footer-parameterSetRestore-contractdelta.md` — Approved; file present (sync 2026-08-10)
   - `footer/parameterSetRestoreRequested`;
   - map `foot.on` to `footer.status`;
   - preserve footer guard that footer cannot become active unless header is active;
   - owner default behavior for `status === "newDashboard"`;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
15. `widgetBase-lazyLaunchpadRouting-contractdelta.md` *(added 2026-07-11)* — Approved; file present (sync 2026-08-10)
   - `widgetBase/ensureTabWidgetsRouted`: tab-scoped, idempotent, coalesced launchpad routing;
   - step 23 precondition: await ensure-routed per activated tab before `widgetBase/parameterSetRestoreRequested` (§6.6);
   - `tabs:changed` subscription (with `tabs-activationEvent-contractdelta.md`) for lazy routing outside writeback;
   - action type, payload shape, `runId`/`skipHistory`, and failure mode.
16. `nativeMultiSelect-rename-and-global-contractdelta.md` *(2026-08-15)* — Approved + implemented; supersedes `pageContextPlain-parameterSetRestore-contractdelta.md` owner name
   - owner `nativeMultiSelect`; `filt.pcfs[]` `{ nm, tab?, vals }`; omitted `tab` = global;
   - GET host-enumerates global + page via `nativeMultiSelect/collectWritebackSnapshotRequested`;
   - SET clear only when `filt.pcfs` present; restore after sels page-context; no `degradedAllowed`;
   - missing dest host → skip + degraded; do not create host items; do not put kale in `sels`.

## 13. Review Focus

The review agent should focus on:

- schema drift risk between `writebackGet`, `writebackMap` and `writebackSet`;
- whether v3 is too compact to be maintainable;
- missing state needed for true round-trip restore;
- hidden tab and widget restore assumptions;
- Dienststelle restore failure modes;
- whether the `core/config/mapping/` SSOT (`parameterMap.js` + `kidIndex.js`) covers required KID keys without Cognos `parameterMappingId`;
- whether any proposed restore step violates owner boundaries in existing KDB3 modules.

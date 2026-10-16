# Module Contract: `cognosHostService`

> Ring-1 Cognos host adapter as designed in `ADAPTER_ONTWERP_2026-08-20.md` (§2 architecture, §3 contract, §5 migration plan). Implemented slice-by-slice by remediation cluster E. This contract describes the **target shape**; each section marks what the current slice actually delivers.
>
> Filed as `cognosHostService.md` (not `cognosHost.md`) to keep it distinct from the existing chrome layer in `KDB3/js/core/cognosHost/`, which is a different owner (C.2 selector registry + chrome checks).

---

**Status:** `Implementing` (slice 5 dashboard/messages/tabs **accepted** 2026-08-24 ±12:08; live §S5.11b. Slice 6 close-out **in progress** (docs+buckets). Empty global Jahr / “current year” is futureTodo, not E/F.)
**Owner module / service:** `cognosHostService`, published as `_KDB.services.cognosHost`
**Type:** `shared service` (Cognos host adapter — "ring 1" of `ADAPTER_ONTWERP_2026-08-20.md` §2.1)
**Authoring AI:** Cursor captain E, 2026-08-20
**Reviewed by:** user (2026-08-20)
**Related rules:** `cognos-adapter.mdc` (consumer how-to; always-apply), `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Consumer how-to (read this first)

Feature and service writers **consume** Cognos. They do not add SDK wrappers or new facet ops unless PO + a contract say so. Slice history, D1–D5, and the facet catalogue start at §1. Who already stamps which facet: §7.

**Three folders**

| Path | Key | Role |
|---|---|---|
| `KDB3/js/core/cognosAPI/` | `_KDB.cognosAPI` | Inner ring. Only `__getDashboardAPI()` lives here. Knowledge base of host chains. |
| `KDB3/js/core/services/cognosHost/` | `_KDB.services.cognosHost` | Ring 1. Only caller of `_KDB.cognosAPI.*`. Facets return **Outcome** + flat DTOs. No host Promise, live handle, or DOM node leaves this folder. |
| `KDB3/js/core/cognosHost/` | `_KDB.runtime.cognosHost` (chrome) | Selector registry + chrome checks. **Not** the adapter. Do not merge with the service. Service runtime is `_KDB.runtime.cognosHostService` (D2). |

**Recipe for a new host need**

1. Find an existing facet op in §4 / §7 that already has a live `KDB3/js/**` caller. Reuse it.
2. Owner orchestrator stamps once: `_KDB.runtime.<owner>.<facetName> = _KDB.services.cognosHost.<facet>`. Deep files read that stamp through `effects/read*Facet.js` (or the same one-line read). They do **not** look up `_KDB.services.cognosHost` and do **not** call `_KDB.cognosAPI` / `__getDashboardAPI`.
3. Map `Outcome` in the owner. Do not return the host Promise. `budgetMs` only when this owner passes a finite number (no shared `getCanvasWhenReady` join).
4. No matching op and no live caller → **stop**. Do not invent a facet, op, or `createCognos*Adapter.js` in the feature. Ask PO; write a contract first (D4 / Module Contract First).

Writeback `get/` `set/` `effects/`, other services, and feature `effects/` follow the same recipe. `runtime.<owner>.adapters` is an instance slot, not the Cognos stamp.

**Do not copy:** PDF `captureTabPage.js` → `resolveCaptureRoot` (exceptions register). `KDB.js` AMD + `_KDB.cognosAPI = null` teardown (namespace, not a method call). dienststelle’s **one** named `_KDB.services.cognosHost.filters` choke (§7) — not a licence for deep lookups.

Stale Approved parents that still say “call `_KDB.cognosAPI` from this module” are **wrong**. Live JS + this section + `cognos-adapter.mdc` win.

---

## User decisions

| ID | Decision |
|----|----------|
| **D1** | **Approved (user, 2026-08-20 ±14:45 — design doc §6.1).** The service is published as `_KDB.services.cognosHost` and lives in a **new** folder `KDB3/js/core/services/cognosHost/`, **next to** the existing `KDB3/js/core/cognosHost/`. The chrome registry and chrome checks stay where they are; no merge, and no in-place rebuild of `_KDB.cognosAPI`. |
| **D2** | **Approved (user, 2026-08-20).** Runtime owner bucket is `_KDB.runtime.cognosHostService` — its own bucket, not shared with the C.2 chrome layer's `_KDB.runtime.cognosHost` (`chromeChecks`, `selectorMeta`, wait bookkeeping). Follows the existing `message` → `messageService` and `loading` → `loadingService` convention. |
| **D3** | **Approved (user, 2026-08-20 — slice 1).** The filters handle index lives in the standard `adapters` bucket as `_KDB.runtime.cognosHostService.adapters.filterItemsByKey`. No new bucket name is introduced: `runtime.mdc` allows reusing an existing bucket semantically. That reuse matched the bucket singleSelect then used for `runtime.singleSelect.adapters.filterApisByInstanceId` — the cache this index replaced in slice 1. Slice 6 removed that vestigial singleSelect bucket. |
| **D4** | **Approved (user, 2026-08-20 — slice 1).** Two deviations from design doc §3.2/§3.3, both recorded here rather than applied silently. (a) **`removeFilter` and `clearAllPageContext` are not built in slice 1**: both have zero callers in `KDB3/js/**`, so building them would ship adapter surface that cannot be live-verified. This applies the design doc's own `dataSources` rule ("zero callers — do not build until a consumer exists"). They are added by the slice that gains a consumer. (b) **`FilterItemDescriptor` carries `rawScopeId`** in addition to the normalised `scopeId`. dienststelle matches page-context items on the *raw* host scope string, while nativeMultiSelect and singleSelect match on the normalised one; without the raw value the facet would silently widen dienststelle's matching and could redirect a restore write to a different scope. |
| **D5** | **Recorded (captain E, slice 2 — not a new user question).** Three catalogue choices so slice 2 can migrate `resolveTableWidgetId` and discovery without building later facets. (a) **`CanvasWidgetDescriptor` carries `visType` / `visTitle`** filled inside ring 1 via `_KDB.cognosAPI.visualization`. The visualization **facet** is still slice 3; only ring 1 may call that host theme. (b) **`tabId` is canonicalised** with `_KDB.cognosAPI.tabs.getTabsContainers()` then falls back to the container-chain id — the same formula widgetBase used. The tabs **facet** is still slice 5. (c) **`listCanvasWidgets({ waitUntilReady: true })` returns a Promise** and discards the host canvas handle. This is tableData's previous `getCanvasWhenReady` + list, **not** the published `whenCanvasReady` operation (slice 3/5). Default `listCanvasWidgets()` stays synchronous. Extra DTO fields beyond design doc §3.3: `contentType`, `isLiveWidget`, `containerId`. No `kind` field (E0.4). |

---

## 1. Purpose

`cognosHostService` is the single isolating layer between KDB feature code and the Cognos SDK. Domain facets accept **ids/DTOs** and return **flat data**; no live SDK object, host DOM node or `Promise<handle>` crosses the facet boundary in either direction. It exists because `_KDB.cognosAPI` is a pass-through that hands live host handles to `state/`, `view/` and `actions/`, so one Cognos update touches dozens of files instead of one layer.

**Slice 0 delivers only the skeleton**: service registration, generation token, idempotent destroy and its hook in the core destroy chain. No facets, no consumers, no Cognos call.

## 2. Ownership

- Canonical state subtree: **none**. This service is a pure adapter and owns no `_KDB.state.<subtree>`.
- It must never write `_KDB.state` — not its own key, not another owner's. Descriptors it returns are values for callers, not state.
- Foreign-write paths: none. Beslislogica stays with the owner: facets translate and normalise, they do not dispatch, do not write owner state and do not message the user (design doc §3.1 rule 3).

## 3. Runtime

- Owner namespace: `_KDB.runtime.cognosHostService` (see D2/§11).
- Buckets in slice 0:
  - `generation` — monotone integer token per `_KDB` instance (`runtime.mdc` scalar, not a resource bucket; prescribed by design doc §3.5.1). Never reset downwards, so a stale token can never become current again.
  - `subscriptions` — nul-arg unsubscribe closures (cluster A pattern, `createAuthoringController.js`).
- Buckets added in slice 1 (filters facet), each with a cleanup path in `clearCognosHostRuntime.js`:
  - `adapters.filterItemsByKey` — the handle index of design doc §2.3 (see D3). Entries are `{ handle, descriptor, generation }`; the live host item never leaves ring 1. Cleared on destroy and atomically replaced on every full inventory.
  - `abortControllers` — internal budget timers for facet waits, aborted on destroy. Every wait registers under its **own** key (`pageContextWait:<n>`), so two concurrent waits can never share a slot and leave one unreachable for destroy.
  - `waitSequence` — monotone integer that supplies those key suffixes (`runtime.mdc` scalar, like `generation`). Not a resource; it only guarantees key uniqueness.
  - `pendingPromises.filterWritesByKey` — per-key chain of in-flight host writes (design doc §3.6 point 5 / §6.8). Slice 1 round 3 (M4 second line). A second write on the same ref waits for the first, then resolves its handle freshly so it never reuses a handle the first write invalidated. Destroy drops the bookkeeping; an in-flight host call still lands and is normalised to `aborted-after-effect` by the write itself.
- Slice 2 adds **no** new runtime buckets. Widgets resolve content per call from `widgetId`; there is no handle index and no `widgetWritesByKey` chain.
- Slice 3 adds **no** new runtime buckets. Visualization resolves live from `widgetId` per call (slots/filters are host handles that stay inside the write). Canvas render-waits do not increment `waitSequence` and do not register `abortControllers` — owners keep their existing timeout races.
- Slice 4 adds **no** new runtime buckets. `waitForQueryResult` and `readQueryRows` reuse `waitSequence` and `abortControllers` with keys `queryResultWait:<n>`. It does not add `queryWritesByKey`. Owner `abortTable` stays on tableData (cluster D); the facet honours `{signal}`.
- Cleanup trigger: `cognosHost.destroy()`, called from `destroyCoreServices` in `KDB.js` as the **last** service — after all its consumers (tableData, writeback, pdf, binding, message) and before `clearRuntimeCore` / `releaseRootNamespaces` (design doc §3.5.2).
- Destroy order inside the service: unsubscribe → abort running waits → clear handle index → null facets. Destroy is idempotent (re-callable) and safe under double-boot (meting M1: one reopen produces 2 boots + 2 destroys).
- Non-standard resources: none.

## 4. Public API

### 4b. Shared service

- Surface: `_KDB.services.cognosHost`
- Style: **named methods** (service default).

Slice 0 surface:

```js
_KDB.services.cognosHost = {
  destroy: destroy,                          // idempotent teardown
  getGeneration: getGeneration,              // number — current generation token
  isCurrentGeneration: isCurrentGeneration,  // (token) => boolean; false once disposed
  isDisposed: isDisposed                     // () => boolean
};
```

Facets are added as keys on the same object by later slices, in migration order: `filters` (slice 1), `widgets` + `canvas` (slice 2), `visualization` (slice 3), `dataQuery` (slice 4), `dashboard` / `messages` / `tabs` (slice 5). Operation catalogue per facet: design doc §3.2; DTOs: §3.3.

Slice 1 adds the `filters` facet. Every operation resolves to an `Outcome`; none of them throws:

```js
_KDB.services.cognosHost.filters = {
  listFilterItems: listFilterItems,                // ({scopeId?, allPageContextScopes?, includeValues?}) -> Outcome<FilterItemDescriptor[]>
  findFilterItem: findFilterItem,                  // (ref) -> Outcome<FilterItemDescriptor|null>
  readFilterValues: readFilterValues,              // (ref) -> Outcome<FilterValue[]>, read live from the handle
  listPageContextScopes: listPageContextScopes,    // ({itemName}) -> Outcome<string[]> (raw host scopes)
  writeFilter: writeFilter,                        // ({ref, values}, {signal?}) -> Outcome  (values: [] = replace-empty)
  clearFilter: clearFilter,                        // (ref, {signal?}) -> Outcome  (host clearValues)
  waitForPageContextReady: waitForPageContextReady // ({scopeIds, budgetMs?, intervalMs?, maxAttempts?, signal?}) -> Outcome<{ready, attempts}>
};
```

`listFilterItems({allPageContextScopes: true})` returns the **whole page-context partition** (slice 1 round 2). dienststelle needs this because its hierarchy lookup matches on an `itemId` suffix across every scope at once and can not name the scope up front. It is an **explicit opt-in and never the consequence of a missing `scopeId`**: an empty or omitted scope keeps matching nothing, as it did before the migration. The DTO parity harness caught exactly that regression when the mode was first wired to an absent scope.

A `ref` is `{itemId?, itemName?, scopeId}`; the id key is tried before the name key. Resolution is cache → exactly one fresh inventory → `FILTERS_ITEM_NOT_FOUND` (design doc §2.3 point 2), never a retry loop. Within one inventory pass the **first** item wins on both the id key and the name key, mirroring the loop-and-return semantics of the lookups the index replaces; a duplicate is not reported, because a diagnostic would make the whole inventory `degraded` and fail-closed consumers would then lose an entire scope over one duplicate.

**Abort versus budget on waits.** `waitForPageContextReady` separates the two sources: an aborted caller `signal` yields `aborted` (silent, `ok:false`), while an exhausted budget yields `degraded` with `{ready:false, attempts}` — the same dialect the writeback-SET poll speaks today. Invalid input (no scope ids) is `failed` with `FILTERS_INVALID_REF`.

Deliberately absent, per D4(a): `removeFilter` (host `delete`), `clearAllPageContext`. Also absent: `readFilterItemUniqueName` from design doc §3.2 — it would only return `descriptor.itemId`, which `findFilterItem` already provides, so it would be a second way to say the same thing. The metrics-source rewrite that operation implied stays with dienststelle, since it is owner policy rather than translation.

Slice 2 adds the `widgets` and `canvas` facets. Every operation resolves to an `Outcome`; none of them throws. Host-SDK locals inside ring 1 are `widgetsApi` / `canvasApi`; owner stamps are `widgetsFacet` / `canvasFacet`; the key over the boundary is `widgetId` (string). Factory names stay `createWidgetsAdapter` / `createCanvasAdapter`.

```js
_KDB.services.cognosHost.widgets = {
  hasContent: hasContent,                 // (widgetId) -> Outcome<boolean>
  getWidgetType: getWidgetType,           // (widgetId) -> Outcome<string|null>
  setWidgetProperty: setWidgetProperty,   // (widgetId, key, value, {signal?}) -> Outcome
  setWidgetLayout: setWidgetLayout,       // (widgetId, {left,top,width,height}, {signal?}) -> Outcome
  renderWidget: renderWidget,             // (widgetId, {signal?}) -> Promise<Outcome>  (slice 3)
  enterFocusMode: enterFocusMode,         // (widgetId) -> Outcome  (chrome-labelled, slice 3)
  exitFocusMode: exitFocusMode            // (widgetId) -> Outcome  (chrome-labelled, slice 3)
};

_KDB.services.cognosHost.canvas = {
  listCanvasWidgets: listCanvasWidgets,   // ({waitUntilReady?, signal?}?) -> Outcome<CanvasWidgetDescriptor[]>
                                          // waitUntilReady:true -> Promise<Outcome> (D5c)
  whenRenderStart: whenRenderStart,       // (widgetId, {signal?}) -> Promise<Outcome<{ready}>>  (slice 3)
  whenRenderComplete: whenRenderComplete, // (widgetId, {signal?}) -> Promise<Outcome<{ready}>>  (slice 3)
  whenCanvasReady: whenCanvasReady,       // ({signal?, budgetMs?}?) -> Promise<Outcome<{ready}>>  (slice 5)
  whenWidgetReady: whenWidgetReady        // (widgetId, {signal?, budgetMs?}?) -> Promise<Outcome<{ready}>>  (slice 5)
};
```

`enterFocusMode` / `exitFocusMode` are chrome-labelled (design doc §3.2): ring 1 clicks `widgetsApi.enterWidgetFocusMode` / `exitWidgetFocusMode`. A missing method or a click that is not `true` is `WIDGETS_HOST_CAPABILITY_MISSING`, never a silent no-op. `renderWidget` awaits the host call and maps abort after the await to `aborted-after-effect`.

`whenRenderStart` / `whenRenderComplete` arm the host waiter **synchronously** (first statement before the first `await`) so a caller can subscribe, then `renderWidget`, then await the Outcome. `Outcome.data` is `{ready:true}` — the host Promise never crosses the facet boundary. There is **no** facet-internal budget timer and **no** extra `waitSequence` increment: caller timeouts stay with the owner (`finishRenderWait` / `withCap`).

`whenCanvasReady` / `whenWidgetReady` are extra ops on this same canvas facet (no extra compose factory). They arm `asyncApi.getCanvasWhenReady()` (0 args) / `asyncApi.getWidgetWhenReady(widgetId)` synchronously before the first await, return the same `Outcome<{ready:true}>` dialect, and never return the host Promise. They accept `{signal?, budgetMs?}`. `budgetMs` is honoured only when the caller passes a finite number — there is no default cap and no `waitSequence` increment. Budget expiry is `failed` (`CANVAS_WAIT_TIMEOUT`). Each caller arms its **own** host waiter; callers do **not** share one in-flight `getCanvasWhenReady` promise. `waitForTransferReady` calls `whenCanvasReady` / `whenWidgetReady`; `readLaunchpadTabSources` calls `tabs.listTabs`.

**`setCanvasPageSize` (2026-09-24; names/equality 2026-10-06).** Op on the existing `canvas` facet (not a new facet). Ring 1 calls existing `getCanvasPropertiesList` then `setCanvasPropertyValue`. Width: first exact hit `pageSizeWidth`. Height: `pageSizeHeight`. Caller passes `"width"` or `"height"` plus a px CSS string (`"1800px"`). Skip-if-equal treats host number `1800`, `"1800"`, and `"1800px"` as the same as `"1800px"`; null/undefined writes. Sync `Outcome`, never throws, never returns the host list or canvas handle. Missing candidate is `CANVAS_HOST_CAPABILITY_MISSING`. D4 caller: `pageSurface`. See [pageSurface.md](./pageSurface.md) and [pageSurface-pageSize-host-ready-contractdelta.md](./_archive/pageSurface-pageSize-host-ready-contractdelta.md).

Slice 3 adds the `visualization` facet. Host-SDK locals inside ring 1 are `visualizationApi`; owner stamps are `visualizationFacet`; the key over the boundary is `widgetId` (string). Factory name stays `createVisualizationAdapter`. D5 is unchanged: `CanvasWidgetDescriptor.visType` / `visTitle` are still filled in ring 1 via `facets/canvas/resolveVisualizationHostApi.js`, not by calling the new facet from canvas flatten.

```js
_KDB.services.cognosHost.visualization = {
  getVisType: getVisType,                               // (widgetId) -> Outcome<string|null>
  getVisTitle: getVisTitle,                             // (widgetId) -> Outcome<string|null>
  setVisType: setVisType,                               // (widgetId, visType, {signal?}) -> Promise<Outcome>
  setVisTitle: setVisTitle,                             // (widgetId, title, {signal?}) -> Promise<Outcome>
  setContentProperty: setContentProperty,               // (widgetId, key, value, {signal?}) -> Promise<Outcome>
  setDataSource: setDataSource,                         // (widgetId, dataSourceId, {signal?}) -> Promise<Outcome>
  clearAllSlots: clearAllSlots,                         // (widgetId, {signal?}) -> Promise<Outcome>
  addDataItemsToSlot: addDataItemsToSlot,               // (widgetId, slotId, columnIds, {signal?}) -> Promise<Outcome>
  setTopBottomOnSlot: setTopBottomOnSlot,               // (widgetId, slotId, topBottom, {signal?}) -> Promise<Outcome>
  sortDataItemInSlot: sortDataItemInSlot,               // (widgetId, slotId, dataItemId, order, {signal?, priority?}) -> Promise<Outcome>
  setCustomLabelInSlot: setCustomLabelInSlot,           // (widgetId, slotId, columnId, label, {signal?}) -> Promise<Outcome>
  clearAllLocalFilters: clearAllLocalFilters,           // (widgetId, {signal?}) -> Promise<Outcome>
  addOrReplaceLocalFilter: addOrReplaceLocalFilter,     // (widgetId, itemId, body, filterOptions?, {signal?}) -> Promise<Outcome>
  removeLocalFilter: removeLocalFilter,                 // (widgetId, ref, {signal?}) -> Promise<Outcome>
  getSelections: getSelections,                         // (widgetId) -> Outcome<{widgetId,categories}|null>  SYNC
  subscribeSelections: subscribeSelections              // (widgetId, callback) -> unsubscribe  (not an Outcome)
};
```

**`setCustomLabelInSlot` (2026-09-02).** New **op** on the existing `visualization` facet (not a new facet). Factory and stamp unchanged. Inner ring: `_KDB.cognosAPI.visualization.setCustomLabel(widgetId, slotId, columnId, label)` in `visualization.js` (this file may reach **200** lines for that wrapper; above 200 needs explicit PO). Ring 1 Outcome wrapper copies `setTopBottomOnSlot` / `setVisTitle` dialect. Empty `label` is `VISUALIZATION_INVALID_ID`. D4 live caller: `widgetBindingApply.applySlots` after `addDataItemsToSlot`. Authority: `contracts/_archive/visualization-dimension-custom-label-contractdelta.md`. Feature modules still must not call `_KDB.cognosAPI` / `__getDashboardAPI()`.

**`getSelections` / `subscribeSelections` (2026-08-30, F1c — ops on the existing `visualization` facet, not a new facet).** Factory stays `createVisualizationAdapter`. Owner stamp stays `visualizationFacet`. D4 live caller is widgetVis T2. `peekQueryRows` remains a **query-row** peek on `dataQuery`; it is not a selection API.

Ring 1 resolves content via `resolveWidgetsHostApi` / `_KDB.cognosAPI.widgets.getContent`, then host `getSelections` / `on`. Do **not** call the widgets **facet**. Do **not** add `_KDB.cognosAPI.visualization.getSelections`. Host `content.on("all")` stays in ring 1.

Flatten **both** host shapes to one DTO: `getSelections()[0].categories` and `event.info.value[0].categories`. Category fields: `columnId` + `label` required-when-present; pass through `dataItemId` / `name` / `value` when present. Never leak a live event or content handle. Success-with-selection data is `{ widgetId, categories }` with a non-empty `categories` array.

`getSelections(widgetId)` is **SYNC**. Dialect like `peekQueryRows`: host miss / empty `categories[]` / no selection / missing content or host method falls through to the last subscribe DTO for that widgetId; if that is also empty, `{ ok: true, data: null }`. Never treat `[]` as “has selection”. Do **not** fail-closed like `getVisType`. Disposed stays the uniform aborted Outcome.

When host `getSelections` is missing or returns null/empty (live `widgets.getContent` has no `getSelections`), return the last subscribe DTO for that `widgetId` from `adapters.lastSelectionDtoByWidgetId` if it has non-empty `categories`. `select` with categories writes a copy `{ widgetId, categories }`; `deselect` / `clearAll` / empty clears that slot. Unsubscribe and per-widgetId replace do not clear it (a re-install peek must still see the last select). Destroy resets the map. Not a new facet.

`subscribeSelections(widgetId, cb)` returns a nul-arg unsubscribe (not an Outcome). Filter host events `change:selections:select|deselect|clearAll`. Callback receives a flat DTO `{ kind, widgetId, categories }` (`kind`: `select` | `deselect` | `clearAll`). Per-`widgetId` **replace** (install can run four times): unsubscribe the previous host listener before arming the new one. Owner stores the unsubscribe on `listeners.drillthrough*` and unsubs on dispose / tab / re-install; the service `subscriptions` array is not enough alone.

Split subscribe vs flatten files (150-line cap). Do not clone `subscribeUiState` into one file. widgetVis deep files read the existing stamp through `effects/readVisualizationFacet.js`. No `_KDB.cognosAPI` / `content.on` in widgetVis.

Slice 4 adds the `dataQuery` facet. Host-SDK locals inside ring 1 are `dataQueryApi`; owner stamps are `dataQueryFacet`; the key over the boundary is `widgetId` (string). Factory name stays `createDataQueryAdapter`. Live host `getDataQueryResult` still accepts a widget object; ring 1 does **not**.

```js
_KDB.services.cognosHost.dataQuery = {
  waitForQueryResult: waitForQueryResult, // (widgetId, {budgetMs?, intervalMs?, signal?}) -> Promise<Outcome<{rowCount,isEmpty}>>
  readQueryRows: readQueryRows,           // (widgetId, {budgetMs?, intervalMs?, signal?}) -> Promise<Outcome<TableRowsResult>>
  peekQueryRows: peekQueryRows            // (widgetId) -> Outcome<TableRowsResult|null>  SYNC
};
```

`waitForQueryResult` is the cheap poll (resolve when `getResultItemList().length > 0`, including `rowCount === 0`). It does **not** flatten. Ring 1 may keep `hostResult` on the Outcome for `readQueryRows` only; that handle never leaves the facet. Owner `waitForTableQueryResult` maps to `{loaded,rowCount,isEmpty}` and defaults timeout to **Infinity** (pre-slice-4). `readQueryRows` waits, reuses `hostResult` when present (no second `getDataQueryResult`), then flattens. Do not call `readQueryRows` from wait-only paths (that was the slice-4 boot cost).

**`peekQueryRows` (2026-08-29, drillthrough icon vis year).** Sync in-memory peek of the **already-rendered** widget query. It does **not** poll, does **not** increment `waitSequence`, and does **not** await. Inner ring `peekCurrentQueryResult` walks `DataQueryExecution.getCurrentQueryResults().getResult()` with the same widget-id path as `getDataQueryResult`; if `getResult()` is thenable, return `{ ok: true, data: null }` (do not await). Flatten with existing `flattenQueryRows`. Host handle never leaves ring 1. Miss (no widget, no feature, no result, empty flatten, thenable) is **`ok` + `data: null`**, not `failed`. Disposed / invalid id use the same Outcome builders as `readQueryRows`. Do not use `peekQueryRows` on wait-only or load paths that need a guaranteed fresh query — those stay on `waitForQueryResult` / `readQueryRows`.

Defaults for `readQueryRows` match the live owner: `budgetMs` 60000, `intervalMs` 100 (`core/services/tableData/queryRead.js` (`readTableQueryResult`)). The caller chooses; the facet documents the defaults. A live query handle never leaves ring 1.

**`TableRowsResult`.** `{ columns, columnNames, rowCount }` with cells `{d,u,value,v,label,caption}` — the shape `normalizeTableData.js` already emits. `rowCount === 0` with at least one result item is **ok**, not `degraded` and not `failed` (empty structured query is valid elsewhere; Top-N Jahr-fallback 2026 is out of slice 4). Timeout after budget is `failed` (`DATAQUERY_WAIT_TIMEOUT`), never `{status:"empty"}`. Caller abort / disposed is `aborted`. Flatten/parse crash is `failed` (`DATAQUERY_FLATTEN_FAILED`). Host `dataQueryApi` is resolved **per poll iteration**, never captured for the whole wait (cluster A nulls `_KDB.cognosAPI`).

Owner dialect `{status:"ready"|"failed"|"aborted"|"empty"}` maps at the tableData boundary: `ok` → `ready`, `failed` → `failed`, `aborted` → `aborted`. `"empty"` stays owner-only (`!widgetId` before the facet is called).

`abortTable(input[])` is adopted from cluster D: array contract, disposed → `Promise.reject`, aborted loads silent. Slice 4 does not add a second abort hook on the facet (only `{signal}`) and does not add a named method on `core/services/tableData/index.js` (`createTableDataService`) (already 150/10).

Public facet argument order is `(widgetId, …)` so owners never reverse Cognos' host order. Ring 1 translates to the live host calls `setVisType(visType, widgetId)`, `setVisTitle(title, widgetId)`, `setVizDataSource(id, widgetId)`. `setVisTitle` rejects a non-string or empty title with `VISUALIZATION_INVALID_ID` (empty string is not a valid write). Every mutation/wait accepts `{signal?}` and checks abort **after** the await (`aborted-after-effect` / `disposed`); none of them throws.

The widgetBindingApply facade (`createCognosBindingFacade`) is a thin DI wrapper over the three stamps. It keeps the historical host argument order on `setVisType` / `setVizDataSource` / `sortDataItemInSlot` for existing apply-effects. `isComplete()` tests facet method availability, not live host handles. Host handles and host Promises must not leave that wrapper.

Slice 5 publishes `whenCanvasReady` / `whenWidgetReady` on the existing canvas facet (Adapter suffix, no extra compose factory).

Slice 5 also publishes the `dashboard`, `messages` and `tabs` facets on `_KDB.services.cognosHost` (same layering as `filters` / `widgets` / `canvas`). Factories stay `createDashboardAdapter` / `createMessagesAdapter` / `createTabsAdapter`. Host-SDK locals inside ring 1 are `dashboardApi` / `messagesApi` / `tabsApi`. Owner orchestrators stamp `dashboardFacet` / `messagesFacet` / `tabsFacet` onto their runtime buckets. `readCurrentTab` is not a facet operation.

```js
_KDB.services.cognosHost.dashboard = {
  getFileName: getFileName,                       // () -> Outcome<string|null>
  getDashboardVersion: getDashboardVersion,       // () -> Outcome<string|null>
  getEnvironmentSource: getEnvironmentSource,     // () -> Outcome<string|null>
  getBoardId: getBoardId,                         // () -> Outcome<string|null>
  getDashboardBiBaseUrl: getDashboardBiBaseUrl,   // () -> Outcome<string|null>
  getLanguage: getLanguage,                       // () -> Outcome<string|null>
  getUserName: getUserName,                       // () -> Outcome<string|null>
  getMode: getMode,                               // () -> Outcome<string|null>
  subscribeUiState: subscribeUiState,             // (callback) -> unsubscribe  (not an Outcome)
  replaceWithBiHomePerspective: replaceWithBiHomePerspective, // () -> Outcome<{ready:true}>
  openAppView: openAppView                        // (viewName) -> Promise<Outcome<{ready:true}>>  (caller passes "home")
};

_KDB.services.cognosHost.dataSources = {
  hasErrorDataSource: hasErrorDataSource           // () -> Outcome<boolean>  (missing feature → ok + false)
};

_KDB.services.cognosHost.messages = {
  showToast: showToast                            // (text, type, {signal?}) -> Promise<Outcome>
};

_KDB.services.cognosHost.tabs = {
  listTabs: listTabs,                             // ({signal?}?) -> Outcome<TabDescriptor[]>
  getTabName: getTabName,                         // (tabRef) -> Outcome<string>
  setTabName: setTabName                          // (tabRef, name, {signal?}) -> Promise<Outcome<string>>
};
```

Dashboard metadata readers flatten to primitives (or `null`); a host Promise or live object is `failed`. **`getUserName`** flattens `UserProfile.getUserAccount().userName` in the **inner ring** (`core/cognosAPI/dashboard.js` (`getUserName`)); the live account object never reaches ring 1. Do **not** bind layer-1 `getUserInfo` on this facet. `subscribeUiState` hands the caller a nul-arg unsubscribe; the host subscription handle stays in `_KDB.runtime.cognosHostService.subscriptions`. The callback receives a flat snapshot `{authoring, mode}`, never the live uiState object. `resolveCaptureRoot` / capture stay off this facet (PDF exception register).

**`replaceWithBiHomePerspective` / `openAppView` (WP6, 2026-09-08).** Ops on the **existing** `dashboard` facet. Ring 1 calls `getDashboardBiBaseUrl` then `window.top.location.replace(base + "?perspective=home")` (trailing slash like layer-1). `openAppView("home")` awaits and discards the host thenable; `Outcome.data` is `{ ready: true }`. Do not `location.replace` from features. D4 live caller: `core/homeDialog/presentHomeChoice`. Authority: `contracts/_archive/cubes-unavailable-home-dialog-contractdelta.md`.

**`hasErrorDataSource` (WP6, 2026-09-08).** New **`dataSources` facet** (not an op on dashboard). `Outcome<boolean>`: missing theme / missing `getDataSourceList` → immediate `ok` + `false`. Else one bounded settlement poll (150ms / 15s, abort on cognosHost destroy): wait while the list is empty or any item is unsettled (`loading` / unknown / throw / missing `getState`). First `"error"` stops immediately; all `"ready"` also stops. Then: any `"error"` → `true`; else `false`. Timeout still-loading → `ok` + `false`. Never put the list or host API on `Outcome.data`. Scan lives in ring 1; do not add it to layer-1 `dataSources.js`. D4 live caller: `core/homeDialog/presentCubesUnavailable`. Authority: `contracts/_archive/cubes-unavailable-home-dialog-contractdelta.md`.

`showToast` is transport for `messageService` only. Layer-1 host is `glassMessages`; there is no `_KDB.cognosAPI.messages`.

**`TabDescriptor`.** `id`, `tabId`, `pageId`, `index`, `scopeId`, `hasContent`. Scalars only — no `items[]`, no host objects, no DOM nodes. `tabRef` is a non-empty string or `{tabId|pageId|id}`. Chrome tab clicks stay chrome. `getTabsContent` is not published (raw spec arrays must not cross the facet boundary).

`hasContent(widgetId)` is the previous `getContent(widgetId) != null` check. Empty/non-string id is `ok` + `data: false` (the same early-null as `claimShellById`). Host missing or a host throw is `failed`; owners map anything other than `ok && data === true` to ineligible.

`setWidgetProperty` / `setWidgetLayout` resolve live content **inside** the call and never put it on `Outcome.data`. Colour and font owners swallow a failed host write (they used to swallow a boolean `false`); they warn only on `WIDGETS_WRITE_FAILED` / throw, matching the previous silent skip when `getContent` was missing. Layout maps `WIDGETS_HOST_UNAVAILABLE` / `WIDGETS_HOST_CAPABILITY_MISSING` **and** `aborted`/`disposed` to a skip (missing `setLayoutPosition` or missing widgets API used to no-op) and any other failure to `WIDGET_BASE_COGNOS_LAYOUT_FAILED`.

`listCanvasWidgets({ waitUntilReady: true, signal? })` is the one async canvas wait in slice 2: a caller `signal` abort before or after `getCanvasWhenReady` yields `aborted`. No `budgetMs` here — the previous tableData wait was the bare host promise. Default `listCanvasWidgets()` stays synchronous (launchpad / widgetBase discovery).

**`CanvasWidgetDescriptor` (slice 2 shape).** `widgetId`, `tabId` (canonical layout id or container-chain fallback, D5b), `widgetType`, `visType?`, `visTitle?`, plus `contentType`, `isLiveWidget` (`contentType === "widget.live"`), `containerId`. No `kind`, no `skipReason`, no `route` — those stay owner policy in widgetBase. **`isLiveWidget` is content-type, not a vis-route hint:** `resolveLaunchpadRoute` tests that flag *before* list/hierarchy, so `buildCanvasWidgetDescriptor` must not copy it onto the owner descriptor (live canvas handles never had the property). tableData keeps reading the DTO field.

**Facet lifetime after destroy.** The `filters`, `widgets`, `canvas`, `visualization`, `dataQuery`, `dashboard`, `messages` and `tabs` keys stay reachable on a disposed service and every operation answers with the uniform disposed Outcome. Design doc §3.5.2 says "null facets"; nulling the key would turn a late call during teardown ordering into a `TypeError`, which `module-public-api.mdc` forbids ("no throw from a disposed-state guard"). The runtime bucket *is* fully cleared, so no live host handle survives.

**`FilterItemDescriptor` (slice 1 shape).** `itemId`, `itemName`, `sourceId`, `scopeType` (`global`|`pageContext`), `scopeId` (normalised, `_tabpanel` stripped), `rawScopeId` (exact host string, see D4(b)), and `values: FilterValue[]` when `includeValues` is set. `FilterValue` stays `{d, u}` — the `source` field the design doc §3.3 mentions is added by dienststelle itself in `normalizeCognosDienststelleSelection`, it is not a host field.

Consumers may project the descriptor down to a narrower shape. `listUnownedNativeMultiSelectItems` does exactly that: it keeps emitting its existing four fields (`itemId`, `itemName`, `sourceId`, `values`), because that DTO is serialised into tab-mutation snapshots, history slices and writeback payloads, where extra keys would silently change the stored payload.

**Outcome contract (design doc §3.4), binding from slice 1 on.** Every facet operation resolves to exactly one of:

```js
{ ok: true,  outcome: "ok",       data? }
{ ok: true,  outcome: "degraded", data?, diagnostics[] }   // not-ready / partial
{ ok: false, outcome: "aborted",  reason? }                // abort / supersede / disposed
{ ok: false, outcome: "failed",   errorCode, diagnostics[] }
```

Facet operations never throw across the boundary; host throws are caught inside ring 1 and normalised to `failed`. Disposed is uniformly `{ ok: false, outcome: "aborted", reason: "disposed" }` and silent — the same shape E0 established for the six widget controllers. Every async mutation/wait accepts `{ signal?, budgetMs? }` and does its own post-await abort check.

**Slice 0 note:** the four methods above are lifecycle readers, not facet operations, so they return plain values rather than an `Outcome`. `getGeneration()` and `isDisposed()` keep answering after destroy (`isCurrentGeneration()` then returns `false` for every token); `destroy()` is a silent no-op on a disposed service.

### Review rule published with this contract

Inner ring `core/cognosAPI/` is the allowed and required caller of `__getDashboardAPI()` (layer-1 internal). Ring 1 `core/services/cognosHost/` is the allowed caller of `_KDB.cognosAPI.*`. Feature files and other services must not call `_KDB.cognosAPI.*` or `__getDashboardAPI()` — except entries in the exceptions register below (PDF capture root) and `KDB.js` boot/teardown (outside this rule, not a register entry). New code must not add direct `cognosAPI` callers. Enforcement is a grep audit in slice 6; existing callers are migrated per slice.

`KDB.js` AMD+call of `__orchestratorCognosAPI` (namespace mount) and `_KDB.cognosAPI = null` in teardown (namespace unmount) are **outside** this review rule: they are not `_KDB.cognosAPI.*` method calls. They are not exceptions-register entries. Do not change `KDB.js` for this rule.

**Exceptions register** (design doc §2.1/§6.3; every new entry needs user approval):

| Exception | Where | Why |
|---|---|---|
| PDF capture root | `dashboardPdf/effects/captureTabPage.js` via `cognosAPI.dashboard.resolveCaptureRoot` | html2canvas needs a live DOM node; pulling the whole capture into the facet was rejected as too heavy (§6.3 option a). |

**Dead but kept (layer 1).** The `core/cognosAPI/` folder is also a knowledge base of host calls. Never delete layer-1 functions unless the user orders it. Named unused getters `getWidget`, `getDashboardState`, `getUserInfo` stay 0-caller. Fuller unused list: `CLUSTER_E_RAPPORT_2026-08-20.md` §S6.1. The `cognosAPI.dataSources` theme (6 functions) is still the inner ring; ring 1 now exposes `cognosHost.dataSources.hasErrorDataSource` (WP6 consumer: `core/homeDialog/`). Do not add `hasErrorDataSource` to layer-1 `dataSources.js`.

## 5. Readers / Writers

- Deliberate read methods on `_KDB.services.cognosHost`: slice 0 has `getGeneration`, `isCurrentGeneration`, `isDisposed`; from slice 1 the facet read operations (`listFilterItems`, `readFilterValues`, `listCanvasWidgets`, …).
- Internal writers: none — the service owns no state subtree. Runtime writes stay inside these files and nowhere else:
  - `runtime/ensureCognosHostRuntime.js` — creates the bucket and its keys, idempotently (merge with `|| {}`, never replace).
  - `runtime/nextCognosHostGeneration.js` — the **only** place that increments `generation`; it is monotone and never resets. Later slices must not add a second increment site or a reset in `ensure`, or tokens would be reused.
  - `facets/filters/wait/waitForPageContextReady.js` (`registerWait`) and `facets/dataQuery/wait/waitForQueryResult.js` (slice 4) — the **only** two increment sites for `waitSequence`, and the only writers of `abortControllers`. Same counter, distinct key prefixes (`pageContextWait:<n>` / `queryResultWait:<n>`). No third increment site and no reset in `ensure`.
  - `runtime/clearCognosHostRuntime.js` — unsubscribes, aborts pending waits and resets the bucket to an empty shape, keeping **both** counter values (`generation` and `waitSequence`).
  - `core/services/cognosHost/facets/filters/filterIndex.js` (`refreshFilterIndex`) — the **only** writer of `adapters.filterItemsByKey`; it replaces the entries of one scope atomically after a fresh inventory.
  - `core/services/cognosHost/facets/filters/filterIndex.js` (`invalidateFilterIndexEntry`) — drops the entries of one item after a successful write, so a mutation can never leave a stale handle behind (design doc §2.3 point 3).
  - `core/services/cognosHost/facets/filters/write.js` (`serializeFilterWrite`) — the **only** writer of `pendingPromises.filterWritesByKey`. Chains conflicting writes on one ref key; no second writer, no reset in `ensure`.

## 6. Events

- Emitted: none. The service is not an event owner; owners emit their own facts after they interpret an `Outcome`.
- Subscribed: none in slice 0. From slice 5 the `dashboard.subscribeUiState` facet hands the caller a nul-arg unsubscribe closure; the host subscription handle itself stays in `_KDB.runtime.cognosHostService.subscriptions`. F1c `visualization.subscribeSelections` uses the same unsubscribe dialect (flat DTO, never a live event); host `content.on("all")` stays in ring 1. Per-`widgetId` replace; the owner must also store the unsubscribe on `listeners.drillthrough*` — the service `subscriptions` array is not enough alone.
- Request-events: none.

## 7. Dependencies

- `_KDB` — injected by `__orchestratorCognosHost` (called from `core/services/__orchestratorServices.js`).
- `_KDB.cognosAPI.<theme>` — **from slice 1**, used only inside ring 1, always through `&&`-guards because the teardown invariant of cluster A nulls `_KDB.cognosAPI`.
- No deep discovery: consumers receive their facet by injection from their own orchestrator/controller (tabs model). `window.top.getKDB()` or `_KDB.services.cognosHost` lookups in deep files are a violation (design doc §6.2).
- **Injection points per consumer (slice 1):**
  - *nativeMultiSelect* — strict injection. The orchestrator resolves the facet once and the controller puts it on all four dispatch contexts; every effect receives it as a parameter.
  - *writeback-SET* — injected through the run context. `state/createRunContext.js` is the composition point of a restore run and resolves the facet there; `waitForPageContextHost` reads `run.filtersFacet` and performs no lookup of its own.
  - *dienststelle* — **recorded deviation.** Its effects take only `_KDB`, so full threading would change signatures in roughly fifteen files inside the riskiest step of the plan, several of which already sit near the 150-line limit. The facet is injected where a context exists (the **parameterSet** context, covering `applyRestorePlan`) and resolved from `_KDB.services.cognosHost.filters` in **one** named place for the remaining effects — the module's host choke point next to the lookup, which every dienststelle host path already goes through. The tab-mutation effects use that choke point too; the context deliberately does not carry the facet, so there is no dead wiring. Full threading stays an open item for a later slice.
  - *singleSelect* — orchestrator composition root. `__orchestratorSingleSelect` resolves the facet once and stamps `_KDB.runtime.singleSelect.filtersFacet`. Every effect reads that stamp through `effects/readFiltersFacet.js` (which also accepts a `_runtime` already carrying the stamp). Deep files do not look up `_KDB.services.cognosHost`. The stamp is an adapter reference, not a live host handle; it is the same DI rule as nativeMultiSelect, using the `_runtime` argument singleSelect already threads instead of a fourth dispatch-context field.
  - *widgetBase (slice 2)* — `__orchestratorWidgetBase` stamps `_KDB.runtime.widgetBase.widgetsFacet` and `.canvasFacet` and puts both on the controller dispatch context. Colour/layout coordinators in `effects/` read the stamp through `effects/readWidgetsFacet.js` / `readCanvasFacet.js`. View files stay DOM-only.
  - *widgetText (slice 2)* — `__orchestratorWidgetText` stamps `_KDB.runtime.widgetText.widgetsFacet`. Font apply goes through `effects/applyTextFontSize.js`; `view/applyTextFontSize.js` is DOM-only.
  - *launchpad (slice 2)* — `__orchestratorLaunchpad` stamps `_KDB.runtime.launchpad.canvasFacet`. `buildLaunchpadTabsFromCanvas` reads unique `tabId`s from `listCanvasWidgets()` descriptors. `dashboard/launchpad/index.js` (`createLaunchpadController`) is not thickened (141-line cap).
  - *tableData (slice 2)* — `__orchestratorTableData` stamps `_KDB.runtime.tableData.canvasFacet`. `resolveTableWidgetId` reads it through `effects/readCanvasFacet.js`. `core/services/tableData/index.js` (`createTableDataService`) (150/10) is not thickened.
  - *tableData (slice 4)* — `__orchestratorTableData` also stamps `_KDB.runtime.tableData.dataQueryFacet`. `readTableQueryResult` reads it through `effects/readDataQueryFacet.js`. `waitForTableQueryResult.js` is dead (not on the load path). Deep files do not look up `_KDB.services.cognosHost`. `core/services/tableData/loadLifecycle.js` (`runLoadTableWork`) consumes the flattened `TableRowsResult` (AMD must replace `normalizeTableData`, not add). `abortTable` is unchanged.
  - *tableData (HideData park, 2026-09-09)* — `__orchestratorTableData` also stamps `_KDB.runtime.tableData.visualizationFacet` and `.widgetsFacet` (existing facets, new owner stamps, **not** a new op / not D4). Wrap: `removeLocalFilter` (`HideData`, `HideData_none`, `HideData_1`) → `renderWidget` → `readQueryRows` → `addOrReplaceLocalFilter` (live `containsignorecase` `"b"`) → unsignaled `renderWidget` if successor guard still this load. Authority: `contracts/_archive/tableData-hierarchy-park-filter-contractdelta.md`.
  - *widgetVis (slice 3)* — `__orchestratorWidgetVis` stamps `_KDB.runtime.widgetVis.visualizationFacet`, `.widgetsFacet` and `.filtersFacet`. Deep files read those stamps through `effects/readVisualizationFacet.js` / `readWidgetsFacet.js` / `readFiltersFacet.js`. Focus chrome stays in `widgetFocusMode`; dispose/cleanup call `exitNativeFocus` (click only, no wait).
  - *widgetVis (drillthrough vis year, 2026-08-29)* — already stamps `_KDB.runtime.widgetVis.dataQueryFacet`. Icon assemble calls `peekQueryRows` through that stamp (`dashboard/widgets/widgetVis/drillthrough/year.js` (`readDrillthroughVisYear`)). Does not await `readQueryRows`. Deep files do not look up `_KDB.services.cognosHost`. `peekQueryRows` is not a selection API.
  - *widgetVis (drillthrough T2 / F1c, 2026-08-30)* — already stamps `_KDB.runtime.widgetVis.visualizationFacet`. T2 consumes `getSelections` / `subscribeSelections` through `effects/readVisualizationFacet.js`. Deep files do not look up `_KDB.services.cognosHost` and do not call `_KDB.cognosAPI` / `content.on`. D4 live caller for the F1c ops.
  - *widgetBindingApply (slice 3)* — `__orchestratorWidgetBindingApply` stamps `_KDB.runtime.widgetBindingApply.visualizationFacet`, `.widgetsFacet` and `.canvasFacet`. `createWidgetBindingApplyService` builds the thin facade from those stamps. Apply-effects map `Outcome` through `bindingApplyStepHelpers.mapFacetOutcome`; `status:"aborted"` becomes `stale:true` in `reportApplyResult` and must not dispatch `APPLY_SUCCEEDED`.
  - *widgetTopN (slice 3)* — `__orchestratorWidgetTopN` stamps `_KDB.runtime.widgetTopN.widgetsFacet`. `readHelperTableRows` renders the helper through `effects/readWidgetsFacet.js`.
  - *widgetBase render (slice 3)* — already stamped in slice 2. `renderTabWidgets` now uses `widgetsFacet.renderWidget` and `canvasFacet.whenRenderComplete` (arm before render; `withCap` 2500 ms on `Outcome.data.ready`).
  - *dashboardPdf (slice 5)* — `__orchestratorDashboardPdf` stamps `_KDB.runtime.dashboardPdf.dashboardFacet`. Deep files read that stamp; `captureTabPage.js` `resolveCaptureRoot` stays on the exceptions register.
  - *authoring (slice 5)* — `__orchestratorAuthoring` stamps `_KDB.runtime.authoring.dashboardFacet`. `syncAuthoringFromDashboardMode` reads that stamp. If cognosHost is not yet published, a one-shot `pendingDashboardFacetStamp` runs after create.
  - *messageService (slice 5)* — `__orchestratorMessageService` stamps `_KDB.runtime.messageService.messagesFacet`. `core/services/messageService/notifications.js` (`showGlassToast`) reads that stamp.
  - *tabs (slice 5)* — `__orchestratorTabs` stamps `_KDB.runtime.tabs.tabsFacet` and `.canvasFacet`. Adapter wrap uses `tabsFacet`. `readCurrentTab` wrap injects `tabsFacet` plus a chrome index reader; chrome clicks stay chrome.
  - *widgetBase canvas waits (slice 5)* — existing `canvasFacet` stamp (slice 2). `waitForTransferReady.js` calls `whenCanvasReady` / `whenWidgetReady`; owner dialect stays `Promise<boolean>`.
  - *pageSurface (page size, 2026-10-06)* — existing `canvasFacet` stamp. `effects/applyPageSurfaceWhenReady.js` calls `whenCanvasReady({ signal })` with no `budgetMs`, then one `setCanvasPageSize` flush. Abort/dispose does not flush. Authority: `contracts/_archive/pageSurface-pageSize-host-ready-contractdelta.md`.
  - *writeback URL inbound* — writeback inbound does **not** stamp `canvasFacet` and does **not** call `whenCanvasReady` (dropdown wait only; see `writeback-urlParameterId-contractdelta.md`).
  - *launchpad (slice 5)* — `__orchestratorLaunchpad` also stamps `_KDB.runtime.launchpad.tabsFacet` (canvasFacet already slice 2). `readLaunchpadTabSources` reads `listTabs` DTO ids.
  - *dienststelle (slice 5)* — `__orchestratorDienststelle` stamps `_KDB.runtime.dienststelle.tabsFacet`. Tabs-leak only, not filter-DI.
  - *nativeMultiSelect (slice 5)* — `__orchestratorNativeMultiSelect` stamps `_KDB.runtime.nativeMultiSelect.tabsFacet`. Match `id` / `pageId`; sibling `guardTabMutation.js` is not a second copy.
  - *shareControls* — `__orchestratorShareControls` stamps `_KDB.runtime.shareControls.dashboardFacet`. Effects read that stamp through `dashboard/controls/toolbarControls/shareButton.js` (`readDashboardFacet`). ShareControls boots **after** `__orchestratorServices`; no `pendingDashboardFacetStamp`. `mount` / runtime normalize **must preserve** the stamp (same as `dashboardPdf` `normalizeRuntime`). Deep files do not look up `_KDB.services.cognosHost`.
  - *footer (created-user, 2026-09-02)* — `__orchestratorFooter` stamps `_KDB.runtime.footer.dashboardFacet`. D4 live caller of `getUserName`. Effects read the stamp through `dashboard/controls/toolbarControls/shareButton.js` (`readDashboardFacet`). Footer boots **after** `__orchestratorServices`; no `pendingDashboardFacetStamp`. Preserve the stamp if runtime is re-seeded. Deep files / view do not look up `_KDB.services.cognosHost` and do not call `_KDB.cognosAPI`. Authority: `contracts/_archive/footer-created-user-contractdelta.md`.
  - *homeDialog (WP6+WP7, 2026-09-08)* — `__orchestratorHomeDialog` stamps `_KDB.runtime.homeDialog.dataSourcesFacet` and `.dashboardFacet`. Not a `_KDB.services.*`. D4 live caller of `hasErrorDataSource`, `replaceWithBiHomePerspective`, `openAppView("home")`. Deep files read stamps only. Authority: `contracts/_archive/cubes-unavailable-home-dialog-contractdelta.md`.
- No further discovery sites without approval: `window.top.getKDB()` stays forbidden everywhere, and a new module that needs the facet injects it rather than adding a third resolver.

## 8. Cognos Touchpoints

- Slice 0: **none**. The skeleton performs no host call.
- From slice 1 the service becomes the only caller of `_KDB.cognosAPI` (filters, widgets, visualization, canvas, tabs, dataQuery, dashboard, glassMessages), per the review rule in §4.
- Slice 2 ring 1 additionally calls `_KDB.cognosAPI.widgets`, `.canvas`, and internally `.visualization` / `.tabs` from the canvas flatten (D5). Live handles never leave ring 1.
- Slice 3 ring 1 additionally calls `_KDB.cognosAPI.visualization` from the visualization facet (`facets/visualization/resolveVisualizationHostApi.js`, a second copy of the D5 canvas resolver so canvas flatten does not import the new facet) and `_KDB.cognosAPI.async` from canvas waits (`resolveAsyncHostApi.js`). Focus uses `_KDB.cognosAPI.widgets.enterWidgetFocusMode` / `exitWidgetFocusMode`. Live handles and host Promises never leave ring 1.
- F1c (2026-08-30) ring 1 additionally uses `resolveWidgetsHostApi` / `_KDB.cognosAPI.widgets.getContent`, then host `getSelections` / `on`, from the **visualization** facet. It does **not** call the widgets facet and does **not** add `_KDB.cognosAPI.visualization.getSelections`. Flattened DTOs only; live content/event handles never leave ring 1.
- Slice 4 ring 1 additionally calls `_KDB.cognosAPI.dataQuery` from `facets/dataQuery/resolveDataQueryHostApi.js`. Flattening (`core/services/cognosHost/facets/dataQuery/rows.js` (`flattenQueryRows`)) lives in ring 1. Owners no longer call `getDataQueryResult`.
- Slice 5 ring 1 additionally calls `_KDB.cognosAPI.dashboard` (metadata + uiState subscribe; not `resolveCaptureRoot`), `_KDB.cognosAPI.glassMessages` (`messagesApi`), and `_KDB.cognosAPI.tabs` from the tabs facet. Live handles, spec arrays and DOM nodes never leave ring 1.
- Dashboard share primitives: ring 1 additionally calls `_KDB.cognosAPI.dashboard.getBoardId` and `.getDashboardBiBaseUrl`. The host `getDashboardInfo` object stays inside the inner wrapper. Empty/missing **boardId** and unavailable **bi-base** (`document.location` missing) are `ok` + `data: null`.
- No new `window.top` globals. If one is ever needed it must follow the existing stamp pattern (`__kdbOwner` + restorable previous), like `installGetKDB` and the frozen writeback bridge.

## 9. Folder Layout

After slice 1:

```txt
core/services/cognosHost/
  facets/filters/
    config/filterErrorCodes.js
    read/    listFilterItems.js  findFilterItem.js
             readFilterValues.js  listPageContextScopes.js
    write/   writeFilter.js  clearFilter.js  serializeFilterWrite.js
    wait/    waitForPageContextReady.js  readPageContextReadiness.js
             awaitPollInterval.js  readAbortState.js
    buildFilterItemDescriptor.js  buildFilterItemKeys.js  buildFilterOutcome.js
    resolveFiltersHostApi.js  readHostFilterItems.js  refreshFilterIndex.js
    resolveFilterItemHandle.js  invalidateFilterIndexEntry.js
    buildFilterReadSurface.js  buildFilterWriteSurface.js
    createFiltersAdapter.js
  runtime/
    ensureCognosHostRuntime.js
    nextCognosHostGeneration.js
    clearCognosHostRuntime.js
  createCognosHostService.js
  __orchestratorCognosHost.js
```

After slice 2:

```txt
core/services/cognosHost/
  facets/filters/…  (unchanged)
  facets/widgets/
    config/widgetErrorCodes.js
    read/    hasContent.js  getWidgetType.js
    write/   setWidgetProperty.js  setWidgetLayout.js
    resolveWidgetsHostApi.js  buildWidgetOutcome.js
    buildWidgetReadSurface.js  buildWidgetWriteSurface.js
    createWidgetsAdapter.js
  facets/canvas/
    config/canvasErrorCodes.js
    read/    listCanvasWidgets.js
    resolveCanvasHostApi.js  resolveVisualizationHostApi.js  resolveTabsHostApi.js
    normalizeCanvasContentItems.js  readCanvasItemIdentity.js
    readCanvasWidgetHostMeta.js  flattenCanvasWidgetDescriptor.js
    buildCanvasOutcome.js  createCanvasAdapter.js
  runtime/…
  createCognosHostService.js
  __orchestratorCognosHost.js
```

After slice 3:

```txt
core/services/cognosHost/
  facets/filters/…  (unchanged)
  facets/widgets/…  write/ also: renderWidget.js  enterFocusMode.js  exitFocusMode.js
  facets/canvas/…   wait/whenRenderStart.js  wait/whenRenderComplete.js
                    wait/awaitRenderEvent.js  resolveAsyncHostApi.js
                    buildCanvasWaitSurface.js
  facets/visualization/
    config/visualizationErrorCodes.js
    read/    getVisType.js  getVisTitle.js
    write/   setVisType.js  setVisTitle.js  setContentProperty.js  setDataSource.js
             clearAllSlots.js  addDataItemsToSlot.js  setTopBottomOnSlot.js
             sortDataItemInSlot.js  setCustomLabelInSlot.js  clearAllLocalFilters.js
             addOrReplaceLocalFilter.js  removeLocalFilter.js
    resolveVisualizationHostApi.js  buildVisualizationOutcome.js
    buildVisualizationReadSurface.js  buildVisualizationWriteSurface.js
    buildVisualizationSlotSurface.js  buildVisualizationFilterSurface.js
    buildVisualizationBindingSurface.js
    createVisualizationAdapter.js
  runtime/…
  composeCognosHostFacets.js
  createCognosHostService.js          (4 AMD: 3 runtime + compose)
  __orchestratorCognosHost.js
```

After slice 4:

```txt
core/services/cognosHost/
  facets/filters/…  facets/widgets/…  facets/canvas/…  facets/visualization/…
  facets/dataQuery/
    config/dataQueryErrorCodes.js
    resolveDataQueryHostApi.js  buildDataQueryOutcome.js
    flatten/flattenQueryRows.js
    wait/waitForQueryResult.js  wait/inspectQueryResult.js  wait/awaitPollInterval.js
    read/readQueryRows.js
    createDataQueryAdapter.js
  runtime/…
  composeCognosHostFacets.js          (5 AMD)
  createCognosHostService.js          (4 AMD: 3 runtime + compose; public key dataQuery)
  __orchestratorCognosHost.js
```

`core/services/cognosHost/index.js` (`createCognosHostService`) stays at **4 AMD** because `composeCognosHostFacets.js` owns the facet factories. Slice 4 adds the fifth factory import on compose (4→5, under the >6 smell). Adding visualization as a fifth factory import on the service file would have been 7 (smell). Canvas flatten still uses its own `facets/canvas/resolveVisualizationHostApi.js` (D5); the visualization facet has a matching resolver and does not import the canvas file.

Slice 5 compose-split (does not change slice 4 behaviour): `composeCognosHostFacets.js` is a 2-AMD merger of core + edge. Core keeps the original five factories (AMD 5). Edge imports `createDashboardAdapter`, `createMessagesAdapter`, `createTabsAdapter` (AMD 3, under the cap of 6). Merge is `Object.assign({}, core, edge)` — edge keys win on collision; there should be none. `core/services/cognosHost/index.js` (`createCognosHostService`) stays 4 AMD and exposes `dashboard` / `messages` / `tabs` from the merger result. Owner orchestrators stamp `dashboardFacet` / `messagesFacet` / `tabsFacet`; compose only publishes the service keys.

The facet factory is `createFiltersAdapter.js` / `createFiltersAdapter`, not `create…Facet`: `naming.mdc` allows only `Controller`, `Service` and `Adapter` as factory role suffixes, and a domain-scoped part of the ring-1 host adapter is an adapter. "Facet" stays the architectural term used in the design doc and in folder naming. Same for `createWidgetsAdapter` / `createCanvasAdapter` / `createVisualizationAdapter` / `createDataQueryAdapter` / `createDashboardAdapter` / `createMessagesAdapter` / `createTabsAdapter`.

`resolveFiltersHostApi.js` is the single place in ring 1 that reads `_KDB.cognosAPI.filters`; `resolveWidgetsHostApi.js` for `.widgets`; `resolveCanvasHostApi.js` for `.canvas`; `facets/visualization/resolveVisualizationHostApi.js` for `.visualization` (canvas flatten keeps its own copy for D5); `resolveAsyncHostApi.js` for `.async`; `facets/dataQuery/resolveDataQueryHostApi.js` for `.dataQuery`. Each is resolved per call and never captured, because the cluster A teardown invariant nulls that namespace.

Target after slice 5 — large facets become subfolders with small files (writeback `get/`/`set/` precedent), so no facet file passes the 150-line limit:

```txt
core/services/cognosHost/
  facets/filters/…  facets/widgets/…  facets/visualization/…
  facets/canvas/…   facets/dataQuery/…
  facets/dashboard/  createDashboardAdapter.js  …
  facets/messages/   createMessagesAdapter.js   …
  facets/tabs/       createTabsAdapter.js       …
  runtime/…
  composeCognosHostCoreFacets.js      (5 AMD)
  composeCognosHostEdgeFacets.js      (3 AMD)
  composeCognosHostFacets.js          (2 AMD merger; edge keys win)
  createCognosHostService.js          (4 AMD: 3 runtime + compose; public keys + dashboard, messages, tabs)
  __orchestratorCognosHost.js
```

## 10. Out Of Scope

- **Cognos chrome DOM** (selectors, dock/popup click chains, toolbar mounts) — owner: `core/cognosHost/` (C.2 registry + chrome checks). Chrome level 3 (a chrome adapter) is deferred with a trigger. Two deliberate touchpoints stay in the SDK contract: widget focus mode (chrome-labelled) and the PDF capture root (exceptions register).
- **`cognosWritebackBridge.js`** — frozen (cluster A/B); it models global ownership but is not migrated.
- **User messaging** — owner boundaries call `_KDB.services.message` directly (B2 pattern). The `messages` facet is only that service's transport.
- **Retries** — the caller decides (`waitForRows` model). Facets expose budgets as parameters and never repeat silently.
- **`cognosAPI.dataSources`** — dead but kept (0 callers, 6 functions); no facet until a consumer exists. Named unused getters `getWidget`, `getDashboardState`, `getUserInfo` likewise kept. **`getUserName`** is the live flattened op (footer); do not promote `getUserInfo` onto the facet. See the §4 dead-but-kept note.
- **State ownership, dispatching, history** — always the owning module.

## 11. Open Questions

- **D2 — resolved (user, 2026-08-20).** Design doc §2.2 puts the service's runtime objects under `_KDB.runtime.cognosHost`, but that bucket is already the C.2 chrome layer's (`chromeChecks`, `selectorMeta`, `misses`, `pendingWaits`, `waitKeys`, `waitCounts`, `flushed`, `flushRequested`), written by `core/cognosHost/chromeChecks.js` (`createChromeChecks`) / `core/cognosHost/registerCognosHostSelectors.js` (`applyChromeCatalog`). `runtime.mdc` makes runtime owner-private and requires an explicit decision when two owners would share a subtree. Decision: **`_KDB.runtime.cognosHostService`** — a separate owner bucket, following the existing `_KDB.services.message` → `_KDB.runtime.messageService` and `_KDB.services.loading` → `_KDB.runtime.loadingService` convention, and the runtime analogue of the "side by side, no merge" decision D1. Alternative considered and rejected: nesting under `_KDB.runtime.cognosHost.service` (two writers on one owner subtree). This is a deliberate, recorded deviation from the literal wording of design doc §2.2.
- **§6.8 in-flight second line — resolved (captain E, slice 1 round 3).** Facet-internal serialisation is a **chain** (wait for the in-flight write on the same ref, then proceed), not a refusal with `superseded`. The measured commit window is ~3 ms, so waiting is cheaper than dropping a restore/commit overlap. The owner registry lives on `runtime.singleSelect.inFlight` (design doc §3.6 point 1), not on the service.

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `2026-08-20` | `Draft` | Cursor captain E | Derived from `ADAPTER_ONTWERP_2026-08-20.md`; D1 already approved by the user (§6.1). Module Contract First gate for slice 0 plus a verdict on D2 requested. |
| `2026-08-20` | `Draft → Approved → Implementing` | user | Contract approved and D2 decided (`_KDB.runtime.cognosHostService`). Slice 0 (skeleton) built against this contract; facets follow per slice. |
| `2026-08-20` | `Implementing` (slice 1) | user | D3 (handle index in the standard `adapters` bucket) and D4 (no zero-caller operations; `rawScopeId` on the descriptor) approved before implementation, per the synchronisation clause. `filters` facet surface, descriptor shape and the two new runtime writers recorded in §3/§4/§5/§9. |
| `2026-08-20` | `Implementing` (slice 1, round 1 reviewed) | Cursor captain E | Adversarial review closed three MAJOR findings; §3 gained `waitSequence` and the per-wait abort-slot rule, §4 gained the first-wins index rule and the abort-versus-budget split, §5 gained `registerWait` as the sole `waitSequence` writer. Re-verification by the same reviewer: all findings VERIFIED, verdict merge-ready. |
| `2026-08-22` | `Implementing` (slice 1, round 3) | Cursor captain E | singleSelect migrated off live handles. §3 gained `pendingPromises.filterWritesByKey` (M4 second line: chain, not superseded). §5 gained `serializeFilterWrite` as its sole writer. §7 gained the singleSelect injection point. §6.8 recorded. |
| `2026-08-22` | `Implementing` (slice 2) | Cursor captain E | widgets + canvas facets. D5 recorded (visType/visTitle and tab canonicalisation inside ring 1; waitUntilReady is not whenCanvasReady). §7 gained widgetBase / widgetText / launchpad / tableData injection. No new runtime buckets. |
| `2026-08-22` | `Implementing` (slice 2, reviewed) | Cursor captain E | Adversarial MAJOR 1: owner discovery must not copy DTO `isLiveWidget` onto `resolveLaunchpadRoute` descriptors. §4 records that split, layout skip of `aborted`/`disposed`, colour/font warn only on `WIDGETS_WRITE_FAILED`, and `listCanvasWidgets` `signal` on `waitUntilReady`. Re-verification merge-ready. |
| `2026-08-23` | `Implementing` (slice 2 accepted) | user | Live verification §S2.5b green (steps 0–5). Slice 2 formally accepted ±12:52. Next: slice 3 visualization facet. |
| `2026-08-23` | `Implementing` (slice 3) | Cursor captain E | visualization facet + widgets focus/render + canvas whenRenderStart/Complete. Factory split to 4 AMD via `composeCognosHostFacets.js`. D5 unchanged. Binding facade is a thin DI wrapper; abort-after-await maps to `stale:true` / no `APPLY_SUCCEEDED`. `whenCanvasReady`/`whenWidgetReady` remain slice 5. |
| `2026-08-23` | `Implementing` (slice 3, reviewed) | Cursor captain E | Adversarial review 0 MAJOR / 3 MINOR; all three VERIFIED on re-check (pre-render title abort stops the pipeline; `exitedNativeFocus` only on `ok`; `clearAllLocalFilters` fails closed without `removeFilter`). Signature sweep PASS (0 FAIL, 9 WARN). Harness 91/91. Live verification still required. |
| `2026-08-23` | `Implementing` (slice 3 accepted / slice 4) | user / Cursor captain E | Slice 3 accepted ±16:54 including Top-N at Jahr 2025. Empty global Jahr is futureTodo. Slice 4 dataQuery catalogue, `TableRowsResult`, empty-query rule, tableData `dataQueryFacet` stamp and compose 5 AMD recorded. |
| `2026-08-23` | `Implementing` (slice 4 accepted / perf hotfix / slice 5 next) | user | Slice 4 accepted ±19:50. Hotfix ±21:02: public ops `waitForQueryResult` + `readQueryRows`; `readQueryRows` reuses wait `hostResult`. Slice 5 unblocked. |
| `2026-08-24` | `Implementing` (slice 5 canvas waits) | Cursor captain E | `whenCanvasReady` / `whenWidgetReady` published on the existing canvas facet via the wait surface. Host `getCanvasWhenReady()` / `getWidgetWhenReady(widgetId)` stay behind `asyncApi`. Outcome dialect matches `whenRender*`. Compose untouched. |
| `2026-08-24` | `Implementing` (slice 5 edge wire) | Cursor captain E | Edge compose AMD 3 (`createDashboardAdapter` / `createMessagesAdapter` / `createTabsAdapter`). Merger stays 2 AMD; service stays 4 AMD. Public keys `dashboard` / `messages` / `tabs`. |
| `2026-08-24` | `Implementing` (slice 5 owner stamps) | Cursor captain E | Owner orchestrators stamp `dashboardFacet` / `messagesFacet` / `tabsFacet`. `waitForTransferReady` / `awaitCanvasReady` consume `whenCanvasReady` / `whenWidgetReady`; `readLaunchpadTabSources` consumes `tabs.listTabs`. |
| `2026-08-24` | `Implementing` (slice 6) | user / Cursor captain E | Review rule: `KDB.js` AMD+call of `__orchestratorCognosAPI` and `_KDB.cognosAPI = null` teardown are outside the rule (namespace mount/unmount), not register entries. Dead-but-kept layer-1 (`dataSources` theme + unused getters; fuller list §S6.1). No compose/facet/D1–D4 change. |
| `2026-08-29` | `Implementing` (dashboard share primitives) | PO-by-proxy | `getBoardId` + `getDashboardBiBaseUrl` on dashboard facet; shareControls stamp. |
| `2026-08-29` | `Implementing` (writeback inbound canvas wait) | Captain | Existing `whenCanvasReady` gains writeback as a live URL-inbound caller. §7 stamp: `_KDB.runtime.writeback.canvasFacet`. No new facet op. |
| `2026-08-29` | `Implementing` (dataQuery sync peek) | user / drillthrough captain | `peekQueryRows` on the existing `dataQuery` facet. Sync in-memory vis query; no wait loop. widgetVis icon year. Not a visualization selection facet. |
| `2026-08-30` | `Implementing` (writeback inbound leftover cleanup) | Captain | Writeback is not a whenCanvasReady caller. §7 writeback canvasFacet stamp withdrawn. No new facet op. Live owners unchanged. |
| `2026-08-30` | `Implementing` (tabs awaitCanvasReady withdrawn) | Captain / PO | `awaitCanvasReady.js` is not a live whenCanvasReady caller (zero importers; activate is inner-frame). §4/§7 tabs 2500 caller withdrawn. `waitForTransferReady` unchanged. No new facet op. |
| `2026-08-30` | `Implementing` (F1c visualization selection ops) | PO / contract writer | `getSelections` + `subscribeSelections` on the **existing** `visualization` facet. Not a new facet. Factory/stamp unchanged. D4 live caller: widgetVis T2. Miss dialect like `peekQueryRows` (`ok` + `null`); `peekQueryRows` itself is not a selection API. |
| `2026-08-30` | `Implementing` (F1c last-subscribe DTO buffer) | JS + contract writer | When host `getSelections` is missing/null/empty, return last subscribe DTO for that widgetId. `deselect` / `clearAll` / empty clears it. Not a new facet. |
| `2026-09-02` | `Implementing` (dashboard `getUserName`) | PO / footer captain | `getUserName` on the **existing** `dashboard` facet. Inner flatten of `userName`. Not `getUserInfo`. D4 live caller: footer Erstellt line. §7 footer `dashboardFacet` stamp. |
| `2026-09-08` | `Implementing` (WP6 home dialog) | PO KEEP + implement captain | New `dataSources.hasErrorDataSource`. Dashboard `replaceWithBiHomePerspective` + `openAppView`. D4 caller: `core/homeDialog/`. Layer-1 `dataSources.js` unchanged. |
| `2026-09-08` | `Approved` (WP6 settlement + Cognos green) | Captain after dual review + PO | `hasErrorDataSource` is a settlement poll (150ms/15s; first error wins). PROGRAM **6** green. |
| `2026-10-06` | `Implementing` (pageSurface page size after canvas-ready) | PO live green | `setCanvasPageSize` names `pageSizeWidth` / `pageSizeHeight` only; numeric/px skip-if-equal. pageSurface D4 caller of existing `whenCanvasReady` (unbounded). No new facet/op. |

> When implementation diverges from this contract, stop, present the deviation, update the contract, and resume per the synchronisation clause in `feature-structure.mdc`.

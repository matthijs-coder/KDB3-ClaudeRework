# Module Contract: `widgetBase`

> Full CP-1 contract for the first widgets composed-port tranche. Design authority lives in `_____________KDB3API/architecture/_archive/widgets-domain-blueprint.md`; this contract makes the `widgetBase` tranche execution-ready and records the deliberate launchpad channel remap agreed with the user.

---

**Status:** `Draft CP-1`
**Owner module / service:** `widgetBase`
**Type:** `feature module`
**Authoring AI:** GPT-5.5, 2026-06-06
**Reviewed by:** `user CP-1 agreed 2026-06-16 (launchpad-transfer replay tranche; settings-delete undo/redo boundary)`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Composed-Port Scope

`widgetBase` is a new feature module assembled from legacy widget orchestration, placement and launchpad-routing behaviour. It is not a 1-to-1 port of one legacy folder.

Target production path after CP-1 approval:

```txt
_____________KDB3API/KDB3/js/dashboard/widgets/widgetBase/
```

This tranche writes the type-agnostic widget frame only: identity, registry, shell DOM, placement, launchpad routing, canvas layout, move/resize, colour application/mirroring, removal, startup parking and the `canvas:dropValidated` subscription. Content modules own content creation. `widgetBase` may orchestrate post-drop settings placement/default seeding through `widgetSettings`, but it does not own settings values, panel state or settings history. No production code may be generated until this contract is approved.

### 0.1 Tab mutation does not move shells

Widget DOM nodes are never moved to another tab. A widget lives only on the slot (page) where Cognos registered it. On a tab mutation the content is fully rebuilt at its new location, using the destination slot's own stock widgets (the shells Cognos registered on that slot). Moving a tab is an illusion: content and presentation permute; widget shells do not.

Normative detail: `contracts/_archive/tabs-tabMutation-rebuildOnSlotStock-contractdelta.md` §1. Live 2026-10-07 for duplicate, delete, and move, including undo and redo. Same-slot park and take, between a slot's canvas and that slot's launchpad, are unchanged. Drop, launchpad transfer, and parameter-set restore are not tab mutations.

## 1. Legacy Evidence And Deltas

| Evidence | Use in this contract |
|---|---|
| `legacy-redesign2:js/dashboard/canvas/widgets/` investigation | Orchestrator flow, `canvas:dropValidated` routing, route-all startup parking, placement rollback, history boundaries, render/lifecycle split evidence. |
| `laatsteOriginal/KDB2/js/widgets/helpers/` investigation | External lifecycle evidence for launchpad send/take, parameter-set restore hooks, drag/drop lifecycle helpers and widget id stability assumptions. |
| `_____________KDB3API/contracts/launchpad.md` | Launchpad is environment owner only; `widgetBase` owns widget shell movement and reads launchpad slot metadata/selectors. |
| `_____________KDB3API/contracts/dragDrop.md` | `dragDrop` owns validation and scale-aware payload; `widgetBase` owns final placement, state and history. |
| `_____________KDB3API/contracts/historyService.md` | `widgetBase` commits serializable `widget_*` steps after confirmed effects only. |
| `_____________KDB3API/KDB3/js/core/cognosAPI/canvas.js` and `tabs.js` | Current production discovery touchpoints are `_KDB.cognosAPI.canvas.findCanvasContent()` and `_KDB.cognosAPI.tabs.getTabsContent()`. Production has no `canvas.setLayoutPosition(...)` wrapper at CP-1 time. |

Deliberate deltas versus legacy:

- Launchpad channels are the target five per-tab channels `text`, `visualization`, `dataTables`, `topN`, `otherResources`.
- Legacy `dataTables` channel semantics for TopN helper/untitled LIST parking become target `topN`.
- Legacy `shapes` channel semantics for titled list/hierarchy/data resources become target `dataTables`.
- Legacy catch-all/other resources become target `otherResources`, also per tab.
- `text` and `visualization` stay unchanged.
- `kdb3widget` / host widget and `writebackTable` are not parked or moved by `widgetBase`.
- Legacy lifecycle term `active` is not ported; target uses canonical `lifecycle: "ready"` plus separate `placement`.
- Legacy launchpad-send paths gated route-back on `KDBHideWidgetsToggle`; target `widgetBase` does not gate startup or explicit transfer on that legacy toggle. Any future hide/show control remains a separate `kdbControl`/visibility integration, not a blocker for frame placement ownership.
- Legacy history used `widget_colourChange`; target user-facing colour history moves to `widgetSettings` as an input-level settings step. `widgetBase` does not commit colour history; any legacy `widget_colourSet` handling is a migration/replay bridge only, not a new user-action step.

## 2. Purpose

`widgetBase` owns the widget frame shared by all widget content types. It records stable widget identity, tab reference, placement, layout and lifecycle; moves widget shells between canvas and launchpad slots; subscribes to validated drops; coordinates content creation and post-drop settings startup through dispatch; and commits base-level history after successful base/content effects.

It does not own text editing, visualization binding, TopN resolution, datatable content, settings panel content, launchpad environment construction, drag validation, or Cognos binding services.

## 3. Ownership

Canonical state subtree:

```js
_KDB.state.widgets.base = {
  lifecycle: "idle",
  byId: {},
  errorCode: null,
  errorMessage: null
};
```

Per-widget frame shape:

```js
_KDB.state.widgets.base.byId[widgetId] = {
  widgetId: "<cognos-dom-id>",
  kind: "text" | "vis" | "datatable" | "topN" | "other",
  role: "primary" | "topNHelper" | "otherResource",
  ownerWidgetId: null,
  tabId: "<tab-id>",
  tabHandle: 0,
  placement: "onCanvas" | "inLaunchpad" | "removed",
  launchpadPad: "text" | "visualization" | "dataTables" | "topN" | "otherResources" | null,
  launchpadSlotKey: null,
  layout: { x: 0, y: 0, width: 0, height: 0 } | null,
  lastCanvasLayout: { x: 0, y: 0, width: 0, height: 0 } | null,
  colour: string | null,
  lifecycle: "idle",
  pending: { kind: null, opSeq: null },
  errorCode: null,
  errorMessage: null
};
```

Ownership rules:

- `widgetBase` is the only writer of `_KDB.state.widgets.base`.
- Content modules write only their own subtrees (`text`, `vis`, `topN`, `dataTable`) and request frame changes through `_KDB.api.widgetBase.dispatch(...)`.
- No module writes `_KDB.state.widgets` as a root blob.
- `_KDB.state.widgets.base.byId[widgetId].widgetId` is the Cognos widget DOM id. `widgetBase` never mints an independent KDB id in this tranche.
- Widget ids are assumed stable only within the current Cognos dashboard/spec identity context and are the correlation key for launchpad routing, content-module dispatch and same-context history replay. Cross-session or copied-dashboard Cognos id remapping requires a later identity adapter and is out of scope.
- `tabId` is the durable tab identity. `tabHandle` is diagnostic/Cognos correlation only and must not be used as durable identity.
- `layout` is `null` while a widget is parked in launchpad or removed. `lastCanvasLayout` preserves the last confirmed canvas geometry for take-back/undo decisions without pretending the widget is currently on canvas.
- `colour` is a base-frame mirror written by `widgetBase` after a confirmed shell/Cognos colour apply. The canonical colour setting and its history are owned by `widgetSettings`; content-specific styling remains owned by content modules.

Lifecycle subset for module-level state and per-widget frames: `idle`, `initializing`, `loading`, `ready`, `error`, `disposed`. Placement is the separate domain field and never a lifecycle term.

## 4. Runtime

Owner namespace:

```js
_KDB.runtime.widgetBase = {
  subscriptions: {},
  abortControllers: {},
  listeners: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  byId: {}
};
```

Per-widget runtime shape:

```js
_KDB.runtime.widgetBase.byId[widgetId] = {
  domRefs: {
    shellEl: null,
    canvasParentEl: null,
    launchpadSlotEl: null
  },
  listeners: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  opSeq: 0
};
```

Runtime rules:

- DOM nodes, jQuery objects, event handles, AbortControllers, timers, observers, promises and Cognos host objects never enter state.
- `opSeq` is the single stale-result guard per widget for base operations.
- `destroy()` sets `_isDisposed = true` first, unsubscribes all event subscriptions, aborts controllers, removes listeners, clears observers/timers/pending promises, removes owned transient DOM decorations, clears `byId`, and writes module lifecycle `disposed`.
- `remove` cleans one widget runtime entry before transitioning that frame to `placement: "removed"` and `lifecycle: "disposed"`.
- Park, tab-delete and remove are widgetVis dispose points (E0a, 2026-08-20, `ADAPTER_ONTWERP_2026-08-20.md` §3.7): `cleanWidgetForTransfer` (route-to-launchpad funnel), `handleRemove` and `rollbackWidgetBaseOperation` dispatch `widgetVis/disposeWidgetRuntime` through `dispatchWidgetVisDispose` in `effects.js` (`cleanWidgetForTransfer` and `cleanBeforeTransfer` live in `launchpadTransfer.js`; `handleRemove` and `rollbackWidgetBaseOperation` in `canvas.js`); on non-clean pads the funnel dispatches the dispose directly, so every route-park is a dispose point. `handleTakeFromLaunchpad` dispatches `widgetVis/ensureObservers` after a successful place so unpark rebuilds the observers. All are fire-and-forget with `.catch` and no-op when widgetVis has no runtime/record for the widget.
- `buildDescriptor` (route funnel) passes the frame `kind` into the route descriptor (E0a live finding, 2026-08-20): metadata-less dispatches (tab-delete/move/slot-moves, history `targetPad` replays) previously fell back to the `"other"` route, which skipped clean/dispose and overwrote the frame kind. topN/datatable frames still fall back to `"other"` on those paths (known residual, see `CLUSTER_E_RAPPORT_2026-08-20.md` §E0.4).

## 5. Public API

Feature module surface:

```js
_KDB.api.widgetBase = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Method contracts:

| Method | Signature | Contract |
|---|---|---|
| `mount(options)` | `({ autoRouteAll?: boolean, launchpadReadyTimeoutMs?: number } = {}) => Promise<boolean>` | Initializes `_KDB.state.widgets.base`, runtime buckets and the `canvas:dropValidated` subscription. If `autoRouteAll !== false`, first awaits launchpad readiness through `_KDB.api.launchpad.dispatch({ type: "launchpad/waitUntilReady", payload: { timeoutMs } })`, then runs startup `routeAllToLaunchpad`. |
| `destroy()` | `() => void` | Idempotent module teardown; sets `_isDisposed` before cleanup and transitions module state to `disposed`. |
| `dispatch(action)` | `(action: WidgetBaseAction) => Promise<object>` | Single command entry. Sync actions may still return `Promise.resolve(result)` so callers can uniformly await effects. Post-disposal calls warn once and return the disposed result documented below (§5, E0b). |
| `getState()` | `() => object | undefined` | Returns a cloned snapshot of `_KDB.state.widgets.base`; never returns a live mutable reference. |

No named commands are added to `_KDB.api.widgetBase`. Consumers use `dispatch`.

Post-disposal dispatch returns `{ ok: false, outcome: "aborted", reason: "disposed", errorCode: "WIDGET_BASE_DESTROY_FAILED", ... }` (E0b, 2026-08-20): the pre-existing `ok:false` + `errorCode` shape is kept for compatibility, extended with the uniform `outcome`/`reason` fields from `ADAPTER_ONTWERP_2026-08-20.md` §3.4.

### 5.1 Action Envelope

Every action uses:

```js
{
  type: "widgetBase/<actionName>",
  widgetId: "<optional for module-wide actions>",
  opSeq: 1,
  payload: {}
}
```

`widgetId` is canonical only in the envelope. Payloads must not repeat `widgetId`; if a payload contains a conflicting id, `dispatch` rejects the action with `WIDGET_BASE_WIDGET_ID_CONFLICT`.

`opSeq` is optional for callers. When absent, `widgetBase` increments the per-widget runtime sequence and uses the new value. For stale async continuations, `widgetBase` ignores the result, clears no newer state, and returns `{ ok: false, stale: true, widgetId, opSeq }`.

All dispatch calls resolve to this normalized result shape:

```js
{
  ok: boolean,
  widgetId?: string,
  opSeq?: number,
  skipped?: boolean,
  stale?: boolean,
  rolledBack?: boolean,
  placement?: "onCanvas" | "inLaunchpad" | "removed",
  errorCode?: string,
  errorMessage?: string,
  reasonCode?: string
}
```

Intentional skip cases such as host widget and `writebackTable` return `ok: true`, `skipped: true` and a `reasonCode`; they are not errors.

## 6. Action Payloads And Behaviour

### `widgetBase/dropCreate`

Payload:

```js
{
  dropRequest: {
    draggedElementType: "text" | "visualization" | "list" | "hierarchy" | string,
    dropboxId: string,
    layout: {
      x: number,
      y: number,
      width: number,
      height: number,
      scaleX: number,
      scaleY: number
    },
    originId: string | null,
    padKey: string | null,
    payload: object,
    sourceKind: string,
    startedAt: number,
    tabId: string
  },
  isHistoryReplay: boolean
}
```

Flow:

1. Validate the action envelope and create/capture `opSeq`.
2. Claim the shell deterministically:
   - first, for Kennzahl/metrics-tree visualization drops, resolve the drop tab, call `_KDB.api.launchpad.dispatch({ type: "launchpad/readSlotWidgets", payload: { padKey:"visualization", tabId, mode:"all" } })`, and claim the first returned widget id that passes `widgetBase` shell eligibility;
   - second, for toolbox text-button drops, resolve the drop tab, call `_KDB.api.launchpad.dispatch({ type: "launchpad/readSlotWidgets", payload: { padKey:"text", tabId, mode:"all" } })`, and claim the first returned widget id that passes `widgetBase` shell eligibility;
   - third, if `dropRequest.originId` resolves to an eligible existing launchpad slot widget, claim that shell;
   - fourth, if `dropRequest.payload.widgetId` or equivalent source metadata resolves to an eligible Cognos shell, claim that shell;
   - otherwise fail with `WIDGET_BASE_WIDGET_ID_MISSING`. On **user drop**, an exhausted eligible pad list also `_KDB.services.message.notify` warning with `_KDB.config.labels.de.widgetBase.maxWidgetsPerTab`; other missing-id causes stay coded. Dispatch result may carry `isEligibleListEmpty` (not an error-taxonomy entry). GET/PS restore and tab-duplicate do not toast.
3. Use the claimed shell's Cognos DOM id as `widgetId`; fail on envelope/source mismatch.
4. Resolve `kind`, `role`, `tabId`, `tabHandle` and launchpad route with descriptor-only `resolveLaunchpadRoute`.
5. If the route says `skipped`, return `{ ok: true, skipped: true, reasonCode }` without state/history.
6. Create or update a pending base frame with `pending: { kind: "dropCreate", opSeq }`; snapshot previous placement/layout/launchpad fields for rollback.
7. Convert dragDrop's rendered placement by scale, clamp within the dropbox and place the shell on canvas.
8. Call `_KDB.cognosAPI.canvas.setLayoutPosition(widgetId, layout)` if available.
9. Dispatch content creation to the content owner:
   - `text` -> `_KDB.api.widgetText.dispatch({ type: "widgetText/contentCreate", widgetId, payload })`; payload carries the toolbox text-button drop request and any initial text defaults.
   - `vis` -> `_KDB.api.widgetVis.dispatch({ type: "widgetVis/contentCreate", widgetId, payload })`; payload carries the Kennzahl/metrics-tree drop request and the metric descriptor. The descriptor is resolved through the canonical lookup `_KDB.api.metricsTree.resolveMetricByCode(code)` (`metricsTree-resolveMetricByCode-contractdelta.md`); the drag payload fields serve as fallback when the lookup is unresolved (sync 2026-07-14).
   - `datatable` -> `_KDB.api.widgetDataTable.dispatch({ type: "widgetDataTable/contentCreate", widgetId, payload })`
   - `topN` helper frames are not created by direct user drop in this tranche; only startup discovery, restore or explicit TopN helper claim may park an untitled LIST as `topN`.
   - `other` / `otherResource` has no content owner in this tranche and is route-only.
10. After successful `contentCreate`, dispatch post-drop settings startup when `_KDB.api.widgetSettings` is available:
   - `_KDB.api.widgetSettings.dispatch({ type: "widgetSettings/placeControls", widgetId, payload })` or an equivalent settings-startup action;
   - `widgetSettings` owns any internal sequencing from `placeControls` to `seedDefaults`.
   `placeControls` / settings startup must never run before successful `contentCreate`.
11. `widgetBase` must not call `widgetVis/waitUntilContentReady` directly. For visual widgets, that readiness gate belongs inside `widgetSettings/seedDefaults`.
12. Failure of `placeControls`, `seedDefaults` or visual default apply after successful shell placement and `contentCreate` does not trigger `widgetBase` rollback. Settings startup/default failures are reported through `widgetSettings` owned pending/error state.
13. Before writing success, confirm the current frame `pending.opSeq` still matches the captured `opSeq`; stale results write no state/history.
14. On success, write `placement: "onCanvas"`, `layout`, `lastCanvasLayout`, `lifecycle: "ready"`, clear `launchpadPad`, clear `launchpadSlotKey`, clear `pending`, and commit `widget_canvasDrop` unless `isHistoryReplay`.
15. On placement or `contentCreate` failure, run rollback below and commit no history.

Rollback rule:

- If placement or content creation fails after shell/frame work started, `widgetBase` first clears runtime created for the attempted operation, then routes the shell back to its resolved launchpad pad/slot.
- If route-back succeeds, restore the previous frame state when one existed; otherwise keep or create the frame as `placement: "inLaunchpad"`, `layout: null`, `lifecycle: "idle"`, clear `pending`, and store no error unless diagnostic detail is needed.
- If route-back fails, keep the frame for manual recovery as `lifecycle: "error"`, `errorCode: "WIDGET_BASE_ROLLBACK_FAILED"`, `placement` set to the last known physical location, and commit no history.
- Rollback returns `{ ok: false, rolledBack: true, widgetId, errorCode }` when route-back succeeds and `{ ok: false, rolledBack: false, widgetId, errorCode: "WIDGET_BASE_ROLLBACK_FAILED" }` when route-back fails.

### `widgetBase/routeToLaunchpad`

Payload:

```js
{
  reason: "startup" | "user" | "contentRequest" | "rollback" | "historyReplay",
  sourceModule: "widgetBase" | "widgetText" | "widgetVis" | "widgetDataTable" | "widgetTopN" | string,
  requestedBy: "widgetSettings" | "widgetBase" | "widgetText" | "widgetVis" | "widgetDataTable" | "widgetTopN" | string | null,
  widgetType: "WIDGET.VISUALIZATION" | "WIDGET.TEXT" | string | null,
  isLiveWidget: boolean,
  isTextWidget: boolean,
  targetPad: "text" | "visualization" | "dataTables" | "topN" | "otherResources" | null,
  tabId: string | null,
  isHistoryReplay: boolean
}
```

Flow:

1. Read the existing frame or discover the widget from Cognos DOM.
2. Resolve the route via `resolveLaunchpadRoute` unless `targetPad` is explicitly supplied by `widgetBase` during rollback/replay. Optional `requestedBy`, `widgetType`, `isLiveWidget` and `isTextWidget` fields are diagnostic/route-hint inputs only; they do not create a separate history key or settings-specific base action.
3. Skip host widget (`kdb3widget` / `_KDB.elements.kdbWidget`) and `writebackTable`.
4. Resolve launchpad slot metadata with `readLaunchpadSlotMeta(_KDB, padKey, tabId)`.
5. Resolve the actual slot element by a `widgetBase` scoped DOM resolver using launchpad selectors (`hideSpotSelector`, `rootSelector`, `slotSelector`) and the returned `slotKey`; do not read `_KDB.runtime.launchpad.domRefs`.
6. Apply only shell/frame transfer cleanup owned by `widgetBase` (canvas layout styles, base chrome/classes, base runtime refs). `widgetBase` must not duplicate visual binding/filter/slot cleanup owned by `widgetVis/cleanupContent`, and must not remove settings DOM owned by `widgetSettings/cleanupWidgetControls`.
7. Move the shell into the slot.
8. Write `placement: "inLaunchpad"`, `launchpadPad`, `launchpadSlotKey`, `layout: null`, preserve `lastCanvasLayout`, `lifecycle: "ready"`, clear `pending`.
9. Commit `widget_launchpadTransfer` for user/content-request routes; do not commit for `startup`, `rollback` or `historyReplay`. When `requestedBy: "widgetSettings"`, commit behaviour is unchanged (`reason: "user"` still commits). Persist `requestedBy` in the committed `old`/`new` frame when present so replay can delegate settings UI restore without a separate settings history key.

Settings-delete/reset-to-launchpad is intentionally represented as `widgetBase/routeToLaunchpad` with `reason: "user"` and `requestedBy: "widgetSettings"` after the requester has performed any content-owner cleanup it requires (for live widgets, `widgetVis/cleanupContent`). No separate `widgetBase/settingsDelete` or `widgetBase/resetToLaunchpad` public action is introduced because the base effect and history are the normal launchpad transfer.

### `widgetBase/takeFromLaunchpad`

Payload:

```js
{
  tabId: string,
  targetLayout: { x: number, y: number, width: number, height: number },
  reason: "drop" | "user" | "historyReplay" | "restore",
  isHistoryReplay: boolean
}
```

Flow:

- Resolve the shell by `widgetId` from the existing frame/runtime or scoped DOM lookup.
- Place the shell on the target canvas/dropbox.
- Write `placement: "onCanvas"`, `layout`, `lastCanvasLayout`, `lifecycle: "ready"`, `launchpadPad: null`, `launchpadSlotKey: null`.
- Commit `widget_launchpadTransfer` only for user-visible take actions, not for drop internals or replay.

Restore mode accepts a pre-bound `widgetId` from parameter-set or history replay but does not claim a different widget. Parameter-set restore beyond that id discipline is out of scope.

### `widgetBase/routeAllToLaunchpad`

Payload:

```js
{
  reason: "startup" | "manualSync",
  tabId: string | null
}
```

Flow:

- Discover current Cognos widgets via `_KDB.cognosAPI.canvas.findContent()` and/or `_KDB.cognosAPI.tabs.getTabsContent()`.
- Skip helper tabs, host widget and `writebackTable`.
- For every discovered eligible widget, resolve route and dispatch `widgetBase/routeToLaunchpad` with `reason: "startup"`.
- No history is committed for startup parking.
- Failures are recorded per widget; one failed widget does not stop routing of the others.

### `widgetBase/renderTabWidgetsRequested`

Added 2026-07-13: widgets-owned render readiness API consumed by the tabs traverse `waitFor: "widgetsRendered"` (post-restore render trigger; see `tabs-writeback-readiness-contractdelta.md` §6 and `writeback.md` §6.4).

Payload:

```js
{
  tabId: string,
  reason?: string,
  timeoutMs?: number
}
```

Result: `Promise<{ ok, total, rendered, failed, errorCode?, errorMessage? }>`.

Flow:

- Select the tab's frames from `_KDB.state.widgets.base` with `placement === "onCanvas"` and `kind === "vis"` (text widgets need no render; topN helpers are excluded by kind).
- Per widget, in parallel: arm `_KDB.cognosAPI.async.whenRenderComplete`, trigger `_KDB.cognosAPI.widgets.renderWidget`, then await completion with a 2.5s default cap per widget.
- A positive `payload.timeoutMs` overrides that per-widget cap for the requesting operation. `dashboardPdf` uses 12s for capture/restore parity; callers that omit it retain the 2.5s default.
- The caller guarantees the tab is currently active; this action never activates tabs, never mutates widget state and commits no history.
- Failures are per-widget and non-fatal (`ok: false` with counts); callers treat them as degraded.

### `widgetBase/move`

Mode actions:

```js
{
  type: "widgetBase/enableMove" | "widgetBase/setMoveMode",
  widgetId: string,
  payload: {
    mode: "default" | "oneShot" | "persistent",
    reason: "settingsPanel" | "toolbar" | "historyReplay" | string,
    isHistoryReplay: boolean
  }
}
```

`enableMove` / `setMoveMode` arm or disarm the move interaction owned by `widgetBase`. They may initialize draggable behaviour, move handles, grid helpers and runtime-only start snapshots, but they do not write durable layout and do not commit history. `oneShot` disables move mode after the next final move; `persistent` stays armed until `default`/disable.

Armed move keeps the shell inside the dropbox padding box for the whole gesture and on the final layout. The box is the dropbox element's `clientWidth` / `clientHeight` in layout CSS pixels, remeasured on every drag event. jQuery UI `containment` is off; the clamp writes `ui.position` only. The shell's right and bottom edges may sit on the inner edges of that box. The move handle may paint outside the box. Armed move converts the pointer delta into layout pixels before the client-box clamp. `scaleX` / `scaleY` are `readElementScale` on the dropbox, measured once at gesture start. `x` and `y` are the gesture-start layout plus the `pageX` / `pageY` delta divided by those scales. Width and height stay at the gesture start. The clamp then runs as today and still does not divide. At scale 1 the division changes nothing. Drop still divides by the same scale. History replay and take-from-launchpad do not use this gesture path. See `widgetBase-gesture-scale-contractdelta.md`.

Payload:

```js
{
  fromLayout: { x: number, y: number, width: number, height: number },
  toLayout: { x: number, y: number, width: number, height: number },
  isFinal: boolean,
  isHistoryReplay: boolean
}
```

Only final commits write state and history. In-flight drag movement may update DOM optimistically but keeps durable state unchanged until final confirmation. On interaction stop, `widgetBase` dispatches its own final `widgetBase/move` action with flat `fromLayout` / `toLayout` `{ x, y, width, height }`. On final success, write `layout`, call `setLayoutPosition` and commit `widget_layoutMove` with `old`/`new` frames `{ widgetId, x, y, width, height }` unless `isHistoryReplay`.

### `widgetBase/resize`

Mode action:

```js
{
  type: "widgetBase/resizeToggle",
  widgetId: string,
  payload: {
    enabled: boolean,
    widgetType: "text" | "live" | "vis" | string | null,
    reason: "settingsPanel" | "toolbar" | "historyReplay" | string,
    isHistoryReplay: boolean
  }
}
```

`resizeToggle` arms or disarms the resize interaction owned by `widgetBase`. It may initialize resizable behaviour, handles, grid helpers, min-size constraints and runtime-only start snapshots, but it does not write durable layout and does not commit history. Text widgets use text min-size constraints (100×50); live/visualization widgets use visualization min-size constraints (300×300). Armed resize uses the same dropbox padding box as armed move: jQuery UI `containment` is off, and the clamp writes `ui.position` and `ui.size` on every resize event, remeasured from the dropbox `clientWidth` / `clientHeight`. East, south, and southeast change width and/or height only; `x` and `y` stay at the gesture-start layout. North and northeast may change `y` and keep `x`. West and southwest may change `x` and keep `y`. Northwest may change `x` and `y`. Every axis keeps the rect inside the box and must not shrink below the minimum size. The axis is the resizable instance `axis` string, not `ui.axis` (jQuery UI 1.13 does not put `axis` on `ui`; a missing axis must not be treated as north). Resize handles may paint outside the box. Armed resize converts the pointer delta into layout pixels on the active axes only, then runs the same client-box clamp. East, south, and southeast still do not change `x` or `y`. jQuery `minWidth` and `minHeight` are 0 so `_respectSize` cannot skip the resize callback. The widgetBase minimum stays in the clamp. The 2px inset between drop's border-box and this client-box is unchanged. See `widgetBase-gesture-scale-contractdelta.md`. jQuery UI adds class `ui-resizable` on first arm and leaves it after disarm. `jquery-ui.css` sets `.ui-resizable { position: relative }`. The shell stays `position: absolute` for the life of that class, including after resize is disarmed, so `left`/`top` remain dropbox coordinates. `KDB3/css/widgets/widgetVis.css` overrides with `.page .widget.ui-resizable` and the `liveWidget` / `textWidget` forms. A relative shell joins normal flow and shifts later shells by its height delta. History replay does not use this gesture clamp. While armed (`.resizable-div.resizable-active`), KDB jQuery UI handles (`.ui-resizable-handle`) stack above the open settings bar via `z-index: 10020 !important` in `KDB3/css/widgets/widgetVis.css` (beats inline jQuery `zIndex: 90` and the settings stacking context `9999`). Settings dropdowns remain inside that context and do not paint above the handles. Do not raise Cognos `.resizeEdge` (`contracts/_archive/widgetBase-resize-handle-stacking-contractdelta.md`). A Cognos-selected shell (`.widget.nodeSelected`) stacks above sibling shells inside the dropbox at `z-index: 2`. That shell z-index does not change the open settings context at 9999, the dropdowns trapped in it, or armed handles at 10020.

Payload:

```js
{
  fromLayout: { x: number, y: number, width: number, height: number },
  toLayout: { x: number, y: number, width: number, height: number },
  isFinal: boolean,
  isHistoryReplay: boolean
}
```

Same confirmation discipline as `move`. On interaction stop, `widgetBase` dispatches its own final `widgetBase/resize` action with flat `fromLayout` / `toLayout` `{ x, y, width, height }`; commits `widget_layoutResize` only after final confirmed layout. Committed `old`/`new` frames include `{ widgetId, x, y, width, height }` unless `isHistoryReplay`.

### `widgetBase/applyColour` / `widgetBase/setColour`

Payload:

```js
{
  optionValue: string,
  toColour: string | null,
  widgetType: "text" | "vis" | "live" | null,
  isHistoryReplay: boolean
}
```

Applies shell/background colour as a consequence of a `widgetSettings` value commit. `optionValue` is the preferred caller input from the settings dropdown; `toColour` is accepted as a compatibility alias. `fromColour` is not part of the public contract because the old value and history step are owned by `widgetSettings`.

On success, `widgetBase`:

- resolves `optionValue` / `toColour` to the effective colour token/hex value;
- writes the widget shell/root background;
- mirrors the colour to Cognos widget property `fillColor` when the wrapper is available;
- for text widgets only, applies the legacy-compatible header class sync for `fill-customColor*` where required;
- writes the resulting colour mirror to `_KDB.state.widgets.base.byId[widgetId].colour`.

`widgetBase` does not commit `widget_colourSet` for new user actions. Colour undo/redo replays through `widgetSettings` so the same settings commit path re-applies the consequence.

### `widgetBase/remove`

Payload:

```js
{
  reason: "user" | "contentCleanup" | "historyReplay" | "destroy",
  isHistoryReplay: boolean
}
```

`remove` means true frame removal/disposal, never launchpad parking. Parking/hiding is always `routeToLaunchpad`.

Reason rules:

| Reason | Behaviour |
|---|---|
| `user` | Dispatch content cleanup, remove/detach shell according to available Cognos/DOM capability, clean runtime, write `placement: "removed"` + `lifecycle: "disposed"`, commit `widget_removed`. |
| `contentCleanup` | Cleanup requested by a content owner after content-level disposal; base removes only after the content owner has confirmed it no longer needs the shell. No parking. |
| `historyReplay` | Apply replayed removed state and cleanup runtime; no new history. |
| `destroy` | Runtime cleanup only during module teardown; no user history and no attempt to park. |

TopN claim: for a removed frame of `kind: "vis"` (not a TopN helper) `widgetBase` dispatches `widgetTopN/cleanup { ownerVisId, reason: "remove" | "destroy", clearHelperBinding: true, releaseClaim: true }` through `_KDB.api.widgetTopN.dispatch` after `removeSucceeded`. It is not awaited and never changes the remove result: a missing, disposed, throwing or failing widgetTopN is logged at most. The owner's claim is held until the helper clear has finished, so another owner resolving in that window can report `WIDGET_TOPN_NO_HELPER_AVAILABLE`.

Idempotence: the frame stays in state with `placement: "removed"`. A repeated `remove` of a widget whose frame is already `removed` returns `{ ok: true, skipped: true, widgetId, placement: "removed", reasonCode: "WIDGET_BASE_ALREADY_REMOVED" }` and dispatches nothing (no widgetVis dispose, no TopN cleanup, no second `widget_removed` step). Nothing in the app dispatches `widgetBase/remove` today (console only), and `widget_removed` has no replay handler, so it cannot be undone.

### `widgetBase/reportError`

Payload:

```js
{
  errorCode: string,
  errorMessage: string,
  operation: string
}
```

Records either a module-level error or a per-widget error depending on `widgetId`. Reducer remains pure; effects log at the boundary. The internal reducer action is `widgetBase/errorRecorded`.

## 7. Launchpad Route Resolution

`resolveLaunchpadRoute(widgetDescriptor)` is a pure helper in `widgetBase/launchpadRoute.js`. Boundary effects such as Cognos discovery first build a serializable descriptor; the route helper receives only that descriptor plus static channel config and does not receive `_KDB`.

```js
{
  shouldRoute: boolean,
  reasonCode: string | null,
  kind: "text" | "vis" | "datatable" | "topN" | "other",
  role: "primary" | "topNHelper" | "otherResource",
  launchpadPad: "text" | "visualization" | "dataTables" | "topN" | "otherResources" | null,
  tabId: string,
  tabHandle: number
}
```

Routing rules:

| Source widget evidence | Target route |
|---|---|
| Host widget / `kdb3widget` / `_KDB.elements.kdbWidget` | `shouldRoute: false`, reason `HOST_WIDGET` |
| Title normalized to `writebacktable` / `writebacktabel` / `writebacktabel_get` / `writebacktabel_set` | `shouldRoute: false`, reason `WRITEBACK_TABLE` |
| Descriptor stamp `launchpad === false` (from `tables.js` row `launchpad: false` whose `name` matches visTitle) | `shouldRoute: false`, reason `LAUNCHPAD_DISABLED` |
| Cognos type `WIDGET.TEXT` or drag type `text` | `kind: "text"`, pad `text` |
| Cognos visual type `LINE` or recognized chart/visualization content | `kind: "vis"`, pad `visualization` |
| List/hierarchy widget with a non-empty title, excluding writeback | `kind: "datatable"`, pad `dataTables` |
| List widget without a title during startup discovery, restore, or explicit TopN helper claim | `kind: "topN"`, `role: "topNHelper"`, pad `topN` |
| Direct user drop of a LIST without explicit TopN helper claim | `kind: "datatable"`, pad `dataTables` |
| Anything else eligible for parking | `kind: "other"`, `role: "otherResource"`, pad `otherResources` |

All route targets are per tab. If `tabId` cannot be resolved from the frame, drop payload, Cognos tab content, or launchpad metadata, the route fails with `WIDGET_BASE_TAB_UNRESOLVED`; it does not fall back to a global slot.

## 8. Readers / Writers

Published selectors from `widgetBase/state/selectors.js` (also `readCanvasWidgetsByTab(_KDB, tabId)`, cloned canvas-placed frames of a tab):

| Selector | Reads | Returns |
|---|---|---|
| `readWidgetBaseState(_KDB)` | `_KDB.state.widgets.base` | Cloned base subtree or `undefined`. |
| `readFrame(_KDB, widgetId)` | `_KDB.state.widgets.base.byId[widgetId]` | Cloned frame or `undefined`. |
| `readWidgetsByTab(_KDB, tabId)` | `byId[*].tabId` | Array of cloned frames for a tab. |
| `readPlacement(_KDB, widgetId)` | frame placement fields | `{ placement, launchpadPad, launchpadSlotKey, layout }` or `undefined`. |
| `readAllWidgetIds(_KDB)` | `Object.keys(byId)` | Array of widget ids. |
| `readWidgetShell(_KDB, widgetId)` | owner document `getElementById(widgetId)` | The widget shell element or `null` (the `view/resolveWidgetShell.js` lookup; used by widgetTopN helper placement). |

Internal writer/reducer actions:

| Action type | Purpose |
|---|---|
| `widgetBase/mountStarted` | Initialize state/runtime and set module lifecycle `initializing`. |
| `widgetBase/mountSucceeded` | Set module lifecycle `ready`. |
| `widgetBase/registerFrame` | Create/update a frame record with serializable metadata. |
| `widgetBase/markPending` | Set `pending` marker and optional `opSeq`. |
| `widgetBase/placeOnCanvasSucceeded` | Write `placement: "onCanvas"`, layout and lifecycle `ready`. |
| `widgetBase/routeToLaunchpadSucceeded` | Write `placement: "inLaunchpad"`, pad/slot and lifecycle `ready`. |
| `widgetBase/removeSucceeded` | Write `placement: "removed"` and lifecycle `disposed`. |
| `widgetBase/errorRecorded` | Record `errorCode` / `errorMessage` and lifecycle `error`. |
| `widgetBase/destroy` | Module lifecycle `disposed`; per-frame runtime already cleaned. |

Reducers are pure and perform no DOM, Cognos, event or history effects.

## 9. Events

Subscribed event:

| Event | Type | Emitter | Subscriber | Payload |
|---|---|---|---|---|
| `canvas:dropValidated` | fact | `dragDrop` | `widgetBase` | Serializable validated drop payload from `dragDrop`. |

`widgetBase` subscribes during `mount()` and stores the unsubscribe handle under `_KDB.runtime.widgetBase.subscriptions.dropValidated`.

Emitted events: none in this tranche. A fact-event is added only when a real external consumer appears and `eventSubscribe.md` is updated.

Required catalog delta before implementation: `architecture/eventSubscribe.md` must name `widgetBase` as the `canvas:dropValidated` subscriber.

## 10. Dependencies

- `_KDB` as injected boundary input.
- `_KDB.events` for subscribing to `canvas:dropValidated`.
- `_KDB.api.launchpad.getState()` and published launchpad selectors, especially `readLaunchpadReady`, `readLaunchpadSlotMeta` and selector config. No reads from `_KDB.runtime.launchpad`.
- `_KDB.api.launchpad.dispatch({ type: "launchpad/waitUntilReady", payload })` for Promise-based readiness waiting. `widgetBase` must not await `launchpad` by reading `_KDB.runtime.launchpad.pendingPromises`.
- `_KDB.api.launchpad.dispatch({ type: "launchpad/readSlotWidgets", payload })` for ordered widget-id enumeration during `dropCreate` shell claim. `widgetBase` applies its own eligibility checks after receiving ids; launchpad does not return DOM refs or eligible-only lists.
- `_KDB.api.widgetText`, `_KDB.api.widgetVis`, `_KDB.api.widgetDataTable`, `_KDB.api.widgetTopN` when mounted; missing content owners make `dropCreate` fail and rollback.
- `_KDB.api.widgetSettings` when mounted for post-drop settings startup: `widgetSettings/placeControls` and `widgetSettings/seedDefaults` after successful `contentCreate`. Missing or failed settings startup does not make shell placement/content creation fail. For colour dropdowns, `widgetSettings` owns the canonical value/history and dispatches `widgetBase/applyColour` / `widgetBase/setColour` as the consequence-owner.
- `_KDB.services.history.pushCommittedStep(step)` for committed base history.
- `_KDB.cognosAPI.canvas.findCanvasContent()` for startup discovery.
- `_KDB.cognosAPI.canvas.setLayoutPosition(...)` only after a production wrapper exists. If absent, implementation may perform DOM placement but must not claim Cognos layout mirror success; CP-2 must record this integration gap before route/drop paths are accepted.
- `_KDB.cognosAPI.tabs.getTabsContent()` for startup discovery/tab correlation where available.
- Current tab/config selectors when a tabs owner publishes them; until then, use Cognos/tab content evidence and launchpad metadata.

Deep files receive dependencies through AMD imports and controller options. They do not discover `_KDB` through `window`.

## 11. Cognos Touchpoints

| Touchpoint | Context | State mirror owner |
|---|---|---|
| `_KDB.cognosAPI.canvas.findCanvasContent()` | Startup `routeAllToLaunchpad` discovery of current canvas widgets. | `widgetBase` records only serializable frame metadata. |
| `_KDB.cognosAPI.tabs.getTabsContent()` | Resolve widget ids and tab membership from Cognos spec/layout content. | `widgetBase` stores `tabId` and `tabHandle`. |
| `_KDB.cognosAPI.canvas.setLayoutPosition(widgetId, layout)` | Confirm move/resize/drop placement in Cognos layout when a production wrapper exists. | `widgetBase` mirrors confirmed `layout`; absence of the wrapper is a CP-2 integration gap, not a reason to invent a deep Cognos call inside `widgetBase`. |
| Cognos widget DOM id / shell element | Identity and shell movement. | `widgetBase` stores id; DOM refs stay runtime-only. |

No Cognos binding, datasource, slot mapping, render-wait, focus-mode or drillthrough touchpoints belong to `widgetBase`.

## 12. DOM Boundaries

`widgetBase` owns widget shell DOM movement and base decorations required for move/resize/colour. It may move a shell between:

- the owning canvas/dropbox DOM target for `placement: "onCanvas"`;
- a launchpad slot element resolved from launchpad metadata/selectors for `placement: "inLaunchpad"`.

Launchpad DOM target resolution for moving/parking shells:

1. Read slot metadata with `readLaunchpadSlotMeta(_KDB, padKey, tabId)`.
2. Read launchpad selectors (`hideSpotSelector`, `rootSelector`, `slotSelector`) from launchpad selector config.
3. Resolve the launchpad root from a documented mount root or owner document.
4. Query within that root for `[data-kdb-launchpad-pad="<padKey>"][cor_page_id="<tabId>"][cor_page_index="<childIndex>"]`.
5. Store the live slot element only under `_KDB.runtime.widgetBase.byId[widgetId].domRefs.launchpadSlotEl`.

Launchpad widget-id discovery for drop claims:

1. Call `launchpad/readSlotWidgets` for the target pad/tab.
2. Iterate returned `widgets` in launchpad DOM order.
3. Resolve each candidate shell by id inside `widgetBase`.
4. Apply `widgetBase` eligibility (`isHostWidget`, drag-source guard, Cognos content presence and any base-owned shell checks).
5. Claim the first eligible shell. No slot child scanning happens in `widgetBase`.

Move and resize grid helpers may use one unscoped `document.querySelectorAll` of `_KDB.elements.selectors.dragDrop.pageTemplateSelector`, with chrome fallback `.page.pagetemplateIndicator`, to add or remove `KDB_absoluteLayoutGrid` for that gesture only. The indicator is not the shell ancestor and is not the launchpad mount-root lookup. This is not a new `_KDB.api.dragDrop` method.

Forbidden:

- unscoped `document.querySelector` except for a documented mount-root lookup and the move/resize page-grid lookup above;
- reading `_KDB.runtime.launchpad.domRefs`;
- scanning launchpad slot children for discovery in `dropCreate` (no `claimFirstEligibleShellInSlot`; claim is `readSlotWidgets` ids + `claimShellById`);
- storing DOM in `_KDB.state`;
- content modules moving widget shells directly.

## 13. History Behaviour

History service is called only after confirmed successful effects. Steps are JSON-serializable and keyed by stable `widgetId`.

Replayability in this tranche means replay within the same Cognos dashboard/spec identity context where the same Cognos widget DOM ids still resolve. Cross-session remapping is out of scope.

| Action | History |
|---|---|
| `dropCreate` | Commit `widget_canvasDrop` after shell placement and successful `contentCreate`; do not wait for `widgetSettings/seedDefaults`, `widgetVis/waitUntilContentReady`, binding or render. |
| `routeToLaunchpad` | Commit `widget_launchpadTransfer` for user/content-request routes only. No startup/rollback/replay history. The committed `old` frame must include enough pre-transfer canvas state for undo (`placement`, `layout`, `lastCanvasLayout`, `tabId`, `tabHandle`, `kind`, `role`, and any route hints needed to take the same shell back). The committed `new` frame must use the resolved post-transfer route (`launchpadPad`, `launchpadSlotKey`, `tabId`) rather than the pre-transfer frame snapshot. |
| `takeFromLaunchpad` | Commit `widget_launchpadTransfer` for user-visible take only. Replay calls use `reason:"historyReplay"` and must not commit a second transfer step. |
| `enableMove` / `setMoveMode` | No history. These actions only arm/disarm move interaction and store runtime-only interaction state. |
| `resizeToggle` | No history. This action only arms/disarms resize interaction and stores runtime-only interaction state. |
| `move` | Commit `widget_layoutMove` on final confirmed layout only; coalesce in-flight drag. `old`/`new` frames: `{ widgetId, x, y, width, height }`. |
| `resize` | Commit `widget_layoutResize` on final confirmed layout only; coalesce in-flight resize. `old`/`new` frames: `{ widgetId, x, y, width, height }`. |
| `applyColour` / `setColour` | No `widgetBase` history for new user actions. `widgetSettings` owns colour settings history and calls `widgetBase` only to apply/mirror the consequence. |
| `remove` | Commit `widget_removed` only for user removal if implemented in this tranche. |
| rollback/error/destroy/startup route-all | No history. |

`widget_launchpadTransfer` requires an owner replay handler registered under `widgetBase` (`historyReplayHandlerContribution` → `core/bootstrap/registerReplayHandlers.js` → `services.history.registerReplayHandler`). Replay semantics:

- **Undo** of a transfer whose `new.placement === "inLaunchpad"` dispatches `widgetBase/takeFromLaunchpad` with `reason:"historyReplay"` and `isHistoryReplay: true`, using the serializable `old` canvas frame/layout and the stable `widgetId` from `step.old`.
- **Redo** dispatches `widgetBase/routeToLaunchpad` with `reason:"historyReplay"` and `isHistoryReplay: true`, using the serializable `new` launchpad route from `step.new`.
- After a successful base undo back to canvas, the replay handler delegates to `widgetSettings` through `_KDB.api.widgetSettings.dispatch({ type: "widgetSettings/placeControls", ... })` and then `widgetSettings/restoreCommittedSettings` with `isHistoryReplay: true` / `source: "historyReplay"` so settings UI and confirmed values are re-applied from `_KDB.state.widgets.settings` without pushing a new history step.
- After a successful base redo to launchpad, the replay handler delegates to `widgetSettings/cleanupWidgetControls` with `isHistoryReplay: true`.
- Delegation to `widgetSettings` applies when `requestedBy: "widgetSettings"` is present on the committed frame (settings delete/reset) and whenever settings controls were mounted before the forward transfer.
- `widgetBase` does not call `widgetVis` during delete replay; vis rebind is delegated through `widgetSettings/restoreCommittedSettings`. Vis restore failure does not rollback shell placement and must not block the history pointer when settings UI restore succeeded.
- Replay must not call `_KDB.services.history.pushCommittedStep`; it applies the existing step only.

Registration and implementation file: `history.js` (`createWidgetBaseHistoryReplayHandler` accepts `widget_canvasDrop`, `widget_launchpadTransfer`, `widget_layoutMove` and `widget_layoutResize`; canvas-drop replay and launchpad-transfer replay (`undoLaunchpadTransfer` / `redoLaunchpadTransfer`) live in the same file).

The `widgetBase` entry of `core/bootstrap/featureManifest.js` must list `widget_launchpadTransfer` next to `widget_canvasDrop` (same contribution).

`widget_layoutMove` / `widget_layoutResize` replay semantics:

- **Undo** dispatches `widgetBase/move` or `widgetBase/resize` via `_KDB.api.widgetBase.dispatch` with `isFinal: true`, `isHistoryReplay: true`, `reason: "historyReplay"`. `toLayout` is derived from `step.old` (undo) or `step.new` (redo); `widgetId` is read from the active frame.
- Replay must not call `_KDB.services.history.pushCommittedStep`; it applies the existing step only.
- Replay success means durable `layout`, Cognos `setLayoutPosition`, and reducer state updated via the same path as user move/resize.
- Handler registration follows the same `historyReplayHandlerContribution` + manifest `replayKeys` pattern as `widget_canvasDrop`.

## 14. Error Taxonomy

| Code | Meaning |
|---|---|
| `WIDGET_BASE_MOUNT_FAILED` | Module mount failed. |
| `WIDGET_BASE_DROP_FAILED` | Drop create failed before rollback outcome was known. |
| `WIDGET_BASE_CONTENT_CREATE_FAILED` | Content owner rejected or returned failure. |
| `WIDGET_BASE_ROLLBACK_FAILED` | Failed to return a partially created shell/frame to launchpad. |
| `WIDGET_BASE_LAUNCHPAD_NOT_READY` | Route requested before launchpad readiness. |
| `WIDGET_BASE_LAUNCHPAD_TARGET_MISSING` | Slot metadata or DOM target missing. |
| `WIDGET_BASE_TAB_UNRESOLVED` | No reliable tab id for a route. |
| `WIDGET_BASE_WIDGET_ID_MISSING` | Cognos/DOM id could not be resolved. |
| `WIDGET_BASE_WIDGET_ID_CONFLICT` | Envelope widget id conflicts with source/payload widget id. |
| `WIDGET_BASE_WIDGET_SKIPPED` | Host/writeback/ineligible widget skipped intentionally. |
| `WIDGET_BASE_COGNOS_LAYOUT_FAILED` | `setLayoutPosition` or equivalent Cognos layout effect failed. |
| `WIDGET_BASE_DESTROY_FAILED` | Destroy cleanup boundary caught an error. |

Errors are logged once at the boundary with operation context. Foreign state is never written on error.

## 15. Supersession

Each per-widget operation gets an `opSeq` from `_KDB.runtime.widgetBase.byId[widgetId].opSeq`. Async effects capture the current value and check it after every awaited boundary. If a newer operation has superseded it, the older continuation returns `{ ok: false, stale: true }`, does not write state, does not move DOM, and does not commit history.

Abortable work stores its controller under the per-widget `abortControllers` bucket. Starting a new operation of the same kind aborts the prior controller where safe.

## 16. Folder Layout

As built after the Phase 1 module-template rework (27 files; one concern per file, no per-function files):

```txt
KDB3/js/dashboard/widgets/widgetBase/
  __orchestratorWidgetBase.js   # shim: re-exports index.js (path kept for KDB.js)
  index.js            # createWidgetBaseController: mount/dispatch/destroy, ROUTES table, drop/tabs subscriptions, startup route-all
  config.js           # launchpad channels, skip reasons, chart types, writeback titles, host widget id, labels
  state.js            # ACTION_TYPES, initial state, frame reducer, normalizeDispatchResult
  state/selectors.js  # published read selectors (readWidgetBaseState, readFrame, readWidgetsByTab, readCanvasWidgetsByTab, readPlacement, readAllWidgetIds, readWidgetShell)
  runtime.js          # ensureWidgetBaseRuntime, ensureWidgetBaseWidgetRuntime
  launchpadRoute.js   # resolveLaunchpadRoute (descriptor -> kind/role/pad, skip reasons), resolveClaimedWidget, readPadShellEligibility
  discovery.js        # discoverCanvasWidgets: canvas item scan, descriptors, ownership/shell checks
  canvas.js           # drop workflow (handleDropCreate), remove, colour, move/resize and move-mode handlers, rollbackWidgetBaseOperation
  launchpadTransfer.js# routeToLaunchpad / takeFromLaunchpad handlers and pre-transfer cleanup
  tabWidgets.js       # routeAllToLaunchpad, ensureTabWidgetsRouted, renderTabWidgetsRequested
  restore.js          # parameterSetReset / parameterSetRestore handlers
  history.js          # widget_* history frames and the replay handler
  effects.js          # content-owner dispatch (create/dispose/ensureObservers/placeControls), host layout and colour writes
  view/
    resolveWidgetShell.js  # shell lookup and claim (frozen external path)
    placement.js           # canvas/dropbox placement, layout styles
    colour.js              # effective colour resolution and sync
  interaction/
    interactionRuntime.js  # per-widget interaction runtime, grid overlay, min sizes
    move.js                # jQuery UI draggable binding and move gesture
    resize.js              # jQuery UI resizable binding and resize gesture
    pointerGeometry.js     # CSS length parsing, DOM layout read, pointer/axis geometry
  slotStock/               # tab-mutation rebuild on destination slot stock (see tabs contract)
    prepare.js             # prepareTabMutation: plan the rebuild/rollback rows
    guard.js               # runId guard and frame snapshots (tabMutationSnapshots)
    serialize.js           # serialize live widget frames per tab
    placeEntries.js        # place restored entries on slot stock (content create dispatch)
    apply.js               # applyTabMutation: duplicate/delete/restore/move variants
    rollback.js            # restoreTabMutationSnapshot
```

`widgetBase` emits no events and has no `events/` folder.

## 17. Bootstrap Registration

Production bootstrap registration is needed after CP-2 but is not implemented in this contract-writing step. `KDB.js` does not need to `await _KDB.api.launchpad.mount()` before mounting `widgetBase`; `widgetBase.mount()` owns its readiness wait through the launchpad public dispatch action.

Required integration target:

- import `./dashboard/widgets/widgetBase/__orchestratorWidgetBase.js` from `KDB.js` or the dashboard feature orchestrator once the project has a widget-domain registration point;
- register `_KDB.api.widgetBase`;
- mount after `launchpad.mount()` has been started and before content modules need base routing; `widgetBase.mount()` must await `launchpad/waitUntilReady` before `routeAllToLaunchpad`;
- destroy during root destroy before launchpad is destroyed, so widgetBase can clean subscriptions and runtime while launchpad DOM still exists.

If launchpad pad-config production code still exposes the old four pads, implementation must stop before `routeAllToLaunchpad` and apply the launchpad pad-config delta first.

## 18. Required Deltas Before Implementation

These are not optional implementation details:

- `architecture/stateOwnership.md`: replace monolithic `_KDB.state.widgets | widgets module` with per-owner widget subtrees or explicitly approve the blueprint exception for this tranche.
- `architecture/eventSubscribe.md`: name `widgetBase` as subscriber of `canvas:dropValidated`.
- `contracts/dragDrop.md`: document `widgetBase` as the owner that completes validated drops.
- `contracts/launchpad.md` / launchpad execution spec: ensure five per-tab pads exist in production (`text`, `visualization`, `dataTables`, `topN`, `otherResources`), `readLaunchpadSlotMeta` supports them, and `launchpad/readSlotWidgets` returns ordered widget-id metadata without eligibility or shell refs.
- `KDB3/js/dashboard/launchpad/config.js` (pad configuration): update during launchpad implementation/tranche before widgetBase production routing can run.
- `KDB3/js/core/cognosAPI/canvas.js`: either expose a rule-aligned `setLayoutPosition(widgetId, layout)` wrapper or approve DOM-only placement as a temporary integration limitation before CP-2 accepts move/resize/drop layout confirmation.

## 19. Out Of Scope

- Editing `.cursor/rules/`, templates or legacy trees.
- Content module state/content internals beyond dispatching `contentCreate` and cleanup requests.
- Settings values, panel state and settings history. `widgetBase` only orchestrates `widgetSettings/placeControls` and `widgetSettings/seedDefaults` after successful `contentCreate`.
- `widgetVis` focus-mode/maximize.
- TopN resolution, helper binding and result handling beyond parking helper shells in `topN`.
- Datatable data loading or table row reads.
- Binding services (`widgetBindingPlan`, `widgetBindingApply`).
- Cross-module integration tests.
- Parameter-set/writeback restore beyond accepting a stable existing `widgetId`.
- `widget_removed` replay handler (deferred).
- Visual content/binding restore during `widget_launchpadTransfer` replay.

## 20. Acceptance Checks

CP-1 is acceptable when:

1. Public API is exactly `{ mount, destroy, dispatch, getState }`.
2. Every public action payload above is implemented or explicitly deferred with a contract delta.
3. `_KDB.state.widgets.base` is the only state subtree written by `widgetBase`.
4. `_KDB.runtime.widgetBase` contains all non-serializable resources and has a complete cleanup path.
5. `widgetId` is always the Cognos DOM id and no KDB-generated id is introduced.
6. Launchpad routing uses the five target per-tab channels and skips host/writeback widgets.
7. `routeAllToLaunchpad` runs after launchpad readiness and commits no startup history.
8. Content modules request frame movement only through `widgetBase.dispatch`.
9. `contentCreate` failure follows the deterministic rollback rule.
10. After successful `contentCreate`, `widgetBase` starts settings startup through `widgetSettings` when available, but does not orchestrate default values and does not call `widgetVis/waitUntilContentReady` directly.
11. Settings startup failure does not rollback a successfully placed and content-created widget; it remains owned by `widgetSettings`.
12. `remove` never parks; parking uses `routeToLaunchpad`.
13. No code reads `_KDB.runtime.launchpad` or writes launchpad state.
14. `canvas:dropValidated` subscription is cleaned on destroy.
15. History is committed only after confirmed base/content effects and never on rollback/startup/replay or settings default seeding.
16. All lifecycle values are from `lifecycleVocabulary.md`.
17. Production files use AMD full-compact form and pass lints.
18. Settings-delete (reset control) produces exactly one `widget_launchpadTransfer` history step.
19. Undo of that step returns the shell to canvas, restores settings controls via `widgetSettings/placeControls`, and re-applies committed vis settings via `widgetSettings/restoreCommittedSettings`; redo parks the widget in launchpad and runs `widgetSettings/cleanupWidgetControls`.
20. `widget_launchpadTransfer` replay is registered through the manifest replay keys (`registerReplayHandlers`) and does not log `handler missing`.
21. Replay does not push a second history step.
22. When `requestedBy: "widgetSettings"`, undo must attempt vis rebind through `widgetSettings/restoreCommittedSettings`; acceptance passes when shell, settings UI, and vis binding restore succeed. Documented vis-restore failure after successful UI restore is settings-owned and does not fail the history pointer.
23. Armed move and resize keep the shell inside the dropbox `clientWidth` / `clientHeight` box with jQuery `containment` off. East, south, and southeast resize do not change `x` or `y`. Drop placement, history replay, and take-from-launchpad do not use that gesture clamp. At canvas scale other than 1, armed move keeps the pointer on the widget and can place the shell on the client edge. Armed resize changes size by the scaled pointer delta. The 2px inset between the drop border-box and the client-box is not part of this item. Before the minimum clamp, west and north keep the opposite edge; after the clamp hits the minimum, the existing west/north overshoot may still shift that edge.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-06-06 | `Stub -> Draft CP-1` | `<pending>` | Full `widgetBase` contract expanded for composed-port tranche; includes five-channel launchpad model, widgetId rule, rollback, DOM boundary and action payloads. |
| 2026-06-07 | `Draft CP-1 -> Settings-startup aligned draft` | `<pending>` | Added minimal post-drop `widgetSettings/placeControls` + `seedDefaults` orchestration after successful `contentCreate`; `widgetBase` does not call `widgetVis/waitUntilContentReady` directly and does not rollback on settings startup failure. |
| 2026-06-08 | `Settings-startup aligned draft -> Colour ownership aligned draft` | `<pending>` | Clarified that colour value/history belongs to `widgetSettings`; `widgetBase` only applies/mirrors shell/Cognos colour, accepts dropdown `optionValue`, and does not commit new colour history. |
| 2026-06-11 | `Colour ownership aligned draft -> Reset-to-launchpad boundary draft` | `<pending>` | Confirmed settings-delete/reset uses `widgetBase/routeToLaunchpad` with `reason: "user"`; `widgetSettings` orchestrates content/settings cleanup, while `widgetBase` owns only shell/frame transfer and `widget_launchpadTransfer` history. Added replay requirement: undo/redo of `widget_launchpadTransfer` must restore shell first, then delegate to settings/content owners for compound reset restore. |
| 2026-06-11 | `Reset-to-launchpad boundary draft -> Move-resize interaction draft` | `<pending>` | Added missing move/resize interaction actions (`enableMove`, `setMoveMode`, `resizeToggle`) as no-history `widgetBase` mode actions; final `move`/`resize` remain flat-layout history commits. |
| 2026-06-16 | `Launchpad-transfer replay CP-1 -> Vis restore on delete undo CP-1` | `user` | Settings-delete undo adds `restoreCommittedSettings`; vis rebind via `applyStartupSettings` with `source: historyReplay`; delete history remains base-owned. |
| 2026-09-10 | `§7 HideSpot skip for park leftovers` | PO vastenburg | `tables.js` `launchpad: false` on the three `parkFilter` leftovers. Discovery stamps the descriptor from `entry.name`; resolver stays `_KDB`-free and reads only `launchpad === false`. No leftover title literals in widgetBase JS. |
| 2026-09-11 | `§7 Writeback Get/Set leftover titles` | PO vastenburg | `WRITE_BACK_TITLES` adds `writebacktabel_get` / `writebacktabel_set`. No `tables.js` / persist. Delta: `writeback-get-set-leftover-titles-contractdelta.md`. |
| 2026-09-30 | `Move/resize dropbox clamp` | PO vastenburg | Armed move and resize stay in the dropbox client box. jQuery `containment` off. East/south/southeast do not change `x`/`y`. Cognos zoom ≠ 1 stays a known gap. Drop, history replay, and take-from-launchpad unchanged. |
| 2026-10-13 | `Gesture scale` | PO vastenburg | Closes the 2026-09-30 zoom gap for armed move and resize only. Pointer delta divided by `readElementScale` once at gesture start. jQuery resizable minimums are 0. The 2px border-box inset stays. Delta: `widgetBase-gesture-scale-contractdelta.md`. |

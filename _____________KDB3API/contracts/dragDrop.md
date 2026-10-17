# Module Contract: `dragDrop`

> Originally a CP-1 draft for a DIRECT PORT from legacy drag/drop. The module is now implemented
> in `dashboard/canvas/dragDrop/` (see the as-built layout in section 13). Sections 0, 1, 14 and 16
> keep the original porting rationale; where they say "does not exist yet" the as-built layout wins.

---

**Status:** `Draft`
**Owner module / service:** `dragDrop`
**Type:** `dashboard/canvas feature module with named interaction API`
**Authoring AI:** GPT-5.5, 2026-05-17
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Source:

```txt
legacy-redesign2:js/dashboard/canvas/dragDrop/
legacy-redesign2:js/dashboard/canvas/kdbControl/kennzahlenTree/bindKennzahlenTreeDragDrop.js
legacy-redesign2:js/dashboard/canvas/kdbControl/bindToolboxTextDragDrop.js
legacy-redesign2:js/dashboard/canvas/widgets/placeWidgetOnCanvas.js
```

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/canvas/dragDrop/
```

This is a direct port: preserve legacy native HTML5 drag/drop behavior and change only what the rules force. No `TEST/` sandbox, no browser harness, no production file changes before CP-1.

`dashboard/widgets/widgetBase/view/placement.js` (`placeWidgetOnCanvas`) is boundary evidence for coordinate conversion and placement semantics only. Final widget creation, placement, persistence, history, and widget-state writes stay with the future widgets/canvas owner API or an approved event boundary; they are not ported into `dragDrop` unless CP-1 explicitly expands scope.

## 1. Legacy Evidence

| Legacy file | Evidence used |
|---|---|
| `dragDrop/__dragDropOrchestrator.js` | Registers drag/drop state, runtime, avatar templates, dropbox setup, and a public object with `refreshDropboxes`, `startDrag`, `finishDrag`. |
| `dragDrop/startDragSession.js` | Native HTML5 dragstart path; builds serializable transfer payload; writes legacy `_KDB.state.canvas.dragDrop.session`; creates hidden source copy, active-source markings, custom avatar, document `dragover` tracking, and temporary 1x1 native drag image suppressor. |
| `dashboard/canvas/dragDrop/session.js` (`finishDragSession`) | Cleanup path for avatar DOM, active dropbox class, marked source classes, layout grid class, document `dragover` listener, temporary source copy, and session reset. |
| `dragDrop/setupDropboxes.js` | Discovers dashboard dropboxes, skips launchpad helper tabs, marks dropboxes with `kdb_dropbox="true"`, and binds `dragenter`, `dragover`, `dragleave`, `drop`. |
| `dragDrop/updateDragHover.js` | Drag-hover validation, drop-effect toggling, active dropbox class, avatar movement, and bounds checks during dragover. |
| `dragDrop/publishDropIntent.js` | Parses `dataTransfer`, resolves dropbox-local pointer/layout metadata, validates drop intent, removes temporary copy, emits legacy `WIDGET_DROP_VALIDATED` (`canvas:dropValidated`), and shows validation warnings. |
| `dashboard/canvas/dragDrop/dropboxes/validate.js` (`validateDropIntent`) | Validates real dropboxes, blocks launchpad helper tabs, accepts only `visualization` and `text`, checks bounds, and rejects labels that conflict with filter names. |
| `dragDrop/dropboxGeometry.js` | Resolves dropbox metrics, pointer offsets, rendered placement, and bounds checks from `clientX/clientY`, dropbox origin, drag anchor offset, widget size, and scale. |
| `dragDrop/createDragAvatars.js` | Creates hidden avatar templates for visualization/text using default dimensions and default widget backgrounds; stores template runtime. |
| `kdbControl/kennzahlenTree/bindKennzahlenTreeDragDrop.js` | Source binder: only `.jstree-leaf` anchors become draggable; parent nodes are blocked; payload includes code, display, title, langtext, kennzahlenTable, originId, and draggedElementType. |
| `kdbControl/bindToolboxTextDragDrop.js` | Source binder: only the text/comment toolbox button is draggable, with `draggedElementType: "text"` and `sourceKind: "toolboxTextButton"`. |
| `dashboard/widgets/widgetBase/view/placement.js` (`placeWidgetOnCanvas`) | Boundary evidence: final widget left/top is `client -> dropbox-local -> minus drag offset -> divide by scale -> clamp`; raw `clientX/clientY` must not become widget placement. |

Production evidence:

- Historical (at draft time): `dashboard/canvas/dragDrop/` did not exist and `KDB.js` did not register it. Today `KDB.js` imports `dashboard/canvas/dragDrop/index.js` and calls `_KDB.api.dragDrop.mount({})`.
- `metricsTree` already has a `createDragDropAdapter` that reads `_KDB.api.dragDrop` and expects `refreshDropboxes`, `startDrag`, and `finishDrag`.
- No production `widgets` owner/API is present in this tranche, so final drop handling is documented but not implemented here.
- Historical (at draft time): no `_KDB.utils.throttle`. Today `core/utils/` has no `throttle.js`; `KDB.js` bootstraps `core/utils/registerUtils.js`, which registers `convertUnitToPx`, `getTableConfigObject`, `readCurrentTab`, `waitFor`, `waitForElObserver` and `readableTextColorForHex`.

## 2. Purpose

`dragDrop` owns dashboard/canvas drag-session coordination for native HTML5 drag/drop: source-session transfer payloads, custom drag avatar runtime, dropbox hover validation, drop intent validation, and the approved boundary signal/API call that hands a validated drop to the widget/canvas owner.

It does not create widgets, move widgets, persist widget layout, write widget state, configure visualizations, update history, own kdbControl, own metricsTree, own filters, or own tabs.

## 3. Placement And Classification

Recommended CP-1 decision:

| Question | Recommendation |
|---|---|
| Q1 placement | `KDB3/js/dashboard/canvas/dragDrop/`. Legacy evidence is canvas-specific: dropboxes, canvas scale, helper-tab exclusion, avatar DOM, and widget placement boundary. |
| Core/split architecture | Do not create `core/dragDrop` or a core/dashboard split in this tranche. The legacy files do not show a reusable engine boundary clean enough to port separately without behavioral redesign. |
| Q2 classification | Feature module / canvas subsystem with a named interaction API under `_KDB.api.dragDrop`, not `_KDB.services.dragDrop`. |

The public API deviates from the feature-module dispatch default because source binders and the existing production `metricsTree` adapter require a narrow imperative interaction surface (`refreshDropboxes`, `startDrag`, `finishDrag`). Internally, state writes still go through a reducer/dispatch helper owned by `dragDrop`.

## 4. Ownership

- Canonical state subtree: `_KDB.state.dragDrop`.
- Canonical writer: `dragDrop` only, through internal reducer/dispatch.
- Foreign-write paths: none.
- Ownership-map update: `architecture/stateOwnership.md` will need a future explicit entry if CP-1 approves `_KDB.state.dragDrop`. This session must not edit that authority doc unless CP-1 expands scope.

Initial state shape:

```js
_KDB.state.dragDrop = {
  lifecycle: "idle",
  isDragging: false,
  session: null,
  lastValidation: null,
  mountedAt: 0,
  errorCode: null,
  errorMessage: null
};
```

Serializable session schema:

```txt
copyId: string | null
defaultHeight: number
defaultWidth: number
draggedElementType: string enum("visualization", "text")
dropboxId: string | null
offsetX: number
offsetY: number
originId: string | null
padKey: string enum("visualization", "text")
payload: serializable object
scaleX: number
scaleY: number
sourceKind: string enum("metricsTreeLeaf", "kennzahlenTreeLeaf", "toolboxTextButton", "unknown")
startedAt: number
```

Initial `session` value is always `null`; do not copy this schema literally into `initialState.js`.

Serializable `lastValidation` shape:

```txt
isValid: boolean
reasonCode: string | null
dropboxId: string | null
draggedElementType: string | null
validatedAt: number
```

Initial `lastValidation` value is always `null`. It must never contain DOM nodes, events, `DataTransfer`, jQuery objects, functions, or host objects.

Lifecycle subset: `idle`, `ready`, `error`, `disposed`.

Implementation must verify `idle`, `ready`, `error`, and `disposed` against `lifecycleVocabulary.md`. If `lifecycleVocabulary.md` does not explicitly allow `ready` or `disposed`, stop and escalate before implementation. Do not introduce local lifecycle terms inside `dragDrop`; if approved equivalents are needed, document the contract delta first.

`isDragging` / `session !== null` represents an active drag; no new lifecycle term is introduced for "active". Drop, cancel, and dragend clear `session`, set `isDragging: false`, and return the lifecycle to `ready` unless the module is disposed. Before mount/setup, the lifecycle may remain `idle`.

State must remain serializable. No DOM nodes, jQuery objects, listeners, subscriptions, AbortControllers, timers, promises, `DataTransfer`, events, or functions may live under `_KDB.state.dragDrop`.

## 5. Runtime

- Owner namespace: `_KDB.runtime.dragDrop`.
- Cleanup triggers: `finishDrag(event)`, invalid/cancelled drop, `destroy()`.

| Bucket | Shape / role |
|---|---|
| `domRefs` | `avatarEl`, `sourceCopyEl`, `hideSpotEl`, active source/source-node refs, and avatar-template refs. |
| `listeners` | Dropboxes and document/body listener cleanup records when AbortController cannot be used. |
| `subscriptions` | Expected empty in this tranche unless CP-1 expands event subscription scope. |
| `abortControllers` | Dropbox binding scope, document dragover scope, temporary native-drag-image cleanup scope if represented as abortable runtime. |
| `observers` | Expected empty. |
| `timers` | Temporary 1x1 native drag-image removal timer. |
| `pendingPromises` | Expected empty; no async flow beyond optional future owner boundary. |
| `adapters` | Optional owner-specific source adapters only if CP-1 keeps them inside `dragDrop`; default is source binders remain owner-side. |

Runtime also uses focused runtime objects:

```js
_KDB.runtime.dragDrop = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  dropboxesById: {},
  sourceRuntime: null
};
```

All document/window/body/dropbox listeners must have cleanup records and must be removed on `finishDrag`, invalid drop/cancel, and `destroy`. Runtime must not be reset before cleanup.

Helper-tab compatibility exception:

- Preferred helper-tab read path is `_KDB.api.launchpad.getState()` or an approved launchpad selector when available.
- If unavailable in this tranche, a temporary read of `_KDB.state.launchpad.helperTabIds` is allowed only as a CP-1 compatibility exception.
- That temporary read must be isolated in one focused helper file and must not spread through generic drag/drop code.

## 6. Public API

Recommended surface:

```js
_KDB.api.dragDrop = {
  mount: mount,
  destroy: destroy,
  refreshDropboxes: refreshDropboxes,
  startDrag: startDrag,
  finishDrag: finishDrag,
  getState: getState
};
```

Style: named interaction methods on `_KDB.api.dragDrop`, with explicit contract motivation. This avoids presenting native drag/drop source binders as dispatch clients and preserves the already-created production `metricsTree` adapter contract.

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Initializes `_KDB.state.dragDrop`, runtime buckets, avatar templates, and dropbox bindings. Returns `true`/`false`. |
| `destroy()` | Idempotent teardown. Sets `_isDisposed = true` first, then calls full runtime cleanup and dispatches disposed state. |
| `refreshDropboxes()` | Re-discovers dashboard dropboxes, skips helper tabs, registers drag/drop listeners with cleanup records, and returns `true`/`false`. |
| `startDrag(event, sourceInfo)` | Starts native drag session, writes serializable transfer payload, creates custom avatar, suppresses native drag image, and returns `true`/`false`. |
| `finishDrag(event)` | Ends/cancels session and removes avatar, source markings, temporary copy, grid class, document tracking, and state session. Returns `true`/`false`. |
| `getState()` | Returns `_KDB.state.dragDrop` snapshot; after disposal returns `undefined`. |

Mount / refresh idempotency:

- `mount()` must not duplicate avatar templates, dropbox listeners, document listeners, or runtime refs when called more than once.
- A second `mount()` must either refresh dropboxes/templates cleanly or return `true` with no duplicated runtime resources.
- `refreshDropboxes()` must remove or abort previous dropbox listener bindings before registering new ones; it must not accumulate duplicate `dragenter`, `dragover`, `dragleave`, or `drop` handlers.
- `destroy()` must be safe after partial mount failure and after an active drag session.

Disposed-state discipline follows `module-public-api.mdc`: after `destroy()`, reads return `undefined`, mutating/lifecycle methods no-op with one `console.warn`, and no disposed guard throws.

## 7. Readers / Writers

Published selectors from `dashboard/canvas/dragDrop/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readDragDropState(_KDB)` | `_KDB.state.dragDrop` | Full subtree snapshot or `undefined`. |
| `readDragDropReady(_KDB)` | `lifecycle` | `true` when `ready`. |
| `readDragSession(_KDB)` | `session` | Session copy or `null`. |
| `readIsDragging(_KDB)` | `isDragging` | Boolean. |
| `readLastValidation(_KDB)` | `lastValidation` | Last validation result copy or `null`. |

Internal action names:

| Action type | Purpose |
|---|---|
| `dragDrop/mountSucceeded` | Transition to `ready` and clear errors. |
| `dragDrop/dragStarted` | Store serializable session and set `isDragging: true`. |
| `dragDrop/dropValidated` | Store last validation result; session remains until cleanup. |
| `dragDrop/dragFinished` | Clear session and return to `ready`. |
| `dragDrop/error` | Store error details and lifecycle `error`. |
| `dragDrop/destroy` | Clear session and transition to `disposed`. |

No public writer helpers are exposed.

## 8. Events And Drop Boundary

Legacy emits `widgetEvents.WIDGET_DROP_VALIDATED`, whose string is `canvas:dropValidated`, after drop validation succeeds.

Recommended CP-1 decision:

- Preserve `canvas:dropValidated` for rule-alignment-only behavior.
- `dragDrop/events.js` is the emitter-owned constants file (`DROP_VALIDATED`).
- Add an `eventSubscribe.md` catalog entry before implementation, or explicitly approve deferring event emission until the widgets owner exists.

CP-1 must explicitly decide event catalog scope:

- **A. Approve narrow `eventSubscribe.md` update for `canvas:dropValidated`.** Then create `events/eventNames.js` and `dashboard/canvas/dragDrop/dropboxes/publish.js` (`publishValidatedDrop`).
- **B. Do not approve `eventSubscribe.md` update.** Then do not create event-emitting code; mark `publishValidatedDrop` as deferred and stop for a contract delta if drop completion cannot be represented.

Recommendation: choose A. Drag/drop without a validated-drop signal is incomplete, and this is a defensible fact-event because no widgets-owner API exists in this tranche.

If CP-1 does not approve the `canvas:dropValidated` catalog entry, do not create a partial `dragDrop` implementation. Stop before implementation and request a contract/spec delta.

Event summary:

```js
canvas:dropValidated
```

| Field | Contract |
|---|---|
| Type | fact |
| Emitter | `dragDrop` after successful validation |
| Confirmation point | `validateDropIntent` returned `{ isValid: true }`, temporary copy cleanup ran, and layout payload was resolved. |
| Subscribers | Future `widgets`/canvas owner; no production subscriber exists in this tranche. |
| Payload | JSON-serializable drop request: `draggedElementType`, `dropboxId`, `layout`, `originId`, `padKey`, `payload`, `sourceKind`, `startedAt`, `tabId`. |

For a valid drop, validation and `publishValidatedDrop` must occur before final session cleanup if the payload still depends on session/runtime data. Cleanup must always run afterward in a finally-style path.

If CP-1 does not approve an event catalog update, the execution spec must either stop before implementing event emission or explicitly defer `publishValidatedDrop` until a widgets/canvas owner tranche.

## 9. Dependencies

- `_KDB` (always).
- Dropboxes are discovered through the DOM selectors (`_KDB.elements.selectors.dragDrop`, catalogue fallback). `_KDB.elements.dashboardDropboxes()` and `closestBoundDropbox(target)` were never defined and are not read; `dropboxById(id)` is also never assigned.
- `_KDB.elements.toolboxTextDraggable()` only in the owner-specific toolbox binder if that binder is included.
- `_KDB.properties.visualizationsPropObj` and `_KDB.properties.textWidgetPropObj` for default dimensions.
- `_KDB.properties.filterPropObj` for legacy validation against filter labels.
- `_KDB.config` / table config only indirectly through source payload builders; dragDrop does not own metrics data.
- `_KDB.events` only for `canvas:dropValidated` if CP-1 approves the event catalog scope.
- `_KDB.cognosAPI.showToast` for legacy validation warnings where present.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, or legacy `_KDB.utilities`. Dimension conversion is ported into local pure helpers or a sanctioned `_KDB.utils` helper if one exists.

## 10. DOM Discipline

Selector config belongs under `_KDB.elements.selectors.dragDrop` when new selectors are needed. Existing host helper functions under `_KDB.elements.*` are legacy evidence and may be consumed only at the integration boundary documented above.

Live DOM refs belong under `_KDB.runtime.dragDrop.domRefs`.

`dragDrop` may create/manage:

- hidden avatar-template mount under the launchpad hide spot or a fallback hidden mount;
- custom visible avatar attached to `document.body`;
- temporary hidden source copy;
- temporary transparent 1x1 native drag-image suppressor;
- active source CSS classes;
- active dropbox CSS class;
- temporary page grid CSS class `KDB_absoluteLayoutGrid` on `.page.pagetemplateIndicator`. `widgetBase` move/resize gesture helpers may toggle this same class for the gesture only. That toggle is not a new `_KDB.api.dragDrop` method.

Native drag image suppression must happen during `dragstart` with `dataTransfer.setDragImage(transparentEl, 0, 0)` after transfer data is prepared. The temporary element must be removed via registered timer/cleanup.

Custom avatar behavior must preserve legacy: fixed positioning, pointer-events none, high z-index, source-offset tracking, default dimensions, canvas/dropbox scale, and cleanup on drop/cancel/destroy.

## 11. Coordinate And Placement Boundary

`dragDrop` owns coordinate evidence up to the validated drop payload:

```txt
clientX/clientY
-> dropbox-local pointer offset
-> minus drag anchor offset
-> rendered placement + scale metadata in payload
```

The widgets/canvas owner owns final placement:

```txt
rendered placement
-> divide by canvas scale
-> clamp within canvas bounds
-> append/place widget
-> persist layout/Cognos state/history
```

Do not use raw `clientX/clientY` as widget `left`/`top`. Do not port `dashboard/widgets/widgetBase/view/placement.js` (`placeWidgetOnCanvas`) into `dragDrop` without a CP-1 contract change assigning placement responsibility to `dragDrop`.

DataTransfer compatibility:

- Legacy writes the transfer payload to both `application/json` and `text/plain`.
- The direct port must preserve both keys unless browser compatibility or a rule conflict forces a change.
- If implementation cannot confirm those keys from the legacy evidence, stop and report the evidence gap before writing production code.

## 12. Source Binders

Default CP-1 recommendation: source binders remain owner-specific adapters and call `_KDB.api.dragDrop`.

Naming bridge: legacy `kennzahlenTree` source-binder behavior maps to the production `metricsTree` owner/adapter where applicable. Do not create a new `kennzahlenTree` dependency from `dragDrop` unless CP-1 explicitly approves it.

In this tranche, the only owner-specific source binders that may be specified are:

- As built: the metrics tree source binder is `dashboard/metricsTree/dragSource.js`; the toolbox text source binder is in `dashboard/canvas/kdbControl/framework/bindToolboxActions.js`. Both call `_KDB.api.dragDrop`.

Do not move general `kdbControl`, `kennzahlenTree`, or toolbox behavior into generic dragDrop code.

Rules to preserve:

- only `.jstree-leaf` metrics/kennzahl nodes are draggable;
- parent nodes are blocked with `preventDefault()`;
- metrics/kennzahl payload preserves `code`, `display`, `title`, `langtext`, `kennzahlenTable`/`metricsTable`, `originId`, and `draggedElementType` where present;
- toolbox drag source is only the text/comment button, with `draggedElementType: "text"` and `sourceKind: "toolboxTextButton"`.

## 13. Folder Layout

As built (`KDB3/js/dashboard/canvas/dragDrop/`):

```txt
KDB3/js/dashboard/canvas/dragDrop/
  index.js                    createDragDropController: mount, refreshDropboxes, startDrag, finishDrag, getState, destroy; registers _KDB.api.dragDrop
  config.js                   accepted element types, DOM attribute/class names, avatar asset paths, default widget dimensions
  events.js                   event name constants (DROP_VALIDATED = "canvas:dropValidated")
  state.js                    initial state + reducer for _KDB.state.dragDrop
  selectors.js                readDragDropState, readActiveSession
  session.js                  startDragSession, finishDragSession, parseTransferPayload
  avatar.js                   drag avatar templates and avatar movement
  dropboxes/
    bind.js                   bindAllDropboxes: discover dropboxes, skip helper tabs, bind dragenter/dragover/dragleave/drop
    rebind.js                 subscribeTabsChangedRebind: rebind dropboxes after tabs:changed
    lookup.js                 dropbox/helper-tab lookups against the host document
    geometry.js               dropbox metrics, pointer-in-dropbox, rendered placement, bounds checks
    hover.js                  dragenter/dragover/dragleave handling (active dropbox class, drop effect)
    validate.js               validateDropIntent (accepted type, bounds, filter-name conflict)
    publish.js                publishValidatedDrop: builds the payload and emits canvas:dropValidated
```

Runtime ownership (avatar DOM, source copy, listeners, timers) is created and released inside `index.js` via `core/utils/kit/runtime.js`; there are no separate `runtime/` or `effects/` folders.

`events.js` and `dropboxes/publish.js` (`publishValidatedDrop`) own the `canvas:dropValidated` event (see `architecture/eventSubscribe.md`).

No `core/dragDrop/` folder is created in this tranche.

## 14. Bootstrap Registration

Bootstrap registration in `KDB.js` is needed for production execution, but is explicitly deferred by this session unless CP-1 expands scope.

CP-1 scope expansion for utilities:

- Not carried out: no `throttle.js` exists in `core/utils/` and dragDrop does not use one. `KDB.js` does bootstrap `core/utils/registerUtils.js` (without a throttle helper).

Deferred dragDrop integration target:

- import `./dashboard/canvas/dragDrop/index.js`;
- call the orchestrator during feature registration before `metricsTree` mounts;
- call `_KDB.api.dragDrop.mount({})` during feature mounting;
- call `_KDB.api.dragDrop.destroy()` during root destroy.

Until bootstrap registration exists, `metricsTree` may warn that the drag/drop API is unavailable and drag is disabled.

## 15. Out Of Scope

- Creating, moving, placing, configuring, or persisting widgets.
- Porting `dashboard/widgets/widgetBase/view/placement.js` (`placeWidgetOnCanvas`) into `dragDrop`.
- Writing `_KDB.state.widgets`, `_KDB.runtime.widgets`, filters, tabs, launchpad, history, kdbControl, or metricsTree state.
- Reworking widget placement behavior beyond rule-alignment.
- Creating a core/shared dragDrop service.
- Porting full kdbControl, kennzahlenTree, widgets, canvas, launchpad, filters, tabs, or history behavior.
- Bootstrap registration in `KDB.js` unless CP-1 expands scope.
- Browser harness, TEST sandbox, cross-feature integration tests.
- Editing legacy files or architecture rules/templates.

## 16. CP-1 Decision Summary

| Question | Recommendation captured in this contract |
|---|---|
| Q1 placement | `KDB3/js/dashboard/canvas/dragDrop/`; no core/split architecture. |
| Q2 classification/API | Feature module/canvas subsystem with motivated named methods on `_KDB.api.dragDrop`. |
| Q3 state | Own `_KDB.state.dragDrop` for serializable lifecycle/session snapshot; active drag is `isDragging/session`, not a lifecycle term. |
| Q4 runtime | Own `_KDB.runtime.dragDrop` for avatar DOM, source copy, dropbox refs, listeners, timers, and transient pointer/source data. |
| Q5 source binders | Owner-specific by default; generic dragDrop exposes only the narrow public interaction API. |
| Q6 native image/avatar | Preserve transparent 1x1 native drag-image suppression and custom fixed avatar attached to `document.body`. |
| Q7 coordinates/placement | Preserve coordinate payload flow; final widget placement stays outside dragDrop. |
| Q8 drop eventing | Preserve `canvas:dropValidated` only with CP-1-approved `eventSubscribe.md` catalog entry; otherwise defer emission. |
| Q9 ownership | No foreign state writes; widget/canvas owner handles final placement and persistence. |
| Q10 disposed state | Add `_isDisposed` controller guard during implementation. |
| Q11 error handling | Public/lifecycle/drop boundaries catch, log, return `false`, and update owned error state when appropriate. |
| Q12 input model | Preserve native HTML5 drag/drop; no new pointer/touch support. |
| Q13 utils scope | Superseded: no `throttle.js` in `core/utils/`; dragDrop needs no utils change. |

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |

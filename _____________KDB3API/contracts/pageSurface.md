# Module contract: pageSurface

**Type:** feature module. Public key `_KDB.api.canvas` (the receiver already named by kdbControl intents). Folder name is `pageSurface`.
**Status:** Approved for this slice (PO vastenburg, 2026-09-24). Page-size wait: Implemented 2026-10-06 ([pageSurface-pageSize-host-ready-contractdelta.md](./_archive/pageSurface-pageSize-host-ready-contractdelta.md)).
**Relatie:** [kdbControl.md](./kdbControl.md) S2, [cognosHostService.md](./cognosHostService.md) `setCanvasPageSize`, archive settings CP-1 §2b intent types.

---

## 1. Purpose

Apply dashboard page size and page background. kdbControl owns the three setting strings, the inputs, undo/redo, and writeback. This module is the receiver: it paints and sizes the Cognos page. It does not store those strings again.

## 2. Ownership

No `_KDB.state.pageSurface` and no `_KDB.state.dashboard`. Canonical values stay `_KDB.state.kdbControl.settings.dashboard.width`, `.height`, `.backgroundColor`.

widgetBase keeps widget x/y/width/height. Tabs, header, and footer stay out. `defaultZoom` is not written.

## 3. Runtime

`_KDB.runtime.pageSurface.canvasFacet` — stamp of `_KDB.services.cognosHost.canvas` once in the orchestrator. Deep files read it only through `effects/readCanvasFacet.js`.

`_KDB.runtime.pageSurface.pending` — last width, height, and background strings received before the first post-ready flush (including after `mount` until that flush). Not serialized. Cleared on flush and on `destroy`.

`_KDB.runtime.pageSurface.abortControllers.pageSizeWait` / `.pendingPromises.pageSizeWait` — AbortController and in-flight `whenCanvasReady` waiter. Abort and drop on `destroy`. Not serialized.

## 4. Public API

```js
_KDB.api.canvas = { mount, destroy, dispatch, getState }
```

`getState` returns `undefined`. This module has no state subtree. Motivation: the category default is dispatch, and the three intent types already exist; a second method vocabulary would duplicate them.

`dispatch` accepts only:

| type | payload |
|---|---|
| `kdbControl.canvasIntent.dashboardWidth` | `{ value: string }` |
| `kdbControl.canvasIntent.dashboardHeight` | `{ value: string }` |
| `kdbControl.canvasIntent.dashboardBackgroundColor` | `{ value: string }` |

Unknown types are a no-op. Until the first post-ready flush has run, `dispatch` stores the string on `pending` and does not touch the page (including after `mount`). After that flush, it applies immediately. It never no-ops while the function exists, and it never warns.

Disposed: `dispatch` and `mount` warn once and return. `destroy` is idempotent. `getState` returns `undefined`.

## 5. Apply

**Background.** Set `backgroundColor` on every `.dashboardFrame .page.pagegenericPage` that is not inside `#KDB_bottomFooterWrapper`. Empty or whitespace removes the inline property. Do not paint `.dashboardFrame` itself and do not paint the footer.

Also paint one surround node, `.ba-common-container.ba-common-tabList__innerContainer`, with the same RGB at alpha `0.75` (`rgba(r,g,b,0.75)`) when the color matches `#RRGGBB`. Any other value, including empty and `#00000000`, removes that node's inline `background-color`. The page node still receives the raw string. Do not paint `.pagecontainer`. The helper stays in `applyPageSurface.js`. Do not change the PDF overlay on that node.

**Page size.** Convert the setting string to px with `core/utils/convertUnitToPx.js` (`Math.round` + `"px"`). Call the stamped facet `setCanvasPageSize("width"|"height", cssPx)`. Do not send `mm` or `cm` to Cognos. A failed Outcome is logged once per call and does not throw into kdbControl. Do not retile widgets.

**Mount.** Set mounted and arm `canvasFacet.whenCanvasReady({ signal })` with no `budgetMs` (`effects/applyPageSurfaceWhenReady.js`). Do not size the Cognos page in that turn. After the waiter settles: abort/dispose/`outcome === "aborted"` → no flush; any other settle (ready, wait-fail, missing `whenCanvasReady`) → **exactly one** flush (pending axes first, then kdbControl `settings.dashboard` for axes not in pending). Wait-fail still attempts `setCanvasPageSize` once. kdbControl mount does not emit these intents, so the flush read is the first paint.

## 6. Boot

`KDB.js` only:

- `registerFeatureModules`: call `__orchestratorPageSurface` immediately after `__orchestratorKdbControl`, so `dispatch` exists before any mount.
- `mountFeatureModules`: `_KDB.api.canvas.mount({})` immediately after `_KDB.api.kdbControl.mount({})`.
- `destroyRegisteredFeatures`: `api.canvas` immediately before `api.kdbControl`.

Do not edit `settingsPostDispatchSideEffects.js`.

## 7. Cognos

Two ops on the existing canvas stamp: `setCanvasPageSize` (sync) and `whenCanvasReady` (unbounded, abortable). This module stamps `canvasFacet` and does not call `_KDB.cognosAPI`.

## 8. Folder

```txt
dashboard/canvas/pageSurface/
  __orchestratorPageSurface.js
  createPageSurfaceController.js
  effects/applyPageSurface.js
  effects/applyPageSurfaceWhenReady.js
  effects/readCanvasFacet.js
```

No `state/`. No new CSS file.

## 9. Out of scope

Diagramme/Kommentare defaults. Steuerungspanel colors. Widget layout. `defaultZoom`. A tab-created subscription (a page opened later picks up the color on the next apply). A published get-page-size op. A second copy of the three strings.

## 10. Events

None.

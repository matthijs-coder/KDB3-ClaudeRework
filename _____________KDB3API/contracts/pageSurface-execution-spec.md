# Execution spec: pageSurface

**Status:** Reviewed
**Contract:** `_____________KDB3API/contracts/pageSurface.md`
**Authoring AI:** coordinator, 2026-09-24

LIVE tree only: `_____________KDB3API/KDB3/`. Do not edit `settingsPostDispatchSideEffects.js`. Do not edit Diagramme, Kommentare, or Steuerungspanel files.

Rules for every new JS file: AMD `define`, `"use strict"`, `try/catch` on named executables (pure one-liners exempt), no nested function declarations inside the entry, English names, `const`/`let`, `===`. Files ≤ 150 lines. Orchestrator ≤ 120.

## Host op

### `KDB3/js/core/services/cognosHost/facets/canvas/write/setCanvasPageSize.js` (new)

- **Rules:** `cognos-adapter.mdc`, `amd.mdc`, `error-handling.mdc`.
- Copy the sync Outcome shape of `facets/canvas/read/listCanvasWidgets.js` (`resolveCanvasHostApi`, `buildCanvasOutcome`, never throw).
- Export a function `(ctx, axis, cssPx)`.
- `axis` must be `"width"` or `"height"`. `cssPx` must be a string ending in `px`. Else `CANVAS_INVALID_ID`.
- Width names, first exact hit in `getCanvasPropertiesList()`: `pageSizeWidth`. Height: `pageSizeHeight`. No dotted/bare names, no fuzzy scan.
- Missing list or no hit: `CANVAS_HOST_CAPABILITY_MISSING`.
- If the host value is already the same px as `cssPx` (number `1800`, string `"1800"`, or string `"1800px"`), return ok without setting. Null/undefined host value writes. `"1800cm"` is not equal.
- Else `setCanvasPropertyValue(name, cssPx)`. Return ok. On throw: `CANVAS_WRITE_FAILED`.
- Do not put the property list or the canvas handle on the Outcome.

### `KDB3/js/core/services/cognosHost/facets/canvas/config/canvasErrorCodes.js`

- Add `WRITE_FAILED: "CANVAS_WRITE_FAILED"`.

### `KDB3/js/core/services/cognosHost/facets/canvas/createCanvasAdapter.js`

- Import `./write/setCanvasPageSize.js` and bind `setCanvasPageSize: _setCanvasPageSize.bind(null, ctx)` on the returned object. File is 25 lines; stay under 150.

Do not edit `core/cognosAPI/canvas.js` or compose files.

## Feature

Folder `KDB3/js/dashboard/canvas/pageSurface/`.

### `effects/readCanvasFacet.js`

- One-line read of `_KDB.runtime.pageSurface.canvasFacet`, else null. Copy `widgetBase/effects/readCanvasFacet.js` with owner `pageSurface`.

### `effects/applyPageSurface.js`

- `applyPageBackground(_KDB, value)`: `querySelectorAll(".dashboardFrame .page.pagegenericPage")`. Skip a node that is `#KDB_bottomFooterWrapper` or is inside it. Empty/whitespace → `removeProperty("background-color")`. Else set `style.backgroundColor`.
- `applyPageSize(_KDB, axis, value)`: AMD-import `core/utils/convertUnitToPx.js`. Null conversion → return. Else `cssPx = String(px) + "px"`. Read facet via `readCanvasFacet`. Missing facet → `console.warn` once and return. Call `setCanvasPageSize(axis, cssPx)`. If `outcome.ok !== true`, `console.error` with the outcome and return. Do not throw.
- `applyDashboardSettings(_KDB, dashboard)` reads `.width`, `.height`, `.backgroundColor` and calls the two functions.

### `effects/applyPageSurfaceWhenReady.js`

- Wait for `canvasFacet.whenCanvasReady({ signal })` (no `budgetMs`), then exactly one flush. Abort/dispose: no flush. Wait-fail: still one `setCanvasPageSize` attempt. See [pageSurface-pageSize-host-ready-execution-spec.md](./pageSurface-pageSize-host-ready-execution-spec.md).

### `createPageSurfaceController.js`

- Closure flag `_isDisposed`.
- `dispatch(action)`: unknown type returns. Map the three `kdbControl.canvasIntent.*` types to width, height, or background. Until the first post-ready flush, write `runtime.pageSurface.pending[axis] = value` and return (including after `mount`). After that flush, apply that one axis.
- `mount`: set mounted and start `applyPageSurfaceWhenReady` (`whenCanvasReady({ signal })`, no `budgetMs`). Do not flush in that turn. One flush after settle except abort/dispose.
- `destroy`: set disposed first, abort `pageSizeWait`, clear pending, drop the facet stamp (do not destroy cognosHost). No flush.
- `getState`: return `undefined`.
- Disposed guards per `module-public-api.mdc` (warn once, no throw).

### `__orchestratorPageSurface.js`

- `function __orchestrator(_KDB)`.
- Ensure `_KDB.runtime.pageSurface` including `pending`, `abortControllers`, `pendingPromises`.
- Stamp `canvasFacet` from `_KDB.services.cognosHost.canvas` or null.
- `var controller = createPageSurfaceController(_KDB)` (pass `_KDB`; the factory closes over it).
- `_KDB.api.canvas = { mount, destroy, dispatch, getState }`.
- Return that object.

## KDB.js wiring only

- AMD-import `./dashboard/canvas/pageSurface/__orchestratorPageSurface.js` beside the kdbControl import. Parameter `_orchestratorPageSurface`.
- `registerFeatureModules`: call it immediately after `_orchestratorKdbControl(_KDB)`.
- `mountFeatureModules`: `_KDB.api.canvas.mount({})` immediately after `_KDB.api.kdbControl.mount({})`.
- `destroyRegisteredFeatures`: `api.canvas` immediately before `api.kdbControl`.

Bootstrap wiring on `KDB.js` is allowed. Do not change other behavior in that file.

## Done when

- `_KDB.api.canvas.dispatch` is assigned from the pageSurface orchestrator.
- `setCanvasPageSize` is on the canvas adapter.
- kdbControl post-dispatch file is unchanged.
- No `_KDB.state.dashboard` writes.
- Report line counts for the new files and `createCanvasAdapter.js`.

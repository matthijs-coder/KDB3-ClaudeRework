# Execution Spec: writeback GET persist-landing (A′)

> Implements `contracts/writeback-get-persist-landing-contractdelta.md` (Implementing, PO go 2026-09-01).
> Two writers, exclusive allowlists. Echo every MUST below **before** producing files.

---

**Status:** `Reviewed` — dual review GREEN; generation fence on persist restore
**Contract:** `contracts/writeback-get-persist-landing-contractdelta.md`
**Phase:** implementation
**Authoring AI:** Cursor Grok 4.6 (captain), 2026-09-01
**Executing AI:** grok 4.6 army (tabs writer + GET writer)

---

## MUSTs (echo one sentence each before files)

1. Collect + normalize + validate **first**; persist land **after**; stringify only after collect returns.
2. Land only if `collect({ source: "bridge" })`. Internal `collect()` must not mutate tabs.
3. Landing path: `tabs/traverse` `scope: "singleTab"` `waitFor: "canvas"` `includeHiddenDashboardTabs: false` `restoreActiveTab: true` `restoreTabIndex` = target physical index; **await** until `pendingPromises.traverse` is gone; **then** tabs owner emits `tabs:changed` (`source: "writebackGetPersistLanding"`). GET does not emit.
4. Do **not** use `tabs/parameterSetActivateTabRequested`. Do **not** reuse GET collect `TRAVERSE_PAYLOAD`. Do **not** call `guardParameterSetRun` (needs SET `runId`).
5. Do **not** overload `tabs/postParameterSetRestoreTraverseRequested` / edit SET post-restore body.
6. Landing miss: log; still return valid v3; **no** `notifySaveFailed` / German `Dashboard speichern`.
7. No `#saveParameterSet` scrape; no `_KDB.cognosAPI` / `__getDashboardAPI`; no WritebackTabel CRUD; no new service; no `helpers/` `common/` `shared/`.
8. GET does not write `_KDB.state.tabs`. Tabs via `_KDB.api.tabs.dispatch` / `getState()`.
9. Delayed restore after GET return: wait until `document.body` `smq-popup #preloader-object` hides (seen visible first). Fallback 8000ms if never seen. Cancel on user `tabs:changed` (source ≠ `writebackGetPersistLanding`), SET `parameterSetRestoreActive`, GET re-entry, `destroy()`.
10. Drop GET live DOM layout merge. Stamp `lastCanvasLayout` else `layout` from owner `getState()`. Do not import widgetBase internals. Do not put land in `needsTraversal`.
11. AMD: one `define`, factory-scope named helpers only, ≤150 lines, ≤10 imports. English identifiers.
12. Do not edit `followActiveTab.js`, `leftoverWidgets.css`, `parameterSetActivateTab.js`, SET `runNormalRestore.js`.

---

## Writer TABS — exclusive allowlist

**Write:**

- `KDB3/js/dashboard/tabs/config/actionTypes.js`
- `KDB3/js/dashboard/tabs/actions/routeParameterSetAction.js`
- `KDB3/js/dashboard/tabs/actions/writebackGetPersistLanding.js` (new)

**Read-only:** `postParameterSetRestoreTraverse.js` (copy emit shape, do not edit), `guardParameterSetRun.js` (`waitForInflightTraversals` only), `listDashboardSlots.js`, `events/eventNames.js`, `dispatchTabsTraverse.js`.

### `actionTypes.js`

Add: `WRITEBACK_GET_PERSIST_LANDING: "tabs/writebackGetPersistLandingRequested"`.

### `writebackGetPersistLanding.js`

- **Role:** tabs parameterSet-family action. **Lines:** target 90, hard 150. **AMD ≤6.**
- Imports: `actionTypes.js`, `guardParameterSetRun.js`, `listDashboardSlots.js`, `eventNames.js`.
- Entry: `async function writebackGetPersistLanding(_ctx, _payload)` + factory-scope `emitPersistLandingTabChanged(_ctx, state)`.
- Steps:
  1. `tabIndex = payload.tabIndex`. If not a finite number → `{ ok: false, diagnostics: [{ code: "TABS_TRAVERSE_INVALID_PAYLOAD", message: "persist landing requires tabIndex" }] }`. No throw.
  2. `await waitForInflightTraversals(_ctx._KDB)`. **Do not** call `guardParameterSetRun`.
  3. `await _ctx.dispatch({ type: TRAVERSE, payload: { source: "writebackGet", scope: "singleTab", tabIndex, restoreActiveTab: true, restoreTabIndex: tabIndex, waitFor: "canvas", includeHiddenDashboardTabs: false } })`.
  4. If dispatch !== `true` → `{ ok: false, diagnostics: [...] }` (no throw).
  5. `emitPersistLandingTabChanged` copy SET emit (`tabIndex`, `tabIdx` via `listDashboardSlots`, `tabId`, `pageId`, `firstActivation: false`) but `source: "writebackGetPersistLanding"`. Emit `_eventNames.CHANGED` only (import constant).
  6. Return `{ ok: true, diagnostics: [] }`.
- try/catch: log `[tabs.writebackGetPersistLanding] failed`, return `{ ok: false, diagnostics }`, **do not throw**.
- **Rules:** `amd.mdc`, `naming.mdc`, `events.mdc`, `error-handling.mdc`, `cognos-adapter.mdc` (no `_KDB.cognosAPI`).

### `routeParameterSetAction.js`

- Import `./writebackGetPersistLanding.js` (8th AMD import; still ≤10).
- Explicit `if (action.type === WRITEBACK_GET_PERSIST_LANDING) return writebackGetPersistLanding(...)`.
- Add type to `isParameterSetAction`.
- Keep SET post-restore as **fallback only for the old type**, not as default for unknown types: unknown type → `{ ok: false, diagnostics }` (do not silently run SET post-restore). Today unknown types fall through to post-restore — **fix that while adding the branch** so GET persist cannot hit SET walk-all-visible.
- `disposedResult` for the new type: same `{ ok: false, WRITEBACK_RESTORE_CANCELLED }` Promise as other parameterSet actions.

---

## Writer GET — exclusive allowlist

**Write:**

- `KDB3/js/core/services/writeback/get/createWritebackGetService.js`
- `KDB3/js/core/services/writeback/get/runWritebackGetCollectors.js` (new; required split: factory is already 171 lines / 10 imports)
- `KDB3/js/core/services/writeback/get/applyWritebackGetPersistLanding.js` (new)
- `KDB3/js/core/services/writeback/get/collectors/collectWidgets.js`
- `KDB3/js/core/services/writeback/cognosWritebackBridge.js`

**Read-only:** `followActiveTab.js` (host selector + 400ms×10; do not edit), `tabs/events/eventNames.js`, `tabs/config/actionTypes.js`, `set/state/ensureWritebackRuntime.js` (timers bucket exists; seed locally if missing — do not edit SET file unless seed is truly absent).

### `runWritebackGetCollectors.js`

Move from factory: `runCollector`, the five collector awaits, `assertCollectorsSucceeded`, `notifyPartialCollect`, plus `notifySaveIssue` used by those. Factory keeps pkg/validate `notifySaveFailed` **or** this module exports `{ runWritebackGetCollectors, notifySaveFailed }` as **one related surface**. No `helpers/` folder.

### `applyWritebackGetPersistLanding.js`

- **Lines:** target 120, hard 150. **AMD ≤6.**
- Imports: tabs `eventNames.js` only if subscribing (required). Dispatch type **literal** `"tabs/writebackGetPersistLandingRequested"` (tabs writer owns the constant).
- Export one object: `{ applyWritebackGetPersistLanding, cancelWritebackGetPersistLanding }`.
- `cancelWritebackGetPersistLanding(_KDB)`: clearTimeout `runtime.writeback.timers.persistRestoreTab`; unsubscribe `runtime.writeback.subscriptions.persistRestoreTab` if set. Safe if missing.
- `applyWritebackGetPersistLanding(_KDB)` (only called when source is bridge):
  1. `cancelWritebackGetPersistLanding(_KDB)` (GET re-entry).
  2. `tabsState = _KDB.api.tabs.getState()`. `capturedIndex = tabsState.activeIndex`. First visible = first dashboard-role slot with `visible === true` (same role test as `collectWidgets.isDashboardTab`; do not import tabs `listDashboardSlots`).
  3. If `capturedIndex === firstVisible` → return (skip land and restore).
  4. If firstVisible is not a number → log, return.
  5. `await tabs.dispatch({ type: "tabs/writebackGetPersistLandingRequested", payload: { source: "writebackGet", tabIndex: firstVisible, waitFor: "canvas" } })`. If `ok === false` or throw: `console.warn`, **return** (no restore).
  6. Wait until host `parentNode` is `document.getElementById(pageId)` of first visible. Host: `document.querySelector(_KDB.elements.selectors.root.kdbWidget)` else `_KDB.elements.kdbWidget`. Poll 400ms, max 10. Document query is the contract exception. Do **not** read `_KDB.runtime.kdbControl`. On miss: `console.warn`, still continue (best-effort).
  7. Subscribe `tabs:changed`; if `payload.source !== "writebackGetPersistLanding"` → cancel restore. Store unsubscribe under `runtime.writeback.subscriptions.persistRestoreTab`.
  8. `scheduleWritebackGetPersistRestore`: restore when extension `smq-popup #preloader-object` on `document.body` was visible then hidden. Fallback 8000ms if never seen. Same persist action + `capturedIndex`. Timer `persistRestoreTab`.
- try/catch on apply: log `[writebackGet.persistLanding] failed`, return, **never throw**.
- **Rules:** `amd.mdc`, `runtime.mdc`, `events.mdc`, `dom.mdc` (exception), `error-handling.mdc`, `state.mdc` (no foreign state write).

### `createWritebackGetService.js`

- After extract: ≤150 lines, ≤8 AMD imports.
- `collect(_options)`: first line after disposed-guard: `cancelWritebackGetPersistLanding(_KDB)`. After successful validate: `if (_options && _options.source === "bridge") { await applyWritebackGetPersistLanding(_KDB); }` then `return normalized`. Persist must not throw into `notifySaveFailed`.
- `destroy`: `_isDisposed = true`; cancel persist.

### `collectWidgets.js`

- Remove AMD imports of `resolveWidgetShell.js` and `resolveCanvasLayoutFromFrame.js`.
- Remove `resolveWidgetShell` / `mergeDomLayoutIntoFrame`.
- Factory-scope `stampOwnerLayout(frame)`: if `lastCanvasLayout` has numeric `x,y,width,height` use it as `layout`; else keep `frame.layout`. `Object.assign({}, frame, { layout })`. Pass stamped frame to `buildWidgetObject`.
- **Do not** change `TRAVERSE_PAYLOAD`, `needsTraversal`, or collect traverse.

### `cognosWritebackBridge.js`

- `bridgeGet` only: `await _KDB.services.writebackGet.collect({ source: "bridge" })` then `JSON.stringify`. No other bridge edits.

---

## Forbidden

`.cursor/rules/*.mdc`; git commit/push; KDB2; `followActiveTab.js`; leftover CSS; SET step 28; `parameterSetActivateTab.js`; `postParameterSetRestoreTraverse.js` body; inventing chrome-click from GET; 8500ms; `waitFor: "widgetsRendered"` on persist.

---

## Report (each writer)

1. MUST echo (12 sentences).
2. File table: path, line count, AMD import count, matches spec | deviation.
3. Deviations with motivation.
4. Open questions (if blocked, stop).

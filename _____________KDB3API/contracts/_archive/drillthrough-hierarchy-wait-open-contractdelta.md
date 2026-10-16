# Contract Delta: Drillthrough waits in an already-open window

> When a Dienststelle selection needs the hierarchy tree and that table's load is already in flight, the click still opens a window in the same turn and shows a German wait sentence there. The URL is applied when that same load finishes. The click does not start the load.

---

**Status:** `Approved`
**Parent contracts:** `contracts/drillthrough.md` §4, §5.2, §8.2, §10, §13, §15; `contracts/tableDataService.md` §4b, §4c, §5
**Supersedes:** `drillthrough.md` §4 sentence "Does not open on build failure" for the single case in §2. Cache-only `readRows` and the ban on `loadTable` / `waitForRows` stay, including `drillthrough-dezpv-column-order-contractdelta.md` §5.
**Type:** `shared service contract delta`
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**Reviewed by:** subagent review green, 2026-10-14
**Related rules:** `runtime.mdc`, `module-public-api.mdc`, `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `feature-structure.mdc`, `dom.mdc`

**Implementation:** code reviewed 2026-10-14. Spec: `contracts/drillthrough-hierarchy-wait-open-execution-spec.md`. Live drill not yet checked in Cognos.

PO vastenburg, 2026-10-14: keep the drillthrough icon clickable and tell the user the drillthrough information is still being obtained. Do not grey the icon out. Do not change when the hierarchy table load starts.

---

## 1. What stays

- Sicht commit still starts the hierarchy load in `warmUpActiveHierarchy`. Boot stays `load: false` for `dienststelle_bw_hierarchy` and `dienststelle_dezpv_hierarchy`.
- `openDrillthrough(spec)` stays the only public open. It stays synchronous. It does not return a Promise. No second method and no flag.
- Both widgetVis icons keep calling it. The datapoint peek still returns before that call when the peek is null or thenable. No widgetVis edit is required for this delta.
- A successful `buildDrillthroughUrl` still opens the real URL with `window.open(url, "_blank")` in the click turn. That covers a ready tree, an empty Dienststelle selection, and the BW MAG / level-0 case that does not need the tree.
- Tree build stays cache-only `readRows`. This path does not call `loadTable`, `waitForRows`, `reloadTable`, `ensureFreshRows`, or `abortTable`.
- No `_KDB.state.drillthrough`. No `destroy`. The window handle is not stored on `_KDB.runtime`. No event subscription. No `messageService` call. `drillthrough.md` §16 still excludes toasts.
- Column order and the `#ALLE_GG#` marker are unchanged.

## 2. When the placeholder opens

Still inside the click turn, before any await, and only after `buildDrillthroughUrl(spec)` has returned:

| Build result | In-flight hierarchy promise | Action |
|---|---|---|
| `ok: true` | ignored | Open the real URL. No wait text. |
| `errorCode !== "DRILLTHROUGH_ORG_TREE_MISSING"` | ignored | Return that failure. No window. |
| `DRILLTHROUGH_ORG_TREE_MISSING` | `readPendingLoad` is not a thenable | Return that failure. No window. |
| `DRILLTHROUGH_ORG_TREE_MISSING` | thenable | `window.open("about:blank", "_blank")` with no feature string, write the wait sentence, attach to that promise, return the deferred result below. |

Hierarchy key is the same map as `mapOrgPrompts`: Sicht `DEZPV` → `dienststelle_dezpv_hierarchy`, otherwise `dienststelle_bw_hierarchy`. Pass `[{ tableName: key }]`.

`window.open` of `about:blank` uses the existing `openBlankWindow` helper. A null handle is `DRILLTHROUGH_OPEN_BLOCKED`. Do not attach.

The deferred result is a normal `DrillthroughOpenResult`, not a Promise:

```js
{
  ok: true,
  status: "success",
  errorCode: null,
  errorMessage: null,
  url: null,
  source: spec.source,
  widgetId: spec.widgetId || null,
  drillConfig: null,
  diagnostics: {
    service: "drillthrough",
    operation: "openDrillthrough",
    failedStage: null,
    warnings: [{ code: "DRILLTHROUGH_HIERARCHY_PENDING", message: "Hierarchy load already in flight." }]
  }
}
```

Callers that log only when `ok === false` stay quiet. Do not copy the failed build's `errorCode` onto this result.

Two clicks while the same load is in flight open two windows and attach twice. There is no click lock.

A history replay that did not start a hierarchy load leaves `readPendingLoad` empty. The click then fails as today and does not start a load.

## 3. After the captured promise settles

Use a named continuation. Do not read the fulfillment value as shaped rows or as the org tree. Keep the original spec. `orgTree: null` stays falsy and `resolveTree` reads the cache again.

| Observation | Action |
|---|---|
| `handle.closed` | Stop. |
| Promise rejected | Replace the body with `loadFailedBody`. Keep `waitWindowTitle`. Do not close. Do not navigate. Do not notify. Swallow the rejection. tableData already toasted the load failure. |
| Fulfilled, and `readTableState([{ tableName: key }])` lifecycle is not `"ready"` | `handle.close()` when it is still open. No text, no toast. This is the abort case (`null` fulfillment, lifecycle stays `"loading"`). |
| Fulfilled, lifecycle `"ready"`, rebuild `ok` | `handle.location.replace(url)`. Do not read `location` afterwards. If `replace` throws, replace the body with `loadFailedBody`, keep `waitWindowTitle`, and do not close. |
| Fulfilled, lifecycle `"ready"`, rebuild `DRILLTHROUGH_ORG_TREE_MISSING` | Replace the body with `treeMissingBody`. Keep `waitWindowTitle`. Do not close. Do not notify. |
| Fulfilled, lifecycle `"ready"`, any other build failure | Replace the body with `loadFailedBody`. Keep `waitWindowTitle`. Do not close. Do not notify. |
| `readTableState` returns `undefined` | Same as not ready: close, no toast. |

Do not call `abortTable` from this continuation. A timeout is the table load's own budget. Do not add a second timer.

## 4. Wait document

German copy lives only in the drillthrough label seed, merged in `__orchestratorDrillthrough` onto `_KDB.config.labels.de.drillthrough` the same way writeback merges its labels (seed first, existing keys win).

| Key | Text |
|---|---|
| `waitWindowTitle` | `Drillthrough` |
| `waitWindowBody` | `Bitte einen Moment Geduld. Die für den Drillthrough benötigten Informationen werden geladen.` |
| `treeMissingBody` | `Die für den Drillthrough benötigten Organisationsdaten sind nicht verfügbar.` |
| `loadFailedBody` | `Die für den Drillthrough benötigten Informationen konnten nicht geladen werden.` |

The effect receives those strings as arguments. The first write builds a minimal HTML document with `<meta charset="utf-8">`, then sets `document.title` from `waitWindowTitle` and the body through `textContent` from `waitWindowBody`. It does not concatenate a label into HTML. A missing string leaves that slot empty. A later `loadFailedBody` or `treeMissingBody` write replaces the body only and sets the title from `waitWindowTitle` again, so an empty body does not clear the title. The effect does not invent a German literal.

## 5. `tableData.readPendingLoad`

Public named method on `_KDB.services.tableData`. Sync read, same array input as `readRows`.

| Input | Returns | Load |
|---|---|---|
| Disposed service | `undefined` | no |
| Not exactly one item, or the key does not resolve | `null` | no |
| One item, `pendingLoads` has that resolved key | that same promise | no |
| One item, no pending promise | `null` | no |

Never throws (catch returns `undefined`, same as `readRows`). Does not call `startTableLoad`, `loadTable`, `waitForRows`, `reloadTable`, or `abortTable`.

The promise is the load promise already stored for that key. Success fulfills with raw source rows. Abort fulfills with `null`. Failure rejects after tableData has toasted. Callers must not treat the value as shaped rows. Multi-item input does not follow the shaped-row unwrapping rule; it returns `null`.

Drillthrough receives `readPendingLoad` and `readTableState` by injection. It does not read `_KDB.runtime.tableData`.

## 6. Files

- `KDB3/js/core/services/tableData/` — `readPendingLoad` operation and the public method on `createTableDataService.js`.
- `KDB3/js/core/services/drillthrough/openDrillthrough.js` — decide, still synchronous.
- `KDB3/js/core/services/drillthrough/effects/openBlankWindow.js` — reused for the real URL and for `about:blank`.
- `KDB3/js/core/services/drillthrough/effects/writeDrillthroughWaitDocument.js` — new.
- `KDB3/js/core/services/drillthrough/effects/finishDeferredDrillthroughOpen.js` — new.
- `KDB3/js/core/services/drillthrough/config/drillthroughLabels.js` — new label seed.
- `KDB3/js/core/services/drillthrough/__orchestratorDrillthrough.js` — inject the two tableData reads and merge labels.

No widgetVis file. No `tables.js`. No `syncDienststelleFromSicht.js`. No messageService file.

## 7. Acceptance

1. Hierarchy already `ready`, or no Dienststelle selection, or BW MAG / level-0: the real URL opens in the click. No `about:blank`. No wait sentence.
2. Selection present, hierarchy load already pending, cache empty: the click opens `about:blank` with the wait sentence before the click handler returns. `waitForRows` and `loadTable` are not called.
3. That same promise then reaches lifecycle `ready` with rows: the same window navigates with `location.replace` to the built URL. The original spec is rebuilt. `orgTree: null` does not block the cache read.
4. The load rejects: the wait window shows `loadFailedBody`, stays open, and drillthrough does not toast.
5. Abort fulfills `null` and lifecycle stays `loading`: the wait window closes. No toast.
6. Ready but the tree is still missing: the wait window shows `treeMissingBody` and stays open. No toast.
7. `DRILLTHROUGH_ORG_TREE_MISSING` with no pending promise: no window, same failure result as today.
8. `window.open` returns null: `DRILLTHROUGH_OPEN_BLOCKED`, no attach.
9. The user closes the wait window before settle: no `location.replace`, no throw.
10. A second click during the same load opens a second window. It does not start a second load.
11. `readPendingLoad([{ tableName: "dienststelle_dezpv_hierarchy" }])` while idle returns `null` and does not change lifecycle.

## 8. Approval log

| Date | Status | Approver | Notes |
|---|---|---|---|
| 2026-10-14 | `Approved` (go) | PO vastenburg | Clickable icon, message while hierarchy info is still loading. Do not grey out. Do not change load start. |
| 2026-10-14 | Draft | coordinator | Placeholder opens in the click. Join via `readPendingLoad` only. |
| 2026-10-14 | Contract reviewed | coordinator | Review green. |
| 2026-10-14 | Code reviewed | coordinator | Implementation review green. Cognos click not yet checked. |

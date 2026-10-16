# Execution Spec: drillthrough hierarchy wait-open

> Mechanical implementation of `contracts/drillthrough-hierarchy-wait-open-contractdelta.md`. The contract wins if this spec and the delta disagree. Stop and report. Do not invent a third behavior.

---

**Status:** `Reviewed`
**Module / contract:** `_____________KDB3API/contracts/drillthrough-hierarchy-wait-open-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-10-14
**Executing AI:** delegated Grok 4.7
**Reviewer:** coordinator after a separate review pass

---

## Section A. Pre-flight read list

The executing AI reads these, then echoes the summaries below in its final report. The supervising captain accepts these summaries as written. File creation may proceed in the same turn after the echo is included in the report.

1. `kdb-object.mdc` — `_KDB` has a fixed set of top-level namespaces; feature code receives `_KDB` as an argument.
2. `state.mdc` — `_KDB.state` is serializable and each subtree has one writer.
3. `runtime.mdc` — `_KDB.runtime.<owner>` is owner-private; other modules do not read it.
4. `module-public-api.mdc` — services expose named methods; sync reads return `undefined` when disposed.
5. `events.mdc` — cross-module commands go through the owner API; this change adds no event.
6. `feature-structure.mdc` — contract first; JS hard limit 150 lines; more than 10 AMD imports must be split.
7. `naming.mdc` — English identifiers; German UI strings only in the labels seed; underscore prefix on boundary inputs.
8. `error-handling.mdc` — try/catch on named executable functions; log with the function name; non-boundaries rethrow.
9. `dom.mdc` — this change writes only into the window just opened, via `textContent` and `document.title`.
10. `amd.mdc` — one `define` per file; helpers at factory scope; no nested function declarations inside the entry or inside callbacks.
11. `lifecycleVocabulary.md` — table lifecycle uses `ready` and `loading`; do not invent a term.
12. `contracts/_template.md` — contracts state ownership and public API before code.
13. `contracts/drillthrough-hierarchy-wait-open-contractdelta.md` — join an in-flight hierarchy load from a blank window opened in the click; do not start that load.
14. This execution spec.

## Section B. Folder tree

Edit only these files.

```txt
KDB3/js/core/services/tableData/operations/readPendingLoadInputs.js          (new)
KDB3/js/core/services/tableData/createTableDataReadApi.js                    (new)
KDB3/js/core/services/tableData/createTableDataService.js                    (edit)
KDB3/js/core/services/drillthrough/config/drillthroughLabels.js              (new)
KDB3/js/core/services/drillthrough/effects/writeDrillthroughWaitDocument.js  (new)
KDB3/js/core/services/drillthrough/effects/finishDeferredDrillthroughOpen.js (new)
KDB3/js/core/services/drillthrough/openDrillthrough.js                       (edit)
KDB3/js/core/services/drillthrough/createDrillthroughService.js              (edit)
KDB3/js/core/services/drillthrough/__orchestratorDrillthrough.js             (edit)
```

`createTableDataService.js` already has 10 AMD imports and sits on the 150-line hard limit. The new read is extracted so that file stays at or under 10 imports and under 150 lines. Do not add an 11th import to it.

## Section C. Per-file specifications

#### `KDB3/js/core/services/tableData/operations/readPendingLoadInputs.js`

- **Role**: operation
- **Lines**: target 40, hard 150
- **AMD imports**: `../input/resolveTableKey.js`
- **Factory parameters**: `_resolveTableKey`
- **Entry function**: `readPendingLoadInputs(_KDB, _inputs)`
- **Body**:
  1. If `_inputs` is not an array of length 1, return `null`.
  2. Resolve the key with `_resolveTableKey(_inputs[0])`. Empty key returns `null`.
  3. Read `_KDB.runtime.tableData.pendingLoads[key]` only when `pendingLoads` is an object. This file is inside tableData, so that read is legal.
  4. If that value has a `then` function, return the same promise. Otherwise return `null`.
  5. Do not call `startTableLoad`, `loadTable`, `waitForRows`, `reloadTable`, or `abortTable`.
- **Return value**: the entry function.
- **Rules to apply**:
  - `amd.mdc` — full-compact `define`; no nested functions in the entry.
  - `naming.mdc` — underscore on boundary inputs.
  - `feature-structure.mdc` — under 150 lines, one import.
  - `runtime.mdc` — pendingLoads stays inside tableData.
  - `error-handling.mdc` — try/catch, log `[tableData.readPendingLoadInputs]`, rethrow. The public method converts that throw to `undefined`.

#### `KDB3/js/core/services/tableData/createTableDataReadApi.js`

- **Role**: service factory slice
- **Lines**: target 80, hard 150
- **AMD imports**, in order:
  - `./input/normalizeTableInputs.js`
  - `./operations/readRowsInputs.js`
  - `./operations/readPendingLoadInputs.js`
  - `./operations/readTableStateInputs.js`
- **Factory parameters**: `_normalizeTableInputs`, `_readRowsInputs`, `_readPendingLoadInputs`, `_readTableStateInputs`
- **Entry function**: `createTableDataReadApi(_KDB, _life)`
- **Factory-scope helper**: move `readAllTableState` here from `createTableDataService.js` unchanged in behavior (`_KDB.state.tableData` or `undefined`).
- **Methods on the returned object**: `readRows`, `readPendingLoad`, `readTableState`.
- **Body of each method**: copy the current `readRows` and `readTableState` bodies from `createTableDataService.js`, but test `_life.disposed` instead of `_isDisposed`. `readPendingLoad` uses the same disposed and catch shape as `readRows`: disposed returns `undefined`; try normalize then `readPendingLoadInputs`; catch logs via the existing undefined-mode pattern and returns `undefined`. Do not duplicate `handlePublicMethodError`. Call it only if this file can do so without a new cross-import. A local catch that `console.error("[tableDataService.readPendingLoad] public method failed", error)` and returns `undefined` is the required shape.
- **Return value**: `{ readRows, readPendingLoad, readTableState }`.
- **Rules to apply**:
  - `amd.mdc`, `naming.mdc`, `feature-structure.mdc` — same as above. Four imports.
  - `module-public-api.mdc` — sync read, disposed returns `undefined`, never throws out of the method.
  - `error-handling.mdc` — try/catch on each method.

#### `KDB3/js/core/services/tableData/createTableDataService.js`

- **Role**: service factory
- **Lines**: hard 150. Remove the `readRows` and `readTableState` function bodies and `readAllTableState`.
- **AMD imports**: remove `readRowsInputs.js` and `readTableStateInputs.js`. Add `./createTableDataReadApi.js`. Final import count must be 9.
- **Body**:
  1. Replace `let _isDisposed = false` with `var life = { disposed: false }`.
  2. Every former `_isDisposed` check becomes `life.disposed`. `destroy` sets `life.disposed = true`.
  3. `var reads = _createTableDataReadApi(_KDB, life);`
  4. Public return adds `readPendingLoad: reads.readPendingLoad` and points `readRows` and `readTableState` at `reads`.
- **Rules to apply**:
  - `amd.mdc`, `feature-structure.mdc` — no 11th import, file under 150.
  - `module-public-api.mdc` — named methods, `readPendingLoad` beside `readRows`.
  - `error-handling.mdc` — existing public methods keep their try/catch.

#### `KDB3/js/core/services/drillthrough/config/drillthroughLabels.js`

- **Role**: label seed
- **AMD imports**: none
- **Return**: object with exactly these keys and German values:
  - `waitWindowTitle`: `Drillthrough`
  - `waitWindowBody`: `Bitte einen Moment Geduld. Die für den Drillthrough benötigten Informationen werden geladen.`
  - `treeMissingBody`: `Die für den Drillthrough benötigten Organisationsdaten sind nicht verfügbar.`
  - `loadFailedBody`: `Die für den Drillthrough benötigten Informationen konnten nicht geladen werden.`
- **Rules to apply**:
  - `naming.mdc` — these are the only German literals in this change.
  - `amd.mdc` — one define, returns the object.

#### `KDB3/js/core/services/drillthrough/effects/writeDrillthroughWaitDocument.js`

- **Role**: effect
- **AMD imports**: none
- **Factory-scope functions**:
  - `writeDrillthroughWaitDocument(_handle, _labels)` — `document.open`, write `<!DOCTYPE html><html><head><meta charset="utf-8"><title></title></head><body><p></p></body></html>`, `document.close`, then `document.title` from `waitWindowTitle` and `body.firstChild.textContent` from `waitWindowBody`. Missing string leaves that slot empty. No HTML concatenation of the label.
  - `replaceDrillthroughWaitBody(_handle, _labels, _body)` — set `document.title` from `waitWindowTitle` again, then set the body `textContent` from `_body`. An empty body does not clear the title.
- **Return value**: `{ writeDrillthroughWaitDocument, replaceDrillthroughWaitBody }`.
- **Rules to apply**:
  - `amd.mdc` — both functions at factory scope.
  - `dom.mdc` — only the opened window's document.
  - `error-handling.mdc` — try/catch, log `[drillthrough.writeDrillthroughWaitDocument]` or `[drillthrough.replaceDrillthroughWaitBody]`, rethrow.
  - `naming.mdc` — no German literal in this file.

#### `KDB3/js/core/services/drillthrough/effects/finishDeferredDrillthroughOpen.js`

- **Role**: effect
- **AMD imports**: `../buildDrillthroughUrl.js` and `./writeDrillthroughWaitDocument.js`
- **Entry**: `finishDeferredDrillthroughOpen(_ctx)` where `_ctx` is `{ handle, spec, deps, pending, tableKey, labels }`.
- **Factory-scope handlers**, attached with `.bind`, not with nested `function` expressions:
  - `onFulfilled(_ctx, _value)` — ignore `_value`. If `handle.closed`, return. Read `deps.readTableState([{ tableName: tableKey }])`. If the record's `lifecycle === "ready"`, call `buildDrillthroughUrl(spec, deps)` again. On `ok`, `handle.location.replace(url)` and do not read `location` after. If `replace` throws, `replaceDrillthroughWaitBody` with `loadFailedBody`. If rebuild `errorCode === "DRILLTHROUGH_ORG_TREE_MISSING"`, body `treeMissingBody`. Any other rebuild failure, body `loadFailedBody`. If lifecycle is not `"ready"` or `readTableState` returns `undefined`, `handle.close()` when still open. No `messageService`, no `abortTable`, no toast.
  - `onRejected(_ctx, _error)` — if not closed, `replaceDrillthroughWaitBody` with `loadFailedBody`. Do not close. Do not throw. Log `[drillthrough.finishDeferredDrillthroughOpen]`.
- **Attach**: `_ctx.pending.then(onFulfilled.bind(null, _ctx), onRejected.bind(null, _ctx))`.
- **Rules to apply**:
  - `amd.mdc` — no anonymous function inside `then`.
  - `error-handling.mdc` — try/catch in both handlers and in the entry. Handlers swallow after log so the rejection is not unhandled.
  - `runtime.mdc` — do not read `_KDB.runtime.tableData`.
  - `naming.mdc` — no German literal.

#### `KDB3/js/core/services/drillthrough/openDrillthrough.js`

- **Role**: service entry
- **AMD imports**, added after the current four, in this order:
  - `./config/hierarchyTableKeys.js`
  - `./effects/writeDrillthroughWaitDocument.js`
  - `./effects/finishDeferredDrillthroughOpen.js`
- **Factory-scope helper** `hierarchyTableKey(_spec, _keys)`: `String(_spec && _spec.sicht || "").toUpperCase().trim() === "DEZPV"` selects `_keys.DEZPV`, otherwise `_keys.BW`. Same rule as `mapOrgPrompts`. Do not edit `mapOrgPrompts.js`.
- **Entry `__controller(_spec, _deps)`** keeps today's success path: build, log, `openBlankWindow(built.url)`, blocked result, success result.
- **Failure path**:
  1. If `errorCode !== "DRILLTHROUGH_ORG_TREE_MISSING"`, log and return today's failure result.
  2. If `readPendingLoad` is not a function, log and return today's failure.
  3. `pending = _deps.readPendingLoad([{ tableName: hierarchyTableKey(_spec, _hierarchyTableKeys) }])`.
  4. If `pending` has no `then` function, log and return today's failure. This includes `null` and `undefined`.
  5. `handle = _openBlankWindow("about:blank")`. Null handle returns `DRILLTHROUGH_OPEN_BLOCKED` with `failedStage: "openWindow"`.
  6. Call `writeDrillthroughWaitDocument(handle, _deps.labels)`. On throw, `handle.close()` when not closed, log, return `DRILLTHROUGH_OPEN_INTERNAL`.
  7. Call `finishDeferredDrillthroughOpen` with the context. Do not await it.
  8. Return `createBuildResult` with `ok: true`, `errorCode: null`, `errorMessage: null`, `url: null`, `source` and `widgetId` from the spec, `drillConfig: null`, `diagnostics.operation: "openDrillthrough"`, `failedStage: null`, `warnings: [{ code: "DRILLTHROUGH_HIERARCHY_PENDING", message: "Hierarchy load already in flight." }]`. Do not log the failed build on this path.
- The function stays synchronous. It is not `async`.
- **Rules to apply**:
  - `amd.mdc`, `feature-structure.mdc` — under 150 lines, at most 7 imports.
  - `error-handling.mdc` — the existing outer try/catch stays. If it catches after `about:blank` was opened, close that handle before returning `DRILLTHROUGH_OPEN_INTERNAL`.

#### `KDB3/js/core/services/drillthrough/createDrillthroughService.js`

- **Role**: service factory
- **Body**: copy `readPendingLoad`, `readTableState`, and `labels` from `_options` into `deps` when they are functions or a non-null object. Leave `readRows` as it is. Do not add a public method.
- **Rules to apply**: `amd.mdc`, `module-public-api.mdc` — surface stays `{ buildDrillthroughUrl, openDrillthrough }`.

#### `KDB3/js/core/services/drillthrough/__orchestratorDrillthrough.js`

- **Role**: orchestrator
- **AMD imports**: add `./config/drillthroughLabels.js` beside the service factory.
- **Body**:
  1. `_KDB.config.labels.de = _KDB.config.labels.de || {}`.
  2. Existing object wins: `Object.assign({}, _drillthroughLabels, existing.drillthrough || {})`.
  3. Bind `readPendingLoad` and `readTableState` the same way `readRows` is bound, or `null` when missing.
  4. Pass `labels` as the merged `drillthrough` object.
- **Lines**: hard 120. No open/build logic in this file.
- **Rules to apply**: `kdb-object.mdc`, `feature-structure.mdc`, `error-handling.mdc` — keep the existing try/catch.

## Section D. Reducer behavior table

None. No reducer.

## Section E. Published selectors

None.

## Section F. Public API wiring

- `_KDB.services.tableData.readPendingLoad(input)` joins the read API object.
- `_KDB.services.drillthrough` stays `{ buildDrillthroughUrl, openDrillthrough }`.
- No new `_KDB.runtime` bucket. No state writes.

## Section G. Harness HTML spec

None.

## Section H. Harness JS spec

None.

## Section I. Mock extensions

None.

## Section J. Acceptance criteria

Match delta §7 items 1–11. Self-check by reading the code, not by running Cognos.

1. Success build still opens `built.url` and does not open `about:blank`.
2. `DRILLTHROUGH_ORG_TREE_MISSING` plus a thenable from `readPendingLoad` opens `about:blank` before `__controller` returns, and does not call `waitForRows` or `loadTable`.
3. `onFulfilled` rebuilds with the original spec and `location.replace` only when lifecycle is `ready` and rebuild `ok` is true.
4. `onRejected` writes `loadFailedBody`, leaves the window open, and does not call `notify`.
5. Not-ready fulfillment closes the window and does not toast.
6. Ready plus `DRILLTHROUGH_ORG_TREE_MISSING` writes `treeMissingBody` and leaves the window open.
7. Missing thenable returns the original failure and opens nothing.
8. Null `window.open` returns `DRILLTHROUGH_OPEN_BLOCKED` and does not attach.
9. `handle.closed` stops the continuation before `document` or `location`.
10. Nothing in drillthrough reads `pendingLoads`.
11. `readPendingLoad` on a one-item miss returns `null` and does not change lifecycle.

## Section K. Forbidden actions

- Do not edit widgetVis, `tables.js`, `syncDienststelleFromSicht.js`, `mapOrgPrompts.js`, `messageService`, contracts, or `.mdc` files.
- Do not call `waitForRows`, `loadTable`, `reloadTable`, `ensureFreshRows`, or `abortTable` from drillthrough.
- Do not read `_KDB.runtime.tableData` outside `readPendingLoadInputs.js`.
- Do not add a drillthrough method, flag, timer, event, or click lock.
- Do not grey out an icon.
- Do not change column order or the `#ALLE_GG#` marker.
- Do not commit or push.
- Do not put a German literal outside `drillthroughLabels.js`.
- Do not declare `openDrillthrough` `async`.

## Section L. Reporting template

Final response, in order: the 14 echoes from Section A, a file checklist with line counts, deviations, Section J pass/fail, open questions.

## Section M. Reviewer handoff

A different subagent reads the diff against this spec and the contract delta. The author of the code does not review it.

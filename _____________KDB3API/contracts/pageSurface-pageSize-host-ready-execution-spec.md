# Execution Spec: pageSurface applies Cognos page size after canvas-ready

> Mechanical spec for Grok 4.7. Architecture lives in `pageSurface-pageSize-host-ready-contractdelta.md` (**Approved**, PO vastenburg 2026-10-06). Do **not** re-decide wait vs list-skip, `budgetMs`, async `setCanvasPageSize`, candidate names, equality, or abort-vs-flush.
> No harness. Production tree only: `_____________KDB3API/KDB3/js/**`.
> One writer. Exclusive allowlist. Echo Section A **before** producing files.

---

**Status:** `Executed` — review PASS; Section M live green 2026-10-06
**Module / contract:** `contracts/pageSurface.md` + `contracts/pageSurface-pageSize-host-ready-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor coordinator, 2026-10-06
**Executing AI:** grok 4.7
**Reviewer:** coordinator + grok 4.7 spec review + PO Cognos

---

## Exclusive allowlist (one writer)

**May create:**

- `KDB3/js/dashboard/canvas/pageSurface/effects/applyPageSurfaceWhenReady.js`

**May edit:**

- `KDB3/js/dashboard/canvas/pageSurface/createPageSurfaceController.js`
- `KDB3/js/dashboard/canvas/pageSurface/__orchestratorPageSurface.js`
- `KDB3/js/core/services/cognosHost/facets/canvas/write/setCanvasPageSize.js`

**Must not edit:** everything else. Including: `applyPageSurface.js`, `readCanvasFacet.js`, `KDB.js`, `settingsPostDispatchSideEffects.js`, `whenCanvasReady.js`, `awaitHostReadyEvent.js`, `canvas.js`, `createCanvasAdapter.js`, `buildCanvasOutcome.js`, `canvasErrorCodes.js`, `convertUnitToPx.js`, any `widgetBase/**`, contracts, `.mdc`. No commit/push. Parent-contract text sync is **captain after live green**, not this writer.

### Global must-not

`.cursor/rules/*.mdc`, `contracts/**` (writer), `_archive/**`, git commit/push, folders `helpers` / `common` / `shared`, leftover `Support`, ES modules in `KDB3/js/**`, `_KDB.cognosAPI` / `__getDashboardAPI` from pageSurface files, `_KDB.services.cognosHost` lookup in deep files (stamp + `readCanvasFacet.js` only), new facet/op, `budgetMs` on `whenCanvasReady`, probing `pageSize.width` / `width` / height analogues, importing `convertUnitToPx` into ring 1, nested function declarations inside entry/async helper bodies, `async function () { ... }()` IIFE.

---

## Section A. Pre-flight read list

Executing AI **must** read each file, then echo **one sentence** per row **before** producing files. Wrong/missing echo → stop.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc` — this WP writes no `_KDB.state`.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — `abortControllers` + `pendingPromises`; abort on destroy; no foreign runtime.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — surface stays `{ mount, destroy, dispatch, getState }`; disposed guards.
5. `_____________KDB3API/.cursor/rules/events.mdc` — no events.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — ≤150 JS; orchestrator ≤120; contract outranks for this folder.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — `applyPageSurfaceWhenReady.js`; `__controller`; underscore on boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch on named executables; after await check `signal.aborted`; do not log abort as failure; aborted Outcome is not `AbortError`.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — this WP does not change DOM apply (stays in `applyPageSurface.js`).
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one `define`; named helpers at factory scope; no nested functions; async work in a named factory-scope helper.
11. `_____________KDB3API/.cursor/rules/cognos-adapter.mdc` — stamp + `readCanvasFacet`; no new op; `whenCanvasReady` already exists.
12. `_____________KDB3API/contracts/pageSurface-pageSize-host-ready-contractdelta.md` §4–§5 (design + PO decisions).
13. Live files: `createPageSurfaceController.js`, `__orchestratorPageSurface.js`, `effects/applyPageSurface.js`, `effects/readCanvasFacet.js`, `setCanvasPageSize.js`, `wait/whenCanvasReady.js` (read-only).
14. This spec.

---

## Section B. Folder tree

```
KDB3/js/dashboard/canvas/pageSurface/
  __orchestratorPageSurface.js          (edit)
  createPageSurfaceController.js        (edit)
  effects/applyPageSurfaceWhenReady.js  (create)
  effects/applyPageSurface.js           (do not edit)
  effects/readCanvasFacet.js            (do not edit)

KDB3/js/core/services/cognosHost/facets/canvas/write/
  setCanvasPageSize.js                  (edit)
```

---

## Section C. Per-file specifications

### C1. `effects/applyPageSurfaceWhenReady.js` (create)

- **Role:** effect — wait + exactly-one flush.
- **Lines:** target 110–150 (hard 150). Copied flush helpers plus waiter; do not invent a leftover split file.
- **AMD imports (2), order:**
  - `"./applyPageSurface.js"`
  - `"./readCanvasFacet.js"`
- **Factory params:** `_applyPageSurface`, `_readCanvasFacet`.
- **Constants at factory scope:** `AXES = ["width", "height", "background"]`; abort key `"pageSizeWait"`.
- **Factory-scope named helpers (all `function` declarations, none nested):**
  - `readRuntime(_KDB)` — ensure `_KDB.runtime.pageSurface` and return it (copy today’s controller helper).
  - `applyAxis(_KDB, _axis, _value)` — background → `applyPageBackground`; else `applyPageSize`. Copy today’s controller helper.
  - `dashboardValue(_dashboard, _axis)` — copy today’s helper.
  - `writePending(_KDB, _axis, _value)` — copy today’s helper.
  - `flushPending(_KDB)` — copy today’s helper (marks an axis flushed even when `convertUnitToPx` later no-ops inside `applyPageSize`).
  - `applyUnflushedSettings(_KDB, _flushed)` — copy `createPageSurfaceController.js:52-68` **verbatim in structure**: if no pending axis flushed, call `applyDashboardSettings` then **`return`** (without that return the per-axis loop paints background again). When **any** pending axis was flushed, apply only unflushed axes from settings (do not call `applyDashboardSettings`).
  - `shouldQueue(_instance)` — `true` when `_instance.didFlushAfterReady !== true`.
  - `flushOnce(_instance)` — if `_instance._isDisposed === true` or `didFlushAfterReady === true`, return. Else set `didFlushAfterReady = true` **first**, then `applyUnflushedSettings(_instance._KDB, flushPending(_instance._KDB))`.
  - `isAbortGate(_instance, _signal, _outcome)` — `true` when `_instance._isDisposed === true` OR (`_signal && _signal.aborted`) OR (`_outcome && _outcome.outcome === "aborted"`).
  - `clearPageSizeWaitPromise(_runtime, _p)` — if `!_runtime || !_runtime.pendingPromises` return. If `_runtime.pendingPromises.pageSizeWait === _p`, `delete _runtime.pendingPromises.pageSizeWait`.
  - `async function runApplyWhenReady(_instance, _signal)` — body below.
  - `startApplyWhenReady(_instance)` — body below.
  - `abortWait(_instance)` — abort + delete `runtime.abortControllers.pageSizeWait` if present. Do not flush. Do not delete `pendingPromises.pageSizeWait` here (the bound `clearPageSizeWaitPromise` does that when `p` settles, and only if the slot is still `p`).
- **`runApplyWhenReady` body (try/catch):**
  1. `const facet = _readCanvasFacet(_instance._KDB);`
  2. If `!facet || typeof facet.whenCanvasReady !== "function"`: if `_instance.didWarnMissingWhenReady !== true` { `_instance.didWarnMissingWhenReady = true`; `console.warn("[pageSurface.applyPageSurfaceWhenReady] canvasFacet.whenCanvasReady unavailable"); }` then if not `isAbortGate(_instance, _signal, null)` call `flushOnce(_instance)`; return.
  3. `const outcome = await facet.whenCanvasReady({ signal: _signal });` — **no `budgetMs`**.
  4. After await: if `isAbortGate(_instance, _signal, outcome)` return.
  5. If `!(outcome && outcome.ok === true && outcome.data && outcome.data.ready === true)`: `console.error("[pageSurface.applyPageSurfaceWhenReady] whenCanvasReady failed", outcome);`
  6. `flushOnce(_instance);`
  7. `catch`: if `isAbortGate(_instance, _signal, null)` return. If `err && err.name === "AbortError"` return (no log). Else `console.error("[pageSurface.applyPageSurfaceWhenReady] failed", err);` then if not disposed/aborted `flushOnce(_instance)`.
- **`startApplyWhenReady` body (try/catch — log `[pageSurface.startApplyWhenReady] failed` and **do not rethrow**; on catch, if not abort-gated, `flushOnce(_instance)` so mount cannot sit at `isMounted` with no waiter):**
  1. `const runtime = readRuntime(_instance._KDB);`
  2. `runtime.abortControllers = runtime.abortControllers || {};`
  3. `runtime.pendingPromises = runtime.pendingPromises || {};`
  4. If an existing `pageSizeWait` controller exists, `abort()` it (do not flush).
  5. `const controller = new AbortController();` `runtime.abortControllers.pageSizeWait = controller;`
  6. `const p = runApplyWhenReady(_instance, controller.signal);` `runtime.pendingPromises.pageSizeWait = p;`
  7. Attach settlement cleanup with **`.bind` only** — no nested function, no arrow, no `p.then(clearPageSizeWaitPromise)` (that would pass the settlement value as `_runtime`):
     `p.then(clearPageSizeWaitPromise.bind(null, runtime, p), clearPageSizeWaitPromise.bind(null, runtime, p));`
  8. Do not await in `startApplyWhenReady`.
- **Entry:** none. **Return** object:
  ```js
  {
    startApplyWhenReady: startApplyWhenReady,
    writePending: writePending,
    applyAxis: applyAxis,
    shouldQueue: shouldQueue,
    abortWait: abortWait
  }
  ```
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `error-handling.mdc`, `runtime.mdc`, `cognos-adapter.mdc`, `feature-structure.mdc`.

### C2. `createPageSurfaceController.js` (edit)

- **Role:** controller factory.
- **Lines:** must stay ≤150 (live 145; this edit must **shrink** by moving flush helpers out).
- **AMD imports (1):** `"./effects/applyPageSurfaceWhenReady.js"` only. **Remove** `applyPageSurface.js` import.
- **Keep** `INTENT_AXIS`, `readRuntime` (or inline a one-liner via the effect’s `writePending` which already ensures runtime — if `readRuntime` is only used for destroy, keep a local `readRuntime` for destroy’s runtime bucket), `guardDisposed`, `dispatch`, `mount`, `destroy`, `getState`, `createPageSurfaceController`.
- **Remove** from this file: `AXES`, `applyAxis`, `dashboardValue`, `writePending`, `flushPending`, `applyUnflushedSettings`, and the mount-time `applyUnflushedSettings(..., flushPending(...))` call.
- **Instance fields:** add `didFlushAfterReady: false`, `didWarnMissingWhenReady: false`. Keep `_KDB`, `_isDisposed`, `isMounted`, disposed-warn flags.
- **`dispatch`:** disposed guard unchanged. Unknown type return. Read value from payload. If `isMounted !== true` **or** `_whenReady.shouldQueue(_instance)`: `_whenReady.writePending(_instance._KDB, axis, value); return;`. Else `_whenReady.applyAxis(_instance._KDB, axis, value);`.
- **`mount`:** disposed guard unchanged. If `_instance.isMounted === true` return (no second waiter). `_instance.isMounted = true;` then `_whenReady.startApplyWhenReady(_instance);` — **do not flush here**.
- **`destroy`:** if already disposed return. Set `_isDisposed = true` **first**. Then `_whenReady.abortWait(_instance);` then `runtime.pending = {}`; `runtime.canvasFacet = null;`. Do not flush. Keep try/catch log `[pageSurface.destroy] failed`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `module-public-api.mdc`, `runtime.mdc`, `error-handling.mdc`, `feature-structure.mdc`.

### C3. `__orchestratorPageSurface.js` (edit)

- **Role:** orchestrator.
- **Lines:** stay ≤120 (live 40).
- In `ensureRuntime`, after ensuring `pending`, also: `_KDB.runtime.pageSurface.abortControllers = _KDB.runtime.pageSurface.abortControllers || {};` and `_KDB.runtime.pageSurface.pendingPromises = _KDB.runtime.pageSurface.pendingPromises || {};`.
- No other behavior. Do not stamp a second facet. Do not call `whenCanvasReady` here.
- **Rules to apply:** `amd.mdc`, `kdb-object.mdc`, `runtime.mdc`, `feature-structure.mdc`.

### C4. `setCanvasPageSize.js` (edit)

- **Role:** ring-1 write op. Stays **sync**. Entry remains `__controller`.
- **Lines:** stay ≤150 (live 94).
- **AMD imports:** unchanged (3). **Do not** import `convertUnitToPx`.
- `WIDTH_NAMES = ["pageSizeWidth"];` `HEIGHT_NAMES = ["pageSizeHeight"];` — delete the dotted/bare names.
- Add factory-scope `cssPxNumber(_cssPx)`: if `typeof _cssPx === "string"` and `_cssPx.slice(-2) === "px"`, `parseFloat` of the prefix, `isFinite` → `Math.round`, else `null`.
- Add factory-scope `isAlreadySet(_current, _cssPx)`:
  - `_current == null` → `false` (write). Use `== null` so both `null` and `undefined` write.
  - `_current === _cssPx` → `true`.
  - `px = cssPxNumber(_cssPx)`; if `px === null` → `false`.
  - `typeof _current === "number" && isFinite(_current) && Math.round(_current) === px` → `true`.
  - `typeof _current === "string"`: `trimmed = _current.trim();` true only if `trimmed === _cssPx` OR `trimmed === String(px)` OR `trimmed === String(px) + "px"`. `"1800cm"` is false.
  - else `false`.
- In `setPageSizeNow`, replace `current === _cssPx` with `isAlreadySet(current, _cssPx)`.
- Do not change Outcome codes, empty diagnostics on capability-miss, throw → `CANVAS_WRITE_FAILED`, or host-list leakage.
- **Rules to apply:** `cognos-adapter.mdc`, `amd.mdc`, `error-handling.mdc`, `naming.mdc`, `feature-structure.mdc`.

---

## Section D–I

N/A. No reducer, selectors, harness, or public-API shape change. Surface remains `{ mount, destroy, dispatch, getState }`. `getState` still returns `undefined`.

---

## Section J. Acceptance (writer self-check)

1. Allowlist only; `node --check` on every touched/created JS file.
2. Line counts: controller ≤150 **and lower than 145**; new file ≤150; orchestrator ≤120; `setCanvasPageSize.js` ≤150.
3. AMD: no nested function declarations; `runApplyWhenReady` is factory-scope `async function`; no async IIFE.
4. `whenCanvasReady({ signal })` has no `budgetMs`.
5. Abort/dispose/aborted Outcome: no `flushOnce`. Wait-fail / missing method: `flushOnce` once.
6. `didFlushAfterReady` set **before** applying.
7. Candidate arrays are only `pageSizeWidth` / `pageSizeHeight`.
8. No `convertUnitToPx` in ring 1. No `_KDB.cognosAPI` / `__getDashboardAPI` / `_KDB.services.cognosHost` in pageSurface deep files.
9. Report Section L: line counts, AMD import counts, pre-flight echo.

---

## Section K. Forbidden actions

Same as Global must-not. Do not implement dropboxTarget. Do not retile widgets. Do not edit contracts.

---

## Section L. Reporting template

1. Pre-flight echo (14 sentences).
2. File checklist: path, lines, imports, matches spec | deviation.
3. Deviations with motivation.
4. Self-check J1–J9 pass/fail.
5. Open questions.

---

## Section M. Live acceptance (PO, after deploy)

1. Cold reload: no `[pageSurface.applyPageSize] setCanvasPageSize failed` pair with `CANVAS_HOST_CAPABILITY_MISSING`.
2. Probe: `pageSizeWidth` / `pageSizeHeight` still 1800 / 800 (or match Steuerungspanel).
3. Change dashboard width in settings after load: host value follows.
4. Optional: destroy/reload during load — no throw in console from pageSurface.

Captain text-sync (`pageSurface.md`, `pageSurface-execution-spec.md`, `cognosHostService.md` §158 + §7) only after this live list is green; then delta status `Implemented`.

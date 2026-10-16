# Execution Spec: `loadingService` (`direct port`)

> Direct-port execution spec for porting legacy-known-good `loadingService` from `_______KDB3/KDB3/js/core/services/loadingService/` into the production redesign tree.
>
> This is a rule-alignment port only: preserve legacy loading behavior and apply AMD shape, service public API discipline, state/runtime separation, runtime cleanup, error boundaries, naming, and disposed-state guards.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/loadingService.md`
**Phase:** `full direct port`
**Authoring AI:** GPT-5.5, 2026-05-16
**Executing AI:** TBD
**Reviewer:** user + mid-tier AI

---

## CP-1 Approved Decisions

1. Target path: `_____________KDB3API/KDB3/js/core/services/loadingService/`.
2. State ownership: `_KDB.state.loading`, canonical writer `loadingService`.
3. Public service key: `_KDB.services.loading` for direct-port legacy compatibility.
4. Public methods: `startLoading`, `finishLoading`, `destroy`.
5. Factory file: `createLoadingService.js`.
6. Runtime owner: `_KDB.runtime.loadingService`.
7. No events, no `events/eventNames.js`, no `eventSubscribe.md` edit.
8. Teardown method: `destroy()` only; no `dispose()` alias.
9. Service-owned loading overlay DOM is accepted for this direct-port tranche.
10. Timer behavior preserves legacy defaults: `watchdogMs = 300000`, `removeDelayMs = 0`.
11. Legacy fallback mount target remains `_KDB.elements.kdbWidget`.
12. Loading handle shape remains legacy-compatible: `{ mountKey, mountEl }`; the handle is never stored in `_KDB.state`.
13. Bootstrap registration in `KDB.js` / `core/services/__orchestratorServices.js` is documented as later integration work and must not be performed in this tranche.

---

## Section A. Pre-flight Read List

The executing AI must read these files in order before producing output. Its first response must echo one sentence per item. If any summary is missing or generic, stop and reread.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/_template.md`
13. `_____________KDB3API/contracts/loadingService.md`
14. This execution spec.

The executing AI must not create or edit any file until those 14 summaries are present.

---

## Section B. Legacy Inputs

Primary source files:

```txt
_______KDB3/KDB3/js/core/services/loadingService/
  __orchestratorLoadingService.js
  createLoadingService.js
```

Context-only source files:

```txt
_______KDB3/KDB3/js/core/services/__orchestratorServices.js
_______KDB3/KDB3/js/KDB.js
```

Do not modify, move, rename, delete or format any legacy file.

---

## Section C. Mapping Table

| New production file | Legacy source file(s) | Rule-alignment note |
|---|---|---|
| `KDB3/js/core/services/loadingService/__orchestratorLoadingService.js` | `loadingService/__orchestratorLoadingService.js`, `core/services/__orchestratorServices.js` | Keep thin orchestrator shape; register `_KDB.services.loading` inside this orchestrator when called; do not edit bootstrap/services index in this tranche. |
| `KDB3/js/core/services/loadingService/createLoadingService.js` | `loadingService/createLoadingService.js` | Convert legacy two-method factory into named-method service with `startLoading`, `finishLoading`, `destroy`; add `_isDisposed` guard and mandatory try/catch on named executables; lifecycle boundaries convert errors; keep legacy no-op returns. |
| `KDB3/js/core/services/loadingService/runtime/ensureLoadingRuntime.js` | Legacy factory-scope `WATCHDOG_BY_MOUNT_KEY`, `POSITION_OVERRIDE_BY_MOUNT_KEY` | Initialize `_KDB.runtime.loadingService.timers` and `.domRefs`; no factory-scope Maps or module-level mutable state. |
| `KDB3/js/core/services/loadingService/runtime/clearLoadingRuntime.js` | Legacy `clearWatchdog`, `removeSpinnerAfterDelay`, `resetMountPositioning` cleanup paths | Clear all watchdog/remove-delay timers, remove spinners, remove `KDB_hide`, restore positions, reset runtime buckets; idempotent. |
| `KDB3/js/core/services/loadingService/state/ensureLoadingEntry.js` | Legacy `ensureLoadingState`, `ensureLoadingEntry` | Owner-only helper for `_KDB.state.loading[mountKey]`; store only serializable `{ activeCount, isActive }`. |
| `KDB3/js/core/services/loadingService/state/markLoadingStarted.js` | Legacy `currentEntry.activeCount += 1; currentEntry.isActive = true` | Owner-only writer; preserve overlap semantics. |
| `KDB3/js/core/services/loadingService/state/markLoadingFinished.js` | Legacy decrement/clamp and inactive transition | Owner-only writer; preserve hide-before-show and repeated-finish no-op behavior via zero clamp. |
| `KDB3/js/core/services/loadingService/state/markAllLoadingDisposed.js` | No legacy direct equivalent | Required for `destroy()` cleanup; set known entries inactive without storing runtime resources in state. |
| `KDB3/js/core/services/loadingService/effects/applyLoadingOverlay.js` | Legacy `startLoading`, `resolveMountElement`, `resolveMountKey`, `ensureMountPositioning`, `ensureSpinner`, `startWatchdog` | DOM/timer side effects for start path; preserve markup/classes/default fallback; store runtime refs under `_KDB.runtime.loadingService`. |
| `KDB3/js/core/services/loadingService/effects/removeLoadingOverlay.js` | Legacy `finishLoading`, `resolveFinishMountElement`, `resolveFinishMountKey`, `clearWatchdog`, `removeSpinnerAfterDelay` | DOM/timer side effects for finish path; preserve active-count gate and delayed removal. |
| `KDB3/js/core/services/loadingService/effects/scheduleLoadingWatchdog.js` | Legacy `startWatchdog`, `clearWatchdog` | Preserve watchdog default and auto-finish behavior; timer id lives in runtime. |
| `KDB3/js/core/services/loadingService/effects/scheduleOverlayRemoval.js` | Legacy `removeSpinnerAfterDelay`, `resetMountPositioning` | Preserve remove-delay default; remove spinner, remove `KDB_hide`, restore position; timer id lives in runtime. |

---

## Section D. Folder Tree

Create these files only:

```txt
_____________KDB3API/KDB3/js/core/services/loadingService/
  __orchestratorLoadingService.js
  createLoadingService.js
  runtime/
    ensureLoadingRuntime.js
    clearLoadingRuntime.js
  state/
    ensureLoadingEntry.js
    markLoadingStarted.js
    markLoadingFinished.js
    markAllLoadingDisposed.js
  effects/
    applyLoadingOverlay.js
    removeLoadingOverlay.js
    scheduleLoadingWatchdog.js
    scheduleOverlayRemoval.js
```

Do not create `events/`, `TEST/`, harness files, CSS files, README files, mocks, or bootstrap integration files.

---

## Section E. Public API Contract

The orchestrator registers one service surface:

```js
_KDB.services.loading = {
  startLoading: startLoading,
  finishLoading: finishLoading,
  destroy: destroy
};
```

Method contracts:

| Method | Input | Returns | Behavior |
|---|---|---|---|
| `startLoading` | `{ mountEl?, mountKey?, transparent?, watchdogMs? }` | loading handle or `null` | No-op `null` for missing `_KDB` or missing mount; otherwise increments active count, applies overlay, starts watchdog. |
| `finishLoading` | `{ mountEl?, mountKey?, handle?, removeDelayMs? }` | `undefined` | No-op for missing `_KDB` or missing mount; decrements active count; removes overlay only when count reaches zero. |
| `destroy` | none | `undefined` | Idempotent teardown; set `_isDisposed = true`, clear timers, remove overlays, restore positions, reset runtime, mark state inactive. |

Post-disposal behavior:

- `startLoading` returns `null` and logs `console.warn("[loadingService.startLoading] called after destroy")` once.
- `finishLoading` returns `undefined` and logs `console.warn("[loadingService.finishLoading] called after destroy")` once.
- `destroy` returns silently on second call.
- Disposed guards do not throw.

---

## Section F. State And Runtime Semantics

State owner:

```js
_KDB.state.loading
```

Per-mount state shape:

```js
{
  activeCount: 0,
  isActive: false
}
```

Runtime owner:

```js
_KDB.runtime.loadingService
```

Runtime shape:

```js
{
  timers: {
    watchdogsByMountKey: {},
    removeDelaysByMountKey: {}
  },
  domRefs: {
    mountsByMountKey: {},
    spinnersByMountKey: {},
    positionOverridesByMountKey: {}
  }
}
```

No DOM node, timer id, jQuery object, function, Promise, `Map`, Cognos object or loading handle may be stored in `_KDB.state.loading`.

---

## Section G. Per-file Specifications

### `loadingService/__orchestratorLoadingService.js`

- **Role:** service orchestrator.
- **Lines:** target 20-40, hard limit 120.
- **AMD imports:**
  - `"./createLoadingService.js"`
- **Factory parameters:** `_createLoadingService`
- **Entry function:** `__orchestrator(_KDB)`
- **Body steps:**
  1. Wrap body in `try/catch`.
  2. Ensure `_KDB.services = _KDB.services || {}`.
  3. Create service with `_createLoadingService(_KDB)`.
  4. Register it at `_KDB.services.loading`.
  5. Return `_KDB.services.loading`.
  6. On catch, log `console.error("[loadingService.__orchestrator] failed", error)` and rethrow.
- **Return value:** `__orchestrator`
- **Rules to apply:**
  - `amd.mdc` - one explicit AMD `define([...], function (...) { ... })`; named `__orchestrator`; no inline subfunctions.
  - `naming.mdc` - AMD import binding uses underscore prefix; function name is canonical.
  - `feature-structure.mdc` - orchestrator wires only; no business logic, DOM logic or state mutation beyond service registration.
  - `kdb-object.mdc` - registers under existing `_KDB.services`, no new top-level `_KDB` key.
  - `module-public-api.mdc` - shared service surface is named-method service at `_KDB.services.loading`.
  - `error-handling.mdc` - service startup boundary has `try/catch` with contextual log.

### `loadingService/createLoadingService.js`

- **Role:** service factory.
- **Lines:** target 80-120, hard limit 150.
- **AMD imports:**
  - `"./runtime/ensureLoadingRuntime.js"`
  - `"./runtime/clearLoadingRuntime.js"`
  - `"./state/markAllLoadingDisposed.js"`
  - `"./effects/applyLoadingOverlay.js"`
  - `"./effects/removeLoadingOverlay.js"`
- **Factory parameters:** `_ensureLoadingRuntime`, `_clearLoadingRuntime`, `_markAllLoadingDisposed`, `_applyLoadingOverlay`, `_removeLoadingOverlay`
- **Factory-scope named helpers:**
  - `function warnDisposed(methodName, didWarnDisposed) { ... }` or equivalent helper for warn-once guard.
  - `function logPublicMethodError(methodName, error) { ... }`
- **Entry function:** `createLoadingService(_KDB)`
- **Body steps:**
  1. Declare closure booleans `_isDisposed = false` and per-method warning flags.
  2. Call `_ensureLoadingRuntime(_KDB)` once at factory creation.
  3. Define `startLoading(_options)` with disposed guard, `try/catch`, then `_applyLoadingOverlay(_KDB, _options)`.
  4. Define `finishLoading(_options)` with disposed guard, `try/catch`, then `_removeLoadingOverlay(_KDB, _options)`.
  5. Define `destroy()` as idempotent: if already disposed return; set `_isDisposed = true` before cleanup; call `_clearLoadingRuntime(_KDB)`; call `_markAllLoadingDisposed(_KDB)`.
  6. Return `{ startLoading, finishLoading, destroy }`.
- **Return value:** `createLoadingService`
- **Rules to apply:**
  - `amd.mdc` - named service factory at factory scope; no inline subfunctions inside public methods; factory closure state only for `_isDisposed` and warn flags, not runtime resources.
  - `naming.mdc` - `createLoadingService`; `_options` and `_KDB` are boundary inputs; local callback args have no underscore.
  - `feature-structure.mdc` - service factory owns public methods; side effects delegated to focused files.
  - `module-public-api.mdc` - named-method service; no dispatch; no mixed shape; disposed guards on all public methods; `destroy()` idempotent.
  - `state.mdc` - no direct foreign state writes; only calls owner writer helper for `_KDB.state.loading`.
  - `runtime.mdc` - runtime resources cleaned through `_clearLoadingRuntime`; no module-scope timers/Maps.
  - `error-handling.mdc` - public method boundaries use `try/catch`; catches log with method context and preserve legacy return shape (`null` for `startLoading`, `undefined` for `finishLoading`/`destroy`).

### `loadingService/runtime/ensureLoadingRuntime.js`

- **Role:** runtime initializer.
- **Lines:** target 30-60, hard limit 120.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB)`
- **Body steps:**
  1. Ensure `_KDB.runtime = _KDB.runtime || {}`.
  2. Ensure `_KDB.runtime.loadingService`.
  3. Ensure `timers.watchdogsByMountKey`, `timers.removeDelaysByMountKey`, `domRefs.mountsByMountKey`, `domRefs.spinnersByMountKey`, `domRefs.positionOverridesByMountKey`.
  4. Return `_KDB.runtime.loadingService`.
- **Return value:** `__controller`
- **Rules to apply:**
  - `amd.mdc` - one AMD module, returns one helper.
  - `naming.mdc` - `__controller` for normal executable helper.
  - `runtime.mdc` - runtime resources under `_KDB.runtime.loadingService`; standard `timers` and `domRefs` buckets only.
  - `state.mdc` - no writes to `_KDB.state`.

### `loadingService/runtime/clearLoadingRuntime.js`

- **Role:** runtime cleanup helper.
- **Lines:** target 70-110, hard limit 150.
- **AMD imports:**
  - `"./ensureLoadingRuntime.js"`
- **Factory parameters:** `_ensureLoadingRuntime`
- **Factory-scope named helpers:**
  - `function clearTimerMap(timerMap) { ... }`
  - `function removeSpinner(spinnerEl) { ... }`
  - `function restoreMount(mountEl, originalPosition) { ... }`
- **Entry function:** `__controller(_KDB)`
- **Body steps:**
  1. Resolve runtime via `_ensureLoadingRuntime(_KDB)`.
  2. Clear every timeout id in both timer maps using `clearTimeout`.
  3. Remove every spinner element still connected.
  4. For each mount, remove class `KDB_hide`.
  5. Restore original inline position values from `positionOverridesByMountKey`.
  6. Reset runtime buckets to empty objects.
- **Return value:** `__controller`
- **Rules to apply:**
  - `amd.mdc` - helper functions at factory scope only.
  - `runtime.mdc` - cleanup clears timers and live DOM refs before resetting buckets.
  - `dom.mdc` - live DOM refs remain runtime-private; cleanup does not store DOM in state.
  - `error-handling.mdc` - called from `destroy()` boundary; helper should not swallow unexpected errors silently.

### `loadingService/state/ensureLoadingEntry.js`

- **Role:** state writer/helper.
- **Lines:** target 20-40, hard limit 120.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB, _mountKey)`
- **Body steps:**
  1. Ensure `_KDB.state = _KDB.state || {}`.
  2. Ensure `_KDB.state.loading = _KDB.state.loading || {}`.
  3. Ensure `_KDB.state.loading[_mountKey] = { activeCount: 0, isActive: false }` when missing.
  4. Return the entry.
- **Return value:** `__controller`
- **Rules to apply:**
  - `state.mdc` - writes only service-owned `_KDB.state.loading`; stores serializable values only.
  - `naming.mdc` - boundary inputs underscore-prefixed.
  - `amd.mdc` - one helper export.

### `loadingService/state/markLoadingStarted.js`

- **Role:** state writer.
- **Lines:** target 20-35, hard limit 120.
- **AMD imports:**
  - `"./ensureLoadingEntry.js"`
- **Factory parameters:** `_ensureLoadingEntry`
- **Entry function:** `__controller(_KDB, _mountKey)`
- **Body steps:**
  1. Resolve entry with `_ensureLoadingEntry`.
  2. Increment `activeCount` by 1.
  3. Set `isActive = true`.
  4. Return entry.
- **Return value:** `__controller`
- **Rules to apply:**
  - `state.mdc` - owner-only serializable state write.
  - `naming.mdc` - precise writer name and boundary inputs.
  - `amd.mdc` - full-compact helper module.

### `loadingService/state/markLoadingFinished.js`

- **Role:** state writer.
- **Lines:** target 25-45, hard limit 120.
- **AMD imports:**
  - `"./ensureLoadingEntry.js"`
- **Factory parameters:** `_ensureLoadingEntry`
- **Entry function:** `__controller(_KDB, _mountKey)`
- **Body steps:**
  1. Resolve entry with `_ensureLoadingEntry`.
  2. Set `activeCount = Math.max(0, activeCount - 1)`.
  3. If `activeCount === 0`, set `isActive = false`.
  4. Return entry.
- **Return value:** `__controller`
- **Rules to apply:**
  - `state.mdc` - owner-only serializable state write.
  - `error-handling.mdc` - preserve hide-before-show no-op via zero clamp, do not throw.
  - `amd.mdc` - full-compact helper module.

### `loadingService/state/markAllLoadingDisposed.js`

- **Role:** state writer for destroy.
- **Lines:** target 25-50, hard limit 120.
- **AMD imports:** none.
- **Entry function:** `__controller(_KDB)`
- **Body steps:**
  1. If `_KDB.state.loading` is missing, return.
  2. Iterate own keys.
  3. Set every entry to `activeCount = 0` and `isActive = false`.
- **Return value:** `__controller`
- **Rules to apply:**
  - `state.mdc` - owner-only serializable state write; no lifecycle term introduced because legacy state has no lifecycle field.
  - `runtime.mdc` - does not touch runtime cleanup.
  - `amd.mdc` - one helper export.

### `loadingService/effects/applyLoadingOverlay.js`

- **Role:** start-loading DOM/timer effect.
- **Lines:** target 90-130, hard limit 150.
- **AMD imports:**
  - `"../runtime/ensureLoadingRuntime.js"`
  - `"../state/markLoadingStarted.js"`
  - `"./scheduleLoadingWatchdog.js"`
- **Factory parameters:** `_ensureLoadingRuntime`, `_markLoadingStarted`, `_scheduleLoadingWatchdog`
- **Factory-scope constants:** `SPINNER_SELECTOR`, `SPINNER_HTML`
- **Factory-scope named helpers:**
  - `function resolveMountElement(_KDB, _options) { ... }`
  - `function resolveMountKey(_mountEl, _options) { ... }`
  - `function ensureMountPositioning(runtime, mountEl, mountKey) { ... }`
  - `function ensureSpinner(runtime, mountEl, mountKey, isTransparent) { ... }`
- **Entry function:** `__controller(_KDB, _options)`
- **Body steps:**
  1. If `_KDB` is missing/not object, return `null`.
  2. Resolve mount element from `_options.mountEl`; otherwise legacy fallback `_KDB.elements.kdbWidget`; if missing, return `null`.
  3. Resolve mount key from `_options.mountKey`, else `mountEl.id`, else `"kdb-root-loading"`.
  4. Ensure runtime and store `runtime.domRefs.mountsByMountKey[mountKey] = mountEl`.
  5. Call `_markLoadingStarted(_KDB, mountKey)`.
  6. If computed style position is `static`, store original inline position and set `position = "relative"`.
  7. Add class `KDB_hide`.
  8. Insert spinner markup only if no `.loadingIndicatorContainer` exists.
  9. Store spinner ref when available.
  10. Call `_scheduleLoadingWatchdog(_KDB, { mountEl, mountKey, watchdogMs })`.
  11. Return legacy-compatible `{ mountKey: mountKey, mountEl: mountEl }`.
- **Return value:** `__controller`
- **Rules to apply:**
  - `amd.mdc` - constants/helpers at factory scope; no inline subfunctions in entry body.
  - `dom.mdc` - DOM mutation is isolated to effect file; live refs stored in runtime, not state.
  - `runtime.mdc` - mount/spinner/position refs under `_KDB.runtime.loadingService.domRefs`.
  - `state.mdc` - serializable state writes happen only via `_markLoadingStarted`.
  - `error-handling.mdc` - called from public boundary; preserve normal invalid input returns.
  - `naming.mdc` - constants uppercase; CSS class string preserved from legacy.

### `loadingService/effects/removeLoadingOverlay.js`

- **Role:** finish-loading DOM/timer effect.
- **Lines:** target 80-120, hard limit 150.
- **AMD imports:**
  - `"../runtime/ensureLoadingRuntime.js"`
  - `"../state/markLoadingFinished.js"`
  - `"./scheduleOverlayRemoval.js"`
- **Factory parameters:** `_ensureLoadingRuntime`, `_markLoadingFinished`, `_scheduleOverlayRemoval`
- **Factory-scope named helpers:**
  - `function resolveFinishMountElement(_KDB, _options, runtime) { ... }`
  - `function resolveFinishMountKey(_mountEl, _options) { ... }`
  - `function clearWatchdog(runtime, mountKey) { ... }`
- **Entry function:** `__controller(_KDB, _options)`
- **Body steps:**
  1. If `_KDB` is missing/not object, return.
  2. Ensure runtime.
  3. Resolve mount element from `_options.mountEl`, then `_options.handle.mountEl`, then runtime by `handle.mountKey` / `mountKey`, then legacy fallback `_KDB.elements.kdbWidget`.
  4. If mount missing, return.
  5. Resolve mount key from `_options.mountKey`, then `_options.handle.mountKey`, then `mountEl.id`, else `"kdb-root-loading"`.
  6. Call `_markLoadingFinished(_KDB, mountKey)`.
  7. If resulting `activeCount > 0`, return.
  8. Clear watchdog timer for mount key.
  9. Call `_scheduleOverlayRemoval(_KDB, { mountEl, mountKey, removeDelayMs })`.
- **Return value:** `__controller`
- **Rules to apply:**
  - `amd.mdc` - helpers at factory scope only.
  - `runtime.mdc` - clears watchdog timer before delayed DOM removal; no runtime refs in state.
  - `state.mdc` - active-count mutation through writer only.
  - `dom.mdc` - DOM mutation isolated to effect/removal helper.
  - `error-handling.mdc` - preserve no-op behavior for missing mount and hide-before-show.

### `loadingService/effects/scheduleLoadingWatchdog.js`

- **Role:** watchdog timer effect.
- **Lines:** target 45-80, hard limit 120.
- **AMD imports:**
  - `"../runtime/ensureLoadingRuntime.js"`
- **Factory parameters:** `_ensureLoadingRuntime`
- **Factory-scope constant:** `DEFAULT_WATCHDOG_MS = 300000`
- **Factory-scope named helpers:**
  - `function clearExistingWatchdog(runtime, mountKey) { ... }`
  - `function runWatchdogFinish(_KDB, mountEl, mountKey) { ... }`
- **Entry function:** `__controller(_KDB, _options)`
- **Body steps:**
  1. Resolve runtime and mount key.
  2. Clear existing watchdog for that mount key.
  3. Compute timeout from `_options.watchdogMs`; if finite and > 0 use it, else `300000`.
  4. Store timeout id at `runtime.timers.watchdogsByMountKey[mountKey]`.
  5. Timeout callback must not define nested subfunctions; it may call factory-scope `runWatchdogFinish(_KDB, mountEl, mountKey)`.
  6. `runWatchdogFinish` calls `_KDB.services.loading.finishLoading({ mountEl, mountKey, removeDelayMs: 0 })` when available.
- **Return value:** `__controller`
- **Rules to apply:**
  - `runtime.mdc` - timer handle under runtime timers bucket; previous timer cleared before replacement.
  - `amd.mdc` - no inline function declarations inside entry flow; callback delegates to factory-scope helper.
  - `module-public-api.mdc` - watchdog uses service public API for finish path, preserving state/runtime invariants.
  - `error-handling.mdc` - fire-and-forget callback catches/logs unexpected errors with `[loadingService.watchdog]`.

### `loadingService/effects/scheduleOverlayRemoval.js`

- **Role:** delayed overlay removal effect.
- **Lines:** target 65-100, hard limit 150.
- **AMD imports:**
  - `"../runtime/ensureLoadingRuntime.js"`
- **Factory parameters:** `_ensureLoadingRuntime`
- **Factory-scope constant:** `DEFAULT_REMOVE_DELAY_MS = 0`
- **Factory-scope named helpers:**
  - `function clearExistingRemoval(runtime, mountKey) { ... }`
  - `function removeOverlayNow(runtime, mountEl, mountKey) { ... }`
- **Entry function:** `__controller(_KDB, _options)`
- **Body steps:**
  1. Resolve runtime, mount element and mount key.
  2. Clear existing remove-delay timer for the same mount key.
  3. Compute delay from `_options.removeDelayMs`; if finite and >= 0 use it, else `0`.
  4. Store timeout id at `runtime.timers.removeDelaysByMountKey[mountKey]`.
  5. Timeout callback delegates to `removeOverlayNow`.
  6. `removeOverlayNow` removes spinner if present, removes `KDB_hide`, restores original inline position from runtime, and deletes runtime refs for this mount key.
- **Return value:** `__controller`
- **Rules to apply:**
  - `runtime.mdc` - remove-delay timer and live DOM refs under runtime; cleanup deletes refs after use.
  - `dom.mdc` - DOM removal/restoration only in effect helper; no state writes.
  - `error-handling.mdc` - timeout callback catches/logs unexpected errors with `[loadingService.removeOverlay]`.
  - `amd.mdc` - factory-scope helper pattern, no nested subfunction declarations.

---

## Section H. Acceptance Criteria

The executing AI must self-verify before reporting:

1. All files in Section D exist and no other files were created.
2. Every file follows full-compact AMD shape and returns one value.
3. No ES module syntax, CommonJS, multiple `define` calls, dynamic `define`, or top-level side effects outside AMD factory.
4. No inline subfunction declarations inside entry functions, callbacks or return paths.
5. `_KDB.services.loading` is registered by `__orchestratorLoadingService.js`; `_KDB.services.loadingService` is not used.
6. Public API exposes exactly `startLoading`, `finishLoading`, `destroy`.
7. `startLoading` returns legacy-compatible `{ mountKey, mountEl }` or `null`; this handle is never written to `_KDB.state`.
8. `_KDB.state.loading` stores only serializable `{ activeCount, isActive }` entries.
9. Timers, DOM refs, spinner refs and position overrides live only under `_KDB.runtime.loadingService`.
10. Legacy defaults are preserved: `watchdogMs = 300000`, `removeDelayMs = 0`, fallback mount `_KDB.elements.kdbWidget`, default key `"kdb-root-loading"`, class `KDB_hide`, spinner selector `.loadingIndicatorContainer`.
11. Overlap semantics are preserved: repeated start increments count; finish decrements with zero clamp; overlay removal only when count reaches zero.
12. `destroy()` is idempotent, sets `_isDisposed = true` before cleanup, clears all timers, removes overlays, restores positions, resets runtime buckets and marks state inactive.
13. No event constants file is created and no events are emitted/subscribed.
14. No bootstrap file is edited.
15. No legacy, rules, templates, architecture authority docs or `eventSubscribe.md` are edited.

---

## Section I. Reviewer Checks After Execution

The supervising AI or reviewer must:

1. Verify the Section A pre-flight echo is present and specific.
2. Read every created file.
3. Run `ReadLints` on all new production `.js` files.
4. Verify every AMD import resolves within `loadingService/`.
5. Verify no bootstrap registration was performed.
6. Diff-walk against `_______KDB3/KDB3/js/core/services/loadingService/createLoadingService.js` and confirm behavior drift is limited to approved rule-alignment:
   - runtime resources moved out of factory-scope Maps;
   - `destroy()` and disposed guards added;
   - public boundary `try/catch` added;
   - state/runtime separation applied;
   - service key remains `_KDB.services.loading`;
   - handle remains legacy-compatible.

---

## Section J. Forbidden Actions

The executing AI must not:

- Modify any file under `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, `filesExplained.md`, litmustest reports, `_template.md`, or `_executionSpecTemplate.md`.
- Modify `_____________KDB3API/contracts/loadingService.md`.
- Modify `_______KDB3/`, `_______REDESIGN2/`, `_______LAATSTEORIGINAL/`, or `TEST/`.
- Create `TEST/` files, browser harnesses, mocks, CSS files, README files, or test files.
- Edit `KDB.js` or `core/services/__orchestratorServices.js` in this tranche.
- Add events, event constants, event catalog entries, new lifecycle terms or new top-level `_KDB` namespaces.
- Rename the service surface to `_KDB.services.loadingService`.
- Store DOM nodes, timer ids, functions, promises, maps or handles in `_KDB.state.loading`.
- Change legacy timing, active-count, fallback, class, spinner selector, or no-op semantics unless a rule conflict is reported and approved.
- Commit, push, or change git config.

---

## Section L. Reporting Template

The executing AI's final response must include:

1. **Pre-flight echo** - 14 numbered summaries from Section A.
2. **File checklist** - every created path with line count and `matches spec` or `deviation`.
3. **Mapping confirmation** - one line per mapping-table row confirming the legacy source and rule-alignment change.
4. **Self-verification** - pass/fail for each Section H acceptance criterion.
5. **Open questions / blockers** - only if execution could not follow this spec exactly.

---

## Section M. Known Deferred Integration Work

Do not implement these in this tranche:

- Add `loadingService/__orchestratorLoadingService.js` import to `KDB3/js/core/services/__orchestratorServices.js`.
- Ensure `KDB.js` or bootstrap startup uses `_KDB.services.loading` once the service is registered.
- Add `_KDB.state.loading` to `architecture/stateOwnership.md` in an approved documentation tranche.
- Add `filesExplained.md` entry for `loadingService` in an approved documentation tranche.

---

> End of execution spec.

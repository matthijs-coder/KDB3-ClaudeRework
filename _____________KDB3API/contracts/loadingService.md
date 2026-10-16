# Module Contract: `loadingService`

> Direct-port CP-1 contract for the legacy-known-good loading overlay service. This contract translates the legacy service shape into the 2026 rule set without behavior redesign.

---

**Status:** `Approved` — live Q3 A / Q8 / Q12 A as ported; overlay coverage + German caption: `contracts/_archive/loadingService-overlay-coverage-contractdelta.md` (PO vastenburg 2026-09-02); PDF mid-run captions: `contracts/_archive/loadingService-dashboardPdf-progress-caption-contractdelta.md` (`updateLoadingMessage`, PO vastenburg 2026-09-04)
**Owner module / service:** `loadingService`
**Type:** `shared service candidate / runtime-DOM boundary`
**Authoring AI:** GPT-5.5, 2026-05-16
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## Legacy Survey

Primary legacy source used:

| Legacy file | Role |
|---|---|
| `legacy:js/core/services/loadingService/createLoadingService.js` | Named-method service factory for starting and finishing loading overlays. |
| `legacy:js/core/services/loadingService/__orchestratorLoadingService.js` | Thin orchestrator that returns the service instance. |
| `legacy:js/core/services/__orchestratorServices.js` | Registers legacy `_KDB.services.loading`. |
| `legacy:js/KDB.js` | Uses `_KDB.services.loading.startLoading(...)` before module startup and `finishLoading(...)` in the initialization `finally` path. |

No fallback source was needed because the primary legacy folder exists and contains the complete service.

Legacy behavior summary:

- `startLoading(options)` resolves a mount element, increments `_KDB.state.loading[mountKey].activeCount`, sets `isActive: true`, applies `position: relative` if needed, adds `KDB_loading` (not `KDB_hide`; see overlay-coverage delta), inserts a spinner if absent, starts a watchdog timeout, and returns `{ mountKey, mountEl }`.
- `finishLoading(options)` resolves the mount element from `options.mountEl`, `options.handle.mountEl`, or the default widget root, decrements `activeCount`, and only when the count reaches zero clears the watchdog and schedules spinner removal with `removeDelayMs`.
- `watchdogMs` defaults to `300000`; `removeDelayMs` defaults to `0`; `transparent === true` selects the transparent spinner class.
- Repeated `startLoading` calls overlap via `activeCount`; repeated or early `finishLoading` clamps the count at zero and removes the overlay only when no active load remains.

---

## CP-1 Decisions Needed

| ID | Recommendation | Reason / trade-off |
|---|---|---|
| **Q1 Target path** | Use `KDB3/js/core/services/loadingService/`. | The legacy module is a shared infrastructure service under `core/services`, and no existing rule defines a better runtime-UI service folder. This remains a service with DOM side effects, so Q8 must also be accepted. |
| **Q2 State ownership** | Keep `_KDB.state.loading` with canonical writer `loadingService`. | Legacy already stores only serializable confirmed state there: per-mount `activeCount` and `isActive`. Timers, DOM refs and position overrides must move to `_KDB.runtime.loadingService`. |
| **Q3 Public API surface** | Choose service key **A** `_KDB.services.loading` (recommended for direct-port legacy compatibility) or **B** `_KDB.services.loadingService` (naming-uniform, requires later caller migration). Methods: `startLoading`, `finishLoading`, `destroy`. | Legacy registers and consumes `_KDB.services.loading`. The rules do not explicitly require the key to equal the module folder name, so direct-port compatibility prefers `_KDB.services.loading`. `destroy` is verified against `module-public-api.mdc` as the required teardown method name. |
| **Q4 Factory naming** | Use `createLoadingService.js`. | This is the existing legacy name and matches the service role without the awkward double-Service form. |
| **Q5 Runtime resources** | Use `_KDB.runtime.loadingService.timers` and `.domRefs`; no module-scope `Map`. | Legacy factory-scope `WATCHDOG_BY_MOUNT_KEY` and `POSITION_OVERRIDE_BY_MOUNT_KEY` survive instances and violate `amd.mdc`; rule-alignment moves them to owner runtime. Legacy has no pending promises. |
| **Q6 Events** | No events and no `events/eventNames.js`. | Legacy emits/subscribes to no events, and there is no known independent consumer. Adding fact-events would be behavior/API expansion and would require `eventSubscribe.md` approval. |
| **Q7 Disposed-state discipline** | Add `_isDisposed` in the service closure and expose `destroy()`, not `dispose()`. | Verified against `module-public-api.mdc`: the disposed-state protocol names `destroy()` as the teardown method and makes it idempotent. No alias is introduced. |
| **Q8 DOM responsibility** | Accept service-owned loading overlay DOM as a CP-1 exception-by-contract, with all live refs and restoration data under runtime. | The direct port would otherwise require moving overlay ownership to a feature/UI module, which is a redesign. The service may manipulate only the mount elements explicitly passed by callers or the documented root fallback. |
| **Q9 Timer behavior** | Preserve legacy watchdog and remove-delay timing exactly; store timeout ids in `_KDB.runtime.loadingService.timers.watchdogsByMountKey` and `.removeDelaysByMountKey`. Boot overlay timeout (300000, `kdb-root-loading-animation-mount`) may then show the WP6 home dialog via `presentHomeChoice`; PDF `watchdogMs` 1800000 and other mountKeys stay finish-only. | Behavior stays the same while timer handles leave factory-scope state and are cleared by `finishLoading` / `destroy`. |
| **Q10 Error semantics** | Preserve no-op semantics for missing `_KDB`, missing mount target, hide-before-show and overlapping calls; add boundary `try/catch` logging per rule. | Returning `null` / `undefined` remains unchanged for normal invalid inputs; only unexpected DOM/API failures are logged at public boundaries. |
| **Q11 Bootstrap relationship** | Later registration is required in `core/services/__orchestratorServices.js` and likely consumption from `KDB.js`; do not perform it in this tranche. | Target production currently registers `tableData` only. Bootstrap/service wiring must be a later CP-2-approved tranche. |

Open CP-1 point with behavior impact:

- Legacy `startLoading` returns `{ mountKey, mountEl }`, where `mountEl` is a live DOM node. Direct-port compatibility prefers keeping this handle shape as an explicit temporary compatibility exception, while never storing the handle in `_KDB.state`. The cleaner rule-aligned option is an opaque `{ mountKey }` handle with `finishLoading({ handle })` resolving the element from `_KDB.runtime.loadingService.domRefs.mountsByMountKey[mountKey]`, but that is an observable API change.

---

## 1. Purpose

`loadingService` owns the reusable loading overlay/spinner capability used during dashboard startup and any later operation that needs to mask a mount element while work is pending. It preserves the legacy active-count and watchdog behavior while moving technical runtime resources out of factory-scope state and into `_KDB.runtime.loadingService`.

The service does not own dashboard startup sequencing, module lifecycle, table data loading or feature-specific loading decisions; callers decide when to call `startLoading` and `finishLoading`.

## 2. Ownership

- Canonical state subtree: `_KDB.state.loading`.
- Canonical writer: `loadingService`.
- Ownership-map note: approving this subtree requires an explicit `stateOwnership.md` update in an approved documentation tranche; this contract does not edit that authority file.
- Initial state shape:

```js
_KDB.state.loading = {
  "<mountKey>": {
    activeCount: 0,
    isActive: false
  }
};
```

State rules:

- `activeCount` and `isActive` are serializable confirmed state and may remain in `_KDB.state.loading`.
- DOM nodes, timer ids, original CSS position values and pending async handles do not live in `_KDB.state.loading`.
- Foreign-write paths: none. Callers request changes through the approved service surface (`_KDB.services.loading` for direct-port compatibility, or `_KDB.services.loadingService` if CP-1 chooses naming uniformity).

## 3. Runtime

- Owner namespace: `_KDB.runtime.loadingService`.
- Buckets used:

| Bucket | Shape / role |
|---|---|
| `timers.watchdogsByMountKey` | Object keyed by `mountKey`, holding watchdog timeout ids created by `startLoading`. |
| `timers.removeDelaysByMountKey` | Object keyed by `mountKey`, holding remove-delay timeout ids created by `finishLoading`. |
| `domRefs.mountsByMountKey` | Object keyed by `mountKey`, holding live mount elements currently controlled by the service. |
| `domRefs.spinnersByMountKey` | Object keyed by `mountKey`, holding the inserted spinner element when present. |
| `domRefs.positionOverridesByMountKey` | Object keyed by `mountKey`, holding the original inline `position` string for mount elements whose position was overridden. |

Cleanup trigger:

- `finishLoading(...)` clears the mount's watchdog timer when `activeCount` reaches zero, then schedules spinner removal and position restoration.
- `destroy()` is idempotent: set `_isDisposed = true`, clear all watchdog and remove-delay timers, remove all owned spinner elements, remove `KDB_loading`, restore overridden positions, reset runtime buckets, and leave `_KDB.state.loading` entries inactive.

Notes:

- Legacy factory-scope `Map` objects are not allowed in the direct port because they survive service instances and bypass `_KDB.runtime.<owner>`.
- No listeners, subscriptions, observers, AbortControllers or pending Promises are present in the legacy service.

## 4. Public API

### Shared service

- Surface: CP-1 choice:
  - **A** `_KDB.services.loading` — recommended for direct-port legacy compatibility.
  - **B** `_KDB.services.loadingService` — naming-uniform, but requires later caller migration.
- Style: named methods.
- Methods:

```js
_KDB.services.loading = {
  startLoading: startLoading,
  finishLoading: finishLoading,
  updateLoadingMessage: updateLoadingMessage,
  destroy: destroy
};
```

Method contracts:

| Method | Signature | Returns | Post-disposal behavior |
|---|---|---|---|
| `startLoading(options)` | `({ mountEl?, mountKey?, transparent?, watchdogMs?, message?, messageKey?, sessionMessage?, sessionMessageKey? })` | loading handle or `null` | returns `null` and logs `console.warn` once. Caption: overlay-coverage delta; optional session line: `loadingService-dashboardPdf-progress-caption-sandwich-contractdelta.md`. |
| `finishLoading(options)` | `({ mountEl?, mountKey?, handle?, removeDelayMs? })` | `undefined` | no-op with `console.warn` once. |
| `updateLoadingMessage(options)` | `({ handle?, mountKey?, message?, messageKey? })` | `true` / `false` | returns `false` and logs `console.warn` once. Caption-only; see `loadingService-dashboardPdf-progress-caption-contractdelta.md`. |
| `destroy()` | `()` | `undefined` | idempotent no-op. |

Handle shape pending CP-1:

```js
// A. Recommended direct-port compatibility handle:
{ mountKey: "kdb-root-loading-animation-mount", mountEl: HTMLElement }

// B. Cleaner rule-aligned handle:
{ mountKey: "kdb-root-loading-animation-mount" }
```

The implementation must use exactly one approved handle shape. The handle must never be stored in `_KDB.state`. The implementation must not expose both `destroy()` and `dispose()`.

## 5. Readers / Writers

**For shared services:**

- Deliberate read methods: none in this direct-port tranche because legacy exposes no read method and no current caller needs one.

**Internal writer helpers:**

- `ensureLoadingEntry(_KDB, mountKey)` — creates the per-mount serializable state entry.
- `markLoadingStarted(_KDB, mountKey)` — increments `activeCount` and sets `isActive: true`.
- `markLoadingFinished(_KDB, mountKey)` — decrements `activeCount` with a zero clamp; sets `isActive: false` when count reaches zero.
- `markAllLoadingDisposed(_KDB)` — sets every known entry to `{ activeCount: 0, isActive: false }` during destroy.

Internal writers are not exposed across module boundaries.

## 6. Events

- **Emitted facts:** none.
- **Subscribed events:** none.
- **Request-events:** none.

Reason: legacy has no loading events, no event subscribers and no known independent consumer. Adding `loading:started` / `loading:finished` would be new behavior and would require explicit user approval plus `eventSubscribe.md` catalog entries. No `events/eventNames.js` is created in this tranche.

## 7. Dependencies

- `_KDB` (always).
- `window.getComputedStyle`, `setTimeout`, `clearTimeout` through the browser runtime; no Cognos host wrappers.
- Default mount fallback: preserve the legacy fallback to `_KDB.elements.kdbWidget` unless CP-1 explicitly approves a rule-forced replacement.

No services, adapters or event bus dependency is required for overlay start/finish. The boot watchdog **may** call `_KDB.runtime.homeDialog.presentHomeChoice` after `finishLoading` (`contracts/_archive/loadingService-watchdog-dialog-contractdelta.md`); that is not a public loading method and not a `_KDB.services.homeDialog`.

## 8. Cognos Touchpoints

None.

The service manipulates browser DOM only. It performs no `_KDB.cognosAPI.<theme>.<function>` calls and does not mirror Cognos state.

## 9. Folder Layout

Target production tree, pending CP-1:

```txt
loadingService/
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

Rationale:

- `__orchestratorLoadingService.js` is kept because the existing services tree uses orchestrators for service registration.
- `runtime/` isolates runtime bucket initialization and cleanup because legacy has timers, live DOM refs and position restoration.
- `state/` contains the canonical writer helpers for `_KDB.state.loading`.
- `effects/` contains DOM and timer side effects so the service factory remains a named-method public surface coordinator.
- No `events/` folder is created because the service emits no events.

## 10. Out Of Scope

- Bootstrap registration in `KDB.js` or `core/services/__orchestratorServices.js` — owner: later integration tranche.
- Browser harness or `TEST/` sandbox — out of scope for direct-port workflow.
- Cross-service integration tests — out of scope for this tranche.
- New loading events and `eventSubscribe.md` edits — require explicit user approval.
- Redesigning loading ownership into a feature/UI module — out of scope unless CP-1 rejects service-owned DOM responsibility.
- CSS redesign or spinner markup redesign — superseded for cover + caption by `loadingService-overlay-coverage-contractdelta.md` (`KDB_loading`, opaque inset, `KDB_loadingMessage`).
- Renaming callers from legacy `_KDB.services.loading` to `_KDB.services.loadingService` — only needed if CP-1 chooses service-key option B; later integration tranche.

## 11. Open Questions

- **Q1:** Approve target path `KDB3/js/core/services/loadingService/`?
- **Q2:** Approve `_KDB.state.loading` as the service-owned serializable state subtree?
- **Q3:** Choose public service key: **A** `_KDB.services.loading` (recommended for direct port) or **B** `_KDB.services.loadingService` (requires later caller migration). Methods stay `startLoading`, `finishLoading`, `destroy`.
- **Q4:** Approve factory file `core/services/loadingService/index.js` (`createLoadingService`)?
- **Q5:** Approve moving watchdog timers, remove-delay timers, mount refs, spinner refs and position overrides from legacy factory-scope maps into `_KDB.runtime.loadingService`?
- **Q6:** Approve no events and no `events/eventNames.js`?
- **Q7:** Approve `destroy()` as the single lifecycle teardown method, with no `dispose()` alias?
- **Q8:** Approve service-owned DOM overlay responsibility as a contract-level exception to the usual UI-feature ownership expectation?
- **Q9:** Approve preserving legacy `watchdogMs` and `removeDelayMs` timing behavior while moving timer handles into runtime?
- **Q10:** Approve preserving no-op semantics for missing mount target, hide-before-show and overlapping calls?
- **Q11:** Approve documenting later bootstrap/service registration as required but out of scope for this tranche?
- **Q12:** Choose handle shape: **A** legacy-compatible `{ mountKey, mountEl }` as an explicit temporary compatibility exception (recommended for direct port; never stored in `_KDB.state`), or **B** opaque `{ mountKey }` (cleaner rule-aligned handle, but observable API change).

---

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-16 | `Draft` created | GPT-5.5 | Direct-port CP-1 draft; Q1-Q12 awaiting user decision. |

> When implementation diverges from the contract, stop, present the deviation, update this contract, and resume per the synchronisation clause in `feature-structure.mdc`.

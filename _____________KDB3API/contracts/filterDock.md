# Module Contract: `filterDock`

> Current contract for the production `filterDock` module: dock observer, click classifier, owner router, and popup-ready handoff integrator.
> Historical Mode 2 observation-only language is superseded by the integration phase described below.

---

**Status:** `Draft` (integration phase sync, 2026-05-26)
**Owner module / service:** `filterDock`
**Type:** `dashboard filters subsystem / feature module`
**Authoring AI:** GPT-5.5, 2026-05-17
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Current Phase

Production `filterDock` is the central dock-level integration owner:

- one dock-level click listener (`interaction/dockClick.js`, `bindDockClick`);
- one long-lived dock `MutationObserver` (`dashboard/filters/filterDock/observation/dockObserver.js` (`bindDockObserver`));
- serializable observed state under `_KDB.state.filters.filterDock`;
- live DOM refs only under `_KDB.runtime.filterDock.domRefs`;
- direct owner handoff routing through public APIs for supported filter types;
- popup-ready handoff dispatch when the observer confirms popup readiness (Route B).

`filterDock` does not write sibling state, does not apply filter values, and does not call Cognos filter commit APIs. Filter value logic, Alle rights, and confirm/cancel effects remain with owner modules (`singleSelect`, `specialSingleSelect`, `sicht`, `dienststelle`). `nativeMultiSelect` is a **confirm-only** consumer: it receives `filterDockStateChanged` on native OK with `confirmedLabels` (selected option labels on the popup mount at capture). It does not apply kale values (Cognos already did) and does not opt into popup/filtersReady/header resync. See `nativeMultiSelect-history-contractdelta.md`.

Sibling modules may still contain legacy local popup logic; `filterDock` does not claim sole runtime ownership of all filter behavior until a later deduplication tranche.

## 1. Legacy Evidence

Source:

```txt
legacy-redesign2:js/dashboard/filters/filterDock/
```

Read-only evidence:

```txt
legacy-redesign2:js/dashboard/filters/singleSelect/
legacy-redesign2:js/dashboard/filters/sicht/
legacy-redesign2:js/dashboard/filters/stelleHierarchy/
```

Naming decision:

- Legacy `stelleHierarchy` / hierarchy behavior is evidence for the future production `dienststelle` module.
- Legacy cascading / upstream behavior maps to production `sicht`.
- `singleSelect` remains `singleSelect`.

| Legacy file | Evidence used |
|---|---|
| `filterDock/filterDock.js` | Existing dock click binding, `filterItemWrapper` detection, OK/Cancel detection, class tagging, route callback, idempotency guard. |
| `filterDock/buildFilterInfoObj.js` | Filter label/scope resolution, filter type/capability resolution, click target intent flags, legacy serializable interaction fields plus live DOM refs to remove from state. |
| `filterDock/getFilterConfig.js` | Lookup of filter config by scope and label. |
| `filterDock/resolveFilterCapabilities.js` | Single-select, hierarchy/dienststelle, upstream/sicht, Alle-option and condition detection. |
| `filterDock/resolveKennzahlenSource.js` | Legacy utility wrapper; production uses AMD import of `core/utils/getKennzahlenSource.js` in `getFilterConfig.js`. |
| `legacy-redesign2:js/dashboard/filters/__filtersOrchestrator.js` | Legacy startup shape only: wait for dock, attach filterDock, route to type modules. Not present in production. |
| `dashboard/filters/singleSelect/dockHandoff/popup.js` (`restorePopupSelection`) | Evidence of local popup `MutationObserver` and out-click handling that future Mode 3 may delegate/remove. |
| `sicht/restorePopupSelection.js` | REDESIGN2/legacy evidence only (not a production Sicht file). Live Sicht popup sync: `sicht/effects/syncSichtOptionAvailability.js`. Do not invent Sicht `restorePopupSelection.js`. |
| `singleSelect/__singleSelectOrchestrator.js`, `sicht/__sichtOrchestrator.js`, `stelleHierarchy/__stelleHierarchyOrchestrator.js` | Evidence for future owner reactions and direct API integration targets. |

Production evidence:

- `_____________KDB3API/KDB3/js/dashboard/filters/filterDock/` exists (Mode 2 port).
- `_____________KDB3API/contracts/filterDock.md` and `filterDock-port-execution-spec.md` govern this tranche.
- `KDB.js` registers and mounts `_KDB.api.filterDock` via `dashboard/filters/filterDock/index.js` (there is no parent filters orchestrator).

## 2. Purpose

`filterDock` owns dock-level observation, interaction classification, and owner handoff routing for Cognos filter UI: the central click listener, last-clicked filter metadata, dock/popup observation, observed child mutation summaries, the long-lived observer that converts Cognos DOM changes into serializable state, and direct public-API dispatch to known filter owners on click and popup-ready.

It does not own filter value application, Cognos filter updates, history commits, single-select logic, Sicht/cascading logic, Dienststelle/hierarchy logic, or sibling filter state. Those remain with their owner modules.

## 3. Placement And Classification

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
```

Classification: feature module / filters subsystem, published as `_KDB.api.filterDock`.

Rationale:

- The behavior is specific to the dashboard filters: Cognos filter dock DOM, `filterItemWrapper`, filter popup/options/footer observation, and routing to filter-type owners.
- Legacy evidence does not prove a reusable `core/` engine boundary.
- `_KDB.api.filterDock` keeps the public surface explicit and avoids turning `_KDB.api.filters` into a router or god object.

Bootstrap (current):

- `KDB.js` imports `dashboard/filters/filterDock/index.js` and registers `_KDB.api.filterDock` during `setupCore`.
- First `filterDock.mount()` runs in `finishDashboardInitialization` **after** `await whenUrlShareRestoreSettled` (absent / SET / recovery / failed) and **before** `presentPendingUrlShareMessage`. It does **not** run from `startModules` / `mountFeatureModules`. Cognos does not create `#filterDockContainer` while the boot spinner is mounted; inbound canvas+select can occupy the post-lift window, so a 30s wait started in `startModules` expires before host dock chrome exists (PO Cognos 2026-08-29).
- Cognos dock selector keys live in `core/cognosHost/config/filterDockChromeSelectors.js` and are copied into `_KDB.elements.selectors.filterDock` at register time.

Future bootstrap recommendation:

- When `singleSelect`, `sicht`, and `dienststelle` exist, a shared parent filters orchestrator (not built) could replace direct `KDB.js` imports of each filter submodule.

## 4. Ownership

- Canonical state subtree: `_KDB.state.filters.filterDock`.
- Canonical writer: `filterDock` only, through internal reducer/dispatch.
- Foreign-write paths: none.
- Foreign reads: future consumers read through `filterDock` selectors or react through owner API payloads; they do not read `_KDB.runtime.filterDock`.

Initial state shape:

```js
_KDB.state.filters.filterDock = {
  lifecycle: "idle",
  lastClickedFilter: null,
  popup: {
    isVisible: false,
    activeFilterId: null,
    activeFilterType: null,
    hasOptions: false,
    optionCount: 0,
    hasOkButton: false,
    hasCancelButton: false,
    observedAt: 0
  },
  observedChildren: {
    addedCount: 0,
    removedCount: 0,
    lastAddedSignature: null,
    lastRemovedSignature: null,
    observedAt: 0
  },
  pendingSignals: {
    mutationCount: 0,
    clickCount: 0,
    scheduledAt: 0
  },
  lastInteraction: null,
  mountedAt: 0,
  updatedAt: 0,
  errorCode: null,
  errorMessage: null
};
```

Lifecycle subset: `idle`, `ready`, `error`, `disposed`.

Lifecycle vocabulary guard:

- Implementation must verify `idle`, `ready`, `error`, and `disposed` against `_____________KDB3API/.cursor/lifecycleVocabulary.md`.
- If any term is not approved, stop before implementation and request a contract delta.
- Do not introduce local lifecycle terms.

Parallel state-slice rule:

- `lifecycle` is module lifecycle only.
- Observed UI facts are parallel slices and are not a single status machine.
- `lastClickedFilter`, `popup`, `observedChildren`, `pendingSignals`, and `lastInteraction` can coexist and must not overwrite each other as mutually exclusive states.
- Reducer actions update only the relevant slice plus `updatedAt` unless the contract explicitly says otherwise.

`lastClickedFilter` shape:

```js
{
  filterId: string,
  filterLabel: string,
  filterType: "singleSelect" | "specialSingleSelect" | "sicht" | "dienststelle" | "unknown",
  scopeType: "global" | "pageContext",
  scope: string,
  sourceElementSignature: string,
  clickedAt: number
}
```

`lastInteraction` shape generated after every click:

```js
{
  filterId: string,
  filterLabel: string,
  filterType: "singleSelect" | "specialSingleSelect" | "sicht" | "dienststelle" | "unknown",
  scopeType: "global" | "pageContext",
  scope: string,
  interactionType: "open" | "option" | "confirm" | "cancel" | "clear" | "close" | "unknown",
  sourceElementSignature: string,
  popup: {
    isVisible: boolean,
    hasOptions: boolean,
    optionCount: number,
    hasOkButton: boolean,
    hasCancelButton: boolean
  },
  observedAt: number
}
```

### Scope fields

- `scopeType`: DOM bucket — `"global"` when the clicked `.filterItemWrapper` is under the global dock subtree, otherwise `"pageContext"`.
- `scope`: runtime scope key — `"global"` when `scopeType === "global"`; otherwise the active tab id from `_KDB.state.tabs.currentTabId`, then fallback `_KDB.utils.readCurrentTab().id`, else `"unknown"`.
- `getFilterConfig` lookup still uses `scopeType` to choose `globalFilters` vs `pageContextFilters` inside `filterPropObj`.

### Filter ID and filter key

Contract sync (describes implemented behavior, not a behavior change):

- `filterKey = filterScope + "__" + filterLabel` — legacy `singleSelect` scope keying (examples: `global__Geschlecht`, `pageContext__Personengruppe` when scope bucket is pageContext).
- `filterId = scope + "__" + filterLabel` — runtime identity using tab id or `"global"` (examples: `global__Personengruppe`, `<tabId>__Dienststelle_BW`).
- On `pageContext`, `filterKey` and `filterId` may differ because `filterScope` is the DOM bucket (`pageContext`) while `scope` is the concrete tab id.

### Filter type resolution

Resolved in `identity.js` (`resolveFilterType`) from capabilities (`readFilterCapabilities` in `identity.js`) and config `condition` (special keys compared case-insensitively). `isUpstream` / `isDownstream` derive from `filterPropObj.cascade` (`upstream` / `downstream`).

| Order | Rule | `filterType` |
|---|---|---|
| 1 | `isUpstream && isSingleSelect` | `sicht` |
| 2 | `isSingleSelect` and lowercase `condition` is `personengruppe` or `dienststellenleitung` | `specialSingleSelect` |
| 3 | `isSingleSelect` | `singleSelect` |
| 4 | `isHierarchy && isDownstream` | `dienststelle` |
| 5 | otherwise | `unknown` |

`popup.activeFilterType` is set from `lastClickedFilter.filterType` when a click is observed.

### Legacy naming (port mapping)

- Legacy `dstleitung` is not used in the new project. Use `condition: "Dienststellenleitung"` in `filterPropObj` filter entries.
- `identity.js` (`readFilterCapabilities`) exposes config-only `hasAlleOption` (`isTrueish(filterConfig.hasAlleOption)`); it does not read `_KDB.state.filters.specialRights`. Runtime Alle/right semantics stay with `specialSingleSelect`.
- `specialSingleSelect` detection uses lowercase `personengruppe` and `dienststellenleitung` against `capabilities.condition`.

Every click handled by `filterDock` must generate the serializable `lastInteraction` object and dispatch `filterDock/clickObserved`.

### Classification vs downstream dispatch proof

- `_KDB.api.filterDock.getState().lastInteraction` (or selector `readLastInteraction(_KDB)`) proves **filterDock classification only** — filter label, scope, `filterType`, `interactionType`, and observed popup snapshot at click time.
- It does **not** prove that a downstream owner received or processed a handoff.
- Downstream dispatch proof requires monkey-patching the target owner API (see §9.1).

Production code does not require unconditional `console.log` for click discovery. Optional gated dev/discovery logging may be added in a later runtime tranche; it is not mandatory in this contract.

Live DOM references for clicked elements and popup nodes belong only under `_KDB.runtime.filterDock.domRefs`.

## 5. Runtime

- Owner namespace: `_KDB.runtime.filterDock`.
- Cleanup trigger: `destroy()`.

Runtime shape:

```js
_KDB.runtime.filterDock = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {}
};
```

Runtime buckets:

| Bucket | Role |
|---|---|
| `domRefs` | Dock root, last clicked element, active filter element, active popup root, OK/Cancel nodes when needed for the current evaluation only. |
| `listeners` | Click listener cleanup record if AbortController is unavailable. |
| `subscriptions` | Empty in this tranche; future direct-API consumption does not require event subscriptions. |
| `abortControllers` | Click listener controller and any observer/evaluation cancellation scope that can use AbortController. |
| `observers` | Long-lived dock `MutationObserver`, plus approved `popupDisplayResync` observers whose lifecycle belongs to `filterDock` and whose business logic belongs to the target owner. |
| `timers` | Scheduled/coalesced observed-state evaluation handles, including requestAnimationFrame / timeout handles for `popupDisplayResync` re-dispatch. |
| `pendingPromises` | `pendingPromises.mount` is the in-flight `waitForFilterDockReady` promise. Coalesce: a second `mount()` while pending returns `true` and does not restart the wait. |

Idempotency:

- `mount()` must not duplicate click listeners, observers, scheduled evaluation handles, subscriptions, timers, or runtime DOM refs.
- Repeated `mount()` returns successfully or refreshes cleanly without duplicate resources.
- `popupDisplayResync` observers must be detached when their popup closes or active filter changes; they must not wait for module destroy if their popup is no longer active.
- `destroy()` is idempotent and cleans observer, click listener, scheduled evaluation, timers, `popupDisplayResync` observers, and live DOM refs before clearing runtime buckets.

## 6. Public API

Surface:

```js
_KDB.api.filterDock = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Style: dispatch + reducer, per feature-module default.

Method contracts:

| Method | Contract |
|---|---|
| `mount(options)` | Async: waits for dock root + global + pageContext selectors (`chromeWait.js`, `waitForDockChrome`, 30s), then initializes state/runtime, click listener, and long-lived MutationObserver. Returns `true` when mount is started or already pending; `finishMount` returns `false` if bind fails. First production call is after `whenUrl` settlement (see Bootstrap); do not arm this wait under the boot spinner. |
| `destroy()` | Idempotent teardown. Sets `_isDisposed = true` first, disconnects observer, aborts/removes listeners, cancels scheduled evaluation, clears runtime refs, dispatches disposed state. |
| `dispatch(action)` | Public owner action entry point for future owner-approved commands; current tranche mainly uses internal dispatch from controller/effects. |
| `getState()` | Returns full `_KDB.state.filters.filterDock` snapshot; after disposal returns `undefined`. |

Disposed-state discipline follows `module-public-api.mdc`: every public method checks `_isDisposed`. Reads return `undefined`; `dispatch`, `mount`, and `destroy` no-op with `console.warn` where appropriate and never throw from the guard.

DOM readiness boundary:

- `filterDock.mount()` owns bounded wait-for-dock readiness via `_KDB.utils.waitForElObserver` on root, global, and pageContext selectors (registered from `core/cognosHost/config/filterDockChromeSelectors.js`).
- `filterDock` also owns a generic batch-level `filtersReady` observation: after at least one `.filterItemWrapper` exists inside the filterDock root, the wrapper count must not increase for `500` ms (`FILTERS_READY_STABILITY_MS`); if the count keeps growing, dispatch is capped at `30000` ms (`FILTERS_READY_MAX_WAIT_MS`) with payload source `filterDockFiltersReadyTimeout`.
- `filtersReady` is not per filter id and not per scope. It does not prove that every Cognos filter exists; it only proves that the initial filter wrapper batch has stabilized enough for owner modules to run their own scoped/idempotent DOM sync.
- `filterDock` may detect `filtersReady` by an immediate dock-root query after mount and by the existing long-lived dock observer's coalesced evaluation. No extra owner-specific observer is approved for this condition.
- On the first transition to `filtersReady`, `filterDock` may re-dispatch an owner-neutral filters-ready notification to route-map owners that explicitly opt in.
- If selectors never appear within the timeout, mount resolves to `false`, logs a boundary error, creates no listener or observer, and does not set lifecycle `error`.
- If the dock root is missing after the wait, `finishMount` returns `false`, logs a boundary warning, and does not set lifecycle `error`.
- No permanent observer on `document.body` and no unbounded retry loop outside the shared wait helper.

## 7. Readers / Writers

Published selectors from `dashboard/filters/filterDock/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readFilterDockState(_KDB)` | `_KDB.state.filters.filterDock` | Full snapshot or `undefined`. |
| `readLastClickedFilter(_KDB)` | `lastClickedFilter` | Last clicked filter metadata or `null`. |
| `readPopupState(_KDB)` | `popup` | Popup observation snapshot. |
| `readObservedChildren(_KDB)` | `observedChildren` | Child mutation summary. |
| `readLastInteraction(_KDB)` | `lastInteraction` | Last generated click interaction object or `null`. |

Internal action names:

| Action type | Purpose |
|---|---|
| `filterDock/mountSucceeded` | Transition to `ready`, set `mountedAt`, clear errors. |
| `filterDock/clickObserved` | Store `lastClickedFilter`, `lastInteraction`, increment click signal, update popup slice when included. |
| `filterDock/mutationsObserved` | Store observed child mutation summary and pending signal metadata. |
| `filterDock/filtersReadyObserved` | Store first batch-level filter readiness after wrapper-count stability (500 ms no growth) or max-wait timeout. |
| `filterDock/filtersReadyDiagnosticObserved` | Store owner-route diagnostic `errorCode` / `errorMessage` and update `updatedAt`; do not change module `lifecycle`. |
| `filterDock/popupObserved` | Store normalized popup slice. |
| `filterDock/evaluationScheduled` | Record scheduled coalesced evaluation metadata. |
| `filterDock/evaluationFinished` | Clear/normalize pending signal metadata after a completed evaluation. |
| `filterDock/error` | Store `lifecycle: "error"`, `errorCode`, `errorMessage`. |
| `filterDock/destroy` | Transition to `disposed` and clear transient serializable observation fields as specified by reducer. |

No public writer helpers are exposed.

## 8. Click And Observation Model

Central click listener:

- Delegation root: `#filterDockContainer` by default.
- Additional **document capture** only for native kale OK/Cancel when `lastClickedFilter.filterType === "nativeMultiSelect"` and the click target is **not** inside the dock root (Cognos may portal `[data-tid="okClickable"]` outside the dock). SS Fertig stays on the dock-root listener.
- OK/Cancel use `closest` on `[data-tid="okClickable"]` / `[data-tid="cancelClickable"]` (not `target.matches`), so inner button text nodes still count.
- The listener resolves the nearest `.filterItemWrapper` (popup controls outside the wrapper use `domRefs.activeFilterEl`).
- It detects OK, Cancel, Clear, Close, option, Alle-option, and open/unknown interactions.
- It builds a serializable interaction object after every handled click.
- Native kale confirm adds `confirmedLabels` (selected option labels on the popup mount; `null` if the mount is missing).
- It dispatches `filterDock/clickObserved` and stores `lastInteraction` / `lastClickedFilter`.
- It routes supported owner handoffs through `ownerRouter.js` (`dispatchHandoffToOwner`).
- It does not write sibling state and does not call Cognos filter value APIs.

Long-lived observer:

- Mounted with `filterDock`, disconnected only on `filterDock.destroy()`.
- Stored at `_KDB.runtime.filterDock.observers.dock`.
- Observes the dock root for child list, subtree, and relevant attribute changes needed to detect popup/options/footer state.
- The `MutationObserver` callback must not perform heavy parsing or filter logic inline.
- The callback records raw mutation signals and schedules one coalesced evaluation.
- Coalesced evaluation should use `requestAnimationFrame` by default for DOM reads after Cognos rendering batches; `setTimeout(..., 0)` is acceptable only if `requestAnimationFrame` is unavailable.
- Scheduled evaluation no-ops after disposal.

Evaluation:

- Reads current dock/popup DOM.
- Normalizes serializable `popup` and `observedChildren` slices.
- Dispatches `filterDock/popupObserved` and/or `filterDock/mutationsObserved`.
- Detects the first `filtersReady` transition using batch wrapper-count stability and dispatches opt-in owner filters-ready notifications.
- When popup readiness criteria are met, dispatches popup-ready owner handoffs via `dashboard/filters/filterDock/observation/popupReadyHandoff.js` (`dispatchPopupReadyHandoff`).
- Does not mutate sibling state and does not call sibling internals directly.

Popup display resync observer delta:

- `filterDock` may attach a targeted popup `MutationObserver` for an active open popup when the owner route declares `needsPopupDisplayResync: true`.
- This observer is not a second business owner; it observes Cognos popup DOM lifecycle only.
- It must not sanitize labels, inspect owner table/default logic, or decide owner business behavior.
- Its callback must coalesce mutation bursts and re-dispatch to the target owner using the route-map popup-ready action contract.
- It should observe hierarchy/virtualized popup `childList`, `subtree`, and relevant attributes needed for Cognos recycled text nodes. `aria-label` and `title` are approved attributes when the owner uses them as display sources. `data-tid` and `class` are optional and should be included only when the implementation proves they are needed.
- KDB-owned ready/visibility classes do not need to trigger popup display resync and may be intentionally excluded to avoid observer feedback loops.
- It must disconnect on popup close, active filter change, owner change, or `filterDock.destroy()`.
- Its runtime handles live under generic keys such as `_KDB.runtime.filterDock.observers.popupDisplayResync`, `_KDB.runtime.filterDock.timers.popupDisplayResync`, and `_KDB.runtime.filterDock.popupDisplayResyncSession`.

## 9. Communication Boundary

`filterDock` routes supported handoffs through direct owner public APIs. Events remain deferred; no `eventSubscribe.md` update in this contract.

### 9.1 Current owner routing

Implemented in `ownerRouter.js` (`dispatchHandoffToOwner`) (click, popup-ready, and filters-ready paths share the same route map):

| `filterType` | Target API | Click action | Popup-ready action | Filters-ready action |
|---|---|---|---|---|
| `singleSelect` | `_KDB.api.singleSelect` | `singleSelect/filterDockStateChanged` | `singleSelect/filterDockPopupReady` | no dispatch by default |
| `specialSingleSelect` | `_KDB.api.specialSingleSelect` | `specialSingleSelect/filterDockStateChanged` | `specialSingleSelect/filterDockPopupReady` | no dispatch by default |
| `sicht` | `_KDB.api.sicht` | `sicht/filterDockStateChanged` | `sicht/filterDockPopupReady` | no dispatch by default |
| `dienststelle` | `_KDB.api.dienststelle` | `dienststelle/filterDockStateChanged` | `dienststelle/filterDockPopupReady` | `dienststelle/filterDockFiltersReady` |
| `nativeMultiSelect` | `_KDB.api.nativeMultiSelect` | `nativeMultiSelect/filterDockStateChanged` | no dispatch | no dispatch |
| `unknown` | none | no dispatch | no dispatch | no dispatch |

Route-map capability:

```js
dienststelle: {
  apiKey: "dienststelle",
  actionTypes: {
    stateChanged: "dienststelle/filterDockStateChanged",
    popupReady: "dienststelle/filterDockPopupReady",
    filtersReady: "dienststelle/filterDockFiltersReady"
  },
  needsFilterDockFiltersReady: true,
  needsPopupDisplayResync: true
}
```

`needsPopupDisplayResync` is a generic filterDock capability. Dienststelle is the first approved consumer; future filter owners may opt in by setting the same route-map flag and handling their popup-ready action idempotently.

`needsFilterDockFiltersReady` is a generic filterDock capability. It means the owner wants a one-shot notification after the first `.filterItemWrapper` exists in the dock root. It must not perform per-filter or per-scope lookup in `filterDock`; the owner remains responsible for any scoped/idempotent DOM updates it needs after notification.

`needsFilterDockCommittedDisplayResync` is a generic filterDock capability. Dienststelle and `singleSelect` may opt in and handle `*/filterDockCommittedDisplayObserved` idempotently (no filterDock per-filter lookup). `specialSingleSelect` does not opt in; Personengruppe / Dienststellenleitung chips ride `singleSelect.instancesById`.

Rules:

- Direct API is canonical because the owner is known from `lastClickedFilter.filterType`.
- `filterDock` dispatches only; it does not write sibling state subtrees.
- If the target API is missing or `dispatch` is unavailable, routing returns `false` silently (no throw).
- `_KDB.api.dienststelle` is an approved known-owner dispatch target when the Dienststelle module is registered.
- `_KDB.api.nativeMultiSelect` is an approved known-owner dispatch target for kale confirm-only (`stateChanged`; no `popupReady` / `filtersReady`). Classification: after sicht / specialSingleSelect / singleSelect / dienststelle, `!isSingleSelect && !isHierarchy` → `nativeMultiSelect`. Capabilities may include `isNative`; `resolveFilterType` maps it to `nativeMultiSelect`.
- Filters-ready notifications are owner-neutral lifecycle notifications. They must not include live DOM refs and must not encode owner-specific string rules.
- `filterDock` may proxy original popup button/close DOM actions only through its own public dispatch action path when an owner-approved narrow method exists; cross-module reads of `_KDB.runtime.filterDock.domRefs` remain forbidden.

### 9.2 Filters-ready re-dispatch

For an owner route with `needsFilterDockFiltersReady: true`, `filterDock` may re-dispatch a one-shot filters-ready notification after the dock root wrapper count has stabilized (500 ms no growth, 30 s max wait).

Boundary:

- `filterDock` owns detecting the generic DOM readiness criterion and avoiding duplicate first-ready dispatches.
- `filterDock` must not inspect owner definitions, match owner filter ids, mutate `.wa-filterDock-filterName`, or implement owner string transforms.
- The target owner owns any scoped wrapper lookup and DOM text mutation after receiving its filters-ready action.
- The payload must remain serializable and include lifecycle metadata such as `{ source: "filterDockFiltersReady", observedAt, filterWrapperCount }`.
- If later Cognos repaint can overwrite an owner DOM change after the first ready notification, the owner may still use bounded owner-local `requestAnimationFrame` deferral around its own idempotent sync; that does not require a Dienststelle-owned observer.

### 9.3 Popup display resync re-dispatch

For an owner route with `needsPopupDisplayResync: true`, `filterDock` may re-dispatch popup-ready/display-sync notifications to the target owner after observed popup mutations. This is allowed only to maintain owner-specific display sanitizing for Cognos-recycled / virtualized popup option nodes.

Boundary:

- `filterDock` owns observer attachment, detachment, coalescing, and cleanup.
- The target owner owns its display rules and DOM text mutation within the approved popup/wrapper context.
- `filterDock` must not implement owner-specific string transforms such as Dienststelle's `#` / `|` / `" - "` rule.
- `filterDock` must not read or write sibling owner state such as `_KDB.state.filters.dienststelle`.
- The re-dispatch payload must remain a handoff-style command with serializable metadata where possible; live DOM refs may remain only in `_KDB.runtime.filterDock` during the active popup lifecycle.
- `resyncSource: "popupMutation"` is the approved metadata value for popup mutation re-dispatches.

Dispatch visibility (manual verification):

```js
(() => {
  const k = getKDB();
  const old = k.api?.specialSingleSelect?.dispatch;
  if (old && !old.__patched) {
    k.api.specialSingleSelect.dispatch = function(action) {
      console.log("[TRACE specialSingleSelect.dispatch]", action);
      return old.apply(this, arguments);
    };
    k.api.specialSingleSelect.dispatch.__patched = true;
  }
  return "specialSingleSelect dispatch trace installed";
})();
```

Equivalent patches apply for `_KDB.api.singleSelect.dispatch` and `_KDB.api.sicht.dispatch`. Classification alone is visible via `_KDB.api.filterDock.getState().lastInteraction`.

## 10. Dependencies

- `_KDB` (always).
- DOM selectors from `_KDB.elements.selectors.filterDock`.
- `_KDB.properties.filterPropObj` for filter config lookup (flat paths such as `filterPropObj.Personal_KDB.globalFilters.<label>`).
- `condition` values use production naming (`Dienststellenleitung`, not legacy `dstleitung`).
- `identity.js` (`readFilterConfig`) resolves kennzahlen source via explicit AMD import of `core/utils/getKennzahlenSource.js` (optional explicit `_kennzahlenSource` argument overrides).
- No runtime `_KDB.utils.getKennzahlenSource` service-locator lookup under `filterDock/compat`.
- Owner public APIs: `_KDB.api.singleSelect`, `_KDB.api.specialSingleSelect`, `_KDB.api.sicht` (read-only dispatch calls from `filterDock`; no foreign state writes).
- `_KDB.api.dienststelle` is deferred until the owner module exists and is approved.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, or legacy global names.

## 11. DOM Discipline

Selector config belongs under `_KDB.elements.selectors.filterDock`, populated at register time from `core/cognosHost/config/filterDockChromeSelectors.js` keys `filterDock`, `filterDockGlobal`, `filterDockPageContext`.

Default selectors:

```js
_KDB.elements.selectors.filterDock = {
  rootSelector: "#filterDockContainer",
  globalDockSelector: "#filterDock__global",
  pageContextDockSelector: "#filterDock__other",
  filterItemSelector: ".filterItemWrapper",
  popupMountSelector: ".wa-filterDock-filterItemMount",
  optionSelector: ".ba-common-listItem-wrapper",
  filterLabelSelector: "[data-id]",
  optionLabelSelector: ".ba-common-truncatedText__text",
  alleOptionSelector: '[data-tid="KDB_singleSelect_AlleOption"]',
  nativeFooterSelector: '[data-tid="ba-common-dialog__footer"]:not(.KDB_singleSelectFooter)',
  outClickCatcherSelector: "#filterOutClickCatcher",
  okButtonSelector: '[data-tid="okClickable"]',
  cancelButtonSelector: '[data-tid="cancelClickable"]',
  clearButtonSelector: '[data-tid="clearAllClickable"]',
  closeButtonSelector: '[data-tid="mui-filterHeader-closeClickable"]',
  roleOptionSelector: '[role="option"]',
  checkboxSelector: "input.bx--checkbox",
  selectedOptionClass: "is-selected",
  kdbSelectedOptionClass: "KDB_selectedOption"
};
```

Document-level portal exception: `outClickCatcherSelector` (`#filterOutClickCatcher`) may render outside `#filterDockContainer`. `dashboard/filters/filterDock/interaction/popupCommands.js` (`closeActivePopup`) queries scoped to the dock root first, then falls back to `document.querySelector(outClickCatcherSelector)` when the catcher is not under the dock root.

Live refs belong under `_KDB.runtime.filterDock.domRefs` and must be cleared on destroy. `_KDB.state.filters.filterDock` stores only signatures, ids, labels, booleans, counts, timestamps, and other serializable values.

## 12. Folder Layout

Production target after CP-1 and execution-spec approval:

As built (flat entry files plus `interaction/` and `observation/`; exports per file). `index.js` is the registrar.

```txt
dashboard/filters/filterDock/
  chromeWait.js                                       waitForDockChrome
  config.js                                           CHROME, DOCK_SELECTOR_DEFAULTS, FILTERS_READY_STABILITY_MS, FILTERS_READY_MAX_WAIT_MS, POPUP_DISPLAY_RESYNC_CONFIRM_DELAYS_MS, CHROME_WAIT_TIMEOUT_MS, ERROR_CHROME_WAIT_TIMEOUT, ...
  identity.js                                         readFilterLabel, readScopeContext, readRuntimeScope, readFilterConfig, readFilterCapabilities, toHandoffCapabilities, resolveFilterType, ...
  index.js                                            registerFilterDock
  ownerRouter.js                                      buildOwnerPayload, dispatchHandoffToOwner, dispatchFiltersReadyToOwners, dispatchHeaderObservedToOwners, dispatchCommittedDisplayObservedToOwners
  ownerRoutes.js                                      OWNER_ROUTE_MAP, readOwnerRoute, ownerNeedsPopupDisplayResync, isSingleSelectFamily, receivesOutsideDockClicks, isKdbOwnedClassName, skipsPopupDisplayResync, ...
  selectors.js                                        readFilterDockState, readLastClickedFilter, readLastInteraction, readPopupState, readFiltersReadyFlag, readDockSelectors, readDockRuntime
  state.js                                            ACTIONS, createInitialFilterDockState, reduceFilterDockState
  interaction/
    clickInteraction.js                               resolveClickInteraction, buildHandoff, buildClickResolution
    dockClick.js                                      bindDockClick, unbindDockClick, onDockClick
    dockDom.js                                        readDockRoot, resolvePopupMount, resolveScopedPopupMount, buildScopeContext, resolveHostDataId, readPopupSnapshot, isNativeSelected, ...
    popupCommands.js                                  runPopupCommand
  observation/
    dockObserver.js                                   bindDockObserver, unbindDockObserver, scheduleDockEvaluation, runDockEvaluation
    evaluateDock.js                                   evaluateDockState
    filtersReady.js                                   detectFiltersReady, clearFiltersReadyWatch
    mutationSummary.js                                buildElementSignature, isKdbOwnedMutationTarget, summarizeMutations, createPendingSummary, mergePendingSummary
    ownerResync.js                                    readFilterWrapperCount, dockHasCommittedDisplay, evaluateHeaderResync, evaluateCommittedDisplayResync
    popupDisplayResync.js                             attachPopupDisplayResyncOnOpen, attachPopupDisplayResync, detachPopupDisplayResync, onPopupDisplayMutations, shouldSelfDetach, isRelevantMutation, hasRelevantCharacterDataMutation
    popupDisplayResyncDispatch.js                     schedulePopupDisplayResync, clearPopupDisplayResyncTimers, dispatchPopupDisplayResync
    popupReadyHandoff.js                              buildPopupReadyHandoff, dispatchPopupReadyHandoff
    popupReadySession.js                              ensurePopupReadyState, clearReadySession, resetPopupReadyState, resetSessionOnSingleSelectClick, isPopupReady, readActiveFilterKey, popupMatchesActiveFilter, ...
```

`observation/` is the canonical folder name; do not create an `observers/` folder. Filter config and capability lookup (`readFilterConfig`, `readFilterCapabilities`) live in `identity.js`; kennzahlen source resolution uses `core/utils/getKennzahlenSource.js` directly. No `events.js` exists in this module.

## 13. Bootstrap Registration

Implemented:

- `KDB.js` imports `dashboard/filters/filterDock/index.js`, calls it during init, exposes `_KDB.api.filterDock`, invokes `destroy()` with other dashboard features, and invokes first `mount()` after overlay lift + `whenUrl` settlement (not from `mountFeatureModules`).

Future integration target:

- Optional parent filters orchestrator (not built) when `singleSelect`, `sicht`, and `dienststelle` are ported; that orchestrator would register/mount all filter submodules and `KDB.js` would import only the filters orchestrator.

## 14. Out Of Scope

- Modifying owner modules (`singleSelect`, `specialSingleSelect`, `sicht`, `dienststelle`) in a contract-sync tranche.
- Removing duplicate sibling observers/listeners (later deduplication tranche).
- Applying filter values from `filterDock`.
- Calling Cognos filter APIs for value changes from `filterDock`.
- Implementing owner-specific text sanitizing rules inside `filterDock`.
- Writing history from `filterDock`.
- Emitting new events or editing `eventSubscribe.md`.
- Unconditional production `console.log` for click/dispatch discovery.
- Browser harness, TEST sandbox, cross-feature integration tests.
- Editing legacy files or architecture rules/templates.

## 15. CP-1 Decision Summary

| Question | Decision captured in this contract |
|---|---|
| Q0 mode | Observer + router + popup-ready integration (current production phase). |
| Q1 placement | `KDB3/js/dashboard/filters/filterDock/`; no `core/` placement. |
| Q2 classification/API | Filters subsystem / feature module; `_KDB.api.filterDock` dispatch surface. |
| Q3 state | `_KDB.state.filters.filterDock`; not `_KDB.state.filterDock`; do not create both. |
| Q4 click listener | `filterDock` owns dock-level click listener and routes supported owner handoffs. |
| Q5 observer | Long-lived dock observer under `_KDB.runtime.filterDock.observers`; coalesced evaluation via scheduled DOM read; popup-ready Route B dispatch; batch-level filters-ready detection when at least one `.filterItemWrapper` exists. |
| Q6 communication | Direct API to `_KDB.api.singleSelect`, `_KDB.api.specialSingleSelect`, `_KDB.api.sicht`, and `_KDB.api.dienststelle` when registered; `popupDisplayResync` and `filtersReady` re-dispatches are lifecycle-only and capability-driven. |
| Q7 observed UI | Parallel observed state slices, not one observer lifecycle state machine. |
| Q8 runtime | Runtime buckets under `_KDB.runtime.filterDock`; cleanup on destroy. |
| Q9 events | Deferred; no `eventSubscribe.md` update in this contract. |
| Q10 ownership | No foreign `_KDB.state` writes. |
| Q11 disposed state | Public methods and scheduled callbacks no-op after destroy. |
| Q12 error handling | Boundary logs, owned error state, no throws from disposal guards. |
| Q13 visibility | Classification via `getState().lastInteraction`; dispatch proof via owner API monkey-patch; no mandatory production click log. |

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-21 | `Draft` (scope/filterType delta) | — | `scopeType`/`scope`, `specialSingleSelect`, `resolveFilterType`, `Dienststellenleitung` mapping, bootstrap in `KDB.js`. |
| 2026-05-22 | `Draft` (contract sync) | — | `filterKey` vs `filterId`, `resolveFilterType` table matches `identity.js`; popup-ready dedupe requires non-empty `filterKey`. |
| 2026-05-26 | `Draft` (integration phase sync) | — | Promoted to observer + router + popup-ready phase; direct API routing documented; `specialSingleSelect` → `_KDB.api.specialSingleSelect`; removed mandatory `[filterDock.click]` log; deferred `dispatchSingleSelectHandoff` rename. |
| 2026-05-26 | `Draft` (handoff dispatcher rename) | — | Renamed the single-select handoff dispatcher to a generic filter handoff dispatcher (historical file names; now `ownerRouter.js`, `dispatchHandoffToOwner`); behavior unchanged. |
| 2026-05-30 | `Draft` (Dienststelle popup observer delta) | user | Approved filterDock-owned Dienststelle popup observer/re-dispatch lifecycle for Cognos hierarchy display sanitizing; transform remains Dienststelle-owned. |
| 2026-05-30 | `Draft` (`popupDisplayResync` generalization) | user | Generalized the Dienststelle-specific observer concept into route-map capability `needsPopupDisplayResync`; runtime keys and helper naming should use `popupDisplayResync`. |
| 2026-06-03 | `Draft` (`filtersReady` readiness delta) | user | Approved generic batch-level filterDock readiness once at least one `.filterItemWrapper` exists; Dienststelle may opt in through `needsFilterDockFiltersReady`. |
| 2026-08-29 | `Draft` (chrome-wait clock B) | captain after Cognos FilterDock 30s miss despite overlay C | First `mount()` after `await whenUrl`, before `presentPending`. Do not start the 30s wait in `startModules`. |
| 2026-09-09 | `needsFilterDockCommittedDisplayResync` — singleSelect opt-in | PO vastenburg (GO) | Generic capability; SSS does not opt in. Law: `singleSelect-closed-dock-chip-overlay-contractdelta.md`. |
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |

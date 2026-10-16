# Module Contract: `sicht`

> CP-1 draft for a DIRECT PORT baseline plus approved behavior redesign for the Sicht / cascading upstream filter.
> No production code may be generated until this contract is approved.

---

**Status:** `Approved`
**Owner module / service:** `sicht`
**Type:** `dashboard/filters feature module`
**Authoring AI:** GPT-5.5, 2026-05-25
**Reviewed by:** `user CP-1 approval, 2026-05-25`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Target after CP-1 and execution-spec approval:

```txt
KDB3/js/dashboard/filters/sicht/
KDB3/css/filters/filters.css
```

This tranche is a narrow direct-port baseline plus user-approved behavior redesign:

- create the `sicht` owner module;
- route `filterDock` handoffs with `filterType: "sicht"` to `_KDB.api.sicht`;
- delegate generic single-select popup / selection behavior to `_KDB.api.singleSelect`;
- own the confirmed active Sicht value under `_KDB.state.filters.sicht`;
- after confirmed Sicht commit, notify `_KDB.api.specialSingleSelect` via direct dispatch;
- create a `filter_sicht` history step with prepared dependent snapshots;
- register bootstrap and CSS in this tranche.

The tranche does not port Dienststelle / hierarchy behavior. Dienststelle hooks are documented as deferred.

`sicht` is not a shared service and must not land under `core/services/`.

## 1. Evidence And Investigation Reports

Primary semantic sources:

1. User-supplied communique from `specialSingleSelect`: `sicht` must be a standalone dashboard/filters feature module; `filterDock` calls `sicht`; `sicht` delegates generic selection to `singleSelect`; confirmed Sicht changes notify `specialSingleSelect`.
2. User-supplied legacy KDB2 cascading investigation report: explains the full legacy upstream/downstream cascade, including why complete Dienststelle behavior is a later coupled tranche.
3. User-supplied REDESIGN2 Sicht investigation report: explains the REDESIGN2 `sicht` files, state, popup availability, startup, commit, history, and downstream coupling.

Legacy source paths used for file inventory and mapping only:

```txt
legacy-redesign2:js/dashboard/filters/sicht/
laatsteOriginal/KDB2/js/filters/cascading/
```

Related evidence for boundaries only:

```txt
legacy-redesign2:js/dashboard/filters/stelleHierarchy/
legacy-redesign2:js/dashboard/filters/singleSelect/
legacy-redesign2:js/dashboard/filters/filterDock/
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/
_____________KDB3API/KDB3/js/dashboard/filters/specialSingleSelect/
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
_____________KDB3API/contracts/singleSelect.md
_____________KDB3API/contracts/specialSingleSelect.md
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/KDB3/js/core/config/tables.js
```

Legacy files mapped for this tranche:

| Legacy file | Evidence used |
|---|---|
| `sicht/__sichtOrchestrator.js` | Owner loop, popup/intent handling, relevance application, confirm/cancel/close branches. |
| `sicht/ensureSichtState.js` | State root and per-filter selection shape; redesigned into reducer-owned state. |
| `sicht/selectionState.js` | Selection normalization and display/use value helpers. |
| `dashboard/filters/singleSelect/dockHandoff/interaction.js` (`applyPendingSelection`) | Option click to pending selection; redesigned to avoid toggle-off / Alle. |
| `sicht/restorePopupSelection.js` | Legacy REDESIGN2 popup sync / duplicate hide. Production successors: `effects/syncSichtOptionAvailability.js` and `effects/hideDuplicateSichtOptions.js`. Generic restore remains singleSelect `restorePopupSelection.js`. Do not add a Sicht `restorePopupSelection.js`. |
| `sicht/hideDuplicateOptions.js` | Duplicate option suppression. Production successor: `dashboard/filters/sicht/view.js` (`hideDuplicateSichtOptions`). Do not delete JS hide. |
| `sicht/getSichtRelevance.js` | Rights/data/default readiness model; redesigned to use `tableDataService` and module config. |
| `sicht/applyConfirmedSichtCascade.js` | Commit, Cognos value update, history, events and downstream coupling; this tranche keeps Sicht commit and `specialSingleSelect` notification only. |
| `sicht/applyStartupSicht.js` | Startup default concept; this tranche keeps tableData-driven default readiness, without Dienststelle cascade. |
| `dashboard/filters/sicht/history.js` (`buildCommittedStep`) | History step pattern, redesigned as `filter_sicht`. |
| `sicht/__sichtHistoryAdapter.js` | Replay concept; this tranche records dependent snapshots but replays only Sicht until dependent owner APIs exist. |

## 2. Purpose

`sicht` owns the upstream Sicht filter as a dashboard/filters feature module. It decides which Sicht options are visible or disabled from tableData-driven availability, stores the confirmed active Sicht value, delegates generic popup and selection mechanics to `singleSelect`, and informs `specialSingleSelect` after a confirmed Sicht commit.

It deliberately does not own Dienststelle / hierarchy behavior. Legacy cascading downstream reconciliation is deferred to the future Dienststelle module or a parent filters integration tranche.

## 3. Placement And Classification

Target:

```txt
KDB3/js/dashboard/filters/sicht/
```

Classification: dashboard/filters feature module.

Rationale:

- Sicht behavior is dashboard filter behavior, not reusable shared infrastructure.
- The module owns feature state and a public dispatch API.
- `singleSelect` owns generic popup / option interaction; `sicht` owns Sicht semantics and confirmed active Sicht.
- `specialSingleSelect` consumes confirmed Sicht via public dispatch.

## 4. Ownership

- Canonical state subtree: `_KDB.state.filters.sicht`.
- Canonical writer: `sicht` only, through its reducer / owner writers.
- Foreign-write paths: none.
- `sicht` must not write `_KDB.state.filters.singleSelect`.
- `sicht` must not write `_KDB.state.filters.specialSingleSelect`.
- `sicht` must not write future `_KDB.state.filters.dienststelle`.
- `filterDock` must not mutate `_KDB.state.filters.sicht`; it dispatches handoff payloads to `_KDB.api.sicht`.

Initial state shape:

```js
_KDB.state.filters.sicht = {
  lifecycle: "idle",
  activeSichtValue: null,
  currentSelection: {
    displayValue: "",
    useValue: ""
  },
  backupSelection: {
    displayValue: "",
    useValue: ""
  },
  pendingSelection: {
    displayValue: ""
  },
  byOption: {
    BW: {
      displayValue: "BW",
      useValue: "",
      optionTableKey: "sicht_bw",
      defaultTableKey: "dienststelle_bw_default",
      isVisible: false,
      isDefaultReady: false,
      isEnabled: false,
      lastSyncedAt: null
    },
    DEZPV: {
      displayValue: "DEZPV",
      useValue: "",
      optionTableKey: "sicht_dezpv",
      defaultTableKey: "dienststelle_dezpv_default",
      isVisible: false,
      isDefaultReady: false,
      isEnabled: false,
      lastSyncedAt: null
    }
  },
  meta: {
    isProgrammaticClick: false,
    lastHandoffAt: null,
    lastCommittedAt: null
  },
  lastHistoryStep: null,
  errorCode: null,
  errorMessage: null
};
```

Lifecycle subset: `idle`, `ready`, `error`, `disposed`.

`activeSichtValue` is the confirmed Sicht `displayValue` (`"BW"` or `"DEZPV"`), not the Cognos `useValue`.

## 5. Runtime

- Owner namespace: `_KDB.runtime.sicht`.
- Cleanup trigger: `destroy()`.

Runtime shape:

```js
_KDB.runtime.sicht = {
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
| `domRefs` | Current Sicht wrapper / popup refs resolved during owner work; no long-lived cross-owner refs. |
| `listeners` | Owner-local cleanup records when not covered by AbortController. |
| `subscriptions` | Expected empty; direct API dispatch is the default communication route. |
| `abortControllers` | Abortable popup / tableData / commit coordination where needed. |
| `observers` | Owner-local observers only if required for Sicht popup sync. |
| `timers` | Owner-local scheduled sync handles. |
| `pendingPromises` | In-flight delegated commit / sync work; cleared or ignored on destroy. |

Idempotency:

- Repeated `mount()` / sync must not duplicate listeners, observers, subscriptions, pending promises, timers, option entries, or CSS classes.
- `destroy()` sets `_isDisposed = true` first, aborts/unsubscribes/disconnects, clears runtime, then marks lifecycle `disposed`.

## 6. Public API

Surface:

```js
_KDB.api.sicht = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

Style: dispatch + reducer, per feature-module default.

Action types:

| Action type | Source | Purpose |
|---|---|---|
| `sicht/filterDockStateChanged` | `filterDock` routing | Handle Sicht open / option / confirm / cancel / close handoff. |
| `sicht/filterDockPopupReady` | `filterDock` routing | Apply Sicht option availability and delegate generic popup sync. |
| `sicht/singleSelectCommitted` | Internal integration after delegated commit succeeds | Commit confirmed Sicht value in owner state, notify dependents, push history. |
| `sicht/tableDataChanged` | Explicit refresh / bootstrap integration | Re-evaluate option visibility and default readiness. |
| `sicht/syncRequested` | Local / integration hook | Idempotently sync option availability. |
| `sicht/error` | Internal catch boundary | Record owned error state. |
| `sicht/destroy` | `destroy()` | Mark lifecycle disposed. |

No mixed named-method surface is allowed.

## 7. Module Boundary With `singleSelect`

The approved inheritance model is delegation, not copying internal files.

Flow:

```txt
filterDock -> _KDB.api.sicht.dispatch(...) -> _KDB.api.singleSelect.dispatch(...)
```

Rules:

- `sicht` may delegate generic popup / option / confirm / cancel behavior to `_KDB.api.singleSelect.dispatch(...)`.
- `sicht` must not import `singleSelect` internal `state/`, `effects/`, `view/`, `history/`, or `runtime/` files.
- `sicht` must not mutate `_KDB.state.filters.singleSelect`.
- `sicht` remains the only owner of confirmed active Sicht value.
- `singleSelect` remains the owner of generic popup and selection mechanics.
- Delegated handoffs must include serializable owner-provided values in `filterConfig`, not cross-module `getState()` reads from `singleSelect`:
  - `filterConfig.initialSelection`: `{ displayValue, useValue }` from `_KDB.state.filters.sicht.currentSelection` when non-empty and not `"Alle"`;
  - `filterConfig.selectionValuesByDisplay`: map of pending label to `{ d, u }` built from `byOption` for commit lookup.

Confirmed-commit hook:

- This tranche may add a narrow hook to `dashboard/filters/singleSelect/commit/commitSelection.js` (`commitConfirmedSelection`).
- After `singleSelect` confirms a successful Cognos commit for a handoff with `filterType: "sicht"`, it dispatches:

```js
_KDB.api.sicht.dispatch({
  type: "sicht/singleSelectCommitted",
  payload: {
    filterId: _handoffContext.filterId,
    filterKey: _handoffContext.filterKey,
    filterLabel: _handoffContext.filterLabel,
    filterScope: _handoffContext.filterScope,
    selection: {
      displayValue: nextConfirmedSelection.displayValue,
      useValue: nextConfirmedSelection.useValue
    },
    observedAt: Date.now()
  }
});
```

- The hook is allowed because it uses `sicht`'s public API and does not write `sicht` state directly.
- The hook mirrors the existing `specialSingleSelect/userSelectionCommitted` pattern in `singleSelect`.
- The hook must run only after confirmed successful commit, not for pending selection and not after failed commit.

When a Sicht commit is confirmed, `sicht` records its own state and side effects. It does not expect `singleSelect` history alone to represent the wider Sicht meaning.

## 8. Module Boundary With `specialSingleSelect`

After successful confirmed Sicht commit, `sicht` notifies `specialSingleSelect` through direct public dispatch:

```js
_KDB.api.specialSingleSelect.dispatch({
  type: "specialSingleSelect/sichtChanged",
  payload: {
    activeSichtValue: "BW"
  }
});
```

Rules:

- Dispatch happens after confirmed commit only, not on pending popup selection.
- Payload `activeSichtValue` uses the confirmed `displayValue`.
- No event is introduced in this tranche.
- `sicht` must not write `_KDB.state.filters.specialSingleSelect`.
- `sicht` may read a `specialSingleSelect` history snapshot only through `_KDB.api.specialSingleSelect.getState()`.

## 9. Deferred Boundary With `dienststelle`

Dienststelle / hierarchy behavior is out of scope for this tranche.

Deferred integration intent:

- future `_KDB.api.dienststelle` receives confirmed Sicht changes or a parent filters orchestrator routes them;
- future Dienststelle owner manages active downstream hierarchy, defaults, widget effects, cache cleanup and replay;
- `sicht` history steps already reserve a `dependencies.dienststelle` snapshot field, filled with `null` until a public Dienststelle snapshot API exists.

No Dienststelle files are created or modified in this tranche.

## 10. TableData And Sicht Definitions

Module-local config lives in:

```txt
dashboard/filters/sicht/config.js
```

Draft shape:

```js
{
  BW: {
    displayValue: "BW",
    optionTableKey: "sicht_bw",
    defaultTableKey: "dienststelle_bw_default",
    cssClass: "KDB_sichtOptionBw"
  },
  DEZPV: {
    displayValue: "DEZPV",
    optionTableKey: "sicht_dezpv",
    defaultTableKey: "dienststelle_dezpv_default",
    cssClass: "KDB_sichtOptionDezpv"
  }
}
```

Table keys from `core/config/tables.js`:

| Key | Role in this module |
|---|---|
| `sicht_bw` | Determines whether the BW Sicht option is visible for the user. |
| `sicht_dezpv` | Determines whether the DEZPV Sicht option is visible for the user. |
| `dienststelle_bw_default` | Determines whether the BW Dienststelle default is already available; if not, BW remains disabled. |
| `dienststelle_dezpv_default` | Determines whether the DEZPV Dienststelle default is already available; if not, DEZPV remains disabled. |

Read discipline:

- Production code reads through `_KDB.services.tableData.readRows(...)` or another approved `tableDataService` public method.
- Direct reads from `_KDB.state.tableData` are not used outside `tableDataService`.
- The row shape expected from tableData rows is equivalent to:

```js
_KDB.state.tableData.sicht_bw.rows[0].BW_Loaded.use
```

- The implementation may iterate the first row's fields and use the first cell instead of hardcoding `BW_Loaded` / `DEZPV_Loaded`.
- Option `displayValue` comes from `config.js`; table data decides availability.

Visibility and disabled rules:

- If the Sicht option table is not loaded or its first cell does not indicate availability, the option is hidden.
- If the Sicht option is available but the matching Dienststelle default table is not ready, the option is shown disabled.
- If both the Sicht option is available and the matching default table is ready, the option is enabled.
- The currently confirmed option remains selected; if it later becomes unavailable, the module must not silently switch without an explicit commit path.

`_KDB.state.tablesLoaded` is legacy evidence only and is not reintroduced as canonical production state.

## 11. Selection And Popup Behavior

Approved rules:

- `"Alle"` is hidden by default.
- Sicht always has a normal option selected.
- Re-click on the already-selected option is ignored; no toggle-off.
- Duplicate visible option entries are prevented.
- Pending selection does not notify `specialSingleSelect`.
- Confirmed selection does notify `specialSingleSelect`.

CSS / DOM marker decision:

- Sicht wrapper uses the dual-class pattern: `KDB_singleSelectFilter` (shared generic singleSelect visual behavior) + `KDB_sichtSingleSelect` (Sicht semantic/delta marker).
- Generic checkbox/search/commit styling comes from `css/filters/filters.css` via `KDB_singleSelectFilter`.
- Sicht-specific delta styling lives in `css/filters/filters.css` under `KDB_sicht*` classes.
- `KDB_cascadingFilter` is not applied to Sicht.

## 12. History

This tranche creates an owner-specific history step for confirmed Sicht changes.

Step key:

```txt
filter_sicht
```

Committed step shape:

```js
{
  key: "filter_sicht",
  timestamp: 0,
  old: {
    displayValue: "BW",
    useValue: "...",
    activeSichtValue: "BW"
  },
  new: {
    displayValue: "DEZPV",
    useValue: "...",
    activeSichtValue: "DEZPV"
  },
  dependencies: {
    specialSingleSelect: null,
    dienststelle: null
  }
}
```

Snapshot rules:

- `dependencies.specialSingleSelect` is filled from `_KDB.api.specialSingleSelect.getState()` when that API is available.
- `dependencies.specialSingleSelect` must not be read from `_KDB.state.filters.specialSingleSelect` directly.
- `dependencies.dienststelle` is `null` in this tranche because `_KDB.api.dienststelle` does not exist yet.
- Replay in this tranche restores the Sicht owner state and confirmed commit path.
- Delegated `singleSelect` replay sync for `filterType: "sicht"` is routed through `_KDB.api.singleSelect.dispatch({ type: "singleSelect/sichtHistoryReplayCommitted", ... })`; `sicht` must not import `singleSelect` internals or write `_KDB.state.filters.singleSelect`.
- Dependent replay for `specialSingleSelect` and `dienststelle` is deferred until their owners publish explicit replay / restore APIs.

History integration:

- Use `_KDB.services.history.pushCommittedStep(step)` if available.
- Do not use legacy `_KDB.history`.
- If history service is unavailable, commit still succeeds and logs no hard failure; the missing history push is a deferred integration risk.

## 13. Events

No new events are introduced in this tranche.

Rationale:

- Known-owner communication uses direct public API dispatch.
- `specialSingleSelect` is a known owner and already defines `specialSingleSelect/sichtChanged`.
- Dienststelle is deferred.
- A future fact-event such as `sicht:changed` requires a real independent consumer and an `eventSubscribe.md` catalog entry.

Subscribed events: none.
Emitted events: none.

## 14. Dependencies

- `_KDB` (always).
- `_KDB.api.singleSelect.dispatch(...)` for generic popup / selection behavior.
- `_KDB.api.specialSingleSelect.dispatch(...)` for confirmed Sicht notifications.
- `_KDB.api.specialSingleSelect.getState()` for optional history snapshot.
- `_KDB.services.tableData` public read methods for Sicht availability and default readiness.
- `_KDB.services.history.pushCommittedStep(...)` for history, when available.
- `_KDB.cognosAPI.filters` / existing production filter API paths used by `singleSelect` delegation for generic commit behavior.
- `filterDock` handoff payloads through `_KDB.api.sicht.dispatch(...)`; no direct filterDock runtime reads.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, labels, DOM text, or legacy globals.

## 15. Cognos Touchpoints

`sicht` itself should avoid direct Cognos filter manipulation where generic single-select behavior can be delegated to `_KDB.api.singleSelect`.

Approved model:

- `filterDock` sends serializable handoff payloads to `sicht`;
- `sicht` validates Sicht-specific availability and updates its owner state;
- `sicht` delegates generic popup / selection / commit mechanics to `singleSelect`;
- after confirmed commit, `sicht` records active Sicht and notifies dependents.

If a later implementation discovers that delegated `singleSelect` cannot confirm the Sicht filter without a missing Cognos wrapper, stop and escalate before adding direct Cognos behavior to `sicht`.

## 16. DOM And CSS Discipline

CSS path:

```txt
KDB3/css/filters/filters.css
```

CSS registration:

- Add `./v1/ext/KDB3/css/filters/filters.css` to `core/css/config/cssHrefList.js` after CP-1 approval.

Owned class names:

| Class | Meaning |
|---|---|
| `KDB_singleSelectFilter` | Shared generic singleSelect visual behavior marker (set by filterDock for Sicht wrappers). |
| `KDB_sichtSingleSelect` | Sicht semantic/delta marker for the filter wrapper. |
| `KDB_sichtHideAlle` | Native Alle option row hidden for Sicht. |
| `KDB_sichtOptionDisabled` | Option is visible but disabled because its Dienststelle default is not ready. |
| `KDB_sichtOptionBw` | Per-option marker for BW; also keep-first sibling hide key in `filters/filters.css` (former `sichtSingleSelect.css` section). |
| `KDB_sichtOptionDezpv` | Per-option marker for DEZPV; also keep-first sibling hide key in `filters/filters.css` (former `sichtSingleSelect.css` section). |

CSS behavior:

- Hide `"Alle"` option by default for Sicht via `KDB_sichtHideAlle`.
- Subsequent same owned option-class rows (`.KDB_sichtOptionBw ~ .KDB_sichtOptionBw` and `.KDB_sichtOptionDezpv ~ .KDB_sichtOptionDezpv`) may be hidden in `filters/filters.css` (former `sichtSingleSelect.css` section); still scoped to `.KDB_sichtSingleSelect`.
- Sicht must always keep one normal option selected.
- Re-click on the current selected option must not toggle to an empty / Alle state.
- Do not duplicate generic singleSelect CSS into `filters/filters.css` (former `sichtSingleSelect.css` section).
- Do not apply `KDB_cascadingFilter` to Sicht.

Bounded native CSS exception:

- `filters/filters.css` (former `sichtSingleSelect.css` section) may hide Cognos duplicate marker rows via `.ba-common-listItem-wrapper:has([aria-label="duplicates"])`.
- This complements JS duplicate hiding in `dashboard/filters/sicht/view.js` (`hideDuplicateSichtOptions`); it is not replaced by JS alone.
- Scope is limited to `.KDB_sichtSingleSelect`; no additional native selectors in CSS without contract update.

Selector discipline:

- Shared popup/dock selectors (`filterItemSelector`, `popupMountSelector`, `optionSelector`, dock roots) are read from `_KDB.elements.selectors.filterDock` at runtime.
- `dashboard/filters/sicht/state/selectors.js` holds Sicht-owned `KDB_sicht*` classes, Sicht popup-read fallbacks (`filterLabelSelector`, `popupMountFallbackSelector`, `optionSelector`), and native option-read selectors used only by Sicht popup sync (`optionLabelSelector`, `roleOptionSelector`, `checkboxSelector`, `selectedOptionClass`).
- Effects must not hardcode Cognos-native selector strings; consume `filterDock` first, then `_KDB.elements.selectors.sicht` fallbacks.

No live DOM nodes are stored in `_KDB.state`. Runtime refs belong under `_KDB.runtime.sicht.domRefs` and are cleared on destroy.

## 17. Folder Layout

As built (`KDB3/js/dashboard/filters/sicht/`, 14 files):

```txt
KDB3/js/dashboard/filters/sicht/
  __orchestratorSicht.js   one-line shim over index.js (imported by KDB.js)
  index.js                 createSichtController + ROUTES table + tableData subscription; registerSicht
  config.js                Sicht action/selector/class constants (chrome selectors from _KDB.elements.selectors)
  state.js                 actions, createInitialState, createSichtReducer
  state/selectors.js       readSichtState, readActiveSichtValue, readConfirmedSichtSelection, findOptionByDisplay, findOptionByUse
  availability.js          readSichtAvailabilityFromTableData, evaluateSichtOptions, evaluateAndStoreSichtOptions
  options.js               routeSyncAction, selectStartupSichtDefault (startup default)
  view.js                  syncSichtOptionAvailability (popup option DOM sync)
  delegation.js            filterDock handoff mapping and delegation to singleSelect
  validation.js            singleSelect draft/commit payload validation (applySingleSelectDraft)
  commit.js                applySingleSelectCommit, commitConfirmedSicht, notifySpecialSingleSelect
  operations.js            delegated operation ids (register / begin commit / mark committed / abandon)
  restore.js               parameter-set clear / restore / downstream visibility
  history.js               history replay handler, dependency snapshots, committed-step builder
```

## 18. Bootstrap And Integration

This tranche includes bootstrap and CSS registration after CP-1 approval:

- `KDB.js` imports `dashboard/filters/sicht/__orchestratorSicht.js`.
- `KDB.js` registers `_KDB.api.sicht` with the other filter modules.
- `KDB.js` mounts `_KDB.api.sicht`.
- `KDB.js` destroys `_KDB.api.sicht`.
- `filterDock` routes `filterType: "sicht"` to `_KDB.api.sicht`.
- `dashboard/filters/singleSelect/commit/commitSelection.js` (`commitConfirmedSelection`) dispatches `sicht/singleSelectCommitted` to `_KDB.api.sicht` after successful `filterType: "sicht"` commits.
- `cssHrefList.js` includes `./v1/ext/KDB3/css/filters/filters.css`.

Future integration target:

- A parent filters orchestrator (not built) may later own registration / mounting of `filterDock`, `singleSelect`, `specialSingleSelect`, `sicht`, and `dienststelle`.
- That parent orchestrator is not created in this tranche unless a later CP-1 changes scope.

## 19. Performance Decision

This tranche prefers tableData/config-driven gating and idempotent sync over the legacy cascading reconcile loops.

Rationale:

- It respects the new owner boundaries: Sicht does not clear Dienststelle state, specialSingleSelect state, widget slots, or hierarchy caches.
- It avoids broad DOM polling and repeated downstream reconcile passes.
- It keeps unavailable options hidden and not-yet-ready options disabled based on tableData readiness.
- It leaves expensive downstream orchestration to the future Dienststelle owner.

Legacy full cascade behavior is not reproduced in this tranche. That is an intentional behavior redesign approved at CP-1.

## 20. Startup Default (P2)

After tableData-derived `byOption` is evaluated on mount or sync:

- Sicht may choose the first enabled normal option in deterministic order from `config.js` (`BW`, then `DEZPV`): visible, enabled, non-empty `displayValue`, non-empty `useValue`, not `"Alle"`.
- Startup default commits a real Cognos Sicht value through `_KDB.cognosAPI.filters.replaceFilterContext(...)` (narrow startup exception; normal user commits stay delegated to `singleSelect`).
- Confirmed startup updates `_KDB.state.filters.sicht` via `sicht/singleSelectCommitted` with `isStartupDefault: true`.
- Startup notifies `specialSingleSelect/sichtChanged` through the same confirmed path as manual commits.
- Startup does not run Dienststelle / hierarchy cascade.
- Startup does not push `filter_sicht` history unless explicitly approved later.
- Delegated `singleSelect` state for `filterType: "sicht"` hydrates from `_KDB.api.sicht.getState()` on first filter creation when Sicht already has a confirmed normal selection.

## 21. Out Of Scope

- Full Dienststelle / hierarchy port.
- Downstream hierarchy defaulting, cache invalidation, widget local filter cleanup, widget re-render.
- Full legacy cascading reconcile flow.
- Writing `_KDB.state.filters.singleSelect`, `_KDB.state.filters.specialSingleSelect`, or future `_KDB.state.filters.dienststelle`.
- New events or `eventSubscribe.md` updates.
- `TEST/` sandbox or browser harness.
- Editing legacy trees.
- Editing `.cursor/rules/`, authority architecture docs, litmustest reports, or contract templates.

## 22. CP-1 Acceptance Matrix

| Dimension | Draft decision / recommendation |
|---|---|
| Scope slice | Narrow tranche: `sicht` owner + `filterDock` routing + delegation to `singleSelect` + notify `specialSingleSelect` + history + bootstrap/CSS. |
| Final target path | `KDB3/js/dashboard/filters/sicht/`; CSS at `KDB3/css/filters/filters.css`. |
| Classification | Dashboard/filters feature module, not service. |
| State owner/subtree | `_KDB.state.filters.sicht`; confirmed active Sicht owned only by `sicht`. |
| Public API surface | `_KDB.api.sicht = { mount, destroy, dispatch, getState }`; dispatch-style feature module. |
| Inheritance model | `filterDock -> sicht -> singleSelect`; no copying/importing internal `singleSelect` files; no singleSelect state writes. |
| Confirmed Sicht value | `activeSichtValue` comes from confirmed `displayValue` (`"BW"` / `"DEZPV"`). |
| TableData keys | `sicht_bw`, `sicht_dezpv` determine visibility; `dienststelle_bw_default`, `dienststelle_dezpv_default` determine disabled/enabled readiness. |
| Table row shape | Iterate first row fields or read `rows[0].<DataElementName>.use`; display comes from `config.js`. |
| `tablesLoaded` | Legacy evidence only; not reintroduced. |
| Duplicate / hidden / disabled | Prevent duplicates; no-right / unavailable options hidden; right but default not ready options disabled. |
| Alle / re-click | `"Alle"` hidden; always normal option selected; re-click selected option ignored. |
| specialSingleSelect communication | Direct API dispatch `specialSingleSelect/sichtChanged` after confirmed commit only. |
| Dienststelle communication | Fully deferred; document hook only. |
| Events | None in this tranche. |
| History | Add `filter_sicht`; include `specialSingleSelect` snapshot via public API if available and `dienststelle: null` placeholder. |
| Replay | Replay Sicht owner state; delegated `singleSelect` sync via public `singleSelect/sichtHistoryReplayCommitted` dispatch only; dependent restore for `specialSingleSelect` / `dienststelle` deferred to owner APIs. |
| singleSelect hook | Add public-API hook from `singleSelect` successful commit to `_KDB.api.sicht.dispatch({ type: "sicht/singleSelectCommitted", ... })`. |
| CSS class decision | Dual class: `KDB_singleSelectFilter` + `KDB_sichtSingleSelect`; Sicht delta classes use `KDB_sicht*`; no `KDB_cascadingFilter` for Sicht. |
| Bootstrap | Include `KDB.js` import/register/mount/destroy and CSS load list. |
| Performance conclusion | Prefer tableData-driven gating and disabled rendering over legacy cascade reconcile flows. |
| Investigation reports used | User-supplied `specialSingleSelect` communique, KDB2 cascading report, REDESIGN2 Sicht report. |

## 23. Open Questions For CP-1

No known blocking questions remain.

If CP-1 approves this contract, the next phase is:

```txt
_____________KDB3API/contracts/_archive/sicht-port-execution-spec.md
```

The execution spec must include the mapping table, per-file `Rules to apply` checklist, anti-D1 / anti-D2 acceptance criteria, and the direct-port forbidden action that no behavior changes beyond this approved contract are allowed.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-25 | `Draft -> Approved` | user | CP-1 approved: narrow Sicht owner tranche with filterDock routing, singleSelect delegation, specialSingleSelect notification, history, bootstrap and CSS registration. |

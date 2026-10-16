# Module Contract: `singleSelect`

> CP-1 draft for a DIRECT PORT from legacy `singleSelect` into the production tree.
> No production code may be generated until this contract is approved.

---

**Status:** `Approved`
**Owner module / service:** `singleSelect`
**Type:** `dashboard filters feature module / filter owner module`
**Authoring AI:** GPT-5.5, 2026-05-22
**Reviewed by:** `user CP-1 approval, 2026-05-22`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Source:

```txt
legacy-redesign2:js/dashboard/filters/singleSelect/
```

Target after CP-1 and execution-spec approval:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/
```

This is a direct port: preserve legacy single-select behavior and change only what the rules force, plus the CP-1-approved alignment to the production `filterDock` downstream handoff contract.

`singleSelect` is not a shared service and must not be moved under `core/services/`.

## 1. Legacy Evidence

Primary source:

```txt
legacy-redesign2:js/dashboard/filters/singleSelect/
```

Read-only boundary evidence:

```txt
legacy-redesign2:js/dashboard/filters/__filtersOrchestrator.js
legacy-redesign2:js/dashboard/filters/filterDock/
_____________KDB3API/contracts/filterDock.md
_____________KDB3API/contracts/_archive/filterDock-downstream-handoff-contractdelta.md
```

| Legacy file | Evidence used |
|---|---|
| `__singleSelectOrchestrator.js` | Pipeline order: ensure state, restore popup, derive intent, handle confirm/cancel/close/clear/alle/option/open, guard programmatic clicks and commit-in-progress. |
| `selectionState.js` | Normalization: empty display becomes `"Alle"`; `useValue` is empty when display is `"Alle"`. |
| `dashboard/filters/singleSelect/state/instance.js` (`ensureFilterState`) | State keying under `_KDB.state.filters.singleSelect.byScope[filterScope][filterLabel]`; `filterKey` is stored on the per-filter state only as auxiliary metadata. |
| `dashboard/filters/singleSelect/dockHandoff/interaction.js` (`deriveInteractionIntent`) | Intent mapping, including the custom Alle option via `[data-tid="KDB_singleSelect_AlleOption"]`. |
| `dashboard/filters/singleSelect/dockHandoff/interaction.js` (`applyPendingSelection`) | Pending selection mutation for option, Alle and clear interactions, including toggle-to-Alle when the same option is clicked and Alle exists. |
| `dashboard/filters/singleSelect/dockHandoff/popup.js` (`restorePopupSelection`) | Popup/footer/Alle DOM sync, custom footer, one-shot DOM hydration, popup MutationObserver, out-click pending revert. |
| `dashboard/filters/singleSelect/commit/commitSelection.js` (`commitConfirmedSelection`) | Confirm flow: resolve filter API, visual `syncPopupOptionSelection`, tableData `replaceFilterContext`, strict `verifyCommitFilterValue`, apply confirmed state, owner notification, history commit, rollback on failure, close popup in finally. |
| `dashboard/filters/singleSelect/dockHandoff/interaction.js` (`revertToBackupSelection`) | Cancel/close pending reset to backup. |
| `dashboard/filters/singleSelect/history.js` (`buildCommittedStep`) | History step shape with key `filter_singleSelect`. |
| `__singleSelectHistoryAdapter.js` | Undo/redo replay behavior: apply target value through Cognos filter API and sync `singleSelect` state; registration is deferred unless CP-1 expands scope. |
| `singleSelect/specialRights/**` | Rights-driven filter removal/defaulting and writes into the same `singleSelect.byScope` tree; default deferred from this core tranche. |
| Production `filterDock` contract/delta | New central dock observation owner and downstream handoff shape; `singleSelect` must consume it through direct API, not by adding a dock listener or reading filterDock runtime. |

## 2. Purpose

`singleSelect` makes Cognos multi-select filter popups behave as single-select filters. It owns the pending/backup/current selection model per filter, custom Alle option behavior, custom OK/Cancel footer state, confirm/cancel/close semantics, Cognos value commit/rollback, and the history/event side effects of a confirmed single-select change.

In the redesigned production architecture, `filterDock` owns dock observation and click/popup readiness facts; `singleSelect` consumes those facts and owns only its own state, runtime, DOM mutations inside the active filter popup, Cognos effects, and history step creation.

## 3. Placement And Classification

Target:

```txt
KDB3/js/dashboard/filters/singleSelect/
```

Classification: dashboard filters feature module / filter owner module.

Rationale:

- The behavior is specific to Cognos dashboard filters and their popup DOM.
- The module owns feature behavior and state, not a reusable service capability.
- Legacy evidence does not prove a `core/` engine boundary.
- `filterDock` remains a sibling filters feature module and the central observation owner.

## 4. Ownership

- Canonical state subtree: `_KDB.state.filters.singleSelect`.
- Canonical writer: `singleSelect` only, through internal reducer/writers called by the controller.
- Foreign-write paths: none.
- Legacy `specialRights` writes into the same state tree in REDESIGN2, but CP-1 decides that `specialRights` / `specialSingleSelect` becomes a separate future module in this project; this core tranche does not include it.
- `filterDock` must not mutate `_KDB.state.filters.singleSelect`; it only dispatches serializable handoff payloads to `_KDB.api.singleSelect`.

Initial state shape:

```js
_KDB.state.filters.singleSelect = {
  lifecycle: "idle",
  meta: {
    isProgrammaticClick: false
  },
  byScope: {
    global: {},
    pageContext: {}
  },
  lastInteraction: null,
  lastConfirmedAt: null,
  errorCode: null,
  errorMessage: null
};
```

Per-filter state shape:

```js
_KDB.state.filters.singleSelect.byScope[filterScope][filterLabel] = {
  status: "active",
  filterKey: "global__Personengruppe",
  currentSelection: { displayValue: "Alle", useValue: "" },
  backupSelection: { displayValue: "Alle", useValue: "" },
  pendingSelection: { displayValue: "Alle" },
  isCommitInProgress: false,
  hasAlleOption: true,
  condition: null,
  wasHydratedFromDom: false,
  wasHydratedFromRights: false,
  lastInteractionTs: null,
  lastConfirmedTs: null
};
```

Lifecycle subset for the module root: `idle`, `ready`, `error`, `disposed`.

`status: "active" | "removed"` on per-filter entries is a domain status inherited from legacy/specialRights, not the module lifecycle field. This tranche must not add new domain statuses without CP-1 approval.

State keying decision for CP-1:

- Preserve legacy keying: `byScope[filterScope][filterLabel]`.
- Do not key by tab id or `scopeId` unless a later CP-1 explicitly approves that behavior change.
- `filterKey` / `filterId` remain auxiliary identifiers, defaulting to `filterScope + "__" + filterLabel`.

## 5. Runtime

- Owner namespace: `_KDB.runtime.singleSelect`.
- Cleanup trigger: `destroy()`.

Runtime shape:

```js
_KDB.runtime.singleSelect = {
  domRefs: {},
  listeners: {},
  subscriptions: {},
  abortControllers: {},
  observers: {},
  timers: {},
  pendingPromises: {},
  filtersFacet: null,
  inFlight: {}
};
```

Runtime buckets:

| Bucket | Role |
|---|---|
| `domRefs` | Active popup/filter DOM refs that `singleSelect` itself resolves during an owner action; no reads from `_KDB.runtime.filterDock.domRefs`. |
| `listeners` | Out-click/catcher listener cleanup records when not covered by AbortController. |
| `subscriptions` | Expected empty unless a later approved event route exists. Direct API dispatch from `filterDock` is the planned route. |
| `abortControllers` | Owner-scoped DOM listener and popup work cancellation scopes. |
| `observers` | Short-lived popup/options observers owned by `singleSelect`; no dock-level observer. |
| `timers` | RequestAnimationFrame or timeout handles for owner-local popup sync. |
| `pendingPromises` | In-flight commit or popup wait work that must be ignored/cleared on destroy. |
| `filtersFacet` | Injected adapter stamp from `__orchestratorSingleSelect`. Not a live host handle. |
| `inFlight` | Owner M4 registry (design doc §3.6 point 1): `{ [filterInstanceId]: { key, startedAt } }`. Set before the host-write await, cleared in `finally`. |

Rules:

- `singleSelect` must not add a dock-level click listener.
- `singleSelect` must not add a long-lived dock MutationObserver.
- `singleSelect` must not read `_KDB.runtime.filterDock.domRefs` directly.
- If a live Cognos DOM action cannot be represented by the serializable handoff, request a later narrow `filterDock` owner method instead of reading filterDock runtime.
- `mount()` and repeated handoff handling must be idempotent: no duplicate listeners, observers, timers, pending promises, or stale DOM refs.
- `destroy()` sets the disposed guard first, aborts/removes listeners and observers, clears timers/pending promises, clears DOM refs, then resets runtime buckets.

## 6. Public API

Surface:

```js
_KDB.api.singleSelect = {
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
| `mount(options)` | Idempotently initializes `_KDB.state.filters.singleSelect`, `_KDB.runtime.singleSelect`, lifecycle `ready`, and any owner-local dependencies. It does not bind dock-level listeners. |
| `destroy()` | Idempotent teardown; sets `_isDisposed = true` first, cleans runtime resources, and marks lifecycle `disposed`. |
| `dispatch(action)` | Single public command entry point. Handles filterDock handoff actions and owner-local actions. No mixed named command surface. |
| `getState()` | Returns a cloned/coarse snapshot of `_KDB.state.filters.singleSelect`; after disposal returns `undefined`. |

Restore-table-display overlay adds no new public methods. Closed-dock chip overlay (`filterDockCommittedDisplayObserved`) is dispatch-only; no new public method.

Disposed-state discipline follows `module-public-api.mdc`: `dispatch`, `mount`, and `destroy` no-op after disposal with `console.warn` where appropriate; read methods return `undefined`; async work rejects or resolves false through the public method contract and never throws from a disposal guard.

## 7. Actions And Handoff Inputs

Public action types accepted by `dispatch` in this contract:

| Action type | Source | Purpose |
|---|---|---|
| `singleSelect/filterDockStateChanged` | Future `filterDock` direct API dispatch | Handles a click-observed handoff: open, option, alle, confirm, cancel, clear, close, unknown. |
| `singleSelect/filterDockPopupReady` | Future `filterDock` direct API dispatch | Handles observer-confirmed popup readiness for option injection, hydration and UI sync. |
| `singleSelect/filterDockCommittedDisplayObserved` | `filterDock` committed-display observer | Overlay closed chip text from owner caption when `displaySource === "table"`. No public method. Not `processFilterDockHandoff`. |
| `singleSelect/sichtHistoryReplayCommitted` | `sicht` history replay (`applySichtHistoryReplay.js`) | Syncs delegated `singleSelect` state after Sicht history replay. Gated to `payload.filterType === "sicht"` and `payload.filterLabel === "Sicht"`. Updates only `_KDB.state.filters.singleSelect`; no Cognos call, no callback to `sicht`, no generic `filter_singleSelect` history push. |
| `singleSelect/error` | Internal boundary catch | Records owned error state. |
| `singleSelect/destroy` | `destroy()` | Marks lifecycle disposed and clears transient serializable state as specified by reducer. |

`sicht` history replay sync payload (public API only; no internal imports):

```js
{
  filterType: "sicht",
  filterScope: "global",
  filterLabel: "Sicht",
  selection: { displayValue: "...", useValue: "..." },
  observedAt: 0
}
```

Canonical handoff payload follows `filterDock-downstream-handoff-contractdelta.md`:

```js
{
  filterId: "global__Personengruppe",
  filterKey: "global__Personengruppe",
  filterLabel: "Personengruppe",
  filterType: "singleSelect",
  filterScope: "global",
  scopeType: "global",
  scopeId: "global",
  scope: "global",
  filterConfig: {},
  capabilities: {
    isUpstream: false,
    isDownstream: false,
    isHierarchy: false,
    isSingleSelect: true,
    hasAlleOption: true,
    condition: null
  },
  interactionType: "open",
  isAlleOption: false,
  sourceElementSignature: "",
  popup: {
    isVisible: true,
    activeFilterId: "global__Personengruppe",
    activeFilterType: "singleSelect",
    hasOptions: true,
    optionCount: 4,
    hasOkButton: true,
    hasCancelButton: true,
    observedAt: 0
  },
  observedAt: 0
}
```

Handoff rules:

- `singleSelect` treats `filterType: "singleSelect"` and `filterType: "specialSingleSelect"` as same owner family.
- Core tranche behavior is guaranteed only for normal `singleSelect` unless CP-1 includes `specialRights`.
- `interactionType: "alle"` and `isAlleOption: true` are required to preserve legacy Alle semantics without parsing signatures.
- `filterScope` drives legacy state keying.
- `scopeId` / `scope` are runtime context and do not replace `filterScope` keying in this tranche.
- For delegated owners (for example `filterType: "sicht"`), `singleSelect` must not read `_KDB.api.sicht` or other owner APIs for hydration or commit lookup. It consumes generic `filterConfig.initialSelection` for first-time per-filter state creation and `filterConfig.selectionValuesByDisplay` for owner-provided commit values before falling back to tableData lookup.

## 8. Readers / Writers

Published selectors from `singleSelect/state/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readSingleSelectState(_KDB)` | `_KDB.state.filters.singleSelect` | Full cloned snapshot or `undefined`. |
| `readSingleSelectFilterState(_KDB, filterScope, filterLabel)` | `byScope[filterScope][filterLabel]` | Cloned per-filter state or `undefined`. |
| `readCurrentSelection(_KDB, filterScope, filterLabel)` | per-filter `currentSelection` | Cloned confirmed selection or `undefined`. |
| `readPendingSelection(_KDB, filterScope, filterLabel)` | per-filter `pendingSelection` | Cloned pending selection or `undefined`. |

Internal writers / reducers:

- Initialize the owner root and per-filter state.
- Normalize `currentSelection`, `backupSelection`, and `pendingSelection`.
- Apply pending selection for option, Alle and clear intents.
- Revert pending selection to backup for cancel/close/out-click.
- Mark commit start/end and update commit UI flags in state.
- Commit confirmed selection after Cognos success.
- Roll back state after Cognos failure.
- Record owner error state.
- Mark disposed.

Internal writer helpers are not exposed across module boundaries.

## 9. Events

Default CP-1 recommendation: defer new event emission from this tranche unless the user explicitly approves an event catalog update.

Legacy emits:

```txt
filter:applied
```

Legacy payload:

```js
{
  filterKey: string,
  filterLabel: string,
  filterScope: "global" | "pageContext",
  selectionLabel: string
}
```

If CP-1 approves event scope:

- add `singleSelect/events/eventNames.js`;
- add `filter:applied` or a renamed canonical event to `architecture/eventSubscribe.md`;
- emit only after confirmed state and Cognos commit are successful.

If CP-1 does not approve event scope:

- preserve commit and history behavior only;
- document `filter:applied` as deferred integration risk.

Subscribed events: none in this tranche.

Request-events: none. `filterDock` integration uses direct API because the owner is known.

## 10. Dependencies

- `_KDB` (always).
- `filterDock` handoff payloads through `_KDB.api.singleSelect.dispatch(...)`; no direct import or runtime read from filterDock.
- `_KDB.services.cognosHost.filters` — injected by `__orchestratorSingleSelect` onto `_KDB.runtime.singleSelect.filtersFacet`. Commit, rollback, inventory, restore and replay go through the facet (`writeFilter` / `readFilterValues` / `listFilterItems`). Deep files must not look up `_KDB.services.cognosHost` or `_KDB.cognosAPI.filters`.
- `_KDB.services.history.pushCommittedStep(...)` for commit history, if history integration remains in scope.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, `window.KDB.logging`, or legacy global names.

## 11. Cognos Touchpoints

| Touchpoint | Legacy use | Production decision |
|---|---|---|
| `replaceFilterContext(filterApi, values)` | Commit, rollback, history replay | Use `_KDB.services.cognosHost.filters.writeFilter({ ref, values })`. Live handles stay inside ring 1. |
| `getFilterValues(filterApi)` | Verify / snapshot | Use `_KDB.services.cognosHost.filters.readFilterValues(ref)`. |
| `getAllGlobalFilterItems` / `getAllPageContextFilterItems` | Inventory | Use `listFilterItems({ scopeId: "global", includeValues: true })` plus `listFilterItems({ allPageContextScopes: true, includeValues: true })`. |
| Programmatic OK/Cancel click | Legacy confirms/cancels Cognos popup | Prefer future narrow `filterDock` owner method if direct DOM action cannot be represented by serializable handoff. Commit path does not click native filter options (F6 native-click removal, accepted baseline 2026-05-26). |

### Production commit baseline

Accepted commit order in `dashboard/filters/singleSelect/commit/commitSelection.js` (`commitConfirmedSelection`) (F6 native-click removal, smoke passed 2026-05-26):

1. Resolve the facet ref from the live instance record (`resolveFilterRef`).
2. If popup mount exists: `syncPopupOptionSelection` — visual `.KDB_selectedOption` class sync only.
3. `filtersFacet.writeFilter({ ref, values })` with tableData-resolved `{ d, u }` or `[]` for Alle.
4. Strict `verifyCommitFilterValue` via `readFilterValues` — commit fails and rolls back if Cognos mirror does not match pending label.
5. Apply confirmed state **by lookup** of the live instance (M4), owner notification (`sicht` / `specialSingleSelect`), generic `filter_singleSelect` history (except `filterType: "sicht"`).
6. Close popup on success only; reset commit UI and `inFlight` in `finally` on the live object.

Removed from baseline: `syncNativePopupToPending.js` (commit-only native Cognos option clicks).

Open separate CP decision: whether `verifyCommitFilterValue` should later become warn-only or Alle-only. Current production remains strict.

Open CP-1 decision: if `waitForFilterApi` / `findExistingFilterAPI` are not available in production, either include thin Cognos wrapper work in this tranche or explicitly defer full confirm/history replay behavior.

## 12. History Integration

Legacy step key:

```txt
filter_singleSelect
```

Committed step shape:

```js
{
  key: "filter_singleSelect",
  timestamp: 0,
  old: {
    filterScope: "global",
    filterLabel: "Personengruppe",
    itemId: "",
    useValue: "",
    displayValue: "Alle"
  },
  new: {
    filterScope: "global",
    filterLabel: "Personengruppe",
    itemId: "",
    useValue: "x",
    displayValue: "X"
  }
}
```

Default CP-1 recommendation:

- Include commit-only history push via `_KDB.services.history.pushCommittedStep(step)` when available.
- Defer replay adapter registration until the production history replay collector has an approved owner integration route for `filter_singleSelect`.

If CP-1 includes replay:

- create `history/singleSelectHistoryAdapter.js`;
- register it through the approved history replay handler mechanism;
- ensure replay delegates through `singleSelect` owner logic and does not write foreign state.

## 13. DOM Discipline

`singleSelect` may mutate only DOM that belongs to the active Cognos filter popup behavior it owns:

- custom Alle option row;
- custom OK/Cancel footer state;
- selected/checked option visuals;
- owner-local popup sync classes;
- owner-local out-click pending revert.

Constraints:

- No dock-level listener.
- No long-lived dock observer.
- No direct read of `_KDB.runtime.filterDock.domRefs`.
- No live DOM in `_KDB.state`.
- Owner-local DOM refs live in `_KDB.runtime.singleSelect.domRefs` and are cleared after rebuild/destroy.
- Owner-local observers/listeners/timers live in `_KDB.runtime.singleSelect` buckets and are cleaned before runtime reset.

If the `filterDock` handoff cannot supply the live DOM context needed for original OK/Cancel clicks, this contract recommends a later narrow `filterDock` owner method rather than cross-runtime access.

## 14. Folder Layout

Production target after CP-1 and execution-spec approval:

```txt
KDB3/js/dashboard/filters/singleSelect/
  __orchestratorSingleSelect.js
  createSingleSelectController.js
  config/
    actions.js
  state/
    initialState.js
    selectionState.js
    ensureFilterState.js
    createSingleSelectReducer.js
    selectors.js
  effects/
    mapFilterDockHandoff.js
    deriveInteractionIntent.js
    runSingleSelectInteraction.js
    applyPendingSelection.js
    revertToBackupSelection.js
    restorePopupSelection.js
    commitConfirmedSelection.js
  history/
    buildCommittedStep.js
    singleSelectHistoryAdapter.js        // deferred unless CP-1 includes replay
  events/
    eventNames.js                        // deferred unless CP-1 approves event catalog scope
```

`specialRights/` is deferred and is not created in this core tranche. CP-1 decides that `specialRights` / `specialSingleSelect` will get its own later module contract instead of being bundled under the core `singleSelect` module.

The execution spec may split large effect files further to satisfy file-size/import-count limits; it must not create vague folders such as `helpers`, `common`, or `misc`.

## 15. Bootstrap And Parent Filters Orchestrator

Default recommendation:

- `singleSelect` contract and implementation are prepared first.
- Production `filterDock` dispatch wiring is deferred to a small integration tranche unless CP-1 explicitly bundles exact filterDock changes.
- A future `dashboard/filters/__orchestratorFilters.js` may mount `filterDock` and filter owner modules together, but is not required for this CP-1 unless the user chooses to bundle parent wiring.

Documented future route:

```js
_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockStateChanged",
  payload: handoff
});

_KDB.api.singleSelect.dispatch({
  type: "singleSelect/filterDockPopupReady",
  payload: handoff
});
```

No `KDB.js` or parent orchestrator edit is included unless CP-1 explicitly expands scope.

## 16. Out Of Scope

- `specialRights/**` unless CP-1 explicitly includes it with exact files and state/runtime/API decisions.
- Full port of `filterDock`, `sicht`, `stelleHierarchy` / `dienststelle`, or a parent `__orchestratorFilters.js`.
- Modifying production `filterDock` except a CP-1-approved handoff integration delta with exact file list.
- Adding dock-level listeners or long-lived dock observers in `singleSelect`.
- Reading `_KDB.runtime.filterDock`.
- Bootstrap registration in `KDB.js`, unless CP-1 explicitly changes this.
- Cross-service or cross-feature integration tests.
- Browser harness or `TEST/` sandbox.
- Editing or moving legacy files.
- Editing `.cursor/rules/`, authority architecture docs, litmustest reports, or contract templates.

## 17. CP-1 Acceptance Matrix

| Dimension | Draft decision / recommendation |
|---|---|
| Final target path | `KDB3/js/dashboard/filters/singleSelect/`. |
| Included files | Core owner module: orchestrator, controller, state, selection normalization, interaction mapping, pending/revert/restore/commit effects, committed-step builder. |
| Deferred files | `specialRights/**` as a separate future module; history replay adapter registration; `events/eventNames.js` unless event catalog scope is later approved; filterDock dispatch production changes unless a separate integration tranche bundles them. |
| State owner/subtree | `_KDB.state.filters.singleSelect`; preserve `byScope[filterScope][filterLabel]`. |
| Runtime buckets | `_KDB.runtime.singleSelect.{domRefs,listeners,subscriptions,abortControllers,observers,timers,pendingPromises}`. |
| Public API surface | `_KDB.api.singleSelect = { mount, destroy, dispatch, getState }`; dispatch-style feature module. |
| Emitted/subscribed events | Default: no new events in this tranche; legacy `filter:applied` deferred unless catalog update approved. Subscribed events: none. |
| filterDock integration decision | Default: plan direct API actions and handoff shape; defer production filterDock dispatch wiring to an integration tranche. If bundled, use `singleSelect/filterDockStateChanged` and `singleSelect/filterDockPopupReady`; no events. |
| History integration decision | Default: include commit-only `pushCommittedStep` when `_KDB.services.history` exists; defer replay adapter registration. |
| specialRights decision | Deferred to a separate future module contract for `specialRights` / `specialSingleSelect`; not part of core `singleSelect`. |
| Bootstrap/parent orchestrator decision | Default: document required future wiring; do not edit `KDB.js` or create `__orchestratorFilters.js` unless CP-1 expands scope. |
| Known behavior-preservation risks | Alle must be explicit in handoff; missing Cognos wrappers may block full confirm/replay; programmatic OK/Cancel may require narrow filterDock owner method; specialRights deferral limits rights-driven filters; event catalog deferral omits legacy `filter:applied`; scope keying must remain `filterScope` not tab id. |

## 18. Open Questions For CP-1

Q1. Approve target placement `KDB3/js/dashboard/filters/singleSelect/`?

Q2. Approve `_KDB.api.singleSelect` dispatch-style public API with `mount`, `destroy`, `dispatch`, `getState`?

Q3. Approve state owner `_KDB.state.filters.singleSelect` and legacy keying `byScope[filterScope][filterLabel]`?

Q4. Approve `filterDock` handoff payload as the only planned input path, with actions `singleSelect/filterDockStateChanged` and `singleSelect/filterDockPopupReady`?

Q5. Should this tranche bundle production `filterDock` dispatch changes, or should it only implement `singleSelect` and defer filterDock wiring?

Q6. For popup readiness, approve Route B from `filterDock-downstream-handoff-contractdelta.md` as the target integration (`filterDockPopupReady`)?

Q7. If programmatic OK/Cancel requires live DOM action, should this tranche defer a narrow future `filterDock.clickOriginalButton(...)` owner method rather than allowing `singleSelect` to read `_KDB.runtime.filterDock`?

Q8. Should `waitForFilterApi` and `findExistingFilterAPI` wrappers be included in this tranche, or documented as a blocker/deferred dependency?

Q9. Should legacy `filter:applied` be cataloged and emitted in this tranche, or deferred?

Q10. Should history be commit-only in this tranche, with replay adapter registration deferred?

Q11. Resolved at CP-1: `specialRights/**` remains deferred and becomes its own future module / `specialSingleSelect` contract.

Q12. Should a parent `dashboard/filters/__orchestratorFilters.js` be created now, or should bootstrap/parent wiring be deferred?

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| 2026-05-22 | `Draft -> Approved` | user | Core `singleSelect` approved; `specialRights` / `specialSingleSelect` deferred to a separate future module; proceed to execution spec. |
| 2026-09-09 | Public API unchanged — restore table-display overlay | PO vastenburg (Cognos green) | Overlay adds no new public methods. Law: `singleSelect-restore-table-display-contractdelta.md`. |
| 2026-09-09 | Dispatch-only chip overlay action | PO vastenburg (GO) | `singleSelect/filterDockCommittedDisplayObserved`. Law: `singleSelect-closed-dock-chip-overlay-contractdelta.md`. |

# Module Contract: `specialSingleSelect`

> CP-1 draft for a DIRECT PORT / behavior-redesign tranche for special-right single-select filters.
> No production code may be generated until this contract is approved.

---

**Status:** `Draft`
**Owner module / service:** `specialSingleSelect`
**Type:** `dashboard/filters feature module`
**Authoring AI:** GPT-5.5, 2026-05-24
**Reviewed by:** `<pending CP-1>`
**Related rules:** `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`.

---

## 0. Direct-Port Scope

Target after CP-1 and execution-spec approval:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/
KDB3/css/filters/filters.css
```

This tranche is a direct-port baseline plus user-approved behavior redesign. It preserves the core `singleSelect` interaction model by delegation and replaces the legacy special-right add/remove/reconcile flow with tableData-driven, idempotent class sync plus narrowly scoped Cognos value actions.

`specialSingleSelect` is not a shared service and must not land under `core/services/`.

## 1. Legacy Evidence

Primary behavioral evidence comes from user-supplied investigation reports, per the session policy. The planning AI must not perform an independent legacy deep-dive for special filters.

Reports used:

1. User-supplied investigation report: `REDESIGN2` `singleSelect/specialRights/` special-right single-select behavior.
2. User-supplied investigation report: legacy Leitung / Personengruppe special single-select behavior across `letzteOriginal` filters, `filtersOrchestrator`, `filterObject`, rights loading and cascading visibility.

Legacy source paths for mapping only:

```txt
legacy-redesign2:js/dashboard/filters/singleSelect/specialRights/
legacy-redesign2:js/dashboard/filters/singleSelect/
laatsteOriginal/KDB2/js/filters/
laatsteOriginal/KDB2/js/filters/singleSelect/
```

Legacy behavior summary:

| Legacy area | Evidence used |
|---|---|
| `specialRightsAccess.js` / rights tables | Rights are boolean-like values from `Alle`, `Personengruppe`, and `Dienststellenleitung` / `dstleitung` tables; value `1` means allowed. |
| `removeSpecialFilters.js` | Legacy removes special filters across scopes first; this contract replaces removal with visibility gating unless CP-1 later approves removal. |
| `applyRightsDrivenDefaults.js` / `addConditionalFilters.js` | Legacy writes default Cognos values when a right exists but `Alle` is not allowed. This contract keeps the narrow default/clear capability, driven by current Sicht and tableData. |
| `selectionHelpers.js` | Legacy chooses `Alle` when allowed, otherwise the filter default. This contract uses first row from the module's option table instead of hardcoded legacy defaults. |
| `reconcileLateFilterRights.js` / `reconcileLateAlle.js` | Late reconcile exists in legacy but is fragile/redundant because first pass effectively waits for all three rights; this contract uses idempotent sync on tableData/Sicht changes. |
| legacy Sicht logic | Personengruppe and Dienststellenleitung are relevant for Sicht `BW`; they are hidden for `DEZPV`. |
| `singleSelect` legacy engine | Popup, pending/confirmed selection, OK/Cancel, and Alle-option interaction belong to generic singleSelect behavior and are not duplicated here. |

## 2. Purpose

`specialSingleSelect` owns special-right gating for Personengruppe and Dienststellenleitung single-select filters. It reads tableData rights and option rows, applies visibility and rights classes to the relevant Cognos filter wrappers, and performs owner-approved automatic Cognos value actions when the current Sicht and rights require them.

It does not reimplement generic single-select popup behavior. User interaction with options, pending/confirmed state, OK/Cancel, popup sync and normal singleSelect commits are delegated to `_KDB.api.singleSelect`.

## 3. Placement And Classification

Target:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/
```

Classification: dashboard filters feature module.

Rationale:

- The behavior is specific to dashboard filter wrappers, Sicht state and filter table rights.
- It owns feature behavior and its own `_KDB.state.filters.specialSingleSelect` subtree.
- It is not reusable infrastructure and therefore does not belong under `_KDB.services`.

## 4. Ownership

- Canonical state subtree: `_KDB.state.filters.specialSingleSelect`.
- Canonical writer: `specialSingleSelect` only, through its reducer / owner writers.
- Foreign-write paths: none.
- `singleSelect` owns `_KDB.state.filters.singleSelect`; this module must not mutate that subtree directly.
- `filterDock` remains the dock observation owner; this module must not read `_KDB.runtime.filterDock`.
- `sicht` owns its own selection state; this module consumes the confirmed Sicht value through an explicit API action.

Initial state shape:

```js
_KDB.state.filters.specialSingleSelect = {
  lifecycle: "idle",
  activeSichtValue: null,
  byFilterId: {
    personengruppe: {
      filterLabel: "Personengruppe",
      filterKey: null,
      rightTableKey: "personengruppe",
      optionTableKey: "personengruppe_filter",
      rightAllowed: false,
      alleAllowed: false,
      isVisibleForSicht: false,
      isVisible: false,
      selectionSource: "none",
      wasSetBySpecialSingleSelect: false,
      parkedUserSelection: null,
      lastAppliedUseValue: null,
      lastAppliedDisplayValue: null,
      lastSyncedAt: null,
      errorCode: null,
      errorMessage: null
    },
    dienststellenleitung: {
      filterLabel: "Dienststellenleitung",
      filterKey: null,
      rightTableKey: "dienststellenleitung",
      optionTableKey: "dienststellenleitung_filter",
      rightAllowed: false,
      alleAllowed: false,
      isVisibleForSicht: false,
      isVisible: false,
      selectionSource: "none",
      wasSetBySpecialSingleSelect: false,
      parkedUserSelection: null,
      lastAppliedUseValue: null,
      lastAppliedDisplayValue: null,
      lastSyncedAt: null,
      errorCode: null,
      errorMessage: null
    }
  },
  errorCode: null,
  errorMessage: null
};
```

Lifecycle subset: `idle`, `ready`, `error`, `disposed`.

`selectionSource` values:

| Value | Meaning |
|---|---|
| `"none"` | This module has not applied a Cognos value for the filter. |
| `"specialDefault"` | This module set a default option because `Alle` was denied while the filter right and Sicht allowed visibility. |
| `"clearedBySpecialSingleSelect"` | This module cleared / neutralized an active Cognos value because the filter became hidden by Sicht or rights. |
| `"user"` | User interaction took over through generic `singleSelect`; if the filter later becomes hidden, this value may be parked in `parkedUserSelection` but must not remain active in Cognos. |

Hidden-filter safety rule:

- When a special filter becomes deterministically hidden because the active Sicht is incompatible or the relevant right is denied, `specialSingleSelect` must ensure that the active Cognos filter value is inactive.
- User-owned values may be parked in `_KDB.state.filters.specialSingleSelect.byFilterId[filterId].parkedUserSelection` for possible later restoration, but they must not remain active while the wrapper is hidden.
- The module does not clear on `unknown` / `loading` inputs; set/clear decisions run only after the relevant rights and Sicht value are known enough to decide visibility.
- `wasSetBySpecialSingleSelect` remains useful for knowing whether a previous automatic default may be overwritten without preserving a user value, but it is not a condition for clearing a hidden filter.

## 5. Runtime

- Owner namespace: `_KDB.runtime.specialSingleSelect`.
- Cleanup trigger: `destroy()`.

Runtime shape:

```js
_KDB.runtime.specialSingleSelect = {
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
| `domRefs` | Current special filter wrapper refs resolved by this module during sync; no long-lived cross-owner refs. |
| `subscriptions` | Event-bus unsubscribe handles only if CP-1 later approves fact-event consumption. Default route is direct API, so this is expected empty. |
| `abortControllers` | Abortable tableData / Cognos coordination if needed. |
| `pendingPromises` | In-flight automatic set/clear operations, cleared or ignored on destroy. |

Idempotency:

- Repeated mount/sync must not duplicate listeners, observers, subscriptions, pending promises, timers, or CSS classes.
- Class sync uses `classList.toggle(..., boolean)` and never removes unrelated classes.
- `destroy()` sets `_isDisposed = true` first, aborts / unsubscribes / clears runtime, then marks lifecycle `disposed`.

## 6. Public API

Surface:

```js
_KDB.api.specialSingleSelect = {
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
| `specialSingleSelect/sichtChanged` | `sicht` module or parent filters orchestrator | Confirmed Sicht value changed; sync root Sicht class on `#filterDockContainer` and evaluate auto set/clear. |
| `specialSingleSelect/filterDockStateChanged` | `filterDock` routing | Special filter click/user interaction handoff. Gate or delegate to `singleSelect`. |
| `specialSingleSelect/filterDockPopupReady` | `filterDock` routing | Popup-ready handoff. Apply wrapper/Alle classes and delegate generic popup sync to `singleSelect`. |
| `specialSingleSelect/tableDataChanged` | bootstrap/tableData integration or explicit refresh | Re-evaluate rights and option rows after relevant tableData changes. |
| `specialSingleSelect/userSelectionCommitted` | mandatory `singleSelect` integration hook or approved parent filters orchestrator hook | Mark `selectionSource: "user"` and store the committed selection metadata so hidden-filter clearing can park rather than lose user intent. |
| `specialSingleSelect/syncRequested` | local / integration hook | Idempotently sync all known special filters. |
| `specialSingleSelect/error` | internal catch boundary | Record owned error state. |
| `specialSingleSelect/destroy` | `destroy()` | Mark lifecycle disposed. |

Communication decision:

- Direct API / dispatch is the default route because the target owner is known.
- No request-event is introduced in this tranche.
- A future fact-event such as `sicht:selectionConfirmed` may be introduced only if multiple independent consumers need to react and `eventSubscribe.md` is updated.

## 7. Module Boundary With `singleSelect`

`specialSingleSelect` and `singleSelect` both operate on Personengruppe and Dienststellenleitung filters, but they do not own the same responsibility.

| Responsibility | Owner |
|---|---|
| Popup open / option / Alle / OK / Cancel behavior | `singleSelect` |
| Pending / backup / current selection model | `singleSelect` |
| Generic table-option parsing from `*_filter` rows | `singleSelect`, reusable by call or compatible local adapter if CP-1 approves |
| Rights table reads for `alle`, `personengruppe`, `dienststellenleitung` | `specialSingleSelect` |
| Sicht-driven visibility (root class on `#filterDockContainer` + static CSS) | `specialSingleSelect` |
| Per-filter rights / Alle wrapper marker classes | `specialSingleSelect` |
| Automatic default set / owner-safe clear based on rights + Sicht | `specialSingleSelect` |
| `KDB_sssSicht_BW`, `KDB_sssSicht_DEZPV` root classes on `#filterDockContainer` | `specialSingleSelect` |
| `KDB_specialSingleSelect`, `KDB_SSS_right`, `KDB_SSS_alleOption` wrapper classes | `specialSingleSelect` |

Conflict rule:

- `singleSelect` must not interpret special rights or Sicht for these filters.
- `specialSingleSelect` must not duplicate singleSelect popup or OK/Cancel behavior.
- When generic behavior is needed, `specialSingleSelect` delegates by dispatching the corresponding action to `_KDB.api.singleSelect`.
- `singleSelect` or an approved parent filters orchestrator must notify `specialSingleSelect` after a committed user selection for a `specialSingleSelect` filter. The contract relies on this signal to distinguish user intent from automatic defaults.

## 8. Module-Local Config

Config lives inside the module, not in `core/config/tables.js` and not in a broad project-global filters config unless a later cross-module need appears.

Planned file:

```txt
dashboard/filters/specialSingleSelect/config/specialFilterDefinitions.js
```

Draft shape:

```js
{
  personengruppe: {
    filterId: "personengruppe",
    filterLabel: "Personengruppe",
    condition: "Personengruppe",
    rightTableKey: "personengruppe",
    optionTableKey: "personengruppe_filter",
    allowedSichtValues: ["BW"],
    sichtValueKind: "display"
  },
  dienststellenleitung: {
    filterId: "dienststellenleitung",
    filterLabel: "Dienststellenleitung",
    condition: "Dienststellenleitung",
    rightTableKey: "dienststellenleitung",
    optionTableKey: "dienststellenleitung_filter",
    allowedSichtValues: ["BW"],
    sichtValueKind: "display"
  }
}
```

Stable config ids are lowercase (`personengruppe`, `dienststellenleitung`). Labels and conditions are fields, not keys.

Display values such as `BW` and `DEZPV` must not be hardcoded outside module config. `activeSichtValue` is the normalized confirmed Sicht display value unless a later CP-1 approves use-value matching; mapping from raw Sicht selection to a config key stays centralized in `specialFilterDefinitions.js`.

Root Sicht class mapping lives in `config/selectors.js` (not per-filter definitions):

```js
{
  filterDockRootSelector: "#filterDockContainer",
  rootSichtClassByValue: {
    BW: "KDB_sssSicht_BW",
    DEZPV: "KDB_sssSicht_DEZPV"
  },
  rootSichtClassValues: ["KDB_sssSicht_BW", "KDB_sssSicht_DEZPV"]
}
```

## 9. Decision Matrix

Inputs:

- `alle` right: normalized value from `_KDB.services.tableData.readRows("alle")`.
- filter right:
  - `personengruppe`: normalized value from `_KDB.services.tableData.readRows("personengruppe")`.
  - `dienststellenleitung`: normalized value from `_KDB.services.tableData.readRows("dienststellenleitung")`.
- option table rows:
  - `personengruppe_filter`: first valid row from `_KDB.services.tableData.readRows("personengruppe_filter")` provides `{ display, use }`.
  - `dienststellenleitung_filter`: first valid row from `_KDB.services.tableData.readRows("dienststellenleitung_filter")` provides `{ display, use }`.
- active Sicht value: supplied by `specialSingleSelect/sichtChanged`.
- Sicht compatibility: active Sicht value is in `allowedSichtValues`.

Rights normalization:

- Allowed values are `1`, `"1"` and `true`.
- Everything else, including missing rows, `0`, `"0"`, `false`, `null` and `undefined`, is denied once the table read is resolved.
- If the relevant table is not ready or the tableDataService read is unavailable, the state is treated as unknown and no set/clear decision is made.

| Rights / Sicht state | DOM classes | Cognos action | Generic singleSelect behavior |
|---|---|---|---|
| `alle === true`, filter right allowed, Sicht compatible | Root: `KDB_sssSicht_<value>` on `#filterDockContainer`. Wrapper: `KDB_specialSingleSelect`, `KDB_SSS_right`, `KDB_SSS_alleOption`. | No automatic default required; `"Alle"` remains available/default as for normal singleSelect. | Delegate popup/user handoffs to `singleSelect`. |
| `alle !== true`, filter right allowed, Sicht compatible | Root: `KDB_sssSicht_<value>`. Wrapper: `KDB_specialSingleSelect`, `KDB_SSS_right`, no `KDB_SSS_alleOption`. | If no user-owned selection exists, set first row from the relevant option table through Cognos API and record `selectionSource: "specialDefault"`. | Delegate popup/user handoffs to `singleSelect`, with Alle hidden. |
| filter right denied | Root: `KDB_sssSicht_<value>` if known. Wrapper: `KDB_specialSingleSelect`, no `KDB_SSS_right`. | Clear / neutralize any active Cognos value for this special filter; park user-owned value in state when needed. | Do not route user actions while hidden. |
| Sicht incompatible | Root: `KDB_sssSicht_<value>` (e.g. `DEZPV`). Wrapper: `KDB_specialSingleSelect`, no `KDB_SSS_right`. | Clear / neutralize any active Cognos value for this special filter; park user-owned value in state when needed. | Do not route user actions while hidden. |
| rights table not ready | Root: `KDB_sssSicht_<value>` if known. Wrapper: `KDB_specialSingleSelect` only. | No Cognos set/clear until relevant rights are known. | Do not invent rights defaults. |
| option table not ready while default is needed | Root and wrapper classes as known; interaction disabled / hidden per execution spec | Do not construct fake defaults; wait for a valid first option row. | Do not open an empty or half-synced popup. |

Restore overlay (`specialSingleSelect-parameterSetRestore-rights-notify-contractdelta.md` + `specialSingleSelect-restore-default-h2-contractdelta.md`): parameterRestore hide+clear of a non-empty denied-right value, and restore applyDefault of Standardauswahl, may notify via writebackSet. Leitung shares that overlay after H2. Policy rows otherwise unchanged.

Visibility CSS (Optie C — root class + static CSS):

- Active Sicht is encoded once on `#filterDockContainer` via mutually exclusive root classes `KDB_sssSicht_BW` or `KDB_sssSicht_DEZPV` (or neither when unknown).
- Static CSS in `filters/filters.css` (former `specialSingleSelect.css` section) drives wrapper show/hide for **both** `#filterDock__global` and `#filterDock__other` using root class + wrapper rights marker + `:has([data-id="…"])` filter identity.
- A special filter wrapper is hidden by default (pre-JS hide via `:has([data-id="Personengruppe"|"Dienststellenleitung"])`).
- A wrapper is visible only when root carries an allowed Sicht class (e.g. `KDB_sssSicht_BW`) **and** the wrapper has `KDB_SSS_right`.
- Sicht classes must **not** be placed on individual wrappers; they are root-only.
- Class sync must update **all** matching wrapper instances under `#filterDockContainer`, not the first document match.
- No runtime `<style>` injection and no tab listeners for visibility.
- The Alle option is hidden by default for `specialSingleSelect` filters and shown only when `KDB_SSS_alleOption` is present on the wrapper.

Per-filter rights / Alle marker classes target the respective `.filterItemWrapper`. Popup / Alle-option behavior is a separate target: either `specialSingleSelect` passes `alleAllowed` / `hasAlleOption` into its delegation to `singleSelect`, or a popup/session-root / concrete Alle-option-row class is applied during `filterDockPopupReady`. The execution spec must pick one of these CP-1-approved routes explicitly.

## 10. Readers / Writers

Published selectors from `specialSingleSelect/state/selectors.js`:

| Selector | Reads | Returns |
|---|---|---|
| `readSpecialSingleSelectState(_KDB)` | `_KDB.state.filters.specialSingleSelect` | Full cloned snapshot or `undefined`. |
| `readSpecialFilterState(_KDB, filterId)` | `byFilterId[filterId]` | Cloned per-filter state or `undefined`. |
| `readActiveSichtValue(_KDB)` | `activeSichtValue` | Current known Sicht display value or `null`. |

Internal writers:

- Initialize root and per-filter state from module config.
- Record active Sicht value.
- Record tableData-derived `alleAllowed`, `rightAllowed`, `isVisibleForSicht`, and `isVisible`.
- Record `selectionSource`, `wasSetBySpecialSingleSelect`, `parkedUserSelection`, and last applied value after confirmed automatic set/clear.
- Record owner error state.
- Mark disposed.

Internal writers are not exposed across module boundaries.

## 11. Events

Default CP-1 decision: no new events in this tranche.

Rationale:

- Known-owner commands use direct API dispatch (`module-public-api.mdc`, `events.mdc`).
- A new fact-event would require a real independent consumer and an `eventSubscribe.md` entry.

Subscribed events: none by default.

Emitted events: none by default.

## 12. Dependencies

- `_KDB` (always).
- `_KDB.api.singleSelect.dispatch(...)` for inherited generic single-select behavior.
- `_KDB.api.filterDock.dispatch(...)` only if this module must request owner-approved popup actions; no direct filterDock runtime reads.
- `_KDB.services.tableData` read methods for `alle`, `personengruppe`, `dienststellenleitung`, `personengruppe_filter`, `dienststellenleitung_filter`; direct reads from `_KDB.state.tableData` are forbidden except inside `tableDataService`.
- `_KDB.cognosAPI.filters` / approved existing filter API path for automatic `setValues` / `clearValues` behavior.
- Active Sicht value via direct API action from `sicht` or parent filters orchestrator.

Deep files must not discover dependencies through `window._KDB`, `window.top.getKDB()`, labels, DOM text, or legacy globals.

## 13. Cognos Touchpoints

| Touchpoint | Purpose |
|---|---|
| Set filter value to first option row | Used when `alle` is denied, the filter right is allowed, Sicht is compatible, and no user-owned selection blocks auto-default. |
| Clear / neutralize filter value | Used whenever the filter becomes deterministically hidden by Sicht incompatibility or denied rights; user-owned values may be parked in state but must not remain active in Cognos while hidden. |

Rules:

- Confirm-before-state: `selectionSource` and `wasSetBySpecialSingleSelect` are changed only after the Cognos action succeeds or is otherwise confirmed by the approved API contract.
- Automatic set uses the first valid row from `_KDB.services.tableData.readRows(optionTableKey)`, not hardcoded legacy `displayValue` / `useValue`.
- Automatic clear / neutralize must ensure hidden filters do not keep active Cognos values. If the active value was user-owned, preserve it in `parkedUserSelection` before clearing so restoration can be decided later.
- If the relevant option table has no valid first row, do not build a fake default and do not expose an interactive half-synced filter.

Open CP-1 item: choose the exact production Cognos API method name for set/clear based on current wrappers.

## 14. DOM And CSS Discipline

### Root classes (Sicht context)

Class target: `#filterDockContainer` (via `filterDockRootSelector` in `config/selectors.js`).

| Class | Target | Meaning |
|---|---|---|
| `KDB_sssSicht_BW` | `#filterDockContainer` | Confirmed active Sicht display value is `BW`. |
| `KDB_sssSicht_DEZPV` | `#filterDockContainer` | Confirmed active Sicht display value is `DEZPV`. |

Rules:

- Exactly one root Sicht class at a time, or none when `activeSichtValue` is unknown.
- Sync is idempotent: remove all `rootSichtClassValues`, then add the class for the current `activeSichtValue`.
- Root sync runs once per sync cycle in `effects/syncSpecialSingleSelectRootClass.js` (pattern: Dienststelle `syncDienststelleRootClass.js`).
- Document-level `document.querySelector("#filterDockContainer")` is permitted for root class sync only; wrapper queries must be scoped to `#filterDockContainer` and return all matches.

### Wrapper classes (rights / module marker)

Class target: respective `.filterItemWrapper`.

| Class | Meaning |
|---|---|
| `KDB_specialSingleSelect` | Marker for filter wrappers owned by this module. |
| `KDB_SSS_right` | The relevant filter right is loaded and allowed. |
| `KDB_SSS_alleOption` | The `Alle` right is loaded and allowed; CSS may show the Alle option. |

Wrapper rules:

- `KDB_specialSingleSelect`, `KDB_SSS_right`, and `KDB_SSS_alleOption` target `.filterItemWrapper`.
- All wrapper instances for a filter label (global and pageContext) must receive the same rights/marker classes during sync.
- `KDB_SSS_alleOption` may live on `.filterItemWrapper` only as a rights marker. The actual popup Alle row must be controlled either through delegation data to `singleSelect` or through popup/session DOM classes during `filterDockPopupReady`; do not assume wrapper CSS alone can reach every popup structure.

Deprecated (do not use after Optie C migration):

- `KDB_Sicht_BW` and `KDB_Sicht_DEZPV` on wrappers — replaced by root classes `KDB_sssSicht_BW` / `KDB_sssSicht_DEZPV`.

CSS path:

```txt
KDB3/css/filters/filters.css
```

CSS registration:

- Add `./v1/ext/KDB3/css/filters/filters.css` to `core/css/config/cssHrefList.js` after CP-1, unless CP-1 approves a different path.

No live DOM nodes are stored in `_KDB.state`. Runtime refs belong under `_KDB.runtime.specialSingleSelect.domRefs` and are cleared on destroy.

## 15. Folder Layout

Production target after CP-1 and execution-spec approval:

```txt
KDB3/js/dashboard/filters/specialSingleSelect/
  __orchestratorSpecialSingleSelect.js
  createSpecialSingleSelectController.js
  config/
    actions.js
    specialFilterDefinitions.js
  state/
    initialState.js
    createSpecialSingleSelectReducer.js
    selectors.js
  effects/
    mapFilterDockHandoff.js
    readSpecialRightsFromTableData.js
    readDefaultOptionFromTableData.js
    evaluateSpecialFilterVisibility.js
    syncSpecialFilterClasses.js
    syncSpecialSingleSelectRootClass.js
    applyAutomaticSpecialSelection.js
    delegateToSingleSelect.js
  runtime/
    ensureSpecialSingleSelectRuntime.js
    cleanupSpecialSingleSelectRuntime.js
```

Optional splits are allowed in the execution spec to keep file sizes under limits. Do not create vague folders such as `helpers`, `common`, `misc`, `manager`, or `shared`.

## 16. Bootstrap And Integration

Expected integration after CP-1 approval:

- `KDB.js` or a future parent `dashboard/filters/__orchestratorFilters.js` registers `_KDB.api.specialSingleSelect`.
- `filterDock` routes `filterType: "specialSingleSelect"` to `_KDB.api.specialSingleSelect`, not directly to `_KDB.api.singleSelect`.
- `specialSingleSelect` delegates generic popup/user behavior to `_KDB.api.singleSelect`.
- `sicht` or a parent filters orchestrator dispatches confirmed Sicht changes to `_KDB.api.specialSingleSelect`.
- CSS load list includes `filters/filters.css` (former `specialSingleSelect.css` section).

Open CP-1 item: decide whether this tranche modifies `KDB.js`, `filterDock`, and/or a future parent filters orchestrator, or whether those hooks are deferred to a separate integration tranche.

## 17. Out Of Scope

- Copying or reimplementing generic `singleSelect` popup / OK / Cancel behavior.
- Legacy remove-first / add-later cross-scope filter deletion.
- `TEST/` sandbox or browser harness.
- Full port of unrelated filter types.
- Modifying `sicht` except exact CP-1-approved hook files.
- Modifying `filterDock` except exact CP-1-approved routing hook files.
- Editing legacy trees.
- Editing `.cursor/rules/`, authority architecture docs, litmustest reports, or contract templates.
- Widget warning behavior from legacy Leitung helpers.

## 18. CP-1 Acceptance Matrix

| Dimension | Draft decision / recommendation |
|---|---|
| Final target path | `KDB3/js/dashboard/filters/specialSingleSelect/`; CSS at `KDB3/css/filters/filters.css`. |
| Included legacy behavior | Rights-driven special handling for Personengruppe and Dienststellenleitung; `Alle` permission; Sicht compatibility; automatic default/clear when owner-safe. |
| Replaced legacy behavior | No legacy `removeSpecialFilters` / `addConditionalFilters` cross-scope remove-add-reconcile flow unless explicitly approved later. |
| Standalone API vs subsystem | Standalone `_KDB.api.specialSingleSelect` dispatch API, with delegation to `_KDB.api.singleSelect` for generic behavior. |
| State owner/subtree | `_KDB.state.filters.specialSingleSelect`; does not write `_KDB.state.filters.singleSelect`. |
| TableData read contract | Through `_KDB.services.tableData.readRows(...)` for `alle`, `personengruppe`, `dienststellenleitung`, `personengruppe_filter`, `dienststellenleitung_filter`; no direct foreign state reads. |
| Filter ids | Stable config ids: `personengruppe`, `dienststellenleitung`; labels are fields. |
| Sicht values | `BW`, `DEZPV` live only in module config; root class names `KDB_sssSicht_BW`, `KDB_sssSicht_DEZPV` on `#filterDockContainer`. |
| Class targets | Root Sicht on `#filterDockContainer`; rights/marker on `.filterItemWrapper`. |
| Visibility strategy | Optie C: root class + static bucket-scoped CSS for `#filterDock__global` and `#filterDock__other`; no runtime CSS injection. |
| Alle option rule | Hidden by default; shown only when normalized `alle` right is allowed; wrapper marker plus popup/delegation handling must be specified separately. |
| Filter visibility rule | Hidden by default; visible only when root carries allowed Sicht class (e.g. `KDB_sssSicht_BW`) and wrapper has `KDB_SSS_right`. |
| Automatic default rule | If `alle` denied, filter right allowed and Sicht compatible, set first row from the relevant option table unless user-owned selection blocks it. |
| Clear rule | Deterministically hidden special filters must not keep active Cognos values; park user-owned values in state before clear/neutralize when needed. |
| Class sync trigger | Direct dispatch on Sicht change, tableData refresh/change, filterDock handoff/popup-ready, and mount sync. |
| filterDock routing | `specialSingleSelect` route first; delegate generic behavior to `singleSelect`. |
| Communication style | Direct API/dispatch, no events by default. |
| Performance conclusion | Preferred over legacy because it avoids remove/add DOM churn, broad Cognos reconcile loops, and redundant late reconcile; it uses idempotent class sync plus minimal set/clear actions. |
| CSS registration | Add to CSS load list after CP-1 if production CSS is approved. |
| Investigation reports used | Two user-supplied reports listed in Section 1. |

## 19. Open Questions For CP-1

Q1. Approve standalone `_KDB.api.specialSingleSelect` with dispatch + reducer, rather than folding this back into `singleSelect`?

Q2. Approve module-local config file `config/specialFilterDefinitions.js` with stable ids `personengruppe` and `dienststellenleitung`?

Q3. Approve the hidden-filter safety policy: when a special filter is hidden by Sicht incompatibility or denied rights, `specialSingleSelect` clears / neutralizes the active Cognos value, parking user-owned selections in state when needed?

Q4. Approve mandatory `selectionSource: "user"` notification from `singleSelect` or an approved parent filters orchestrator after committed user selection?

Q5. Approve direct API/dispatch from `sicht` or a parent filters orchestrator to `specialSingleSelect`, with no event catalog change in this tranche?

Q6. Decide exact integration hook owner: should `sicht` call `_KDB.api.specialSingleSelect.dispatch(...)` directly, or should a parent `dashboard/filters/__orchestratorFilters.js` route confirmed Sicht changes?

Q7. Decide exact Cognos set/clear API names for automatic special selection.

Q8. Confirm `.filterItemWrapper` is the class target for wrapper visibility classes, and approve the separate popup/Alle route: delegation data to `singleSelect` or popup/session DOM class during `filterDockPopupReady`.

Q9. Confirm this tranche may modify `filterDock` routing so `specialSingleSelect` receives special handoffs before delegation to `singleSelect`.

Q10. Confirm this tranche may modify bootstrap / CSS load list, or defer those integration edits to a follow-up tranche.

## Approval Log

| Date | Status change | Approver | Notes |
|---|---|---|---|
| `<pending>` | `Draft -> Approved` | `<pending>` | CP-1 pending. |
| 2026-05-30 | Contract delta | Planning AI | Visibility Optie C: Sicht classes move from wrapper (`KDB_Sicht_*`) to root on `#filterDockContainer` (`KDB_sssSicht_*`); static CSS targets both dock subtrees. |

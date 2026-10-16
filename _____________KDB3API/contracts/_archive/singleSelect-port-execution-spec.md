# Execution Spec: `singleSelect` (core direct port)

> Direct-port execution spec for the approved core `singleSelect` dashboard filters feature module.
> Execute only after CP-1 approval of `contracts/singleSelect.md`.

---

**Status:** `Ready for execution`
**Module / contract:** `_____________KDB3API/contracts/singleSelect.md`
**Phase:** `core direct production port`
**Authoring AI:** GPT-5.5, 2026-05-22
**Executing AI:** `<pending>`
**Reviewer:** `<pending CP-2>`

---

## Section A. Pre-flight read list

The executing AI must read each file below in order before producing output files and must echo one sentence per item.

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB.*` namespaces; no globals or new top-level keys.
2. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state, canonical writers, no foreign state writes.
3. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime resources under `_KDB.runtime.<owner>` with explicit cleanup.
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — one public surface per module, dispatch-style feature API, disposed guards.
5. `_____________KDB3API/.cursor/rules/events.mdc` — direct API when owner is known; no new events without catalog approval.
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — Module Contract First, folder roles, small files, orchestrator/controller split.
7. `_____________KDB3API/.cursor/rules/naming.mdc` — English technical names, casing, action/event naming, underscore boundary inputs.
8. `_____________KDB3API/.cursor/rules/error-handling.mdc` — mandatory try/catch on named executables, subscribers and async; pure reducers and one-liner helpers exempt; lifecycle/fire-and-forget boundaries convert to owned error state.
9. `_____________KDB3API/.cursor/rules/dom.mdc` — selectors in config, live refs in runtime, no dock-level listener/observer in `singleSelect`.
10. `_____________KDB3API/.cursor/rules/amd.mdc` — one AMD `define`, full-compact form, named factory-scope helpers only.
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — verify `idle`, `ready`, `error`, and `disposed`.
12. `_____________KDB3API/contracts/singleSelect.md` — approved CP-1 contract for this port.
13. `_____________KDB3API/contracts/filterDock-downstream-handoff-contractdelta.md` — handoff payload shape and no cross-runtime reads.
14. This execution spec.

The first executing-AI output must be the 14 echoed summaries. If any summary is missing or generic, stop and re-read.

---

## Section B. Folder tree

Create files only under:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/
```

Production files to create:

```txt
singleSelect/
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
    resolveFilterApi.js
    commitConfirmedSelection.js
  history/
    buildCommittedStep.js
```

Do not create in this tranche:

```txt
singleSelect/specialRights/
singleSelect/events/eventNames.js
singleSelect/history/singleSelectHistoryAdapter.js
```

Do not modify in this tranche:

```txt
_____________KDB3API/KDB3/js/dashboard/filters/filterDock/
_____________KDB3API/KDB3/js/dashboard/filters/__orchestratorFilters.js
_____________KDB3API/KDB3/js/KDB.js
_____________KDB3API/KDB3/js/core/services/collectReplayHandlers.js
_____________KDB3API/architecture/eventSubscribe.md
```

---

## Section C. CP-1 decisions to preserve

1. Target path is `KDB3/js/dashboard/filters/singleSelect/`.
2. Public API is `_KDB.api.singleSelect = { mount, destroy, dispatch, getState }`.
3. State owner is `_KDB.state.filters.singleSelect`.
4. Preserve legacy state keying: `byScope[filterScope][filterLabel]`.
5. Consume `filterDock` only through future direct API handoff actions:
   - `singleSelect/filterDockStateChanged`
   - `singleSelect/filterDockPopupReady`
6. Do not add a dock-level click listener.
7. Do not add a long-lived dock `MutationObserver`.
8. Do not read `_KDB.runtime.filterDock.domRefs`.
9. `specialRights` / `specialSingleSelect` is a separate future module; do not port `specialRights/**`.
10. Include commit-only history push when `_KDB.services.history.pushCommittedStep` exists; defer history replay registration.
11. Do not emit `filter:applied` in this tranche because event catalog scope is not approved.
12. Do not wire `filterDock` dispatching or bootstrap in this tranche.

---

## Section D. Legacy mapping table

| New production file | Legacy source(s) | Rule-alignment note |
|---|---|---|
| `__orchestratorSingleSelect.js` | `__singleSelectOrchestrator.js`, `ensureFilterState.js` | Register state/runtime/API; no direct orchestration export as public surface. |
| `createSingleSelectController.js` | `__singleSelectOrchestrator.js` | Dispatch-style controller with `mount`, `destroy`, `dispatch`, `getState`, disposed guards, try/catch boundaries. |
| `config/actions.js` | Legacy direct function calls | Slash-style action constants for filterDock handoff, error, destroy. |
| `state/initialState.js` | `ensureFilterState.js` | Root serializable state with lifecycle/meta/byScope/error fields. |
| `state/selectionState.js` | `selectionState.js` | Pure normalization helper; preserve `"Alle"` normalization exactly. |
| `state/ensureFilterState.js` | `ensureFilterState.js`, `specialRights/syncSingleSelectState.js` evidence | Preserve `byScope[filterScope][filterLabel]` and per-filter shape; no DOM/runtime values. |
| `state/createSingleSelectReducer.js` | `ensureFilterState.js`, state writes in commit/apply/revert | Pure reducer for lifecycle/error/destroy and state snapshot actions; no DOM or Cognos calls. |
| `state/selectors.js` | New rule-aligned selector registry | Published granular reads; consumers do not import internal state files. |
| `effects/mapFilterDockHandoff.js` | `filterDock/buildFilterInfoObj.js`, `filterDock-downstream-handoff-contractdelta.md` | Convert serializable handoff into legacy-compatible context; no DOM refs from filterDock runtime. |
| `effects/deriveInteractionIntent.js` | `deriveInteractionIntent.js` | Preserve intent semantics including `alle`; prefer `interactionType` and `isAlleOption` from handoff. |
| `effects/runSingleSelectInteraction.js` | `__singleSelectOrchestrator.js` | Preserve pipeline order: ensure state, restore, derive intent, guard commit, route handlers. |
| `effects/applyPendingSelection.js` | `applyPendingSelection.js` | Preserve pending mutation behavior for clear/alle/option. |
| `effects/revertToBackupSelection.js` | `revertToBackupSelection.js` | Preserve pending reset to backup. |
| `effects/restorePopupSelection.js` | `restorePopupSelection.js` | Preserve popup/Alle/footer sync using `singleSelect` runtime buckets; no dock observer. |
| `effects/resolveFilterApi.js` | filter API lookup inside `commitConfirmedSelection.js` and `__singleSelectHistoryAdapter.js` | Local rule-aligned lookup using existing `_KDB.cognosAPI.filters` methods; do not edit core Cognos wrappers. |
| `effects/commitConfirmedSelection.js` | `commitConfirmedSelection.js` | Preserve commit/rollback flow using `_KDB.cognosAPI.filters.replaceFilterContext` and `_KDB.services.history`. |
| `history/buildCommittedStep.js` | `buildCommittedStep.js` | Preserve step key `filter_singleSelect` and step payload shape. |

Legacy files intentionally deferred:

| Legacy path | Reason |
|---|---|
| `singleSelect/specialRights/**` | CP-1: future separate module / `specialSingleSelect` contract. |
| `__singleSelectHistoryAdapter.js` | History replay registration deferred. |
| `base/events/filterEvents.js` | Event catalog scope not approved; no event emission in this tranche. |

---

## Section E. Per-file specifications

All production files use full-compact AMD form and return exactly one value.

### `__orchestratorSingleSelect.js`

- **Role:** feature-module orchestrator.
- **Lines:** target 80, hard limit 120.
- **AMD imports:** `./state/initialState.js`, `./createSingleSelectController.js`.
- **Entry function:** `__orchestrator(_KDB, _options)`.
- **Body steps:**
  1. Ensure `_KDB.state`, `_KDB.state.filters`, `_KDB.runtime`, `_KDB.api`.
  2. Initialize `_KDB.state.filters.singleSelect` from `initialState()` if absent.
  3. Initialize `_KDB.runtime.singleSelect` buckets: `domRefs`, `listeners`, `subscriptions`, `abortControllers`, `observers`, `timers`, `pendingPromises`.
  4. Create controller with `{ _KDB, options }`.
  5. Register `_KDB.api.singleSelect = controller`.
  6. Return controller.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `feature-structure.mdc`, `kdb-object.mdc`, `state.mdc`, `runtime.mdc`, `module-public-api.mdc`.

### `createSingleSelectController.js`

- **Role:** controller factory.
- **Lines:** target 140, hard limit 150. If it exceeds the hard limit, split cleanup helpers into focused runtime files and report the split.
- **AMD imports:** `./config/actions.js`, `./state/createSingleSelectReducer.js`, `./state/selectors.js`, `./state/ensureFilterState.js`, `./effects/mapFilterDockHandoff.js`, `./effects/runSingleSelectInteraction.js`.
- **Entry function:** `createSingleSelectController(_deps)`.
- **Public methods:** `mount`, `destroy`, `dispatch`, `getState`.
- **Behavior:**
  - Hold `_isDisposed` in controller closure, not in state.
  - `mount(options)` initializes state/runtime and dispatches `singleSelect/mountSucceeded`; it does not bind dock listeners or observers.
  - `dispatch(action)` handles `singleSelect/filterDockStateChanged` and `singleSelect/filterDockPopupReady` by mapping payload then running the interaction pipeline.
  - Ignore handoff payloads whose `filterType` is not `singleSelect` or `specialSingleSelect`; for `specialSingleSelect`, process only core behavior when payload does not require rights data, otherwise no-op with `console.warn("[singleSelect.dispatch] specialSingleSelect deferred")`.
  - `getState()` returns selector snapshot or `undefined` after disposal.
  - `destroy()` sets `_isDisposed = true` first, aborts controllers, disconnects observers, removes listeners, clears timers and pending promises, clears DOM refs, dispatches destroy.
  - All public methods wrap meaningful lifecycle/dispatch bodies in try/catch with contextual logs.
- **Rules to apply:** `module-public-api.mdc` (single dispatch surface, disposed guards), `state.mdc` (canonical writer only), `runtime.mdc` (cleanup before reset), `error-handling.mdc` (mandatory try/catch; lifecycle boundaries convert errors), `amd.mdc`, `naming.mdc`.

### `config/actions.js`

- **Role:** action constants.
- **Lines:** target 50.
- **Return value:** object with:
  - `MOUNT_SUCCEEDED: "singleSelect/mountSucceeded"`
  - `FILTER_DOCK_STATE_CHANGED: "singleSelect/filterDockStateChanged"`
  - `FILTER_DOCK_POPUP_READY: "singleSelect/filterDockPopupReady"`
  - `ERROR: "singleSelect/error"`
  - `DESTROY: "singleSelect/destroy"`
- **Rules to apply:** `naming.mdc`, `amd.mdc`, `feature-structure.mdc`.

### `state/initialState.js`

- **Role:** state factory.
- **Lines:** target 60.
- **Return value:** fresh root state:
  - `lifecycle: "idle"`
  - `meta.isProgrammaticClick: false`
  - `byScope.global: {}`
  - `byScope.pageContext: {}`
  - `lastInteraction: null`
  - `lastConfirmedAt: null`
  - `errorCode: null`
  - `errorMessage: null`
- **Rules to apply:** `state.mdc` (serializable only), `lifecycleVocabulary.md`, `amd.mdc`, `naming.mdc`.

### `state/selectionState.js`

- **Role:** pure normalization helpers.
- **Lines:** target 80.
- **Behavior:** port legacy exactly:
  - `normalizeDisplayValue(value)` returns trimmed string or `"Alle"`.
  - `normalizeUseValue(useValue, displayValue)` returns `""` when display is `"Alle"`.
  - expose `createConfirmedSelection`, `createPendingSelection`, `normalizeConfirmedSelection`, `normalizePendingSelection`, `getConfirmedDisplayValue`, `getConfirmedUseValue`, `getPendingDisplayValue`.
- **Rules to apply:** `amd.mdc`, `naming.mdc`, `state.mdc` (pure serializable values).

### `state/ensureFilterState.js`

- **Role:** owner state writer / normalizer.
- **Lines:** target 130, hard limit 150.
- **AMD imports:** `./selectionState.js`.
- **Entry function:** `__controller(_KDB, _handoff)`.
- **Behavior:**
  - Ensure root state and `byScope[filterScope][filterLabel]`.
  - Preserve legacy per-filter shape and defaults.
  - Use `handoff.filterScope` and `handoff.filterLabel` for keying.
  - Set `filterKey` from `handoff.filterKey || handoff.filterId || filterScope + "__" + filterLabel`.
  - Normalize current/backup/pending selections every call.
  - Preserve forced default behavior from legacy `filterConfig.displayValue/useValue` only when no Alle option and state is still `"Alle"`.
  - Do not handle `specialRights`; if `handoff.filterType === "specialSingleSelect"`, keep core fields only and do not infer rights.
- **Rules to apply:** `state.mdc` (owner writes only, serializable), `naming.mdc`, `amd.mdc`.

### `state/createSingleSelectReducer.js`

- **Role:** pure reducer.
- **Lines:** target 90.
- **AMD imports:** `../config/actions.js`, `./initialState.js`.
- **Behavior:**
  - `mountSucceeded`: set lifecycle `ready`, clear errors.
  - `error`: set lifecycle `error`, `errorCode`, `errorMessage`.
  - `destroy`: set lifecycle `disposed`, preserve `byScope` for diagnostics, clear transient `lastInteraction`.
  - Unknown actions return previous state or initialized state.
  - Do not perform DOM, Cognos, history, event, or async work.
- **Rules to apply:** `state.mdc`, `error-handling.mdc` (reducers exempt — pure, no try/catch), `naming.mdc`, `amd.mdc`.

### `state/selectors.js`

- **Role:** published selector registry.
- **Lines:** target 90.
- **Return value:** object with `readSingleSelectState`, `readSingleSelectFilterState`, `readCurrentSelection`, `readPendingSelection`.
- **Behavior:** return cloned serializable snapshots or `undefined`; no mutation.
- **Rules to apply:** `state.mdc`, `module-public-api.mdc`, `amd.mdc`, `naming.mdc`.

### `effects/mapFilterDockHandoff.js`

- **Role:** handoff normalizer.
- **Lines:** target 100.
- **Entry function:** `__controller(_handoff)`.
- **Behavior:**
  - Accept only serializable handoff object.
  - Normalize aliases: `filterScope = handoff.filterScope || handoff.scopeType`, `filterKey = handoff.filterKey || handoff.filterId`.
  - Preserve `scopeId` / `scope` as context fields but do not use them for state keying.
  - Build a legacy-compatible context with fields needed by legacy core: `filterLabel`, `filterKey`, `filterScope`, `scopeId`, `filterConfig`, `clickTarget: null`, `clickedOk`, `clickedCancel`, `clickedClear`, `clickedClose`, `hasAlleOption`, `condition`, `interactionType`, `isAlleOption`, `popup`, `capabilities`, `timestamp`.
  - Derive clicked flags from `interactionType`.
  - Do not include DOM nodes or read runtime.
- **Rules to apply:** `state.mdc` (serializable), `runtime.mdc` (no filterDock runtime reads), `dom.mdc`, `amd.mdc`, `naming.mdc`.

### `effects/deriveInteractionIntent.js`

- **Role:** intent resolver.
- **Lines:** target 70.
- **Behavior:**
  - Prefer normalized context `interactionType`.
  - Preserve legacy intent names: `confirm`, `cancel`, `clear`, `close`, `alle`, `option`, `open`, `unknown`.
  - Treat `isAlleOption === true` as `alle` even if interaction type is `option`.
  - No DOM parsing unless a future approved handoff supplies owner-local DOM context; current tranche must not parse `sourceElementSignature`.
- **Rules to apply:** `naming.mdc`, `amd.mdc`, `dom.mdc` (no runtime cross-read).

### `effects/runSingleSelectInteraction.js`

- **Role:** pipeline coordinator.
- **Lines:** target 140, hard limit 150.
- **AMD imports:** `../state/ensureFilterState.js`, `./deriveInteractionIntent.js`, `./restorePopupSelection.js`, `./applyPendingSelection.js`, `./commitConfirmedSelection.js`, `./revertToBackupSelection.js`.
- **Entry function:** `__controller(_KDB, _runtime, _handoffContext, _options)`.
- **Behavior order:**
  1. Return early when `_KDB.state.filters.singleSelect.meta.isProgrammaticClick === true`.
  2. Ensure per-filter state.
  3. Restore/sync popup selection when payload indicates popup visible/ready.
  4. Derive intent.
  5. If `isCommitInProgress === true` and intent is not `confirm`, return.
  6. `confirm`: call commit.
  7. `cancel`: revert to backup, restore, request future filterDock owner method for original cancel if available; otherwise document no-op.
  8. `close`: revert to backup and restore.
  9. `clear` / `alle` / `option`: apply pending selection and restore.
  10. `open`: restore only.
- **Important:** Because this tranche does not modify `filterDock` and handoff is serializable, any direct original OK/Cancel DOM click must be behind an optional injected method such as `options.clickOriginalButton`; do not read filterDock runtime.
- **Rules to apply:** `error-handling.mdc` (mandatory try/catch on named effect helpers), `runtime.mdc`, `dom.mdc`, `state.mdc`, `amd.mdc`, `naming.mdc`.

### `effects/applyPendingSelection.js`

- **Role:** owner state effect.
- **Lines:** target 80.
- **AMD imports:** `../state/selectionState.js`.
- **Behavior:** preserve legacy clear/alle/option pending selection logic; when the same option is clicked and Alle exists, set pending to `"Alle"`.
- **Rules to apply:** `state.mdc` (owner writes only), `amd.mdc`, `naming.mdc`.

### `effects/revertToBackupSelection.js`

- **Role:** owner state effect.
- **Lines:** target 40.
- **AMD imports:** `../state/selectionState.js`.
- **Behavior:** set pending selection to backup display value and return that label.
- **Rules to apply:** `state.mdc`, `amd.mdc`, `naming.mdc`.

### `effects/restorePopupSelection.js`

- **Role:** owner-local popup sync.
- **Lines:** target 150 hard limit. If longer, split into `syncPopupSelection.js` and `syncPopupFooter.js`.
- **AMD imports:** `../state/selectionState.js`.
- **Behavior:**
  - Preserve legacy DOM sync semantics where an owner-local popup root is available from approved context/options.
  - If no owner-local popup DOM is available in this tranche, update state only and return `null`; do not read filterDock runtime.
  - Inject or sync the custom Alle row only when `hasAlleOption === true`.
  - Hide/remove Alle row when `hasAlleOption !== true`.
  - Sync option selected state and OK enabled state from pending vs backup selection.
  - Store owner-local popup refs/listeners/observers under `_KDB.runtime.singleSelect`.
  - Short-lived observers must be disconnectable from `destroy()`.
  - No dock-level observer.
- **Rules to apply:** `dom.mdc`, `runtime.mdc`, `error-handling.mdc`, `state.mdc`, `amd.mdc`, `naming.mdc`.

### `effects/resolveFilterApi.js`

- **Role:** Cognos filter API resolver.
- **Lines:** target 120.
- **Behavior:**
  - Use existing `_KDB.cognosAPI.filters` object.
  - For `pageContext`, search `getPageContextItemsArr(true)` by `filterLabel` and `filterConfig.itemId` when present.
  - For `global`, search `getGlobalFiltersList()` when present.
  - Poll with bounded attempts/delay only inside this helper; use factory-scope async helper if needed.
  - Return `null` when unavailable; do not throw for missing optional host APIs.
  - Do not edit `core/cognosAPI/filters.js`.
- **Rules to apply:** `kdb-object.mdc` (`_KDB.cognosAPI.filters` themed API), `error-handling.mdc` (mandatory try/catch on Cognos call sites in effects), `amd.mdc`, `naming.mdc`.

### `effects/commitConfirmedSelection.js`

- **Role:** Cognos commit + state/history effect.
- **Lines:** target 150 hard limit. If longer, split matching-value helpers into `resolveFilterApi.js` or local factory-scope helpers; do not exceed hard limit silently.
- **AMD imports:** `./resolveFilterApi.js`, `../history/buildCommittedStep.js`, `../state/selectionState.js`.
- **Behavior:**
  - Preserve legacy next label from pending selection.
  - Preserve previous backup for rollback and history.
  - Set `isCommitInProgress = true` before Cognos work and reset in `finally`.
  - Use `_KDB.cognosAPI.filters.replaceFilterContext(filterApi, [])` for `"Alle"`.
  - For non-Alle, wait for a matching value from `filterApi.getValues()`, then replace with `[selectedValue]`.
  - Wait for normalized one-value/empty state as legacy did.
  - On success: update current/backup/pending selections, set `lastConfirmedTs`, push history step through `_KDB.services.history.pushCommittedStep` when available.
  - Do not emit `filter:applied` in this tranche.
  - On failure: best-effort restore previous Cognos selection, roll state back to previous backup, return `false`.
  - `finally`: clear commit flag; close popup only through optional approved owner method if available, not by querying global filterDock runtime.
- **Rules to apply:** `error-handling.mdc` (mandatory try/catch on async Cognos effects), `state.mdc` (owner writes only), `module-public-api.mdc` (history service named method), `runtime.mdc`, `amd.mdc`.

### `history/buildCommittedStep.js`

- **Role:** history step builder.
- **Lines:** target 50.
- **AMD imports:** `../state/selectionState.js`.
- **Behavior:** preserve legacy key `filter_singleSelect` and shape `{ key, timestamp, old, new }` with `filterScope`, `filterLabel`, `itemId`, `useValue`, `displayValue`.
- **Rules to apply:** `state.mdc` (serializable), `naming.mdc`, `amd.mdc`.

---

## Section F. Reducer behavior table

| Action type | Trigger | Reducer effect | Lifecycle transition |
|---|---|---|---|
| `singleSelect/mountSucceeded` | `mount()` | Ensure root shape, clear errors. | `idle -> ready` |
| `singleSelect/error` | public/effect catch | Merge `errorCode`, `errorMessage`. | `<current> -> error` |
| `singleSelect/destroy` | `destroy()` | Mark disposed, clear transient interaction field, preserve byScope diagnostics. | `<current> -> disposed` |
| unknown | any | Return previous normalized state. | none |

Per-filter selection writes happen through owner helpers/effects because they need legacy normalization and may be initiated from async Cognos effects; they must still write only `_KDB.state.filters.singleSelect`.

---

## Section G. Public API wiring

- Surface: `_KDB.api.singleSelect`.
- Methods: `mount`, `destroy`, `dispatch`, `getState`.
- Runtime initialization: `_KDB.runtime.singleSelect.{domRefs,listeners,subscriptions,abortControllers,observers,timers,pendingPromises}`.
- State initialization: `_KDB.state.filters.singleSelect`.
- No `_KDB.services.singleSelect`.
- No `_KDB.api.filters` router.
- No bootstrap or KDB.js edit in this tranche.

---

## Section H. Acceptance criteria

The executing AI must self-verify all criteria before reporting done.

1. Every file in Section B exists and no extra in-scope file is invented.
2. No file is written outside `_____________KDB3API/KDB3/js/dashboard/filters/singleSelect/`.
3. No legacy file is modified.
4. No file under `.cursor/rules/`, `architecture/`, or contract templates is modified.
5. No production `filterDock`, `KDB.js`, `__orchestratorServices.js`, `collectReplayHandlers.js`, or `eventSubscribe.md` file is modified.
6. Every production file is AMD full-compact form with exactly one `define`.
7. No ES module syntax or CommonJS `require` appears in production files.
8. No file contains inline subfunction definitions inside entry functions, callbacks or return paths.
9. `_KDB.api.singleSelect` is the only public surface.
10. `singleSelect` does not add a dock-level click listener.
11. `singleSelect` does not add a long-lived dock `MutationObserver`.
12. No file reads `_KDB.runtime.filterDock` or mutates `_KDB.state.filters.filterDock`.
13. State keying remains `byScope[filterScope][filterLabel]`.
14. `specialRights/**` is not created or ported.
15. No `filter:applied` event is emitted and no `events/eventNames.js` is created.
16. History commit uses `_KDB.services.history.pushCommittedStep` only when available and does not expose replay registration.
17. All public methods guard disposed state per `module-public-api.mdc`.
18. `destroy()` sets disposed before cleanup, then cleans abort controllers, observers, listeners, timers, pending promises and DOM refs before resetting runtime buckets.
19. Cognos effects use `_KDB.cognosAPI.filters.*`; no flat `_KDB.cognosAPI.replaceFilterContext`.
20. Every catch logs with contextual `console.error` / `console.warn`; no silent catch except explicitly benign best-effort rollback cleanup with a comment.
21. `ReadLints` on all new `.js` files is clean.
22. Static inspection confirms AMD import paths resolve within the new folder or existing production folders.

---

## Section I. Forbidden actions

The executing AI must not:

- Modify `_____________KDB3API/.cursor/rules/`.
- Modify `projectStructureRules.md`, `stateOwnership.md`, `lifecycleVocabulary.md`, `eventSubscribe.md`, or contract templates.
- Modify `contracts/singleSelect.md` or this execution spec.
- Modify `_______REDESIGN2/`, `_______KDB3/`, or `_______LAATSTEORIGINAL/`.
- Modify `TEST/`.
- Modify production `filterDock` in this tranche.
- Modify `KDB.js` or create a parent filters orchestrator.
- Add event catalog entries or event-name constants.
- Add `specialRights` / `specialSingleSelect` files.
- Add bootstrap registration.
- Add behavior repairs or improvements beyond rule-alignment and approved handoff adaptation.
- Commit, push, or change git config.

---

## Section J. Reporting template for executing AI

Final executing-AI report must include:

1. **Pre-flight echo** — 14 numbered summaries from Section A.
2. **Files created** — path list with line counts.
3. **Mapping confirmation** — one line per file confirming legacy source and rule-alignment note.
4. **Acceptance criteria** — pass/fail for Section H.
5. **Deferred scope confirmation** — explicitly state that `specialRights`, events, history replay, filterDock wiring, and bootstrap were not implemented.
6. **Open questions / blockers** — only if the spec could not be followed.

---

## Section K. Reviewer handoff

The supervising AI must:

1. Verify the 14 pre-flight summaries are present and specific.
2. Read every created file.
3. Run `ReadLints` on all new `.js` files.
4. Cross-check every file against Section E and Section H.
5. Diff-walk against legacy and confirm rule-alignment only.
6. Confirm no forbidden files were touched.
7. Confirm static AMD import paths resolve.
8. Stop at CP-2 for user diff-walk + integration-check approval.

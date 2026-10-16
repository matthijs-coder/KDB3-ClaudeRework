# Execution Spec: `tabs` (phase 1 foundation + rename)

> Spec for a coding subagent that creates the first production `tabs` module after `contracts/tabs.md` receives CP-1 approval.
> The executing subagent must implement only the foundation, startup sync/hydrate/traverse, tab-button visibility, authoring visibility, add, current kdbControl toolbox-line selection and rename.
> Delete, duplicate, move/reorder, widget remapping, writeback mutation and history replay are out of scope.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/tabs.md`
**Phase:** `foundation + rename`
**Authoring AI:** GPT-5.5, 2026-06-18
**Executing AI:** `<subagent after CP-1 approval>`
**Reviewer:** `<review subagent + user>`

---

## Section A. Pre-flight Read List

The executing AI must read these files in order and echo one sentence per item before writing code:

1. `_____________KDB3API/architecture/stateOwnership.md` — ownership and `_KDB.state` discipline.
2. `_____________KDB3API/architecture/projectStructureRules.md` — module structure, API and runtime discipline.
3. `_____________KDB3API/.cursor/rules/kdb-object.mdc` — allowed `_KDB` namespaces and registration discipline.
4. `_____________KDB3API/.cursor/rules/state.mdc` — serializable state and canonical writer rule.
5. `_____________KDB3API/.cursor/rules/runtime.mdc` — runtime bucket and cleanup discipline.
6. `_____________KDB3API/.cursor/rules/module-public-api.mdc` — feature module dispatch API shape.
7. `_____________KDB3API/.cursor/rules/events.mdc` — fact/request event rules.
8. `_____________KDB3API/.cursor/rules/feature-structure.mdc` — folder, controller and file-size rules.
9. `_____________KDB3API/.cursor/rules/naming.mdc` — action/event naming.
10. `_____________KDB3API/.cursor/rules/error-handling.mdc` — try/catch and owned error state.
11. `_____________KDB3API/.cursor/rules/dom.mdc` — selector, DOM ref and listener rules.
12. `_____________KDB3API/.cursor/rules/amd.mdc` — production AMD format.
13. `_____________KDB3API/.cursor/lifecycleVocabulary.md` — lifecycle vocabulary.
14. `_____________KDB3API/contracts/tabs.md` — approved module contract.
15. This execution spec.

Stop if any rule conflicts with `contracts/tabs.md`; report the conflict before writing code.

## Section B. Allowed Read Scope

The executing subagent may read current production files only where needed:

- `_____________KDB3API/KDB3/js/KDB.js`
- `_____________KDB3API/KDB3/js/core/cognosAPI/tabs.js`
- `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkToolboxPlaceholderApis.js`
- `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkViewFromState.js`
- Existing production modules only as pattern references for orchestrator/controller/state/effects shape.

The executing subagent must not read legacy trees unless a supervising planner gives a new narrow investigation task. Legacy findings are already captured in `contracts/tabs.md`.

## Section C. Folder Tree

Create:

```txt
_____________KDB3API/KDB3/js/dashboard/tabs/
  __orchestratorTabs.js
  createTabsController.js
  adapters/
    createCognosTabsAdapter.js
  config/
    actionTypes.js
    defaults.js
    selectors.js
  effects/
    applyTabsEffects.js
    syncTabsDomFromState.js
    traverseTabs.js
  events/
    eventNames.js
  state/
    createInitialTabsState.js
    reduceTabsAction.js
    selectors.js
```

Do not create `view/` in phase 1 unless a reviewer approves it. Existing Cognos tab buttons are synchronized from effects.

Bootstrap change after CP-1: wire the new module in `_____________KDB3API/KDB3/js/KDB.js` using the existing feature-module registration/mount pattern.

## Section D. Public API

Expose:

```js
_KDB.api.tabs = {
  mount: mount,
  destroy: destroy,
  dispatch: dispatch,
  getState: getState
};
```

No named command methods. `dispatch` is the only public mutation path.

`getState()` returns at least:

```js
{
  lifecycle: "ready",
  visibleTabs: [],
  activeIndex: null,
  activeTabId: null,
  currentTabId: null,
  editTarget: null,
  toolboxTabEditLineIndex: null,
  selectedTool: null,
  canAdd: false,
  actions: {
    rename: { enabled: false, reason: "noTarget" },
    delete: { enabled: false, reason: "deferred" },
    duplicate: { enabled: false, reason: "deferred" },
    move: { enabled: false, reason: "deferred" },
    reorder: { enabled: false, reason: "deferred" }
  }
}
```

`selectedTool` may be `"rename"` only in phase 1. kdbControl line indexes `1..4` may remain checked for visual parity via `toolboxTabEditLineIndex`, but the matching action projection must stay disabled with reason `"deferred"`.

## Section E. Per-file Specifications

### `__orchestratorTabs.js`

- Role: thin module orchestrator.
- Target lines: 40-80.
- AMD imports: controller, initial state, reducer, selectors, adapter, effects.
- Responsibilities:
  1. Ensure `_KDB.state.tabs` exists using `createInitialTabsState`.
  2. Ensure `_KDB.runtime.tabs` buckets exist.
  3. Register `config/selectors.js` on `_KDB.elements.selectors.tabs` using the same merge pattern as existing module orchestrators.
  4. Create Cognos tabs adapter from `_KDB.cognosAPI.tabs`.
  5. Create controller with injected dependencies.
  6. Register `_KDB.api.tabs`.
  7. Return the public API.
- Must not contain business logic, DOM sync logic or reducer logic.

### `createTabsController.js`

- Role: controller factory and public API owner.
- Target lines: 80-140.
- Responsibilities:
  1. Implement `mount`, `destroy`, `dispatch`, `getState`.
  2. Route reducer actions through `reduceTabsAction`.
  3. Call `applyTabsEffects` only after reducer commits or for async actions.
  4. Guard disposed state.
  5. Subscribe to `authoring:entered` and `authoring:exited` if `_KDB.events.subscribe` exists; otherwise stay functional.
  6. On mount, run the fixed sequence in Section F.1: initialize, sync from DOM, hydrate DOM, startup traverse, final DOM sync.
- Catch errors at public boundaries and dispatch `tabs/error`.

### `config/actionTypes.js`

- Role: action type constants.
- Target lines: 30-60.
- Include phase-1 constants:
  - `tabs/initialize`
  - `tabs/syncFromDom`
  - `tabs/hydrateDom`
  - `tabs/traverse`
  - `tabs/add`
  - `tabs/selectEditTarget`
  - `tabs/selectTool`
  - `tabs/rename`
  - `tabs/authoringEntered`
  - `tabs/authoringExited`
  - `tabs/error`
  - `tabs/destroy`
- Include deferred constants only if controller returns `false`, reducer returns unchanged state, and no effect handler exists for them:
  - `tabs/delete`
  - `tabs/duplicate`
  - `tabs/move`
  - `tabs/reorder`

### `config/defaults.js`

- Role: serializable constants.
- Target lines: 40-80.
- Define:
  - `MAX_USER_TABS = 5`
  - `HELPER_TAB_INDEX = 5`
  - `MIN_VISIBLE_USER_TABS = 1`
  - visible class `KDB_visible`
  - user tab button marker `kdb-user-tab-btn`
  - helper tab button marker `kdb-helper-tab-btn`
  - helper tab content marker `kdb-helper-tab`
  - hydrate/traverse polling defaults: `POLL_INTERVAL_MS = 300`, `HYDRATE_TIMEOUT_MS = 30000`, `TRAVERSE_CLICK_DELAY_MS = 150`
- Do not store DOM nodes or functions in exported default state.

### `config/selectors.js`

- Role: DOM selector constants/functions for tabs effects.
- Target lines: 30-70.
- Centralize Cognos tab button/content selector strings and fallback selectors.
- No DOM reads at module load time.

### `state/createInitialTabsState.js`

- Role: initial state factory.
- Target lines: 60-110.
- Return exactly the contract shape from `contracts/tabs.md`, with fresh nested objects each call.
- No `_KDB` reads unless passed existing state for normalization.

### `state/reduceTabsAction.js`

- Role: pure reducer.
- Target lines: 150-220 hard max. If implementation would exceed this, stop and ask for a reducer split spec instead of creating oversized code.
- Must not touch DOM, Cognos, events, history, timers or promises.
- Implement reducer rows in Section F.
- Deferred delete/duplicate/move/reorder must return unchanged state. Do not set `pendingOperation` or deferred status for those actions.

### `state/selectors.js`

- Role: published selectors.
- Target lines: 80-130.
- Export:
  - `readTabsState`
  - `readActiveTabId`
  - `readActiveTabIndex`
  - `readVisibleTabs`
  - `readTabByIndex`
  - `readTabEditTarget`
  - `readTabsForLaunchpad`
  - `readTabsForKdbControl`
- Return cloned/projection data only.
- Required projection shapes:
  - `readTabsForLaunchpad` returns `{ tabId, pageId, index, name, isActive }[]` for visible non-helper tabs.
  - `readTabsForKdbControl` returns `{ visibleTabs, toolboxTabEditLineIndex, selectedTool, canAdd, actions }`.
  - `readTabEditTarget` returns `{ tabIndex, tabId }` or `null`; in phase 1 it normally returns `null` because current kdbControl selects toolbox tools, not physical tab targets.

### `adapters/createCognosTabsAdapter.js`

- Role: local adapter around `_KDB.cognosAPI.tabs`.
- Target lines: 50-90.
- Methods:
  - `getTabsContainers()`
  - `getTabsContent()`
  - `getTabName(tabLike)`
  - `setTabName(tabLike, name)`
- Each method catches host-call errors or lets controller/effects catch them consistently; choose one pattern and document it in code comments.
- Phase-1 decision: adapter lets host-call errors bubble; `applyTabsEffects` / controller catches and dispatches `tabs/error`.
- No business rules.

### `effects/applyTabsEffects.js`

- Role: effects dispatcher.
- Target lines: 80-140.
- Handles side effects for:
  - sync from DOM;
  - hydrate;
  - traverse;
  - add visibility DOM sync;
  - rename Cognos call;
  - authoring visibility DOM sync.
- Must not mutate `_KDB.state.tabs` directly. Confirmed state updates go back through `dispatch`.

### `effects/syncTabsDomFromState.js`

- Role: DOM sync effect.
- Target lines: 80-130.
- Applies `KDB_visible` to Cognos tab buttons according to:
  - authoring active: all physical tab buttons visible;
  - consume mode: only `state.tabs.byIndex[index].visible === true`;
  - helper tab follows authoring-only behavior unless the approved state says otherwise.
- No kdbControl DOM writes.

### `effects/traverseTabs.js`

- Role: traversal effect.
- Target lines: 100-150.
- Wait for tab DOM readiness with bounded polling.
- Traverse user tabs only; skip helper index.
- Restore active tab when done.
- Update state through dispatch actions, not direct writes.
- Store timers/promises only in runtime.

### `events/eventNames.js`

- Role: optional fact event constants.
- Target lines: 20-50.
- Export only facts emitted by tabs if implementation uses them:
  - `tabs:changed`
  - `tabs:renamed`
  - `tabs:traversed`
  - `tabs:error`
- Do not add request events unless contract is updated.

## Section F. Reducer Behavior Table

| Action type | Trigger | Reducer effect |
|---|---|---|
| `tabs/initialize` | `mount()` | Normalize root state, set lifecycle `initializing`. |
| `tabs/syncFromDom` | effect result | Replace `byIndex`, `order`, `visibleOrder`, active fields, helper metadata and `hydration.lastSyncedAt` from sanitized payload. |
| `tabs/hydrateDom` | hydrate start/result | Update `hydration.lifecycle`, `helperDomHydrated`, error fields. |
| `tabs/traverse` | traverse start/result | Update `traversal.lifecycle`, `traversedIndexes`, `lastTraversedAt`, per-tab `isCanvasLoaded`; set root lifecycle `ready` after successful startup traverse. |
| `tabs/add` | kdbControl | Mark next hidden non-helper user tab visible; update visible order and `canAdd` projections. |
| `tabs/selectEditTarget` | kdbControl | Treat payload `tabIndex` as toolbox line index `0..4`; set `toolboxTabEditLineIndex`; set `selectedTool` to `"rename"` for line `0`, otherwise `null`; do not set physical `editTarget`. |
| `tabs/selectTool` | future explicit caller | Accept only `{ tool: "rename" }`; reject deferred tools by leaving state unchanged and returning `false` from controller. |
| `tabs/rename` | effect start/result | Stage pending rename, then commit confirmed name or record error. |
| `tabs/authoringEntered` | authoring fact | Set `isAuthoringView: true`; do not change canonical tab `visible` fields. |
| `tabs/authoringExited` | authoring fact | Set `isAuthoringView: false`; do not change canonical tab `visible` fields. |
| `tabs/delete` | deferred caller | Return unchanged state. Controller returns `false`. |
| `tabs/duplicate` | deferred caller | Return unchanged state. Controller returns `false`. |
| `tabs/move` | deferred caller | Return unchanged state. Controller returns `false`. |
| `tabs/reorder` | deferred caller | Return unchanged state. Controller returns `false`. |
| `tabs/error` | catch boundary | Set lifecycle `error`, `errorCode`, `errorMessage`. |
| `tabs/destroy` | `destroy()` | Set lifecycle `disposed` and clear pending operation. |

### Section F.1 Effect/Reducer Payloads And Mount Sequence

Mount sequence is fixed:

1. Controller dispatches `{ type: "tabs/initialize", payload: { source: "mount" } }`.
2. Controller asks `applyTabsEffects` to read Cognos DOM and dispatches `{ type: "tabs/syncFromDom", payload: syncPayload }`.
3. Controller asks `applyTabsEffects` to hydrate DOM readiness and dispatches `{ type: "tabs/hydrateDom", payload: { phase: "confirmed", helperDomHydrated, errorCode, errorMessage } }`.
4. Controller asks `traverseTabs` to traverse startup user tabs and dispatches `{ type: "tabs/traverse", payload: { phase: "confirmed", traversedIndexes, canvasLoadedByIndex, activeIndex, activeTabId, currentTabId, lastTraversedAt } }`.
5. Controller calls `syncTabsDomFromState` once more to apply consume/authoring visibility.

Required payload shapes:

```js
// tabs/syncFromDom
{
  byIndex: {},
  order: [],
  visibleOrder: [],
  activeIndex: null,
  activeTabId: null,
  currentTabId: null,
  helperTab: {},
  lastSyncedAt: 1710000000000
}

// tabs/hydrateDom
{
  phase: "pending" | "confirmed" | "failed",
  helperDomHydrated: false,
  errorCode: null,
  errorMessage: null
}

// tabs/traverse
{
  phase: "pending" | "confirmed" | "failed",
  traversedIndexes: [],
  canvasLoadedByIndex: {},
  activeIndex: null,
  activeTabId: null,
  currentTabId: null,
  lastTraversedAt: 1710000000000,
  errorCode: null,
  errorMessage: null
}

// tabs/rename
{
  phase: "pending" | "confirmed" | "failed",
  source: "kdbControl",
  tabIndex: null,
  tabId: null,
  name: "New name",
  confirmedName: "New name",
  errorCode: null,
  errorMessage: null
}
```

Rename target resolution:

- if `payload.tabIndex` or `payload.tabId` identifies a visible non-helper user tab, use it;
- otherwise use the current active visible non-helper user tab;
- if no target can be resolved, controller returns `false` and reducer does not stage `pendingOperation`.

## Section G. Integration Changes

After module files exist:

1. Update `_____________KDB3API/KDB3/js/KDB.js` to import/register/mount/destroy `__orchestratorTabs.js` according to the existing feature-module pattern.
2. Exact AMD import change: add `"./dashboard/tabs/__orchestratorTabs.js"` immediately before `"./dashboard/canvas/kdbControl/__orchestratorKdbControl.js"` and add `_orchestratorTabs` at the matching factory-parameter position.
3. Exact registration change: call `_orchestratorTabs(_KDB);` in `registerFeatureModules` immediately before `_orchestratorKdbControl(_KDB);`.
4. Exact mount change: call `_KDB.api.tabs.mount({});` in `mountFeatureModules` immediately before `_KDB.api.kdbControl.mount({});`.
5. Exact destroy-order change: destroy tabs after kdbControl and before launchpad/widget/filter consumers if the existing destroy sequence is explicit; if only generic API destruction exists, add `_KDB.api.tabs` to that list in the corresponding reverse-consumer-safe position.
6. Do not change `.cursor/rules`, templates, authority docs, legacy folders or `TEST/`.

## Section H. Explicitly Forbidden In Phase 1

- No legacy `adjustTabObj` implementation.
- No writeback parameter get/set for tabs.
- No widget deletion, cloning or tab remapping.
- No public `_KDB.services.writeback`.
- No new top-level `_KDB.*` namespace.
- No direct writes by kdbControl/launchpad/filterDock/widgets into `_KDB.state.tabs`.
- No history replay handler for tabs delete/duplicate/move/reorder.
- No `historyService.pushCommittedStep` for any tabs action in phase 1, including rename.
- No persistence/writeback adapter behavior under `_KDB.runtime.tabs.adapters`; only `adapters.cognos` may be populated.
- No harness or test folder unless the user separately approves it.

## Section I. Acceptance Criteria

Before reporting execution complete, the coding subagent must verify:

1. `_KDB.api.tabs` exists with `mount`, `destroy`, `dispatch`, `getState`.
2. `_KDB.state.tabs` is initialized to the contract shape.
3. `_KDB.runtime.tabs` has the documented buckets and cleanup path.
4. kdbControl's existing `tabs/add` and `tabs/selectEditTarget` dispatch calls no longer warn when tabs is mounted.
5. `tabs/selectEditTarget` treats current kdbControl `payload.tabIndex` as toolbox line index, not physical tab index.
6. `getState()` returns kdbControl-safe projections including `toolboxTabEditLineIndex`, `selectedTool`, `canAdd` and the full `actions` shape.
7. Tab-button visibility is driven by `_KDB.state.tabs`, with authoring mode showing all buttons without rewriting canonical visibility.
8. Rename goes through `_KDB.api.tabs.dispatch({ type: "tabs/rename", ... })`, resolves the active visible user tab when no explicit target is provided, and calls `_KDB.cognosAPI.tabs.setTabName` via the adapter.
9. Current kdbControl line `0` selects the rename tool only; no kdbControl UI delta for name entry is required by this phase unless the user separately approves it.
10. Delete, duplicate, move and reorder return `false`, leave state unchanged, and do not write persistence or widgets.
11. No tabs history step is pushed in phase 1.
12. No production file exceeds the line limits in the spec without explicit deviation report.
13. ReadLints reports no new diagnostics in edited files, or deviations are reported.

## Section J. Reporting Template

The executing subagent's final response must include:

1. Pre-flight echo summaries.
2. File checklist with line counts.
3. Integration changes made.
4. Deferred items confirmed untouched.
5. Lint/check result.
6. Deviations or blockers.

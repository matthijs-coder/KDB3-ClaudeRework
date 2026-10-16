# Contract Delta: `tabs` Parameter-Set Restore

> Delta on top of `contracts/tabs.md`, `contracts/tabs-writeback-readiness-contractdelta.md` and `contracts/writeback.md`.
> Synchronized to the main-contract v3 format (`tabs: [{ name, hide? }]`, writeback.md §4.4); the old positional tuple format (`tb`) is removed.

---

**Status:** `Approved`
**Parent contract:** `contracts/tabs.md`
**Consumer:** `writebackSet`
**Type:** `feature module contract delta`
**Authoring AI:** GPT-5.5, 2026-07-08; synchronized by Fable 5, 2026-07-11
**Reviewed by:** PO approved decision points D1-D7, 2026-07-11

---

## 1. Purpose

`writebackSet.restore(v3)` needs stable tab targets before restoring page-context filters and widgets. This delta defines the tabs owner restore/reset/activate/traverse actions for v3 `tabs` and the runtime lookup that downstream restore steps consume.

## 2. v3 Mapping

v3 field (writeback.md §4.4 is authoritative):

```js
tabs: [
  { name: "Tab 1" },
  { name: "Hidden tab", hide: 1 }
]
```

Mapping:

| v3 | Tabs owner state / runtime |
|---|---|
| array index | `tabIdx` = position of the tab within `state.order` filtered to dashboard-role tabs (identical to the GET-side convention in `writeback/get/collectors/collectTabs.js`) |
| `name` | tab name (required when the tab exists) |
| `hide: 1` | hidden dashboard tab |
| `hide` omitted | visible dashboard tab |

v3 never persists `tabId`, `pageId`, `scopeId`, `containerId` or DOM drop targets.

## 3. Public Dispatch

Required action:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetRestoreRequested",
  payload: {
    tabs: v3.tabs,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

Required reset/default action for `status === "newDashboard"`:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetResetRequested",
  payload: {
    source: "writebackSet",
    runId,
    status: "newDashboard",
    skipHistory: true
  }
});
```

Note: `writebackSet` injects `source`, `runId` and `skipHistory: true` into every owner payload through `set/effects/dispatchOwnerPhase.js`; callers do not need to repeat them.

Return contract for both actions:

```js
Promise<{
  ok: boolean,
  tabTargets: {
    [tabIdx: string]: {
      tabId: string,
      pageId: string,
      scopeId?: string,
      visible: boolean
    }
  } | null, // null only on failure/cancellation
  diagnostics: Array<{ code, tabIdx?, message }>
}>
```

### 3.1 `tabTargets` Exposure Without Restore Dispatch

When `v3.tabs` is omitted, `writebackSet` must not call `tabs/parameterSetRestoreRequested`. It reads the current owner tab mapping through `_KDB.api.tabs.getState().tabTargets` (`set/state/readOwnerTargets.resolveTabTargets` fallback).

Interface agreement (PO decision D6):

- `tabTargets` from restore/reset **action results** include `scopeId` (live-derived, see §3.2).
- `tabTargets` from the `getState()` fallback contain `tabId`, `pageId`, `visible` **without** `scopeId`; the selector stays a pure state read.
- Consumers that require `scopeId` (page-context filter owners, Dienststelle) must live-derive it when absent, using the shared `_KDB.cognosAPI.tabs.getTabsContainers()` pattern (reference: `dashboard/filters/dienststelle/effects/hostScope/filterRef.js` (`listDashboardTabScopeIds`)). The singleSelect parameter-set delta must mirror this clause.

### 3.2 `scopeId` Derivation

`scopeId` is a filter/page-context alias for the tab's Cognos layout container id (readiness delta §4.1). It is derived live per restore run as `getTabsContainers()[physicalIndex].id` and never stored in `_KDB.state.tabs`. Derivation failure is non-fatal: the `scopeId` field is omitted with a diagnostic-free degrade, per the optional `scopeId?` contract.

## 4. Restore Semantics

The owner must:

1. validate a numeric `runId`; store it as stale-guard in `_KDB.runtime.tabs.parameterSetRunId` (monotonic, same pattern as `header/actions/handleParameterSetRestore.js`); re-check staleness after every internal `await`;
2. await any in-flight startup/traverse promise under `_KDB.runtime.tabs.pendingPromises` before acting (traverse-conflict rule, see §7). This wait applies to **restore and reset** (T2-5a / `writeback-t2-item5a-contractdelta.md`): after `guardParameterSetRun` and non-mutating validation, before `tabs/parameterSetApply`. Implementation is `guardParameterSetRun.waitForInflightTraversals` (keys `startup` + `traverse` only; inflight rejection swallowed). Invalid restore payload fails fast without waiting. Activate and post-restore traverse already wait; `tabs/resolveFilterScopeTargets` does not;
3. verify readiness: dashboard tab identity (`tabId`) must be hydrated; otherwise fail with `WRITEBACK_TABS_NOT_READY`;
4. ensure physical dashboard tab targets exist for every saved `tabIdx`;
5. restore names and visibility through one atomic owner reducer commit (`tabs/parameterSetApply`, internal action), then push changed names to Cognos through the tabs adapter and re-sync tab DOM from committed state — never direct writeback DOM mutation;
6. enforce at least one visible dashboard tab across the resulting state (saved prefix plus untouched surplus slots);
7. remap `state.activeIndex` to the first visible dashboard tab when the previously active tab becomes hidden by the restore;
8. return the stable `tabIdx -> tabId/pageId/scopeId` lookup for filter and widget restore;
9. avoid history writes (`skipHistory: true` accepted; tabs has no history machinery);
10. avoid persistent visibility changes beyond the requested restored state.

Failure modes:

- saved tab count exceeds physical dashboard slot count: fail with `WRITEBACK_TABS_TARGET_MISSING`; validation happens before commit, so no partial mutation occurs;
- saved tab count lower than physical slot count: apply the saved prefix, leave remaining slots untouched, emit one `WRITEBACK_TABS_SURPLUS_UNTOUCHED` diagnostic per untouched slot (untouched slots still appear in `tabTargets` with their current state);
- every restorable tab hidden: force the first dashboard slot visible and emit `TABS_MIN_VISIBLE_FORCED` (owner-level code, not part of the writeback enum);
- Cognos title write (`setTabName`) failure is non-fatal: committed state/DOM already carry the restored name; a `TABS_RENAME_FAILED` diagnostic is reported per affected tab.

`tabs/parameterSetResetRequested` ignores saved `v3.tabs`, resets names/visibility to owner defaults (see §4.1), enforces at least one visible dashboard tab and returns the same `tabTargets` shape.

### 4.1 Reset Defaults (PO decision D5)

- Default names: baseline names captured **first-wins** at the first successful `tabs/syncFromDom` under `_KDB.runtime.tabs.baselineNamesByIndex` (session-scoped runtime, never persisted). Fallback when no baseline exists: `"Tab " + (physicalIndex + 1)`.
- Default visibility: only the first dashboard slot visible; slots 1-4 hidden.
- Timing assumption: the bootstrap order guarantees that the first `syncFromDom` (mount) runs before the first possible SET. Because capture is first-wins, a writeback restore can never overwrite the baseline.

## 5. Hidden Tabs And Activation

Hidden dashboard tabs are writeback-relevant. The restore action supports hidden dashboard tabs as targets without permanently showing hidden tab buttons.

Before widget restore or page-context writes on a hidden/not-canvas-ready tab, tabs exposes:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetActivateTabRequested",
  payload: {
    tabIdx,
    source: "writebackSet",
    runId,
    skipHistory: true,
    includeHiddenDashboardTabs: true,
    restoreActiveTab: false
  }
});
```

Return contract:

```js
Promise<{
  ok: boolean,
  tabIdx: number,
  canvasReady: boolean,
  diagnostics: Array<{ code, tabIdx?, message }>
}>
```

Required behavior:

- temporarily activate the requested dashboard tab;
- skip the physical click when the slot has `hasBeenActivated === true`: the page DOM/model already exists, so parking, shell claims and page-context writes need no re-activation; the action returns `{ ok: true, canvasReady: true, skippedActivation: true }`. This de-duplicates filter-step and widget-step activations of the same tab and removes the redundant full click-through before the post-restore traverse. `isCanvasLoaded` must NOT be used for this skip: `syncFromDom` sets it for every tab present in the dashboard spec, including never-rendered lazy tabs (bugfix sync 2026-07-13);
- support hidden dashboard tabs when `includeHiddenDashboardTabs === true`;
- do not persistently mutate `_KDB.state.tabs.byIndex[...].visible`;
- do not leave hidden tab buttons visible after activation;
- update tabs-level canvas/lazyload readiness (`isCanvasLoaded`, `hasBeenActivated`) for the activated tab;
- fail with `WRITEBACK_TABS_TARGET_MISSING` if the tab target cannot be activated.

### 5.1 Activation Strategy (PO decision D2)

Primary path: programmatic click on the (possibly hidden) tab button through the existing `tabs/traverse` effect with `scope: "singleTab"`, `includeHiddenDashboardTabs: true`, `restoreActiveTab: false`. This reuses the production traverse pattern including the defensive `syncTabsDomFromState` re-hide after hidden-tab visits.

Documented fallback (not implemented, only if Cognos verification shows clicks on `display:none` buttons are ignored): temporary DOM-only `KDB_visible` class toggle → click → revert, with refs/timers under `_KDB.runtime.tabs` and cleanup; never a persistent `state.byIndex[...].visible` mutation.

Side effects, explicitly accepted: each activation overwrites `state.traversal` (scope/source/traversedIndexes) and sets per-tab readiness fields; this is owner-internal readiness bookkeeping, not persisted visibility.

### 5.2 `canvasReady` Semantics (inner-frame; T2-5c superseded)

`waitFor: "canvas"` on `tabs/traverse` still means: the tab button was clicked
and `TRAVERSE_CLICK_DELAY_MS` (150ms) elapsed. PDF, GET collectors, and tab
mutation keep that optimistic traverse. There is still no observation inside
traverse that Cognos finished rendering widgets.

`tabs/parameterSetActivateTabRequested` (SET steps 18/23): skip if that tab's
inner frame is already in the DOM (`hasTabInnerFrame`); else traverse
`waitFor: "canvas"` (click + 150ms) then `waitForTabInnerFrame` (tab-scoped).
Success → `{ ok: true, canvasReady: true }`. Frame timeout →
`{ ok: false, canvasReady: false }` plus `WRITEBACK_TABS_TARGET_MISSING`
(SET abort). Do not call `awaitCanvasReady` / `whenCanvasReady` /
`getCanvasWhenReady`. Authority:
`tabs-inner-frame-skip-empty-snapshot-contractdelta.md`. The T2-5c delta
(`writeback-t2-item5c-contractdelta.md`) is Superseded 2026-08-30. Do not
recreate `awaitCanvasReady.js` from this Approved parent. `writebackSet`
still consumes only `ok`.

`waitFor: "widgetsRendered"` is supported since 2026-07-13 (supersedes PO decision D4; PO approval same day): the widgets-owned public readiness API now exists as `widgetBase/renderTabWidgetsRequested`. Per traversed tab, after click + `TRAVERSE_CLICK_DELAY_MS`, the traverse awaits that API, which renders the tab's onCanvas vis widgets (`renderWidget` + bounded `whenRenderComplete`, 2.5s cap per widget, parallel per tab — legacy `traverseTabsSafely` parity). Render failures are degraded (warn + continue), never traversal aborts. `parameterSetActivateTabRequested` keeps using `waitFor: "canvas"` plus inner-frame wait; it does **not** switch to `widgetsRendered`.

## 6. Post-Restore Traversal

Required action:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/postParameterSetRestoreTraverseRequested",
  payload: {
    scope: "visibleDashboard",
    includeHiddenDashboardTabs: false,
    restoreActiveTab: true,
    source: "writebackSet",
    runId
  }
});
```

Return contract:

```js
Promise<{
  ok: boolean,
  traversedTabIdxs: number[],
  diagnostics: Array<{ code, message }>
}>
```

`writebackSet` consumes only `ok` (`required: false` phase); the rest is owner-informative.

Allowed `scope` values:

- `"visibleDashboard"`: default for writeback SET. Dashboard-role tabs with `visible === true` after `parameterSetApply` (snapshot without `hide: 1`, plus surplus host slots still visible). Hidden host slots are not clicked.
- `"allDashboardInV3"`: legacy SET alias. Implementation maps it to `visibleDashboard`. It is not “all host dashboard slots including hidden”.

`restoreActiveTab: true` with `restoreTabIndex` (bugfix sync 2026-07-13): the post-restore traversal lands on the **first visible dashboard tab** (legacy parity) via the traverse option `restoreTabIndex`. The natively captured `activeIndex` is not a meaningful user tab at this point — `observeActiveTab` mirrors the DOM, so by traversal start it points at the last restore-activated tab from step 23. Generic (non-restore) traversals without `restoreTabIndex` keep the native capture-and-restore behavior.

The post-restore traversal runs with `waitFor: "widgetsRendered"` (§5.2) and is the render trigger that makes step-27 bindings visible on visible dashboard tabs; it is not a widget settings restore mechanism.

Final landing emit (bugfix sync 2026-07-13): after a successful post-restore traverse, the action emits one `tabs:changed` event for the landing tab (`source: "postRestoreTraverse"`, `firstActivation: false`). Rationale: the traverse commit writes `activeIndex` before the debounced active-tab observer runs, so the observer no-ops and never emits for the landing tab, while subscribers such as kdbControl suppress or miss in-flight traversal events. This is the only `tabs:changed` emitter besides `observeActiveTab`.

### 6.1 Abort landing (T2-5b)

Success landing stays §6 (first visible). On writeback SET `cancelled` /
`failed` / live `abortedByOwner`, tabs exposes:

```js
_KDB.api.tabs.dispatch({
  type: "tabs/parameterSetAbortLandingRequested",
  payload: {
    originalActive: { index, tabId },
    didActivate: boolean,
    source: "writebackSet",
    runId,
    skipHistory: true
  }
});
```

`index` is the physical dashboard slot captured **before** this run’s
`parameterSetApply`. If that slot is still visible, land there. If it is
hidden or missing, land on the first visible dashboard slot and force the
click. Reuse `ensureSlotReadyForMutation.restoreOriginalActiveTab` after
that resolve. Await in-flight startup/traverse first (same helper as §4
item 2). `parameterSetActivateTabRequested` must **not** be used (skip on
`hasBeenActivated`). Router must name this type explicitly;
`routeParameterSetAction` defaults unknown types to §6 post-restore traverse.

Best-effort: `{ ok: false }` does not fail the SET. writebackSet must not
call this through `dispatchOwnerPhase` on a cancelled run.

## 7. Failure Modes

| Condition | Behavior |
|---|---|
| non-numeric `runId` | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| stale `runId` (also after any internal `await`) | cancel with `WRITEBACK_RESTORE_CANCELLED` |
| tabs state not hydrated (no dashboard tab identity) | fail with `WRITEBACK_TABS_NOT_READY` |
| missing target tab / saved count > slots | fail with `WRITEBACK_TABS_TARGET_MISSING` |
| saved count < slots | apply prefix, `WRITEBACK_TABS_SURPLUS_UNTOUCHED` per untouched slot |
| no visible tab after restore | force first restorable dashboard tab visible, `TABS_MIN_VISIBLE_FORCED` diagnostic; fail only when no restorable dashboard tab exists |
| traversal timeout/failure | `WRITEBACK_TABS_TRAVERSAL_FAILED` diagnostic; `writebackSet` decides whether final restore is degraded |
| concurrent conflicting traverse remains after awaiting in-flight promises | honest `ok: false` with the underlying `TABS_TRAVERSE_CONFLICT` code in the diagnostic message |
| controller disposed | `Promise.resolve({ ok: false, diagnostics: [WRITEBACK_RESTORE_CANCELLED] })` for all `parameterSet*` types |

## 8. Explicitly Deferred

- Global `waitFor: "canvas"` honesty (PDF/GET/mutation still click + 150ms). Activate SET path is inner-frame (closed). Do not re-open T2-5c (`getCanvasWhenReady` / `awaitCanvasReady.js`) from this parent.
- ~~Per-widget `getWidgetWhenReady`~~ (retired 2026-10-06 by `tabs-parameterSetActivate-liveWidgetsReady-contractdelta.md`) + `whenRenderComplete` on activate (paint stays step 28 `widgetsRendered`).
- Page-context poll + missingShells re-ensure is letter **B** (`writeback-restore-missingShells-contractdelta.md`). **C** stays deferred: global `waitFor: "canvas"` honesty and per-widget activate paint.
- `tabs/waitUntilTraversed` / `tabs/retraverse` (reserved names, readiness delta §5/§7).
- History integration for tabs (`skipHistory` acceptance is sufficient).
- Tab create/delete/duplicate/move/reorder (restore operates on the fixed 5 dashboard slots).
- Temporary-visibility class-toggle fallback for hidden activation (§5.1; build only if Cognos verification requires it).

## 9. Acceptance

- `tabTargets` is available before filter/page-context restore, both from restore/reset results and from `getState().tabTargets` when `v3.tabs` is omitted.
- The `tabIdx` convention matches the GET side (`collectTabs.js`) exactly: position within `state.order` filtered to dashboard-role tabs.
- Names and visibility restore through tabs owner dispatch/effects in one atomic commit.
- Hidden tabs remain hidden after restore unless v3 marks them visible; no `KDB_visible` residue on hidden buttons after activation/traversal.
- At least one dashboard tab is visible after restore; if v3 hides every tab, the first restorable dashboard tab becomes visible with a `TABS_MIN_VISIBLE_FORCED` diagnostic.
- Post-restore traversal lands on the first visible dashboard tab via `restoreTabIndex` (§6, legacy parity); generic traversals without `restoreTabIndex` restore the previously active tab.
- No Cognos/widget/scope IDs or DOM refs are persisted in `_KDB.state.tabs`; `scopeId` is live-derived per run.
- All `parameterSet*` handlers return structured `{ ok, ..., diagnostics }` promises; no silent failures.

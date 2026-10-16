# Contract Delta: `tabs` Activation Event

> Delta on top of `contracts/tabs.md` and `contracts/tabs-writeback-readiness-contractdelta.md`.
> Contract-only: no production code is approved by this document.

---

**Status:** `Approved (PO vastenburg), 2026-07-11 — implemented same day`
**Parent contract:** `contracts/tabs.md`
**Consumers:** `widgetBase` (lazy launchpad routing), `kdbControl` (tab-follow)
**Type:** `feature module contract delta`
**Authoring AI:** Fable 5, 2026-07-11
**Reviewed by:** `<pending>`

---

## 1. Purpose

Two consumers need to know when the active dashboard tab changes, including manual Cognos tab-button clicks that currently bypass all KDB state:

1. `widgetBase` must route a lazily loaded tab's pre-existing widgets to the launchpad on the tab's **first activation** (legacy replaced startup `traverseAllTabs` + `moveWidgetsToHideSpot`; KDB3 has no startup all-tab iteration, so routing becomes lazy).
2. `kdbControl` must move its control shell along with the active tab.

Today `_KDB.state.tabs.activeIndex` is only updated by `syncFromDom` and tabs-owned traverse effects; a manual user click on a Cognos tab button is invisible to KDB (`applyTabsEffects.js` reads `aria-selected` only during sync). The reserved event name `tabs:changed` (`tabs/events/eventNames.js:5`) is never emitted.

## 2. Activation Detection

Tabs must observe activation changes from **every** source:

- manual user click on a Cognos tab button;
- tabs-owned traverse (`tabs/traverse`, startup background traverse);
- writeback restore activations (`tabs/parameterSetActivateTabRequested`, post-restore traverse).

Detection mechanism: a `MutationObserver` on the Cognos tab list watching the `aria-selected` attribute (selector registry: `config/selectors.js` `activeSelectedAttribute`), owned by tabs:

- observer handle under `_KDB.runtime.tabs.observers.activeTabObserver`, disconnected in `destroy`;
- observer callbacks are coalesced: **120ms** trailing debounce while `_KDB.runtime.tabs.pendingPromises.traverse || .startup || .tabMutation` (traverse clicks at a ~150ms cadence); **0ms** otherwise (a newer mutation still resets the timer). One commit+emit per settled activation change;
- the observer never mutates DOM; it only reads the newly selected tab index.

Click-ahead (2026-09-04, `contracts/tabs-kdbControl-clickAhead-follow-contractdelta.md`): tabs also binds a capture `click` on the tab list and emits `tabs:activationStarted` **without** a state commit, so kdbControl can move the host before Cognos hides the previous page. `tabs:changed` remains the confirmation fact after §3.

## 3. State Commit

On a detected activation change, tabs commits one internal reducer action (working name `tabs/activeTabObserved`, pure reducer branch in a new file per `projectStructureRules.md`):

- `activeIndex`, `activeTabId`, `currentTabId` updated;
- `byIndex[*].isActive` remapped;
- `byIndex[newIndex].hasBeenActivated = true` with `activatedAt` / `activatedBy` when not already set;
- **no** visibility mutation, no traversal-state overwrite.

`firstActivation` is defined as: `hasBeenActivated !== true` at commit time for the newly active tab. The startup tab counts as activated from the first successful `syncFromDom` (it is the initially selected tab), so it never reports `firstActivation: true`.

## 4. Fact Event `tabs:changed`

Emitted immediately **after** the state commit of §3 (confirmation point per `events.mdc`), catalog entry in `architecture/eventSubscribe.md`:

```js
_KDB.events.emit("tabs:changed", {
  tabIndex: number,          // physical Cognos index 0-4
  tabIdx: number | null,     // writeback tabIdx (dashboard-order position), null for non-dashboard tabs
  tabId: string | null,
  pageId: string | null,
  firstActivation: boolean,
  source: string             // "user" | "mount" | "api" | "writebackSet" | ... (best-effort attribution)
});
```

Rules:

- `source` is **diagnostic only**; no consumer may branch behavior on it (the writeback race is solved by consumer-side idempotency, see `widgetBase-lazyLaunchpadRouting-contractdelta.md` — tabs stays writeback-agnostic);
- the event is emitted for hidden-tab activations too (writeback temporarily activates hidden tabs);
- no event is emitted when the observed selection equals the committed `activeIndex` (no-op change);
- payload is JSON-serialisable, no DOM refs;
- restore-only second emitter: `tabs/actions/postParameterSetRestoreTraverse.js` emits one final `tabs:changed` for the landing tab after a successful post-restore traverse (`source: "postRestoreTraverse"`), because the traverse commit writes `activeIndex` before the debounced observer runs and the observer therefore no-ops (bugfix sync 2026-07-13; see `tabs-parameterSetRestore-contractdelta.md` §6).

## 5. Explicitly Out Of Scope

- No history integration; activation changes never push history steps.
- No changes to `tabs/traverse` semantics or the parameterSet dispatch surface.
- `tabs:renamed` / `tabs:traversed` remain reserved, unemitted names.

## 6. Acceptance

1. Manual click on a visible tab button updates `state.tabs.activeIndex` and emits exactly one `tabs:changed`.
2. First-ever activation of a tab reports `firstActivation: true`; subsequent activations report `false`.
3. Startup/traverse/writeback activations emit the same event shape; hidden-tab activations included.
4. Observer is disconnected on `destroy`; no leaked runtime handles. Capture click AbortController `tabListClick` is aborted on `destroy`.
5. Catalog entry exists in `eventSubscribe.md` with both subscribers before code lands.
6. Manual click on a different dashboard tab emits `tabs:activationStarted` (pageId set) before `tabs:changed`. Same-tab and edit-icon clicks do not emit it.

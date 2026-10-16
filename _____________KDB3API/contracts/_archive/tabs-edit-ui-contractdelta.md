# Contract Delta: `tabs` Edit UI

> Delta on top of `contracts/tabs.md` for tab edit controls, inline rename, and edit-icon presentation.
> This delta does not approve delete, duplicate, move/reorder persistence or widget remapping.

---

**Status:** `Draft`
**Parent contract:** `_____________KDB3API/contracts/tabs.md`
**Owner module / service:** `tabs`
**Type:** `feature module delta`
**Authoring AI:** GPT-5.5, 2026-06-18
**Reviewed by:** `<pending>`

---

## 1. Purpose

This tranche adds the missing UI behavior around tab editing:

- kdbControl tab-edit radio visibility follows the tabs owner state, similar to tab-button visibility;
- selecting a tab-edit radio starts a tabs-owned inline rename session on the matching visible dashboard tab;
- edit icons for delete, duplicate and move may be shown on the active tab wrapper for visual parity;
- only rename is executable in this tranche.

The intent is to make the current kdbControl tab edit controls meaningful without crossing the deferred writeback boundary.

## 2. Scope

In scope:

- expose a kdbControl-safe projection for tab-edit toolbox visibility;
- hide/show kdbControl tab-edit radios based on visible dashboard tabs;
- make the selected visible dashboard tab label editable when its radio is selected;
- commit rename through existing `tabs/rename`;
- clean up edit state, listeners and icons after commit/cancel/dispose;
- show non-functional icon affordances for delete, duplicate and move on the active tab wrapper;
- keep deferred tools disabled/no-op.

Out of scope:

- delete tab behavior;
- duplicate tab behavior;
- move/reorder behavior;
- widget deletion/cloning/remapping;
- writeback parameter get/set;
- history steps or replay;
- new generic writeback service;
- new top-level `_KDB.*` namespaces.

## 3. Ownership

`tabs` owns the edit-mode truth and Cognos tab-button edit presentation.

`kdbControl` owns only its control shell and radio DOM. It may hide/show/disable its tab-edit controls from `_KDB.api.tabs.getState()` projections, but it must not decide tab business rules or mutate Cognos tab DOM.

`tabs` owns:

- active edit tool (`selectedTool`);
- selected physical dashboard tab index for the toolbox (`toolboxTabEditLineIndex`, retained for compatibility);
- inline rename session runtime;
- edit icon placement/removal on Cognos tab wrappers;
- rename commit through `_KDB.api.tabs.dispatch({ type: "tabs/rename", ... })`.

## 4. State Contract

Extend `_KDB.state.tabs` with a serializable `editUi` subtree:

```js
_KDB.state.tabs.editUi = {
  toolboxVisible: false,
  activeTool: null,
  sessionTabIndex: null,
  sessionTabId: null,
  isEditingLabel: false,
  errorCode: null,
  errorMessage: null
};
```

Rules:

- `toolboxVisible` is `true` when there is at least one visible dashboard tab that can be edited.
- `activeTool` is `"rename"` only in this tranche; deferred tools remain unavailable.
- `sessionTabIndex` / `sessionTabId` identify the tab currently in an inline rename session, or `null`.
- `sessionTabId` is not the same field as root `activeTabId`; root `activeTabId` remains the active dashboard tab identity.
- Runtime edit listeners, DOM refs, original label text and icon refs do not live in `_KDB.state.tabs`.

## 5. Runtime Contract

Extend `_KDB.runtime.tabs` with:

```js
_KDB.runtime.tabs.editSession = {
  tabIndex: null,
  tabId: null,
  labelEl: null,
  wrapperEl: null,
  originalName: null,
  listeners: {},
  iconRefs: {}
};
```

Cleanup obligations:

- remove `contenteditable`;
- remove edit listeners;
- remove edit icons inserted by tabs;
- clear `editSession`;
- never remove Cognos-owned tab DOM.

## 6. kdbControl Projection

`_KDB.api.tabs.getState()` / `readTabsForKdbControl` must include:

```js
{
  editUi: {
    toolboxVisible: false,
    activeTool: null,
    sessionTabIndex: null,
    sessionTabId: null,
    isEditingLabel: false
  },
  actions: {
    rename: { enabled: true, reason: null },
    delete: { enabled: false, reason: "deferred" },
    duplicate: { enabled: false, reason: "deferred" },
    move: { enabled: false, reason: "deferred" },
    reorder: { enabled: false, reason: "deferred" }
  }
}
```

kdbControl must:

- hide the `.kdb-control_tab-edit-area` when `editUi.toolboxVisible !== true`;
- show it when `editUi.toolboxVisible === true`;
- show only radio buttons whose `data-tab-index` maps to a visible dashboard tab;
- hide radio buttons for hidden tabs and non-dashboard/helper tabs completely, not merely disabled;
- continue to dispatch only through `_KDB.api.tabs.dispatch(...)`.

Visibility rule:

- On cold start with one visible dashboard tab, the edit toolbox may be visible for rename.
- If no editable dashboard tab exists, the edit toolbox is hidden.
- Adding a dashboard tab must refresh the projection and kdbControl view.

## 7. Action Contract

`tabs/selectEditTarget` uses physical dashboard tab semantics:

- `payload.tabIndex` is the physical 0-based dashboard tab index from the radio's `data-tab-index`;
- selecting radio index `n` starts inline rename/edit UI for dashboard tab index `n`;
- hidden tabs and non-dashboard/helper tabs must not have visible radios and must not start edit sessions.

New/reused reducer effects:

| Action | Behavior |
|---|---|
| `tabs/selectEditTarget` visible dashboard tab `n` | Set `toolboxTabEditLineIndex: n`, `selectedTool: "rename"`, set `editUi.activeTool: "rename"`, set `sessionTabIndex/sessionTabId` for tab `n`, start inline rename session effect. |
| `tabs/selectEditTarget` hidden/non-dashboard tab | Clear/leave edit session fields, do not start edit session, return `false` where practical. |
| `tabs/rename` pending/confirmed/failed | Existing rename flow; confirmed/failed clears active edit session state after DOM cleanup. |
| `tabs/cancelEditSession` | Required internal action for this tranche; clears `editUi` session fields without rename commit. |

If the selected tab cannot be resolved as a visible dashboard tab, `tabs/selectEditTarget` must not start an edit session and should leave `actions.rename.enabled` false.

## 8. Inline Rename Session

When rename edit starts:

1. Resolve target tab:
   - use `payload.tabIndex` / `editUi.sessionTabIndex` as the selected physical dashboard tab;
   - fallback to active visible dashboard tab only for direct `tabs/rename` calls without a selected edit session.
2. Resolve Cognos tab wrapper through tabs selector config:
   - wrapper is selected by `tabWrapperSelector`;
   - wrapper contains a child selected by `tabButtonItemSelector`;
   - `data-index` is 0-based and matches `_KDB.config.tabs` keys.
3. Resolve editable label node through tabs selector config.
4. Store runtime session data.
5. Set label `contenteditable="true"`.
6. Focus label and place caret at end.
7. Insert edit icons into the wrapper.

Commit:

- `focusout` commits if text changed and non-empty;
- `Enter` commits and prevents newline if safely supported;
- `Escape` cancels and restores original text;
- confirmed commit dispatches `tabs/rename` with `{ source: "tabEditUi", tabIndex, tabId, name }`;
- empty names are rejected and original name restored.

After commit/cancel:

- remove `contenteditable`;
- remove listeners;
- remove edit icons;
- clear runtime session;
- clear `editUi.isEditingLabel`.

## 9. Edit Icons

Icon presentation is in scope. Icon behavior is not.

Allowed:

- append/remove three tabs-owned icon buttons/elements for delete, duplicate and move on the active tab wrapper;
- place icons under the configured `tabEditIconHostSelector` inside that wrapper;
- mark them with tabs-owned classes/data attributes;
- optionally set `aria-disabled="true"` and title/reason `"deferred"`;
- clicking them returns false/no-op and may warn once.

Forbidden:

- modals;
- writeback;
- widget operations;
- changing tab visibility/order;
- dispatching delete/duplicate/move/reorder as executable behavior.

Selectors/classes for icon placement must be centralized in `tabs/config/selectors.js` and `tabs/config/defaults.js` according to existing selector discipline.

## 9.1 kdbControl Read-View Resync

This tranche must refresh kdbControl after tabs-owned updates that affect the tab-edit toolbox:

- `tabs/syncFromDom`;
- `tabs/add`;
- `tabs/selectEditTarget`;
- `tabs/rename` confirmed/failed;
- `tabs/cancelEditSession`;
- `tabs/authoringEntered` / `tabs/authoringExited`.

Preferred path: a tiny tabs effect `syncTabsKdbControlReadView` calls an existing public kdbControl read-sync/mount-safe method if one exists on `_KDB.api.kdbControl`.

If no public kdbControl sync method exists, this tranche may add a narrow public `syncView()` method to `_KDB.api.kdbControl` only if it delegates to existing kdbControl view-sync code and does not mutate kdbControl business state. Do not use private deep imports from tabs into kdbControl internals.

No request event is approved for this resync.

## 10. Events

No new request events are approved in this tranche.

Optional fact event:

- `tabs:renamed` may be emitted only after confirmed rename if the implementation already has a safe event bus path.

If adding this fact event would enlarge scope, omit it.

## 11. Acceptance Criteria

1. Cold start hides non-dashboard/helper tab buttons and shows tab-edit toolbox only when an editable dashboard tab exists.
2. Cold start shows edit radios only for visible dashboard tabs.
3. `tabs/add` makes the next dashboard tab visible and refreshes tab-edit radio visibility.
4. Selecting kdbControl radio with `data-tab-index="n"` starts inline rename on dashboard tab index `n`.
5. The selected tab label is editable and commits through `tabs/rename`.
6. Delete/duplicate/move icons may appear but are disabled/no-op and do not touch writeback/widgets/history.
7. All Cognos selectors/attributes remain centralized in tabs config.
8. Cleanup on blur/cancel/destroy leaves no contenteditable labels, duplicate icons or dangling listeners.

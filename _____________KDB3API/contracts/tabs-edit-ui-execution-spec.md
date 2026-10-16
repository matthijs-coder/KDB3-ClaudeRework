# Execution Spec: `tabs` Edit UI Delta

> Implementation spec for `contracts/tabs-edit-ui-contractdelta.md`.
> Executing subagent must implement tab edit-radio visibility, inline rename session for the selected tab, and edit-icon presentation only.

---

**Status:** `Draft`
**Module / contract:** `_____________KDB3API/contracts/tabs.md`
**Delta:** `_____________KDB3API/contracts/tabs-edit-ui-contractdelta.md`
**Phase:** `edit UI + inline rename`
**Authoring AI:** GPT-5.5, 2026-06-18
**Executing AI:** `composer 2.5 subagent`
**Reviewer:** `<review subagent + user>`

---

## Section A. Pre-flight Read List

Read in order before editing:

1. `_____________KDB3API/architecture/stateOwnership.md`
2. `_____________KDB3API/architecture/projectStructureRules.md`
3. `_____________KDB3API/contracts/tabs.md`
4. `_____________KDB3API/contracts/tabs-edit-ui-contractdelta.md`
5. This execution spec
6. `_____________KDB3API/KDB3/js/dashboard/tabs/config/selectors.js`
7. `_____________KDB3API/KDB3/js/dashboard/tabs/config/defaults.js`
8. `_____________KDB3API/KDB3/js/dashboard/tabs/createTabsController.js`
9. `_____________KDB3API/KDB3/js/dashboard/tabs/state/reduceTabsAction.js`
10. `_____________KDB3API/KDB3/js/dashboard/tabs/state/selectors.js`
11. `_____________KDB3API/KDB3/js/dashboard/tabs/effects/applyTabsEffects.js`
12. `_____________KDB3API/KDB3/js/dashboard/tabs/effects/syncTabsDomFromState.js`
13. `_____________KDB3API/KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkViewFromState.js`

Do not read legacy folders during implementation. Legacy evidence is already summarized in the contract delta.

## Section B. Files To Modify/Create

Modify:

```txt
KDB3/js/dashboard/tabs/config/actionTypes.js
KDB3/js/dashboard/tabs/config/defaults.js
KDB3/js/dashboard/tabs/config/selectors.js
KDB3/js/dashboard/tabs/createTabsController.js
KDB3/js/dashboard/tabs/state/createInitialTabsState.js
KDB3/js/dashboard/tabs/state/reduceTabsAction.js
KDB3/js/dashboard/tabs/state/selectors.js
KDB3/js/dashboard/tabs/effects/applyTabsEffects.js
KDB3/js/dashboard/tabs/effects/syncTabsDomFromState.js
KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkViewFromState.js
```

Create only if needed:

```txt
KDB3/js/dashboard/tabs/effects/bindTabRenameEditSession.js
KDB3/js/dashboard/tabs/effects/renderTabEditIcons.js
```

No changes to `KDB.js` are expected for this tranche.

## Section C. State Changes

Extend initial state with:

```js
editUi: {
  toolboxVisible: false,
  activeTool: null,
  sessionTabIndex: null,
  sessionTabId: null,
  isEditingLabel: false,
  errorCode: null,
  errorMessage: null
}
```

Reducer behavior:

| Action | Reducer behavior |
|---|---|
| `tabs/syncFromDom` | Recompute `editUi.toolboxVisible` from visible dashboard tabs and rename target availability. |
| `tabs/add` | Recompute `editUi.toolboxVisible`; do not start edit session. |
| `tabs/selectEditTarget` visible dashboard tab `n` | Treat `payload.tabIndex` as physical dashboard tab index. Set `toolboxTabEditLineIndex: n`, `selectedTool: "rename"`, `editUi.activeTool: "rename"`, `editUi.sessionTabIndex/sessionTabId`, `editUi.isEditingLabel: true` only if tab `n` is visible and dashboard-role. |
| `tabs/selectEditTarget` hidden/non-dashboard tab | Clear/leave active edit UI session fields; do not start edit session. |
| `tabs/rename` confirmed/failed | Clear `editUi.activeTool`, `sessionTabIndex`, `sessionTabId`, `isEditingLabel`; keep toolbox visible if an editable tab remains. |
| `tabs/cancelEditSession` | Clear edit session fields without changing tab name. |
| `tabs/destroy` | Clear edit UI fields. |

`tabs/cancelEditSession` is required for this tranche; add it to `config/actionTypes.js`.

## Section D. Selectors And Projections

`readTabsForKdbControl` and `getState()` must include:

```js
editUi: {
  toolboxVisible,
  activeTool,
  sessionTabIndex,
  sessionTabId,
  isEditingLabel
}
```

Add helper logic:

- `canShowEditToolbox(state)` is true when at least one visible dashboard tab with `tabId` exists.
- `actions.rename.enabled` must use the same target resolver as the controller/edit session.
- Add `editUi.visibleEditTabs` or equivalent projection if useful: ordered visible dashboard tabs that should have edit radios visible.
- Deferred actions remain disabled with `reason: "deferred"`.

## Section E. kdbControl Visibility Sync

Update `syncFrameworkViewFromState.js` only in its read-sync path.

Rules:

- Read `_KDB.api.tabs.getState()`.
- Locate `.kdb-control_tab-edit-area`.
- Toggle a hidden class or inline `hidden`/style so the entire area is hidden when `st.editUi.toolboxVisible !== true`.
- When visible, show only radio labels whose input `data-tab-index` maps to a visible dashboard tab from tabs projection.
- Hide radio labels for hidden tabs and non-dashboard/helper tabs completely; do not merely disable them.
- Keep existing radio checked-state sync from `toolboxTabEditLineIndex`.
- Do not treat radio index `0..4` as tool lines; it is physical dashboard tab index.

kdbControl must not mutate tabs state directly and must not touch Cognos tab DOM.

If `_KDB.api.kdbControl` does not currently expose a public read-sync method, add a narrow `syncView()` method to the kdbControl API in this tranche. It must delegate to existing kdbControl framework view-sync logic, must be safe before/after mount, and must not write tabs state.

## Section F. Selector Config

All Cognos selectors/attributes used for edit UI must live in `tabs/config/selectors.js`.

Add if missing:

```js
tabWrapperSelector: ".ba-common-tabList__tooltip",
tabButtonItemSelector: ".ba-common-tabList__item[role='tab'][data-index]",
tabLabelSelector: ".ba-common-tabList__labelText, .ba-common-tabList__label, [data-tid='ba-common-truncated-text__text-node']",
tabEditIconHostSelector: ".ba-common-tabList__label__container",
tabIndexAttribute: "data-index"
```

All KDB-owned classes/data attributes live in `tabs/config/defaults.js`, for example:

```js
EDIT_ICON_CLASS: "kdb-tab-edit-icon",
EDIT_ICON_DELETE_CLASS: "kdb-tab-edit-icon--delete",
EDIT_ICON_DUPLICATE_CLASS: "kdb-tab-edit-icon--duplicate",
EDIT_ICON_MOVE_CLASS: "kdb-tab-edit-icon--move",
EDITING_LABEL_CLASS: "kdb-tab-label-editing"
```

Do not hardcode Cognos selector strings in effects.

## Section G. Inline Rename Effect

Implement a tabs-owned effect for `tabs/selectEditTarget` when a visible dashboard tab radio is selected.

Steps:

1. Resolve selected visible dashboard tab from `payload.tabIndex` / `editUi.sessionTabIndex`.
2. Resolve real tab wrapper by matching `data-index`.
3. Resolve label node from `tabLabelSelector`.
4. Store runtime `editSession`.
5. Set `contenteditable="true"`.
6. Add `EDITING_LABEL_CLASS`.
7. Focus and place caret at end.
8. Render edit icons.
9. Bind listeners:
   - `focusout`: commit if not already committing/cancelled;
   - `keydown Enter`: prevent default and commit;
   - `keydown Escape`: prevent default and cancel.

Commit:

- read trimmed label text;
- if empty, restore original and cancel;
- if unchanged, cancel;
- otherwise dispatch `tabs/rename` with `{ source: "tabEditUi", tabIndex, tabId, name }`.

Cancel:

- restore original text;
- remove contenteditable/listeners/icons;
- dispatch `tabs/cancelEditSession` if action was added.

Destroy/cleanup:

- no duplicate icon sets;
- no dangling listeners;
- no stale `contenteditable`.

## Section H. Edit Icons

Render three disabled/no-op icons on the active tab wrapper:

- delete;
- duplicate;
- move.

They must:

- use KDB-owned classes/data attributes;
- be removable by tabs cleanup;
- set `aria-disabled="true"` and title/reason `"deferred"`;
- on click prevent default/stop propagation and return false;
- not dispatch executable delete/duplicate/move/reorder behavior.

Do not introduce modals.

## Section I. Effects Wiring

Update `applyTabsEffects.js`:

- after `tabs/selectEditTarget` with a valid visible dashboard tab, start rename edit session for that selected tab;
- after `tabs/selectEditTarget` with hidden/non-dashboard/invalid tab, cleanup any edit session and do not start a new one;
- after `tabs/syncFromDom`, `tabs/add`, `tabs/selectEditTarget`, `tabs/rename`, `tabs/cancelEditSession`, `tabs/authoringEntered`, `tabs/authoringExited`, sync kdbControl read view;
- after rename confirmed/failed, cleanup edit session.

Add `tabs/effects/syncTabsKdbControlReadView.js` or an equivalent small local helper:

- find `_KDB.api.kdbControl` only at controller/effect boundary;
- call public `_KDB.api.kdbControl.syncView()` if available;
- if unavailable, no-op and return `false`;
- do not deep-import kdbControl internals from tabs.

If this tranche adds `_KDB.api.kdbControl.syncView()`, document it in the implementation report and keep it as a read-sync method only.

## Section J. Forbidden

Do not implement:

- delete;
- duplicate;
- move/reorder;
- writeback;
- widget deletion/cloning/remapping;
- history steps/replay;
- persistence adapter;
- new top-level `_KDB.*`;
- legacy jQuery modal behavior.

Delete/duplicate/move/reorder remain unavailable; edit-radio indices `1..4` are physical tab indices and may start rename if those tabs are visible dashboard tabs.

## Section K. Validation

Run:

- `ReadLints` on changed files;
- `node --check` on changed JS files;
- targeted search for hardcoded Cognos selectors in tabs effects;
- targeted search for forbidden words/paths: `adjustTabObj`, `WBParameter`, `pushCommittedStep`, `deleteWidget`, `clone`, `remap`.

Manual Cognos retest:

1. Cold start: tab-edit toolbox visibility matches visible dashboard tabs.
2. Cold start: only edit radios for visible dashboard tabs are shown.
3. `tabs/add`: next tab button and matching edit radio become visible.
4. Select radio with `data-tab-index="n"`: tab button/index `n` label becomes editable and focused.
5. Rename commit via blur/Enter updates Cognos tab name through `tabs/rename`.
6. Escape cancels and restores original text.
7. Icons appear during edit session but are disabled/no-op.
8. Hidden/non-dashboard/helper tabs have no visible edit radio.
9. Destroy/remount leaves no duplicate icons/listeners.

## Section L. Reporting

Final report must include:

- files changed/created;
- behavior implemented;
- checks;
- forbidden scope confirmation;
- manual retest steps;
- deviations/blockers.

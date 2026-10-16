# Module Contract: `widgetSettings` — STUB

> STUB outline expanding toward full contract per `feature-structure.mdc`. Rationale: `architecture/_archive/widgets-domain-blueprint.md` §7. **§4.1 absent-sentinel CP-1 agreed 2026-06-16 (A1+B1+C1). Settings-delete history boundary CP-1 agreed 2026-06-16.**

**Status:** `Draft CP-1`
**Owner module / service:** `widgetSettings`
**Type:** `feature module` (control surface)
**Authoring AI:** Planner (Claude Opus 4.8), 2026-06-06
**Reviewed by:** `<pending full contract>`

## 1. Purpose
Settings control-surface for all widget types. Owns the **panel-control VALUES** (vis: colour/dimension/visType/topNChoice/showValues/iterator/zoom; text: fontSize/restyle/colour) + their **history steps**, and the panel/gear/dropdown UI lifecycle (build/place/bind/open/close, per-type rendering). On commit it dispatches the confirmed value to the consequence-owner, which derives/applies. Owns no derived state. A settings dropdown stays open only while the pointer is inside a `.KDB_IconsDropdown` of that panel or on the owning icon of a visible dropdown of that panel. A pointerdown anywhere else — widget body, empty panel chrome, another widget, or the document — closes that panel’s visible flyouts. Keep-open kinds still stay open on option pick. `isInsideWidgetShell` is not a dismiss test; it only gates `disableMoveResizeModes`. The focus clone uses the same dismiss hit-test and its own document listener (`contracts/_archive/widgetSettings-dropdown-outside-dismiss-contractdelta.md`).

## 2. Ownership
- Canonical state subtree: `_KDB.state.widgets.settings` = `{ byWidget: { "<widgetId>": { /* colour, dimension, visType, topNChoice, showValues, iterator, zoom (vis; those three absent = inherit); fontSize, restyle (text); colour (any) */ pending: { kind: null }, errorCode: null } }, ui: { openForWidgetId: null } }`.
- Owns the **settings history steps** (small, input-level: control value `old→new`).

## 3. Runtime
- `_KDB.runtime.widgetSettings[widgetId]`: `domRefs` (gear, panel, dropdowns), `listeners`, `abortControllers`, `opSeq`. Panel mounted into the widget's shell settings-slot (provided by `widgetBase`) via a scoped query from `[data-kdb-widget-id]`. Cleanup on `destroy`/`closePanel`.

## 4. Public API (dispatch-style)
`_KDB.api.widgetSettings = { mount, destroy, dispatch, getState }`.
**As built:** the dispatch table in `index.js` routes exactly `widgetSettings/placeControls`, `applyButtonVisibility`, `cleanupWidgetControls`, `seedDefaults`, `commitColour`, `parameterSetResetRequested`, `parameterSetRestoreBatchRequested` and `restoreCommittedSettings` (constants in `config/actionTypes.js`); anything else returns `{ ok: true, skipped: true, reasonCode: "WIDGET_SETTINGS_ACTION_UNKNOWN" }`. Panel open/close and the dimension / visType / topN / showValues / iterator / zoom / fontSize / restyle commits are not dispatch actions: panel clicks run as intents (`effects/dispatchWidgetSettingsIntent.js` -> `intent/*`), which dispatch `apply*` to the consequence-owner and commit through `state.js` `commitWidgetSettingValue`. The names below describe those commit paths; read §9 for the real files.

Key commit paths (value-committing controls that own the history step): `commitDimension`, `commitVisType`, `commitTopNChoice`, `commitShowValues` (vis; `showValues` explicit boolean only, inherit is absence); iterator/zoom ride the same option-select → `widgetVis/applyIteratorZoom` (`contracts/_archive/widgetSettings-vis-toggle-panel-wp2-contractdelta.md`); `commitFontSize`, `commitRestyle` (text); `commitColour` (any). Show-values chrome, D2 inherit, List CSS-hide, and `widgetVis/applyShowValues`: `contracts/_archive/widgetVis-show-values-contractdelta.md`. A user/history commit dispatches `apply*` to the consequence-owner first, commits the setting value only after the consequence-owner confirms apply, and then pushes the small history step when the source is a user action. `commitColour` sends the dropdown `optionValue` to `widgetBase/applyColour` or the compatibility `widgetBase/setColour`; `widgetBase` does not need a public `fromColour` because `widgetSettings` owns the old value and history payload. Startup defaults follow the same commit-after-apply rule but never push history.

For visual widgets, default seeding must wait for per-widget `widgetVis` content registration before dispatching the visual startup batch:

```js
await _KDB.api.widgetVis.dispatch({
  type: "widgetVis/waitUntilContentReady",
  widgetId,
  payload: { timeoutMs: 3000 }
});
```

`widgetSettings` must not poll `_KDB.state.widgets.vis` or inspect `_KDB.runtime.widgetVis`. If readiness times out or fails, `widgetSettings` records only its own pending/error state and does not write `widgetVis` state. A successful wait only means the visual record, metric/data identity and runtime/opSeq are registered; it does not mean Cognos binding/render has completed.

### Metrics table context (dropdown population)

`widgetSettings` does not own metric/data identity (`code`, `display`, `metricsTable`); that is registered by `widgetVis/contentCreate`. For table-scoped dropdown options (dimensions), `placeControls` resolves a **metrics table name** from, in order:

1. `payload.metricsTable`
2. `dropRequest.payload.metricsTable` (when `dropRequest` is present on the `placeControls` payload)
3. legacy `payload.kennzahlenTable` (caller/DOM mirror)
4. shell DOM attrs `kdb_kennzahlentable` / `KDB_KENNZAHLENTABLE`

The resolved name is passed internally as `kennzahlenTable` for option lookup against `_KDB.properties.visualizationsDataPropObj[tableName]`. Canonical drop payloads use `metricsTable`; DOM attrs remain legacy-named. `widgetSettings` does not read `kennzahlCode` / `kennzahlDisplay` and does not pass metric identity downstream in startup `apply*` intents. Non-empty property `dimensions` keys win; an empty map falls back to the JS catalog. **Lehrlinge is not a Dimensions option** (`contracts/_archive/widgetSettings-dimensions-lehrlinge-omit-contractdelta.md`).

### `widgetSettings/seedDefaults`

`widgetSettings/placeControls` starts `seedDefaults` internally after controls are successfully rendered and registered. For visualization widgets (not history replay), start the whole-shell loading overlay **after panel insert** and **before** `seedDefaults` (`loadingService-overlay-coverage-contractdelta.md`). An explicit `widgetSettings/seedDefaults` dispatch remains supported for later callers. For visual widgets, `seedDefaults` waits on `widgetVis/waitUntilContentReady` through `_KDB.api.widgetVis.dispatch(...)`, determines the configured default control values from the same sources used by the rendered controls, and dispatches startup consequences as follows: colour/backgroundColor remains a separate shell consequence through `widgetSettings/commitColour` -> `widgetBase`, while dimension/visualization/topN are sent to `widgetVis` as one batch action `widgetVis/applyStartupSettings` with `source: "startup"` and `isHistoryReplay: false`.

For visual startup batching, the payload to `widgetVis/applyStartupSettings` carries one full `settingsSnapshot` with `{ dimension, visType, topNChoice }` and a `changedControls` array describing all startup defaults included in the batch:

```js
{
  type: "widgetVis/applyStartupSettings",
  widgetId,
  payload: {
    source: "startup",
    isHistoryReplay: false,
    settingsSnapshot: { dimension, visType, topNChoice },
    changedControls: [
      { kind: "dimension", control: "dimension", previousValue, nextValue },
      { kind: "visualization", control: "visType", previousValue, nextValue },
      { kind: "topN", control: "topNChoice", previousValue, nextValue }
    ]
  }
}
```

For startup defaults, `widgetSettings` commits each included value into `_KDB.state.widgets.settings` only after the consequence-owner returns confirmed success/report data for the relevant consequence. For the visual batch, that means committing dimension, visualization and topN from the single confirmed `applyStartupSettings` result. Startup defaults do not create settings history steps. If the readiness wait or the visual batch apply fails, `widgetSettings` records only its own pending/error/deferred state for the affected controls and does not fall back to separate `applyDimension` / `applyVisType` / `applyTopNChoice` startup dispatches, does not trigger a `widgetBase` rollback, and does not write foreign `widgetVis` state.

User/history visual settings dispatches to `widgetVis` (`applyDimension`, `applyVisType`, `applyTopNChoice`, `applyShowValues`, `applyIteratorZoom`) must include a full `settingsSnapshot` with `{ dimension, visType, topNChoice }` derived from confirmed widget settings state (with configured defaults as fallback) plus the changed control value. Optional `showValues` / `iterator` / `zoom` are included only when explicit (`true`/`false`); omitted means inherit (`contracts/_archive/widgetVis-show-values-contractdelta.md`; WP2 iterator/zoom inherit = off). The payload also carries `control`, `previousValue`, and `nextValue` for the changed dropdown. Startup visual defaults use the batch-shaped `changedControls` array instead of three separate user/history action envelopes. `colour` / `backgroundColor` is excluded from the `widgetVis` snapshot; shell colour remains a `widgetBase` consequence.

### §4.1 Absent sentinels (`none` / `default`)

`dimension` and `topNChoice` are optional vis controls. The dropdown option labeled "Ohne" uses control sentinel `"none"`. This is **not** a dimension id or TopN id.

- **Stored control value (A1):** after confirmed apply, `widgetSettings` commits the control sentinel `"none"` for a cleared/absent choice (not `null`, not a dimension key).
- **Unread widget:** when `dimension` / `topNChoice` is missing from `byWidget[widgetId]`, readers treat the control as absent and surface `"none"` in UI selectors only.
- **Never entity lookup:** `widgetSettings` must not pass `"none"` to metrics-table population as a dimension key, or interpret it as a TopN helper input.
- **Snapshot handoff (B1):** when building `settingsSnapshot` for `widgetVis`, `widgetSettings` sends the committed control values unchanged (`"none"` strings are allowed). `widgetVis` normalizes at the binding boundary per `widgetVis` §7.1.1.
- **Dimension Ohne clears TopN:** clearing a committed dimension to Ohne while `topNChoice` is a real key is one `widgetVis/applyDimension`. The snapshot has `dimension` and `topNChoice` both `"none"`. Both commit only after that apply confirms. A canvas click pushes two `widgetSettings_optionSelect` steps, TopN then dimension. The absent-dimension TopN toast is unchanged. See `contracts/_archive/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`.
- **Other controls:** `move`, `title`, `fontSize`, `restyle` may use `"default"` as their own control sentinel; do not conflate with vis `dimension` / `topNChoice` absent semantics.

Cross-reference: `architecture/_archive/widgets-domain-blueprint.md` §7.1, `contracts/widgetVis.md` §7.1.

### §4.2 Setting families (A inherit vs B sentinel)

New live options pick a family **before** implementation: `contracts/_archive/widgetSettings-setting-family-contractdelta.md`. Family A = catalog varies by visType (do not seed; absent = inherit). Family B = one global real default (seed that token; `"none"` is Ohne, not inherit). Live A unset chrome: grouping marks the **Diagrammstandard row** (`family-a-inherit-row-chrome`). `showValues` marks the **Standard position** (header word Standard; key `inherit`; **middle** of Aus | Standard | Ein) — `widgetSettings-vis-toggle-panel-wp1-contractdelta.md`. WP2: `iterator` / `zoom` (Zoomleiste) are A KEEP-all-vis and paint the **Standard position** on their own nest rows — `widgetSettings-vis-toggle-panel-wp2-contractdelta.md`. Standard-position chrome only; inherit catalog for these keys stays **off everywhere**, not showValues Line-hide. Do not mark catalog Ein/Aus while unset. `showValues` is A (D2 Frozen except H inherit-row + this chrome cite). `dimension` / `topNChoice` are B. Grouping grain is A; catalog = `contracts/_archive/widgetVis-grouping-jahr-stichtag-contractdelta.md` (A); chrome/API = that delta Step B + Step G look.

### Vis dropdown safeguard (commit-after-apply + UI revert)

For user/history `dimension`, `visualization`, `topN`, `showValues`, `iterator`, and `zoom` dropdown commits to `widgetVis`, `widgetSettings` may update the dropdown DOM optimistically on click, but commits `dimension` / `visType` / `topNChoice` / explicit `showValues` / `iterator` / `zoom` into `_KDB.state.widgets.settings` only after `widgetVis` returns confirmed success (`ok: true` with `reportToSettings`). Ein skip without `reportToSettings` does not commit. Optimistic mark applies to the dropdown that received the click. A click on the focus clone does not optimistic-mark the canvas panel. After confirmed success, the canvas panel is restamped from settings state (`contracts/_archive/widgetSettings-focus-canvas-option-stamp-contractdelta.md`). Focus exit does not restamp it.

While a vis apply is in flight, `widgetSettings` sets `pending.kind` to the matching control kind and may show a minimal pending indicator on the matching settings icon (`KDB_dropdownPending`).

If apply fails (`ok: false`, missing `reportToSettings`, or upstream helper resolution failure), `widgetSettings` must not write the new value, records `errorCode` on the settings record, and calls `syncPanelFromState` to revert the dropdown from the last committed value. Revert must match committed control sentinels (`"none"` or a real id/key); Cognos mirror token `"default"` is not a settings value and must not be written into the panel as the selected option. Superseded results (`stale: true`) must not revert. `widgetVis` / `widgetTopN` do not touch settings-panel DOM. Absent-dimension Top-N user pick is blocked with messageService **before** dispatch; that is not a failed apply (`contracts/_archive/widgetSettings-topn-grouping-toast-contractdelta.md`). A dimension Ohne click that clears a real TopN is not that toast. It is one confirmed dimension apply that also commits `topNChoice` `"none"` (`contracts/_archive/widgetSettings-dimension-ohne-clears-topn-contractdelta.md`).

### TopN dropdown safeguard (commit-after-apply + UI revert)

For user/history `topN` dropdown commits to `widgetVis/applyTopNChoice`, `widgetSettings` may update the dropdown DOM optimistically on click, but commits `topNChoice` into settings state only after `widgetVis` returns confirmed success.

While the TopN apply is in flight, `widgetSettings` sets `pending.kind = "topN"` and shows a minimal pending indicator on the TopN settings icon (`KDB_dropdownPending`).

If apply fails (`ok: false`, missing `reportToSettings`, or upstream `widgetTopN` helper resolution failure), `widgetSettings` must not write the new value, records `errorCode` on the settings record, and reverts the TopN dropdown selection from the last committed `topNChoice`. Superseded results (`stale: true`) must not revert. `widgetVis` / `widgetTopN` do not touch settings-panel DOM.

TopN startup defaults are included in the visual startup batch. `widgetVis` owns interpreting `topNChoice`, including `none`; `widgetSettings` must not send a separate startup `applyTopNChoice` for the same widget. A default `none` TopN may be committed as a settings value after the visual batch confirms, while future non-default TopN behavior may return documented deferred/report data without adding a second startup binding pipeline.

## 5. Readers / Writers (outline)
No selector file. Read via `_KDB.api.widgetSettings.getState()` (cloned `_KDB.state.widgets.settings`). `config/selectors.js` holds DOM selectors (widget/panel/toolbar lookups), not state readers.

## 6. Events
None. The Diagramme “Buttons verstecken” toggle does **not** flow through a widgetSettings selector or `KDB_hide`. Canvas gear visibility is the `.dashboardFrame` class `kdb-widget-chrome-always` ([kdbControl-widget-chrome-always-contractdelta.md](./_archive/kdbControl-widget-chrome-always-contractdelta.md)). No authoring coupling.

## 7. Dependencies
`_KDB`, `_KDB.api.widgetVis` / `_KDB.api.widgetText` / `_KDB.api.widgetBase` (consequence-owners for `apply*`), `_KDB.services.history`, kdbControl selector, `_shared/`.

For visual default seeding, `widgetSettings` depends on `widgetVis/waitUntilContentReady` as a public dispatch action before it sends startup defaults to their consequence-owners (`widgetBase` for colour/backgroundColor, `widgetVis/applyStartupSettings` for the dimension/visualization/topN batch).

## 8. Cognos Touchpoints (outline)
None directly — the consequence-owners apply to Cognos. `widgetSettings` is UI + values only.

### Move / resize / maximize intent routing

Move and resize controls in the settings panel do not create settings history and do not carry final layout data. They only request interaction modes from `widgetBase`:

- move shortcut -> `_KDB.api.widgetBase.dispatch({ type: "widgetBase/enableMove", widgetId, payload: { mode: "oneShot", source: "widgetSettings" } })`;
- move dropdown -> `_KDB.api.widgetBase.dispatch({ type: "widgetBase/setMoveMode", widgetId, payload: { mode: "default" | "oneShot" | "persistent", source: "widgetSettings" } })`;
- resize button -> `_KDB.api.widgetBase.dispatch({ type: "widgetBase/resizeToggle", widgetId, payload: { enabled: true, source: "widgetSettings" } })`.

`widgetBase` owns the subsequent draggable/resizable interaction and dispatches final `widgetBase/move` / `widgetBase/resize` commits with flat layout payloads. `widgetSettings` must not push layout history. The open panel stays `z-index: 9999`; armed KDB resize handles stack above it (`contracts/_archive/widgetBase-resize-handle-stacking-contractdelta.md`). This module does not restyle those handles.

Maximize/focus-mode is visual-content behaviour. The maximize control must dispatch to `widgetVis/maximizeToggle` for live/visualization widgets, not to `widgetBase`. For live/vis widgets that control stays in the settings DOM and dispatch map but is not user-visible; the canvas proxy `.kdb-widget-maximize` is the visible enter control (`contracts/_archive/widgetVis-settings-maximize-chrome-hide-contractdelta.md`).

### Settings delete / reset-to-launchpad

The settings reset/delete control may orchestrate a widget return to launchpad, but does not own the base placement effect. The sequence is:

1. For live widgets, request content cleanup from `_KDB.api.widgetVis.dispatch({ type: "widgetVis/cleanupContent", widgetId, payload: { reason: "settingsDelete", requestedBy: "widgetSettings", ... } })` before base transfer. `widgetSettings` does not duplicate visual binding/filter/slot cleanup itself.
2. Dispatch `_KDB.api.widgetBase.dispatch({ type: "widgetBase/routeToLaunchpad", widgetId, payload: { reason: "user", requestedBy: "widgetSettings", widgetType, isLiveWidget, isTextWidget, isHistoryReplay } })`.
3. After successful base transfer, clean only settings-owned controls/runtime through `widgetSettings/cleanupWidgetControls`.

The resulting history step is the base-owned `widget_launchpadTransfer`, not a settings value step. `requestedBy: "widgetSettings"` is diagnostic/requester context; it does not require a separate `widgetBase/settingsDelete` or `widgetBase/resetToLaunchpad` public action.

Undo/redo of this settings reset/delete is compound at the user-visible level but owned by a single durable history entry: `widget_launchpadTransfer` (base-owned). It must not be treated as a settings dropdown history replay (`widgetSettings_optionSelect`).

Replay owner: **`widgetBase`**. `widgetSettings` is a delegatee only — it does not register a replay handler for delete/reset and does not push its own history step for this flow.

Replay sequence:

1. **Undo:** `widgetBase` replays shell/frame placement (`takeFromLaunchpad` with `isHistoryReplay: true`). After successful base undo back to canvas, `widgetSettings` recreates settings-owned controls through `placeControls`, then dispatches `widgetSettings/restoreCommittedSettings` with `isHistoryReplay: true` / `source: "historyReplay"`. That action reads confirmed values from `_KDB.state.widgets.settings.byWidget[widgetId]` (unchanged by forward delete cleanup) and re-applies consequences without pushing new history:
   - **Live/vis:** `widgetVis/waitUntilContentReady`, then `widgetVis/applyStartupSettings` with `source: "historyReplay"`, `isHistoryReplay: true`, and a full `settingsSnapshot` built from committed state (not dropdown startup defaults). Colour/background uses `commitColour` → `widgetBase` with replay flags.
   - **Text:** colour/background only in this tranche unless a later contract delta adds text consequence restore.
2. **Redo:** `widgetBase` replays parking (`routeToLaunchpad` with `isHistoryReplay: true`). After successful base redo, `widgetSettings/cleanupWidgetControls` runs with `isHistoryReplay: true`. Forward `widgetVis/cleanupContent(settingsDelete)` is not replayed on redo.

`cleanupWidgetControls` during the forward delete remains cleanup-only (DOM/runtime); it does not mutate `_KDB.state.widgets.settings.byWidget`. Undo relies on existing settings state plus `placeControls` + `restoreCommittedSettings`.

Forward `widgetVis/cleanupContent(settingsDelete)` is not reversed as a separate history step; undo re-enters `widgetVis` only through explicit replay dispatches from `widgetSettings/restoreCommittedSettings` after shell restore. Vis restore failure is settings-owned (logged/pending/error); it must not rollback base shell placement or fail the history pointer when `placeControls` succeeded.

There is no `widgetSettings_deleteToLaunchpad` history key unless explicitly approved in a later contract delta.

## 9. Folder Layout

As built after the Phase 1 module-template rework (33 files):

```txt
KDB3/js/dashboard/widgets/widgetSettings/
  __orchestratorWidgetSettings.js  # shim: re-exports index.js (path kept for KDB.js)
  index.js            # registerWidgetSettings: mount/dispatch/destroy/getState, action ROUTES table
  config.js           # KIND_TABLE (kind -> owner, action type, state key), labels, option tables, image paths, option defaults
  config/
    actionTypes.js        # widgetSettings/* action type constants (frozen external path)
    controlDefinitions.js # gear/toolbar/dropdown control definitions (live, text, focus-only)
    dropdownDefaults.js   # default dropdown option per control (frozen external path)
    selectors.js          # DOM selectors: widget/panel/toolbar lookups, chrome classes
  state.js            # initial state, byWidget bookkeeping, commitWidgetSettingValue, seed error/deferred records
  runtime.js          # ensureWidgetSettingsRuntime
  history.js          # settings history steps and replay handler (option replay, push after confirmed apply)
  seed.js             # seedDefaults: startup defaults resolution, readiness wait, kdbControl colour default
  seedApply.js        # startup batch commit and report handling
  colour.js           # commitColour (apply via widgetBase, readable text colour, history)
  restore.js          # parameterSet reset/restore batch and restoreCommittedSettings (history replay)
  intent/             # panel intents (user option picks)
    descriptor.js         # builds the intent descriptor from option/icon context
    downstream.js         # maps an intent to the consequence-owner action and dispatches it
    finalize.js           # apply result normalisation, commit-after-apply, coupled TopN clear
    resetToLaunchpad.js   # settings-delete / reset-to-launchpad orchestration
    topNGrouping.js       # TopN grouping-dimension validation
    visSnapshot.js        # effective vis settings snapshot and restore/startup batches
  effects/
    dispatchWidgetSettingsIntent.js  # icon / dropdown-option intent entry point (frozen external path)
    startWidgetRenderLoading.js      # render-loading marker (frozen external path)
  view/
    controls.js           # place/cleanup widget controls, button visibility, render-loading finish
    buildSettingsIcon.js  # gear icon and dropdown DOM (frozen external path)
    panelBuild.js         # settings panel DOM
    panelEvents.js        # panel pointer/click/focus handlers
    panelOutsidePointerBehavior.js  # shared outside-pointer dismiss rule (frozen external path)
    toolbar.js            # widget toolbar build/place/bind
    dropdownPopulate.js   # dropdown option DOM from metrics-table context
    dropdownUi.js         # open/close/overflow of dropdowns
    dropdownOptionSelection.js  # selected-option read/mark (frozen external path)
    optionMarking.js      # marks panel options from committed state
    resolveWidgetPlacementContext.js  # widget shell / panel / metrics-table lookup (frozen external path)
```

## 10. Out Of Scope
- Deriving/applying consequences (slots/binding/render/CSS) — owners: `widgetVis`/`widgetText`/`widgetBase`.
- Layout / move / resize — owner: `widgetBase`.
- Inline text content edit — owner: `widgetText`.
- Maximize / focus-mode — owner: `widgetVis`.
- Own `widgetSettings_deleteToLaunchpad` history key (delete uses base-owned `widget_launchpadTransfer`).
- Vis restore on settings-delete **redo** (forward cleanup only).

## 11. Open Questions
- Per-control history keys (`widget_setting_<control>`) and exact replay payload shape.
- Settings-slot DOM boundary (scoped query into `widgetBase` shell slot).

Resolved colour ownership note: colour is a settings dropdown value, so `widgetSettings` owns the canonical value and undo/redo history. The consequence-owner is `widgetBase`, which applies/mirrors the shell/Cognos colour and performs the minimal text-header class sync required for legacy parity.

Resolved settings-delete undo/redo note: replay owner = `widgetBase` (`widget_launchpadTransfer`); `widgetSettings` participates through `placeControls`, `restoreCommittedSettings` (undo), and `cleanupWidgetControls` (redo); `widgetVis` cleanup on forward delete is not replayed on redo, but undo re-applies binding through public vis dispatch after reading committed settings state.

## 12. Readiness Alignment Note
- `widgetBase/dropCreate` remains the orchestration owner: after successful `widgetVis/contentCreate`, it may ask `widgetSettings` to place controls; `placeControls` then starts default seeding internally.
- `widgetSettings/seedDefaults` waits on `widgetVis/waitUntilContentReady` before dispatching the visual startup defaults batch.
- The readiness gate is per widget and registration-level only; it is intentionally earlier than Cognos render/apply completion.
- `widgetVis/contentCreate` failure remains a `widgetBase` rollback condition. `seedDefaults` failure is settings-owned: the widget remains placed, and `widgetSettings` records the pending/error/deferred state.
- For normal drop startup, `widgetVis/contentCreate` creates content context; it does not own default visual binding. Default consequences are seeded through `widgetSettings/seedDefaults`.
- **Vis dropdown safeguard:** optimistic DOM on click for `dimension` / `visType` / `topNChoice` / `showValues`; commit only after confirmed `widgetVis` apply; on failure `syncPanelFromState` reverts from committed values (`"none"` or real id, never mirror `"default"`); pending indicator while `pending.kind` is set; `stale: true` must not revert. See §4.1 for absent-sentinel semantics.

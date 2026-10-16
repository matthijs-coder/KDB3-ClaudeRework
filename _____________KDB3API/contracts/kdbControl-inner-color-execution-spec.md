# Execution spec: kdbControl innere Farbe

**Status:** Reviewed
**Contract:** `_____________KDB3API/contracts/kdbControl-inner-color-contractdelta.md`
**Phase:** extension of existing module
**Authoring AI:** coordinator, 2026-09-24
**Executing AI:** grok 4.6

Coordinator accepts the pre-flight. Read the contract and the rules named per file, then edit. Do not echo-and-wait.

LIVE tree only: `_____________KDB3API/KDB3/`. No other trees. No new files. No shared role map. No new action, history key, service, CSS, or selector registry. Dashboard canvas and Diagramme/Kommentare stay untouched.

Every edited JS file stays ≤ 150 lines. `bindSettingsForm.js` is 142 and `settingsPostDispatchSideEffects.js` is 144: add the fourth color without crossing 150 (compact the new lines; do not add comments).

## Per-file

### `KDB3/js/dashboard/canvas/kdbControl/settings/config/settingsColorDefaults.js`

- **Rules:** `naming.mdc` (English key `panelInnerBg`).
- Add `panelInnerBg: "#fafafa"` next to `panelActionButton`.

### `KDB3/js/dashboard/canvas/kdbControl/state/initialState.js`

- **Rules:** `state.mdc` (owner field on existing subtree).
- `controlPanel.innerBackgroundColor` = `colorInputs.panelInnerBg`.

### `KDB3/js/dashboard/canvas/kdbControl/state/copyState.js`

- **Rules:** `state.mdc`.
- Same field in `defaultSettingsShape().controlPanel`.

### `KDB3/js/dashboard/canvas/kdbControl/state/selectors.js`

- **Rules:** `state.mdc`, `module-public-api.mdc` (selector, not a new API method).
- Add the field to `defaultControlPanel` and to the object `readControlPanelSettings` returns.

### `KDB3/js/dashboard/canvas/kdbControl/state/reduceSettingsActions.js`

- **Rules:** `state.mdc` (pure reducer, no try/catch). `error-handling.mdc` (reducer exempt).
- Role `"innerBackground"` maps to key `"innerBackgroundColor"`. Unknown role stays `null`.

### `KDB3/js/dashboard/canvas/kdbControl/settings/bindSettingsForm.js`

- **Rules:** `amd.mdc`, `naming.mdc`, `error-handling.mdc` (do not wrap a new helper; extend the existing case).
- Add `panelInnerBg` to `SETTINGS_FORM_INPUT_IDS` and `COLOR_INPUT_IDS`.
- Case `panelInnerBg` dispatches `ACTION_SETTINGS_SET_CONTROL_PANEL_COLOR` with `{ role: "innerBackground", value }`.
- Stay ≤ 150 lines.

### `KDB3/js/dashboard/canvas/kdbControl/framework/bindFrameworkPrimitiveVisuals.js`

- **Rules:** `dom.mdc`.
- Add `panelInnerBg` to the settings denylist (`SETTINGS_CP1_INPUT_IDS` or the equivalent set). Missing it makes the input a placeholder write.

### `KDB3/js/dashboard/canvas/kdbControl/framework/syncFrameworkPlaceholderInputs.js`

- **Rules:** `dom.mdc`, `state.mdc`.
- Allowlist + value switch: `panelInnerBg` reads `controlPanel.innerBackgroundColor`.

### `KDB3/js/dashboard/canvas/kdbControl/framework/fillControlPanelSettings.js`

- **Rules:** `dom.mdc`, `naming.mdc` (German label only).
- Row 1: `createColorInput("innere Farbe", "panelInnerBg")` then Button-Farbe. Both via the existing two-column split.
- Row 2: Hintergrundfarbe then Aktionsbutton-Farbe. Same two-column split. Not `oneinput-row`.

### `KDB3/js/dashboard/canvas/kdbControl/effects/settingsPostDispatchSideEffects.js`

- **Rules:** `dom.mdc` (hardcoded `dr.*` and `querySelectorAll`, no new selector namespace). `error-handling.mdc` (stay inside existing try/catch).
- In `applyControlPanelShellVisuals`, after the existing three paints, set background on:
  - `dr.settingsContainerEl`
  - `dr.metricsContainerEl`
  - every `root.querySelectorAll(".kdb-control__section-body-container")`
- Use the existing `resolveCssColor` / `setShellBackgroundColor`. Do not paint `dr.contentEl`, the arrow, toggles, section heads, action buttons, `dr.mainBlocksEl`, or `dr.toolboxContainerEl` with the inner color.
- `serializeControlPanel` appends `innerBackgroundColor` on the existing return expression.
- Stay ≤ 150 lines.

### `KDB3/js/dashboard/canvas/kdbControl/history/isHistoryTrackedSettingsTarget.js`

- **Rules:** `state.mdc`.
- `TRACKED["controlPanel.innerBackgroundColor"] = 1`.

### `KDB3/js/dashboard/canvas/kdbControl/history/resolveHistoryTargetFromAction.js`

- **Rules:** `events.mdc` (no new event).
- Role `"innerBackground"` returns `"controlPanel.innerBackgroundColor"`.

### `KDB3/js/dashboard/canvas/kdbControl/history/readSettingsTargetSnapshot.js`

- **Rules:** `state.mdc`.
- Case returns `{ value: readString(panel.innerBackgroundColor) }`.

### `KDB3/js/dashboard/canvas/kdbControl/history/applyControlSettingsHistoryReplay.js`

- **Rules:** `error-handling.mdc`.
- `panelRole` arm: target `controlPanel.innerBackgroundColor` → `"innerBackground"`.
- Stay ≤ 150 lines. Do not add skipHistory flags; the existing replay options already set them.

### `KDB3/js/dashboard/canvas/kdbControl/actions/buildParameterSetRestoreActions.js`

- **Rules:** `state.mdc`.
- One `CATALOG` row copying `sett.panel.act`, with key `sett.panel.inBg`, statePath `["controlPanel", "innerBackgroundColor"]`, v3Path `["settings", "panel", "inBg"]`, role value `"innerBackground"`.

### `KDB3/js/core/services/writeback/schema/v3Defaults.js`

- **Rules:** `naming.mdc`.
- `SETT_KEY_CATALOG.panel.inBg` copies `act`, with `ownerStatePath: "settings.controlPanel.innerBackgroundColor"` and `defaultSource: "settingsColorDefaults.colorInputs.panelInnerBg"`.

### `KDB3/js/core/services/writeback/get/collectors/collectCanvasSettings.js`

- **Rules:** `state.mdc`.
- The panel `collectColourGroup` key map gains `inBg: "innerBackgroundColor"`.

## Forbidden

- New files, CSS, `_KDB.elements.selectors`, v2 map, history step key, action type, service.
- Painting `#kdb-control-content` with the inner color.
- Editing dashboard width/height/background or graph/comment defaults.
- Extracting a shared color-role module.

## Done when

A search for `innerBackground` / `panelInnerBg` / `inBg` hits every file in this list, and a search shows the three forbidden nodes are not assigned the inner color. Report line counts of the three files that were near 150.

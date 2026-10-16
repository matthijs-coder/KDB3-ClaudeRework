# Contract Delta: Diagramme “Buttons verstecken” shows widget chrome without a click

> PO vastenburg 2026-09-23: the existing Diagramme toggle stays. Checked by default means today’s hide-until-click. Unchecked shows the widget settings gear and the buttons to the right of the canvas widget (drillthrough, maximize) without selecting the widget first.

---

**Status:** `Approved` — PO vastenburg 2026-09-23 (chat). Implementing.
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.7 (coordinator), 2026-09-23
**Reviewed by:** PO vastenburg, approved 2026-09-23
**Related rules:** `state.mdc`, `module-public-api.mdc`, `events.mdc`, `feature-structure.mdc`, `naming.mdc`, `error-handling.mdc`, `dom.mdc`, `amd.mdc`

**Parents this delta amends**

| Parent | What changes |
|---|---|
| `contracts/kdbControl.md` S2 / §7 | `hideWidgetSettingsButtons` is no longer a deferred `_KDB.api.canvas` intent |
| `contracts/widgetSettings.md` §6 | Gears do not follow a kdbControl selector or `KDB_hide` |
| `contracts/writeback.md` §4.1.1 `sett.dash.hidWs` | Default `true`, omit when `1`, emit `0` when false |
| `contracts/kdbControl-parameterSetRestore-contractdelta.md` | Bool restore must actually use the owner default when the v3 key is omitted (already the contract; the helper hardcoded `false`) |
| `contracts/kdbControl-developer-mode-toggle-contractdelta.md` §9 | Sister path is no longer visually inert. This slice still must not edit developer mode |
| `contracts/widgetVis.md` canvas chrome hides | Hide-until-`.nodeSelected` is scoped to `.dashboardFrame:not(.kdb-widget-chrome-always)` |

Second-pass stress test (2026-09-23): persist, DOM/CSS, and overdesign reviews all returned PASS-WITH-AMENDMENTS. Those amendments are this delta. No new state key, service, event, or canvas module.

---

## 1. Product

Diagramme caption **Buttons verstecken** (`aria-label` **Settings-Buttons verstecken**, action `dashboard.settingsButtons.toggle`) already writes `settings.dashboard.hideWidgetSettingsButtons`.

| Checkbox | State | Chrome on the canvas widget |
|---|---|---|
| Checked (default) | `true` | Gear, drillthrough and maximize stay hidden until the widget has `.nodeSelected` (today) |
| Unchecked | `false` | Those buttons stay visible without a click |

The settings **panel** (`.KDB_widgetSettings`) still hides until the widget is selected. Uncheck does not open the panel.

Developer mode (`isDeveloperMode` / `devOn` / `KDB_developerMode` on `#main`) is a different control. Do not merge them.

## 2. Mechanism

kdbControl toggles class `kdb-widget-chrome-always` on catalog host `.dashboardFrame` (`_KDB.elements.selectors.root.dashboardFrame`).

- Class **present** only when `hideWidgetSettingsButtons === false`.
- Class **absent** when the flag is `true`, missing, or the frame node is missing.
- Never `classList` on `#main`. Never `KDB_hide`. Never a SHOW rule that restates `display`.

**dom.mdc exception (this delta):** kdbControl may `document.querySelector` that catalog selector once per stamp. Do not copy the selector string into `selectors.kdbControl`. Missing selector or missing node: return. Do not throw.

Stamp from both:

1. `settingsPostDispatchSideEffects.runAfterDispatch`, instead of `kdbControl.canvasIntent.dashboardHideWidgetSettingsButtons`, and only for chrome toggle/set of key `hideWidgetSettingsButtons`. Width, height and background canvas intents stay.
2. `__orchestratorEffects`, once, after the shell visuals. Init does not go through `runAfterDispatch`.

No new event. No `widgetSettings/applyButtonVisibility` routing. Leave `applyWidgetSettingsButtonVisibility.js` and `areSettingsButtonsHidden` untouched (history alias only). `KDB_hide` would hide the gear after click and would not reveal drillthrough or maximize.

## 3. CSS

Prefix **only** these hide rules with `.dashboardFrame:not(.kdb-widget-chrome-always)`:

| Rule | File |
|---|---|
| `.widget:not(.nodeSelected) .KDB_widgetSettingsButton` | `css/widgets/widgetSettings.css` |
| `.widget:not(.nodeSelected) .kdb_hyperlink_icon` | `css/widgets/widgetVis.css` |
| `.widget:not(.nodeSelected) .dataWidgetIcon:has(.kdb_hyperlink_icon)` | `css/widgets/widgetVis.css` |
| `.widget:not(.nodeSelected) > .kdb-datapoint-pkz` | `css/widgets/widgetVis.css` |
| `.widget:not(.nodeSelected) > .kdb-widget-maximize` | `css/widgets/widgetVis.css` |

Do **not** prefix `.widget:not(.nodeSelected) .KDB_widgetSettings` (panel).

Keep declarations `display: none !important`. Do not add a grouped SHOW block and do not move rules across files.

**Expand preservation.** `.expandModeContainer .KDB_widgetSettingsButton { display: inline-block !important }` currently loses to the unscoped gear hide, because the expand clone has no `.nodeSelected`. After the gear hide is scoped to `.dashboardFrame`, that SHOW would win for a clone outside the frame. Add, and do not delete the existing SHOW:

```css
.expandModeContainer .widget .KDB_widgetSettingsButton {
    display: none !important;
}
```

That rule is more specific than the expand SHOW and is not gated by `kdb-widget-chrome-always`. Uncheck does not reveal the gear, maximize, or in-widget drillthrough copies inside expand. Do not touch `.KDB_focusModeSettingsPanel`, `.KDB_widgetSettingsIcons`, the expand drillthrough column SHOW, or `.expandModeContainer .kdb-widget-maximize`.

These stays are independent and must keep winning when the class is present: `#main.kdb-pdf-capturing`, `#main.kdb-share-read-only` (gear/panel), IBM `.dataWidgetIcon` invert, `.resizeEdge.topRight` crush, `.liveWidget .KDB_maximizeButton` hide, leftover visibility, S2 plant only when categories exist. Share may show maximize and drillthrough without a select; that matches its KEEP list. The gear stays hidden in read-only.

## 4. Default and writeback

Owner default of `hideWidgetSettingsButtons` becomes `true` in `initialState.js`, `copyState.js` `defaultSettingsShape`, and `selectors.js` `defaultDashboard`.

Do not change `fillGraphSettings.js`. `syncView` already sets `checked` from state before the Diagramme body is shown.

`sett.dash.hidWs`:

| v3 | State |
|---|---|
| omitted | owner default `true` (hide until click) |
| `1` | `true` |
| `0` | `false` (always show) |

GET (`collectCanvasSettings.js` `collectDash`): emit `hidWs: 0` only when the flag is `false`. Do not emit `hidWs: 1` when it is `true`. Do not change the `devOn` emit (`1` when true, otherwise omit).

`v3Defaults.js` `hidWs`: `defaultSource: "true"`, `omitWhenValue: 1`. Nothing reads `omitWhenValue`; the collector `if` is the real omit rule.

Restore (`resolveDesired`): for `bool` and `boolValue`, omitted / null / undefined returns `defaultValue === true`. Present `0` stays false. Present `1` / `true` stays true. Do not special-case the hidWs key. `devOn` default stays `false`, so omitted `devOn` still restores false.

v2 `mapV2CanvasSettings.js`: keep emit `hidWs: 1` only when `dashboardSettingIcons === true`. Do **not** emit `hidWs: 0` when v2 is false. False and absent both mean hide-until-click after this change. The old flag was visually inert, so saved `hidWs: 1` also means hide-until-click, not `KDB_hide`.

History alias stays `dashboard.areSettingsButtonsHidden`. Replay already dispatches `setDashboardChrome` through `runAfterDispatch`.

## 5. Out of scope

- Developer mode, SuperUser, `devOn`, `#main` classList, properties.
- PDF capture CSS/JS, share read-only CSS, cognosButtons allow-list, leftover hide.
- `applyWidgetSettingsButtonVisibility.js`, `placeAllWidgetControls.js`, `KDB_hide`.
- New canvas module, new service, new event, new state key, new CSS file, `helpers/` / `common/`.
- Changing the Diagramme label or the builder’s initial `checked` argument.

## 6. Files

**Edit**

- `KDB3/js/dashboard/canvas/kdbControl/state/initialState.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/copyState.js`
- `KDB3/js/dashboard/canvas/kdbControl/state/selectors.js`
- `KDB3/js/dashboard/canvas/kdbControl/actions/buildParameterSetRestoreActions.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/settingsPostDispatchSideEffects.js`
- `KDB3/js/dashboard/canvas/kdbControl/effects/__orchestratorEffects.js`
- `KDB3/js/core/services/writeback/get/collectors/collectCanvasSettings.js`
- `KDB3/js/core/services/writeback/schema/v3Defaults.js`
- `KDB3/css/widgets/widgetSettings.css`
- `KDB3/css/widgets/widgetVis.css`

If `settingsPostDispatchSideEffects.js` would pass **150** lines, move only the stamp function to `kdbControl/effects/applyWidgetChromeAlwaysClass.js` and call it from the two sites above. No other new file.

**Do not edit:** `fillGraphSettings.js`, `mapV2CanvasSettings.js`, `applyWidgetSettingsButtonVisibility.js`, developer-mode files, `pdfCapture.css`, `shareControls.css`, `cognosButtons.css`.

## 7. Acceptance

1. Fresh dashboard: Diagramme toggle checked, no `kdb-widget-chrome-always` on `.dashboardFrame`, gear and right-side buttons still appear only after widget select.
2. Uncheck: class present, those buttons visible on unselected canvas widgets; panel still closed until select.
3. Check again: class removed, hide-until-click returns.
4. GET of a default dashboard omits `hidWs`. GET after uncheck emits `hidWs: 0`. SET of a package that omits `hidWs` restores checked / hide-until-click. SET of `hidWs: 0` restores unchecked / always show.
5. Omitted `devOn` still restores developer mode off.
6. Expand maximize proxy stays hidden. Expand in-widget drillthrough copies stay hidden. Focus column icons unchanged. PDF and read-only gear hides unchanged.
7. No `_KDB.api.canvas.dispatch` for this flag. No class on `#main`.

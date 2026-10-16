# kdbControl — Steuerungspanel innere Farbe

**Status:** Approved for this slice (PO vastenburg, 2026-09-24, “go” after the second-pass review).
**Datum:** 2026-09-24
**Relatie:** extends [_archive/kdbControl-settings-cp1-contractdelta.md](./kdbControl-settings-cp1-contractdelta.md) §3–§4 and §6 for one new control-panel colour. Extends [writeback.md](../writeback.md) §4.1.1 and [kdbControl-parameterSetRestore-contractdelta.md](../kdbControl-parameterSetRestore-contractdelta.md) §3 with one key. History step key stays `kdbControl_settingsChange`.

Dashboard width/height/background and Diagramme/Kommentare defaults are **out of scope**. Do not apply them.

---

## 1. Purpose

Add one Steuerungspanel colour, **innere Farbe**, that paints the inner containers of the kdbControl shell. The existing three colours keep their current paint targets.

## 2. State and action

New field on the existing subtree (owner remains kdbControl):

```js
settings.controlPanel.innerBackgroundColor // string, default "#fafafa"
```

Same action, new role. Unknown roles stay a reducer no-op.

| `type` | `payload` |
|---|---|
| `kdbControl/settings/setControlPanelColor` | `{ role: "background" \| "button" \| "actionButton" \| "innerBackground", value: string }` |

`role: "innerBackground"` writes `settings.controlPanel.innerBackgroundColor`.

Default `"#fafafa"` lives in `settingsColorDefaults.colorInputs.panelInnerBg` and is copied by `initialState` and `copyState`. Do not use `""`. Empty or whitespace at apply time removes the inline `background-color` so the stylesheet shows through. It is not the persisted default.

## 3. DOM

Input ids stay `panelBg`, `panelInnerBg`, `panelButton`, `panelActionButton`. Labels are display-only.

One caption `Farbe:` (existing class `kdb-control_subheading`) is the first child of the first settings row, above that row's two inputs. The two input rows stay separate direct children of the section body, so the existing section-body divider between rows stays. No new CSS. No change to that divider rule.

| Row | Left | Right |
|---|---|---|
| 1 | Hintergrund (`panelBg`) | Innere Räumen (`panelInnerBg`) |
| 2 | Buttons (`panelButton`) | Aktionsbuttons (`panelActionButton`) |

Both rows use the existing two-column split.

`panelInnerBg` joins the same settings-input allowlists and the placeholder denylist as `panelBg` / `panelButton` / `panelActionButton`.

## 4. Paint

`applyControlPanelShellVisuals` also paints `innerBackgroundColor` onto:

- `.kdb-control__section-body-container`
- `#kdb-control_settings_container`
- `#kdb-control_metrics_container`

It does **not** paint `#kdb-control-content`, `#kdb-control-root`, `#kdb-control-arrow`, `#kdb-control-main-toggles`, `.kdb-control__top-toggle`, `.kdb-control__section-head`, `.kdb-control_action-button`, `#kdb-control-main-blocks`, or `#kdb-control_toolbox_container`.

Existing paints stay:

| Field | Still paints |
|---|---|
| `backgroundColor` | `#kdb-control-content` |
| `buttonColor` | collapse arrow, top toggles, section heads |
| `actionButtonColor` | `.kdb-control_action-button` |

Query the same way the function already queries: cached `dr.*` nodes and `root.querySelectorAll` for the repeated class. No new `_KDB.elements.selectors` entry.

`serializeControlPanel` includes `innerBackgroundColor` so a live change re-paints.

Text contrast uses the existing `_KDB.utils.readableTextColorForHex` only. Set `style.color` on the same node as the background for content, arrow, top toggles, section heads, action buttons, and the inner containers. Also set `style.color` only (no extra background) on `.kdb-control_input-label`, `.kdb-control_subheading`, `.kdb-control_toolbox-hint`, and `.kdb-control_radio-group-label` from the inner color. Empty color clears the inline text color too. Do not recolor swatches. Stay inside `settingsPostDispatchSideEffects.js` (≤ 150 lines). No second formula.

## 5. History

Step key remains `kdbControl_settingsChange`. New tracked target `controlPanel.innerBackgroundColor`.

Replay dispatches `setControlPanelColor` with `role: "innerBackground"` and the existing replay options (`skipHistory`, `isHistoryReplay`, `forceApply`). No new handler, no new step key.

## 6. Writeback

| v3 key | Owner state path | Type | Default source | Omit rule |
|---|---|---|---|---|
| `sett.panel.inBg` | `settings.controlPanel.innerBackgroundColor` | colour string/token | `settingsColorDefaults.colorInputs.panelInnerBg` | omit when default |

Leaf `inBg` (4 characters). No v2/legacy key. No new `sett` section.

GET emits via the existing panel colour group. SET restores via the existing settings catalog row, same action and `role: "innerBackground"`. Unknown `sett` keys stay invalid; `inBg` becomes valid by catalog membership.

## 7. Out of scope

- Shared role map, new service, new action type, new history handler.
- Dashboard canvas size/background. Diagramme/Kommentare defaults.
- Selector registry, new CSS, PDF clone path.
- Changing the paint targets of the existing three colours.

## 8. Approval

| Datum | Actor | Note |
|---|---|---|
| 2026-09-24 | PO vastenburg | Second-pass review held. Implement this slice. Dashboard and Diagramme parked. |

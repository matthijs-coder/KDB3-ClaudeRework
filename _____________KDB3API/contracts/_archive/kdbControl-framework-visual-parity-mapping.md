# kdbControl framework visual parity mapping

This document maps legacy kdbControl visual concepts to the current sandbox framework DOM for framework tranche 2 and the visual parity reset in `kdbControl.md` Section 14.

Purpose:

- keep redesigned technical names and state (`metrics`, not `kennzahlen`);
- avoid adding legacy classes as compatibility shims;
- rewrite only the needed CSS concepts onto current selectors;
- keep German text only as user-facing labels.

Legacy sources are read-only under `_______KDB3/KDB3/`.

---

## Mapping rule

Use current sandbox selectors as the implementation target. Legacy selectors are reference labels only. The reset target is legacy-equivalent geometry, not legacy class compatibility.

The current flex-card shell direction is rejected for visual parity because it fights the legacy grid row/column model. The reset must express the same layout roles with current-named wrappers.

---

## Structural reset mapping

| Legacy concept / selector | Reset sandbox target | Notes |
|---|---|---|
| `#kdb-control_top-level_container` | `#kdb-control-root.kdb-control` | Top-level shell. Must use CSS grid with columns `minmax(0, 1fr) 30px`, not flex. |
| `#kdb-control_top-level_container.kdb-control_collapsed` | `#kdb-control-root.kdb-control.kdb-control_collapsed` | Collapsed grid uses a zero-width content column and fixed `30px` collapse column. |
| `#kdb-control_content_container` | `#kdb-control-content.kdb-control__content` | Main content stack. Must use legacy-equivalent grid rows: header, settings outer, save/load spacer, main toggles, main blocks. |
| `#kdb-control_arrow_container` | `#kdb-control-arrow.kdb-control__collapse-arrow` | Collapse trigger. Keep current button element, but position as a full-height right grid column. |
| `#kdb-control_arrow_icon` | optional `.kdb-control__collapse-icon` | Add only if styling the button text cannot match arrow geometry. Use current English class name. |
| `.kdb-control_content_hidden` | `.kdb-control_content_hidden` | Behavior class remains acceptable; hides the content stack when collapsed. |
| `.kdb-control_collapsed` | `.kdb-control_collapsed` | Behavior class remains acceptable on the root. |
| `#kdb-control_header_container` | `.kdb-control__header` | Header chrome container. |
| `#kdb-control_title_text` | `.kdb-control__header-title` | Title text. Visible label remains `Dashboard-Steuerung`. |
| `.kdb-control_header_actions` / `.kdb-control_header_icons` | `.kdb-control__header-actions` and current child classes | Current header action classes are acceptable. Do not introduce `.kdb-control__header-meta` just for naming churn. |
| `#kdb-control_settings_outer-container` | `#kdb-control-settings-outer.kdb-control__settings-outer` | Settings outer row. Structurally important; settings opens here, not as a third main-card sibling. |
| `#kdb-control_settings_container` | `#kdb-control_settings_container.kdb-control__panel-settings` | Settings section grid inside the settings outer row. Technical id may remain current because it is already English enough for the module's current sandbox convention. |
| `#kdb-control_save-load_container` | `#kdb-control-save-load-slot.kdb-control__save-load-slot` | Empty/inert spacer slot for this reset tranche. Needed for legacy vertical rhythm. |
| `#kdb-control_main-toggles_container` | `#kdb-control-main-toggles.kdb-control__main-toggles` | Two visible top toggles only: `metrics` and `toolbox`. |
| `.kdb-control_button-layout` | `.kdb-control__top-toggle` and `.kdb-control__section-head` | Shared visual button family. |
| `.kdb-control_toggle_button` | `.kdb-toggle` / `.kdb-control__top-toggle` | Generic top-toggle styling concept. |
| `.kdb-control_selected` | `.kdb-control_selected` | Current behavior class may remain because it is semantic and already used by sync. |
| `.KDB_visible` | `.KDB_visible` | Current visibility class may remain because it is part of existing sync. |
| `#kdb-control_main-toggles-block_outer-container` | `#kdb-control-main-blocks.kdb-control__main-blocks` | Main blocks wrapper containing metrics/toolbox panels. |
| `#kdb-control_kennzahlen_container` | `#kdb-control_metrics_container.kdb-control__panel-metrics` | Technical name is `metrics`; visible label may still be `Kennzahlen`. |
| `#kdb-control_kennzahlen_toggle` | `#kdb-control_metrics_toggle` / `[data-panel-id="metrics"]` | Technical id/value is `metrics`; do not use `kennzahlen` in new code. |
| `#kdb-control_toolbox_container` | `#kdb-control_toolbox_container.kdb-control__panel-toolbox` | Toolbox main panel. |
| `.kdb-control_toolbox-toggle_container` | `.kdb-control__section-shell` within toolbox panel | Expandable toolbox section shell. |
| `.kdb-control_settings-toggle_container` | `.kdb-control__section-shell` within settings panel | Expandable settings section shell. |
| toolbox/settings toggle buttons | `[data-section-id]` / `.kdb-control__section-head` | Section toggles use current data attributes and class names. |
| settings / toolbox content bodies | `.kdb-control__section-body-container` / `.kdb-control__section-body` | Body must be separate from the head and visually below it. |
| legacy input / radio / dropdown rows | deferred | Deep toolbox/settings content is deferred; placeholder primitive gallery remains hidden or debug-only. |

---

## CSS slicing for the reset

Implement visual parity in this order:

1. **DOM reset:** current-named wrappers for shell, content rows, settings outer, save/load slot and main blocks.
2. **Shell and collapse strip:** grid columns, collapsed grid state, full-height fixed `30px` collapse strip.
3. **Content row geometry:** header row, settings outer row, save/load spacer row, main toggles row, main blocks row.
4. **Panel and section geometry:** metrics/toolbox/settings panels, section heads, separate body containers, selected/open states.
5. **Primitive/deep content policy:** keep primitive gallery hidden or debug-only; do not add deep toolbox/settings business DOM in this reset.

Do not port the full legacy `kdbControl.css` wholesale. Each CSS slice must state which legacy selector concept it maps to and which current selector implements it.

---

## Out of scope

- Legacy class aliases on current DOM solely to make old CSS apply.
- German technical ids such as `kennzahlen`.
- Any behavior beyond existing framework state: `activeTopPanel`, `openSectionId`, `isCollapsed`, `placeholderInputs`, `placeholderSelections`.
- New reducer actions, new state shape, public API changes or new events.
- Cognos, services, persistence, header/footer/tabs/widgets/filters/launchpad integration, `controlDefinitions[]`, `registerControl`, `registerCustomControl`.
- Deep toolbox/settings content builders in the reset tranche; those require a later CP-1 visual slice.


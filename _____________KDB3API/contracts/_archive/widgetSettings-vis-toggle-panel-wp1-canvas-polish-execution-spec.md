# Execution Spec: vis toggle panel WP1 canvas polish (A + P1)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md` (Implementing; PO A + P1).
> Echo Section A **before** producing files. Do not stamp WP1 `Implemented`. Do not start WP2 / C / E.

---

**Status:** `Executed` — W-CSS + W-BIND + W-FOCUS landed; dual GREEN/GREEN 2026-09-12. Await PO canvas. WP1 not `Implemented`.
**Module / contract:** widgetSettings-vis-toggle-panel-wp1
**Phase:** `extension` (chrome polish + keep-open)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves

Three exclusive writers, **parallel**. No shared files. `options.js` is **nobody** (already Aus / Standard / Ein + `isDefault`).

## Exclusive allowlists

### W-CSS

**May edit:** `KDB3/css/widgets/widgetSettings.css` — the WP1 appended block only (from the comment `WP1 showValues chrome` through end of that block).

**Must not:** shared `.KDB_IconsDropdown` rules ~255–339; `toggle-button.css`; any JS; contracts.

### W-BIND

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/view/bindWidgetSettingsPanel.js`

**Must not:** `panelDropdownUi.js`, `closeVisibleDropdowns.js`, CSS, stamp, apply. End file **≤214** lines. No new helper. No AMD import.

### W-FOCUS

**May edit:** `KDB3/js/dashboard/widgets/widgetVis/effects/focusMode/bindFocusPanelInteractions.js`

**Must not:** `domQueries.js` (`hidePanelDropdowns` stays dumb). Live bind. CSS.

### Nobody

`options.js`, `stampPanelVisType.js`, `showValuesDropdownSafeguard.js`, `populateStaticDropdown.js`, `buildDropdownOption.js`, `buildDropdownOptions.js`, `commitWidgetSettingValue.js`, `handleApplyShowValues.js`, `applyShowValues.js`, `KDB.js`, `sorting.js`, `.mdc`, contracts (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. WP1 contract product table + G2 / G4 / G5 (A + P1). P3 dashed and G2-as-header are **withdrawn**.
13. This spec

Also echo: display-only; D2+H machine unchanged; polarity `off | inherit | on`; inherit `isDefault`; S1 invert (gray + blue knob); hatch no; `Std.` no; pill 66×22; header `::after`; keep-open showValues only; bind ≤214; no `KDB_ToggleButton`.

---

## Section C. Per-file

#### `widgetSettings.css` (W-CSS)

**Replace** the appended WP1 block (do not leave the old `minmax(22px, max-content)` / P3 dash / in-flow `.textIcon` rules). Host stays `.KDB_IconsDropdown.KDB_showValuesContainer`. Pill on **direct children** `> .dataWidgetIcon` only.

**Grid (2 rows)**

- `.KDB_visible { display: grid; }` three-class.
- `grid-template-columns: max-content 22px 22px 22px;`
- `padding: 8px;` `row-gap: 8px;` `column-gap: 0;` `width: max-content;`
- `::before` — `content: "Werte anzeigen"`; `grid-column: 1; grid-row: 2;` `padding-right: 12px;` `align-self: center;` `pointer-events: none;` `white-space: nowrap;`
- `::after` — `content: "aus / Standard / ein"`; `grid-column: 2 / span 3; grid-row: 1;` `text-align: center;` `white-space: nowrap;` `pointer-events: none;`
- Three children: `grid-row: 2;` columns 2 / 3 / 4 (`:nth-of-type` or `:nth-child`). Each **22×22**. `padding: 0 !important;`
- Hide `> .dataWidgetIcon .textIcon { display: none; }`
- Hide option `::before` (`content: none`). Hide row dashed here only.
- First/last slab capsule radius.
- No `overflow: hidden`. No `display: contents`. No abs phrase/header.

**Track**

- `:has(> .dataWidgetIcon.KDB_optionSelected[data-kdb-option-value="off"])` and `"inherit"` → all three slabs `#ccc !important`
- `"on"` → all three slabs `var(--kdb-control-steuerung-switch-on, #0056b3) !important`
- Kill hover cyan / selected gray with scoped `!important`
- **No** dashed. **No** `#eee`. **No** hatch.

**Knob**

- Selected `::after`: 18×18 circle; `pointer-events: none`; pin to slab (2px inset, like live).
- Default selected knob `#fff` (Aus / Ein).
- Inherit selected knob: `var(--kdb-control-steuerung-switch-on, #0056b3)` (blue on gray).
- Not `✓`. No `KDB_ToggleButton`.

#### `bindWidgetSettingsPanel.js` (W-BIND)

Today line 60 always `closeDropdowns` after option mark+dispatch.

1. **Skip close** when `(dropdown.getAttribute(_selectors.dropdownKindAttr) || "") === "showValues"`. Other kinds still close. Use the `dropdown` already resolved at line 51. Do not invent an attr.
2. **Focus-out snap:** `onPanelFocusOut` (146–157) must not close a still-open showValues flyout when `relatedTarget` is null (option `preventDefault` on `role=button`). If the panel contains `.KDB_showValuesContainer.KDB_visible`, skip that `closeDropdowns`. Document `onDocumentPointerDown` still closes. Other kinds unchanged.
3. Do **not** edit lines that close on icon-without-dropdown (94), document outside (139), or other-kind option pick.
4. File ends **≤214**. No new import. No helper. No `closeVisibleDropdowns` change.

#### `bindFocusPanelInteractions.js` (W-FOCUS)

Line 18 always `hidePanelDropdowns` after showValues/any option pick.

- After `dropdownOption` dispatch: resolve `option.closest` dropdown (or `data-kdb-dropdown-kind` on the option — already stamped). If kind is `showValues`, **do not** call `hidePanelDropdowns`. Else keep today’s hide.
- Icon toggle (40) and settings-button hide (63) stay. Do not edit `domQueries.js`.

---

## Section D. Done when

- Open: `Werte anzeigen` + `aus / Standard / ein` + compact 66×22 pill; air around; not jammed; not word-wide.
- Standard = gray track + blue knob. Aus = gray + white knob. Ein = blue + white knob.
- Clicking the three stops leaves the flyout **open**. Outside click closes. Grouping still closes on pick.
- `options.js` / stamp / apply / `closeVisibleDropdowns.js` diffs empty.
- Bind ≤214.

Captain does not certify Cognos. Dual review next. Do not stamp `Implemented`.

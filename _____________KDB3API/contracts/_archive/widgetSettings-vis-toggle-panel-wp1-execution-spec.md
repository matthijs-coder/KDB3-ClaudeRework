# Execution Spec: vis toggle panel WP1 (showValues 3-way chrome)

> Mechanical spec for grok 4.6 army. Architecture: `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md` (**Approved**).
> Echo Section A **before** producing files. Do not stamp WP1 `Implemented`. Do not start WP2 / C / E.

---

**Status:** `Executed` — W-OPT + W-CSS landed; dual GREEN/GREEN. Canvas HOLD. Polish: `widgetSettings-vis-toggle-panel-wp1-canvas-polish-execution-spec.md`.
**Module / contract:** widgetSettings-vis-toggle-panel-wp1
**Phase:** `extension` (chrome only)
**Authoring AI:** Cursor Grok 4.6 captain, 2026-09-12
**Executing AI:** grok 4.6 army
**Reviewer:** captain + dual grok 4.6 review

---

## Waves

Two exclusive writers, **parallel**. No shared files.

## Exclusive allowlists

### W-OPT

**May edit:** `KDB3/js/dashboard/widgets/widgetSettings/config/options.js`

**Must not:** CSS, stamp, bind, apply, commit, grouping rows, any other `options.js` key.

### W-CSS

**May edit:** `KDB3/css/widgets/widgetSettings.css`

**Must not:** `toggle-button.css`, `widgetSettingsColorDropdown.css`, `widgetVis.css`, JS, `.mdc`, contracts.

### Nobody

`bindWidgetSettingsPanel.js` (208), `stampPanelVisType.js`, `showValuesDropdownSafeguard.js`, `populateStaticDropdown.js`, `buildDropdownOption.js`, `buildDropdownOptions.js`, `dropdownPopulateHelpers.js`, `commitWidgetSettingValue.js`, `buildWidgetVisSettingsSnapshot.js`, `handleApplyShowValues.js`, `applyShowValues.js`, `handleApplySetting.js`, `KDB.js`, `sorting.js`, `.mdc`, contracts (captain).

---

## Section A. Pre-flight

Read in order; echo **one sentence** each. Do not paste rule bodies.

1–11. The 10 MUST `.mdc` + `cognos-adapter.mdc`
12. `contracts/widgetSettings-vis-toggle-panel-wp1-contractdelta.md` (Approved) — G1–G4 + product table
13. This spec

Also echo: display-only; Family A machine D2+H unchanged; polarity `off | inherit | on`; inherit `isDefault: true`; P3 dashed track **iff inherit selected**; hatch no; bind 208 shut; three child option nodes only; phrase = container `::before`; header = `.textIcon`; no helper; no `KDB_ToggleButton` class.

---

## Section C. Per-file

#### `options.js` (W-OPT)

Replace **only** the `showValues` array with this order and labels. Do not touch `grouping` or other keys.

```js
showValues: [
  { key: "off", label: "Aus", value: "off" },
  { key: "inherit", label: "Standard", value: "inherit", isDefault: true },
  { key: "on", label: "Ein", value: "on" }
]
```

Keys/values stay `off` / `inherit` / `on`. Drop `isDefault` on inherit = **FAIL** (`ensureDropdownSelected` would mark Aus).

#### `widgetSettings.css` (W-CSS)

Append a **scoped** block. Do **not** edit the shared `.KDB_IconsDropdown` radio / pad / dashed / `KDB_visible { display: block }` rules (approx. 270–339).

**Selector host:** `.KDB_IconsDropdown.KDB_showValuesContainer` — covers live + focus clone. Pill rules on **direct children** `> .dataWidgetIcon` only (not descendants).

**Open layout**

- `.KDB_IconsDropdown.KDB_showValuesContainer.KDB_visible { display: grid; }` (three-class, same trick as color `display: flex`).
- `grid-template-columns: max-content minmax(22px, max-content) minmax(22px, max-content) minmax(22px, max-content);` — phrase `::before` **is** grid item 1. Bare `display: grid` = vertical radios = **FAIL**.
- `width: max-content`. No `overflow: hidden`. No abs-positioned phrase.
- Phrase `::before { content: "Werte anzeigen"; align-self: end; }` — sits on the **slab row**, not beside Aus. Not a hit target.

**Option columns (children)**

- Each child option: `.textIcon` in-flow on top (reset shared `top` / `position`); **slab height 22px** below.
- Width `minmax(22px, max-content)`. Do **not** clamp width to 22px or the track to 66px (word Standard may widen).
- Zero the shared 34px left pad **here**.
- Hide **option** `::before` here (`content: none`) — radio disc. Do not hide the container phrase.
- Hide `[data-kdb-default="1"]` **row** dashed **here only**. Grouping keeps the shared rule.
- First/last **slab** border-radius = capsule.

**Track + P3**

- Paint **all three slabs** from the container `:has(> .dataWidgetIcon.KDB_optionSelected[data-kdb-option-value="…"])`:
  - `off` → `#ccc`
  - `on` → `var(--kdb-control-steuerung-switch-on, #0056b3)`
  - `inherit` → light fill + **2px dashed `#000`** (P3)
- Scoped `!important` on idle / hover / selected option backgrounds — required vs shared `#fff` / `--cognosMediumBlue` / `#e0e0e0 !important`. Kill per-slab hover cyan and selected gray.
- Do **not** paint the phrase column as track.
- Ein/Aus selected → solid; **no** leftover dashed Standard cell.

**Knob**

- Selected option `::after`: empty 18×18 `#fff` circle (not `✓`); `pointer-events: none`; pin to the **slab** (not shared `top: 50%` of header+slab). Jump is OK. No JS slide.
- Do **not** add `KDB_ToggleButton` / copy input+slider rules from `toggle-button.css`. Re-declare height 22 / knob 18 / `#ccc` / switch-on var — that is the rhyme.

**Forbidden in this file**

- `display: contents` on options
- Wrap box / second dropdown
- Descendant (not child) pill selectors
- Editing shared radio/pad/dashed/`display: block`

---

## Section D. Done when

- `options.js` showValues = Aus / Standard / Ein in that DOM order; inherit `isDefault: true`; grouping untouched.
- Open dropdown: phrase left on slab row; header Aus | Standard | Ein above the pill; three-stop pill; no radio discs.
- Unset / inherit: knob middle; track dashed; GET still omits `vals` (you do not touch GET).
- Bind / stamp / safeguard / apply files unchanged (diff empty).

Captain does not certify Cognos. Dual review next. Do not stamp `Implemented`.

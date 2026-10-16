# Fix Spec: `kdbControl` framework visual structure parity

This is a focused visual-structure fix after screenshot review of framework tranche 2.

Do not add business behavior. Fix shell/header/toggle/section structure only.

---

## A. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/harness/css/kdb-control-harness-base.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice4.css
TEST/kdbControl-port/harness/index.html
TEST/kdbControl-port/harness/adapters/createMockKdb.js
TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js
TEST/kdbControl-port/kdbControl/framework/buildControlMainToggles.js
TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js
TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js
```

Prefer CSS-only changes where possible. Builder changes are allowed for the specific structural corrections below.

Do not change reducer, controller, public API, runtime cleanup, event bus, services, Cognos, state shape, contracts, rules, templates or legacy files.

---

## B. Required visual-structure fixes

### D1 — Header icons must use image assets, not characters

The current header uses character/glyph placeholders. Use real image assets from `_______KDB3/KDB3/images`.

Required:

- Use `settings.svg` for the settings button.
- Use `info.svg` for the info button.
- If the current harness cannot load legacy paths directly, copy no assets; instead reference the legacy image path from the harness relative to `TEST/kdbControl-port/harness/index.html` in the mock/sandbox context, or expose image paths via mock `_KDB.config`.
- Header icon elements remain inert except settings visual toggle; no Cognos, no navigation, no external link behavior.
- Use current English/BEM technical classes:
  - `.kdb-control__header-actions`
  - `.kdb-control__header-icon-button`
  - `.kdb-control__header-icon`
  - `.kdb-control__header-icon-settings`
  - `.kdb-control__header-icon-info`

Allowed behavior:

- Clicking the settings icon may dispatch the existing visual-only `ACTION_FRAMEWORK_SELECT_PANEL` with `panelId: "settings"`.
- The info icon must remain inert.

### D2 — No separate text `Einstellungen` main toggle

Legacy has main toggles for `Kennzahlen` and `Toolbox`; settings is accessed through the settings icon.

Required:

- `buildControlMainToggles.js` must render only two top toggles:
  - visible label `Kennzahlen`, technical `data-panel-id="metrics"`;
  - visible label `Toolbox`, technical `data-panel-id="toolbox"`.
- Remove the text `Einstellungen` main toggle.
- Do not remove the settings panel itself; it is opened through the header settings icon.

### D3 — Toolbox must have exactly three section buttons

Toolbox panel must show three expandable section buttons:

- `Kommentar`
- `Tab`
- `Kopfzeile/Fußzeile`

Required technical section ids:

- `toolboxComments`
- `toolboxTabs`
- `toolboxHeaderFooter`

Each button opens its own empty subcontainer / section body. Do not add the real inputs/radios/actions yet.

### D4 — Settings must have exactly four section buttons

Settings panel must show four expandable section buttons:

- `Dashboard`
- `Diagramme`
- `Kommentare`
- `Steuerungspanel`

Required technical section ids:

- `settingsDashboard`
- `settingsCharts`
- `settingsComments`
- `settingsControlPanel`

Each button opens its own empty subcontainer / section body. Do not add the real inputs/dropdowns/radios yet.

### D5 — Collapse bar width and arrow direction

Current grey bar is too wide and arrow direction is wrong.

Required:

- Right collapse bar is a narrow vertical strip comparable to legacy (`~30px`).
- Bar remains vertical when collapsed; it must not lay out horizontally.
- Expanded state arrow should visually point left (collapse direction).
- Collapsed state arrow should visually point right (expand direction).
- Keep existing state and action: `isCollapsed` only.
- If using text arrows, use CSS or text consistently; do not add behavior.

### D6 — Collapsed layout must keep vertical bar upright

When collapsed, only the content/header/toggles/panel area should hide or shrink; the right bar remains full-height and vertical.

Required:

- CSS grid must keep the collapse bar grid area spanning full shell height.
- Do not rotate the entire bar.
- Only the arrow glyph/icon direction changes.

### D7 — Sub-subcontainer primitives are later tranches

Inputs, radio buttons, dropdowns and action controls inside toolbox/settings subcontainers are **not** part of this fix.

Required:

- Leave section bodies empty or with neutral placeholder space.
- Do not add header/footer toggles, tab radio tools, dashboard input rows, diagram/comment/control-panel settings, real actions or new state.
- The primitive gallery from tranche 1 may remain hidden/demoted for visual parity.

---

## C. Rules to apply

- `naming.mdc` — technical ids/classes English; German only visible labels.
- `dom.mdc` — builders create inert DOM only; no state mutation in builders.
- `state.mdc` — no state-shape changes.
- `module-public-api.mdc` — no public API changes.
- `events.mdc` — no event bus emissions.
- `runtime.mdc` — no runtime cleanup changes.
- `amd.mdc` — AMD shape and no nested listener functions if any JS is touched.
- Strategy B — no legacy class shims; use current selectors and current technical names.

---

## D. Acceptance criteria

1. Header shows image-based settings and info icons from legacy image assets.
2. Header settings icon opens the settings panel using existing visual dispatch; info icon is inert.
3. Main top toggles are exactly `Kennzahlen` and `Toolbox`; no text `Einstellungen` main toggle.
4. Toolbox panel contains exactly three section buttons: `Kommentar`, `Tab`, `Kopfzeile/Fußzeile`.
5. Settings panel contains exactly four section buttons: `Dashboard`, `Diagramme`, `Kommentare`, `Steuerungspanel`.
6. Section bodies are empty/inert; no input/radio/dropdown/action content is added in subcontainers.
7. Collapse bar is narrow, vertical, full-height, and does not rotate into a horizontal bar when collapsed.
8. Arrow direction is left in expanded state and right in collapsed state.
9. No new events, Cognos calls, services, public API, reducer actions, state shape, `controlDefinitions[]`, `registerControl` or `registerCustomControl`.
10. No legacy class shims or German technical ids/classes/values are added.
11. `ReadLints` on touched JS is clean.

---

## E. Reporting template

Report:

1. Files changed.
2. D1-D7 fix summary.
3. D1-D11 acceptance pass/fail.
4. Deviations, or `none`.
5. New screenshot / manual visual result summary.


# Fix Spec 2: `kdbControl` framework visual structure parity

This is a focused follow-up after screenshot review of `kdbControl-framework-visual-structure-fix-spec.md`.

Fix only the visual and code-discipline deviations listed here.

---

## A. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/harness/css/kdb-control-harness-base.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css
TEST/kdbControl-port/kdbControl/framework/buildControlMainBlocks.js
TEST/kdbControl-port/kdbControl/framework/syncFrameworkViewFromState.js
```

Do not change reducer, controller, public API, events, services, Cognos, state shape, contracts, rules, templates or legacy files.

---

## B. Required fixes

### D1 — Section buttons must sit above their content containers

Current toolbox/settings section buttons are rendered as large boxes that contain the section body. Legacy shape is: button first, then that button opens a separate content container below it.

Required:

- In `buildControlMainBlocks.js`, represent each toolbox/settings section as:
  - a section button/head (`data-section-id`);
  - a separate empty section body/container below it.
- The body must visually appear below the selected button, not inside the button box.
- Section bodies stay empty/inert in this tranche.
- Keep exact labels:
  - Toolbox: `Kommentar`, `Tab`, `Kopfzeile/Fußzeile`.
  - Settings: `Dashboard`, `Diagramme`, `Kommentare`, `Steuerungspanel`.
- Keep exact technical ids:
  - `toolboxComments`, `toolboxTabs`, `toolboxHeaderFooter`.
  - `settingsDashboard`, `settingsCharts`, `settingsComments`, `settingsControlPanel`.

### D2 — Selected section button uses underline only

Current selected/section visual looks like a large bordered box. Legacy selected button uses underline.

Required:

- Add selected styling to `.kdb-control__section-head` when its section is open.
- Preferred class: `kdb-control_section-head_selected`.
- `syncFrameworkViewFromState.js` may add/remove this class while it already syncs `kdb-control_section_open`.
- Do not introduce new state.

### D3 — Settings icon selected state is underline only

Current settings icon selected state draws a whole square/outline.

Required:

- Remove any square/outline selected styling from `.kdb-control__header-icon-settings.kdb-control_selected`.
- Add only an underline below the settings icon when selected.
- Info icon remains inert and never selected.

### D4 — Settings and info icons must be visually equal size

Required:

- Both icon buttons/wrappers use same width/height.
- Both contained images use same width/height and object-fit.
- No icon should look visually larger because of wrapper padding, outline, line-height or default button styling.

### D5 — Collapse side bar must stay vertical in open and collapsed state

Current screenshot shows the grey side bar becoming horizontal / protruding horizontally.

Required:

- The grey collapse strip must stay a vertical right-side strip in both open and collapsed state.
- Do not rotate the bar element.
- Only arrow glyph direction may change.
- Use grid-area / height / align-self fixes as needed.
- Keep approximate width around `30px`.

### D6 — Code discipline: no nested listener and no AbortSignal expando

`syncFrameworkViewFromState.js` currently contains:

- a nested function inside `addEventListener`;
- a custom flag on `AbortSignal`.

Required:

- Move header settings click handler to AMD factory scope.
- Do not define functions inside `__controller`, callbacks, or executable flow.
- Do not store custom flags on `AbortSignal`.
- Store any "wired once" flag under `_KDB.runtime.kdbControl`, for example `frameworkHeaderSettingsWired`.
- Cleanup remains via `abortControllers.frameworkView`.

---

## C. Rules to apply

- `amd.mdc` — factory-scope handlers only; no nested listener functions.
- `runtime.mdc` — technical flags/context under `_KDB.runtime.kdbControl`, not on `AbortSignal` or DOM nodes.
- `dom.mdc` — builders create inert DOM; sync mutates DOM classes only.
- `naming.mdc` — English technical ids/classes; German labels allowed.
- `state.mdc` — no state-shape changes.
- `events.mdc` — no event bus emission.
- `module-public-api.mdc` — no API changes.
- Strategy B — no legacy class shims.

---

## D. Acceptance criteria

1. Section buttons appear above separate empty content containers.
2. Selected section button is indicated by underline only.
3. Settings icon selected state is underline only, no outline/square.
4. Settings and info icons are visually equal size.
5. Collapse bar is vertical in both open and collapsed states.
6. Arrow points left in expanded state and right in collapsed state.
7. No nested function declarations inside `__controller`, callbacks or `addEventListener` calls.
8. No custom properties on `AbortSignal` or DOM nodes for framework wiring.
9. Any wiring flag lives under `_KDB.runtime.kdbControl`.
10. No new behavior beyond existing visual dispatch, no events, Cognos, services, API, reducer action or state-shape changes.
11. `ReadLints` on touched JS is clean.

---

## E. Reporting template

Report:

1. Files changed.
2. D1-D6 fix summary.
3. D1-D11 acceptance pass/fail.
4. Deviations, or `none`.
5. New screenshot / manual visual result summary.


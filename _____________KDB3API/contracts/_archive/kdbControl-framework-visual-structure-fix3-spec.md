# Fix Spec 3: `kdbControl` framework visual structure parity

This is a focused CSS/structure microfix after screenshot review of `kdbControl-framework-visual-structure-fix2-spec.md`.

Fix only the visual deviations listed here. Do not add behavior.

---

## A. Files in scope

Only these files may be changed:

```txt
TEST/kdbControl-port/harness/css/kdb-control-harness-base.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice1.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice2.css
TEST/kdbControl-port/harness/css/kdb-control-framework-parity-slice3.css
TEST/kdbControl-port/kdbControl/framework/buildControlShell.js
TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js
```

Prefer CSS-only changes. Touch builders only if a spacer or wrapper is structurally required.

Do not change reducer, controller, event names, public API, state shape, runtime cleanup, Cognos, services, contracts, rules, templates or legacy files.

---

## B. Required fixes

### D1 — Top toggles and section buttons must share the same visual style

Current `Kennzahlen` / `Toolbox` buttons look different from `Dashboard` / `Diagramme` / section buttons.

Required:

- Make top toggles and section heads visually the same button family:
  - same height / min-height;
  - same background;
  - same border-radius;
  - same font weight;
  - same shadow / border treatment;
  - same selected underline style.
- `Kennzahlen` and `Toolbox` remain top-level buttons; section buttons remain section heads. Only visual style is aligned.

### D2 — Settings icon selected underline is missing

When settings is selected, there must be a black underline below the settings icon.

Required:

- `.kdb-control__header-icon-settings.kdb-control_selected` must show underline only.
- The underline must be visible under the icon, not around the whole button.
- No outline or square selected state.
- Info icon remains inert and never selected.

### D3 — Settings icon and info icon must look equal

The settings icon currently appears smaller / has different rounding than the info icon.

Required:

- Make the settings and info icon wrappers visually equal.
- If needed, make the settings image slightly larger inside its wrapper so the visible glyph matches the info icon.
- Keep both icons vertically centered on the same baseline.
- Use current classes only; no legacy class shims.

### D4 — Collapse bar must be outside / beside the dashboard content, full height

Current grey bar appears inside the dashboard container / content area. It must sit as a full-height right-side strip beside the content.

Required:

- The shell grid must allocate the collapse strip as a right column beside header/toggles/content, not inside the content panel.
- The bar must span the full shell height from top to bottom.
- The bar width remains approximately `30px`.
- The content panel and toolbox/settings panels must not draw underneath or around the bar.
- Collapsed and expanded states both keep the bar vertical and full height.

### D5 — Toolbox container should have no visible outer border

Current toolbox panel/container shows a visible border around all toolbox content. Legacy comparison expects no visible outer toolbox border.

Required:

- Remove visible border from the toolbox panel outer container.
- Section buttons may still have their own button chrome.
- Empty section body containers may remain visually subtle only when open.

### D6 — Missing vertical spacer between header line and top buttons

Legacy has an empty vertical area between the title/separator line and the `Kennzahlen` / `Toolbox` buttons.

Required:

- Add vertical spacing after the header separator before main toggles.
- Prefer CSS margin/grid row spacing.
- If CSS alone cannot create the needed area, add a current-named inert spacer in `buildControlShell.js`, e.g. `.kdb-control__header-spacer`.
- Do not add behavior.

---

## C. Rules to apply

- `dom.mdc` — builders may add inert structural DOM only; no state mutation or listeners.
- `naming.mdc` — technical names/classes English; German labels allowed.
- `feature-structure.mdc` — keep CSS slices focused; do not copy full legacy CSS.
- `state.mdc` — no state changes.
- `module-public-api.mdc` — no API changes.
- `events.mdc` — no event emissions.
- `runtime.mdc` — no runtime cleanup changes.
- Strategy B — no legacy class shims; map visual concepts onto current selectors.

---

## D. Acceptance criteria

1. `Kennzahlen` / `Toolbox` buttons visually match section buttons (`Dashboard`, `Diagramme`, etc.) as one button family.
2. Selected settings icon has visible underline only.
3. Settings and info icons look equal-sized and vertically centered.
4. Collapse bar is a full-height right-side vertical strip outside/beside the content, not inside the panel.
5. Toolbox panel outer container has no visible border.
6. There is visible empty vertical spacing between header separator and top toggles.
7. No behavior/API/state/reducer/runtime/event/Cognos/service changes.
8. No legacy class shims and no German technical ids/classes/values.
9. `ReadLints` on touched JS is clean.

---

## E. Reporting template

Report:

1. Files changed.
2. D1-D6 fix summary.
3. D1-D9 acceptance pass/fail.
4. Deviations, or `none`.
5. New screenshot / manual visual result summary.


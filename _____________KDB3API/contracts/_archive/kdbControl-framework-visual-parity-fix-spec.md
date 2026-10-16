# Fix Spec: `kdbControl` framework visual parity screenshot deviations

This is a focused visual-parity fix for framework tranche 2 after user screenshot review.

Do not add behavior. Fix only the visual differences listed below.

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
TEST/kdbControl-port/kdbControl/framework/buildControlHeader.js
TEST/kdbControl-port/kdbControl/framework/buildControlPrimitiveGallery.js
```

Prefer CSS-only fixes. Touch `buildControlHeader.js` only for missing inert header icons. Touch `buildControlPrimitiveGallery.js` only if the primitive gallery must be hidden/moved structurally and CSS cannot do it cleanly.

Do not change reducer, controller, public API, events, services, Cognos, runtime cleanup, state shape, contract, rules, templates or legacy files.

---

## B. Screenshot findings to fix

User compared current harness against legacy kdbControl. Current result is not CP-2 green for visual parity.

### D1 — Shell height and proportions too small

Current harness is compact and low. Legacy panel is tall with a large empty content region.

Required fix:

- Make the harness control panel use a tall legacy-like height at the 1280x720 checkpoint.
- Target visual: content area should occupy most of the shell height, similar to the old screenshot.
- Root shell should keep the right collapse strip full-height.
- Avoid hardcoding viewport-specific magic if a simple `min-height` / grid layout is enough.

Suggested CSS target:

- `#kdb-control-root.kdb-control`: increase `min-height` substantially (around legacy panel height in the screenshot), preserve grid areas.
- `#kdb-control-content.kdb-control__content`: fill available height.
- Visible panel containers: fill the content area.

### D2 — Right collapse strip and arrow do not match legacy

Current strip is short and the arrow sits near the middle of a compact panel. Legacy has a tall grey strip at the full right side with a centered dark arrow.

Required fix:

- Ensure `#kdb-control-arrow.kdb-control__collapse-arrow` spans all shell rows / full shell height.
- Use a wider, legacy-like grey strip and central arrow presentation.
- Keep behavior unchanged: existing collapse button still dispatches the existing action.

### D3 — Header icons missing

Legacy header shows settings/info icons beside `Dashboard-Steuerung`. Current harness only shows the title.

Required fix:

- Add inert, user-facing header icons in `buildControlHeader.js`.
- Icons may be text / CSS glyph placeholders if image assets are not available.
- They must not trigger behavior, events, Cognos, services or API calls.
- Use current English/BEM technical classes, e.g. `.kdb-control__header-icon`, `.kdb-control__header-icon-settings`, `.kdb-control__header-icon-info`.
- German/user-facing titles are allowed.

### D4 — Main toggles layout too close to header / wrong spacing

Legacy has more vertical spacing: title, separator line, then top toggles lower in the panel.

Required fix:

- Add vertical spacing between header separator and main toggles.
- Keep current three buttons (`Kennzahlen`, `Toolbox`, `Einstellungen`) unless the execution spec says otherwise; do not remove `Einstellungen`.
- Keep technical panel id `metrics`; visible label may stay `Kennzahlen`.

### D5 — Primitive gallery is visible in the metrics panel and harms parity

Current screenshot shows inert button/input/radio/dropdown immediately in the main content. Legacy screenshot shows a large empty panel area for this comparison.

Required fix:

- Hide or visually demote the primitive gallery for the visual parity checkpoint.
- Preferred: CSS hide `.kdb-control__primitive-gallery` in the visual parity CSS while preserving the DOM for later debug if needed.
- If hiding breaks acceptance of tranche 1 primitive tests, instead move it into a visually secondary debug area inside the panel, clearly less prominent.
- Do not remove reducer/state/actions for placeholder primitives.

### D6 — Panel chrome / empty area too small

Legacy content panel has rounded border and large empty body. Current panel wraps tightly around primitives.

Required fix:

- Make `.kdb-control__panel.KDB_visible` fill the content area.
- Give visible panel containers a large min-height and rounded border.
- Section bodies remain inert; no behavior changes.

---

## C. Rules to apply

- `dom.mdc` — visual changes may alter builders only for inert DOM; no state mutation in builders, no listener changes.
- `naming.mdc` — technical ids/classes English; German only user-facing labels/titles.
- `feature-structure.mdc` — keep CSS slices focused; do not create a giant copied legacy CSS file.
- `state.mdc` — no state shape changes.
- `module-public-api.mdc` — no public API changes.
- `events.mdc` — no event emissions.
- `runtime.mdc` — no runtime cleanup changes.
- Strategy B contract delta — no legacy class shims; map concepts onto current selectors.

---

## D. Acceptance criteria

1. No legacy classes are added to current DOM solely as shims.
2. No technical `kennzahlen` ids/classes/values are introduced.
3. No public API, reducer action, state shape, event, service, Cognos or runtime cleanup changes.
4. Header shows inert settings/info-style icons beside the title.
5. At 1280x720, shell is tall with a full-height right collapse strip and large empty content panel.
6. Primitive controls are hidden or visually secondary for the visual parity checkpoint.
7. Mount, panel toggles, section toggles, collapse/expand and Destroy still work.
8. `ReadLints` on touched JS is clean.

---

## E. Reporting template

Report:

1. Files changed.
2. D1-D6 fix summary.
3. D1-D8 acceptance pass/fail.
4. Any deviations.
5. New screenshot / manual visual result summary.


# Execution Spec: `dashboardPdf` (`legend swatch clone chips`)

> Cheap-AI implementation spec. Architectural decisions live in `contracts/dashboardPdf-legend-swatch-clone-contractdelta.md`. Do not invent behavior. Do not copy missing KDB2 helper files.

---

**Status:** `Frozen` — executed 2026-09-02; **do not re-run**. Layout constants in this spec (`18 / r=7 / gap −2 / top 4`) are **superseded**. Canonical: `dashboardPdf-legend-chrome-qa-contractdelta.md` freeze `12 / 7 / 1 / 1`.
**Module / contract:** `_____________KDB3API/contracts/dashboardPdf.md`
**Delta:** `_____________KDB3API/contracts/dashboardPdf-legend-swatch-clone-contractdelta.md`
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent
**Reviewer:** supervising coordinator (this session)

---

## Section A. Pre-flight read list

Read each file below **before** producing any output file. Echo a one-sentence summary of each. Then implement **immediately in the same turn** (coordinator accepts the echo as part of review; do not wait for a human).

1. `_____________KDB3API/.cursor/rules/kdb-object.mdc`
2. `_____________KDB3API/.cursor/rules/state.mdc`
3. `_____________KDB3API/.cursor/rules/runtime.mdc`
4. `_____________KDB3API/.cursor/rules/module-public-api.mdc`
5. `_____________KDB3API/.cursor/rules/events.mdc`
6. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
7. `_____________KDB3API/.cursor/rules/naming.mdc`
8. `_____________KDB3API/.cursor/rules/error-handling.mdc`
9. `_____________KDB3API/.cursor/rules/dom.mdc`
10. `_____________KDB3API/.cursor/rules/amd.mdc`
11. `_____________KDB3API/.cursor/lifecycleVocabulary.md`
12. `_____________KDB3API/contracts/dashboardPdf.md`
13. `_____________KDB3API/contracts/dashboardPdf-legend-swatch-clone-contractdelta.md`
14. This execution spec itself.

Also read (implementation inputs, not extra summaries):

- `_____________KDB3API/KDB3/js/core/services/dashboardPdf/effects/captureCanvasBounded.js` (edit target)
- `_____________KDB3API/KDB3/js/core/services/dashboardPdf/effects/manageCaptureChrome.js` (factory-scope helper pattern)
- `_____________KDB3API/KDB3/css/widgets/widgetVis.css` (append live rule at end)
- `_____________KDB3API/contracts/dashboardPdf-capture-chrome-hide-contractdelta.md` (onclone is not chrome hide)

Do **not** read or modify `widgetVis/view/legend/**`. Do **not** patch `html2canvas.min.js`.

---

## Section B. Folder tree

```
_____________KDB3API/KDB3/js/core/services/dashboardPdf/
  config/
    legendSwatchCloneLayout.js          (new)
  effects/
    shouldSkipLegendSwatchSvg.js        (new)
    readLegendSwatchRgbColor.js         (new)
    placeLegendSwatchChipInClone.js     (new)
    inlineLegendSwatchUsesInClone.js    (new)
    captureCanvasBounded.js             (edit)
_____________KDB3API/KDB3/css/widgets/
  widgetVis.css                         (edit — append only)
_____________KDB3API/contracts/
  dashboardPdf.md                       (edit — one html2canvas bullet)
```

Do not create other files. Do not add CSS to `pdfCapture.css` or `leftoverWidgets.css` or `kdb.css`.

---

## Section C. Per-file specifications

#### `config/legendSwatchCloneLayout.js`

- **Role**: pure config constants
- **Lines**: target 20–40 (hard 80)
- **AMD imports**: none
- **Entry**: none. Factory returns one object literal:

```js
{
  SLOT_PX: 18,
  VIEWBOX: 16,
  CIRCLE_CX: 8,
  CIRCLE_CY: 8,
  CIRCLE_R: 7,
  SLOT_GAP_PX: -2,
  HOST_TOP_PX: 4,
  SVG_NS: "http://www.w3.org/2000/svg"
}
```

- **Rules to apply**:
  - `amd.mdc` — one `define`, one return value.
  - `naming.mdc` — `UPPER_SNAKE_CASE` constants.
  - `feature-structure.mdc` — `config/` declarative.

#### `effects/shouldSkipLegendSwatchSvg.js`

- **Role**: effect predicate (pure DOM inspect on **clone** node)
- **Lines**: target 50–90 (hard 150)
- **AMD imports**: none
- **Factory-scope**:
  - `function hasSvgIconClass(_node)` — walk self+ancestors; true if `classList.contains("svgIcon")`.
  - `function hasEllipsisId(_svg)` — svg id or ancestor id matches `/ellipsis/i`.
  - `function hasUseElement(_svg)` — `_svg.querySelector("use")` exists.
  - `function isZeroSize(_svg)` — `getBoundingClientRect` width or height `<= 0` (guard missing `getBoundingClientRect`).
  - `function shouldSkipLegendSwatchSvg(_svg)` — entry.
- **Entry body**:
  1. `try/catch`. Catch: `console.error("[dashboardPdf.shouldSkipLegendSwatchSvg] failed", err)` → return `true` (skip).
  2. If `!_svg` → `true`.
  3. Skip if svgIcon, ellipsis, no `<use>`, or zero-size.
  4. Do **not** skip on `aria-checked="false"`.
- **Return**: `shouldSkipLegendSwatchSvg`
- **Rules to apply**:
  - `amd.mdc` — factory-scope named helpers; no nested functions inside entry.
  - `naming.mdc` — `_svg` boundary prefix; booleans `is*` / `has*`.
  - `error-handling.mdc` — try/catch; skip on failure; no rethrow.
  - `dom.mdc` — clone node only; no live `_KDB.runtime` writes.

#### `effects/readLegendSwatchRgbColor.js`

- **Role**: effect — resolve explicit rgb string
- **Lines**: target 60–100 (hard 150)
- **AMD imports**: none
- **Factory-scope**:
  - `function isUnusableColor(_value)` — true for empty, `transparent`, `currentColor` (case-insensitive, trimmed). Also true for `rgba(0, 0, 0, 0)` / `rgba(0,0,0,0)`.
  - `function toRgbString(_value)` — if already `rgb(n, n, n)` or `rgba(...)` with alpha 1, normalize to `rgb(r, g, b)`. If hex `#rrggbb` or `#rgb`, convert to `rgb(...)`. Else return `""`.
  - `function readLegendSwatchRgbColor(_clonedDocument, _svg)` — entry.
- **Entry body**:
  1. `try/catch`. Catch: log `[dashboardPdf.readLegendSwatchRgbColor] failed` → return `""`.
  2. Read `_svg.style.color` first; `toRgbString`; if usable, return it.
  3. Else `view = _clonedDocument && _clonedDocument.defaultView`; if `view && view.getComputedStyle`, read computed **color** (not fill) of `_svg`; `toRgbString`.
  4. If unusable → `""`.
  5. Never read computed `fill`. Never read `.Swatch` color.
- **Return**: `readLegendSwatchRgbColor`
- **Rules to apply**:
  - `amd.mdc` / `naming.mdc` / `error-handling.mdc` as above.
  - `feature-structure.mdc` — colour job only.

#### `effects/placeLegendSwatchChipInClone.js`

- **Role**: effect — slot + overlay + path A/B
- **Lines**: target 90–140 (hard 150)
- **AMD imports**:
  - `"./../config/legendSwatchCloneLayout.js"`
- **Factory parameters**: `_legendSwatchCloneLayout`
- **Factory-scope**:
  - `function readUseHref(_svg)` — `use.getAttribute("href") || use.getAttribute("xlink:href") || ""`.
  - `function readDataShape(_slot)` — slot `getAttribute("data-shape")` or `""`.
  - `function isCircleShape(_slot, _href)` — data-shape `circle` or href contains `circle` (case-insensitive).
  - `function isRectShape(_slot, _href)` — data-shape `square`/`rect` or href contains `square` or `rect`.
  - `function applySlotStyle(_slot, _layout)` — relative, 18×18, flex-shrink 0, padding 0, border 0, margin-right −2px. Do not set overflow hidden on slot.
  - `function createOverlayHost(_clonedDocument, _layout)` — `span`, absolute, left 0, top 4px, 18×18.
  - `function createFilledShape(_clonedDocument, _layout, _rgb, _kind)` — `createElementNS` circle or rect; set fill `_rgb`; viewBox on parent SVG not here. Circle attrs cx/cy/r. Rect: `x=1 y=1 width=14 height=14` (fits 16 viewBox).
  - `function createChipSvg(_clonedDocument, _layout, _rgb, _kind)` — svg NS, viewBox `0 0 16 16`, **attributes** width/height `"18"`, clear any position/left/top/inset via `style.removeProperty` after insert if needed; append filled shape; **no** style width/height 100%.
  - `function createFallbackSpan(_clonedDocument, _layout, _rgb, _isCircle)` — background-color `_rgb`; 18×18; `border-radius: 50%` only if `_isCircle`.
  - `function placeLegendSwatchChipInClone(_clonedDocument, _svg)` — entry.
- **Entry body**:
  1. `try/catch`. Catch: log `[dashboardPdf.placeLegendSwatchChipInClone] failed` → return (no throw).
  2. Slot = `_svg.closest("[role=checkbox]")` or `_svg.parentElement`. If missing, return.
  3. `applySlotStyle(slot, layout)`.
  4. Create overlay host; append to slot.
  5. href + data-shape → path A circle, path A rect, or path B.
  6. Path A: `createChipSvg`, append to host; **remove original `_svg` from DOM** (or empty slot’s previous svg so A and B are never both present). Clear position/left/top/inset on the new svg.
  7. Path B: `createFallbackSpan` into host; remove original `_svg`. Circle fallback span only when `isCircleShape` would have been true but path A was not used — for true path B (non-circle, non-rect) **no** border-radius.
  8. Do not set overflow visible on `li` / `ul` / `.Legend`.
- **Return**: `placeLegendSwatchChipInClone`
- **Rules to apply**:
  - `amd.mdc` — all helpers factory-scope; no IIFE.
  - `naming.mdc` — verb+noun file; `_` on boundary args.
  - `error-handling.mdc` — try/catch no rethrow.
  - `dom.mdc` — clone document `createElement` / `createElementNS` only.
  - `feature-structure.mdc` — ≤150 lines; split already by job.

#### `effects/inlineLegendSwatchUsesInClone.js`

- **Role**: effect orchestrator for clone rewrite
- **Lines**: target 70–110 (hard 150)
- **AMD imports** (order):
  - `"./shouldSkipLegendSwatchSvg.js"`
  - `"./readLegendSwatchRgbColor.js"`
  - `"./placeLegendSwatchChipInClone.js"`
- **Factory parameters**: `_shouldSkipLegendSwatchSvg`, `_readLegendSwatchRgbColor`, `_placeLegendSwatchChipInClone`
- **Factory-scope**:
  - `function applyLegendClonePacking(_svg)` — closest `.Legend` → `overflow:hidden !important`; closest `li` → `justify-content:flex-start !important` and `overflow:hidden !important`. No width writes.
  - `function rewriteOneLegendSwatch(_clonedDocument, _svg)` — skip / colour / place / packing; own try/catch; log `[dashboardPdf.rewriteOneLegendSwatch] failed`; no rethrow.
  - `function inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement)` — entry.
- **Entry body**:
  1. Outer `try/catch`. Catch: log `[dashboardPdf.inlineLegendSwatchUsesInClone] failed`; **no rethrow**.
  2. If `!_clonedElement || typeof _clonedElement.querySelectorAll !== "function"` return.
  3. `svgs = _clonedElement.querySelectorAll(".Legend .swatchListWrapper svg")` — **this selector only**.
  4. Loop; call `rewriteOneLegendSwatch` per node.
- **`rewriteOneLegendSwatch` body**:
  1. If `_shouldSkipLegendSwatchSvg(_svg)` return.
  2. `rgb = _readLegendSwatchRgbColor(_clonedDocument, _svg)`; if `!rgb` return (skip unusable colour, including currentColor).
  3. `_placeLegendSwatchChipInClone(_clonedDocument, _svg)`.
  4. `applyLegendClonePacking(_svg)` — if `_svg` was removed, packing must run **before** remove, **or** `placeLegendSwatchChipInClone` must return the slot/`li`. **Required:** apply packing using slot/`li` resolved **before** removing `_svg`. Pass `_svg` into packing first, then place (place removes svg). Order in `rewriteOneLegendSwatch`: skip, colour, **packing from `_svg`**, then place.
- **Return**: `inlineLegendSwatchUsesInClone`
- **Rules to apply**:
  - `amd.mdc` — ≤6 imports (3).
  - `error-handling.mdc` — outer + per-item catch, no rethrow, no silent catch.
  - `naming.mdc` — verb+noun.
  - `feature-structure.mdc` — effects folder; no `_KDB.cognosAPI`.
  - `cognos-adapter` — clone only; no live Cognos DOM.

#### `effects/captureCanvasBounded.js` (edit)

- **Role**: existing capture effect
- **Lines**: stay ≤120 (hard 150). Current ~65.
- **AMD imports**: add `".../effects/inlineLegendSwatchUsesInClone.js"` as `"./inlineLegendSwatchUsesInClone.js"` (same folder).
- **Factory parameters**: `_inlineLegendSwatchUsesInClone`
- **Lift to factory scope** (do not leave inline in the options object):
  - `function shouldIgnoreCaptureElement(_element)` — `return !!(!_element ? false : _element.id === "kdb-control-root")` which must equal existing `!!(element && element.id === "kdb-control-root")`. try/catch: log, return `false`.
  - `function onCloneCaptureDocument(_clonedDocument, _clonedElement)` — try `_inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement)`; catch log `[dashboardPdf.onCloneCaptureDocument] failed`; **no rethrow**.
- **Keep** nested `cleanup` / `settle` / `onAbort` inside `captureCanvasBounded` (grandfathered closure over `settled`). Do not refactor the timeout/abort race.
- **html2canvas options** must be exactly:

```js
{
  scale: 2,
  useCORS: true,
  logging: false,
  ignoreElements: shouldIgnoreCaptureElement,
  onclone: onCloneCaptureDocument
}
```

Do **not** set `foreignObjectRendering`. Do **not** change timeout 60000. Do **not** change `scale`.

- **Rules to apply**:
  - `amd.mdc` — new callbacks factory-scope; 1 import.
  - `error-handling.mdc` — onclone never rethrows.
  - `feature-structure.mdc` — file stays under 150.

#### `KDB3/css/widgets/widgetVis.css` (edit)

- Append at end of file, nothing else:

```css
.Legend .swatchListWrapper li {
    justify-content: flex-start;
}
```

- Do not add `display:flex`, `!important`, `fit-content`, or overflow visible.
- **Rules to apply**: `naming.mdc` CSS already uses existing Cognos class names (`.Legend`, `.legendCaption` are host classes — do not rename). `dom.mdc` — this is a selector override, not a live JS mutation.

#### `contracts/dashboardPdf.md` (edit)

In Execution Contract step 5 html2canvas bullet, after `ignoreElements` clause, add: html2canvas `onclone` runs `inlineLegendSwatchUsesInClone` on the cloned capture root only (VIPR legend swatch `<use>` → self-contained chips); `onclone` errors are logged and must not reject the capture; live Cognos legend DOM is not mutated. Details: `dashboardPdf-legend-swatch-clone-contractdelta.md`. Keep chrome-hide as live class; `onclone` is not the hide path.

---

## Section D. Reducer behavior table

None. dashboardPdf has no reducer for this delta.

---

## Section E–I

None. No new public API, selectors, harness, or mocks.

---

## Section J. Acceptance criteria (self-verification)

1. Every file in Section B exists (new) or was edited as specified.
2. AMD full-compact; no ES modules.
3. No new file > 150 lines.
4. No nested function **inside** new entry functions (grandfathered `cleanup`/`settle` in `captureCanvasBounded` only).
5. Selector string `.Legend .swatchListWrapper svg` appears exactly once as the query (in `inlineLegendSwatchUsesInClone`).
6. No `foreignObjectRendering`.
7. No writes to `widgetVis/view/legend/**`, `html2canvas.min.js`, `pdfCapture.css`, `leftoverWidgets.css`, `kdb.css`.
8. `onclone` / inline / per-svg / place / skip / colour: catch without rethrow.
9. Live CSS is only the one `flex-start` rule in `widgetVis.css`.
10. Chip: slot 18px, overlay absolute `top: 4px`, SVG viewBox 16, circle r=7, no style 100%, no overflow visible on `.Legend`/`li`.
11. Report line counts + deviations.

---

## Section K. Forbidden actions

- Modify `.mdc` rules, `_template.md`, `_executionSpecTemplate.md`.
- Modify `widgetVis.md` or legend caption JS.
- Uncomment `kdb.css` global `li`.
- Add `.lgd-horizontal .Swatch li { width: fit-content }`.
- Page-wide `querySelectorAll("svg use")`.
- Mutate live `_root` in `onclone` (parameter is clone only; do not capture `_root` in the onclone closure for writes).
- Commit / push / git config.
- Invent overflow-visible “clip fix” or li width +10px.
- Skip Section A echo.

---

## Section L. Reporting template

1. Pre-flight echo (14 summaries).
2. File checklist (path, lines, matches spec | deviation).
3. Deviations with motivation.
4. Section J pass/fail.
5. Open questions.

---

## Section M. Reviewer handoff

Coordinator: verify echo, read every new/edited file, contract-vs-code, pitfall checklist (flex-flow chip, overflow visible, li width freeze, host-size from rect, r=38%, page-wide use, live DOM, currentColor, fit-content-as-color-fix, foreignObjectRendering, onclone throw, missing live flex-start).

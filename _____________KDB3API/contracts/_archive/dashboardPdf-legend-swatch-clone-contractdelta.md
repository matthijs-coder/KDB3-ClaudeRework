# Contract Delta: PDF clone-only VIPR legend swatch chips

> Product: html2canvas 1.4.1 paints legend **captions** but not Farbangabe (swatch SVG `<use href="#circle-…">`). Sprite `<symbol>` lives outside `.pagegenericPage`. Rewrite swatches **only** in the html2canvas clone. Do not mutate live Cognos legend DOM during export. Caption-text pipeline (`widgetVis` legend sanitizers) is unchanged.

---

**Status:** `Frozen` — PO vastenburg accepted Cognos PDF 2026-09-02 (“alles lijkt nu goed”). Canonical layout: `SLOT_PX 12`, `CIRCLE_R 7`, `SLOT_GAP_PX 1`, `HOST_TOP_PX 1` (`legendSwatchCloneLayout.js`). Do not restore MAG `18 / −2 / 4`.
**Parent:** `contracts/dashboardPdf.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-09-02
**Reviewed by:** PO vastenburg — Cognos PDF QA accepted 2026-09-02
**Related:** `dashboardPdf-legend-chrome-qa-contractdelta.md` (calibration + canvas-column wrapper hide); `dashboardPdf-capture-chrome-hide-contractdelta.md` (primary chrome hide remains live capture class)

---

## 0. Diagnosis (contract vs code)

| Layer | Status |
|---|---|
| `dashboardPdf.md` html2canvas options | Code **matches** (`scale:2`, `useCORS`, `logging:false`, `ignoreElements` `#kdb-control-root`). No `onclone`. |
| Chrome hide | Code **matches** live class `kdb-pdf-capturing`; `onclone` must not become the hide path. |
| Legend **caption text** (`widgetVis` `legendCaptionText.js`) | Logic **correct**. Out of scope. Do not change. |
| Legend **swatch color** in PDF | **Product gap.** Neither parent contract nor KDB3API code inlines `<use>` sprites. KDB2 helper `exportPdfLegendSwatchCloneHelpers.js` is **not** in this workspace; port from this delta, not from a missing file. |
| Live packing CSS | KDB3API has **no** live `.lgd-horizontal .Swatch li { width: fit-content }`. Global `li { display:flex; justify-content:center }` in `kdb.css` is **commented out**. Live `flex-start` is a **defensive** override only. Do **not** uncomment the global `li` rule. Do **not** add `fit-content`. |

Root cause (html2canvas 1.4.1): each `<svg>` is serialized alone. Clone fragment has `<use href="#id">` without the Cognos sprite `<symbol>` → empty swatch. Labels are HTML text. Plot marks are inline path/rect/canvas with real fill. `foreignObjectRendering: true` and “copy sprite into capture subtree” do **not** fix dangling `#id`. `currentColor` serializes as transparent. Use explicit `fill="rgb(…)"` / `background-color: rgb(…)`.

§0 is the **pre-implementation** snapshot. After freeze, `onclone` exists and chips + wrapper hide are in production (`legendSwatchCloneLayout.js` `12 / 7 / 1 / 1`).

---

## 1. Purpose

During each tab screenshot, `html2canvas` `onclone(clonedDocument, clonedElement)` replaces VIPR legend swatch `<use>` sprites with self-contained chips **inside the clone of `.pagegenericPage`**. Live dashboard DOM is not patched. A failed swatch rewrite logs and continues; it must not reject the tab capture.

---

## 2. Product

| Surface | Required |
|---|---|
| PDF tab with horizontal VIPR legend | Coloured chips (circle/rect or filled-span fallback); captions readable; Cognos packed `left`/`width` columns preserved (same start-x per column). |
| PDF clip | Legend text must **not** paint over the chart. Clip stays on `.Legend` and packed `li`. Slot overflow may be visible (small slot box only). |
| Chart series colours | Unchanged. |
| Toolbar / timer / warning SVG (`#time_32_v7`, `#warning--alt_32_v7`, `#move_32_v7`, `.svgIcon`) | Unchanged. |
| Live dashboard | `.Legend .swatchListWrapper li { justify-content: flex-start }`. Cognos packing intact. No `fit-content`. No global `li` flex uncomment. |
| One bad swatch | Must not blank the PDF tab / fail the export. |

---

## 3. Capture hook (clone only)

Owner: `dashboardPdf/effects/captureCanvasBounded.js`.

Keep existing options: `scale: 2`, `useCORS: true`, `logging: false`, `ignoreElements` → `#kdb-control-root`.

Add:

```js
onclone: onCloneCaptureDocument
```

`onCloneCaptureDocument(_clonedDocument, _clonedElement)` is a **factory-scope** named function. Body: `try { _hidePdfWidgetChromeInClone(_clonedElement); _inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement); } catch (err) { console.error("[dashboardPdf.onCloneCaptureDocument] failed", err); }` — **no rethrow**.

`clonedElement` is the clone of the capture root (`.pagegenericPage`). Query **only** that subtree.

Forbidden:

- live DOM writes during export (except the existing capture class on `#main`)
- `foreignObjectRendering: true`
- patching `html2canvas.min.js`
- `onclone` as primary hide for settings / leftover chrome (canvas-column wrappers: `hidePdfWidgetChromeInClone`, see QA delta)
- page-wide `svg use` / `.pagegenericPage svg use` selectors
- changing caption JS (`visDataLegendAndTooltipHelpers` / `widgetVis/view/legend/*`)

---

## 4. Selector, skip, colour

Selector (mandatory, only):

```js
_clonedElement.querySelectorAll(".Legend .swatchListWrapper svg")
```

If `_clonedElement` is missing, no-op.

**Skip** (do not rewrite). Do **not** skip `aria-checked="false"`:

- `.svgIcon` on the svg or an ancestor
- ancestor id or svg id contains `ellipsis` (case-insensitive)
- no `<use>` descendant
- zero-size box (`getBoundingClientRect` width or height `<= 0`)
- colour empty, `transparent`, or `currentColor`

**Colour** (explicit `rgb(r, g, b)` only):

1. `svg.style.color` if it is a usable rgb/hex
2. else `clonedDocument.defaultView.getComputedStyle(svg).color` (iframe window)
3. never computed `fill` (often black)
4. never `.Swatch { color: gray }`

Unusable colour → skip that svg.

---

## 5. Chip architecture (clone)

Two constraints: html2canvas often fails `position:absolute` **on the SVG** as a data-URL; putting that SVG in `li { display:flex }` flow pushes `.legendCaption` and clips it inside Cognos packed width. `overflow: visible` on `.Legend` / `li` / `ul` “fixes” clip by painting labels **over the chart** — forbidden.

**Pattern (A and B never on the same node):**

1. **In-flow SLOT** = existing `div[role=checkbox]` parent: `position:relative`, **fixed** size from `legendSwatchCloneLayout.js` `SLOT_PX` (not `max(16, getBoundingClientRect())`), `flex-shrink:0`, `padding:0`, `border:0`, `margin-right` from `SLOT_GAP_PX`. Slot overflow may be `visible`. Do not set overflow visible on `ul` / `.Legend`.
2. **Overlay HOST** = `span`, `position:absolute`, `left:0`, `top` from `HOST_TOP_PX` (px nudge, **not** `top:50%` + negative margin), same size as `SLOT_PX`.
3. **Path A (circle / square):** move or replace inner SVG into the host. Clear SVG `position` / `left` / `top` / `inset` (required for serialize). `viewBox="0 0 16 16"`. User units: circle `cx=8 cy=8 r` from `CIRCLE_R`; rect inset to the same 16 box. `fill="rgb(…)"`. Width/height **attributes** in px (`SLOT_PX`). **No** style `width/height: 100%`. `createElementNS("http://www.w3.org/2000/svg", "circle"|"rect")`.
4. **Path B (line / diamond / other):** host `span` with `background-color: rgb(...)`. `border-radius: 50%` only when the source `data-shape` or `<use href>` is a circle. Same slot/overlay contract. No SVG on that node.

Shape pick: `data-shape="circle"` or `href` contains `circle` → circle. Square/rect → rect. Else path B.

**Clone packing** (after chips, still clone-only):

- closest `.Legend`: `overflow: hidden !important`
- closest `li`: `justify-content: flex-start !important` and `overflow: hidden !important`

Forbidden packing “fixes”: enlarge `li` width; freeze `getBoundingClientRect()` as `width: Npx !important` (breaks Cognos `left: 0, 82, 164…`).

Constants (PO QA 2026-09-02, see `dashboardPdf-legend-chrome-qa-contractdelta.md`): slot/host **12** px; viewBox **16**; `r=7`; gap **1** px; host `top` **1** px. Overflow hidden on `.Legend` and packed `li`. Do not re-derive from live rects.

---

## 6. Live CSS (not capture-gated)

File: `KDB3/css/widgets/widgetVis.css` (always loaded; `pdfCapture.css` is `#main.kdb-pdf-capturing` only — wrong for live alignment).

```css
.Legend .swatchListWrapper li {
    justify-content: flex-start;
}
```

Do **not** add `display:flex` here (would introduce KDB2’s global-`li` flex fight). Do **not** add `.lgd-horizontal .Swatch li { width: fit-content !important }`. Do **not** uncomment `kdb.css` global `li`. Do **not** put this in `leftoverWidgets.css`.

---

## 7. Files

| Path | Change |
|---|---|
| `dashboardPdf/config/legendSwatchCloneLayout.js` | new — numeric constants |
| `dashboardPdf/effects/shouldSkipLegendSwatchSvg.js` | new |
| `dashboardPdf/effects/readLegendSwatchRgbColor.js` | new |
| `dashboardPdf/effects/placeLegendSwatchChipInClone.js` | new |
| `dashboardPdf/effects/inlineLegendSwatchUsesInClone.js` | new — query, loop, packing |
| `dashboardPdf/effects/hidePdfWidgetChromeInClone.js` | new — clone-side canvas-column wrapper hide (QA delta) |
| `dashboardPdf/effects/captureCanvasBounded.js` | edit — `onclone` hide then legend + lift `ignoreElements` |
| `KDB3/css/widgets/widgetVis.css` | live `flex-start` |
| `contracts/dashboardPdf.md` | html2canvas bullet: `onclone` legend chips |

No public API / state / events / runtime buckets. No `widgetVis` JS.

---

## 8. Error handling

- Outer `onclone` and `inlineLegendSwatchUsesInClone`: `try/catch`, `console.error` with `[dashboardPdf.<fn>]`, **no rethrow**.
- Per-svg rewrite: own `try/catch`; one failure skips that svg and continues the loop.
- Skip/colour helpers: on catch, treat as skip (`true` / `""`).
- Clone-rewrite miss is **not** `DASHBOARD_PDF_CAPTURE_FAILED`.

---

## 9. Out of scope

- html2canvas library patch; vendor version change; `scale` change (`2` stays)
- `foreignObjectRendering`
- live Cognos legend DOM / restore-after-export
- caption hash/pipe pipeline
- chrome hide of settings / leftover via `onclone` (canvas-column wrappers are the QA-delta exception)
- toolbar SVG rewrite
- `fit-content` on `.lgd-horizontal .Swatch li`

---

## 10. Acceptance

1. Horizontal VIPR legend (short + long captions, MAG \| 2022–2026): coloured chips; labels readable; packed columns aligned.
2. No legend text over the chart.
3. Chart colours and toolbar icons unchanged.
4. Live: legend items left-aligned when flex applies; Cognos packing intact.
5. Throw inside one swatch rewrite does not reject `html2canvas` / blank the tab.

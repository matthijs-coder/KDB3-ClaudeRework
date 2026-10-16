# Execution Spec: `dashboardPdf` (`legend chip QA + canvas chrome hide`)

> Mechanical spec. Architecture: `contracts/dashboardPdf-legend-chrome-qa-contractdelta.md`.

---

**Status:** `Frozen` — executed 2026-09-02; **do not re-run**. Spec constants `12 / 6 / 3 / 2` are **superseded**. Canonical freeze: `SLOT_PX 12`, `CIRCLE_R 7`, `SLOT_GAP_PX 1`, `HOST_TOP_PX 1`.
**Phase:** `extension`
**Authoring AI:** Cursor Grok 4.6, 2026-09-02
**Executing AI:** grok 4.6 subagent
**Reviewer:** supervising coordinator

---

## Section A. Pre-flight

Read, echo one sentence each, then implement in the same turn:

1. `_____________KDB3API/.cursor/rules/amd.mdc`
2. `_____________KDB3API/.cursor/rules/error-handling.mdc`
3. `_____________KDB3API/.cursor/rules/naming.mdc`
4. `_____________KDB3API/.cursor/rules/feature-structure.mdc`
5. `_____________KDB3API/.cursor/rules/dom.mdc`
6. `_____________KDB3API/contracts/dashboardPdf-legend-chrome-qa-contractdelta.md`
7. `_____________KDB3API/contracts/dashboardPdf.md` (hide-set + onclone bullets)
8. This spec

Also read (no extra summaries): `legendSwatchCloneLayout.js`, `captureCanvasBounded.js`, `pdfCapture.css`.

---

## Section B. Files

```
dashboardPdf/config/legendSwatchCloneLayout.js     (edit constants)
dashboardPdf/effects/hidePdfWidgetChromeInClone.js (new)
dashboardPdf/effects/captureCanvasBounded.js       (edit onclone)
KDB3/css/widgets/pdfCapture.css                    (edit grouped rule)
contracts/dashboardPdf.md                          (coordinator may already patch; skip if hide-set already lists kdb-datapoint-pkz)
```

Do not edit `widgetVis/view/legend/**`, `placeLegendSwatchChipInClone.js` (unless a leftover hardcoded 18), `kdb.css`, `html2canvas.min.js`.

---

## Section C. Per-file

#### `config/legendSwatchCloneLayout.js`

Set: `SLOT_PX: 12`, `CIRCLE_R: 6`, `SLOT_GAP_PX: 3`, `HOST_TOP_PX: 2`. Leave VIEWBOX 16, CX/CY 8, SVG_NS.

- **Rules:** `amd.mdc`, `naming.mdc` UPPER_SNAKE.

#### `effects/hidePdfWidgetChromeInClone.js`

- **Lines:** 50–90 (hard 150)
- **AMD:** `define([], …)` return `hidePdfWidgetChromeInClone`
- Factory-scope:
  - `function hideNode(_node)` — if node and `style`, `display = "none"`.
  - `function hideAll(_root, _selector)` — `querySelectorAll`, loop `hideNode`.
  - `function hideHeaderPkzWrappers(_root)` — `querySelectorAll(".widgetHeader .dataWidgetIcon")`; hide only if `querySelector(".kdb_hyperlink_icon")`.
  - `function hidePdfWidgetChromeInClone(_clonedElement)` — entry.
- Entry: outer try/catch log `[dashboardPdf.hidePdfWidgetChromeInClone] failed`, no rethrow. If missing `querySelectorAll`, return. Then hideAll maximize, hideAll datapoint, hideHeaderPkzWrappers.
- Selectors: `.kdb-widget-maximize`, `.kdb-datapoint-pkz` only for hideAll. Do not hide `.dataWidgetIcon` blindly. Do not hide `.widgetIcons`.
- **Rules:** `amd.mdc` factory-scope helpers; `error-handling.mdc` no rethrow; `naming.mdc`; clone-only (`dom.mdc`).

#### `effects/captureCanvasBounded.js`

- Add AMD import `"./hidePdfWidgetChromeInClone.js"` **before** `"./inlineLegendSwatchUsesInClone.js"`.
- `onCloneCaptureDocument`: try `{ _hidePdfWidgetChromeInClone(_clonedElement); _inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement); }` catch log `[dashboardPdf.onCloneCaptureDocument] failed`; no rethrow.
- Keep scale 2, no `foreignObjectRendering`. Grandfathered cleanup/settle stay nested.
- Import count ≤ 2.
- **Rules:** `amd.mdc`, `error-handling.mdc`, hard 150.

#### `css/widgets/pdfCapture.css`

Add to the **same grouped rule** (comma list), no second block:

```css
#main.kdb-pdf-capturing .kdb-datapoint-pkz,
#main.kdb-pdf-capturing .widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)
```

Keep `display: none !important`. Do not add `:has()` anywhere else. Do not touch leftoverWidgets or widgetVis.css.

---

## Section J

1. Constants match §1 of the QA delta.
2. New hide helper ≤ 150, clone-only, no rethrow.
3. onclone: hide then legend.
4. pdfCapture grouped rule includes datapoint + T1 `:has`.
5. No legend caption JS. No li width / overflow visible.
6. Report line counts + deviations.

---

## Section K. Forbidden

- Invent new T1 plant class in widgetVis JS.
- Hide `.dataWidgetIcon` / `.widgetIcons` / `.liveWidgetAnnotations` without the hyperlink_icon child check.
- `foreignObjectRendering`, library patch, git commit.
- Skip Section A echo.

# Contract Delta: PDF QA — smaller legend chips + hide canvas-column wrappers

> PO QA 2026-09-02 (PDF screenshot): chips too large, almost no gap to caption, caption tail clipped; maximize + two drillthrough **borders** still paint. Caption JS unchanged. Live Cognos DOM unchanged except existing capture class.

---

**Status:** `Frozen` — PO vastenburg accepted Cognos PDF 2026-09-02 (“alles lijkt nu goed”).
**Parent:** `contracts/dashboardPdf.md`, `dashboardPdf-legend-swatch-clone-contractdelta.md`, `dashboardPdf-capture-chrome-hide-contractdelta.md`, `dashboardPdf-drillthrough-icon-hide-contractdelta.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-09-02
**Reviewed by:** PO vastenburg — visual QA accepted 2026-09-02

---

## 0. Diagnosis

| Issue | Class |
|---|---|
| Chip size / gap / caption tail | Logic in both contract and code is **correct but mistuned**. MAG constants `18 / r=7 / gap −2 / top 4` make a cap-height disk, negative gap, and eat packed `li` width → `overflow:hidden` clips the last letters. **Do not** widen `li`. **Do not** set overflow visible on `.Legend` / `li`. |
| Three C-shaped outlines top-right | **Specified gap, not a bug against the old hide-set.** `widgetVis.css` 214–227 paints a 25×25 **3-side black border** on three wrappers. PDF hide matches 2026-08-28: inner `a.kdb_hyperlink_icon` + maximize **wrapper**. T1/S2 wrappers were left visible (“residual empty box accepted”) when they had no column border. After canvas-column CSS, those wrappers **are** the paint. Maximize wrapper is already in the hide-set; if it still appears, `#main.kdb-pdf-capturing` may not rematch inside the html2canvas clone of `.pagegenericPage` — clone-side `display:none` is belt-and-suspenders. Native `.resizeEdge` is not these three boxes. |

---

## 1. Legend chip calibration (clone constants only)

File: `dashboardPdf/config/legendSwatchCloneLayout.js`

| Token | Tuning path (do not re-apply) | **Frozen** |
|---|---|---|
| `SLOT_PX` | 18 → 12 → 15 → 12 | **12** |
| `CIRCLE_R` | 7 → 6 → 7 | **7** |
| `SLOT_GAP_PX` | −2 → 3 → 1 | **1** |
| `HOST_TOP_PX` | 4 → 2 → 3 → 1 | **1** |
| `VIEWBOX` / `CIRCLE_CX` / `CIRCLE_CY` | 16 / 8 / 8 | unchanged |

Positive `margin-right` is the small gap. Visual size comes from `CIRCLE_R` inside a 12px slot so packed `li` width is not eaten. Clone packing: overflow hidden on `.Legend` **and** packed `li` (removing `li` overflow made captions worse in PDF QA). No `fit-content`. No `li` width writes.

Amends `dashboardPdf-legend-swatch-clone-contractdelta.md` §5 constants line.

---

## 2. Hide the three canvas-column boxes (wrappers, not only inner `<a>`)

The three nodes (same grouped border rule):

1. `.widget.liveWidget.maximizable > .kdb-widget-maximize`
2. `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)` (T1; no unique `kdb-*` class)
3. `.widget.liveWidget.maximizable > .kdb-datapoint-pkz`

Product: PDF must not paint **icons or borders**. Gear and Cognos native `.widgetIcons` stay as today (already covered / not these selectors).

### 2a. Live hide-set (`pdfCapture.css`)

Append to the **existing grouped** `#main.kdb-pdf-capturing … { display: none !important; }` rule:

- `.kdb-datapoint-pkz`
- `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)` — **one allowed `:has()`**. Unique T1 column box; same selector as the border. Not generic `.dataWidgetIcon` / `.widgetIcons` / `.liveWidgetAnnotations`.

`.kdb-widget-maximize` and `.kdb_hyperlink_icon` stay in the rule.

This **amends** the 2026-08-28 pitfall “residual empty wrapper accepted” and the “no `:has()` in pdfCapture.css” line: residual wrapper is no longer acceptable after 3-side column borders.

### 2b. Clone belt-and-suspenders

New effect `dashboardPdf/effects/hidePdfWidgetChromeInClone.js`. Called from factory-scope `onCloneCaptureDocument` **before** legend inlining. Query **only** `_clonedElement`. Set `style.display = "none"`. Do not remove nodes. Do not write live `_root`.

Hide:

- `querySelectorAll(".kdb-widget-maximize")`
- `querySelectorAll(".kdb-datapoint-pkz")`
- `querySelectorAll(".widgetHeader .dataWidgetIcon")` then hide the node **only if** it contains `.kdb_hyperlink_icon` (no CSS `:has()` required in this JS loop)

`try/catch` per entry and outer; `console.error("[dashboardPdf.hidePdfWidgetChromeInClone] failed", err)`; **no rethrow**.

Primary hide remains live capture class. Clone hide exists because the capture root is `.pagegenericPage` (may omit `#main` in the clone tree). `onclone` is still **not** the hide path for settings/leftover chrome.

---

## 3. Files

| Path | Change |
|---|---|
| `dashboardPdf/config/legendSwatchCloneLayout.js` | constants table §1 |
| `dashboardPdf/effects/hidePdfWidgetChromeInClone.js` | new |
| `dashboardPdf/effects/captureCanvasBounded.js` | `onclone` calls hide then legend inline |
| `KDB3/css/widgets/pdfCapture.css` | two selectors on grouped rule |
| `contracts/dashboardPdf.md` | hide-set sentence + onclone bullet |
| this delta + legend-swatch constants line | sync |

No `widgetVis` JS. No caption pipeline. No `html2canvas.min.js`. No `kdb.css` global `li`. No overflow visible on legend.

---

## 4. Acceptance

1. PDF chips slightly smaller than cap-height; a small gap before the caption; MAG/year tails readable without painting over the chart.
2. PDF: no maximize / T1 / S2 column **borders** and no icons.
3. Live dashboard chrome unchanged when export is not running.
4. One hide/swatch error still must not reject the tab screenshot.

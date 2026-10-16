# Contract Delta: PDF capture-class hide of authoring chrome

> Product ack PO vastenburg 2026-08-27 (P1/P5 capture-class): hide authoring chrome in live HTML during dashboard PDF export so html2canvas 1.4.1 does not paint it. Restore in the same `finally` as the loading overlay.

---

**Status:** `Implemented` — code review PASS 2026-08-27 (rules + contract-vs-code + captain); Cognos-host niet in-browser geverifieerd
**Parent:** `contracts/dashboardPdf.md`
**Type:** `feature module contract delta`
**Authoring AI:** Cursor Grok 4.6, 2026-08-27
**Reviewed by:** PO vastenburg (product A); captain after green subagent reviews

---

## 1. Purpose

When `exportDashboardPdf` runs, temporarily apply capture-only class `kdb-pdf-capturing` on catalog host `#main` (`_KDB.elements.selectors.root.dashboardClassHost`) so CSS `display: none !important` hides authoring chrome in **live** computed styles. html2canvas 1.4.1 paints those styles. Class stays on for the whole tab loop. Clear in the same outer service `finally` as `finishLoading` (success, error, abort).

Amends `dashboardPdf.md` Execution Contract: capture-class is owned by dashboardPdf, not leftover-hide, developer-mode, gear `KDB_hide`, or kdbControl "Buttons verstecken".

---

## 2. Product

| Moment | Chrome |
|---|---|
| Export not running | unchanged (authoring chrome as today) |
| After loading overlay starts, before first tab capture | class on `#main`; hide-set not painted |
| Entire visible-tab capture loop | class stays on (no per-tab add/remove) |
| Outer `finally` (ok / error / abort) | class removed with loading overlay |

Primary hide is live CSS. `ignoreElements` for `#kdb-control-root` remains belt-and-suspenders. `onclone` is not the primary hide.

PDF chrome hide is owned by dashboardPdf (out of scope for widgetSettings close/deselect).

---

## 3. CSS

New file `KDB3/css/widgets/pdfCapture.css`, listed in `cssHrefList.js` with the other widget CSS.

- Gate: `#main.kdb-pdf-capturing`
- `display: none !important` — not leftover `visibility: hidden`
- Specificity must beat `.KDB_widgetSettings.KDB_visible { display:flex }` and `.expandModeContainer .KDB_focusModeSettingsPanel.KDB_visible { display:flex !important }`

Hide-set (descendants of the gate):

- `.KDB_widgetSettings` and `.KDB_widgetSettings.KDB_visible`
- `.KDB_widgetSettingsButton`
- `.KDB_maximizeButton`
- `.KDB_unmaximizeButton`
- `.KDB_focusModeSettingsPanel` and `.KDB_focusModeSettingsPanel.KDB_visible`
- `.KDB3Widget` and `#kdb3widget` (legacy hideKDBWidget — whole host widget, including launchpad)
- `.widget .resizeEdge.resizeEdgeBorder` (Cognos widget selection frames)
- `.widget.liveWidget.maximizable .resizeEdge.topRight` (native maximize click-target)
- `.kdb_hyperlink_icon` (PKZ drillthrough `<a>`)
- `.kdb-widget-maximize` (canvas maximize proxy wrapper)
- `.kdb-datapoint-pkz` (S2 canvas-column wrapper — border box; added `dashboardPdf-legend-chrome-qa-contractdelta.md`)
- `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)` (T1 canvas-column wrapper — one allowed `:has()`; same delta)

Class token `kdb-pdf-capturing` is dashboardPdf config. `#main` remains `dashboardClassHost`. No hardcoded `getElementById("main")`.

---

## 4. Runtime / JS

- Config: `dashboardPdf/config/captureChromeClass.js` → `{ PDF_CAPTURE_CLASS: "kdb-pdf-capturing" }`
- Effect: `startCaptureChromeForRun(_KDB, _runSession)` / `finishCaptureChromeForRun(_KDB, _runSession)`
- Resolve host: `_KDB.elements.selectors.root.dashboardClassHost` + `document.querySelector`
- `activeRun.chromeHidden === true` only after successful `classList.add`
- finish: if `chromeHidden`, `classList.remove`, then `chromeHidden = false`. Idempotent.
- Missing host (start or finish): `console.warn` + coded warning `DASHBOARD_PDF_CAPTURE_HOST_MISSING` on the run session; do not throw; do not fail export
- Wire in `createDashboardPdfService`: after `startLoadingForRun`; clear in the same `.finally` as `finishLoadingForRun`. Do not add/remove per tab in `runDashboardPdfExport` / `captureTabPage`.

---

## 5. Out of scope

- leftover-hide, `KDB_developerMode`, gear `KDB_hide`, kdbControl "Buttons verstecken"
- `.page.pagegenericPage` page border; `[kdb_dropbox]`
- leftover special-case (leftover CSS already handles developer-off)
- new events; `_KDB.state.*`; widgetSettings `closePanel` / Cognos deselect
- html2canvas `onclone` as primary hide
- changing `ignoreElements` for `#kdb-control-root` (keep)

---

## 6. Files

- `KDB3/css/widgets/pdfCapture.css` (new)
- `KDB3/js/core/css/config/cssHrefList.js`
- `KDB3/js/core/services/dashboardPdf/config/captureChromeClass.js` (new)
- `KDB3/js/core/services/dashboardPdf/effects/manageCaptureChrome.js` (new)
- `KDB3/js/core/services/dashboardPdf/createDashboardPdfService.js`
- `contracts/dashboardPdf.md` (Execution Contract)

---

## 7. Acceptance

1. During tab capture, html2canvas 1.4.1 does not paint the hide-set (live `display:none`).
2. After success, error, or abort, `#main` has no `kdb-pdf-capturing` and loading overlay is finished.
3. Class is applied once for the run, not per tab.
4. Missing `#main`: warning `DASHBOARD_PDF_CAPTURE_HOST_MISSING`, export still runs.
5. `#kdb-control-root` still ignored via `ignoreElements`.
6. Leftover-hide, developer-mode, widgetSettings panel close, and kdbControl button-hide are unchanged.

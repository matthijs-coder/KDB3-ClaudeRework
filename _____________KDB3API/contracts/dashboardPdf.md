# Contract: `dashboardPdf`

## Owner
- Namespace: `_KDB.services.dashboardPdf`
- Public methods:
  - `exportDashboardPdf(options) => Promise<Result>`
  - `destroy()`

## Runtime Ownership
- Uses `_KDB.runtime.dashboardPdf` only.
- Buckets: `abortControllers.activeRun`, `pendingPromises.activeRun`, `pendingPromises.vendorLoad`, `activeRun`, technical cleanup buckets.
- No `_KDB.state.dashboardPdf`.
- `activeRun` stores session-scoped loading overlay data (handle + warnings) and capture-chrome flag `chromeHidden` so cleanup is owned by service finalization rather than closure-only references.

## Execution Contract
- Serial export only; concurrent call returns coded result:
  - `DASHBOARD_PDF_BUSY`
- Export stages:
  1. Resolve vendors lazily on first `exportDashboardPdf` via AMD `require([...])` (`jsPDF 2.4.0`, `html2canvas 1.4.1`). Do not load them from the service `define([...])` array. Cache the fulfilled load on `_KDB.runtime.dashboardPdf.pendingPromises.vendorLoad`; do not cache a rejected load. Start the loading overlay before this wait so the first-export delay is covered. After the load settles, abort/`isDisposed` checks run before capture. Load failure is `DASHBOARD_PDF_VENDOR_MISSING`.
  2. Resolve loading mount from `_KDB.elements.selectors.dashboardPdf.loadingMountSelector` through the `dashboardPdf/adapters/resolveLoadingMountEl` adapter (root ownerDocument-aware); start loading with `_KDB.services.loading.startLoading({ mountEl, mountKey:"dashboard-pdf-export", transparent:false, watchdogMs:1800000, sessionMessageKey:"pdfExport" })`. After loading overlay starts and before first tab capture, apply capture-only class `kdb-pdf-capturing` on catalog host `_KDB.elements.selectors.root.dashboardClassHost` (`#main`) via `startCaptureChromeForRun`. Set `activeRun.chromeHidden` true only after successful `classList.add`. Missing host: coded warning `DASHBOARD_PDF_CAPTURE_HOST_MISSING` and `console.warn`; do not fail the export. The class stays on for the entire visible-tab loop (no per-tab add/remove). Hide-set under `#main.kdb-pdf-capturing` uses `display:none !important` (not leftover `visibility:hidden`): `.KDB_widgetSettings` and `.KDB_widgetSettings.KDB_visible`, `.KDB_widgetSettingsButton`, `.KDB_maximizeButton`, `.KDB_unmaximizeButton`, `.KDB_focusModeSettingsPanel` and `.KDB_focusModeSettingsPanel.KDB_visible`, `.KDB3Widget` and `#kdb3widget`, `.widget .resizeEdge.resizeEdgeBorder`, `.widget.liveWidget.maximizable .resizeEdge.topRight`, `.kdb_hyperlink_icon`, `.kdb-widget-maximize`, `.kdb-datapoint-pkz`, `.widget .widgetHeader .dataWidgetIcon:has(.kdb_hyperlink_icon)`.
  3. Build visible-tab and attachment manifests before serial capture
  3a. After the visible-tab manifest is valid and before title-page / tab capture: snapshot confirmed focus-mode widget ids from `_KDB.api.widgetVis.getState().byId[id].maximized === true` and exit them via `_KDB.api.widgetVis.dispatch({ type: "widgetVis/maximizeToggle", widgetId, payload: { nextMaximized: false, source: "programmatic" } })`. Await each exit. Missing `widgetVis`/`getState`: coded warning `DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE`, continue. Failed exit: fatal `DASHBOARD_PDF_FOCUS_EXIT_FAILED` (knowingly empty canvas shell). dashboardPdf does not write vis state or runtime. See `dashboardPdf-focus-mode-exit-restore-contractdelta.md`.
  4. Add landscape A4 title page in Helvetica bold: live dashboard title (24pt, centered at page midpoint) and subtitle (14pt, 10mm below); use the legacy fallback strings when either value is empty.
  5. For each visible tab:
     - overlay prepare caption `pdfTabPrepare` (`{n}`/`{m}` = visible-tab ordinal, not Cognos `tab.index`; `loadingService-dashboardPdf-progress-caption-contractdelta.md`)
     - `tabs/traverse` single-tab activation (`restoreActiveTab:false`)
     - explicit `widgetBase/renderTabWidgetsRequested` gate with a PDF-only `timeoutMs:12000` override
     - exact active `.pagegenericPage` capture-root resolution via Cognos API using the tab's `pageId`; broader all-tabs/page containers are rejected
     - root-scoped loading readiness requires all `.loadingIndicatorContainer` nodes to be absent, followed by an abort-aware 100ms settle period
     - overlay capture caption `pdfTabCapture` + double-rAF + abort check, then html2canvas (`loadingService-dashboardPdf-progress-caption-contractdelta.md`)
     - `html2canvas` capture (`scale:2`, `useCORS:true`, `logging:false`, PNG via `toDataURL("image/png", 0.7)`), `ignoreElements` still skips `#kdb-control-root` as belt-and-suspenders (primary hide is the capture class on live computed styles), `onclone` runs `hidePdfWidgetChromeInClone` then `inlineLegendSwatchUsesInClone` on the cloned `.pagegenericPage` only (canvas-column wrappers `display:none` as belt-and-suspenders; VIPR legend swatch `<use>` → self-contained chips; errors logged, never rethrown; live Cognos legend DOM is not mutated; primary chrome hide remains the live capture class — see `dashboardPdf-legend-chrome-qa-contractdelta.md`), bounded to 60000ms legacy timeout with immediate external abort-signal race; late vendor settlement is suppressed after run settlement to avoid unhandled rejections
     - legacy page-fit parity: fill page width when height permits; otherwise scale to full page height
     - overlay a two-line Helvetica normal 10pt footer at the lower right: dashboard title, then `Seite N: <tab name>`, with 10mm right/bottom margins and 5mm line spacing
  6. Add `Anhang` table pages
  7. Save using Cognos dashboard filename
  8. Restore originally active tab in `finally`, then restore focus mode for widget ids that were successfully exited (`maximizeToggle` `nextMaximized:true`, `source:"programmatic"`). Focus restore runs on success/error/abort while capture class and loading overlay are still on. Failed focus restore is warning `DASHBOARD_PDF_FOCUS_RESTORE_FAILED` and does not retract a saved PDF (same class as `DASHBOARD_PDF_RESTORE_FAILED`).
  9. In outer service promise `finally`, finish capture chrome via `finishCaptureChromeForRun` (if `chromeHidden`, `classList.remove` then `chromeHidden=false`; idempotent; missing host warns and does not throw) and finish loading via `_KDB.services.loading.finishLoading({ handle })` exactly once across success/error/abort. Both always run.

- Visible tabs come exclusively from the canonical public `tabs.getState().visibleTabs` projection; an unavailable projection is a coded fatal error.
- Attachment rows are emitted with semantic kinds (`data|section|spacer`) in legacy order:
  - `Dashboard-Name` (Cognos filename), spacer, section `Filter:`
  - `Globale Filter` as named display selections from public owner snapshots (`sicht.getState()`, canonical `singleSelect.getState().instancesById`, `dienststelle.getState()`, `specialSingleSelect.getState()` when available)
  - one `<tab name> -Tab Filter: ` row per visible tab with named display selections, mapped from canonical scope IDs through public `tabs/resolveFilterScopeTargets` only
  - spacer, section line `Daten-Quellen-Beladung <value>`, then `Quelle`, `Datenaktualität`, `Aktualisierungszyklus`
  - spacer, section `Erweiterende Informationen` with `additionalInfo` in its second column, then `Verwendetes System`, `Umgebung`, `Erstellungsdatum`, `Kennzahlen`, `Data Steward`
- Before attachment filter rows are built, dashboardPdf checks `singleSelect.getState().inventory.freshness`; if not `fresh`, it performs exactly one public `singleSelect/reconcileFilterInstances` dispatch with an allowed reason and re-reads state. If freshness is still not `fresh` or reconcile fails, export fails with a coded fatal error and does not render/save a partial PDF.
- Filter values are multiline (`name: value` per line); multiple values use `; `. Missing/unavailable display values render empty and emit coded warnings. No attachment filter row may fall back to `useValue`.
- Per-scope filter row order is fixed: `Sicht`, `Jahr`, `Dienststelle`, `Berufsfamilie`, `Dienstverhältnis`, `Geschlecht`, `Altersgruppe`, `Dienststellenleitung`, `Personengruppe`.
- For one scope and one label, multiple canonical instances merge display values in deterministic instance order, de-duplicate, and join with `; `.
- `Personengruppe` and `Dienststellenleitung` are emitted only while the corresponding public `specialSingleSelect.getState().byFilterId[id].isVisible === true`; their displayed values come from canonical `singleSelect` instances, not deprecated compatibility cache fields.
- `Verwendetes System` uses `cognosAPI.dashboard.getDashboardVersion()` with value `Cognos Analytics <version>`; environment classification applies `environmentRegex` to `cognosAPI.dashboard.getEnvironmentSource()`. One duplicated regex escape layer is normalized with a coded warning. A captured `dev|test` group yields `DEV|TEST`; a match without that group yields `PROD`; the URL is never emitted.
- Anhang uses the legacy two-column bordered table geometry on the existing pt document (all legacy mm dimensions are converted to pt): centered bold 16pt title; 40mm label column; gray RGB(211,211,211) bold 12pt section bands; normal 10pt data rows; legacy padding, line height, spacer rows, and bounded continuation pages without repeated title/footer.
- Only screenshot pages receive tab-relative `Seite N` footers; title and Anhang pages do not.

## Error / Warning Model
- Non-silent coded failures include:
  - `DASHBOARD_PDF_ABORTED`
  - `DASHBOARD_PDF_DISPOSED`
  - `DASHBOARD_PDF_NO_VISIBLE_TABS`
  - `DASHBOARD_PDF_VISIBLE_TABS_UNAVAILABLE`
  - `DASHBOARD_PDF_VENDOR_MISSING`
  - `DASHBOARD_PDF_TAB_GATE_TIMEOUT`
  - `DASHBOARD_PDF_TAB_GATE_FAILED`
  - `DASHBOARD_PDF_TAB_RENDER_FAILED`
  - `DASHBOARD_PDF_CAPTURE_ROOT_MISSING`
  - `DASHBOARD_PDF_CAPTURE_READINESS_TIMEOUT`
  - `DASHBOARD_PDF_CAPTURE_READINESS_FAILED`
  - `DASHBOARD_PDF_CAPTURE_TIMEOUT`
  - `DASHBOARD_PDF_CAPTURE_FAILED`
  - `DASHBOARD_PDF_FILTER_PREPARATION_FAILED`
  - `DASHBOARD_PDF_SCOPE_TARGET_RESOLVE_FAILED`
  - `DASHBOARD_PDF_SAVE_FAILED`
  - `DASHBOARD_PDF_EXPORT_FAILED`
  - `DASHBOARD_PDF_FOCUS_EXIT_FAILED`
- Attachment scope mapping warnings are surfaced as coded metadata warnings when page-context items cannot be mapped to a single visible tab.
- Missing canonical filter displays and degraded Sicht fallback are surfaced as `DASHBOARD_PDF_FILTER_DISPLAY_UNAVAILABLE` and `DASHBOARD_PDF_SICHT_FALLBACK_USED` warnings.
- Metadata/environment problems are warnings, not fatal.
- Missing, invalid, or unmatched `environmentRegex` yields visible value `UNKNOWN`; invalid/unmatched and normalized configurations emit coded warnings.
- `DASHBOARD_PDF_RESTORE_FAILED` is a post-save warning/diagnostic: the successful result remains `ok:true` because the PDF already exists, while restoration failure is reported non-silently.
- `DASHBOARD_PDF_FOCUS_RESTORE_FAILED` is the same class for failed focus-mode re-entry after original-tab restore.
- Missing `widgetVis.getState` is warning `DASHBOARD_PDF_FOCUS_STATE_UNAVAILABLE`; export continues.
- Missing loading service/mount/selector/start are emitted as coded loading warnings and `console.warn` diagnostics; export continues without crashing or silently leaking.
- Missing capture host (`dashboardClassHost` / `#main`) is emitted as coded warning `DASHBOARD_PDF_CAPTURE_HOST_MISSING` and `console.warn`; export continues without failing.
- Fatal readiness/capture/save failure returns no knowingly incomplete PDF.

## Inputs / Progress / Abort
- `options.onProgress(payload)` receives stage diagnostics.
- Supports external `options.signal` and owned abort controller.
- A signal already aborted at call time returns `DASHBOARD_PDF_ABORTED` before export starts.
- Cancellation is checked after tab capture, before/after Anhang rendering, and immediately before save.
- `destroy()` aborts active run and clears runtime references.

define(["../../cognosHost/config/rootChromeSelectors.js"], function (_rootChrome) {
  "use strict";

  var TITLE_FALLBACK = "konfigurierbares Personaldashboard";
  var SUBTITLE_FALLBACK = "PER130 konfigurierbares Personaldashboard";
  var PDF_WIDGET_RENDER_TIMEOUT_MS = 12000;
  var PDF_CAPTURE_TIMEOUT_MS = 60000;
  var DEFAULT_EXPORT_TIMEOUT_MS = 30000;
  var ABORTED_MESSAGE = "Export aborted.";
  var VENDOR_MISSING_MESSAGE = "PDF vendors are not available.";

  // Error codes are compared as strings by pdfExportControls and in the golden test: spelling is frozen.
  var CODES = {
    BUSY: "DASHBOARD_PDF_BUSY",
    ABORTED: "DASHBOARD_PDF_ABORTED",
    DISPOSED: "DASHBOARD_PDF_DISPOSED",
    VENDOR_MISSING: "DASHBOARD_PDF_VENDOR_MISSING",
    EXPORT_FAILED: "DASHBOARD_PDF_EXPORT_FAILED",
    NO_VISIBLE_TABS: "DASHBOARD_PDF_NO_VISIBLE_TABS",
    FOCUS_EXIT_FAILED: "DASHBOARD_PDF_FOCUS_EXIT_FAILED",
    SAVE_FAILED: "DASHBOARD_PDF_SAVE_FAILED",
    TAB_GATE_TIMEOUT: "DASHBOARD_PDF_TAB_GATE_TIMEOUT",
    TAB_GATE_FAILED: "DASHBOARD_PDF_TAB_GATE_FAILED",
    TAB_RENDER_FAILED: "DASHBOARD_PDF_TAB_RENDER_FAILED",
    CAPTURE_ROOT_MISSING: "DASHBOARD_PDF_CAPTURE_ROOT_MISSING",
    CAPTURE_READINESS_TIMEOUT: "DASHBOARD_PDF_CAPTURE_READINESS_TIMEOUT",
    CAPTURE_READINESS_FAILED: "DASHBOARD_PDF_CAPTURE_READINESS_FAILED",
    CAPTURE_FAILED: "DASHBOARD_PDF_CAPTURE_FAILED",
    CAPTURE_TIMEOUT: "DASHBOARD_PDF_CAPTURE_TIMEOUT",
    FILTER_PREPARATION_FAILED: "DASHBOARD_PDF_FILTER_PREPARATION_FAILED",
    SCOPE_TARGET_RESOLVE_FAILED: "DASHBOARD_PDF_SCOPE_TARGET_RESOLVE_FAILED"
  };

  // Registered on _KDB.elements.selectors.dashboardPdf (defaults under existing values).
  var domSelectors = {
    loadingMountSelector: _rootChrome.pdf.strings.loadingMountSelector
  };

  var legendSwatchCloneLayout = {
    SLOT_PX: 12,
    VIEWBOX: 16,
    CIRCLE_CX: 8,
    CIRCLE_CY: 8,
    CIRCLE_R: 7,
    SLOT_GAP_PX: 1,
    HOST_TOP_PX: 1,
    SVG_NS: "http://www.w3.org/2000/svg"
  };

  var loading = {
    MOUNT_KEY: "dashboard-pdf-export",
    WATCHDOG_MS: 1800000,
    SESSION_MESSAGE_KEY: "pdfExport",
    STAGE_CAPTION_KEYS: { title: "pdfTitle", attachment: "pdfAttachment", save: "pdfSave" }
  };

  return {
    TITLE_FALLBACK: TITLE_FALLBACK,
    SUBTITLE_FALLBACK: SUBTITLE_FALLBACK,
    PDF_WIDGET_RENDER_TIMEOUT_MS: PDF_WIDGET_RENDER_TIMEOUT_MS,
    PDF_CAPTURE_TIMEOUT_MS: PDF_CAPTURE_TIMEOUT_MS,
    DEFAULT_EXPORT_TIMEOUT_MS: DEFAULT_EXPORT_TIMEOUT_MS,
    PDF_CAPTURE_CLASS: "kdb-pdf-capturing",
    ABORTED_MESSAGE: ABORTED_MESSAGE,
    VENDOR_MISSING_MESSAGE: VENDOR_MISSING_MESSAGE,
    LOADING_INDICATOR_FALLBACK: _rootChrome.root.strings.loadingIndicatorSelector,
    CODES: CODES,
    domSelectors: domSelectors,
    legendSwatchCloneLayout: legendSwatchCloneLayout,
    loading: loading
  };
});

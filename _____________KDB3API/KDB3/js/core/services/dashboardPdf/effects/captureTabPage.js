define([
  "./waitForCaptureReadiness.js",
  "./captureCanvasBounded.js",
  "./formatPdfLoadingCaption.js",
  "./yieldForPaint.js",
  "../../../cognosHost/config/rootChromeSelectors.js"
], function (_waitForCaptureReadiness, _captureCanvasBounded, _formatPdfLoadingCaption, _yieldForPaint, _rootChrome) {
  "use strict";

  var PDF_WIDGET_RENDER_TIMEOUT_MS = 12000;

  function isAbortError(_error) {
    return _error && (_error.name === "AbortError" || _error.code === "ABORTED");
  }

  function applyTabPageCaption(_KDB, _handle, _messageKey, _n, _m) {
    try {
      var loadingService = _KDB && _KDB.services ? _KDB.services.loading : null;
      var message;
      if (!_handle || !loadingService || typeof loadingService.updateLoadingMessage !== "function") return;
      if (typeof _n !== "number" || typeof _m !== "number") return;
      message = _formatPdfLoadingCaption(_KDB, _messageKey, { n: _n, m: _m });
      if (!message) return;
      loadingService.updateLoadingMessage({ handle: _handle, message: message });
    } catch (error) {
      console.error("[dashboardPdf.applyTabPageCaption] failed", error);
    }
  }

  async function activateTabAndRender(_KDB, _tab, _timeoutMs) {
    try {
      var ok = await _KDB.api.tabs.dispatch({
        type: "tabs/traverse",
        payload: {
          source: "dashboardPdf",
          scope: "singleTab",
          tabIndex: _tab.index,
          restoreActiveTab: false,
          waitFor: "canvas",
          timeoutMs: _timeoutMs
        }
      });
      if (!ok) {
        var tabsState = _KDB.api.tabs && _KDB.api.tabs.getState ? _KDB.api.tabs.getState() : null;
        var traversal = tabsState && tabsState.traversal ? tabsState.traversal : {};
        var isTimeout = traversal.errorCode === "TABS_TRAVERSE_TIMEOUT";
        throw {
          code: isTimeout ? "DASHBOARD_PDF_TAB_GATE_TIMEOUT" : "DASHBOARD_PDF_TAB_GATE_FAILED",
          message: traversal.errorMessage || "Tab activation gate failed."
        };
      }
      var renderResult = await _KDB.api.widgetBase.dispatch({
        type: "widgetBase/renderTabWidgetsRequested",
        payload: { tabId: _tab.tabId, reason: "dashboardPdf", timeoutMs: PDF_WIDGET_RENDER_TIMEOUT_MS }
      });
      if (!renderResult || renderResult.ok !== true || Number(renderResult.failed) > 0) {
        throw { code: "DASHBOARD_PDF_TAB_RENDER_FAILED", message: "Widget render gate failed." };
      }
    } catch (error) {
      if (error && error.code) throw error;
      console.error("[dashboardPdf.activateTabAndRender] failed", error);
      throw error;
    }
  }

  async function captureTabPage(_KDB, _tab, _html2canvas, _signal, _timeoutMs, _ordinal, _tabCount) {
    var root;
    var canvas;
    var readiness;
    var activeRun;
    var handle;
    var ordinal;
    try {
      activeRun = _KDB && _KDB.runtime && _KDB.runtime.dashboardPdf ? _KDB.runtime.dashboardPdf.activeRun : null;
      handle = activeRun && activeRun.loadingHandle ? activeRun.loadingHandle : null;
      ordinal = { n: typeof _ordinal === "number" ? _ordinal : null, m: typeof _tabCount === "number" ? _tabCount : null };
      applyTabPageCaption(_KDB, handle, "pdfTabPrepare", ordinal.n, ordinal.m);
      await activateTabAndRender(_KDB, _tab, _timeoutMs);
      if (_signal && _signal.aborted) throw { code: "DASHBOARD_PDF_ABORTED", message: "Export aborted." };
      root = _KDB.cognosAPI.dashboard.resolveCaptureRoot({ tabId: _tab.tabId, pageId: _tab.pageId });
      if (!root) {
        throw {
          code: "DASHBOARD_PDF_CAPTURE_ROOT_MISSING",
          message: "Active capture root could not be proven for tab/page identity."
        };
      }
      readiness = await _waitForCaptureReadiness(root, _signal, _timeoutMs, readLoadingIndicatorSelector(_KDB));
      if (!readiness || readiness.ok !== true) {
        throw {
          code: (readiness && readiness.errorCode) || "DASHBOARD_PDF_CAPTURE_READINESS_FAILED",
          message: (readiness && readiness.errorMessage) || "Capture readiness gate failed."
        };
      }
      applyTabPageCaption(_KDB, handle, "pdfTabCapture", ordinal.n, ordinal.m);
      await _yieldForPaint(_signal);
      if (_signal && _signal.aborted) throw { code: "DASHBOARD_PDF_ABORTED", message: "Export aborted." };
      try {
        canvas = await _captureCanvasBounded(_html2canvas, root, _signal);
      } catch (error) {
        if (isAbortError(error)) throw { code: "DASHBOARD_PDF_ABORTED", message: "Export aborted." };
        if (error && error.code === "DASHBOARD_PDF_ABORTED") throw error;
        if (error && error.code === "DASHBOARD_PDF_CAPTURE_TIMEOUT") throw error;
        throw { code: "DASHBOARD_PDF_CAPTURE_FAILED", message: String(error && error.message ? error.message : error) };
      }
      if (_signal && _signal.aborted) throw { code: "DASHBOARD_PDF_ABORTED", message: "Export aborted." };
      if (!canvas || Number(canvas.width) <= 0 || Number(canvas.height) <= 0) {
        throw { code: "DASHBOARD_PDF_CAPTURE_FAILED", message: "Captured canvas has invalid size." };
      }
      try {
        return canvas.toDataURL("image/png", 0.7);
      } catch (encodeError) {
        throw { code: "DASHBOARD_PDF_CAPTURE_FAILED", message: String(encodeError && encodeError.message ? encodeError.message : encodeError) };
      }
    } catch (error) {
      if (error && error.code) throw error;
      console.error("[dashboardPdf.captureTabPage] failed", error);
      throw error;
    }
  }

  function readLoadingIndicatorSelector(_KDB) {
    try {
      var rootSelectors = _KDB && _KDB.elements && _KDB.elements.selectors
        ? _KDB.elements.selectors.root
        : null;
      return rootSelectors && rootSelectors.loadingIndicatorSelector
        ? rootSelectors.loadingIndicatorSelector
        : _rootChrome.root.strings.loadingIndicatorSelector;
    } catch (error) {
      console.error("[dashboardPdf.readLoadingIndicatorSelector] failed", error);
      return _rootChrome.root.strings.loadingIndicatorSelector;
    }
  }

  return captureTabPage;
});

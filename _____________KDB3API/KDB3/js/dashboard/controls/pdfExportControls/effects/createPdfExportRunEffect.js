define(["./bindPdfExportClick.js"], function (_bindPdfExportClick) {
  "use strict";

  function createAbortController() {
    if (typeof AbortController === "function") return new AbortController();
    return { signal: null, abort: function () {} };
  }

  function showFatalError(_KDB, _result) {
    var messageService = _KDB.services && _KDB.services.message;
    var message = _result && _result.errorMessage ? _result.errorMessage : "Dashboard PDF Export fehlgeschlagen.";
    console.error("[pdfExportControls.export]", _result);
    if (messageService && typeof messageService.showAlert === "function") {
      try {
        messageService.showAlert({ message: message, severity: "error", title: "Dashboard PDF Export" });
      } catch (_err) {
        console.warn("[pdfExportControls.export][fatalMessageFailed]", _err);
      }
    }
  }

  function handleMissingService(_controller, _syncView) {
    if (!_controller.didWarnMissingService) {
      _controller.didWarnMissingService = true;
      console.warn("[pdfExportControls.mount] _KDB.services.dashboardPdf is missing; controls disabled.");
    }
    _syncView({ disabled: true, busy: false, serviceAvailable: false, label: "PDF" });
    return Promise.resolve(false);
  }

  function runExport(_KDB, _controller, _syncView) {
    var runtime = _KDB.runtime.pdfExportControls;
    var service = _KDB.services && _KDB.services.dashboardPdf;
    var exportRun;
    var activeAbortController;
    if (!service || typeof service.exportDashboardPdf !== "function") {
      return handleMissingService(_controller, _syncView);
    }
    if (runtime.pendingPromises.exportRun) return runtime.pendingPromises.exportRun;
    _syncView({ disabled: true, busy: true, serviceAvailable: true, label: "PDF..." });
    if (runtime.abortControllers.exportRun && typeof runtime.abortControllers.exportRun.abort === "function") {
      runtime.abortControllers.exportRun.abort();
    }
    runtime.abortControllers.exportRun = createAbortController();
    activeAbortController = runtime.abortControllers.exportRun;
    exportRun = service.exportDashboardPdf({
      signal: activeAbortController.signal,
      onProgress: function (payload) {
        var stage = payload && payload.stage ? payload.stage : "run";
        if (!_controller.isDisposed) _syncView({ disabled: true, busy: true, serviceAvailable: true, label: "PDF " + stage });
      }
    }).then(function (result) {
      if (!result || result.ok !== true) {
        if (!result || result.errorCode !== "DASHBOARD_PDF_BUSY") showFatalError(_KDB, result || {});
        return false;
      }
      return true;
    }).finally(function () {
      if (runtime.abortControllers.exportRun === activeAbortController) {
        runtime.abortControllers.exportRun = null;
      }
      if (runtime.pendingPromises.exportRun === exportRun) runtime.pendingPromises.exportRun = null;
      if (!_controller.isDisposed) _syncView({ disabled: false, busy: false, serviceAvailable: true, label: "PDF" });
    });
    runtime.pendingPromises.exportRun = exportRun;
    return exportRun;
  }

  function createPdfExportRunEffect(_KDB, _controller, _syncView) {
    return function bindPdfExportRunEffect() {
      return _bindPdfExportClick(_KDB, { runExport: runExport.bind(null, _KDB, _controller, _syncView) });
    };
  }

  return createPdfExportRunEffect;
});

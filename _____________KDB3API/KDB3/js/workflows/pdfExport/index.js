define([
  "../../core/utils/kit/errors.js",
  "../../core/utils/kit/runtime.js",
  "./config.js",
  "./exportRun.js",
  "./session.js",
  "./vendors.js"
], function (_errors, _runtime, _config, _exportRun, _session, _vendors) {
  "use strict";

  // Lifecycle terms: idle, running (one export at a time), disposed.

  var CODES = _config.CODES;

  function createBusyResult() {
    return { ok: false, errorCode: CODES.BUSY, errorMessage: "A dashboard PDF export is already in progress." };
  }

  function createAbortedResult() {
    return { ok: false, errorCode: CODES.ABORTED, errorMessage: _config.ABORTED_MESSAGE, warnings: [] };
  }

  function createDisposedResult() {
    return { ok: false, errorCode: CODES.DISPOSED, errorMessage: "dashboardPdf service is disposed." };
  }

  function createVendorFailureResult(error) {
    console.error("[dashboardPdf.exportDashboardPdf] vendor load failed", error);
    return {
      ok: false,
      errorCode: error && error.code ? error.code : CODES.VENDOR_MISSING,
      errorMessage: error && error.message ? String(error.message) : _config.VENDOR_MISSING_MESSAGE
    };
  }

  function ensureDashboardPdfRuntime(_KDB) {
    return _runtime.ensureRuntime(_KDB, "dashboardPdf", {
      activeRun: null,
      dashboardFacet: null,
      abortControllers: { activeRun: null },
      pendingPromises: { activeRun: null, vendorLoad: null }
    });
  }

  // Forwards an abort of the caller's signal to the run's own controller; returns the unlink function.
  function linkAbortSignal(signal, abortController) {
    if (!signal || typeof signal.addEventListener !== "function") return function () {};
    var onAbort = function () { abortController.abort(); };
    signal.addEventListener("abort", onAbort, { once: true });
    return function () { signal.removeEventListener("abort", onAbort); };
  }

  function createDashboardPdfService(_KDB) {
    var guard = _errors.createDisposedGuard("dashboardPdf");

    function startRun(rt, options) {
      var abortController = new AbortController();
      var unlinkExternal = linkAbortSignal(options.signal, abortController);
      var runSession = { abortController: abortController, loadingHandle: null, loadingWarnings: [], chromeHidden: false };
      rt.abortControllers.activeRun = abortController;
      rt.activeRun = runSession;
      _session.startRunLoading(_KDB, runSession);
      _session.startCaptureChrome(_KDB, runSession);
      return {
        runSession: runSession,
        abortController: abortController,
        finish: function () {
          _session.finishCaptureChrome(_KDB, runSession);
          _session.finishRunLoading(_KDB, runSession);
          unlinkExternal();
          rt.abortControllers.activeRun = null;
          rt.pendingPromises.activeRun = null;
          if (rt.activeRun === runSession) rt.activeRun = null;
        }
      };
    }

    function exportDashboardPdf(options) {
      var opts = options || {};
      var rt = ensureDashboardPdfRuntime(_KDB);
      if (guard.blocked("exportDashboardPdf")) return Promise.resolve(createDisposedResult());
      if (rt.pendingPromises.activeRun) return Promise.resolve(createBusyResult());
      if (opts.signal && opts.signal.aborted) return Promise.resolve(createAbortedResult());
      var run = startRun(rt, opts);
      var promise = _vendors.loadPdfVendors(_KDB).then(function (vendors) {
        if (guard.isDisposed()) return createDisposedResult();
        if (run.abortController.signal.aborted) return createAbortedResult();
        return _exportRun.runDashboardPdfExport(_KDB, vendors, {
          signal: run.abortController.signal,
          onProgress: _session.bindProgressCaption(_KDB, run.runSession, opts.onProgress),
          timeoutMs: opts.timeoutMs
        });
      }, function (error) {
        return guard.isDisposed() ? createDisposedResult() : createVendorFailureResult(error);
      }).then(function (result) {
        return _session.appendLoadingWarnings(result, run.runSession);
      }).finally(run.finish);
      rt.pendingPromises.activeRun = promise;
      return promise;
    }

    function destroy() {
      if (guard.isDisposed()) return;
      guard.dispose();
      var rt = ensureDashboardPdfRuntime(_KDB);
      if (rt.abortControllers.activeRun) rt.abortControllers.activeRun.abort();
      rt.abortControllers.activeRun = null;
      rt.pendingPromises.vendorLoad = null;
    }

    return { exportDashboardPdf: exportDashboardPdf, destroy: destroy };
  }

  function registerDashboardPdf(_KDB) {
    _KDB.services = _KDB.services || {};
    _KDB.elements = _KDB.elements || {};
    _KDB.elements.selectors = _KDB.elements.selectors || {};
    var selectors = _KDB.elements.selectors.dashboardPdf || (_KDB.elements.selectors.dashboardPdf = {});
    var labels;
    Object.keys(_config.domSelectors).forEach(function (key) {
      if (selectors[key] === undefined) selectors[key] = _config.domSelectors[key];
    });
    _KDB.config = _KDB.config || {};
    labels = _KDB.config.labels = _KDB.config.labels || {};
    labels.de = labels.de || {};
    labels.de.dashboardPdf = Object.assign({}, _config.pdfLabels, labels.de.dashboardPdf || {});
    var rt = ensureDashboardPdfRuntime(_KDB);
    var hostService = _KDB.services.cognosHost;
    rt.dashboardFacet = hostService && hostService.dashboard ? hostService.dashboard : null;
    if (!_KDB.services.dashboardPdf) {
      _KDB.services.dashboardPdf = createDashboardPdfService(_KDB);
    }
    return _KDB.services.dashboardPdf;
  }

  return registerDashboardPdf;
});

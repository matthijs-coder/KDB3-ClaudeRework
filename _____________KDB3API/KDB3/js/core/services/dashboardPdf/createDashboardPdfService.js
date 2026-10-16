define([
  "./runDashboardPdfExport.js",
  "./effects/loadPdfVendors.js",
  "./effects/manageLoadingSession.js",
  "./effects/manageCaptureChrome.js"
], function (_runDashboardPdfExport, _loadPdfVendors, _manageLoadingSession, _manageCaptureChrome) {
  "use strict";

  function createBusyResult() {
    return {
      ok: false,
      errorCode: "DASHBOARD_PDF_BUSY",
      errorMessage: "A dashboard PDF export is already in progress."
    };
  }

  function createAbortedResult() {
    return {
      ok: false,
      errorCode: "DASHBOARD_PDF_ABORTED",
      errorMessage: "Export aborted.",
      warnings: []
    };
  }

  function createDisposedResult() {
    return {
      ok: false,
      errorCode: "DASHBOARD_PDF_DISPOSED",
      errorMessage: "dashboardPdf service is disposed."
    };
  }

  function convertVendorLoadFailure(_err) {
    try {
      console.error("[dashboardPdf.exportDashboardPdf] vendor load failed", _err);
      return {
        ok: false,
        errorCode: _err && _err.code ? _err.code : "DASHBOARD_PDF_VENDOR_MISSING",
        errorMessage: _err && _err.message ? String(_err.message) : "PDF vendors are not available."
      };
    } catch (err) {
      console.error("[dashboardPdf.convertVendorLoadFailure] failed", err);
      return {
        ok: false,
        errorCode: "DASHBOARD_PDF_VENDOR_MISSING",
        errorMessage: "PDF vendors are not available."
      };
    }
  }

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dashboardPdf = _KDB.runtime.dashboardPdf || {};
    _KDB.runtime.dashboardPdf.abortControllers = _KDB.runtime.dashboardPdf.abortControllers || { activeRun: null };
    _KDB.runtime.dashboardPdf.pendingPromises = _KDB.runtime.dashboardPdf.pendingPromises || { activeRun: null, vendorLoad: null };
    return _KDB.runtime.dashboardPdf;
  }

  function linkAbortSignal(_signal, _abortController) {
    var unsubscribed = false;
    var onAbort = function () { _abortController.abort(); };
    if (_signal && typeof _signal.addEventListener === "function") {
      if (_signal.aborted) {
        _abortController.abort();
        return function () {};
      }
      _signal.addEventListener("abort", onAbort, { once: true });
      return function () {
        if (unsubscribed) return;
        unsubscribed = true;
        _signal.removeEventListener("abort", onAbort);
      };
    }
    return function () {};
  }

  function createDashboardPdfService(_deps) {
    var _KDB = _deps._KDB;
    var _resolveLoadingMountEl = _deps.resolveLoadingMountEl;
    var isDisposed = false;
    return {
      exportDashboardPdf: function (_options) {
        var runtime = ensureRuntime(_KDB);
        var options = _options || {};
        var abortController;
        var unlinkExternal;
        var promise;
        var runSession;
        if (isDisposed) {
          return Promise.resolve(createDisposedResult());
        }
        if (runtime.pendingPromises.activeRun) return Promise.resolve(createBusyResult());
        if (options.signal && options.signal.aborted) {
          return Promise.resolve(createAbortedResult());
        }
        abortController = typeof AbortController === "function" ? new AbortController() : { signal: null, abort: function () {} };
        unlinkExternal = linkAbortSignal(options.signal, abortController);
        runtime.abortControllers.activeRun = abortController;
        runSession = {
          abortController: abortController,
          loadingHandle: null,
          loadingWarnings: [],
          chromeHidden: false
        };
        runtime.activeRun = runSession;
        _manageLoadingSession.startLoadingForRun(_KDB, _resolveLoadingMountEl, runSession);
        _manageCaptureChrome.startCaptureChromeForRun(_KDB, runSession);
        promise = _loadPdfVendors(_KDB).then(function (vendors) {
          if (isDisposed) return createDisposedResult();
          if (abortController.signal && abortController.signal.aborted) return createAbortedResult();
          return _runDashboardPdfExport(_KDB, { vendors: vendors }, {
            signal: abortController.signal,
            onProgress: _manageLoadingSession.bindProgressCaption(_KDB, runSession, options.onProgress),
            timeoutMs: options.timeoutMs
          });
        }, function (err) {
          if (isDisposed) return createDisposedResult();
          return convertVendorLoadFailure(err);
        }).then(function (result) {
          return _manageLoadingSession.appendLoadingWarnings(result, runSession);
        }).finally(function () {
          _manageCaptureChrome.finishCaptureChromeForRun(_KDB, runSession);
          _manageLoadingSession.finishLoadingForRun(_KDB, runSession);
          unlinkExternal();
          runtime.abortControllers.activeRun = null;
          runtime.pendingPromises.activeRun = null;
          if (runtime.activeRun === runSession) runtime.activeRun = null;
        });
        runtime.pendingPromises.activeRun = promise;
        return promise;
      },
      destroy: function () {
        var runtime;
        if (isDisposed) return;
        isDisposed = true;
        runtime = ensureRuntime(_KDB);
        if (runtime.abortControllers.activeRun && typeof runtime.abortControllers.activeRun.abort === "function") {
          runtime.abortControllers.activeRun.abort();
        }
        runtime.abortControllers.activeRun = null;
        runtime.pendingPromises.vendorLoad = null;
      }
    };
  }

  return createDashboardPdfService;
});

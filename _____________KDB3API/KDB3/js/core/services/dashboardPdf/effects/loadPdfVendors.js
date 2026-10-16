define([
  "require",
  "./resolvePdfVendors.js"
], function (_require, _resolvePdfVendors) {
  "use strict";

  var VENDOR_MODULE_PATHS = [
    "../../../libraries/jspdf.umd.min.js",
    "../../../libraries/html2canvas.min.js"
  ];

  function createVendorMissingError() {
    var err = new Error("PDF vendors are not available.");
    err.code = "DASHBOARD_PDF_VENDOR_MISSING";
    return err;
  }

  function ensurePdfRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dashboardPdf = _KDB.runtime.dashboardPdf || {};
    _KDB.runtime.dashboardPdf.pendingPromises = _KDB.runtime.dashboardPdf.pendingPromises || {};
    return _KDB.runtime.dashboardPdf;
  }

  function loadPdfVendors(_KDB) {
    try {
      var runtime = ensurePdfRuntime(_KDB);
      var cached = runtime.pendingPromises.vendorLoad;
      if (cached) return cached;
      var promise = requestPdfVendorModules();
      runtime.pendingPromises.vendorLoad = promise;
      return promise.catch(onVendorLoadRejected.bind(null, runtime, promise));
    } catch (err) {
      console.error("[dashboardPdf.loadPdfVendors] failed", err);
      return Promise.reject(createVendorMissingError());
    }
  }

  function onVendorLoadRejected(_runtime, _promise, _err) {
    try {
      if (_runtime.pendingPromises && _runtime.pendingPromises.vendorLoad === _promise) {
        _runtime.pendingPromises.vendorLoad = null;
      }
    } catch (clearErr) {
      console.error("[dashboardPdf.onVendorLoadRejected] cache clear failed", clearErr);
    }
    console.error("[dashboardPdf.loadPdfVendors] vendor require failed", _err);
    return Promise.reject(createVendorMissingError());
  }

  function requestPdfVendorModules() {
    var deferred = createDeferred();
    try {
      _require(VENDOR_MODULE_PATHS, onVendorModulesLoaded.bind(null, deferred), onVendorModulesFailed.bind(null, deferred));
    } catch (err) {
      console.error("[dashboardPdf.requestPdfVendorModules] failed", err);
      deferred.reject(createVendorMissingError());
    }
    return deferred.promise;
  }

  function createDeferred() {
    var deferred = { resolve: null, reject: null, promise: null };
    deferred.promise = new Promise(assignDeferred.bind(null, deferred));
    return deferred;
  }

  function assignDeferred(_deferred, _resolve, _reject) {
    _deferred.resolve = _resolve;
    _deferred.reject = _reject;
  }

  function onVendorModulesLoaded(_deferred, _jspdfModule, _html2canvasModule) {
    try {
      var vendors = _resolvePdfVendors(_jspdfModule, _html2canvasModule);
      if (!vendors || !vendors.jsPdfCtor || !vendors.html2canvas) {
        _deferred.reject(createVendorMissingError());
        return;
      }
      _deferred.resolve(vendors);
    } catch (err) {
      console.error("[dashboardPdf.onVendorModulesLoaded] failed", err);
      _deferred.reject(createVendorMissingError());
    }
  }

  function onVendorModulesFailed(_deferred, _err) {
    console.error("[dashboardPdf.onVendorModulesFailed] require failed", _err);
    _deferred.reject(createVendorMissingError());
  }

  return loadPdfVendors;
});

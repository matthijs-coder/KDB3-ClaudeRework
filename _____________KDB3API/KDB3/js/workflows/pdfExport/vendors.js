define([
  "require",
  "../../core/utils/kit/errors.js",
  "./config.js"
], function (_require, _errors, _config) {
  "use strict";

  var VENDOR_MODULE_PATHS = [
    "../../core/libraries/jspdf.umd.min.js",
    "../../core/libraries/html2canvas.min.js"
  ];
  var VENDOR_MISSING = _config.CODES.VENDOR_MISSING;

  function resolveJsPdfCtor(module) {
    if (module && typeof module.jsPDF === "function") return module.jsPDF;
    if (module && module.default && typeof module.default.jsPDF === "function") return module.default.jsPDF;
    return null;
  }

  function resolveHtml2Canvas(module) {
    if (typeof module === "function") return module;
    if (module && typeof module.default === "function") return module.default;
    return null;
  }

  function requestVendorModules() {
    return new Promise(function (resolve, reject) {
      _require(VENDOR_MODULE_PATHS, function (jspdfModule, html2canvasModule) {
        var vendors = { jsPdfCtor: resolveJsPdfCtor(jspdfModule), html2canvas: resolveHtml2Canvas(html2canvasModule) };
        if (!vendors.jsPdfCtor || !vendors.html2canvas) {
          reject(_errors.codedError(VENDOR_MISSING, _config.VENDOR_MISSING_MESSAGE));
          return;
        }
        resolve(vendors);
      }, reject);
    });
  }

  /**
   * Loads jsPDF and html2canvas once per session; the promise is cached in runtime.pendingPromises.vendorLoad
   * and dropped again when loading fails, so the next export retries.
   * @param {object} _KDB
   * @returns {Promise<{jsPdfCtor: Function, html2canvas: Function}>} rejects with a VENDOR_MISSING coded error
   */
  function loadPdfVendors(_KDB) {
    var rt = _KDB.runtime.dashboardPdf;
    if (rt.pendingPromises.vendorLoad) return rt.pendingPromises.vendorLoad;
    var promise = requestVendorModules().catch(function (cause) {
      if (rt.pendingPromises.vendorLoad === promise) rt.pendingPromises.vendorLoad = null;
      if (cause && cause.code === VENDOR_MISSING) throw cause;
      throw _errors.codedError(VENDOR_MISSING, _config.VENDOR_MISSING_MESSAGE, { cause: cause });
    });
    rt.pendingPromises.vendorLoad = promise;
    return promise;
  }

  return { loadPdfVendors: loadPdfVendors };
});

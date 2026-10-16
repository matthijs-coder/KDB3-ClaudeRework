define([], function () {
  "use strict";

  function resolveJsPdfCtor(_module) {
    if (_module && typeof _module.jsPDF === "function") return _module.jsPDF;
    if (_module && _module.default && typeof _module.default.jsPDF === "function") return _module.default.jsPDF;
    return null;
  }

  function resolveHtml2Canvas(_module) {
    if (typeof _module === "function") return _module;
    if (_module && typeof _module.default === "function") return _module.default;
    return null;
  }

  function resolvePdfVendors(_jspdfModule, _html2canvasModule) {
    return {
      jsPdfCtor: resolveJsPdfCtor(_jspdfModule),
      html2canvas: resolveHtml2Canvas(_html2canvasModule)
    };
  }

  return resolvePdfVendors;
});

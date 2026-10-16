define([
  "./buildPdfExportControls.js",
  "../adapters/resolvePdfIconHref.js"
], function (_buildPdfExportControls, _resolvePdfIconHref) {
  "use strict";

  function placePdfExportControls(_KDB, _toolbarHostEl) {
    var selectors = _KDB.elements.selectors.pdfExportControls;
    var iconAssets = _KDB.config.pdfExportControls || {};
    var runtime = _KDB.runtime.pdfExportControls;
    var rootEl = _toolbarHostEl.querySelector(selectors.rootSelector);
    var iconSrc = _resolvePdfIconHref(_toolbarHostEl, iconAssets);
    if (!rootEl) {
      rootEl = _buildPdfExportControls({ iconSrc: iconSrc });
      _toolbarHostEl.insertBefore(rootEl, _toolbarHostEl.firstChild || null);
    }
    runtime.domRefs.toolbarHostEl = _toolbarHostEl;
    runtime.domRefs.rootEl = rootEl;
    runtime.domRefs.buttonEl = rootEl.querySelector(selectors.buttonSelector);
    runtime.domRefs.iconEl = rootEl.querySelector(selectors.iconSelector);
    runtime.domRefs.labelEl = rootEl.querySelector(selectors.labelSelector);
    if (runtime.domRefs.iconEl && iconSrc && runtime.domRefs.iconEl.getAttribute("src") !== iconSrc) {
      runtime.domRefs.iconEl.setAttribute("src", iconSrc);
    }
    return rootEl;
  }

  return placePdfExportControls;
});

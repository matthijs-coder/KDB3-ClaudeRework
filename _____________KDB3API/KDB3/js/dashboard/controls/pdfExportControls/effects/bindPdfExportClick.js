define([], function () {
  "use strict";

  function bindPdfExportClick(_KDB, _options) {
    var runtime = _KDB.runtime.pdfExportControls;
    var buttonEl = runtime.domRefs.buttonEl;
    if (!buttonEl) return false;
    if (runtime.listeners.clickCleanup) runtime.listeners.clickCleanup();
    var onClick = function () { _options.runExport(); };
    buttonEl.addEventListener("click", onClick);
    runtime.listeners.clickCleanup = function () {
      buttonEl.removeEventListener("click", onClick);
      runtime.listeners.clickCleanup = null;
    };
    return true;
  }

  return bindPdfExportClick;
});

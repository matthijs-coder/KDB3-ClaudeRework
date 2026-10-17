/*
 * Registration entry of the toolbar buttons: publishes _KDB.api.historyControls, pdfExportControls, wienKiControls and
 * shareControls. The shared host (toolbarHost.js) places the buttons in the declared order (config.BUTTON_ORDER)
 * whatever order they are mounted or destroyed in.
 */
define([
  "./historyButton.js",
  "./pdfButton.js",
  "./wienKiButton.js",
  "./shareButton.js"
], function (_registerHistoryControls, _registerPdfExportControls, _registerWienKiControls, _registerShareControls) {
  "use strict";

  function registerToolbarControls(_KDB) {
    _registerHistoryControls(_KDB);
    _registerPdfExportControls(_KDB);
    _registerWienKiControls(_KDB);
    _registerShareControls(_KDB);
  }

  return registerToolbarControls;
});

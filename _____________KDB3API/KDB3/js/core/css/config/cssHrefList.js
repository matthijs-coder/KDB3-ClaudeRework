define(["../../config/assetBase.js"], function (_assetBase) {
  "use strict";

  var STYLESHEETS = [
    "css/header.css",
    "css/footer.css",
    "css/customButtons/toolbarControls.css",
    "css/messageService.css",
    "css/kdb-control/shell.css",
    "css/kdb-control/panels.css",
    "css/kdb-control/controls.css",
    "css/loadingAnimation.css",
    "css/libraries/jquery-ui.css",
    "css/libraries/style.min.css",
    "css/metricsTree.css",
    "css/canvas.css",
    "css/cognosButtons.css",
    "css/widgets/hostWidgets.css",
    "css/widgets/widgetSettings.css",
    "css/widgets/widgetSettingsColorDropdown.css",
    "css/widgets/widgetVis.css",
    "css/widgets/widgetHiding.css",
    "css/filters/filters.css",
    "css/kdb.css"
  ];

  return STYLESHEETS.map(_assetBase.dotAssetPath);
});

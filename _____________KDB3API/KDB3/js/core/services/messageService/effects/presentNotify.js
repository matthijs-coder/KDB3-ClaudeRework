define([
  "./showGlassToast.js",
  "../view/renderGlobalNotification.js"
], function (_showGlassToast, _renderGlobalNotification) {
  "use strict";

  function isInfoSeverity(_severity) {
    return _severity == null || _severity === "" || _severity === "info";
  }

  function __controller(_KDB, _options) {
    var options;
    var id;
    try {
      options = _options || {};
      if (!isInfoSeverity(options.severity)) {
        return _showGlassToast(_KDB, options);
      }
      id = _renderGlobalNotification(_KDB, options);
      if (typeof id === "string" && id !== "") {
        return id;
      }
      return _showGlassToast(_KDB, options);
    } catch (err) {
      console.error("[messageService.presentNotify] failed", err);
      try {
        return _showGlassToast(_KDB, options);
      } catch (glassErr) {
        console.error("[messageService.presentNotify] failed", glassErr);
      }
    }
  }

  return __controller;
});

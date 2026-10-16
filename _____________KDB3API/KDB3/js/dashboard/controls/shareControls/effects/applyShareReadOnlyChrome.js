define([
  "../config/shareReadOnlyClass.js",
  "./readShareReadOnlyTokenPresent.js"
], function (_shareReadOnlyClass, _readShareReadOnlyTokenPresent) {
  "use strict";

  var SHARE_READ_ONLY_CLASS = _shareReadOnlyClass.SHARE_READ_ONLY_CLASS;

  function readDashboardClassHostSelector(_KDB) {
    return _KDB &&
      _KDB.elements &&
      _KDB.elements.selectors &&
      _KDB.elements.selectors.root &&
      _KDB.elements.selectors.root.dashboardClassHost || null;
  }

  function resolveDashboardClassHost(_KDB) {
    try {
      var selector = readDashboardClassHostSelector(_KDB);
      if (!selector || typeof document === "undefined" || !document.querySelector) {
        return null;
      }
      return document.querySelector(selector);
    } catch (error) {
      console.error("[shareControls.applyShareReadOnlyChrome] dashboardClassHost resolve failed", error);
      return null;
    }
  }

  function applyShareReadOnlyChrome(_KDB) {
    try {
      var host = resolveDashboardClassHost(_KDB);
      if (!host || !host.classList) {
        console.warn("[shareControls.applyShareReadOnlyChrome] dashboardClassHost node missing");
        return;
      }
      if (_readShareReadOnlyTokenPresent()) {
        host.classList.add(SHARE_READ_ONLY_CLASS);
      } else {
        host.classList.remove(SHARE_READ_ONLY_CLASS);
      }
    } catch (err) {
      console.error("[shareControls.applyShareReadOnlyChrome] failed", err);
    }
  }

  return applyShareReadOnlyChrome;
});

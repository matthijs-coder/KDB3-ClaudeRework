define([], function () {
  "use strict";

  var TAB_PANEL_SUFFIX = "_tabpanel";

  function __controller(_scopeId) {
    var scopeId;
    try {
      if (_scopeId == null) {
        return "";
      }
      scopeId = String(_scopeId).trim();
      if (scopeId.slice(-TAB_PANEL_SUFFIX.length) === TAB_PANEL_SUFFIX) {
        return scopeId.slice(0, -TAB_PANEL_SUFFIX.length);
      }
      return scopeId;
    } catch (error) {
      console.error("[utils.normalizeCognosScopeId] failed", error);
      throw error;
    }
  }

  return __controller;
});

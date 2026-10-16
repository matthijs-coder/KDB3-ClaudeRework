define([], function () {
  "use strict";

  var TAB_PANEL_SUFFIX = "_tabpanel";

  function normalizeCognosScopeId(_scopeId) {
    var scopeId;
    if (_scopeId == null) {
      return "";
    }
    scopeId = String(_scopeId).trim();
    if (scopeId.slice(-TAB_PANEL_SUFFIX.length) === TAB_PANEL_SUFFIX) {
      return scopeId.slice(0, -TAB_PANEL_SUFFIX.length);
    }
    return scopeId;
  }

  return normalizeCognosScopeId;
});

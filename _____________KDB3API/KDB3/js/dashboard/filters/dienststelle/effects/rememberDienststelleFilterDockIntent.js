define([], function () {
  "use strict";

  function ensureRuntime(_KDB) {
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.dienststelle = _KDB.runtime.dienststelle || {};
    return _KDB.runtime.dienststelle;
  }

  function rememberFilterDockIntent(_KDB, _mappedHandoff) {
    var runtime = ensureRuntime(_KDB);
    var handoff = _mappedHandoff || {};
    if (handoff.clickedClear === true || handoff.interactionType === "clear") {
      runtime.lastPendingIntent = "clear";
      runtime.lastPendingIntentScope = handoff.filterScope;
      runtime.lastPendingIntentScopeId = handoff.scopeId || handoff.scope || null;
      return;
    }
    if (handoff.interactionType === "cancel" || handoff.interactionType === "close") {
      runtime.lastPendingIntent = null;
      runtime.lastPendingIntentScope = null;
      runtime.lastPendingIntentScopeId = null;
    }
  }

  function readCommitSourceWasClear(_KDB, _mappedHandoff) {
    var runtime = ensureRuntime(_KDB);
    var handoff = _mappedHandoff || {};
    var wasPendingClear = runtime.lastPendingIntent === "clear";
    if (handoff.clickedOk === true) {
      runtime.lastPendingIntent = "confirm";
    }
    return wasPendingClear || handoff.clickedClear === true || handoff.interactionType === "clear";
  }

  return {
    rememberFilterDockIntent: rememberFilterDockIntent,
    readCommitSourceWasClear: readCommitSourceWasClear
  };
});

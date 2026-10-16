define(["../config/actions.js"], function (_actions) {
  "use strict";

  function __controller(_dispatch, _routeDispatchResult) {
    var diagnostics;
    var diagnostic;
    var idx;
    if (
      typeof _dispatch !== "function" ||
      !_routeDispatchResult ||
      !Array.isArray(_routeDispatchResult.diagnostics)
    ) {
      return false;
    }
    try {
      diagnostics = _routeDispatchResult.diagnostics;
      for (idx = 0; idx < diagnostics.length; idx += 1) {
        diagnostic = diagnostics[idx];
        if (!diagnostic || !diagnostic.code) {
          continue;
        }
        console.warn("[filterDock.recordFiltersReadyDiagnostics] observed", diagnostic);
        _dispatch({
          type: _actions.FILTERS_READY_DIAGNOSTIC_OBSERVED,
          payload: {
            errorCode: diagnostic.code,
            errorMessage: diagnostic.message || null
          }
        });
      }
      return diagnostics.length > 0;
    } catch (error) {
      console.error("[filterDock.recordFiltersReadyDiagnostics] failed", error);
      return false;
    }
  }

  return __controller;
});

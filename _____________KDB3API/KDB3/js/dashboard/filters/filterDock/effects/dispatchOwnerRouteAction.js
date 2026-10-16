define(["./resolveOwnerRoute.js"], function (_resolveOwnerRoute) {
  "use strict";

  function __controller(_KDB, _route, _dispatchType, _payload, _ownerKey) {
    var api = _KDB && _KDB.api && _KDB.api[_route.apiKey];
    if (!api || typeof api.dispatch !== "function") {
      return {
        ok: false,
        diagnostic: _resolveOwnerRoute.buildRouteDiagnostic(
          "FILTER_DOCK_OWNER_API_MISSING",
          "owner API missing for " + _ownerKey,
          _ownerKey,
          _dispatchType
        )
      };
    }
    try {
      api.dispatch({
        type: _dispatchType,
        payload: _payload
      });
      return { ok: true };
    } catch (error) {
      console.error("[filterDock.dispatchOwnerRouteAction] owner dispatch failed", {
        ownerKey: _ownerKey,
        actionType: _dispatchType
      }, error);
      return {
        ok: false,
        diagnostic: _resolveOwnerRoute.buildRouteDiagnostic(
          "FILTER_DOCK_OWNER_DISPATCH_FAILED",
          error && error.message ? error.message : String(error),
          _ownerKey,
          _dispatchType
        )
      };
    }
  }

  return __controller;
});

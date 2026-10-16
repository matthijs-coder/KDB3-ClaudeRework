define(["../config/ownerRoutes.js"], function (_ownerRoutes) {
  "use strict";

  function buildRouteDiagnostic(_code, _message, _ownerKey, _actionType) {
    return {
      code: _code,
      message: _message || null,
      ownerKey: _ownerKey || null,
      actionType: _actionType || null
    };
  }

  function validateSingleSelectFiltersReadyRoute() {
    var route = _ownerRoutes.OWNER_ROUTE_MAP.singleSelect;
    var actionType = route && route.actionTypes ? route.actionTypes.filtersReady : null;
    if (
      route &&
      route.needsFilterDockFiltersReady === true &&
      typeof actionType === "string" &&
      String(actionType).trim()
    ) {
      return null;
    }
    return buildRouteDiagnostic(
      "SINGLE_SELECT_FILTERS_READY_ROUTE_MISSING",
      "singleSelect filtersReady route/action is missing in filterDock owner route map",
      "singleSelect",
      "filtersReady"
    );
  }

  function buildOwnerPayload(_handoff, _route) {
    var payload = Object.assign({}, _handoff);
    if (_route && _route.allowDeprecatedScopeProjection === true) {
      payload.scope = _handoff.legacyScope || "unknown";
      payload.scopeId = _handoff.legacyScopeId || "unknown";
      return payload;
    }
    delete payload.scope;
    delete payload.legacyScope;
    delete payload.legacyScopeId;
    return payload;
  }

  function ownerNeedsPopupDisplayResync(_filterType) {
    var route = _ownerRoutes.OWNER_ROUTE_MAP[_filterType];
    return !!(route && route.needsPopupDisplayResync === true);
  }

  return {
    buildRouteDiagnostic: buildRouteDiagnostic,
    buildOwnerPayload: buildOwnerPayload,
    ownerNeedsPopupDisplayResync: ownerNeedsPopupDisplayResync,
    validateSingleSelectFiltersReadyRoute: validateSingleSelectFiltersReadyRoute
  };
});

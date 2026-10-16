define([
  "../config/ownerRoutes.js",
  "./dispatchOwnerRouteAction.js",
  "./resolveOwnerRoute.js"
], function (_ownerRoutes, _dispatchOwnerRouteAction, _resolveOwnerRoute) {
  "use strict";

  function ownerNeedsPopupDisplayResync(_filterType) {
    return _resolveOwnerRoute.ownerNeedsPopupDisplayResync(_filterType);
  }

  function dispatchObservedToOwners(_KDB, _payload, _capabilityKey, _actionKey) {
    var ownerKeys = Object.keys(_ownerRoutes.OWNER_ROUTE_MAP);
    var idx;
    var route;
    var dispatchType;
    var dispatchedCount = 0;
    var diagnostics = [];
    var dispatchResult;
    for (idx = 0; idx < ownerKeys.length; idx += 1) {
      route = _ownerRoutes.OWNER_ROUTE_MAP[ownerKeys[idx]];
      if (!route || route[_capabilityKey] !== true) {
        continue;
      }
      dispatchType = route.actionTypes && route.actionTypes[_actionKey];
      if (!dispatchType) {
        continue;
      }
      dispatchResult = _dispatchOwnerRouteAction(
        _KDB,
        route,
        dispatchType,
        Object.assign({}, _payload),
        ownerKeys[idx]
      );
      if (dispatchResult.ok) {
        dispatchedCount += 1;
      } else if (dispatchResult.diagnostic) {
        diagnostics.push(dispatchResult.diagnostic);
      }
    }
    return {
      dispatched: dispatchedCount > 0,
      diagnostics: diagnostics
    };
  }

  function dispatchFiltersReadyToOwners(_KDB, _payload) {
    var routeDiagnostic = _resolveOwnerRoute.validateSingleSelectFiltersReadyRoute();
    var result = dispatchObservedToOwners(
      _KDB,
      _payload,
      "needsFilterDockFiltersReady",
      "filtersReady"
    );
    if (routeDiagnostic) {
      console.error("[filterDock.dispatchFiltersReadyToOwners] route missing", routeDiagnostic);
      result.diagnostics.unshift(routeDiagnostic);
    }
    return result;
  }

  function dispatchHeaderObservedToOwners(_KDB, _payload) {
    return dispatchObservedToOwners(
      _KDB,
      _payload,
      "needsFilterDockHeaderResync",
      "headerObserved"
    ).dispatched;
  }

  function dispatchCommittedDisplayObservedToOwners(_KDB, _payload) {
    return dispatchObservedToOwners(
      _KDB,
      _payload,
      "needsFilterDockCommittedDisplayResync",
      "committedDisplayObserved"
    ).dispatched;
  }

  function __controller(_KDB, _handoff, _actionType) {
    var route;
    var dispatchType;
    var dispatchResult;

    if (!_handoff || !_ownerRoutes.SUPPORTED_FILTER_TYPES[_handoff.filterType]) {
      return false;
    }
    route = _ownerRoutes.OWNER_ROUTE_MAP[_handoff.filterType];
    if (!route) {
      return false;
    }
    dispatchType = route.actionTypes[_actionType];
    if (!dispatchType) {
      return false;
    }
    dispatchResult = _dispatchOwnerRouteAction(
      _KDB,
      route,
      dispatchType,
      _resolveOwnerRoute.buildOwnerPayload(_handoff, route),
      _handoff.filterType
    );
    return dispatchResult.ok;
  }

  __controller.ownerNeedsPopupDisplayResync = ownerNeedsPopupDisplayResync;
  __controller.dispatchFiltersReadyToOwners = dispatchFiltersReadyToOwners;
  __controller.dispatchHeaderObservedToOwners = dispatchHeaderObservedToOwners;
  __controller.dispatchCommittedDisplayObservedToOwners = dispatchCommittedDisplayObservedToOwners;

  return __controller;
});

define(["./ownerRoutes.js"], function (_ownerRoutes) {
  "use strict";

  function buildRouteDiagnostic(code, message, ownerKey, actionType) {
    return {
      code: code,
      message: message || null,
      ownerKey: ownerKey || null,
      actionType: actionType || null
    };
  }

  function buildOwnerPayload(handoff, route) {
    var payload = Object.assign({}, handoff);
    if (route && route.allowDeprecatedScopeProjection === true) {
      payload.scope = handoff.legacyScope || "unknown";
      payload.scopeId = handoff.legacyScopeId || "unknown";
      return payload;
    }
    delete payload.scope;
    delete payload.legacyScope;
    delete payload.legacyScopeId;
    return payload;
  }

  // Cross-module boundary: one failing owner must not stop the remaining owners.
  function dispatchOwnerAction(_KDB, route, dispatchType, payload, ownerKey) {
    var api = _KDB && _KDB.api && _KDB.api[route.apiKey];
    if (!api || typeof api.dispatch !== "function") {
      return {
        ok: false,
        diagnostic: buildRouteDiagnostic(
          "FILTER_DOCK_OWNER_API_MISSING",
          "owner API missing for " + ownerKey,
          ownerKey,
          dispatchType
        )
      };
    }
    try {
      api.dispatch({ type: dispatchType, payload: payload });
      return { ok: true };
    } catch (error) {
      console.error("[filterDock.dispatchOwnerAction] owner dispatch failed", {
        ownerKey: ownerKey,
        actionType: dispatchType
      }, error);
      return {
        ok: false,
        diagnostic: buildRouteDiagnostic(
          "FILTER_DOCK_OWNER_DISPATCH_FAILED",
          error && error.message ? error.message : String(error),
          ownerKey,
          dispatchType
        )
      };
    }
  }

  function dispatchHandoffToOwner(_KDB, handoff, actionKey) {
    var route = handoff ? _ownerRoutes.readOwnerRoute(handoff.filterType) : null;
    var dispatchType = route ? route.actionTypes[actionKey] : null;
    if (!dispatchType) {
      return false;
    }
    return dispatchOwnerAction(
      _KDB,
      route,
      dispatchType,
      buildOwnerPayload(handoff, route),
      handoff.filterType
    ).ok;
  }

  function dispatchObservedToOwners(_KDB, payload, capabilityKey, actionKey) {
    var diagnostics = [];
    var dispatchedCount = 0;
    Object.keys(_ownerRoutes.OWNER_ROUTE_MAP).forEach(function (ownerKey) {
      var route = _ownerRoutes.OWNER_ROUTE_MAP[ownerKey];
      var dispatchType = route[capabilityKey] === true && route.actionTypes[actionKey];
      var result;
      if (!dispatchType) {
        return;
      }
      result = dispatchOwnerAction(_KDB, route, dispatchType, Object.assign({}, payload), ownerKey);
      if (result.ok) {
        dispatchedCount += 1;
      } else if (result.diagnostic) {
        diagnostics.push(result.diagnostic);
      }
    });
    return { dispatched: dispatchedCount > 0, diagnostics: diagnostics };
  }

  function dispatchFiltersReadyToOwners(_KDB, payload) {
    return dispatchObservedToOwners(_KDB, payload, "needsFilterDockFiltersReady", "filtersReady");
  }

  function dispatchHeaderObservedToOwners(_KDB, payload) {
    return dispatchObservedToOwners(_KDB, payload, "needsFilterDockHeaderResync", "headerObserved").dispatched;
  }

  function dispatchCommittedDisplayObservedToOwners(_KDB, payload) {
    return dispatchObservedToOwners(
      _KDB,
      payload,
      "needsFilterDockCommittedDisplayResync",
      "committedDisplayObserved"
    ).dispatched;
  }

  return {
    buildOwnerPayload: buildOwnerPayload,
    dispatchHandoffToOwner: dispatchHandoffToOwner,
    dispatchFiltersReadyToOwners: dispatchFiltersReadyToOwners,
    dispatchHeaderObservedToOwners: dispatchHeaderObservedToOwners,
    dispatchCommittedDisplayObservedToOwners: dispatchCommittedDisplayObservedToOwners
  };
});

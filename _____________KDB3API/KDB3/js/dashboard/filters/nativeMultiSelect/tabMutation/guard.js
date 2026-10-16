define([
  "../state.js",
  "../../_core/tabMutation.js",
  "../../_core/tabMutationScopes.js"
], function (_state, _tabMutation, _scopes) {
  "use strict";

  var RUN_GUARD = _tabMutation.createRunGuard({
    staleMode: "runId",
    options: {
      pinOperationId: false,
      ensureRunIdDefault0: true,
      includeRunIdsInDiagnostic: true,
      missingIdsMessage: "NativeMultiSelect tab mutation requires runId and operationId",
      supersededMessage: "NativeMultiSelect tab mutation run was superseded"
    }
  });
  var TAB_MUTATION_BASE = { name: "nativeMultiSelect", guard: RUN_GUARD };

  // Tabs facet stamped by register onto runtime.tabsFacet. A facet that is missing or fails reads as no tabs.
  function readTabs(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.nativeMultiSelect : null;
    var tabsFacet = rt && rt.tabsFacet ? rt.tabsFacet : null;
    try {
      if (!tabsFacet || typeof tabsFacet.listTabs !== "function") {
        return null;
      }
      var outcome = tabsFacet.listTabs();
      return outcome && outcome.ok === true && Array.isArray(outcome.data) ? outcome.data : null;
    } catch (_error) {
      return null;
    }
  }

  // { ok, scopeId } for a plan slot; { ok: true, skip: true } for a slot whose scope is global.
  var resolveScopeIdForSlot = _scopes.createSlotScopeResolver({
    resolveScopeId: _scopes.createScopeIdResolver({ readTabs: readTabs }),
    isGlobalScope: function (_scopeId) { return _state.stripTabpanel(_scopeId) === "global"; }
  });

  return {
    tabMutationBase: TAB_MUTATION_BASE,
    isStale: RUN_GUARD.isStale,
    resolveScopeIdForSlot: resolveScopeIdForSlot
  };
});

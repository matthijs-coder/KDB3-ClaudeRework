define([
  "./mapFilterDockHandoff.js",
  "./resolveInteractionInstance.js",
  "./executeResolvedInteraction.js",
  "./validateFilterDockHandoff.js",
  "./recordFilterDockDiagnostics.js"
], function (
  _mapFilterDockHandoff,
  _resolveInteractionInstance,
  _executeResolvedInteraction,
  _validateFilterDockHandoff,
  _diagnostics
) {
  "use strict";

  async function runFilterDockHandoff(_KDB, _runtime, _handoffContext, _actionType, _options) {
    try {
      var resolved = await _resolveInteractionInstance.resolveInteractionInstance(
        _KDB,
        _handoffContext,
        _KDB.state.filters.singleSelect.instancesById || {}
      );
      return await _executeResolvedInteraction.handleResolvedInteraction(
        _KDB, _runtime, _handoffContext, resolved, _actionType, _options
      );
    } catch (error) {
      var failure = _diagnostics.buildHandoffFailure(_handoffContext, error);
      console.error("[singleSelect.processFilterDockHandoff] async interaction failed", {
        filterInstanceId: failure.filterInstanceId,
        errorCode: failure.code
      }, error);
      _diagnostics.appendHandoffFailure(_KDB, failure);
      return failure;
    }
  }

  function processFilterDockHandoff(_KDB, _runtime, _payload, _actionType, _options) {
    var handoffContext = null;
    try {
      handoffContext = _mapFilterDockHandoff(_payload);
      if (!handoffContext ||
        !_validateFilterDockHandoff.isAcceptedFilterType(handoffContext.filterType)) {
        var validationFailure = _diagnostics.buildHandoffFailure(
          handoffContext,
          new Error("filterDock handoff mapping returned an unsupported filter type")
        );
        console.error("[singleSelect.processFilterDockHandoff] validation failed", {
          actionType: _actionType,
          filterType: handoffContext && handoffContext.filterType || null,
          errorCode: validationFailure.code
        });
        _diagnostics.appendHandoffFailure(_KDB, validationFailure);
        return Promise.resolve(validationFailure);
      }
      if (_validateFilterDockHandoff.needsSpecialRightsData(handoffContext)) {
        console.warn("[singleSelect.dispatch] specialSingleSelect deferred");
        return Promise.resolve({ ok: true, deferred: true });
      }
      return runFilterDockHandoff(
        _KDB, _runtime, handoffContext, _actionType, _options
      );
    } catch (error) {
      var failure = _diagnostics.buildHandoffFailure(
        handoffContext || _payload,
        error
      );
      console.error("[singleSelect.processFilterDockHandoff] synchronous launch failed", {
        actionType: _actionType,
        filterInstanceId: failure.filterInstanceId,
        errorCode: failure.code
      }, error);
      _diagnostics.appendHandoffFailure(_KDB, failure);
      return Promise.resolve(failure);
    }
  }

  return {
    processFilterDockHandoff: processFilterDockHandoff,
    runFilterDockHandoff: runFilterDockHandoff
  };
});

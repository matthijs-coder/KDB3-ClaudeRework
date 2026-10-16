define([
  "../config.js",
  "./routeInteraction.js",
  "../../_core/dockHandoff.js"
], function (_config, _routeInteraction, _dockHandoff) {
  "use strict";

  var codes = _config.errorCodes;

  function cloneSelection(_selection) {
    return _selection ? Object.assign({}, _selection) : null;
  }

  function cloneOwnerSelectionContext(_ownerSelectionContext) {
    var context = _ownerSelectionContext || null;
    if (!context || typeof context !== "object") {
      return null;
    }
    return {
      currentSelection: cloneSelection(context.currentSelection),
      backupSelection: cloneSelection(context.backupSelection),
      pendingSelection: cloneSelection(context.pendingSelection)
    };
  }

  var HANDOFF_PROFILE = {
    labelDefault: "",
    scopeMode: "filterScopeFirst",
    keyScope: "filterScope",
    timestamp: "timestampFirst",
    fields: [
      ["filterId", "orNull"],
      ["filterLabel", "derived"],
      ["filterKey", "derived"],
      ["filterScope", "derived"],
      ["scopeType", "derived"],
      ["filterType", "filterType"],
      ["filterInstanceId", "orNull"],
      ["scopeId", "scopeIdPair"],
      ["scope", "scopePair"],
      ["scopeResolution", "orNull"],
      ["tabId", "orNull"],
      ["itemNameHint", "orNull"],
      ["itemIdHint", "orNull"],
      ["semanticInstanceKeyHint", "orNull"],
      ["semanticSpecialFilterId", "orNull"],
      ["authorizedByOwner", "orNull"],
      ["ownerSelectionContext", function (_raw) { return cloneOwnerSelectionContext(_raw.ownerSelectionContext); }],
      ["operationId", function (_raw) { return _raw.operationId != null ? String(_raw.operationId) : null; }],
      ["source", "orNull"],
      ["skipHistory", "isTrue"],
      ["filterConfig", "refOrEmpty"],
      ["clickTarget", "alwaysNull"],
      ["clickedOk", "derived"],
      ["clickedCancel", "derived"],
      ["clickedClear", "derived"],
      ["clickedClose", "derived"],
      ["hasAlleOption", function (_raw, _derived) { return _derived.caps.hasAlleOption === true; }],
      ["condition", function (_raw, _derived) { return _derived.caps.condition != null ? _derived.caps.condition : null; }],
      ["interactionType", "derived"],
      ["isAlleOption", "isTrue"],
      ["optionLabel", "optionLabel"],
      ["popup", "copyOrNull"],
      ["capabilities", "derived"],
      ["timestamp", "derived"]
    ]
  };

  function mapFilterDockHandoff(_handoff) {
    return _dockHandoff.mapDockHandoff(_handoff, HANDOFF_PROFILE);
  }

  function isAcceptedFilterType(_filterType) {
    return _filterType === "singleSelect" ||
      _filterType === "specialSingleSelect" ||
      _filterType === "sicht";
  }

  function needsSpecialRightsData(_handoff) {
    var conditionKey = String(
      (_handoff && _handoff.capabilities
        ? _handoff.capabilities.condition : "") || ""
    ).trim().toLowerCase();
    return _handoff.filterType === "specialSingleSelect" &&
      _handoff.authorizedByOwner !== "specialSingleSelect" &&
      (conditionKey === "personengruppe" ||
        conditionKey === "dienststellenleitung");
  }

  function buildHandoffFailure(_handoffContext, _error) {
    var ownerDelegated = _handoffContext &&
      (_handoffContext.filterType === "sicht" ||
        _handoffContext.filterType === "specialSingleSelect");
    return {
      ok: false,
      code: ownerDelegated ? codes.OWNER_SELECTION_INVALID : codes.INSTANCE_NOT_FOUND,
      filterInstanceId: _handoffContext && _handoffContext.filterInstanceId || null,
      message: String(_error && _error.message ? _error.message : _error)
    };
  }

  function appendHandoffFailure(_KDB, _failure) {
    var root = _KDB && _KDB.state && _KDB.state.filters
      ? _KDB.state.filters.singleSelect : null;
    _routeInteraction.appendDiagnostic(root, {
      code: _failure.code,
      filterInstanceId: _failure.filterInstanceId,
      message: _failure.message
    });
  }

  // Async boundary: runs after the dispatch already returned, so failures end
  // up as a diagnostic and a failure result.
  async function runFilterDockHandoff(_KDB, _runtime, _handoffContext, _actionType, _options) {
    try {
      var resolved = await _routeInteraction.resolveInteractionInstance(
        _KDB,
        _handoffContext,
        _KDB.state.filters.singleSelect.instancesById || {}
      );
      return await _routeInteraction.handleResolvedInteraction(
        _KDB, _runtime, _handoffContext, resolved, _actionType, _options
      );
    } catch (error) {
      var failure = buildHandoffFailure(_handoffContext, error);
      console.error("[singleSelect.processFilterDockHandoff] async interaction failed", {
        filterInstanceId: failure.filterInstanceId,
        errorCode: failure.code
      }, error);
      appendHandoffFailure(_KDB, failure);
      return failure;
    }
  }

  function processFilterDockHandoff(_KDB, _runtime, _payload, _actionType, _options) {
    var handoffContext = null;
    try {
      handoffContext = mapFilterDockHandoff(_payload);
      if (!handoffContext || !isAcceptedFilterType(handoffContext.filterType)) {
        var validationFailure = buildHandoffFailure(
          handoffContext,
          new Error("filterDock handoff mapping returned an unsupported filter type")
        );
        console.error("[singleSelect.processFilterDockHandoff] validation failed", {
          actionType: _actionType,
          filterType: handoffContext && handoffContext.filterType || null,
          errorCode: validationFailure.code
        });
        appendHandoffFailure(_KDB, validationFailure);
        return Promise.resolve(validationFailure);
      }
      if (needsSpecialRightsData(handoffContext)) {
        return Promise.resolve({ ok: true, deferred: true });
      }
      return runFilterDockHandoff(_KDB, _runtime, handoffContext, _actionType, _options);
    } catch (error) {
      var failure = buildHandoffFailure(handoffContext || _payload, error);
      console.error("[singleSelect.processFilterDockHandoff] synchronous launch failed", {
        actionType: _actionType,
        filterInstanceId: failure.filterInstanceId,
        errorCode: failure.code
      }, error);
      appendHandoffFailure(_KDB, failure);
      return Promise.resolve(failure);
    }
  }

  return {
    mapFilterDockHandoff: mapFilterDockHandoff,
    processFilterDockHandoff: processFilterDockHandoff
  };
});

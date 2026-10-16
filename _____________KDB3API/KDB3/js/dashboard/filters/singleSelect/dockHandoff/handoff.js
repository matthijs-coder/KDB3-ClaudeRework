define([
  "../config.js",
  "../../../../core/utils/kit/data.js",
  "./routeInteraction.js"
], function (_config, _kitData, _routeInteraction) {
  "use strict";

  var codes = _config.errorCodes;

  function cloneSelection(_selection) {
    return _selection ? _kitData.cloneJson(_selection) : null;
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

  function deriveClickedFlags(_interactionType) {
    return {
      clickedOk: _interactionType === "confirm",
      clickedCancel: _interactionType === "cancel",
      clickedClear: _interactionType === "clear",
      clickedClose: _interactionType === "close"
    };
  }

  function mapFilterDockHandoff(_handoff) {
    if (!_handoff || typeof _handoff !== "object") {
      return null;
    }

    var filterScope = _handoff.filterScope || _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel || "";
    var filterKey = _handoff.filterKey || _handoff.filterId || filterScope + "__" + filterLabel;
    var capabilities = _handoff.capabilities ? _handoff.capabilities : {};
    var interactionType = _handoff.interactionType || "unknown";
    var clickedFlags = deriveClickedFlags(interactionType);

    return {
      filterId: _handoff.filterId || null,
      filterLabel: filterLabel,
      filterKey: filterKey,
      filterScope: filterScope,
      scopeType: _handoff.scopeType || filterScope,
      filterType: _handoff.filterType || "unknown",
      filterInstanceId: _handoff.filterInstanceId || null,
      scopeId: _handoff.scopeId || _handoff.scope || null,
      scope: _handoff.scope || _handoff.scopeId || null,
      scopeResolution: _handoff.scopeResolution || null,
      tabId: _handoff.tabId || null,
      itemNameHint: _handoff.itemNameHint || null,
      itemIdHint: _handoff.itemIdHint || null,
      semanticInstanceKeyHint: _handoff.semanticInstanceKeyHint || null,
      semanticSpecialFilterId: _handoff.semanticSpecialFilterId || null,
      authorizedByOwner: _handoff.authorizedByOwner || null,
      ownerSelectionContext: cloneOwnerSelectionContext(_handoff.ownerSelectionContext),
      operationId: _handoff.operationId != null
        ? String(_handoff.operationId)
        : null,
      source: _handoff.source || null,
      skipHistory: _handoff.skipHistory === true,
      filterConfig: _handoff.filterConfig || {},
      clickTarget: null,
      clickedOk: clickedFlags.clickedOk,
      clickedCancel: clickedFlags.clickedCancel,
      clickedClear: clickedFlags.clickedClear,
      clickedClose: clickedFlags.clickedClose,
      hasAlleOption: capabilities.hasAlleOption === true,
      condition: capabilities.condition != null ? capabilities.condition : null,
      interactionType: interactionType,
      isAlleOption: _handoff.isAlleOption === true,
      optionLabel: _handoff.optionLabel || _handoff.selectedOptionLabel || null,
      popup: _handoff.popup ? Object.assign({}, _handoff.popup) : null,
      capabilities: Object.assign({}, capabilities),
      timestamp: _handoff.timestamp || _handoff.observedAt || Date.now()
    };
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

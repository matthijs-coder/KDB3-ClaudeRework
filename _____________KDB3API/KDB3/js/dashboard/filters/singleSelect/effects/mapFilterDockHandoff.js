define([], function () {
  "use strict";

  function cloneOwnerSelectionContext(_ownerSelectionContext) {
    var context = _ownerSelectionContext || null;
    if (!context || typeof context !== "object") {
      return null;
    }
    return {
      currentSelection: context.currentSelection
        ? Object.assign({}, context.currentSelection)
        : null,
      backupSelection: context.backupSelection
        ? Object.assign({}, context.backupSelection)
        : null,
      pendingSelection: context.pendingSelection
        ? Object.assign({}, context.pendingSelection)
        : null
    };
  }

  function readCapabilities(_handoff) {
    return _handoff && _handoff.capabilities ? _handoff.capabilities : {};
  }

  function deriveClickedFlags(_interactionType) {
    return {
      clickedOk: _interactionType === "confirm",
      clickedCancel: _interactionType === "cancel",
      clickedClear: _interactionType === "clear",
      clickedClose: _interactionType === "close"
    };
  }

  function __controller(_handoff) {
    if (!_handoff || typeof _handoff !== "object") {
      return null;
    }

    var filterScope = _handoff.filterScope || _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel || "";
    var filterKey = _handoff.filterKey || _handoff.filterId || filterScope + "__" + filterLabel;
    var capabilities = readCapabilities(_handoff);
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
      ownerSelectionContext: cloneOwnerSelectionContext(
        _handoff.ownerSelectionContext
      ),
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

  return __controller;
});

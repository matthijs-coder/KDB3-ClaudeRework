define([], function () {
  "use strict";

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
    if (!_handoff || typeof _handoff !== "object" || _handoff.filterType !== "dienststelle") {
      return null;
    }

    var filterScope = _handoff.filterScope || _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel || "Dienststelle";
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
      filterType: "dienststelle",
      scopeId: _handoff.scopeId || _handoff.scope || null,
      scope: _handoff.scope || _handoff.scopeId || null,
      filterConfig: _handoff.filterConfig ? Object.assign({}, _handoff.filterConfig) : {},
      interactionType: interactionType,
      isAlleOption: _handoff.isAlleOption === true,
      optionLabel: _handoff.optionLabel || _handoff.selectedOptionLabel || null,
      popup: _handoff.popup ? Object.assign({}, _handoff.popup) : null,
      capabilities: Object.assign({}, capabilities),
      clickedOk: clickedFlags.clickedOk,
      clickedCancel: clickedFlags.clickedCancel,
      clickedClear: clickedFlags.clickedClear,
      clickedClose: clickedFlags.clickedClose,
      resyncSource: _handoff.resyncSource || null,
      timestamp: _handoff.observedAt != null ? _handoff.observedAt : Date.now()
    };
  }

  return __controller;
});

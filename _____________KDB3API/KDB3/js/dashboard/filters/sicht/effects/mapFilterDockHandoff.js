define([], function () {
  "use strict";

  function readCapabilities(_handoff) {
    return _handoff && _handoff.capabilities ? _handoff.capabilities : {};
  }

  function readSerializablePopup(_popup) {
    if (!_popup || typeof _popup !== "object") {
      return null;
    }
    return {
      isVisible: _popup.isVisible === true,
      hasOptions: _popup.hasOptions === true,
      optionCount: _popup.optionCount || 0,
      hasOkButton: _popup.hasOkButton === true,
      hasCancelButton: _popup.hasCancelButton === true,
      observedAt: _popup.observedAt || null
    };
  }

  // Sicht's migrated filterDock route (contract §3): consumes the canonical
  // tabId + scopeResolution + hint fields and no longer reads the deprecated
  // scope/scope=tabId projection.
  function __controller(_handoff) {
    if (!_handoff || typeof _handoff !== "object" || _handoff.filterType !== "sicht") {
      return null;
    }
    var scopeType = _handoff.scopeType || "global";
    var filterLabel = _handoff.filterLabel || "";
    var filterKey = _handoff.filterKey || _handoff.filterId || scopeType + "__" + filterLabel;
    var capabilities = readCapabilities(_handoff);
    return {
      filterId: _handoff.filterId || null,
      filterKey: filterKey,
      filterInstanceId: _handoff.filterInstanceId || null,
      filterLabel: filterLabel,
      filterScope: scopeType,
      filterType: "sicht",
      scopeType: scopeType,
      tabId: _handoff.tabId != null ? _handoff.tabId : null,
      scopeId: _handoff.scopeId != null ? _handoff.scopeId : (scopeType === "global" ? "global" : null),
      scopeResolution: _handoff.scopeResolution || (scopeType === "global" ? "global" : "ownerRequired"),
      itemIdHint: _handoff.itemIdHint != null ? _handoff.itemIdHint : null,
      itemNameHint: _handoff.itemNameHint || filterLabel,
      semanticInstanceKeyHint: _handoff.semanticInstanceKeyHint != null ? _handoff.semanticInstanceKeyHint : null,
      filterConfig: _handoff.filterConfig || {},
      interactionType: _handoff.interactionType || "unknown",
      optionLabel: _handoff.optionLabel || _handoff.selectedOptionLabel || null,
      isAlleOption: _handoff.isAlleOption === true,
      popup: readSerializablePopup(_handoff.popup),
      capabilities: Object.assign({}, capabilities),
      timestamp: _handoff.timestamp || _handoff.observedAt || Date.now()
    };
  }

  return __controller;
});

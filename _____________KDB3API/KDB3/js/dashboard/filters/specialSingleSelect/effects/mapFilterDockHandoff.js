define([
  "../config/specialFilterDefinitions.js",
  "../config/resolveSpecialFilterId.js"
], function (_specialFilterDefinitions, _resolveSpecialFilterId) {
  "use strict";

  function readCapabilities(_handoff) {
    return _handoff && _handoff.capabilities ? _handoff.capabilities : {};
  }

  function __controller(_handoff) {
    var filterLabel;
    var capabilities;
    var runtimeFilterId;
    var filterKey;
    var canonicalFilterId;
    var mapped;

    if (!_handoff || typeof _handoff !== "object") {
      return null;
    }
    filterLabel = _handoff.filterLabel || "";
    capabilities = readCapabilities(_handoff);
    runtimeFilterId = _handoff.filterId || null;
    filterKey = _handoff.filterKey || runtimeFilterId || ((_handoff.scopeType || "global") + "__" + filterLabel);
    mapped = {
      filterLabel: filterLabel,
      filterKey: filterKey,
      filterScope: _handoff.filterScope || _handoff.scopeType || "global",
      filterType: _handoff.filterType || "unknown",
      scopeType: _handoff.scopeType || _handoff.filterScope || "global",
      tabId: _handoff.tabId || null,
      scopeId: _handoff.scopeId != null ? _handoff.scopeId : _handoff.scope || null,
      filterConfig: Object.assign({}, _handoff.filterConfig || {}),
      condition: capabilities.condition != null ? capabilities.condition : _handoff.condition || null,
      semanticSpecialFilterId: null,
      itemNameHint: _handoff.itemNameHint || null,
      itemIdHint: _handoff.itemIdHint || null,
      semanticInstanceKeyHint: _handoff.semanticInstanceKeyHint || null,
      interactionType: _handoff.interactionType || "unknown",
      isAlleOption: _handoff.isAlleOption === true,
      optionLabel: _handoff.optionLabel || _handoff.selectedOptionLabel || null,
      popup: _handoff.popup ? Object.assign({}, _handoff.popup) : null,
      capabilities: Object.assign({}, capabilities),
      timestamp: _handoff.observedAt || Date.now(),
      runtimeFilterId: runtimeFilterId
    };
    canonicalFilterId = _resolveSpecialFilterId.resolveSpecialFilterId(_specialFilterDefinitions, {
      filterId: runtimeFilterId,
      condition: mapped.condition,
      filterLabel: mapped.filterLabel
    });
    if (!canonicalFilterId) {
      return null;
    }
    mapped.filterId = canonicalFilterId;
    mapped.semanticSpecialFilterId = canonicalFilterId;
    return mapped;
  }

  return __controller;
});

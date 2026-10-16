define([], function () {
  "use strict";

  function cloneSerializableObject(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (error) {
      return {};
    }
  }

  function __controller(_lastClickedFilter, _lastInteraction, _popup) {
    var capabilities;
    var filterConfig;
    if (!_lastClickedFilter || !_popup) {
      return null;
    }
    capabilities =
      _lastInteraction && _lastInteraction.capabilities
        ? cloneSerializableObject(_lastInteraction.capabilities)
        : {};
    filterConfig =
      _lastInteraction && _lastInteraction.filterConfig
        ? cloneSerializableObject(_lastInteraction.filterConfig)
        : {};
    return {
      filterId: _lastClickedFilter.filterId,
      filterKey: _lastClickedFilter.filterKey,
      filterInstanceId: _lastClickedFilter.filterInstanceId,
      filterLabel: _lastClickedFilter.filterLabel,
      itemNameHint: _lastClickedFilter.itemNameHint,
      itemIdHint: _lastClickedFilter.itemIdHint,
      semanticInstanceKeyHint: _lastClickedFilter.semanticInstanceKeyHint,
      filterType: _lastClickedFilter.filterType,
      filterScope: _lastClickedFilter.filterScope,
      scopeType: _lastClickedFilter.scopeType || _lastClickedFilter.filterScope,
      tabId: _lastClickedFilter.tabId || null,
      scopeId: _lastClickedFilter.scopeId,
      scopeResolution: _lastClickedFilter.scopeResolution || null,
      legacyScope: _lastClickedFilter.legacyScope || null,
      legacyScopeId: _lastClickedFilter.legacyScopeId || null,
      tabContextDiagnostic: _lastClickedFilter.tabContextDiagnostic || null,
      filterConfig: filterConfig,
      capabilities: capabilities,
      interactionType: "open",
      isAlleOption: false,
      optionLabel: null,
      popup: Object.assign({}, _popup),
      observedAt: _popup.observedAt || Date.now()
    };
  }

  return __controller;
});

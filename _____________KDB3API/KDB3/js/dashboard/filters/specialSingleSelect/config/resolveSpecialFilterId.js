define([], function () {
  "use strict";

  function normalizeMatchValue(_value) {
    return _value != null ? String(_value).toLowerCase() : "";
  }

  function resolveByDefinitionField(_definitions, _value, _field) {
    var normalizedValue = normalizeMatchValue(_value);
    var filterIds;
    var idx;
    if (!normalizedValue) {
      return null;
    }
    filterIds = Object.keys(_definitions);
    for (idx = 0; idx < filterIds.length; idx += 1) {
      if (
        _definitions[filterIds[idx]] &&
        normalizeMatchValue(_definitions[filterIds[idx]][_field]) === normalizedValue
      ) {
        return filterIds[idx];
      }
    }
    return null;
  }

  function resolveSpecialFilterId(_definitions, _payload) {
    var payload = _payload || {};
    var canonicalId;
    if (!payload || typeof payload !== "object" || !_definitions) {
      return null;
    }
    if (payload.filterId && _definitions[payload.filterId]) {
      return payload.filterId;
    }
    canonicalId = resolveByDefinitionField(_definitions, payload.condition, "condition");
    return canonicalId || resolveByDefinitionField(_definitions, payload.filterLabel, "filterLabel");
  }

  function normalizeUserSelectionCommittedPayload(_definitions, _payload) {
    var payload = _payload || {};
    var canonicalFilterId = resolveSpecialFilterId(_definitions, payload);
    var selection = payload && payload.selection;
    if (!canonicalFilterId) {
      return null;
    }
    return {
      filterId: canonicalFilterId,
      runtimeFilterId: payload.runtimeFilterId || payload.filterId,
      filterInstanceId: payload.filterInstanceId || null,
      semanticSpecialFilterId: payload.semanticSpecialFilterId || canonicalFilterId,
      filterKey: payload.filterKey,
      filterLabel: payload.filterLabel,
      filterScope: payload.filterScope,
      condition: payload.condition,
      displayValue:
        selection && selection.displayValue != null ? selection.displayValue : payload.displayValue,
      useValue: selection && selection.useValue != null ? selection.useValue : payload.useValue,
      observedAt: payload.observedAt || Date.now()
    };
  }

  return {
    resolveSpecialFilterId: resolveSpecialFilterId,
    normalizeUserSelectionCommittedPayload: normalizeUserSelectionCommittedPayload
  };
});

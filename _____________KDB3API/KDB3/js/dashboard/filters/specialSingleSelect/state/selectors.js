define([], function () {
  "use strict";

  function cloneValue(_value) {
    if (_value == null) {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return undefined;
    }
  }

  function readSpecialSingleSelectState(_KDB) {
    var state = _KDB && _KDB.state && _KDB.state.filters ? _KDB.state.filters.specialSingleSelect : null;
    if (!state || state.lifecycle === "disposed") {
      return undefined;
    }
    return cloneValue(state);
  }

  function readSpecialFilterState(_KDB, _filterId) {
    var root = readSpecialSingleSelectState(_KDB);
    if (!root || !_filterId) {
      return undefined;
    }
    return cloneValue(root.byFilterId[_filterId]);
  }

  function readActiveSichtValue(_KDB) {
    var root = readSpecialSingleSelectState(_KDB);
    if (!root) {
      return null;
    }
    return root.activeSichtValue != null ? root.activeSichtValue : null;
  }

  function readSpecialFilterPolicy(_KDB, _semanticSpecialFilterId) {
    var policy = readSpecialFilterState(_KDB, _semanticSpecialFilterId);
    if (!policy) {
      return undefined;
    }
    return Object.assign({}, policy, {
      selectionSourceByInstanceId: cloneValue(policy.selectionSourceByInstanceId || {}),
      parkedSelectionsByInstanceId: cloneValue(policy.parkedSelectionsByInstanceId || {})
    });
  }

  function readSpecialFilterVisibility(_KDB, _semanticSpecialFilterId) {
    var policy = readSpecialFilterPolicy(_KDB, _semanticSpecialFilterId);
    if (!policy) {
      return undefined;
    }
    return {
      filterId: _semanticSpecialFilterId,
      isVisible: policy.isVisible === true,
      isVisibleForSicht: policy.isVisibleForSicht === true,
      rightAllowed: policy.rightAllowed === true
    };
  }

  function readParkedSpecialSelections(_KDB, _semanticSpecialFilterId) {
    var policy = readSpecialFilterPolicy(_KDB, _semanticSpecialFilterId);
    if (!policy) {
      return undefined;
    }
    return cloneValue(policy.parkedSelectionsByInstanceId || {});
  }

  return {
    readSpecialSingleSelectState: readSpecialSingleSelectState,
    readSpecialFilterState: readSpecialFilterState,
    readActiveSichtValue: readActiveSichtValue,
    readSpecialFilterPolicy: readSpecialFilterPolicy,
    readSpecialFilterVisibility: readSpecialFilterVisibility,
    readParkedSpecialSelections: readParkedSpecialSelections
  };
});

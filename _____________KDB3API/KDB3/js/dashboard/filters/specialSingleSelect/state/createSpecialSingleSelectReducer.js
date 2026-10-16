define([
  "../config/actions.js",
  "./initialState.js"
], function (_actions, _initialState) {
  "use strict";

  function cloneParkedSelections(_entries) {
    var source = _entries || {};
    var next = {};
    Object.keys(source).forEach(function (_instanceId) {
      if (!source[_instanceId]) {
        return;
      }
      next[_instanceId] = Object.assign({}, source[_instanceId]);
    });
    return next;
  }

  function cloneSelectionSources(_entries) {
    return Object.assign({}, _entries || {});
  }

  function mergeFilterPatch(_state, _filterId, _patch) {
    var next = Object.assign({}, _state);
    var current = next.byFilterId[_filterId] || {};
    next.byFilterId = Object.assign({}, next.byFilterId);
    next.byFilterId[_filterId] = Object.assign({}, current, _patch || {}, {
      selectionSourceByInstanceId: cloneSelectionSources(
        _patch && _patch.selectionSourceByInstanceId != null
          ? _patch.selectionSourceByInstanceId
          : current.selectionSourceByInstanceId
      ),
      parkedSelectionsByInstanceId: cloneParkedSelections(
        _patch && _patch.parkedSelectionsByInstanceId != null
          ? _patch.parkedSelectionsByInstanceId
          : current.parkedSelectionsByInstanceId
      )
    });
    return next;
  }

  function createSpecialSingleSelectReducer() {
    return function reducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};

      if (action.type === _actions.MOUNT_SUCCEEDED) {
        return Object.assign({}, state, {
          lifecycle: "ready",
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.SICHT_CHANGED) {
        return Object.assign({}, state, {
          activeSichtValue: payload.activeSichtValue != null ? payload.activeSichtValue : null,
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.SYNC_FILTER_EVALUATED) {
        if (!payload.filterId || !state.byFilterId[payload.filterId]) {
          return state;
        }
        return mergeFilterPatch(state, payload.filterId, payload.patch);
      }
      if (action.type === _actions.USER_SELECTION_COMMITTED) {
        if (!payload.filterId || !state.byFilterId[payload.filterId]) {
          return state;
        }
        var currentFilter = state.byFilterId[payload.filterId] || {};
        var parkedSelections = cloneParkedSelections(currentFilter.parkedSelectionsByInstanceId);
        var selectionSources = cloneSelectionSources(currentFilter.selectionSourceByInstanceId);
        if (payload.filterInstanceId) {
          delete parkedSelections[payload.filterInstanceId];
          selectionSources[payload.filterInstanceId] = "user";
        }
        return mergeFilterPatch(state, payload.filterId, {
          selectionSource: "user",
          selectionSourceByInstanceId: selectionSources,
          parkedSelectionsByInstanceId: parkedSelections,
          lastAppliedUseValue: payload.useValue != null ? payload.useValue : null,
          lastAppliedDisplayValue: payload.displayValue != null ? payload.displayValue : null,
          wasSetBySpecialSingleSelect: false,
          filterKey: payload.filterKey != null ? payload.filterKey : currentFilter.filterKey,
          lastPolicyAppliedAt: payload.observedAt || Date.now(),
          errorCode: null,
          errorMessage: null
        });
      }
      if (action.type === _actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode || "SPECIAL_SINGLE_SELECT_ERROR",
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : ""
        });
      }
      if (action.type === _actions.DESTROY) {
        return Object.assign({}, state, { lifecycle: "disposed" });
      }
      return state;
    };
  }

  return createSpecialSingleSelectReducer;
});

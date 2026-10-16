define([
  "../config/actions.js",
  "./initialState.js"
], function (_actions, _initialState) {
  "use strict";

  function cloneValues(_values) {
    return Array.isArray(_values)
      ? _values.map(function (value) {
        return value
          ? { d: value.d != null ? String(value.d) : "", u: value.u != null ? String(value.u) : "" }
          : { d: "", u: "" };
      })
      : [];
  }

  function cloneItems(_items) {
    return Array.isArray(_items)
      ? _items.map(function (item) {
        var entry = item || {};
        return {
          itemId: entry.itemId != null ? String(entry.itemId) : "",
          itemName: entry.itemName != null ? String(entry.itemName) : "",
          sourceId: entry.sourceId != null ? String(entry.sourceId) : "",
          values: cloneValues(entry.values)
        };
      })
      : [];
  }

  function createNativeMultiSelectReducer() {
    function reducer(_state, _action) {
      var state = _state || _initialState();
      var action = _action || {};
      var payload = action.payload || {};
      var nextByScope;
      var scopeId;
      if (action.type === _actions.MOUNT_READY) {
        return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
      }
      if (action.type === _actions.TAB_MUTATION_SCOPE_WRITE) {
        scopeId = payload.scopeId != null ? String(payload.scopeId) : "";
        if (!scopeId) { return state; }
        nextByScope = Object.assign({}, state.byScope || {});
        nextByScope[scopeId] = payload.clear === true ? [] : cloneItems(payload.items);
        return Object.assign({}, state, { byScope: nextByScope, errorCode: null, errorMessage: null });
      }
      if (action.type === _actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode != null ? String(payload.errorCode) : null,
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : null
        });
      }
      if (action.type === _actions.DESTROY) {
        return Object.assign({}, state, { lifecycle: "disposed" });
      }
      return state;
    }
    return reducer;
  }

  return createNativeMultiSelectReducer;
});

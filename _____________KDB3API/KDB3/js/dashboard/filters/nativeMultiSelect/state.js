define([
  "./config.js"
], function (_config) {
  "use strict";

  var actions = _config.actions;

  function initialState() {
    return {
      lifecycle: "idle",
      byScope: {},
      errorCode: null,
      errorMessage: null
    };
  }

  function cloneValues(_values) {
    return Array.isArray(_values)
      ? _values.map(function (value) {
        return value
          ? { d: value.d != null ? String(value.d) : "", u: value.u != null ? String(value.u) : "" }
          : { d: "", u: "" };
      })
      : [];
  }

  function cloneItem(_item) {
    var entry = _item || {};
    return {
      itemId: entry.itemId != null ? String(entry.itemId) : "",
      itemName: entry.itemName != null ? String(entry.itemName) : "",
      sourceId: entry.sourceId != null ? String(entry.sourceId) : "",
      values: cloneValues(entry.values)
    };
  }

  // Value pairs with both parts non-empty after trimming, the shape stored in writeback and history payloads.
  function materializeValues(_values) {
    var result = [];
    var idx;
    for (idx = 0; idx < (_values || []).length; idx += 1) {
      var pair = _values[idx] || {};
      var d = String(pair.d == null ? "" : pair.d).trim();
      var u = String(pair.u == null ? "" : pair.u).trim();
      if (d !== "" && u !== "") { result.push({ d: d, u: u }); }
    }
    return result;
  }

  function stripTabpanel(_scope) {
    return String(_scope || "").replace(/_tabpanel$/, "");
  }

  function readByScope(_KDB) {
    var ownerState = _KDB.state && _KDB.state.filters && _KDB.state.filters.nativeMultiSelect;
    return ownerState && ownerState.byScope ? ownerState.byScope : {};
  }

  // Returns the stored byScope key that equals the raw scope without its "_tabpanel" suffix, so a scope is
  // written under the same key it was stored under before. "" for global or empty scopes.
  function reuseByScopeKey(_KDB, _rawScope) {
    var stripped = stripTabpanel(_rawScope);
    var keys;
    var idx;
    if (!stripped || stripped === "global") { return ""; }
    keys = Object.keys(readByScope(_KDB));
    for (idx = 0; idx < keys.length; idx += 1) {
      if (stripTabpanel(keys[idx]) === stripped) { return keys[idx]; }
    }
    return String(_rawScope);
  }

  function createReducer() {
    function reducer(_state, _action) {
      var state = _state || initialState();
      var action = _action || {};
      var payload = action.payload || {};
      var nextByScope;
      var scopeId;
      if (action.type === actions.MOUNT_READY) {
        return Object.assign({}, state, { lifecycle: "ready", errorCode: null, errorMessage: null });
      }
      if (action.type === actions.TAB_MUTATION_SCOPE_WRITE) {
        scopeId = payload.scopeId != null ? String(payload.scopeId) : "";
        if (!scopeId) { return state; }
        nextByScope = Object.assign({}, state.byScope || {});
        nextByScope[scopeId] = payload.clear === true ? [] : (Array.isArray(payload.items) ? payload.items.map(cloneItem) : []);
        return Object.assign({}, state, { byScope: nextByScope, errorCode: null, errorMessage: null });
      }
      if (action.type === actions.ERROR) {
        return Object.assign({}, state, {
          lifecycle: "error",
          errorCode: payload.errorCode != null ? String(payload.errorCode) : null,
          errorMessage: payload.errorMessage != null ? String(payload.errorMessage) : null
        });
      }
      if (action.type === actions.DESTROY) {
        return Object.assign({}, state, { lifecycle: "disposed" });
      }
      return state;
    }
    return reducer;
  }

  return {
    initialState: initialState,
    createReducer: createReducer,
    cloneValues: cloneValues,
    cloneItem: cloneItem,
    materializeValues: materializeValues,
    stripTabpanel: stripTabpanel,
    readByScope: readByScope,
    reuseByScopeKey: reuseByScopeKey
  };
});

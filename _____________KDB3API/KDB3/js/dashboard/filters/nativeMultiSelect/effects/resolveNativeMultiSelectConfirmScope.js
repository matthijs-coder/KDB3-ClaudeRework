define(["./stripTabpanel.js"], function (_stripTabpanel) {
  "use strict";

  function readByScope(_KDB) {
    var ownerState = _KDB.state && _KDB.state.filters && _KDB.state.filters.nativeMultiSelect;
    return ownerState && ownerState.byScope ? ownerState.byScope : {};
  }

  function reuseByScopeKey(_KDB, _rawScope) {
    var stripped = _stripTabpanel(_rawScope);
    var byScope;
    var keys;
    var idx;
    if (!stripped || stripped === "global") { return ""; }
    byScope = readByScope(_KDB);
    keys = Object.keys(byScope);
    for (idx = 0; idx < keys.length; idx += 1) {
      if (_stripTabpanel(keys[idx]) === stripped) { return keys[idx]; }
    }
    return String(_rawScope);
  }

  function matchTabTargetScopeId(_tabTargets, _tabId) {
    var keys = Object.keys(_tabTargets || {});
    var idx;
    var target;
    var tabId = String(_tabId || "");
    for (idx = 0; idx < keys.length; idx += 1) {
      target = _tabTargets[keys[idx]] || {};
      if (String(target.tabId || "") === tabId && target.scopeId) {
        return String(target.scopeId);
      }
    }
    return "";
  }

  function resolveFromTabTargets(_KDB, _tabId, _result) {
    var resolved;
    if (!_result || _result.ok !== true) { return ""; }
    resolved = matchTabTargetScopeId(_result.tabTargets, _tabId);
    if (!resolved) { return ""; }
    return reuseByScopeKey(_KDB, resolved);
  }

  function resolveNativeMultiSelectConfirmScope(_KDB, _payload) {
    var payload = _payload || {};
    var filterScope = payload.filterScope || "";
    var scopeType = payload.scopeType || "";
    var tabsApi;
    var providedScope;
    if (filterScope === "global" || scopeType === "global") {
      return Promise.resolve("global");
    }
    providedScope = payload.scopeId != null ? String(payload.scopeId).trim() : "";
    if (providedScope && _stripTabpanel(providedScope) !== "global") {
      return Promise.resolve(reuseByScopeKey(_KDB, providedScope) || providedScope);
    }
    tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!payload.tabId || !tabsApi || typeof tabsApi.dispatch !== "function") {
      console.warn("[nativeMultiSelect.resolveNativeMultiSelectConfirmScope] page scope unresolved", {
        tabId: payload.tabId || null
      });
      return Promise.resolve("");
    }
    return tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "nativeMultiSelectConfirm" }
    }).then(function (_result) {
      var scopeKey = resolveFromTabTargets(_KDB, payload.tabId, _result);
      if (!scopeKey) {
        console.warn("[nativeMultiSelect.resolveNativeMultiSelectConfirmScope] page scope unresolved", {
          tabId: payload.tabId || null
        });
      }
      return scopeKey;
    }).catch(function (_err) {
      console.error("[nativeMultiSelect.resolveNativeMultiSelectConfirmScope]", _err);
      return "";
    });
  }

  return resolveNativeMultiSelectConfirmScope;
});

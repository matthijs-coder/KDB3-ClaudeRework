define([
  "../../config/actions.js",
  "../../config/parameterSetCodes.js",
  "../../effects/listUnownedNativeMultiSelectItems.js",
  "../../effects/isUnownedNativeMultiSelectItem.js",
  "../../effects/stripTabpanel.js",
  "./parameterSetHostApply.js"
], function (_actions, _codes, _listUnownedNativeMultiSelectItems, _isUnownedNativeMultiSelectItem, _stripTabpanel, _hostApply) {
  "use strict";

  function readTargetScopeId(_target) {
    return String((_target && _target.scopeId) || "").trim();
  }

  function isHardFail(_diag) {
    return _diag && _diag.code === _codes.CLEAR_FAILED;
  }

  function listAllUnownedScopes(_KDB, _filtersFacet) {
    var result = ["global"];
    var seen = { global: true };
    var outcome;
    var descriptors;
    var scopeId;
    var idx;
    if (!_filtersFacet) { return result; }
    outcome = _filtersFacet.listFilterItems({ allPageContextScopes: true });
    if (!outcome || outcome.ok !== true) { return result; }
    descriptors = outcome.data || [];
    for (idx = 0; idx < descriptors.length; idx += 1) {
      if (!_isUnownedNativeMultiSelectItem.isUnownedFilterDescriptor(_KDB, descriptors[idx])) { continue; }
      scopeId = _stripTabpanel(descriptors[idx].rawScopeId);
      if (!scopeId || seen[scopeId]) { continue; }
      seen[scopeId] = true;
      result.push(scopeId);
    }
    return result;
  }

  function isAllowedClearTabIdx(_allowedClearTabIdxs, _tabIdxKey) {
    var tabIdx;
    try {
      if (!Array.isArray(_allowedClearTabIdxs)) { return true; }
      tabIdx = parseInt(_tabIdxKey, 10);
      if (!isFinite(tabIdx) || tabIdx < 0 || Math.floor(tabIdx) !== tabIdx) { return false; }
      if (String(tabIdx) !== String(_tabIdxKey)) { return false; }
      return _allowedClearTabIdxs.indexOf(tabIdx) !== -1;
    } catch (error) {
      console.error("[nativeMultiSelect.isAllowedClearTabIdx] failed", { tabIdxKey: _tabIdxKey }, error);
      throw error;
    }
  }

  function collectScopeIds(_payload, _KDB, _filtersFacet) {
    var tabIdxToScopeId = _payload && _payload.tabIdxToScopeId;
    var allowedClearTabIdxs = _payload && _payload.allowedClearTabIdxs;
    var scopeIds;
    var seen;
    var keys;
    var idx;
    var key;
    var scopeId;
    try {
      if (tabIdxToScopeId && typeof tabIdxToScopeId === "object") {
        scopeIds = ["global"];
        seen = { global: true };
        keys = Object.keys(tabIdxToScopeId);
        for (idx = 0; idx < keys.length; idx += 1) {
          key = keys[idx];
          if (!isAllowedClearTabIdx(allowedClearTabIdxs, key)) { continue; }
          scopeId = readTargetScopeId(tabIdxToScopeId[key]);
          if (!scopeId || seen[scopeId]) { continue; }
          seen[scopeId] = true;
          scopeIds.push(scopeId);
        }
        return scopeIds;
      }
      if (Array.isArray(allowedClearTabIdxs)) {
        return ["global"];
      }
      return listAllUnownedScopes(_KDB, _filtersFacet);
    } catch (error) {
      console.error("[nativeMultiSelect.collectScopeIds] failed", error);
      throw error;
    }
  }

  async function runClear(_ctx, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    var clearedScopes = [];
    var degraded = false;
    try {
      var scopeIds = collectScopeIds(payload, _ctx._KDB, _ctx.filtersFacet);
      var scopeIdx;
      for (scopeIdx = 0; scopeIdx < scopeIds.length; scopeIdx += 1) {
        var scopeId = scopeIds[scopeIdx];
        var items = _listUnownedNativeMultiSelectItems(_ctx._KDB, scopeId, _ctx.filtersFacet);
        var itemIdx;
        for (itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
          var outcome = await _hostApply.applyByItemId(_ctx._KDB, items[itemIdx].itemId, scopeId, [], diagnostics, _ctx.filtersFacet);
          if (outcome === "skipped") { degraded = true; }
          if (outcome === "failed") {
            return { ok: false, degraded: degraded, clearedScopes: clearedScopes, diagnostics: diagnostics };
          }
          if (_ctx.isStale(payload.runId)) {
            return { ok: false, diagnostics: [{ code: _codes.CANCELLED, message: "stale parameterSet runId was superseded during clear" }] };
          }
        }
        _ctx.dispatchInternal({
          type: _actions.TAB_MUTATION_SCOPE_WRITE,
          payload: { scopeId: scopeId, items: [], clear: true }
        });
        if (clearedScopes.indexOf(scopeId) === -1) { clearedScopes.push(scopeId); }
      }
      if (payload.status === "newDashboard") {
        return { ok: true, degraded: degraded || diagnostics.length > 0, clearedScopes: clearedScopes, diagnostics: diagnostics };
      }
      return {
        ok: diagnostics.filter(isHardFail).length === 0,
        degraded: degraded,
        clearedScopes: clearedScopes,
        diagnostics: diagnostics
      };
    } catch (error) {
      return {
        ok: payload.status === "newDashboard",
        degraded: true,
        clearedScopes: clearedScopes,
        diagnostics: [{ code: _codes.CLEAR_FAILED, message: String(error && error.message ? error.message : error) }]
      };
    }
  }

  function parameterSetClear(_ctx, _payload) {
    var guard = _ctx.guardRun(_payload);
    if (guard) { return Promise.resolve(guard); }
    return runClear(_ctx, _payload);
  }

  return parameterSetClear;
});

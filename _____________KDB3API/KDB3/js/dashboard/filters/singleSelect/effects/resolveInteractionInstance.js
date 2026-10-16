define([
  "../../../../core/utils/normalizeCognosScopeId.js",
  "../config/errorCodes.js"
], function (_normalizeCognosScopeId, _errorCodes) {
  "use strict";

  function isScopePresentInInventory(_scopeId, _instancesById) {
    var normalized = _normalizeCognosScopeId(_scopeId);
    var ids = Object.keys(_instancesById || {});
    for (var i = 0; i < ids.length; i += 1) {
      if (_normalizeCognosScopeId(_instancesById[ids[i]].scopeId) === normalized) {
        return true;
      }
    }
    return false;
  }

  function resolveScopeIdFromTab(_KDB, _handoff, _instancesById) {
    if (_handoff.scopeType === "global") { return { ok: true, scopeId: "global" }; }
    if (!_handoff.tabId) {
      return {
        ok: false,
        code: _errorCodes.SCOPE_TARGET_UNVERIFIED,
        message: "missing tabId hint for page-context filter"
      };
    }
    var tabsApi = _KDB && _KDB.api ? _KDB.api.tabs : null;
    if (!tabsApi || typeof tabsApi.dispatch !== "function") {
      return { ok: false, code: _errorCodes.SCOPE_TARGET_UNVERIFIED, message: "tabs API unavailable for scope verification" };
    }
    return tabsApi.dispatch({
      type: "tabs/resolveFilterScopeTargets",
      payload: { source: "singleSelectReconcile" }
    }).then(function (result) {
      var targets = result && result.tabTargets ? result.tabTargets : {};
      var keys = Object.keys(targets);
      for (var i = 0; i < keys.length; i += 1) {
        var target = targets[keys[i]];
        if (!target || target.tabId !== _handoff.tabId || !target.scopeId) { continue; }
        if (_handoff.scopeId &&
          _normalizeCognosScopeId(target.scopeId) !== _normalizeCognosScopeId(_handoff.scopeId)) {
          return {
            ok: false,
            code: _errorCodes.SCOPE_TARGET_UNVERIFIED,
            message: "provided scopeId does not match resolved tab target"
          };
        }
        if (!isScopePresentInInventory(target.scopeId, _instancesById)) {
          return { ok: false, code: _errorCodes.SCOPE_TARGET_UNVERIFIED, message: "resolved tab scope not present in live inventory" };
        }
        return { ok: true, scopeId: target.scopeId };
      }
      return { ok: false, code: _errorCodes.SCOPE_TARGET_UNVERIFIED, message: "tab target could not be verified against inventory" };
    });
  }

  async function resolveInteractionInstance(_KDB, _handoff, _instancesById) {
    try {
      if (_handoff.filterType === "specialSingleSelect" &&
        (_handoff.authorizedByOwner !== "specialSingleSelect" ||
          !_handoff.semanticSpecialFilterId)) {
        return {
          ok: false,
          code: _errorCodes.INSTANCE_NOT_FOUND,
          message: "special interaction is missing owner authorization or semantic id"
        };
      }
      var scopeResult = await resolveScopeIdFromTab(_KDB, _handoff, _instancesById);
      var candidates = [];
      if (!scopeResult.ok) { return { ok: false, code: scopeResult.code, message: scopeResult.message }; }
      Object.keys(_instancesById || {}).sort().forEach(function (_id) {
        var entry = _instancesById[_id];
        if (!entry || entry.status !== "active" || entry.hostStatus !== "present") { return; }
        if (_handoff.filterInstanceId && entry.filterInstanceId !== _handoff.filterInstanceId) { return; }
        if (entry.scopeType !== _handoff.scopeType) { return; }
        if (entry.filterType !== _handoff.filterType) { return; }
        if (_handoff.semanticSpecialFilterId &&
          String(entry.condition || "").trim().toLowerCase() !==
            String(_handoff.semanticSpecialFilterId).trim().toLowerCase()) { return; }
        if (_normalizeCognosScopeId(entry.scopeId) !== _normalizeCognosScopeId(scopeResult.scopeId)) { return; }
        if (_handoff.itemIdHint && entry.itemId && entry.itemId !== _handoff.itemIdHint) { return; }
        if (_handoff.semanticInstanceKeyHint && entry.semanticInstanceKey !== _handoff.semanticInstanceKeyHint) { return; }
        if (!_handoff.itemIdHint && !_handoff.semanticInstanceKeyHint &&
          entry.itemName !== (_handoff.itemNameHint || _handoff.filterLabel)) { return; }
        candidates.push(entry);
      });
      if (candidates.length === 1) {
        return { ok: true, filterInstanceId: candidates[0].filterInstanceId, scopeId: candidates[0].scopeId };
      }
      return {
        ok: false,
        code: candidates.length > 1 ? _errorCodes.INSTANCE_AMBIGUOUS : _errorCodes.INSTANCE_NOT_FOUND,
        message: candidates.length > 1
          ? "interaction mapped to multiple filter instances"
          : "no live filter instance matched interaction hints"
      };
    } catch (error) {
      console.error("[singleSelect.resolveInteractionInstance] failed", error);
      return { ok: false, code: _errorCodes.SCOPE_TARGET_UNVERIFIED, message: String(error && error.message ? error.message : error) };
    }
  }

  return { resolveInteractionInstance: resolveInteractionInstance };
});

define([
  "../config.js",
  "../state.js",
  "../../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js"
], function (_config, _state, _guardRunUtil) {
  "use strict";

  var codes = _config.tabMutationCodes;

  var NMS_GUARD_OPTS = {
    pinOperationId: false,
    ensureRunIdDefault0: true,
    includeRunIdsInDiagnostic: true,
    missingIdsMessage: "NativeMultiSelect tab mutation requires runId and operationId",
    supersededMessage: "NativeMultiSelect tab mutation run was superseded"
  };

  function cancelled(_message, _payload, _runtime) {
    return _guardRunUtil.cancelled(_message, _payload, _runtime, NMS_GUARD_OPTS);
  }

  function guardRun(_runtime, _payload) {
    return _guardRunUtil.guardRun(_runtime, _payload, NMS_GUARD_OPTS);
  }

  function isStale(_runtime, _payload) {
    return _guardRunUtil.isStale(_runtime, _payload, { staleMode: "ds" });
  }

  // Tabs facet stamped by register onto runtime.tabsFacet.
  function matchLayoutScopeId(_KDB, _tabId, _pageId) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.nativeMultiSelect : null;
    var tabsFacet = rt && rt.tabsFacet ? rt.tabsFacet : null;
    var items = [];
    var outcome;
    try {
      if (!tabsFacet || typeof tabsFacet.listTabs !== "function") {
        return null;
      }
      outcome = tabsFacet.listTabs();
      if (!outcome || outcome.ok !== true || !Array.isArray(outcome.data)) {
        return null;
      }
      items = outcome.data;
    } catch (_error) {
      return null;
    }
    var idx;
    for (idx = 0; idx < items.length; idx += 1) {
      var item = items[idx];
      var containerId = item && item.id != null ? String(item.id) : null;
      if (!containerId) { continue; }
      var pageId = item.pageId != null ? String(item.pageId) : null;
      if ((_tabId != null && containerId === String(_tabId)) ||
          (_pageId != null && (containerId === String(_pageId) || pageId === String(_pageId)))) {
        return containerId;
      }
    }
    return null;
  }

  function resolveScopeId(_KDB, _tabIdxToScopeId, _tabIdx) {
    var target = _tabIdxToScopeId && _tabIdxToScopeId[String(_tabIdx)];
    if (target && typeof target.scopeId === "string" && target.scopeId !== "") {
      return { ok: true, scopeId: target.scopeId, fromTarget: true };
    }
    var matched = target ? matchLayoutScopeId(_KDB, target.tabId, target.pageId) : null;
    if (matched) {
      return { ok: true, scopeId: matched, fromTarget: false };
    }
    return { ok: false, scopeId: null, fromTarget: false };
  }

  function prepareFailed(_message, _slot) {
    return { ok: false, diagnostics: [{ code: codes.PREPARE_FAILED, message: _message, tabId: _slot && _slot.tabId || null }] };
  }

  // { ok, scopeId } for a plan slot; { ok: true, skip: true } for a slot whose scope is global.
  function resolveScopeIdForSlot(_KDB, _tabTargets, _slot) {
    var tabIdx = _slot && _slot.tabIdx;
    if (typeof tabIdx !== "number") {
      return prepareFailed("slot tabIdx is missing for scope resolution", _slot);
    }
    var resolved = resolveScopeId(_KDB, _tabTargets || {}, tabIdx);
    if (!resolved || resolved.ok !== true || !resolved.scopeId) {
      return prepareFailed("scopeId could not be resolved for tabIdx " + tabIdx, _slot);
    }
    if (_state.stripTabpanel(resolved.scopeId) === "global") {
      return { ok: true, skip: true, scopeId: null };
    }
    return { ok: true, scopeId: String(resolved.scopeId) };
  }

  function pushUnique(_arr, _value) {
    if (_arr.indexOf(_value) === -1) { _arr.push(_value); }
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    cancelled: cancelled,
    resolveScopeIdForSlot: resolveScopeIdForSlot,
    pushUnique: pushUnique
  };
});

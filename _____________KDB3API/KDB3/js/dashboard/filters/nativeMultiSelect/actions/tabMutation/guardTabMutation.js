define([
  "../../../../../core/utils/filters/tabMutationRun/guardTabMutationRun.js",
  "../../../../../core/utils/filters/tabMutationRun/tabMutationSnapshots.js",
  "../../../../../core/utils/filters/tabMutationRun/listAffectedPlanSlots.js",
  "../../effects/stripTabpanel.js"
], function (_guardRunUtil, _snapshots, _listAffectedPlanSlots, _stripTabpanel) {
  "use strict";

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

  // Stamped by __orchestratorNativeMultiSelect onto runtime.tabsFacet.
  // Deep files must not look up _KDB.services.cognosHost themselves.
  function readTabsFacet(_KDB) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.nativeMultiSelect : null;
    return rt && rt.tabsFacet ? rt.tabsFacet : null;
  }

  function matchLayoutScopeId(_KDB, _tabId, _pageId) {
    var items = [];
    var tabsFacet;
    var outcome;
    try {
      tabsFacet = readTabsFacet(_KDB);
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

  function resolveScopeIdForSlot(_KDB, _tabTargets, _slot) {
    var tabIdx = _slot && _slot.tabIdx;
    if (typeof tabIdx !== "number") {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "slot tabIdx is missing for scope resolution", tabId: _slot && _slot.tabId || null }] };
    }
    var resolved = resolveScopeId(_KDB, _tabTargets || {}, tabIdx);
    if (!resolved || resolved.ok !== true || !resolved.scopeId) {
      return { ok: false, diagnostics: [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "scopeId could not be resolved for tabIdx " + tabIdx, tabId: _slot && _slot.tabId || null }] };
    }
    if (_stripTabpanel(resolved.scopeId) === "global") {
      return { ok: true, skip: true, scopeId: null };
    }
    return { ok: true, scopeId: String(resolved.scopeId) };
  }

  function writeSnapshot(_runtime, _operationId, _snapshot) {
    _snapshots.writeSnapshot(_runtime, _operationId, _snapshot);
  }

  function readSnapshot(_runtime, _operationId) {
    return _snapshots.readSnapshot(_runtime, _operationId);
  }

  function deleteSnapshot(_runtime, _operationId) {
    _snapshots.deleteSnapshot(_runtime, _operationId);
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

  function pushUnique(_arr, _value) {
    if (_arr.indexOf(_value) === -1) { _arr.push(_value); }
  }

  return {
    guardRun: guardRun,
    isStale: isStale,
    cancelled: cancelled,
    resolveScopeIdForSlot: resolveScopeIdForSlot,
    writeSnapshot: writeSnapshot,
    readSnapshot: readSnapshot,
    deleteSnapshot: deleteSnapshot,
    cloneItem: cloneItem,
    cloneValues: cloneValues,
    pushUnique: pushUnique,
    listAffectedSlots: _listAffectedPlanSlots
  };
});

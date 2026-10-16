define([
  "../../config/actions.js",
  "./guardTabMutation.js",
  "../../effects/lookupNativeMultiSelectRef.js"
], function (_actions, _support, _lookupNativeMultiSelectRef) {
  "use strict";

  async function restoreTabMutationSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _support.guardRun(_ctx.runtime, payload);
    if (guard) {
      return buildResult(false, payload.operationId, [], [], guard.diagnostics, guard.errorCode || "TABS_MUTATION_CANCELLED");
    }
    var snapshot = _support.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot) { return buildResult(true, payload.operationId, [], [], []); }
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeIds = Object.keys(snapshot.byScope || {});
    var sIdx;
    for (sIdx = 0; sIdx < scopeIds.length; sIdx += 1) {
      var scopeId = scopeIds[sIdx];
      var items = (snapshot.byScope[scopeId] || []).map(_support.cloneItem);
      dispatchScopeWrite(_ctx, scopeId, items, false);
      var i;
      for (i = 0; i < items.length; i += 1) {
        var hostOk = await restoreHostItem(_ctx._KDB, items[i].itemId, scopeId, items[i].values, _ctx.filtersFacet);
        if (!hostOk) {
          pushUnique(unrecoverable, scopeId);
          diagnostics.push({ code: "TABS_MUTATION_ROLLBACK_INCOMPLETE", itemId: items[i].itemId, scopeId: scopeId, message: "NativeMultiSelect host scope restore failed" });
        } else {
          pushUnique(restored, scopeId);
        }
      }
    }
    _support.deleteSnapshot(_ctx.runtime, payload.operationId);
    return buildResult(unrecoverable.length === 0, payload.operationId, restored, unrecoverable, diagnostics);
  }

  async function restoreHostItem(_KDB, _itemId, _scopeId, _values, _filtersFacet) {
    var filterRef = _lookupNativeMultiSelectRef(_KDB, _itemId, _scopeId, _filtersFacet);
    var outcome;
    if (!_filtersFacet || !filterRef) { return false; }
    outcome = await _filtersFacet.writeFilter({ ref: filterRef, values: Array.isArray(_values) ? _values : [] });
    return !!(outcome && outcome.ok === true);
  }

  function dispatchScopeWrite(_ctx, _scopeId, _items, _clear) {
    _ctx.dispatchInternal({
      type: _actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: _scopeId, items: _items, clear: _clear === true }
    });
  }

  function pushUnique(_arr, _value) { if (_arr.indexOf(_value) === -1) { _arr.push(_value); } }

  function buildResult(_ok, _operationId, _restored, _unrecoverable, _diagnostics, _errorCode) {
    var result = { ok: _ok, operationId: _operationId || null, restored: _restored || [], unrecoverable: _unrecoverable || [], diagnostics: _diagnostics || [] };
    if (_errorCode) { result.errorCode = _errorCode; }
    return result;
  }

  return restoreTabMutationSnapshot;
});

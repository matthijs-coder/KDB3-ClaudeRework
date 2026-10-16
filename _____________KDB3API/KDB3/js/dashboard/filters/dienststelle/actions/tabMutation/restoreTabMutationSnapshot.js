define([
  "../../config/actions.js",
  "./guardTabMutation.js",
  "../restoreSupport.js",
  "../../effects/lookupDienststelleFilterRef.js",
  "../../effects/clearDienststelleFilterScope.js",
  "../../effects/dienststelleScopeApplySupport.js"
], function (_actions, _support, _restoreSupport, _hostLookup, _clearScope, _scopeSupport) {
  "use strict";

  async function restoreTabMutationSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var guard = _support.guardRun(_ctx.runtime, payload);
    if (guard) {
      // Stale-guard rejection must have zero side effects (delta L29): the
      // snapshot stays available as the operation's only recovery path.
      return buildResult(false, payload.operationId, [], [], guard.diagnostics, guard.errorCode || "TABS_MUTATION_CANCELLED");
    }
    var snapshot = _support.readSnapshot(_ctx.runtime, payload.operationId);
    if (!snapshot) { return buildResult(true, payload.operationId, [], [], []); }
    var restored = [];
    var unrecoverable = [];
    var diagnostics = [];
    var scopeIds = Object.keys(snapshot.byScope || {});
    for (var sIdx = 0; sIdx < scopeIds.length; sIdx += 1) {
      var scopeId = scopeIds[sIdx];
      var byFilter = snapshot.byScope[scopeId] || {};
      var filterKeys = Object.keys(byFilter);
      for (var fIdx = 0; fIdx < filterKeys.length; fIdx += 1) {
        var filterKey = filterKeys[fIdx];
        dispatchScopeWrite(_ctx, filterKey, scopeId, byFilter[filterKey], false);
        var hostOk = await restoreHostScope(_ctx._KDB, filterKey, scopeId, byFilter[filterKey]);
        if (!hostOk) {
          pushUnique(unrecoverable, scopeId);
          diagnostics.push({ code: "TABS_MUTATION_ROLLBACK_INCOMPLETE", filterKey: filterKey, scopeId: scopeId, message: "dienststelle host scope restore failed" });
        } else {
          pushUnique(restored, scopeId);
        }
      }
    }
    _support.deleteSnapshot(_ctx.runtime, payload.operationId);
    return buildResult(unrecoverable.length === 0, payload.operationId, restored, unrecoverable, diagnostics);
  }

  async function restoreHostScope(_KDB, _filterKey, _scopeId, _snapshotEntry) {
    var currentValues = _snapshotEntry && _snapshotEntry.currentValues || [];
    var filtersFacet = _hostLookup.readFiltersFacet(_KDB);
    var filterRef;
    var outcome;
    if (currentValues.length === 0) {
      var cleared = await _clearScope(_KDB, _filterKey, _scopeId, filtersFacet);
      return !!(cleared && cleared.ok === true);
    }
    filterRef = _restoreSupport.lookupScopeFilterRef(_KDB, _filterKey, _scopeId);
    if (!filtersFacet || !filterRef) { return false; }
    outcome = await filtersFacet.writeFilter({ ref: filterRef, values: _scopeSupport.toCognosValues(currentValues) });
    return !!(outcome && outcome.ok === true);
  }

  function dispatchScopeWrite(_ctx, _filterKey, _scopeId, _entry, _clear) {
    _ctx.dispatchInternal({
      type: _actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { filterKey: _filterKey, scopeId: _scopeId, entry: _entry || null, clear: _clear === true, timestamp: Date.now() }
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

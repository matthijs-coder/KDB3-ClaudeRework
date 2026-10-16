define([
  "../../config/actions.js",
  "../restoreSupport.js",
  "../../effects/lookupDienststelleFilterRef.js",
  "../../effects/clearDienststelleFilterScope.js",
  "../../effects/dienststelleScopeApplySupport.js"
], function (_actions, _restoreSupport, _hostLookup, _clearScope, _scopeSupport) {
  "use strict";

  var FILTER_KEYS = ["Dienststelle_BW", "Dienststelle_DEZPV"];

  async function moveScopeForAllFilters(_ctx, _fromScopeId, _toScopeId, _payload, _appliedScopes, _clearedScopes, _diagnostics, _support) {
    for (var idx = 0; idx < FILTER_KEYS.length; idx += 1) {
      var sourceEntry = readScopeEntry(_ctx._KDB, FILTER_KEYS[idx], _fromScopeId);
      dispatchScopeWrite(_ctx, FILTER_KEYS[idx], _toScopeId, sourceEntry, false);
      await applyHostScope(_ctx._KDB, FILTER_KEYS[idx], _toScopeId, sourceEntry.currentValues, _diagnostics);
      dispatchScopeWrite(_ctx, FILTER_KEYS[idx], _fromScopeId, null, true);
      await clearHostScope(_ctx._KDB, FILTER_KEYS[idx], _fromScopeId, _diagnostics);
      pushUnique(_appliedScopes, _toScopeId);
      pushUnique(_clearedScopes, _fromScopeId);
      if (_support.isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function clearScopeForAllFilters(_ctx, _scopeId, _payload, _clearedScopes, _diagnostics, _support) {
    for (var idx = 0; idx < FILTER_KEYS.length; idx += 1) {
      dispatchScopeWrite(_ctx, FILTER_KEYS[idx], _scopeId, null, true);
      await clearHostScope(_ctx._KDB, FILTER_KEYS[idx], _scopeId, _diagnostics);
      pushUnique(_clearedScopes, _scopeId);
      if (_support.isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  async function writeScopeFromSnapshot(_ctx, _scopeId, _sourceByFilter, _payload, _appliedScopes, _diagnostics, _support) {
    for (var idx = 0; idx < FILTER_KEYS.length; idx += 1) {
      var entry = cloneScopeEntry(_sourceByFilter[FILTER_KEYS[idx]] || {});
      dispatchScopeWrite(_ctx, FILTER_KEYS[idx], _scopeId, entry, false);
      await applyHostScope(_ctx._KDB, FILTER_KEYS[idx], _scopeId, entry.currentValues, _diagnostics);
      pushUnique(_appliedScopes, _scopeId);
      if (_support.isStale(_ctx.runtime, _payload)) { return; }
    }
  }

  // An empty values array stays a replace-with-empty here, not a clearValues:
  // the host treats the two commands differently and this path has always used
  // replace.
  async function applyHostScope(_KDB, _filterKey, _scopeId, _values, _diagnostics) {
    var filtersFacet = _hostLookup.readFiltersFacet(_KDB);
    var filterRef = _restoreSupport.lookupScopeFilterRef(_KDB, _filterKey, _scopeId);
    var outcome;
    if (!filtersFacet || !filterRef) { _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", filterKey: _filterKey, scopeId: _scopeId, message: "dienststelle host apply API is unavailable" }); return; }
    outcome = await filtersFacet.writeFilter({ ref: filterRef, values: _scopeSupport.toCognosValues(_values || []) });
    if (!outcome || outcome.ok !== true) {
      _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", filterKey: _filterKey, scopeId: _scopeId, message: String((outcome && (outcome.errorCode || outcome.reason)) || "host write not applied") });
    }
  }

  async function clearHostScope(_KDB, _filterKey, _scopeId, _diagnostics) {
    var filtersFacet = _hostLookup.readFiltersFacet(_KDB);
    var cleared = await _clearScope(_KDB, _filterKey, _scopeId, filtersFacet);
    if (!cleared || cleared.ok !== true) { _diagnostics.push({ code: "TABS_MUTATION_APPLY_FAILED", filterKey: _filterKey, scopeId: _scopeId, message: "dienststelle host scope clear failed" }); }
  }

  function dispatchScopeWrite(_ctx, _filterKey, _scopeId, _entry, _clear) {
    _ctx.dispatchInternal({
      type: _actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { filterKey: _filterKey, scopeId: _scopeId, entry: _entry, clear: _clear === true, timestamp: Date.now() }
    });
  }

  function readScopeEntry(_KDB, _filterKey, _scopeId) {
    var state = _KDB.state.filters.dienststelle || {};
    var byFilter = state.byFilter || {};
    var filter = byFilter[_filterKey] || {};
    var page = filter.currentSelectionByScope && filter.currentSelectionByScope.pageContext || {};
    return cloneScopeEntry(page[_scopeId] || {});
  }

  function pushUnique(_arr, _value) { if (_arr.indexOf(_value) === -1) { _arr.push(_value); } }
  function cloneScopeEntry(_entry) { return { currentValues: cloneValues(_entry.currentValues), backupValues: cloneValues(_entry.backupValues), pendingValues: cloneValues(_entry.pendingValues), lastObservedHostValues: cloneValues(_entry.lastObservedHostValues), lastConfirmedAt: _entry.lastConfirmedAt != null ? _entry.lastConfirmedAt : null }; }
  function copiedHostDisplay(_entry) {
    if (!_entry || _entry.hostDisplay == null || String(_entry.hostDisplay) === "") {
      return "";
    }
    return String(_entry.hostDisplay);
  }

  function cloneValueEntry(_value) {
    if (!_value) {
      return { displayValue: "", useValue: "", source: "cognos", hostDisplay: "" };
    }
    return {
      displayValue: _value.displayValue != null ? String(_value.displayValue) : "",
      useValue: _value.useValue != null ? String(_value.useValue) : "",
      source: _value.source || "cognos",
      hostDisplay: copiedHostDisplay(_value)
    };
  }

  function cloneValues(_values) {
    var out = [];
    var idx;
    if (!Array.isArray(_values)) {
      return out;
    }
    for (idx = 0; idx < _values.length; idx += 1) {
      out.push(cloneValueEntry(_values[idx]));
    }
    return out;
  }
  function failed(_operationId, _appliedScopes, _clearedScopes, _diagnostics) { return { ok: false, operationId: _operationId || null, appliedScopes: _appliedScopes || [], clearedScopes: _clearedScopes || [], diagnostics: _diagnostics || [] }; }

  async function resyncHostScope(_KDB, _scopeId, _diagnostics) {
    for (var idx = 0; idx < FILTER_KEYS.length; idx += 1) {
      var entry = readScopeEntry(_KDB, FILTER_KEYS[idx], _scopeId);
      await applyHostScope(_KDB, FILTER_KEYS[idx], _scopeId, entry.currentValues, _diagnostics);
    }
  }

  return {
    moveScopeForAllFilters: moveScopeForAllFilters,
    clearScopeForAllFilters: clearScopeForAllFilters,
    writeScopeFromSnapshot: writeScopeFromSnapshot,
    resyncHostScope: resyncHostScope,
    failed: failed
  };
});

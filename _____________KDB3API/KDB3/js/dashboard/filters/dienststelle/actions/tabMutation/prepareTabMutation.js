define(["./guardTabMutation.js"], function (_support) {
  "use strict";

  var FILTER_KEYS = ["Dienststelle_BW", "Dienststelle_DEZPV"];

  async function prepareTabMutation(_ctx, _payload) {
    var payload = _payload || {};
    try {
      var guard = _support.guardRun(_ctx.runtime, payload);
      if (guard) { return withFailure(payload.operationId, guard.diagnostics); }
      if (!payload.plan) { return withFailure(payload.operationId, [{ code: "TABS_MUTATION_PREPARE_FAILED", message: "tab mutation plan is missing" }]); }
      var resolved = resolveAffectedScopes(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan);
      if (!resolved.ok) { return withFailure(payload.operationId, resolved.diagnostics); }
      var snapshot = buildSnapshot(_ctx._KDB, resolved.scopeIds, payload.runId, payload.operationId);
      _support.writeSnapshot(_ctx.runtime, payload.operationId, snapshot);
      return attachDeleteHistorySlice(_ctx._KDB, payload.tabIdxToScopeId || {}, payload.plan, snapshot, {
        ok: true, operationId: payload.operationId, snapshotScopes: resolved.scopeIds, diagnostics: []
      });
    } catch (error) {
      console.error("[dienststelle.prepareTabMutation] failed", error);
      return withFailure(payload.operationId, [{ code: "TABS_MUTATION_PREPARE_FAILED", message: String(error && error.message ? error.message : error) }]);
    }
  }

  function attachDeleteHistorySlice(_KDB, _tabTargets, _plan, _snapshot, _result) {
    var slot;
    var resolved;
    var slice;
    if (!_plan || (_plan.operation !== "delete" && _plan.operation !== "duplicate")) { return _result; }
    slot = _plan.operation === "delete"
      ? (_plan.deletedSlot || {})
      : (_plan.sourceSlot || (_plan.clonePair && _plan.clonePair.from) || {});
    resolved = _support.resolveScopeIdForSlot(_KDB, _tabTargets, slot);
    slice = {};
    if (resolved && resolved.ok === true && resolved.scopeId && _snapshot.byScope) {
      slice = _snapshot.byScope[resolved.scopeId] || {};
    }
    _result.historySlice = slice;
    return _result;
  }

  function resolveAffectedScopes(_KDB, _tabTargets, _plan) {
    var scopeIds = [];
    var diagnostics = [];
    _support.listAffectedSlots(_plan).forEach(function (slot) {
      var resolved = _support.resolveScopeIdForSlot(_KDB, _tabTargets, slot);
      if (!resolved.ok) { diagnostics = diagnostics.concat(resolved.diagnostics || []); return; }
      if (scopeIds.indexOf(resolved.scopeId) === -1) { scopeIds.push(resolved.scopeId); }
    });
    return diagnostics.length > 0 ? { ok: false, scopeIds: [], diagnostics: diagnostics } : { ok: true, scopeIds: scopeIds, diagnostics: [] };
  }

  function buildSnapshot(_KDB, _scopeIds, _runId, _operationId) {
    var byFilter = _KDB.state.filters.dienststelle.byFilter || {};
    var snapshot = { runId: _runId, operationId: _operationId, byScope: {} };
    _scopeIds.forEach(function (scopeId) {
      snapshot.byScope[scopeId] = {};
      FILTER_KEYS.forEach(function (key) {
        var filterState = byFilter[key] || {};
        var page = filterState.currentSelectionByScope && filterState.currentSelectionByScope.pageContext || {};
        snapshot.byScope[scopeId][key] = cloneScopeEntry(page[scopeId]);
      });
    });
    return snapshot;
  }

  function cloneScopeEntry(_entry) {
    var entry = _entry || {};
    return {
      currentValues: cloneValues(entry.currentValues),
      backupValues: cloneValues(entry.backupValues),
      pendingValues: cloneValues(entry.pendingValues),
      lastObservedHostValues: cloneValues(entry.lastObservedHostValues),
      lastConfirmedAt: entry.lastConfirmedAt != null ? entry.lastConfirmedAt : null
    };
  }

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

  function withFailure(_operationId, _diagnostics) {
    return { ok: false, operationId: _operationId || null, snapshotScopes: [], diagnostics: _diagnostics || [] };
  }

  return prepareTabMutation;
});

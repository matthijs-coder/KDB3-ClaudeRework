define([
  "./parameterSetRuntime.js",
  "./filterRestoreSupport.js",
  "../../effects/resolveFilterRef.js",
  "../../effects/resolveRestoreSelectionPair.js",
  "../../effects/hostFilterWrite.js",
  "../../config/parameterSetCodes.js",
  "./commitRestoreSelection.js"
], function (
  _runtime,
  _support,
  _resolveFilterRef,
  _resolveRestorePair,
  _hostWrite,
  _codes,
  _commitRestoreSelection
) {
  "use strict";

  async function runApplyRestoreSelection(_KDB, _runtimeState, _instance, _entry, _runId, _payload) {
    try {
      var payload = Object.assign({}, _payload || {}, { runId: _runId });
      var filtersFacet = _support.readFiltersFacet(_KDB, _runtimeState);
      var root = _KDB.state.filters.singleSelect;
      var canonicalInstance = root.instancesById && root.instancesById[_instance.filterInstanceId];
      var filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtimeState, {
        filterInstanceId: _instance.filterInstanceId
      });
      var useValue = _entry && _entry.vals && _entry.vals[0] != null ? String(_entry.vals[0]) : "";
      if (!_hostWrite.isWriteReady(filtersFacet) || !filterRef || !canonicalInstance) {
        throw new Error("restore host API unavailable for " + _instance.filterInstanceId);
      }
      var preGuard = _runtime.validateMutationGuard(_KDB, payload);
      if (!preGuard.ok) {
        return toCancelled(preGuard, false);
      }
      var priorValues = _hostWrite.readValues(filtersFacet, filterRef);
      var rollbackInput = Array.isArray(priorValues)
        ? priorValues.map(function (entry) { return Object.assign({}, entry || {}); })
        : [];
      var resolved = await _resolveRestorePair(_KDB, _instance, useValue);
      var preWriteGuard = _runtime.validateMutationGuard(_KDB, payload);
      if (!preWriteGuard.ok) {
        return toCancelled(preWriteGuard, false);
      }
      if (!(await _hostWrite.writeValues(filtersFacet, filterRef, useValue ? [resolved.selection] : []))) {
        throw new Error("restore host API unavailable for " + _instance.filterInstanceId);
      }
      var postGuard = _runtime.validateMutationGuard(_KDB, payload);
      if (!postGuard.ok) {
        var rollbackPost = await _hostWrite.rollbackHostWrite(filtersFacet, filterRef, rollbackInput);
        return toCancelled(postGuard, true, rollbackPost);
      }
      var observed = _hostWrite.readValues(filtersFacet, filterRef);
      if (!useValue) {
        if (Array.isArray(observed) && observed.length > 0) {
          var rollbackClear = await _hostWrite.rollbackHostWrite(filtersFacet, filterRef, rollbackInput);
          throw new Error("empty restore reread returned a non-empty host value; rollback " +
            (rollbackClear.ok ? "succeeded" : "failed"));
        }
        var preCommitEmpty = _runtime.validateMutationGuard(_KDB, payload);
        if (!preCommitEmpty.ok) {
          var rollbackEmpty = await _hostWrite.rollbackHostWrite(filtersFacet, filterRef, rollbackInput);
          return toCancelled(preCommitEmpty, true, rollbackEmpty);
        }
        return _commitRestoreSelection(canonicalInstance, root, {
          useValue: useValue, resolved: resolved, observed: observed,
          filterInstanceId: _instance.filterInstanceId
        });
      }
      if (!Array.isArray(observed) || !observed[0] || String(observed[0].u || "") !== useValue) {
        var rollbackMismatch = await _hostWrite.rollbackHostWrite(filtersFacet, filterRef, rollbackInput);
        throw new Error("restore reread did not confirm target use value; rollback " +
          (rollbackMismatch.ok ? "succeeded" : "failed"));
      }
      var preCommit = _runtime.validateMutationGuard(_KDB, payload);
      if (!preCommit.ok) {
        var rollbackFinal = await _hostWrite.rollbackHostWrite(filtersFacet, filterRef, rollbackInput);
        return toCancelled(preCommit, true, rollbackFinal);
      }
      return _commitRestoreSelection(canonicalInstance, root, {
        useValue: useValue, resolved: resolved, observed: observed,
        filterInstanceId: _instance.filterInstanceId
      });
    } catch (error) {
      console.error("[singleSelect.applyRestoreSelectionCore] failed", {
        filterInstanceId: _instance && _instance.filterInstanceId
      }, error);
      throw error;
    }
  }

  function toCancelled(_guard, _degraded, _rollback) {
    var diag = _guard && _guard.diagnostics && _guard.diagnostics[0]
      ? _guard.diagnostics[0]
      : { code: _codes.CANCELLED, message: "singleSelect restore superseded before canonical commit" };
    var suffix = _rollback ? "; rollback " + (_rollback.ok ? "succeeded" : "failed") : "";
    return {
      committed: false,
      cancelled: true,
      degraded: _degraded === true,
      diagnostic: { code: diag.code, message: String(diag.message || "") + suffix }
    };
  }

  return runApplyRestoreSelection;
});

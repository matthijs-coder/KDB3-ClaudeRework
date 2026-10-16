define([
  "../../config.js",
  "./parameterSetRuntime.js",
  "../../effects/resolveFilterRef.js",
  "../../effects/verifyCommitFilterValue.js",
  "../../effects/hostFilterWrite.js",
  "../../../../../core/utils/normalizeCognosScopeId.js"
], function (_config, _runtime, _resolveFilterRef, _verifyCommit, _hostWrite, _normalizeScopeId) {
  "use strict";

  function isInstanceOnAllowedTab(_rec, _payload) {
    var allowed;
    var map;
    var wanted;
    var keys;
    var idx;
    var target;
    var tabIdx;
    try {
      allowed = _payload && _payload.allowedClearTabIdxs;
      if (!Array.isArray(allowed)) { return true; }
      if (!_rec || _rec.scopeType === "global") { return true; }
      map = _payload && _payload.tabIdxToScopeId && typeof _payload.tabIdxToScopeId === "object"
        ? _payload.tabIdxToScopeId : {};
      wanted = _normalizeScopeId(_rec.scopeId);
      if (!wanted || wanted === "global") { return false; }
      keys = Object.keys(map);
      for (idx = 0; idx < keys.length; idx += 1) {
        target = map[keys[idx]];
        if (_normalizeScopeId(target && target.scopeId) !== wanted) { continue; }
        tabIdx = parseInt(keys[idx], 10);
        if (!isFinite(tabIdx) || String(tabIdx) !== keys[idx]) { continue; }
        return allowed.indexOf(tabIdx) !== -1;
      }
      return false;
    } catch (error) {
      console.error("[singleSelect.isInstanceOnAllowedTab] failed", error);
      throw error;
    }
  }

  async function clearInstances(_KDB, _runtimeState, _payload, _filtersFacet, _diagnostics) {
    try {
      var payload = _payload || {};
      var root = _KDB.state.filters.singleSelect;
      var ids = Object.keys(root.instancesById || {});
      for (var idx = 0; idx < ids.length; idx += 1) {
        await clearOneInstance(_KDB, _runtimeState, payload, _filtersFacet, _diagnostics, root.instancesById[ids[idx]]);
      }
      return { ok: true };
    } catch (error) {
      if (error && error.cancelledResult) {
        return { ok: false, cancelledResult: error.cancelledResult };
      }
      return {
        ok: false,
        error: error
      };
    }
  }

  async function clearOneInstance(_KDB, _runtimeState, _payload, _filtersFacet, _diagnostics, _rec) {
    try {
      if (!_rec || _rec.selectionOwner !== "singleSelect" || _rec.status !== "active") {
        return;
      }
      if (!isInstanceOnAllowedTab(_rec, _payload)) {
        return;
      }
      var filterRef = _resolveFilterRef.resolveFilterRef(_KDB, _runtimeState, {
        filterInstanceId: _rec.filterInstanceId
      });
      if (!filterRef) {
        _diagnostics.push({
          code: _config.parameterSetCodes.RESTORE_FAILED,
          key: _rec.filterLabel,
          message: "filter API not found during clear"
        });
        return;
      }
      var preGuard = _runtime.validateMutationGuard(_KDB, _payload);
      if (!preGuard.ok) {
        throw { cancelledResult: preGuard };
      }
      var priorValues = _hostWrite.readValues(_filtersFacet, filterRef);
      var rollbackInput = Array.isArray(priorValues)
        ? priorValues.map(function (entry) { return Object.assign({}, entry || {}); })
        : [];
      if (!(await _hostWrite.writeValues(_filtersFacet, filterRef, []))) {
        throw new Error("replaceFilterContext unavailable");
      }
      if (!_verifyCommit(_filtersFacet, filterRef, { displayValue: "Alle", useValue: "" }).ok) {
        var rollbackMismatch = await _hostWrite.rollbackHostWrite(_filtersFacet, filterRef, rollbackInput);
        _diagnostics.push({
          code: _config.parameterSetCodes.RESTORE_FAILED,
          key: _rec.filterLabel,
          message: "host clear verification mismatch; rollback " +
            (rollbackMismatch.ok ? "succeeded" : "failed")
        });
        return;
      }
      var postGuard = _runtime.validateMutationGuard(_KDB, _payload);
      if (!postGuard.ok) {
        var rollbackOutcome = await _hostWrite.rollbackHostWrite(_filtersFacet, filterRef, rollbackInput);
        var diag = postGuard.diagnostics && postGuard.diagnostics[0]
          ? postGuard.diagnostics[0]
          : { code: _config.parameterSetCodes.CANCELLED, message: "singleSelect clear superseded after host write" };
        throw {
          cancelledResult: {
            ok: false,
            degraded: true,
            applied: [],
            skipped: [],
            diagnostics: [{
              code: diag.code || _config.parameterSetCodes.CANCELLED,
              message: diag.message + "; rollback " + (rollbackOutcome.ok ? "succeeded" : "failed")
            }]
          }
        };
      }
      _rec.currentSelection = { displayValue: "Alle", useValue: "", displaySource: "policy" };
      _rec.backupSelection = { displayValue: "Alle", useValue: "", displaySource: "policy" };
      _rec.pendingSelection = { displayValue: "Alle" };
    } catch (error) {
      if (error && error.cancelledResult) { throw error; }
      console.error("[singleSelect.clearOneInstance] failed", error);
      throw error;
    }
  }

  return clearInstances;
});

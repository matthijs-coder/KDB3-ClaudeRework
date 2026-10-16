define([
  "../config.js",
  "../runtime.js",
  "../hostFilterIo.js",
  "../inventory/reconcile.js",
  "./runs.js",
  "./generationGuards.js",
  "../../../../core/utils/normalizeCognosScopeId.js",
  "../../../../core/utils/kit/errors.js"
], function (_config, _singleSelectRuntime, _hostFilterIo, _reconcileInventory, _runs, _guards, _normalizeScopeId, _errors) {
  "use strict";

  function clearInteractionState(_KDB) {
    var root = _KDB.state && _KDB.state.filters ? _KDB.state.filters.singleSelect : null;
    if (!root) {
      return;
    }
    root.lastInteraction = null;
    root.lastConfirmedAt = null;
  }

  function settle(_status, _diagnostics, _reconcileResult) {
    var diagnostics = (_diagnostics || []).concat(
      _reconcileResult && Array.isArray(_reconcileResult.diagnostics) ? _reconcileResult.diagnostics : []
    );
    var reconcileFailed = _reconcileResult && _reconcileResult.ok === false;
    var degraded = !!(_reconcileResult && _reconcileResult.degraded === true);
    if (_status === "newDashboard") {
      return {
        ok: !reconcileFailed,
        degraded: degraded || diagnostics.length > 0,
        applied: [],
        skipped: [],
        diagnostics: diagnostics
      };
    }
    return {
      ok: !reconcileFailed && diagnostics.length === 0,
      degraded: degraded,
      applied: [],
      skipped: [],
      diagnostics: diagnostics
    };
  }

  function isInstanceOnAllowedTab(_rec, _payload) {
    var allowed;
    var map;
    var wanted;
    var keys;
    var idx;
    var target;
    var tabIdx;
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
  }

  async function clearInstances(_KDB, _runtime, _payload, _filtersFacet, _diagnostics) {
    try {
      var payload = _payload || {};
      var root = _KDB.state.filters.singleSelect;
      var ids = Object.keys(root.instancesById || {});
      for (var idx = 0; idx < ids.length; idx += 1) {
        await clearOneInstance(_KDB, _runtime, payload, _filtersFacet, _diagnostics, root.instancesById[ids[idx]]);
      }
      return { ok: true };
    } catch (error) {
      if (error && error.cancelledResult) {
        return { ok: false, cancelledResult: error.cancelledResult };
      }
      console.error("[singleSelect.clearInstances] failed", error);
      return {
        ok: false,
        error: error
      };
    }
  }

  async function clearOneInstance(_KDB, _runtime, _payload, _filtersFacet, _diagnostics, _rec) {
    if (!_rec || _rec.selectionOwner !== "singleSelect" || _rec.status !== "active") {
      return;
    }
    if (!isInstanceOnAllowedTab(_rec, _payload)) {
      return;
    }
    var filterRef = _hostFilterIo.resolveFilterRef(_KDB, _runtime, {
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
    var preGuard = _guards.validateMutationGuard(_KDB, _payload);
    if (!preGuard.ok) {
      throw _errors.codedError(_config.parameterSetCodes.CANCELLED, "parameterSet run superseded", {
        cancelledResult: preGuard
      });
    }
    var priorValues = _hostFilterIo.readValues(_filtersFacet, filterRef);
    var rollbackInput = Array.isArray(priorValues)
      ? priorValues.map(function (entry) { return Object.assign({}, entry || {}); })
      : [];
    if (!(await _hostFilterIo.writeValues(_filtersFacet, filterRef, []))) {
      throw new Error("replaceFilterContext unavailable");
    }
    if (!_hostFilterIo.verifySelection(_filtersFacet, filterRef, { displayValue: _config.ALLE, useValue: "" }).ok) {
      var rollbackMismatch = await _hostFilterIo.rollbackExact(_filtersFacet, filterRef, rollbackInput);
      _diagnostics.push({
        code: _config.parameterSetCodes.RESTORE_FAILED,
        key: _rec.filterLabel,
        message: "host clear verification mismatch; rollback " +
          (rollbackMismatch.ok ? "succeeded" : "failed")
      });
      return;
    }
    var postGuard = _guards.validateMutationGuard(_KDB, _payload);
    if (!postGuard.ok) {
      var rollbackOutcome = await _hostFilterIo.rollbackExact(_filtersFacet, filterRef, rollbackInput);
      var diag = postGuard.diagnostics && postGuard.diagnostics[0]
        ? postGuard.diagnostics[0]
        : { code: _config.parameterSetCodes.CANCELLED, message: "singleSelect clear superseded after host write" };
      throw _errors.codedError(_config.parameterSetCodes.CANCELLED, "parameterSet run superseded", {
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
      });
    }
    _rec.currentSelection = { displayValue: _config.ALLE, useValue: "", displaySource: "policy" };
    _rec.backupSelection = { displayValue: _config.ALLE, useValue: "", displaySource: "policy" };
    _rec.pendingSelection = { displayValue: _config.ALLE };
  }

  async function handleParameterSetClear(_KDB, _runtime, _payload) {
    try {
      var payload = _payload || {};
      var diagnostics = [];
      var result = { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] };
      var filtersFacet = _singleSelectRuntime.readFiltersFacet(_KDB, _runtime);
      var guardResult = _runs.guardRun(_KDB, payload);
      if (guardResult) {
        result = guardResult;
      } else {
        var writebackGate = _guards.ensureWritebackPinnedGeneration(_KDB, payload);
        if (!writebackGate.ok) {
          result = {
            ok: false,
            degraded: false,
            applied: [],
            skipped: [],
            diagnostics: [{ code: writebackGate.code || _config.parameterSetCodes.INVENTORY_STALE, message: writebackGate.message }]
          };
        } else if (!filtersFacet || typeof filtersFacet.writeFilter !== "function") {
          diagnostics.push({ code: _config.parameterSetCodes.RESTORE_FAILED, message: "replaceFilterContext unavailable; singleSelect clear skipped" });
          result = settle(payload.status, diagnostics, null);
        } else {
          var clearOutcome = await clearInstances(_KDB, _runtime, payload, filtersFacet, diagnostics);
          if (clearOutcome && clearOutcome.cancelledResult) {
            result = clearOutcome.cancelledResult;
          } else if (clearOutcome && clearOutcome.ok === false) {
            diagnostics.push({
              code: _config.parameterSetCodes.RESTORE_FAILED,
              message: "singleSelect clear failed: " + String(
                clearOutcome.error && clearOutcome.error.message ? clearOutcome.error.message : clearOutcome.error
              )
            });
            result = settle(payload.status, diagnostics, null);
          } else {
            var finalGuard = _guards.validateMutationGuard(_KDB, payload);
            if (!finalGuard.ok) {
              result = finalGuard;
            } else {
              clearInteractionState(_KDB);
              if (writebackGate.shouldBypassReconcile === true) {
                result = settle(payload.status, diagnostics, null);
              } else {
                var reconcileResult = await _reconcileInventory.reconcileFilterInstances(
                  _KDB,
                  _runtime,
                  { reason: "parameterRestore", runId: payload.runId }
                );
                result = settle(payload.status, diagnostics, reconcileResult);
              }
            }
          }
        }
      }
      if (result && result.ok === false) {
        result = _runs.mergeTerminalCleanup(_KDB, payload, result, { reportAlreadyReleased: false });
      }
      return Promise.resolve(result);
    } catch (error) {
      console.error("[singleSelect.handleParameterSetClear] failed", error);
      return Promise.resolve(_runs.mergeTerminalCleanup(_KDB, _payload || {}, {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _config.parameterSetCodes.RESTORE_FAILED,
          message: "singleSelect clear failed: " + String(error && error.message ? error.message : error)
        }]
      }, { reportAlreadyReleased: false }));
    }
  }

  return { handleParameterSetClear: handleParameterSetClear };
});

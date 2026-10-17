define([
  "../config.js",
  "../state/selectors.js",
  "../inventory/reconcile.js",
  "./runs.js",
  "./generationGuards.js",
  "./applySelection.js",
  "../../../../core/utils/normalizeCognosScopeId.js",
  "../../../tabs/selectors.js"
], function (
  _config,
  _selectors,
  _reconcileInventory,
  _runs,
  _guards,
  _applySelection,
  _normalizeCognosScopeId,
  _tabsSelectors
) {
  "use strict";

  function skip(_result, _tab, _key, _code, _message, _hard, _inst) {
    var skipped = { key: _key, code: _code };
    if (_inst) { skipped.inst = _inst; }
    if (_tab !== undefined) { skipped.tab = _tab; }
    _result.skipped.push(skipped);
    _result.diagnostics.push({
      code: _code,
      key: _key || undefined,
      tab: _tab,
      message: _message
    });
    if (_hard === true) { _result.ok = false; } else { _result.degraded = true; }
    return false;
  }

  function hardSkipResult(_result, _code, _message) {
    _result.ok = false;
    _result.diagnostics.push({ code: _code, message: _message });
    return _result;
  }

  function cancelledMidRun(_result, _runId, _code) {
    _result.ok = false;
    _result.diagnostics.push({
      code: _code,
      message: "parameterSet runId " + _runId +
        " was superseded during restore; remaining entries not applied"
    });
    return _result;
  }

  function isKnownUnsupportedKey(_key) {
    var key = String(_key == null ? "" : _key).trim().toLowerCase();
    return key === "sicht" || key === "dienststelle" || key === "dienststelle_bw" || key === "dienststelle_dezpv";
  }

  function resolveScopeIdForTab(_KDB, _tabTargets, _tab) {
    var targets = _tabTargets || {};
    var target = targets[String(_tab)] || null;
    if (!target || !target.scopeId) {
      return { ok: false, code: _config.parameterSetCodes.TARGET_MISSING, message: "missing tab target for tab " + String(_tab) };
    }
    var scopeId = String(target.scopeId).trim();
    if (scopeId === "") {
      return { ok: false, code: _config.parameterSetCodes.TARGET_MISSING, message: "missing scopeId for tab " + String(_tab) };
    }
    var match = _tabsSelectors.readTabScopeMatch(_KDB, scopeId, targets);
    if (!match || match.status !== "ok" || match.evidence !== "liveScope") {
      return {
        ok: false,
        code: _config.parameterSetCodes.TARGET_MISSING,
        message: "page-context tab target lacks verified liveScope evidence for scopeId"
      };
    }
    var matchedTabIdx = match.tab && match.tab.tabIdx != null ? Number(match.tab.tabIdx) : NaN;
    if (!isFinite(matchedTabIdx) || matchedTabIdx !== Number(_tab)) {
      return {
        ok: false,
        code: _config.parameterSetCodes.TARGET_MISSING,
        message: "liveScope tabIdx mismatch for tab " + String(_tab)
      };
    }
    return { ok: true, scopeId: scopeId, derived: false };
  }

  function findSingleSelectInstance(_KDB, _entry, _scopeType, _scopeId) {
    var candidates = _selectors.readFilterInstances(_KDB, {
      status: "active",
      hostStatus: "present",
      scopeType: _scopeType
    });
    var wantedScope = _normalizeCognosScopeId(_scopeId || "global");
    var wantedKey = _entry && _entry.key != null ? String(_entry.key).trim() : "";
    var wantedInst = _entry && _entry.inst != null ? String(_entry.inst).trim() : "";
    var matches = candidates.filter(function (_record) {
      var filterLabel = _record && _record.filterLabel != null ? String(_record.filterLabel).trim() : "";
      var itemName = _record && _record.itemName != null ? String(_record.itemName).trim() : "";
      if (_record.selectionOwner !== "singleSelect") { return false; }
      if (_normalizeCognosScopeId(_record.scopeId) !== wantedScope) { return false; }
      if (filterLabel !== wantedKey && itemName !== wantedKey) { return false; }
      if (wantedInst) {
        var recordInst = _record && _record.semanticInstanceKey != null ? String(_record.semanticInstanceKey).trim() : "";
        if (recordInst !== wantedInst) { return false; }
      }
      return true;
    });
    if (matches.length === 1) { return { status: "ok", instance: matches[0] }; }
    return { status: matches.length > 1 ? "ambiguous" : "missing", instance: null };
  }

  async function restoreGlobal(_KDB, _runtime, _payload, _entry, _result, _inst) {
    var key = _entry && _entry.key != null ? String(_entry.key) : "";
    var resolved = findSingleSelectInstance(_KDB, _entry, "global", "global");
    if (resolved.status !== "ok") {
      return skip(_result, undefined, key,
        resolved.status === "ambiguous" ? _config.parameterSetCodes.INSTANCE_AMBIGUOUS : _config.parameterSetCodes.INSTANCE_MISSING,
        "global restore instance " + resolved.status, true, _inst);
    }
    var match = resolved.instance;
    var applied = await _applySelection.applyRestoreSelection(_KDB, _runtime, match, _entry, _payload.runId, _payload);
    if (applied.committed !== true) {
      if (applied.cancelled === true && applied.diagnostic) {
        _result.ok = false;
        _result.diagnostics.push(applied.diagnostic);
      }
      return true;
    }
    _runs.registerAppliedPageContext(_KDB, _payload.runId, match.filterInstanceId, {
      key: _entry.key, inst: _inst || undefined, tab: undefined, scopeId: "global",
      useValue: _entry.vals && _entry.vals[0] != null ? String(_entry.vals[0]) : ""
    });
    _result.applied.push({ key: _entry.key, inst: _inst || undefined, filterInstanceId: match.filterInstanceId, degraded: applied.degraded === true });
    if (applied.degraded) {
      _result.degraded = true;
      if (applied.diagnostic) { _result.diagnostics.push(applied.diagnostic); }
    }
    return false;
  }

  async function restorePageContext(_KDB, _runtime, _payload, _entry, _result, _inst) {
    var key = _entry && _entry.key != null ? String(_entry.key) : "";
    var tab = _entry ? _entry.tab : undefined;
    var scopeResolved = resolveScopeIdForTab(_KDB, _payload.tabIdxToScopeId, _entry.tab);
    if (!scopeResolved.ok) {
      return skip(_result, _entry.tab, _entry.key, _config.parameterSetCodes.TARGET_MISSING, scopeResolved.message, true);
    }
    var resolved = findSingleSelectInstance(_KDB, _entry, "pageContext", scopeResolved.scopeId);
    if (resolved.status !== "ok") {
      return skip(_result, tab, key,
        resolved.status === "ambiguous" ? _config.parameterSetCodes.INSTANCE_AMBIGUOUS : _config.parameterSetCodes.INSTANCE_MISSING,
        "page-context restore instance " + resolved.status, true, _inst);
    }
    var match = resolved.instance;
    var applied = await _applySelection.applyRestoreSelection(_KDB, _runtime, match, _entry, _payload.runId, _payload);
    if (applied.committed !== true) {
      if (applied.cancelled === true && applied.diagnostic) {
        _result.ok = false;
        _result.diagnostics.push(applied.diagnostic);
      }
      return true;
    }
    _runs.registerAppliedPageContext(_KDB, _payload.runId, match.filterInstanceId, {
      key: _entry.key, inst: _inst || undefined, tab: _entry.tab, scopeId: scopeResolved.scopeId,
      useValue: _entry.vals && _entry.vals[0] != null ? String(_entry.vals[0]) : ""
    });
    _result.applied.push({ key: _entry.key, inst: _inst || undefined, tab: _entry.tab, filterInstanceId: match.filterInstanceId, degraded: applied.degraded === true });
    if (applied.degraded) {
      _result.degraded = true;
      if (applied.diagnostic) { _result.diagnostics.push(applied.diagnostic); }
    }
    return false;
  }

  async function applyEntry(_KDB, _runtime, _payload, _entry, _phase, _result) {
    try {
      var key = _entry && _entry.key != null ? String(_entry.key).trim() : "";
      var inst = _entry && _entry.inst != null ? String(_entry.inst).trim() : "";
      var tab = _entry ? _entry.tab : undefined;
      if (!key) {
        return skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "restore entry is missing key", true);
      }
      if (_phase === "global" && tab !== undefined) {
        return skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "page-context entry supplied in global phase", true);
      }
      if (_phase === "pageContext" && tab === undefined) {
        return skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "global entry supplied in pageContext phase", true);
      }
      if (isKnownUnsupportedKey(key)) {
        return skip(_result, tab, key, _config.parameterSetCodes.FILTER_KIND_UNSUPPORTED, "filter key is owned by a different filter owner", false);
      }
      return _phase === "global"
        ? await restoreGlobal(_KDB, _runtime, _payload, _entry, _result, inst)
        : await restorePageContext(_KDB, _runtime, _payload, _entry, _result, inst);
    } catch (error) {
      console.error("[singleSelect.restoreEntryHandlers] applyEntry failed", {
        key: _entry && _entry.key, tab: _entry && _entry.tab
      }, error);
      return skip(
        _result,
        _entry ? _entry.tab : undefined,
        _entry && _entry.key != null ? String(_entry.key) : "",
        _config.parameterSetCodes.RESTORE_FAILED,
        "restore entry apply failed: " + String(error && error.message ? error.message : error),
        true
      );
    }
  }

  function mergeReconcileOutcome(_result, _reconcileResult) {
    var reconcileDiagnostics = _reconcileResult && Array.isArray(_reconcileResult.diagnostics)
      ? _reconcileResult.diagnostics : [];
    if (_reconcileResult && _reconcileResult.ok === false) {
      _result.ok = false;
    }
    if (_reconcileResult && _reconcileResult.degraded === true) {
      _result.degraded = true;
    }
    _result.diagnostics = (_result.diagnostics || []).concat(reconcileDiagnostics);
    return _result;
  }

  async function runParameterSetRestore(_KDB, _runtime, _payload) {
    try {
      var payload = _payload || {};
      var guardResult = _runs.guardRun(_KDB, payload);
      var phase = payload.phase;
      var result = { ok: true, degraded: false, applied: [], skipped: [], diagnostics: [] };
      var filters = Array.isArray(payload.filters) ? payload.filters : [];
      var generation = _KDB.state.filters.singleSelect.inventory ? _KDB.state.filters.singleSelect.inventory.generation : 0;
      var writebackGate;
      if (guardResult) {
        return guardResult;
      }
      writebackGate = _guards.ensureWritebackPinnedGeneration(_KDB, payload);
      if (!writebackGate.ok) {
        return hardSkipResult(
          result,
          writebackGate.code || _config.parameterSetCodes.INVENTORY_STALE,
          writebackGate.message
        );
      }
      if (!_runs.validateInventoryGeneration(
        _KDB, payload.runId, payload.inventoryGeneration, generation
      )) {
        return hardSkipResult(
          result,
          payload.source === "writebackSet" ? _config.parameterSetCodes.INVENTORY_STALE : _config.parameterSetCodes.CANCELLED,
          "stale inventoryGeneration for restore run"
        );
      }
      if (phase !== "global" && phase !== "pageContext") {
        return hardSkipResult(result, _config.parameterSetCodes.INVALID_PHASE, "invalid phase \"" + String(phase) + "\"");
      }
      if (!_runs.readAppliedPageContext(_KDB, payload.runId)) {
        _runs.resetAppliedPageContext(_KDB, payload.runId);
      }
      for (var idx = 0; idx < filters.length; idx += 1) {
        try {
          var stale = await applyEntry(_KDB, _runtime, payload, filters[idx], phase, result);
          if (stale === true) {
            return cancelledMidRun(result, payload.runId, _config.parameterSetCodes.CANCELLED);
          }
        } catch (error) {
          skip(result, filters[idx] ? filters[idx].tab : undefined,
            filters[idx] && filters[idx].key != null ? String(filters[idx].key) : "",
            _config.parameterSetCodes.RESTORE_FAILED, "restore apply failed: " + String(error && error.message ? error.message : error), true);
        }
      }
      if (writebackGate.shouldBypassReconcile === true) {
        return result;
      }
      var reconcileResult = await _reconcileInventory.reconcileFilterInstances(
        _KDB,
        _runtime,
        { reason: "parameterRestore", runId: payload.runId }
      );
      return mergeReconcileOutcome(result, reconcileResult);
    } catch (error) {
      console.error("[singleSelect.runParameterSetRestore] failed", error);
      return {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _config.parameterSetCodes.RESTORE_FAILED,
          message: "singleSelect runParameterSetRestore failed: " +
            String(error && error.message ? error.message : error)
        }]
      };
    }
  }

  async function handleParameterSetRestore(_KDB, _runtime, _payload) {
    try {
      var result = await runParameterSetRestore(_KDB, _runtime, _payload);
      if (result && result.ok === false) {
        return _runs.mergeTerminalCleanup(_KDB, _payload || {}, result, {
          reportAlreadyReleased: false
        });
      }
      return result;
    } catch (error) {
      console.error("[singleSelect.handleParameterSetRestore] failed", {
        runId: _payload && _payload.runId
      }, error);
      return _runs.mergeTerminalCleanup(_KDB, _payload || {}, {
        ok: false,
        degraded: false,
        applied: [],
        skipped: [],
        diagnostics: [{
          code: _config.parameterSetCodes.RESTORE_FAILED,
          message: String(error && error.message ? error.message : error)
        }]
      }, { reportAlreadyReleased: false });
    }
  }

  return { handleParameterSetRestore: handleParameterSetRestore };
});

define([
  "../../config.js",
  "./parameterSetRuntime.js",
  "./filterRestoreSupport.js",
  "./applyRestoreSelection.js",
  "./recordRestoreOutcome.js"
], function (_config, _runtime, _support, _applyRestoreSelection, _results) {
  "use strict";

  async function applyEntry(_KDB, _runtimeState, _payload, _entry, _phase, _result) {
    try {
      var key = _entry && _entry.key != null ? String(_entry.key).trim() : "";
      var inst = _entry && _entry.inst != null ? String(_entry.inst).trim() : "";
      var tab = _entry ? _entry.tab : undefined;
      if (!key) {
        return _results.skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "restore entry is missing key", true);
      }
      if (_phase === "global" && tab !== undefined) {
        return _results.skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "page-context entry supplied in global phase", true);
      }
      if (_phase === "pageContext" && tab === undefined) {
        return _results.skip(_result, tab, key, _config.parameterSetCodes.INVALID_ENTRY, "global entry supplied in pageContext phase", true);
      }
      if (_support.isKnownUnsupportedKey(key)) {
        return _results.skip(_result, tab, key, _config.parameterSetCodes.FILTER_KIND_UNSUPPORTED, "filter key is owned by a different filter owner", false);
      }
      return _phase === "global"
        ? await restoreGlobal(_KDB, _runtimeState, _payload, _entry, _result, inst)
        : await restorePageContext(_KDB, _runtimeState, _payload, _entry, _result, inst);
    } catch (error) {
      console.error("[singleSelect.restoreEntryHandlers] applyEntry failed", {
        key: _entry && _entry.key, tab: _entry && _entry.tab
      }, error);
      return _results.skip(
        _result,
        _entry ? _entry.tab : undefined,
        _entry && _entry.key != null ? String(_entry.key) : "",
        _config.parameterSetCodes.RESTORE_FAILED,
        "restore entry apply failed: " + String(error && error.message ? error.message : error),
        true
      );
    }
  }

  async function restoreGlobal(_KDB, _runtimeState, _payload, _entry, _result, _inst) {
    var key = _entry && _entry.key != null ? String(_entry.key) : "";
    var resolved = _support.findSingleSelectInstance(_KDB, _entry, "global", "global");
    if (resolved.status !== "ok") {
      return _results.skip(_result, undefined, key,
        resolved.status === "ambiguous" ? _config.parameterSetCodes.INSTANCE_AMBIGUOUS : _config.parameterSetCodes.INSTANCE_MISSING,
        "global restore instance " + resolved.status, true, _inst);
    }
    var match = resolved.instance;
    var applied = await _applyRestoreSelection(_KDB, _runtimeState, match, _entry, _payload.runId, _payload);
    if (applied.committed !== true) {
      if (applied.cancelled === true && applied.diagnostic) {
        _result.ok = false;
        _result.diagnostics.push(applied.diagnostic);
      }
      return true;
    }
    _runtime.registerAppliedPageContext(_KDB, _payload.runId, match.filterInstanceId, {
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

  async function restorePageContext(_KDB, _runtimeState, _payload, _entry, _result, _inst) {
    var key = _entry && _entry.key != null ? String(_entry.key) : "";
    var tab = _entry ? _entry.tab : undefined;
    var scopeResolved = _support.resolveScopeIdForTab(_KDB, _payload.tabIdxToScopeId, _entry.tab, _entry.key);
    if (!scopeResolved.ok) {
      return _results.skip(_result, _entry.tab, _entry.key, _config.parameterSetCodes.TARGET_MISSING, scopeResolved.message, true);
    }
    var resolved = _support.findSingleSelectInstance(_KDB, _entry, "pageContext", scopeResolved.scopeId);
    if (resolved.status !== "ok") {
      return _results.skip(_result, tab, key,
        resolved.status === "ambiguous" ? _config.parameterSetCodes.INSTANCE_AMBIGUOUS : _config.parameterSetCodes.INSTANCE_MISSING,
        "page-context restore instance " + resolved.status, true, _inst);
    }
    var match = resolved.instance;
    var applied = await _applyRestoreSelection(_KDB, _runtimeState, match, _entry, _payload.runId, _payload);
    if (applied.committed !== true) {
      if (applied.cancelled === true && applied.diagnostic) {
        _result.ok = false;
        _result.diagnostics.push(applied.diagnostic);
      }
      return true;
    }
    _runtime.registerAppliedPageContext(_KDB, _payload.runId, match.filterInstanceId, {
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

  return { applyEntry: applyEntry };
});

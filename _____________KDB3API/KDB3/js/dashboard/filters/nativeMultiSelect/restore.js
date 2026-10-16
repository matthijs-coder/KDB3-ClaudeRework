define([
  "./config.js",
  "./state.js",
  "./inventory.js",
  "./hostFilterIo.js",
  "../../../core/utils/kit/data.js"
], function (_config, _state, _inventory, _hostFilterIo, _data) {
  "use strict";

  var actions = _config.actions;
  var codes = _config.parameterSetCodes;

  // ---------- run guard ----------

  // Rejects runs without a numeric runId and runs older than the newest one seen; stamps the accepted runId.
  function guardRun(_ctx, _payload) {
    var payload = _payload || {};
    var runId = payload.runId;
    var runtime = _ctx.runtime;
    if (typeof runId !== "number" || !isFinite(runId)) {
      return { ok: false, diagnostics: [{ code: codes.CANCELLED, message: "NativeMultiSelect parameterSet action requires a numeric runId" }] };
    }
    if (typeof runtime.parameterSetRunId === "number" && runId < runtime.parameterSetRunId) {
      return { ok: false, diagnostics: [{ code: codes.CANCELLED, message: "stale parameterSet runId " + runId + " superseded by " + runtime.parameterSetRunId }] };
    }
    runtime.parameterSetRunId = runId;
    return null;
  }

  function isStale(_ctx, _runId) {
    var runtime = _ctx.runtime;
    return typeof runtime.parameterSetRunId === "number" && _runId < runtime.parameterSetRunId;
  }

  function cancelledResult(_message) {
    return { ok: false, diagnostics: [{ code: codes.CANCELLED, message: _message }] };
  }

  function readTargetScopeId(_target) {
    return String((_target && _target.scopeId) || "").trim();
  }

  function errorMessage(_error) {
    return String(_error && _error.message ? _error.message : _error);
  }

  // ---------- clear ----------

  function isHardFail(_diag) {
    return _diag && _diag.code === codes.CLEAR_FAILED;
  }

  function isAllowedClearTabIdx(_allowedClearTabIdxs, _tabIdxKey) {
    var tabIdx;
    if (!Array.isArray(_allowedClearTabIdxs)) { return true; }
    tabIdx = parseInt(_tabIdxKey, 10);
    if (!isFinite(tabIdx) || tabIdx < 0 || Math.floor(tabIdx) !== tabIdx) { return false; }
    if (String(tabIdx) !== String(_tabIdxKey)) { return false; }
    return _allowedClearTabIdxs.indexOf(tabIdx) !== -1;
  }

  function collectScopeIds(_payload, _KDB, _filtersFacet) {
    var tabIdxToScopeId = _payload && _payload.tabIdxToScopeId;
    var allowedClearTabIdxs = _payload && _payload.allowedClearTabIdxs;
    var scopeIds;
    var seen;
    var keys;
    var idx;
    var scopeId;
    if (tabIdxToScopeId && typeof tabIdxToScopeId === "object") {
      scopeIds = ["global"];
      seen = { global: true };
      keys = Object.keys(tabIdxToScopeId);
      for (idx = 0; idx < keys.length; idx += 1) {
        if (!isAllowedClearTabIdx(allowedClearTabIdxs, keys[idx])) { continue; }
        scopeId = readTargetScopeId(tabIdxToScopeId[keys[idx]]);
        if (!scopeId || seen[scopeId]) { continue; }
        seen[scopeId] = true;
        scopeIds.push(scopeId);
      }
      return scopeIds;
    }
    if (Array.isArray(allowedClearTabIdxs)) {
      return ["global"];
    }
    return _inventory.listAllUnownedScopes(_KDB, _filtersFacet);
  }

  async function runClear(_ctx, _payload) {
    var payload = _payload || {};
    var diagnostics = [];
    var clearedScopes = [];
    var degraded = false;
    try {
      var scopeIds = collectScopeIds(payload, _ctx._KDB, _ctx.filtersFacet);
      var scopeIdx;
      for (scopeIdx = 0; scopeIdx < scopeIds.length; scopeIdx += 1) {
        var scopeId = scopeIds[scopeIdx];
        var items = _inventory.listUnownedItems(_ctx._KDB, scopeId, _ctx.filtersFacet);
        var itemIdx;
        for (itemIdx = 0; itemIdx < items.length; itemIdx += 1) {
          var outcome = await _hostFilterIo.applyByItemId(_ctx._KDB, items[itemIdx].itemId, scopeId, [], diagnostics, _ctx.filtersFacet);
          if (outcome === "skipped") { degraded = true; }
          if (outcome === "failed") {
            return { ok: false, degraded: degraded, clearedScopes: clearedScopes, diagnostics: diagnostics };
          }
          if (isStale(_ctx, payload.runId)) {
            return cancelledResult("stale parameterSet runId was superseded during clear");
          }
        }
        _ctx.dispatchInternal({
          type: actions.TAB_MUTATION_SCOPE_WRITE,
          payload: { scopeId: scopeId, items: [], clear: true }
        });
        if (clearedScopes.indexOf(scopeId) === -1) { clearedScopes.push(scopeId); }
      }
      if (payload.status === "newDashboard") {
        return { ok: true, degraded: degraded || diagnostics.length > 0, clearedScopes: clearedScopes, diagnostics: diagnostics };
      }
      return {
        ok: diagnostics.filter(isHardFail).length === 0,
        degraded: degraded,
        clearedScopes: clearedScopes,
        diagnostics: diagnostics
      };
    } catch (error) {
      return {
        ok: payload.status === "newDashboard",
        degraded: true,
        clearedScopes: clearedScopes,
        diagnostics: [{ code: codes.CLEAR_FAILED, message: errorMessage(error) }]
      };
    }
  }

  function parameterSetClear(_ctx, _payload) {
    var guard = guardRun(_ctx, _payload);
    if (guard) { return Promise.resolve(guard); }
    return runClear(_ctx, _payload);
  }

  // ---------- restore ----------

  function groupByTab(_filters) {
    var groups = {};
    var idx;
    for (idx = 0; idx < _filters.length; idx += 1) {
      var tabKey = String(_filters[idx].tab);
      if (!groups[tabKey]) { groups[tabKey] = []; }
      groups[tabKey].push(_filters[idx]);
    }
    return groups;
  }

  function cloneVals(_vals) {
    return (_vals || []).map(function (v) {
      return { d: String(v.d), u: String(v.u) };
    });
  }

  function buildAppliedItem(_KDB, _nm, _scopeId, _vals, _filtersFacet) {
    var ref = _inventory.lookupRefByName(_KDB, _nm, _scopeId, _filtersFacet);
    return {
      itemId: ref ? String(ref.itemId || "") : "",
      itemName: _nm,
      sourceId: ref ? String(ref.sourceId || "") : "",
      values: cloneVals(_vals)
    };
  }

  function failedRestore(_run) {
    return { ok: false, degraded: _run.degraded, appliedScopes: _run.appliedScopes, skipped: _run.skipped, diagnostics: _run.diagnostics };
  }

  // Applies the saved entries of one scope to the host and mirrors them into the owner state. Returns the
  // final result when the run must stop (failure or superseded run), otherwise null.
  async function restoreScopeEntries(_ctx, _payload, _scopeId, _tab, _entries, _run) {
    var appliedItems = [];
    var entryIdx;
    for (entryIdx = 0; entryIdx < _entries.length; entryIdx += 1) {
      var entry = _entries[entryIdx];
      var nm = String(entry.nm || "").trim();
      var vals = Array.isArray(entry.vals) ? entry.vals : [];
      var outcome = await _hostFilterIo.applyByName(_ctx._KDB, nm, _scopeId, vals, _run.diagnostics, _ctx.filtersFacet);
      if (outcome === "failed") {
        return failedRestore(_run);
      }
      if (outcome === "skipped") {
        _run.degraded = true;
        _run.skipped.push(_tab === undefined ? { nm: nm, scopeId: _scopeId } : { nm: nm, tab: _tab, scopeId: _scopeId });
        continue;
      }
      appliedItems.push(buildAppliedItem(_ctx._KDB, nm, _scopeId, vals, _ctx.filtersFacet));
      if (isStale(_ctx, _payload.runId)) {
        return cancelledResult("stale parameterSet runId was superseded during restore");
      }
    }
    _ctx.dispatchInternal({
      type: actions.TAB_MUTATION_SCOPE_WRITE,
      payload: { scopeId: _scopeId, items: appliedItems, clear: false }
    });
    _run.appliedScopes.push(_scopeId);
    return null;
  }

  async function restorePageEntries(_ctx, _payload, _pageEntries, _run) {
    var groups = groupByTab(_pageEntries);
    var tabKeys = Object.keys(groups);
    var tabIdx;
    var stop;
    for (tabIdx = 0; tabIdx < tabKeys.length; tabIdx += 1) {
      var tab = parseInt(tabKeys[tabIdx], 10);
      var target = _payload.tabIdxToScopeId && _payload.tabIdxToScopeId[String(tab)];
      var scopeId = readTargetScopeId(target);
      if (!scopeId) {
        _run.diagnostics.push({ code: codes.TARGET_MISSING, tab: tab, message: "tab target has no resolvable scopeId" });
        return failedRestore(_run);
      }
      stop = await restoreScopeEntries(_ctx, _payload, scopeId, tab, groups[tabKeys[tabIdx]], _run);
      if (stop) { return stop; }
    }
    return null;
  }

  async function runRestore(_ctx, _payload) {
    var payload = _payload || {};
    var filters = Array.isArray(payload.filters) ? payload.filters : [];
    var globalEntries = filters.filter(function (e) { return e && e.tab === undefined; });
    var pageEntries = filters.filter(function (e) { return e && e.tab !== undefined; });
    var run = { appliedScopes: [], skipped: [], diagnostics: [], degraded: false };
    var globalDegraded;
    var stop;
    try {
      if (globalEntries.length > 0) {
        stop = await restoreScopeEntries(_ctx, payload, "global", undefined, globalEntries, run);
        if (stop) { return stop; }
      }
      globalDegraded = run.degraded;
      run.degraded = false;
      if (pageEntries.length > 0) {
        stop = await restorePageEntries(_ctx, payload, pageEntries, run);
        if (stop) { return stop; }
      }
      return {
        ok: true,
        degraded: globalDegraded || run.degraded,
        appliedScopes: run.appliedScopes,
        skipped: run.skipped,
        diagnostics: run.diagnostics
      };
    } catch (error) {
      return { ok: false, diagnostics: [{ code: codes.RESTORE_FAILED, message: errorMessage(error) }] };
    }
  }

  function parameterSetRestore(_ctx, _payload) {
    var guard = guardRun(_ctx, _payload);
    if (guard) { return Promise.resolve(guard); }
    return runRestore(_ctx, _payload);
  }

  // ---------- writeback snapshot ----------

  function collectScopeEntries(_ctx, _scopeId, _tab, _run) {
    var items = _inventory.listUnownedItems(_ctx._KDB, _scopeId, _ctx.filtersFacet);
    var idx;
    for (idx = 0; idx < items.length; idx += 1) {
      var nm = String(items[idx].itemName || "").trim();
      if (!nm) { continue; }
      var vals = _state.materializeValues(items[idx].values);
      if (vals.length === 0) { continue; }
      var identity = (_tab === undefined ? "global" : String(_tab)) + "|" + nm;
      if (_run.seen[identity]) {
        _run.diagnostics.push(_tab === undefined
          ? { code: codes.SKIPPED, nm: nm, message: "duplicate pcfs identity omitted" }
          : { code: codes.SKIPPED, nm: nm, tab: _tab, message: "duplicate pcfs identity omitted" });
        continue;
      }
      _run.seen[identity] = true;
      _run.entries.push(_tab === undefined ? { nm: nm, vals: vals } : { nm: nm, tab: _tab, vals: vals });
    }
  }

  function collectPageEntries(_ctx, _tabIdxToScopeId, _run) {
    var keys = Object.keys(_tabIdxToScopeId);
    var keyIdx;
    for (keyIdx = 0; keyIdx < keys.length; keyIdx += 1) {
      var tab = parseInt(keys[keyIdx], 10);
      if (typeof tab !== "number" || !isFinite(tab) || tab < 0 || Math.floor(tab) !== tab) { continue; }
      var target = _tabIdxToScopeId[keys[keyIdx]] || {};
      if (target.visible !== true) { continue; }
      if (!String(target.scopeId || "").trim()) {
        _run.diagnostics.push({ code: codes.SKIPPED, tab: tab });
        continue;
      }
      collectScopeEntries(_ctx, target.scopeId, tab, _run);
    }
  }

  // Synchronous on purpose: the writeback collector reads the result without awaiting.
  function collectWritebackSnapshot(_ctx, _payload) {
    var payload = _payload || {};
    var tabIdxToScopeId = payload.tabIdxToScopeId;
    var run = { entries: [], diagnostics: [], seen: {} };
    try {
      collectScopeEntries(_ctx, "global", undefined, run);
      if (_data.isPlainObject(tabIdxToScopeId)) {
        collectPageEntries(_ctx, tabIdxToScopeId, run);
      } else {
        run.diagnostics.push({ code: codes.SKIPPED, message: "live tab targets unavailable for page pcfs collect" });
      }
      return { ok: true, entries: run.entries, diagnostics: run.diagnostics };
    } catch (error) {
      // Fail-visible: a crash during the snapshot is not a design skip; ok: false makes the writeback GET abort the save.
      return {
        ok: false,
        entries: run.entries,
        diagnostics: run.diagnostics.concat([{ code: codes.SKIPPED, message: "snapshot crashed: " + errorMessage(error) }])
      };
    }
  }

  return {
    parameterSetClear: parameterSetClear,
    parameterSetRestore: parameterSetRestore,
    collectWritebackSnapshot: collectWritebackSnapshot
  };
});

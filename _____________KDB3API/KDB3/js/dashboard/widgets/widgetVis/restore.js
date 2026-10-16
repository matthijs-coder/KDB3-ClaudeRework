define([
  "./binding/gates.js",
  "./cleanup.js",
  "./config.js",
  "./lifecycle.js",
  "./runtime.js",
  "./settings.js",
  "./settingsSnapshot.js",
  "./state.js"
], function (_gates, _cleanup, _config, _lifecycle, _visRuntime, _settings, _settingsSnapshot, _state) {
  "use strict";

  var DEGRADED = "WRITEBACK_WIDGET_BINDING_DEGRADED";
  var FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";
  var RESET_FAILED = "WRITEBACK_WIDGET_RESET_FAILED";
  var CANCELLED = "WRITEBACK_RESTORE_CANCELLED";

  function collectVisWidgets(_correlation) {
    var byWidget = {};
    if (!_correlation || typeof _correlation !== "object") {
      return [];
    }
    Object.keys(_correlation).sort().forEach(function (_entryIndex) {
      var entry = _correlation[_entryIndex];
      if (entry && entry.kind === "vis" && entry.widgetId) {
        byWidget[entry.widgetId] = true;
      }
    });
    return Object.keys(byWidget);
  }

  function readCommittedSettings(_KDB, _widgetId) {
    var api = _KDB && _KDB.api ? _KDB.api.widgetSettings : null;
    var state = api && typeof api.getState === "function" ? api.getState() : null;
    var record = state && state.byWidget ? state.byWidget[_widgetId] : null;
    var settings;
    if (!record) {
      return null;
    }
    settings = { dimension: record.dimension, visType: record.visType, topNChoice: record.topNChoice };
    ["showValues", "iterator", "zoom", "valueCaption"].forEach(function (_key) {
      if (typeof record[_key] === "boolean") {
        settings[_key] = record[_key];
      }
    });
    if (_config.isGroupingValue(record.grouping)) {
      settings.grouping = record.grouping;
    }
    return settings;
  }

  function isDegradedFailure(_result) {
    var code = _result && _result.errorCode ? _result.errorCode : "";
    return (_result && _result.status === "timeout")
      || code === "WIDGET_VIS_CONTENT_READY_TIMEOUT"
      || code === "WIDGET_VIS_BINDING_PREREQUISITE_TIMEOUT"
      || code === "WIDGET_VIS_BINDING_TIMEOUT"
      || code === "WIDGET_VIS_TOPN_UNAVAILABLE";
  }

  function cancelledResult(_runId, _latestRunId, _diagnostics, _bound, _skipped) {
    _diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + _runId + " superseded by " + _latestRunId });
    return { ok: false, status: "cancelled", bound: _bound || [], skipped: _skipped || [], diagnostics: _diagnostics };
  }

  function failedResult(_code, _message) {
    return { ok: false, bound: [], skipped: [], diagnostics: [{ code: _code, message: _message }] };
  }

  function isSupersededRun(_runtimeRoot, _runId) {
    return _runtimeRoot.parameterSetRunId !== _runId;
  }

  async function bindRestoredWidget(_context, _widgetId, _committed, _skipHistory) {
    return _settings.handleApplyStartupSettings(_context, {
      type: _state.ACTION_TYPES.APPLY_STARTUP_SETTINGS,
      widgetId: _widgetId,
      opSeq: _context.ensureOpSeq(_widgetId),
      payload: {
        source: "historyReplay",
        isHistoryReplay: true,
        settingsSnapshot: _context.readSettingsSnapshot(_widgetId, { settingsSnapshot: _committed }),
        changedControls: [],
        skipHistory: _skipHistory === true,
        // Restore binds while the widget's tab is usually inactive; Cognos fires no render events there, so
        // awaiting them burns the full 12s vis timeout per widget. The post-restore traverse owns the visible render.
        deferRenderWait: true
      }
    });
  }

  async function handleParameterSetBinding(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var diagnostics = [];
    var bound = [];
    var skipped = [];
    var degraded = false;
    var runtimeRoot;
    var visWidgets;
    var widgetId;
    var index;
    var readyResult;
    var committed;
    var applyResult;
    var code;
    var result;

    if (typeof payload.runId !== "number") {
      return failedResult(FAILED, "widgetVis/parameterSetBindingRequested requires a numeric runId");
    }
    runtimeRoot = _visRuntime.initializeRuntime(_context._KDB);
    if (typeof runtimeRoot.parameterSetRunId === "number" && payload.runId < runtimeRoot.parameterSetRunId) {
      return cancelledResult(payload.runId, runtimeRoot.parameterSetRunId, diagnostics, bound, skipped);
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    visWidgets = collectVisWidgets(payload.widgetCorrelation);
    if (!visWidgets.length) {
      return failedResult(FAILED, "widgetCorrelation is missing supported vis widgets");
    }

    for (index = 0; index < visWidgets.length; index += 1) {
      widgetId = visWidgets[index];
      if (isSupersededRun(runtimeRoot, payload.runId)) {
        return cancelledResult(payload.runId, runtimeRoot.parameterSetRunId, diagnostics, [], []);
      }
      readyResult = await _lifecycle.handleWaitUntilContentReady(_context, {
        type: _state.ACTION_TYPES.WAIT_UNTIL_CONTENT_READY,
        widgetId: widgetId,
        payload: { timeoutMs: _config.contentReadyTimeoutMs }
      });
      if (isSupersededRun(runtimeRoot, payload.runId)) {
        return cancelledResult(payload.runId, runtimeRoot.parameterSetRunId, diagnostics, bound, skipped);
      }
      if (!readyResult || readyResult.ok !== true) {
        degraded = true;
        skipped.push({ widgetId: widgetId, code: DEGRADED });
        diagnostics.push({ code: DEGRADED, widgetId: widgetId, message: "content readiness gate failed or timed out" });
        continue;
      }
      committed = readCommittedSettings(_context._KDB, widgetId);
      if (!_settingsSnapshot.isCompleteSettingsSnapshot(committed)) {
        skipped.push({ widgetId: widgetId, code: FAILED });
        diagnostics.push({ code: FAILED, widgetId: widgetId, message: "committed widget settings are missing" });
        continue;
      }
      applyResult = await bindRestoredWidget(_context, widgetId, committed, payload.skipHistory);
      if (isSupersededRun(runtimeRoot, payload.runId)) {
        return cancelledResult(payload.runId, runtimeRoot.parameterSetRunId, diagnostics, bound, skipped);
      }
      if (applyResult && applyResult.ok === true) {
        bound.push(widgetId);
        continue;
      }
      code = isDegradedFailure(applyResult) ? DEGRADED : FAILED;
      degraded = degraded || code === DEGRADED;
      skipped.push({ widgetId: widgetId, code: code });
      diagnostics.push({
        code: code,
        widgetId: widgetId,
        message: String(applyResult && (applyResult.errorMessage || applyResult.errorCode) ? (applyResult.errorMessage || applyResult.errorCode) : "binding pipeline failed")
      });
    }

    result = { ok: skipped.length === 0, bound: bound, skipped: skipped, diagnostics: diagnostics };
    if (result.ok && degraded) {
      result.degraded = true;
    }
    return result;
  }

  function cancelPendingWork(_KDB, _runtimeRoot, _widgetId) {
    var widgetRuntime = _runtimeRoot.byId ? _runtimeRoot.byId[_widgetId] : null;
    _gates.cancelGateWaitersForWidget(_KDB, _widgetId);
    if (widgetRuntime) {
      _visRuntime.rejectContentReadyWaiters(_KDB, _widgetId, { ok: false, widgetId: _widgetId, status: "cancelled", errorCode: CANCELLED });
      _visRuntime.abortActiveApply(widgetRuntime);
    }
  }

  async function runContentCleanup(_context, _widgetId) {
    try {
      return await _cleanup.handleCleanupContent(_context, {
        type: _state.ACTION_TYPES.CLEANUP_CONTENT,
        widgetId: _widgetId,
        payload: {
          reason: "parameterSetReset",
          clearBinding: true,
          clearDrillthrough: true,
          clearDomDecorations: true,
          isHistoryReplay: false
        }
      });
    } catch (err) {
      return { ok: false, errorCode: "WIDGET_VIS_CLEANUP_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  // Cancels in-flight binding work (applies, TopN/dienststelle gates, content-ready waiters) and clears the
  // active binding per widget before the shells are parked (widgetBase parameterSetReset contract).
  async function handleParameterSetCancelBindings(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var diagnostics = [];
    var runtimeRoot;
    var widgetIds;
    var cleanupResult;
    var ok = true;
    var index;
    if (typeof payload.runId !== "number") {
      diagnostics.push({ code: RESET_FAILED, message: "widgetVis/parameterSetCancelBindingsRequested requires a numeric runId" });
      return { ok: false, status: "error", diagnostics: diagnostics };
    }
    runtimeRoot = _visRuntime.initializeRuntime(_context._KDB);
    if (typeof runtimeRoot.parameterSetRunId === "number" && payload.runId < runtimeRoot.parameterSetRunId) {
      diagnostics.push({ code: CANCELLED, message: "stale parameterSet runId " + payload.runId + " superseded by " + runtimeRoot.parameterSetRunId });
      return { ok: false, status: "cancelled", diagnostics: diagnostics };
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    widgetIds = (Array.isArray(payload.widgetIds) ? payload.widgetIds : []).filter(function (_widgetId) {
      return !!_context.selectors.readVisRecord(_context._KDB, _widgetId);
    });
    for (index = 0; index < widgetIds.length; index += 1) {
      cancelPendingWork(_context._KDB, runtimeRoot, widgetIds[index]);
      cleanupResult = await runContentCleanup(_context, widgetIds[index]);
      if (!cleanupResult || (cleanupResult.ok !== true && cleanupResult.stale !== true && cleanupResult.skipped !== true)) {
        ok = false;
        diagnostics.push({
          code: RESET_FAILED,
          widgetId: widgetIds[index],
          message: "binding cleanup failed: " + String(cleanupResult && cleanupResult.errorCode ? cleanupResult.errorCode : "unknown")
        });
      }
    }
    return { ok: ok, status: ok ? "success" : "error", diagnostics: diagnostics };
  }

  return {
    handleParameterSetBinding: handleParameterSetBinding,
    handleParameterSetCancelBindings: handleParameterSetCancelBindings
  };
});

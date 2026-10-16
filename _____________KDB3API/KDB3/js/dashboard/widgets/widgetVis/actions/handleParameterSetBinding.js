define([
  "../state.js",
  "../runtime.js",
  "../lifecycle.js",
  "./handleApplyStartupSettings.js",
  "../settingsSnapshot.js",
  "./parameterSetBindingHelpers.js"
], function (_state, _visRuntime, _lifecycle, _handleApplyStartupSettings, _settingsSnapshot, _helpers) {
  "use strict";

  var DEGRADED = "WRITEBACK_WIDGET_BINDING_DEGRADED";
  var FAILED = "WRITEBACK_WIDGET_RESTORE_FAILED";

  async function handleParameterSetBinding(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var diagnostics = [];
    var bound = [];
    var skipped = [];
    var degraded = false;

    if (typeof payload.runId !== "number") {
      return _helpers.failedResult(FAILED, "widgetVis/parameterSetBindingRequested requires a numeric runId");
    }

    var runtimeRoot = _visRuntime.initializeRuntime(_context._KDB);
    if (typeof runtimeRoot.parameterSetRunId === "number" && payload.runId < runtimeRoot.parameterSetRunId) {
      return _helpers.cancelledResult(payload.runId, runtimeRoot.parameterSetRunId, diagnostics, bound, skipped);
    }
    runtimeRoot.parameterSetRunId = payload.runId;

    var visWidgets = _helpers.collectVisWidgets(payload.widgetCorrelation);
    if (!visWidgets.length) {
      return _helpers.failedResult(FAILED, "widgetCorrelation is missing supported vis widgets");
    }

    for (var i = 0; i < visWidgets.length; i += 1) {
      var widgetId = visWidgets[i];
      var stale = checkRunFresh(runtimeRoot, payload.runId, diagnostics);
      if (!stale.ok) {
        return stale.result;
      }

      var readyResult = await _lifecycle.handleWaitUntilContentReady(_context, {
        type: _state.ACTION_TYPES.WAIT_UNTIL_CONTENT_READY,
        widgetId: widgetId,
        payload: { timeoutMs: 3000 }
      });
      stale = checkRunFresh(runtimeRoot, payload.runId, diagnostics, bound, skipped);
      if (!stale.ok) {
        return stale.result;
      }
      if (!readyResult || readyResult.ok !== true) {
        degraded = true;
        skipped.push({ widgetId: widgetId, code: DEGRADED });
        diagnostics.push({
          code: DEGRADED,
          widgetId: widgetId,
          message: "content readiness gate failed or timed out"
        });
        continue;
      }

      var committed = _helpers.readCommittedSettings(_context._KDB, widgetId);
      if (!_settingsSnapshot.isCompleteSettingsSnapshot(committed)) {
        skipped.push({ widgetId: widgetId, code: FAILED });
        diagnostics.push({
          code: FAILED,
          widgetId: widgetId,
          message: "committed widget settings are missing"
        });
        continue;
      }

      var applyResult = await _handleApplyStartupSettings.handleApplyStartupSettings(_context, {
        type: _state.ACTION_TYPES.APPLY_STARTUP_SETTINGS,
        widgetId: widgetId,
        opSeq: _context.ensureOpSeq(widgetId),
        payload: {
          source: "historyReplay",
          isHistoryReplay: true,
          settingsSnapshot: _context.readSettingsSnapshot(widgetId, { settingsSnapshot: committed }),
          changedControls: [],
          skipHistory: payload.skipHistory === true,
          // Restore binds while the widget's tab is usually inactive; Cognos
          // fires no render events there, so awaiting them burns the full
          // 12s vis timeout per widget. The post-restore traverse (step 28)
          // owns the visible render instead (bugfix sync 2026-07-13).
          deferRenderWait: true
        }
      });
      stale = checkRunFresh(runtimeRoot, payload.runId, diagnostics, bound, skipped);
      if (!stale.ok) {
        return stale.result;
      }
      if (applyResult && applyResult.ok === true) {
        bound.push(widgetId);
      } else {
        var code = _helpers.isDegradedFailure(applyResult) ? DEGRADED : FAILED;
        if (code === DEGRADED) {
          degraded = true;
        }
        skipped.push({ widgetId: widgetId, code: code });
        diagnostics.push({
          code: code,
          widgetId: widgetId,
          message: String(applyResult && (applyResult.errorMessage || applyResult.errorCode) ? (applyResult.errorMessage || applyResult.errorCode) : "binding pipeline failed")
        });
      }
    }

    var ok = skipped.length === 0;
    var result = { ok: ok, bound: bound, skipped: skipped, diagnostics: diagnostics };
    if (ok && degraded) {
      result.degraded = true;
    }
    return result;
  }

  function checkRunFresh(_runtimeRoot, _runId, _diagnostics, _bound, _skipped) {
    if (_runtimeRoot.parameterSetRunId === _runId) {
      return { ok: true };
    }
    return {
      ok: false,
      result: _helpers.cancelledResult(_runId, _runtimeRoot.parameterSetRunId, _diagnostics, _bound || [], _skipped || [])
    };
  }

  return handleParameterSetBinding;
});

define([
  "../runtime.js",
  "../legend/sweep.js",
  "../focus/maximizeToggle.js",
  "../drillthrough/install.js",
  "../focus/maximizeIcon.js"
], function (_visRuntime, _legendSweep, _maximizeToggle, _drillthroughInstall, _maximizeIcon) {
  "use strict";

  // Unpark = rebuild (adapter-contract §3.7): a widget that returns to
  // canvas without contentCreate gets focus and
  // legend observers here again. Installations are idempotent (alreadyInstalled
  // guard vs disconnect-first). Legend path is sweep + install: Cognos may
  // re-paint captions on unpark, so sanitizers run here with current settings.
  function handleEnsureObservers(_context, _action) {
    var widgetId = _action.widgetId || ((_action.payload || {}).widgetId);
    try {
      if (!widgetId) {
        return { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" };
      }
      if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
        return { ok: true, skipped: true, widgetId: widgetId, status: "success" };
      }
      var runtime = _visRuntime.ensureWidgetRuntime(_context._KDB, widgetId);
      var focusResult = _maximizeToggle.ensureFocusObserver(_context, widgetId, runtime);
      var legendLog = sweepLegendOnUnpark(_context, widgetId, runtime);
      var drillthroughResult = null;
      var maximizeResult = null;
      try {
        drillthroughResult = _drillthroughInstall.installDrillthrough({ _KDB: _context._KDB, widgetId: widgetId });
      } catch (err) {
        console.error("[widgetVis.handleEnsureObservers] drillthrough", widgetId, err);
        drillthroughResult = { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
      }
      try {
        maximizeResult = _maximizeIcon.installCanvasMaximize({ _KDB: _context._KDB, widgetId: widgetId });
      } catch (err) {
        console.error("[widgetVis.handleEnsureObservers] maximize", widgetId, err);
        maximizeResult = { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
      }
      var ok = focusResult.ok !== false;
      return {
        ok: ok,
        widgetId: widgetId,
        status: ok ? "success" : "error",
        errorCode: ok ? undefined : focusResult.errorCode,
        diagnostics: {
          focus: focusResult.diagnostics || null,
          legend: legendLog,
          drillthrough: drillthroughResult,
          maximize: maximizeResult
        }
      };
    } catch (err) {
      console.error("[widgetVis.handleEnsureObservers] failed", widgetId, err);
      return {
        ok: false,
        widgetId: widgetId,
        status: "error",
        errorMessage: String(err && err.message ? err.message : err)
      };
    }
  }

  function sweepLegendOnUnpark(_context, _widgetId, _runtime) {
    var settings = _context.readSettingsSnapshot(_widgetId, {}) || {};
    try {
      return _legendSweep.sweepLegendCaptions(_runtime, _widgetId, {
        widgetId: _widgetId,
        opSeq: _runtime.opSeq,
        reason: "ensureObservers",
        dimension: settings.dimension != null ? settings.dimension : null,
        visType: settings.visType != null ? settings.visType : null,
        runtime: _runtime,
        isStaleOpSeq: _context.isStaleOpSeq
      });
    } catch (err) {
      console.error("[widgetVis.handleEnsureObservers] legend sweep failed", _widgetId, err);
      return { action: "failed", error: String(err && err.message ? err.message : err) };
    }
  }

  return handleEnsureObservers;
});

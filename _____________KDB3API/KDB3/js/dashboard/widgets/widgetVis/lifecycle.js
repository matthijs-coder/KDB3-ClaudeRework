define([
  "./state.js",
  "./runtime.js",
  "./dom.js",
  "./results.js",
  "./binding/pipeline.js",
  "./binding/gates.js",
  "./focus/maximizeToggle.js",
  "./focus/maximizeIcon.js",
  "./focus/focusMode.js",
  "./drillthrough/install.js",
  "./legend/sweep.js",
  "../../../core/utils/kit/runtime.js"
], function (
  _state,
  _visRuntime,
  _dom,
  _results,
  _bindingPipeline,
  _gates,
  _maximizeToggle,
  _maximizeIcon,
  _focusMode,
  _drillthroughInstall,
  _legendSweep,
  _kitRuntime
) {
  "use strict";

  function errorMessageOf(_err) {
    return String(_err && _err.message ? _err.message : _err);
  }

  function readWidgetId(_action) {
    return _action.widgetId || (_action.payload || {}).widgetId;
  }

  function buildExplicitInitialSettings(_payload) {
    var initial = _payload.initialSettings || {};
    return {
      dimension: initial.dimension != null ? initial.dimension : null,
      visType: initial.visType != null ? initial.visType : null,
      topNChoice: initial.topNChoice != null ? initial.topNChoice : null
    };
  }

  function hasExplicitBindingIntent(_payload) {
    var initial = _payload.initialSettings;
    return !!initial && typeof initial === "object" && !!(initial.dimension || initial.visType || initial.topNChoice);
  }

  function registerContentContext(_context, _action, _metric) {
    var widgetId = _action.widgetId;
    var runtime = _visRuntime.ensureWidgetRuntime(_context._KDB, widgetId);
    runtime.domRefs = Object.assign({}, runtime.domRefs, _dom.resolveVisualizationContent(widgetId));
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.REGISTER_CONTENT,
      widgetId: widgetId,
      payload: {
        record: {
          derived: {
            titleText: _metric.display || _metric.code || "",
            code: _metric.code || null,
            display: _metric.display || null,
            metricsTable: _metric.metricsTable || null,
            langtext: _metric.langtext || null,
            url: _metric.url || null,
            datasourceName: _metric.metricsTable || null
          }
        }
      }
    });
    _visRuntime.resolveContentReadyWaiters(_context._KDB, widgetId);
    _maximizeToggle.ensureFocusObserver(_context, widgetId, runtime);
  }

  function runExplicitInitialBinding(_context, _action, _metric, _settings) {
    _context.dispatchInternal({
      type: _state.ACTION_TYPES.MARK_PENDING,
      widgetId: _action.widgetId,
      payload: { kind: "contentCreate", opSeq: _action.opSeq }
    });
    return _bindingPipeline.runBindingPipeline(_context, {
      widgetId: _action.widgetId,
      opSeq: _action.opSeq,
      reason: "contentCreate",
      metric: _metric,
      settings: _settings,
      payload: _action.payload || {}
    }).then(function (result) {
      return _results.finalizePipelineResult(_context, _action, result, {
        defaultErrorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        defaultErrorMessage: "Content create binding failed."
      });
    });
  }

  function handleContentCreate(_context, _action) {
    try {
      var payload = _action.payload || {};
      var metric = _state.resolveMetricFromContentCreatePayload(payload);
      var widgetId = _action.widgetId;
      if (!metric.code) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
          errorMessage: "Metric identity is required for content create."
        }));
      }
      registerContentContext(_context, _action, metric);
      _drillthroughInstall.installContentDecorations(_context, widgetId);
      if (!hasExplicitBindingIntent(payload)) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: true, widgetId: widgetId, opSeq: _action.opSeq, status: "success" }));
      }
      return runExplicitInitialBinding(_context, _action, metric, buildExplicitInitialSettings(payload));
    } catch (err) {
      console.error("[widgetVis.handleContentCreate] failed", _action && _action.widgetId, err);
      _context.dispatchInternal({
        type: _state.ACTION_TYPES.ERROR_RECORDED,
        widgetId: _action.widgetId,
        payload: { errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED", errorMessage: errorMessageOf(err) }
      });
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        errorCode: "WIDGET_VIS_CONTENT_CREATE_FAILED",
        errorMessage: errorMessageOf(err)
      }));
    }
  }

  function createContentReadyWaiter(_KDB, _widgetId, _runtime, _payload) {
    var settle = null;
    var promise = new Promise(function (resolve) {
      settle = resolve;
    });
    var timerId = setTimeout(function () {
      _visRuntime.clearContentReadyPending(_runtime);
      settle({
        ok: false,
        widgetId: _widgetId,
        status: "timeout",
        errorCode: "WIDGET_VIS_CONTENT_READY_TIMEOUT",
        errorMessage: "Content registration timed out."
      });
    }, _visRuntime.getContentReadyTimeoutMs(_payload));
    _runtime.pendingPromises.contentReady = { promise: promise, resolve: settle, timerId: timerId };
    return promise;
  }

  function handleWaitUntilContentReady(_context, _action) {
    try {
      var widgetId = _action.widgetId;
      var _KDB = _context._KDB;
      if (_context.isDisposed) {
        return Promise.resolve(_results.normalizeDispatchResult({
          ok: false,
          widgetId: widgetId,
          status: "error",
          errorCode: "WIDGET_VIS_DESTROY_FAILED",
          errorMessage: "widgetVis is disposed."
        }));
      }
      if (_visRuntime.isContentReady(_KDB, widgetId)) {
        return Promise.resolve(_results.normalizeDispatchResult({ ok: true, widgetId: widgetId, ready: true }));
      }
      var runtime = _visRuntime.ensureWidgetRuntime(_KDB, widgetId);
      var existing = runtime.pendingPromises.contentReady;
      var promise = existing && existing.promise ? existing.promise : createContentReadyWaiter(_KDB, widgetId, runtime, _action.payload || {});
      return promise.then(_results.normalizeDispatchResult);
    } catch (err) {
      console.error("[widgetVis.handleWaitUntilContentReady] failed", _action && _action.widgetId, err);
      return Promise.resolve(_results.normalizeDispatchResult({
        ok: false,
        widgetId: _action.widgetId,
        status: "error",
        errorCode: "WIDGET_VIS_CONTENT_CONTEXT_MISSING",
        errorMessage: errorMessageOf(err)
      }));
    }
  }

  function runObserverStep(_widgetId, _step, _run, _fallback) {
    try {
      return _run();
    } catch (err) {
      console.error("[widgetVis.handleEnsureObservers] " + _step + " failed", _widgetId, err);
      return _fallback(err);
    }
  }

  // Unpark rebuilds the observers: a widget that returns to the canvas without contentCreate gets focus, legend,
  // drillthrough and maximize chrome here again. Cognos may re-paint legend captions on unpark, so the sanitizers run
  // with the current settings.
  function handleEnsureObservers(_context, _action) {
    var widgetId = readWidgetId(_action);
    try {
      if (!widgetId) {
        return { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" };
      }
      if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
        return { ok: true, skipped: true, widgetId: widgetId, status: "success" };
      }
      var runtime = _visRuntime.ensureWidgetRuntime(_context._KDB, widgetId);
      var focusResult = _maximizeToggle.ensureFocusObserver(_context, widgetId, runtime);
      var settings = _context.readSettingsSnapshot(widgetId, {}) || {};
      var legendLog = runObserverStep(widgetId, "legend sweep", function () {
        return _legendSweep.sweepLegendCaptions(runtime, widgetId, {
          widgetId: widgetId,
          opSeq: runtime.opSeq,
          reason: "ensureObservers",
          dimension: settings.dimension != null ? settings.dimension : null,
          visType: settings.visType != null ? settings.visType : null,
          runtime: runtime,
          isStaleOpSeq: _context.isStaleOpSeq
        });
      }, function (err) {
        return { action: "failed", error: errorMessageOf(err) };
      });
      var drillthroughResult = runObserverStep(widgetId, "drillthrough", function () {
        return _drillthroughInstall.installDrillthrough({ _KDB: _context._KDB, widgetId: widgetId });
      }, function () {
        return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
      });
      var maximizeResult = runObserverStep(widgetId, "maximize", function () {
        return _maximizeIcon.installCanvasMaximize({ _KDB: _context._KDB, widgetId: widgetId });
      }, function () {
        return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
      });
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
      return { ok: false, widgetId: widgetId, status: "error", errorMessage: errorMessageOf(err) };
    }
  }

  // Park, tab delete and remove are dispose points: observers and pending work must not outlive the widget's canvas placement.
  function disposeWidgetRuntime(_KDB, _widgetId, _options) {
    var options = _options || {};
    var diagnostics = options.diagnostics || {};
    var root = _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis : null;
    if (!root) {
      return { disposed: false, diagnostics: diagnostics };
    }
    diagnostics.dienststelleWaitersCancelled = _gates.cancelGateWaitersForWidget(_KDB, _widgetId).dienststelleCancelled;
    var widgetRuntime = root.byId ? root.byId[_widgetId] : null;
    if (!widgetRuntime) {
      return { disposed: false, diagnostics: diagnostics };
    }
    if (options.exitFocus) {
      _focusMode.exitNativeFocus(_KDB, _widgetId, diagnostics);
    }
    diagnostics.focusMode = _focusMode.disposeFocusMode(_KDB, _widgetId, widgetRuntime).diagnostics || {};
    diagnostics.legendObserver = _legendSweep.disconnectLegendTextObserver(widgetRuntime);
    _visRuntime.rejectContentReadyWaiters(_KDB, _widgetId, {
      ok: false,
      widgetId: _widgetId,
      status: "cancelled",
      errorCode: "WIDGET_VIS_WIDGET_DISPOSED"
    });
    var errors = _kitRuntime.disposeRuntimeBuckets(widgetRuntime);
    if (errors.length) {
      console.error("[widgetVis.disposeWidgetRuntime] cleanup errors", { widgetId: _widgetId }, errors);
    }
    delete root.byId[_widgetId];
    return { disposed: true, diagnostics: diagnostics };
  }

  function handleDisposeWidgetRuntime(_context, _action) {
    var widgetId = readWidgetId(_action);
    if (!widgetId) {
      return { ok: false, errorCode: "WIDGET_VIS_WIDGET_ID_MISSING" };
    }
    var reason = (_action.payload || {}).reason || null;
    var disposal = disposeWidgetRuntime(_context._KDB, widgetId, { exitFocus: true, diagnostics: { reason: reason } });
    // Only a removed widget loses its record; park (transfer) and rollback keep it for undo and writeback.
    if (reason === "remove") {
      _context.dispatchInternal({ type: _state.ACTION_TYPES.RECORD_REMOVED, widgetId: widgetId });
    }
    var result = { ok: true, widgetId: widgetId, status: "success", diagnostics: disposal.diagnostics };
    if (!disposal.disposed) {
      result.skipped = true;
    }
    return result;
  }

  function disposeModuleRuntime(_KDB) {
    _gates.rejectAllGateWaiters(_KDB);
    _visRuntime.rejectAllContentReadyWaiters(_KDB, {
      ok: false,
      status: "error",
      errorCode: "WIDGET_VIS_DESTROY_FAILED",
      errorMessage: "widgetVis destroyed."
    });
    var runtime = _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis : {};
    Object.keys(runtime.byId || {}).forEach(function (widgetId) {
      disposeWidgetRuntime(_KDB, widgetId, { exitFocus: false });
    });
    var errors = _kitRuntime.disposeRuntimeBuckets(runtime);
    if (errors.length) {
      console.error("[widgetVis.disposeModuleRuntime] cleanup errors", errors);
    }
    _KDB.runtime.widgetVis = {};
  }

  return {
    handleContentCreate: handleContentCreate,
    handleWaitUntilContentReady: handleWaitUntilContentReady,
    handleEnsureObservers: handleEnsureObservers,
    handleDisposeWidgetRuntime: handleDisposeWidgetRuntime,
    disposeWidgetRuntime: disposeWidgetRuntime,
    disposeModuleRuntime: disposeModuleRuntime
  };
});

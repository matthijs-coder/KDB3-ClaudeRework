define(["./config.js"], function (_config) {
  "use strict";

  function initializeRuntime(_KDB) {
    try {
      _KDB.runtime = _KDB.runtime || {};
      _KDB.runtime.widgetVis = _KDB.runtime.widgetVis || {};
      var runtime = _KDB.runtime.widgetVis;
      runtime.domRefs = runtime.domRefs || {};
      runtime.listeners = runtime.listeners || {};
      runtime.subscriptions = runtime.subscriptions || {};
      runtime.abortControllers = runtime.abortControllers || {};
      runtime.observers = runtime.observers || {};
      runtime.timers = runtime.timers || {};
      runtime.pendingPromises = runtime.pendingPromises || {};
      runtime.byId = runtime.byId || {};
      if (runtime.enableDrillthrough == null) {
        runtime.enableDrillthrough = true;
      }
      return runtime;
    } catch (err) {
      console.error("[widgetVis.initializeRuntime] failed", err);
      throw err;
    }
  }

  function createDefaultFocusModeBucket() {
    return {
      observedExpanded: false,
      observer: null,
      focusPanelEl: null,
      dispose: null,
      source: null
    };
  }

  function ensureWidgetRuntime(_KDB, _widgetId) {
    var runtimeRoot = initializeRuntime(_KDB);
    runtimeRoot.byId = runtimeRoot.byId || {};
    if (!runtimeRoot.byId[_widgetId]) {
      runtimeRoot.byId[_widgetId] = createEmptyWidgetRuntime();
    } else if (!runtimeRoot.byId[_widgetId].focusMode) {
      runtimeRoot.byId[_widgetId].focusMode = createDefaultFocusModeBucket();
    }
    return runtimeRoot.byId[_widgetId];
  }

  function createEmptyWidgetRuntime() {
    return {
      domRefs: {
        contentEl: null,
        headerEl: null,
        titleLinkEl: null,
        drillthroughIconEl: null,
        datapointDrillthroughIconEl: null,
        canvasMaximizeIconEl: null
      },
      listeners: {},
      abortControllers: {},
      observers: {},
      timers: {},
      pendingPromises: {},
      opSeq: 0,
      lastSuccessfulPlan: null,
      lastAppliedVisPropertiesType: null,
      managedFilterItemIds: [],
      drillthrough: {
        installed: false,
        lastSelectionEvent: null,
        pendingSelectionEvents: [],
        captureActive: false
      },
      focusMode: createDefaultFocusModeBucket()
    };
  }

  function readWidgetRuntime(_KDB, _widgetId) {
    var byId = _KDB && _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis.byId : null;
    return byId && byId[_widgetId] ? byId[_widgetId] : null;
  }

  function readHostFacet(_KDB, _name) {
    var rt = _KDB && _KDB.runtime ? _KDB.runtime.widgetVis : null;
    return rt && rt[_name] ? rt[_name] : null;
  }

  function abortActiveApply(_runtime) {
    var controllers = _runtime.abortControllers || {};
    Object.keys(controllers).forEach(function (_key) {
      var controller = controllers[_key];
      if (controller && typeof controller.abort === "function") {
        controller.abort();
      }
    });
    _runtime.abortControllers = {};
  }

  function hasMetricDataIdentity(_record) {
    if (!_record || !_record.derived) {
      return false;
    }
    var derived = _record.derived;
    var code = derived.code || derived.kennzahlCode;
    var metricsTable = derived.metricsTable || derived.datasourceName;
    return !!(code && (metricsTable || code));
  }

  function isContentReady(_KDB, _widgetId) {
    try {
      var record = _KDB.state && _KDB.state.widgets && _KDB.state.widgets.vis && _KDB.state.widgets.vis.byId
        ? _KDB.state.widgets.vis.byId[_widgetId]
        : null;
      var runtime = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
        ? _KDB.runtime.widgetVis.byId[_widgetId]
        : null;
      if (!record || !runtime) {
        return false;
      }
      if (typeof runtime.opSeq !== "number") {
        return false;
      }
      return hasMetricDataIdentity(record);
    } catch (err) {
      console.error("[widgetVis.contentReady.isContentReady] failed", _widgetId, err);
      throw err;
    }
  }

  function clearContentReadyPending(_runtime) {
    try {
      var pending = _runtime.pendingPromises && _runtime.pendingPromises.contentReady;
      if (!pending) {
        return;
      }
      if (pending.timerId) {
        clearTimeout(pending.timerId);
      }
      _runtime.pendingPromises.contentReady = null;
    } catch (err) {
      console.error("[widgetVis.contentReady.clearContentReadyPending] failed", err);
      throw err;
    }
  }

  function resolveContentReadyWaiters(_KDB, _widgetId) {
    try {
      var runtime = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
        ? _KDB.runtime.widgetVis.byId[_widgetId]
        : null;
      if (!runtime || !runtime.pendingPromises || !runtime.pendingPromises.contentReady) {
        return;
      }
      var pending = runtime.pendingPromises.contentReady;
      clearContentReadyPending(runtime);
      if (typeof pending.resolve === "function") {
        pending.resolve({ ok: true, widgetId: _widgetId, ready: true });
      }
    } catch (err) {
      console.error("[widgetVis.contentReady.resolveContentReadyWaiters] failed", _widgetId, err);
      throw err;
    }
  }

  function rejectContentReadyWaiters(_KDB, _widgetId, _result) {
    try {
      var runtime = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
        ? _KDB.runtime.widgetVis.byId[_widgetId]
        : null;
      if (!runtime || !runtime.pendingPromises || !runtime.pendingPromises.contentReady) {
        return;
      }
      var pending = runtime.pendingPromises.contentReady;
      clearContentReadyPending(runtime);
      if (typeof pending.resolve === "function") {
        pending.resolve(_result || { ok: false, widgetId: _widgetId, status: "error" });
      }
    } catch (err) {
      console.error("[widgetVis.contentReady.rejectContentReadyWaiters] failed", _widgetId, err);
      throw err;
    }
  }

  function rejectAllContentReadyWaiters(_KDB, _result) {
    try {
      var byId = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
        ? _KDB.runtime.widgetVis.byId
        : {};
      Object.keys(byId).forEach(function (widgetId) {
        rejectContentReadyWaiters(_KDB, widgetId, _result);
      });
    } catch (err) {
      console.error("[widgetVis.contentReady.rejectAllContentReadyWaiters] failed", err);
      throw err;
    }
  }

  function getContentReadyTimeoutMs(_payload) {
    try {
      var payload = _payload || {};
      if (typeof payload.timeoutMs === "number" && payload.timeoutMs > 0) {
        return payload.timeoutMs;
      }
      return _config.contentReadyTimeoutMs;
    } catch (err) {
      console.error("[widgetVis.contentReady.getContentReadyTimeoutMs] failed", err);
      throw err;
    }
  }

  return {
    initializeRuntime: initializeRuntime,
    ensureWidgetRuntime: ensureWidgetRuntime,
    readWidgetRuntime: readWidgetRuntime,
    readHostFacet: readHostFacet,
    abortActiveApply: abortActiveApply,
    isContentReady: isContentReady,
    resolveContentReadyWaiters: resolveContentReadyWaiters,
    rejectContentReadyWaiters: rejectContentReadyWaiters,
    rejectAllContentReadyWaiters: rejectAllContentReadyWaiters,
    clearContentReadyPending: clearContentReadyPending,
    getContentReadyTimeoutMs: getContentReadyTimeoutMs
  };
});

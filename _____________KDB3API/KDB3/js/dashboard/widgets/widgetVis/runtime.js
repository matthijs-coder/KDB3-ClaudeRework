define([
  "./config.js",
  "./selectors.js",
  "../../../core/utils/kit/runtime.js"
], function (_config, _selectors, _kitRuntime) {
  "use strict";

  function initializeRuntime(_KDB) {
    return _kitRuntime.ensureRuntime(_KDB, "widgetVis", { byId: {}, enableDrillthrough: true });
  }

  function createFocusModeBucket() {
    return {
      observedExpanded: false,
      observer: null,
      focusPanelEl: null,
      dispose: null,
      source: null
    };
  }

  function createWidgetRuntime() {
    return _kitRuntime.ensureRuntimeBuckets({
      domRefs: {
        contentEl: null,
        headerEl: null,
        titleLinkEl: null,
        drillthroughIconEl: null,
        datapointDrillthroughIconEl: null,
        canvasMaximizeIconEl: null
      },
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
      focusMode: createFocusModeBucket()
    });
  }

  function ensureWidgetRuntime(_KDB, _widgetId) {
    var byId = initializeRuntime(_KDB).byId;
    if (!byId[_widgetId]) {
      byId[_widgetId] = createWidgetRuntime();
    } else if (!byId[_widgetId].focusMode) {
      byId[_widgetId].focusMode = createFocusModeBucket();
    }
    return byId[_widgetId];
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
    var derived = _record.derived;
    return !!derived && !!(derived.code || derived.kennzahlCode);
  }

  function isContentReady(_KDB, _widgetId) {
    var record = _selectors.readVisRecord(_KDB, _widgetId);
    var runtime = readWidgetRuntime(_KDB, _widgetId);
    return !!record && !!runtime && typeof runtime.opSeq === "number" && hasMetricDataIdentity(record);
  }

  function clearContentReadyPending(_runtime) {
    var pending = _runtime.pendingPromises && _runtime.pendingPromises.contentReady;
    if (!pending) {
      return;
    }
    if (pending.timerId) {
      clearTimeout(pending.timerId);
    }
    _runtime.pendingPromises.contentReady = null;
  }

  function settleContentReadyWaiters(_KDB, _widgetId, _result) {
    var runtime = readWidgetRuntime(_KDB, _widgetId);
    var pending = runtime && runtime.pendingPromises ? runtime.pendingPromises.contentReady : null;
    if (!pending) {
      return;
    }
    clearContentReadyPending(runtime);
    if (typeof pending.resolve === "function") {
      pending.resolve(_result);
    }
  }

  function resolveContentReadyWaiters(_KDB, _widgetId) {
    settleContentReadyWaiters(_KDB, _widgetId, { ok: true, widgetId: _widgetId, ready: true });
  }

  function rejectContentReadyWaiters(_KDB, _widgetId, _result) {
    settleContentReadyWaiters(_KDB, _widgetId, _result || { ok: false, widgetId: _widgetId, status: "error" });
  }

  function rejectAllContentReadyWaiters(_KDB, _result) {
    var byId = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId ? _KDB.runtime.widgetVis.byId : {};
    Object.keys(byId).forEach(function (widgetId) {
      rejectContentReadyWaiters(_KDB, widgetId, _result);
    });
  }

  function getContentReadyTimeoutMs(_payload) {
    var payload = _payload || {};
    return typeof payload.timeoutMs === "number" && payload.timeoutMs > 0 ? payload.timeoutMs : _config.contentReadyTimeoutMs;
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

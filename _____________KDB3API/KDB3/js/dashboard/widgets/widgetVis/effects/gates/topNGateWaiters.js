define([
  "../../config.js",
  "../../runtime.js"
], function (_config, _visRuntime) {
  "use strict";

  function isDefaultTopNChoice(_value) {
    if (_value == null || _value === "") {
      return true;
    }
    var normalized = String(_value).toLowerCase();
    return normalized === "none" || normalized === "default";
  }

  function waitForTopN(_KDB, _widgetId, _opSeq) {
    var runtime = _visRuntime.ensureWidgetRuntime(_KDB, _widgetId);
    var timeoutMs = _config.bindingPrerequisiteTimeoutMs;
    return new Promise(function (resolve, reject) {
      var entry = { opSeq: _opSeq, resolve: resolve, reject: reject };
      entry.timerId = setTimeout(rejectTimeout.bind(null, runtime, entry), timeoutMs);
      runtime.pendingPromises.topNGate = entry;
    });
  }

  function rejectTimeout(_runtime, _entry) {
    if (_runtime.pendingPromises.topNGate === _entry) {
      _runtime.pendingPromises.topNGate = null;
    }
    _entry.reject({ timedOut: true, kind: "topN" });
  }

  function cancelTopNGateWaiter(_KDB, _widgetId, _opSeq) {
    var runtime = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
      ? _KDB.runtime.widgetVis.byId[_widgetId]
      : null;
    if (!runtime || !runtime.pendingPromises || !runtime.pendingPromises.topNGate) {
      return false;
    }
    var pending = runtime.pendingPromises.topNGate;
    if (pending.opSeq !== _opSeq) {
      return false;
    }
    clearTimeout(pending.timerId);
    runtime.pendingPromises.topNGate = null;
    if (typeof pending.reject === "function") {
      pending.reject({ cancelled: true });
    }
    return true;
  }

  function rejectAllTopNGateWaiters(_KDB) {
    var byId = _KDB && _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
      ? _KDB.runtime.widgetVis.byId
      : {};
    Object.keys(byId).forEach(rejectWaiter.bind(null, byId));
  }

  function rejectWaiter(_byId, _widgetId) {
    var runtime = _byId[_widgetId];
    var pending;
    if (!runtime || !runtime.pendingPromises || !runtime.pendingPromises.topNGate) {
      return;
    }
    pending = runtime.pendingPromises.topNGate;
    clearTimeout(pending.timerId);
    runtime.pendingPromises.topNGate = null;
    if (typeof pending.reject === "function") {
      pending.reject({ destroyed: true, kind: "topN" });
    }
  }

  function resolveTopNGateWaiter(_KDB, _widgetId, _opSeq, _helperTableResult) {
    var runtime = _KDB.runtime && _KDB.runtime.widgetVis && _KDB.runtime.widgetVis.byId
      ? _KDB.runtime.widgetVis.byId[_widgetId]
      : null;
    if (!runtime || !runtime.pendingPromises || !runtime.pendingPromises.topNGate) {
      return false;
    }
    var pending = runtime.pendingPromises.topNGate;
    if (pending.opSeq !== _opSeq) {
      return false;
    }
    clearTimeout(pending.timerId);
    runtime.pendingPromises.topNGate = null;
    pending.resolve(_helperTableResult);
    return true;
  }

  return {
    isDefaultTopNChoice: isDefaultTopNChoice,
    waitForTopN: waitForTopN,
    cancelTopNGateWaiter: cancelTopNGateWaiter,
    rejectAllTopNGateWaiters: rejectAllTopNGateWaiters,
    resolveTopNGateWaiter: resolveTopNGateWaiter
  };
});

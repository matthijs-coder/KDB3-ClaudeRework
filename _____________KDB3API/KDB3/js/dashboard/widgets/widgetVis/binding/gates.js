define([
  "../effects/gates/dienststelleGate.js",
  "../effects/gates/topNGateWaiters.js"
], function (_dienststelleGate, _topNGateWaiters) {
  "use strict";

  function rejectDienststelleWaitersForWidget(_runtimeRoot, _widgetId) {
    var bucket = _runtimeRoot.pendingPromises ? _runtimeRoot.pendingPromises.dienststelleGate : null;
    if (!bucket || !Array.isArray(bucket.waiters)) {
      return 0;
    }
    var remaining = [];
    bucket.waiters.forEach(function (entry) {
      if (entry.widgetId !== _widgetId) {
        remaining.push(entry);
        return;
      }
      clearTimeout(entry.timerId);
      if (typeof entry.reject === "function") {
        entry.reject({ cancelled: true });
      }
    });
    var cancelled = bucket.waiters.length - remaining.length;
    bucket.waiters = remaining;
    return cancelled;
  }

  function cancelGateWaitersForWidget(_KDB, _widgetId) {
    var runtimeRoot = _KDB.runtime && _KDB.runtime.widgetVis ? _KDB.runtime.widgetVis : null;
    var result = { dienststelleCancelled: 0, topNCancelled: false };
    if (!runtimeRoot) {
      return result;
    }
    result.dienststelleCancelled = rejectDienststelleWaitersForWidget(runtimeRoot, _widgetId);
    var widgetRuntime = runtimeRoot.byId ? runtimeRoot.byId[_widgetId] : null;
    var topNPending = widgetRuntime && widgetRuntime.pendingPromises ? widgetRuntime.pendingPromises.topNGate : null;
    if (topNPending) {
      result.topNCancelled = _topNGateWaiters.cancelTopNGateWaiter(_KDB, _widgetId, topNPending.opSeq);
    }
    return result;
  }

  function rejectAllGateWaiters(_KDB) {
    _dienststelleGate.rejectAllDienststelleGateWaiters(_KDB);
    _topNGateWaiters.rejectAllTopNGateWaiters(_KDB);
  }

  return {
    cancelGateWaitersForWidget: cancelGateWaitersForWidget,
    rejectAllGateWaiters: rejectAllGateWaiters
  };
});

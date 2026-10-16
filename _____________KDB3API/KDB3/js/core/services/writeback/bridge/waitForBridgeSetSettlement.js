define(["../set/state/ensureWritebackRuntime.js"], function (_ensureWritebackRuntime) {
  "use strict";

  function isMatchingNotify(_waiter, _meta) {
    var statusKind;
    var restoreStartedAt;
    if (!_waiter || !_meta || typeof _meta !== "object") return false;
    statusKind = _meta.statusKind;
    if (statusKind !== "direct" && statusKind !== "newDashboard") return false;
    restoreStartedAt = _meta.restoreStartedAt;
    if (typeof restoreStartedAt !== "number") return false;
    return restoreStartedAt >= _waiter.changeTime;
  }

  function clearWaiterTimer(_runtime) {
    if (_runtime && _runtime.timers && _runtime.timers.setWait != null) {
      clearTimeout(_runtime.timers.setWait);
      delete _runtime.timers.setWait;
    }
  }

  function settleWaiter(_runtime, _waiter, _payload) {
    if (!_waiter || _waiter.didSettle === true) return;
    _waiter.didSettle = true;
    clearWaiterTimer(_runtime);
    if (_runtime && _runtime.urlShareRestoreWaiter === _waiter) {
      _runtime.urlShareRestoreWaiter = null;
    }
    if (typeof _waiter.resolve === "function") {
      _waiter.resolve(_payload);
    }
  }

  function onWaiterTimeout(_runtime, _waiter) {
    settleWaiter(_runtime, _waiter, { timedOut: true });
  }

  function onWaiterAbort(_runtime, _waiter) {
    settleWaiter(_runtime, _waiter, { aborted: true });
  }

  function armWaiterTimer(_runtime, _waiter, _timeoutMs, _signal, _resolve) {
    var timeoutId;
    _waiter.resolve = _resolve;
    _runtime.urlShareRestoreWaiter = _waiter;
    timeoutId = setTimeout(onWaiterTimeout.bind(null, _runtime, _waiter), _timeoutMs);
    _runtime.timers.setWait = timeoutId;
    if (_signal && _signal.aborted) {
      onWaiterAbort(_runtime, _waiter);
      return;
    }
    if (_signal && typeof _signal.addEventListener === "function") {
      _signal.addEventListener("abort", onWaiterAbort.bind(null, _runtime, _waiter), { once: true });
    }
  }

  function armWaiter(_KDB, _changeTime, _timeoutMs, _signal) {
    var runtime = _ensureWritebackRuntime(_KDB);
    var waiter = { changeTime: _changeTime, didSettle: false, resolve: null };
    var budget = typeof _timeoutMs === "number" ? Math.max(0, _timeoutMs) : 0;
    if (runtime.urlShareRestoreWaiter) {
      settleWaiter(runtime, runtime.urlShareRestoreWaiter, { aborted: true });
    }
    return new Promise(armWaiterTimer.bind(null, runtime, waiter, budget, _signal));
  }

  function notifyBridgeSetSettled(_KDB, _result, _meta) {
    var runtime;
    var waiter;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      waiter = runtime.urlShareRestoreWaiter;
      if (!isMatchingNotify(waiter, _meta)) return;
      settleWaiter(runtime, waiter, { restoreResult: _result });
    } catch (error) {
      console.error("[writebackBridge.notifyBridgeSetSettled] failed", error);
    }
  }

  return {
    armWaiter: armWaiter,
    notifyBridgeSetSettled: notifyBridgeSetSettled
  };
});

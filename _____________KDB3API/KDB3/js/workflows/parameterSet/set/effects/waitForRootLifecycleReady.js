define([
  "../state/ensureWritebackRuntime.js",
  "../../../../core/config/writebackErrorCodes.js",
  "../../../../core/utils/kit/async.js"
], function (_ensureWritebackRuntime, _errorCodes, _async) {
  "use strict";

  var POLL_INTERVAL_MS = 50;
  var READY_TIMEOUT_MS = 180000;

  function readRootLifecycle(_KDB) {
    var root = _KDB && _KDB.state ? _KDB.state.rootLifecycle : null;
    return root && typeof root.lifecycle === "string" ? root.lifecycle : null;
  }

  function readReadyState(_KDB, _run) {
    var lifecycle;
    if (_run.cancelRequested) return "cancelled";
    lifecycle = readRootLifecycle(_KDB);
    if (lifecycle === "ready") return "ready";
    if (lifecycle === "error" || lifecycle === "disposed") return "cancelled";
    return null;
  }

  function cancelReadyWait(_run) {
    _run.addDiagnostic(
      _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED,
      "set",
      "default restore cancelled while waiting for root lifecycle ready"
    );
    return { proceed: false };
  }

  function timeoutReadyWait(_run, _lifecycle) {
    _run.addDiagnostic(
      _errorCodes.codes.WRITEBACK_TIMEOUT,
      "status",
      "default restore gave up waiting for root lifecycle ready",
      { timeoutMs: READY_TIMEOUT_MS, lifecycle: _lifecycle }
    );
    return { proceed: false };
  }

  async function waitForRootLifecycleReady(_KDB, _run) {
    var runtime = _ensureWritebackRuntime(_KDB);
    var controller = new AbortController();
    var outcome;
    runtime.abortControllers.readyWait = controller;
    try {
      outcome = await _async.pollUntil({
        check: readReadyState.bind(null, _KDB, _run),
        intervalMs: POLL_INTERVAL_MS,
        timeoutMs: READY_TIMEOUT_MS,
        signal: controller.signal
      });
      if (outcome.ok && outcome.value === "ready") return { proceed: true };
      if (outcome.reason === "timeout") return timeoutReadyWait(_run, readRootLifecycle(_KDB));
      return cancelReadyWait(_run);
    } finally {
      if (runtime.abortControllers.readyWait === controller) {
        delete runtime.abortControllers.readyWait;
      }
    }
  }

  return waitForRootLifecycleReady;
});

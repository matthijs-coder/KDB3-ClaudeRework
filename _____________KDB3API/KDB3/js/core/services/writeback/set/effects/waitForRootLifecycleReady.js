define([
  "../state/ensureWritebackRuntime.js",
  "../../schema/errorCodes.js"
], function (_ensureWritebackRuntime, _errorCodes) {
  "use strict";

  var TICK_MS = 50;

  function readRootLifecycle(_KDB) {
    var root = _KDB && _KDB.state ? _KDB.state.rootLifecycle : null;
    return root && typeof root.lifecycle === "string" ? root.lifecycle : null;
  }

  function abortReadyTick(_timeoutId, _resolve) {
    clearTimeout(_timeoutId);
    _resolve();
  }

  function startReadyTick(_runtime, _signal, _resolve) {
    var timeoutId = setTimeout(_resolve, TICK_MS);
    _runtime.timers.readyWait = timeoutId;
    if (_signal && typeof _signal.addEventListener === "function") {
      _signal.addEventListener("abort", abortReadyTick.bind(null, timeoutId, _resolve), { once: true });
    }
  }

  function waitReadyTick(_runtime, _signal) {
    if (_signal && _signal.aborted) return Promise.resolve();
    return new Promise(startReadyTick.bind(null, _runtime, _signal));
  }

  function cancelReadyWait(_run) {
    _run.addDiagnostic(
      _errorCodes.codes.WRITEBACK_RESTORE_CANCELLED,
      "set",
      "default restore cancelled while waiting for root lifecycle ready"
    );
    return { proceed: false };
  }

  async function waitForRootLifecycleReady(_KDB, _run) {
    var runtime;
    var controller;
    var lifecycle;
    try {
      runtime = _ensureWritebackRuntime(_KDB);
      controller = new AbortController();
      runtime.abortControllers.readyWait = controller;
      while (true) {
        if (_run.cancelRequested || controller.signal.aborted) {
          return cancelReadyWait(_run);
        }
        lifecycle = readRootLifecycle(_KDB);
        if (lifecycle === "ready") return { proceed: true };
        if (lifecycle === "error" || lifecycle === "disposed") {
          return cancelReadyWait(_run);
        }
        await waitReadyTick(runtime, controller.signal);
        if (controller.signal.aborted) return cancelReadyWait(_run);
      }
    } catch (error) {
      if (error && (error.name === "AbortError" || error.code === "ABORT_ERR")) {
        return cancelReadyWait(_run);
      }
      console.error("[writebackSet.waitForRootLifecycleReady] failed", error);
      throw error;
    } finally {
      if (runtime && runtime.timers && runtime.timers.readyWait != null) {
        clearTimeout(runtime.timers.readyWait);
        delete runtime.timers.readyWait;
      }
      if (runtime && runtime.abortControllers) {
        delete runtime.abortControllers.readyWait;
      }
    }
  }

  return waitForRootLifecycleReady;
});

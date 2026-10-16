define(["../config.js"], function (_config) {
  "use strict";

  var DEFAULT_TIMEOUT_MS = 3000;
  var RETRY_MS = 50;

  function readTimeout(_timeoutMs) {
    var value = Number(_timeoutMs);
    return isFinite(value) && value > 0 ? Math.min(value, 10000) : DEFAULT_TIMEOUT_MS;
  }

  function makeTimeoutError(_lastError) {
    var error = new Error("singleSelect filter inventory readiness timed out" +
      (_lastError ? ": " + String(_lastError.message || _lastError) : ""));
    error.code = _config.errorCodes.RECONCILE_TIMEOUT;
    return error;
  }

  function clearInventoryRetryTimer(_timers, _timerId) {
    if (_timers && _timers.inventoryRetry === _timerId) {
      delete _timers.inventoryRetry;
    }
  }

  function delay(_KDB, _signal) {
    return new Promise(function (_resolve) {
      var runtime = _KDB && _KDB.runtime ? _KDB.runtime.singleSelect : null;
      var timers = runtime && runtime.timers ? runtime.timers : null;
      var timerId = setTimeout(function () {
        clearInventoryRetryTimer(timers, timerId);
        _resolve();
      }, RETRY_MS);
      if (timers) {
        if (timers.inventoryRetry != null) {
          clearTimeout(timers.inventoryRetry);
        }
        timers.inventoryRetry = timerId;
      }
      if (_signal && _signal.aborted) {
        clearTimeout(timerId);
        clearInventoryRetryTimer(timers, timerId);
        _resolve();
        return;
      }
      if (_signal && typeof _signal.addEventListener === "function") {
        _signal.addEventListener("abort", function () {
          clearTimeout(timerId);
          clearInventoryRetryTimer(timers, timerId);
          _resolve();
        }, { once: true });
      }
    });
  }

  async function __controller(_KDB, _enumerate, _timeoutMs, _signal) {
    var deadline = Date.now() + readTimeout(_timeoutMs);
    var lastError = null;
    try {
      while (Date.now() <= deadline) {
        if (_signal && _signal.aborted) { throw new Error("reconcile aborted"); }
        try {
          return _enumerate(_KDB);
        } catch (error) {
          lastError = error;
        }
        await delay(_KDB, _signal);
      }
      throw makeTimeoutError(lastError);
    } catch (error) {
      if (error && error.code === _config.errorCodes.RECONCILE_TIMEOUT) { throw error; }
      if (_signal && _signal.aborted) { throw error; }
      console.error("[singleSelect.waitForFilterInventory] failed", error);
      throw error;
    }
  }

  return __controller;
});

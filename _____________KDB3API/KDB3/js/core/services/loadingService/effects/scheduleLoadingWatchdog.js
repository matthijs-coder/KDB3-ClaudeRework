define(["../runtime/ensureLoadingRuntime.js", "./showLoadingWatchdogDialog.js"], function (_ensureLoadingRuntime, _showLoadingWatchdogDialog) {
  "use strict";

  const DEFAULT_WATCHDOG_MS = 300000;

  function __controller(_KDB, _options) {
    const runtime = _ensureLoadingRuntime(_KDB);
    const mountEl = _options && _options.mountEl;
    const mountKey = _options && _options.mountKey;
    const watchdogMs = Number(_options && _options.watchdogMs);
    const timeoutMs = Number.isFinite(watchdogMs) && watchdogMs > 0 ? watchdogMs : DEFAULT_WATCHDOG_MS;

    clearExistingWatchdog(runtime, mountKey);
    runtime.timers.watchdogsByMountKey[mountKey] = setTimeout(runWatchdogFinish, timeoutMs, _KDB, mountEl, mountKey);
  }

  function clearExistingWatchdog(runtime, mountKey) {
    const timeoutId = runtime.timers.watchdogsByMountKey[mountKey];
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    delete runtime.timers.watchdogsByMountKey[mountKey];
  }

  function runWatchdogFinish(_KDB, mountEl, mountKey) {
    try {
      if (_KDB.services && _KDB.services.loading && typeof _KDB.services.loading.finishLoading === "function") {
        _KDB.services.loading.finishLoading({ mountEl: mountEl, mountKey: mountKey, removeDelayMs: 0 });
      }
    } catch (error) {
      console.error("[loadingService.watchdog] failed", error);
      return;
    }
    if (mountKey === "kdb-root-loading-animation-mount") {
      _showLoadingWatchdogDialog(_KDB);
    }
  }

  return __controller;
});

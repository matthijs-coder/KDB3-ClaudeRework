define(["../../utils/kit/runtime.js", "./config.js", "./state.js"], function (_rt, _config, _state) {
  "use strict";

  function readWatchdogLabel(_KDB, key) {
    var labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.loading : null;
    var value = labels && labels[key];
    return typeof value === "string" ? value : "";
  }

  // The boot overlay is the only one that offers the home dialog. Reading homeDialog's runtime function
  // is transitional (Phase 2 replaces it with a callback registered by homeDialog); keep it in this one place.
  async function presentWatchdog(_KDB) {
    var title = readWatchdogLabel(_KDB, "watchdogTitle");
    var message = readWatchdogLabel(_KDB, "watchdogBody");
    var presentHomeChoice = _KDB.runtime && _KDB.runtime.homeDialog ? _KDB.runtime.homeDialog.presentHomeChoice : null;
    if (!title || !message) {
      console.warn("[loadingService.presentWatchdog] loading watchdog labels are empty");
      return;
    }
    if (typeof presentHomeChoice !== "function") {
      console.warn("[loadingService.presentWatchdog] runtime.homeDialog.presentHomeChoice is missing");
      return;
    }
    try {
      await presentHomeChoice(_KDB, { title: title, message: message, code: "LOADING_WATCHDOG", severity: "warning" });
    } catch (error) {
      console.error("[loadingService.presentWatchdog] failed", error);
    }
  }

  function runWatchdog(_KDB, mountEl, mountKey) {
    var loading = _KDB.services && _KDB.services.loading;
    if (loading && typeof loading.finishLoading === "function") {
      loading.finishLoading({ mountEl: mountEl, mountKey: mountKey, removeDelayMs: 0 });
    }
    if (mountKey === _config.BOOT_MOUNT_KEY) {
      presentWatchdog(_KDB);
    }
  }

  function scheduleLoadingWatchdog(_KDB, options) {
    var runtime = _state.ensureLoadingRuntime(_KDB);
    var watchdogMs = Number(options.watchdogMs);
    var timeoutMs = Number.isFinite(watchdogMs) && watchdogMs > 0 ? watchdogMs : _config.WATCHDOG_MS;
    _rt.scheduleTimeout(runtime.timers.watchdogsByMountKey, options.mountKey, runWatchdog.bind(null, _KDB, options.mountEl, options.mountKey), timeoutMs);
  }

  function clearWatchdog(runtime, mountKey) {
    _rt.clearTimer(runtime.timers.watchdogsByMountKey, mountKey);
  }

  return {
    clearWatchdog: clearWatchdog,
    scheduleLoadingWatchdog: scheduleLoadingWatchdog
  };
});

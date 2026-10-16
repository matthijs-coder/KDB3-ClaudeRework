define(["../../utils/kit/runtime.js", "./config.js", "./state.js"], function (_rt, _config, _state) {
  "use strict";

  function readWatchdogLabel(_KDB, key) {
    var labels = _KDB.config && _KDB.config.labels && _KDB.config.labels.de ? _KDB.config.labels.de.loading : null;
    var value = labels && labels[key];
    return typeof value === "string" ? value : "";
  }

  function logHandlerFailure(error) {
    console.error("[loadingService.presentWatchdog] failed", error);
  }

  // Handlers are owners that want to react when the overlay for their mount key timed out (the boot overlay
  // offers the home dialog). Each gets its own payload copy; failures are logged and never escape the timer.
  function presentWatchdog(_KDB, mountKey) {
    var registrations = (_state.ensureLoadingRuntime(_KDB).watchdogHandlersByMountKey[mountKey] || []).slice();
    var title;
    var message;
    if (!registrations.length) {
      return;
    }
    title = readWatchdogLabel(_KDB, "watchdogTitle");
    message = readWatchdogLabel(_KDB, "watchdogBody");
    if (!title || !message) {
      console.warn("[loadingService.presentWatchdog] loading watchdog labels are empty");
      return;
    }
    registrations.forEach(function (registration) {
      try {
        Promise.resolve(registration.handler({ title: title, message: message, code: "LOADING_WATCHDOG", severity: "warning", mountKey: mountKey })).catch(logHandlerFailure);
      } catch (error) {
        logHandlerFailure(error);
      }
    });
  }

  // Every call is its own registration: the same function registered twice runs twice, and each unregister
  // removes only its own registration.
  function registerWatchdogHandler(_KDB, mountKey, handler) {
    var byMountKey = _state.ensureLoadingRuntime(_KDB).watchdogHandlersByMountKey;
    var registration = { handler: handler };
    if (typeof mountKey !== "string" || !mountKey || typeof handler !== "function") {
      console.warn("[loadingService.registerWatchdogHandler] rejected: a mountKey string and a handler function are required");
      return function noopUnregister() {};
    }
    byMountKey[mountKey] = (byMountKey[mountKey] || []).concat([registration]);
    return function unregisterWatchdogHandler() {
      var remaining = (byMountKey[mountKey] || []).filter(function (candidate) { return candidate !== registration; });
      if (remaining.length) {
        byMountKey[mountKey] = remaining;
      } else {
        delete byMountKey[mountKey];
      }
    };
  }

  function runWatchdog(_KDB, mountEl, mountKey) {
    var loading = _KDB.services && _KDB.services.loading;
    try {
      if (loading && typeof loading.finishLoading === "function") {
        loading.finishLoading({ mountEl: mountEl, mountKey: mountKey, removeDelayMs: 0 });
      }
    } catch (error) {
      console.error("[loadingService.runWatchdog] failed", { mountKey: mountKey }, error);
      return;
    }
    presentWatchdog(_KDB, mountKey);
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
    registerWatchdogHandler: registerWatchdogHandler,
    scheduleLoadingWatchdog: scheduleLoadingWatchdog
  };
});

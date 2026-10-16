define([
  "../runtime/ensureLoadingRuntime.js",
  "../state/markLoadingFinished.js",
  "./scheduleOverlayRemoval.js",
], function (_ensureLoadingRuntime, _markLoadingFinished, _scheduleOverlayRemoval) {
  "use strict";

  function __controller(_KDB, _options) {
    try {
      if (!_KDB || typeof _KDB !== "object") {
        return;
      }

      const runtime = _ensureLoadingRuntime(_KDB);
      const mountEl = resolveFinishMountElement(_KDB, _options, runtime);
      if (!mountEl) {
        if (_options && (_options.mountKey || (_options.handle && _options.handle.mountKey))) {
          const key = resolveFinishMountKey(null, _options);
          const entry = _markLoadingFinished(_KDB, key);
          if (entry.activeCount === 0) {
            clearWatchdog(runtime, key);
          }
          return;
        }
        return;
      }

      const mountKey = resolveFinishMountKey(mountEl, _options);
      const entry = _markLoadingFinished(_KDB, mountKey);
      const removeDelayMs = _options && _options.removeDelayMs;

      if (entry.activeCount > 0) {
        return;
      }

      clearWatchdog(runtime, mountKey);
      _scheduleOverlayRemoval(_KDB, { mountEl: mountEl, mountKey: mountKey, removeDelayMs: removeDelayMs });
    } catch (error) {
      console.error("[loadingService.removeLoadingOverlay] failed", error);
    }
  }

  function resolveFinishMountElement(_KDB, _options, runtime) {
    if (_options && _options.mountEl && _options.mountEl.nodeType === 1) {
      return _options.mountEl;
    }
    if (_options && _options.handle && _options.handle.mountEl && _options.handle.mountEl.nodeType === 1) {
      return _options.handle.mountEl;
    }
    if (_options && _options.handle && _options.handle.mountKey) {
      return runtime.domRefs.mountsByMountKey[_options.handle.mountKey] || null;
    }
    if (_options && _options.mountKey) {
      return runtime.domRefs.mountsByMountKey[_options.mountKey] || null;
    }
    return (_KDB.elements && _KDB.elements.kdbWidget) || null;
  }

  function resolveFinishMountKey(_mountEl, _options) {
    if (_options && _options.mountKey) {
      return _options.mountKey;
    }
    if (_options && _options.handle && _options.handle.mountKey) {
      return _options.handle.mountKey;
    }
    if (_mountEl && typeof _mountEl.id === "string" && _mountEl.id.length > 0) {
      return _mountEl.id;
    }
    return "kdb-root-loading";
  }

  function clearWatchdog(runtime, mountKey) {
    const timeoutId = runtime.timers.watchdogsByMountKey[mountKey];
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    delete runtime.timers.watchdogsByMountKey[mountKey];
  }

  return __controller;
});

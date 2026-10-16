define([
  "../runtime/ensureLoadingRuntime.js",
  "./applyOverlayRemovalSnapshot.js"
], function (_ensureLoadingRuntime, _applyOverlayRemovalSnapshot) {
  "use strict";

  const DEFAULT_REMOVE_DELAY_MS = 0;

  function __controller(_KDB, _options) {
    try {
      const runtime = _ensureLoadingRuntime(_KDB);
      const mountEl = _options && _options.mountEl;
      const mountKey = _options && _options.mountKey;
      const removeDelayMs = Number(_options && _options.removeDelayMs);
      const delayMs = Number.isFinite(removeDelayMs) && removeDelayMs >= 0 ? removeDelayMs : DEFAULT_REMOVE_DELAY_MS;
      const existingSnapshot = runtime.domRefs.pendingRemovalByMountKey[mountKey];

      if (existingSnapshot && existingSnapshot.mountEl !== mountEl) {
        _applyOverlayRemovalSnapshot(_KDB, mountKey);
      }
      clearExistingRemoval(runtime, mountKey);
      const liveMatches = runtime.domRefs.mountsByMountKey[mountKey] === mountEl;
      runtime.domRefs.pendingRemovalByMountKey[mountKey] = {
        mountEl: mountEl,
        spinnerEl: liveMatches ? (runtime.domRefs.spinnersByMountKey[mountKey] || null) : null,
        hadPositionOverride: liveMatches && Object.prototype.hasOwnProperty.call(runtime.domRefs.positionOverridesByMountKey, mountKey),
        originalPosition: liveMatches ? runtime.domRefs.positionOverridesByMountKey[mountKey] : undefined
      };
      runtime.timers.removeDelaysByMountKey[mountKey] = setTimeout(runRemoveOverlayTimeout, delayMs, _KDB, mountKey);
    } catch (error) {
      console.error("[loadingService.scheduleOverlayRemoval] failed", error);
    }
  }

  function clearExistingRemoval(runtime, mountKey) {
    const timeoutId = runtime.timers.removeDelaysByMountKey[mountKey];
    if (!timeoutId) {
      return;
    }
    clearTimeout(timeoutId);
    delete runtime.timers.removeDelaysByMountKey[mountKey];
  }

  function runRemoveOverlayTimeout(_KDB, mountKey) {
    try {
      _applyOverlayRemovalSnapshot(_KDB, mountKey);
    } catch (error) {
      console.error("[loadingService.removeOverlay] failed", error);
    }
  }

  return __controller;
});

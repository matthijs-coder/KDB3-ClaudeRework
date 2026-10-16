define(["./ensureLoadingRuntime.js"], function (_ensureLoadingRuntime) {
  "use strict";

  function __controller(_KDB) {
    try {
      const runtime = _ensureLoadingRuntime(_KDB);
      const timers = runtime.timers;
      const domRefs = runtime.domRefs;
      const spinnerKeys = Object.keys(domRefs.spinnersByMountKey);
      const mountKeys = Object.keys(domRefs.mountsByMountKey);
      const pendingKeys = Object.keys(domRefs.pendingRemovalByMountKey);
      let index;

      clearTimerMap(timers.watchdogsByMountKey);
      clearTimerMap(timers.removeDelaysByMountKey);
      for (index = 0; index < pendingKeys.length; index += 1) {
        const snapshot = domRefs.pendingRemovalByMountKey[pendingKeys[index]];
        removeSpinner(snapshot.spinnerEl);
        restoreMount(snapshot.mountEl, snapshot.hadPositionOverride === true ? snapshot.originalPosition : undefined);
      }
      for (index = 0; index < spinnerKeys.length; index += 1) {
        removeSpinner(domRefs.spinnersByMountKey[spinnerKeys[index]]);
      }
      for (index = 0; index < mountKeys.length; index += 1) {
        restoreMount(domRefs.mountsByMountKey[mountKeys[index]], domRefs.positionOverridesByMountKey[mountKeys[index]]);
      }

      runtime.timers.watchdogsByMountKey = {};
      runtime.timers.removeDelaysByMountKey = {};
      runtime.domRefs.mountsByMountKey = {};
      runtime.domRefs.spinnersByMountKey = {};
      runtime.domRefs.positionOverridesByMountKey = {};
      runtime.domRefs.pendingRemovalByMountKey = {};
    } catch (error) {
      console.error("[loadingService.clearLoadingRuntime] failed", error);
      throw error;
    }
  }

  function clearTimerMap(timerMap) {
    const mountKeys = Object.keys(timerMap);
    let index;

    for (index = 0; index < mountKeys.length; index += 1) {
      clearTimeout(timerMap[mountKeys[index]]);
      delete timerMap[mountKeys[index]];
    }
  }

  function removeSpinner(spinnerEl) {
    if (spinnerEl && spinnerEl.parentNode) {
      spinnerEl.parentNode.removeChild(spinnerEl);
    }
  }

  function restoreMount(mountEl, originalPosition) {
    if (!mountEl || !mountEl.classList) {
      return;
    }
    mountEl.classList.remove("KDB_loading");
    if (typeof originalPosition === "string") {
      mountEl.style.position = originalPosition;
    }
  }

  return __controller;
});

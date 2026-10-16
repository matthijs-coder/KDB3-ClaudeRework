define(["./schedulePopupDisplayResync.js"], function (_schedulePopupDisplayResync) {
  "use strict";

  function clearResyncTimer(_runtime) {
    var handle = _runtime && _runtime.timers ? _runtime.timers.popupDisplayResync : null;
    if (handle == null) {
      return;
    }
    if (typeof handle === "number") {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(handle);
      } else {
        clearTimeout(handle);
      }
    }
    delete _runtime.timers.popupDisplayResync;
  }

  function clearConfirmTimer(_runtime) {
    if (_schedulePopupDisplayResync && _schedulePopupDisplayResync.clearConfirmLadder) {
      _schedulePopupDisplayResync.clearConfirmLadder(_runtime);
      return;
    }
    var handle = _runtime && _runtime.timers ? _runtime.timers.popupDisplayResyncConfirm : null;
    if (handle == null) {
      return;
    }
    clearTimeout(handle);
    delete _runtime.timers.popupDisplayResyncConfirm;
  }

  function disconnectObserver(_runtime) {
    var observer = _runtime && _runtime.observers ? _runtime.observers.popupDisplayResync : null;
    if (observer && typeof observer.disconnect === "function") {
      observer.disconnect();
    }
    if (_runtime && _runtime.observers) {
      _runtime.observers.popupDisplayResync = null;
    }
  }

  function __controller(_runtime) {
    if (!_runtime) {
      return;
    }
    try {
      _runtime.timers = _runtime.timers || {};
      clearResyncTimer(_runtime);
      clearConfirmTimer(_runtime);
      disconnectObserver(_runtime);
      delete _runtime.popupDisplayResyncPendingOptions;
      delete _runtime.popupDisplayResyncSession;
    } catch (_error) {
      /* idempotent; no throw */
    }
  }

  __controller.clearResyncTimer = clearResyncTimer;
  __controller.clearConfirmTimer = clearConfirmTimer;

  return __controller;
});

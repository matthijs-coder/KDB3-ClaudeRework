define(["./ensureMessageRuntime.js"], function (_ensureMessageRuntime) {
  "use strict";

  function clearTimers(timers) {
    var keys = Object.keys(timers);
    var index;
    for (index = 0; index < keys.length; index += 1) {
      clearTimeout(timers[keys[index]]);
    }
  }

  function removeListeners(listeners) {
    var index;
    var record;
    for (index = 0; index < listeners.length; index += 1) {
      record = listeners[index];
      if (record && record.target && typeof record.target.removeEventListener === "function") {
        record.target.removeEventListener(record.type, record.handler, record.options);
      }
    }
  }

  function disconnectObservers(observers) {
    var index;
    for (index = 0; index < observers.length; index += 1) {
      if (observers[index] && typeof observers[index].disconnect === "function") {
        observers[index].disconnect();
      }
    }
  }

  function removePortal(portalEl) {
    if (portalEl && portalEl.parentNode) {
      portalEl.parentNode.removeChild(portalEl);
    }
  }

  function __controller(_KDB) {
    var runtime = _ensureMessageRuntime(_KDB);
    clearTimers(runtime.timers);
    removeListeners(runtime.listeners);
    disconnectObservers(runtime.observers);
    removePortal(runtime.domRefs.portalEl);
    _KDB.runtime.messageService = {
      domRefs: { anchoredNotifications: [], globalNotifications: [], nextNotificationId: 1, portalEl: null },
      listeners: [],
      observers: [],
      pendingPromises: {},
      queues: { activeModalRequest: null, modalRequests: [], nextRequestId: 1 },
      timers: {}
    };
  }

  return __controller;
});

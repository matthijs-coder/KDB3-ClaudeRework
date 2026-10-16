define([], function () {
  "use strict";

  function __controller(_KDB) {
    var runtime;
    _KDB.runtime = _KDB.runtime || {};
    _KDB.runtime.messageService = _KDB.runtime.messageService || {};
    runtime = _KDB.runtime.messageService;
    runtime.domRefs = runtime.domRefs || {};
    runtime.listeners = runtime.listeners || [];
    runtime.observers = runtime.observers || [];
    runtime.pendingPromises = runtime.pendingPromises || {};
    runtime.queues = runtime.queues || {};
    runtime.timers = runtime.timers || {};
    runtime.domRefs.anchoredNotifications = runtime.domRefs.anchoredNotifications || [];
    runtime.domRefs.globalNotifications = runtime.domRefs.globalNotifications || [];
    runtime.domRefs.nextNotificationId = runtime.domRefs.nextNotificationId || 1;
    runtime.domRefs.portalEl = runtime.domRefs.portalEl || null;
    runtime.queues.activeModalRequest = runtime.queues.activeModalRequest || null;
    runtime.queues.modalRequests = runtime.queues.modalRequests || [];
    runtime.queues.nextRequestId = runtime.queues.nextRequestId || 1;
    return runtime;
  }

  return __controller;
});

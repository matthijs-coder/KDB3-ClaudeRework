define([
  "./createAnchoredNotification.js",
  "./createMessageRoot.js",
  "./positionGlobalNotification.js"
], function (_createAnchoredNotification, _createMessageRoot, _positionGlobalNotification) {
  "use strict";

  function registerListener(runtime, record, target, type, handler, options) {
    var listener = { target: target, type: type, handler: handler, options: options };
    target.addEventListener(type, handler, options);
    runtime.listeners.push(listener);
    record.listeners.push(listener);
  }

  function removeListenerRecord(runtime, listener) {
    var index = runtime.listeners.indexOf(listener);
    listener.target.removeEventListener(listener.type, listener.handler, listener.options);
    if (index >= 0) runtime.listeners.splice(index, 1);
  }

  function readCenterBox(_KDB) {
    var selector = _KDB.elements.selectors.root.dashboardFrame;
    var frameEl;
    var rect;
    if (typeof selector === "string" && selector) {
      frameEl = document.querySelector(selector);
      if (frameEl && frameEl.isConnected === true) {
        rect = frameEl.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
    }
    return { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  }

  function removeNotification(_KDB, record) {
    var runtime = _KDB.runtime.messageService;
    var index;
    var recordIndex = runtime.domRefs.globalNotifications.indexOf(record);
    clearTimeout(runtime.timers[record.id]);
    delete runtime.timers[record.id];
    for (index = 0; index < record.listeners.length; index += 1) {
      removeListenerRecord(runtime, record.listeners[index]);
    }
    record.listeners = [];
    if (record.notificationEl.parentNode) record.notificationEl.parentNode.removeChild(record.notificationEl);
    if (recordIndex >= 0) runtime.domRefs.globalNotifications.splice(recordIndex, 1);
    repositionAll(_KDB);
  }

  function repositionAll(_KDB) {
    var runtime = _KDB.runtime.messageService;
    var records = runtime.domRefs.globalNotifications;
    var box = readCenterBox(_KDB);
    var index;
    for (index = 0; index < records.length; index += 1) {
      _positionGlobalNotification(runtime, records[index], box);
    }
  }

  function handleClose(_KDB, record) {
    removeNotification(_KDB, record);
  }

  function __controller(_KDB, _options) {
    var runtime;
    var options;
    var portalEl;
    var record;
    var closeButton;
    var durationMs;
    var didAppend = false;
    try {
      runtime = _KDB.runtime.messageService;
      if (!runtime) return null;
      options = _options || {};
      portalEl = _createMessageRoot(_KDB);
      record = {
        id: "message-notification-" + runtime.domRefs.nextNotificationId,
        listeners: [],
        notificationEl: _createAnchoredNotification(portalEl.ownerDocument, options)
      };
      runtime.domRefs.nextNotificationId += 1;
      portalEl.appendChild(record.notificationEl);
      runtime.domRefs.globalNotifications.push(record);
      didAppend = true;
      closeButton = record.notificationEl.querySelector(".kdb-message-notification__close");
      if (closeButton) registerListener(runtime, record, closeButton, "click", handleClose.bind(null, _KDB, record), false);
      registerListener(runtime, record, window, "resize", repositionAll.bind(null, _KDB), false);
      registerListener(runtime, record, window, "scroll", repositionAll.bind(null, _KDB), true);
      repositionAll(_KDB);
      if (!_positionGlobalNotification(runtime, record, readCenterBox(_KDB))) {
        removeNotification(_KDB, record);
        return null;
      }
      durationMs = isFinite(options.durationMs) ? Math.max(0, Number(options.durationMs)) : 15000;
      if (durationMs > 0) runtime.timers[record.id] = setTimeout(handleClose.bind(null, _KDB, record), durationMs);
      return record.id;
    } catch (err) {
      console.error("[messageService.renderGlobalNotification] failed", err);
      if (didAppend) removeNotification(_KDB, record);
      return null;
    }
  }

  return __controller;
});

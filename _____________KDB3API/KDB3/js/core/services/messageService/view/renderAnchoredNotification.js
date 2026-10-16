define([
  "./createAnchoredNotification.js",
  "./createMessageRoot.js",
  "./positionAnchoredNotification.js"
], function (_createAnchoredNotification, _createMessageRoot, _positionAnchoredNotification) {
  "use strict";

  function findDuplicate(records, dedupeKey, anchor) {
    var index;
    if (!dedupeKey) return null;
    for (index = 0; index < records.length; index += 1) {
      if (records[index].anchor === anchor && records[index].dedupeKey === dedupeKey) {
        return records[index];
      }
    }
    return null;
  }

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

  function removeNotification(runtime, record) {
    var index;
    var recordIndex = runtime.domRefs.anchoredNotifications.indexOf(record);
    var observerIndex = runtime.observers.indexOf(record.observer);
    clearTimeout(runtime.timers[record.id]);
    delete runtime.timers[record.id];
    if (record.observer) record.observer.disconnect();
    if (observerIndex >= 0) runtime.observers.splice(observerIndex, 1);
    for (index = 0; index < record.listeners.length; index += 1) {
      removeListenerRecord(runtime, record.listeners[index]);
    }
    record.listeners = [];
    if (record.notificationEl.parentNode) record.notificationEl.parentNode.removeChild(record.notificationEl);
    if (recordIndex >= 0) runtime.domRefs.anchoredNotifications.splice(recordIndex, 1);
    repositionAll(runtime, record.anchor);
  }

  function repositionAll(runtime, anchor) {
    var records = runtime.domRefs.anchoredNotifications;
    var index;
    for (index = 0; index < records.length; index += 1) {
      if (records[index].anchor === anchor) _positionAnchoredNotification(runtime, records[index]);
    }
  }

  function handleClose(runtime, record) {
    removeNotification(runtime, record);
  }

  function handlePosition(runtime, record, fallbackNotify) {
    if (_positionAnchoredNotification(runtime, record)) return true;
    removeNotification(runtime, record);
    if (!record.didFallback) {
      record.didFallback = true;
      fallbackNotify(record.options);
    }
    return false;
  }

  function registerAnchorObserver(runtime, record, fallbackNotify) {
    var Observer = typeof MutationObserver === "function" ? MutationObserver : null;
    if (!Observer) return;
    record.observer = new Observer(handlePosition.bind(null, runtime, record, fallbackNotify));
    record.observer.observe(record.anchor.ownerDocument.documentElement, { childList: true, subtree: true });
    runtime.observers.push(record.observer);
  }

  function __controller(_KDB, _options, _fallbackNotify) {
    var runtime = _KDB.runtime.messageService;
    var options = _options || {};
    var dedupeKey = options.dedupeKey || options.code || null;
    var portalEl;
    var record;
    var closeButton;
    var durationMs;
    if (!options.anchor || options.anchor.isConnected !== true) {
      _fallbackNotify(options);
      return null;
    }
    if (findDuplicate(runtime.domRefs.anchoredNotifications, dedupeKey, options.anchor)) return null;
    portalEl = _createMessageRoot(_KDB);
    record = {
      anchor: options.anchor,
      dedupeKey: dedupeKey,
      didFallback: false,
      id: "message-notification-" + runtime.domRefs.nextNotificationId,
      listeners: [],
      notificationEl: _createAnchoredNotification(portalEl.ownerDocument, options),
      observer: null,
      options: options
    };
    runtime.domRefs.nextNotificationId += 1;
    portalEl.appendChild(record.notificationEl);
    runtime.domRefs.anchoredNotifications.push(record);
    closeButton = record.notificationEl.querySelector(".kdb-message-notification__close");
    if (closeButton) registerListener(runtime, record, closeButton, "click", handleClose.bind(null, runtime, record), false);
    registerListener(runtime, record, window, "resize", handlePosition.bind(null, runtime, record, _fallbackNotify), false);
    registerListener(runtime, record, window, "scroll", handlePosition.bind(null, runtime, record, _fallbackNotify), true);
    registerAnchorObserver(runtime, record, _fallbackNotify);
    if (!handlePosition(runtime, record, _fallbackNotify)) return null;
    durationMs = isFinite(options.durationMs) ? Math.max(0, Number(options.durationMs)) : 5000;
    if (durationMs > 0) runtime.timers[record.id] = setTimeout(handleClose.bind(null, runtime, record), durationMs);
    return record.id;
  }

  return __controller;
});

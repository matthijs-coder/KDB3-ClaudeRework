define([
  "../../utils/kit/errors.js",
  "../../utils/kit/runtime.js",
  "./config.js",
  "./runtime.js"
], function (_errors, _rt, _config, _runtime) {
  "use strict";

  function normalizeSeverity(value) {
    return value === "success" || value === "warning" || value === "error" ? value : "info";
  }

  function readDurationMs(options, defaultMs) {
    return isFinite(options.durationMs) ? Math.max(0, Number(options.durationMs)) : defaultMs;
  }

  function createNotificationElement(ownerDocument, options) {
    var severity = normalizeSeverity(options.severity);
    var notificationEl = ownerDocument.createElement("div");
    var messageEl = ownerDocument.createElement("div");
    var closeButton;
    notificationEl.className = "kdb-message-notification kdb-message-notification--" + severity;
    notificationEl.setAttribute("role", severity === "error" ? "alert" : "status");
    notificationEl.setAttribute("aria-live", severity === "error" ? "assertive" : "polite");
    notificationEl.setAttribute("aria-atomic", "true");
    messageEl.className = "kdb-message-notification__text";
    messageEl.textContent = String(options.message || "");
    notificationEl.appendChild(messageEl);
    if (options.dismissible !== false) {
      closeButton = ownerDocument.createElement("button");
      closeButton.type = "button";
      closeButton.className = "kdb-message-notification__close";
      closeButton.setAttribute("aria-label", options.closeLabel || _config.messageLabels.close);
      closeButton.textContent = "×";
      notificationEl.appendChild(closeButton);
    }
    if (isFinite(options.maxWidthPx)) {
      notificationEl.style.maxWidth = Math.max(160, Number(options.maxWidthPx)) + "px";
    }
    return notificationEl;
  }

  // Notifications of one stack share an anchor (global ones have none), so one function serves both lists.
  function readStackOffset(records, record) {
    var offset = 0;
    var index;
    for (index = 0; index < records.length; index += 1) {
      if (records[index] === record) {
        return offset;
      }
      if (records[index].anchor === record.anchor) {
        offset += records[index].notificationEl.offsetHeight + _config.STACK_GAP_PX;
      }
    }
    return offset;
  }

  function readAnchoredOffset(options) {
    var offset = options.offset;
    if (typeof offset === "number") {
      return { x: 0, y: offset };
    }
    return {
      x: offset && isFinite(offset.x) ? Number(offset.x) : 0,
      y: offset && isFinite(offset.y) ? Number(offset.y) : _config.STACK_GAP_PX
    };
  }

  function resolveAnchoredLeft(rect, width, align) {
    if (align === "start") {
      return rect.left;
    }
    if (align === "end") {
      return rect.right - width;
    }
    return rect.left + ((rect.width - width) / 2);
  }

  function positionAnchored(runtime, record) {
    var notificationEl = record.notificationEl;
    var rect;
    var offset;
    var left;
    var top;
    if (!record.anchor || record.anchor.isConnected !== true || !notificationEl) {
      return false;
    }
    rect = record.anchor.getBoundingClientRect();
    offset = readAnchoredOffset(record.options);
    left = resolveAnchoredLeft(rect, notificationEl.offsetWidth, record.options.align || "center") + offset.x;
    top = rect.bottom + offset.y + readStackOffset(runtime.domRefs.anchoredNotifications, record);
    left = Math.max(8, Math.min(left, window.innerWidth - notificationEl.offsetWidth - 8));
    notificationEl.style.left = Math.round(left) + "px";
    notificationEl.style.top = Math.round(top) + "px";
    return true;
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

  function positionGlobal(runtime, record, box) {
    var notificationEl = record && record.notificationEl;
    var width;
    var height;
    var left;
    var top;
    if (!notificationEl) {
      return false;
    }
    if (!box || !isFinite(box.left) || !isFinite(box.top) || !isFinite(box.width) || !isFinite(box.height)) {
      return false;
    }
    width = notificationEl.offsetWidth;
    height = notificationEl.offsetHeight;
    left = box.left + ((box.width - width) / 2);
    top = box.top + _config.STACK_GAP_PX + readStackOffset(runtime.domRefs.globalNotifications, record);
    left = Math.max(box.left + 8, Math.min(left, box.left + box.width - width - 8));
    top = Math.max(box.top + 8, Math.min(top, box.top + box.height - height - 8));
    notificationEl.style.left = Math.round(left) + "px";
    notificationEl.style.top = Math.round(top) + "px";
    return true;
  }

  function repositionGlobal(_KDB) {
    var runtime = _KDB.runtime.messageService;
    var records = runtime.domRefs.globalNotifications;
    var box = readCenterBox(_KDB);
    var index;
    for (index = 0; index < records.length; index += 1) {
      positionGlobal(runtime, records[index], box);
    }
  }

  function repositionAnchorStack(runtime, anchor) {
    runtime.domRefs.anchoredNotifications.forEach(function (record) {
      if (record.anchor === anchor) {
        positionAnchored(runtime, record);
      }
    });
  }

  // One resize + one scroll listener and one document observer serve every open notification.
  // Events only schedule a frame; the frame repositions everything once.
  function removeWindowListener(listeners, key) {
    var record = listeners[key];
    if (record) {
      record.target.removeEventListener(record.type, record.handler, record.options);
      delete listeners[key];
    }
  }

  function attachRepositionWatchers(_KDB, anchorDocument) {
    var runtime = _KDB.runtime.messageService;
    var schedule = scheduleReposition.bind(null, _KDB);
    var observer;
    if (!runtime.listeners.windowResize) {
      _rt.addListener(runtime.listeners, "windowResize", window, "resize", schedule, false);
      _rt.addListener(runtime.listeners, "windowScroll", window, "scroll", schedule, true);
    }
    if (!anchorDocument || typeof MutationObserver !== "function") {
      return;
    }
    runtime.observers.reposition = runtime.observers.reposition || [];
    if (runtime.observers.reposition.some(function (entry) { return entry.observedDocument === anchorDocument; })) {
      return;
    }
    observer = new MutationObserver(schedule);
    observer.observedDocument = anchorDocument;
    observer.observe(anchorDocument.documentElement, { childList: true, subtree: true });
    runtime.observers.reposition.push(observer);
  }

  // One observer per anchor document; an observer goes when no open anchored toast lives in its document.
  function releaseIdleObservers(runtime) {
    var anchored = runtime.domRefs.anchoredNotifications;
    var observers = runtime.observers.reposition || [];
    runtime.observers.reposition = observers.filter(function (observer) {
      var isUsed = anchored.some(function (record) { return record.anchor.ownerDocument === observer.observedDocument; });
      if (!isUsed) {
        observer.disconnect();
      }
      return isUsed;
    });
    if (runtime.observers.reposition.length === 0) {
      delete runtime.observers.reposition;
    }
  }

  function releaseIdleWatchers(_KDB) {
    var runtime = _KDB.runtime.messageService;
    var hasAnchored = runtime.domRefs.anchoredNotifications.length > 0;
    var hasGlobal = runtime.domRefs.globalNotifications.length > 0;
    if (runtime.observers.reposition) {
      releaseIdleObservers(runtime);
    }
    if (!hasAnchored && !hasGlobal) {
      removeWindowListener(runtime.listeners, "windowResize");
      removeWindowListener(runtime.listeners, "windowScroll");
      _rt.clearTimer(runtime.timers, "reposition");
    }
  }

  function scheduleReposition(_KDB) {
    var runtime = _KDB.runtime.messageService;
    if (!runtime.timers.reposition) {
      _rt.scheduleFrame(runtime.timers, "reposition", repositionAll.bind(null, _KDB));
    }
  }

  function repositionAll(_KDB) {
    var runtime = _KDB.runtime.messageService;
    try {
      repositionGlobal(_KDB);
      runtime.domRefs.anchoredNotifications.slice().forEach(function (record) {
        repositionAnchored(_KDB, record);
      });
    } catch (error) {
      console.error("[messageService.repositionAll] failed", error);
    }
  }

  function removeNotification(_KDB, record) {
    var runtime = _KDB.runtime.messageService;
    var list = record.anchor ? runtime.domRefs.anchoredNotifications : runtime.domRefs.globalNotifications;
    var index = list.indexOf(record);
    if (record.isClosed) {
      return;
    }
    record.isClosed = true;
    _rt.clearTimer(runtime.timers, record.id);
    if (record.notificationEl.parentNode) {
      record.notificationEl.parentNode.removeChild(record.notificationEl);
    }
    if (index >= 0) {
      list.splice(index, 1);
    }
    if (record.anchor) {
      repositionAnchorStack(runtime, record.anchor);
    } else {
      repositionGlobal(_KDB);
    }
    releaseIdleWatchers(_KDB);
  }

  // An anchor that left the DOM moves its notification to the global position, once.
  function repositionAnchored(_KDB, record) {
    var runtime = _KDB.runtime.messageService;
    if (record.isClosed || positionAnchored(runtime, record)) {
      return true;
    }
    removeNotification(_KDB, record);
    if (!record.didFallback) {
      record.didFallback = true;
      record.fallbackNotify(record.options);
    }
    return false;
  }

  // Close button and auto-close timer call this; a failure must not leave the toast half removed.
  function closeNotification(_KDB, record) {
    try {
      removeNotification(_KDB, record);
    } catch (error) {
      console.error("[messageService.closeNotification] failed", error);
    }
  }

  function openNotification(_KDB, options, list, extra) {
    var runtime = _KDB.runtime.messageService;
    var portalEl = _runtime.ensureMessageRoot(_KDB);
    var record = Object.assign({
      id: "message-notification-" + runtime.domRefs.nextNotificationId,
      isClosed: false,
      notificationEl: createNotificationElement(portalEl.ownerDocument, options)
    }, extra);
    var closeButton;
    runtime.domRefs.nextNotificationId += 1;
    portalEl.appendChild(record.notificationEl);
    list.push(record);
    closeButton = record.notificationEl.querySelector(".kdb-message-notification__close");
    if (closeButton) {
      closeButton.addEventListener("click", closeNotification.bind(null, _KDB, record), false);
    }
    return record;
  }

  function scheduleClose(_KDB, record, durationMs) {
    if (durationMs > 0) {
      _rt.scheduleTimeout(_KDB.runtime.messageService.timers, record.id, closeNotification.bind(null, _KDB, record), durationMs);
    }
  }

  function findDuplicate(records, dedupeKey, anchor) {
    var index;
    if (!dedupeKey) {
      return null;
    }
    for (index = 0; index < records.length; index += 1) {
      if (records[index].anchor === anchor && records[index].dedupeKey === dedupeKey) {
        return records[index];
      }
    }
    return null;
  }

  function renderGlobalNotification(_KDB, options) {
    var runtime = _KDB.runtime.messageService;
    var record = null;
    if (!runtime) {
      return null;
    }
    try {
      record = openNotification(_KDB, options, runtime.domRefs.globalNotifications, {});
      attachRepositionWatchers(_KDB, null);
      repositionGlobal(_KDB);
      if (!positionGlobal(runtime, record, readCenterBox(_KDB))) {
        removeNotification(_KDB, record);
        return null;
      }
      scheduleClose(_KDB, record, readDurationMs(options, _config.GLOBAL_DURATION_MS));
      return record.id;
    } catch (error) {
      console.error("[messageService.renderGlobalNotification] failed", error);
      if (record) {
        removeNotification(_KDB, record);
      }
      return null;
    }
  }

  function renderAnchoredNotification(_KDB, _options, fallbackNotify) {
    var runtime = _KDB.runtime.messageService;
    var options = _options || {};
    var dedupeKey = options.dedupeKey || options.code || null;
    var record;
    if (!options.anchor || options.anchor.isConnected !== true) {
      fallbackNotify(options);
      return null;
    }
    if (findDuplicate(runtime.domRefs.anchoredNotifications, dedupeKey, options.anchor)) {
      return null;
    }
    record = openNotification(_KDB, options, runtime.domRefs.anchoredNotifications, {
      anchor: options.anchor,
      dedupeKey: dedupeKey,
      didFallback: false,
      fallbackNotify: fallbackNotify,
      options: options
    });
    attachRepositionWatchers(_KDB, options.anchor.ownerDocument);
    if (!repositionAnchored(_KDB, record)) {
      return null;
    }
    scheduleClose(_KDB, record, readDurationMs(options, _config.ANCHORED_DURATION_MS));
    return record.id;
  }

  // Facet toast: transport only. Resolves with the facet outcome; the caller must not leave a rejection unhandled.
  function showGlassToast(_KDB, options) {
    var runtime = _KDB && _KDB.runtime ? _KDB.runtime.messageService : null;
    var messagesFacet = runtime && runtime.messagesFacet;
    if (!messagesFacet || typeof messagesFacet.showToast !== "function") {
      throw _errors.codedError("MESSAGE_GLASS_TOAST_UNAVAILABLE");
    }
    return Promise.resolve(messagesFacet.showToast(String(options.message || ""), options.severity || "info"));
  }

  function isInfoSeverity(severity) {
    return severity == null || severity === "" || severity === "info";
  }

  function presentNotify(_KDB, _options) {
    var options = _options || {};
    var id;
    if (!isInfoSeverity(options.severity)) {
      return showGlassToast(_KDB, options);
    }
    id = renderGlobalNotification(_KDB, options);
    if (typeof id === "string" && id !== "") {
      return id;
    }
    return showGlassToast(_KDB, options);
  }

  return {
    presentNotify: presentNotify,
    renderAnchoredNotification: renderAnchoredNotification
  };
});

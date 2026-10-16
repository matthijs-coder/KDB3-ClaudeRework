define([], function () {
  "use strict";

  function readOffset(options) {
    var offset = options.offset;
    if (typeof offset === "number") {
      return { x: 0, y: offset };
    }
    return {
      x: offset && isFinite(offset.x) ? Number(offset.x) : 0,
      y: offset && isFinite(offset.y) ? Number(offset.y) : 8
    };
  }

  function readStackOffset(records, record) {
    var index;
    var stackOffset = 0;
    for (index = 0; index < records.length; index += 1) {
      if (records[index] === record) {
        return stackOffset;
      }
      if (records[index].anchor === record.anchor) {
        stackOffset += records[index].notificationEl.offsetHeight + 8;
      }
    }
    return stackOffset;
  }

  function resolveLeft(rect, width, align) {
    if (align === "start") {
      return rect.left;
    }
    if (align === "end") {
      return rect.right - width;
    }
    return rect.left + ((rect.width - width) / 2);
  }

  function __controller(_runtime, _record) {
    var anchor = _record.anchor;
    var notificationEl = _record.notificationEl;
    var options = _record.options;
    var rect;
    var offset;
    var stackOffset;
    var left;
    var top;
    if (!anchor || anchor.isConnected !== true || !notificationEl) {
      return false;
    }
    rect = anchor.getBoundingClientRect();
    offset = readOffset(options);
    stackOffset = readStackOffset(_runtime.domRefs.anchoredNotifications, _record);
    left = resolveLeft(rect, notificationEl.offsetWidth, options.align || "center") + offset.x;
    top = rect.bottom + offset.y + stackOffset;
    left = Math.max(8, Math.min(left, window.innerWidth - notificationEl.offsetWidth - 8));
    notificationEl.style.left = Math.round(left) + "px";
    notificationEl.style.top = Math.round(top) + "px";
    return true;
  }

  return __controller;
});

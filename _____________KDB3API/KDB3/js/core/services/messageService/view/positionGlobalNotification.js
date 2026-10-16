define([], function () {
  "use strict";

  function readStackOffset(records, record) {
    var index;
    var stackOffset = 0;
    for (index = 0; index < records.length; index += 1) {
      if (records[index] === record) {
        return stackOffset;
      }
      stackOffset += records[index].notificationEl.offsetHeight + 8;
    }
    return stackOffset;
  }

  function __controller(_runtime, _record, _box) {
    var notificationEl;
    var records;
    var width;
    var height;
    var left;
    var top;
    if (!_record || !_record.notificationEl) {
      return false;
    }
    if (!_box || !isFinite(_box.left) || !isFinite(_box.top) || !isFinite(_box.width) || !isFinite(_box.height)) {
      return false;
    }
    notificationEl = _record.notificationEl;
    records = _runtime.domRefs.globalNotifications;
    width = notificationEl.offsetWidth;
    height = notificationEl.offsetHeight;
    left = _box.left + ((_box.width - width) / 2);
    top = _box.top + 8 + readStackOffset(records, _record);
    left = Math.max(_box.left + 8, Math.min(left, _box.left + _box.width - width - 8));
    top = Math.max(_box.top + 8, Math.min(top, _box.top + _box.height - height - 8));
    notificationEl.style.left = Math.round(left) + "px";
    notificationEl.style.top = Math.round(top) + "px";
    return true;
  }

  return __controller;
});

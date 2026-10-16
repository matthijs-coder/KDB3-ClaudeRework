define([], function () {
  "use strict";

  function isChromeHistoryTarget(target) {
    return target === "header.status" || target === "header.subtitleStatus";
  }
  function isTextHistoryTarget(target) {
    return target === "header.titleText" || target === "header.subtitleText";
  }
  function resolveStepKey(target) {
    if (isChromeHistoryTarget(target)) return "header_chromeChange";
    if (isTextHistoryTarget(target)) return "header_textChange";
    return null;
  }
  function cloneSerializable(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function buildHeaderHistoryStep(_oldSnapshot, _newSnapshot) {
    var target = _oldSnapshot && _oldSnapshot.target;
    var key = resolveStepKey(target);
    if (!key || target !== _newSnapshot.target) {
      return null;
    }
    return {
      key: key,
      timestamp: Date.now(),
      old: { target: target, value: cloneSerializable(_oldSnapshot.value) },
      new: { target: target, value: cloneSerializable(_newSnapshot.value) },
    };
  }

  return buildHeaderHistoryStep;
});

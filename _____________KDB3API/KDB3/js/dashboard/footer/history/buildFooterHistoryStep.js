define([], function () {
  "use strict";

  function cloneSerializable(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (_error) {
      return value;
    }
  }

  function buildFooterHistoryStep(_oldSnapshot, _newSnapshot) {
    var target = _oldSnapshot && _oldSnapshot.target;
    if (!target || target !== "footer.status" || target !== _newSnapshot.target) {
      return null;
    }
    return {
      key: "footer_chromeChange",
      timestamp: Date.now(),
      old: { target: target, value: cloneSerializable(_oldSnapshot.value) },
      new: { target: target, value: cloneSerializable(_newSnapshot.value) },
    };
  }

  return buildFooterHistoryStep;
});

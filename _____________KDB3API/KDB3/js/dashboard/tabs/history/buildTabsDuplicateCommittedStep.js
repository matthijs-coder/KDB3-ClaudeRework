define([], function () {
  "use strict";

  function __controller(_insertTabIdx, _insertTabId, _serializedByTabId, _sourceTabId, _sourceTabIndex, _timestamp) {
    return {
      key: "tabs_duplicate",
      timestamp: typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now(),
      old: {
        tabIndex: _insertTabIdx,
        tabId: _insertTabId,
        widgetRebuild: true,
        serializedByTabId: _serializedByTabId
      },
      new: {
        replayDuplicate: true,
        sourceTabId: _sourceTabId,
        sourceTabIndex: _sourceTabIndex
      }
    };
  }

  return __controller;
});

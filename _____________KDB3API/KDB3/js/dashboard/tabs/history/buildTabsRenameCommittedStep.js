define([], function () {
  "use strict";

  function __controller(_tabIndex, _tabId, _previousName, _confirmedName, _timestamp) {
    return {
      key: "tabs_rename",
      timestamp: typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now(),
      old: { tabIndex: _tabIndex, tabId: _tabId, name: _previousName },
      new: { tabIndex: _tabIndex, tabId: _tabId, name: _confirmedName }
    };
  }

  return __controller;
});

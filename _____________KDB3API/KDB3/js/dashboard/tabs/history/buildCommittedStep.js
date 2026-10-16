define([], function () {
  "use strict";

  function __controller(_s, _d, _timestamp) {
    return {
      key: "tabs_move",
      timestamp: typeof _timestamp === "number" && isFinite(_timestamp) ? _timestamp : Date.now(),
      old: { tabIndex: _d, targetPosition: _s },
      new: { tabIndex: _s, targetPosition: _d }
    };
  }

  return __controller;
});

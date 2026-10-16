define([
  "../config/defaults.js",
], function (_defaults) {
  "use strict";

  function __controller() {
    return {
      lifecycle: "ready",
      stack: [],
      pointer: -1,
      limit: _defaults.DEFAULT_HISTORY_LIMIT,
      pendingStep: null,
      lastChangedAt: null,
      errorCode: null,
      errorMessage: null,
    };
  }

  return __controller;
});

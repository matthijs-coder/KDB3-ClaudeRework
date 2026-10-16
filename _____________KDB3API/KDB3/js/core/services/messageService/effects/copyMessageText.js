define([], function () {
  "use strict";

  function copied() {
    return true;
  }

  function unavailable() {
    return false;
  }

  function __controller(_text) {
    var clipboard = typeof navigator !== "undefined" ? navigator.clipboard : null;
    if (typeof window === "undefined" || window.isSecureContext !== true) {
      return Promise.resolve(false);
    }
    if (!clipboard || typeof clipboard.writeText !== "function") {
      return Promise.resolve(false);
    }
    try {
      return clipboard.writeText(String(_text || "")).then(copied, unavailable);
    } catch (_error) {
      return Promise.resolve(false);
    }
  }

  return __controller;
});

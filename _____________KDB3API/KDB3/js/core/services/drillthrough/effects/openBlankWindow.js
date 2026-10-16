define([], function () {
  "use strict";

  function __controller(_url) {
    try {
      return window.open(_url, "_blank");
    } catch (err) {
      console.error("[drillthrough.openBlankWindow]", err);
      throw err;
    }
  }

  return __controller;
});

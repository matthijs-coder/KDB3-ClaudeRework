define([], function () {
  "use strict";

  function entrySleep(_ms) {
    return new Promise(function (_resolve) {
      setTimeout(_resolve, _ms);
    });
  }

  return entrySleep;
});

define([], function () {
  "use strict";

  function entryThrottle(_fn, _limit) {
    var inThrottle = false;

    return function () {
      if (inThrottle) return;
      _fn.apply(this, arguments);
      inThrottle = true;
      setTimeout(function () {
        inThrottle = false;
      }, _limit);
    };
  }

  return entryThrottle;
});

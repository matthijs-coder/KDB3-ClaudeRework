define([], function () {
  "use strict";

  function isRightAllowed(_rawValue) {
    return _rawValue === 1 || _rawValue === "1" || _rawValue === true;
  }

  return isRightAllowed;
});

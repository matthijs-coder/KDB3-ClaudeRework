define([], function () {
  "use strict";

  function __controller(_leftValue, _rightValue) {
    try {
      return JSON.stringify(_leftValue) === JSON.stringify(_rightValue);
    } catch (error) {
      return _leftValue === _rightValue;
    }
  }

  return __controller;
});

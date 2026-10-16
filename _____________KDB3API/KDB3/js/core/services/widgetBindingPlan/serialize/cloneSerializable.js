define([], function () {
  "use strict";

  function __controller(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (error) {
      return _value;
    }
  }

  return __controller;
});

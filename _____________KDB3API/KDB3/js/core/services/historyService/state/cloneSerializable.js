define([], function () {
  "use strict";

  function __controller(_value) {
    if (_value == null) {
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

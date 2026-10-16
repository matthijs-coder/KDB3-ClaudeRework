define([], function () {
  "use strict";

  function clone(_value) {
    if (_value == null || typeof _value !== "object") {
      return _value;
    }
    try {
      return JSON.parse(JSON.stringify(_value));
    } catch (_error) {
      return Object.assign({}, _value);
    }
  }

  return clone;
});

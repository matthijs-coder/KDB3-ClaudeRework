define([], function () {
  "use strict";

  function __controller(_raw, _level) {
    var value = String(_raw == null ? "" : _raw).trim();
    if (!value) {
      return "";
    }
    if (value === "---") {
      return "---";
    }
    if (value.indexOf("DS_") === 0) {
      value = value.slice(3);
    }
    if (_level === 0 && value.length >= 5 && value.slice(-5) === "|ALLE") {
      value = value.slice(0, -5);
    }
    return value.trim();
  }

  return __controller;
});

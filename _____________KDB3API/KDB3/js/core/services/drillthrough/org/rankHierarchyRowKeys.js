define([], function () {
  "use strict";

  function __controller(_row) {
    var i;
    var keys;
    if (Array.isArray(_row)) {
      keys = [];
      for (i = 0; i < _row.length; i += 1) {
        keys.push(i);
      }
      return keys;
    }
    if (!_row || typeof _row !== "object") {
      return [];
    }
    return Object.keys(_row);
  }

  return __controller;
});

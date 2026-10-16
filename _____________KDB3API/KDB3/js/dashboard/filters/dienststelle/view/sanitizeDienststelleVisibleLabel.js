define([], function () {
  "use strict";

  function __controller(_value) {
    var raw = String(_value == null ? "" : _value);
    if (!raw) {
      return "";
    }

    var hashIndex = raw.indexOf("#");
    if (hashIndex === -1) {
      return raw;
    }

    var trimmed = raw.slice(hashIndex + 1).trim();
    if (!trimmed) {
      return raw;
    }

    var pipeIndex = trimmed.indexOf("|");
    var hadPipe = pipeIndex !== -1;
    if (hadPipe) {
      var afterPipe = trimmed.slice(pipeIndex + 1).trim();
      if (afterPipe) {
        trimmed = afterPipe;
      }
    }

    if (hadPipe) {
      var dashIndex = trimmed.indexOf(" - ");
      if (dashIndex !== -1) {
        var afterDash = trimmed.slice(dashIndex + 3).trim();
        if (afterDash) {
          trimmed = afterDash;
        }
      }
    }

    return trimmed;
  }

  return __controller;
});

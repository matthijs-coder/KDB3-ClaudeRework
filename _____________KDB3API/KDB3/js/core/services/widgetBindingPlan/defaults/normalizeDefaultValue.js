define([], function () {
  "use strict";

  var DEFAULT_SENTINELS = { "": true, default: true, none: true };

  function normalizeDefaultValue(_value) {
    if (_value == null) {
      return null;
    }
    if (typeof _value !== "string") {
      return _value;
    }
    var trimmed = _value.trim();
    if (!trimmed || DEFAULT_SENTINELS[trimmed.toLowerCase()]) {
      return null;
    }
    return trimmed;
  }

  return normalizeDefaultValue;
});

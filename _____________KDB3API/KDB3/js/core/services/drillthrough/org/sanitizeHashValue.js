define([], function () {
  "use strict";

  function sanitizeHashValue(_value) {
    var raw = String(_value == null ? "" : _value).trim();
    var hashIndex;
    if (!raw) {
      return "";
    }
    if (raw === "#ALLE_GG#") {
      return raw;
    }
    if (raw.charAt(raw.length - 1) === "#") {
      return "---";
    }
    hashIndex = raw.indexOf("#");
    if (hashIndex === -1) {
      return raw;
    }
    return String(raw.slice(0, hashIndex)).trim();
  }

  return sanitizeHashValue;
});

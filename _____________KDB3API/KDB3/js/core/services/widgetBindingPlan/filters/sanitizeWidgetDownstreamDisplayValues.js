define([], function () {
  "use strict";

  var PIPE_SPLIT = /\s*(?:\||\u00A0\||\u2007\||\u202F\|)\s*/;

  function stripHashPrefix(_token) {
    var token = typeof _token === "string" ? _token.trim() : "";
    if (!token) {
      return "";
    }
    var hashIndex = token.indexOf("#");
    if (hashIndex >= 0) {
      return token.slice(hashIndex + 1).trim();
    }
    return token;
  }

  function sanitizeOneValue(_value) {
    var raw = typeof _value === "string" ? _value.trim() : String(_value == null ? "" : _value).trim();
    if (!raw) {
      return "";
    }
    var parts = raw.split(PIPE_SPLIT);
    var cleaned = [];
    for (var index = 0; index < parts.length; index += 1) {
      var part = stripHashPrefix(parts[index]);
      if (part) {
        cleaned.push(part);
      }
    }
    return cleaned.join(" | ");
  }

  function __controller(_values) {
    var source = Array.isArray(_values) ? _values : [];
    var result = [];
    for (var index = 0; index < source.length; index += 1) {
      var sanitized = sanitizeOneValue(source[index]);
      if (sanitized) {
        result.push(sanitized);
      }
    }
    return result;
  }

  return __controller;
});

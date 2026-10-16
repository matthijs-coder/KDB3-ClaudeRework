define([
  "../defaults/normalizeDefaultValue.js",
], function (_normalizeDefaultValue) {
  "use strict";

  var TOP_N_KEY_RE = /^top\s*-?\s*(\d+)$/i;

  function normalizeTopNKey(_rawValue) {
    var normalized = _normalizeDefaultValue(_rawValue);
    if (normalized == null) {
      return null;
    }
    var lower = String(normalized).toLowerCase();
    var match = lower.match(TOP_N_KEY_RE);
    if (match) {
      return "top-" + match[1];
    }
    return lower;
  }

  function resolveCountFromOptions(_key, _topNOptions) {
    var options = _topNOptions && typeof _topNOptions === "object" ? _topNOptions : {};
    if (Object.prototype.hasOwnProperty.call(options, _key)) {
      var entry = options[_key];
      if (typeof entry === "number") {
        return { kind: "count", n: entry, value: _key, key: _key };
      }
      if (entry && typeof entry === "object" && typeof entry.n === "number") {
        return {
          kind: "count",
          n: entry.n,
          value: entry.value || _key,
          key: entry.key || _key,
        };
      }
    }
    var keys = Object.keys(options);
    for (var index = 0; index < keys.length; index += 1) {
      var optionKey = keys[index];
      if (String(optionKey).toLowerCase() === _key) {
        return resolveCountFromOptions(optionKey, options);
      }
    }
    return null;
  }

  function __controller(_rawValue, _topNOptions) {
    var key = normalizeTopNKey(_rawValue);
    if (key == null) {
      return { kind: "default" };
    }
    var count = resolveCountFromOptions(key, _topNOptions);
    if (count) {
      return count;
    }
    return { kind: "unknown", value: String(_rawValue) };
  }

  return __controller;
});

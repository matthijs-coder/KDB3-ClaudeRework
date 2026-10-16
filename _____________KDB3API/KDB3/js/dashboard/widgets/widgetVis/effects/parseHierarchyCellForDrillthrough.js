define([], function () {
  "use strict";

  var TEXT_KEYS = ["text", "label", "display", "d", "value", "id"];

  function extractLastBracketToken(_value) {
    var source = String(_value == null ? "" : _value).trim();
    var match;
    if (!source) {
      return "";
    }
    match = source.match(/\[([^\]]+)\](?!.*\[[^\]]+\])/);
    return match ? String(match[1] || "").trim() : "";
  }

  function cellText(_cell) {
    var i;
    var key;
    if (_cell && typeof _cell === "object") {
      for (i = 0; i < TEXT_KEYS.length; i += 1) {
        key = TEXT_KEYS[i];
        if (_cell[key] != null && String(_cell[key]).trim()) {
          return String(_cell[key]).trim();
        }
      }
      return "";
    }
    return _cell != null ? String(_cell).trim() : "";
  }

  function cellSourceId(_cell) {
    var token;
    if (!_cell || typeof _cell !== "object") {
      return null;
    }
    if (_cell.id != null && String(_cell.id).trim()) {
      return String(_cell.id).trim();
    }
    token = extractLastBracketToken(_cell.use);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.useValue);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.u);
    if (token) {
      return token;
    }
    token = extractLastBracketToken(_cell.value);
    if (token) {
      return token;
    }
    return null;
  }

  function __controller(_cell) {
    try {
      var text = cellText(_cell);
      var sourceId;
      if (!text) {
        return null;
      }
      sourceId = cellSourceId(_cell);
      return { text: text, sourceId: sourceId };
    } catch (err) {
      console.error("[widgetVis.parseHierarchyCellForDrillthrough]", err);
      return null;
    }
  }

  return __controller;
});

define([], function () {
  "use strict";

  var TEXT_KEYS = ["text", "label", "display", "d", "value", "id"];
  var SOURCE_KEYS = ["use", "useValue", "u", "value"];

  // Last "[token]" of a unique name, trimmed; "" when there is none. A newline ends the lookahead, so with
  // several lines the result is the last bracket of the first line that contains one.
  function extractLastBracketToken(_value) {
    var source = String(_value == null ? "" : _value).trim();
    var match;
    if (!source) {
      return "";
    }
    match = source.match(/\[([^\]]+)\](?!.*\[[^\]]+\])/);
    return match ? String(match[1] || "").trim() : "";
  }

  // Last "[token]" over the whole string, untrimmed (newlines do not matter); "" when there is none. Restore
  // lookups compare full use values, so unlike extractLastBracketToken whitespace is significant here.
  function extractUniqueNameLeaf(_value) {
    var text = String(_value == null ? "" : _value);
    var re = /\[([^\]]+)\]/g;
    var last = "";
    var match;
    while ((match = re.exec(text)) !== null) {
      last = match[1];
    }
    return last;
  }

  // Hierarchy level number of a unique name such as "[Org].[level02].[x]"; null when there is none.
  function parseLevelNumber(_value) {
    var match = String(_value == null ? "" : _value).match(/level0*(\d+)/i);
    var level = match ? parseInt(match[1], 10) : NaN;
    return isNaN(level) ? null : level;
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
    var i;
    var token;
    if (!_cell || typeof _cell !== "object") {
      return null;
    }
    if (_cell.id != null && String(_cell.id).trim()) {
      return String(_cell.id).trim();
    }
    for (i = 0; i < SOURCE_KEYS.length; i += 1) {
      token = extractLastBracketToken(_cell[SOURCE_KEYS[i]]);
      if (token) {
        return token;
      }
    }
    return null;
  }

  // Display text and source id of one hierarchy cell; null for a cell without text. A cell whose
  // values cannot be converted to a string is treated like an empty one.
  function parseHierarchyCell(_cell) {
    var text;
    try {
      text = cellText(_cell);
      if (!text) {
        return null;
      }
      return { text: text, sourceId: cellSourceId(_cell) };
    } catch (err) {
      console.error("[orgTree.parseHierarchyCell]", err);
      return null;
    }
  }

  return {
    parseHierarchyCell: parseHierarchyCell,
    extractLastBracketToken: extractLastBracketToken,
    parseLevelNumber: parseLevelNumber,
    extractUniqueNameLeaf: extractUniqueNameLeaf
  };
});

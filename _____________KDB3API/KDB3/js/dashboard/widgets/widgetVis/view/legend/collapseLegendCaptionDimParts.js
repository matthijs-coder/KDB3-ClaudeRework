define([], function () {
  "use strict";

  var SPACED_PIPE_DELIMITER_REGEX = /[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/;
  var YEAR_PART_REGEX = /^\d{4}$/;

  function splitLegendCaptionParts(_text) {
    var pieces = String(_text || "").split(SPACED_PIPE_DELIMITER_REGEX);
    var parts = [];
    var index;
    for (index = 0; index < pieces.length; index += 1) {
      parts.push(String(pieces[index] || "").trim());
    }
    return parts;
  }

  function findFirstYearPartIndex(_parts) {
    var index;
    for (index = 0; index < _parts.length; index += 1) {
      if (YEAR_PART_REGEX.test(String(_parts[index] == null ? "" : _parts[index]).trim())) {
        return index;
      }
    }
    return -1;
  }

  function resolveDienststelleIndex(_parts, _yearIndex) {
    if (_yearIndex >= 0 && _yearIndex === _parts.length - 1 && _yearIndex > 0) {
      return _yearIndex - 1;
    }
    return _parts.length - 1;
  }

  function resolveDroppedPrefixIndex(_parts, _yearIndex, _dstIndex) {
    var prefixIndices = [];
    var index;
    for (index = 0; index < _parts.length; index += 1) {
      if (index === _yearIndex || index === _dstIndex) {
        continue;
      }
      prefixIndices.push(index);
    }
    if (prefixIndices.length === 2) {
      return prefixIndices[1];
    }
    return -1;
  }

  function joinSurvivorLegendParts(_parts, _droppedIndex) {
    var survivors = [];
    var index;
    for (index = 0; index < _parts.length; index += 1) {
      if (index === _droppedIndex) {
        continue;
      }
      survivors.push(_parts[index]);
    }
    return survivors.join(" | ");
  }

  function shouldReservePrognoseLegendTail(_parts, _reservePrognoseTail) {
    var n = _parts.length;
    if (!_reservePrognoseTail || n < 5) {
      return false;
    }
    return YEAR_PART_REGEX.test(String(_parts[n - 2] == null ? "" : _parts[n - 2]).trim());
  }

  function collapseReservedPrognoseLegendTail(_parts) {
    var n = _parts.length;
    var prefix = _parts.slice(0, n - 3);
    if (prefix.length === 2) {
      return joinSurvivorLegendParts(_parts, 1);
    }
    return _parts.join(" | ");
  }

  function collapseLegendCaptionDimParts(_hashedText, _reservePrognoseTail) {
    try {
      var text = String(_hashedText == null ? "" : _hashedText);
      if (!SPACED_PIPE_DELIMITER_REGEX.test(text)) {
        return text;
      }
      var parts = splitLegendCaptionParts(text);
      if (parts.length < 2) {
        return text;
      }
      if (shouldReservePrognoseLegendTail(parts, _reservePrognoseTail)) {
        return collapseReservedPrognoseLegendTail(parts);
      }
      var yearIndex = findFirstYearPartIndex(parts);
      var dstIndex = resolveDienststelleIndex(parts, yearIndex);
      var droppedIndex = resolveDroppedPrefixIndex(parts, yearIndex, dstIndex);
      if (droppedIndex < 0) {
        return text;
      }
      return joinSurvivorLegendParts(parts, droppedIndex);
    } catch (err) {
      console.error("[widgetVis.collapseLegendCaptionDimParts] failed", err);
      throw err;
    }
  }

  return collapseLegendCaptionDimParts;
});

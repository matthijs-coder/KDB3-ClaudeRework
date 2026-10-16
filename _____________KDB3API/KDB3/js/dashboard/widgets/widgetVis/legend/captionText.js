define(["../visTypes.js"], function (_visTypes) {
  "use strict";

  var SPACED_PIPE_DELIMITER_REGEX = /[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/;
  var WHITESPACE_SPLIT_REGEX = /[\s\u00A0\u2007\u202F]+/;
  var TOOLTIP_TOKEN_REGEX = /tooltip/gi;
  var YEAR_PART_REGEX = /^\d{4}$/;
  var MARKER_ALLE = "alle";
  var MARKER_BEENDET = "beendet";
  var LABEL_ALLE = "Alle";
  var LABEL_BEENDET = "Beendet";
  var GESAMT_SUFFIX = "gesamt";

  function asText(_value) {
    return String(_value == null ? "" : _value);
  }

  function asLowerTrimmed(_value) {
    return asText(_value).trim().toLowerCase();
  }

  function isDefaultDimension(_dimension) {
    var normalized = asLowerTrimmed(_dimension);
    return normalized === "" || normalized === "default" || normalized === "none";
  }

  function splitCaptionParts(_text) {
    return asText(_text).split(SPACED_PIPE_DELIMITER_REGEX).map(function (_piece) {
      return _piece.trim();
    });
  }

  function isYearPart(_part) {
    return YEAR_PART_REGEX.test(asText(_part).trim());
  }

  function readFirstWord(_text) {
    var trimmed = asText(_text).trim();
    return trimmed ? trimmed.split(WHITESPACE_SPLIT_REGEX)[0] || "" : "";
  }

  function normalizeLegendHashSegment(_segment) {
    var segment = asText(_segment);
    if (!segment) {
      return segment;
    }
    var trimmed = segment.trim();
    var hashIndex = trimmed.indexOf("#");
    if (hashIndex <= 0 || hashIndex >= trimmed.length - 1) {
      return segment;
    }
    var lower = trimmed.toLowerCase();
    var endsWithGesamt = lower.length >= GESAMT_SUFFIX.length && lower.substring(lower.length - GESAMT_SUFFIX.length) === GESAMT_SUFFIX;
    var hasBeendet = lower.indexOf(MARKER_BEENDET) !== -1;
    var beforeHash = trimmed.slice(0, hashIndex).trim();
    var afterHash = trimmed.slice(hashIndex + 1).trim();
    var pipeIndex = beforeHash.lastIndexOf("|");
    var hasInternalPipe = pipeIndex > 0 && pipeIndex < beforeHash.length - 1;
    var namePart = hasInternalPipe ? beforeHash.slice(0, pipeIndex).trim() : "";
    var markerLower = hasInternalPipe ? beforeHash.slice(pipeIndex + 1).trim().toLowerCase() : "";
    var firstWord = readFirstWord(afterHash);

    if (hasInternalPipe && markerLower === MARKER_ALLE) {
      if (endsWithGesamt) {
        return namePart + "(" + LABEL_ALLE + ")";
      }
      return hasBeendet ? namePart + "(" + LABEL_BEENDET + ")" : namePart;
    }
    if (hasInternalPipe && markerLower === MARKER_BEENDET) {
      if (!afterHash || firstWord.toLowerCase() === MARKER_BEENDET) {
        return namePart + "(" + LABEL_BEENDET + ")";
      }
      return firstWord + "(" + LABEL_BEENDET + ")";
    }
    return firstWord || afterHash;
  }

  function normalizeLegendHashCaption(_text) {
    var trimmed = asText(_text).trim();
    if (!SPACED_PIPE_DELIMITER_REGEX.test(trimmed)) {
      return normalizeLegendHashSegment(trimmed);
    }
    return splitCaptionParts(trimmed).map(normalizeLegendHashSegment).join(" | ");
  }

  function joinSurvivorParts(_parts, _droppedIndex) {
    return _parts.filter(function (_part, _index) {
      return _index !== _droppedIndex;
    }).join(" | ");
  }

  function resolveDienststelleIndex(_parts, _yearIndex) {
    if (_yearIndex > 0 && _yearIndex === _parts.length - 1) {
      return _yearIndex - 1;
    }
    return _parts.length - 1;
  }

  function resolveDroppedPrefixIndex(_parts, _yearIndex, _dstIndex) {
    var prefixIndices = [];
    var index;
    for (index = 0; index < _parts.length; index += 1) {
      if (index !== _yearIndex && index !== _dstIndex) {
        prefixIndices.push(index);
      }
    }
    return prefixIndices.length === 2 ? prefixIndices[1] : -1;
  }

  function hasReservedPrognoseTail(_parts, _reservePrognoseTail) {
    return !!_reservePrognoseTail && _parts.length >= 5 && isYearPart(_parts[_parts.length - 2]);
  }

  function collapseLegendCaptionDimParts(_hashedText, _reservePrognoseTail) {
    var text = asText(_hashedText);
    if (!SPACED_PIPE_DELIMITER_REGEX.test(text)) {
      return text;
    }
    var parts = splitCaptionParts(text);
    if (parts.length < 2) {
      return text;
    }
    if (hasReservedPrognoseTail(parts, _reservePrognoseTail)) {
      return parts.length - 3 === 2 ? joinSurvivorParts(parts, 1) : parts.join(" | ");
    }
    var yearIndex = -1;
    var index;
    for (index = 0; index < parts.length; index += 1) {
      if (isYearPart(parts[index])) {
        yearIndex = index;
        break;
      }
    }
    var droppedIndex = resolveDroppedPrefixIndex(parts, yearIndex, resolveDienststelleIndex(parts, yearIndex));
    return droppedIndex < 0 ? text : joinSurvivorParts(parts, droppedIndex);
  }

  function sanitizeLegendCaptionText(_text, _options) {
    var original = String(_text || "");
    var visType = _options && _options.visType != null ? _options.visType : "";
    var hashed = normalizeLegendHashCaption(original);
    var isList = asLowerTrimmed(visType) === "list";
    var next = isList
      ? hashed
      : collapseLegendCaptionDimParts(hashed, _visTypes.normalizeVisualizationType(visType) === "Prognose");
    return { text: next, changed: next !== original };
  }

  function replaceTooltipInLegendTitle(_text, _dimensionLabel) {
    var text = String(_text || "");
    var dimLabel = asText(_dimensionLabel).trim();
    if (!text || isDefaultDimension(dimLabel) || text.toLowerCase().indexOf("tooltip") === -1) {
      return { text: text, changed: false };
    }
    var newText = text.replace(TOOLTIP_TOKEN_REGEX, dimLabel);
    return { text: newText, changed: newText !== text };
  }

  function isDroppedLegendTitleToken(_token) {
    var normalized = asLowerTrimmed(_token);
    return !normalized || normalized === "tooltip" || normalized === "jahr" || YEAR_PART_REGEX.test(normalized);
  }

  function sanitizeLegendTitleLine(_text, _dimensionLabel) {
    var text = String(_text || "");
    var dimLabel = asText(_dimensionLabel).trim();
    var kept = text.split("-").map(function (_piece) {
      return asText(_piece).trim();
    }).filter(function (_token) {
      return !isDroppedLegendTitleToken(_token);
    });
    var next = kept.join("-");
    var wanted = dimLabel.toLowerCase();
    var hasDimension = kept.some(function (_token) {
      return _token.toLowerCase() === wanted;
    });
    if (!isDefaultDimension(dimLabel) && !hasDimension) {
      next = next ? next + "-" + dimLabel : dimLabel;
    }
    return { text: next, changed: next !== text };
  }

  return {
    sanitizeLegendCaptionText: sanitizeLegendCaptionText,
    replaceTooltipInLegendTitle: replaceTooltipInLegendTitle,
    sanitizeLegendTitleLine: sanitizeLegendTitleLine,
    normalizeLegendHashCaption: normalizeLegendHashCaption,
    collapseLegendCaptionDimParts: collapseLegendCaptionDimParts
  };
});

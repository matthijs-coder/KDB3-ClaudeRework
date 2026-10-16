define([], function () {
  "use strict";

  var SPACED_PIPE_DELIMITER_REGEX = /[\s\u00A0\u2007\u202F]+\|[\s\u00A0\u2007\u202F]+/;
  var WHITESPACE_SPLIT_REGEX = /[\s\u00A0\u2007\u202F]+/;
  var MARKER_ALLE = "alle";
  var MARKER_BEENDET = "beendet";
  var LABEL_ALLE = "Alle";
  var LABEL_BEENDET = "Beendet";
  var GESAMT_SUFFIX = "gesamt";

  function hasSpacedPipeDelimiter(_text) {
    return SPACED_PIPE_DELIMITER_REGEX.test(String(_text || ""));
  }

  function splitLegendParts(_text) {
    var raw = String(_text || "");
    if (!hasSpacedPipeDelimiter(raw)) {
      return [raw.trim()];
    }
    var pieces = raw.split(SPACED_PIPE_DELIMITER_REGEX);
    var parts = [];
    var index;
    for (index = 0; index < pieces.length; index += 1) {
      parts.push(String(pieces[index] || "").trim());
    }
    return parts;
  }

  function readFirstWord(_text) {
    var trimmed = String(_text || "").trim();
    if (!trimmed) {
      return "";
    }
    var tokens = trimmed.split(WHITESPACE_SPLIT_REGEX);
    return tokens[0] ? tokens[0] : "";
  }

  function readHashFlags(_segment) {
    var lower = String(_segment || "").trim().toLowerCase();
    return {
      doesEndWithGesamt:
        lower.length >= GESAMT_SUFFIX.length &&
        lower.substring(lower.length - GESAMT_SUFFIX.length) === GESAMT_SUFFIX,
      hasBeendet: lower.indexOf(MARKER_BEENDET) !== -1
    };
  }

  function normalizeLegendHashSegment(_segment) {
    var flags = readHashFlags(_segment);
    var segment = String(_segment || "");
    if (!segment) {
      return segment;
    }
    var trimmed = segment.trim();
    var hashIndex = trimmed.indexOf("#");
    if (hashIndex <= 0 || hashIndex >= trimmed.length - 1) {
      return segment;
    }
    var beforeHash = trimmed.slice(0, hashIndex).trim();
    var afterHash = trimmed.slice(hashIndex + 1).trim();
    var pipeIndex = beforeHash.lastIndexOf("|");
    var hasInternalPipe = pipeIndex > 0 && pipeIndex < beforeHash.length - 1;
    var namePart = hasInternalPipe ? beforeHash.slice(0, pipeIndex).trim() : "";
    var markerLower = hasInternalPipe
      ? beforeHash.slice(pipeIndex + 1).trim().toLowerCase()
      : "";
    var firstWord = readFirstWord(afterHash);

    if (hasInternalPipe && markerLower === MARKER_ALLE) {
      if (flags.doesEndWithGesamt) {
        return namePart + "(" + LABEL_ALLE + ")";
      }
      if (flags.hasBeendet) {
        return namePart + "(" + LABEL_BEENDET + ")";
      }
      return namePart;
    }

    if (hasInternalPipe && markerLower === MARKER_BEENDET) {
      if (!afterHash || firstWord.toLowerCase() === MARKER_BEENDET) {
        return namePart + "(" + LABEL_BEENDET + ")";
      }
      return firstWord + "(" + LABEL_BEENDET + ")";
    }

    if (firstWord) {
      return firstWord;
    }
    return afterHash;
  }

  function normalizeLegendHashCaption(_text) {
    try {
      var raw = String(_text || "");
      var trimmed = raw.trim();
      if (!hasSpacedPipeDelimiter(trimmed)) {
        return normalizeLegendHashSegment(trimmed);
      }
      var parts = splitLegendParts(trimmed);
      var cleaned = [];
      var index;
      for (index = 0; index < parts.length; index += 1) {
        cleaned.push(normalizeLegendHashSegment(parts[index]));
      }
      return cleaned.join(" | ");
    } catch (err) {
      console.error("[widgetVis.normalizeLegendHashCaption] failed", err);
      throw err;
    }
  }

  return normalizeLegendHashCaption;
});

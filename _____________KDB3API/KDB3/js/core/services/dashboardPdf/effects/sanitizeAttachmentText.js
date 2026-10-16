define([], function () {
  "use strict";

  function decodeEntities(_value) {
    var input = _value == null ? "" : String(_value);
    var textarea;
    if (typeof document === "undefined" || !document.createElement) return input;
    textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  function replaceSpecialSymbols(_value) {
    var map = {
      "≥": ">=",
      "≤": "<=",
      "≠": "!=",
      "≈": "~",
      "±": "+/-",
      "×": "x",
      "÷": "/",
      "–": "-",
      "—": "-",
      "•": "-",
      "·": ".",
      "°": " deg",
      "€": "EUR",
      "′": "'",
      "″": "\"",
      "‹": "<",
      "›": ">",
      "«": "\"",
      "»": "\"",
      "“": "\"",
      "”": "\"",
      "„": "\"",
      "’": "'",
      "‚": "'",
      "…": "...",
      "\u00AD": ""
    };
    return String(_value == null ? "" : _value).replace(/[≥≤≠≈±×÷–—•·°€′″‹›«»“”„’‚…\u00AD]/g, function (char) {
      return Object.prototype.hasOwnProperty.call(map, char) ? map[char] : char;
    });
  }

  function fixStretchedLetters(_value) {
    var text = String(_value == null ? "" : _value);
    var tokens = text.split(" ");
    var singleChars;
    if (!text) return "";
    singleChars = tokens.filter(function (token) { return token.length === 1; }).length;
    if (tokens.length >= 6 && singleChars / tokens.length > 0.6) return tokens.join("");
    return text;
  }

  function normalizeWhitespace(_value) {
    return String(_value == null ? "" : _value)
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanLabel(_value) {
    return fixStretchedLetters(normalizeWhitespace(replaceSpecialSymbols(decodeEntities(_value))));
  }

  function cleanValue(_value) {
    return normalizeWhitespace(replaceSpecialSymbols(decodeEntities(_value)));
  }

  function toDisplayText(_value) {
    if (_value == null) return "";
    if (Array.isArray(_value)) return _value.map(toDisplayText).filter(Boolean).join("; ");
    if (typeof _value === "object") return toDisplayText(_value.displayValue || _value.label || _value.value || _value.useValue || _value.d);
    return cleanValue(_value);
  }

  function cleanMultilineValue(_value) {
    var text = _value == null ? "" : String(_value);
    return text.split("\n").map(function (line) { return cleanValue(line); }).join("\n");
  }

  return {
    cleanLabel: cleanLabel,
    cleanValue: cleanValue,
    cleanMultilineValue: cleanMultilineValue,
    toDisplayText: toDisplayText
  };
});

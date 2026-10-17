define([], function () {
  "use strict";

  // Replacements for characters the PDF base fonts cannot draw.
  var SYMBOL_MAP = {
    "≥": ">=", "≤": "<=", "≠": "!=", "≈": "~", "±": "+/-", "×": "x", "÷": "/",
    "–": "-", "—": "-", "•": "-", "·": ".", "°": " deg", "€": "EUR",
    "′": "'", "″": "\"", "‹": "<", "›": ">", "«": "\"", "»": "\"",
    "“": "\"", "”": "\"", "„": "\"", "’": "'", "‚": "'", "…": "...", "\u00AD": ""
  };
  var SYMBOL_PATTERN = new RegExp("[" + Object.keys(SYMBOL_MAP).join("") + "]", "g");

  // A detached <textarea> decodes HTML entities without parsing markup.
  function decodeEntities(value) {
    var input = value == null ? "" : String(value);
    if (typeof document === "undefined" || !document.createElement) return input;
    var textarea = document.createElement("textarea");
    textarea.innerHTML = input;
    return textarea.value;
  }

  function replaceSpecialSymbols(value) {
    return String(value == null ? "" : value).replace(SYMBOL_PATTERN, function (char) { return SYMBOL_MAP[char]; });
  }

  // Cognos sometimes delivers labels letter-spaced ("A l t e r"): rejoin when most tokens are single characters.
  function fixStretchedLetters(value) {
    var text = String(value == null ? "" : value);
    if (!text) return "";
    var tokens = text.split(" ");
    var singleChars = tokens.filter(function (token) { return token.length === 1; }).length;
    return tokens.length >= 6 && singleChars / tokens.length > 0.6 ? tokens.join("") : text;
  }

  function normalizeWhitespace(value) {
    return String(value == null ? "" : value)
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function cleanValue(value) {
    return normalizeWhitespace(replaceSpecialSymbols(decodeEntities(value)));
  }

  function cleanLabel(value) {
    return fixStretchedLetters(cleanValue(value));
  }

  function toDisplayText(value) {
    if (value == null) return "";
    if (Array.isArray(value)) return value.map(toDisplayText).filter(Boolean).join("; ");
    if (typeof value === "object") {
      return toDisplayText(value.displayValue || value.label || value.value || value.useValue || value.d);
    }
    return cleanValue(value);
  }

  return { cleanLabel: cleanLabel, cleanValue: cleanValue, toDisplayText: toDisplayText };
});

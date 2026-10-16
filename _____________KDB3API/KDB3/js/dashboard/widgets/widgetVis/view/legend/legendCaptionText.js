define([
  "./normalizeLegendHashSegment.js",
  "./collapseLegendCaptionDimParts.js",
  "../../config/visTypes/normalizeVisualizationType.js"
], function (
  _normalizeLegendHashCaption,
  _collapseLegendCaptionDimParts,
  _normalizeVisualizationType
) {
  "use strict";

  var TOOLTIP_TOKEN_REGEX = /tooltip/gi;
  var YEAR_TOKEN_REGEX = /^\d{4}$/;

  function isDefaultDimension(_dimension) {
    var normalized = String(_dimension == null ? "" : _dimension).trim().toLowerCase();
    return normalized === "" || normalized === "default" || normalized === "none";
  }

  function isListVisualizationType(_visType) {
    return String(_visType == null ? "" : _visType).trim().toLowerCase() === "list";
  }

  function isPrognoseVisualizationType(_visType) {
    return _normalizeVisualizationType(_visType) === "Prognose";
  }

  function isDroppedLegendTitleToken(_token) {
    var normalized = String(_token == null ? "" : _token).trim().toLowerCase();
    if (!normalized) {
      return true;
    }
    if (normalized === "tooltip" || normalized === "jahr") {
      return true;
    }
    return YEAR_TOKEN_REGEX.test(normalized);
  }

  function hasMatchingLegendTitleToken(_tokens, _dimensionLabel) {
    var wanted = String(_dimensionLabel == null ? "" : _dimensionLabel).trim().toLowerCase();
    if (!wanted) {
      return false;
    }
    var index;
    for (index = 0; index < _tokens.length; index += 1) {
      if (String(_tokens[index] || "").trim().toLowerCase() === wanted) {
        return true;
      }
    }
    return false;
  }

  function sanitizeLegendCaptionText(_text, _options) {
    try {
      var original = String(_text || "");
      var options = _options || {};
      var visType = options.visType == null ? "" : options.visType;
      var hashed = _normalizeLegendHashCaption(original);
      var next = isListVisualizationType(visType)
        ? hashed
        : _collapseLegendCaptionDimParts(hashed, isPrognoseVisualizationType(visType));
      return {
        text: next,
        changed: next !== original
      };
    } catch (err) {
      console.error("[widgetVis.sanitizeLegendCaptionText] failed", err);
      throw err;
    }
  }

  function replaceTooltipInLegendTitle(_text, _dimensionLabel) {
    try {
      var text = String(_text || "");
      var dimLabel = String(_dimensionLabel == null ? "" : _dimensionLabel).trim();
      if (!text || isDefaultDimension(dimLabel)) {
        return { text: text, changed: false };
      }
      if (text.toLowerCase().indexOf("tooltip") === -1) {
        return { text: text, changed: false };
      }
      var newText = text.replace(TOOLTIP_TOKEN_REGEX, dimLabel);
      return { text: newText, changed: newText !== text };
    } catch (err) {
      console.error("[widgetVis.replaceTooltipInLegendTitle] failed", err);
      throw err;
    }
  }

  function sanitizeLegendTitleLine(_text, _dimensionLabel) {
    try {
      var text = String(_text || "");
      var dimLabel = String(_dimensionLabel == null ? "" : _dimensionLabel).trim();
      var pieces = text.split("-");
      var kept = [];
      var index;
      for (index = 0; index < pieces.length; index += 1) {
        var token = String(pieces[index] || "").trim();
        if (isDroppedLegendTitleToken(token)) {
          continue;
        }
        kept.push(token);
      }
      var next = kept.join("-");
      if (!isDefaultDimension(dimLabel) && !hasMatchingLegendTitleToken(kept, dimLabel)) {
        next = next ? next + "-" + dimLabel : dimLabel;
      }
      return { text: next, changed: next !== text };
    } catch (err) {
      console.error("[widgetVis.sanitizeLegendTitleLine] failed", err);
      throw err;
    }
  }

  return {
    sanitizeLegendCaptionText: sanitizeLegendCaptionText,
    replaceTooltipInLegendTitle: replaceTooltipInLegendTitle,
    sanitizeLegendTitleLine: sanitizeLegendTitleLine
  };
});

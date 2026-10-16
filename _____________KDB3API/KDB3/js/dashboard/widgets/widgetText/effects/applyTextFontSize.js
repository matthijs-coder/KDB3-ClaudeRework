define([
  "../view/applyTextFontSize.js",
  "../config/normalizeFontSizeValue.js",
  "./readWidgetsFacet.js"
], function (_applyTextFontSizeView, _normalizeFontSizeValue, _readWidgetsFacet) {
  function applyTextFontSize(_KDB, _widgetId, _nodes, _fontSizeValue, _options) {
    var normalized = _normalizeFontSizeValue(_fontSizeValue);
    if (!normalized.ok) {
      return _applyTextFontSizeView(_KDB, _widgetId, _nodes, _fontSizeValue, _options);
    }
    if (!_nodes || !_nodes.textNodeForFont) {
      return _applyTextFontSizeView(_KDB, _widgetId, _nodes, _fontSizeValue, _options);
    }
    return writeHostFontSize(_KDB, _widgetId, normalized.cognosValue).then(function () {
      return _applyTextFontSizeView(_KDB, _widgetId, _nodes, _fontSizeValue, _options);
    });
  }

  function writeHostFontSize(_KDB, widgetId, cognosValue) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    if (!widgetsFacet || typeof widgetsFacet.setWidgetProperty !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(widgetsFacet.setWidgetProperty(widgetId, "fontSize", cognosValue)).then(function (outcome) {
      if (outcome && outcome.ok !== true && outcome.errorCode === "WIDGETS_WRITE_FAILED") {
        console.warn("[widgetText.applyTextFontSize] Cognos fontSize apply failed", widgetId, outcome);
      }
      return outcome;
    }).catch(function (err) {
      console.warn("[widgetText.applyTextFontSize] Cognos fontSize apply failed", widgetId, err);
      return false;
    });
  }

  return applyTextFontSize;
});

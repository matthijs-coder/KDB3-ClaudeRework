define([
  "../view/applyWidgetColour.js",
  "./readWidgetsFacet.js"
], function (_applyWidgetColourView, _readWidgetsFacet) {
  function applyWidgetColour(_KDB, _widgetId, _input) {
    return _applyWidgetColourView(_KDB, _widgetId, _input).then(function (colourResult) {
      if (!colourResult || colourResult.ok !== true) {
        return colourResult;
      }
      return mirrorFillColor(_KDB, _widgetId, colourResult.colour).then(function () {
        return colourResult;
      });
    });
  }

  function mirrorFillColor(_KDB, widgetId, colour) {
    var widgetsFacet = _readWidgetsFacet(_KDB);
    if (!widgetsFacet || typeof widgetsFacet.setWidgetProperty !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(widgetsFacet.setWidgetProperty(widgetId, "fillColor", colour)).then(function (outcome) {
      if (outcome && outcome.ok !== true && outcome.errorCode === "WIDGETS_WRITE_FAILED") {
        console.warn("[widgetBase.applyWidgetColour] Cognos fillColor mirror failed", widgetId, outcome);
      }
      return outcome;
    }).catch(function (err) {
      console.warn("[widgetBase.applyWidgetColour] Cognos fillColor mirror failed", widgetId, err);
      return false;
    });
  }

  return applyWidgetColour;
});

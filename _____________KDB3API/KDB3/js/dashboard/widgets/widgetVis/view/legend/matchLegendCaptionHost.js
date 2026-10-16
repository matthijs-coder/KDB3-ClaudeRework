define(["../../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var legend = _widgetChrome.legend.strings;
  var LEGEND_CAPTION_DATA_ITEM = legend.captionDataItem;

  function isLegendCaptionHostElement(_element) {
    try {
      if (!_element || _element.nodeType !== 1) {
        return false;
      }
      if (_element.classList && _element.classList.contains(legend.captionClass)) {
        return true;
      }
      var tagName = String(_element.tagName || "").toLowerCase();
      if (tagName !== "span" && tagName !== "label") {
        return false;
      }
      return _element.getAttribute("data-visual-item") === LEGEND_CAPTION_DATA_ITEM;
    } catch (err) {
      console.error("[widgetVis.matchLegendCaptionHost] isLegendCaptionHostElement failed", err);
      return false;
    }
  }

  function isLegendRootElement(_element) {
    try {
      if (!_element || _element.nodeType !== 1 || typeof _element.matches !== "function") {
        return false;
      }
      return _element.matches(legend.observeRootSelector);
    } catch (err) {
      console.error("[widgetVis.matchLegendCaptionHost] isLegendRootElement failed", err);
      return false;
    }
  }

  return {
    isLegendCaptionHostElement: isLegendCaptionHostElement,
    isLegendRootElement: isLegendRootElement
  };
});

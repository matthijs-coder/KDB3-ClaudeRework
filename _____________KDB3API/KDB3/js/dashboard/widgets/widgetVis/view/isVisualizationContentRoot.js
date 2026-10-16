define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var widget = _widgetChrome.widget.strings;
  var CONTENT_ROOT_SELECTOR = widget.bemContentSelector + ", [data-kdb-widget-content]";

  function isVisualizationContentRoot(_element) {
    try {
      if (!_element || _element.nodeType !== 1 || typeof _element.matches !== "function") {
        return false;
      }
      return _element.matches(CONTENT_ROOT_SELECTOR);
    } catch (err) {
      console.error("[widgetVis.isVisualizationContentRoot] failed", err);
      return false;
    }
  }

  return isVisualizationContentRoot;
});

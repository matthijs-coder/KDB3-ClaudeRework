define([
  "./buildVisualizationTitleText.js",
  "./readVisualizationFacet.js"
], function (_titleTextHelpers, _readVisualizationFacet) {
  "use strict";

  var _buildVisualizationTitleText = _titleTextHelpers.buildVisualizationTitleText;

  // Cognos setTitle runs once, pre-render (legacy parity): calling it after
  // render reopened the note-editable title in inline-edit mode (2026-07-13).
  function applyPreRenderTitle(_options) {
    var options = _options || {};
    var visualizationFacet = _readVisualizationFacet(options._KDB);
    var titleText;
    try {
      titleText = _buildVisualizationTitleText(options);
      if (!titleText || !visualizationFacet || typeof visualizationFacet.setVisTitle !== "function") {
        return Promise.resolve({ updated: false });
      }
      return Promise.resolve(
        visualizationFacet.setVisTitle(String(options.widgetId), titleText, { signal: options.signal })
      ).then(function (_outcome) {
        if (_outcome && (
          _outcome.outcome === "aborted" ||
          _outcome.aborted === true ||
          _outcome.reason === "aborted" ||
          _outcome.reason === "aborted-after-effect" ||
          _outcome.reason === "disposed"
        )) {
          return { updated: false, aborted: true };
        }
        if (!_outcome || _outcome.ok !== true) {
          return { updated: false };
        }
        return { updated: true, titleText: titleText };
      }).catch(function (err) {
        console.error("[widgetVis.applyPreRenderTitle] setVisTitle failed", options.widgetId, err);
        return { updated: false, error: String(err && err.message ? err.message : err) };
      });
    } catch (err) {
      console.error("[widgetVis.applyPreRenderTitle] setVisTitle failed", options.widgetId, err);
      return Promise.resolve({ updated: false, error: String(err && err.message ? err.message : err) });
    }
  }

  return applyPreRenderTitle;
});

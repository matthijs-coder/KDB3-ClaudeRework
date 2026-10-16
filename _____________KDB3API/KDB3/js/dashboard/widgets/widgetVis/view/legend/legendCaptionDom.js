define([
  "./sanitizeLegendCaptionMutation.js",
  "./mutationNeedsLegendSanitize.js",
  "./matchLegendCaptionHost.js",
  "../../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (
  _sanitizeLegendCaptionMutation,
  _mutationNeedsLegendSanitize,
  _matchLegendCaptionHost,
  _widgetChrome
) {
  "use strict";

  var legend = _widgetChrome.legend.strings;
  var LEGEND_TITLE_SELECTOR = legend.titleSelector;
  var LEGEND_CAPTION_SELECTOR = legend.captionSelector;
  var LEGEND_CAPTION_LEGACY_SELECTOR = legend.captionLegacySelector;
  var LEGEND_OBSERVE_ROOT_SELECTOR = legend.observeRootSelector;
  var INNER_CAPTION_SELECTOR = "." + legend.captionClass;
  var INNER_CAPTION_LEGACY_SELECTOR =
    '[data-visual-item="' + legend.captionDataItem + '"]';

  function pushCaptionEntry(_entries, _seen, _node, _selector, _source) {
    try {
      if (!_node) {
        return;
      }
      var alreadySeen = false;
      for (var j = 0; j < _seen.length; j += 1) {
        if (_seen[j] === _node) {
          alreadySeen = true;
          break;
        }
      }
      if (alreadySeen) {
        return;
      }
      _seen.push(_node);
      _entries.push({
        node: _node,
        selector: _selector,
        source: _source
      });
    } catch (err) {
      console.error("[widgetVis.legendCaptionDom] pushCaptionEntry failed", err);
      throw err;
    }
  }

  function readCaptionSelectorEntries(_queryRoot) {
    try {
      if (_matchLegendCaptionHost.isLegendRootElement(_queryRoot)) {
        return [
          { selector: INNER_CAPTION_SELECTOR, source: "legendCaption" },
          { selector: INNER_CAPTION_LEGACY_SELECTOR, source: "widget.legend.labels" }
        ];
      }
      return [
        { selector: LEGEND_CAPTION_SELECTOR, source: "legendCaption" },
        { selector: LEGEND_CAPTION_LEGACY_SELECTOR, source: "widget.legend.labels" }
      ];
    } catch (err) {
      console.error("[widgetVis.legendCaptionDom] readCaptionSelectorEntries failed", err);
      throw err;
    }
  }

  function collectCaptionEntries(_queryRoot) {
    try {
      var entries = [];
      var seen = [];
      if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
        return entries;
      }
      if (_matchLegendCaptionHost.isLegendCaptionHostElement(_queryRoot)) {
        pushCaptionEntry(entries, seen, _queryRoot, ":scope", "captionHostRoot");
      }
      var selectorEntries = readCaptionSelectorEntries(_queryRoot);
      for (var s = 0; s < selectorEntries.length; s += 1) {
        var selectorEntry = selectorEntries[s];
        var nodes = _queryRoot.querySelectorAll(selectorEntry.selector);
        for (var i = 0; i < nodes.length; i += 1) {
          pushCaptionEntry(
            entries,
            seen,
            nodes[i],
            selectorEntry.selector,
            selectorEntry.source
          );
        }
      }
      return entries;
    } catch (err) {
      console.error("[widgetVis.legendCaptionDom] collectCaptionEntries failed", err);
      throw err;
    }
  }

  return {
    LEGEND_TITLE_SELECTOR: LEGEND_TITLE_SELECTOR,
    LEGEND_OBSERVE_ROOT_SELECTOR: LEGEND_OBSERVE_ROOT_SELECTOR,
    collectCaptionEntries: collectCaptionEntries,
    mutationNeedsLegendSanitize: _mutationNeedsLegendSanitize,
    sanitizeLegendCaptionMutation: _sanitizeLegendCaptionMutation
  };
});

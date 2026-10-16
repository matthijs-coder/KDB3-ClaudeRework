define([
  "./matchLegendCaptionHost.js",
  "../../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_matchLegendCaptionHost, _widgetChrome) {
  "use strict";

  var legend = _widgetChrome.legend.strings;
  var LEGEND_CAPTION_SELECTOR = legend.captionSelector;
  var LEGEND_CAPTION_LEGACY_SELECTOR = legend.captionLegacySelector;
  var LEGEND_OBSERVE_ROOT_SELECTOR = legend.observeRootSelector;
  var LEGEND_CAPTION_DATA_ITEM = legend.captionDataItem;

  function isSvgGraphicsElement(_element) {
    try {
      if (!_element || _element.nodeType !== 1) {
        return false;
      }
      var tagName = String(_element.tagName || "").toLowerCase();
      return tagName === "svg" || tagName === "g" || tagName === "path";
    } catch (err) {
      console.error("[widgetVis.mutationNeedsLegendSanitize] isSvgGraphicsElement failed", err);
      return false;
    }
  }

  function isCaptionOrLegendHost(_element) {
    return _matchLegendCaptionHost.isLegendCaptionHostElement(_element)
      || _matchLegendCaptionHost.isLegendRootElement(_element);
  }

  function addedElementContainsLegendTarget(_element) {
    try {
      if (!_element || typeof _element.querySelector !== "function") {
        return false;
      }
      return !!(
        _element.querySelector(LEGEND_OBSERVE_ROOT_SELECTOR)
        || _element.querySelector(LEGEND_CAPTION_SELECTOR)
        || _element.querySelector(LEGEND_CAPTION_LEGACY_SELECTOR)
      );
    } catch (err) {
      console.error("[widgetVis.mutationNeedsLegendSanitize] addedElementContainsLegendTarget failed", err);
      return false;
    }
  }

  function nodeListHasLegendMutationTarget(_nodes) {
    try {
      if (!_nodes || !_nodes.length) {
        return false;
      }
      for (var i = 0; i < _nodes.length; i += 1) {
        var node = _nodes[i];
        if (!node || node.nodeType !== 1) {
          continue;
        }
        if (isCaptionOrLegendHost(node)) {
          return true;
        }
        if (isSvgGraphicsElement(node)) {
          continue;
        }
        if (addedElementContainsLegendTarget(node)) {
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("[widgetVis.mutationNeedsLegendSanitize] nodeListHasLegendMutationTarget failed", err);
      return false;
    }
  }

  function attributeTargetNeedsCaptionSanitize(_target) {
    try {
      if (!_target || _target.nodeType !== 1) {
        return false;
      }
      if (isCaptionOrLegendHost(_target)) {
        return true;
      }
      if (typeof _target.querySelector !== "function" || isSvgGraphicsElement(_target)) {
        return false;
      }
      return !!(
        _target.querySelector(':scope > [data-visual-item="' + LEGEND_CAPTION_DATA_ITEM + '"]')
        || _target.querySelector(":scope > ." + legend.captionClass)
      );
    } catch (err) {
      console.error("[widgetVis.mutationNeedsLegendSanitize] attributeTargetNeedsCaptionSanitize failed", err);
      return false;
    }
  }

  function mutationNeedsLegendSanitize(_mutation) {
    try {
      if (!_mutation) {
        return false;
      }
      if (_mutation.type === "characterData") {
        var parentElement = _mutation.target && _mutation.target.parentElement
          ? _mutation.target.parentElement
          : null;
        return _matchLegendCaptionHost.isLegendCaptionHostElement(parentElement);
      }
      if (_mutation.type === "childList") {
        if (isCaptionOrLegendHost(_mutation.target)) {
          return true;
        }
        return nodeListHasLegendMutationTarget(_mutation.addedNodes)
          || nodeListHasLegendMutationTarget(_mutation.removedNodes);
      }
      if (_mutation.type === "attributes" && _mutation.attributeName === "id") {
        return attributeTargetNeedsCaptionSanitize(_mutation.target);
      }
      return false;
    } catch (err) {
      console.error("[widgetVis.mutationNeedsLegendSanitize] failed", err);
      return false;
    }
  }

  return mutationNeedsLegendSanitize;
});

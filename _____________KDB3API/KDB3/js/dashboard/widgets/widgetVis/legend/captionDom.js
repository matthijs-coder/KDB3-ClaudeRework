define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var legend = _widgetChrome.legend.strings;
  var LEGEND_TITLE_SELECTOR = legend.titleSelector;
  var LEGEND_CAPTION_SELECTOR = legend.captionSelector;
  var LEGEND_CAPTION_LEGACY_SELECTOR = legend.captionLegacySelector;
  var LEGEND_OBSERVE_ROOT_SELECTOR = legend.observeRootSelector;
  var INNER_CAPTION_SELECTOR = "." + legend.captionClass;
  var INNER_CAPTION_LEGACY_SELECTOR = '[data-visual-item="' + legend.captionDataItem + '"]';
  var CHILD_CAPTION_DATA_ITEM_SELECTOR = ":scope > " + INNER_CAPTION_LEGACY_SELECTOR;
  var CHILD_CAPTION_CLASS_SELECTOR = ":scope > " + INNER_CAPTION_SELECTOR;

  function isLegendCaptionHostElement(_element) {
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
    return _element.getAttribute("data-visual-item") === legend.captionDataItem;
  }

  function isLegendRootElement(_element) {
    if (!_element || _element.nodeType !== 1 || typeof _element.matches !== "function") {
      return false;
    }
    return _element.matches(LEGEND_OBSERVE_ROOT_SELECTOR);
  }

  function isCaptionOrLegendHost(_element) {
    return isLegendCaptionHostElement(_element) || isLegendRootElement(_element);
  }

  function isSvgGraphicsElement(_element) {
    var tagName = String(_element.tagName || "").toLowerCase();
    return tagName === "svg" || tagName === "g" || tagName === "path";
  }

  function readCaptionChild(_target) {
    if (!_target || typeof _target.querySelector !== "function") {
      return null;
    }
    return _target.querySelector(CHILD_CAPTION_DATA_ITEM_SELECTOR) || _target.querySelector(CHILD_CAPTION_CLASS_SELECTOR);
  }

  function containsLegendTarget(_element) {
    if (!_element || typeof _element.querySelector !== "function") {
      return false;
    }
    return !!(
      _element.querySelector(LEGEND_OBSERVE_ROOT_SELECTOR)
      || _element.querySelector(LEGEND_CAPTION_SELECTOR)
      || _element.querySelector(LEGEND_CAPTION_LEGACY_SELECTOR)
    );
  }

  function nodeListHasLegendTarget(_nodes) {
    if (!_nodes || !_nodes.length) {
      return false;
    }
    var index;
    for (index = 0; index < _nodes.length; index += 1) {
      var node = _nodes[index];
      if (!node || node.nodeType !== 1) {
        continue;
      }
      if (isCaptionOrLegendHost(node)) {
        return true;
      }
      if (!isSvgGraphicsElement(node) && containsLegendTarget(node)) {
        return true;
      }
    }
    return false;
  }

  function attributeTargetNeedsSanitize(_target) {
    if (!_target || _target.nodeType !== 1) {
      return false;
    }
    if (isCaptionOrLegendHost(_target)) {
      return true;
    }
    return typeof _target.querySelector === "function" && !isSvgGraphicsElement(_target) && !!readCaptionChild(_target);
  }

  function mutationNeedsLegendSanitize(_mutation) {
    if (!_mutation) {
      return false;
    }
    if (_mutation.type === "characterData") {
      var parentElement = _mutation.target && _mutation.target.parentElement ? _mutation.target.parentElement : null;
      return isLegendCaptionHostElement(parentElement);
    }
    if (_mutation.type === "childList") {
      return isCaptionOrLegendHost(_mutation.target)
        || nodeListHasLegendTarget(_mutation.addedNodes)
        || nodeListHasLegendTarget(_mutation.removedNodes);
    }
    if (_mutation.type === "attributes" && _mutation.attributeName === "id") {
      return attributeTargetNeedsSanitize(_mutation.target);
    }
    return false;
  }

  function collectCaptionEntries(_queryRoot) {
    var entries = [];
    if (!_queryRoot || typeof _queryRoot.querySelectorAll !== "function") {
      return entries;
    }
    var seen = [];
    function pushEntry(_node, _selector, _source) {
      if (_node && seen.indexOf(_node) === -1) {
        seen.push(_node);
        entries.push({ node: _node, selector: _selector, source: _source });
      }
    }
    if (isLegendCaptionHostElement(_queryRoot)) {
      pushEntry(_queryRoot, ":scope", "captionHostRoot");
    }
    var selectorEntries = isLegendRootElement(_queryRoot)
      ? [
        { selector: INNER_CAPTION_SELECTOR, source: "legendCaption" },
        { selector: INNER_CAPTION_LEGACY_SELECTOR, source: "widget.legend.labels" }
      ]
      : [
        { selector: LEGEND_CAPTION_SELECTOR, source: "legendCaption" },
        { selector: LEGEND_CAPTION_LEGACY_SELECTOR, source: "widget.legend.labels" }
      ];
    selectorEntries.forEach(function (_entry) {
      var nodes = _queryRoot.querySelectorAll(_entry.selector);
      var index;
      for (index = 0; index < nodes.length; index += 1) {
        pushEntry(nodes[index], _entry.selector, _entry.source);
      }
    });
    return entries;
  }

  return {
    LEGEND_TITLE_SELECTOR: LEGEND_TITLE_SELECTOR,
    isLegendCaptionHostElement: isLegendCaptionHostElement,
    readCaptionChild: readCaptionChild,
    mutationNeedsLegendSanitize: mutationNeedsLegendSanitize,
    collectCaptionEntries: collectCaptionEntries
  };
});

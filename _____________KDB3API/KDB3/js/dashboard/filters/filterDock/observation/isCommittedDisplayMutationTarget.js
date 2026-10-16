define(["../../../../core/cognosHost/config/filterDockChromeSelectors.js"], function (_filterDockChrome) {
  "use strict";

  var COMMITTED_DISPLAY_SELECTORS = _filterDockChrome.filterDock.strings.committedDisplayMatchSelector;

  function readElement(_node) {
    if (!_node) {
      return null;
    }
    if (_node.nodeType === 1) {
      return _node;
    }
    return _node.parentElement || null;
  }

  function __controller(_node) {
    var element = readElement(_node);
    if (!element) {
      return false;
    }
    if (typeof element.matches === "function" && element.matches(COMMITTED_DISPLAY_SELECTORS)) {
      return true;
    }
    if (typeof element.closest === "function" && element.closest(COMMITTED_DISPLAY_SELECTORS)) {
      return true;
    }
    return !!(
      typeof element.querySelector === "function" &&
      element.querySelector(COMMITTED_DISPLAY_SELECTORS)
    );
  }

  return __controller;
});

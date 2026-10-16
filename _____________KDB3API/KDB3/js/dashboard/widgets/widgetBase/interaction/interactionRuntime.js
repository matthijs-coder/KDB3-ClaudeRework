define([
  "../runtime.js",
  "../../../../core/cognosHost/config/pageChromeSelectors.js"
], function (_runtime, _pageChrome) {
  "use strict";

  function getJQuery() {
    return typeof window !== "undefined" && window.jQuery ? window.jQuery : null;
  }

  function readPageTemplateSelector(_KDB) {
    var selectors = _KDB && _KDB.elements && _KDB.elements.selectors ? _KDB.elements.selectors.dragDrop : null;
    return selectors && selectors.pageTemplateSelector
      ? selectors.pageTemplateSelector
      : _pageChrome.dragDrop.strings.pageTemplateSelector;
  }

  // Runs inside jQuery UI start/stop callbacks and teardown paths: a failure logs and leaves the grid as is.
  function toggleGridOverlay(_shellEl, _shouldShow, _KDB) {
    try {
      var selector = readPageTemplateSelector(_KDB);
      if (!selector) {
        return;
      }
      var pageEls = document.querySelectorAll(selector);
      for (var index = 0; index < pageEls.length; index += 1) {
        if (_shouldShow) {
          pageEls[index].classList.add("KDB_absoluteLayoutGrid");
        } else {
          pageEls[index].classList.remove("KDB_absoluteLayoutGrid");
        }
      }
    } catch (err) {
      console.error("[widgetBase.toggleGridOverlay] failed", err);
    }
  }

  function ensureInteractionRuntime(_KDB, _widgetId, _interactionKey, _defaultBucket) {
    _runtime.ensureWidgetBaseWidgetRuntime(_KDB, _widgetId);
    var runtime = _KDB.runtime.widgetBase.byId[_widgetId];
    runtime.interaction = runtime.interaction || {};
    runtime.interaction[_interactionKey] = runtime.interaction[_interactionKey] || _defaultBucket;
    return runtime;
  }

  function readInteractionRuntime(_KDB, _widgetId) {
    var byId = _KDB.runtime && _KDB.runtime.widgetBase && _KDB.runtime.widgetBase.byId;
    return byId ? byId[_widgetId] : null;
  }

  function resolveMinSize(_widgetType) {
    if (_widgetType === "text" || _widgetType === "WIDGET.TEXT") {
      return { minWidth: 100, minHeight: 50 };
    }
    return { minWidth: 300, minHeight: 300 };
  }

  return {
    getJQuery: getJQuery,
    toggleGridOverlay: toggleGridOverlay,
    ensureInteractionRuntime: ensureInteractionRuntime,
    readInteractionRuntime: readInteractionRuntime,
    resolveMinSize: resolveMinSize
  };
});

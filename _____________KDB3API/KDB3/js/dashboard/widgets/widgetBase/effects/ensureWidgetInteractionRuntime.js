define([
  "../state/ensureWidgetBaseRuntime.js",
  "../../../../core/cognosHost/config/pageChromeSelectors.js"
], function (_ensureWidgetBaseRuntime, _pageChrome) {
  function getJQuery() {
    return typeof window !== "undefined" && window.jQuery ? window.jQuery : null;
  }

  function readPageTemplateSelector(_KDB) {
    const selectors = _KDB && _KDB.elements && _KDB.elements.selectors
      ? _KDB.elements.selectors.dragDrop
      : null;
    return selectors && selectors.pageTemplateSelector
      ? selectors.pageTemplateSelector
      : _pageChrome.dragDrop.strings.pageTemplateSelector;
  }

  function toggleGridOverlay(shellEl, shouldShow, _KDB) {
    try {
      const selector = readPageTemplateSelector(_KDB);
      if (!selector) {
        return;
      }
      const pageEls = document.querySelectorAll(selector);
      let index;
      for (index = 0; index < pageEls.length; index += 1) {
        if (shouldShow) {
          pageEls[index].classList.add("KDB_absoluteLayoutGrid");
        } else {
          pageEls[index].classList.remove("KDB_absoluteLayoutGrid");
        }
      }
    } catch (error) {
      console.error("[widgetBase.toggleGridOverlay] failed", error);
    }
  }

  function ensureInteractionRuntime(_KDB, widgetId, interactionKey, defaultBucket) {
    _ensureWidgetBaseRuntime.ensureWidgetBaseWidgetRuntime(_KDB, widgetId);
    const runtime = _KDB.runtime.widgetBase.byId[widgetId];
    runtime.interaction = runtime.interaction || {};
    runtime.interaction[interactionKey] = runtime.interaction[interactionKey] || defaultBucket;
    return runtime;
  }

  function resolveMinSize(widgetType) {
    if (widgetType === "text" || widgetType === "WIDGET.TEXT") {
      return { minWidth: 100, minHeight: 50 };
    }
    return { minWidth: 300, minHeight: 300 };
  }

  return { getJQuery: getJQuery, toggleGridOverlay: toggleGridOverlay, ensureInteractionRuntime: ensureInteractionRuntime, resolveMinSize: resolveMinSize };
});

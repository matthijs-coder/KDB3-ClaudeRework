define(["../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var widget = _widgetChrome.widget.strings;
  var CONTENT_ROOT_SELECTOR = widget.bemContentSelector + ", [data-kdb-widget-content]";

  function resolveWidgetShell(_widgetId) {
    var id = String(_widgetId);
    return document.getElementById(id) || document.querySelector('[data-kdb-widget-id="' + id + '"]');
  }

  function resolveVisualizationContent(_widgetId) {
    try {
      var shell = resolveWidgetShell(_widgetId);
      if (!shell) {
        return { contentEl: null, headerEl: null, titleLinkEl: null };
      }
      var contentEl = shell.querySelector(widget.bemContentSelector + ", [data-kdb-widget-content]") || shell;
      var bemHeaderEl = shell.querySelector(widget.bemHeaderSelector + ", [data-kdb-widget-header]");
      var headerEl = shell.querySelector(widget.widgetHeaderSelector) || bemHeaderEl || null;
      var titleLinkEl = bemHeaderEl
        ? bemHeaderEl.querySelector(widget.bemTitleSelector + ", [data-kdb-widget-title]")
        : null;
      return { contentEl: contentEl, headerEl: headerEl, titleLinkEl: titleLinkEl };
    } catch (err) {
      console.error("[widgetVis.resolveVisualizationContent] failed", _widgetId, err);
      return { contentEl: null, headerEl: null, titleLinkEl: null };
    }
  }

  function resolveQueryRoot(_runtime, _widgetId) {
    var domRefs = (_runtime && _runtime.domRefs) || {};
    if (domRefs.contentEl) {
      return domRefs.contentEl;
    }
    var resolved = resolveVisualizationContent(_widgetId);
    if (_runtime) {
      _runtime.domRefs = Object.assign({}, domRefs, resolved);
    }
    return resolved.contentEl || null;
  }

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

  return {
    resolveWidgetShell: resolveWidgetShell,
    resolveVisualizationContent: resolveVisualizationContent,
    resolveQueryRoot: resolveQueryRoot,
    isVisualizationContentRoot: isVisualizationContentRoot
  };
});

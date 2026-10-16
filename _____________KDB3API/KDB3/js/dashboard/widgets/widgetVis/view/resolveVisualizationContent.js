define(["../../../../core/cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var widget = _widgetChrome.widget.strings;

  function resolveVisualizationContent(_widgetId) {
    try {
      var id = String(_widgetId);
      var shell = document.getElementById(id);
      if (!shell) {
        shell = document.querySelector('[data-kdb-widget-id="' + id + '"]');
      }
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

  return resolveVisualizationContent;
});

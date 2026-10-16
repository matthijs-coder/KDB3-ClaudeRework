define([
  "../dom.js"
], function (_dom) {
  "use strict";

  function resolveLegendQueryRoot(_runtime, _widgetId) {
    try {
      var resolved = _dom.resolveVisualizationContent(_widgetId);
      var contentEl = resolved && resolved.contentEl ? resolved.contentEl : null;
      if (!contentEl) {
        return { queryRoot: null, skipReason: "no_query_root", isShell: false };
      }
      var isShell = !_dom.isVisualizationContentRoot(contentEl);
      if (_runtime && isShell !== true) {
        var domRefs = _runtime.domRefs || {};
        _runtime.domRefs = Object.assign({}, domRefs, {
          contentEl: contentEl,
          headerEl: resolved.headerEl != null ? resolved.headerEl : domRefs.headerEl,
          titleLinkEl: resolved.titleLinkEl != null ? resolved.titleLinkEl : domRefs.titleLinkEl
        });
      }
      return { queryRoot: contentEl, skipReason: null, isShell: isShell };
    } catch (err) {
      console.error("[widgetVis.resolveLegendQueryRoot] failed", _widgetId, err);
      return { queryRoot: null, skipReason: "resolve_failed", isShell: false };
    }
  }

  return resolveLegendQueryRoot;
});

define([
  "./resolveVisualizationContent.js"
], function (_resolveVisualizationContent) {
  "use strict";

  function resolveQueryRoot(_runtime, _widgetId) {
    var domRefs = (_runtime && _runtime.domRefs) || {};
    if (domRefs.contentEl) {
      return domRefs.contentEl;
    }
    var resolved = _resolveVisualizationContent(_widgetId);
    if (_runtime) {
      _runtime.domRefs = Object.assign({}, domRefs, resolved);
    }
    return resolved.contentEl || null;
  }

  return resolveQueryRoot;
});

define([
  "../config/defaults.js",
  "./resolveTextEditableNodes.js"
], function (_defaults, _resolveTextEditableNodes) {
  function __controller(_KDB, _widgetId, _shellEl, _contentEl) {
    try {
      if (!_shellEl || !_contentEl) {
        return null;
      }
      var wrapper = _shellEl.querySelector(_defaults.contentWrapperSelector);
      var mountTarget = wrapper || _shellEl;
      var existingStatic = mountTarget.querySelector(_defaults.staticContentSelector);
      if (!existingStatic) {
        mountTarget.appendChild(_contentEl);
      }
      return _resolveTextEditableNodes(_KDB, _widgetId, _shellEl);
    } catch (err) {
      console.error("[widgetText.placeTextContentDom] failed", { widgetId: _widgetId }, err);
      return null;
    }
  }
  return __controller;
});

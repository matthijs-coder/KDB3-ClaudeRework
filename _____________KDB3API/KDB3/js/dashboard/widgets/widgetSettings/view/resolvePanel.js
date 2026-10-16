define([
  "../config/selectors.js",
  "./resolveRenderRoot.js"
], function (_selectors, _resolveRenderRoot) {
  function __controller(_KDB, _widgetId) {
    const widgetId = String(_widgetId || "");
    const runtime = _KDB.runtime && _KDB.runtime.widgetSettings;
    const domRefs = runtime && runtime.domRefs ? runtime.domRefs[widgetId] : null;
    if (domRefs && domRefs.panel) {
      return domRefs.panel;
    }
    const root = _resolveRenderRoot(_KDB);
    if (!root || typeof root.querySelector !== "function") {
      return null;
    }
    return root.querySelector(_selectors.panelRootSelectorFor(widgetId));
  }

  return __controller;
});

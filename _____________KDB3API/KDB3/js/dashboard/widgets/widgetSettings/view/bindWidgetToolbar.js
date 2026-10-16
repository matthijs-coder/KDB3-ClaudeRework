define([
  "../config/selectors.js",
  "./closeVisibleDropdowns.js"
], function (_selectors, _closeVisibleDropdowns) {
  function __controller(_KDB, _context) {
    try {
      const toolbar = _context.toolbarEl;
      const widgetId = String(_context.widgetId || "");
      const runtime = _KDB.runtime.widgetSettings;
      const controllerKey = "toolbar:" + widgetId;
      if (!toolbar || toolbar.getAttribute(_selectors.toolbarBoundAttr) === "1") {
        return false;
      }
      if (runtime.abortControllers[controllerKey]) {
        runtime.abortControllers[controllerKey].abort();
      }
      runtime.abortControllers[controllerKey] = new AbortController();
      toolbar.setAttribute(_selectors.toolbarAttr, widgetId);
      toolbar.addEventListener("click", onToolbarClick, { signal: runtime.abortControllers[controllerKey].signal });
      toolbar.setAttribute(_selectors.toolbarBoundAttr, "1");
      return true;
    } catch (err) {
      console.error("[widgetSettings.bindWidgetToolbar] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  function onToolbarClick(_event) {
    let widgetId = "";
    try {
      const toolbar = _event.currentTarget;
      widgetId = toolbar.getAttribute(_selectors.toolbarAttr) || "";
      const widgetEl = resolveWidgetEl(toolbar, widgetId);
      if (!widgetEl) {
        return;
      }
      const panel = widgetEl.querySelector(_selectors.panelRootSelectorFor(widgetId)) || widgetEl.querySelector(_selectors.panelRootSelector);
      if (!panel) {
        return;
      }
      panel.classList.toggle(_selectors.visibleClass);
      if (!panel.classList.contains(_selectors.visibleClass)) {
        _closeVisibleDropdowns(panel, { resetTransform: false });
      }
    } catch (err) {
      console.error("[widgetSettings.onToolbarClick] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  function resolveWidgetEl(toolbar, widgetId) {
    try {
      let current = toolbar;
      while (current) {
        if (current.id === widgetId || (current.getAttribute && current.getAttribute(_selectors.widgetIdAttr) === widgetId)) {
          return current;
        }
        current = current.parentNode;
      }
      return null;
    } catch (err) {
      console.error("[widgetSettings.resolveToolbarWidgetEl] failed", { widgetId: widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

define([
  "../config/selectors.js",
  "./buildWidgetToolbar.js"
], function (_selectors, _buildWidgetToolbar) {
  function __controller(_KDB, _context) {
    try {
      const widgetEl = _context.widgetEl;
      const widgetId = String(_context.widgetId || "");
      const existing = widgetEl.querySelector(_selectors.toolbarSelectorFor(widgetId));
      if (existing) {
        return existing;
      }
      const toolbar = _buildWidgetToolbar(_KDB, _context);
      if (window.getComputedStyle(widgetEl).position === "static") {
        widgetEl.style.position = "relative";
      }
      const header = widgetEl.querySelector(_selectors.contentWrapperHeaderSelector) || widgetEl.querySelector(_selectors.widgetHeaderSelector);
      let icons = header ? header.querySelector(_selectors.widgetIconsSelector) : null;
      if (!icons && header) {
        icons = document.createElement("div");
        icons.className = _selectors.widgetIconsClassName;
        header.appendChild(icons);
      }
      if (icons && typeof icons.insertAdjacentElement === "function") {
        icons.insertAdjacentElement("afterbegin", toolbar);
      } else if (header) {
        header.appendChild(toolbar);
      } else {
        widgetEl.appendChild(toolbar);
      }
      return toolbar;
    } catch (err) {
      console.error("[widgetSettings.placeWidgetToolbar] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

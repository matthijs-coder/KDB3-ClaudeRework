define([
  "../config/selectors.js",
  "./buildWidgetSettingsPanel.js",
  "./stampPanelVisType.js",
  "../effects/startWidgetRenderLoading.js"
], function (_selectors, _buildWidgetSettingsPanel, _stampPanelVisType, _startWidgetRenderLoading) {
  function __controller(_KDB, _context) {
    try {
      const widgetEl = _context.widgetEl;
      const widgetId = String(_context.widgetId || "");
      const existing = widgetEl.querySelector(_selectors.panelRootSelectorFor(widgetId));
      let contentWrap;
      let panel;
      if (existing) {
        return existing;
      }
      if (window.getComputedStyle(widgetEl).position === "static") {
        widgetEl.style.position = "relative";
      }
      panel = _buildWidgetSettingsPanel(_KDB, _context);
      _stampPanelVisType(_KDB, panel);
      contentWrap = widgetEl.querySelector(_selectors.contentWrapperSelector);
      if (contentWrap && typeof contentWrap.insertAdjacentElement === "function") {
        contentWrap.insertAdjacentElement("afterbegin", panel);
      } else {
        widgetEl.appendChild(panel);
      }
      _startWidgetRenderLoading(_KDB, _context);
      return panel;
    } catch (err) {
      console.error("[widgetSettings.placeWidgetSettingsPanel] failed", { widgetId: _context && _context.widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

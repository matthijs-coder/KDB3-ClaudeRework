define([
  "../config/selectors.js",
  "../config/dropdownDefaults.js",
  "../state/ensureWidgetSettingsByWidget.js",
  "./markPanelOption.js"
], function (_selectors, _dropdownDefaults, _ensureByWidget, _markPanelOption) {
  "use strict";

  function __controller(_KDB, _widgetId) {
    try {
      const widgetId = String(_widgetId || "");
      const focusPanel = document.querySelector(_selectors.byAttr(_selectors.focusPanelRootAttr, widgetId));
      const record = focusPanel && widgetId ? _ensureByWidget(_KDB, widgetId) : null;
      if (!focusPanel) {
        return;
      }
      _markPanelOption(focusPanel, "dimension", record && record.dimension != null && String(record.dimension).trim() !== "" ? String(record.dimension) : "none", ".KDB_dimensionsContainer");
      _markPanelOption(focusPanel, "topN", record && record.topNChoice != null && String(record.topNChoice).trim() !== "" ? String(record.topNChoice) : String(_dropdownDefaults.topN.useValue || "none"), ".KDB_topNContainer");
    } catch (err) {
      console.error("[widgetSettings.markFocusDimensionAndTopNFromRecord] failed", { widgetId: _widgetId }, err);
      throw err;
    }
  }

  return __controller;
});

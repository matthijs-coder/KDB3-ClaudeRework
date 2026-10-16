define([
  "./createFrameworkElement",
  "./createExpandableSection",
  "./fillDashboardSettings",
  "./fillGraphSettings",
  "./fillCommentSettings",
  "./fillControlPanelSettings",
], function (
  _createFrameworkElement,
  _createExpandableSection,
  _fillDashboardSettings,
  _fillGraphSettings,
  _fillCommentSettings,
  _fillControlPanelSettings
) {
  "use strict";
  function buildSettingsBlock(_KDB) {
    try {
      var settings = _createFrameworkElement("div", "kdb-control_settings_container", "kdb-control__panel kdb-control__panel-settings", null);
      settings.appendChild(_createExpandableSection("settingsDashboard", "Dashboard", _fillDashboardSettings, _KDB));
      settings.appendChild(_createExpandableSection("settingsCharts", "Diagramme", _fillGraphSettings, _KDB));
      settings.appendChild(_createExpandableSection("settingsComments", "Kommentare", _fillCommentSettings, _KDB));
      settings.appendChild(_createExpandableSection("settingsControlPanel", "Steuerungspanel", _fillControlPanelSettings, _KDB));
      return settings;
    } catch (err) {
      console.error("[kdbControl.buildSettingsBlock] failed", err);
      throw err;
    }
  }
  return buildSettingsBlock;
});

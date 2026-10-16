define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
  "../settings/config/settingsDimensionConfig",
  "./appendTwoInputSplit",
  "./appendSettingsChromeBlock",
  "./buildDimensionInputs",
], function (
  _createFrameworkElement,
  _primitiveGallery,
  _dimCfg,
  _appendTwoInputSplit,
  _appendSettingsChromeBlock,
  _buildDimensionInputs
) {
  "use strict";
  function fillDashboardSettings(body, _KDB) {
    try {
      var P = _primitiveGallery;
      body.classList.add("kdb-control_settings-body--dashboard");
      body.appendChild(_buildDimensionInputs(_dimCfg.dashboard.width, _dimCfg.dashboard.height, "dashboardWidth", "dashboardHeight"));
      var r2 = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row kdb-control_settings-inline-row--dashboard-row2", null);
      var suToggle = P.createToggleSwitch(
        "",
        "dashboard.developerMode.toggle",
        false,
        "Entwicklermodus"
      );
      suToggle.setAttribute("title", "Entwicklermodus");
      var suTogglePair = _createFrameworkElement("div", null, "kdb-control_dashboard-toggle-pair", null);
      suTogglePair.appendChild(suToggle);
      var suCol = _appendSettingsChromeBlock("Entwicklermodus", suTogglePair);
      suCol.classList.add(
        "kdb-control_dashboard-toggles-column",
        "kdb-control_dashboard-toggles-column--developer-mode-gated"
      );
      _appendTwoInputSplit(r2, P.createColorInput("Hintergrundfarbe", "dashboardBg", _KDB), suCol);
      body.appendChild(r2);
    } catch (err) {
      console.error("[kdbControl.fillDashboardSettings] failed", err);
      throw err;
    }
  }
  return fillDashboardSettings;
});

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
  function readConfigImageSrc(_KDB, key, fallback) {
    try {
      var o = _KDB && _KDB.config && _KDB.config.options;
      if (o && typeof o[key] === "string" && o[key]) return o[key];
      return fallback;
    } catch (err) {
      console.error("[kdbControl.fillGraphSettings] readConfigImageSrc failed", err);
      throw err;
    }
  }
  function fillGraphSettings(body, _KDB) {
    try {
      var P = _primitiveGallery;
      body.appendChild(_buildDimensionInputs(_dimCfg.visualization.width, _dimCfg.visualization.height, "graphWidth", "graphHeight"));
      var rBgChrome = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row kdb-control_diagram-bg-chrome-row", null);
      var settingsGlyphSrc = readConfigImageSrc(_KDB, "kdbControlHeaderIconSettingsSrc", "v1/ext/KDB3/images/settings.svg");
      var togglePair = _createFrameworkElement("div", null, "kdb-control_dashboard-toggle-pair", null);
      togglePair.appendChild(P.createToggleSwitchWithIcon(settingsGlyphSrc, "Settings-Buttons verstecken", "dashboard.settingsButtons.toggle", false));
      var toggleCol = _appendSettingsChromeBlock("Buttons verstecken", togglePair);
      toggleCol.classList.add("kdb-control_dashboard-toggles-column", "kdb-control_dashboard-toggles-column--diagram-chrome");
      _appendTwoInputSplit(rBgChrome, P.createColorInput("Hintergrundfarbe", "graphBg", _KDB), toggleCol);
      body.appendChild(rBgChrome);
    } catch (err) {
      console.error("[kdbControl.fillGraphSettings] failed", err);
      throw err;
    }
  }
  return fillGraphSettings;
});

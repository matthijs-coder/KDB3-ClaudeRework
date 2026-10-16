define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
  "./appendTwoInputSplit",
], function (_createFrameworkElement, _primitiveGallery, _appendTwoInputSplit) {
  "use strict";
  function fillControlPanelSettings(body, _KDB) {
    try {
      var P = _primitiveGallery;
      var r1 = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row", null);
      var cap = _createFrameworkElement("div", null, "kdb-control_subheading", null);
      cap.textContent = "Farbe:";
      r1.appendChild(cap);
      _appendTwoInputSplit(r1, P.createColorInput("Hintergrund", "panelBg", _KDB), P.createColorInput("Innere Räumen", "panelInnerBg", _KDB));
      body.appendChild(r1);
      var r2 = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row", null);
      _appendTwoInputSplit(r2, P.createColorInput("Buttons", "panelButton", _KDB), P.createColorInput("Aktionsbuttons", "panelActionButton", _KDB));
      body.appendChild(r2);
    } catch (err) {
      console.error("[kdbControl.fillControlPanelSettings] failed", err);
      throw err;
    }
  }
  return fillControlPanelSettings;
});

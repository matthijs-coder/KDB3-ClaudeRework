define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
  "./appendTwoInputSplit",
], function (_createFrameworkElement, _primitiveGallery, _appendTwoInputSplit) {
  "use strict";
  function dimensionMinPlaceholder(axis) {
    try {
      var s = axis && axis.minimum != null ? String(axis.minimum).trim() : "";
      return s.length ? "Min. " + s : "";
    } catch (err) {
      console.error("[kdbControl.buildDimensionInputs] dimensionMinPlaceholder failed", err);
      throw err;
    }
  }
  function buildDimensionInputs(widthAxis, heightAxis, widthId, heightId) {
    try {
      var P = _primitiveGallery;
      var r = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_twoinput-row", null);
      _appendTwoInputSplit(
        r,
        P.createTextInputRow("Breite", dimensionMinPlaceholder(widthAxis), widthId, widthAxis.default),
        P.createTextInputRow("Höhe", dimensionMinPlaceholder(heightAxis), heightId, heightAxis.default)
      );
      return r;
    } catch (err) {
      console.error("[kdbControl.buildDimensionInputs] failed", err);
      throw err;
    }
  }
  return buildDimensionInputs;
});

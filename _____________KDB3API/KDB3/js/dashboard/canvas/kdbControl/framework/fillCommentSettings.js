define([
  "./createFrameworkElement",
  "./buildControlPrimitiveGallery",
  "../settings/config/settingsDimensionConfig",
  "./buildDimensionInputs",
], function (_createFrameworkElement, _primitiveGallery, _dimCfg, _buildDimensionInputs) {
  "use strict";
  function fillCommentSettings(body, _KDB) {
    try {
      body.appendChild(_buildDimensionInputs(_dimCfg.comment.width, _dimCfg.comment.height, "commentWidth", "commentHeight"));
      var rColor = _createFrameworkElement("div", null, "kdb-control_settings-inline-row kdb-control_oneinput-row", null);
      rColor.appendChild(_primitiveGallery.createColorInput("Hintergrundfarbe", "commentBg", _KDB));
      body.appendChild(rColor);
    } catch (err) {
      console.error("[kdbControl.fillCommentSettings] failed", err);
      throw err;
    }
  }
  return fillCommentSettings;
});

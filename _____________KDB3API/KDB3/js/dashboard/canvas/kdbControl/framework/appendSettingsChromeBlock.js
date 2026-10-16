define(["./createFrameworkElement"], function (_createFrameworkElement) {
  "use strict";
  function appendSettingsChromeBlock(captionText, innerControl) {
    try {
      var wrap = _createFrameworkElement("div", null, "kdb-control_settings-chrome-block", null);
      var lab = _createFrameworkElement("div", null, "kdb-control_input-label", null);
      lab.textContent = captionText;
      wrap.appendChild(lab);
      wrap.appendChild(innerControl);
      return wrap;
    } catch (err) {
      console.error("[kdbControl.appendSettingsChromeBlock] failed", err);
      throw err;
    }
  }
  return appendSettingsChromeBlock;
});

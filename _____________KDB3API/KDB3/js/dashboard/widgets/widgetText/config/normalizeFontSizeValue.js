define(["./defaults.js"], function (_defaults) {
  function normalizeFontSizeValue(_value) {
    var raw = _value == null ? "" : String(_value).trim();
    if (!raw || raw === "default" || raw === "Default" || raw === "Automatic" || raw === "automatic" || raw === "auto") {
      return { ok: true, isAutomatic: true, cognosValue: "auto", settingsValue: _defaults.automaticFontSize };
    }
    var normalized = raw.replace(/;$/, "");
    var match = /^([1-9][0-9]{0,2})(px)?$/.exec(normalized);
    if (match) {
      return {
        ok: true,
        isAutomatic: false,
        pixelValue: match[1],
        cssValue: match[1] + "px",
        cognosValue: match[1],
        settingsValue: match[1] + "px"
      };
    }
    return { ok: false, errorCode: "WIDGET_TEXT_FONT_VALUE_INVALID" };
  }

  return normalizeFontSizeValue;
});

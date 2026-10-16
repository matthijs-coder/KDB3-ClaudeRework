define(["../runtime/ensureWidgetRuntime.js", "../config/defaults.js"], function (_ensureWidgetRuntime, _defaults) {
  function applyReadableTextColor(_KDB, _widgetId, _textColor) {
    try {
      var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
      var styleEl = ensureStyleElement(runtime, _widgetId);
      var widgetSelector = "#" + escapeCssIdentifier(_widgetId);
      styleEl.textContent = widgetSelector + " " + _defaults.editableSelector + ", "
        + widgetSelector + " p, "
        + widgetSelector + " span { color: " + _textColor + " !important; }";
      return { ok: true, styleElementId: styleEl.id };
    } catch (err) {
      console.error("[widgetText.applyReadableTextColor] failed", { widgetId: _widgetId }, err);
      return { ok: false, errorCode: "WIDGET_TEXT_COLOR_APPLY_FAILED", errorMessage: String(err && err.message ? err.message : err) };
    }
  }

  function ensureStyleElement(_runtime, _widgetId) {
    _runtime.styleElements = _runtime.styleElements || {};
    if (_runtime.styleElements.textColor && _runtime.styleElements.textColor.parentNode) {
      return _runtime.styleElements.textColor;
    }
    var existing = document.getElementById(styleElementId(_widgetId));
    if (existing) {
      _runtime.styleElements.textColor = existing;
      return existing;
    }
    var styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.id = styleElementId(_widgetId);
    styleEl.setAttribute("data-kdb-widget-text-color", String(_widgetId || ""));
    document.head.appendChild(styleEl);
    _runtime.styleElements.textColor = styleEl;
    return styleEl;
  }

  function sanitizeElementId(_value) {
    return String(_value || "").replace(/[^A-Za-z0-9_-]/g, "_");
  }

  function styleElementId(_widgetId) {
    return "KDB_widgetTextColor_" + sanitizeElementId(_widgetId);
  }

  function escapeCssIdentifier(_value) {
    var value = String(_value || "");
    if (typeof CSS !== "undefined" && CSS && typeof CSS.escape === "function") {
      return CSS.escape(value);
    }
    return value.replace(/(^-?[0-9])|[^A-Za-z0-9_-]/g, function (match) {
      return "\\" + match.charCodeAt(0).toString(16) + " ";
    });
  }

  return {
    applyReadableTextColor: applyReadableTextColor
  };
});

define(["../runtime/ensureWidgetRuntime.js", "../config/defaults.js"], function (_ensureWidgetRuntime, _defaults) {
  function applyFixedFontSize(_KDB, _widgetId, _fontSizePx) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    var styleEl = ensureStyleElement(runtime, _widgetId);
    var widgetSelector = "#" + escapeCssIdentifier(_widgetId);
    var editable = _defaults.editableSelector;
    var fitted = _defaults.textFittedClass;
    styleEl.textContent = widgetSelector + " " + editable + "." + fitted + ", "
      + widgetSelector + " " + editable + " span." + fitted + " { font-size: " + _fontSizePx + "px !important; }";
    return { ok: true, styleElementId: styleEl.id };
  }

  function removeFixedFontSize(_KDB, _widgetId) {
    var runtime = _ensureWidgetRuntime(_KDB, _widgetId);
    if (runtime.styleElements && runtime.styleElements.fontSize) {
      removeElement(runtime.styleElements.fontSize);
      runtime.styleElements.fontSize = null;
    }
    removeElement(document.getElementById(styleElementId(_widgetId)));
    return { ok: true };
  }

  function ensureStyleElement(_runtime, _widgetId) {
    _runtime.styleElements = _runtime.styleElements || {};
    if (_runtime.styleElements.fontSize && _runtime.styleElements.fontSize.parentNode) {
      return _runtime.styleElements.fontSize;
    }
    var existing = document.getElementById(styleElementId(_widgetId));
    if (existing) {
      _runtime.styleElements.fontSize = existing;
      return existing;
    }
    var styleEl = document.createElement("style");
    styleEl.type = "text/css";
    styleEl.id = styleElementId(_widgetId);
    styleEl.setAttribute("data-kdb-widget-text-font-size", String(_widgetId || ""));
    document.head.appendChild(styleEl);
    _runtime.styleElements.fontSize = styleEl;
    return styleEl;
  }

  function removeElement(_element) {
    if (_element && _element.parentNode) {
      _element.parentNode.removeChild(_element);
    }
  }

  function sanitizeElementId(_value) {
    return String(_value || "").replace(/[^A-Za-z0-9_-]/g, "_");
  }

  function styleElementId(_widgetId) {
    return "KDB_widgetTextFontSize_" + sanitizeElementId(_widgetId);
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
    applyFixedFontSize: applyFixedFontSize,
    removeFixedFontSize: removeFixedFontSize
  };
});

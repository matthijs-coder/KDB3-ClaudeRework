define(["./config.js", "./widgetRuntime.js"], function (_config, _widgetRuntime) {
  "use strict";

  var STYLE_KINDS = {
    fontSize: { idPrefix: "KDB_widgetTextFontSize_", dataAttr: "data-kdb-widget-text-font-size" },
    textColor: { idPrefix: "KDB_widgetTextColor_", dataAttr: "data-kdb-widget-text-color" }
  };

  // Hex (#rgb, #rgba, #rrggbb, #rrggbbaa; any case, the producer emits "#000000" / "#FFFFFF") or rgb()/rgba() with
  // plain numbers or percentages. Nothing else reaches the <style> element.
  var COLOR_COMPONENT = "\\d{1,3}(?:\\.\\d+)?%?";
  var HEX_COLOR = /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
  var FUNCTIONAL_COLOR = new RegExp(
    "^rgba?\\(\\s*" + COLOR_COMPONENT + "\\s*,\\s*" + COLOR_COMPONENT + "\\s*,\\s*" + COLOR_COMPONENT
    + "\\s*(?:,\\s*(?:\\d{1,3}(?:\\.\\d+)?|\\.\\d+)%?\\s*)?\\)$",
    "i"
  );

  function normalizeTextColor(_value) {
    var color = _value == null ? "" : String(_value).trim();
    return HEX_COLOR.test(color) || FUNCTIONAL_COLOR.test(color) ? color : null;
  }

  function styleElementId(_kind, _widgetId) {
    return STYLE_KINDS[_kind].idPrefix + String(_widgetId || "").replace(/[^A-Za-z0-9_-]/g, "_");
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

  function removeElement(_element) {
    if (_element && _element.parentNode) {
      _element.parentNode.removeChild(_element);
    }
  }

  function ensureScopedStyle(_runtime, _kind, _widgetId) {
    var current = _runtime.styleElements[_kind];
    if (current && current.parentNode) {
      return current;
    }
    var id = styleElementId(_kind, _widgetId);
    var styleEl = document.getElementById(id);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.type = "text/css";
      styleEl.id = id;
      styleEl.setAttribute(STYLE_KINDS[_kind].dataAttr, String(_widgetId || ""));
      document.head.appendChild(styleEl);
    }
    _runtime.styleElements[_kind] = styleEl;
    return styleEl;
  }

  function removeScopedStyle(_runtime, _kind, _widgetId) {
    if (_runtime) {
      removeElement(_runtime.styleElements[_kind]);
      _runtime.styleElements[_kind] = null;
    }
    removeElement(document.getElementById(styleElementId(_kind, _widgetId)));
  }

  function applyReadableTextColor(_KDB, _widgetId, _textColor) {
    var color = normalizeTextColor(_textColor);
    if (!color) {
      return { ok: false, errorCode: "WIDGET_TEXT_COLOR_VALUE_INVALID" };
    }
    var styleEl = ensureScopedStyle(_widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId), "textColor", _widgetId);
    var widgetSelector = "#" + escapeCssIdentifier(_widgetId);
    styleEl.textContent = widgetSelector + " " + _config.editableSelector + ", "
      + widgetSelector + " p, "
      + widgetSelector + " span { color: " + color + " !important; }";
    return { ok: true, styleElementId: styleEl.id };
  }

  function applyFixedFontSize(_KDB, _widgetId, _fontSizePx) {
    var styleEl = ensureScopedStyle(_widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId), "fontSize", _widgetId);
    var widgetSelector = "#" + escapeCssIdentifier(_widgetId);
    var editable = _config.editableSelector;
    var fitted = _config.textFittedClass;
    styleEl.textContent = widgetSelector + " " + editable + "." + fitted + ", "
      + widgetSelector + " " + editable + " span." + fitted + " { font-size: " + _fontSizePx + "px !important; }";
    return { ok: true, styleElementId: styleEl.id };
  }

  function removeFixedFontSize(_KDB, _widgetId) {
    removeScopedStyle(_widgetRuntime.ensureWidgetRuntime(_KDB, _widgetId), "fontSize", _widgetId);
  }

  function removeAllScopedStyles(_runtime, _widgetId) {
    Object.keys(STYLE_KINDS).forEach(function (kind) {
      removeScopedStyle(_runtime, kind, _widgetId);
    });
  }

  return {
    normalizeTextColor: normalizeTextColor,
    applyReadableTextColor: applyReadableTextColor,
    applyFixedFontSize: applyFixedFontSize,
    removeFixedFontSize: removeFixedFontSize,
    removeAllScopedStyles: removeAllScopedStyles
  };
});

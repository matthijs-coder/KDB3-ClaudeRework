define([], function () {
  "use strict";

  function isUnusableColor(_value) {
    var trimmed;
    var compact;
    if (_value == null) return true;
    trimmed = String(_value).trim();
    if (!trimmed) return true;
    compact = trimmed.toLowerCase().replace(/\s+/g, "");
    if (compact === "transparent" || compact === "currentcolor") return true;
    if (compact === "rgba(0,0,0,0)") return true;
    return false;
  }

  function toRgbString(_value) {
    var trimmed;
    var rgbMatch;
    var rgbaMatch;
    var hexMatch;
    var hex;
    var r;
    var g;
    var b;
    var a;
    if (_value == null) return "";
    trimmed = String(_value).trim();
    rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      return "rgb(" + Number(rgbMatch[1]) + ", " + Number(rgbMatch[2]) + ", " + Number(rgbMatch[3]) + ")";
    }
    rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
    if (rgbaMatch) {
      a = Number(rgbaMatch[4]);
      if (a !== 1) return "";
      return "rgb(" + Number(rgbaMatch[1]) + ", " + Number(rgbaMatch[2]) + ", " + Number(rgbaMatch[3]) + ")";
    }
    hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return "";
    hex = hexMatch[1];
    if (hex.length === 3) {
      r = parseInt(hex.charAt(0) + hex.charAt(0), 16);
      g = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      b = parseInt(hex.charAt(2) + hex.charAt(2), 16);
    } else {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  function readLegendSwatchRgbColor(_clonedDocument, _svg) {
    try {
      var fromStyle;
      var converted;
      var view;
      var computed;
      if (!_svg) return "";
      fromStyle = _svg.style && _svg.style.color;
      if (!isUnusableColor(fromStyle)) {
        converted = toRgbString(fromStyle);
        if (converted && !isUnusableColor(converted)) return converted;
      }
      view = _clonedDocument && _clonedDocument.defaultView;
      if (view && view.getComputedStyle) {
        computed = view.getComputedStyle(_svg);
        fromStyle = computed && computed.color;
        if (isUnusableColor(fromStyle)) return "";
        converted = toRgbString(fromStyle);
        if (converted && !isUnusableColor(converted)) return converted;
      }
      return "";
    } catch (err) {
      console.error("[dashboardPdf.readLegendSwatchRgbColor] failed", err);
      return "";
    }
  }

  return readLegendSwatchRgbColor;
});

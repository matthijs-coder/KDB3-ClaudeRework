define([], function () {
  "use strict";

  function clampByte(_value) {
    if (!isFinite(_value)) return 0;
    if (_value < 0) return 0;
    if (_value > 255) return 255;
    return _value;
  }

  function parseRgbFromCssColor(_cssColor) {
    var match = typeof _cssColor === "string" ? _cssColor.match(/rgba?\(([^)]+)\)/i) : null;
    var parts;
    var idx;
    var values = [];
    if (!match || !match[1]) return null;
    parts = match[1].replace(/\//g, ",").split(/[\s,]+/);
    for (idx = 0; idx < parts.length; idx += 1) {
      if (!parts[idx]) continue;
      values.push(Number(parts[idx]));
      if (values.length === 3) break;
    }
    if (values.length < 3 || !isFinite(values[0]) || !isFinite(values[1]) || !isFinite(values[2])) return null;
    return {
      r: clampByte(values[0]),
      g: clampByte(values[1]),
      b: clampByte(values[2])
    };
  }

  function computeLuminance(_rgb) {
    return (0.2126 * _rgb.r) + (0.7152 * _rgb.g) + (0.0722 * _rgb.b);
  }

  function resolveShareIconHref(_toolbarHostEl, _iconAssets) {
    var iconHref = _iconAssets && _iconAssets.iconHref ? _iconAssets.iconHref : "";
    var ownerDoc = _toolbarHostEl && _toolbarHostEl.ownerDocument ? _toolbarHostEl.ownerDocument : null;
    var view = ownerDoc && ownerDoc.defaultView ? ownerDoc.defaultView : null;
    var cssColor = "";
    var rgb = null;
    if (_toolbarHostEl && view && typeof view.getComputedStyle === "function") {
      cssColor = String(view.getComputedStyle(_toolbarHostEl).color || "");
      rgb = parseRgbFromCssColor(cssColor);
    }
    if (!rgb) return { href: iconHref, invert: false };
    return { href: iconHref, invert: computeLuminance(rgb) >= 128 };
  }

  return resolveShareIconHref;
});

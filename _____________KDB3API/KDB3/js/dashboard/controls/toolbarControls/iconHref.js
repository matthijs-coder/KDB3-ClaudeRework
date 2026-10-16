define([], function () {
  "use strict";

  var LIGHT_TEXT_LUMINANCE = 128;

  function clampByte(value) {
    if (!isFinite(value)) return 0;
    return Math.min(255, Math.max(0, value));
  }

  function parseRgbFromCssColor(cssColor) {
    var match = typeof cssColor === "string" ? cssColor.match(/rgba?\(([^)]+)\)/i) : null;
    var parts;
    var values = [];
    var index;
    if (!match || !match[1]) return null;
    parts = match[1].replace(/\//g, ",").split(/[\s,]+/);
    for (index = 0; index < parts.length && values.length < 3; index += 1) {
      if (parts[index]) values.push(Number(parts[index]));
    }
    if (values.length < 3 || !values.every(isFinite)) return null;
    return { r: clampByte(values[0]), g: clampByte(values[1]), b: clampByte(values[2]) };
  }

  function computeLuminance(rgb) {
    return (0.2126 * rgb.r) + (0.7152 * rgb.g) + (0.0722 * rgb.b);
  }

  /**
   * Reads the text colour of the toolbar host to decide which icon variant is readable.
   * @param {Element} toolbarHostEl
   * @returns {"light"|"dark"|null} "light" = light text (dark toolbar), null = colour unreadable
   */
  function readToolbarIconTone(toolbarHostEl) {
    var ownerDoc = toolbarHostEl && toolbarHostEl.ownerDocument;
    var view = ownerDoc && ownerDoc.defaultView;
    var rgb;
    if (!view || typeof view.getComputedStyle !== "function") return null;
    rgb = parseRgbFromCssColor(String(view.getComputedStyle(toolbarHostEl).color || ""));
    if (!rgb) return null;
    return computeLuminance(rgb) >= LIGHT_TEXT_LUMINANCE ? "light" : "dark";
  }

  /**
   * @param {"light"|"dark"|null} tone
   * @param {{blackIconHref?: string, whiteIconHref?: string}} assets
   * @returns {string} href of the black icon on a light toolbar, the white icon on a dark one
   */
  function pickToneIconHref(tone, assets) {
    var blackHref = (assets && assets.blackIconHref) || "";
    var whiteHref = (assets && assets.whiteIconHref) || blackHref;
    if (tone === null) return blackHref || whiteHref || "";
    return tone === "dark" ? blackHref : whiteHref;
  }

  return { readToolbarIconTone: readToolbarIconTone, pickToneIconHref: pickToneIconHref };
});

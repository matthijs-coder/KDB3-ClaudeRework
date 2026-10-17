define(["../../config/settingsDefaults.js"], function (_defaults) {
  "use strict";

  var GHOST_FONT = '700 12px "IBM Plex Sans", "Helvetica Neue", Arial, sans-serif';

  function normalizePaletteEntry(entry) {
    if (!entry) return null;
    if (Array.isArray(entry) && entry.length >= 2) return [String(entry[0]).trim(), String(entry[1]).trim()];
    if (typeof entry === "object") {
      var color = entry.color != null ? entry.color : entry.value;
      var name = entry.name != null ? entry.name : entry.key;
      if (name != null && color != null) return [String(name).trim(), String(color).trim()];
    }
    return null;
  }

  // Palette from `_KDB.config.options.color` (array of entries or name -> colour map); falls back to the built-in swatches.
  function readColorPalette(_KDB) {
    var options = _KDB && _KDB.config && _KDB.config.options;
    var raw = options && options.color;
    if (Array.isArray(raw) && raw.length) {
      var fromArray = raw.map(normalizePaletteEntry).filter(Boolean);
      if (fromArray.length) return fromArray;
    }
    if (raw && typeof raw === "object") {
      var fromMap = [];
      Object.keys(raw).forEach(function (name) {
        if (raw[name] != null && String(raw[name]).trim() !== "") fromMap.push([String(name).trim(), String(raw[name]).trim()]);
      });
      if (fromMap.length) return fromMap;
    }
    return _defaults.paletteSwatches.slice();
  }

  function resolveDefaultPaletteHex(_KDB) {
    var palette = readColorPalette(_KDB);
    var index;
    for (index = 0; index < palette.length; index += 1) {
      if (String(palette[index][0]).toLowerCase() === "default") return palette[index][1];
    }
    return palette.length ? palette[0][1] : _defaults.defaultPaletteOptionHex;
  }

  function resolveColorInputDefaultHex(inputId, _KDB) {
    var colors = _defaults.colorInputs;
    if (inputId && Object.prototype.hasOwnProperty.call(colors, inputId)) {
      var configured = colors[inputId];
      if (configured != null && String(configured).trim() !== "") return String(configured).trim();
    }
    return resolveDefaultPaletteHex(_KDB);
  }

  function buildGhostLabel(pair) {
    return "-" + pair[0] + " " + pair[1];
  }

  // Index of the widest palette row (bold 12px, like the swatch hover), so the dropdown never changes width on hover.
  function pickWidestPaletteRowIndex(palette) {
    if (!palette || !palette.length) return 0;
    var ctx = document.createElement("canvas").getContext("2d");
    if (ctx) ctx.font = GHOST_FONT;
    var bestIndex = 0;
    var bestWidth = -1;
    palette.forEach(function (pair, index) {
      var label = buildGhostLabel(pair);
      var width = ctx ? ctx.measureText(label).width : label.length;
      if (width > bestWidth) {
        bestWidth = width;
        bestIndex = index;
      }
    });
    return bestIndex;
  }

  return {
    readColorPalette: readColorPalette,
    resolveColorInputDefaultHex: resolveColorInputDefaultHex,
    pickWidestPaletteRowIndex: pickWidestPaletteRowIndex,
    buildGhostLabel: buildGhostLabel
  };
});

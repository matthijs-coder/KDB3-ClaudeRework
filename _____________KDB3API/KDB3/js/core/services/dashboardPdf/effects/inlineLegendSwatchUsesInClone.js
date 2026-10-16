define([
  "./shouldSkipLegendSwatchSvg.js",
  "./readLegendSwatchRgbColor.js",
  "./placeLegendSwatchChipInClone.js"
], function (_shouldSkipLegendSwatchSvg, _readLegendSwatchRgbColor, _placeLegendSwatchChipInClone) {
  "use strict";

  function applyLegendClonePacking(_svg) {
    var legend;
    var item;
    if (!_svg || typeof _svg.closest !== "function") return;
    legend = _svg.closest(".Legend");
    item = _svg.closest("li");
    if (legend && legend.style && typeof legend.style.setProperty === "function") {
      legend.style.setProperty("overflow", "hidden", "important");
    }
    if (item && item.style && typeof item.style.setProperty === "function") {
      item.style.setProperty("justify-content", "flex-start", "important");
      item.style.setProperty("overflow", "hidden", "important");
    }
  }

  function rewriteOneLegendSwatch(_clonedDocument, _svg) {
    try {
      var rgb;
      if (_shouldSkipLegendSwatchSvg(_svg)) return;
      rgb = _readLegendSwatchRgbColor(_clonedDocument, _svg);
      if (!rgb) return;
      applyLegendClonePacking(_svg);
      _placeLegendSwatchChipInClone(_clonedDocument, _svg, rgb);
    } catch (err) {
      console.error("[dashboardPdf.rewriteOneLegendSwatch] failed", err);
    }
  }

  function inlineLegendSwatchUsesInClone(_clonedDocument, _clonedElement) {
    try {
      var svgs;
      var i;
      if (!_clonedElement || typeof _clonedElement.querySelectorAll !== "function") return;
      svgs = _clonedElement.querySelectorAll(".Legend .swatchListWrapper svg");
      for (i = 0; i < svgs.length; i += 1) {
        rewriteOneLegendSwatch(_clonedDocument, svgs[i]);
      }
    } catch (err) {
      console.error("[dashboardPdf.inlineLegendSwatchUsesInClone] failed", err);
    }
  }

  return inlineLegendSwatchUsesInClone;
});

define([], function () {
  "use strict";

  function hasSvgIconClass(_node) {
    var node = _node;
    while (node) {
      if (node.classList && node.classList.contains("svgIcon")) return true;
      node = node.parentElement;
    }
    return false;
  }

  function hasEllipsisId(_svg) {
    var node = _svg;
    while (node) {
      if (node.id && /ellipsis/i.test(node.id)) return true;
      node = node.parentElement;
    }
    return false;
  }

  function hasUseElement(_svg) {
    return !!(!_svg || typeof _svg.querySelector !== "function" ? false : _svg.querySelector("use"));
  }

  function isZeroSize(_svg) {
    var box;
    if (!_svg || typeof _svg.getBoundingClientRect !== "function") return true;
    box = _svg.getBoundingClientRect();
    return !box || box.width <= 0 || box.height <= 0;
  }

  function shouldSkipLegendSwatchSvg(_svg) {
    try {
      if (!_svg) return true;
      if (hasSvgIconClass(_svg)) return true;
      if (hasEllipsisId(_svg)) return true;
      if (!hasUseElement(_svg)) return true;
      if (isZeroSize(_svg)) return true;
      return false;
    } catch (err) {
      console.error("[dashboardPdf.shouldSkipLegendSwatchSvg] failed", err);
      return true;
    }
  }

  return shouldSkipLegendSwatchSvg;
});

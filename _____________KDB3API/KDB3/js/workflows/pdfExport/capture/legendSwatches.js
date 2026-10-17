define(["../config.js"], function (_config) {
  "use strict";

  // Cloned-DOM rewrite for html2canvas: legend swatches are SVG <use> references that html2canvas cannot
  // resolve, so each one is replaced by a plain filled chip with the swatch's resolved colour.

  var layout = _config.legendSwatchCloneLayout;

  function hasAncestor(node, test) {
    for (var current = node; current; current = current.parentElement) {
      if (test(current)) return true;
    }
    return false;
  }

  function shouldSkipSvg(svg) {
    if (!svg) return true;
    if (hasAncestor(svg, function (node) { return !!node.classList && node.classList.contains("svgIcon"); })) return true;
    if (hasAncestor(svg, function (node) { return !!node.id && /ellipsis/i.test(node.id); })) return true;
    if (typeof svg.querySelector !== "function" || !svg.querySelector("use")) return true;
    if (typeof svg.getBoundingClientRect !== "function") return true;
    var box = svg.getBoundingClientRect();
    return !box || box.width <= 0 || box.height <= 0;
  }

  function isUnusableColor(value) {
    if (value == null) return true;
    var trimmed = String(value).trim();
    if (!trimmed) return true;
    var compact = trimmed.toLowerCase().replace(/\s+/g, "");
    return compact === "transparent" || compact === "currentcolor" || compact === "rgba(0,0,0,0)";
  }

  function toRgbString(value) {
    if (value == null) return "";
    var trimmed = String(value).trim();
    var rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
    if (rgbMatch) {
      return "rgb(" + Number(rgbMatch[1]) + ", " + Number(rgbMatch[2]) + ", " + Number(rgbMatch[3]) + ")";
    }
    var rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/i);
    if (rgbaMatch) {
      if (Number(rgbaMatch[4]) !== 1) return "";
      return "rgb(" + Number(rgbaMatch[1]) + ", " + Number(rgbaMatch[2]) + ", " + Number(rgbaMatch[3]) + ")";
    }
    var hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!hexMatch) return "";
    var hex = hexMatch[1];
    if (hex.length === 3) {
      hex = hex.charAt(0) + hex.charAt(0) + hex.charAt(1) + hex.charAt(1) + hex.charAt(2) + hex.charAt(2);
    }
    return "rgb(" + parseInt(hex.slice(0, 2), 16) + ", " + parseInt(hex.slice(2, 4), 16) + ", " + parseInt(hex.slice(4, 6), 16) + ")";
  }

  function readSwatchRgbColor(clonedDocument, svg) {
    var fromStyle = svg.style && svg.style.color;
    if (!isUnusableColor(fromStyle)) {
      var converted = toRgbString(fromStyle);
      if (converted && !isUnusableColor(converted)) return converted;
    }
    var view = clonedDocument && clonedDocument.defaultView;
    if (view && view.getComputedStyle) {
      var computed = view.getComputedStyle(svg);
      var computedColor = computed && computed.color;
      if (isUnusableColor(computedColor)) return "";
      var computedRgb = toRgbString(computedColor);
      if (computedRgb && !isUnusableColor(computedRgb)) return computedRgb;
    }
    return "";
  }

  function readShapeKind(slot, svg) {
    var useEl = typeof svg.querySelector === "function" ? svg.querySelector("use") : null;
    var href = String((useEl && (useEl.getAttribute("href") || useEl.getAttribute("xlink:href"))) || "").toLowerCase();
    var shape = String((slot && typeof slot.getAttribute === "function" && slot.getAttribute("data-shape")) || "").toLowerCase();
    if (shape === "circle" || href.indexOf("circle") !== -1) return "circle";
    if (shape === "square" || shape === "rect" || href.indexOf("square") !== -1 || href.indexOf("rect") !== -1) return "rect";
    return "fallback";
  }

  function applySlotStyle(slot) {
    slot.style.position = "relative";
    slot.style.width = layout.SLOT_PX + "px";
    slot.style.height = layout.SLOT_PX + "px";
    slot.style.flexShrink = "0";
    slot.style.padding = "0";
    slot.style.border = "0";
    slot.style.marginRight = layout.SLOT_GAP_PX + "px";
  }

  function createOverlayHost(clonedDocument) {
    var host = clonedDocument.createElement("span");
    host.style.position = "absolute";
    host.style.left = "0";
    host.style.top = layout.HOST_TOP_PX + "px";
    host.style.width = layout.SLOT_PX + "px";
    host.style.height = layout.SLOT_PX + "px";
    return host;
  }

  function createFilledShape(clonedDocument, rgb, kind) {
    var shape;
    if (kind === "rect") {
      shape = clonedDocument.createElementNS(layout.SVG_NS, "rect");
      shape.setAttribute("x", "1");
      shape.setAttribute("y", "1");
      shape.setAttribute("width", "14");
      shape.setAttribute("height", "14");
    } else {
      shape = clonedDocument.createElementNS(layout.SVG_NS, "circle");
      shape.setAttribute("cx", String(layout.CIRCLE_CX));
      shape.setAttribute("cy", String(layout.CIRCLE_CY));
      shape.setAttribute("r", String(layout.CIRCLE_R));
    }
    shape.setAttribute("fill", rgb);
    return shape;
  }

  function createChipSvg(clonedDocument, rgb, kind) {
    var svg = clonedDocument.createElementNS(layout.SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + layout.VIEWBOX + " " + layout.VIEWBOX);
    svg.setAttribute("width", String(layout.SLOT_PX));
    svg.setAttribute("height", String(layout.SLOT_PX));
    svg.appendChild(createFilledShape(clonedDocument, rgb, kind));
    return svg;
  }

  function createFallbackSpan(clonedDocument, rgb) {
    var span = clonedDocument.createElement("span");
    span.style.width = layout.SLOT_PX + "px";
    span.style.height = layout.SLOT_PX + "px";
    span.style.display = "block";
    span.style.backgroundColor = rgb;
    return span;
  }

  function packLegendRow(svg) {
    var legend = typeof svg.closest === "function" ? svg.closest(".Legend") : null;
    var item = typeof svg.closest === "function" ? svg.closest("li") : null;
    if (legend && legend.style && typeof legend.style.setProperty === "function") {
      legend.style.setProperty("overflow", "hidden", "important");
    }
    if (item && item.style && typeof item.style.setProperty === "function") {
      item.style.setProperty("justify-content", "flex-start", "important");
      item.style.setProperty("overflow", "hidden", "important");
    }
  }

  function placeChip(clonedDocument, svg, rgb) {
    var slot = (svg.closest && svg.closest("[role=checkbox]")) || svg.parentElement;
    if (!slot) return;
    applySlotStyle(slot);
    var host = createOverlayHost(clonedDocument);
    slot.appendChild(host);
    var kind = readShapeKind(slot, svg);
    host.appendChild(kind === "fallback" ? createFallbackSpan(clonedDocument, rgb) : createChipSvg(clonedDocument, rgb, kind));
    if (svg.parentNode) svg.parentNode.removeChild(svg);
  }

  /**
   * Rewrites every legend swatch below clonedElement. One swatch failing must not leave the others
   * unrewritten, so each swatch is its own best-effort step (html2canvas onclone callback boundary).
   */
  function inlineLegendSwatchesInClone(clonedDocument, clonedElement) {
    if (!clonedElement || typeof clonedElement.querySelectorAll !== "function") return;
    var svgs = clonedElement.querySelectorAll(".Legend .swatchListWrapper svg");
    for (var i = 0; i < svgs.length; i += 1) {
      try {
        var svg = svgs[i];
        if (shouldSkipSvg(svg)) continue;
        var rgb = readSwatchRgbColor(clonedDocument, svg);
        if (!rgb) continue;
        packLegendRow(svg);
        placeChip(clonedDocument, svg, rgb);
      } catch (error) {
        console.error("[dashboardPdf.inlineLegendSwatchesInClone] swatch failed", error);
      }
    }
  }

  return { inlineLegendSwatchesInClone: inlineLegendSwatchesInClone };
});

define(["../config/legendSwatchCloneLayout.js"], function (_legendSwatchCloneLayout) {
  "use strict";

  function readUseHref(_svg) {
    var useEl;
    if (!_svg || typeof _svg.querySelector !== "function") return "";
    useEl = _svg.querySelector("use");
    if (!useEl) return "";
    return useEl.getAttribute("href") || useEl.getAttribute("xlink:href") || "";
  }

  function readDataShape(_slot) {
    if (!_slot || typeof _slot.getAttribute !== "function") return "";
    return _slot.getAttribute("data-shape") || "";
  }

  function isCircleShape(_slot, _href) {
    var shape = String(readDataShape(_slot) || "").toLowerCase();
    var href = String(_href || "").toLowerCase();
    return shape === "circle" || href.indexOf("circle") !== -1;
  }

  function isRectShape(_slot, _href) {
    var shape = String(readDataShape(_slot) || "").toLowerCase();
    var href = String(_href || "").toLowerCase();
    return shape === "square" || shape === "rect" || href.indexOf("square") !== -1 || href.indexOf("rect") !== -1;
  }

  function applySlotStyle(_slot, _layout) {
    _slot.style.position = "relative";
    _slot.style.width = _layout.SLOT_PX + "px";
    _slot.style.height = _layout.SLOT_PX + "px";
    _slot.style.flexShrink = "0";
    _slot.style.padding = "0";
    _slot.style.border = "0";
    _slot.style.marginRight = _layout.SLOT_GAP_PX + "px";
  }

  function createOverlayHost(_clonedDocument, _layout) {
    var host = _clonedDocument.createElement("span");
    host.style.position = "absolute";
    host.style.left = "0";
    host.style.top = _layout.HOST_TOP_PX + "px";
    host.style.width = _layout.SLOT_PX + "px";
    host.style.height = _layout.SLOT_PX + "px";
    return host;
  }

  function createFilledShape(_clonedDocument, _layout, _rgb, _kind) {
    var shape;
    if (_kind === "rect") {
      shape = _clonedDocument.createElementNS(_layout.SVG_NS, "rect");
      shape.setAttribute("x", "1");
      shape.setAttribute("y", "1");
      shape.setAttribute("width", "14");
      shape.setAttribute("height", "14");
    } else {
      shape = _clonedDocument.createElementNS(_layout.SVG_NS, "circle");
      shape.setAttribute("cx", String(_layout.CIRCLE_CX));
      shape.setAttribute("cy", String(_layout.CIRCLE_CY));
      shape.setAttribute("r", String(_layout.CIRCLE_R));
    }
    shape.setAttribute("fill", _rgb);
    return shape;
  }

  function createChipSvg(_clonedDocument, _layout, _rgb, _kind) {
    var svg = _clonedDocument.createElementNS(_layout.SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 " + _layout.VIEWBOX + " " + _layout.VIEWBOX);
    svg.setAttribute("width", String(_layout.SLOT_PX));
    svg.setAttribute("height", String(_layout.SLOT_PX));
    svg.appendChild(createFilledShape(_clonedDocument, _layout, _rgb, _kind));
    svg.style.removeProperty("position");
    svg.style.removeProperty("left");
    svg.style.removeProperty("top");
    svg.style.removeProperty("inset");
    return svg;
  }

  function createFallbackSpan(_clonedDocument, _layout, _rgb, _isCircle) {
    var span = _clonedDocument.createElement("span");
    span.style.width = _layout.SLOT_PX + "px";
    span.style.height = _layout.SLOT_PX + "px";
    span.style.display = "block";
    span.style.backgroundColor = _rgb;
    if (_isCircle) span.style.borderRadius = "50%";
    return span;
  }

  function placeLegendSwatchChipInClone(_clonedDocument, _svg, _rgb) {
    try {
      var slot;
      var host;
      var href;
      var chip;
      if (!_clonedDocument || !_svg || !_rgb) return;
      slot = (_svg.closest && _svg.closest("[role=checkbox]")) || _svg.parentElement;
      if (!slot) return;
      applySlotStyle(slot, _legendSwatchCloneLayout);
      host = createOverlayHost(_clonedDocument, _legendSwatchCloneLayout);
      slot.appendChild(host);
      href = readUseHref(_svg);
      if (isCircleShape(slot, href)) {
        chip = createChipSvg(_clonedDocument, _legendSwatchCloneLayout, _rgb, "circle");
        host.appendChild(chip);
        chip.style.removeProperty("position");
        chip.style.removeProperty("left");
        chip.style.removeProperty("top");
        chip.style.removeProperty("inset");
      } else if (isRectShape(slot, href)) {
        chip = createChipSvg(_clonedDocument, _legendSwatchCloneLayout, _rgb, "rect");
        host.appendChild(chip);
        chip.style.removeProperty("position");
        chip.style.removeProperty("left");
        chip.style.removeProperty("top");
        chip.style.removeProperty("inset");
      } else {
        host.appendChild(createFallbackSpan(_clonedDocument, _legendSwatchCloneLayout, _rgb, false));
      }
      if (_svg.parentNode) _svg.parentNode.removeChild(_svg);
    } catch (err) {
      console.error("[dashboardPdf.placeLegendSwatchChipInClone] failed", err);
    }
  }

  return placeLegendSwatchChipInClone;
});

define([], function () {
  "use strict";

  function resolveDropboxMetrics(_dropboxEl) {
    const rect = _dropboxEl && typeof _dropboxEl.getBoundingClientRect === "function"
      ? _dropboxEl.getBoundingClientRect()
      : null;
    const clientLeft = normalizeNumber(_dropboxEl && _dropboxEl.clientLeft, 0);
    const clientTop = normalizeNumber(_dropboxEl && _dropboxEl.clientTop, 0);

    if (!rect) {
      return null;
    }
    return {
      clientLeft: clientLeft,
      clientTop: clientTop,
      rectHeight: normalizeNumber(rect.height, 0),
      rectWidth: normalizeNumber(rect.width, 0),
      originLeft: normalizeNumber(rect.left, 0) + clientLeft,
      originTop: normalizeNumber(rect.top, 0) + clientTop,
      rect: rect
    };
  }

  function resolvePointerWithinDropbox(_event, _dropboxEl) {
    const metrics = resolveDropboxMetrics(_dropboxEl);
    const event = _event && (_event.originalEvent || _event);
    const clientX = normalizeNumber(event && event.clientX, 0);
    const clientY = normalizeNumber(event && event.clientY, 0);

    if (!metrics) {
      return null;
    }
    return {
      clientX: Math.round(clientX),
      clientY: Math.round(clientY),
      dropboxRectHeight: Math.round(metrics.rectHeight),
      dropboxRectWidth: Math.round(metrics.rectWidth),
      offsetX: Math.round(clientX - metrics.originLeft),
      offsetY: Math.round(clientY - metrics.originTop)
    };
  }

  function resolveRenderedPlacement(_pointer, _dragOffset) {
    const pointer = _pointer || {};
    const dragOffset = _dragOffset || {};

    return {
      left: normalizeNumber(pointer.offsetX, 0) - normalizeNumber(dragOffset.x, 0),
      top: normalizeNumber(pointer.offsetY, 0) - normalizeNumber(dragOffset.y, 0)
    };
  }

  function isPlacementWithinBounds(_pointer, _dragOffset, _widgetWidth, _widgetHeight, _dropboxEl) {
    const metrics = resolveDropboxMetrics(_dropboxEl);
    const placement = resolveRenderedPlacement(_pointer, _dragOffset);
    const width = normalizeNumber(_widgetWidth, 0);
    const height = normalizeNumber(_widgetHeight, 0);

    if (!metrics || placement.left < 0 || placement.top < 0) {
      return false;
    }
    if (placement.left + width > metrics.rectWidth) {
      return false;
    }
    return placement.top + height <= metrics.rectHeight;
  }

  function normalizeNumber(_value, _fallback) {
    const parsed = typeof _value === "number" ? _value : parseFloat(_value);
    return isFinite(parsed) ? parsed : (_fallback || 0);
  }

  return {
    isPlacementWithinBounds: isPlacementWithinBounds,
    resolveDropboxMetrics: resolveDropboxMetrics,
    resolvePointerWithinDropbox: resolvePointerWithinDropbox,
    resolveRenderedPlacement: resolveRenderedPlacement
  };
});

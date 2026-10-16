define([], function () {
  function copyRect(_rect) {
    const source = _rect || {};
    return {
      x: source.x,
      y: source.y,
      width: source.width,
      height: source.height
    };
  }

  function resolveAxisPins(axis) {
    if (axis === "e" || axis === "s" || axis === "se") {
      return { pinX: true, pinY: true };
    }
    if (axis === "n" || axis === "ne") {
      return { pinX: true, pinY: false };
    }
    if (axis === "w" || axis === "sw") {
      return { pinX: false, pinY: true };
    }
    return { pinX: false, pinY: false };
  }

  function clampAxisDimension(rect, posKey, sizeKey, boxSize, pinned, minSize) {
    let pos = rect[posKey];
    let size = rect[sizeKey];
    if (!isFinite(pos)) {
      pos = 0;
    }
    if (!isFinite(size)) {
      size = 0;
    }
    if (pinned) {
      if (pos + size > boxSize) {
        size = boxSize - pos;
      }
    } else {
      if (pos < 0) {
        pos = 0;
      }
      if (pos + size > boxSize) {
        pos = boxSize - size;
      }
      if (pos < 0) {
        pos = 0;
        size = boxSize;
      }
    }
    if (isFinite(minSize) && minSize > 0 && size < minSize) {
      size = minSize;
    }
    rect[posKey] = pos;
    rect[sizeKey] = size;
  }

  function resolveResizeAxis(_options) {
    const options = _options || {};
    const $widget = options.$widget;
    if ($widget && typeof $widget.resizable === "function") {
      const inst = $widget.resizable("instance");
      return inst && typeof inst.axis === "string" ? inst.axis : "";
    }
    return typeof options.axis === "string" ? options.axis : "";
  }

  function applyResizeUi(_parentEl, _ui, _options) {
    const ui = _ui || {};
    const position = ui.position || {};
    const size = ui.size || {};
    const options = _options || {};
    const origin = options.origin || {};
    const clamped = clampShellToDropbox(_parentEl, {
      x: position.left,
      y: position.top,
      width: size.width,
      height: size.height
    }, {
      axis: resolveResizeAxis(options),
      originX: isFinite(origin.x) ? origin.x : position.left,
      originY: isFinite(origin.y) ? origin.y : position.top,
      minWidth: options.minWidth,
      minHeight: options.minHeight
    });
    position.left = clamped.x;
    position.top = clamped.y;
    size.width = clamped.width;
    size.height = clamped.height;
    return clamped;
  }

  function clampShellToDropbox(_parentEl, _rect, _options) {
    try {
      const options = _options || {};
      if (options.mode === "resizeUi") {
        return applyResizeUi(_parentEl, _rect, options);
      }
      const rect = copyRect(_rect);
      if (!_parentEl) {
        return rect;
      }
      const boxW = _parentEl.clientWidth;
      const boxH = _parentEl.clientHeight;
      if (!(isFinite(boxW) && boxW > 0 && isFinite(boxH) && boxH > 0)) {
        return rect;
      }
      const axis = typeof options.axis === "string" ? options.axis : "";
      const pins = resolveAxisPins(axis);
      if (pins.pinX && isFinite(options.originX)) {
        rect.x = options.originX;
      }
      if (pins.pinY && isFinite(options.originY)) {
        rect.y = options.originY;
      }
      clampAxisDimension(rect, "x", "width", boxW, pins.pinX, options.minWidth);
      clampAxisDimension(rect, "y", "height", boxH, pins.pinY, options.minHeight);
      return rect;
    } catch (err) {
      console.error("[widgetBase.clampShellToDropbox] failed", err);
      throw err;
    }
  }

  return clampShellToDropbox;
});

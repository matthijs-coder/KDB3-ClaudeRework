define([
  "../../../../core/utils/readElementScale.js"
], function (_readElementScale) {
  "use strict";

  var gestureByShell = new WeakMap();

  function parseCssLengthToPx(_KDB, _value) {
    var n;
    if (typeof _value === "number" && isFinite(_value)) {
      return Math.round(_value);
    }
    if (typeof _value !== "string") {
      return null;
    }
    var value = String(_value || "").trim();
    if (value === "") {
      return null;
    }
    if (/^-?\d+(\.\d+)?$/i.test(value) || /^-?\d+(\.\d+)?px$/i.test(value)) {
      n = parseFloat(value);
      return isFinite(n) ? Math.round(n) : null;
    }
    if (_KDB && _KDB.utilities && typeof _KDB.utilities.convertToPx === "function") {
      try {
        n = parseFloat(String(_KDB.utilities.convertToPx(value) || "").trim());
        return isFinite(n) ? Math.round(n) : null;
      } catch (_err) {
        return null;
      }
    }
    return null;
  }

  function readCssLength(_KDB, _value, _fallback) {
    var parsed = parseCssLengthToPx(_KDB, _value);
    if (parsed !== null) {
      return parsed;
    }
    return isFinite(_fallback) ? Math.round(_fallback) : null;
  }

  // Canvas-px layout of a shell from its inline style, falling back to offsets and the bounding rect.
  // Never throws: drag/resize callbacks and history frames rely on a usable layout.
  function readWidgetLayoutFromDom(_KDB, _shellEl) {
    try {
      if (!_shellEl) {
        return null;
      }
      var style = _shellEl.style;
      var x = readCssLength(_KDB, style ? style.left : null, _shellEl.offsetLeft);
      var y = readCssLength(_KDB, style ? style.top : null, _shellEl.offsetTop);
      var width = readCssLength(_KDB, style ? style.width : null, null);
      var height = readCssLength(_KDB, style ? style.height : null, null);
      if ((!width || width <= 0 || !height || height <= 0) && typeof _shellEl.getBoundingClientRect === "function") {
        var rect = _shellEl.getBoundingClientRect();
        if ((!width || width <= 0) && rect && isFinite(rect.width)) {
          width = Math.round(rect.width);
        }
        if ((!height || height <= 0) && rect && isFinite(rect.height)) {
          height = Math.round(rect.height);
        }
      }
      return {
        x: isFinite(x) ? Math.round(x) : 0,
        y: isFinite(y) ? Math.round(y) : 0,
        width: isFinite(width) && width > 0 ? Math.round(width) : 300,
        height: isFinite(height) && height > 0 ? Math.round(height) : 200
      };
    } catch (err) {
      console.error("[widgetBase.readWidgetLayoutFromDom] layout read failed", err);
      return { x: 0, y: 0, width: 300, height: 200 };
    }
  }

  function copyRect(_rect) {
    var source = _rect || {};
    return { x: source.x, y: source.y, width: source.width, height: source.height };
  }

  function resolveAxisPins(_axis) {
    if (_axis === "e" || _axis === "s" || _axis === "se") {
      return { pinX: true, pinY: true };
    }
    if (_axis === "n" || _axis === "ne") {
      return { pinX: true, pinY: false };
    }
    if (_axis === "w" || _axis === "sw") {
      return { pinX: false, pinY: true };
    }
    return { pinX: false, pinY: false };
  }

  function clampAxisDimension(_rect, _posKey, _sizeKey, _boxSize, _pinned, _minSize) {
    var pos = _rect[_posKey];
    var size = _rect[_sizeKey];
    if (!isFinite(pos)) {
      pos = 0;
    }
    if (!isFinite(size)) {
      size = 0;
    }
    if (_pinned) {
      if (pos + size > _boxSize) {
        size = _boxSize - pos;
      }
    } else {
      if (pos < 0) {
        pos = 0;
      }
      if (pos + size > _boxSize) {
        pos = _boxSize - size;
      }
      if (pos < 0) {
        pos = 0;
        size = _boxSize;
      }
    }
    if (isFinite(_minSize) && _minSize > 0 && size < _minSize) {
      size = _minSize;
    }
    _rect[_posKey] = pos;
    _rect[_sizeKey] = size;
  }

  function resolveResizeAxis(_options) {
    var options = _options || {};
    var $widget = options.$widget;
    if ($widget && typeof $widget.resizable === "function") {
      var inst = $widget.resizable("instance");
      return inst && typeof inst.axis === "string" ? inst.axis : "";
    }
    return typeof options.axis === "string" ? options.axis : "";
  }

  function applyResizeUi(_parentEl, _ui, _options) {
    var ui = _ui || {};
    var position = ui.position || {};
    var size = ui.size || {};
    var options = _options || {};
    var origin = options.origin || {};
    var clamped = clampShellToDropbox(_parentEl, {
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

  // Keeps a rect inside the dropbox. mode "resizeUi" clamps a jQuery UI resize `ui` in place; otherwise a
  // copy of the rect is returned. The resize axis pins the opposite edges to the gesture origin.
  function clampShellToDropbox(_parentEl, _rect, _options) {
    var options = _options || {};
    if (options.mode === "resizeUi") {
      return applyResizeUi(_parentEl, _rect, options);
    }
    var rect = copyRect(_rect);
    if (!_parentEl) {
      return rect;
    }
    var boxW = _parentEl.clientWidth;
    var boxH = _parentEl.clientHeight;
    if (!(isFinite(boxW) && boxW > 0 && isFinite(boxH) && boxH > 0)) {
      return rect;
    }
    var pins = resolveAxisPins(typeof options.axis === "string" ? options.axis : "");
    if (pins.pinX && isFinite(options.originX)) {
      rect.x = options.originX;
    }
    if (pins.pinY && isFinite(options.originY)) {
      rect.y = options.originY;
    }
    clampAxisDimension(rect, "x", "width", boxW, pins.pinX, options.minWidth);
    clampAxisDimension(rect, "y", "height", boxH, pins.pinY, options.minHeight);
    return rect;
  }

  // Replaces jQuery UI's _mouseDrag for the gesture: with _noPropagation the helper is pinned back to the
  // scaled session position, because jQuery UI computes positions in unscaled page pixels.
  function mouseDragWrapper(_event, _noPropagation) {
    var session = gestureByShell.get(this.element[0]);
    var original = session && session.originalMouseDrag;
    var result = typeof original === "function" ? original.apply(this, arguments) : undefined;
    if (_noPropagation === true && session && this.helper && this.helper[0] && this.position) {
      this.helper[0].style.left = session.x + "px";
      this.helper[0].style.top = session.y + "px";
      this.position.left = session.x;
      this.position.top = session.y;
    }
    return result;
  }

  function beginScaledGesture(_shellEl, _event, _options) {
    var layout = readWidgetLayoutFromDom(_options.kdb, _shellEl) || {};
    var scale = _readElementScale(_shellEl ? _shellEl.parentElement : null);
    var previous = gestureByShell.get(_shellEl);
    var session = {
      x: isFinite(layout.x) ? layout.x : 0,
      y: isFinite(layout.y) ? layout.y : 0,
      width: isFinite(layout.width) ? layout.width : 0,
      height: isFinite(layout.height) ? layout.height : 0,
      pageX: _event && isFinite(_event.pageX) ? _event.pageX : 0,
      pageY: _event && isFinite(_event.pageY) ? _event.pageY : 0,
      scaleX: isFinite(scale.scaleX) && scale.scaleX > 0 ? scale.scaleX : 1,
      scaleY: isFinite(scale.scaleY) && scale.scaleY > 0 ? scale.scaleY : 1,
      originalMouseDrag: previous ? previous.originalMouseDrag : null
    };
    gestureByShell.set(_shellEl, session);
    if (_options.$widget && typeof _options.$widget.draggable === "function") {
      var instance = _options.$widget.draggable("instance");
      if (instance && instance._mouseDrag !== mouseDragWrapper) {
        session.originalMouseDrag = instance._mouseDrag;
        instance._mouseDrag = mouseDragWrapper;
      }
    }
    return { x: session.x, y: session.y, width: session.width, height: session.height };
  }

  function applyMoveDelta(_shellEl, _event, _ui) {
    var session = gestureByShell.get(_shellEl);
    var pageX = _event && isFinite(_event.pageX) ? _event.pageX : session.pageX;
    var pageY = _event && isFinite(_event.pageY) ? _event.pageY : session.pageY;
    var clamped = clampShellToDropbox(_shellEl.parentElement, {
      x: session.x + (pageX - session.pageX) / session.scaleX,
      y: session.y + (pageY - session.pageY) / session.scaleY,
      width: _shellEl.offsetWidth,
      height: _shellEl.offsetHeight
    }, { axis: "" });
    _ui.position.left = clamped.x;
    _ui.position.top = clamped.y;
  }

  function layoutForResizeAxis(_session, _scaledDx, _scaledDy, _axis) {
    var next = { x: _session.x, y: _session.y, width: _session.width, height: _session.height };
    if (_axis === "e" || _axis === "ne" || _axis === "se") {
      next.width = _session.width + _scaledDx;
    }
    if (_axis === "s" || _axis === "se" || _axis === "sw") {
      next.height = _session.height + _scaledDy;
    }
    if (_axis === "w" || _axis === "sw" || _axis === "nw") {
      next.x = _session.x + _scaledDx;
      next.width = _session.width - _scaledDx;
    }
    if (_axis === "n" || _axis === "ne" || _axis === "nw") {
      next.y = _session.y + _scaledDy;
      next.height = _session.height - _scaledDy;
    }
    return next;
  }

  function applyResizeDelta(_shellEl, _event, _ui, _options) {
    var session = gestureByShell.get(_shellEl);
    var pageX = _event && isFinite(_event.pageX) ? _event.pageX : session.pageX;
    var pageY = _event && isFinite(_event.pageY) ? _event.pageY : session.pageY;
    var resizeInstance = _options.$widget && typeof _options.$widget.resizable === "function" ? _options.$widget.resizable("instance") : null;
    var axis = resizeInstance && typeof resizeInstance.axis === "string" ? resizeInstance.axis : "";
    var next = layoutForResizeAxis(session, (pageX - session.pageX) / session.scaleX, (pageY - session.pageY) / session.scaleY, axis);
    _ui.position.left = next.x;
    _ui.position.top = next.y;
    _ui.size.width = next.width;
    _ui.size.height = next.height;
    clampShellToDropbox(_shellEl.parentElement, _ui, {
      mode: "resizeUi",
      $widget: _options.$widget,
      origin: { x: session.x, y: session.y, width: session.width, height: session.height },
      minWidth: _options.minWidth,
      minHeight: _options.minHeight
    });
  }

  // jQuery UI positions are in unscaled page pixels; the canvas may be CSS-scaled. Each gesture records its
  // start layout and scale on "start" and maps the pointer delta back to canvas pixels on "move"/"resize".
  function applyScaledPointerDelta(_phase, _shellEl, _event, _ui, _options) {
    if (_phase === "start") {
      return beginScaledGesture(_shellEl, _event, _options || {});
    }
    if (_phase === "move") {
      applyMoveDelta(_shellEl, _event, _ui);
      return;
    }
    if (_phase === "resize") {
      applyResizeDelta(_shellEl, _event, _ui, _options || {});
      return;
    }
    throw new Error("Unknown applyScaledPointerDelta phase.");
  }

  return {
    applyScaledPointerDelta: applyScaledPointerDelta,
    clampShellToDropbox: clampShellToDropbox,
    readWidgetLayoutFromDom: readWidgetLayoutFromDom
  };
});

define([
  "./readWidgetLayoutFromDom.js",
  "./clampShellToDropbox.js",
  "../../../../core/utils/readElementScale.js"
], function (_readWidgetLayoutFromDom, _clampShellToDropbox, _readElementScale) {
  const gestureByShell = new WeakMap();

  function applyScaledPointerDelta(_phase, _shellEl, _event, _ui, _options) {
    try {
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
    } catch (err) {
      console.error("[widgetBase.applyScaledPointerDelta] failed", _phase, err);
      throw err;
    }
  }

  function beginScaledGesture(_shellEl, _event, _options) {
    try {
      const layout = _readWidgetLayoutFromDom(_options.kdb, _shellEl) || {};
      const scale = _readElementScale(_shellEl ? _shellEl.parentElement : null);
      const previous = gestureByShell.get(_shellEl);
      const session = {
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
        const instance = _options.$widget.draggable("instance");
        if (instance && instance._mouseDrag !== mouseDragWrapper) {
          session.originalMouseDrag = instance._mouseDrag;
          instance._mouseDrag = mouseDragWrapper;
        }
      }
      return { x: session.x, y: session.y, width: session.width, height: session.height };
    } catch (err) {
      console.error("[widgetBase.beginScaledGesture] failed", err);
      throw err;
    }
  }

  function mouseDragWrapper(_event, _noPropagation) {
    try {
      const session = gestureByShell.get(this.element[0]);
      const original = session && session.originalMouseDrag;
      const result = typeof original === "function" ? original.apply(this, arguments) : undefined;
      if (_noPropagation === true && session && this.helper && this.helper[0] && this.position) {
        this.helper[0].style.left = session.x + "px";
        this.helper[0].style.top = session.y + "px";
        this.position.left = session.x;
        this.position.top = session.y;
      }
      return result;
    } catch (err) {
      console.error("[widgetBase.mouseDragWrapper] failed", err);
      throw err;
    }
  }

  function applyMoveDelta(_shellEl, _event, _ui) {
    try {
      const session = gestureByShell.get(_shellEl);
      const pageX = _event && isFinite(_event.pageX) ? _event.pageX : session.pageX;
      const pageY = _event && isFinite(_event.pageY) ? _event.pageY : session.pageY;
      const clamped = _clampShellToDropbox(_shellEl.parentElement, {
        x: session.x + (pageX - session.pageX) / session.scaleX,
        y: session.y + (pageY - session.pageY) / session.scaleY,
        width: _shellEl.offsetWidth,
        height: _shellEl.offsetHeight
      }, { axis: "" });
      _ui.position.left = clamped.x;
      _ui.position.top = clamped.y;
    } catch (err) {
      console.error("[widgetBase.applyMoveDelta] failed", err);
      throw err;
    }
  }

  function applyResizeDelta(_shellEl, _event, _ui, _options) {
    try {
      const session = gestureByShell.get(_shellEl);
      const pageX = _event && isFinite(_event.pageX) ? _event.pageX : session.pageX;
      const pageY = _event && isFinite(_event.pageY) ? _event.pageY : session.pageY;
      const resizeInstance = _options.$widget && typeof _options.$widget.resizable === "function" ? _options.$widget.resizable("instance") : null;
      const axis = resizeInstance && typeof resizeInstance.axis === "string" ? resizeInstance.axis : "";
      const next = layoutForResizeAxis(session, (pageX - session.pageX) / session.scaleX, (pageY - session.pageY) / session.scaleY, axis);
      _ui.position.left = next.x;
      _ui.position.top = next.y;
      _ui.size.width = next.width;
      _ui.size.height = next.height;
      _clampShellToDropbox(_shellEl.parentElement, _ui, {
        mode: "resizeUi",
        $widget: _options.$widget,
        origin: { x: session.x, y: session.y, width: session.width, height: session.height },
        minWidth: _options.minWidth,
        minHeight: _options.minHeight
      });
    } catch (err) {
      console.error("[widgetBase.applyResizeDelta] failed", err);
      throw err;
    }
  }

  function layoutForResizeAxis(session, scaledDx, scaledDy, axis) {
    try {
      const next = { x: session.x, y: session.y, width: session.width, height: session.height };
      if (axis === "e" || axis === "ne" || axis === "se") {
        next.width = session.width + scaledDx;
      }
      if (axis === "s" || axis === "se" || axis === "sw") {
        next.height = session.height + scaledDy;
      }
      if (axis === "w" || axis === "sw" || axis === "nw") {
        next.x = session.x + scaledDx;
        next.width = session.width - scaledDx;
      }
      if (axis === "n" || axis === "ne" || axis === "nw") {
        next.y = session.y + scaledDy;
        next.height = session.height - scaledDy;
      }
      return next;
    } catch (err) {
      console.error("[widgetBase.layoutForResizeAxis] failed", err);
      throw err;
    }
  }

  return applyScaledPointerDelta;
});

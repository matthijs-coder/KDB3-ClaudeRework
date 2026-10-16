define([
  "./buildCanvasMaximizeIcon.js",
  "../dom.js",
  "../config.js"
], function (_buildCanvasMaximizeIcon, _dom, _config) {
  "use strict";

  function resolveWidgetEl(_widgetId) {
    var content;
    var node;
    try {
      content = _dom.resolveVisualizationContent(_widgetId);
      node = content && content.contentEl ? content.contentEl : null;
      if (node && typeof node.closest === "function") {
        return node.closest(".widget");
      }
      return node;
    } catch (err) {
      console.error("[widgetVis.placeCanvasMaximizeIcon] resolve", _widgetId, err);
      return null;
    }
  }

  function findTopRightResizeEdge(_widget) {
    var i;
    var child;
    if (_widget && _widget.children) {
      for (i = 0; i < _widget.children.length; i += 1) {
        child = _widget.children[i];
        if (
          child.classList &&
          child.classList.contains("resizeEdge") &&
          child.classList.contains("topRight")
        ) {
          return child;
        }
      }
    }
    if (_widget && typeof _widget.querySelector === "function") {
      return _widget.querySelector(".resizeEdge.topRight");
    }
    return null;
  }

  function attachWrapper(_widgetEl, _wrapperEl) {
    if (!_widgetEl || !_wrapperEl) {
      return;
    }
    if (_wrapperEl.parentNode !== _widgetEl) {
      _widgetEl.appendChild(_wrapperEl);
    }
  }

  function __controller(_options) {
    try {
      var options = _options || {};
      var widgetEl = resolveWidgetEl(options.widgetId);
      var built;
      if (!widgetEl) {
        return { ok: true, skipped: true, reason: "missing widget" };
      }
      findTopRightResizeEdge(widgetEl);
      built = _buildCanvasMaximizeIcon({
        hostEl: widgetEl,
        wrapperClass: _config.canvasMaximizeWrapperClass
      });
      if (!built || built.ok !== true) {
        return built || {
          ok: false,
          errorCode: "WIDGET_VIS_MAXIMIZE_FAILED",
          errorMessage: "maximize icon build failed"
        };
      }
      attachWrapper(widgetEl, built.wrapperEl);
      return { ok: true, skipped: false, wrapperEl: built.wrapperEl };
    } catch (err) {
      console.error("[widgetVis.placeCanvasMaximizeIcon]", options && options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_MAXIMIZE_FAILED" };
    }
  }

  return __controller;
});

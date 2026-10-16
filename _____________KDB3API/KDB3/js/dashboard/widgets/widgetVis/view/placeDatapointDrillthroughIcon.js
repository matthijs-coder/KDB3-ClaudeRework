define([
  "./buildDatapointDrillthroughIcon.js",
  "./resolveVisualizationContent.js",
  "./ensureExpandDrillthroughHost.js",
  "../config/defaults.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (
  _buildDatapointDrillthroughIcon,
  _resolveVisualizationContent,
  _ensureExpandDrillthroughHost,
  _defaults,
  _widgetChrome
) {
  "use strict";

  function resolveExpandedWidgetEl(_widgetId) {
    var id = String(_widgetId || "");
    var focus = _widgetChrome.focusMode.strings;
    if (!id) {
      return null;
    }
    return document.querySelector(focus.expandedWidgetSelectorPrefix + id + "\"]");
  }

  function resolveWidgetEl(_widgetId) {
    var content;
    var node;
    try {
      content = _resolveVisualizationContent(_widgetId);
      node = content && content.contentEl ? content.contentEl : null;
      if (node && typeof node.closest === "function") {
        return node.closest(".widget");
      }
      return node;
    } catch (err) {
      console.error("[widgetVis.placeDatapointDrillthroughIcon] resolve", _widgetId, err);
      return null;
    }
  }

  function isMaximizable(_widget) {
    return !!(
      _widget &&
      _widget.classList &&
      _widget.classList.contains("maximizable")
    );
  }

  function findTopRightResizeEdge(_widget) {
    var i;
    var child;
    if (!_widget || !_widget.children) {
      return null;
    }
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
      var expandedEl = resolveExpandedWidgetEl(options.widgetId);
      var widgetEl = expandedEl
        ? _ensureExpandDrillthroughHost(options.widgetId)
        : resolveWidgetEl(options.widgetId);
      var built;
      if (!widgetEl) {
        return { ok: true, skipped: true, reason: "missing host" };
      }
      if (!expandedEl) {
        if (!isMaximizable(widgetEl)) {
          return { ok: true, skipped: true, reason: "not maximizable" };
        }
        if (!findTopRightResizeEdge(widgetEl)) {
          return { ok: true, skipped: true, reason: "missing resizeEdge" };
        }
      }
      built = _buildDatapointDrillthroughIcon({
        hostEl: widgetEl,
        wrapperClass: _defaults.datapointDrillthroughWrapperClass,
        iconClass: _defaults.drillthroughIconClass
      });
      if (!built || built.ok !== true) {
        return built || {
          ok: false,
          errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED",
          errorMessage: "datapoint icon build failed"
        };
      }
      attachWrapper(widgetEl, built.wrapperEl);
      return { ok: true, skipped: false, wrapperEl: built.wrapperEl, anchorEl: built.anchorEl };
    } catch (err) {
      console.error("[widgetVis.placeDatapointDrillthroughIcon]", options && options.widgetId, err);
      return { ok: false, errorCode: "WIDGET_VIS_DRILLTHROUGH_FAILED" };
    }
  }

  return __controller;
});

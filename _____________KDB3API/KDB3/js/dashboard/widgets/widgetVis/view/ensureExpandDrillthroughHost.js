define([
  "../../../../core/cognosHost/config/widgetChromeSelectors.js",
  "../config.js"
], function (_widgetChrome, _config) {
  "use strict";

  function resolveContainer(_widgetId) {
    var id = String(_widgetId || "");
    var focus = _widgetChrome.focusMode.strings;
    var expanded;
    if (!id) {
      return null;
    }
    expanded = document.querySelector(focus.expandedWidgetSelectorPrefix + id + "\"]");
    if (expanded && typeof expanded.closest === "function") {
      return expanded.closest(focus.expandModeContainerSelector);
    }
    return document.querySelector(focus.expandModeContainerSelector);
  }

  function resolveCollapse(_container, _focus) {
    if (!_container || typeof _container.querySelector !== "function") {
      return null;
    }
    return (
      _container.querySelector(_focus.collapseSvgFocusModeSelector) ||
      _container.querySelector(_focus.collapseSvgSelector)
    );
  }

  function __controller(_widgetId) {
    var focus = _widgetChrome.focusMode.strings;
    var columnClass = _config.expandDrillthroughColumnClass;
    var container;
    var column;
    var collapse;
    try {
      container = resolveContainer(_widgetId);
      if (!container) {
        return null;
      }
      column = container.querySelector("." + columnClass);
      if (column) {
        return column;
      }
      column = document.createElement("div");
      column.className = columnClass;
      collapse = resolveCollapse(container, focus);
      if (collapse && collapse.parentNode) {
        collapse.insertAdjacentElement("afterend", column);
      } else {
        container.appendChild(column);
      }
      return column;
    } catch (err) {
      console.error("[widgetVis.ensureExpandDrillthroughHost]", _widgetId, err);
      return null;
    }
  }

  return __controller;
});

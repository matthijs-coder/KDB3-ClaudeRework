define([
  "../config.js",
  "../dom.js",
  "../../../../core/utils/kit/async.js",
  "../../widgetSettings/selectors.js",
  "../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_config, _dom, _async, _widgetSettings, _widgetChrome) {
  "use strict";

  var _settingsSelectors = _widgetSettings.domSelectors;
  var focus = _widgetChrome.focusMode.strings;
  var KEPT_FOCUS_PANEL_ICONS = [
    "KDB_widgetInfoButton", "KDB_visualizationsButton", "KDB_groupingButton", "KDB_showValuesButton", "KDB_dimensionsButton", "KDB_topNButton"
  ];

  function resolveExpandedWidget(widgetId) {
    var id = String(widgetId || "");
    if (!id) {
      return null;
    }
    return document.querySelector(focus.expandedWidgetSelectorPrefix + id + "\"]");
  }

  function resolveExpandModeContainer(widgetId) {
    var expandedWidget = resolveExpandedWidget(widgetId);
    if (expandedWidget && typeof expandedWidget.closest === "function") {
      return expandedWidget.closest(focus.expandModeContainerSelector);
    }
    return document.querySelector(focus.expandModeContainerSelector);
  }

  function isWidgetExpanded(widgetId) {
    return !!resolveExpandedWidget(widgetId);
  }

  function resolveWidgetElement(widgetId) {
    var content = _dom.resolveVisualizationContent(widgetId);
    var node = content && content.contentEl ? content.contentEl : null;
    return node && typeof node.closest === "function" ? node.closest(".widget") : node;
  }

  async function waitForExpandedState(widgetId, shouldExpand, maxMs) {
    var timeoutMs = typeof maxMs === "number" ? Math.max(maxMs, 1) : _config.focusModeWaitMs;
    var outcome = await _async.pollUntil({
      check: function () { return isWidgetExpanded(widgetId) === shouldExpand; },
      timeoutMs: timeoutMs,
      intervalMs: _config.focusModePollMs
    });
    return outcome.ok || isWidgetExpanded(widgetId) === shouldExpand;
  }

  function resolveCanvasSettingsPanel(widgetId) {
    var id = String(widgetId || "");
    var canvasWidget = document.getElementById(id);
    if (!canvasWidget) {
      return null;
    }
    return (
      canvasWidget.querySelector("[data-kdb-widget-settings-root=\"" + id + "\"]") ||
      canvasWidget.querySelector(".KDB_widgetSettings")
    );
  }

  function isKeptFocusPanelIcon(icon) {
    var className = String(icon.className || "");
    return KEPT_FOCUS_PANEL_ICONS.some(function (name) { return className.indexOf(name) !== -1; });
  }

  function filterFocusPanelIcons(panelRoot) {
    var icons = panelRoot.querySelectorAll(_settingsSelectors.focusPanelIconsSelector);
    var i;
    for (i = icons.length - 1; i >= 0; i -= 1) {
      if (!isKeptFocusPanelIcon(icons[i]) && icons[i].parentNode) {
        icons[i].parentNode.removeChild(icons[i]);
      }
    }
  }

  function hidePanelDropdowns(panelRoot) {
    var opened = panelRoot.querySelectorAll(".KDB_IconsDropdown.KDB_visible");
    var i;
    for (i = 0; i < opened.length; i += 1) {
      opened[i].classList.remove(_settingsSelectors.visibleClass);
    }
  }

  return {
    resolveExpandedWidget: resolveExpandedWidget,
    resolveExpandModeContainer: resolveExpandModeContainer,
    isWidgetExpanded: isWidgetExpanded,
    resolveWidgetElement: resolveWidgetElement,
    waitForExpandedState: waitForExpandedState,
    resolveCanvasSettingsPanel: resolveCanvasSettingsPanel,
    filterFocusPanelIcons: filterFocusPanelIcons,
    hidePanelDropdowns: hidePanelDropdowns
  };
});

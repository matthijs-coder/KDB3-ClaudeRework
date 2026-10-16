define([
  "../../config/defaults.js",
  "../../../widgetSettings/config/selectors.js",
  "../../../../../core/cognosHost/config/widgetChromeSelectors.js"
], function (_defaults, _settingsSelectors, _widgetChrome) {
  "use strict";

  var focus = _widgetChrome.focusMode.strings;

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

  function waitForExpandedStateTick(widgetId, shouldExpand, deadline, pollMs, resolve) {
    if (isWidgetExpanded(widgetId) === shouldExpand) {
      resolve(true);
      return;
    }
    if (Date.now() > deadline) {
      resolve(isWidgetExpanded(widgetId) === shouldExpand);
      return;
    }
    window.setTimeout(
      waitForExpandedStateTick.bind(null, widgetId, shouldExpand, deadline, pollMs, resolve),
      pollMs
    );
  }

  function waitForExpandedState(widgetId, shouldExpand, maxMs) {
    var deadline = Date.now() + (typeof maxMs === "number" ? maxMs : _defaults.focusModeWaitMs || 1200);
    var pollMs = _defaults.focusModePollMs || 50;
    return new Promise(waitForExpandedStateTick.bind(null, widgetId, shouldExpand, deadline, pollMs));
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

  function filterFocusPanelIcons(panelRoot) {
    var icons = panelRoot.querySelectorAll(_settingsSelectors.focusPanelIconsSelector);
    var i;
    var className;
    for (i = icons.length - 1; i >= 0; i -= 1) {
      className = String(icons[i].className || "");
      if (
        className.indexOf("KDB_widgetInfoButton") === -1 &&
        className.indexOf("KDB_visualizationsButton") === -1 &&
        className.indexOf("KDB_groupingButton") === -1 &&
        className.indexOf("KDB_showValuesButton") === -1 &&
        className.indexOf("KDB_dimensionsButton") === -1 &&
        className.indexOf("KDB_topNButton") === -1
      ) {
        if (icons[i].parentNode) {
          icons[i].parentNode.removeChild(icons[i]);
        }
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
    isWidgetExpanded: isWidgetExpanded,
    waitForExpandedState: waitForExpandedState,
    resolveCanvasSettingsPanel: resolveCanvasSettingsPanel,
    resolveExpandModeContainer: resolveExpandModeContainer,
    filterFocusPanelIcons: filterFocusPanelIcons,
    hidePanelDropdowns: hidePanelDropdowns
  };
});

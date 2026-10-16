define(["../cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var focus = _widgetChrome.focusMode.strings;
  var LAYOUT_PROPS = ["left", "top", "width", "height"];

  function getContent(_widgetId) {
    return __getDashboardAPI().getCanvas().getContent(_widgetId);
  }

  function getWidget(_widgetId) {
    return __getDashboardAPI().getCanvas().getWidget(_widgetId);
  }

  function renderWidget(_widgetId) {
    var widget = getWidget(_widgetId);
    if (!widget || typeof widget.render !== "function") {
      return Promise.resolve();
    }
    return Promise.resolve(widget.render());
  }

  function setLayoutPosition(_widgetId, _positionObj) {
    var content = getContent(_widgetId);
    var position = _positionObj || {};
    var index;
    var prop;
    if (!content || typeof content.setPropertyValue !== "function") {
      return;
    }
    for (index = 0; index < LAYOUT_PROPS.length; index += 1) {
      prop = LAYOUT_PROPS[index];
      if (position[prop] !== undefined) {
        content.setPropertyValue(prop, position[prop]);
      }
    }
  }

  function enterWidgetFocusMode(_widgetId) {
    var widgetEl = document.getElementById(String(_widgetId || ""));
    var hiddenMaxButton;
    if (!widgetEl) {
      return false;
    }
    hiddenMaxButton = widgetEl.querySelector(focus.resizeEdgeTopRightSelector);
    if (!hiddenMaxButton || typeof hiddenMaxButton.click !== "function") {
      return false;
    }
    hiddenMaxButton.click();
    return true;
  }

  function exitWidgetFocusMode(_widgetId) {
    var id = String(_widgetId || "");
    var expandedWidget = null;
    var expandContainer = null;
    var collapseButton;
    var fallbackContainer = null;
    if (!id) {
      return false;
    }
    expandedWidget = document.querySelector(focus.expandedWidgetSelectorPrefix + id + "\"]");
    if (!expandedWidget) {
      return false;
    }
    if (typeof expandedWidget.closest === "function") {
      expandContainer = expandedWidget.closest(focus.expandModeContainerSelector);
    }
    if (!expandContainer) {
      return false;
    }
    collapseButton = expandContainer.querySelector(focus.collapseSvgFocusModeSelector);
    if (!collapseButton) {
      fallbackContainer = document.querySelector(focus.expandModeContainerSelector);
      collapseButton = (fallbackContainer || expandContainer).querySelector(focus.collapseSvgSelector);
    }
    if (!collapseButton || typeof collapseButton.click !== "function") {
      return false;
    }
    collapseButton.click();
    return true;
  }

  function createWidgetsApi() {
    return {
      // console helper / host knowledge base, no app caller
      getWidget: getWidget,

      getContent: getContent,

      getContainer: function (_widgetId) {
        return getContent(_widgetId).getContainer();
      },

      getType: function (_widgetId) {
        return getWidget(_widgetId).getType();
      },

      getScope: function (_widgetId) {
        return getWidget(_widgetId).getScope();
      },

      getContentPropertyNameList: function (_widgetId) {
        return getContent(_widgetId).getPropertyNameList();
      },

      getPropertyLayoutList: function (_widgetId) {
        return getContent(_widgetId).getPropertyLayoutList();
      },

      getContentPropertyValue: function (_propertyName, _widgetId) {
        return getContent(_widgetId).getPropertyValue(_propertyName);
      },

      renderWidget: renderWidget,
      setLayoutPosition: setLayoutPosition,
      enterWidgetFocusMode: enterWidgetFocusMode,
      exitWidgetFocusMode: exitWidgetFocusMode
    };
  }

  return createWidgetsApi;
});

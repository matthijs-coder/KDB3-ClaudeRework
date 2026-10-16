define(["../cognosHost/config/widgetChromeSelectors.js"], function (_widgetChrome) {
  "use strict";

  var focus = _widgetChrome.focusMode.strings;

  function __controller(_KDB) {
    try {
      return {
        getWidget: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId);
        },

        getContent: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getContent(_widgetId);
        },

        getContainer: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getContent(_widgetId).getContainer();
        },

        getType: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getType();
        },

        getScope: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getScope();
        },

        getContentPropertyNameList: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getContent(_widgetId).getPropertyNameList();
        },

        getPropertyLayoutList: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getContent(_widgetId).getPropertyLayoutList();
        },

        getContentPropertyValue: function (_propertyName, _widgetId) {
          return __getDashboardAPI().getCanvas().getContent(_widgetId).getPropertyValue(_propertyName);
        },

        renderWidget: function (_widgetId) {
          const widget = __getDashboardAPI().getCanvas().getWidget(_widgetId);
          if (!widget || typeof widget.render !== "function") {
            return Promise.resolve();
          }
          return Promise.resolve(widget.render());
        },

        setLayoutPosition: function (_widgetId, _positionObj) {
          const content = this.getContent(_widgetId);
          const position = _positionObj || {};
          const props = ["left", "top", "width", "height"];
          if (!content || typeof content.setPropertyValue !== "function") {
            return;
          }
          for (let index = 0; index < props.length; index += 1) {
            const prop = props[index];
            if (position[prop] !== undefined) {
              content.setPropertyValue(prop, position[prop]);
            }
          }
        },

        enterWidgetFocusMode: function (_widgetId) {
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
        },

        exitWidgetFocusMode: function (_widgetId) {
          var id = String(_widgetId || "");
          var expandedWidget = null;
          var expandContainer = null;
          var collapseButton;
          var fallbackContainer = null;
          if (!id) {
            return false;
          }
          expandedWidget = document.querySelector(
            focus.expandedWidgetSelectorPrefix + id + "\"]"
          );
          if (!expandedWidget) {
            return false;
          }
          if (typeof expandedWidget.closest === "function") {
            expandContainer = expandedWidget.closest(focus.expandModeContainerSelector);
          }
          if (!expandContainer) {
            return false;
          }
          collapseButton = expandContainer.querySelector(
            focus.collapseSvgFocusModeSelector
          );
          if (!collapseButton) {
            fallbackContainer = document.querySelector(focus.expandModeContainerSelector);
            collapseButton = (fallbackContainer || expandContainer).querySelector(
              focus.collapseSvgSelector
            );
          }
          if (!collapseButton || typeof collapseButton.click !== "function") {
            return false;
          }
          collapseButton.click();
          return true;
        },
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});

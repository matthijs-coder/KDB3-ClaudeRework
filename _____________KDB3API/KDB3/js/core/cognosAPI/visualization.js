define([], function () {
  "use strict";

  function __controller(_KDB) {
    try {
      return {
        getVizFeature: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization");
        },

        getVisApi: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getVisApi();
        },

        getVisualization: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getVisualization();
        },

        getVisType: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getType();
        },

        setVisType: function (_visType, _widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .setType(_visType);
        },

        setContentPropertyValue: function (_widgetId, _propertyName, _propertyValue) {
          var content = __getDashboardAPI().getCanvas().getContent(_widgetId);
          if (!content) {
            throw new Error(
              "setContentPropertyValue: dashboard content not found for widgetId \"" + _widgetId + "\""
            );
          }
          if (typeof content.setPropertyValue !== "function") {
            throw new Error(
              "setContentPropertyValue: content has no setPropertyValue for widgetId \"" + _widgetId + "\""
            );
          }
          return content.setPropertyValue(_propertyName, _propertyValue);
        },

        getContentPropertyValue: function (_widgetId, _propertyName) {
          var content = __getDashboardAPI().getCanvas().getContent(_widgetId);
          if (!content || typeof content.getPropertyValue !== "function") {
            return undefined;
          }
          return content.getPropertyValue(_propertyName);
        },

        getVisTitle: function (_widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getVisApi().getTitle();
        },

        setVisTitle: function (_newTitleText, _widgetId) {
          return __getDashboardAPI().getCanvas().getWidget(_widgetId).getVisApi().setTitle(_newTitleText);
        },

        setVizDataSource: function (_dataSourceId, _widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .setDataSource(_dataSourceId);
        },

        getVizDataSource: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getDataSource();
        },

        getVizDataSourceId: function (_widgetId) {
          const dataSource = __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getDataSource();
          return dataSource ? dataSource.getId() : undefined;
        },

        getVizDataSourceName: function (_widgetId) {
          const dataSource = __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getDataSource();
          if (!dataSource) {
            return Promise.resolve(null);
          }
          return dataSource.getModule().then(function (mod) {
            return mod ? mod.getSourceName() : null;
          });
        },

        getSlots: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getSlots();
        },

        getSlotList: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getSlots()
            .getSlotList();
        },

        getSlotValues: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getSlots()
            .getSlot("values");
        },

        getCategoriesDataArr: function (_widgetId) {
          const slot = __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getSlots()
            .getSlot("categories");
          return slot && typeof slot.getDataItemList === "function" ? slot.getDataItemList() : undefined;
        },

        getLocalFilters: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getLocalFilters();
        },

        getLocalFiltersList: function (_widgetId) {
          return __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getLocalFilters()
            .getFilterList();
        },

        removeLocalFilter: function (_widgetId, _filterId) {
          __getDashboardAPI()
            .getCanvas()
            .getContent(_widgetId)
            .getFeature("Visualization")
            .getLocalFilters()
            .removeFilter(_filterId);
        },

        setCustomLabel: function (_widgetId, _slotId, _columnId, _label) {
          var list, i, item, id;
          if (typeof _label !== "string" || !_label) { return; }
          list = __getDashboardAPI().getCanvas().getContent(_widgetId).getFeature("Visualization").getSlots().getSlot(_slotId).getDataItemList();
          for (i = 0; i < (list ? list.length : 0); i += 1) {
            item = list[i];
            id = item && typeof item.getColumnId === "function" ? item.getColumnId() : null;
            if (id !== _columnId) { id = item && typeof item.getId === "function" ? item.getId() : null; }
            if (id === _columnId) {
              if (typeof item.setCustomLabel !== "function") { throw new Error("HOST_CAPABILITY_MISSING"); }
              item.setCustomLabel(_label);
              return;
            }
          }
          throw new Error("ITEM_NOT_FOUND");
        }
      };
    } catch (error) {
      console.error("[KDB][__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});

define([], function () {
  "use strict";

  function getContent(_widgetId) {
    return __getDashboardAPI().getCanvas().getContent(_widgetId);
  }

  function vizFeature(_widgetId) {
    return getContent(_widgetId).getFeature("Visualization");
  }

  function getWidget(_widgetId) {
    return __getDashboardAPI().getCanvas().getWidget(_widgetId);
  }

  function visApi(_widgetId) {
    return getWidget(_widgetId).getVisApi();
  }

  function setContentPropertyValue(_widgetId, _propertyName, _propertyValue) {
    var content = getContent(_widgetId);
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
  }

  function getContentPropertyValue(_widgetId, _propertyName) {
    var content = getContent(_widgetId);
    if (!content || typeof content.getPropertyValue !== "function") {
      return undefined;
    }
    return content.getPropertyValue(_propertyName);
  }

  function getVizDataSourceId(_widgetId) {
    var dataSource = vizFeature(_widgetId).getDataSource();
    return dataSource ? dataSource.getId() : undefined;
  }

  function getVizDataSourceName(_widgetId) {
    var dataSource = vizFeature(_widgetId).getDataSource();
    if (!dataSource) {
      return Promise.resolve(null);
    }
    return dataSource.getModule().then(function (mod) {
      return mod ? mod.getSourceName() : null;
    });
  }

  function getCategoriesDataArr(_widgetId) {
    var slot = vizFeature(_widgetId).getSlots().getSlot("categories");
    return slot && typeof slot.getDataItemList === "function" ? slot.getDataItemList() : undefined;
  }

  function setCustomLabel(_widgetId, _slotId, _columnId, _label) {
    var list;
    var index;
    var item;
    var id;
    if (typeof _label !== "string" || !_label) {
      return;
    }
    list = vizFeature(_widgetId).getSlots().getSlot(_slotId).getDataItemList();
    for (index = 0; index < (list ? list.length : 0); index += 1) {
      item = list[index];
      id = item && typeof item.getColumnId === "function" ? item.getColumnId() : null;
      if (id !== _columnId) {
        id = item && typeof item.getId === "function" ? item.getId() : null;
      }
      if (id === _columnId) {
        if (typeof item.setCustomLabel !== "function") {
          throw new Error("HOST_CAPABILITY_MISSING");
        }
        item.setCustomLabel(_label);
        return;
      }
    }
    throw new Error("ITEM_NOT_FOUND");
  }

  function createVisualizationApi() {
    return {
      getVizFeature: vizFeature,
      getVisApi: visApi,

      getVisualization: function (_widgetId) {
        return getWidget(_widgetId).getVisualization();
      },

      getVisType: function (_widgetId) {
        return vizFeature(_widgetId).getType();
      },

      setVisType: function (_visType, _widgetId) {
        return vizFeature(_widgetId).setType(_visType);
      },

      setContentPropertyValue: setContentPropertyValue,
      getContentPropertyValue: getContentPropertyValue,

      getVisTitle: function (_widgetId) {
        return visApi(_widgetId).getTitle();
      },

      setVisTitle: function (_newTitleText, _widgetId) {
        return visApi(_widgetId).setTitle(_newTitleText);
      },

      setVizDataSource: function (_dataSourceId, _widgetId) {
        return vizFeature(_widgetId).setDataSource(_dataSourceId);
      },

      getVizDataSource: function (_widgetId) {
        return vizFeature(_widgetId).getDataSource();
      },

      getVizDataSourceId: getVizDataSourceId,
      getVizDataSourceName: getVizDataSourceName,

      getSlots: function (_widgetId) {
        return vizFeature(_widgetId).getSlots();
      },

      getSlotList: function (_widgetId) {
        return vizFeature(_widgetId).getSlots().getSlotList();
      },

      getSlotValues: function (_widgetId) {
        return vizFeature(_widgetId).getSlots().getSlot("values");
      },

      getCategoriesDataArr: getCategoriesDataArr,

      getLocalFilters: function (_widgetId) {
        return vizFeature(_widgetId).getLocalFilters();
      },

      // console helper / host knowledge base, no app caller
      getLocalFiltersList: function (_widgetId) {
        return vizFeature(_widgetId).getLocalFilters().getFilterList();
      },

      removeLocalFilter: function (_widgetId, _filterId) {
        vizFeature(_widgetId).getLocalFilters().removeFilter(_filterId);
      },

      setCustomLabel: setCustomLabel
    };
  }

  return createVisualizationApi;
});

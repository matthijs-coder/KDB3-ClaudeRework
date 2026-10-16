define([
  "./filters/listGlobalFilterItems.js",
  "./filters/listPageContextFilterItems.js",
  "./filters/cloneFilterValues.js"
], function (_listGlobalFilterItems, _listPageContextFilterItems, _cloneFilterValues) {
  "use strict";

  function readPageContextService() {
    try {
      return __getDashboardAPI().getFeature("PageContextService");
    } catch (error) {
      console.error("[cognosAPI.filters.readPageContextService] failed", error);
      throw error;
    }
  }

  function readPageContext() {
    try {
      return __getDashboardAPI().getFeature("PageContextService").getPageContext();
    } catch (error) {
      console.error("[cognosAPI.filters.readPageContext] failed", error);
      throw error;
    }
  }

  function readPageContextItemsArr(_allowEmpty) {
    var result;
    try {
      result = __getDashboardAPI()
        .getFeature("PageContextService")
        .getPageContext()
        .getPageContextItems();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error("[cognosAPI.filters.readPageContextItemsArr] failed", error);
      throw error;
    }
  }

  function clearFilterContext(_filterAPI) {
    try {
      return __getDashboardAPI().getFeature("PageContextService").getPageContext().updateFilterContext(
        { sourceId: _filterAPI.getSourceId(), itemId: _filterAPI.getItemId(), scope: _filterAPI.getScope() },
        { command: "clearValues" }
      );
    } catch (error) {
      console.error("[cognosAPI.filters.clearFilterContext] failed", error);
      throw error;
    }
  }

  function replaceFilterContext(_filterAPI, _valuesArr) {
    try {
      return __getDashboardAPI().getFeature("PageContextService").getPageContext().updateFilterContext(
        {
          dataType: _filterAPI.getDataType(),
          eventSourceId: _filterAPI.getEventSourceId(),
          isHierarchy: _filterAPI.isHierarchy(),
          isNamedSet: _filterAPI.getIsNamedSet(),
          itemId: _filterAPI.getItemId(),
          itemName: _filterAPI.getItemName(),
          scope: _filterAPI.getScope(),
          sourceId: _filterAPI.getSourceId()
        },
        { command: "replace", exclude: false, values: _valuesArr }
      );
    } catch (error) {
      console.error("[cognosAPI.filters.replaceFilterContext] failed", error);
      throw error;
    }
  }

  function __controller(_KDB) {
    try {
      return {
        getPageContextService: function () { return readPageContextService(); },
        getPageContext: function () { return readPageContext(); },
        deleteAllPageContextItems: function () { return readPageContext().deletePageContextItems(); },
        getPageContextItemsArr: function (_allowEmpty) { return readPageContextItemsArr(_allowEmpty); },
        getFilterScope: function (_pageContextItem) { return _pageContextItem.getScope(); },
        getFilterSourceId: function (_pageContextItem) { return _pageContextItem.getSourceId(); },
        getFilterItemId: function (_pageContextItem) { return _pageContextItem.getItemId(); },
        getFilterItemLabel: function (_pageContextItem) { return _pageContextItem.getItemName(); },
        getFilterValues: function (_pageContextItem) { return _cloneFilterValues(_pageContextItem.getValues()); },
        getFilterCommand: function (_pageContextItem) { return _pageContextItem.getExclude() ? "notin" : "in"; },
        getAllGlobalFilterItems: function () { return _listGlobalFilterItems(readPageContextItemsArr(true)); },
        getAllPageContextFilterItems: function () { return _listPageContextFilterItems(readPageContextItemsArr(true)); },
        clearPageContextFilter: function (_filterAPI) { return clearFilterContext(_filterAPI); },
        removePageContextFilter: function (_filterAPI) {
          return readPageContext().updateFilterContext(
            { item: _filterAPI, scope: _filterAPI.getScope(), origin: "filter" },
            { command: "delete" }
          );
        },
        updateFilter: function (_sourceObj, _commandObj) { return readPageContext().updateFilterContext(_sourceObj, _commandObj); },
        updateFilterContext: function (_filterAPI, _valuesArr) {
          return readPageContext().updateFilterContext(
            {
              sourceId: _filterAPI.getSourceId(),
              itemId: _filterAPI.getItemId(),
              itemName: _filterAPI.getItemName(),
              dataType: _filterAPI.getDataType(),
              usage: _filterAPI.getUsage(),
              scope: _filterAPI.getScope(),
              openViewOnLoad: _filterAPI.shouldOpenViewOnLoad(),
              isHierarchy: _filterAPI.isHierarchy(),
              isModeledFilter: _filterAPI.getIsModeledFilter(),
              isNamedSet: _filterAPI.getIsNamedSet()
            },
            { command: "update", values: _valuesArr }
          );
        },
        replaceFilterContext: function (_filterAPI, _valuesArr) { return replaceFilterContext(_filterAPI, _valuesArr); },
        updateFilterContextRaw: function (_dataObj, _commandObj) {
          return readPageContext().updateFilterContext(_dataObj, _commandObj || { command: "update", values: [] });
        },
        triggerDashboardEvent: function (_command) { return __getDashboardAPI().triggerDashboardEvent(_command); }
      };
    } catch (error) {
      console.error("[cognosAPI.filters.__controller] failed", error);
      throw error;
    }
  }

  return __controller;
});

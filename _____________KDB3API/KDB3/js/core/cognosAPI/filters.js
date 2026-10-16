define([], function () {
  "use strict";

  function readPageContextService() {
    return __getDashboardAPI().getFeature("PageContextService");
  }

  function readPageContext() {
    return readPageContextService().getPageContext();
  }

  function readPageContextItems() {
    var result = readPageContext().getPageContextItems();
    return Array.isArray(result) ? result : [];
  }

  function isGlobalScope(_filterItem) {
    return _filterItem.getScope() === "global";
  }

  function isPageContextScope(_filterItem) {
    return _filterItem.getScope() !== "global";
  }

  function cloneFilterValue(_value) {
    return {
      d: _value && Object.prototype.hasOwnProperty.call(_value, "d") ? _value.d : null,
      u: _value && Object.prototype.hasOwnProperty.call(_value, "u") ? _value.u : null
    };
  }

  function cloneFilterValues(_values) {
    if (!Array.isArray(_values) || _values.length === 0) {
      return [];
    }
    return _values.map(cloneFilterValue);
  }

  function clearFilterContext(_filterAPI) {
    return readPageContext().updateFilterContext(
      { sourceId: _filterAPI.getSourceId(), itemId: _filterAPI.getItemId(), scope: _filterAPI.getScope() },
      { command: "clearValues" }
    );
  }

  function replaceFilterContext(_filterAPI, _valuesArr) {
    return readPageContext().updateFilterContext(
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
  }

  function updateFilterContext(_filterAPI, _valuesArr) {
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
  }

  function removePageContextFilter(_filterAPI) {
    return readPageContext().updateFilterContext(
      { item: _filterAPI, scope: _filterAPI.getScope(), origin: "filter" },
      { command: "delete" }
    );
  }

  function createFiltersApi() {
    return {
      getPageContextService: readPageContextService,
      getPageContext: readPageContext,
      deleteAllPageContextItems: function () { return readPageContext().deletePageContextItems(); },
      getPageContextItemsArr: readPageContextItems,
      getFilterScope: function (_pageContextItem) { return _pageContextItem.getScope(); },
      getFilterSourceId: function (_pageContextItem) { return _pageContextItem.getSourceId(); },
      getFilterItemId: function (_pageContextItem) { return _pageContextItem.getItemId(); },
      getFilterItemLabel: function (_pageContextItem) { return _pageContextItem.getItemName(); },
      getFilterValues: function (_pageContextItem) { return cloneFilterValues(_pageContextItem.getValues()); },
      getFilterCommand: function (_pageContextItem) { return _pageContextItem.getExclude() ? "notin" : "in"; },
      getAllGlobalFilterItems: function () { return readPageContextItems().filter(isGlobalScope); },
      getAllPageContextFilterItems: function () { return readPageContextItems().filter(isPageContextScope); },
      clearPageContextFilter: clearFilterContext,
      removePageContextFilter: removePageContextFilter,
      updateFilter: function (_sourceObj, _commandObj) { return readPageContext().updateFilterContext(_sourceObj, _commandObj); },
      updateFilterContext: updateFilterContext,
      replaceFilterContext: replaceFilterContext,
      updateFilterContextRaw: function (_dataObj, _commandObj) {
        return readPageContext().updateFilterContext(_dataObj, _commandObj || { command: "update", values: [] });
      },
      triggerDashboardEvent: function (_command) { return __getDashboardAPI().triggerDashboardEvent(_command); }
    };
  }

  return createFiltersApi;
});

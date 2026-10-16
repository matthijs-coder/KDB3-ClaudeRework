define([
  "./buildKeepexcludeConditionsFilterObj.js"
], function (_buildKeepexcludeConditionsFilterObj) {
  "use strict";

  function bindNamed(_facet, _name) {
    if (!_facet || typeof _facet[_name] !== "function") {
      return null;
    }
    return _facet[_name].bind(_facet);
  }

  function setVisTypeOnFacet(_visualizationFacet, _visType, _widgetId, _options) {
    return _visualizationFacet.setVisType(_widgetId, _visType, _options);
  }

  function setDataSourceOnFacet(_visualizationFacet, _dataSourceId, _widgetId, _options) {
    return _visualizationFacet.setDataSource(_widgetId, _dataSourceId, _options);
  }

  function sortDataItemOnFacet(_visualizationFacet, _slotId, _dataItemId, _itemOrder, _widgetId, _priority, _options) {
    var options = Object.assign({}, _options || {}, { priority: _priority });
    return _visualizationFacet.sortDataItemInSlot(_widgetId, _slotId, _dataItemId, _itemOrder, options);
  }

  function wrapSetVisType(_visualizationFacet) {
    if (!_visualizationFacet || typeof _visualizationFacet.setVisType !== "function") {
      return null;
    }
    return setVisTypeOnFacet.bind(null, _visualizationFacet);
  }

  function wrapSetDataSource(_visualizationFacet) {
    if (!_visualizationFacet || typeof _visualizationFacet.setDataSource !== "function") {
      return null;
    }
    return setDataSourceOnFacet.bind(null, _visualizationFacet);
  }

  function wrapSortDataItem(_visualizationFacet) {
    if (!_visualizationFacet || typeof _visualizationFacet.sortDataItemInSlot !== "function") {
      return null;
    }
    return sortDataItemOnFacet.bind(null, _visualizationFacet);
  }

  function __controller(_deps) {
    var deps = _deps || {};
    var visualizationFacet = deps.visualizationFacet;
    var widgetsFacet = deps.widgetsFacet;
    var canvasFacet = deps.canvasFacet;
    var facade;

    try {
      facade = {
        getVisType: bindNamed(visualizationFacet, "getVisType"),
        setVizDataSource: wrapSetDataSource(visualizationFacet),
        setVisType: wrapSetVisType(visualizationFacet),
        clearAllLocalFilters: bindNamed(visualizationFacet, "clearAllLocalFilters"),
        removeLocalFilter: bindNamed(visualizationFacet, "removeLocalFilter"),
        renderWidget: bindNamed(widgetsFacet, "renderWidget"),
        whenRenderStart: bindNamed(canvasFacet, "whenRenderStart"),
        whenRenderComplete: bindNamed(canvasFacet, "whenRenderComplete"),
        clearAllSlots: bindNamed(visualizationFacet, "clearAllSlots"),
        addDataItemsToSlot: bindNamed(visualizationFacet, "addDataItemsToSlot"),
        setTopBottomOnSlot: bindNamed(visualizationFacet, "setTopBottomOnSlot"),
        setCustomLabelInSlot: bindNamed(visualizationFacet, "setCustomLabelInSlot"),
        sortDataItemInSlot: wrapSortDataItem(visualizationFacet),
        addOrReplaceLocalFilter: bindNamed(visualizationFacet, "addOrReplaceLocalFilter"),
        buildKeepexcludeConditionsFilterObj: _buildKeepexcludeConditionsFilterObj,
        isComplete: function () {
          return !!(
            this.getVisType &&
            this.setVizDataSource &&
            this.setVisType &&
            this.clearAllLocalFilters &&
            this.removeLocalFilter &&
            this.renderWidget &&
            this.whenRenderComplete &&
            this.clearAllSlots &&
            this.addDataItemsToSlot &&
            this.setTopBottomOnSlot &&
            this.setCustomLabelInSlot &&
            this.sortDataItemInSlot &&
            this.addOrReplaceLocalFilter &&
            this.buildKeepexcludeConditionsFilterObj
          );
        }
      };
      return facade;
    } catch (err) {
      console.error("[widgetBindingApply.createCognosBindingFacade] failed", err);
      throw err;
    }
  }

  return __controller;
});

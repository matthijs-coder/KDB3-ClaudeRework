define([
  "../bindingConfig.js",
  "../config.js",
  "../state.js",
  "../visTypes.js",
  "../../../../core/utils/normalizeDefaultValue.js",
  "../../../../core/utils/kit/data.js"
], function (_bindingConfig, _config, _state, _visTypes, _normalizeDefaultValue, _data) {
  "use strict";

  function copyFilterValue(_value) {
    var copy = {};
    if (Array.isArray(_value)) {
      return _value.slice();
    }
    if (!_data.isObjectLike(_value)) {
      return _value;
    }
    Object.keys(_value).forEach(function (_key) {
      copy[_key] = Array.isArray(_value[_key]) ? _value[_key].slice() : _value[_key];
    });
    return copy;
  }

  function expandToken(_token, _parameterMap) {
    if (_token === "") {
      return "";
    }
    if (typeof _token !== "string" || _token.charAt(0) === "[" || !_parameterMap) {
      return _token;
    }
    if (_token === "Jahr" && _parameterMap.Jahr_slots_KID != null) {
      return _parameterMap.Jahr_slots_KID;
    }
    if (_token === "Monat" && _parameterMap.Monat_slots_KID != null) {
      return _parameterMap.Monat_slots_KID;
    }
    return _token;
  }

  function expandSlotValue(_value, _parameterMap) {
    if (_value === "") {
      return "";
    }
    if (!Array.isArray(_value)) {
      return expandToken(_value, _parameterMap);
    }
    return _value.map(function (_token) { return expandToken(_token, _parameterMap); });
  }

  function mergeWidgetFilter(_target, _source) {
    var result = _target || {};
    if (!_data.isObjectLike(_source)) {
      return result;
    }
    Object.keys(_source).forEach(function (_key) {
      var incoming = _source[_key];
      if (incoming === null) {
        delete result[_key];
      } else if (_key !== "AggregationstypId" && _data.isObjectLike(result[_key]) && _data.isObjectLike(incoming)) {
        result[_key] = Object.assign({}, result[_key], copyFilterValue(incoming));
      } else {
        result[_key] = copyFilterValue(incoming);
      }
    });
    return result;
  }

  function expandWidgetFilterKeys(_widgetFilter, _parameterMap) {
    var result = {};
    if (!_data.isObjectLike(_widgetFilter)) {
      return _widgetFilter;
    }
    Object.keys(_widgetFilter).forEach(function (_key) {
      var kid = (_key === "Monat" || _key === "Jahr") ? _parameterMap && _parameterMap[_key + "_widget_localfilter_KID"] : undefined;
      result[typeof kid === "string" ? kid : _key] = copyFilterValue(_widgetFilter[_key]);
    });
    return result;
  }

  function applyGrainOverlayOnClone(_clone, _overlay, _parameterMap) {
    if (!_overlay) {
      return _clone;
    }
    Object.keys(_overlay).forEach(function (_key) {
      if (_key !== "widgetFilter") {
        _clone[_key] = expandSlotValue(_overlay[_key], _parameterMap);
      }
    });
    if (Object.prototype.hasOwnProperty.call(_overlay, "widgetFilter")) {
      _clone.widgetFilter = mergeWidgetFilter(_clone.widgetFilter || {}, expandWidgetFilterKeys(_overlay.widgetFilter, _parameterMap));
    }
    return _clone;
  }

  function mapEmptyIntent(_input, _emptyDataFilter) {
    if (_input.forceEmpty === true) {
      return {
        enabled: true,
        reason: _input.emptyReason || _input.reason || null,
        itemId: _emptyDataFilter && _emptyDataFilter.itemId ? _emptyDataFilter.itemId : null,
        value: "1"
      };
    }
    return _input.emptyIntent || { enabled: false, reason: null, itemId: null, value: null };
  }

  function mapResetIntent(_input) {
    return _input.resetIntent || { enabled: false, scope: null, clearAllSlots: false, clearAllLocalFilters: false, reason: null };
  }

  function buildBindingSpec(_KDB, _input) {
    var input = _input || {};
    var metric = _state.normalizeMetricIdentity(input.metric || {});
    var inputSettings = input.settings || {};
    var settings = {
      dimension: inputSettings.dimension != null ? inputSettings.dimension : null,
      visType: inputSettings.visType != null ? inputSettings.visType : null,
      topNChoice: inputSettings.topNChoice != null ? inputSettings.topNChoice : null
    };
    var metricsTable = metric.metricsTable || _bindingConfig.resolveCurrentMetricsDataSource(_KDB);
    var visualizationType = settings.visType || _visTypes.resolveDefaultVisualizationType(_KDB);
    var bindingContext = _bindingConfig.resolveBindingContext(_KDB, {
      kennzahlCode: metric.code,
      kennzahlenTable: metricsTable,
      visualizationType: visualizationType,
      datasourceHints: { datasourceId: null, datasourceName: null }
    });
    var planSnapshots = bindingContext.planSnapshots;
    var datasourceIdentity = bindingContext.datasourceIdentity;
    var filterPropObj = _data.cloneJson(planSnapshots.filterPropObj);
    var hierarchySnap = input.hierarchySnapshot || null;
    var visTypeConfig = _data.cloneJson(bindingContext.visTypeConfig || {});
    var grouping = inputSettings.grouping;
    var overlay = _visTypes.resolveGrainOverlay(visualizationType, _visTypes.resolveEffectiveGrain(visualizationType, grouping, _KDB), _KDB);
    var dimension = _normalizeDefaultValue(settings.dimension);
    var spec;
    if (hierarchySnap && hierarchySnap.hierarchyItemId && hierarchySnap.activeDownstreamName) {
      filterPropObj[hierarchySnap.activeDownstreamName] = Object.assign(
        {},
        filterPropObj[hierarchySnap.activeDownstreamName] || {},
        { itemId: String(hierarchySnap.hierarchyItemId) }
      );
    }
    if (overlay) {
      applyGrainOverlayOnClone(visTypeConfig, overlay, planSnapshots.parameterMappingObj);
    }
    spec = {
      reason: input.reason || "contentCreate",
      targetKind: "vis",
      widgetId: input.widgetId || null,
      ownerWidgetId: null,
      opSeq: input.opSeq || null,
      dataConfig: {
        kennzahlCode: metric.code || "",
        kennzahlDisplay: metric.display || null,
        kennzahlenTable: metricsTable,
        datasourceName: datasourceIdentity.datasourceName,
        datasourceId: datasourceIdentity.datasourceId,
        visualizationType: bindingContext.normalizedVisualizationType,
        cognosVisualizationTypeId: bindingContext.cognosVisualizationTypeId,
        visPropBucketKey: bindingContext.visPropBucketKey,
        visTypeConfig: visTypeConfig,
        dataTableConfig: _data.cloneJson(bindingContext.dataTableConfig || { dimensions: {}, sorting: {} }),
        kennzahlDefaults: _data.cloneJson(bindingContext.kennzahlDefaults || {}),
        dimension: dimension,
        topN: dimension == null ? null : _normalizeDefaultValue(settings.topNChoice),
        hierarchyTarget: null
      },
      hierarchySnapshot: _data.cloneJson(input.hierarchySnapshot || null),
      helperTableResult: _data.cloneJson(input.helperTableResult || null),
      emptyIntent: mapEmptyIntent(input, planSnapshots.emptyDataFilter),
      resetIntent: _data.cloneJson(mapResetIntent(input)),
      config: {
        filterPropObj: filterPropObj,
        parameterMappingObj: _data.cloneJson(planSnapshots.parameterMappingObj),
        topNOptions: _data.cloneJson(planSnapshots.topNOptions),
        emptyDataFilter: _data.cloneJson(planSnapshots.emptyDataFilter)
      }
    };
    if (_config.isGroupingValue(grouping)) {
      spec.dataConfig.grouping = grouping;
    }
    return spec;
  }

  // The TopN gate builds the spec once; the final spec differs only by the helper result, so it is reused.
  function resolvePipelineSpec(_KDB, _input, _gateSpec) {
    if (!_gateSpec) {
      return buildBindingSpec(_KDB, _input);
    }
    return Object.assign({}, _gateSpec, { helperTableResult: _data.cloneJson(_input.helperTableResult || null) });
  }

  return {
    buildBindingSpec: buildBindingSpec,
    resolvePipelineSpec: resolvePipelineSpec
  };
});

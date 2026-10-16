define([
  "../runtime.js",
  "../visTypes.js",
  "../results.js"
], function (_visRuntime, _visTypes, _results) {
  "use strict";

  var VALUE_LABELS_VISIBLE = "valueLabels.visible";
  var LABELS_VISIBLE = "labels.visible";
  var CONTRAST_LABEL_COLOR = "contrast.label.color";
  var VALUE_LABELS_COLOR = "valueLabels.color";
  var FACET_MISSING = "WIDGET_VIS_FACET_MISSING";

  var ITERATOR_HOST_BY_TYPE = {
    Pie: "widget.iterator",
    Line: "widget.iterator",
    StackedBar: "widget.iterator",
    StackedColumn: "widget.iterator"
  };
  var ZOOM_HOST_BY_TYPE = {
    Line: "zoom.bar.enable",
    Prognose: "zoom.bar.enable",
    StackedBar: "zoom.bar.enable",
    StackedColumn: "zoom.bar.enable"
  };
  var VALUE_CAPTION_HOST_BY_TYPE = {
    Line: "valueAxis.ticks.labels.visible",
    StackedBar: "valueAxis.ticks.labels.visible",
    StackedColumn: "valueAxis.ticks.labels.visible",
    Prognose: "valueAxis.ticks.labels.visible"
  };
  var HOST_MAP_BY_CONTROL = {
    iterator: ITERATOR_HOST_BY_TYPE,
    zoom: ZOOM_HOST_BY_TYPE,
    valueCaption: VALUE_CAPTION_HOST_BY_TYPE
  };
  var STANDARD_ON_BY_CONTROL = {
    iterator: { Pie: true, Line: true, StackedBar: true, StackedColumn: true },
    valueCaption: { Line: true, StackedBar: true, StackedColumn: true, Prognose: true }
  };

  function isListType(_type) {
    return _visTypes.normalizeVisualizationType(_type) === "List";
  }

  function normalizeType(_type) {
    return _visTypes.normalizeVisualizationType(_type) || _type;
  }

  function failedWriteResult(_outcome) {
    return _outcome && _outcome.errorCode ? { ok: false, errorCode: _outcome.errorCode } : { ok: false };
  }

  function readContentPropertyFacet(_KDB) {
    var facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
    return facet && typeof facet.setContentProperty === "function" ? facet : null;
  }

  async function writeProperties(_facet, _widgetId, _writes) {
    var index;
    for (index = 0; index < _writes.length; index += 1) {
      var outcome = await Promise.resolve(_facet.setContentProperty(_widgetId, _writes[index][0], _writes[index][1]));
      if (!outcome || outcome.ok !== true) {
        return failedWriteResult(outcome);
      }
    }
    return { ok: true };
  }

  function overlayShowValuesOnLayoutMap(_layoutMap, _settings, _normalizedType) {
    var cloned = Object.assign({}, _layoutMap || {});
    if (isListType(_normalizedType)) {
      delete cloned[VALUE_LABELS_VISIBLE];
      delete cloned[LABELS_VISIBLE];
      delete cloned[CONTRAST_LABEL_COLOR];
      delete cloned[VALUE_LABELS_COLOR];
      return cloned;
    }
    var settings = _settings || {};
    if (typeof settings.showValues === "boolean") {
      cloned[VALUE_LABELS_VISIBLE] = settings.showValues;
      cloned[LABELS_VISIBLE] = settings.showValues;
    }
    if (cloned[VALUE_LABELS_VISIBLE] === true || cloned[LABELS_VISIBLE] === true) {
      cloned[CONTRAST_LABEL_COLOR] = true;
      cloned[VALUE_LABELS_COLOR] = true;
    }
    return cloned;
  }

  async function applyShowValues(_KDB, _widgetId, _nextValue, _normalizedVisType) {
    var type = normalizeType(_normalizedVisType);
    if (isListType(type)) {
      return { ok: true, skipped: true, reason: "list" };
    }
    var writeValue = _nextValue;
    if (_nextValue === "inherit") {
      var catalog = _visTypes.resolveVisualizationLayoutPropertyValues(type, _KDB);
      writeValue = !!(catalog && catalog[VALUE_LABELS_VISIBLE] === true);
    }
    var facet = readContentPropertyFacet(_KDB);
    if (!facet) {
      return { ok: false, errorCode: FACET_MISSING };
    }
    var writes = [[VALUE_LABELS_VISIBLE, writeValue], [LABELS_VISIBLE, writeValue]];
    if (writeValue === true) {
      writes.push([CONTRAST_LABEL_COLOR, true], [VALUE_LABELS_COLOR, true]);
    }
    var result = await writeProperties(facet, _widgetId, writes);
    return result.ok === true ? { ok: true, skipped: false } : result;
  }

  function isIteratorZoomControl(_control) {
    return _control === "iterator" || _control === "zoom" || _control === "valueCaption";
  }

  function resolveHostKey(_control, _type) {
    return isIteratorZoomControl(_control) && HOST_MAP_BY_CONTROL[_control][_type] ? HOST_MAP_BY_CONTROL[_control][_type] : null;
  }

  function effectiveHostBoolean(_control, _type, _value) {
    if (typeof _value === "boolean") {
      return _value;
    }
    return !!(isIteratorZoomControl(_control) && STANDARD_ON_BY_CONTROL[_control] && STANDARD_ON_BY_CONTROL[_control][_type]);
  }

  function isListOrTopN(_type) {
    return _type === "List" || _type === "TopN";
  }

  function readWidgetSettingsRecord(_KDB, _widgetId) {
    var api = _KDB && _KDB.api && _KDB.api.widgetSettings;
    if (!api || typeof api.getState !== "function") {
      return null;
    }
    var state = api.getState();
    return state && state.byWidget ? state.byWidget[_widgetId] : null;
  }

  function overlayIteratorZoomOnLayoutMap(_KDB, _widgetId, _layoutMap, _normalizedType) {
    var cloned = Object.assign({}, _layoutMap || {});
    var type = normalizeType(_normalizedType);
    if (isListOrTopN(type)) {
      return cloned;
    }
    var record = readWidgetSettingsRecord(_KDB, _widgetId);
    Object.keys(HOST_MAP_BY_CONTROL).forEach(function (_control) {
      var hostKey = HOST_MAP_BY_CONTROL[_control][type];
      if (hostKey) {
        cloned[hostKey] = effectiveHostBoolean(_control, type, record && record[_control]);
      }
    });
    return cloned;
  }

  async function applyIteratorZoom(_KDB, _widgetId, _nextValue, _normalizedVisType, _control) {
    var type = normalizeType(_normalizedVisType);
    var writeValue = effectiveHostBoolean(_control, type, _nextValue);
    if (isListOrTopN(type) && writeValue === true) {
      return { ok: true, skipped: true, reason: "list" };
    }
    var hostKey = resolveHostKey(_control, type);
    if (!hostKey) {
      return { ok: true, skipped: writeValue === true };
    }
    var facet = readContentPropertyFacet(_KDB);
    if (!facet) {
      return { ok: false, errorCode: FACET_MISSING };
    }
    var result = await writeProperties(facet, _widgetId, [[hostKey, writeValue]]);
    return result.ok === true ? { ok: true, skipped: false } : result;
  }

  function failClosed(_action, _errorCode) {
    return _results.normalizeDispatchResult({
      ok: false,
      widgetId: _action && _action.widgetId,
      opSeq: _action && _action.opSeq,
      status: "error",
      errorCode: _errorCode
    });
  }

  function buildSuccessEnvelope(_action, _result) {
    return {
      ok: true,
      widgetId: _action && _action.widgetId,
      opSeq: _action && _action.opSeq,
      status: "success",
      skipped: !!(_result && _result.skipped),
      reason: _result && _result.reason
    };
  }

  function readDisplayOptionInput(_context, _action) {
    var payload = (_action && _action.payload) || {};
    var snapshot = payload.settingsSnapshot || {};
    var widgetId = _action && _action.widgetId;
    var isValueValid = typeof payload.nextValue === "boolean" || payload.nextValue === "inherit";
    var errorCode = null;
    if (!_context.selectors.readVisRecord(_context._KDB, widgetId)) {
      errorCode = "WIDGET_VIS_CONTENT_CONTEXT_MISSING";
    } else if (!isValueValid || snapshot.visType === undefined) {
      errorCode = "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE";
    }
    return {
      payload: payload,
      widgetId: widgetId,
      visType: normalizeType(snapshot.visType),
      errorCode: errorCode
    };
  }

  async function handleApplyShowValues(_context, _action) {
    try {
      var input = readDisplayOptionInput(_context, _action);
      if (input.errorCode) {
        return failClosed(_action, input.errorCode);
      }
      var result = await applyShowValues(_context._KDB, input.widgetId, input.payload.nextValue, input.visType);
      if (!result || result.ok !== true) {
        return failClosed(_action, result && result.errorCode ? result.errorCode : FACET_MISSING);
      }
      var envelope = buildSuccessEnvelope(_action, result);
      envelope.reportToSettings = {
        control: "showValues",
        previousValue: input.payload.previousValue,
        nextValue: input.payload.nextValue
      };
      return _results.normalizeDispatchResult(envelope);
    } catch (err) {
      console.error("[widgetVis.handleApplyShowValues]", err);
      return failClosed(_action, FACET_MISSING);
    }
  }

  async function handleApplyIteratorZoom(_context, _action) {
    try {
      var input = readDisplayOptionInput(_context, _action);
      var control = input.payload.control;
      if (!input.errorCode && !isIteratorZoomControl(control)) {
        input.errorCode = "WIDGET_VIS_SETTINGS_SNAPSHOT_INCOMPLETE";
      }
      if (input.errorCode) {
        return failClosed(_action, input.errorCode);
      }
      var result = await applyIteratorZoom(_context._KDB, input.widgetId, input.payload.nextValue, input.visType, control);
      if (!result || result.ok !== true) {
        return failClosed(_action, result && result.errorCode ? result.errorCode : FACET_MISSING);
      }
      var envelope = buildSuccessEnvelope(_action, result);
      if (!envelope.skipped) {
        envelope.reportToSettings = {
          control: control,
          previousValue: input.payload.previousValue,
          nextValue: input.payload.nextValue
        };
      }
      return _results.normalizeDispatchResult(envelope);
    } catch (err) {
      console.error("[widgetVis.handleApplyIteratorZoom]", err);
      return failClosed(_action, FACET_MISSING);
    }
  }

  return {
    overlayShowValuesOnLayoutMap: overlayShowValuesOnLayoutMap,
    overlayIteratorZoomOnLayoutMap: overlayIteratorZoomOnLayoutMap,
    applyShowValues: applyShowValues,
    applyIteratorZoom: applyIteratorZoom,
    handleApplyShowValues: handleApplyShowValues,
    handleApplyIteratorZoom: handleApplyIteratorZoom
  };
});

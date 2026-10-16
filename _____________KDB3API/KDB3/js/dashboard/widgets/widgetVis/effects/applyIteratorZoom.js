define([
  "./readVisualizationFacet.js",
  "../config/visTypes/normalizeVisualizationType.js"
], function (_readVisualizationFacet, _normalizeVisualizationType) {
  "use strict";

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
  var ITERATOR_STANDARD_ON = { Pie: true, Line: true, StackedBar: true, StackedColumn: true };
  var VALUE_CAPTION_STANDARD_ON = { Line: true, StackedBar: true, StackedColumn: true, Prognose: true };

  function resolveHostKey(_control, _type) {
    if (_control === "iterator") { return ITERATOR_HOST_BY_TYPE[_type] || null; }
    if (_control === "zoom") { return ZOOM_HOST_BY_TYPE[_type] || null; }
    if (_control === "valueCaption") { return VALUE_CAPTION_HOST_BY_TYPE[_type] || null; }
    return null;
  }

  function isListOrTopN(_type) {
    return _type === "List" || _type === "TopN";
  }

  function effectiveHostBoolean(_control, _type, _value) {
    if (typeof _value === "boolean") { return _value; }
    if (_control === "iterator") { return !!ITERATOR_STANDARD_ON[_type]; }
    if (_control === "valueCaption") { return !!VALUE_CAPTION_STANDARD_ON[_type]; }
    return false;
  }

  function failedWriteResult(_outcome) {
    if (_outcome && _outcome.errorCode) {
      return { ok: false, errorCode: _outcome.errorCode };
    }
    return { ok: false };
  }

  function buildHostWrites(_control, _type, _writeValue) {
    var hostKey = resolveHostKey(_control, _type);
    if (!hostKey) { return []; }
    return [{ key: hostKey, value: _writeValue }];
  }

  async function writeHostProperties(_facet, _widgetId, _writes) {
    var index;
    var outcome;
    for (index = 0; index < _writes.length; index += 1) {
      outcome = await Promise.resolve(
        _facet.setContentProperty(_widgetId, _writes[index].key, _writes[index].value)
      );
      if (!outcome || outcome.ok !== true) {
        return failedWriteResult(outcome);
      }
    }
    return { ok: true, skipped: false };
  }

  function readByWidgetRecord(_KDB, _widgetId) {
    var api = _KDB && _KDB.api && _KDB.api.widgetSettings;
    var state;
    if (!api || typeof api.getState !== "function") { return null; }
    state = api.getState();
    return state && state.byWidget ? state.byWidget[_widgetId] : null;
  }

  function stampIteratorZoomHosts(_cloned, _record, _type) {
    var maps = [ITERATOR_HOST_BY_TYPE, ZOOM_HOST_BY_TYPE, VALUE_CAPTION_HOST_BY_TYPE];
    var controls = ["iterator", "zoom", "valueCaption"];
    var values = [_record && _record.iterator, _record && _record.zoom, _record && _record.valueCaption];
    var index;
    var hostKey;
    for (index = 0; index < maps.length; index += 1) {
      hostKey = maps[index][_type];
      if (hostKey) {
        _cloned[hostKey] = effectiveHostBoolean(controls[index], _type, values[index]);
      }
    }
  }

  function overlayIteratorZoomOnLayoutMap(_KDB, _widgetId, _layoutMap, _normalizedType) {
    try {
      var cloned = Object.assign({}, _layoutMap || {});
      var type = _normalizeVisualizationType(_normalizedType) || _normalizedType;
      if (isListOrTopN(type)) { return cloned; }
      stampIteratorZoomHosts(cloned, readByWidgetRecord(_KDB, _widgetId), type);
      return cloned;
    } catch (err) {
      console.error("[widgetVis.overlayIteratorZoomOnLayoutMap]", err);
      throw err;
    }
  }

  async function applyIteratorZoom(_KDB, _widgetId, _nextValue, _normalizedVisType, _control) {
    try {
      var normalizedType = _normalizeVisualizationType(_normalizedVisType) || _normalizedVisType;
      var writeValue = effectiveHostBoolean(_control, normalizedType, _nextValue);
      var writes;
      var facet;
      if (isListOrTopN(normalizedType) && writeValue === true) {
        return { ok: true, skipped: true, reason: "list" };
      }
      writes = buildHostWrites(_control, normalizedType, writeValue);
      if (!writes.length) {
        return writeValue === true ? { ok: true, skipped: true } : { ok: true, skipped: false };
      }
      facet = _readVisualizationFacet(_KDB);
      if (!facet || typeof facet.setContentProperty !== "function") {
        return { ok: false, errorCode: "WIDGET_VIS_FACET_MISSING" };
      }
      return await writeHostProperties(facet, _widgetId, writes);
    } catch (err) {
      console.error("[widgetVis.applyIteratorZoom]", err);
      return { ok: false, errorCode: "WIDGET_VIS_FACET_MISSING" };
    }
  }

  return {
    applyIteratorZoom: applyIteratorZoom,
    overlayIteratorZoomOnLayoutMap: overlayIteratorZoomOnLayoutMap
  };
});

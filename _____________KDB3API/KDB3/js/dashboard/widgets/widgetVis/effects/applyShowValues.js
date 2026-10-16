define([
  "../runtime.js",
  "../visTypes.js"
], function (_visRuntime, _visTypes) {
  "use strict";

  var VALUE_LABELS_VISIBLE = "valueLabels.visible";
  var LABELS_VISIBLE = "labels.visible";
  var CONTRAST_LABEL_COLOR = "contrast.label.color";
  var VALUE_LABELS_COLOR = "valueLabels.color";

  function isListType(_normalizedType) {
    return _visTypes.normalizeVisualizationType(_normalizedType) === "List";
  }

  function stampContrastFlagsIfShown(_cloned) {
    if (_cloned[VALUE_LABELS_VISIBLE] === true || _cloned[LABELS_VISIBLE] === true) {
      _cloned[CONTRAST_LABEL_COLOR] = true;
      _cloned[VALUE_LABELS_COLOR] = true;
    }
  }

  function overlayShowValuesOnLayoutMap(_layoutMap, _settings, _normalizedType) {
    try {
      var cloned = Object.assign({}, _layoutMap || {});
      var settings = _settings || {};
      if (isListType(_normalizedType)) {
        delete cloned[VALUE_LABELS_VISIBLE];
        delete cloned[LABELS_VISIBLE];
        delete cloned[CONTRAST_LABEL_COLOR];
        delete cloned[VALUE_LABELS_COLOR];
        return cloned;
      }
      if (typeof settings.showValues === "boolean") {
        cloned[VALUE_LABELS_VISIBLE] = settings.showValues;
        cloned[LABELS_VISIBLE] = settings.showValues;
      }
      stampContrastFlagsIfShown(cloned);
      return cloned;
    } catch (err) {
      console.error("[widgetVis.overlayShowValuesOnLayoutMap]", err);
      throw err;
    }
  }

  function failedWriteResult(_outcome) {
    if (_outcome && _outcome.errorCode) {
      return { ok: false, errorCode: _outcome.errorCode };
    }
    return { ok: false };
  }

  async function writeShownContrastFlags(_facet, _widgetId) {
    try {
      var firstOutcome;
      var secondOutcome;
      firstOutcome = await Promise.resolve(
        _facet.setContentProperty(_widgetId, CONTRAST_LABEL_COLOR, true)
      );
      if (!firstOutcome || firstOutcome.ok !== true) {
        return failedWriteResult(firstOutcome);
      }
      secondOutcome = await Promise.resolve(
        _facet.setContentProperty(_widgetId, VALUE_LABELS_COLOR, true)
      );
      if (!secondOutcome || secondOutcome.ok !== true) {
        return failedWriteResult(secondOutcome);
      }
      return { ok: true };
    } catch (err) {
      console.error("[widgetVis.writeShownContrastFlags]", err);
      throw err;
    }
  }

  async function applyShowValues(_KDB, _widgetId, _nextValue, _normalizedVisType) {
    try {
      var normalizedType = _visTypes.normalizeVisualizationType(_normalizedVisType) || _normalizedVisType;
      var facet;
      var firstOutcome;
      var secondOutcome;
      var contrastOutcome;
      var writeValue;
      var catalog;
      if (isListType(normalizedType)) {
        return { ok: true, skipped: true, reason: "list" };
      }
      writeValue = _nextValue;
      if (_nextValue === "inherit") {
        catalog = _visTypes.resolveVisualizationLayoutPropertyValues(
          normalizedType,
          _KDB
        );
        writeValue = !!(catalog && catalog[VALUE_LABELS_VISIBLE] === true);
      }
      facet = _visRuntime.readHostFacet(_KDB, "visualizationFacet");
      if (!facet || typeof facet.setContentProperty !== "function") {
        return { ok: false, errorCode: "WIDGET_VIS_FACET_MISSING" };
      }
      firstOutcome = await Promise.resolve(
        facet.setContentProperty(_widgetId, VALUE_LABELS_VISIBLE, writeValue)
      );
      if (!firstOutcome || firstOutcome.ok !== true) {
        return failedWriteResult(firstOutcome);
      }
      secondOutcome = await Promise.resolve(
        facet.setContentProperty(_widgetId, LABELS_VISIBLE, writeValue)
      );
      if (!secondOutcome || secondOutcome.ok !== true) {
        return failedWriteResult(secondOutcome);
      }
      if (writeValue === true) {
        contrastOutcome = await writeShownContrastFlags(facet, _widgetId);
        if (!contrastOutcome || contrastOutcome.ok !== true) {
          return contrastOutcome;
        }
      }
      return { ok: true, skipped: false };
    } catch (err) {
      console.error("[widgetVis.applyShowValues]", err);
      return { ok: false, errorCode: "WIDGET_VIS_FACET_MISSING" };
    }
  }

  return {
    overlayShowValuesOnLayoutMap: overlayShowValuesOnLayoutMap,
    applyShowValues: applyShowValues
  };
});

define([
  "../filters/matchFilterPropEntry.js",
  "../sourceTokens/rewriteUniqueNameSourceToken.js",
  "./sanitizeWidgetDownstreamDisplayValues.js",
], function (_matchFilterPropEntry, _rewriteUniqueNameSourceToken, _sanitizeWidgetDownstreamDisplayValues) {
  "use strict";

  function collectHierarchyValues(_resolution) {
    var values = [];
    if (_resolution && Array.isArray(_resolution.downstreamValues)) {
      values = values.concat(_resolution.downstreamValues);
    }
    if (values.length === 0 && _resolution && Array.isArray(_resolution.dominantValues)) {
      values = values.concat(_resolution.dominantValues);
    }
    return values;
  }

  function collectTopNHelperHierarchyValues(_resolution) {
    var useValues = collectHierarchyValues(_resolution);
    var displayValues = _resolution && Array.isArray(_resolution.displayValues) ? _resolution.displayValues : [];
    var values = [];
    for (var index = 0; index < useValues.length; index += 1) {
      var useValue = useValues[index];
      var displayValue = helperHierarchyCaption(_resolution && _resolution.hostDisplayValues, index, displayValues[index] || useValue);
      if (useValue != null && String(useValue) !== "") {
        values.push({ d: String(displayValue), u: String(useValue) });
      }
    }
    return values;
  }

  function helperHierarchyCaption(_hostDisplayValues, _index, _fallback) {
    var hostDisplay = Array.isArray(_hostDisplayValues) ? _hostDisplayValues[_index] : null;
    if (typeof hostDisplay === "string" && hostDisplay !== "") {
      return hostDisplay;
    }
    return _fallback;
  }

  function hierarchyFilterOptions(_spec, _matched) {
    return {
      overrideHierarchyDefaultSelection: true,
      action: "keepexclude",
      sourceKey: _matched.sourceKey,
      skipDisplayType: _spec.targetKind === "topNHelper"
    };
  }

  function resolveTargetSourceToken(_dataConfig) {
    return _dataConfig.datasourceName || _dataConfig.datasourceId || _dataConfig.kennzahlenTable || "";
  }

  function __controller(_spec) {
    var snapshot = _spec.hierarchySnapshot;
    if (!snapshot) {
      return { ok: true, descriptor: null };
    }
    if (!snapshot.resolution || snapshot.resolution.hasConfirmedSelection !== true) {
      return {
        ok: true,
        descriptor: null,
        warning: {
          code: "WIDGET_BINDING_PLAN_HIERARCHY_NOT_CONFIRMED",
          message: "Hierarchy snapshot exists but has no confirmed selection, so no hierarchy filter is planned.",
        },
      };
    }

    var rawValues = collectHierarchyValues(snapshot.resolution);
    if (!rawValues.length) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_HIERARCHY_VALUES",
      };
    }

    var dataConfig = _spec.dataConfig || {};
    var filterPropObj = _spec.config && _spec.config.filterPropObj;
    var matched = _matchFilterPropEntry(filterPropObj, snapshot.activeDownstreamName, dataConfig);
    if (!matched || !matched.entry) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_HIERARCHY_SOURCE",
      };
    }
    if (!matched.entry.itemId) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_HIERARCHY_ITEM",
      };
    }

    var targetToken = resolveTargetSourceToken(dataConfig);
    var itemId = _rewriteUniqueNameSourceToken(String(matched.entry.itemId), matched.sourceKey, targetToken);
    var values = _spec.targetKind === "topNHelper"
      ? collectTopNHelperHierarchyValues(snapshot.resolution)
      : _sanitizeWidgetDownstreamDisplayValues(rawValues);
    if (!values.length) {
      return {
        ok: false,
        errorCode: "WIDGET_BINDING_PLAN_HIERARCHY_VALUES",
      };
    }

    return {
      ok: true,
      descriptor: {
        kind: "hierarchy",
        mode: "hierarchyKeepexclude",
        itemId: itemId,
        values: values,
        options: hierarchyFilterOptions(_spec, matched),
      },
    };
  }

  return __controller;
});

define(["./normalizeTableCell.js", "./effectResultHelpers.js"], function (_normalizeTableCell, _helpers) {
  "use strict";

  function __controller(_readResult, _dataConfig, _topNChoice, _topNOptions) {
    try {
      var excludeItemId = readExcludeItemId(_dataConfig);
      if (!excludeItemId) {
        return failure("WIDGET_TOPN_EXCLUDE_ITEM_MISSING", "Selected dimension has no TopN exclude item id.");
      }
      var count = resolveTopNCount(_topNChoice, _topNOptions);
      var colKeys = resolveColumnKeys(_readResult);
      if (hasStaleHelperLabels(colKeys)) {
        return failure("WIDGET_TOPN_RESULT_STALE_HELPER", "Helper read returned stale placeholder labels.");
      }
      var columnKey = resolveValueColumn(_readResult);
      var values = extractValues(_readResult, columnKey, count);
      try {
        var probeRows = _readResult && _readResult.rows ? _readResult.rows : [];
        console.info("[sicht-jahr] TEMP helperRows", {
          dimension: _dataConfig && _dataConfig.dimension,
          topNChoice: _topNChoice,
          rowCount: probeRows.length,
          colKeys: colKeys,
          chosenColumn: columnKey,
          extractedCount: values.length,
          firstRow: probeRows.length ? probeRows[0] : null
        });
      } catch (probeErr) {
        console.info("[widgetTopN.extractTopNResult] TEMP probe failed", probeErr);
      }
      if (!values.length) {
        return failure("WIDGET_TOPN_RESULT_EMPTY", "Helper read returned no usable TopN values.");
      }
      return { ok: true, resultValues: values, excludeItemId: excludeItemId };
    } catch (err) {
      console.error("[widgetTopN.extractTopNResult] failed", err);
      return failure("WIDGET_TOPN_RESULT_EMPTY", _helpers.messageFromError(err));
    }
  }

  function readExcludeItemId(dataConfig) {
    var dimension = dataConfig && dataConfig.dimension;
    var dimensions = dataConfig && dataConfig.dataTableConfig ? dataConfig.dataTableConfig.dimensions || {} : {};
    var dimensionConfig = dimension ? dimensions[dimension] : null;
    return dimensionConfig && dimensionConfig.exclude ? dimensionConfig.exclude.itemId || null : null;
  }

  function resolveValueColumn(readResult) {
    var colKeys = resolveColumnKeys(readResult);
    return colKeys && colKeys.length ? colKeys[0] : null;
  }

  function resolveColumnKeys(readResult) {
    var raw = readResult && readResult.raw ? readResult.raw : {};
    return raw.colKeys || readDiagnosticsColKeys(readResult);
  }

  function readDiagnosticsColKeys(readResult) {
    var diagnostics = readResult && readResult.diagnostics ? readResult.diagnostics : {};
    return diagnostics.colKeys || [];
  }

  function hasStaleHelperLabels(colKeys) {
    var index = 0;
    while (colKeys && index < colKeys.length) {
      var label = String(colKeys[index] == null ? "" : colKeys[index]).trim().toLowerCase();
      if (label === "superuser" || label === "dbversion") {
        return true;
      }
      index += 1;
    }
    return false;
  }

  function extractValues(readResult, columnKey, count) {
    var rows = readResult && readResult.rows ? readResult.rows : [];
    var values = [];
    var index = 0;
    while (index < rows.length && values.length < count) {
      appendValue(values, readRowValue(rows[index], columnKey));
      index += 1;
    }
    return values;
  }

  function appendValue(values, value) {
    var normalized = _normalizeTableCell.normalizeCellToDU(value);
    if (normalized) {
      values.push(normalized);
    }
  }

  function readRowValue(row, columnKey) {
    if (!row) {
      return null;
    }
    if (columnKey && row[columnKey] !== undefined) {
      return row[columnKey];
    }
    if (Object.prototype.toString.call(row) === "[object Array]") {
      return row[0];
    }
    return readFirstOwnValue(row);
  }

  function readFirstOwnValue(row) {
    var keys = Object.keys(row);
    if (!keys.length) {
      return null;
    }
    return row[keys[0]];
  }

  function resolveTopNCount(topNChoice, topNOptions) {
    var direct = parsePositiveInteger(topNChoice);
    if (direct) {
      return direct;
    }
    var optionValue = readOptionValue(topNChoice, topNOptions || {});
    return parsePositiveInteger(optionValue) || 1;
  }

  function readOptionValue(topNChoice, topNOptions) {
    var key = topNChoice === null || topNChoice === undefined ? "" : String(topNChoice);
    var option = topNOptions[key] || topNOptions[key.toLowerCase()];
    if (option && typeof option === "object") {
      return option.value || option.n || option.count || option.limit || option.topN;
    }
    return option;
  }

  function parsePositiveInteger(value) {
    var match = String(value == null ? "" : value).match(/\d+/);
    var parsed = match ? parseInt(match[0], 10) : 0;
    return parsed > 0 ? parsed : 0;
  }

  function failure(errorCode, errorMessage) {
    return { ok: false, errorCode: errorCode, errorMessage: errorMessage };
  }

  return __controller;
});

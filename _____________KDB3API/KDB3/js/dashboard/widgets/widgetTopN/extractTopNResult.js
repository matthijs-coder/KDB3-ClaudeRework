define(["./results.js"], function (_results) {
  "use strict";

  // Parses rows read from Cognos; malformed host data becomes a coded result
  // instead of a throw, so the owner still receives a terminal TopN error.
  function extractTopNResult(_readResult, _dataConfig, _topNChoice, _topNOptions) {
    try {
      var excludeItemId = readExcludeItemId(_dataConfig);
      if (!excludeItemId) {
        return extractFailure("WIDGET_TOPN_EXCLUDE_ITEM_MISSING", "Selected dimension has no TopN exclude item id.");
      }
      var count = resolveTopNCount(_topNChoice, _topNOptions);
      var colKeys = resolveColumnKeys(_readResult);
      if (hasStaleHelperLabels(colKeys)) {
        return extractFailure("WIDGET_TOPN_RESULT_STALE_HELPER", "Helper read returned stale placeholder labels.");
      }
      var values = extractValues(_readResult, colKeys.length ? colKeys[0] : null, count);
      if (!values.length) {
        return extractFailure("WIDGET_TOPN_RESULT_EMPTY", "Helper read returned no usable TopN values.");
      }
      return { ok: true, resultValues: values, excludeItemId: excludeItemId };
    } catch (err) {
      console.error("[widgetTopN.extractTopNResult] failed", err);
      return extractFailure("WIDGET_TOPN_RESULT_EMPTY", _results.messageFromError(err));
    }
  }

  function readExcludeItemId(dataConfig) {
    var dimension = dataConfig && dataConfig.dimension;
    var dimensions = dataConfig && dataConfig.dataTableConfig ? dataConfig.dataTableConfig.dimensions || {} : {};
    var dimensionConfig = dimension ? dimensions[dimension] : null;
    return dimensionConfig && dimensionConfig.exclude ? dimensionConfig.exclude.itemId || null : null;
  }

  function resolveColumnKeys(readResult) {
    var raw = readResult && readResult.raw ? readResult.raw : {};
    var diagnostics = readResult && readResult.diagnostics ? readResult.diagnostics : {};
    return raw.colKeys || diagnostics.colKeys || [];
  }

  function hasStaleHelperLabels(colKeys) {
    return colKeys.some(function (key) {
      var label = String(key == null ? "" : key).trim().toLowerCase();
      return label === "superuser" || label === "dbversion";
    });
  }

  function extractValues(readResult, columnKey, count) {
    var rows = readResult && readResult.rows ? readResult.rows : [];
    var values = [];
    for (var index = 0; index < rows.length && values.length < count; index += 1) {
      var normalized = normalizeCellToDU(readRowValue(rows[index], columnKey));
      if (normalized) {
        values.push(normalized);
      }
    }
    return values;
  }

  function readRowValue(row, columnKey) {
    if (!row) {
      return null;
    }
    if (columnKey && row[columnKey] !== undefined) {
      return row[columnKey];
    }
    if (Array.isArray(row)) {
      return row[0];
    }
    var keys = Object.keys(row);
    return keys.length ? row[keys[0]] : null;
  }

  function normalizeCellToDU(cell) {
    if (cell === null || cell === undefined) {
      return null;
    }
    if (typeof cell !== "object" || Array.isArray(cell)) {
      return String(cell).trim() === "" ? null : { d: cell, u: cell };
    }
    var display = firstDefined([cell.d, cell.display, cell.displayValue, cell.label, cell.caption]);
    var use = firstDefined([cell.u, cell.use, cell.useValue, cell.value, cell.v]);
    if (display == null && use == null) {
      return null;
    }
    if (display == null) {
      display = use;
    }
    if (use == null) {
      use = display;
    }
    if (!String(display).trim() && !String(use).trim()) {
      return null;
    }
    return { d: display, u: use };
  }

  function firstDefined(values) {
    for (var index = 0; index < values.length; index += 1) {
      if (values[index] !== undefined && values[index] !== null) {
        return values[index];
      }
    }
    return null;
  }

  function resolveTopNCount(topNChoice, topNOptions) {
    return parsePositiveInteger(topNChoice) || parsePositiveInteger(readOptionValue(topNChoice, topNOptions || {})) || 1;
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

  function extractFailure(errorCode, errorMessage) {
    return { ok: false, errorCode: errorCode, errorMessage: errorMessage };
  }

  return extractTopNResult;
});

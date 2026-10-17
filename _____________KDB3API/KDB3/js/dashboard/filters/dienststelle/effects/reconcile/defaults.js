define([
  "../../config.js",
  "../../view/filterDom.js",
  "../hostScope/filterRef.js"
], function (_config, _filterDom, _filterRef) {
  "use strict";

  function normalizeCell(_cell) {
    var display;
    var useValue;
    if (!_cell || typeof _cell !== "object" || Array.isArray(_cell)) {
      return null;
    }
    display =
      _cell.display != null
        ? String(_cell.display).trim()
        : _cell.d != null
          ? String(_cell.d).trim()
          : "";
    useValue =
      _cell.use != null ? String(_cell.use).trim() : _cell.u != null ? String(_cell.u).trim() : "";
    if (!display || !useValue) {
      return null;
    }
    return { displayValue: display, useValue: useValue, source: "default" };
  }

  function readDefaultValue(_KDB, _defaultTableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    var row;
    var keys;
    var idx;
    var cell;
    if (!tableData || !_defaultTableKey) {
      return null;
    }
    tableInput = _config.buildTableInput(_KDB, _defaultTableKey);
    if (!tableInput) {
      return null;
    }
    rows = tableData.readRows(tableInput);
    if (!Array.isArray(rows) || !rows.length) {
      return null;
    }
    row = rows[0];
    keys = row && typeof row === "object" ? Object.keys(row) : [];
    for (idx = 0; idx < keys.length; idx += 1) {
      cell = normalizeCell(row[keys[idx]]);
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  function cognosDisplay(_defaultValue) {
    var hostDisplay = _defaultValue && _defaultValue.hostDisplay != null
      ? String(_defaultValue.hostDisplay)
      : "";
    if (hostDisplay !== "") {
      return hostDisplay;
    }
    return _defaultValue.displayValue;
  }

  function toCognosValues(_defaultValue) {
    return [{ d: cognosDisplay(_defaultValue), u: _defaultValue.useValue }];
  }

  function resolveDefaultOutcome(_defaultValue, _outcome) {
    if (_outcome && _outcome.ok === true) {
      return _defaultValue;
    }
    console.warn(
      "[dienststelle.applyDefault] host write not applied",
      _outcome ? _outcome.outcome : null,
      _outcome ? (_outcome.errorCode || _outcome.reason) : null
    );
    return null;
  }

  function applyDefault(_KDB, _context) {
    var context = _context || {};
    var defaultValue = readDefaultValue(_KDB, context.defaultTableKey);
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var ref = context.filterRef || null;

    if (!defaultValue) {
      console.warn("[dienststelle.applyDefault] abort: no defaultValue", context.defaultTableKey);
      return Promise.resolve(null);
    }
    if (!ref || !filtersFacet) {
      console.warn("[dienststelle.applyDefault] abort: missing filterRef or filters facet");
      return Promise.resolve(null);
    }
    return filtersFacet
      .writeFilter({ ref: ref, values: toCognosValues(defaultValue) })
      .then(resolveDefaultOutcome.bind(null, defaultValue));
  }

  function readTemplate(_KDB) {
    var labels =
      _KDB.config &&
      _KDB.config.labels &&
      _KDB.config.labels.de &&
      _KDB.config.labels.de.dienststelle;
    var value = labels && labels.emptyOkDefaultRequired;
    if (typeof value !== "string") {
      return "";
    }
    return value;
  }

  function interpolateFilterName(_template, _filterName) {
    return _template.split("{filterName}").join(String(_filterName));
  }

  function readConnectedWrapper(_activeFilterKey, _filterScope) {
    var wrapper = _filterDom.findScopedFilterWrapper(_activeFilterKey, _filterScope);
    if (wrapper && wrapper.isConnected === true) {
      return wrapper;
    }
    return null;
  }

  function notifyMessage(_KDB, _message, _wrapper) {
    var svc = _KDB.services && _KDB.services.message;
    if (!svc) {
      console.warn("[dienststelle.notifyEmptyOk] messageService missing");
      return;
    }
    if (_wrapper) {
      svc.notifyAnchored({
        anchor: _wrapper,
        code: "DIENSTSTELLE_EMPTY_OK_DEFAULT",
        message: _message,
        severity: "info",
        durationMs: 15000
      });
      return;
    }
    svc.notify({
      code: "DIENSTSTELLE_EMPTY_OK_DEFAULT",
      message: _message,
      severity: "info"
    });
  }

  function notifyEmptyOk(_KDB, _options) {
    try {
      var options = _options || {};
      var appliedCount = options.appliedCount;
      var template;
      var visibleFilterLabel;
      var filterName;
      if (typeof appliedCount !== "number" || appliedCount < 1) {
        return;
      }
      if (options.commitFromUser !== true) {
        return;
      }
      if (options.isHistoryReplay === true) {
        return;
      }
      template = readTemplate(_KDB);
      if (!template) {
        console.warn("[dienststelle.notifyEmptyOk] missing label");
        return;
      }
      visibleFilterLabel = typeof options.visibleFilterLabel === "string" ? options.visibleFilterLabel.trim() : "";
      filterName = visibleFilterLabel || "Dienststelle";
      notifyMessage(
        _KDB,
        interpolateFilterName(template, filterName),
        readConnectedWrapper(options.activeFilterKey, options.filterScope)
      );
    } catch (err) {
      console.error("[dienststelle.notifyEmptyOk]", err);
      return;
    }
  }

  return {
    readDefaultValue: readDefaultValue,
    applyDefault: applyDefault,
    notifyEmptyOk: notifyEmptyOk
  };
});

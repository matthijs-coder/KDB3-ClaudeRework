define([
  "../../../../../core/properties/selectors.js",
  "../../config.js",
  "../../view/filterDom.js",
  "../hostScope/apply.js",
  "../hostScope/filterRef.js"
], function (_selectors, _config, _filterDom, _apply, _filterRef) {
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

  // Shaped table rows, or null while the table is not ready / unreadable.
  function readTableRows(_KDB, _tableKey) {
    var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
    var tableInput;
    var rows;
    if (!tableData || !_tableKey) {
      return null;
    }
    tableInput = _config.buildTableInput(_KDB, _tableKey);
    if (!tableInput) {
      return null;
    }
    rows = tableData.readRows(tableInput);
    return Array.isArray(rows) ? rows : null;
  }

  function readDefaultValue(_KDB, _defaultTableKey) {
    var rows = readTableRows(_KDB, _defaultTableKey);
    var keys;
    var idx;
    var cell;
    if (!rows || !rows.length) {
      return null;
    }
    keys = rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0]) : [];
    for (idx = 0; idx < keys.length; idx += 1) {
      cell = normalizeCell(rows[0][keys[idx]]);
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  // Distinct usable cells of one column, first-seen order.
  function collectColumnCells(_rows, _key) {
    var seen = Object.create(null);
    var cells = [];
    var idx;
    var cell;
    for (idx = 0; idx < _rows.length; idx += 1) {
      cell = _rows[idx] ? normalizeCell(_rows[idx][_key]) : null;
      if (cell && seen[cell.useValue] !== true) {
        seen[cell.useValue] = true;
        cells.push(cell);
      }
    }
    return cells;
  }

  // Member cells (1..maxMembers distinct usable values of the configured column), or null: table not ready or empty
  // (silent; applyDefault aborts on its own) or count out of range (warns on every default write, i.e. once per scope;
  // the single default stays).
  function readMemberDefaults(_KDB, _definition) {
    var config = _definition.memberDefault;
    var rows = readTableRows(_KDB, _definition.defaultTableKey);
    var key;
    var members;
    if (!rows || !rows.length) {
      return null;
    }
    key = rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0])[config.columnIndex] : undefined;
    members = key === undefined ? [] : collectColumnCells(rows, key);
    if (members.length >= 1 && members.length <= config.maxMembers) {
      return members;
    }
    console.warn(
      "[dienststelle.readMemberDefaults] column " + (config.columnIndex + 1) + " has " + members.length +
        " usable value(s) (allowed 1.." + config.maxMembers + "): falling back to the single default",
      _definition.defaultTableKey
    );
    return null;
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

  // Resolves to the applied selection: one cell object (single default) or an array of cells (member default).
  function applyDefault(_KDB, _context) {
    var context = _context || {};
    var definition = context.definition || {};
    var selection =
      (definition.memberDefault && _selectors.isMultiStelleDefaultEnabled(_KDB) && readMemberDefaults(_KDB, definition)) ||
      readDefaultValue(_KDB, definition.defaultTableKey);
    var filtersFacet = _filterRef.readFiltersFacet(_KDB);
    var ref = context.filterRef || null;

    if (!selection) {
      console.warn("[dienststelle.applyDefault] abort: no defaultValue", definition.defaultTableKey);
      return Promise.resolve(null);
    }
    if (!ref || !filtersFacet) {
      console.warn("[dienststelle.applyDefault] abort: missing filterRef or filters facet");
      return Promise.resolve(null);
    }
    return filtersFacet
      .writeFilter({ ref: ref, values: _apply.toCognosValues([].concat(selection)) })
      .then(resolveDefaultOutcome.bind(null, selection));
  }

  function readTemplate(_KDB, _hasAppliedMembers) {
    var labels =
      _KDB.config &&
      _KDB.config.labels &&
      _KDB.config.labels.de &&
      _KDB.config.labels.de.dienststelle;
    var value = labels && labels[_hasAppliedMembers ? "emptyOkDefaultRequiredMembers" : "emptyOkDefaultRequired"];
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
      template = readTemplate(_KDB, options.hasAppliedMembers === true);
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

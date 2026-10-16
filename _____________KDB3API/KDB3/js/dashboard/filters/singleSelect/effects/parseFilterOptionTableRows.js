define([], function () {
  "use strict";

  function normalizeText(_value) {
    return String(_value == null ? "" : _value).trim().toLowerCase();
  }

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
    return { display: display, use: useValue };
  }

  function readCellFromRow(_row, _filterLabel) {
    var keys;
    var idx;
    var cell;
    if (!_row || typeof _row !== "object") {
      return null;
    }
    keys = Object.keys(_row);
    for (idx = 0; idx < keys.length; idx += 1) {
      if (normalizeText(keys[idx]) === normalizeText(_filterLabel)) {
        return normalizeCell(_row[keys[idx]]);
      }
    }
    for (idx = 0; idx < keys.length; idx += 1) {
      cell = normalizeCell(_row[keys[idx]]);
      if (cell) {
        return cell;
      }
    }
    return null;
  }

  function findMatchingRowValue(_rows, _pendingLabel, _filterLabel) {
    var wanted = normalizeText(_pendingLabel);
    var idx;
    var cell;
    if (!Array.isArray(_rows) || !_rows.length) {
      return null;
    }
    for (idx = 0; idx < _rows.length; idx += 1) {
      cell = readCellFromRow(_rows[idx], _filterLabel);
      if (cell && normalizeText(cell.display) === wanted) {
        return { d: cell.display, u: cell.use };
      }
    }
    return null;
  }

  function findMatchingUseValue(_rows, _useValue, _filterLabel) {
    var wanted = String(_useValue == null ? "" : _useValue).trim();
    var matches = [];
    var idx;
    var cell;
    if (!wanted || !Array.isArray(_rows)) { return null; }
    for (idx = 0; idx < _rows.length; idx += 1) {
      cell = readCellFromRow(_rows[idx], _filterLabel);
      if (cell && cell.use === wanted) {
        matches.push({ d: cell.display, u: cell.use });
      }
    }
    return matches.length === 1 ? matches[0] : null;
  }

  return {
    findMatchingRowValue: findMatchingRowValue,
    findMatchingUseValue: findMatchingUseValue
  };
});

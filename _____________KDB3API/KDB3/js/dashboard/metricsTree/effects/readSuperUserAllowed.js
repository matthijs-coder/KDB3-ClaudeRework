define([
  "../../../core/utils/isRightAllowed.js",
  "../../../core/utils/readFirstRowScalar.js"
], function (_isRightAllowed, _readFirstRowScalar) {
  "use strict";

  function resolveAllowedFromRows(_rows) {
    if (!Array.isArray(_rows) || !_rows.length) {
      return false;
    }
    return _isRightAllowed(_readFirstRowScalar(_rows)) === true;
  }

  function resolveAllowedAfterWait(_KDB, _input, _waitedRows) {
    var tableData;
    var rows;
    try {
      tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
      rows = tableData && typeof tableData.readRows === "function"
        ? tableData.readRows(_input)
        : null;
      if (!Array.isArray(rows)) {
        rows = _waitedRows;
      }
      return resolveAllowedFromRows(rows);
    } catch (err) {
      console.error("[metricsTree.readSuperUserAllowed]", err);
      return false;
    }
  }

  function resolveAllowedAfterFailure(_err) {
    if (!(_err && _err.name === "AbortError")) {
      console.error("[metricsTree.readSuperUserAllowed]", _err);
    }
    return false;
  }

  function readSuperUserAllowed(_KDB) {
    try {
      var tableData = _KDB && _KDB.services ? _KDB.services.tableData : null;
      var input;
      if (!tableData || typeof tableData.waitForRows !== "function") {
        return Promise.resolve(false);
      }
      input = [{ tableName: "superuser", isCoreTable: true }];
      return tableData
        .waitForRows(input)
        .then(resolveAllowedAfterWait.bind(null, _KDB, input))
        .catch(resolveAllowedAfterFailure);
    } catch (err) {
      console.error("[metricsTree.readSuperUserAllowed]", err);
      return Promise.resolve(false);
    }
  }

  return readSuperUserAllowed;
});
